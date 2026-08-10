# VOID P2P UDP Swarm Relay-Preserving Takeover Policy v1

## Purpose

This lane defines the deterministic routing decision that must sit between a successfully authenticated UDP direct candidate and `Node`'s existing duplicate-peer resolution.

The current core normally prefers an authenticated direct transport over an authenticated relay transport and immediately destroys the relay peer. That behavior is correct for older direct-upgrade paths, but it is too early for the UDP Swarm make-before-break contract.

This policy does **not** modify `src/node_core.ts`. It makes the required decision explicit and independently provable before the later core mount.

## Stage contract

`evaluateVoidUdpSwarmRelayPreservingTakeoverPolicyV1(...)` returns `stage_authenticated_candidate` only when all of the following are true:

1. the candidate phase is exactly `authenticated_candidate`;
2. the authenticated remote VOID node ID is canonical and exactly equals the expected peer node ID;
3. an existing authenticated route for that exact peer exists;
4. that existing route is a relay route, not an already-preferred direct route;
5. the relay route carries a canonical relay node ID and bounded stream ID; and
6. the continuity relay fallback is still live.

Every other state returns `reject_candidate`.

## Make-before-break boundary

A successful stage decision preserves the existing relay route. It does not:

- replace the existing entry in the normal peer map;
- close or retire the relay stream;
- mutate the candidate socket;
- create durable direct-reachability evidence;
- activate public or production UDP; or
- grant wallet, signer, validator, Work Credit, transaction, or money authority.

An already-authenticated direct route is also preserved rather than replaced by the candidate.

## Relationship to authenticated direct candidate v1

The preceding authenticated-direct-candidate primitive proves normal VOID identity and relay liveness at candidate admission. This policy adds the missing Node-routing rule: successful direct authentication alone is not authority to evict an existing relay peer.

The later `node_core.ts` integration must use this decision before duplicate-peer takeover. A staged candidate must remain outside normal peer routing until a separate explicit promotion gate succeeds.

Relay retirement remains a still-later operation and is not authorized here.

## Proof

`scripts/prove_void_p2p_udp_swarm_relay_preserving_takeover_policy_v1.ts` covers:

- pre-authentication rejection;
- exact authenticated-candidate staging over a live relay;
- rejection when a direct route is already preferred;
- missing continuity route rejection;
- wrong-peer relay route rejection;
- malformed relay binding rejection;
- dead fallback rejection;
- synthetic authenticated identity mismatch rejection;
- real authenticated-candidate fail-closed behavior on wrong expected identity; and
- fallback loss before promotion, which discards the candidate rather than authorizing takeover.

Expected terminal marker:

```text
VOID_P2P_UDP_SWARM_RELAY_PRESERVING_TAKEOVER_POLICY_V1_PROOF_GREEN
```

## Authority boundary

Source, proof, documentation, CI, branch publication, and draft review only.

No merge, `src/node_core.ts` mutation, normal peer routing promotion, relay retirement, production/public UDP activation, deployment, service restart, router/firewall/DNS/interface mutation, credential access, wallet/signer/validator/Work Credit authority, transaction signing or broadcast, or fund movement is performed or authorized by this lane.
