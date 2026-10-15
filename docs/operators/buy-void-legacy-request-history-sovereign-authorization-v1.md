# Buy VOID legacy request-history Sovereign authorization v1

Marker: `VOID_BUY_VOID_LEGACY_HISTORY_SOVEREIGN_AUTHORIZATION_V1`.

Status: **source-only signature gate; external witness still required**.

## Purpose

The merged legacy request-history disposition candidate deliberately stops before
acceptance. This successor verifies the first missing authority without changing
that separation.

A valid authorization binds:

- one exact content-addressed `voidblrhdc1_` disposition candidate;
- the canonical SHA-256 of the complete candidate object;
- the candidate decision, operator ID and review timestamp;
- Chain ID 2050;
- an authorization issue time that cannot predate the candidate review;
- signer role `SovereignPrimaryGovernanceAttestation`;
- Ed25519;
- the existing Sovereign Primary governance-attestation key fingerprint:

`23e2d92ebeb1d4b025eeb2a76f65b7f8ff6e6cc091f542e202569c9d5abbbd30`.

The verifier rederives the candidate ID instead of trusting a caller-provided
summary.

## Key separation

The private key is not present in this repository and is not used in CI.
Production verification calls the existing VOID Ed25519
fingerprint-verification primitive with the fixed Sovereign Primary fingerprint.

The proof uses a generated test key only through explicitly test-only functions
that require an injected fingerprint. The production builder/verifier never
accepts an injected production fingerprint.

## Two-stage acceptance

A valid signature advances only to:

`SOVEREIGN_SIGNATURE_VERIFIED_EXTERNAL_WITNESS_REQUIRED`

It does **not** make the legacy history disposition accepted.

The next independent gate must persist the exact signed authorization into an
independently controlled external witness and prove that witness identity,
append durability and readback. Only a later composition may set:

- `external_witness_verified=true`;
- `historical_request_history_disposition_accepted=true`;
- any stable-root genesis/apply eligibility.

This source lane therefore retains:

`external_witness_verified=false`

`historical_request_history_disposition_accepted=false`

`stable_root_apply_authorized=false`

`payment_acceptance=false`

`public_presale_activation=false`

`funds_movement=false`

No private-key access, signing ceremony, Nimo contact, filesystem/service
mutation, request/payment content read, transaction, WC/presale activation or
funds movement occurs in this PR.

PROTECT THE CORE.
