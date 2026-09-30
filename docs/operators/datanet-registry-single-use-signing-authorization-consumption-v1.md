# DataNet registry single-use signing authorization consumption v1

Marker:
`VOID_DATANET_REGISTRY_SINGLE_USE_SIGNING_AUTHORIZATION_CONSUMPTION_V1`

Status: durable replay-prevention gate before any deployer signer access.

## Purpose

Consume one exact DataNet registry signing operation in a private Nimo-local
state store before any deployer credential may be opened for signing.

Consumption remains separate from signing. This gate may write one private
replay-prevention record and nothing else.

## Required authorization

The consumer rebuilds the exact
`VOID_DATANET_REGISTRY_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION_V1` from:

- the exact signing request;
- the full signing-request public/evidence lineage; and
- the authorization artifact.

The authorization must still bind one exact transaction-bound confirmation,
candidate, transaction fingerprint, one-signing maximum, broadcast false and
Chain-2050 write false.

Different authorization artifacts for the same exact signing request are not
different signing opportunities. The consumer derives one stable
`voiddrso1_<sha256>` signing-operation ID from:

- candidate ID;
- unsigned transaction hash; and
- transaction fingerprint SHA-256.

The request ID is retained in the record as lineage, but it is deliberately not
part of the replay-slot key: regenerating a fresh request artifact for the same
exact unsigned candidate must not create a second signing opportunity.

The durable consumed slot is keyed by that operation ID. A second authorization
ID for the same operation is rejected by the already-existing operation slot.

## Runtime expiry

Time is checked twice:

1. at consumer entry; and
2. again immediately before durable publication.

The final `consumed_at_utc` comes from the second clock reading.

Consumption fails closed when either check is before `authorized_at_utc` or at
or after `valid_until_utc`. An authorization that expires during filesystem
preparation may leave only the private `consumed/` directory preparation; it
cannot publish a consumption JSON record.

## Private canonical state store

The production Nimo runner is fixed to:

`~/.local/state/void/datanet-registry-signing-v1`

The state root must already exist and remain:

- an absolute canonical realpath;
- a direct directory, not a symlink or symlink-ancestor path;
- owned by the current operator user; and
- mode 0700.

The consumer does not create or relax the state root.

### External state-generation identity

Replay authority is not derived from the pathname alone.

The Nimo runner also requires this separately provisioned private file:

`~/.config/void/datanet-registry-signing-state-identity-v1.json`

It must be a canonical owner-only mode-0600 regular file. The closed identity
object binds:

- marker `VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_V1`;
- version 1;
- exact state-root realpath;
- exact filesystem device ID;
- exact filesystem inode ID; and
- content-addressed `voiddrssi1_<sha256>` state-store ID.

The state-store ID is computed over the marker/version/path/device/inode
material. The consumer requires the external identity to match the currently
opened state-root generation on every invocation.

This source lane does **not** create that external identity. Until a separately
reviewed provisioning step creates the exact Nimo identity file for the intended
state-root generation, production consumption fails closed.

Replacing the state root with a new directory at the same pathname therefore
does not create a fresh replay domain: its device/inode generation no longer
matches the external identity.

## Descriptor-relative publication

After identity verification, the consumer opens and pins the state-root
directory descriptor, creates or opens only its private mode-0700
`consumed/` directory, and publishes through
`/proc/self/fd/<fd>/...` descriptor-relative paths.

Immediately before publication it rechecks:

- the pinned root descriptor generation;
- the live canonical pathname generation; and
- the final authorization clock.

The record is mode 0600. Publication uses:

1. exclusive temporary-file creation;
2. file fsync and mode enforcement;
3. hard-link publication to
   `consumed/<signing_operation_id>.json`;
4. consumed-directory fsync; and
5. temporary-file removal.

If the operation path already exists, consumption is rejected. Existing record
bytes are never overwritten.

Replay prevention is deliberately scoped to the exact externally bound
state-store generation plus exact signing-operation identity. The source does
not claim global replay prevention against arbitrary operator-controlled storage
outside that trust boundary.

## Consumption record

The record binds:

- stable signing-operation ID;
- signing authorization ID actually consumed;
- signing request ID;
- candidate ID;
- final signing-review ID;
- transaction fingerprint and exact public transaction summary;
- exact transaction-bound confirmation;
- authorization and expiry times;
- final consumption time;
- external state-store ID;
- state-root device/inode generation; and
- SHA-256 of the canonical state-root realpath.

It records that publication was descriptor-relative, expiry was checked again
immediately before publication, and consumption happened before any signer
access.

## Authority boundary

This gate may mutate only the private replay-prevention state store.

It does **not**:

- inspect the deployer credential;
- access a private key;
- create or expose a signer or wallet;
- authorize signer access by itself;
- sign a transaction;
- export a signed transaction;
- submit or broadcast;
- deploy the registry;
- mutate Chain-2050 or validators;
- move tokens or funds;
- authorize migration/public activation; or
- retry automatically.

## Next gate

A green consumption record permits only:

`exact_nimo_registry_transaction_signing_from_consumed_authorization_v1`

The later signing gate must use the same external state-store identity and exact
operation slot, rebuild the same authorization/request/candidate lineage,
recheck expiry again before credential access, and sign at most once.

Broadcast remains a separate authorization after signing.
