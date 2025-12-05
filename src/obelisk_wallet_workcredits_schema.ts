/**
 * High-level Work Credits types for Obelisk Wallet.
 * These are the shapes the UI should depend on, instead of raw relayer JSON.
 */

export type WorkCreditsIntentKind =
  | "SEND_VOID"
  | "SEND_WC"
  | "TRADE_VOID_FOR_WC"
  | "TRADE_WC_FOR_VOID";

/**
 * Input for a simple "send VOID using the WC relayer" flow.
 * - user: sender address
 * - to: recipient address
 * - valueWei: amount of VOID to send (wei). For the dev stub, this can be "0".
 */
export interface WalletSendVoidQuoteInput {
  user: string;
  to: string;
  valueWei?: string;
  // Future knobs; wallet can ignore for now.
  gasLimitHint?: bigint | number | null;
  maxSlippageBps?: number;
}

/**
 * Result of a SEND_VOID quote from the wallet's perspective.
 * We expose only what the UI cares about: how much VOID and how much WC.
 */
export interface WalletSendVoidQuoteResult {
  intent: "SEND_VOID";
  voidNeededWei: string;
  wcFeeWei: string;
}

/**
 * Result of a SEND_VOID sign+submit from the wallet's perspective.
 */
export interface WalletSendVoidSubmitResult {
  intent: "SEND_VOID";
  signerAddress: string;
  txHash: string;
  txStatus: string;
}
