# VOID Realms checkpoint-graph integrity guard v1

Marker: `VOID_REALMS_CHECKPOINT_GRAPH_INTEGRITY_GUARD_V1`

## Problem

The VOID Realms canonical-world foundation creates content-addressed region
authority leases, regional checkpoints, and global world checkpoints. Its
original checkpoint-chain validator proves sequence order, parent linkage,
increasing ticks, and increasing timestamps.

Those structural checks alone do not prove that a supplied object's identifier
still matches its body. A caller could retain a syntactically valid
`voidrcp1_...` checkpoint ID while changing a gameplay-state root, public-object
root, event-log root, lease binding, or timestamp. A global checkpoint could
similarly retain its identifier while changing its region list or region-set
root.

A handoff must not treat identifier shape as content-address verification.

## Closed checkpoint graph

The guard verifies one source-only graph containing:

- the exact global world checkpoint;
- one complete checkpoint chain for each included region; and
- the exact authority leases referenced by those chains.

The graph is accepted only when every identifier is recomputed from the same
closed body used by the original materializer.

### Authority lease verification

For each lease, the guard requires:

- exact object keys;
- canonical marker, version, status, and source-only authority fields;
- valid world, region, authority-node, lease, and predecessor identifiers;
- a valid increasing UTC lease window;
- generation-zero versus predecessor consistency; and
- exact recomputation of `lease_id` from every field except `lease_id`.

An altered authority node, region, validity window, generation, predecessor, or
authority field invalidates the lease content address.

### Regional checkpoint verification

For every checkpoint, the guard requires:

- exact object keys;
- canonical marker, version, status, and source-only authority fields;
- exact lease, world, and region binding;
- sequence-zero versus parent consistency;
- valid roots, tick, timestamp, and checkpoint identifiers;
- a timestamp inside the referenced lease window; and
- exact recomputation of `checkpoint_id` from every field except
  `checkpoint_id`.

After content verification, the existing append-only chain validator still
requires contiguous sequence numbers, exact parents, stable world and region,
increasing ticks, and increasing timestamps.

### Global world-checkpoint verification

The global checkpoint must contain exactly the terminal checkpoint from each
supplied regional chain. The terminal ID list must be unique and canonically
sorted using deterministic UTF-16 code-unit ordering.

The guard then:

1. recomputes the region-set root from that exact terminal list;
2. rejects missing, duplicate, additional, or reordered terminal IDs;
3. requires the world checkpoint time not to precede any terminal checkpoint;
4. recomputes the complete `world_checkpoint_id`; and
5. rejects any supplied lease that is not referenced by a verified checkpoint.

This prevents an apparently valid global checkpoint from anchoring a different
checkpoint set than its identifier commits to.

## Handoff wrappers

The registry-facing wrappers are:

```text
planVoidRealmsPlayerRegionHandoffWithVerifiedCheckpointGraphV1(...)
acceptVoidRealmsPlayerRegionHandoffWithVerifiedCheckpointGraphV1(...)
```

Both verify the complete checkpoint graph before delegating to the existing
source-only handoff functions. Planning additionally requires both source and
destination checkpoints to be verified terminal checkpoints in the same global
checkpoint. Acceptance requires the destination checkpoint and global
checkpoint to remain verified.

The lower-level original handoff functions remain deterministic source
primitives. A registry or runtime that needs checkpoint authenticity should use
the guarded wrappers rather than treating a formatted checkpoint ID as proof.

## Adversarial proof

The focused proof demonstrates:

- a valid two-region checkpoint graph;
- successful source-only handoff planning and acceptance through the guard;
- rejection after authority-node tampering in a lease;
- rejection after gameplay-state-root tampering;
- rejection after event-log-root tampering;
- rejection after checkpoint-ID substitution;
- rejection after global region-set-root tampering;
- rejection of a noncanonical global checkpoint ID ordering;
- rejection of an otherwise valid but unreferenced authority lease; and
- rejection before handoff planning when the supplied graph is altered.

Expected marker:

```text
VOID_REALMS_CHECKPOINT_GRAPH_INTEGRITY_GUARD_V1_PROOF_GREEN
```

## Evidence boundary

This guard proves deterministic source-object shape, linkage, and content
addressing. It does not prove that a source-only lease or checkpoint is signed,
currently live, accepted by a production registry, stored durably, or served by
a current authority host. It does not consult revocation state, authenticate a
network peer, inspect private player data, or commit gameplay state.

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
