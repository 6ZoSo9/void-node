# Participant WC -> VOID current status

status: green_precision_local
checkpoint: ckpt-wc-to-void-trade-state-copy-green-20260601-081303
head: 4ed40f5f

previous_readiness_checkpoint: ckpt-participant-wc-to-void-readiness-proof-green-20260601-023517
previous_readiness_head: c3f3da96

## What is proven

- Participant Earn is public-safe manual mode.
- Automatic background earning can be disabled while Run Once still works.
- Local WC can be bridged/redeemed to on-chain WC.
- WC -> VOID pool exists and quote/build path works.
- Participant native wallet status exposes native gas truth.
- Precision local devnet wallet has native gas.
- Precision local devnet 1 WC -> VOID swap executed successfully through participant native wallet path.
- WC -> VOID readiness proof is no-mutation by default.
- Participant trade UI now clearly shows the three trade states: Needs Devnet Gas, Unlock Native Wallet, and Approve + Swap WC for VOID.

## Precision local swap proof

scope: Precision_local_devnet_only
account: zoso
wallet: 0x1101A058E98eDCD775c93E26900d1DdBbdfa5d31
amount_wc: 1
quoted_void: 0.009949761205253482
approve_tx_hash: 0xeba1adf1b0b719291cdd5d7acad4ab59b3b70dbc91000bf8c2ba28ef4d573b6e
swap_tx_hash: 0xbc5299681673daf67543cf247dec8b86955ba1c337a75dfdfab2f5c6fba5eb6a
closeout_log: /tmp/wc-to-void-1wc-local-swap-closeout-20260601-022741.log

## Readiness proof

target: make participant-wallet-wc-to-void-readiness-proof
script: ops/mainnet0/participant-wallet-wc-to-void-readiness-proof.sh
mutation: false
checks:
- local chain 2050
- node ready/gap/txroot
- wallet native gas greater than zero
- relayer health
- build-wallet-trade approve/swap plan for 1 WC
- served Earn/Trade truth copy
- mainnet0 status smoke

validation_log: /tmp/wc-to-void-readiness-proof-fixed-20260601-023308.log
quoted_void_in_readiness_log: 0.009949363226744477

## Cross-box caveat

Alienware is synced to c3f3da96 / ckpt-participant-wc-to-void-readiness-proof-green-20260601-023517, but the WC -> VOID readiness proof must not be run on Alienware unless Alienware local Anvil wallet is intentionally funded.

Alienware caveat:
- alienware_proof_not_run: true
- alienware_reason: local_anvil_wallet_unfunded_native_gas_0
- alienware_wallet_native_gas: 0.0

crossbox_closeout_log: /tmp/wc-to-void-readiness-proof-crossbox-closeout-20260601-023914.log

## Trade state copy polish

checkpoint: ckpt-wc-to-void-trade-state-copy-green-20260601-081303
head: 4ed40f5f
crossbox_closeout_log: /tmp/wc-to-void-trade-state-copy-crossbox-closeout-20260601-082646.log

served_states:
- WC→VOID state: Needs Devnet Gas
- WC→VOID state: Unlock Native Wallet
- WC→VOID state: Approve + Swap WC for VOID
- Unlock Native Wallet before trading

## Current next step

WC -> VOID is closed for this lane.

Future optional improvements:
- Add a trade history/receipt panel so users can see recent approve/swap tx hashes without reading raw JSON.
- Add a safer user-facing local-devnet gas explanation, but keep any funding helper ops-only and fail-closed.
- Keep Alienware gas-dependent readiness proof disabled unless Alienware local Anvil wallet is intentionally funded.
