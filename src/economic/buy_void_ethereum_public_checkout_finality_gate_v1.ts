import {
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
  bindBuyVoidSourceFinalityPaymentV1,
  readBuyVoidSourceFinalityExecutionPolicyV1,
  runBuyVoidSourceFinalityExecutionPreflightV1,
  type BuyVoidSourceFinalityExecutionPreflightDecisionV1,
  type BuyVoidSourceFinalityExecutionPreflightReadyV1,
} from "./buy_void_source_finality_execution_preflight_v1.js";

export const VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1 =
  "VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1";

export const VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_TEST_ONLY_V1 =
  "VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_TEST_ONLY_V1";

export const VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_AUTHORITY_V1 =
  Object.freeze({
    server_controlled_policy_required: true,
    canonical_source_finality_preflight_required: true,
    canonical_payment_identity_binding_required: true,
    payment_instructions_fail_closed: true,
    payment_verified_transition_fail_closed: true,
    base_behavior_modified: false,
    rpc_read_possible_during_payment_verification: true,
    rpc_write: false,
    request_intake_mutation: false,
    payment_verified_event_write: false,
    inventory_reservation_write: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    chain2050_write: false,
    wc_ledger_write: false,
    market_activation: false,
    public_presale_activation: false,
    liquidity_movement: false,
    treasury_movement: false,
    funds_movement: false,
  });

const ATTEMPT_ID = /^[0-9a-f]{64}$/u;
const PAYMENT_ID =
  /^voidpay1:ethereum:(0x[0-9a-f]{64}):([0-9]+)$/u;

export type BuyVoidEthereumPublicCheckoutReadinessReadyV1 = {
  ok: true;
  status: "ethereum_checkout_finality_prerequisites_configured";
  marker: typeof VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1;
  version: 1;
  source_chain: "ethereum";
  chain_id: "1";
  rpc_identity: string;
  rpc_url_fingerprint_sha256: string;
  finality_adapter_id: string;
  min_confirmations: string;
  payment_instructions_ready: true;
  payment_verified_transition_ready: false;
  inventory_reservation_ready: false;
  runtime_config_mutation_performed: false;
  payment_event_write_performed: false;
  inventory_write_performed: false;
  funds_movement_performed: false;
};

export type BuyVoidEthereumPublicCheckoutReadinessHeldV1 = {
  ok: false;
  status: "held";
  marker: typeof VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1;
  version: 1;
  reason: string;
  missing_envs: string[];
  source_chain: "ethereum";
  payment_instructions_ready: false;
  payment_verified_transition_ready: false;
  inventory_reservation_ready: false;
  runtime_config_mutation_performed: false;
  payment_event_write_performed: false;
  inventory_write_performed: false;
  funds_movement_performed: false;
};

export type BuyVoidEthereumPublicCheckoutReadinessDecisionV1 =
  | BuyVoidEthereumPublicCheckoutReadinessReadyV1
  | BuyVoidEthereumPublicCheckoutReadinessHeldV1;

export type BuyVoidEthereumPublicCheckoutPaymentReadyV1 = {
  ok: true;
  status: "ethereum_payment_finality_verified_transition_ready";
  marker: typeof VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1;
  version: 1;
  attempt_id: string;
  source_chain: "ethereum";
  canonical_payment_identity: string;
  payment_key_sha256: string;
  source_finality_marker:
    typeof VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1;
  production_source_finality_authority_ready: true;
  payment_verified_transition_ready: true;
  inventory_reservation_ready: true;
  payment_verified_event_write_performed: false;
  inventory_reservation_write_performed: false;
  transaction_broadcast_performed: false;
  funds_movement_performed: false;
};

export type BuyVoidEthereumPublicCheckoutPaymentHeldV1 = {
  ok: false;
  status: "held";
  marker: typeof VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1;
  version: 1;
  reason: string;
  attempt_id: string | null;
  source_chain: "ethereum";
  production_source_finality_authority_ready: false;
  payment_verified_transition_ready: false;
  inventory_reservation_ready: false;
  payment_verified_event_write_performed: false;
  inventory_reservation_write_performed: false;
  transaction_broadcast_performed: false;
  funds_movement_performed: false;
};

export type BuyVoidEthereumPublicCheckoutPaymentDecisionV1 =
  | BuyVoidEthereumPublicCheckoutPaymentReadyV1
  | BuyVoidEthereumPublicCheckoutPaymentHeldV1;

function enabled(value: unknown): boolean {
  return String(value ?? "").trim() === "1";
}

function readinessHeld(
  reason: string,
  missingEnvs: string[] = [],
): BuyVoidEthereumPublicCheckoutReadinessHeldV1 {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1,
    version: 1,
    reason,
    missing_envs: [...missingEnvs].sort(),
    source_chain: "ethereum",
    payment_instructions_ready: false,
    payment_verified_transition_ready: false,
    inventory_reservation_ready: false,
    runtime_config_mutation_performed: false,
    payment_event_write_performed: false,
    inventory_write_performed: false,
    funds_movement_performed: false,
  };
}

function paymentHeld(
  reason: string,
  attemptId: string | null,
): BuyVoidEthereumPublicCheckoutPaymentHeldV1 {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1,
    version: 1,
    reason,
    attempt_id: attemptId,
    source_chain: "ethereum",
    production_source_finality_authority_ready: false,
    payment_verified_transition_ready: false,
    inventory_reservation_ready: false,
    payment_verified_event_write_performed: false,
    inventory_reservation_write_performed: false,
    transaction_broadcast_performed: false,
    funds_movement_performed: false,
  };
}

export function readBuyVoidEthereumPublicCheckoutReadinessV1(
  env: NodeJS.ProcessEnv = process.env,
): BuyVoidEthereumPublicCheckoutReadinessDecisionV1 {
  if (!enabled(env.VOID_BUY_REQUESTS_ENABLED)) {
    return readinessHeld("buy_void_requests_disabled");
  }
  if (!enabled(env.VOID_BUY_ETHEREUM_REQUESTS_ENABLED)) {
    return readinessHeld("buy_void_ethereum_requests_disabled");
  }

  const finality = readBuyVoidSourceFinalityExecutionPolicyV1(env);
  if (finality.ok === false) {
    return readinessHeld(
      "ethereum_source_finality_" + finality.reason,
      finality.missing_envs,
    );
  }

  const rail = finality.policy.ethereum;
  if (
    rail.source_chain !== "ethereum" ||
    rail.evm_chain_id !== "1" ||
    !rail.rpc_identity ||
    !/^[0-9a-f]{64}$/u.test(rail.rpc_url_fingerprint_sha256) ||
    !rail.finality_adapter_id ||
    !/^[1-9][0-9]*$/u.test(rail.min_confirmations)
  ) {
    return readinessHeld("ethereum_source_finality_rail_invalid");
  }

  return {
    ok: true,
    status: "ethereum_checkout_finality_prerequisites_configured",
    marker: VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1,
    version: 1,
    source_chain: "ethereum",
    chain_id: "1",
    rpc_identity: rail.rpc_identity,
    rpc_url_fingerprint_sha256: rail.rpc_url_fingerprint_sha256,
    finality_adapter_id: rail.finality_adapter_id,
    min_confirmations: rail.min_confirmations,
    payment_instructions_ready: true,
    payment_verified_transition_ready: false,
    inventory_reservation_ready: false,
    runtime_config_mutation_performed: false,
    payment_event_write_performed: false,
    inventory_write_performed: false,
    funds_movement_performed: false,
  };
}

function classifyEthereumFinalityDecision(
  decision: BuyVoidSourceFinalityExecutionPreflightDecisionV1,
  expectedAttemptId: string,
):
  | {
      ok: true;
      finality: BuyVoidSourceFinalityExecutionPreflightReadyV1;
      canonical_payment_identity: string;
      payment_key_sha256: string;
    }
  | { ok: false; reason: string } {
  if (
    decision.ok !== true ||
    decision.status !== "ready" ||
    decision.marker !==
      VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1 ||
    decision.attempt_id !== expectedAttemptId ||
    decision.source_chain !== "ethereum" ||
    decision.process_source_identity_verified !== true ||
    decision.reviewed_source_files_verified !== true ||
    decision.authenticated_transport_identity_verified !== true ||
    decision.total_operation_deadline_verified !== true ||
    decision.source_generation_verified !== true ||
    decision.deployed_artifact_generation_verified !== true ||
    decision.ancestry_verified !== true ||
    decision.provider_quorum_verified !== true ||
    decision.production_source_finality_authority_ready !== true ||
    decision.wallet_access_performed !== false ||
    decision.signing_performed !== false ||
    decision.transaction_broadcast_performed !== false ||
    decision.money_movement_performed !== false
  ) {
    return { ok: false, reason: "ethereum_source_finality_not_authoritative" };
  }

  const match = PAYMENT_ID.exec(decision.canonical_payment_identity);
  if (!match) {
    return { ok: false, reason: "ethereum_payment_identity_invalid" };
  }
  const rebound = bindBuyVoidSourceFinalityPaymentV1({
    source_chain: "ethereum",
    transaction_hash: match[1],
    reservation_canonical_payment_identity:
      decision.canonical_payment_identity,
    observed_canonical_payment_identity:
      decision.canonical_payment_identity,
    observed_payment_key_sha256: decision.payment_key_sha256,
  });
  if (!rebound) {
    return { ok: false, reason: "ethereum_payment_binding_invalid" };
  }

  return {
    ok: true,
    finality: decision,
    canonical_payment_identity: rebound.canonical_payment_identity,
    payment_key_sha256: rebound.payment_key_sha256,
  };
}

export async function runBuyVoidEthereumPublicCheckoutPaymentFinalityV1(
  input: {
    root_dir: string;
    attempt_id: string;
    env?: NodeJS.ProcessEnv;
  },
): Promise<BuyVoidEthereumPublicCheckoutPaymentDecisionV1> {
  const env = input.env || process.env;
  const attemptId = String(input.attempt_id ?? "").trim().toLowerCase();
  if (!ATTEMPT_ID.test(attemptId)) {
    return paymentHeld("ethereum_checkout_attempt_id_invalid", null);
  }

  const readiness = readBuyVoidEthereumPublicCheckoutReadinessV1(env);
  if (readiness.ok === false) {
    return paymentHeld(
      "ethereum_checkout_" + readiness.reason,
      attemptId,
    );
  }

  const finality = await runBuyVoidSourceFinalityExecutionPreflightV1({
    root_dir: input.root_dir,
    attempt_id: attemptId,
    env,
  });
  const classified = classifyEthereumFinalityDecision(
    finality,
    attemptId,
  );
  if (classified.ok === false) {
    const upstream =
      finality.ok === false ? finality.reason : classified.reason;
    return paymentHeld(
      "ethereum_checkout_" + upstream,
      attemptId,
    );
  }

  return {
    ok: true,
    status: "ethereum_payment_finality_verified_transition_ready",
    marker: VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1,
    version: 1,
    attempt_id: attemptId,
    source_chain: "ethereum",
    canonical_payment_identity:
      classified.canonical_payment_identity,
    payment_key_sha256: classified.payment_key_sha256,
    source_finality_marker:
      VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
    production_source_finality_authority_ready: true,
    payment_verified_transition_ready: true,
    inventory_reservation_ready: true,
    payment_verified_event_write_performed: false,
    inventory_reservation_write_performed: false,
    transaction_broadcast_performed: false,
    funds_movement_performed: false,
  };
}

export function testOnlyClassifyBuyVoidEthereumPublicCheckoutFinalityV1(
  decision: BuyVoidSourceFinalityExecutionPreflightDecisionV1,
  expectedAttemptId: string,
) {
  const classified = classifyEthereumFinalityDecision(
    decision,
    expectedAttemptId,
  );
  return Object.freeze({
    marker:
      VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_TEST_ONLY_V1,
    would_be_transition_ready: classified.ok === true,
    production_transition_authority: false,
    payment_verified_event_write_performed: false,
    inventory_reservation_write_performed: false,
    reason: classified.ok ? null : classified.reason,
  });
}
