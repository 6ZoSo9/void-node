# Apollyon training-start release releaser integration V1

Marker: \`VOID_APOLLYON_TRAINING_START_RELEASE_RELEASER_INTEGRATION_V1\`.

Status: **source/test/CI integration candidate only**.

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

\`7b6e27d36836d8dbe9951efa82485e9c2dec025a\`.

Exact source dependencies:

- #3397 pipe-pair C blob:
  \`93390eefd1e72e70af7206e9982c8eaa5e042149\`;
- #3397 focused proof blob:
  \`88abd5de23abb4d12d40fa4a2e3672f60413fe29\`;
- current #3381 trainer native C blob:
  \`265e1c73a6df9ae7fc0ec6a7e0ce474da3145b36\`;
- current #3381 focused proof blob:
  \`23a08c6e8de156ae105a6f60ebdea262ce70e89b\`;
- current #3351 release-binding source blob:
  \`01757cbd80c12561218ac4ba0a29e9675e42adec\`;
- current #3351 proof blob:
  \`38f63789b5e1ff86e9d38f128e841e22d9c7e495\`.

## Bounded writer-continuity interval

The releaser fixture first proves a singleton task set and exact releaser FD set.
The exact allowed releaser descriptors immediately before restriction are:

- standard input/output/error;
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
- io_uring setup / enter / register. Blocking only new rings is insufficient:
  an already inherited ring at fd 0/1/2 could submit async open requests
  despite normal open/creat syscall-entry restrictions.

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
