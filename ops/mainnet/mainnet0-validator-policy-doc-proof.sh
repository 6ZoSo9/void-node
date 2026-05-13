#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

P="ops/mainnet/mainnet0-validator-policy.current.md"

echo "=== Mainnet-0 validator policy doc proof ==="

test -f "$P"

grep -q '^status: locked_policy_plan_only$' "$P"
grep -q '^launch_state: not_go_for_public_mainnet0$' "$P"
grep -q '^mutation_allowed: false$' "$P"

grep -q 'active_validator_cap: 256' "$P"
grep -q 'current_operator_bootstrap_validators: 125' "$P"
grep -q 'next_operator_candidate: vault125' "$P"
grep -q 'next_operator_target_epoch: 127' "$P"
grep -q 'next_expected_validator_count: 126' "$P"

grep -q 'early_public_active_slots_target: 32-64' "$P"
grep -q 'public_registration_directly_mutates_active_set: false' "$P"
grep -q 'public_registration_result: candidate_or_waiting_only' "$P"
grep -q 'activation_churn_limit_per_epoch: 4' "$P"
grep -q 'desired_public_candidate_minimum_stake: 10000 VOID' "$P"
grep -q 'offline_demotion_grace: 48 hours' "$P"
grep -q 'validator_rotation_policy: quarterly' "$P"
grep -q 'money_step_remains_last: true' "$P"

grep -q 'Public candidate proof alignment' "$P"
grep -q 'proof lanes now enforce the locked 10000 VOID minimum stake policy' "$P"
grep -q 'does not approve public Mainnet-0 launch' "$P"

echo "[ok] validator policy doc is locked and non-mutating"
