# VOID AL durable safe-mode latch v1

Marker: `VOID_AL_DURABLE_SAFE_MODE_LATCH_V1_20260824`

## Purpose

Close `HOLD_AL_DURABLE_SAFE_MODE_STATE_REQUIRED` at the source/proof boundary.

A process-local Alignment Layer safe-mode bit is not a sufficient production safety boundary. If a critical AL failure occurs and the process subsequently exits, crashes, or restarts, startup must not reinterpret the absence of process memory as permission to resume mutation.

This generation adds a small dedicated durable latch and binds the existing explicit AL block-commit bootstrap to it. The normal node entry point still does **not** mount that bootstrap, so this merge remains inert until a separate activation lane explicitly preloads it.

## Durable state contract

The latch uses an operator-selected absolute private directory supplied through:

`VOID_AL_DURABLE_SAFE_MODE_ROOT_V1`

Production enablement requires that directory to have already been deliberately initialized through the explicit source API confirmation:

`initializeVoidAlDurableSafeModeLatchV1`

Runtime startup does not create the state implicitly. Missing state is a HOLD rather than a fresh `running` assumption.

The directory must be a real current-UID-owned private directory with no group/other permission bits. The two authority files are:

- `void-al-durable-safe-mode-v1.json`
- `.void-al-durable-safe-mode-v1.lock`

Both are private single-link regular files at mode `0600` when present.

The state is closed-schema and binds:

- marker/version/Chain-2050 identity;
- monotonic uint64 generation;
- exact `running` or `safe_mode` mode;
- first safe-mode reason/evidence;
- latest safe-mode reason/evidence; and
- a deterministic state fingerprint.

The all-zero SHA-256 sentinel is not valid incident evidence.

## Root-generation pinning

The installed durable runtime pins the exact durable-root directory as an open file descriptor ONCE, at install, for the lifetime of the process — it never re-resolves the root by pathname for any later operation. Every state, authority, temporary-file, rename, unlink, read, and fsync call for that installed runtime derives from that retained descriptor, addressed via `/proc/self/fd/<fd>/<name>` rather than by pathname. This is what Linux gives userspace in place of a real `openat(2)` binding (Node's `fs` module has none): the kernel resolves the trailing path components against the dentry the descriptor already references, not against a re-walked string, so a pathname-level replacement of the root after install cannot substitute what the runtime actually operates on.

As the FIRST operation inside every top-level mutation's held authority — immediately after acquisition, before the durable-state read and before any SegStore mutation, and never as a separate check performed before acquiring — the runtime re-admits the *configured canonical pathname* and requires its device/inode to still equal the retained descriptor's admitted generation. Running this check only after authority acquisition, inside the exact same held critical section as the mutation itself, closes a check-then-acquire ordering gap an earlier revision left open: a canonical-root pathname generation could previously move after a standalone pre-acquisition canary passed but before the separately-acquired mutation authority's critical section actually began. Under the current ordering, nothing but this synchronous check runs between acquisition and the canary, so there is no window left to move into. A mismatch HOLDs — durably, via the retained descriptor and the SAME authority token already held (never a fresh acquisition), never via the drifted candidate — before any SegStore mutation is attempted; it never adopts the replacement generation. This canary treats *any* admission failure the same way, not only an outright device/inode mismatch: a missing path, a symlink substituted at the canonical name, wrong owner/mode, or any other lstat/open failure during re-admission is caught and converted into the identical fail-closed durable `ROOT_DRIFTED` latch via the retained root — none of those failure shapes are allowed to escape as a raw, unlatched admission error. Standalone `initialize`/`read`/`latch` callers (a one-shot admin script, a watchdog) use a bounded per-call admit-then-pin instead of a lifetime-retained descriptor, and fail closed on the same admission-to-pin generation check.

The status/truth surface performs the identical read-only admission check — see "Unified cross-process authority" below — but without ever acquiring the authority and without ever latching or mutating anything, so a canonical-root drift is visible to a status caller even while the installed writer is otherwise idle and has not yet attempted a mutation of its own.

Procfs-fd indirection is verified explicitly on first use; if it cannot be verified, this fails closed (`AL_DURABLE_SAFE_MODE_PROCFS_UNAVAILABLE`) rather than silently falling back to unsafe pathname resolution.

The pinned-root object itself (`PinnedDurableRootV1`) is immutable for its lifetime — its fields are `readonly` and the object is `Object.freeze`d at mint time — and is runtime-branded into a module-private set at the moment `pinDurableRootGenerationV1` successfully returns it. Every exported function that accepts a `PinnedDurableRootV1` checks that brand FIRST, before touching any of its fields, and `closePinnedDurableRootV1` removes it. This closes two otherwise-real gaps: a caller cannot redirect an already-authorized pin to a different root by mutating `dirFd`/`rootPath` in place after acquiring authority for it (freeze prevents the reassignment outright), and a hand-constructed object that merely has the right shape — including one carrying an attacker-chosen `dirFd` number — is never trusted by any exported operation, including `closePinnedDurableRootV1` itself (which previously would have closed whatever fd such an object named).

## Persistence boundary

State mutation uses a create-only private authority file plus durable replacement:

1. create the authority file with `O_EXCL | O_NOFOLLOW`, addressed through the retained root descriptor;
2. fsync the containing directory (the authority file's own content is informational only and is not itself fsync'd — only its directory entry's existence is safety-relevant);
3. read and validate the exact current state;
4. write the complete next state to a create-only temporary file;
5. fsync the temporary file;
6. rename it over the state path;
7. fsync the containing directory;
8. remove the authority file; and
9. fsync the directory again.

A surviving authority file is not treated as stale automatically, on any basis — not its age, not its recorded PID, not a liveness check against that PID. It means the previous transition may have ended ambiguously and produces `AL_DURABLE_SAFE_MODE_RECOVERY_REQUIRED` at admission/read time, or the distinct, non-claiming `AL_DURABLE_SAFE_MODE_AUTHORITY_BUSY` when an already-running caller's bounded contention-retry is exhausted — BUSY never asserts recovery/crash truth, because ordinary brief contention and a dead holder are genuinely indistinguishable from this file alone. This generation deliberately prefers a persistent HOLD over inventing crash recovery that could clear a real incident, and deliberately never grants authority on the basis of who — or whether anyone live — is recorded as holding it. A release (unlink + directory fsync) failure is never reported as a successful release; it always propagates — and it also poisons the in-process pinned-root handle (see below), never merely a friendlier error.

**Ambiguous persistence never auto-releases.** If a durable-state write itself fails after mutation has been attempted (`AL_DURABLE_SAFE_MODE_PERSISTENCE_AMBIGUOUS` — the write may or may not have actually landed), `withHeldAuthorityV1` deliberately does **not** release the authority: releasing would unlink the exact crash/recovery witness a later strict read needs. Instead the in-process capability token is spent (never reused) while the on-disk authority file is left in place, and the pinned-root object itself is added to an in-process poison set so that every later operation against that SAME object — not just a fresh admit-then-pin elsewhere — refuses immediately with `AL_DURABLE_SAFE_MODE_RECOVERY_REQUIRED`, before executing any further mutation or latch body at all. This applies uniformly whether the ambiguous write was the primary durable-state write or a same-authority safe-mode persist attempted while already holding the mutation authority (the runtime layer preserves the ambiguity signal across its own error wrapping via `.cause` specifically so this retain-vs-release decision, made inside the authority layer, is never short-circuited by a higher layer's own error type). A release failure for any other reason likewise poisons the pinned-root handle, so this same in-process runtime cannot proceed as though a not-cleanly-completed release had actually left the authority free.

## Authority capability binding

Acquiring the unified authority returns an opaque, in-process capability token (an unexported-value `symbol`) minted only inside the acquire path and handed to callers exclusively through `withHeldAuthorityV1`'s callback. `latchWithinHeldAuthorityV1` and the while-held state read each require that exact token and verify it against the live holder record before doing anything; release is reachable only from inside `withHeldAuthorityV1` itself, which always releases the exact token it minted. `acquireAuthorityV1`/`releaseAuthorityV1` are not exported. This means a caller cannot invoke the "while-held" latch/read primitives without actually holding the authority, and cannot drive a release against a generation it did not itself acquire — both are enforced by unforgeable token identity, not by caller discipline or naming convention.

Separately, each successful acquisition also binds to the *exact filesystem generation* (device/inode) of the authority file it created, captured immediately at create time. Release re-verifies that generation immediately before unlinking and refuses — fail-closed, `AL_DURABLE_SAFE_MODE_AUTHORITY_GENERATION_REPLACED` — to unlink any file that does not still carry it.

**Trust-boundary limitation, stated explicitly:** this generation binding *detects and fails closed on* a same-UID authority substitution that is already present AT THE PRE-UNLINK VALIDATION POINT — release's own `lstat`, immediately before it unlinks; it does **not** *prevent* one, and its guarantee is narrower than "no foreign file is ever removed by us." If a foreign generation is already sitting at the authority pathname WHEN THAT `lstat` RUNS, the mismatch is caught and release fails closed (`AL_DURABLE_SAFE_MODE_AUTHORITY_GENERATION_REPLACED`) without ever unlinking it. But the `lstat` and the `unlink` are two separate syscalls, not one atomic operation: Node's `fs` module has no `openat`-style directory-relative unlink that could bind the unlink call itself to the exact inode the `lstat` just verified, and plain POSIX permissions grant any process running as the same UID unlink rights on the file regardless of its own mode. A hostile same-UID process that replaces the authority file in the narrow window strictly AFTER this `lstat` succeeds but strictly BEFORE the subsequent `unlink` executes is therefore **not** caught by this check at all — the unlink would then remove whatever occupies the pathname at that later instant, which could be the intruder's own replacement rather than the legitimate holder's own generation. What this design guarantees is exactly, and only: a foreign generation observed AT the pre-unlink validation point is never accepted as a clean release of the legitimate holder's own generation and is never unlinked as a result of that check passing; a foreign generation that lands strictly after that validation point is entirely outside this guarantee. Defending against a hostile same-UID adversary outright is out of scope for a plain-file mutual-exclusion primitive and is not claimed here; every "serialized"/"one shared authority" claim elsewhere in this document is likewise scoped to compliant same-UID processes, not to a hostile same-UID racer — and `VOID_AL_DURABLE_SAFE_MODE_AUTHORITY_V1` now exposes that scope as data (`cross_process_mutation_and_latch_serialized_scope`, and `authority_release_atomic_against_hostile_same_uid_racer: false`), not only as this prose. This trust boundary is tracked as an explicit activation gate: `HOLD_AL_DURABLE_SAFE_MODE_SAME_UID_NAMESPACE_TRUST_REQUIRED`.

## Unified cross-process authority

The single authority file above serializes BOTH durable latch transitions AND complete top-level SegStore mutations — one shared serialization domain, not two coordinated ones. For a mutation: acquire the authority → reread durable state fresh, while it is held (never trusting an in-memory cache) → refuse if already `safe_mode` → perform the complete top-level mutation → persist any child/latent safe-mode transition discovered during that mutation, still inside the same held authority → release. For an external/watchdog latch: acquire the same authority → fresh state → durably latch → release. Any process with filesystem access to the root may attempt a latch this way — watchdog latch authority is independent of, and not gated behind, whatever process currently holds writer status.

Only the three true top-level entry points are individually serialized this way:

- `saveBlock`
- `saveAuthorizedLegacyCommitDirectV2fs`
- `replayWalAllBestEffort`

`saveBlockCommit` and `persistHeadAtomic` — reached only as nested calls from within those three — are deliberately NOT independently re-guarded by the durable layer: doing so would acquire the same authority a second time from within an already-held critical section of the same synchronous call stack, which cannot succeed, and would in any case reopen a gap between two acquire/release cycles inside what must be one atomic logical commit. They remain guarded by the existing, separate child AL runtime (#1410/#1411), unchanged.

Because check-then-mutate happens entirely inside one held acquisition, and the authority is a plain mutual-exclusion primitive with no per-holder identity, this closes the specific race where one process could keep committing after a different process durably entered safe mode: whichever side — a mutation or a latch — acquires the authority first completes its full critical section before the other can even begin, and any acquisition that begins after a latch has released is guaranteed, by its own mandatory fresh read, to observe that latch.

A fresh process generation reading the same durable root therefore comes back in effective safe mode. Restart is not RESUME.

The status/truth surface (`getVoidAlignmentLayerBlockCommitDurableRuntimeStatusV1`) never answers from a cache alone: every call takes a fresh, lock-free on-disk snapshot read and answers from that, so an external watchdog latching safe mode while this process's own writer is otherwise idle is visible immediately, not only after this process's own next mutation attempt. If that fresh read itself fails, status fails closed (`effective_safe_mode=true`) rather than silently reporting a last-known-good cached value that could itself be exactly the kind of stale answer this exists to prevent.

Before that on-disk read, status also performs a READ-ONLY re-check of the canonical root pathname's admission against the retained descriptor's generation — the identical check the mutation-path canary performs, but never acquiring the authority and never latching or mutating anything. This is necessary because the on-disk snapshot read itself goes through the retained fd (`/proc/self/fd/<fd>/...`), never through the canonical pathname, so it cannot by itself detect that the pathname has drifted. If the configured canonical pathname no longer names the retained generation (missing, replaced, wrong owner/mode, or any other admission failure) while the installed writer is otherwise idle, status reports `effective_safe_mode=true`, `root_generation_current=false`, and a specific `durable_read_error_code` immediately — it does not wait for, and does not require, an actual mutation attempt to surface that drift. The cached `durable_*` fields are still returned in that case (never cleared), but only as explicitly stale evidence: `durable_read_fresh` is `false` whenever `root_generation_current` is `false`, exactly as it already is whenever the fresh on-disk read itself fails. A normal status call against an unchanged root remains fresh/green (`root_generation_current=true`, `durable_read_fresh=true`).

## No automatic resume

This generation implements **no** resume, clear, reset, stale-lock recovery, or automatic unlock API.

That is intentional. Closing the crash/restart persistence gap must not silently invent a second emergency-control authority domain.

The remaining follow-up is therefore narrower and explicit:

`HOLD_AL_DURABLE_SAFE_MODE_RESUME_AUTHENTICATION_BINDING_REQUIRED`

A future reviewed lane should bind durable-latch clearing to the existing Sovereign Emergency `RESUME` state machine and its high-assurance Primary governance-attestation role, with exact state/certificate/replay binding. That future lane is separate from this one and is not activated here.

## Activation truth after this generation

This source closes only the durability/restart HOLD. Production AL remains **not ready** because these independent gates remain:

- `HOLD_AL_DURABLE_SAFE_MODE_RESUME_AUTHENTICATION_BINDING_REQUIRED`
- `HOLD_AL_LEGACY_INDEX_RUNTIME_NOT_RETIRED`
- `HOLD_AL_BLOCK_COMMIT_BOOTSTRAP_NOT_MOUNTED`
- `HOLD_AL_PROPOSER_AUTHORITY_SOURCE_OPERATIONAL_VALIDATION_REQUIRED`
- `HOLD_AL_DURABLE_SAFE_MODE_UNIFIED_AUTHORITY_OPERATIONAL_REVIEW_REQUIRED` — any writer crash while the unified authority is held now blocks *all* further mutation and latch progress on that root, not only actual safe-mode incidents, until an operator manually removes the surviving authority file. This is a materially broader manual-recovery surface than a process restart alone required before, and must be a deliberate, operator-acknowledged tradeoff, not a discovered surprise, before any activation lane.
- `HOLD_AL_DURABLE_SAFE_MODE_LOCAL_FILESYSTEM_REQUIRED` — the unified authority's mutual-exclusion guarantee depends on atomic `O_EXCL` creation and durable directory-fsync semantics. The durable root must be local POSIX storage (ext4/xfs/btrfs-class); network filesystems (NFS and similar) are excluded, since their `O_EXCL`/fsync guarantees are not reliably atomic.
- `HOLD_AL_DURABLE_SAFE_MODE_PROCFS_DEPENDENCY` — root-generation pinning and all authority/state path resolution for an installed runtime depend on a Linux-style `/proc` filesystem being mounted and well-formed. This is a new, previously-unstated environmental precondition.
- `HOLD_AL_DURABLE_SAFE_MODE_SAME_UID_NAMESPACE_TRUST_REQUIRED` — the authority's generation-bound release (see "Authority capability binding" above) detects and fails closed on a same-UID authority-file substitution but cannot atomically prevent one: a hostile process running as the SAME UID as the durable-AL process can still win a race between release's `lstat` and its `unlink`. Every "cross-process serialized"/"one shared authority" claim in this document is scoped to compliant same-UID processes, not to a hostile same-UID racer. Operating this generation in an environment where an untrusted process can run as the same UID as the durable-AL process is not authorized by this lane.
- `HOLD_AL_DURABLE_SAFE_MODE_CONSTRUCTOR_REPLAY_SWALLOWED` — `SegStore`'s constructor (`src/chain/seg_store.ts`) invokes `replayWalAllBestEffort()` inside a `try { … } catch (err) { recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts(...) }` that records but never rethrows. If the durable runtime is installed and that WAL replay durably latches safe mode (or throws for any other reason) during construction, the exception — including a `VoidAlBlockCommitRuntimeHeldErrorV1` — is swallowed at that call site: the `SegStore` instance is still considered successfully constructed. The durable latch write itself still lands (persistence happens synchronously, inside the held authority, before the throw is swallowed one frame up), so the durable *state* is not lost — but the constructor's own success/failure signal at that moment is. `seg_store.ts` is out of scope for this generation (explicitly excluded from the files this lane may touch), so this is **not** repaired here; it is carried forward as an explicit, tracked activation HOLD rather than silently dropped, and `scripts/prove_void_al_durable_safe_mode_latch_v1.ts` asserts the exact swallow site is still present so a future silent removal of this HOLD (without an accompanying real fix) is itself a proof failure.

`activation_ready=false`

The historical raw/head writers in `src/index.ts` are not granted durable-AL authority by this change. The normal node entry point still does not import the bootstrap. The production proposer-authority source still needs separate operational trust/freshness/replay validation.

## Authority boundary

This lane is source/proof/CI only. It does not:

- deploy or restart a node;
- change a launcher, service, or live environment;
- mount or enable AL on Mainnet-0;
- sign or submit a PAUSE/RESUME certificate;
- read or mount the Sovereign Primary or Recovery USB;
- change ordinary node authentication;
- access a wallet or signer;
- mutate validators or Work Credits;
- construct or broadcast a transaction;
- mutate Chain-2050 live state;
- touch treasury/liquidity; or
- move funds.

A later merge is not runtime activation. Initializing a real durable latch directory, mounting the bootstrap, and every emergency RESUME remain separate operation-bound authorization gates.
