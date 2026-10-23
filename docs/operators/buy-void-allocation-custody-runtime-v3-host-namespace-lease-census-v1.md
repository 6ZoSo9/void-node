# Buy VOID allocation-custody runtime V3 host namespace candidate census V1

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_V3_HOST_NAMESPACE_LEASE_CENSUS_V1`.

Status: **read-only Precision host-identity / namespace candidate observation only**.

This census observes two same-boot namespace `dev:ino` **candidates** for a
separate operator/reviewer ceremony. It cannot prove from its own namespace
view that those values are the host's initial namespaces, so it does not itself
produce the external leases required by the V3 process-reference census. It
does not install or replace anything and does not prove process-reference
absence.

## Bound designated-host policy

The collector consumes the existing reviewed Precision designated-host policy:

- path:
  `ops/precision/void_economic_sponsored_runtime_storage_designated_host_plan_v3.py`;
- exact Git blob:
  `4234379cb7e283e03c654e10d0d7fe8986e99897`.

That policy supplies the established Precision identity anchors reused here:

```text
hostname=zoso-Precision-Tower-7810
operator=zoso
operator_uid=1000
machine_id_sha256=11be124fb6d2d08003b89e467cef7e8b17d6dfb73592ccbe0984545ff1bcb0e2
```

The collector re-measures those live facts. It does not infer host identity
from hostname alone.

## Host identity read boundary

Production collection requires:

- real/effective UID exactly 1000;
- UID 1000 and account name `zoso` to map to each other through NSS;
- exact hostname;
- exact machine-ID SHA-256, using the same normalization as the bound
  designated-host policy.

`/etc/machine-id` must be a direct root-owned regular file, single link,
non-group/world-writable, and generation-stable across its retained-descriptor
read.

Root/sudo execution is not accepted because the designated operator identity
is part of this evidence.

## Namespace observation

The collector opens canonical `/proc` once with
`O_DIRECTORY|O_NOFOLLOW|O_NONBLOCK` and retains that descriptor through the
complete observation.

Through that exact procfs generation it requires:

```text
self/ns/pid == 1/ns/pid
self/ns/mnt == 1/ns/mnt
```

The resulting same-view identities are emitted in decimal `<st_dev>:<st_ino>`
form as:

```text
pid_namespace_candidate_dev_ino
mount_namespace_candidate_dev_ino
```

They are observations, not host-initial namespace authority. Successful output
always retains:

```text
host_initial_pid_namespace_verified=false
host_initial_mount_namespace_verified=false
namespace_values_candidate_only=true
```

The collector also:

- requires the retained `/proc` mount to be a `proc` filesystem;
- rejects restricted `hidepid` views;
- binds a SHA-256 of the current kernel boot ID;
- rechecks the retained procfs generation;
- rereads both PID and mount namespace identities;
- rereads `self/mountinfo` and requires the exact selected proc mount/options
  contract to remain unchanged;
- rereads the boot ID before success.

A namespace-local PID 1 that differs from the collector HOLDs. Equality with
namespace-local PID 1 is still **not** proof of the host's initial namespace;
that limitation is deliberately preserved as candidate-only output rather than
silently promoted to a host lease.

## Same-boot scope

The namespace identifiers are kernel-generation identities and are only
meaningful for the observed boot. The receipt includes
`boot_id_sha256` and `same_boot_binding_observed=true`.

The process-reference census still performs its own live equality and terminal
revalidation. This collector is an independent observed input, not a permanent
authorization token.

The collector receipt is **not automatically consumable**. A separate,
independently trusted operator/reviewer step must decide whether the observed
candidate values are the host's initial namespace identities before any later
consumer may treat them as external leases. Production output therefore states:

```text
namespace_values_candidate_only=true
host_initial_namespace_authority_proven=false
namespace_lease_external_review_completed=false
automatic_process_census_feed_authorized=false
process_census_consumption_authorized=false
```

A convenience launcher may collect the receipt and stop. It must not collect
these values and immediately feed them to the process census in the same
unreviewed execution.

## Invocation

After source/CI qualification, `-B` is mandatory. Omitting it HOLDs
before ordinary imports so a successful production receipt cannot silently
write Python bytecode caches:

```bash
python3 -I -B \
  ops/precision/void_buy_allocation_custody_runtime_v3_host_namespace_lease_census_v1.py \
  --collect
```

No sudo is required or authorized.

The command emits one canonical JSON line with a content-addressed
`namespace_candidate_id`. It does not create a receipt file itself; a later
safe launcher may capture stdout under `~/Downloads`, but must stop there
rather than auto-feeding the candidate into the process census.

## Authority boundary

```text
read_only=true
production_filesystem_write=false
root_execution=false
sudo_used=false
python_no_bytecode_mode_required=true
designated_host_identity_verified=true
pid1_pid_namespace_matches_self=true
pid1_mount_namespace_matches_self=true
host_initial_pid_namespace_verified=false
host_initial_mount_namespace_verified=false
namespace_values_candidate_only=true
proc_mount_contract_revalidated=true
retained_procfs_view_revalidated=true
same_boot_binding_observed=true
service_state_checked=false
service_mutation=false
systemd_mutation=false
process_environment_read=false
process_arguments_read=false
namespace_lease_is_install_authority=false
host_initial_namespace_authority_proven=false
namespace_lease_external_review_completed=false
automatic_process_census_feed_authorized=false
process_census_consumption_authorized=false
replacement_apply_authorized=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

After a separate trusted review, accepted candidate values may become inputs
to the V3 process-reference census. This source does not perform that
acceptance. A clean candidate receipt does not by itself satisfy service
quiescence, filesystem prestate, all-process absence, replacement safety,
installation, payment acceptance or presale activation.

**PROTECT THE CORE.**
