type WeiString = string;

export type WorkCreditsTradeSide = "BUY_WC" | "SELL_WC";

export interface WorkCreditsTradingSummary {
  lastPriceWeiPerWC: WeiString;
  twapWeiPerWC: WeiString;
  volume24hWCWei: WeiString;
}

export interface WorkCreditsTradingPreview {
  side: WorkCreditsTradeSide;
  wcAmountWei: WeiString;
  voidDeltaWei: WeiString;
  priceWeiPerWC: WeiString;
  feeWCWei: WeiString;
  maxSlippageBps?: number;
}

export type WorkCreditsTradeTxStatus =
  | "SIMULATED"
  | "PENDING"
  | "CONFIRMED"
  | "FAILED";

export interface WorkCreditsTradingResult {
  side: WorkCreditsTradeSide;
  wcAmountWei: WeiString;
  voidDeltaWei: WeiString;
  priceWeiPerWC: WeiString;
  feeWCWei: WeiString;
  txHash: string;
  txStatus: WorkCreditsTradeTxStatus;
}

/**
 * Interface used by the Obelisk Wallet "Trading" tab.
 *
 * UI should:
 *  - call loadSummary() for header stats,
 *  - call previewTrade() when user edits a BUY/SELL,
 *  - call executeTrade() when user confirms.
 *
 * Implementation can be:
 *  - dev stub (this file's dev impl),
 *  - relayer-backed,
 *  - direct LLP/AMM, etc.
 */
export interface WorkCreditsTradingTabModel {
  loadSummary(): Promise<WorkCreditsTradingSummary>;

  previewTrade(params: {
    side: WorkCreditsTradeSide;
    wcAmountWei: WeiString;
    maxSlippageBps?: number;
  }): Promise<WorkCreditsTradingPreview>;

  executeTrade(params: {
    side: WorkCreditsTradeSide;
    wcAmountWei: WeiString;
    maxSlippageBps?: number;
  }): Promise<WorkCreditsTradingResult>;
}
