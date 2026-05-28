#!/usr/bin/env bash
set -euo pipefail
set +H

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="/tmp/void-buy-void-public-safety-status-proof-$(date +%Y%m%d-%H%M%S)"
DOC="ops/mainnet0/buy-void-public-safety-status.current.md"
mkdir -p "$OUT"

echo "=== Buy VOID public safety status proof ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== doc assertions ==="
test -f "$DOC"

grep -q 'Buy VOID Public Safety Status' "$DOC"
grep -q 'public_mainnet0_live guarded path' "$DOC"
grep -q 'public fulfillment must remain guarded' "$DOC"
grep -q 'must not automatically send VOID' "$DOC"
grep -q 'void_tx_ref' "$DOC"
grep -q 'Fulfillment must fail closed when `void_tx_ref` is missing' "$DOC"
grep -q 'Blind direct deposits are not supported' "$DOC"
grep -q 'Exchange/custodial sends are not supported' "$DOC"
grep -q 'Money step remains last' "$DOC"
grep -q 'This safety proof is read-only' "$DOC"
grep -q 'Forbidden in this proof lane' "$DOC"
grep -q 'Payment confirmation is not fulfillment' "$DOC"

echo
echo "=== static guard: this proof script must not call mutating endpoints ==="
SELF="ops/mainnet0/buy-void-public-safety-status-proof.sh"
if grep -nE 'curl .*(-X POST|--request POST)|/claim-tx|/observe|/fulfill|/run-once|/queue|/config|treasury|sendToOps|OpsTreasury|spend\(' "$SELF"; then
  echo "[fail] mutating call pattern found in safety proof"
  exit 1
fi
echo "[ok] no mutating call patterns in this proof"

echo
echo "=== build ==="
npm run build

echo
echo "=== readiness ==="
curl -fsS --max-time 8 "$BASE/__void/ready.json" > "$OUT/ready.json"
python3 - "$OUT/ready.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print({"ready": j.get("ready"), "head": j.get("head"), "gap": j.get("gap"), "txroot_live": j.get("txroot_live")})
PY

echo
echo "=== existing Buy VOID safety proof targets are wired ==="
grep -nE 'buy-void.*(readiness|hardstop|no-void-send|no_void|fulfillment|policy|confirmed)' Makefile | tee "$OUT/make-buy-void-targets.txt"
grep -q 'buy-void-backend-readiness-proof' "$OUT/make-buy-void-targets.txt"
grep -q 'buy-void-ethereum-payment-confirmed-no-void-send-proof' "$OUT/make-buy-void-targets.txt"

echo
echo "=== current Mainnet-0 status smoke ==="
make mainnet0-status-smoke | tee "$OUT/mainnet0-status-smoke.txt"
grep -q 'Mainnet-0 status smoke passed' "$OUT/mainnet0-status-smoke.txt"
grep -q "'status': 'public_mainnet0_live'" "$OUT/mainnet0-status-smoke.txt"
grep -q "'buy_void_configured': True" "$OUT/mainnet0-status-smoke.txt"
grep -q "'buy_void_pending_count': 0" "$OUT/mainnet0-status-smoke.txt"

echo
echo "=== Buy VOID watcher/status read-only inspection ==="
STATUS_OK=0
for url in \
  "$BASE/__void/operator/buy-void/status" \
  "$BASE/__void/operator/buy-void/watcher/status" \
  "$BASE/__void/operator/buy-void/watch-targets" \
  "$BASE/__void/participant/buy-void/status"; do
  name="$(echo "$url" | sed 's#http://127.0.0.1:4100##; s#[/?=&:]#_#g')"
  code="$(curl -sS --max-time 8 -o "$OUT/${name}.json" -w '%{http_code}' "$url" || true)"
  echo "$code $url"
  if [ "$code" = "200" ]; then
    STATUS_OK=1
    python3 -m json.tool "$OUT/${name}.json" | sed -n '1,120p' || cat "$OUT/${name}.json"
  fi
done

if [ "$STATUS_OK" != "1" ]; then
  echo "[fail] no Buy VOID status/watch endpoint returned 200"
  exit 1
fi

echo
echo "=== no-send proof targets, if present ==="
if grep -q '^buy-void-backend-readiness-proof:' Makefile; then
  make buy-void-backend-readiness-proof | tee "$OUT/buy-void-backend-readiness-proof.txt"
fi

if grep -q '^buy-void-ethereum-payment-confirmed-no-void-send-proof:' Makefile; then
  make buy-void-ethereum-payment-confirmed-no-void-send-proof | tee "$OUT/buy-void-ethereum-no-void-send-proof.txt"
fi

echo
echo "=== final readiness ==="
curl -fsS --max-time 8 "$BASE/__void/ready.json" > "$OUT/ready-final.json"
python3 - "$OUT/ready-final.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print({"ready": j.get("ready"), "head": j.get("head"), "gap": j.get("gap"), "txroot_live": j.get("txroot_live")})
PY

echo
echo "buy_void_public_safety_status_proof=green"
echo "out=$OUT"
