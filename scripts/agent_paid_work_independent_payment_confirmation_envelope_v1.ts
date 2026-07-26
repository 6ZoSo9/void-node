import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { validateAgentPaidWorkOrderEnvelope, type AgentPaidWorkOrderEnvelope } from "./agent_paid_work_order_envelope_v1.js";
import { validateAgentPaidWorkQuoteEnvelope, type AgentPaidWorkQuoteEnvelope } from "./agent_paid_work_quote_envelope_v1.js";
import { validateAgentPaidWorkAcceptanceEnvelope, type AgentPaidWorkAcceptanceEnvelope } from "./agent_paid_work_acceptance_envelope_v1.js";
import { compareDecimals, validateAgentPaidWorkPaymentIntentEnvelope, type AgentPaidWorkPaymentIntentEnvelope } from "./agent_paid_work_payment_intent_envelope_v1.js";
import { validateAgentPaidWorkPaymentExecutionAuthorizationEnvelope, type AgentPaidWorkPaymentExecutionAuthorizationEnvelope } from "./agent_paid_work_payment_execution_authorization_envelope_v1.js";
import { validateAgentPaidWorkPaymentReceiptEnvelope, type AgentPaidWorkPaymentReceiptEnvelope } from "./agent_paid_work_payment_receipt_envelope_v1.js";

export const MARKER = "VOID_AGENT_PAID_WORK_INDEPENDENT_PAYMENT_CONFIRMATION_ENVELOPE_V1" as const;
export const ID_PREFIX = "voidawpc1_" as const;

type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface AgentPaidWorkIndependentPaymentConfirmationDraft {
  marker: typeof MARKER;
  version: 1;
  work_order_id: string;
  quote_id: string;
  acceptance_id: string;
  payment_intent_id: string;
  payment_execution_authorization_id: string;
  payment_receipt_id: string;
  settlement_observed_at_utc: string;
  confirmed_at_utc: string;
  requester: { agent_id: string };
  provider: { provider_id: string };
  executor: { executor_id: string };
  authorizer: { authority_id: string; authority_policy_id: string };
  resolution: { resolver_id: string; payment_rail_resolution_id: string; provider_destination_binding_id: string };
  confirmer: { confirmer_id: string; confirmation_policy_id: string };
  commercial: { quote_asset: string; service_total: string; actual_fee_total: string; payment_total: string; payment_rail_id: string };
  evidence: { rail_receipt_id: string; payment_evidence_sha256: string; independent_observation_id: string; settlement_reference_id: string; confirmation_evidence_sha256: string };
  confirmation: {
    payment_settlement_confirmed: true;
    exact_payment_receipt_only: true;
    confirmer_authentication_required: true;
    confirmer_signature_required: true;
    confirmation_policy_binding_required: true;
    confirmer_independent_from_requester_required: true;
    confirmer_independent_from_provider_required: true;
    confirmer_independent_from_executor_required: true;
    confirmer_independent_from_authorizer_required: true;
    confirmer_independent_from_resolver_required: true;
    receipt_executor_signature_verified: true;
    receipt_and_payment_evidence_digest_verified: true;
    allowlisted_payment_rail_required: true;
    rail_receipt_resolved: true;
    provider_destination_binding_verified: true;
    rail_asset_compatibility_verified: true;
    payment_amount_verified: true;
    settlement_finality_policy_satisfied: true;
    settlement_not_reversed_at_confirmation: true;
    settlement_not_disputed_at_confirmation: true;
    single_confirmation_per_receipt_required: true;
    independent_observation_id_unique_required: true;
    settlement_reference_id_unique_required: true;
    confirmation_evidence_immutable: true;
    replay_protection_required: true;
    confirmation_is_not_payment_execution: true;
    work_execution_authorization_separate: true;
    work_execution_authorization_granted: false;
    confirmation_is_not_work_execution_instruction: true;
    confirmation_is_not_transaction_signature: true;
    post_confirmation_reversal_requires_separate_dispute_record: true;
  };
  nonce: string;
}
export interface AgentPaidWorkIndependentPaymentConfirmationEnvelope extends AgentPaidWorkIndependentPaymentConfirmationDraft {
  payment_confirmation_id: string;
}

function fail(message: string): never { throw new Error(message); }
function assertCondition(condition: unknown, message: string): asserts condition { if (!condition) fail(message); }
function record(value: unknown, label: string): Record<string, unknown> {
  assertCondition(typeof value === "object" && value !== null && !Array.isArray(value), `${label} must be an object`);
  return value as Record<string, unknown>;
}
function exactKeys(value: Record<string, unknown>, label: string, keys: readonly string[]): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assertCondition(JSON.stringify(actual) === JSON.stringify(expected), `${label} keys must be exactly: ${expected.join(", ")}`);
}
function text(value: unknown, label: string, min: number, max: number, pattern?: RegExp): string {
  assertCondition(typeof value === "string", `${label} must be a string`);
  assertCondition(value === value.trim(), `${label} must not have surrounding whitespace`);
  assertCondition(value.length >= min && value.length <= max, `${label} length must be ${min}..${max}`);
  if (pattern) assertCondition(pattern.test(value), `${label} has invalid format`);
  return value;
}
function utc(value: string, label: string): number {
  assertCondition(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value), `${label} must be second-precision UTC`);
  const ms = Date.parse(value);
  assertCondition(Number.isFinite(ms), `${label} is invalid UTC`);
  assertCondition(new Date(ms).toISOString() === value.replace("Z", ".000Z"), `${label} is not canonical UTC`);
  return ms / 1000;
}
function canonicalize(value: unknown): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    assertCondition(Number.isFinite(value) && Number.isSafeInteger(value), "canonical numbers must be finite safe integers");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  const source = record(value, "canonical JSON value");
  const result: { [key: string]: JsonValue } = {};
  for (const key of Object.keys(source).sort()) {
    assertCondition(source[key] !== undefined, "canonical JSON rejects undefined");
    result[key] = canonicalize(source[key]);
  }
  return result;
}
export function canonicalJson(value: unknown): string { return JSON.stringify(canonicalize(value)); }

const TRUE_KEYS = [
  "payment_settlement_confirmed","exact_payment_receipt_only","confirmer_authentication_required","confirmer_signature_required",
  "confirmation_policy_binding_required","confirmer_independent_from_requester_required","confirmer_independent_from_provider_required",
  "confirmer_independent_from_executor_required","confirmer_independent_from_authorizer_required","confirmer_independent_from_resolver_required",
  "receipt_executor_signature_verified","receipt_and_payment_evidence_digest_verified","allowlisted_payment_rail_required","rail_receipt_resolved",
  "provider_destination_binding_verified","rail_asset_compatibility_verified","payment_amount_verified","settlement_finality_policy_satisfied",
  "settlement_not_reversed_at_confirmation","settlement_not_disputed_at_confirmation","single_confirmation_per_receipt_required",
  "independent_observation_id_unique_required","settlement_reference_id_unique_required","confirmation_evidence_immutable",
  "replay_protection_required","confirmation_is_not_payment_execution","work_execution_authorization_separate",
  "confirmation_is_not_work_execution_instruction","confirmation_is_not_transaction_signature",
  "post_confirmation_reversal_requires_separate_dispute_record",
] as const;
const CONFIRMATION_KEYS = [...TRUE_KEYS, "work_execution_authorization_granted"] as const;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const DECIMAL = /^(0|[1-9]\d{0,31})(?:\.\d{1,18})?$/;

function shape(value: unknown, allowId: boolean): AgentPaidWorkIndependentPaymentConfirmationDraft {
  const root = record(value, "payment confirmation");
  exactKeys(root, "payment confirmation", [
    "marker","version","work_order_id","quote_id","acceptance_id","payment_intent_id",
    "payment_execution_authorization_id","payment_receipt_id","settlement_observed_at_utc","confirmed_at_utc",
    "requester","provider","executor","authorizer","resolution","confirmer","commercial","evidence","confirmation","nonce",
    ...(allowId ? ["payment_confirmation_id"] : []),
  ]);
  assertCondition(root.marker === MARKER, `marker must be ${MARKER}`);
  assertCondition(root.version === 1, "version must be 1");
  const workOrderId = text(root.work_order_id, "work_order_id", 73, 73, /^voidawo1_[0-9a-f]{64}$/);
  const quoteId = text(root.quote_id, "quote_id", 73, 73, /^voidawq1_[0-9a-f]{64}$/);
  const acceptanceId = text(root.acceptance_id, "acceptance_id", 73, 73, /^voidawa1_[0-9a-f]{64}$/);
  const intentId = text(root.payment_intent_id, "payment_intent_id", 74, 74, /^voidawpi1_[0-9a-f]{64}$/);
  const authorizationId = text(root.payment_execution_authorization_id, "payment_execution_authorization_id", 75, 75, /^voidawpea1_[0-9a-f]{64}$/);
  const receiptId = text(root.payment_receipt_id, "payment_receipt_id", 75, 75, /^voidawper1_[0-9a-f]{64}$/);
  const observedAt = text(root.settlement_observed_at_utc, "settlement_observed_at_utc", 20, 20);
  const confirmedAt = text(root.confirmed_at_utc, "confirmed_at_utc", 20, 20);
  assertCondition(utc(confirmedAt, "confirmed_at_utc") >= utc(observedAt, "settlement_observed_at_utc"), "confirmed_at_utc cannot precede settlement observation");

  const requester = record(root.requester, "requester"); exactKeys(requester, "requester", ["agent_id"]);
  const provider = record(root.provider, "provider"); exactKeys(provider, "provider", ["provider_id"]);
  const executor = record(root.executor, "executor"); exactKeys(executor, "executor", ["executor_id"]);
  const authorizer = record(root.authorizer, "authorizer"); exactKeys(authorizer, "authorizer", ["authority_id","authority_policy_id"]);
  const resolution = record(root.resolution, "resolution"); exactKeys(resolution, "resolution", ["resolver_id","payment_rail_resolution_id","provider_destination_binding_id"]);
  const confirmer = record(root.confirmer, "confirmer"); exactKeys(confirmer, "confirmer", ["confirmer_id","confirmation_policy_id"]);
  const requesterId = text(requester.agent_id, "requester.agent_id", 3, 128, ID);
  const providerId = text(provider.provider_id, "provider.provider_id", 3, 128, ID);
  const executorId = text(executor.executor_id, "executor.executor_id", 3, 128, ID);
  const authorityId = text(authorizer.authority_id, "authorizer.authority_id", 3, 128, ID);
  const authorityPolicyId = text(authorizer.authority_policy_id, "authorizer.authority_policy_id", 3, 128, ID);
  const resolverId = text(resolution.resolver_id, "resolution.resolver_id", 3, 128, ID);
  const railResolutionId = text(resolution.payment_rail_resolution_id, "resolution.payment_rail_resolution_id", 3, 128, ID);
  const destinationBindingId = text(resolution.provider_destination_binding_id, "resolution.provider_destination_binding_id", 3, 128, ID);
  const confirmerId = text(confirmer.confirmer_id, "confirmer.confirmer_id", 3, 128, ID);
  const confirmationPolicyId = text(confirmer.confirmation_policy_id, "confirmer.confirmation_policy_id", 3, 128, ID);

  const commercial = record(root.commercial, "commercial"); exactKeys(commercial, "commercial", ["quote_asset","service_total","actual_fee_total","payment_total","payment_rail_id"]);
  const quoteAsset = text(commercial.quote_asset, "commercial.quote_asset", 1, 32, /^[A-Z][A-Z0-9._:-]{0,31}$/);
  const serviceTotal = text(commercial.service_total, "commercial.service_total", 1, 51, DECIMAL);
  const actualFeeTotal = text(commercial.actual_fee_total, "commercial.actual_fee_total", 1, 51, DECIMAL);
  const paymentTotal = text(commercial.payment_total, "commercial.payment_total", 1, 51, DECIMAL);
  const railId = text(commercial.payment_rail_id, "commercial.payment_rail_id", 3, 128, /^[a-z0-9][a-z0-9._-]{2,127}$/);

  const evidence = record(root.evidence, "evidence"); exactKeys(evidence, "evidence", ["rail_receipt_id","payment_evidence_sha256","independent_observation_id","settlement_reference_id","confirmation_evidence_sha256"]);
  const railReceiptId = text(evidence.rail_receipt_id, "evidence.rail_receipt_id", 3, 128, ID);
  const paymentEvidence = text(evidence.payment_evidence_sha256, "evidence.payment_evidence_sha256", 71, 71, /^sha256:[0-9a-f]{64}$/);
  const observationId = text(evidence.independent_observation_id, "evidence.independent_observation_id", 3, 128, ID);
  const settlementReferenceId = text(evidence.settlement_reference_id, "evidence.settlement_reference_id", 3, 128, ID);
  const confirmationEvidence = text(evidence.confirmation_evidence_sha256, "evidence.confirmation_evidence_sha256", 71, 71, /^sha256:[0-9a-f]{64}$/);

  const confirmation = record(root.confirmation, "confirmation"); exactKeys(confirmation, "confirmation", CONFIRMATION_KEYS);
  for (const key of TRUE_KEYS) assertCondition(confirmation[key] === true, `confirmation.${key} must be true`);
  assertCondition(confirmation.work_execution_authorization_granted === false, "work execution authority must remain false");
  const nonce = text(root.nonce, "nonce", 1, 128, /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/);

  return {
    marker: MARKER, version: 1, work_order_id: workOrderId, quote_id: quoteId, acceptance_id: acceptanceId,
    payment_intent_id: intentId, payment_execution_authorization_id: authorizationId, payment_receipt_id: receiptId,
    settlement_observed_at_utc: observedAt, confirmed_at_utc: confirmedAt,
    requester: { agent_id: requesterId }, provider: { provider_id: providerId }, executor: { executor_id: executorId },
    authorizer: { authority_id: authorityId, authority_policy_id: authorityPolicyId },
    resolution: { resolver_id: resolverId, payment_rail_resolution_id: railResolutionId, provider_destination_binding_id: destinationBindingId },
    confirmer: { confirmer_id: confirmerId, confirmation_policy_id: confirmationPolicyId },
    commercial: { quote_asset: quoteAsset, service_total: serviceTotal, actual_fee_total: actualFeeTotal, payment_total: paymentTotal, payment_rail_id: railId },
    evidence: { rail_receipt_id: railReceiptId, payment_evidence_sha256: paymentEvidence, independent_observation_id: observationId, settlement_reference_id: settlementReferenceId, confirmation_evidence_sha256: confirmationEvidence },
    confirmation: {
      payment_settlement_confirmed: true, exact_payment_receipt_only: true, confirmer_authentication_required: true,
      confirmer_signature_required: true, confirmation_policy_binding_required: true, confirmer_independent_from_requester_required: true,
      confirmer_independent_from_provider_required: true, confirmer_independent_from_executor_required: true,
      confirmer_independent_from_authorizer_required: true, confirmer_independent_from_resolver_required: true,
      receipt_executor_signature_verified: true, receipt_and_payment_evidence_digest_verified: true, allowlisted_payment_rail_required: true,
      rail_receipt_resolved: true, provider_destination_binding_verified: true, rail_asset_compatibility_verified: true,
      payment_amount_verified: true, settlement_finality_policy_satisfied: true, settlement_not_reversed_at_confirmation: true,
      settlement_not_disputed_at_confirmation: true, single_confirmation_per_receipt_required: true,
      independent_observation_id_unique_required: true, settlement_reference_id_unique_required: true,
      confirmation_evidence_immutable: true, replay_protection_required: true, confirmation_is_not_payment_execution: true,
      work_execution_authorization_separate: true, work_execution_authorization_granted: false,
      confirmation_is_not_work_execution_instruction: true, confirmation_is_not_transaction_signature: true,
      post_confirmation_reversal_requires_separate_dispute_record: true,
    },
    nonce,
  };
}

function bindings(
  work: AgentPaidWorkOrderEnvelope,
  quote: AgentPaidWorkQuoteEnvelope,
  acceptance: AgentPaidWorkAcceptanceEnvelope,
  intent: AgentPaidWorkPaymentIntentEnvelope,
  authorization: AgentPaidWorkPaymentExecutionAuthorizationEnvelope,
  receipt: AgentPaidWorkPaymentReceiptEnvelope,
  confirmation: AgentPaidWorkIndependentPaymentConfirmationDraft,
): void {
  assertCondition(confirmation.work_order_id === work.work_order_id, "work-order binding mismatch");
  assertCondition(confirmation.quote_id === quote.quote_id, "quote binding mismatch");
  assertCondition(confirmation.acceptance_id === acceptance.acceptance_id, "acceptance binding mismatch");
  assertCondition(confirmation.payment_intent_id === intent.payment_intent_id, "intent binding mismatch");
  assertCondition(confirmation.payment_execution_authorization_id === authorization.payment_execution_authorization_id, "authorization binding mismatch");
  assertCondition(confirmation.payment_receipt_id === receipt.payment_receipt_id, "receipt binding mismatch");
  assertCondition(confirmation.requester.agent_id === receipt.requester.agent_id, "requester mismatch");
  assertCondition(confirmation.provider.provider_id === receipt.provider.provider_id, "provider mismatch");
  assertCondition(confirmation.executor.executor_id === receipt.executor.executor_id, "executor mismatch");
  assertCondition(confirmation.authorizer.authority_id === receipt.authorizer.authority_id, "authorizer mismatch");
  assertCondition(confirmation.authorizer.authority_policy_id === receipt.authorizer.authority_policy_id, "authority policy mismatch");
  assertCondition(confirmation.resolution.resolver_id === receipt.resolution.resolver_id, "resolver mismatch");
  assertCondition(confirmation.resolution.payment_rail_resolution_id === receipt.resolution.payment_rail_resolution_id, "rail resolution mismatch");
  assertCondition(confirmation.resolution.provider_destination_binding_id === receipt.resolution.provider_destination_binding_id, "destination binding mismatch");
  const confirmer = confirmation.confirmer.confirmer_id;
  for (const [label, identity] of [
    ["requester", confirmation.requester.agent_id],
    ["provider", confirmation.provider.provider_id],
    ["executor", confirmation.executor.executor_id],
    ["authorizer", confirmation.authorizer.authority_id],
    ["resolver", confirmation.resolution.resolver_id],
  ] as const) assertCondition(confirmer !== identity, `confirmer must be independent from ${label}`);
  assertCondition(confirmation.commercial.quote_asset === receipt.commercial.quote_asset, "asset mismatch");
  assertCondition(compareDecimals(confirmation.commercial.service_total, receipt.commercial.service_total) === 0, "service total mismatch");
  assertCondition(compareDecimals(confirmation.commercial.actual_fee_total, receipt.commercial.actual_fee_total) === 0, "actual fee mismatch");
  assertCondition(compareDecimals(confirmation.commercial.payment_total, receipt.commercial.payment_total) === 0, "payment total mismatch");
  assertCondition(confirmation.commercial.payment_rail_id === receipt.commercial.payment_rail_id, "rail mismatch");
  assertCondition(confirmation.evidence.rail_receipt_id === receipt.evidence.rail_receipt_id, "rail receipt mismatch");
  assertCondition(confirmation.evidence.payment_evidence_sha256 === receipt.evidence.payment_evidence_sha256, "payment evidence mismatch");
  assertCondition(utc(confirmation.settlement_observed_at_utc, "settlement observed") >= utc(receipt.observed_at_utc, "receipt observed"), "settlement observation cannot predate receipt observation");
  assertCondition(receipt.attestation.independent_confirmation_required === true, "receipt must require independent confirmation");
  assertCondition(receipt.attestation.receipt_is_not_independent_confirmation === true, "receipt must not self-confirm");
  assertCondition(receipt.attestation.work_execution_authorization_granted === false, "receipt must not grant work execution");
}

export function computeId(draft: AgentPaidWorkIndependentPaymentConfirmationDraft): string {
  return `${ID_PREFIX}${createHash("sha256").update(canonicalJson(draft)).digest("hex")}`;
}
export function validateDraft(work: unknown, quote: unknown, acceptance: unknown, intent: unknown, authorization: unknown, receipt: unknown, value: unknown): asserts value is AgentPaidWorkIndependentPaymentConfirmationDraft {
  validateAgentPaidWorkOrderEnvelope(work); validateAgentPaidWorkQuoteEnvelope(work, quote);
  validateAgentPaidWorkAcceptanceEnvelope(work, quote, acceptance);
  validateAgentPaidWorkPaymentIntentEnvelope(work, quote, acceptance, intent);
  validateAgentPaidWorkPaymentExecutionAuthorizationEnvelope(work, quote, acceptance, intent, authorization);
  validateAgentPaidWorkPaymentReceiptEnvelope(work, quote, acceptance, intent, authorization, receipt);
  const draft = shape(value, false); bindings(work, quote, acceptance, intent, authorization, receipt, draft);
}
export function materialize(work: unknown, quote: unknown, acceptance: unknown, intent: unknown, authorization: unknown, receipt: unknown, value: unknown): AgentPaidWorkIndependentPaymentConfirmationEnvelope {
  validateAgentPaidWorkOrderEnvelope(work); validateAgentPaidWorkQuoteEnvelope(work, quote);
  validateAgentPaidWorkAcceptanceEnvelope(work, quote, acceptance);
  validateAgentPaidWorkPaymentIntentEnvelope(work, quote, acceptance, intent);
  validateAgentPaidWorkPaymentExecutionAuthorizationEnvelope(work, quote, acceptance, intent, authorization);
  validateAgentPaidWorkPaymentReceiptEnvelope(work, quote, acceptance, intent, authorization, receipt);
  const draft = shape(value, false); bindings(work, quote, acceptance, intent, authorization, receipt, draft);
  return { ...draft, payment_confirmation_id: computeId(draft) };
}
export function validateEnvelope(work: unknown, quote: unknown, acceptance: unknown, intent: unknown, authorization: unknown, receipt: unknown, value: unknown): asserts value is AgentPaidWorkIndependentPaymentConfirmationEnvelope {
  validateAgentPaidWorkOrderEnvelope(work); validateAgentPaidWorkQuoteEnvelope(work, quote);
  validateAgentPaidWorkAcceptanceEnvelope(work, quote, acceptance);
  validateAgentPaidWorkPaymentIntentEnvelope(work, quote, acceptance, intent);
  validateAgentPaidWorkPaymentExecutionAuthorizationEnvelope(work, quote, acceptance, intent, authorization);
  validateAgentPaidWorkPaymentReceiptEnvelope(work, quote, acceptance, intent, authorization, receipt);
  const root = record(value, "payment confirmation envelope");
  const draft = shape(value, true); bindings(work, quote, acceptance, intent, authorization, receipt, draft);
  const id = text(root.payment_confirmation_id, "payment_confirmation_id", 74, 74, /^voidawpc1_[0-9a-f]{64}$/);
  assertCondition(id === computeId(draft), "payment_confirmation_id does not match canonical payload");
}

function readJson(path: string): unknown { return JSON.parse(readFileSync(path, "utf8")) as unknown; }
function usage(): never { return fail("usage: materialize|verify <work> <quote> <acceptance> <intent> <authorization> <receipt> <confirmation> [output]"); }
function main(): void {
  const [mode, workPath, quotePath, acceptancePath, intentPath, authorizationPath, receiptPath, confirmationPath, outputPath, ...extra] = process.argv.slice(2);
  assertCondition(extra.length === 0, "unexpected extra arguments");
  assertCondition(Boolean(workPath && quotePath && acceptancePath && intentPath && authorizationPath && receiptPath && confirmationPath), "missing required paths");
  const work = readJson(resolve(workPath!));
  const quote = readJson(resolve(quotePath!));
  const acceptance = readJson(resolve(acceptancePath!));
  const intent = readJson(resolve(intentPath!));
  const authorization = readJson(resolve(authorizationPath!));
  const receipt = readJson(resolve(receiptPath!));
  if (mode === "materialize") {
    assertCondition(Boolean(outputPath), "materialize requires output");
    const output = resolve(outputPath!); assertCondition(!existsSync(output), "refusing to overwrite output");
    const envelope = materialize(work, quote, acceptance, intent, authorization, receipt, readJson(resolve(confirmationPath!)));
    writeFileSync(output, `${JSON.stringify(envelope, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
    console.log(`payment_confirmation_id=${envelope.payment_confirmation_id}`); return;
  }
  if (mode === "verify") {
    assertCondition(outputPath === undefined, "verify takes no output");
    const value = readJson(resolve(confirmationPath!));
    validateEnvelope(work, quote, acceptance, intent, authorization, receipt, value);
    console.log(`marker=${value.marker}`); console.log(`payment_confirmation_id=${value.payment_confirmation_id}`);
    console.log("VOID_AGENT_PAID_WORK_INDEPENDENT_PAYMENT_CONFIRMATION_ENVELOPE_V1_VALID"); return;
  }
  usage();
}
const invokedUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (invokedUrl === import.meta.url) { try { main(); } catch (error) { console.error(`HOLD: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; } }
