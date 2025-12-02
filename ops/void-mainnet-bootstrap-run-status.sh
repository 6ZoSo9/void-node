#!/usr/bin/env bash
set -euo pipefail

ts() {
  date -Is
}

echo "[$(ts)] === [mainnet-run status] VOID mainnet bootstrap RUN status (planning-only) ==="

# Resolve repo root from this script's location
ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$ROOT"

CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"
STATE_PATH="${STATE_PATH:-config/void-mainnet-bootstrap-mainnet.state.json}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo "[$(ts)] ROOT        = $ROOT"
echo "[$(ts)] CONFIG_PATH = $CONFIG_PATH"
echo "[$(ts)] STATE_PATH  = $STATE_PATH"
echo "[$(ts)] RPC_URL     = $RPC_URL"

cfg_chainId="unknown"
if [[ -f "$CONFIG_PATH" ]] && command -v jq >/dev/null 2>&1; then
  cfg_chainId="$(jq -r '.chainId // "unknown"' "$CONFIG_PATH" 2>/dev/null || echo "unknown")"
else
  echo "[$(ts)] WARN: cannot read config.chainId (missing file or jq); treating as unknown"
fi

rpc_chainId="unknown"
if command -v cast >/dev/null 2>&1; then
  if out="$(cast chain-id --rpc-url "$RPC_URL" 2>/dev/null)"; then
    rpc_chainId="$out"
  else
    echo "[$(ts)] WARN: cast chain-id failed; treating RPC chainId as unknown"
  fi
else
  echo "[$(ts)] WARN: cast not found; cannot query RPC chainId"
fi

echo
echo "[$(ts)] --- [step 1] chainId sanity ---"
echo "[$(ts)] config.chainId = $cfg_chainId"
echo "[$(ts)] RPC chainId    = $rpc_chainId"

if [[ "$cfg_chainId" != "unknown" && "$rpc_chainId" != "unknown" && "$cfg_chainId" != "$rpc_chainId" ]]; then
  echo "[$(ts)] FATAL: config.chainId != RPC chainId" >&2
  echo "[$(ts)] RESULT: ERROR (chainId mismatch)" >&2
  exit 1
fi

if [[ "$cfg_chainId" == "unknown" || "$rpc_chainId" == "unknown" ]]; then
  echo "[$(ts)] NOTE: chainId checks are best-effort only (one side unknown)."
else
  echo "[$(ts)] OK: config.chainId matches RPC chainId"
fi

echo
echo "[$(ts)] --- [step 2] local RUN state file ---"

local_status="UNKNOWN"
state_chainId="unknown"
state_planVersion="unknown"
state_liveHash="0x0"
state_startedAt="null"
state_completedAt="null"
state_runTxs="unknown"
state_hash_match="UNKNOWN"

if [[ ! -f "$STATE_PATH" ]]; then
  echo "[$(ts)] NOTE: state file not found at $STATE_PATH"
  echo "[$(ts)]       Treating local RUN status as UNKNOWN / pre-RUN."
else
  if ! command -v jq >/dev/null 2>&1; then
    echo "[$(ts)] WARN: jq not found; cannot parse state file; treating status as UNKNOWN."
  else
    # Parse core fields from state JSON
    local_status="$(jq -r '.status // "UNKNOWN"' "$STATE_PATH" 2>/dev/null || echo "UNKNOWN")"
    state_chainId="$(jq -r '.chainId // "unknown"' "$STATE_PATH" 2>/dev/null || echo "unknown")"
    state_planVersion="$(jq -r '.planVersion // "unknown"' "$STATE_PATH" 2>/dev/null || echo "unknown")"
    state_liveHash="$(jq -r '.liveConfigHash // "0x0"' "$STATE_PATH" 2>/dev/null || echo "0x0")"
    state_startedAt="$(jq -r '.startedAt' "$STATE_PATH" 2>/dev/null || echo "null")"
    state_completedAt="$(jq -r '.completedAt' "$STATE_PATH" 2>/dev/null || echo "null")"
    state_runTxs="$(jq -r '.runTxs | length' "$STATE_PATH" 2>/dev/null || echo "unknown")"

    echo "[$(ts)] state.status       = $local_status"
    echo "[$(ts)] state.chainId      = $state_chainId"
    echo "[$(ts)] state.planVersion  = $state_planVersion"
    echo "[$(ts)] state.liveHash     = $state_liveHash"
    echo "[$(ts)] state.runTxs       = $state_runTxs"
    echo "[$(ts)] state.startedAt    = $state_startedAt"
    echo "[$(ts)] state.completedAt  = $state_completedAt"

    # Check chainId alignment (best-effort)
    if [[ "$cfg_chainId" != "unknown" && "$state_chainId" != "unknown" && "$cfg_chainId" != "$state_chainId" ]]; then
      echo "[$(ts)] WARN: state.chainId != config.chainId (best-effort check)" >&2
    fi

    # Recompute live config hash and compare to state.liveConfigHash
    if command -v cast >/dev/null 2>&1 && [[ -f "$CONFIG_PATH" ]]; then
      currentHash="$(cast keccak "$(cat "$CONFIG_PATH")")"
      echo "[$(ts)] current liveConfigHash = $currentHash"

      if [[ "$currentHash" == "$state_liveHash" ]]; then
        state_hash_match="MATCH"
        echo "[$(ts)] OK: state.liveConfigHash matches current LIVE config"
      else
        state_hash_match="MISMATCH"
        echo "[$(ts)] WARN: state.liveConfigHash does NOT match current LIVE config" >&2
      fi
    else
      echo "[$(ts)] NOTE: skipping liveConfigHash comparison (no cast or missing config)."
    fi
  fi
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
echo "[$(ts)] chainId(config)        = $cfg_chainId"
echo "[$(ts)] chainId(RPC)           = $rpc_chainId"
echo "[$(ts)] local_state.status     = $local_status"
echo "[$(ts)] local_state.hash_match = $state_hash_match"
echo "[$(ts)] sentinel.status        = $sentinel_status"
echo "[$(ts)] NOTE: This is a planning-only status helper."
echo "[$(ts)]       No on-chain sentinel wiring yet; exit code reflects"
echo "[$(ts)]       only config/RPC sanity + local state visibility."

echo "[$(ts)] RESULT: OK (basic config + RPC + state visibility; planning-only helper)"
exit 0
