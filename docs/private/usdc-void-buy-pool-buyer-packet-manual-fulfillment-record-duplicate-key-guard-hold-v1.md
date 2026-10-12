# USDC/VOID Buy Pool Buyer Packet Manual Fulfillment Record Duplicate Key Guard Hold v1

Marker: VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_DUPLICATE_KEY_GUARD_HOLD_V1

Purpose: define a private/operator-only hold shape for a future duplicate manual fulfillment record key guard before a manual fulfillment record write apply packet.

This is duplicate record-key guard hold recording only.

It requires the prior private pre-apply backup hold state:

- ready_for_separate_duplicate_record_key_guard_hold

It may define a future duplicate record-key guard envelope for:

- buyer packet reference
- pre-apply backup hold reference
- manual fulfillment record write apply readiness hold reference
- manual fulfillment record write hold reference
- proposed manual fulfillment record key
- proposed append-only target reference
- duplicate key lookup scope
- duplicate key guard status
- duplicate key blocked reason codes
- next required operator action

It does not perform:

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

Allowed duplicate key guard hold states:

- draft_hold
- blocked_missing_pre_apply_backup_hold
- blocked_pre_apply_backup_not_ready
- blocked_missing_proposed_record_key
- blocked_missing_append_only_target
- blocked_duplicate_record_key_detected
- held_duplicate_record_key_guard_shape_only
- ready_for_separate_manual_fulfillment_record_write_apply_packet_hold

This hold is private by design and must not be mounted as a public-node route.
