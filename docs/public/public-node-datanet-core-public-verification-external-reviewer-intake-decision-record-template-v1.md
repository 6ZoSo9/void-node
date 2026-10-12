# DataNet Core Public Verification External Reviewer Intake Decision Record Template v1

Marker: `VOID_DATANET_CORE_PUBLIC_VERIFICATION_EXTERNAL_REVIEWER_INTAKE_DECISION_RECORD_TEMPLATE_DOC_V1`

This template defines a future static operator record format for reviewing an external reviewer result envelope. It does not make an intake decision now.

Current base:

- Head: `2fdb5ddd`
- Cross-box tag: `ckpt-datanet-core-public-verification-external-reviewer-intake-decision-stub-v1-cross-box-green-20260618-193837`
- Intake decision stub proof marker: `VOID_DATANET_CORE_PUBLIC_VERIFICATION_EXTERNAL_REVIEWER_INTAKE_DECISION_STUB_PROOF_V1_GREEN`

Template purpose:

- Give the operator a bounded future place to record a review-envelope decision.
- Keep reviewer envelope acceptance separate from reviewer envelope existence.
- Keep reviewer envelope acceptance separate from ledger writes.
- Keep reviewer envelope acceptance separate from Work Credit issuance.
- Keep reviewer envelope acceptance separate from public mutation.
- Keep reviewer envelope acceptance separate from peer-pin exact command reveal.

Decision record fields:

- `decision_record_version=1`
- `decision_record_created_utc=<YYYY-MM-DDTHH:MM:SSZ>`
- `operator_reviewed_envelope=<true|false>`
- `operator_checked_reviewed_head=<true|false>`
- `operator_checked_template_version=<true|false>`
- `operator_checked_safety_boundary=<true|false>`
- `operator_checked_no_command_reveal=<true|false>`
- `operator_checked_no_public_mutation=<true|false>`
- `operator_checked_no_ledger_write=<true|false>`
- `operator_checked_no_wc_award=<true|false>`
- `operator_accepts_result_for_static_record=<true|false>`
- `operator_rejects_result_for_static_record=<true|false>`
- `operator_requires_followup=<true|false>`
- `operator_decision_notes=<freeform_static_text>`

Decision constraints:

- Accept and reject must not both be true.
- Acceptance for static record does not imply ledger write.
- Acceptance for static record does not imply Work Credit award.
- Acceptance for static record does not imply public mutation.
- Acceptance for static record does not imply validator admission.
- Acceptance for static record does not reveal peer-pin exact commands.
- Follow-up may be required without accepting or rejecting the reviewer result.

Not performed now:

- No decision record is created now.
- No reviewer result is accepted now.
- No reviewer result is rejected now.
- No reviewer result is ingested now.
- No reviewer result is made authoritative now.
- No ledger write is performed now.
- No Work Credit award is performed now.
- No duplicate guard is run now.
- No route call is performed now.
- No object fetch is performed now.
- No peer-pin exact command reveal is performed now.

Required status lines:

- `datanet_core_public_verification_external_reviewer_intake_decision_record_template_created_now=true`
- `datanet_core_public_verification_external_reviewer_intake_decision_record_template_terminal_safe=true`
- `datanet_core_public_verification_external_reviewer_intake_decision_record_template_static_only=true`
- `datanet_core_public_verification_external_reviewer_intake_decision_record_template_base_head=2fdb5ddd`
- `datanet_core_public_verification_external_reviewer_intake_decision_record_template_intake_decision_stub_cross_box_green=true`
- `datanet_core_public_verification_external_reviewer_intake_decision_record_template_fields_documented=true`
- `datanet_core_public_verification_external_reviewer_intake_decision_record_template_constraints_documented=true`
- `datanet_core_public_verification_external_reviewer_intake_decision_record_template_no_decision_now=true`
- `datanet_core_public_verification_external_reviewer_intake_decision_record_template_auto_acceptance=false`
- `datanet_core_public_verification_external_reviewer_intake_decision_record_template_auto_ingest=false`
- `datanet_core_public_verification_external_reviewer_intake_decision_record_template_adds_authority=false`
- `datanet_core_public_verification_external_reviewer_intake_decision_record_template_peer_pin_exact_command_reveal_held=true`
- `datanet_core_public_verification_external_reviewer_intake_decision_record_template_runs_proof_chain=false`
- `datanet_core_public_verification_external_reviewer_intake_decision_record_template_runs_command_reveal=false`
- `datanet_core_public_verification_external_reviewer_intake_decision_record_template_runs_route_calls=false`
- `datanet_core_public_verification_external_reviewer_intake_decision_record_template_runs_object_fetch=false`
- `datanet_core_public_verification_external_reviewer_intake_decision_record_template_runs_duplicate_guard=false`
- `datanet_core_public_verification_external_reviewer_intake_decision_record_template_runs_full_live_rollup=false`
- `public_mutation=false`
- `ledger_write=false`
- `wc_credit_award=false`
