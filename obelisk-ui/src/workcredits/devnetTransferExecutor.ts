import { BrowserProvider, Contract, parseUnits } from "ethers";
import {
  WORKCREDITS_DEVNET_CHAIN_ID,
  WORKCREDITS_DEVNET_VOID_TOKEN_ADDRESS,
  WORKCREDITS_DEVNET_WC_TOKEN_ADDRESS,
} from "./devnetSwapConfig";

export type TransferToken = "void" | "wc";

const ERC20_TRANSFER_ABI = [
  "function transfer(address to, uint256 value) returns (bool)",
] as const;

const TOKEN_DECIMALS = 18n;

async function getBrowserProviderAndSigner() {
  const w = window as any;
  const ethereum = w.ethereum;
  if (!ethereum) {
    throw new Error("No injected wallet found (window.ethereum is missing)");
  }

  const provider = new BrowserProvider(ethereum);
  const signer = await provider.getSigner();

  try {
    const net = await provider.getNetwork();
    console.log("[transfer] wallet network:", net);
    if (net.chainId !== BigInt(WORKCREDITS_DEVNET_CHAIN_ID)) {
      console.warn(
        `[transfer] Warning: wallet chainId = ${net.chainId}, expected ${WORKCREDITS_DEVNET_CHAIN_ID} (devnet)`
      );
    }
  } catch (err) {
    console.warn("[transfer] failed to read network", err);
  }

  return { provider, signer };
}

export async function executeDevnetTransfer(opts: {
  token: TransferToken;
  to: string;
  amount: number;
}): Promise<void> {
  const rawTo = (opts.to ?? "").trim();
  if (!rawTo || !rawTo.startsWith("0x") || rawTo.length !== 42) {
    throw new Error("Invalid recipient address");
  }

  if (!Number.isFinite(opts.amount) || opts.amount <= 0) {
    throw new Error("Invalid transfer amount");
  }

  const { signer } = await getBrowserProviderAndSigner();
  const from = await signer.getAddress();
  console.log("[transfer] from", from);

  const tokenAddress =
    opts.token === "void"
      ? WORKCREDITS_DEVNET_VOID_TOKEN_ADDRESS
      : WORKCREDITS_DEVNET_WC_TOKEN_ADDRESS;

  console.log("[transfer] token", opts.token, "address =", tokenAddress);

  const token = new Contract(tokenAddress, ERC20_TRANSFER_ABI, signer);

  const amountWei = parseUnits(
    opts.amount.toString(),
    Number(TOKEN_DECIMALS)
  );

  const tx = await token.transfer(rawTo, amountWei);
  console.log("[transfer] tx hash =", tx.hash);
  const receipt = await tx.wait();
  console.log("[transfer] confirmed:", receipt);
}
