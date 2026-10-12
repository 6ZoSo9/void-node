#!/usr/bin/env bash
set -euo pipefail

seal="docs/public/public-node-apollyon-advisory-subsystem-final-seal-v1.md"
suspicion="docs/public/public-node-apollyon-suspicion-review-boundary-v1.md"
schema="docs/public/public-node-apollyon-public-advisory-manifest-schema-v1.md"
example="docs/public/public-node-apollyon-public-advisory-manifest-example-v1.md"
index="docs/public/public-node-apollyon-advisory-chain-index-v1.md"
hold="docs/public/public-node-apollyon-advisory-enforcement-hold-boundary-v1.md"
queue="docs/public/public-node-apollyon-operator-review-queue-boundary-v1.md"
rollup="docs/public/public-node-apollyon-advisory-safety-rollup-v1.md"

for f in "$seal" "$suspicion" "$schema" "$example" "$index" "$hold" "$queue" "$rollup"; do
  test -f "$f"
done

req() {
  grep -Fxq "$1" "$2"
}

req "marker=VOID_APOLLYON_ADVISORY_SUBSYSTEM_FINAL_SEAL_V1" "$seal"
req "seal_status=docs_only_final_phase_seal_no_live_endpoint_no_queue_no_apply_no_enforcement" "$seal"
req "requires_advisory_safety_rollup=true" "$seal"
req "advisory_safety_rollup_marker=VOID_APOLLYON_ADVISORY_SAFETY_ROLLUP_V1" "$seal"

req "marker=VOID_APOLLYON_SUSPICION_REVIEW_BOUNDARY_V1" "$suspicion"
req "marker=VOID_APOLLYON_PUBLIC_ADVISORY_MANIFEST_SCHEMA_V1" "$schema"
req "marker=VOID_APOLLYON_PUBLIC_ADVISORY_MANIFEST_EXAMPLE_V1" "$example"
req "marker=VOID_APOLLYON_ADVISORY_CHAIN_INDEX_V1" "$index"
req "marker=VOID_APOLLYON_ADVISORY_ENFORCEMENT_HOLD_BOUNDARY_V1" "$hold"
req "marker=VOID_APOLLYON_OPERATOR_REVIEW_QUEUE_BOUNDARY_V1" "$queue"
req "marker=VOID_APOLLYON_ADVISORY_SAFETY_ROLLUP_V1" "$rollup"

req "advisory_phase_closed=true" "$seal"
req "advisory_subsystem_green=true" "$seal"
req "advisory_subsystem_mode=design_only" "$seal"
req "advisory_subsystem_summary=Apollyon_advisory_subsystem_is_a_review_map_not_a_weapon" "$seal"

req "live_endpoint_created=false" "$seal"
req "live_manifest_created=false" "$seal"
req "live_queue_created=false" "$seal"
req "apply_enabled=false" "$seal"
req "enforcement_enabled=false" "$seal"
req "automatic_action_from_advisory=false" "$seal"

req "apollyon_can_recommend_future_design=true" "$seal"
req "apollyon_can_create_live_queue_entry=false" "$seal"
req "apollyon_can_execute=false" "$seal"
req "apollyon_can_apply=false" "$seal"
req "apollyon_can_perform_live_mutation=false" "$seal"

req "candidate_is_not_action=true" "$seal"
req "candidate_approved_status_is_not_apply=true" "$seal"
req "operator_final_authority=true" "$seal"
req "future_work_must_be_separate_lane=true" "$seal"
req "future_apply_must_not_inherit_authority_from_advisory=true" "$seal"

req "raw_payload_publicly_exposed=false" "$seal"
req "private_key_exposed=false" "$seal"
req "wallet_seed_exposed=false" "$seal"
req "ledger_write=false" "$seal"
req "money_movement=false" "$seal"
req "validator_mutation=false" "$seal"
req "service_restart=false" "$seal"
req "protect_the_core=true" "$seal"

echo "VOID_APOLLYON_ADVISORY_SUBSYSTEM_FINAL_SEAL_V1_GREEN"
