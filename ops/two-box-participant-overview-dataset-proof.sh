#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
REMOTE_HOST="${ALIEN##*@}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-http://${REMOTE_HOST}:4100}"
ACCOUNT="${ACCOUNT:-participant-overview-user-$(date +%Y%m%d-%H%M%S)}"
WHO="${WHO:-zoso}"
TS_NOW="$(date +%Y%m%d-%H%M%S)"
PLAINTEXT="${PLAINTEXT:-participant overview dataset proof ${TS_NOW}}"
OUT_DIR="${OUT_DIR:-/tmp/two-box-participant-overview-dataset-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT_DIR"

jget() {
  curl -fsS --max-time "${2:-20}" "$1"
}

echo "=== [1] baseline overview + recent surfaces ==="
jget "$REMOTE_NODE_BASE/participant?account=$ACCOUNT" 20 > "$OUT_DIR/participant.before.html"
jget "$REMOTE_NODE_BASE/datanet/v1/local-jobs/recent?who=$WHO&limit=12" 20 > "$OUT_DIR/recent.before.json"

python3 - "$OUT_DIR/participant.before.html" "$OUT_DIR/recent.before.json" "$ACCOUNT" <<'PY'
from pathlib import Path
import json, sys

html = Path(sys.argv[1]).read_text()
recent = json.loads(Path(sys.argv[2]).read_text())
acct = sys.argv[3]

assert "<title>VOID Participant</title>" in html, "participant title missing"
assert ('window.__void_participant_account_qs=' + json.dumps(acct)) in html, "participant bootstrap account missing"

items = recent.get("items") or []
assert isinstance(items, list), "recent items malformed"

print("[ok] baseline overview/recent surfaces look sane")
print(json.dumps({
    "ok": True,
    "participant_account": acct,
    "recent_count": len(items),
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
for i in $(seq 1 20); do
  echo "--- poll $i/20 ---"
  OUT="$(jget "$REMOTE_NODE_BASE/jobs/$JOB_ID" 15)"
  printf '%s\n' "$OUT" | tee "$OUT_DIR/job.poll.$i.json"
  STATUS="$(printf '%s\n' "$OUT" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("job",{}).get("status",""))')"
  echo "status=$STATUS"
  [ "$STATUS" = "completed" ] && break
  sleep 2
done
test "$STATUS" = "completed"
printf '%s\n' "$OUT" > "$OUT_DIR/job.final.json"

RECEIPT_ID="$(printf '%s\n' "$OUT" | python3 -c 'import sys,json; o=json.load(sys.stdin); rs=o.get("receipts",[]); print((rs[0] if rs else {}).get("receipt_id",""))')"
DATASET_ID="$(printf '%s\n' "$OUT" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("job",{}).get("dataset_id",""))')"
INPUT_HASH="$(printf '%s\n' "$OUT" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("job",{}).get("input_hash",""))')"
OUTPUT_HASH="$(printf '%s\n' "$OUT" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("job",{}).get("output_hash",""))')"
test -n "$RECEIPT_ID"
test -n "$DATASET_ID"

echo
echo "=== [4] verify recent endpoint carries the new dataset ==="
jget "$REMOTE_NODE_BASE/datanet/v1/local-jobs/recent?who=$WHO&limit=20" 20 > "$OUT_DIR/recent.after.json"
python3 - "$OUT_DIR/recent.after.json" "$DATASET_ID" "$RECEIPT_ID" <<'PY'
from pathlib import Path
import json, sys

recent = json.loads(Path(sys.argv[1]).read_text())
dsid = sys.argv[2]
rcpt = sys.argv[3]
items = recent.get("items") or []
match = None
for it in items:
    if str(it.get("dataset_id") or "") == dsid:
        match = it
        break

assert match is not None, "new dataset missing from recent endpoint"
assert str(match.get("viewer_url") or "").startswith("/datanet/view/"), "viewer_url missing/bad"
assert str(match.get("raw_json_url") or "").startswith("/datanet/v1/local-job/"), "raw_json_url missing/bad"

print("[ok] recent endpoint includes the new dataset")
print(json.dumps({
    "ok": True,
    "dataset_id": dsid,
    "viewer_url": match.get("viewer_url"),
    "raw_json_url": match.get("raw_json_url"),
    "receipt_id_expected": rcpt,
}, indent=2))
PY

VIEWER_URL="$(python3 - "$OUT_DIR/recent.after.json" "$DATASET_ID" <<'PY'
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
RAW_URL="$(python3 - "$OUT_DIR/recent.after.json" "$DATASET_ID" <<'PY'
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

echo
echo "=== [5] verify participant page + viewer/raw payloads ==="
jget "$REMOTE_NODE_BASE/participant?account=$ACCOUNT" 20 > "$OUT_DIR/participant.after.html"
jget "$REMOTE_NODE_BASE$VIEWER_URL" 20 > "$OUT_DIR/viewer.html"
jget "$REMOTE_NODE_BASE$RAW_URL" 20 > "$OUT_DIR/raw.json"
jget "$REMOTE_NODE_BASE/receipts?account=$ACCOUNT" 15 > "$OUT_DIR/receipts.after.json"

python3 - "$OUT_DIR/participant.after.html" "$OUT_DIR/viewer.html" "$OUT_DIR/raw.json" "$OUT_DIR/receipts.after.json" "$ACCOUNT" "$DATASET_ID" "$RECEIPT_ID" "$PLAINTEXT" "$INPUT_HASH" "$OUTPUT_HASH" <<'PY'
from pathlib import Path
import json, sys

participant_html = Path(sys.argv[1]).read_text()
viewer_html = Path(sys.argv[2]).read_text()
raw = json.loads(Path(sys.argv[3]).read_text())
receipts = json.loads(Path(sys.argv[4]).read_text())
acct, dsid, rcpt, plaintext, ih, oh = sys.argv[5:11]

assert ('window.__void_participant_account_qs=' + json.dumps(acct)) in participant_html, "participant account bootstrap missing after publish"
assert "DataNet" in participant_html, "participant page missing datanet text after publish"

assert "DataNet Viewer" in viewer_html, "viewer title missing"
assert "Open raw JSON" in viewer_html, "viewer raw button missing"
assert "Plaintext" in viewer_html, "viewer plaintext section missing"

assert raw.get("ok") is True, "raw local-job not ok"
assert str(raw.get("id") or "") == dsid, "raw local-job id mismatch"
assert str(raw.get("plaintext") or "") == plaintext, "raw plaintext mismatch"
assert str(raw.get("sha256") or "") == ih, "raw sha256/input hash mismatch"

rs = receipts.get("receipts") or []
rmatch = None
for r in rs:
    if str(r.get("receipt_id") or "") == rcpt:
        rmatch = r
        break
assert rmatch is not None, "receipt id missing from receipts view"
assert str(rmatch.get("dataset_id") or "") == dsid, "receipt dataset_id mismatch"
assert str(rmatch.get("input_hash") or "") == ih, "receipt input_hash mismatch"
assert str(rmatch.get("output_hash") or "") == oh, "receipt output_hash mismatch"

print("[ok] participant/viewer/raw/receipts all agree on the new dataset")
print(json.dumps({
    "ok": True,
    "dataset_id": dsid,
    "receipt_id": rcpt,
    "sizeBytes": raw.get("sizeBytes"),
    "sha256": raw.get("sha256"),
}, indent=2))
PY

echo
echo "=== [6] success ==="
python3 - "$JOB_ID" "$RECEIPT_ID" "$DATASET_ID" "$INPUT_HASH" "$OUTPUT_HASH" "$VIEWER_URL" "$RAW_URL" <<'PY'
import json, sys
job_id, receipt_id, dataset_id, input_hash, output_hash, viewer_url, raw_url = sys.argv[1:8]
print(json.dumps({
  "ok": True,
  "job_id": job_id,
  "receipt_id": receipt_id,
  "dataset_id": dataset_id,
  "input_hash": input_hash,
  "output_hash": output_hash,
  "viewer_url": viewer_url,
  "raw_json_url": raw_url,
}, indent=2))
PY
echo "[ok] two-box participant overview dataset proof green"
echo "out=$OUT_DIR"
