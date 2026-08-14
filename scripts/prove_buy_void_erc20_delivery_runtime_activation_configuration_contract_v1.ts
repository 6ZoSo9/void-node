import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1,
  VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_V1,
} from "../src/economic/buy_void_erc20_delivery_runtime_activation_configuration_contract_v1.js";

const root = process.cwd();
const paths = {
  contract: path.join(
    root,
    "src/economic/buy_void_erc20_delivery_runtime_activation_configuration_contract_v1.ts",
  ),
  runtime: path.join(
    root,
    "src/economic/buy_void_delivery_runtime_integration_v1.ts",
  ),
  planner: path.join(
    root,
    "src/economic/buy_void_erc20_transaction_preparation_planner_v1.ts",
  ),
  dependency: path.join(
    root,
    "src/economic/buy_void_erc20_delivery_dependency_bootstrap_v1.ts",
  ),
  signer: path.join(
    root,
    "src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.ts",
  ),
  dependencyGate: path.join(
    root,
    "src/economic/buy_void_erc20_delivery_dependency_bootstrap_integration_gate_v1.ts",
  ),
  parent: path.join(
    root,
    "src/economic/buy_void_runtime_integration_v1.ts",
  ),
};
for (const file of Object.values(paths)) {
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const contractSource = fs.readFileSync(paths.contract, "utf8");
const runtimeSource = fs.readFileSync(paths.runtime, "utf8");
const plannerSource = fs.readFileSync(paths.planner, "utf8");
const dependencySource = fs.readFileSync(paths.dependency, "utf8");
const signerSource = fs.readFileSync(paths.signer, "utf8");
const dependencyGateSource = fs.readFileSync(
  paths.dependencyGate,
  "utf8",
);
const parentSource = fs.readFileSync(paths.parent, "utf8");
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
  "erc20_durable_prepared_transaction_composition",
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
assert.deepEqual(
  contract.runtime_configuration_contract.caller_input_keys,
  ["action", "attempt_id"],
);
assert.equal(
  contract.runtime_configuration_contract.planner_rpc_env,
  "VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL",
);
assert.equal(
  contract.runtime_configuration_contract
    .fixed_planner_gas_limit_multiplier_bps,
  "12000",
);
assert.equal(
  contract.runtime_configuration_contract
    .fixed_planner_fee_multiplier_bps,
  "12000",
);
assert.equal(
  contract.runtime_configuration_contract
    .canonical_delivery_action,
  "plan_erc20_delivery",
);
assert.equal(
  contract.runtime_configuration_contract
    .server_derived_transaction_plan_required,
  true,
);
assert.equal(
  contract.runtime_configuration_contract
    .caller_supplied_transaction_plan_forbidden,
  true,
);
assert.equal(
  contract.runtime_configuration_contract
    .direct_sign_broadcast_apply_allowed,
  false,
);

for (const marker of [
  '"plan_erc20_delivery"',
  '"VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL"',
  'const FIXED_GAS_LIMIT_MULTIPLIER_BPS = "12000"',
  'const FIXED_FEE_MULTIPLIER_BPS = "12000"',
  "runBuyVoidErc20TransactionPreparationPlannerV1",
  "reserved_attempt_loaded_from_server_journal: true",
  "server_derived_transaction_plan: true",
  "caller_supplied_transaction_plan: false",
  "coherent_pending_planner_required: true",
  "read_only_planner_rpc_when_enabled: true",
  "direct_sign_broadcast_apply_allowed: false",
  "durable_prepared_transaction_composition_ready: false",
  '"caller_supplied_runtime_material_forbidden"',
  '"erc20_durable_prepared_transaction_composition"',
]) {
  assert.equal(
    runtimeSource.includes(marker),
    true,
    `runtime contract drift: ${marker}`,
  );
}
for (const retiredDirectPath of [
  "runBuyVoidDeliverySignBroadcastV1",
  "createBuyVoidDeliverySubmissionGuardV1",
  "__void_buy_void_delivery_runtime_dependencies_v1",
]) {
  assert.equal(
    runtimeSource.includes(retiredDirectPath),
    false,
    `unsafe direct execution path retained: ${retiredDirectPath}`,
  );
}

for (const plannerMarker of [
  'execution_state_tag: "pending"',
  '"eth_getTransactionCount"',
  '"eth_estimateGas"',
  '"eth_getBalance"',
  '[policy.fulfillment_wallet_address, "pending"]',
  'estimateCallSource',
]) {
  if (plannerMarker === "estimateCallSource") continue;
  assert.equal(
    plannerSource.includes(plannerMarker),
    true,
    `planner source drift: ${plannerMarker}`,
  );
}
const estimateStart = plannerSource.indexOf(
  'const estimateResponse = await call("eth_estimateGas", [',
);
const estimateEnd = plannerSource.indexOf("]);", estimateStart);
assert.ok(estimateStart >= 0 && estimateEnd > estimateStart);
assert.equal(
  plannerSource.slice(estimateStart, estimateEnd + 3)
    .includes('"pending"'),
  true,
);

for (const marker of [
  "VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1",
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
    `future durable dependency contract drift: ${marker}`,
  );
}

assert.equal(
  signerSource.includes(
    `"${
      contract.runtime_configuration_contract
        .fixed_signer_credential_id
    }"`,
  ),
  true,
);
assert.equal(
  signerSource.includes("systemd_credential_only: true"),
  true,
);
assert.equal(
  signerSource.includes("environment_private_key: false"),
  true,
);
assert.equal(
  signerSource.includes("request_private_key: false"),
  true,
);

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
  parentSource.includes(
    "canonical_delivery_runtime_parent_mounted: false",
  ),
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
console.log("server_derived_transaction_plan_required=1");
console.log("caller_supplied_transaction_plan_forbidden=1");
console.log("direct_sign_broadcast_apply_allowed=0");
console.log("durable_prepared_transaction_composition_ready=0");
console.log("next_gate=erc20_durable_prepared_transaction_composition");
console.log("production_configuration_values_verified=0");
console.log("production_credential_binding_ready=0");
console.log("canonical_delivery_runtime_parent_mounted=0");
console.log("canonical_delivery_execution_ready=0");
console.log("presale_inventory_funding_ready=0");
console.log("credential_read=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
