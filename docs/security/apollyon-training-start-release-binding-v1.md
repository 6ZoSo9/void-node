# Apollyon training-start release binding source contract v1

Marker: `VOID_APOLLYON_TRAINING_START_RELEASE_BINDING_V1`

Status: **pure source/test contract; no protected consumption-store observation, release channel, trainer release, or training execution exists here**.

## Purpose

Accepted #3333 exact head `c6531d81104c4c7c0f5571c0602400cd313bd9ec`
defines one authorization-wide create-once training-start consumption slot and
one claim/trainer-specific consumption record. This successor freezes the exact
generation identity that a later kernel-bound release mechanism must revalidate
before that consumed attempt may cross the training-start boundary.

The release binding is deliberately **not bearer authority**. It is a deterministic content-addressed projection of one exact valid #3333 consumption record.

## Release policy

The stable release policy requires all of the following before any future release can become authoritative:

- a native blocked first-entry boundary before any model, trainer or candidate-weight instruction;
- a retained pidfd (or equivalently strong kernel generation handle);
- exact process start ticks and reviewed executable/source identity;
- a private inherited release channel that cannot be reconstructed from PID, pathname, filesystem flag or caller-supplied token;
- an exact reviewed releaser process generation binding PID, start ticks, UID/GID/supplementary groups, source identity and a retained pidfd/equivalent generation handle;
- the releaser generation must remain live through authorized frame completion;
- the trainer must be the reviewed direct child (or later prove an equivalently strong kernel lineage), inherit the **read end only**, and hold no release write end;
- the release write end must be exclusively held by the reviewed releaser boundary; unrelated duplicate writer FDs must be absent/rejected;
- exact release framing: 64 raw bytes, consisting of the fixed 32-byte SHA-256 domain `c201c621cc904c2e9c0c2527322debc326736b7f5e2c731a1032d2f1d3cb2b16` followed by 32-byte SHA-256 of the exact UTF-8 `release_binding_id`; the receiver must read exactly 64 bytes and then observe EOF;
- those 64 bytes are not bearer authority: a correct frame from an unreviewed writer remains insufficient;
- EOF before authorization and releaser crash before authorization fail closed;
- the exact create-once consumption slot is already durable;
- consumption file fsync and parent-directory fsync completed;
- the final visible consumption record is reread and revalidated from protected storage;
- immediately before release, the same trainer generation plus UID/GID/supplementary groups, NoNewPrivileges and empty capability policy are revalidated;
- the trainer cannot write, rename or unlink the consumption store and cannot self-release;
- PID reuse, a second trainer generation, token replay and replacement-generation release are rejected;
- if the consumed trainer generation is lost, the attempt stays spent;
- automatic retry remains false.

## Exact release binding

The binding carries the exact #3333:

- trainer-independent consumption slot ID;
- trainer-specific consumption-record ID;
- store policy/contract/generation;
- terminal receipt;
- authorization and custody identities;
- custody-record hash;
- claim-record ID/hash;
- publish-request hash;
- trainer generation, boot ID, PID/start ticks, UID/GID and source identity;
- attempt_limit=1 and automatic_retry_authorized=false.

A second blocked trainer for the same durable claim derives the same consumption
slot but a different consumption record and therefore a different release
binding. Under repaired #3333, a different valid terminal/claim record for the
same authorization/custody authority also maps to that same protected start
slot; if one record occupies it, the alternate claim cannot obtain a second
training-start namespace. Release remains consumption-record/trainer-specific
and cannot transfer to a replacement generation.

The binding validator closes both the top-level key set and the nested authority
key set before canonical comparison; unknown/prototype-like authority fields
fail closed.

## Deliberate non-authority

This contract validates only source-level shapes. It reports:

```text
protected_consumption_record_origin_proven=false
consumption_durability_revalidation_performed=false
live_trainer_generation_revalidation_performed=false
training_identity_policy_revalidation_performed=false
private_release_channel_origin_proven=false
releaser_generation_revalidation_performed=false
trainer_releaser_lineage_proven=false
release_writer_exclusivity_proven=false
trainer_release_performed=false
training_execution_authorized=false
training_execution_performed=false
candidate_weight_mutation_performed=false
automatic_retry_authorized=false
```

It performs no filesystem, network, service, socket, key, signing, wallet, transaction or funds action.

## Next gate

`apollyon_training_start_release_native_candidate_v1`

This source gate additionally exposes a closed release-channel-origin **shape**
checker. It requires releaser generation, trainer-parent lineage, read-end-only
inheritance, exclusive writer ownership, no duplicate writer FDs and the exact
frame digest, but deliberately returns
`private_release_channel_origin_proven=false` and
`trainer_release_authorized=false`. Caller-supplied shape is not authenticated
host provenance.

The later native/integration gates must implement and self-test the
kernel-generation/private-channel primitive and then authenticate that evidence
on the designated host before any release authority can be considered.
