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

The payer-domain file is not trusted from a pre-lock observation. After entering
the payer queue, the store opens it through the pinned root, retains that exact
file descriptor plus canonical bytes/identity for the admission, and requires
the visible path to remain bound to the same inode/metadata/bytes before
idempotent success, immediately before publication, and again before stored
success. If the domain changes after a canonical liability has already been
published, the result is a post-mutation HOLD requiring reinspection rather
than a clean success.

## Admission order

One persistence attempt runs under the payer queue:

```text
pin payer root / records / queue
  -> acquire existing payer queue
  -> open + retain exact payer-domain descriptor/bytes inside the queue
  -> clean only reviewed non-authoritative temp names
  -> read full canonical open-liability census
  -> sample injected admission time
  -> call merged #2463 classifier with exact census + candidate evidence + sampled time
  -> require classifier payer == retained payer-domain identity
  -> rebind visible payer-domain to the retained descriptor/bytes
  -> exact replay: verify already-durable canonical bytes, rebind payer-domain, return
  -> new candidate: rebind payer-domain before non-authoritative temp preparation
  -> create/write/fsync/close the private temp file only
  -> pre-link hook: rebind payer-domain
  -> sample injected time again after temp fsync
  -> rerun #2463 against the unchanged pre-write census
  -> require the exact same admitted liability bytes and reserved-after amount
  -> rebind payer-domain again
  -> sample injected time a final time and require the validated fee observation is still fresh
  -> create-only hard link + directory fsync for exact <liability_id>.json
  -> reread full census
  -> rerun #2463 with exact post-write census and the mutation-boundary time
  -> require exact idempotent replay and unchanged reserved-after amount
  -> rebind payer-domain again
  -> final root/records/queue visibility revalidation
  -> return stored
```

The same durable wei cannot be admitted twice by two cooperating store callers:
the complete payer-domain/census/time-sample/classify/publish/postcheck sequence
is inside one payer-scoped serialization domain.

The persistence API accepts an injected `read_now_ms()` dependency rather than
a caller-captured timestamp. New admission samples it after the full pre-write
census. For a new liability, the store then prepares and fsyncs the private
non-authoritative temp file before taking the second sample. A synchronous
pre-link hook rebinds the payer-domain, samples time again, reruns the canonical
economic classifier against the unchanged pre-write census, requires the exact
same liability bytes/reserved-after amount, and rebinds the payer-domain once
more. Because that full classifier may itself scan a large census, the hook then
takes a third lightweight time sample and requires monotonic time plus
`now < fee_observation.expires_at_ms` immediately before returning to the
create-only hard link. If fee/balance evidence expired while custody, census,
temp-file I/O, classifier refresh, or final payer rebind was in progress, the
store removes only the temp and HOLDS with no canonical liability. Both later
samples must be safe integers and may not regress. The post-write idempotence
classifier reuses the final hard-link-fence timestamp so a successful durable
append is judged against the final reviewed admission boundary rather than a
later wall-clock tick.
This proves ordering only: the store still reports
`trusted_time_source_proven=false`; later runtime composition must separately
bind a reviewed clock/time source.

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
3. file `fsync` and close;
4. run the synchronous pre-link payer/time/#2463 authority refresh;
5. after that potentially O(N) refresh, sample time once more and require the
   already-validated fee observation is still fresh;
6. create-only hard link to the canonical final name;
7. records-directory `fsync`;
8. unlink temp;
9. records-directory `fsync`;
10. exact final-byte reread.

A pre-link HOLD happens before step 5, so the reviewed temp remains
non-authoritative and is removed by cleanup.

A final name that appears after the locked pre-census is not accepted as a
normal concurrent success. Cooperating writers must serialize through the
pre-provisioned payer queue.

Once the canonical hard link has been created, any later fsync, reread,
post-census, classifier, or visibility failure is **not** reported as a clean
no-write HOLD. The decision returns `status=held_after_mutation`,
`mutation_performed=true`, and
`durable_state_requires_reinspection=true`. A caller must reread/reconcile the
durable store before taking another action. Exact retry of a valid already
published row remains idempotent.

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
- payer-domain replacement while queued HOLDS against the post-wait domain;
- payer-domain replacement after classification cannot produce clean success;
- fee evidence that expires during queue wait HOLDS using a post-wait time sample;
- injected time provider is not called before queue admission/census; new durable admission samples it three times (post-census, after temp fsync for the full classifier refresh, and once more after that refresh immediately before the hard link), while exact idempotent replay samples it once;
- fee evidence expiring during temp preparation or during the full refreshed-classifier/payer-rebind work HOLDS before the canonical hard link and leaves zero durable liability;
- first exact durable liability publication;
- exact replay idempotence under fresh fee observation;
- stale observation HOLD without mutation;
- nonce collision HOLD;
- corrupt durable economic record HOLD through #2463;
- unknown record-name HOLD;
- reviewed orphan-temp cleanup;
- concurrent near-balance contenders with exactly one durable success;
- injected failure after canonical hard-link publication, requiring explicit
  post-mutation HOLD plus idempotent retry; and
- explicit no-release/no-runtime/no-signing/no-funds authority.
