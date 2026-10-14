# Buy VOID Nimo V5 live private-stage evidence v1

Marker: `VOID_NIMO_V5_LIVE_PRIVATE_STAGE_EVIDENCE_V1`.

Status: **read-only host evidence; no installation or runtime activation**.

## Purpose

#2914 qualifies a deterministic unprivileged private-stage implementation for the
exact Nimo V5 inactive bundle, but it deliberately does not claim that a stage
was observed on Nimo.

This successor closes only that host-truth gap.  A live `--collect` runs
locally on the already-known Nimo host, authenticates a reviewed subset of the
host identity, and invokes the exact reviewed #2914 stage inspector against the
invoking user's existing private stage.

It does not create, repair, replace, install, or activate stage/runtime bytes.

## Exact parent and stage generation

Stacked parent:

```text
#2914
8917c58aa39f936785cef825185630e54cf5fc68
```

Reviewed private-stage source:

```text
scripts/void_nimo_v5_private_stage_v1.py
Git blob 057da3cbf729100958d3707c5db356f80193e5ac
```

Exact staged candidate:

```text
candidate_manifest_id =
  voidwfb5_10391f1bf567fba6d9cab2099fb1db2b180333baa01ae868fe62367208984dcb

inactive_archive_sha256 =
  ede5706fa6ecaf50a3e22e893a7fc24d65ed1c640901c16e151239319296ab21

runtime_files_exact = 8
private_stage_name = void-nimo-v5-inactive-review-20261013
```

The collector reads the exact reviewed #2914 source through a no-follow
descriptor, verifies its Git blob, compiles those exact bytes in memory, and
calls only its reviewed `inspect_stage(home)` function.  It does not import a
mutable pathname after the identity check.

## Reviewed Nimo host identity

The live observation requires the already-reviewed successor identity:

```text
hostname = Nimo

machine_id_sha256 =
  48a3554126d621d6460385ebacf3d41b454157337271cb7405af012158f203d4

ssh_hostkey_algorithm = ssh-ed25519
ssh_hostkey_fingerprint =
  SHA256:3c9mfrwEQ9RKbVwL8pw/kvbCFt5imaj3QCK79yynkvk
```

The machine ID is read descriptor-bound from `/etc/machine-id`, validated as
exact 32-character lowercase hex, and SHA-256 hashed over the trimmed ASCII
value.

The host key is read descriptor-bound from
`/etc/ssh/ssh_host_ed25519_key.pub`, parsed as an OpenSSH Ed25519 public-key
blob, and independently fingerprinted.

Both paths require direct root-owned files with root-owned, non-group/world-
writable parent ancestry.

The collector also re-proves the reviewed root-disk identity using only the
fixed read-only probes already used by the V3 installation evidence:

```text
/usr/bin/findmnt -n -o SOURCE /
/usr/bin/lsblk -ndo PKNAME <root-source>
/usr/bin/lsblk -ndo SERIAL,WWN <root-parent>
```

The required stable identity is:

```text
root_disk_serial = 50026B76873B25AB
root_disk_wwn    = eui.00000000000000000026b76873b25ab5
root_disk_continuity_reverified=true
```

No shell, mount, block-device write, or storage mutation is permitted.

## Live collection

Live collection is local-only and unprivileged:

```bash
python3 -I -B scripts/void_nimo_v5_live_private_stage_evidence_v1.py --collect
```

It requires:

- Linux/POSIX;
- non-root execution and no setuid identity change;
- exact reviewed Nimo hostname, machine ID, root-disk serial/WWN, and Ed25519 host key;
- exact #2914 inspector source identity;
- the exact V5 private stage already present under the invoking user's home;
- all eight staged runtime files to pass the reviewed descriptor/inotify
  inspection.

A successful receipt may set:

```text
stage_host_authenticated=true
live_nimo_private_stage_verified=true
private_stage_bytes_verified=true
```

Those claims mean only that the exact reviewed V5 private stage was observed on
the reviewed Nimo host identity at collection time.

## Authority boundary

Even a GREEN live receipt keeps:

```text
root_disk_continuity_reverified=true
external_transport_authenticated=false
live_nimo_installed=false
installation_qualification_composed=false
root_installation_authorized=false
verified_payment_to_allocation_mounted=false
custody_reserve_or_recover_enabled=false
runtime_integration=false
payment_acceptance=false
wallet_or_signer_access=false
private_key_access=false
transaction_signing=false
transaction_broadcast=false
chain2050_write=false
public_presale_activation=false
funds_movement=false
```

The collector performs no SSH, network request, service action, root write,
authorized-keys change, config mutation, runtime installation, payment/customer
mutation, wallet/key/signing operation, Chain-2050/WC write, market/presale
activation, inventory/treasury/liquidity operation, or funds movement.

## Hosted proof

CI executes only syntax/source/self-test qualification:

```bash
python3 -m py_compile scripts/void_nimo_v5_private_stage_v1.py
python3 -m py_compile scripts/void_nimo_v5_live_private_stage_evidence_v1.py
python3 -I -B scripts/void_nimo_v5_live_private_stage_evidence_v1.py --self-test
```

CI must never execute `--collect`, because a GitHub runner is not Nimo and
must not manufacture live-host evidence.

## Next boundary

After a separately authorized live Nimo collection, the next gate is a reviewed
privileged installation/quiescence/rollback plan plus immediate post-install
evidence.  This source does not authorize that action.

PROTECT THE CORE.
