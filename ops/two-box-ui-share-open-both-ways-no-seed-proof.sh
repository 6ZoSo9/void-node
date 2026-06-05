#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
ALIEN_HOST="${ALIEN##*@}"
LOCAL_NODE_BASE="${LOCAL_NODE_BASE:-http://127.0.0.1:4100}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-http://${ALIEN_HOST}:4100}"
TS_NOW="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="${OUT_DIR:-/tmp/two-box-ui-share-open-both-ways-no-seed-proof-$TS_NOW}"
mkdir -p "$OUT_DIR"

ACC_A2P="${ACC_A2P:-ui-share-a2p-$TS_NOW}"
ACC_P2A="${ACC_P2A:-ui-share-p2a-$TS_NOW}"
TEXT_A2P="${TEXT_A2P:-alienware share-open to precision $TS_NOW}"
TEXT_P2A="${TEXT_P2A:-precision share-open to alienware $TS_NOW}"

jget() {
  curl -fsS --max-time "${2:-15}" "$1"
}

jpost_json() {
  local url="$1"
  local body="$2"
  curl -fsS --max-time "${3:-20}" -H 'content-type: application/json' -X POST "$url" --data "$body"
}

poll_completed_job() {
  local base="$1"
  local job_id="$2"
  local out_prefix="$3"
  local status=""
  local done=""
  local jf=""
  for i in $(seq 1 20); do
    local resp
    resp="$(jget "$base/jobs/$job_id" 20)"
    jf="${out_prefix}-$i.json"
    printf '%s\n' "$resp" > "$jf"
    read -r status done < <(python3 - "$jf" <<'INNER'
import json, sys
j = json.load(open(sys.argv[1]))
job = j.get("job") or {}
receipts = j.get("receipts") or []
status = str(job.get("status") or "")
done = "0"
if status == "completed":
    done = "1"
else:
    for r in receipts:
        if str(r.get("status") or "") == "completed" and str(r.get("dataset_id") or ""):
            done = "1"
            break
print(status, done)
INNER
)
    echo "status=$status done=$done poll=$i" >&2
    [ "$done" = "1" ] && break
    sleep 1
  done
  [ "$done" = "1" ] || { echo "[fail] job did not complete"; return 1; }
  printf '%s\n' "$jf"
}

extract_job_dataset() {
  python3 - "$1" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))
job = j.get("job") or {}
ds = str(job.get("dataset_id") or "")
if ds:
    print(ds)
    raise SystemExit(0)
for r in (j.get("receipts") or []):
    ds = str(r.get("dataset_id") or "")
    if str(r.get("status") or "") == "completed" and ds:
        print(ds)
        raise SystemExit(0)
print("")
PY
}

check_baseline() {
  local label="$1"
  local base="$2"
  local out="$3"
  jget "$base/__void/ready.json" 10 | tee "$out/${label}-ready.json" >/dev/null
  jget "$base/__void/peer-main-status.json" 10 | tee "$out/${label}-peer.json" >/dev/null
}

echo "=== [1] baseline truth ==="
check_baseline local "$LOCAL_NODE_BASE" "$OUT_DIR"
check_baseline remote "$REMOTE_NODE_BASE" "$OUT_DIR"

python3 - "$OUT_DIR/local-ready.json" "$OUT_DIR/remote-ready.json" "$OUT_DIR/local-peer.json" "$OUT_DIR/remote-peer.json" <<'PY'
import json, sys
lr = json.load(open(sys.argv[1]))
rr = json.load(open(sys.argv[2]))
lp = json.load(open(sys.argv[3]))
rp = json.load(open(sys.argv[4]))

summary = {
    "ok": (
        lr.get("ready") is True and
        rr.get("ready") is True and
        int(lr.get("gap") or 0) <= 1 and
        int(rr.get("gap") or 0) <= 1
    ),
    "local_ready": lr.get("ready"),
    "remote_ready": rr.get("ready"),
    "local_gap": lr.get("gap"),
    "remote_gap": rr.get("gap"),
    "local_same_node": lp.get("same_node"),
    "remote_same_node": rp.get("same_node"),
    "remote_ready_reasons": rr.get("reasons") or [],
}
print(json.dumps(summary, indent=2))
if not summary["ok"]:
    raise SystemExit("FAIL: baseline peer/gap truth not aligned")
print("[ok] baseline peer/gap truth aligned")
PY

echo
echo "=== [2] Alienware publish -> Precision participant open_dataset ==="
jpost_json "$REMOTE_NODE_BASE/wc/runner/set" "{\"account\":\"$ACC_A2P\",\"enabled\":true}" 20 > "$OUT_DIR/a2p-runner-set.json"
A2P_SUBMIT="$(jpost_json "$REMOTE_NODE_BASE/wc/runner/tick" "{\"account\":\"$ACC_A2P\"}" 30)"
printf '%s\n' "$A2P_SUBMIT" | tee "$OUT_DIR/a2p-submit.json" >/dev/null
read -r A2P_DATASET_ID TEXT_A2P < <(python3 - "$OUT_DIR/a2p-submit.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
paths_ds=[
 ["runner","last_result","result","job","dataset_id"],
 ["runner","last_result","result","worker","receipt","dataset_id"],
 ["runner","last_result","result","worker","job","dataset_id"],
 ["submit","out","job","dataset_id"],
]
paths_text=[
 ["runner","last_result","result","job","input","plaintext"],
 ["runner","last_result","result","worker","job","input","plaintext"],
 ["submit","out","job","input","plaintext"],
]
def dig(path):
    x=j
    for k in path:
        x=(x or {}).get(k) if isinstance(x, dict) else None
    return x
ds=next((str(x) for p in paths_ds if (x:=dig(p))), "")
txt=next((str(x) for p in paths_text if (x:=dig(p))), "")
print(ds, txt)
PY
)
test -n "$A2P_DATASET_ID"
test -n "$TEXT_A2P"
echo "a2p_dataset_id=$A2P_DATASET_ID"

echo "=== [2a] no manual peer seed: rely on durable Precision peer env ==="
jget "$LOCAL_NODE_BASE/peers/registry" 20 > "$OUT_DIR/a2p-local-peers-before.json" || true

A2P_PARTICIPANT_URL="$LOCAL_NODE_BASE/participant?account=$ACC_A2P&open_dataset=$A2P_DATASET_ID#datanet"
echo "$A2P_PARTICIPANT_URL"
jget "$A2P_PARTICIPANT_URL" 20 > "$OUT_DIR/a2p-participant.html"

for i in $(seq 1 20); do
  jget "$LOCAL_NODE_BASE/datanet/v1/consume/$A2P_DATASET_ID?who=$ACC_A2P" 20 > "$OUT_DIR/a2p-consume.json" || true
  if jget "$LOCAL_NODE_BASE/datanet/v1/local-job/$A2P_DATASET_ID?who=$ACC_A2P" 20 > "$OUT_DIR/a2p-local-job.json"; then
    break
  fi
  sleep 2
done

test -s "$OUT_DIR/a2p-local-job.json"
jget "$LOCAL_NODE_BASE/datanet/consume-view/$A2P_DATASET_ID?who=$ACC_A2P" 20 > "$OUT_DIR/a2p-consume-view.html"

python3 - "$OUT_DIR/a2p-participant.html" "$OUT_DIR/a2p-consume-view.html" "$OUT_DIR/a2p-local-job.json" "$A2P_DATASET_ID" "$TEXT_A2P" "$ACC_A2P" <<'PY'
import json, sys, hashlib, pathlib
participant = pathlib.Path(sys.argv[1]).read_text()
consume = pathlib.Path(sys.argv[2]).read_text()
local_job = json.load(open(sys.argv[3]))
dataset_id, text, account = sys.argv[4], sys.argv[5], sys.argv[6]
want_sha = hashlib.sha256(text.encode()).hexdigest()
assert 'id="datanetOpenByIdInput"' in participant, "participant datanet open UI missing"
assert 'id="datanetOpenByIdBtn"' in participant, "participant open button missing"
assert 'id="datanetOpenByIdStatus"' in participant, "participant open status missing"
assert 'const qsDataset = String(params.get("open_dataset") || "").trim();' in participant, "participant open_dataset preload logic missing"
assert 'openInput.value = qsDataset;' in participant, "participant preload assignment missing"
assert 'Preloaded dataset id from page link: ' in participant, "participant preload status text missing"
assert dataset_id in consume, "dataset id missing in consume html"
assert text in consume or str(local_job.get("plaintext") or "") == text, "plaintext missing in consume html/local-job"
assert local_job.get("ok") is True, f"local-job not ok: {local_job}"
assert str(local_job.get("who") or "") == account, f"who mismatch: {local_job.get('who')} vs {account}"
assert str(local_job.get("id") or "") == dataset_id, "dataset mismatch in local-job"
assert str(local_job.get("plaintext") or "") == text, "plaintext mismatch in local-job"
assert str(local_job.get("sha256") or "") == want_sha, "sha mismatch in local-job"
print(json.dumps({
  "ok": True,
  "direction": "Alienware -> Precision",
  "dataset_id": dataset_id,
  "participant_page_has_open_dataset": True,
  "consume_view_ok": True,
  "local_materialization_ok": True
}, indent=2))
PY

echo
echo "=== [3] Precision publish -> Alienware participant open_dataset ==="
jpost_json "$LOCAL_NODE_BASE/wc/runner/set" "{\"account\":\"$ACC_P2A\",\"enabled\":true}" 20 > "$OUT_DIR/p2a-runner-set.json"
P2A_SUBMIT="$(jpost_json "$LOCAL_NODE_BASE/wc/runner/tick" "{\"account\":\"$ACC_P2A\"}" 30)"
printf '%s\n' "$P2A_SUBMIT" | tee "$OUT_DIR/p2a-submit.json" >/dev/null
read -r P2A_DATASET_ID TEXT_P2A < <(python3 - "$OUT_DIR/p2a-submit.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
paths_ds=[
 ["runner","last_result","result","job","dataset_id"],
 ["runner","last_result","result","worker","receipt","dataset_id"],
 ["runner","last_result","result","worker","job","dataset_id"],
 ["submit","out","job","dataset_id"],
]
paths_text=[
 ["runner","last_result","result","job","input","plaintext"],
 ["runner","last_result","result","worker","job","input","plaintext"],
 ["submit","out","job","input","plaintext"],
]
def dig(path):
    x=j
    for k in path:
        x=(x or {}).get(k) if isinstance(x, dict) else None
    return x
ds=next((str(x) for p in paths_ds if (x:=dig(p))), "")
txt=next((str(x) for p in paths_text if (x:=dig(p))), "")
print(ds, txt)
PY
)
test -n "$P2A_DATASET_ID"
test -n "$TEXT_P2A"
echo "p2a_dataset_id=$P2A_DATASET_ID"

echo "=== [3a] no manual peer seed: rely on durable Alienware peer env ==="
jget "$REMOTE_NODE_BASE/peers/registry" 20 > "$OUT_DIR/p2a-remote-peers-before.json" || true

P2A_PARTICIPANT_URL="$REMOTE_NODE_BASE/participant?account=$ACC_P2A&open_dataset=$P2A_DATASET_ID#datanet"
echo "$P2A_PARTICIPANT_URL"
ssh "$ALIEN" "curl -fsS --max-time 20 '$REMOTE_NODE_BASE/participant?account=$ACC_P2A&open_dataset=$P2A_DATASET_ID#datanet'" > "$OUT_DIR/p2a-participant.html"

for i in $(seq 1 20); do
  ssh "$ALIEN" "curl -fsS --max-time 20 '$REMOTE_NODE_BASE/datanet/v1/consume/$P2A_DATASET_ID?who=$ACC_P2A'" > "$OUT_DIR/p2a-consume.json" || true
  if ssh "$ALIEN" "curl -fsS --max-time 20 '$REMOTE_NODE_BASE/datanet/v1/local-job/$P2A_DATASET_ID?who=$ACC_P2A'" > "$OUT_DIR/p2a-local-job.json"; then
    break
  fi
  sleep 2
done

test -s "$OUT_DIR/p2a-local-job.json"
ssh "$ALIEN" "curl -fsS --max-time 20 '$REMOTE_NODE_BASE/datanet/consume-view/$P2A_DATASET_ID?who=$ACC_P2A'" > "$OUT_DIR/p2a-consume-view.html"

python3 - "$OUT_DIR/p2a-participant.html" "$OUT_DIR/p2a-consume-view.html" "$OUT_DIR/p2a-local-job.json" "$P2A_DATASET_ID" "$TEXT_P2A" "$ACC_P2A" <<'PY'
import json, sys, hashlib, pathlib
participant = pathlib.Path(sys.argv[1]).read_text()
consume = pathlib.Path(sys.argv[2]).read_text()
local_job = json.load(open(sys.argv[3]))
dataset_id, text, account = sys.argv[4], sys.argv[5], sys.argv[6]
want_sha = hashlib.sha256(text.encode()).hexdigest()
assert 'id="datanetOpenByIdInput"' in participant, "participant datanet open UI missing"
assert 'id="datanetOpenByIdBtn"' in participant, "participant open button missing"
assert 'id="datanetOpenByIdStatus"' in participant, "participant open status missing"
assert 'const qsDataset = String(params.get("open_dataset") || "").trim();' in participant, "participant open_dataset preload logic missing"
assert 'openInput.value = qsDataset;' in participant, "participant preload assignment missing"
assert 'Preloaded dataset id from page link: ' in participant, "participant preload status text missing"
assert dataset_id in consume, "dataset id missing in consume html"
assert text in consume or str(local_job.get("plaintext") or "") == text, "plaintext missing in consume html/local-job"
assert local_job.get("ok") is True, f"local-job not ok: {local_job}"
assert str(local_job.get("who") or "") == account, f"who mismatch: {local_job.get('who')} vs {account}"
assert str(local_job.get("id") or "") == dataset_id, "dataset mismatch in local-job"
assert str(local_job.get("plaintext") or "") == text, "plaintext mismatch in local-job"
assert str(local_job.get("sha256") or "") == want_sha, "sha mismatch in local-job"
print(json.dumps({
  "ok": True,
  "direction": "Precision -> Alienware",
  "dataset_id": dataset_id,
  "participant_page_has_open_dataset": True,
  "consume_view_ok": True,
  "local_materialization_ok": True
}, indent=2))
PY

echo
echo "=== [4] post-flow truth ==="
check_baseline local "$LOCAL_NODE_BASE" "$OUT_DIR"
check_baseline remote "$REMOTE_NODE_BASE" "$OUT_DIR"

python3 - "$OUT_DIR/local-ready.json" "$OUT_DIR/remote-ready.json" "$OUT_DIR/local-peer.json" "$OUT_DIR/remote-peer.json" <<'PY'
import json, sys
lr = json.load(open(sys.argv[1]))
rr = json.load(open(sys.argv[2]))
lp = json.load(open(sys.argv[3]))
rp = json.load(open(sys.argv[4]))

summary = {
    "ok": (
        lr.get("ready") is True and
        rr.get("ready") is True and
        int(lr.get("gap") or 0) <= 1 and
        int(rr.get("gap") or 0) <= 1
    ),
    "local_ready": lr.get("ready"),
    "remote_ready": rr.get("ready"),
    "local_gap": lr.get("gap"),
    "remote_gap": rr.get("gap"),
    "local_same_node": lp.get("same_node"),
    "remote_same_node": rp.get("same_node"),
    "remote_ready_reasons": rr.get("reasons") or [],
}
print(json.dumps(summary, indent=2))
if not summary["ok"]:
    raise SystemExit("FAIL: post-flow peer/gap truth not aligned")
print("[ok] post-flow peer/gap truth aligned")
PY

echo
echo "=== [5] success ==="
echo "[ok] two-box UI share/open both ways no-manual-peer-seed proof green"
echo "out=$OUT_DIR"
