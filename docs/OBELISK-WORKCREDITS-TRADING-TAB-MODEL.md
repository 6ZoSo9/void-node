# Obelisk Wallet — Work Credits Trading Tab Model

This document describes the TypeScript interface that the Obelisk Wallet "Trading" tab uses to interact with the WC/VOID market.

Goals:

- The UI depends only on a stable TypeScript interface.
- Backends can change (dev stub, relayer, LLP/AMM) without touching the UI.
- All values are strings in wei; formatting and units are handled in the UI layer.

Key types (described verbally to avoid markdown fences inside generated scripts):

1. WorkCreditsTradeSide

- Union type: "BUY_WC" or "SELL_WC".

2. WorkCreditsTradingSummary

- lastPriceWeiPerWC: VOID wei per 1 WC (last price).
- twapWeiPerWC: VOID wei per 1 WC (smoothed or TWAP).
- volume24hWCWei: total WC volume in the last 24h, in wei.

3. WorkCreditsTradingPreview

- side: BUY_WC or SELL_WC.
- wcAmountWei: how many WC (wei) the user wants to buy or sell.
- voidDeltaWei:
  - For BUY_WC: positive value means VOID spent.
  - For SELL_WC: positive value means VOID received.
- priceWeiPerWC: effective price used for the quote (VOID wei per 1 WC).
- feeWCWei: fee charged in WC (wei).
- maxSlippageBps: optional slippage constraint in basis points.

4. WorkCreditsTradingResult

- side: same as preview.
- wcAmountWei: WC amount actually traded (wei).
- voidDeltaWei: VOID spent or received (same sign convention as preview).
- priceWeiPerWC: price actually used for the trade.
- feeWCWei: fee in WC (wei).
- txHash: transaction identifier (real hash or dev-stub string).
- txStatus: one of SIMULATED, PENDING, CONFIRMED, FAILED.

5. WorkCreditsTradingTabModel interface

- loadSummary(): returns WorkCreditsTradingSummary for header (price, TWAP, 24h volume).
- previewTrade(params): returns WorkCreditsTradingPreview for a potential trade.
- executeTrade(params): executes a trade and returns WorkCreditsTradingResult.

Expected UI flow:

- On tab load, call loadSummary() to populate header stats.
- When user adjusts:
  - side (BUY_WC / SELL_WC),
  - amount (wcAmountWei),
  - optional slippage (maxSlippageBps),
  call previewTrade() and show VOID/WC deltas and fees.
- When user confirms, call executeTrade() and show status based on txStatus.

Implementation roadmap:

- Phase 1: Dev stub (no network), deterministic math, SIMULATED tx.
- Phase 2: Relayer-backed, with real pricing, slippage, fees, and tx hashes.
- Phase 3: Advanced orderbook/AMM view, depth, and streaming quotes.
