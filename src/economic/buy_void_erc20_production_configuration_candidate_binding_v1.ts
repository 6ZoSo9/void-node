import {
  verifyBuyVoidErc20ProductionConfigurationV1,
} from "./buy_void_erc20_production_configuration_verifier_v1.js";

export const VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_V1 =
  "VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_V1";

export const VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_AUTHORITY_V1 = {
  source_only_binding: true,
  explicit_candidate_only: true,
  explicit_provenance_input_required: true,
  process_environment_read: false,
  filesystem_read: false,
  filesystem_write: false,
  credential_read: false,
  wallet_access: false,
  rpc_call: false,
  signing: false,
  transaction_broadcast: false,
  runtime_activation: false,
  dependency_injection_activation: false,
  inventory_funding: false,
  treasury_liquidity_action: false,
  money_movement: false,
} as const;

export const VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_V1 = {
  VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED: "0",
  VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_ENABLED: "0",
  VOID_BUY_VOID_RUNTIME_DIR: "/var/lib/void/buy-void/runtime-integration-v1",
  VOID_BUY_VOID_DELIVERY_CHAIN_ID: "2050",
  VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS:
    "0x470075B85352Eb86F7d089FB9ba88945f12AAd94",
  VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS:
    "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
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
    "20b5201b7d0516b3a4eb538fa4ec8fc1d1c68d5d1158740a11992025a2451495",
} as const;

export const VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_RECORD_V1 = {
  marker: VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_V1,
  version: 1,
  status: "repository_candidate_bound_held_on_apply_and_activation",
  reviewed_base_commit_sha: "0d74919b31790a1f14025924343176c286ab5549",
  reviewed_base_tree_sha: "1a5693604212f48e1cc41889abce7fe2c9d7900b",
  evidence: {
    frozen_mainnet0_deployment_path: "ops/mainnet/void-mainnet.deployed.json",
    frozen_mainnet0_deployment_git_blob_sha:
      "801271629ddc76aad016aea7114960f9d500b94b",
    premine_reconciliation_path:
      "ops/mainnet/mainnet0-premine-allocation.current.json",
    premine_reconciliation_git_blob_sha:
      "df8b2939108e9066f577263e05958445fe06cfcf",
    credential_binding_source_path:
      "src/economic/buy_void_erc20_production_credential_binding_evidence_v1.ts",
    credential_binding_evidence_id_sha256:
      "20b5201b7d0516b3a4eb538fa4ec8fc1d1c68d5d1158740a11992025a2451495",
  },
  candidate: VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_V1,
  expected: {
    normalized_void_token_address:
      "0x470075b85352eb86f7d089fb9ba88945f12aad94",
    normalized_fulfillment_wallet_address:
      "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
    rpc_url_fingerprint_sha256:
      "856a41e68ffe7136b6474cf092d3696a2619347734279f3e19c2047d8e986ba2",
    planner_policy_fingerprint_sha256:
      "45902d888077b61b75d00164f5e98053ad5a32a0569d848ba680e72c03208846",
    configuration_fingerprint_sha256:
      "9891cc703bd724541ace341561e3194bf356d5ac8af9d767acf7189e03174992",
  },
  repository_candidate_binding_ready: true,
  production_configuration_applied: false,
  runtime_activation_authorized: false,
  dependency_injection_activation_authorized: false,
  inventory_funding_authorized: false,
  authority:
    VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_AUTHORITY_V1,
} as const;

export type BuyVoidErc20ProductionConfigurationCandidateProvenanceV1 = Readonly<{
  reviewed_base_commit_sha: string;
  reviewed_base_tree_sha: string;
  frozen_mainnet0_deployment_git_blob_sha: string;
  premine_reconciliation_git_blob_sha: string;
}>;

export const VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_RECORDED_PROVENANCE_V1: BuyVoidErc20ProductionConfigurationCandidateProvenanceV1 = {
  reviewed_base_commit_sha:
    VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_RECORD_V1
      .reviewed_base_commit_sha,
  reviewed_base_tree_sha:
    VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_RECORD_V1
      .reviewed_base_tree_sha,
  frozen_mainnet0_deployment_git_blob_sha:
    VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_RECORD_V1
      .evidence.frozen_mainnet0_deployment_git_blob_sha,
  premine_reconciliation_git_blob_sha:
    VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_RECORD_V1
      .evidence.premine_reconciliation_git_blob_sha,
};

const GIT_SHA1 = /^[0-9a-f]{40}$/;

export function verifyBuyVoidErc20ProductionConfigurationCandidateProvenanceV1(
  recorded: Readonly<BuyVoidErc20ProductionConfigurationCandidateProvenanceV1>,
  observed: Readonly<BuyVoidErc20ProductionConfigurationCandidateProvenanceV1>,
): { ok: true } | { ok: false; reason: string } {
  for (const value of [...Object.values(recorded), ...Object.values(observed)]) {
    if (!GIT_SHA1.test(value)) {
      return { ok: false, reason: "candidate_binding_provenance_shape_invalid" };
    }
  }
  if (recorded.reviewed_base_commit_sha !== observed.reviewed_base_commit_sha) {
    return { ok: false, reason: "candidate_binding_reviewed_base_commit_mismatch" };
  }
  if (recorded.reviewed_base_tree_sha !== observed.reviewed_base_tree_sha) {
    return { ok: false, reason: "candidate_binding_reviewed_base_tree_mismatch" };
  }
  if (
    recorded.frozen_mainnet0_deployment_git_blob_sha !==
    observed.frozen_mainnet0_deployment_git_blob_sha
  ) {
    return { ok: false, reason: "candidate_binding_frozen_deployment_blob_mismatch" };
  }
  if (
    recorded.premine_reconciliation_git_blob_sha !==
    observed.premine_reconciliation_git_blob_sha
  ) {
    return { ok: false, reason: "candidate_binding_premine_reconciliation_blob_mismatch" };
  }
  return { ok: true };
}

function held(reason: string) {
  const binding =
    VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_RECORD_V1;
  return {
    ok: false as const,
    status: "held" as const,
    reason,
    repository_candidate_binding_ready: false as const,
    production_configuration_applied: false as const,
    runtime_activation_authorized: false as const,
    dependency_injection_activation_authorized: false as const,
    inventory_funding_authorized: false as const,
    authority: binding.authority,
  };
}

export function verifyBuyVoidErc20ProductionConfigurationCandidateBindingV1(
  observedProvenance: Readonly<BuyVoidErc20ProductionConfigurationCandidateProvenanceV1>,
) {
  const binding =
    VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_RECORD_V1;
  const provenance =
    verifyBuyVoidErc20ProductionConfigurationCandidateProvenanceV1(
      VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_RECORDED_PROVENANCE_V1,
      observedProvenance,
    );
  if (provenance.ok === false) return held(provenance.reason);

  const decision = verifyBuyVoidErc20ProductionConfigurationV1(binding.candidate);
  if (decision.ok === false) return held(`candidate_verifier_held:${decision.reason}`);

  if (
    decision.configuration_fingerprint_sha256 !==
      binding.expected.configuration_fingerprint_sha256 ||
    decision.planner_policy_fingerprint_sha256 !==
      binding.expected.planner_policy_fingerprint_sha256 ||
    decision.rpc_url_fingerprint_sha256 !==
      binding.expected.rpc_url_fingerprint_sha256 ||
    decision.void_token_address !==
      binding.expected.normalized_void_token_address ||
    decision.fulfillment_wallet_address !==
      binding.expected.normalized_fulfillment_wallet_address
  ) {
    return held("candidate_binding_fingerprint_or_identity_mismatch");
  }

  return {
    ok: true as const,
    status: "candidate_binding_verified_held_on_apply_and_activation" as const,
    marker: binding.marker,
    version: binding.version,
    configuration_fingerprint_sha256:
      decision.configuration_fingerprint_sha256,
    planner_policy_fingerprint_sha256:
      decision.planner_policy_fingerprint_sha256,
    rpc_url_fingerprint_sha256: decision.rpc_url_fingerprint_sha256,
    void_token_address: decision.void_token_address,
    fulfillment_wallet_address: decision.fulfillment_wallet_address,
    reviewed_base_commit_sha: observedProvenance.reviewed_base_commit_sha,
    reviewed_base_tree_sha: observedProvenance.reviewed_base_tree_sha,
    frozen_mainnet0_deployment_git_blob_sha:
      observedProvenance.frozen_mainnet0_deployment_git_blob_sha,
    premine_reconciliation_git_blob_sha:
      observedProvenance.premine_reconciliation_git_blob_sha,
    repository_candidate_binding_ready: true as const,
    production_configuration_applied: false as const,
    runtime_activation_authorized: false as const,
    dependency_injection_activation_authorized: false as const,
    inventory_funding_authorized: false as const,
    next_gate: "parent_activation_truth_promotion_after_candidate_review" as const,
    authority: binding.authority,
  };
}
