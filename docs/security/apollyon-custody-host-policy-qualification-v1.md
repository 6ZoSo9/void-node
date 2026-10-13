# Apollyon custody host-policy qualification v1

Marker: `VOID_APOLLYON_CUSTODY_HOST_POLICY_QUALIFICATION_V1`

Status: **pure source-only evidence classifier**.

## Purpose

V82 defines the exact host/service policy that a future designated Xiphos
collector must prove before the merged V81 AF_UNIX custody service can count as
independent custody.

The classifier performs no host I/O. It consumes supplied evidence only.

## Reviewed source binding

V82 pins the exact merged custody implementation by Git blob identity:

```text
V80 core    f9f18db5bbfeea466202ef0d7babe08c3c401d66
V81 service 8961572ba5834371b1229f790a1960940fc74935
V81 client  fb31dbbda76c94f0ad08e38094c151a24a78b486
```

An unrelated future merge does not silently redefine those reviewed bytes.

## Identity separation

Positive classification requires three distinct authority groups:

- training/runtime UID + primary GID;
- custody-service UID + primary GID;
- dedicated IPC GID.

The training and custody UIDs must differ. Their primary GIDs must differ. The
IPC GID must differ from both primary GIDs.

Both identities must have IPC-group membership, but the training identity may
not inherit the custody primary group and the custody identity may not inherit
the training primary group.

## Custody state

The supplied state-root evidence must assert:

- custody UID/GID ownership;
- exact mode `0700`;
- direct non-symlink canonical path;
- at least two retained ancestors;
- all retained ancestors root-owned, direct, symlink-free, and not
  group/other-writable;
- training UID direct-write denial; and
- training UID rename/unlink denial.

The `consumed/` evidence must independently assert custody UID/GID ownership,
mode `0700`, direct/non-symlink status, exact parent binding, and training UID
write/rename/unlink denial.

These are evidence requirements, not facts observed by V82 itself.

## Socket policy

The socket parent must be:

- custody UID owned;
- dedicated IPC GID;
- mode `0750`;
- direct and non-symlink;
- writable by custody;
- traversable by the training identity; and
- not writable by the training identity.

The advertised socket must be custody-UID / IPC-group owned, mode `0660`, and
identified as an AF_UNIX socket. Both runtime and custody identities must be
able to connect through the IPC group.

## Service hardening

V82 requires supplied effective-service evidence equivalent to:

```text
manager=system
User=<custody UID>
Group=<custody primary GID>
SupplementaryGroups=<IPC GID only>
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
PrivateDevices=true
ProtectSystem=strict
ProtectHome=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectKernelLogs=true
ProtectControlGroups=true
LockPersonality=true
RestrictSUIDSGID=true
RestrictRealtime=true
CapabilityBoundingSet=[]
AmbientCapabilities=[]
RestrictAddressFamilies=[AF_UNIX]
ReadWriteTargets=[socket_parent,state_root]
runtime_can_control_service=false
custody_uid_only_reviewed_service=true
```

No extra writable target or address family is accepted.

## Freshness

Supplied evidence carries:

- observation timestamp;
- expiry timestamp;
- positive evidence generation; and
- boot-ID SHA-256.

The caller also supplies `verification_now_ms`.

V82 rejects future observations, expired observations, and evidence windows over
five minutes.

The classifier intentionally keeps:

```text
verification_clock_authority_proven=false
evidence_generation_monotonicity_proven=false
live_host_qualification_performed=false
```

A future designated-host collector must own those properties.

## Success meaning

Success is named:

`status=source_policy_qualified`

It means the supplied evidence conforms to the reviewed policy. It does not
mean the host has actually been observed.

Positive results therefore still report:

```text
independent_custody_proven=false
production_gate_ready=false
attempt_claimed=false
training_execution_performed=false
wallet_access_performed=false
funds_movement_performed=false
```

## Next gate

`designated_host_read_only_custody_evidence_collection_v1`

That collector must run read-only on Xiphos, derive the evidence from the live
host rather than accepting caller assertions, bind its observation to a fresh
clock/boot generation, and make no installation or mutation.

Only after that evidence is separately classified should installation or
attempt-claim work be considered.

## Proof

```bash
node --check tools/apollyon-custody-host-policy-qualification-v1.mjs
node --check scripts/prove_apollyon_custody_host_policy_qualification_v1.mjs
node scripts/prove_apollyon_custody_host_policy_qualification_v1.mjs
```

The proof covers a positive policy, identity collapse, IPC-primary-group
collision, writable custody state, unsafe ancestors, writable socket parent,
wrong socket mode, extra writable paths, AF_INET expansion, extra custody-UID
process authority, source-binding drift, stale/overlong evidence, and canonical
object-key ordering.
