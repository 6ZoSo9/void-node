#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="ops/mainnet/mainnet0-launch-approval-artifact.template.md"
PREP="ops/mainnet/mainnet0-launch-approval-artifact-prep.current.md"
PLAN="ops/mainnet/mainnet0-launch-approval-plan.current.md"
GONOGO="ops/mainnet/mainnet0-final-gonogo-map.current.md"
STATUS="ops/mainnet/mainnet0-status.current.md"

echo "=== Mainnet-0 launch approval artifact template proof ==="

echo
echo "=== [1] required docs ==="
test -f "$DOC"
test -f "$PREP"
test -f "$PLAN"
test -f "$GONOGO"
test -f "$STATUS"
echo "[ok] required docs exist"

echo
echo "=== [2] template is explicitly not approval ==="
grep -q '^status: template_only_not_approval$' "$DOC"
grep -q '^launch_state: not_go_for_public_mainnet0$' "$DOC"
grep -q '^launch_approval: false$' "$DOC"
grep -q '^mutation_allowed: false$' "$DOC"
grep -q '^approval_artifact_created: false$' "$DOC"
grep -q 'This file is not launch approval.' "$DOC"
grep -q 'This file must not be used as the final approval artifact.' "$DOC"
grep -q 'This file does not set launch_approval true.' "$DOC"
grep -q 'This file does not set mutation_allowed true.' "$DOC"
echo "[ok] template is non-approving and non-mutating"

echo
echo "=== [3] required final artifact fields are documented ==="
grep -q 'approval_intent: OPERATOR_APPROVES_PUBLIC_MAINNET0_LAUNCH' "$DOC"
grep -q 'approved_commit: REQUIRED' "$DOC"
grep -q 'approved_tag: REQUIRED' "$DOC"
grep -q 'launch_state_requested: REQUIRED' "$DOC"
grep -q 'launch_approval_requested: REQUIRED' "$DOC"
grep -q 'mutation_allowed_requested: REQUIRED' "$DOC"
grep -q 'operator_signature_or_marker: REQUIRED' "$DOC"
grep -q 'key_ceremony_result: REQUIRED' "$DOC"
echo "[ok] final approval fields documented"

echo
echo "=== [4] safety statements are documented ==="
grep -q 'Ready signals alone are not launch approval.' "$DOC"
grep -q 'Public candidate/waiting registration is not active validator admission.' "$DOC"
grep -q 'Buy VOID payment confirmation is not VOID sent.' "$DOC"
grep -q 'Every Buy VOID fulfillment requires explicit payment verification and explicit VOID transaction reference.' "$DOC"
grep -q 'No credential material, private keys, wallet secrets, seed phrases, or signing keys are included.' "$DOC"
grep -q 'Money-moving steps remain separately guarded.' "$DOC"
echo "[ok] safety statements documented"

echo
echo "=== [5] existing launch docs still block approval ==="
grep -q '^launch_approval: false$' "$PREP"
grep -q '^mutation_allowed: false$' "$PREP"
grep -q '^launch_approval: false$' "$PLAN"
grep -q '^mutation_allowed: false$' "$PLAN"
grep -q '^launch_approval: false$' "$GONOGO"
grep -q '^mutation_allowed: false$' "$GONOGO"
grep -q '^status: not_go_for_public_mainnet0$' "$STATUS"
echo "[ok] existing launch docs still block approval"

echo
echo "=== [6] node ready ==="
curl -fsS http://127.0.0.1:4100/__void/ready.json > /tmp/void-launch-approval-template-ready.json
python3 - /tmp/void-launch-approval-template-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [7] no actual secret material ==="
if grep -En 'BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9_]{20,}|secret[_ -]?(key|value)?[[:space:]]*[:=]|private[_ -]?key[[:space:]]*[:=]|mnemonic[[:space:]]*[:=]|seed[_ -]?phrase[[:space:]]*[:=]' "$DOC"; then
  echo "[ERR] template contains actual secret-like material" >&2
  exit 1
fi
echo "[ok] no actual secret material in template"

echo
echo "=== [8] summary ==="
python3 - <<'PY'
print({
  "launch_approval_artifact_template": "green",
  "approval_artifact_created": False,
  "launch_state": "not_go_for_public_mainnet0",
  "launch_approval": False,
  "mutation_allowed": False,
  "validator_mutation": False,
  "buy_void_fulfillment": False,
  "money_step": "last",
})
PY

echo
echo "[ok] Mainnet-0 launch approval artifact template proof passed"
