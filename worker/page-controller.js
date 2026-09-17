import { TARGET_LANGUAGES } from "./languages.js";
import { acceptTranslation } from "./translation-session.js";

export const E=`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Live speech translation for Meta Ray-Ban Display">
    <meta name="theme-color" content="#000000">
    <link rel="manifest" href="/manifest.webmanifest">
    <link rel="icon" type="image/png" sizes="128x128" href="/favicon.png">
    <link rel="apple-touch-icon" sizes="192x192" href="/apple-touch-icon.png">
    <title>Lensline \u2014 Live translation</title>
    <style>
      :root {
        color-scheme: dark;
        --ink: #38ff68;
        --muted: #168f3b;
        --panel: #000;
        --panel-strong: #020a04;
        --line: rgba(56, 255, 104, 0.34);
        --lime: #38ff68;
        --lime-ink: #000;
        --danger: #ff5c5c;
      }

      * { box-sizing: border-box; }
      html { max-width: 100%; overflow-x: hidden; -webkit-text-size-adjust: 100%; }

      body {
        min-height: 100vh;
        max-width: 100%;
        margin: 0;
        overflow-x: hidden;
        color: var(--ink);
        background: #000;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        text-shadow: 0 0 8px rgba(56, 255, 104, 0.18);
      }

      button, select { font: inherit; }

      .shell {
        width: min(1120px, calc(100% - 40px));
        margin: 0 auto;
        padding: 30px 0 56px;
      }

      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 54px;
      }

      .brand { display: flex; align-items: center; gap: 12px; font-weight: 720; letter-spacing: .08em; text-transform: uppercase; }
      .mark { width: 32px; height: 32px; display: grid; place-items: center; border: 1px solid var(--lime); border-radius: 0; background: #000; color: var(--lime); box-shadow: 0 0 14px rgba(56,255,104,.12); }
      .target-pill { padding: 8px 12px; border: 1px solid var(--line); border-radius: 0; color: var(--muted); font-size: 13px; }

      .hero { max-width: 710px; margin-bottom: 38px; }
      .eyebrow { margin: 0 0 14px; color: var(--lime); font-size: 12px; font-weight: 760; letter-spacing: 0.16em; text-transform: uppercase; }
      h1 { margin: 0; font-size: clamp(40px, 5.4vw, 66px); line-height: 1.02; letter-spacing: -0.055em; text-shadow: 0 0 18px rgba(56,255,104,.16); }
      .lede { max-width: 620px; margin: 22px 0 0; color: var(--muted); font-size: 18px; line-height: 1.55; }

      .workspace { display: grid; grid-template-columns: minmax(0, 0.88fr) minmax(360px, 1.12fr); gap: 22px; align-items: stretch; min-width: 0; }
      .workspace > *, .card { min-width: 0; }
      .card { width: 100%; border: 1px solid var(--line); border-radius: 0; background: var(--panel); box-shadow: inset 0 0 28px rgba(56,255,104,.025), 0 0 24px rgba(56,255,104,.035); }
      .controls { padding: 28px; }
      .setup-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
      .setup-heading .card-title { margin: 0; }
      .layout-toggle { flex: none; min-height: 36px; padding: 7px 10px; border: 1px solid var(--line); color: var(--ink); background: #000; font-size: 12px; cursor: pointer; }
      .layout-toggle:hover { border-color: var(--lime); }
      .layout-toggle:focus-visible { outline: 2px solid var(--lime); outline-offset: 3px; }
      .stage-tools { display: flex; align-items: center; gap: 12px; min-width: 0; }
      .stage-tools .route { max-width: none; }
      .caption-expand { display: grid; place-items: center; width: 36px; padding: 7px; }
      .caption-expand svg { width: 18px; height: 18px; }
      .caption-expand .restore-icon { display: none; }
      .setup-minimized .caption-expand .expand-icon { display: none; }
      .setup-minimized .caption-expand .restore-icon { display: block; }
      #setup-content[hidden] { display: none; }
      .shell:has(.setup-minimized) { width: calc(100% - 40px); max-width: none; height: 100dvh; min-height: 560px; padding: 20px 0; display: flex; flex-direction: column; gap: 16px; }
      .shell:has(.setup-minimized) header { margin-bottom: 0; }
      .shell:has(.setup-minimized) .hero { display: none; }
      .workspace.setup-minimized { flex: 1; min-height: 0; grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(240px, 1fr); gap: 12px; }
      .setup-minimized .controls { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 24px; padding: 12px 16px; }
      .setup-minimized .setup-heading { flex: 1; min-width: 230px; margin: 0; }
      .setup-minimized .session-actions { width: min(430px, 100%); }
      .setup-minimized .error { flex-basis: 100%; margin: 0; }
      .setup-minimized .error:empty { display: none; }
      .card-title { margin: 0 0 6px; font-size: 15px; font-weight: 700; }
      .card-note { margin: 0 0 25px; color: var(--muted); font-size: 13px; line-height: 1.5; }

      .field { display: grid; gap: 9px; margin-bottom: 22px; }
      .source-fields { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0; }
      .source-fields .field { min-width: 0; }
      .translation-mode { display: flex; align-items: center; gap: 10px; letter-spacing: 0; text-transform: none; }
      #translate-both { appearance: auto; width: 18px; height: 18px; flex: 0 0 auto; accent-color: var(--ink); }
      #input-source { font-size: 12px; }
      .microphone-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .microphone-help { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.45; }
      .microphone-heading button:disabled { opacity: .45; cursor: not-allowed; }
      label, legend { color: var(--ink); font-size: 12px; font-weight: 720; letter-spacing: 0.08em; text-transform: uppercase; }
      select {
        width: 100%;
        appearance: none;
        padding: 15px 42px 15px 15px;
        border: 1px solid var(--line);
        border-radius: 0;
        color: var(--ink);
        background: var(--panel-strong) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none'%3E%3Cpath d='m4 6 4 4 4-4' stroke='%2338ff68' stroke-width='1.5' stroke-linecap='square'/%3E%3C/svg%3E") no-repeat right 14px center;
        outline: none;
      }
      select:focus { border-color: var(--lime); box-shadow: 0 0 0 2px rgba(56,255,104,.14); }

      fieldset { padding: 0; margin: 0 0 24px; border: 0; }
      legend { margin-bottom: 9px; }
      .destination { display: grid; grid-template-columns: 1fr 1fr; padding: 4px; border: 1px solid var(--line); border-radius: 0; background: var(--panel-strong); }
      .destination input { position: absolute; opacity: 0; pointer-events: none; }
      .destination label { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 45px; border-radius: 0; cursor: pointer; color: var(--muted); text-transform: none; letter-spacing: 0; transition: 160ms ease; }
      .destination input:checked + label { color: #000; background: var(--lime); text-shadow: none; box-shadow: 0 0 16px rgba(56,255,104,.12); }

      .primary {
        width: 100%; min-height: 52px; border: 1px solid var(--lime); border-radius: 0; cursor: pointer;
        color: var(--lime-ink); background: var(--lime); font-weight: 780; transition: transform 150ms ease, filter 150ms ease;
      }
      .primary:hover { filter: brightness(1.04); transform: translateY(-1px); }
      .primary:disabled { cursor: wait; filter: grayscale(0.8); opacity: 0.65; transform: none; }
      .primary[data-running="true"] { color: var(--lime); background: #000; }

      .session-actions { display: grid; grid-template-columns: minmax(0, 1fr) 52px auto; gap: 10px; }
      .pause-control {
        display: grid; width: 52px; height: 52px; place-items: center; border: 1px solid var(--line); border-radius: 0;
        color: var(--lime); background: #000; cursor: pointer; transition: border-color 150ms ease, color 150ms ease, background 150ms ease;
      }
      .pause-control:hover:not(:disabled) { border-color: var(--lime); box-shadow: 0 0 14px rgba(56,255,104,.12); }
      .pause-control:disabled { cursor: not-allowed; opacity: .45; }
      .pause-control[data-paused="true"] { color: #000; background: var(--lime); border-color: var(--lime); }
      .pause-control .resume-glyph { display: none; }
      .pause-control[data-paused="true"] .pause-glyph { display: none; }
      .pause-control[data-paused="true"] .resume-glyph { display: block; }
      .secondary {
        min-height: 52px; padding: 0 16px; border: 1px solid var(--line); border-radius: 0; cursor: pointer;
        color: var(--ink); background: #000; font-weight: 720;
      }
      .secondary:hover { border-color: var(--lime); }
      .secondary:disabled { cursor: wait; opacity: .5; }

      .meta-link { display: none; margin-top: 18px; padding: 14px; border: 1px solid var(--line); border-radius: 0; background: #000; }
      .meta-link.visible { display: block; }
      .meta-label { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .09em; }
      .url-row { display: flex; gap: 8px; margin-top: 8px; }
      .url { min-width: 0; flex: 1; padding: 10px; overflow: hidden; border-radius: 0; background: #020a04; color: var(--ink); font: 12px ui-monospace, SFMono-Regular, Menlo, monospace; white-space: nowrap; text-overflow: ellipsis; }
      .copy { flex: none; border: 1px solid var(--line); border-radius: 0; background: transparent; color: var(--ink); cursor: pointer; padding: 0 12px; }

      .stage { --stage-header-height: 62px; position: relative; display: flex; flex-direction: column; height: auto; min-height: 430px; overflow: hidden; background: #000; }
      .setup-minimized .stage { height: 100%; min-height: 240px; }
      .stage::before { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(56,255,104,.018) 0, rgba(56,255,104,.018) 1px, transparent 1px, transparent 4px); pointer-events: none; }
      .stage-top { position: relative; z-index: 2; display: flex; flex: 0 0 auto; min-height: var(--stage-header-height); padding: 12px 24px; justify-content: space-between; align-items: center; }
      .stage-body { position: absolute; z-index: 1; inset: var(--stage-header-height) 0 0; display: flex; min-height: 0; overflow: hidden; }
      .live-state { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 12px; }
      .dot { width: 7px; height: 7px; border-radius: 0; background: #0d4b20; }
      .dot.live { background: var(--lime); box-shadow: 0 0 9px rgba(56,255,104,.65); }
      .route { color: var(--muted); font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; text-transform: uppercase; letter-spacing: .08em; }

      .empty { position: relative; z-index: 1; display: flex; flex: 1 1 auto; min-height: 0; width: 100%; padding: 40px; flex-direction: column; justify-content: center; align-items: center; text-align: center; color: var(--muted); }
      .empty-icon { width: 50px; height: 50px; display: grid; place-items: center; margin: 0 auto 15px; border: 1px solid var(--line); border-radius: 0; color: var(--ink); }
      .empty strong { display: block; margin-bottom: 7px; color: var(--ink); font-size: 15px; }
      .empty p { max-width: 330px; margin: 0 auto; font-size: 13px; line-height: 1.5; }

      .captions { position: relative; z-index: 1; display: none; flex: 1 1 auto; min-height: 0; width: 100%; height: auto; padding: 4px 34px 32px; overflow-x: hidden; overflow-y: auto; scrollbar-color: var(--lime) #07170b; scrollbar-width: thin; }
      .captions.visible { display: block; }
      .captions::-webkit-scrollbar { width: 10px; }
      .captions::-webkit-scrollbar-track { background: #07170b; }
      .captions::-webkit-scrollbar-thumb { border: 2px solid #07170b; background: var(--lime); }
      .caption-line { margin-top: 9px; color: #1dbb4a; font-size: 13px; font-weight: 590; line-height: 1.38; letter-spacing: -0.012em; animation: lift .18s ease-out; }
      .caption-line.partial { color: var(--lime); text-shadow: 0 0 10px rgba(56,255,104,.3); }
      .caption-line.processing { display: flex; gap: 5px; min-height: 18px; align-items: center; color: var(--lime); }
      .processing-dot { width: 5px; height: 5px; background: currentColor; animation: processing-pulse 1.05s infinite ease-in-out; }
      .processing-dot:nth-child(2) { animation-delay: .15s; }
      .processing-dot:nth-child(3) { animation-delay: .3s; }
      @keyframes processing-pulse { 0%, 70%, 100% { opacity: .22; transform: translateY(0); } 35% { opacity: 1; transform: translateY(-3px); } }
      @keyframes lift { from { transform: translateY(12px); opacity: .2; } to { transform: translateY(0); opacity: 1; } }

      .error { min-height: 20px; margin: 13px 2px 0; color: var(--danger); font-size: 12px; line-height: 1.45; }
      .privacy { display: flex; align-items: center; gap: 8px; margin-top: 18px; color: var(--muted); font-size: 11px; }

      @media (max-width: 800px) {
        .shell { width: calc(100% - 24px); max-width: 620px; padding-top: 20px; }
        header { flex-wrap: wrap; gap: 12px; margin-bottom: 38px; }
        .target-pill { max-width: 100%; font-size: 11px; }
        .hero, .lede, .card-note, .privacy { max-width: 100%; overflow-wrap: anywhere; }
        h1 { font-size: clamp(34px, 11vw, 48px); }
        .lede { font-size: 16px; }
        .workspace { width: 100%; grid-template-columns: minmax(0, 1fr); }
        .controls { width: 100%; min-width: 0; padding: 20px; overflow: hidden; }
        .source-fields { grid-template-columns: minmax(0, 1fr); gap: 0; }
        .field, fieldset, select, .destination, .session-actions, .primary, .meta-link, .url-row { width: 100%; min-width: 0; max-width: 100%; }
        .session-actions { grid-template-columns: minmax(0, 1fr) 52px; }
        .secondary { grid-column: 1 / -1; width: 100%; }
        .destination label { min-width: 0; padding: 0 8px; text-align: center; }
        .url-row { flex-direction: column; }
        .url { width: 100%; white-space: normal; overflow-wrap: anywhere; text-overflow: clip; line-height: 1.4; }
        .copy { width: 100%; min-height: 44px; padding: 10px 12px; }
        .privacy { align-items: flex-start; line-height: 1.45; }
        .stage { --stage-header-height: 58px; height: 390px; min-height: 390px; }
        .stage-top { padding: 10px 18px; gap: 12px; }
        .stage-tools { gap: 8px; }
        .shell:has(.setup-minimized) { width: calc(100% - 24px); padding: 12px 0; gap: 12px; }
        .setup-minimized .session-actions { grid-template-columns: minmax(0, 1fr) 44px auto; }
        .setup-minimized .session-actions .primary, .setup-minimized .session-actions .secondary { min-height: 44px; font-size: 12px; }
        .setup-minimized .session-actions .pause-control { width: 44px; height: 44px; }
        .setup-minimized .session-actions .secondary { grid-column: auto; padding: 0 8px; }
        .route { max-width: 55%; text-align: right; white-space: normal; }
        .empty { padding: 30px 20px; }
        .captions { padding: 4px 20px 24px; }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <header>
        <div class="brand"><span class="mark">L</span><span>Lensline</span></div>
        <div id="language-pair" class="target-pill">Choose languages</div>
      </header>

      <section class="hero">
        <p class="eyebrow">Live speech translation</p>
        <h1>Understand the room<br>as it happens.</h1>
        <p class="lede">Choose the spoken and translated languages, capture your microphone or a browser tab with your microphone, and send the translated captions to your browser or Meta Ray-Ban Display.</p>
      </section>

      <main id="workspace" class="workspace">
        <section class="card controls" aria-label="Translation controls">
          <div class="setup-heading">
            <h2 class="card-title">Session setup</h2>
            <button id="setup-toggle" class="layout-toggle" type="button" aria-controls="setup-content" aria-expanded="true" title="Minimize setup to expand the translation window">Minimize setup</button>
          </div>
          <div id="setup-content">
          <p class="card-note">Audio stays between this browser and OpenAI. Only translated text is sent to the display route. Choose two different languages. Speech outside the selected pair is ignored.</p>

          <div class="source-fields">
            <div class="field">
              <label for="source-language">Spoken language</label>
              <select id="source-language">
                <option value="">Choose a language</option>
                ${TARGET_LANGUAGES.map(([code, label]) => '<option value="' + code + '">' + label + '</option>').join('')}
              </select>
            </div>
            <div class="field">
              <label for="target-language">Translated language</label>
              <select id="target-language">
                ${TARGET_LANGUAGES.map(([code, label]) => '<option value="' + code + '">' + label + '</option>').join('')}
              </select>
            </div>
            <div class="field">
              <label class="translation-mode" for="translate-both">
                <input id="translate-both" type="checkbox" aria-describedby="translation-mode-help">
                <span>Translate both languages</span>
              </label>
              <p id="translation-mode-help" class="microphone-help">Unchecked: translate only the spoken language into the translated language.</p>
            </div>
            <div class="field">
              <label for="input-source">Input source</label>
              <select id="input-source">
                <option value="microphone">Microphone</option>
                <option value="browser_tab_and_microphone">Browser tab + microphone</option>
              </select>
            </div>
            <div class="field">
              <div class="microphone-heading">
                <label for="microphone-device">Microphone</label>
                <button id="find-microphones" class="layout-toggle" type="button">Find microphones</button>
              </div>
              <select id="microphone-device" aria-describedby="microphone-help" disabled>
                <option value="">Choose a microphone</option>
              </select>
              <p id="microphone-help" class="microphone-help" role="status">Click Find microphones to allow access and list your microphones.</p>
            </div>
          </div>

          <fieldset>
            <legend>Show captions on</legend>
            <div class="destination">
              <input id="dest-browser" name="destination" type="radio" value="browser" checked>
              <label for="dest-browser">This browser</label>
              <input id="dest-meta" name="destination" type="radio" value="meta">
              <label for="dest-meta">Meta Display</label>
            </div>
          </fieldset>

          <div id="meta-link" class="meta-link">
            <div class="meta-label">Meta Display Web App URL</div>
            <div class="url-row">
              <div id="display-url" class="url"></div>
              <button id="copy" class="copy" type="button">Copy</button>
            </div>
          </div>
          <div class="privacy">\u25CF Find microphones briefly accesses your mic to list devices. Translation and tab sharing start only after you press Start.</div>
          </div>
          <div class="session-actions">
            <button id="start" class="primary" type="button">Start translation</button>
            <button id="pause" class="pause-control" type="button" data-paused="false" aria-label="Pause translation" title="Pause translation" disabled>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path class="pause-glyph" d="M8 5.5V18.5M16 5.5V18.5" stroke="currentColor" stroke-width="2" stroke-linecap="square"></path>
                <path class="resume-glyph" d="M8 5.5L18 12L8 18.5V5.5Z" fill="currentColor"></path>
              </svg>
            </button>
            <button id="new-session" class="secondary" type="button">New session</button>
          </div>
          <div id="error" class="error" role="alert"></div>
        </section>

        <section class="card stage" aria-label="Caption output preview">
          <div class="stage-top">
            <div class="live-state"><span id="status-dot" class="dot"></span><span id="status">Ready</span></div>
            <div class="stage-tools">
              <div id="route" class="route">browser output</div>
              <button id="caption-expand" class="layout-toggle caption-expand" type="button" aria-label="Expand translation window" title="Expand translation window" aria-controls="workspace" aria-pressed="false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                  <path class="expand-icon" d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>
                  <path class="restore-icon" d="M3 8h5V3m13 5h-5V3M8 21v-5H3m13 5v-5h5"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="stage-body">
            <div id="empty" class="empty">
              <div class="empty-icon">\u2301</div>
              <strong>Captions will appear here</strong>
              <p>Choose both languages and start translation. Captions stream as each phrase is translated.</p>
            </div>
            <div id="captions" class="captions" aria-live="polite"></div>
          </div>
        </section>
      </main>
    </div>

    <script src="/assets/opencc-cn2t-1.4.2.js"></script>
    <script>
      const workspace = document.querySelector('#workspace');
      const setupContent = document.querySelector('#setup-content');
      const setupToggle = document.querySelector('#setup-toggle');
      const captionExpand = document.querySelector('#caption-expand');
      let setupMinimized = false;

      function toggleSetup() {
        setupMinimized = !setupMinimized;
        workspace.classList.toggle('setup-minimized', setupMinimized);
        setupContent.hidden = setupMinimized;
        setupToggle.textContent = setupMinimized ? 'Expand setup' : 'Minimize setup';
        setupToggle.setAttribute('aria-expanded', String(!setupMinimized));
        setupToggle.setAttribute('title', setupMinimized ? 'Expand session setup' : 'Minimize setup to expand the translation window');
        const captionLabel = setupMinimized ? 'Restore translation window' : 'Expand translation window';
        captionExpand.setAttribute('aria-label', captionLabel);
        captionExpand.setAttribute('title', captionLabel);
        captionExpand.setAttribute('aria-pressed', String(setupMinimized));
      }

      setupToggle.addEventListener('click', toggleSetup);
      captionExpand.addEventListener('click', toggleSetup);

      const sourceSelect = document.querySelector('#source-language');
      const targetSelect = document.querySelector('#target-language');
      const translateBothCheckbox = document.querySelector('#translate-both');
      const translationModeHelp = document.querySelector('#translation-mode-help');
      const languageLabels = ${JSON.stringify(Object.fromEntries(TARGET_LANGUAGES))};
      const acceptTranslation = ${acceptTranslation.toString()};
      let activeOutputLanguage = targetSelect.value;
      let activeSourceLabel = '';
      let activeResponseId;
      const ignoredResponses = new Set();
      const handledResponses = new Set();
      function selectedPair() {
        return { sourceLanguage: sourceSelect.value, targetLanguage: targetSelect.value, translateBoth: translateBothCheckbox.checked };
      }
      let traditionalChineseConverter;
      function captionText(text, language = activeOutputLanguage) {
        if (language !== 'zh-Hant-TW') return text;
        if (!traditionalChineseConverter) {
          if (!window.OpenCC) throw new Error('Traditional Chinese could not load. Refresh Lensline and try again.');
          traditionalChineseConverter = window.OpenCC.Converter({ from: 'cn', to: 'twp' });
        }
        return traditionalChineseConverter(text);
      }
      const languagePair = document.querySelector('#language-pair');
      const inputSourceSelect = document.querySelector('#input-source');
      const microphoneSelect = document.querySelector('#microphone-device');
      const findMicrophonesButton = document.querySelector('#find-microphones');
      const microphoneHelp = document.querySelector('#microphone-help');
      const destinationInputs = [...document.querySelectorAll('input[name="destination"]')];
      const startButton = document.querySelector('#start');
      const pauseButton = document.querySelector('#pause');
      const newSessionButton = document.querySelector('#new-session');
      const statusText = document.querySelector('#status');
      const statusDot = document.querySelector('#status-dot');
      const routeLabel = document.querySelector('#route');
      const errorBox = document.querySelector('#error');
      const emptyState = document.querySelector('#empty');
      const captionBox = document.querySelector('#captions');
      const metaLink = document.querySelector('#meta-link');
      const displayUrlNode = document.querySelector('#display-url');
      const copyButton = document.querySelector('#copy');

      const room = '__DISPLAY_ROOM_ID__';
      const hostedDisplayOrigin = '__META_DISPLAY_ORIGIN__';
      const hasHostedDisplay = hostedDisplayOrigin.startsWith('https://') || hostedDisplayOrigin.startsWith('http://');
      const displayUrl = new URL('/display', hasHostedDisplay ? hostedDisplayOrigin : location.origin);
      if (!hasHostedDisplay) displayUrl.searchParams.set('room', room);
      displayUrlNode.textContent = displayUrl.toString();

      if (!/^[a-f0-9]{32}$/.test(room)) {
        startButton.disabled = true;
        newSessionButton.disabled = true;
        errorBox.textContent = 'The fixed Meta display room is not configured.';
      }

      let destination = 'browser';
      let running = false;
      let paused = false;
      let peerConnection;
      let eventChannel;
      let sourceStream;
      let microphoneDevices = [];
      let activeMicrophoneDeviceId = '';
      let microphoneControlsLocked = false;
      let discoveringMicrophones = false;
      let microphoneListVersion = 0;
      let browserTabStream;
      let mixedSourceStream;
      let mixedAudioContext;
      let outboundMicrophoneTrack;
      let translatedAudio;
      let finalizationTimer;
      let publishTimer;
      let typingTimer;
      let heartbeatTimer;
      let publishChain = Promise.resolve();
      let pendingPublishBody = '';
      let publishInFlight = false;
      let sequence = 0;
      let completed = [];
      let partial = '';
      let browserCompleted = [];
      let browserPartial = '';
      let typingQueue = [];
      let microphoneNeedsRecovery = false;
      let processing = false;
      let audioContext;
      let microphoneSource;
      let microphoneAnalyser;
      let microphoneMonitorTimer;
      let microphoneSpeechActive = false;
      let microphoneSpeechSince = 0;
      let microphoneQuietSince = 0;
      let realtimeSpeechActive = false;
      let realtimeSpeechTimer;
      let turnHasOutput = false;

      destinationInputs.forEach((input) => input.addEventListener('change', () => {
        destination = document.querySelector('input[name="destination"]:checked').value;
        routeLabel.textContent = destination === 'meta' ? 'meta display output' : 'browser output';
        metaLink.classList.toggle('visible', destination === 'meta');
        renderOutput();
      }));

      function updateLanguagePair() {
        languagePair.textContent = sourceSelect.options[sourceSelect.selectedIndex].text + (translateBothCheckbox.checked ? ' ↔ ' : ' → ') + targetSelect.options[targetSelect.selectedIndex].text;
        captionBox.lang = translateBothCheckbox.checked ? '' : targetSelect.value;
        translationModeHelp.textContent = translateBothCheckbox.checked
          ? 'Detect either selected language and translate into the other. Other languages are ignored.'
          : 'Translate only the spoken language into the translated language. Other speech is ignored.';
        renderOutput();
      }

      [sourceSelect, targetSelect, translateBothCheckbox].forEach((control) => control.addEventListener('change', () => {
        resetTranscript();
        updateLanguagePair();
        try { publishState(true); } catch (error) { errorBox.textContent = error.message; }
      }));
      updateLanguagePair();

      copyButton.addEventListener('click', async () => {
        await navigator.clipboard.writeText(displayUrl.toString());
        copyButton.textContent = 'Copied';
        setTimeout(() => { copyButton.textContent = 'Copy'; }, 1400);
      });

      startButton.addEventListener('click', () => running ? stopTranslation() : startTranslation());
      pauseButton.addEventListener('click', toggleTranslationPause);
      newSessionButton.addEventListener('click', startNewSession);
      window.addEventListener('pagehide', releaseMicrophone);
      findMicrophonesButton.addEventListener('click', discoverMicrophones);
      microphoneSelect.addEventListener('change', updateMicrophoneHelp);
      navigator.mediaDevices?.addEventListener?.('devicechange', () => { void refreshMicrophones(); });
      void refreshMicrophones();

      function setMicrophoneControlsLocked(locked) {
        microphoneControlsLocked = locked;
        microphoneSelect.disabled = locked || discoveringMicrophones || !microphoneDevices.length;
        findMicrophonesButton.disabled = locked || discoveringMicrophones;
      }

      function updateMicrophoneHelp() {
        const selected = microphoneDevices.find((device) => device.deviceId === microphoneSelect.value);
        if (selected) {
          microphoneHelp.textContent = running
            ? 'Using ' + (sourceStream?.getAudioTracks()[0]?.label || selected.label) + '. Stop translation to change microphones.'
            : 'Selected: ' + selected.label;
        } else if (microphoneSelect.value) {
          microphoneHelp.textContent = 'The selected microphone is unavailable. Reconnect it or choose another microphone.';
        } else {
          microphoneHelp.textContent = microphoneDevices.length
            ? 'Choose a microphone before starting translation.'
            : 'Click Find microphones to allow access and list your microphones.';
        }
      }

      async function refreshMicrophones() {
        const version = ++microphoneListVersion;
        if (!navigator.mediaDevices?.enumerateDevices) {
          microphoneHelp.textContent = 'This browser cannot list microphones. Open Lensline in a browser with microphone support.';
          microphoneSelect.disabled = true;
          findMicrophonesButton.disabled = true;
          return false;
        }
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          if (version !== microphoneListVersion) return false;
          const inputs = devices.filter((device) => device.kind === 'audioinput' && device.deviceId && device.label);
          const physicalInputs = inputs.filter((device) => !['default', 'communications'].includes(device.deviceId));
          microphoneDevices = physicalInputs.length ? physicalInputs : inputs;
          const selectedId = microphoneSelect.value;
          const selectedLabel = microphoneSelect.options[microphoneSelect.selectedIndex]?.textContent || 'Selected microphone';
          const options = [];
          const placeholder = document.createElement('option');
          placeholder.value = '';
          placeholder.textContent = 'Choose a microphone';
          options.push(placeholder);
          microphoneDevices.forEach((device) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label;
            options.push(option);
          });
          if (selectedId && !microphoneDevices.some((device) => device.deviceId === selectedId)) {
            const unavailable = document.createElement('option');
            unavailable.value = selectedId;
            unavailable.textContent = selectedLabel.endsWith(' (unavailable)') ? selectedLabel : selectedLabel + ' (unavailable)';
            unavailable.disabled = true;
            options.push(unavailable);
          }
          microphoneSelect.replaceChildren(...options);
          microphoneSelect.value = selectedId;
          setMicrophoneControlsLocked(microphoneControlsLocked);
          updateMicrophoneHelp();
          return true;
        } catch {
          if (version === microphoneListVersion) microphoneHelp.textContent = 'Could not list microphones. Click Find microphones to try again.';
          return false;
        }
      }

      async function discoverMicrophones() {
        if (microphoneControlsLocked || discoveringMicrophones) return;
        discoveringMicrophones = true;
        const startWasDisabled = startButton.disabled;
        const newSessionWasDisabled = newSessionButton.disabled;
        startButton.disabled = true;
        newSessionButton.disabled = true;
        setMicrophoneControlsLocked(false);
        microphoneHelp.textContent = 'Checking microphone access…';
        let permissionStream;
        try {
          if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.enumerateDevices) {
            throw new Error('This browser cannot list microphones. Open Lensline in a browser with microphone support.');
          }
          await refreshMicrophones();
          if (!microphoneDevices.length) {
            microphoneHelp.textContent = 'Allow microphone access in the browser prompt to see your devices.';
            permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            permissionStream.getTracks().forEach((track) => { track.enabled = false; });
            await refreshMicrophones();
            if (!microphoneDevices.length) microphoneHelp.textContent = 'No microphones are available. Connect a microphone and click Find microphones again.';
          }
        } catch (error) {
          microphoneHelp.textContent = microphoneCaptureError(error);
        } finally {
          permissionStream?.getTracks().forEach((track) => track.stop());
          discoveringMicrophones = false;
          setMicrophoneControlsLocked(false);
          startButton.disabled = startWasDisabled;
          newSessionButton.disabled = newSessionWasDisabled;
        }
      }

      function resetTranscript() {
        activeOutputLanguage = targetSelect.value;
        activeSourceLabel = sourceSelect.options[sourceSelect.selectedIndex].text;
        completed = [];
        partial = '';
        browserCompleted = [];
        browserPartial = '';
        typingQueue = [];
        processing = false;
        clearTimeout(finalizationTimer);
        clearTimeout(publishTimer);
        clearInterval(typingTimer);
        typingTimer = undefined;
        while (captionBox.lastElementChild) captionBox.lastElementChild.remove();
        renderOutput();
      }

      async function startNewSession() {
        newSessionButton.disabled = true;
        startButton.disabled = true;
        pauseButton.disabled = true;
        errorBox.textContent = '';

        running = false;
        paused = false;
        updatePauseButton();
        await cleanup();
        sourceSelect.disabled = false;
        targetSelect.disabled = false;
        translateBothCheckbox.disabled = false;
        inputSourceSelect.disabled = false;
        setMicrophoneControlsLocked(false);
        updateMicrophoneHelp();
        destinationInputs.forEach((input) => { input.disabled = false; });
        resetTranscript();
        sequence = Date.now();
        setStatus('Clearing previous session', false);
        await publishState(true);
        startButton.disabled = false;
        newSessionButton.disabled = false;
        startButton.dataset.running = 'false';
        startButton.textContent = 'Start translation';
        setStatus('New session ready', false);
        renderOutput();
      }

      async function startTranslation() {
        if (discoveringMicrophones) return;
        const normalize = (code) => code === 'zh-Hant-TW' ? 'zh' : code;
        if (!languageLabels[sourceSelect.value] || !languageLabels[targetSelect.value] || normalize(sourceSelect.value) === normalize(targetSelect.value)) {
          errorBox.textContent = 'Choose two different spoken languages. Mandarin and Traditional Chinese use the same spoken language.';
          if (setupMinimized) toggleSetup();
          return;
        }
        if (!microphoneSelect.value || !microphoneDevices.some((device) => device.deviceId === microphoneSelect.value)) {
          errorBox.textContent = 'Choose an available microphone before starting. Use Find microphones if your device is not listed.';
          if (setupMinimized) toggleSetup();
          return;
        }
        setBusy('Connecting\u2026');
        errorBox.textContent = '';
        resetTranscript();
        sequence = Date.now();

        try {
          captionText('');
          if (inputSourceSelect.value === 'browser_tab_and_microphone') {
            browserTabStream = await requestBrowserTab();
          }

          sourceStream = await requestMicrophone();
          microphoneNeedsRecovery = false;
          if (browserTabStream) {
            mixedSourceStream = await mixAudioSources(sourceStream, browserTabStream);
            browserTabStream.getTracks().forEach((track) => {
              track.onended = handleBrowserTabEnded;
            });
          }

          const tokenResponse = await translationFetch('/api/session', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              sourceLanguage: sourceSelect.value,
              targetLanguage: targetSelect.value,
              translateBoth: translateBothCheckbox.checked,
              room
            })
          }, 'Cannot reach the Lensline server. Reopen Start Lensline.command, refresh this page, and try again.');

          let tokenData;
          try {
            tokenData = await tokenResponse.json();
          } catch {
            throw new Error('The Lensline server returned an invalid response. Restart Lensline and try again.');
          }
          if (!tokenResponse.ok) throw new Error(readableError(tokenData, 'Could not create a translation session.'));

          peerConnection = new RTCPeerConnection();
          outboundMicrophoneTrack = mixedSourceStream
            ? mixedSourceStream.getAudioTracks()[0].clone()
            : sourceStream.getAudioTracks()[0].clone();
          peerConnection.addTrack(outboundMicrophoneTrack, new MediaStream([outboundMicrophoneTrack]));
          translatedAudio = new Audio();
          translatedAudio.autoplay = true;
          translatedAudio.muted = true;
          peerConnection.ontrack = ({ streams }) => {
            translatedAudio.srcObject = streams[0];
          };
          peerConnection.onconnectionstatechange = () => {
            if (!running) return;
            if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
              setStatus('Connection lost', false);
            }
          };

          eventChannel = peerConnection.createDataChannel('oai-events');
          eventChannel.onmessage = ({ data }) => {
            let event;
            try { event = JSON.parse(data); } catch { return; }
            if (event.type === 'response.created') {
              activeResponseId = event.response?.id;
              if (paused && activeResponseId) ignoredResponses.add(activeResponseId);
            }
            if (event.type === 'input_audio_buffer.speech_started') {
              turnHasOutput = false;
              clearTimeout(realtimeSpeechTimer);
              realtimeSpeechTimer = setTimeout(() => {
                realtimeSpeechActive = true;
                maybeShowProcessing();
              }, 300);
            }
            if (event.type === 'input_audio_buffer.speech_stopped') {
              clearTimeout(realtimeSpeechTimer);
              realtimeSpeechTimer = undefined;
              realtimeSpeechActive = false;
            }
            if (event.type === 'response.done') handleTranslationResponse(event.response);
            if (event.type === 'error') {
              setProcessing(false);
              errorBox.textContent = readableError(event, 'Translation failed. Stop and restart translation.');
            }
          };

          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);

          const sdpResponse = await translationFetch('https://api.openai.com/v1/realtime/calls', {
            method: 'POST',
            headers: {
              authorization: 'Bearer ' + tokenData.value,
              'content-type': 'application/sdp'
            },
            body: offer.sdp
          }, 'Cannot reach OpenAI for the audio connection. Check your internet connection and VPN, then try again.');

          if (!sdpResponse.ok) throw new Error(readableError(await sdpResponse.text(), 'Could not connect the translation audio session.'));
          await peerConnection.setRemoteDescription({ type: 'answer', sdp: await sdpResponse.text() });
          if (sourceStream.getAudioTracks()[0]?.readyState !== 'live') throw new Error('The selected microphone disconnected. Reconnect it or choose another microphone.');

          running = true;
          paused = false;
          await startMicrophoneMonitor(sourceStream);
          sourceSelect.disabled = true;
          targetSelect.disabled = true;
          translateBothCheckbox.disabled = true;
          inputSourceSelect.disabled = true;
          updateMicrophoneHelp();
          destinationInputs.forEach((input) => { input.disabled = true; });
          startButton.disabled = false;
          pauseButton.disabled = false;
          newSessionButton.disabled = false;
          startButton.dataset.running = 'true';
          startButton.textContent = 'Stop translation';
          updatePauseButton();
          setStatus('Listening', true);
          renderOutput();
          await publishState();
          heartbeatTimer = setInterval(() => {
            if (running && destination === 'meta') publishState();
          }, 2000);
        } catch (error) {
          running = false;
          await cleanup();
          errorBox.textContent = friendlyError(error);
          startButton.disabled = false;
          pauseButton.disabled = true;
          newSessionButton.disabled = false;
          sourceSelect.disabled = false;
          targetSelect.disabled = false;
          translateBothCheckbox.disabled = false;
          inputSourceSelect.disabled = false;
          setMicrophoneControlsLocked(false);
          updateMicrophoneHelp();
          destinationInputs.forEach((input) => { input.disabled = false; });
          startButton.dataset.running = 'false';
          startButton.textContent = 'Start translation';
          paused = false;
          updatePauseButton();
          setStatus('Ready', false);
        }
      }

      function handleTranslationResponse(response) {
        if (!response?.id || handledResponses.has(response.id)) return;
        handledResponses.add(response.id);
        // Bound duplicate tracking for long meetings; completed responses do not recur.
        if (handledResponses.size > 256) handledResponses.delete(handledResponses.values().next().value);
        if (activeResponseId === response.id) activeResponseId = undefined;
        const ignored = ignoredResponses.delete(response.id);
        const canDisplay = running && !paused && !ignored && response.status === 'completed';
        turnHasOutput = true;
        setProcessing(false);
        if (response.status === 'failed') {
          errorBox.textContent = readableError(response.status_details, 'Translation failed. Stop and restart translation.');
        }
        for (const item of response.output || []) {
          const functionCall = item.type === 'function_call' && item.name === 'submit_translation';
          // Some Realtime responses return the requested JSON as final text.
          // Apply exactly the same pair validation; never display raw text/deltas.
          const finalText = item.type === 'message'
            ? (item.content || []).filter((part) => part.type === 'output_text').map((part) => part.text).join('')
            : '';
          if (!functionCall && !finalText) continue;
          let accepted = 0;
          if (canDisplay) {
            try {
              const args = JSON.parse(functionCall ? item.arguments : finalText);
              if (!Array.isArray(args.segments)) throw new Error('Missing translation segments');
              for (const segment of args.segments) {
                const translation = acceptTranslation(segment, selectedPair());
                if (!translation) continue;
                // Convert once in the actual output language, so a later reversal
                // cannot change captions already queued or sent to Meta Display.
                const text = captionText(translation.text, translation.targetLanguage);
                activeOutputLanguage = translation.targetLanguage;
                activeSourceLabel = languageLabels[translation.detectedLanguage] || translation.detectedLanguage;
                receiveDelta(text);
                finalizePartial();
                accepted += 1;
              }
            } catch {
              errorBox.textContent = 'Could not read a translation. Please repeat the phrase.';
            }
          }
          if (functionCall && eventChannel?.readyState === 'open' && item.call_id) {
            eventChannel.send(JSON.stringify({ type: 'conversation.item.create', item: {
              type: 'function_call_output', call_id: item.call_id, output: JSON.stringify({ accepted }),
            } }));
          }
        }
      }

      async function requestMicrophone() {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('This browser does not support microphone capture.');
        }

        const reusableTrack = sourceStream?.getAudioTracks()[0];
        const deviceId = microphoneSelect.value;
        if (!deviceId) throw new Error('Choose a microphone before starting translation.');
        if (reusableTrack?.readyState === 'live' && activeMicrophoneDeviceId === deviceId) {
          reusableTrack.enabled = true;
          microphoneNeedsRecovery = false;
          return sourceStream;
        }

        sourceStream?.getTracks().forEach((track) => { track.onended = null; track.stop(); });
        sourceStream = undefined;
        activeMicrophoneDeviceId = '';
        microphoneNeedsRecovery = false;
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          });
        } catch (error) {
          throw new Error(microphoneCaptureError(error));
        }
        const track = stream.getAudioTracks()[0];
        const actualDeviceId = track?.getSettings().deviceId;
        if (!track || (actualDeviceId && actualDeviceId !== deviceId && !['default', 'communications'].includes(deviceId))) {
          stream.getTracks().forEach((item) => item.stop());
          throw new Error('The browser could not use the selected microphone. Choose your microphone again and retry.');
        }
        activeMicrophoneDeviceId = deviceId;
        track.onended = async () => {
          if (sourceStream !== stream) return;
          if (running) await stopTranslation();
          microphoneHelp.textContent = 'The selected microphone disconnected. Reconnect it or choose another microphone.';
        };
        return stream;
      }

      function microphoneCaptureError(error) {
        if (['NotAllowedError', 'SecurityError'].includes(error?.name)) {
          return 'Microphone access was blocked. Allow microphone access in your browser, then click Find microphones.';
        }
        if (['NotFoundError', 'OverconstrainedError'].includes(error?.name)) {
          return 'The selected microphone is unavailable. Reconnect it or choose another microphone.';
        }
        if (['NotReadableError', 'AbortError'].includes(error?.name)) {
          return 'The microphone could not be opened. Check that it is connected and available, then try again.';
        }
        return readableError(error, 'Could not access the microphone. Check browser permissions and try again.');
      }

      async function requestBrowserTab() {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          throw new Error('Browser-tab audio is unavailable. Open Lensline in Chrome or Edge, or choose Microphone.');
        }

        let stream;
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: { displaySurface: 'browser' },
            audio: { suppressLocalAudioPlayback: false },
            selfBrowserSurface: 'exclude',
            surfaceSwitching: 'include',
            systemAudio: 'include'
          });
        } catch (error) {
          if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
            throw new Error('Browser-tab sharing was canceled or blocked. Choose your meeting tab, enable Share tab audio, and try again.');
          }
          if (error?.name === 'InvalidStateError') {
            throw new Error('The browser could not open the tab picker. Press Start translation again and select your meeting tab.');
          }
          throw new Error('Browser-tab audio could not start. Choose the meeting tab, enable Share tab audio, and try again.');
        }

        if (stream.getAudioTracks().length === 0) {
          stream.getTracks().forEach((track) => track.stop());
          throw new Error('The selected tab was shared without audio. Choose your meeting tab, enable Share tab audio, and try again.');
        }

        return stream;
      }

      async function mixAudioSources(microphoneStream, tabStream) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error('This browser cannot combine tab and microphone audio. Open Lensline in Chrome or Edge, or choose Microphone.');
        }

        mixedAudioContext = new AudioContextClass();
        if (mixedAudioContext.state === 'suspended') {
          await mixedAudioContext.resume();
        }

        const destination = mixedAudioContext.createMediaStreamDestination();
        const compressor = mixedAudioContext.createDynamicsCompressor();
        compressor.threshold.value = -12;
        compressor.knee.value = 12;
        compressor.ratio.value = 4;
        compressor.attack.value = .003;
        compressor.release.value = .25;
        compressor.connect(destination);
        mixedAudioContext.createMediaStreamSource(microphoneStream).connect(compressor);
        mixedAudioContext.createMediaStreamSource(tabStream).connect(compressor);
        return destination.stream;
      }

      function handleBrowserTabEnded() {
        const stream = browserTabStream;
        if (!stream) return;

        browserTabStream = undefined;
        stream.getTracks().forEach((track) => {
          track.onended = null;
          track.stop();
        });

        if (!running) return;
        errorBox.textContent = 'Browser-tab sharing stopped. Translation continues with your microphone. Start a new translation to reconnect the tab.';
        setStatus(paused ? 'Paused' : 'Listening · microphone only', !paused);
      }

      async function releaseBrowserTab() {
        const stream = browserTabStream;
        browserTabStream = undefined;
        stream?.getTracks().forEach((track) => {
          track.onended = null;
          track.stop();
        });

        mixedSourceStream?.getTracks().forEach((track) => track.stop());
        mixedSourceStream = undefined;
        const context = mixedAudioContext;
        mixedAudioContext = undefined;
        if (context && context.state !== 'closed') {
          try { await context.close(); } catch {}
        }
      }

      function releaseMicrophone() {
        void releaseBrowserTab();
        outboundMicrophoneTrack?.stop();
        outboundMicrophoneTrack = undefined;
        sourceStream?.getTracks().forEach((track) => track.stop());
        sourceStream = undefined;
        microphoneNeedsRecovery = false;
      }

      async function startMicrophoneMonitor(stream) {
        await stopMicrophoneMonitor();
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        try {
          audioContext = new AudioContextClass();
          await audioContext.resume();
          microphoneSource = audioContext.createMediaStreamSource(stream);
          microphoneAnalyser = audioContext.createAnalyser();
          microphoneAnalyser.fftSize = 512;
          microphoneAnalyser.smoothingTimeConstant = .35;
          microphoneSource.connect(microphoneAnalyser);
          const samples = new Uint8Array(microphoneAnalyser.fftSize);

          microphoneMonitorTimer = setInterval(() => {
            if (paused) return;
            microphoneAnalyser.getByteTimeDomainData(samples);
            let sum = 0;
            for (const sample of samples) {
              const centered = (sample - 128) / 128;
              sum += centered * centered;
            }
            const level = Math.sqrt(sum / samples.length);
            const now = Date.now();

            if (level >= .012) {
              microphoneQuietSince = 0;
              if (!microphoneSpeechSince) {
                microphoneSpeechSince = now;
                turnHasOutput = false;
              }
              if (!microphoneSpeechActive && now - microphoneSpeechSince >= 300) {
                microphoneSpeechActive = true;
                maybeShowProcessing();
              }
            } else if (microphoneSpeechSince || microphoneSpeechActive) {
              if (!microphoneQuietSince) microphoneQuietSince = now;
              const silenceThreshold = microphoneSpeechActive ? 450 : 180;
              if (now - microphoneQuietSince >= silenceThreshold) {
                microphoneSpeechActive = false;
                microphoneSpeechSince = 0;
                microphoneQuietSince = 0;
                if (turnHasOutput) setProcessing(false);
              }
            }
          }, 80);
        } catch {
          await stopMicrophoneMonitor();
        }
      }

      async function stopMicrophoneMonitor() {
        clearInterval(microphoneMonitorTimer);
        microphoneMonitorTimer = undefined;
        microphoneSource?.disconnect();
        microphoneAnalyser?.disconnect();
        const context = audioContext;
        microphoneSource = undefined;
        microphoneAnalyser = undefined;
        audioContext = undefined;
        microphoneSpeechActive = false;
        microphoneSpeechSince = 0;
        microphoneQuietSince = 0;
        clearTimeout(realtimeSpeechTimer);
        realtimeSpeechTimer = undefined;
        realtimeSpeechActive = false;
        turnHasOutput = false;
        if (context && context.state !== 'closed') {
          try { await context.close(); } catch {}
        }
      }

      function receiveDelta(delta) {
        if (!running || paused) return;
        partial += delta;
        if (destination === 'browser') {
          typingQueue.push(...delta);
          startTypewriter();
        }
        schedulePublish();

        clearTimeout(finalizationTimer);
        const punctuationPause = /[.!?\u3002\uFF01\uFF1F]s*$/.test(partial) ? 500 : 1100;
        finalizationTimer = setTimeout(finalizePartial, punctuationPause);
      }

      function finalizePartial() {
        const text = partial.trim();
        if (!text) return;
        completed.push(text);
        completed = completed.slice(-12);
        partial = '';
        if (destination === 'browser') {
          typingQueue.push(null);
          startTypewriter();
        }
        schedulePublish(true);
      }

      function startTypewriter() {
        if (typingTimer) return;
        typingTimer = setInterval(() => {
          const next = typingQueue.shift();
          if (next === undefined) {
            clearInterval(typingTimer);
            typingTimer = undefined;
            maybeShowProcessing();
            return;
          }

          if (next === null) {
            const text = browserPartial.trim();
            if (text) {
              browserCompleted.push(text);
              browserCompleted = browserCompleted.slice(-12);
            }
            browserPartial = '';
          } else {
            browserPartial += next;
          }

          renderOutput();
        }, 28);
      }

      function renderOutput() {
        const shouldShow = destination === 'browser' && (browserCompleted.length || browserPartial || running);
        captionBox.classList.toggle('visible', shouldShow);
        emptyState.style.display = shouldShow ? 'none' : '';

        if (destination !== 'browser') {
          emptyState.querySelector('strong').textContent = running ? 'Sending to Meta Display' : 'Meta Display is ready';
          emptyState.querySelector('p').textContent = running
            ? 'Translation is live. ' + targetSelect.options[targetSelect.selectedIndex].text + ' captions are visible only in the glasses display Web App.'
            : 'Copy the display URL to your Meta Web App connection, then start translation.';
          return;
        }

        emptyState.querySelector('strong').textContent = 'Captions will appear here';
        emptyState.querySelector('p').textContent = 'Choose both languages and start translation. Captions stream as each phrase is translated.';
        syncCaptionLines();
      }

      function syncCaptionLines() {
        const lines = browserCompleted.map((text) => ({ text, partial: false }));
        if (browserPartial) lines.push({ text: browserPartial, partial: true });
        if (processing) lines.push({ processing: true });

        lines.forEach((line, index) => {
          let node = captionBox.children[index];
          if (!node) {
            node = document.createElement('div');
            captionBox.appendChild(node);
          }
          const className = 'caption-line' + (line.partial ? ' partial' : '') + (line.processing ? ' processing' : '');
          if (node.className !== className) node.className = className;
          if (line.processing) {
            if (node.children.length !== 3) {
              node.innerHTML = '<span class="processing-dot"></span><span class="processing-dot"></span><span class="processing-dot"></span>';
              node.setAttribute('aria-label', 'Processing translation');
            }
          } else {
            node.removeAttribute('aria-label');
            if (node.textContent !== line.text) node.textContent = line.text;
          }
        });

        while (captionBox.children.length > lines.length) {
          captionBox.lastElementChild.remove();
        }

        captionBox.scrollTop = captionBox.scrollHeight;
      }

      function schedulePublish(immediate = false) {
        if (destination !== 'meta') return;
        clearTimeout(publishTimer);
        publishTimer = setTimeout(publishState, immediate ? 0 : 140);
      }

      function setProcessing(value) {
        const next = Boolean(value && running);
        if (processing === next) return;
        processing = next;
        renderOutput();
        if (destination === 'meta') {
          clearTimeout(publishTimer);
          publishState();
        }
      }

      function translationIsWriting() {
        return Boolean(typingTimer || typingQueue.length);
      }

      function maybeShowProcessing() {
        if (!paused && (microphoneSpeechActive || realtimeSpeechActive) && !turnHasOutput && !translationIsWriting()) {
          setProcessing(true);
        }
      }

      function toggleTranslationPause() {
        if (!running || !outboundMicrophoneTrack) return;

        paused = !paused;
        outboundMicrophoneTrack.enabled = !paused;
        if (paused) {
          if (activeResponseId) ignoredResponses.add(activeResponseId);
          clearTimeout(realtimeSpeechTimer);
          realtimeSpeechTimer = undefined;
          realtimeSpeechActive = false;
          microphoneSpeechActive = false;
          microphoneSpeechSince = 0;
          microphoneQuietSince = 0;
          setProcessing(false);
          setStatus('Paused', false);
        } else {
          const microphoneOnly = inputSourceSelect.value === 'browser_tab_and_microphone' && !browserTabStream;
          setStatus(microphoneOnly ? 'Listening · microphone only' : 'Listening', true);
        }

        updatePauseButton();
      }

      function updatePauseButton() {
        const label = paused ? 'Resume translation' : 'Pause translation';
        pauseButton.dataset.paused = String(paused);
        pauseButton.setAttribute('aria-label', label);
        pauseButton.setAttribute('title', label);
      }

      function publishState(force = false) {
        if (!force && destination !== 'meta') return Promise.resolve();
        sequence += 1;
        const sourceLabel = activeSourceLabel;
        pendingPublishBody = JSON.stringify({ sequence, completed, partial, sourceLabel, targetLanguage: activeOutputLanguage, live: running, processing });
        if (publishInFlight) return publishChain;

        publishInFlight = true;
        publishChain = (async () => {
          while (pendingPublishBody) {
            const body = pendingPublishBody;
            pendingPublishBody = '';
            try {
              const response = await fetch('/api/captions/' + room, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body
              });
              if (!response.ok) throw new Error('Display relay returned ' + response.status);
            } catch {
              setStatus('Display reconnecting', false);
            }
          }
        })().finally(() => {
          publishInFlight = false;
        });

        return publishChain;
      }

      async function stopTranslation() {
        finalizePartial();
        processing = false;
        running = false;
        paused = false;
        pauseButton.disabled = true;
        updatePauseButton();
        sourceStream?.getAudioTracks().forEach((track) => { track.enabled = false; });
        if (outboundMicrophoneTrack) outboundMicrophoneTrack.enabled = false;
        setStatus('Stopping', false);
        await publishState();
        await cleanup(true);
        sourceSelect.disabled = false;
        targetSelect.disabled = false;
        translateBothCheckbox.disabled = false;
        inputSourceSelect.disabled = false;
        setMicrophoneControlsLocked(false);
        updateMicrophoneHelp();
        destinationInputs.forEach((input) => { input.disabled = false; });
        startButton.dataset.running = 'false';
        startButton.textContent = 'Start translation';
        setStatus('Stopped', false);
        renderOutput();
      }

      async function cleanup(preserveMicrophone = true) {
        clearTimeout(finalizationTimer);
        clearTimeout(publishTimer);
        clearInterval(heartbeatTimer);
        heartbeatTimer = undefined;
        const hadSourceStream = Boolean(sourceStream);
        const monitorShutdown = stopMicrophoneMonitor();
        const browserTabShutdown = releaseBrowserTab();
        if (eventChannel) eventChannel.onmessage = null;
        eventChannel?.close();
        peerConnection?.getReceivers().forEach((receiver) => receiver.track?.stop());
        outboundMicrophoneTrack?.stop();
        outboundMicrophoneTrack = undefined;
        if (preserveMicrophone && sourceStream?.getAudioTracks()[0]?.readyState === 'live') {
          sourceStream.getAudioTracks().forEach((track) => { track.enabled = false; });
        } else {
          releaseMicrophone();
        }
        translatedAudio?.pause();
        if (translatedAudio) {
          translatedAudio.srcObject = null;
          translatedAudio.removeAttribute('src');
          translatedAudio.load();
        }
        if (peerConnection) {
          peerConnection.ontrack = null;
          peerConnection.onconnectionstatechange = null;
          peerConnection.close();
        }
        await monitorShutdown;
        await browserTabShutdown;
        if (hadSourceStream && !preserveMicrophone) microphoneNeedsRecovery = true;
        activeResponseId = undefined;
        ignoredResponses.clear();
        handledResponses.clear();
        eventChannel = undefined;
        peerConnection = undefined;
        translatedAudio = undefined;
      }

      function setBusy(label) {
        sourceSelect.disabled = true;
        targetSelect.disabled = true;
        translateBothCheckbox.disabled = true;
        inputSourceSelect.disabled = true;
        setMicrophoneControlsLocked(true);
        destinationInputs.forEach((input) => { input.disabled = true; });
        startButton.disabled = true;
        pauseButton.disabled = true;
        newSessionButton.disabled = true;
        startButton.textContent = label;
        setStatus(label.replace('\u2026', ''), false);
      }

      function setStatus(label, live) {
        statusText.textContent = label;
        statusDot.classList.toggle('live', live);
      }

      function readableError(value, fallback) {
        if (value instanceof Error && value.message) return readableError(value.message, fallback);
        if (typeof value === 'string') {
          const text = value.trim();
          if (!text) return fallback;
          try {
            return readableError(JSON.parse(text), text);
          } catch {
            return text === '[object Object]' ? fallback : text;
          }
        }
        if (value && typeof value === 'object') {
          if (value.error) return readableError(value.error, fallback);
          if (value.message) return readableError(value.message, fallback);
        }
        return fallback;
      }

      async function translationFetch(url, options, connectionMessage) {
        try {
          return await fetch(url, options);
        } catch {
          throw new Error(connectionMessage);
        }
      }

      function friendlyError(error) {
        const message = readableError(error, 'Translation could not start. Check the API configuration and try again.');
        if (message.includes('Permission denied') || message.includes('NotAllowedError')) {
          return 'Microphone access was blocked. Allow microphone access in your browser and try again.';
        }
        if (/AVAudioSessionCaptureDevice|capture device|audio input/i.test(message)) {
          return 'The microphone did not reconnect. Disconnect and reconnect the audio device, then press Start translation again.';
        }
        return message.length > 180 ? 'Translation could not start. Check the API configuration and try again.' : message;
      }
    <\/script>
  </body>
</html>`;
