#!/usr/bin/env bash
set -euo pipefail

cd "${VOID_REPO:-$HOME/dev/void-node}"

RPC_HOST="${RPC_HOST:-127.0.0.1}"
RPC_PORT="${RPC_PORT:-8545}"
RPC="http://${RPC_HOST}:${RPC_PORT}"
CHAIN_ID="${CHAIN_ID:-2050}"
BLOCK_TIME="${BLOCK_TIME:-2}"
GAS_LIMIT="${GAS_LIMIT:-200000000}"

HEX_STATE="${VOID_MAINNET0_8545_HEX_STATE:-/mnt/key2/anvil-state/void-mainnet0-8545-recovered-plus-vault001-122-20260502-001641.json}"
CLI_STATE="${VOID_MAINNET0_8545_CLI_STATE:-/mnt/key2/anvil-state/void-mainnet0-8545-recovered-plus-vault001-122-20260502-001641.cli-state.json}"

LOG="${VOID_MAINNET0_8545_ANVIL_LOG:-/tmp/void-mainnet0-8545-restored-cli.anvil.log}"
PIDFILE=".runtime/mainnet0/anvil-8545.pid"

echo "=== Mainnet-0 restore 8545 epoch125 lane ==="
echo "rpc=$RPC"
echo "hex_state=$HEX_STATE"
echo "cli_state=$CLI_STATE"
echo "log=$LOG"

command -v anvil >/dev/null || { echo "[ERR] anvil not found on PATH" >&2; exit 1; }
command -v cast >/dev/null || { echo "[ERR] cast not found on PATH" >&2; exit 1; }

if [ ! -s "$CLI_STATE" ]; then
  echo "[info] CLI state missing; converting RPC hex/gzip dump"
  test -s "$HEX_STATE" || { echo "[ERR] missing HEX_STATE: $HEX_STATE" >&2; exit 1; }
  HEX_STATE="$HEX_STATE" CLI_STATE="$CLI_STATE" python3 - <<'PY'
import gzip, json, os
from pathlib import Path
src = Path(os.environ["HEX_STATE"])
dst = Path(os.environ["CLI_STATE"])
raw = src.read_text().strip()
if not raw.startswith("0x"):
    raise SystemExit("[ERR] expected 0x hex anvil_dumpState payload")
plain = gzip.decompress(bytes.fromhex(raw[2:]))
j = json.loads(plain.decode("utf-8"))
dst.write_text(json.dumps(j), encoding="utf-8")
print("converted_cli_state=" + str(dst))
PY
fi

test -s "$CLI_STATE" || { echo "[ERR] missing CLI_STATE: $CLI_STATE" >&2; exit 1; }

echo
echo "=== [1] restart Anvil from CLI state ==="
fuser -k "${RPC_PORT}/tcp" 2>/dev/null || true
sleep 1

mkdir -p "$(dirname "$PIDFILE")"
nohup anvil \
  --host "$RPC_HOST" \
  --port "$RPC_PORT" \
  --chain-id "$CHAIN_ID" \
  --block-time "$BLOCK_TIME" \
  --gas-limit "$GAS_LIMIT" \
  --load-state "$CLI_STATE" \
  >"$LOG" 2>&1 &

echo $! > "$PIDFILE"

for _ in $(seq 1 20); do
  if cast chain-id --rpc-url "$RPC" >/tmp/void-mainnet0-restore-chainid.txt 2>/dev/null; then
    break
  fi
  sleep 1
done

ACTUAL_CHAIN_ID="$(cat /tmp/void-mainnet0-restore-chainid.txt 2>/dev/null || true)"
echo "chain_id=$ACTUAL_CHAIN_ID"
test "$ACTUAL_CHAIN_ID" = "$CHAIN_ID"

echo
echo "=== [2] catch up vault123 chain state ==="
RPC="$RPC" bash ops/mainnet0/mainnet0-catchup-vault123-chain-only.sh

echo
echo "=== [3] prove epoch125 restored ==="
RPC="$RPC" bash ops/mainnet0/mainnet0-8545-epoch125-state-proof.sh

echo
echo "[ok] 8545 restored to epoch125 state"
