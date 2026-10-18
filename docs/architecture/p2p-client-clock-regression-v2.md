# P2P client local-clock regression v2

Marker: `VOID_P2P_CLIENT_TRANSIENT_CLOCK_V1`.

Issue: #3134.

## Purpose

Client-side relay and UDP-swarm transient state uses local wall-clock time for
request timeouts and expiring reservation/rendezvous authority. A backward
local clock step must not extend those temporary authorities until wall time
catches up.

This source-only contract gives both client state machines one clock-generation
rule:

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

On local clock regression, the adapter clears pending upgrade requests, active
rendezvous routes, and their ticket-to-session replay bindings. The already
established relay fallback stream is external to this adapter and is not
retired by this action.

## Relay client state in Node

On local clock regression, Node clears pending relay reservation requests,
pending relay-connect requests, and cached relay reservation authority.

It deliberately does not clear `relayStreams`. An already established
end-to-end authenticated relay transport is not converted into a post-admission
lease merely because the client's local reservation cache was invalidated.

Reservation requests, relay-connect requests, reservation responses, and
connect responses are each bound to a single local clock observation for their
client-side timeout/expiry decision.

## Recovery

The regressed value becomes the new accepted baseline. Fresh transient state can
therefore be created deliberately after poisoning the prior generation instead
of waiting for wall time to catch up.

## Relationship to relay-server clock handling

Relay-server clock-generation handling remains independent. This change does
not modify `VoidRelayServerStateV1`, does not rotate server reservation IDs,
and does not make peer-provided time authoritative.

## Authority boundary

Source/test/CI/docs only.

No live relay activation, service/network/router/firewall mutation, credential
or key access, wallet/signer use, transaction, validator/Work Credit mutation,
presale/market activation, treasury/liquidity action, or funds movement is
authorized or performed.
