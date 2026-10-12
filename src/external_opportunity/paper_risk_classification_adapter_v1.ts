import { createHash } from "node:crypto";

import {
  VOID_EXTERNAL_OPPORTUNITY_PROVIDER_RISK_REGISTRY_V1,
  evaluateExternalOpportunityProviderRiskV1,
  type ExternalOpportunityProviderRiskRegistryV1,
  type ExternalOpportunityRiskDecisionV1,
  type ExternalOpportunityRiskObservationV1,
} from "./provider_risk_registry_v1.js";

export const VOID_EXTERNAL_OPPORTUNITY_PAPER_RISK_CLASSIFICATION_ADAPTER_V1 =
  "VOID_EXTERNAL_OPPORTUNITY_PAPER_RISK_CLASSIFICATION_ADAPTER_V1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_SANITIZED_PAPER_OBSERVATION_SCHEMA_V1 =
  "void-external-opportunity-sanitized-paper-observation-v1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_PAPER_RISK_CLASSIFICATION_SCHEMA_V1 =
  "void-external-opportunity-paper-risk-classification-v1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_PAPER_RISK_CLASSIFICATION_AUTHORITY_V1 =
  Object.freeze({
    filesystem_read: false,
    filesystem_write: false,
    network_request: false,
    credential_access: false,
    wallet_or_key_access: false,
    transaction_construction: false,
    transaction_submission: false,
    runtime_mutation: false,
    service_mutation: false,
    scheduler_mutation: false,
    live_execution: false,
  }) as Readonly<ExternalOpportunityPaperRiskClassificationAuthorityV1>;

export interface ExternalOpportunityPaperRiskClassificationAuthorityV1 {
  filesystem_read: false;
  filesystem_write: false;
  network_request: false;
  credential_access: false;
  wallet_or_key_access: false;
  transaction_construction: false;
  transaction_submission: false;
  runtime_mutation: false;
  service_mutation: false;
  scheduler_mutation: false;
  live_execution: false;
}

export interface ExternalOpportunityPaperObservationSourceFlagsV1 {
  credential_access_performed: boolean;
  authenticated_get_performed: boolean;
  credential_retention: false;
  raw_response_retention: false;
  transaction_payload_retention: false;
  network_mutation_performed: false;
  wallet_or_key_access_performed: false;
  transaction_construction_performed: false;
  transaction_submission_performed: false;
  live_execution_authorized: false;
  execution_authorized: false;
}

export interface ExternalOpportunitySanitizedPaperObservationV1 {
  schema:
    typeof VOID_EXTERNAL_OPPORTUNITY_SANITIZED_PAPER_OBSERVATION_SCHEMA_V1;
  marker:
    typeof VOID_EXTERNAL_OPPORTUNITY_PAPER_RISK_CLASSIFICATION_ADAPTER_V1;
  provider_id: string;
  phase: "paper_only";
  status: "recorded";
  api_origin: string;
  source_chain_id: number;
  destination_chain_id: number;
  input_token_address: string;
  output_token_address: string;
  quote_id: string;
  opportunity_id: string;
  source_record_sha256: string;
  observed_at: string;
  quote_age_ms: number;
  notional_usd: number;
  gross_revenue_usd: number;
  protocol_fee_usd: number;
  gas_cost_usd: number;
  slippage_bps: number;
  daily_notional_before_usd: number;
  daily_loss_before_usd: number;
  record_append_status: "appended";
  duplicate_fields: string[];
  recovered_pending: false;
  source_flags: ExternalOpportunityPaperObservationSourceFlagsV1;
}

export type ExternalOpportunityPaperRiskClassificationStatusV1 =
  | "classified_paper_positive"
  | "classified_paper_negative"
  | "risk_held"
  | "source_held";

export interface ExternalOpportunityPaperRiskClassificationV1 {
  schema:
    typeof VOID_EXTERNAL_OPPORTUNITY_PAPER_RISK_CLASSIFICATION_SCHEMA_V1;
  marker:
    typeof VOID_EXTERNAL_OPPORTUNITY_PAPER_RISK_CLASSIFICATION_ADAPTER_V1;
  version: 1;
  classification_id: string;
  status: ExternalOpportunityPaperRiskClassificationStatusV1;
  provider_id: string;
  quote_id: string;
  opportunity_id: string;
  source_record_sha256: string;
  source_validation_status: "accepted" | "held";
  source_validation_reasons: string[];
  normalized_observation: ExternalOpportunityRiskObservationV1 | null;
  risk_registry_marker:
    typeof VOID_EXTERNAL_OPPORTUNITY_PROVIDER_RISK_REGISTRY_V1;
  risk_decision: ExternalOpportunityRiskDecisionV1 | null;
  classification_append_authorized: boolean;
  paper_positive: boolean;
  paper_negative: boolean;
  held: boolean;
  sanitized_output: true;
  credential_value_present: false;
  raw_response_present: false;
  transaction_payload_present: false;
  filesystem_read_performed: false;
  filesystem_write_performed: false;
  network_request_performed: false;
  credential_access_performed: false;
  wallet_or_key_access_performed: false;
  transaction_construction_performed: false;
  transaction_submission_performed: false;
  runtime_mutation_performed: false;
  service_mutation_performed: false;
  scheduler_mutation_performed: false;
  live_execution_authorized: false;
  execution_authorized: false;
}

type JsonRecordV1 = Record<string, unknown>;

const SAFE_IDENTIFIER_V1 = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const SAFE_PROVIDER_ID_V1 = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const SHA256_V1 = /^[0-9a-f]{64}$/;
const EVM_ADDRESS_V1 = /^0x[0-9a-fA-F]{40}$/;
const HTTPS_ORIGIN_V1 = /^https:\/\/[A-Za-z0-9.-]+(?::[0-9]{1,5})?(?:\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*)?$/;

const FORBIDDEN_INPUT_KEYS_V1 = new Set([
  "api_key",
  "authorization",
  "bearer_token",
  "credential_value",
  "mnemonic",
  "private_key",
  "raw_response",
  "raw_transaction",
  "seed_phrase",
  "signed_transaction",
  "transaction_payload",
]);

function isRecordV1(value: unknown): value is JsonRecordV1 {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

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
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function safeStringV1(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeIdentifierV1(value: unknown): string {
  const candidate = safeStringV1(value);
  return SAFE_IDENTIFIER_V1.test(candidate) ? candidate : "";
}

function safeProviderIdV1(value: unknown): string {
  const candidate = safeStringV1(value);
  return SAFE_PROVIDER_ID_V1.test(candidate) ? candidate : "";
}

function safeSha256V1(value: unknown): string {
  const candidate = safeStringV1(value).toLowerCase();
  return SHA256_V1.test(candidate) ? candidate : "";
}

function uniqueSortedV1(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function canonicalValueV1(value: unknown): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (Array.isArray(value)) {
    return value.map(canonicalValueV1);
  }

  if (isRecordV1(value)) {
    const normalized: JsonRecordV1 = {};
    for (const key of Object.keys(value).sort()) {
      normalized[key] = canonicalValueV1(value[key]);
    }
    return normalized;
  }

  return null;
}

function canonicalJsonV1(value: unknown): string {
  return JSON.stringify(canonicalValueV1(value));
}

function classificationIdV1(value: unknown): string {
  return createHash("sha256").update(canonicalJsonV1(value)).digest("hex");
}

function forbiddenKeyPathsV1(
  value: unknown,
  path = "$",
  output: string[] = [],
): string[] {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      forbiddenKeyPathsV1(value[index], `${path}[${index}]`, output);
    }
    return output;
  }

  if (!isRecordV1(value)) return output;

  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (FORBIDDEN_INPUT_KEYS_V1.has(key.toLowerCase())) {
      output.push(childPath);
    }
    forbiddenKeyPathsV1(child, childPath, output);
  }
  return output;
}

function sourceValidationReasonsV1(input: unknown): string[] {
  const reasons: string[] = [];

  if (!isRecordV1(input)) return ["source_not_object"];

  for (const path of forbiddenKeyPathsV1(input)) {
    reasons.push(`forbidden_input_key:${path}`);
  }

  if (
    input.schema !==
    VOID_EXTERNAL_OPPORTUNITY_SANITIZED_PAPER_OBSERVATION_SCHEMA_V1
  ) {
    reasons.push("source_schema_mismatch");
  }

  if (
    input.marker !==
    VOID_EXTERNAL_OPPORTUNITY_PAPER_RISK_CLASSIFICATION_ADAPTER_V1
  ) {
    reasons.push("source_marker_mismatch");
  }

  if (!SAFE_PROVIDER_ID_V1.test(safeStringV1(input.provider_id))) {
    reasons.push("provider_id_invalid");
  }

  if (input.phase !== "paper_only") reasons.push("phase_must_be_paper_only");
  if (input.status !== "recorded") reasons.push("status_must_be_recorded");

  const origin = safeStringV1(input.api_origin);
  if (
    !HTTPS_ORIGIN_V1.test(origin) ||
    origin.includes("?") ||
    origin.includes("#")
  ) {
    reasons.push("api_origin_invalid");
  }

  if (!positiveIntegerV1(input.source_chain_id)) {
    reasons.push("source_chain_id_invalid");
  }

  if (!positiveIntegerV1(input.destination_chain_id)) {
    reasons.push("destination_chain_id_invalid");
  }

  if (!EVM_ADDRESS_V1.test(safeStringV1(input.input_token_address))) {
    reasons.push("input_token_address_invalid");
  }

  if (!EVM_ADDRESS_V1.test(safeStringV1(input.output_token_address))) {
    reasons.push("output_token_address_invalid");
  }

  if (!SAFE_IDENTIFIER_V1.test(safeStringV1(input.quote_id))) {
    reasons.push("quote_id_invalid");
  }

  if (!SAFE_IDENTIFIER_V1.test(safeStringV1(input.opportunity_id))) {
    reasons.push("opportunity_id_invalid");
  }

  if (!SHA256_V1.test(safeStringV1(input.source_record_sha256))) {
    reasons.push("source_record_sha256_invalid");
  }

  const observedAt = safeStringV1(input.observed_at);
  if (!observedAt || !Number.isFinite(Date.parse(observedAt))) {
    reasons.push("observed_at_invalid");
  }

  if (!nonNegativeFiniteV1(input.quote_age_ms)) {
    reasons.push("quote_age_ms_invalid");
  }

  if (!positiveFiniteV1(input.notional_usd)) {
    reasons.push("notional_usd_invalid");
  }

  for (const field of [
    "gross_revenue_usd",
    "protocol_fee_usd",
    "gas_cost_usd",
    "slippage_bps",
    "daily_notional_before_usd",
    "daily_loss_before_usd",
  ] as const) {
    if (!nonNegativeFiniteV1(input[field])) {
      reasons.push(`${field}_invalid`);
    }
  }

  if (input.record_append_status !== "appended") {
    reasons.push("record_append_status_invalid");
  }

  if (!Array.isArray(input.duplicate_fields)) {
    reasons.push("duplicate_fields_invalid");
  } else if (input.duplicate_fields.length !== 0) {
    reasons.push("duplicate_fields_not_empty");
  }

  if (input.recovered_pending !== false) {
    reasons.push("recovered_pending_must_be_false");
  }

  const flags = input.source_flags;
  if (!isRecordV1(flags)) {
    reasons.push("source_flags_invalid");
  } else {
    for (const field of [
      "credential_access_performed",
      "authenticated_get_performed",
    ] as const) {
      if (typeof flags[field] !== "boolean") {
        reasons.push(`source_flags_${field}_invalid`);
      }
    }

    for (const field of [
      "credential_retention",
      "raw_response_retention",
      "transaction_payload_retention",
      "network_mutation_performed",
      "wallet_or_key_access_performed",
      "transaction_construction_performed",
      "transaction_submission_performed",
      "live_execution_authorized",
      "execution_authorized",
    ] as const) {
      if (flags[field] !== false) {
        reasons.push(`source_flags_${field}_must_be_false`);
      }
    }
  }

  return uniqueSortedV1(reasons);
}

function normalizedObservationV1(
  input: JsonRecordV1,
): ExternalOpportunityRiskObservationV1 {
  return {
    provider_id: safeProviderIdV1(input.provider_id),
    phase: "paper_only",
    api_origin: safeStringV1(input.api_origin).replace(/\/+$/, ""),
    source_chain_id: Number(input.source_chain_id),
    destination_chain_id: Number(input.destination_chain_id),
    input_token_address: safeStringV1(input.input_token_address),
    output_token_address: safeStringV1(input.output_token_address),
    quote_age_ms: Number(input.quote_age_ms),
    notional_usd: Number(input.notional_usd),
    gross_revenue_usd: Number(input.gross_revenue_usd),
    protocol_fee_usd: Number(input.protocol_fee_usd),
    gas_cost_usd: Number(input.gas_cost_usd),
    slippage_bps: Number(input.slippage_bps),
    daily_notional_before_usd: Number(input.daily_notional_before_usd),
    daily_loss_before_usd: Number(input.daily_loss_before_usd),
    simulation_status: "not_run",
    operator_approved: false,
  };
}

function baseOutputV1(
  input: unknown,
  sourceReasons: string[],
  normalized: ExternalOpportunityRiskObservationV1 | null,
  riskDecision: ExternalOpportunityRiskDecisionV1 | null,
): ExternalOpportunityPaperRiskClassificationV1 {
  const record = isRecordV1(input) ? input : {};
  const providerId = safeProviderIdV1(record.provider_id);
  const quoteId = safeIdentifierV1(record.quote_id);
  const opportunityId = safeIdentifierV1(record.opportunity_id);
  const sourceRecordSha256 = safeSha256V1(record.source_record_sha256);
  const sourceAccepted = sourceReasons.length === 0;

  let status: ExternalOpportunityPaperRiskClassificationStatusV1 =
    "source_held";
  if (sourceAccepted && riskDecision) {
    if (riskDecision.status === "recordable_paper_positive") {
      status = "classified_paper_positive";
    } else if (riskDecision.status === "recordable_paper_negative") {
      status = "classified_paper_negative";
    } else {
      status = "risk_held";
    }
  }

  const classificationAppendAuthorized =
    sourceAccepted &&
    Boolean(riskDecision?.quote_record_authorized) &&
    (
      status === "classified_paper_positive" ||
      status === "classified_paper_negative"
    );

  const classificationId = classificationIdV1({
    adapter:
      VOID_EXTERNAL_OPPORTUNITY_PAPER_RISK_CLASSIFICATION_ADAPTER_V1,
    provider_id: providerId,
    quote_id: quoteId,
    opportunity_id: opportunityId,
    source_record_sha256: sourceRecordSha256,
    source_validation_reasons: sourceReasons,
    normalized_observation: normalized,
    risk_decision: riskDecision,
    status,
  });

  return {
    schema:
      VOID_EXTERNAL_OPPORTUNITY_PAPER_RISK_CLASSIFICATION_SCHEMA_V1,
    marker:
      VOID_EXTERNAL_OPPORTUNITY_PAPER_RISK_CLASSIFICATION_ADAPTER_V1,
    version: 1,
    classification_id: classificationId,
    status,
    provider_id: providerId,
    quote_id: quoteId,
    opportunity_id: opportunityId,
    source_record_sha256: sourceRecordSha256,
    source_validation_status: sourceAccepted ? "accepted" : "held",
    source_validation_reasons: sourceReasons,
    normalized_observation: normalized,
    risk_registry_marker:
      VOID_EXTERNAL_OPPORTUNITY_PROVIDER_RISK_REGISTRY_V1,
    risk_decision: riskDecision,
    classification_append_authorized: classificationAppendAuthorized,
    paper_positive: status === "classified_paper_positive",
    paper_negative: status === "classified_paper_negative",
    held: status === "source_held" || status === "risk_held",
    sanitized_output: true,
    credential_value_present: false,
    raw_response_present: false,
    transaction_payload_present: false,
    filesystem_read_performed: false,
    filesystem_write_performed: false,
    network_request_performed: false,
    credential_access_performed: false,
    wallet_or_key_access_performed: false,
    transaction_construction_performed: false,
    transaction_submission_performed: false,
    runtime_mutation_performed: false,
    service_mutation_performed: false,
    scheduler_mutation_performed: false,
    live_execution_authorized: false,
    execution_authorized: false,
  };
}

export function classifyExternalOpportunityPaperObservationV1(
  registry: ExternalOpportunityProviderRiskRegistryV1,
  input: unknown,
): ExternalOpportunityPaperRiskClassificationV1 {
  const sourceReasons = sourceValidationReasonsV1(input);
  if (sourceReasons.length > 0 || !isRecordV1(input)) {
    return baseOutputV1(input, sourceReasons, null, null);
  }

  const normalized = normalizedObservationV1(input);
  const riskDecision = evaluateExternalOpportunityProviderRiskV1(
    registry,
    normalized,
  );

  return baseOutputV1(input, [], normalized, riskDecision);
}

export function validateExternalOpportunitySanitizedPaperObservationV1(
  input: unknown,
): { ok: boolean; reasons: string[] } {
  const reasons = sourceValidationReasonsV1(input);
  return { ok: reasons.length === 0, reasons };
}
