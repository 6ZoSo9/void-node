# Apollyon directly self-observed locked process generation v1

Marker: `VOID_APOLLYON_CLAIM_SELF_OBSERVED_LOCK_V1`

Status: **source/test/CI candidate only**. This is not a protected Xiphos runtime and grants no claim, service, store, trainer or release authority.

## Concrete gap closed

The accepted native #3454 seccomp lock accepts an already-formed #3309 process identity. A caller could pass an untrusted or stale struct even though #3441 and #3454 inspect parts of its generation. This wrapper constructs the retained identity itself by calling the exact #3309 kernel-backed observer for **its own live leader PID**, checks the reviewed caller-supplied expected PPid, UID/GID slots, supplementary groups, executable inode and byte-exact NUL-delimited cmdline, then installs #3454's irreversible TSYNC/no_new_privs clone/fork prohibition. After successful installation it independently re-observes SELF through #3309, binds unchanged PID/start/PPid/UID/GID/executable device+inode and both retained pidfds live, then transfers only the original pidfd to the caller.

The API is `apollyon_claim_self_observed_lock_install_v1(...expected..., out)`. A caller must retain a reviewed executable FD and exact reviewed cmdline bytes **before** calling. On success it owns `out.retained.pidfd` and must close with `apollyon_claim_self_observed_lock_close_v1`.

This is a tangible native composition, not a statement that the expected executable FD and cmdline are authentic. Those expectations can still be caller-supplied without protected origin. Future fixed first-entry, host credential/sandbox, source-file ancestry and process-generation qualification must establish the expectations' provenance.

## Irreversible process boundary

The library installs its security filter **in the calling process**, not a remote PID. Required publisher child creation must happen before the lock. It is unsafe to retry after failure because `no_new_privs` and/or seccomp may have already been installed. Discard the process on any failure and never reuse it as claim/release authority.

The underlying #3454 x86_64 filter forbids clone, clone3, fork, vfork and x32 syscall-ABI escape; `SECCOMP_FILTER_FLAG_TSYNC` must succeed and the singleton task-set check must remain stable. This wrapper does not broaden the filter or relax any previous sandbox.

## Proof and non-authority

Hosted proof hashes exact reviewed #3309, #3441 and #3454 source/header blobs, builds the complete native candidate three times using GCC, and requires identical ELF bytes. The disposable self-test forks isolated children for:

- self-observed positive identity + installed no-clone and independent post-lock observation;
- wrong expected PPid, UID, executable, cmdline and supplementary group rejection;
- live secondary pthread rejection before filter installation;
- actual post-filter `fork`, `clone3` and `pthread_create` denial;
- retained pidfd liveness and proper close;
- non-`--self-test` invocation HOLD.

All tests run on hosted Linux fixture processes only. The implementation is a library without a `main` or fixed Xiphos path.

```text
kernel_self_generation_observed=true
no_task_creation_lock_installed=true
protected_expected_source_origin_proven=false
xiphos_host_qualification_performed=false
durable_attempt_claim_performed=false
training_execution_performed=false
funds_movement=false
```

It does not install accounts, packages, systemd units, services, sockets, protected stores, attempt claims or trainer releases. No private keys, signing, wallets, transactions or funds are accessed.

## Integration handoff

The future claim root revalidator or publisher must prove a protected first-entry and authenticate fixed expected executable/cmdline/UID/group policy before using this wrapper. It must retain and independently revalidate process identity, executable/source, peer credentials, service state, current Xiphos host policy and the #3233/#3357 authorization/claim lineage at each actual authority-bearing boundary. A successful source self-test is not a host qualification or runtime lease.

Keep Draft. PROTECT THE CORE.
