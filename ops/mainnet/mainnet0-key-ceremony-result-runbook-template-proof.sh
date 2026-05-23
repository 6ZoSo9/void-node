#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="ops/mainnet/mainnet0-key-ceremony-result-runbook.template.md"
RESULT_TEMPLATE="ops/mainnet/mainnet0-key-ceremony-result.template.md"
PLAN="ops/mainnet/mainnet0-key-ceremony-plan.current.md"

echo "=== Mainnet-0 key ceremony result runbook template proof ==="

echo
echo "=== [1] required files ==="
test -f "$DOC"
test -f "$RESULT_TEMPLATE"
test -f "$PLAN"
echo "[ok] required files exist"

echo
echo "=== [2] runbook is template-only / non-executing ==="
grep -q '^status: template_only$' "$DOC"
grep -q '^result_status: not_executed$' "$DOC"
grep -q '^launch_state: not_go_for_public_mainnet0$' "$DOC"
grep -q '^launch_approval: false$' "$DOC"
grep -q '^mutation_allowed: false$' "$DOC"
grep -q '^records_public_addresses_only: true$' "$DOC"
grep -q '^contains_secret_material: false$' "$DOC"
grep -q 'This does not generate keys.' "$DOC"
grep -q 'This does not record real addresses.' "$DOC"
grep -q 'This does not authorize funding.' "$DOC"
grep -q 'This does not approve Mainnet-0 launch.' "$DOC"
echo "[ok] runbook is non-executing and non-mutating"

echo
echo "=== [3] future execution rules are documented ==="
grep -q 'create a separate timestamped result artifact' "$DOC"
grep -q 'Only public addresses may be recorded.' "$DOC"
grep -q 'must never be committed, pasted, logged, or included in artifacts' "$DOC"
grep -q 'Generate fresh never-used Mainnet-0 keys outside the repository.' "$DOC"
grep -q 'Verify encrypted backups can be opened.' "$DOC"
grep -q 'Keep launch approval separate from this key ceremony result.' "$DOC"
echo "[ok] future execution rules documented"

echo
echo "=== [4] existing key ceremony docs remain non-executed ==="
grep -q '^status: template_only$' "$RESULT_TEMPLATE"
grep -q '^result_status: not_executed$' "$RESULT_TEMPLATE"
grep -q '^records_public_addresses_only: true$' "$RESULT_TEMPLATE"
grep -q '^contains_secret_material: false$' "$RESULT_TEMPLATE"
grep -q '^status: planned_not_executed$' "$PLAN"
grep -q '^launch_approval: false$' "$PLAN"
grep -q '^mutation_allowed: false$' "$PLAN"
echo "[ok] existing key ceremony docs remain non-executed"

echo
echo "=== [5] no actual secret material ==="
if grep -En 'BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9_]{20,}|secret[_ -]?(key|value)?[[:space:]]*[:=]|private[_ -]?key[[:space:]]*[:=]|mnemonic[[:space:]]*[:=]|seed[_ -]?phrase[[:space:]]*[:=]|passphrase[[:space:]]*[:=]' "$DOC"; then
  echo "[ERR] runbook template contains actual secret-like material" >&2
  exit 1
fi
echo "[ok] no actual secret material in runbook"

echo
echo "=== [6] node ready ==="
curl -fsS http://127.0.0.1:4100/__void/ready.json > /tmp/void-key-ceremony-runbook-template-ready.json
python3 - /tmp/void-key-ceremony-runbook-template-ready.json <<'PY'
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
  "key_ceremony_result_runbook_template": "green",
  "result_status": "not_executed",
  "records_public_addresses_only": True,
  "contains_secret_material": False,
  "launch_approval": False,
  "mutation_allowed": False,
  "key_generation": False,
  "funding": False,
  "authority_transfer": False,
  "money_step": "last",
})
PY

echo
echo "[ok] Mainnet-0 key ceremony result runbook template proof passed"
