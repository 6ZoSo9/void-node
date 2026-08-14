import crypto from "node:crypto";
import * as http from "node:http";
import {
  Interface,
  getAddress,
} from "ethers";
import type {
  BuyVoidExecutionAttemptStateV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import type {
  BuyVoidDeliveryTransactionPlanV1,
} from "./buy_void_delivery_sign_broadcast_adapter_v1.js";
import {
  VOID_BUY_VOID_ERC20_DELIVERY_UNIT_SCALE_V1,
} from "./buy_void_delivery_sign_broadcast_adapter_v1.js";

export const VOID_BUY_VOID_ERC20_TRANSACTION_PREPARATION_PLANNER_V1 =
  "VOID_BUY_VOID_ERC20_TRANSACTION_PREPARATION_PLANNER_V1";

export const VOID_BUY_VOID_ERC20_TRANSACTION_PREPARATION_PLANNER_AUTHORITY_V1 = {
  source_only_contract: true,
  one_attempt_per_run: true,
  disabled_by_policy_default: true,
  canonical_chain_id: "2050",
  canonical_asset: "void_token_erc20",
  exact_void_token_transfer_calldata_required: true,
  transaction_value_wei: "0",
  gas_only_native_balance_accounting: true,
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
  raw_transaction_input: false,
  raw_transaction_output: false,
  runtime_route_mount: false,
  background_loop: false,
  automatic_retry: false,
  receipt_wait: false,
  money_movement: false,
} as const;

export type BuyVoidErc20TransactionPreparationPlannerRpcMethodV1 =
  | "eth_chainId"
  | "eth_getTransactionCount"
  | "eth_gasPrice"
  | "eth_estimateGas"
  | "eth_getBalance";

export type BuyVoidErc20TransactionPreparationPlannerRpcCallV1 = {
  method: BuyVoidErc20TransactionPreparationPlannerRpcMethodV1;
  params: unknown[];
};

export type BuyVoidErc20TransactionPreparationPlannerTransportV1 = (
  call: Readonly<BuyVoidErc20TransactionPreparationPlannerRpcCallV1>,
) => Promise<unknown>;

export type BuyVoidErc20TransactionPreparationPlannerPolicyV1 = {
  enabled: boolean;
  chain_id: "2050";
  rpc_url: string;
  fulfillment_wallet_address: string;
  void_token_address: string;
  max_void_amount_units: string | number | bigint;
  gas_limit_multiplier_bps: string | number | bigint;
  max_gas_limit: string | number | bigint;
  fee_multiplier_bps: string | number | bigint;
  max_fee_per_gas_wei: string | number | bigint;
  max_priority_fee_per_gas_wei: string | number | bigint;
  request_timeout_ms?: string | number;
  max_response_bytes?: string | number;
};

export type BuyVoidErc20TransactionPreparationPlannerInputV1 = {
  attempt: BuyVoidExecutionAttemptStateV1;
  policy: BuyVoidErc20TransactionPreparationPlannerPolicyV1;
  transport?: BuyVoidErc20TransactionPreparationPlannerTransportV1;
};

export type BuyVoidErc20TransactionPreparationPlanReadyV1 = {
  ok: true;
  status: "planned";
  marker: typeof VOID_BUY_VOID_ERC20_TRANSACTION_PREPARATION_PLANNER_V1;
  chain_id: "2050";
  attempt_id: string;
  fulfillment_wallet_address: string;
  void_token_address: string;
  delivery_address: string;
  void_amount_units: string;
  token_amount_atoms: string;
  transfer_calldata: string;
  transfer_calldata_sha256: string;
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
  rpc_methods_used: BuyVoidErc20TransactionPreparationPlannerRpcMethodV1[];
  mutation_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
};

export type BuyVoidErc20TransactionPreparationPlanHeldV1 = {
  ok: false;
  status: "held";
  marker: typeof VOID_BUY_VOID_ERC20_TRANSACTION_PREPARATION_PLANNER_V1;
  reason: string;
  attempt_id: string | null;
  rpc_url_fingerprint_sha256: string | null;
  rpc_methods_used: BuyVoidErc20TransactionPreparationPlannerRpcMethodV1[];
  mutation_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
  detail?: Record<string, unknown>;
};

export type BuyVoidErc20TransactionPreparationPlannerDecisionV1 =
  | BuyVoidErc20TransactionPreparationPlanReadyV1
  | BuyVoidErc20TransactionPreparationPlanHeldV1;

type NormalizedPolicyV1 = {
  rpc_url: string;
  rpc_url_fingerprint_sha256: string;
  fulfillment_wallet_address: string;
  void_token_address: string;
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
const HEX_QUANTITY = /^0x(?:0|[1-9a-f][0-9a-f]*)$/i;
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 65_536;
const MAX_RESPONSE_BYTES = 1_048_576;
const MAX_REQUEST_BYTES = 16_384;
const UINT256_MAX = (1n << 256n) - 1n;
const BPS_DENOMINATOR = 10_000n;
const TRANSFER_INTERFACE = new Interface([
  "function transfer(address to, uint256 value) returns (bool)",
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

function parseNonNegative(value: unknown): bigint | null {
  if (typeof value === "bigint") return value >= 0n ? value : null;
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0 ? BigInt(value) : null;
  }
  const raw = String(value ?? "").trim();
  if (!/^(0|[1-9][0-9]*)$/.test(raw)) return null;
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
  const raw = String(value ?? "").trim();
  if (!HEX_QUANTITY.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function safeNumber(value: bigint): number | null {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function parseBoundedNumber(
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

function ceilMulDiv(value: bigint, multiplier: bigint, denominator: bigint): bigint {
  return (value * multiplier + denominator - 1n) / denominator;
}

function held(
  reason: string,
  options: {
    attempt_id?: string | null;
    rpc_url_fingerprint_sha256?: string | null;
    rpc_methods_used?: BuyVoidErc20TransactionPreparationPlannerRpcMethodV1[];
    detail?: Record<string, unknown>;
  } = {},
): BuyVoidErc20TransactionPreparationPlanHeldV1 {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_ERC20_TRANSACTION_PREPARATION_PLANNER_V1,
    reason,
    attempt_id: options.attempt_id ?? null,
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
  input: BuyVoidErc20TransactionPreparationPlannerPolicyV1,
):
  | { ok: true; policy: NormalizedPolicyV1 }
  | { ok: false; reason: string; fingerprint: string | null } {
  if (input?.enabled !== true) {
    return {
      ok: false,
      reason: "erc20_transaction_preparation_planner_disabled",
      fingerprint: null,
    };
  }
  if (String(input.chain_id || "") !== "2050") {
    return {
      ok: false,
      reason: "invalid_erc20_transaction_preparation_chain_id",
      fingerprint: null,
    };
  }

  let url: URL;
  try {
    url = new URL(String(input.rpc_url || "").trim());
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

  const wallet = normalizeAddress(input.fulfillment_wallet_address);
  const token = normalizeAddress(input.void_token_address);
  if (!wallet) {
    return {
      ok: false,
      reason: "invalid_fulfillment_wallet_address",
      fingerprint,
    };
  }
  if (!token || token === wallet) {
    return {
      ok: false,
      reason: "invalid_void_token_address",
      fingerprint,
    };
  }

  const maxAmount = parsePositive(input.max_void_amount_units);
  const gasMultiplier = parsePositive(input.gas_limit_multiplier_bps);
  const maxGas = parsePositive(input.max_gas_limit);
  const feeMultiplier = parsePositive(input.fee_multiplier_bps);
  const maxFee = parsePositive(input.max_fee_per_gas_wei);
  const priorityFee = parseNonNegative(input.max_priority_fee_per_gas_wei);

  if (
    maxAmount === null ||
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
      reason: "invalid_erc20_transaction_preparation_policy",
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
      reason: "invalid_rpc_transport_bounds",
      fingerprint,
    };
  }

  return {
    ok: true,
    policy: {
      rpc_url: normalizedUrl,
      rpc_url_fingerprint_sha256: fingerprint,
      fulfillment_wallet_address: wallet,
      void_token_address: token,
      max_void_amount_units: maxAmount,
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

function createHttpTransport(
  policy: Readonly<NormalizedPolicyV1>,
): BuyVoidErc20TransactionPreparationPlannerTransportV1 {
  let nextRequestId = 0;
  return async (call) => {
    if (
      !VOID_BUY_VOID_ERC20_TRANSACTION_PREPARATION_PLANNER_AUTHORITY_V1
        .read_only_rpc_methods.includes(call.method)
    ) {
      throw new Error("erc20_transaction_preparation_rpc_method_not_allowed");
    }
    const requestId = ++nextRequestId;
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: requestId,
      method: call.method,
      params: call.params,
    });
    if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BYTES) {
      throw new Error("erc20_transaction_preparation_request_too_large");
    }

    return await new Promise((resolve, reject) => {
      const url = new URL(policy.rpc_url);
      const requestStartedAtMs = Date.now();
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
          path: `${url.pathname}${url.search}`,
          method: "POST",
          headers: {
            "content-type": "application/json",
            "content-length": String(Buffer.byteLength(body, "utf8")),
            "user-agent":
              "void-buy-void-erc20-transaction-preparation-planner-v1",
          },
          timeout: policy.request_timeout_ms,
        },
        (response) => {
          const chunks: Buffer[] = [];
          let total = 0;
          response.on("aborted", () => {
            finish(
              new Error("erc20_transaction_preparation_response_aborted"),
            );
          });
          response.on("error", () => {
            finish(
              new Error("erc20_transaction_preparation_response_error"),
            );
          });
          response.on("data", (chunk: Buffer) => {
            total += chunk.length;
            if (total > policy.max_response_bytes) {
              request.destroy(
                new Error("erc20_transaction_preparation_response_too_large"),
              );
              return;
            }
            chunks.push(chunk);
          });
          response.on("end", () => {
            if (Number(response.statusCode || 0) !== 200) {
              finish(
                new Error("erc20_transaction_preparation_http_status_not_ok"),
              );
              return;
            }
            const contentType = String(
              response.headers["content-type"] || "",
            ).toLowerCase();
            if (!contentType.includes("application/json")) {
              finish(
                new Error("erc20_transaction_preparation_response_not_json"),
              );
              return;
            }
            let payload: any;
            try {
              payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            } catch {
              finish(
                new Error("erc20_transaction_preparation_response_json_invalid"),
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
                new Error("erc20_transaction_preparation_rpc_envelope_invalid"),
              );
              return;
            }
            finish(null, payload.result);
          });
        },
      );

      request.on("timeout", () => {
        request.destroy(
          new Error("erc20_transaction_preparation_rpc_timeout"),
        );
      });
      request.on("error", (error) => finish(error));
      totalDeadline = setTimeout(
        () => {
          request.destroy(
            new Error(
              "erc20_transaction_preparation_rpc_total_deadline_exceeded",
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

export async function runBuyVoidErc20TransactionPreparationPlannerV1(
  input: BuyVoidErc20TransactionPreparationPlannerInputV1,
): Promise<BuyVoidErc20TransactionPreparationPlannerDecisionV1> {
  if (!input || !input.attempt || !input.policy) {
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
  const attemptId = String(attempt?.reservation?.attempt_id || "")
    .trim()
    .toLowerCase();

  if (
    !SHA256.test(attemptId) ||
    attempt.status !== "reserved" ||
    attempt.prepared ||
    attempt.broadcast ||
    attempt.failure ||
    attempt.postbroadcast_failure ||
    attempt.confirmation
  ) {
    return held("reserved_execution_attempt_required", {
      attempt_id: SHA256.test(attemptId) ? attemptId : null,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
    });
  }

  const reservation = attempt.reservation;
  if (
    reservation.signing_authorized_by_this_module !== false ||
    reservation.transaction_broadcast_authorized_by_this_module !== false ||
    reservation.money_movement_authorized_by_this_module !== false
  ) {
    return held("execution_attempt_authority_mismatch", {
      attempt_id: attemptId,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
    });
  }

  const instruction = reservation.unsigned_instruction;
  const deliveryAddress = normalizeAddress(instruction?.delivery_address);
  const amountUnits = parsePositive(instruction?.void_amount_units);
  if (!deliveryAddress || deliveryAddress === policy.void_token_address) {
    return held("invalid_delivery_address_binding", {
      attempt_id: attemptId,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
    });
  }
  if (
    amountUnits === null ||
    amountUnits > policy.max_void_amount_units
  ) {
    return held("void_delivery_amount_out_of_policy", {
      attempt_id: attemptId,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
    });
  }

  const multiplier = BigInt(
    VOID_BUY_VOID_ERC20_DELIVERY_UNIT_SCALE_V1.multiplier,
  );
  const tokenAmountAtoms = amountUnits * multiplier;
  if (tokenAmountAtoms <= 0n || tokenAmountAtoms > UINT256_MAX) {
    return held("void_delivery_token_amount_atoms_out_of_range", {
      attempt_id: attemptId,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
    });
  }

  const transferCalldata = TRANSFER_INTERFACE.encodeFunctionData(
    "transfer",
    [deliveryAddress, tokenAmountAtoms],
  );
  const transferCalldataSha256 = sha256Hex(transferCalldata);

  const methods: BuyVoidErc20TransactionPreparationPlannerRpcMethodV1[] = [];
  const transport = input.transport || createHttpTransport(policy);
  const call = async (
    method: BuyVoidErc20TransactionPreparationPlannerRpcMethodV1,
    params: unknown[],
  ): Promise<
    | { ok: true; value: unknown }
    | { ok: false; decision: BuyVoidErc20TransactionPreparationPlanHeldV1 }
  > => {
    methods.push(method);
    try {
      return { ok: true, value: await transport({ method, params }) };
    } catch (error) {
      return {
        ok: false,
        decision: held("rpc_call_failed", {
          attempt_id: attemptId,
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

  const chainResponse = await call("eth_chainId", []);
  if ("decision" in chainResponse) return chainResponse.decision;
  if (parseHexQuantity(chainResponse.value) !== 2050n) {
    return held("chain_id_mismatch", {
      attempt_id: attemptId,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }

  const nonceResponse = await call(
    "eth_getTransactionCount",
    [policy.fulfillment_wallet_address, "pending"],
  );
  if ("decision" in nonceResponse) return nonceResponse.decision;
  const nonceBig = parseHexQuantity(nonceResponse.value);
  const pendingNonce = nonceBig === null ? null : safeNumber(nonceBig);
  if (pendingNonce === null) {
    return held("pending_nonce_invalid", {
      attempt_id: attemptId,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }

  const gasPriceResponse = await call("eth_gasPrice", []);
  if ("decision" in gasPriceResponse) return gasPriceResponse.decision;
  const observedGasPrice = parseHexQuantity(gasPriceResponse.value);
  if (observedGasPrice === null || observedGasPrice <= 0n) {
    return held("gas_price_invalid", {
      attempt_id: attemptId,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }

  const estimateResponse = await call("eth_estimateGas", [
    {
      from: policy.fulfillment_wallet_address,
      to: policy.void_token_address,
      value: "0x0",
      data: transferCalldata,
    },
    "pending",
  ]);
  if ("decision" in estimateResponse) return estimateResponse.decision;
  const observedEstimate = parseHexQuantity(estimateResponse.value);
  if (observedEstimate === null || observedEstimate <= 0n) {
    return held("erc20_transfer_gas_estimate_invalid", {
      attempt_id: attemptId,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }

  const gasLimit = ceilMulDiv(
    observedEstimate,
    policy.gas_limit_multiplier_bps,
    BPS_DENOMINATOR,
  );
  if (gasLimit <= 0n || gasLimit > policy.max_gas_limit) {
    return held("erc20_transfer_gas_limit_exceeds_policy", {
      attempt_id: attemptId,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
      detail: {
        observed_estimated_gas: observedEstimate.toString(),
        computed_gas_limit: gasLimit.toString(),
        max_gas_limit: policy.max_gas_limit.toString(),
      },
    });
  }

  const computedMaxFee = ceilMulDiv(
    observedGasPrice,
    policy.fee_multiplier_bps,
    BPS_DENOMINATOR,
  );
  if (computedMaxFee <= 0n || computedMaxFee > policy.max_fee_per_gas_wei) {
    return held("computed_max_fee_exceeds_policy", {
      attempt_id: attemptId,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
      detail: {
        observed_gas_price_wei: observedGasPrice.toString(),
        computed_max_fee_per_gas_wei: computedMaxFee.toString(),
        max_fee_per_gas_wei: policy.max_fee_per_gas_wei.toString(),
      },
    });
  }
  if (policy.max_priority_fee_per_gas_wei > computedMaxFee) {
    return held("priority_fee_exceeds_computed_max_fee", {
      attempt_id: attemptId,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }

  const balanceResponse = await call(
    "eth_getBalance",
    [policy.fulfillment_wallet_address, "pending"],
  );
  if ("decision" in balanceResponse) return balanceResponse.decision;
  const observedBalance = parseHexQuantity(balanceResponse.value);
  if (observedBalance === null) {
    return held("fulfillment_wallet_balance_invalid", {
      attempt_id: attemptId,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }

  const estimatedMaxGasCost = gasLimit * computedMaxFee;
  if (observedBalance < estimatedMaxGasCost) {
    return held("insufficient_native_balance_for_erc20_gas", {
      attempt_id: attemptId,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
      detail: {
        required_gas_cost_wei: estimatedMaxGasCost.toString(),
        observed_wallet_balance_wei: observedBalance.toString(),
        transaction_value_wei: "0",
      },
    });
  }

  const transactionPlan: BuyVoidDeliveryTransactionPlanV1 = {
    chain_id: "2050",
    nonce: pendingNonce,
    gas_limit: gasLimit.toString(),
    max_fee_per_gas_wei: computedMaxFee.toString(),
    max_priority_fee_per_gas_wei:
      policy.max_priority_fee_per_gas_wei.toString(),
  };

  const preparationFingerprintSha256 = sha256Hex(
    [
      `attempt_id=${attemptId}`,
      `chain_id=2050`,
      `fulfillment_wallet_address=${policy.fulfillment_wallet_address}`,
      `void_token_address=${policy.void_token_address}`,
      `delivery_address=${deliveryAddress}`,
      `void_amount_units=${amountUnits.toString()}`,
      `token_amount_atoms=${tokenAmountAtoms.toString()}`,
      `transfer_calldata_sha256=${transferCalldataSha256}`,
      `transaction_value_wei=0`,
      `pending_nonce=${pendingNonce}`,
      `execution_state=pending`,
      `observed_gas_price_wei=${observedGasPrice.toString()}`,
      `observed_estimated_gas=${observedEstimate.toString()}`,
      `computed_gas_limit=${gasLimit.toString()}`,
      `computed_max_fee_per_gas_wei=${computedMaxFee.toString()}`,
      `configured_priority_fee_per_gas_wei=${policy.max_priority_fee_per_gas_wei.toString()}`,
      `estimated_max_gas_cost_wei=${estimatedMaxGasCost.toString()}`,
      `observed_wallet_balance_wei=${observedBalance.toString()}`,
    ].join("\n"),
  );

  return {
    ok: true,
    status: "planned",
    marker: VOID_BUY_VOID_ERC20_TRANSACTION_PREPARATION_PLANNER_V1,
    chain_id: "2050",
    attempt_id: attemptId,
    fulfillment_wallet_address: policy.fulfillment_wallet_address,
    void_token_address: policy.void_token_address,
    delivery_address: deliveryAddress,
    void_amount_units: amountUnits.toString(),
    token_amount_atoms: tokenAmountAtoms.toString(),
    transfer_calldata: transferCalldata,
    transfer_calldata_sha256: transferCalldataSha256,
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
    preparation_fingerprint_sha256: preparationFingerprintSha256,
    rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
    rpc_methods_used: methods,
    mutation_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
}
