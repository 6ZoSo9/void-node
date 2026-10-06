# Buy VOID allocation custody witness live-read replay high-water v1

## Scope

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1`
is a pure, content-addressed projection over the merged live-read replay journal
from #2520.

It defines the exact high-water object that a later durable writer / protected
custody lane must persist. This source contract performs no filesystem read or
write and does not make the replay journal durable.

## Canonical high-water

For one accepted replay journal, the high-water binds exactly:

- journal SHA-256;
- journal byte length;
- event count;
- contiguous sequence;
- current generation;
- current tip event SHA-256;
- pending / idle state;
- pending challenge SHA-256 and `voidwlrc1_` challenge ID;
- pending challenge expiry;
- last terminal state (`consumed`, `abandoned`, or null); and
- `ready_for_issue`.

The canonical JSON is newline-terminated and closed-shape. The derived
`high_water_sha256` is the SHA-256 of those exact canonical high-water bytes.

Genesis is the merged #2520 zero-byte journal and therefore derives:

```text
sequence=0
generation=0
event_count=0
tip_event_sha256=null
pending=false
ready_for_issue=true
```

## Binding semantics

`classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1`
reclassifies the supplied replay journal through the canonical merged #2520
state machine, derives the expected high-water, parses the supplied high-water
as exact canonical bytes, and requires byte-for-byte semantic equality.

A stale high-water presented with a newer journal HOLDS.

A newer high-water presented with an older journal HOLDS.

A syntactically valid altered high-water with a changed journal digest, pending
challenge identity, generation, tip, sequence, terminal state or other bound
field HOLDS.

When the presented high-water is accepted, the classifier reports only:

`rollback_safe_for_presented_authoritative_high_water=true`.

That statement is deliberately narrow. It means a journal that does not match
the presented authoritative high-water cannot be silently accepted. It does
**not** prove the high-water itself is durably stored or rollback-resistant.

## Advance semantics

`planBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterAdvanceV1`
accepts:

- exact current replay journal bytes;
- their exact current high-water; and
- proposed next replay journal bytes.

The planner is pure and performs no write.

Exact same journal bytes are idempotent.

A non-idempotent advance must be one exact byte-prefix append and exactly one
new replay event.

The state transition must also match the merged replay state machine:

- idle -> issued:
  - event/sequence +1;
  - generation +1;
  - next state pending;
  - `ready_for_issue=false`;
- pending -> consumed/abandoned:
  - event/sequence +1;
  - generation unchanged;
  - next state idle;
  - `ready_for_issue=true`.

A multi-event jump, prefix rollback, alternate same-generation branch or
unchanged tip HOLDS.

## What this proves

The source contract proves:

- deterministic replay-journal -> high-water projection;
- exact journal SHA-256 / byte-length binding;
- exact sequence / generation / tip binding;
- exact pending challenge identity binding;
- exact terminal-state binding;
- canonical content-addressed high-water bytes;
- exact one-event monotonic advance semantics; and
- rollback/drift detection **when the caller presents the authoritative
  high-water bytes**.

## What this does not prove

The following remain false and authoritative:

- `filesystem_read`;
- `filesystem_write`;
- `high_water_write`;
- `replay_journal_write`;
- `durable_persistence_proven`;
- `rollback_resistance_proven`;
- `protected_high_water_custody_proven`;
- `independent_custody_proven`;
- `trusted_verification_clock_proven`;
- `challenge_entropy_proven`;
- `challenge_unpredictability_proven`;
- `live_evidence_origin_proven`;
- `external_transport_authenticated`;
- `external_witness_storage_proven`;
- `live_remote_read_performed`;
- `runtime_integration`;
- `production_gate_ready`;
- all payment, signer/key, transaction, Chain-2050, presale/market and funds
  authority.

A caller can still supply both an old valid replay journal and its matching old
high-water. This pure contract cannot distinguish that rollback from current
truth. A later protected writer / custody lane must own durable monotonic
storage and independently qualified rollback resistance.

## Relationship to #2452

This contract sits between the merged replay state machine and the later
durable replay writer:

```text
#2520 canonical replay journal state machine
  -> replay high-water projection/binding (this contract)
  -> later crash-recoverable durable replay/high-water writer
  -> separately protected / rollback-resistant high-water custody
  -> challenge issue
  -> authenticated non-mutating witness read
  -> accepted #2519 packet
  -> exact consume/abandon publication
```

#2521 must still terminalize the repaired non-mutating witness read, and #2519
must still be repinned/requalified to the final #2521 installation/runtime
identities. This source contract does not bypass those dependencies.

## Focused proof

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run build
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_high_water_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_state_v1.ts
git diff --check
```

The proof covers:

- canonical zero-byte genesis projection;
- exact journal digest/byte binding;
- idle -> issued one-event advance;
- issued -> consumed one-event advance;
- consumed/abandoned terminal projection;
- exact idempotence;
- stale high-water against newer journal;
- newer high-water against older journal;
- replay journal rollback;
- alternate same-generation journal branch;
- multi-event jump;
- pending challenge identity tamper;
- journal digest tamper;
- inconsistent pending/ready fields;
- extra high-water key;
- noncanonical high-water bytes; and
- all negative durability/custody/runtime/economic authority flags.

## Authority boundary

Source/proof only. No filesystem mutation, SSH/Nimo execution, credential/key
access, witness mutation, service/config/runtime change, payment, transaction,
Chain-2050 write, inventory movement, market/presale activation,
treasury/liquidity action or funds movement.
