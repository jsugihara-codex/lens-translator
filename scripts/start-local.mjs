import { spawn } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const port = Number(process.env.PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a number between 1 and 65535.");
}
const appUrl = `http://127.0.0.1:${port}`;
const localEnv = join(projectDir, ".env.local");
const sharedEnv = "/Users/jsugihara/Documents/Codex/2026-07-14/build/.env.local";

async function isReady() {
  try {
    const response = await fetch(`${appUrl}/health`, { signal: AbortSignal.timeout(1000) });
    return response.ok && (await response.json()).ok === true;
  } catch {
    return false;
  }
}

if (await isReady()) {
  console.log(`Lensline is already running at ${appUrl}`);
} else {
  const logDir = join(projectDir, ".local");
  mkdirSync(logDir, { recursive: true, mode: 0o700 });
  const logPath = join(logDir, `server-${port}.log`);
  const log = openSync(logPath, "a", 0o600);
  const envFile = existsSync(localEnv) ? localEnv : existsSync(sharedEnv) ? sharedEnv : null;
  const args = [...(envFile ? [`--env-file=${envFile}`] : []), "scripts/local-server.mjs"];
  const child = spawn(process.execPath, args, {
    cwd: projectDir,
    detached: true,
    stdio: ["ignore", log, log],
    env: {
      ...process.env,
      PORT: String(port),
      ...(!existsSync(localEnv) && envFile === sharedEnv
        ? { META_DISPLAY_ORIGIN: process.env.META_DISPLAY_ORIGIN || "https://lens-translator.vercel.app" }
        : {}),
    },
  });
  closeSync(log);
  child.unref();
  let startupError;
  child.on("error", (error) => { startupError = error; });
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (startupError) throw startupError;
    if (await isReady()) {
      ready = true;
      break;
    }
    if (child.exitCode !== null) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) {
    throw new Error(`Lensline did not start at ${appUrl}. Check ${logPath}`);
  }
  console.log(`Lensline is running at ${appUrl}`);
  console.log(`Server log: ${logPath}`);
}
