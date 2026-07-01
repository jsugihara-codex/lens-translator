import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const [vercelText, packageText, apiModule, controllerSource, displaySource] = await Promise.all([
  readFile(resolve(root, "vercel.json"), "utf8"),
  readFile(resolve(root, "package.json"), "utf8"),
  import(resolve(root, "api/index.js")),
  readFile(resolve(root, "worker/page-controller.js"), "utf8"),
  readFile(resolve(root, "worker/page-display.js"), "utf8"),
]);

const vercel = JSON.parse(vercelText);
const pkg = JSON.parse(packageText);
assert.equal(apiModule.config?.runtime, "edge");
assert.equal(typeof apiModule.default, "function");
assert.equal(pkg.type, "module");
assert.ok(vercel.rewrites.some((route) => route.source === "/display"));
assert.ok(vercel.rewrites.some((route) => route.source === "/api/captions/:room"));
assert.match(displaySource, /Web app connected/);
assert.match(controllerSource, /font-size:13px/);
assert.match(displaySource, /font-size:15px/);

const display = await apiModule.default(new Request(
  "https://lensline.test/api/index?__path=/display&room=0123456789abcdef0123456789abcdef"
));
assert.equal(display.status, 200);
const html = await display.text();
assert.match(html, /Lensline Display/);
assert.match(html, /Web app connected/);

console.log("Vercel entry point and public Meta display bundle are valid.");
