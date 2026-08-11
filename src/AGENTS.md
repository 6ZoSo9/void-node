# `src/` working agreement

Marker: `VOID_SRC_INDEX_CARTOGRAPHY_WORKING_AGREEMENT_V1`

The repository-root `AGENTS.md` remains authoritative. This file adds one
maintainability rule for source under `src/` and does not weaken any root
coordination, safety, authority, proof, or deployment boundary.

## `src/index.ts` cartography

`src/index.ts` is intentionally mapped by stable capability landmarks rather
than manually maintained line numbers.

Before adding a **substantial new durable area** to `src/index.ts`:

1. Read `docs/INDEX_MAP.md` and `docs/index-map-v1.json`.
2. Reuse an existing landmark when the new code clearly belongs to an already
   mapped area.
3. Otherwise add one natural entry-point comment:

   ```ts
   // VOID-INDEX-LANDMARK: <stable.capability-id>
   ```

4. Add the same stable ID to `docs/index-map-v1.json`, using the full marker
   comment as its exact anchor.
5. Run:
   `node scripts/generate_void_index_cartography_v1.mjs --format markdown`
   and `node scripts/prove_void_index_cartography_v1.mjs`.

Do not add landmarks to every helper, routine repair, or small internal
function. Cartography is for durable reviewer navigation concepts.

Do not edit unrelated `src/index.ts` code merely to retrofit a marker while an
active lane owns that area. Existing historical sections may remain mapped by
their distinctive pre-existing anchors until a normal future edit provides a
safe place to add a managed marker.

Line numbers are generated evidence only. Never renumber the registry because
code moved above a landmark.

The cartography contract grants no runtime, service, credential, wallet,
signer, treasury, Work Credit, validator, transaction, deployment, or
fund-movement authority.
