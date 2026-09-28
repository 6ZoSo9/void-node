# Epoch-2 signed-artifact candidate metadata review v1

Marker: `VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_CANDIDATE_METADATA_REVIEW_V1`

This is the operator-review bridge between the metadata census and the existing
exact raw-transaction inspector.

It reads only the private metadata census receipts for one exact timestamped
Precision run. It does **not** open or read any candidate file.

For each filename-hint candidate it reuses the already-recorded receipt fields:

- absolute path;
- basename;
- file size;
- discovery source.

The review groups names into four routing classes:

- `direct_text_candidate` — text-named artifact requiring operator selection
  before exact raw-transaction inspection;
- `structured_json_candidate` — structured container requiring separate review,
  not direct raw-transaction inspection;
- `archive_candidate` — archive/container requiring separate review;
- `source_or_document_name` — source/document/proof-looking filename.

These classes are routing hints only. They do not prove a file safe or stale and
do not complete the signed-transaction census.

The command prints only the focused non-source/document candidates by exact path
and retains:

```text
candidate_file_content_read=false
pending_legacy_signed_transaction_census_complete=false
privileged_signer_nonce_or_key_replay_fence_proven=false
cross_epoch_replay_protection_proven=false
```

Usage:

```bash
node tools/void-economic-epoch2-signed-artifact-candidate-metadata-review-v1.mjs \
  --receipt-dir "$HOME/Downloads" \
  --stamp 20260928T162432Z \
  --apply \
  --confirmation reviewVoidSignedArtifactCandidateMetadata
```

Only an individually reviewed file that is expected to contain exactly one
canonical `0x...` signed Chain-2050 transaction should be passed to the
existing explicit raw-transaction inspector. JSON, ZIP, credential, mnemonic,
keystore, wallet, or private-key containers must not be sent to that inspector.

No RPC, signing, broadcast, Chain-2050 write, replay-gate promotion, migration,
activation, token movement, or funds movement is authorized.
