# Apollyon training activation capability contract v1

Marker: VOID_APOLLYON_TRAINING_ACTIVATION_CAPABILITY_CONTRACT_V1

Status: source/test/CI contract only; no capability issuance, protected capability store, service activation, training-start consumption, release, or training execution exists here.

## Purpose

Accepted #3480 leaves the supported Apollyon generation with no reviewed training-service activator. That retirement is intentional: a userspace caller cannot prove it created a systemd generation merely because its own start request returned success.

A separate accepted Draft stack already defines the one-time training-start consumption authority:

- PR #3333 exact head: bdadfcc6854d6f4e1804347e51b940e897a8da9f
- exact consumption-contract source blob: 42d7d5d4ab75bfd4fc145f63c2a0432f9bcf9bd3

That contract owns the authorization-wide apollyon_training_start_slot_v1 namespace, the content-addressed blocked pre-training generation, create-once protected consumption, replay/collision/lost-ACK behavior, the exact apollyon_training_start_consumption_v1 record, and the release/no-retry boundary.

This gate does not define a second consumption namespace or consumption record.

Instead, it defines the capability that may eventually permit one blocked service generation to exist so that the already-reviewed #3333 consumption boundary can bind and consume that generation.

## Stack boundary

**Historical capability-source lineage anchor (frozen V1 field):**

#3480@d00ca0141db62d752be7ddc6e7d9618e0475d897

The unchanged V1 module's `APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1.parent_head`
retains this exact historical ancestor of the capability as its audit anchor.
The immutable historical #3525 generation `d6670d8dd6185d034c9b07ef3a29390add63ee21` contains
capability source blob `bcb47a4b105b89a459a4ea876b03f057450371c5`; the transport also retains that
exact historical `head + blob` pair. Neither hash is silently readdressed.

**Current source-review PR parent (separate Git ancestry assertion):**

#3480@c4997641b4ef8f06d2be9667d308a585839b6e4e

This new parent still contains the retired V2 qualifier, plus the repaired
create-only installer `87fa30d10d8d18716cd37ee2d375f0a1d094bdcf` and reviewed-root upgrader
`95b2f64562e995611807aac7f9b8b044775f203b`. Both the full historical source tree and this current
parent are verified in hosted CI. The candidate/transport schema does **not**
claim current parent authentication, protected issuance or service activation;
those remain future independent origin/host gates.

The #3333 source is not present in that parent lineage. This contract therefore records:

    training_start_consumption_contract_in_parent_lineage=false
    training_start_consumption_integration_required=true
    external_training_start_consumption_validation_performed=false

A later integration gate must bring the exact #3333 contract into the active stack or otherwise execute that exact reviewed source before any capability may be issued.

Hosted CI does not assume the unrelated commit object happened to arrive with the parent checkout. It explicitly fetches the advertised active #3333 branch
ren/apollyon-training-start-consumption-contract-v1-20261016, requires FETCH_HEAD to equal bdadfcc6854d6f4e1804347e51b940e897a8da9f, and then requires the consumption-contract path at that fetched head to equal blob 42d7d5d4ab75bfd4fc145f63c2a0432f9bcf9bd3. Branch deletion or force-push therefore fails closed instead of silently accepting another generation.

The current contract must not pretend that merely copying #3333 identifiers into a caller-supplied object proves their protected origin.

## Reviewed local dependencies

The capability contract pins the current retired-activation boundary:

- retired V2 qualifier blob: b57457435cc691ce576ef090e67ba323af254929
- retired fixed-launcher source blob: 352bd36f2b07091140b990de4170f708eb11fee6
- training unit blob: 62fbabe1cf7ae0d940f5d96e19b06282f841267b
- training pre-entry source blob: 9503d19c8bc0b4f073ba117f6a547d339b7623d0
- installed pre-entry SHA-256: 6e2885ceddf83bc9bf4636768ce6f046ab357268b0959cfa71bcbb766909cb47
- installed entrypoint bytes: 17384
- installed entrypoint SHA-256: 7a1ec91b612998824e37aa0f8522a94d7ceffe9f4f21e0702fe0a0d5ca5bdd9a

No unit or binary is changed by this gate.

## Capability candidate

A future protected issuer generates a fresh 32-byte secret. The raw secret is bearer-sensitive and must not appear in the content-addressed candidate.

The candidate carries only activation_secret_sha256 and binds:

- authorization ID
- exact authorization-slot ID
- exact authorization-slot-record ID
- the existing #3333 training-start-consumption slot ID
- custody generation
- durable claim record ID/hash
- store contract/policy/generation
- terminal receipt
- exact reviewed unit/pre-entry/entrypoint identities
- fixed future credential name apollyon-training-activation-v1
- exact #3333 source head/blob

The candidate requires:

    authorization_slot_external_validation_required=true
    training_start_consumption_slot_external_validation_required=true
    external_training_start_consumption_validation_performed=false
    protected_capability_store_required=true
    create_once_key_must_equal_training_start_consumption_slot_id=true
    activation_capability_issuance_performed=false
    direct_systemd_start_without_capability_authorized=false
    systemd_caller_identity_authoritative=false
    capability_replay_authorized=false
    raw_capability_export_authorized=false
    training_execution_authorized=false

The capability candidate ID is content-addressed as apollyon_training_activation_capability_v1:<64 lowercase hex>.

The future issuance store must use the already-reviewed #3333 training_start_consumption_slot_id as its create-once namespace key. Two different candidate secrets for one authorization-wide slot must collide at issuance rather than create two activation namespaces.

This source contract does not implement that store and therefore does not claim issuance occurred.

## Why this is not a second consumption ledger

The activation capability store has one narrow purpose: prevent multiple activation bearer secrets from being issued for the same existing #3333 authorization-wide start slot.

It does not replace #3333 protected training-start consumption.

After a blocked generation exists:

1. the exact #3333 contract must validate the authorization slot and authorization-slot record
2. the exact #3333 contract must derive/revalidate the same training_start_consumption_slot_id
3. protected #3333 consumption must bind the exact blocked trainer generation
4. create-once consumption/recovery/collision rules remain entirely #3333 authority

This gate exports no apollyon_training_activation_consumption_v1 identity and defines no alternate consumption-record schema.

## Candidate generation binding

The contract also defines a non-authoritative generation-binding candidate that carries the evidence a later implementation must prove:

- activation capability ID
- activation-secret SHA-256
- boot-ID SHA-256
- systemd InvocationID
- PID
- process start-time ticks, accepted only as a positive unsigned-64 decimal with at most 20 digits
- non-root training UID/GID
- source-identity SHA-256
- exact pre-entry SHA-256
- exact #3333 apollyon_pretraining_generation_v1 identifier
- exact #3333 training-start-consumption slot ID

Because this source-only module neither possesses the raw secret nor observes a live service generation, it requires:

    activation_generation_binding_required=true
    activation_generation_bound=false
    activation_secret_possession_proof_required=true
    activation_secret_possession_proven=false
    systemd_invocation_generation_observation_performed=false
    trainer_generation_external_contract_validation_required=true
    trainer_generation_external_contract_validation_performed=false
    training_start_consumption_record_required=true
    training_start_consumption_record_origin_proven=false
    training_start_consumption_performed=false
    training_start_admission=false
    training_release_authorized=false
    training_execution_authorized=false

The binding candidate ID is content-addressed as apollyon_training_activation_binding_v1:<64 lowercase hex>.

It is evidence-shape only, not activation or admission authority.

## Candidate transport: systemd credentials

Systemd per-service credentials remain a candidate future transport from protected root custody into the non-root service generation.

This gate deliberately records:

    systemd_credential_transport_selected_as_candidate=true
    systemd_credential_runtime_proven=false

No LoadCredential or related unit change is made here. No claim is made that the currently installed Xiphos systemd version, service unit, pre-entry, credential path, ownership, lifetime, or restart behavior satisfies this contract.

Those properties require separate source and live-host qualification.

## Direct/manual systemd starts

Systemd caller identity is deliberately non-authoritative.

A direct/manual start with no valid protected capability cannot satisfy the future activation contract. Being the first caller to reach PID 1 grants no authority.

A future service generation must instead prove raw-secret possession against the single protected capability issued for the existing #3333 slot, and that exact generation must then be bound into the existing #3333 pre-training generation and protected consumption flow.

## Next gates

The immediate next gate is apollyon_training_activation_capability_protected_issuance_v1.

That gate must integrate/revalidate the external #3333 authorization-slot and training-start-slot rules and implement create-once protected capability issuance. It still must not release or execute training.

Only after a blocked generation exists and #3333 protected consumption is proven can the already-reviewed release chain become relevant.

## Untrusted input envelope

Both capability and generation-binding APIs reject the shallow schema before
structured cloning. Unknown keys, nested/boxed values in primitive fields, and
oversized strings therefore fail before a caller can force duplication of an
arbitrarily large object graph.

Every identifier field is required to be a primitive string before any regular
expression is applied; JavaScript array or boxed-string coercion is not accepted.
Known strings are bounded to 256 characters, with process start ticks bounded to
20 decimal digits before clone and then range-checked as a positive uint64.

Known fields must also be enumerable own **data** properties. Accessor
descriptors are rejected without invoking their getter/setter. Unknown
non-enumerable properties and symbol keys are rejected by exact
`Reflect.ownKeys` comparison. The reflected own-key count must equal the fixed
schema cardinality immediately, before type scanning, copying, or sorting the
key list, so oversized top-level key sets cannot trigger attacker-controlled
sorting work. Proxy objects are rejected with Node's `util.types.isProxy` before
`Array.isArray`, `Object.getPrototypeOf`, own-key enumeration, or descriptor
inspection. Active and revoked object/array proxies therefore enter the exact
namespaced capability/binding rejection contract rather than leaking an
incidental `IsArray` TypeError, and caller-controlled reflection traps are never
invoked.
Preflight copies only already-validated primitive descriptor values into a fresh
plain snapshot; structured cloning, canonicalization and hashing operate on that
snapshot rather than re-reading the caller object.

## Hosted proof

Hosted proof must establish:

- current parent and local dependency blobs
- exact external #3333 head/blob identity
- deterministic candidate content addressing
- exact schemas and no unknown keys
- exact 32-byte secret hashing
- raw-secret absence from public candidates
- tampered candidate-ID rejection
- direct-start/caller identity/replay remain non-authoritative
- issuance and external #3333 validation remain unperformed
- the create-once issuance key is the existing #3333 start slot
- no second consumption namespace exists
- generation binding remains unproven without raw-secret/live evidence
- process start ticks are rejected before structured cloning when longer than 20 decimal digits and are range-checked as positive uint64
- unknown oversized object graphs are rejected before structured cloning
- regex-backed identifiers reject arrays and boxed strings rather than coercing them
- accessor descriptors are rejected without invoking their getters
- unknown non-enumerable properties and symbol keys are rejected rather than silently dropped
- active and revoked object/array Proxy inputs are rejected with the namespaced error before `Array.isArray` or reflective traps can execute
- oversized top-level own-key sets are rejected before key-list sorting
- clone/canonical/hash consume only the validated primitive descriptor snapshot
- #3333 trainer-generation validation remains external and unperformed
- training-start consumption/admission, release, and execution remain false
- production source contains no filesystem, network, child-process, systemctl, service-action, signing, wallet, transaction, or funds implementation

## Authority

This gate performs no Xiphos read/write, filesystem mutation, service/systemd action, activation capability issuance, protected capability-store write, #3333 protected training-start consumption, trainer release, training/model/candidate-weight execution, credential/private-key/signing/wallet action, transaction, or funds action.

PROTECT THE CORE.

## Activation secret: intrinsic byte-length acceptance (P1 repair)

`Buffer.isBuffer(secret)` paired with `secret.length === 32` was
insufficient: a genuine short Buffer can have an own `length` getter that
lies about its number of bytes. Reading that property can execute
caller-controlled code. The activation-secret hash now uses a captured native
TypedArray `byteLength` getter via captured `Reflect.apply` to validate
the internal byte count before checking genuine Buffer identity and hashing.
Proxied/revoked Buffer wrappers fail the native brand check before their
reflection traps are used; non-Buffer `Uint8Array` values are rejected.

The fixture rejects ordinary 0/1/31/33-byte buffers, forged own-length
getters on all four sizes, wrapped and revoked Proxies, and a 32-byte
non-Buffer typed array. A genuine 32-byte Buffer with a false own-length
getter hashes correctly **without invoking the getter**. These are source
and disposable fixture tests, not protected capability issuance, actual
credential delivery, Xiphos admission, signing, or training authority.
