#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-http://100.122.79.39:4100}"
OUT="${OUT:-/tmp/two-box-remote-verify-redundancy-product-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

jget() {
  curl -fsS --max-time "${2:-20}" "$1"
}

echo "=== [1] local + remote truth ==="
git branch --show-current | tee "$OUT/local.branch.txt"
git rev-parse --short HEAD | tee "$OUT/local.head.txt"
git describe --tags --abbrev=0 2>/dev/null | tee "$OUT/local.tag.txt" || true
ssh "$ALIEN" '
set -euo pipefail
cd "$HOME/dev/void-node"
echo "--- remote branch ---"
git branch --show-current
echo "--- remote head ---"
git rev-parse --short HEAD
echo "--- remote latest tag ---"
git describe --tags --abbrev=0 2>/dev/null || true
' | tee "$OUT/remote.truth.txt"

echo
echo "=== [2] remote seed publish, enable runner, and drive verify/redundancy ==="
ssh "$ALIEN" 'bash -s' <<'REMOTE' | tee "$OUT/remote.summary.json"
set -euo pipefail
set +H
set +o histexpand

cd "$HOME/dev/void-node"

ACCOUNT="verify-redundancy-proof-user-$(date +%Y%m%d-%H%M%S)"
PLAINTEXT="verify redundancy proof seed $(date +%Y%m%d-%H%M%S)"
export ACCOUNT

echo "--- seed publish through proven route ---"
BODY="$(python3 - "$ACCOUNT" "$PLAINTEXT" <<'PY'
import json, sys
print(json.dumps({
    "account": sys.argv[1],
    "kind": "datanet_publish",
    "plaintext": sys.argv[2]
}, separators=(',', ':')))
PY
)"
curl -fsS --max-time 15 -H 'content-type: application/json' -X POST http://127.0.0.1:4100/jobs/submit --data "$BODY" > /tmp/vr-seed-submit.json
cat /tmp/vr-seed-submit.json
echo

SEED_JOB_ID="$(python3 - /tmp/vr-seed-submit.json <<'PY'
import json, sys
obj = json.load(open(sys.argv[1]))
job = obj.get("job") or {}
print(job.get("job_id") or job.get("id") or obj.get("job_id") or obj.get("id") or "")
PY
)"
export SEED_JOB_ID

SEED_RECEIPT_ID=""
SEED_DATASET_ID=""
for i in $(seq 1 12); do
  curl -fsS --max-time 15 "http://127.0.0.1:4100/__void/diag/jobs-and-datanet-worker-v1.json" > /tmp/vr-seed-worker-diag.json
  SEED_RECEIPT_ID="$(python3 - /tmp/vr-seed-worker-diag.json <<'PY'
import json, sys
obj = json.load(open(sys.argv[1]))
print(obj.get("last_receipt_id") or "")
PY
)"
  SEED_DATASET_ID="$(python3 - "$HOME/dev/void-node/data_a/agent_v1/receipts.jsonl" "$SEED_JOB_ID" <<'PY'
from pathlib import Path
import json, sys
p = Path(sys.argv[1])
job_id = sys.argv[2]
dataset_id = ""
if p.exists():
    for line in p.read_text().splitlines():
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
        except:
            continue
        if str(obj.get("job_id","")) == job_id:
            dataset_id = str(obj.get("dataset_id",""))
print(dataset_id)
PY
)"
  [ -n "$SEED_DATASET_ID" ] && break
  sleep 2
done
export SEED_RECEIPT_ID
export SEED_DATASET_ID

if [ -z "$SEED_JOB_ID" ] || [ -z "$SEED_DATASET_ID" ]; then
  echo '{"ok":false,"error":"seed_publish_missing_ids"}'
  exit 1
fi

echo
echo "--- enable verify + redundancy and runner ---"
curl -fsS --max-time 15 -H 'content-type: application/json' -X POST http://127.0.0.1:4100/wc/runner/config --data "$(python3 - "$ACCOUNT" <<'PY'
import json, sys
print(json.dumps({
  "account": sys.argv[1],
  "safe_mode": False,
  "min_submit_gap_ms": 5000,
  "max_jobs_per_hour": 20,
  "allow_datanet_publish": False,
  "allow_datanet_fetch_verify": True,
  "allow_datanet_redundancy_check": True
}, separators=(',', ':')))
PY
)"
echo
curl -fsS --max-time 15 -H 'content-type: application/json' -X POST http://127.0.0.1:4100/wc/runner/set --data "$(python3 - "$ACCOUNT" <<'PY'
import json, sys
print(json.dumps({"account": sys.argv[1], "enabled": True}, separators=(',', ':')))
PY
)"
echo

VERIFY_JOB_ID=""
VERIFY_DATASET_ID=""
VERIFY_RECEIPT_ID=""
REDUNDANCY_JOB_ID=""
REDUNDANCY_DATASET_ID=""
REDUNDANCY_RECEIPT_ID=""

echo
echo "--- tick until verify observed ---"
for i in $(seq 1 12); do
  curl -fsS --max-time 15 -H 'content-type: application/json' -X POST http://127.0.0.1:4100/wc/runner/tick --data "$(python3 - "$ACCOUNT" <<'PY'
import json, sys
print(json.dumps({"account": sys.argv[1]}, separators=(',', ':')))
PY
)" > /tmp/vr-tick.json || true

  STATUS_JSON="$(curl -fsS --max-time 15 "http://127.0.0.1:4100/wc/runner/status?account=$ACCOUNT")"
  export STATUS_JSON
  TASK="$(python3 - <<'PY'
import json, os
obj = json.loads(os.environ["STATUS_JSON"])
print((obj.get("last_selected_task_class") or obj.get("active_task_class") or ""))
PY
)"
  DATASET="$(python3 - <<'PY'
import json, os
obj = json.loads(os.environ["STATUS_JSON"])
print((obj.get("last_selected_dataset_id") or ""))
PY
)"
  JOB="$(python3 - <<'PY'
import json, os
obj = json.loads(os.environ["STATUS_JSON"])
lr = obj.get("last_result") or {}
print((lr.get("job_id") or ""))
PY
)"
  if [ "$TASK" = "datanet_fetch_verify" ] && [ -n "$DATASET" ] && [ -n "$JOB" ]; then
    VERIFY_JOB_ID="$JOB"
    VERIFY_DATASET_ID="$DATASET"
    VERIFY_RECEIPT_ID="$(python3 - "$HOME/dev/void-node/data_a/agent_v1/receipts.jsonl" "$JOB" <<'PY'
from pathlib import Path
import json, sys
p = Path(sys.argv[1]); job_id = sys.argv[2]
rid = ""
if p.exists():
    for line in p.read_text().splitlines():
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
        except:
            continue
        if str(obj.get("job_id","")) == job_id:
            rid = str(obj.get("receipt_id",""))
print(rid)
PY
)"
    break
  fi
  sleep 2
done
export VERIFY_JOB_ID VERIFY_DATASET_ID VERIFY_RECEIPT_ID

echo
echo "--- tick until redundancy observed ---"
for i in $(seq 1 12); do
  curl -fsS --max-time 15 -H 'content-type: application/json' -X POST http://127.0.0.1:4100/wc/runner/tick --data "$(python3 - "$ACCOUNT" <<'PY'
import json, sys
print(json.dumps({"account": sys.argv[1]}, separators=(',', ':')))
PY
)" > /tmp/vr-tick2.json || true

  STATUS_JSON="$(curl -fsS --max-time 15 "http://127.0.0.1:4100/wc/runner/status?account=$ACCOUNT")"
  export STATUS_JSON
  TASK="$(python3 - <<'PY'
import json, os
obj = json.loads(os.environ["STATUS_JSON"])
print((obj.get("last_selected_task_class") or obj.get("active_task_class") or ""))
PY
)"
  DATASET="$(python3 - <<'PY'
import json, os
obj = json.loads(os.environ["STATUS_JSON"])
print((obj.get("last_selected_dataset_id") or ""))
PY
)"
  JOB="$(python3 - <<'PY'
import json, os
obj = json.loads(os.environ["STATUS_JSON"])
lr = obj.get("last_result") or {}
print((lr.get("job_id") or ""))
PY
)"
  if [ "$TASK" = "datanet_redundancy_check" ] && [ -n "$DATASET" ] && [ -n "$JOB" ]; then
    REDUNDANCY_JOB_ID="$JOB"
    REDUNDANCY_DATASET_ID="$DATASET"
    REDUNDANCY_RECEIPT_ID="$(python3 - "$HOME/dev/void-node/data_a/agent_v1/receipts.jsonl" "$JOB" <<'PY'
from pathlib import Path
import json, sys
p = Path(sys.argv[1]); job_id = sys.argv[2]
rid = ""
if p.exists():
    for line in p.read_text().splitlines():
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
        except:
            continue
        if str(obj.get("job_id","")) == job_id:
            rid = str(obj.get("receipt_id",""))
print(rid)
PY
)"
    break
  fi
  sleep 2
done
export REDUNDANCY_JOB_ID REDUNDANCY_DATASET_ID REDUNDANCY_RECEIPT_ID

python3 - <<'PY'
import json, os
summary = {
  "account": os.environ.get("ACCOUNT",""),
  "seed_job_id": os.environ.get("SEED_JOB_ID",""),
  "seed_receipt_id": os.environ.get("SEED_RECEIPT_ID",""),
  "seed_dataset_id": os.environ.get("SEED_DATASET_ID",""),
  "verify_job_id": os.environ.get("VERIFY_JOB_ID",""),
  "verify_receipt_id": os.environ.get("VERIFY_RECEIPT_ID",""),
  "verify_dataset_id": os.environ.get("VERIFY_DATASET_ID",""),
  "redundancy_job_id": os.environ.get("REDUNDANCY_JOB_ID",""),
  "redundancy_receipt_id": os.environ.get("REDUNDANCY_RECEIPT_ID",""),
  "redundancy_dataset_id": os.environ.get("REDUNDANCY_DATASET_ID",""),
}
print(json.dumps(summary))
PY
REMOTE

ACCOUNT="$(python3 - "$OUT/remote.summary.json" <<'PY'
from pathlib import Path
import json, sys
lines = [x.strip() for x in Path(sys.argv[1]).read_text().splitlines() if x.strip()]
print(json.loads(lines[-1])["account"])
PY
)"
VERIFY_DATASET_ID="$(python3 - "$OUT/remote.summary.json" <<'PY'
from pathlib import Path
import json, sys
lines = [x.strip() for x in Path(sys.argv[1]).read_text().splitlines() if x.strip()]
print(json.loads(lines[-1])["verify_dataset_id"])
PY
)"
REDUNDANCY_DATASET_ID="$(python3 - "$OUT/remote.summary.json" <<'PY'
from pathlib import Path
import json, sys
lines = [x.strip() for x in Path(sys.argv[1]).read_text().splitlines() if x.strip()]
print(json.loads(lines[-1])["redundancy_dataset_id"])
PY
)"

echo
echo "=== [3] verify remote product surfaces ==="
jget "$REMOTE_NODE_BASE/network/value-summary.json?limit=20" 20 > "$OUT/value-summary.json"
jget "$REMOTE_NODE_BASE/participant?account=$ACCOUNT" 20 > "$OUT/participant.html"
jget "$REMOTE_NODE_BASE/wc/runner/status?account=$ACCOUNT" 20 > "$OUT/runner-status.json"

python3 - "$OUT/value-summary.json" "$OUT/participant.html" "$OUT/runner-status.json" "$VERIFY_DATASET_ID" "$REDUNDANCY_DATASET_ID" <<'PY'
from pathlib import Path
import json, sys
vs = json.loads(Path(sys.argv[1]).read_text())
html = Path(sys.argv[2]).read_text()
runner = json.loads(Path(sys.argv[3]).read_text())
verify_dataset_id = sys.argv[4]
redundancy_dataset_id = sys.argv[5]

assert vs.get("ok") is True, "value summary not ok"
latest_verified = (vs.get("latest_verified_dataset") or {}).get("dataset_id") or ""
latest_redundancy = (vs.get("latest_redundancy_checked_dataset") or {}).get("dataset_id") or ""

assert verify_dataset_id, "verify dataset missing"
assert redundancy_dataset_id, "redundancy dataset missing"
assert latest_verified == verify_dataset_id, "latest_verified_dataset mismatch"
assert latest_redundancy == redundancy_dataset_id, "latest_redundancy_checked_dataset mismatch"

assert "Open verify" in html, "participant missing Open verify"
assert "Open check" in html, "participant missing Open check"

recent = vs.get("recent_runner_activity") or []
verify_seen = any(str(x.get("task_class","")) == "verify" and str(x.get("dataset_id","")) == verify_dataset_id for x in recent)
redundancy_seen = any(str(x.get("task_class","")) == "redundancy" and str(x.get("dataset_id","")) == redundancy_dataset_id for x in recent)

summary = {
  "latest_verified_dataset_ok": True,
  "latest_redundancy_checked_dataset_ok": True,
  "participant_has_open_verify": True,
  "participant_has_open_check": True,
  "verify_seen_in_recent_runner_activity": verify_seen,
  "redundancy_seen_in_recent_runner_activity": redundancy_seen,
  "runner_last_selected_task_class": runner.get("last_selected_task_class"),
  "runner_last_selected_dataset_id": runner.get("last_selected_dataset_id"),
}
print(json.dumps(summary, indent=2))
if not verify_seen:
    raise SystemExit("FAIL: verify dataset not seen in recent_runner_activity")
if not redundancy_seen:
    raise SystemExit("FAIL: redundancy dataset not seen in recent_runner_activity")
PY

echo
echo "[ok] two-box remote verify redundancy product proof green"
echo "[ok] proof bundle: $OUT"
