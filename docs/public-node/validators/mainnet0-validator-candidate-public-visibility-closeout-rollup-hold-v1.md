# Mainnet-0 Validator Candidate Public Visibility Closeout Rollup Hold v1

Marker: `VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CLOSEOUT_ROLLUP_HOLD_V1`

## Status

Hold. Public-safe. Read-only. Closeout rollup only.

## Purpose

This brick closes out the current Mainnet-0 validator candidate public visibility chain.

It binds:

- visibility index marker: `VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_INDEX_HOLD_V1`
- HTML card marker: `VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_HTML_CARD_HOLD_V1`
- runtime visibility marker: `VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1`

## Routes

- `/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-hold-v1.json`
- `/public-node/validators/mainnet0-validator-candidate-public-visibility-index-hold-v1.json`
- `/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-hold-v1.html`
- `/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-hold-v1.json`
- `/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-runtime-visibility-hold-v1.json`

## Boundary

This is public-safe read-only closeout metadata only.

It does not enable public validator submit, stake lock, wallet connect, candidate registration, candidate intake, active admission, epoch activation, validator-set writes, validator runtime truth writes, runtime mutation routes, or mutation handlers.
