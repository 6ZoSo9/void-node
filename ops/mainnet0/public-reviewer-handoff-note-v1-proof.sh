#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

doc="docs/public/public-reviewer-handoff-note-v1.md"

grep -F "VOID_PUBLIC_REVIEWER_HANDOFF_NOTE_DOC_V1" "$doc" >/dev/null
grep -F "docs/proof-only reviewer note" "$doc" >/dev/null
grep -F "does not open public intake" "$doc" >/dev/null
grep -F "does not open public mutation" "$doc" >/dev/null
grep -F "does not add a runtime route" "$doc" >/dev/null
grep -F "does not modify \`src/index.ts\`" "$doc" >/dev/null
grep -F "d7092bd7" "$doc" >/dev/null
grep -F "d7092bd7f661" "$doc" >/dev/null

grep -F "VOID_REVIEWER_PUBLIC_EVIDENCE_PACKET_CLOSEOUT_SEAL_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_REVIEWER_PUBLIC_EVIDENCE_PACKET_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_PUBLIC_SURFACE_SAFETY_INDEX_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_FUNDING_GATEWAY_CARD_V1_GREEN" "$doc" >/dev/null

grep -F "/version" "$doc" >/dev/null
grep -F "/public-node" "$doc" >/dev/null
grep -F "/public-node/funding" "$doc" >/dev/null
grep -F "/buy-void" "$doc" >/dev/null
grep -F "/public-node/datanet/explorer-v1" "$doc" >/dev/null
grep -F "/public-node/route-index" "$doc" >/dev/null

grep -F "docs_proof_only=true" "$doc" >/dev/null
grep -F "modifies_src_index=false" "$doc" >/dev/null
grep -F "runtime_route_added=false" "$doc" >/dev/null
grep -F "public_reviewer_note_only=true" "$doc" >/dev/null
grep -F "public_intake_open_now=false" "$doc" >/dev/null
grep -F "public_mutation_open_now=false" "$doc" >/dev/null
grep -F "funding_surface_read_only=true" "$doc" >/dev/null
grep -F "datanet_evidence_read_only=true" "$doc" >/dev/null
grep -F "wallet_send_closed=true" "$doc" >/dev/null
grep -F "money_movement_closed=true" "$doc" >/dev/null
grep -F "wc_award_mutation_closed=true" "$doc" >/dev/null
grep -F "validator_admission_mutation_closed=true" "$doc" >/dev/null
grep -F "datanet_public_ingest_mutation_closed=true" "$doc" >/dev/null
grep -F "build_before_commit_required=true" "$doc" >/dev/null
grep -F "cross_box_required=true" "$doc" >/dev/null

bash ops/mainnet0/reviewer-public-evidence-packet-closeout-seal-v1-proof.sh >/tmp/void-reviewer-handoff-closeout.out
grep -F "VOID_REVIEWER_PUBLIC_EVIDENCE_PACKET_CLOSEOUT_SEAL_V1_GREEN" /tmp/void-reviewer-handoff-closeout.out >/dev/null

bash ops/mainnet0/reviewer-public-evidence-packet-v1-proof.sh >/tmp/void-reviewer-handoff-packet.out
grep -F "VOID_REVIEWER_PUBLIC_EVIDENCE_PACKET_V1_GREEN" /tmp/void-reviewer-handoff-packet.out >/dev/null

bash ops/mainnet0/public-surface-safety-index-v1-proof.sh >/tmp/void-reviewer-handoff-safety-index.out
grep -F "VOID_PUBLIC_SURFACE_SAFETY_INDEX_V1_GREEN" /tmp/void-reviewer-handoff-safety-index.out >/dev/null

bash ops/mainnet0/public-mutation-method-boundary-audit-v1.sh >/tmp/void-reviewer-handoff-mutation.out
grep -F "literal_mutation_handler_count=118" /tmp/void-reviewer-handoff-mutation.out >/dev/null
grep -F "public_node_literal_mutation_handler_count=0" /tmp/void-reviewer-handoff-mutation.out >/dev/null
grep -F "VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN" /tmp/void-reviewer-handoff-mutation.out >/dev/null

bash ops/mainnet0/funding-gateway-card-v1-proof.sh >/tmp/void-reviewer-handoff-funding.out
grep -F "VOID_FUNDING_GATEWAY_CARD_V1_GREEN" /tmp/void-reviewer-handoff-funding.out >/dev/null

if grep -F 'APP.post("/public-node' src/index.ts >/dev/null; then
  echo "public-node POST route unexpectedly present" >&2
  exit 31
fi

echo "VOID_PUBLIC_REVIEWER_HANDOFF_NOTE_V1_GREEN"
