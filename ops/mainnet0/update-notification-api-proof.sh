#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/void-update-notification-api-proof.$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== update notification API proof ==="
echo "base=$BASE"
echo "out=$OUT"

echo
echo "=== [1] readiness ==="
curl -fsS "$BASE/__void/ready.json" | tee "$OUT/ready.json"
echo

echo
echo "=== [2] notification status ==="
curl -fsS "$BASE/__void/update/notification-status.json" | tee "$OUT/status.before.json"
echo

python3 - "$OUT/status.before.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("source") == "update_notification_status_v1", j
assert j.get("mutation") is False, j
assert j.get("sends_transaction") is False, j
assert j.get("installs_update") is False, j
assert j.get("manifest_found") is True, j
assert j.get("signature_present") is True, j
assert j.get("signature_valid") is True, j
n=j.get("notification") or {}
assert "should_notify" in n, j
assert (n.get("actions") or {}).get("update_now_enabled") is False, j
print("[ok] status is signed/read-only/non-installing")
PY

echo
echo "=== [3] update-now must stay blocked ==="
set +e
curl -sS -w "\n%{http_code}\n" \
  -H 'content-type: application/json' \
  -X POST "$BASE/__void/update/update-now" \
  --data '{"reason":"proof"}' > "$OUT/update-now.http"
RC=$?
set -e
cat "$OUT/update-now.http"

HTTP_CODE="$(tail -n 1 "$OUT/update-now.http" | tr -d '\r')"
sed '$d' "$OUT/update-now.http" > "$OUT/update-now.json"

test "$RC" = "0"
test "$HTTP_CODE" = "501"

python3 - "$OUT/update-now.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is False, j
assert j.get("mutation") is False, j
assert j.get("sends_transaction") is False, j
assert j.get("installs_update") is False, j
assert j.get("error") == "install_execution_not_wired", j
print("[ok] update-now is blocked/non-installing")
PY

echo
echo "=== [4] remind-later writes only local suppression ==="
curl -fsS \
  -H 'content-type: application/json' \
  -X POST "$BASE/__void/update/remind-later" \
  --data '{"hours":1,"reason":"proof"}' | tee "$OUT/remind-later.json"
echo

python3 - "$OUT/remind-later.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("mutation") is True, j
assert j.get("sends_transaction") is False, j
assert j.get("installs_update") is False, j
state=j.get("state") or {}
assert state.get("remind_until_ms"), j
status=j.get("status") or {}
assert status.get("source") == "update_notification_status_v1", j
print("[ok] remind-later only stores local suppression state")
PY

echo
echo "=== [5] final status remains non-installing ==="
curl -fsS "$BASE/__void/update/notification-status.json" | tee "$OUT/status.after.json"
echo

python3 - "$OUT/status.after.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("installs_update") is False, j
assert j.get("sends_transaction") is False, j
print("[ok] final update notification status safe")
PY

echo
echo "out=$OUT"
