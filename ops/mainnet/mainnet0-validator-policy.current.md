# VOID Mainnet-0 Validator Policy

status: locked_policy_plan_only
launch_state: not_go_for_public_mainnet0
mutation_allowed: false
updated_at: 2026-05-13

## Locked Mainnet-0 policy

- active_validator_cap: 256
- current_operator_bootstrap_validators: 125
- next_operator_candidate: vault125
- next_operator_target_epoch: 127
- next_expected_validator_count: 126
- early_public_active_slots_target: 32-64
- public_registration_directly_mutates_active_set: false
- public_registration_result: candidate_or_waiting_only
- active_admission_requires_guarded_operator_epoch_step: true
- activation_churn_limit_per_epoch: 4
- desired_public_candidate_minimum_stake: 10000 VOID
- offline_demotion_grace: 48 hours
- validator_rotation_policy: quarterly
- money_step_remains_last: true

## Public candidate proof alignment

The local public candidate/registration proof lanes now enforce the locked 10000 VOID minimum stake policy.

Public registration still creates candidate/waiting state only and does not directly mutate the active validator set.

Before public Mainnet-0 activation, any live public candidate/admission path must continue to enforce the locked 10000 VOID minimum stake policy.

## Launch rule

This file does not approve public Mainnet-0 launch.

Mainnet-0 remains not-go until validator admission/promotion, UI polish, keys/public status, and final go/no-go are all proved green. First Buy VOID real fulfillment closeout is complete, but future payment lanes must remain guarded.
