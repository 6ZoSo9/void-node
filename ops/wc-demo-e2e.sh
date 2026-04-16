#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

NODE_BASE="${NODE_BASE:-http://127.0.0.1:4100}"
HELPER_BASE="${HELPER_BASE:-http://127.0.0.1:4312/workcredits/devnet}"
RELAYER_BASE="${RELAYER_BASE:-http://127.0.0.1:4313/api/wc-relayer/v1}"

if ! printf '%s' "$WALLET" | grep -Eq '^0x[0-9a-fA-F]{40}$'; then
  echo "[fail] WALLET must be a 0x-prefixed 20-byte EVM address; got: $WALLET" >&2
  exit 1
fi
ACCOUNT="${ACCOUNT:-${WC_ADDR:-demo-user}}"
WALLET="${WALLET:-0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266}"
PLAINTEXT="${PLAINTEXT:-wc-demo-e2e-$(date +%s)}"
TRADE_WC="${TRADE_WC:-1}"
JOB_WAIT_LOOPS="${JOB_WAIT_LOOPS:-20}"
JOB_WAIT_SECS="${JOB_WAIT_SECS:-2}"

OUT_DIR="${OUT_DIR:-/tmp/wc-demo-e2e-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT_DIR"

need() { command -v "$1" >/dev/null 2>&1 || { echo "[fail] missing command: $1" >&2; exit 1; }; }
need curl
need python3

jpost() {
  local url="$1"
  local body="$2"
  curl -fsS --max-time 15 \
    -H "content-type: application/json" \
    -d "$body" \
    "$url"
}

jget() {
  local url="$1"
  curl -fsS --max-time 15 "$url"
}

dashboard_get() {
  local out="$1"
  if jget "$HELPER_BASE/dashboard/$WALLET.json" | tee "$out"; then
    :
  else
    echo "[warn] helper dashboard route unavailable; continuing" >&2
    printf '%s\n' '{"ok":false,"account":{"earnings":{"diagnostic_pending_wc":0,"diagnostic_redeemed_wc":0}}}' > "$out"
  fi
}

py_get() {
  local file="$1"
  local expr="$2"
  python3 - "$file" "$expr" <<'PY'
import json, sys
p, expr = sys.argv[1], sys.argv[2]
obj = json.load(open(p))
parts = [x for x in expr.split(".") if x]
cur = obj
for part in parts:
    if isinstance(cur, list):
        cur = cur[int(part)]
    else:
        cur = cur.get(part)
print("" if cur is None else cur)
PY
}

echo "=== [1] stack health ==="
jget "$NODE_BASE/health" | tee "$OUT_DIR/node.health.json"
echo
jget "$HELPER_BASE/pool.json" | tee "$OUT_DIR/helper.pool.before.json"
echo
jget "$RELAYER_BASE/health" | tee "$OUT_DIR/relayer.health.json"
echo

echo "=== [2] dashboard before ==="
dashboard_get "$OUT_DIR/dashboard.before.json"
echo

echo "=== [3] local WC before ==="
jget "$NODE_BASE/wc/balance?account=$ACCOUNT" | tee "$OUT_DIR/wc.balance.before.json"
echo
jget "$NODE_BASE/wc/redeemable?account=$ACCOUNT" | tee "$OUT_DIR/wc.redeemable.before.json"
echo

before_redeemable="$(py_get "$OUT_DIR/wc.redeemable.before.json" ok)"
if [[ "$before_redeemable" != "True" && "$before_redeemable" != "true" ]]; then
  echo "[fail] could not read redeemable state before demo" >&2
  exit 1
fi

before_redeemable_amt="$(py_get "$OUT_DIR/wc.redeemable.before.json" redeemable)"
before_balance_amt="$(py_get "$OUT_DIR/wc.balance.before.json" balance)"
before_dashboard_pending="$(py_get "$OUT_DIR/dashboard.before.json" account.earnings.diagnostic_pending_wc)"
before_dashboard_redeemed="$(py_get "$OUT_DIR/dashboard.before.json" account.earnings.diagnostic_redeemed_wc)"

echo "=== [4] canonical publish ==="
BODY_B64="$(printf '%s' "$PLAINTEXT" | base64 -w0)"
curl -fsS --max-time 20 \
  -H 'content-type: application/json' \
  -X POST "${NODE_BASE}/datanet/v1/publish?who=${ACCOUNT}" \
  --data '{"name":"wc-demo-e2e.txt","mime":"text/plain","plaintext_b64":"'"$BODY_B64"'"}' \
  | tee "$OUT_DIR/publish.json"
echo

DATASET_ID="$(py_get "$OUT_DIR/publish.json" id)"
BYTES="$(py_get "$OUT_DIR/publish.json" sizeBytes)"
if [[ -z "$DATASET_ID" ]]; then
  echo "[fail] canonical publish did not return dataset id" >&2
  exit 1
fi
echo "[ok] dataset_id=$DATASET_ID"

echo "=== [5] fetch canonical dataset ==="
FETCH_OK=0
if jget "$NODE_BASE/datanet/v1/fetch?id=$DATASET_ID&who=$ACCOUNT" > "$OUT_DIR/fetch.after-publish.json"; then
  FETCH_OK=1
elif jget "$NODE_BASE/datanet/v1/fetch/$DATASET_ID?who=$ACCOUNT" > "$OUT_DIR/fetch.after-publish.json"; then
  FETCH_OK=1
elif jget "$NODE_BASE/datanet/v1/fetch2/$DATASET_ID?who=$ACCOUNT" > "$OUT_DIR/fetch.after-publish.json"; then
  FETCH_OK=1
fi

if [[ "$FETCH_OK" != "1" ]]; then
  echo "[fail] canonical fetch did not return dataset body" >&2
  exit 1
fi

cat "$OUT_DIR/fetch.after-publish.json"
echo

FETCH_B64="$(py_get "$OUT_DIR/fetch.after-publish.json" cipher_b64)"
if [[ -n "$FETCH_B64" && "$FETCH_B64" != "$BODY_B64" ]]; then
  echo "[fail] fetched dataset body did not match published plaintext" >&2
  exit 1
fi

echo "=== [6] post accepted receipt ==="
LEAF="$(py_get "$OUT_DIR/fetch.after-publish.json" manifest.chunks.0.leafHashHex)"
ROOT_FROM_FETCH="$(py_get "$OUT_DIR/fetch.after-publish.json" manifest.merkleRootHex)"
INDEX_FROM_FETCH="$(py_get "$OUT_DIR/fetch.after-publish.json" manifest.chunks.0.index)"

if [[ -z "$LEAF" || -z "$ROOT_FROM_FETCH" || -z "$INDEX_FROM_FETCH" ]]; then
  echo "[fail] canonical fetch response missing manifest fields required for accepted receipt" >&2
  exit 1
fi

PLAIN_SHA256="$LEAF"
RECEIPT_BODY="$(python3 - <<PY
import json
print(json.dumps({
  "who": "${ACCOUNT}",
  "account": "${ACCOUNT}",
  "id": "${DATASET_ID}",
  "root": "${ROOT_FROM_FETCH}",
  "leaf": "${LEAF}",
  "index": int("${INDEX_FROM_FETCH}"),
  "plain_sha256": "${PLAIN_SHA256}",
  "bytes": int("${BYTES}" or 0),
  "ok": True,
  "accepted": True,
  "verified": True,
}))
PY
)"
curl -fsS --max-time 20 \
  -H 'content-type: application/json' \
  -X POST "${NODE_BASE}/datanet/v1/receipt" \
  --data "$RECEIPT_BODY" | tee "$OUT_DIR/receipt.accepted.json"
echo

echo "=== [7] WC after explicit credit ==="
credit_ready=0
for i in $(seq 1 "${CREDIT_WAIT_LOOPS:-20}"); do
  jget "$NODE_BASE/wc/balance?account=$ACCOUNT" | tee "$OUT_DIR/wc.balance.creditwait.$i.json"
  echo
  jget "$NODE_BASE/wc/redeemable?account=$ACCOUNT" | tee "$OUT_DIR/wc.redeemable.creditwait.$i.json"
  echo

  after_balance_amt="$(py_get "$OUT_DIR/wc.balance.creditwait.$i.json" balance)"
  after_redeemable_amt="$(py_get "$OUT_DIR/wc.redeemable.creditwait.$i.json" redeemable)"

  if python3 - "$before_redeemable_amt" "$after_redeemable_amt" <<'PY'
import sys
br, ar = map(float, sys.argv[1:])
raise SystemExit(0 if ar > br else 1)
PY
  then
    cp -a "$OUT_DIR/wc.balance.creditwait.$i.json" "$OUT_DIR/wc.balance.after-job.json"
    cp -a "$OUT_DIR/wc.redeemable.creditwait.$i.json" "$OUT_DIR/wc.redeemable.after-job.json"
    credit_ready=1
    break
  fi

  sleep "${CREDIT_WAIT_SECS:-1}"
done

if [[ "$credit_ready" != "1" ]]; then
  echo "[fail] explicit accepted receipt did not create redeemable WC in time" >&2
  exit 1
fi

after_balance_amt="$(py_get "$OUT_DIR/wc.balance.after-job.json" balance)"
after_redeemable_amt="$(py_get "$OUT_DIR/wc.redeemable.after-job.json" redeemable)"

python3 - "$before_balance_amt" "$after_balance_amt" "$before_redeemable_amt" "$after_redeemable_amt" <<'PY'
import sys
bb, ab, br, ar = map(float, sys.argv[1:])
if ab < bb:
    raise SystemExit("[fail] WC balance went down after explicit credit")
if ar <= br:
    raise SystemExit("[fail] redeemable WC did not increase after explicit credit")
print(f"[ok] WC after explicit credit: balance {bb} -> {ab}, redeemable {br} -> {ar}")
PY

trade_amt="$(python3 - "$TRADE_WC" "$after_redeemable_amt" <<'PY'
import sys
req = float(sys.argv[1])
avail = float(sys.argv[2])
amt = min(req, avail)
if amt <= 0:
    raise SystemExit("[fail] no redeemable WC available to trade")
if abs(round(amt) - amt) < 1e-9:
    print(int(round(amt)))
else:
    print(amt)
PY
)"

echo "=== [7b] trade amount ==="
echo "trade_wc=$trade_amt"

echo "=== [8] relayer quote ==="
jpost "$RELAYER_BASE/quote" "{\"side\":\"wc_to_void\",\"amount\":$trade_amt,\"wallet\":\"$WALLET\"}" | tee "$OUT_DIR/relayer.quote.json"
echo
quote_ok="$(py_get "$OUT_DIR/relayer.quote.json" ok)"
if [[ "$quote_ok" != "True" && "$quote_ok" != "true" ]]; then
  echo "[fail] relayer quote failed" >&2
  exit 1
fi

echo "=== [9] execute trade ==="
curl -sS -D "$OUT_DIR/relayer.execute.headers" \
  -H 'content-type: application/json' \
  -d "{\"side\":\"wc_to_void\",\"amount\":$trade_amt,\"account\":\"$ACCOUNT\",\"wallet\":\"$WALLET\"}" \
  "$RELAYER_BASE/execute" \
  -o "$OUT_DIR/relayer.execute.json" || true
echo "--- execute headers ---"
sed -n '1,80p' "$OUT_DIR/relayer.execute.headers" || true
echo "--- execute body ---"
cat "$OUT_DIR/relayer.execute.json" || true
echo

exec_ok="$(py_get "$OUT_DIR/relayer.execute.json" ok)"
approve_hash="$(py_get "$OUT_DIR/relayer.execute.json" approve_tx.tx_hash)"
swap_hash="$(py_get "$OUT_DIR/relayer.execute.json" swap_tx.tx_hash)"
if [[ "$exec_ok" != "True" && "$exec_ok" != "true" ]]; then
  echo "[fail] relayer execute failed" >&2
  exit 1
fi
if [[ -z "$approve_hash" || -z "$swap_hash" ]]; then
  echo "[fail] execute did not return both tx hashes" >&2
  exit 1
fi

echo "=== [10] dashboard after trade ==="
dashboard_get "$OUT_DIR/dashboard.after.json"
echo

echo "=== [10b] local WC after execute ==="
jget "$NODE_BASE/wc/balance?account=$ACCOUNT" | tee "$OUT_DIR/wc.balance.after-execute.json"
echo
jget "$NODE_BASE/wc/redeemable?account=$ACCOUNT" | tee "$OUT_DIR/wc.redeemable.after-execute.json"
echo

redeem_result_earned="$(py_get "$OUT_DIR/relayer.execute.json" redeem_result.earned)"
redeem_result_redeemed="$(py_get "$OUT_DIR/relayer.execute.json" redeem_result.redeemed)"
redeem_result_redeemable="$(py_get "$OUT_DIR/relayer.execute.json" redeem_result.redeemable)"
after_execute_balance_amt="$(py_get "$OUT_DIR/wc.balance.after-execute.json" balance)"
after_execute_redeemable_amt="$(py_get "$OUT_DIR/wc.redeemable.after-execute.json" redeemable)"

python3 - "$redeem_result_earned" "$redeem_result_redeemed" "$redeem_result_redeemable" "$trade_amt" "$after_execute_redeemable_amt" <<'PY'
import sys
earned_after, redeemed_after, redeemable_after, trade, local_after_execute = map(float, sys.argv[1:])
expected_redeemable_after = earned_after - redeemed_after
if abs(redeemable_after - expected_redeemable_after) > 1e-9:
    raise SystemExit(f"[fail] redeem_result identity mismatch: earned={earned_after} redeemed={redeemed_after} redeemable={redeemable_after} expected={expected_redeemable_after}")
if abs(local_after_execute - redeemable_after) > 1e-9:
    raise SystemExit(f"[fail] local redeemable after execute mismatch: local={local_after_execute} redeem_result={redeemable_after}")
print(f"[ok] redeem_result trade effect: earned={earned_after}, redeemed={redeemed_after}, redeemable={redeemable_after}, trade={trade}")
PY

echo "=== [11] summary ==="
SUMMARY_JOB_ID="${job_id:-}"
python3 - "$OUT_DIR" "$SUMMARY_JOB_ID" "$approve_hash" "$swap_hash" "$before_redeemable_amt" "$after_redeemable_amt" "$after_execute_redeemable_amt" "$before_balance_amt" "$after_balance_amt" "$after_execute_balance_amt" "$trade_amt" <<'PY'
import json, pathlib, sys
out = pathlib.Path(sys.argv[1])
job_id, approve_hash, swap_hash = sys.argv[2], sys.argv[3], sys.argv[4]
before_redeemable = float(sys.argv[5])
after_credit_redeemable = float(sys.argv[6])
after_execute_redeemable = float(sys.argv[7])
before_balance = float(sys.argv[8])
after_credit_balance = float(sys.argv[9])
after_execute_balance = float(sys.argv[10])
trade_amt = float(sys.argv[11])

before = json.load(open(out / "dashboard.before.json"))
after = json.load(open(out / "dashboard.after.json"))
execute = json.load(open(out / "relayer.execute.json"))
trade_before = execute["helper_dashboard_before"]["account"]["earnings"]
trade_after = execute["helper_dashboard_after"]["account"]["earnings"]

summary = {
  "ok": True,
  "job_id": job_id,
  "approve_tx_hash": approve_hash,
  "swap_tx_hash": swap_hash,

  "participant_balance_before": before_balance,
  "participant_balance_after_credit": after_credit_balance,
  "participant_balance_after_execute": after_execute_balance,

  "participant_redeemable_before": before_redeemable,
  "participant_redeemable_after_credit": after_credit_redeemable,
  "participant_redeemable_after_execute": after_execute_redeemable,
  "trade_wc": trade_amt,

  "flow_before_pending_wc": before["account"]["earnings"]["diagnostic_pending_wc"],
  "flow_after_pending_wc": after["account"]["earnings"]["diagnostic_pending_wc"],
  "flow_before_redeemed_wc": before["account"]["earnings"]["diagnostic_redeemed_wc"],
  "flow_after_redeemed_wc": after["account"]["earnings"]["diagnostic_redeemed_wc"],

  "trade_before_pending_wc": trade_before["diagnostic_pending_wc"],
  "trade_after_pending_wc": trade_after["diagnostic_pending_wc"],
  "trade_before_redeemed_wc": trade_before["diagnostic_redeemed_wc"],
  "trade_after_redeemed_wc": trade_after["diagnostic_redeemed_wc"],

  "before_void": before["account"]["balances"]["void"],
  "after_void": after["account"]["balances"]["void"],
  "artifacts_dir": str(out),
}
print(json.dumps(summary, indent=2))
PY

echo
echo "[ok] demo artifacts: $OUT_DIR"
