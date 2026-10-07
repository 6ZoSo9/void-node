# Buy VOID allocation custody witness live-read replay external anchor v1

## Scope

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_V1`
defines a pure append-only state machine for an **external replay anchor**.

Its purpose is to give the local replay writer a second control outside the
Precision host. The intended deployment is Nimo: after every local replay
transition, the exact local replay sequence and high-water digest are anchored
into an append-only remote chain.

This source contract performs no filesystem I/O, SSH, credential access,
witness mutation, replay mutation, payment action, wallet/signing action,
transaction, Chain-2050 write, activation, inventory action, treasury action,
or funds movement.

It is not yet the Nimo writer or transport integration.

## Why this exists

The merged replay writer and installation evidence already prove:

- crash-consistent local replay persistence;
- a canonical local replay high-water;
- two distinct local physical parent disks; and
- detection when only one local replay root is rolled back.

Those facts still cannot detect a **coordinated rollback of both Precision
roots** to an older coherent pair.

An external anchor closes that architectural gap:

```text
Precision replay journal + high-water
              |
              | every local transition
              v
       Nimo append-only anchor
```

If both local roots are later reverted to an older sequence, Nimo remains ahead
and the rewind is externally visible.

## Projection

Each anchor event stores one exact replay projection:

- source hostname;
- replay sequence;
- replay generation;
- replay event count;
- replay tip-event SHA-256;
- replay high-water SHA-256;
- replay journal SHA-256;
- pending state;
- pending challenge SHA-256 / challenge ID / expiry;
- last terminal state; and
- `ready_for_issue`.

The source contract validates internal projection shape and transition
semantics, but **does not yet prove that a caller-supplied projection was
derived from the canonical replay high-water**.

Accordingly:

```text
canonical_replay_projection_binding_proven=false
```

A later composition layer must build the projection directly from the canonical
high-water contract.

## Anchor event chain

Each event additionally contains:

- exact marker/version;
- contiguous anchor sequence;
- exact previous anchor event SHA-256; and
- content-addressed `event_sha256`.

The journal is canonical JSONL with a final newline.

The first event is an explicit replay-sequence-zero genesis anchor. An empty
anchor journal is uninitialized, not an implicit anchored genesis.

## Exact replay progression

After genesis, every new anchor must represent exactly one local replay event.

Therefore:

```text
next replay_sequence   = prior replay_sequence + 1
next replay_event_count = prior replay_event_count + 1
```

No skipped local transition is accepted.

### Issue transition

When the prior projection is idle:

- next state must be pending;
- generation must increment exactly by one;
- `ready_for_issue=false`;
- pending challenge identity must be populated; and
- last terminal state must remain unchanged.

### Terminal transition

When the prior projection is pending:

- next state must be idle;
- generation must remain unchanged;
- `ready_for_issue=true`;
- pending challenge fields must clear; and
- terminal state must become `consumed` or `abandoned`.

The high-water digest, journal digest and replay tip must all advance.

## Rewind and divergence rules

The planner rejects:

- replay sequence lower than the current external anchor;
- replay sequence more than one ahead;
- same sequence with different projection bytes;
- source-hostname drift;
- invalid issue/terminal alternation;
- noncanonical JSONL;
- broken event-chain links; and
- tampered event digests.

Supplying the exact current projection is idempotent and returns
`already_anchored` without a new event.

## Security boundary

This source contract proves only the pure monotonic anchor semantics.

It intentionally keeps all of the following false:

- `canonical_replay_projection_binding_proven`;
- `live_anchor_storage_proven`;
- `external_anchor_transport_authenticated`;
- `external_anchor_append_performed`;
- `external_anchor_read_performed`;
- `rollback_resistance_proven`;
- `protected_high_water_custody_proven`;
- `independent_custody_proven`;
- `live_evidence_origin_proven`;
- `external_transport_authenticated`;
- `external_witness_storage_proven`;
- `live_remote_read_performed`;
- `runtime_integration`;
- `production_gate_ready`; and
- `funds_movement`.

## Intended execution order

Once later layers are implemented, one live read generation should proceed:

```text
1. persist local replay issue
2. append exact issue projection to Nimo anchor
3. perform authenticated Nimo witness READ
4. qualify the live read packet
5. persist local replay consume
6. append exact consumed projection to Nimo anchor
7. publish final evidence receipt
```

A crash after step 1 but before step 2 leaves the local replay one sequence ahead
of Nimo and can be completed forward.

A Nimo anchor ahead of the local replay is a rollback/divergence signal and must
HOLD.

## Focused proof

```bash
npm run typecheck
npm run build
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_external_anchor_v1.ts
git diff --check
```

The focused proof covers:

- explicit genesis anchor;
- issue / consume / next-issue progression;
- exact idempotence;
- same-sequence divergence rejection;
- replay rewind rejection;
- replay gap rejection;
- source-hostname drift rejection;
- invalid issue transition rejection;
- invalid terminal transition rejection;
- non-genesis first anchor rejection;
- event digest tamper rejection;
- canonical serialization enforcement;
- accessor/getter projection rejection without getter execution; and
- all negative live/runtime/custody/economic authority flags.

## Next gates

This source state machine is only the first external-anchor layer.

Before it can contribute to custody authority:

1. compose the projection directly from the canonical local replay high-water;
2. implement a Nimo-side durable anchor writer under the existing witness
   security boundary;
3. authenticate the anchor transport;
4. qualify live anchor read/append evidence; and
5. prove startup/runtime rollback admission compares local replay state against
   the Nimo anchor before issuing a new challenge.

No live Nimo mutation is authorized by this document.
