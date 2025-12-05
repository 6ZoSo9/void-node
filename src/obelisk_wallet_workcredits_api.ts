import { loadWorkCreditsConfig } from "./workcredits_relayer_client";
import { Wallet, TypedDataDomain, TypedDataField } from "ethers";

/**
 * Intent strings Obelisk will eventually use.
 * For now, we only wire SEND_VOID in dev/demo mode.
 */
export type WorkCreditsIntent =
  | "SEND_VOID"
  | "SEND_WC"
  | "SWAP_VOID_FOR_WC"
  | "SWAP_WC_FOR_VOID";

export interface WorkCreditsConfigNetwork {
  name: string;
  chainId: number;
  rpcUrl: string;
}

export interface WorkCreditsConfigRelayer {
  baseUrl: string;
  maxSlippageBpsDefault: number;
  timeoutMs: number;
}

export interface WorkCreditsConfig {
  network: WorkCreditsConfigNetwork;
  contracts: {
    VoidToken: string;
    WorkCreditsToken: string;
    UptimeVaultLLP: string;
    WorkCreditsRelayerV1: string;
    WorkCreditsRelayerQuoteHelper: string;
  };
  relayer: WorkCreditsConfigRelayer;
  ui?: unknown;
}

export interface WorkCreditsQuoteParams {
  user: string;
  to: string;
  value: string;
  gasLimitHint?: number | null;
  maxSlippageBps: number;
}

export interface WorkCreditsQuote {
  ok: boolean;
  intent: WorkCreditsIntent;
  params: {
    user: string;
    to: string;
    value: string;
    gasLimitHint: number | null;
    maxSlippageBps: string;
  };
  quote: {
    voidNeeded: string;
    wcFee: string;
  };
  debug?: unknown;
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

export interface RelayerSubmitResponse {
  ok: boolean;
  mode: string;
  tx: {
    hash: string;
    status: string;
  };
  relayedCall: RelayedCall;
  signature: string;
}

/**
 * Internal helper: build the common EIP-712 domain for the WorkCredits relayer.
 * In DEV_CONFIG mode (0x... / zero address), we deliberately point verifyingContract
 * at the zero address to match the existing demo behavior.
 */
function buildDomain(
  cfg: WorkCreditsConfig
): TypedDataDomain {
  const chainId = cfg.network.chainId;
  const relayerAddr = cfg.contracts.WorkCreditsRelayerV1;

  const isStub =
    !relayerAddr ||
    relayerAddr === "0x..." ||
    /^0x0{40}$/i.test(relayerAddr);

  const verifyingContract = isStub
    ? "0x0000000000000000000000000000000000000000"
    : relayerAddr;

  if (isStub) {
    // This mirrors the dev warning behavior in your existing demo.
    console.warn(
      "[obelisk-wallet] WorkCreditsRelayerV1 address in config looks like a stub (0x... or zero)."
    );
    console.warn(
      "[obelisk-wallet] Proceeding in DEV_CONFIG mode. Signatures are ONLY for local testing."
    );
  }

  const domain: TypedDataDomain = {
    name: "VoidWorkCreditsRelayer",
    version: "1",
    chainId,
    verifyingContract,
  };

  return domain;
}

const RELAYED_CALL_TYPES: Record<string, TypedDataField[]> = {
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

/**
 * DEV-ONLY helper: quote a SEND_VOID intent via the WorkCredits relayer.
 *
 * For now this matches your existing demo behavior:
 *   - data = "0x"
 *   - value = "0"
 *   - intent = "SEND_VOID"
 *
 * Later, when we wire real ERC-20 VOID transfers, we'll start encoding
 * the token transfer in `data` and/or using value properly.
 */
export async function quoteSendVoidDevDemo(options: {
  user: string;
  to: string;
  maxSlippageBpsOverride?: number;
}): Promise<{
  cfg: WorkCreditsConfig;
  quoteRequest: {
    user: string;
    to: string;
    data: string;
    value: string;
    intent: WorkCreditsIntent;
    gasLimitHint: null;
    maxSlippageBps: number;
  };
  quoteResponse: WorkCreditsQuote;
}> {
  const cfg = (await loadWorkCreditsConfig()) as WorkCreditsConfig;

  const baseUrl = cfg.relayer.baseUrl;
  if (!baseUrl) {
    throw new Error("WorkCredits relayer baseUrl missing in config.");
  }

  const maxSlippageBps =
    options.maxSlippageBpsOverride ?? cfg.relayer.maxSlippageBpsDefault;

  const quoteReq = {
    user: options.user,
    to: options.to,
    data: "0x",
    value: "0",
    intent: "SEND_VOID" as WorkCreditsIntent,
    gasLimitHint: null,
    maxSlippageBps,
  };

  const resp = await fetch(`${baseUrl}/quote`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(quoteReq),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(
      `Relayer /quote failed with status ${resp.status}: ${text}`
    );
  }

  const json = (await resp.json()) as WorkCreditsQuote;

  if (!json.ok) {
    throw new Error(
      `Relayer /quote responded with ok=false for SEND_VOID intent.`
    );
  }

  return {
    cfg,
    quoteRequest: quoteReq,
    quoteResponse: json,
  };
}

/**
 * DEV-ONLY helper: quote + sign + submit a SEND_VOID intent using a local
 * private key (WC_RELAYER_DEMO_PK-style) and return all the pieces Obelisk
 * would care about.
 *
 * This is essentially a cleaned-up version of your existing client smoke,
 * exposed as a reusable wallet API for Obelisk.
 */
export async function signAndSubmitSendVoidDevDemo(options: {
  privateKey: string;
  to: string;
  deadline?: number;
  maxSlippageBpsOverride?: number;
}): Promise<{
  cfg: WorkCreditsConfig;
  signerAddress: string;
  quoteResponse: WorkCreditsQuote;
  relayedCall: RelayedCall;
  signature: string;
  submitResponse: RelayerSubmitResponse;
}> {
  const wallet = new Wallet(options.privateKey);
  const user = wallet.address;

  const { cfg, quoteResponse } = await quoteSendVoidDevDemo({
    user,
    to: options.to,
    maxSlippageBpsOverride: options.maxSlippageBpsOverride,
  });

  const wcFee = quoteResponse.quote.wcFee;
  const nonce = "0"; // TODO: wire real nonce from contract later.
  const deadline = String(options.deadline ?? 2_000_000_000);

  const relayedCall: RelayedCall = {
    user,
    to: options.to,
    data: "0x",
    value: "0",
    nonce,
    maxWCFee: wcFee,
    deadline,
  };

  const domain = buildDomain(cfg);

  const signature = await wallet.signTypedData(
    domain,
    RELAYED_CALL_TYPES,
    relayedCall
  );

  const baseUrl = cfg.relayer.baseUrl;
  const submitPayload = {
    relayedCall,
    signature,
  };

  const resp = await fetch(`${baseUrl}/submit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(submitPayload),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(
      `Relayer /submit failed with status ${resp.status}: ${text}`
    );
  }

  const submitJson = (await resp.json()) as RelayerSubmitResponse;

  if (!submitJson.ok) {
    throw new Error(
      `Relayer /submit responded with ok=false (mode=${submitJson.mode}).`
    );
  }

  return {
    cfg,
    signerAddress: user,
    quoteResponse,
    relayedCall,
    signature,
    submitResponse: submitJson,
  };
}

// === High-level Obelisk Wallet helpers =======================================
//
// NOTE: These wrappers sit *on top* of the lower-level dev demo functions
// (quoteSendVoidDevDemo / signAndSubmitSendVoidDevDemo) so the UI can use
// simple, stable types without caring about the raw relayer JSON.

import type {
  WalletSendVoidQuoteInput,
  WalletSendVoidQuoteResult,
  WalletSendVoidSubmitResult,
} from "./obelisk_wallet_workcredits_schema";

/**
 * Wallet-friendly "quote SEND_VOID" helper for devnet.
 *
 * Internally calls quoteSendVoidDevDemo and normalizes the result into
 * WalletSendVoidQuoteResult so the UI only deals with VOID/WC amounts.
 */
export async function walletQuoteSendVoidDev(
  input: WalletSendVoidQuoteInput,
): Promise<WalletSendVoidQuoteResult> {
  const { user, to } = input;

  const quoteCtx = await quoteSendVoidDevDemo({
    user,
    to,
  });

  const voidNeededWei = quoteCtx.quoteResponse.quote.voidNeeded;
  const wcFeeWei = quoteCtx.quoteResponse.quote.wcFee;

  return {
    intent: "SEND_VOID",
    voidNeededWei,
    wcFeeWei,
  };
}

/**
 * Wallet-friendly "sign + submit SEND_VOID" helper for devnet.
 *
 * Internally calls signAndSubmitSendVoidDevDemo and normalizes the result into
 * WalletSendVoidSubmitResult for the UI.
 */
export async function walletSignAndSubmitSendVoidDev(
  input: { privateKey: string; to: string; valueWei?: string },
): Promise<WalletSendVoidSubmitResult> {
  const { privateKey, to } = input;

  const res = await signAndSubmitSendVoidDevDemo({
    privateKey,
    to,
  });

  return {
    intent: "SEND_VOID",
    signerAddress: res.signerAddress,
    txHash: res.submitResponse.tx.hash,
    txStatus: res.submitResponse.tx.status,
  };
}
