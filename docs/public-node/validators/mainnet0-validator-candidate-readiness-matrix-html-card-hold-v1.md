# Mainnet-0 validator candidate readiness matrix HTML card hold v1

Marker: `VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_CARD_HOLD_V1`

## Summary

This brick adds a browser-visible static HTML card for the Mainnet-0 validator candidate readiness matrix.

HTML route:

`/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-card-hold-v1.html`

Metadata route:

`/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-card-hold-v1.json`

Source matrix route:

`/public-node/validators/mainnet0-validator-candidate-readiness-matrix-hold-v1.json`

## Policy reference

Minimum public candidate stake policy reference: `10000 VOID`

This is a policy reference only. This brick does not create a stake lock, wallet flow, submit form, transaction, candidate registration, or validator-set write.

## Boundary

Public-safe, read-only static HTML candidate readiness visibility only.

No public validator submit. No candidate registration or intake. No stake lock. No wallet connect. No active validator admission. No epoch activation. No validator-set write. No validator runtime truth write. No runtime mutation route or mutation handler.
