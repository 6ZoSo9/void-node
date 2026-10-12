# VOID Realms tri-scale building v1

Marker: `VOID_REALMS_TRISCALE_BUILDING_CONFIG_V1`

Stacked parent: draft PR #948 at
`3220ac6cd1493275c4677a4ce1aa26e0a439ecbd`.

## Player experience

Before placing material, the player selects one of three discrete positions:

```text
SMALL 25%        MEDIUM 50%        STANDARD 100%
    |----------------|----------------|
```

The selector is not a free continuous scale. Every client value is normalized
to exactly index 0, 1 or 2 before the server derives the profile.

| Profile | Edge | Canonical edge | Volume | Material units |
|---|---:|---:|---:|---:|
| small | 25% | 1 microcell | 1 | 1 |
| medium | 50% | 2 microcells | 8 | 8 |
| standard | 100% | 4 microcells | 64 | 64 |

Each step has half the previous edge length. Volume and material therefore
change cubically: `4³ = 64`, `2³ = 8`, `1³ = 1`.

## Canonical integer grid

All placement and collision math uses signed integer microcell coordinates.

A standard world cell contains a 4×4×4 microgrid. The three edges are exactly
4, 2 and 1 microcells. No floating-point coordinate enters the canonical
request, placement ID, overlap check, material calculation or state root.

Alignment:

- standard origins are divisible by 4 on every axis;
- medium origins are divisible by 2 on every axis;
- small origins may use every integer microcell;
- the positive-modulo rule preserves the same alignment at negative
  coordinates.

The visible rendering scale is an adapter concern. It may be tuned during
gameplay tests without changing canonical placement IDs or conservation math.

## Material conservation

Material is denominated in smallest-block units.

- one standard placement consumes 64 units;
- one medium placement consumes 8 units;
- one small placement consumes 1 unit;
- breaking a whole placement returns the exact derived cost;
- the client never supplies a trusted cost;
- v1 does not partially break, split or merge a placed piece.

Eight medium pieces or sixty-four small pieces occupy the same 64 microcells as
one standard piece and require the same 64 material units.

## Server-authoritative operation

A client request contains:

- exact world and region;
- player session;
- material ID;
- selector value;
- integer microcell origin;
- expected build-state revision;
- nonce and timestamp.

The server:

1. normalizes the selector to one of three profiles;
2. derives edge, volume and cost;
3. checks scale-specific alignment;
4. verifies that every occupied microcell remains inside one region;
5. rejects every occupied microcell already used by another placement;
6. checks material balance and compare-and-swap revision;
7. derives request and placement IDs;
8. records the accepted operation in the region's authoritative state.

The checked-in implementation performs steps 1–7 and can simulate step 8
purely in memory for proof. It never commits live gameplay state.

## Region and checkpoint binding

A placed piece belongs to exactly one region. Cross-region pieces are rejected
rather than split implicitly.

Accepted placements must become part of the region gameplay-state root defined
by the single-world foundation. Cross-region buildings therefore consist of
multiple independently valid regional pieces joined visually by the client.

Player replicas may store and serve placement records after checkpoint
publication, but they cannot authorize placement, inventory, breaking or
checkpoint state.

## Occupancy root

The occupancy root hashes the sorted set of occupied microcell coordinates,
independent of how those cells are grouped into pieces.

This permits deterministic equivalence checks:

- one standard piece;
- eight correctly arranged medium pieces;
- sixty-four correctly arranged small pieces;

all produce the same occupancy root when they cover the same microcells, while
their placement lists remain distinct.

## Luanti adapter boundary

The current Luanti adapter is preview-only and grants no placement authority.

The source-only Luanti adapter uses a horizontal formspec scrollbar with:

- minimum 0;
- maximum 2;
- small and large steps of 1;
- standard as the default index 2.

It stores the selected profile in bounded in-memory per-player state. The
selector craftitem produces a pointed-face preview and returns the unchanged
item stack.

The adapter calls no node, inventory, entity, metadata, file, network or worker
mutation API.

The final renderer remains an explicit later decision:

- a native-microcell prototype can map each microcell to a native node for
  simple exact collision and storage;
- a packed renderer can display multiple microcells inside one native node but
  requires a separately tested representation and performance strategy.

Canonical state does not depend on either renderer.

## Adversarial rules

The proof rejects:

- stale revisions;
- replayed request IDs;
- insufficient material;
- overlapping pieces;
- medium or standard pieces at misaligned origins;
- pieces crossing a region boundary;
- breaks by a non-owner in the v1 permission model;
- breaks of missing placements;
- invalid world or region bindings;
- duplicate occupied microcells inside stored state.

## Current authority boundary

This lane creates no world, mutates no node or inventory, starts no server or
listener, contacts no peer, commits no gameplay state, writes no Work Credit,
accesses no wallet or signer, executes no payment, deploys nothing and moves no
money.
