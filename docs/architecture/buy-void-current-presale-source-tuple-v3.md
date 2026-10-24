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
- range/alias-repaired mounted router: `a09661797aa4295371c036be36d82995e5233269`;
- current dispatcher V6 proof: `1ef5cd61a338cf726ddec59cea24932846d8d1fb`;
- frozen dispatcher V3/V4/V5 proofs: `794b3bb8e2c386be7fad607a3adf79aadff5332d`, `752deafb5a8ff884cfcfc0ff7ef8fded2a92287b`, `9113830d86e60d818ddf10d6381fb285b534d008`;
- first-original handoff V4 proof: `2f17db9bb68ab40cc7e3d541d3d3a731f3d87442`;
- frozen crash matrix V5 proof: `5dc2d12e34e648d2dbfb8f1e79584caa2f8abc51`;
- current crash matrix V6 proof: `6d0d489eba7964d82e104c8824f1ebdb0da9e397`.

The mounted operator route remains payment-only. Custody reserve/recover,
installed Nimo V2, real payment acceptance, presale activation and funds
movement remain false.

## Dual-rail V3 synthetic handoff binding — October 11 source successor

The current source successor
`scripts/prove_buy_void_verified_payment_allocation_handoff_dual_rail_v3.ts`,
Git blob `dc5967516fda605e8cf33890cc687c4ce70d11ad`, is added without
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

The current V4 handoff and dual-rail V3 proofs also bind the hardened
nonpayment terminal writer Git blob
`101ce2eb806b2adb21035ed8b72874ba2b0026d3`; their earlier proof
blobs `ccb271e34b67dca07683198d84a0a9449f46729e` and
`6f305cc3fe1f3003ce73692a41a72f8ab09b00ab` remain historical Git generations,
not current-positive evidence. The frozen first-original V3 proof is
immutable and rejects the *earliest* mismatching historical replay blob
`435ed6000caad046f48fb318fbc7c865393f3b6c` against the successor
`b451bcd895986dadaf6e53954671062068316ccf` before reaching any later writer comparison.

## October 11 — native byte-framed terminal-history source successor

The current nonpayment writer `101ce2eb806b2adb21035ed8b72874ba2b0026d3`
now validates complete operator JSONL by captured native fatal UTF-8
decoding, byte-position LF frames, native JSON.parse/stringify and
null-prototype parsed rows. This prevents post-import modifications of
`String.prototype.split`, `TextDecoder.prototype.decode`, global JSON
methods and inherited `Object.prototype.toJSON` from silently hiding a
previously durable fulfilled event in the central under-lock status check.
The existing actual-writer synthetic regression exercises those malicious
hooks with positive controls and still requires zero operator append and
no newly published sidecar on rejection. No historical frozen V1–V5
source/proof bytes were changed.

**Limitations still blocking production:** after history inspection, the
pinned journal descriptors are released before the path-based append, leaving
a same-UID pathname replacement race. A crash between journal append and
sidecar publication also requires separately reviewed durable recovery.
The pre-lock public route's tolerant reader is not itself authenticated as
complete canonical history. No payment/custody/presale/funds authority follows.

## October 11 terminal writer-lock source successor

The current V3 dispatcher proof now requires central nonpayment writer
`101ce2eb806b2adb21035ed8b72874ba2b0026d3` and has reviewed
Git blob `f059b42d5befeab94a0b162ce9558375d85b7e76`. The previous
dispatcher V3 proof `df38ed1d0ba1bd6b74f7dbcac9b9dcdc249cea1f` and writer
`f591f7407d9afc2cf77e0f90923aa11b4817fd4e` are historical
generations. Frozen V1/V2 dispatcher proofs remain unchanged and are
required to reject incompatible current source. The mounted verified-payment
allocation dispatcher remains disabled; source green never grants payment
acceptance, custody reserve/recover, presale activation or funds movement.


## October 20 — range-enabled router current-generation successor

The machine-readable bounded-range source generation changes the complete
`src/index.ts` identity to
`a09661797aa4295371c036be36d82995e5233269` without changing the
operator allocation dispatcher source
`eb4fb37c6073415228b312663c45a99d5015c727`.

The current presale-tuple workflow therefore preserves dispatcher V1–V5 as
immutable historical generations. V4 must refuse its reviewed router
`40239e0f76aa1edce43523d18c1b57691e41e8cf` against current
`a0966179...`; V5 must likewise refuse reviewed
`123ec1792a027f93d4c9030749a0e7e136a75a44` against current
`a0966179...`. Dispatcher V6 is the sole current-positive source proof and
binds exact proof blob `1ef5cd61a338cf726ddec59cea24932846d8d1fb`.

This is source-generation reconciliation only. The mounted operator producer
remains the legacy payment-only path; verified-payment allocation dispatch,
installed custody, customer payment acceptance, presale/WC activation,
transaction signing/broadcast, treasury/liquidity action and funds movement
remain false.
