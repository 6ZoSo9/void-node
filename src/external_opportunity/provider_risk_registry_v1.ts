export const VOID_EXTERNAL_OPPORTUNITY_PROVIDER_RISK_REGISTRY_V1 =
  "VOID_EXTERNAL_OPPORTUNITY_PROVIDER_RISK_REGISTRY_V1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_PROVIDER_RISK_REGISTRY_SCHEMA_V1 =
  "void-external-opportunity-provider-risk-registry-v1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_PROVIDER_RISK_REGISTRY_AUTHORITY_V1 =
  Object.freeze({
    live_execution: false,
    wallet_or_key_access: false,
    transaction_construction: false,
    transaction_submission: false,
    network_mutation: false,
    service_mutation: false,
    credential_storage: false,
    automatic_operator_approval: false,
  }) as Readonly<ExternalOpportunityProviderRiskRegistryAuthorityV1>;

export type ExternalOpportunityProviderRiskRegistryPhaseV1 = "paper_only";
export type ExternalOpportunityProviderStatusV1 = "allowed" | "blocked";
export type ExternalOpportunityContractKindV1 =
  | "spoke_pool"
  | "router"
  | "settlement"
  | "token"
  | "other";

export interface ExternalOpportunityProviderRiskRegistryAuthorityV1 {
  live_execution: false;
  wallet_or_key_access: false;
  transaction_construction: false;
  transaction_submission: false;
  network_mutation: false;
  service_mutation: false;
  credential_storage: false;
  automatic_operator_approval: false;
}

export interface ExternalOpportunityTokenAllowlistEntryV1 {
  chain_id: number;
  symbol: string;
  address: string;
}

export interface ExternalOpportunityContractAllowlistEntryV1 {
  chain_id: number;
  kind: ExternalOpportunityContractKindV1;
  address: string;
  label: string;
}

export interface ExternalOpportunityRiskPolicyV1 {
  max_quote_age_ms: number;
  max_notional_usd: number;
  max_daily_notional_usd: number;
  max_protocol_fee_bps: number;
  max_gas_cost_usd: number;
  max_slippage_bps: number;
  min_net_profit_usd: number;
  min_net_profit_margin_bps: number;
  max_loss_per_opportunity_usd: number;
  max_daily_loss_usd: number;
  simulation_required_for_live: true;
  operator_approval_required_for_live: true;
  contract_allowlist_required_for_live: true;
}

export interface ExternalOpportunityProviderRiskEntryV1 {
  provider_id: string;
  display_name: string;
  status: ExternalOpportunityProviderStatusV1;
  allowed_api_origins: string[];
  source_chain_ids: number[];
  destination_chain_ids: number[];
  token_allowlist: ExternalOpportunityTokenAllowlistEntryV1[];
  contract_allowlist: ExternalOpportunityContractAllowlistEntryV1[];
  policy: ExternalOpportunityRiskPolicyV1;
}

export interface ExternalOpportunityProviderRiskRegistryV1 {
  schema: typeof VOID_EXTERNAL_OPPORTUNITY_PROVIDER_RISK_REGISTRY_SCHEMA_V1;
  marker: typeof VOID_EXTERNAL_OPPORTUNITY_PROVIDER_RISK_REGISTRY_V1;
  revision: 1;
  phase: ExternalOpportunityProviderRiskRegistryPhaseV1;
  live_execution_enabled: false;
  authority: ExternalOpportunityProviderRiskRegistryAuthorityV1;
  providers: ExternalOpportunityProviderRiskEntryV1[];
}

export interface ExternalOpportunityRiskObservationV1 {
  provider_id: string;
  phase: "paper_only" | "live_candidate";
  api_origin: string;
  source_chain_id: number;
  destination_chain_id: number;
  input_token_address: string;
  output_token_address: string;
  execution_contract_address?: string;
  quote_age_ms: number;
  notional_usd: number;
  gross_revenue_usd: number;
  protocol_fee_usd: number;
  gas_cost_usd: number;
  slippage_bps: number;
  daily_notional_before_usd: number;
  daily_loss_before_usd: number;
  simulation_status: "passed" | "failed" | "not_run";
  operator_approved: boolean;
}

export type ExternalOpportunityRiskDecisionStatusV1 =
  | "recordable_paper_positive"
  | "recordable_paper_negative"
  | "held"
  | "live_candidate_blocked";

export interface ExternalOpportunityRiskDecisionMetricsV1 {
  protocol_fee_bps: number;
  estimated_slippage_cost_usd: number;
  total_cost_usd: number;
  net_profit_usd: number;
  net_profit_margin_bps: number;
  projected_loss_usd: number;
  projected_daily_notional_usd: number;
  projected_daily_loss_usd: number;
}

export interface ExternalOpportunityRiskDecisionV1 {
  schema: "void-external-opportunity-risk-decision-v1";
  marker: typeof VOID_EXTERNAL_OPPORTUNITY_PROVIDER_RISK_REGISTRY_V1;
  status: ExternalOpportunityRiskDecisionStatusV1;
  provider_id: string;
  reasons: string[];
  metrics: ExternalOpportunityRiskDecisionMetricsV1;
  quote_record_authorized: boolean;
  live_execution_authorized: false;
  wallet_or_key_access_authorized: false;
  transaction_construction_authorized: false;
  transaction_submission_authorized: false;
}

export interface ExternalOpportunityRegistryValidationV1 {
  ok: boolean;
  errors: string[];
}

const EVM_ADDRESS_V1 = /^0x[0-9a-fA-F]{40}$/;
const IDENTIFIER_V1 = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const HTTPS_ORIGIN_V1 = /^https:\/\/[A-Za-z0-9.-]+(?::[0-9]{1,5})?(?:\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*)?$/;

function finiteNumberV1(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function nonNegativeFiniteV1(value: unknown): value is number {
  return finiteNumberV1(value) && value >= 0;
}

function positiveFiniteV1(value: unknown): value is number {
  return finiteNumberV1(value) && value > 0;
}

function positiveIntegerV1(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value > 0;
}

function roundedV1(value: number, digits = 12): number {
  if (!Number.isFinite(value)) return 0;
  const scale = 10 ** digits;
  return Math.round((value + Number.EPSILON) * scale) / scale;
}

function normalizedAddressV1(value: string): string {
  return value.toLowerCase();
}

function duplicateValuesV1(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function authorityExactFalseV1(
  authority: ExternalOpportunityProviderRiskRegistryAuthorityV1,
): boolean {
  return (
    authority.live_execution === false &&
    authority.wallet_or_key_access === false &&
    authority.transaction_construction === false &&
    authority.transaction_submission === false &&
    authority.network_mutation === false &&
    authority.service_mutation === false &&
    authority.credential_storage === false &&
    authority.automatic_operator_approval === false
  );
}

export function validateExternalOpportunityProviderRiskRegistryV1(
  registry: ExternalOpportunityProviderRiskRegistryV1,
): ExternalOpportunityRegistryValidationV1 {
  const errors: string[] = [];

  if (registry.schema !== VOID_EXTERNAL_OPPORTUNITY_PROVIDER_RISK_REGISTRY_SCHEMA_V1) {
    errors.push("registry_schema_mismatch");
  }
  if (registry.marker !== VOID_EXTERNAL_OPPORTUNITY_PROVIDER_RISK_REGISTRY_V1) {
    errors.push("registry_marker_mismatch");
  }
  if (registry.revision !== 1) errors.push("registry_revision_mismatch");
  if (registry.phase !== "paper_only") errors.push("registry_phase_must_be_paper_only");
  if (registry.live_execution_enabled !== false) {
    errors.push("registry_live_execution_must_be_false");
  }
  if (!authorityExactFalseV1(registry.authority)) {
    errors.push("registry_authority_must_be_exact_false");
  }
  if (!Array.isArray(registry.providers) || registry.providers.length === 0) {
    errors.push("registry_provider_list_empty");
  }

  const providerIds: string[] = [];
  for (const provider of registry.providers || []) {
    providerIds.push(provider.provider_id);

    if (!IDENTIFIER_V1.test(provider.provider_id)) {
      errors.push(`provider_id_invalid:${provider.provider_id}`);
    }
    if (typeof provider.display_name !== "string" || provider.display_name.trim() === "") {
      errors.push(`provider_display_name_invalid:${provider.provider_id}`);
    }
    if (provider.status !== "allowed" && provider.status !== "blocked") {
      errors.push(`provider_status_invalid:${provider.provider_id}`);
    }

    if (
      !Array.isArray(provider.allowed_api_origins) ||
      provider.allowed_api_origins.length === 0
    ) {
      errors.push(`provider_api_origin_list_empty:${provider.provider_id}`);
    } else {
      const normalizedOrigins = provider.allowed_api_origins.map((value) =>
        String(value).replace(/\/+$/, ""),
      );
      for (const origin of provider.allowed_api_origins) {
        if (!HTTPS_ORIGIN_V1.test(origin) || origin.includes("?") || origin.includes("#")) {
          errors.push(`provider_api_origin_invalid:${provider.provider_id}:${origin}`);
        }
      }
      for (const duplicate of duplicateValuesV1(normalizedOrigins)) {
        errors.push(`provider_api_origin_duplicate:${provider.provider_id}:${duplicate}`);
      }
    }

    for (const [name, chainIds] of [
      ["source", provider.source_chain_ids],
      ["destination", provider.destination_chain_ids],
    ] as const) {
      if (!Array.isArray(chainIds) || chainIds.length === 0) {
        errors.push(`provider_${name}_chain_list_empty:${provider.provider_id}`);
      } else {
        const normalized = chainIds.map(String);
        for (const chainId of chainIds) {
          if (!positiveIntegerV1(chainId)) {
            errors.push(
              `provider_${name}_chain_id_invalid:${provider.provider_id}:${String(chainId)}`,
            );
          }
        }
        for (const duplicate of duplicateValuesV1(normalized)) {
          errors.push(
            `provider_${name}_chain_id_duplicate:${provider.provider_id}:${duplicate}`,
          );
        }
      }
    }

    if (!Array.isArray(provider.token_allowlist) || provider.token_allowlist.length === 0) {
      errors.push(`provider_token_allowlist_empty:${provider.provider_id}`);
    } else {
      const tokenKeys: string[] = [];
      for (const token of provider.token_allowlist) {
        if (!positiveIntegerV1(token.chain_id)) {
          errors.push(
            `provider_token_chain_id_invalid:${provider.provider_id}:${String(token.chain_id)}`,
          );
        }
        if (typeof token.symbol !== "string" || token.symbol.trim() === "") {
          errors.push(`provider_token_symbol_invalid:${provider.provider_id}`);
        }
        if (!EVM_ADDRESS_V1.test(token.address)) {
          errors.push(
            `provider_token_address_invalid:${provider.provider_id}:${token.address}`,
          );
        } else {
          tokenKeys.push(`${token.chain_id}:${normalizedAddressV1(token.address)}`);
        }
      }
      for (const duplicate of duplicateValuesV1(tokenKeys)) {
        errors.push(`provider_token_duplicate:${provider.provider_id}:${duplicate}`);
      }
    }

    if (!Array.isArray(provider.contract_allowlist)) {
      errors.push(`provider_contract_allowlist_invalid:${provider.provider_id}`);
    } else {
      const contractKeys: string[] = [];
      for (const contract of provider.contract_allowlist) {
        if (!positiveIntegerV1(contract.chain_id)) {
          errors.push(
            `provider_contract_chain_id_invalid:${provider.provider_id}:${String(contract.chain_id)}`,
          );
        }
        if (!EVM_ADDRESS_V1.test(contract.address)) {
          errors.push(
            `provider_contract_address_invalid:${provider.provider_id}:${contract.address}`,
          );
        } else {
          contractKeys.push(
            `${contract.chain_id}:${normalizedAddressV1(contract.address)}`,
          );
        }
        if (
          !["spoke_pool", "router", "settlement", "token", "other"].includes(
            contract.kind,
          )
        ) {
          errors.push(`provider_contract_kind_invalid:${provider.provider_id}`);
        }
        if (typeof contract.label !== "string" || contract.label.trim() === "") {
          errors.push(`provider_contract_label_invalid:${provider.provider_id}`);
        }
      }
      for (const duplicate of duplicateValuesV1(contractKeys)) {
        errors.push(`provider_contract_duplicate:${provider.provider_id}:${duplicate}`);
      }
    }

    const policy = provider.policy;
    const numericPolicyFields: Array<
      [keyof ExternalOpportunityRiskPolicyV1, unknown]
    > = [
      ["max_quote_age_ms", policy.max_quote_age_ms],
      ["max_notional_usd", policy.max_notional_usd],
      ["max_daily_notional_usd", policy.max_daily_notional_usd],
      ["max_protocol_fee_bps", policy.max_protocol_fee_bps],
      ["max_gas_cost_usd", policy.max_gas_cost_usd],
      ["max_slippage_bps", policy.max_slippage_bps],
      ["min_net_profit_usd", policy.min_net_profit_usd],
      ["min_net_profit_margin_bps", policy.min_net_profit_margin_bps],
      ["max_loss_per_opportunity_usd", policy.max_loss_per_opportunity_usd],
      ["max_daily_loss_usd", policy.max_daily_loss_usd],
    ];

    for (const [field, value] of numericPolicyFields) {
      if (!nonNegativeFiniteV1(value)) {
        errors.push(`provider_policy_invalid:${provider.provider_id}:${String(field)}`);
      }
    }
    if (!positiveFiniteV1(policy.max_quote_age_ms)) {
      errors.push(`provider_policy_quote_age_not_positive:${provider.provider_id}`);
    }
    if (!positiveFiniteV1(policy.max_notional_usd)) {
      errors.push(`provider_policy_notional_not_positive:${provider.provider_id}`);
    }
    if (policy.max_daily_notional_usd < policy.max_notional_usd) {
      errors.push(`provider_policy_daily_notional_below_single:${provider.provider_id}`);
    }
    if (policy.max_daily_loss_usd < policy.max_loss_per_opportunity_usd) {
      errors.push(`provider_policy_daily_loss_below_single:${provider.provider_id}`);
    }
    if (policy.simulation_required_for_live !== true) {
      errors.push(`provider_policy_simulation_must_be_true:${provider.provider_id}`);
    }
    if (policy.operator_approval_required_for_live !== true) {
      errors.push(
        `provider_policy_operator_approval_must_be_true:${provider.provider_id}`,
      );
    }
    if (policy.contract_allowlist_required_for_live !== true) {
      errors.push(
        `provider_policy_contract_allowlist_must_be_true:${provider.provider_id}`,
      );
    }
  }

  for (const duplicate of duplicateValuesV1(providerIds)) {
    errors.push(`registry_provider_id_duplicate:${duplicate}`);
  }

  return { ok: errors.length === 0, errors };
}

function emptyMetricsV1(): ExternalOpportunityRiskDecisionMetricsV1 {
  return {
    protocol_fee_bps: 0,
    estimated_slippage_cost_usd: 0,
    total_cost_usd: 0,
    net_profit_usd: 0,
    net_profit_margin_bps: 0,
    projected_loss_usd: 0,
    projected_daily_notional_usd: 0,
    projected_daily_loss_usd: 0,
  };
}

function decisionV1(
  status: ExternalOpportunityRiskDecisionStatusV1,
  providerId: string,
  reasons: string[],
  metrics: ExternalOpportunityRiskDecisionMetricsV1,
  quoteRecordAuthorized: boolean,
): ExternalOpportunityRiskDecisionV1 {
  return {
    schema: "void-external-opportunity-risk-decision-v1",
    marker: VOID_EXTERNAL_OPPORTUNITY_PROVIDER_RISK_REGISTRY_V1,
    status,
    provider_id: providerId,
    reasons: [...new Set(reasons)].sort(),
    metrics,
    quote_record_authorized: quoteRecordAuthorized,
    live_execution_authorized: false,
    wallet_or_key_access_authorized: false,
    transaction_construction_authorized: false,
    transaction_submission_authorized: false,
  };
}

function tokenAllowedV1(
  provider: ExternalOpportunityProviderRiskEntryV1,
  chainId: number,
  address: string,
): boolean {
  if (!EVM_ADDRESS_V1.test(address)) return false;
  const normalized = normalizedAddressV1(address);
  return provider.token_allowlist.some(
    (entry) =>
      entry.chain_id === chainId &&
      normalizedAddressV1(entry.address) === normalized,
  );
}

function contractAllowedV1(
  provider: ExternalOpportunityProviderRiskEntryV1,
  chainId: number,
  address: string | undefined,
): boolean {
  if (!address || !EVM_ADDRESS_V1.test(address)) return false;
  const normalized = normalizedAddressV1(address);
  return provider.contract_allowlist.some(
    (entry) =>
      entry.chain_id === chainId &&
      normalizedAddressV1(entry.address) === normalized,
  );
}

function observationNumbersValidV1(
  observation: ExternalOpportunityRiskObservationV1,
): boolean {
  return (
    nonNegativeFiniteV1(observation.quote_age_ms) &&
    positiveFiniteV1(observation.notional_usd) &&
    nonNegativeFiniteV1(observation.gross_revenue_usd) &&
    nonNegativeFiniteV1(observation.protocol_fee_usd) &&
    nonNegativeFiniteV1(observation.gas_cost_usd) &&
    nonNegativeFiniteV1(observation.slippage_bps) &&
    nonNegativeFiniteV1(observation.daily_notional_before_usd) &&
    nonNegativeFiniteV1(observation.daily_loss_before_usd)
  );
}

export function evaluateExternalOpportunityProviderRiskV1(
  registry: ExternalOpportunityProviderRiskRegistryV1,
  observation: ExternalOpportunityRiskObservationV1,
): ExternalOpportunityRiskDecisionV1 {
  const validation = validateExternalOpportunityProviderRiskRegistryV1(registry);
  if (!validation.ok) {
    return decisionV1(
      "held",
      observation.provider_id,
      validation.errors.map((error) => `registry_invalid:${error}`),
      emptyMetricsV1(),
      false,
    );
  }

  const provider = registry.providers.find(
    (entry) => entry.provider_id === observation.provider_id,
  );
  if (!provider) {
    return decisionV1(
      "held",
      observation.provider_id,
      ["provider_not_registered"],
      emptyMetricsV1(),
      false,
    );
  }

  const trustReasons: string[] = [];
  const normalizedOrigin = observation.api_origin.replace(/\/+$/, "");

  if (provider.status !== "allowed") trustReasons.push("provider_blocked");
  if (
    !provider.allowed_api_origins.some(
      (origin) => origin.replace(/\/+$/, "") === normalizedOrigin,
    )
  ) {
    trustReasons.push("api_origin_not_allowed");
  }
  if (!provider.source_chain_ids.includes(observation.source_chain_id)) {
    trustReasons.push("source_chain_not_allowed");
  }
  if (!provider.destination_chain_ids.includes(observation.destination_chain_id)) {
    trustReasons.push("destination_chain_not_allowed");
  }
  if (
    !tokenAllowedV1(
      provider,
      observation.source_chain_id,
      observation.input_token_address,
    )
  ) {
    trustReasons.push("input_token_not_allowed");
  }
  if (
    !tokenAllowedV1(
      provider,
      observation.destination_chain_id,
      observation.output_token_address,
    )
  ) {
    trustReasons.push("output_token_not_allowed");
  }
  if (!observationNumbersValidV1(observation)) {
    trustReasons.push("observation_numeric_field_invalid");
  }

  if (trustReasons.length > 0) {
    return decisionV1(
      observation.phase === "live_candidate" ? "live_candidate_blocked" : "held",
      observation.provider_id,
      trustReasons,
      emptyMetricsV1(),
      false,
    );
  }

  const policy = provider.policy;
  const protocolFeeBps =
    observation.notional_usd > 0
      ? (observation.protocol_fee_usd / observation.notional_usd) * 10_000
      : 0;
  const estimatedSlippageCostUsd =
    observation.notional_usd * (observation.slippage_bps / 10_000);
  const totalCostUsd =
    observation.protocol_fee_usd +
    observation.gas_cost_usd +
    estimatedSlippageCostUsd;
  const netProfitUsd = observation.gross_revenue_usd - totalCostUsd;
  const netProfitMarginBps =
    observation.notional_usd > 0
      ? (netProfitUsd / observation.notional_usd) * 10_000
      : 0;
  const projectedLossUsd = Math.max(0, -netProfitUsd);
  const projectedDailyNotionalUsd =
    observation.daily_notional_before_usd + observation.notional_usd;
  const projectedDailyLossUsd =
    observation.daily_loss_before_usd + projectedLossUsd;

  const metrics: ExternalOpportunityRiskDecisionMetricsV1 = {
    protocol_fee_bps: roundedV1(protocolFeeBps),
    estimated_slippage_cost_usd: roundedV1(estimatedSlippageCostUsd),
    total_cost_usd: roundedV1(totalCostUsd),
    net_profit_usd: roundedV1(netProfitUsd),
    net_profit_margin_bps: roundedV1(netProfitMarginBps),
    projected_loss_usd: roundedV1(projectedLossUsd),
    projected_daily_notional_usd: roundedV1(projectedDailyNotionalUsd),
    projected_daily_loss_usd: roundedV1(projectedDailyLossUsd),
  };

  const policyReasons: string[] = [];
  if (observation.quote_age_ms > policy.max_quote_age_ms) {
    policyReasons.push("quote_too_old");
  }
  if (observation.notional_usd > policy.max_notional_usd) {
    policyReasons.push("notional_limit_exceeded");
  }
  if (metrics.projected_daily_notional_usd > policy.max_daily_notional_usd) {
    policyReasons.push("daily_notional_limit_exceeded");
  }
  if (metrics.protocol_fee_bps > policy.max_protocol_fee_bps) {
    policyReasons.push("protocol_fee_limit_exceeded");
  }
  if (observation.gas_cost_usd > policy.max_gas_cost_usd) {
    policyReasons.push("gas_cost_limit_exceeded");
  }
  if (observation.slippage_bps > policy.max_slippage_bps) {
    policyReasons.push("slippage_limit_exceeded");
  }
  if (metrics.net_profit_usd < policy.min_net_profit_usd) {
    policyReasons.push("minimum_net_profit_not_met");
  }
  if (metrics.net_profit_margin_bps < policy.min_net_profit_margin_bps) {
    policyReasons.push("minimum_net_profit_margin_not_met");
  }
  if (metrics.projected_loss_usd > policy.max_loss_per_opportunity_usd) {
    policyReasons.push("per_opportunity_loss_limit_exceeded");
  }
  if (metrics.projected_daily_loss_usd > policy.max_daily_loss_usd) {
    policyReasons.push("daily_loss_limit_exceeded");
  }

  if (observation.phase === "live_candidate") {
    const liveReasons = [...policyReasons, "live_execution_disabled_by_registry"];
    if (
      policy.simulation_required_for_live &&
      observation.simulation_status !== "passed"
    ) {
      liveReasons.push("required_simulation_not_passed");
    }
    if (
      policy.operator_approval_required_for_live &&
      observation.operator_approved !== true
    ) {
      liveReasons.push("operator_approval_missing");
    }
    if (
      policy.contract_allowlist_required_for_live &&
      !contractAllowedV1(
        provider,
        observation.source_chain_id,
        observation.execution_contract_address,
      )
    ) {
      liveReasons.push("execution_contract_not_allowed");
    }
    return decisionV1(
      "live_candidate_blocked",
      observation.provider_id,
      liveReasons,
      metrics,
      false,
    );
  }

  if (observation.quote_age_ms > policy.max_quote_age_ms) {
    return decisionV1(
      "held",
      observation.provider_id,
      policyReasons,
      metrics,
      false,
    );
  }

  if (policyReasons.length > 0) {
    return decisionV1(
      "recordable_paper_negative",
      observation.provider_id,
      policyReasons,
      metrics,
      true,
    );
  }

  return decisionV1(
    "recordable_paper_positive",
    observation.provider_id,
    [],
    metrics,
    true,
  );
}
