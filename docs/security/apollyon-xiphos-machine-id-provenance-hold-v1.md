# Apollyon Xiphos machine-ID provenance HOLD V1

Marker: `VOID_APOLLYON_XIPHOS_MACHINE_ID_PROVENANCE_HOLD_V1`.

Status: **source/test/CI truth-repair only**. No Xiphos host pass, protected-store
read, service/runtime mutation, claim publication, writer invocation, training,
credential/signing, transaction, or funds authority.

## Why this successor exists

Merged stacked PR #3760 records the normalized Xiphos `/etc/machine-id`
SHA-256

`543902c4c208d749dbe2baa239e9cd010ac50eb8cde4db8eb8cd26f6e806f057`

and sets `machine_identity_bound=true`. The raw machine ID was not committed or
printed. The late exact-head P2 review correctly distinguishes two different
claims:

1. the repository can prove that the committed binding is internally
   self-consistent with that digest; and
2. the repository cannot prove, from the committed artifact alone, that the
   digest was obtained from an **authenticated Xiphos session** rather than
   mistyped or supplied from another machine.

A digest is not a signature or an authenticated-session attestation. Therefore
this successor does **not** rewrite the observed digest and does **not** rewrite
the merged history. It records the stronger operational truth:

```text
normalized_machine_id_digest_observed=true
raw_machine_id_absent_from_repository=true
digest_internal_consistency_proven=true
authenticated_transport_attestation_present=false
signed_machine_identity_attestation_present=false
authenticated_xiphos_machine_identity_proven=false
merged_binding_machine_identity_bound_claim_accepted_for_host_authority=false
collector_machine_identity_prerequisite_satisfied_for_host_execution=false
```

## Exact parent lineage

This successor is stacked on the exact #3761 collector head
`f8cf1eba57d8930452642699c21fa188c31cbd13`.

It pins all four #3760 binding artifacts and all four #3761 collector artifacts
by Git blob SHA-1. The proof re-reads those exact repository files through
stable no-follow descriptors and recomputes their Git blob IDs before returning
GREEN.

The source lineage being reconciled is:

- #3760 binding head:
  `fe751eb56e18ec134b96cb7a4d03738e86379c0d`;
- #3760 merge commit:
  `a3a42e50c92bec4b2f8dadb7a1c6cfeca928d730`;
- #3761 collector head:
  `f8cf1eba57d8930452642699c21fa188c31cbd13`;
- #3761 merge commit:
  `54ac07792178f403aa9bcaa293fc908b738851a3`.

## Closed proof boundary

The proof uses duplicate-key rejection and non-finite JSON rejection before
content addressing. It requires the exact content-addressed plan ID:

`voidapollyonxiphosprovenancehold1_98c9443ab88a6f7deb306af5369e00802ca84f132bff89f383eeadce47bc0716`.

Adversaries independently try to:

- invert every provenance fact;
- promote every authority field;
- alter the observed digest;
- alter the plan ID;
- use duplicate JSON keys; and
- use a non-finite JSON constant.

All must fail at their intended semantic gate. The proof also validates the
exact eight inherited parent blobs. No host filesystem is contacted.

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

The merged #3761 collector remains useful as reviewed **source**, but this
successor blocks using its machine-ID prerequisite as host authority until a
separate authenticated provenance artifact exists.

## Next gate

`PRODUCE_SEPARATE_AUTHENTICATED_XIPHOS_MACHINE_ID_ATTESTATION_THEN_REBIND_COLLECTOR_HOST_AUTHORITY`

That future evidence must authenticate the machine identity independently of
the digest value itself. Acceptable designs may bind a separately pinned host
identity/transport plus a challenge-bound measurement or another reviewed
attestation mechanism. Merely re-entering the same digest is not sufficient.

**PROTECT THE CORE. PROTECT THE TRUTH.**
