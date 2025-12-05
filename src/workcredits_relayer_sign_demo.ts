/**
 * WorkCredits Relayer EIP-712 signing demo (TypeScript, no external deps)
 *
 * This script DOES NOT send any transactions.
 * It just constructs the typed-data (domain, types, message) that the
 * WorkCreditsRelayerV1 Solidity code expects, and prints it.
 *
 * Run with:
 *   npx tsx src/workcredits_relayer_sign_demo.ts
 *
 * You can tweak parameters via environment variables:
 *   CHAIN_ID        - chain id (default: 2050)
 *   RELAYER_ADDR    - verifyingContract (relayer) address
 *   USER_ADDR       - user address (from)
 *   TARGET_ADDR     - target contract to call (to)
 *   CALL_DATA       - hex-encoded call data for target (default: 0x)
 *   NONCE           - nonce for this relayed call (default: 0)
 *   MAX_VOID_FEE    - max VOID fee in wei (default: 0.01 VOID)
 *   GAS_LIMIT       - gas limit for the relayed call (default: 500000)
 *   DEADLINE_SECONDS - validity window from now in seconds (default: 3600)
 */

type Hex = `0x${string}`;

interface RelayedCall {
  from: Hex;
  to: Hex;
  value: string;
  gas: string;
  nonce: string;
  data: Hex;
  maxVoidFee: string;
  deadline: string;
}

interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: Hex;
}

// Minimal runtime helpers (no external libs)
function env(name: string, fallback: string): string {
  return process.env[name] && process.env[name]!.trim() !== ""
    ? process.env[name]!
    : fallback;
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function pretty(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

function ensureHexAddress(raw: string, label: string): Hex {
  const v = raw.trim();
  if (!v.startsWith("0x") || v.length !== 42) {
    throw new Error(
      `Invalid ${label} address: "${raw}". Expected 0x + 40 hex chars.`,
    );
  }
  return v as Hex;
}

function ensureHexData(raw: string, label: string): Hex {
  const v = raw.trim();
  if (!v.startsWith("0x")) {
    throw new Error(`Invalid ${label} data: "${raw}". Expected hex starting with 0x.`);
  }
  return v as Hex;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const chainId = envInt("CHAIN_ID", 2050);

  const relayerAddrRaw = env("RELAYER_ADDR", "0x0000000000000000000000000000000000000000");
  const userAddrRaw = env("USER_ADDR", "0x0000000000000000000000000000000000000001");
  const targetAddrRaw = env("TARGET_ADDR", "0x0000000000000000000000000000000000000002");

  const relayerAddr = ensureHexAddress(relayerAddrRaw, "RELAYER_ADDR");
  const userAddr = ensureHexAddress(userAddrRaw, "USER_ADDR");
  const targetAddr = ensureHexAddress(targetAddrRaw, "TARGET_ADDR");

  const callData = ensureHexData(env("CALL_DATA", "0x"), "CALL_DATA");

  const nonce = env("NONCE", "0");
  const maxVoidFee = env("MAX_VOID_FEE", "10000000000000000"); // 0.01 VOID assuming 18 decimals
  const gasLimit = env("GAS_LIMIT", "500000");

  const deadlineSeconds = envInt("DEADLINE_SECONDS", 3600);
  const deadline = String(nowSeconds() + deadlineSeconds);

  const domain: EIP712Domain = {
    name: "VOID-WorkCredits-Relayer",
    version: "1",
    chainId,
    verifyingContract: relayerAddr,
  };

  // NOTE: This MUST match the Solidity struct and type hash in
  // contracts/workcredits/WorkCreditsRelayerTypes.sol
  const types = {
    RelayedCall: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "gas", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "maxVoidFee", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  } as const;

  const message: RelayedCall = {
    from: userAddr,
    to: targetAddr,
    value: "0",
    gas: String(gasLimit),
    nonce: String(nonce),
    data: callData,
    maxVoidFee: String(maxVoidFee),
    deadline,
  };

  // This is the payload MetaMask (and similar) expects for eth_signTypedData_v4
  const signTypedDataPayload = {
    domain,
    types,
    primaryType: "RelayedCall",
    message,
  };

  // -------------------------------------------------------------------------
  // Output
  // -------------------------------------------------------------------------

  console.log("=== WorkCredits Relayer EIP-712 Demo ===");
  console.log();
  console.log("Domain:");
  console.log(pretty(domain));
  console.log();
  console.log("Types:");
  console.log(pretty(types));
  console.log();
  console.log("Message:");
  console.log(pretty(message));
  console.log();
  console.log("eth_signTypedData_v4 payload (JSON):");
  console.log(pretty(signTypedDataPayload));

  console.log();
  console.log("You can use this payload with a signer library, e.g. (pseudocode):");
  console.log();
  console.log("  // ethers v6 style (NOT included as a dependency here)");
  console.log("  // await wallet.signTypedData(domain, types, message);");
  console.log();
  console.log("Or with a wallet that supports eth_signTypedData_v4 by passing the");
  console.log("JSON above as the typed-data payload.");
}

main().catch((err) => {
  console.error("[wc-relayer-demo] ERROR:", err);
  process.exitCode = 1;
});
