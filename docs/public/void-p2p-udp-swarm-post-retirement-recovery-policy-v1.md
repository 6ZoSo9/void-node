# VOID P2P UDP swarm post-retirement recovery policy v1

Status: source-only continuity-recovery policy stacked on the exact-green Node relay-retirement mount in #1140. This lane performs no relay acquisition, route mutation, network dial, verified-direct persistence, or public/production UDP activation.

## Problem

#1140 correctly retires the retained continuity relay after sustained direct-route health. The promoted UDP path remains intentionally ephemeral and keeps `persistDirectEvidence=false`.

The current Node close path therefore has an important later-failure case:

1. the promoted direct path becomes healthy enough to retire its relay fallback;
2. the old fallback is removed from failback eligibility and its relay stream is closed;
3. the direct path later closes;
4. the health context is deleted;
5. normal fallback restoration finds no retained fallback; and
6. the ephemeral UDP path has no verified-direct reconnect authority.

That behavior is correct for the existing trust boundary, but it leaves continuity recovery undefined after a legitimate post-retirement direct-path loss.

## Purpose

Define the smallest fail-closed policy that may authorize **reacquisition of a fresh relay stream through the exact same still-authenticated relay control node** after successful relay retirement and subsequent direct-route loss.

This policy does not open the relay stream. A later Node/controller child must consume the authorization and use the existing authenticated relay-control machinery.

## Required successful-retirement evidence

Recovery can be considered only when all retirement evidence is exact and terminal:

- `retirement_phase=retired`;
- `retirement_callback_attempted=true`;
- `relay_retirement_performed=true`; and
- `relay_retired_at_ms` is a valid non-future timestamp.

`pending`, `callback_rejected`, `callback_indeterminate`, false retirement, missing retirement time, malformed input, or contradictory timestamps all hold.

An indeterminate retirement is deliberately not treated as a successful retirement. It requires separate inspection rather than automatic topology mutation.

## Current route-state requirements

A fresh relay reacquisition may be authorized only when:

- the node is not stopping;
- no newer UDP Swarm session has superseded the retirement episode;
- the promoted direct route is no longer live;
- no normal route for the expected peer is already live;
- no retained relay fallback is already live;
- the retired relay stream itself is no longer live;
- no replacement relay stream is already live;
- no recovery request for this episode is already in flight;
- the original relay control route is still live;
- that relay control route is authenticated direct transport; and
- the authenticated relay-control node ID exactly equals the original relay node ID.

These gates close stale-tombstone races. A late recovery evaluation must not create topology work while shutdown is underway, after a newer Swarm session has taken ownership, while another replacement already exists, or while a previously authorized recovery attempt is still outstanding.

If another route already restored connectivity, the policy holds instead of creating duplicate recovery work.

## Fresh-stream boundary

The retired relay stream is historical evidence only.

The policy always fixes:

- `requires_fresh_relay_stream=true`; and
- `retired_stream_reuse_authorized=false`.

A later controller must request a new relay stream. It must never resurrect or reuse the retired stream ID as if the old stream were still live.

## Bounded retry policy

Automatic same-relay reacquisition is bounded to three attempts for one retirement/recovery episode.

- first attempt may be authorized immediately after the loss state is established;
- an authorization must be recorded as in-flight before the network request begins;
- while recovery is in flight, further policy evaluations hold;
- subsequent attempts require the prior attempt to have completed/cleared and at least 5,000 ms since its recorded attempt time;
- retry timestamps must remain safe nonnegative integers;
- retry-time arithmetic overflow fails closed; and
- after three attempts the policy returns `reacquisition_attempts_exhausted`.

Exhaustion does not declare the peer unreachable. A later discovery/recovery lane may choose a fresh relay node or another bounded strategy.

## Verified-direct boundary

Relay retirement does not convert a transient NAT-punched endpoint into durable public reachability evidence.

The existing VOID reachability runtime keeps a stronger independent boundary for `direct_confirmed`: the candidate must be public and fresh authenticated dialback success must come from at least two independent observers in at least two failure domains.

This recovery policy does not weaken or bypass that boundary and always reports `verified_direct_evidence_persisted=false`. Its continuity response to an expired ephemeral direct path is fresh relay reacquisition, not automatic verified-peer persistence or direct reconnect.

## Closed input boundary

`evaluateVoidUdpSwarmPostRetirementRecoveryPolicyV1(...)` accepts `unknown` and requires the exact v1 evidence keys. Unknown fields, invalid tokens/node IDs, invalid booleans/enums, unsafe timestamps, inconsistent attempt counters, and malformed retry history return `invalid_evidence`.

The stale-recovery booleans are also closed-schema fields; malformed types for shutdown, newer-session, retired/replacement-stream, or in-flight state fail closed before authorization.

## Authority boundary

Even an authorization decision reports all mutation fields false:

- `normal_peer_map_mutation_performed=false`;
- `relay_stream_mutation_performed=false`;
- `network_dial_performed=false`;
- `verified_direct_evidence_persisted=false`; and
- `production_udp_activation_performed=false`.

The policy grants no wallet, signer, validator, treasury, Work Credit, transaction, or money authority.

## Collision posture

This lane is four additive paths only and does not modify `src/node_core.ts`.

#1140 remains the exact-green runtime relay-retirement mount. #1141 remains a sibling content-addressed retirement-receipt lane. The independent SegStore repair #1142 is unrelated and untouched.

A concurrent duplicate recovery-policy branch discovered during development was not opened as a PR; #1144 remains the single active policy lane.

## Next seam

A later Node child can retain a bounded post-retirement tombstone when the direct path closes, derive exact current relay-control/stream/session state, evaluate this policy, and—only on `authorize_fresh_relay_reacquisition`—atomically mark the episode in-flight before requesting a brand-new relay stream through the exact authenticated relay node.

That mount must preserve the three-attempt / 5-second bounds, clear in-flight state only on a definite attempt outcome, stop immediately if a newer session/normal route/replacement stream appears, and never convert the expired punched endpoint into durable verified-direct evidence.
