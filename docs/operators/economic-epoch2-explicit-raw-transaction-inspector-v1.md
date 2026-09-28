# Epoch-2 explicit raw transaction inspector v1

Marker: `VOID_ECONOMIC_EPOCH2_EXPLICIT_RAW_TRANSACTION_INSPECTOR_V1`

Status: source-only operator inspection tool. It does not complete the global
legacy signed-transaction census.

## Purpose

The metadata census intentionally does not open candidate files. After the
operator reviews that private metadata receipt, this tool is the next bounded
step for one individually approved raw signed transaction file.

It reads only the exact `--file` supplied by the operator.

## Exact inspection

For one approved file the inspector:

1. rejects symlink paths and requires a direct operator-owned regular file;
2. bounds file size before reading;
3. requires a canonical 0x-prefixed signed transaction;
4. decodes it with ethers;
5. recovers the signer, chain ID, nonce, transaction type and hash;
6. requires Chain ID 2050;
7. compares the hash to the canonical 20-lineage repository baseline;
8. compares recovered signer/nonce to the frozen epoch-1 nonzero nonce census;
9. classifies replay staleness conservatively; and
10. writes a private create-once mode-0600 receipt that does **not** persist the
   raw signed transaction.

## Classification

`KNOWN_LINEAGE_STALE`

: Canonical lineage evidence already proves the exact transaction stale.

`KNOWN_LINEAGE_STALE_BY_RECOVERED_NONCE`

: A known lineage was not already marked stale, but the exact recovered nonce is
strictly below the signer's frozen final epoch-1 nonce.

`UNKNOWN_HASH_STALE_BY_RECOVERED_NONCE`

: The hash is not in the repository baseline, but its exact recovered signer and
nonce prove it stale under frozen nonce continuity.

`KNOWN_SUPERSEDED_REPLAY_STALENESS_UNPROVEN`

: The hash is known as superseded recovery history, but replay staleness itself
is not yet proven.

`KNOWN_LINEAGE_REPLAY_REVIEW_REQUIRED`

: The hash is known, but current evidence does not prove it stale.

`UNKNOWN_HASH_REPLAY_RELEVANT`

: The hash is unknown and its nonce is not proven below a known frozen final
nonce. This includes signers absent from the nonzero nonce census.

A nonce equal to the frozen final nonce is **not** stale and remains
replay-relevant.

## Non-promotion

Every receipt keeps:

```text
pending_legacy_signed_transaction_census_complete=false
privileged_signer_nonce_or_key_replay_fence_proven=false
cross_epoch_replay_protection_proven=false
migration_authorized=false
public_activation_authorized=false
```

Inspecting one candidate cannot close a global census.

## Usage

Plan:

```bash
node tools/void-economic-epoch2-explicit-raw-transaction-inspector-v1.mjs
```

Inspect one operator-approved file:

```bash
node tools/void-economic-epoch2-explicit-raw-transaction-inspector-v1.mjs \
  --file /absolute/path/to/approved-signed-transaction.txt \
  --out /absolute/path/to/private-inspection-receipt.json \
  --apply \
  --confirmation inspectApprovedVoidSignedTransaction
```

Do not pass private-key, mnemonic, keystore or credential files. This tool is
only for raw signed transaction artifacts selected after metadata review.

## Authority boundary

The inspector has no filesystem scan, RPC, signer, wallet, private-key,
transaction construction, transaction signing, transaction submission,
transaction broadcast, Chain-2050 write, replay-gate promotion, token movement
or funds movement authority.
