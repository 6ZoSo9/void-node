# VOID P2P UDP Swarm Post-Retirement Relay Recovery Policy v1

## Purpose

Define the smallest fail-closed policy for recovering continuity after an authenticated UDP direct route dies **after** its retained relay fallback was successfully retired.

This lane does not request a relay, open or close a stream, mutate normal peer routing, reconnect the direct route, or persist verified-direct evidence. It only decides whether a later runtime seam may attempt to acquire a **fresh** relay stream.

The policy is stacked on the content-addressed terminal relay-retirement receipt from PR #1141.

## Why recovery is separate from verified-direct persistence

A successful UDP hole punch plus sustained direct-route health is enough to justify retiring a continuity relay for the current live session. It is not, by itself, proof that the same externally observed UDP endpoint is a durable future dial target.

VOID's existing reachability runtime deliberately applies a stronger boundary for public direct reachability. `direct_confirmed` requires fresh authenticated dialback success from at least two independent observers in at least two failure domains, and the candidate address must be public.

This policy does not weaken or bypass that standard. It always fixes:

- `direct_route_reconnect_authorized=false`;
- `verified_direct_evidence_persistence_authorized=false`;
- `verified_direct_evidence_persisted=false`.

When an ephemeral punched route disappears, the safe continuity action is to reacquire relay service rather than silently treat the old NAT mapping as durable reachability truth.

## Required retirement evidence

The policy accepts the terminal executor snapshot as `unknown` and independently passes it through #1141's exact receipt builder.

Recovery can proceed only when that builder produces a receipt whose terminal outcome is exactly:

- executor phase `retired`;
- disposition `relay_retired`; and
- `relay_retirement_performed=true`.

Pending, rejected, indeterminate, malformed, contradictory, or authority-contaminated executor state fails closed.

The receipt's expected peer node ID must exactly match the recovery state's expected peer node ID. The resulting content-addressed receipt ID is carried into the authorization decision for audit/deduplication context.

The receipt ID is an integrity identifier, not a signature, consensus certificate, or proof that a fresh relay exists.

## Fresh runtime revalidation

Even with a confirmed retirement receipt, the policy holds recovery unless all current runtime facts agree that the old direct/relay continuity pair is gone and no newer recovery path already supersedes it.

Authorization requires all of the following:

1. Node is not stopping.
2. No newer UDP Swarm session exists for the peer.
3. The retired session's direct route is no longer live.
4. No normal peer route is currently present for the peer.
5. No retained relay fallback record remains.
6. The retired relay stream is no longer live.
7. No replacement relay stream is already live.
8. No recovery attempt is already in flight.
9. The relay-control peer is live.
10. The authenticated relay-control peer identity exactly equals the relay node ID bound into the retirement receipt.

Any stale, contradictory, missing, or mismatched state returns `hold_recovery`.

## Fresh-stream rule

Successful policy output is:

`authorize_fresh_relay_reacquisition`

with:

- `fresh_relay_reacquisition_authorized=true`;
- `fresh_relay_stream_required=true`; and
- `retired_relay_stream_reuse_allowed=false`.

The old retired stream ID is evidence about what was closed. It is not an object that may be resurrected or reused as the replacement continuity stream.

A later runtime executor must acquire a newly established relay stream through the authenticated relay-control path and bind any new UDP Swarm session to the new stream identity.

## No mutation authority

This policy always reports false for:

- relay request performed;
- relay stream mutation performed;
- normal peer-map mutation performed;
- direct-route reconnect authorization;
- verified-direct evidence persistence authorization;
- verified-direct evidence persisted; and
- production UDP activation performed.

It has zero wallet, signer, validator, Work Credit, treasury, transaction, broadcast, or money-movement authority.

## Proof

Run:

```bash
npx --no-install tsx scripts/prove_void_p2p_udp_swarm_post_retirement_relay_recovery_policy_v1.ts
```

The focused proof constructs real #1139 executor outcomes and feeds them through #1141's receipt builder. It covers:

- exact successful fresh-relay authorization after confirmed retirement and direct-route loss;
- deterministic retirement receipt binding;
- malformed or extra recovery-state fields;
- malformed peer IDs;
- pending retirement state;
- callback-rejected retirement state;
- callback-indeterminate retirement state;
- authority-contaminated terminal snapshots;
- receipt/peer binding mismatch;
- node shutdown;
- newer-session supersession;
- still-live direct route;
- existing normal peer route;
- retained fallback presence;
- stale retired-stream liveness;
- already-live replacement relay;
- duplicate recovery in flight;
- missing relay-control peer; and
- authenticated relay-control identity mismatch.

Expected marker:

```text
VOID_P2P_UDP_SWARM_POST_RETIREMENT_RELAY_RECOVERY_POLICY_V1_PROOF_GREEN
```

## Next seam

After this pure policy is exact-head green, a separate runtime recovery child may preserve enough terminal retirement context after direct close to evaluate this policy and, only when authorized, submit one bounded request for a **fresh** relay stream through the exact authenticated relay-control peer.

That future mount must remain one-shot/in-flight guarded, reject newer-session races, never reuse the retired relay stream, and must not convert the expired punched endpoint into durable verified-direct evidence. A later independently proven `direct_confirmed` reachability path remains the proper boundary for durable public direct reachability.

## Authority boundary

This PR is source, documentation, synthetic proof, read-only CI, ordinary non-force commits, and draft PR metadata only.

It performs no relay request, relay stream creation/close, normal peer routing mutation, direct reconnect, verified-peer cache write, verified-direct evidence persistence, public/production UDP activation, deployment/restart, router/firewall/DNS/interface mutation, credential/private-key access, wallet/signer/validator/treasury/Work Credit authority, transaction action, broadcast, or fund movement.
