import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import { OPENCC_SOURCE } from "../worker/vendor/opencc-cn2t.js";
const OpenCC = vm.runInNewContext(OPENCC_SOURCE + "; OpenCC");

import { E as controllerPage } from "../worker/page-controller.js";

class FakeTrack {
  constructor(kind, label) {
    this.kind = kind;
    this.label = label;
    this.enabled = true;
    this.readyState = "live";
    this.onended = null;
  }

  clone() {
    return new FakeTrack(this.kind, `${this.label}:clone`);
  }

  getSettings() {
    return { deviceId: this.deviceId };
  }

  stop() {
    this.readyState = "ended";
  }

  end() {
    this.readyState = "ended";
    return this.onended?.();
  }
}

class FakeMediaStream {
  constructor(tracks = []) {
    this.tracks = tracks;
  }

  getTracks() {
    return [...this.tracks];
  }

  getAudioTracks() {
    return this.tracks.filter((track) => track.kind === "audio");
  }
}

function createNode() {
  const listeners = new Map();
  const classes = new Set();
  const attributes = new Map();
  return {
    children: [],
    dataset: {},
    disabled: false,
    checked: false,
    style: {},
    textContent: "",
    classList: {
      toggle(value, enabled) {
        if (enabled) classes.add(value);
        else classes.delete(value);
      },
      contains(value) {
        return classes.has(value);
      },
    },
    addEventListener(name, handler) { listeners.set(name, handler); },
    dispatch(name) { return listeners.get(name)?.(); },
    removeAttribute() {},
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.get(name);
    },
    appendChild(child) {
      child.remove = () => { this.children.splice(this.children.indexOf(child), 1); };
      this.children.push(child);
    },
    get lastElementChild() {
      return this.children.at(-1);
    },
  };
}

function createController({ inputSource = "microphone", tabAudio = true, displayError, fetchErrorUrl, sessionResponse, hostedOrigin = "https://display.test", microphoneDevice = "built-in", hiddenDevices = false, microphoneError, enumerateError } = {}) {
  const room = "0123456789abcdef0123456789abcdef";
  const nodes = new Map();
  const sourceSelect = Object.assign(createNode(), {
    value: "fr",
    selectedIndex: 0,
    options: [{ text: "French" }],
  });
  const targetSelect = Object.assign(createNode(), {
    value: "en", selectedIndex: 0, options: [{ text: "English" }, { text: "Japanese" }, { text: "Traditional Chinese (Taiwan)" }],
  });
  const inputSourceSelect = Object.assign(createNode(), { value: inputSource });
  const microphoneSelect = Object.assign(createNode(), {
    value: microphoneDevice,
    replaceChildren(...options) { this.children = options; this.value = options[0]?.value || ""; },
  });
  Object.defineProperties(microphoneSelect, {
    options: { get() { return this.children; } },
    selectedIndex: { get() { return this.children.findIndex(option => option.value === this.value); } },
  });
  const pauseButton = Object.assign(createNode(), { disabled: true });
  const emptyHeading = createNode();
  const emptyCopy = createNode();
  const emptyState = Object.assign(createNode(), {
    querySelector(selector) {
      return selector === "strong" ? emptyHeading : emptyCopy;
    },
  });
  const captionBox = createNode();
  const destinationInputs = [createNode(), createNode()];

  nodes.set("#source-language", sourceSelect);
  nodes.set("#target-language", targetSelect);
  nodes.set("#input-source", inputSourceSelect);
  nodes.set("#microphone-device", microphoneSelect);
  nodes.set("#pause", pauseButton);
  nodes.set("#empty", emptyState);
  nodes.set("#captions", captionBox);

  const microphoneTrack = new FakeTrack("audio", "microphone");
  microphoneTrack.deviceId = "built-in";
  const microphoneStream = new FakeMediaStream([microphoneTrack]);
  const usbTrack = new FakeTrack("audio", "USB microphone");
  usbTrack.deviceId = "usb";
  const usbStream = new FakeMediaStream([usbTrack]);
  const permissionTrack = new FakeTrack("audio", "permission probe");
  const devices = [
    { kind: "audioinput", deviceId: "default", label: "Default microphone" },
    { kind: "audioinput", deviceId: "built-in", label: "Built-in microphone" },
    { kind: "audioinput", deviceId: "usb", label: "USB microphone" },
    { kind: "audiooutput", deviceId: "speaker", label: "Speakers" },
    { kind: "videoinput", deviceId: "camera", label: "Camera" },
  ];
  const tabTracks = [new FakeTrack("video", "browser-video")];
  if (tabAudio) tabTracks.push(new FakeTrack("audio", "browser-audio"));
  const tabStream = new FakeMediaStream(tabTracks);
  const calls = [];
  const contexts = [];
  const peerConnections = [];

  class FakeAudioContext {
    constructor() {
      this.state = "running";
      this.sources = [];
      this.compressor = null;
      this.destination = null;
      contexts.push(this);
    }

    async resume() {
      this.state = "running";
    }

    async close() {
      this.state = "closed";
    }

    createMediaStreamDestination() {
      this.destination = {
        stream: new FakeMediaStream([new FakeTrack("audio", "mixed-audio")]),
      };
      return this.destination;
    }

    createDynamicsCompressor() {
      this.compressor = {
        threshold: { value: 0 },
        knee: { value: 0 },
        ratio: { value: 0 },
        attack: { value: 0 },
        release: { value: 0 },
        connect(destination) {
          this.destination = destination;
        },
      };
      return this.compressor;
    }

    createMediaStreamSource(stream) {
      const source = {
        stream,
        connect(destination) {
          this.destination = destination;
        },
        disconnect() {},
      };
      this.sources.push(source);
      return source;
    }

    createAnalyser() {
      return {
        fftSize: 0,
        smoothingTimeConstant: 0,
        disconnect() {},
        getByteTimeDomainData(samples) {
          samples.fill(128);
        },
      };
    }
  }

  class FakePeerConnection {
    constructor() {
      this.tracks = [];
      peerConnections.push(this);
    }

    addTrack(track, stream) {
      this.tracks.push({ track, stream });
    }

    createDataChannel() {
      this.dataChannel = { readyState: "open", sent: [], send(data) { this.sent.push(JSON.parse(data)); }, close() {}, onmessage: null };
      return this.dataChannel;
    }

    async createOffer() {
      return { sdp: "offer" };
    }

    async setLocalDescription() {}

    async setRemoteDescription() {}

    getReceivers() {
      return [];
    }

    close() {
      this.closed = true;
    }
  }

  let timerId = 0;
  const intervals = new Map();
  const mediaDevices = {
    listeners: new Map(),
    addEventListener(name, callback) { this.listeners.set(name, callback); },
    async enumerateDevices() {
      if (enumerateError) throw enumerateError;
      return hiddenDevices ? [{ kind: "audioinput", deviceId: "", label: "" }] : devices;
    },
    async getUserMedia(options) {
      calls.push({ type: "microphone", options });
      if (microphoneError) throw microphoneError;
      if (options.audio === true) {
        hiddenDevices = false;
        return new FakeMediaStream([permissionTrack]);
      }
      return options.audio.deviceId.exact === "usb" ? usbStream : microphoneStream;
    },
    async getDisplayMedia(options) {
      calls.push({ type: "display", options });
      if (displayError) throw displayError;
      return tabStream;
    },
  };

  const window = {
    AudioContext: FakeAudioContext,
    OpenCC,
    addEventListener() {},
  };

  const document = {
    querySelector(selector) {
      if (!nodes.has(selector)) nodes.set(selector, createNode());
      return nodes.get(selector);
    },
    querySelectorAll() {
      return destinationInputs;
    },
    createElement() {
      return createNode();
    },
  };

  const context = {
    Audio: class {
      pause() {}
      load() {}
      removeAttribute() {}
    },
    MediaStream: FakeMediaStream,
    RTCPeerConnection: FakePeerConnection,
    URL,
    clearInterval(id) { intervals.delete(id); },
    clearTimeout() {},
    document,
    async fetch(url, init) {
      calls.push({ type: "fetch", url: String(url), body: init?.body });
      if (fetchErrorUrl && String(url).includes(fetchErrorUrl)) throw new TypeError("Failed to fetch");
      if (url === "/api/session") return sessionResponse || Response.json({ value: "ephemeral-secret" });
      if (String(url).includes("/realtime/calls")) return new Response("answer");
      return Response.json({ ok: true });
    },
    location: { origin: "https://lensline.test" },
    navigator: { clipboard: { async writeText() {} }, mediaDevices },
    setInterval(callback) {
      timerId += 1;
      intervals.set(timerId, callback);
      return timerId;
    },
    setTimeout() {
      timerId += 1;
      return timerId;
    },
    window,
  };

  const html = controllerPage
    .replace("__DISPLAY_ROOM_ID__", room)
    .replace("__META_DISPLAY_ORIGIN__", hostedOrigin);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  const controls = vm.runInNewContext(
    `${script}\n({ startTranslation, stopTranslation, startNewSession, toggleTranslationPause, receiveDelta, finalizePartial, publishState, refreshMicrophones, discoverMicrophones, handleTranslationResponse, state: () => ({ running, paused, partial, completed }) })`,
    context,
  );
  let readyResolved = false;
  const ready = controls.refreshMicrophones().then(() => { readyResolved = true; });
  const startTranslation = controls.startTranslation;
  controls.startTranslation = () => readyResolved ? startTranslation() : ready.then(startTranslation);

  return {
    calls,
    ready,
    devices,
    microphoneSelect,
    permissionTrack,
    usbTrack,
    tick() { for (const callback of [...intervals.values()]) callback(); },
    contexts,
    controls,
    inputSourceSelect,
    mediaDevices,
    microphoneTrack,
    nodes,
    pauseButton,
    peerConnections,
    sourceSelect,
    targetSelect,
    tabStream,
  };
}

test("device discovery lists named microphones without opening capture or selecting a default", async () => {
  const app = createController({ microphoneDevice: "" });
  await app.ready;
  assert.deepEqual(app.microphoneSelect.options.map(option => option.textContent), [
    "Choose a microphone", "Built-in microphone", "USB microphone",
  ]);
  assert.equal(app.microphoneSelect.value, "");
  assert.equal(app.calls.length, 0);
  await app.controls.startTranslation();
  assert.equal(app.calls.length, 0);
  assert.match(app.nodes.get("#error").textContent, /Choose an available microphone/);
});

test("permission discovery releases its temporary stream and requires an explicit choice", async () => {
  const app = createController({ microphoneDevice: "", hiddenDevices: true });
  await app.ready;
  assert.equal(app.microphoneSelect.disabled, true);
  assert.equal(app.calls.length, 0);
  await app.controls.discoverMicrophones();
  assert.equal(app.permissionTrack.readyState, "ended");
  assert.equal(app.microphoneSelect.disabled, false);
  assert.equal(app.microphoneSelect.value, "");
  assert.equal(app.microphoneSelect.options.length, 3);
  assert.equal(app.calls.length, 1);
  assert.equal(app.calls[0].options.audio, true);
});

for (const inputSource of ["microphone", "browser_tab_and_microphone"]) {
  test(`the selected USB microphone is captured in ${inputSource} mode`, async () => {
    const app = createController({ microphoneDevice: "usb", inputSource });
    await app.controls.startTranslation();
    const capture = app.calls.find(call => call.type === "microphone");
    assert.equal(capture.options.audio.deviceId.exact, "usb");
    assert.equal(app.microphoneSelect.disabled, true);
    assert.equal(app.nodes.get("#find-microphones").disabled, true);
    assert.match(app.nodes.get("#microphone-help").textContent, /Using USB microphone/);
    if (inputSource === "microphone") {
      assert.equal(app.peerConnections[0].tracks[0].track.label, "USB microphone:clone");
    } else {
      assert.equal(app.contexts[0].sources[0].stream.getAudioTracks()[0], app.usbTrack);
    }
    await app.controls.stopTranslation();
    assert.equal(app.microphoneSelect.disabled, false);
    assert.equal(app.nodes.get("#find-microphones").disabled, false);
  });
}

test("changing microphones between sessions releases the previous device and captures the new choice", async () => {
  const app = createController();
  await app.controls.startTranslation();
  await app.controls.stopTranslation();
  app.microphoneSelect.value = "usb";
  app.microphoneSelect.dispatch("change");
  await app.controls.startTranslation();
  assert.equal(app.microphoneTrack.readyState, "ended");
  assert.equal(app.peerConnections[1].tracks[0].track.label, "USB microphone:clone");
  assert.deepEqual(app.calls.filter(call => call.type === "microphone").map(call => call.options.audio.deviceId.exact), ["built-in", "usb"]);
});

test("removing the selected device leaves it unavailable without falling back to a different microphone", async () => {
  const app = createController({ microphoneDevice: "usb" });
  await app.ready;
  app.devices.splice(app.devices.findIndex(device => device.deviceId === "usb"), 1);
  await app.controls.refreshMicrophones();
  assert.equal(app.microphoneSelect.value, "usb");
  assert.match(app.microphoneSelect.options.at(-1).textContent, /unavailable/);
  assert.match(app.nodes.get("#microphone-help").textContent, /unavailable/);
  await app.controls.startTranslation();
  assert.equal(app.calls.length, 0);
});

test("a rejected exact device request shows recovery guidance and cleans up tab capture", async () => {
  const microphoneError = Object.assign(new Error("Missing device"), { name: "OverconstrainedError" });
  const app = createController({ microphoneDevice: "usb", inputSource: "browser_tab_and_microphone", microphoneError });
  await app.controls.startTranslation();
  assert.match(app.nodes.get("#error").textContent, /selected microphone is unavailable/);
  assert.equal(app.calls.filter(call => call.type === "microphone").length, 1);
  assert.equal(app.peerConnections.length, 0);
  assert.ok(app.tabStream.getTracks().every(track => track.readyState === "ended"));
  assert.equal(app.microphoneSelect.disabled, false);
});

test("denied permission during discovery leaves capture stopped and controls usable", async () => {
  const microphoneError = Object.assign(new Error("Permission denied"), { name: "NotAllowedError" });
  const app = createController({ microphoneDevice: "", hiddenDevices: true, microphoneError });
  await app.ready;
  await app.controls.discoverMicrophones();
  assert.match(app.nodes.get("#microphone-help").textContent, /Microphone access was blocked/);
  assert.equal(app.nodes.get("#find-microphones").disabled, false);
  assert.equal(app.nodes.get("#start").disabled, false);
  assert.equal(app.peerConnections.length, 0);
});

test("losing the active microphone ends translation and preserves device selection for recovery", async () => {
  const app = createController({ microphoneDevice: "usb" });
  await app.controls.startTranslation();
  await app.usbTrack.end();
  assert.equal(app.controls.state().running, false);
  assert.equal(app.peerConnections[0].closed, true);
  assert.equal(app.microphoneSelect.value, "usb");
  assert.equal(app.microphoneSelect.disabled, false);
  assert.match(app.nodes.get("#microphone-help").textContent, /microphone disconnected/);
});

test("microphone-only translation does not request browser-tab sharing and preserves the microphone", async () => {
  const controller = createController();
  await controller.controls.startTranslation();

  assert.deepEqual(controller.calls.map((call) => call.type), ["microphone", "fetch", "fetch"]);
  assert.equal(controller.peerConnections[0].tracks[0].track.label, "microphone:clone");
  assert.equal(controller.inputSourceSelect.disabled, true);

  await controller.controls.stopTranslation();

  assert.equal(controller.microphoneTrack.readyState, "live");
  assert.equal(controller.microphoneTrack.enabled, false);
  assert.equal(controller.peerConnections[0].tracks[0].track.readyState, "ended");
  assert.equal(controller.inputSourceSelect.disabled, false);

  await controller.controls.startTranslation();
  assert.equal(controller.calls.filter((call) => call.type === "microphone").length, 1);
  assert.equal(controller.microphoneTrack.enabled, true);
});

test("browser-tab translation mixes shared tab audio and microphone audio", async () => {
  const controller = createController({ inputSource: "browser_tab_and_microphone" });
  await controller.controls.startTranslation();

  assert.deepEqual(controller.calls.slice(0, 3).map((call) => call.type), ["display", "microphone", "fetch"]);
  assert.deepEqual(JSON.parse(JSON.stringify(controller.calls[0].options)), {
    video: { displaySurface: "browser" },
    audio: { suppressLocalAudioPlayback: false },
    selfBrowserSurface: "exclude",
    surfaceSwitching: "include",
    systemAudio: "include",
  });

  const mixingContext = controller.contexts[0];
  assert.equal(mixingContext.sources.length, 2);
  assert.equal(mixingContext.sources[0].stream.getAudioTracks()[0].label, "microphone");
  assert.equal(mixingContext.sources[1].stream.getAudioTracks()[0].label, "browser-audio");
  assert.equal(mixingContext.compressor.threshold.value, -12);
  assert.equal(mixingContext.compressor.ratio.value, 4);
  assert.equal(controller.peerConnections[0].tracks[0].track.label, "mixed-audio:clone");
  assert.equal(controller.contexts[1].sources[0].stream.getAudioTracks()[0].label, "microphone");

  await controller.controls.stopTranslation();

  assert.equal(mixingContext.state, "closed");
  assert.ok(controller.tabStream.getTracks().every((track) => track.readyState === "ended"));
  assert.equal(controller.microphoneTrack.readyState, "live");
  assert.equal(controller.inputSourceSelect.disabled, false);
});

test("pause mutes translation without closing its session or releasing microphone access", async () => {
  const controller = createController();
  await controller.controls.startTranslation();

  const peer = controller.peerConnections[0];
  const outboundTrack = peer.tracks[0].track;
  peer.dataChannel.onmessage({
    data: JSON.stringify(translationEvent("before", [{ detectedLanguage: "fr", targetLanguage: "en", text: "Before pause" }])),
  });

  controller.controls.toggleTranslationPause();

  assert.equal(controller.controls.state().running, true);
  assert.equal(controller.controls.state().paused, true);
  assert.deepEqual(Array.from(controller.controls.state().completed), ["Before pause"]);
  assert.equal(outboundTrack.enabled, false);
  assert.equal(outboundTrack.readyState, "live");
  assert.equal(controller.microphoneTrack.enabled, true);
  assert.equal(controller.microphoneTrack.readyState, "live");
  assert.equal(peer.closed, undefined);
  assert.equal(controller.nodes.get("#status").textContent, "Paused");
  assert.equal(controller.pauseButton.dataset.paused, "true");
  assert.equal(controller.pauseButton.getAttribute("aria-label"), "Resume translation");

  peer.dataChannel.onmessage({
    data: JSON.stringify(translationEvent("paused", [{ detectedLanguage: "fr", targetLanguage: "en", text: "Ignored while paused" }])),
  });
  assert.deepEqual(Array.from(controller.controls.state().completed), ["Before pause"]);

  controller.controls.toggleTranslationPause();

  assert.equal(controller.controls.state().paused, false);
  assert.equal(outboundTrack.enabled, true);
  assert.equal(controller.peerConnections.length, 1);
  assert.equal(controller.calls.filter((call) => call.type === "microphone").length, 1);
  assert.equal(controller.nodes.get("#status").textContent, "Listening");
  assert.equal(controller.pauseButton.dataset.paused, "false");
  assert.equal(controller.pauseButton.getAttribute("aria-label"), "Pause translation");
});

test("pausing shared browser audio preserves the tab, microphone, and mixer until translation stops", async () => {
  const controller = createController({ inputSource: "browser_tab_and_microphone" });
  await controller.controls.startTranslation();

  const mixingContext = controller.contexts[0];
  const outboundTrack = controller.peerConnections[0].tracks[0].track;
  controller.controls.toggleTranslationPause();

  assert.equal(outboundTrack.enabled, false);
  assert.equal(mixingContext.state, "running");
  assert.ok(controller.tabStream.getTracks().every((track) => track.readyState === "live"));
  assert.equal(controller.microphoneTrack.readyState, "live");
  assert.equal(controller.pauseButton.disabled, false);

  await controller.controls.stopTranslation();

  assert.equal(controller.controls.state().paused, false);
  assert.equal(controller.pauseButton.disabled, true);
  assert.equal(controller.pauseButton.getAttribute("aria-label"), "Pause translation");
  assert.equal(mixingContext.state, "closed");
  assert.ok(controller.tabStream.getTracks().every((track) => track.readyState === "ended"));
});

test("ending browser-tab sharing while paused keeps the paused state until resumed", async () => {
  const controller = createController({ inputSource: "browser_tab_and_microphone" });
  await controller.controls.startTranslation();
  controller.controls.toggleTranslationPause();

  controller.tabStream.getTracks()[0].end();

  assert.equal(controller.nodes.get("#status").textContent, "Paused");
  assert.equal(controller.controls.state().paused, true);
  assert.equal(controller.peerConnections[0].tracks[0].track.enabled, false);

  controller.controls.toggleTranslationPause();

  assert.equal(controller.nodes.get("#status").textContent, "Listening · microphone only");
  assert.equal(controller.peerConnections[0].tracks[0].track.enabled, true);
});

test("ending browser-tab sharing keeps microphone translation running and shows a warning", async () => {
  const controller = createController({ inputSource: "browser_tab_and_microphone" });
  await controller.controls.startTranslation();

  controller.tabStream.getTracks()[0].end();

  assert.match(controller.nodes.get("#error").textContent, /Translation continues with your microphone/);
  assert.equal(controller.nodes.get("#status").textContent, "Listening · microphone only");
  assert.equal(controller.peerConnections[0].tracks[0].track.readyState, "live");
  assert.equal(controller.microphoneTrack.readyState, "live");
  assert.equal(controller.contexts[0].state, "running");
});

test("sharing a browser tab without audio fails with actionable guidance", async () => {
  const controller = createController({ inputSource: "browser_tab_and_microphone", tabAudio: false });
  await controller.controls.startTranslation();

  assert.match(controller.nodes.get("#error").textContent, /enable Share tab audio/);
  assert.equal(controller.calls.filter((call) => call.type === "microphone").length, 0);
  assert.equal(controller.calls.filter((call) => call.type === "fetch").length, 0);
  assert.ok(controller.tabStream.getTracks().every((track) => track.readyState === "ended"));
  assert.equal(controller.inputSourceSelect.disabled, false);
});

test("canceling browser-tab sharing does not report an unrelated microphone failure", async () => {
  const displayError = new Error("Permission denied");
  displayError.name = "NotAllowedError";
  const controller = createController({ inputSource: "browser_tab_and_microphone", displayError });
  await controller.controls.startTranslation();

  assert.match(controller.nodes.get("#error").textContent, /Browser-tab sharing was canceled or blocked/);
  assert.doesNotMatch(controller.nodes.get("#error").textContent, /Microphone access was blocked/);
  assert.equal(controller.calls.filter((call) => call.type === "microphone").length, 0);
});


test("chosen languages reach session creation and remain locked until stopped", async () => {
  const controller = createController();
  await controller.ready;
  controller.sourceSelect.value = "en";
  controller.sourceSelect.options[0].text = "English";
  controller.targetSelect.value = "ja";
  controller.targetSelect.selectedIndex = 1;
  controller.targetSelect.dispatch("change");
  assert.equal(controller.nodes.get("#language-pair").textContent, "English → Japanese");
  assert.equal(controller.nodes.get("#captions").lang, "ja");
  const cleared = controller.calls.find(call => call.url?.startsWith("/api/captions/"));
  assert.equal(JSON.parse(cleared.body).targetLanguage, "ja");
  controller.calls.length = 0;

  const starting = controller.controls.startTranslation();
  assert.equal(controller.targetSelect.disabled, true);
  assert.equal(controller.sourceSelect.disabled, true);
  await starting;
  const session = controller.calls.find(call => call.url === "/api/session");
  assert.equal(JSON.parse(session.body).sourceLanguage, "en");
  assert.equal(JSON.parse(session.body).targetLanguage, "ja");
  assert.equal(controller.controls.state().running, true);
  await controller.controls.toggleTranslationPause();
  assert.equal(controller.targetSelect.disabled, true);
  await controller.controls.stopTranslation();
  assert.equal(controller.targetSelect.disabled, false);
  assert.equal(controller.sourceSelect.disabled, false);

  controller.calls.length = 0;
  controller.sourceSelect.value = "fr";
  controller.sourceSelect.options[0].text = "French";
  controller.targetSelect.value = "en";
  controller.targetSelect.selectedIndex = 0;
  await controller.controls.startTranslation();
  assert.equal(JSON.parse(controller.calls.find(call => call.url === "/api/session").body).targetLanguage, "en");
  await controller.controls.startNewSession();
  assert.equal(controller.targetSelect.disabled, false);
  assert.equal(controller.targetSelect.value, "en");
});

test("capture failure unlocks both language selectors for retry", async () => {
  const controller = createController({ inputSource: "browser_tab_and_microphone", displayError: new Error("Permission denied") });
  await controller.controls.startTranslation();
  assert.equal(controller.controls.state().running, false);
  assert.equal(controller.sourceSelect.disabled, false);
  assert.equal(controller.targetSelect.disabled, false);
});


test("language controls also initialize without a hosted Meta Display origin", () => {
  const controller = createController({ hostedOrigin: "__META_DISPLAY_ORIGIN__" });
  assert.equal(controller.nodes.get("#language-pair").textContent, "French → English");
  assert.match(controller.nodes.get("#display-url").textContent, /^https:\/\/lensline.test\/display\?room=/);
});


test("an unreachable local server gives recovery steps, mutes the microphone, and releases tab audio", async () => {
  const app = createController({ inputSource: "browser_tab_and_microphone", fetchErrorUrl: "/api/session" });
  await app.controls.startTranslation();
  assert.match(app.nodes.get("#error").textContent, /Cannot reach the Lensline server/);
  assert.match(app.nodes.get("#error").textContent, /Start Lensline.command/);
  assert.equal(app.microphoneTrack.enabled, false);
  assert.ok(app.tabStream.getTracks().every((track) => track.readyState === "ended"));
  assert.equal(app.nodes.get("#start").disabled, false);
});

test("an unreachable OpenAI audio endpoint identifies the external connection and closes the peer", async () => {
  const app = createController({ fetchErrorUrl: "/realtime/calls" });
  await app.controls.startTranslation();
  assert.match(app.nodes.get("#error").textContent, /Cannot reach OpenAI for the audio connection/);
  assert.equal(app.peerConnections[0].closed, true);
  assert.equal(app.microphoneTrack.enabled, false);
  assert.equal(app.nodes.get("#start").disabled, false);
});

test("a non-JSON server error shows recovery guidance instead of a JSON parser error", async () => {
  const app = createController({ sessionResponse: new Response("Lensline local server error", { status: 500 }) });
  await app.controls.startTranslation();
  assert.match(app.nodes.get("#error").textContent, /Lensline server returned an invalid response/);
  assert.equal(app.microphoneTrack.enabled, false);
});


test("Taiwan captions convert completed translations in browser and relay", async () => {
  const controller = createController();
  controller.targetSelect.value = "zh-Hant-TW";
  controller.targetSelect.selectedIndex = 2;
  controller.targetSelect.dispatch("change");
  await controller.controls.startTranslation();
  const session = controller.calls.find(call => call.url === "/api/session");
  assert.equal(JSON.parse(session.body).targetLanguage, "zh-Hant-TW");
  sendTranslation(controller, "taiwan", [{ detectedLanguage: "fr", targetLanguage: "zh-Hant-TW", text: "我用软件和硬盘。" }]);
  for (let i = 0; i < 20; i++) controller.tick();
  assert.equal(controller.nodes.get("#captions").children[0].textContent, "我用軟體和硬碟。");
  await controller.controls.publishState(true);
  let state = JSON.parse(controller.calls.filter(call => call.url?.startsWith("/api/captions/")).at(-1).body);
  assert.deepEqual(state.completed, ["我用軟體和硬碟。"]);
  assert.equal(state.targetLanguage, "zh-Hant-TW");
  controller.controls.finalizePartial();
  for (let i = 0; i < 3; i++) controller.tick();
  await controller.controls.publishState(true);
  state = JSON.parse(controller.calls.filter(call => call.url?.startsWith("/api/captions/")).at(-1).body);
  assert.deepEqual(state.completed, ["我用軟體和硬碟。"]);
  assert.equal(state.partial, "");
  await controller.controls.stopTranslation();
});


function translationEvent(id, segments, status = "completed") {
  return { type: "response.done", response: { id, status, output: [{
    type: "function_call", name: "submit_translation", call_id: "call-" + id,
    arguments: JSON.stringify({ segments }),
  }] } };
}

function sendTranslation(app, id, segments, status) {
  app.peerConnections[0].dataChannel.onmessage({ data: JSON.stringify(translationEvent(id, segments, status)) });
}

test("two-way translation routes alternating languages and ignores other languages and incorrect directions", async () => {
  const app = createController();
  const checkbox = app.nodes.get("#translate-both");
  checkbox.checked = true;
  checkbox.dispatch("change");
  assert.equal(app.nodes.get("#language-pair").textContent, "French ↔ English");
  await app.controls.startTranslation();
  assert.equal(checkbox.disabled, true);
  assert.equal(JSON.parse(app.calls.find(call => call.url === "/api/session").body).translateBoth, true);
  sendTranslation(app, "a", [{ detectedLanguage: "fr", targetLanguage: "en", text: "Hello" }]);
  sendTranslation(app, "b", [{ detectedLanguage: "en", targetLanguage: "fr", text: "Bonjour" }]);
  sendTranslation(app, "c", [
    { detectedLanguage: "de", targetLanguage: "en", text: "Wrong language" },
    { detectedLanguage: "fr", targetLanguage: "fr", text: "Wrong direction" },
    { detectedLanguage: "en", targetLanguage: "ja", text: "Wrong target" },
  ]);
  sendTranslation(app, "a", [{ detectedLanguage: "fr", targetLanguage: "en", text: "Duplicate" }]);
  sendTranslation(app, "cancelled", [{ detectedLanguage: "fr", targetLanguage: "en", text: "Cancelled" }], "cancelled");
  assert.deepEqual(Array.from(app.controls.state().completed), ["Hello", "Bonjour"]);
  for (let i = 0; i < 30; i++) app.tick();
  assert.deepEqual(app.nodes.get("#captions").children.map(node => node.textContent), ["Hello", "Bonjour"]);
  await app.controls.publishState(true);
  const published = JSON.parse(app.calls.filter(call => call.url?.startsWith("/api/captions/")).at(-1).body);
  assert.deepEqual(published.completed, ["Hello", "Bonjour"]);
  assert.equal(published.targetLanguage, "fr");
  assert.equal(published.sourceLabel, "English");
  assert.equal(app.peerConnections[0].dataChannel.sent.length, 4);
  assert.ok(app.peerConnections[0].dataChannel.sent.every(event => event.type === "conversation.item.create"));
  await app.controls.stopTranslation();
  assert.equal(checkbox.disabled, false);
  assert.equal(checkbox.checked, true);
});

test("one-way translation ignores reverse speech, malformed output, and raw model text", async () => {
  const app = createController();
  await app.controls.startTranslation();
  sendTranslation(app, "one", [{ detectedLanguage: "fr", targetLanguage: "en", text: "Hello" }]);
  sendTranslation(app, "reverse", [{ detectedLanguage: "en", targetLanguage: "fr", text: "Bonjour" }]);
  sendTranslation(app, "other", [{ detectedLanguage: "other", targetLanguage: "en", text: "Unknown" }]);
  const channel = app.peerConnections[0].dataChannel;
  channel.onmessage({ data: 'not json' });
  channel.onmessage({ data: JSON.stringify({ type: "response.output_text.delta", delta: "Unvalidated" }) });
  const malformed = translationEvent("bad", []);
  malformed.response.output[0].arguments = '{';
  channel.onmessage({ data: JSON.stringify(malformed) });
  assert.match(app.nodes.get("#error").textContent, /repeat the phrase/);
  assert.deepEqual(Array.from(app.controls.state().completed), ["Hello"]);
});

test("pause discards in-flight translations even if they finish after resume", async () => {
  const app = createController();
  await app.controls.startTranslation();
  const channel = app.peerConnections[0].dataChannel;
  channel.onmessage({ data: JSON.stringify({ type: "response.created", response: { id: "late" } }) });
  app.controls.toggleTranslationPause();
  app.controls.toggleTranslationPause();
  sendTranslation(app, "late", [{ detectedLanguage: "fr", targetLanguage: "en", text: "Stale" }]);
  sendTranslation(app, "fresh", [{ detectedLanguage: "fr", targetLanguage: "en", text: "Fresh" }]);
  assert.deepEqual(Array.from(app.controls.state().completed), ["Fresh"]);
});

test("Taiwan direction reversal preserves converted history in browser and Meta relay", async () => {
  const app = createController();
  app.sourceSelect.value = "en";
  app.targetSelect.value = "zh-Hant-TW";
  app.targetSelect.selectedIndex = 2;
  app.nodes.get("#translate-both").checked = true;
  app.targetSelect.dispatch("change");
  await app.controls.startTranslation();
  sendTranslation(app, "zh", [{ detectedLanguage: "en", targetLanguage: "zh-Hant-TW", text: "我用软件。" }]);
  sendTranslation(app, "en", [{ detectedLanguage: "zh", targetLanguage: "en", text: "I use software." }]);
  for (let i = 0; i < 40; i++) app.tick();
  const expected = ["我用軟體。", "I use software."];
  assert.deepEqual(app.nodes.get("#captions").children.map(node => node.textContent), expected);
  await app.controls.publishState(true);
  const payload = JSON.parse(app.calls.filter(call => call.url?.startsWith("/api/captions/")).at(-1).body);
  assert.deepEqual(payload.completed, expected);
  assert.equal(payload.targetLanguage, "en");
});

test("missing or equivalent languages are rejected before any capture", async () => {
  for (const [source, target] of [["", "en"], ["en", "en"], ["zh", "zh-Hant-TW"]]) {
    const app = createController();
    app.sourceSelect.value = source;
    app.targetSelect.value = target;
    await app.controls.startTranslation();
    assert.equal(app.calls.length, 0);
    assert.match(app.nodes.get("#error").textContent, /two different spoken languages/);
  }
});

test("final JSON text is validated like function output and freeform text is never shown", async () => {
  const app = createController();
  await app.controls.startTranslation();
  const send = (id, text) => app.peerConnections[0].dataChannel.onmessage({ data: JSON.stringify({
    type: "response.done", response: { id, status: "completed", output: [{
      type: "message", content: [{ type: "output_text", text }],
    }] },
  }) });
  send("json", JSON.stringify({ segments: [
    { detectedLanguage: "fr", targetLanguage: "en", text: "Valid translation" },
    { detectedLanguage: "de", targetLanguage: "en", text: "Outside the pair" },
  ] }));
  send("freeform", "Here is an unstructured response.");
  assert.deepEqual(Array.from(app.controls.state().completed), ["Valid translation"]);
  assert.match(app.nodes.get("#error").textContent, /repeat the phrase/);
});
