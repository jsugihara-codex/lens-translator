#!/bin/bash
set -euo pipefail

project_dir="/Users/jsugihara/code/lens-translator"
cd "$project_dir"

export PORT="${PORT:-3001}"
node scripts/start-local.mjs
exec open -a "Google Chrome" "http://127.0.0.1:$PORT"
