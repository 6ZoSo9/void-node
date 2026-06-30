# Mainnet-0 Public Node Operator Readiness Chain Rollup Hold v1

Marker: `VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_CHAIN_ROLLUP_HOLD_V1_GREEN`

## Purpose

This brick seals the current public-node operator readiness chain into one reviewer-facing rollup.

It summarizes the four public-safe surfaces already created for prospective VOID Mainnet-0 public node operators:

1. Operator readiness matrix
2. Operator readiness matrix root index link
3. Operator preflight checklist
4. Operator preflight checklist root index link

## Source markers

- `VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_MATRIX_HOLD_V1_GREEN`
- `VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_INDEX_LINK_HOLD_V1_GREEN`
- `VOID_MAINNET0_PUBLIC_NODE_OPERATOR_PREFLIGHT_CHECKLIST_HOLD_V1_GREEN`
- `VOID_MAINNET0_PUBLIC_NODE_OPERATOR_PREFLIGHT_CHECKLIST_INDEX_LINK_HOLD_V1_GREEN`

## Public status

Status: `chain_rollup_hold`

This is a read-only rollup. It does not create registration, submission, staking, wallet connection, validator activation, peer-state writes, validator-set writes, ledger writes, or public mutation authority.

## Boundary

The following remain false:

- `registration_enabled`
- `checklist_submission_enabled`
- `validator_admission_enabled`
- `validator_activation_enabled`
- `staking_enabled`
- `wallet_connect_enabled`
- `public_mutation_enabled`
- `ledger_write_enabled`
- `peer_state_write_enabled`
- `validator_set_write_enabled`

## Final marker

`VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_CHAIN_ROLLUP_HOLD_V1_GREEN`
