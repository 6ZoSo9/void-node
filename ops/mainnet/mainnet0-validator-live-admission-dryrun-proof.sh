#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
INV="ops/mainnet/mainnet0-validator-candidate-inventory.current.txt"
OUT="/tmp/void-mainnet0-validator-live-admission-dryrun.next-onboard.json"
POST_OUT="/tmp/void-mainnet0-validator-live-admission-dryrun.post-guard.json"

echo "=== Mainnet-0 validator live-admission dry-run proof ==="

echo
echo "=== [1] inventory status blocks live execution ==="
test -f "$INV"
grep -q "status=candidate_inventory_ready_not_admitted" "$INV"
grep -q "selector_state=ready" "$INV"
grep -q "selected_candidate_name=vault123" "$INV"
grep -q "command_present=true" "$INV"
grep -q "live_admission_allowed=false" "$INV"
grep -q "live_admission_executed=false" "$INV"
grep -q "money_step=last" "$INV"
echo "[ok] inventory says candidate ready but not admitted"

echo
echo "=== [2] read-only next-onboard selector ==="
curl -fsS "$BASE/__void/runtime/validator-truth/next-onboard" > "$OUT"

python3 - <<'PY' "$OUT"
import json, sys
p = sys.argv[1]
j = json.load(open(p))
cmd = str(j.get("command") or "")
checks = {
    "ok": j.get("ok") is True,
    "selectedCandidateName": j.get("selectedCandidateName") == "vault123",
    "selectedCandidateAddr_present": bool(j.get("selectedCandidateAddr")),
    "currentValidatorCount": j.get("currentValidatorCount") == 123,
    "expectedValidatorCount": j.get("expectedValidatorCount") == 124,
    "targetEpoch_present": bool(j.get("targetEpoch")),
    "command_present": bool(cmd),
    "command_has_candidate": "CANDIDATE_NAME=vault123" in cmd,
    "command_has_expected_count": "EXPECTED_VALIDATOR_COUNT=124" in cmd,
    "command_uses_onboard_runbook": "validator-staking-upgrade-onboard-runbook.sh" in cmd,
}
bad = [k for k,v in checks.items() if not v]
print(checks)
if bad:
    raise SystemExit("[ERR] selector dry-run checks failed: " + ",".join(bad))
PY

echo "[ok] selector exposes vault123 command without executing it"

echo
echo "=== [3] submit route must remain guarded without confirm:true ==="
set +e
HTTP_CODE="$(
  curl -sS -o "$POST_OUT" -w "%{http_code}" \
    -X POST "$BASE/__void/participant/stake/next-onboard" \
    -H "content-type: application/json" \
    --data '{"dry_run":true}'
)"
set -e

echo "http_code=$HTTP_CODE"
cat "$POST_OUT"
echo

if [ "$HTTP_CODE" != "400" ]; then
  echo "[ERR] expected guarded POST to return 400 without confirm:true"
  exit 1
fi

grep -q "confirmation_required" "$POST_OUT"
echo "[ok] POST live admission remains guarded unless confirm:true is explicitly provided"

echo
echo "=== [4] blockers proof still passes ==="
make mainnet0-blockers-proof

echo
echo "=== [5] status smoke still passes ==="
make mainnet0-status-smoke

echo
echo "=== [6] summary ==="
python3 - <<'PY'
print({
  "dryrun_proof": "green",
  "selected_candidate": "vault123",
  "live_admission_executed": False,
  "submit_without_confirm": "blocked",
  "validator_live_admission": "blocked",
  "money_step": "last",
})
PY

echo
echo "[ok] Mainnet-0 validator live-admission dry-run proof passed"
