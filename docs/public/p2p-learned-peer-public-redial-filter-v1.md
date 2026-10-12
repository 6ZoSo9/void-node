# VOID P2P learned-peer public redial filter v1

## Purpose

The authenticated raw-TCP P2P layer may receive `PEERS` advertisements that
contain addresses belonging to third parties. Those addresses are useful for
swarm discovery, but they are not identity-bound merely because the sender is
authenticated.

This contract makes third-party peer exchange a bounded public-introduction
surface instead of an arbitrary network-dial or persistent retry primitive.

## V1 admission rule

An address learned indirectly through `PEERS` may be re-advertised or considered
for an initial discovery dial only when it is:

- a canonical VOID peer address;
- a numeric IPv4 or bracketed IPv6 literal; and
- globally routable under the v1 public-address classifier.

The v1 learned-peer path rejects loopback, private, CGNAT, link-local,
documentation, benchmark, multicast, reserved/special-use IPv4, local/special
IPv6, and DNS hostnames.

DNS is intentionally excluded from third-party `PEERS` v1. A third-party
hostname is not identity-bound and resolving it before peer authentication
would allow an authenticated sender to steer the node toward arbitrary resolver
results.

## Bounded discovery

Indirect discovery is intentionally bounded before authentication:

- at most 64 advertised entries are normalized from one `PEERS` message;
- after public-address filtering, at most 8 eligible learned peers receive a
  discovery dial from that message, so junk/private prefixes do not consume the
  eligible-public budget;
- at most 64 unique third-party learned addresses receive a discovery dial in
  one node runtime;
- the same learned address is not redialed repeatedly from duplicate `PEERS`
  advertisements;
- refusal of an unverified learned-peer discovery dial does not create
  exponential backoff or a persistent retry loop; and
- a TCP connection that never completes VOID peer authentication also does not
  acquire reconnect/backoff state.

If a discovery dial succeeds and the remote peer completes the authenticated
VOID handshake, the existing authenticated-peer path may persist its
transcript-bound listen addresses. Normal verified-peer reconnect behavior can
then apply because identity has been established.

## Scope boundary

This restriction applies only to indirect third-party `PEERS` discovery.

It does **not** change:

- explicit `BOOTSTRAP_ADDRS`;
- a directly connected peer's challenge-authenticated, transcript-bound listen
  addresses;
- identity-pinned verified-peer cache reconnect; or
- the node's ability to retain private/Tailnet/LAN addresses learned directly
  from an authenticated peer.

This preserves existing operator/private-mesh paths while preventing public
swarm discovery from becoming an arbitrary private-network redial channel or a
persistent public-target retry generator.

## Authority boundary

This source lane adds no relay reservation, hole punching, reachability probe,
router/firewall mutation, service activation, deployment, credential access,
wallet/signer/validator/Work Credit authority, transaction action, or money
movement.
