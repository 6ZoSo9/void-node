# Buy VOID: immutable request DTO across payment fsync and allocation

This **source-only Draft** is stacked on the exact [#2663](https://github.com/6ZoSo9/void-node/pull/2663)
head `6cc6e11db61e6ff6726bb50c7b6801a1df355d41`. No production
host, service, account, wallet, transaction or real ledger is touched.

## Reproduced P1 that requires this change

The independent [negative Draft #2671](https://github.com/6ZoSo9/void-node/pull/2671)
proved an unmounted API defect with disposable request/operator/allocation
files. Focused Node22/24/26 + cross-node **4/4 CI passed**: the writer
fsynced the correct buyer event, the caller changed `delivery_address`
in its supported `test_only_after_payment_fsync` hook, and the allocator
persisted a wrong buyer reservation **before** strict postcheck HELD.
Honest replay could not rewrite that append-only reservation.
All three exact-head negative receipts were independently downloaded and
matched byte-for-byte, SHA-256:
`e0fe49c7933ccf3935c53cbac917189343353f6cddc74994835e29322cb68ff7`.
This is not evidence of a remotely exploitable payment route or a
production customer compromise.

## Bounded source repair

Existing writer source correctly canonicalizes the V2 payment **event**
once into an immutable JSON value and exact event-byte Buffer, and
validates buyer/source/receipt/launch against the first durable request
while holding global capacity and request locks. But it previously kept
`const request=input?.request` as a mutable caller object after that
check and fsynced payment. The allocator read that mutable object later.

The new `canonicalVerifiedPaymentCallerRequestV1` copies the JSON request
**once at API entry**, bounds its size, parses the result to a detached
object, verifies exact roundtrip bytes and deeply freezes it. The same
snapshot is supplied to the existing capacity/launch/preappend checks
and later allocation planner/strict replay, including replay repair.
The separate original first-durable buyer ledger and existing strict
preappend classifier remain authoritative. This does not grant authority
to invent a new original request or a second payment identity.

No event serializer, append/fsync order, duplicate/capacity lock,
allocation writer, external high-water custody, historical V1 reviewed
writer hash or V2 native-USDC verifier is changed.

## Focused positive adversaries

The real unmounted writer runs on private `os.tmpdir()` fixtures inherited
from the already-qualified negative Draft. The tests require normal
honest payment+allocation; immutable canonical allocation despite
**after-fsync** caller changes to wallet, quote and nested launch identity;
an async launch callback modifying the original input cannot poison
allocation; unstable caller `toJSON` executes exactly once; and wrong
first buyer continues to HOLD before fsync without writing anything.
Strict replay must return `allocation_present` and an honest retry must
leave payment and allocation bytes unchanged. Exact-head Node22/24/26
typecheck, build and byte-identical positive receipts are required.

Even a green focused suite qualifies only this narrow source-level
request snapshot mutation gate. True first-original buyer custody,
protected high-water external witness, exact V2 custody writer,
real RPC/finality, deploy/package identity, operator authentication,
exactly-once fulfillment, signers, Chain2050 and coupled WC/VOID launch
remain separate HOLDs.

Keep Draft/unmerged. No Ready/merge, host, customer records, keys,
wallet/signers, payment, transaction, Chain-2050/WC, inventory/treasury,
presale/market or funds action. **PROTECT THE CORE.**
