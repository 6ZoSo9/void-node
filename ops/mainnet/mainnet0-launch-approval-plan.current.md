# VOID Mainnet-0 Launch Approval Plan

status: plan_only_not_approved
launch_state: not_go_for_public_mainnet0
launch_approval: false
mutation_allowed: false
operator_label: zoso
money_step: last

## Purpose

This artifact defines the future launch approval gate.

It is not launch approval.
It does not change launch_state.
It does not promote public validators.
It does not execute vault126 onboarding.
It does not execute Buy VOID claim/send.
It does not mutate live validator state.

## Current proven baseline

- current_final_public_launch_checklist_baseline: ckpt-final-checklist-validator-candidate-posture-green-20260523-020915
- current_commit: 152cf74c
- final public launch checklist proof is green.
- final go/no-go map current-baseline reference is cross-box proven.
- current baseline summary-output checkpoint is cross-box proven.
- final path includes wallet-ui-cleanup-proof.
- current baseline + final go/no-go map refresh is cross-box proven at 152cf74c / ckpt-final-checklist-validator-candidate-posture-green-20260523-020915.
- current baseline pointer records 152cf74c / ckpt-final-checklist-validator-candidate-posture-green-20260523-020915.
- product surface, Settings UI, public validator candidate-only posture, and final checklist validator posture proof stack are green.
- DataNet tab proof is green.
- participant DataNet E2E proof is green.
- participant golden path proof is green.
- remote product/network regression proof is green.
- WC trade remains non-mutating in product surface and is covered by separate WC stack proofs.
- final checklist sections preserve update-safety Prometheus-or-fallback, launch approval plan proof, and fail-closed go/no-go Prometheus-or-fallback sections.
- final path proof is green.
- cross-box status smoke is green.
- Precision and Alienware are ready with gap=0 and txroot_live=1.
- validator runtime truth is green through epoch127.
- next operator candidate is vault126 for epoch128 / expectedValidatorCount=127.
- Buy VOID first real fulfillment is closeout-proven.
- public validator promotion/admission remains blocked.
- launch approval remains false.

## Required before launch approval can become true

Before changing launch_approval to true or changing launch_state away from not_go_for_public_mainnet0, all of the following must be true:

1. mainnet0-status-proof passes on Precision.
2. mainnet0-blockers-proof passes on Precision.
3. mainnet0-prelaunch-safety-proof passes on Precision.
4. mainnet0-final-path-proof passes on Precision.
5. mainnet0-final-public-launch-checklist-proof passes on Precision.
6. mainnet0-crossbox-status-smoke passes from Precision.
7. update-safety metric is green and fresh on Precision.
8. public release sanitization is rerun after the last code change and is clean.
9. public validator promotion/admission decision is explicit.
10. public validator registration is still not misrepresented as active admission.
11. any active validator admission change is capped, epoch-controlled, guarded, and cross-box proven.
12. Buy VOID remains guarded: payment confirmation is not VOID sent, and every fulfillment requires an explicit VOID transaction reference.
13. no private keys or sensitive signing material are present in tracked launch artifacts.
14. the operator writes a separate explicit launch approval artifact.

## Approval artifact requirements

The future launch approval artifact must include:

- approval: true
- operator_label: zoso
- approved_commit
- approved_tag
- approved_at timestamp
- final checklist proof log path
- cross-box smoke proof log path
- update-safety freshness proof
- public validator promotion/admission decision
- Buy VOID fulfillment policy state
- statement that ready signals alone are not launch approval

## Current decision

Do not approve public Mainnet-0 launch yet.

Mainnet-0 remains not_go_for_public_mainnet0.
