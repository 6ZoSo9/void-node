#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

NODE_BASE="${NODE_BASE:-http://127.0.0.1:4100}"
HELPER_BASE="${HELPER_BASE:-http://127.0.0.1:4312/workcredits/devnet}"
RELAYER_BASE="${RELAYER_BASE:-http://127.0.0.1:4313/api/wc-relayer/v1}"
ACCOUNT="${ACCOUNT:-demo-user}"
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
need rg

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
jget "$HELPER_BASE/dashboard/$WALLET.json" | tee "$OUT_DIR/dashboard.before.json"
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
before_dashboard_pending="$(py_get "$OUT_DIR/dashboard.before.json" account.earnings.pending_wc)"
before_dashboard_redeemed="$(py_get "$OUT_DIR/dashboard.before.json" account.earnings.redeemed_wc)"

echo "=== [4] submit job ==="
jpost "$NODE_BASE/jobs/submit" "{\"account\":\"$ACCOUNT\",\"kind\":\"datanet_publish\",\"plaintext\":\"$PLAINTEXT\"}" | tee "$OUT_DIR/job.submit.json"
echo

job_id="$(py_get "$OUT_DIR/job.submit.json" job.job_id)"
if [[ -z "$job_id" ]]; then
  echo "[fail] no job_id returned from submit" >&2
  exit 1
fi
echo "[ok] job_id=$job_id"

echo "=== [5] wait for job completion ==="
job_done=0
for i in $(seq 1 "$JOB_WAIT_LOOPS"); do
  echo "--- poll $i/$JOB_WAIT_LOOPS"
  jget "$NODE_BASE/jobs/$job_id" | tee "$OUT_DIR/job.status.$i.json"
  status="$(py_get "$OUT_DIR/job.status.$i.json" job.status)"
  echo "status=$status"
  if [[ "$status" == "completed" ]]; then
    job_done=1
    cp -a "$OUT_DIR/job.status.$i.json" "$OUT_DIR/job.status.final.json"
    break
  fi
  if [[ "$status" == "failed" ]]; then
    echo "[fail] job failed" >&2
    exit 1
  fi
  sleep "$JOB_WAIT_SECS"
done
if [[ "$job_done" != "1" ]]; then
  echo "[fail] job did not complete in time" >&2
  exit 1
fi

echo
echo "=== [6] receipts after job ==="
jget "$NODE_BASE/receipts?account=$ACCOUNT&limit=10" | tee "$OUT_DIR/receipts.after-job.json"
echo
receipt_count="$(py_get "$OUT_DIR/receipts.after-job.json" receipts.0.receipt_id)"
if [[ -z "$receipt_count" ]]; then
  echo "[fail] no receipt found after completed job" >&2
  exit 1
fi

echo "=== [7] WC after job ==="
jget "$NODE_BASE/wc/balance?account=$ACCOUNT" | tee "$OUT_DIR/wc.balance.after-job.json"
echo
jget "$NODE_BASE/wc/redeemable?account=$ACCOUNT" | tee "$OUT_DIR/wc.redeemable.after-job.json"
echo

after_balance_amt="$(py_get "$OUT_DIR/wc.balance.after-job.json" balance)"
after_redeemable_amt="$(py_get "$OUT_DIR/wc.redeemable.after-job.json" redeemable)"

python3 - "$before_balance_amt" "$after_balance_amt" "$before_redeemable_amt" "$after_redeemable_amt" <<'PY'
import sys
bb, ab, br, ar = map(float, sys.argv[1:])
if ab < bb:
    raise SystemExit("[fail] WC balance went down after job")
if ar < br:
    raise SystemExit("[fail] redeemable WC went down after job")
print(f"[ok] WC after job: balance {bb} -> {ab}, redeemable {br} -> {ar}")
PY

trade_amt="$TRADE_WC"
python3 - "$after_redeemable_amt" "$trade_amt" <<'PY'
import sys
redeemable=float(sys.argv[1]); trade=float(sys.argv[2])
if trade <= 0:
    raise SystemExit("[fail] TRADE_WC must be > 0")
if redeemable < trade:
    raise SystemExit(f"[fail] not enough redeemable WC for trade: redeemable={redeemable} trade={trade}")
print(f"[ok] trade request valid: redeemable={redeemable} trade={trade}")
PY

echo
echo "=== [8] relayer quote ==="
jpost "$RELAYER_BASE/quote" "{\"side\":\"wc_to_void\",\"amount\":$trade_amt,\"wallet\":\"$WALLET\"}" | tee "$OUT_DIR/relayer.quote.json"
echo
quote_ok="$(py_get "$OUT_DIR/relayer.quote.json" ok)"
if [[ "$quote_ok" != "True" && "$quote_ok" != "true" ]]; then
  echo "[fail] relayer quote failed" >&2
  exit 1
fi

echo "=== [9] execute trade ==="
jpost "$RELAYER_BASE/execute" "{\"side\":\"wc_to_void\",\"amount\":$trade_amt,\"account\":\"$ACCOUNT\",\"wallet\":\"$WALLET\"}" | tee "$OUT_DIR/relayer.execute.json"
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
jget "$HELPER_BASE/dashboard/$WALLET.json" | tee "$OUT_DIR/dashboard.after.json"
echo

redeem_result_earned="$(py_get "$OUT_DIR/relayer.execute.json" redeem_result.earned)"
redeem_result_redeemed="$(py_get "$OUT_DIR/relayer.execute.json" redeem_result.redeemed)"
redeem_result_redeemable="$(py_get "$OUT_DIR/relayer.execute.json" redeem_result.redeemable)"

python3 - "$redeem_result_earned" "$redeem_result_redeemed" "$redeem_result_redeemable" "$trade_amt" <<'PY'
import sys
earned_after, redeemed_after, redeemable_after, trade = map(float, sys.argv[1:])
expected_redeemable_after = earned_after - redeemed_after
if abs(redeemable_after - expected_redeemable_after) > 1e-9:
    raise SystemExit(f"[fail] redeem_result identity mismatch: earned={earned_after} redeemed={redeemed_after} redeemable={redeemable_after} expected={expected_redeemable_after}")
print(f"[ok] redeem_result trade effect: earned={earned_after}, redeemed={redeemed_after}, redeemable={redeemable_after}, trade={trade}")
PY

echo "=== [11] summary ==="
python3 - "$OUT_DIR" "$job_id" "$approve_hash" "$swap_hash" <<'PY'
import json, pathlib, sys
out = pathlib.Path(sys.argv[1])
job_id, approve_hash, swap_hash = sys.argv[2], sys.argv[3], sys.argv[4]
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

  "flow_before_pending_wc": before["account"]["earnings"]["pending_wc"],
  "flow_after_pending_wc": after["account"]["earnings"]["pending_wc"],
  "flow_before_redeemed_wc": before["account"]["earnings"]["redeemed_wc"],
  "flow_after_redeemed_wc": after["account"]["earnings"]["redeemed_wc"],

  "trade_before_pending_wc": trade_before["pending_wc"],
  "trade_after_pending_wc": trade_after["pending_wc"],
  "trade_before_redeemed_wc": trade_before["redeemed_wc"],
  "trade_after_redeemed_wc": trade_after["redeemed_wc"],

  "before_void": before["account"]["balances"]["void"],
  "after_void": after["account"]["balances"]["void"],
  "artifacts_dir": str(out),
}
print(json.dumps(summary, indent=2))
PY

echo
echo "[ok] demo artifacts: $OUT_DIR"
