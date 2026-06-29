# Mainnet-0 Public Node Operator Preflight Checklist Hold v1

Marker: `VOID_MAINNET0_PUBLIC_NODE_OPERATOR_PREFLIGHT_CHECKLIST_HOLD_V1_GREEN`

## Purpose

This document defines a public, read-only preflight checklist for prospective VOID Mainnet-0 public node operators.

It turns the operator readiness matrix into practical self-check items without opening any live action path.

This is not node registration.  
This is not validator admission.  
This is not validator activation.  
This is not staking.  
This is not wallet connection.  
This is not public mutation authority.  
This is not a peer-state write.  
This is not a validator-set write.

## Source matrix

- Matrix lane: `mainnet0-public-node-operator-readiness-matrix-hold-v1`
- Matrix marker: `VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_MATRIX_HOLD_V1_GREEN`

## Public status

Status: `preflight_checklist_hold`

Meaning: operators may read the checklist and prepare, but there is no submit button, no registration form, no wallet flow, no stake flow, and no network mutation.

## Checklist categories

1. Repository/source verification
2. Machine stability
3. Operating system hygiene
4. Runtime dependency readiness
5. Firewall/router review
6. Public reachability plan
7. DataNet storage plan
8. Backup and restore plan
9. Uptime and power plan
10. Logs and monitoring plan
11. Secrets boundary
12. Validator separation
13. Wallet and funding boundary
14. Operator acknowledgement

## Authority boundary

The following remain false:

- `registration_enabled`
- `validator_activation_enabled`
- `staking_enabled`
- `wallet_connect_enabled`
- `public_mutation_enabled`
- `ledger_write_enabled`
- `peer_state_write_enabled`
- `validator_set_write_enabled`
- `submit_enabled`

## Final marker

`VOID_MAINNET0_PUBLIC_NODE_OPERATOR_PREFLIGHT_CHECKLIST_HOLD_V1_GREEN`
