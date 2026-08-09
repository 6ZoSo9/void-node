# VOID P2P UDP Swarm Node Direct-Route Health Mount v1

## Purpose

Mount the #1134 direct-route health probe and #1132 fail-closed observer into the already-promoted UDP direct route created by #1130, while preserving the retained relay fallback and stopping before relay-retirement execution.

This is the first runtime health-measurement seam. It does not create a new timer and does not retire the relay even when #1131 authorizes retirement.

## Runtime binding

Each successfully promoted UDP route receives exactly one health context bound to:

- the exact promotion session ID;
- the exact authenticated peer node ID;
- the exact promoted direct `Peer` object;
- one `VoidUdpSwarmDirectRouteHealthProbeV1` instance; and
- one `VoidUdpSwarmDirectRouteHealthObserverV1` instance.

The observer promotion timestamp and the candidate's one-shot promotion authorization use the same local timestamp.

Health traffic is valid only while all of these remain true:

- `peers.get(peerNodeId)` is the exact promoted direct peer;
- normal VOID authentication is complete;
- the route transport is `direct`;
- the direct socket is not destroyed;
- the exact retained relay-fallback record is still bound to that direct peer; and
- the exact relay peer/stream tuple is still live.

Ordinary authenticated direct peers, staged candidates, and the dormant retained relay peer cannot participate in this health protocol.

## Message handling

After normal VOID authentication, Node recognizes #1134's exact `UDP_SWARM_DIRECT_HEALTH_PING` and `UDP_SWARM_DIRECT_HEALTH_PONG` messages.

Invalid health-shaped messages are rejected before other post-authenticated message handling.

For an exact promoted direct route:

- a PING is answered on the same direct peer with the stateless exact-echo PONG from #1134;
- a PONG is accepted only by that route's one-outstanding-probe state;
- successful locally measured RTT is recorded in #1132;
- timeout or local-clock failure is recorded as a failed round trip in #1132; and
- mismatched/replayed PONGs cannot clear or credit the valid pending probe.

No remote receive timestamp exists or is trusted.

## Bounded scheduling

Node reuses the existing one-second relay/maintenance sweep. No additional interval or timeout is created.

The health mount uses a 7,500 ms probe cadence. The #1134 probe keeps its 3,000 ms default timeout. The maintenance sweep:

1. ignores any route whose promoted direct binding or retained relay fallback is not live;
2. expires a pending probe and records its failure exactly once;
3. issues at most one new probe when the 7,500 ms cadence is due; and
4. never holds more than one outstanding probe for a promoted session.

Five successful probes at this cadence span at least 30 seconds, satisfying #1131's sustained-success window only if every other policy condition is also true.

## Read-only policy visibility

`udpSwarmPromotedDirectRouteHealthSnapshotV1()` exposes, without socket objects:

- live direct-route state;
- live relay-fallback state;
- observer snapshot;
- probe snapshot;
- the delegated #1131 policy decision;
- whether relay retirement is currently authorized; and
- `relay_retirement_performed=false`.

Authorization is visibility only. This lane contains no function that closes or retires the relay because of the health policy decision.

## Failure behavior

If a direct health probe times out, #1132 records a permanent failure for that promotion session and #1131 returns `retain_relay`.

If the promoted direct route closes while the retained relay is still live, the health context is deleted and #1130 restores that relay as the normal route.

If the retained relay disappears first, Node preserves the promoted direct route, stops issuing health probes for the no-longer-retirable fallback, and the policy snapshot returns `relay_fallback_not_live`. A later direct close cannot resurrect the dead relay.

## Explicit non-authority

This lane does not:

- retire, close, or destroy the retained relay because of health authorization;
- persist verified-direct evidence;
- activate production/public UDP;
- deploy or restart services;
- modify router, firewall, DNS, or interfaces;
- access credentials, wallets, signers, validators, Work Credit, transactions, broadcasts, or funds.

## Proof

Run:

```bash
npx --no-install tsx scripts/prove_void_p2p_udp_swarm_node_direct_route_health_mount_v1.ts
```

The focused proof creates a symmetric authenticated/promoted secure UDP route with a live retained relay on both Nodes, drives five deterministic Node-level ping/pong round trips spanning 30 seconds, verifies read-only health authorization, verifies relay preservation, injects a timeout and observes fail-closed retention, proves non-promoted/relay bindings cannot process health traffic, proves direct-close failback, and proves relay-loss health shutdown without direct-route teardown.

Expected marker:

```text
VOID_P2P_UDP_SWARM_NODE_DIRECT_ROUTE_HEALTH_MOUNT_V1_PROOF_GREEN
```

## Next seam

After this mount is exact-head green, a separate later lane may define the one-shot relay-retirement executor that consumes an exact current health authorization. That executor must remain isolated, recheck every route/fallback binding synchronously, and is not part of this lane.
