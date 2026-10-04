# Economic System-Sponsored Reservation Store v1

Marker:
`VOID_ECONOMIC_SYSTEM_SPONSORED_RESERVATION_STORE_V1`

Status: **source-only durable accounting; unmounted; production HOLD**.

## Purpose

The existing
`VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_V1`
already defines the canonical admission calculation for system-sponsored
Chain-2050 gas:

- exact launch sponsorship policy;
- exact TTL/caps policy;
- one sponsorship per economic intent;
- per-intent sponsored gas ceiling;
- per-identity sponsored gas budget;
- global sponsored gas budget;
- signed-submission digest/gas/lifetime binding; and
- `deny_sponsorship_without_hidden_trade_minimum` on budget exhaustion.

That classifier deliberately performs no durable reservation mutation.

This lane supplies the missing durable accounting carrier. It does not create a
new gas policy or a new economic-intent identity.

## Canonical record

Each immutable store record contains exactly two existing canonical objects:

```text
{
  schema
  marker
  version
  intent       <- existing VOID_ECONOMIC_INTENT_RESERVATION_SCHEMA_V1
  sponsorship  <- existing VOID_ECONOMIC_SYSTEM_SPONSORSHIP_SCHEMA_V1
}
```

The record must preserve the existing bindings:

```text
sponsorship.intent_id      == intent.intent_id
sponsorship.identity_id    == intent.identity_id
sponsorship.reservation_id == intent.reservation_id
```

Both nested IDs are recomputed with the canonical existing digest functions.
No second intent ID, reservation ID, sponsorship ID, or gas-accounting identity
is introduced.

The authoritative filename is derived solely from the canonical
`sponsorship_id`:

```text
records/<sponsorship-id-hex>.json
```

Callers cannot select a record pathname.

## Why intent and sponsorship are stored together

The anti-grief classifier derives active gas from two exact histories:

```text
outstanding_intents[]
sponsorships[]
```

Persisting only sponsorship rows would leave the TTL lifecycle dependent on a
different unproven mutable store. The compound record lets this store reconstruct
both existing classifier inputs from one append-only history.

Expired records are never deleted merely to free budget. Instead the canonical
TTL verifier marks their intent non-outstanding, and the canonical sponsorship
state verifier excludes their gas from the active budget while preserving
historical evidence.

## Admission order

Under the existing crash-recoverable async filesystem bakery lock:

```text
pin private root + records directory
  -> normalize reviewed crash temp state
  -> descriptor-bound full history census
  -> canonical historical TTL/sponsorship-state verification
  -> exact replay / identity-conflict check
  -> canonical anti-grief candidate classifier
  -> require sponsorship_allowed=true
  -> revalidate pinned storage
  -> create-once canonical record publication + fsync
  -> full history reread
  -> canonical historical-state postcheck
  -> require active gas == classifier prospective global gas
  -> return reserved
```

The lock covers census, admission, durable publication, and postcheck. Two
concurrent candidates therefore cannot both authorize themselves from the same
stale pre-reservation budget snapshot.

## Durable publication

Publication uses:

1. private same-directory temp file;
2. complete canonical JSON + final newline;
3. file fsync;
4. create-only hard link to the final sponsorship-derived filename;
5. directory fsync;
6. temp unlink;
7. second directory fsync; and
8. descriptor-bound exact-byte readback.

An unpublished one-link reviewed temp is non-authoritative and may be removed
only by a serialized mutating invocation.

A reviewed two-link temp/final crash residue must refer to the same inode; the
temp link may then be removed and the final record remains authoritative.

The read-only listing API never performs that cleanup. If any crash temp exists
it returns HOLD with
`SPONSORED_RESERVATION_STORE_RECOVERY_REQUIRED`.

## Storage contract

The first source lane intentionally does not bootstrap storage.

Before use, the caller must supply an existing:

```text
<root>/                 mode-private, current UID
  records/              mode-private, current UID
```

The root path is opened component-by-component from the filesystem root with
`O_DIRECTORY | O_NOFOLLOW` through descriptor-relative
`/proc/self/fd/<fd>/...` paths.

The source rejects unsafe/symlinked ancestry and descriptor/path identity drift.
Record reads are bounded, no-follow, descriptor-bound, and require exact
before/after visible identity.

This is filesystem integrity hardening, not independent custody. The authority
therefore keeps `root_path_stability_proven=false`.

## Exact replay

If the exact canonical sponsorship file already exists and its complete record
bytes match the supplied exact intent+sponsorship record, replay returns
`status=duplicate` with no mutation.

This remains true after the economic intent expires. Expiry changes whether the
gas counts toward the active budget; it does not erase the durable historical
reservation.

Same sponsorship ID with different bytes, or another sponsorship that reuses
an already durable intent ID, reservation ID, or signed-submission digest,
HOLDs.

## Historical verification

This lane adds one dependency-preserving export to the existing anti-grief
module:

`verifyEconomicSystemSponsoredStateV1(...)`

It reuses the existing private policy and sponsorship-set validators plus
`verifyEconomicIntentTtlCapsStateV1(...)` and returns read-only historical gas
state.

It does not change existing admission behavior and performs no I/O.

Historical reservation rows retain the canonical
`signed_submission_digest`; this first store does not persist raw private key
material, wallet material, or raw signed transactions.

## Observation-time authority boundary

`observed_at_ms` is an explicit source input. It controls whether historical
TTL intents are considered active or expired, and therefore whether their
sponsored gas counts against the current budget.

This source store deliberately does not read production wall-clock time and does
not prove that a caller-supplied observation is trustworthy or monotonic. Its
authority therefore keeps:

```text
trusted_observation_time_proven=false
monotonic_observation_time_proven=false
runtime_enforcement_verified=false
```

The focused proof demonstrates this boundary directly: advancing the supplied
observation past an intent's expiry changes the source budget view while those
authority flags remain false.

A later runtime composition must provide server-controlled trusted time and a
monotonic observation high-water (or equivalently strong authority). It must
reject an observation older than the last accepted budget-releasing
observation. A caller-selected future timestamp must never become live
sponsorship authority merely because the source classifier accepts explicit
time as an input.

## Production values remain separate

The store accepts an exact sponsorship policy supplied by its caller. It does
not choose:

- per-intent gas limit;
- per-identity gas budget;
- global gas budget;
- production activation generation; or
- any hidden purchase/trade minimum.

The existing policy still requires launch-specific positive values to be
content-addressed separately.

## Focused proof

```bash
npm run build
node scripts/prove_void_economic_system_sponsored_reservation_store_v1.mjs
node scripts/prove_void_economic_system_sponsored_anti_grief_policy_v1.mjs
node scripts/prove_void_economic_intent_ttl_caps_policy_v1.mjs
git diff --check
```

The store proof covers:

- first durable reservation;
- exact replay;
- exact replay after expiry;
- expired historical gas excluded from active reserved gas;
- same-intent conflicting sponsorship HOLD;
- duplicate signed-submission digest HOLD;
- exact per-identity budget boundary and overflow;
- exact global budget boundary and overflow;
- read-only listing;
- unpublished crash-temp HOLD for read-only listing;
- serialized unpublished-temp recovery;
- linked temp/final crash recovery;
- malformed record HOLD;
- symlink record/root HOLD;
- missing pre-provisioned records directory HOLD; and
- concurrent near-global-budget admission where exactly one of two otherwise
  valid candidates can become durable.

## Authority boundary

This lane authorizes source-local filesystem accounting only.

It does **not**:

- mount a runtime route;
- read production wall-clock time for policy decisions;
- choose production sponsorship budgets;
- sponsor gas;
- access wallets, private keys, or signers;
- construct, sign, submit, or broadcast a transaction;
- mutate authoritative Chain-2050 state;
- fund inventory;
- move liquidity or treasury assets;
- activate a market or public presale; or
- move funds.

The next separate gate is runtime composition with exact launch budget values,
host storage qualification, and bounded release/recovery behavior. Source merge
alone does not make that gate live.
