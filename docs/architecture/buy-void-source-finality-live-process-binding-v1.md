# Buy VOID source-finality live-process binding v1

Marker: `VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_V1`.

Status: **source-only same-live-process prerequisite; production authority HOLD**.

## Purpose

V7 already binds a root-custodied deployment receipt to reviewed source and
requires a two-provider finalized-payment quorum. The remaining process
provenance gap is restart/session identity: a commit/tree environment tuple is
not, by itself, proof that the process currently asking to sign/broadcast is the
same service invocation that was independently qualified.

This contract defines the runtime-consumed receipt boundary needed to close that
gap without weakening V7.

## Root receipt

Canonical path:

```text
/var/lib/void-source-finality-v7/live-process-binding-v1.json
```

The production verifier accepts only a direct, root:root, mode-0444,
single-link regular file beneath root-owned, non-group/world-writable
ancestors. The file is read with `O_NOFOLLOW` and stable inode/metadata checks.

A later privileged collector/installer must populate the receipt only after
independently proving all receipt claims. This PR does not install the file.

The receipt binds:

- exact V7 deployment-receipt ID;
- process source commit/tree and branch `main`;
- runtime UID/GID;
- MainPID;
- Linux process start-time ticks;
- systemd `INVOCATION_ID`;
- exact cgroup-v2 path ending in `void-node-live.service`;
- Node executable realpath;
- source working-directory realpath;
- raw process cmdline SHA-256;
- reviewed `NODE_OPTIONS` SHA-256;
- canonical-producer role;
- absence of `NODE_PATH`, `LD_PRELOAD`, and `LD_LIBRARY_PATH`;
- zero inherited/permitted/effective/ambient capabilities;
- `NoNewPrivs=1`;
- independently proven source custody;
- reviewed service contract; and
- reviewed launcher contract.

The receipt ID is content-addressed as
`voidbsflp1_<sha256(canonical material)>`.

## Self-observed identity

The production verifier does not use mutable JavaScript `process.env` as its
launch-identity trust source.

It reads the process's initial kernel-exposed launch state from:

```text
/proc/self/stat
/proc/self/status
/proc/self/cmdline
/proc/self/environ
/proc/self/cgroup
/proc/self/exe
/proc/self/cwd
```

The initial environment must contain the exact source-identity tuple,
`INVOCATION_ID`, `VOID_CANONICAL_PRODUCER_ROLE=1`, and reviewed
`NODE_OPTIONS`. Unreviewed loader/preload variables are forbidden.

The verifier samples self identity both before and after reading the root
receipt. Any change HOLDS.

## Restart and PID-reuse boundary

A successful comparison requires all of:

```text
deployment receipt ID
PID
process start-time ticks
systemd invocation ID
cgroup path
commit/tree
executable/cwd
cmdline digest
initial launch environment
```

to match the root receipt.

Therefore:

- a service restart gets a new process generation and HOLDS;
- PID reuse with different start ticks HOLDS;
- a new systemd invocation HOLDS; and
- copied source environment variables are insufficient.

A new root-qualified receipt is required for the new live process.

## Deliberate non-claims

Even a GREEN live-process binding result keeps:

```text
production_source_finality_authority_ready=false
public_presale_activation=false
funds_movement=false
```

This contract must later be composed into the V7 execution preflight together
with the independently verified V7 deployment receipt and provider quorum.

The future root collector/installer remains a separate reviewed boundary. It
must prove the receipt's source-custody, effective service-unit, launcher,
loader-environment, PID/start-time, and systemd-invocation claims rather than
copy them from user-writable evidence.

No host/service mutation, credential/key/wallet access, signing, RPC,
transaction, Chain-2050/WC mutation, presale activation, or funds movement is
performed by this PR.

**PROTECT THE CORE.**
