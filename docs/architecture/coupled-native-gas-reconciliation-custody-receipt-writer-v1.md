# Coupled native-gas reconciliation custody receipt writer v1

Marker: `VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_WRITER_V1`

## Purpose

This source-only writer persists the canonical receipt-continuity chain already
defined by
`void-coupled-native-gas-reconciliation-custody-receipt-continuity-v1.mjs`.

It advances one narrow #2498 boundary: crash-consistent durable publication of
the supplied #2530 continuity plan.

It does **not** make the continuity journal rollback-resistant against
restoration of all storage roots and does not make collector, clock, bootstrap,
host, runtime, or economic evidence authoritative.

## Storage preconditions

The writer does not bootstrap production storage.

The operator must preprovision:

- one private journal root owned by the writer UID;
- one distinct private high-water root owned by the writer UID;
- `coupled-native-gas-reconciliation-custody-receipts-v1.jsonl` in the
  journal root, mode 0600; an empty file is the canonical genesis journal;
- `coupled-native-gas-reconciliation-custody-receipt-high-water-v1.json` in
  the high-water root, mode 0600, containing the exact high-water projection of
  the current journal;
- `coupled-native-gas-reconciliation-custody-receipt-writer-v1.queue/` in
  **each** storage root, mode 0700, for the two canonical existing-queue bakery
  locks.

Both storage roots must be direct, private directories and must not be equal or
nested beneath one another.

Missing or substituted storage is HOLD. The writer never falls back to a home
directory, alternate path, or newly created production root.

## Publication protocol

For a new collector decision and exact source-binding decision:

1. pin journal root, high-water root, and both root-local lock queues through
   descriptor-bound no-follow traversal;
2. order the two lock domains deterministically by pinned root device/inode and
   acquire **both** preprovisioned bakery queues before writer entry;
3. revalidate both visible roots and both pinned queue identities after lock
   admission, then read and classify the exact journal and high-water mirror;
4. delegate planning to
   `planCoupledNativeGasReconciliationCustodyReceiptV1(...)`;
5. build one canonical intent binding:
   - exact prior journal bytes/hash;
   - exact canonical append line/hash;
   - exact next journal hash;
   - exact prior and next high-water bytes/hashes;
   - exact #2530 generation and receipt SHA-256;
6. publish the same intent create-once into both roots;
7. atomically replace the journal from exact prior bytes to exact planned next
   bytes;
8. atomically replace the high-water mirror from exact prior bytes to the exact
   projection of the new journal;
9. reclassify the persisted journal through #2530 and rebind the high-water;
10. remove the two exact intent files;
11. re-read/reclassify both roots and revalidate both visible root identities
    before success.

The normal publication order is journal first, high-water second. Recovery can
also forward-complete the exact intent-bound high-water-first state. That is a
recovery case only; arbitrary high-water-ahead bytes HOLD.

## Crash recovery

The redundant intent permits forward-only recovery from:

- only the journal-root intent committed;
- both intents committed with neither state file advanced;
- journal advanced / high-water prior;
- high-water advanced / journal prior, when and only when both endpoints are
  exactly intent-bound;
- both state files advanced with intents remaining;
- one intent removed after exact postcheck.

Unknown journal bytes, unknown high-water bytes, mismatched intent copies, or
intent bytes that do not reconstruct valid #2530 prior/next states HOLD.
When only one intent copy exists, current journal/high-water bytes must first
classify as exact prior/next endpoints before the missing redundant copy may be
recreated; unknown state causes zero redundancy mutation.

Recovery never invents a receipt or accepts caller-selected journal bytes.

When ordinary `persist(...)` encounters a pending crash intent, automatic
recovery is allowed only if the caller's current collector decision and source
binding re-plan the intent's prior journal into the exact same append,
generation, and receipt SHA-256. A different current request HOLDs without
completing the old intent. The explicit `recover(...)` API is the
input-neutral path for completing already-durable crash intent.

## Descriptor and path boundary

Reads and writes are rooted through retained directory descriptors under
`/proc/self/fd`, with no-follow opens, owner/mode/link-count checks, bounded
file sizes, exact pre-replace bytes, directory fsync, and exact post-read
revalidation.

The final coherent snapshot opens and retains descriptors for **both**
authoritative state files at once. Journal and high-water bytes are read from
those pinned descriptors, both visible file pathnames are rebound to the same
retained file identities immediately before success, and both roots/queues are
revalidated around that final paired-file check. Replacing only the journal
file after its read, or only the high-water file after its read, therefore
HOLDs even when both storage roots and lock queues remain unchanged.

The journal and high-water authority renames also revalidate **both** visible
roots immediately before each authoritative rename. Replacing only one visible
root cannot split writer admission: the unchanged root still contains a queue
shared by the already-admitted writer and any contender, so the contender
cannot enter until the holder releases that shared lock domain.

This is a serialization guarantee, not independent custody. A same-UID or
privileged actor may still replace or roll back storage outside the admitted
publication interval, and replacing both custody domains remains outside this
source-level proof.

This is still not an operating-system custody proof. Another same-UID or
privileged actor may be capable of restoring both roots between invocations.
That later host/custody boundary remains open under #2498.

## High-water scope

The writer high-water is a source-level exact projection of the #2530 journal:

- exact journal SHA-256 and byte count;
- exact record count and generation;
- exact tip receipt SHA-256;
- exact #2530 source-generation ID;
- current host/payer/domain/payer-root-storage/machine identity.

It is not an independently trusted anchor. Consequently:

- `rollback_resistance_proven=false`;
- `protected_custody_proven=false`;
- `independent_custody_proven=false`.

A later protected-custody/bootstrap/live-host gate must establish the
non-rollbackable authority domain before this can become production truth.

## Focused proof

Run:

```bash
npm ci --ignore-scripts
npm run build
node --check tools/void-coupled-native-gas-reconciliation-custody-receipt-writer-v1.mjs
node --check scripts/prove_coupled_native_gas_reconciliation_custody_receipt_writer_v1.mjs
node scripts/prove_coupled_native_gas_reconciliation_custody_receipt_writer_v1.mjs
```

The proof covers:

- canonical empty bootstrap input supplied by the fixture;
- one real #2530 receipt plan and exact persisted reclassification;
- exact high-water binding;
- duplicate collector/qualification replay HOLD;
- all five modeled crash cutpoints and forward recovery;
- exact terminal-tip idempotent retry with byte-stable journal/high-water state;
- recovery-only exact intent-bound high-water-ahead completion;
- different-input persist HOLD while a pending intent exists, followed by exact
  retry recovery of that same intent;
- single-intent redundant recovery plus unknown-state/no-redundancy-mutation;
- missing journal-root or high-water-root lock queue HOLD;
- high-water tamper HOLD;
- same-root rejection;
- visible journal-root and high-water-root replacement HOLD;
- journal-file replacement after its retained-descriptor read HOLD with roots
  and queues unchanged;
- high-water-file replacement after its retained-descriptor read HOLD with roots
  and queues unchanged;
- cross-process one-root-replacement serialization for both roots: a valid
  contender must enqueue on the unchanged shared queue, cannot publish while
  the holder owns it, and may publish exactly once after release;
- deterministic dual-root lock ordering and both-root pre-rename
  revalidation;
- authority-map lock.

## Authority boundary

This source can read and write only the supplied reviewed receipt storage
surfaces under its bounded persistence contract.

It does not authorize or prove:

- storage bootstrap;
- external rollback resistance;
- protected or independent custody;
- trusted collector provenance;
- trusted verification time;
- evidence-generation monotonicity;
- live designated-host qualification;
- runtime composition;
- payment acceptance;
- wallet/private-key/signer use;
- transaction construction/signing/broadcast;
- Chain-2050 write or native-gas spend;
- inventory mutation;
- WC/VOID or presale activation;
- treasury/liquidity movement;
- funds movement.
