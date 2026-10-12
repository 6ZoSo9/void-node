# VOID Mainnet-0 Public Validator Admission Decision

status: candidate_only_for_mainnet0
launch_state: not_go_for_public_mainnet0
mutation_allowed: false
public_active_admission_enabled: false
public_registration_result: candidate_or_waiting_only
public_registration_mutates_active_set: false
active_admission_requires_guarded_operator_epoch_step: true
money_step: last
operator_label: zoso

## Decision

For Mainnet-0, public validator registration remains candidate/waiting only.

Public users may see registration, candidate, waiting, readiness, and policy state.

Public users must not be told that registration makes them an active validator.

Public registration must not directly mutate the active validator set.

Public active validator promotion/admission is not launched in Mainnet-0.

## Why

This keeps Mainnet-0 safe while users connect.

The operator/bootstrap validator set is already green through epoch127.

The next guarded operator candidate is vault126 for epoch128 / expectedValidatorCount=127.

Public registration is useful as a product path, but active admission should stay behind guarded epoch-controlled proof lanes until post-Mainnet-0 hardening.

## Locked Mainnet-0 policy

- public candidate minimum stake target: 10000 VOID
- active validator cap: 256
- activation churn limit per epoch: 4
- public registration result: candidate_or_waiting_only
- public registration directly mutates active set: false
- active admission requires guarded operator epoch step: true
- money step remains last: true

## Required proof posture

Before launch approval:

1. public registration remains candidate/waiting only,
2. public registration does not mutate the active validator set,
3. participant UI does not describe public registration as active admission,
4. validator admission blocker proof passes,
5. validator admission promotion plan proof passes,
6. status proof passes,
7. blockers proof passes,
8. final checklist proof passes,
9. cross-box smoke passes,
10. launch approval remains separate and explicit.

## Non-goals

This decision does not execute vault126 onboarding.

This decision does not activate any public validator.

This decision does not change launch_state.

This decision does not approve public Mainnet-0 launch.

This decision does not execute Buy VOID claim/send.

This decision does not move money_step away from last.

## Post-Mainnet-0 path

After Mainnet-0, public active admission can be revisited through a separate proposal and proof lane.

That future lane must prove capped active admission, epoch-controlled churn, cross-box runtime truth, update safety, and no direct active-set mutation from simple public registration.
