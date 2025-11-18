#!/usr/bin/env bash
set -euo pipefail

# VOID devnet "up" helper:
# - Verifies devnet RPC (chainId 2050)
# - Verifies protocol STATE JSON exists and looks complete
# - Optionally runs devnet health checks
#
# NOTE: This script NO LONGER auto-runs system-deploy.
#       If STATE is missing or corrupt, fix it (restore from snapshot
#       or run ops/void-devnet-system-deploy-v2.sh manually once).

# Resolve repo root (assume script lives in ops/)
cd "$(dirname "${BASH_SOURCE[0]}")/.."
REPO="$(pwd)"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE="${STATE:-$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[devnet-up] repo   = $REPO"
echo "[devnet-up] RPC_URL= $RPC_URL"
echo "[devnet-up] STATE  = $STATE"
echo "[devnet-up] PROM   = $PROM_URL"
echo

########################################
# [1] Check devnet RPC / chainId
########################################

echo "[1] Checking devnet RPC..."
CHAIN_ID_RAW="$(cast chain-id --rpc-url "$RPC_URL" 2>/dev/null || true)"

if [ -z "${CHAIN_ID_RAW:-}" ]; then
  echo "[ERR] cannot reach devnet at $RPC_URL (cast chain-id failed)"
  exit 1
fi

echo "[1] chainId(raw) = $CHAIN_ID_RAW"

# Normalize both hex and decimal 2050
if [ "$CHAIN_ID_RAW" = "2050" ] || [ "$CHAIN_ID_RAW" = "0x802" ]; then
  :
else
  echo "[ERR] expected chainId 2050 (0x802), got: $CHAIN_ID_RAW"
  exit 1
fi

########################################
# [2] Check protocol STATE JSON
########################################

echo
echo "[2] Checking protocol STATE at $STATE..."

if [ ! -s "$STATE" ]; then
  echo "[ERR] STATE file missing or empty: $STATE"
  echo "      - Restore from docs/VOID-DEVNET-SNAPSHOTS/*/VOID-DEVNET-PROTOCOL-STATE.json"
  echo "      - Or run ops/void-devnet-system-deploy-v2.sh manually once."
  exit 1
fi

# addrOf(x) = x if string, x.address if object
# We also enforce a simple 0x-address regex.
if ! jq -e '
  def addrOf(x):
    if (x | type) == "string" then x
    else (x.address // empty)
    end;

  .chainId == 2050 and
  (addrOf(.AdminGate)        | test("^0x[0-9a-fA-F]{40}$")) and
  (addrOf(.ModelRegistry)    | test("^0x[0-9a-fA-F]{40}$")) and
  (addrOf(.DatasetRegistry)  | test("^0x[0-9a-fA-F]{40}$")) and
  (addrOf(.JobQueue)         | test("^0x[0-9a-fA-F]{40}$")) and
  (addrOf(.ReceiptRegistry)  | test("^0x[0-9a-fA-F]{40}$")) and
  (addrOf(.AgentRegistry)    | test("^0x[0-9a-fA-F]{40}$"))
' "$STATE" >/dev/null 2>&1; then
  echo "[ERR] STATE exists but looks incomplete or corrupt (schema or address check failed)."
  echo "      Use latest snapshot to repair it, for example:"
  echo "        LATEST_SNAP=\$(ls -1dt docs/VOID-DEVNET-SNAPSHOTS/VOID-DEVNET-SNAPSHOT-* | head -n1)"
  echo "        cp \"\$LATEST_SNAP/VOID-DEVNET-PROTOCOL-STATE.json\" \"$STATE\""
  exit 1
fi

echo "[2] STATE looks healthy (normalized view):"
jq '
  def addrOf(x):
    if (x | type) == "string" then x
    else (x.address // "MISSING")
    end;
  {
    chainId,
    AdminGate:       addrOf(.AdminGate),
    ModelRegistry:   addrOf(.ModelRegistry),
    DatasetRegistry: addrOf(.DatasetRegistry),
    JobQueue:        addrOf(.JobQueue),
    ReceiptRegistry: addrOf(.ReceiptRegistry),
    AgentRegistry:   addrOf(.AgentRegistry)
  }
' "$STATE"

########################################
# [3] Optional health checks (agent / metrics)
########################################

echo
if [ -x "$REPO/ops/void-devnet-agent-health.sh" ]; then
  echo "[3] Running devnet agent/metrics health..."
  # Best-effort: do not kill the script if health exits non-zero
  if ! "$REPO/ops/void-devnet-agent-health.sh"; then
    echo "[WARN] devnet agent health script returned non-zero (continuing anyway)"
  fi
else
  echo "[3] (skip) ops/void-devnet-agent-health.sh not found or not executable"
fi

echo
echo "[done] devnet-up complete. Devnet RPC + STATE are sane."
