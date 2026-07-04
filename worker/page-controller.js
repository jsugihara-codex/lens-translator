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

      .session-actions { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; }
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
        .field, fieldset, select, .destination, .session-actions, .primary, .meta-link, .url-row { width: 100%; min-width: 0; max-width: 100%; }
        .session-actions { grid-template-columns: 1fr; }
        .secondary { width: 100%; }
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

          <div class="session-actions">
            <button id="start" class="primary" type="button">Start translation</button>
            <button id="new-session" class="secondary" type="button">New session</button>
          </div>
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
      const displayUrl = new URL('/display', location.origin);
      displayUrl.searchParams.set('room', room);
      displayUrlNode.textContent = displayUrl.toString();

      if (!/^[a-f0-9]{32}$/.test(room)) {
        startButton.disabled = true;
        newSessionButton.disabled = true;
        errorBox.textContent = 'The fixed Meta display room is not configured.';
      }

      let destination = 'browser';
      let running = false;
      let peerConnection;
      let eventChannel;
      let sourceStream;
      let outboundMicrophoneTrack;
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

      copyButton.addEventListener('click', async () => {
        await navigator.clipboard.writeText(displayUrl.toString());
        copyButton.textContent = 'Copied';
        setTimeout(() => { copyButton.textContent = 'Copy'; }, 1400);
      });

      startButton.addEventListener('click', () => running ? stopTranslation() : startTranslation());
      newSessionButton.addEventListener('click', startNewSession);
      window.addEventListener('pagehide', releaseMicrophone);

      function resetTranscript() {
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
        errorBox.textContent = '';

        running = false;
        await cleanup();
        sourceSelect.disabled = false;
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
        setBusy('Connecting\u2026');
        errorBox.textContent = '';
        resetTranscript();
        sequence = Date.now();

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
          if (!tokenResponse.ok) throw new Error(readableError(tokenData, 'Could not create a translation session.'));

          sourceStream = await requestMicrophone();
          microphoneNeedsRecovery = false;

          peerConnection = new RTCPeerConnection();
          outboundMicrophoneTrack = sourceStream.getAudioTracks()[0].clone();
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
            const event = JSON.parse(data);
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
            if (event.type === 'session.output_transcript.delta' && event.delta) {
              turnHasOutput = true;
              setProcessing(false);
              receiveDelta(event.delta);
            }
            if (event.type === 'session.output_transcript.done' || event.type === 'error') {
              setProcessing(false);
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

          if (!sdpResponse.ok) throw new Error(readableError(await sdpResponse.text(), 'Could not connect the translation audio session.'));
          await peerConnection.setRemoteDescription({ type: 'answer', sdp: await sdpResponse.text() });

          running = true;
          await startMicrophoneMonitor(sourceStream);
          sourceSelect.disabled = true;
          destinationInputs.forEach((input) => { input.disabled = true; });
          startButton.disabled = false;
          newSessionButton.disabled = false;
          startButton.dataset.running = 'true';
          startButton.textContent = 'Stop translation';
          setStatus('Listening', true);
          await publishState();
          heartbeatTimer = setInterval(() => {
            if (running && destination === 'meta') publishState();
          }, 2000);
        } catch (error) {
          await cleanup();
          errorBox.textContent = friendlyError(error);
          startButton.disabled = false;
          newSessionButton.disabled = false;
          startButton.dataset.running = 'false';
          startButton.textContent = 'Start translation';
          setStatus('Ready', false);
        }
      }

      async function requestMicrophone() {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('This browser does not support microphone capture.');
        }

        const reusableTrack = sourceStream?.getAudioTracks()[0];
        if (reusableTrack?.readyState === 'live') {
          reusableTrack.enabled = true;
          microphoneNeedsRecovery = false;
          return sourceStream;
        }

        sourceStream = undefined;
        microphoneNeedsRecovery = false;
        return navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
      }

      function releaseMicrophone() {
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
        if (!running) return;
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
        emptyState.style.display = shouldShow ? 'none' : 'block';

        if (destination !== 'browser') {
          emptyState.querySelector('strong').textContent = running ? 'Sending to Meta Display' : 'Meta Display is ready';
          emptyState.querySelector('p').textContent = running
            ? 'Translation is live. English captions are visible only in the glasses display Web App.'
            : 'Copy the display URL to your Meta Web App connection, then start translation.';
          return;
        }

        emptyState.querySelector('strong').textContent = 'Captions will appear here';
        emptyState.querySelector('p').textContent = 'Select a language and begin speaking. English text is streamed as each phrase is translated.';
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
        if ((microphoneSpeechActive || realtimeSpeechActive) && !turnHasOutput && !translationIsWriting()) {
          setProcessing(true);
        }
      }

      function publishState(force = false) {
        if (!force && destination !== 'meta') return Promise.resolve();
        sequence += 1;
        const sourceLabel = sourceSelect.options[sourceSelect.selectedIndex].text;
        const body = JSON.stringify({ sequence, completed, partial, sourceLabel, live: running, processing });

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
        processing = false;
        running = false;
        sourceStream?.getAudioTracks().forEach((track) => { track.enabled = false; });
        if (outboundMicrophoneTrack) outboundMicrophoneTrack.enabled = false;
        setStatus('Stopping', false);
        await publishState();
        await cleanup(true);
        sourceSelect.disabled = false;
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
        if (hadSourceStream && !preserveMicrophone) microphoneNeedsRecovery = true;
        eventChannel = undefined;
        peerConnection = undefined;
        translatedAudio = undefined;
      }

      function setBusy(label) {
        startButton.disabled = true;
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
