#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

RESULT_FILE="${RESULT_FILE:-$(ls -t ops/mainnet/mainnet0-key-ceremony-result-*.md | head -1)}"
PLAN="ops/mainnet/mainnet0-key-ceremony-plan.current.md"
TEMPLATE="ops/mainnet/mainnet0-key-ceremony-result.template.md"
RUNBOOK="ops/mainnet/mainnet0-key-ceremony-result-runbook.template.md"
GONOGO="ops/mainnet/mainnet0-final-gonogo-map.current.md"

echo "=== Mainnet-0 key ceremony result proof ==="
echo "result=$RESULT_FILE"

echo
echo "=== [1] required files ==="
test -f "$RESULT_FILE"
test -f "$PLAN"
test -f "$TEMPLATE"
test -f "$RUNBOOK"
test -f "$GONOGO"
echo "[ok] required files exist"

echo
echo "=== [2] result is public-address-only and non-launching ==="
grep -q '^status: public_addresses_recorded$' "$RESULT_FILE"
grep -q '^result_status: completed_public_addresses_only$' "$RESULT_FILE"
grep -q '^launch_state: not_go_for_public_mainnet0$' "$RESULT_FILE"
grep -q '^launch_approval: false$' "$RESULT_FILE"
grep -q '^mutation_allowed: false$' "$RESULT_FILE"
grep -q '^records_public_addresses_only: true$' "$RESULT_FILE"
grep -q '^contains_secret_material: false$' "$RESULT_FILE"
grep -q '^money_step: last$' "$RESULT_FILE"
grep -q 'It does not authorize funding.' "$RESULT_FILE"
grep -q 'It does not authorize AdminGate or UpdateGate authority transfer.' "$RESULT_FILE"
grep -q 'It does not approve Mainnet-0 launch.' "$RESULT_FILE"
echo "[ok] result is public-only and non-mutating"

echo
echo "=== [3] required public address roles exist ==="
for role in \
  premine_treasury_primary_public_address \
  premine_treasury_network_pool_public_address \
  premine_treasury_bootstrap_liquidity_public_address \
  premine_treasury_grants_public_address \
  premine_treasury_reserve_public_address \
  admingate_master_key_public_address \
  updategate_signer_1_public_address \
  updategate_signer_2_public_address \
  updategate_signer_3_public_address \
  launch_operator_signer_public_address \
  cold_backup_signer_1_public_address \
  cold_backup_signer_2_public_address \
  cold_backup_signer_3_public_address
do
  grep -Eq "^${role}: 0x[0-9A-Fa-f]{40}$" "$RESULT_FILE"
done
echo "[ok] required public address roles exist"

echo
echo "=== [4] no actual secret material ==="
if grep -En 'BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9_]{20,}|secret[_ -]?(key|value)?[[:space:]]*[:=]|private[_ -]?key[[:space:]]*[:=]|mnemonic[[:space:]]*[:=]|seed[_ -]?phrase[[:space:]]*[:=]|passphrase[[:space:]]*[:=]' "$RESULT_FILE"; then
  echo "[ERR] result artifact contains actual secret-like material" >&2
  exit 1
fi
echo "[ok] no actual secret material in result artifact"

echo
echo "=== [5] launch docs still block approval ==="
grep -q '^launch_approval: false$' "$GONOGO"
grep -q '^mutation_allowed: false$' "$GONOGO"
grep -q '^decision: NO_GO$' "$GONOGO"
grep -q '^launch_approval: false$' "$PLAN"
grep -q '^mutation_allowed: false$' "$PLAN"
echo "[ok] launch docs remain blocked"

echo
echo "=== [6] node ready ==="
curl -fsS http://127.0.0.1:4100/__void/ready.json > /tmp/void-key-ceremony-result-ready.json
python3 - /tmp/void-key-ceremony-result-ready.json <<'PY'
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
  "key_ceremony_result": "completed_public_addresses_only",
  "records_public_addresses_only": True,
  "contains_secret_material": False,
  "funding": False,
  "authority_transfer": False,
  "launch_approval": False,
  "mutation_allowed": False,
  "money_step": "last",
})
PY

echo
echo "[ok] Mainnet-0 key ceremony result proof passed"
