# VOID P2P authenticated reachability runtime v1

Status: source/runtime capability with isolated loopback proof. No production
reachability probing is automatically activated by this lane.

## Purpose

Launch blocker #1005 requires reachability/dialability classification after
authenticated identity and persistent verified-peer reconnect. The source-only
classification contract now accepts the exact 32-hex authenticated P2P node ID,
but current `src/node_core.ts` does not yet produce runtime reachability
observations or perform authenticated dialback probes.

This lane adds that missing runtime bridge without adding relay, hole punching,
transport ranking, deployment, firewall changes, or economic authority.

## Truth boundary

The existing `void_p2p_reachability_observation_v1` bytes and classification
semantics remain authoritative:

- `authenticated_outbound_seen` means an observer completed an authenticated
  session that the subject initiated outbound;
- `authenticated_dialback` means an observer opened a separate connection to
  one candidate from the subject's authenticated listen transcript and
  authenticated the exact subject identity on that probe;
- one failed dialback does not infer NAT type, relay requirement, or
  unreachability;
- direct confirmation still requires at least two observer identities and two
  declared failure domains;
- DNS, Tor, and future relay addresses do not become direct-IP evidence.

The historical content-addressed record contract continues to carry
`runtime_integration_performed=false` because that field describes the
source-only record builder. Runtime state is exposed separately through the
node's in-memory reachability snapshot rather than rewriting the v1 record
schema.

## Separate probe connection

A dialback must not reuse normal `connect()` semantics. Doing so could replace
the existing authenticated peer session when the second connection reaches the
same node ID.

The runtime therefore uses a bounded probe connection:

1. the subject creates a random 128-bit request ID and keeps it pending;
2. the subject sends the request over an already authenticated control session;
3. the observer accepts only a candidate that appeared in that subject's
   authenticated listen transcript;
4. production mode additionally requires a public IPv4/IPv6 literal;
5. the observer opens a separate probe connection and sends the request ID
   before the ordinary HELLO/AUTH exchange;
6. the subject accepts that probe marker only for a request it currently has
   pending and requires the probe peer to authenticate as the expected
   observer;
7. the observer requires the probe target to authenticate as the exact subject
   node ID and to include the probed candidate in its signed listen state;
8. the probe closes without replacing the control peer, entering verified-peer
   cache state, or scheduling reconnect;
9. the observer returns a bounded observation over the authenticated control
   session.

The random probe marker is not identity authority. It only correlates the
separate socket with a request issued over an authenticated session; HELLO/AUTH
still supplies cryptographic peer identity.

## Probe-target confinement

A remote peer cannot use this feature as a generic port scanner.

The observer refuses a request unless:

- the candidate is canonical IP:port syntax;
- the exact candidate exists in the requester's authenticated listen set; and
- production mode classifies the IP as public direct IPv4/IPv6.

Loopback/private probing exists only behind the constructor-only
`reachabilityTestAllowNonPublicProbe` test override so hosted/local proof can
exercise a real TCP/authentication round trip without public infrastructure.
The proof also verifies ordinary production construction rejects the same
target.

## Runtime observations

The node keeps a bounded in-memory observation set and exposes
`reachabilitySnapshot()` for future relay/transport policy integration.

Inbound authenticated control sessions produce
`authenticated_outbound_seen` evidence only after the observer receives a
post-authenticated message from the subject, avoiding a race where evidence
could arrive before the subject considers the control session authenticated.

`requestReachabilityDialback(observerNodeId, candidateAddress)` is an explicit
capability call. No automatic production probes are started by default.

## Failure-domain boundary

Observers use `VOID_P2P_REACHABILITY_FAILURE_DOMAIN` when it is a canonical
declared failure-domain label. Missing/invalid configuration becomes
`unclassified`.

This is intentionally conservative: multiple `unclassified` observers cannot
satisfy the two-independent-failure-domain gate.

## Non-goals

- automatic public reachability probing;
- NAT-type inference;
- relay-required inference;
- Circuit Relay support or relay reservations;
- direct-connection upgrade/hole punching;
- transport-ranked address failover;
- bootstrap-record publication;
- Tor changes;
- live deployment, service restart, firewall/router/interface mutation;
- credential, wallet, signer, validator, Work Credit, transaction, or fund
  authority.

Refs #1005, #1044, #1048, #1049, #1057.
