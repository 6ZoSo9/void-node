# VOID P2P relay reservation v1

Status: source-only relay transport foundation for launch blocker #1005.

## Purpose

VOID already has IPv6-safe peer addresses, challenge-authenticated Ed25519 peer
identity, persistent verified-direct peer reconnect, and a strict reachability
classification contract.

Relay v1 adds the next bounded transport primitive: an authenticated node may
reserve bounded capacity on more than one VOID relay, and another authenticated
node may open a byte stream to that reserved node through any healthy relay.

The relay is transport only. It never defines the source or destination node
identity.

## End-to-end identity rule

Relay control messages travel only over an already authenticated direct VOID
peer connection. After a relay stream is established, the source and
destination run the normal VOID HELLO/AUTH handshake again end-to-end inside
the relayed byte stream.

The source pins the requested destination node ID. The destination pins the
source node ID named by the relay setup. A valid but unexpected Ed25519
identity fails closed.

## Reservation boundary

Reservations are in-memory, bounded, and temporary.

v1 caps:

- 256 reservations per relay;
- 256 concurrent relay streams;
- 8 streams involving any one peer;
- reservation lifetime from 1 second through 10 minutes;
- 24 KiB decoded bytes per relay data control frame;
- 128 KiB pre-start virtual-stream buffering;
- 60-second relay stream idle timeout.

A reservation belongs to the authenticated outer peer that created it.
Unauthenticated sockets cannot reserve capacity.

The client does not trust a relay-supplied absolute clock. `RELAY_RESERVED`
returns a bounded TTL, and the client derives expiry from its own request time.
A relay cannot extend a reservation beyond the TTL the client requested.

Incoming streams carry the exact active reservation ID. A stale or fabricated
reservation ID cannot allocate a local relay stream.

## Multipath behavior

A client may hold reservations on multiple independently connected relays.
Failure of one relay does not invalidate a reservation on another.

A working direct path remains preferred. If a direct authenticated connection
to a node appears while a relayed connection to the same node exists, the
direct transport replaces the relay transport.

## Verified-direct cache boundary

A successful relayed connection is not evidence that the destination's signed
listen addresses are directly dialable from this node.

Relay-authenticated peers are therefore not written into the verified-direct
peer cache merely because the relay stream worked. If a direct connection later
authenticates, the existing verified-direct cache rules apply normally.

The existing `peersSnapshot()` response shape is preserved. Reservation IDs,
relay stream IDs, relay-server tables, and transport-selection internals are not
added to that established peer-status snapshot by this lane.

## Wire controls

The exact closed-schema relay control surface is:

- `RELAY_RESERVE`
- `RELAY_RESERVED`
- `RELAY_CONNECT`
- `RELAY_CONNECTED`
- `RELAY_INCOMING`
- `RELAY_READY`
- `RELAY_START`
- `RELAY_DATA`
- `RELAY_CLOSE`
- `RELAY_REJECT`

All IDs are fixed-width lowercase hexadecimal values. Numeric fields require
real JSON numbers. Relay data must be canonical base64 and decode within the
v1 frame limit.

READY/START setup ensures both endpoint virtual streams exist before
end-to-end HELLO/AUTH bytes are forwarded.

Client-side pending requests and staged streams are bounded independently of
the relay server's advertised behavior, so an authenticated but malicious relay
cannot use protocol-valid control messages to create unbounded local state.
Ignored reservation/connect requests expire after a bounded request deadline.

Relay forwarding also applies an explicit queued-byte ceiling before writing a
relayed data frame to the counterpart's outer socket. A slow or blocked
counterpart closes that relay stream instead of allowing unbounded relay-specific
write buffering.

A relay stream ID is immutable once staged for one endpoint direction. Reusing
the same relay/stream ID for a different claimed endpoint is rejected rather
than rebinding local state.

## Relay-server activation boundary

Relay-server behavior is disabled by default. A Node may enable the bounded
relay-server option for proofs or a separately authorized future activation
path.

This lane does not deploy or activate a public relay service.

## Trust and confidentiality boundary

Relay v1 authenticates the endpoint identity carried through the relay and
prevents the relay from successfully substituting a different authenticated
endpoint identity. It does **not** provide end-to-end confidentiality or a
general transport-integrity layer against a malicious relay.

A relay can observe, delay, drop, modify, inject, reorder, or terminate forwarded
bytes. The end-to-end HELLO/AUTH identity transcript and already-signed payloads
retain their own cryptographic checks, but unsigned post-auth control traffic
does not gain a new AEAD/MAC merely because it traverses relay v1.

Multiple independent relay reservations and direct-path preference reduce
availability dependence on any one relay; they do not turn a relay into a
trusted authority. Full end-to-end relay-stream confidentiality/integrity is a
separate protocol layer and is not claimed by this v1 lane. Consequently this
source lane remains non-live until a separately reviewed activation decision.

## Required proof marker

```text
VOID_P2P_RELAY_RESERVATION_V1_PROOF_GREEN
authenticated_reservation_required=true
end_to_end_peer_auth_preserved=true
relay_defines_node_identity=false
identity_mismatched_destination_accepted=false
multiple_relay_reservations_independent=true
healthy_relay_connected_with_dead_sibling=true
direct_path_suppressed_by_relay=false
relayed_peer_promoted_to_verified_direct_cache=false
relay_reservation_client_ttl_bounded=true
relay_pending_request_timeout_bounded=true
relay_forwarding_queue_bounded=true
incoming_reservation_id_bound=true
relay_local_stream_allocation_bounded=true
relay_stream_id_rebind_accepted=false
public_peer_snapshot_relay_metadata_exposed=false
relay_transport_confidentiality_claimed=false
relay_transport_integrity_claimed=false
relay_identity_mismatch_log_semantic=true
expired_reservation_used=false
oversized_relay_frame_accepted=false
relay_loop_accepted=false
single_required_relay=false
wallet_signer_validator_wc_money_authority=0
```

## Non-goals

- DCUtR/direct-connection upgrade or hole punching;
- STUN or TURN compatibility;
- UPnP, NAT-PMP, router, firewall, or interface mutation;
- automatic relay discovery;
- bootstrap-record v2;
- Tor changes;
- live relay deployment;
- wallet, signer, validator, Work Credit, transaction, or fund authority.
