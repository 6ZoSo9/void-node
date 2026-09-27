# 2026-09-27 — Known Signed Transaction Lineages V1

Marker: `VOID_REN_EPOCH2_KNOWN_SIGNED_TRANSACTION_LINEAGES_V1`

## Canonical base

`ae72c8e9cf90edc7c1fc0ee3ad5da3d708b95d04`

## Why this lane exists

Exact frozen nonce continuity already proves the known retained deployment raw
transaction is stale, but the migration replay wall correctly refuses to infer
that every possible off-repo signed transaction has been censused.

A repository evidence sweep now binds eight distinct reviewed signed
Chain-2050 transaction lineages:

- confirmed Buy VOID delivery at block 37370;
- Buy VOID fulfillment deployment at block 37373;
- Buy VOID treasury send-to-ops at block 37376;
- Buy VOID ops spend to fulfillment at block 37377;
- role-authority deployer gas funding at block 37378;
- role-authority deployment at block 37379;
- sovereign-owner gas funding at block 37391; and
- sovereign genesis registry append at block 37392.

All eight are included by the block-37392 freeze and stale under exact nonce
continuity. Missing signer/nonces are deliberately left null rather than
inferred.

The proof recursively sweeps reviewed signed-transaction evidence locations
under `ops/mainnet0/**/*.json`: canonical `signed_transaction_hash` fields,
three exact funding-hash locations, three exact Buy VOID
`transaction_hash` paths, and one exact selector
`delivery_transaction_hash` path. The resulting distinct set must equal the
eight registry hashes exactly.

## Boundary

The registry is a baseline for the later operator census, not the census
completion itself.

It keeps:

- `pending_legacy_signed_transaction_census_complete=false`;
- `privileged_signer_nonce_or_key_replay_fence_proven=false`;
- `cross_epoch_replay_protection_proven=false`.

No arbitrary filesystem scan, credential read, wallet/key access, signing,
broadcast, chain write, migration, activation, or funds movement occurs.

`PROTECT THE CORE`. `PROTECT THE TRUTH`.
