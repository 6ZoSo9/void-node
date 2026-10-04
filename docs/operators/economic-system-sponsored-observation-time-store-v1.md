# Sponsored observation-time durable store v1

Marker: `VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_V1`

Status: **source-only durable receipt store; default-off; no runtime route, gas sponsorship, transaction, chain, activation, or funds authority**.

## Purpose

This lane is the durable authority boundary immediately after the pure
`VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_V1` contract.

The pure observation contract proves same-binding clock/receipt continuity but
deliberately does not prove durable receipt provenance across binding
construction. This store removes both the prior receipt and timestamp from the
runtime caller. It reconstructs the only accepted prior receipt from a
pre-provisioned private append-only store and passes that exact durable head to
the captured observation contract.

It is designed for issue #2458 and does **not** yet compose into live sponsored
execution.

## Storage contract

The caller supplies one binding-time absolute private root and one captured
clock dependency:

```text
createVoidEconomicSystemSponsoredObservationTimeStoreV1({
  root_dir,
  trustedClock,
})
```

The root must already exist with a private `records/` directory:

```text
<root>/
  records/
    <receipt-sha256-without-prefix>.json
  observation-time-v1.queue/
```

The queue directory is owned by the existing reviewed async filesystem bakery
lock. The store does not bootstrap the root or records directory.

Each record contains the exact canonical JSON bytes of one
`VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_RECEIPT_V1` plus one final
newline. The filename derives exclusively from `receipt_sha256`.

No API accepts:
- a caller-selected receipt path;
- a caller-supplied prior receipt;
- a caller timestamp;
- a generation; or
- a record filename.

## Serialized observation

`observe()` accepts no arguments and performs, under the existing async bakery
lock:

```text
descriptor-bind root + records
  -> recover reviewed crash temp residue
  -> read and validate all canonical receipts
  -> reconstruct one unique genesis -> head chain
  -> create a fresh #2459 binding from the captured clock
  -> call observe({ prior_receipt: durable_head_or_null }) exactly once
  -> require source_accepted
  -> create-once/fsync the exact next receipt
  -> revalidate root + records identity
  -> reread the complete chain
  -> require count +1 and exact new head
  -> return accepted_observed_at_ms
```

The durable census therefore precedes the clock observation and the durable
publication precedes the returned accepted time.

## Chain invariants

A non-empty store must contain exactly generations `0..N` with no gaps or
duplicates.

Generation zero must have no parent. Every later generation must point to the
immediately previous receipt SHA-256.

Every record is independently revalidated for:

- exact schema/marker/version/key set;
- canonical bytes;
- self SHA-256;
- filename binding;
- lowercase boot UUID;
- positive process-start ticks;
- generation/parent shape;
- generation-zero baseline equality;
- strict later monotonic advance above the baseline;
- cumulative wall/monotonic skew at or below the #2459 5000 ms ceiling.

Across the reconstructed chain, boot ID, process-start identity, baseline wall
time, and baseline monotonic time must remain exact. Wall time may not regress
and monotonic time must advance strictly.

Multiple genesis records, duplicate generations, forks, missing parents,
generation discontinuities, changed baselines, or malformed/noncanonical files
HOLD.

## Filesystem custody

Reads use descriptor traversal with `O_NOFOLLOW`, exact file/directory identity
checks, private ownership/mode checks, bounded sizes, and pre/post file identity
checks.

Publication follows the reviewed create-once pattern:

```text
private O_EXCL temp
  -> full write
  -> fsync(temp)
  -> hardlink(temp, final)
  -> fsync(records directory)
  -> unlink(temp)
  -> fsync(records directory)
  -> exact reread postcheck
```

An unpublished one-link temp or a two-link temp left after final-link
publication is recovery residue. Mutating `observe()` may clean only the
reviewed temp shapes while serialized. Read-only `inspect()` never cleans
them and instead returns HOLD / recovery required.

Historical receipts are never deleted.

## Restart behavior

A newly constructed store binding does not accept a caller prior receipt. It
always reconstructs the durable head before reading the clock, so ordinary
same-process binding recreation cannot reset generation zero.

If the next captured clock sample reports a different boot ID or process-start
identity, the parent #2459 contract HOLDS and no new receipt is published.

This store therefore preserves a durable receipt chain, but it deliberately
does **not** claim cross-process or cross-boot restart authority. A later trusted
host synchronization and rollback/high-water lane must authorize any restart
continuity.

## Rollback boundary

A filesystem snapshot rollback could remove later durable receipts while leaving
an internally valid earlier chain. This source lane therefore keeps:

```text
receipt_store_rollback_resistance_proven=false
trusted_clock_source_proven=false
trusted_clock_host_binding_proven=false
cross_process_restart_continuity_proven=false
cross_boot_restart_continuity_proven=false
root_path_stability_proven=false
runtime_enforcement_verified=false
gas_sponsorship_performed=false
```

Live composition must place the store in a reviewed rollback-resistant authority
domain or bind an equivalent external high-water before expired sponsored-gas
budget can be released in production.

## Read-only inspection

`inspect()` accepts no arguments. It descriptor-binds the store, validates the
complete chain, and reports the current head/count.

It performs no temp cleanup and no clock read.

## Authority boundary

This lane may read/write only the explicitly supplied pre-provisioned store
root when its API is invoked. It performs no:

- service/systemd action;
- runtime route mount;
- implicit host clock selection;
- gas sponsorship;
- wallet/private-key/signer access;
- transaction construction/signing/submission/broadcast;
- authoritative Chain-2050 mutation;
- inventory funding;
- public presale or market activation;
- treasury/liquidity action; or
- funds movement.

No production store is created or mutated by merging this source.

## Verification

```bash
node --check tools/void-economic-system-sponsored-observation-time-store-v1.mjs
node --check scripts/prove_void_economic-system-sponsored-observation-time-store-v1.mjs
npm run build
node scripts/prove_void_economic_system_sponsored_observation_time_v1.mjs
node scripts/prove_void_economic_system_sponsored_observation_time_store_v1.mjs
git diff --check
```

The focused proof covers:

- empty read-only inspection;
- no request/prior/timestamp input;
- deterministic genesis and forward append;
- restart reconstruction from durable head;
- concurrent observations serialized as generations 0 then 1;
- zero-byte unpublished temp recovery;
- linked post-publication temp recovery;
- read-only recovery HOLD with no cleanup;
- duplicate-generation/fork HOLD;
- changed baseline HOLD;
- malformed and symlink record HOLD;
- boot-change HOLD without durable mutation;
- missing pre-provisioned root HOLD without bootstrap;
- descriptor/no-follow source guards; and
- no hidden wall clock, transaction, service, or funds primitive.

## Next gate

After this source store is hosted-green, issue #2458 may compose:

```text
reviewed coupled launch policy bundle
  + reviewed host trusted-clock binding
  + rollback-resistant durable observation-time store
  + pre-provisioned sponsored reservation store
  -> exact trusted observed_at_ms
  -> #2454 durable sponsored-gas reservation
  -> exact postcheck
  -> return before any sponsored execution
```

Actual gas sponsorship and transaction submission remain separate later
authority gates.
