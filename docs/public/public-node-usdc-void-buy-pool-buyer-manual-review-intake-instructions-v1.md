# USDC/VOID Buy Pool Buyer Manual Review Intake Instructions v1

Marker: VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_INTAKE_INSTRUCTIONS_V1

Purpose: publish public buyer instructions for manual review intake while automatic fulfillment remains disabled.

This is an instruction surface only.

Buyer manual review packet should include:

- chain name
- transaction hash
- USDC amount
- sending wallet address
- receiving VOID wallet address
- optional private contact path, shared only through private/operator channels
- statement that buyer understands fulfillment is manual review, not instant automation

Public boundary:

- Do not post private contact info on the public node.
- Do not post seed phrases, private keys, signatures, passwords, or secret material.
- Do not assume automatic fulfillment is active.
- Do not assume a public page creates a claim by itself.
- Manual review requires payment verification, finality confirmations, duplicate guard, buyer identity binding, amount/rate policy, and operator decision.

Current state:

- buyer_manual_review_intake_instructions_green
- automatic_fulfillment_disabled_now
- manual_review_possible_after_buyer_packet
- public_node_authority_false
- no_public_mutation
