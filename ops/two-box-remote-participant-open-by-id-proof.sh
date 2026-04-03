#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
LOCAL_NODE_BASE="${LOCAL_NODE_BASE:-http://127.0.0.1:4100}"
PUBLIC_LOCAL_NODE_BASE="${PUBLIC_LOCAL_NODE_BASE:-http://100.93.2.116:4100}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-http://100.122.79.39:4100}"
OUT="${OUT:-/tmp/two-box-remote-participant-open-by-id-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

ACCOUNT="${ACCOUNT:-participant-open-by-id-user-$(date +%Y%m%d-%H%M%S)}"
PLAINTEXT="${PLAINTEXT:-participant open by id proof $(date +%Y%m%d-%H%M%S)}"

jget() {
  curl -fsS --max-time "${2:-20}" "$1"
}

jpost_json() {
  local url="$1"
  local body="$2"
  local t="${3:-20}"
  curl -fsS --max-time "$t" -H 'content-type: application/json' -X POST "$url" --data "$body"
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
echo "=== [2] publish on Precision ==="
PUBLISH_JSON="$(jpost_json "$LOCAL_NODE_BASE/jobs/submit" "{\"account\":\"$ACCOUNT\",\"kind\":\"datanet_publish\",\"plaintext\":\"$PLAINTEXT\"}" 20)"
printf '%s\n' "$PUBLISH_JSON" | tee "$OUT/local.publish.json"

LOCAL_DATASET_ID=""
LOCAL_SHA256=""
for i in $(seq 1 25); do
  LOCAL_RECENT_JSON="$(jget "$LOCAL_NODE_BASE/datanet/v1/local-jobs/recent?who=zoso&limit=50" 20)"
  printf '%s\n' "$LOCAL_RECENT_JSON" > "$OUT/local.recent.json"

  LOCAL_DATASET_ID="$(python3 - "$OUT/local.recent.json" "$PLAINTEXT" <<'PY'
import json, sys
obj = json.load(open(sys.argv[1]))
want = sys.argv[2]
items = obj.get("items") or []
for x in items:
    if str(x.get("preview") or "") == want:
        print(str(x.get("dataset_id") or ""))
        raise SystemExit(0)
print("")
PY
)"
  if [ -n "$LOCAL_DATASET_ID" ]; then
    LOCAL_SHA256="$(python3 - "$OUT/local.recent.json" "$LOCAL_DATASET_ID" <<'PY'
import json, sys
obj = json.load(open(sys.argv[1]))
ds = sys.argv[2]
items = obj.get("items") or []
for x in items:
    if str(x.get("dataset_id") or "") == ds:
        print(str(x.get("sha256") or ""))
        raise SystemExit(0)
print("")
PY
)"
  fi

  if [ -n "$LOCAL_DATASET_ID" ] && [ -n "$LOCAL_SHA256" ]; then
    break
  fi
  sleep 2
done

if [ -z "$LOCAL_DATASET_ID" ] || [ -z "$LOCAL_SHA256" ]; then
  echo "[fail] missing dataset id or sha on Precision" >&2
  exit 1
fi

echo "local_dataset_id=$LOCAL_DATASET_ID" | tee "$OUT/local.ids.txt"
echo "local_sha256=$LOCAL_SHA256" | tee -a "$OUT/local.ids.txt"

echo
echo "=== [3] seed Precision peer into Alienware registry ==="
LOCAL_HEALTH_JSON="$(jget "$LOCAL_NODE_BASE/health" 20)"
printf '%s\n' "$LOCAL_HEALTH_JSON" > "$OUT/local.health.json"

LOCAL_NODE_ID="$(python3 - "$OUT/local.health.json" <<'PY'
import json, sys
obj = json.load(open(sys.argv[1]))
print(str(obj.get("nodeId") or ""))
PY
)"

LOCAL_P2P_LISTEN="$(python3 - "$OUT/local.health.json" <<'PY'
import json, sys
obj = json.load(open(sys.argv[1]))
listen = obj.get("listen") or []
print(str(listen[0] if listen else ""))
PY
)"

curl -fsS --max-time 10 -H 'content-type: application/json' \
  -X POST "$REMOTE_NODE_BASE/peers/registry/upsert" \
  --data "{\"id\":\"$LOCAL_NODE_ID\",\"http\":\"$PUBLIC_LOCAL_NODE_BASE\",\"p2p\":\"$LOCAL_P2P_LISTEN\",\"capabilities\":[\"blob\",\"tx\",\"block\"]}" \
  | tee "$OUT/remote.peer-upsert.json"

echo
echo "=== [4] fetch remote participant page from Alienware ==="
PARTICIPANT_URL="$REMOTE_NODE_BASE/participant?account=$ACCOUNT#datanet"
echo "$PARTICIPANT_URL" | tee "$OUT/remote.participant.url.txt"
curl -fsS --max-time 30 "${PARTICIPANT_URL%\#datanet}" > "$OUT/remote.participant.html"

echo
echo "=== [5] verify open-by-id UI exists on participant page ==="
python3 - "$OUT/remote.participant.html" "$LOCAL_DATASET_ID" "$ACCOUNT" <<'PY' | tee "$OUT/participant-ui-summary.json"
import json, sys, urllib.parse
html = open(sys.argv[1], "r", encoding="utf-8").read()
dataset_id = sys.argv[2]
account = sys.argv[3]
expected = "/datanet/consume-view/" + urllib.parse.quote(dataset_id, safe="") + "?who=" + urllib.parse.quote(account, safe="")
summary = {
    "ok": (
        'id="datanetOpenByIdInput"' in html and
        'id="datanetOpenByIdBtn"' in html and
        'datanetOpenByIdStatus' in html and
        '/datanet/consume-view/' in html
    ),
    "has_input": 'id="datanetOpenByIdInput"' in html,
    "has_button": 'id="datanetOpenByIdBtn"' in html,
    "has_status": 'datanetOpenByIdStatus' in html,
    "has_consume_view_route": '/datanet/consume-view/' in html,
    "expected_open_target": expected,
}
print(json.dumps(summary, indent=2))
if not summary["ok"]:
    raise SystemExit("FAIL: participant open-by-id UI not present")
PY

echo
echo "=== [6] simulate the open-by-id target end-to-end ==="
CONSUME_VIEW_URL="$REMOTE_NODE_BASE/datanet/consume-view/$LOCAL_DATASET_ID?who=$ACCOUNT"
echo "$CONSUME_VIEW_URL" | tee "$OUT/remote.consume-view.url.txt"
curl -fsS --max-time 30 "$CONSUME_VIEW_URL" > "$OUT/remote.consume-view.html"

for i in $(seq 1 20); do
  if jget "$REMOTE_NODE_BASE/datanet/v1/local-job/$LOCAL_DATASET_ID?who=$ACCOUNT" 20 > "$OUT/remote.local-job.json"; then
    break
  fi
  sleep 2
done

python3 - "$OUT/remote.consume-view.html" "$OUT/remote.local-job.json" "$LOCAL_DATASET_ID" "$PLAINTEXT" "$LOCAL_SHA256" <<'PY' | tee "$OUT/summary.json"
import json, sys
html = open(sys.argv[1], "r", encoding="utf-8").read()
local_job = json.load(open(sys.argv[2]))
dataset_id = sys.argv[3]
plaintext = sys.argv[4]
sha256 = sys.argv[5]

summary = {
    "ok": (
        "DataNet Consume Viewer" in html and
        dataset_id in html and
        plaintext in html and
        sha256 in html and
        bool(local_job.get("ok")) and
        str(local_job.get("id") or "") == dataset_id and
        str(local_job.get("plaintext") or "") == plaintext
    ),
    "has_html": ("<html" in html.lower()),
    "has_title": ("DataNet Consume Viewer" in html),
    "has_dataset_id": (dataset_id in html),
    "has_plaintext": (plaintext in html),
    "has_sha256": (sha256 in html),
    "local_copy_hit": bool(local_job.get("ok")),
    "local_job_id_ok": (str(local_job.get("id") or "") == dataset_id),
    "local_job_plaintext_ok": (str(local_job.get("plaintext") or "") == plaintext),
}
print(json.dumps(summary, indent=2))
if not summary["ok"]:
    raise SystemExit("FAIL: participant open-by-id workflow did not pass cleanly")
PY

echo
echo "[ok] two-box remote participant open-by-id proof green"
echo "[ok] proof bundle: $OUT"
