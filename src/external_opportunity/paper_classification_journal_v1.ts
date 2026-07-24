import { createHash } from "node:crypto";

import {
  VOID_EXTERNAL_OPPORTUNITY_PAPER_RISK_CLASSIFICATION_ADAPTER_V1,
  VOID_EXTERNAL_OPPORTUNITY_PAPER_RISK_CLASSIFICATION_SCHEMA_V1,
  type ExternalOpportunityPaperRiskClassificationV1,
} from "./paper_risk_classification_adapter_v1.js";

export const VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_V1 =
  "VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_V1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_ENTRY_SCHEMA_V1 =
  "void-external-opportunity-paper-classification-journal-entry-v1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_ID_V1 =
  "external-opportunity-paper-classifications-v1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_APPEND_CONFIRMATION_V1 =
  "appendPaperClassificationJournalV1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_AUTHORITY_V1 =
  Object.freeze({
    direct_filesystem_read: false,
    direct_filesystem_write: false,
    dependency_injected_append: true,
    network_request: false,
    credential_access: false,
    wallet_or_key_access: false,
    transaction_construction: false,
    transaction_submission: false,
    runtime_mutation: false,
    service_mutation: false,
    scheduler_mutation: false,
    live_execution: false,
  }) as Readonly<ExternalOpportunityPaperClassificationJournalAuthorityV1>;

export interface ExternalOpportunityPaperClassificationJournalAuthorityV1 {
  direct_filesystem_read: false;
  direct_filesystem_write: false;
  dependency_injected_append: true;
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

export type ExternalOpportunityPaperClassificationJournalStatusV1 =
  | "classified_paper_positive"
  | "classified_paper_negative"
  | "risk_held"
  | "source_held";

export interface ExternalOpportunityPaperClassificationJournalEntryV1 {
  schema:
    typeof VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_ENTRY_SCHEMA_V1;
  marker:
    typeof VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_V1;
  version: 1;
  journal_id:
    typeof VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_ID_V1;
  journal_date: string;
  recorded_at: string;
  classification_id: string;
  entry_fingerprint_sha256: string;
  source_record_sha256: string;
  provider_id: string;
  quote_id: string;
  opportunity_id: string;
  classification_status:
    ExternalOpportunityPaperClassificationJournalStatusV1;
  source_validation_status: "accepted" | "held";
  risk_decision_status:
    | "recordable_paper_positive"
    | "recordable_paper_negative"
    | "held"
    | "live_candidate_blocked"
    | "not_evaluated";
  reasons: string[];
  notional_usd: number;
  gross_revenue_usd: number;
  total_cost_usd: number;
  net_profit_usd: number;
  net_profit_margin_bps: number;
  projected_loss_usd: number;
  paper_positive: boolean;
  paper_negative: boolean;
  held: boolean;
  sanitized_output: true;
  credential_value_present: false;
  raw_response_present: false;
  transaction_payload_present: false;
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

export interface ExternalOpportunityPaperClassificationJournalPolicyV1 {
  allow_held_entries: boolean;
  max_existing_entries: number;
}

export interface ExternalOpportunityPaperClassificationJournalPlanInputV1 {
  classification: ExternalOpportunityPaperRiskClassificationV1;
  existing_entries: ExternalOpportunityPaperClassificationJournalEntryV1[];
  recorded_at: string;
  policy: ExternalOpportunityPaperClassificationJournalPolicyV1;
}

export type ExternalOpportunityPaperClassificationJournalPlanV1 =
  | {
      schema: "void-external-opportunity-paper-classification-journal-plan-v1";
      marker:
        typeof VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_V1;
      status: "ready";
      append_authorized: true;
      duplicate: false;
      reasons: [];
      entry: ExternalOpportunityPaperClassificationJournalEntryV1;
      direct_filesystem_read_authorized: false;
      direct_filesystem_write_authorized: false;
      dependency_injected_append_authorized: true;
      live_execution_authorized: false;
    }
  | {
      schema: "void-external-opportunity-paper-classification-journal-plan-v1";
      marker:
        typeof VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_V1;
      status: "duplicate";
      append_authorized: false;
      duplicate: true;
      reasons: ["classification_already_recorded"];
      entry: ExternalOpportunityPaperClassificationJournalEntryV1;
      direct_filesystem_read_authorized: false;
      direct_filesystem_write_authorized: false;
      dependency_injected_append_authorized: false;
      live_execution_authorized: false;
    }
  | {
      schema: "void-external-opportunity-paper-classification-journal-plan-v1";
      marker:
        typeof VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_V1;
      status: "held";
      append_authorized: false;
      duplicate: false;
      reasons: string[];
      entry: null;
      direct_filesystem_read_authorized: false;
      direct_filesystem_write_authorized: false;
      dependency_injected_append_authorized: false;
      live_execution_authorized: false;
    };

export interface ExternalOpportunityPaperClassificationJournalAppendDependencyV1 {
  append_json_line: (
    line: string,
    entry: ExternalOpportunityPaperClassificationJournalEntryV1,
  ) =>
    | {
        ok: true;
        bytes_written: number;
      }
    | {
        ok: false;
        error: string;
      };
}

export type ExternalOpportunityPaperClassificationJournalWriteResultV1 =
  | {
      schema: "void-external-opportunity-paper-classification-journal-write-result-v1";
      marker:
        typeof VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_V1;
      status: "applied";
      applied: true;
      duplicate: false;
      dependency_append_invoked: true;
      bytes_written: number;
      entry: ExternalOpportunityPaperClassificationJournalEntryV1;
      reason: "";
      direct_filesystem_read_performed: false;
      direct_filesystem_write_performed: false;
      network_request_performed: false;
      credential_access_performed: false;
      wallet_or_key_access_performed: false;
      transaction_construction_performed: false;
      transaction_submission_performed: false;
      runtime_mutation_performed: false;
      service_mutation_performed: false;
      scheduler_mutation_performed: false;
      live_execution_authorized: false;
    }
  | {
      schema: "void-external-opportunity-paper-classification-journal-write-result-v1";
      marker:
        typeof VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_V1;
      status: "duplicate";
      applied: false;
      duplicate: true;
      dependency_append_invoked: false;
      bytes_written: 0;
      entry: ExternalOpportunityPaperClassificationJournalEntryV1;
      reason: "classification_already_recorded";
      direct_filesystem_read_performed: false;
      direct_filesystem_write_performed: false;
      network_request_performed: false;
      credential_access_performed: false;
      wallet_or_key_access_performed: false;
      transaction_construction_performed: false;
      transaction_submission_performed: false;
      runtime_mutation_performed: false;
      service_mutation_performed: false;
      scheduler_mutation_performed: false;
      live_execution_authorized: false;
    }
  | {
      schema: "void-external-opportunity-paper-classification-journal-write-result-v1";
      marker:
        typeof VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_V1;
      status: "held";
      applied: false;
      duplicate: false;
      dependency_append_invoked: boolean;
      bytes_written: 0;
      entry: ExternalOpportunityPaperClassificationJournalEntryV1 | null;
      reason: string;
      direct_filesystem_read_performed: false;
      direct_filesystem_write_performed: false;
      network_request_performed: false;
      credential_access_performed: false;
      wallet_or_key_access_performed: false;
      transaction_construction_performed: false;
      transaction_submission_performed: false;
      runtime_mutation_performed: false;
      service_mutation_performed: false;
      scheduler_mutation_performed: false;
      live_execution_authorized: false;
    };

export interface ExternalOpportunityPaperClassificationJournalDailySummaryV1 {
  schema:
    "void-external-opportunity-paper-classification-journal-daily-summary-v1";
  marker:
    typeof VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_V1;
  journal_id:
    typeof VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_ID_V1;
  journal_date: string;
  entry_count: number;
  paper_positive_count: number;
  paper_negative_count: number;
  risk_held_count: number;
  source_held_count: number;
  unique_provider_count: number;
  unique_opportunity_count: number;
  total_notional_usd: number;
  total_gross_revenue_usd: number;
  total_cost_usd: number;
  total_net_profit_usd: number;
  total_projected_loss_usd: number;
  live_execution_authorized: false;
}

type JsonRecordV1 = Record<string, unknown>;

const SHA256_V1 = /^[0-9a-f]{64}$/;
const SAFE_PROVIDER_V1 = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const SAFE_IDENTIFIER_V1 = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const JOURNAL_DATE_V1 = /^\d{4}-\d{2}-\d{2}$/;

function isRecordV1(value: unknown): value is JsonRecordV1 {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finiteNumberV1(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function nonNegativeFiniteV1(value: unknown): value is number {
  return finiteNumberV1(value) && value >= 0;
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
    const output: JsonRecordV1 = {};
    for (const key of Object.keys(value).sort()) {
      output[key] = canonicalValueV1(value[key]);
    }
    return output;
  }
  return null;
}

function canonicalJsonV1(value: unknown): string {
  return JSON.stringify(canonicalValueV1(value));
}

function sha256CanonicalV1(value: unknown): string {
  return createHash("sha256").update(canonicalJsonV1(value)).digest("hex");
}

function roundV1(value: number, digits = 12): number {
  const scale = 10 ** digits;
  return Math.round((value + Number.EPSILON) * scale) / scale;
}

function journalDateV1(recordedAt: string): string {
  const timestamp = Date.parse(recordedAt);
  if (!Number.isFinite(timestamp)) return "";
  return new Date(timestamp).toISOString().slice(0, 10);
}

function classificationReasonsV1(
  classification: ExternalOpportunityPaperRiskClassificationV1,
): string[] {
  if (classification.source_validation_reasons.length > 0) {
    return [...classification.source_validation_reasons].sort();
  }
  return [...(classification.risk_decision?.reasons || [])].sort();
}

function classificationMetricsV1(
  classification: ExternalOpportunityPaperRiskClassificationV1,
): {
  notional_usd: number;
  gross_revenue_usd: number;
  total_cost_usd: number;
  net_profit_usd: number;
  net_profit_margin_bps: number;
  projected_loss_usd: number;
} {
  return {
    notional_usd: classification.normalized_observation?.notional_usd || 0,
    gross_revenue_usd:
      classification.normalized_observation?.gross_revenue_usd || 0,
    total_cost_usd: classification.risk_decision?.metrics.total_cost_usd || 0,
    net_profit_usd: classification.risk_decision?.metrics.net_profit_usd || 0,
    net_profit_margin_bps:
      classification.risk_decision?.metrics.net_profit_margin_bps || 0,
    projected_loss_usd:
      classification.risk_decision?.metrics.projected_loss_usd || 0,
  };
}

function riskDecisionStatusV1(
  classification: ExternalOpportunityPaperRiskClassificationV1,
): ExternalOpportunityPaperClassificationJournalEntryV1["risk_decision_status"] {
  return classification.risk_decision?.status || "not_evaluated";
}

function classificationValidationReasonsV1(
  classification: unknown,
): string[] {
  const reasons: string[] = [];
  if (!isRecordV1(classification)) return ["classification_not_object"];

  if (
    classification.schema !==
    VOID_EXTERNAL_OPPORTUNITY_PAPER_RISK_CLASSIFICATION_SCHEMA_V1
  ) {
    reasons.push("classification_schema_mismatch");
  }
  if (
    classification.marker !==
    VOID_EXTERNAL_OPPORTUNITY_PAPER_RISK_CLASSIFICATION_ADAPTER_V1
  ) {
    reasons.push("classification_marker_mismatch");
  }
  if (classification.version !== 1) {
    reasons.push("classification_version_mismatch");
  }

  const status = classification.status;
  if (
    status !== "classified_paper_positive" &&
    status !== "classified_paper_negative" &&
    status !== "risk_held" &&
    status !== "source_held"
  ) {
    reasons.push("classification_status_invalid");
  }

  for (const field of [
    "classification_id",
    "source_record_sha256",
  ] as const) {
    if (!SHA256_V1.test(String(classification[field] || ""))) {
      reasons.push(`${field}_invalid`);
    }
  }

  if (!SAFE_PROVIDER_V1.test(String(classification.provider_id || ""))) {
    reasons.push("provider_id_invalid");
  }
  for (const field of ["quote_id", "opportunity_id"] as const) {
    if (!SAFE_IDENTIFIER_V1.test(String(classification[field] || ""))) {
      reasons.push(`${field}_invalid`);
    }
  }

  if (classification.sanitized_output !== true) {
    reasons.push("sanitized_output_must_be_true");
  }

  for (const field of [
    "credential_value_present",
    "raw_response_present",
    "transaction_payload_present",
    "filesystem_read_performed",
    "filesystem_write_performed",
    "network_request_performed",
    "credential_access_performed",
    "wallet_or_key_access_performed",
    "transaction_construction_performed",
    "transaction_submission_performed",
    "runtime_mutation_performed",
    "service_mutation_performed",
    "scheduler_mutation_performed",
    "live_execution_authorized",
    "execution_authorized",
  ] as const) {
    if (classification[field] !== false) {
      reasons.push(`${field}_must_be_false`);
    }
  }

  const positive = status === "classified_paper_positive";
  const negative = status === "classified_paper_negative";
  const held = status === "risk_held" || status === "source_held";

  if (classification.paper_positive !== positive) {
    reasons.push("paper_positive_binding_mismatch");
  }
  if (classification.paper_negative !== negative) {
    reasons.push("paper_negative_binding_mismatch");
  }
  if (classification.held !== held) {
    reasons.push("held_binding_mismatch");
  }

  if (
    (positive || negative) &&
    classification.classification_append_authorized !== true
  ) {
    reasons.push("classification_append_authorized_required");
  }
  if (
    held &&
    classification.classification_append_authorized !== false
  ) {
    reasons.push("held_classification_append_authorized_must_be_false");
  }

  return [...new Set(reasons)].sort();
}

export function buildExternalOpportunityPaperClassificationJournalEntryV1(
  classification: ExternalOpportunityPaperRiskClassificationV1,
  recordedAt: string,
): ExternalOpportunityPaperClassificationJournalEntryV1 {
  const date = journalDateV1(recordedAt);
  if (!date) {
    throw new Error("recorded_at_invalid");
  }

  const metrics = classificationMetricsV1(classification);
  const reasons = classificationReasonsV1(classification);
  const status = classification.status;
  const fingerprintBinding = {
    marker: VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_V1,
    classification_id: classification.classification_id,
    source_record_sha256: classification.source_record_sha256,
    provider_id: classification.provider_id,
    quote_id: classification.quote_id,
    opportunity_id: classification.opportunity_id,
    classification_status: status,
    source_validation_status: classification.source_validation_status,
    risk_decision_status: riskDecisionStatusV1(classification),
    paper_positive: classification.paper_positive,
    paper_negative: classification.paper_negative,
    held: classification.held,
    reasons,
    notional_usd: metrics.notional_usd,
    gross_revenue_usd: metrics.gross_revenue_usd,
    total_cost_usd: metrics.total_cost_usd,
    net_profit_usd: metrics.net_profit_usd,
    net_profit_margin_bps: metrics.net_profit_margin_bps,
    projected_loss_usd: metrics.projected_loss_usd,
  };

  return {
    schema:
      VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_ENTRY_SCHEMA_V1,
    marker: VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_V1,
    version: 1,
    journal_id: VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_ID_V1,
    journal_date: date,
    recorded_at: new Date(recordedAt).toISOString(),
    classification_id: classification.classification_id,
    entry_fingerprint_sha256: sha256CanonicalV1(fingerprintBinding),
    source_record_sha256: classification.source_record_sha256,
    provider_id: classification.provider_id,
    quote_id: classification.quote_id,
    opportunity_id: classification.opportunity_id,
    classification_status: status,
    source_validation_status: classification.source_validation_status,
    risk_decision_status: riskDecisionStatusV1(classification),
    reasons,
    notional_usd: metrics.notional_usd,
    gross_revenue_usd: metrics.gross_revenue_usd,
    total_cost_usd: metrics.total_cost_usd,
    net_profit_usd: metrics.net_profit_usd,
    net_profit_margin_bps: metrics.net_profit_margin_bps,
    projected_loss_usd: metrics.projected_loss_usd,
    paper_positive: classification.paper_positive,
    paper_negative: classification.paper_negative,
    held: classification.held,
    sanitized_output: true,
    credential_value_present: false,
    raw_response_present: false,
    transaction_payload_present: false,
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

export function validateExternalOpportunityPaperClassificationJournalEntryV1(
  entry: unknown,
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!isRecordV1(entry)) return { ok: false, reasons: ["entry_not_object"] };

  if (
    entry.schema !==
    VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_ENTRY_SCHEMA_V1
  ) {
    reasons.push("entry_schema_mismatch");
  }
  if (
    entry.marker !==
    VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_V1
  ) {
    reasons.push("entry_marker_mismatch");
  }
  if (entry.version !== 1) reasons.push("entry_version_mismatch");
  if (
    entry.journal_id !==
    VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_ID_V1
  ) {
    reasons.push("journal_id_mismatch");
  }
  if (!JOURNAL_DATE_V1.test(String(entry.journal_date || ""))) {
    reasons.push("journal_date_invalid");
  }

  const recordedAt = String(entry.recorded_at || "");
  if (!recordedAt || !Number.isFinite(Date.parse(recordedAt))) {
    reasons.push("recorded_at_invalid");
  } else if (journalDateV1(recordedAt) !== entry.journal_date) {
    reasons.push("journal_date_recorded_at_mismatch");
  }

  for (const field of [
    "classification_id",
    "entry_fingerprint_sha256",
    "source_record_sha256",
  ] as const) {
    if (!SHA256_V1.test(String(entry[field] || ""))) {
      reasons.push(`${field}_invalid`);
    }
  }

  if (!SAFE_PROVIDER_V1.test(String(entry.provider_id || ""))) {
    reasons.push("provider_id_invalid");
  }
  for (const field of ["quote_id", "opportunity_id"] as const) {
    if (!SAFE_IDENTIFIER_V1.test(String(entry[field] || ""))) {
      reasons.push(`${field}_invalid`);
    }
  }

  const status = entry.classification_status;
  if (
    status !== "classified_paper_positive" &&
    status !== "classified_paper_negative" &&
    status !== "risk_held" &&
    status !== "source_held"
  ) {
    reasons.push("classification_status_invalid");
  }

  if (
    entry.source_validation_status !== "accepted" &&
    entry.source_validation_status !== "held"
  ) {
    reasons.push("source_validation_status_invalid");
  }

  if (
    entry.risk_decision_status !== "recordable_paper_positive" &&
    entry.risk_decision_status !== "recordable_paper_negative" &&
    entry.risk_decision_status !== "held" &&
    entry.risk_decision_status !== "live_candidate_blocked" &&
    entry.risk_decision_status !== "not_evaluated"
  ) {
    reasons.push("risk_decision_status_invalid");
  }

  if (
    !Array.isArray(entry.reasons) ||
    entry.reasons.some((value) => typeof value !== "string")
  ) {
    reasons.push("reasons_invalid");
  }

  for (const field of [
    "notional_usd",
    "gross_revenue_usd",
    "total_cost_usd",
    "projected_loss_usd",
  ] as const) {
    if (!nonNegativeFiniteV1(entry[field])) {
      reasons.push(`${field}_invalid`);
    }
  }
  for (const field of [
    "net_profit_usd",
    "net_profit_margin_bps",
  ] as const) {
    if (!finiteNumberV1(entry[field])) {
      reasons.push(`${field}_invalid`);
    }
  }

  const positive = status === "classified_paper_positive";
  const negative = status === "classified_paper_negative";
  const held = status === "risk_held" || status === "source_held";
  if (entry.paper_positive !== positive) {
    reasons.push("paper_positive_binding_mismatch");
  }
  if (entry.paper_negative !== negative) {
    reasons.push("paper_negative_binding_mismatch");
  }
  if (entry.held !== held) {
    reasons.push("held_binding_mismatch");
  }

  if (entry.sanitized_output !== true) {
    reasons.push("sanitized_output_must_be_true");
  }
  for (const field of [
    "credential_value_present",
    "raw_response_present",
    "transaction_payload_present",
    "network_request_performed",
    "credential_access_performed",
    "wallet_or_key_access_performed",
    "transaction_construction_performed",
    "transaction_submission_performed",
    "runtime_mutation_performed",
    "service_mutation_performed",
    "scheduler_mutation_performed",
    "live_execution_authorized",
    "execution_authorized",
  ] as const) {
    if (entry[field] !== false) {
      reasons.push(`${field}_must_be_false`);
    }
  }

  if (reasons.length === 0) {
    const fingerprintBinding = {
      marker: entry.marker,
      classification_id: entry.classification_id,
      source_record_sha256: entry.source_record_sha256,
      provider_id: entry.provider_id,
      quote_id: entry.quote_id,
      opportunity_id: entry.opportunity_id,
      classification_status: entry.classification_status,
      source_validation_status: entry.source_validation_status,
      risk_decision_status: entry.risk_decision_status,
      paper_positive: entry.paper_positive,
      paper_negative: entry.paper_negative,
      held: entry.held,
      reasons: entry.reasons,
      notional_usd: entry.notional_usd,
      gross_revenue_usd: entry.gross_revenue_usd,
      total_cost_usd: entry.total_cost_usd,
      net_profit_usd: entry.net_profit_usd,
      net_profit_margin_bps: entry.net_profit_margin_bps,
      projected_loss_usd: entry.projected_loss_usd,
    };
    if (
      sha256CanonicalV1(fingerprintBinding) !==
      entry.entry_fingerprint_sha256
    ) {
      reasons.push("entry_fingerprint_mismatch");
    }
  }

  return { ok: reasons.length === 0, reasons: [...new Set(reasons)].sort() };
}

export function planExternalOpportunityPaperClassificationJournalAppendV1(
  input: ExternalOpportunityPaperClassificationJournalPlanInputV1,
): ExternalOpportunityPaperClassificationJournalPlanV1 {
  const reasons = classificationValidationReasonsV1(input.classification);

  if (
    !Number.isInteger(input.policy.max_existing_entries) ||
    input.policy.max_existing_entries < 1
  ) {
    reasons.push("max_existing_entries_invalid");
  }
  if (typeof input.policy.allow_held_entries !== "boolean") {
    reasons.push("allow_held_entries_invalid");
  }
  if (!Array.isArray(input.existing_entries)) {
    reasons.push("existing_entries_invalid");
  } else if (
    input.existing_entries.length > input.policy.max_existing_entries
  ) {
    reasons.push("existing_entries_limit_exceeded");
  }

  const date = journalDateV1(input.recorded_at);
  if (!date) reasons.push("recorded_at_invalid");

  if (reasons.length > 0) {
    return {
      schema:
        "void-external-opportunity-paper-classification-journal-plan-v1",
      marker: VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_V1,
      status: "held",
      append_authorized: false,
      duplicate: false,
      reasons: [...new Set(reasons)].sort(),
      entry: null,
      direct_filesystem_read_authorized: false,
      direct_filesystem_write_authorized: false,
      dependency_injected_append_authorized: false,
      live_execution_authorized: false,
    };
  }

  const entry =
    buildExternalOpportunityPaperClassificationJournalEntryV1(
      input.classification,
      input.recorded_at,
    );

  if (
    entry.held &&
    input.policy.allow_held_entries !== true
  ) {
    return {
      schema:
        "void-external-opportunity-paper-classification-journal-plan-v1",
      marker: VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_V1,
      status: "held",
      append_authorized: false,
      duplicate: false,
      reasons: ["held_entry_policy_disabled"],
      entry: null,
      direct_filesystem_read_authorized: false,
      direct_filesystem_write_authorized: false,
      dependency_injected_append_authorized: false,
      live_execution_authorized: false,
    };
  }

  for (const existing of input.existing_entries) {
    const validation =
      validateExternalOpportunityPaperClassificationJournalEntryV1(existing);
    if (!validation.ok) {
      return {
        schema:
          "void-external-opportunity-paper-classification-journal-plan-v1",
        marker: VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_V1,
        status: "held",
        append_authorized: false,
        duplicate: false,
        reasons: validation.reasons.map(
          (reason) => `existing_entry_invalid:${reason}`,
        ),
        entry: null,
        direct_filesystem_read_authorized: false,
        direct_filesystem_write_authorized: false,
        dependency_injected_append_authorized: false,
        live_execution_authorized: false,
      };
    }

    if (existing.classification_id === entry.classification_id) {
      if (
        existing.entry_fingerprint_sha256 ===
        entry.entry_fingerprint_sha256
      ) {
        return {
          schema:
            "void-external-opportunity-paper-classification-journal-plan-v1",
          marker: VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_V1,
          status: "duplicate",
          append_authorized: false,
          duplicate: true,
          reasons: ["classification_already_recorded"],
          entry: existing,
          direct_filesystem_read_authorized: false,
          direct_filesystem_write_authorized: false,
          dependency_injected_append_authorized: false,
          live_execution_authorized: false,
        };
      }
      return {
        schema:
          "void-external-opportunity-paper-classification-journal-plan-v1",
        marker: VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_V1,
        status: "held",
        append_authorized: false,
        duplicate: false,
        reasons: ["classification_id_conflict"],
        entry: null,
        direct_filesystem_read_authorized: false,
        direct_filesystem_write_authorized: false,
        dependency_injected_append_authorized: false,
        live_execution_authorized: false,
      };
    }

    if (existing.source_record_sha256 === entry.source_record_sha256) {
      return {
        schema:
          "void-external-opportunity-paper-classification-journal-plan-v1",
        marker: VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_V1,
        status: "held",
        append_authorized: false,
        duplicate: false,
        reasons: ["source_record_already_classified"],
        entry: null,
        direct_filesystem_read_authorized: false,
        direct_filesystem_write_authorized: false,
        dependency_injected_append_authorized: false,
        live_execution_authorized: false,
      };
    }
  }

  return {
    schema:
      "void-external-opportunity-paper-classification-journal-plan-v1",
    marker: VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_V1,
    status: "ready",
    append_authorized: true,
    duplicate: false,
    reasons: [],
    entry,
    direct_filesystem_read_authorized: false,
    direct_filesystem_write_authorized: false,
    dependency_injected_append_authorized: true,
    live_execution_authorized: false,
  };
}

function baseWriteResultV1() {
  return {
    schema:
      "void-external-opportunity-paper-classification-journal-write-result-v1" as const,
    marker: VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_V1,
    direct_filesystem_read_performed: false as const,
    direct_filesystem_write_performed: false as const,
    network_request_performed: false as const,
    credential_access_performed: false as const,
    wallet_or_key_access_performed: false as const,
    transaction_construction_performed: false as const,
    transaction_submission_performed: false as const,
    runtime_mutation_performed: false as const,
    service_mutation_performed: false as const,
    scheduler_mutation_performed: false as const,
    live_execution_authorized: false as const,
  };
}

export function writeExternalOpportunityPaperClassificationJournalV1(
  input: {
    plan: ExternalOpportunityPaperClassificationJournalPlanV1;
    confirmation: string;
    dependencies: ExternalOpportunityPaperClassificationJournalAppendDependencyV1;
  },
): ExternalOpportunityPaperClassificationJournalWriteResultV1 {
  if (input.plan.status === "duplicate") {
    return {
      ...baseWriteResultV1(),
      status: "duplicate",
      applied: false,
      duplicate: true,
      dependency_append_invoked: false,
      bytes_written: 0,
      entry: input.plan.entry,
      reason: "classification_already_recorded",
    };
  }

  if (input.plan.status === "held") {
    return {
      ...baseWriteResultV1(),
      status: "held",
      applied: false,
      duplicate: false,
      dependency_append_invoked: false,
      bytes_written: 0,
      entry: null,
      reason: input.plan.reasons.join(",") || "plan_held",
    };
  }

  if (
    input.confirmation !==
    VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_APPEND_CONFIRMATION_V1
  ) {
    return {
      ...baseWriteResultV1(),
      status: "held",
      applied: false,
      duplicate: false,
      dependency_append_invoked: false,
      bytes_written: 0,
      entry: input.plan.entry,
      reason:
        "append_confirmation_required:" +
        VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_APPEND_CONFIRMATION_V1,
    };
  }

  const line = `${JSON.stringify(input.plan.entry)}\n`;
  const result = input.dependencies.append_json_line(
    line,
    input.plan.entry,
  );

  if (result.ok === false) {
    return {
      ...baseWriteResultV1(),
      status: "held",
      applied: false,
      duplicate: false,
      dependency_append_invoked: true,
      bytes_written: 0,
      entry: input.plan.entry,
      reason: `append_dependency_failed:${result.error}`,
    };
  }

  if (
    !Number.isInteger(result.bytes_written) ||
    result.bytes_written !== Buffer.byteLength(line)
  ) {
    return {
      ...baseWriteResultV1(),
      status: "held",
      applied: false,
      duplicate: false,
      dependency_append_invoked: true,
      bytes_written: 0,
      entry: input.plan.entry,
      reason: "append_dependency_byte_count_mismatch",
    };
  }

  return {
    ...baseWriteResultV1(),
    status: "applied",
    applied: true,
    duplicate: false,
    dependency_append_invoked: true,
    bytes_written: result.bytes_written,
    entry: input.plan.entry,
    reason: "",
  };
}

export function summarizeExternalOpportunityPaperClassificationJournalDayV1(
  entries: ExternalOpportunityPaperClassificationJournalEntryV1[],
  journalDate: string,
): ExternalOpportunityPaperClassificationJournalDailySummaryV1 {
  if (!JOURNAL_DATE_V1.test(journalDate)) {
    throw new Error("journal_date_invalid");
  }

  const selected = entries.filter((entry) => {
    const validation =
      validateExternalOpportunityPaperClassificationJournalEntryV1(entry);
    return validation.ok && entry.journal_date === journalDate;
  });

  return {
    schema:
      "void-external-opportunity-paper-classification-journal-daily-summary-v1",
    marker: VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_V1,
    journal_id: VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_ID_V1,
    journal_date: journalDate,
    entry_count: selected.length,
    paper_positive_count: selected.filter((entry) => entry.paper_positive).length,
    paper_negative_count: selected.filter((entry) => entry.paper_negative).length,
    risk_held_count: selected.filter(
      (entry) => entry.classification_status === "risk_held",
    ).length,
    source_held_count: selected.filter(
      (entry) => entry.classification_status === "source_held",
    ).length,
    unique_provider_count: new Set(
      selected.map((entry) => entry.provider_id),
    ).size,
    unique_opportunity_count: new Set(
      selected.map((entry) => entry.opportunity_id),
    ).size,
    total_notional_usd: roundV1(
      selected.reduce((sum, entry) => sum + entry.notional_usd, 0),
    ),
    total_gross_revenue_usd: roundV1(
      selected.reduce((sum, entry) => sum + entry.gross_revenue_usd, 0),
    ),
    total_cost_usd: roundV1(
      selected.reduce((sum, entry) => sum + entry.total_cost_usd, 0),
    ),
    total_net_profit_usd: roundV1(
      selected.reduce((sum, entry) => sum + entry.net_profit_usd, 0),
    ),
    total_projected_loss_usd: roundV1(
      selected.reduce((sum, entry) => sum + entry.projected_loss_usd, 0),
    ),
    live_execution_authorized: false,
  };
}
