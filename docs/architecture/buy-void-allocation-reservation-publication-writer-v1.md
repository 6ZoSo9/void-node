# Buy VOID Allocation Reservation Publication Writer v1

Marker:
\`VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_V1\`

Status: **source filesystem writer; unmounted; production HOLD**.

## Purpose

This lane implements the filesystem writer required by the canonical allocation
authority stack:

1. #2433 — canonical hash-chained allocation JSONL ledger;
2. #2442 — exact ledger/high-water binding and one-record monotonic advance;
3. #2446 — durable intent and crash-recovery state machine.

It does not make Buy VOID live and does not create a verified-payment capacity
obligation. The caller must already have a valid next canonical ledger produced
under the reviewed payment/duplicate/capacity authority boundary.

## Canonical storage

The writer requires two already-provisioned private roots:

- **ledger root** containing \`allocation-reservations-v1.jsonl\`;
- **high-water root** containing
  \`allocation-reservation-high-water-v1.json\`.

The roots must be absolute, direct directories, same-UID owned, mode-private,
descriptor-bound, visible at their reviewed paths, and distinct directory
inodes.

The high-water root also contains:

- the crash-recovery intent
  \`allocation-reservation-publication-intent-v1.json\`; and
- the existing filesystem-bakery-lock queue for the writer serialization
  domain.

Storage bootstrap is intentionally not implemented by this module. Missing
authoritative ledger/high-water files HOLD. A later deployment gate must
provision the canonical genesis pair and independently qualify the high-water
custody domain.

## Why the ledger is published copy-on-write

The semantic transition is exactly one append validated by #2433/#2442/#2446.

The filesystem realization deliberately does **not** tail-write directly into
the authoritative JSONL inode. Instead it:

1. writes the complete exact next ledger to a private temp file;
2. fsyncs the temp file;
3. atomically renames it over the ledger pathname; and
4. fsyncs the ledger directory.

This preserves the logical append-only contract while guaranteeing that a
process crash can expose only:

- the exact prior ledger; or
- the exact next ledger.

A torn or partially written allocation row never becomes the authoritative
ledger pathname. That matches #2446's recovery classifier more strongly than an
in-place tail write because every observable authority state is one of its
reviewed prior/next fingerprints.

The protected high-water is published using the same temp + fsync + atomic
rename + directory-fsync pattern.

## Durable forward order

Under the existing crash-recoverable filesystem bakery lock:

\`\`\`text
descriptor-bind ledger root + high-water root
  -> recover any prior durable intent
  -> require exact current ledger/high-water binding
  -> require proposed ledger is one canonical append
  -> create/fsync create-once publication intent
  -> atomically publish/fsync exact next ledger
  -> classify ledger_committed
  -> atomically publish/fsync exact next high-water
  -> classify complete
  -> require exact ledger/high-water binding
  -> remove/fsync publication intent
\`\`\`

The create-once intent itself uses a private temp file, file fsync, create-only
hard link, directory fsync, temp unlink, and a second directory fsync. A crash
after final intent publication but before temp cleanup is normalized by exact
same-inode recovery.

## Recovery

\`recoverBuyVoidAllocationReservationPublicationWriterV1(...)\` accepts only
the three #2446 intent states:

- **intent_only**: publish the exact reconstructed next ledger, then high-water;
- **ledger_committed**: do not publish the ledger again; advance high-water;
- **complete**: perform no ledger/high-water write; postcheck and remove intent.

Unknown ledger state, unknown high-water state, high-water-ahead, altered
intent, alternate history, rollback, malformed storage, or mixed fingerprints
HOLD without intent deletion.

Recovery is terminal for the current writer invocation. If an existing durable
intent is recovered, the writer returns `status=recovered` immediately even if
the caller supplied bytes for a further valid append. The outer
payment/duplicate/capacity authority must re-read durable state and re-plan
before another allocation can be admitted. One invocation therefore cannot
silently combine recovery of one allocation with publication of another.

When no intent exists, the writer requires the current ledger and high-water to
bind exactly. A genuine earlier ledger prefix therefore cannot be silently
accepted against a later high-water.

## Source API

\`\`\`ts
persistBuyVoidAllocationReservationPublicationWriterV1({
  ledger_root,
  high_water_root,
  next_ledger_jsonl,
})

recoverBuyVoidAllocationReservationPublicationWriterV1({
  ledger_root,
  high_water_root,
})
\`\`\`

The persistence API accepts complete next-ledger bytes only because #2446
revalidates that those bytes are exactly the current canonical prefix plus one
valid allocation row. It cannot publish a two-record jump, alternate branch, or
malformed ledger.

## High-water custody boundary

This source writer requires the ledger and high-water to live in distinct
private directory inodes. That is useful isolation but is **not** a proof of
independent rollback-resistant custody.

The authority object therefore keeps:

- \`protected_high_water_custody_proven=false\`;
- \`independent_custody_proven=false\`;
- \`storage_bootstrap=false\`;
- \`runtime_integration=false\`;
- \`production_gate_ready=false\`.

A later designated-host gate must prove the chosen high-water root cannot be
rolled back together with the allocation ledger root. That may require separate
mount/storage policy, external anchoring, or another reviewed host-level
monotonic mechanism.

## Focused proof

\`\`\`bash
npx tsx scripts/prove_buy_void_allocation_reservation_publication_writer_v1.ts
npx tsx scripts/prove_buy_void_allocation_reservation_publication_protocol_v1.ts
npx tsx scripts/prove_buy_void_allocation_reservation_high_water_v1.ts
npx tsx scripts/prove_buy_void_allocation_reservation_ledger_v1.ts
npm run typecheck
npm run build
git diff --check
\`\`\`

The focused writer proof covers:

- first exact one-record publication;
- exact replay idempotence;
- \`intent_only\` recovery;
- \`ledger_committed\` recovery;
- \`complete\` recovery;
- high-water-ahead HOLD;
- multi-record jump HOLD;
- valid-prefix rollback HOLD;
- distinct-root enforcement;
- symlink-root rejection;
- unpublished intent-temp cleanup; and
- missing authoritative storage HOLD.

## Authority boundary

This lane is filesystem accounting infrastructure only. It does **not**:

- write \`payment_verified\`;
- verify a live payment receipt;
- mount into \`src/index.ts\`;
- expose a public route;
- access wallets, private keys, or signers;
- construct, sign, or broadcast transactions;
- mutate Chain-2050 or validators;
- fund or transfer inventory;
- activate the presale, WC/VOID market, liquidity, or treasury; or
- move funds.

The next separate gate is runtime composition under the same existing
verified-payment serialization boundary, plus designated-host proof of
independent high-water custody.
