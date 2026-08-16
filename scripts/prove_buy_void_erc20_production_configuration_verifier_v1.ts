import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_VERIFIER_AUTHORITY_V1,
  VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_VERIFIER_V1,
  verifyBuyVoidErc20ProductionConfigurationV1,
} from "../src/economic/buy_void_erc20_production_configuration_verifier_v1.js";
import {
  VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_V1,
} from "../src/economic/buy_void_erc20_delivery_runtime_activation_configuration_contract_v1.js";
import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1,
} from "../src/economic/buy_void_erc20_production_credential_binding_evidence_v1.js";

const activation =
  VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_V1;
const credential =
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1;

const base: Record<string, unknown> = {
  VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED: "0",
  VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_ENABLED: "0",
  VOID_BUY_VOID_RUNTIME_DIR: "/var/lib/void/buy-void/runtime-integration-v1",
  VOID_BUY_VOID_DELIVERY_CHAIN_ID: "2050",
  VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS:
    "0x3333333333333333333333333333333333333333",
  VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS: credential.expected_wallet_address,
  VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS: "10000000000000",
  VOID_BUY_VOID_DELIVERY_MAX_GAS_LIMIT: "100000",
  VOID_BUY_VOID_DELIVERY_MAX_FEE_PER_GAS_WEI: "3000000000",
  VOID_BUY_VOID_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI: "1000000000",
  VOID_BUY_VOID_ERC20_EXECUTION_RPC_URL: "http://127.0.0.1:8545/",
  VOID_BUY_VOID_DELIVERY_GAS_LIMIT_MULTIPLIER_BPS: "12000",
  VOID_BUY_VOID_DELIVERY_FEE_MULTIPLIER_BPS: "20000",
  VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS: "3",
  VOID_BUY_VOID_DELIVERY_RPC_TIMEOUT_MS: "5000",
  VOID_BUY_VOID_DELIVERY_RPC_MAX_RESPONSE_BYTES: "65536",
  VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID:
    credential.evidence_id_sha256,
};

const verified = verifyBuyVoidErc20ProductionConfigurationV1(base);
assert.equal(verified.ok, true);
if (!verified.ok) throw new Error(verified.reason);
assert.equal(verified.status, "candidate_verified_held_on_activation");
assert.equal(
  verified.marker,
  VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_VERIFIER_V1,
);
assert.match(verified.configuration_fingerprint_sha256, /^[0-9a-f]{64}$/);
assert.match(verified.planner_policy_fingerprint_sha256, /^[0-9a-f]{64}$/);
assert.match(verified.rpc_url_fingerprint_sha256, /^[0-9a-f]{64}$/);
assert.equal(verified.runtime_root_dir, base.VOID_BUY_VOID_RUNTIME_DIR);
assert.equal(verified.chain_id, "2050");
assert.equal(
  verified.fulfillment_wallet_address,
  credential.expected_wallet_address,
);
assert.equal(
  verified.void_token_address,
  base.VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS,
);
assert.equal(verified.max_amount_units, "10000000000000");
assert.equal(verified.min_confirmations, "3");
assert.equal(
  verified.credential_binding_evidence_id_sha256,
  credential.evidence_id_sha256,
);
assert.equal(verified.candidate_configuration_values_verified, true);
assert.equal(verified.token_address_content_bound, true);
assert.equal(verified.credential_wallet_binding_verified, true);
assert.equal(verified.full_presale_delivery_ceiling_verified, true);
assert.equal(verified.runtime_remains_disabled, true);
assert.equal(verified.dependency_injection_remains_disabled, true);
assert.equal(verified.production_configuration_applied, false);
assert.equal(verified.runtime_activation_authorized, false);
assert.equal(verified.inventory_funding_authorized, false);
assert.equal(
  verified.next_gate,
  "separate_operator_candidate_binding_and_activation_authorization",
);

const repeated = verifyBuyVoidErc20ProductionConfigurationV1({ ...base });
assert.equal(repeated.ok, true);
if (!repeated.ok) throw new Error(repeated.reason);
assert.equal(
  repeated.configuration_fingerprint_sha256,
  verified.configuration_fingerprint_sha256,
);

const defaultedTransport = { ...base };
delete defaultedTransport.VOID_BUY_VOID_DELIVERY_RPC_TIMEOUT_MS;
delete defaultedTransport.VOID_BUY_VOID_DELIVERY_RPC_MAX_RESPONSE_BYTES;
const defaulted = verifyBuyVoidErc20ProductionConfigurationV1(defaultedTransport);
assert.equal(defaulted.ok, true);
if (!defaulted.ok) throw new Error(defaulted.reason);
assert.equal(
  defaulted.configuration_fingerprint_sha256,
  verified.configuration_fingerprint_sha256,
  "explicit canonical transport defaults must fingerprint like omitted defaults",
);

const changedGas = verifyBuyVoidErc20ProductionConfigurationV1({
  ...base,
  VOID_BUY_VOID_DELIVERY_MAX_GAS_LIMIT: "125000",
});
assert.equal(changedGas.ok, true);
if (!changedGas.ok) throw new Error(changedGas.reason);
assert.notEqual(
  changedGas.configuration_fingerprint_sha256,
  verified.configuration_fingerprint_sha256,
);

const changedToken = verifyBuyVoidErc20ProductionConfigurationV1({
  ...base,
  VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS:
    "0x4444444444444444444444444444444444444444",
});
assert.equal(changedToken.ok, true);
if (!changedToken.ok) throw new Error(changedToken.reason);
assert.notEqual(
  changedToken.configuration_fingerprint_sha256,
  verified.configuration_fingerprint_sha256,
);

const invalidCases: Array<{
  label: string;
  patch: Record<string, unknown>;
  reason: string;
}> = [
  {
    label: "runtime-enabled",
    patch: { VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED: "1" },
    reason: "production_configuration_runtime_must_remain_disabled",
  },
  {
    label: "dependency-injection-enabled",
    patch: { VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_ENABLED: "1" },
    reason: "production_configuration_dependency_injection_must_remain_disabled",
  },
  {
    label: "relative-root",
    patch: { VOID_BUY_VOID_RUNTIME_DIR: "data/buy-void" },
    reason: "production_configuration_runtime_root_invalid",
  },
  {
    label: "wrong-chain",
    patch: { VOID_BUY_VOID_DELIVERY_CHAIN_ID: "1" },
    reason: "production_configuration_chain_id_mismatch",
  },
  {
    label: "wrong-wallet",
    patch: {
      VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS:
        "0x5555555555555555555555555555555555555555",
    },
    reason: "production_configuration_wallet_evidence_mismatch",
  },
  {
    label: "bad-evidence-id",
    patch: {
      VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID: "f".repeat(64),
    },
    reason: "production_configuration_credential_evidence_mismatch",
  },
  {
    label: "delivery-cap-low",
    patch: { VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS: "9999999999999" },
    reason: "production_configuration_public_delivery_cap_mismatch",
  },
  {
    label: "delivery-cap-high",
    patch: { VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS: "10000000000001" },
    reason: "production_configuration_public_delivery_cap_mismatch",
  },
  {
    label: "zero-token",
    patch: {
      VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS:
        "0x0000000000000000000000000000000000000000",
    },
    reason: "production_configuration_token_address_invalid",
  },
  {
    label: "wallet-as-token",
    patch: {
      VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS: credential.expected_wallet_address,
    },
    reason: "production_configuration_token_address_invalid",
  },
  {
    label: "https-rpc",
    patch: { VOID_BUY_VOID_ERC20_EXECUTION_RPC_URL: "https://127.0.0.1:8545/" },
    reason: "production_configuration_rpc_url_invalid",
  },
  {
    label: "localhost-rpc",
    patch: { VOID_BUY_VOID_ERC20_EXECUTION_RPC_URL: "http://localhost:8545/" },
    reason: "production_configuration_rpc_url_invalid",
  },
  {
    label: "lan-rpc",
    patch: { VOID_BUY_VOID_ERC20_EXECUTION_RPC_URL: "http://192.168.1.5:8545/" },
    reason: "production_configuration_rpc_url_invalid",
  },
  {
    label: "rpc-no-port",
    patch: { VOID_BUY_VOID_ERC20_EXECUTION_RPC_URL: "http://127.0.0.1/" },
    reason: "production_configuration_rpc_url_invalid",
  },
  {
    label: "rpc-query",
    patch: { VOID_BUY_VOID_ERC20_EXECUTION_RPC_URL: "http://127.0.0.1:8545/?token=x" },
    reason: "production_configuration_rpc_url_invalid",
  },
  {
    label: "gas-multiplier-low",
    patch: { VOID_BUY_VOID_DELIVERY_GAS_LIMIT_MULTIPLIER_BPS: "9999" },
    reason: "production_configuration_planner_policy_held",
  },
  {
    label: "fee-multiplier-high",
    patch: { VOID_BUY_VOID_DELIVERY_FEE_MULTIPLIER_BPS: "50001" },
    reason: "production_configuration_planner_policy_held",
  },
  {
    label: "priority-over-max",
    patch: {
      VOID_BUY_VOID_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI: "3000000001",
    },
    reason: "production_configuration_planner_policy_held",
  },
  {
    label: "timeout-too-high",
    patch: { VOID_BUY_VOID_DELIVERY_RPC_TIMEOUT_MS: "30001" },
    reason: "production_configuration_planner_policy_held",
  },
  {
    label: "response-too-high",
    patch: { VOID_BUY_VOID_DELIVERY_RPC_MAX_RESPONSE_BYTES: "1048577" },
    reason: "production_configuration_planner_policy_held",
  },
  {
    label: "confirmations-zero",
    patch: { VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS: "0" },
    reason: "production_configuration_min_confirmations_invalid",
  },
  {
    label: "confirmations-high",
    patch: { VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS: "1001" },
    reason: "production_configuration_min_confirmations_invalid",
  },
  {
    label: "confirmations-leading-zero",
    patch: { VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS: "03" },
    reason: "production_configuration_min_confirmations_invalid",
  },
];

for (const testCase of invalidCases) {
  const decision = verifyBuyVoidErc20ProductionConfigurationV1({
    ...base,
    ...testCase.patch,
  });
  assert.equal(decision.ok, false, testCase.label);
  if (decision.ok) throw new Error(`invalid fixture passed:${testCase.label}`);
  assert.equal(decision.reason, testCase.reason, testCase.label);
  assert.equal(decision.production_configuration_applied, false, testCase.label);
  assert.equal(decision.runtime_activation_authorized, false, testCase.label);
  assert.equal(decision.inventory_funding_authorized, false, testCase.label);
}

const unknown = verifyBuyVoidErc20ProductionConfigurationV1({
  ...base,
  VOID_UNREVIEWED_EXTRA: "1",
});
assert.equal(unknown.ok, false);
if (unknown.ok) throw new Error("unknown key unexpectedly accepted");
assert.equal(unknown.reason, "production_configuration_unknown_key");

const missing = { ...base };
delete missing.VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS;
const missingDecision = verifyBuyVoidErc20ProductionConfigurationV1(missing);
assert.equal(missingDecision.ok, false);
if (missingDecision.ok) throw new Error("missing field unexpectedly accepted");
assert.equal(missingDecision.reason, "production_configuration_missing_field");

for (const malformed of [
  null,
  [],
  "not-an-object",
  {
    ...base,
    VOID_BUY_VOID_DELIVERY_CHAIN_ID: 2050,
  },
  {
    ...base,
    VOID_BUY_VOID_DELIVERY_CHAIN_ID: " 2050",
  },
]) {
  const decision = verifyBuyVoidErc20ProductionConfigurationV1(malformed);
  assert.equal(decision.ok, false);
  if (decision.ok) throw new Error("malformed candidate unexpectedly accepted");
  assert.equal(decision.reason, "production_configuration_candidate_shape_invalid");
}

assert.equal(
  activation.production_configuration_values_verified,
  true,
);
assert.equal(
  activation.production_credential_binding_ready,
  true,
);
assert.equal(
  activation.production_broad_delivery_configuration_verified,
  true,
);
assert.equal(
  activation.production_configuration_applied,
  false,
);
assert.equal(
  activation.canonical_delivery_runtime_activation_ready,
  false,
);
assert.equal(
  activation.next_gate,
  "durable_history_anti_rollback_anchor",
);
assert.equal(
  activation.presale_invariant_readiness
    .durable_history_external_anti_rollback_anchor_ready,
  false,
);

for (const [key, value] of Object.entries(
  VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_VERIFIER_AUTHORITY_V1,
)) {
  const expected = [
    "pure_configuration_validation_only",
    "explicit_candidate_input_required",
  ].includes(key);
  assert.equal(value, expected, `authority mismatch:${key}`);
}

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/economic/buy_void_erc20_production_configuration_verifier_v1.ts",
  ),
  "utf8",
);
assert.equal(source.includes("process.env"), false);
assert.equal(source.includes("readFileSync"), false);
assert.equal(source.includes("fetch("), false);
assert.equal(source.includes("http.request"), false);

console.log("VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_VERIFIER_V1_PROOF_GREEN");
console.log("candidate_configuration_values_verified=1");
console.log("configuration_fingerprint_deterministic=1");
console.log("wallet_credential_evidence_binding_required=1");
console.log("public_delivery_cap_equals_full_presale_capacity=1");
console.log("loopback_http_rpc_with_explicit_port_required=1");
console.log("planner_policy_validator_reused=1");
console.log("parent_configuration_truth_promoted=1");
console.log("runtime_remains_disabled=1");
console.log("dependency_injection_remains_disabled=1");
console.log("production_configuration_applied=0");
console.log("credential_read_performed=0");
console.log("rpc_call_performed=0");
console.log("signing_performed=0");
console.log("transaction_broadcast_performed=0");
console.log("inventory_funding_performed=0");
console.log("money_movement_performed=0");
