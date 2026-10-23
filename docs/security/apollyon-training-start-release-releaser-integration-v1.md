# Apollyon training-start release releaser integration V1

Marker: \`VOID_APOLLYON_TRAINING_START_RELEASE_RELEASER_INTEGRATION_V1\`.

Status: **source/test/CI integration candidate only**.

## Flattened native release chain

This PR now directly targets #3351 at
`9e1da5dbb1ae12114a26506fbf1c6bc56780b98f` and contains the complete
12-file native release closure formerly split across #3381, #3397 and this
releaser integration.

The consolidated focused workflow requires exactly those 12 files against the
direct base, re-runs the #3351 release-binding proof, the native trainer
candidate proof and the same-pipe generation proof, then executes the releaser
continuity integration. The native/releaser protocol bytes and negative
authority are unchanged by this review-stack consolidation.

Protected releaser origin, production writer exclusivity, protected
consumption/winner provenance, actual trainer release, training, credentials,
transactions and funds authority remain false/unproven.


## Purpose

Accepted #3381 proves the trainer-side native release gate, and accepted #3397
proves source-level same-kernel-pipe identity. Both deliberately leave the
releaser side incomplete.

This gate closes the next bounded source gap with an actual hosted composition:

1. a fresh releaser fixture is single-threaded;
2. it creates the anonymous release pipe;
3. it directly forks the exact current #3381 trainer candidate;
4. the trainer receives the release read end only at FD 3;
5. the releaser proves direct PPid/start/source and exact same-pipe FD3 identity;
6. immediately before the authority-bearing write interval the releaser proves
   its own exact FD set and singleton task state;
7. it installs an irreversible seccomp writer-continuity filter;
8. the filter blocks late task creation, FD duplication, proc/dev-fd reopen
   duplication, close-on-exec clearing, executable-image replacement,
   socket creation/FD passing or receipt, pidfd_getfd, and io_uring
   setup/enter/register;
9. the releaser writes the exact 64-byte frame and closes its sole writer;
10. the actual #3381 trainer gate must observe the frame + EOF and exit zero.

The integration candidate itself has **no production run mode**. Its only
positive entry is the hosted \`--self-test\` composition.

## Exact parent stack

Parent #3397:

\`aab4988f9c530f1450f152be03c059f7f635058b\`.

Exact source dependencies:

- #3397 pipe-pair C blob:
  \`93390eefd1e72e70af7206e9982c8eaa5e042149\`;
- #3397 focused proof blob:
  \`5c7a1310486bde1463b169563e394af69e022209\`;
- current #3381 trainer native C blob:
  \`3c81dbbe694f421a0e6cbc18d8fb7d6f4c7fd983\`;
- current #3381 focused proof blob:
  \`daa4f0c33f4b05f7e090b4a3c2e7513e79f2a107\`;
- current #3351 release-binding source blob:
  \`a7e4a69b9561fe441a0a1ab7476c6329e2cea3a8\`;
- current #3351 proof blob:
  \`a9a7c85a9bb48996ecce056ad47f2b7dc3d65d28\`.

## Bounded writer-continuity interval

The releaser fixture first proves a singleton task set and exact releaser FD set.
The exact allowed releaser descriptors immediately before restriction are:

- standard input/output/error **only after exact fixture classification**:
  stdin must be the inherited `/dev/null` character device and stdout/stderr
  must be two distinct anonymous pipes observed through retained
  `/proc/self/fd`; sockets, regular files and anon-inode descriptors are not
  accepted merely because they occupy fd 0/1/2;
- the sole release-pipe write descriptor;
- retained trainer pidfd;
- retained procfs root/self/task/fd observation descriptors.

No socket or unrelated inherited descriptor is accepted.

The seccomp layer is installed only after direct trainer generation and same-pipe
FD3 revalidation. Because the releaser is proven singleton immediately before
installation, the hosted fixture does not rely on TSYNC to cover pre-existing
threads.

The filter denies:

- x86-64 x32-numbered syscall escape;
- clone / clone3 / fork / vfork;
- dup / dup2 / dup3;
- fcntl-based duplication;
- ioctl, preventing FIONCLEX from clearing the sole writer's close-on-exec flag;
- execve / execveat, preventing an unreviewed replacement image from inheriting
  the release writer during the terminal authority interval;
- open / openat / openat2 plus the distinct creat syscall, preventing
  /proc/self/fd or /dev/fd reopen duplication through either interface;
- socket / socketpair;
- sendmsg / sendmmsg SCM_RIGHTS transfer, plus recvmsg / recvmmsg
  descriptor receipt through any inherited standard socket;
- pidfd_getfd;
- io_uring setup / enter / register.

The standard-FD admission check is a separate pre-seccomp invariant. Blocking
`io_uring_setup/enter/register` does **not** neutralize an already-active
`IORING_SETUP_SQPOLL` ring, because SQPOLL can consume submissions from shared
ring memory without a new `io_uring_enter` syscall. The releaser therefore
does not treat descriptor numbers 0/1/2 as trusted by position: it requires
the exact `/dev/null` + two-distinct-pipe fixture shape before the terminal
FD census. An inherited io_uring/anon-inode descriptor at a standard FD is
rejected before writer confinement can be claimed.

The hosted self-test forks a disposable child, creates an actual
`IORING_SETUP_SQPOLL` ring through the real kernel `io_uring_setup`
syscall, places that ring at fd 0, opens its own retained procfs context, and
requires the production standard-FD classifier to reject it. The ring is
closed when the child exits. This adversary performs no protected Xiphos I/O
and grants no production writer authority.

The hosted fixture also separates **releaser proof time** from the trainer's
one-second frame deadline. Before allowing the child to exec, the parent attaches
with `PTRACE_SEIZE|PTRACE_O_TRACEEXEC`. The child then stops at the kernel exec
event after the exact trainer image is installed but before trainer user code
runs. While that trainer generation is stopped, the releaser proves exact
PPid/start/executable/same-pipe identity, installs the writer-continuity filter,
and executes the late-writer adversaries. After all releaser-side proof is complete, the parent writes the exact 64-byte
frame and closes its sole release writer **while the trainer remains stopped at
the exec event**. Only after frame+EOF are already buffered does the parent
`PTRACE_DETACH` and resume trainer user code. The trainer's own one-second frame
timeout therefore includes neither releaser proof latency nor a scheduler gap
between resume and frame publication.

The releaser then proves representative late duplication/reopen/socket attempts,
including a direct creat(2) reopen of the release writer through /proc/self/fd,
an FIONCLEX attempt against the sole writer, and direct execve/execveat syscall
attempts all return EPERM before it resumes the trainer and writes the frame.
It additionally calls io_uring setup/enter/register and recvmsg/recvmmsg
with deliberately invalid FDs after the filter installs. They must return
EPERM *before* kernel FD validation. These are source/fixture adversaries,
not installed Xiphos or actual inherited-ring authority evidence.

## Adversarial fixtures

Hosted proof requires rejection of:

- a second releaser thread before the authority interval;
- a trainer child that retains a release-pipe writer;
- a trainer whose FD3 is a different anonymous pipe;
- a duplicate writer retained by the releaser;
- a one-byte-wrong release frame passed through the actual #3381 trainer gate.

The positive fixture uses the real current #3381 candidate, not a mock trainer.

## Remaining authority boundary

This hosted integration is not protected Xiphos provenance.

It still reports false/unproven:

- protected releaser installed-source origin;
- Xiphos host qualification;
- protected consumption-record origin/revalidation;
- protected #3357 winner origin/revalidation;
- production writer exclusivity;
- trainer release authorization/performance;
- training execution / candidate-weight mutation;
- credential/private-key/signing/wallet access;
- transaction or funds authority.

A future protected install/qualification gate must bind the releaser binary and
trainer binary to reviewed Xiphos custody and compose the current protected
consumption/winner evidence before any real release can be considered.

## Authority

CI performs only disposable compilation and local process/kernel fixtures.
It does not mutate Xiphos services, protected state, claims, keys, wallets,
transactions or funds.

**PROTECT THE CORE.**

## October 19 current-parent reconciliation

This generation is a non-force merge-forward over current #3397
`aab4988f9c530f1450f152be03c059f7f635058b`. All writer-continuity controls from the inherited-ring /
SCM_RIGHTS repair remain unchanged. The C source changes only the exact current
trainer-native identity to `3c81dbbe694f421a0e6cbc18d8fb7d6f4c7fd983`; the focused proof and workflow
bind the current #3397, #3381 and #3351 dependency generations.

Protected releaser origin, production writer exclusivity, protected
consumption/winner provenance, actual trainer release, training, credentials,
transactions, and funds authority remain false/unproven.

## October 19 trainer-state mutation closure

The terminal confinement interval now protects not only release-writer
continuity but also the already-validated stopped trainer generation.

The releaser is still the root ptrace tracer while the UID/GID-1000 trainer is
stopped at `PTRACE_EVENT_EXEC`. Exact `/proc/<pid>/exe` identity alone cannot
prove continuous reviewed execution if the tracer may alter memory or registers
after that check. Therefore the seccomp filter now:

- argument-gates `ptrace`: only `PTRACE_DETACH`, the one operation required
  by the reviewed terminal sequence, is allowed after filter installation;
- rejects all other ptrace requests, including mutating POKEDATA/SETREGS-style
  control;
- rejects `process_vm_writev`.

The hosted adversary issues `PTRACE_POKEDATA` with a deliberately invalid
address and a zero-length `process_vm_writev` after filter installation and
requires both to fail with `EPERM` at syscall entry. The normal final
`PTRACE_DETACH` must still succeed after the exact frame is buffered and the
sole writer is closed.

This closes a source-level future-composition trainer-integrity gap. It does not
establish protected releaser origin, production writer exclusivity, trainer
release authority, training authority, credentials, transactions, or funds
authority.


## October 23 inherited-SQPOLL standard-FD closure

Current releaser source rejects unsafe inherited standard descriptors before
the terminal seccomp interval. The source-level positive fixture now proves:

- stdin is exactly the hosted fixture's `/dev/null`;
- stdout and stderr are distinct anonymous pipes;
- fd-number position alone never authorizes a socket, regular file, anon inode
  or io_uring descriptor;
- a real root-created `IORING_SETUP_SQPOLL` ring duplicated onto fd 0 is
  rejected by the same production classifier used by `own_fd_set_exact()`;
- all existing io_uring setup/enter/register and SCM_RIGHTS syscall denials
  remain in place after the pre-seccomp descriptor census.

This closes the inherited-SQPOLL source-level writer-continuity gap only.
Protected releaser origin, production writer exclusivity, actual trainer
release/training, credentials/signing, transactions and funds remain
false/unproven.
