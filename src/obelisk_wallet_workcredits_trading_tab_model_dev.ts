import { WeiString } from "./obelisk_wallet_workcredits_schema";
import {
  WorkCreditsTradeSide,
  WorkCreditsTradingSummary,
  WorkCreditsTradingPreview,
  WorkCreditsTradingResult,
  WorkCreditsTradingTabModel,
} from "./obelisk_wallet_workcredits_trading_tab_model";

/**
 * Pure dev stub for the WC/VOID Trading tab.
 *
 * - Uses a fixed reference price.
 * - Does simple BigInt math for VOID deltas and fees.
 * - Always returns txStatus = "SIMULATED".
 */
export class DevWorkCreditsTradingTabModel
  implements WorkCreditsTradingTabModel
{
  // VOID wei per 1 WC, dev-only fixed price (0.001 VOID per WC).
  private readonly priceWeiPerWC: bigint = BigInt("1000000000000000");

  async loadSummary(): Promise<WorkCreditsTradingSummary> {
    const price = this.priceWeiPerWC.toString();
    return {
      lastPriceWeiPerWC: price,
      twapWeiPerWC: price,
      // 1,000 WC in 24h for dev/demo.
      volume24hWCWei: "1000000000000000000000",
    };
  }

  async previewTrade(params: {
    side: WorkCreditsTradeSide;
    wcAmountWei: WeiString;
    maxSlippageBps?: number;
  }): Promise<WorkCreditsTradingPreview> {
    const wcAmount = this.parseWei(params.wcAmountWei, "wcAmountWei");
    const price = this.priceWeiPerWC;

    const scale = BigInt("1000000000000000000");
    const voidDeltaWeiBig = (wcAmount * price) / scale;

    // Simple 1% fee in WC.
    const feeWCWeiBig = wcAmount / BigInt(100);

    return {
      side: params.side,
      wcAmountWei: wcAmount.toString(),
      voidDeltaWei: voidDeltaWeiBig.toString(),
      priceWeiPerWC: price.toString(),
      feeWCWei: feeWCWeiBig.toString(),
      maxSlippageBps: params.maxSlippageBps,
    };
  }

  async executeTrade(params: {
    side: WorkCreditsTradeSide;
    wcAmountWei: WeiString;
    maxSlippageBps?: number;
  }): Promise<WorkCreditsTradingResult> {
    const preview = await this.previewTrade(params);

    const sideTag = params.side === "BUY_WC" ? "buy" : "sell";
    const suffix = preview.wcAmountWei.slice(-6) || "0";

    const txHash = `0xwc_trading_${sideTag}_stub_${suffix}`;

    return {
      side: params.side,
      wcAmountWei: preview.wcAmountWei,
      voidDeltaWei: preview.voidDeltaWei,
      priceWeiPerWC: preview.priceWeiPerWC,
      feeWCWei: preview.feeWCWei,
      txHash,
      txStatus: "SIMULATED",
    };
  }

  private parseWei(value: string, field: string): bigint {
    try {
      const trimmed = value.trim();
      if (!trimmed) {
        throw new Error(`${field} is empty`);
      }
      const v = BigInt(trimmed);
      if (v < BigInt(0)) {
        throw new Error(`${field} must be non-negative`);
      }
      return v;
    } catch (err: any) {
      throw new Error(
        `DevWorkCreditsTradingTabModel: invalid wei string for ${field}: ${value} (${err?.message ?? "unknown error"})`,
      );
    }
  }
}
