# Apollyon operator authorization consumption v1

Marker: `VOID_APOLLYON_OPERATOR_AUTHORIZATION_CONSUMPTION_V1`

Status: **source-only durable consume-first boundary**.

## Purpose

V79 adds the replay state transition deliberately left absent by V78.

A valid operator signature is not sufficient to make an authorization
single-use. V79 re-verifies the complete V78 packet, re-checks current expiry,
and durably publishes one immutable consumption record before any later
candidate-training attempt may be claimed.

V79 does **not** claim the attempt and does **not** execute training.

## Safe ordering

The required ordering is:

1. verify the exact V78 Ed25519 authorization packet against the separately
   pinned expected operator raw-public-key SHA-256;
2. validate the private consumption state root;
3. re-check wall-clock validity immediately before publication;
4. atomically publish one immutable consumption record; and
5. only a later gate may claim the exact training attempt.

A crash after step 4 burns the authorization. It does not restore or reuse it.
That is fail-closed behavior.

## Private state store

The caller supplies an existing absolute state root. V79 requires:

- direct directory, not a symlink;
- no symlink ancestors;
- current UID ownership where supported;
- exact mode `0700`; and
- canonical realpath equality.

V79 creates a private create-once store-generation identity file when the
state root is first admitted, then creates the `consumed/` child when absent.
The identity file and consumption records are mode `0600`; `consumed/` is
mode `0700`. Every receipt binds the store-generation ID as well as the
state-root realpath.

## Atomic consumption

The record is first written into a mode-`0600` exclusive-create temporary
file, fsynced, then atomically hard-linked to the final authorization slot.
The consumed directory is fsynced after publication.

If that authorization slot already exists, V79 HOLDs. The existing record is
never overwritten, truncated, deleted, or released.

## Replay scope

Replay prevention is intentionally scoped to one exact durable state-store
**generation**, not pathname text alone. The receipt binds both the realpath and
a private create-once store-generation ID. If the same pathname is deleted and
recreated, it receives a different generation ID and cannot masquerade as the
same replay domain.

V79 does **not** claim global replay protection across independently selected
or replaced store generations. Production composition must bind exactly one
canonical Apollyon authorization-consumption store generation and preserve that
identity across restart/recovery before this gate is used live.

## Authority boundary

A GREEN V79 receipt means only:

```text
authorization_consumed=true
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

The next gate is:

```text
candidate_training_attempt_claim_from_consumed_authorization_v1
```

That later gate must require the exact immutable V79 record, the exact canonical
state-store fingerprint, the exact request/corpus/parent-adapter bindings, and
must provide its own crash/recovery semantics before any trainer can execute.

## Proof

```bash
node --check tools/apollyon-operator-authorization-consumption-v1.mjs
node --check scripts/prove_apollyon_operator_authorization_consumption_v1.mjs
node scripts/prove_apollyon_operator_authorization_consumption_v1.mjs
```

The proof uses only an ephemeral Ed25519 fixture key and temporary
owner-private directories. It proves successful consumption, immutable replay
rejection within one store generation, expiry rejection, private-root
enforcement, symlink rejection, signature corruption rejection, distinct
generation identity after same-path replacement, and the intentionally local
replay scope.

No production operator key or Xiphos runtime is accessed by the proof.
