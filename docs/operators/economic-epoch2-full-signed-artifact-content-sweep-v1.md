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
- resolves ordinary symlink descendants only to determine whether they alias an
  already approved scanned regular file;
- admits one exact PR #1505 generated-worktree repository symlink as metadata
  without following it; and
- rejects every other broken or external symlink target;
- retains the canonical generated dependency/cache exclusions;
- refuses credential/key-looking paths before broad content reads;
- bounds ordinary scanned files to 64 MiB and the aggregate scanned content to 4 GiB;
- permits an oversized `.safetensors` file only when its bounded header parses as a valid safetensors tensor index, tensor byte lengths match dtype × shape, tensor data offsets are contiguous and cover the entire payload, and the file remains within the separate 64 GiB model-artifact ceiling. Only the header is inspected for transaction literals; tensor payload bytes are not read.

Generated/cache directories remain out of signed-artifact scope because they are
dependency/cache material, not controlled operator artifact stores. Their
contents are not read.

The retained PR #1505 exec-digest-cache worktrees include the repository symlink
`ops/prom-textfile-snap-age.sh`. That Git entry is mode `120000`, blob
`4d8b82d38eee4814462b9e21f21102361b35f7e5`, and its complete 40-byte
link value is exactly `/usr/local/bin/prom-textfile-snap-age.sh`. The sweep
classifies that entry as
`REVIEWED_PR1505_EXEC_DIGEST_CACHE_REPOSITORY_SYMLINK` only under an exact
`void-pr1505-exec-digest-cache-v2-<8 lowercase alnum>` or
`void-pr1505-exec-digest-cache-v3-<8 lowercase alnum>` worktree path, after
re-reading the symlink metadata and reproducing the exact Git blob identity.
It never follows the target. A changed target, changed path family, changed
blob, non-symlink replacement, or any unrelated broken/external symlink still
HOLDs.

Validated safetensors tensor payloads are likewise treated as model-weight
material rather than signed-transaction artifact storage. This is not a generic
large-file exemption: an oversized non-safetensors file still HOLDs, and a
malformed or structurally inconsistent safetensors file HOLDs. The safetensors
JSON header is bounded, parsed, and scanned for transaction literals before the
tensor payload is excluded.

The PR #1464 portable-runtime evidence family has one separately reviewed
generated executable exception. A large file is excluded as
`VALIDATED_PR1464_PORTABLE_NODE_RUNTIME` only when:

- basename is exactly `node`;
- the immediate runtime directory is exactly
  `node-v24.20.0-linux-x64` or `node-v26.8.1-linux-x64`;
- the next parent is exactly `void-pr1464-portable-nodes-v1`;
- size is greater than the ordinary 64 MiB scan bound and no more than 256 MiB;
- the file is executable;
- ELF identity is 64-bit little-endian x86-64 with a normal executable/shared
  object type;
- one bounded `PT_INTERP` entry names an expected x86-64 Linux dynamic loader;
  and
- the complete opened executable hashes exactly to the retained PR #1464
  Precision identity: v24.20.0 =
  `89af8424dd53e560b1933f87ba650d8bf57c83ca5a04600eefb31f416aabbae7`,
  or v26.8.1 =
  `19235a9b678f84729464c52623f92de130a165452747c6826d3fdc13df3abcc3`.

Node v22.23.2 in the retained PR #1464 host evidence was `/usr/bin/node`, not
a member of this portable-runtime bundle, so there is no portable v22
exception. The opened portable executable is read in bounded chunks only to
compute the exact SHA-256 identity. Its payload is not searched for transaction
literals and is never printed or persisted. Arbitrary large executables, other
versions, other bundle paths, hash mismatches, or malformed ELF files remain
HOLD.

The PR #1352 ext4 restart evidence family has one separately reviewed generated
filesystem-image exception. A file is excluded as
`VALIDATED_PR1352_EXT4_SUPPORT_FIXTURE` only when all of the following hold:

- basename is exactly `support.ext4`;
- its immediate parent matches `void-pr1352-ext4-restart-<lowercase-alnum>`;
- file size is exactly 384 MiB / 402,653,184 bytes;
- the ext4 superblock magic is exactly `0xef53`;
- the declared ext4 block size is plausible; and
- declared block count × block size equals the exact file length.

Only the 1 KiB ext4 superblock is read. Filesystem payload bytes are not read.
This matches the repository's DataNet ext4 test/evidence profile, which creates
fresh dedicated nonsparse 384 MiB ext4 images. Arbitrary `.ext4` files,
filesystem images outside that exact PR #1352 fixture path, or malformed images
remain HOLD.

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

## Sensitive-path review

Sensitive-looking paths remain fail-closed by default. The tool does not
blanket-whitelist `.pem`, `.env`, credential, key, wallet, or secret paths.

Three exact non-secret classes are handled explicitly:

1. **PEM public material** — a bounded PEM file is accepted only when every PEM
   block is a reviewed public/certificate type such as `PUBLIC KEY` or
   `CERTIFICATE`. Any private-key PEM marker fails closed before the file can
   enter the ordinary transaction scan.
2. **War College verifier env** — only the exact basename
   `void-war-college-evidence-verifier.env` under an
   `ops/war-college/` path is eligible. The parser accepts ordinary
   `NAME=value` / `export NAME=value` lines, rejects secret/private-key-like
   variable names, never prints values, and then permits the file to participate
   in the in-memory transaction scan.
3. **Generated gRPC private-key-signing wrapper source** — C/C++ source files
   under `site-packages/.../private_key_signing/` are dependency source code,
   not credential material. They are excluded without reading their contents.
4. **Generated dependency trust-root PEMs** — CA/public trust bundles under
   Python `site-packages` trust-root locations (including certifi and gRPC
   credential roots) and SDK `trustedroots/*.pem` paths are dependency trust
   material, not operator credentials. They are excluded without reading their
   contents. This rule does not apply to arbitrary PEM files elsewhere.

All other sensitive-looking paths still HOLD. Successful output explicitly
reports `private_key_or_secret_content_read=false` and
`sensitive_file_values_printed=false`.

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
activation, or replay-gate promotion is authorized. Reviewed public PEM material
and the exact non-secret War College verifier-env class may be read in memory;
private-key or secret material is never admitted, printed, or persisted.
Generated dependency trust-root bundles and generated private-key-signing source
are excluded without content reads. The exact reviewed PR #1505 repository
symlink is read only as bounded link metadata and is never followed. The exact
PR #1464 portable Node runtime
executables are excluded only after bounded ELF-structure validation plus a
full-file SHA-256 identity read; their bytes are not transaction-scanned,
printed, or persisted. The exact PR #1352 ext4 support-fixture payload is
excluded after superblock-only structural validation.
