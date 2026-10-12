# VOID P2P UDP Swarm Authenticated Direct Candidate v1

## Purpose

Introduce the make-before-break state primitive required between the exact-green single-socket UDP swarm runtime and any later `node_core.ts` integration.

A secure UDP peer socket may become an **authenticated direct candidate** only after the caller supplies the result of normal VOID HELLO/AUTH for the exact expected remote node ID and public key while the continuity relay is still live. A second explicit gate is required before the candidate may be promoted into normal peer routing.

This lane does not mount the UDP runtime into `Node`, does not mutate normal peer routing, and does not authorize or perform relay retirement.

## Stack

- parent: draft PR #1098, exact head `54e640702a01223e9bc22e79cecdd7ebb48ee3a1`
- parent contract: one real bound UDP socket can produce a secure `VoidUdpPeerSocketAdapterV1`, but normal VOID HELLO/AUTH and relay retirement remain outside #1098
- this lane: additive authenticated-candidate state and proof only

## Candidate contract

`VoidUdpSwarmAuthenticatedDirectCandidateV1` binds one secure direct socket to:

- the exact UDP-swarm session ID;
- the exact expected remote VOID node ID;
- the exact continuity relay node ID and relay stream ID;
- a bounded transport hint; and
- a caller-supplied relay-liveness check.

Candidate admission requires all of the following:

1. state is still `awaiting_void_auth`;
2. the caller supplies a canonical authenticated node ID;
3. the supplied authenticated Ed25519 public PEM independently derives to that node ID;
4. the authenticated node ID exactly equals the expected peer node ID; and
5. the continuity relay is still reported live.

Failure is closed: the candidate enters `discarded` and its secure direct socket is destroyed.

## Separate promotion gate

Normal VOID authentication does **not** itself authorize promotion.

After successful authenticated-candidate admission, `authorizeDirectPeerPromotion()` performs a second relay-liveness check. Only then does it return a one-shot frozen promotion action containing the exact candidate socket and identity/relay tuple.

The promotion action explicitly carries:

- `persist_direct_evidence: false`; and
- `relay_retirement_authorized: false`.

Calling the promotion gate twice returns no second action. Losing relay continuity before promotion destroys the candidate instead of manufacturing a break-before-make transition.

## Identity and provenance boundary

This primitive does not replace normal VOID HELLO/AUTH and does not claim to perform that handshake. The later Node integration must call `acceptNormalVoidAuthentication()` only from the existing authenticated-peer path after normal signature verification succeeds.

The extra public-key derivation check prevents a detached node-ID value from being accepted without the corresponding authenticated key binding.

The relay-liveness callback is deliberately supplied by the later integration layer so that the state primitive can require current relay continuity without owning relay lifecycle or `node_core.ts` state.

## Explicit non-authority

This lane performs none of the following:

- `src/node_core.ts` mutation;
- normal peer-map/routing mutation;
- production UDP activation;
- verified-direct cache mutation;
- durable direct-reachability promotion;
- relay closure or retirement;
- deployment or service restart;
- router, firewall, DNS, or interface mutation;
- credential, wallet, signer, validator, Work Credit, transaction, broadcast, or fund action.

## Proof

Run:

```bash
npx --no-install tsx scripts/prove_void_p2p_udp_swarm_authenticated_direct_candidate_v1.ts
```

The proof covers:

- exact expected-node admission;
- authenticated public-key/node-ID binding;
- failure on wrong authenticated identity;
- failure on detached public-key evidence;
- relay liveness at candidate admission;
- relay liveness recheck at promotion;
- fail-closed behavior when relay liveness throws;
- one-shot promotion authorization;
- candidate destruction on failed admission/promotion;
- no normal-peer routing mutation claim; and
- no relay-retirement authority.

Expected terminal marker:

```text
VOID_P2P_UDP_SWARM_AUTHENTICATED_DIRECT_CANDIDATE_V1_PROOF_GREEN
```

## Next integration seam

A later, separately reviewed Node-integration lane can consume this primitive from the existing normal VOID authentication path. That integration must keep the currently authenticated relay peer routable while the direct socket is only a candidate, then perform an explicit direct-peer promotion step. Relay retirement must remain a still-later, separately authorized transition.
