import {
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
  bindBuyVoidSourceFinalityPaymentV1,
  readBuyVoidSourceFinalityExecutionPolicyV1,
  runBuyVoidSourceFinalityExecutionPreflightV1,
  type BuyVoidSourceFinalityExecutionPreflightDecisionV1,
  type BuyVoidSourceFinalityExecutionPreflightReadyV1,
} from "./buy_void_source_finality_execution_preflight_v1.js";
import type {
  BuyVoidRequestV1,
} from "./buy_void_auto_fulfillment_v1.js";
import {
  VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_AUTHORITY_V4,
  VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V4,
  observeBuyVoidSourceFinalityGenerationProvenanceV4,
} from "./buy_void_source_finality_generation_provenance_v4.js";

export const VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1 =
  "VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1";

export const VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_TEST_ONLY_V1 =
  "VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_TEST_ONLY_V1";

export const VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_AUTHORITY_V1 =
  Object.freeze({
    server_controlled_policy_required: true,
    canonical_source_finality_preflight_required: true,
    canonical_source_finality_capability_required: true,
    canonical_payment_identity_binding_required: true,
    public_request_bound_finality_required: true,
    execution_attempt_not_required_for_public_payment_verification: true,
    payment_instructions_fail_closed: true,
    payment_verified_transition_fail_closed: true,
    existing_payment_reconciliation_independent_of_intake_toggle: true,
    coupled_launch_gate_composed: false,
    overall_checkout_activation_authority: false,
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
const PUBLIC_REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,159}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const TX_HASH = /^0x[0-9a-f]{64}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;

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
  source_finality_policy_configured: true;
  production_source_finality_capability_ready: true;
  payment_instructions_finality_gate_ready: true;
  payment_verified_finality_gate_ready: false;
  inventory_reservation_authorized: false;
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
  source_finality_policy_configured: boolean;
  production_source_finality_capability_ready: false;
  payment_instructions_finality_gate_ready: false;
  payment_verified_finality_gate_ready: false;
  inventory_reservation_authorized: false;
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
  status: "ethereum_payment_source_finality_gate_ready";
  marker: typeof VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1;
  version: 1;
  attempt_id: string;
  source_chain: "ethereum";
  canonical_payment_identity: string;
  payment_key_sha256: string;
  source_finality_marker:
    typeof VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1;
  production_source_finality_authority_ready: true;
  payment_verified_finality_gate_ready: true;
  inventory_reservation_authorized: false;
  coupled_launch_gate_composed: false;
  overall_checkout_activation_authorized: false;
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
  payment_verified_finality_gate_ready: false;
  inventory_reservation_authorized: false;
  coupled_launch_gate_composed: false;
  overall_checkout_activation_authorized: false;
  payment_verified_event_write_performed: false;
  inventory_reservation_write_performed: false;
  transaction_broadcast_performed: false;
  funds_movement_performed: false;
};

export type BuyVoidEthereumPublicCheckoutPaymentDecisionV1 =
  | BuyVoidEthereumPublicCheckoutPaymentReadyV1
  | BuyVoidEthereumPublicCheckoutPaymentHeldV1;

export type BuyVoidEthereumPublicCheckoutRequestFinalityReadyV1 = {
  ok: true;
  status: "ethereum_request_source_finality_gate_ready";
  marker: typeof VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1;
  version: 1;
  request_id: string;
  source_chain: "ethereum";
  transaction_hash: string;
  canonical_payment_identity: string;
  payment_key_sha256: string;
  source_finality_marker:
    typeof VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V4;
  production_source_finality_authority_ready: true;
  payment_verified_finality_gate_ready: true;
  execution_attempt_required: false;
  coupled_launch_gate_composed: false;
  overall_checkout_activation_authorized: false;
  payment_verified_event_write_performed: false;
  inventory_reservation_write_performed: false;
  transaction_broadcast_performed: false;
  funds_movement_performed: false;
};

export type BuyVoidEthereumPublicCheckoutRequestFinalityHeldV1 = {
  ok: false;
  status: "held";
  marker: typeof VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1;
  version: 1;
  reason: string;
  request_id: string | null;
  source_chain: "ethereum";
  transaction_hash: string | null;
  production_source_finality_authority_ready: false;
  payment_verified_finality_gate_ready: false;
  execution_attempt_required: false;
  coupled_launch_gate_composed: false;
  overall_checkout_activation_authorized: false;
  payment_verified_event_write_performed: false;
  inventory_reservation_write_performed: false;
  transaction_broadcast_performed: false;
  funds_movement_performed: false;
};

export type BuyVoidEthereumPublicCheckoutRequestFinalityDecisionV1 =
  | BuyVoidEthereumPublicCheckoutRequestFinalityReadyV1
  | BuyVoidEthereumPublicCheckoutRequestFinalityHeldV1;

function enabled(value: unknown): boolean {
  return String(value ?? "").trim() === "1";
}

function readinessHeld(
  reason: string,
  missingEnvs: string[] = [],
  sourceFinalityPolicyConfigured = false,
): BuyVoidEthereumPublicCheckoutReadinessHeldV1 {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1,
    version: 1,
    reason,
    missing_envs: [...missingEnvs].sort(),
    source_chain: "ethereum",
    source_finality_policy_configured: sourceFinalityPolicyConfigured,
    production_source_finality_capability_ready: false,
    payment_instructions_finality_gate_ready: false,
    payment_verified_finality_gate_ready: false,
    inventory_reservation_authorized: false,
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
    payment_verified_finality_gate_ready: false,
    inventory_reservation_authorized: false,
    coupled_launch_gate_composed: false,
    overall_checkout_activation_authorized: false,
    payment_verified_event_write_performed: false,
    inventory_reservation_write_performed: false,
    transaction_broadcast_performed: false,
    funds_movement_performed: false,
  };
}

function requestFinalityHeld(
  reason: string,
  requestId: string | null = null,
  transactionHash: string | null = null,
): BuyVoidEthereumPublicCheckoutRequestFinalityHeldV1 {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1,
    version: 1,
    reason,
    request_id: requestId,
    source_chain: "ethereum",
    transaction_hash: transactionHash,
    production_source_finality_authority_ready: false,
    payment_verified_finality_gate_ready: false,
    execution_attempt_required: false,
    coupled_launch_gate_composed: false,
    overall_checkout_activation_authorized: false,
    payment_verified_event_write_performed: false,
    inventory_reservation_write_performed: false,
    transaction_broadcast_performed: false,
    funds_movement_performed: false,
  };
}

function normalizeEthereumPublicRequest(
  value: unknown,
): BuyVoidRequestV1 | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const request = value as Record<string, unknown>;
  if (
    typeof request.request_id !== "string" ||
    !PUBLIC_REQUEST_ID.test(request.request_id) ||
    request.source_chain !== "ethereum" ||
    typeof request.tx_hash !== "string" ||
    !TX_HASH.test(request.tx_hash.toLowerCase()) ||
    typeof request.delivery_address !== "string" ||
    !ADDRESS.test(request.delivery_address.toLowerCase()) ||
    typeof request.receive_address !== "string" ||
    !ADDRESS.test(request.receive_address.toLowerCase()) ||
    !(
      typeof request.usdc_amount === "string" ||
      typeof request.usdc_amount === "number"
    ) ||
    !(
      typeof request.quoted_void === "string" ||
      typeof request.quoted_void === "number"
    )
  ) {
    return null;
  }
  return {
    request_id: request.request_id,
    source_chain: "ethereum",
    tx_hash: request.tx_hash.toLowerCase(),
    delivery_address: request.delivery_address.toLowerCase(),
    receive_address: request.receive_address.toLowerCase(),
    usdc_amount: request.usdc_amount,
    quoted_void: request.quoted_void,
  };
}

function productionV4CapabilityReady(): boolean {
  const capability =
    VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_AUTHORITY_V4;
  return (
    Boolean(capability.reviewed_source_files_verified_on_success) &&
    Boolean(capability.source_generation_verified_on_success) &&
    Boolean(capability.deployed_artifact_generation_verified) &&
    Boolean(capability.authenticated_transport_identity_verified) &&
    Boolean(capability.remote_provider_identity_verified) &&
    Boolean(capability.total_operation_deadline_verified) &&
    Boolean(capability.ancestry_verified) &&
    Boolean(capability.provider_quorum_verified) &&
    Boolean(capability.production_source_finality_authority_ready)
  );
}

function classifyEthereumRequestFinalityDecision(
  requestValue: unknown,
  decision: unknown,
): BuyVoidEthereumPublicCheckoutRequestFinalityDecisionV1 {
  const request = normalizeEthereumPublicRequest(requestValue);
  if (!request) {
    return requestFinalityHeld("ethereum_request_invalid");
  }
  const record =
    decision && typeof decision === "object" && !Array.isArray(decision)
      ? (decision as Record<string, any>)
      : {};
  const event =
    record.verified_payment_event &&
    typeof record.verified_payment_event === "object" &&
    !Array.isArray(record.verified_payment_event)
      ? record.verified_payment_event
      : {};
  const canonicalIdentity =
    typeof record.canonical_payment_identity === "string"
      ? record.canonical_payment_identity.toLowerCase()
      : "";
  const paymentKey =
    typeof record.payment_key_sha256 === "string"
      ? record.payment_key_sha256.toLowerCase()
      : "";

  if (
    record.ok !== true ||
    record.marker !==
      VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V4 ||
    record.source_chain !== "ethereum" ||
    String(record.transaction_hash || "").toLowerCase() !== request.tx_hash ||
    record.reviewed_source_files_verified !== true ||
    record.authenticated_transport_identity_verified !== true ||
    record.remote_provider_identity_verified !== true ||
    record.total_operation_deadline_verified !== true ||
    record.source_generation_verified !== true ||
    record.deployed_artifact_generation_verified !== true ||
    record.ancestry_verified !== true ||
    record.provider_quorum_verified !== true ||
    record.production_source_finality_authority_ready !== true ||
    record.wallet_access !== false ||
    record.signing !== false ||
    record.transaction_broadcast !== false ||
    record.money_movement !== false ||
    event.request_id !== request.request_id ||
    event.operator_status !== "payment_verified" ||
    event.payment_verified !== true ||
    event.payment_identity_input_complete !== true ||
    String(event.tx_hash || "").toLowerCase() !== request.tx_hash ||
    !PAYMENT_ID.test(canonicalIdentity) ||
    !SHA256.test(paymentKey)
  ) {
    return requestFinalityHeld(
      "ethereum_request_source_finality_not_authoritative",
      request.request_id,
      request.tx_hash,
    );
  }

  const rebound = bindBuyVoidSourceFinalityPaymentV1({
    source_chain: "ethereum",
    transaction_hash: request.tx_hash,
    reservation_canonical_payment_identity: canonicalIdentity,
    observed_canonical_payment_identity: canonicalIdentity,
    observed_payment_key_sha256: paymentKey,
  });
  if (!rebound) {
    return requestFinalityHeld(
      "ethereum_request_payment_binding_invalid",
      request.request_id,
      request.tx_hash,
    );
  }

  return {
    ok: true,
    status: "ethereum_request_source_finality_gate_ready",
    marker: VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1,
    version: 1,
    request_id: request.request_id,
    source_chain: "ethereum",
    transaction_hash: request.tx_hash,
    canonical_payment_identity: rebound.canonical_payment_identity,
    payment_key_sha256: rebound.payment_key_sha256,
    source_finality_marker:
      VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V4,
    production_source_finality_authority_ready: true,
    payment_verified_finality_gate_ready: true,
    execution_attempt_required: false,
    coupled_launch_gate_composed: false,
    overall_checkout_activation_authorized: false,
    payment_verified_event_write_performed: false,
    inventory_reservation_write_performed: false,
    transaction_broadcast_performed: false,
    funds_movement_performed: false,
  };
}

function readEthereumFinalityPrerequisitesV1(
  env: NodeJS.ProcessEnv,
): BuyVoidEthereumPublicCheckoutReadinessDecisionV1 {
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
    source_finality_policy_configured: true,
    production_source_finality_capability_ready: true,
    payment_instructions_finality_gate_ready: true,
    payment_verified_finality_gate_ready: false,
    inventory_reservation_authorized: false,
    runtime_config_mutation_performed: false,
    payment_event_write_performed: false,
    inventory_write_performed: false,
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
  const prerequisites = readEthereumFinalityPrerequisitesV1(env);
  if (prerequisites.ok === false) return prerequisites;

  const capability =
    VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_AUTHORITY_V4;
  const capabilityReady =
    Boolean(capability.source_generation_verified_on_success) &&
    Boolean(capability.deployed_artifact_generation_verified) &&
    Boolean(capability.remote_provider_identity_verified) &&
    Boolean(capability.ancestry_verified) &&
    Boolean(capability.provider_quorum_verified) &&
    Boolean(capability.production_source_finality_authority_ready);
  if (!capabilityReady) {
    return readinessHeld(
      "ethereum_source_finality_capability_not_ready",
      [],
      true,
    );
  }
  return prerequisites;
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

export async function runBuyVoidEthereumPublicCheckoutRequestFinalityV1(
  input: {
    request: BuyVoidRequestV1;
    env?: NodeJS.ProcessEnv;
  },
): Promise<BuyVoidEthereumPublicCheckoutRequestFinalityDecisionV1> {
  const request = normalizeEthereumPublicRequest(input?.request);
  if (!request) {
    return requestFinalityHeld("ethereum_request_invalid");
  }

  const finality = readBuyVoidSourceFinalityExecutionPolicyV1(
    input.env || process.env,
  );
  if (finality.ok === false) {
    return requestFinalityHeld(
      "ethereum_request_" + finality.reason,
      request.request_id,
      request.tx_hash,
    );
  }
  if (!productionV4CapabilityReady()) {
    return requestFinalityHeld(
      "ethereum_request_source_finality_capability_not_ready",
      request.request_id,
      request.tx_hash,
    );
  }

  const rail = finality.policy.ethereum;
  let observed: unknown;
  try {
    observed = await observeBuyVoidSourceFinalityGenerationProvenanceV4({
      request,
      policy: {
        source_finality_policy: {
          enabled: true,
          source_chain: "ethereum",
          chain_id: rail.evm_chain_id,
          rpc_url: rail.rpc_url,
          rpc_url_fingerprint_sha256: rail.rpc_url_fingerprint_sha256,
          rpc_identity: rail.rpc_identity,
          finality_adapter_id: rail.finality_adapter_id,
          min_confirmations: rail.min_confirmations,
          usdc_contract: rail.usdc_contract,
          receive_address: rail.receive_address,
          timeout_ms: rail.timeout_ms,
          max_response_bytes: rail.max_response_bytes,
        },
        authority_policy_generation:
          finality.policy.authority_policy_generation,
        total_timeout_ms: finality.policy.total_timeout_ms,
      },
    });
  } catch {
    return requestFinalityHeld(
      "ethereum_request_source_finality_observer_failed",
      request.request_id,
      request.tx_hash,
    );
  }

  return classifyEthereumRequestFinalityDecision(request, observed);
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

  const finalityPrerequisites = readEthereumFinalityPrerequisitesV1(env);
  if (finalityPrerequisites.ok === false) {
    return paymentHeld(
      "ethereum_checkout_" + finalityPrerequisites.reason,
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
    status: "ethereum_payment_source_finality_gate_ready",
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
    payment_verified_finality_gate_ready: true,
    inventory_reservation_authorized: false,
    coupled_launch_gate_composed: false,
    overall_checkout_activation_authorized: false,
    payment_verified_event_write_performed: false,
    inventory_reservation_write_performed: false,
    transaction_broadcast_performed: false,
    funds_movement_performed: false,
  };
}

export function testOnlyClassifyBuyVoidEthereumPublicCheckoutRequestFinalityV1(
  request: BuyVoidRequestV1,
  decision: unknown,
) {
  const classified =
    classifyEthereumRequestFinalityDecision(request, decision);
  return Object.freeze({
    marker:
      VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_TEST_ONLY_V1,
    would_be_transition_ready: classified.ok === true,
    production_transition_authority: false,
    execution_attempt_required: false,
    payment_verified_event_write_performed: false,
    inventory_reservation_write_performed: false,
    reason: classified.ok === false ? classified.reason : null,
  });
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
    reason: classified.ok === false ? classified.reason : null,
  });
}
