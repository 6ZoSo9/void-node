#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
LOCAL_NODE_BASE="${LOCAL_NODE_BASE:-http://127.0.0.1:4100}"
PUBLIC_LOCAL_NODE_BASE="${PUBLIC_LOCAL_NODE_BASE:-http://100.93.2.116:4100}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-http://100.122.79.39:4100}"
OUT="${OUT:-/tmp/two-box-remote-consumer-fetch-product-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

ACCOUNT="${ACCOUNT:-consumer-fetch-user-$(date +%Y%m%d-%H%M%S)}"
PLAINTEXT="${PLAINTEXT:-consumer fetch product proof $(date +%Y%m%d-%H%M%S)}"

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

LOCAL_JOB_ID="$(python3 - "$OUT/local.publish.json" <<'PY'
import json, sys
obj = json.load(open(sys.argv[1]))
job = obj.get("job") or {}
print(str(job.get("job_id") or ""))
PY
)"

if [ -z "$LOCAL_JOB_ID" ]; then
  echo "[fail] missing local publish job id" >&2
  exit 1
fi

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
  echo "[fail] missing local dataset id or sha after polling local datanet recent" >&2
  exit 1
fi

echo "local_job_id=$LOCAL_JOB_ID" | tee "$OUT/local.ids.txt"
echo "local_dataset_id=$LOCAL_DATASET_ID" | tee -a "$OUT/local.ids.txt"
echo "local_sha256=$LOCAL_SHA256" | tee -a "$OUT/local.ids.txt"

echo
echo "=== [3] explicitly seed Precision peer into Alienware registry ==="
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

if [ -z "$LOCAL_NODE_ID" ] || [ -z "$LOCAL_P2P_LISTEN" ]; then
  echo "[fail] missing local node id or p2p listen for explicit peer upsert" >&2
  exit 1
fi

curl -fsS --max-time 10 -H 'content-type: application/json' \
  -X POST "$REMOTE_NODE_BASE/peers/registry/upsert" \
  --data "{\"id\":\"$LOCAL_NODE_ID\",\"http\":\"$PUBLIC_LOCAL_NODE_BASE\",\"p2p\":\"$LOCAL_P2P_LISTEN\",\"capabilities\":[\"blob\",\"tx\",\"block\"]}" \
  | tee "$OUT/remote.peer-upsert.json"
echo
jget "$REMOTE_NODE_BASE/peers/registry" 20 | tee "$OUT/remote.peers.after-upsert.json"

echo
echo "=== [4] consume dataset from Alienware canonical consumer route ==="
CONSUME_URL="$REMOTE_NODE_BASE/datanet/v1/consume/$LOCAL_DATASET_ID?who=zoso"
echo "$CONSUME_URL" | tee "$OUT/remote.consume.url.txt"

HTTP_CODE="$(curl -sS --max-time 30 -o "$OUT/remote.consume.body.json" -w '%{http_code}' "$CONSUME_URL")"
echo "$HTTP_CODE" | tee "$OUT/remote.consume.status.txt"

if [ "$HTTP_CODE" != "200" ]; then
  echo "[fail] remote consumer route did not return HTTP 200" >&2
  cat "$OUT/remote.consume.body.json" || true
  exit 1
fi

cat "$OUT/remote.consume.body.json"
echo

echo
echo "=== [5] verify returned plaintext + local materialization on Alienware ==="
FOUND_LOCAL_COPY="false"

for i in $(seq 1 20); do
  if jget "$REMOTE_NODE_BASE/datanet/v1/local-job/$LOCAL_DATASET_ID?who=zoso" 20 > "$OUT/remote.local-job.json"; then
    FOUND_LOCAL_COPY="true"
    break
  fi
  sleep 2
done

python3 - "$OUT/remote.consume.body.json" "$PLAINTEXT" "$FOUND_LOCAL_COPY" "$LOCAL_DATASET_ID" "$ACCOUNT" <<'PY' | tee "$OUT/summary.json"
import json, sys
obj = json.load(open(sys.argv[1]))
want = sys.argv[2]
local_copy_hit = str(sys.argv[3]).strip().lower() == "true"
dataset_id = sys.argv[4]
account = sys.argv[5]

summary = {
    "ok": (str(obj.get("plaintext") or "") == want) and local_copy_hit,
    "account": account,
    "dataset_id": dataset_id,
    "fetch_plaintext_ok": (str(obj.get("plaintext") or "") == want),
    "source": str(obj.get("source") or ""),
    "local_copy_hit": local_copy_hit
}
print(json.dumps(summary, indent=2))
if not summary["ok"]:
    raise SystemExit("FAIL: consumer fetch proof did not pass cleanly")
PY

echo
echo "[ok] two-box remote consumer fetch product proof green"
echo "[ok] proof bundle: $OUT"
