#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-http://100.122.79.39:4100}"
OUT="${OUT:-/tmp/two-box-remote-datanet-view-proof-$(date +%Y%m%d-%H%M%S)}"
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
echo "=== [2] run remote jobs-submit product proof and capture ids ==="
ssh "$ALIEN" 'bash -s' <<'REMOTE' | tee "$OUT/remote.product.summary.json"
set -euo pipefail
set +H
set +o histexpand

cd "$HOME/dev/void-node"
TMP_OUT="$(mktemp -d /tmp/void-product-proof-capture.XXXXXX)"
ACCOUNT="datanet-view-proof-user-$(date +%Y%m%d-%H%M%S)"
PLAINTEXT="datanet view product proof $(date +%Y%m%d-%H%M%S)"
OUT="$TMP_OUT" ACCOUNT="$ACCOUNT" PLAINTEXT="$PLAINTEXT" bash ops/jobs-submit-e2e-proof.sh > "$TMP_OUT/run.log"

python3 - "$TMP_OUT/run.log" <<'PY'
from pathlib import Path
import re, json, sys
txt = Path(sys.argv[1]).read_text()
jobs = re.findall(r'"job_id":\s*"([^"]+)"', txt)
receipts = re.findall(r'"receipt_id":\s*"([^"]+)"', txt)
datasets = re.findall(r'"dataset_id":\s*"([^"]+)"', txt)
accounts = re.findall(r'"account":\s*"([^"]*datanet-view-proof-user[^"]*)"', txt)
summary = {
  "job_id": jobs[-1] if jobs else "",
  "receipt_id": receipts[-1] if receipts else "",
  "dataset_id": datasets[-1] if datasets else "",
  "account": accounts[-1] if accounts else "",
  "proof_ok": "[ok] proof bundle:" in txt and '"ledger_credit_found": true' in txt and '"receipt_found": true' in txt
}
print(json.dumps(summary))
if not summary["proof_ok"]:
    raise SystemExit("FAIL: remote jobs-submit proof did not pass")
PY
REMOTE

JOB_ID="$(python3 - "$OUT/remote.product.summary.json" <<'PY'
import json, sys
print(json.load(open(sys.argv[1]))["job_id"])
PY
)"
RECEIPT_ID="$(python3 - "$OUT/remote.product.summary.json" <<'PY'
import json, sys
print(json.load(open(sys.argv[1]))["receipt_id"])
PY
)"
DATASET_ID="$(python3 - "$OUT/remote.product.summary.json" <<'PY'
import json, sys
print(json.load(open(sys.argv[1]))["dataset_id"])
PY
)"
ACCOUNT="$(python3 - "$OUT/remote.product.summary.json" <<'PY'
import json, sys
print(json.load(open(sys.argv[1]))["account"])
PY
)"

echo
echo "=== [3] verify remote value-summary exposes the dataset ==="
jget "$REMOTE_NODE_BASE/network/value-summary.json?limit=20" 20 > "$OUT/value-summary.json"
python3 - "$OUT/value-summary.json" "$DATASET_ID" "$JOB_ID" "$RECEIPT_ID" "$ACCOUNT" <<'PY'
from pathlib import Path
import json, sys
vs = json.loads(Path(sys.argv[1]).read_text())
dataset_id, job_id, receipt_id, account = sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]
recent = vs.get("recent_runner_activity") or []
found = None
for item in recent:
    if str(item.get("dataset_id","")) == dataset_id:
        found = item
        break
assert found is not None, "dataset not present in recent_runner_activity"
assert str(found.get("job_id","")) == job_id, "job_id mismatch in recent_runner_activity"
assert str(found.get("receipt_id","")) == receipt_id, "receipt_id mismatch in recent_runner_activity"
assert str(found.get("account","")) == account, "account mismatch in recent_runner_activity"
print(json.dumps({
    "dataset_found_in_recent_runner_activity": True,
    "recent_item": found
}, indent=2))
PY

echo
echo "=== [4] fetch remote datanet view page from Precision ==="
VIEW_URL="$REMOTE_NODE_BASE/datanet/view/$(python3 - "$DATASET_ID" <<'PY'
import urllib.parse, sys
print(urllib.parse.quote(sys.argv[1], safe=""))
PY
)?who=$(python3 - "$ACCOUNT" <<'PY'
import urllib.parse, sys
print(urllib.parse.quote(sys.argv[1], safe=""))
PY
)"
echo "$VIEW_URL" | tee "$OUT/view-url.txt"
jget "$VIEW_URL" 20 > "$OUT/datanet-view.html"

python3 - "$OUT/datanet-view.html" "$DATASET_ID" "$ACCOUNT" <<'PY'
from pathlib import Path
import sys
html = Path(sys.argv[1]).read_text()
dataset_id, account = sys.argv[2], sys.argv[3]
checks = {
    "has_html": "<!doctype html>" in html.lower() or "<html" in html.lower(),
    "has_dataset_id": dataset_id in html,
    "has_account": account in html,
    "looks_like_view_page": ("datanet" in html.lower()) or ("dataset" in html.lower()) or ("local job" in html.lower()),
}
print(checks)
if not all([checks["has_html"], checks["has_dataset_id"], checks["looks_like_view_page"]]):
    raise SystemExit("FAIL: datanet view page missing expected content")
PY

echo
echo "=== [5] fetch remote raw/local job helpers too ==="
jget "$REMOTE_NODE_BASE/datanet/v1/local-job/$(python3 - "$DATASET_ID" <<'PY'
import urllib.parse, sys
print(urllib.parse.quote(sys.argv[1], safe=""))
PY
)" 20 > "$OUT/local-job.json" || true
jget "$REMOTE_NODE_BASE/datanet/v1/local-jobs/recent?limit=10" 20 > "$OUT/local-jobs-recent.json" || true

echo
echo "=== [6] summarize ==="
python3 - "$JOB_ID" "$RECEIPT_ID" "$DATASET_ID" "$ACCOUNT" "$OUT/value-summary.json" "$OUT/local-job.json" <<'PY'
from pathlib import Path
import json, sys
job_id, receipt_id, dataset_id, account = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
vs = json.loads(Path(sys.argv[5]).read_text())
local_job = None
try:
    local_job = json.loads(Path(sys.argv[6]).read_text())
except:
    local_job = None
summary = {
    "job_id": job_id,
    "receipt_id": receipt_id,
    "dataset_id": dataset_id,
    "account": account,
    "value_summary_ok": True,
    "local_job_helper_ok": bool(local_job),
}
print(json.dumps(summary, indent=2))
PY

echo
echo "[ok] two-box remote datanet view proof green"
echo "[ok] proof bundle: $OUT"
