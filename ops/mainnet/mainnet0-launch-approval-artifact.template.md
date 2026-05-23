# VOID Mainnet-0 Launch Approval Artifact Template

status: template_only_not_approval
launch_state: not_go_for_public_mainnet0
launch_approval: false
mutation_allowed: false
approval_artifact_created: false
operator_label: zoso
money_step: last

## Template warning

This is a template only.

This file is not launch approval.
This file must not be used as the final approval artifact.
This file does not change launch_state.
This file does not set launch_approval true.
This file does not set mutation_allowed true.
This file does not promote public validators.
This file does not execute vault126 onboarding.
This file does not execute Buy VOID claim/send.
This file does not send VOID.

## Required final approval artifact fields

A future real approval artifact must be a separate file, not this template, and must include:

- approval_intent: OPERATOR_APPROVES_PUBLIC_MAINNET0_LAUNCH
- approved_commit: REQUIRED
- approved_tag: REQUIRED
- approved_at_utc: REQUIRED
- operator_label: zoso
- launch_state_requested: REQUIRED
- launch_approval_requested: REQUIRED
- mutation_allowed_requested: REQUIRED
- precision_ready_result: REQUIRED
- alienware_ready_result: REQUIRED
- precision_status_proof_log: REQUIRED
- alienware_status_smoke_log: REQUIRED
- update_safety_proof_log: REQUIRED
- validator_lifecycle_freshness_result: REQUIRED
- final_gonogo_proof_log: REQUIRED
- final_public_launch_checklist_proof_log: REQUIRED
- public_validator_admission_decision: REQUIRED
- buy_void_fulfillment_policy_state: REQUIRED
- public_release_hygiene_result: REQUIRED
- key_ceremony_result: REQUIRED
- operator_signature_or_marker: REQUIRED

## Required safety statements

A future real approval artifact must explicitly state:

- Ready signals alone are not launch approval.
- Public candidate/waiting registration is not active validator admission.
- Public active validator admission remains disabled unless separately and intentionally launched.
- Any operator validator live-admission step is separate, guarded, epoch-controlled, and requires exact operator intent.
- Buy VOID payment confirmation is not VOID sent.
- Every Buy VOID fulfillment requires explicit payment verification and explicit VOID transaction reference.
- No credential material, private keys, wallet secrets, seed phrases, or signing keys are included.
- Money-moving steps remain separately guarded.

## Required pre-approval proof stack

Before a real approval artifact can be accepted:

- mainnet0-status-proof must pass on Precision.
- mainnet0-update-safety-proof must pass on Precision.
- mainnet0-update-safety-prom-proof must pass on Precision.
- mainnet0-gonogo-no-go-proof must pass while launch remains blocked.
- mainnet0-final-gonogo-map-proof must pass.
- mainnet0-final-public-launch-checklist-proof must pass.
- mainnet0-public-release-hygiene-proof must pass.
- buy-void-hardstop-proof must pass on Precision and Alienware.
- mainnet0-status-smoke must pass on Alienware.
- Precision and Alienware must both report ready=true, gap=0, txroot_live=1.

## Current conclusion

This template is green only if it proves the final approval artifact format is documented while current launch approval remains false.
