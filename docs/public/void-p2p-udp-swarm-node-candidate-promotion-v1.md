# VOID P2P UDP Swarm Node Candidate Promotion v1

## Purpose

Consume the authenticated direct candidate's one-shot promotion authorization and atomically make its secure UDP transport the normal Node route **without retiring the live relay**.

This is the make-before-break promotion seam after Node candidate staging. Relay retirement remains a later, separately proven transition.

## Promotion contract

`Node.promoteUdpSwarmAuthenticatedDirectCandidateV1(sessionId)` succeeds only when:

- the staged candidate completed normal VOID HELLO/AUTH;
- the authenticated identity remains bound to the exact expected peer;
- the candidate is still the exact temporary Node-mounted direct peer;
- the existing normal route is still the exact authenticated relay tuple;
- no previous promoted relay fallback is retained for that peer; and
- `authorizeDirectPeerPromotion()` succeeds, which rechecks relay liveness and can be consumed only once.

The route swap is synchronous. Node retains the relay `Peer` and relay-stream binding outside the normal peer map, removes the candidate's temporary peer-map key, marks the direct candidate authenticated/routable, and installs it at `peers.get(peerNodeId)`.

The promoted direct route remains `persistDirectEvidence=false`; this lane does not claim durable public reachability from one successful promotion.

## Retained relay behavior

The retained relay stays connected but is dormant while the direct route is normal. Post-auth traffic arriving on that retained relay is ignored until it becomes normal again, preventing duplicate relay traffic from acting as a second live route.

If the promoted direct socket closes while the exact relay stream is still live, Node restores that same relay `Peer` to the normal peer map. The relay socket is never destroyed by promotion.

If the relay fallback closes first, the direct route remains normal. The promotion snapshot reports `relay_fallback_live=false`, and a later direct close does not restore the stale relay.

## Visibility

`udpSwarmPromotedDirectRouteSnapshotV1()` reports each promoted route, whether the direct route is still live, whether the retained relay fallback is still live, whether direct evidence persistence is enabled, and whether relay retirement occurred.

## Explicit non-authority

This lane does not:

- retire, close, or evict the relay during promotion;
- persist verified-direct cache evidence;
- claim permanent direct-route health;
- activate production/public UDP;
- modify router, firewall, DNS, or interfaces;
- access credentials, wallets, signers, validators, Work Credit, transactions, broadcasts, or funds.

## Proof

Run:

```bash
npx --no-install tsx scripts/prove_void_p2p_udp_swarm_node_candidate_promotion_v1.ts
```

The proof authenticates a staged UDP candidate, promotes it exactly once, proves the relay remains live and dormant, proves direct failure restores the relay, then separately proves relay loss preserves the direct route and prevents stale failback.

Expected marker:

```text
VOID_P2P_UDP_SWARM_NODE_CANDIDATE_PROMOTION_V1_PROOF_GREEN
```

## Next seam

A later health/retirement lane may require sustained direct-route evidence before explicitly retiring the retained relay. Until that separate authority exists, relay retirement remains false.
