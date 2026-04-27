#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
ACC="${ACC:-0x9ef8A8106858Ee6D6dfe8c3850d4320D2717FD55}"
OUT="${OUT:-/tmp/void-validator-wrong-chain.$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== validator registration wrong-chain rejection proof ==="
echo "base=$BASE"
echo "account=$ACC"
echo "out=$OUT"

echo
echo "=== [a] build + restart ==="
npm run build
systemctl --user restart void-node.service
sleep 3

echo
echo "=== [b] draft must advertise VOID chain id 2050 ==="
curl -fsS "$BASE/__void/participant/validator-registration/draft?account=$ACC" \
  > "$OUT/draft.json"
python3 -m json.tool "$OUT/draft.json" | grep -E '"chainId"|"mutation"|"sends_transaction"|"functionSignature"|"valueWei"'
python3 - <<'PY' "$OUT/draft.json"
import json, sys
j=json.load(open(sys.argv[1]))
assert j["ok"] is True
assert j["mutation"] is False
assert j["sends_transaction"] is False
assert int(j["chainId"]) == 2050
print("[ok] draft chainId is 2050 and read-only")
PY

echo
echo "=== [c] submit with wrong chain hint must remain blocked and non-mutating ==="
HTTP_WRONG="$(curl -sS -o "$OUT/submit.wrong-chain.json" -w '%{http_code}' \
  -H 'content-type: application/json' \
  -d "{\"account\":\"$ACC\",\"chainId\":1}" \
  "$BASE/__void/participant/validator-registration/submit")"
echo "wrong_chain_http_code=$HTTP_WRONG"
python3 -m json.tool "$OUT/submit.wrong-chain.json" | sed -n '1,180p'
test "$HTTP_WRONG" = "409"

python3 - <<'PY' "$OUT/submit.wrong-chain.json"
import json, sys
j=json.load(open(sys.argv[1]))
assert j["mutation"] is False
assert j["sends_transaction"] is False
assert j["submit_allowed"] is False
assert j["error"] == "wrong_chain"
assert j["expectedChainId"] == 2050
assert j["requestedChainId"] == 1
assert j["submit_blocked_reason"] == "wrong_chain"
assert j["gates"]["wrong_chain_rejected"] is True
assert j["gates"]["live_execution_wired"] is False
print("[ok] wrong-chain hinted submit is explicitly rejected and non-mutating")
PY

echo
echo "=== [d] current submit should still be blocked on correct chain path ==="
HTTP_OK_CHAIN="$(curl -sS -o "$OUT/submit.correct-chain.json" -w '%{http_code}' \
  -H 'content-type: application/json' \
  -d "{\"account\":\"$ACC\",\"chainId\":2050}" \
  "$BASE/__void/participant/validator-registration/submit")"
echo "correct_chain_http_code=$HTTP_OK_CHAIN"
python3 -m json.tool "$OUT/submit.correct-chain.json" | grep -E '"mutation"|"sends_transaction"|"submit_allowed"|"submit_blocked_reason"|"core_gates_green"|"live_execution_wired"'
test "$HTTP_OK_CHAIN" = "501"

python3 - <<'PY' "$OUT/submit.correct-chain.json"
import json, sys
j=json.load(open(sys.argv[1]))
assert j["mutation"] is False
assert j["sends_transaction"] is False
assert j["submit_allowed"] is False
assert j["core_gates_green"] is True
assert j["gates"]["live_execution_wired"] is False
print("[ok] correct-chain hinted submit is blocked until live execution is wired")
PY

echo
echo "=== [e] submit payload equality proof still green ==="
ops/mainnet0/validator-registration-submit-payload-equality-proof.sh

echo
echo "=== [f] submit gates still green ==="
ops/mainnet0/validator-registration-submit-gates-proof.sh

echo
echo "=== [g] public export still gitleaks-clean ==="
ops/security/build-public-release-tree.sh

echo
echo "[ok] validator registration wrong-chain rejection proof green"
