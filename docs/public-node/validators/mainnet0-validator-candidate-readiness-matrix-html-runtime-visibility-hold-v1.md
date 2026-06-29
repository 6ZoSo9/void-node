# Mainnet-0 Validator Candidate Readiness Matrix HTML Runtime Visibility Hold v1

Marker: `VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_RUNTIME_VISIBILITY_HOLD_V1`

## Summary

This brick adds a public-safe runtime visibility metadata record for the browser-visible Mainnet-0 validator candidate readiness matrix HTML card.

It binds:

- source matrix marker: `VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HOLD_V1`
- source matrix route: `/public-node/validators/mainnet0-validator-candidate-readiness-matrix-hold-v1.json`
- source HTML card marker: `VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_CARD_HOLD_V1`
- source HTML card route: `/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-card-hold-v1.html`
- runtime visibility route: `/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-hold-v1.json`

## Boundary

This is read-only static visibility metadata only.

It does not open public validator submit, candidate registration, candidate intake, stake locking, wallet connect, active validator admission, epoch activation, validator-set writes, validator runtime truth writes, or runtime mutation routes.
