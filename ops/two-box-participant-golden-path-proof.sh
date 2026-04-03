#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
REMOTE_HOST="${ALIEN##*@}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-http://${REMOTE_HOST}:4100}"
REMOTE_RELAYER_BASE="${REMOTE_RELAYER_BASE:-http://${REMOTE_HOST}:4313/api/wc-relayer/v1}"
WHO="${WHO:-zoso}"
ACCOUNT="${ACCOUNT:-participant-golden-user-$(date +%Y%m%d-%H%M%S)}"
WALLET="${WALLET:-0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266}"
TS_NOW="$(date +%Y%m%d-%H%M%S)"
PLAINTEXT="${PLAINTEXT:-participant golden path ${TS_NOW}}"
OUT_DIR="${OUT_DIR:-/tmp/two-box-participant-golden-path-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT_DIR"

jget() {
  curl -fsS --max-time "${2:-20}" "$1"
}

echo "=== [1] baseline truth ==="
jget "$REMOTE_NODE_BASE/__void/ready.json" 10 > "$OUT_DIR/ready.before.json"
jget "$REMOTE_NODE_BASE/health" 10 > "$OUT_DIR/health.before.json"
jget "$REMOTE_NODE_BASE/participant?account=$ACCOUNT" 20 > "$OUT_DIR/participant.before.html"
jget "$REMOTE_NODE_BASE/datanet/v1/local-jobs/recent?who=$WHO&limit=12" 20 > "$OUT_DIR/recent.before.json"
jget "$REMOTE_RELAYER_BASE/health" 10 > "$OUT_DIR/relayer.before.json"

python3 - "$OUT_DIR/ready.before.json" "$OUT_DIR/health.before.json" "$OUT_DIR/participant.before.html" "$OUT_DIR/relayer.before.json" "$ACCOUNT" <<'PY'
from pathlib import Path
import json, sys
ready = json.loads(Path(sys.argv[1]).read_text())
health = json.loads(Path(sys.argv[2]).read_text())
html = Path(sys.argv[3]).read_text()
relayer = json.loads(Path(sys.argv[4]).read_text())
acct = sys.argv[5]

assert ready.get("ready") is True, "remote ready not true at baseline"
assert ready.get("gap") == 0, "remote gap not zero at baseline"
assert ready.get("txroot_live") == 1, "remote txroot_live not 1 at baseline"
assert health.get("ok") is True, "remote health not ok at baseline"
assert relayer.get("ok") is True, "relayer not ok at baseline"
assert relayer.get("can_quote") is True, "relayer quote false at baseline"
assert relayer.get("can_execute") is True, "relayer execute false at baseline"
assert ('window.__void_participant_account_qs=' + json.dumps(acct)) in html, "participant account bootstrap missing"
assert 'id="pane-overview"' in html, "overview pane missing"
assert 'id="pane-datanet"' in html, "datanet pane missing"
print("[ok] baseline participant golden-path surfaces look right")
PY

echo
echo "=== [2] submit remote datanet publish ==="
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
printf '%s\n' "$REMOTE_SUBMIT" > "$OUT_DIR/submit.json"
JOB_ID="$(printf '%s\n' "$REMOTE_SUBMIT" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("job",{}).get("job_id",""))')"
test -n "$JOB_ID"
echo "[ok] job_id=$JOB_ID"

echo
echo "=== [3] poll publish until completed ==="
OUT=""
STATUS=""
for i in $(seq 1 20); do
  OUT="$(jget "$REMOTE_NODE_BASE/jobs/$JOB_ID" 15)"
  printf '%s\n' "$OUT" > "$OUT_DIR/job.poll.$i.json"
  STATUS="$(printf '%s\n' "$OUT" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("job",{}).get("status",""))')"
  echo "poll=$i status=$STATUS"
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
echo "=== [4] verify overview/recent + datanet tab surfaces ==="
jget "$REMOTE_NODE_BASE/participant?account=$ACCOUNT" 20 > "$OUT_DIR/participant.after.html"
jget "$REMOTE_NODE_BASE/datanet/v1/local-jobs/recent?who=$WHO&limit=20" 20 > "$OUT_DIR/recent.after.json"
jget "$REMOTE_NODE_BASE/receipts?account=$ACCOUNT" 15 > "$OUT_DIR/receipts.after.json"

python3 - "$OUT_DIR/participant.after.html" "$OUT_DIR/recent.after.json" "$OUT_DIR/receipts.after.json" "$ACCOUNT" "$DATASET_ID" "$RECEIPT_ID" "$INPUT_HASH" "$OUTPUT_HASH" <<'PY'
from pathlib import Path
import json, re, sys
html = Path(sys.argv[1]).read_text()
recent = json.loads(Path(sys.argv[2]).read_text())
receipts = json.loads(Path(sys.argv[3]).read_text())
acct, dsid, rcpt, ih, oh = sys.argv[4:9]

assert ('window.__void_participant_account_qs=' + json.dumps(acct)) in html, "participant bootstrap account missing after publish"
assert "Recent DataNet Datasets" in html, "overview recent datasets panel missing"
assert "Local DataNet Datasets" in html, "datanet tab datasets panel missing"

items = recent.get("items") or []
assert len(items) > 0, "recent endpoint returned no items after publish"

match = None
for it in items:
    if str(it.get("dataset_id") or "") == dsid:
        match = it
        break
assert match is not None, "new dataset missing from recent endpoint"

viewer_url = str(match.get("viewer_url") or "")
raw_json_url = str(match.get("raw_json_url") or "")
assert viewer_url.startswith("/datanet/view/"), "viewer_url missing/bad"
assert raw_json_url.startswith("/datanet/v1/local-job/"), "raw_json_url missing/bad"

first = items[0]
assert str(first.get("dataset_id") or "") == dsid, "new dataset is not newest item in recent endpoint"

overview_block = re.search(r'<section class="tabpane" id="pane-overview">(.*?)<section class="tabpane" id="pane-work">', html, re.S)
assert overview_block, "could not isolate overview pane html"
overview_html = overview_block.group(1)

assert "Recent DataNet Datasets" in overview_html, "overview pane missing recent datasets heading"
assert 'id="recentDatasetsWrapOverview"' in overview_html, "overview pane missing recent datasets container"
assert 'id="latestDatasetOpenBtn"' in overview_html, "overview pane missing latest dataset open button"
assert 'id="latestDatasetOpenShareBtn"' in overview_html, "overview pane missing open shared page button"
assert 'id="latestDatasetShareBtn"' in overview_html, "overview pane missing copy share page button"
assert 'loading…' in overview_html or 'loading...' in overview_html, "overview shell missing loading state"

assert 'latestDatasetOpenShareBtn' in html, "open shared page js anchor missing"
assert 'latestDatasetShareBtn' in html, "copy share page js anchor missing"
assert '&open_dataset=' in html, "open_dataset share wiring missing"
assert '#datanet' in html, "datanet hash wiring missing"
assert 'Copied latest shared dataset page link.' in html, "copy share message missing"

boot_pos = html.find('window.__void_participant_account_qs=')
main_pos = html.find('(async () => {')
assert boot_pos >= 0, "participant query-account boot missing"
assert main_pos >= 0, "main participant script missing"
assert boot_pos < main_pos, "participant query-account boot does not precede main script"

assert 'params.get("open_dataset")' in html, "open_dataset prefill logic missing"
assert 'Preloaded dataset id from page link:' in html, "prefill status text missing"

assert str(first.get("dataset_id") or "") == dsid, "new dataset is not newest item in recent endpoint"

rs = receipts.get("receipts") or []
rmatch = None
for r in rs:
    if str(r.get("receipt_id") or "") == rcpt:
        rmatch = r
        break
assert rmatch is not None, "receipt missing from receipts view"
assert str(rmatch.get("dataset_id") or "") == dsid, "receipt dataset mismatch"
assert str(rmatch.get("input_hash") or "") == ih, "receipt input hash mismatch"
assert str(rmatch.get("output_hash") or "") == oh, "receipt output hash mismatch"

print("[ok] overview newest-card content matches the dataset just published")
print(json.dumps({
  "ok": True,
  "dataset_id": dsid,
  "receipt_id": rcpt,
  "viewer_url": viewer_url,
  "raw_json_url": raw_json_url,
  "recent_first_dataset_id": first.get("dataset_id"),
  "has_open_shared_page_btn": True,
  "has_copy_share_page_btn": True,
  "boot_precedes_main": True,
  "has_open_dataset_prefill_logic": True,
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
echo "=== [5] verify viewer/raw ==="
jget "$REMOTE_NODE_BASE$VIEWER_URL" 20 > "$OUT_DIR/viewer.html"
jget "$REMOTE_NODE_BASE$RAW_URL" 20 > "$OUT_DIR/raw.json"

python3 - "$OUT_DIR/viewer.html" "$OUT_DIR/raw.json" "$DATASET_ID" "$PLAINTEXT" "$INPUT_HASH" <<'PY'
from pathlib import Path
import json, sys
viewer = Path(sys.argv[1]).read_text()
raw = json.loads(Path(sys.argv[2]).read_text())
dsid, plaintext, ih = sys.argv[3:6]
assert "DataNet Viewer" in viewer, "viewer title missing"
assert ("/datanet/v1/local-job/" in viewer or "raw.json" in viewer or "Raw JSON" in viewer or "raw json" in viewer), "viewer raw link missing"
assert ("Plaintext" in viewer or "plaintext" in viewer), "viewer plaintext section missing"
assert raw.get("ok") is True, "raw local-job not ok"
assert str(raw.get("id") or "") == dsid, "raw id mismatch"
assert str(raw.get("plaintext") or "") == plaintext, "raw plaintext mismatch"
assert str(raw.get("sha256") or "") == ih, "raw sha mismatch"
print("[ok] viewer/raw agree with published dataset")
PY

echo
echo "=== [6] run one WC trade path ==="
ssh -o BatchMode=yes -o ConnectTimeout=8 "$ALIEN" \
  "cd '$HOME/dev/void-node' && ACCOUNT='$ACCOUNT' WALLET='$WALLET' PLAINTEXT='golden wc trade ${TS_NOW}' RUNS=1 bash ops/wc-demo-e2e.sh" \
  > "$OUT_DIR/wc-demo.log"

python3 - "$OUT_DIR/wc-demo.log" <<'PY'
import json, pathlib, sys
src = pathlib.Path(sys.argv[1]).read_text()
start = src.rfind('{\n  "ok": true,')
if start == -1:
    raise SystemExit("[fail] wc-demo summary json block not found")
tail = src[start:]
depth = 0
end = None
for i, ch in enumerate(tail):
    if ch == '{':
        depth += 1
    elif ch == '}':
        depth -= 1
        if depth == 0:
            end = i + 1
            break
if end is None:
    raise SystemExit("[fail] could not close wc-demo summary json block")
obj = json.loads(tail[:end])
assert obj.get("ok") is True, "wc demo summary ok != true"
assert obj.get("approve_tx_hash"), "missing approve_tx_hash"
assert obj.get("swap_tx_hash"), "missing swap_tx_hash"
assert float(obj.get("participant_redeemable_after_credit", -1)) == 10.0, "redeemable_after_credit != 10"
assert float(obj.get("participant_redeemable_after_execute", -1)) == 9.0, "redeemable_after_execute != 9"
print("[ok] wc trade path succeeded")
print(json.dumps({
  "ok": True,
  "approve_tx_hash": obj.get("approve_tx_hash"),
  "swap_tx_hash": obj.get("swap_tx_hash"),
  "participant_redeemable_after_credit": obj.get("participant_redeemable_after_credit"),
  "participant_redeemable_after_execute": obj.get("participant_redeemable_after_execute"),
}, indent=2))
PY

echo
echo "=== [7] post-run health ==="
jget "$REMOTE_NODE_BASE/__void/ready.json" 10 > "$OUT_DIR/ready.after.json"
jget "$REMOTE_NODE_BASE/health" 10 > "$OUT_DIR/health.after.json"
jget "$REMOTE_RELAYER_BASE/health" 10 > "$OUT_DIR/relayer.after.json"

python3 - "$OUT_DIR/ready.after.json" "$OUT_DIR/health.after.json" "$OUT_DIR/relayer.after.json" "$JOB_ID" "$RECEIPT_ID" "$DATASET_ID" "$INPUT_HASH" "$OUTPUT_HASH" "$VIEWER_URL" "$RAW_URL" <<'PY'
from pathlib import Path
import json, sys
ready = json.loads(Path(sys.argv[1]).read_text())
health = json.loads(Path(sys.argv[2]).read_text())
relayer = json.loads(Path(sys.argv[3]).read_text())
job_id, receipt_id, dataset_id, input_hash, output_hash, viewer_url, raw_url = sys.argv[4:11]

assert ready.get("ready") is True, "post-run ready not true"
assert ready.get("gap") == 0, "post-run gap not zero"
assert ready.get("txroot_live") == 1, "post-run txroot_live not 1"
assert health.get("ok") is True, "post-run health not ok"
assert relayer.get("ok") is True, "post-run relayer not ok"
assert relayer.get("can_quote") is True, "post-run relayer can_quote false"
assert relayer.get("can_execute") is True, "post-run relayer can_execute false"

print(json.dumps({
  "ok": True,
  "job_id": job_id,
  "receipt_id": receipt_id,
  "dataset_id": dataset_id,
  "input_hash": input_hash,
  "output_hash": output_hash,
  "viewer_url": viewer_url,
  "raw_json_url": raw_url,
  "remote_ready_after": ready.get("ready"),
  "remote_gap_after": ready.get("gap"),
  "remote_txroot_live_after": ready.get("txroot_live"),
}, indent=2))
PY

echo "[ok] two-box participant golden path proof green"
echo "out=$OUT_DIR"
