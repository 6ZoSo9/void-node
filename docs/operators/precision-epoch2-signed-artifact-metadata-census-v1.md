# Precision Epoch-2 signed-artifact metadata census wrapper v1

Marker: `VOID_PRECISION_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1`

This wrapper narrows the existing metadata-only signed-artifact census to
operator-owned VOID artifacts immediately below `~/Downloads`.

It does not recursively scan the whole home directory or treat the whole
Downloads directory as an approved root. It selects only:

- direct child directories whose basenames begin with a VOID-owned prefix; and
- direct regular files whose basenames begin with `void` or `.void`.

Selected directories are passed to the canonical census tool as explicit roots;
selected files are passed individually as explicit files.

Before root admission, the Precision wrapper may classify a top-level directory
as a generated Python virtual-environment root using filesystem metadata only.
The classifier is intentionally strict: the root must contain only `bin/`,
`include/`, `lib/`, `pyvenv.cfg`, and optional `lib64`; `bin/activate`
must be a regular file; `bin/`, `include/`, and `lib/` must be real
directories; and `pyvenv.cfg` must be a regular non-symlink file. The wrapper
does not read `pyvenv.cfg` or any environment file contents. Matching roots are
reported separately as `skipped_generated_root_count` and
`skipped_generated_root_basenames` with reason
`python_venv_root_shape_v1`, while `root_count` continues to represent the
full selected top-level VOID-owned root scope.

The operator-verified `void-war-college-evidence` top-level collection is
partitioned at exactly one directory level before canonical scanning. Each
immediate child directory becomes a canonical `--partition-child-root`, which
the canonical scanner accepts only when its immediate parent independently
satisfies the ordinary VOID-owned root contract. Each immediate regular file
becomes an explicit-file input. Top-level symlinks or special files inside this
collection fail closed. No child file contents are read during partitioning.
This preserves the complete evidence collection while preventing
the collection-wide file total from being mistaken for a single-root overflow.
The wrapper reports the partitioned collection root, child-root count, top-file
count, and `partitioned_collection_content_read=false` separately.

Because the canonical census intentionally accepts at most 16 roots and 256
explicit files per invocation, the Precision wrapper deterministically batches
larger approved top-level scopes. Precision deliberately uses **one root per
invocation** so the canonical 10,000-file global invocation ceiling cannot be
exceeded merely by combining multiple individually admissible roots.
Explicit-file batches still contain at most 256 files. Each batch produces its
own private create-once mode-`0600` receipt. The wrapper then verifies all receipts,
rejects duplicate discovered paths across batches, and prints aggregate counts,
candidate basenames, receipt paths, and receipt SHA-256 values.

The wrapper itself remains bounded to at most 1,024 selected top-level roots,
1,024 expanded scan roots after collection partitioning, and 4,096 explicit
files. Exceeding those totals fails closed instead of silently skipping scope.
`root_count` remains the original selected top-level VOID-owned scope while
`scanned_root_count` reports the expanded roots actually passed to the canonical
scanner.

The underlying census records metadata only and never reads candidate file
contents. Symlink descendants inside an approved root are recorded separately
with link-level metadata and are never followed; explicit root/file symlinks
remain rejected. Generated dependency/cache subtrees are recorded and skipped
without enumerating their contents. Directories that would exceed the canonical
depth-12 boundary are likewise recorded as skipped depth subtrees without opening
or enumerating them. The Precision aggregate verifies all of these contracts and
reports symlink, generated-subtree, and depth-boundary counts separately from
regular files.

The resulting receipt is private, create-once, mode `0600`, and
remains an operator-review artifact rather than public evidence.

The wrapper deliberately does not promote any replay gate. A green result still
reports:

- `pending_legacy_signed_transaction_census_complete=false`;
- `privileged_signer_nonce_or_key_replay_fence_proven=false`;
- `cross_epoch_replay_protection_proven=false`.

After the private receipt is reviewed, individually approved raw signed
transaction artifacts may be passed to the existing exact raw-transaction
inspector. Credential, wallet, mnemonic, keystore, and private-key files must
not be supplied for raw-transaction inspection.

Authority remains read-only metadata discovery plus one private local receipt.
There is no service action, credential-content read, wallet/key use, signing,
broadcast, Chain-2050 write, token/funds movement, migration, or activation.
