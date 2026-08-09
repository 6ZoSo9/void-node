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

- the promoted direct route is no longer live;
- no normal route for the expected peer is already live;
- no retained relay fallback is already live;
- the original relay control route is still live;
- that relay control route is authenticated direct transport; and
- the authenticated relay-control node ID exactly equals the original relay node ID.

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
- subsequent attempts require at least 5,000 ms since the previous attempt;
- retry timestamps must remain safe nonnegative integers;
- retry-time arithmetic overflow fails closed; and
- after three attempts the policy returns `reacquisition_attempts_exhausted`.

Exhaustion does not declare the peer unreachable. A later discovery/recovery lane may choose a fresh relay node or another bounded strategy.

## Closed input boundary

`evaluateVoidUdpSwarmPostRetirementRecoveryPolicyV1(...)` accepts `unknown` and requires the exact v1 evidence keys. Unknown fields, invalid tokens/node IDs, invalid booleans/enums, unsafe timestamps, inconsistent attempt counters, and malformed retry history return `invalid_evidence`.

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

## Next seam

A later Node child can retain a bounded post-retirement tombstone when the direct path closes, derive exact current relay-control state, evaluate this policy, and—only on `authorize_fresh_relay_reacquisition`—request a brand-new relay stream through the exact authenticated relay node.

That mount must keep the attempt counter/timestamps bounded and must stop recovery immediately if another normal route becomes live.
