# Epoch-2 source/document raw transaction sweep v1

Marker: `VOID_ECONOMIC_EPOCH2_SOURCE_DOCUMENT_RAW_TRANSACTION_SWEEP_V1`

This tool closes the source/document routing lane left by the metadata review.

The metadata review deliberately classified source/document-looking filenames as
routing hints only. This sweep is bound to one exact private Precision census
receipt stamp and reads only candidate paths that:

- were marked `candidate_name_hint=true` by that census;
- were routed as source/document-looking rather than TXT, JSON, or ZIP; and
- have an allowlisted text extension.

Allowlisted text extensions are:

```text
.ts .tsx .js .jsx .mjs .cjs
.md .yml .yaml .sh .py
.sha256 .html .example
```

For every selected source/document candidate the tool:

1. rejects symlink ancestors;
2. requires a direct current-user-owned regular file;
3. requires the current byte size to equal the census-recorded byte size;
4. bounds each file to 2 MiB and the entire sweep to 128 MiB;
5. requires valid UTF-8 text;
6. finds contiguous canonical `0x...` hex literals with at least 160 hex digits;
7. attempts EVM transaction decoding without printing the literal;
8. keeps only signed Chain-2050 transactions;
9. classifies each through the existing Epoch-2 explicit raw-transaction
   classifier and frozen nonce evidence.

Output contains file SHA-256 values and safe transaction-derived metadata only.
Raw transaction literals and unrelated source/document contents are never
printed or persisted.

The sweep is content-complete only for the exact receipt-bound
source/document candidate set. It does not by itself close reviewed ZIP entry
identity, focused JSON/TXT/container review, or the global replay gates.

Usage:

```bash
node tools/void-economic-epoch2-source-document-raw-transaction-sweep-v1.mjs \
  --receipt-dir "$HOME/Downloads" \
  --stamp 20260928T162432Z \
  --apply \
  --confirmation scanApprovedVoidSourceDocumentCandidates
```

Every run retains:

```text
raw_transaction_printed=false
raw_transaction_persisted=false
transaction_submission=false
transaction_broadcast=false
authoritative_chain2050_write=false
pending_legacy_signed_transaction_census_complete=false
privileged_signer_nonce_or_key_replay_fence_proven=false
cross_epoch_replay_protection_proven=false
```

No RPC, signing, wallet/private-key access, Chain-2050 write, token/funds
movement, migration, public activation, or replay-gate promotion is authorized.
