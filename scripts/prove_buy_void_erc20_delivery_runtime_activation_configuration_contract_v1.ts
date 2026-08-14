import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1,
  VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_V1,
} from "../src/economic/buy_void_erc20_delivery_runtime_activation_configuration_contract_v1.js";

const root = process.cwd();
const contractPath = path.join(
  root,
  "src/economic/buy_void_erc20_delivery_runtime_activation_configuration_contract_v1.ts",
);
const runtimePath = path.join(
  root,
  "src/economic/buy_void_delivery_runtime_integration_v1.ts",
);
const dependencyPath = path.join(
  root,
  "src/economic/buy_void_erc20_delivery_dependency_bootstrap_v1.ts",
);
const dependencyGatePath = path.join(
  root,
  "src/economic/buy_void_erc20_delivery_dependency_bootstrap_integration_gate_v1.ts",
);
const parentPath = path.join(
  root,
  "src/economic/buy_void_runtime_integration_v1.ts",
);

for (const file of [
  contractPath,
  runtimePath,
  dependencyPath,
  dependencyGatePath,
  parentPath,
]) {
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const contractSource = fs.readFileSync(contractPath, "utf8");
const runtimeSource = fs.readFileSync(runtimePath, "utf8");
const dependencySource = fs.readFileSync(dependencyPath, "utf8");
const dependencyGateSource = fs.readFileSync(dependencyGatePath, "utf8");
const parentSource = fs.readFileSync(parentPath, "utf8");
const contract =
  VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_V1;

assert.equal(
  contract.marker,
  VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1,
);
assert.equal(contract.version, 1);
assert.equal(contract.status, "source_ready");
assert.equal(contract.canonical_chain_id, "2050");
assert.equal(contract.canonical_asset, "void_token_erc20");
assert.equal(
  contract.prerequisite_source_truth
    .canonical_delivery_dependency_bootstrap_ready,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .erc20_transaction_preparation_execution_state_ready,
  true,
);
assert.equal(
  contract.canonical_delivery_runtime_activation_configuration_contract_ready,
  true,
);
assert.equal(contract.canonical_delivery_runtime_activation_ready, false);
assert.equal(contract.production_configuration_values_verified, false);
assert.equal(contract.production_credential_binding_ready, false);
assert.equal(contract.canonical_delivery_runtime_parent_mounted, false);
assert.equal(contract.canonical_delivery_execution_ready, false);
assert.equal(contract.canonical_delivery_execution_held, true);
assert.equal(contract.presale_inventory_funding_ready, false);
assert.equal(
  contract.current_parent_blocker,
  "canonical_delivery_runtime_activation_not_ready",
);
assert.equal(
  contract.next_gate,
  "production_configuration_verification_and_runtime_mount_authorization",
);

assert.deepEqual(
  contract.runtime_configuration_contract.policy_envs,
  [
    "VOID_BUY_VOID_DELIVERY_CHAIN_ID",
    "VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS",
    "VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS",
    "VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS",
    "VOID_BUY_VOID_DELIVERY_MAX_GAS_LIMIT",
    "VOID_BUY_VOID_DELIVERY_MAX_FEE_PER_GAS_WEI",
    "VOID_BUY_VOID_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI",
  ],
);

for (const marker of [
  `"${contract.runtime_configuration_contract.enable_env}"`,
  `"${contract.runtime_configuration_contract.root_dir_env}"`,
  `"${contract.runtime_configuration_contract.dependency_global}"`,
  ...contract.runtime_configuration_contract.policy_envs.map(
    (value) => `"${value}"`,
  ),
  "server_controlled_root_dir: true",
  "server_controlled_policy: true",
  "operator_loopback_only: true",
  "exact_confirmation_required: true",
  "durable_submission_guard_required: true",
  "signer_dependency_injected: true",
  "broadcaster_dependency_injected: true",
  "automatic_retry: false",
  "receipt_wait: false",
  "background_loop: false",
  "signing_when_fully_enabled: true",
  "transaction_broadcast_when_fully_enabled: true",
  "money_movement_when_fully_enabled: true",
]) {
  assert.equal(
    runtimeSource.includes(marker),
    true,
    `runtime contract drift: ${marker}`,
  );
}

assert.equal(
  runtimeSource.includes(
    "enabled() &&\n    policy.configured &&\n    dependencies !== null",
  ),
  true,
  "effective authority must require enable + policy + dependencies",
);
assert.equal(
  runtimeSource.includes(
    `required_confirmation:\n      "${contract.runtime_configuration_contract.exact_confirmation}"`,
  ),
  true,
);

for (const marker of [
  `"${contract.runtime_configuration_contract.fixed_signer_credential_id}"`,
  "fixed_systemd_credential_id_reused_when_signing: true",
  "credential_read_deferred_until_sign_transaction: true",
  "exact_erc20_unsigned_transaction_revalidated_before_credential_read: true",
  "exact_erc20_signed_transaction_revalidated_after_signing: true",
  "total_deadline_chain2050_broadcaster_reused: true",
  "automatic_retry: false",
  "runtime_route_mount: false",
  "service_start: false",
]) {
  assert.equal(
    dependencySource.includes(marker),
    true,
    `dependency contract drift: ${marker}`,
  );
}

assert.equal(
  dependencyGateSource.includes(
    "canonical_delivery_dependency_bootstrap_ready: true",
  ),
  true,
);
assert.equal(
  dependencyGateSource.includes(
    "erc20_transaction_preparation_execution_state_ready: true",
  ),
  true,
);
assert.equal(
  dependencyGateSource.includes(
    '"canonical_delivery_runtime_activation_not_ready"',
  ),
  true,
);

assert.equal(
  parentSource.includes("canonical_delivery_runtime_parent_mounted: false"),
  true,
);
assert.equal(
  parentSource.includes("canonical_delivery_execution_ready: false"),
  true,
);
assert.equal(
  parentSource.includes("presale_inventory_funding_ready: false"),
  true,
);
assert.doesNotMatch(
  parentSource,
  /(?:import|from)\s+["']\.\/buy_void_delivery_runtime_integration_v1\.js["']/,
);

for (const forbidden of [
  "process.env",
  "readFile",
  "writeFile",
  "http.request",
  "Wallet(",
  "setTimeout(",
  "globalThis",
]) {
  assert.equal(
    contractSource.includes(forbidden),
    false,
    `source-only contract gained side effect marker: ${forbidden}`,
  );
}

for (const [key, value] of Object.entries(contract.authority)) {
  if (key === "source_only_contract") {
    assert.equal(value, true);
  } else {
    assert.equal(value, false, `authority must stay false: ${key}`);
  }
}

console.log(
  "VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1_PROOF_GREEN",
);
console.log("canonical_chain_id=2050");
console.log("canonical_asset=void_token_erc20");
console.log("dependency_bootstrap_ready=1");
console.log("transaction_preparation_execution_state_ready=1");
console.log("runtime_activation_configuration_contract_ready=1");
console.log("production_configuration_values_verified=0");
console.log("production_credential_binding_ready=0");
console.log("canonical_delivery_runtime_parent_mounted=0");
console.log("canonical_delivery_execution_ready=0");
console.log("presale_inventory_funding_ready=0");
console.log("runtime_activation_performed=0");
console.log("credential_read=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
