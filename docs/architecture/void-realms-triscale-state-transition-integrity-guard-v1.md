# VOID Realms tri-scale state-transition integrity guard v1

Marker: `VOID_REALMS_TRISCALE_STATE_TRANSITION_INTEGRITY_GUARD_V1`

## Problem

The merged tri-scale building primitives deterministically plan and simulate
small, medium, and standard placements, whole-piece breaks, atomic subdivision,
and atomic merge. They remain source-only and do not commit gameplay state.

Two integrity boundaries remained open when those primitives are used across a
process, persistence, registry, or network boundary:

1. planners accepted a supplied build-state body without recomputing its
   `state_root_sha256`; and
2. simulators accepted a supplied plan after checking only limited revision,
   replay, and source-existence conditions.

A caller could therefore retain an old state root while changing a material
balance, placement, owner, or consumed-request set. A caller could also replace
plan fields such as material totals, replacement placements, or a merge target
before invoking a lower-level simulator.

The base state materializer also orders placement arrays with `localeCompare`.
Arrays retain order inside stable JSON, so registry-facing verification should
not depend on locale or ICU collation behavior.

## Closed build-state verification

`verifyVoidRealmsTriScaleBuildStateIntegrityV1(...)` independently validates a
supplied build state before any planner or simulator is called.

It requires:

- exact closed state, placement, and position keys;
- exact marker, version, identifier formats, and nonnegative safe integers;
- exact caller-pinned world and region binding;
- valid placement owner, material, scale, profile, coordinates, and timestamp;
- placement alignment and containment inside the supplied region descriptor;
- globally unique placement IDs;
- non-overlapping placement occupancy;
- unique, canonically ordered consumed request IDs;
- placements canonically ordered by explicit UTF-16 code-unit comparison;
- exact occupancy-root recomputation; and
- exact build-state-root recomputation from the complete canonical state body.

The guard uses explicit `<` and `>` string comparison. It does not use
`localeCompare` or `Intl.Collator`.

### Canonical state body

The recomputed state root binds:

- marker and version;
- world and region IDs;
- revision;
- nonnegative material balances;
- the complete placement array;
- the complete consumed-request array; and
- the independently recomputed occupancy root.

Changing any of those fields while retaining the old state root fails closed.
Readdressing a state with noncanonical placement or request ordering also fails.

## Exact transition reconstruction

The guard exposes four registry-facing verifiers:

- `verifyVoidRealmsTriScalePlaceTransitionIntegrityV1(...)`;
- `verifyVoidRealmsTriScaleBreakTransitionIntegrityV1(...)`;
- `verifyVoidRealmsTriScaleSubdivisionTransitionIntegrityV1(...)`; and
- `verifyVoidRealmsTriScaleMergeTransitionIntegrityV1(...)`.

Each verifier receives:

- the world manifest and region descriptor;
- the complete before state;
- the original request;
- the supplied plan;
- the supplied after state; and
- the supplied simulation receipt.

The verifier then performs this exact sequence:

1. reject unknown transition-envelope or request keys;
2. independently verify the complete before state;
3. invoke the existing canonical planner with the original request;
4. require the supplied plan to equal the reconstructed plan exactly;
5. invoke the existing canonical simulator with the reconstructed plan;
6. require the supplied after state and receipt to equal the reconstructed
   result exactly;
7. independently verify the complete after state; and
8. require one exact revision advance and a changed state root.

The guard therefore does not create a second gameplay model. The merged
primitives remain the source of transition semantics, while this layer closes
the authenticity boundary around their inputs and outputs.

## Covered transitions

### Place

The guard binds the request-derived placement identity, server-derived scale and
material cost, occupied microcells, material before/after totals, revision, next
state, replay history, and receipt.

### Break

The guard binds the exact existing placement, owner, released microcells,
restored material total, revision, next state, replay history, and receipt.

### Subdivide

The guard binds the exact source placement, target scale, complete replacement
set, replacement count, occupied microcells, occupancy conservation, material
conservation, revision, next state, replay history, and atomic receipt.

### Merge

The guard binds the exact source set, uniform scale and material, complete target
coverage, target placement, occupancy conservation, material conservation,
revision, next state, replay history, and atomic receipt.

## Adversarial proof

The focused proof demonstrates successful verification of all four transition
types and rejection of:

- material-balance inflation while retaining an old state root;
- consumed-request mutation while retaining an old state root;
- placement-owner mutation while retaining an old state root;
- occupancy-root and state-root substitution;
- a readdressed state with noncanonical placement ordering;
- place and break material-total substitution;
- subdivision replacement-placement substitution;
- merge target-placement substitution;
- after-state mutation;
- receipt mutation; and
- an unknown client-supplied material-cost request field.

It also asserts that the integrity guard contains no locale-aware comparator.

Expected marker:

```text
VOID_REALMS_TRISCALE_STATE_TRANSITION_INTEGRITY_GUARD_V1_PROOF_GREEN
```

## Evidence limitations

A state root is an unkeyed content address. It proves exact state bytes, not that
the state is canonical, signed, current, durably stored, or accepted by an
authoritative region service.

Historical placement records do not retain every derivation input used by their
original placement IDs, such as the originating request ID or atomic conversion
context. This guard therefore verifies placement shape, bindings, profile,
geometry, ownership field, occupancy, ordering, and inclusion in the complete
state root. It does not reconstruct the historical origin of an arbitrary
pre-existing placement from the placement record alone.

Strong provenance requires either:

- a separately trusted and authenticated starting state followed by a completely
  verified transition chain; or
- a separately reviewed signed checkpoint or authoritative state-commit layer.

The supplied manifest and region descriptor are caller-pinned context. This lane
does not independently recompute their content addresses. Registry code may
compose it with the checkpoint-graph and world/region integrity contract in PR
#967 after that contract is separately reviewed and merged.

## Authority boundary

All receipts remain `simulated_not_committed`. The guard does not commit a block,
placement, break, subdivision, merge, inventory change, or world mutation.

This lane starts no server or listener, contacts no peer, deploys or restarts
nothing, accesses no credential, private key, wallet, or signer, writes no Work
Credit, executes no payment, constructs or broadcasts no transaction, and moves
no funds.

Promotion from draft, merge, authoritative state persistence, signed checkpoints,
trusted starting-state selection, runtime integration, deployment, gameplay
mutation, and all money-moving activity remain separate explicit gates.
