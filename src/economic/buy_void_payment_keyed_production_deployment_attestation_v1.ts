import {
  VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_VERIFIER_V1,
  verifyBuyVoidPaymentKeyedProductionConfigurationV1,
} from "./buy_void_payment_keyed_production_configuration_verifier_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_DEPLOYMENT_ATTESTATION_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_DEPLOYMENT_ATTESTATION_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_DEPLOYMENT_ATTESTATION_AUTHORITY_V1 = {
  production_configuration_verifier_required: true,
  candidate_runtime_must_remain_disabled: true,
  candidate_runtime_apply_must_remain_disabled: true,
  candidate_policy_is_server_binding_source: true,
  compiled_identity_required: true,
  deployment_transaction_hash_required: true,
  genesis_predecessor_only_v1: true,
  loopback_read_only_rpc_possible: true,
  rpc_mutation: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  deployment: false,
  chain2050_mutation: false,
  inventory_funding: false,
  runtime_enablement_change: false,
  public_activation: false,
  automatic_retry: false,
  money_movement: false,
} as const;

export type BuyVoidPaymentKeyedProductionDeploymentAttestationInputV1 = {
  candidate_configuration: unknown;
  compiled_identity: unknown;
  deployment_transaction_hash: unknown;
  transport?: (call: {
    method: string;
    params: unknown[];
  }) => Promise<unknown>;
};

type ObserverModuleV1 = {
  VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_OBSERVER_V1: string;
  observeBuyVoidPresaleFulfillmentDeploymentV1: (
    input: Record<string, unknown>,
  ) => Promise<Record<string, any>>;
};

function text(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : String(value ?? "").trim();
}

function held(
  reason: string,
  detail?: Record<string, unknown>,
): Record<string, any> {
  return {
    ok: false,
    status: "held",
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_DEPLOYMENT_ATTESTATION_V1,
    version: 1,
    reason,
    ...(detail ? { detail } : {}),
    production_configuration_verified: false,
    deployment_attested: false,
    predecessor_lineage_attested: false,
    inventory_funding_verified: false,
    runtime_activation_authorized: false,
    public_activation_authorized: false,
    automatic_retry_allowed: false,
    authority:
      VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_DEPLOYMENT_ATTESTATION_AUTHORITY_V1,
  };
}

async function loadObserver(): Promise<ObserverModuleV1> {
  const href = new URL(
    "../../tools/buy-void-presale-fulfillment-deployment-observer-v1.mjs",
    import.meta.url,
  ).href;
  return await import(href) as ObserverModuleV1;
}

export async function runBuyVoidPaymentKeyedProductionDeploymentAttestationV1(
  input: BuyVoidPaymentKeyedProductionDeploymentAttestationInputV1,
): Promise<Record<string, any>> {
  const configuration =
    verifyBuyVoidPaymentKeyedProductionConfigurationV1(
      input?.candidate_configuration,
    );
  if (configuration.ok === false) {
    return held(
      "production_deployment_attestation_configuration_held:" +
        configuration.reason,
      {
        configuration_reason:
          configuration.reason,
      },
    );
  }

  if (
    configuration.marker !==
      VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_VERIFIER_V1 ||
    configuration.candidate_configuration_values_verified !== true ||
    configuration.runtime_remains_disabled !== true ||
    configuration.runtime_apply_remains_disabled !== true ||
    configuration.fulfillment_contract_deployment_attested !== false ||
    configuration.predecessor_lineage_attested !== false ||
    configuration.inventory_funding_verified !== false ||
    configuration.runtime_activation_authorized !== false ||
    configuration.public_activation_authorized !== false
  ) {
    return held(
      "production_deployment_attestation_configuration_boundary_invalid",
    );
  }

  const candidate = input.candidate_configuration as Record<string, unknown>;
  const deploymentTransactionHash =
    text(input.deployment_transaction_hash).toLowerCase();
  if (
    !/^0x[0-9a-f]{64}$/.test(
      deploymentTransactionHash,
    )
  ) {
    return held(
      "production_deployment_attestation_transaction_hash_invalid",
    );
  }

  const observer = await loadObserver();
  const observed =
    await observer.observeBuyVoidPresaleFulfillmentDeploymentV1({
      rpc_url:
        candidate
          .VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_RPC_URL,
      fulfillment_contract_address:
        configuration.fulfillment_contract_address,
      void_token_address:
        configuration.void_token_address,
      fulfiller_address:
        configuration.fulfillment_wallet_address,
      predecessor_address:
        "0x0000000000000000000000000000000000000000",
      deployment_transaction_hash:
        deploymentTransactionHash,
      min_confirmations:
        configuration.min_confirmations,
      request_timeout_ms:
        candidate
          .VOID_BUY_VOID_PAYMENT_KEYED_RPC_TIMEOUT_MS,
      max_response_bytes:
        candidate
          .VOID_BUY_VOID_PAYMENT_KEYED_RPC_MAX_RESPONSE_BYTES,
      compiled_identity:
        input.compiled_identity,
      ...(input.transport
        ? { transport: input.transport }
        : {}),
    });

  if (observed.ok !== true) {
    return held(
      "production_deployment_attestation_observer_held:" +
        text(observed.reason || "unknown"),
      {
        observer_reason:
          text(observed.reason || "unknown"),
        rpc_url_fingerprint_sha256:
          observed.rpc_url_fingerprint_sha256 ??
          null,
        rpc_methods_used:
          Array.isArray(observed.rpc_methods_used)
            ? observed.rpc_methods_used
            : [],
      },
    );
  }

  if (
    observed.rpc_url_fingerprint_sha256 !==
      configuration.rpc_url_fingerprint_sha256
  ) {
    return held(
      "production_deployment_attestation_rpc_fingerprint_mismatch",
      {
        expected_rpc_url_fingerprint_sha256:
          configuration.rpc_url_fingerprint_sha256,
        observed_rpc_url_fingerprint_sha256:
          observed.rpc_url_fingerprint_sha256 ?? null,
      },
    );
  }

  if (
    observed.attestation?.deployment_attested !== true ||
    observed.attestation?.predecessor_lineage_attested !== true ||
    observed.attestation?.genesis_predecessor !== true ||
    observed.attestation?.inventory_funding_verified !== false ||
    observed.attestation?.runtime_activation_authorized !== false ||
    observed.attestation?.public_activation_authorized !== false
  ) {
    return held(
      "production_deployment_attestation_observer_boundary_invalid",
    );
  }

  return {
    ok: true,
    status:
      "production_deployment_attested_held_on_inventory_funding",
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_DEPLOYMENT_ATTESTATION_V1,
    version: 1,
    configuration_fingerprint_sha256:
      configuration.configuration_fingerprint_sha256,
    preparation_policy_fingerprint_sha256:
      configuration.preparation_policy_fingerprint_sha256,
    receipt_policy_fingerprint_sha256:
      configuration.receipt_policy_fingerprint_sha256,
    rpc_url_fingerprint_sha256:
      configuration.rpc_url_fingerprint_sha256,
    fulfillment_contract_address:
      configuration.fulfillment_contract_address,
    void_token_address:
      configuration.void_token_address,
    fulfillment_wallet_address:
      configuration.fulfillment_wallet_address,
    deployment_transaction_hash:
      deploymentTransactionHash,
    deployment_attestation:
      observed.attestation,
    observation:
      observed.observation,
    production_configuration_verified: true,
    deployment_attested: true,
    predecessor_lineage_attested: true,
    genesis_predecessor: true,
    inventory_funding_verified: false,
    runtime_activation_authorized: false,
    public_activation_authorized: false,
    automatic_retry_allowed: false,
    next_gate:
      "presale_inventory_funding_attestation_and_separate_activation_authorization",
    authority:
      VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_DEPLOYMENT_ATTESTATION_AUTHORITY_V1,
  };
}
