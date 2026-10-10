import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_AUTHORITY_V1,
  VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_TEST_ONLY_V1,
  VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1,
  VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_PRE_ATTEMPT_FINALITY_V1,
  readBuyVoidEthereumPublicCheckoutReadinessV1,
  runBuyVoidEthereumPublicCheckoutPaymentFinalityV1,
  runBuyVoidEthereumPublicCheckoutPreAttemptFinalityV1,
  testOnlyClassifyBuyVoidEthereumPublicCheckoutFinalityV1,
  testOnlyClassifyBuyVoidEthereumPreAttemptDeadlineV1,
  testOnlyClassifyBuyVoidEthereumPreAttemptFinalityV1,
  testOnlyClassifyBuyVoidEthereumSourceFinalityCapabilityV1,
} from "../src/economic/buy_void_ethereum_public_checkout_finality_gate_v1.js";
import {
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_POLICY_ENVS_V1,
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
  type BuyVoidSourceFinalityExecutionPreflightReadyV1,
} from "../src/economic/buy_void_source_finality_execution_preflight_v1.js";
import {
  VOID_BUY_VOID_CANONICAL_DUAL_RAIL_PAYMENT_ENVS_V1,
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1,
} from "../src/economic/buy_void_crash_consistent_saga_server_policy_v1.js";
import {
  VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_AUTHORITY_V6,
  VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V6,
} from "../src/economic/buy_void_source_finality_generation_provenance_v6.js";

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
    .immutable_process_source_identity_required,
  true,
);
assert.equal(
  VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_AUTHORITY_V1
    .pre_attempt_request_level_v6_bridge,
  true,
);
assert.equal(
  VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_AUTHORITY_V1
    .pre_attempt_verified_payment_rebuilt_internally,
  true,
);
assert.equal(
  VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_AUTHORITY_V1
    .caller_supplied_verified_payment_event_authority,
  false,
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

const futureReadyCapability = Object.freeze({
  ...VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_AUTHORITY_V6,
  source_generation_verified_on_success: true,
  deployed_artifact_generation_verified: true,
  remote_provider_identity_verified: true,
  ancestry_verified: true,
  provider_quorum_verified: true,
  production_source_finality_authority_ready: true,
});
const futureCapabilityDecision =
  testOnlyClassifyBuyVoidEthereumSourceFinalityCapabilityV1(
    futureReadyCapability,
  );
assert.equal(
  futureCapabilityDecision.would_be_production_capability_ready,
  true,
);
assert.equal(
  futureCapabilityDecision.production_transition_authority,
  false,
);

for (const mutation of [
  { runtime_source_filesystem_read: false },
  { runtime_source_filesystem_write: true },
  { caller_generation_assertion_accepted: true },
  { reviewed_source_files_verification_required: false },
  { reviewed_source_files_verified_on_success: false },
  { source_generation_verified_on_success: false },
  { deployed_artifact_generation_verified: false },
  { authenticated_transport_identity_verified: false },
  { remote_provider_identity_verified: false },
  { total_operation_deadline_verified: false },
  { ancestry_verified: false },
  { provider_quorum_verified: false },
  { production_source_finality_authority_ready: false },
  { observation_generated_in_composition: false },
  { rpc_read: false },
  { rpc_write: true },
  { wallet_access: true },
  { signing: true },
  { transaction_construction: true },
  { transaction_broadcast: true },
  { runtime_route_mount: true },
  { background_loop: true },
  { inventory_mutation: true },
  { chain2050_mutation: true },
  { public_presale_activation: true },
  { money_movement: true },
] as const) {
  const decision =
    testOnlyClassifyBuyVoidEthereumSourceFinalityCapabilityV1({
      ...futureReadyCapability,
      ...mutation,
    });
  assert.equal(
    decision.would_be_production_capability_ready,
    false,
    JSON.stringify(mutation),
  );
  assert.equal(decision.production_transition_authority, false);
}
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

const deadlineBudget = testOnlyClassifyBuyVoidEthereumPreAttemptDeadlineV1({
  deadline_at_monotonic_ms: 10_000,
  request_timeout_ms: 3_000,
  now_monotonic_ms: 6_500,
});
assert.equal(deadlineBudget.would_be_within_deadline, true);
assert.equal(deadlineBudget.remaining_ms, 3_500);
assert.equal(deadlineBudget.rpc_timeout_ms, 3_000);
assert.equal(deadlineBudget.production_transition_authority, false);

const deadlineShrinksRpc =
  testOnlyClassifyBuyVoidEthereumPreAttemptDeadlineV1({
    deadline_at_monotonic_ms: 10_000,
    request_timeout_ms: 8_000,
    now_monotonic_ms: 9_250,
  });
assert.equal(deadlineShrinksRpc.would_be_within_deadline, true);
assert.equal(deadlineShrinksRpc.remaining_ms, 750);
assert.equal(deadlineShrinksRpc.rpc_timeout_ms, 750);

for (const candidate of [
  {
    deadline_at_monotonic_ms: 10_000,
    request_timeout_ms: 1_000,
    now_monotonic_ms: 10_000,
  },
  {
    deadline_at_monotonic_ms: 10_000,
    request_timeout_ms: 0,
    now_monotonic_ms: 9_000,
  },
] as const) {
  const held =
    testOnlyClassifyBuyVoidEthereumPreAttemptDeadlineV1(candidate);
  assert.equal(held.would_be_within_deadline, false);
  assert.equal(held.remaining_ms, 0);
  assert.equal(held.rpc_timeout_ms, 0);
  assert.equal(held.production_transition_authority, false);
}
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
const readinessMissingProcessIdentity =
  readBuyVoidEthereumPublicCheckoutReadinessV1({
    ...env,
    VOID_PROCESS_SOURCE_IDENTITY_MARKER: "",
  });
assert.equal(readinessMissingProcessIdentity.ok, false);
if (readinessMissingProcessIdentity.ok === false) {
  assert.equal(
    readinessMissingProcessIdentity.reason,
    "ethereum_process_source_identity_unavailable",
  );
  assert.equal(
    readinessMissingProcessIdentity.source_finality_policy_configured,
    true,
  );
  assert.equal(
    readinessMissingProcessIdentity.payment_instructions_finality_gate_ready,
    false,
  );
  assert.equal(
    readinessMissingProcessIdentity.payment_verified_finality_gate_ready,
    false,
  );
}

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


const preAttemptRequest = {
  request_id: "buyvoid_eth_pre_attempt_1",
  source_chain: "ethereum",
  tx_hash: transactionHash,
  delivery_address: "0x" + "6".repeat(40),
  receive_address: "0x" + "5".repeat(40),
  usdc_amount: "1",
  quoted_void: "2",
};
const preAttemptVerifiedEvent = {
  schema: "void_buy_void_verified_payment_event_v2",
  marker: "VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
  request_id: preAttemptRequest.request_id,
  operator_status: "payment_verified",
  payment_verified: true,
  tx_hash: transactionHash,
  payment_identity_input_complete: true,
  payment_verifier: {
    chain: "ethereum",
    transaction_hash: transactionHash,
    log_index: "7",
    block_number: "900000",
    confirmations: "15",
    usdc_contract: "0x" + "4".repeat(40),
    from_address: preAttemptRequest.delivery_address,
    receive_address: preAttemptRequest.receive_address,
    delivery_address: preAttemptRequest.delivery_address,
    amount_units: "1000000",
    requested_units: "1000000",
  },
} as const;

const preAttemptCurrent =
  await runBuyVoidEthereumPublicCheckoutPreAttemptFinalityV1({
    request: preAttemptRequest,
    env,
  });
assert.equal(preAttemptCurrent.ok, false);
if (preAttemptCurrent.ok === false) {
  assert.equal(
    preAttemptCurrent.reason,
    "ethereum_pre_attempt_source_finality_capability_not_ready",
  );
  assert.equal(
    preAttemptCurrent.canonical_payment_identity,
    null,
  );
  assert.equal(
    preAttemptCurrent.payment_verified_transition_ready,
    false,
  );
  assert.equal(
    preAttemptCurrent.production_source_finality_authority_ready,
    false,
  );
  assert.equal(
    preAttemptCurrent.process_source_identity_verified,
    true,
  );
}

const missingProcessIdentity =
  await runBuyVoidEthereumPublicCheckoutPreAttemptFinalityV1({
    request: preAttemptRequest,
    env: {
      ...env,
      VOID_PROCESS_SOURCE_IDENTITY_MARKER: "",
    },
  });
assert.equal(missingProcessIdentity.ok, false);
if (missingProcessIdentity.ok === false) {
  assert.equal(
    missingProcessIdentity.reason,
    "ethereum_pre_attempt_process_source_identity_unavailable",
  );
  assert.equal(
    missingProcessIdentity.process_source_identity_verified,
    false,
  );
}

const futureReadyObservation = {
  ok: true,
  marker: VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V6,
  source_chain: "ethereum",
  evm_chain_id: "1",
  transaction_hash: transactionHash,
  log_index: "7",
  canonical_payment_identity: canonicalIdentity,
  payment_key_sha256: paymentKey,
  payer_address: preAttemptRequest.delivery_address,
  receive_address: preAttemptRequest.receive_address,
  delivery_address: preAttemptRequest.delivery_address,
  usdc_contract: "0x" + "4".repeat(40),
  payment_usdc_atoms: "1000000",
  receipt_block_number: "900000",
  confirmations_observed: "15",
  min_confirmations: "12",
  reviewed_source_files_verified: true,
  authenticated_transport_identity_verified: true,
  observation_generated_in_composition: true,
  same_provider_consistency_verified: true,
  provider_consistency_verified: true,
  total_operation_deadline_verified: true,
  source_generation_verified: true,
  deployed_artifact_generation_verified: true,
  remote_provider_identity_verified: true,
  ancestry_verified: true,
  provider_quorum_verified: true,
  production_source_finality_authority_ready: true,
  wallet_access: false,
  signing: false,
  transaction_construction: false,
  transaction_broadcast: false,
  inventory_mutation: false,
  money_movement: false,
};
const preAttemptTestReady =
  testOnlyClassifyBuyVoidEthereumPreAttemptFinalityV1({
    observation: futureReadyObservation,
    verified_payment_event: preAttemptVerifiedEvent,
    canonical_payment_identity: canonicalIdentity,
    transaction_hash: transactionHash,
  });
assert.equal(
  preAttemptTestReady.marker,
  "VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_PRE_ATTEMPT_FINALITY_TEST_ONLY_V1",
);
assert.equal(preAttemptTestReady.would_be_transition_ready, true);
assert.equal(preAttemptTestReady.production_transition_authority, false);
assert.equal(preAttemptTestReady.payment_verified_event_write_performed, false);
assert.equal(preAttemptTestReady.inventory_reservation_write_performed, false);

const higherLatestConfirmationEvent =
  structuredClone(preAttemptVerifiedEvent) as any;
higherLatestConfirmationEvent.payment_verifier.confirmations = "18";
const confirmationClockDecoupled =
  testOnlyClassifyBuyVoidEthereumPreAttemptFinalityV1({
    observation: futureReadyObservation,
    verified_payment_event: higherLatestConfirmationEvent,
    canonical_payment_identity: canonicalIdentity,
    transaction_hash: transactionHash,
  });
assert.equal(confirmationClockDecoupled.would_be_transition_ready, true);
assert.equal(confirmationClockDecoupled.production_transition_authority, false);

const belowFinalityThreshold =
  testOnlyClassifyBuyVoidEthereumPreAttemptFinalityV1({
    observation: {
      ...futureReadyObservation,
      confirmations_observed: "11",
    },
    verified_payment_event: preAttemptVerifiedEvent,
    canonical_payment_identity: canonicalIdentity,
    transaction_hash: transactionHash,
  });
assert.equal(belowFinalityThreshold.would_be_transition_ready, false);
assert.equal(
  belowFinalityThreshold.reason,
  "ethereum_pre_attempt_verified_payment_observation_mismatch",
);

const inconsistentEvent = structuredClone(preAttemptVerifiedEvent) as any;
inconsistentEvent.payment_verifier.block_number = "900001";
const inconsistentObservationBinding =
  testOnlyClassifyBuyVoidEthereumPreAttemptFinalityV1({
    observation: futureReadyObservation,
    verified_payment_event: inconsistentEvent,
    canonical_payment_identity: canonicalIdentity,
    transaction_hash: transactionHash,
  });
assert.equal(
  inconsistentObservationBinding.would_be_transition_ready,
  false,
);
assert.equal(
  inconsistentObservationBinding.reason,
  "ethereum_pre_attempt_verified_payment_observation_mismatch",
);

for (const mutation of [
  { source_chain: "base" },
  { transaction_hash: "0x" + "c".repeat(64) },
  { canonical_payment_identity:
      `voidpay1:ethereum:${"0x" + "c".repeat(64)}:7` },
  { payment_key_sha256: "f".repeat(64) },
  { observation_generated_in_composition: false },
  { same_provider_consistency_verified: false },
  { provider_consistency_verified: false },
  { source_generation_verified: false },
  { deployed_artifact_generation_verified: false },
  { remote_provider_identity_verified: false },
  { ancestry_verified: false },
  { provider_quorum_verified: false },
  { production_source_finality_authority_ready: false },
  { transaction_construction: true },
  { inventory_mutation: true },
] as const) {
  const candidate = {
    ...futureReadyObservation,
    ...mutation,
  };
  const classified =
    testOnlyClassifyBuyVoidEthereumPreAttemptFinalityV1({
      observation: candidate,
      verified_payment_event: preAttemptVerifiedEvent,
      canonical_payment_identity: canonicalIdentity,
      transaction_hash: transactionHash,
    });
  assert.equal(
    classified.would_be_transition_ready,
    false,
    JSON.stringify(mutation),
  );
  assert.equal(classified.production_transition_authority, false);
}

assert.equal(
  VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_PRE_ATTEMPT_FINALITY_V1,
  "VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_PRE_ATTEMPT_FINALITY_V1",
);

const source = fs.readFileSync(
  "src/economic/buy_void_ethereum_public_checkout_finality_gate_v1.ts",
  "utf8",
);
assert.match(
  source,
  /runBuyVoidSourceFinalityExecutionPreflightV1\(\{/u,
);
assert.match(
  source,
  /observeBuyVoidSourceFinalityGenerationProvenanceV6\(\{/u,
);
assert.match(
  source,
  /observeBuyVoidPaymentV1\(\{/u,
);
assert.match(
  source,
  /buildBuyVoidVerifiedPaymentEventV2\(\{/u,
);
assert.match(
  source,
  /canonical_verified_payment_event: canonicalVerifiedPaymentEvent/u,
);
assert.match(
  source,
  /caller_supplied_verified_payment_event_authority: false/u,
);
const productionPreAttemptSource = source.slice(
  source.indexOf(
    "export async function runBuyVoidEthereumPublicCheckoutPreAttemptFinalityV1",
  ),
  source.indexOf(
    "export function testOnlyClassifyBuyVoidEthereumPreAttemptFinalityV1",
  ),
);
assert.doesNotMatch(
  productionPreAttemptSource,
  /verified_payment_event:\s*BuyVoidVerifiedPaymentEventV2/u,
  "production pre-attempt API must not accept a caller-supplied verified event",
);
assert.doesNotMatch(
  productionPreAttemptSource,
  /input\.verified_payment_event/u,
  "production pre-attempt path must not consume caller-supplied verified evidence",
);
assert.match(
  source,
  /runBuyVoidEthereumPublicCheckoutPreAttemptFinalityV1/u,
);
assert.match(
  source,
  /VOID_PROCESS_SOURCE_IDENTITY_MARKER/u,
);
assert.match(
  source,
  /productionSourceFinalityCapabilityReadyV1/u,
);
assert.match(
  source,
  /runtime_source_filesystem_read === true/u,
);
assert.match(
  source,
  /runtime_source_filesystem_write === false/u,
);
assert.match(
  source,
  /caller_generation_assertion_accepted === false/u,
);
assert.match(
  source,
  /reviewed_source_files_verified_on_success === true/u,
);
assert.match(
  source,
  /observation_generated_in_composition === true/u,
);
assert.match(
  source,
  /transaction_broadcast === false/u,
);

assert.match(
  source,
  /observation_generated_in_composition/u,
);
assert.match(
  source,
  /same_provider_consistency_verified/u,
);
assert.match(
  source,
  /provider_consistency_verified/u,
);
assert.match(
  source,
  /decimalUsdcUnitsV1/u,
);
assert.match(
  source,
  /positiveUintV1/u,
);
assert.match(
  source,
  /createPreAttemptDeadlineBoundPaymentTransportV1/u,
);
assert.match(
  productionPreAttemptSource,
  /const operationStartedAtMonotonicMs = performance\.now\(\);/u,
);
assert.match(
  productionPreAttemptSource,
  /transport: createPreAttemptDeadlineBoundPaymentTransportV1\(\{/u,
);
assert.match(
  productionPreAttemptSource,
  /total_timeout_ms: String\(finalityBudget\.remaining_ms\)/u,
);
assert.equal(
  (
    productionPreAttemptSource.match(
      /preAttemptDeadlineBudgetV1\(\{/gu,
    ) || []
  ).length >= 4,
  true,
  "pre-attempt bridge must refresh total-deadline budget across both observation stages",
);
assert.match(
  source,
  /required_min_confirmations: rail\.min_confirmations/u,
);
assert.doesNotMatch(
  source,
  /positiveUintV1\(observation\?\.min_confirmations\)/u,
  "production threshold must come from server-controlled rail policy",
);
assert.match(
  source,
  /const eventConfirmations = positiveUintV1\(verifier\?\.confirmations\);/u,
);
assert.match(
  source,
  /const finalizedConfirmations =\s*positiveUintV1\(observation\?\.confirmations_observed\);/u,
);
assert.match(
  source,
  /finalizedConfirmations < minimumConfirmations/u,
);
assert.doesNotMatch(
  source,
  /eventConfirmations\s*[!=]==?\s*finalizedConfirmations|finalizedConfirmations\s*[!=]==?\s*eventConfirmations/u,
  "latest-head and finalized-head confirmation counts must remain independent",
);
assert.match(
  source,
  /transaction_construction/u,
);
assert.match(
  source,
  /inventory_mutation/u,
);
assert.match(
  source,
  /ethereum_pre_attempt_verified_payment_observation_mismatch/u,
);
assert.doesNotMatch(
  source,
  /runBuyVoidEthereumPublicCheckoutPreAttemptFinalityV1[\s\S]{0,300}dependencies/u,
  "production pre-attempt bridge must not expose observer injection",
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

const runtimeIndex = fs.readFileSync("src/index.ts", "utf8");
const configStart = runtimeIndex.indexOf("function __voidBuyVoidConfigV1(){");
const configEnd = runtimeIndex.indexOf(
  "// VOID_BUY_VOID_POOL_ACCOUNTING_V1",
  configStart,
);
assert.ok(configStart >= 0 && configEnd > configStart);
const runtimeConfig = runtimeIndex.slice(configStart, configEnd);
assert.match(
  runtimeConfig,
  /readBuyVoidEthereumPublicCheckoutReadinessV1\(process\.env\)/u,
);
assert.match(
  runtimeConfig,
  /ethereum_requests_enabled=ethereum_requested&&ethereum_finality\?\.ok===true&&ethereum_finality\.payment_instructions_finality_gate_ready===true/u,
);

const verifierStart = runtimeIndex.indexOf(
  "// VOID_BUY_VOID_CANONICAL_VERIFIED_PAYMENT_V2_ROUTE_V1",
);
const verifierEnd = runtimeIndex.indexOf(
  'app.post("/__void/buy-void/operator/mark.json"',
  verifierStart,
);
assert.ok(verifierStart >= 0 && verifierEnd > verifierStart);
const runtimeVerifier = runtimeIndex.slice(verifierStart, verifierEnd);
assert.match(runtimeVerifier, /if\(chainCfg\.chain==="ethereum"\)\{/u);
assert.match(
  runtimeVerifier,
  /runBuyVoidEthereumPublicCheckoutPreAttemptFinalityV1\(\{request:found,env:process\.env\}\)/u,
);
assert.match(
  runtimeVerifier,
  /const verifiedEvent:any=finality\.canonical_verified_payment_event/u,
);
assert.match(runtimeVerifier, /error:"ethereum_source_finality_hold"/u);

const ethereumBranchStart = runtimeVerifier.indexOf(
  'if(chainCfg.chain==="ethereum"){',
);
const baseBranchStart = runtimeVerifier.indexOf(
  "}else{",
  ethereumBranchStart,
);
const commonMutationStart = runtimeVerifier.indexOf(
  'if(!__blo(found))throw new Error("request_launch_authority_expired_or_superseded");',
  baseBranchStart,
);
assert.ok(
  ethereumBranchStart >= 0 &&
    baseBranchStart > ethereumBranchStart &&
    commonMutationStart > baseBranchStart,
);
const ethereumRuntimeBranch = runtimeVerifier.slice(
  ethereumBranchStart,
  baseBranchStart,
);
const baseRuntimeBranch = runtimeVerifier.slice(
  baseBranchStart,
  commonMutationStart,
);
assert.doesNotMatch(
  ethereumRuntimeBranch,
  /__voidBuyVoidRpcV1\(chainCfg,"eth_getTransactionReceipt"/u,
  "Ethereum runtime must not authorize from the legacy receipt-only path",
);
assert.doesNotMatch(
  baseRuntimeBranch,
  /__voidBuyVoidRpcV1/u,
  "Base runtime must not fall back to the retired ad-hoc RPC helper",
);
assert.match(
  baseRuntimeBranch,
  /import\("\.\/economic\/buy_void_payment_rpc_observer_v1\.js"\)/u,
  "Base runtime must reuse the reviewed payment RPC observer",
);
assert.match(
  baseRuntimeBranch,
  /observeBuyVoidPaymentV1\(\{request:found,policy:\{enabled:true,source_chain:"base",chain_id:8453/u,
  "Base runtime must bind the reviewed observer to Base chain ID 8453",
);
assert.match(
  baseRuntimeBranch,
  /const receipt:any=observed\.receipt,currentBlock:any=observed\.current_block_number/u,
  "Base V2 verification must consume only the reviewed observer result",
);
assert.match(
  baseRuntimeBranch,
  /buildBuyVoidVerifiedPaymentEventV2/u,
  "Base canonical verified-payment builder must remain present",
);
assert.match(
  runtimeVerifier.slice(commonMutationStart),
  /__voidWriteBuyVoidOperatorEventV1\(event,found\)/u,
  "both rails must converge on the existing launch/capacity/duplicate mutation writer",
);

const requestStart = runtimeIndex.indexOf(
  'app.post("/__void/buy-void/request"',
);
const requestEnd = runtimeIndex.indexOf(
  'app.get("/__void/buy-void/status.json"',
  requestStart,
);
assert.ok(requestStart >= 0 && requestEnd > requestStart);
const requestRuntime = runtimeIndex.slice(requestStart, requestEnd);
assert.match(
  requestRuntime,
  /!ethereum\|\|!cfg\.ethereum_requests_enabled/u,
  "new Ethereum requests must follow the finality-gated config state",
);

const buyLive = fs.readFileSync(
  "public/void-app-wave1-v1/assets/js/buy-live.js",
  "utf8",
);
assert.match(
  buyLive,
  /config\.ethereum_requests_enabled/u,
  "browser rail state must remain sourced from the server config",
);

console.log(
  "VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1_PROOF_GREEN",
);
console.log("ethereum_payment_instructions_fail_closed=true");
console.log("server_controlled_finality_policy_required=true");
console.log("shared_v6_capability_classifier_required=true");
console.log("v6_runtime_source_filesystem_write_must_remain_false=true");
console.log("v6_caller_generation_assertion_must_remain_false=true");
console.log("partial_v6_capability_promotion_can_open_instructions=false");
console.log("current_production_source_finality_capability_ready=false");
console.log("ethereum_payment_instructions_runtime_finality_gated=true");
console.log("existing_payment_reconciliation_survives_intake_disable=true");
console.log("canonical_source_finality_preflight_required=true");
console.log("pre_attempt_request_level_v6_bridge_present=true");
console.log("pre_attempt_verified_payment_rebuilt_internally=true");
console.log("caller_supplied_verified_payment_event_authority=false");
console.log("pre_attempt_process_source_identity_required=true");
console.log("pre_attempt_module_generated_observation_required=true");
console.log("pre_attempt_provider_consistency_required=true");
console.log("pre_attempt_end_to_end_total_deadline_required=true");
console.log("pre_attempt_latest_rpc_timeout_shrinks_to_remaining_budget=true");
console.log("pre_attempt_v6_receives_remaining_total_budget=true");
console.log("pre_attempt_verified_payment_request_binding_required=true");
console.log("pre_attempt_verified_payment_observation_binding_required=true");
console.log("pre_attempt_forbidden_side_effects_required=true");
console.log("pre_attempt_execution_attempt_circularity_removed=true");
console.log("pre_attempt_current_production_authority=false");
console.log("synthetic_finality_production_authority=false");
console.log("base_behavior_preserved=true");
console.log("ethereum_payment_verified_requires_canonical_finality=true");
console.log("inventory_reservation_write_performed=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");
