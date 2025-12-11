#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE="${STATE:-$ROOT/docs/VOID-DEVNET-PROTOCOL-STATE.json}"
KEY_FILE="${KEY_FILE:-$ROOT/.secrets/devnet-deployer.key}"

cd "$ROOT"

echo "=== [VOID WorkCredits DEVNET deploy] ==="
echo "[cfg] ROOT     = $ROOT"
echo "[cfg] RPC_URL  = $RPC_URL"
echo "[cfg] STATE    = $STATE"
echo "[cfg] KEY_FILE = $KEY_FILE"
echo

# --- tool sanity -------------------------------------------------------------

for bin in jq forge cast; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "[ERROR] missing required tool: $bin (add to PATH or install)" >&2
    exit 1
  fi
done

# --- file sanity -------------------------------------------------------------

if [ ! -f "$STATE" ]; then
  echo "[ERROR] state file not found: $STATE" >&2
  exit 1
fi

if [ ! -f "$KEY_FILE" ]; then
  echo "[ERROR] devnet deployer key file not found: $KEY_FILE" >&2
  echo "        expected a hex private key for DEVNET_DEPLOYER_KEY." >&2
  exit 1
fi

DEVNET_DEPLOYER_KEY="$(tr -d ' \n\r' < "$KEY_FILE")"
if [ -z "$DEVNET_DEPLOYER_KEY" ]; then
  echo "[ERROR] devnet deployer key file is empty: $KEY_FILE" >&2
  exit 1
fi

export DEVNET_DEPLOYER_KEY

echo "=== [1] forge script broadcast (WorkCreditsDevnetDeploy.run) ] ==="
LOG="$(mktemp /tmp/void-wc-devnet-deploy.XXXXXX)"
echo "[info] logging forge output to: $LOG"
echo

forge script \
  script/WorkCreditsDevnetDeploy.s.sol:WorkCreditsDevnetDeploy \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --slow \
  2>&1 | tee "$LOG"

echo
echo "=== [2] parse addresses from script output] ==="

CLEAN_LOG="$(mktemp /tmp/void-wc-devnet-deploy.clean.XXXXXX)"
# strip ANSI color codes just in case
sed -r 's/\x1B\[[0-9;]*[mK]//g' "$LOG" > "$CLEAN_LOG"

WC_ADDR="$(grep -E 'WorkCreditsToken:' "$CLEAN_LOG" | tail -n1 | awk '{print $2}')"
POOL_ADDR="$(grep -E 'WorkCreditsPoolV1:' "$CLEAN_LOG" | tail -n1 | awk '{print $2}')"
RELAYER_ADDR="$(grep -E 'WorkCreditsRelayerV1:' "$CLEAN_LOG" | tail -n1 | awk '{print $2}')"

echo "  WorkCreditsToken     = ${WC_ADDR:-<missing>}"
echo "  WorkCreditsPoolV1    = ${POOL_ADDR:-<missing>}"
echo "  WorkCreditsRelayerV1 = ${RELAYER_ADDR:-<missing>}"

for name in WC_ADDR POOL_ADDR RELAYER_ADDR; do
  val="${!name:-}"
  if [ -z "$val" ] || ! [[ "$val" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
    echo "[ERROR] failed to parse $name from forge output (got: '$val')" >&2
    echo "        inspect log: $LOG" >&2
    exit 1
  fi
done

echo
echo "=== [3] backup + update devnet state JSON] ==="
BACKUP="${STATE}.bak.$(date +%s)"
cp "$STATE" "$BACKUP"
echo "[info] backup written: $BACKUP"

TMP="${STATE}.tmp.$$"
jq \
  --arg wc "$WC_ADDR" \
  --arg pool "$POOL_ADDR" \
  --arg relayer "$RELAYER_ADDR" \
  '.workCreditsToken     = $wc
   | .workCreditsPoolV1  = $pool
   | .workCreditsRelayerV1 = $relayer' \
  "$STATE" > "$TMP"

mv "$TMP" "$STATE"
echo "[info] updated $STATE with new WorkCredits addresses"
echo
echo "=== [4] summary] ==="
echo "  workCreditsToken     -> $WC_ADDR"
echo "  workCreditsPoolV1    -> $POOL_ADDR"
echo "  workCreditsRelayerV1 -> $RELAYER_ADDR"
echo
echo "=== [done] VOID WorkCredits DEVNET deploy ==="
echo "Next: ./ops/void-workcredits-devnet-onchain-diag.sh | sed -n '1,160p'"
