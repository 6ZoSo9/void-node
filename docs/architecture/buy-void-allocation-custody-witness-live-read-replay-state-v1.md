# Buy VOID allocation custody witness live-read replay state v1

## Scope

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_STATE_V1`
is a pure source state machine for the monotonic generation / replay boundary
required by #2452 before any later live witness-read executor can become
authoritative.

It performs no filesystem access, SSH, network operation, credential access,
remote read, witness mutation, runtime integration, payment, transaction,
activation, inventory action, treasury/liquidity action or funds movement.

This contract is deliberately separate from Draft #2519. #2519 classifies a
supplied live-read packet. This source lane defines how a later executor must
reserve and terminate one generation-bound challenge without pretending the
state has already been durably installed.

## Event chain

The canonical journal is newline-delimited canonical JSON. Every event contains:

- exact marker/version;
- contiguous `sequence`;
- exact `previous_event_sha256`;
- monotonic `generation`;
- state: `issued`, `consumed` or `abandoned`;
- `entropy_sha256`;
- generation-bound `challenge_sha256` and `challenge_id`;
- issue / expiry times;
- optional request/response identity for a consumed challenge;
- terminal time for a consumed or abandoned challenge; and
- `event_sha256` over the canonical event body.

The event line itself must also be canonical JSON bytes. Equivalent JSON with
different whitespace/key order is rejected so one accepted event cannot have
multiple journal byte representations.

The journal is bounded to 8 MiB / 8192 events in V1. Reaching the bound HOLDS;
this source contract does not define production journal rotation.

## Challenge derivation

A challenge is content-addressed over:

```text
domain
generation
previous_event_sha256
entropy_sha256
issued_at_ms
expires_at_ms
```

The digest is exposed as:

```text
challenge_sha256 = sha256:<64hex>
challenge_id     = voidwlrc1_<64hex>
```

Generation and prior tip are part of the challenge material. Reusing the same
entropy digest in a later generation therefore yields a different challenge
unless SHA-256 itself collides.

This is **not** proof that supplied entropy is random or secret:
`challenge_entropy_proven=false` and
`challenge_unpredictability_proven=false` remain authoritative.

## State machine

### Genesis

An empty journal is the only V1 genesis representation:

```text
generation = 0
sequence   = 0
pending    = false
ready_for_issue = true
```

### Issue

A new challenge may be planned only when no challenge is pending.

The new event must:

- be `issued`;
- use generation `prior_generation + 1`;
- point to the prior event digest (or null for genesis);
- carry a 32-byte SHA-256 entropy identifier;
- have `expires_at_ms > issued_at_ms`;
- have a maximum supplied TTL of 38 seconds; and
- carry no request/response/terminal fields.

If the previous event was terminal, the next supplied issue time may not
regress behind its terminal time.

### Consume

Only the currently pending challenge may be consumed.

The terminal event must:

- keep the exact pending generation, entropy, challenge, issue and expiry
  fields;
- carry one canonical witness-transport request ID
  `voidwreq1_<64hex>`;
- carry one response SHA-256;
- have terminal time between issue and expiry; and
- transition the journal back to idle.

A second consume attempt HOLDS because no challenge remains pending.

### Abandon

A pending challenge may be abandoned without request/response identity.

Abandonment terminal time may occur after expiry. The next issue still advances
to a new generation and cannot reuse the abandoned generation.

## What this proves

For one supplied canonical journal, the source contract proves:

- append-only hash-chain semantics;
- exact generation increment semantics;
- one pending challenge at a time;
- challenge binding to generation and prior journal tip;
- exactly one terminal transition per issued challenge;
- consumed-response replay rejection within the supplied journal; and
- deterministic classification of identical bytes.

## What this does not prove

This source-only contract intentionally keeps all of the following false:

- `durable_persistence_proven`;
- `rollback_resistance_proven`;
- `protected_high_water_custody_proven`;
- `trusted_verification_clock_proven`;
- `challenge_entropy_proven`;
- `challenge_unpredictability_proven`;
- `live_evidence_origin_proven`;
- `live_sshd_connection_context_proven`;
- `external_transport_authenticated`;
- `external_witness_storage_proven`;
- `live_remote_read_performed`;
- `runtime_integration`;
- `independent_custody_proven`;
- `production_gate_ready`;
- payment, signer/key, transaction, Chain-2050, presale/market and funds
  authority.

A caller can still supply an old valid journal. Rollback resistance therefore
requires a separately protected monotonic high-water / durable writer boundary.

Likewise, caller-supplied times do not become trusted time merely because their
ordering is valid.

## Relationship to the live-read ceremony

A later executor should compose the boundaries in this order:

```text
protected replay/generation writer
  -> issue generation-bound challenge
  -> authenticated, truly non-mutating witness read
  -> validate current live-read packet
  -> consume the exact pending challenge while holding the durable authority
  -> publish exact evidence receipt
```

If the network read fails or the challenge expires, the durable writer may
append an `abandoned` terminal event. It must not recycle that generation.

The later writer/executor must supply the missing guarantees:

- cryptographically unpredictable challenge entropy;
- trusted observation time;
- durable atomic journal persistence;
- rollback/high-water resistance;
- serialization against concurrent issue/consume/abandon operations;
- live SSH endpoint observations; and
- authenticated witness-read origin.

## Focused verification

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run build
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_state_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_transport_v1.ts
git diff --check
```

The focused proof covers:

- deterministic empty genesis;
- first issue / consume;
- duplicate issue HOLD while pending;
- consumed challenge replay rejection;
- same entropy producing different challenges across generations;
- consume-after-expiry HOLD;
- abandon then exact generation advance;
- supplied-time regression HOLD;
- TTL bound;
- invalid request identity;
- forbidden abandon payload;
- canonical JSONL enforcement;
- event digest tamper rejection;
- missing final newline rejection; and
- all negative live/runtime/custody/economic authority flags.

## Next gate

This source contract is only the state-machine prerequisite.

Before #2452 can use it as live replay authority, a separate lane must provide a
durable writer/high-water implementation whose persistence and rollback domain
are independently qualified, then compose that writer with the non-mutating
witness read and the accepted live-read packet classifier.

No live ceremony is authorized by this document.
