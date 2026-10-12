#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

RPC="${RPC_URL:-http://127.0.0.1:8545}"
NODE="${NODE_BASE:-http://127.0.0.1:4100}"
REL="${RELAYER_BASE:-http://127.0.0.1:4313/api/wc-relayer/v1}"
HELPER="${HELPER_BASE:-http://127.0.0.1:4312/workcredits/devnet}"
ACCOUNT="${ACCOUNT:-${WC_ADDR:-demo-user}}"
WALLET="${WALLET:-0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266}"
AMOUNT="${AMOUNT:-1}"

echo "=== [1] health ==="
curl -fsS "$NODE/health" | sed -n "1,120p"
echo
curl -fsS "$REL/health" | sed -n "1,160p"

echo
echo "=== [2] participant relayer wiring ==="
curl -fsS "$NODE/participant" | grep -En "api/wc-relayer/v1/quote|api/wc-relayer/v1/execute|Relayer is live for quote and execution" | sed -n "1,120p"

echo
echo "=== [3] dashboard before ==="
curl -fsS "$HELPER/dashboard/$WALLET.json" | tee /tmp/wc-relayer-smoke.before.json | sed -n "1,220p"

echo
echo "=== [4] quote ==="
curl -fsS \
  -H "content-type: application/json" \
  -d "{\"side\":\"wc_to_void\",\"amount\":$AMOUNT,\"wallet\":\"$WALLET\"}" \
  "$REL/quote" | tee /tmp/wc-relayer-smoke.quote.json | sed -n "1,220p"

echo
echo "=== [5] execute ==="
if [ "${WC_RELAYER_SMOKE_REQUIRE_EXECUTE:-0}" = "1" ]; then
  curl -fsS \
    -H "content-type: application/json" \
    -d "{\"side\":\"wc_to_void\",\"amount\":$AMOUNT,\"account\":\"$ACCOUNT\",\"wallet\":\"$WALLET\"}" \
    "$REL/execute" | tee /tmp/wc-relayer-smoke.execute.json | sed -n "1,320p"

  echo
  echo "=== [6] dashboard after ==="
  curl -fsS "$HELPER/dashboard/$WALLET.json" | tee /tmp/wc-relayer-smoke.after.json | sed -n "1,220p"

  echo
  echo "=== [7] tx hashes ==="
  jq -r '.approve_tx.tx_hash, .swap_tx.tx_hash' /tmp/wc-relayer-smoke.execute.json
else
  echo "[skip] non-mutating smoke: execute requires WC_RELAYER_SMOKE_REQUIRE_EXECUTE=1"
  echo "[ok] health + participant wiring + dashboard + quote proved"
fi

echo
echo "=== [8] done ==="
echo "before=/tmp/wc-relayer-smoke.before.json"
echo "quote=/tmp/wc-relayer-smoke.quote.json"
echo "execute=/tmp/wc-relayer-smoke.execute.json"
echo "after=/tmp/wc-relayer-smoke.after.json"
