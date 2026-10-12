#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="/tmp/participant-wc-earn-receipt-card-proof-$(date -u +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

echo "=== participant WC earn receipt card proof ==="
echo "base=$BASE"
echo "out=$OUT"
echo "mutation=ui_copy_only"
echo "money_movement=false"
echo "validator_mutation=false"
echo

expect_grep() {
  local label="$1"
  local pattern="$2"
  local file="$3"
  if grep -Fq "$pattern" "$file"; then
    echo "[ok] $label"
  else
    echo "[fail] missing $label pattern=$pattern file=$file" >&2
    exit 1
  fi
}

echo "=== [1] source markers/copy ==="
expect_grep "card marker" "VOID_PARTICIPANT_WC_EARN_RECEIPT_CARD_V1" src/index.ts
expect_grep "copy marker" "VOID_PARTICIPANT_WC_EARN_RECEIPT_CARD_COPY_V1" src/index.ts
expect_grep "card id" 'id="wcEarnReceiptCard"' src/index.ts
expect_grep "summary id" 'id="wcEarnReceiptSummary"' src/index.ts
expect_grep "detail id" 'id="wcEarnReceiptDetail"' src/index.ts
expect_grep "latest earned label" "Latest WC earned" src/index.ts
expect_grep "reward copy" "You earned +10 WC" src/index.ts
expect_grep "receipt copy" "Receipt and dataset details" src/index.ts
expect_grep "safety copy" "no wallet send, no WC→VOID swap, no Buy VOID fulfillment, no validator mutation" src/index.ts
echo

echo "=== [2] build ==="
npm run build
echo "[ok] build passed"
echo

echo "=== [3] restart/health ==="
systemctl --user restart void-node-live.service || true
sleep 4
curl -fsS --max-time 10 "$BASE/health" | tee "$OUT/health.json"
python3 - "$OUT/health.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert int(j.get("http", 0)) == 4100, j
print("[ok] health/http live")
PY
echo

echo "=== [4] served participant page has receipt card ==="
curl -fsS --max-time 20 "$BASE/participant" > "$OUT/participant.html"
expect_grep "served card marker" "VOID_PARTICIPANT_WC_EARN_RECEIPT_CARD_V1" "$OUT/participant.html"
expect_grep "served copy marker" "VOID_PARTICIPANT_WC_EARN_RECEIPT_CARD_COPY_V1" "$OUT/participant.html"
expect_grep "served card id" 'id="wcEarnReceiptCard"' "$OUT/participant.html"
expect_grep "served summary id" 'id="wcEarnReceiptSummary"' "$OUT/participant.html"
expect_grep "served detail id" 'id="wcEarnReceiptDetail"' "$OUT/participant.html"
expect_grep "served latest earned label" "Latest WC earned" "$OUT/participant.html"
expect_grep "served reward copy" "You earned +10 WC" "$OUT/participant.html"
expect_grep "served receipt copy" "Receipt and dataset details" "$OUT/participant.html"
expect_grep "served safety copy" "no wallet send, no WC→VOID swap, no Buy VOID fulfillment, no validator mutation" "$OUT/participant.html"
echo

echo "=== [5] current WC endpoints still functional ==="
curl -fsS --max-time 10 "$BASE/wc/runner/status?account=zoso" > "$OUT/runner-status.json"
curl -fsS --max-time 10 "$BASE/wc/redeemable?account=zoso" > "$OUT/redeemable.json"
python3 - "$OUT/runner-status.json" "$OUT/redeemable.json" <<'PY'
import json, sys
runner=json.load(open(sys.argv[1]))
redeem=json.load(open(sys.argv[2]))
assert runner.get("ok") is True, runner
assert runner.get("manual_only") is True, runner
assert "datanet_publish" in runner.get("approved_task_classes", []), runner
assert redeem.get("ok") is True, redeem
assert float(redeem.get("earned", 0)) >= 0, redeem
assert float(redeem.get("redeemable", 0)) >= 0, redeem
print("[ok] runner/redeemable endpoints functional")
print({"earned": redeem.get("earned"), "redeemable": redeem.get("redeemable"), "manual_only": runner.get("manual_only")})
PY
echo

echo "=== [6] visible Run Once result proof backs dynamic receipt/dataset behavior ==="
BASE="$BASE" make participant-run-once-visible-result-proof
echo "[ok] visible Run Once result proof passed"
echo

echo "=== [7] status smoke ==="
BASE="$BASE" make mainnet0-status-smoke
echo "[ok] status smoke passed"
echo

echo "VOID_PARTICIPANT_WC_EARN_RECEIPT_CARD_V1_GREEN"
echo "out=$OUT"
