# VOID Network funding

VOID Network funding is currently centered around the guarded USDC -> VOID path.

Current public seed:

- https://zoso-alienware-aurora-r7.taila47fd.ts.net

Current funding model:

- participants may request VOID using USDC
- the intended public funding path is the guarded Buy VOID / USDC -> VOID flow
- fulfillment is manual/guarded, not automatic
- no exchange custody is required
- no automatic token delivery is promised
- no investment return is promised

Current public status:

- VOID public seed is reachable
- participant page is reachable
- public bootstrap is reachable
- readiness is reachable
- seed adapter status is reachable
- private RPC remains blocked
- sensitive wallet/admin/operator surfaces remain blocked

Funding helps pay for:

- keeping the public node online
- hardware
- internet uptime
- Tailscale/Funnel/domain/tunnel infrastructure
- public docs
- participant UI polish
- DataNet storage/readback work
- Work Credits loop development
- testing and onboarding
- security hardening
- development time

Important funding safety notes:

- VOID is experimental
- Buy VOID fulfillment is guarded
- do not send funds expecting automatic delivery
- do not treat this as an investment contract
- no profit, yield, or return is promised
- token delivery requires explicit review/fulfillment
- private JSON-RPC is not public
- wallet files, keys, secrets, admin routes, and operator routes are blocked

How to participate right now:

1. Open the public participant page.
2. Inspect the public seed status.
3. Use the guided Buy VOID request flow only if you understand fulfillment is guarded.
4. Share feedback or bugs.
5. Help test DataNet and public readback.

Public entrypoints:

- /
- /participant
- /__void/adapter.json
- /__void/ready.json
- /__void/public-bootstrap.json
- /__void/public-seed-adapter/status.json

Current public URL:

- https://zoso-alienware-aurora-r7.taila47fd.ts.net

## Funding engine focus

The funding engine focus packet explains why VOID funding is tied to the core system loop:

Funding -> Work Credits -> DataNet -> Validators -> Trust -> more funding and participation.

Public packet:
- docs/public/public-node-funding-engine-focus-packet-v1.md

Marker:
- VOID_FUNDING_ENGINE_FOCUS_PACKET_V1

Safety:
- funding does not skip work verification
- funding does not automatically award Work Credits
- funding does not open public mutation
- funding does not create an investment-return promise
- funding does not create automatic fulfillment

## Funding packet index

Start here for the public funding packet ladder.

Public packet index:
- docs/public/public-node-funding-packet-index-v1.md

Marker:
- VOID_FUNDING_PACKET_INDEX_V1

The index links:
- Funding Support v1
- Funding Engine Focus Packet v1
- Funding Needs Matrix v1
- Funding Supporter Action Packet v1

Safety:
- no funds moved by the index
- no payment link created by the index
- no return promise
- no automatic fulfillment
- no automatic Work Credit award
- no validator admission promise
- no public mutation access
