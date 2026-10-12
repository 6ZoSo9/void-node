#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-funding-needs-matrix-v1.md"
focus_doc="docs/public/public-node-funding-engine-focus-packet-v1.md"
surface_proof="ops/mainnet0/funding-engine-public-surface-link-v1-proof.sh"

test -f "$doc"
test -f "$focus_doc"
test -x "$surface_proof"

req() {
  grep -Fxq -- "$1" "$2"
}

req "marker=VOID_FUNDING_NEEDS_MATRIX_V1" "$doc"
req "matrix_status=public_docs_only_no_funds_moved_no_funding_request_created" "$doc"
req "matrix_purpose=show_what_funding_unlocks_across_wc_datanet_and_validators" "$doc"

req "focus_axis_1=work_credits" "$doc"
req "focus_axis_2=datanet" "$doc"
req "focus_axis_3=validators" "$doc"
req "focus_axis_4=operator_infrastructure" "$doc"

req "funding_is_support_capacity=true" "$doc"
req "funding_is_not_automatic_delivery=true" "$doc"
req "funding_is_not_return_promise=true" "$doc"
req "funding_is_not_wc_award=true" "$doc"
req "funding_is_not_validator_admission=true" "$doc"
req "funding_is_not_public_mutation_access=true" "$doc"

req "wc_need_1=operator_review_time" "$doc"
req "wc_guard_1=no_automatic_wc_awards_no_unreviewed_credit_issuance" "$doc"
req "wc_guard_2=wc_remains_contribution_accounting_not_native_currency" "$doc"

req "datanet_need_1=useful_dataset_fixtures" "$doc"
req "datanet_guard_1=no_public_untrusted_ingest_no_mutation_without_operator_gate" "$doc"
req "datanet_guard_2=no_private_paths_no_secret_exposure_no_unbounded_fetch" "$doc"

req "validator_need_1=readiness_documentation" "$doc"
req "validator_guard_1=no_validator_admission_bypass_no_active_set_opening" "$doc"
req "validator_guard_2=candidate_waiting_only_until_explicit_activation_lane" "$doc"

req "infra_need_1=operator_time_and_redundancy" "$doc"
req "infra_guard_1=no_vps_default_no_secrets_in_public_no_unreviewed_runtime_change" "$doc"

req "marker=VOID_FUNDING_ENGINE_FOCUS_PACKET_V1" "$focus_doc"

echo "VOID_FUNDING_NEEDS_MATRIX_V1_GREEN"
