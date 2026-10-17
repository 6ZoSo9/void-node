# Apollyon native no-exec process continuity candidate v1

Marker: `VOID_APOLLYON_CLAIM_NO_EXEC_LOCK_V1`

Status: **source/test/CI only**. This is an additive child of accepted #3456 at `29bcd870525a30e9c3b73d64c2f5554efba6a801`. It does not install a claim runtime, access Xiphos, or grant claim/training authority.

## Gap and scope

#3454 and #3456 prevent a successfully guarded process from creating a new task through clone/clone3/fork/vfork (including x32 ABI escape), but the native lock still allows `execve` and `execveat`. Those calls can replace the executable while retaining PID/start generation and an active pidfd. Checking the executable at two boundaries can detect a replacement, but does not by itself prohibit a later in-place replacement between checks and use.

This versioned wrapper composes accepted #3456, then installs an additional Linux x86_64 seccomp filter with `SECCOMP_FILTER_FLAG_TSYNC` and `no_new_privs`. It returns `EPERM` for `execve` and `execveat`, rejects x32 syscall ABI and non-x86_64 architecture, and independently reobserves exact PID/PPid/start ticks/UID/GID/executable dev+inode with retained live pidfds after both restrictions.

### API

`apollyon_claim_no_exec_lock_install_v1(...expected...,out)` takes the same **caller-supplied** policy arguments as #3456, including an already-open expected executable FD and exact raw NUL-delimited cmdline. On success the caller owns the retained pidfd and closes it with `apollyon_claim_no_exec_lock_close_v1`.

A failed call may have installed irreversible restrictions. The process must be discarded; it must not be retried as a claim/release authority.

## Proof

The hosted source proof compiles exact blob-pinned #3309/#3441/#3454/#3456 native inputs and this additive wrapper/harness three times, compares ELF bytes, then runs fork-isolated kernel tests. The positive locked child verifies actual `execve`, pathname `execveat`, and `AT_EMPTY_PATH` execveat are rejected with `EPERM`; it additionally verifies inherited fork/clone3 denial, same self-process identity, retained pidfd, and close. A hypothetical unexpectedly successful exec launches `/bin/false`, which exits nonzero and cannot spoof a successful test. Wrong expected PPid/UID/exe/cmdline/groups and a live second pthread must fail closed. All invocations except `--self-test` HOLD.

The focused workflow runs on PR, push-to-main and manual dispatch, and watches every reviewed dependency blob.

## Deliberate limits

This second filter blocks only in-place executable replacement by the two exec syscalls. It **does not** authenticate the caller-provided expected executable FD or cmdline, prove source origin, prevent dynamic library loading or ptrace/memory tampering, establish Xiphos host/UID custody, or implement any service/store writer or trainer release. Those remain separate reviewed first-entry/host integration gates.

```text
execve_and_execveat_denied=true
protected_expected_source_origin_proven=false
xiphos_host_qualification_performed=false
durable_attempt_claim_performed=false
training_execution_performed=false
funds_movement=false
```

Keep Draft. PROTECT THE CORE.
