#!/usr/bin/env bash
set -euo pipefail

src="src/index.ts"
doc="docs/public/public-node-funding-runtime-route-v1.md"
packet_index="docs/public/public-node-funding-packet-index-v1.md"
exposure_doc="docs/public/public-node-funding-public-route-exposure-v1.md"

test -f "$src"
test -f "$doc"
test -f "$packet_index"
test -f "$exposure_doc"

req() {
  grep -Fq -- "$1" "$2"
}

req_exact() {
  grep -Fxq -- "$1" "$2"
}

route_count="$(grep -F -c -- 'APP.get("/public-node/funding"' "$src")"
test "$route_count" = "1"

req "APP.get(\"/public-node/funding\"" "$src"
req "VOID_FUNDING_PATH_TIGHTEN_V1" "$src"
req "VOID_FUNDING_RUNTIME_ROUTE_V1" "$src"
req "Funding packet ladder" "$src"
req "docs/public/public-node-funding-packet-index-v1.md" "$src"
req "VOID_FUNDING_PACKET_INDEX_V1" "$src"
req "no funds moved by this page" "$src"
req "no payment link created by this page" "$src"
req "no automatic Work Credit award" "$src"
req "no validator admission promise" "$src"
req "no public mutation access" "$src"

req '{ path: "/public-node/funding", kind: "html", marker: "VOID_FUNDING_PATH_TIGHTEN_V1"' "$src"

req_exact "marker=VOID_FUNDING_RUNTIME_ROUTE_V1" "$doc"
req_exact "route=/public-node/funding" "$doc"
req_exact "route_state=read_only" "$doc"
req_exact "runtime_change=existing_route_extended_no_duplicate_route" "$doc"
req_exact "no_funds_moved=true" "$doc"
req_exact "no_payment_link_created=true" "$doc"
req_exact "no_return_promise=true" "$doc"
req_exact "no_automatic_fulfillment=true" "$doc"
req_exact "no_automatic_wc_award=true" "$doc"
req_exact "no_validator_admission_promise=true" "$doc"
req_exact "no_public_mutation_access=true" "$doc"

req_exact "marker=VOID_FUNDING_PACKET_INDEX_V1" "$packet_index"
req_exact "marker=VOID_FUNDING_PUBLIC_ROUTE_EXPOSURE_V1" "$exposure_doc"

echo "VOID_FUNDING_RUNTIME_ROUTE_V1_GREEN"
