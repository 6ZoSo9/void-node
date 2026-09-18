import crypto from "node:crypto";
import path from "node:path";
import { getAddress } from "ethers";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ACTIVATION_CONFIGURATION_V1,
} from "./buy_void_payment_keyed_runtime_activation_configuration_contract_v1.js";
import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1,
} from "./buy_void_erc20_production_credential_binding_evidence_v1.js";
import {
  validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1,
} from "./buy_void_payment_keyed_transaction_preparation_v1.js";
import {
  validateBuyVoidPaymentKeyedFulfillmentReceiptPolicyV1,
} from "./buy_void_payment_keyed_fulfillment_receipt_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_VERIFIER_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_VERIFIER_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_VERIFIER_AUTHORITY_V1 = {
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
  deployment_attestation: false,
  runtime_activation: false,
  runtime_apply_activation: false,
  inventory_funding: false,
  public_activation: false,
  money_movement: false,
} as const;

export const VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_REQUIRED_KEYS_V1 = [
  "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED",
  "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED",
  "VOID_BUY_VOID_RUNTIME_DIR",
  "VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_RPC_URL",
  "VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS",
  "VOID_BUY_VOID_PAYMENT_KEYED_GAS_LIMIT_MULTIPLIER_BPS",
  "VOID_BUY_VOID_PAYMENT_KEYED_MAX_GAS_LIMIT",
  "VOID_BUY_VOID_PAYMENT_KEYED_FEE_MULTIPLIER_BPS",
  "VOID_BUY_VOID_PAYMENT_KEYED_MAX_FEE_PER_GAS_WEI",
  "VOID_BUY_VOID_PAYMENT_KEYED_MAX_PRIORITY_FEE_PER_GAS_WEI",
  "VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS",
  "VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS",
  "VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS",
  "VOID_BUY_VOID_INVENTORY_POOL_ID",
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_INVENTORY_POLICY_VERSION",
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_POOL_CAPACITY_VOID_UNITS",
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_MAX_RESERVATION_VOID_UNITS",
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_NUMERATOR",
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_DENOMINATOR",
  "VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID",
  "CREDENTIALS_DIRECTORY",
] as const;

export const VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_OPTIONAL_KEYS_V1 = [
  "VOID_BUY_VOID_PAYMENT_KEYED_RPC_TIMEOUT_MS",
  "VOID_BUY_VOID_PAYMENT_KEYED_RPC_MAX_RESPONSE_BYTES",
] as const;

type CandidateV1 = Record<string, string>;

export type BuyVoidPaymentKeyedProductionConfigurationVerificationV1 =
  | {
      ok: true;
      status: "candidate_verified_held_on_deployment_attestation";
      marker:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_VERIFIER_V1;
      version: 1;
      configuration_fingerprint_sha256: string;
      runtime_root_dir: string;
      credentials_directory: string;
      chain_id: "2050";
      fulfillment_wallet_address: string;
      fulfillment_contract_address: string;
      void_token_address: string;
      max_void_amount_units: string;
      max_token_amount_atoms: string;
      min_confirmations: string;
      preparation_policy_fingerprint_sha256: string;
      receipt_policy_fingerprint_sha256: string;
      rpc_url_fingerprint_sha256: string;
      credential_binding_evidence_id_sha256: string;
      candidate_configuration_values_verified: true;
      runtime_remains_disabled: true;
      runtime_apply_remains_disabled: true;
      credential_wallet_binding_verified: true;
      canonical_presale_economics_verified: true;
      fulfillment_contract_address_shape_verified_only: true;
      fulfillment_contract_deployment_attested: false;
      predecessor_lineage_attested: false;
      inventory_funding_verified: false;
      production_configuration_applied: false;
      runtime_activation_authorized: false;
      public_activation_authorized: false;
      next_gate: "fulfillment_contract_deployment_and_lineage_attestation";
      authority:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_VERIFIER_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held";
      marker:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_VERIFIER_V1;
      version: 1;
      reason: string;
      detail?: Record<string, unknown>;
      candidate_configuration_values_verified: false;
      fulfillment_contract_deployment_attested: false;
      predecessor_lineage_attested: false;
      inventory_funding_verified: false;
      production_configuration_applied: false;
      runtime_activation_authorized: false;
      public_activation_authorized: false;
      authority:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_VERIFIER_AUTHORITY_V1;
    };

const CONTRACT =
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ACTIVATION_CONFIGURATION_V1;
const EVIDENCE =
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1;
const ALLOWED = new Set<string>([
  ...VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_REQUIRED_KEYS_V1,
  ...VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_OPTIONAL_KEYS_V1,
]);
const ZERO = "0x0000000000000000000000000000000000000000";
const POSITIVE = /^[1-9][0-9]*$/;

function held(
  reason: string,
  detail?: Record<string, unknown>,
): Extract<
  BuyVoidPaymentKeyedProductionConfigurationVerificationV1,
  { ok: false }
> {
  return {
    ok: false,
    status: "held",
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_VERIFIER_V1,
    version: 1,
    reason,
    ...(detail ? { detail } : {}),
    candidate_configuration_values_verified: false,
    fulfillment_contract_deployment_attested: false,
    predecessor_lineage_attested: false,
    inventory_funding_verified: false,
    production_configuration_applied: false,
    runtime_activation_authorized: false,
    public_activation_authorized: false,
    authority:
      VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_VERIFIER_AUTHORITY_V1,
  };
}

function direct(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null
    ? value as Record<string, unknown>
    : null;
}

function strict(value: unknown): CandidateV1 | null {
  const record = direct(value);
  if (!record) return null;
  for (const key of Object.keys(record)) {
    if (!ALLOWED.has(key)) return null;
  }
  for (const key of VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_REQUIRED_KEYS_V1) {
    if (!(key in record)) return null;
  }
  for (const [key, raw] of Object.entries(record)) {
    if (
      !ALLOWED.has(key) ||
      typeof raw !== "string" ||
      !raw ||
      raw !== raw.trim()
    ) {
      return null;
    }
  }
  return record as CandidateV1;
}

function address(raw: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return "";
  try {
    return getAddress(raw).toLowerCase();
  } catch {
    return "";
  }
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function absoluteNonRoot(value: string): string {
  if (!path.isAbsolute(value) || value.includes("\0")) return "";
  const normalized = path.normalize(value);
  return normalized === path.parse(normalized).root ? "" : normalized;
}

function rpc(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "::1"].includes(host) ||
    !url.port ||
    !Number.isInteger(Number(url.port)) ||
    Number(url.port) <= 0 ||
    Number(url.port) > 65_535 ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    return null;
  }
  return url.toString();
}

export function verifyBuyVoidPaymentKeyedProductionConfigurationV1(
  input: unknown,
): BuyVoidPaymentKeyedProductionConfigurationVerificationV1 {
  if (
    CONTRACT.next_gate !==
      "production_payment_keyed_configuration_verification" ||
    CONTRACT.production_payment_keyed_configuration_verified !== false ||
    CONTRACT.payment_keyed_runtime_activation_ready !== false ||
    CONTRACT.fulfillment_contract_deployment_attested !== false ||
    CONTRACT.presale_inventory_funding_ready !== false
  ) {
    return held(
      "payment_keyed_production_activation_contract_drift",
    );
  }

  const candidate = strict(input);
  if (!candidate) {
    const record = direct(input);
    if (record) {
      const unknown = Object.keys(record).find(
        (key) => !ALLOWED.has(key),
      );
      if (unknown) {
        return held(
          "payment_keyed_production_configuration_unknown_key",
          { key: unknown },
        );
      }
      const missing =
        VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_REQUIRED_KEYS_V1
          .filter((key) => !(key in record));
      if (missing.length) {
        return held(
          "payment_keyed_production_configuration_missing_field",
          { fields: missing },
        );
      }
    }
    return held(
      "payment_keyed_production_configuration_candidate_shape_invalid",
    );
  }

  if (
    candidate.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED !== "0"
  ) {
    return held(
      "payment_keyed_production_runtime_must_remain_disabled",
    );
  }
  if (
    candidate.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED !== "0"
  ) {
    return held(
      "payment_keyed_production_runtime_apply_must_remain_disabled",
    );
  }

  const root = absoluteNonRoot(
    candidate.VOID_BUY_VOID_RUNTIME_DIR,
  );
  const credentials = absoluteNonRoot(
    candidate.CREDENTIALS_DIRECTORY,
  );
  if (!root) {
    return held(
      "payment_keyed_production_runtime_root_invalid",
    );
  }
  if (!credentials || credentials === root) {
    return held(
      "payment_keyed_production_credentials_directory_invalid",
    );
  }

  const wallet = address(
    candidate.VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS,
  );
  const contract = address(
    candidate.VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS,
  );
  const token = address(
    candidate.VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS,
  );
  const expectedWallet = address(EVIDENCE.expected_wallet_address);
  const derivedWallet = address(EVIDENCE.derived_wallet_address);
  if (
    !wallet ||
    !expectedWallet ||
    !derivedWallet ||
    wallet !== expectedWallet ||
    wallet !== derivedWallet ||
    EVIDENCE.exact_wallet_binding !== true
  ) {
    return held(
      "payment_keyed_production_wallet_evidence_mismatch",
    );
  }
  if (
    !contract ||
    !token ||
    contract === ZERO ||
    token === ZERO ||
    contract === token ||
    contract === wallet ||
    token === wallet
  ) {
    return held(
      "payment_keyed_production_contract_token_address_invalid",
    );
  }

  const expectedEvidenceId =
    VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1;
  if (
    candidate.VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID !==
      expectedEvidenceId ||
    EVIDENCE.evidence_id_sha256 !== expectedEvidenceId ||
    EVIDENCE.credential_id !==
      CONTRACT.runtime_configuration_contract.fixed_signer_credential_id
  ) {
    return held(
      "payment_keyed_production_credential_evidence_mismatch",
    );
  }

  const invariants = CONTRACT.presale_invariant_readiness;
  if (
    candidate.VOID_BUY_VOID_INVENTORY_POOL_ID !==
      invariants.canonical_presale_pool_id ||
    candidate.VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_INVENTORY_POLICY_VERSION !==
      invariants.canonical_inventory_policy_version ||
    candidate.VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_POOL_CAPACITY_VOID_UNITS !==
      invariants.canonical_presale_max_fulfillment_units_6_decimal ||
    candidate.VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_MAX_RESERVATION_VOID_UNITS !==
      invariants.canonical_max_reservation_fulfillment_units_6_decimal ||
    candidate.VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_NUMERATOR !==
      invariants.canonical_rate_void_units_numerator ||
    candidate.VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_DENOMINATOR !==
      invariants.canonical_rate_void_units_denominator
  ) {
    return held(
      "payment_keyed_production_presale_invariant_mismatch",
    );
  }

  const rpcUrl = rpc(
    candidate.VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_RPC_URL,
  );
  if (!rpcUrl) {
    return held(
      "payment_keyed_production_rpc_url_invalid",
    );
  }

  const preparation =
    validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1({
      enabled: true,
      chain_id: "2050",
      rpc_url: rpcUrl,
      fulfillment_wallet_address: wallet,
      fulfillment_contract_address: contract,
      max_void_amount_units:
        invariants.canonical_presale_max_fulfillment_units_6_decimal,
      gas_limit_multiplier_bps:
        candidate.VOID_BUY_VOID_PAYMENT_KEYED_GAS_LIMIT_MULTIPLIER_BPS,
      max_gas_limit:
        candidate.VOID_BUY_VOID_PAYMENT_KEYED_MAX_GAS_LIMIT,
      fee_multiplier_bps:
        candidate.VOID_BUY_VOID_PAYMENT_KEYED_FEE_MULTIPLIER_BPS,
      max_fee_per_gas_wei:
        candidate.VOID_BUY_VOID_PAYMENT_KEYED_MAX_FEE_PER_GAS_WEI,
      max_priority_fee_per_gas_wei:
        candidate.VOID_BUY_VOID_PAYMENT_KEYED_MAX_PRIORITY_FEE_PER_GAS_WEI,
      ...(candidate.VOID_BUY_VOID_PAYMENT_KEYED_RPC_TIMEOUT_MS
        ? {
            request_timeout_ms:
              candidate.VOID_BUY_VOID_PAYMENT_KEYED_RPC_TIMEOUT_MS,
          }
        : {}),
      ...(candidate.VOID_BUY_VOID_PAYMENT_KEYED_RPC_MAX_RESPONSE_BYTES
        ? {
            max_response_bytes:
              candidate.VOID_BUY_VOID_PAYMENT_KEYED_RPC_MAX_RESPONSE_BYTES,
          }
        : {}),
    });
  if (preparation.ok === false) {
    return held(
      "payment_keyed_production_preparation_policy_held",
      { reason: preparation.reason },
    );
  }

  const confirmations =
    candidate.VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS;
  if (
    !POSITIVE.test(confirmations) ||
    BigInt(confirmations) > 1_000n
  ) {
    return held(
      "payment_keyed_production_min_confirmations_invalid",
    );
  }

  const receipt =
    validateBuyVoidPaymentKeyedFulfillmentReceiptPolicyV1({
      enabled: true,
      chain_id: "2050",
      rpc_url: rpcUrl,
      fulfillment_wallet_address: wallet,
      fulfillment_contract_address: contract,
      void_token_address: token,
      min_confirmations: confirmations,
      ...(candidate.VOID_BUY_VOID_PAYMENT_KEYED_RPC_TIMEOUT_MS
        ? {
            request_timeout_ms:
              candidate.VOID_BUY_VOID_PAYMENT_KEYED_RPC_TIMEOUT_MS,
          }
        : {}),
      ...(candidate.VOID_BUY_VOID_PAYMENT_KEYED_RPC_MAX_RESPONSE_BYTES
        ? {
            max_response_bytes:
              candidate.VOID_BUY_VOID_PAYMENT_KEYED_RPC_MAX_RESPONSE_BYTES,
          }
        : {}),
    });
  if (receipt.ok === false) {
    return held(
      "payment_keyed_production_receipt_policy_held",
      { reason: receipt.reason },
    );
  }
  if (
    receipt.rpc_url_fingerprint_sha256 !==
      preparation.rpc_url_fingerprint_sha256
  ) {
    return held(
      "payment_keyed_production_rpc_policy_mismatch",
    );
  }

  const maxVoid =
    invariants.canonical_presale_max_fulfillment_units_6_decimal;
  const maxAtoms =
    (BigInt(maxVoid) * 1_000_000_000_000n).toString();
  if (
    maxAtoms !==
      invariants.exact_lifetime_presale_cap_token_atoms
  ) {
    return held(
      "payment_keyed_production_presale_atom_cap_mismatch",
    );
  }

  const fingerprint = sha256(
    [
      "marker=" +
        VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_VERIFIER_V1,
      "runtime_root_dir=" + root,
      "credentials_directory_sha256=" + sha256(credentials),
      "runtime_enable=0",
      "runtime_apply_enable=0",
      "preparation_policy_fingerprint_sha256=" +
        preparation.policy_fingerprint_sha256,
      "receipt_policy_fingerprint_sha256=" +
        receipt.policy_fingerprint_sha256,
      "fulfillment_contract_address=" + contract,
      "void_token_address=" + token,
      "fulfillment_wallet_address=" + wallet,
      "receipt_min_confirmations=" + confirmations,
      "credential_binding_evidence_id_sha256=" +
        expectedEvidenceId,
      "canonical_presale_pool_id=" +
        invariants.canonical_presale_pool_id,
      "canonical_presale_max_fulfillment_units=" +
        maxVoid,
      "canonical_presale_max_token_atoms=" +
        maxAtoms,
    ].join("\n"),
  );

  return {
    ok: true,
    status:
      "candidate_verified_held_on_deployment_attestation",
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_VERIFIER_V1,
    version: 1,
    configuration_fingerprint_sha256: fingerprint,
    runtime_root_dir: root,
    credentials_directory: credentials,
    chain_id: "2050",
    fulfillment_wallet_address: wallet,
    fulfillment_contract_address: contract,
    void_token_address: token,
    max_void_amount_units: maxVoid,
    max_token_amount_atoms: maxAtoms,
    min_confirmations: confirmations,
    preparation_policy_fingerprint_sha256:
      preparation.policy_fingerprint_sha256,
    receipt_policy_fingerprint_sha256:
      receipt.policy_fingerprint_sha256,
    rpc_url_fingerprint_sha256:
      preparation.rpc_url_fingerprint_sha256,
    credential_binding_evidence_id_sha256:
      expectedEvidenceId,
    candidate_configuration_values_verified: true,
    runtime_remains_disabled: true,
    runtime_apply_remains_disabled: true,
    credential_wallet_binding_verified: true,
    canonical_presale_economics_verified: true,
    fulfillment_contract_address_shape_verified_only: true,
    fulfillment_contract_deployment_attested: false,
    predecessor_lineage_attested: false,
    inventory_funding_verified: false,
    production_configuration_applied: false,
    runtime_activation_authorized: false,
    public_activation_authorized: false,
    next_gate:
      "fulfillment_contract_deployment_and_lineage_attestation",
    authority:
      VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_VERIFIER_AUTHORITY_V1,
  };
}
