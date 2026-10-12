#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-skeptic-datanet-poisoning-boundary-v1-proof-$STAMP}"

mkdir -p "$OUT"

echo "=== VOID Public Node Skeptic DataNet Poisoning Boundary Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_SKEPTIC_DATANET_POISONING_BOUNDARY_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_DATANET_POISONING_BOUNDARY_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_DATANET_POISONING_BOUNDARY_UI_V1" src/index.ts
grep -Fq "publicNodeSkepticDatanetPoisoningBoundaryCard" src/index.ts
grep -Fq "publicNodeSkepticDatanetPoisoningBoundaryRawLink" src/index.ts
grep -Fq "publicNodeSkepticDatanetPoisoningBoundaryLink" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_DATANET_POISONING_BOUNDARY_DOC_V1" docs/public/public-node-skeptic-datanet-poisoning-boundary-v1.md
grep -Fq "It does not mean DataNet content is safe, true, or production-moderated." docs/public/public-node-skeptic-datanet-poisoning-boundary-v1.md

curl -fsS --max-time 8 "$BASE/public-node/skeptic/datanet-poisoning-boundary-v1.json" > "$OUT/datanet-poisoning-boundary.json"
curl -fsS --max-time 8 "$BASE/public-node/route-index.json" > "$OUT/route-index.json"
curl -fsS --max-time 8 "$BASE/public-node" > "$OUT/public-node.html"

grep -Fq '"marker":"VOID_PUBLIC_NODE_SKEPTIC_DATANET_POISONING_BOUNDARY_V1"' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"route":"/public-node/skeptic/datanet-poisoning-boundary-v1.json"' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"parent":"/public-node/skeptic-audit-readiness.json"' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"sibling_threat_model":"/public-node/skeptic/sybil-ddos-threat-model.json"' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"production_grade_claim":false' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"third_party_audit_complete":false' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"disclosure_type":"datanet_poisoning_boundary_disclosure_only"' "$OUT/datanet-poisoning-boundary.json"

grep -Fq '"sha256_verifies_bytes_not_truth":true' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"content_root_verifies_manifest_shape_not_semantic_truth":true' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"valid_manifest_does_not_mean_safe_content":true' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"served_by_public_node_does_not_mean_trusted":true' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"public_route_does_not_mean_public_upload":true' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"datanet_object_does_not_mean_promoted_knowledge":true' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"ai_visibility_is_separate_from_storage_presence":true' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"work_credit_eligibility_is_separate_from_data_truth":true' "$OUT/datanet-poisoning-boundary.json"

grep -Fq '"malicious_dataset_payload"' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"false_metadata_claims"' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"stale_data_replay"' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"duplicate_data_spam"' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"suspicious_content_injection"' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"path_traversal_attempts"' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"ai_prompt_injection_payloads"' "$OUT/datanet-poisoning-boundary.json"

grep -Fq '"public_upload_enabled":false' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"operator_local_import_only":true' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"public_routes_read_only":true' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"public_route_mutation_allowed":false' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"dataset_id_builds_filesystem_path":false' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"filesystem_path_built_from_dataset_id":false' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"automatic_trust_promotion_enabled":false' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"automatic_ai_visibility_promotion_enabled":false' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"automatic_work_credit_award_from_dataset":false' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"automatic_ledger_write_from_dataset":false' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"automatic_validator_influence_from_dataset":false' "$OUT/datanet-poisoning-boundary.json"

grep -Fq '"source_weight_required_before_promotion":true' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"verification_state_required_before_promotion":true' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"suspicion_state_required_before_promotion":true' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"duplicate_state_required_before_promotion":true' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"freshness_state_required_before_promotion":true' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"quarantine_state_supported":true' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"tombstone_state_supported":true' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"hidden_by_default_visibility_supported":true' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"trust_score_is_not_same_as_hash_integrity":true' "$OUT/datanet-poisoning-boundary.json"

grep -Fq '"suspicious_data_default_action":"quarantine_or_hidden_by_default"' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"duplicate_data_default_action":"dedupe_or_demote"' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"stale_data_default_action":"demote_until_reviewed"' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"traversal_attempt_default_action":"reject"' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"malformed_manifest_default_action":"reject"' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"poisoning_evidence_preserved_as_metadata":true' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"raw_payload_truth_claim":false' "$OUT/datanet-poisoning-boundary.json"

grep -Fq '"automatic_content_truth_detection"' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"malware_scanning_complete"' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"prompt_injection_scanning_complete"' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"public_upload_acceptance"' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"automatic_trust_promotion"' "$OUT/datanet-poisoning-boundary.json"
grep -Fq '"automatic_work_credit_award_from_dataset_truth"' "$OUT/datanet-poisoning-boundary.json"

grep -Fq "/public-node/skeptic/datanet-poisoning-boundary-v1.json" "$OUT/route-index.json"
grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_DATANET_POISONING_BOUNDARY_V1" "$OUT/route-index.json"

grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_DATANET_POISONING_BOUNDARY_UI_V1" "$OUT/public-node.html"
grep -Fq "publicNodeSkepticDatanetPoisoningBoundaryCard" "$OUT/public-node.html"
grep -Fq "publicNodeSkepticDatanetPoisoningBoundaryLink" "$OUT/public-node.html"
grep -Fq "DataNet Poisoning Boundary" "$OUT/public-node.html"
grep -Fq "SHA-256 verifies bytes, not truth" "$OUT/public-node.html"
grep -Fq "Automatic WC award from dataset" "$OUT/public-node.html"

echo "skeptic_datanet_poisoning_boundary_route_green=true"
echo "skeptic_datanet_poisoning_boundary_route_index_green=true"
echo "skeptic_datanet_poisoning_boundary_card_ui_green=true"
echo "skeptic_datanet_poisoning_boundary_doc_green=true"
echo "skeptic_datanet_poisoning_sha256_verifies_bytes_not_truth=true"
echo "skeptic_datanet_poisoning_valid_manifest_means_safe_content=false"
echo "skeptic_datanet_poisoning_served_by_public_node_means_trusted=false"
echo "skeptic_datanet_poisoning_public_upload_enabled=false"
echo "skeptic_datanet_poisoning_dataset_id_builds_filesystem_path=false"
echo "skeptic_datanet_poisoning_automatic_trust_promotion=false"
echo "skeptic_datanet_poisoning_automatic_ai_visibility_promotion=false"
echo "skeptic_datanet_poisoning_automatic_wc_award_from_dataset=false"
echo "skeptic_datanet_poisoning_automatic_ledger_write_from_dataset=false"
echo "skeptic_datanet_poisoning_automatic_validator_influence_from_dataset=false"
echo "VOID_PUBLIC_NODE_SKEPTIC_DATANET_POISONING_BOUNDARY_PROOF_V1_GREEN"
