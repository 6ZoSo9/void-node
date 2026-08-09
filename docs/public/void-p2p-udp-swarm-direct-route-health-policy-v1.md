# VOID P2P UDP Swarm Direct-Route Health Policy v1

## Purpose

Define a pure, fail-closed policy for deciding when a promoted authenticated UDP direct route has accumulated enough bounded health evidence that a **later** lane may consider relay retirement.

This policy does not retire a relay, close a socket, mutate the normal peer map, persist direct-route evidence, or activate public UDP.

## Required evidence

Relay-retirement authorization is returned only when all of the following remain true at evaluation time:

- the session, expected peer, relay node, and relay stream bindings are canonical;
- the authenticated peer identity exactly matches the expected peer;
- the promoted normal route is still live and uses direct transport;
- the retained relay fallback is still live;
- the promoted direct route has remained under observation for at least 30 seconds;
- at least five direct round trips have succeeded consecutively;
- no direct round-trip failure has been observed since promotion; and
- the most recent successful direct round trip is no more than 10 seconds old.

Any missing, stale, malformed, failed, or contradictory evidence returns `retain_relay`.

## Output boundary

`evaluateVoidUdpSwarmDirectRouteHealthPolicyV1()` returns one of:

- `retain_relay`
- `authorize_relay_retirement`

Even the authorization result explicitly reports:

- `relay_retirement_performed=false`
- `normal_peer_map_mutation_performed=false`
- `direct_route_mutation_performed=false`
- `relay_socket_mutation_performed=false`

Authorization is therefore evidence, not execution authority.

## Why the relay must still be live

V1 deliberately refuses to authorize retirement after the relay has already disappeared. The point of this seam is to make an explicit decision while make-before-break continuity still exists, not to retroactively bless an accidental loss of fallback.

## Proof

Run:

```bash
npx --no-install tsx scripts/prove_void_p2p_udp_swarm_direct_route_health_policy_v1.ts
```

The proof covers malformed binding, identity mismatch, missing direct route, wrong transport, lost relay fallback, invalid clock, insufficient health duration, any failed round trip, insufficient consecutive successes, missing/stale success evidence, the exact freshness boundary, and the successful authorization case.

Expected marker:

```text
VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_POLICY_V1_PROOF_GREEN
```

## Explicit non-authority

This lane does not:

- collect runtime health observations;
- call the policy from Node;
- retire or close the retained relay;
- persist verified-direct reachability evidence;
- activate production/public UDP;
- modify router, firewall, DNS, interfaces, services, or deployment state;
- access credentials, wallets, signers, validators, Work Credit, transactions, broadcasts, or funds.

## Next seam

A later observation lane may collect bounded direct-route round-trip evidence and feed this pure policy. A still-later execution lane would require separate authority before acting on `authorize_relay_retirement`.
