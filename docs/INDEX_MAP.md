# `src/index.ts` Cartography

Marker: `VOID_INDEX_CARTOGRAPHY_V1`

`src/index.ts` is a very large historical runtime composition file. Reviewers should not
depend on manually maintained line numbers, because ordinary additions above a subsystem
move every later line.

This cartography layer gives important areas a **stable landmark ID**. The current line and
column are resolved from the source on demand.

## Review flow

1. Start with `docs/index-map-v1.json`.
2. Pick the stable landmark ID for the subsystem under review.
3. Prefer the bounded section viewer for ordinary review:

   ```bash
   node scripts/review_void_index_section_v1.mjs --landmark runtime.main
   ```

   The viewer resolves the exact registered landmark against the current source and emits
   only a bounded window. The default is 20 lines before and 40 lines after the landmark.
   Each side is capped at 120 lines, so one request can emit at most 241 source lines.
4. Adjust the bounded window when needed, without changing the source target:

   ```bash
   node scripts/review_void_index_section_v1.mjs \
     --landmark datanet.public-explorer \
     --before 40 \
     --after 80
   ```

   `--format json` is available for machine-readable review evidence. There is deliberately
   no `--source` or `--registry` override: the viewer reads only the canonical
   `docs/index-map-v1.json` registry and its required `src/index.ts` source target.
5. Generate the complete current landmark table only when broad navigation is useful:

   ```bash
   node scripts/generate_void_index_cartography_v1.mjs --format markdown
   ```

6. Review dependencies and surrounding code normally. A landmark is a navigation aid, not
   a security boundary or proof that the entire subsystem is contained in the emitted
   window.

Both tools emit the SHA-256 of the exact `src/index.ts` bytes they mapped. A line number is
meaningful only together with the exact source revision or digest that produced it.

## Stable IDs, disposable line numbers

The durable reference is an ID such as:

- `runtime.main`
- `runtime.ready-watchdog`
- `runtime.v2fs-status-route`
- `chain.txroot-watchdog`
- `datanet.public-explorer`
- `public-node.route-index`
- `participant.dashboard`
- `integration.buy-void`

Do **not** cite a committed line number as the permanent identity of a subsystem. New code
may move it.

## Coverage wave V2

The registry format remains V1 so existing consumers and repository-directory cross-links
stay compatible. `coverage_wave=2` means only that the reviewed landmark set has grown.
The original sixteen IDs remain stable and in their original order.

Wave V2 adds seven high-value canonical-producer landmarks whose source identity is already
bound by the merged self-HTTP and Mainnet-0 liveness proofs:

- `runtime.header3-match-exporter`
- `runtime.ready-watchdog`
- `runtime.proposer-activity-gauge`
- `runtime.proposer-metrics-v2`
- `runtime.v2fs-status-route`
- `runtime.autoprop-status-route`
- `runtime.v2fs-commit-route`

These entries are deliberately evidence-driven. The observer-family anchors are the exact
source-section identities consumed by `runtime/canonical-producer-self-http-guard-v1.cjs`.
The V2FS/autoprop route anchors are the exact runtime surfaces consumed by
`scripts/prove_mainnet0_canonical_producer_liveness_guard_v1.mjs`.

A new coverage proof checks those provenance links in addition to ordinary cartography
resolution. If one of the reviewed concepts disappears, duplicates, or stops matching its
provenance evidence, the focused cartography wall fails closed.

This wave does not attempt to label every helper in the monolith. Additional coverage should
be added in later bounded waves when an exact durable concept and source identity are known.

## Adding a new substantial area

For a substantial new area that remains in `src/index.ts`, prefer one explicit source
marker near its natural entry point:

```ts
// VOID-INDEX-LANDMARK: datanet.some-new-capability
```

Then add exactly one entry to `docs/index-map-v1.json` whose `anchor` is that full marker.
The stable ID belongs to the capability, not to its current line.

Routine helpers, tiny repairs, and every function inside a mapped area do not need their
own landmarks. The goal is useful cartography, not comment density.

Existing historical areas may use a distinctive already-present anchor instead of editing
the monolith solely to add a marker. That keeps cartography adoption disjoint from active
runtime lanes.

## Fail-closed rules

`generate_void_index_cartography_v1.mjs` rejects:

- malformed registry shape;
- duplicate landmark IDs;
- duplicate registry anchors;
- missing anchors;
- anchors that occur more or fewer times than declared;
- malformed managed `VOID-INDEX-LANDMARK` comments;
- managed source markers that are not registered; and
- a registered managed marker whose ID and anchor disagree.

`review_void_index_section_v1.mjs` additionally rejects:

- unknown or malformed landmark IDs;
- a registry whose source target is not exactly `src/index.ts`;
- per-side windows above 120 lines; and
- arbitrary source/registry path overrides.

`scripts/prove_void_index_cartography_coverage_v2.mjs` additionally rejects:

- a coverage-wave value other than `2`;
- any change to the original sixteen stable IDs or their order;
- a V2 landmark missing from the registry or current source;
- drift between observer-family landmarks and their canonical self-HTTP guard provenance;
- drift between V2FS/autoprop route landmarks and the Mainnet-0 liveness proof; and
- any V2 registry state that no longer resolves to exactly 23 current landmarks.

All cartography tooling is read-only and performs no source mutation. Generated maps and
bounded review sections are emitted to stdout rather than committed, which keeps
line-number churn out of Git history.

## Concurrency

Cartography should reduce collisions, not create another shared hot file.

- Do not renumber or reorder landmarks merely because lines moved.
- Add a registry entry only when a new durable navigation concept is introduced.
- Existing entries should change only when their stable anchor truly changes.
- `src/index.ts` remains governed by the root working agreement and any active
  coordination plan.
- A cartography or viewer change grants no runtime, wallet, signer, treasury, validator,
  Work Credit, transaction, deployment, or fund-movement authority.

## Current scope

The V1 registry now contains 23 stable landmarks after coverage wave V2. It remains a
selective directory for major runtime, chain, Buy VOID, Work Credit, DataNet, public-node,
participant, integration, and canonical-producer boundaries. It is designed to grow
incrementally when exact navigation concepts are proven useful.

`PROTECT THE CORE`.
