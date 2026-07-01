import assert from "node:assert/strict";
import test from "node:test";
import lensline from "../worker/index.js";

const env = {
  ACCESS_CODE: "TEST-LENSLINE-CODE",
  ACCESS_SESSION_SECRET: "test-secret-that-is-long-enough-for-hmac-signing",
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
  assert.match(displayHtml, /setConnection\(/);
});

test("successful sign-in creates a secure controller session", async () => {
  const cookie = await signIn();
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);

  const controller = await lensline.fetch(request("/", {
    headers: { cookie },
  }), env, {});
  assert.match(await controller.text(), /Spoken language/);
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
      body: JSON.stringify({ targetLanguage: "en", room }),
    }), { ...env, OPENAI_API_KEY: "server-only-test-key" }, {});
    assert.equal(response.status, 200);
    assert.equal((await response.json()).value, "ephemeral-client-secret");
    assert.equal(upstream.url, "https://api.openai.com/v1/realtime/translations/client_secrets");
    assert.equal(upstream.init.headers.authorization, "Bearer server-only-test-key");
    const body = JSON.parse(upstream.init.body);
    assert.equal(body.session.model, "gpt-realtime-translate");
    assert.equal(body.session.audio.output.language, "en");
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
    }),
  }), env, {});
  assert.equal(publish.status, 200);

  const read = await lensline.fetch(request(`/api/captions/${room}?after=1`), env, {});
  assert.equal(read.status, 200);
  const state = await read.json();
  assert.deepEqual(state.completed, ["Hello from Lensline"]);
  assert.equal(state.partial, "Next sentence");
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
