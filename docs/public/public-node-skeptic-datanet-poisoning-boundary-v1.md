# Public Node DataNet Poisoning Boundary v1

Marker: `VOID_PUBLIC_NODE_SKEPTIC_DATANET_POISONING_BOUNDARY_DOC_V1`

This document is a poisoning-boundary disclosure. It is not a claim that DataNet content is true, safe, clean, or production-moderated.

Parent disclosure:

```text
/public-node/skeptic-audit-readiness.json

Sibling threat model:

/public-node/skeptic/sybil-ddos-threat-model.json

Child route:

/public-node/skeptic/datanet-poisoning-boundary-v1.json

Route marker:

VOID_PUBLIC_NODE_SKEPTIC_DATANET_POISONING_BOUNDARY_V1
1. Core truth boundary

DataNet must separate byte integrity from semantic trust.

The v1 truth boundary is:

sha256_verifies_bytes_not_truth=true
content_root_verifies_manifest_shape_not_semantic_truth=true
valid_manifest_does_not_mean_safe_content=true
served_by_public_node_does_not_mean_trusted=true
public_route_does_not_mean_public_upload=true
datanet_object_does_not_mean_promoted_knowledge=true
ai_visibility_is_separate_from_storage_presence=true
work_credit_eligibility_is_separate_from_data_truth=true

A SHA-256 hash can prove that the same bytes were served. It cannot prove that the bytes are accurate, benign, current, non-duplicative, or useful.

2. Attack classes recognized in v1

This disclosure recognizes:

malicious_dataset_payload
false_metadata_claims
stale_data_replay
duplicate_data_spam
suspicious_content_injection
path_traversal_attempts
manifest_shape_poisoning
receipt_spoofing_pressure
ai_prompt_injection_payloads
operator_review_pollution

This list is not a claim that the current system fully mitigates each attack.

3. Current public route boundary

The v1 boundary is:

public_upload_enabled=false
operator_local_import_only=true
public_routes_read_only=true
public_route_mutation_allowed=false
dataset_id_builds_filesystem_path=false
filesystem_path_built_from_dataset_id=false
automatic_trust_promotion_enabled=false
automatic_ai_visibility_promotion_enabled=false
automatic_work_credit_award_from_dataset=false
automatic_ledger_write_from_dataset=false
automatic_validator_influence_from_dataset=false

The public node can serve a verified object or manifest without declaring that object trustworthy.

4. Data weight boundary

The Data Weight Record doctrine separates storage presence from promotion.

The v1 boundary is:

source_weight_required_before_promotion=true
verification_state_required_before_promotion=true
suspicion_state_required_before_promotion=true
duplicate_state_required_before_promotion=true
freshness_state_required_before_promotion=true
quarantine_state_supported=true
tombstone_state_supported=true
hidden_by_default_visibility_supported=true
trust_score_is_not_same_as_hash_integrity=true

A stored object can be hot, warm, cold, quarantined, hidden by default, or tombstone-only. Preservation is not promotion.

5. Quarantine policy

The v1 quarantine policy is:

suspicious_data_default_action=quarantine_or_hidden_by_default
duplicate_data_default_action=dedupe_or_demote
stale_data_default_action=demote_until_reviewed
traversal_attempt_default_action=reject
malformed_manifest_default_action=reject
poisoning_evidence_preserved_as_metadata=true
raw_payload_truth_claim=false

Poisoning evidence should be preserved as metadata where useful, but the raw payload must not be treated as true merely because it was received or hash-verified.

6. Not claimed in v1

This route does not claim:

automatic_content_truth_detection
malware_scanning_complete
prompt_injection_scanning_complete
public_upload_acceptance
automatic_trust_promotion
automatic_work_credit_award_from_dataset_truth
production_grade_dataset_moderation
7. Current guardrails

Current guardrails:

sha256_content_addressing
manifest_root_verification
dataset_id_whitelist_challenge_route
no_filesystem_path_building_from_dataset_id
public_read_only_routes
operator_local_import_only
data_weight_record_fields
quarantine_and_tombstone_states
manual_operator_review_before_trust_promotion

These are boundary guardrails. They are not a production moderation or malware-scanning guarantee.

Passing the proof for this route means the public disclosure matches the declared v1 boundary. It does not mean DataNet content is safe, true, or production-moderated.
