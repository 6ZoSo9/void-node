import crypto from "node:crypto";
import type { BuyVoidAutoFulfillmentPolicyV1 } from "./buy_void_auto_fulfillment_v1.js";
import type { BuyVoidExecutionAttemptPolicyV1 } from "./buy_void_execution_attempt_journal_v1.js";
import type { BuyVoidInventoryReservationPolicyV1 } from "./buy_void_inventory_reservation_journal_v1.js";
import type { BuyVoidVerifiedPaymentPolicyV2 } from "./buy_void_verified_payment_v2.js";

export const VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_V1 =
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_V1";

export const VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_AUTHORITY_V1 = {
  environment_configuration_only: true,
  caller_policy_input: false,
  single_payment_chain: true,
  fixed_execution_chain_id: 2050,
  fixed_max_attempts_per_payment: 1,
  server_controlled_pool_id: true,
  inventory_pool_env: "VOID_BUY_VOID_INVENTORY_POOL_ID",
  exact_payment_required: true,
  secret_material: false,
  rpc_call: false,
  filesystem_read: false,
  filesystem_write: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
} as const;

export const VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1 = {
  payment_chain: "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_CHAIN",
  payment_usdc_contract:
    "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_USDC_CONTRACT",
  payment_receive_address:
    "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_RECEIVE_ADDRESS",
  payment_current_block_number:
    "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_CURRENT_BLOCK_NUMBER",
  payment_min_confirmations:
    "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_MIN_CONFIRMATIONS",
  rate_void_units_numerator:
    "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_NUMERATOR",
  rate_void_units_denominator:
    "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_DENOMINATOR",
  inventory_policy_version:
    "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_INVENTORY_POLICY_VERSION",
  pool_id: "VOID_BUY_VOID_INVENTORY_POOL_ID",
  pool_capacity_void_units:
    "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_POOL_CAPACITY_VOID_UNITS",
  max_reservation_void_units:
    "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_MAX_RESERVATION_VOID_UNITS",
  fulfillment_wallet_address:
    "VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS",
} as const;

export const VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1 = {
  marker: "VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1",
  version: 1,
  pool_id: "buy-void-presale-v1",
  inventory_policy_version: "presale-v1",
  canonical_presale_max_void: "10000000",
  pool_capacity_void_units: "10000000000000",
  max_reservation_void_units: "10000000000000",
  rate_void_units_numerator: "2",
  rate_void_units_denominator: "1",
  reservation_ceiling_equals_total_pool: true,
  per_buyer_purchase_cap_below_remaining_inventory: false,
  no_per_buyer_purchase_throttle_below_remaining_inventory: true,
  delivery_execution_amount_cap_is_separate: true,
} as const;

const PAYMENT_CHAIN = /^[a-z0-9][a-z0-9_-]{1,31}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,160}$/;
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const MAX_SAFE_POLICY_INTEGER = BigInt(Number.MAX_SAFE_INTEGER);

export type BuyVoidCrashConsistentSagaServerPolicyFingerprintsV1 = {
  verification_rules_sha256: string;
  verification_observation_sha256: string;
  fulfillment_policy_sha256: string;
  inventory_policy_sha256: string;
  execution_policy_sha256: string;
  combined_policy_sha256: string;
};

export type BuyVoidCrashConsistentSagaServerPolicyPublicSummaryV1 = {
  payment_chain: string;
  payment_min_confirmations: number;
  execution_chain_id: "2050";
  max_attempts_per_payment: 1;
  pool_id: string;
  exact_payment_required: true;
  usdc_contract_fingerprint_sha256: string;
  receive_address_fingerprint_sha256: string;
  fulfillment_wallet_fingerprint_sha256: string;
};

export type BuyVoidCrashConsistentSagaServerPolicyV1 = {
  marker: typeof VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_V1;
  version: 1;
  verification_policy: BuyVoidVerifiedPaymentPolicyV2;
  fulfillment_policy: BuyVoidAutoFulfillmentPolicyV1;
  inventory_policy: BuyVoidInventoryReservationPolicyV1;
  execution_policy: BuyVoidExecutionAttemptPolicyV1;
  fingerprints: BuyVoidCrashConsistentSagaServerPolicyFingerprintsV1;
  public_summary: BuyVoidCrashConsistentSagaServerPolicyPublicSummaryV1;
  saga_policy_id: string;
  authority:
    typeof VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_AUTHORITY_V1;
};

export type BuyVoidCrashConsistentSagaServerPolicyDecisionV1 =
  | {
      ok: true;
      status: "configured";
      policy: BuyVoidCrashConsistentSagaServerPolicyV1;
      reason?: never;
      missing_envs?: never;
    }
  | {
      ok: false;
      status: "held";
      policy?: never;
      reason: string;
      missing_envs: string[];
      detail?: Record<string, unknown>;
    };

function held(
  reason: string,
  missingEnvs: string[] = [],
  detail?: Record<string, unknown>,
): BuyVoidCrashConsistentSagaServerPolicyDecisionV1 {
  return {
    ok: false,
    status: "held",
    reason,
    missing_envs: [...missingEnvs].sort(),
    ...(detail ? { detail } : {}),
  };
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeChain(value: unknown): string {
  const raw = text(value).toLowerCase();
  const chain = raw === "eth" ? "ethereum" : raw;
  return PAYMENT_CHAIN.test(chain) ? chain : "";
}

function normalizeAddress(value: unknown): string {
  const address = text(value).toLowerCase();
  return ADDRESS.test(address) ? address : "";
}

function parsePositiveInteger(value: unknown): bigint | null {
  const raw = text(value);
  if (!DECIMAL.test(raw)) return null;
  try {
    const parsed = BigInt(raw);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

function safeNumber(value: bigint): number | null {
  return value <= MAX_SAFE_POLICY_INTEGER ? Number(value) : null;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
    .join(",")}}`;
}

function fingerprint(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(canonical(value), "utf8")
    .digest("hex");
}

function configuredValues(
  env: NodeJS.ProcessEnv,
):
  | {
      ok: true;
      values: Record<
        keyof typeof VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1,
        string
      >;
      missing?: never;
    }
  | {
      ok: false;
      values?: never;
      missing: string[];
    } {
  const values = {} as Record<
    keyof typeof VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1,
    string
  >;
  const missing: string[] = [];
  for (const [key, name] of Object.entries(
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1,
  ) as Array<[
    keyof typeof VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1,
    string,
  ]>) {
    const value = text(env[name]);
    values[key] = value;
    if (!value) missing.push(name);
  }
  return missing.length ? { ok: false, missing } : { ok: true, values };
}

export function readBuyVoidCrashConsistentSagaServerPolicyV1(
  env: NodeJS.ProcessEnv = process.env,
): BuyVoidCrashConsistentSagaServerPolicyDecisionV1 {
  const configured = configuredValues(env);
  if ("missing" in configured) {
    return held("server_policy_not_configured", configured.missing);
  }
  const values = configured.values;

  const paymentChain = normalizeChain(values.payment_chain);
  const usdcContract = normalizeAddress(values.payment_usdc_contract);
  const receiveAddress = normalizeAddress(values.payment_receive_address);
  const fulfillmentWallet = normalizeAddress(values.fulfillment_wallet_address);
  const poolId = text(values.pool_id);
  if (!paymentChain) return held("invalid_payment_chain");
  if (!usdcContract) return held("invalid_payment_usdc_contract");
  if (!receiveAddress) return held("invalid_payment_receive_address");
  if (!fulfillmentWallet) return held("invalid_fulfillment_wallet_address");
  if (!SAFE_ID.test(poolId)) return held("invalid_pool_id");

  const currentBlock = parsePositiveInteger(
    values.payment_current_block_number,
  );
  const minimumConfirmations = parsePositiveInteger(
    values.payment_min_confirmations,
  );
  const rateNumerator = parsePositiveInteger(values.rate_void_units_numerator);
  const rateDenominator = parsePositiveInteger(
    values.rate_void_units_denominator,
  );
  const poolCapacity = parsePositiveInteger(values.pool_capacity_void_units);
  const maximumReservation = parsePositiveInteger(
    values.max_reservation_void_units,
  );
  const minimumConfirmationsNumber = minimumConfirmations === null
    ? null
    : safeNumber(minimumConfirmations);
  const currentBlockNumber = currentBlock === null
    ? null
    : safeNumber(currentBlock);

  if (currentBlockNumber === null) {
    return held("invalid_payment_current_block_number");
  }
  if (
    minimumConfirmationsNumber === null ||
    minimumConfirmationsNumber < 1 ||
    minimumConfirmationsNumber > 1_000_000
  ) {
    return held("invalid_payment_min_confirmations");
  }
  if (rateNumerator === null) return held("invalid_rate_void_units_numerator");
  if (rateDenominator === null) {
    return held("invalid_rate_void_units_denominator");
  }
  if (poolCapacity === null) return held("invalid_pool_capacity_void_units");
  if (
    maximumReservation === null ||
    maximumReservation > poolCapacity
  ) {
    return held("invalid_max_reservation_void_units");
  }

  const inventoryPolicyVersion = text(values.inventory_policy_version);
  if (!SAFE_ID.test(inventoryPolicyVersion)) {
    return held("invalid_inventory_policy_version");
  }

  const verificationPolicy: BuyVoidVerifiedPaymentPolicyV2 = {
    allowed_chains: [paymentChain],
    usdc_contract_by_chain: { [paymentChain]: usdcContract },
    receive_address_by_chain: { [paymentChain]: receiveAddress },
    current_block_number_by_chain: {
      [paymentChain]: currentBlockNumber,
    },
  };
  const fulfillmentPolicy: BuyVoidAutoFulfillmentPolicyV1 = {
    automatic_fulfillment_enabled: true,
    allowed_chains: [paymentChain],
    min_confirmations_by_chain: {
      [paymentChain]: minimumConfirmationsNumber,
    },
    usdc_contract_by_chain: { [paymentChain]: usdcContract },
    receive_address_by_chain: { [paymentChain]: receiveAddress },
    rate_void_units_numerator: rateNumerator.toString(),
    rate_void_units_denominator: rateDenominator.toString(),
    pool_remaining_void_units: poolCapacity.toString(),
    exact_payment_required: true,
  };
  const inventoryPolicy: BuyVoidInventoryReservationPolicyV1 = {
    inventory_reservation_enabled: true,
    pool_id: poolId,
    inventory_policy_version: inventoryPolicyVersion,
    pool_capacity_void_units: poolCapacity.toString(),
    max_reservation_void_units: maximumReservation.toString(),
  };
  const executionPolicy: BuyVoidExecutionAttemptPolicyV1 = {
    attempt_journal_enabled: true,
    max_attempts_per_payment: 1,
    chain_id: "2050",
    fulfillment_wallet_allowlist: [fulfillmentWallet],
  };

  const verificationRules = {
    allowed_chains: verificationPolicy.allowed_chains,
    usdc_contract_by_chain: verificationPolicy.usdc_contract_by_chain,
    receive_address_by_chain: verificationPolicy.receive_address_by_chain,
  };
  const verificationObservation = {
    current_block_number_by_chain:
      verificationPolicy.current_block_number_by_chain,
  };
  const stableFingerprints = {
    verification_rules_sha256: fingerprint(verificationRules),
    fulfillment_policy_sha256: fingerprint(fulfillmentPolicy),
    inventory_policy_sha256: fingerprint(inventoryPolicy),
    execution_policy_sha256: fingerprint(executionPolicy),
  };
  const combinedPolicyFingerprint = fingerprint(stableFingerprints);
  const fingerprints: BuyVoidCrashConsistentSagaServerPolicyFingerprintsV1 = {
    ...stableFingerprints,
    verification_observation_sha256: fingerprint(verificationObservation),
    combined_policy_sha256: combinedPolicyFingerprint,
  };
  const publicSummary: BuyVoidCrashConsistentSagaServerPolicyPublicSummaryV1 = {
    payment_chain: paymentChain,
    payment_min_confirmations: minimumConfirmationsNumber,
    execution_chain_id: "2050",
    max_attempts_per_payment: 1,
    pool_id: poolId,
    exact_payment_required: true,
    usdc_contract_fingerprint_sha256: fingerprint(usdcContract),
    receive_address_fingerprint_sha256: fingerprint(receiveAddress),
    fulfillment_wallet_fingerprint_sha256: fingerprint(fulfillmentWallet),
  };
  const sagaPolicyId =
    `void-buy-void-saga-runtime-policy-v1-${combinedPolicyFingerprint}`;

  return {
    ok: true,
    status: "configured",
    policy: {
      marker: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_V1,
      version: 1,
      verification_policy: verificationPolicy,
      fulfillment_policy: fulfillmentPolicy,
      inventory_policy: inventoryPolicy,
      execution_policy: executionPolicy,
      fingerprints,
      public_summary: publicSummary,
      saga_policy_id: sagaPolicyId,
      authority:
        VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_AUTHORITY_V1,
    },
  };
}


export function readBuyVoidCanonicalPresaleServerPolicyV1(
  env: NodeJS.ProcessEnv = process.env,
): BuyVoidCrashConsistentSagaServerPolicyDecisionV1 {
  const decision = readBuyVoidCrashConsistentSagaServerPolicyV1(env);
  if (decision.ok !== true) return decision;

  const canonical = VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1;
  const policy = decision.policy;

  if (policy.inventory_policy.pool_id !== canonical.pool_id) {
    return held("canonical_presale_pool_id_mismatch", [], {
      expected: canonical.pool_id,
      observed: policy.inventory_policy.pool_id,
    });
  }
  if (
    policy.inventory_policy.inventory_policy_version !==
    canonical.inventory_policy_version
  ) {
    return held("canonical_presale_inventory_policy_version_mismatch", [], {
      expected: canonical.inventory_policy_version,
      observed: policy.inventory_policy.inventory_policy_version,
    });
  }
  if (
    policy.fulfillment_policy.rate_void_units_numerator !==
      canonical.rate_void_units_numerator ||
    policy.fulfillment_policy.rate_void_units_denominator !==
      canonical.rate_void_units_denominator
  ) {
    return held("canonical_presale_fixed_rate_mismatch", [], {
      expected_numerator: canonical.rate_void_units_numerator,
      expected_denominator: canonical.rate_void_units_denominator,
      observed_numerator:
        policy.fulfillment_policy.rate_void_units_numerator,
      observed_denominator:
        policy.fulfillment_policy.rate_void_units_denominator,
    });
  }
  if (
    policy.inventory_policy.pool_capacity_void_units !==
    canonical.pool_capacity_void_units
  ) {
    return held("canonical_presale_pool_capacity_mismatch", [], {
      expected: canonical.pool_capacity_void_units,
      observed: policy.inventory_policy.pool_capacity_void_units,
    });
  }
  if (
    policy.inventory_policy.max_reservation_void_units !==
    canonical.max_reservation_void_units
  ) {
    return held("canonical_presale_reservation_ceiling_mismatch", [], {
      expected: canonical.max_reservation_void_units,
      observed: policy.inventory_policy.max_reservation_void_units,
    });
  }
  if (
    policy.fulfillment_policy.pool_remaining_void_units !==
    canonical.pool_capacity_void_units
  ) {
    return held("canonical_presale_fulfillment_pool_capacity_mismatch");
  }

  return decision;
}
