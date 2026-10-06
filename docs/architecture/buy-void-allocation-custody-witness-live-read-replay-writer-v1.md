# Buy VOID allocation custody witness live-read replay writer v1

## Scope

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1`
is the source-level durable persistence boundary for the canonical live-read
replay state machine.

It does not perform SSH, witness reads, witness writes, payment acceptance,
wallet/signer access, transactions, Chain-2050 writes, presale activation,
market activation, inventory movement, treasury/liquidity movement, or funds
movement.

The writer composes only the existing canonical replay planner with
crash-consistent local persistence. Live storage placement and independent
custody remain later operator gates.

## Storage model

The writer requires two preprovisioned same-UID private roots:

1. **journal root**
   - `live-read-replay-v1.jsonl`
   - redundant transaction intent
2. **high-water root**
   - `live-read-replay-high-water-v1.json`
   - redundant transaction intent

The roots must be distinct and non-nested. Each root is opened descriptor-
relative with `O_DIRECTORY|O_NOFOLLOW`, then revalidated against the visible
path before use.

This source contract does not claim that the two roots are on independent
physical storage. That must be proven by a later installation/evidence gate.
Accordingly `rollback_resistance_proven=false`,
`protected_high_water_custody_proven=false`, and
`independent_custody_proven=false` remain authoritative.

## Canonical high-water record

The writer does **not** define a second high-water schema. It composes the
merged #2529
`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1`
contract directly.

Every persisted high-water byte sequence is the exact canonical #2529 JSON
projection over the replay journal, binding:

- generation;
- sequence and event count;
- pending state;
- pending challenge SHA-256, challenge ID, and expiry;
- tip event SHA-256;
- last terminal state;
- `ready_for_issue`;
- exact journal SHA-256 and byte length; and
- the canonical high-water SHA-256 returned by #2529.

The writer's redundant transaction intent stores the exact canonical
`before_high_water_json` and `after_high_water_json` strings. Recovery
classifies both journal endpoints through #2529 before any forward repair; it
does not independently parse or reinterpret a competing V1 high-water object.

An idle genesis installation consists of an explicit zero-byte journal and the
canonical generation-zero high-water bytes returned by #2529. The convenience
helper
`buildBuyVoidAllocationCustodyWitnessLiveReadReplayGenesisHighWaterV1()`
must return byte-for-byte the same projection and SHA-256.

The writer does not bootstrap these files on its own.

## Canonical planner composition

Callers cannot provide arbitrary next journal bytes.

Issue operations call
`planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1(...)`.

Consume/abandon operations call
`planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1(...)`.

Only the canonical event line and next journal returned by those planners can
enter the persistence transaction.

The current and proposed journal states are projected and rebound through the
canonical #2529 high-water contract before publication. No writer-local
high-water identity or alternate V1 field set is accepted.

This preserves the replay state's generation increment, single-pending-
challenge, one-terminal-transition, expiry, request-ID, response-SHA, and
canonical JSONL rules.

## Serialization

Both pinned roots are locked before inspection or mutation using the existing
`withBuyVoidFilesystemBakeryLockV1` primitive.

Locks are acquired in canonical visible-path order to prevent cross-process
lock-order inversion.

## Durable transaction

One transition creates a content-addressed redundant intent containing:

- operation: issue / consumed / abandoned;
- exact canonical #2529 `before_high_water_json`;
- exact canonical #2529 `after_high_water_json`;
- exact canonical event JSONL line; and
- `voidwlri1_...` intent identifier.

Publication order is fixed:

1. write/fsync journal-root intent;
2. write/fsync high-water-root intent;
3. atomically replace/fsync the journal;
4. atomically replace/fsync the high-water record;
5. unlink/fsync both intents;
6. reread both files and require exact coherence; and
7. terminally revalidate both pinned root identities against their visible
   pathnames before success is returned.

Each replacement uses a same-directory mode-0600 temporary file, file fsync,
rename, directory fsync, descriptor-bound reread, and exact byte postcheck.

The final coherent-state snapshot is a paired authority check, not two
independent successful reads. After reading the journal and high-water and
proving their exact semantic binding, the writer revalidates **both** retained
root descriptors against the visible root pathnames. A same-UID rename/recreate
of either root between the two final reads therefore HOLDS instead of returning
an apparently coherent success from a detached storage tree.

This is still detection, not protected custody. A stronger host/storage gate
must prevent or independently survive admitted root replacement before live
authority can be claimed.

## Recovery

Recovery runs under both locks before any new transition.

Accepted crash states are:

- one or both intents present, journal/high-water both at **before**;
- journal at **after**, high-water at **before**;
- journal/high-water both at **after**.

The writer reconstructs an unfinished journal transition only by appending the
intent's exact canonical event line to the exact before journal and proving
both before and after endpoints through #2529's binding classifier.

An impossible state where the high-water is already **after** while the journal
is still **before** HOLDS as a publication-order violation.

Any journal or high-water state matching neither intent endpoint HOLDS.
Mismatched or tampered redundant intents HOLD.

## Rollback detection semantics

With no pending intent, every inspection derives a high-water record from the
current journal and requires exact equality with the persisted high-water.

Rolling only the journal backward therefore HOLDS.

Rolling only the high-water backward therefore HOLDS.

This establishes cross-root rollback **detection semantics**, but not live
rollback resistance. An actor able to roll both storage roots back together
remains outside this source-only proof. The later installation gate must bind
the roots to separately protected storage domains before stronger authority can
be claimed.

## Authority boundary

Even after a successful source-level write:

- `canonical_replay_high_water_required=true`;
- `validated_packet_binding_proven=false`;
- `live_durable_storage_proven=false`;
- `rollback_resistance_proven=false`;
- `protected_high_water_custody_proven=false`;
- `trusted_verification_clock_proven=false`;
- `challenge_entropy_proven=false`;
- `challenge_unpredictability_proven=false`;
- `live_evidence_origin_proven=false`;
- `live_sshd_connection_context_proven=false`;
- `external_transport_authenticated=false`;
- `external_witness_storage_proven=false`;
- `live_remote_read_performed=false`;
- `runtime_integration=false`;
- `independent_custody_proven=false`;
- `production_gate_ready=false`; and
- `funds_movement=false`.

## Focused proof

```bash
npm run typecheck
npm run build
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_writer_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_state_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_high_water_v1.ts
npx tsx scripts/prove_buy_void_filesystem_bakery_lock_async_v1.ts
git diff --check
```

The proof uses temporary local directories only. It covers:

- writer genesis byte/SHA equality with canonical #2529;
- canonical #2529 high-water binding after issue and consume;
- static rejection of a private writer high-water schema/marker or
  `voidwlrhw1_` identity;
- explicit preprovisioned genesis;
- issue and consume persistence;
- duplicate consume rejection;
- crash recovery after journal intent only;
- crash recovery after both intents;
- crash recovery after journal publication;
- crash recovery after high-water publication;
- journal-only rollback detection;
- high-water-only rollback detection;
- clean-inspection root swap after the final journal snapshot HOLDS;
- recovered-state root swap after the final journal snapshot HOLDS;
- post-persistence root swap after the final journal snapshot HOLDS;
- both journal-root and high-water-root variants of those snapshot races;
- tampered intent rejection;
- same-root rejection;
- symlink-root rejection; and
- all negative live/runtime/custody/economic authority flags.

## Next gate

After this source writer is merged, the next lane is an installation/evidence
qualifier that binds the journal and high-water roots to reviewed independent
storage domains. Only after that should a live executor compose:

```text
durable issue
  -> unpredictable challenge
  -> authenticated non-mutating witness read
  -> live-read packet qualification
  -> exact durable consume
  -> evidence receipt
```

No live installation or Nimo mutation is authorized by this source contract.
