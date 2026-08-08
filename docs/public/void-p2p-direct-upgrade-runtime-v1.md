# VOID P2P direct connection upgrade runtime v1

Status: source-only/test-opt-in runtime implementation stacked on relay reservation v1 and direct-upgrade contract v1. No live public activation is performed by this lane.

## Purpose

Implement bounded direct TCP transport upgrade for peers that already have an authenticated relayed relationship through the same relay.

This lane does not claim universal or externally proven NAT traversal.

## Punch-capable relay connection

Precision proved that arbitrary already-open relay connections cannot necessarily be retrofitted for same-source-port reuse: rebinding an automatically allocated live source port returned `EADDRINUSE`.

Precision also proved that a relay connection explicitly bound to a chosen source port before connect can authenticate normally, obtain a relay reservation, and keep both the connection and reservation alive while a second destination reuses the same local source port.

Therefore direct-upgrade eligibility is a property of how the relay connection was created.

`connectPunchCapableRelay()` establishes a normal authenticated direct VOID peer while explicitly binding a selected local source port. It reserves the dial slot before its asynchronous local-address probe so concurrent callers cannot race into duplicate outer relay dials. Verified-peer reconnect preserves punch capability.

## Relay coordination

Closed-schema controls, accepted only after normal outer authentication:

- `DIRECT_UPGRADE_REQUEST`
- `DIRECT_UPGRADE_OFFER`
- `DIRECT_UPGRADE_READY`
- `DIRECT_UPGRADE_START`
- `DIRECT_UPGRADE_REJECT`

Requests bind an existing started relay stream. The relay confirms requester and target are its actual stream endpoints. Either endpoint may initiate the upgrade; the original relay-stream direction does not grant special authority.

The relay observes each endpoint's TCP source IP:port on the authenticated outer connection and forwards the counterpart observation as an ephemeral transport hint.

The relay may lie or provide an unusable hint. That can cause bounded upgrade failure/DoS but cannot bypass expected-node HELLO/AUTH.

v1 coordinates only same-relay observations.

## Attempt lifecycle

1. Both endpoints keep the authenticated relayed peer stream.
2. Each endpoint validates that its outer relay connection is punch-capable.
3. Both stage the relay-observed counterpart endpoint.
4. Both send READY.
5. READY is bound to the exact session and relay stream before readiness state is mutated; relay sends START only after both endpoints are ready for that exact stream.
6. Each endpoint dials the observed peer endpoint while binding the exact local address/port of its punch-capable relay connection.
7. The resulting socket performs normal VOID HELLO/AUTH with the expected remote node ID pinned.
8. Only successful expected-node authentication may supersede the relayed peer stream.

## Inbound matching

During the short staged window, an inbound socket whose remote endpoint exactly equals the expected relay-observed candidate may be classified as the matching direct-upgrade socket.

This supplies only expected identity and non-persistence mode. It does not bypass authentication.

## Verified-direct evidence boundary

A successful punch proves the current socket authenticated the expected node, not that the peer's signed listen addresses are directly dialable.

Punch sockets use `persistDirectEvidence=false`:

- no durable verified-peer-cache write for the peer's signed listen set;
- no `knownAddrs` promotion from that signed listen set;
- no PEERS advertisement from that signed listen set merely because the punch worked;
- no normal verified-peer reconnect/backoff when the punch socket later closes.

A separately proven ordinary direct connection retains normal verified-direct behavior.

## Failure semantics

Failure, timeout, wrong identity, stale session, relay disappearance, endpoint-dependent NAT behavior, or unsupported simultaneous-open behavior does not infer NAT type, relay-required status, unreachable status, or network failure.

A healthy relay remains the continuity path until direct expected-node authentication actually succeeds.

## Bounds

- 64 pending client requests;
- 128 relay coordination sessions;
- 5 second request timeout;
- 50-1000 ms coordination start delay;
- at most 5 seconds per direct attempt;
- bounded local port allocation attempts and session sweep.

## Public status boundary

`peersSnapshot()` retains its established public shape. Punch flags, source ports, relay observations, and direct-upgrade session IDs stay internal.

`directUpgradeSnapshot()` is test/internal only.

## Authority / non-claims

This lane is disabled by default and performs no live activation, deployment, restart, firewall/router/interface mutation, credential access, wallet/signer/validator/treasury/Work Credit action, transaction broadcast, or fund movement.

External failure-domain NAT testing is still required before plug-and-play public claims.

Refs #1005 and #1062.
