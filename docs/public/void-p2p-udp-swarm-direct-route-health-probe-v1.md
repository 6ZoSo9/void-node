# VOID P2P UDP Swarm Direct-Route Health Probe v1

## Purpose

Define the smallest authenticated-route health-probe message/state primitive needed to produce real round-trip results for the direct-route health observer in #1132.

This lane creates and validates message objects only. It does not send them, own timers, access sockets, mount into Node, mutate routing, or retire a relay.

## Message contract

Two exact-key messages are defined:

- `UDP_SWARM_DIRECT_HEALTH_PING`
- `UDP_SWARM_DIRECT_HEALTH_PONG`

Each carries only:

- protocol version;
- exact 128-bit UDP Swarm session ID;
- random 128-bit probe ID;
- bounded monotonic probe sequence; and
- the sender's local `sent_at_ms` value.

The pong exactly echoes the ping binding. It contains no responder receive timestamp, so the initiator never trusts peer-supplied timing data.

## Initiator state

`VoidUdpSwarmDirectRouteHealthProbeV1` permits at most one outstanding probe for a session.

`createPing()`:

- requires a valid local clock;
- generates a random 128-bit probe ID;
- advances a bounded sequence; and
- refuses to create another ping while one is pending.

`acceptPong()` accepts only an exact session / probe ID / sequence / sent-time echo of the pending ping. Mismatched pongs do not clear the legitimate pending probe. Replays after success or timeout are rejected because the pending probe no longer exists.

RTT is computed exclusively as local receive time minus the locally recorded send time.

## Timeout semantics

The default timeout is 3,000 ms and is configurable only within 100–10,000 ms.

The timeout boundary is inclusive: an exact-boundary pong may still succeed. A matching pong arriving after the timeout is returned as a failure even if an explicit expiry sweep has not run yet.

`expirePending()` is a pure state transition. It owns no timer. A later Node mount may call it from a separately bounded scheduler.

Local clock regression poisons the probe state fail closed.

## Observer handoff

Successful probe results expose only:

- local observation time;
- locally measured RTT; and
- exact probe binding metadata.

Timeout/clock failures expose a bounded failure reason and local observation time. Those result objects can be passed directly into #1132's observer using `recordSuccessfulRoundTrip()` or `recordFailedRoundTrip()`.

The probe primitive does not evaluate relay-retirement policy itself.

## Authentication boundary

These messages are intended to travel only on the already-authenticated promoted direct peer route. This primitive does not authenticate a peer itself and does not claim a Node mount. The eventual Node integration must reject health messages arriving from any route that is not the exact authenticated promoted direct route for the session.

## Explicit non-authority

This lane does not:

- send any network packet;
- own an interval or timeout;
- access any socket;
- mount into Node;
- mutate the normal peer map;
- promote or demote a direct route;
- mutate or retire the relay fallback;
- persist verified-direct evidence;
- activate production/public UDP;
- modify router, firewall, DNS, or interfaces;
- access credentials, wallets, signers, validators, Work Credit, transactions, broadcasts, or funds.

## Proof

Run:

```bash
npx --no-install tsx scripts/prove_void_p2p_udp_swarm_direct_route_health_probe_v1.ts
```

The proof covers exact-key normalization, one-outstanding-probe enforcement, random probe binding, mismatched pong rejection, replay rejection, inclusive timeout boundary, late-pong failure, local clock poisoning, RTT measurement, timeout results, and handoff into #1132's observer and #1131's sustained-health policy.

Expected marker:

```text
VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_V1_PROOF_GREEN
```

## Next seam

A later isolated lane may add these two message types to the normal authenticated Node framing path and feed their local results into the #1132 observer. That mount must remain relay-preserving and must still stop before relay retirement execution.
