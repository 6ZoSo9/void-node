# Buy VOID allocation-custody V3 protected all-process reference census lock V2

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_REFERENCE_CENSUS_LOCK_V2`.

Status: **source/CI acceptance of one exact repaired protected-census source generation only**.

This is the versioned successor to historical Draft #3755, which was closed
unmerged after its parent census generation was found to miss non-leader task
state. V2 does not modify or rehabilitate that historical lock.

## Exact accepted source generation

Parent Draft #3753 exact head:

```text
cfae72e86e060ec797a86797d71f7be7aa019be8
```

Exact candidate source:

```text
path=ops/precision/void_buy_allocation_custody_runtime_v3_protected_all_process_reference_census_v1.py
git_blob_sha1=9738f14111fc03dffe9afb04f7bede73ceb13087
bytes=74322
ascii_only=true
```

Exact companion source evidence:

- proof blob:
  `127340dbc839718ae40e216b9edf0ba9fcaf4435`;
- operator document blob:
  `dacabdee63158c37f39d22489dc1cbf87752705d`;
- focused workflow blob:
  `661a110e2fe8694ebdf948ff6033890da03cb2a3`.

Hosted exact-head evidence:

- focused run: `40018911504`;
- proof job: `120638054198`;
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
- external host PID-namespace, mount-namespace **and user-namespace** lease requirements;
- retained procfs requires `self/ns/user == 1/ns/user == expected user lease`;
- private user-namespace divergence and explicit user-namespace lease mismatch are rejected;
- PID, mount and user namespace identities are terminally revalidated after the census;
- every live TID must remain in the verified host mount namespace before and
  after its reference observation;
- a pre-existing private task mount namespace prevents a clean candidate;
- a mid-observation task mount-namespace switch prevents a clean candidate.

These repairs close the known leader-only files/fs, private-task mount-namespace,
host-root, and host-user-namespace blind spots in the source candidate.

## Deliberate remaining limits

V2 accepts the **source identity and its bounded negative contract**, not an
all-process absence result.

The accepted source explicitly keeps:

```text
host_namespace_lease_provenance_authenticated_by_census=false
host_user_namespace_external_lease_required=true
host_user_namespace_terminal_revalidation_required=true
private_user_namespace_rejected=true
host_user_namespace_lease_mismatch_rejected=true
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
