import { DevWorkCreditsWalletTabModel } from "./obelisk_wallet_workcredits_tab_model_dev.js";

async function main() {
  const model = new DevWorkCreditsWalletTabModel();

  console.log("=== [wallet-tab-demo] reloadBalances ===");
  const balances = await model.reloadBalances();
  console.log("balances =", balances);

  console.log();
  console.log("=== [wallet-tab-demo] preview SEND_VOID ===");
  const previewSendVoid = await model.previewSendVoid({
    to: "0x0000000000000000000000000000000000000002",
    amountVoidWei: "1000000000000000",
  });
  console.log("previewSendVoid =", previewSendVoid);

  console.log();
  console.log("=== [wallet-tab-demo] sendVoid ===");
  const sendVoidRes = await model.sendVoid({
    to: "0x0000000000000000000000000000000000000002",
    amountVoidWei: "1000000000000000",
  });
  console.log("sendVoidRes =", sendVoidRes);

  console.log();
  console.log("=== [wallet-tab-demo] collectPendingWC ===");
  const collectRes = await model.collectPendingWC();
  console.log("collectRes =", collectRes);

  console.log();
  console.log("=== [wallet-tab-demo] preview SEND_WC ===");
  const previewSendWC = await model.previewSendWC({
    to: "0x0000000000000000000000000000000000000003",
    amountWCWei: "500000000000000000",
  });
  console.log("previewSendWC =", previewSendWC);

  console.log();
  console.log("=== [wallet-tab-demo] sendWC ===");
  const sendWCRes = await model.sendWC({
    to: "0x0000000000000000000000000000000000000003",
    amountWCWei: "500000000000000000",
  });
  console.log("sendWCRes =", sendWCRes);

  console.log();
  console.log("=== [wallet-tab-demo] done ===");
}

main().catch((err) => {
  console.error("[wallet-tab-demo] ERROR", err);
  process.exit(1);
});
