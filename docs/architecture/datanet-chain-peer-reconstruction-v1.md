# DataNet Chain-2050 plus peer reconstruction v1

Marker: `VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_V1`

Status: source-only deterministic planner and adversarial proof. It does not
contact a peer, read or write a filesystem, execute repair, or mutate
Chain-2050.

## Purpose

`VOID_COORDINATION_CONTROL_PLANE_V510` separates canonical truth from byte
availability:

- **Chain-2050** is the anchor of finalized commitments where current source
  actually records them.
- **DataNet** retains, retrieves, replicates, and repairs the payload bytes
  referenced by those commitments.
- local indexes and status projections are disposable when they can be rebuilt
  from finalized chain state plus surviving peers.

This contract makes the recovery decision executable without making a local
ledger or a peer vote authoritative.

## Required Chain-2050 commitment

Every reconstruction request begins with one closed commitment object bound to:

- Chain ID `2050`;
- object ID;
- exact content SHA-256;
- exact byte length;
- accepted checkpoint height;
- accepted checkpoint block hash;
- accepted-checkpoint policy ID;
- commitment transaction hash; and
- commitment log index.

The module derives a domain-separated commitment identity:

```text
voiddncommit1_<sha256>
```

Any changed field changes that identity. A malformed, extended, or
self-inconsistent commitment fails closed.

This is a **reference input contract**. The module does not claim that the
current live chain already exposes this exact object or that supplied
checkpoint evidence is independently authenticated. A later integration must
bind it to the exact reviewed Chain-2050 route/state/event and finality rule.

## Chain digest, not peer majority

Peer count is availability evidence, not truth authority.

For each local or peer payload, the planner computes the actual byte length and
SHA-256 and compares both to the Chain-2050 commitment. A peer-provided digest
is not accepted in place of hashing the bytes.

Consequences:

- a forged majority cannot override one exact chain commitment;
- one exact authenticated source is sufficient to make reconstruction
  possible;
- ten, one hundred, or the maximum admitted number of identical wrong peers do
  not make wrong bytes canonical;
- an unauthenticated peer with exact bytes is not selected as an authoritative
  reconstruction source; and
- a local cache with the wrong object, generation, length, or bytes loses to the
  chain commitment.

The planner records `peer_majority_authority_used=false` on every successful
result.

## Peer candidate contract

Each candidate has exactly:

```text
peer_id
authenticated
accepts_repair
object_id
commitment_id
retrieval_generation
payload
```

`payload` is either a Node.js `Buffer` or `null`. The pure planner is intended
to sit behind a separately bounded retrieval layer such as the field-object
pull transport; it does not perform network acquisition itself.

Peer IDs must be unique. Retrieval generations are bound into deterministic
candidate identities. Mixed object or commitment generations are rejected.

Authenticated peers may be classified as:

- exact reconstruction source;
- payload absent;
- object mismatch;
- commitment-generation mismatch;
- byte-length mismatch; or
- content-digest mismatch.

Unauthenticated exact bytes remain non-authoritative input and cannot satisfy
reconstruction availability.

## Local state contract

Local state is exactly one of:

- absent: `present=false`, null identity/generation/payload; or
- present: `present=true` with a `Buffer` and stated object/commitment identity.

The planner independently hashes present local bytes. A local record does not
become valid because it says it belongs to the current commitment.

When local bytes are absent or invalid and an authenticated exact peer exists,
the result is:

```text
RECOVERABLE_LOCAL_RECONSTRUCTION_REQUIRED
```

When local bytes are exact but the target replica count is not met, the result
is:

```text
AVAILABLE_REPAIR_REQUIRED
```

When the local copy and enough exact authenticated peer copies exist, the
result is:

```text
AVAILABLE_TARGET_REPLICAS_MET
```

When no authenticated exact source exists, the result is:

```text
DATANET_RECONSTRUCTION_HOLD
payload_unavailable_from_authenticated_exact_sources
```

## Deterministic source selection

When several exact authenticated peers are available, source selection is
stable:

1. local exact bytes are preferred;
2. otherwise peers are ordered by `peer_id`;
3. ties are ordered by retrieval generation; and
4. the first exact source is selected.

The planner does not copy the selected bytes, open a destination, or grant
repair authority. It only returns the source identity and a bounded plan.

## Repair planning

The default target is three exact replicas, including the local copy when it is
valid. The planner selects repair recipients only from authenticated candidates
that explicitly advertise `accepts_repair=true` and do not already hold exact
bytes.

Recipients are sorted by peer ID and truncated to the missing replica count.
The result reports any remaining repair-capacity shortfall.

This is **no repair execution**. The planner cannot write to local storage,
contact a peer, upload bytes, authorize a remote mutation, or declare that a
planned repair completed.

## Resource ceilings

Default policy:

```text
max_object_bytes=67108864
max_total_candidate_bytes=268435456
max_peer_candidates=64
target_replica_count=3
max_target_replica_count=16
```

Absolute admission ceilings are also enforced:

- object bytes: 256 MiB;
- total candidate bytes: 1 GiB;
- peer candidates: 256; and
- target-replica ceiling: 64.

The total-candidate bound includes local and peer payload buffers. The target
must be reachable from the admitted local-plus-peer population.

## Truthful availability claims

A successful evaluation proves only that at least one exact payload was present
in the supplied bounded evaluation generation. It explicitly states:

```text
availability_proven_for_this_evaluation=true
durable_future_availability_proven=false
```

It does not prove durable future availability. It does not prove that a peer
will remain online, that a planned repair was executed, that another node can
retrieve the object later, or that a chain commitment can recreate bytes after
all replicas are lost.

## Forged-majority adversary

The focused proof constructs twelve authenticated peers with forged bytes and
one authenticated peer with exact bytes. The exact peer is selected despite the
12-to-1 vote against it because the Chain-2050 digest, not peer majority,
defines the expected content.

A second control supplies only forged peers and requires a HOLD. Thirty-two
additional byte-level mutations prove that no single forged candidate becomes
a source merely because it is authenticated or appears before the exact peer.

## Relationship to #1352 and #1462

This lane does not modify the ownerless #1352 segmented-store branch. It defines
the small pure reconstruction decision that a later reviewed DataNet storage
implementation can consume.

#1462 owns bounded field-object acquisition and private receipt publication.
This planner begins after candidate bytes have already been acquired into
bounded memory. It does not duplicate transport, namespace, or publication
logic.

The eventual integration sequence is:

```text
source-backed finalized Chain-2050 commitment
        ↓
bounded peer/local byte acquisition
        ↓
this chain-digest reconstruction decision
        ↓
separately authorized failure-atomic local publication
        ↓
separately authorized replica repair
        ↓
post-repair retrieval and commitment verification
```

## Executable proof

The proof contains at least 125 cases covering:

- deterministic commitment creation and validation;
- malformed and tampered commitment fields;
- wrong Chain-2050 identity;
- exact local and peer controls;
- local corruption recovery;
- exact-source deterministic selection;
- forged-majority rejection;
- unauthenticated exact-byte rejection;
- stale object and commitment generations;
- same-length byte corruption;
- peer/local closed-shape and type failures;
- duplicate peers;
- peer-count, object-byte, aggregate-byte, and replica-policy limits;
- deterministic repair recipients and capacity shortfall;
- negative authority flags;
- documentation/source topology; and
- Node 22/24/26 workflow binding.

## Authority boundary

The module and proof grant:

```text
no network call
no filesystem read or write
no peer mutation
no repair execution
no Chain-2050 mutation
no credential access
no wallet or signer access
no transaction construction or broadcast
no money movement
```

Source publication, review, merge, runtime integration, actual peer retrieval,
actual reconstruction publication, repair execution, deployment, restart, and
all economic or chain mutations remain separate gates.
