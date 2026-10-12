# Public Node Alienware Remote Rejoin Closeout

Marker: VOID_PUBLIC_NODE_ALIENWARE_REMOTE_REJOIN_CLOSEOUT_V1

Status: green.

This records the remote Alienware rejoin after the machine was out of state/offline.

## Rejoin evidence

- Remote target: zoso@100.122.79.39
- Transport: Tailscale SSH
- Head: cb1ed780
- Tag: ckpt-public-node-first-external-tester-wc-operator-decision-packet-green-20260614-074211
- Public base URL restored: http://100.122.79.39:4100
- Demo 003 folder fixture reseeded and public folder serving proved.
- Canonical real-data store copied from Precision to Alienware.
- Alienware real-data lane proof emitted: VOID_PUBLIC_NODE_REAL_DATA_IMPORT_LANE_STATUS_PROOF_V1_GREEN
- Alienware weighted object count: 5
- Alienware final rollup emitted: VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_V1_GREEN
- Final rejoin marker: alienware_live_status_rollup_rejoin_after_precision_real_data_copy_green=true

## Safety boundary

- public_upload=false
- operator_local_import_only=true
- public_read_only=true
- trusted_as_network_truth=false
- money_movement=false
- wallet_send=false
- wc_to_void_swap=false
- buy_void_fulfillment=false
- validator_mutation=false

## Work Credit boundary

The first external tester WC lane remains read-only and pending operator review.

- award_created_now=false
- wc_ledger_write=false
- wc_credit_award=false
- wc_to_void_swap=false
- current_decision_state=not_decided

This closeout records remote two-box recovery only. It does not create a review record, decision record, Work Credit award, ledger mutation, or token movement.
