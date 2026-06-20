#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-funding-public-route-exposure-v1.md"
support_doc="docs/public/funding-support-v1.md"
index_doc="docs/public/public-node-funding-packet-index-v1.md"

test -f "$doc"
test -f "$support_doc"
test -f "$index_doc"

req() {
  grep -Fxq -- "$1" "$2"
}

req "marker=VOID_FUNDING_PUBLIC_ROUTE_EXPOSURE_V1" "$doc"
req "exposure_status=public_docs_only_no_runtime_route_added_no_funds_moved" "$doc"
req "public_entry_doc=docs/public/funding-support-v1.md" "$doc"
req "public_index_doc=docs/public/public-node-funding-packet-index-v1.md" "$doc"
req "public_index_marker=VOID_FUNDING_PACKET_INDEX_V1" "$doc"

req "intended_public_route=/public-node/funding" "$doc"
req "intended_public_route_state=read_only" "$doc"
req "runtime_route_added_now=false" "$doc"
req "route_index_mutated_now=false" "$doc"
req "service_restart_required_now=false" "$doc"

req "funding_ladder_visible=true" "$doc"
req "funding_packet_index_linked=true" "$doc"
req "funding_supporter_action_packet_linked=true" "$doc"

req "no_funds_moved=true" "$doc"
req "no_payment_link_created=true" "$doc"
req "no_return_promise=true" "$doc"
req "no_automatic_fulfillment=true" "$doc"
req "no_automatic_wc_award=true" "$doc"
req "no_validator_admission_promise=true" "$doc"
req "no_public_mutation_access=true" "$doc"

req "marker=VOID_FUNDING_PACKET_INDEX_V1" "$index_doc"

echo "VOID_FUNDING_PUBLIC_ROUTE_EXPOSURE_V1_GREEN"
