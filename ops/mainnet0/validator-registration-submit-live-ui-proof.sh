#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
ACC="${ACC:-0x9ef8A8106858Ee6D6dfe8c3850d4320D2717FD55}"
HTML="/tmp/void-validator-submit-live-ui-proof.html"
JSON="/tmp/void-validator-submit-live-ui-proof.status.json"
DISABLED="/tmp/void-validator-submit-live-ui-proof.disabled.json"

echo "=== validator registration submit-live UI proof ==="

npm run build
systemctl --user restart void-node.service
sleep 3

curl -fsS "$BASE/participant" > "$HTML"

for needle in \
  "validatorRegistrationSubmitLiveBtn" \
  "Submit Registration — Backend Gated" \
  "validatorRegistrationSubmitLiveBtnClickWired" \
  "Submit validator registration now" \
  "Checking live-submit gates before sending" \
  "Submitting validator registration through backend-gated route" \
  "/__void/participant/validator-registration/live-submit-status" \
  "/__void/participant/validator-registration/submit-live" \
  "Backend-gated submit is ready. Requires confirmation before sending" \
  "Backend-gated submit is blocked"
do
  grep -q "$needle" "$HTML"
  echo "[ok] html contains $needle"
done

grep -q 'id="validatorRegistrationSubmitLiveBtn" type="button" disabled' "$HTML"
grep -q 'id="validatorRegistrationSubmitDisabledBtn" type="button" disabled' "$HTML"
grep -q 'Submit Registration — Not Live' "$HTML"
echo "[ok] submit buttons are disabled in default HTML"

curl -fsS "$BASE/__void/participant/validator-registration/live-submit-status?account=$ACC" > "$JSON"

python3 -c 'import json,sys
j=json.load(open(sys.argv[1]))
assert j["ok"] is True
assert j["mutation"] is False
assert j["sends_transaction"] is False
assert j["submit_allowed"] is False
assert j["ready_for_proof_submit"] is False
assert "live_execution_kill_switch_off" in j["blockers"]
print("[ok] live-submit status remains default-safe/read-only")' "$JSON"

HTTP="$(curl -sS -o "$DISABLED" -w "%{http_code}" \
  -H "content-type: application/json" \
  -d "{\"account\":\"$ACC\",\"chainId\":2050}" \
  "$BASE/__void/participant/validator-registration/submit-live")"

echo "submit_live_default_http=$HTTP"
python3 -m json.tool "$DISABLED" | sed -n "1,120p"
test "$HTTP" = "501"

python3 -c 'import json,sys
j=json.load(open(sys.argv[1]))
assert j["ok"] is False
assert j["mutation"] is False
assert j["sends_transaction"] is False
assert j["submit_allowed"] is False
assert j["submit_blocked_reason"] == "live_execution_kill_switch_off"
print("[ok] submit-live remains disabled by default")' "$DISABLED"

echo "[ok] validator registration submit-live UI proof green"
