# Buy VOID allocation-custody runtime V3 host namespace lease census V1

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_V3_HOST_NAMESPACE_LEASE_CENSUS_V1`.

Status: **read-only Precision host-identity / namespace lease observation only**.

This census exists to produce the two same-boot namespace `dev:ino` leases
required by the V3 process-reference census. It does not install or replace
anything and does not itself prove process-reference absence.

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

The resulting identities are emitted in decimal `<st_dev>:<st_ino>` form as:

```text
pid_namespace_dev_ino
mount_namespace_dev_ino
```

The collector also:

- requires the retained `/proc` mount to be a `proc` filesystem;
- rejects restricted `hidepid` views;
- binds a SHA-256 of the current kernel boot ID;
- rechecks the retained procfs generation;
- rereads both PID and mount namespace identities;
- rereads the boot ID before success.

A private PID namespace or private mount namespace therefore HOLDs instead of
being published as a host lease.

## Same-boot scope

The namespace identifiers are kernel-generation identities and are only
meaningful for the observed boot. The receipt includes
`boot_id_sha256` and `same_boot_binding_observed=true`.

The process-reference census still performs its own live equality and terminal
revalidation. This collector is an independent observed input, not a permanent
authorization token.

The collector receipt is **not automatically consumable**. A separate review
step must inspect the exact same-boot receipt before its PID- and mount-namespace
values are supplied to the process-reference census. Production output therefore
states:

```text
namespace_lease_external_review_completed=false
automatic_process_census_feed_authorized=false
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
`namespace_lease_id`. It does not create a receipt file itself; a later safe
launcher may capture stdout under `~/Downloads`.

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
retained_procfs_view_revalidated=true
same_boot_binding_observed=true
service_state_checked=false
service_mutation=false
systemd_mutation=false
process_environment_read=false
process_arguments_read=false
namespace_lease_is_install_authority=false
namespace_lease_external_review_completed=false
automatic_process_census_feed_authorized=false
replacement_apply_authorized=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

The next consumer is the V3 process-reference census. A clean lease receipt
does not by itself satisfy service quiescence, filesystem prestate,
all-process absence, replacement safety, installation, payment acceptance or
presale activation.

**PROTECT THE CORE.**
