# VOID P2P UDP swarm datagram runtime v1

## Purpose

Provide one bounded IPv4 UDP socket runtime that can be reused for both authenticated rendezvous mapping probes and coordinated peer hole punching.

This is the transport-plumbing layer below the exact-green authenticated control plane. It does not create a secure peer transport, does not promote a peer, and does not retire the relay fallback.

## Participant port policy

Ordinary participants default to UDP bind port `0`, allowing the operating system to select an available local port. No canonical participant UDP port is required.

A caller may explicitly select a bind port for deliberate infrastructure or testing, but that port is transport configuration only and never node identity.

## Single-socket invariant

`VoidUdpSwarmDatagramRuntimeV1` owns one `udp4` socket for its lifetime.

The same bound socket is used to:

1. send the two signed rendezvous mapping probes created by the authenticated control adapter;
2. receive relay-side signed mapping probes when the runtime is used by a rendezvous relay;
3. send the scheduled `VOID_UDP_PUNCH` burst after a validated direct-upgrade offer;
4. receive matching punch packets from the exact peer-observed endpoint.

Reusing the socket preserves the NAT mapping established by the rendezvous traffic rather than creating an unrelated local source port for punching.

## Security boundary

The runtime does not treat a punch packet as peer identity.

A received punch is accepted as a direct-path observation only when:

- the session is currently active;
- the packet targets the local node ID;
- the source node ID equals the expected peer ID;
- the attempt number is within the bounded punch plan;
- the UDP datagram source address and source port exactly match the peer-observed endpoint supplied by the authenticated relay-control offer.

Normal VOID Ed25519 path authentication, secure X25519/AES transport establishment, and normal VOID HELLO/AUTH remain later mandatory gates.

## Bounded behavior

- maximum 32 active punch sessions per runtime;
- bounded punch schedule inherited from `udp_hole_punch_v1`;
- bounded attempt timeout;
- timers are reclaimed on direct observation, cancellation, expiry, or runtime close;
- malformed and unrelated UDP datagrams are ignored;
- relay probe callback failures are visible and do not become peer identity;
- IPv4 only in v1; dual-stack can be added separately without changing node identity.

## Proof

The focused proof creates three real UDP runtimes on loopback: source, target, and rendezvous relay. Source and target both bind port `0`.

It proves that signed mapping probes reach the relay from each OS-selected participant port, that the relay returns stable observed endpoints matching those ports, and that the later direct punch arrives from those exact same participant ports.

It also sends a correctly shaped punch from a rogue UDP source port and requires rejection before the valid reciprocal direct path is observed.

Expected marker:

```text
VOID_P2P_UDP_SWARM_DATAGRAM_RUNTIME_V1_PROOF_GREEN
```

## Authority boundary

This lane does not mount the datagram runtime into `Node`, open production sockets, send production rendezvous traffic, activate the secure direct transport, retire the relay, alter router/firewall/DNS configuration, or grant wallet/signer/validator/Work Credit/money authority.
