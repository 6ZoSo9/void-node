# Apollyon protected-store first-host evidence plan V1

Marker: `VOID_APOLLYON_PROTECTED_STORE_FIRST_HOST_EVIDENCE_PLAN_V1`.

Status: **source/test/CI plan only**. This generation does not contact Xiphos, read protected records, install code, mutate services, issue a writer capability, publish a claim, release the trainer, execute training, access credentials, sign, transact, or move funds.

## Purpose

This is the source-only successor to #3743 for the first host-evidence step required by #3557.

The parent V2 protected-store revalidator contract is fully source/CI-qualified at exact head
`3706aecf2e258c9c7021137da05428187bbe6654`. Its hosted Node 22/24/26 derivation and compare run `39963410577` produced the exact immutable candidate:

- candidate ID: `apollyon_training_start_protected_store_revalidator_v2:20fb5bedf6db2b606fb9adb025f95786417d58458d6bc06444b8f03c756f3444`;
- frame bytes: `9570`;
- frame SHA-256: `e178d7150e90d0538fed1d6721d731b9bffe66546b960877ac6aa4e5c7b98626`;
- Node 22 artifact: `12506463546`;
- Node 24 artifact: `12506363765`;
- Node 26 artifact: `12507375197`;
- compare job: `120455735301`.

This plan binds that exact candidate and the exact #3743 source/proof/document/workflow Git blobs. It does not convert hosted CI evidence into installed-host authority.

## First-pass boundary

The future operator step is intentionally narrower than the eventual protected-store revalidator.

It may establish only **metadata-safe read-only evidence** about the exact Xiphos installation and the fixed store path:

```text
host=Xiphos
claim_state_root=/var/lib/void-apollyon-attempt-claim-v2
consumption_directory=/var/lib/void-apollyon-attempt-claim-v2/training-start-consumption-v1
```

The hostname `Xiphos` is **not** sufficient host identity. Before any host pass is authorized, a separate authenticated evidence step must supply the expected SHA-256 of Xiphos's canonical `/etc/machine-id`; the operator pass must re-read and match that value. This source-only plan deliberately keeps `expected_machine_id_sha256=null`, `machine_identity_bound=false`, and status `UNBOUND_REQUIRES_SEPARATE_AUTHENTICATED_XIPHOS_MACHINE_ID_EVIDENCE`. A renamed/replacement machine must therefore HOLD rather than inherit Xiphos authority.

The first pass must use fixed paths and retained descriptors with no-follow/nonblocking/CLOEXEC semantics where applicable. It must verify stable retained-versus-visible inode generations, owner/group/mode/link/type policy, trusted ancestor metadata, access/default ACL absence, and mount/bind provenance metadata. Installed source/package/runtime/process identity may be observed only through bounded metadata-safe probes.

The first pass must HOLD on unreadable, ambiguous, unsupported, or changing evidence. Absence is evidence of absence only; it is not permission to create, repair, install, start, publish, or retry anything.

## Explicitly forbidden during the first pass

The future operator command must not:

- read protected claim/authorization/terminal/consumption record contents;
- enumerate protected record names;
- read process environment;
- read raw process arguments;
- access credentials, keys, wallets or signers;
- write, create, rename, unlink, chmod, chown, set ACLs or otherwise mutate the protected filesystem;
- install, enable, start, stop, restart or reload a service;
- create or transfer a writer directory capability;
- publish or repair a claim or one-time consumption record;
- release or start the trainer;
- contact RPC/provider/network mutation paths;
- sign or submit transactions;
- move funds.

Root privilege may be used later only when separately authorized and only if required to observe otherwise-hidden metadata. Privilege does not widen the allowed data surface.

## Exact parent source identity

The plan pins exact #3743 head `3706aecf2e258c9c7021137da05428187bbe6654` and:

- contract tool `4c78459826c25cab43870b0b322b566575d18667`;
- proof `2e919af52e44c6dcfec41dc47567a73f658874c3`;
- security document `9f5a94967abd85d81d6f693bf6ff51d086623de9`;
- workflow `2774c5f9c3d037cfbd32c15d4af05cb640199ae1`.

The content-addressed plan ID is:

`voidapollyonfirsthostplan1_be2b83c33630bce1e9bc635cbdd90981f55df38ab0e929706acd4cd7798015ca`.

The source proof validates the closed plan schema, re-hashes the plan ID, reads and Git-blob-verifies all four exact parent artifacts, flips every first-pass requirement and every forbidden authority field independently, and rejects candidate/host/parent identity tampering.

## What a successful source proof does not prove

Even a fully green plan means only that we have an auditable specification for a later first pass.

These remain false:

```text
host_pass_performed=false
machine_identity_bound=false
protected_store_origin_proven=false
current_store_generation_revalidation_performed=false
authorization_winner_reread_performed=false
durable_claim_record_reread_performed=false
consumption_slot_classification_performed=false
writer_directory_capability_origin_proven=false
writer_invocation_authorized=false
consumption_publication_authorized=false
trainer_release_authorized=false
training_execution_authorized=false
credential_access=false
signing=false
transaction=false
funds_movement=false
```

The first host pass itself remains a separate operator authorization gate. If it later succeeds, it still does not authorize the stronger record-content rereads, writer-capability handoff, publication, native releaser, training, signing, transaction, or economic gates.

Next gate:

`BIND_AUTHENTICATED_XIPHOS_MACHINE_ID_THEN_SEPARATE_AUTHORIZATION_THEN_READ_ONLY_METADATA_SAFE_XIPHOS_FIRST_PASS`

**PROTECT THE CORE.**
