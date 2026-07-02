export const E=`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Live speech translation for Meta Ray-Ban Display">
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
      .card-title { margin: 0 0 6px; font-size: 15px; font-weight: 700; }
      .card-note { margin: 0 0 25px; color: var(--muted); font-size: 13px; line-height: 1.5; }

      .field { display: grid; gap: 9px; margin-bottom: 22px; }
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

      .meta-link { display: none; margin-top: 18px; padding: 14px; border: 1px solid var(--line); border-radius: 0; background: #000; }
      .meta-link.visible { display: block; }
      .meta-label { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .09em; }
      .url-row { display: flex; gap: 8px; margin-top: 8px; }
      .url { min-width: 0; flex: 1; padding: 10px; overflow: hidden; border-radius: 0; background: #020a04; color: var(--ink); font: 12px ui-monospace, SFMono-Regular, Menlo, monospace; white-space: nowrap; text-overflow: ellipsis; }
      .copy { flex: none; border: 1px solid var(--line); border-radius: 0; background: transparent; color: var(--ink); cursor: pointer; padding: 0 12px; }

      .stage { position: relative; display: flex; height: 430px; min-height: 430px; overflow: hidden; background: #000; }
      .stage::before { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(56,255,104,.018) 0, rgba(56,255,104,.018) 1px, transparent 1px, transparent 4px); pointer-events: none; }
      .stage-top { position: absolute; z-index: 2; top: 22px; left: 24px; right: 24px; display: flex; justify-content: space-between; align-items: center; }
      .live-state { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 12px; }
      .dot { width: 7px; height: 7px; border-radius: 0; background: #0d4b20; }
      .dot.live { background: var(--lime); box-shadow: 0 0 9px rgba(56,255,104,.65); }
      .route { color: var(--muted); font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; text-transform: uppercase; letter-spacing: .08em; }

      .empty { position: relative; z-index: 1; align-self: center; width: 100%; padding: 40px; text-align: center; color: var(--muted); }
      .empty-icon { width: 50px; height: 50px; display: grid; place-items: center; margin: 0 auto 15px; border: 1px solid var(--line); border-radius: 0; color: var(--ink); }
      .empty strong { display: block; margin-bottom: 7px; color: var(--ink); font-size: 15px; }
      .empty p { max-width: 330px; margin: 0 auto; font-size: 13px; line-height: 1.5; }

      .captions { position: relative; z-index: 1; display: none; width: 100%; height: 100%; padding: 72px 34px 32px; overflow-x: hidden; overflow-y: auto; scrollbar-color: var(--lime) #07170b; scrollbar-width: thin; }
      .captions.visible { display: block; }
      .captions::-webkit-scrollbar { width: 10px; }
      .captions::-webkit-scrollbar-track { background: #07170b; }
      .captions::-webkit-scrollbar-thumb { border: 2px solid #07170b; background: var(--lime); }
      .caption-line { margin-top: 9px; color: #1dbb4a; font-size: 13px; font-weight: 590; line-height: 1.38; letter-spacing: -0.012em; animation: lift .18s ease-out; }
      .caption-line.partial { color: var(--lime); text-shadow: 0 0 10px rgba(56,255,104,.3); }
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
        .field, fieldset, select, .destination, .primary, .meta-link, .url-row { width: 100%; min-width: 0; max-width: 100%; }
        .destination label { min-width: 0; padding: 0 8px; text-align: center; }
        .url-row { flex-direction: column; }
        .url { width: 100%; white-space: normal; overflow-wrap: anywhere; text-overflow: clip; line-height: 1.4; }
        .copy { width: 100%; min-height: 44px; padding: 10px 12px; }
        .privacy { align-items: flex-start; line-height: 1.45; }
        .stage { height: 390px; min-height: 390px; }
        .stage-top { left: 18px; right: 18px; gap: 12px; }
        .route { max-width: 55%; text-align: right; white-space: normal; }
        .empty { padding: 30px 20px; }
        .captions { padding: 68px 20px 24px; }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <header>
        <div class="brand"><span class="mark">L</span><span>Lensline</span></div>
        <div class="target-pill">Always translates to English</div>
      </header>

      <section class="hero">
        <p class="eyebrow">Live speech translation</p>
        <h1>Understand the room<br>as it happens.</h1>
        <p class="lede">Choose the language being spoken, start your MacBook microphone, and send the English captions to your browser or Meta Ray-Ban Display.</p>
      </section>

      <main class="workspace">
        <section class="card controls" aria-label="Translation controls">
          <h2 class="card-title">Session setup</h2>
          <p class="card-note">Audio stays between this browser and OpenAI. Only translated text is sent to the display route.</p>

          <div class="field">
            <label for="source-language">Spoken language</label>
            <select id="source-language">
              <option value="auto">Auto-detect</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="zh">Mandarin Chinese</option>
              <option value="id">Indonesian</option>
              <option value="th">Thai</option>
              <option value="vi">Vietnamese</option>
              <option value="hi">Hindi</option>
              <option value="ar">Arabic</option>
              <option value="ru">Russian</option>
              <option value="nl">Dutch</option>
            </select>
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

          <button id="start" class="primary" type="button">Start translation</button>
          <div id="meta-link" class="meta-link">
            <div class="meta-label">Meta Display Web App URL</div>
            <div class="url-row">
              <div id="display-url" class="url"></div>
              <button id="copy" class="copy" type="button">Copy</button>
            </div>
          </div>
          <div id="error" class="error" role="alert"></div>
          <div class="privacy">\u25CF Microphone access starts only after you press Start.</div>
        </section>

        <section class="card stage" aria-label="Caption output preview">
          <div class="stage-top">
            <div class="live-state"><span id="status-dot" class="dot"></span><span id="status">Ready</span></div>
            <div id="route" class="route">browser output</div>
          </div>
          <div id="empty" class="empty">
            <div class="empty-icon">\u2301</div>
            <strong>Captions will appear here</strong>
            <p>Select a language and begin speaking. English text is streamed as each phrase is translated.</p>
          </div>
          <div id="captions" class="captions" aria-live="polite"></div>
        </section>
      </main>
    </div>

    <script>
      const sourceSelect = document.querySelector('#source-language');
      const destinationInputs = [...document.querySelectorAll('input[name="destination"]')];
      const startButton = document.querySelector('#start');
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
      const displayUrl = new URL('/display', location.origin);
      displayUrl.searchParams.set('room', room);
      displayUrlNode.textContent = displayUrl.toString();

      if (!/^[a-f0-9]{32}$/.test(room)) {
        startButton.disabled = true;
        errorBox.textContent = 'The fixed Meta display room is not configured.';
      }

      let destination = 'browser';
      let running = false;
      let peerConnection;
      let eventChannel;
      let sourceStream;
      let translatedAudio;
      let finalizationTimer;
      let publishTimer;
      let typingTimer;
      let heartbeatTimer;
      let publishChain = Promise.resolve();
      let sequence = 0;
      let completed = [];
      let partial = '';
      let browserCompleted = [];
      let browserPartial = '';
      let typingQueue = [];

      destinationInputs.forEach((input) => input.addEventListener('change', () => {
        destination = document.querySelector('input[name="destination"]:checked').value;
        routeLabel.textContent = destination === 'meta' ? 'meta display output' : 'browser output';
        metaLink.classList.toggle('visible', destination === 'meta');
        renderOutput();
      }));

      copyButton.addEventListener('click', async () => {
        await navigator.clipboard.writeText(displayUrl.toString());
        copyButton.textContent = 'Copied';
        setTimeout(() => { copyButton.textContent = 'Copy'; }, 1400);
      });

      startButton.addEventListener('click', () => running ? stopTranslation() : startTranslation());

      async function startTranslation() {
        setBusy('Connecting\u2026');
        errorBox.textContent = '';
        completed = [];
        partial = '';
        browserCompleted = [];
        browserPartial = '';
        typingQueue = [];
        clearInterval(typingTimer);
        typingTimer = undefined;
        sequence = Date.now();
        renderOutput();

        try {
          const tokenResponse = await fetch('/api/session', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              sourceLanguage: sourceSelect.value,
              targetLanguage: 'en',
              room
            })
          });

          const tokenData = await tokenResponse.json();
          if (!tokenResponse.ok) throw new Error(tokenData.error || 'Could not create a translation session.');

          sourceStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          });

          peerConnection = new RTCPeerConnection();
          peerConnection.addTrack(sourceStream.getAudioTracks()[0], sourceStream);
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
            const event = JSON.parse(data);
            if (event.type === 'session.output_transcript.delta' && event.delta) {
              receiveDelta(event.delta);
            }
          };

          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);

          const sdpResponse = await fetch('https://api.openai.com/v1/realtime/translations/calls', {
            method: 'POST',
            headers: {
              authorization: 'Bearer ' + tokenData.value,
              'content-type': 'application/sdp'
            },
            body: offer.sdp
          });

          if (!sdpResponse.ok) throw new Error(await sdpResponse.text());
          await peerConnection.setRemoteDescription({ type: 'answer', sdp: await sdpResponse.text() });

          running = true;
          sourceSelect.disabled = true;
          destinationInputs.forEach((input) => { input.disabled = true; });
          startButton.disabled = false;
          startButton.dataset.running = 'true';
          startButton.textContent = 'Stop translation';
          setStatus('Listening', true);
          await publishState();
          heartbeatTimer = setInterval(() => {
            if (running && destination === 'meta') publishState();
          }, 2000);
        } catch (error) {
          cleanup();
          errorBox.textContent = friendlyError(error);
          startButton.disabled = false;
          startButton.dataset.running = 'false';
          startButton.textContent = 'Start translation';
          setStatus('Ready', false);
        }
      }

      function receiveDelta(delta) {
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
        emptyState.style.display = shouldShow ? 'none' : 'block';

        if (destination !== 'browser') {
          emptyState.querySelector('strong').textContent = running ? 'Sending to Meta Display' : 'Meta Display is ready';
          emptyState.querySelector('p').textContent = running
            ? 'Translation is live. English captions are visible only in the glasses display Web App.'
            : 'Copy the display URL to your Meta Web App connection, then start translation.';
          return;
        }

        syncCaptionLines();
      }

      function syncCaptionLines() {
        const lines = browserCompleted.map((text) => ({ text, partial: false }));
        if (browserPartial) lines.push({ text: browserPartial, partial: true });

        lines.forEach((line, index) => {
          let node = captionBox.children[index];
          if (!node) {
            node = document.createElement('div');
            captionBox.appendChild(node);
          }
          const className = 'caption-line' + (line.partial ? ' partial' : '');
          if (node.className !== className) node.className = className;
          if (node.textContent !== line.text) node.textContent = line.text;
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

      function publishState() {
        if (destination !== 'meta') return Promise.resolve();
        sequence += 1;
        const sourceLabel = sourceSelect.options[sourceSelect.selectedIndex].text;
        const body = JSON.stringify({ sequence, completed, partial, sourceLabel, live: running });

        publishChain = publishChain.then(async () => {
          const response = await fetch('/api/captions/' + room, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body
          });
          if (!response.ok) throw new Error('Display relay returned ' + response.status);
        }).catch(() => {
          setStatus('Display reconnecting', false);
        });

        return publishChain;
      }

      async function stopTranslation() {
        finalizePartial();
        running = false;
        await publishState();
        cleanup();
        sourceSelect.disabled = false;
        destinationInputs.forEach((input) => { input.disabled = false; });
        startButton.dataset.running = 'false';
        startButton.textContent = 'Start translation';
        setStatus('Stopped', false);
        renderOutput();
      }

      function cleanup() {
        clearTimeout(finalizationTimer);
        clearTimeout(publishTimer);
        clearInterval(heartbeatTimer);
        heartbeatTimer = undefined;
        eventChannel?.close();
        peerConnection?.close();
        sourceStream?.getTracks().forEach((track) => track.stop());
        translatedAudio?.pause();
        if (translatedAudio) translatedAudio.srcObject = null;
        eventChannel = undefined;
        peerConnection = undefined;
        sourceStream = undefined;
        translatedAudio = undefined;
      }

      function setBusy(label) {
        startButton.disabled = true;
        startButton.textContent = label;
        setStatus(label.replace('\u2026', ''), false);
      }

      function setStatus(label, live) {
        statusText.textContent = label;
        statusDot.classList.toggle('live', live);
      }

      function friendlyError(error) {
        const message = String(error?.message || error);
        if (message.includes('Permission denied') || message.includes('NotAllowedError')) {
          return 'Microphone access was blocked. Allow microphone access in your browser and try again.';
        }
        return message.length > 180 ? 'Translation could not start. Check the API configuration and try again.' : message;
      }
    <\/script>
  </body>
</html>`;
