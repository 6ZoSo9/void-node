# Apollyon self-process no-clone lock v1

Marker: `VOID_APOLLYON_CLAIM_NO_CLONE_LOCK_V1`

Status: **native source/test/CI candidate only**. Nothing is installed or invoked on Xiphos. No service, socket, store, claim, release, training, signing, transaction, or funds authority.

## The precise remaining gap

Accepted #3309 binds one live process generation's leader identity. Accepted #3441 requires two singleton task-set snapshots for that already-reviewed process. Neither observation prevents the process from creating a new thread between the last census and the protected claim/release operation.

This Linux **x86_64-only** candidate adds a one-way *in-process* kernel restriction. The function `apollyon_claim_no_clone_lock_install_v1(reviewed_identity, out)`:

1. Requires the supplied retained #3309 identity PID to equal the invoking process PID/TID; it cannot install a filter into a different process.
2. Requires the exact #3441 two-census singleton observation of that process, with live retained pidfd and exact PID/start generation.
3. Irreversibly sets `no_new_privs` and installs a BPF seccomp filter using `SECCOMP_FILTER_FLAG_TSYNC`. The installation must return **zero**; a nonzero TID (divergent filter tree), error, or unsupported ABI fails closed.
4. On native `AUDIT_ARCH_X86_64`, returns `EPERM` for `clone`, `clone3`, `fork`, `vfork` and every syscall carrying the x32 ABI bit. A different syscall ABI is killed rather than allowed through. All other syscalls retain their already-installed systemd/kernel policy; this filter does not grant permissions.
5. Requires `PR_GET_NO_NEW_PRIVS=1`, `PR_GET_SECCOMP=SECCOMP_MODE_FILTER`, and a second #3441 singleton census with unchanged retained proc/task generation before returning success.

This is **not** generic process sandboxing. It deliberately blocks all future fork/clone by this process, not just `CLONE_THREAD`; a revalidator that must spawn its publisher must finish that spawn before installing the lock. Inherited seccomp policies cannot be relaxed by the added filter.

## What the result proves—and does not prove

A successful call proves the current x86_64 process entered a synchronized seccomp filter that rejects the reviewed task-creation syscalls, while the input retained pidfd and two singleton censuses stayed valid at the function boundary. Seccomp filters are inherited by children if creation is allowed and persist across exec; this filter denies creation. It does **not** prove the origin of the caller-supplied #3309 identity, reviewed service/launcher source, protective process ancestry, other security predicates, or a live Xiphos host policy.

An error after `no_new_privs` or seccomp installation may leave that process **partially and irreversibly restricted**. The caller must abort/discard the process, not retry as if nothing happened. A source assertion cannot prove the absence of earlier unreviewed side effects by a transient second thread, and external privileged injection or alternate kernel task facilities are not addressed here. The future integrated revalidator/publisher/releaser must prove reviewed source/provenance, no hostile task creation outside these intercepted syscall paths, and full current-host security state before any store or trainer mutation.

There is **no** root/host installer, no unit activation, no AF_UNIX claim service, no request/body reader, no attempt writer, and no trainer-release mechanism in this candidate. The C library has no `main`; its harness accepts **only** `--self-test` and fails closed otherwise.

## Real-kernel hosted adversaries

The focused proof compiles the *unchanged, hash-pinned* #3309 and #3441 native sources plus this library and a disposable forked-child harness. It requires three reproducible builds, one-TID success, bad PID/start rejection, a real live secondary pthread rejection **without installation**, successful TSYNC filter and post-census, raw syscall-denial tests for `clone/clone3/fork/vfork/x32`, failed `pthread_create`, and ordinary `getpid` availability. Every other executable mode returns `HOLD=source_only_self_test_only`.

No durable attempt claim or training action is performed. `protected_caller_origin_proven=false`, `host_installation_performed=false`, `durable_attempt_claim_performed=false`, `training_execution_performed=false`, and `funds_movement=false` remain authoritative.

## Integration obligations

Use this only in the future **same process** carrying the reviewed #3309 identity and a trusted source/provenance proof. Call only after required publisher spawn and before the first protected claim request/body, before protected-store mutation or before release, as appropriate. Revalidate retained pidfd, process identity, current systemd/credential/host state and the #3233/3357/3333 durable-claim lineage at the actual authority boundary. Never promote this source test into live permission by itself.

PROTECT THE CORE.
