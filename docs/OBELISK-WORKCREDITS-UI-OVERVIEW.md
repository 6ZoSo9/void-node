# Obelisk Wallet — Work Credits UI Overview

This document ties together the Work Credits (WC) pieces that Obelisk Wallet uses on the VOID Devnet.

High-level goals for humans:

- See balances for VOID, WC, and pending WC.
- Toggle between using the Work Credits relayer vs paying gas directly (later).
- Send VOID and WC to other addresses.
- Collect pending WC.
- Trade WC <-> VOID via a simple trading view (buy/sell orders).
- Keep the UI logic thin: wallet/trading tabs talk to TypeScript interfaces, not raw RPC.

The code is split into layers:

1) Core schemas and shared types

- File: src/obelisk_wallet_workcredits_schema.ts
- Responsibility:
  - Define WeiString and basic WC/VOID types.
  - Define typed results for:
    - Quotes and submits via the WC relayer.
    - Wallet-level actions (send, collect, etc.).
    - Any other shared pieces needed by wallet or trading tabs.

The Obelisk Wallet UI should treat these as the single source of truth for WC/VOID payload shapes.

2) Relayer client and core API

- Files:
  - src/workcredits_relayer_client.ts
  - src/obelisk_wallet_workcredits_api.ts
- Responsibility:
  - workcredits_relayer_client.ts:
    - Low-level client for the WC relayer HTTP API on 127.0.0.1:4311.
    - Knows about:
      - /api/wc-relayer/v1/quote
      - /api/wc-relayer/v1/submit
      - Dev-stub vs real relayer modes.
  - obelisk_wallet_workcredits_api.ts:
    - Wallet-facing helpers:
      - quoteSendVoidDev / signAndSubmitSendVoidDev
      - walletQuoteSendVoidDev / walletSignAndSubmitSendVoidDev
      - walletQuoteSendWCDev / walletSignAndSubmitSendWCDev
      - collectPendingWCDev (dev stub for now)
    - This is the main bridge between the Obelisk Wallet "Wallet" tab and the relayer.

The UI should never build typed data or signatures by hand; it should call into this layer.

3) Wallet tab view model (for the "Wallet" tab)

- Files:
  - src/obelisk_wallet_workcredits_wallet.ts
  - src/obelisk_wallet_workcredits_wallet_demo.ts
  - src/obelisk_wallet_workcredits_tab_model.ts
  - src/obelisk_wallet_workcredits_tab_model_dev.ts
- Responsibility:
  - obelisk_wallet_workcredits_tab_model.ts:
    - Declares WorkCreditsWalletTabModel and the associated types:
      - WorkCreditsWalletBalances
      - WorkCreditsWalletSendVoidPreview / Result
      - WorkCreditsWalletCollectPendingResult
      - WorkCreditsWalletSendWCPreview / Result
    - This is the canonical interface for the Obelisk Wallet "Wallet" tab.
  - obelisk_wallet_workcredits_tab_model_dev.ts:
    - Dev-only stub implementation:
      - reloadBalances(): returns deterministic ZERO balances with 1 WC pending.
      - preview/send VOID and WC via stubbed math and simulated tx hashes.
      - collectPendingWC(): consumes the pending WC in a simulated way.
    - This lets the UI be built and tested without a running chain.
  - obelisk_wallet_workcredits_wallet.ts:
    - Higher-level helpers that glue the relayer API to the tab model.
  - obelisk_wallet_workcredits_wallet_demo.ts:
    - CLI demo that:
      - Prints balances.
      - Previews a SEND_VOID.
      - Executes a SEND_VOID via the relayer dev stub.

Mapping to UI elements (Wallet tab):

- Balance panel:
  - Uses WorkCreditsWalletTabModel.reloadBalances().
  - Shows:
    - VOID balance
    - WC balance
    - Pending WC
- "Collect pending WC" button:
  - Calls WorkCreditsWalletTabModel.collectPendingWC().
- Send VOID form:
  - User enters "to" and VOID amount.
  - UI calls previewSendVoid(), then sendVoid() on confirm.
- Send WC form:
  - User enters "to" and WC amount.
  - UI calls previewSendWC(), then sendWC() on confirm.
- Relayer toggle:
  - For now, defaultGasMode is "relayer" in config/obelisk-workcredits-dev.json.
  - Later, this will branch between relayer-backed send and direct chain tx.

4) Wallet actions (collect, send WC) helpers and demo

- Files:
  - src/obelisk_wallet_workcredits_actions_demo.ts
  - ops/void-wc-obelisk-wallet-actions-demo.sh
- Responsibility:
  - Provide simple dev stubs for:
    - COLLECT_PENDING_WC
    - SEND_WC (quote and submit)
  - Show how a real UI or controller would orchestrate:
    - "Collect pending WC" flow.
    - "Send WC" flow (quote + confirm + submit).

This keeps the action flow easy to reason about while the economics and DEX design are still being refined.

5) Trading tab model (for the "Trading" tab)

- Files:
  - src/obelisk_wallet_workcredits_trading_tab_model.ts
  - src/obelisk_wallet_workcredits_trading_tab_model_dev.ts
  - src/obelisk_wallet_workcredits_trading_tab_model_demo.ts
  - docs/OBELISK-WORKCREDITS-TRADING-TAB-MODEL.md
  - ops/void-wc-obelisk-wallet-trading-tab-demo.sh
- Responsibility:
  - Define and implement the interface that the "Trading" tab uses:
    - WorkCreditsTradingTabModel
    - WorkCreditsTradingSummary
    - WorkCreditsTradingPreview
    - WorkCreditsTradingResult
    - WorkCreditsTradeSide (BUY_WC / SELL_WC).
  - Dev stub:
    - Uses a fixed reference price (0.001 VOID per WC).
    - Applies a simple 1% fee in WC.
    - Always returns txStatus = SIMULATED with a fake tx hash.
  - Demo:
    - Prints summary (price, TWAP, 24h volume).
    - Previews and executes:
      - BUY_WC (1 WC).
      - SELL_WC (2 WC).

Mapping to UI elements (Trading tab):

- Header:
  - Uses loadSummary():
    - lastPriceWeiPerWC
    - twapWeiPerWC
    - volume24hWCWei
- Order form:
  - Fields:
    - Side: BUY_WC / SELL_WC.
    - Amount: wcAmountWei (user-entered WC amount).
    - Optional: max slippage in basis points.
  - On input change:
    - Call previewTrade() and show:
      - voidDeltaWei (VOID spent or received).
      - feeWCWei.
      - effective price.
  - On confirm:
    - Call executeTrade() and show:
      - txHash.
      - txStatus (SIMULATED for now).

6) Ops and demos

Existing WC-related ops scripts:

- ops/void-wc-relayer-client-smoke.sh
  - Health check for wc-relayer-dev on :4311.
  - Client smoke (quote + sign+submit SEND_VOID via low-level API).
- ops/void-wc-relayer-wallet-api-smoke.sh
  - Uses the Obelisk wallet WC API helpers.
- ops/void-wc-obelisk-wallet-demo.sh
  - Wallet view model demo (balances + preview + send).
- ops/void-wc-obelisk-wallet-actions-demo.sh
  - Actions demo: collect pending WC + SEND_WC stubs.
- ops/void-wc-obelisk-wallet-tab-demo.sh
  - Dev WorkCreditsWalletTabModel demo.
- ops/void-wc-obelisk-wallet-trading-tab-demo.sh
  - Dev WorkCreditsTradingTabModel demo.

These scripts give a quick regression check for Work Credits behavior while contracts, economics, and real LLP/AMM details are still in flux.

Future direction:

- Replace dev stubs with real on-chain contracts:
  - WorkCreditsToken, UptimeVaultLLP, WorkCreditsRelayerV1, etc.
- Wire maxSlippageBps into real price impact and quote calculation.
- Extend Trading tab to show:
  - Recent trades.
  - Depth/ladder (orderbook or AMM view).
- Add NullFeed, NFTs, and Dashboard tabs against similar TypeScript interfaces:
  - NullFeedTabModel, NftTabModel, VoidDashboardModel, etc.

For now, this dev setup gives a clean, testable API surface for the Obelisk Wallet UI while keeping all Work Credits logic in one place.
