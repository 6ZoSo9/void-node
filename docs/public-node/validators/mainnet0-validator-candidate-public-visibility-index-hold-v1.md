# Mainnet-0 Validator Candidate Public Visibility Index Hold v1

Marker: `VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_INDEX_HOLD_V1`

## Status

Hold. Public-safe. Read-only. Visibility only.

## Purpose

This brick adds a public-node validators section and a static validator candidate visibility record.

It makes the Mainnet-0 validator posture discoverable without opening registration, stake locking, validator admission, activation, runtime mutation, wallet access, signer access, or validator-set writes.

## Public posture

- Minimum validator self-stake remains 10,000 VOID.
- Public validator registration does not equal active validator admission.
- Candidate/waiting visibility is separate from active validator runtime truth.
- Active admission requires an explicit epoch/operator/governance activation step.
- Public visibility must not change active validator count.
- Public visibility must not mutate validator runtime truth.

## Source policy documents

- `docs/mainnet0/validator-registration-waiting-pool-v1.md`
- `docs/mainnet0/VALIDATOR_POLICY.md`
- `docs/MAINNET0_VALIDATOR_ADMISSION_RUNBOOK.md`
- `docs/MAINNET0_VALIDATOR_ADMISSION_CHECKLIST.md`
- `docs/MAINNET0_VALIDATOR_STATUS_RECORD_TEMPLATE.md`

## Public routes

- `/public-node/validators/index.json`
- `/public-node/validators/mainnet0-validator-candidate-public-visibility-index-hold-v1.json`

## Non-enablements

This brick does not enable:

- public validator submit
- stake lock
- wallet connect
- candidate intake
- candidate registration
- active admission
- activation
- epoch mutation
- runtime mutation route
- mutation handler
- signer access
- validator-set write
- validator runtime truth write

## Boundary

This is static public discovery metadata only.
