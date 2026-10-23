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
`92eea4f9b13e8b40df8a859d6ebea77e3e25c6a0`.

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
  `160ad246b36eb2ee6680acc411686ff43a25bef9`;
- proof:
  `c0e05dacfb557956f6d2fa79522ccf18cb1f6d1f`;
- document:
  `a9a751c9c76653f3d3f4c82a4bd32ce3047a176d`;
- workflow:
  `4ddf75e7a3da7186e9865fe58e08ddfc0e03f469`.

The original #3760 machine-binding artifacts remain pinned as historical input.
They are not accepted as authenticated host authority.

## Preserved observed evidence

The observed normalized machine-ID SHA-256 remains:

`543902c4c208d749dbe2baa239e9cd010ac50eb8cde4db8eb8cd26f6e806f057`

The raw machine ID remains absent from the repository.

The repaired collector additionally proves source properties:
- `cover_row_sha256` binds the complete selected mountinfo row, including
  mount options, optional propagation fields, filesystem type, mount source and
  super-options, without emitting the raw row; and
- its public host-pass entrypoint hard-HOLDs before hostname, machine-ID, path,
  mountinfo, systemd or process observation while authenticated Xiphos
  provenance and host-pass authority remain unbound.

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
  `voidapollyonxiphosprovenancehold2_df2f6157c36752460ca187c7f77da175bc9e0237e2c35baeacaae571f43fc890`;
- executes 30 semantic adversaries across provenance, authority, lineage,
  blob maps, content identity, duplicate keys and non-finite constants; and
- performs no host read.

Plan blob: `bd75e2606cb13beb3ba1c6f80f596e2729709c37`.

Proof blob: `5a105aa167488e864b93c4490ddb58e99e70b784`.

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
