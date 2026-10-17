# Sponsored runtime storage production selection v1

Marker: `VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_PRODUCTION_SELECTION_V1`.

Status: **production names/paths selected; not provisioned; no live authority**.

## Purpose

This generation consumes the accepted sponsored-runtime storage topology policy
and selects the concrete production namespace required for later host planning.

It intentionally does **not** select or hard-code numeric runtime UID/GID values.
Those are host resources and must be resolved in a later designated-host plan.

## Selected production identity

System service:
`void-economic-sponsored-runtime-v1.service`

System account:
`void-sponsored-runtime`

System group:
`void-sponsored-runtime`

Expected system-unit install path:
`/etc/systemd/system/void-economic-sponsored-runtime-v1.service`

The service is not installed by this generation.

## Selected storage topology

Root-owned common parent:
`/var/lib/void-economic-sponsored-runtime-v1`

Expected parent custody:
- owner UID 0;
- owner GID 0;
- mode 0755;
- non-runtime-writable.

Selected runtime-owned private roots:
- time: `/var/lib/void-economic-sponsored-runtime-v1/time`;
- reservation: `/var/lib/void-economic-sponsored-runtime-v1/reservation`;
- replay: `/var/lib/void-economic-sponsored-runtime-v1/replay`.

Expected root mode after a future provisioning gate:
`0700`.

Required pre-provisioned time children:
- `observation-time-v1.queue`;
- `records`.

Required pre-provisioned reservation children:
- `records`;
- `sponsorship-admission-v1.queue`.

Replay children remain dynamic and are not predeclared.

The common parent is deliberately root-owned rather than runtime-owned. This is
what prevents the runtime from renaming or recreating sibling root directories.

## Historical replay root

The historical same-UID replay root:

`/home/zoso/.local/state/void-economic-epoch2-public-submission-gateway-v1/replay-v1`

is explicitly **not** reused for this stronger production topology.

## Policy-shape proof

The proof binds:
- this exact selection JSON;
- the accepted topology-policy Git object;
- the historical replay-binding artifact.

It feeds the selected service unit and paths into the accepted topology
classifier using proof-only synthetic UID/GID 41001.

That synthetic numeric identity is never serialized into the production
selection and is not production authority. Its sole purpose is to prove that the
selected names/paths satisfy the accepted policy shape once a future host plan
resolves a real dedicated system identity.

## Selection identity

`voidsponsoredstoreselect1_0224ed5a5cb20670e4b12259f0871357ebb8b52478702a98dd80edbf1d3ae938`

The ID is SHA-256 over canonical selection bytes excluding `selection_id`.

## Non-authority

This generation keeps false:
- production runtime UID/GID selected;
- live host evidence verified;
- storage bootstrap;
- service installation/start;
- systemd/filesystem mutation;
- all three root-stability proofs;
- runtime integration;
- gas sponsorship;
- transaction submission;
- public presale activation;
- Work Credit write;
- funds movement.

## Next gate

`BUILD_SPONSORED_RUNTIME_STORAGE_DESIGNATED_HOST_PLAN_V1`

That future plan may inspect the designated host and resolve whether the selected
system account/group already exist or which unused system UID/GID would be safe.
Provisioning remains a distinct explicit authorization.

PROTECT THE CORE.
