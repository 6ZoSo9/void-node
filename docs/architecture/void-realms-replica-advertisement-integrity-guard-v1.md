# VOID Realms replica-advertisement integrity guard v1

Marker: `VOID_REALMS_REPLICA_ADVERTISEMENT_INTEGRITY_GUARD_V1`

## Problem

The VOID Realms canonical-world foundation lets player VOID Game Nodes advertise
that they can serve public objects associated with one regional checkpoint. The
base materializer produces a content-addressed `voidrra1_...` record and fixes
all gameplay authority fields to false.

The lower-level materializer alone does not verify an advertisement after it has
crossed a process, storage, or network boundary. A caller could retain the old
advertisement ID while changing the node, checkpoint, object roots, byte claim,
timestamp, status, or authority fields.

The base materializer also accepts `available_bytes = 0` while requiring at
least one object root and emitting status `public_replica_available`. That is a
contradictory availability claim even when its content address is internally
consistent.

## Closed advertisement verification

`verifyVoidRealmsReplicaAdvertisementContentAddressV1(...)` requires an exact
advertisement and an exact caller-supplied expectation.

The advertisement must contain only:

- marker and version;
- content-addressed advertisement ID;
- world, node, and regional-checkpoint identifiers;
- one to 4,096 public-object SHA-256 roots;
- a positive available-byte claim;
- a canonical UTC observation time;
- status `public_replica_available`; and
- three explicit false authority fields.

Unknown keys are rejected.

### Content address and root ordering

Every public-object root must be lowercase 64-character hexadecimal. Roots must
be unique and canonically sorted with explicit UTF-16 code-unit comparison.

The guard recomputes `advertisement_id` from the complete advertisement body:

```text
voidrra1_<sha256(canonical advertisement body)>
```

Changing any body field while retaining the old ID fails verification. A caller
also cannot readdress duplicate or noncanonically ordered roots into an accepted
record because semantic validation runs independently of the content-address
check.

### Positive availability

A record with status `public_replica_available` must advertise at least one
available byte. The guarded builder therefore rejects the lower-level
materializer's zero-byte edge case.

This does not prove that every claimed byte or object is actually retrievable.
It removes the direct contradiction between an available status, at least one
object root, and zero capacity.

### Caller-pinned identity and checkpoint

The expectation must pin:

- exact canonical world ID;
- exact player-node ID;
- exact regional-checkpoint ID;
- evaluation time;
- maximum accepted age; and
- maximum tolerated future clock skew.

A valid advertisement must match all three identifiers exactly. This prevents a
record for one world, node, or checkpoint from being accepted under another
registry entry merely because its shape and content address are valid.

The checkpoint identifier is treated as a caller-pinned reference. This guard
does not independently validate the checkpoint body. Registry code that needs
checkpoint authenticity must obtain the expected checkpoint ID from a separately
verified checkpoint graph, such as the contract proposed in PR #967.

### Freshness

Freshness is evaluated from explicit timestamps rather than an implicit wall
clock. The caller supplies:

- `evaluated_at_utc`;
- `max_age_seconds`, bounded to 1 through 86,400; and
- `max_future_skew_seconds`, bounded to 0 through 300.

The guard rejects records older than the selected policy and records dated too
far into the future. Explicit evaluation makes the result deterministic and
reviewable while leaving trusted-clock acquisition to a later runtime layer.

## Guarded builder

`materializeVoidRealmsReplicaAdvertisementWithIntegrityV1(...)` calls the
existing canonical materializer and immediately verifies the resulting record
against the supplied world, node, checkpoint, and freshness policy.

It preserves the original canonical advertisement ID for valid inputs while
failing closed on zero-byte claims and any other integrity violation.

The original materializer remains a deterministic source primitive. Registry or
runtime code that relies on an advertisement after it leaves the materializer
should use the integrity verifier or guarded builder.

## Adversarial proof

The focused proof demonstrates:

- a valid guarded advertisement with deterministic root ordering;
- equality between the guarded and original canonical advertisement IDs;
- rejection of old-ID root, byte, timestamp, and ID tampering;
- rejection of readdressed duplicate or reordered roots;
- rejection of readdressed zero-byte availability;
- rejection of the guarded zero-byte builder path;
- rejection of readdressed status and gameplay-authority changes;
- rejection of wrong expected world, node, or checkpoint;
- rejection of stale and excessive future-dated records; and
- rejection of unknown advertisement fields.

Expected marker:

```text
VOID_REALMS_REPLICA_ADVERTISEMENT_INTEGRITY_GUARD_V1_PROOF_GREEN
```

## Evidence boundary

A `voidrra1_` identifier is an unkeyed content address. It proves exact record
bytes, not the identity, honesty, possession, capacity, uptime, or reachability
of the advertising node.

The freshness check proves only that the supplied timestamps satisfy the caller's
bounded deterministic policy. It does not establish that either timestamp came
from a trusted clock.

A production registry still requires separately reviewed node authentication,
signed advertisements, checkpoint-graph verification, object retrieval proofs,
capacity accounting, expiry and replacement rules, replay handling, and removal
of unreachable or dishonest providers.

## Authority boundary

This lane grants no gameplay, checkpoint-signing, handoff, region, world,
validator, wallet, payment, or Work Credit authority. It starts no listener,
contacts no peer, retrieves no object, assigns no node, signs no advertisement,
commits no gameplay state, deploys or restarts nothing, accesses no credential,
private key, wallet, or signer, writes no Work Credit, executes no payment,
constructs or broadcasts no transaction, and moves no funds.
