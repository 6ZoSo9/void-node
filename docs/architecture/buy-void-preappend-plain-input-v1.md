# Buy VOID first-original preappend input — bounded plain data V1

## Scope and problem

This source-only repair is a direct child of the current [first-original
payment/allocation consolidation #2760](https://github.com/6ZoSo9/void-node/pull/2760).
Its predecessor V1 preappend replay classifier checked `isRow(input.request)`
and `isRow(input.event)` but then read caller fields and computed
`JSON.stringify(candidateEvent)` before strict payment identity validation.
An in-process `Proxy`, own getter or `toJSON` hook could therefore run
untrusted JavaScript or change the exact event bytes before the expected HOLD.
This is not an observed live attack or authorization to accept payments.

This branch modifies only the in-process *source-only classifier*, adds a
separate bounded plain-data snapshot module, a direct test of the **actual
compiled** preappend classifier and a Node 22/24/26 workflow. It leaves the
canonical payment identity, first-original buyer chronology, event digest,
allocation capacity math, durable writer and frozen historic V1/V2 witnesses
unchanged. It does **not** add or mount a payment/ledger writer.

## Fail-closed source rule

The fixed five-field outer container is inspected via **own data property
descriptors** and a native Proxy check before any caller property access.
Only exact keys `request`, `event`, `requests_jsonl`,
`prior_operator_events_jsonl` and `allocation_jsonl` are accepted.
`request` and `event` are recursively detached from the supplied object,
with native descriptor/prototype and Proxy checks, and fresh immutable
null-prototype objects preserving insertion-order JSON member serialization.

Objects with accessors, functions, undefined members, custom prototypes,
Proxies, cycles, symbols, hidden keys or a callable `toJSON` are rejected
without invoking those hooks. Dense ordinary arrays remain JSON-compatible,
but the detached array owns a nonenumerable `toJSON: undefined` property so
ambient `Array.prototype.toJSON` cannot execute. The maximum is
1 MiB across primitive data/keys, 10,000 nodes, 32 levels, 1024 object
members and 4096 array elements. This boundary deliberately rejects
ambiguous exotic inputs rather than inventing a new data interpretation.

The three JSONL Buffer fields continue to be independently checked and
copied by the existing retained-native-typed-array intrinsic guard; the
new helper does NOT read or trust their JS hooks and does not change their
accepted byte lengths, row ordering or downstream ledger arithmetic.

## Synthetic regression

The focused new proof imports the actual compiled module from `dist`,
runs a completely synthetic native-USDC first-original buyer and V2 verified
event and requires the original approved `ready` decision with the exact
SHA-256 commitment to the unmodified `JSON.stringify(event)+"\\n"`
bytes. Then it tries outer/event/request accessor, Proxy, own/nested toJSON,
custom prototype, undefined and oversized fields, cyclic objects and sparse
arrays. All malformed cases must HOLD **without any user hook invocation**.
It also explicitly tests that ambient Object/Array `toJSON` callbacks
cannot alter serialization of the isolated candidate snapshot.

The existing direct replay/first-original test is rerun unchanged. The
new matrix typechecks and builds the actual repository on Node 22, 24, 26,
then compares the source-only proof receipts byte-for-byte.

**Limit:** This proof is specifically for supplied in-process request/event
objects. Other historical `JSON.parse`/JSONL canonicalization and ambient
prototype risks, if any, need their own review; this is not a claim that
all previously parsed ledger rows are immune to global runtime mutation.
The source-only result does not authenticate a payment receipt or guarantee
fsync, protected high-water, cross-UID witness IPC, or exactly-once recovery.

## No production authority

`operation_performed=false`, `production_allocation_mutation_ready=false`,
`presale_activation=false` and `funds_moved=false`.
No Ready/merge/deploy, host/Nimo/customer data, credentials, wallets/signers,
transactions, Chain-2050/WC, inventory/treasury/liquidity or funds actions.
The parent and its ongoing security/CI reviews remain independent.

**PROTECT THE CORE.**
