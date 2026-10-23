# Buy VOID allocation-custody runtime V3 replacement readiness plan V1

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_V3_REPLACEMENT_READINESS_PLAN_V1`.

Status: **source-only readiness classification; replacement remains unauthorized**.

Current repair generation restacks these four plan files on current #3752
`7736a3a5c53da37448c357a5d98e4dad09f3f617`, which already contains the
repaired prestate source. The classifier cannot promote contradictory receipt
claims into `diagnostic_inputs_complete=true`.

This successor composes the current V3 diagnostic generations without turning
their observations into replacement authority.

## Exact dependency generations

The classifier binds these source generations:

- repaired prestate census carried by current #3752:
  - head `7736a3a5c53da37448c357a5d98e4dad09f3f617`
  - Git blob `e32ebd94ad09cd80e03489079e74657aab159d7a`
  - symlink target text is not read, HOLD paths are redacted, and atime writes are reported as possible
- service-quiescence census:
  - head `b52752700e44dea447c0fda76c61bcf32228416e`
  - Git blob `90358ef1df3ecfa3daeee39452ffd025e9a8d86e`
- current-UID process-reference census:
  - head `7736a3a5c53da37448c357a5d98e4dad09f3f617`
  - Git blob `6bf476e3383b7b18966320df13b4041da9c8c11f`
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
archive lock. Every mutation, privacy-sensitive read, and economic-authority
boolean carried by the pinned generation is validated at its exact expected
value rather than ignored as caller-controlled decoration.

The repaired prestate receipt is intentionally **not** described as write-free:
it must report explicit filesystem writes false, filesystem-write-free false,
and atime-write-possible true. Archive extraction, permission mutation, service
mutation, process/env/argument reads, request/custody-data reads, credential or
wallet access, target selection/replacement, runtime integration, payment,
presale and funds authority must all remain false.

The quiescence receipt must remain systemd-show-only with daemon reload,
start/stop/restart, socket connect/unlink, filesystem/systemd mutation, private
data/credential reads, target selection/replacement and all economic authority
false.

The process receipt must retain its exact no-direct-PID1-namespace-read,
unauthenticated namespace-lease provenance, no process env/args/cmdline/environ
or FD-target-text access, no service/systemd mutation, no target selection or
replacement, and no runtime/payment/presale/funds authority. Any contradiction
HOLDs before diagnostic completeness is considered.

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
terminally revalidate that visibility/retained procfs view, and carry a stable
selected target snapshot plus the exact no-mutation/no-private-read/no-authority
contract from the pinned source.

The process generation duplicates four stability requirements inside the nested
`process` object as well as at top level. Both copies are independently
validated and must agree with the source contract:
`target_snapshot_stable_required=true`,
`fd_table_stability_proven=false`,
`mapping_set_stability_proven=false`, and
`live_at_use_reverification_required=true`. A self-consistent top-level
receipt cannot hide contradictory nested claims. Its
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
