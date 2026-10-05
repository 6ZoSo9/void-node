# Coupled native-gas reconciliation storage v1

Marker: `VOID_COUPLED_NATIVE_GAS_RECONCILIATION_STORAGE_V1_GREEN`

## Purpose

Prepare the storage boundary required before any durable native-gas liability
reconciliation writer can exist.

The existing open-liability store deliberately pre-provisions only:

```text
payer-domain-v1.json
records/
gas-liability-admission-v1.queue/
```

It keeps `storage_bootstrap=false`. A later receipt/reconciliation writer must
therefore never create `reconciliations/` as an incidental side effect of
processing a terminal payment.

This lane adds one explicit, reviewable bootstrap/qualification contract for the
single additional child:

```text
reconciliations/
```

It does **not** publish reconciliation records and does **not** release native
gas reserve.

## Existing authority reused

The contract requires an already valid payer-scoped store root containing:

- exact `payer-domain-v1.json` bytes produced by
  `serializeCoupledNativeGasStorePayerDomainV1(...)`;
- private direct `records/`;
- private direct `gas-liability-admission-v1.queue/`.

The payer-domain file, root, records directory and queue are all observed
through retained no-follow descriptors and must remain bound to their visible
paths.

Bootstrap and qualification reuse
`withBuyVoidFilesystemBakeryLockAsyncExistingQueueV1(...)` on the existing
`gas-liability-admission-v1.queue`. No reconciliation-specific lock is
created.

## Explicit bootstrap

`bootstrapCoupledNativeGasReconciliationStorageV1(...)` may create only the
missing `reconciliations/` directory. Creation requires the exact confirmation:

```text
bootstrapCoupledNativeGasReconciliationStorageV1:<payer_domain_id>
```

Before creation the contract verifies the payer domain, existing `records/`
and existing admission queue while holding that queue. The directory is created
through the retained payer-root descriptor with mode `0700`, and the payer
root is fsynced before success is reported.

If the directory already exists and qualifies, bootstrap is idempotent and
returns `already_qualified` with `mutation_performed=false`.

A missing `records/`, missing admission queue, payer mismatch, wrong
confirmation, symlink, weak permissions or changed directory identity HOLDS.
The mutation path does not create missing prerequisites.

## Read-only qualification

`qualifyCoupledNativeGasReconciliationStorageV1(...)` never creates storage.
A missing `reconciliations/` directory returns HOLD with
`mutation_performed=false`.

When present, the directory must be one private, same-UID, non-symlink directory
bound to the retained payer root. Existing entries are structurally constrained
to private direct regular files named:

```text
<64 lowercase hex>.json
```

This lane deliberately does not grant semantic authority to those record bytes.
A later writer must authenticate the exact reconciliation schema, liability,
terminal-attempt state, receipt/finality evidence and #2488 effective-open
post-state under the same payer queue.

## Concurrency

Concurrent bootstrap callers serialize on the existing payer admission queue.
The proof requires exactly one caller to report `bootstrapped` and exactly one
durable mutation; the other caller observes the same directory as
`already_qualified`.

No second queue is created, so later liability admission and reconciliation
publication remain in one payer mutation serialization domain.

## Relationship to #2488 and the later writer

Draft #2488 reached terminal green (53/53 hosted checks) before this source lane
was opened. This storage contract does not depend on #2488 source and does not
perform an effective-open census.

The later durable reconciliation writer remains a separate gate. It must:

1. require this namespace to qualify before mutation;
2. retain root / `records/` / `reconciliations/` / existing queue
   descriptors;
3. enter the exact existing queue;
4. authenticate exact plan, whole terminal-attempt lineage, fresh receipt and
   current-block evidence;
5. derive the reviewed terminal-cost/reconciliation evidence;
6. publish `reconciliations/<reconciliation_id>.json` create-once; and
7. re-run #2488's full effective-open/reserve census before reporting success.

A missing namespace must HOLD; the writer must not call this bootstrap contract
as part of receipt reconciliation.

## Authority

This lane authorizes only the explicit source-level creation/qualification of
the `reconciliations/` storage namespace when its function is deliberately
called with the reviewed confirmation.

It does not authorize:

- reconciliation record publication;
- receipt/RPC observation;
- liability release, deletion or mutation;
- effective-open reserve mutation;
- runtime mounting;
- wallet, key or signer access;
- transaction construction, signing or broadcast;
- Chain-2050 mutation or gas spend;
- presale or WC/VOID activation;
- inventory, treasury or liquidity movement; or
- funds movement.

Merging source does not create any production directory. No production
filesystem operation is performed by the proof.

## Verification

```bash
npx tsx scripts/prove_coupled_native_gas_reconciliation_storage_v1.ts
```
