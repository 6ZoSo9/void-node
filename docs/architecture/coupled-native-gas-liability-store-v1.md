# Coupled native-gas open-liability store v1

Marker:

`VOID_COUPLED_NATIVE_GAS_OPEN_LIABILITY_STORE_V1`

## Purpose

This source-only filesystem store closes one narrow part of issue #2460: durable
serialization of **open** Chain-2050 native-balance liabilities for one payer.

It does not observe a live balance, obtain fee data, schedule nonces, reconcile
terminal receipts, release liabilities, sign or broadcast transactions, or
authorize presale/WC/VOID activation.

The economic admission decision is not reimplemented here. The store reuses
`classifyCoupledNativeGasBuyVoidAdmissionV1(...)` from the merged
`VOID_COUPLED_NATIVE_GAS_LIABILITY_V1` contract.

## Pre-provisioned payer domain

The caller supplies one absolute payer-domain root. The store never creates or
chmods authority directories.

The root must already contain:

```text
payer-domain-v1.json
records/
gas-liability-admission-v1.queue/
```

All three directories/root are direct, private, same-UID directories. The payer
identity file is a direct private single-link file and canonically binds:

- chain ID `2050`;
- one exact lowercase payer address; and
- a content-derived `payer_domain_id`.

`serializeCoupledNativeGasStorePayerDomainV1(...)` is a pure helper for later
reviewed bootstrap tooling. Calling it performs no filesystem mutation.

The lock uses
`withBuyVoidFilesystemBakeryLockAsyncExistingQueueV1(...)`. Missing, weak, or
symlinked queue state HOLDS and is never bootstrapped.

## Admission order

One persistence attempt runs under the payer queue:

```text
pin payer root / records / queue
  -> verify payer-domain identity
  -> acquire existing payer queue
  -> clean only reviewed non-authoritative temp names
  -> read full canonical open-liability census
  -> call merged #2463 classifier with exact census + candidate evidence
  -> require classifier payer == payer-domain identity
  -> exact replay: verify already-durable canonical bytes and return
  -> admitted candidate: create/fsync/link/fsync exact <liability_id>.json
  -> reread full census
  -> rerun #2463 with exact post-write census
  -> require exact idempotent replay and unchanged reserved-after amount
  -> final root/records/queue visibility revalidation
  -> return stored
```

The same durable wei cannot be admitted twice by two cooperating store callers:
the complete census/classify/publish/postcheck sequence is inside one
payer-scoped serialization domain.

The store ceiling is also mutation-safe. Exact idempotent replay remains allowed
when the census already contains `100,000` open liabilities, but a genuinely new
candidate HOLDS with `coupled_native_gas_store_record_count_exceeded` before
`createOnceLiability(...)` when the pre-write census is already at that ceiling.
This prevents row 100,001 from becoming durable and then causing the post-write
census to fail after mutation.

## Record publication

Canonical record name:

```text
records/<64-hex-liability-id>.json
```

The file contains the exact canonical JSON representation of the
`CoupledNativeGasLiabilityRecordV1` plus one final newline.

Publication is create-once:

1. private `O_EXCL|O_NOFOLLOW` temp file;
2. write exact bytes;
3. file `fsync`;
4. create-only hard link to the canonical final name;
5. records-directory `fsync`;
6. unlink temp;
7. records-directory `fsync`;
8. exact final-byte reread.

A final name that appears after the locked pre-census is not accepted as a
normal concurrent success. Cooperating writers must serialize through the
pre-provisioned payer queue.

Reviewed temp files are non-authoritative. Under the payer lock, a one-link temp
may be removed; a two-link temp is removed only when its reviewed final name is
the exact same inode. Unknown entries HOLD.

## Full-census authority

The store itself performs only minimal canonical filename/serialization/payer
binding while reading records. The full economic validity of every durable row
is revalidated by the merged #2463 classifier because the complete census is
passed as `open_liabilities` for both the pre-write decision and post-write
idempotence proof.

Malformed economics, duplicate liability IDs, payer mismatch, nonce collision,
transaction-plan conflict, obligation conflict, overflow, stale fee evidence,
or insufficient unreserved native balance therefore HOLD through canonical
classifier semantics.

## Open-liability-only boundary

This generation intentionally has **no release/delete API**.

A missing terminal receipt, crash, pending transaction, or unimplemented
reconciliation path therefore cannot free reserved native balance early. The
liability remains open and over-reserves until a separately reviewed terminal
receipt/finality reconciliation generation exists.

Separate later gates remain required for:

- terminal receipt/finality release;
- shared cross-lane nonce scheduling;
- live native-balance observation;
- live fee observation and trusted freshness/time;
- exact WC/VOID settlement gas/nonce evidence;
- lifetime presale gas capacity;
- ongoing WC/VOID native-gas sustainability; and
- runtime composition.

## Authority

`VOID_COUPLED_NATIVE_GAS_OPEN_LIABILITY_STORE_AUTHORITY_V1` keeps false:

- `storage_bootstrap`;
- `root_path_stability_proven`;
- `terminal_receipt_reconciliation`;
- `liability_release_or_delete`;
- `cross_lane_nonce_scheduler_proven`;
- `live_balance_observation`;
- `live_fee_observation`;
- `trusted_time_source_proven`;
- `wc_void_candidate_admission`;
- `full_presale_lifetime_capacity_proven`;
- `ongoing_wc_void_native_gas_model_proven`;
- `runtime_integration`;
- wallet/private-key/signing/transaction/broadcast authority;
- Chain-2050/inventory/activation/treasury/liquidity/funds authority.

## Focused proof

```bash
npm run build
npx tsx scripts/prove_coupled_native_gas_liability_v1.ts
npx tsx scripts/prove_coupled_native_gas_liability_store_v1.ts
git diff --check
```

The store proof covers:

- missing root, records directory, queue, and payer-domain HOLD without
  bootstrap;
- weak/symlinked queue HOLD without normalization;
- payer-domain mismatch HOLD;
- first exact durable liability publication;
- exact replay idempotence under fresh fee observation;
- stale observation HOLD without mutation;
- nonce collision HOLD;
- corrupt durable economic record HOLD through #2463;
- unknown record-name HOLD;
- reviewed orphan-temp cleanup;
- concurrent near-balance contenders with exactly one durable success; and
- explicit no-release/no-runtime/no-signing/no-funds authority.
