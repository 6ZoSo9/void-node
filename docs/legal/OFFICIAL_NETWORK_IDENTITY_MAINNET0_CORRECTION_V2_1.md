# VOID Official Network Identity Mainnet-0 Correction V2.1

`VOID_OFFICIAL_NETWORK_IDENTITY_MAINNET0_CORRECTION_V2_1`

SPDX-License-Identifier: VCL-1.0

## Purpose

The original V1 identity manifest copied `genesis.json.networkName` directly into
the public `network_name` field. The immutable genesis label is `VOID-DEV`, but
the repository's operational policy identifies Mainnet-0 as the canonical public
network.

V2.1 separates those two facts:

- official public network name: `VOID Mainnet-0`;
- immutable legacy genesis network label: `VOID-DEV`;
- chain ID: `2050`;
- exact genesis SHA-256: unchanged.

`genesis.json` is not renamed or rewritten.

## Superseded payload

The following unsigned payload must never be signed or transferred:

`b624f7bb029e5b3eca8b2e14050711d4f764d2d39bba56455f1f94697de2708e`

It was generated before the public and legacy network names were separated.

## Replacement-payload requirements

The corrected payload must bind to:

- the V1 merge commit and exact-green checkpoint;
- the V2 merge commit and exact-green checkpoint;
- the V2.1 correction merge commit and exact-green checkpoint;
- the exact preparation-tool SHA-256;
- the corrected identity-manifest canonical SHA-256;
- the superseded payload SHA-256.

Preparation remains public-only. The offline signer and verifier accept only the
corrected V2.1 payload schema and reject the superseded V2 payload. Key generation
and signing remain offline and must not occur until V2.1 is merged and sealed.
