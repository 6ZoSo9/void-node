# Buy VOID allocation high-water custody qualification v1

Marker:

`VOID_BUY_VOID_ALLOCATION_HIGH_WATER_CUSTODY_QUALIFICATION_V1`

## Purpose

This source-only classifier defines the evidence contract for issue #2452's
designated-host allocation custody gate.

It composes the already-merged canonical allocation stack:

1. hash-chained allocation JSONL authority;
2. exact allocation high-water binding;
3. four-phase publication/recovery protocol; and
4. crash-recoverable filesystem publication writer.

Those source contracts intentionally do not prove that a production host keeps
the allocation ledger and protected high-water outside one rollback/path
replacement failure domain. This classifier defines what a later read-only host
qualification collector must prove.

A successful result is only:

`status=qualified_source_evidence`

It is **not** a live-host qualification, storage bootstrap, service
installation, runtime mount, presale activation, transaction authority, or
funds authority.

## Inputs

The classifier receives only explicit evidence:

```ts
classifyBuyVoidAllocationHighWaterCustodyQualificationV1({
  now_ms,
  expected_source_head_sha,
  expected_host_id_sha256,
  ledger_jsonl,
  high_water_json,
  evidence,
})
```

It performs no host discovery and no filesystem or service mutation.

Before host-policy evidence is considered, the supplied ledger and high-water
must bind through the merged canonical high-water classifier. Qualification
cannot bless a semantically invalid or rolled-back presented state.

The evidence packet also binds exact SHA-256 and byte length for both supplied
state objects.

## Source and freshness binding

Evidence must bind:

- repository `6ZoSo9/void-node`;
- exact 40-hex reviewed source head;
- exact allocation publication-writer marker;
- exact designated-host content identity;
- monotonically positive evidence generation;
- observation and expiry timestamps.

The reviewed source head and host identity are caller-required expected values;
the packet cannot select its own accepted source/host identity.

Evidence expires after at most 15 minutes and must be no more than five minutes
old at classification time. A later live collector must issue a fresh packet
after remount, restore, permission change, service-user change, custody-medium
replacement, or other host configuration change.

## Service identity separation

The public runtime identity and custody-service identity must be distinct,
positive non-root UID values.

The target production trust split is:

```text
public Buy runtime
  -> AF_UNIX request only
  -> narrow custody service
  -> independently validated canonical transition
  -> protected ledger/high-water publication
```

This classifier grants no IPC server, arbitrary path write, generation
selection, transaction, or runtime authority.

## Stable root policy

Both the ledger root and the protected high-water custody root must be:

- absolute canonical paths;
- direct non-symlink directories;
- mode `0700`;
- owned by the custody-service UID/GID;
- unwritable by the public runtime;
- non-renamable by both admitted service identities.

Every ancestor from `/` through the immediate parent is enumerated exactly.
Each ancestor must be:

- root-owned;
- non-symlink;
- not group/other writable;
- unwritable and non-renamable by both runtime and custody identities.

This is the evidence-level representation of the host policy that removes the
source writer's admitted post-revalidation pathname replacement schedule.

## Independent high-water custody

Different pathnames are not enough.

The ledger root and protected custody root must have distinct:

- mount IDs;
- device major/minor identities; and
- mount sources.

The strict v1 profile therefore requires a separate device/mount failure domain.
Accepted filesystems are `ext4` and `xfs`.

Both mounts must report canonical sorted mount options including:

- `rw`;
- `nodev`;
- `noexec`; and
- `nosuid`.

`bind`, `rbind`, and `remount` evidence is rejected.

A later generation may review another independent monotonic authority, but this
v1 classifier intentionally does not weaken the separate-device rule.

## Narrow AF_UNIX IPC evidence

The packet binds one local socket and parent:

- address family exactly `AF_UNIX`;
- socket mode `0660`;
- owner UID = custody service;
- owner GID = runtime service group;
- runtime may connect;
- runtime may not write the socket parent;
- runtime may not replace the socket;
- custody service may write the socket parent.

The classifier does not create the socket or service.

## Service hardening evidence

The packet requires the reviewed service-hardening profile:

- `NoNewPrivileges=true`;
- `PrivateTmp=true`;
- `PrivateDevices=true`;
- `ProtectSystem=strict`;
- `ProtectHome=true`;
- `ProtectKernelTunables=true`;
- `ProtectKernelModules=true`;
- `ProtectControlGroups=true`;
- `LockPersonality=true`;
- `RestrictSUIDSGID=true`;
- `RestrictRealtime=true`;
- empty capability bounding and ambient capability sets;
- AF_UNIX-only address-family policy.

The declared writable filesystem paths must be exactly the reviewed ledger and
protected-custody roots. Runtime-directory/socket creation remains a separate
systemd packaging concern.

## Required negative probes

All reviewed negative results are mandatory:

- public runtime cannot rename ledger root;
- public runtime cannot rename custody root;
- public runtime cannot recreate either stable parent;
- symlink substitution denied;
- bind-mount substitution denied;
- remount substitution denied;
- missing custody medium HOLDS instead of falling back;
- stale high-water rejected;
- alternate same-generation high-water rejected;
- both-root rollback rejected;
- reboot preserves the reviewed mount identity.

A single missing/false probe HOLDS the packet.

## Synthetic proof boundary

The focused proof builds a synthetic qualifying packet and proves rejection of:

- shared runtime/custody UID;
- shared mount ID, device, or mount source;
- runtime write access to protected custody;
- writable ancestor;
- runtime ancestor rename authority;
- bind-mount evidence;
- non-AF_UNIX IPC;
- runtime socket-replacement authority;
- incomplete systemd hardening;
- excess writable paths;
- missing negative-probe result;
- stale evidence;
- source-head mismatch;
- host-identity mismatch;
- state-digest mismatch;
- semantically mismatched high-water; and
- symlinked root evidence.

This is schema/policy proof only. It does not prove that any real host currently
has these properties.

## Authority boundary

The authority object explicitly keeps false:

- live host observation and qualification;
- host, mount, ownership, permission, service or socket mutation;
- storage bootstrap;
- runtime integration;
- payment acceptance;
- wallet/private-key/signer access;
- transaction construction/signing/broadcast;
- Chain-2050 writes;
- inventory movement;
- market/presale activation;
- treasury/liquidity movement;
- production readiness; and
- funds movement.

The next gate after this source contract is a separately reviewed **read-only**
host evidence collector/receipt. Installation or mutation of a custody service,
mount, ownership, permission, or runtime configuration remains an explicit
operator-controlled gate.
