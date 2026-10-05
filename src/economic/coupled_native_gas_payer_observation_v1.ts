import crypto from "node:crypto";
import {
  getAddress,
} from "ethers";

import {
  createBuyVoidNativeExecutionPlannerHttpTransportV1,
  type BuyVoidNativeExecutionPlannerRpcMethodV1,
  type BuyVoidNativeExecutionPlannerTransportV1,
} from "./buy_void_native_execution_nonce_fee_planner_v1.js";
import {
  buildCoupledNativeGasPayerObservationV1,
  type CoupledNativeGasPayerObservationV1,
} from "./coupled_native_gas_liability_v1.js";

export const VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVER_V1 =
  "VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVER_V1";

export const VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVER_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    existing_buy_void_http_transport_reused: true,
    server_controlled_policy_required: true,
    loopback_http_only: true,
    expected_chain_id: 2050,
    pending_balance_observation: true,
    live_balance_observation: true,
    live_fee_observation: true,
    fee_multiplier_policy_bound: true,
    content_addressed_observation_reused: true,
    observation_duration_bound: true,
    observation_expiry_bound: true,
    read_only_rpc: true,
    rpc_methods: Object.freeze([
      "eth_chainId",
      "eth_gasPrice",
      "eth_getBalance",
    ]),
    nonce_observation: false,
    nonce_allocation: false,
    cross_lane_nonce_scheduler_proven: false,
    trusted_time_source_proven: false,
    filesystem_read: false,
    filesystem_write: false,
    runtime_integration: false,
    wallet_access: false,
    private_key_access: false,
    signing: false,
    transaction_construction: false,
    transaction_broadcast: false,
    chain2050_write: false,
    gas_spend: false,
    inventory_movement: false,
    market_activation: false,
    public_presale_activation: false,
    treasury_or_liquidity_movement: false,
    funds_movement: false,
  });

export type CoupledNativeGasPayerObserverPolicyV1 = {
  rpc_url: string;
  expected_chain_id: "2050";
  payer_address: string;
  fee_multiplier_bps: unknown;
  max_fee_per_gas_wei: unknown;
  observation_ttl_ms: unknown;
  max_observation_duration_ms?: unknown;
  request_timeout_ms?: unknown;
  max_response_bytes?: unknown;
};

export type CoupledNativeGasPayerObserverDecisionV1 =
  | {
      ok: true;
      status: "observed";
      marker: typeof VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVER_V1;
      version: 1;
      chain_id: "2050";
      payer_address: string;
      rpc_url_fingerprint_sha256: string;
      source_identity_sha256: string;
      observed_gas_price_wei: string;
      required_max_fee_per_gas_wei: string;
      observation_duration_ms: number;
      rpc_methods_used: readonly [
        "eth_chainId",
        "eth_gasPrice",
        "eth_getBalance",
      ];
      observation: CoupledNativeGasPayerObservationV1;
      trusted_time_source_proven: false;
      mutation_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      funds_movement_performed: false;
      authority:
        typeof VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVER_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held";
      marker: typeof VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVER_V1;
      version: 1;
      reason: string;
      rpc_url_fingerprint_sha256: string | null;
      payer_address: string | null;
      rpc_methods_used: BuyVoidNativeExecutionPlannerRpcMethodV1[];
      trusted_time_source_proven: false;
      mutation_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      funds_movement_performed: false;
      authority:
        typeof VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVER_AUTHORITY_V1;
      detail?: Readonly<Record<string, unknown>>;
    };

type NormalizedPolicyV1 = {
  rpc_url: string;
  rpc_url_fingerprint_sha256: string;
  payer_address: string;
  fee_multiplier_bps: bigint;
  max_fee_per_gas_wei: bigint;
  observation_ttl_ms: number;
  max_observation_duration_ms: number;
  request_timeout_ms: number;
  max_response_bytes: number;
};

const UINT256_MAX = (1n << 256n) - 1n;
const HEX_QUANTITY = /^0x(?:0|[1-9a-f][0-9a-f]*)$/iu;
const BPS_DENOMINATOR = 10_000n;
const DEFAULT_REQUEST_TIMEOUT_MS = 5_000;
const MAX_REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 65_536;
const MAX_RESPONSE_BYTES = 1_048_576;
const DEFAULT_MAX_OBSERVATION_DURATION_MS = 30_000;
const MAX_OBSERVATION_DURATION_MS = 120_000;
const MAX_OBSERVATION_TTL_MS = 300_000;

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new Error("noncanonical_value");
    return encoded;
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  const record = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(record)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(record[key]))
      .join(",") +
    "}"
  );
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeAddress(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!/^0x[0-9a-fA-F]{40}$/u.test(raw)) return "";
  try {
    return getAddress(raw).toLowerCase();
  } catch {
    return "";
  }
}

function positive(value: unknown): bigint | null {
  if (typeof value === "bigint") return value > 0n ? value : null;
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? BigInt(value) : null;
  }
  const raw = String(value ?? "").trim();
  if (!/^[1-9][0-9]*$/u.test(raw)) return null;
  try {
    const parsed = BigInt(raw);
    return parsed > 0n && parsed <= UINT256_MAX ? parsed : null;
  } catch {
    return null;
  }
}

function boundedPositiveNumber(
  value: unknown,
  fallback: number | null,
  maximum: number,
): number | null {
  const raw = String(value ?? "").trim();
  if (!raw && fallback !== null) return fallback;
  if (!/^[1-9][0-9]*$/u.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maximum
    ? parsed
    : null;
}

function hexQuantity(value: unknown): bigint | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!HEX_QUANTITY.test(raw)) return null;
  try {
    const parsed = BigInt(raw);
    return parsed >= 0n && parsed <= UINT256_MAX ? parsed : null;
  } catch {
    return null;
  }
}

function safeTime(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizePolicy(
  input: CoupledNativeGasPayerObserverPolicyV1,
):
  | { ok: true; policy: NormalizedPolicyV1 }
  | { ok: false; reason: string } {
  const rawUrl = String(input?.rpc_url ?? "").trim();
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "coupled_native_gas_observer_rpc_url_invalid" };
  }
  if (
    parsedUrl.protocol !== "http:" ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.hash
  ) {
    return {
      ok: false,
      reason: "coupled_native_gas_observer_rpc_url_must_be_loopback_http",
    };
  }
  const hostname = parsedUrl.hostname.toLowerCase();
  if (
    hostname !== "127.0.0.1" &&
    hostname !== "::1" &&
    hostname !== "localhost"
  ) {
    return {
      ok: false,
      reason: "coupled_native_gas_observer_rpc_url_must_be_loopback_http",
    };
  }
  if (String(input?.expected_chain_id ?? "") !== "2050") {
    return {
      ok: false,
      reason: "coupled_native_gas_observer_expected_chain_id_invalid",
    };
  }
  const payer = normalizeAddress(input?.payer_address);
  const multiplier = positive(input?.fee_multiplier_bps);
  const maxFee = positive(input?.max_fee_per_gas_wei);
  const ttl = boundedPositiveNumber(
    input?.observation_ttl_ms,
    null,
    MAX_OBSERVATION_TTL_MS,
  );
  const maxDuration = boundedPositiveNumber(
    input?.max_observation_duration_ms,
    DEFAULT_MAX_OBSERVATION_DURATION_MS,
    MAX_OBSERVATION_DURATION_MS,
  );
  const requestTimeout = boundedPositiveNumber(
    input?.request_timeout_ms,
    DEFAULT_REQUEST_TIMEOUT_MS,
    MAX_REQUEST_TIMEOUT_MS,
  );
  const maxResponse = boundedPositiveNumber(
    input?.max_response_bytes,
    DEFAULT_MAX_RESPONSE_BYTES,
    MAX_RESPONSE_BYTES,
  );
  if (
    !payer ||
    multiplier === null ||
    multiplier < 10_000n ||
    multiplier > 50_000n ||
    maxFee === null ||
    ttl === null ||
    maxDuration === null ||
    requestTimeout === null ||
    maxResponse === null
  ) {
    return {
      ok: false,
      reason: "coupled_native_gas_observer_policy_invalid",
    };
  }
  parsedUrl.pathname = parsedUrl.pathname || "/";
  const normalizedUrl = parsedUrl.toString();
  return {
    ok: true,
    policy: {
      rpc_url: normalizedUrl,
      rpc_url_fingerprint_sha256: sha256(normalizedUrl),
      payer_address: payer,
      fee_multiplier_bps: multiplier,
      max_fee_per_gas_wei: maxFee,
      observation_ttl_ms: ttl,
      max_observation_duration_ms: maxDuration,
      request_timeout_ms: requestTimeout,
      max_response_bytes: maxResponse,
    },
  };
}

function held(
  reason: string,
  options: {
    policy?: NormalizedPolicyV1;
    methods?: BuyVoidNativeExecutionPlannerRpcMethodV1[];
    detail?: Readonly<Record<string, unknown>>;
  } = {},
): Extract<CoupledNativeGasPayerObserverDecisionV1, { ok: false }> {
  return Object.freeze({
    ok: false,
    status: "held",
    marker: VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVER_V1,
    version: 1,
    reason,
    rpc_url_fingerprint_sha256:
      options.policy?.rpc_url_fingerprint_sha256 ?? null,
    payer_address: options.policy?.payer_address ?? null,
    rpc_methods_used: options.methods ? [...options.methods] : [],
    trusted_time_source_proven: false,
    mutation_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    funds_movement_performed: false,
    authority: VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVER_AUTHORITY_V1,
    ...(options.detail ? { detail: options.detail } : {}),
  });
}

async function rpc(
  transport: BuyVoidNativeExecutionPlannerTransportV1,
  policy: NormalizedPolicyV1,
  method: BuyVoidNativeExecutionPlannerRpcMethodV1,
  params: unknown[],
  requestId: number,
  methods: BuyVoidNativeExecutionPlannerRpcMethodV1[],
):
  Promise<
    | { ok: true; result: unknown }
    | {
        ok: false;
        decision: Extract<
          CoupledNativeGasPayerObserverDecisionV1,
          { ok: false }
        >;
      }
  > {
  methods.push(method);
  try {
    const response = await transport({
      rpc_url: policy.rpc_url,
      method,
      params,
      request_id: requestId,
      request_timeout_ms: policy.request_timeout_ms,
      max_response_bytes: policy.max_response_bytes,
    });
    if (response.ok !== true) {
      return {
        ok: false,
        decision: held("coupled_native_gas_observer_rpc_call_failed", {
          policy,
          methods,
          detail: Object.freeze({
            method,
            error_code: response.error_code,
            http_status: response.http_status,
          }),
        }),
      };
    }
    return { ok: true, result: response.result };
  } catch (error) {
    return {
      ok: false,
      decision: held("coupled_native_gas_observer_rpc_transport_exception", {
        policy,
        methods,
        detail: Object.freeze({
          method,
          error_class: String((error as Error)?.name || "Error").slice(0, 80),
        }),
      }),
    };
  }
}

function sourceIdentity(policy: NormalizedPolicyV1): string {
  return sha256(canonical({
    marker: VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVER_V1,
    version: 1,
    chain_id: "2050",
    rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
    execution_state: "pending",
    rpc_methods: ["eth_chainId", "eth_gasPrice", "eth_getBalance"],
    fee_multiplier_bps: policy.fee_multiplier_bps.toString(),
    max_fee_per_gas_wei: policy.max_fee_per_gas_wei.toString(),
    observation_ttl_ms: policy.observation_ttl_ms,
    max_observation_duration_ms: policy.max_observation_duration_ms,
    request_timeout_ms: policy.request_timeout_ms,
    max_response_bytes: policy.max_response_bytes,
  }));
}

export async function observeCoupledNativeGasPayerV1(input: {
  policy: CoupledNativeGasPayerObserverPolicyV1;
  read_now_ms: () => unknown;
  transport?: BuyVoidNativeExecutionPlannerTransportV1;
}): Promise<CoupledNativeGasPayerObserverDecisionV1> {
  const normalized = normalizePolicy(input?.policy);
  if (normalized.ok === false) {
    return held(normalized.reason);
  }
  const policy = normalized.policy;
  if (typeof input?.read_now_ms !== "function") {
    return held("coupled_native_gas_observer_time_provider_required", {
      policy,
    });
  }
  const transport =
    input.transport || createBuyVoidNativeExecutionPlannerHttpTransportV1();
  const methods: BuyVoidNativeExecutionPlannerRpcMethodV1[] = [];

  const startedAt = safeTime(input.read_now_ms());
  if (startedAt === null) {
    return held("coupled_native_gas_observer_time_invalid", {
      policy,
      methods,
    });
  }

  const chain = await rpc(
    transport,
    policy,
    "eth_chainId",
    [],
    1,
    methods,
  );
  if (chain.ok === false) return chain.decision;
  const chainId = hexQuantity(chain.result);
  if (chainId !== 2050n) {
    return held("coupled_native_gas_observer_chain_id_mismatch", {
      policy,
      methods,
      detail: Object.freeze({
        observed_chain_id:
          chainId === null ? null : chainId.toString(),
      }),
    });
  }

  const gas = await rpc(
    transport,
    policy,
    "eth_gasPrice",
    [],
    2,
    methods,
  );
  if (gas.ok === false) return gas.decision;
  const gasPrice = hexQuantity(gas.result);
  if (gasPrice === null || gasPrice <= 0n) {
    return held("coupled_native_gas_observer_gas_price_invalid", {
      policy,
      methods,
    });
  }

  const balanceResult = await rpc(
    transport,
    policy,
    "eth_getBalance",
    [policy.payer_address, "pending"],
    3,
    methods,
  );
  if (balanceResult.ok === false) return balanceResult.decision;
  const balance = hexQuantity(balanceResult.result);
  if (balance === null) {
    return held("coupled_native_gas_observer_balance_invalid", {
      policy,
      methods,
    });
  }

  const observedAt = safeTime(input.read_now_ms());
  if (observedAt === null || observedAt < startedAt) {
    return held("coupled_native_gas_observer_time_regression_or_invalid", {
      policy,
      methods,
    });
  }
  const duration = observedAt - startedAt;
  if (duration > policy.max_observation_duration_ms) {
    return held("coupled_native_gas_observer_duration_exceeded", {
      policy,
      methods,
      detail: Object.freeze({
        observation_duration_ms: duration,
        maximum_ms: policy.max_observation_duration_ms,
      }),
    });
  }

  const requiredFee =
    (gasPrice * policy.fee_multiplier_bps +
      BPS_DENOMINATOR -
      1n) /
    BPS_DENOMINATOR;
  if (
    requiredFee <= 0n ||
    requiredFee > UINT256_MAX ||
    requiredFee > policy.max_fee_per_gas_wei
  ) {
    return held(
      "coupled_native_gas_observer_required_fee_exceeds_policy_cap",
      {
        policy,
        methods,
        detail: Object.freeze({
          observed_gas_price_wei: gasPrice.toString(),
          required_max_fee_per_gas_wei: requiredFee.toString(),
          max_fee_per_gas_wei:
            policy.max_fee_per_gas_wei.toString(),
        }),
      },
    );
  }

  const expiresAt = observedAt + policy.observation_ttl_ms;
  if (
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= observedAt
  ) {
    return held("coupled_native_gas_observer_expiry_invalid", {
      policy,
      methods,
    });
  }

  const sourceIdentitySha256 = sourceIdentity(policy);
  const observation = buildCoupledNativeGasPayerObservationV1({
    payer_address: policy.payer_address,
    observed_native_balance_wei: balance.toString(),
    required_max_fee_per_gas_wei: requiredFee.toString(),
    observed_at_ms: observedAt,
    expires_at_ms: expiresAt,
    source_identity_sha256: sourceIdentitySha256,
  });

  if (
    methods.length !== 3 ||
    methods[0] !== "eth_chainId" ||
    methods[1] !== "eth_gasPrice" ||
    methods[2] !== "eth_getBalance"
  ) {
    return held("coupled_native_gas_observer_rpc_method_set_invalid", {
      policy,
      methods,
    });
  }

  return Object.freeze({
    ok: true,
    status: "observed",
    marker: VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVER_V1,
    version: 1,
    chain_id: "2050",
    payer_address: policy.payer_address,
    rpc_url_fingerprint_sha256:
      policy.rpc_url_fingerprint_sha256,
    source_identity_sha256: sourceIdentitySha256,
    observed_gas_price_wei: gasPrice.toString(),
    required_max_fee_per_gas_wei: requiredFee.toString(),
    observation_duration_ms: duration,
    rpc_methods_used: Object.freeze([
      "eth_chainId",
      "eth_gasPrice",
      "eth_getBalance",
    ]),
    observation,
    trusted_time_source_proven: false,
    mutation_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    funds_movement_performed: false,
    authority: VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVER_AUTHORITY_V1,
  });
}
