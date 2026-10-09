# Buy VOID custody high-water inspect mutation — negative witness V1

## Context and source generation

This standalone source-only Draft is stacked on the exact current
[PR #2708](https://github.com/6ZoSo9/void-node/pull/2708) head
`f31495793313ac61f6358dc2a5786ef2b20b0105`. The writer module's
reviewed Git blob is
`77b1c10c70bd668d8c1bc950d47bfe12b4c9cef0`.
It intentionally makes **zero changes** to the writer, classifier,
custody high-water file format or any actual host.

## Problem: "inspect" can change private directory state

The writer's `runWriter(options,classifier,mutate=false)` invokes
`cleanupTemps(evidence.custodyDirectory)` **before** it evaluates
`mutate`. Therefore the public `inspect()` method traverses the private
custody root, unlinks every valid
`.buy-void-custody-launch-high-water-v2.json.tmp-<PID>-<nonce>`
regular private file that matches the internal temp pattern and fsyncs
the directory. The resulting `inspect()` may report
`operation_performed=false` even though it modified directory entries.

This is a **source-level durability/availability defect** for a future
privilege-separated custody service, not evidence of a current attack.
The module is currently unmounted and explicitly returns
`production_allocation_mutation_ready=false`.

## Deterministic safe reproductions

`scripts/prove_buy_void_custody_inspect_side_effect_negative_v1.mjs`
reuses the exact source-pinned fixture/scaffold of the owner's existing
high-water writer proof, under **OS temporary paths only**, with no
customer, ledger, RPC, node service, wallet or signer contact.

It tests two independent negative facts:

1. Create a valid current high-water and a private correctly shaped
   temporary file. Call the writer's real `inspect()` method with the
   existing synthetic classifier; require a current / no-operation reply,
   while independently observing the temporary file was deleted.
2. Set up a legitimate synthetic later-generation high-water advance.
   At the exact `fs.renameSync(temp, fixed-high-water)` boundary,
   *after* the first writer's candidate/authority revalidation, intercept
   that single call and invoke a second real `inspect()` on the same
   private temporary root. The inspector deletes the first writer's
   fully fsynced temp and reports no operation. The resumed original
   rename fails and the original writer reports HOLD without advancing
   the fixed high-water. This deterministic nested interleaving simulates
   what an uncoordinated inspector may do to a concurrent writer; it
   does not claim real parallel processes were exercised.

The source uses no artificial override of the writer's `cleanupTemps`
behavior: the negative effects come from the production code under test.
Only `fs.renameSync` is temporarily intercepted to schedule the
interleaving, then restored.

Node 22/24/26 build the inert negative test against the exact original
writer and require byte-identical receipts. **Green in this negative
workflow means defect reproduced, NOT defect fixed.**

## Required safety improvement before production

The proposed narrow fix should make inspection genuinely read-only:
separate `cleanupTemps` from nonmutating `inspect`, and perform temp
recovery/cleanup only under a reviewed exclusive custody-writer
serialization/fencing domain. A matching temp may belong to another
live writer; do not delete it merely because it has the expected name
and mode. Recovery must distinguish an abandoned temp from an in-flight
transaction, and its claim/mutation reporting must describe actual
directory changes. The check-and-rename high-water path also requires a
reviewed cross-process compare-and-swap/fence against competing advances;
atomic rename alone is not a monotonic high-water guard.

This negative Draft does **not** implement that fix or qualify
cross-process serialization. Exact descendant source identities and
independent host UID/mount/custody qualification are separate.

No merge, Ready, deployment, real custody/user data, signer/key/wallet,
payment/transaction, Chain-2050/WC, presale/market, inventory/treasury,
liquidity, or funds movement. Production mutation authority remains FALSE.

**PROTECT THE CORE.**
