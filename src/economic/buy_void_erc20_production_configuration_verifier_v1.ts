import crypto from "node:crypto";
import path from "node:path";
import { getAddress } from "ethers";
import {
  VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_V1,
} from "./buy_void_erc20_delivery_runtime_activation_configuration_contract_v1.js";
import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1,
} from "./buy_void_erc20_production_credential_binding_evidence_v1.js";
import {
  validateBuyVoidErc20TransactionPreparationPlannerPolicyV1,
} from "./buy_void_erc20_transaction_preparation_planner_v1.js";

export const VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_VERIFIER_V1 =
  "VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_VERIFIER_V1";

export const VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_VERIFIER_AUTHORITY_V1 = {
  pure_configuration_validation_only: true,
  explicit_candidate_input_required: true,
  process_environment_read: false,
  filesystem_read: false,
  filesystem_write: false,
  credential_read: false,
  wallet_access: false,
  rpc_call: false,
  signing: false,
  transaction_broadcast: false,
  runtime_activation: false,
  dependency_injection_activation: false,
  inventory_funding: false,
  treasury_liquidity_action: false,
  money_movement: false,
} as const;

const CONTRACT =
  VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_V1;
const CREDENTIAL_EVIDENCE =
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const SHA256 = /^[0-9a-f]{64}$/;
const POSITIVE_DECIMAL = /^[1-9][0-9]*$/;

export const VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_REQUIRED_KEYS_V1 = [
  "VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED",
  "VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_ENABLED",
  "VOID_BUY_VOID_RUNTIME_DIR",
  "VOID_BUY_VOID_DELIVERY_CHAIN_ID",
  "VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS",
  "VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS",
  "VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS",
  "VOID_BUY_VOID_DELIVERY_MAX_GAS_LIMIT",
  "VOID_BUY_VOID_DELIVERY_MAX_FEE_PER_GAS_WEI",
  "VOID_BUY_VOID_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI",
  "VOID_BUY_VOID_ERC20_EXECUTION_RPC_URL",
  "VOID_BUY_VOID_DELIVERY_GAS_LIMIT_MULTIPLIER_BPS",
  "VOID_BUY_VOID_DELIVERY_FEE_MULTIPLIER_BPS",
  "VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS",
  "VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID",
] as const;

export const VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_OPTIONAL_KEYS_V1 = [
  "VOID_BUY_VOID_DELIVERY_RPC_TIMEOUT_MS",
  "VOID_BUY_VOID_DELIVERY_RPC_MAX_RESPONSE_BYTES",
] as const;

const ALLOWED_KEYS = new Set<string>([
  ...VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_REQUIRED_KEYS_V1,
  ...VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_OPTIONAL_KEYS_V1,
]);

type CandidateRecordV1 = Record<string, string>;

export type BuyVoidErc20ProductionConfigurationVerificationV1 =
  | {
      ok: true;
      status: "candidate_verified_held_on_activation";
      marker: typeof VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_VERIFIER_V1;
      version: 1;
      reason?: never;
      configuration_fingerprint_sha256: string;
      planner_policy_fingerprint_sha256: string;
      rpc_url_fingerprint_sha256: string;
      runtime_root_dir: string;
      chain_id: "2050";
      void_token_address: string;
      fulfillment_wallet_address: string;
      max_amount_units: string;
      min_confirmations: string;
      credential_binding_evidence_id_sha256: string;
      candidate_configuration_values_verified: true;
      token_address_content_bound: true;
      credential_wallet_binding_verified: true;
      full_presale_delivery_ceiling_verified: true;
      runtime_remains_disabled: true;
      dependency_injection_remains_disabled: true;
      production_configuration_applied: false;
      runtime_activation_authorized: false;
      inventory_funding_authorized: false;
      next_gate: "separate_operator_candidate_binding_and_activation_authorization";
      authority: typeof VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_VERIFIER_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held";
      marker: typeof VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_VERIFIER_V1;
      version: 1;
      reason: string;
      detail?: Record<string, unknown>;
      candidate_configuration_values_verified: false;
      production_configuration_applied: false;
      runtime_activation_authorized: false;
      inventory_funding_authorized: false;
      authority: typeof VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_VERIFIER_AUTHORITY_V1;
    };

function held(
  reason: string,
  detail?: Record<string, unknown>,
): Extract<BuyVoidErc20ProductionConfigurationVerificationV1, { ok: false }> {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_VERIFIER_V1,
    version: 1,
    reason,
    ...(detail ? { detail } : {}),
    candidate_configuration_values_verified: false,
    production_configuration_applied: false,
    runtime_activation_authorized: false,
    inventory_funding_authorized: false,
    authority:
      VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_VERIFIER_AUTHORITY_V1,
  };
}

function directRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  return value as Record<string, unknown>;
}

function normalizedAddress(value: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) return "";
  try {
    return getAddress(value).toLowerCase();
  } catch {
    return "";
  }
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function strictCandidate(value: unknown): CandidateRecordV1 | null {
  const record = directRecord(value);
  if (!record) return null;
  for (const key of Object.keys(record)) {
    if (!ALLOWED_KEYS.has(key)) return null;
  }
  for (const key of VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_REQUIRED_KEYS_V1) {
    if (!(key in record)) return null;
  }
  for (const [key, raw] of Object.entries(record)) {
    if (typeof raw !== "string" || !raw || raw !== raw.trim()) return null;
    if (!ALLOWED_KEYS.has(key)) return null;
  }
  return record as CandidateRecordV1;
}

function validateRpcUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== "http:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.port ||
    !["127.0.0.1", "::1", "[::1]"].includes(host)
  ) return null;
  return url.toString();
}

export function verifyBuyVoidErc20ProductionConfigurationV1(
  input: unknown,
): BuyVoidErc20ProductionConfigurationVerificationV1 {
  if (
    CONTRACT.next_gate !== "production_broad_delivery_configuration_verification" ||
    CONTRACT.production_broad_delivery_configuration_verified !== false ||
    CONTRACT.canonical_delivery_runtime_activation_ready !== false
  ) {
    return held("production_configuration_activation_contract_drift");
  }

  const candidate = strictCandidate(input);
  if (!candidate) {
    const record = directRecord(input);
    if (record) {
      const unknown = Object.keys(record).find((key) => !ALLOWED_KEYS.has(key));
      if (unknown) return held("production_configuration_unknown_key", { key: unknown });
      const missing = VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_REQUIRED_KEYS_V1
        .filter((key) => !(key in record));
      if (missing.length) return held("production_configuration_missing_field", { fields: missing });
    }
    return held("production_configuration_candidate_shape_invalid");
  }

  if (candidate.VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED !== "0") {
    return held("production_configuration_runtime_must_remain_disabled");
  }
  if (
    candidate.VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_ENABLED !== "0"
  ) {
    return held("production_configuration_dependency_injection_must_remain_disabled");
  }

  const rootDir = path.normalize(candidate.VOID_BUY_VOID_RUNTIME_DIR);
  if (
    !path.isAbsolute(candidate.VOID_BUY_VOID_RUNTIME_DIR) ||
    rootDir === path.parse(rootDir).root ||
    rootDir.includes("\u0000")
  ) {
    return held("production_configuration_runtime_root_invalid");
  }

  if (candidate.VOID_BUY_VOID_DELIVERY_CHAIN_ID !== CONTRACT.canonical_chain_id) {
    return held("production_configuration_chain_id_mismatch");
  }

  const wallet = normalizedAddress(
    candidate.VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS,
  );
  const token = normalizedAddress(candidate.VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS);
  const expectedWallet = normalizedAddress(CREDENTIAL_EVIDENCE.expected_wallet_address);
  const derivedWallet = normalizedAddress(CREDENTIAL_EVIDENCE.derived_wallet_address);
  if (!wallet || !expectedWallet || wallet !== expectedWallet) {
    return held("production_configuration_wallet_evidence_mismatch");
  }
  if (!token || token === ZERO_ADDRESS || token === wallet) {
    return held("production_configuration_token_address_invalid");
  }

  const expectedEvidenceId =
    CONTRACT.runtime_configuration_contract
      .required_credential_binding_evidence_id_sha256;
  if (
    !SHA256.test(expectedEvidenceId) ||
    CREDENTIAL_EVIDENCE.evidence_id_sha256 !== expectedEvidenceId ||
    CREDENTIAL_EVIDENCE.exact_wallet_binding !== true ||
    !derivedWallet ||
    derivedWallet !== expectedWallet ||
    CREDENTIAL_EVIDENCE.credential_id !==
      CONTRACT.runtime_configuration_contract.fixed_signer_credential_id ||
    candidate.VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID !==
      expectedEvidenceId
  ) {
    return held("production_configuration_credential_evidence_mismatch");
  }

  const canonicalCapacity =
    CONTRACT.presale_invariant_readiness
      .canonical_presale_max_fulfillment_units_6_decimal;
  if (candidate.VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS !== canonicalCapacity) {
    return held("production_configuration_public_delivery_cap_mismatch", {
      expected_max_amount_units: canonicalCapacity,
    });
  }

  const minConfirmations = candidate.VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS;
  if (
    !POSITIVE_DECIMAL.test(minConfirmations) ||
    BigInt(minConfirmations) > 1_000n
  ) {
    return held("production_configuration_min_confirmations_invalid");
  }

  const rpcUrl = validateRpcUrl(candidate.VOID_BUY_VOID_ERC20_EXECUTION_RPC_URL);
  if (!rpcUrl) return held("production_configuration_rpc_url_invalid");

  const plannerValidation =
    validateBuyVoidErc20TransactionPreparationPlannerPolicyV1({
      enabled: true,
      chain_id: "2050",
      rpc_url: rpcUrl,
      fulfillment_wallet_address: wallet,
      void_token_address: token,
      max_void_amount_units: candidate.VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS,
      gas_limit_multiplier_bps:
        candidate.VOID_BUY_VOID_DELIVERY_GAS_LIMIT_MULTIPLIER_BPS,
      max_gas_limit: candidate.VOID_BUY_VOID_DELIVERY_MAX_GAS_LIMIT,
      fee_multiplier_bps:
        candidate.VOID_BUY_VOID_DELIVERY_FEE_MULTIPLIER_BPS,
      max_fee_per_gas_wei:
        candidate.VOID_BUY_VOID_DELIVERY_MAX_FEE_PER_GAS_WEI,
      max_priority_fee_per_gas_wei:
        candidate.VOID_BUY_VOID_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI,
      ...(candidate.VOID_BUY_VOID_DELIVERY_RPC_TIMEOUT_MS
        ? {
            request_timeout_ms:
              candidate.VOID_BUY_VOID_DELIVERY_RPC_TIMEOUT_MS,
          }
        : {}),
      ...(candidate.VOID_BUY_VOID_DELIVERY_RPC_MAX_RESPONSE_BYTES
        ? {
            max_response_bytes:
              candidate.VOID_BUY_VOID_DELIVERY_RPC_MAX_RESPONSE_BYTES,
          }
        : {}),
    });
  if (plannerValidation.ok === false) {
    return held("production_configuration_planner_policy_held", {
      planner_reason: plannerValidation.reason,
    });
  }

  const fingerprintMaterial = [
    `marker=${VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_VERIFIER_V1}`,
    `runtime_root_dir=${rootDir}`,
    `runtime_enable=0`,
    `dependency_injection_enable=0`,
    `planner_policy_fingerprint_sha256=${plannerValidation.policy_fingerprint_sha256}`,
    `receipt_min_confirmations=${minConfirmations}`,
    `credential_binding_evidence_id_sha256=${expectedEvidenceId}`,
    `presale_capacity_fulfillment_units=${canonicalCapacity}`,
  ].join("\n");

  return {
    ok: true,
    status: "candidate_verified_held_on_activation",
    marker: VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_VERIFIER_V1,
    version: 1,
    configuration_fingerprint_sha256: sha256(fingerprintMaterial),
    planner_policy_fingerprint_sha256:
      plannerValidation.policy_fingerprint_sha256,
    rpc_url_fingerprint_sha256:
      plannerValidation.rpc_url_fingerprint_sha256,
    runtime_root_dir: rootDir,
    chain_id: "2050",
    void_token_address: token,
    fulfillment_wallet_address: wallet,
    max_amount_units: canonicalCapacity,
    min_confirmations: minConfirmations,
    credential_binding_evidence_id_sha256: expectedEvidenceId,
    candidate_configuration_values_verified: true,
    token_address_content_bound: true,
    credential_wallet_binding_verified: true,
    full_presale_delivery_ceiling_verified: true,
    runtime_remains_disabled: true,
    dependency_injection_remains_disabled: true,
    production_configuration_applied: false,
    runtime_activation_authorized: false,
    inventory_funding_authorized: false,
    next_gate: "separate_operator_candidate_binding_and_activation_authorization",
    authority:
      VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_VERIFIER_AUTHORITY_V1,
  };
}
