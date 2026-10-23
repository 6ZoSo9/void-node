# Apollyon Xiphos machine-ID provenance HOLD V2

Marker: `VOID_APOLLYON_XIPHOS_MACHINE_ID_PROVENANCE_HOLD_V2`.

Status: **source/test/CI truth-preservation only**. No Xiphos host pass,
protected-store read, service/runtime mutation, writer/claim publication,
training, credential/signing, transaction, or funds authority.

## Why V2 exists

Historical V1 (#3763) correctly repaired the late #3760 provenance overclaim:
the observed normalized Xiphos `/etc/machine-id` digest is internally
consistent, but the repository does not contain an authenticated transport or
signed machine-identity attestation proving that the digest came from
authenticated Xiphos.

V1 is immutable historical evidence and pins the merged #3761 collector
generation. Draft #3767 repairs a separate late #3761 mount-observation defect
by binding the complete selected kernel `/proc/self/mountinfo` row. That
collector source therefore has new blobs.

V2 exists only to carry the same restrictive provenance truth across that
repaired collector generation. It does **not** reinterpret the observed digest
as authenticated evidence.

## Exact lineage

Parent: Draft #3767 exact head
`4f534e00370882b1fbcf03568ddf355275562f57`.

Historical V1 truth-HOLD:

- PR #3763 head:
  `129e294cc35f930a22b15efd313ed541bcbd8306`;
- merge commit:
  `819031d8e9f1dfe4863a0df06fd2420a00c1cad8`;
- plan blob:
  `e0c7aa5d26639caee4c293da1846544bb07ca903`;
- proof blob:
  `d848808585934e6609f0c84c09adcba18339a583`;
- document blob:
  `fb6fdba3e8cba4f471daa09cef3469de0c0dd24d`;
- workflow blob:
  `e526570137e1d50d41c1876feb79b07c665017a1`.

Repaired collector #3767:

- source:
  `36f77c85a2716989726af77679160de2b9e48f76`;
- proof:
  `67a73d6da5018944bc79e5ed07460f7e6512e57e`;
- document:
  `286a5b0528bdf1cd8cd6a1a3628222f6a3b5dbb9`;
- workflow:
  `dde72db084eed198c42a4183463eab593fa209ba`.

The original #3760 machine-binding artifacts remain pinned as historical input.
They are not accepted as authenticated host authority.

## Preserved observed evidence

The observed normalized machine-ID SHA-256 remains:

`543902c4c208d749dbe2baa239e9cd010ac50eb8cde4db8eb8cd26f6e806f057`

The raw machine ID remains absent from the repository.

The repaired collector additionally proves a source property:
`cover_row_sha256` binds the complete selected mountinfo row, including
mount options, optional propagation fields, filesystem type, mount source and
super-options, without emitting the raw row.

None of those facts authenticate the machine identity.

## Provenance truth

V2 requires exactly:

```text
normalized_machine_id_digest_observed=true
raw_machine_id_absent_from_repository=true
digest_internal_consistency_proven=true
collector_complete_mountinfo_cover_row_bound=true
historical_v1_provenance_hold_preserved=true
authenticated_transport_attestation_present=false
signed_machine_identity_attestation_present=false
authenticated_xiphos_machine_identity_proven=false
merged_binding_machine_identity_bound_claim_accepted_for_host_authority=false
collector_machine_identity_prerequisite_satisfied_for_host_execution=false
```

A digest is not a signature. A repaired collector is not host authentication.
A hostname match is not immutable machine provenance.

## Authority

All operational authority remains false:

```text
host_pass_authorized=false
protected_store_origin_proven=false
writer_invocation_authorized=false
claim_publication_authorized=false
consumption_publication_authorized=false
trainer_release_authorized=false
training_execution_authorized=false
credential_access_authorized=false
private_key_or_wallet_access_authorized=false
signing_authorized=false
transaction_authorized=false
funds_movement_authorized=false
```

This V2 HOLD must remain true even if the repaired collector becomes
source/CI-green.

## Proof boundary

The proof:

- uses duplicate-key and non-finite JSON rejection before content addressing;
- binds the exact four historical #3760 machine-binding blobs;
- binds the exact four repaired #3767 collector blobs;
- binds the exact four historical #3763 V1 HOLD blobs;
- validates content-addressed plan ID
  `voidapollyonxiphosprovenancehold2_1ee4af4279e852299e19e0aecd63c2cc636e5bb1c32fce7e204d996ca4214cb7`;
- executes 30 semantic adversaries across provenance, authority, lineage,
  blob maps, content identity, duplicate keys and non-finite constants; and
- performs no host read.

Plan blob: `b97c44976b33e21271b6525d4caeffc54c366c1e`.

Proof blob: `8ef3e9ff01fc7c84ab8ec3b37b5522c253b00e26`.

## Next gate

`PRODUCE_SEPARATE_AUTHENTICATED_XIPHOS_MACHINE_ID_ATTESTATION_THEN_REBIND_COLLECTOR_HOST_AUTHORITY`

That future attestation must authenticate the endpoint independently of the
machine-ID digest itself, for example through a separately reviewed pinned
transport/host identity plus challenge-bound measurement. Re-entering or
rehashing the same digest is insufficient.

Only after such evidence is reviewed may a later generation reconsider the
collector machine-identity prerequisite. The actual host pass remains a
separate explicit operator-authorization gate.

**PROTECT THE CORE. PROTECT THE TRUTH.**
