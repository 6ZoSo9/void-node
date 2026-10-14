# Apollyon training pre-entry binary candidate lock v1

Marker: `VOID_APOLLYON_TRAINING_PREENTRY_BINARY_CANDIDATE_LOCK_V1`

Status: **repository-evidence lock only; no binary installation or training authority**.

## Purpose

The predecessor candidate lane derives one reproducible ELF identity but
deliberately leaves `candidate_binary_identity_accepted=false`.

This lock accepts exactly one reviewed hosted candidate **identity** as
repository evidence. It does not commit the ELF bytes and does not claim that
those bytes are installed or executable on Xiphos.

## Reviewed predecessor

The lock is bound to exact predecessor head:

```text
e4a43df1e0a174e57d865ef0b6c98c009294062b
```

and exact candidate-validator Git blob:

```text
89a3260dde63534b3c3e2d04d4054eba430aae4c
```

The lock proof requires that predecessor head to be an ancestor of the
candidate-lock checkout and recomputes the validator Git blob. It then compiles
and executes those already-verified bytes directly in memory; it does not reopen
the validator pathname after verification.

## Locked candidate

The exact repaired three-run hosted report is embedded canonically in:

```text
fixtures/security/apollyon-training-preentry-binary-candidate-lock-v1.json
```

Locked evidence:

```text
candidate_id=
apollyon_training_preentry_binary_candidate_v1:128eb2363781cacbaf9603be185af613e444cef7a40b8894cd491aa6bf8f8a56

candidate_report_sha256=
de5ce76d334ce498f56fad011a7d9ec8e465b4487b5b61bbc7114a776cecb211

binary_sha256=
6e2885ceddf83bc9bf4636768ce6f046ab357268b0959cfa71bcbb766909cb47

binary_bytes=17352

source_git_blob_sha1=
9503d19c8bc0b4f073ba117f6a547d339b7623d0
```

The candidate report remains the predecessor's unaccepted report internally.
The lock is the separate reviewed transition that accepts its **identity** as
repository evidence.

## Lock identity

The lock ID is:

```text
apollyon_training_preentry_binary_candidate_lock_v1:f13fb7c9737defa61e8f883426e5c53dafbc8d5ec70616b86b2b09fdb790c622
```

It is SHA-256 over canonical lock material excluding only the `lock_id`
field itself.

The proof rejects:

- unknown or missing lock fields;
- predecessor-validator drift;
- predecessor-head ancestry failure;
- noncanonical fixture bytes;
- nested candidate-report invalidity;
- candidate-report digest drift;
- candidate/binary/source cross-binding drift;
- authority expansion such as `host_installation=true`;
- lock-ID mutation; and
- extra authority-bearing top-level claims.

## Authority boundary

A GREEN lock states:

```text
candidate_binary_identity_accepted=true
candidate_report_identity_accepted=true
repository_evidence_only=true
candidate_binary_bytes_committed=false

installed_preentry_binary_identity_proven=false
live_systemd_enforcement_proven=false
inherited_system_bus_descriptor_absence_proven=false
host_installation=false
service_action=false
attempt_claim=false
training_execution=false
wallet_access=false
transaction_signing=false
funds_movement=false
```

`candidate_binary_identity_accepted=true` means only that the exact 17,352-byte
ELF SHA-256 identity is accepted as reviewed repository evidence. It is not an
installation claim.

## Next gate

`apollyon_training_preentry_installed_binary_custody_v1`

That later gate must observe actual installed bytes and prove at-use identity,
root ownership, mode/link/ancestry custody, executable/interpreter/library
closure, and the reviewed systemd execution boundary before any live
`installed_preentry_binary_identity_proven=true` claim is allowed.

This PR performs no deployment, Xiphos mutation, service action, key access,
signing, transaction, attempt claim, training execution, activation, or funds
movement.
