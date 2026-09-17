# Lensline for Vercel

Lensline is a live meeting translation web app designed for a MacBook controller and the Meta Ray-Ban Display Web App. The Mac browser captures either microphone audio alone or browser-tab and microphone audio together, streams it to OpenAI Realtime Translation, and displays captions in the selected translation language either in the browser or on the glasses.

## Routes

- `/` — Mac capture controller with spoken-language, translated-language, audio-input, and display selectors.
- `/display?room=<session-id>` — 600×600 caption-only view for the Meta Ray-Ban Display Web App.
- `/api/session` — creates a short-lived Realtime browser secret for the selected language pair.
- `/api/captions/<session-id>` — relays translated text to the display route using Redis.

When **This browser** is selected, captions appear only on the capture page. When **Meta Display** is selected, the capture page shows controls and status but sends caption text to the dedicated display route.

## Run the translator locally with the hosted Meta Display

The translator can run on the Mac while the Meta Display remains on Vercel. This keeps the OpenAI request on the local network and sends only translated text to the hosted display.

Set these local environment variables, using the relay token configured on the hosted Meta Display:

```text
OPENAI_API_KEY=your_openai_api_key
META_DISPLAY_ORIGIN=https://lens-translator.vercel.app
LENSLINE_RELAY_TOKEN=the_same_long_random_value_used_in_vercel
```

Start Lensline locally (use port 3001 if another app is already using 3000):

```sh
PORT=3001 npm run dev
```

The default local controller access code is `lensline`. Setting `ACCESS_CODE` in the environment overrides it.

For a persistent local server, double-click `Start Lensline.command` (or run `PORT=3001 node scripts/start-local.mjs`). The launcher waits for health checks and keeps the server running after its terminal closes. Local server logs are stored in the ignored `.local/server-3001.log` file. `npm run dev` remains a foreground development command.

The local server authenticates to `POST /api/display-ingest` on the hosted Lens Translator app and forwards the current caption state into its native display room. The relay token is never included in browser JavaScript. The controller's Meta Display link points to `https://lens-translator.vercel.app/display` automatically.

## Deploy to Vercel

1. Create a private Git repository containing this project and import it into Vercel.
2. Add an Upstash Redis database from the Vercel Marketplace, or attach an existing Upstash database.
3. Add the environment variables below to the Vercel project for Production, Preview, and Development as appropriate.
4. Deploy. Vercel does not need a framework preset or custom build command for this Edge Function project.
5. Confirm that Vercel Deployment Protection is disabled for the production domain. Lensline provides its own controller sign-in.

You can also deploy from a Mac after installing the Vercel CLI:

```sh
npm install -g vercel
vercel
vercel --prod
```

## Environment variables

Set `OPENAI_API_KEY` as a server-side environment variable. Never expose the standard API key in browser code. The browser receives only a short-lived client secret from `/api/session`.

Set `ACCESS_CODE` and `ACCESS_SESSION_SECRET` as protected server-side environment variables. The controller requires the code and receives a signed, HttpOnly, Secure, SameSite cookie for 12 hours. The display route and caption reads remain public so Meta Ray-Ban Display can load them without an interactive login. Caption publishing and Realtime session creation require the signed controller session.

Set `DISPLAY_ROOM_ID` to one fixed, random, lowercase 32-character hexadecimal value. The controller uses it for every session so the Meta Web App URL remains stable across browser restarts, devices, and cleared browser storage. Generate one with `openssl rand -hex 16`, store it only in Vercel, and keep using the production domain rather than a per-deployment preview URL.

Generate the session secret with:

```sh
openssl rand -hex 32
```

Configure Redis with either of these environment-variable pairs:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

or the Vercel KV-compatible names:

```text
KV_REST_API_URL
KV_REST_API_TOKEN
```

Redis stores only temporary translated caption state and hashed rate-limit identifiers. Captions expire after six hours and failed-code records expire after ten minutes. Audio is never stored by this app.

Never prefix secrets with `NEXT_PUBLIC_`, and never commit `.env` files. If an API key has been pasted into chat, source code, logs, or another shared location, revoke it and deploy a new key.

## Validate locally

```sh
npm run build
npm test
npm run validate
```

The tests validate the controller gate, secure session cookie, protected API routes, public glasses display, public caption reads, and access-code lockout.

## Product notes

- Select **Minimize setup** or the expand icon beside the caption output to give captions the full window. **Expand setup** or the restore icon returns to the normal layout. Start/stop, pause, and new-session controls remain visible, and changing the layout preserves the running session and language selections.

- Choose two different **Spoken language** and **Translated language** values. Leave **Translate both languages** unchecked for spoken → translated only, or check it to detect either selected language and translate into the other. Other languages are ignored. Mandarin and Traditional Chinese cannot be paired because they are the same spoken language.
- The input-source picker supports microphone-only capture or a shared browser tab combined with the microphone. For tab capture, choose the meeting tab and enable **Share tab audio** in Chrome or Edge.
- Select a named **Microphone** before starting either input mode. If devices are hidden, click **Find microphones** and allow access; the temporary permission stream is immediately released after listing devices. Stop translation to change microphones. Lensline requests the selected device explicitly and reports a missing or disconnected microphone instead of silently choosing another.
- The pause control suspends translation without closing the existing session or stopping microphone and browser-tab capture; select it again to resume immediately.
- If browser-tab sharing stops during translation, the microphone remains active and Lensline displays a warning.
- Choose a translated language: English (default), Spanish, French, German, Italian, Portuguese, Japanese, Korean, Mandarin Chinese, Indonesian, Vietnamese, Hindi, Russian, Traditional Chinese (Taiwan), Thai, Arabic, or Dutch. Both language selectors and the two-way checkbox are locked while connecting, translating, or paused; stop translation to change them. Changing either language or translation mode clears previous captions.
- Both modes use a text-only `gpt-realtime` interpreter with constrained function output. Each completed utterance is checked against the selected direction(s) before captions appear. Language recognition is model-based and can be uncertain for short or mixed speech; uncertain speech is instructed to be skipped. Captions appear after a spoken pause rather than streaming unvalidated translation tokens.
- Browser and Meta Display retain translations from both directions; the relay carries the most recent output language. Taiwan output is converted locally before it enters caption history.
- Audio is sent from the Mac browser to OpenAI. Only translated text is relayed to the Meta Display route.
- The display room identifier is configured once in Vercel so the glasses URL remains stable across controller sessions and browser changes.
- Both interfaces use a black-and-phosphor-green terminal-inspired visual system.
- Vercel must be able to reach OpenAI and Upstash from the deployment region. Moving hosts does not bypass OpenAI regional availability requirements for the Mac browser establishing the Realtime connection.


## Traditional Chinese for Taiwan

Choose **Traditional Chinese (Taiwan)** for Taiwan-style Traditional Chinese captions. Lensline requests Mandarin (`zh`) translation, then applies the bundled OpenCC `cn` → `twp` converter to accumulated caption text, including Taiwan terminology, before rendering and relaying it. The selection is stored as `zh-Hant-TW`; the API receives its supported `zh` code. This changes the written captions, not the spoken output into Taiwanese Hokkien.

The OpenCC 1.4.2 browser bundle and dictionary are served locally from `/assets/opencc-cn2t-1.4.2.js`, with no third-party CDN or network conversion service. The vendored asset includes its MIT and Apache-2.0 licenses and package provenance in `worker/vendor/opencc-cn2t.js`.
