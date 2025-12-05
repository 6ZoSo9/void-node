# Obelisk Wallet — WorkCredits "Wallet" Tab Model (Dev Draft)

This doc defines the **API surface** that the Obelisk Wallet "Wallet" tab
uses to talk to the Work Credits / relayer layer in `void-node`.

The goal is to keep the UI dumb:

- The UI **does not** construct EIP-712 payloads.
- The UI **does not** know about relayer URLs or stub vs mainnet.
- The UI calls a small set of async functions and renders the result.

---

## Types (see `src/obelisk_wallet_workcredits_tab_model.ts`)

Key types:

- `WorkCreditsWalletBalances`
  - `address`
  - `voidBalanceWei`
  - `wcBalanceWei`
  - `pendingWCWei`

- `WorkCreditsWalletSendVoidPreview`
  - `intent = "SEND_VOID"`
  - `balances`
  - `voidNeededWei`
  - `wcFeeWei`

- `WorkCreditsWalletSendVoidResult`
- `WorkCreditsWalletCollectPendingResult`
- `WorkCreditsWalletSendWCPreview`
- `WorkCreditsWalletSendWCResult`

All numeric values are **wei strings** (no BigInt in the UI boundary).

---

## Interface: `WorkCreditsWalletTabModel`

Methods the Wallet tab can depend on:

- `reloadBalances(): Promise<WorkCreditsWalletBalances>`
- `previewSendVoid({ to, amountVoidWei })`
- `sendVoid({ to, amountVoidWei })`
- `collectPendingWC()`
- `previewSendWC({ to, amountWCWei })`
- `sendWC({ to, amountWCWei })`

The current dev implementation will be backed by:

- `wc-relayer-dev` on `:4311`
- Stub contracts in `config/obelisk-workcredits-dev.json`
- The EIP-712 demo + wallet API helpers we already wired:
  - `walletQuoteSendVoidDev`, `walletSignAndSubmitSendVoidDev`
  - `walletCollectPendingWCDev`, `walletQuoteSendWCDev`, `walletSignAndSubmitSendWCDev`

Later, a mainnet implementation will satisfy the **same interface** but:
- Use real mainnet contracts for VOID / WC / LLP / Relayer.
- Return real transaction hashes and statuses instead of SIMULATED ones.

This keeps the Obelisk Wallet UI stable while we evolve the backend.
