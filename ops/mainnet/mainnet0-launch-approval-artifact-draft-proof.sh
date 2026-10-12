#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

DRAFT="ops/mainnet/mainnet0-launch-approval-artifact.draft.md"
TEMPLATE="ops/mainnet/mainnet0-launch-approval-artifact.template.md"
AUTHORITY="ops/mainnet/mainnet0-authority-funding-preflight.current.md"
KEY_RESULT="ops/mainnet/mainnet0-key-ceremony-result-20260523-122739.md"
BACKUP="ops/mainnet/mainnet0-key-ceremony-backup-voidkey2-20260523-122135.md"
GONOGO="ops/mainnet/mainnet0-final-gonogo-map.current.md"

echo "=== Mainnet-0 launch approval artifact draft proof ==="

echo
echo "=== [1] required files ==="
test -f "$DRAFT"
test -f "$TEMPLATE"
test -f "$AUTHORITY"
test -f "$KEY_RESULT"
test -f "$BACKUP"
test -f "$GONOGO"
echo "[ok] required files exist"

echo
echo "=== [2] draft is explicitly not approval ==="
grep -q '^status: draft_only_not_approval$' "$DRAFT"
grep -q '^launch_state: not_go_for_public_mainnet0$' "$DRAFT"
grep -q '^launch_approval: false$' "$DRAFT"
grep -q '^mutation_allowed: false$' "$DRAFT"
grep -q '^approval_artifact_created: false$' "$DRAFT"
grep -q '^funding: false$' "$DRAFT"
grep -q '^authority_transfer: false$' "$DRAFT"
grep -q '^validator_mutation: false$' "$DRAFT"
grep -q '^buy_void_fulfillment: false$' "$DRAFT"
grep -q '^money_step: last$' "$DRAFT"
grep -q 'This file is not launch approval.' "$DRAFT"
grep -q 'This file does not approve Mainnet-0 launch.' "$DRAFT"
grep -q 'This file does not set launch_approval true.' "$DRAFT"
grep -q 'This file does not set mutation_allowed true.' "$DRAFT"
echo "[ok] draft is non-approving and non-mutating"

echo
echo "=== [3] checkpoint inputs are recorded ==="
grep -q '^approved_commit_candidate: 34fe1807$' "$DRAFT"
grep -q '^approved_tag_candidate: ckpt-authority-funding-preflight-green-20260523-210336$' "$DRAFT"
grep -q '^authority_funding_preflight: ckpt-authority-funding-preflight-green-20260523-210336$' "$DRAFT"
grep -q '^key_ceremony_backup_receipt: ckpt-key-ceremony-voidkey2-backup-receipt-green-20260523-201758$' "$DRAFT"
grep -q '^post_key_backup_launch_checklist: ckpt-post-key-backup-launch-checklist-green-20260523-204135$' "$DRAFT"
echo "[ok] checkpoint inputs recorded"

echo
echo "=== [4] future live approval fields are documented ==="
grep -q 'approval_intent: OPERATOR_APPROVES_PUBLIC_MAINNET0_LAUNCH' "$DRAFT"
grep -q 'launch_approval_requested: true' "$DRAFT"
grep -q 'mutation_allowed_requested: true' "$DRAFT"
grep -q 'authority/funding preflight result' "$DRAFT"
grep -q 'operator signature or marker' "$DRAFT"
echo "[ok] future live approval fields documented"

echo
echo "=== [5] existing docs still block launch ==="
grep -q '^status: plan_only_not_execution$' "$AUTHORITY"
grep -q '^funding: false$' "$AUTHORITY"
grep -q '^authority_transfer: false$' "$AUTHORITY"
grep -q '^decision: NO_GO$' "$GONOGO"
grep -q '^launch_approval: false$' "$GONOGO"
grep -q '^mutation_allowed: false$' "$GONOGO"
grep -q '^money_step: last$' "$GONOGO"
echo "[ok] existing docs remain blocked"

echo
echo "=== [6] node ready ==="
curl -fsS http://127.0.0.1:4100/__void/ready.json > /tmp/void-launch-approval-draft-ready.json
python3 - /tmp/void-launch-approval-draft-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [7] summary ==="
python3 - <<'PY'
print({
  "launch_approval_artifact_draft": "green",
  "status": "draft_only_not_approval",
  "launch_approval": False,
  "mutation_allowed": False,
  "funding": False,
  "authority_transfer": False,
  "validator_mutation": False,
  "buy_void_fulfillment": False,
  "money_step": "last",
})
PY

echo
echo "[ok] Mainnet-0 launch approval artifact draft proof passed"
