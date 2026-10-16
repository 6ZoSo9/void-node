# Apollyon training-start release binding source contract v1

Marker: `VOID_APOLLYON_TRAINING_START_RELEASE_BINDING_V1`

Status: **pure source/test contract; no protected consumption-store observation, release channel, trainer release, or training execution exists here**.

## Purpose

Accepted #3333 defines one create-once training-start consumption slot and one trainer-specific consumption record. This successor freezes the exact generation identity that a later kernel-bound release mechanism must revalidate before that consumed attempt may cross the training-start boundary.

The release binding is deliberately **not bearer authority**. It is a deterministic content-addressed projection of one exact valid #3333 consumption record.

## Release policy

The stable release policy requires all of the following before any future release can become authoritative:

- a native blocked first-entry boundary before any model, trainer or candidate-weight instruction;
- a retained pidfd (or equivalently strong kernel generation handle);
- exact process start ticks and reviewed executable/source identity;
- a private inherited release channel that cannot be reconstructed from PID, pathname, filesystem flag or caller-supplied token;
- exact release framing;
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

A second blocked trainer for the same durable claim derives the same consumption slot but a different consumption record and therefore a different release binding. A release cannot transfer from the consumed trainer generation to the replacement generation. The binding validator closes both the top-level key set and the nested authority key set before canonical comparison; unknown/prototype-like authority fields fail closed.

## Deliberate non-authority

This contract validates only source-level shapes. It reports:

```text
protected_consumption_record_origin_proven=false
consumption_durability_revalidation_performed=false
live_trainer_generation_revalidation_performed=false
training_identity_policy_revalidation_performed=false
private_release_channel_origin_proven=false
trainer_release_performed=false
training_execution_authorized=false
training_execution_performed=false
candidate_weight_mutation_performed=false
automatic_retry_authorized=false
```

It performs no filesystem, network, service, socket, key, signing, wallet, transaction or funds action.

## Next gate

`apollyon_training_start_release_native_candidate_v1`

That later source gate must implement and self-test the kernel-generation and private-release-channel primitive before any installed/live host qualification can be considered.
