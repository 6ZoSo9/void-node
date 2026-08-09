# VOID P2P UDP swarm direct-route health observation v1

## Purpose

Define the source-only authenticated round-trip observation primitive that can produce the bounded health evidence required by `udp_swarm_direct_route_health_policy_v1` after an authenticated UDP candidate has been promoted into normal Node routing.

This lane does **not** mount the observer into `src/node_core.ts`, transmit a packet, retire a relay, persist verified-direct evidence, or activate public/production UDP.

## Stack position

This lane is intended to stack directly on the direct-route health policy from PR #1131.

The preceding seams remain separate:

1. authenticate a secure UDP candidate while the relay remains the normal route;
2. promote the exact candidate atomically while retaining the exact relay as dormant failback;
3. evaluate sustained direct-route health before relay retirement may be authorized; and
4. **this lane:** define how authenticated direct-route round-trip evidence is collected without granting retirement authority.

A later Node-integration lane may mount this primitive into the promoted direct route and feed its evidence into the #1131 policy.

## Wire contract

The primitive defines two exact-key messages:

- `UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE`
- `UDP_SWARM_DIRECT_ROUTE_HEALTH_ACK`

Each message carries only:

- protocol version;
- exact UDP swarm session ID;
- one 128-bit lower-hex probe ID;
- exact sender VOID node ID; and
- exact recipient VOID node ID.

Remote wall-clock timestamps are intentionally absent. Health timing is measured only by the local observer that issued the probe.

The normalizer rejects malformed messages, unknown message types, invalid node/probe IDs, invalid session tokens, and extra wire keys.

## Authenticated-route binding

A probe may be acknowledged only when the caller identifies the already-authenticated peer as the exact expected VOID node ID and the wire message is bound to the exact session, sender, and recipient.

An ACK may create health credit only when:

- it arrives from the exact authenticated expected peer;
- its session binding is exact;
- its sender/recipient bindings are exact;
- its probe ID equals the one currently outstanding local probe; and
- it arrives no later than that probe's local deadline.

Wrong-peer, detached-session, wrong-recipient, wrong-probe, unsolicited, duplicate, and late ACKs cannot create successful health evidence.

## Probe cadence and bounds

V1 uses these fixed defaults:

- probe interval: **7,500 ms**;
- probe timeout: **5,000 ms**;
- maximum probes per observer session: **4,096**; and
- at most one outstanding probe at a time.

The default probe ID generator uses 16 cryptographically random bytes encoded as 32 lower-hex characters. A test-only/injected generator is accepted by the constructor, but every generated ID is still format-checked and reuse within the same observer session is rejected.

A timeout is recorded only after the deadline has passed; an ACK arriving exactly at the deadline remains valid.

## Fail-closed health accounting

The observer exposes only bounded evidence:

- exact session / expected-peer / relay / relay-stream bindings;
- promotion timestamp;
- consecutive successful round trips;
- failed round trips since promotion;
- first successful round-trip timestamp; and
- most recent successful round-trip timestamp.

A timed-out probe increments `failed_round_trips_since_promotion` and resets the consecutive-success counter.

The failure count is not erased by later success. That is deliberate because #1131 currently requires zero failed round trips since promotion before it may return `authorize_relay_retirement`.

This primitive does not weaken or reinterpret that policy.

## Composition with #1131

Five successful probes spaced at the V1 interval can span exactly 30 seconds from the first successful ACK to the fifth successful ACK. The focused proof composes that evidence directly into `evaluateVoidUdpSwarmDirectRouteHealthPolicyV1(...)` and verifies that the parent policy can return `authorize_relay_retirement` only when the surrounding current-route and relay-fallback evidence is also supplied.

The observer itself always reports:

- `network_transmission_performed=false`;
- `relay_retirement_authorized=false`; and
- `relay_retirement_performed=false`.

Returning a probe or ACK object is not network transmission.

## Focused adversarial proof

The proof covers:

- invalid self-peer configuration rejection;
- exact-key wire normalization;
- five successful authenticated round trips spanning the parent policy's 30-second window;
- direct composition into the #1131 policy;
- one-outstanding-probe enforcement;
- duplicate ACK rejection;
- authenticated-peer mismatch rejection;
- detached-session ACK rejection;
- wrong probe-ID rejection;
- exact timeout-boundary acceptance;
- post-deadline timeout accounting;
- late ACK rejection after timeout;
- probe-ID reuse rejection; and
- malformed probe-ID rejection.

Expected marker:

```text
VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_OBSERVATION_V1_PROOF_GREEN
```

## Authority boundary

This lane is source, proof, documentation, and CI only.

It does not:

- modify `src/node_core.ts`;
- mount the health observer into a live peer;
- write to a socket or send a network packet;
- mutate the normal peer map;
- close or retire a relay socket;
- persist verified-direct evidence;
- activate public or production UDP;
- deploy or restart a service;
- mutate router, firewall, DNS, or interface state;
- access credentials or private keys; or
- exercise wallet, signer, validator, Work Credit, transaction, broadcast, or fund authority.

## Next seam

A later Node-integration lane can attach one observer to the exact promoted direct route from #1130, route probe/ACK messages only after normal VOID authentication, advance timeout accounting on a bounded timer, and feed the resulting evidence into the #1131 policy.

Actual relay retirement should remain a still-separate explicit mutation seam after that integration is proven.
