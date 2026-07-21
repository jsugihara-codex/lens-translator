#!/bin/bash
set -euo pipefail

project_dir="/Users/jsugihara/code/lens-translator"
cd "$project_dir"

port="${PORT:-3001}"
shared_env="/Users/jsugihara/Documents/Codex/2026-07-14/build/.env.local"
printf '%s\n' "Starting Lensline from $project_dir"
printf '%s\n' "Opening http://localhost:$port"

( sleep 1; open "http://localhost:$port" ) &
if [[ ! -f "$project_dir/.env.local" && -f "$shared_env" ]]; then
  printf '%s\n' "Using the configured local Meta Display environment"
  exec env PORT="$port" META_DISPLAY_ORIGIN="https://lens-translator.vercel.app" node --env-file="$shared_env" scripts/local-server.mjs
fi

exec env PORT="$port" npm run dev
