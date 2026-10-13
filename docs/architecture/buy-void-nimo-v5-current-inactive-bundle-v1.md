# Buy VOID Nimo V5 current inactive bundle v1

Marker: `VOID_NIMO_V5_CURRENT_INACTIVE_BUNDLE_V1`.

Status: **source/CI-only, unaccepted, not installed**.

## Purpose

V3 and V4 are now historical Nimo witness generations. The audited/current
Buy VOID source generation changes both the first-original allocation ledger
and the filesystem bakery lock relative to those predecessors.

This V5 candidate is the first bundle generation that derives **all eight**
runtime members from the current reviewed source/build generation instead of
silently carrying forward historical compiled checksums.

It does not contact Nimo and does not install runtime bytes.

## Exact source parent

The source contract is stacked on #2905 at:

```text
c5c656c3cbfe8195858998f56e278610d1878029
```

That parent already proves:

- frozen V3 refuses the current allocation-ledger generation;
- frozen V4 refuses the current bakery-lock generation; and
- a new current Nimo bundle successor is required.

V5 preserves those refusals. It does not modify V3 or V4.

## Reviewed source closure

V5 binds the exact current Git blobs for:

- forced-command runtime:
  `742cf489d8a785aa155a0e1bd12b65e94e07d1f1`;
- allocation-custody external witness:
  `5d24f3fb3e94611c653a0e3e1319afa7d0f4db72`;
- witness transport:
  `a5163272f08d6d96a9c2387fa6db344018e09694`;
- reservation high-water:
  `9383c94cf848efb9a0112f1b741df4e10f790ac6`;
- first-original allocation ledger:
  `8d84955e1e093a5c5af63241e62b8722fadd2f29`;
- auto fulfillment:
  `b7c963b1d55f000d82ad82289b31107b432503de`;
- crash-consistent saga server policy:
  `e284a38a4b7f3d498b07e77c661d6eef3b742e7a`;
- filesystem bakery lock:
  `9bd47abb857368d928c0ca289766cdf3571629ba`;
- audited `package.json`:
  `14fbdf5717b07fd4c734f5da7a8e84ed59bee93f`;
- audited `package-lock.json`:
  `15b5c82ea36f13079a2f9e8863722f654eb3f201`;
- build tsconfig:
  `d43e7f3fa03d20159f7b92aca4c8a56e738cd2fb`;
- V3/V4 current-generation classifier:
  `c908941795d6813aeafb5ec87ab8faa0de20b21e`;
- frozen V4 builder:
  `df15064519fcc9be75be8014c292ccc83eac6544`.

The workflow also requires the exact source parent above to be an ancestor of
the tested head.

## Eight runtime members

After the exact locked build, V5 derives these runtime bytes:

1. `tools/void-buy-allocation-custody-witness-forced-command-v2.mjs`
2. `dist/economic/buy_void_allocation_custody_external_witness_v1.js`
3. `dist/economic/buy_void_allocation_custody_witness_transport_v1.js`
4. `dist/economic/buy_void_allocation_reservation_high_water_v1.js`
5. `dist/economic/buy_void_allocation_reservation_ledger_v1.js`
6. `dist/economic/buy_void_auto_fulfillment_v1.js`
7. `dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js`
8. `dist/economic/buy_void_filesystem_bakery_lock_v1.js`

Every member is bounded, read through a no-follow descriptor, and recorded by
exact byte length and SHA-256. The current bakery runtime must differ from the
historical V4 bakery identity.

No current runtime checksum is guessed or copied from V4.

## Canonical inactive archive

The candidate archive contains exactly nine regular files:

- one canonical content-addressed manifest; and
- the eight exact runtime payloads above.

USTAR metadata is deterministic:

```text
uid=0
gid=0
mode=0444
mtime=0
uname=""
gname=""
```

The candidate ID is `voidwfb5_<sha256>`, derived from the complete canonical
manifest body. The manifest carries V4 predecessor identity but grants V4 no
current authority.

`--package` is create-once and only accepts
`void-nimo-v5-inactive.tar` in an existing invoking-user-owned private
directory. Publication is descriptor-relative through a retained parent fd,
with file and directory fsync. It never writes an installed/Nimo path.

`--inspect-archive` independently validates the exact member set, canonical
manifest, payload hashes, metadata, candidate ID, and complete canonical USTAR
wire bytes.

## Hosted qualification

The focused workflow runs on Node 22, 24, and 26.

Each major:

1. checks out the exact candidate head without push credentials;
2. requires the #2905 source parent ancestry;
3. installs the exact audited lock with lifecycle scripts disabled;
4. typechecks and builds;
5. reruns the #2905 V3/V4 historical-refusal classifier;
6. derives V5 plan/package/inspection receipts;
7. rejects a trailing-byte archive tamper; and
8. uploads the original inactive archive and receipts.

The aggregation job requires complete archive bytes and normalized receipts to
be byte-identical across all three Node majors.

Hosted GREEN means only that one current source generation has a reproducible
inactive V5 review bundle.

## Authority boundary

Even a GREEN V5 source qualification keeps:

```text
private_stage_qualified=false
live_nimo_installed=false
authenticated_custody_principal_verified=false
verified_payment_to_allocation_mounted=false
custody_reserve_or_recover_enabled=false
production_gate_ready=false
wallet_or_signer_used=false
transaction_signing=false
transaction_broadcast=false
presale_activation=false
funds_moved=false
```

The next gate is a separately reviewed **V5 private-stage successor**, then a
separately authorized Nimo quiescence/install/rollback ceremony and
authenticated post-install evidence.

No SSH, root install, service action, customer/payment/allocation mutation,
wallet/key/signer, transaction, Chain-2050/WC mutation, market/presale
activation, inventory/treasury/liquidity action or funds movement is performed
by this work.
