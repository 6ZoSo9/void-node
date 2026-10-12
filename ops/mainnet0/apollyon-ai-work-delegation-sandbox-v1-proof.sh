#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-apollyon-ai-work-delegation-sandbox-v1.md"
task_tpl="ai_work/templates/task-packet-v1.md"
proposal_tpl="ai_work/templates/proposal-v1.md"
review_tpl="ai_work/templates/operator-review-checklist-v1.md"
task_keep="ai_work/task_packets/.gitkeep"
proposal_keep="ai_work/proposals/.gitkeep"
review_keep="ai_work/reviews/.gitkeep"

for f in "$doc" "$task_tpl" "$proposal_tpl" "$review_tpl" "$task_keep" "$proposal_keep" "$review_keep"; do
  test -f "$f"
done

req() {
  grep -Fxq "$1" "$2"
}

req "marker=VOID_APOLLYON_AI_WORK_DELEGATION_SANDBOX_V1" "$doc"
req "sandbox_status=docs_only_no_autonomous_apply_no_live_mutation" "$doc"
req "requires_advisory_subsystem_final_seal=true" "$doc"
req "advisory_subsystem_final_seal_marker=VOID_APOLLYON_ADVISORY_SUBSYSTEM_FINAL_SEAL_V1" "$doc"

req "local_open_source_ai_allowed=true" "$doc"
req "ai_may_draft_docs=true" "$doc"
req "ai_may_draft_patch_proposals=true" "$doc"
req "ai_may_draft_proof_scaffolds=true" "$doc"
req "ai_may_generate_unified_diff=true" "$doc"

req "ai_output_is_proposal=true" "$doc"
req "proposal_is_not_apply=true" "$doc"
req "proposal_is_not_commit=true" "$doc"
req "proposal_is_not_push=true" "$doc"
req "proposal_is_not_tag=true" "$doc"
req "proposal_is_not_service_restart=true" "$doc"

req "proposal_is_not_ledger_write=true" "$doc"
req "proposal_is_not_void_movement=true" "$doc"
req "proposal_is_not_validator_mutation=true" "$doc"
req "proposal_is_not_live_mutation=true" "$doc"
req "proposal_is_not_secret_access=true" "$doc"

req "ai_direct_repo_write_allowed=false" "$doc"
req "ai_direct_commit_allowed=false" "$doc"
req "ai_direct_push_allowed=false" "$doc"
req "ai_direct_tag_allowed=false" "$doc"
req "ai_direct_service_restart_allowed=false" "$doc"
req "ai_direct_ledger_write_allowed=false" "$doc"
req "ai_direct_void_movement_allowed=false" "$doc"
req "ai_direct_validator_mutation_allowed=false" "$doc"
req "ai_direct_secret_read_allowed=false" "$doc"
req "ai_direct_live_mutation_allowed=false" "$doc"

req "operator_review_required=true" "$doc"
req "operator_final_authority=true" "$doc"
req "accepted_for_manual_apply_is_not_apply=true" "$doc"

req "task_packet_required=true" "$doc"
req "task_packet_no_secret_material=true" "$doc"
req "task_packet_no_private_keys=true" "$doc"
req "task_packet_no_wallet_seeds=true" "$doc"
req "task_packet_no_validator_keys=true" "$doc"

req "proposal_output_required=true" "$doc"
req "proposal_output_location=ai_work/proposals" "$doc"
req "proposal_status_allowed_1=draft" "$doc"
req "proposal_status_allowed_5=accepted_for_manual_apply" "$doc"
req "manual_apply_required_after_acceptance=true" "$doc"

req "manual_apply_workflow_step_1=operator_creates_task_packet" "$doc"
req "manual_apply_workflow_step_9=operator_cross_box_verifies" "$doc"
req "ai_generated_command_is_not_executed=true" "$doc"
req "operator_must_review_every_file=true" "$doc"

req "sandbox_root=ai_work" "$doc"
req "task_packet_template_path=ai_work/templates/task-packet-v1.md" "$doc"
req "proposal_template_path=ai_work/templates/proposal-v1.md" "$doc"
req "review_checklist_template_path=ai_work/templates/operator-review-checklist-v1.md" "$doc"
req "templates_are_non_executable=true" "$doc"

req "marker=VOID_APOLLYON_TASK_PACKET_TEMPLATE_V1" "$task_tpl"
req "marker=VOID_APOLLYON_PROPOSAL_TEMPLATE_V1" "$proposal_tpl"
req "marker=VOID_APOLLYON_OPERATOR_REVIEW_CHECKLIST_TEMPLATE_V1" "$review_tpl"

req "VOID_APOLLYON_AI_WORK_TASK_PACKETS_DIR_V1" "$task_keep"
req "VOID_APOLLYON_AI_WORK_PROPOSALS_DIR_V1" "$proposal_keep"
req "VOID_APOLLYON_AI_WORK_REVIEWS_DIR_V1" "$review_keep"

echo "VOID_APOLLYON_AI_WORK_DELEGATION_SANDBOX_V1_GREEN"
