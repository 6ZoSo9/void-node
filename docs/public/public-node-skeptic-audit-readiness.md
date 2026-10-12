# Public Node Skeptic / Audit Readiness Index v1

Marker: `VOID_PUBLIC_NODE_SKEPTIC_AUDIT_READINESS_DOC_V1`

This document is a security disclosure surface, not a product announcement.

The corresponding public route is:

```text
GET /public-node/skeptic-audit-readiness.json

The route marker is:

VOID_PUBLIC_NODE_SKEPTIC_AUDIT_READINESS_V1
1. Protocol status and limitations

VOID Mainnet-0 is seed-stage and operator-heavy.

The public node surface does not claim mature decentralization. It does not claim production-grade readiness. It does not claim a completed third-party security audit.

Current status indicators:

stage=mainnet0_seed_stage
production_grade_claim=false
third_party_audit_complete=false
decentralization_maturity_claim=not_mature
automated_public_validator_admission_enabled=false

Avoided claims:

No Mainnet-1 timeline is promised here.
No progressive decentralization timeline is promised here.
No production security claim is made here.
2. Route architecture and compute expense boundaries

/public-node/skeptic-audit-readiness.json returns a static v1 disclosure payload.

The route is intended to disclose boundary state. It is not intended to perform live scoring or dynamic operator work.

The v1 endpoint profile states:

state_source=static_v1_disclosure_payload
per_request_database_query=false
per_request_filesystem_scan=false
per_request_shell_execution=false
per_request_ledger_write=false
per_request_wallet_operation=false
per_request_validator_operation=false
public_route_expected_disk_state_write_path=false

This does not mean the route is immune to resource exhaustion. A read-only HTTP endpoint can still consume sockets, memory, and runtime availability under hostile traffic.

3. Availability vs. data integrity risk disclosure

Public/private process isolation is not complete in this v1 disclosure.

A public route crash, flood, or socket exhaustion event may affect local node availability.

This is an availability risk disclosure. It is not an authorized public mutation path.

The v1 availability disclosure states:

read_only_does_not_mean_dos_proof=true
public_and_private_process_isolation_complete=false
public_route_crash_could_affect_local_node_process=true
process_crash_risk_type=availability_not_authorized_state_mutation
rate_limit_enforced_at_route=false
rate_limit_policy_status=not_claimed_in_v1

This document does not claim active route-level throttling. It does not claim reverse-proxy rate limiting. It does not claim stronger process or disk isolation than the v1 schema declares.

4. Native economic protocol boundary: VOID vs Work Credits

Native VOID is the consensus/security asset.

Work Credits are useful-work accounting and reward eligibility scaffolding. They are not the consensus asset.

The v1 economic boundary states:

consensus_security_asset=VOID
work_credits_role=useful_work_accounting_and_reward_eligibility_scaffolding
work_credits_are_consensus_asset=false
work_credits_can_influence_block_finality=false
work_credits_can_directly_mutate_validator_set=false
work_credits_indirect_influence_scope=manual_operator_review_only
work_credits_automatic_governance_power=false

Avoided claims:

No dual-token consensus claim.
No hybrid proof consensus claim.
No claim that WC can programmatically override core chain state.
No claim that WC can automatically admit validators.
5. Verification and automated compliance markers

The proof script is:

ops/mainnet0/public-node-skeptic-audit-readiness-proof.sh

The proof checks that the public route, UI card, route index, and this document match the v1 disclosure boundary.

Expected markers:

VOID_PUBLIC_NODE_SKEPTIC_AUDIT_READINESS_V1
VOID_PUBLIC_NODE_SKEPTIC_AUDIT_READINESS_ROUTE_V1
VOID_PUBLIC_NODE_SKEPTIC_AUDIT_READINESS_UI_V1
VOID_PUBLIC_NODE_SKEPTIC_AUDIT_READINESS_DOC_V1
VOID_PUBLIC_NODE_SKEPTIC_AUDIT_READINESS_PROOF_V1_GREEN

Passing this proof does not mean the node is secure.

It means the public Skeptic / Audit Readiness surface matches the declared v1 boundary fields.
