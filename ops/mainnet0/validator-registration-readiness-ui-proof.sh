#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
ACC="${ACC:-0x9ef8A8106858Ee6D6dfe8c3850d4320D2717FD55}"
OUT="${OUT:-/tmp/void-validator-readiness-ui-proof.$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== validator registration readiness UI proof ==="
echo "base=$BASE"
echo "account=$ACC"
echo "out=$OUT"

echo
echo "=== [a] build + restart ==="
npm run build
systemctl --user restart void-node.service
sleep 3

echo
echo "=== [b] participant page contains readiness UI panel ==="
curl -fsS "$BASE/participant" > "$OUT/participant.html"

for needle in \
  "Live Submit Readiness" \
  "validatorRegistrationReadinessPanel" \
  "validatorRegistrationReadinessSummary" \
  "validatorRegistrationReadinessCore" \
  "validatorRegistrationReadinessWallet" \
  "validatorRegistrationReadinessExecution" \
  "validatorRegistrationReadinessSubmit" \
  "__void_validator_registration_readiness_ui_v1" \
  "aria-live=\"polite\"" \
  "role=\"status\""
do
  if grep -q "$needle" "$OUT/participant.html"; then
    echo "[ok] UI needle present: $needle"
  else
    echo "[ERR] missing UI needle: $needle"
    exit 1
  fi
done

echo
echo "=== [c] readiness aggregate remains expected blocked state ==="
curl -fsS "$BASE/__void/participant/validator-registration/live-submit-readiness?account=$ACC" \
  > "$OUT/readiness.json"

python3 -m json.tool "$OUT/readiness.json" | grep -E '"ok"|"mutation"|"sends_transaction"|"submit_allowed"|"submit_blocked_reason"|"public_registration_safe"|"wallet_authority_ready"|"payload_equality_ready"|"wrong_chain_gate_ready"|"double_submit_guard_ready"|"live_execution_wired"|"core_gates_green_except_wallet_and_live"|"submitIntentId"|"doubleGuardIntentId"'

python3 - <<'PY' "$OUT/readiness.json"
import json, sys
j=json.load(open(sys.argv[1]))

assert j["ok"] is True
assert j["mutation"] is False
assert j["sends_transaction"] is False
assert j["submit_allowed"] is False

g=j["gates"]
assert g["public_registration_safe"] is True
assert g["payload_equality_ready"] is True
assert g["wrong_chain_gate_ready"] is True
assert g["double_submit_guard_ready"] is True
assert g["wallet_authority_ready"] is False
assert g["live_execution_wired"] is False

assert j["core_gates_green_except_wallet_and_live"] is True
assert j["submit_blocked_reason"] == "wallet_authority_not_ready"
assert "wallet_authority_not_ready" in j["blockers"]
assert "live_execution_not_wired" in j["blockers"]

r=j["readiness"]
assert r["submit_http_status"] == 501
assert r["wrong_chain_http_status"] == 409
assert r["double_guard_http_status"] == 200
assert r["submitIntentId"] == r["doubleGuardIntentId"]
assert r["payloadEquality"]["ok"] is True

print("[ok] readiness aggregate expected blocked state green")
PY

echo
echo "=== [d] live-submit readiness proof still green ==="
ops/mainnet0/validator-registration-live-submit-readiness-proof.sh

echo
echo "=== [e] public export still gitleaks-clean ==="
ops/security/build-public-release-tree.sh

echo
echo "[ok] validator registration readiness UI proof green"
