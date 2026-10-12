#!/usr/bin/env bash
set -euo pipefail

funding_doc="docs/public/funding-support-v1.md"
packet_doc="docs/public/public-node-funding-engine-focus-packet-v1.md"

test -f "$funding_doc"
test -f "$packet_doc"

req() {
  grep -Fxq -- "$1" "$2"
}

req "## Funding engine focus" "$funding_doc"
req "Funding -> Work Credits -> DataNet -> Validators -> Trust -> more funding and participation." "$funding_doc"
req "- docs/public/public-node-funding-engine-focus-packet-v1.md" "$funding_doc"
req "- VOID_FUNDING_ENGINE_FOCUS_PACKET_V1" "$funding_doc"

req "marker=VOID_FUNDING_ENGINE_FOCUS_PACKET_V1" "$packet_doc"
req "core_focus_1=funding" "$packet_doc"
req "core_focus_2=work_credits" "$packet_doc"
req "core_focus_3=datanet" "$packet_doc"
req "core_focus_4=validators" "$packet_doc"
req "funding_does_not_create_return_promise=true" "$packet_doc"

echo "VOID_FUNDING_ENGINE_PUBLIC_SURFACE_LINK_V1_GREEN"
