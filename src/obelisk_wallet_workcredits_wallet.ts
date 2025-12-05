import { loadWorkCreditsConfig } from "./workcredits_relayer_client";
import {
  walletQuoteSendVoidDev,
  walletSignAndSubmitSendVoidDev,
} from "./obelisk_wallet_workcredits_api";
import type {
  WalletSendVoidQuoteResult,
  WalletSendVoidSubmitResult,
} from "./obelisk_wallet_workcredits_schema";

/**
 * How the Obelisk Wallet thinks about gas mode.
 * - "relayer": user pays gas in Work Credits (WC) via relayer
 * - "self":    user pays gas directly (future, not wired yet)
 */
export type GasMode = "relayer" | "self";

/**
 * Snapshot of balances relevant to the Work Credits flows.
 * All amounts are raw wei strings; the front-end decides how to format.
 */
export interface WalletBalances {
  address: string;
  voidBalanceWei: string;
  wcBalanceWei: string;
  pendingWCWei: string;
}

/**
 * Combined view for a "Send VOID via relayer" preview:
 * - balances before the action
 * - an optional quote for the action
 */
export interface WalletSendVoidPreview {
  balances: WalletBalances;
  quote?: WalletSendVoidQuoteResult;
}

/**
 * DEV-ONLY: fetch balances for an address.
 *
 * For now this is a stub that returns 0 for everything. Once we wire
 * VoidToken + WorkCreditsToken + pending WC contract addresses into
 * config/obelisk-workcredits-dev.json, we can:
 *
 *   - read cfg.contracts.VoidToken / WorkCreditsToken
 *   - use ethers.JsonRpcProvider to query ERC20 balances
 */
export async function getWalletBalancesDev(address: string): Promise<WalletBalances> {
  // Touch config so we fail fast if it's broken.
  const cfg = await loadWorkCreditsConfig();
  void cfg;

  return {
    address,
    voidBalanceWei: "0",
    wcBalanceWei: "0",
    pendingWCWei: "0",
  };
}

/**
 * DEV-ONLY: preview a SEND_VOID via relayer for a given (user, to).
 *
 * This will:
 *   - fetch WalletBalances for the user
 *   - fetch a relayer quote for SEND_VOID
 */
export async function previewSendVoidWithRelayerDev(params: {
  user: string;
  to: string;
}): Promise<WalletSendVoidPreview> {
  const { user, to } = params;

  const balances = await getWalletBalancesDev(user);
  const quote = await walletQuoteSendVoidDev({ user, to });

  return {
    balances,
    quote,
  };
}

/**
 * DEV-ONLY: perform a SEND_VOID via relayer using a private key.
 *
 * This is the building block that the Wallet UI will use behind a button
 * like "Send VOID (via relayer)".
 */
export async function executeSendVoidWithRelayerDev(params: {
  privateKey: string;
  to: string;
}): Promise<WalletSendVoidSubmitResult> {
  const { privateKey, to } = params;

  const res = await walletSignAndSubmitSendVoidDev({
    privateKey,
    to,
  });

  return res;
}
