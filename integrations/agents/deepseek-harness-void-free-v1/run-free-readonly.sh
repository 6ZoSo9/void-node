#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DEEPSEEK_HARNESS_VOID_FREE_V1"
DSH_VERSION="0.1.1-rc.2"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
VOID_REPO="$(cd -- "$SCRIPT_DIR/../../.." && pwd -P)"
PATCH="$SCRIPT_DIR/void-free-readonly.cordis.yml"
MCP_ENTRY="$VOID_REPO/integrations/mcp/dist/src/stdio.js"
LOCAL_MODEL_BASE="${VOID_DSH_LOCAL_MODEL_BASE_URL:-http://127.0.0.1:11434/v1}"
LOCAL_MODEL_ID="${VOID_DSH_LOCAL_MODEL_ID:-deepseek-r1:7b}"
VOID_BASE="${VOID_DSH_VOID_BASE_URL:-https://zoso-alienware-aurora-r7.taila47fd.ts.net}"
TASK="${*:-Use the void-network MCP tools to inspect VOID Mainnet-0 discovery, capability status, and paid-work availability. Report only observed truth. Do not mutate anything.}"

printf '=== %s ===\n' "$MARKER"
printf 'dsh_version=%s\n' "$DSH_VERSION"
printf 'void_repo=%s\n' "$VOID_REPO"
printf 'local_model_base=%s\n' "$LOCAL_MODEL_BASE"
printf 'local_model_id=%s\n' "$LOCAL_MODEL_ID"
printf 'void_base=%s\n' "$VOID_BASE"
printf 'paid_api_allowed=false\n'
printf 'telemetry_allowed=false\n'
printf 'void_submit_allowed=false\n'
printf 'workspace_mutation_allowed=false\n'

[[ -f "$PATCH" ]] || {
  echo "HOLD: missing Harness overlay: $PATCH" >&2
  exit 2
}

[[ -f "$MCP_ENTRY" ]] || {
  echo "HOLD: existing VOID MCP bridge is not built: $MCP_ENTRY" >&2
  echo "Run: npm --prefix integrations/mcp ci --ignore-scripts && npm --prefix integrations/mcp run build" >&2
  exit 2
}

command -v node >/dev/null 2>&1 || {
  echo "HOLD: node is required" >&2
  exit 2
}
command -v npm >/dev/null 2>&1 || {
  echo "HOLD: npm/npx is required for the pinned Harness package" >&2
  exit 2
}
command -v curl >/dev/null 2>&1 || {
  echo "HOLD: curl is required for read-only preflight" >&2
  exit 2
}

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [[ "$NODE_MAJOR" -lt 22 || "$NODE_MAJOR" -eq 23 ]]; then
  echo "HOLD: DeepSeek Harness requires Node 22.19+ or Node 24+; current=$(node --version)" >&2
  exit 2
fi
if [[ "$NODE_MAJOR" -eq 22 ]]; then
  NODE_MINOR="$(node -p 'Number(process.versions.node.split(".")[1])')"
  if [[ "$NODE_MINOR" -lt 19 ]]; then
    echo "HOLD: DeepSeek Harness requires Node 22.19+; current=$(node --version)" >&2
    exit 2
  fi
fi

node - "$LOCAL_MODEL_BASE" <<'NODE'
const raw = process.argv[2];
let url;
try { url = new URL(raw); } catch { process.exit(20); }
const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
const loopback = host === '127.0.0.1' || host === 'localhost' || host === '::1';
if (!loopback) process.exit(21);
if (!['http:', 'https:'].includes(url.protocol)) process.exit(22);
if (url.username || url.password || url.search || url.hash) process.exit(23);
if (url.pathname !== '/v1' && url.pathname !== '/v1/') process.exit(24);
NODE
case "$?" in
  0) ;;
  20) echo "HOLD: local model base is not a valid URL" >&2; exit 2 ;;
  21) echo "HOLD: free-only model base must remain loopback" >&2; exit 2 ;;
  22) echo "HOLD: local model base must use http/https" >&2; exit 2 ;;
  23) echo "HOLD: local model base cannot contain credentials/query/fragment" >&2; exit 2 ;;
  24) echo "HOLD: local model base must end at /v1" >&2; exit 2 ;;
  *) echo "HOLD: local model URL validation failed" >&2; exit 2 ;;
esac

MODEL_TMP="$(mktemp)"
DISCOVERY_TMP="$(mktemp)"
DSH_HOME_TMP="$(mktemp -d "${TMPDIR:-/tmp}/void-dsh-free-v1.XXXXXX")"
cleanup() {
  rm -f -- "$MODEL_TMP" "$DISCOVERY_TMP"
  rm -rf -- "$DSH_HOME_TMP"
}
trap cleanup EXIT
chmod 700 "$DSH_HOME_TMP"

curl -fsS --connect-timeout 3 --max-time 10 \
  "${LOCAL_MODEL_BASE%/}/models" \
  -o "$MODEL_TMP" || {
    echo "HOLD: loopback model server is unavailable at ${LOCAL_MODEL_BASE%/}/models" >&2
    exit 2
  }

node - "$MODEL_TMP" "$LOCAL_MODEL_ID" <<'NODE'
const fs = require('node:fs');
const file = process.argv[2];
const wanted = process.argv[3];
let parsed;
try { parsed = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { process.exit(30); }
const ids = Array.isArray(parsed?.data)
  ? parsed.data.map((item) => item?.id).filter((id) => typeof id === 'string')
  : [];
if (!ids.includes(wanted)) {
  console.error(`available_models=${ids.join(',') || 'none'}`);
  process.exit(31);
}
NODE
case "$?" in
  0) echo "local_model_preflight=true" ;;
  30) echo "HOLD: local model /models response is not valid JSON" >&2; exit 2 ;;
  31) echo "HOLD: requested local model is not loaded: $LOCAL_MODEL_ID" >&2; exit 2 ;;
  *) echo "HOLD: local model preflight failed" >&2; exit 2 ;;
esac

node - "$VOID_BASE" <<'NODE'
const raw = process.argv[2];
let url;
try { url = new URL(raw); } catch { process.exit(40); }
const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
const loopback = host === '127.0.0.1' || host === 'localhost' || host === '::1';
if (url.username || url.password || url.search || url.hash) process.exit(41);
if (!(url.protocol === 'https:' || (url.protocol === 'http:' && loopback))) process.exit(42);
if (url.pathname !== '/' && url.pathname !== '') process.exit(43);
NODE
case "$?" in
  0) ;;
  40) echo "HOLD: VOID agent gateway is not a valid URL" >&2; exit 2 ;;
  41) echo "HOLD: VOID gateway cannot contain credentials/query/fragment" >&2; exit 2 ;;
  42) echo "HOLD: VOID clearweb agent gateway must use HTTPS" >&2; exit 2 ;;
  43) echo "HOLD: VOID gateway must be an origin without a path" >&2; exit 2 ;;
  *) echo "HOLD: VOID gateway validation failed" >&2; exit 2 ;;
esac

curl -fsS --connect-timeout 5 --max-time 15 \
  "${VOID_BASE%/}/.well-known/void-agent-discovery.json" \
  -o "$DISCOVERY_TMP" || {
    echo "HOLD: VOID agent discovery is unavailable at the selected gateway" >&2
    exit 2
  }

node - "$DISCOVERY_TMP" <<'NODE'
const fs = require('node:fs');
let body;
try { body = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); } catch { process.exit(50); }
if (body?.marker !== 'VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1') process.exit(51);
NODE
case "$?" in
  0) echo "void_agent_gateway_preflight=true" ;;
  50) echo "HOLD: VOID discovery response is not valid JSON" >&2; exit 2 ;;
  51) echo "HOLD: selected VOID origin is not the canonical AI-agent gateway" >&2; exit 2 ;;
  *) echo "HOLD: VOID discovery preflight failed" >&2; exit 2 ;;
esac

# Remove the usual metered-provider credential surfaces from the child process.
# The fresh DSH_HOME also prevents managed credential files from entering this run.
unset \
  DEEPSEEK_API_KEY \
  OPENAI_API_KEY \
  ANTHROPIC_API_KEY \
  GOOGLE_API_KEY \
  GEMINI_API_KEY \
  XAI_API_KEY \
  GROQ_API_KEY \
  OPENROUTER_API_KEY \
  MISTRAL_API_KEY \
  COHERE_API_KEY \
  AZURE_OPENAI_API_KEY \
  AWS_ACCESS_KEY_ID \
  AWS_SECRET_ACCESS_KEY \
  AWS_SESSION_TOKEN \
  AWS_PROFILE \
  AWS_DEFAULT_PROFILE || true

export DSH_HOME="$DSH_HOME_TMP"
export DSH_TELEMETRY_DISABLED=1
export DSH_PERMISSION_MODE=read-only
export DSH_TOOLS_MODE=native
export VOID_DSH_LOCAL_MODEL_BASE_URL="$LOCAL_MODEL_BASE"
export VOID_DSH_LOCAL_MODEL_ID="$LOCAL_MODEL_ID"
export VOID_DSH_MCP_ENTRYPOINT="$MCP_ENTRY"
export VOID_DSH_VOID_REPO_ROOT="$VOID_REPO"
export VOID_DSH_VOID_BASE_URL="$VOID_BASE"

printf 'isolated_dsh_home=true\n'
printf 'paid_provider_env_scrubbed=true\n'
printf 'void_mcp_allow_submit=0\n'
printf 'starting_worker=true\n'

npx --yes "@deepseek-ai/dsh@${DSH_VERSION}" \
  --profile headless \
  --patch "$PATCH" \
  "$TASK"
