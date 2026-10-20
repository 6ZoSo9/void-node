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

## Exact bound generation

- #3549 head: `187a4da4992b7d81330b9474e535b8af631de0d4`
- core blob: `2d72a28e9daaeabcab58975a6f362c438c720592`
- transaction lease blob: `445480e625e01e44be8722709d56d5a6541099e2`
- native bridge blob: `69694ab1c8ffd8021817a449255eca956f91a7e8`
- core proof blob: `bed4c6fe3896ff48dfbc873d078fac943528fa5f`
- native proof blob: `848a061a0b246e138ec8ed775ed8a87f159476f6`

Content-addressed plan ID:

`voidapollyonclaimcallbackcontain1_0e0794baead1aa6571c8f0820a32d5951e24dfefb164445c0591c1d94bc5166c`

## Required future runtime properties

The plan requires a separate OS-process failure domain, one request per isolated process,
`--unhandled-rejections=strict`, no custom rejection suppression, exact callback-source
custody, inherited-FD allowlisting, minimal environment, a post-callback event-loop
checkpoint, clean-exit gating before success acknowledgement, abnormal-exit HOLD,
post-mutation indeterminate handling without automatic replay, and terminal revalidation of
store generation, peer identity, and callback source identity.

This plan does **not** implement that runtime. It records the exact missing security
contract so a future candidate cannot claim containment by attaching Promise handlers or
by treating a buffered success receipt as final.

Next gate:
`DISTINCT_REVIEW_FAILURE_DOMAIN_PLAN_THEN_BUILD_ISOLATED_RUNTIME_CANDIDATE_V1`.

PROTECT THE CORE.
