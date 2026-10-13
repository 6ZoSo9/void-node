# Buy VOID Nimo V5 private-stage successor v1

Marker: `VOID_NIMO_V5_PRIVATE_STAGE_V1`.

Status: **source/CI-only private-stage utility; not installed on Nimo**.

## Purpose

This successor advances the exact current V5 inactive bundle from reproducible
archive evidence to a reviewed **unprivileged user-private staging** boundary.
It does not contact Nimo, write an installed/runtime path, mutate SSH or systemd,
or grant payment/presale/funds authority.

It is stacked on #2907 exact head
`1ddd4ff7eccddc8d1645fb7123052cf865160f2e`.

## Exact hosted V5 archive

The private-stage source is bound to the byte-identical Node 22/24/26 candidate
from workflow run `38482004834`:

- archive bytes: `266240`;
- archive SHA-256:
  `ede5706fa6ecaf50a3e22e893a7fc24d65ed1c640901c16e151239319296ab21`;
- candidate ID:
  `voidwfb5_10391f1bf567fba6d9cab2099fb1db2b180333baa01ae868fe62367208984dcb`;
- runtime files: exactly eight.

The stage parser independently requires the exact archive wire hash, canonical
V5 manifest/candidate identity, exact nine-member set, exact USTAR metadata, and
the eight hosted runtime byte-length/SHA-256 pairs. It does not infer or repin
V4 bytes.

## Staging boundary

`--stage` is permitted only for a non-root, non-setuid POSIX/Linux user. It
publishes one create-once directory under that user's home:

`void-nimo-v5-inactive-review-20261013`

The implementation:

- validates the archive through a retained `O_NOFOLLOW` descriptor;
- builds under a random mode-0700 private sibling directory;
- writes exact runtime leaves mode 0400 using descriptor-relative paths;
- retains directory/file descriptors during inspection;
- uses Linux inotify to HOLD on mutation during the inspection window;
- publishes the completed tree with `renameat2(RENAME_NOREPLACE)`;
- never replaces or repairs an existing canonical stage; and
- retains an unpublished random partial tree after an interrupted write rather
  than recursively deleting a potentially substituted same-UID pathname.

The source self-test covers create-once behavior, payload tamper rejection,
stage-root rebind rejection, interrupted-write containment, and safe retry.

## Hosted proof

The focused workflow rebuilds the exact V5 archive from reviewed source using
locked dependencies and direct TypeScript compilation, requires the hosted V5
archive identity above, then runs:

```bash
python3 -m py_compile scripts/void_nimo_v5_private_stage_v1.py
python3 -I -B scripts/void_nimo_v5_private_stage_v1.py --plan <archive>
python3 -I -B scripts/void_nimo_v5_private_stage_v1.py --self-test <archive>
```

The GitHub runner is unprivileged; self-test staging is restricted to disposable
temporary directories and does not touch Nimo.

## Authority boundary

A GREEN result may establish only that the exact V5 archive has a reviewed
private-stage implementation. It does **not** establish a live Nimo stage or
installation:

```text
private_stage_source_qualified=true
live_nimo_private_stage_performed=false
live_nimo_installed=false
authenticated_custody_principal_verified=false
verified_payment_to_allocation_mounted=false
custody_reserve_or_recover_enabled=false
production_gate_ready=false
presale_activation=false
funds_moved=false
```

The next boundary is a separately authorized Nimo quiescence/private-stage or
install ceremony with rollback and post-install evidence. No SSH, root/service
mutation, credential/key/wallet/signer access, customer/payment/allocation
mutation, transaction, Chain-2050/WC mutation, inventory/treasury/liquidity
operation, presale/market activation or funds movement is performed here.

PROTECT THE CORE.
