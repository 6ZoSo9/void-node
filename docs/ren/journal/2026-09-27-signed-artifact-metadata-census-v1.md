# 2026-09-27 — Signed Artifact Metadata Census V1

Marker: `VOID_REN_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1`

## Canonical base

`c805b6822a119bebdf756b59bf3f319df5dd8704`

That base includes the reviewed 20-lineage Chain-2050 repository evidence
baseline from #1929.

## Selected next step

The global pending-signed-transaction census cannot be closed from repository
evidence alone. Additional raw signed artifacts may exist on operator storage.

The next safe step is metadata-only discovery, not a broad content scan.

## Source contract

The new tool:

- requires explicit operator paths;
- forbids root/home/whole-Downloads directory scans;
- requires scanned roots to be VOID-named/owned;
- supports individually explicit files outside those roots;
- rejects symlink roots, ancestors and descendants;
- bounds roots, explicit files, depth and discovered file count;
- records metadata and filename-only hints only; and
- contains no scanned-file content-read primitive.

The output is a private create-once `0600` local receipt.

## Non-promotion

This preparation lane keeps:

- `pending_legacy_signed_transaction_census_complete=false`;
- `privileged_signer_nonce_or_key_replay_fence_proven=false`;
- `cross_epoch_replay_protection_proven=false`.

The next gate is human review of the metadata receipt and explicit selection of
candidate raw transaction files for a separate exact inspector.

No credential/key content, signer, transaction, Chain-2050 write, activation or
funds authority is granted.

`PROTECT THE CORE`. `PROTECT THE TRUTH`.
