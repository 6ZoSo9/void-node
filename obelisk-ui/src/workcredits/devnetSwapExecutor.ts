import { BrowserProvider, Contract, MaxUint256, parseUnits } from "ethers";
import {
  WORKCREDITS_DEVNET_POOL_ADDRESS,
  WORKCREDITS_DEVNET_POOL_ABI,
  WORKCREDITS_DEVNET_CHAIN_ID,
  WORKCREDITS_DEVNET_VOID_TOKEN_ADDRESS,
  WORKCREDITS_DEVNET_WC_TOKEN_ADDRESS,
} from "./devnetSwapConfig";

export type SwapSide = "buy_wc" | "sell_wc";

export interface SwapExecutionPlan {
  side: SwapSide;
  from: string;           // may be "" in stub mode (we fall back to signer address)
  sendAmount: string;     // decimal string (human units)
  recvAmount: string;     // decimal string (human units)
  minRecvAmount: string;  // decimal string (after slippage)
  slippagePct: number;
  poolAddress: string;
}

export function buildSwapExecutionPlan(opts: {
  side: SwapSide;
  from?: string;
  sendAmount: number;
  recvAmount: number;
  slippagePct?: number;
}): SwapExecutionPlan {
  const { side, sendAmount, recvAmount } = opts;
  const slippagePct = opts.slippagePct ?? 0.5;

  const rawFrom = (opts.from ?? "").trim();
  let fromLower = "";

  if (rawFrom.length > 0) {
    if (!rawFrom.startsWith("0x") || rawFrom.length !== 42) {
      throw new Error("Invalid from address for swap");
    }
    fromLower = rawFrom.toLowerCase();
  }

  if (!Number.isFinite(sendAmount) || sendAmount <= 0) {
    throw new Error("Invalid sendAmount for swap");
  }
  if (!Number.isFinite(recvAmount) || recvAmount <= 0) {
    throw new Error("Invalid recvAmount for swap");
  }

  const minRecv = recvAmount * (1 - Math.abs(slippagePct) / 100);

  return {
    side,
    from: fromLower,
    sendAmount: sendAmount.toString(),
    recvAmount: recvAmount.toString(),
    minRecvAmount: minRecv.toString(),
    slippagePct,
    poolAddress: WORKCREDITS_DEVNET_POOL_ADDRESS,
  };
}

// Minimal ERC-20 ABI for approve only (we deliberately skip allowance on devnet).
const ERC20_ABI = [
  "function approve(address spender, uint256 value) returns (bool)",
] as const;

// 18-decimals for VOID and WC on devnet.
const TOKEN_DECIMALS = 18n;

async function getBrowserProviderAndSigner() {
  const w = window as any;
  const ethereum = w.ethereum;
  if (!ethereum) {
    throw new Error("No injected wallet found (window.ethereum is missing)");
  }

  const provider = new BrowserProvider(ethereum);
  const signer = await provider.getSigner();

  // HARD GUARD: must be on VOID devnet (chainId 2050), or we refuse to trade.
  try {
    const net = await provider.getNetwork();
    console.log("[swap] wallet network:", net);

    const expected = BigInt(WORKCREDITS_DEVNET_CHAIN_ID);
    if (net.chainId !== expected) {
      throw new Error(
        [
          "Wrong network in wallet.",
          `Detected chainId=${net.chainId.toString()}, expected ${expected.toString()} (VOID Devnet).`,
          "",
          "Set MetaMask to:",
          "  - RPC URL : http://127.0.0.1:8545",
          "  - Chain ID: 2050",
          "  - Symbol  : VOID",
        ].join("\n")
      );
    }
  } catch (err: any) {
    // If network check itself fails, make it explicit.
    if (err instanceof Error && err.message.startsWith("Wrong network in wallet.")) {
      throw err;
    }
    console.warn("[swap] failed to read network", err);
    throw new Error("Failed to read wallet network for WorkCredits devnet swap.");
  }

  return { provider, signer };
}

export async function executeDevnetSwap(
  plan: SwapExecutionPlan
): Promise<void> {
  console.log("[executeDevnetSwap] starting with plan", plan);

  const { signer } = await getBrowserProviderAndSigner();

  const walletAddress = await signer.getAddress();
  const from = plan.from || walletAddress;

  // Safety: if plan.from was set and doesn't match signer, refuse to proceed.
  if (plan.from && plan.from.length > 0 && plan.from.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new Error(
      `Swap plan 'from' (${plan.from}) does not match connected wallet (${walletAddress}).`
    );
  }

  const pool = new Contract(
    WORKCREDITS_DEVNET_POOL_ADDRESS,
    WORKCREDITS_DEVNET_POOL_ABI,
    signer
  );

  // Convert human send/minRecv to 18-decimal amounts.
  const amountIn = parseUnits(plan.sendAmount, Number(TOKEN_DECIMALS));
  const minOut = parseUnits(plan.minRecvAmount, Number(TOKEN_DECIMALS));

  // Decide which token is being spent (VOID or WC) using hard-coded devnet addresses.
  let inputTokenAddress: string;
  if (plan.side === "buy_wc") {
    inputTokenAddress = WORKCREDITS_DEVNET_VOID_TOKEN_ADDRESS;
  } else {
    inputTokenAddress = WORKCREDITS_DEVNET_WC_TOKEN_ADDRESS;
  }

  console.log("[swap] input token address =", inputTokenAddress);

  const token = new Contract(inputTokenAddress, ERC20_ABI, signer);

  // DEVNET SIMPLIFICATION: always send an approve for MaxUint256 before swap.
  // (We skip reading allowance() completely to avoid node/ABI quirks.)
  console.log("[swap] sending approve(MaxUint256) to pool…");
  const approveTx = await token.approve(
    WORKCREDITS_DEVNET_POOL_ADDRESS,
    MaxUint256
  );
  console.log("[swap] approve tx hash =", approveTx.hash);
  await approveTx.wait();
  console.log("[swap] approve confirmed");

  // Now call the appropriate swap function on the pool.
  let tx;
  if (plan.side === "buy_wc") {
    tx = await pool.swapVoidForWC(amountIn, minOut, from);
  } else {
    tx = await pool.swapWCForVoid(amountIn, minOut, from);
  }

  console.log("[swap] swap tx hash =", tx.hash);
  const receipt = await tx.wait();
  console.log("[swap] swap confirmed:", receipt);
}
