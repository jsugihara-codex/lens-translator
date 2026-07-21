import lensline from "../worker/index.js";

export const config = { runtime: "edge" };

export async function resolveDisplayRoomId(room, secret) {
  const configured = String(room || "").trim().toLowerCase();
  if (/^[a-f0-9]{32}$/.test(configured)) return configured;
  if (!secret) return "";

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`lensline-display:${secret}`)
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export function resolveMetaDisplayOrigin(value) {
  const configured = String(value || "").trim();
  if (!configured) return "";

  try {
    const origin = new URL(configured);
    return /^https?:$/.test(origin.protocol) ? origin.origin : "";
  } catch {
    return "";
  }
}

function safeEqual(left, right) {
  const a = String(left || "");
  const b = String(right || "");
  let mismatch = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    mismatch |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

async function createControllerCookie(secret) {
  const expires = Date.now() + 60_000;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`lensline:${expires}`))
  );
  const encoded = btoa(String.fromCharCode(...signature))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return `lensline_session=${expires}.${encoded}`;
}

export default async function handler(request) {
  const url = new URL(request.url);
  const originalPath = url.searchParams.get("__path");
  if (originalPath) {
    url.pathname = originalPath;
    url.searchParams.delete("__path");
    request = new Request(url, request);
  }
  const env = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ACCESS_CODE: process.env.ACCESS_CODE,
    ACCESS_SESSION_SECRET: process.env.ACCESS_SESSION_SECRET,
    DISPLAY_ROOM_ID: process.env.DISPLAY_ROOM_ID,
    META_DISPLAY_ORIGIN: process.env.META_DISPLAY_ORIGIN,
    LENSLINE_RELAY_TOKEN: process.env.LENSLINE_RELAY_TOKEN,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    VERCEL: process.env.VERCEL,
  };
  env.DISPLAY_ROOM_ID = await resolveDisplayRoomId(
    env.DISPLAY_ROOM_ID,
    env.ACCESS_SESSION_SECRET
  );

  const requestUrl = new URL(request.url);
  if (requestUrl.pathname === "/api/display-ingest") {
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed." }, { status: 405 });
    }
    if (!env.LENSLINE_RELAY_TOKEN || !env.ACCESS_SESSION_SECRET) {
      return Response.json({ error: "Display relay is not configured." }, { status: 503 });
    }

    const authorization = request.headers.get("authorization") || "";
    const supplied = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || "";
    if (!safeEqual(supplied, env.LENSLINE_RELAY_TOKEN)) {
      return Response.json({ error: "Display relay authorization is required." }, { status: 401 });
    }

    const captionUrl = new URL(request.url);
    captionUrl.pathname = `/api/captions/${env.DISPLAY_ROOM_ID}`;
    captionUrl.search = "";
    const headers = new Headers(request.headers);
    headers.delete("authorization");
    headers.set("cookie", await createControllerCookie(env.ACCESS_SESSION_SECRET));
    request = new Request(captionUrl, {
      method: "POST",
      headers,
      body: await request.text(),
    });
  }

  const response = await lensline.fetch(request, env, {});
  const hostedDisplay = resolveMetaDisplayOrigin(env.META_DISPLAY_ORIGIN);
  if (
    hostedDisplay &&
    request.method === "GET" &&
    new URL(request.url).pathname === "/" &&
    response.headers.get("content-type")?.includes("text/html")
  ) {
    const html = (await response.text()).replaceAll(
      "__META_DISPLAY_ORIGIN__",
      hostedDisplay
    );
    return new Response(html, { status: response.status, headers: response.headers });
  }

  if (
    requestUrl.pathname === "/display" &&
    request.method === "GET" &&
    response.headers.get("content-type")?.includes("text/html")
  ) {
    const html = (await response.text()).replace(
      "const room = new URLSearchParams(location.search).get('room');",
      `const room = new URLSearchParams(location.search).get('room') || '${env.DISPLAY_ROOM_ID}';`
    );
    return new Response(html, { status: response.status, headers: response.headers });
  }
  return response;
}
