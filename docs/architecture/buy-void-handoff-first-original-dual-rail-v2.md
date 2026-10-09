# Buy VOID first-original buyer: Base and Ethereum real handoff V2

## Purpose

The reviewed [first-original V2 real-filesystem handoff Draft #2744](https://github.com/6ZoSo9/void-node/pull/2744)
exercises actual source-only payment→allocation handoff and crash replay on
**Base**. The public checkout/payment policy permits both canonical
native-USDC rails: Base (chain ID 8453) and Ethereum (chain ID 1).
A separate cross-rail end-to-end regression is required before claiming
the source handoff tests qualify *both* rails.

This Draft stacks on exact #2744 head
`5b33a6b5937912753de486d863af06c97a11e9c2`.
It changes **only** one new script, one new GitHub Actions workflow, and
this documentation. Original handoff V1, first-original-wallet V2,
capacity admission, replay ledger, high-water, Nimo witness, operator
routes, immutable historical proof manifests and installed services
are untouched.

## Test contract

`scripts/prove_buy_void_verified_payment_allocation_handoff_dual_rail_v2.ts`
pins the Git blobs of the existing handoff, replay, ledger, high-water,
old V1 and current V2 first-original proof sources before running any
test. It imports the actual reviewed handoff source API and constructs
ordinary private 0700 OS-temporary request/allocation/high-water directories
and 0600 synthetic JSONL files. The test supplies only fixed invented
buyer/treasury addresses, event IDs, launch receipt IDs and payments;
**no RPC, actual payment or customer file is accessed**.

It requires the following:

- Base native-USDC `0x833589fcd6edb6e08f4c7c32d4f71b54bda02913` and
  Ethereum native-USDC `0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`
  each produce one deterministic `payment_verified` and
  `allocation_reserved` record from independent first-original buyer IDs.
- Deliberately using the **same exact transaction hash and log index 7**
  on the two different chains produces `voidpay1:base:<tx>:7` and
  `voidpay1:ethereum:<tx>:7`, not a duplicate/collision.
- Replaying both verified payments creates no additional payment or
  allocation row and leaves request, operator, allocation and high-water
  bytes exactly unchanged.
- On Ethereum, first-original delivery wallet **absent, null or empty**
  followed by a complete later request must HOLD with no event, allocation
  or high-water mutation.
- A changed original source-chain or conflicting payment-chain alias
  must fail as invalid historical lineage; a Base USDC contract substituted
  into an Ethereum original request must not become native Ethereum USDC.
- Legitimate original Ethereum wallet with late transaction hash and
  receive-address binding can still create exactly one immutable payment
  and allocation reservation.

The new exact-head Node 22/24/26 workflow first reruns the unchanged
#2744 V2 real-handoff proof, then the dual-rail scenarios, requires every
explicit production/money authority signal false, uploads complete deterministic
stdout receipts and compares the bytes across all three Node versions.

## HOLD and production requirements

This test qualifies **only local synthetic dual-rail handoff semantics**.
The Ethereum receipt is an inert fixture, NOT a real provider quorum,
authenticated canonical finalized log or source-chain payment.
The original buyer request file is written by the fixture; it is not a
live first-fsynced immutable customer request. The callback used as launch
authority is synthetic. The private Nimo V2 witness, installed cross-UID
custody fencing/locks, durable real payment and allocation recovery,
mounted and independently authenticated operator dispatcher, exact
deployed runtime/packaged identity and coupled presale/WC launch all
remain unqualified.

`runtime_integration=false`,
`protected_high_water_custody_proven=false`,
`production_gate_ready=false`, `presale_activation=false`, and
`funds_movement=false`.

No Ready/merge, host/service installation, keys/wallet/signer, live customer
ledger/payment, Chain-2050/WC, transaction, treasury/liquidity, allocation
of real VOID, public presale, market or funds action.

**PROTECT THE CORE.**
