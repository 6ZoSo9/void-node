#!/usr/bin/env bash
set -euo pipefail

echo "[$(date -Is)] === [mainnet-run state-init] VOID mainnet RUN state init (planning-only) ==="

# Resolve repo root from this script's location
ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$ROOT"

CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"
STATE_PATH="${STATE_PATH:-config/void-mainnet-bootstrap-mainnet.state.json}"

echo "[$(date -Is)] ROOT        = $ROOT"
echo "[$(date -Is)] CONFIG_PATH = $CONFIG_PATH"
echo "[$(date -Is)] STATE_PATH  = $STATE_PATH"

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "[$(date -Is)] FATAL: LIVE config not found at $CONFIG_PATH" >&2
  exit 1
fi

if [[ -f "$STATE_PATH" && "${RUN_STATE_FORCE:-0}" != "1" ]]; then
  echo "[$(date -Is)] NOTE: state file already exists at $STATE_PATH" >&2
  echo "[$(date -Is)]       Refusing to overwrite. Set RUN_STATE_FORCE=1 to override." >&2
  exit 0
fi

# Best-effort: read chainId from LIVE config via jq
cfg_chainId="null"
if command -v jq >/dev/null 2>&1; then
  cfg_chainId="$(jq -r '.chainId // "null"' "$CONFIG_PATH" 2>/dev/null || echo "null")"
fi

# Best-effort: compute liveConfigHash using cast if available
liveHash="0x0"
if command -v cast >/dev/null 2>&1; then
  # Use keccak of raw file contents
  liveHash="$(cast keccak "$(cat "$CONFIG_PATH")")"
  echo "[$(date -Is)] INFO: liveConfigHash computed via cast keccak"
else
  echo "[$(date -Is)] WARN: cast not found; using liveConfigHash=0x0 placeholder"
fi

echo "[$(date -Is)] chainId(config) = $cfg_chainId"
echo "[$(date -Is)] liveConfigHash  = $liveHash"

tmp="${STATE_PATH}.tmp.$$"

cat > "$tmp" <<EOF
{
  "status": "NOT_STARTED",
  "liveConfigPath": "$CONFIG_PATH",
  "liveConfigHash": "$liveHash",
  "chainId": $cfg_chainId,
  "planVersion": "v1",
  "runTxs": [],
  "startedAt": null,
  "completedAt": null
}
EOF

mv "$tmp" "$STATE_PATH"

echo "[$(date -Is)] wrote RUN state file:"
echo "[$(date -Is)]   $STATE_PATH"
echo "[$(date -Is)] NOTE: status=NOT_STARTED, planning-only; no on-chain sentinel wiring yet."
echo "[$(date -Is)] RESULT: OK (state file initialized or updated)"
