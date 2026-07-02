import lensline from "../worker/index.js";

export const config = { runtime: "edge" };

export default function handler(request) {
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
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    VERCEL: process.env.VERCEL,
  };
  return lensline.fetch(request, env, {});
}
