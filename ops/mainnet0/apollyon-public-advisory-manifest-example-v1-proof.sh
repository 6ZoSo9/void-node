#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-apollyon-public-advisory-manifest-example-v1.md"
proof="ops/mainnet0/apollyon-public-advisory-manifest-example-v1-proof.sh"

test -f "$doc"
test -f "$proof"

req() {
  grep -Fxq "$1" "$doc"
}

req "marker=VOID_APOLLYON_PUBLIC_ADVISORY_MANIFEST_EXAMPLE_V1"
req "ai_identity_name=Apollyon"
req "example_purpose=static_redacted_example_for_future_public_advisory_manifest"
req "example_status=static_example_only_no_live_manifest_no_endpoint"
req "requires_public_advisory_manifest_schema=true"
req "public_advisory_manifest_schema_marker=VOID_APOLLYON_PUBLIC_ADVISORY_MANIFEST_SCHEMA_V1"
req "requires_suspicion_review_boundary=true"
req "suspicion_review_boundary_marker=VOID_APOLLYON_SUSPICION_REVIEW_BOUNDARY_V1"

req "example_manifest_json_begin"
req '  "marker": "VOID_APOLLYON_PUBLIC_ADVISORY_MANIFEST_V1",'
req '  "review_id": "example-review-0001",'
req '  "subject_id": "example-redacted-subject",'
req '  "subject_kind": "datanet_signal_future_design",'
req '  "signal_class": "suspicious",'
req '  "risk_level": "medium",'
req '  "signal_summary": "Redacted advisory example only. No raw payload included.",'
req '  "recommendation": "operator_review",'
req '  "operator_required": true,'
req '  "enforcement_performed": false,'
req '  "raw_payload_included": false,'
req '  "private_material_included": false,'
req '  "generated_at": "design-only-static-example"'
req "example_manifest_json_end"

req "manifest_enabled_now=false"
req "live_endpoint_created=false"
req "live_review_enabled=false"
req "live_auth_enabled=false"
req "public_mutation=false"
req "automated_enforcement=false"

req "example_is_redacted=true"
req "example_is_advisory_only=true"
req "example_is_not_tombstone=true"
req "example_is_not_delete_command=true"
req "example_is_not_quarantine_command=true"
req "example_is_not_ledger_entry=true"
req "example_is_not_validator_state=true"
req "example_enforcement_performed=false"
req "example_raw_payload_included=false"
req "example_private_material_included=false"
req "example_operator_required=true"

req "raw_payload_publicly_exposed=false"
req "hostile_payload_publicly_exposed=false"
req "private_prompt_exposed=false"
req "private_persona_exposed=false"
req "private_key_exposed=false"
req "operator_private_channel_exposed=false"
req "validator_private_channel_exposed=false"
req "wallet_seed_exposed=false"
req "validator_key_exposed=false"

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

req "operator_final_authority=true"
req "validator_truth_doctrine=honest_validators_speak_truth"
req "host_guard_required_for_cross_box=true"
req "precision_source_of_truth_host=zoso-Precision-Tower-7810"
req "alienware_cross_box_host=zoso-Alienware-Aurora-R7"

echo "VOID_APOLLYON_PUBLIC_ADVISORY_MANIFEST_EXAMPLE_V1_GREEN"
