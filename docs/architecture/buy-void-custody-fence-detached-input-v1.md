# Buy VOID custody permanent fence: detached record input V1

## Exact narrow fix after independent negative reproduction

[Draft #2716](https://github.com/6ZoSo9/void-node/pull/2716)
is a pure negative-test child of the original create-only permanent fence
[Draft #2715](https://github.com/6ZoSo9/void-node/pull/2715) at
`b06af6228cb3009721ef64d7a1523fbf4141df5f`.
The negative test is **15/15 exact-head CI green**, including Node 22/24/26
and cross-node equality. Here **green meant the source defect reproduced**:
the unmounted writer validated the caller's mutable Buffer, then permitted
an injected Buffer mutation after exclusive file-create but before write.
It returned `status=created` with an old `stored_record_sha256`
despite permanently writing corrupted bytes. Subsequent replay could
not repair that damaged permanent slot (correct no-unlink behavior).

This branch is an independent **source-only proposed repair** stacked
directly on the original #2715 source head. It does not mutate #2715
or merge the negative witness; the original failure evidence is retained.

## Implementation

`src/economic/buy_void_custody_high_water_fence_storage_v1.mjs`
now creates `verifiedRecordBytes = Buffer.from(record_bytes)` immediately
after validating the input is a bounded Node Buffer. It then uses **only
that private detached snapshot** for all trust-bearing operations:

- `parseBuyVoidCustodyHighWaterTransitionFenceV1(verifiedRecordBytes)`,
  including the permanent `voidchwf1_` slot ID;
- `O_CREAT|O_EXCL|O_NOFOLLOW` path and exact file write;
- `EEXIST` replay classification and later durable reread;
- postwrite byte equality; the parse result's reported digest.

The snapshot is not exposed to caller callbacks. The caller's original
Buffer may change without altering the already-verified canonical record
or successful replay. No source finality, payment, lock, launcher, reserve,
recover, service mount, signer or treasury operation changes.

## Synthetic regression

The new `scripts/prove_buy_void_custody_fence_detached_input_v1.mjs`
uses the exact original regression fixture and the actual storage source.
It creates only temporary owner-private directories, validates healthy
normal create, then flips a character within the supplied mutable
`next_high_water_sha256` **after successful exclusive creation**.
It requires the now-private canonical bytes, NOT mutated caller bytes,
to be written and returned; verifies the durable hash, strict fence
parser, unchanged permanent inode, and valid same-record idempotent
replay. Attempted replay with the mutated invalid caller buffer HOLDS,
without changing the good permanent slot.

The exact-head Node 22/24/26 workflow runs this proof and compares the
three output receipts byte-for-byte. The original owner's cross-process,
no-reap-on-failure, symlink and fsync-fault suite must pass too.

## Remaining launch boundary

This fixes **one input data-ownership bug** in a source-only,
unmounted permanent-fence storage candidate. It is NOT integration of
the high-water writer with the permanent fence, nor proof of the
cross-UID custody, failed-fsync recovery, signing, verified buyer/payment
lineage, allocation at-most-once semantics, or protected production
high-water. All those gates and the coupled WC/VOID presale remain HOLD.

No Ready/merge/deploy, real customer file, signer/wallet/key, Chain-2050/WC,
transaction, inventory, treasury/liquidity or funds action.

**PROTECT THE CORE.**
