# Combined original-buyer replay and allocation plain-data boundary

This **unaccepted source-only candidate** composes two disjoint reviews:
[buyer replay Buffer fix #2757](https://github.com/6ZoSo9/void-node/pull/2757),
exact head `f2ecc73ab789a004e394e5982fb1346a290196a5`,
and [allocation input hardening #2720](https://github.com/6ZoSo9/void-node/pull/2720),
exact head `a184d5cadb087d046ea3a07d5fd01fc9c45fd78c`.

The original-buyer replay module and its full proof are preserved
byte-for-byte: source Git blob `895a429ec7a2ef554552cdaa821731d7a645a701`,
proof blob `5d82d77996ba5d94e3d01c953f7493d1f4401ab2`.
The original allocation planner in the buyer branch was still
`c3fc204710a9189723651cfeb6ffc52b1aa049db`, matching the old
source of #2720. Its replacement Git blob is
`66617a89d5ad9f81b5a21d98cca55fcda6902a80`, copied exactly,
together with #2720's unchanged source proof, workflow and review note.
The already-correct public allocation producer proof at blob
`6f220e3c468277cc4e8eb88e3ba3d9a46ca62e2f` is not rewritten.

The new combined runner requires exact immutable blob pins, executes the
full original allocation ledger test, the extra plain-data/Buffer/getter/
Proxy/inherited-toJSON rejection tests, and the full original-buyer replay
proof against one combined current TypeScript build. CI runs on Node
22/24/26 and requires identical fixed no-authority receipts from all
three independent builds.

This is a **compatibility and security-regression proof only**. It
does not verify any fsynced original customer payment or permit writing an
`allocation_reserved` row. Changed compiled allocation bytes correctly
invalidate old frozen witness and artifact manifests; no historical pin is
rewritten and no previous CI result transfers automatically. Independent
review, original request/payment finality, protected custody/witness high-
water, authenticated operator principal, cross-UID exactly-once
reserve/recover, installed current Nimo V2 and a signed coupled launch
generation remain separate blockers. The actual server producer remains
unmounted from protected allocation custody.

No customer record, keys, wallet, signer, RPC, service, Chain2050/WC,
inventory, market, treasury, presale activation or funds are accessed.

**PROTECT THE CORE.**
