# VOID Realms tri-scale atomic subdivide and merge v1

Marker: `VOID_REALMS_TRISCALE_ATOMIC_CONVERSION_CONFIG_V1`

Stacked parent: draft PR #952 at
`86d448ca1e3ca40433a6660624026e7be3d627d8`.

## Purpose

Tri-scale pieces already tile the same integer microcell space cleanly. This
lane defines the atomic conversion operation that makes that relationship usable
during building without a transient empty or overlapping state.

```text
standard
  ├─ subdivide → 8 medium
  └─ subdivide → 64 small

medium
  └─ subdivide → 8 small
```

Every arrow is reversible through an exact merge.

## Clean geometric fit

A standard piece has edge length 4 microcells. A medium piece has edge length 2
and a small piece has edge length 1.

Therefore:

- `4 / 2 = 2` pieces per axis and `2³ = 8` medium pieces per standard;
- `4 / 1 = 4` pieces per axis and `4³ = 64` small pieces per standard;
- `2 / 1 = 2` pieces per axis and `2³ = 8` small pieces per medium.

All origins remain on the canonical signed integer grid. The conversion planner
enumerates the exact source and replacement microcell sets and requires them to
be identical.

## Atomic state transition

A conversion is one compare-and-swap revision transition:

```text
before revision N:
  source placements exist

after revision N+1:
  source placements are absent
  replacement placement set exists
```

There is no canonical intermediate state. The source and replacement pieces are
not simultaneously committed, so the transition creates neither a temporary
hole nor duplicate occupancy.

The checked-in implementation creates plans and pure in-memory simulations. It
does not commit live gameplay state.

## Material conservation

Conversions do not touch inventory balances.

- standard → 8 medium: `64 = 8 × 8`;
- standard → 64 small: `64 = 64 × 1`;
- medium → 8 small: `8 = 8 × 1`;
- every reverse merge preserves the same equality.

The server derives all counts and material totals. A client cannot supply a
trusted material delta.

## Subdivision rules

A subdivision request identifies one owned source placement and a smaller
target scale.

The planner:

1. verifies world, region, owner and expected revision;
2. derives a replay-protected request ID;
3. derives every child origin from the source origin and integer edge ratio;
4. derives deterministic child placement IDs;
5. proves exact source/replacement microcell equality;
6. proves source/replacement material equality;
7. proves the complete state occupancy root remains unchanged;
8. emits an atomic replacement plan with `gameplay_state_committed=false`.

## Merge rules

A merge request identifies the complete source placement set, target scale and
target origin.

The planner requires:

- one uniform source scale;
- one owner and one material;
- an integral edge ratio;
- exact source count of 8 or 64;
- scale-aligned target origin;
- target entirely inside one region;
- exact complete target coverage;
- unchanged material total;
- unchanged complete occupancy root.

Mixed-scale source sets and partial target coverage are rejected in v1. A later
reviewed generalized packing operation could support mixed pieces, but it must
preserve the same exact coverage and conservation invariants.

## Replay and concurrency

Every request binds:

- operation marker;
- world and region;
- player session;
- exact source placement ID or sorted source set;
- target scale and target origin where applicable;
- expected revision;
- nonce;
- canonical request timestamp.

A stale revision or consumed request ID is rejected before any simulated
transition.

## Current authority boundary

The Luanti adapter is preview-only. This lane creates no world, mutates no node
or inventory, starts no server or listener, contacts no peer, commits no
gameplay state, writes no Work Credit, accesses no wallet or signer, executes no
payment, deploys nothing, modifies no existing pull request and moves no money.
