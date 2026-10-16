# Buy VOID final protected V7/V2 source census v5

Marker: `VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_SOURCE_CENSUS_V5`.

Status: **source/CI census only**.

## Purpose

PR #2872 intentionally advances two members of the already accepted 49-path
protected Buy VOID source inventory while leaving the economic execution
implementation itself unchanged:

- `src/index.ts` gains the machine-readable bounded `/blocks/range` error
  contract;
- `ops/run-void-node-live-v1.sh` advances the canonical-producer V5 selector
  needed by that new index generation.

The frozen V4 census and accepted V2 enforcement lock correctly refuse those
new protected identities. This successor does not repin either historical
artifact. It derives a new source census first.

## Exact transition

Accepted protected base:

`ccb1bd973a60875ecebf570905e6d8fc1c15ae3c`

Exact #2872 source head:

`6080389131c3cdb80fa9935b5ff80f4e40f09938`

The inventory definition remains the reviewed
`VOID_BUY_VOID_CURRENT_ENFORCEMENT_TRACKED_SOURCE_PATHS_V1` array from
`ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts`
Git blob `3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0`.

The census requires exactly 49 protected paths and proves exactly two changed
identities:

- `ops/run-void-node-live-v1.sh`:
  `6fb040de128ce0df16e848d61ea5f4acb62794da`
  -> `d7d7aede7fcd764a6182bd31f12338c5d3674ecb`, mode `100755`;
- `src/index.ts`:
  `123ec1792a027f93d4c9030749a0e7e136a75a44`
  -> `7df1f21c730b554c414c88c550a4475234485370`, mode `100644`.

The other 47 paths must retain exact Git blob and mode identity. The census
branch itself may add only non-protected evidence paths; every protected row at
the census head must equal the exact #2872 row.

## Historical lineage

The source census authenticates but does not modify:

- V4 census proof blob
  `f0e1334da67309c1aeb98a2fa19e5ff77424955f`;
- accepted V2 lock blob
  `589845615654da8b688764377b34296267ac0063`;
- V2 lock proof blob
  `9428c0adb10d624593c7882a9e483f33baa9f292`;
- predecessor protected-inventory digest
  `224e8c4b63b231e40b1abf4982127a6e2b999724642c4360c10ca21887bbc0a2`.

Those remain historical accepted evidence. This census creates no new accepted
enforcement set.

## Validation

Hosted Node 22/24/26 jobs derive complete canonical receipts from exact Git
trees. Cross-node comparison requires byte-identical receipt files.

The workflow trigger set covers every protected inventory path so a later
protected change schedules this census rather than silently bypassing it.

## Authority

Success keeps all of the following false:

- complete executable closure verified;
- candidate enforcement identity accepted;
- protected install authorized;
- deployment/runtime authority;
- payment acceptance;
- transaction authority;
- public presale activation;
- WC/VOID market activation;
- funds movement.

Next gate after accepted census evidence:
`void_buy_void_enforcement_final_protected_v7_v2_candidate_v3`.

PROTECT THE CORE.
