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
grep -q "command_present=true" "$INV"
grep -q "live_admission_allowed=false" "$INV"
grep -q "live_admission_executed=false" "$INV"
grep -q "money_step=last" "$INV"
echo "[ok] inventory says candidate ready but not admitted"

echo
echo "=== [2] read-only next-onboard selector ==="
curl -fsS "$BASE/__void/runtime/validator-truth/next-onboard" > "$OUT"

python3 - <<'PY' "$OUT" "$INV"
import json, re, sys
from pathlib import Path

out_path, inv_path = sys.argv[1:3]
j = json.load(open(out_path))
cmd = str(j.get("command") or "")

selected = str(j.get("selectedCandidateName") or "")
current_epoch = int(j.get("currentEpoch"))
target_epoch = int(j.get("targetEpoch"))
current_count = int(j.get("currentValidatorCount"))
expected_count = int(j.get("expectedValidatorCount"))

inv_text = Path(inv_path).read_text(errors="replace")
inv_selected = ""
m = re.search(r"^selected_candidate_name=(.*)$", inv_text, flags=re.M)
if m:
    inv_selected = m.group(1).strip()

checks = {
    "ok": j.get("ok") is True,
    "selectedCandidateName_present": bool(selected),
    "selectedCandidateAddr_present": bool(j.get("selectedCandidateAddr")),
    "targetEpoch_is_next": target_epoch == current_epoch + 1,
    "expectedValidatorCount_is_next": expected_count == current_count + 1,
    "command_present": bool(cmd),
    "command_has_candidate": f"CANDIDATE_NAME={selected}" in cmd,
    "command_has_target_epoch": f"TARGET_EPOCH={target_epoch}" in cmd,
    "command_has_expected_count": f"EXPECTED_VALIDATOR_COUNT={expected_count}" in cmd,
    "command_uses_onboard_runbook": "validator-staking-upgrade-onboard-runbook.sh" in cmd,
    "inventory_not_marked_executed": "live_admission_executed=false" in inv_text,
}

# If inventory records a selected candidate, it must match live selector.
# This prevents stale inventory from silently passing.
if inv_selected:
    checks["inventory_selected_matches_live_selector"] = inv_selected == selected

bad = [k for k,v in checks.items() if not v]
print({
    "selectedCandidateName": selected,
    "currentEpoch": current_epoch,
    "targetEpoch": target_epoch,
    "currentValidatorCount": current_count,
    "expectedValidatorCount": expected_count,
    "inventorySelectedCandidate": inv_selected or None,
    "checks": checks,
})
if bad:
    raise SystemExit("[ERR] selector dry-run checks failed: " + ",".join(bad))
PY

echo "[ok] selector exposes current next-onboard command without executing it"

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
python3 - <<'PY' "$OUT"
import json, sys
j=json.load(open(sys.argv[1]))
print({
  "dryrun_proof": "green",
  "selected_candidate": j.get("selectedCandidateName"),
  "current_epoch": j.get("currentEpoch"),
  "target_epoch": j.get("targetEpoch"),
  "current_validator_count": j.get("currentValidatorCount"),
  "expected_validator_count": j.get("expectedValidatorCount"),
  "live_admission_executed": False,
  "submit_without_confirm": "blocked",
  "validator_live_admission": "blocked",
  "money_step": "last",
})
PY

echo
echo "[ok] Mainnet-0 validator live-admission dry-run proof passed"
