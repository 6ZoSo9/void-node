# Mainnet-0 Validator Public Visibility Root-to-Reviewer Chain Audit Rollup Hold v1

Marker: `VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_ROLLUP_HOLD_V1`

## Status

Hold. Public-safe. Read-only. Audit rollup only.

## Purpose

This brick audits the sealed Mainnet-0 validator public visibility chain from the public-node root index down to the reviewer-facing final seal surfaces.

Preferred reviewer entrypoint:

- `/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-hold-v1.html`

## Audit scope

This audit binds:

- root public-node index
- validators section index
- validator visibility index
- validator visibility HTML card and runtime visibility
- closeout rollup, closeout HTML, and runtime visibility
- reviewer final seal, reviewer final seal HTML, and runtime visibility
- chain closeout discovery polish
- root reviewer entrypoint polish and runtime visibility

## Boundary

This is static public audit metadata only.

It does not enable public validator submit, stake lock, wallet connect, candidate registration, candidate intake, active admission, epoch activation, validator-set writes, validator runtime truth writes, runtime mutation routes, or mutation handlers.
