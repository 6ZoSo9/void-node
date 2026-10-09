# Buy VOID custody permanent fence — mutable input buffer negative witness

## Target and observed source-order risk

This source-only negative witness is stacked on [Draft #2715](https://github.com/6ZoSo9/void-node/pull/2715)
at exact source head `b06af6228cb3009721ef64d7a1523fbf4141df5f`.
The create-only fence storage implementation is **UNMOUNTED**, and this proof
does not touch a real custody path, operator record, service, wallet, signer
or customer payment.

The exported `createOnlyBuyVoidCustodyHighWaterFenceRecordV1({record_bytes})`
accepts a caller-owned mutable Node `Buffer`. The function initially
`parseBuyVoidCustodyHighWaterTransitionFenceV1(record_bytes)` to validate
the exact canonical fence record and derive its permanent slot ID. It then
performs several filesystem operations *before* writing the **same Buffer**
to the newly created `O_CREAT|O_EXCL` slot. Its durable readback comparison
and replay path also compare to that same caller Buffer. There is **no
detached snapshot** tying the authenticated data to the bytes written.

If that Buffer changes after parsing but before `writeAll`, the stored
record can be different from the validated fence record. The write still
may return `status="created"`, `record_durable_observation=true`, and
`stored_record_sha256` representing the **earlier verified** contents.
The slot is correctly permanent and cannot be deleted automatically; if
the written bytes are malformed, future valid replay HOLDS. The permanent
storage safety mechanism can therefore preserve a corrupt record and
misreport its digest.

This is a **conditional source data-ownership flaw**, not evidence that
a current custody actor is malicious, a live deployment is affected or that
external input can reach this function. A shared backing ArrayBuffer or a
caller side effect between synchronous operations could be relevant. The
proof uses deterministic injected filesystem interception solely to locate
this timing window; no real filesystem attacker is assumed.

## Exact original-source witness

`scripts/prove_buy_void_custody_fence_mutable_input_negative_v1.mjs` imports
the original #2715 storage and transition-fence modules directly. It first
creates a known-good fence under a fresh private OS-temp directory. For a
second private directory, it provides a **separate caller-owned copy** of
the canonical record and injects a one-byte mutation immediately after
the original storage function's successful exclusive file create, before
`writeAll`. The mutation changes a digest character within the canonical
`next_high_water_sha256` property, preserving record size and JSON shape
but invalidating the underlying next-high-water binding.

A **GREEN negative test means the original defect reproduced**:
- storage reports created/durable with the PRE-mutation digest;
- permanent record bytes equal the POST-mutation caller buffer;
- the on-disk file's SHA-256 differs from the returned stored digest;
- the original parser rejects the permanent record's hash binding;
- a subsequent attempt to replay the validated original record HOLDS,
  leaving the corrupt permanent slot unchanged.

Only temporary files are created. The test restores the original `fs.openSync`
hook in a `finally` block and cleans the OS-temp directory. It never
writes, repairs, or deletes a real fence. Hosted CI runs this actual-source
negative proof independently on Node 22/24/26 and compares receipts
byte-for-byte.

## Safe repair and distinct remaining gates

A narrow production-candidate repair should **copy `record_bytes` at the
function boundary into a private detached Buffer** before any validation,
then use *that same immutable owned snapshot* for parsing, exact slot
identity, the exclusive write, existing-slot classification, readback,
and the reported digest. The review should explicitly test caller Buffer
mutation after the snapshot and between the filesystem milestones. Any
mutable/SharedArrayBuffer-backed input must not influence a previously
authenticated transition.

Do not waive the permanent-fence conflict or remove corrupt records to
make this test pass. After repair, the negative witness should flip to a
**HOLD of corrupted input**, while the normal clean-create/replay and the
real cross-process contention proofs remain green.

Separate #2714 exclusive locking, #2713 high-water writer, unmounted
#2715 permanent fence storage, custody ownership across UIDs, first
durable buyer/payment provenance, exactly-once allocation and coupled
WC/VOID presale remain distinct launch gates. This witness grants no
`production_allocation_mutation_ready`, no deployment, signer/keys,
chain mutation, inventory movement or funds transfer.

**PROTECT THE CORE.**
