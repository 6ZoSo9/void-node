# Buy VOID allocation-custody runtime V3 replacement readiness plan V1

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_V3_REPLACEMENT_READINESS_PLAN_V1`.

Status: **source-only readiness classification; replacement remains unauthorized**.

This successor composes the current V3 diagnostic generations without turning
their observations into replacement authority.

## Exact dependency generations

The classifier binds these source generations:

- prestate census:
  - head `836f5e704a603f67b77b2406aeec9174f640497e`
  - Git blob `4d9c6e5809a5cc64454626760f71e60ed99354bc`
- service-quiescence census:
  - head `b52752700e44dea447c0fda76c61bcf32228416e`
  - Git blob `90358ef1df3ecfa3daeee39452ffd025e9a8d86e`
- current-UID process-reference census:
  - head `2f58b776c4ba5b4c1b309d122122bd3355e2abc9`
  - Git blob `a5fa6ff22cc21df555e8a70c32500f07251dc4a8`
- accepted V3 archive lock:
  - Git blob `edb4ea2b833373ab387762e45ba7da4032c860f3`
  - SHA-256
    `ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7`.

The historical existing-target replacement V1 source remains bound only as a
sequencing reference. Its archive-V1 authority is not reused.

The existing Node-binary and Polkit V1 source profiles are also referenced as
future prerequisites. This plan does not claim either is live-qualified.

## What the classifier accepts

The input is exactly three receipts:

```text
prestate
quiescence
process
```

No caller approval or apply field is accepted.

Every receipt must match the current source schema/marker and the exact accepted
archive lock. All mutation/economic authority fields carried by those receipt
generations must remain false.

The prestate receipt may describe an absent or present legacy target. For an
existing-target replacement candidate, it must show:

- `target.state=PRESENT_SCANNED`;
- same-filesystem rename candidate;
- rollback-rename candidate;
- proposed stage name absent;
- proposed rollback name absent.

The service receipt may contribute only
`service_quiescence_candidate=true`. Its own generation explicitly keeps
`service_quiescence_proven=false` and
`live_process_binding_checked=false`.

The process receipt may contribute only the current-UID absence candidate. It
must carry reviewed external **PID- and mount-namespace** leases, require both
leases to match PID 1 and the retained procfs view, prove the fixed target was
resolved in that host mount namespace, retain unrestricted procfs visibility,
and carry a stable selected target snapshot plus exact no-authority fields. Its
own generation must still say:

```text
all_process_reference_absence_proven=false
privileged_all_process_scan=false
custody_principal_process_scan_performed=false
fd_table_stability_proven=false
mapping_set_stability_proven=false
replacement_apply_authorized=false
```

## Cross-receipt target binding

The existing target generation is composable only when the prestate receipt and
process receipt agree exactly on:

```text
st_dev
st_ino
mount_id
```

A mismatch reports
`CROSS_RECEIPT_TARGET_GENERATION_MISMATCH` and keeps diagnostic inputs
incomplete.

This does not prove the target stayed unchanged after the receipts were
collected. Live-at-use reverification remains mandatory.

## Diagnostic completeness is not replacement readiness

When all three diagnostic receipt candidates are internally valid and the same
target generation is bound, the classifier may report:

```text
diagnostic_inputs_complete=true
```

That means only that the current read-only diagnostics compose coherently.

Even then, the plan always retains these production blockers:

```text
PRIVILEGED_ALL_PROCESS_REFERENCE_ABSENCE_REQUIRED
SERVICE_QUIESCENCE_PROOF_REQUIRED_AT_USE
LIVE_NODE_BINARY_IDENTITY_VERIFICATION_REQUIRED
ACCEPTED_ARCHIVE_BYTES_AT_USE_VERIFICATION_REQUIRED
ROOT_OWNED_SAME_FILESYSTEM_STAGING_VERIFICATION_REQUIRED
ROLLBACK_CRASH_RECOVERY_PROTOCOL_ACCEPTANCE_REQUIRED
POLKIT_INSTALL_AND_LIVE_DENIAL_SEPARATE_GATE_REQUIRED
SERVICE_START_SEPARATE_GATE_REQUIRED
EXPLICIT_REPLACEMENT_APPLY_AUTHORIZATION_REQUIRED
```

Therefore these are always false:

```text
privileged_replacement_ready=false
replacement_apply_authorized=false
```

## Why the historical V1 plan is not reused

The older source
`tools/void-buy-allocation-custody-existing-target-replacement-plan-v1.mjs`
contains useful transition sequencing, but it is bound to archive-lock V1 and
older observations.

This generation references that source only as historical planning evidence.
No V1 archive identity, observation, or apply authority is promoted into V3.

## Authority boundary

```text
source_plan_only=true
receipt_inputs_untrusted=true
diagnostic_receipts_authenticated=false
observation_freshness_proven=false
service_quiescence_proven=false
all_process_reference_absence_proven=false
live_node_binary_identity_verified=false
accepted_archive_bytes_verified_at_use=false
root_owned_same_filesystem_staging_verified=false
rollback_protocol_accepted=false
replacement_authorized=false
replacement_apply_authorized=false
existing_target_replaced=false
service_mutation=false
systemd_mutation=false
filesystem_write=false
permission_mutation=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
production_gate_ready=false
funds_movement=false
```

This plan has no host execution mode and no apply path.

**PROTECT THE CORE.**
