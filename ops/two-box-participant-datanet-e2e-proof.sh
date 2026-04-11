#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
REMOTE_HOST="${ALIEN##*@}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-http://${REMOTE_HOST}:4100}"
ACCOUNT="${ACCOUNT:-participant-datanet-user-$(date +%Y%m%d-%H%M%S)}"
WHO="${WHO:-zoso}"
TS_NOW="$(date +%Y%m%d-%H%M%S)"
PLAINTEXT="${PLAINTEXT:-participant datanet e2e ${TS_NOW}}"
OUT_DIR="${OUT_DIR:-/tmp/two-box-participant-datanet-e2e-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT_DIR"

jget() {
  curl -fsS --max-time "${2:-15}" "$1"
}

jpost() {
  local url="$1"
  local body="$2"
  curl -fsS --max-time 20 -H 'content-type: application/json' -X POST "$url" --data "$body"
}

echo "=== [1] baseline remote participant + datanet surfaces ==="
jget "$REMOTE_NODE_BASE/participant?account=$ACCOUNT" 20 > "$OUT_DIR/participant.before.html"
jget "$REMOTE_NODE_BASE/datanet/v1/status" 15 > "$OUT_DIR/datanet.status.before.json"
jget "$REMOTE_NODE_BASE/datanet/v1/local-jobs/recent?who=$WHO&limit=8" 20 > "$OUT_DIR/local-jobs.before.json"

python3 - "$OUT_DIR/participant.before.html" "$OUT_DIR/datanet.status.before.json" "$OUT_DIR/local-jobs.before.json" "$ACCOUNT" <<'PY'
from pathlib import Path
import json, sys

html = Path(sys.argv[1]).read_text()
status = json.loads(Path(sys.argv[2]).read_text())
recent = json.loads(Path(sys.argv[3]).read_text())
acct = sys.argv[4]

assert "<title>VOID Participant</title>" in html, "participant title missing"
assert 'data-tab="datanet"' in html, "datanet tab missing"
assert 'id="pane-datanet"' in html, "datanet pane missing"
assert ('window.__void_participant_account_qs=' + json.dumps(acct)) in html, "participant bootstrap account missing"
assert status.get("ok") is True, "datanet status not ok"
assert isinstance(recent.get("items") or [], list), "recent local jobs malformed"

print("[ok] baseline participant + datanet surfaces look right")
print(json.dumps({
    "ok": True,
    "participant_account": acct,
    "datanet_ok": status.get("ok"),
    "recent_count": len(recent.get("items") or []),
}, indent=2))
PY

echo
echo "=== [2] submit remote datanet publish on Alienware ==="
REMOTE_SUBMIT="$(
  ssh -o BatchMode=yes -o ConnectTimeout=8 "$ALIEN" \
    "ACCOUNT='$ACCOUNT' PLAINTEXT='$PLAINTEXT' bash -s" <<'EOSSH'
set -euo pipefail
BODY="$(printf '{"account":"%s","kind":"datanet_publish","plaintext":"%s"}' "$ACCOUNT" "$PLAINTEXT")"
curl -fsS --max-time 15 -H 'content-type: application/json' \
  -X POST http://127.0.0.1:4100/jobs/submit \
  --data "$BODY"
EOSSH
)"
printf '%s\n' "$REMOTE_SUBMIT" | tee "$OUT_DIR/submit.json"

JOB_ID="$(printf '%s\n' "$REMOTE_SUBMIT" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("job",{}).get("job_id",""))')"
test -n "$JOB_ID"
echo "[ok] job_id=$JOB_ID"

echo
echo "=== [3] poll remote job until completed ==="
OUT=""
STATUS=""
RECEIPT_STATUS=""
for i in $(seq 1 20); do
  echo "--- poll $i/20 ---"
  OUT="$(jget "$REMOTE_NODE_BASE/jobs/$JOB_ID" 15)"
  printf '%s\n' "$OUT" | tee "$OUT_DIR/job.poll.$i.json"
  STATUS="$(printf '%s\n' "$OUT" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("job",{}).get("status",""))')"
  RECEIPT_STATUS="$(printf '%s\n' "$OUT" | python3 -c 'import sys,json; o=json.load(sys.stdin); rs=o.get("receipts",[]); print((rs[0] if rs else {}).get("status",""))')"
  echo "status=$STATUS receipt_status=$RECEIPT_STATUS"
  [ "$STATUS" = "completed" ] && break
  [ "$RECEIPT_STATUS" = "completed" ] && break
  sleep 2
done
test "$STATUS" = "completed" || test "$RECEIPT_STATUS" = "completed"
printf '%s\n' "$OUT" > "$OUT_DIR/job.final.json"

RECEIPT_ID="$(printf '%s\n' "$OUT" | python3 -c 'import sys,json; o=json.load(sys.stdin); rs=o.get("receipts",[]); print((rs[0] if rs else {}).get("receipt_id",""))')"
DATASET_ID="$(printf '%s\n' "$OUT" | python3 -c 'import sys,json; o=json.load(sys.stdin); job=o.get("job",{}); rs=o.get("receipts",[]); print(job.get("dataset_id","") or ((rs[0] if rs else {}).get("dataset_id","")))')"
INPUT_HASH="$(printf '%s\n' "$OUT" | python3 -c 'import sys,json; o=json.load(sys.stdin); job=o.get("job",{}); rs=o.get("receipts",[]); print(job.get("input_hash","") or ((rs[0] if rs else {}).get("input_hash","")))')"
OUTPUT_HASH="$(printf '%s\n' "$OUT" | python3 -c 'import sys,json; o=json.load(sys.stdin); job=o.get("job",{}); rs=o.get("receipts",[]); print(job.get("output_hash","") or ((rs[0] if rs else {}).get("output_hash","")))')"
test -n "$RECEIPT_ID"
test -n "$DATASET_ID"

echo
echo "=== [4] verify participant/account/receipts surfaces from Precision against remote ==="
jget "$REMOTE_NODE_BASE/participant?account=$ACCOUNT" 20 > "$OUT_DIR/participant.after.html"
jget "$REMOTE_NODE_BASE/receipts?account=$ACCOUNT" 15 > "$OUT_DIR/receipts.after.json"
jget "$REMOTE_NODE_BASE/datanet/v1/local-jobs/recent?who=$WHO&limit=20" 20 > "$OUT_DIR/local-jobs.after.json"

python3 - "$OUT_DIR/participant.after.html" "$OUT_DIR/receipts.after.json" "$OUT_DIR/local-jobs.after.json" "$ACCOUNT" "$DATASET_ID" "$RECEIPT_ID" "$INPUT_HASH" "$OUTPUT_HASH" <<'PY'
from pathlib import Path
import json, sys

html = Path(sys.argv[1]).read_text()
receipts = json.loads(Path(sys.argv[2]).read_text())
recent = json.loads(Path(sys.argv[3]).read_text())
acct, dsid, rcpt, ih, oh = sys.argv[4:9]

assert ('window.__void_participant_account_qs=' + json.dumps(acct)) in html, "participant account bootstrap missing after publish"
assert "Local DataNet Datasets" in html, "participant datanet section missing after publish"

rs = receipts.get("receipts") or []
assert any(str(r.get("receipt_id") or "") == rcpt for r in rs), "receipt id missing from receipts view"
assert any(str(r.get("dataset_id") or "") == dsid for r in rs), "dataset id missing from receipts view"
assert any(str(r.get("input_hash") or "") == ih for r in rs), "input_hash missing from receipts view"
assert any(str(r.get("output_hash") or "") == oh for r in rs), "output_hash missing from receipts view"

items = recent.get("items") or []
match = None
for it in items:
    if str(it.get("dataset_id") or "") == dsid:
        match = it
        break
assert match is not None, "dataset missing from recent local jobs"
assert str(match.get("viewer_url") or "").startswith("/datanet/view/"), "viewer_url missing/bad"
assert str(match.get("raw_json_url") or "").startswith("/datanet/v1/local-job/"), "raw_json_url missing/bad"

print("[ok] participant/receipts/local-jobs surfaces include the new dataset")
print(json.dumps({
    "ok": True,
    "dataset_id": dsid,
    "receipt_id": rcpt,
    "viewer_url": match.get("viewer_url"),
    "raw_json_url": match.get("raw_json_url"),
}, indent=2))
PY

VIEWER_URL="$(python3 - "$OUT_DIR/local-jobs.after.json" "$DATASET_ID" <<'PY'
from pathlib import Path
import json, sys
items = (json.loads(Path(sys.argv[1]).read_text()).get("items") or [])
ds = sys.argv[2]
for it in items:
    if str(it.get("dataset_id") or "") == ds:
        print(str(it.get("viewer_url") or ""))
        break
PY
)"
RAW_URL="$(python3 - "$OUT_DIR/local-jobs.after.json" "$DATASET_ID" <<'PY'
from pathlib import Path
import json, sys
items = (json.loads(Path(sys.argv[1]).read_text()).get("items") or [])
ds = sys.argv[2]
for it in items:
    if str(it.get("dataset_id") or "") == ds:
        print(str(it.get("raw_json_url") or ""))
        break
PY
)"
OPEN_DATASET_URL="/participant?account=${ACCOUNT}&open_dataset=${DATASET_ID}#datanet"
CONSUME_URL="/datanet/consume-view/${DATASET_ID}?who=${ACCOUNT}"

echo
echo "=== [5] verify viewer + raw dataset payload ==="
jget "$REMOTE_NODE_BASE$VIEWER_URL" 20 > "$OUT_DIR/viewer.html"
jget "$REMOTE_NODE_BASE$RAW_URL" 20 > "$OUT_DIR/raw.json"

python3 - "$OUT_DIR/viewer.html" "$OUT_DIR/raw.json" "$DATASET_ID" "$PLAINTEXT" <<'PY'
from pathlib import Path
import json, sys

html = Path(sys.argv[1]).read_text()
raw = json.loads(Path(sys.argv[2]).read_text())
dsid = sys.argv[3]
plaintext = sys.argv[4]

assert "DataNet Viewer" in html, "viewer title missing"
assert ("Open raw JSON" in html or "Open Dataset JSON" in html), "viewer raw button missing"
assert "Plaintext" in html, "viewer plaintext section missing"

assert raw.get("ok") is True, "raw local-job not ok"
assert str(raw.get("id") or "") == dsid, "raw local-job id mismatch"
assert isinstance(raw.get("plaintext"), str), "raw plaintext missing"
assert raw.get("plaintext") == plaintext, "raw plaintext mismatch"

print("[ok] viewer and raw dataset payload match the submitted plaintext")
print(json.dumps({
    "ok": True,
    "dataset_id": dsid,
    "sizeBytes": raw.get("sizeBytes"),
    "sha256": raw.get("sha256"),
}, indent=2))
PY

echo
echo "=== [6] verify participant open_dataset + consume viewer path ==="
jget "$REMOTE_NODE_BASE$OPEN_DATASET_URL" 20 > "$OUT_DIR/participant.open_dataset.html"
jget "$REMOTE_NODE_BASE$CONSUME_URL" 20 > "$OUT_DIR/consume-view.html"

python3 - "$OUT_DIR/participant.open_dataset.html" "$OUT_DIR/consume-view.html" "$DATASET_ID" "$ACCOUNT" "$PLAINTEXT" <<'PY'
from pathlib import Path
import json, sys

participant_html = Path(sys.argv[1]).read_text()
consume_html = Path(sys.argv[2]).read_text()
dsid = sys.argv[3]
acct = sys.argv[4]
plaintext = sys.argv[5]

assert ('window.__void_participant_account_qs=' + json.dumps(acct)) in participant_html, "participant open_dataset page missing account bootstrap"
assert 'id="datanetOpenByIdInput"' in participant_html, "participant open_dataset page missing open-by-id input"
assert 'id="datanetOpenByIdBtn"' in participant_html, "participant open_dataset page missing open-by-id button"
assert 'params.get("open_dataset")' in participant_html, "participant open_dataset page missing query-param preload logic"
assert ("Preloaded dataset id from page link:" in participant_html or "Preloaded shared participant link from page link. Extracted dataset " in participant_html or "Preloaded consume-view link from page link. Extracted dataset " in participant_html), "participant open_dataset page missing preload status logic"

assert ("Consume-and-view for dataset" in consume_html or "Open consume viewer" in consume_html), "consume-view header/actions missing"
assert dsid in consume_html, "consume-view page missing dataset id"
assert "Plaintext" in consume_html, "consume-view page missing plaintext section"
assert plaintext in consume_html, "consume-view page missing submitted plaintext"
assert ("Open Dataset JSON" in consume_html or "Open raw JSON" in consume_html), "consume-view page missing dataset json action"
assert "Copy Dataset ID" in consume_html, "consume-view page missing copy dataset action"
assert "Copy Consume Link" in consume_html, "consume-view page missing copy consume link action"
assert ("Back to Participant" in consume_html and "open_dataset=" in consume_html), "consume-view page missing participant back-link with open_dataset"

print("[ok] participant open_dataset preload hooks and consume-view paths render correctly")
print(json.dumps({
    "ok": True,
    "dataset_id": dsid,
    "account": acct,
    "participant_has_open_by_id_input": ('id="datanetOpenByIdInput"' in participant_html),
    "participant_has_open_by_id_btn": ('id="datanetOpenByIdBtn"' in participant_html),
    "participant_has_open_dataset_preload_logic": ('params.get("open_dataset")' in participant_html),
    "consume_view_has_plaintext": (plaintext in consume_html),
    "consume_view_has_copy_dataset_id": ("Copy Dataset ID" in consume_html),
    "consume_view_has_copy_consume_link": ("Copy Consume Link" in consume_html),
    "consume_view_has_back_to_participant": ("Back to Participant" in consume_html and "open_dataset=" in consume_html),
}, indent=2))
PY

echo
echo "=== [7] success ==="
python3 - "$JOB_ID" "$RECEIPT_ID" "$DATASET_ID" "$INPUT_HASH" "$OUTPUT_HASH" "$VIEWER_URL" "$RAW_URL" "$OPEN_DATASET_URL" "$CONSUME_URL" <<'PY'
import json, sys
job_id, receipt_id, dataset_id, input_hash, output_hash, viewer_url, raw_url, open_dataset_url, consume_url = sys.argv[1:10]
print(json.dumps({
  "ok": True,
  "job_id": job_id,
  "receipt_id": receipt_id,
  "dataset_id": dataset_id,
  "input_hash": input_hash,
  "output_hash": output_hash,
  "viewer_url": viewer_url,
  "raw_json_url": raw_url,
  "participant_open_dataset_url": open_dataset_url,
  "consume_view_url": consume_url,
}, indent=2))
PY
echo "[ok] two-box participant datanet e2e proof green"
echo "out=$OUT_DIR"
