# USDC/VOID Buy Pool Buyer Packet Manual Fulfillment Record Write Apply Operator Apply Intent Hold v1

Marker: VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_OPERATOR_APPLY_INTENT_HOLD_V1

Purpose: define a private/operator-only hold shape for a future operator apply intent after manual fulfillment record write apply activation gate hold.

This is operator apply intent hold recording only.

It requires the prior private activation gate hold state:

- ready_for_separate_manual_fulfillment_record_write_apply_operator_apply_intent_hold

It may define a future operator apply intent envelope for:

- buyer packet reference
- activation gate hold reference
- authority activation record hold reference
- authority activation decision hold reference
- authority activation review hold reference
- write apply execution hold reference
- write apply packet hold reference
- duplicate record-key guard hold reference
- pre-apply backup hold reference
- write apply readiness hold reference
- proposed manual fulfillment record key
- proposed record body hash
- proposed append-only target reference
- operator apply intent status
- operator apply intent blocked reason codes
- next required operator action

It does not perform:

- operator apply execution
- manual fulfillment record write
- manual fulfillment record write apply
- append-only ledger write
- allocation claim creation
- VOID transfer
- wallet signing
- treasury movement
- automatic fulfillment
- public-node mutation

Authority remains false.

Allowed operator apply intent hold states:

- draft_hold
- blocked_missing_activation_gate_hold
- blocked_activation_gate_not_ready
- blocked_activation_gate_closed
- blocked_missing_authority_activation_record_hold
- blocked_missing_write_apply_execution_hold
- blocked_missing_write_apply_packet_hold
- blocked_missing_operator_final_approval
- blocked_operator_apply_intent_authority_false
- held_operator_apply_intent_shape_only
- ready_for_separate_manual_fulfillment_record_write_apply_final_apply_preflight_hold

This hold is private by design and must not be mounted as a public-node route.
