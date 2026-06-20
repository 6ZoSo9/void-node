#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

doc="docs/public/reviewer-public-evidence-packet-closeout-seal-v1.md"
reviewer_proof="ops/mainnet0/reviewer-public-evidence-packet-v1-proof.sh"

grep -F "VOID_REVIEWER_PUBLIC_EVIDENCE_PACKET_CLOSEOUT_SEAL_DOC_V1" "$doc" >/dev/null
grep -F "docs/proof-only" "$doc" >/dev/null
grep -F "does not open public intake" "$doc" >/dev/null
grep -F "does not open public mutation" "$doc" >/dev/null
grep -F "does not add a runtime route" "$doc" >/dev/null
grep -F "does not modify \`src/index.ts\`" "$doc" >/dev/null
grep -F "7b0feab1" "$doc" >/dev/null
grep -F "7b0feab1cbba" "$doc" >/dev/null
grep -F "ckpt-reviewer-public-evidence-packet-v1-local-green-20260620-172512" "$doc" >/dev/null
grep -F "ckpt-reviewer-public-evidence-packet-v1-cross-box-green-20260620-173036" "$doc" >/dev/null
grep -F "c8c44756" "$doc" >/dev/null
grep -F "git grep" "$doc" >/dev/null
grep -F "VOID_REVIEWER_PUBLIC_EVIDENCE_PACKET_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_REVIEWER_PUBLIC_EVIDENCE_PACKET_V1_RUNTIME_BASELINE_STILL_GREEN" "$doc" >/dev/null
grep -F "VOID_REVIEWER_PUBLIC_EVIDENCE_PACKET_V1_PRECISION_SYNCED" "$doc" >/dev/null

grep -F "public_intake_open_now=false" "$doc" >/dev/null
grep -F "public_mutation_open_now=false" "$doc" >/dev/null
grep -F "public_node_literal_mutation_handler_count=0" "$doc" >/dev/null
grep -F "literal_mutation_handler_count=118" "$doc" >/dev/null
grep -F "funding_surface_read_only=true" "$doc" >/dev/null
grep -F "reviewer_packet_only=true" "$doc" >/dev/null
grep -F "wallet_send_closed=true" "$doc" >/dev/null
grep -F "money_movement_closed=true" "$doc" >/dev/null
grep -F "wc_award_mutation_closed=true" "$doc" >/dev/null
grep -F "validator_admission_mutation_closed=true" "$doc" >/dev/null
grep -F "datanet_public_ingest_mutation_closed=true" "$doc" >/dev/null

grep -F "docs_proof_only=true" "$doc" >/dev/null
grep -F "modifies_src_index=false" "$doc" >/dev/null
grep -F "runtime_route_added=false" "$doc" >/dev/null
grep -F "reviewer_packet_recovery_recorded=true" "$doc" >/dev/null
grep -F "reviewer_proof_uses_git_grep=true" "$doc" >/dev/null
grep -F "recursive_repo_grep_removed=true" "$doc" >/dev/null
grep -F "build_before_commit_required=true" "$doc" >/dev/null
grep -F "cross_box_required=true" "$doc" >/dev/null

grep -F "git grep" "$reviewer_proof" >/dev/null
if grep -F 'grep -''R' "$reviewer_proof" >/dev/null; then
  echo "reviewer proof still contains recursive grep" >&2
  exit 31
fi

bash ops/mainnet0/reviewer-public-evidence-packet-v1-proof.sh >/tmp/void-reviewer-closeout-reviewer-proof.out
grep -F "VOID_REVIEWER_PUBLIC_EVIDENCE_PACKET_V1_GREEN" /tmp/void-reviewer-closeout-reviewer-proof.out >/dev/null

bash ops/mainnet0/public-surface-safety-index-v1-proof.sh >/tmp/void-reviewer-closeout-safety-index.out
grep -F "VOID_PUBLIC_SURFACE_SAFETY_INDEX_V1_GREEN" /tmp/void-reviewer-closeout-safety-index.out >/dev/null

bash ops/mainnet0/public-mutation-method-boundary-audit-v1.sh >/tmp/void-reviewer-closeout-mutation.out
grep -F "literal_mutation_handler_count=118" /tmp/void-reviewer-closeout-mutation.out >/dev/null
grep -F "public_node_literal_mutation_handler_count=0" /tmp/void-reviewer-closeout-mutation.out >/dev/null
grep -F "VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN" /tmp/void-reviewer-closeout-mutation.out >/dev/null

bash ops/mainnet0/funding-gateway-card-v1-proof.sh >/tmp/void-reviewer-closeout-funding.out
grep -F "VOID_FUNDING_GATEWAY_CARD_V1_GREEN" /tmp/void-reviewer-closeout-funding.out >/dev/null

echo "VOID_REVIEWER_PUBLIC_EVIDENCE_PACKET_CLOSEOUT_SEAL_V1_GREEN"
