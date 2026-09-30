# VOID public seed adapter — historical record

Status: retired historical Alienware adapter evidence

Marker: `VOID_RETIRED_PUBLIC_SEED_ADAPTER_HISTORY_V1`

The current configured public HTTPS seed origin is:

- `https://seed.nullfeed.org`

The old Alienware internal/operator-mesh adapter is preserved only as historical
evidence from its observation window:

- historical host: `100.122.79.39`
- historical port: `4111`
- historical base: `http://100.122.79.39:4111`
- adapter manifest route: `/__void/adapter.json`
- readiness route: `/__void/ready.json`
- private RPC was blocked; `/rpc` returned `404 not_public`

Historical checkpoint:

- `ckpt-alienware-durable-public-seed-adapter-note-green-20260606-105500`

Alienware is permanently retired and is not part of the active operator fleet.
These coordinates must not be used as live defaults, bootstrap authority, or
service configuration.

The live node runner and live user-service installer intentionally do not inject
a `VOID_PUBLIC_SEED_ADAPTER_BASE` default. Public bootstrap/discovery authority
is handled by the reviewed bootstrap and public-origin contracts instead.

Reusable adapter proof/deployment helpers require an explicit reviewed
`VOID_SEED_UPSTREAM`; they no longer default to the retired Alienware node.
The old `live-public-seed-stack-closeout-v1.sh` checkpoint is fail-closed and
retained only as inert historical evidence.

## Current safety invariants

- active fleet topology does not include Alienware;
- live node startup does not inject a retired seed-adapter coordinate;
- reusable adapter helpers require an explicit upstream selection;
- the historical Alienware stack-closeout script cannot execute; and
- a seed hostname or adapter coordinate is not bootstrap authority by itself.
