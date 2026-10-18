# Buy VOID presale source-freeze acceptance V2

Marker: `VOID_BUY_VOID_PRESALE_SOURCE_FREEZE_ACCEPTANCE_V2`.

Status: **source-identity acceptance only; not a host, payment, presale, market, signing, transaction, treasury, or funds authorization**.

## Purpose

Accept one fixed Buy VOID source snapshot for release review after the current-source
enforcement prerequisite has been independently cleared.

This gate stacks on the exact reviewed #3495 head and does **not** auto-adopt
moving `main`.

## Accepted fixed source

Freeze candidate:

`voidbuypresalefreeze2_32bd552dc92df07fd391ee3571f92e5efd80cbb50bd79bc4b8952484511db7f1`

Fixed source snapshot:

- commit `05614762b1b4638e05e539fd7d20cbf670e1570b`;
- tree `4ade3faff2c3fd8e73f7ab8bf3ce0685e0d0d30e`;
- candidate manifest blob
  `ca9c42e2d3ab4c50ac54badadb9efde6180ad241`;
- candidate review head
  `d3e7404791622541a4567ddd506f27caba60cfea`.

The acceptance preserves:

```text
exact_source_snapshot_fixed=true
auto_adopt_new_main_commits=false
later_main_changes_require_separate_review=true
```

## Current-source enforcement prerequisite

Accepted successor:

`voidbuypresaleenfsucc1_819fd2dbce9928145023d4077cffc34e2a9ab3a50e51428fc37dda6ca70a18ef`

Successor manifest blob:

`774db38ccb771f393b44d589a455144b99d36f6b`.

Exact hosted successor run:

`39107024613`.

Artifacts:

- Node 22: `12128524197`;
- Node 24: `12128298547`;
- Node 26: `12128707222`.

The reviewed successor proves:

- 49 protected paths;
- 0 protected-path blob/mode deltas;
- 28 reviewed economic source files;
- 0 reviewed-economic-source blob/mode deltas;
- accepted enforcement set
  `05d7648032223f74a05d89200ef23a76a5265ef2a3a26e52c7f51ce3b33bc852`;
- protected inventory
  `224e8c4b63b231e40b1abf4982127a6e2b999724642c4360c10ca21887bbc0a2`;
- byte-identical frozen candidate evidence across Node 22/24/26;
- byte-identical current-generation integration receipts across Node 22/24/26.

Therefore this exact freeze no longer requires a separate current-source
enforcement successor:

`current_source_enforcement_successor_required=false`.

The final reviewed successor head is
`d29a6663b9fb1f2a1a1c64d911c7f888c33b70e5`. Its proof is self-contained from reachable
frozen/current tree bytes plus committed inventories and explicitly reports
`historical_commit_objects_required=false`.

## Historical enforcement

Historical V2 remains immutable:

- candidate blob
  `4e23ecbb64eb26c14f5ab15af85eb86d59c3a718`;
- candidate JSON SHA-256
  `092a97373013d32dda610df7363587fa3a669f33248a37420b07541d12d892bb`;
- lock blob
  `589845615654da8b688764377b34296267ac0063`;
- lock JSON SHA-256
  `06af643df1a807a7d2c3582f6650967575d53874d5bf1277a0f1039bbad6ccd9`.

This acceptance does not rewrite that historical candidate or lock.

## Repaired Epoch-2 source binding

The fixed freeze also retains its reviewed repaired Epoch-2 bootstrap binding:

- lock blob `f2ce1364dd776bfbf1aa1ef59ce999cb46037b73`;
- lock ID
  `voidbuye2dormantbootstraplock3_4d87f4ce1f97883012a8695c86b85bee5b8b54ae2b6ade1dd761cc23ad5d9396`;
- candidate ID
  `voidbuye2dormantbootstrapcand3_1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2`;
- bootstrap SHA-256
  `618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c`.

That binding is source/candidate identity evidence only. Install/live/funds
authority remains false.

## Acceptance identity

Acceptance ID:

`voidbuypresalefreezeaccept2_427988497e4789465dde1c193668bb140d017c4e3ba3748567ea4e3bacfadb57`

The suffix is SHA-256 over canonical JSON of the acceptance body excluding
`acceptance_id`.

## Deliberate authority boundary

This gate changes only:

```text
source_freeze_accepted=true
current_source_enforcement_successor_required=false
```

It explicitly does **not** accept a customer payment rail and does not interpret
legacy freeze wording as a payment allowlist.

The acceptance proof content-addresses the repaired #3491 freeze proof,
architecture and workflow generations. Those reviewed sources bind native USDC
on Ethereum mainnet (1) and Base mainnet (8453), a 10,000,000 VOID pool at
2 VOID/USDC, coupled presale/WC-VOID opening, BTC/VOID post-presale, and
`legacy_btc_coupled_field_payment_asset_authority=false`. This is semantic
source evidence only; `payment_rail_policy_accepted` remains false here.

All remain false:

```text
payment_rail_policy_accepted=false
host_install_qualified=false
live_runtime_evidence_qualified=false
customer_payment_acceptance_authorized=false
public_presale_activation=false
wc_void_market_activation=false
wallet_or_signing_authority=false
transaction_submission_authorized=false
treasury_or_liquidity_action_authorized=false
funds_movement=false
production_host_evidence_authority=false
```

No customer payment instructions are created by this gate.

## Next gate

After exact-head GREEN and review, the next source/operational evidence gate is:

`void_buy_void_presale_source_freeze_host_install_qualification_v2`

That future gate remains distinct from public activation.

**PROTECT THE CORE.**
