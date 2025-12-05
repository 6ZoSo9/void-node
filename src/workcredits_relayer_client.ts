import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Wallet, TypedDataEncoder } from "ethers";

/**
 * Resolve __dirname in ESM/TSX world.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface WorkCreditsNetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
}

export interface WorkCreditsContractsConfig {
  VoidToken: string;
  WorkCreditsToken: string;
  UptimeVaultLLP: string;
  WorkCreditsRelayerV1: string;
  WorkCreditsRelayerQuoteHelper: string;
}

export interface WorkCreditsRelayerConfig {
  baseUrl: string;              // e.g. http://127.0.0.1:4311/api/wc-relayer/v1
  maxSlippageBpsDefault: number;
  timeoutMs: number;
}

export interface WorkCreditsUIConfig {
  tabs?: Record<string, boolean>;
  defaultGasMode?: string;
  showAdvancedIntents?: boolean;
}

export interface WorkCreditsConfig {
  network: WorkCreditsNetworkConfig;
  contracts: WorkCreditsContractsConfig;
  relayer: WorkCreditsRelayerConfig;
  ui?: WorkCreditsUIConfig;
}

export type RelayerIntent =
  | "SEND_VOID"
  | "SEND_WC"
  | "COLLECT_WC"
  | "TRADE_WC_FOR_VOID"
  | "TRADE_VOID_FOR_WC";

export interface QuoteRequest {
  user: string;
  to: string;
  data: string;
  value: string;
  intent: RelayerIntent;
  gasLimitHint?: string | null;
  maxSlippageBps?: string | number | null;
}

export interface QuoteResponse {
  ok: boolean;
  intent?: string;
  params?: any;
  quote?: {
    voidNeeded?: string;
    wcFee?: string;
    [k: string]: any;
  };
  debug?: any;
  [k: string]: any;
}

export interface RelayedCall {
  user: string;
  to: string;
  data: string;
  value: string;
  nonce: string;
  maxWCFee: string;
  deadline: string;
}

export interface SignedRelayedCall {
  relayedCall: RelayedCall;
  signature: string;
  digest: string;
  address: string;
  domain: any;
  types: any;
}

/**
 * Load the Obelisk WorkCredits config.
 * Defaults to config/obelisk-workcredits-dev.json next to the repo root.
 */
export async function loadWorkCreditsConfig(
  customPath?: string
): Promise<WorkCreditsConfig> {
  const fallback = path.join(__dirname, "..", "config", "obelisk-workcredits-dev.json");
  const configPath = customPath ?? fallback;
  const raw = await fs.promises.readFile(configPath, "utf8");
  const parsed = JSON.parse(raw);

  // Very light sanity; throw if obviously missing.
  if (!parsed.network || !parsed.contracts || !parsed.relayer) {
    throw new Error(`obelisk-workcredits config missing core sections (network/contracts/relayer) at: ${configPath}`);
  }

  return parsed as WorkCreditsConfig;
}

/**
 * Treat 0x000..0 or 0x... or garbage as a stub.
 */
export function isStubAddress(addr: string | undefined | null): boolean {
  if (!addr) return true;
  const a = addr.trim().toLowerCase();
  if (a === "0x...") return true;
  if (!a.startsWith("0x")) return true;
  if (a.length !== 42) return true;
  if (a === "0x0000000000000000000000000000000000000000") return true;
  return false;
}

/**
 * Build the EIP-712 domain for the WorkCredits relayer.
 * If the contract address is a stub, we fall back to 0x000...000 but still
 * allow signing in dev mode.
 */
export function buildRelayerDomain(
  cfg: WorkCreditsConfig
): { domain: any; stub: boolean } {
  const chainId = cfg.network.chainId;
  const relayerAddr = cfg.contracts.WorkCreditsRelayerV1;
  const stub = isStubAddress(relayerAddr);
  const verifyingContract = stub
    ? "0x0000000000000000000000000000000000000000"
    : relayerAddr;

  const domain = {
    name: "VoidWorkCreditsRelayer",
    version: "1",
    chainId,
    verifyingContract,
  };

  return { domain, stub };
}

/**
 * Types for the RelayedCall struct.
 */
export function relayedCallTypes(): any {
  return {
    RelayedCall: [
      { name: "user", type: "address" },
      { name: "to", type: "address" },
      { name: "data", type: "bytes" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "maxWCFee", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };
}

/**
 * Sign a RelayedCall with the given private key and config.
 */
export async function signRelayedCall(
  privateKey: string,
  call: RelayedCall,
  cfg: WorkCreditsConfig
): Promise<SignedRelayedCall> {
  const pk = privateKey.trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(pk)) {
    throw new Error(
      "WC_RELAYER_DEMO_PK must be a 32-byte hex private key (0x + 64 hex chars)"
    );
  }

  const wallet = new Wallet(pk);
  const { domain, stub } = buildRelayerDomain(cfg);
  const types = relayedCallTypes();

  if (stub) {
    console.warn(
      "[warn] WorkCreditsRelayerV1 address in config looks like a stub (0x... or zero)."
    );
    console.warn(
      "[warn] Proceeding in DEV_CONFIG mode. Signatures are ONLY for local testing."
    );
    console.warn(
      "[warn] Once you deploy a real WorkCreditsRelayerV1, update config/obelisk-workcredits-dev.json."
    );
  }

  const signature = await wallet.signTypedData(
    domain as any,
    types as any,
    call as any
  );
  const digest = TypedDataEncoder.hash(
    domain as any,
    types as any,
    call as any
  );

  return {
    relayedCall: call,
    signature,
    digest,
    address: wallet.address,
    domain,
    types,
  };
}

/**
 * Base URL helper. Normalizes trailing slashes.
 */
export function relayerBaseUrl(cfg: WorkCreditsConfig): string {
  return cfg.relayer.baseUrl.replace(/\/+$/, "");
}

/**
 * POST /quote to the WorkCredits relayer.
 */
export async function getQuote(
  cfg: WorkCreditsConfig,
  req: QuoteRequest
): Promise<QuoteResponse> {
  const url = relayerBaseUrl(cfg) + "/quote";
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `wc-relayer /quote failed: HTTP ${res.status} ${res.statusText} ${text}`
    );
  }

  const json = (await res.json()) as QuoteResponse;
  return json;
}

/**
 * POST /submit with a signed RelayedCall.
 */
export async function submitRelayedCall(
  cfg: WorkCreditsConfig,
  payload: { relayedCall: RelayedCall; signature: string }
): Promise<any> {
  const url = relayerBaseUrl(cfg) + "/submit";
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `wc-relayer /submit failed: HTTP ${res.status} ${res.statusText} ${text}`
    );
  }

  return res.json();
}

/**
 * Helper: build a simple dummy RelayedCall for dev/demo usage.
 * Obelisk will eventually build these from actual user intents.
 */
export function createDummyRelayedCall(user: string): RelayedCall {
  return {
    user,
    to: "0x0000000000000000000000000000000000000002",
    data: "0x",
    value: "0",
    nonce: "0",
    maxWCFee: "1000000000000000000", // 1 WC in 18 decimals
    deadline: "2000000000",          // some future-ish timestamp
  };
}
