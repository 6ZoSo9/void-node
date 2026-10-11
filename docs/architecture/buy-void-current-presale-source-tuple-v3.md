# Current Buy VOID presale source tuple V3

The historical source stack began at `e33959c711902cc30d61ac2b0e74caa4673a87e9`.
The **current source-only #2790 successor** refuses shared-backed allocation Buffers and uses a captured replay byte length for every JSONL frame. It binds native fatal UTF-8 calls and
native byte-length, copy, subarray and ArrayBuffer-slice invocations at module
initialization. Current replay source:
`e3c659194a95394dd53b1960aed559e3950a89e1`;
current allocation source:
`9debe79943ba4622bb6b976ccbcfabf36b8429e3`.
Original replay `d873533dbe60f2efff2fefc19470ee963b4fead0`
and allocation `57a14a782549eb6c64d0a8f977f10e33d9e6bcda`
remain historical predecessor blobs. Frozen V2/V3 proof bytes remain unchanged
and must continue rejecting incompatible source generations.

Current source identities:

- preappend plain-input: `945cd55d92d4a76fe0d8bfaa237ca27d4753dc2f`;
- operator allocation dispatcher: `eb4fb37c6073415228b312663c45a99d5015c727`;
- dispatcher V3 proof: `df38ed1d0ba1bd6b74f7dbcac9b9dcdc249cea1f`;
- first-original handoff V4 proof: `70fb63fa97e95fe628d131016c9607b9ed931ed3`;
- frozen crash matrix V5 proof: `5dc2d12e34e648d2dbfb8f1e79584caa2f8abc51`;
- current crash matrix V6 proof: `8a0bdc976ac1a94853ce79f83f8187ccd85bb321`.

The mounted operator route remains payment-only. Custody reserve/recover,
installed Nimo V2, real payment acceptance, presale activation and funds
movement remain false.

## Dual-rail V3 synthetic handoff binding — October 11 source successor

The current source successor
`scripts/prove_buy_void_verified_payment_allocation_handoff_dual_rail_v3.ts`,
Git blob `f260303cd982e9979d938e3f4f5d61bb9631f8cd`, is added without
changing runtime, wallet or customer source. It binds the current verified
allocation replay source `e3c659194a95394dd53b1960aed559e3950a89e1`
and reservation ledger `9debe79943ba4622bb6b976ccbcfabf36b8429e3`.

The historical dual-rail V2 proof is unchanged (Git blob
`7f33974b448e92be7d62c6f1d21d3fa29d7d5f0b`), and both current
workflows require it to reject the successor's changed replay identity.
The new proof uses disposable local files, separate synthetic Base and
Ethereum payment identities, idempotent replay, original-buyer and native
contract refusals. The existing Node22/24/26 source-tuple workflow compares
four independent receipts (crash, original-buyer, dispatcher and dual-rail)
byte-for-byte across all three versions.

No live chain finality or customer receipt, signer, installed Nimo witness,
separate custody-UID authority, payment-to-allocation routed dispatch,
independent high-water durability, WC/VOID market, or funds are qualified.
These remain HOLD until separately authorized, installed and accepted.
