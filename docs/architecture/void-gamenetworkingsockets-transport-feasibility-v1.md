# VOID GameNetworkingSockets transport feasibility v1

Marker: `VOID_GAMENETWORKINGSOCKETS_TRANSPORT_FEASIBILITY_V1`

## Decision

Proceed to a **default-off, loopback-only sidecar build and benchmark probe**.

Do not replace the current VOID transport in this phase.

## Why this is useful

Valve's standalone GameNetworkingSockets library can provide:

- reliable and unreliable messages over UDP;
- fragmentation and reassembly for messages larger than an MTU;
- encrypted transport sessions;
- detailed latency, loss and connection statistics;
- configurable priority and bandwidth-sharing lanes;
- IPv4 and IPv6;
- future peer-to-peer and NAT-traversal experiments.

The standalone library does not require the Steam client. The reviewed candidate
is upstream tag `v1.5.1` under BSD-3-Clause.

Steam Datagram Relay, Steam authentication and Steam's signaling services are
not assumed. Unknown-IP peer-to-peer operation requires a signaling side
channel. Native ICE remains beta and TURN fallback is not assumed.

## Current VOID boundary

`src/node_core.ts` remains authoritative. It currently uses `node:net` TCP,
four-byte length-prefixed JSON frames and a 65,536-byte maximum message size.

The preserved wire messages are:

- `HELLO`
- `PEERS`
- `SUB`
- `PUB`

`PUB` messages retain VOID's Ed25519 signatures. GameNetworkingSockets session
encryption is transport protection only; it must not replace message signatures,
node identity, authenticated edge walls, signed trust policy, activation permits
or live activation leases.

`src/p2p/p2p.ts` is currently only a type-check shim, so the integration boundary
belongs beside `src/node_core.ts`, not inside the shim.

## Proposed sidecar boundary

The first native experiment should be a separate process:

```text
VOID node_core.ts
    |
    | loopback-only bounded adapter
    v
VOID GameNetworkingSockets sidecar
    |
    | standalone UDP transport
    v
peer sidecar
```

The sidecar must preserve the exact encoded VOID wire message. It must not parse,
reinterpret or authorize consensus data.

Suggested benchmark lanes:

1. priority 0: control and peer-management messages;
2. priority 1: block and transaction announcements;
3. priority 2: DataNet bulk transfer;
4. simulated loss, latency and packet reordering.

## Ordered gates

1. Host readiness probe on Precision and Nimo.
2. Exact upstream source/tag and license receipt.
3. Reproducible local library build without installation.
4. Loopback sidecar message echo.
5. Loopback loss/latency benchmark.
6. Tailnet direct-IP benchmark between Nimo and Precision.
7. Only then evaluate custom signaling and NAT traversal.
8. Production activation remains separately reviewed and confirmed.

## Fail-closed limits

This lane performs no:

- upstream clone or download;
- package installation;
- native compilation;
- listener start or external connection;
- Steam Web API key or operator-token access;
- consensus, node-identity or trust-policy change;
- service restart or deployment;
- Work Credit write;
- wallet or signer access;
- payment execution or money movement.
