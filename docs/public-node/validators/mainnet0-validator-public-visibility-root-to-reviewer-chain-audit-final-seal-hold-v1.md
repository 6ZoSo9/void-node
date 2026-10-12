# Mainnet-0 Validator Public Visibility Root-to-Reviewer Chain Audit Final Seal Hold v1

Marker: `VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_FINAL_SEAL_HOLD_V1`

## Status

Hold. Public-safe. Read-only. Final seal only.

## Purpose

This brick seals the Mainnet-0 validator public visibility root-to-reviewer audit chain.

It binds:

- audit rollup marker: `VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_ROLLUP_HOLD_V1`
- audit HTML card marker: `VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_ROLLUP_HTML_CARD_HOLD_V1`
- audit HTML runtime visibility marker: `VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_ROLLUP_HTML_RUNTIME_VISIBILITY_HOLD_V1`

## Routes

- `/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-hold-v1.json`
- `/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-hold-v1.json`
- `/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-html-card-hold-v1.html`
- `/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-html-card-hold-v1.json`
- `/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-html-runtime-visibility-hold-v1.json`

## Boundary

This is static public audit final-seal metadata only.

It does not enable public validator submit, stake lock, wallet connect, candidate registration, candidate intake, active admission, epoch activation, validator-set writes, validator runtime truth writes, runtime mutation routes, or mutation handlers.
