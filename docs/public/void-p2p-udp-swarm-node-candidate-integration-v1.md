# VOID P2P UDP Swarm Node Candidate Integration v1

## Purpose

Mount the secure UDP peer socket from the single-socket swarm runtime into the existing Node HELLO/AUTH machinery **without replacing the live relay peer**.

This is the make-before-break Node seam after the authenticated direct-candidate primitive. It deliberately stops before normal peer routing promotion and before relay retirement.

## Runtime contract

`Node.stageUdpSwarmAuthenticatedDirectCandidateV1()` accepts only a secure `VoidUdpPeerSocketAdapterV1` bound to an exact swarm session, expected peer node ID, relay node ID, relay stream ID, and transport hint.

Before the candidate is mounted, Node requires the exact relay peer to remain authenticated and routable under the expected peer node ID and requires the exact relay-stream record to remain started and backed by that same relay virtual socket.

The secure UDP socket then runs through the existing normal VOID HELLO/AUTH path. The verified `AUTH` result is handed to `VoidUdpSwarmAuthenticatedDirectCandidateV1` for its independent public-key/node-ID binding and relay-liveness checks.

After that authentication succeeds, Node derives the currently authenticated route for the exact peer and evaluates `evaluateVoidUdpSwarmRelayPreservingTakeoverPolicyV1()` from the preceding relay-preserving policy lane. The candidate remains staged only when that policy returns `stage_authenticated_candidate`; every reject decision destroys only the candidate and leaves the continuity relay untouched.

## Non-routable authenticated candidate

A successful candidate AUTH does not rename the temporary peer to the authenticated node ID, does not set it as the normal peer-map route, does not send PEERS/SUB traffic on it, and does not persist direct reachability evidence.

The existing relay peer remains at `peers.get(expectedPeerNodeId)` throughout candidate authentication.

`udpSwarmAuthenticatedDirectCandidateSnapshotV1()` exposes candidate state without exposing the secure socket. It reports whether relay fallback remains live, whether a candidate has become the normal route, and the transport type currently routed for the expected peer.

## Failure behavior

Staging fails closed if the exact relay tuple is not live. Candidate authentication failure destroys only the candidate transport. Closing the candidate transport removes its temporary candidate record without touching the relay.

If the relay stream or relay transport disappears while a candidate is staged, Node discards the candidate and destroys its secure UDP socket. A later promotion lane therefore cannot inherit a stale make-before-break assumption.

## Explicit non-authority

This lane does not:

- promote the candidate into normal peer routing;
- evict or retire the relay after candidate authentication;
- persist verified-direct cache evidence;
- claim public-NAT success;
- activate production/public UDP;
- modify router, firewall, DNS, or interfaces;
- access credentials, wallets, signers, validators, Work Credit, transactions, broadcasts, or funds.

## Proof

Run:

```bash
npx --no-install tsx scripts/prove_void_p2p_udp_swarm_node_candidate_integration_v1.ts
```

The proof establishes an exact live relay tuple in Node, runs normal VOID HELLO/AUTH over a secure UDP adapter pair, proves the Node source consumes the relay-preserving takeover policy before retaining an authenticated candidate, proves the authenticated candidate remains non-routable while the relay remains the sole normal route, proves invalid relay provenance destroys only the candidate, and proves relay loss discards a waiting candidate.

Expected marker:

```text
VOID_P2P_UDP_SWARM_NODE_CANDIDATE_INTEGRATION_V1_PROOF_GREEN
```

## Next seam

A later, separate lane may call the candidate's one-shot promotion authorization and atomically replace the normal route only while relay continuity still holds. Relay retirement remains a still-later transition after direct-route health is proven.
