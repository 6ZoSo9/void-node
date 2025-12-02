#!/usr/bin/env bash
set -euo pipefail

# Planning-only RUN status helper.
# - Reads LIVE config JSON.
# - Best-effort RPC chainId sanity.
# - Best-effort local state summary (if *.state.json exists).
# - On-chain sentinel view is STUB for now (design only).

ROOT="${ROOT:-$HOME/dev/void-node}"
cd "$ROOT"

CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"
STATE_PATH="${STATE_PATH:-config/void-mainnet-bootstrap-mainnet.state.json}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

ts() {
  date -Is
}

echo "[$(ts)] === [mainnet-run status] VOID mainnet bootstrap RUN status (planning-only) ==="
echo "[$(ts)] ROOT        = $ROOT"
echo "[$(ts)] CONFIG_PATH = $CONFIG_PATH"
echo "[$(ts)] STATE_PATH  = $STATE_PATH"
echo "[$(ts)] RPC_URL     = $RPC_URL"
echo

cfg_chain_id="UNKNOWN"
runtime_chain_id="UNKNOWN"
rc=0

echo "[$(ts)] --- [step 1] chainId sanity ---"

if [[ -f "$CONFIG_PATH" ]]; then
  cfg_chain_id="$(jq -r '.chainId // "UNKNOWN"' "$CONFIG_PATH" 2>/dev/null || echo "ERROR")"
  echo "[$(ts)] config.chainId = $cfg_chain_id"
else
  echo "[$(ts)] WARN: LIVE config not found at $CONFIG_PATH"
  cfg_chain_id="MISSING"
  rc=1
fi

runtime_chain_id="$(cast chain-id --rpc-url "$RPC_URL" 2>/dev/null || echo "ERROR")"
if [[ "$runtime_chain_id" == "ERROR" ]]; then
  echo "[$(ts)] WARN: cast chain-id failed against $RPC_URL"
  rc=1
else
  echo "[$(ts)] RPC chainId    = $runtime_chain_id"
fi

if [[ "$cfg_chain_id" != "UNKNOWN" && "$cfg_chain_id" != "MISSING" && "$cfg_chain_id" != "ERROR" && "$runtime_chain_id" != "ERROR" ]]; then
  if [[ "$cfg_chain_id" != "$runtime_chain_id" ]]; then
    echo "[$(ts)] ERR: config.chainId != RPC chainId (mismatch)"
    rc=1
  else
    echo "[$(ts)] OK: config.chainId matches RPC chainId"
  fi
fi

echo
echo "[$(ts)] --- [step 2] local RUN state file ---"

state_status="UNKNOWN"
state_live_cfg=""
state_live_hash=""
state_plan_version=""
state_started_at=""
state_completed_at=""

if [[ -f "$STATE_PATH" ]]; then
  state_status="$(jq -r '.status // "UNKNOWN"' "$STATE_PATH" 2>/dev/null || echo "UNKNOWN")"
  state_live_cfg="$(jq -r '.liveConfigPath // ""' "$STATE_PATH" 2>/dev/null || echo "")"
  state_live_hash="$(jq -r '.liveConfigHash // ""' "$STATE_PATH" 2>/dev/null || echo "")"
  state_plan_version="$(jq -r '.planVersion // ""' "$STATE_PATH" 2>/dev/null || echo "")"
  state_started_at="$(jq -r '.startedAt // ""' "$STATE_PATH" 2>/dev/null || echo "")"
  state_completed_at="$(jq -r '.completedAt // ""' "$STATE_PATH" 2>/dev/null || echo "")"

  echo "[$(ts)] state.status        = ${state_status}"
  echo "[$(ts)] state.liveConfigPath= ${state_live_cfg}"
  echo "[$(ts)] state.liveConfigHash= ${state_live_hash}"
  echo "[$(ts)] state.planVersion   = ${state_plan_version}"
  echo "[$(ts)] state.startedAt     = ${state_started_at}"
  echo "[$(ts)] state.completedAt   = ${state_completed_at}"
else
  echo "[$(ts)] NOTE: state file not found at $STATE_PATH"
  echo "[$(ts)]       Treating local RUN status as UNKNOWN / pre-RUN."
  state_status="UNKNOWN"
fi

echo
echo "[$(ts)] --- [step 3] on-chain sentinel (STUB) ---"
echo "[$(ts)] SENTINEL: not implemented yet; this script is planning-only."
echo "[$(ts)] SENTINEL: when wired, this section will read a bootstrap sentinel"
echo "[$(ts)]           (e.g. dedicated contract or ConfigGate key) and compare"
echo "[$(ts)]           its view against the local state file."
sentinel_status="STUB"

echo
echo "[$(ts)] --- [step 4] summary (planning-only) ---"
echo "[$(ts)] chainId(config)     = ${cfg_chain_id}"
echo "[$(ts)] chainId(RPC)        = ${runtime_chain_id}"
echo "[$(ts)] local_state.status  = ${state_status}"
echo "[$(ts)] sentinel.status     = ${sentinel_status}"
echo "[$(ts)] NOTE: This is a planning-only status helper."
echo "[$(ts)]       No on-chain sentinel wiring yet; exit code reflects"
echo "[$(ts)]       only basic config/RPC sanity and file presence."

if [[ "$rc" -ne 0 ]]; then
  echo "[$(ts)] RESULT: WARN/ERROR (see messages above; planning-only helper)"
else
  echo "[$(ts)] RESULT: OK (basic config + RPC sanity passed; planning-only helper)"
fi

exit "$rc"
