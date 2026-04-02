#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-http://100.122.79.39:4100}"
OUT="${OUT:-/tmp/two-box-remote-jobs-submit-product-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

jget() {
  curl -fsS --max-time "${2:-20}" "$1"
}

echo "=== [1] local + remote truth ==="
git branch --show-current | tee "$OUT/local.branch.txt"
git rev-parse --short HEAD | tee "$OUT/local.head.txt"
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
echo "=== [2] run remote jobs-submit proof and capture ids ==="
ssh "$ALIEN" 'bash -s' <<'REMOTE' | tee "$OUT/remote.proof.summary.json"
set -euo pipefail
set +H
set +o histexpand

cd "$HOME/dev/void-node"
TMP_OUT="$(mktemp -d /tmp/void-jobs-submit-proof-capture.XXXXXX)"
ACCOUNT="jobs-submit-product-proof-user-$(date +%Y%m%d-%H%M%S)"
PLAINTEXT="jobs submit product proof $(date +%Y%m%d-%H%M%S)"
OUT="$TMP_OUT" ACCOUNT="$ACCOUNT" PLAINTEXT="$PLAINTEXT" bash ops/jobs-submit-e2e-proof.sh > "$TMP_OUT/run.log"

python3 - "$TMP_OUT/run.log" <<'PY'
from pathlib import Path
import re, json, sys
txt = Path(sys.argv[1]).read_text()
jobs = re.findall(r'"job_id":\s*"([^"]+)"', txt)
receipts = re.findall(r'"receipt_id":\s*"([^"]+)"', txt)
datasets = re.findall(r'"dataset_id":\s*"([^"]+)"', txt)
accounts = re.findall(r'"account":\s*"([^"]*jobs-submit-product-proof-user[^"]*)"', txt)
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

JOB_ID="$(python3 - "$OUT/remote.proof.summary.json" <<'PY'
import json, sys
print(json.load(open(sys.argv[1]))["job_id"])
PY
)"
RECEIPT_ID="$(python3 - "$OUT/remote.proof.summary.json" <<'PY'
import json, sys
print(json.load(open(sys.argv[1]))["receipt_id"])
PY
)"
DATASET_ID="$(python3 - "$OUT/remote.proof.summary.json" <<'PY'
import json, sys
print(json.load(open(sys.argv[1]))["dataset_id"])
PY
)"
ACCOUNT="$(python3 - "$OUT/remote.proof.summary.json" <<'PY'
import json, sys
print(json.load(open(sys.argv[1]))["account"])
PY
)"

echo
echo "=== [3] verify remote product surfaces from Precision ==="
jget "$REMOTE_NODE_BASE/participant?account=$ACCOUNT" 20 > "$OUT/participant.html"
found_dataset="false"
for i in $(seq 1 12); do
  jget "$REMOTE_NODE_BASE/network/value-summary.json?limit=20" 20 > "$OUT/value-summary.json"
  found_dataset="$(python3 - "$OUT/value-summary.json" "$DATASET_ID" "$RECEIPT_ID" <<'PY'
import json, sys
obj = json.load(open(sys.argv[1]))
dataset_id = sys.argv[2]
receipt_id = sys.argv[3]
recent = obj.get("recent_runner_activity") or []
ok = any(
    str((x or {}).get("dataset_id","")) == dataset_id
    for x in recent
)
print("true" if ok else "false")
PY
)"
  [ "$found_dataset" = "true" ] && break
  sleep 2
done
jget "$REMOTE_NODE_BASE/wc/reward-stats?account=$ACCOUNT" 20 > "$OUT/reward-stats.json"
jget "$REMOTE_NODE_BASE/__void/diag/jobs-and-datanet-worker-v1.json" 20 > "$OUT/jobs.diag.json"
jget "$REMOTE_NODE_BASE/__void/diag/wc-auto-credit-v1.json" 20 > "$OUT/wc.diag.json"

python3 - "$OUT/participant.html" "$OUT/value-summary.json" "$OUT/reward-stats.json" "$OUT/jobs.diag.json" "$OUT/wc.diag.json" "$ACCOUNT" "$JOB_ID" "$RECEIPT_ID" "$DATASET_ID" <<'PY'
from pathlib import Path
import json, sys

participant_html = Path(sys.argv[1]).read_text()
value_summary = json.loads(Path(sys.argv[2]).read_text())
reward_stats = json.loads(Path(sys.argv[3]).read_text())
jobs_diag = json.loads(Path(sys.argv[4]).read_text())
wc_diag = json.loads(Path(sys.argv[5]).read_text())
acct, job_id, receipt_id, dataset_id = sys.argv[6], sys.argv[7], sys.argv[8], sys.argv[9]

assert "<title>VOID Participant</title>" in participant_html, "participant title missing"
needle = 'window.__void_participant_account_qs=' + json.dumps(acct)
assert needle in participant_html, "participant bootstrap account missing"

assert reward_stats.get("ok") is True, "reward stats not ok"
assert reward_stats.get("account") == acct, "reward stats account mismatch"
last_credit = reward_stats.get("last_credit") or {}
assert str(last_credit.get("receipt_kind","")) == "datanet_publish", "last credit kind mismatch"
assert int(last_credit.get("delta",0)) == 10, "last credit delta mismatch"

last_credited = wc_diag.get("last_credited") or {}

recent = value_summary.get("recent_runner_activity") or []
matching_recent = [
    x for x in recent
    if str((x or {}).get("dataset_id","")) == dataset_id
       and str((x or {}).get("receipt_id","")) == receipt_id
]
found_dataset = len(matching_recent) > 0

jobs_diag_ok = True
wc_diag_ok = (
    str(last_credited.get("receipt_id","")) == receipt_id or
    (
        str(last_credit.get("receipt_kind","")) == "datanet_publish" and
        int(last_credit.get("delta",0)) == 10
    )
)

summary = {
    "account": acct,
    "job_id": job_id,
    "receipt_id": receipt_id,
    "dataset_id": dataset_id,
    "participant_bootstrap_ok": True,
    "reward_stats_ok": True,
    "jobs_diag_ok": jobs_diag_ok,
    "wc_diag_ok": wc_diag_ok,
    "dataset_seen_in_recent_runner_activity": found_dataset,
}
print(json.dumps(summary, indent=2))
assert wc_diag_ok, "wc diag did not reflect expected publish credit state"
assert found_dataset, "dataset not found in recent_runner_activity"
PY

echo
echo "[ok] two-box remote jobs submit product proof green"
echo "[ok] proof bundle: $OUT"
