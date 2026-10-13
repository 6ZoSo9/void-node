# Apollyon authorization custody core v1

Marker: `VOID_APOLLYON_AUTHORIZATION_CUSTODY_CORE_V1`

Status: **source/proof-only custody core**.

## Purpose

V80 defines the first Apollyon replay-state implementation intended to live
outside the training writer UID.

The core takes an existing private state root and existing `consumed/`
directory, pins both directory descriptors, independently verifies the exact
V78 operator authorization, and publishes a create-only record for that
authorization inside the pinned custody generation. A duplicate is rejected
while that exact record remains present.

It contains no trainer, attempt-claim primitive, network client, wallet,
transaction signer, or production operator private-key loader.

## Intended deployment split

The target shape is:

```text
Xiphos training/runtime UID
  -> bounded AF_UNIX request
  -> dedicated Apollyon authorization-custody UID
       -> private replay root
       -> pinned consumed/ namespace
```

V80 is only the custody **core**. It does not install a service, create users or
groups, bind a socket, change ownership, or prove that the training UID cannot
write the custody root.

Those remain separate source/service and designated-host qualification gates.

## Pinned namespace

At construction, V80 requires:

- an absolute canonical direct state root;
- no symlink ancestors;
- current UID ownership;
- exact mode `0700`;
- a pre-existing direct `consumed/` child;
- current UID ownership of that child; and
- exact mode `0700` for that child.

The root is opened with a no-follow directory descriptor. The `consumed/`
directory is then opened through the retained root descriptor via
`/proc/self/fd/<rootfd>/consumed`.

The core retains both descriptors across operations.

Before and after authorization verification and before/after record
publication, the visible pathname identities are compared with the retained
descriptors. Root or `consumed/` rename/replacement therefore HOLDs the live
core rather than redirecting writes.

## Custody generation

The custody generation ID binds the retained root and consumed-directory:

- device;
- inode;
- UID; and
- GID.

The ID is content-addressed and returned with every custody result.

This identity is a process/source binding, not by itself a host-independence
proof. A later service/host gate must prove the training writer UID cannot
unlink, rename, chmod, or recreate these paths.

## Exact record

The record name comes only from the verified V78 authorization ID.

The record binds:

- custody generation ID;
- authorization ID;
- trusted operator raw-public-key SHA-256;
- target host and action;
- request SHA-256;
- canonical main/tree Git object IDs;
- corpus SHA-256; and
- parent-adapter SHA-256.

Policy remains:

```text
one_authorization_record_only=true
automatic_retry_authorized=false
attempt_claimed=false
training_execution_performed=false
```

### Custody-UID leaf limitation

The retained directory descriptors prevent pathname replacement from
redirecting the live core, but they do not make an individual file undeletable
by the UID that owns `consumed/`.

V80 therefore explicitly keeps:

```text
duplicate_rejected_while_record_present=true
custody_uid_leaf_unlink_resistance_claimed=false
single_use_guaranteed_by_core=false
```

The proof deliberately unlinks a successful record as the custody UID and
shows that the same signed packet can be recorded again under the same custody
generation. That is a declared source boundary, not a hidden replay claim.

Record creation uses `O_CREAT|O_EXCL|O_NOFOLLOW`, mode `0600`, file fsync,
and directory fsync. Existing records are never overwritten.

An exact duplicate returns `status=exists` and is re-read/validated from the
pinned directory before being reported.

## Authority boundary

Source proof keeps all of these false:

```text
host_cross_uid_qualification_performed=false
independent_custody_proven=false
production_gate_ready=false
operator_private_key_access=false
production_signing=false
attempt_claim=false
training_execution=false
candidate_weight_mutation=false
generation_execution=false
wallet_access=false
transaction_signing=false
transaction_broadcast=false
funds_movement=false
network_access=false
```

A GREEN source proof does not authorize installation or use on Xiphos.

## Next gates

1. AF_UNIX service/client wrapper around this fixed core.
2. Source-only host/service policy classifier.
3. Designated-host qualification proving a distinct custody UID/GID, protected
   state-root ancestry, socket-directory authority, and denial of direct writer
   access.
4. Only after independent custody is proven: candidate-training attempt claim.

## Proof

```bash
node --check tools/apollyon-authorization-custody-core-v1.mjs
node --check scripts/prove_apollyon_authorization_custody_core_v1.mjs
node scripts/prove_apollyon_authorization_custody_core_v1.mjs
```

The proof uses only an ephemeral Ed25519 fixture key and temporary directories.
It proves exact consume/duplicate/assert behavior, expiry rejection, root mode
enforcement, live root/consumed-directory replacement HOLDs, and the declared
custody-UID leaf-unlink limitation.
