# Public Node Sybil / DDoS Threat Model v1

Marker: `VOID_PUBLIC_NODE_SKEPTIC_SYBIL_DDOS_THREAT_MODEL_DOC_V1`

This document is a security disclosure. It is not a mitigation-complete claim.

Parent disclosure:

```text
/public-node/skeptic-audit-readiness.json

Child route:

/public-node/skeptic/sybil-ddos-threat-model.json

Route marker:

VOID_PUBLIC_NODE_SKEPTIC_SYBIL_DDOS_THREAT_MODEL_V1
1. Status

VOID Mainnet-0 is seed-stage and operator-heavy.

This v1 threat model does not claim:

automatic_sybil_resistance
route_level_rate_limiting
reverse_proxy_ddos_protection
separate_public_private_process_isolation
automated_public_peer_admission
automated_validator_admission_from_public_inputs
wc_based_consensus_security

The current status is:

disclosure_only=true
mitigation_complete=false
sybil_resistance_mature=false
route_level_rate_limit_claimed=false
reverse_proxy_ddos_protection_claimed=false
public_private_process_isolation_complete=false
2. Attack classes recognized in v1

This disclosure recognizes the following attack classes:

sybil_peer_identity_pressure
public_route_flooding
socket_exhaustion
slow_client_connection_pressure
repeated_receipt_submission_pressure
route_index_scraping
dataset_challenge_probe_pressure
operator_review_pollution

This is a list of recognized pressure points. It is not a claim that the current public node fully mitigates them.

3. Public route boundary

The current boundary is:

public_routes_read_only=true
public_route_mutation_allowed=false
core_ledger_mutation_allowed=false
wallet_mutation_allowed=false
validator_admission_mutation_allowed=false
wc_award_mutation_allowed=false
ledger_write_allowed=false
private_api_access_allowed=false

Read-only does not mean DoS-proof.

The v1 public route surface can still be pressured through request volume, socket exhaustion, slow clients, or route scraping.

4. Availability risk

The current process-isolation disclosure is:

public_route_crash_could_affect_local_node_availability=true
process_crash_risk_type=availability_not_authorized_state_mutation

This means the risk is local node availability. It is not an authorized public mutation path.

This document does not claim strong process isolation, disk isolation, or network-layer DDoS protection.

5. Operator review boundary

Public inputs may enter manual review queues.

Manual review is required before trust promotion.

The v1 boundary is:

public_inputs_can_enter_manual_review_queue=true
manual_review_required_before_trust_promotion=true
automatic_validator_or_wc_award_from_public_input=false
work_credits_indirect_influence_scope=manual_operator_review_only
work_credits_can_influence_block_finality=false

This means public inputs can be reviewed by the operator. They do not automatically create validators, Work Credit awards, ledger writes, wallet sends, or consensus changes.

6. Current guardrails

Current v1 guardrails:

public_read_only_routes
no_public_wallet_mutation
no_public_validator_mutation
no_public_wc_award
no_public_ledger_write
manual_operator_review_required_before_trust_promotion
proof_script_marker_checks
live_status_rollup_guards

These are boundary guardrails. They are not a production security guarantee.

7. Next work

Future child work should define:

define_bounded_public_request_profile_v1
define_peer_identity_candidate_rules_v1
define_abuse_log_shape_v1
define_process_isolation_upgrade_path_v1

Passing the proof for this route means the public disclosure matches the declared v1 boundary. It does not mean the node is secure against Sybil or DDoS attacks.
