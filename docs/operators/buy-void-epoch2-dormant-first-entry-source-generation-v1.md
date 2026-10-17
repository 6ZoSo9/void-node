# Epoch-2 first-entry immutable source generation

Marker: `VOID_EPOCH2_DORMANT_FIRST_ENTRY_SOURCE_GENERATION_V1`

## Problem and resulting contract

A bootstrap compiled against one whole-repository HEAD expires as soon as an
unrelated source gate merges. Removing that comparison alone leaves another gap:
the native parent must authenticate every application input before starting the
privileged installer, and the installer must verify which parent supplied them.

This additive generation pairs inner installer V3 with native bootstrap V4 and
one closed manifest. The requirements originate in #3413. Issue state is not
evidence that these checks exist or that an operator host is ready.

The manifest's exact SHA-256 and length are compile-bound in V4. An operation
still supplies a strict 40-character runtime HEAD, but that HEAD is a locator
and operation-evidence value. An unrelated commit changes the operation plan
without changing the immutable generation or requiring bootstrap recompilation.

## Closed application inputs

`ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v1.conf`
contains exactly 35 ordered ASCII rows. Duplicate or unknown keys, alternate
ordering, blank rows, CR/NUL bytes, malformed hashes, noncanonical sizes, and
missing or extra data are rejected. Each source entry records its fixed path,
Git blob SHA-1, byte count, and SHA-256.

| Input | Binding |
| --- | --- |
| Inner installer V3 | Fixed source path, blob, length, SHA-256 |
| Bootstrap V4 C source | Fixed source path, blob, length, SHA-256 |
| Accepted first-entry candidate lock V1 | Frozen source path, blob, length, SHA-256 |
| Frozen runtime-installer V2 payload | Frozen source path, blob, length, SHA-256 |
| Accepted launcher and native payloads | Exact accepted lengths and SHA-256s |
| Checkout, bootstrap, tool and installed payload paths | Fixed manifest values |
| Policy and private-proof schemas, plan prefix and confirmation | Fixed manifest values |

The manifest itself must also be present as the same Git blob at the requested
HEAD. It does not contain its own digest. The source-generation ID is
`voidbuye2dormantsourcegen1_` followed by SHA-256 of the exact manifest bytes.

V4 computes Git-compatible SHA-1 blob IDs in process, avoiding a dependency on
an optional kernel SHA-1 implementation. The native proof compares streaming and
buffered results with independent hashes across block and file-chunk boundaries.
SHA-256 remains the manifest, source and payload binding; native SHA-256 uses
Linux's local `AF_ALG` hashing interface.

The native binary is the installed root of trust and cannot contain its own
final binary digest without a self-reference cycle. Its future accepted binary
lock and root-custodied installation remain the deployment authority. Neither
inner source nor manifest embeds that binary digest. The bootstrap C source is
included as a manifest entry; its text is independent of compiler-supplied
manifest hash and length.

## Native checks before the installer child

V4 authenticates the fixed native executable, root-custodied manifest and host
policy, and exact Python/Git executable bytes. It retains their original
descriptors and creates sealed snapshots for the executable tools and application
inputs. The host policy separately binds Python and Git by exact SHA-256 and
length. The installed native executable requires mode `0555`; its manifest and
host policy require mode `0444`. All three require root ownership and protected
physical ancestors. Loader, interpreter and Git control variables supplied by
the caller are rejected before the remaining caller environment is cleared.

The native verifier requires a physical fixed checkout and physical `.git`
directory, clean branch `main`, and the exact operation HEAD. It compares raw
committed-tree and index entries, hashes tracked worktree bytes directly, and
checks all manifest dependencies and the manifest's own Git object. Git commands
run from the authenticated Git snapshot with a closed environment, disabled
transport, and the explicit helper restrictions inherited from the V2 repair.
It does not use `git status` or content conversion to verify worktree bytes.
Both readers bound Git stdout to 64 MiB and the whole command to 20 seconds;
the inner reader also caps and discards stderr. Neither relies on a size check
after accumulating an unbounded subprocess result. A Git child remains unreaped
until capture ends, preserving its PID while timeout cleanup may still signal it.
The native parent rejects inherited `SIGCHLD` ignore or automatic-reap settings
before forking, so a caller cannot invalidate that PID-retention assumption.

Physical object-store directory checks reject alternate object stores,
HTTP alternates, shallow metadata, grafts, and a `commondir` redirection before
the first Git subprocess. These guards are repeated during validation.

Only after those checks does V4 create the installer child. A source change,
wrong HEAD, dirty or non-main checkout, substituted payload, or tool-policy
mismatch causes a HOLD before that child starts.

## Private parent proof and retained inputs

The live native parent supplies a sealed anonymous proof descriptor. The proof
binds its PID, start time, executable identity, operation, runtime HEAD/tree,
expected apply-plan ID, immutable generation, host policy, and every retained
descriptor role. The child checks its real parent through `/proc`, the fixed
root-owned executable, and the corresponding live parent's descriptors.

The exact roles are proof, manifest, installer, bootstrap source, lock, runtime
installer, launcher, native payload, host policy, Python, Git, checkout, and
Git directory. File snapshots require the four write/grow/shrink/seal seals;
directory roles retain no-follow descriptors. All role descriptors are distinct.
The proof is bounded to 8 KiB and has a closed ordered schema.

The installer authenticates this context before an operational plan or apply.
It consumes the immutable snapshots and rechecks the parent, descriptors,
source generation, operation checkout, and host tool/policy generation at its
mutation and publication boundaries. Direct root Python invocation does not
establish the required native-parent authority. Inert `--self-test` and
`--source-plan` remain available without operational authority.

The plan body contains the immutable generation, runtime checkout evidence, and
host policy/tool identities. It omits PIDs, start ticks, descriptor numbers, and
descriptor inode numbers, so a fresh native parent can apply an earlier exact
plan. A changed runtime HEAD changes the operation plan even when generation
identity remains the same.

Linux documents the underlying [anonymous sealed files](https://man7.org/linux/man-pages/man2/memfd_create.2.html),
[process descriptors](https://man7.org/linux/man-pages/man5/proc_pid_fd.5.html),
[executable identity](https://man7.org/linux/man-pages/man5/proc_pid_exe.5.html), and
[process start-time field](https://man7.org/linux/man-pages/man5/proc_pid_stat.5.html).
Descriptor names alone do not authenticate a parent; the process, custody,
descriptor identity, exact contents, and seals checks compose that assertion.

## Publication and compatibility

V3 retains create-only publication, the V2 stage-generation cleanup repair, and
publication-aware terminal receipts. A postpublication error requires inspection
and preserves the original failure and separate close outcome. No rollback
deletes a published root.

The new operation uses `voidbuye2dormantfirstentryinstall3_` and
`INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V3_CREATE_ONLY`. The accepted
launcher/native payload namespace and V1 installed policy schema remain frozen.
The earlier V1/V2 inner sources, V2/V3 native bootstraps, and their accepted
candidate evidence remain separate generations.

Raw worktree bytes must match Git blobs. Filter-normalized, LFS, or CRLF-only
clean worktrees are outside this contract. Ignored files are outside the
clean-source assertion. The filesystem checks detect drift but do not create an
atomic freeze of a writable checkout.

The manifest explicitly declares its trusted OS boundary: the root-custodied
Linux dynamic loader, Python standard library/native extensions, and libc remain
system-runtime inputs. This application generation does not byte-pin a complete
operating-system image. Git repository configuration/object-store semantics are
constrained by the documented native and inner verification code; the generation
must not be described as a general malicious-repository sandbox.

## Source verification and next gate

Run the focused source proofs in a disposable build environment:

```bash
/usr/bin/python3 -I -S -B scripts/prove_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v3_generation.py
/usr/bin/python3 -I -S -B scripts/prove_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v3_terminal.py
/usr/bin/python3 -I -S -B scripts/prove_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v4.py
```

These proofs cover the manifest and generation contract, deterministic operation
binding, rejection paths, native verification helpers in disposable repositories,
static build/self-test, and the actual inner writer/cleanup/receipt behavior in
substituted filesystem fixtures. They do not invoke production bootstrap
plan/apply or a privileged host installation. Detailed coverage is printed by
each proof; a source fixture is not production host acceptance.

The native proof also sends an actual sealed proof produced by V4 through the
V3 proof parser. That fixture uses nonoperational role data and proves the
producer/consumer schema, not a privileged live-parent installation. Component
fixtures that substitute root or interpreter admission say so in their receipts.
The dedicated CI workflow runs when any new-generation file, bound frozen input,
or checked predecessor source changes.

The next gate is derivation and acceptance of this exact V4/V3 generation and
its host-policy installation contract, then the reviewed operator installation
and running-generation qualification. An earlier accepted V3 bootstrap does not
acquire this manifest or parent-proof behavior by relabeling it.

Source green grants no credential, service, wallet, signer, payment, transaction,
treasury, Work Credit, presale/WC market activation, or fund-movement authority.
