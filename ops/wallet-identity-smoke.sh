#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
ACCOUNT="${ACCOUNT:-}"
WALLET="${WALLET:-}"
TIMEOUT_POLLS="${TIMEOUT_POLLS:-15}"
SLEEP_SECS="${SLEEP_SECS:-2}"

if [ -z "${ACCOUNT}" ]; then
  echo "[fail] ACCOUNT is required" >&2
  exit 1
fi

if [ -z "${WALLET}" ]; then
  WALLET="$ACCOUNT"
fi

OUT="/tmp/void-wallet-identity-smoke.$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

jget() {
  curl -fsS --max-time 15 "$1"
}

jpost() {
  local url="$1"
  local body="$2"
  curl -fsS --max-time 20 -H 'content-type: application/json' -X POST "$url" --data "$body"
}

json_get() {
  python3 - "$1" "$2" <<'PY'
import json, sys
p, key = sys.argv[1], sys.argv[2]
obj = json.load(open(p))
cur = obj
for part in key.split("."):
    if isinstance(cur, dict):
        cur = cur.get(part)
    else:
        cur = None
        break
print("" if cur is None else cur)
PY
}

num_assert_ge() {
  python3 - "$1" "$2" "$3" <<'PY'
import sys
a = float(sys.argv[1]); b = float(sys.argv[2]); msg = sys.argv[3]
if a < b:
    raise SystemExit(f"[fail] {msg}: {a} < {b}")
print(f"[ok] {msg}: {a} >= {b}")
PY
}

echo "=== [1] baseline ==="
jget "$BASE/wc/balance?account=$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))' "$ACCOUNT")" | tee "$OUT/balance.before.json"
echo
jget "$BASE/wc/redeemable?account=$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))' "$ACCOUNT")" | tee "$OUT/redeemable.before.json"
echo
jget "$BASE/wc/redeemed?account=$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))' "$ACCOUNT")&limit=10" | tee "$OUT/redeemed.before.json"
echo

BAL_BEFORE="$(json_get "$OUT/balance.before.json" balance)"
CNT_BEFORE="$(json_get "$OUT/balance.before.json" count)"
RED_BEFORE="$(json_get "$OUT/redeemable.before.json" redeemable)"

echo
echo "=== [2] submit wallet-identity job ==="
TS_NOW="$(date +%s)"
BODY="$(printf '{"account":"%s","kind":"datanet_publish","plaintext":"wallet identity smoke %s"}' "$ACCOUNT" "$TS_NOW")"
jpost "$BASE/jobs/submit" "$BODY" | tee "$OUT/job.submit.json"
echo

JOB_ID="$(json_get "$OUT/job.submit.json" job.job_id)"
if [ -z "$JOB_ID" ]; then
  echo "[fail] no job id returned" >&2
  exit 1
fi
echo "JOB_ID=$JOB_ID" | tee "$OUT/job.id.txt"

echo
echo "=== [3] poll jobs / receipts ==="
python3 - "$BASE" "$ACCOUNT" "$JOB_ID" "$OUT" "$TIMEOUT_POLLS" "$SLEEP_SECS" <<'PY'
import json, sys, time, urllib.request, urllib.parse

base, account, job_id, out, timeout_polls, sleep_secs = sys.argv[1:7]
timeout_polls = int(timeout_polls)
sleep_secs = float(sleep_secs)

def get(url):
    with urllib.request.urlopen(url, timeout=20) as r:
        return json.loads(r.read().decode())

acc_q = urllib.parse.quote(account)
found_job = None
found_receipt = None

for i in range(timeout_polls):
    jobs = get(f"{base}/jobs?account={acc_q}&limit=20")
    receipts = get(f"{base}/receipts?account={acc_q}&limit=20")
    with open(f"{out}/jobs.poll.{i}.json", "w") as f:
        json.dump(jobs, f, indent=2)
    with open(f"{out}/receipts.poll.{i}.json", "w") as f:
        json.dump(receipts, f, indent=2)

    for row in (jobs.get("jobs") or []):
        if str(row.get("job_id") or "") == job_id:
            found_job = row
            break
    for row in (receipts.get("receipts") or []):
        if str(row.get("job_id") or "") == job_id:
            found_receipt = row
            break

    done = found_job and str(found_job.get("status") or "") == "completed" and found_receipt
    if done:
        break
    time.sleep(sleep_secs)

res = {"found_job": found_job, "found_receipt": found_receipt}
print(json.dumps(res, indent=2))
with open(f"{out}/poll.result.json", "w") as f:
    json.dump(res, f, indent=2)
PY

echo
echo "=== [4] after submit ==="
jget "$BASE/wc/balance?account=$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))' "$ACCOUNT")" | tee "$OUT/balance.after.json"
echo
jget "$BASE/wc/redeemable?account=$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))' "$ACCOUNT")" | tee "$OUT/redeemable.after.json"
echo
jget "$BASE/wc/ledger?account=$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))' "$ACCOUNT")&limit=20" | tee "$OUT/ledger.after.json"
echo

BAL_AFTER="$(json_get "$OUT/balance.after.json" balance)"
CNT_AFTER="$(json_get "$OUT/balance.after.json" count)"
RED_AFTER="$(json_get "$OUT/redeemable.after.json" redeemable)"

echo
echo "=== [5] validate submit/receipt/credit loop ==="
python3 - "$OUT/poll.result.json" <<'PY'
import json, sys
obj = json.load(open(sys.argv[1]))
job = obj.get("found_job") or {}
rcpt = obj.get("found_receipt") or {}
if str(job.get("status") or "") != "completed":
    raise SystemExit(f"[fail] job not completed: {job}")
if not rcpt:
    raise SystemExit("[fail] receipt not found for submitted job")
print(f"[ok] completed job: {job.get('job_id')}")
print(f"[ok] receipt found: {rcpt.get('receipt_id')}")
PY

num_assert_ge "$BAL_AFTER" "$BAL_BEFORE" "balance non-decreasing after wallet job"
num_assert_ge "$CNT_AFTER" "$CNT_BEFORE" "ledger event count non-decreasing after wallet job"
num_assert_ge "$RED_AFTER" "0" "redeemable non-negative after wallet job"

echo
echo "=== [6] optional tiny redeem ==="
python3 - "$OUT/redeemable.after.json" <<'PY' > "$OUT/redeem.amount.txt"
import json, sys
obj = json.load(open(sys.argv[1]))
amt = float(obj.get("redeemable") or 0)
print("1" if amt >= 1 else "0")
PY
RA="$(cat "$OUT/redeem.amount.txt")"
echo "redeem_amount=$RA"

if [ "$RA" != "0" ]; then
  BODY="$(printf '{"account":"%s","amount":%s,"wallet":"%s"}' "$ACCOUNT" "$RA" "$WALLET")"
  jpost "$BASE/wc/redeem" "$BODY" | tee "$OUT/redeem.json"
  echo
  jget "$BASE/wc/redeemable?account=$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))' "$ACCOUNT")" | tee "$OUT/redeemable.final.json"
  echo
else
  echo '{"ok":false,"skipped":true,"reason":"no_redeemable_wc"}' | tee "$OUT/redeem.json"
  cp "$OUT/redeemable.after.json" "$OUT/redeemable.final.json"
fi

echo
echo "[ok] bundle: $OUT"
echo "[ok] run summary:"
echo "  ACCOUNT=$ACCOUNT"
echo "  WALLET=$WALLET"
echo "  JOB_ID=$JOB_ID"
echo "  OUT=$OUT"

echo
echo "=== [7] compact summary ==="
python3 - "$OUT/redeemable.before.json" "$OUT/redeemable.after.json" "$OUT/redeemable.final.json" "$OUT/poll.result.json" <<'PY'
import json, sys

before = json.load(open(sys.argv[1]))
after = json.load(open(sys.argv[2]))
final = json.load(open(sys.argv[3]))
poll = json.load(open(sys.argv[4]))

job = poll.get("found_job") or {}
rcpt = poll.get("found_receipt") or {}

def num(obj, key):
    try:
        return float(obj.get(key) or 0)
    except Exception:
        return 0.0

print(f"job_id={job.get('job_id')}")
print(f"job_status={job.get('status')}")
print(f"receipt_id={rcpt.get('receipt_id')}")
print(f"earned_before={num(before,'earned'):g}")
print(f"earned_after={num(after,'earned'):g}")
print(f"earned_final={num(final,'earned'):g}")
print(f"redeemed_before={num(before,'redeemed'):g}")
print(f"redeemed_after={num(after,'redeemed'):g}")
print(f"redeemed_final={num(final,'redeemed'):g}")
print(f"redeemable_before={num(before,'redeemable'):g}")
print(f"redeemable_after={num(after,'redeemable'):g}")
print(f"redeemable_final={num(final,'redeemable'):g}")
print(f"delta_earned_submit={num(after,'earned') - num(before,'earned'):g}")
print(f"delta_redeemed_total={num(final,'redeemed') - num(before,'redeemed'):g}")
print(f"delta_redeemable_total={num(final,'redeemable') - num(before,'redeemable'):g}")
PY
