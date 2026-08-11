import crypto from "node:crypto";
import * as http from "node:http";
import {
  readBuyVoidExecutionAttemptV1,
  type BuyVoidExecutionAttemptStateV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import type {
  BuyVoidFulfillmentJournalIntentV1,
} from "./buy_void_fulfillment_journal_v1.js";
import {
  VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1,
  runBuyVoidPipelineCommandV1,
  type BuyVoidPipelineCoordinatorDecisionV1,
} from "./buy_void_pipeline_coordinator_v1.js";

export const VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_V1 =
  "VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_V1";

export const VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_CONFIRMATION_V1 =
  "buyVoidReconcileNativeDeliveryReceipt";

export const VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_AUTHORITY_V1 = {
  one_attempt_per_run: true,
  disabled_by_policy_default: true,
  dry_by_default: true,
  exact_confirmation_required_before_apply_io: true,
  server_controlled_root_dir: true,
  server_controlled_rpc_url: true,
  loopback_http_only: true,
  read_only_rpc_methods: [
    "eth_chainId",
    "eth_getTransactionReceipt",
    "eth_blockNumber",
  ],
  filesystem_read: true,
  filesystem_write_when_applied: true,
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

export type BuyVoidNativeDeliveryReceiptRpcMethodV1 =
  | "eth_chainId"
  | "eth_getTransactionReceipt"
  | "eth_blockNumber";

export type BuyVoidNativeDeliveryReceiptRpcCallV1 = {
  method: BuyVoidNativeDeliveryReceiptRpcMethodV1;
  params: unknown[];
};

export type BuyVoidNativeDeliveryReceiptRpcTransportV1 = (
  call: Readonly<BuyVoidNativeDeliveryReceiptRpcCallV1>,
) => Promise<unknown>;

export type BuyVoidNativeDeliveryReceiptReconcilerPolicyV1 = {
  enabled: boolean;
  chain_id: "2050";
  rpc_url: string;
  min_confirmations: string | number;
  fulfillment_wallet_allowlist: string[];
  request_timeout_ms?: string | number;
  max_response_bytes?: string | number;
};

export type BuyVoidNativeDeliveryReceiptReconcilerInputV1 = {
  root_dir: string;
  attempt_id: string;
  intent: BuyVoidFulfillmentJournalIntentV1;
  policy: BuyVoidNativeDeliveryReceiptReconcilerPolicyV1;
  apply?: boolean;
  confirmation?: unknown;
  transport?: BuyVoidNativeDeliveryReceiptRpcTransportV1;
  now_ms?: number;
};

type ReconciliationActionV1 = "record_confirmed" | "record_reverted";

export type BuyVoidNativeDeliveryReceiptReconcilerDecisionV1 =
  | {
      ok: true;
      status:
        | "dry_run_confirmed"
        | "dry_run_reverted"
        | "confirmed"
        | "reverted"
        | "already_confirmed";
      marker: typeof VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_V1;
      attempt_id: string;
      transaction_hash: string;
      applied: boolean;
      mutation_performed: boolean;
      action: ReconciliationActionV1 | "none";
      observed_confirmation_count: string | null;
      rpc_url_fingerprint_sha256: string;
      rpc_methods_used: BuyVoidNativeDeliveryReceiptRpcMethodV1[];
      pipeline_decision?: BuyVoidPipelineCoordinatorDecisionV1;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
    }
  | {
      ok: false;
      status: "held";
      marker: typeof VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_V1;
      reason: string;
      attempt_id: string | null;
      transaction_hash: string | null;
      applied: boolean;
      mutation_performed: false;
      rpc_url_fingerprint_sha256: string | null;
      rpc_methods_used: BuyVoidNativeDeliveryReceiptRpcMethodV1[];
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      detail?: Record<string, unknown>;
    };

type NormalizedPolicyV1 = {
  rpc_url: string;
  rpc_url_fingerprint_sha256: string;
  min_confirmations: bigint;
  fulfillment_wallet_allowlist: Set<string>;
  request_timeout_ms: number;
  max_response_bytes: number;
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

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeAddress(value: unknown): string {
  const address = String(value || "").trim().toLowerCase();
  return ADDRESS.test(address) ? address : "";
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
  options: {
    reason: string;
    input?: BuyVoidNativeDeliveryReceiptReconcilerInputV1;
    attempt_id?: string | null;
    transaction_hash?: string | null;
    rpc_url_fingerprint_sha256?: string | null;
    rpc_methods_used?: BuyVoidNativeDeliveryReceiptRpcMethodV1[];
    detail?: Record<string, unknown>;
  },
): BuyVoidNativeDeliveryReceiptReconcilerDecisionV1 {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_V1,
    reason: options.reason,
    attempt_id: options.attempt_id ?? null,
    transaction_hash: options.transaction_hash ?? null,
    applied: options.input?.apply === true,
    mutation_performed: false,
    rpc_url_fingerprint_sha256:
      options.rpc_url_fingerprint_sha256 ?? null,
    rpc_methods_used: options.rpc_methods_used || [],
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

function normalizePolicy(
  policy: BuyVoidNativeDeliveryReceiptReconcilerPolicyV1,
):
  | { ok: true; policy: NormalizedPolicyV1 }
  | { ok: false; reason: string; fingerprint: string | null } {
  if (policy?.enabled !== true) {
    return {
      ok: false,
      reason: "native_delivery_receipt_reconciler_disabled",
      fingerprint: null,
    };
  }
  if (String(policy.chain_id || "") !== "2050") {
    return {
      ok: false,
      reason: "invalid_native_delivery_chain_id",
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
    !["127.0.0.1", "::1", "localhost"].includes(host)
  ) {
    return {
      ok: false,
      reason: "rpc_url_must_be_loopback_http",
      fingerprint: null,
    };
  }

  const normalizedUrl = url.toString();
  const fingerprint = sha256Hex(normalizedUrl);
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
      min_confirmations: minimum,
      fulfillment_wallet_allowlist: wallets,
      request_timeout_ms: timeout,
      max_response_bytes: maxBytes,
    },
  };
}

function createHttpTransport(
  policy: NormalizedPolicyV1,
): BuyVoidNativeDeliveryReceiptRpcTransportV1 {
  let requestId = 0;
  return async (call) => {
    if (
      !VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_AUTHORITY_V1
        .read_only_rpc_methods.includes(call.method)
    ) {
      throw new Error("receipt_reconciler_rpc_method_not_allowed");
    }
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: ++requestId,
      method: call.method,
      params: call.params,
    });
    if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BYTES) {
      throw new Error("receipt_reconciler_request_too_large");
    }

    return await new Promise((resolve, reject) => {
      const url = new URL(policy.rpc_url);
      let settled = false;
      const finish = (error: Error | null, result?: unknown) => {
        if (settled) return;
        settled = true;
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
            "user-agent": "void-buy-void-native-delivery-receipt-reconciler-v1",
          },
          timeout: policy.request_timeout_ms,
        },
        (response) => {
          const chunks: Buffer[] = [];
          let total = 0;
          response.on("data", (chunk: Buffer) => {
            total += chunk.length;
            if (total > policy.max_response_bytes) {
              request.destroy(new Error("receipt_reconciler_response_too_large"));
              return;
            }
            chunks.push(chunk);
          });
          response.on("end", () => {
            if (Number(response.statusCode || 0) !== 200) {
              finish(new Error("receipt_reconciler_http_status_not_ok"));
              return;
            }
            const contentType = String(
              response.headers["content-type"] || "",
            ).toLowerCase();
            if (!contentType.includes("application/json")) {
              finish(new Error("receipt_reconciler_response_not_json"));
              return;
            }
            let payload: any;
            try {
              payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            } catch {
              finish(new Error("receipt_reconciler_response_json_invalid"));
              return;
            }
            if (
              !payload ||
              payload.jsonrpc !== "2.0" ||
              payload.id !== requestId ||
              payload.error ||
              !("result" in payload)
            ) {
              finish(new Error("receipt_reconciler_rpc_envelope_invalid"));
              return;
            }
            finish(null, payload.result);
          });
        },
      );
      request.on("timeout", () => {
        request.destroy(new Error("receipt_reconciler_rpc_timeout"));
      });
      request.on("error", (error) => finish(error));
      request.end(body);
    });
  };
}

function validAttemptAndIntent(input: {
  attempt: BuyVoidExecutionAttemptStateV1;
  intent: BuyVoidFulfillmentJournalIntentV1;
  policy: NormalizedPolicyV1;
}): { ok: true } | { ok: false; reason: string } {
  const { attempt, intent, policy } = input;
  const prepared = attempt.prepared;
  const broadcast = attempt.broadcast;
  if (
    attempt.status !== "broadcast" ||
    !prepared ||
    !broadcast ||
    attempt.failure ||
    attempt.postbroadcast_failure ||
    attempt.confirmation
  ) {
    return { ok: false, reason: "execution_attempt_not_reconcilable" };
  }
  if (
    prepared.void_delivery_tx_hash !== broadcast.void_delivery_tx_hash ||
    prepared.chain_id !== "2050" ||
    !policy.fulfillment_wallet_allowlist.has(prepared.fulfillment_wallet)
  ) {
    return { ok: false, reason: "execution_attempt_transaction_binding_invalid" };
  }
  if (
    !intent ||
    intent.schema !== "void_buy_void_fulfillment_journal_intent_v1" ||
    intent.claim?.status !== "claimed" ||
    intent.signing_authorized !== false ||
    intent.transaction_broadcast_authorized !== false ||
    intent.money_movement_authorized !== false ||
    intent.claim.canonical_payment_identity !==
      attempt.reservation.canonical_payment_identity ||
    intent.claim.request_id !== attempt.reservation.request_id ||
    intent.claim.instruction_id !== attempt.reservation.instruction_id ||
    intent.claim.unsigned_instruction.delivery_address !==
      prepared.delivery_address ||
    String(intent.claim.unsigned_instruction.void_amount_units) !==
      prepared.void_amount_units
  ) {
    return { ok: false, reason: "fulfillment_intent_attempt_binding_mismatch" };
  }
  return { ok: true };
}

export async function runBuyVoidNativeDeliveryReceiptReconcilerV1(
  input: BuyVoidNativeDeliveryReceiptReconcilerInputV1,
): Promise<BuyVoidNativeDeliveryReceiptReconcilerDecisionV1> {
  const normalized = normalizePolicy(input?.policy);
  if ("reason" in normalized) {
    return held({
      reason: normalized.reason,
      input,
      rpc_url_fingerprint_sha256: normalized.fingerprint,
    });
  }
  const policy = normalized.policy;
  const attemptId = String(input?.attempt_id || "").trim();
  const rootDir = String(input?.root_dir || "").trim();
  if (!SHA256.test(attemptId) || !rootDir || rootDir.includes("\0")) {
    return held({
      reason: "invalid_receipt_reconciliation_selector",
      input,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
    });
  }
  if (
    input.apply === true &&
    String(input.confirmation || "") !==
      VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_CONFIRMATION_V1
  ) {
    return held({
      reason: "explicit_confirmation_required",
      input,
      attempt_id: attemptId,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
      detail: {
        required_confirmation:
          VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_CONFIRMATION_V1,
      },
    });
  }

  let attempt: BuyVoidExecutionAttemptStateV1 | null;
  try {
    attempt = readBuyVoidExecutionAttemptV1({
      root_dir: rootDir,
      attempt_id: attemptId,
    });
  } catch (error) {
    return held({
      reason: "execution_attempt_read_failed",
      input,
      attempt_id: attemptId,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
      detail: {
        error_class: String((error as Error)?.name || "Error").slice(0, 80),
      },
    });
  }
  if (!attempt) {
    return held({
      reason: "execution_attempt_not_found",
      input,
      attempt_id: attemptId,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
    });
  }
  if (attempt.status === "confirmed" && attempt.confirmation) {
    return {
      ok: true,
      status: "already_confirmed",
      marker: VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_V1,
      attempt_id: attemptId,
      transaction_hash: attempt.confirmation.void_delivery_tx_hash,
      applied: input.apply === true,
      mutation_performed: false,
      action: "none",
      observed_confirmation_count:
        attempt.confirmation.confirmed_record.delivery_confirmation_count,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: [],
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    };
  }
  const binding = validAttemptAndIntent({
    attempt,
    intent: input.intent,
    policy,
  });
  if ("reason" in binding) {
    return held({
      reason: binding.reason,
      input,
      attempt_id: attemptId,
      transaction_hash: attempt.prepared?.void_delivery_tx_hash || null,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
    });
  }

  const prepared = attempt.prepared!;
  const transactionHash = prepared.void_delivery_tx_hash;
  const methods: BuyVoidNativeDeliveryReceiptRpcMethodV1[] = [];
  const transport = input.transport || createHttpTransport(policy);
  const call = async (
    method: BuyVoidNativeDeliveryReceiptRpcMethodV1,
    params: unknown[],
  ) => {
    methods.push(method);
    return await transport({ method, params });
  };

  let chainRaw: unknown;
  let receiptRaw: unknown;
  let currentBlockRaw: unknown;
  try {
    chainRaw = await call("eth_chainId", []);
    const observedChain = parseHexQuantity(chainRaw);
    if (observedChain !== 2050n) {
      return held({
        reason: "native_delivery_chain_mismatch",
        input,
        attempt_id: attemptId,
        transaction_hash: transactionHash,
        rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
        rpc_methods_used: methods,
      });
    }
    receiptRaw = await call("eth_getTransactionReceipt", [transactionHash]);
    if (receiptRaw === null) {
      return held({
        reason: "native_delivery_receipt_pending",
        input,
        attempt_id: attemptId,
        transaction_hash: transactionHash,
        rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
        rpc_methods_used: methods,
      });
    }
    currentBlockRaw = await call("eth_blockNumber", []);
  } catch (error) {
    return held({
      reason: "native_delivery_receipt_rpc_failed",
      input,
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
      detail: {
        error_class: String((error as Error)?.name || "Error").slice(0, 80),
      },
    });
  }

  if (!receiptRaw || typeof receiptRaw !== "object" || Array.isArray(receiptRaw)) {
    return held({
      reason: "native_delivery_receipt_invalid",
      input,
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }
  const receipt = receiptRaw as Record<string, unknown>;
  const receiptHash = normalizeHash(receipt.transactionHash);
  const receiptStatus = parseHexQuantity(receipt.status);
  const receiptBlock = parseHexQuantity(receipt.blockNumber);
  const receiptBlockHash = normalizeHash(receipt.blockHash);
  const currentBlock = parseHexQuantity(currentBlockRaw);
  const from = normalizeAddress(receipt.from);
  const to = normalizeAddress(receipt.to);
  if (
    receiptHash !== transactionHash ||
    (receiptStatus !== 0n && receiptStatus !== 1n) ||
    receiptBlock === null ||
    receiptBlock <= 0n ||
    !receiptBlockHash ||
    currentBlock === null ||
    currentBlock < receiptBlock ||
    from !== prepared.fulfillment_wallet ||
    to !== prepared.delivery_address
  ) {
    return held({
      reason: "native_delivery_receipt_binding_mismatch",
      input,
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }
  const confirmations = currentBlock - receiptBlock + 1n;
  if (confirmations < policy.min_confirmations) {
    return held({
      reason: "insufficient_native_delivery_confirmations",
      input,
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
      detail: {
        observed_confirmations: confirmations.toString(),
        required_confirmations: policy.min_confirmations.toString(),
      },
    });
  }

  const action: ReconciliationActionV1 =
    receiptStatus === 1n ? "record_confirmed" : "record_reverted";
  const pipelineDecision = action === "record_confirmed"
    ? runBuyVoidPipelineCommandV1({
        action,
        root_dir: rootDir,
        attempt_id: attemptId,
        intent: input.intent,
        observation: {
          chain_id: "2050",
          transaction_hash: transactionHash,
          transaction_status: "1",
          block_number: receiptBlock.toString(),
          block_hash: receiptBlockHash,
          current_block_number: currentBlock.toString(),
          from_address: prepared.fulfillment_wallet,
          to_address: prepared.delivery_address,
          amount_units: prepared.void_amount_units,
        },
        confirmation_policy: {
          chain_id: "2050",
          min_confirmations: policy.min_confirmations.toString(),
          fulfillment_wallet_allowlist: [prepared.fulfillment_wallet],
        },
        apply: input.apply === true,
        confirmation: input.apply === true
          ? VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.record_confirmed
          : "",
        now_ms: input.now_ms,
      })
    : runBuyVoidPipelineCommandV1({
        action,
        root_dir: rootDir,
        attempt_id: attemptId,
        transaction_hash: transactionHash,
        observation: {
          chain_id: "2050",
          transaction_status: "0",
          block_number: receiptBlock.toString(),
          current_block_number: currentBlock.toString(),
        },
        outcome_policy: {
          outcome_journal_enabled: true,
          chain_id: "2050",
          min_revert_confirmations: policy.min_confirmations.toString(),
        },
        apply: input.apply === true,
        confirmation: input.apply === true
          ? VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.record_reverted
          : "",
        now_ms: input.now_ms,
      });

  if ("reason" in pipelineDecision) {
    return held({
      reason: pipelineDecision.reason,
      input,
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
      detail: pipelineDecision.detail,
    });
  }

  return {
    ok: true,
    status: input.apply === true
      ? action === "record_confirmed" ? "confirmed" : "reverted"
      : action === "record_confirmed" ? "dry_run_confirmed" : "dry_run_reverted",
    marker: VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_V1,
    attempt_id: attemptId,
    transaction_hash: transactionHash,
    applied: input.apply === true,
    mutation_performed: input.apply === true,
    action,
    observed_confirmation_count: confirmations.toString(),
    rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
    rpc_methods_used: methods,
    pipeline_decision: pipelineDecision,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
}
