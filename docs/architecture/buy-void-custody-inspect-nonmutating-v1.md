# Buy VOID custody high-water inspect nonmutating fix V1

## Scope

Direct source-only child of [unmounted custody high-water writer #2708](https://github.com/6ZoSo9/void-node/pull/2708)
at exact source head `f31495793313ac61f6358dc2a5786ef2b20b0105`.
The older sibling [negative reproduction #2710](https://github.com/6ZoSo9/void-node/pull/2710)
preserves the original affected source identity
`77b1c10c70bd668d8c1bc950d47bfe12b4c9cef0`,
where `inspect()` could silently unlink another writer's staged high-water
temporary file and `advance()` could also delete another writer's temporary
file before a commit.

## Narrow repair

The unmounted production high-water writer no longer calls
`cleanupTemps(custodyDirectory)` from `runWriter()`, `inspect()`, or
`atomicAdvance()`. The broad cleanup implementation and its temporary name
matcher are removed rather than left callable from a new route.

A temp file matching `.buy-void-custody-launch-high-water-v2.json.tmp-...`
might be part of a second writer's already-fsynced, not-yet-renamed
transaction. Neither inspection nor advancing may assume a matching filename
is an abandoned record. The only remaining failure cleanup is the exact
temporary file created by the current writer through `O_EXCL`; that
writer owns its unique temporary name for this single attempt.

**Orphan temps remain inert and are intentionally not reclaimed.** Cleanup
requires an independently reviewed exclusive custody writer fence, durable
owner/abandonment evidence, and a separate maintenance contract.
An invalid/malformed stale temp name must never trigger ordinary inspection
to mutate or discard high-water state.

The existing high-water authority classifier, canonical candidate encoding,
private descriptor-bound read model, revalidation, fixed-name publication,
fsync, postcheck, and separate bootstrap hold remain unchanged. This repair
does **not** make the fixed-name rename a cross-process compare-and-swap and
does not establish an exclusive writer serialization domain. Two concurrent
advances may still race. The source explicitly retains:

```text
inspect_temp_cleanup_enabled=false
unowned_temp_cleanup_enabled=false
cross_process_exclusive_writer_fence_verified=false
runtime_integration=false
custody_reserve_method_enabled=false
custody_recover_method_enabled=false
production_allocation_mutation_ready=false
funds_movement=false
```

## Regressions

The original owner proof `scripts/prove_buy_void_custody_launch_high_water_writer_v1.mjs`
re-pins the exact changed writer Git blob and reruns all previously reviewed
positive/negative source-only tests (current idempotence, advance, bootstrap
HOLD, extra-field rejection, authority changing before rename, root replacement,
and post-rename truth). A new proof
`scripts/prove_buy_void_custody_inspect_nonmutating_v1.mjs`
uses the *same source-identity-pinned original fixture* as #2710, but changes
its deliberately negative expectations to the repaired positive behavior.

It plants a valid private temp, makes `fs.unlinkSync` and `fs.fsyncSync`
throw during `inspect()`, and requires successful current/no-op
classification plus the original bytes preserved. In a second controlled
interleaving, `inspect()` runs precisely after a different writer's
fsynced-temp and authority revalidation but before its rename. The inspector
must preserve that temp; the first writer must complete the intended high-water
advance, and a separate unrelated private temp must remain untouched.
Only disposable OS temporary paths are created. No real two-process or live
service execution is claimed.

An exact-head Node 22/24/26 matrix reruns both the original owner proof and
new focused positive proof and compares the complete output receipts across
versions.

## Separate launch gates

The older negative proof is valid for its exact historical writer SHA; it must
not be removed or relabeled green at a changed head. New successor qualification
depends on reviewed source and terminal exact-head CI, independent exclusive
custody serialization/fencing, authenticated root trust and UID separation,
cross-process high-water consistency, original buyer/payment provenance,
allocation exactly-once recovery, and full runtime/deployment acceptance.

This Draft does not deploy, mount, sign, broadcast, write a real customer or
custody ledger, access wallet/signer/keys, mutate Chain-2050/WC, reserve tokens,
publish a presale, change treasury/liquidity, or move funds.

**PROTECT THE CORE.**
