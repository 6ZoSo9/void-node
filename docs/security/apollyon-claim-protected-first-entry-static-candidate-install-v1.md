# Apollyon protected first-entry static candidate install handoff V1

Marker: `VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_STATIC_CANDIDATE_INSTALL_V1`.

Status: **read-only candidate archive admission**. This source does not install, extract, chmod, chown, execute, start a service, create a protected store, publish a claim, release a trainer or execute training. It does not qualify Xiphos.

## Exact predecessor

- Candidate acceptance lock: #3494 head `34bcf8ae71bdae6b64b0475776fd0910b212bb48`.
- Accepted lock source: `ops/xiphos/apollyon_claim_protected_first_entry_static_candidate_lock_v1.py`, Git blob `7462e0e90fa8ec068bd82039c9c07a3359c0d6de`.
- Historical static candidate derivation: #3482 head `bf8bfed5b5a4b08a7ebe80139987366b8f4eb94c`.
- Accepted candidate ID: `apollyon_claim_protected_first_entry_static_candidate_v1:81613bf7887ef287f6aa7cbb4a1bbe8ed0f180981fb8fe9538f6f0ab122855d9`.

The accepted lock source is read and authenticated as a fixed Git blob, then compiled from exactly those retained bytes under Python isolated startup. This handoff now owns a common held-inode read boundary for the parent source, parent dependencies, and operator-supplied archive: each path is first acquired with `O_PATH|O_NOFOLLOW|O_CLOEXEC`, proved to be the exact bounded single-link regular inode, and only then data-opened through `/proc/self/fd/<held-fd>` with `O_RDONLY|O_CLOEXEC|O_NONBLOCK`. This verifier keeps its own `stable_file()` override as defense-in-depth, so the archive-admission gate owns and proves the dependency-read boundary independently of later parent refactors. Parent compilation/derivation/revalidation errors are translated into the machine-readable negative-authority `HOLD=accepted_parent_lock_revalidation_failed` contract. The parent derivation and validation still reprove repository ancestry, exact parent blobs, candidate acceptance, and negative install/training authority. No caller-supplied lock is accepted by the public CLI.

## Archived candidate identity

The one accepted **uncompressed USTAR archive** has SHA-256:

`89c3edf89d15f9e263d8d8dd603dd7b068a7eb64380c59852e1000e614a0607a`.

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

- canonical report SHA-256: `6696b52bc43c451af576814d452c827ad89644a14803cab9d24affabb82c189c`;
- raw report SHA-256: `4bb7a70116da4021a9975f6e8c15c666ba32f5c62d3cedf4a618b22aecf76731`.

No live recompile or dependence on a mutable hosted GCC/readelf image is performed.

## Public operation

Under an unprivileged, isolated Python interpreter, an operator may run:

```sh
python3 -I -B ops/xiphos/apollyon_claim_protected_first_entry_static_candidate_install_v1.py --self-test
python3 -I -B ops/xiphos/apollyon_claim_protected_first_entry_static_candidate_install_v1.py --verify-tar /absolute/path/to/apollyon-protected-first-entry-static-candidate-v1.tar
```

The second command is **read-only** and requires the operator to supply the exact accepted artifact archive by absolute, direct, non-symlink path. The archive file must be one regular single-link file of at most 4 MiB; file identity is checked before, during and after the read. The archive, accepted-parent source, and parent dependencies are admitted through held O_PATH descriptors before any data-open. A pathname replaced with a FIFO, device, or other special inode after admission cannot become the object data-opened; the reopened held regular inode is then cross-checked against the still-visible pathname and any replacement causes HOLD. A wrong archive SHA-256 HOLDs before any tar member is parsed. A real accepted tar must actually be supplied; no hosted CI fixture is a substitute.

Descriptor close failures in the archive reader, accepted-parent source reader,
and authenticated parent-dependency reader are normalized to distinct
machine-readable HOLD reasons. Both the data descriptor and its O_PATH custody
descriptor are attempted exactly once even when one close reports uncertainty;
the proof injects real closes followed by synthetic errors to cover that
boundary. In the held-inode *admission* helper, this guarantee also applies
when its primary generation/metadata check rejects after the data-open:
an uncertain data-descriptor close cannot skip closing the O_PATH descriptor.
The dedicated regression forces a real close followed by EIO, checks both
descriptors are closed exactly once and requires no leaked handles. Cleanup
uncertainty remains a machine-readable HOLD; it is never retried.

A successful read-only receipt is content-addressed and records `status=exact_archive_verified_install_blocked`, `archive_verified=true`, `binary_identity_verified=true`, and `protected_install_authorized=false`. It **does not** prove protected installed source origin, root custody of the target path, Xiphos host state, or installer readiness.

## October 19 current-parent reconciliation

This Draft is merge-forwarded onto current accepted-lock parent #3494
`34bcf8ae71bdae6b64b0475776fd0910b212bb48`, which introduces its own held-O_PATH-inode admission for
reviewed parent-source reads. The archive-admission child preserves that parent
exactly while retaining its own isolated admission reader as defense-in-depth.
Only the original four child paths are changed relative to the new parent;
accepted candidate/archive/ELF digests and authority remain unchanged.

## Hosted adversaries

The focused hosted proof exercises synthetic in-memory USTAR fixtures solely to test parsing and rejection. It verifies wrong digest, mode downgrade, link type, extra/missing member, incorrect source head, manifest, report, malformed JSON report types and binary-size drift are rejected. It also deterministically replaces a regular archive path, a synthetic accepted-parent source path, and a synthetic parent dependency path with FIFOs immediately before the data-open. Each fixture requires that the data-open target is only `/proc/self/fd/<held-fd>` and records zero data-open attempt on the replacement pathname. The dependency fixture additionally proves the parent Git lookup is never reached after descriptor drift. A deliberately injected predecessor derivation failure must also produce machine-readable HOLD rather than a traceback. The synthetic positive fixture is deliberately checked against the real accepted parent lock and **must fail** `archive_digest_mismatch`.

Hosted CI never downloads or uses production artifacts, never writes the archive to a protected path and never claims that the real accepted tar has been admitted. The production `--verify-tar` mode must be performed separately when an operator has the actual archive.

## Required future installed-host gate

A distinct reviewed and explicitly authorized host installer must still revalidate the source generation and exact accepted archive **at use**, prove direct root-owned protected parent directories and leaf absence/no symlink/no hardlink, stage and atomically publish the exact `0555` ELF without overwrite, verify installed inode/bytes/ownership/permissions, and establish the fixed `/proc/self/exe` origin at first instruction before any downstream claim logic.

This read-only gate does **not** provide that installer and does not grant host action. No account/group/service/systemd action, durable claim, trainer release, training/model/weight execution, key, signing, wallet, transaction or funds authority is enabled.

**PROTECT THE CORE.**

## Flattened static lock + archive admission PR generation

This PR now directly targets #3482 at
`bf8bfed5b5a4b08a7ebe80139987366b8f4eb94c`. Its direct source scope is
the complete eight-file static-admission layer: four accepted-candidate lock
files plus four read-only archive-admission files.

The focused workflow re-proves the static candidate acceptance lock before
running archive adversaries and watches the lock's complete protected-first-entry
dependency closure. This is review-stack consolidation only: the archive is not
installed or executed, and Xiphos/install/training authority remains false.

## Flattened repaired-lock generation

The archive-admission layer in the consolidated PR now binds repaired static-lock
generation `2367e6d8fd67faaae70827edddacb75d524e1db5` and lock source blob
`8eab5515fbe844e930aed97db4195b8ef86c42ef`.

That lock still authenticates the original accepted #3482 workflow/artifact
evidence from its historical Git tree while allowing the current flattened
candidate workflow to carry a broader CI-only path scope. The accepted candidate
ID, binary identity, historical artifact digests and negative install/training
authority are unchanged.
