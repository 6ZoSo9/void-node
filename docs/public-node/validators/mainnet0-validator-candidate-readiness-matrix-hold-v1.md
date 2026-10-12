# Mainnet-0 validator candidate readiness matrix hold v1

Marker: `VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HOLD_V1`

## Summary

This brick defines a public-safe, read-only readiness matrix for future Mainnet-0 validator candidate review.

It does not open candidate registration, candidate intake, public submit, stake locking, wallet connect, active validator admission, epoch activation, validator-set writes, or runtime mutation.

Route:

`/public-node/validators/mainnet0-validator-candidate-readiness-matrix-hold-v1.json`

Source previous lane final seal:

`/public-node/mainnet0-validator-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-root-link-final-seal-hold-v1.json`

## Policy reference

Minimum public candidate stake policy reference: `10000 VOID`

This is a policy reference only. This brick does not create a stake lock, wallet flow, submit form, transaction, candidate registration, or validator-set write.

## Matrix item count

`8`

## Boundary

Public-safe, read-only candidate readiness matrix only.

No public validator submit. No candidate registration or intake. No stake lock. No wallet connect. No active validator admission. No epoch activation. No validator-set write. No validator runtime truth write. No runtime mutation route or mutation handler.
