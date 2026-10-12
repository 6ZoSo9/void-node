#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
ACCOUNT="${ACCOUNT:-runner-verify-user-$(date +%Y%m%d-%H%M%S)}"
OUT="${OUT:-/tmp/two-box-runner-verify-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== [1] seed one local ds_* candidate with normal publish ==="
PUBLISH="$(curl -fsS --max-time 10 -H 'content-type: application/json' -X POST "$BASE/jobs/submit" --data "{\"account\":\"$ACCOUNT\",\"kind\":\"datanet_publish\",\"plaintext\":\"runner verify seed $(date +%s)\"}")"
printf '%s\n' "$PUBLISH" | tee "$OUT/publish.json"
JOB_ID="$(printf '%s\n' "$PUBLISH" | python3 -c 'import sys,json; o=json.load(sys.stdin); print((o.get("job") or {}).get("job_id",""))')"
test -n "$JOB_ID"
for i in $(seq 1 20); do
  J="$(curl -fsS --max-time 10 "$BASE/jobs/$JOB_ID")"
  printf '%s\n' "$J" | tee "$OUT/publish-job-$i.json" >/dev/null
  S="$(printf '%s\n' "$J" | python3 -c 'import sys,json; print((json.load(sys.stdin).get("job") or {}).get("status",""))')"
  echo "publish_status=$S poll=$i"
  [ "$S" = "completed" ] && break
  sleep 1
done
DATASET_ID="$(printf '%s\n' "$J" | python3 -c 'import sys,json; print((json.load(sys.stdin).get("job") or {}).get("dataset_id",""))')"
echo "dataset_id=$DATASET_ID"
test -n "$DATASET_ID"

echo
echo "=== [2] enable runner verify/redundancy and disable publish for this account ==="
curl -fsS --max-time 10 -H 'content-type: application/json' -X POST "$BASE/wc/runner/config" \
  --data "{\"account\":\"$ACCOUNT\",\"safe_mode\":false,\"min_submit_gap_ms\":5000,\"max_jobs_per_hour\":20,\"allow_datanet_publish\":false,\"allow_datanet_fetch_verify\":true,\"allow_datanet_redundancy_check\":true}" \
  | tee "$OUT/runner-config-set.json"
echo
curl -fsS --max-time 10 -H 'content-type: application/json' -X POST "$BASE/wc/runner/set" \
  --data "{\"account\":\"$ACCOUNT\",\"enabled\":true}" \
  | tee "$OUT/runner-set.json"
echo

echo
echo "=== [3] tick runner repeatedly ==="
for i in $(seq 1 12); do
  T="$(curl -fsS --max-time 15 -H 'content-type: application/json' -X POST "$BASE/wc/runner/tick" --data "{\"account\":\"$ACCOUNT\"}")"
  printf '%s\n' "$T" | tee "$OUT/tick-$i.json"
  python3 - "$OUT/tick-$i.json" <<'PY'
import json, sys
o = json.load(open(sys.argv[1]))
runner = o.get("runner") or {}
last = runner.get("last_result") or {}
submit = o.get("submit") or {}
print("tick_summary=" + json.dumps({
    "selected_task_class": last.get("selected_task_class"),
    "selected_dataset_id": last.get("selected_dataset_id"),
    "selection_reason": last.get("selection_reason"),
    "job_id": last.get("job_id"),
    "submit_ok": submit.get("ok"),
    "submit_skipped": submit.get("skipped"),
    "submit_reason": submit.get("reason"),
}, separators=(",",":")))
PY
  sleep 1
done

echo
echo "=== [4] final status + receipts ==="
curl -fsS --max-time 10 "$BASE/wc/runner/status?account=$ACCOUNT" | tee "$OUT/runner-status-after.json"
echo
curl -fsS --max-time 10 "$BASE/receipts?account=$ACCOUNT" | tee "$OUT/receipts-after.json"
echo

echo
echo "=== [5] assert runner selected both verify and redundancy ==="
python3 - "$OUT"/tick-*.json <<'PY'
import json, sys

verify_hits = []
redund_hits = []

for path in sys.argv[1:]:
    try:
        o = json.load(open(path))
    except Exception:
        continue
    runner = o.get("runner") or {}
    last = runner.get("last_result") or {}
    klass = str(last.get("selected_task_class") or "")
    dsid = str(last.get("selected_dataset_id") or "")
    job_id = str(last.get("job_id") or "")
    if klass == "datanet_fetch_verify":
        verify_hits.append((path, dsid, job_id))
    if klass == "datanet_redundancy_check":
        redund_hits.append((path, dsid, job_id))

assert verify_hits, "runner never selected datanet_fetch_verify"
assert redund_hits, "runner never selected datanet_redundancy_check"

v_path, v_dsid, v_job = verify_hits[0]
r_path, r_dsid, r_job = redund_hits[0]

assert v_dsid.startswith("ds_"), f"verify dataset not ds_*: {v_dsid}"
assert r_dsid.startswith("ds_"), f"redundancy dataset not ds_*: {r_dsid}"
assert v_job.startswith("job_"), f"verify job_id missing: {v_job}"
assert r_job.startswith("job_"), f"redundancy job_id missing: {r_job}"

print("[ok] runner selected real verify and redundancy tasks")
print(json.dumps({
    "ok": True,
    "verify": {
        "tick_file": v_path,
        "dataset_id": v_dsid,
        "job_id": v_job
    },
    "redundancy": {
        "tick_file": r_path,
        "dataset_id": r_dsid,
        "job_id": r_job
    }
}, indent=2))
PY

echo
echo "=== [6] success ==="
echo "[ok] runner verify/redundancy proof green"
