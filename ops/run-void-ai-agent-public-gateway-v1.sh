#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

export VOID_REPO_ROOT="${VOID_REPO_ROOT:-$ROOT}"
export VOID_AI_AGENT_PUBLIC_GATEWAY_HOST="${VOID_AI_AGENT_PUBLIC_GATEWAY_HOST:-127.0.0.1}"
export VOID_AI_AGENT_PUBLIC_GATEWAY_PORT="${VOID_AI_AGENT_PUBLIC_GATEWAY_PORT:-4112}"

exec node "$ROOT/ops/void-ai-agent-public-gateway-v1.mjs"
