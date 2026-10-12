# VOID Agent Alliance lifecycle temporal guard v1

Marker: `VOID_AGENT_ALLIANCE_LIFECYCLE_TEMPORAL_GUARD_V1`

## Purpose

The membership verifier checks manifest shape, content addressing, Ed25519
identity binding, lifecycle transitions, predecessor linkage, and immutable
membership commitments. Registry consumers also need a temporal boundary so a
signed successor cannot reorder an accepted lifecycle or lengthen its validity.

A member signature proves member acceptance and lifecycle continuity. It does
not grant admission authority. The registry-facing guard therefore rejects a
`candidate -> active` transition and directs callers to the separate sovereign
admission guard.

This guard is deterministic and source-only. It does not consult a wall clock or
claim that a manifest is currently active.

## Invariants

The temporal guard requires:

1. `candidate -> active` fails closed with
   `candidate_activation_requires_sovereign_admission_guard`;
2. successor `issued_at` does not precede the predecessor lifecycle anchor;
3. successor `effective_at` is strictly later than that anchor; and
4. successor `expires_at` does not extend beyond predecessor expiry.

A candidate uses `issued_at` as its anchor because it has no `effective_at`.
Every other state uses `effective_at`.

Expiry may remain unchanged or be shortened. Extending duration requires a new,
separately reviewed renewal protocol rather than an ordinary status transition
signed only by the member identity key.

## API

`verifyAllianceMembershipTransitionTemporalGuardV1(previous, next, publicKey)`
validates both manifests, rejects candidate self-promotion, runs the core member
transition and signature verifier, then applies the temporal invariants above.

Implementation:

`integrations/agents/void-agent-alliance-v1/lifecycle-temporal-guard-v1.mjs`

Candidate admission must instead use:

`verifyAllianceSovereignAdmissionV1(candidate, active, memberPublicKey, authorization, sovereignPublicKey)`

from `sovereign-admission-guard-v1.mjs`.

The focused temporal proof covers candidate self-activation rejection, a
regressed effective time, an expiry extension, and a quarantine transition with
shortened expiry. The separate sovereign-admission proof covers a valid
member-plus-Sovereign two-signature admission.

## Boundary

The guard does not authenticate wall-clock time, admit an agent, renew
membership, activate a registry, issue capabilities, use production keys,
deploy code, restart services, dispatch work, accept payment, write Work
Credits, access wallets or signers, submit transactions, or move funds.

Admission authorization verification is source-only. Registry mutation, runtime
freshness, production key use, and operator activation remain separately
authorized gates.
