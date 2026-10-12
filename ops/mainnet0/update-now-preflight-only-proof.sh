#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
SERVICE="${SERVICE:-void-node.service}"
OUT="${OUT:-/tmp/void-update-now-preflight-only-proof.$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

main_pid() {
  systemctl --user show -p MainPID --value "$SERVICE" 2>/dev/null || echo ""
}

echo "=== update-now preflight-only proof ==="
echo "base=$BASE"
echo "out=$OUT"

echo
echo "=== [1] ready + no active markers before ==="
curl -fsS "$BASE/__void/ready.json" | tee "$OUT/ready.before.json"
echo

for f in runtime/upgrade-staged.v1.json runtime/upgrade-apply-pending.v1.json runtime/upgrade-rollback-marker.v1.json; do
  if [ -f "$f" ]; then
    echo "[ERR] active marker exists before proof: $f"
    exit 1
  fi
done
echo "[ok] no active markers before"

PID_BEFORE="$(main_pid)"
echo "pid_before=${PID_BEFORE:-unknown}"

echo
echo "=== [2] POST update-now must remain 501/preflight-only ==="
curl -sS -w "\n%{http_code}\n" \
  -H "content-type: application/json" \
  -X POST "$BASE/__void/update/update-now" \
  --data '{"source":"update_now_preflight_only_proof"}' > "$OUT/update-now.http"

cat "$OUT/update-now.http"
CODE="$(tail -n 1 "$OUT/update-now.http" | tr -d '\r')"
test "$CODE" = "501"

python3 - "$OUT/update-now.http" <<'PY'
import json, pathlib, sys
lines = pathlib.Path(sys.argv[1]).read_text().splitlines()
j = json.loads("\n".join(lines[:-1]))

assert j.get("ok") is False, j
assert j.get("mutation") is False, j
assert j.get("sends_transaction") is False, j
assert j.get("installs_update") is False, j
assert j.get("stages_update") is False, j
assert j.get("writes_runtime_markers") is False, j
assert j.get("preflight_only") is True, j
assert j.get("error") == "install_execution_not_wired", j

pf = j.get("preflight") or {}
assert (pf.get("status") or {}).get("ok") is True, j
assert (pf.get("plan") or {}).get("ok") is True, j
assert (pf.get("dry_run") or {}).get("ok") is True, j
assert pf.get("plan_http_status") == 200, j
assert pf.get("dry_run_http_status") == 200, j

markers = pf.get("active_markers") or {}
assert markers.get("staged") is False, j
assert markers.get("pending") is False, j
assert markers.get("rollback") is False, j

print("[ok] update-now response is preflight-only and marker-safe")
PY

echo
echo "=== [3] no markers and no restart after ==="
for f in runtime/upgrade-staged.v1.json runtime/upgrade-apply-pending.v1.json runtime/upgrade-rollback-marker.v1.json; do
  if [ -f "$f" ]; then
    echo "[ERR] active marker created by update-now: $f"
    exit 1
  fi
done
echo "[ok] no active markers after"

PID_AFTER="$(main_pid)"
echo "pid_after=${PID_AFTER:-unknown}"
if [ -n "$PID_BEFORE" ] && [ -n "$PID_AFTER" ] && [ "$PID_BEFORE" != "0" ] && [ "$PID_AFTER" != "0" ]; then
  test "$PID_BEFORE" = "$PID_AFTER"
  echo "[ok] service PID unchanged"
else
  echo "[warn] PID check unavailable"
fi

curl -fsS "$BASE/__void/update/notification-status.json" | tee "$OUT/status.after.json"
echo

python3 - "$OUT/status.after.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("signature_valid") is True, j
assert j.get("installs_update") is False, j
print("[ok] update status remains safe")
PY

echo
echo "out=$OUT"
