# VOID P2P UDP Swarm Direct-Route Health Observer v1

## Purpose

Collect bounded, timestamped direct-route health observations for one promoted UDP Swarm route and convert them into the exact evidence shape consumed by `evaluateVoidUdpSwarmDirectRouteHealthPolicyV1()`.

This is an evidence-collection seam only. It does not create network probes, own timers, read or write sockets, mount into `Node`, mutate routing, or retire a relay.

## Exact binding

One observer instance is permanently bound at construction to:

- one promotion session ID;
- one expected authenticated peer node ID;
- one relay node ID;
- one relay stream ID; and
- the direct-route promotion timestamp.

Invalid bindings or an invalid promotion timestamp are rejected at construction.

## Observation contract

The observer accepts two event classes:

- successful direct round trip: timestamp + bounded RTT;
- failed direct round trip: timestamp + bounded failure reason.

Accepted observation timestamps must be safe non-negative integers, must not predate promotion, and must be strictly increasing. Duplicate or out-of-order timestamps are not ignored.

The observer is bounded to at most 1,000,000 accepted observations per promotion session and accepts RTT values only up to 60,000 ms.

## Fail-closed poisoning

Malformed telemetry must never disappear in a way that could later authorize relay retirement. Therefore any of these conditions poison the observer instance:

- invalid timestamp;
- timestamp before promotion;
- duplicate timestamp;
- out-of-order timestamp;
- observation-capacity exhaustion;
- invalid or oversized RTT;
- counter exhaustion; or
- invalid failure-reason text.

A poisoned observer remains poisoned. Its policy input is synthesized with at least one failed round trip, forcing the health policy to retain the relay.

## Policy handoff

`policyInput()` combines immutable route bindings plus collected counters/timestamps with caller-supplied live route state:

- authenticated peer identity;
- whether the promoted direct route is live;
- current normal-route transport; and
- whether relay fallback remains live.

`evaluate()` passes that exact input to the existing direct-route health policy. The observer does not duplicate the policy thresholds.

Consequently, authorization still requires the policy's complete sustained-health wall, including a successful observation span of at least 30 seconds, five consecutive successes, zero failures, and freshness within 10 seconds.

## Explicit non-authority

This lane does not:

- send ping/probe packets;
- own an interval or timeout;
- access a socket;
- mount observation collection into Node;
- mutate the normal peer map;
- promote or demote a direct route;
- close, retire, or mutate the relay socket or stream;
- persist verified-direct evidence;
- activate production/public UDP;
- modify router, firewall, DNS, or interfaces;
- access credentials, wallets, signers, validators, Work Credit, transactions, broadcasts, or funds.

Even when `evaluate()` returns the policy's `authorize_relay_retirement` decision, `relay_retirement_performed` remains false.

## Proof

Run:

```bash
npx --no-install tsx scripts/prove_void_p2p_udp_swarm_direct_route_health_observer_v1.ts
```

The proof covers valid sustained observation, terminal-burst rejection, failed observations, duplicate and out-of-order timestamp poisoning, invalid RTT poisoning, invalid failure-reason poisoning, route/fallback loss, stale health, frozen snapshots, policy-input binding, and the explicit non-authority boundary.

Expected marker:

```text
VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_OBSERVER_V1_PROOF_GREEN
```

## Next seam

A later isolated lane may mount this observer into the promoted-direct Node route and feed it actual authenticated round-trip results. That runtime mount still must not retire the relay; relay retirement execution remains a separate later authority boundary.
