# 2026-09-27 — Explicit Raw Transaction Inspector V1

Marker: `VOID_REN_EPOCH2_EXPLICIT_RAW_TRANSACTION_INSPECTOR_V1`

## Canonical base

`c26249e26af9a84346ae297181d3e6d564edea72`

That main includes the 20-lineage repository baseline and bounded metadata-only
signed-artifact census preparation.

## Next replay step

The metadata census intentionally avoids file contents. Its next gate requires
operator review followed by exact inspection of individually approved raw signed
transaction artifacts.

This branch supplies that inspector.

## Boundary

One explicitly named file may be read. No directory scan occurs.

The inspector decodes the signed transaction, recovers exact Chain-2050 signer,
nonce and hash, compares against the canonical lineage registry and frozen nonce
census, and classifies whether replay staleness is actually proven.

Unknown hashes with a recovered nonce strictly below the signer's frozen final
nonce can be proved stale. Unknown hashes at/above the frozen nonce, and signers
absent from the nonzero nonce census, remain replay-relevant.

Raw transaction bytes are never persisted to the receipt.

## Non-promotion

No individual inspection closes the global replay wall. The tool always keeps:

- `pending_legacy_signed_transaction_census_complete=false`;
- `privileged_signer_nonce_or_key_replay_fence_proven=false`;
- `cross_epoch_replay_protection_proven=false`.

No RPC, wallet/key access, signing, broadcast, chain write, migration,
activation, token movement or funds movement is performed.

`PROTECT THE CORE`. `PROTECT THE TRUTH`.
