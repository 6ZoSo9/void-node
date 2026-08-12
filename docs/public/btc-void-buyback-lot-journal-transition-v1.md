# BTC/VOID Buyback-Lot Journal Transition V1

Marker: `VOID_BTC_VOID_BUYBACK_LOT_JOURNAL_TRANSITION_V1`

This source-only transition planner closes one Phase-0 invariant deferred by the
BTC/VOID market-maker reserve policy: one verified source sale can create at
most one accepted buyback-lot plan. It is narrowly scoped to the official
post-presale native BTC/native VOID pair.

The planner re-derives every candidate with the reserve-policy tool before it
examines the journal. A caller cannot keep a valid plan ID while changing the
budget, spread, chain identity, confirmation evidence, or any other plan field.
Journal entries are closed, content-addressed records. The planner also
re-derives each entry's `buyback_lot_id` from its `source_sale_id`, so a record
with a valid outer digest cannot fabricate a conflicting source-to-lot mapping.
Each entry carries the accepted reserve-policy source, allowing the planner to
re-derive its complete accepted plan and reject an arbitrary or corrupted
`buyback_lot_plan_id` even when the outer journal digest was recomputed.
Malformed, internally inconsistent, or duplicate entries fail closed.

Every decision also binds the exact ordered journal snapshot it evaluated. The
planner hashes the ordered sequence of validated `journal_entry_id` values into
`journal_snapshot_id_before` and deterministically derives the expected
`journal_snapshot_id_after`, then includes both snapshot identities in the
content-addressed decision. A `CREATE` decision's after-snapshot is the exact
ordered pre-state plus its emitted entry. `IDEMPOTENT` and `HOLD` decisions bind
an unchanged after-snapshot. Two different journals with the same entry count,
or the same entries in a different order, cannot share a decision ID. This is
the source prerequisite for a later durable store to compare the reviewed
pre-state and verify the committed post-state around one atomic append; this
tool still performs no persistence.

## Deterministic decisions

- `CREATE`: no entry exists for the candidate `buyback_lot_id`; the result
  includes exactly one content-addressed entry that a later authorized durable
  store may append.
- `IDEMPOTENT`: the journal already binds that lot ID to the exact same
  `buyback_lot_plan_id`; no second entry is emitted.
- `HOLD`: the lot ID is already bound to a different plan ID, including a plan
  derived from changed confirmation observation. The accepted record remains
  authoritative and no replacement or additive budget is emitted.

The journal also rejects duplicate lot IDs and any attempt to map one
`source_sale_id` to multiple lot IDs, including a content-addressed record whose
lot identity does not derive from its source-sale identity or whose plan ID does
not derive from its accepted reserve-policy source. This planner does not define
a competing settlement, pricing, or discovery protocol; it consumes the already
versioned reserve-policy plan.

## Safety and authority boundary

The tool does not persist a journal, lock a file, reserve inventory, mutate
reserve state, access a wallet or signer, call Bitcoin or Chain-2050 RPC,
construct or broadcast a transaction, seed liquidity, or move funds. Its
`append_entry` is only a deterministic source artifact for later review.

This is not live market capability. A separately reviewed durable compare-and-
append store, aggregate reserve snapshot, executable quote binding, Bitcoin
regtest and isolated Chain-2050 atomic-settlement proofs, activation controls,
funding authorization, and deployment evidence remain required.

The Buy VOID presale stays separate and unchanged. No presale receipt or
inventory is accepted by this contract. There is no USD, fiat, stablecoin,
wrapped-BTC, external-oracle, leverage, lending, margin, credit, treasury sweep,
or automatic refill path.

## Local proof

```sh
node scripts/prove_void_btc_void_buyback_lot_journal_transition_v1.mjs
```

The proof covers first creation, exact retry idempotence, same-lot conflicting
confirmation evidence, content tampering, internally inconsistent source/lot
bindings, fabricated content-addressed accepted plan IDs, duplicate journal
entries, unknown fields, canonical object ordering, exact ordered journal
snapshot binding, equal-length journal substitution, journal reordering, the
expected post-transition snapshot for create and non-create decisions, and the
negative authority flags.
