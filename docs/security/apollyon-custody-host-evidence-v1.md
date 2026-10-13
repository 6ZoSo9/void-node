# Apollyon custody host evidence v1

Marker: `VOID_APOLLYON_CUSTODY_HOST_EVIDENCE_V1`

Status: **designated-host read-only collector source**.

## Purpose

V83 derives versioned host-policy V2 evidence from live Xiphos state instead of
accepting caller assertions. The merged V82 V1 classifier remains frozen as
historical evidence and is not rewritten by this collector.

The collector is read-only. It does not install or start V81, create users or
groups, change permissions/ownership, edit systemd, write custody state, access
the operator private key, claim an attempt, or execute training.

## Why the observer is privileged

The custody root is intentionally private to a future dedicated custody UID.
A training/runtime identity should not be able to traverse that root or inspect
all custody-UID processes.

Therefore live V83 collection requires a privileged observer and immediately
HOLDs unless effective UID is root. That privilege is used for observation only.

## Fixed observations

The live collector receives only four selectors:

- training systemd unit;
- custody systemd unit;
- absolute custody state root;
- absolute advertised socket path.

It derives UIDs, GIDs, group memberships, process IDs, permission decisions,
systemd hardening, and runtime service-control denial from the host.

The collector emits `VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V2` with
`version=2`, then classifies it through the versioned V2 policy. Its authority
receipt states `exact_v82_classifier_reused=false`,
`v82_v1_classifier_preserved=true`, and
`v83_policy_v2_classifier_required=true`.

## Host binding

Live collection requires `hostname == Xiphos` case-insensitively.

It binds a fresh evidence snapshot to the local wall clock, local monotonic
sample, SHA-256 of the kernel boot ID, and exact reviewed V80/V81 source blobs
imported from V82.

The collector still reports:

```text
trusted_collector_proven=false
verification_clock_authority_proven=false
evidence_generation_monotonicity_proven=false
```

## Filesystem and ACL inspection

V83 uses no-follow metadata reads and requires simple POSIX ACLs for reviewed
directories and the socket. Named/default ACL entries are rejected rather than
silently ignored.

It observes the custody state root, `consumed/`, state-root retained ancestor
chain to `/`, socket parent, socket-parent retained ancestor chain to `/`, and
the advertised AF_UNIX socket. Both state and socket parent objects must be
denied training-UID rename/unlink authority through their parent directories.

Training write/traverse/connect decisions are derived from observed UID/GID,
supplementary groups, owner/group/other mode bits, and the simple-ACL rule.

## Process inventory

V83 reads both unit MainPIDs from systemd and binds their actual `/proc`
UID/GID/group/start-time identities.

It scans `/proc` for the custody UID. V82 receives
`custody_uid_only_reviewed_service=true` only when the custody MainPID is the
sole observed process using that UID.

## Systemd hardening

The collector reads effective custody-unit properties for UMask,
NoNewPrivileges, PrivateTmp/PrivateDevices, ProtectSystem/ProtectHome, kernel
and cgroup protections, LockPersonality, RestrictSUIDSGID/RestrictRealtime,
capability sets, address-family restriction, and ReadWritePaths.

The exact writable-path set must equal the observed state root and socket
parent. It is then mapped to V82's abstract `[socket_parent,state_root]` labels.

## Runtime control denial

V83 uses read-only polkit authorization queries for the training MainPID.

It requires denial for reviewed systemd unit-control verbs and generic
manager/unit-file/reload actions. The collector never executes those control
verbs.

## Success meaning

A successful V83 call returns both the derived V82 classifier input and its
source-policy decision. It may report `live_observation_backed=true` but still
reports:

```text
live_host_qualification_performed=false
independent_custody_proven=false
production_gate_ready=false
attempt_claimed=false
training_execution_performed=false
```

Those remaining trust and continuity properties require a later qualification
receipt or independently witnessed operator review.

## Live invocation boundary

No live command is added to CI. Source CI exercises parsers and synthetic
observation conversion only.

A future operator run must execute the collector directly on Xiphos with
read-only privilege and supply the exact reviewed unit/path selectors.

## Proof

```bash
node --check tools/apollyon-custody-host-evidence-v1.mjs
node --check scripts/prove_apollyon_custody_host_evidence_v1.mjs
node scripts/prove_apollyon_custody_host_evidence_v1.mjs
```

The source proof validates proc/systemd/ACL parsers, positive V2 composition,
negative runtime-control and process-inventory cases, wrong-host rejection, and
absence of filesystem/service mutation primitives.

## CLI

The reviewed live entrypoint is strict and read-only:

```bash
sudo node tools/apollyon-custody-host-evidence-v1.mjs --collect \
  --training-unit <reviewed-training.service> \
  --custody-unit <reviewed-custody.service> \
  --state-root <absolute-reviewed-custody-root> \
  --socket-path <absolute-reviewed-custody.sock>
```

Exactly those four selectors are accepted. The CLI has no mutation, install,
credential, key, wallet, transaction, training, or retry flags.

The resulting receipt hashes the state-root and socket path in its selector
binding instead of echoing those absolute paths.
