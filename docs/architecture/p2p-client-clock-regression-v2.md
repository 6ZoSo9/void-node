# P2P client local-clock regression v2

Marker: `VOID_P2P_CLIENT_TRANSIENT_CLOCK_V1`.

Issue: #3134.

## Purpose

Client-side relay and UDP-swarm transient state uses local wall-clock time for
request timeouts and expiring reservation/rendezvous authority. A backward
local clock step must not extend those temporary authorities until wall time
catches up.

This source-only contract gives the two client state machines one clock
generation rule:

1. reject a non-safe, negative, or otherwise invalid local observation before
   mutating clock or transient state;
2. treat a valid observation lower than the previous accepted observation as a
   new local-clock generation;
3. fail closed by dropping transient request/cache/rendezvous state owned by
   the prior generation;
4. set the regressed value as the new baseline so fresh state can be
   deliberately established afterward.

Peer-supplied timestamps are not accepted as the generation clock.

## UDP-swarm authenticated control adapter

On local clock regression, the adapter clears:

- pending upgrade requests;
- active rendezvous routes;
- ticket-to-session replay bindings associated with those routes.

The already-established relay fallback stream is external to the adapter and is
not retired by this action. A fresh upgrade can be requested after the new
baseline.

## Staged direct-candidate authority

An authenticated UDP direct candidate remains subordinate to the exact
authenticated-control route generation that created it. Candidate staging binds
the route's request ID, ticket ID, expiry, relay node, peer node, stream and
session. Promotion rechecks that exact generation.

If a local clock regression removes the active route before promotion:

- the staged direct candidate is discarded;
- its candidate socket is destroyed;
- the corresponding socket-runtime session is retired and cannot be
  reconsidered by the promotion loop;
- the already-established relay fallback remains live.

A fresh post-regression route/session generation is required for another direct
promotion attempt. Reusing the same session/relay/peer/stream tuple does not
revive an older candidate because request/ticket/expiry generation identity is
also bound.

## Relay client state in Node

On local clock regression, Node clears:

- pending relay reservation requests;
- pending relay-connect requests;
- cached relay reservation authority.

It deliberately does **not** clear `relayStreams`. An already established
end-to-end authenticated relay transport is not converted into a post-admission
lease merely because the client's local reservation cache was invalidated.

Normal monotonic expiration behavior remains unchanged.

## Relationship to relay-server clock handling

Merged relay-server clock-generation handling remains independent. This change
does not modify `VoidRelayServerStateV1` and does not couple client regression
to server reservation-ID rotation.

## Authority boundary

Source/test/CI only.

No live relay activation, service/network/router/firewall mutation, credential
or key access, wallet/signer use, transaction, validator/Work Credit mutation,
presale/market activation, treasury/liquidity action, or funds movement is
authorized or performed.
