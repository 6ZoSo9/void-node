#!/usr/bin/env bash
set -euo pipefail

NODE_BASE="${NODE_BASE:-http://127.0.0.1:4100}"
HELPER_BASE="${HELPER_BASE:-http://127.0.0.1:4312/workcredits/devnet}"
RELAYER_BASE="${RELAYER_BASE:-http://127.0.0.1:4313}"
ACCOUNT="${ACCOUNT:-${WC_ADDR:-demo-user}}"
WALLET="${WALLET:-0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266}"
TRADE_WC="${TRADE_WC:-1}"

jget() { curl -fsS "$1"; }

py_get() {
  local file="$1" path="$2"
  python3 - "$file" "$path" <<'PY'
import json, sys
obj = json.load(open(sys.argv[1]))
cur = obj
for part in sys.argv[2].split("."):
    if not part:
        continue
    if isinstance(cur, dict):
        cur = cur.get(part)
    else:
        cur = None
        break
print("" if cur is None else cur)
PY
}

tmp="$(mktemp -d /tmp/wc-smoke.XXXXXX)"
trap 'rm -rf "$tmp"' EXIT


jpost(){
  local url="$1"
  local body="${2:-{}}"
  local tmp_body
  local code
  tmp_body="$(mktemp /tmp/wc-smoke-post.XXXXXX.json)"
  code="$(curl -sS -o "$tmp_body" -w "%{http_code}" -X POST "$url" \
    -H "content-type: application/json" \
    --data "$body")"
  cat "$tmp_body"
  if [[ "$code" -ge 400 ]]; then
    echo >&2
    echo "[fail] POST $url -> HTTP $code" >&2
    rm -f "$tmp_body"
    return 22
  fi
  rm -f "$tmp_body"
}

echo "=== [1] health ==="
jget "$NODE_BASE/health" | tee "$tmp/node.health.json" >/dev/null
jget "$HELPER_BASE/dashboard/$WALLET.json" | tee "$tmp/helper.dashboard.json" >/dev/null
jget "$RELAYER_BASE/api/wc-relayer/v1/health" | tee "$tmp/relayer.health.json" >/dev/null
echo "[ok] node/helper/relayer reachable"

echo
echo "=== [2] local wc state ==="
jget "$NODE_BASE/wc/balance?account=$ACCOUNT" | tee "$tmp/wc.balance.json"
echo
jget "$NODE_BASE/wc/redeemable?account=$ACCOUNT" | tee "$tmp/wc.redeemable.json"
echo

echo

# compat aliases for quote block copied from wc-demo-e2e
trade_amt="${TRADE_WC:-1}"
OUT_DIR="${tmp}"

echo "=== [3] quote ==="
quote_body_file="$OUT_DIR/relayer.quote.body.json"
cat > "$quote_body_file" <<JSON
{"side":"wc_to_void","amount":1,"wallet":"$WALLET"}
JSON
cat "$quote_body_file" | tee "$OUT_DIR/relayer.quote.body.seen.json" >/dev/null
curl -sS -X POST "$RELAYER_BASE/api/wc-relayer/v1/quote" \
  -H "content-type: application/json" \
  --data-binary @"$quote_body_file" | tee "$OUT_DIR/relayer.quote.json"
echo
quote_ok="$(py_get "$OUT_DIR/relayer.quote.json" ok)"
quote_amount_out="$(py_get "$OUT_DIR/relayer.quote.json" amount_out)"
quote_price_wc_per_void="$(py_get "$OUT_DIR/relayer.quote.json" pool_price.wc_per_void)"

python3 - "$quote_ok" "$quote_amount_out" "$quote_price_wc_per_void" <<'PY'
import sys
ok_raw, amount_out_raw, price_raw = sys.argv[1:]
ok = str(ok_raw).lower() == "true"
try:
    amount_out = float(amount_out_raw)
except Exception:
    raise SystemExit(f"[fail] quote amount_out not numeric: {amount_out_raw!r}")
try:
    price = float(price_raw)
except Exception:
    raise SystemExit(f"[fail] quote pool_price.wc_per_void not numeric: {price_raw!r}")
if not ok:
    raise SystemExit("[fail] quote ok != true")
if amount_out <= 0:
    raise SystemExit(f"[fail] quote amount_out must be > 0, got {amount_out}")
if abs(price - 100.0) > 1e-9:
    raise SystemExit(f"[fail] expected wc_per_void=100 on devnet, got {price}")
print(f"[ok] quote validated: amount_out={amount_out}, wc_per_void={price}")
PY
echo
echo "=== [4] execute tiny trade ==="
execute_body_file="$OUT_DIR/relayer.execute.body.json"
cat > "$execute_body_file" <<JSON
{"side":"wc_to_void","amount":0.1,"wallet":"$WALLET","account":"$ACCOUNT","execute":true}
JSON
cat "$execute_body_file" | tee "$OUT_DIR/relayer.execute.body.seen.json" >/dev/null
curl -sS -X POST "$RELAYER_BASE/api/wc-relayer/v1/execute" \
  -H "content-type: application/json" \
  --data-binary @"$execute_body_file" | tee "$OUT_DIR/relayer.execute.json"
echo
execute_ok="$(py_get "$OUT_DIR/relayer.execute.json" ok)"
execute_accepted="$(py_get "$OUT_DIR/relayer.execute.json" accepted)"
approve_hash="$(py_get "$OUT_DIR/relayer.execute.json" approve_tx.tx_hash)"
swap_hash="$(py_get "$OUT_DIR/relayer.execute.json" swap_tx.tx_hash)"
redeemable_after="$(py_get "$OUT_DIR/relayer.execute.json" redeem_result.redeemable)"

python3 - "$execute_ok" "$execute_accepted" "$approve_hash" "$swap_hash" "$redeemable_after" <<'PY'
import sys
ok_raw, accepted_raw, approve_hash, swap_hash, redeemable_after = sys.argv[1:]
ok = str(ok_raw).lower() == "true"
accepted = str(accepted_raw).lower() == "true"
if not ok:
    raise SystemExit("[fail] execute ok != true")
if not accepted:
    raise SystemExit("[fail] execute accepted != true")
if not approve_hash or approve_hash == "None":
    raise SystemExit("[fail] missing approve tx hash")
if not swap_hash or swap_hash == "None":
    raise SystemExit("[fail] missing swap tx hash")
try:
    ra = float(redeemable_after)
except Exception:
    raise SystemExit(f"[fail] redeem_result.redeemable not numeric: {redeemable_after!r}")
if ra < 0:
    raise SystemExit(f"[fail] redeem_result.redeemable negative: {ra}")
print(f"[ok] execute validated: approve={approve_hash}, swap={swap_hash}, redeemable_after={ra}")
PY
if [[ "$quote_ok" != "True" && "$quote_ok" != "true" ]]; then
  echo "[fail] relayer quote failed" >&2
  exit 1
fi
