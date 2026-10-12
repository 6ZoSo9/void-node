import crypto from "node:crypto";
import * as http from "node:http";
import {
  Interface,
  getAddress,
  id,
} from "ethers";
import {
  VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
  buyVoidExecutionAttemptIntentFingerprintV1,
  type BuyVoidExecutionAttemptStateV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1,
  type BuyVoidFulfillmentJournalIntentV1,
} from "./buy_void_fulfillment_journal_v1.js";
import {
  VOID_BUY_VOID_AUTO_FULFILLMENT_V1,
} from "./buy_void_auto_fulfillment_v1.js";
import {
  VOID_BUY_VOID_ERC20_DELIVERY_UNIT_SCALE_V1,
} from "./buy_void_delivery_sign_broadcast_adapter_v1.js";

export const VOID_BUY_VOID_ERC20_DELIVERY_RECEIPT_RECONCILER_V1 =
  "VOID_BUY_VOID_ERC20_DELIVERY_RECEIPT_RECONCILER_V1";

export const VOID_BUY_VOID_ERC20_DELIVERY_RECEIPT_RECONCILER_AUTHORITY_V1 = {
  one_attempt_per_run: true,
  disabled_by_policy_default: true,
  dry_only: true,
  server_controlled_rpc_url: true,
  loopback_http_only: true,
  read_only_rpc_methods: [
    "eth_chainId",
    "eth_getTransactionReceipt",
    "eth_blockNumber",
  ],
  exact_void_token_transfer_required: true,
  exact_execution_attempt_identity_required: true,
  exact_fulfillment_intent_fingerprint_required: true,
  exact_token_contract_required: true,
  exact_fulfillment_wallet_from_required: true,
  exact_delivery_address_to_required: true,
  exact_token_amount_atoms_required: true,
  filesystem_read: false,
  filesystem_write: false,
  wallet_access: false,
  secret_access: false,
  signing: false,
  transaction_broadcast: false,
  raw_transaction_input: false,
  raw_transaction_output: false,
  inventory_decrement: false,
  public_request_journal_write: false,
  runtime_route_mount: false,
  background_loop: false,
  automatic_retry: false,
  service_restart: false,
  money_movement: false,
} as const;

export type BuyVoidErc20DeliveryReceiptRpcMethodV1 =
  | "eth_chainId"
  | "eth_getTransactionReceipt"
  | "eth_blockNumber";

export type BuyVoidErc20DeliveryReceiptRpcCallV1 = {
  method: BuyVoidErc20DeliveryReceiptRpcMethodV1;
  params: unknown[];
};

export type BuyVoidErc20DeliveryReceiptRpcTransportV1 = (
  call: Readonly<BuyVoidErc20DeliveryReceiptRpcCallV1>,
) => Promise<unknown>;

export type BuyVoidErc20DeliveryReceiptReconcilerPolicyV1 = {
  enabled: boolean;
  chain_id: "2050";
  rpc_url: string;
  void_token_address: string;
  min_confirmations: string | number;
  fulfillment_wallet_allowlist: string[];
  request_timeout_ms?: string | number;
  max_response_bytes?: string | number;
};

export type BuyVoidErc20DeliveryReceiptReconcilerInputV1 = {
  attempt: BuyVoidExecutionAttemptStateV1;
  intent: BuyVoidFulfillmentJournalIntentV1;
  policy: BuyVoidErc20DeliveryReceiptReconcilerPolicyV1;
  transport?: BuyVoidErc20DeliveryReceiptRpcTransportV1;
};

export type BuyVoidErc20DeliveryReceiptReconcilerDecisionV1 =
  | {
      ok: true;
      status: "confirmed";
      marker: typeof VOID_BUY_VOID_ERC20_DELIVERY_RECEIPT_RECONCILER_V1;
      attempt_id: string;
      transaction_hash: string;
      delivery_confirmed: true;
      chain_id: "2050";
      void_token_address: string;
      fulfillment_wallet: string;
      delivery_address: string;
      void_amount_units: string;
      token_amount_atoms: string;
      transfer_log_index: string;
      receipt_block_number: string;
      receipt_block_hash: string;
      observed_confirmation_count: string;
      receipt_evidence_fingerprint_sha256: string;
      rpc_url_fingerprint_sha256: string;
      rpc_methods_used: BuyVoidErc20DeliveryReceiptRpcMethodV1[];
      mutation_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
    }
  | {
      ok: false;
      status: "held";
      marker: typeof VOID_BUY_VOID_ERC20_DELIVERY_RECEIPT_RECONCILER_V1;
      reason: string;
      attempt_id: string | null;
      transaction_hash: string | null;
      rpc_url_fingerprint_sha256: string | null;
      rpc_methods_used: BuyVoidErc20DeliveryReceiptRpcMethodV1[];
      mutation_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      detail?: Record<string, unknown>;
    };

type NormalizedPolicyV1 = {
  rpc_url: string;
  rpc_url_fingerprint_sha256: string;
  void_token_address: string;
  min_confirmations: bigint;
  fulfillment_wallet_allowlist: Set<string>;
  request_timeout_ms: number;
  max_response_bytes: number;
};

type ReceiptStabilityBindingV1 = {
  transaction_hash: string;
  from: string;
  to: string;
  block_number: bigint;
  block_hash: string;
  status: bigint;
  transfer_from: string;
  transfer_to: string;
  transfer_value: bigint;
  transfer_log_index: string;
};

const ADDRESS = /^0x[0-9a-f]{40}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const HEX_QUANTITY = /^0x(?:0|[1-9a-f][0-9a-f]*)$/i;
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 65_536;
const MAX_RESPONSE_BYTES = 1_048_576;
const MAX_REQUEST_BYTES = 16_384;
const MAX_RECEIPT_LOGS = 1_024;
const UINT256_MAX = (1n << 256n) - 1n;
const TRANSFER_TOPIC = id("Transfer(address,address,uint256)").toLowerCase();
const TRANSFER_INTERFACE = new Interface([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeAddress(value: unknown): string {
  const raw = String(value || "").trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return "";
  try {
    const normalized = getAddress(raw).toLowerCase();
    return ADDRESS.test(normalized) ? normalized : "";
  } catch {
    return "";
  }
}

function normalizeHash(value: unknown): string {
  const hash = String(value || "").trim().toLowerCase();
  return HASH.test(hash) ? hash : "";
}

function parsePositive(value: unknown): bigint | null {
  const raw = String(value ?? "").trim();
  if (!/^[0-9]+$/.test(raw)) return null;
  try {
    const parsed = BigInt(raw);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

function parseHexQuantity(value: unknown): bigint | null {
  const raw = String(value ?? "").trim();
  if (!HEX_QUANTITY.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function boundedPositive(
  value: unknown,
  fallback: number,
  maximum: number,
): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  if (!/^[0-9]+$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maximum
    ? parsed
    : null;
}

function held(
  reason: string,
  options: {
    attempt_id?: string | null;
    transaction_hash?: string | null;
    rpc_url_fingerprint_sha256?: string | null;
    rpc_methods_used?: BuyVoidErc20DeliveryReceiptRpcMethodV1[];
    detail?: Record<string, unknown>;
  } = {},
): BuyVoidErc20DeliveryReceiptReconcilerDecisionV1 {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_ERC20_DELIVERY_RECEIPT_RECONCILER_V1,
    reason,
    attempt_id: options.attempt_id ?? null,
    transaction_hash: options.transaction_hash ?? null,
    rpc_url_fingerprint_sha256:
      options.rpc_url_fingerprint_sha256 ?? null,
    rpc_methods_used: options.rpc_methods_used || [],
    mutation_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

function normalizePolicy(
  policy: BuyVoidErc20DeliveryReceiptReconcilerPolicyV1,
):
  | { ok: true; policy: NormalizedPolicyV1 }
  | { ok: false; reason: string; fingerprint: string | null } {
  if (policy?.enabled !== true) {
    return {
      ok: false,
      reason: "erc20_delivery_receipt_reconciler_disabled",
      fingerprint: null,
    };
  }
  if (String(policy.chain_id || "") !== "2050") {
    return {
      ok: false,
      reason: "invalid_erc20_delivery_chain_id",
      fingerprint: null,
    };
  }

  let url: URL;
  try {
    url = new URL(String(policy.rpc_url || "").trim());
  } catch {
    return { ok: false, reason: "invalid_rpc_url", fingerprint: null };
  }
  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== "http:" ||
    url.username ||
    url.password ||
    url.hash ||
    !["127.0.0.1", "::1", "[::1]", "localhost"].includes(host)
  ) {
    return {
      ok: false,
      reason: "rpc_url_must_be_loopback_http",
      fingerprint: null,
    };
  }
  const normalizedUrl = url.toString();
  const fingerprint = sha256Hex(normalizedUrl);

  const token = normalizeAddress(policy.void_token_address);
  if (!token) {
    return {
      ok: false,
      reason: "invalid_void_token_address",
      fingerprint,
    };
  }

  const minimum = parsePositive(policy.min_confirmations);
  if (minimum === null || minimum > 1_000n) {
    return {
      ok: false,
      reason: "invalid_min_confirmations",
      fingerprint,
    };
  }

  const wallets = new Set(
    (policy.fulfillment_wallet_allowlist || [])
      .map(normalizeAddress)
      .filter(Boolean),
  );
  if (wallets.size === 0) {
    return {
      ok: false,
      reason: "empty_fulfillment_wallet_allowlist",
      fingerprint,
    };
  }

  const timeout = boundedPositive(
    policy.request_timeout_ms,
    DEFAULT_TIMEOUT_MS,
    MAX_TIMEOUT_MS,
  );
  const maxBytes = boundedPositive(
    policy.max_response_bytes,
    DEFAULT_MAX_RESPONSE_BYTES,
    MAX_RESPONSE_BYTES,
  );
  if (timeout === null || maxBytes === null) {
    return {
      ok: false,
      reason: "invalid_rpc_transport_bounds",
      fingerprint,
    };
  }

  return {
    ok: true,
    policy: {
      rpc_url: normalizedUrl,
      rpc_url_fingerprint_sha256: fingerprint,
      void_token_address: token,
      min_confirmations: minimum,
      fulfillment_wallet_allowlist: wallets,
      request_timeout_ms: timeout,
      max_response_bytes: maxBytes,
    },
  };
}

function createBuyVoidErc20DeliveryReceiptHttpTransportV1(
  policy: Readonly<NormalizedPolicyV1>,
): BuyVoidErc20DeliveryReceiptRpcTransportV1 {
  let requestId = 0;
  return async (call) => {
    if (
      !VOID_BUY_VOID_ERC20_DELIVERY_RECEIPT_RECONCILER_AUTHORITY_V1
        .read_only_rpc_methods.includes(call.method)
    ) {
      throw new Error("erc20_receipt_reconciler_rpc_method_not_allowed");
    }
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: ++requestId,
      method: call.method,
      params: call.params,
    });
    if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BYTES) {
      throw new Error("erc20_receipt_reconciler_request_too_large");
    }

    return await new Promise((resolve, reject) => {
      const url = new URL(policy.rpc_url);
      const requestStartedAtMs = Date.now();
      let settled = false;
      let totalDeadline: ReturnType<typeof setTimeout> | null = null;
      const finish = (error: Error | null, result?: unknown) => {
        if (settled) return;
        settled = true;
        if (totalDeadline !== null) {
          clearTimeout(totalDeadline);
          totalDeadline = null;
        }
        if (error) reject(error);
        else resolve(result);
      };
      const request = http.request(
        {
          protocol: "http:",
          hostname: url.hostname,
          port: url.port || "80",
          path: `${url.pathname}${url.search}`,
          method: "POST",
          headers: {
            "content-type": "application/json",
            "content-length": String(Buffer.byteLength(body, "utf8")),
            "user-agent":
              "void-buy-void-erc20-delivery-receipt-reconciler-v1",
          },
          timeout: policy.request_timeout_ms,
        },
        (response) => {
          const chunks: Buffer[] = [];
          let total = 0;
          response.on("data", (chunk: Buffer) => {
            total += chunk.length;
            if (total > policy.max_response_bytes) {
              request.destroy(
                new Error("erc20_receipt_reconciler_response_too_large"),
              );
              return;
            }
            chunks.push(chunk);
          });
          response.on("end", () => {
            if (Number(response.statusCode || 0) !== 200) {
              finish(new Error("erc20_receipt_reconciler_http_status_not_ok"));
              return;
            }
            const contentType = String(
              response.headers["content-type"] || "",
            ).toLowerCase();
            if (!contentType.includes("application/json")) {
              finish(new Error("erc20_receipt_reconciler_response_not_json"));
              return;
            }
            let payload: any;
            try {
              payload = JSON.parse(
                Buffer.concat(chunks).toString("utf8"),
              );
            } catch {
              finish(
                new Error("erc20_receipt_reconciler_response_json_invalid"),
              );
              return;
            }
            if (
              !payload ||
              payload.jsonrpc !== "2.0" ||
              payload.id !== requestId ||
              payload.error ||
              !("result" in payload)
            ) {
              finish(
                new Error("erc20_receipt_reconciler_rpc_envelope_invalid"),
              );
              return;
            }
            finish(null, payload.result);
          });
        },
      );
      request.on("timeout", () => {
        request.destroy(new Error("erc20_receipt_reconciler_rpc_timeout"));
      });
      request.on("error", (error) => finish(error));
      totalDeadline = setTimeout(
        () => {
          request.destroy(
            new Error(
              "erc20_receipt_reconciler_rpc_total_deadline_exceeded",
            ),
          );
        },
        Math.max(
          0,
          policy.request_timeout_ms - (Date.now() - requestStartedAtMs),
        ),
      );
      request.end(body);
    });
  };
}

function validateAttemptIntent(
  attempt: BuyVoidExecutionAttemptStateV1,
  intent: BuyVoidFulfillmentJournalIntentV1,
  policy: NormalizedPolicyV1,
): { ok: true; token_amount_atoms: bigint } | { ok: false; reason: string } {
  const reservation = attempt?.reservation;
  const prepared = attempt?.prepared;
  const broadcast = attempt?.broadcast;
  if (
    attempt?.status !== "broadcast" ||
    !reservation ||
    !prepared ||
    !broadcast ||
    attempt.failure ||
    attempt.postbroadcast_failure ||
    attempt.confirmation
  ) {
    return { ok: false, reason: "execution_attempt_not_reconcilable" };
  }
  const attemptId = String(reservation.attempt_id || "");
  if (
    reservation.schema !==
      "void_buy_void_execution_attempt_reservation_v1" ||
    reservation.marker !== VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1 ||
    !SHA256.test(attemptId) ||
    prepared.schema !== "void_buy_void_execution_prepared_transaction_v1" ||
    prepared.marker !== VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1 ||
    prepared.attempt_id !== attemptId ||
    broadcast.schema !== "void_buy_void_execution_broadcast_observation_v1" ||
    broadcast.marker !== VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1 ||
    broadcast.attempt_id !== attemptId
  ) {
    return {
      ok: false,
      reason: "execution_attempt_identity_binding_mismatch",
    };
  }
  if (
    normalizeHash(prepared.void_delivery_tx_hash) === "" ||
    prepared.void_delivery_tx_hash !== broadcast.void_delivery_tx_hash ||
    prepared.chain_id !== "2050" ||
    !policy.fulfillment_wallet_allowlist.has(
      normalizeAddress(prepared.fulfillment_wallet),
    ) ||
    !normalizeAddress(prepared.delivery_address)
  ) {
    return {
      ok: false,
      reason: "execution_attempt_transaction_binding_invalid",
    };
  }
  if (
    !intent ||
    intent.schema !== "void_buy_void_fulfillment_journal_intent_v1" ||
    intent.marker !== VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1 ||
    intent.claim?.schema !== "void_buy_void_fulfillment_claim_v1" ||
    intent.claim?.marker !== VOID_BUY_VOID_AUTO_FULFILLMENT_V1 ||
    intent.claim?.status !== "claimed" ||
    intent.signing_authorized !== false ||
    intent.transaction_broadcast_authorized !== false ||
    intent.money_movement_authorized !== false ||
    intent.payment_key_sha256 !== reservation.payment_key_sha256 ||
    intent.request_key_sha256 !== reservation.request_key_sha256 ||
    reservation.intent_fingerprint !==
      buyVoidExecutionAttemptIntentFingerprintV1(intent) ||
    intent.claim.canonical_payment_identity !==
      reservation.canonical_payment_identity ||
    intent.claim.request_id !== reservation.request_id ||
    intent.claim.instruction_id !== reservation.instruction_id ||
    normalizeAddress(intent.claim.unsigned_instruction.delivery_address) !==
      normalizeAddress(prepared.delivery_address) ||
    String(intent.claim.unsigned_instruction.void_amount_units) !==
      prepared.void_amount_units
  ) {
    return {
      ok: false,
      reason: "fulfillment_intent_attempt_binding_mismatch",
    };
  }

  const units = parsePositive(prepared.void_amount_units);
  if (units === null) {
    return { ok: false, reason: "invalid_void_amount_units" };
  }
  const multiplier = BigInt(
    VOID_BUY_VOID_ERC20_DELIVERY_UNIT_SCALE_V1.multiplier,
  );
  const atoms = units * multiplier;
  if (atoms <= 0n || atoms > UINT256_MAX) {
    return { ok: false, reason: "token_amount_atoms_out_of_range" };
  }
  return { ok: true, token_amount_atoms: atoms };
}

function transferLogIndex(log: any): string {
  const raw = log?.logIndex ?? log?.index;
  if (typeof raw === "number" && Number.isSafeInteger(raw) && raw >= 0) {
    return String(raw);
  }
  const hex = parseHexQuantity(raw);
  return hex === null ? "" : hex.toString();
}

function receiptStabilityBinding(
  value: unknown,
  policy: Readonly<NormalizedPolicyV1>,
  transactionHash: string,
): ReceiptStabilityBindingV1 | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const receipt = value as Record<string, any>;
  const receiptHash = normalizeHash(receipt.transactionHash);
  const receiptFrom = normalizeAddress(receipt.from);
  const receiptTo = normalizeAddress(receipt.to);
  const receiptBlock = parseHexQuantity(receipt.blockNumber);
  const receiptBlockHash = normalizeHash(receipt.blockHash);
  const receiptStatus = parseHexQuantity(receipt.status);
  if (
    receiptHash !== transactionHash ||
    !receiptFrom ||
    receiptTo !== policy.void_token_address ||
    receiptBlock === null ||
    receiptBlock <= 0n ||
    !receiptBlockHash ||
    receiptStatus !== 1n
  ) {
    return null;
  }

  const logs = Array.isArray(receipt.logs) ? receipt.logs : null;
  if (!logs || logs.length > MAX_RECEIPT_LOGS) return null;

  const transfers: Array<{
    from: string;
    to: string;
    value: bigint;
    log_index: string;
  }> = [];
  for (const rawLog of logs) {
    const log = rawLog as any;
    if (normalizeAddress(log?.address) !== policy.void_token_address) {
      continue;
    }
    const topics = Array.isArray(log?.topics)
      ? log.topics.map((topic: unknown) =>
          String(topic || "").toLowerCase(),
        )
      : [];
    if (topics[0] !== TRANSFER_TOPIC) continue;
    const logTransactionHash = log?.transactionHash
      ? normalizeHash(log.transactionHash)
      : transactionHash;
    if (logTransactionHash !== transactionHash) return null;
    let parsed;
    try {
      parsed = TRANSFER_INTERFACE.parseLog({
        topics,
        data: String(log?.data || ""),
      });
    } catch {
      parsed = null;
    }
    if (!parsed || parsed.name !== "Transfer") return null;
    const from = normalizeAddress(parsed.args[0]);
    const to = normalizeAddress(parsed.args[1]);
    let transferValue: bigint;
    try {
      transferValue = BigInt(parsed.args[2]);
    } catch {
      return null;
    }
    const logIndex = transferLogIndex(log);
    if (!from || !to || !logIndex) return null;
    transfers.push({
      from,
      to,
      value: transferValue,
      log_index: logIndex,
    });
  }
  if (transfers.length !== 1) return null;

  const transfer = transfers[0];
  return {
    transaction_hash: receiptHash,
    from: receiptFrom,
    to: receiptTo,
    block_number: receiptBlock,
    block_hash: receiptBlockHash,
    status: receiptStatus,
    transfer_from: transfer.from,
    transfer_to: transfer.to,
    transfer_value: transfer.value,
    transfer_log_index: transfer.log_index,
  };
}

export async function runBuyVoidErc20DeliveryReceiptReconcilerV1(
  input: BuyVoidErc20DeliveryReceiptReconcilerInputV1,
): Promise<BuyVoidErc20DeliveryReceiptReconcilerDecisionV1> {
  if (!input || !input.attempt || !input.intent || !input.policy) {
    return held("missing_input");
  }
  const normalized = normalizePolicy(input.policy);
  if ("reason" in normalized) {
    return held(normalized.reason, {
      rpc_url_fingerprint_sha256: normalized.fingerprint,
    });
  }
  const policy = normalized.policy;
  const attempt = input.attempt;
  const transactionHash = normalizeHash(
    attempt.prepared?.void_delivery_tx_hash,
  );
  const attemptId = String(attempt?.reservation?.attempt_id || "")
    .trim()
    .toLowerCase();

  const binding = validateAttemptIntent(
    attempt,
    input.intent,
    policy,
  );
  if ("reason" in binding) {
    return held(binding.reason, {
      attempt_id: attemptId || null,
      transaction_hash: transactionHash || null,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
    });
  }

  const methods: BuyVoidErc20DeliveryReceiptRpcMethodV1[] = [];
  const transport =
    input.transport ||
    createBuyVoidErc20DeliveryReceiptHttpTransportV1(policy);

  const call = async (
    method: BuyVoidErc20DeliveryReceiptRpcMethodV1,
    params: unknown[],
  ): Promise<
    | { ok: true; value: unknown }
    | { ok: false; decision: BuyVoidErc20DeliveryReceiptReconcilerDecisionV1 }
  > => {
    methods.push(method);
    try {
      return { ok: true, value: await transport({ method, params }) };
    } catch (error) {
      return {
        ok: false,
        decision: held("rpc_call_failed", {
          attempt_id: attemptId,
          transaction_hash: transactionHash,
          rpc_url_fingerprint_sha256:
            policy.rpc_url_fingerprint_sha256,
          rpc_methods_used: methods,
          detail: {
            method,
            error_class: String((error as Error)?.name || "Error"),
          },
        }),
      };
    }
  };

  const chain = await call("eth_chainId", []);
  if ("decision" in chain) return chain.decision;
  const chainId = parseHexQuantity(chain.value);
  if (chainId !== 2050n) {
    return held("chain_id_mismatch", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
      detail: {
        observed_chain_id:
          chainId === null ? null : chainId.toString(),
      },
    });
  }

  const receiptResponse = await call(
    "eth_getTransactionReceipt",
    [transactionHash],
  );
  if ("decision" in receiptResponse) return receiptResponse.decision;
  if (receiptResponse.value === null) {
    return held("delivery_receipt_not_found", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }
  const receipt = receiptResponse.value as Record<string, any>;
  if (
    !receipt ||
    typeof receipt !== "object" ||
    Array.isArray(receipt)
  ) {
    return held("delivery_receipt_invalid", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }

  const receiptHash = normalizeHash(receipt.transactionHash);
  const receiptFrom = normalizeAddress(receipt.from);
  const receiptTo = normalizeAddress(receipt.to);
  const receiptBlock = parseHexQuantity(receipt.blockNumber);
  const receiptBlockHash = normalizeHash(receipt.blockHash);
  const receiptStatus = parseHexQuantity(receipt.status);

  if (receiptHash !== transactionHash) {
    return held("delivery_receipt_transaction_hash_mismatch", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }
  if (
    receiptFrom !==
    normalizeAddress(attempt.prepared!.fulfillment_wallet)
  ) {
    return held("delivery_receipt_fulfillment_wallet_mismatch", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }
  if (receiptTo !== policy.void_token_address) {
    return held("delivery_receipt_token_contract_mismatch", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }
  if (receiptBlock === null || receiptBlock <= 0n || !receiptBlockHash) {
    return held("delivery_receipt_block_binding_invalid", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }
  if (receiptStatus === 0n) {
    return held("delivery_transaction_reverted", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }
  if (receiptStatus !== 1n) {
    return held("delivery_receipt_status_invalid", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }

  const logs = Array.isArray(receipt.logs) ? receipt.logs : null;
  if (!logs || logs.length > MAX_RECEIPT_LOGS) {
    return held("delivery_receipt_logs_invalid", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }

  const transferEvents: Array<{
    from: string;
    to: string;
    value: bigint;
    log_index: string;
  }> = [];

  for (const rawLog of logs) {
    const log = rawLog as any;
    if (normalizeAddress(log?.address) !== policy.void_token_address) {
      continue;
    }
    const topics = Array.isArray(log?.topics)
      ? log.topics.map((topic: unknown) =>
          String(topic || "").toLowerCase(),
        )
      : [];
    if (topics[0] !== TRANSFER_TOPIC) continue;
    const logTransactionHash = log?.transactionHash
      ? normalizeHash(log.transactionHash)
      : transactionHash;
    if (logTransactionHash !== transactionHash) {
      return held("transfer_log_transaction_hash_mismatch", {
        attempt_id: attemptId,
        transaction_hash: transactionHash,
        rpc_url_fingerprint_sha256:
          policy.rpc_url_fingerprint_sha256,
        rpc_methods_used: methods,
      });
    }
    let parsed;
    try {
      parsed = TRANSFER_INTERFACE.parseLog({
        topics,
        data: String(log?.data || ""),
      });
    } catch {
      parsed = null;
    }
    if (!parsed || parsed.name !== "Transfer") {
      return held("void_token_transfer_log_invalid", {
        attempt_id: attemptId,
        transaction_hash: transactionHash,
        rpc_url_fingerprint_sha256:
          policy.rpc_url_fingerprint_sha256,
        rpc_methods_used: methods,
      });
    }
    const from = normalizeAddress(parsed.args[0]);
    const to = normalizeAddress(parsed.args[1]);
    let value: bigint;
    try {
      value = BigInt(parsed.args[2]);
    } catch {
      return held("void_token_transfer_amount_invalid", {
        attempt_id: attemptId,
        transaction_hash: transactionHash,
        rpc_url_fingerprint_sha256:
          policy.rpc_url_fingerprint_sha256,
        rpc_methods_used: methods,
      });
    }
    const logIndex = transferLogIndex(log);
    if (!from || !to || !logIndex) {
      return held("void_token_transfer_log_binding_invalid", {
        attempt_id: attemptId,
        transaction_hash: transactionHash,
        rpc_url_fingerprint_sha256:
          policy.rpc_url_fingerprint_sha256,
        rpc_methods_used: methods,
      });
    }
    transferEvents.push({
      from,
      to,
      value,
      log_index: logIndex,
    });
  }

  if (transferEvents.length !== 1) {
    return held("void_token_transfer_event_count_invalid", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
      detail: { transfer_event_count: transferEvents.length },
    });
  }

  const transfer = transferEvents[0];
  const expectedFrom = normalizeAddress(
    attempt.prepared!.fulfillment_wallet,
  );
  const expectedTo = normalizeAddress(
    attempt.prepared!.delivery_address,
  );
  if (transfer.from !== expectedFrom) {
    return held("void_token_transfer_from_mismatch", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }
  if (transfer.to !== expectedTo) {
    return held("void_token_transfer_to_mismatch", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }
  if (transfer.value !== binding.token_amount_atoms) {
    return held("void_token_transfer_amount_mismatch", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
      detail: {
        expected_token_amount_atoms:
          binding.token_amount_atoms.toString(),
        observed_token_amount_atoms: transfer.value.toString(),
      },
    });
  }

  const headResponse = await call("eth_blockNumber", []);
  if ("decision" in headResponse) return headResponse.decision;
  const head = parseHexQuantity(headResponse.value);
  if (head === null || head < receiptBlock) {
    return held("chain_head_response_invalid", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }
  const confirmations = head - receiptBlock + 1n;
  if (confirmations < policy.min_confirmations) {
    return held("insufficient_delivery_confirmations", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
      detail: {
        observed_confirmations: confirmations.toString(),
        required_confirmations:
          policy.min_confirmations.toString(),
      },
    });
  }

  const revalidationResponse = await call(
    "eth_getTransactionReceipt",
    [transactionHash],
  );
  if ("decision" in revalidationResponse) {
    return revalidationResponse.decision;
  }
  const revalidated = receiptStabilityBinding(
    revalidationResponse.value,
    policy,
    transactionHash,
  );
  if (!revalidated) {
    return held("delivery_receipt_revalidation_invalid", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }
  if (
    revalidated.transaction_hash !== receiptHash ||
    revalidated.from !== receiptFrom ||
    revalidated.to !== receiptTo ||
    revalidated.block_number !== receiptBlock ||
    revalidated.block_hash !== receiptBlockHash ||
    revalidated.status !== receiptStatus ||
    revalidated.transfer_from !== transfer.from ||
    revalidated.transfer_to !== transfer.to ||
    revalidated.transfer_value !== transfer.value ||
    revalidated.transfer_log_index !== transfer.log_index
  ) {
    return held("delivery_receipt_changed_during_confirmation_window", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
      detail: {
        first_block_number: receiptBlock.toString(),
        first_block_hash: receiptBlockHash,
        revalidated_block_number: revalidated.block_number.toString(),
        revalidated_block_hash: revalidated.block_hash,
      },
    });
  }

  const evidenceFingerprint = sha256Hex(
    [
      `chain_id=2050`,
      `transaction_hash=${transactionHash}`,
      `receipt_block_number=${receiptBlock.toString()}`,
      `receipt_block_hash=${receiptBlockHash}`,
      `void_token_address=${policy.void_token_address}`,
      `transfer_from=${transfer.from}`,
      `transfer_to=${transfer.to}`,
      `token_amount_atoms=${transfer.value.toString()}`,
      `transfer_log_index=${transfer.log_index}`,
    ].join("\n"),
  );

  return {
    ok: true,
    status: "confirmed",
    marker: VOID_BUY_VOID_ERC20_DELIVERY_RECEIPT_RECONCILER_V1,
    attempt_id: attemptId,
    transaction_hash: transactionHash,
    delivery_confirmed: true,
    chain_id: "2050",
    void_token_address: policy.void_token_address,
    fulfillment_wallet: transfer.from,
    delivery_address: transfer.to,
    void_amount_units: attempt.prepared!.void_amount_units,
    token_amount_atoms: transfer.value.toString(),
    transfer_log_index: transfer.log_index,
    receipt_block_number: receiptBlock.toString(),
    receipt_block_hash: receiptBlockHash,
    observed_confirmation_count: confirmations.toString(),
    receipt_evidence_fingerprint_sha256: evidenceFingerprint,
    rpc_url_fingerprint_sha256:
      policy.rpc_url_fingerprint_sha256,
    rpc_methods_used: methods,
    mutation_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
}
