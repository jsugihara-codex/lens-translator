# Lensline for Vercel

Lensline is a live meeting translation web app designed for a MacBook controller and the Meta Ray-Ban Display Web App. The Mac browser captures microphone audio, streams it to OpenAI Realtime Translation, and displays English captions either in the browser or on the glasses.

## Routes

- `/` — Mac capture controller with the source-language picker and output selector.
- `/display?room=<session-id>` — 600×600 caption-only view for the Meta Ray-Ban Display Web App.
- `/api/session` — creates a short-lived Realtime Translation browser secret.
- `/api/captions/<session-id>` — relays translated text to the display route using Redis.

When **This browser** is selected, captions appear only on the capture page. When **Meta Display** is selected, the capture page shows controls and status but sends caption text to the dedicated display route.

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

Redis stores only temporary English caption state and hashed rate-limit identifiers. Captions expire after six hours and failed-code records expire after ten minutes. Audio is never stored by this app.

Never prefix secrets with `NEXT_PUBLIC_`, and never commit `.env` files. If an API key has been pasted into chat, source code, logs, or another shared location, revoke it and deploy a new key.

## Validate locally

```sh
npm run build
npm test
npm run validate
```

The tests validate the controller gate, secure session cookie, protected API routes, public glasses display, public caption reads, and access-code lockout.

## Product notes

- The source-language picker labels the meeting language; the translation model handles source-language recognition.
- The target is fixed to English.
- Audio is sent from the Mac browser to OpenAI. Only translated text is relayed to the Meta Display route.
- The display room identifier is configured once in Vercel so the glasses URL remains stable across controller sessions and browser changes.
- Both interfaces use a black-and-phosphor-green terminal-inspired visual system.
- Vercel must be able to reach OpenAI and Upstash from the deployment region. Moving hosts does not bypass OpenAI regional availability requirements for the Mac browser establishing the Realtime connection.
