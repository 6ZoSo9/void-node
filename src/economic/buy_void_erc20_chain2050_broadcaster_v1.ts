import crypto from "node:crypto";
import { Interface, Transaction, getAddress } from "ethers";
import { createBuyVoidNativeChain2050BroadcasterV1 } from "./buy_void_native_chain2050_broadcaster_v1.js";
import type { BuyVoidDeliveryBroadcasterV1, BuyVoidDeliveryBroadcastResultV1 } from "./buy_void_delivery_sign_broadcast_adapter_v1.js";
import { createBuyVoidErc20Chain2050TotalDeadlineHttpTransportV1 } from "./buy_void_erc20_chain2050_total_deadline_transport_v1.js";
export { createBuyVoidErc20Chain2050TotalDeadlineHttpTransportV1 } from "./buy_void_erc20_chain2050_total_deadline_transport_v1.js";

export const VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_V1 = "VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_V1";
export const VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_AUTHORITY_V1 = {
  source_only_contract: true, canonical_chain_id: "2050", canonical_asset: "void_token_erc20",
  exact_transfer_calldata_required: true, transaction_value_wei: "0", loopback_http_only: true,
  socket_inactivity_timeout: true, total_wall_clock_deadline: true, bounded_response_bytes: true,
  existing_chain2050_broadcaster_core_reused: true, factory_rpc_probe: false,
  chain_identity_probe_when_broadcast_called: true, per_broadcast_chain_identity_probe: true,
  credential_access: false, wallet_access: false, transaction_signing: false, runtime_route_mount: false,
  background_loop: false, automatic_retry: false, transaction_broadcast_when_broadcaster_called: true,
  money_movement_when_broadcaster_called: true,
} as const;

export type BuyVoidErc20Chain2050BroadcasterPolicyV1 = {
  rpc_url: string; void_token_address: string; request_timeout_ms?: string | number; max_response_bytes?: string | number;
};
export type BuyVoidErc20Chain2050BroadcasterDecisionV1 = {
  ok: true; status: "ready"; marker: typeof VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_V1; version: 1;
  chain_id: "2050"; void_token_address: string; rpc_url_fingerprint_sha256: string;
  broadcaster: BuyVoidDeliveryBroadcasterV1; factory_rpc_probe_performed: false;
  transaction_broadcast_performed_by_factory: false; money_movement_performed_by_factory: false;
  authority: typeof VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_AUTHORITY_V1;
} | {
  ok: false; status: "held"; marker: typeof VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_V1; version: 1; reason: string;
  void_token_address: string | null; rpc_url_fingerprint_sha256: string | null; factory_rpc_probe_performed: false;
  transaction_broadcast_performed_by_factory: false; money_movement_performed_by_factory: false;
  authority: typeof VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_AUTHORITY_V1;
};

const TRANSFER = new Interface(["function transfer(address to, uint256 value) returns (bool)"]);
const RAW = /^0x(?:[0-9a-fA-F]{2})+$/;
const MAX_RAW_BYTES = 256 * 1024;
function sha256(value: string) { return crypto.createHash("sha256").update(value, "utf8").digest("hex"); }
function addr(value: unknown): string {
  const raw = String(value || "").trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return "";
  try { return getAddress(raw).toLowerCase(); } catch { return ""; }
}
function normalizedRpc(raw: unknown): { url: string; timeout: number; maxBytes: number; fingerprint: string } | null {
  let url: URL;
  try { url = new URL(String(raw || "").trim()); } catch { return null; }
  const host = url.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  const port = Number(url.port || 0);
  if (url.protocol !== "http:" || !["127.0.0.1", "::1"].includes(host) || !Number.isInteger(port) || port <= 0 || port > 65_535 ||
      url.username || url.password || url.search || url.hash || !url.pathname.startsWith("/") || url.pathname.length > 256) return null;
  const timeout = 5_000;
  const maxBytes = 65_536;
  const rendered = host === "::1" ? "[::1]" : host;
  const normalized = `http://${rendered}:${port}${url.pathname}`;
  return { url: normalized, timeout, maxBytes, fingerprint: sha256(normalized) };
}
function signedTransfer(rawValue: string, token: string): string {
  const raw = String(rawValue || "").trim();
  if (!RAW.test(raw) || Buffer.byteLength(raw, "utf8") > MAX_RAW_BYTES * 2 + 2) return "";
  let tx: Transaction;
  try { tx = Transaction.from(raw); } catch { return ""; }
  const data = String(tx.data || "").toLowerCase();
  if (tx.type !== 2 || tx.chainId !== 2050n || addr(tx.to) !== token || tx.value !== 0n) return "";
  try {
    const decoded = TRANSFER.decodeFunctionData("transfer", data);
    const recipient = addr(decoded[0]); const amount = BigInt(decoded[1]);
    if (!recipient || amount <= 0n || TRANSFER.encodeFunctionData("transfer", [recipient, amount]).toLowerCase() !== data) return "";
  } catch { return ""; }
  return String(tx.hash || "").toLowerCase();
}

export function createBuyVoidErc20Chain2050BroadcasterV1(
  policy: Readonly<BuyVoidErc20Chain2050BroadcasterPolicyV1>,
): BuyVoidErc20Chain2050BroadcasterDecisionV1 {
  const token = addr(policy?.void_token_address); const rpc = normalizedRpc(policy?.rpc_url);
  if (!token || !rpc) return { ok: false, status: "held", marker: VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_V1,
    version: 1, reason: "erc20_chain2050_broadcaster_policy_invalid", void_token_address: token || null,
    rpc_url_fingerprint_sha256: rpc?.fingerprint || null, factory_rpc_probe_performed: false,
    transaction_broadcast_performed_by_factory: false, money_movement_performed_by_factory: false,
    authority: VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_AUTHORITY_V1 };
  const timeout = Number(policy.request_timeout_ms ?? rpc.timeout);
  const maxBytes = Number(policy.max_response_bytes ?? rpc.maxBytes);
  if (!Number.isSafeInteger(timeout) || timeout <= 0 || timeout > 30_000 || !Number.isSafeInteger(maxBytes) || maxBytes <= 0 || maxBytes > 1_048_576) {
    return { ok: false, status: "held", marker: VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_V1, version: 1,
      reason: "erc20_chain2050_broadcaster_policy_invalid", void_token_address: token,
      rpc_url_fingerprint_sha256: rpc.fingerprint, factory_rpc_probe_performed: false,
      transaction_broadcast_performed_by_factory: false, money_movement_performed_by_factory: false,
      authority: VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_AUTHORITY_V1 };
  }
  const broadcaster: BuyVoidDeliveryBroadcasterV1 = {
    async broadcast_signed_transaction(raw): Promise<BuyVoidDeliveryBroadcastResultV1> {
      const hash = signedTransfer(raw, token);
      if (!hash) return { accepted: false, provider_submission_id: "erc20-chain2050-local-transaction-invalid", submission_may_have_occurred: false };
      let decision;
      try {
        decision = await createBuyVoidNativeChain2050BroadcasterV1({ rpc_url: rpc.url, expected_chain_id: 2050,
          request_timeout_ms: timeout, max_response_bytes: maxBytes }, createBuyVoidErc20Chain2050TotalDeadlineHttpTransportV1());
      } catch {
        return { accepted: false, transaction_hash: hash, provider_submission_id: "erc20-chain2050-broadcaster-factory-failed", submission_may_have_occurred: false };
      }
      if ("reason" in decision) return { accepted: false, transaction_hash: hash,
        provider_submission_id: "erc20-chain2050-broadcaster-chain-probe-held", submission_may_have_occurred: false };
      return await decision.broadcaster.broadcast_signed_transaction(raw);
    },
  };
  return { ok: true, status: "ready", marker: VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_V1, version: 1,
    chain_id: "2050", void_token_address: token, rpc_url_fingerprint_sha256: rpc.fingerprint, broadcaster,
    factory_rpc_probe_performed: false, transaction_broadcast_performed_by_factory: false,
    money_movement_performed_by_factory: false, authority: VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_AUTHORITY_V1 };
}
