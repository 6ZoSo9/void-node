#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
ACC="${ACC:-0x9ef8A8106858Ee6D6dfe8c3850d4320D2717FD55}"
HTML="/tmp/void-live-submit-status-ui-proof.html"
JSON="/tmp/void-live-submit-status-ui-proof.json"

echo "=== live-submit status UI proof ==="

npm run build
systemctl --user restart void-node.service
sleep 3

curl -fsS "$BASE/participant" > "$HTML"

for needle in \
  "Live Submit Status" \
  "validatorRegistrationLiveStatusPanel" \
  "validatorRegistrationLiveStatusSummary" \
  "validatorRegistrationLiveStatusSwitch" \
  "validatorRegistrationLiveStatusSigner" \
  "validatorRegistrationLiveStatusWallet" \
  "validatorRegistrationLiveStatusPayload" \
  "validatorRegistrationLiveStatusBlockers" \
  "/__void/participant/validator-registration/live-submit-status" \
  "Proof-submit not ready" \
  "UI submit remains disabled"
do
  grep -q "$needle" "$HTML"
  echo "[ok] html contains $needle"
done

grep -q 'id="validatorRegistrationSubmitDisabledBtn" type="button" disabled' "$HTML"
grep -q 'Submit Registration — Not Live' "$HTML"
echo "[ok] submit button remains disabled"

curl -fsS "$BASE/__void/participant/validator-registration/live-submit-status?account=$ACC" > "$JSON"

python3 - "$JSON" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j["ok"] is True
assert j["mutation"] is False
assert j["sends_transaction"] is False
assert j["submit_allowed"] is False
assert j["ready_for_proof_submit"] is False
assert "live_execution_kill_switch_off" in j["blockers"]
print("[ok] status endpoint remains safe/read-only")
PY

echo "[ok] validator registration live-submit status UI proof green"
