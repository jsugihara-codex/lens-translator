import assert from "node:assert/strict";
import test from "node:test";
import { TARGET_LANGUAGES } from "../worker/languages.js";
import lensline from "../worker/index.js";

const env = {
  ACCESS_CODE: "TEST-LENSLINE-CODE",
  ACCESS_SESSION_SECRET: "test-secret-that-is-long-enough-for-hmac-signing",
  DISPLAY_ROOM_ID: "0123456789abcdef0123456789abcdef",
};

const room = "0123456789abcdef0123456789abcdef";

function request(path, init = {}) {
  return new Request(`https://lensline.test${path}`, init);
}

async function signIn(ip = "198.51.100.9") {
  const response = await lensline.fetch(request("/api/access", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ code: env.ACCESS_CODE }),
  }), env, {});
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie");
}

test("controller requires Lensline sign-in while display remains public", async () => {
  const controller = await lensline.fetch(request("/"), env, {});
  assert.match(await controller.text(), /Enter access code/);

  const display = await lensline.fetch(request(`/display?room=${room}`), env, {});
  assert.equal(display.status, 200);
  const displayHtml = await display.text();
  assert.match(displayHtml, /Lensline Display/);
  assert.match(displayHtml, /Web app connected/);
  assert.match(displayHtml, /setConnection\(Boolean\(current\.live\), false\)/);
});

test("successful sign-in creates a secure controller session", async () => {
  const cookie = await signIn();
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Max-Age=2592000/);
  assert.match(cookie, /Expires=/);

  const controller = await lensline.fetch(request("/", {
    headers: { cookie },
  }), env, {});
  const controllerHtml = await controller.text();
  assert.match(controllerHtml, /Spoken language/);
  assert.match(controllerHtml, /<label for="input-source">Input source<\/label>/);
  assert.match(controllerHtml, /<option value="microphone">Microphone<\/option>/);
  assert.match(controllerHtml, /<option value="browser_tab_and_microphone">Browser tab \+ microphone<\/option>/);
  assert.match(controllerHtml, /<button id="pause" class="pause-control"[^>]*aria-label="Pause translation"[^>]*>/);
  assert.match(controllerHtml, /<path class="pause-glyph"/);
  assert.match(controllerHtml, /<path class="resume-glyph"/);
  const stageStyles = controllerHtml.match(/\.stage \{([^}]+)\}/)?.[1] || "";
  assert.match(stageStyles, /flex-direction:\s*column/);
  assert.match(stageStyles, /height:\s*auto/);
  assert.doesNotMatch(stageStyles, /(?:^|[;\s])height:\s*430px/);
  const stageHeaderStyles = controllerHtml.match(/\.stage-top \{([^}]+)\}/)?.[1] || "";
  assert.match(stageHeaderStyles, /position:\s*relative/);
  assert.match(stageHeaderStyles, /flex:\s*0 0 auto/);
  const stageBodyStyles = controllerHtml.match(/\.stage-body \{([^}]+)\}/)?.[1] || "";
  assert.match(stageBodyStyles, /position:\s*absolute/);
  assert.match(stageBodyStyles, /inset:\s*var\(--stage-header-height\) 0 0/);
  assert.match(stageBodyStyles, /overflow:\s*hidden/);
  const captionStyles = controllerHtml.match(/\.captions \{([^}]+)\}/)?.[1] || "";
  assert.match(captionStyles, /flex:\s*1 1 auto/);
  assert.match(captionStyles, /min-height:\s*0/);
  assert.match(controllerHtml, /navigator\.mediaDevices\.getDisplayMedia/);
  assert.match(controllerHtml, /createMediaStreamDestination/);
  assert.match(controllerHtml, new RegExp(env.DISPLAY_ROOM_ID));
  assert.doesNotMatch(controllerHtml, /localStorage|getRandomValues/);
});

test("missing fixed room disables translation instead of generating a new Meta URL", async () => {
  const cookie = await signIn("198.51.100.13");
  const controller = await lensline.fetch(request("/", {
    headers: { cookie },
  }), { ...env, DISPLAY_ROOM_ID: "" }, {});
  const controllerHtml = await controller.text();
  assert.match(controllerHtml, /fixed Meta display room is not configured/);
  assert.doesNotMatch(controllerHtml, /getRandomValues|localStorage/);
});

test("protected routes reject unauthenticated writes", async () => {
  const session = await lensline.fetch(request("/api/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ targetLanguage: "en" }),
  }), env, {});
  assert.equal(session.status, 401);

  const publish = await lensline.fetch(request(`/api/captions/${room}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sequence: 1, completed: ["Blocked"] }),
  }), env, {});
  assert.equal(publish.status, 401);
});

test("signed-in controller receives only an ephemeral Realtime translation secret", async () => {
  const cookie = await signIn("198.51.100.11");
  const originalFetch = globalThis.fetch;
  let upstream;
  globalThis.fetch = async (url, init) => {
    upstream = { url: String(url), init };
    return Response.json({ value: "ephemeral-client-secret" });
  };

  try {
    const response = await lensline.fetch(request("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ sourceLanguage: "ja", targetLanguage: "en", room }),
    }), { ...env, OPENAI_API_KEY: "server-only-test-key" }, {});
    assert.equal(response.status, 200);
    assert.equal((await response.json()).value, "ephemeral-client-secret");
    assert.equal(upstream.url, "https://api.openai.com/v1/realtime/client_secrets");
    assert.equal(upstream.init.headers.authorization, "Bearer server-only-test-key");
    const body = JSON.parse(upstream.init.body);
    assert.equal(body.session.model, "gpt-realtime");
    assert.deepEqual(body.session.output_modalities, ["text"]);
    assert.match(body.session.instructions, /Only translate ja speech/);
    assert.equal(body.session.tool_choice.name, "submit_translation");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("signed-in controller can publish captions that the public display can read", async () => {
  const cookie = await signIn("198.51.100.10");
  const publish = await lensline.fetch(request(`/api/captions/${room}`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      sequence: 2,
      completed: ["Hello from Lensline"],
      partial: "Next sentence",
      sourceLabel: "Spanish",
      live: true,
      processing: true,
    }),
  }), env, {});
  assert.equal(publish.status, 200);

  const read = await lensline.fetch(request(`/api/captions/${room}?after=1`), env, {});
  assert.equal(read.status, 200);
  const state = await read.json();
  assert.deepEqual(state.completed, ["Hello from Lensline"]);
  assert.equal(state.partial, "Next sentence");
  assert.equal(state.processing, true);
});

test("a restarted translation session supersedes earlier sequence numbers", async () => {
  const restartRoom = "fedcba9876543210fedcba9876543210";
  const cookie = await signIn("198.51.100.12");

  const first = await lensline.fetch(request(`/api/captions/${restartRoom}`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ sequence: 500000, completed: ["Previous meeting"], live: false }),
  }), env, {});
  assert.equal(first.status, 200);

  const restartedSequence = 1782947000000;
  const restarted = await lensline.fetch(request(`/api/captions/${restartRoom}`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ sequence: restartedSequence, completed: [], live: true }),
  }), env, {});
  assert.equal(restarted.status, 200);

  const stale = await lensline.fetch(request(`/api/captions/${restartRoom}`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ sequence: 100, completed: ["Stale update"], live: false }),
  }), env, {});
  assert.equal((await stale.json()).sequence, restartedSequence);

  const read = await lensline.fetch(request(`/api/captions/${restartRoom}?after=500000`), env, {});
  assert.equal(read.status, 200);
  const state = await read.json();
  assert.equal(state.sequence, restartedSequence);
  assert.equal(state.live, true);
  assert.deepEqual(state.completed, []);
});

test("five incorrect codes trigger a temporary IP lockout", async () => {
  const ip = "203.0.113.77";
  let response;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    response = await lensline.fetch(request("/api/access", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ code: "WRONG" }),
    }), env, {});
  }
  assert.equal(response.status, 429);

  const blocked = await lensline.fetch(request("/api/access", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ code: env.ACCESS_CODE }),
  }), env, {});
  assert.equal(blocked.status, 429);
});

test("Vercel deployments fail closed when shared Redis storage is missing", async () => {
  const productionEnv = { ...env, VERCEL: "1" };
  const access = await lensline.fetch(request("/api/access", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: env.ACCESS_CODE }),
  }), productionEnv, {});
  assert.equal(access.status, 503);

  const health = await lensline.fetch(request("/health"), productionEnv, {});
  assert.equal(health.status, 503);
  assert.equal((await health.json()).ok, false);
});

test("Vercel Redis REST storage carries captions between controller and display requests", async () => {
  const originalFetch = globalThis.fetch;
  const redis = new Map();
  globalThis.fetch = async (_url, init) => {
    const [command, key, value] = JSON.parse(init.body);
    if (command === "GET") return Response.json({ result: redis.get(key) ?? null });
    if (command === "SET") {
      redis.set(key, value);
      return Response.json({ result: "OK" });
    }
    if (command === "DEL") {
      redis.delete(key);
      return Response.json({ result: 1 });
    }
    return Response.json({ error: "Unsupported test command" }, { status: 400 });
  };

  try {
    const productionEnv = {
      ...env,
      VERCEL: "1",
      UPSTASH_REDIS_REST_URL: "https://redis.test",
      UPSTASH_REDIS_REST_TOKEN: "redis-token",
    };
    const access = await lensline.fetch(request("/api/access", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "192.0.2.40" },
      body: JSON.stringify({ code: env.ACCESS_CODE }),
    }), productionEnv, {});
    assert.equal(access.status, 200);
    const cookie = access.headers.get("set-cookie");

    const publish = await lensline.fetch(request(`/api/captions/${room}`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ sequence: 20, completed: ["Stored in Redis"], live: true }),
    }), productionEnv, {});
    assert.equal(publish.status, 200);

    const read = await lensline.fetch(request(`/api/captions/${room}?after=19`), productionEnv, {});
    assert.equal(read.status, 200);
    assert.deepEqual((await read.json()).completed, ["Stored in Redis"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("every supported output language is forwarded and invalid targets never reach OpenAI", async () => {
  const cookie = await signIn();
  const originalFetch = globalThis.fetch;
  const upstream = [];
  globalThis.fetch = async (_url, init) => {
    upstream.push(JSON.parse(init.body));
    return Response.json({ value: "ephemeral-client-secret" });
  };
  const session = (body) => lensline.fetch(request("/api/session", {
    method: "POST", headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(body),
  }), { ...env, OPENAI_API_KEY: "server-only-test-key" }, {});
  try {
    for (const [code] of TARGET_LANGUAGES) {
      const sourceLanguage = code === "en" ? "ja" : "en";
      for (const translateBoth of [false, true]) {
        assert.equal((await session({ sourceLanguage, targetLanguage: code, translateBoth })).status, 200);
        const config = upstream.at(-1).session;
        assert.deepEqual(config.tools[0].parameters.properties.segments.items.properties.targetLanguage.enum, [sourceLanguage, code]);
        assert.match(config.instructions, translateBoth ? /Also translate/ : /Only translate/);
      }
    }
    const count = upstream.length;
    for (const targetLanguage of ["auto", "", "EN", null, 42, {}, ["ja"]]) {
      assert.equal((await session({ sourceLanguage: "en", targetLanguage })).status, 400);
    }
    for (const sourceLanguage of [undefined, "auto", "", "invalid", null, 42]) {
      assert.equal((await session({ sourceLanguage, targetLanguage: "en" })).status, 400);
    }
    for (const body of [null, [], "ja", {},
      { sourceLanguage: "en", targetLanguage: "en" },
      { sourceLanguage: "zh", targetLanguage: "zh-Hant-TW" },
      { sourceLanguage: "en", targetLanguage: "ja", translateBoth: "false" },
    ]) assert.equal((await session(body)).status, 400);
    assert.equal(upstream.length, count);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("caption relay preserves translation language and multilingual text", async () => {
  const cookie = await signIn();
  const languageRoom = "abcdef0123456789abcdef0123456789";
  const response = await lensline.fetch(request(`/api/captions/${languageRoom}`, {
    method: "POST", headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ sequence: 1, sourceLabel: "English", targetLanguage: "ja", completed: ["こんにちは、世界。"], partial: "次の文章", live: true }),
  }), env, {});
  assert.equal(response.status, 200);
  const state = await (await lensline.fetch(request(`/api/captions/${languageRoom}?after=-1`), env, {})).json();
  assert.equal(state.targetLanguage, "ja");
  assert.equal(state.sourceLabel, "English");
  assert.deepEqual(state.completed, ["こんにちは、世界。"]);
  assert.equal(state.partial, "次の文章");
});


test("Traditional Chinese converter is served locally with immutable caching", async () => {
  const response = await lensline.fetch(request("/assets/opencc-cn2t-1.4.2.js"), env, {});
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /javascript/);
  assert.match(response.headers.get("cache-control"), /immutable/);
  const code = await response.text();
  assert.match(code, /MIT License/);
  assert.match(code, /Apache License/);
  assert.match(code, /Converter/);
});
