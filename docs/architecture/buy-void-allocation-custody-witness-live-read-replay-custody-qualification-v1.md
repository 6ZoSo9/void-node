# Buy VOID allocation custody witness live-read replay custody qualification v1

## Scope

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_CUSTODY_QUALIFICATION_V1`
is a source-only continuity classifier for the replay journal/high-water pair.

It converts one fresh replay placement qualification plus the exact current
journal/high-water bytes into a content-addressed custody receipt chain.

It performs no filesystem, SSH, witness, service, mount, wallet, signer,
transaction, Chain-2050, presale, market, inventory, treasury/liquidity, or
funds operation.

## Why this gate exists

Two distinct physical disks on Precision are necessary but not sufficient for
rollback resistance.

If both replay files are rolled back together to an older valid pair, the
journal/high-water binding alone cannot detect the rewind.

A separately trusted prior custody receipt can.

This contract therefore defines the receipt continuity semantics without
pretending the supplied prior receipt is already externally trusted.

## Parent contracts

The classifier reuses:

- `VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1`;
- `VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1`;
- the merged replay storage-placement qualification.

The current replay journal and high-water are always rebound through the
canonical high-water classifier.

Forward movement is always proven through the canonical one-event high-water
advance planner.

## Fresh placement binding

Input placement evidence contains:

- the exact placement qualification ID;
- the exact normalized placement evidence;
- positive live storage observation flags;
- distinct mount-domain proof;
- distinct parent-block-device proof;
- canonical journal/high-water binding proof;
- no pending publication intent; and
- double-census stability.

The classifier recomputes `voidwlrie1_...` from the normalized placement
evidence.

The placement's exact journal/high-water digests and lengths must match the
current bytes supplied to this classifier. A genesis placement receipt cannot
be reused after a replay event changes the files.

The source contract still reports:

`placement_external_trust_proven=false`.

A caller can supply bytes; only a later live composition can prove where those
bytes came from.

## Storage-policy fingerprint

Dynamic evidence acquisition is separated from static custody policy.

The storage-policy fingerprint binds:

- hostname;
- replay journal root path;
- replay journal owner UID/GID/mode;
- journal filesystem type, major:minor and mount-source identity;
- journal parent block-device path, serial and WWN;
- replay high-water root path;
- replay high-water owner UID/GID/mode;
- high-water filesystem type, major:minor and mount-source identity; and
- high-water parent block-device path, serial and WWN.

It intentionally excludes dynamic file inode/mtime/ctime evidence and mount IDs.

Reacquiring fresh evidence for the same unchanged storage policy changes the
placement qualification ID but does not create a new custody epoch.

Changing the disk/policy identity invalidates continuity against the prior
receipt and requires an explicit migration design rather than silent
continuation.

For a supplied prior receipt, matching the fingerprint string is necessary but
not sufficient. The receipt's carried policy projection must also equal the
fresh placement policy exactly for hostname, both root paths, both parent-device
paths, both disk serials, and both disk WWNs. A self-hashed receipt that copies
the current fingerprint while contradicting any of those fields HOLDS before
idempotence or forward-continuity classification.

## Custody receipt

Each receipt contains:

- custody epoch;
- previous receipt SHA-256;
- storage-policy fingerprint;
- hostname and both root paths;
- both parent-device paths, serials and WWNs;
- exact journal byte length and SHA-256;
- exact canonical high-water JSON and SHA-256;
- replay generation, sequence and event count;
- replay tip;
- pending challenge identity/expiry;
- last terminal state;
- `ready_for_issue`; and
- the receipt's own canonical SHA-256.

For V1:

- `custody_epoch == event_count`;
- custody epoch/event count `0` requires `previous_receipt_sha256=null`;
- every non-genesis receipt requires a non-null predecessor receipt SHA-256.

These are receipt-intrinsic chain invariants. A self-hashed receipt that
violates them HOLDS even before any later external-custody trust decision.

## Genesis

No prior receipt is accepted only for canonical generation-zero replay state:

- zero-byte journal;
- generation 0;
- sequence 0;
- event count 0;
- null tip;
- no pending challenge; and
- `ready_for_issue=true`.

The resulting custody epoch is `0`.

Any non-genesis state without a prior receipt HOLDS.

## Idempotence

If the current journal/high-water exactly match the prior receipt, the prior
receipt is returned unchanged.

Fresh placement evidence for the same static storage policy may change the
qualification ID but must not advance the receipt epoch or receipt SHA.

## Exact forward continuity

For an advance:

1. current event count must equal prior event count + 1;
2. current sequence must equal prior sequence + 1;
3. the exact current-journal prefix at the prior byte length must hash to the
   prior receipt's journal SHA-256;
4. that prior prefix must bind exactly to the prior receipt's canonical
   high-water JSON;
5. the canonical replay high-water advance planner must accept the current
   journal as exactly one event append; and
6. its next high-water JSON/SHA must equal the exact current high-water.

Multi-event jumps are forbidden.

## Why stronger custody flags remain false

The receipt chain only becomes rollback authority when the previous receipt is
stored somewhere the Precision rollback domain cannot silently rewind.

This source contract therefore keeps:

```text
placement_external_trust_proven=false
prior_receipt_external_trust_proven=false
live_durable_storage_proven=false
rollback_resistance_proven=false
protected_high_water_custody_proven=false
independent_custody_proven=false
production_gate_ready=false
```

The live storage census already proved separate physical devices. This lane adds
monotonic receipt semantics. Neither alone proves an administrator cannot
coordinate a rollback of both local storage roots plus a locally stored receipt.

## Focused proof

```bash
npm run typecheck
npm run build
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_custody_qualification_v1.ts
node scripts/prove_buy_void_allocation_custody_witness_live_read_replay_installation_evidence_v1.mjs
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_writer_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_high_water_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_state_v1.ts
git diff --check
```

The proof covers:

- genesis custody receipt;
- idempotent replay;
- evidence refresh without custody-epoch advance;
- one-event issue advance;
- one-event consume advance;
- missing prior receipt after genesis;
- multi-event jump rejection;
- stale placement evidence rejection;
- forged prior prefix rejection;
- storage-policy drift rejection;
- self-consistent prior receipt with copied fingerprint but contradictory
  hostname/root/device/serial/WWN projection rejection;
- placement qualification-ID recomputation; and
- receipt self-hash validation;
- forged genesis receipt with a predecessor rejection; and
- forged non-genesis receipt with no predecessor rejection.

## Next gate

Protect the replay custody receipt outside Precision's coordinated rollback
domain.

The intended next composition is:

```text
fresh Precision placement evidence
  -> current replay custody receipt
  -> external receipt custody
  -> durable issue
  -> authenticated Nimo read
  -> packet qualification
  -> durable consume
  -> next custody receipt
  -> external receipt custody update
```

Only after external receipt custody is independently qualified may a later lane
promote rollback-resistance or protected-custody authority.
