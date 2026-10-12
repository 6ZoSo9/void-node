#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-apollyon-advisory-chain-index-v1.md"
proof="ops/mainnet0/apollyon-advisory-chain-index-v1-proof.sh"

test -f "$doc"
test -f "$proof"

req() {
  grep -Fxq "$1" "$doc"
}

req "marker=VOID_APOLLYON_ADVISORY_CHAIN_INDEX_V1"
req "ai_identity_name=Apollyon"
req "index_purpose=public_safe_index_for_apollyon_advisory_review_chain"
req "index_status=docs_only_no_live_manifest_no_endpoint_no_enforcement"

req "suspicion_review_boundary_marker=VOID_APOLLYON_SUSPICION_REVIEW_BOUNDARY_V1"
req "public_advisory_manifest_schema_marker=VOID_APOLLYON_PUBLIC_ADVISORY_MANIFEST_SCHEMA_V1"
req "public_advisory_manifest_example_marker=VOID_APOLLYON_PUBLIC_ADVISORY_MANIFEST_EXAMPLE_V1"

req "chain_order_1=Suspicion_Review_Boundary"
req "chain_order_2=Public_Advisory_Manifest_Schema"
req "chain_order_3=Public_Advisory_Manifest_Example"

req "advisory_chain_status=design_only"
req "manifest_enabled_now=false"
req "live_endpoint_created=false"
req "live_review_enabled=false"
req "live_auth_enabled=false"
req "public_mutation=false"
req "automated_enforcement=false"

req "advisory_authority=advisory_only"
req "operator_required_for_any_enforcement=true"
req "operator_final_authority=true"
req "public_output_model=redacted_public_safe_advisory_future_design"
req "raw_evidence_location=private_operator_side_future_design"
req "raw_payload_publicly_exposed=false"
req "hostile_payload_publicly_exposed=false"
req "private_prompt_exposed=false"
req "private_persona_exposed=false"
req "private_key_exposed=false"
req "operator_private_channel_exposed=false"
req "validator_private_channel_exposed=false"

req "enforcement_authority=false"
req "tombstone_write=false"
req "delete_authority=false"
req "quarantine_write=false"
req "ledger_write=false"
req "money_movement=false"
req "validator_mutation=false"
req "service_restart=false"
req "apollyon_may_flag_lie_future_design=true"
req "apollyon_may_recommend_operator_review_future_design=true"
req "apollyon_may_destroy_state=false"
req "apollyon_may_delete_data=false"
req "apollyon_may_tombstone_data=false"
req "apollyon_may_write_ledger=false"
req "apollyon_may_move_void=false"
req "apollyon_may_modify_validator_state=false"
req "apollyon_may_perform_live_mutation=false"

req "validator_truth_doctrine=honest_validators_speak_truth"
req "host_guard_required_for_cross_box=true"
req "precision_source_of_truth_host=zoso-Precision-Tower-7810"
req "alienware_cross_box_host=zoso-Alienware-Aurora-R7"

echo "VOID_APOLLYON_ADVISORY_CHAIN_INDEX_V1_GREEN"
