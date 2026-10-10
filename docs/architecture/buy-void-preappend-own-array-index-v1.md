# Buy VOID preappend own-array-index data detachment V1

## Actual source-only P2 preappend trust-boundary repair

Stacked directly on the [cumulative first-original-buyer PR #2761](https://github.com/6ZoSo9/void-node/pull/2761)
at original frozen candidate head `c7e5993bb5fd4d8fb402762a56925a9ce9e25518`.
The preappend `snapshotBuyVoidPreappendPlainInputV1` uses safe own-data
descriptors when reading caller objects, snapshots nested arrays and
objects, and blocks inherited ambient `toJSON` callbacks. However, in the
existing source array branch it copied each accepted element using
`result[i] = copyValue(...)` into a NEW array hole. That assignment
consults `Array.prototype[i]`, so an ambient numeric **setter**
can run arbitrary JS during snapshot or suppress creation of the own
array element, silently changing the JSON event line.

A direct isolated Node 22.16.0 language-level reproduction verified that
`new Array(1); output[0] = "x"` invokes an inherited
`Array.prototype["0"]` setter and leaves the own index absent, while
`Object.defineProperty(output, "0", {value: "x", enumerable:true,
configurable:false, writable:false})` neither invokes the setter nor
loses the own data element.

This successor changes **only the assignment of each accepted array
element** to a descriptor-created own read-only numeric index. The
existing inherited `toJSON` shadow, strict input-prototype/accessor/
Proxy/sparse-array/cycle/bounds checks, original JSON index order,
record detachment, production authority flags, and final
`Object.freeze` behavior are unchanged.

## Exact compiled source and synthetic regression

The new `scripts/prove_buy_void_preappend_inherited_index_setter_v1.mjs`
uses the *real compiled* `dist/economic/buy_void_preappend_plain_input_v1.js`
module (never a handwritten replacement). It installs temporary
`Array.prototype["0"]` and `Array.prototype["1"]` setters and
tests their actual activation on a disposable separate array with the
same own `toJSON` shadow. It then snapshots nested event and request
arrays and requires **zero inherited setter calls** during snapshot.
Every numeric index must exist as an own, enumerable,
nonwritable/nonconfigurable data slot in the frozen copy. The resulting
JSON of the event and request must equal the exact original serialized
JSON bytes, including nested array item order. Both prototype
descriptors are restored in `finally` before proof assertions.

The Node 22/24/26 workflow does locked `npm ci --ignore-scripts`,
repository typecheck/build, the **existing unmodified positive/negative
preappend proof**, the new actual compiled-module inherited-setter
adversary, immutable-head/diff hygiene, and a byte-for-byte comparison of
three independent inert receipts.

## Authority and historical preservation

The only economic runtime change is the single array-index write in the
new candidate V1 file. This changes its reviewed Git blob; historical
versioned source proofs must correctly recognize the new generation
rather than be silently repinned or bypassed for an all-green status.
The original currently accepted first-original payment evidence and
the durable installed Nimo V1 witness remain separate immutable
generations. Fresh exact-head CI and independent review are required.

This is a **pure preappend in-memory repair**, NOT authentication of a
real buyer, native-USDC payment, original durable ledger, capacity lock,
`payment_verified` fsync, `allocation_reserved` fsync, custody high-water,
exactly-once allocation, Nimo installed V2, production signing,
source-finality runtime, or paired presale/WC launch.

`payment_verified_append=false`, `allocation_mutation=false`,
`presale_activation=false`, `funds_moved=false`.
No Ready/merge, deployment/host/service, private customer record,
wallet/key/signer, transaction, Chain-2050/WC, inventory/treasury,
liquidity, market activation or funds movement.

**PROTECT THE CORE.**
