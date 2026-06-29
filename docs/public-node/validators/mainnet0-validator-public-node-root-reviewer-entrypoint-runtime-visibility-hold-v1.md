# Mainnet-0 Validator Public Node Root Reviewer Entrypoint Runtime Visibility Hold v1

Marker: `VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_REVIEWER_ENTRYPOINT_RUNTIME_VISIBILITY_HOLD_V1`

## Status

Hold. Public-safe. Read-only. Runtime visibility metadata only.

## Purpose

This brick records that the public node root reviewer entrypoint points to the static Mainnet-0 validator reviewer final seal HTML card.

It binds:

- root entrypoint polish marker: `VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_REVIEWER_ENTRYPOINT_POLISH_HOLD_V1`
- reviewer final seal HTML marker: `VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_REVIEWER_FINAL_SEAL_HTML_CARD_HOLD_V1`
- reviewer final seal HTML runtime visibility marker: `VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_REVIEWER_FINAL_SEAL_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1`

## Routes

- `/public-node/validators/mainnet0-validator-public-node-root-reviewer-entrypoint-runtime-visibility-hold-v1.json`
- `/public-node/validators/mainnet0-validator-public-node-root-reviewer-entrypoint-polish-hold-v1.json`
- `/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-hold-v1.html`
- `/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-runtime-visibility-hold-v1.json`

## Boundary

This is runtime visibility metadata for a static root reviewer entrypoint only.

It does not enable public validator submit, stake lock, wallet connect, candidate registration, candidate intake, active admission, epoch activation, validator-set writes, validator runtime truth writes, runtime mutation routes, or mutation handlers.
