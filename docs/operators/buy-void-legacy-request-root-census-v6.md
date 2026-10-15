# Buy VOID legacy request-root census v6

Marker: `VOID_BUY_VOID_LEGACY_REQUEST_ROOT_CENSUS_V6`.

Status: **read-only metadata census successor; never historical-disposition authority**.

## Purpose

V6 preserves the bounded candidate discovery and historical nonclaims of the
legacy request-root census while replacing the historical V2 authenticated
runtime dependency with the corrected V6 qualifier.

The candidate set remains:
- fixed historical repository default;
- live-process cwd default bound to the authenticated MainPID generation;
- explicit request root reported by the bounded confirmed-closeout loopback route;
- every direct 40-hex immutable release under `/opt/void-node-live/releases`;
- future stable root `/var/lib/void-buy-request-journal-v1`.

Only metadata and direct-entry counts are observed. Direct-entry names are not
emitted, and request/payment JSONL contents are not read.

## V6 authenticated boundary

The source binds qualifier Git blob:

`83bfd3f3baf5c9d2a9e21852b0f752f27d7749bc`.

A future separately authorized root run uses that qualifier's authenticated
private-manager query before and after the census window and requires:
- exact protected V6 + retained V1/V2 predecessor generation;
- authenticated private user-manager peer and same retained query FD;
- exact MainPID generation/cgroup/executable binding;
- NoNewPrivileges in systemd and kernel;
- PrivateUsers=false;
- kernel non-bounding capability sets zero;
- projected CapabilityBoundingSet == KernelCapBnd;
- stable `/proc/sys/kernel/cap_last_cap` and supported capability mask;
- projected/kernel masks contain no bits above that ceiling.

The runtime process, listener, loopback status, immutable-release inventory and
candidate observations must remain stable across the same authenticated
generation.

Ordinary `systemctl --user`, caller-selected user-bus state, unit
WorkingDirectory, and process environment are not authority.

## Historical nonclaim

Absent, empty, or zero-length journal shapes are not authenticated fresh
genesis. Every outcome retains:
- `historical_request_history_disposition_proven=false`;
- `historical_origin_authenticated=false`;
- `filesystem_rollback_prevention_proven=false`;
- `migration_authorized=false`;
- `production_gate_ready=false`.

Surviving/noncanonical history requires review. If only absent/empty shapes are
observed, the next gate remains explicit Sovereign legacy-history disposition
bound to the exact census evidence plus an independent external witness.

No host/service/systemd mutation, process-environment read, request/payment
content read, external network call, payment acceptance, presale/WC activation,
transaction or funds movement.

PROTECT THE CORE.
