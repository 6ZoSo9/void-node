# Epoch-2 full signed-artifact content sweep v1

Marker: `VOID_ECONOMIC_EPOCH2_FULL_SIGNED_ARTIFACT_CONTENT_SWEEP_V1`

This is the filename-independent closeout scan for the exact private Precision
metadata-census receipt set.

The earlier candidate review intentionally treated filename hints as routing
convenience only. A clean 171-hint review therefore does not, by itself, prove
that the 53,670 discovered regular files contain no additional retained signed
Chain-2050 transaction.

## Exact scope

The tool consumes the exact timestamped private census receipts and:

- reconstitutes every discovered regular-file row;
- validates current-user ownership and exact byte-size continuity;
- expands each prior depth-boundary subtree under a separate depth/file bound;
- resolves symlink descendants only to determine whether they alias an already
  approved scanned regular file;
- rejects broken or external symlink targets;
- retains the canonical generated dependency/cache exclusions;
- refuses credential/key-looking paths before broad content reads;
- bounds ordinary scanned files to 64 MiB and the aggregate scanned content to 4 GiB;
- permits an oversized `.safetensors` file only when its bounded header parses as a valid safetensors tensor index, tensor byte lengths match dtype × shape, tensor data offsets are contiguous and cover the entire payload, and the file remains within the separate 64 GiB model-artifact ceiling. Only the header is inspected for transaction literals; tensor payload bytes are not read.

Generated/cache directories remain out of signed-artifact scope because they are
dependency/cache material, not controlled operator artifact stores. Their
contents are not read.

Validated safetensors tensor payloads are likewise treated as model-weight
material rather than signed-transaction artifact storage. This is not a generic
large-file exemption: an oversized non-safetensors file still HOLDs, and a
malformed or structurally inconsistent safetensors file HOLDs. The safetensors
JSON header is bounded, parsed, and scanned for transaction literals before the
tensor payload is excluded.

## Content detection

For each approved regular file the tool detects both:

1. textual canonical `0x...` serialized transaction candidates; and
2. binary legacy-RLP / typed-transaction envelopes embedded directly in bytes.

A candidate is retained only when `ethers.Transaction.from` decodes a signed
transaction on Chain ID 2050.

Every retained transaction is classified through the already-reviewed Epoch-2
explicit raw-transaction inspector against:

- the canonical known signed-transaction lineage registry; and
- the frozen epoch-1 nonce census.

Raw transaction bytes are never printed and never persisted.

The output includes a compact SHA-256 manifest binding every scanned file by
path hash, byte length, and file SHA-256.

## Sensitive-path fail-closed rule

The tool does not read files whose path suggests key or credential material,
including common key/keystore/wallet/seed formats or directories. If any such
path exists in the exact census scope, the run HOLDs before broad content
scanning so the operator can resolve that scope separately.

## Closeout boundary

A GREEN run establishes only:

```text
full_receipt_bound_content_sweep_complete=true
```

It deliberately still prints:

```text
pending_legacy_signed_transaction_census_complete=false
privileged_signer_nonce_or_key_replay_fence_proven=false
cross_epoch_replay_protection_proven=false
```

A separate reviewed closeout artifact must decide whether the completed content
sweep plus the already-closed focused-candidate lane is sufficient to promote
the legacy signed-transaction census gate.

## Usage

```bash
node tools/void-economic-epoch2-full-signed-artifact-content-sweep-v1.mjs \
  --receipt-dir "$HOME/Downloads" \
  --stamp 20260928T162432Z \
  --apply \
  --confirmation scanApprovedVoidArtifactContentsForSignedTransactions
```

No RPC, signer/wallet/private-key use, transaction construction/signing,
submission/broadcast, Chain-2050 write, token/funds movement, migration, public
activation, or replay-gate promotion is authorized.
