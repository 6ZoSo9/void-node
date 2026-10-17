# Buy VOID presale source-freeze delta census V1

Marker:

`VOID_BUY_VOID_PRESALE_SOURCE_FREEZE_DELTA_CENSUS_V1`.

Status: **read-only source-delta evidence only; not a replacement freeze and not release authority**.

## Purpose

Frozen source candidate #3409 deliberately sets:

`auto_adopt_new_main_commits=false`.

This census preserves that rule. It answers only:

> How does one fixed canonical-main generation differ, byte-for-byte and mode-for-mode, from the frozen #3409 source snapshot?

It does **not** copy any newer file into the freeze, approve any changed path, or claim that latest main is a valid presale release source.

## Fixed endpoints

Frozen release snapshot:

- commit: `5e514e4b6e2151c18cf7459bd7a697287eebbd4c`;
- tree: `47a0c6eb9408b97226472d1297115633b0b3d799`;
- #3409 review head: `bfdff02472c57439721ebed0a94498c691c68a9c`;
- freeze manifest Git blob:
  `91d2d7877bc3066e3030337576ca2dddeb55bfc8`;
- freeze proof Git blob:
  `31fe4e06b390f19a0cbccc065a69f5f7afd410e0`.

Fixed main comparison endpoint:

- commit: `879cef181d8da2866d84eb56f5aa08c8564f8146`;
- tree: `52a311c69c9c7d274dbc3d909bc1eea2cbe38be4`.

A later main commit is not silently substituted for that endpoint.

## Full tree census

The proof uses `git ls-tree -r -z --full-tree` for both fixed trees and compares every blob SHA and executable mode.

Exact changed-path inventory:

- total paths: **188**;
- added on fixed main relative to the freeze: **120**;
- modified: **28**;
- deleted from fixed main relative to the freeze: **40**;
- canonical changed-row SHA-256:
  `2aa2a1c6e9a36ffe80af19e28410b56f0c1c0b97fb3dd648bbb0a3a0f2f70fec`.

This larger tree census is intentional. Git hosting compare UIs/APIs may truncate large diffs; they are not the release census authority.

## Category 1 — newer Epoch-2 bootstrap lifecycle

Exactly **43** changed rows match the versioned protected-bootstrap lifecycle:

`epoch2[-_].*protected[-_]install[-_]bootstrap`

Canonical category SHA-256:

`cc503b7ff67a26f4abcfc62e37664365e4d761facfb04a031ad986aef4d9ec8b`.

This category includes the V2 runtime-head bootstrap, canonical V3 lock, V2R materializer/install/qualification, and retained historical V1/V2 generations.

The census does **not** say those 43 paths should automatically replace the V1 freeze. They require an explicit versioned release-source composition decision.

## Category 2 — unrelated Apollyon/Xiphos main churn

Exactly **82** changed rows are under Apollyon/Xiphos source or CI paths.

Canonical category SHA-256:

`eb90b33fcd4973563bb758649387e74dd9163a2de33d68cf6bc1e5a0351a6a34`.

These are explicitly **not auto-adopted** into the presale release candidate merely because they are newer on canonical main.

## Category 3 — economic/integration release delta

The remaining exactly **63** rows are economic/integration/release-source differences.

Canonical category SHA-256:

`e2f16b7f22e475075566d4dbf910489c403a5b651481d3a4eb2b802f4030bc99`.

This is crucial: frozen #3409 is a two-parent composition, not simply an old main commit. Current main is **not** a byte-for-byte superset of its reviewed economic/integration tree. Some frozen release paths are modified or absent on current main.

Therefore a future source-freeze V2 must explicitly review and compose these 63 identities; “use latest main” is not an acceptable shortcut.

## Freeze preservation

The census re-reads the exact #3409 manifest/proof from the fixed review head and requires:

```text
exact_source_snapshot_fixed=true
auto_adopt_new_main_commits=false
later_main_changes_require_separate_review=true
```

It also requires all existing release authority fields to remain false.

## Authority

This is a census only.

Always false:

```text
current_main_auto_adopted=false
bootstrap_lifecycle_auto_adopted=false
apollyon_xiphos_auto_adopted=false
economic_integration_auto_forwarded=false
host_install_qualified=false
customer_payment_acceptance_authorized=false
public_presale_activation_authorized=false
wc_void_activation_authorized=false
wallet_or_signing_authority=false
transaction_submission_authorized=false
treasury_or_liquidity_action_authorized=false
funds_movement_authorized=false
production_host_evidence_authority=false
```

No Precision/Nimo/Xiphos host inspection, service mutation, credential/key access, signing, RPC/transaction, payment acceptance, presale/WC activation, treasury action or funds movement occurs.

The command surface includes an explicit negative `--apply` control. It always returns HOLD with `reason=apply_not_supported`; it cannot mutate source or hosts.

Next release-source step, if separately approved, is a **new versioned source-freeze composition review**, not modification of #3409.

**PROTECT THE CORE.**
