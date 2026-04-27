#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
ACC="${ACC:-0x9ef8A8106858Ee6D6dfe8c3850d4320D2717FD55}"
OUT="${OUT:-/tmp/void-validator-live-submit-readiness-proof.$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== validator registration live-submit readiness proof ==="
echo "base=$BASE"
echo "account=$ACC"
echo "out=$OUT"

echo
echo "=== [a] build + restart ==="
npm run build
systemctl --user restart void-node.service
sleep 3

echo
echo "=== [b] readiness aggregate ==="
curl -fsS "$BASE/__void/participant/validator-registration/live-submit-readiness?account=$ACC" \
  > "$OUT/readiness.json"

python3 -m json.tool "$OUT/readiness.json" | sed -n '1,220p'

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
assert "wallet_authority_not_ready" in j["blockers"]
assert "live_execution_not_wired" in j["blockers"]

r=j["readiness"]
assert r["submit_http_status"] == 501
assert r["wrong_chain_http_status"] == 409
assert r["double_guard_http_status"] == 200
assert r["submitIntentId"] == r["doubleGuardIntentId"]
assert r["payloadEquality"]["ok"] is True

print("[ok] live-submit readiness aggregate gates green except wallet/live execution")
PY

echo
echo "=== [c] invalid readiness account rejects ==="
HTTP_BAD="$(curl -sS -o "$OUT/readiness.bad.json" -w '%{http_code}' \
  "$BASE/__void/participant/validator-registration/live-submit-readiness?account=bad")"
echo "bad_http_code=$HTTP_BAD"
python3 -m json.tool "$OUT/readiness.bad.json"
test "$HTTP_BAD" = "400"

echo
echo "=== [d] double-submit guard status remains non-executing ==="
curl -fsS "$BASE/__void/participant/validator-registration/double-submit-guard/status" \
  > "$OUT/double-guard-status.json"
python3 -m json.tool "$OUT/double-guard-status.json"
python3 - <<'PY' "$OUT/double-guard-status.json"
import json, sys
j=json.load(open(sys.argv[1]))
assert j["ok"] is True
assert j["mutation"] is False
assert j["sends_transaction"] is False
assert j["submit_allowed"] is False
assert j["live_execution_wired"] is False
print("[ok] double-submit guard status remains non-executing")
PY

echo
echo "=== [e] equality proof still green ==="
ops/mainnet0/validator-registration-submit-payload-equality-proof.sh

echo
echo "=== [f] wrong-chain proof still green ==="
ops/mainnet0/validator-registration-wrong-chain-rejection-proof.sh

echo
echo "=== [g] public export still gitleaks-clean ==="
ops/security/build-public-release-tree.sh

echo
echo "[ok] validator registration live-submit readiness proof green"
