import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_AUTHORITY_V1,
  VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_TEST_ONLY_V1,
  VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1,
  readBuyVoidEthereumPublicCheckoutReadinessV1,
  runBuyVoidEthereumPublicCheckoutPaymentFinalityV1,
  runBuyVoidEthereumPublicCheckoutRequestFinalityV1,
  testOnlyClassifyBuyVoidEthereumPublicCheckoutFinalityV1,
  testOnlyClassifyBuyVoidEthereumPublicCheckoutRequestFinalityV1,
} from "../src/economic/buy_void_ethereum_public_checkout_finality_gate_v1.js";
import {
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_POLICY_ENVS_V1,
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
  type BuyVoidSourceFinalityExecutionPreflightReadyV1,
} from "../src/economic/buy_void_source_finality_execution_preflight_v1.js";
import {
  VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V4,
} from "../src/economic/buy_void_source_finality_generation_provenance_v4.js";
import {
  VOID_BUY_VOID_CANONICAL_DUAL_RAIL_PAYMENT_ENVS_V1,
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1,
} from "../src/economic/buy_void_crash_consistent_saga_server_policy_v1.js";

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

function configuredEnv(): NodeJS.ProcessEnv {
  const finality =
    VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_POLICY_ENVS_V1;
  const saga =
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1;
  const dual = VOID_BUY_VOID_CANONICAL_DUAL_RAIL_PAYMENT_ENVS_V1;
  return {
    VOID_BUY_REQUESTS_ENABLED: "1",
    VOID_BUY_ETHEREUM_REQUESTS_ENABLED: "1",
    VOID_PROCESS_SOURCE_IDENTITY_MARKER: "VOID_NODE_PROCESS_SOURCE_IDENTITY_V1",
    VOID_PROCESS_SOURCE_COMMIT: "2".repeat(40),
    VOID_PROCESS_SOURCE_TREE: "3".repeat(40),
    VOID_PROCESS_SOURCE_BRANCH: "main",
    [finality.base_rpc_url]: "http://127.0.0.1:18545/",
    [finality.base_rpc_identity]: "base-production-rpc-v1",
    [finality.ethereum_rpc_url]: "http://127.0.0.1:19545/",
    [finality.ethereum_rpc_identity]: "ethereum-production-rpc-v1",
    [finality.total_timeout_ms]: "30000",
    [saga.rate_void_units_numerator]: "2",
    [saga.rate_void_units_denominator]: "1",
    [saga.inventory_policy_version]: "presale-v1",
    [saga.pool_id]: "buy-void-presale-v1",
    [saga.pool_capacity_void_units]: "10000000000000",
    [saga.max_reservation_void_units]: "10000000000000",
    [saga.fulfillment_wallet_address]: "0x" + "1".repeat(40),
    [dual.base.usdc_contract]: "0x" + "2".repeat(40),
    [dual.base.receive_address]: "0x" + "3".repeat(40),
    [dual.base.finalized_reference_block]: "123475",
    [dual.base.min_confirmations]: "12",
    [dual.ethereum.usdc_contract]: "0x" + "4".repeat(40),
    [dual.ethereum.receive_address]: "0x" + "5".repeat(40),
    [dual.ethereum.finalized_reference_block]: "987654",
    [dual.ethereum.min_confirmations]: "15",
  };
}

assert.equal(
  VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1,
  "VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1",
);
assert.equal(
  VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_AUTHORITY_V1
    .canonical_source_finality_preflight_required,
  true,
);
assert.equal(
  VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_AUTHORITY_V1
    .canonical_source_finality_capability_required,
  true,
);
assert.equal(
  VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_AUTHORITY_V1
    .base_behavior_modified,
  false,
);
assert.equal(
  VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_AUTHORITY_V1
    .coupled_launch_gate_composed,
  false,
);
assert.equal(
  VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_AUTHORITY_V1
    .overall_checkout_activation_authority,
  false,
);
assert.equal(
  VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_AUTHORITY_V1
    .existing_payment_reconciliation_independent_of_intake_toggle,
  true,
);
assert.equal(
  VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_AUTHORITY_V1
    .public_request_bound_finality_required,
  true,
);
assert.equal(
  VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_AUTHORITY_V1
    .execution_attempt_not_required_for_public_payment_verification,
  true,
);
for (const key of [
  "rpc_write",
  "request_intake_mutation",
  "payment_verified_event_write",
  "inventory_reservation_write",
  "wallet_or_signer_access",
  "private_key_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_submission",
  "transaction_broadcast",
  "chain2050_write",
  "wc_ledger_write",
  "market_activation",
  "public_presale_activation",
  "liquidity_movement",
  "treasury_movement",
  "funds_movement",
] as const) {
  assert.equal(
    VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_AUTHORITY_V1[key],
    false,
    key,
  );
}

const disabledAll =
  readBuyVoidEthereumPublicCheckoutReadinessV1({});
assert.equal(disabledAll.ok, false);
if (disabledAll.ok === false) {
  assert.equal(disabledAll.reason, "buy_void_requests_disabled");
  assert.equal(disabledAll.payment_instructions_finality_gate_ready, false);
}

const ethereumDisabled = readBuyVoidEthereumPublicCheckoutReadinessV1({
  VOID_BUY_REQUESTS_ENABLED: "1",
});
assert.equal(ethereumDisabled.ok, false);
if (ethereumDisabled.ok === false) {
  assert.equal(
    ethereumDisabled.reason,
    "buy_void_ethereum_requests_disabled",
  );
}

const missingFinality = readBuyVoidEthereumPublicCheckoutReadinessV1({
  VOID_BUY_REQUESTS_ENABLED: "1",
  VOID_BUY_ETHEREUM_REQUESTS_ENABLED: "1",
});
assert.equal(missingFinality.ok, false);
if (missingFinality.ok === false) {
  assert.equal(
    missingFinality.reason,
    "ethereum_source_finality_source_finality_execution_policy_not_configured",
  );
  assert.equal(missingFinality.source_finality_policy_configured, false);
  assert.equal(
    missingFinality.production_source_finality_capability_ready,
    false,
  );
  assert.ok(missingFinality.missing_envs.length > 0);
}

const env = configuredEnv();
const configuredButNotProductionReady =
  readBuyVoidEthereumPublicCheckoutReadinessV1(env);
assert.equal(configuredButNotProductionReady.ok, false);
if (configuredButNotProductionReady.ok === false) {
  assert.equal(
    configuredButNotProductionReady.reason,
    "ethereum_source_finality_capability_not_ready",
  );
  assert.equal(
    configuredButNotProductionReady.source_finality_policy_configured,
    true,
  );
  assert.equal(
    configuredButNotProductionReady.production_source_finality_capability_ready,
    false,
  );
  assert.equal(
    configuredButNotProductionReady.payment_instructions_finality_gate_ready,
    false,
  );
  assert.equal(
    configuredButNotProductionReady.payment_verified_finality_gate_ready,
    false,
  );
  assert.equal(
    configuredButNotProductionReady.inventory_reservation_authorized,
    false,
  );
  assert.equal(configuredButNotProductionReady.runtime_config_mutation_performed, false);
  assert.equal(configuredButNotProductionReady.payment_event_write_performed, false);
  assert.equal(configuredButNotProductionReady.inventory_write_performed, false);
  assert.equal(configuredButNotProductionReady.funds_movement_performed, false);
}

const publicEthereumRequest = {
  request_id: "buyvoid_proof_1234abcd",
  source_chain: "ethereum",
  tx_hash: "0x" + "b".repeat(64),
  delivery_address: "0x" + "6".repeat(40),
  receive_address: "0x" + "5".repeat(40),
  usdc_amount: "7",
  quoted_void: "14",
};

const currentRequestFinality =
  await runBuyVoidEthereumPublicCheckoutRequestFinalityV1({
    request: publicEthereumRequest,
    env,
  });
assert.equal(currentRequestFinality.ok, false);
if (currentRequestFinality.ok === false) {
  assert.equal(
    currentRequestFinality.reason,
    "ethereum_request_source_finality_capability_not_ready",
  );
  assert.equal(currentRequestFinality.execution_attempt_required, false);
  assert.equal(
    currentRequestFinality.payment_verified_finality_gate_ready,
    false,
  );
}

const requestCanonicalIdentity =
  `voidpay1:ethereum:${publicEthereumRequest.tx_hash}:7`;
const requestPaymentKey = expectedPaymentKey(requestCanonicalIdentity);
const requestAuthoritative = {
  ok: true,
  status: "source_finality_reviewed_source_files_verified",
  marker: VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V4,
  version: 4,
  source_chain: "ethereum",
  transaction_hash: publicEthereumRequest.tx_hash,
  canonical_payment_identity: requestCanonicalIdentity,
  payment_key_sha256: requestPaymentKey,
  reviewed_source_files_verified: true,
  authenticated_transport_identity_verified: true,
  remote_provider_identity_verified: true,
  total_operation_deadline_verified: true,
  source_generation_verified: true,
  deployed_artifact_generation_verified: true,
  ancestry_verified: true,
  provider_quorum_verified: true,
  production_source_finality_authority_ready: true,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
  verified_payment_event: {
    request_id: publicEthereumRequest.request_id,
    operator_status: "payment_verified",
    payment_verified: true,
    payment_identity_input_complete: true,
    tx_hash: publicEthereumRequest.tx_hash,
  },
};
const requestReady =
  testOnlyClassifyBuyVoidEthereumPublicCheckoutRequestFinalityV1(
    publicEthereumRequest,
    requestAuthoritative,
  );
assert.equal(requestReady.would_be_transition_ready, true);
assert.equal(requestReady.production_transition_authority, false);
assert.equal(requestReady.execution_attempt_required, false);

for (const [label, mutation] of [
  ["wrong_request_id", {
    verified_payment_event: {
      ...requestAuthoritative.verified_payment_event,
      request_id: "buyvoid_other_1234abcd",
    },
  }],
  ["wrong_tx", { transaction_hash: "0x" + "c".repeat(64) }],
  ["source_generation", { source_generation_verified: false }],
  ["deployed_artifact", { deployed_artifact_generation_verified: false }],
  ["remote_provider", { remote_provider_identity_verified: false }],
  ["ancestry", { ancestry_verified: false }],
  ["provider_quorum", { provider_quorum_verified: false }],
  ["production_authority", { production_source_finality_authority_ready: false }],
  ["payment_identity", {
    canonical_payment_identity:
      `voidpay1:ethereum:${publicEthereumRequest.tx_hash}:8`,
  }],
  ["payment_key", { payment_key_sha256: "f".repeat(64) }],
] as const) {
  const candidate = {
    ...requestAuthoritative,
    ...mutation,
  } as any;
  const decision =
    testOnlyClassifyBuyVoidEthereumPublicCheckoutRequestFinalityV1(
      publicEthereumRequest,
      candidate,
    );
  assert.equal(
    decision.would_be_transition_ready,
    false,
    label,
  );
  assert.equal(decision.production_transition_authority, false);
}

const invalidPublicRequest =
  await runBuyVoidEthereumPublicCheckoutRequestFinalityV1({
    request: {
      ...publicEthereumRequest,
      source_chain: "base",
    },
    env,
  });
assert.equal(invalidPublicRequest.ok, false);
if (invalidPublicRequest.ok === false) {
  assert.equal(invalidPublicRequest.reason, "ethereum_request_invalid");
}

const invalidAttempt =
  await runBuyVoidEthereumPublicCheckoutPaymentFinalityV1({
    root_dir: "/tmp/void-buy-ethereum-public-checkout-proof-missing",
    attempt_id: "invalid",
    env,
  });
assert.equal(invalidAttempt.ok, false);
if (invalidAttempt.ok === false) {
  assert.equal(
    invalidAttempt.reason,
    "ethereum_checkout_attempt_id_invalid",
  );
}

const attemptId = "a".repeat(64);
const missingAttempt =
  await runBuyVoidEthereumPublicCheckoutPaymentFinalityV1({
    root_dir: "/tmp/void-buy-ethereum-public-checkout-proof-missing",
    attempt_id: attemptId,
    env,
  });
assert.equal(missingAttempt.ok, false);
if (missingAttempt.ok === false) {
  assert.equal(
    missingAttempt.reason,
    "ethereum_checkout_source_finality_execution_attempt_not_found",
  );
  assert.equal(
    missingAttempt.production_source_finality_authority_ready,
    false,
  );
  assert.equal(missingAttempt.payment_verified_finality_gate_ready, false);
  assert.equal(missingAttempt.inventory_reservation_authorized, false);
}

const disabledIntakeEnv: NodeJS.ProcessEnv = {
  ...env,
  VOID_BUY_REQUESTS_ENABLED: "0",
  VOID_BUY_ETHEREUM_REQUESTS_ENABLED: "0",
};
const disabledIntakeExistingPayment =
  await runBuyVoidEthereumPublicCheckoutPaymentFinalityV1({
    root_dir: "/tmp/void-buy-ethereum-public-checkout-proof-missing",
    attempt_id: attemptId,
    env: disabledIntakeEnv,
  });
assert.equal(disabledIntakeExistingPayment.ok, false);
if (disabledIntakeExistingPayment.ok === false) {
  assert.equal(
    disabledIntakeExistingPayment.reason,
    "ethereum_checkout_source_finality_execution_attempt_not_found",
  );
}

const transactionHash = "0x" + "b".repeat(64);
const canonicalIdentity =
  `voidpay1:ethereum:${transactionHash}:7`;
const paymentKey = expectedPaymentKey(canonicalIdentity);
const authoritative: BuyVoidSourceFinalityExecutionPreflightReadyV1 = {
  ok: true,
  status: "ready",
  marker: VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
  version: 1,
  attempt_id: attemptId,
  source_chain: "ethereum",
  canonical_payment_identity: canonicalIdentity,
  payment_key_sha256: paymentKey,
  process_source_identity_verified: true,
  reviewed_source_files_verified: true,
  authenticated_transport_identity_verified: true,
  total_operation_deadline_verified: true,
  source_generation_verified: true,
  deployed_artifact_generation_verified: true,
  ancestry_verified: true,
  provider_quorum_verified: true,
  production_source_finality_authority_ready: true,
  wallet_access_performed: false,
  signing_performed: false,
  transaction_broadcast_performed: false,
  money_movement_performed: false,
};
const testReady =
  testOnlyClassifyBuyVoidEthereumPublicCheckoutFinalityV1(
    authoritative,
    attemptId,
  );
assert.equal(
  testReady.marker,
  VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_TEST_ONLY_V1,
);
assert.equal(testReady.would_be_transition_ready, true);
assert.equal(testReady.production_transition_authority, false);
assert.equal(testReady.payment_verified_event_write_performed, false);
assert.equal(testReady.inventory_reservation_write_performed, false);

for (const mutation of [
  { source_chain: "base" },
  { production_source_finality_authority_ready: false },
  { provider_quorum_verified: false },
  { ancestry_verified: false },
  { deployed_artifact_generation_verified: false },
  { canonical_payment_identity:
      `voidpay1:ethereum:${"0x" + "c".repeat(64)}:7` },
  { payment_key_sha256: "f".repeat(64) },
] as const) {
  const candidate = {
    ...authoritative,
    ...mutation,
  } as unknown as BuyVoidSourceFinalityExecutionPreflightReadyV1;
  const classified =
    testOnlyClassifyBuyVoidEthereumPublicCheckoutFinalityV1(
      candidate,
      attemptId,
    );
  assert.equal(
    classified.would_be_transition_ready,
    false,
    JSON.stringify(mutation),
  );
  assert.equal(classified.production_transition_authority, false);
}

const source = fs.readFileSync(
  "src/economic/buy_void_ethereum_public_checkout_finality_gate_v1.ts",
  "utf8",
);
assert.match(
  source,
  /runBuyVoidSourceFinalityExecutionPreflightV1\(\{/u,
);
const requestFinalityStart = source.indexOf(
  "export async function runBuyVoidEthereumPublicCheckoutRequestFinalityV1(",
);
const requestFinalityEnd = source.indexOf(
  "export async function runBuyVoidEthereumPublicCheckoutPaymentFinalityV1(",
  requestFinalityStart,
);
assert.ok(requestFinalityStart >= 0 && requestFinalityEnd > requestFinalityStart);
const requestFinalitySource = source.slice(
  requestFinalityStart,
  requestFinalityEnd,
);
assert.match(
  requestFinalitySource,
  /observeBuyVoidSourceFinalityGenerationProvenanceV4\(\{/u,
);
assert.doesNotMatch(
  requestFinalitySource,
  /runBuyVoidSourceFinalityExecutionPreflightV1|readBuyVoidExecutionAttemptV1|attempt_id/u,
  "public payment verification must not depend on downstream execution attempts",
);
assert.doesNotMatch(
  source,
  /observe_source_finality/u,
  "production Ethereum checkout gate must not expose observer injection",
);
assert.doesNotMatch(
  source,
  /eth_getTransactionReceipt|eth_getBlockByNumber|eth_blockNumber/u,
  "gate must reuse canonical finality machinery rather than implement local RPC confirmation",
);
assert.doesNotMatch(
  source,
  /writeFileSync|appendFileSync|renameSync|unlinkSync/u,
);
assert.doesNotMatch(
  source,
  /payment_verified["']\s*[,;)]/u,
  "gate must not write or synthesize a payment_verified event",
);

console.log(
  "VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1_PROOF_GREEN",
);
console.log("ethereum_payment_instructions_fail_closed=true");
console.log("server_controlled_finality_policy_required=true");
console.log("current_production_source_finality_capability_ready=false");
console.log("ethereum_payment_instructions_currently_hold=true");
console.log("existing_payment_reconciliation_survives_intake_disable=true");
console.log("canonical_source_finality_preflight_required=true");
console.log("public_request_bound_finality_required=true");
console.log("public_payment_verification_execution_attempt_required=false");
console.log("current_request_bound_finality_authority_ready=false");
console.log("synthetic_finality_production_authority=false");
console.log("base_behavior_modified=false");
console.log("payment_verified_event_write_performed=false");
console.log("inventory_reservation_write_performed=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");
