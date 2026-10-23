# Apollyon training-start native release candidate v1

Marker:

`VOID_APOLLYON_TRAINING_START_RELEASE_NATIVE_CANDIDATE_V1`

Status: **source/test/CI candidate only**. This generation does not install on
Xiphos, release a trainer, start training, mutate candidate weights, or grant
runtime authority.

## Exact parent

This candidate is stacked on accepted #3351 exact head
`9e1da5dbb1ae12114a26506fbf1c6bc56780b98f`.

It binds exact #3351 release-binding source Git blob:

`b83b9e72a2c0e139bf677e6d045a0b31100d733a`.

The parent contract remains authoritative for the 64-byte release-frame domain,
trainer/releaser policy requirements, unique authorization→claim winner lineage,
one-time consumption, non-transferability, and all false/unproven authority
flags.

## Candidate purpose

This gate implements and tests the **trainer-side native primitive** required
before any future release implementation may cross the training-start boundary.

The future `--run` path verifies only a release-gate shape and exits. It never
executes a trainer/model process and never reports release authority.

### Fixed inherited release FD

The candidate accepts release input only from inherited FD 3.

Before opening any candidate-owned internal descriptor it first proves that
stdin, stdout, stderr, and FD 3 already exist. It then opens one retained procfs
context and requires Linux `PROC_SUPER_MAGIC`, the `self` magic link to name
the real `getpid()`, and stable retained proc/self/fd directory generations.

The exact inherited-FD census is then performed through that retained procfs
directory. The only additional descriptors allowed are the candidate-owned
retained procfs descriptors and the census duplicate itself.

FD 3 must be a read-only anonymous pipe endpoint. Its `pipe:[inode]` identity
is read through the retained procfs FD directory and cross-bound to `fstat(3)`.
The candidate snapshots the kernel device/inode/mode tuple before the release
frame and requires the same pipe generation afterward.

This is trainer-side evidence only. It does **not** prove which process owns the
write endpoint.

## Exact frame and EOF

The expected frame remains the #3351 contract:

1. fixed 32-byte release domain
   `c201c621cc904c2e9c0c2527322debc326736b7f5e2c731a1032d2f1d3cb2b16`;
2. followed by SHA-256 of the exact UTF-8
   `apollyon_training_start_release_binding_v1:<64-lowercase-hex>` ID.

The reader requires:

- exactly 64 bytes;
- byte-for-byte equality;
- then EOF before a bounded timeout.

Short, extra, delayed-extra, and missing-EOF cases HOLD.

A held duplicate writer that prevents EOF through the authorization boundary
also HOLDs. However EOF alone cannot prove that no transient duplicate writer
ever existed. Therefore:

```text
private_release_channel_origin_proven=false
release_writer_exclusivity_proven=false
trainer_releaser_lineage_proven=false
```

remain mandatory.

## Trainer process policy

Future `--run` requires a non-root process and exact caller-provided expected
UID/GID values. All four kernel UID slots and all four GID slots must match those
values. Supplementary groups must be empty.

The same process generation must report:

- `NoNewPrivs: 1`;
- `CapInh=0`;
- `CapPrm=0`;
- `CapEff=0`;
- `CapBnd=0`;
- `CapAmb=0`.

All status/stat observations are opened descriptor-relative beneath the retained
procfs/self generation. The `stat` record's PID is required to equal
`getpid()`, while direct `getresuid`, `getresgid`, `getgroups`, and
`PR_GET_NO_NEW_PRIVS` checks cross-check the parsed kernel view.

The source revalidates procfs generation and those security fields before and
after frame consumption. Hosted self-test includes NNP=0, nonzero-capability,
supplementary-group, and non-procfs-root adversaries.

The caller-provided expected UID/GID values are **not** runtime authority by
themselves. A later integration must bind them to the exact #3351 consumption
record and protected host identity.

## Post-first-entry no-exec barrier

The candidate installs a seccomp filter before reading the release frame. It
fails closed unless `NoNewPrivs=1`, then rejects native `execve` and
`execveat` with EPERM while allowing the remaining process to continue.

On x86-64, `AUDIT_ARCH_X86_64` also covers the x32 ABI. The candidate now
checks the x32 syscall namespace bit (`0x40000000`) immediately after loading
`seccomp_data.nr` and kills the process before ordinary syscall-number
dispatch. This prevents x32-numbered `execve`/`execveat` from bypassing the
post-first-entry no-exec barrier even on a kernel where the x32 ABI itself is
disabled or unavailable.

This prevents an exec-away → unreviewed code → exec-back ABA after the reviewed
native first entry and before the release frame is consumed.

The hosted self-test forks one child that proves native `execve` returns
EPERM and, on x86-64, a second child whose x32-tagged syscall must terminate
with `SIGSYS`. The positive production harness also requires
`x32_syscall_namespace_rejected=true`.

This candidate deliberately does **not** exec training after the gate. Any
future training engine integration must be compatible with the accepted
post-first-entry no-exec doctrine or introduce an equally strong reviewed
continuous-provenance mechanism.

## Process generation stability

The candidate snapshots and revalidates:

- the retained procfs root/self/fd generation and procfs filesystem identity;
- the procfs `self` PID binding to `getpid()`;
- its Linux process start-time ticks from retained procfs/self;
- a retained self pidfd, which must remain live through frame completion;
- self executable file generation opened through retained procfs/self;
- FD 3 anonymous-pipe generation observed through retained procfs/fd;
- exact UID/GID/group/NNP/capability state.

A future installed candidate still requires separate source/binary
qualification and host custody before those observations can become trusted
runtime evidence.

## Releaser continuity remains a separate gate

This candidate intentionally does not claim the #3351 releaser-side properties:

- reviewed releaser PID/start/source identity;
- retained releaser pidfd;
- trainer direct-parent/equivalent kernel lineage;
- proof that releaser write FD and trainer FD 3 are endpoints of the same
  kernel pipe;
- exclusive write-end ownership from construction through final close;
- prevention of transient post-census fork/dup/SCM_RIGHTS writer escape.

Those require a composed releaser/trainer construction boundary. The next gate
is therefore:

`apollyon_training_start_release_releaser_integration_v1`.

## Hosted proof

The focused proof:

- pins this source and exact #3351 source/proof/workflow generations;
- compiles the native candidate three times with the same reviewed flags and
  requires byte-identical ELF output;
- requires a static binary with no PT_INTERP and no dynamic NEEDED entries;
- runs the real C self-test;
- proves exact frame success;
- proves short, extra, delayed-extra and missing-EOF rejection;
- proves a held duplicate writer produces timeout/HOLD;
- proves NNP=0, nonzero capabilities and supplementary groups are rejected;
- proves the candidate can retain and revalidate a live self pidfd;
- proves the no-exec seccomp barrier blocks exec;
- executes the actual production `--run` entrypoint through a root-owned hosted
  harness that drops to UID/GID 1000, clears supplementary groups and capability
  state, sets NoNewPrivs, inherits exactly FD 3, sends the exact release frame,
  and closes the writer for EOF;
- requires that positive production path to exit 0 while still reporting
  releaser-origin/writer-exclusivity/lineage/release/training authority false;
- recompiles against a fake non-procfs root and requires pre-frame HOLD;
- proves direct `--run` without exact inherited FD 3 cannot authorize release;
- proves PR/main-push trigger closure includes the exact #3351 source/proof/
  workflow dependencies.

Hosted CI does not install or execute anything on Xiphos.

## Authority boundary

Even a GREEN source candidate keeps:

```text
private_release_channel_origin_proven=false
release_writer_exclusivity_proven=false
trainer_releaser_lineage_proven=false
trainer_release_authorized=false
trainer_release_performed=false
training_execution_authorized=false
training_execution_performed=false
candidate_weight_mutation_performed=false
automatic_retry_authorized=false
filesystem_write=false
service_action=false
socket_action=false
operator_private_key_access=false
production_signing=false
wallet_access=false
transaction_signing=false
transaction_broadcast=false
funds_movement=false
```

No Xiphos filesystem/account/group/systemd/service/socket/store mutation,
protected consumption publication, trainer release, training/model execution,
key/signing/wallet access, transaction, or funds action is authorized.

PROTECT THE CORE.

## October 23 x32 no-exec namespace closure

Current repaired source/proof identities:

- trainer native C: `098276fc92c247fa1465c11c6403c2c50a61629a`;
- focused proof: `7a90c2b30e90416411ef08fc2b26f2636d81d486`.

This generation changes only the no-exec namespace guard and its source-level /
runtime adversary. It does not widen the release protocol or any runtime
authority. The full composite release chain must re-pin this trainer identity
and requalify before the repair is treated as source-green.

## October 19 current-parent reconciliation

This generation is a non-force merge-forward over current #3351
`9e1da5dbb1ae12114a26506fbf1c6bc56780b98f`. The native release protocol and C control flow are unchanged;
the C source changes only its exact parent release-binding Git-blob identity.
The proof and workflow bind the current #3351 source/proof generation.

Protected release-channel origin, releaser writer exclusivity, trainer/releaser
lineage, actual trainer release, training execution, credentials, transactions,
and funds authority remain false/unperformed.
