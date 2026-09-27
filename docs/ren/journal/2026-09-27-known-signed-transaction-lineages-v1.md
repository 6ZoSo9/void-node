# 2026-09-27 — Known Signed Transaction Lineages V1

Marker: `VOID_REN_EPOCH2_KNOWN_SIGNED_TRANSACTION_LINEAGES_V1`

## Canonical base

`ae72c8e9cf90edc7c1fc0ee3ad5da3d708b95d04`

## Why this lane exists

Exact frozen nonce continuity already proves the known retained deployment raw
transaction is stale, but the migration replay wall correctly refuses to infer
that every possible off-repo signed transaction has been censused.

A repository evidence sweep identified three distinct canonical signed
Chain-2050 transaction lineages:

- role-authority deployment: nonce 0 -> frozen signer nonce 1;
- sovereign-owner gas funding: nonce 129 -> frozen signer nonce 130;
- sovereign genesis registry append: nonce 0 -> frozen signer nonce 1.

All three are included by the block-37392 freeze and stale under exact nonce
continuity.

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
