# Buy VOID source-finality V7 deployment receipt installer V1

Marker: `VOID_BUY_VOID_SOURCE_FINALITY_V7_DEPLOYMENT_RECEIPT_INSTALL_V1`

This operator tool prepares the immutable deployment receipt required by V7.
It imports V7's own reviewed-source inspector and receipt-ID function instead of
duplicating either digest algorithm.

The receipt binds:

- exact immutable process commit and tree;
- branch `main` and process marker
  `VOID_NODE_PROCESS_SOURCE_IDENTITY_V1`;
- V7's current reviewed-source digest;
- an externally accepted enforcement lock read from the exact clean `main`
  Git tree, including its candidate enforcement-set SHA-256, lock Git blob,
  lock SHA-256 and content-addressed `voidbenfl1_<sha256>` lock identity;
- content-addressed `voidbsfdep1_<sha256>` deployment receipt identity.

The runtime deliberately does **not** hard-code the accepted enforcement-set
hash. This avoids a self-referential cycle where changing that constant changes
the executable closure whose hash is being accepted.

The deployment installer additionally owns one exact, versioned
current-enforcement tracked-source path set. A current accepted candidate must
carry `current_enforcement_tracked_source_inventory_v1`, sorted by path, with
the exact Git blob SHA-1 and Git mode for every required production economic
source, dynamic saga, privileged receipt tool, V2 selector/ELF lock,
native/launcher input, protected TSX runtime verifier/profile, live service
entry/source-custody guard, and package/build input. The installer independently
hashes the visible protected-tree files, requires exact HEAD objects and modes,
and compares the candidate inventory row-for-row before receipt construction.

Candidate/lock/proof documentation is deliberately outside this path set, so
the later candidate and acceptance commits do not create a source self-reference
cycle. Historical locks that predate this inventory field now fail closed.

`--plan` is read-only and requires the repository to be clean `main` at the
exact operator-supplied commit/tree. It also requires
`--accepted-enforcement-lock-path <ops/security/...json>` and independently
verifies that the tracked lock and its candidate bytes are exact HEAD objects,
that complete executable closure is true, that candidate enforcement identity
is accepted, and that deployment/runtime/presale/funds authority remains false. Authority-bearing Git reads use the
reviewed absolute Git binary with replacement objects disabled, global/system
config suppressed, and repository-local execution surfaces such as fsmonitor,
hooks, attributes, preload/untracked-cache, and recursive submodules explicitly
disabled.

Persistent mutation has one supported entry: the root-owned native V7 pre-entry
launcher. The TypeScript module may still be invoked directly for `--plan`,
but direct `--apply` requires the launcher's protected-dispatch handoff and
fails closed without it.

The handoff is deliberately not described as a secret or as authentication
against arbitrary malicious root. It is an operational provenance contract
created only after native pre-entry has authenticated the exact launcher bytes,
fixed root-owned source tree, commit/tree, selected tool blob, and reviewed
TSX/esbuild runtime. Before its first persistent write, this module independently
requires the fixed protected source root, same-process dispatch PID, exact
current `main` commit/tree, clean worktree, its own exact tracked/visible Git
blob, and the matching launcher-bound context.

`--apply` additionally requires root and the explicit
`--confirm-create-v7-deployment-receipt` token. Production application is
restricted to:

`/var/lib/void-source-finality-v7/deployment-receipt.json`

The receipt parent is retained through a trusted grandparent descriptor. If the
parent is absent it is created descriptor-relative as root:root mode 0755 and
the new parent itself is fsynced. The retained grandparent is fsynced on every
validated bind, including when the parent already exists, so a retry can recover
a prior create whose grandparent fsync failed after the parent became visible.
Any pre-existing parent must already be a direct root-owned non-group/world-
writable directory; its ownership and mode are preserved, including a safe
restrictive mode such as 0700. The installer never chowns or chmods a
pre-existing parent.

The final receipt is root-owned, single-link, mode 0444. Publication no longer
uses a pathname temp that later has to be unlinked. Instead, the final leaf is
opened descriptor-relative with `O_CREAT|O_EXCL|O_NOFOLLOW` at mode 0600.
Receipt bytes are written and fsynced through that retained descriptor; mode
0444 is the commit marker, followed by a second file fsync, retained-parent
fsync, terminal descriptor/path generation revalidation, and a bounded
descriptor read of the accepted receipt.

If any post-create step fails before commit, the root-only 0600 residue is left
untouched and the operation HOLDs. It is never removed by a compare-then-unlink
pathname sequence. A later retry rejects such an uncommitted residue instead of
guessing ownership. If a failure occurs after the receipt is sealed 0444 but before its post-seal file fsync or retained-parent fsync completes, an exact retry re-verifies the committed receipt, fsyncs that exact receipt descriptor, revalidates it, fsyncs the retained parent, re-verifies it again, and only then returns idempotent success. A concurrent foreign substitution is likewise never deleted
by this installer. The adversarial proof covers symlink-parent zero collateral
mutation, restrictive parent preservation, new-parent grandparent fsync,
post-create failures at chown/write/fsync/chmod, foreign final-path substitution,
oversized existing receipts, create-once success and idempotent exact reapply.


The current 49-row protected-source inventory and the accepted enforcement lock/candidate reader are descriptor-bound. Each protected source row is capped at 16 MiB for this generation (current maximum is `src/index.ts` at 3,851,867 bytes).

The accepted enforcement lock and candidate reader is also descriptor-bound: the
path is pre-observed, opened once with `O_NOFOLLOW|O_NONBLOCK`, checked against that
generation, read through the retained descriptor with a hard `max + 1` ceiling,
and revalidated by post-read descriptor and visible-path identity before its Git
blob is accepted. The proof exercises the exported production reader plus
regular-file replacement, symlink-swap, FIFO-swap and growth adversaries.


This PR only creates the tool/proof. It does not run `--apply` on Precision,
change systemd, configure source RPCs, contact a provider, access credentials,
wallets or signers, create/sign/broadcast a transaction, open the presale or
move funds.

The production receipt must be created only after the final deployable source
commit/tree is selected and installed.

PROTECT THE CORE.
