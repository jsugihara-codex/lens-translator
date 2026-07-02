import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const [vercelText, packageText, apiSource, apiModule, runtimeSource, controllerSource, displaySource] = await Promise.all([
  readFile(resolve(root, "vercel.json"), "utf8"),
  readFile(resolve(root, "package.json"), "utf8"),
  readFile(resolve(root, "api/index.js"), "utf8"),
  import(resolve(root, "api/index.js")),
  readFile(resolve(root, "worker/index.js"), "utf8"),
  readFile(resolve(root, "worker/page-controller.js"), "utf8"),
  readFile(resolve(root, "worker/page-display.js"), "utf8"),
]);

const vercel = JSON.parse(vercelText);
const pkg = JSON.parse(packageText);
assert.equal(apiModule.config?.runtime, "edge");
assert.equal(typeof apiModule.default, "function");
assert.equal(pkg.type, "module");
assert.match(apiSource, /DISPLAY_ROOM_ID:\s*process\.env\.DISPLAY_ROOM_ID/, "Edge entry point must explicitly bind the fixed room environment variable");
assert.ok(vercel.rewrites.some((route) => route.source === "/display"));
assert.ok(vercel.rewrites.some((route) => route.source === "/api/captions/:room"));
assert.match(displaySource, /Web app connected/);
assert.match(controllerSource, /font-size:\s*13px/);
assert.match(displaySource, /font-size:\s*30px/);
assert.match(displaySource, /width:\s*min\(600px,\s*100vw\)/);
assert.match(displaySource, /targetLines/);
assert.match(displaySource, /typedLines/);
assert.doesNotMatch(displaySource, /typedTranscript|targetTranscript/);
assert.match(displaySource, /}, 28\);/);
assert.match(runtimeSource, /DISPLAY_ROOM_ID/);
assert.match(controllerSource, /__DISPLAY_ROOM_ID__/);
assert.doesNotMatch(controllerSource, /localStorage|getRandomValues/);

const fixedRoom = "0123456789abcdef0123456789abcdef";
const display = await apiModule.default(new Request(
  `https://lensline.test/api/index?__path=/display&room=${fixedRoom}`
));
assert.equal(display.status, 200);
const html = await display.text();
assert.match(html, /Lensline Display/);
assert.match(html, /Web app connected/);
const displayScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(displayScript, "Meta display must include its client script");
assert.doesNotThrow(() => new Function(displayScript), "Meta display client script must compile");

console.log("Vercel entry point, fixed Meta room, responsive display, and typewriter bundle are valid.");
