#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
MAN="${MAN:-config/update-manifest.v0.json}"
STATE="${STATE:-$HOME/.config/void/update-notification-state.json}"
SIGN_KEY="${SIGN_KEY:-.secrets/update-ed25519.v1.pem}"
OUT="${OUT:-/tmp/void-update-notification-critical-ui-proof.$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

HAD_STATE=0
RESTORED=0

cleanup() {
  set +e
  if [ -f "$OUT/original-update-manifest.v0.json" ]; then
    cp -a "$OUT/original-update-manifest.v0.json" "$MAN"
  fi
  if [ "$HAD_STATE" = "1" ] && [ -f "$OUT/original-update-notification-state.json" ]; then
    mkdir -p "$(dirname "$STATE")"
    cp -a "$OUT/original-update-notification-state.json" "$STATE"
  else
    rm -f "$STATE"
  fi
  RESTORED=1
}
trap cleanup EXIT

echo "=== critical update notification UI proof ==="
echo "base=$BASE"
echo "out=$OUT"

echo
echo "=== [1] preconditions ==="
test -f "$MAN"
test -f "$SIGN_KEY"
cp -a "$MAN" "$OUT/original-update-manifest.v0.json"
if [ -f "$STATE" ]; then
  cp -a "$STATE" "$OUT/original-update-notification-state.json"
  HAD_STATE=1
fi

curl -fsS "$BASE/__void/ready.json" | tee "$OUT/ready.before.json"
echo

echo
echo "=== [2] write temporary signed critical manifest ==="
python3 - "$MAN" <<'PY'
import json, sys
from datetime import datetime, timezone

p = sys.argv[1]
m = {
  "version": "999.0.0",
  "protocol_version": 1,
  "min_protocol_version": 1,
  "channel": "stable",
  "published_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
  "sha256": "",
  "notes": "Critical security update proof: signed manifest should trigger participant notification prompt.",
  "signature": {
    "alg": "ed25519",
    "key_id": "dev-ed25519-local-v1",
    "sig": ""
  }
}
open(p, "w").write(json.dumps(m, indent=2) + "\n")
PY

ops/void-sign-update-manifest.sh "$MAN" "$SIGN_KEY" > "$OUT/sign.log"
rm -f "$STATE"

echo
echo "=== [3] notification status should fire ==="
curl -fsS "$BASE/__void/update/notification-status.json" | tee "$OUT/critical-status.json"
echo

python3 - "$OUT/critical-status.json" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("manifest_found") is True, j
assert j.get("signature_valid") is True, j
assert j.get("update_available") is True, j
assert j.get("severity") in ("critical", "security"), j
n = j.get("notification") or {}
assert n.get("should_notify") is True, j
assert n.get("suppressed") is False, j
assert (n.get("actions") or {}).get("update_now_enabled") is False, j
print("[ok] signed critical update triggers safe notification")
PY

echo
echo "=== [4] participant UI wiring present ==="
curl -fsS "$BASE/participant" > "$OUT/participant.html"
grep -q "topStripUpdate" "$OUT/participant.html"
grep -q "topStripUpdateText" "$OUT/participant.html"
grep -q "topStripUpdateNowBtn" "$OUT/participant.html"
grep -q "topStripUpdateRemindBtn" "$OUT/participant.html"
grep -q "/__void/update/notification-status.json" "$OUT/participant.html"
grep -q "/__void/update/update-now" "$OUT/participant.html"
grep -q "/__void/update/remind-later" "$OUT/participant.html"
echo "[ok] participant UI update prompt wiring present"

echo
echo "=== [5] update-now must remain blocked ==="
set +e
curl -sS -w "\n%{http_code}\n" \
  -H "content-type: application/json" \
  -X POST "$BASE/__void/update/update-now" \
  --data '{"source":"critical_update_ui_proof"}' > "$OUT/update-now.http"
RC=$?
set -e

cat "$OUT/update-now.http"
CODE="$(tail -n 1 "$OUT/update-now.http" | tr -d '\r')"
test "$RC" = "0"
test "$CODE" = "501"

python3 - "$OUT/update-now.http" <<'PY'
import json, pathlib, sys
raw = pathlib.Path(sys.argv[1]).read_text().splitlines()
body = "\n".join(raw[:-1])
j = json.loads(body)
assert j.get("ok") is False, j
assert j.get("installs_update") is False, j
assert j.get("sends_transaction") is False, j
assert j.get("error") == "install_execution_not_wired", j
print("[ok] update-now remains blocked/non-installing")
PY

echo
echo "=== [6] restore original manifest/state now ==="
cleanup
trap - EXIT

curl -fsS "$BASE/__void/update/notification-status.json" | tee "$OUT/restored-status.json"
echo

python3 - "$OUT/restored-status.json" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("update_available") is False, j
assert j.get("severity") == "normal", j
assert (j.get("manifest") or {}).get("version") == "0.1.0-demo", j
print("[ok] original update manifest restored")
PY

echo
echo "out=$OUT"
