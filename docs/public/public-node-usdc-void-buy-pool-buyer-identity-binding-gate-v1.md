# USDC/VOID Buy Pool Buyer Identity Binding Gate v1

Marker: VOID_USDC_VOID_BUY_POOL_BUYER_IDENTITY_BINDING_GATE_V1

Purpose: prove the buyer-binding policy required before automatic payment handling can safely associate an observed USDC transfer candidate with one buyer claim and one receiving VOID address.

This gate is green for buyer identity binding policy only.

Binding policy:

- Buyer binding key is a public-safe opaque identifier, not public PII.
- Buyer binding key must be derived from operator-reviewed buyer intent data or a future signed claim.
- Buyer binding key must bind to exactly one receiving VOID address for a candidate.
- Payment event key must bind to exactly one buyer binding key before any allocation candidate can advance.
- Conflicting buyer binding claims must go to hold.
- Conflicting receiving VOID addresses must go to hold.
- Missing buyer binding key must go to hold.
- Public surfaces must not reveal private PII, private allocation notes, private contact info, or secret material.

Binding states:

- buyer_binding_candidate_ready
- buyer_binding_missing_hold
- buyer_binding_conflict_hold
- receiving_void_address_missing_hold
- receiving_void_address_conflict_hold
- payment_event_unbound_hold
- operator_review_required

Gate result:

- buyer_identity_binding_gate_green: true
- buyer_binding_key_policy_green: true
- receiving_void_address_policy_green: true
- conflict_hold_policy_green: true
- public_pii_redaction_policy_green: true

Non-authority statement:

This gate does not verify a real payment now, does not fetch live chain data now, does not approve a buyer, does not write a private allocation ledger, does not reserve inventory, does not enable automatic fulfillment, and does not transfer VOID.
