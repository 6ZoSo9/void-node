# VOID P2P transport-ranked failover v1

## Purpose

Issue #1005 requires transport-ranked peer addresses and failover so a node can
prefer a strong direct path while retaining independent alternatives when one
transport is unavailable.

This lane defines the source-only ranking and failover contract. It deliberately
does not modify `src/node_core.ts`, activate relay traffic, perform hole
punching, or make network calls.

## Evidence boundary

Direct-address eligibility is derived only from the merged reachability
classification contract:

- `direct_confirmed` — eligible and highest direct tier;
- `direct_observed_unconfirmed` — eligible, below confirmed direct;
- `outbound_observed` — **not** evidence that another node can dial this
  address;
- `unknown` — not dial-eligible;
- `non_public_address` — not dial-eligible.

A failed direct candidate does not rewrite the reachability record and does not
infer NAT type or that a relay is required.

## Deterministic rank

The v1 order is:

1. confirmed direct IPv6;
2. confirmed direct IPv4;
3. observed-but-unconfirmed direct IPv6;
4. observed-but-unconfirmed direct IPv4;
5. active relay-v1 reservations.

Within a tier the plan is sorted deterministically by failure domain and
transport locator.

IPv6 preference is only a deterministic tie-break within an equal evidence
class. It is not node identity and it does not override stronger reachability
evidence.

## Relay identity boundary

Relay candidates use the merged relay-v1 reservation evidence shape:

- target `subject_node_id`;
- authenticated direct `relay_node_id`;
- explicit `relay_peer_state=authenticated_direct_peer_v1`;
- declared failure domain;
- `reservation_id`; and
- bounded `reservation_expires_at_ms`.

The reservation fields are eligibility evidence for this immutable planning
snapshot: a relay candidate must have an active reservation when the plan is
created, and an expired relay candidate is skipped at selection time. They do
not make the relay reservation the target's identity. Runtime relay connection
still identifies the target by VOID node ID, while the relay server validates
its own active reservation state.

The relay is transport only. End-to-end VOID authentication remains the
endpoint identity source.

Therefore:

- a relay node or reservation cannot define the target node's identity;
- a successful relay path does not become direct-reachability evidence; and
- relay use does not alter the verified-direct peer-cache trust boundary.

The relay-v1 reservation primitive is already merged. This planner consumes only
bounded reservation evidence; it does not activate relay traffic or modify the
relay runtime.

## Failover

The plan is content-addressed and immutable. Calling the failover selector with
candidate IDs that already failed returns the next ranked candidate.

Failure of one candidate is local attempt state only. It does not:

- delete or downgrade another candidate;
- mutate reachability evidence;
- infer NAT type;
- infer relay requirement; or
- grant transport infrastructure any authority.

When all candidates have failed, or when every remaining relay reservation has
expired, selection returns `null`; the caller must apply its own bounded
retry/backoff policy rather than looping inside this contract.

## Bounds

- at most 16 direct reachability records;
- at most 8 relay candidates;
- relay candidates must declare distinct failure domains;
- relay reservations must be active at plan creation and expire within the
  relay-v1 maximum TTL bound;
- expired relay candidates are never selected;
- at most 24 eligible candidates in one plan;
- plan lifetime from one through fifteen minutes;
- unauthenticated relay peers are rejected before entering the plan.

## Authority boundary

This lane adds no:

- runtime network calls;
- `src/node_core.ts` changes;
- live relay reservations;
- hole punching;
- firewall/router/DNS mutation;
- deployment or service restart;
- credential access;
- wallet, signer, validator, treasury, Work Credit, transaction, or
  money-moving authority.

## Follow-on

A separate runtime-integration lane can adapt live direct and relay state into
this planner and apply the returned order to real connection attempts. That
integration should preserve independent per-candidate backoff, refresh expired
reservation evidence before retry, and prove direct-to-relay and relay-to-direct
recovery without changing peer identity.
