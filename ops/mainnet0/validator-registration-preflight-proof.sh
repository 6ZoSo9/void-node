#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
ACC="${ACC:-0x9ef8A8106858Ee6D6dfe8c3850d4320D2717FD55}"

echo "=== validator registration preflight proof ==="
echo "base=$BASE"
echo "account=$ACC"

echo
echo "=== [a] build + restart ==="
npm run build
systemctl --user restart void-node.service
sleep 3

echo
echo "=== [b] preflight API must block submit but pass core gates ==="
PF="$(curl -fsS "$BASE/__void/participant/validator-registration/preflight?account=$ACC")"
printf '%s\n' "$PF" | python3 -m json.tool | sed -n '1,180p'

PF="$PF" python3 - <<'PY'
import json, os
j = json.loads(os.environ["PF"])
assert j["ok"] is True
assert j["mutation"] is False
assert j["sends_transaction"] is False
assert j["submit_allowed"] is False
assert j["submit_blocked_reason"] == "live_wallet_execution_not_wired"
assert j["gates"]["chain_id_is_2050"] is True
assert j["gates"]["active_set_safe"] is True
assert j["gates"]["wallet_gate_authoritative"] is False
assert j["gates"]["live_execution_wired"] is False
assert j["gates_green_except_intentional_submit_blocks"] is True
print("[ok] preflight API blocked intentionally and core gates green")
PY

echo
echo "=== [c] invalid preflight account rejects ==="
HTTP_CODE="$(curl -sS -o /tmp/void-preflight-invalid-proof.json -w '%{http_code}' \
  "$BASE/__void/participant/validator-registration/preflight?account=bad")"
echo "http_code=$HTTP_CODE"
cat /tmp/void-preflight-invalid-proof.json | python3 -m json.tool
test "$HTTP_CODE" = "400"

echo
echo "=== [d] UI contains preflight preview shell ==="
HTML_FILE="/tmp/void-validator-registration-preflight-ui.$$.html"
curl -fsS "$BASE/participant" > "$HTML_FILE"

for needle in \
  "Submit Preflight" \
  "validatorRegistrationPreflightSummary" \
  "validatorRegistrationPreflightPreview" \
  "validatorRegistrationPreflightDetails" \
  "validatorRegistrationPreflightResp"
do
  grep -q "$needle" "$HTML_FILE"
done

grep -E 'Submit Preflight|validatorRegistrationPreflight(Summary|Preview|Details|Resp)' "$HTML_FILE" | sed -n '1,80p'
echo "[ok] preflight UI present"

echo
echo "=== [e] submit gates still green ==="
ops/mainnet0/validator-registration-submit-gates-proof.sh

echo
echo "[ok] validator registration preflight proof green"
