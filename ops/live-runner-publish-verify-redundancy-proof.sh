#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
ACCOUNT="${ACCOUNT:-zoso}"
OUT="/tmp/live-runner-publish-verify-redundancy-proof.$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

jget() {
  curl -fsS --max-time "${2:-15}" "$1"
}

jpost_json() {
  local url="$1"
  local body="$2"
  local timeout="${3:-20}"
  curl -fsS --max-time "$timeout" -H 'content-type: application/json' -X POST "$url" --data "$body"
}

echo "=== [1] baseline node truth ==="
jget "$BASE/health" 10 | tee "$OUT/health.before.json"
jget "$BASE/network/value-summary.json?limit=10" 10 | tee "$OUT/network.before.json" >/dev/null

echo
echo "=== [2] enable full runner config for account ==="
jpost_json "$BASE/wc/runner/config" "{\"account\":\"$ACCOUNT\",\"safe_mode\":false,\"allow_datanet_fetch_verify\":true,\"allow_datanet_redundancy_check\":true,\"min_submit_gap_ms\":1000,\"max_jobs_per_hour\":120}" 10 | tee "$OUT/runner.config.json"
echo
jpost_json "$BASE/wc/runner/set" "{\"account\":\"$ACCOUNT\",\"enabled\":true}" 10 | tee "$OUT/runner.set.json"

echo
echo "=== [3] confirm status/config ==="
jget "$BASE/wc/runner/config?account=$ACCOUNT" 10 | tee "$OUT/runner.config.after.json"
echo
jget "$BASE/wc/runner/status?account=$ACCOUNT" 10 | tee "$OUT/runner.status.before.json"

echo
echo "=== [4] drive runner until publish + verify + redundancy are all seen ==="
SEEN_PUBLISH=0
SEEN_VERIFY=0
SEEN_REDUND=0

for i in $(seq 1 24); do
  echo "--- tick=$i ---"
  jpost_json "$BASE/wc/runner/tick" "{\"account\":\"$ACCOUNT\"}" 25 | tee "$OUT/runner.tick.$i.json" >/dev/null || true

  S="$(jget "$BASE/wc/runner/status?account=$ACCOUNT" 10)"
  printf '%s\n' "$S" > "$OUT/runner.status.$i.json"

  python3 - "$OUT/runner.status.$i.json" <<'PY'
import sys, json, pathlib
o = json.loads(pathlib.Path(sys.argv[1]).read_text())
print(json.dumps({
  "enabled": o.get("enabled"),
  "approved_task_classes": o.get("approved_task_classes"),
  "selection_task_class": ((o.get("selection") or {}).get("task_class")),
  "selection_dataset_id": ((o.get("selection") or {}).get("dataset_id")),
  "selection_reason": ((o.get("selection") or {}).get("reason")),
  "last_selected_task_class": o.get("last_selected_task_class"),
  "last_selected_dataset_id": o.get("last_selected_dataset_id"),
  "last_selection_reason": o.get("last_selection_reason"),
  "publish_last_hour": o.get("publish_last_hour"),
  "verify_last_hour": o.get("verify_last_hour"),
  "redundancy_last_hour": o.get("redundancy_last_hour"),
}, indent=2))
PY

  TASK="$(python3 - "$OUT/runner.status.$i.json" <<'PY'
import sys, json, pathlib
o = json.loads(pathlib.Path(sys.argv[1]).read_text())
sel = o.get("selection") or {}
print((sel.get("task_class") or o.get("last_selected_task_class") or ""))
PY
)"
  case "$TASK" in
    datanet_publish) SEEN_PUBLISH=1 ;;
    datanet_fetch_verify) SEEN_VERIFY=1 ;;
    datanet_redundancy_check) SEEN_REDUND=1 ;;
  esac

  echo "seen_publish=$SEEN_PUBLISH seen_verify=$SEEN_VERIFY seen_redundancy=$SEEN_REDUND"

  if [ "$SEEN_PUBLISH" -eq 1 ] && [ "$SEEN_VERIFY" -eq 1 ] && [ "$SEEN_REDUND" -eq 1 ]; then
    echo "[ok] all three task classes observed"
    break
  fi

  sleep 5
done

test "$SEEN_PUBLISH" -eq 1
test "$SEEN_VERIFY" -eq 1
test "$SEEN_REDUND" -eq 1

echo
echo "=== [5] backend network value truth ==="
jget "$BASE/network/value-summary.json?limit=50" 10 | tee "$OUT/network.after.json" >/dev/null
python3 - "$OUT/network.after.json" <<'PY'
import sys, json, pathlib
o = json.loads(pathlib.Path(sys.argv[1]).read_text())
recent = o.get("recent_runner_activity") or []
print(json.dumps({
  "ok": o.get("ok"),
  "counts": o.get("counts"),
  "recent_runner_activity_count": o.get("recent_runner_activity_count"),
  "publish_present": any(str(x.get("task_class") or "") == "publish" for x in recent),
  "verify_present": any(str(x.get("task_class") or "") == "verify" for x in recent),
  "redundancy_present": any(str(x.get("task_class") or "") == "redundancy" for x in recent),
  "latest_publish_dataset": o.get("latest_publish_dataset"),
  "latest_verified_dataset": o.get("latest_verified_dataset"),
  "latest_redundancy_checked_dataset": o.get("latest_redundancy_checked_dataset"),
}, indent=2))
PY

python3 - "$OUT/network.after.json" <<'PY'
import sys, json, pathlib
o = json.loads(pathlib.Path(sys.argv[1]).read_text())
recent = o.get("recent_runner_activity") or []
assert o.get("ok") is True, "network value summary not ok"
assert int(o.get("recent_runner_activity_count") or 0) > 0, "recent_runner_activity_count <= 0"
assert any(str(x.get("task_class") or "") == "publish" for x in recent), "publish missing from recent_runner_activity"
assert any(str(x.get("task_class") or "") == "verify" for x in recent), "verify missing from recent_runner_activity"
assert any(str(x.get("task_class") or "") == "redundancy" for x in recent), "redundancy missing from recent_runner_activity"
print("[ok] network value recent activity assertions passed")
PY

echo
echo "=== [6] final runner status ==="
jget "$BASE/wc/runner/status?account=$ACCOUNT" 10 | tee "$OUT/runner.status.final.json"

echo
echo "=== [7] final health ==="
jget "$BASE/health" 10 | tee "$OUT/health.final.json"

echo
echo "=== [8] success ==="
echo "[ok] live runner publish/verify/redundancy proof green"
echo "out=$OUT"
