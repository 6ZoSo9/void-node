# Apollyon claim-store callback failure-domain containment plan V1

Status: **source/test/CI plan only. No Xiphos execution, store mutation, training, credential, transaction, or funds authority.**

This plan binds the remaining callback failure-domain gate in #3549 at exact parent
`187a4da4992b7d81330b9474e535b8af631de0d4`. The current source deliberately rejects callback-returned native Promises
without reading `.then`, `constructor`, or `Symbol.species`. That protects the core from
caller-controlled Promise accessors, but it cannot contain a Promise that was already
rejected by a synchronous-looking callback: under Node's strict/default unhandled-rejection
behavior, that rejection can terminate the containing process after the core has already
returned a namespaced HOLD.

The current disposable proof already demonstrates that process-level availability hazard.
The gap exists at four synchronous provider surfaces:

1. transaction acquisition result;
2. core revalidator result;
3. transaction release result; and
4. native-bridge revalidator result.

## Why this is a process-boundary problem

Adding `.catch()` or `.then()` inside the reusable core is not accepted as a generic fix.
Promise reaction registration performs constructor/species work and can execute
caller-controlled accessors on an untrusted Promise. The current getter-safe rejection
boundary is therefore preserved.

The future runtime candidate must instead place the claim-store operation and all admitted
callbacks in a one-request isolated OS process launched under an exact reviewed source
generation. The supervisor must use strict unhandled-rejection behavior, a closed
descriptor/environment boundary, and treat any signal/non-zero exit as HOLD. A success
receipt is not authoritative while merely buffered: the supervisor may acknowledge success
only after the child has passed a post-callback event-loop checkpoint and exited cleanly.

If the child fails after store mutation may have occurred, the supervisor must report an
**indeterminate** outcome and must not automatically replay the request. Existing durable
claim/authorization semantics and terminal generation/peer/source revalidation remain
mandatory.

## Terminal supervisor and process-tree closure (October 19)

A single request per child is not enough to establish one failure domain. A
callback could request `process.exit(0)` after buffering an apparently valid
receipt but before an actual trusted event-loop checkpoint, create a detached
grandchild/worker thread that survives the first child's exit, or schedule a
late write between a pre-exit revalidation and the apparent clean exit.

The **future** supervisor must therefore prove all thirteen additional properties:

1. The completion/checkpoint marker originates from a supervisor-custodied
   control plane unavailable for forgery by arbitrary callback code.
2. Callback-requested early process exit cannot count as an authenticated
   clean success, even when the exit code is zero and a receipt was buffered.
3. Child runtime is bounded. Timeout forces containment plus termination and
   *reaping of the entire request-owned process tree*, then HOLD.
4. Every descendant process and worker thread is absent or joined and
   quiescent before any success acknowledgment; merely observing the original
   child PID exit is insufficient.
5. A **supervisor-held fencing lease** remains owned across worker-tree exit,
   the final protected generation/claim/peer/source checks, and the irreversible
   success decision. No lease-loss/reacquire ABA is accepted.
6. When an abnormal exit or timeout leaves mutation state unknown, classify
   **indeterminate** even if the worker did not send an explicit mutation flag;
   never retry automatically or infer no effect from missing receipt bytes.
7. Terminal source/store/peer revalidation occurs *after* worker-tree
   quiescence and *before* acknowledging success, while the supervisor still
   owns the applicable fencing capability.
8. **Supervisor-owned receipt framing is byte-bounded**, with one canonical
   success frame of fixed maximum size, unambiguous length/delimiter and final
   EOF. Oversized/truncated/duplicate/trailing frames and missing EOF are HOLD;
   a buffered or partially parsed receipt never counts as success.
9. **Worker stdout, stderr, and diagnostic output are bounded independently**
   before any parent-side buffering. On overflow, stop accepting output, reap
   the entire worker tree, and fail closed. If any store mutation may have
   occurred or its status is unknown, preserve indeterminate classification
   and the fencing lease through terminal post-exit revalidation. No diagnostic
   flood can authorize success or trigger an automatic replay.

10. **Kernel resource limits must apply before callback execution.** The
    supervisor owns an enforced, non-escapable per-request containment envelope
    covering memory and swap use, process/worker creation, CPU consumption and
    open file descriptors (e.g. reviewed cgroup-v2 `memory.max`,
    `memory.swap.max`, `pids.max`, `cpu.max` and `RLIMIT_NOFILE`).
    The supervisor lives outside these worker limits. Workers/descendants
    cannot relax their limits or migrate outside the contained process group.
    Separate PIDs and a deadline do not prevent a callback from exhausting
    the host before the timeout.
11. **Quota/OOM events cannot authorize success or automatic replay.** The
    supervisor observes cgroup and kernel quota/kill evidence; exhausted
    workers/descendants are terminated and reaped. Any unknown post-mutation
    effects are classified indeterminate and fenced through post-quiescence
    source/store/peer checks. A forged clean exit or buffered success frame
    cannot obscure a breached quota.
12. **A supervisor crash cannot strand an executable old worker across fence reuse.**
    A supervisor SIGKILL/OOM/unplanned exit must cause old worker/descendants
    to be killed or externally quarantined and proven quiescent before any
    successor may own an effective publication fence. A worker parent-death
    mechanism alone is insufficient without race-safe parent identity checks
    and out-of-process cleanup/recovery. Never interpret the supervisor's
    absence as evidence that its request had no effect.
13. **Restart authority must be backed by durable, monotonic fencing.**
    A supervisor-owned process lock can disappear while a worker survives.
    Persist exact in-flight request/epoch/mutation-UNKNOWN identity in a
    separately authoritative store, or enforce an equivalent non-reusable
    generation fence at every protected mutation. Restart/reacquire must HOLD
    while any earlier worker generation can write. Only independently proven
    worker-tree quiescence plus terminal store/winner/claim/source revalidation
    may resolve the record. UNKNOWN effects remain indeterminate and cannot
    authorize automatic retry or a second one-time consumption.

### Exact reviewed resource ceilings

The future worker envelope is not satisfied by merely claiming that a resource
is "bounded". The plan fixes the maximum accepted configuration values below;
an implementation that raises any of them requires a new reviewed plan
generation.

| Resource | Exact maximum |
| --- | ---: |
| worker deadline | 5,000 ms |
| full worker-tree reap | 5,000 ms |
| canonical success receipt frame | 65,536 bytes |
| stdout capture | 8,192 bytes |
| stderr capture | 8,192 bytes |
| diagnostic capture | 8,192 bytes |
| memory | 268,435,456 bytes (256 MiB) |
| swap | 0 bytes |
| process/thread PIDs | 32 |
| CPU quota / period | 100,000 / 100,000 µs (1 CPU) |
| open descriptors | 64 |
| single-file size via RLIMIT_FSIZE | 1,048,576 bytes |
| private writable filesystem | 16,777,216 bytes (16 MiB) |
| read bandwidth | 16,777,216 bytes/s |
| write bandwidth | 8,388,608 bytes/s |
| read IOPS | 1,024/s |
| write IOPS | 512/s |

These ceilings are intentionally conservative and align with the already-bound
source generation: publish requests are capped at 65,536 bytes, store records
at 256 KiB, and the transaction-lease helper already uses a 5-second timeout
and 8 KiB output buffer. The larger 1 MiB file ceiling leaves room for
implementation metadata while remaining finite; the private filesystem and
I/O ceilings prevent a hostile callback from converting a short request into
host-scale disk consumption. Future implementation must enforce the CPU,
memory/swap, PID, FD, file-size, filesystem-capacity and I/O limits before
callback execution and must prevent descendants from escaping them.

These are testable requirements for a subsequent implementation, **not**
existing installed safeguards. Plan/proof CI checks every exact ceiling
independently as well as the boolean contract.
Any future integration needs executable early-exit, inherited-descendant,
timeout/kill/reap, fencing-loss, **supervisor SIGKILL with surviving old worker**,
restart/reacquire denied until durable fencing and quiescence, post-exit-race,
kernel quota exhaustion and OOM/error-classification adversaries. Nothing in this
V1 plan authorizes host runtime execution, claim publication, credentials,
training or funds movement.

## Exact bound generation

- #3549 head: `187a4da4992b7d81330b9474e535b8af631de0d4`
- core blob: `2d72a28e9daaeabcab58975a6f362c438c720592`
- transaction lease blob: `445480e625e01e44be8722709d56d5a6541099e2`
- native bridge blob: `69694ab1c8ffd8021817a449255eca956f91a7e8`
- core proof blob: `bed4c6fe3896ff48dfbc873d078fac943528fa5f`
- native proof blob: `848a061a0b246e138ec8ed775ed8a87f159476f6`

Content-addressed plan ID (successor to historical `voidapollyonclaimcallbackcontain1_0e0794baead1aa6571c8f0820a32d5951e24dfefb164445c0591c1d94bc5166c`):

`voidapollyonclaimcallbackcontain1_17848cb11147fb0284268258e784826daf75630687abec922c4dd5d972b7be68` (previous kernel-resource generation: `voidapollyonclaimcallbackcontain1_23da91144e3da950951f871aba23166aedd6acbf13db061f4623728a8d1d656a`)

## October 20 — semantic negative-proof and source-role binding

The October 20 semantic-negative-proof generation preserved its then-current
plan JSON and content ID; the later supervisor-crash requirements update
produces the new content-addressed plan ID shown above.
The source-only validation proof now rejects each intentionally corrupted
requirement, authority field, unknown success gate, or missing Promise
surface for the **exact named semantic reason**. Merely reaching the
terminal `content_identity_invalid` check no longer counts as a negative
test: that is tested only for the dedicated plan-ID mutation.

Each inherited `bound_sources` role must name its own exact reviewed
source path and blob; an otherwise correctly pinned *different* source
cannot be substituted for `core`, `transaction_lease`, `native_bridge`
or the two proofs. Two new negative cases swap core/lease roles and
duplicate the bridge record under the core role; both must fail at
`bound_source_role_invalid:core`, **not** at the final content hash.
The earlier semantic-proof generation increased the source-only adversary count from 44 to **48**; the supervisor-death generation raised it to **50**. The current exact-ceiling generation adds 18 per-resource adversaries for **68** total, with explicit
proof output `negative_cases_failed_at_semantic_gate=true` and
`bound_source_role_identities_enforced=true`.

This improves plan assurance only. It is **not** callback containment,
a protected worker implementation, callback-source authentication, an
Xiphos deployment, or authority for claim publication, release, training,
credentials, signing, transaction or funds.

## Required future runtime properties

The plan requires a separate OS-process failure domain, one request per isolated process,
`--unhandled-rejections=strict`, no custom rejection suppression, exact callback-source
custody, inherited-FD allowlisting, minimal environment, a post-callback event-loop
checkpoint, clean-exit gating before success acknowledgement, abnormal-exit HOLD,
**bounded canonical IPC receipt framing and independent stdout/stderr/log capture budgets**,
pre-exec exact memory/swap/PID/CPU/FD/file-size/filesystem-capacity/I/O quotas and quota/OOM-event fencing,
supervisor-crash old-worker quiescence and durable restart-era fencing,
post-mutation indeterminate handling without automatic replay, and terminal revalidation of
store generation, peer identity, and callback source identity.

This plan does **not** implement that runtime. It records the exact missing security
contract so a future candidate cannot claim containment by attaching Promise handlers or
by treating a buffered success receipt as final.

Next gate:
`DISTINCT_REVIEW_FAILURE_DOMAIN_PLAN_THEN_BUILD_ISOLATED_RUNTIME_CANDIDATE_V1`.

PROTECT THE CORE.
