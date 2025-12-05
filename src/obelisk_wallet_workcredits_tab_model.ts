/**
 * Obelisk Wallet — WorkCredits "Wallet" tab model (dev draft)
 *
 * This is the stable contract between the Obelisk front-end and the
 * void-node WorkCredits / relayer pipeline.
 *
 * - The UI should talk to this shape, not to low-level relayer APIs.
 * - Implementations can be dev stubs (current) or real on-chain relayer.
 */

export type WeiString = string;

export type WorkCreditsWalletBalances = {
  /** User EVM address (checksummed string). */
  address: string;
  /** VOID balance (wei, as string). */
  voidBalanceWei: WeiString;
  /** Work Credits balance (wei, as string). */
  wcBalanceWei: WeiString;
  /** Pending WC that can be collected (wei, as string). */
  pendingWCWei: WeiString;
};

export type WorkCreditsWalletSendVoidPreview = {
  intent: "SEND_VOID";
  /** Current balances before send. */
  balances: WorkCreditsWalletBalances;
  /** How much VOID is required for the send (wei). */
  voidNeededWei: WeiString;
  /** How much WC will be charged as relayer fee (wei). */
  wcFeeWei: WeiString;
};

export type WorkCreditsWalletSendVoidResult = {
  intent: "SEND_VOID";
  /** Address that actually signed the relayed call. */
  signerAddress: string;
  /** Transaction hash (real or dev-stub). */
  txHash: string;
  /** Status string, e.g. "SIMULATED" on dev, "PENDING" / "MINED" on real. */
  txStatus: string;
};

export type WorkCreditsWalletCollectPendingResult = {
  intent: "COLLECT_PENDING_WC";
  signerAddress: string;
  /** Amount of WC that was collected from pending → balance (wei). */
  collectedWCWei: WeiString;
  txHash: string;
  txStatus: string;
};

export type WorkCreditsWalletSendWCPreview = {
  intent: "SEND_WC";
  /** How much WC will be sent to the recipient (wei). */
  wcAmountWei: WeiString;
  /** How much WC will be charged as fee (wei). */
  wcFeeWei: WeiString;
};

export type WorkCreditsWalletSendWCResult = {
  intent: "SEND_WC";
  signerAddress: string;
  /** Recipient address. */
  to: string;
  /** Amount of WC sent (wei). */
  wcAmountWei: WeiString;
  txHash: string;
  txStatus: string;
};

/**
 * High-level wallet tab model that Obelisk's "Wallet" view can use.
 *
 * All methods are written as if they were real on-chain operations, even
 * though the current dev implementation is a pure stub layered on top of
 * the wc-relayer-dev service.
 *
 * Later, we can provide:
 *   - a dev implementation (backed by wc-relayer-dev)
 *   - a mainnet implementation (backed by real contracts)
 * that both satisfy this interface.
 */
export interface WorkCreditsWalletTabModel {
  /**
   * Reload current balances for the active wallet.
   */
  reloadBalances(): Promise<WorkCreditsWalletBalances>;

  /**
   * Preview a SEND_VOID operation through the relayer.
   *
   * `amountVoidWei` can be used by real implementations; dev stub may ignore it
   * but should still return voidNeededWei / wcFeeWei.
   */
  previewSendVoid(params: {
    to: string;
    amountVoidWei: WeiString;
  }): Promise<WorkCreditsWalletSendVoidPreview>;

  /**
   * Execute a SEND_VOID operation through the relayer.
   *
   * On dev stub, this will return a SIMULATED tx hash. On real mainnet,
   * it should return the actual tx hash and best-effort status.
   */
  sendVoid(params: {
    to: string;
    amountVoidWei: WeiString;
  }): Promise<WorkCreditsWalletSendVoidResult>;

  /**
   * Collect any pending Work Credits for the active user.
   */
  collectPendingWC(): Promise<WorkCreditsWalletCollectPendingResult>;

  /**
   * Preview sending WC directly (no VOID movement, only WC).
   */
  previewSendWC(params: {
    to: string;
    amountWCWei: WeiString;
  }): Promise<WorkCreditsWalletSendWCPreview>;

  /**
   * Execute sending WC directly.
   */
  sendWC(params: {
    to: string;
    amountWCWei: WeiString;
  }): Promise<WorkCreditsWalletSendWCResult>;
}
