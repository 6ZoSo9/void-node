# Apollyon protected first-entry static candidate install handoff V1

Marker: `VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_STATIC_CANDIDATE_INSTALL_V1`.

Status: **read-only candidate archive admission**. This source does not install, extract, chmod, chown, execute, start a service, create a protected store, publish a claim, release a trainer or execute training. It does not qualify Xiphos.

## Exact predecessor

- Candidate acceptance lock: #3494 head `283f135a826895c8b90b6c973d58a7d7f2447eb4`.
- Accepted lock source: `ops/xiphos/apollyon_claim_protected_first_entry_static_candidate_lock_v1.py`, Git blob `2351eaf1f12317b8ae047ad6dd58f29ba116e0c7`.
- Historical static candidate derivation: #3482 head `2aec1d7a30e9c6b20b7d1cf0831f34c240674727`.
- Accepted candidate ID: `apollyon_claim_protected_first_entry_static_candidate_v1:2a1fde88ced23606a3e0b6b10bb1205217915b36a0332ee89b5ec81181b32e23`.

The accepted lock source is read and authenticated as a fixed Git blob, then compiled from exactly those retained bytes under Python isolated startup. The existing parent derivation and validation reprove its repository ancestry, parent blobs, candidate acceptance, and negative install/training authority. No caller-supplied lock is accepted by the public CLI.

## Archived candidate identity

The one accepted **uncompressed USTAR archive** has SHA-256:

`ca21d9f28b66c408f857ee00480a63585080025a6a76a84efca472e188390944`.

It must contain exactly four regular members, with no symlinks, hardlink aliases, directories, extended headers, or extra names:

| Member | Required mode | Validation |
| --- | --- | --- |
| `candidate-v1.json` | 0644 | Exact raw report and canonical report SHA-256, candidate ID and negative authorities |
| `apollyon-claim-protected-first-entry-static-v1` | 0555 | Exact length, SHA-256 and Git blob |
| `SHA256SUMS.txt` | 0644 | Exact two-line relative manifest, in reviewed order |
| `source-head.txt` | 0644 | Exact #3482 source head and single final LF |

Every member must have numeric UID/GID 0/0, mtime 0 and the exact required mode. Neither archive nor member bytes are extracted to disk. The ELF is *only read and hashed*, never invoked.

Binary acceptance requires:

- size: `808472` bytes;
- SHA-256: `9c414a6aac9bbfc1b07175908e130993141255b132359ccae23ae49ecf5f7b6d`;
- Git blob SHA-1: `0eaedceb79f39829fbde9f06e454f45b9aeb8912`;
- preserved future install mode: `0555`;
- future fixed self path: `/opt/void-apollyon-claim-protected-first-entry-v1/bin/apollyon_claim_protected_first_entry_v1`.

The accepted historical candidate report is also bound to:

- canonical report SHA-256: `8e96b53161b0b5447e5b02499537803ffd680b5f01d6520ec1653fee52c75649`;
- raw report SHA-256: `dffdd2ce32fcf9dee765f8a6d17b455e100022012c7cd17d9cec1f5d436b484a`.

No live recompile or dependence on a mutable hosted GCC/readelf image is performed.

## Public operation

Under an unprivileged, isolated Python interpreter, an operator may run:

```sh
python3 -I -B ops/xiphos/apollyon_claim_protected_first_entry_static_candidate_install_v1.py --self-test
python3 -I -B ops/xiphos/apollyon_claim_protected_first_entry_static_candidate_install_v1.py --verify-tar /absolute/path/to/apollyon-protected-first-entry-static-candidate-v1.tar
```

The second command is **read-only** and requires the operator to supply the exact accepted artifact archive by absolute, direct, non-symlink path. The archive file must be one regular single-link file of at most 4 MiB; file identity is checked before, during and after the read. A wrong archive SHA-256 HOLDs before any tar member is parsed. A real accepted tar must actually be supplied; no hosted CI fixture is a substitute.

A successful read-only receipt is content-addressed and records `status=exact_archive_verified_install_blocked`, `archive_verified=true`, `binary_identity_verified=true`, and `protected_install_authorized=false`. It **does not** prove protected installed source origin, root custody of the target path, Xiphos host state, or installer readiness.

## Hosted adversaries

The focused hosted proof exercises synthetic in-memory USTAR fixtures solely to test parsing and rejection. It verifies wrong digest, mode downgrade, link type, extra/missing member, incorrect source head, manifest, report and binary-size drift are rejected. The synthetic positive fixture is deliberately checked against the real accepted parent lock and **must fail** `archive_digest_mismatch`.

Hosted CI never downloads or uses production artifacts, never writes the archive to a protected path and never claims that the real accepted tar has been admitted. The production `--verify-tar` mode must be performed separately when an operator has the actual archive.

## Required future installed-host gate

A distinct reviewed and explicitly authorized host installer must still revalidate the source generation and exact accepted archive **at use**, prove direct root-owned protected parent directories and leaf absence/no symlink/no hardlink, stage and atomically publish the exact `0555` ELF without overwrite, verify installed inode/bytes/ownership/permissions, and establish the fixed `/proc/self/exe` origin at first instruction before any downstream claim logic.

This read-only gate does **not** provide that installer and does not grant host action. No account/group/service/systemd action, durable claim, trainer release, training/model/weight execution, key, signing, wallet, transaction or funds authority is enabled.

**PROTECT THE CORE.**
