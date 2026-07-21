import http from "node:http";
import handler from "../api/index.js";
import {
  createMetaDisplayRelay,
  getMetaDisplayRelayConfig,
} from "./meta-display-relay.mjs";

const port = Number(process.env.PORT || 3000);

process.env.ACCESS_CODE ||= "local";
process.env.ACCESS_SESSION_SECRET ||= "lensline-local-development-session-secret";

const metaDisplayRelay = getMetaDisplayRelayConfig();
const relayPublisher = createMetaDisplayRelay(metaDisplayRelay);

const server = http.createServer(async (incoming, outgoing) => {
  try {
    const url = `http://${incoming.headers.host || `localhost:${port}`}${incoming.url || "/"}`;
    const method = incoming.method || "GET";
    const request = new Request(url, {
      method,
      headers: incoming.headers,
      body: method === "GET" || method === "HEAD" ? undefined : incoming,
      duplex: "half",
    });
    const response = await handler(request);

    if (
      metaDisplayRelay &&
      method === "POST" &&
      /^\/api\/captions\/[a-f0-9]{32}$/.test(new URL(url).pathname) &&
      response.ok
    ) {
      void response.clone().json().then(
        (state) => relayPublisher.enqueue(state),
        (error) => console.error("Hosted Meta Display relay skipped invalid local state:", error.message)
      );
    }

    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error("Lensline request failed:", error);
    outgoing.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    outgoing.end("Lensline local server error");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Lensline is running at http://localhost:${port}`);
  console.log(`Local access code: ${process.env.ACCESS_CODE}`);
  console.log(
    metaDisplayRelay
      ? `Meta Display relay: ${metaDisplayRelay.endpoint.origin}/display`
      : "Meta Display relay: local display only"
  );
  if (!process.env.OPENAI_API_KEY) {
    console.log("Live translation needs OPENAI_API_KEY in .env.local");
  }
});
