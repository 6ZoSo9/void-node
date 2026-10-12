# USDC/VOID Buy Pool Operator Authority Activation Approval Record Hold v1

Marker: VOID_USDC_VOID_BUY_POOL_OPERATOR_AUTHORITY_ACTIVATION_APPROVAL_RECORD_HOLD_V1

Purpose: define the operator approval record shape required before any future authority activation.

This is a hold gate. It does not create an approval record and does not activate authority.

Approval record shape:

- approval_record_id: deterministic id from activation gate, operator key, and approval policy version
- operator_identity_key
- approval_scope
- activation_gate_marker
- prerequisite_reconcile_marker
- approval_policy_version
- approval_state
- approval_reason
- created_at_policy
- cross_box_required
- final_sync_required

Hold states:

- operator_authority_activation_approval_record_hold
- blocked_missing_operator_approval
- blocked_invalid_approval_scope
- blocked_missing_reconcile_reference
- blocked_missing_cross_box_green
- blocked_missing_final_sync
- operator_review_required

Authority remains false:

- no approval record creation
- no public mutation
- no runtime queue execution
- no wallet signer access
- no automatic fulfillment
- no VOID transfer
