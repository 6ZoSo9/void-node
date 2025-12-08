import {
  WeiString,
  WorkCreditsWalletBalances,
  WorkCreditsWalletSendVoidPreview,
  WorkCreditsWalletSendVoidResult,
  WorkCreditsWalletCollectPendingResult,
  WorkCreditsWalletSendWCPreview,
  WorkCreditsWalletSendWCResult,
  WorkCreditsWalletTabModel,
} from "./obelisk_wallet_workcredits_tab_model.js";

/**
 * Pure dev stub implementation for Obelisk Wallet "Wallet" tab.
 *
 * This does NOT talk to the relayer or chain yet. It just returns
 * deterministic sample values so the UI can be built against the
 * WorkCreditsWalletTabModel interface without caring about backend.
 */
export class DevWorkCreditsWalletTabModel implements WorkCreditsWalletTabModel {
  private readonly address: string;

  constructor(opts?: { address?: string }) {
    this.address =
      opts?.address ?? "0x0000000000000000000000000000000000000004";
  }

  async reloadBalances(): Promise<WorkCreditsWalletBalances> {
    return {
      address: this.address,
      voidBalanceWei: "0",
      wcBalanceWei: "0",
      // Show 1 WC pending so the "Collect" button has something to do.
      pendingWCWei: "1000000000000000000",
    };
  }

  async previewSendVoid(params: {
    to: string;
    amountVoidWei: WeiString;
  }): Promise<WorkCreditsWalletSendVoidPreview> {
    const balances = await this.reloadBalances();

    // Dev pricing: if caller passes a non-zero amount, use it. Otherwise,
    // default to 0.001 VOID with a flat 1 WC fee, consistent with other stubs.
    const voidNeededWei: WeiString =
      params.amountVoidWei && params.amountVoidWei !== "0"
        ? params.amountVoidWei
        : "1000000000000000"; // 0.001 VOID

    const wcFeeWei: WeiString = "1000000000000000000"; // 1 WC

    return {
      intent: "SEND_VOID",
      balances,
      voidNeededWei,
      wcFeeWei,
    };
  }

  async sendVoid(params: {
    to: string;
    amountVoidWei: WeiString;
  }): Promise<WorkCreditsWalletSendVoidResult> {
    const suffix = this.address.slice(-8);
    return {
      intent: "SEND_VOID",
      signerAddress: this.address,
      txHash: `0xwc_tab_send_void_stub_${suffix}`,
      txStatus: "SIMULATED",
    };
  }

  async collectPendingWC(): Promise<WorkCreditsWalletCollectPendingResult> {
    const suffix = this.address.slice(-8);
    return {
      intent: "COLLECT_PENDING_WC",
      signerAddress: this.address,
      collectedWCWei: "1000000000000000000",
      txHash: `0xwc_tab_collect_stub_${suffix}`,
      txStatus: "SIMULATED",
    };
  }

  async previewSendWC(params: {
    to: string;
    amountWCWei: WeiString;
  }): Promise<WorkCreditsWalletSendWCPreview> {
    const wcAmountWei: WeiString =
      params.amountWCWei && params.amountWCWei !== "0"
        ? params.amountWCWei
        : "500000000000000000"; // 0.5 WC by default

    const wcFeeWei: WeiString = "1000000000000000000"; // 1 WC fee (dev stub)

    return {
      intent: "SEND_WC",
      wcAmountWei,
      wcFeeWei,
    };
  }

  async sendWC(params: {
    to: string;
    amountWCWei: WeiString;
  }): Promise<WorkCreditsWalletSendWCResult> {
    const wcAmountWei: WeiString =
      params.amountWCWei && params.amountWCWei !== "0"
        ? params.amountWCWei
        : "500000000000000000"; // 0.5 WC

    const suffix = this.address.slice(-8);

    return {
      intent: "SEND_WC",
      signerAddress: this.address,
      to: params.to,
      wcAmountWei,
      txHash: `0xwc_tab_sendwc_stub_${suffix}`,
      txStatus: "SIMULATED",
    };
  }
}
