#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"


# __void_lane_candidate_key_env_v1
CANDIDATE_PK="${CANDIDATE_PK:-}"
CANDIDATE_PK_FILE="${CANDIDATE_PK_FILE:-}"

if [ -n "$CANDIDATE_PK_FILE" ]; then
  test -f "$CANDIDATE_PK_FILE"
fi

export CANDIDATE_PK
export CANDIDATE_PK_FILE


export PATH="$HOME/.foundry/bin:$PATH"

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="${OUT_DIR:-$PWD/.runtime/mainnet0}"
OUT_JSON="$OUT_DIR/validator-registration-lane-proof.$STAMP.json"
OUT_CURRENT="$OUT_DIR/validator-registration-lane-proof.current.json"
mkdir -p "$OUT_DIR"

STATUS_FILE="$OUT_DIR/validator-registration-status.$STAMP.json"
PARTICIPANT_FILE="$OUT_DIR/validator-registration-participant.$STAMP.json"
DRAFT_FILE="$OUT_DIR/validator-registration-draft.$STAMP.json"
INVALID_FILE="$OUT_DIR/validator-registration-invalid-draft.$STAMP.json"
HTML_FILE="$OUT_DIR/validator-registration-participant.$STAMP.html"

echo "=== [a] git truth ==="
git branch --show-current
git rev-parse --short HEAD
git describe --tags --always --dirty || true
git status --short

echo
echo "=== [b] isolated contract proof ==="
ops/mainnet0/validator-candidate-registry-proof.sh

echo
echo "=== [c] local deploy/register/waiting proof ==="
CANDIDATE_PK="$CANDIDATE_PK" CANDIDATE_PK_FILE="$CANDIDATE_PK_FILE" ops/mainnet0/validator-candidate-registry-local-deploy-proof.sh

echo
echo "=== [d] build ==="
npm run build

echo
echo "=== [e] restart node ==="
systemctl --user restart void-node.service
sleep 3

echo
echo "=== [f] read current local deploy artifact ==="
ART=".runtime/mainnet0/validator-candidate-registry.local.current.json"
test -f "$ART"
cat "$ART" | python3 -m json.tool | sed -n '1,160p'

ACC="$(python3 - "$ART" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    j = json.load(f)
print(j["candidate"])
PY
)"
echo "candidate=$ACC"

echo
echo "=== [g] registry status API invariant ==="
curl -fsS "$BASE/__void/mainnet0/validator-candidate-registry/status" > "$STATUS_FILE"
cat "$STATUS_FILE" | python3 -m json.tool | sed -n '1,140p'

python3 - "$STATUS_FILE" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    j = json.load(f)
assert j["ok"] is True
assert j["invariant_ok"] is True
assert j["public_registration_mutates_active_set"] is False
c = j["counts"]
assert str(c["candidateAfter"]) == "1"
assert str(c["waitingFinal"]) == "1"
assert str(c["activeFinal"]) == "0"
print("[ok] registry status invariant green")
PY

echo
echo "=== [h] participant status API ==="
curl -fsS "$BASE/__void/participant/validator-registration/status?account=$ACC" > "$PARTICIPANT_FILE"
cat "$PARTICIPANT_FILE" | python3 -m json.tool | sed -n '1,140p'

python3 - "$PARTICIPANT_FILE" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    j = json.load(f)
assert j["ok"] is True
assert j["invariant_ok"] is True
assert j["status"]["registered"] is True
assert j["status"]["state"] == "waiting"
assert str(j["latest_proof"]["activeCountFinal"]) == "0"
print("[ok] participant waiting status green")
PY

echo
echo "=== [i] registration draft API is non-mutating ==="
curl -fsS "$BASE/__void/participant/validator-registration/draft?account=$ACC" > "$DRAFT_FILE"
cat "$DRAFT_FILE" | python3 -m json.tool | sed -n '1,160p'

python3 - "$DRAFT_FILE" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    j = json.load(f)
assert j["ok"] is True
assert j["mutation"] is False
assert j["sends_transaction"] is False
assert j["functionSignature"] == "registerCandidate(address,bytes32,bytes32)"
assert str(j["valueWei"]) == "10000000000000000000000"
assert j["safety"]["public_registration_mutates_active_set"] is False
assert j["safety"]["enters_waiting_pool_before_active_admission"] is True
print("[ok] draft API non-mutating green")
PY

echo
echo "=== [j] invalid draft account rejects ==="
HTTP_CODE="$(curl -sS -o "$INVALID_FILE" -w '%{http_code}' \
  "$BASE/__void/participant/validator-registration/draft?account=not-an-address")"
echo "http_code=$HTTP_CODE"
cat "$INVALID_FILE" | python3 -m json.tool
test "$HTTP_CODE" = "400"

echo
echo "=== [k] participant UI contains status + draft + guarded shell ==="
curl -fsS "$BASE/participant" > "$HTML_FILE"

grep -E \
  'Validator Registration|Registration Draft|Register Validator|Submit Registration|validatorRegistration(State|Safety|Registry|Stake|Note|Counts|DraftSummary|DraftPreview|OpenDraftBtn|SubmitDisabledBtn|ButtonNote|DraftDetails)' \
  "$HTML_FILE" \
  | sed -n '1,180p'

for needle in \
  "Validator Registration" \
  "Registration Draft" \
  "Register Validator" \
  "Submit Registration" \
  "validatorRegistrationState" \
  "validatorRegistrationSafety" \
  "validatorRegistrationRegistry" \
  "validatorRegistrationStake" \
  "validatorRegistrationNote" \
  "validatorRegistrationCounts" \
  "validatorRegistrationDraftSummary" \
  "validatorRegistrationDraftPreview" \
  "validatorRegistrationOpenDraftBtn" \
  "validatorRegistrationSubmitDisabledBtn" \
  "validatorRegistrationButtonNote" \
  "validatorRegistrationDraftDetails"
do
  grep -q "$needle" "$HTML_FILE"
done
echo "[ok] participant UI validator registration shell green"

cat > "$OUT_JSON" <<JSON
{
  "ok": true,
  "kind": "validator_registration_lane_proof",
  "stamp": "$STAMP",
  "base": "$BASE",
  "candidate": "$ACC",
  "contract_proof": true,
  "local_deploy_register_waiting_proof": true,
  "registry_status_api": true,
  "participant_status_api": true,
  "draft_api_non_mutating": true,
  "invalid_account_rejected": true,
  "participant_ui_status": true,
  "participant_ui_draft_preview": true,
  "participant_ui_guarded_shell": true,
  "invariants": {
    "public_registration_mutates_active_set": false,
    "active_count_final": "0",
    "candidate_state": "waiting",
    "draft_mutation": false,
    "draft_sends_transaction": false,
    "submit_button_live": false
  }
}
JSON

cp "$OUT_JSON" "$OUT_CURRENT"

echo
echo "=== [l] lane proof artifact ==="
cat "$OUT_JSON" | python3 -m json.tool

echo
echo "[ok] full safe validator registration lane proof green"
