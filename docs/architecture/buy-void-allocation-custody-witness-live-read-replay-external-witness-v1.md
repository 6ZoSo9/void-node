# Buy VOID allocation custody witness live-read replay external witness v1

## Scope

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_V1`
is the pure source verifier/planner for an independently retained replay
high-water witness.

Its purpose is to make coordinated rollback of both Precision replay-storage
roots detectable against a separately retained monotonic sequence on another
host such as Nimo.

This contract performs no filesystem access, SSH, network operation, key access,
remote append, service mutation, payment, transaction, activation, or funds
movement.

## Event model

The external witness is canonical newline-terminated JSONL.

Witness event sequence is one-based while the canonical replay sequence begins
at zero:

```text
external witness sequence = replay sequence + 1
```

Therefore external event 1 commits replay genesis sequence 0.

Every event binds the exact canonical replay high-water projection. Pending
challenge state also preserves the canonical replay identity equation:

```text
pending_challenge_sha256 = sha256:<digest>
pending_challenge_id     = voidwlrc1_<same digest>
```

Every event binds:

- replay sequence;
- generation;
- event count;
- replay tip event SHA-256;
- replay journal SHA-256 and byte length;
- canonical replay high-water SHA-256;
- pending/ready state;
- pending challenge SHA-256 / ID / expiry;
- last terminal state;
- exact Precision journal/high-water root identities and disk WWNs;
- exact witness host/machine/root-disk identity;
- previous external-witness event SHA-256; and
- current external-witness event SHA-256.

The event hash is SHA-256 over recursively key-sorted canonical JSON of the
event body excluding `event_sha256`.

## Canonical history rebinding

A valid final digest is not enough.

Before match, idempotence, or advance, the verifier reconstructs every witnessed
historical replay prefix from the supplied current canonical journal:

- external event 1 is rebound to the explicit empty genesis journal;
- external event 2 is rebound to replay journal prefix sequence 1;
- external event 3 is rebound to replay journal prefix sequence 2;
- and so on.

Each locally available reconstructed prefix is passed through the merged
canonical replay high-water derivation before any rollback classification is
allowed. If the external witness is ahead of local replay, the complete local
common prefix must still rebind exactly. A malformed or forged ahead witness is
therefore a history conflict, not rollback evidence.

A syntactically valid mixed history such as:

```text
external genesis
  -> challenge branch A sequence 1
  -> current journal branch B sequence 2
```

HOLDS even if the current sequence number is ahead and all supplied hashes are
individually well-formed.

## Classification

`classify...ExternalWitnessV1(...)` returns:

### `matched`

The local canonical replay journal/high-water exactly matches the external
witness tip and the full witnessed history is a canonical prefix of current
local history.

### `external_witness_update_required`

Local canonical replay sequence is ahead of the external witness, while the full
external witness remains an exact canonical prefix.

This is not authority to treat the new local replay state as rollback anchored.

### HOLD

The classifier HOLDs for:

- local replay sequence behind a witness whose complete locally available
  prefix rebinds exactly: rollback detected;
- forged/mixed/divergent historical prefixes, including an ahead witness whose
  shared genesis/history does not match local canonical replay;
- internally impossible pending challenge state, including a challenge ID whose
  suffix does not equal the pending challenge SHA-256 digest;
- current journal/high-water binding failure;
- source or witness identity drift;
- malformed/noncanonical/tampered external witness;
- chain discontinuity; or
- state-shape inconsistency.

## Planning

`plan...ExternalWitnessAdvanceV1(...)` is pure.

For an empty external witness it permits only canonical local replay genesis and
returns external witness event 1.

For a non-empty witness:

- exact local/witness equality is idempotent;
- local rollback HOLDS;
- divergent history HOLDS;
- otherwise the planner returns **exactly one** next external event corresponding
  to `witness_tip_replay_sequence + 1`.

If local state is several events ahead after a crash, callers must call the pure
planner repeatedly and persist one external event at a time. Sequence skipping
is never allowed.

## Identity boundary

The source contract binds stable source/witness identity fields but does not
prove their live origin.

The intended reviewed deployment is:

- source host: Precision;
- source journal domain: allocation-ledger disk;
- source replay high-water domain: allocation-custody disk;
- witness host: Nimo;
- witness storage: a separate protected Nimo authority root.

The later forced-command deployment must make these identities server-controlled
rather than caller-selected.

## Authority boundary

A successful source match or plan still reports/retains:

```text
external_transport_authenticated=false
external_witness_storage_proven=false
live_remote_read_performed=false
live_remote_append_performed=false
runtime_integration=false
live_durable_storage_proven=false
rollback_resistance_proven=false
protected_high_water_custody_proven=false
independent_custody_proven=false
production_gate_ready=false
funds_movement=false
```

This source contract alone does not satisfy the rollback-independence gate.

## Focused proof

```bash
npm run typecheck
npm run build
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_external_witness_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_high_water_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_state_v1.ts
git diff --check
```

The focused proof covers:

- exact external genesis;
- canonical issue and consume mirroring;
- exact match;
- update-required classification;
- idempotence;
- sequential catch-up;
- local rollback detection only after canonical common-prefix rebinding;
- forged-ahead witness rejection without false rollback classification;
- pending challenge ID/digest mismatch rejection, including in unavailable
  future witness prefixes;
- mixed-history conflict rejection;
- source/witness identity drift rejection;
- witness tamper rejection;
- truncated witness rejection; and
- all negative live/runtime/custody/economic authority flags.

## Next gate

After this source contract is merged, the next lane is a narrowly authorized
Nimo forced-command storage handler for this replay witness journal.

That handler must:

1. use a server-controlled fixed replay-witness path;
2. reject shell/command/path selection;
3. serialize concurrent requests;
4. persist one exact planned event durably;
5. recover crash/torn-append states exactly;
6. permit authenticated read;
7. bind Nimo host/storage identity; and
8. expose no generic write/delete/rename/service-control primitive.

Only after that live transport/storage gate is qualified should the replay
rollback policy treat Nimo as the high-water second-control domain.
