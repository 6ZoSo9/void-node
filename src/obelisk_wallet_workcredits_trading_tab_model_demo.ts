import { DevWorkCreditsTradingTabModel } from "./obelisk_wallet_workcredits_trading_tab_model_dev.js";

async function main() {
  const model = new DevWorkCreditsTradingTabModel();

  console.log("=== [trading-tab-demo] loadSummary ===");
  const summary = await model.loadSummary();
  console.log("summary =", summary);

  console.log();
  console.log("=== [trading-tab-demo] preview BUY_WC (1 WC) ===");
  const previewBuy = await model.previewTrade({
    side: "BUY_WC",
    wcAmountWei: "1000000000000000000", // 1 WC
    maxSlippageBps: 50,
  });
  console.log("previewBuy =", previewBuy);

  console.log();
  console.log("=== [trading-tab-demo] execute BUY_WC (1 WC) ===");
  const execBuy = await model.executeTrade({
    side: "BUY_WC",
    wcAmountWei: "1000000000000000000",
    maxSlippageBps: 50,
  });
  console.log("execBuy =", execBuy);

  console.log();
  console.log("=== [trading-tab-demo] preview SELL_WC (2 WC) ===");
  const previewSell = await model.previewTrade({
    side: "SELL_WC",
    wcAmountWei: "2000000000000000000", // 2 WC
    maxSlippageBps: 100,
  });
  console.log("previewSell =", previewSell);

  console.log();
  console.log("=== [trading-tab-demo] execute SELL_WC (2 WC) ===");
  const execSell = await model.executeTrade({
    side: "SELL_WC",
    wcAmountWei: "2000000000000000000",
    maxSlippageBps: 100,
  });
  console.log("execSell =", execSell);

  console.log();
  console.log("=== [trading-tab-demo] done ===");
}

main().catch((err) => {
  console.error("[trading-tab-demo] ERROR", err);
  process.exit(1);
});
