# VOID Realms checkpoint-graph integrity guard v1

Marker: `VOID_REALMS_CHECKPOINT_GRAPH_INTEGRITY_GUARD_V1`

## Problem

The VOID Realms canonical-world foundation creates content-addressed world
manifests, region descriptors, authority leases, regional checkpoints, global
world checkpoints, player handoffs, and handoff receipts.

The original regional-chain validator proves sequence order, parent linkage,
increasing ticks, and increasing timestamps. Those structural checks alone do
not prove that a supplied identifier still matches its body. A caller could
retain a syntactically valid ID while changing a state root, event root, lease
binding, region bounds, handoff root, TTL, authority field, acceptance time, or
global checkpoint set.

Identifier shape is not content-address verification.

## Closed checkpoint graph

The guard verifies one source-only graph containing:

- the exact global world checkpoint;
- one complete checkpoint chain for each included region; and
- the exact authority leases referenced by those chains.

Every identifier is recomputed from the same closed body used by the original
materializer.

### World manifest and region descriptors

The guarded handoff path first verifies the deterministic world and region
context that defines world identity, handoff TTL, bounds, and adjacency.

The world manifest validator requires:

- exact object and authority-boundary keys;
- canonical marker, version, world name, space, status, and source-only fields;
- the reviewed numeric ranges and exact `region_size_nodes` derivation;
- all authority capabilities fixed to false; and
- exact recomputation of `world_id` from the complete manifest body.

Each region descriptor requires:

- exact keys, marker, version, world, and space binding;
- exact integer region coordinates and world-derived bounds; and
- exact recomputation of `region_id`.

A caller cannot enlarge the TTL, alter a region edge, or change adjacency while
retaining the old world or region ID.

### Authority lease verification

For each lease, the guard requires:

- exact object keys;
- canonical marker, version, status, and source-only authority fields;
- valid world, region, authority-node, lease, and predecessor identifiers;
- a valid increasing UTC lease window;
- generation-zero versus predecessor consistency; and
- exact recomputation of `lease_id` from every field except `lease_id`.

### Regional checkpoint verification

For every checkpoint, the guard requires:

- exact object keys;
- canonical marker, version, status, and source-only authority fields;
- exact lease, world, and region binding;
- sequence-zero versus parent consistency;
- valid roots, tick, timestamp, and checkpoint identifiers;
- a timestamp inside the referenced lease window; and
- exact recomputation of `checkpoint_id`.

The existing append-only chain validator then requires contiguous sequence
numbers, exact parents, stable world and region, increasing ticks, and
increasing timestamps. Checkpoint IDs must also be globally unique within the
supplied graph.

### Global world-checkpoint verification

The global checkpoint must contain exactly the terminal checkpoint from each
supplied regional chain. The terminal ID list must be unique and canonically
sorted using deterministic UTF-16 code-unit ordering.

The guard:

1. recomputes the region-set root from the exact terminal list;
2. rejects missing, duplicate, additional, or reordered terminal IDs;
3. requires the world checkpoint time not to precede any terminal checkpoint;
4. recomputes the complete `world_checkpoint_id`; and
5. rejects any supplied lease that is not referenced by a verified checkpoint.

## Closed handoff and receipt verification

A graph can be authentic while a separately supplied handoff object is not. The
guarded path therefore validates the exact handoff and receipt bodies as
separate content-addressed objects.

### Handoff

The handoff validator requires:

- exact keys, marker, version, identifier formats, status, and false authority
  fields;
- an exact content-addressed world manifest and both exact region descriptors;
- distinct orthogonally adjacent source and destination regions;
- exact world, region, source-checkpoint, destination-checkpoint, and global
  checkpoint linkage;
- source and destination checkpoints anchored in the same verified global
  checkpoint;
- an increasing validity window that starts no earlier than the global
  checkpoint and does not exceed the verified world TTL; and
- exact recomputation of `handoff_id` from the complete handoff body.

### Receipt

The receipt validator requires:

- exact keys, marker, version, identifier formats, status, and false gameplay
  commit field;
- exact binding to the verified handoff, world, destination region, and
  destination checkpoint;
- acceptance inside the handoff validity window; and
- exact recomputation of `receipt_id` from the complete receipt body.

## Registry-facing wrappers

The registry-facing wrappers are:

```text
planVoidRealmsPlayerRegionHandoffWithVerifiedCheckpointGraphV1(...)
acceptVoidRealmsPlayerRegionHandoffWithVerifiedCheckpointGraphV1(...)
```

Planning verifies the graph, world manifest, region descriptors, and exact
supplied checkpoint objects before delegating to the source-only planner. It
then verifies the newly materialized handoff content address before returning
it.

Acceptance verifies the graph again, requires the exact supplied global and
destination checkpoint objects to match the verified graph, recovers the exact
source and destination terminal checkpoints by ID, validates the supplied
handoff content address and full linkage, delegates to the source-only receipt
materializer, and verifies the new receipt content address before returning it.

The lower-level original handoff functions remain deterministic source
primitives. Registry or runtime code that needs authenticity must use the
guarded wrappers.

## Adversarial proof

The focused proof demonstrates rejection of:

- authority-node, state-root, event-root, checkpoint-ID, global-root, ordering,
  and unreferenced-lease graph tampering;
- world manifest TTL tampering while retaining the old world ID;
- region-bound tampering while retaining the old region ID;
- a separately supplied checkpoint object that differs from the verified graph;
- handoff player-state-root, TTL, and authority-field tampering while retaining
  the old handoff ID;
- a destination checkpoint object that differs from the verified graph; and
- receipt time, authority-field, and receipt-ID tampering.

The proof also demonstrates a valid two-region graph, guarded handoff planning,
guarded acceptance, and exact handoff and receipt verification.

Expected marker:

```text
VOID_REALMS_CHECKPOINT_GRAPH_INTEGRITY_GUARD_V1_PROOF_GREEN
```

## Evidence boundary

This guard proves deterministic source-object shape, linkage, and content
addressing. It does not prove that a source-only lease, checkpoint, handoff, or
receipt is signed, currently live, accepted by a production registry, stored
durably, replay-safe in a live database, or served by a current authority host.
It does not authenticate a network peer, inspect private player data, or commit
gameplay state.

Production use still requires separately reviewed signature verification,
trusted time, lease-generation selection, revocation distribution, persistence,
replay protection, authoritative state transition, recovery, and operator
procedures.

## Authority boundary

This lane creates no canonical world, assigns no region authority, signs no
checkpoint, accepts no live handoff, commits no gameplay state, starts no server
or listener, connects to no peer, deploys or restarts nothing, accesses no
credential, wallet, private key, or signer, writes no Work Credit, executes no
payment, constructs or broadcasts no transaction, and moves no funds.
