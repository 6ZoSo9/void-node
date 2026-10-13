# Apollyon operator authorization consumption v1

Marker: `VOID_APOLLYON_OPERATOR_AUTHORIZATION_CONSUMPTION_V1`

Status: **source-only durable consumption-evidence boundary**.

## Purpose

V79 records a verified V78 authorization in a private durable state store and
rejects duplicate use while that exact consumption slot remains intact.

A valid operator signature is not itself replay state. V79 therefore
re-verifies the complete V78 packet, re-checks current expiry, and publishes a
mode-`0600` consumption record before any later attempt-claim design may be
considered.

V79 does **not** claim the attempt and does **not** execute training.

## What V79 guarantees

For an intact admitted state namespace, V79:

1. verifies the exact V78 Ed25519 authorization packet against the separately
   pinned expected operator raw-public-key SHA-256;
2. validates a private mode-`0700` state root;
3. binds a create-once store-generation identity;
4. re-checks wall-clock validity immediately before publication;
5. writes and fsyncs a create-only mode-`0600` record;
6. publishes it through a no-overwrite hard-link slot; and
7. rejects a second consume while that slot exists.

The record and store-generation identity are evidence. They are not an
independently protected monotonic authority.

## Same-UID tamper limitation

The state root, generation file, `consumed/` directory, and consumption
records are owned by the invoking UID. On ordinary Unix filesystems, that same
UID can later unlink a record, rename/recreate `consumed/`, or delete and
recreate the whole state root.

Therefore V79 explicitly sets:

```text
same_uid_namespace_tamper_resistance_claimed=false
single_use_guaranteed_by_this_gate=false
global_replay_prevention_claimed=false
```

The proof deliberately demonstrates the limitation: after a successful
consume, unlinking the record or replacing `consumed/` allows the fixture
packet to be recorded again under the same store-generation identity. This is
not treated as a passing single-use property; it is an explicit boundary of
what this owner-UID filesystem layer can prove.

Deleting and recreating the whole root also creates a new store-generation
identity, so a same pathname is not silently represented as continuity.

## Why this gate still exists

V79 provides deterministic, private, create-only consumption evidence and
catches accidental/reentrant duplicate use in an intact canonical store. It
also gives the next layer exact fields to bind:

- authorization ID;
- operator fingerprint;
- request/corpus/parent-adapter identities;
- state-root pathname hash;
- store-generation identity; and
- consumption-record identity.

It does **not** provide the hostile same-UID replay terminal required for a
training attempt claim.

## Authority boundary

A GREEN V79 receipt means:

```text
authorization_consumption_recorded=true
authorization_single_use_guaranteed=false
attempt_claimed=false
training_execution_performed=false
candidate_weight_mutation_performed=false
generation_execution_performed=false
operator_private_key_access_performed=false
production_signing_performed=false
wallet_access_performed=false
transaction_signing_performed=false
transaction_broadcast_performed=false
funds_movement_performed=false
repository_merge_performed=false
runtime_service_mutation_performed=false
network_access_performed=false
```

The next required gate is **not** attempt claim. It is:

```text
independently_protected_authorization_consumption_authority_v1
```

That future boundary must place replay state outside the mutable authority of
the admitted training writer (for example, a dedicated separately privileged
service or another reviewed monotonic authority), and then bind the exact V79
evidence to it. Only after that protection is proven should an attempt-claim
gate be built.

## Proof

```bash
node --check tools/apollyon-operator-authorization-consumption-v1.mjs
node --check scripts/prove_apollyon_operator_authorization_consumption_v1.mjs
node scripts/prove_apollyon_operator_authorization_consumption_v1.mjs
```

The proof uses only an ephemeral Ed25519 fixture key and temporary directories.
It proves normal record creation, intact-slot duplicate rejection, expiry and
path protections, signature rejection, distinct root-generation identity, and
the declared same-UID unlink/directory-replacement limitation.

No production operator key, Xiphos runtime, trainer, network, wallet, or funds
surface is accessed by the proof.
