export const WORKCREDITS_DEVNET_POOL_ADDRESS =
  "0xdab942e37D0D8da45eB19f31897dff7306914Ab9";

export const WORKCREDITS_DEVNET_RPC_URL = "http://127.0.0.1:8545";
export const WORKCREDITS_DEVNET_CHAIN_ID = 2050;

// Canonical devnet token addresses wired into the WorkCredits pool.
export const WORKCREDITS_DEVNET_VOID_TOKEN_ADDRESS =
  "0xF49183759D2C6510b131F0D2Ba584fff624fb8ec";

export const WORKCREDITS_DEVNET_WC_TOKEN_ADDRESS =
  "0xF95864611C26D59DA4A0534ec1Dd3BD0EF6bae0a";

// Minimal human-readable ABI for the devnet WorkCredits pool.
export const WORKCREDITS_DEVNET_POOL_ABI = [
  "function swapVoidForWC(uint256 amountInVoid, uint256 minOutWC, address to) returns (uint256 amountOutWC)",
  "function swapWCForVoid(uint256 amountInWC, uint256 minOutVoid, address to) returns (uint256 amountOutVoid)",
  "function voidToken() view returns (address)",
  "function wcToken() view returns (address)",
] as const;
