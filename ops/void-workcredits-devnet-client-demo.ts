import {
  DEFAULT_WORKCREDITS_BASE_URL,
  fetchWorkCreditsPool,
  fetchWorkCreditsAccount,
  isWorkCreditsPoolHealthy,
} from "../sdk/workcredits-devnet-client";

async function main() {
  const baseUrl =
    process.env.WC_BASE_URL ?? DEFAULT_WORKCREDITS_BASE_URL;
  const addr = process.env.WC_DEMO_ADDRESS;

  console.log("[demo] baseUrl =", baseUrl);

  if (!addr) {
    console.error(
      "[demo] WC_DEMO_ADDRESS is not set. Example:\n" +
        '  WC_DEMO_ADDRESS="0xYOUR_DEVNET_ADDRESS" npx tsx ops/void-workcredits-devnet-client-demo.ts'
    );
    process.exit(1);
  }

  console.log("[demo] address =", addr);

  console.log("\n=== [pool] ===");
  const pool = await fetchWorkCreditsPool(baseUrl);
  console.log(JSON.stringify(pool, null, 2));
  console.log("\n[demo] pool healthy? ", isWorkCreditsPoolHealthy(pool));

  console.log("\n=== [account] ===");
  const account = await fetchWorkCreditsAccount(addr, baseUrl);
  console.log(JSON.stringify(account, null, 2));

  console.log("\n[demo] balances summary:");
  console.log("  VOID:", account.balances.void);
  console.log("  WC  :", account.balances.wc);
  console.log("  LP  :", account.balances.lp);
  console.log("  pending WC:", account.earnings.pending_wc);
}

main().catch((err) => {
  console.error("[demo] ERROR:", err);
  process.exit(1);
});
