# Buy VOID allocation JSONL replay: inherited Buffer/String framing source repair

## Independent source boundary and exact lineage

This **Draft, source-only** candidate is stacked on [first-original buyer
prototype-isolation #2776](https://github.com/6ZoSo9/void-node/pull/2776)
at exact head `247b67af34644013240d8eca3c9917f47bb50207`.
That parent protects original buyer R0 records from inherited JSON properties,
Array iteration and String-based JSONL framing. But it delegates allocation
history reconstruction to the **separate** canonical allocation reservation
ledger classifier, which still called `bytes.toString("utf8")` and
`text.endsWith("\\n") / .slice(...) / .split("\\n")` after detaching input
bytes. Its idempotent and newly planned ledger outputs also reused
`input.ledger_jsonl.toString("utf8")`.

Under the project's same-process prototype contamination threat model,
`Buffer.prototype.toString` can be overridden after input bytes are fixed:
for a nonempty invalid ledger, returning the empty string makes the legacy
classifier report a valid zero-record ledger instead of rejecting noncanonical
bytes. It can also erase already-verified original reservation history when
reconstructing an idempotent or new plan's returned JSONL prefix. This is
a reproducible source integrity failure model, **not** evidence of a live
exploit or observed customer ledger corruption.

## Bounded source replacement

Only `src/economic/buy_void_allocation_reservation_ledger_v1.ts` changes
(previous Git blob `66617a89d5ad9f81b5a21d98cca55fcda6902a80`).
The revised module:
- obtains byte length from the captured TypedArray intrinsic;
- treats only *zero original bytes* as an empty ledger;
- requires last octet LF, disallows raw CR and empty frames, caps rows;
- validates the **entire detached byte stream** with a fatal UTF-8 decoder;
- locates each JSONL frame by direct octet positions and a captured typed
  array `subarray`, never inherited Buffer/String framing methods;
- preserves the existing canonical parsed-record validator, hash-chain,
  duplicate-request/payment and inventory arithmetic checks;
- emits idempotent/new planned ledger prefixes through the same fatal
  TextDecoder from an independently detached Buffer rather than an
  inherited `Buffer.toString` call.

This does not repin earlier static attestation manifests, change durable
producer/allocator code, create missing reservations, or authorize any
runtime mutation.

## Exact-head negative/positive proof

A new standalone proof imports the **actual compiled allocation module**
and constructs one synthetic valid historical reservation using the existing
canonical planner before installing prototype mutations. It then poisons
`Buffer.prototype.toString`, `String.prototype.endsWith`,
`String.prototype.slice` and `String.prototype.split`, requiring:
nonempty valid history to remain 1 reservation; nonempty invalid input
to HOLD; idempotent retries to return the *entire identical* original
history; and adding a second reservation to preserve the original full
ledger as its prefix. A 3-byte malformed UTF-8 row, missing final LF,
blank frame and CRLF must also HOLD. Original record tip SHA remains
unchanged. Malicious prototype methods must report **zero invocations**.
Every prototype descriptor is restored in `finally`.

The workflow builds and runs that proof and the existing canonical
allocation reservation planner proof independently on Node 22/24/26,
then byte-compares the three no-funds receipts.

## Explicitly unqualified economics

This is only a primitive inside still-unmounted, source-only allocation
recovery. It does not prove that a buyer's first request came from an
independently authenticated descriptor, that `payment_verified` was fsynced,
that shared-capacity reservation/anti-rollback high-water is protected,
that Nimo's V3 witness is installed/qualified, or that exactly-once
reserve/recover has been accepted. There may also be separate inherited
Array/JSON/global intrinsic issues requiring independent review beyond
this specific Buffer/String framing test.

`descriptor_bound_read=false`,
`allocation_write=false`, `payment_verified_append=false`,
`production_allocation_mutation_ready=false`,
`presale_activation=false`, `funds_moved=false`.
No Ready/merge, runtime host/services, private customer ledger, key/wallet/
signer, transaction, Chain-2050/WC, treasury/liquidity, public presale/
market or funds action.

**PROTECT THE CORE.**
