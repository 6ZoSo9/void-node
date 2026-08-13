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
- `chain.txroot-watchdog`
- `datanet.public-explorer`
- `public-node.route-index`
- `participant.dashboard`
- `integration.buy-void`

Do **not** cite a committed line number as the permanent identity of a subsystem. New code
may move it.

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

Both tools are read-only and perform no source mutation. Generated maps and bounded review
sections are emitted to stdout rather than committed, which keeps line-number churn out of
Git history.

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

V1 is intentionally a coarse map seeded with major runtime, chain, Buy VOID, Work Credit,
DataNet, public-node, participant, and integration landmarks. It is designed to grow
incrementally as the file grows.

`PROTECT THE CORE`.
