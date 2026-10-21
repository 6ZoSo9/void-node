# Buy VOID V7 static runtime immutable snapshot plan V1

## Status

Source-plan only. No candidate is executed by this lane.

Parent generation: Draft #3677 at `4e43fd403996b6042aea58d810912dd87501bdce`.

Plan ID: `voidv7immutablesnapshot1_f259aabb2537a936f889a8256f4ac99493394cd340391e57f9609d389f0f6c15`.

## Problem

#3677 proves the V7 static-runtime source and sandbox contract, but it deliberately refuses `--run` with:

`candidate_execution_snapshot_not_same_uid_immutable`

The current scratch runtime is pathname-backed and owned by the same ordinary UID as unrelated sibling processes. Landlock and seccomp confine the candidate process itself; they do not make a same-UID sibling unable to mutate pathname-backed Python or stdlib bytes between authentication and execution/import.

## Required future boundary

A later implementation may enable candidate execution only after both exact candidate inputs are copied into **sealable anonymous file descriptions** and the immutable snapshot is proven.

Required properties include:

- exact externally supplied Python and stdlib size/SHA-256 before snapshot creation;
- Python and stdlib snapshots each require `F_SEAL_WRITE|F_SEAL_GROW|F_SEAL_SHRINK|F_SEAL_SEAL`;
- the complete seal set must be read back and verified;
- pathname-backed candidate bytes can never become execution authority;
- Python execution must consume the exact sealed file description;
- stdlib imports must consume the exact sealed file description;
- parent and child must rebind exact size/digest at the execution boundary;
- an executable same-UID sibling adversary must prove writes, truncation and pathname replacement cannot change executed Python or imported stdlib bytes.

This plan does **not** require a particular syscall wrapper such as `fexecve` or `execveat`; the implementation must prove descriptor identity and byte immutability rather than satisfy a naming preference.

## Sandbox preservation

Any future snapshot implementation must preserve #3677's existing boundaries:

- Landlock ABI v3+ filesystem confinement;
- seccomp denial of network/process/namespace/kernel escape surfaces;
- `PR_SET_NO_NEW_PRIVS` and non-dumpable execution;
- non-root identity with no identity transition;
- `-I -B -S`;
- CPU, address-space, output, fd and process limits;
- exact V5 self-test from sealed source descriptor;
- exact stdlib `ctypes`, built-in `_ctypes`, and `renameat2` probe.

## Review and lifecycle gates

#3677 is source/CI green but remains independently unreviewed in the current quota state. This plan therefore records `parent_independent_review_satisfied=false` and does not authorize implementation.

The next gate is:

`DISTINCTLY_REVIEW_PARENT_RUNTIME_PROOF_AND_THIS_PLAN_BEFORE_IMMUTABLE_SNAPSHOT_IMPLEMENTATION_V1`

A later immutable-snapshot implementation also requires its own distinct review and executable adversarial proof.

## Separate persistent content-seal gate

Even a future executable runtime-closure GREEN does not authorize installation on Precision. The persistent host content-seal problem remains separate; the observed filesystem backing `/opt` returned `FS_IOC_MEASURE_VERITY -> ENOTSUP`.

## Authority

This plan grants no candidate execution, root execution, protected filesystem mutation, fs-verity enablement, protected install/apply, service mutation, credential access, signing, RPC/transaction, payment acceptance, presale/WC activation, treasury/liquidity action, or funds movement.

PROTECT THE CORE.
