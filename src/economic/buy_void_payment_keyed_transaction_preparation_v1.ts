import crypto from "node:crypto";
import * as http from "node:http";
import { Interface, getAddress } from "ethers";

import type {
  BuyVoidExecutionAttemptStateV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1,
  type BuyVoidPaymentKeyedFulfillmentCallReadyV1,
} from "./buy_void_payment_keyed_fulfillment_call_v1.js";
import type {
  BuyVoidDeliveryTransactionPlanV1,
} from "./buy_void_delivery_sign_broadcast_adapter_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_TRANSACTION_PREPARATION_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_TRANSACTION_PREPARATION_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_TRANSACTION_PREPARATION_AUTHORITY_V1 = {
  source_only_contract: true,
  payment_keyed_fulfillment_call_required: true,
  fulfillment_contract_target_required: true,
  exact_fulfill_calldata_required: true,
  legacy_void_token_transfer_authority: false,
  canonical_chain_id: "2050",
  transaction_value_wei: "0",
  pending_nonce_required: true,
  execution_state_tag: "pending",
  server_controlled_rpc_url: true,
  loopback_http_only: true,
  read_only_rpc_methods: [
    "eth_chainId",
    "eth_getTransactionCount",
    "eth_gasPrice",
    "eth_estimateGas",
    "eth_getBalance",
  ],
  filesystem_read: false,
  filesystem_write: false,
  wallet_access: false,
  secret_access: false,
  signing: false,
  transaction_broadcast: false,
  runtime_route_mount: false,
  background_loop: false,
  automatic_retry: false,
  receipt_wait: false,
  money_movement: false,
} as const;

export type BuyVoidPaymentKeyedTransactionPreparationRpcMethodV1 =
  | "eth_chainId"
  | "eth_getTransactionCount"
  | "eth_gasPrice"
  | "eth_estimateGas"
  | "eth_getBalance";

export type BuyVoidPaymentKeyedTransactionPreparationRpcCallV1 = {
  method: BuyVoidPaymentKeyedTransactionPreparationRpcMethodV1;
  params: unknown[];
};

export type BuyVoidPaymentKeyedTransactionPreparationTransportV1 = (
  call: Readonly<BuyVoidPaymentKeyedTransactionPreparationRpcCallV1>,
) => Promise<unknown>;

export type BuyVoidPaymentKeyedTransactionPreparationPolicyV1 = {
  enabled: boolean;
  chain_id: "2050";
  rpc_url: string;
  fulfillment_wallet_address: string;
  fulfillment_contract_address: string;
  max_void_amount_units: string | number | bigint;
  gas_limit_multiplier_bps: string | number | bigint;
  max_gas_limit: string | number | bigint;
  fee_multiplier_bps: string | number | bigint;
  max_fee_per_gas_wei: string | number | bigint;
  max_priority_fee_per_gas_wei: string | number | bigint;
  request_timeout_ms?: string | number;
  max_response_bytes?: string | number;
};

export type BuyVoidPaymentKeyedTransactionPreparationInputV1 = {
  attempt: BuyVoidExecutionAttemptStateV1;
  fulfillment_call: BuyVoidPaymentKeyedFulfillmentCallReadyV1;
  policy: BuyVoidPaymentKeyedTransactionPreparationPolicyV1;
  transport?: BuyVoidPaymentKeyedTransactionPreparationTransportV1;
};

export type BuyVoidPaymentKeyedTransactionPreparationReadyV1 = {
  ok: true;
  status: "planned";
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_TRANSACTION_PREPARATION_V1;
  version: 1;
  chain_id: "2050";
  attempt_id: string;
  canonical_payment_identity: string;
  canonical_payment_key_sha256: string;
  fulfillment_wallet_address: string;
  fulfillment_contract_address: string;
  delivery_address: string;
  void_amount_units: string;
  token_amount_atoms: string;
  transaction_calldata: string;
  transaction_calldata_sha256: string;
  call_fingerprint_sha256: string;
  transaction_value_wei: "0";
  pending_nonce: number;
  execution_state: "pending";
  observed_gas_price_wei: string;
  observed_estimated_gas: string;
  computed_gas_limit: string;
  computed_max_fee_per_gas_wei: string;
  configured_priority_fee_per_gas_wei: string;
  estimated_max_gas_cost_wei: string;
  observed_wallet_balance_wei: string;
  sufficient_native_gas_balance: true;
  transaction_plan: BuyVoidDeliveryTransactionPlanV1;
  preparation_fingerprint_sha256: string;
  rpc_url_fingerprint_sha256: string;
  rpc_methods_used: BuyVoidPaymentKeyedTransactionPreparationRpcMethodV1[];
  mutation_performed: false;
  wallet_access_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
};

export type BuyVoidPaymentKeyedTransactionPreparationHeldV1 = {
  ok: false;
  status: "held";
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_TRANSACTION_PREPARATION_V1;
  version: 1;
  reason: string;
  attempt_id: string | null;
  rpc_url_fingerprint_sha256: string | null;
  rpc_methods_used: BuyVoidPaymentKeyedTransactionPreparationRpcMethodV1[];
  mutation_performed: false;
  wallet_access_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
  detail?: Record<string, unknown>;
};

export type BuyVoidPaymentKeyedTransactionPreparationDecisionV1 =
  | BuyVoidPaymentKeyedTransactionPreparationReadyV1
  | BuyVoidPaymentKeyedTransactionPreparationHeldV1;

type NormalizedPolicyV1 = {
  rpc_url: string;
  rpc_url_fingerprint_sha256: string;
  fulfillment_wallet_address: string;
  fulfillment_contract_address: string;
  max_void_amount_units: bigint;
  gas_limit_multiplier_bps: bigint;
  max_gas_limit: bigint;
  fee_multiplier_bps: bigint;
  max_fee_per_gas_wei: bigint;
  max_priority_fee_per_gas_wei: bigint;
  request_timeout_ms: number;
  max_response_bytes: number;
};

const ADDRESS = /^0x[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const PAYMENT_ID =
  /^voidpay1:(base|ethereum):(0x[0-9a-f]{64}):(0|[1-9][0-9]*)$/;
const HEX_QUANTITY = /^0x(?:0|[1-9a-f][0-9a-f]*)$/i;
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const TOKEN_ATOM_MULTIPLIER = 1_000_000_000_000n;
const UINT256_MAX = (1n << 256n) - 1n;
const BPS_DENOMINATOR = 10_000n;
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 65_536;
const MAX_RESPONSE_BYTES = 1_048_576;
const MAX_REQUEST_BYTES = 16_384;
const MAX_PAYMENT_ID_CHARS = 192;
const MAX_UINT256_DECIMAL_DIGITS = 78;
const FULFILLMENT = new Interface([
  "function fulfill(bytes32 paymentDeliveryId,address recipient,uint256 amountAtoms)",
]);

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function address(value: unknown): string {
  const raw = text(value);
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return "";
  try {
    const normalized = getAddress(raw).toLowerCase();
    return ADDRESS.test(normalized) ? normalized : "";
  } catch {
    return "";
  }
}

function parseNonNegative(value: unknown): bigint | null {
  if (typeof value === "bigint") return value >= 0n ? value : null;
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0 ? BigInt(value) : null;
  }
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!DECIMAL.test(raw) || raw.length > MAX_UINT256_DECIMAL_DIGITS) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function parsePositive(value: unknown): bigint | null {
  const parsed = parseNonNegative(value);
  return parsed !== null && parsed > 0n ? parsed : null;
}

function parseHexQuantity(value: unknown): bigint | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!HEX_QUANTITY.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function safeNumber(value: bigint): number | null {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function parseBoundedNumber(
  value: unknown,
  fallback: number,
  maximum: number,
): number | null {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = parsePositive(value);
  if (parsed === null || parsed > BigInt(maximum)) return null;
  return Number(parsed);
}

function ceilMulDiv(value: bigint, multiplier: bigint, denominator: bigint): bigint {
  return (value * multiplier + denominator - 1n) / denominator;
}

function held(
  reason: string,
  options: {
    attempt_id?: string | null;
    rpc_url_fingerprint_sha256?: string | null;
    rpc_methods_used?: BuyVoidPaymentKeyedTransactionPreparationRpcMethodV1[];
    detail?: Record<string, unknown>;
  } = {},
): BuyVoidPaymentKeyedTransactionPreparationHeldV1 {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_TRANSACTION_PREPARATION_V1,
    version: 1,
    reason,
    attempt_id: options.attempt_id ?? null,
    rpc_url_fingerprint_sha256:
      options.rpc_url_fingerprint_sha256 ?? null,
    rpc_methods_used: options.rpc_methods_used || [],
    mutation_performed: false,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

function normalizePolicy(
  input: BuyVoidPaymentKeyedTransactionPreparationPolicyV1,
):
  | { ok: true; policy: NormalizedPolicyV1 }
  | { ok: false; reason: string; fingerprint: string | null } {
  if (input?.enabled !== true) {
    return {
      ok: false,
      reason: "payment_keyed_transaction_preparation_disabled",
      fingerprint: null,
    };
  }
  if (text(input.chain_id) !== "2050") {
    return {
      ok: false,
      reason: "payment_keyed_transaction_preparation_chain_id_invalid",
      fingerprint: null,
    };
  }

  let url: URL;
  try {
    url = new URL(text(input.rpc_url));
  } catch {
    return {
      ok: false,
      reason: "payment_keyed_transaction_preparation_rpc_url_invalid",
      fingerprint: null,
    };
  }
  const host = url.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (
    url.protocol !== "http:" ||
    url.username ||
    url.password ||
    url.hash ||
    !["127.0.0.1", "::1", "localhost"].includes(host)
  ) {
    return {
      ok: false,
      reason: "payment_keyed_transaction_preparation_rpc_must_be_loopback_http",
      fingerprint: null,
    };
  }
  const normalizedUrl = url.toString();
  const fingerprint = sha256(normalizedUrl);

  const wallet = address(input.fulfillment_wallet_address);
  const contract = address(input.fulfillment_contract_address);
  if (!wallet || !contract || wallet === contract) {
    return {
      ok: false,
      reason: "payment_keyed_transaction_preparation_address_invalid",
      fingerprint,
    };
  }

  const maximum = parsePositive(input.max_void_amount_units);
  const gasMultiplier = parsePositive(input.gas_limit_multiplier_bps);
  const maxGas = parsePositive(input.max_gas_limit);
  const feeMultiplier = parsePositive(input.fee_multiplier_bps);
  const maxFee = parsePositive(input.max_fee_per_gas_wei);
  const priorityFee = parseNonNegative(input.max_priority_fee_per_gas_wei);
  if (
    maximum === null ||
    gasMultiplier === null ||
    gasMultiplier < 10_000n ||
    gasMultiplier > 30_000n ||
    maxGas === null ||
    feeMultiplier === null ||
    feeMultiplier < 10_000n ||
    feeMultiplier > 50_000n ||
    maxFee === null ||
    priorityFee === null ||
    priorityFee > maxFee
  ) {
    return {
      ok: false,
      reason: "payment_keyed_transaction_preparation_policy_invalid",
      fingerprint,
    };
  }

  const timeout = parseBoundedNumber(
    input.request_timeout_ms,
    DEFAULT_TIMEOUT_MS,
    MAX_TIMEOUT_MS,
  );
  const maxResponse = parseBoundedNumber(
    input.max_response_bytes,
    DEFAULT_MAX_RESPONSE_BYTES,
    MAX_RESPONSE_BYTES,
  );
  if (timeout === null || maxResponse === null) {
    return {
      ok: false,
      reason: "payment_keyed_transaction_preparation_transport_bounds_invalid",
      fingerprint,
    };
  }

  return {
    ok: true,
    policy: {
      rpc_url: normalizedUrl,
      rpc_url_fingerprint_sha256: fingerprint,
      fulfillment_wallet_address: wallet,
      fulfillment_contract_address: contract,
      max_void_amount_units: maximum,
      gas_limit_multiplier_bps: gasMultiplier,
      max_gas_limit: maxGas,
      fee_multiplier_bps: feeMultiplier,
      max_fee_per_gas_wei: maxFee,
      max_priority_fee_per_gas_wei: priorityFee,
      request_timeout_ms: timeout,
      max_response_bytes: maxResponse,
    },
  };
}

export type BuyVoidPaymentKeyedTransactionPreparationPolicyValidationV1 =
  | {
      ok: true;
      policy_fingerprint_sha256: string;
      rpc_url_fingerprint_sha256: string;
    }
  | {
      ok: false;
      reason: string;
      rpc_url_fingerprint_sha256: string | null;
    };

export function validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1(
  input: BuyVoidPaymentKeyedTransactionPreparationPolicyV1,
): BuyVoidPaymentKeyedTransactionPreparationPolicyValidationV1 {
  const normalized = normalizePolicy(input);
  if (normalized.ok === false) {
    return {
      ok: false,
      reason: normalized.reason,
      rpc_url_fingerprint_sha256: normalized.fingerprint,
    };
  }
  const policy = normalized.policy;
  return {
    ok: true,
    policy_fingerprint_sha256: sha256(
      [
        "chain_id=2050",
        "rpc_url=" + policy.rpc_url,
        "fulfillment_wallet_address=" + policy.fulfillment_wallet_address,
        "fulfillment_contract_address=" + policy.fulfillment_contract_address,
        "max_void_amount_units=" + policy.max_void_amount_units.toString(),
        "gas_limit_multiplier_bps=" + policy.gas_limit_multiplier_bps.toString(),
        "max_gas_limit=" + policy.max_gas_limit.toString(),
        "fee_multiplier_bps=" + policy.fee_multiplier_bps.toString(),
        "max_fee_per_gas_wei=" + policy.max_fee_per_gas_wei.toString(),
        "max_priority_fee_per_gas_wei=" +
          policy.max_priority_fee_per_gas_wei.toString(),
        "request_timeout_ms=" + String(policy.request_timeout_ms),
        "max_response_bytes=" + String(policy.max_response_bytes),
      ].join("\n"),
    ),
    rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
  };
}

function createHttpTransport(
  policy: Readonly<NormalizedPolicyV1>,
): BuyVoidPaymentKeyedTransactionPreparationTransportV1 {
  let nextRequestId = 0;
  return async (call) => {
    if (
      !VOID_BUY_VOID_PAYMENT_KEYED_TRANSACTION_PREPARATION_AUTHORITY_V1
        .read_only_rpc_methods.includes(call.method)
    ) {
      throw new Error("payment_keyed_transaction_preparation_rpc_method_not_allowed");
    }
    const requestId = ++nextRequestId;
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: requestId,
      method: call.method,
      params: call.params,
    });
    if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BYTES) {
      throw new Error("payment_keyed_transaction_preparation_request_too_large");
    }

    return await new Promise((resolve, reject) => {
      const url = new URL(policy.rpc_url);
      const startedAtMs = Date.now();
      let settled = false;
      let totalDeadline: ReturnType<typeof setTimeout> | null = null;
      const finish = (error: Error | null, value?: unknown) => {
        if (settled) return;
        settled = true;
        if (totalDeadline !== null) {
          clearTimeout(totalDeadline);
          totalDeadline = null;
        }
        if (error) reject(error);
        else resolve(value);
      };

      const request = http.request(
        {
          protocol: "http:",
          hostname: url.hostname,
          port: url.port || "80",
          path: url.pathname + url.search,
          method: "POST",
          headers: {
            "content-type": "application/json",
            "content-length": String(Buffer.byteLength(body, "utf8")),
            "user-agent":
              "void-buy-void-payment-keyed-transaction-preparation-v1",
          },
          timeout: policy.request_timeout_ms,
        },
        (response) => {
          const chunks: Buffer[] = [];
          let total = 0;
          response.on("aborted", () => {
            finish(new Error("payment_keyed_transaction_preparation_response_aborted"));
          });
          response.on("error", () => {
            finish(new Error("payment_keyed_transaction_preparation_response_error"));
          });
          response.on("data", (chunk: Buffer) => {
            total += chunk.length;
            if (total > policy.max_response_bytes) {
              request.destroy(
                new Error("payment_keyed_transaction_preparation_response_too_large"),
              );
              return;
            }
            chunks.push(chunk);
          });
          response.on("end", () => {
            if (Number(response.statusCode || 0) !== 200) {
              finish(new Error("payment_keyed_transaction_preparation_http_status_not_ok"));
              return;
            }
            const contentType = String(response.headers["content-type"] || "")
              .toLowerCase()
              .split(";", 1)[0]
              ?.trim() || "";
            if (contentType !== "application/json") {
              finish(new Error("payment_keyed_transaction_preparation_response_not_json"));
              return;
            }
            let payload: any;
            try {
              payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            } catch {
              finish(new Error("payment_keyed_transaction_preparation_response_json_invalid"));
              return;
            }
            if (
              !payload ||
              payload.jsonrpc !== "2.0" ||
              payload.id !== requestId ||
              payload.error ||
              !("result" in payload)
            ) {
              finish(new Error("payment_keyed_transaction_preparation_rpc_envelope_invalid"));
              return;
            }
            finish(null, payload.result);
          });
        },
      );

      request.on("timeout", () => {
        request.destroy(new Error("payment_keyed_transaction_preparation_rpc_timeout"));
      });
      request.on("error", (error) => finish(error));
      totalDeadline = setTimeout(
        () => {
          request.destroy(
            new Error("payment_keyed_transaction_preparation_rpc_total_deadline_exceeded"),
          );
        },
        Math.max(
          0,
          policy.request_timeout_ms - (Date.now() - startedAtMs),
        ),
      );
      request.end(body);
    });
  };
}

function validateCallBinding(
  attempt: BuyVoidExecutionAttemptStateV1,
  call: BuyVoidPaymentKeyedFulfillmentCallReadyV1,
  policy: Readonly<NormalizedPolicyV1>,
):
  | {
      ok: true;
      attempt_id: string;
      canonical_payment_identity: string;
      canonical_payment_key_sha256: string;
      delivery_address: string;
      void_amount_units: bigint;
      token_amount_atoms: bigint;
      calldata: string;
      calldata_sha256: string;
      call_fingerprint_sha256: string;
    }
  | { ok: false; reason: string; attempt_id: string | null } {
  const attemptId = text(attempt?.reservation?.attempt_id).toLowerCase();
  if (
    !SHA256.test(attemptId) ||
    attempt.status !== "reserved" ||
    attempt.prepared ||
    attempt.broadcast ||
    attempt.failure ||
    attempt.postbroadcast_failure ||
    attempt.confirmation
  ) {
    return {
      ok: false,
      reason: "payment_keyed_transaction_preparation_reserved_attempt_required",
      attempt_id: SHA256.test(attemptId) ? attemptId : null,
    };
  }

  if (
    call?.ok !== true ||
    call.status !== "ready" ||
    call.marker !== VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1 ||
    call.version !== 1 ||
    call.chain_id !== "2050" ||
    call.value_wei !== "0" ||
    call.source_finality_ready_verified !== true ||
    call.legacy_local_payment_key_chain_authority !== false ||
    call.wallet_access_performed !== false ||
    call.signing_performed !== false ||
    call.transaction_broadcast_performed !== false ||
    call.money_movement_performed !== false
  ) {
    return {
      ok: false,
      reason: "payment_keyed_transaction_preparation_fulfillment_call_not_ready",
      attempt_id: attemptId,
    };
  }

  const callAttemptId = text(call.attempt_id).toLowerCase();
  const identity = text(call.canonical_payment_identity).toLowerCase();
  const key = text(call.canonical_payment_key_sha256).toLowerCase();
  const contract = address(call.fulfillment_contract_address);
  const delivery = address(call.delivery_address);
  const amountText = text(call.void_amount_units);
  const atomsText = text(call.token_amount_atoms);
  const calldata = text(call.calldata).toLowerCase();
  const calldataSha = text(call.calldata_sha256).toLowerCase();
  const callFingerprint = text(call.call_fingerprint_sha256).toLowerCase();

  if (
    callAttemptId !== attemptId ||
    !identity ||
    identity.length > MAX_PAYMENT_ID_CHARS ||
    !PAYMENT_ID.test(identity) ||
    !SHA256.test(key) ||
    !contract ||
    contract !== policy.fulfillment_contract_address ||
    !delivery ||
    !DECIMAL.test(amountText) ||
    amountText.length > MAX_UINT256_DECIMAL_DIGITS ||
    !DECIMAL.test(atomsText) ||
    atomsText.length > MAX_UINT256_DECIMAL_DIGITS ||
    !/^0x[0-9a-f]+$/.test(calldata) ||
    !SHA256.test(calldataSha) ||
    !SHA256.test(callFingerprint)
  ) {
    return {
      ok: false,
      reason: "payment_keyed_transaction_preparation_fulfillment_call_invalid",
      attempt_id: attemptId,
    };
  }

  const instruction = attempt.reservation.unsigned_instruction;
  if (
    identity !== text(attempt.reservation.canonical_payment_identity).toLowerCase() ||
    delivery !== address(instruction?.delivery_address) ||
    amountText !== text(instruction?.void_amount_units)
  ) {
    return {
      ok: false,
      reason: "payment_keyed_transaction_preparation_attempt_call_binding_mismatch",
      attempt_id: attemptId,
    };
  }

  const amount = BigInt(amountText);
  const atoms = BigInt(atomsText);
  if (
    amount <= 0n ||
    amount > policy.max_void_amount_units ||
    atoms !== amount * TOKEN_ATOM_MULTIPLIER ||
    atoms <= 0n ||
    atoms > UINT256_MAX
  ) {
    return {
      ok: false,
      reason: "payment_keyed_transaction_preparation_amount_invalid",
      attempt_id: attemptId,
    };
  }

  const expectedCalldata = FULFILLMENT.encodeFunctionData("fulfill", [
    "0x" + key,
    delivery,
    atoms,
  ]).toLowerCase();
  if (
    calldata !== expectedCalldata ||
    calldataSha !== sha256(calldata)
  ) {
    return {
      ok: false,
      reason: "payment_keyed_transaction_preparation_calldata_mismatch",
      attempt_id: attemptId,
    };
  }

  const expectedCallFingerprint = sha256(
    JSON.stringify({
      marker: VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1,
      version: 1,
      chain_id: "2050",
      fulfillment_contract_address: contract,
      canonical_payment_identity: identity,
      canonical_payment_key_sha256: key,
      delivery_address: delivery,
      void_amount_units: amount.toString(),
      token_amount_atoms: atoms.toString(),
      value_wei: "0",
      calldata,
    }),
  );
  if (callFingerprint !== expectedCallFingerprint) {
    return {
      ok: false,
      reason: "payment_keyed_transaction_preparation_call_fingerprint_mismatch",
      attempt_id: attemptId,
    };
  }

  return {
    ok: true,
    attempt_id: attemptId,
    canonical_payment_identity: identity,
    canonical_payment_key_sha256: key,
    delivery_address: delivery,
    void_amount_units: amount,
    token_amount_atoms: atoms,
    calldata,
    calldata_sha256: calldataSha,
    call_fingerprint_sha256: callFingerprint,
  };
}

export async function runBuyVoidPaymentKeyedTransactionPreparationV1(
  input: BuyVoidPaymentKeyedTransactionPreparationInputV1,
): Promise<BuyVoidPaymentKeyedTransactionPreparationDecisionV1> {
  if (!input || !input.attempt || !input.fulfillment_call || !input.policy) {
    return held("payment_keyed_transaction_preparation_missing_input");
  }
  const normalized = normalizePolicy(input.policy);
  if (normalized.ok === false) {
    return held(normalized.reason, {
      rpc_url_fingerprint_sha256: normalized.fingerprint,
    });
  }
  const policy = normalized.policy;
  const binding = validateCallBinding(
    input.attempt,
    input.fulfillment_call,
    policy,
  );
  if (binding.ok === false) {
    return held(binding.reason, {
      attempt_id: binding.attempt_id,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
    });
  }

  const methods: BuyVoidPaymentKeyedTransactionPreparationRpcMethodV1[] = [];
  const transport = input.transport || createHttpTransport(policy);
  const callRpc = async (
    method: BuyVoidPaymentKeyedTransactionPreparationRpcMethodV1,
    params: unknown[],
  ): Promise<
    | { ok: true; value: unknown }
    | { ok: false; decision: BuyVoidPaymentKeyedTransactionPreparationHeldV1 }
  > => {
    methods.push(method);
    try {
      return { ok: true, value: await transport({ method, params }) };
    } catch (error) {
      return {
        ok: false,
        decision: held("payment_keyed_transaction_preparation_rpc_call_failed", {
          attempt_id: binding.attempt_id,
          rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
          rpc_methods_used: methods,
          detail: {
            method,
            error_class: String((error as Error)?.name || "Error"),
          },
        }),
      };
    }
  };

  const chainResponse = await callRpc("eth_chainId", []);
  if (chainResponse.ok === false) return chainResponse.decision;
  if (parseHexQuantity(chainResponse.value) !== 2050n) {
    return held("payment_keyed_transaction_preparation_chain_id_mismatch", {
      attempt_id: binding.attempt_id,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }

  const nonceResponse = await callRpc(
    "eth_getTransactionCount",
    [policy.fulfillment_wallet_address, "pending"],
  );
  if (nonceResponse.ok === false) return nonceResponse.decision;
  const nonceBig = parseHexQuantity(nonceResponse.value);
  const pendingNonce = nonceBig === null ? null : safeNumber(nonceBig);
  if (pendingNonce === null) {
    return held("payment_keyed_transaction_preparation_pending_nonce_invalid", {
      attempt_id: binding.attempt_id,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }

  const gasPriceResponse = await callRpc("eth_gasPrice", []);
  if (gasPriceResponse.ok === false) return gasPriceResponse.decision;
  const observedGasPrice = parseHexQuantity(gasPriceResponse.value);
  if (observedGasPrice === null || observedGasPrice <= 0n) {
    return held("payment_keyed_transaction_preparation_gas_price_invalid", {
      attempt_id: binding.attempt_id,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }

  const estimateResponse = await callRpc("eth_estimateGas", [
    {
      from: policy.fulfillment_wallet_address,
      to: policy.fulfillment_contract_address,
      value: "0x0",
      data: binding.calldata,
    },
    "pending",
  ]);
  if (estimateResponse.ok === false) return estimateResponse.decision;
  const observedEstimate = parseHexQuantity(estimateResponse.value);
  if (observedEstimate === null || observedEstimate <= 0n) {
    return held(
      "payment_keyed_transaction_preparation_fulfillment_gas_estimate_invalid",
      {
        attempt_id: binding.attempt_id,
        rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
        rpc_methods_used: methods,
      },
    );
  }

  const gasLimit = ceilMulDiv(
    observedEstimate,
    policy.gas_limit_multiplier_bps,
    BPS_DENOMINATOR,
  );
  if (gasLimit <= 0n || gasLimit > policy.max_gas_limit) {
    return held(
      "payment_keyed_transaction_preparation_fulfillment_gas_limit_exceeds_policy",
      {
        attempt_id: binding.attempt_id,
        rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
        rpc_methods_used: methods,
        detail: {
          observed_estimated_gas: observedEstimate.toString(),
          computed_gas_limit: gasLimit.toString(),
          max_gas_limit: policy.max_gas_limit.toString(),
        },
      },
    );
  }

  const computedMaxFee = ceilMulDiv(
    observedGasPrice,
    policy.fee_multiplier_bps,
    BPS_DENOMINATOR,
  );
  if (
    computedMaxFee <= 0n ||
    computedMaxFee > policy.max_fee_per_gas_wei
  ) {
    return held(
      "payment_keyed_transaction_preparation_computed_max_fee_exceeds_policy",
      {
        attempt_id: binding.attempt_id,
        rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
        rpc_methods_used: methods,
      },
    );
  }
  if (policy.max_priority_fee_per_gas_wei > computedMaxFee) {
    return held(
      "payment_keyed_transaction_preparation_priority_fee_exceeds_computed_max_fee",
      {
        attempt_id: binding.attempt_id,
        rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
        rpc_methods_used: methods,
      },
    );
  }

  const balanceResponse = await callRpc(
    "eth_getBalance",
    [policy.fulfillment_wallet_address, "pending"],
  );
  if (balanceResponse.ok === false) return balanceResponse.decision;
  const observedBalance = parseHexQuantity(balanceResponse.value);
  if (observedBalance === null) {
    return held(
      "payment_keyed_transaction_preparation_wallet_balance_invalid",
      {
        attempt_id: binding.attempt_id,
        rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
        rpc_methods_used: methods,
      },
    );
  }

  const estimatedMaxGasCost = gasLimit * computedMaxFee;
  if (observedBalance < estimatedMaxGasCost) {
    return held(
      "payment_keyed_transaction_preparation_insufficient_native_gas_balance",
      {
        attempt_id: binding.attempt_id,
        rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
        rpc_methods_used: methods,
        detail: {
          required_gas_cost_wei: estimatedMaxGasCost.toString(),
          observed_wallet_balance_wei: observedBalance.toString(),
          transaction_value_wei: "0",
        },
      },
    );
  }

  const transactionPlan: BuyVoidDeliveryTransactionPlanV1 = {
    chain_id: "2050",
    nonce: pendingNonce,
    gas_limit: gasLimit.toString(),
    max_fee_per_gas_wei: computedMaxFee.toString(),
    max_priority_fee_per_gas_wei:
      policy.max_priority_fee_per_gas_wei.toString(),
  };

  const preparationFingerprint = sha256(
    [
      "marker=" + VOID_BUY_VOID_PAYMENT_KEYED_TRANSACTION_PREPARATION_V1,
      "version=1",
      "attempt_id=" + binding.attempt_id,
      "chain_id=2050",
      "fulfillment_wallet_address=" + policy.fulfillment_wallet_address,
      "fulfillment_contract_address=" + policy.fulfillment_contract_address,
      "canonical_payment_identity=" + binding.canonical_payment_identity,
      "canonical_payment_key_sha256=" + binding.canonical_payment_key_sha256,
      "delivery_address=" + binding.delivery_address,
      "void_amount_units=" + binding.void_amount_units.toString(),
      "token_amount_atoms=" + binding.token_amount_atoms.toString(),
      "transaction_calldata_sha256=" + binding.calldata_sha256,
      "call_fingerprint_sha256=" + binding.call_fingerprint_sha256,
      "transaction_value_wei=0",
      "pending_nonce=" + String(pendingNonce),
      "execution_state=pending",
      "observed_gas_price_wei=" + observedGasPrice.toString(),
      "observed_estimated_gas=" + observedEstimate.toString(),
      "computed_gas_limit=" + gasLimit.toString(),
      "computed_max_fee_per_gas_wei=" + computedMaxFee.toString(),
      "configured_priority_fee_per_gas_wei=" +
        policy.max_priority_fee_per_gas_wei.toString(),
      "estimated_max_gas_cost_wei=" + estimatedMaxGasCost.toString(),
      "observed_wallet_balance_wei=" + observedBalance.toString(),
    ].join("\n"),
  );

  return {
    ok: true,
    status: "planned",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_TRANSACTION_PREPARATION_V1,
    version: 1,
    chain_id: "2050",
    attempt_id: binding.attempt_id,
    canonical_payment_identity: binding.canonical_payment_identity,
    canonical_payment_key_sha256: binding.canonical_payment_key_sha256,
    fulfillment_wallet_address: policy.fulfillment_wallet_address,
    fulfillment_contract_address: policy.fulfillment_contract_address,
    delivery_address: binding.delivery_address,
    void_amount_units: binding.void_amount_units.toString(),
    token_amount_atoms: binding.token_amount_atoms.toString(),
    transaction_calldata: binding.calldata,
    transaction_calldata_sha256: binding.calldata_sha256,
    call_fingerprint_sha256: binding.call_fingerprint_sha256,
    transaction_value_wei: "0",
    pending_nonce: pendingNonce,
    execution_state: "pending",
    observed_gas_price_wei: observedGasPrice.toString(),
    observed_estimated_gas: observedEstimate.toString(),
    computed_gas_limit: gasLimit.toString(),
    computed_max_fee_per_gas_wei: computedMaxFee.toString(),
    configured_priority_fee_per_gas_wei:
      policy.max_priority_fee_per_gas_wei.toString(),
    estimated_max_gas_cost_wei: estimatedMaxGasCost.toString(),
    observed_wallet_balance_wei: observedBalance.toString(),
    sufficient_native_gas_balance: true,
    transaction_plan: transactionPlan,
    preparation_fingerprint_sha256: preparationFingerprint,
    rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
    rpc_methods_used: methods,
    mutation_performed: false,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
}
