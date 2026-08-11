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
3. Generate the current map:

   ```bash
   node scripts/generate_void_index_cartography_v1.mjs --format markdown
   ```

4. Use the generated line as navigation evidence for the exact checked-out source.
5. Review dependencies and surrounding code normally. A landmark is a navigation aid, not
   a security boundary or proof that the entire subsystem is contained on one line.

The generator also emits the SHA-256 of the exact `src/index.ts` bytes it mapped. A line
number is meaningful only together with the exact source revision or digest that produced
it.

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

The generator performs no source mutation and writes no derived map by default. JSON or
Markdown is emitted to stdout, which keeps generated line churn out of Git history.

## Concurrency

Cartography should reduce collisions, not create another shared hot file.

- Do not renumber or reorder landmarks merely because lines moved.
- Add a registry entry only when a new durable navigation concept is introduced.
- Existing entries should change only when their stable anchor truly changes.
- `src/index.ts` remains governed by the root working agreement and any active
  coordination plan.
- A cartography change grants no runtime, wallet, signer, treasury, validator, Work Credit,
  transaction, deployment, or fund-movement authority.

## Current scope

V1 is intentionally a coarse map seeded with major runtime, chain, Buy VOID, Work Credit,
DataNet, public-node, participant, and integration landmarks. It is designed to grow
incrementally as the file grows.

`PROTECT THE CORE`.
