# VOID P2P UDP peer-socket adapter v1

Status: source-only adapter above the authenticated secure/reliable punched UDP transport.

## Purpose

The real Precision/Alienware field sequence has now established four distinct
properties without router configuration:

1. outbound UDP mapping from ordinary residential networks;
2. direct two-site UDP hole punching with OS-selected participant ports;
3. mutual VOID-shaped peer authentication on the punched path; and
4. authenticated X25519 key agreement plus AES-256-GCM protected reliable
   delivery, including recovery after an intentionally dropped first data send.

The remaining source boundary before `node_core.ts` integration is shape
compatibility. Existing VOID peer framing expects a socket-like ordered byte
stream with `write()`, `data`, `error`, `close`, `writableLength`, and normal
backpressure semantics.

This lane exposes that shape above the already-authenticated secure/reliable UDP
transport without mounting it into the live Node runtime.

## Inherited authenticated secure-path boundary

The adapter is not a new authentication or key-establishment layer. It may only
be constructed after the merged PR #1082 authenticated-path boundary and merged
PR #1083 secure/reliable transport boundary have succeeded.

The proof therefore establishes keys in this order:

1. create reciprocal #1082 authenticated-path HELLO packets;
2. create reciprocal signed authenticated-path PROOF packets;
3. verify each PROOF against the exact session, peer identity, challenges, and
   observed endpoints;
4. create #1083 secure key offers that bind the verified authenticated-path
   proof signatures;
5. verify each key offer against that exact authenticated-path evidence; and
6. derive the direction-specific secure/reliable transport keys used by the
   adapter.

The adapter does not bypass, replace, or weaken those checks. The inherited v1
cryptographic suite remains explicitly bound as:

```text
identity_algorithm=ed25519
signature_algorithm=ed25519
kex_algorithm=x25519
kdf_algorithm=hkdf-sha256
aead_algorithm=aes-256-gcm
```

Unknown or substituted suite values remain fail-closed below this adapter. The
suite is classical and does not make a post-quantum claim:

```text
quantum_safe_claimed=false
```

A future quantum-resistant or hybrid suite requires a separately versioned
contract and proof wall; the peer-socket adapter must consume the established
secure transport rather than inventing cryptography of its own.

## Byte-stream contract

`VoidUdpPeerSocketAdapterV1` presents a socket-shaped byte stream above
`VoidUdpSecureReliableSenderV1` and `VoidUdpSecureReliableReceiverV1`.

A caller may write arbitrary byte chunks. The adapter:

- copies the caller bytes;
- splits them into secure-reliable payloads no larger than the v1 payload cap;
- assigns ordered reliable data sequence numbers through the underlying sender;
- transmits only authenticated encrypted secure packets;
- accepts only packets validated by the underlying secure receiver;
- emits delivered plaintext bytes in reliable data-sequence order; and
- does not add message-boundary semantics of its own.

That last property is deliberate. The existing VOID `Framer` already tolerates
arbitrary stream chunk boundaries, so a 64 KiB framed VOID message may arrive as
several `data` events and still be reconstructed correctly.

## Backpressure and queue boundary

The adapter has two independent bounded layers:

1. the secure transport's maximum 32 in-flight reliable data messages; and
2. an adapter-local bounded write queue.

Default adapter values:

```text
high_water_bytes=131072
max_queued_bytes=524288
```

`write()` follows stream-style semantics: bytes are accepted into the bounded
adapter/sender buffers, and the boolean return value indicates backpressure.
When buffered bytes fall below the high-water boundary after peer ACK progress,
the adapter emits `drain`.

If accepting a write would exceed the hard queue ceiling, the adapter destroys
the path rather than silently dropping or permitting unbounded memory growth.

## ACK and retransmission boundary

Every accepted secure data packet updates cumulative peer ACK state. The adapter
uses that ACK to release sender state and buffered-byte accounting. Data packets
receive encrypted ACK packets; ACK packets are not ACKed again, preventing an
ACK loop.

The adapter polls the already-bounded secure sender for retransmission by
default. A deterministic/manual tick mode exists for proofs.

If the secure transport reports an exhausted reliable data sequence after its
bounded retry limit, the adapter destroys the path. It does not retry forever or
silently continue with a hole in the byte stream.

## Replay and tamper behavior

Replay/tamper decisions remain in the secure receiver. A rejected or replayed
packet is never emitted as byte-stream data.

The adapter never accepts plaintext UDP application payloads. The injected
packet-transmit callback receives only established `VOID_UDP_SECURE_PACKET`
objects from the secure/reliable transport.

## Socket-shaped surface

The adapter intentionally implements only the subset needed by the existing
VOID peer layer:

```text
on("data")
on("error")
on("close")
on("drain")
write(bytes|string) -> boolean
destroy(error?)
writableLength
destroyed
```

It does not claim to be a general Node.js `net.Socket` implementation.

## Runtime boundary

This lane does **not** modify `src/node_core.ts`.

It does not:

- create UDP sockets in the production runtime;
- perform live rendezvous or hole punching;
- read production node identity keys;
- promote a punched path into `Node.peers`;
- alter verified-direct cache truth;
- disable or replace relay fallback;
- change the launcher/bootstrap manifest;
- deploy or restart services; or
- mutate router, firewall, DNS, wallet, validator, Work Credit, or economic
  authority.

A later reviewed runtime-composition lane can construct this adapter only after
rendezvous, punching, endpoint authentication, authenticated-path verification,
and secure session establishment have already succeeded.

## Proof

The focused proof uses generated ephemeral test identities, two real loopback
UDP sockets, the actual #1082 authenticated-path primitives, the actual #1083
secure/reliable transport, and this adapter. It verifies:

- authenticated-path evidence is verified before secure keys are derived;
- secure key offers preserve the authenticated-path proof binding and explicit
  cryptographic suite;
- a large framed byte stream is split across multiple encrypted packets and
  reconstructed exactly;
- arbitrary transport chunking preserves the original byte stream;
- bidirectional delivery;
- the first A-side data packet is deliberately dropped and retransmission
  restores the byte stream;
- replayed secure packets do not emit duplicate stream bytes;
- high-water backpressure returns `false` and later emits `drain` after ACKs;
- hard write-queue overflow destroys the adapter;
- retransmission exhaustion destroys the adapter; and
- no runtime mount or authority mutation occurs.

Expected marker:

```text
VOID_P2P_UDP_PEER_SOCKET_ADAPTER_V1_PROOF_GREEN
peer_socket_shape_exposed=true
real_udp_byte_stream_adapter_proven=true
secure_reliable_transport_required=true
authenticated_path_evidence_required=true
authenticated_path_evidence_verified_before_secure_keys=true
secure_suite_binding_preserved=true
quantum_safe_claimed=false
large_write_fragmented_and_reassembled=true
arbitrary_udp_chunk_boundaries_supported=true
intentional_first_packet_drop_recovered=true
ordered_byte_stream_preserved=true
bidirectional_byte_stream_proven=true
packet_replay_delivered=false
write_backpressure_signaled=true
drain_after_ack_proven=true
bounded_write_queue_overflow_fails_closed=true
retransmission_exhaustion_fails_closed=true
plaintext_udp_payload_allowed=false
runtime_node_core_mount_performed=false
runtime_peer_promotion_performed=false
verified_direct_cache_mutation_performed=false
relay_fallback_preserved=true
router_configuration_required=false
port_forward_required=false
wallet_signer_validator_wc_money_authority=0
```

## Next lane

After this adapter is independently green, the remaining runtime step is a
separately reviewed composition that mounts the established secure UDP
peer-socket path into normal VOID peer authentication/framing while retaining
relay transport until the direct path has proven healthy.

Refs #1005, #1079, #1082, #1083.
