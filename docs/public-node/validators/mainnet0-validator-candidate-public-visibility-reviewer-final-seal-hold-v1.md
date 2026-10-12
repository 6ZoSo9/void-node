# Mainnet-0 Validator Candidate Public Visibility Reviewer Final Seal Hold v1

Marker: `VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_REVIEWER_FINAL_SEAL_HOLD_V1`

## Status

Hold. Public-safe. Read-only. Reviewer final seal only.

## Purpose

This brick adds a reviewer final seal for the current Mainnet-0 validator candidate public visibility lane.

It binds the public visibility index, browser-visible HTML card, runtime visibility metadata, closeout rollup, closeout rollup HTML card, and closeout rollup HTML runtime visibility record.

## Routes

- `/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-hold-v1.json`
- `/public-node/validators/mainnet0-validator-candidate-public-visibility-index-hold-v1.json`
- `/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-hold-v1.html`
- `/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-runtime-visibility-hold-v1.json`
- `/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-hold-v1.json`
- `/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-hold-v1.html`
- `/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-runtime-visibility-hold-v1.json`

## Boundary

This is public-safe read-only reviewer final seal metadata only.

It does not enable public validator submit, stake lock, wallet connect, candidate registration, candidate intake, active admission, epoch activation, validator-set writes, validator runtime truth writes, runtime mutation routes, or mutation handlers.
