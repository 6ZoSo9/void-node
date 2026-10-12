# Epoch-2 container raw transaction inspector v1

Marker: `VOID_ECONOMIC_EPOCH2_CONTAINER_RAW_TRANSACTION_INSPECTOR_V1`

This tool is the bounded follow-up for an operator-approved JSON container whose
structure review identified one top-level raw signed transaction field.

It supports exactly two allowlisted fields:

- `signed_transaction`
- `signed_serialized_hex`

The tool reads one exact current-user-owned non-symlink JSON file, extracts only
the selected top-level field in memory, and passes that string to the existing
Epoch-2 explicit raw transaction classifier.

The classifier:

- requires a canonical signed EVM transaction;
- requires Chain ID 2050;
- recovers signer, nonce, type, and transaction hash;
- compares the hash to the canonical known-lineage registry;
- compares signer/nonce to the frozen epoch-1 nonce census;
- conservatively determines replay staleness.

The known-lineage registry and frozen nonce census are bound by their exact Git
blob SHA-1 identities before classification.

The raw transaction is never printed and never persisted. Output contains only
safe derived metadata such as:

- container SHA-256;
- raw-field SHA-256;
- raw string length;
- transaction hash;
- signer address;
- nonce;
- known-lineage ID;
- replay-staleness classification.

Apply mode requires:

```text
inspectApprovedVoidContainerRawTransaction
```

Example:

```bash
node tools/void-economic-epoch2-container-raw-transaction-inspector-v1.mjs \
  --file /absolute/path/to/approved-container.json \
  --field signed_transaction \
  --apply \
  --confirmation inspectApprovedVoidContainerRawTransaction
```

This tool has no RPC, signer, wallet, private-key, transaction construction,
transaction signing, submission, broadcast, Chain-2050 write, token movement,
funds movement, migration, activation, or replay-gate promotion authority.

Every result retains:

```text
pending_legacy_signed_transaction_census_complete=false
privileged_signer_nonce_or_key_replay_fence_proven=false
cross_epoch_replay_protection_proven=false
```
