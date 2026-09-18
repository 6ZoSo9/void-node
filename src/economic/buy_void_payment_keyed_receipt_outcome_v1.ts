import crypto from "node:crypto";
import * as http from "node:http";

import {
  runBuyVoidPaymentKeyedFulfillmentReceiptV1,
  validateBuyVoidPaymentKeyedFulfillmentReceiptPolicyV1,
  type BuyVoidPaymentKeyedFulfillmentReceiptPolicyV1,
  type BuyVoidPaymentKeyedFulfillmentReceiptReadyV1,
  type BuyVoidPaymentKeyedFulfillmentReceiptRpcCallV1,
} from "./buy_void_payment_keyed_fulfillment_receipt_v1.js";
import {
  inspectBuyVoidPaymentKeyedChain2050V1,
  type BuyVoidPaymentKeyedChain2050InspectionRpcCallV1,
} from "./buy_void_payment_keyed_chain2050_inspection_v1.js";
import type {
  BuyVoidPaymentKeyedPreparationCustodyRecordV1,
} from "./buy_void_payment_keyed_preparation_custody_v1.js";
import {
  validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1,
  type BuyVoidPaymentKeyedTransactionPreparationPolicyV1,
} from "./buy_void_payment_keyed_transaction_preparation_v1.js";
import type {
  BuyVoidPaymentKeyedFulfillmentCallReadyV1,
} from "./buy_void_payment_keyed_fulfillment_call_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_OUTCOME_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_OUTCOME_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_OUTCOME_AUTHORITY_V1 = {
  source_only_contract: true,
  exact_payment_keyed_transaction_visibility_required: true,
  exact_success_receipt_verifier_reused: true,
  exact_revert_receipt_binding_required: true,
  receipt_revalidation_required: true,
  receipt_block_hash_stability_required: true,
  minimum_confirmations_required: true,
  transaction_absence_is_pending: true,
  receipt_absence_is_pending: true,
  read_only_rpc_methods: [
    "eth_chainId",
    "eth_getTransactionByHash",
    "eth_getTransactionReceipt",
    "eth_blockNumber",
  ],
  loopback_http_only: true,
  filesystem_read: false,
  filesystem_write: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  automatic_retry: false,
  inventory_mutation: false,
  public_fulfilled_closeout: false,
  runtime_route_mount: false,
  money_movement: false,
} as const;

export type BuyVoidPaymentKeyedReceiptOutcomeRpcMethodV1 =
  | "eth_chainId"
  | "eth_getTransactionByHash"
  | "eth_getTransactionReceipt"
  | "eth_blockNumber";

export type BuyVoidPaymentKeyedReceiptOutcomeRpcCallV1 = {
  method: BuyVoidPaymentKeyedReceiptOutcomeRpcMethodV1;
  params: readonly unknown[];
};

export type BuyVoidPaymentKeyedReceiptOutcomeTransportV1 = (
  call: Readonly<BuyVoidPaymentKeyedReceiptOutcomeRpcCallV1>,
) => Promise<unknown>;

export type BuyVoidPaymentKeyedReceiptOutcomePolicyV1 = {
  preparation_policy: BuyVoidPaymentKeyedTransactionPreparationPolicyV1;
  receipt_policy: BuyVoidPaymentKeyedFulfillmentReceiptPolicyV1;
};

export type BuyVoidPaymentKeyedRevertedReceiptEvidenceV1 = {
  chain_id: "2050";
  attempt_id: string;
  transaction_hash: string;
  fulfillment_wallet_address: string;
  fulfillment_contract_address: string;
  delivery_address: string;
  void_amount_units: string;
  receipt_block_number: string;
  receipt_block_hash: string;
  observed_confirmation_count: string;
  receipt_evidence_fingerprint_sha256: string;
};

export type BuyVoidPaymentKeyedReceiptOutcomeDecisionV1 =
  | {
      ok: true;
      status: "pending";
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_OUTCOME_V1;
      version: 1;
      reason: "transaction_not_visible" | "receipt_not_found";
      attempt_id: string;
      transaction_hash: string;
      rpc_url_fingerprint_sha256: string;
      rpc_methods_used: BuyVoidPaymentKeyedReceiptOutcomeRpcMethodV1[];
      confirmed: null;
      reverted: null;
      mutation_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      automatic_retry_allowed: false;
      money_movement_performed: false;
    }
  | {
      ok: true;
      status: "confirmed";
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_OUTCOME_V1;
      version: 1;
      attempt_id: string;
      transaction_hash: string;
      rpc_url_fingerprint_sha256: string;
      rpc_methods_used: BuyVoidPaymentKeyedReceiptOutcomeRpcMethodV1[];
      confirmed: BuyVoidPaymentKeyedFulfillmentReceiptReadyV1;
      reverted: null;
      mutation_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      automatic_retry_allowed: false;
      money_movement_performed: false;
    }
  | {
      ok: true;
      status: "reverted";
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_OUTCOME_V1;
      version: 1;
      attempt_id: string;
      transaction_hash: string;
      rpc_url_fingerprint_sha256: string;
      rpc_methods_used: BuyVoidPaymentKeyedReceiptOutcomeRpcMethodV1[];
      confirmed: null;
      reverted: BuyVoidPaymentKeyedRevertedReceiptEvidenceV1;
      mutation_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      automatic_retry_allowed: false;
      money_movement_performed: false;
    }
  | {
      ok: false;
      status: "held";
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_OUTCOME_V1;
      version: 1;
      reason: string;
      attempt_id: string | null;
      transaction_hash: string | null;
      rpc_url_fingerprint_sha256: string | null;
      rpc_methods_used: BuyVoidPaymentKeyedReceiptOutcomeRpcMethodV1[];
      mutation_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      automatic_retry_allowed: false;
      money_movement_performed: false;
      detail?: Record<string, unknown>;
    };

const HASH = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const HEX_QUANTITY = /^0x(?:0|[1-9a-f][0-9a-f]*)$/i;
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 65_536;
const MAX_RESPONSE_BYTES = 1_048_576;
const MAX_REQUEST_BYTES = 32_768;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function hash(value: unknown): string {
  const valueText = text(value).toLowerCase();
  return HASH.test(valueText) ? valueText : "";
}

function address(value: unknown): string {
  const valueText = text(value).toLowerCase();
  return ADDRESS.test(valueText) ? valueText : "";
}

function quantity(value: unknown): bigint | null {
  const raw = text(value);
  if (!HEX_QUANTITY.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function positive(value: unknown): bigint | null {
  try {
    const parsed = BigInt(text(value));
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

function boundedPositive(
  value: unknown,
  fallback: number,
  maximum: number,
): number | null {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) &&
      parsed > 0 &&
      parsed <= maximum
    ? parsed
    : null;
}

function held(
  reason: string,
  options: {
    attempt_id?: string | null;
    transaction_hash?: string | null;
    rpc_url_fingerprint_sha256?: string | null;
    rpc_methods_used?: BuyVoidPaymentKeyedReceiptOutcomeRpcMethodV1[];
    detail?: Record<string, unknown>;
  } = {},
): Extract<
  BuyVoidPaymentKeyedReceiptOutcomeDecisionV1,
  { ok: false }
> {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_OUTCOME_V1,
    version: 1,
    reason,
    attempt_id: options.attempt_id ?? null,
    transaction_hash: options.transaction_hash ?? null,
    rpc_url_fingerprint_sha256:
      options.rpc_url_fingerprint_sha256 ?? null,
    rpc_methods_used: options.rpc_methods_used || [],
    mutation_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    automatic_retry_allowed: false,
    money_movement_performed: false,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

function normalizeRpcPolicy(
  input: BuyVoidPaymentKeyedReceiptOutcomePolicyV1,
):
  | {
      ok: true;
      rpc_url: string;
      hostname: "127.0.0.1" | "::1";
      port: number;
      path: string;
      timeout_ms: number;
      max_response_bytes: number;
      rpc_url_fingerprint_sha256: string;
      min_confirmations: bigint;
    }
  | { ok: false; reason: string; fingerprint: string | null } {
  const preparation =
    validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1(
      input?.preparation_policy,
    );
  if (preparation.ok === false) {
    return {
      ok: false,
      reason: "payment_keyed_receipt_outcome_preparation_policy_invalid:" +
        preparation.reason,
      fingerprint: preparation.rpc_url_fingerprint_sha256,
    };
  }
  const receipt =
    validateBuyVoidPaymentKeyedFulfillmentReceiptPolicyV1(
      input?.receipt_policy,
    );
  if (receipt.ok === false) {
    return {
      ok: false,
      reason: "payment_keyed_receipt_outcome_receipt_policy_invalid:" +
        receipt.reason,
      fingerprint: receipt.rpc_url_fingerprint_sha256,
    };
  }
  if (
    receipt.rpc_url_fingerprint_sha256 !==
      preparation.rpc_url_fingerprint_sha256 ||
    address(input.receipt_policy.fulfillment_wallet_address) !==
      address(input.preparation_policy.fulfillment_wallet_address) ||
    address(input.receipt_policy.fulfillment_contract_address) !==
      address(input.preparation_policy.fulfillment_contract_address)
  ) {
    return {
      ok: false,
      reason: "payment_keyed_receipt_outcome_policy_binding_invalid",
      fingerprint: receipt.rpc_url_fingerprint_sha256,
    };
  }

  let url: URL;
  try {
    url = new URL(text(input.receipt_policy.rpc_url));
  } catch {
    return {
      ok: false,
      reason: "payment_keyed_receipt_outcome_rpc_url_invalid",
      fingerprint: receipt.rpc_url_fingerprint_sha256,
    };
  }
  const host = url.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  const hostname =
    host === "127.0.0.1"
      ? "127.0.0.1"
      : host === "::1"
        ? "::1"
        : null;
  const port = Number(url.port || 80);
  const timeout = boundedPositive(
    input.receipt_policy.request_timeout_ms,
    DEFAULT_TIMEOUT_MS,
    MAX_TIMEOUT_MS,
  );
  const maxBytes = boundedPositive(
    input.receipt_policy.max_response_bytes,
    DEFAULT_MAX_RESPONSE_BYTES,
    MAX_RESPONSE_BYTES,
  );
  const minimum = positive(input.receipt_policy.min_confirmations);
  if (
    !hostname ||
    !Number.isInteger(port) ||
    port <= 0 ||
    port > 65_535 ||
    timeout === null ||
    maxBytes === null ||
    minimum === null
  ) {
    return {
      ok: false,
      reason: "payment_keyed_receipt_outcome_rpc_policy_invalid",
      fingerprint: receipt.rpc_url_fingerprint_sha256,
    };
  }
  return {
    ok: true,
    rpc_url: url.toString(),
    hostname,
    port,
    path: url.pathname || "/",
    timeout_ms: timeout,
    max_response_bytes: maxBytes,
    rpc_url_fingerprint_sha256:
      receipt.rpc_url_fingerprint_sha256,
    min_confirmations: minimum,
  };
}

function createHttpTransport(
  policy: Extract<
    ReturnType<typeof normalizeRpcPolicy>,
    { ok: true }
  >,
): BuyVoidPaymentKeyedReceiptOutcomeTransportV1 {
  let nextId = 0;
  return async (call) => {
    const id = ++nextId;
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id,
      method: call.method,
      params: [...call.params],
    });
    if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BYTES) {
      throw new Error("payment_keyed_receipt_outcome_request_too_large");
    }
    return await new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error: Error | null, value?: unknown) => {
        if (settled) return;
        settled = true;
        if (error) reject(error);
        else resolve(value);
      };
      const request = http.request(
        {
          protocol: "http:",
          hostname: policy.hostname,
          port: policy.port,
          path: policy.path,
          method: "POST",
          family: policy.hostname === "::1" ? 6 : 4,
          agent: false,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "Content-Length": String(Buffer.byteLength(body, "utf8")),
            Connection: "close",
            "User-Agent":
              "void-buy-payment-keyed-receipt-outcome-v1",
          },
        },
        (response) => {
          const chunks: Buffer[] = [];
          let total = 0;
          response.on("data", (chunk: Buffer | string) => {
            const buffer = Buffer.isBuffer(chunk)
              ? chunk
              : Buffer.from(chunk);
            total += buffer.length;
            if (total > policy.max_response_bytes) {
              request.destroy(
                new Error(
                  "payment_keyed_receipt_outcome_response_too_large",
                ),
              );
              return;
            }
            chunks.push(buffer);
          });
          response.on("end", () => {
            if (Number(response.statusCode || 0) !== 200) {
              finish(
                new Error(
                  "payment_keyed_receipt_outcome_http_status_invalid",
                ),
              );
              return;
            }
            let payload: any;
            try {
              payload = JSON.parse(
                Buffer.concat(chunks).toString("utf8"),
              );
            } catch {
              finish(
                new Error("payment_keyed_receipt_outcome_json_invalid"),
              );
              return;
            }
            if (
              !payload ||
              payload.jsonrpc !== "2.0" ||
              payload.id !== id ||
              payload.error ||
              !Object.prototype.hasOwnProperty.call(payload, "result")
            ) {
              finish(
                new Error(
                  "payment_keyed_receipt_outcome_rpc_envelope_invalid",
                ),
              );
              return;
            }
            finish(null, payload.result);
          });
        },
      );
      request.on("timeout", () => {
        request.destroy(
          new Error("payment_keyed_receipt_outcome_timeout"),
        );
      });
      request.on("error", (error) => finish(error));
      request.setTimeout(policy.timeout_ms);
      request.end(body);
    });
  };
}

function exactRevertReceipt(
  value: unknown,
  input: BuyVoidPaymentKeyedReceiptOutcomePolicyV1,
  custody: BuyVoidPaymentKeyedPreparationCustodyRecordV1,
): {
  block_number: bigint;
  block_hash: string;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const receipt = value as Record<string, unknown>;
  const transactionHash = hash(receipt.transactionHash);
  const from = address(receipt.from);
  const to = address(receipt.to);
  const status = quantity(receipt.status);
  const blockNumber = quantity(receipt.blockNumber);
  const blockHash = hash(receipt.blockHash);
  if (
    transactionHash !== custody.signed_transaction_hash ||
    from !== address(input.receipt_policy.fulfillment_wallet_address) ||
    to !== address(input.receipt_policy.fulfillment_contract_address) ||
    status !== 0n ||
    blockNumber === null ||
    blockNumber <= 0n ||
    !blockHash
  ) {
    return null;
  }
  return {
    block_number: blockNumber,
    block_hash: blockHash,
  };
}

function sameRevert(
  left: { block_number: bigint; block_hash: string },
  right: { block_number: bigint; block_hash: string },
): boolean {
  return (
    left.block_number === right.block_number &&
    left.block_hash === right.block_hash
  );
}

export async function runBuyVoidPaymentKeyedReceiptOutcomeV1(input: {
  custody: BuyVoidPaymentKeyedPreparationCustodyRecordV1;
  fulfillment_call: BuyVoidPaymentKeyedFulfillmentCallReadyV1;
  policy: BuyVoidPaymentKeyedReceiptOutcomePolicyV1;
  transport?: BuyVoidPaymentKeyedReceiptOutcomeTransportV1;
}): Promise<BuyVoidPaymentKeyedReceiptOutcomeDecisionV1> {
  const normalized = normalizeRpcPolicy(input?.policy);
  const attemptId = text(input?.custody?.request?.attempt_id).toLowerCase();
  const transactionHash = hash(input?.custody?.signed_transaction_hash);
  if (normalized.ok === false) {
    return held(normalized.reason, {
      attempt_id: attemptId || null,
      transaction_hash: transactionHash || null,
      rpc_url_fingerprint_sha256: normalized.fingerprint,
    });
  }
  const policy = normalized;
  const transport = input.transport || createHttpTransport(policy);
  const methods: BuyVoidPaymentKeyedReceiptOutcomeRpcMethodV1[] = [];

  const routedTransport = async (
    call:
      | Readonly<BuyVoidPaymentKeyedChain2050InspectionRpcCallV1>
      | Readonly<BuyVoidPaymentKeyedFulfillmentReceiptRpcCallV1>,
  ): Promise<unknown> => {
    const method = call.method as BuyVoidPaymentKeyedReceiptOutcomeRpcMethodV1;
    methods.push(method);
    return transport({
      method,
      params: call.params,
    });
  };

  const inspection = await inspectBuyVoidPaymentKeyedChain2050V1({
    custody: input.custody,
    preparation_policy: input.policy.preparation_policy,
    transport: routedTransport,
  });
  if (inspection.ok === false) {
    return held(inspection.reason, {
      attempt_id: attemptId || null,
      transaction_hash: transactionHash || null,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
      detail: inspection.detail,
    });
  }
  if (inspection.status === "unknown") {
    return {
      ok: true,
      status: "pending",
      marker: VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_OUTCOME_V1,
      version: 1,
      reason: "transaction_not_visible",
      attempt_id: inspection.attempt_id,
      transaction_hash: inspection.transaction_hash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
      confirmed: null,
      reverted: null,
      mutation_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      automatic_retry_allowed: false,
      money_movement_performed: false,
    };
  }

  let receiptValue: unknown;
  try {
    methods.push("eth_getTransactionReceipt");
    receiptValue = await transport({
      method: "eth_getTransactionReceipt",
      params: [transactionHash],
    });
  } catch (error) {
    return held("payment_keyed_receipt_outcome_receipt_read_failed", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
      detail: {
        error_class: text((error as Error)?.name || "Error"),
      },
    });
  }
  if (receiptValue === null) {
    return {
      ok: true,
      status: "pending",
      marker: VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_OUTCOME_V1,
      version: 1,
      reason: "receipt_not_found",
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
      confirmed: null,
      reverted: null,
      mutation_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      automatic_retry_allowed: false,
      money_movement_performed: false,
    };
  }

  const receiptStatus =
    typeof receiptValue === "object" &&
      receiptValue !== null &&
      !Array.isArray(receiptValue)
      ? quantity((receiptValue as Record<string, unknown>).status)
      : null;

  if (receiptStatus === 1n) {
    const confirmed = await runBuyVoidPaymentKeyedFulfillmentReceiptV1({
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      fulfillment_call: input.fulfillment_call,
      policy: input.policy.receipt_policy,
      transport: routedTransport,
    });
    if (confirmed.ok === false) {
      return held(confirmed.reason, {
        attempt_id: attemptId,
        transaction_hash: transactionHash,
        rpc_url_fingerprint_sha256:
          policy.rpc_url_fingerprint_sha256,
        rpc_methods_used: methods,
        detail: confirmed.detail,
      });
    }
    return {
      ok: true,
      status: "confirmed",
      marker: VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_OUTCOME_V1,
      version: 1,
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
      confirmed,
      reverted: null,
      mutation_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      automatic_retry_allowed: false,
      money_movement_performed: false,
    };
  }

  if (receiptStatus !== 0n) {
    return held("payment_keyed_receipt_outcome_status_invalid", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }

  const first = exactRevertReceipt(
    receiptValue,
    input.policy,
    input.custody,
  );
  if (!first) {
    return held("payment_keyed_receipt_outcome_revert_binding_invalid", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }

  let blockValue: unknown;
  try {
    methods.push("eth_blockNumber");
    blockValue = await transport({
      method: "eth_blockNumber",
      params: [],
    });
  } catch (error) {
    return held("payment_keyed_receipt_outcome_block_read_failed", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
      detail: {
        error_class: text((error as Error)?.name || "Error"),
      },
    });
  }
  const head = quantity(blockValue);
  if (head === null || head < first.block_number) {
    return held("payment_keyed_receipt_outcome_chain_head_invalid", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }
  const confirmations = head - first.block_number + 1n;
  if (confirmations < policy.min_confirmations) {
    return held(
      "payment_keyed_receipt_outcome_revert_confirmations_insufficient",
      {
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
      },
    );
  }

  let secondValue: unknown;
  try {
    methods.push("eth_getTransactionReceipt");
    secondValue = await transport({
      method: "eth_getTransactionReceipt",
      params: [transactionHash],
    });
  } catch (error) {
    return held(
      "payment_keyed_receipt_outcome_revert_revalidation_read_failed",
      {
        attempt_id: attemptId,
        transaction_hash: transactionHash,
        rpc_url_fingerprint_sha256:
          policy.rpc_url_fingerprint_sha256,
        rpc_methods_used: methods,
        detail: {
          error_class: text((error as Error)?.name || "Error"),
        },
      },
    );
  }
  const second = exactRevertReceipt(
    secondValue,
    input.policy,
    input.custody,
  );
  if (!second || !sameRevert(first, second)) {
    return held(
      "payment_keyed_receipt_outcome_revert_changed_during_confirmation_window",
      {
        attempt_id: attemptId,
        transaction_hash: transactionHash,
        rpc_url_fingerprint_sha256:
          policy.rpc_url_fingerprint_sha256,
        rpc_methods_used: methods,
      },
    );
  }

  const evidenceFingerprint = crypto
    .createHash("sha256")
    .update(
      [
        "marker=" + VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_OUTCOME_V1,
        "version=1",
        "status=reverted",
        "chain_id=2050",
        "attempt_id=" + attemptId,
        "transaction_hash=" + transactionHash,
        "fulfillment_wallet_address=" +
          address(input.policy.receipt_policy.fulfillment_wallet_address),
        "fulfillment_contract_address=" +
          address(input.policy.receipt_policy.fulfillment_contract_address),
        "delivery_address=" +
          address(input.fulfillment_call.delivery_address),
        "void_amount_units=" +
          text(input.fulfillment_call.void_amount_units),
        "receipt_block_number=" + first.block_number.toString(),
        "receipt_block_hash=" + first.block_hash,
        "observed_confirmation_count=" + confirmations.toString(),
      ].join("\n"),
      "utf8",
    )
    .digest("hex");

  return {
    ok: true,
    status: "reverted",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_OUTCOME_V1,
    version: 1,
    attempt_id: attemptId,
    transaction_hash: transactionHash,
    rpc_url_fingerprint_sha256:
      policy.rpc_url_fingerprint_sha256,
    rpc_methods_used: methods,
    confirmed: null,
    reverted: {
      chain_id: "2050",
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      fulfillment_wallet_address:
        address(input.policy.receipt_policy.fulfillment_wallet_address),
      fulfillment_contract_address:
        address(input.policy.receipt_policy.fulfillment_contract_address),
      delivery_address:
        address(input.fulfillment_call.delivery_address),
      void_amount_units:
        text(input.fulfillment_call.void_amount_units),
      receipt_block_number: first.block_number.toString(),
      receipt_block_hash: first.block_hash,
      observed_confirmation_count: confirmations.toString(),
      receipt_evidence_fingerprint_sha256: evidenceFingerprint,
    },
    mutation_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    automatic_retry_allowed: false,
    money_movement_performed: false,
  };
}
