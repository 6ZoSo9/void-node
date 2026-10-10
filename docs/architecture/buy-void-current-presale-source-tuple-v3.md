# Current Buy VOID presale source tuple V3

This successor binds the cumulative source at `e33959c711902cc30d61ac2b0e74caa4673a87e9` after both
inherited-array setter repairs. Accepted predecessor proofs remain
byte-identical and are required to refuse the changed source.

Current source identities:

- preappend plain-input: `945cd55d92d4a76fe0d8bfaa237ca27d4753dc2f`;
- operator allocation dispatcher: `eb4fb37c6073415228b312663c45a99d5015c727`;
- dispatcher V3 proof: `df38ed1d0ba1bd6b74f7dbcac9b9dcdc249cea1f`;
- first-original handoff V4 proof: `d33adb6d84fc96a9f65acbf319391c5d771f3a2d`;
- crash matrix V5 proof: `5dc2d12e34e648d2dbfb8f1e79584caa2f8abc51`.

The mounted operator route remains payment-only. Custody reserve/recover,
installed Nimo V2, real payment acceptance, presale activation and funds
movement remain false.

## Dual-rail V3 synthetic handoff binding — October 10

The current source successor
`scripts/prove_buy_void_verified_payment_allocation_handoff_dual_rail_v3.ts`,
Git blob `0fe46360aafce095123b6e25265c3dc300e52e41`, is added without
changing runtime, wallet or customer source. It binds the current verified
allocation replay source `435ed6000caad046f48fb318fbc7c865393f3b6c`
and reservation ledger `66617a89d5ad9f81b5a21d98cca55fcda6902a80`.

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
