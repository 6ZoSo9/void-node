# VOID Realms single canonical world: region checkpoint and handoff v1

Marker: `VOID_REALMS_SINGLE_CANONICAL_WORLD_FOUNDATION_V1`

## Constitutional world rule

VOID Realms is one logical, persistent world.

It may use many physical servers, player nodes and storage replicas, but those
machines do not create independent canonical worlds. Every region, checkpoint,
handoff and public object remains bound to one deterministic `voidrw1_...`
world ID derived from the reviewed genesis manifest.

```text
one world identity
    |
    +-- region (0,0) authority server
    +-- region (1,0) authority server
    +-- sleeping regions restored from checkpoints
    +-- player nodes serving verified public objects
```

A private server may run an isolated development copy, but it cannot claim the
canonical world ID or merge state into the canonical world without a separately
authorized import protocol.

## Region partitioning

The initial surface space is divided into a deterministic two-dimensional grid.
A region is identified by integer `(region_x, region_z)` coordinates.

Default foundation parameters:

- chunk size: 16 nodes;
- region width and depth: 64 chunks, or 1,024 nodes;
- vertical range: -64 through 1,023;
- orthogonal boundary handoffs only.

Region IDs are content-derived from the world ID, space ID, coordinates and
bounds. Negative coordinates use mathematical floor division, so the mapping
remains deterministic on every implementation.

## Replaceable authority servers

A region authority server is an operator role, not the region's identity.

Authority is represented by a bounded, generation-numbered lease:

- exact world and region binding;
- exact authority-node identity;
- validity window;
- previous-lease lineage;
- signature required for live use.

The source-only foundation emits unsigned plans and grants no authority. A
future activation gate must verify signatures, current lease generation,
revocation state and the current global world checkpoint.

If a host fails, another authorized host may resume the same region from the
latest accepted checkpoint. The region does not become a new world and its
coordinates do not change.

## Region checkpoints

Each region publishes an append-only checkpoint chain containing:

- region and world identity;
- authority lease;
- monotonically increasing sequence and tick;
- parent checkpoint;
- gameplay-state root;
- public-object manifest root;
- event-log root;
- canonical timestamp.

The checkpoint contains hashes, not private player state. Live checkpoints
must be signed by the current region authority. Player nodes may store and
serve checkpoint data but cannot sign or commit it.

## Global world checkpoints

A global world checkpoint anchors one latest checkpoint per included active
region. The sorted checkpoint set produces a deterministic region-set root.

This gives clients one canonical reference for cross-region operations. A
handoff is valid only when both its source and destination checkpoints appear
in the same global world checkpoint.

The first implementation may publish global checkpoints through a single
reviewed coordinator. Later versions can distribute production while
preserving ZoSo's constitutional authority over world identity, genesis,
irreversible imports and existential rule changes.

## Player handoff

A player crossing a region boundary uses a two-phase handoff:

1. The source authority freezes a public-state root at an anchored source
   checkpoint.
2. It creates a short-lived handoff bound to the destination region and its
   anchored checkpoint.
3. The destination authority verifies adjacency, world identity, checkpoint
   membership, expiry and replay state.
4. It emits an acceptance receipt.
5. Only an authoritative destination-state commit makes the move effective.

The source-only implementation prepares and validates these artifacts but
performs no gameplay mutation.

Handoffs contain a public-state root rather than raw inventory, identity or
private account data.

## Player VOID Game Nodes

A player's bundled VOID Game Node may:

- cache signed region checkpoints;
- serve public world objects and assets;
- replicate public event and manifest data;
- advertise verified availability;
- help recover a failed regional host.

It may never:

- decide movement, combat, inventory or ownership;
- sign a region or global checkpoint;
- accept a handoff;
- assign authority;
- create canonical state;
- use validator, wallet or payment keys.

Replica advertisements therefore carry explicit `false` authority fields.

## VoidMiner

VoidMiner is the later extended-contribution profile. It may preserve more
public world data and perform bounded verification after separate consent.
VoidMiner remains distinct from the required gameplay node and cannot gain
gameplay authority by contributing more resources.

## Failure and fork handling

- A stale region checkpoint is rejected.
- A checkpoint with the wrong parent, sequence or region is rejected.
- A world checkpoint cannot include two checkpoints for the same region.
- A handoff cannot cross between unrelated or diagonal regions.
- An expired, wrong-world or wrong-checkpoint handoff is rejected.
- A player replica cannot promote itself to authority.
- Partial handoff validation produces no state commit.
- Divergent region branches remain quarantined until a separately authorized
  recovery decision selects one lineage.

## Ordered implementation gates

1. Merge the VOID Realms foundation.
2. Land this deterministic source-only world contract.
3. Establish an exact Luanti/Mineclonia source and license receipt.
4. Run one private local world with a single region authority.
5. Publish and verify unsigned fixture checkpoints.
6. Introduce signed development checkpoints with non-production keys.
7. Test two adjacent regions and one synthetic player handoff.
8. Add player-node public-object replication.
9. Test region-host loss and exact checkpoint recovery.
10. Review live identity, signing, persistence, anti-cheat and rollback
    authority before any public canonical world launch.

## Current authority boundary

This lane creates no world, assigns no region, signs no checkpoint, accepts no
handoff, starts no server or listener, connects to no peer, commits no gameplay
state, writes no Work Credit, accesses no wallet or signer, deploys nothing and
moves no money.
