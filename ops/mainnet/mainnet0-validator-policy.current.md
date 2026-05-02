# VOID Mainnet-0 Validator Policy

status: locked_policy_plan_only
launch_state: not_go_for_public_mainnet0
mutation_allowed: false
updated_at: 2026-05-02

## Locked Mainnet-0 policy

- active_validator_cap: 256
- current_operator_bootstrap_validators: 124
- next_operator_candidate: vault124
- next_operator_target_epoch: 126
- next_expected_validator_count: 125
- early_public_active_slots_target: 32-64
- public_registration_directly_mutates_active_set: false
- public_registration_result: candidate_or_waiting_only
- active_admission_requires_guarded_operator_epoch_step: true
- activation_churn_limit_per_epoch: 4
- desired_public_candidate_minimum_stake: 10000 VOID
- offline_demotion_grace: 48 hours
- validator_rotation_policy: quarterly
- money_step_remains_last: true

## Current implementation gap

Some existing local candidate-registry proof lanes still use 1000 VOID as the default minimum stake.

That is now treated as an implementation gap, not the locked Mainnet-0 public policy.

Before public Mainnet-0 activation, the public candidate/admission path must enforce the locked 10000 VOID minimum stake policy.

## Launch rule

This file does not approve public Mainnet-0 launch.

Mainnet-0 remains not-go until validator admission, Buy VOID real claim/send, UI, keys, public status, and final go/no-go are all proved green.
