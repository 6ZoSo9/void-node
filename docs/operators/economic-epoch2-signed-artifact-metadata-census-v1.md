# Epoch-2 signed-artifact metadata census v1

Marker: `VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1`

Status: source-only operator preparation. It does not complete the legacy
signed-transaction census.

## Purpose

The canonical repository baseline now records 20 reviewed Chain-2050 transaction
lineages, but repository evidence cannot prove whether additional raw signed
transactions are retained on operator storage.

The first operator step must discover candidate files without turning that
question into a broad private-file scan.

## Scope contract

The scanner accepts only explicitly supplied paths. At least one directory root
or one explicit file is required; explicit-file-only census is supported.

Directory roots, when used, must:

- be absolute;
- be direct, non-symlink directories with no symlink ancestors;
- be owned by the current operator account;
- have a root-directory basename beginning with `void`; and
- not be `/`, the operator home directory, or the whole
  `$HOME/Downloads` directory.

A specific file outside such a directory may be supplied only with an explicit
`--file /absolute/path`.

The directory walk is bounded to:

- at most 16 roots;
- at most 256 explicit files;
- depth 12; and
- 10,000 discovered regular files **globally across all roots and explicit
  files**.

Recursive descent is descriptor-relative on Linux: every directory is opened
with `O_DIRECTORY|O_NOFOLLOW`, descendants are resolved through the already-open
`/proc/self/fd/<fd>` parent, lstat/open inode identity must remain stable, and
the opened descendant's realpath must remain inside the exact approved root.

A symlink supplied as an explicit root or explicit file is still rejected.
A symlink encountered *inside* an already-approved root is never followed.
Instead, the scanner records only safe lstat metadata for the link itself,
including a path hash and filename-only candidate hint, with
`symlink_target_read=false` and `followed=false`, then continues the walk.

Generated dependency/cache subtrees with exact basenames `.git`, `.venv`,
`venv`, `node_modules`, `__pycache__`, `.tox`, `.pytest_cache`,
`.mypy_cache`, or `.ruff_cache` are recorded in
`skipped_generated_subtrees` and are not descended into. Each skipped row
records `contents_enumerated=false`, `content_read=false`, and
`followed=false`. The regular-file ceiling remains 10,000 rather than being
raised to accommodate generated dependency trees.

The depth limit also remains exactly 12. If a non-generated directory would be
entered at depth 13, that directory is recorded in `skipped_depth_subtrees`
with `skip_reason=maximum_scan_depth_boundary`,
`subtree_depth=13`, `maximum_scan_depth=12`,
`contents_enumerated=false`, `content_read=false`, and
`followed=false`. Its contents are not opened or enumerated.

Path-swap escapes and descriptor identity changes still fail closed.

## Metadata only

The scanner records only filesystem metadata for regular files:

- absolute path;
- path-string SHA-256;
- basename;
- size;
- mode;
- discovery source; and
- a filename-only candidate hint.

For symlink descendants it records the same link-level metadata in a separate
`symlink_descendants` collection plus explicit no-follow fields. It does not
resolve or read the symlink target.

It never opens or reads the contents of any scanned regular file.

The receipt is local, create-once, mode `0600`, and is not a public evidence
artifact. Publication uses a fully written/fsynced temporary file followed by an
atomic hard-link create of the final path and parent-directory fsync; an existing
final receipt is never overwritten.

## Candidate hints are not a census conclusion

The filename hint is convenience only. A file not matching the hint is not
automatically classified as safe or irrelevant.

The metadata receipt therefore always records:

```text
pending_legacy_signed_transaction_census_complete=false
privileged_signer_nonce_or_key_replay_fence_proven=false
cross_epoch_replay_protection_proven=false
```

The next gate is explicit operator review followed by a separate exact raw
transaction inspector for individually approved candidate files.

## Usage

Plan only:

```bash
node tools/void-economic-epoch2-signed-artifact-metadata-census-v1.mjs
```

The plan performs no filesystem scan. Apply mode requires at least one explicit
`--root` or `--file`.

Create a private receipt:

```bash
node tools/void-economic-epoch2-signed-artifact-metadata-census-v1.mjs \
  --root /absolute/void-owned-directory \
  --file /absolute/explicit-file \
  --out /absolute/private-receipt.json \
  --apply \
  --confirmation discoverVoidSignedArtifactCandidates
```

Do not point this tool at an arbitrary personal directory merely to increase
coverage. Add only operator-reviewed VOID-owned roots or explicit files.

## Authority boundary

No scanned-file content read, credential content access, wallet/key access,
transaction construction/signing/submission/broadcast, Chain-2050 write, replay
gate promotion, activation, or funds movement is authorized.
