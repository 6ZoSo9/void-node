# Buy VOID allocation-custody V3 protected all-process reference census lock V2

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_REFERENCE_CENSUS_LOCK_V2`.

Status: **source/CI acceptance of one exact repaired protected-census source generation only**.

This is the versioned successor to historical Draft #3755, which was closed
unmerged after its parent census generation was found to miss non-leader task
state. V2 does not modify or rehabilitate that historical lock.

## Exact accepted source generation

Parent Draft #3753 exact head:

```text
3d7b8041f90b92d66d8de43cd0b28e98cbf194be
```

Exact candidate source:

```text
path=ops/precision/void_buy_allocation_custody_runtime_v3_protected_all_process_reference_census_v1.py
git_blob_sha1=25a0913606baa3303743f36a8c79f3c7a14ea159
bytes=70661
ascii_only=true
```

Exact companion source evidence:

- proof blob:
  `3f9e30ddd89f36b37f6d7f9754f95f7d190d4da3`;
- operator document blob:
  `6424b96d89a4109a42ed73b3dc8c88b78e9589d4`;
- focused workflow blob:
  `74dadcfb40b2eab81260dd58b9783085f3cba8fe`.

Hosted exact-head evidence:

- focused run: `40015277813`;
- proof job: `120625660577`;
- focused result: **SUCCESS**;
- exact-head Codex rereview: **no findings**.

The hosted proof executed both the source self-test and source-boundary proof
without installing the protected source or running a live root census.

## Repaired bounded semantics

The accepted source generation includes all of the following conservative
source controls:

- bounded generation-stable `/proc/<tgid>/task/<tid>` inventory;
- per-live-TID `fd`, `cwd`, and `root` reference observation;
- non-leader-only file-descriptor reference detection;
- zombie TGID leader with surviving workers rejected as incomplete;
- retained canonical procfs observation;
- retained/revalidated PID-1 host filesystem root for target traversal;
- external host PID-namespace and mount-namespace lease requirements;
- every live TID must remain in the verified host mount namespace before and
  after its reference observation;
- a pre-existing private task mount namespace prevents a clean candidate;
- a mid-observation task mount-namespace switch prevents a clean candidate.

These repairs close the known leader-only files/fs and private-task namespace
blind spots in the source candidate.

## Deliberate remaining limits

V2 accepts the **source identity and its bounded negative contract**, not an
all-process absence result.

The accepted source explicitly keeps:

```text
host_namespace_lease_provenance_authenticated_by_census=false
mount_namespace_reference_scan_performed=false
mount_namespace_reference_absence_proven=false
all_process_target_reference_absent_observed=false
all_process_reference_absence_proven=false
fd_table_stability_proven=false
mapping_set_stability_proven=false
process_reference_snapshot_race_free=false
live_at_use_reverification_required=true
```

In particular, requiring each live TID to remain in the verified host mount
namespace is **not** an exhaustive census of every mount object in that
namespace. V2 must not be interpreted as proving that no host-namespace bind
mount retains an older target generation.

Separately reviewed host namespace-lease provenance and live-at-use
revalidation therefore remain mandatory before any later replacement
composition could promote stronger evidence.

## Protected execution contract

A future protected source copy may exist only under:

```text
/opt/void-buy-allocation-custody-procref-v1/
  void_buy_allocation_custody_runtime_v3_protected_all_process_reference_census_v1.py
```

The source requires:

- root execution;
- root-owned, non-group/world-writable ancestry;
- isolated safe-path Python;
- disabled bytecode writes;
- exact fixed protected source location and stable source generation;
- rejection of privileged execution from the mutable checkout.

This lock does not install that source or authorize such execution.

## Hash boundary

V2 accepts the exact Git blob, byte count, ASCII constraint, companion source
blobs, and hosted exact-head evidence above.

It intentionally records:

```text
source_sha256_freshly_derived=false
source_sha256_diagnostic_only=true
```

The V2 proof independently computes and prints SHA-256 for diagnostic
continuity. That freshly computed value is not silently promoted into lock
authority.

## Acceptance boundary

Only this source-level fact advances:

```text
candidate_source_accepted=true
```

These remain false:

```text
protected_install_authorized=false
protected_source_installed=false
live_privileged_census_authorized=false
live_privileged_census_executed=false
service_mutation=false
systemd_mutation=false
install_target_selected=false
existing_target_replaced=false
replacement_apply_authorized=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
production_gate_ready=false
funds_movement=false
```

This lock is not a protected installation plan, installation authorization,
root-host census authorization, all-process absence proof, target replacement
plan, or economic activation.

The next source-only gate is a separately reviewed **create-only protected
source installation plan V2**. Host application remains a separate authority
gate after that plan is independently qualified.

**PROTECT THE CORE.**
