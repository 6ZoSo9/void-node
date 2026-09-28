# Epoch-2 public VOID state-root anchor preparation v1

Marker: `VOID_EPOCH2_PUBLIC_VOID_STATE_ROOT_ANCHOR_PREPARATION_V1`

## Decision

Reuse the existing append-only `DatanetContentCommitmentRegistryV1` for the
epoch-2 economic state-root anchor. Do not introduce a second registry or a
parallel ledger.

The canonical public payload is:

`public/public-node/evidence/economic-epoch2-public-void-state-root-anchor-v1.json`

It binds the reviewed Besu genesis block hash/state root, canonical VoidToken
identity and supply, the exact public state-manifest hashes, and the
content-addressed migration evidence.

Canonical commitment tuple:

- object ID: `void:economic:epoch2:successor-state-root:v1`
- object-ID SHA-256:
  `fa6a4ff9a7a25b8ec1888c58d7eb49159a69d84a4021b1365fe1293e868f1f51`
- payload SHA-256:
  `e0d6cff588a13315f7a63ff246895440b2d2faf858d8f228912a508ffa88f4d4`
- byte length: `3203`
- accepted checkpoint policy: `mainnet0-checkpoint-finality-v1`

## Truth boundary

This preparation does not claim the tuple exists on Chain-2050.

`successor_state_root_public_void_anchor_ready=false`

remains authoritative until the existing commitment pipeline proves all of:

1. exact tuple submission;
2. finalized receipt under accepted-checkpoint policy;
3. exact `ContentCommitted` event membership; and
4. canonical commitment truth admission for the same object/content/length.

No signer, wallet, transaction, Chain-2050 write, migration, activation, token
movement, or funds authority is granted by this lane.

Memory for context. Repo for truth. Brood journal for continuity.
