# Current Buy VOID presale source tuple V3

The historical source stack began at `e33959c711902cc30d61ac2b0e74caa4673a87e9`.
The **current source-only #2790 successor** captures the native SharedArrayBuffer predicate at module initialization and refuses shared-backed allocation and replay Buffers and uses a captured replay byte length for every JSONL frame. It binds native fatal UTF-8 calls and
native byte-length, copy, subarray and ArrayBuffer-slice invocations at module
initialization. Current replay source:
`b451bcd895986dadaf6e53954671062068316ccf`;
current allocation source:
`8d84955e1e093a5c5af63241e62b8722fadd2f29`.
Original replay `d873533dbe60f2efff2fefc19470ee963b4fead0`
and allocation `57a14a782549eb6c64d0a8f977f10e33d9e6bcda`
remain historical predecessor blobs. Frozen V2/V3 proof bytes remain unchanged
and must continue rejecting incompatible source generations.

Current source identities:

- preappend plain-input: `945cd55d92d4a76fe0d8bfaa237ca27d4753dc2f`;
- operator allocation dispatcher: `eb4fb37c6073415228b312663c45a99d5015c727`;
- dispatcher V3 proof: `a651e42c02a7127cf445e545de77292c29cbe2bc`;
- first-original handoff V4 proof: `ccb271e34b67dca07683198d84a0a9449f46729e`;
- frozen crash matrix V5 proof: `5dc2d12e34e648d2dbfb8f1e79584caa2f8abc51`;
- current crash matrix V6 proof: `6d0d489eba7964d82e104c8824f1ebdb0da9e397`.

The mounted operator route remains payment-only. Custody reserve/recover,
installed Nimo V2, real payment acceptance, presale activation and funds
movement remain false.

## Dual-rail V3 synthetic handoff binding — October 11 source successor

The current source successor
`scripts/prove_buy_void_verified_payment_allocation_handoff_dual_rail_v3.ts`,
Git blob `6f305cc3fe1f3003ce73692a41a72f8ab09b00ab`, is added without
changing runtime, wallet or customer source. It binds the current verified
allocation replay source `b451bcd895986dadaf6e53954671062068316ccf`
and reservation ledger `8d84955e1e093a5c5af63241e62b8722fadd2f29`.

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

## October 11 terminal writer-lock source successor

The current V3 dispatcher proof now requires central nonpayment writer
`cd255c42b0e4b331a1316351cc729f5f934aad50` and has reviewed
Git blob `a651e42c02a7127cf445e545de77292c29cbe2bc`. The previous
dispatcher V3 proof `df38ed1d0ba1bd6b74f7dbcac9b9dcdc249cea1f` and writer
`f591f7407d9afc2cf77e0f90923aa11b4817fd4e` are historical
generations. Frozen V1/V2 dispatcher proofs remain unchanged and are
required to reject incompatible current source. The mounted verified-payment
allocation dispatcher remains disabled; source green never grants payment
acceptance, custody reserve/recover, presale activation or funds movement.
