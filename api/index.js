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
  return lensline.fetch(request, process.env, {});
}
