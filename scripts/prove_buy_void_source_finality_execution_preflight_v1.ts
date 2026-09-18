import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_AUTHORITY_V1,
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_POLICY_ENVS_V1,
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
  bindBuyVoidSourceFinalityPaymentV1,
  readBuyVoidSourceFinalityExecutionPolicyV1,
  runBuyVoidSourceFinalityExecutionPreflightV1,
} from "../src/economic/buy_void_source_finality_execution_preflight_v1.js";
import {
  VOID_BUY_VOID_CANONICAL_DUAL_RAIL_PAYMENT_ENVS_V1,
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1,
} from "../src/economic/buy_void_crash_consistent_saga_server_policy_v1.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeSource = fs.readFileSync(
  path.join(ROOT, "src/economic/buy_void_delivery_runtime_integration_v1.ts"),
  "utf8",
);
const preflightSource = fs.readFileSync(
  path.join(ROOT, "src/economic/buy_void_source_finality_execution_preflight_v1.ts"),
  "utf8",
);
const v4Source = fs.readFileSync(
  path.join(ROOT, "src/economic/buy_void_source_finality_generation_provenance_v4.ts"),
  "utf8",
);

assert.equal(
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
  "VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1",
);
assert.equal(
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_AUTHORITY_V1
    .signer_access_gate,
  true,
);
assert.equal(
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_AUTHORITY_V1
    .transaction_broadcast_gate,
  true,
);
assert.equal(
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_AUTHORITY_V1
    .reconciliation_gate,
  false,
);
assert.equal(
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_AUTHORITY_V1.signing,
  false,
);
assert.equal(
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_AUTHORITY_V1
    .transaction_broadcast,
  false,
);
assert.equal(
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_AUTHORITY_V1
    .money_movement,
  false,
);

for (const envName of Object.values(
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_POLICY_ENVS_V1,
)) {
  assert.match(envName, /^VOID_BUY_VOID_SOURCE_FINALITY_/);
}

function expectedPaymentKey(identity: string): string {
  const body = Buffer.from(identity, "utf8");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length, 0);
  return crypto
    .createHash("sha256")
    .update(
      Buffer.concat([
        Buffer.from("VOID_BUY_VOID_FULFILLMENT_ANCHOR_V1\0", "ascii"),
        length,
        body,
      ]),
    )
    .digest("hex");
}

const bindingTx = "0x" + "a".repeat(64);
const bindingIdentity = `voidpay1:base:${bindingTx}:7`;
const bindingKey = expectedPaymentKey(bindingIdentity);
assert.deepEqual(
  bindBuyVoidSourceFinalityPaymentV1({
    source_chain: "base",
    transaction_hash: bindingTx,
    reservation_canonical_payment_identity: bindingIdentity,
    observed_canonical_payment_identity: bindingIdentity,
    observed_payment_key_sha256: bindingKey,
  }),
  {
    canonical_payment_identity: bindingIdentity,
    payment_key_sha256: bindingKey,
  },
);
let paymentBindingCoercions = 0;
const hostilePaymentKey = {
  [Symbol.toPrimitive]() {
    paymentBindingCoercions += 1;
    return bindingKey;
  },
};
assert.equal(
  bindBuyVoidSourceFinalityPaymentV1({
    source_chain: "base",
    transaction_hash: bindingTx,
    reservation_canonical_payment_identity: bindingIdentity,
    observed_canonical_payment_identity: bindingIdentity,
    observed_payment_key_sha256: hostilePaymentKey,
  }),
  null,
);
assert.equal(paymentBindingCoercions, 0);

for (const invalidBinding of [
  {
    source_chain: "ethereum",
    transaction_hash: bindingTx,
    reservation_canonical_payment_identity: bindingIdentity,
    observed_canonical_payment_identity: bindingIdentity,
    observed_payment_key_sha256: bindingKey,
  },
  {
    source_chain: "base",
    transaction_hash: "0x" + "b".repeat(64),
    reservation_canonical_payment_identity: bindingIdentity,
    observed_canonical_payment_identity: bindingIdentity,
    observed_payment_key_sha256: bindingKey,
  },
  {
    source_chain: "base",
    transaction_hash: bindingTx,
    reservation_canonical_payment_identity:
      `voidpay1:base:${bindingTx}:8`,
    observed_canonical_payment_identity: bindingIdentity,
    observed_payment_key_sha256: bindingKey,
  },
  {
    source_chain: "base",
    transaction_hash: bindingTx,
    reservation_canonical_payment_identity: bindingIdentity,
    observed_canonical_payment_identity: bindingIdentity,
    observed_payment_key_sha256: "f".repeat(64),
  },
]) {
  assert.equal(bindBuyVoidSourceFinalityPaymentV1(invalidBinding), null);
}
assert.doesNotMatch(
  preflightSource,
  /payment_key_sha256:\s*attempt\.reservation\.payment_key_sha256/,
  "legacy reservation payment key must not become Chain-2050 authority",
);

let observerCalls = 0;
const observer = async () => {
  observerCalls += 1;
  return { ok: true };
};

const invalidAttempt = await runBuyVoidSourceFinalityExecutionPreflightV1(
  {
    root_dir: "/tmp/void-source-finality-preflight-proof-does-not-exist",
    attempt_id: "invalid",
    env: {},
  },
  { observe_source_finality: observer },
);
assert.equal(invalidAttempt.ok, false);
if (invalidAttempt.ok === false) {
  assert.equal(
    invalidAttempt.reason,
    "source_finality_execution_attempt_id_invalid",
  );
  assert.equal(invalidAttempt.wallet_access_performed, false);
  assert.equal(invalidAttempt.signing_performed, false);
  assert.equal(invalidAttempt.transaction_broadcast_performed, false);
  assert.equal(invalidAttempt.money_movement_performed, false);
}
assert.equal(observerCalls, 0);

const validAttemptId = "1".repeat(64);
const missingProcessIdentity =
  await runBuyVoidSourceFinalityExecutionPreflightV1(
    {
      root_dir: "/tmp/void-source-finality-preflight-proof-does-not-exist",
      attempt_id: validAttemptId,
      env: {},
    },
    { observe_source_finality: observer },
  );
assert.equal(missingProcessIdentity.ok, false);
if (missingProcessIdentity.ok === false) {
  assert.equal(
    missingProcessIdentity.reason,
    "source_finality_process_source_identity_unavailable",
  );
  assert.equal(missingProcessIdentity.process_source_identity_verified, false);
}
assert.equal(observerCalls, 0);

const processIdentityEnv: NodeJS.ProcessEnv = {
  VOID_PROCESS_SOURCE_IDENTITY_MARKER: "VOID_NODE_PROCESS_SOURCE_IDENTITY_V1",
  VOID_PROCESS_SOURCE_COMMIT: "2".repeat(40),
  VOID_PROCESS_SOURCE_TREE: "3".repeat(40),
  VOID_PROCESS_SOURCE_BRANCH: "main",
};
const missingPolicy = await runBuyVoidSourceFinalityExecutionPreflightV1(
  {
    root_dir: "/tmp/void-source-finality-preflight-proof-does-not-exist",
    attempt_id: validAttemptId,
    env: processIdentityEnv,
  },
  { observe_source_finality: observer },
);
assert.equal(missingPolicy.ok, false);
if (missingPolicy.ok === false) {
  assert.equal(
    missingPolicy.reason,
    "source_finality_execution_policy_not_configured",
  );
  assert.equal(missingPolicy.process_source_identity_verified, true);
  assert.equal(missingPolicy.wallet_access_performed, false);
  assert.equal(missingPolicy.signing_performed, false);
  assert.equal(missingPolicy.transaction_broadcast_performed, false);
  assert.equal(missingPolicy.money_movement_performed, false);
}
assert.equal(observerCalls, 0);

const sourceFinalityNames =
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_POLICY_ENVS_V1;
const sagaNames =
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1;
const dualNames = VOID_BUY_VOID_CANONICAL_DUAL_RAIL_PAYMENT_ENVS_V1;
const dualPolicyEnv: NodeJS.ProcessEnv = {
  [sourceFinalityNames.base_rpc_url]: "http://127.0.0.1:18545/",
  [sourceFinalityNames.base_rpc_identity]: "base-production-rpc-v1",
  [sourceFinalityNames.ethereum_rpc_url]: "http://127.0.0.1:19545/",
  [sourceFinalityNames.ethereum_rpc_identity]: "ethereum-production-rpc-v1",
  [sourceFinalityNames.total_timeout_ms]: "30000",
  [sagaNames.rate_void_units_numerator]: "2",
  [sagaNames.rate_void_units_denominator]: "1",
  [sagaNames.inventory_policy_version]: "presale-v1",
  [sagaNames.pool_id]: "buy-void-presale-v1",
  [sagaNames.pool_capacity_void_units]: "10000000000000",
  [sagaNames.max_reservation_void_units]: "10000000000000",
  [sagaNames.fulfillment_wallet_address]: "0x" + "1".repeat(40),
  [dualNames.base.usdc_contract]: "0x" + "2".repeat(40),
  [dualNames.base.receive_address]: "0x" + "3".repeat(40),
  [dualNames.base.finalized_reference_block]: "123475",
  [dualNames.base.min_confirmations]: "12",
  [dualNames.ethereum.usdc_contract]: "0x" + "4".repeat(40),
  [dualNames.ethereum.receive_address]: "0x" + "5".repeat(40),
  [dualNames.ethereum.finalized_reference_block]: "987654",
  [dualNames.ethereum.min_confirmations]: "15",
};
const configuredDualPolicy =
  readBuyVoidSourceFinalityExecutionPolicyV1(dualPolicyEnv);
if (configuredDualPolicy.ok === false) {
  throw new Error(configuredDualPolicy.reason);
}
assert.equal(configuredDualPolicy.ok, true);
assert.equal(configuredDualPolicy.policy.base.source_chain, "base");
assert.equal(configuredDualPolicy.policy.base.evm_chain_id, "8453");
assert.equal(configuredDualPolicy.policy.base.min_confirmations, "12");
assert.equal(
  configuredDualPolicy.policy.base.usdc_contract,
  ("0x" + "2".repeat(40)),
);
assert.equal(configuredDualPolicy.policy.ethereum.source_chain, "ethereum");
assert.equal(configuredDualPolicy.policy.ethereum.evm_chain_id, "1");
assert.equal(configuredDualPolicy.policy.ethereum.min_confirmations, "15");
assert.equal(
  configuredDualPolicy.policy.ethereum.usdc_contract,
  ("0x" + "4".repeat(40)),
);
assert.deepEqual(
  configuredDualPolicy.policy.authority_policy_generation.rail_order,
  ["base", "ethereum"],
);
assert.deepEqual(
  configuredDualPolicy.policy.authority_policy_generation.rails.map(
    (rail) => rail.source_chain,
  ),
  ["base", "ethereum"],
);

const incompleteDualEnv = { ...dualPolicyEnv };
delete incompleteDualEnv[dualNames.ethereum.receive_address];
const incompleteDualPolicy =
  readBuyVoidSourceFinalityExecutionPolicyV1(incompleteDualEnv);
if (incompleteDualPolicy.ok) {
  throw new Error("incomplete dual-rail source-finality policy accepted");
}
assert.equal(incompleteDualPolicy.ok, false);
assert.equal(
  incompleteDualPolicy.reason,
  "source_finality_server_policy_canonical_dual_rail_configuration_incomplete",
);

const mixedLegacyDualPolicy =
  readBuyVoidSourceFinalityExecutionPolicyV1({
    ...dualPolicyEnv,
    [sagaNames.payment_chain]: "base",
  });
if (mixedLegacyDualPolicy.ok) {
  throw new Error("mixed legacy/dual source-finality policy accepted");
}
assert.equal(mixedLegacyDualPolicy.ok, false);
assert.equal(
  mixedLegacyDualPolicy.reason,
  "source_finality_server_policy_canonical_dual_rail_legacy_payment_configuration_present",
);

const guardStart = runtimeSource.indexOf(
  "function sourceFinalityGuardedDependencies(",
);
const guardEnd = runtimeSource.indexOf("function decisionStatus(", guardStart);
assert.ok(guardStart >= 0 && guardEnd > guardStart);
const guardSource = runtimeSource.slice(guardStart, guardEnd);

for (const ordered of [
  ["await requirePreflight();", "return dependencies.signer.get_address();"],
  [
    "await requirePreflight();",
    "return dependencies.signer.sign_transaction(transaction);",
  ],
  [
    "await requirePreflight();",
    "return dependencies.broadcaster.broadcast_signed_transaction(",
  ],
] as const) {
  const delegate = guardSource.indexOf(ordered[1]);
  assert.ok(delegate >= 0, `missing guarded delegate ${ordered[1]}`);
  const prefix = guardSource.slice(0, delegate);
  assert.ok(
    prefix.lastIndexOf(ordered[0]) >= 0,
    `delegate is not preceded by source-finality preflight: ${ordered[1]}`,
  );
}

assert.match(
  guardSource,
  /preflightPromise \|\|= runBuyVoidSourceFinalityExecutionPreflightV1/,
);
assert.match(
  runtimeSource,
  /const guardedExternal = external\s*\? sourceFinalityGuardedDependencies\(rootDir, attemptId, external\)/,
);
assert.match(runtimeSource, /signer: guardedExternal\.signer/);
assert.match(runtimeSource, /broadcaster: guardedExternal\.broadcaster/);
assert.doesNotMatch(
  runtimeSource,
  /dependencies:\s*external\s*\?\s*\{\s*signer: external\.signer/,
);
assert.equal(
  Array.from(
    runtimeSource.matchAll(/runBuyVoidSourceFinalityExecutionPreflightV1\(/g),
  ).length,
  1,
  "preflight must be lazy inside dependency wrappers, not eager in reconciliation",
);
assert.match(
  runtimeSource,
  /reconciliation_without_signer_or_broadcaster_remains_available: true/,
);
assert.match(
  runtimeSource,
  /source_finality_failure_prevents_signer_access: true/,
);
assert.match(
  runtimeSource,
  /source_finality_failure_prevents_broadcast_call: true/,
);

for (const requiredReadyFlag of [
  "reviewed_source_files_verified === true",
  "authenticated_transport_identity_verified === true",
  "total_operation_deadline_verified === true",
  "source_generation_verified === true",
  "deployed_artifact_generation_verified === true",
  "ancestry_verified === true",
  "provider_quorum_verified === true",
  "production_source_finality_authority_ready === true",
]) {
  assert.ok(
    preflightSource.includes(requiredReadyFlag),
    `missing ready boundary ${requiredReadyFlag}`,
  );
}
assert.match(
  preflightSource,
  /observeBuyVoidSourceFinalityGenerationProvenanceV4\(value\)/,
);

for (const currentV4Hold of [
  "source_generation_verified: false",
  "deployed_artifact_generation_verified: false",
  "ancestry_verified: false",
  "provider_quorum_verified: false",
  "production_source_finality_authority_ready: false",
]) {
  assert.ok(
    v4Source.includes(currentV4Hold),
    `V4 truth boundary unexpectedly moved: ${currentV4Hold}`,
  );
}

// Regression for configured capability being misreported as effective authority.
// Synthetic dependencies only; no wallet, RPC, listener, or capability is used.
const statusEnv: Record<string, string> = {
  VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED: "1",
  VOID_BUY_VOID_DELIVERY_CHAIN_ID: "2050",
  VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS: "0x" + "2".repeat(40),
  VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS: "0x" + "1".repeat(40),
  VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS: "10000000000000",
  VOID_BUY_VOID_DELIVERY_MAX_GAS_LIMIT: "100000",
  VOID_BUY_VOID_DELIVERY_MAX_FEE_PER_GAS_WEI: "3000000000",
  VOID_BUY_VOID_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI:
    "1000000000",
  VOID_BUY_VOID_ERC20_EXECUTION_RPC_URL:
    "http://127.0.0.1:8545/",
  VOID_BUY_VOID_DELIVERY_GAS_LIMIT_MULTIPLIER_BPS: "12000",
  VOID_BUY_VOID_DELIVERY_FEE_MULTIPLIER_BPS: "20000",
  VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS: "3",
  VOID_BUY_VOID_DELIVERY_RPC_TIMEOUT_MS: "5000",
  VOID_BUY_VOID_DELIVERY_RPC_MAX_RESPONSE_BYTES: "65536",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_CHAIN: "base",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_USDC_CONTRACT:
    "0x" + "4".repeat(40),
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_RECEIVE_ADDRESS:
    "0x" + "3".repeat(40),
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_CURRENT_BLOCK_NUMBER:
    "105",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_MIN_CONFIRMATIONS:
    "3",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_NUMERATOR:
    "2",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_DENOMINATOR:
    "1",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_INVENTORY_POLICY_VERSION:
    "presale-v1",
  VOID_BUY_VOID_INVENTORY_POOL_ID: "buy-void-presale-v1",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_POOL_CAPACITY_VOID_UNITS:
    "10000000000000",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_MAX_RESERVATION_VOID_UNITS:
    "10000000000000",
  VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS: "0x" + "1".repeat(40),
};
const savedEnv = Object.fromEntries(Object.keys(statusEnv).map(k => [k, process.env[k]]));
const state = globalThis as any;
const dependencyKey = "__void_buy_void_delivery_runtime_dependencies_v1";
const savedDependencies = state[dependencyKey];
let capabilityCalls = 0;
const forbiddenCapability = async () => { capabilityCalls++; throw new Error("unexpected_capability_use"); };
try {
  Object.assign(process.env, statusEnv);
  state[dependencyKey] = {
    signer: { get_address: forbiddenCapability, sign_transaction: forbiddenCapability },
    broadcaster: { broadcast_signed_transaction: forbiddenCapability },
  };
  const { buyVoidDeliveryRuntimeStatusV1 } = await import("../src/economic/buy_void_delivery_runtime_integration_v1.js");
  for (const enabledValue of ["0", "1"]) {
    process.env.VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED = enabledValue;
    const status: any = buyVoidDeliveryRuntimeStatusV1();
    assert.equal(status.policy_configured, true);
    assert.equal(status.signer_configured, true);
    assert.equal(status.broadcaster_configured, true);
    assert.equal(status.capability_configured, enabledValue === "1");
    assert.equal(status.authorization_scope, "per_attempt_command");
    assert.equal(status.authorization_status, "not_evaluated");
    for (const key of ["signing", "transaction_broadcast", "money_movement", "production_source_finality_authority_ready"]) {
      assert.equal(status.effective_authority[key], false, `status must not authorize ${key}`);
    }
  }
  assert.equal(capabilityCalls, 0);
} finally {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  if (savedDependencies === undefined) delete state[dependencyKey]; else state[dependencyKey] = savedDependencies;
}

console.log(
  "VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1_PROOF_GREEN",
);
console.log("lazy_dependency_gate=true");
console.log("signer_access_guarded=true");
console.log("broadcast_call_guarded=true");
console.log("reconciliation_not_eagerly_gated=true");
console.log("current_v4_production_authority_ready=false");
console.log("canonical_dual_rail_preflight_configurable=true");
console.log("partial_or_mixed_dual_rail_config_rejected=true");
console.log("wallet_or_signer_action_performed=false");
console.log("transaction_broadcast_performed=false");
console.log("chain2050_mutation_performed=false");
console.log("inventory_mutation_performed=false");
console.log("funds_moved=false");
