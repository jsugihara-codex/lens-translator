export function getMetaDisplayRelayConfig(env = process.env) {
  const configured = String(env.META_DISPLAY_ORIGIN || "").trim();
  const token = String(env.LENSLINE_RELAY_TOKEN || env.META_DISPLAY_RELAY_TOKEN || "").trim();
  if (!configured || !token) return null;

  try {
    const origin = new URL(configured);
    if (!/^https?:$/.test(origin.protocol)) return null;
    return { endpoint: new URL("/api/display-ingest", origin.origin), token };
  } catch {
    return null;
  }
}

function relayError(message, { status, code, retryable, cause } = {}) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.status = status;
  error.code = code;
  error.retryable = retryable;
  return error;
}

export async function publishLenslineState(
  state,
  config,
  fetchImpl = fetch,
  { timeoutMs = 15_000 } = {}
) {
  if (!config) return null;

  let response;
  try {
    response = await fetchImpl(config.endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${config.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(state),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (cause) {
    throw relayError("Hosted Meta Display request failed", {
      code:
        (typeof cause?.code === "string" && cause.code) ||
        cause?.name ||
        "fetch_failed",
      retryable: true,
      cause,
    });
  }

  if (!response.ok) {
    throw relayError(`Hosted Meta Display returned ${response.status}`, {
      status: response.status,
      code: `http_${response.status}`,
      retryable:
        response.status === 408 ||
        response.status === 425 ||
        response.status === 429 ||
        response.status >= 500,
    });
  }

  let result;
  try {
    result = await response.clone().json();
  } catch {
    result = null;
  }
  if (result?.accepted === false) {
    throw relayError("Hosted Meta Display ignored a stale caption state", {
      status: response.status,
      code: "stale_sequence",
      retryable: false,
    });
  }
  return response;
}

export function createMetaDisplayRelay(config, options = {}) {
  if (!config) return null;

  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const retryDelaysMs = options.retryDelaysMs ?? [350, 1_000];
  const sleep = options.sleep || ((delay) => new Promise((resolve) => setTimeout(resolve, delay)));
  const now = options.now || Date.now;
  const log = options.log || console.error;
  let pendingState;
  let active = false;
  let idleWaiters = [];

  function finishIdle() {
    if (active || pendingState) return;
    const waiters = idleWaiters;
    idleWaiters = [];
    waiters.forEach((resolve) => resolve());
  }

  function report(error, state, attempt, latencyMs, action) {
    const status = error.status ?? "network";
    const cause = [
      error.cause?.cause?.code,
      error.cause?.code,
      error.code,
      error.cause?.name,
      error.name,
    ].find((value) => typeof value === "string" && value) || "unknown";
    log(
      `Hosted Meta Display relay ${action}: sequence=${state.sequence} attempt=${attempt}/${retryDelaysMs.length + 1} status=${status} cause=${cause} latency_ms=${latencyMs}`
    );
  }

  async function deliver(state) {
    for (let attempt = 1; attempt <= retryDelaysMs.length + 1; attempt += 1) {
      const startedAt = now();
      try {
        await publishLenslineState(state, config, fetchImpl, { timeoutMs });
        return;
      } catch (error) {
        const latencyMs = Math.max(0, now() - startedAt);
        if (pendingState) {
          report(error, state, attempt, latencyMs, "superseded");
          return;
        }
        const retryDelay = retryDelaysMs[attempt - 1];
        if (!error.retryable || retryDelay === undefined) {
          report(error, state, attempt, latencyMs, "failed");
          return;
        }
        report(error, state, attempt, latencyMs, `retrying_in_ms=${retryDelay}`);
        await sleep(retryDelay);
        if (pendingState) return;
      }
    }
  }

  function start() {
    if (active || !pendingState) return;
    active = true;
    void (async () => {
      while (pendingState) {
        const state = pendingState;
        pendingState = undefined;
        await deliver(state);
      }
    })().finally(() => {
      active = false;
      if (pendingState) start();
      else finishIdle();
    });
  }

  return {
    enqueue(state) {
      pendingState = state;
      start();
    },
    whenIdle() {
      if (!active && !pendingState) return Promise.resolve();
      return new Promise((resolve) => idleWaiters.push(resolve));
    },
  };
}
