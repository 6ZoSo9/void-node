# USDC/VOID Buy Pool Buyer Packet Manual Fulfillment Review Handoff Hold v1

Marker: VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_REVIEW_HANDOFF_HOLD_V1

Purpose: define a private/operator-only hold shape for recording that a buyer packet with a recorded payment eligibility decision may be handed off into manual fulfillment review.

This is manual fulfillment review handoff recording only.

It requires the prior private payment eligibility decision result state:

- payment_eligibility_decision_result_recorded_unverified

It may record that an operator-controlled handoff exists for:

- buyer packet reference
- payment eligibility decision result reference
- eligibility decision state
- buyer identity binding result reference
- duplicate payment guard result reference
- amount/rate policy result reference
- finality confirmations result reference
- manual review packet template reference
- handoff state
- handoff reason codes

It does not perform:

- public-node RPC receipt read
- public-node Transfer log parsing
- payment eligibility decision
- manual fulfillment approval
- VOID allocation claim creation
- VOID transfer
- wallet signing
- treasury movement
- automatic fulfillment
- public-node mutation

Authority remains false.

Allowed handoff states:

- draft_hold
- blocked_missing_payment_eligibility_decision_result
- blocked_payment_not_eligible
- blocked_missing_manual_review_template
- held_manual_fulfillment_review_handoff_shape_only
- ready_for_separate_manual_fulfillment_review_packet

This hold is private by design and must not be mounted as a public-node route.
