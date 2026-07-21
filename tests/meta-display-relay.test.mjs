import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createMetaDisplayRelay,
  getMetaDisplayRelayConfig,
  publishLenslineState,
} from "../scripts/meta-display-relay.mjs";
import { resolveMetaDisplayOrigin } from "../api/index.js";

const relayConfig = {
  endpoint: new URL("https://display.test/api/display-ingest"),
  token: "server-side-secret",
};

function captionState(sequence) {
  return {
    sequence,
    completed: [`Caption ${sequence}`],
    partial: "",
    sourceLabel: "Japanese",
    live: true,
    processing: false,
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((next) => { resolve = next; });
  return { promise, resolve };
}

test("hosted Meta Display configuration uses only a valid origin and server-side token", () => {
  const config = getMetaDisplayRelayConfig({
    META_DISPLAY_ORIGIN: "https://lens-translator.vercel.app/display?ignored=true",
    LENSLINE_RELAY_TOKEN: " relay-secret ",
  });
  assert.equal(
    config.endpoint.toString(),
    "https://lens-translator.vercel.app/api/display-ingest"
  );
  assert.equal(config.token, "relay-secret");
  assert.equal(resolveMetaDisplayOrigin("https://display.test/path"), "https://display.test");
  assert.equal(resolveMetaDisplayOrigin("javascript:alert(1)"), "");
  assert.equal(getMetaDisplayRelayConfig({ META_DISPLAY_ORIGIN: "not a url", META_DISPLAY_RELAY_TOKEN: "x" }), null);
  assert.equal(getMetaDisplayRelayConfig({ META_DISPLAY_ORIGIN: "https://display.test" }), null);
});

test("local publisher forwards caption state to the hosted Lensline ingest endpoint", async () => {
  const state = {
    sequence: 1784635587000,
    completed: ["Good morning"],
    partial: "Welcome",
    sourceLabel: "Japanese",
    live: true,
    processing: false,
  };
  let upstream;
  const response = await publishLenslineState(
    state,
    {
      endpoint: new URL("https://display.test/api/display-ingest"),
      token: "server-side-secret",
    },
    async (url, init) => {
      upstream = { url: String(url), init };
      return Response.json({ ok: true, accepted: true });
    }
  );

  assert.equal(response.status, 200);
  assert.equal(upstream.url, "https://display.test/api/display-ingest");
  assert.equal(upstream.init.method, "POST");
  assert.equal(upstream.init.headers.authorization, "Bearer server-side-secret");
  assert.equal(upstream.init.signal.aborted, false);
  assert.deepEqual(JSON.parse(upstream.init.body), state);
});

test("local publisher exposes hosted relay failures without leaking the token", async () => {
  await assert.rejects(
    publishLenslineState(
      { sequence: 1, completed: [] },
      { endpoint: new URL("https://display.test/api/display-ingest"), token: "secret" },
      async () => Response.json({ error: "blocked" }, { status: 401 })
    ),
    /Hosted Meta Display returned 401/
  );
});

test("local publisher surfaces a stale hosted sequence instead of treating it as success", async () => {
  await assert.rejects(
    publishLenslineState(
      captionState(10),
      relayConfig,
      async () => Response.json({ ok: true, accepted: false })
    ),
    (error) => {
      assert.equal(error.status, 200);
      assert.equal(error.code, "stale_sequence");
      assert.equal(error.retryable, false);
      assert.doesNotMatch(error.message, /server-side-secret/);
      return true;
    }
  );
});

test("local publisher bounds a stalled hosted request with a useful timeout cause", async () => {
  const keepAlive = setTimeout(() => {}, 500);
  try {
    await assert.rejects(
      publishLenslineState(
        captionState(11),
        relayConfig,
        (_url, init) => new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true });
        }),
        { timeoutMs: 5 }
      ),
      (error) => {
        assert.equal(error.code, "TimeoutError");
        assert.equal(error.retryable, true);
        assert.doesNotMatch(error.message, /server-side-secret/);
        return true;
      }
    );
  } finally {
    clearTimeout(keepAlive);
  }
});

test("single-flight relay keeps only the latest state from a caption burst", async () => {
  const firstStarted = deferred();
  const releaseFirst = deferred();
  const calls = [];
  const relay = createMetaDisplayRelay(relayConfig, {
    fetchImpl: async (_url, init) => {
      calls.push(JSON.parse(init.body).sequence);
      if (calls.length === 1) {
        firstStarted.resolve();
        await releaseFirst.promise;
      }
      return Response.json({ ok: true, accepted: true });
    },
    log: () => {},
  });

  assert.equal(relay.enqueue(captionState(1)), undefined);
  await firstStarted.promise;
  relay.enqueue(captionState(2));
  relay.enqueue(captionState(3));
  relay.enqueue(captionState(4));
  assert.deepEqual(calls, [1]);

  releaseFirst.resolve();
  await relay.whenIdle();
  assert.deepEqual(calls, [1, 4]);
});

test("relay retries a transient network failure with bounded backoff and useful diagnostics", async () => {
  const delays = [];
  const logs = [];
  let attempts = 0;
  let clock = 1_000;
  const relay = createMetaDisplayRelay(relayConfig, {
    fetchImpl: async (_url, init) => {
      attempts += 1;
      assert.equal(init.signal.aborted, false);
      if (attempts === 1) {
        const cause = new Error("connect timeout");
        cause.code = "UND_ERR_CONNECT_TIMEOUT";
        throw new TypeError("fetch failed", { cause });
      }
      return Response.json({ ok: true, accepted: true });
    },
    retryDelaysMs: [25, 75],
    sleep: async (delay) => { delays.push(delay); },
    now: () => { clock += 20; return clock; },
    log: (line) => logs.push(line),
  });

  relay.enqueue(captionState(20));
  await relay.whenIdle();

  assert.equal(attempts, 2);
  assert.deepEqual(delays, [25]);
  assert.equal(logs.length, 1);
  assert.match(logs[0], /retrying_in_ms=25/);
  assert.match(logs[0], /sequence=20/);
  assert.match(logs[0], /attempt=1\/3/);
  assert.match(logs[0], /status=network/);
  assert.match(logs[0], /cause=UND_ERR_CONNECT_TIMEOUT/);
  assert.match(logs[0], /latency_ms=20/);
  assert.doesNotMatch(logs[0], /server-side-secret/);
});

test("a newer pending caption supersedes the failed snapshot without retrying stale work", async () => {
  const firstStarted = deferred();
  const failFirst = deferred();
  const calls = [];
  const delays = [];
  const logs = [];
  const relay = createMetaDisplayRelay(relayConfig, {
    fetchImpl: async (_url, init) => {
      const sequence = JSON.parse(init.body).sequence;
      calls.push(sequence);
      if (sequence === 30) {
        firstStarted.resolve();
        await failFirst.promise;
        return Response.json({ error: "busy" }, { status: 503 });
      }
      return Response.json({ ok: true, accepted: true });
    },
    retryDelaysMs: [25, 75],
    sleep: async (delay) => { delays.push(delay); },
    log: (line) => logs.push(line),
  });

  relay.enqueue(captionState(30));
  await firstStarted.promise;
  relay.enqueue(captionState(31));
  failFirst.resolve();
  await relay.whenIdle();

  assert.deepEqual(calls, [30, 31]);
  assert.deepEqual(delays, []);
  assert.equal(logs.length, 1);
  assert.match(logs[0], /relay superseded/);
  assert.match(logs[0], /sequence=30/);
  assert.match(logs[0], /status=503/);
});

test("relay exhausts a bounded retry budget and remains usable for the next caption", async () => {
  const calls = [];
  const delays = [];
  const logs = [];
  let shouldFail = true;
  const relay = createMetaDisplayRelay(relayConfig, {
    fetchImpl: async (_url, init) => {
      calls.push(JSON.parse(init.body).sequence);
      return shouldFail
        ? Response.json({ error: "busy" }, { status: 503 })
        : Response.json({ ok: true, accepted: true });
    },
    retryDelaysMs: [10, 20],
    sleep: async (delay) => { delays.push(delay); },
    log: (line) => logs.push(line),
  });

  relay.enqueue(captionState(40));
  await relay.whenIdle();
  assert.deepEqual(calls, [40, 40, 40]);
  assert.deepEqual(delays, [10, 20]);
  assert.match(logs.at(-1), /relay failed/);
  assert.match(logs.at(-1), /attempt=3\/3/);
  assert.match(logs.at(-1), /status=503/);

  shouldFail = false;
  relay.enqueue(captionState(41));
  await relay.whenIdle();
  assert.deepEqual(calls, [40, 40, 40, 41]);
});

test("local and browser publishers acknowledge locally and avoid an unbounded promise backlog", async () => {
  const [localServer, controller] = await Promise.all([
    readFile(new URL("../scripts/local-server.mjs", import.meta.url), "utf8"),
    readFile(new URL("../worker/page-controller.js", import.meta.url), "utf8"),
  ]);

  assert.match(localServer, /relayPublisher\.enqueue\(state\)/);
  assert.doesNotMatch(localServer, /await publishLenslineState/);
  assert.doesNotMatch(localServer, /status:\s*502/);
  assert.match(controller, /let pendingPublishBody = ''/);
  assert.match(controller, /if \(publishInFlight\) return publishChain/);
  assert.match(controller, /while \(pendingPublishBody\)/);
  assert.doesNotMatch(controller, /publishChain\s*=\s*publishChain\.then/);
  assert.match(controller, /setStatus\('Listening', true\);\s*renderOutput\(\);\s*await publishState\(\);/);
});
