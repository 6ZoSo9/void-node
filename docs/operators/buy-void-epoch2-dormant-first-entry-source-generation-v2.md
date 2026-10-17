# Epoch-2 first-entry source generation V2

Marker: `VOID_EPOCH2_DORMANT_FIRST_ENTRY_SOURCE_GENERATION_V2`

## Purpose

This generation repairs the repository witness used by the native bootstrap and
its Python installer. It derives from the canonical inner V3 / bootstrap V4
manifest and private-parent implementation introduced in #3439. The resulting
pair is inner installer V4 and native bootstrap V5, with a new closed manifest.

The earlier draft of #3442 predated #3439 and must not replace that canonical
implementation. Its history remains inspectable. The final repair preserves the
accepted V3/V4 source, manifest, candidate and lock bytes, including #3443's
exact bootstrap acceptance. A changed source generation requires its own binary
derivation and acceptance; it does not alter the meaning of an earlier lock.

## Defects addressed

The canonical generation authenticated its operational application bytes, but
its repository witness still used the live Git metadata directory. Focused
component fixtures reproduced three distinct problems:

| Boundary | Previous observation | Repaired requirement |
| --- | --- | --- |
| Source metadata | Reading a split index could refresh shared-index mtime. | Git receives a private immutable index and private configuration; unsupported source-index forms cause HOLD before Git reads them. |
| Commit and tree identity | A corrupted unrelated tree could be stored under a false object ID and accepted through Git's flattened listing. | Hash the raw commit and every traversed tree, and derive tracked membership from that authenticated hierarchy. |
| Earlier tracked files | A file checked early could change while later files were being checked. | Preserve its first observed generation and recheck recorded file and directory identities at the end of the complete witness. |

The original reproductions kept all four inherited operational source snapshots
exact. They demonstrated incomplete checkout provenance and a source metadata
write, not substitution of the manifest-bound application code. Persistent
bound-source drift was already caught by the later dependency pass. This repair
retains that dependency check and closes the reproduced witness gaps in both
readers, including the native gate before Python starts.

## Preserved application authority

The manifest remains a closed, ordered, 35-row ASCII contract. It binds four
source paths by Git blob SHA-1, byte count and SHA-256; the two accepted payload
identities; fixed checkout and installation paths; and policy, proof and
operation namespaces. The accepted payload lock and runtime-installer source
remain the exact frozen inputs of the preceding generation.

The native bootstrap authenticates the manifest and host policy, retains
application and tool inputs, and verifies the checkout before creating an
installer child. The Python child authenticates its live native parent, the
sealed private proof, the request and all thirteen descriptor roles:

`proof`, `manifest`, `installer`, `bootstrap_source`, `lock`,
`runtime_installer`, `launcher`, `native`, `policy`, `python`, `git`,
`checkout`, and `git_dir`.

The private-parent proof schema remains V1. Descriptor names or numbers alone
do not establish authority. Parent PID/start identity, executable custody,
descriptor correspondence, seals and exact contents are checked together.

Operational Python `_git_object` continues to return only the four inherited
manifest-authenticated source snapshots. The repository reader serves checkout
and dependency revalidation. It does not become an alternative source of
operative application code. Both native and Python Git subprocesses execute the
retained sealed Git executable; they do not reopen the visible Git pathname.

Create-only publication, stage-generation cleanup and publication-aware terminal
receipts remain in force. A postpublication failure preserves the published
root for inspection. Verification failure never authorizes deletion of an
unidentified or substituted stage.

## Private repository witness

Each native or Python verification scope constructs its own private Git view.
No additional inherited descriptor role is introduced. The live native-parent
and retained-input checks continue around the witness and at mutation and
publication boundaries.

Source HEAD, the `main` reference and the index are captured through physical,
no-follow reads and bound to their observed generations. The private metadata
contains fixed configuration and an immutable index. It does not copy source
`config`, `config.worktree`, include directives, hooks, alternate-object
metadata, or helper configuration. Unsupported or inconsistent index metadata
causes HOLD; validation does not repair or refresh the source index.

The private object view uses bounded copies of physical loose objects and
validated pack/index descriptors. Its object-info namespace is empty. Source
alternates, HTTP alternates, grafts, shallow metadata, common-directory
redirection and physical-path substitutions are rejected. Source objects and
their containing directories are checked again before releasing the witness.

Only the fixed repository-read commands are available. Their environment
disables transports, lazy fetch, replacement objects, optional locks, hooks and
automatic maintenance. Output, elapsed time, memory and CPU use are bounded.
Timeout/error cleanup terminates and reaps the Git process while preserving its
PID until signaling is complete. Stricter inherited resource limits remain
effective.

The readers authenticate the raw commit and the complete tree hierarchy before
using them as a tracked-file map. They compare that map with the private index
and hash worktree regular-file bytes and symlink text directly. Owner-executable
mode is checked using Git's tracked mode semantics. Content filters, textconv
and normalized worktree content do not supply evidence.

Recorded path observations are retained through the entire checkout and
manifest/source dependency pass. Repeated reads must match the first
observation; they cannot silently replace it with a newer generation. A final
anchored pass detects earlier-file changes during later verification.

This is a drift-detection witness, not an atomic snapshot of a writable
filesystem. Serial observations cannot prove that no file changed after its
last observation. The authenticated application snapshots are the operative
inputs, and the remaining root-custodied OS boundary still includes the Linux
loader, Python standard library/native extensions and libc.

## Temporary-write and operation reporting

Operational verification creates and removes private temporary Git metadata.
The native entry reports that authority before creating the private view. The
Python operational entry reports it before `_activate_bootstrap_context`, which
itself performs generation verification. Reporting only inside `plan` would
be too late.

These private scratch writes are distinct from source-checkout mutation and
protected installation. A plan may create private metadata while performing no
protected installation. Inert `--self-test` and `--source-plan` do not establish
native-parent authority or perform a production plan/apply.

Normal and failure paths attempt to close retained private descriptors and remove
their private metadata. A cleanup failure produces HOLD and may leave private
metadata for inspection. Private directories have mode `0700`; Python uses the standard
library's descriptor-relative removal, and cleanup failure produces HOLD rather
than a successful cleanup claim. This custody boundary assumes the trusted root
principal does not substitute its own private temporary directory. Source reads
may have ordinary filesystem access-time effects; metadata regressions compare
mutation-relevant identities, including mtime and ctime, rather than treating
access-time updates as installation writes.

## Supported repository form and bounds

Both readers admit an ordinary SHA-1 Git repository with a physical `.git`
directory, branch `main`, and a checksum-valid version-2 index containing only
ordinary stage-zero entries. Split indexes, other index versions, extended
entry flags, assume-unchanged/staged entries, and mandatory extensions produce
HOLD before Git reads the private index. Optional index extensions are parsed
for framing and removed from the private copy. The source index is not rewritten.

Raw worktree bytes must match the authenticated blobs. Filter-normalized, LFS,
or CRLF-only clean worktrees are outside this contract; ignored files remain
outside its clean-source assertion. A packed `main` reference is supported, and
pack/index pairs remain pinned through the witness. These are deliberate
admission limits for an installer, rather than a promise to support every Git
repository feature.

| Resource | Maximum |
| --- | ---: |
| Tracked entries and loose objects | 100,000 each |
| Tree depth / individual tracked path | 32 levels / 4,096 bytes |
| Index, Git stdout, aggregate tree bytes or aggregate paths | 64 MiB each |
| One tracked file / total tracked reads | 512 MiB / 4 GiB |
| One loose object / total loose-object copies | 256 MiB / 512 MiB |
| Pack/index pairs / one pack / total packed bytes | 128 / 8 GiB / 32 GiB |
| One Git command / complete witness | 20 seconds / 180 seconds |
| Git child address space / CPU / core dump | 2 GiB / 20 seconds / 0 bytes |

The operating system may impose stricter limits. A limit breach causes HOLD;
there is no automatic fetch, repair, garbage collection or index conversion.

## Identity and compatibility

| Contract | This generation |
| --- | --- |
| Inner source | `ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v4.py` |
| Native source | `ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v5.c` |
| Manifest | `ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v2.conf` |
| Generation ID | `voidbuye2dormantsourcegen2_` followed by SHA-256 of the exact manifest bytes |
| Operation plan prefix | `voidbuye2dormantfirstentryinstall4_` |
| Apply confirmation | `INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V4_CREATE_ONLY` |
| Host policy | `VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V5` |
| Parent proof | Existing `VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PARENT_PROOF_V1` |
| Installed payload root and policy | Frozen V1 payload namespace and policy schema |

The native compiler receives the exact manifest digest and length through
`VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V5_MANIFEST_SHA256` and
`VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V5_MANIFEST_BYTES`. Neither source
contains the final ELF digest or the manifest's own digest. This keeps the
binding acyclic: source bytes, then manifest bytes, then compiled ELF.

A runtime HEAD remains operation evidence. An unrelated main commit can change
the requested operation plan without changing the immutable application
generation. Automatic adoption of different accepted payloads is not included.
In particular, this source repair does not advance the separately owned
runtime-head launcher V2 acceptance and installation lane.

## Focused verification

Run from a disposable checkout containing the exact generation files:

```bash
/usr/bin/python3 -I -S -B scripts/prove_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v4_generation.py
/usr/bin/python3 -I -S -B scripts/prove_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v4_terminal.py
/usr/bin/python3 -I -S -B scripts/prove_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v5.py
```

The generation proof exercises the closed manifest, thirteen-role parent
contract, sealed operational source access and actual Python repository
witness. The terminal suite preserves the sixteen canonical scenarios. The
native proof compiles the actual C source and exercises its real verification
helpers in disposable repositories, alongside static build and inert self-test
checks. The new cases cover split-index metadata, raw tree corruption, earlier
tracked-file drift and private configuration/object-store boundaries.

No executable Git filter or configured helper is installed by these fixtures.
Native include-C fixtures call the real helpers with explicit fixture admission;
they do not invoke production `main` or establish a privileged live-parent
handoff. Python fixtures that substitute admission or filesystem roots report
that limit. A source proof does not qualify Precision.

The workflow binds the exact event head, the intended eight-path addition,
seven non-workflow successor blob identities, and fourteen frozen source/lock
identities and their modes. Manual workflow replay verifies the pinned state
without claiming an event-diff comparison. Hosted CI must qualify the completed
successor head; the earlier #3442 green local result does not qualify it.

## Next lifecycle gate

Source verification and a merge are not installation. The repaired generation
requires its own reproducible binary candidate and exact acceptance, followed
by a reviewed materializer and host-policy installation contract. The original
Precision census still provides no evidence that this source has been fetched,
installed or executed on that host.

Credential access, service changes, wallet/signing, transaction/RPC operations,
payment acceptance, Work Credit mutation, presale/WC activation, treasury and
funds movement remain outside this source repair.
