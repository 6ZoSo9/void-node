# Epoch-2 public VOID state-root anchor payload v1

Marker: `VOID_ECONOMIC_EPOCH2_PUBLIC_VOID_STATE_ROOT_ANCHOR_V1`

Status: source-ready anchor payload; Chain-2050 commitment pending.

## Purpose

The epoch-2 client-neutral state manifest is now publicly retrievable, but the
successor state root is not yet anchored into the public VOID truth layer.

This lane prepares one exact immutable payload for the existing
`DatanetContentCommitmentRegistryV1` rather than introducing another contract
or ledger.

Canonical object ID:

`void:economic:epoch2:successor-state-root:v1`

Object-ID SHA-256:

`fa6a4ff9a7a25b8ec1888c58d7eb49159a69d84a4021b1365fe1293e868f1f51`

Exact payload path:

`public/public-node/evidence/economic-epoch2-public-void-state-root-anchor-v1.json`

Exact payload SHA-256:

`e0d6cff588a13315f7a63ff246895440b2d2faf858d8f228912a508ffa88f4d4`

Exact byte length:

`3203`

## Bound economic state

The payload binds the reviewed Besu epoch-2 identity:

- chain ID: `2050`;
- execution epoch: `2`;
- client: Besu `26.8.1`;
- genesis block hash:
  `0x59ef190bdbd42268a497edca4237446665deb0f1fa98f54ac85ed461bdd282a7`;
- genesis state root:
  `0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b`;
- canonical VoidToken:
  `0x470075b85352eb86f7d089fb9ba88945f12aad94`;
- total supply:
  `333333333000000000000000000` atoms;
- economic account count: `4`;
- verified storage entries: `1268`.

It also binds the exact public state-manifest file/material hashes and the
content-addressed public migration-manifest material hash.

## Chain-2050 anchor mechanism

The existing append-only registry accepts:

`commit(bytes32 objectIdSha256, bytes32 contentSha256, uint64 byteLength)`

The future live tuple for this payload is therefore:

- object ID SHA-256:
  `fa6a4ff9a7a25b8ec1888c58d7eb49159a69d84a4021b1365fe1293e868f1f51`;
- content SHA-256:
  `e0d6cff588a13315f7a63ff246895440b2d2faf858d8f228912a508ffa88f4d4`;
- byte length: `3203`.

A successful transaction is not sufficient by itself. The existing commitment
pipeline must also establish finalized receipt/event membership and canonical
truth admission under `mainnet0-checkpoint-finality-v1`.

Only after that exact commitment is admitted as canonical Chain-2050 truth may
the current successor candidate promote:

`successor_state_root_public_void_anchor_ready=true`

## Current boundary

This source lane does not close that gate. It keeps:

- `successor_state_root_public_void_anchor_ready=false`;
- `public_balance_receipt_code_verification_ready=false`;
- migration authorization false;
- public activation false;
- transaction construction/signing/submission/broadcast false;
- Chain-2050 write authority false; and
- token/funds movement false.

The next live step must use the existing reviewed DataNet commitment sequence.
No automatic retry is authorized.
