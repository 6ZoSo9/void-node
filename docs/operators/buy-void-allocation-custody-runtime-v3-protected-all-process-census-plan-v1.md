# Buy VOID allocation-custody runtime V3 protected all-process census plan V1

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_CENSUS_PLAN_V1`.

Status: **source-only protected-host planning; no host census and no replacement authority**.

## Purpose

The current V3 process-reference diagnostic is deliberately unprivileged and
current-UID scoped. Its exact qualified parent is:

```text
#3752 head: 5bfd56c850513c7b416fe0b2f854ee9b12e764e4
process source blob: ded737a228a627a241a84131113db6d3521f635c
```

That parent correctly keeps:

```text
all_process_reference_absence_proven=false
privileged_all_process_scan=false
fd_table_stability_proven=false
mapping_set_stability_proven=false
replacement_apply_authorized=false
```

This plan freezes the requirements for the later protected root-owned
all-process gate. It does **not** implement or run that gate.

The plan also binds the current qualified prerequisite sources:

```text
prestate head:
  836f5e704a603f67b77b2406aeec9174f640497e
prestate source blob:
  4d9c6e5809a5cc64454626760f71e60ed99354bc

service-quiescence head:
  b52752700e44dea447c0fda76c61bcf32228416e
service-quiescence source blob:
  90358ef1df3ecfa3daeee39452ffd025e9a8d86e

accepted archive-lock blob:
  edb4ea2b833373ab387762e45ba7da4032c860f3
```

## Source-only boundary

This plan must run only as an ordinary non-root source review:

```bash
python3 -I -B \
  ops/precision/void_buy_allocation_custody_runtime_v3_protected_all_process_census_plan_v1.py \
  --plan
```

The source plan refuses UID 0.

There is no `--run` or `--apply` mode.

In particular, this is forbidden:

```text
sudo python3 <mutable checkout source>
```

The future all-process implementation must first be separately reviewed and
installed as exact reviewed bytes beneath:

```text
/opt/void-buy-allocation-custody-process-reference-v3-reviewed-v1
```

The installed source root and ancestry must be direct, root-owned and not
group/world writable. The exact installed source bytes/digest must be
revalidated immediately before use.

This plan does not install that root.

## Future protected host scope

The future all-process gate must require all of these simultaneously:

- effective UID 0;
- an externally reviewed same-boot **host PID namespace** lease;
- an externally reviewed same-boot **host mount namespace** lease;
- an externally reviewed same-boot **host user namespace** lease;
- the census process and PID 1 bound to the leased host PID namespace;
- the census process and PID 1 bound to the leased host mount namespace;
- the census process and PID 1 bound to the leased host user namespace;
- direct canonical procfs;
- no restrictive `hidepid` profile;
- complete numeric PID visibility.

Numeric euid 0 by itself is not host-root authority.

The later implementation must fail closed if any namespace lease or procfs
visibility fact changes during the census.

The namespace-lease provenance must come from a separately reviewed
out-of-band/operator evidence step. The future census must not manufacture its
own authority merely by observing its current namespace.

## Future complete process scan

The future protected gate must census **all numeric PIDs**, not merely one UID.

For every still-live process generation it must require readable and stable
metadata sufficient to observe:

- process start generation;
- all UID/GID credential slots and supplementary groups;
- `cwd`, `root`, and `exe` dev/inode identity;
- all open FD dev/inode identities;
- mapped-file dev/inode identities.

The following remain forbidden:

```text
/proc/<pid>/cmdline
/proc/<pid>/environ
FD target pathname-text reads
retaining mapped pathname text
```

A still-live process whose required metadata is unreadable must HOLD.

A PID that disappears during one observation may not simply be ignored as
clean evidence. The full PID set must be sampled again and reconciled under the
same retained procfs and namespace generation.

## Race boundary

Before each all-process scan, the later gate must snapshot the complete target
metadata/inode generation. It must rescan that target afterward and require
exact snapshot equality.

It must also require:

- before/after PID-set stability;
- per-process start-generation stability;
- retained procfs identity stability;
- namespace-lease stability.

Even those checks do not freeze a live process FD table or mapping set.
Therefore:

```text
fd_table_stability_proven=false
mapping_set_stability_proven=false
live_at_use_reverification_required=true
```

must remain explicit.

A future clean all-process result is still only a candidate input to a later
replacement ceremony. It does not itself authorize rename or installation.

## Future candidate semantics

The protected implementation may eventually emit:

```text
all_process_target_reference_absent_candidate=true
```

only when every required host/process/target observation is complete and stable.

This plan itself always retains:

```text
all_process_reference_absence_proven_by_plan=false
replacement_precondition_satisfied_by_plan=false
replacement_apply_authorized=false
service_quiescence_proven_by_plan=false
installed_runtime_bytes_authenticated_by_plan=false
```

The later replacement gate must independently compose:

1. current filesystem prestate;
2. current service/socket quiescence;
3. protected all-process target-reference absence;
4. exact accepted archive identity;
5. protected installed Node/runtime closure;
6. explicit crash-safe rollback/recovery protocol.

No single prerequisite may imply the others.

## Authority boundary

This generation remains:

```text
source_plan_only=true
host_read_performed=false
host_process_census_performed=false
protected_source_installed=false
root_execution_performed=false
filesystem_write=false
permission_mutation=false
systemd_mutation=false
service_mutation=false
target_rename=false
existing_target_replaced=false
replacement_apply_authorized=false
runtime_integration=false
request_history_read=false
custody_data_read=false
credential_access=false
wallet_or_signer_access=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

**PROTECT THE CORE.**
