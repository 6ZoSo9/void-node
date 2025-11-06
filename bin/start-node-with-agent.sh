#!/usr/bin/env bash
set -euo pipefail
: "${VOID_AGENT_TOKEN:?missing VOID_AGENT_TOKEN}"
AGENT_TOKEN="${AGENT_TOKEN:-$VOID_AGENT_TOKEN}"
export VOID_AGENT_TOKEN AGENT_TOKEN
echo "[wrapper] VOID=${#VOID_AGENT_TOKEN} AGENT=${#AGENT_TOKEN}" >&2
exec npx --yes tsx src/index.ts
