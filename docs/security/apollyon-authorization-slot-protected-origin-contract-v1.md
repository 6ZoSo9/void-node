# Apollyon authorization-slot protected-origin contract v1

Marker: `VOID_APOLLYON_AUTHORIZATION_SLOT_PROTECTED_ORIGIN_CONTRACT_V1`

Status: **source/test/CI boundary only; protected store observation is required but not implemented or proven by this gate**.

## Purpose

Accepted #3357 defines the unique authorization-wide slot and exact
authorization-slot-record shape, but intentionally does not prove that a valid
record supplied by a caller is the durable protected winner.

Accepted #3333 carries that limitation forward:

- protected authorization-slot origin is required;
- protected origin remains unproven;
- immediate slot reread/revalidation is required;
- a caller-supplied valid slot record is not bearer training authority.

The activation-capability lane must not weaken that boundary.

This contract freezes the evidence that a later protected reader must prove
before any activation capability may be issued.

## Exact parent

- #3357 exact head:
  `4e7d433a4141b4a7cad7fb001d0800dccb1b5ec2`
- authorization-slot source blob:
  `93582c324ca85aeff56eb61f82b32f1e4c18dfe9`
- canonicalizer blob:
  `f97fafb0148527ae3a954e2752faef8c7fc9e88e`
- transitive store-service candidate blob:
  `d67ef39c4cd034844fb0862e180de46ed4cd0c88`

The child reuses the exact #3357 slot validator. It defines no replacement slot
ID, record ID, store policy, or authorization namespace.

## Valid caller shape is still insufficient

The source can validate and content-bind the exact #3357 slot record:

- authorization ID;
- authorization-slot ID;
- authorization-slot-record ID;
- store policy / contract / generation;
- terminal receipt;
- durable claim record ID / SHA-256;
- publish-request SHA-256;
- exact attempt limit 1;
- automatic retry false.

That proves only the record's **shape and internal content address**.

It does not prove the bytes were reread from the protected claim root, that the
claim service is the only writer, that the store generation is current, or that
the exact claim/terminal/request evidence was revalidated immediately before
capability issuance.

Therefore:

`caller_supplied_slot_record_sufficient=false`

and the candidate always keeps:

`authorization_slot_protected_origin_proven=false`

`authorization_slot_revalidation_performed=false`

`activation_capability_issuance_authorized=false`

## Required future protected observation

A future implementation must prove all of the following under the protected
claim-store boundary:

- the authorization-slot store is in the same protected claim root;
- root and slot-file identities are descriptor-stable across the observation;
- the slot file is a direct regular file, mode 0600, link count 1;
- canonical slot bytes and their SHA-256 are stable across reread;
- only the reviewed claim-service writer can create the slot;
- publisher, training and custody identities cannot write/rename/unlink it;
- current store generation is revalidated;
- exact durable claim record is reread and semantically revalidated;
- exact terminal receipt and publish request are revalidated;
- the slot is reread again immediately before capability issuance.

No caller-provided boolean or copied slot ID may substitute for those
observations.

## Candidate

The contract emits a content-addressed candidate:

`apollyon_authorization_slot_protected_origin_v1:<64 lowercase hex>`

The candidate binds the exact #3357 winner identifiers and slot-record SHA-256,
plus the frozen future observation requirements.

The candidate is deliberately a requirement receipt, not proof that the
protected observation happened.

## Untrusted input boundary

Before the exact #3357 validator is called, the slot record is constrained to
the exact shallow #3357 key set with primitive data properties only:

- strings are bounded;
- integers must be safe integers;
- booleans must be primitive booleans;
- every own key is accounted for with `Reflect.ownKeys`; unknown enumerable,
  non-enumerable and symbol keys fail closed;
- reflected own-key cardinality must equal the fixed schema before key scanning,
  copying, or sorting;
- accessor descriptors fail without getter invocation;
- array / boxed-string regex coercion is rejected;
- Proxy inputs are rejected with Node `util.types.isProxy` before prototype,
  own-key, or descriptor reflection, so caller traps are never invoked.

The slot record, candidate, and nested requirements object use the same
descriptor-snapshot boundary before structured cloning.

This prevents the protected-origin prerequisite from reintroducing the
clone/coercion/time-of-check issues already closed in the activation-capability
lane.

## Hosted proof

Hosted proof must establish:

- exact parent source/proof dependency blobs;
- exact #3357 slot derivation and record validation;
- deterministic protected-origin contract ID;
- slot-record SHA-256 over exact canonical bytes plus LF;
- candidate tamper rejection;
- protected-origin / reread / issuance flags cannot be promoted;
- unknown large slot graphs fail before the parent validator clones;
- slot, candidate and requirements accessors are rejected without invocation;
- regex-coercible arrays are rejected;
- unknown non-enumerable properties and symbol keys are rejected;
- slot, candidate, and nested-requirements Proxy inputs are rejected before reflection with zero trap invocations;
- oversized top-level key sets are rejected before attacker-controlled key sorting;
- no filesystem, network, child-process, systemd or service implementation exists;
- claim publication, capability issuance, #3333 consumption, admission, release,
  training, keys, transactions and funds remain false.

## Next gate

`apollyon_authorization_slot_protected_origin_implementation_v1`

That future gate may implement a protected reader/reread boundary. It must not
grant activation capability issuance until the exact protected-origin evidence
is actually proven.

Only after that origin boundary exists may
`apollyon_training_activation_capability_protected_issuance_v1` safely create
one capability per existing #3333 authorization-wide start slot.

## Authority

Source/test/CI only.

No Xiphos filesystem read/write, protected-store mutation, service/systemd
action, durable claim publication, activation capability issuance, #3333
consumption, trainer release, training/model/weight mutation, credential/private
key/signing/wallet action, transaction or funds movement.

PROTECT THE CORE.
