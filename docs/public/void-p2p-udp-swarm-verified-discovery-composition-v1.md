# VOID P2P UDP swarm verified discovery composition v1

Status: source contract and proof only. No launcher activation, deployment, or
service restart is included.

## Outcome

This lane closes the source-level boundary between verified public bootstrap
resolution and the UDP swarm relay orchestrator. It accepts fresh relay
introductions from authenticated VOID peer identities, requires independent
agreement and N-1 relay coverage, and emits the exact two environment values
consumed by the merged orchestrator:

- `VOID_P2P_UDP_SWARM_ORCHESTRATION_ENABLED=1`
- `VOID_P2P_UDP_SWARM_ORCHESTRATION_ROUTES=<relay>/<target>[,...]`

The composition function returns those values as inert data. It does not mutate
the process environment or mount, start, stop, restart, or deploy a node.

## Trust chain

The composition calls the existing release-to-manifest resolver. That resolver
must first prove an active threshold-signed release root, the exact bootstrap
record ID, a content-addressed record fetched through replaceable locator
mirrors, and the exact content-addressed stable manifest fetched through the
record's mirror set.

Each relay introduction is then bound to the resolved `record_id` and
`manifest_id`. Its Ed25519 key must exactly match an authenticated peer identity
supplied by the caller, and its signature covers the network, chain, bootstrap
IDs, source, relay, target, relay failure domain, and observation time.

Transport is not authority. A mirror cannot select another record or manifest,
and an unauthenticated discovery source cannot contribute to quorum.

## Exact discovery policy

The `void_p2p_udp_swarm_authenticated_discovery_v1` object is canonical JSON with
a `voidpud1_<sha256>` content ID. The compiled policy cannot be weakened by
input:

- two distinct authenticated sources must sign every relay/target route;
- every target must retain at least two distinct relays;
- those relays must span at least two declared failure domains;
- the output is limited to eight exact routes;
- observations may be at most five minutes old;
- discovery validity is from 30 seconds through ten minutes;
- duplicate source observations, conflicting relay failure domains, local/self
  routes, stale data, future data, expired data, and malformed keys or
  signatures fail closed.

The route list is deterministically sorted before it is handed to
`parseVoidUdpSwarmRelayOrchestrationRoutesV1`. No identity appears in the
composition's authority-free status fields beyond the explicit environment
payload requested by the caller.

## Proof

Run:

```bash
node --import tsx scripts/prove_void_p2p_udp_swarm_verified_discovery_composition_v1.mjs
```

The proof builds a synthetic two-of-two active release root, resolves a stable
manifest through independent failing/recovering locator and manifest mirrors,
verifies three authenticated introduction sources, proves two relay failure
domains for one target, and parses the emitted route string with the production
orchestrator parser. It also proves rejection of tampered signatures, missing
source quorum, single-failure-domain topology, expiry, bootstrap-ID mismatch,
unauthenticated sources, and local-node routes before locator traffic.

The green marker is:

```text
VOID_P2P_UDP_SWARM_VERIFIED_DISCOVERY_COMPOSITION_V1_PROOF_GREEN
```

## Remaining activation gate

The checked-in production release root remains
`hold_no_signed_bootstrap_record`, and the public bootstrap v1 manifest does not
publish relay introductions. Therefore this source composition is not a claim
of deployed zero-configuration discovery.

A follow-on activation lane must define the public introduction transport,
collect authenticated peer identities and signed observations, use an active
reviewed release root, call this composition, and pass the returned values to a
launcher adapter without weakening the fail-closed boundaries. That lane needs
separate review and authorization before any service restart or deployment.
