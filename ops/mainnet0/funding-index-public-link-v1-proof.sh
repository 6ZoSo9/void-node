#!/usr/bin/env bash
set -euo pipefail

funding_doc="docs/public/funding-support-v1.md"
index_doc="docs/public/public-node-funding-packet-index-v1.md"

test -f "$funding_doc"
test -f "$index_doc"

req() {
  grep -Fxq -- "$1" "$2"
}

req "## Funding packet index" "$funding_doc"
req "Start here for the public funding packet ladder." "$funding_doc"
req "- docs/public/public-node-funding-packet-index-v1.md" "$funding_doc"
req "- VOID_FUNDING_PACKET_INDEX_V1" "$funding_doc"
req "- Funding Support v1" "$funding_doc"
req "- Funding Engine Focus Packet v1" "$funding_doc"
req "- Funding Needs Matrix v1" "$funding_doc"
req "- Funding Supporter Action Packet v1" "$funding_doc"

req "- no funds moved by the index" "$funding_doc"
req "- no payment link created by the index" "$funding_doc"
req "- no return promise" "$funding_doc"
req "- no automatic fulfillment" "$funding_doc"
req "- no automatic Work Credit award" "$funding_doc"
req "- no validator admission promise" "$funding_doc"
req "- no public mutation access" "$funding_doc"

req "marker=VOID_FUNDING_PACKET_INDEX_V1" "$index_doc"

echo "VOID_FUNDING_INDEX_PUBLIC_LINK_V1_GREEN"
