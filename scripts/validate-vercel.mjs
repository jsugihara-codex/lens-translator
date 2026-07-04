import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const [vercelText, packageText, apiSource, apiModule, runtimeSource, controllerSource, controllerModule, displaySource] = await Promise.all([
  readFile(resolve(root, "vercel.json"), "utf8"),
  readFile(resolve(root, "package.json"), "utf8"),
  readFile(resolve(root, "api/index.js"), "utf8"),
  import(resolve(root, "api/index.js")),
  readFile(resolve(root, "worker/index.js"), "utf8"),
  readFile(resolve(root, "worker/page-controller.js"), "utf8"),
  import(resolve(root, "worker/page-controller.js")),
  readFile(resolve(root, "worker/page-display.js"), "utf8"),
]);

const vercel = JSON.parse(vercelText);
const pkg = JSON.parse(packageText);
assert.equal(apiModule.config?.runtime, "edge");
assert.equal(typeof apiModule.default, "function");
assert.equal(typeof apiModule.resolveDisplayRoomId, "function");
assert.equal(pkg.type, "module");
assert.match(apiSource, /DISPLAY_ROOM_ID:\s*process\.env\.DISPLAY_ROOM_ID/, "Edge entry point must explicitly bind the fixed room environment variable");
assert.match(apiSource, /lensline-display:/, "Edge entry point must provide a stable room fallback");

const derivedRoom = await apiModule.resolveDisplayRoomId("", "stable-test-secret");
assert.match(derivedRoom, /^[a-f0-9]{32}$/);
assert.equal(
  derivedRoom,
  await apiModule.resolveDisplayRoomId("", "stable-test-secret"),
  "the fallback Meta room must remain stable"
);
assert.equal(
  await apiModule.resolveDisplayRoomId("ABCDEF0123456789ABCDEF0123456789", "ignored"),
  "abcdef0123456789abcdef0123456789",
  "a configured room must take precedence"
);
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
assert.match(runtimeSource, /Max-Age=2592000/, "controller sign-in must persist for 30 days");
assert.match(runtimeSource, /Expires=\$\{new Date\(e\)\.toUTCString\(\)\}/, "persistent cookie must include an explicit expiry");
assert.match(runtimeSource, /HttpOnly; Secure; SameSite=Strict/, "persistent controller sessions must remain protected");
assert.match(controllerSource, /__DISPLAY_ROOM_ID__/);
assert.doesNotMatch(controllerSource, /localStorage|getRandomValues/);
assert.match(controllerSource, /id="new-session"/);
assert.match(controllerSource, /async function startNewSession\(\)/);
assert.match(controllerSource, /while \(captionBox\.lastElementChild\)/);
assert.match(controllerSource, /await publishState\(true\);/);
assert.doesNotMatch(controllerSource, /await startTranslation\(\);/, "new-session reset must wait for an explicit Start translation action");
assert.match(controllerSource, /setStatus\('New session ready'/, "new-session reset must leave the controller idle");
assert.match(
  controllerSource,
  /emptyState\.querySelector\('strong'\)\.textContent = 'Captions will appear here';/,
  "browser output must restore its own empty-state copy after Meta output"
);
assert.doesNotMatch(runtimeSource, /instructions:"Translate non-English speech/, "translation client secrets must not include unsupported session instructions");
assert.match(controllerSource, /function readableError\(value, fallback\)/, "controller must normalize structured API errors");
assert.match(controllerSource, /value\.error/, "controller must extract nested API error messages");
assert.match(controllerSource, /async function requestMicrophone\(\)/, "controller must request a fresh microphone stream when translation restarts");
assert.match(controllerSource, /AVAudioSessionCaptureDevice/, "microphone recovery must recognize the iOS capture-device failure");
assert.match(controllerSource, /translatedAudio\.load\(\)/, "stopping translation must release the iOS audio output route");
assert.match(controllerSource, /await cleanup\(\);/, "stop and restart flows must wait for audio-route teardown");
assert.match(controllerSource, /getReceivers\(\)\.forEach/, "cleanup must stop the remote WebRTC audio track");
assert.match(controllerSource, /try \{ await context\.close\(\); \}/, "cleanup must wait for the Web Audio context to close");
assert.match(controllerSource, /reusableTrack\?\.readyState === 'live'/, "restart must reuse the authorized live microphone track");
assert.match(controllerSource, /reusableTrack\.enabled = true/, "restart must re-enable the preserved microphone track");
assert.match(controllerSource, /await cleanup\(true\);/, "stopping translation must preserve the microphone for restart");
assert.match(controllerSource, /track\.enabled = false/, "stopping translation must immediately stop sending microphone audio");
assert.match(controllerSource, /pagehide', releaseMicrophone/, "leaving the page must fully release the preserved microphone");
assert.doesNotMatch(controllerSource, /const attempts = \[/, "restart must not trigger repeated microphone permission requests");
assert.match(controllerSource, /createMediaStreamSource\(stream\)/, "processing indicator must detect speech from the local microphone stream");
assert.match(controllerSource, /level >= \.012/, "low-level Bluetooth microphone activity must trigger the processing indicator");
assert.match(controllerSource, /now - microphoneSpeechSince >= 300/, "processing indicator must require 300ms of sustained local speech");
assert.match(controllerSource, /input_audio_buffer\.speech_started/, "Realtime speech detection must provide a fallback for mobile audio analysers");
assert.match(controllerSource, /setTimeout\(\(\) => \{[\s\S]*realtimeSpeechActive = true;[\s\S]*\}, 300\);/, "Realtime speech detection must use the same 300ms delay");
assert.match(controllerSource, /!translationIsWriting\(\)/, "browser processing indicator must stay hidden while translated text is being written");
assert.match(displaySource, /processingRequested && !translationIsWriting/, "Meta processing indicator must stay hidden while translated text is being written");
assert.match(controllerSource, /startMicrophoneMonitor\(sourceStream\)/, "microphone monitoring must begin after translation connects");
assert.match(controllerSource, /setProcessing\(false\)/, "processing indicator must clear when translated text begins");
assert.match(runtimeSource, /processing:!!e\.processing/, "caption relay must preserve processing state");
assert.match(displaySource, /id=\\"processing\\" class=\\"processing-line\\"/, "Meta display must include the processing indicator");

const controllerHtml = controllerModule.E.replace("__DISPLAY_ROOM_ID__", "0123456789abcdef0123456789abcdef");
const controllerScript = controllerHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(controllerScript, "controller must include its client script");
assert.doesNotThrow(() => new Function(controllerScript), "controller client script must compile");

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
