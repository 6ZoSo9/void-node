# VOID Mainnet-0 Public Validator Admission Design

status: design_note_not_live
launch_state: not_go_for_public_mainnet0
mutation_allowed: false
public_registration_mutates_active_set: false
public_registration_result: candidate_or_waiting_only
active_admission_requires_guarded_epoch_step: true
money_step: last

## Locked rules

- Public validator registration is not active validator admission.
- Public registration may create candidate/waiting state only.
- Active admission requires a separate guarded epoch step.
- Mainnet-0 active validator cap remains 256.
- Activation churn limit remains 4 per epoch.
- Public candidate minimum stake target remains 10,000 VOID.
- Operator/bootstrap validators remain separate from public candidates.
- Ready signals are not launch approval.
- vault126 / epoch128 / expectedValidatorCount=127 is dry-run next-onboard information only.

## Non-goals

This checkpoint does not execute vault126 onboarding, mutate active validator state, activate a public validator, approve public validator promotion, approve public Mainnet-0 launch, execute Buy VOID claim/send, or change launch_state.
