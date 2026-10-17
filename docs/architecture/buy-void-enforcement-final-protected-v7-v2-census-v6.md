# Buy VOID protected V7/V2 census v6 — current range generation

Marker: `VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CENSUS_V6`.

## Purpose

V5 accepted the first machine-readable range generation, but #3287 later
hardened the mounted/attach range parser and proofs without changing the
49-path protected enforcement inventory itself.

V6 is a versioned successor. It preserves the frozen V2 candidate/lock and the
accepted V5 census as historical evidence, then re-censuses the exact current
range generation.

## Exact protected delta

Relative to the frozen protected V2 inventory, the only protected-path changes
remain:

- `ops/run-void-node-live-v1.sh`:
  `6fb040de128ce0df16e848d61ea5f4acb62794da` ->
  `d7d7aede7fcd764a6182bd31f12338c5d3674ecb`;
- `src/index.ts`:
  `123ec1792a027f93d4c9030749a0e7e136a75a44` ->
  `7df1f21c730b554c414c88c550a4475234485370`.

Count remains 49 protected paths: 2 changed, 47 unchanged.

## Current source-generation evidence

V6 additionally requires the current #3287 range generation:

- `src/http/api_attach.ts` = `350088d64b797951aa30306d5c40752c9f901563`;
- `src/http/api_attach.js` = `810e9c099e3fa8c8bd9d995a507bf921227a19df`;
- attach proof = `814e858bf8c326f7ea61341a60dd53269e75f7f3`;
- index proof = `e478c71c564c4cf7349353a7936a9e8f56f97da1`;
- the reviewed canonical-producer/checkpoint generation remains exact.

The accepted V5 census proof is pinned at predecessor head
`d5ad8c401b67832919eeabd95f26bdae513e68fe`.

## Authority

Census/source evidence only. Candidate acceptance, deployed artifact authority,
runtime mount, payment, transaction, presale/WC activation, validator action,
treasury/liquidity and funds movement all remain false.
