#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
HTML="/tmp/void-participant-buy-void-clarity-proof.html"

echo "=== Participant Buy VOID clarity proof ==="

echo
echo "=== [1] build ==="
npm run build

echo
echo "=== [2] restart node to serve current source ==="
systemctl --user restart void-node.service

READY_OK=0
for i in $(seq 1 120); do
  if curl -fsS "$BASE/__void/ready.json" > /tmp/void-participant-buy-void-clarity-ready.json; then
    READY_OK=1
    break
  fi
  sleep 1
done
test "$READY_OK" = "1"

cat /tmp/void-participant-buy-void-clarity-ready.json
echo

python3 - /tmp/void-participant-buy-void-clarity-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap",-1)) == 0, j
assert int(j.get("txroot_live",0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [3] rendered Buy VOID safety copy ==="
curl -fsS "$BASE/participant" > "$HTML"

grep -q 'VOID_BUY_PUBLIC_SAFETY_CLARITY_V1' "$HTML"
grep -q 'Base or Ethereum native USDC only' "$HTML"
grep -q 'Base/Ethereum USDC' "$HTML"
grep -q 'create a Buy VOID request first' "$HTML"
grep -q 'use a self-custody wallet' "$HTML"
grep -q 'exchange/custodial sends and blind direct deposits are not supported' "$HTML"

if grep -qE 'Base native USDC only|Guided Base USDC request only|sending Base USDC' "$HTML"; then
  echo "[fail] stale Base-only Buy VOID copy still rendered" >&2
  exit 1
fi
grep -q 'payment confirmation is not VOID fulfillment' "$HTML"

echo "[ok] Buy VOID public safety copy rendered"

echo
echo "=== [4] status smoke stays green ==="
bash ops/mainnet/mainnet0-status-smoke.sh

echo
echo "[ok] Participant Buy VOID clarity proof passed"
