# USDC/VOID Buy Pool Buyer Packet Private Intake Boundary v1

Marker: VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_BOUNDARY_V1

Purpose: publish the boundary that buyer manual review packets are private/operator intake only, not public-node submissions.

This is a public boundary notice only.

It says:

- the public node publishes buyer instructions and a copyable packet template
- the public node does not accept buyer packets
- the public node does not create claims
- the public node does not verify private buyer identity
- the public node does not collect private contact information
- the public node does not trigger fulfillment
- the public node does not perform wallet actions
- the public node does not mutate ledgers

Private/operator intake may happen only through a separate operator-controlled channel.

Buyer packet handling remains subject to:

- payment verification
- chain / token / receiver allowlist
- amount-rate policy
- duplicate payment guard
- buyer identity binding
- finality confirmations
- payment eligibility decision
- operator review

Current state:

- buyer_packet_private_intake_boundary_green
- private_operator_intake_required
- public_submission_disabled
- no_public_claim_creation
- no_public_wallet_action
- no_public_mutation
- automatic_fulfillment_disabled_now
- public_node_authority_false
