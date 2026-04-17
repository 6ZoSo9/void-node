#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
OUT="${OUT:-/tmp/two-box-mainnet0-state-change-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

jget() {
  curl -fsS --max-time "${2:-15}" "$1"
}

jpost_json() {
  local url="$1"
  local body="$2"
  curl -fsS --max-time "${3:-20}" -H 'content-type: application/json' -X POST "$url" --data "$body"
}

poll_job_done() {
  local base="$1"
  local job_id="$2"
  local prefix="$3"
  local status=""
  local jf=""
  for i in $(seq 1 25); do
    local resp
    resp="$(jget "$base/jobs/$job_id" 20)"
    jf="${prefix}-${i}.json"
    printf '%s\n' "$resp" > "$jf"
    status="$(python3 - "$jf" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))
print(((j.get("job") or {}).get("status")) or "")
PY
)"
    echo "status=$status poll=$i" >&2
    [ "$status" = "completed" ] && break
    sleep 1
  done
  [ "$status" = "completed" ] || { echo "[fail] job did not complete"; return 1; }
  printf '%s\n' "$jf"
}

echo "=== [1] baseline truth ==="
jget "http://127.0.0.1:4100/__void/ready.json" 10 | tee "$OUT/local-ready-before.json"
echo
jget "http://127.0.0.1:4100/__void/peer-main-status.json" 10 | tee "$OUT/local-peer-before.json"
echo
ssh "$ALIEN" 'set -euo pipefail; curl -fsS --max-time 10 http://127.0.0.1:4100/__void/ready.json; echo; curl -fsS --max-time 10 http://127.0.0.1:4100/__void/peer-main-status.json' | tee "$OUT/remote-before.txt"

echo
echo "=== [1b] precondition gate ==="
python3 - "$OUT/local-ready-before.json" "$OUT/local-peer-before.json" <<'PY2'
import json, sys
ready = json.load(open(sys.argv[1]))
peer = json.load(open(sys.argv[2]))
gap = peer.get("head_gap")
assert ready.get("ready") is True, f"local ready is not true: {ready}"
assert isinstance(gap, (int, float)), f"missing head_gap: {peer}"
assert abs(int(gap)) == 0, f"precondition failed: head_gap={gap}"
print("[ok] local precondition gate green (ready=true, head_gap=0)")
PY2

echo
echo "=== [2] submit live state change on local box ==="
TS_NOW="$(date +%Y%m%d-%H%M%S)"
ACCOUNT="mainnet0-state-change-$TS_NOW"
PLAINTEXT="two-box mainnet0 state change proof $TS_NOW"

SUBMIT="$(jpost_json "http://127.0.0.1:4100/jobs/submit" "{\"account\":\"$ACCOUNT\",\"kind\":\"datanet_publish\",\"plaintext\":\"$PLAINTEXT\"}" 20)"
printf '%s\n' "$SUBMIT" | tee "$OUT/local-submit.json"

JOB_ID="$(python3 - "$OUT/local-submit.json" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))
print(((j.get("job") or {}).get("job_id")) or "")
PY
)"
test -n "$JOB_ID"

JOB_FILE="$(poll_job_done "http://127.0.0.1:4100" "$JOB_ID" "$OUT/local-job")"

DATASET_ID="$(python3 - "$JOB_FILE" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))
job = j.get("job") or {}
print(job.get("dataset_id") or "")
PY
)"
RECEIPT_ID="$(python3 - "$JOB_FILE" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))
job = j.get("job") or {}
print(job.get("receipt_id") or "")
PY
)"
test -n "$DATASET_ID"
echo "dataset_id=$DATASET_ID"
echo "receipt_id=$RECEIPT_ID"

echo
echo "=== [3] verify local materialization ==="
jget "http://127.0.0.1:4100/datanet/v1/local-job/$DATASET_ID?who=$ACCOUNT" 20 | tee "$OUT/local-materialized.json"

echo
echo
echo "=== [4] consume same dataset from remote box ==="
PUBLISHER_BASE="$(python3 - "$OUT/local-peer-before.json" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))
local = j.get("local") or {}
listen = (local.get("listen") or [""])[0]
host = str(listen).split(":")[0] if listen else ""
http_port = local.get("http") or 4100
if not host:
    raise SystemExit("missing local.listen host in local-peer-before.json")
print(f"http://{host}:{http_port}")
PY
)"
test -n "$PUBLISHER_BASE"

LOCALHOST_URL="http://127.0.0.1:4100/datanet/consume-view/$DATASET_ID?who=$ACCOUNT"
PEER_URL="$PUBLISHER_BASE/datanet/consume-view/$DATASET_ID?who=$ACCOUNT"

echo "publisher_base=$PUBLISHER_BASE"
echo "localhost_url=$LOCALHOST_URL"
echo "peer_url=$PEER_URL"

if ssh "$ALIEN" "set -euo pipefail; curl -fsS --max-time 20 '$LOCALHOST_URL'" > "$OUT/remote-consume-view.html"; then
  REMOTE_CONSUME_SOURCE="remote-localhost"
else
  echo "[warn] remote localhost consume-view returned non-200; falling back to explicit publisher url" >&2
  ssh "$ALIEN" "set -euo pipefail; curl -fsS --max-time 20 '$PEER_URL'" > "$OUT/remote-consume-view.html"
  REMOTE_CONSUME_SOURCE="explicit-publisher-url"
fi

python3 - "$OUT/remote-consume-view.html" "$DATASET_ID" "$PLAINTEXT" "$REMOTE_CONSUME_SOURCE" <<'PY'
import json, sys, hashlib, pathlib
consume = pathlib.Path(sys.argv[1]).read_text()
dataset_id = sys.argv[2]
plaintext = sys.argv[3]
source = sys.argv[4]
want_sha = hashlib.sha256(plaintext.encode()).hexdigest()

assert dataset_id in consume, "dataset id missing in remote consume view"
assert plaintext in consume, "plaintext missing in remote consume view"
assert want_sha in consume, "sha missing in remote consume view"
print(json.dumps({
  "ok": True,
  "dataset_id": dataset_id,
  "remote_consume_view_ok": True,
  "remote_consume_source": source,
  "expected_sha256": want_sha
}, indent=2))
PY
echo "=== [5] post-change truth ==="
jget "http://127.0.0.1:4100/__void/ready.json" 10 | tee "$OUT/local-ready-after.json"
echo
jget "http://127.0.0.1:4100/__void/peer-main-status.json" 10 | tee "$OUT/local-peer-after.json"
echo
ssh "$ALIEN" 'set -euo pipefail; curl -fsS --max-time 10 http://127.0.0.1:4100/__void/ready.json; echo; curl -fsS --max-time 10 http://127.0.0.1:4100/__void/peer-main-status.json' | tee "$OUT/remote-after.txt"

echo
echo "=== [6] compact proof summary ==="
python3 - "$OUT" <<'PY'
import json, pathlib, sys
out = pathlib.Path(sys.argv[1])

local_before = json.loads((out / "local-ready-before.json").read_text())
local_after = json.loads((out / "local-ready-after.json").read_text())
peer_after = json.loads((out / "local-peer-after.json").read_text())

remote_txt = (out / "remote-after.txt").read_text()
objs = []
buf = ""
depth = 0
started = False
for ch in remote_txt:
    if ch == "{":
        depth += 1
        started = True
    if started:
        buf += ch
    if ch == "}":
        depth -= 1
        if started and depth == 0:
            objs.append(buf)
            buf = ""
            started = False

remote_after = json.loads(objs[0]) if len(objs) > 0 else {}
remote_peer_after = json.loads(objs[1]) if len(objs) > 1 else {}

summary = {
    "local_ready_before": local_before.get("ready"),
    "local_ready_after": local_after.get("ready"),
    "remote_ready_after": remote_after.get("ready"),
    "local_gap_after": local_after.get("gap"),
    "remote_gap_after": remote_after.get("gap"),
    "local_peer_head_gap_after": peer_after.get("head_gap"),
    "remote_peer_head_gap_after": remote_peer_after.get("head_gap"),
}
print(json.dumps(summary, indent=2))

assert summary["local_ready_before"] is True, f"local before not ready: {summary}"
assert summary["local_ready_after"] is True, f"local after not ready: {summary}"
assert summary["remote_ready_after"] is True, f"remote after not ready: {summary}"
assert summary["local_gap_after"] == 0, f"local gap after not zero: {summary}"
assert summary["remote_gap_after"] == 0, f"remote gap after not zero: {summary}"
assert summary["local_peer_head_gap_after"] == 0, f"local peer head gap after not zero: {summary}"
assert summary["remote_peer_head_gap_after"] == 0, f"remote peer head gap after not zero: {summary}"
print("[ok] two-box mainnet0 state-change proof green")
PY

echo
echo "out=$OUT"
