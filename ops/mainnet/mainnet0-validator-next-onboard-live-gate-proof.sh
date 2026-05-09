#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
SRC="src/index.ts"

NO_CONFIRM="/tmp/void-next-onboard-live-gate.no-confirm.json"
ENV_OFF="/tmp/void-next-onboard-live-gate.env-off.json"
MISSING_INTENT="/tmp/void-next-onboard-live-gate.missing-intent.json"
WRONG_INTENT="/tmp/void-next-onboard-live-gate.wrong-intent.json"
SELECTOR="/tmp/void-next-onboard-live-gate.selector.json"

echo "=== Mainnet-0 validator next-onboard live gate proof ==="

echo
echo "=== [1] source safety gates exist ==="
grep -q 'VOID_VALIDATOR_NEXT_ONBOARD_LIVE_EXECUTION' "$SRC"
grep -q 'live_execution_disabled' "$SRC"
grep -q 'operator_intent_required' "$SRC"
grep -q 'operator_intent_mismatch' "$SRC"
grep -q 'CANDIDATE_NAME: candidateName' "$SRC"
grep -q 'TARGET_EPOCH: String(targetEpoch)' "$SRC"
grep -q 'EXPECTED_VALIDATOR_COUNT: String(expectedValidatorCount)' "$SRC"
grep -q 'ADMIT_${candidateName}_EPOCH_${targetEpoch}_COUNT_${expectedValidatorCount}' "$SRC"
echo "[ok] source contains kill switch, exact intent gate, and explicit runbook env binding"

echo
echo "=== [2] build and restart ==="
npm run build
systemctl --user unset-environment VOID_VALIDATOR_NEXT_ONBOARD_LIVE_EXECUTION >/dev/null 2>&1 || true
systemctl --user restart void-node.service
sleep 3

READY_RC=1
for i in $(seq 1 60); do
  if curl -fsS "$BASE/__void/ready.json" > /tmp/void-next-onboard-live-gate.ready.json 2>/tmp/void-next-onboard-live-gate.ready.err; then
    READY_RC=0
    break
  fi
  sleep 1
done

if [ "$READY_RC" -ne 0 ]; then
  echo "[ERR] node did not become ready after restart"
  cat /tmp/void-next-onboard-live-gate.ready.err 2>/dev/null || true
  systemctl --user status void-node.service --no-pager -l | sed -n "1,120p" || true
  false
fi

cat /tmp/void-next-onboard-live-gate.ready.json
echo
python3 - /tmp/void-next-onboard-live-gate.ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", 999999)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [3] read-only selector still points to expected next candidate ==="
curl -fsS "$BASE/__void/runtime/validator-truth/next-onboard" > "$SELECTOR"
python3 - "$SELECTOR" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("selectedCandidateName") == "vault124", j
assert int(j.get("targetEpoch")) == 126, j
assert int(j.get("expectedValidatorCount")) == 125, j
assert "validator-staking-upgrade-onboard-runbook.sh" in str(j.get("command") or ""), j
print({
  "selectedCandidateName": j.get("selectedCandidateName"),
  "targetEpoch": j.get("targetEpoch"),
  "expectedValidatorCount": j.get("expectedValidatorCount"),
  "read_only_selector": True,
})
PY

echo
echo "=== [4] POST without confirm is blocked ==="
HTTP1="$(
  curl -sS -o "$NO_CONFIRM" -w "%{http_code}" \
    -X POST "$BASE/__void/participant/stake/next-onboard" \
    -H "content-type: application/json" \
    --data '{}'
)"
echo "http=$HTTP1"
cat "$NO_CONFIRM"
echo

python3 - "$NO_CONFIRM" "$HTTP1" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
http=sys.argv[2]
assert http == "400", (http, j)
assert j.get("ok") is False, j
assert j.get("error") == "confirmation_required", j
print("[ok] no-confirm request blocked")
PY


echo
echo "=== [5] confirm true but missing operator intent is blocked before env switch ==="
HTTP_MISSING="$(curl -sS -o "$MISSING_INTENT" -w "%{http_code}" \
  -X POST "$BASE/__void/participant/stake/next-onboard" \
  -H "content-type: application/json" \
  --data '{"confirm":true}')"
echo "http=$HTTP_MISSING"
cat "$MISSING_INTENT"
echo

python3 - "$MISSING_INTENT" "$HTTP_MISSING" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
http=sys.argv[2]
assert http == "400", (http, j)
assert j.get("ok") is False, j
assert j.get("error") == "operator_intent_required", j
print("[ok] missing operator intent blocked before live execution env check")
PY

echo
echo "=== [6] wrong operator intent is blocked before env switch ==="
HTTP_WRONG="$(curl -sS -o "$WRONG_INTENT" -w "%{http_code}" \
  -X POST "$BASE/__void/participant/stake/next-onboard" \
  -H "content-type: application/json" \
  --data '{"confirm":true,"expected_candidate":"vault124","expected_target_epoch":126,"expected_validator_count":125,"operator_intent":"ADMIT_vault124_EPOCH_126_COUNT_999"}')"
echo "http=$HTTP_WRONG"
cat "$WRONG_INTENT"
echo

python3 - "$WRONG_INTENT" "$HTTP_WRONG" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
http=sys.argv[2]
assert http == "400", (http, j)
assert j.get("ok") is False, j
assert j.get("error") == "operator_intent_mismatch", j
assert j.get("expected_intent") == "ADMIT_vault124_EPOCH_126_COUNT_125", j
print("[ok] wrong operator intent blocked before live execution env check")
PY

echo
echo "=== [7] exact-intent request is still blocked while live execution env is off ==="
HTTP2="$(
  curl -sS -o "$ENV_OFF" -w "%{http_code}" \
    -X POST "$BASE/__void/participant/stake/next-onboard" \
    -H "content-type: application/json" \
    --data '{"confirm":true,"expected_candidate":"vault124","expected_target_epoch":126,"expected_validator_count":125,"operator_intent":"ADMIT_vault124_EPOCH_126_COUNT_125"}'
)"
echo "http=$HTTP2"
cat "$ENV_OFF"
echo

python3 - "$ENV_OFF" "$HTTP2" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
http=sys.argv[2]
assert http == "403", (http, j)
assert j.get("ok") is False, j
assert j.get("error") == "live_execution_disabled", j
assert j.get("blocker") == "VOID_VALIDATOR_NEXT_ONBOARD_LIVE_EXECUTION_not_enabled", j
print("[ok] exact-intent request blocked by live execution kill switch")
PY

echo
echo "=== [8] existing readiness proof still passes ==="
make mainnet0-validator-live-admission-readiness-proof

echo
echo "=== [9] summary ==="
python3 - <<'PY'
print({
  "next_onboard_live_gate": "green",
  "confirm_required": True,
  "kill_switch_required": "VOID_VALIDATOR_NEXT_ONBOARD_LIVE_EXECUTION=1",
  "exact_operator_intent_required": True,
  "candidate": "vault124",
  "target_epoch": 126,
  "expected_validator_count": 125,
  "live_admission_executed": False,
  "money_step": "last",
})
PY

echo
echo "[ok] Mainnet-0 validator next-onboard live gate proof passed"
