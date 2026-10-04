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
  VOID_BUY_VOID_VERIFIED_PAYMENT_V2,
  type BuyVoidVerifiedPaymentEventV2,
} from "./buy_void_verified_payment_v2.js";
import {
  VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_AUTHORITY_V5,
  VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V5,
  observeBuyVoidSourceFinalityGenerationProvenanceV5,
} from "./buy_void_source_finality_generation_provenance_v5.js";

export const VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1 =
  "VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1";

export const VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_TEST_ONLY_V1 =
  "VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_TEST_ONLY_V1";

export const VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_PRE_ATTEMPT_FINALITY_V1 =
  "VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_PRE_ATTEMPT_FINALITY_V1";

export const VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_AUTHORITY_V1 =
  Object.freeze({
    server_controlled_policy_required: true,
    immutable_process_source_identity_required: true,
    pre_attempt_request_level_v5_bridge: true,
    canonical_source_finality_preflight_required: true,
    canonical_source_finality_capability_required: true,
    canonical_payment_identity_binding_required: true,
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
const PROCESS_SOURCE_MARKER =
  "VOID_NODE_PROCESS_SOURCE_IDENTITY_V1";
const SHA40 = /^[0-9a-f]{40}$/u;

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


export type BuyVoidEthereumPublicCheckoutPreAttemptFinalityReadyV1 = {
  ok: true;
  status: "ethereum_pre_attempt_source_finality_ready";
  marker:
    typeof VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_PRE_ATTEMPT_FINALITY_V1;
  version: 1;
  source_chain: "ethereum";
  canonical_payment_identity: string;
  payment_key_sha256: string;
  verified_payment_marker: typeof VOID_BUY_VOID_VERIFIED_PAYMENT_V2;
  source_finality_marker:
    typeof VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V5;
  process_source_identity_verified: true;
  reviewed_source_files_verified: true;
  authenticated_transport_identity_verified: true;
  observation_generated_in_composition: true;
  same_provider_consistency_verified: true;
  provider_consistency_verified: true;
  total_operation_deadline_verified: true;
  source_generation_verified: true;
  deployed_artifact_generation_verified: true;
  remote_provider_identity_verified: true;
  ancestry_verified: true;
  provider_quorum_verified: true;
  production_source_finality_authority_ready: true;
  payment_verified_transition_ready: true;
  filesystem_write_performed: false;
  wallet_access_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  inventory_reservation_write_performed: false;
  funds_movement_performed: false;
};

export type BuyVoidEthereumPublicCheckoutPreAttemptFinalityHeldV1 = {
  ok: false;
  status: "held";
  marker:
    typeof VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_PRE_ATTEMPT_FINALITY_V1;
  version: 1;
  reason: string;
  source_chain: "ethereum";
  canonical_payment_identity: string | null;
  process_source_identity_verified: boolean;
  production_source_finality_authority_ready: false;
  payment_verified_transition_ready: false;
  filesystem_write_performed: false;
  wallet_access_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  inventory_reservation_write_performed: false;
  funds_movement_performed: false;
};

export type BuyVoidEthereumPublicCheckoutPreAttemptFinalityDecisionV1 =
  | BuyVoidEthereumPublicCheckoutPreAttemptFinalityReadyV1
  | BuyVoidEthereumPublicCheckoutPreAttemptFinalityHeldV1;

function enabled(value: unknown): boolean {
  return String(value ?? "").trim() === "1";
}


function preAttemptHeld(
  reason: string,
  canonicalPaymentIdentity: string | null = null,
  processSourceIdentityVerified = false,
): BuyVoidEthereumPublicCheckoutPreAttemptFinalityHeldV1 {
  return {
    ok: false,
    status: "held",
    marker:
      VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_PRE_ATTEMPT_FINALITY_V1,
    version: 1,
    reason,
    source_chain: "ethereum",
    canonical_payment_identity: canonicalPaymentIdentity,
    process_source_identity_verified: processSourceIdentityVerified,
    production_source_finality_authority_ready: false,
    payment_verified_transition_ready: false,
    filesystem_write_performed: false,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    inventory_reservation_write_performed: false,
    funds_movement_performed: false,
  };
}

function processSourceIdentityVerifiedV1(
  env: NodeJS.ProcessEnv,
): boolean {
  return (
    String(env.VOID_PROCESS_SOURCE_IDENTITY_MARKER || "").trim() ===
      PROCESS_SOURCE_MARKER &&
    SHA40.test(
      String(env.VOID_PROCESS_SOURCE_COMMIT || "").trim().toLowerCase(),
    ) &&
    SHA40.test(
      String(env.VOID_PROCESS_SOURCE_TREE || "").trim().toLowerCase(),
    ) &&
    String(env.VOID_PROCESS_SOURCE_BRANCH || "").trim() === "main"
  );
}

function canonicalEthereumVerifiedPaymentIdentityV1(input: {
  request: BuyVoidRequestV1;
  verified_payment_event: BuyVoidVerifiedPaymentEventV2;
}): string | null {
  const request = input?.request;
  const event = input?.verified_payment_event;
  const requestChain = String(request?.source_chain || "").trim().toLowerCase();
  const chain = requestChain === "eth" ? "ethereum" : requestChain;
  const requestTx = String(request?.tx_hash || "").trim().toLowerCase();
  const eventTx = String(event?.tx_hash || "").trim().toLowerCase();
  const verifierTx = String(
    event?.payment_verifier?.transaction_hash || "",
  ).trim().toLowerCase();
  const verifierChain = String(
    event?.payment_verifier?.chain || "",
  ).trim().toLowerCase();
  const logIndex = String(
    event?.payment_verifier?.log_index ?? "",
  ).trim();

  if (
    chain !== "ethereum" ||
    !/^0x[0-9a-f]{64}$/u.test(requestTx) ||
    event?.schema !== "void_buy_void_verified_payment_event_v2" ||
    event?.marker !== VOID_BUY_VOID_VERIFIED_PAYMENT_V2 ||
    event?.payment_identity_input_complete !== true ||
    event?.payment_verified !== true ||
    event?.operator_status !== "payment_verified" ||
    event?.request_id !== request?.request_id ||
    eventTx !== requestTx ||
    verifierChain !== "ethereum" ||
    verifierTx !== requestTx ||
    !/^(0|[1-9][0-9]*)$/u.test(logIndex)
  ) {
    return null;
  }
  let parsedLogIndex: bigint;
  try {
    parsedLogIndex = BigInt(logIndex);
  } catch {
    return null;
  }
  if (parsedLogIndex < 0n || parsedLogIndex > 0xffff_ffffn) {
    return null;
  }
  return `voidpay1:ethereum:${requestTx}:${logIndex}`;
}

function classifyEthereumPreAttemptObservationV1(input: {
  observation: unknown;
  canonical_payment_identity: string;
  transaction_hash: string;
}):
  | {
      ok: true;
      canonical_payment_identity: string;
      payment_key_sha256: string;
    }
  | { ok: false; reason: string } {
  const observation =
    input.observation &&
    typeof input.observation === "object" &&
    !Array.isArray(input.observation)
      ? input.observation as Record<string, unknown>
      : null;
  if (
    !observation ||
    observation.ok !== true ||
    observation.marker !==
      VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V5 ||
    observation.source_chain !== "ethereum" ||
    observation.evm_chain_id !== "1" ||
    String(observation.transaction_hash || "").toLowerCase() !==
      input.transaction_hash ||
    observation.canonical_payment_identity !==
      input.canonical_payment_identity ||
    observation.reviewed_source_files_verified !== true ||
    observation.authenticated_transport_identity_verified !== true ||
    observation.observation_generated_in_composition !== true ||
    observation.same_provider_consistency_verified !== true ||
    observation.provider_consistency_verified !== true ||
    observation.total_operation_deadline_verified !== true ||
    observation.source_generation_verified !== true ||
    observation.deployed_artifact_generation_verified !== true ||
    observation.remote_provider_identity_verified !== true ||
    observation.ancestry_verified !== true ||
    observation.provider_quorum_verified !== true ||
    observation.production_source_finality_authority_ready !== true ||
    observation.wallet_access !== false ||
    observation.signing !== false ||
    observation.transaction_broadcast !== false ||
    observation.money_movement !== false
  ) {
    return {
      ok: false,
      reason: "ethereum_pre_attempt_source_finality_not_authoritative",
    };
  }

  const rebound = bindBuyVoidSourceFinalityPaymentV1({
    source_chain: "ethereum",
    transaction_hash: input.transaction_hash,
    reservation_canonical_payment_identity:
      input.canonical_payment_identity,
    observed_canonical_payment_identity:
      observation.canonical_payment_identity,
    observed_payment_key_sha256:
      observation.payment_key_sha256,
  });
  if (!rebound) {
    return {
      ok: false,
      reason: "ethereum_pre_attempt_payment_binding_invalid",
    };
  }
  return {
    ok: true,
    canonical_payment_identity: rebound.canonical_payment_identity,
    payment_key_sha256: rebound.payment_key_sha256,
  };
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
    VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_AUTHORITY_V5;
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

export async function runBuyVoidEthereumPublicCheckoutPreAttemptFinalityV1(
  input: {
    request: BuyVoidRequestV1;
    verified_payment_event: BuyVoidVerifiedPaymentEventV2;
    env?: NodeJS.ProcessEnv;
  },
): Promise<BuyVoidEthereumPublicCheckoutPreAttemptFinalityDecisionV1> {
  const canonicalPaymentIdentity =
    canonicalEthereumVerifiedPaymentIdentityV1(input);
  if (!canonicalPaymentIdentity) {
    return preAttemptHeld(
      "ethereum_pre_attempt_verified_payment_binding_invalid",
    );
  }
  const env = input.env || process.env;
  const processIdentity = processSourceIdentityVerifiedV1(env);
  if (!processIdentity) {
    return preAttemptHeld(
      "ethereum_pre_attempt_process_source_identity_unavailable",
      canonicalPaymentIdentity,
      false,
    );
  }
  const requestTx = String(input.request.tx_hash).trim().toLowerCase();

  const policy = readBuyVoidSourceFinalityExecutionPolicyV1(env);
  if (policy.ok === false) {
    return preAttemptHeld(
      "ethereum_pre_attempt_" + policy.reason,
      canonicalPaymentIdentity,
      true,
    );
  }

  const capability =
    VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_AUTHORITY_V5;
  const capabilityReady =
    Boolean(capability.reviewed_source_files_verified_on_success) &&
    Boolean(capability.source_generation_verified_on_success) &&
    Boolean(capability.deployed_artifact_generation_verified) &&
    Boolean(capability.authenticated_transport_identity_verified) &&
    Boolean(capability.remote_provider_identity_verified) &&
    Boolean(capability.total_operation_deadline_verified) &&
    Boolean(capability.ancestry_verified) &&
    Boolean(capability.provider_quorum_verified) &&
    Boolean(capability.production_source_finality_authority_ready);
  if (!capabilityReady) {
    return preAttemptHeld(
      "ethereum_pre_attempt_source_finality_capability_not_ready",
      canonicalPaymentIdentity,
      true,
    );
  }

  const rail = policy.policy.ethereum;
  const observation =
    await observeBuyVoidSourceFinalityGenerationProvenanceV5({
      request: input.request,
      policy: {
        source_finality_policy: {
          enabled: true,
          source_chain: "ethereum",
          chain_id: rail.evm_chain_id,
          rpc_url: rail.rpc_url,
          rpc_url_fingerprint_sha256:
            rail.rpc_url_fingerprint_sha256,
          rpc_identity: rail.rpc_identity,
          finality_adapter_id: rail.finality_adapter_id,
          min_confirmations: rail.min_confirmations,
          usdc_contract: rail.usdc_contract,
          receive_address: rail.receive_address,
          timeout_ms: rail.timeout_ms,
          max_response_bytes: rail.max_response_bytes,
        },
        authority_policy_generation:
          policy.policy.authority_policy_generation,
        total_timeout_ms: policy.policy.total_timeout_ms,
      },
    });

  const classified = classifyEthereumPreAttemptObservationV1({
    observation,
    canonical_payment_identity: canonicalPaymentIdentity,
    transaction_hash: requestTx,
  });
  if (classified.ok === false) {
    return preAttemptHeld(
      classified.reason,
      canonicalPaymentIdentity,
      true,
    );
  }

  return {
    ok: true,
    status: "ethereum_pre_attempt_source_finality_ready",
    marker:
      VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_PRE_ATTEMPT_FINALITY_V1,
    version: 1,
    source_chain: "ethereum",
    canonical_payment_identity:
      classified.canonical_payment_identity,
    payment_key_sha256: classified.payment_key_sha256,
    verified_payment_marker: VOID_BUY_VOID_VERIFIED_PAYMENT_V2,
    source_finality_marker:
      VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V5,
    process_source_identity_verified: true,
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
    payment_verified_transition_ready: true,
    filesystem_write_performed: false,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    inventory_reservation_write_performed: false,
    funds_movement_performed: false,
  };
}

export function testOnlyClassifyBuyVoidEthereumPreAttemptFinalityV1(
  input: {
    observation: unknown;
    canonical_payment_identity: string;
    transaction_hash: string;
  },
) {
  const classified = classifyEthereumPreAttemptObservationV1(input);
  return Object.freeze({
    marker:
      "VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_PRE_ATTEMPT_FINALITY_TEST_ONLY_V1",
    would_be_transition_ready: classified.ok === true,
    production_transition_authority: false,
    filesystem_write_performed: false,
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
