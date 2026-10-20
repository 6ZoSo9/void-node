# VOID Epoch-2 V6R3 post-exec dumpability proof V1

**Status:** source-only reproduction; P2 trust-claim HOLD; no production host
operations, installer, live `--plan`, credentials, signing or funds.

Reviewed native source: PR #3571 head
`a7d2c3241f74950f58ba02088a06e4ec235f0b0f`,
Git blob `ae26706a117025893496901d4bde8cee87cadfba`.

The launcher permanently drops UID/GID to 1000 then calls
`prctl(PR_SET_DUMPABLE,0)`. It subsequently calls
`fexecve(python_fd, ...)` on the sealed, ordinary Python ELF, invoking the
`-I -B -S` read-only host planner.

**Linux resets the dumpable bit to 1 on ordinary `execve`**, unless the
executed file has privileged setuid/setgid or file capability behavior.
This is part of Linux's documented process-attribute transition, not a
claim of an exploited host. See
[Linux execve(2)](https://man7.org/linux/man-pages/man2/execve.2.html)
and [PR_SET_DUMPABLE](https://man7.org/linux/man-pages/man2/pr_set_dumpable.2const.html).

The native proof marker
`runtime_dumpable_disabled_before_python=true` is true only for
the state immediately before `fexecve`. It cannot by itself assert
the *post-exec* Python process is nondumpable. PR #3575's runtime closure
contract currently declares `runtime_process.dumpable=false`, which
needs a truthful runtime observation or revised, separately enforced
process isolation requirements before acceptance.

## Fixture-only proof

`scripts/prove_buy_void_epoch2_v6r3_postexec_dumpability_v1.py` reads the
exact immutable reviewed native source bytes to bind the two calls, and
runs an isolated test with no secrets or protected host files:

1. In an ordinary Python subprocess, `prctl(PR_SET_DUMPABLE,0)` verifies
   `PR_GET_DUMPABLE=0`.
2. Opens an ordinary Python executable file descriptor and invokes
   `os.execve(fd,...)` (Python's Linux `fexecve` support) with clean
   `-I -B -S` arguments/environment.
3. After the new Python executable has started, its
   `PR_GET_DUMPABLE` returns `1`.

Expected markers:

```text
pre_fexecve_dumpable=0
post_fexecve_dumpable=1
native_preexec_zero_does_not_prove_child_zero=true
runtime_dumpability_accepted=false
host_plan_authorized=false
protected_install_authorized=false
credential_access=false
signing=false
transaction=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

The source/test/CI proof **intentionally does not repair or bypass** the
native security boundary. It exposes the lifecycle contract that a separate
host qualifier must enforce.

## Required closure

Do not claim post-exec Python `dumpable=false` without an actual post-exec
process observation, after any intended enforcement and including the
interpreter/loader initialization exposure. Options include a separately
reviewed early in-child protection mechanism and external ptrace/procfs
isolation controls, with a bounded negative test; otherwise amend the
contract to claim only pre-exec nondumpability and explicitly identify
the unavoidable post-exec state.

Distinct independent security review, exact installed ELF identity,
Python/loader/Git runtime closure, read-only host plan qualification and
the independent economic activation gates are still required.

**PROTECT THE CORE.**
