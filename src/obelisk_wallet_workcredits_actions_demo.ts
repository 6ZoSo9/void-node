/* Dev-only demo for Obelisk Wallet WC actions:
 *  - Collect pending WC
 *  - Send WC directly
 */

import {
  WalletCollectPendingWCResult,
  WalletSendWCQuoteResult,
  WalletSendWCSubmitResult,
} from "./obelisk_wallet_workcredits_schema";
import {
  walletCollectPendingWCDev,
  walletQuoteSendWCDev,
  walletSignAndSubmitSendWCDev,
} from "./obelisk_wallet_workcredits_api";

async function main() {
  const pk = process.env.WC_RELAYER_DEMO_PK;
  if (!pk || !pk.startsWith("0x") || pk.length !== 66) {
    throw new Error("WC_RELAYER_DEMO_PK must be set (0x + 64 hex) for dev demo");
  }

  console.log("=== [wallet-actions-demo] WC_RELAYER_DEMO_PK length ===");
  console.log(" ", pk.length);

  const to = "0x0000000000000000000000000000000000000003";

  console.log();
  console.log("=== [wallet-actions-demo] collect pending WC (dev stub) ===");
  const collectRes: WalletCollectPendingWCResult = await walletCollectPendingWCDev({
    privateKey: pk,
  });
  console.log("CollectPendingWCResult =", collectRes);

  console.log();
  console.log("=== [wallet-actions-demo] quote SEND_WC (dev stub) ===");
  const amountWCWei = "500000000000000000"; // 0.5 WC
  const quoteRes: WalletSendWCQuoteResult = await walletQuoteSendWCDev({
    user: collectRes.signerAddress,
    to,
    amountWCWei,
  });
  console.log("SendWCQuoteResult =", quoteRes);

  console.log();
  console.log("=== [wallet-actions-demo] sign+submit SEND_WC (dev stub) ===");
  const submitRes: WalletSendWCSubmitResult = await walletSignAndSubmitSendWCDev({
    privateKey: pk,
    to,
    amountWCWei: quoteRes.wcAmountWei,
  });
  console.log("SendWCSubmitResult =", submitRes);

  console.log();
  console.log("=== [wallet-actions-demo] done ===");
}

main().catch((err) => {
  console.error("[wallet-actions-demo] ERROR", err);
  process.exit(1);
});
