/**
 * Dev-only CLI demo for the Obelisk Wallet Work Credits flows.
 *
 * This is how a future Obelisk Wallet front-end would talk to the
 * wallet-level API:
 *
 *   - getWalletBalancesDev()
 *   - previewSendVoidWithRelayerDev()
 *   - executeSendVoidWithRelayerDev()
 *
 * It expects WC_RELAYER_DEMO_PK in the environment.
 */

import { previewSendVoidWithRelayerDev, executeSendVoidWithRelayerDev, getWalletBalancesDev } from "./obelisk_wallet_workcredits_wallet";
import { ethers } from "ethers";

async function main() {
  const pk = process.env.WC_RELAYER_DEMO_PK;
  if (!pk || pk.length !== 66 || !pk.startsWith("0x")) {
    throw new Error(
      "WC_RELAYER_DEMO_PK must be set to 0x + 64 hex chars (use /tmp/wc-relayer-demo-key.sh if needed)",
    );
  }

  const wallet = new ethers.Wallet(pk);
  const user = wallet.address;
  const to = "0x0000000000000000000000000000000000000002";

  console.log("=== [wallet-demo] signer ===");
  console.log(" address =", user);
  console.log();

  console.log("=== [wallet-demo] balances (dev stub) ===");
  const balances = await getWalletBalancesDev(user);
  console.log(balances);
  console.log();

  console.log("=== [wallet-demo] preview SEND_VOID via relayer ===");
  const preview = await previewSendVoidWithRelayerDev({ user, to });
  console.log("preview =", preview);
  console.log();

  console.log("=== [wallet-demo] execute SEND_VOID via relayer ===");
  const submitRes = await executeSendVoidWithRelayerDev({
    privateKey: pk,
    to,
  });
  console.log("submitRes =", submitRes);
  console.log();

  console.log("=== [wallet-demo] done ===");
}

main().catch((err) => {
  console.error("[wallet-demo] ERROR", err);
  process.exit(1);
});
