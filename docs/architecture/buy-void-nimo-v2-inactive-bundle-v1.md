# VOID Nimo witness V2 — reproducible INACTIVE review bundle

## Grounded reason

Read-only Nimo census on October 9, 2026 shows eight installed files match the
genuine frozen historical V1 witness contract. The installed V1
auto-fulfillment module is 14,860 bytes with SHA256
`ae15c56f1aa7009955058ca1d454da5e0d55a3e6c2011c54e7316374e33a5cf6`.
The proposed current V2 module is 26,226 bytes with SHA256
`119a08db651cb85091f66ed2c9e475c56a81f21c9084c47c7f8ee083f831a47c`.
Seven other proposed V2 runtime files equal the original V1 file bytes.

Parent [Draft #2732](https://github.com/6ZoSo9/void-node/pull/2732),
head `dd4f93e8d25c37e6bf7ff0ee2a734f8ee762a3eb`, is 35/35
CI green. It pins the proposed current V2 compiled byte lengths, eight file
hashes, 11 static runtime imports, source/compiler inputs and original V1
manifest identity. The candidate ID
`voidwfb2_b1cf93ea36879332d2745294b8aab1b261d5e7c13522af681db8d390254df73d`
remains UNACCEPTED. Operator-pasted Nimo metadata is not independently
authenticated host attestation.

## Package / validation

The new Python standard-library tool
`scripts/prove_buy_void_nimo_v2_inactive_bundle_v1.py` uses no SSH,
sudo, shell/child-process invocation, remote service, RPC, wallet or signer.
It never sees or changes live customer/payment/allocation files.

- `--plan` reads only the exact lock Git blob and eight compiled files.
  It verifies SHA256, sizes and fixed relative paths; no writes.
- `--package /private/0700/path/void-nimo-v2-inactive.tar` writes ONLY
  a newly created artifact in an owner-private temporary directory. It
  refuses an existing output path. The tar has exactly ten 0444 *regular*
  entries with deterministic archive header metadata and mtime 0, all
  under `inactive-v2-candidate/` relative names. It includes eight
  reviewed payload modules, the proposed lock and an all-false review
  manifest. No tar member is a production absolute installed path or
  executable installer.
- `--inspect-archive /path/inactive-v2.tar` is standalone and READ ONLY,
  usable without a Git checkout on Nimo or Precision. It checks the
  archive paths/types/modes, exact proposed-lock Git blob, immutable old V1
  identity, byte lengths, 8 SHA256 values and all-false authority.
  **It does not extract, stage or install any module.**
- `--self-test` checks four semantic negative lock/authority mutations.

The CI workflow builds the exact source on three disposable Node 22/24/26
runners, repeats the reviewed #2732 source lock proof, makes all three tar
archives independently, invokes the standalone inspector and requires
the full TAR BYTES and test receipts to match byte-for-byte. CI outputs
are inert review artifacts with short retention, **not installation
receipts, signed approvals, launch generations or deployment commands**.

## Offline inspector input-path integrity hardening (separate P2 successor)

An independent review of the original reproducible TAR identified a **distinct**
offline-inspector input hazard: its `Path.is_file()` + `stat().st_size`
preflight was followed by `tarfile.open(path, "r:")`, a new filesystem
pathname open; `getmembers()` also built an unbounded member table before
admission. A caller- or directory-controlled path could be replaced between
the metadata check and TAR parsing. This is **not** a flaw in the immutable
original 256,000-byte archive already reviewed, and it is not evidence that
any user has launched or installed V2. It affects reuse with untrusted archive
paths, including an offline Nimo inspection.

The source-only successor opens the supplied TAR **once** with
`O_RDONLY|O_NOFOLLOW|O_NONBLOCK`; requires a regular, single-link file,
bounded size and exact `lstat`↔`fstat` inode/mode/size/time identity; hashes
that SAME retained descriptor via bounded `pread`; and gives the same
descriptor to `tarfile.open(fileobj=...)`. No later pathname reopen is
accepted for the reported TAR SHA-256/length. It iterates members with
strict 10-entry and cumulative-byte caps before untrusted expansion and
rechecks the retained fd against the visible pathname after parsing. FIFO,
symlink, inode replacement, unexpected growth, extra members and unreadable
archives fail closed.

The `--self-test` uses only disposable synthetic TARs and forcefully swaps a
small regular input to a new same-size inode, an oversized regular file, and
a FIFO **between lstat and the single open**. All three must HOLD at the
descriptor identity check without reading the replacement. An 11-entry TAR
must HOLD at the member-count check. Existing four semantic invalid-lock
tests, exact eight compiled-module source hash checks, original frozen V1
identity, all-false authority receipts and Node 22/24/26 byte-equal TAR
checks remain intact.

**No approval, installation or root/witness change:** The revised inspector
is a bounded read-only review step. A validated archive is still *inactive*
and V2 remains unaccepted. Container path ancestors and deployed Nimo principal
binding need separate host evidence before any production use.

## Later independently reviewed activation

Original frozen V1 installed bytes MUST remain untouched and rollback-safe.
Future installed V2 acceptance needs separate user-reviewed installation plan,
independently attested Nimo principal, root-owned/immutable staged file
identities, installed V2 8/8 inode/mode and hash proof, protected existing
SSH forced-command/witness transport, signed generation binding,
independent monotonic custody recovery, and authenticated cross-UID IPC.
Even an exact V2 archive hash does not prove any of these.
Do NOT extract this unaccepted tar over `/usr/local/libexec`, switch a
witness command, or enable a service based on this source-only artifact.

Current verified-payment -> allocation dispatcher remains unmounted.
The dedicated custody IPC still has reserve and recover HOLD, as do
WC/VOID paired launch, 10 million VOID inventory funding, market and
live acceptance. This artifact moves only one reproducible bundle
packaging/provenance prerequisite forward.

`v2_runtime_bundle_identity_accepted=false`
`v2_host_installed=false`
`original_v1_modified=false`
`payment_to_allocation_authorized=false`
`presale_activation=false`
`funds_moved=false`

**PROTECT THE CORE.**

## Exact full TAR wire-byte admission — additive P2 successor

The exact 256,000-byte inactive V2 TAR generated by independent Node 22,
24 and 26 workflows has SHA-256
`656357f5ed98da324e205ca85085fa4b72d9289f8e2c2b7d5d43eb8e082c87c6`. Its ten member contents alone
were **not sufficient** to bind that physical TAR: Python `tarfile` correctly
stops at end-of-archive and ignores trailing blocks. A standalone
`--inspect-archive` therefore previously accepted the complete original
payload with 512 bytes of appended junk or an unused padding-byte mutation,
despite those inputs having different full-file SHA-256s.

The hardened retained-descriptor inspector now requires BOTH this exact
archive length and SHA-256 after bounded member parsing and before reporting
an accepted read-only artifact. The source path is still read-only and the
original TAR and proposed V2 source/compiled identities are unchanged. The
GitHub workflow repeats both altered-TAR adversaries on the actual freshly
built review archive and checks they fail with
`archive_exact_wire_bytes_mismatch`, while retaining all original
same-size inode swap, FIFO, archive-member-count, artifact reproducibility,
historical V1 and all-false production-authority gates.

An exact inactive review TAR is **not** an accepted or installed V2 host
generation, an authenticated Nimo attestation, an authorized service-control
operation or proof of a live `payment_verified → allocation_reserved`
atomic handoff. No credentials, production files, funds, wallet or signing
authority is supplied by this source gate.

**PROTECT THE CORE.**
