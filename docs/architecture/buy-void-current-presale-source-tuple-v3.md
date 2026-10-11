# Current Buy VOID presale source tuple V3

This successor began at cumulative source `e33959c711902cc30d61ac2b0e74caa4673a87e9` after both
inherited-array setter repairs. The existing first-original V4 and dual-rail
V3 tests now bind the current #2790 source generation with replay Git blob
`d873533dbe60f2efff2fefc19470ee963b4fead0` and allocation Git blob
`57a14a782549eb6c64d0a8f977f10e33d9e6bcda`; historical V2/V3
predecessors are unchanged and must continue refusing incompatible sources. Accepted predecessor proofs remain
byte-identical and are required to refuse the changed source.

Current source identities:

- preappend plain-input: `945cd55d92d4a76fe0d8bfaa237ca27d4753dc2f`;
- operator allocation dispatcher: `eb4fb37c6073415228b312663c45a99d5015c727`;
- dispatcher V3 proof: `df38ed1d0ba1bd6b74f7dbcac9b9dcdc249cea1f`;
- first-original handoff V4 proof: `ed31307a5fc0ae4644eba3b553e58e03cf1703d4`;
- crash matrix V5 proof: `5dc2d12e34e648d2dbfb8f1e79584caa2f8abc51`.

The mounted operator route remains payment-only. Custody reserve/recover,
installed Nimo V2, real payment acceptance, presale activation and funds
movement remain false.

## Dual-rail V3 synthetic handoff binding — October 10

The current source successor
`scripts/prove_buy_void_verified_payment_allocation_handoff_dual_rail_v3.ts`,
Git blob `ef5b351c3db19a9effe419b056de76dd473029ad`, is added without
changing runtime, wallet or customer source. It binds the current verified
allocation replay source `d873533dbe60f2efff2fefc19470ee963b4fead0`
and reservation ledger `57a14a782549eb6c64d0a8f977f10e33d9e6bcda`.

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
