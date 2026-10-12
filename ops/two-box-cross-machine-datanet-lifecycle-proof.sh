#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
LOCAL_NODE_BASE="${LOCAL_NODE_BASE:-http://127.0.0.1:4100}"
PUBLIC_LOCAL_NODE_BASE="${PUBLIC_LOCAL_NODE_BASE:-http://100.93.2.116:4100}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-http://${ALIEN##*@}:4100}"
OUT="${OUT:-/tmp/two-box-cross-machine-datanet-lifecycle-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

ACCOUNT="${ACCOUNT:-cross-machine-lifecycle-user-$(date +%Y%m%d-%H%M%S)}"
PLAINTEXT="${PLAINTEXT:-cross machine datanet lifecycle proof $(date +%Y%m%d-%H%M%S)}"

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

for i in $(seq 1 20); do
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
# __void_cross_machine_explicit_peer_upsert_v1
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

echo
echo "=== [4] run verify + redundancy on Alienware against Precision-origin dataset ==="
VERIFY_JSON="$(jpost_json "$REMOTE_NODE_BASE/jobs/submit" "{\"account\":\"$ACCOUNT\",\"kind\":\"datanet_fetch_verify\",\"plaintext\":\"{\\\"dataset_id\\\":\\\"$LOCAL_DATASET_ID\\\",\\\"expected_input_hash\\\":\\\"$LOCAL_SHA256\\\"}\"}" 20)"
printf '%s\n' "$VERIFY_JSON" | tee "$OUT/remote.verify.submit.json"

REDUND_JSON="$(jpost_json "$REMOTE_NODE_BASE/jobs/submit" "{\"account\":\"$ACCOUNT\",\"kind\":\"datanet_redundancy_check\",\"plaintext\":\"{\\\"dataset_id\\\":\\\"$LOCAL_DATASET_ID\\\",\\\"expected_input_hash\\\":\\\"$LOCAL_SHA256\\\"}\"}" 20)"
printf '%s\n' "$REDUND_JSON" | tee "$OUT/remote.redund.submit.json"

VERIFY_JOB_ID="$(python3 - "$OUT/remote.verify.submit.json" <<'PY'
import json, sys
obj = json.load(open(sys.argv[1]))
job = obj.get("job") or {}
print(str(job.get("job_id") or ""))
PY
)"
REDUND_JOB_ID="$(python3 - "$OUT/remote.redund.submit.json" <<'PY'
import json, sys
obj = json.load(open(sys.argv[1]))
job = obj.get("job_id") or (obj.get("job") or {}).get("job_id") or ""
print(str(job))
PY
)"

if [ -z "$VERIFY_JOB_ID" ] || [ -z "$REDUND_JOB_ID" ]; then
  echo "[fail] missing remote verify/redundancy job ids" >&2
  exit 1
fi

echo
echo "=== [5] verify remote product/network surfaces after fetch fallback ==="
FOUND_VERIFY="false"
FOUND_REDUND="false"
FOUND_LOCAL_COPY="false"

for i in $(seq 1 20); do
  jget "$REMOTE_NODE_BASE/network/value-summary.json?limit=50" 20 > "$OUT/remote.after.value-summary.json"
  jget "$REMOTE_NODE_BASE/datanet/v1/local-jobs/recent?who=zoso&limit=50" 20 > "$OUT/remote.after.local-recent.json" || true

  python3 - "$OUT/remote.after.value-summary.json" "$OUT/remote.after.local-recent.json" "$ACCOUNT" "$LOCAL_DATASET_ID" > "$OUT/remote.check.json" <<'PY'
import json, sys
vs = json.load(open(sys.argv[1]))
lr = json.load(open(sys.argv[2]))
acct = sys.argv[3]
ds = sys.argv[4]

recent = vs.get("recent_runner_activity") or []
local_items = lr.get("items") or []

verify_hit = any(
    str((x or {}).get("account","")) == acct and
    str((x or {}).get("task_class","")) == "verify" and
    str((x or {}).get("dataset_id","")) == ds
    for x in recent
)
redund_hit = any(
    str((x or {}).get("account","")) == acct and
    str((x or {}).get("task_class","")) == "redundancy" and
    str((x or {}).get("dataset_id","")) == ds
    for x in recent
)
local_copy_hit = any(str((x or {}).get("dataset_id","")) == ds for x in local_items)

print(json.dumps({
    "verify_hit": verify_hit,
    "redundancy_hit": redund_hit,
    "local_copy_hit": local_copy_hit,
    "latest_verified_dataset": (vs.get("latest_verified_dataset") or {}).get("dataset_id"),
    "latest_redundancy_checked_dataset": (vs.get("latest_redundancy_checked_dataset") or {}).get("dataset_id")
}, indent=2))
PY

  FOUND_VERIFY="$(python3 - "$OUT/remote.check.json" <<'PY'
import json, sys
obj = json.load(open(sys.argv[1]))
print("true" if obj.get("verify_hit") else "false")
PY
)"
  FOUND_REDUND="$(python3 - "$OUT/remote.check.json" <<'PY'
import json, sys
obj = json.load(open(sys.argv[1]))
print("true" if obj.get("redundancy_hit") else "false")
PY
)"
  FOUND_LOCAL_COPY="$(python3 - "$OUT/remote.check.json" <<'PY'
import json, sys
obj = json.load(open(sys.argv[1]))
print("true" if obj.get("local_copy_hit") else "false")
PY
)"

  if [ "$FOUND_VERIFY" = "true" ] && [ "$FOUND_REDUND" = "true" ] && [ "$FOUND_LOCAL_COPY" = "true" ]; then
    break
  fi

  sleep 2
done

if [ "$FOUND_VERIFY" != "true" ] || [ "$FOUND_REDUND" != "true" ] || [ "$FOUND_LOCAL_COPY" != "true" ]; then
  echo "[fail] remote did not complete verify/redundancy and materialize local copy for precision-origin dataset" >&2
  cat "$OUT/remote.check.json" || true
  exit 1
fi

echo
echo "=== [6] summary ==="
python3 - "$OUT/local.ids.txt" "$OUT/remote.check.json" "$ACCOUNT" "$VERIFY_JOB_ID" "$REDUND_JOB_ID" <<'PY'
import json, sys
from pathlib import Path

ids = {}
for line in Path(sys.argv[1]).read_text().splitlines():
    if "=" in line:
        k, v = line.split("=", 1)
        ids[k.strip()] = v.strip()

check = json.load(open(sys.argv[2]))
summary = {
    "account": sys.argv[3],
    "local_dataset_id": ids.get("local_dataset_id",""),
    "local_sha256": ids.get("local_sha256",""),
    "verify_job_id": sys.argv[4],
    "redundancy_job_id": sys.argv[5],
    "verify_hit": bool(check.get("verify_hit")),
    "redundancy_hit": bool(check.get("redundancy_hit")),
    "local_copy_hit": bool(check.get("local_copy_hit")),
    "latest_verified_dataset": check.get("latest_verified_dataset"),
    "latest_redundancy_checked_dataset": check.get("latest_redundancy_checked_dataset"),
}
print(json.dumps(summary, indent=2))
PY

echo
echo "[ok] two-box cross-machine datanet lifecycle proof green"
echo "[ok] proof bundle: $OUT"
