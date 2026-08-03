import crypto from "node:crypto";

import {
  materializeAgentPaidWorkOrder,
  type AgentPaidWorkOrderDraft,
  type AgentPaidWorkOrderEnvelope,
} from "./agent_paid_work_order_envelope_v1.js";
import {
  materializeAgentPaidWorkQuote,
  type AgentPaidWorkQuoteDraft,
  type AgentPaidWorkQuoteEnvelope,
} from "./agent_paid_work_quote_envelope_v1.js";
import {
  AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_MARKER,
  materializeAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1,
  verifyAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1,
  type AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityInputV1,
  type AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityPacketV1,
} from "./authenticated_paid_work_quote_acceptance_payment_authority_v1.js";
import {
  DIRECT_AUTHENTICATION_CANONICALIZATION,
  DIRECT_AUTHENTICATION_INPUT_MARKER,
  DIRECT_AUTHENTICATION_SIGNATURE_SCHEME,
  DIRECT_PROVIDER_AUTHENTICATION_EVIDENCE_MARKER,
  DIRECT_PROVIDER_AUTHENTICATION_SCOPE,
  DIRECT_PROVIDER_KEY_BINDING_MARKER,
  DIRECT_PROVIDER_SIGNATURE_DOMAIN,
  DIRECT_REQUESTER_AUTHENTICATION_EVIDENCE_MARKER,
  DIRECT_REQUESTER_AUTHENTICATION_SCOPE,
  DIRECT_REQUESTER_KEY_BINDING_MARKER,
  DIRECT_REQUESTER_SIGNATURE_DOMAIN,
  canonicalJson,
  directAuthenticationKeyIdV1,
  directProviderAuthenticationIdV1,
  directProviderAuthenticationSigningBytesV1,
  directProviderKeyBindingIdV1,
  directRequesterAuthenticationIdV1,
  directRequesterAuthenticationSigningBytesV1,
  directRequesterKeyBindingIdV1,
  materializeAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1,
  sha256Hex,
  verifyAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1,
  type AuthenticatedPaidWorkDirectQuoteActivationAuthenticationInputV1,
  type AuthenticatedPaidWorkDirectQuoteActivationAuthenticationPacketV1,
  type DirectEvidenceMode,
  type DirectProviderAuthenticationBodyV1,
  type DirectProviderAuthenticationEnvelopeV1,
  type DirectProviderKeyBindingDraftV1,
  type DirectProviderKeyBindingV1,
  type DirectRequesterAuthenticationBodyV1,
  type DirectRequesterAuthenticationEnvelopeV1,
  type DirectRequesterKeyBindingDraftV1,
  type DirectRequesterKeyBindingV1,
} from "./authenticated_paid_work_direct_quote_activation_authentication_v1.js";

export const FRESH_DIRECT_QUOTE_PREPARATION_SCHEMA_ID =
  "https://void.network/schemas/authenticated-paid-work-fresh-direct-quote-authentication-preparation-v1.schema.json" as const;
export const FRESH_DIRECT_QUOTE_PREPARATION_INPUT_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_FRESH_DIRECT_QUOTE_AUTHENTICATION_PREPARATION_V1" as const;
export const FRESH_DIRECT_PROVIDER_SIGNING_REQUEST_PACKET_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_FRESH_DIRECT_PROVIDER_SIGNING_REQUEST_PACKET_V1" as const;
export const FRESH_DIRECT_PROVIDER_SIGNATURE_SUBMISSION_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_FRESH_DIRECT_PROVIDER_SIGNATURE_SUBMISSION_V1" as const;
export const FRESH_DIRECT_REQUESTER_SIGNING_REQUEST_PACKET_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_FRESH_DIRECT_REQUESTER_SIGNING_REQUEST_PACKET_V1" as const;
export const FRESH_DIRECT_FINALIZATION_INPUT_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_FRESH_DIRECT_QUOTE_AUTHENTICATION_FINALIZATION_V1" as const;
export const FRESH_DIRECT_AUTHENTICATION_PREPARATION_PACKET_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_FRESH_DIRECT_QUOTE_AUTHENTICATION_PREPARATION_PACKET_V1" as const;

export const FRESH_DIRECT_PROVIDER_REQUEST_ID_PREFIX = "voidafdqp1_" as const;
export const FRESH_DIRECT_REQUESTER_REQUEST_ID_PREFIX = "voidafdqr1_" as const;
export const FRESH_DIRECT_PREPARATION_PACKET_ID_PREFIX = "voidafdqa1_" as const;

export const TERMINALLY_RETIRED_DIRECT_QUOTE_IDS_V1 = [
  "voidawq1_c262368c3c51819ff7b8b831d9ec0cfddbf4ccadfba9cdaffbcd16cf361ce86a",
] as const;

export const REQUIRED_PROTECTED_LINEAGE_IDENTIFIERS_V1 = [
  "dafd847bee1e771d868b1ed96a75392749e4107e4303ab7ff32e746a3b6b8fd4",
  "void-first-live-paid-work-canonical-pair-v1-20260802T143340Z-fcd0636bb98f-submission",
] as const;

const PUBLIC_SERVICE_SUBMISSION_PREFIX = "voidawsr1_";
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const SAFE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const QUOTE_ID = /^voidawq1_[0-9a-f]{64}$/;
const SIGNATURE_BASE64 = /^(?:[A-Za-z0-9+/]{4}){21}[A-Za-z0-9+/]{2}==$/;

type RecordValue = Record<string, unknown>;

export type FreshDirectPreparationEvidenceMode =
  | "example_fixture"
  | "operator_approved_public_key_snapshot";

export type FreshDirectQuotePlanV1 = Omit<
  AgentPaidWorkQuoteDraft,
  "work_order_id"
>;

export interface FreshDirectKeyBindingPlanV1 {
  public_key_pem: string;
  valid_from_utc: string;
  expires_at_utc: string;
  revoked_at_utc: string | null;
  binding_nonce: string;
}

export interface FreshDirectAuthenticationPlanV1 {
  created_at_utc: string;
  expires_at_utc: string;
  authentication_nonce: string;
}

export interface FreshDirectLineageGuardV1 {
  retired_quote_ids: string[];
  forbidden_identifiers: string[];
  require_new_quote: true;
  forbid_public_service_submission_id_synthesis: true;
  forbid_protected_lineage_reuse: true;
}

export interface FreshDirectPreparationControlsV1 {
  prepare_only: true;
  public_keys_only: true;
  private_key_input_forbidden: true;
  external_provider_signature_required: true;
  external_requester_signature_required: true;
  atomic_persistence_not_requested: true;
  activation_not_requested: true;
  payment_execution_not_requested: true;
  work_dispatch_not_requested: true;
}

export interface AuthenticatedPaidWorkFreshDirectQuotePreparationInputV1 {
  $schema: typeof FRESH_DIRECT_QUOTE_PREPARATION_SCHEMA_ID;
  marker: typeof FRESH_DIRECT_QUOTE_PREPARATION_INPUT_MARKER;
  version: 1;
  evidence_mode: FreshDirectPreparationEvidenceMode;
  preparation_recorded_at_utc: string;
  work_order_draft: AgentPaidWorkOrderDraft;
  quote_plan: FreshDirectQuotePlanV1;
  acceptance_plan: {
    created_at_utc: string;
    expires_at_utc: string;
    nonce: string;
  };
  payment_authority_plan: {
    created_at_utc: string;
    expires_at_utc: string;
    max_fee_total: string;
    nonce: string;
  };
  provider_key_binding_plan: FreshDirectKeyBindingPlanV1;
  requester_key_binding_plan: FreshDirectKeyBindingPlanV1;
  provider_authentication_plan: FreshDirectAuthenticationPlanV1;
  requester_authentication_plan: FreshDirectAuthenticationPlanV1;
  lineage_guard: FreshDirectLineageGuardV1;
  controls: FreshDirectPreparationControlsV1;
  packet_nonce: string;
}

export interface FreshDirectSigningRequestV1 {
  signature_scheme: typeof DIRECT_AUTHENTICATION_SIGNATURE_SCHEME;
  signature_domain:
    | typeof DIRECT_PROVIDER_SIGNATURE_DOMAIN
    | typeof DIRECT_REQUESTER_SIGNATURE_DOMAIN;
  canonicalization: typeof DIRECT_AUTHENTICATION_CANONICALIZATION;
  signing_bytes_base64: string;
  signing_bytes_sha256: string;
  private_key_required_externally: true;
  private_key_accepted_by_this_contract: false;
}

export interface AuthenticatedPaidWorkFreshDirectProviderSigningRequestPacketV1 {
  marker: typeof FRESH_DIRECT_PROVIDER_SIGNING_REQUEST_PACKET_MARKER;
  version: 1;
  status: "fresh_quote_prepared_provider_signature_required";
  evidence_mode: FreshDirectPreparationEvidenceMode;
  preparation_input_fingerprint_sha256: string;
  preparation_recorded_at_utc: string;
  source: {
    work_order_id: string;
    quote_id: string;
    prepared_packet_id: string;
    prepared_packet_fingerprint_sha256: string;
    acceptance_id: string;
    payment_intent_id: string;
    requester_agent_id: string;
    provider_id: string;
  };
  materialized: {
    work_order: AgentPaidWorkOrderEnvelope;
    quote: AgentPaidWorkQuoteEnvelope;
    quote_acceptance_payment_authority_input:
      AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityInputV1;
    prepared_packet:
      AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityPacketV1;
  };
  key_bindings: {
    provider: DirectProviderKeyBindingV1;
    requester: DirectRequesterKeyBindingV1;
  };
  provider_authentication_body: DirectProviderAuthenticationBodyV1;
  provider_signing_request: FreshDirectSigningRequestV1;
  requester_authentication_plan: FreshDirectAuthenticationPlanV1;
  lineage_guard: {
    retired_quote_ids_checked: number;
    forbidden_identifiers_checked: number;
    required_retired_quote_ids_present: true;
    required_protected_identifiers_present: true;
    generated_public_service_submission_id_present: false;
    generated_protected_identifier_present: false;
  };
  next_gate: {
    reason: "external_provider_signature_required";
    next_action:
      "submit_provider_signature_then_prepare_requester_signing_request";
    requester_signature_required_after_provider_signature: true;
    atomic_persistence_requires_separate_authorization: true;
  };
  authority: ReturnType<typeof noAuthority>;
  packet_nonce: string;
  packet_id: string;
}

export interface AuthenticatedPaidWorkFreshDirectProviderSignatureSubmissionV1 {
  marker: typeof FRESH_DIRECT_PROVIDER_SIGNATURE_SUBMISSION_MARKER;
  version: 1;
  preparation_input: AuthenticatedPaidWorkFreshDirectQuotePreparationInputV1;
  provider_signing_request_packet:
    AuthenticatedPaidWorkFreshDirectProviderSigningRequestPacketV1;
  provider_signature_base64: string;
}

export interface AuthenticatedPaidWorkFreshDirectRequesterSigningRequestPacketV1 {
  marker: typeof FRESH_DIRECT_REQUESTER_SIGNING_REQUEST_PACKET_MARKER;
  version: 1;
  status: "provider_authenticated_requester_signature_required";
  provider_request_packet_id: string;
  preparation_input_fingerprint_sha256: string;
  source: AuthenticatedPaidWorkFreshDirectProviderSigningRequestPacketV1["source"];
  provider_authentication_envelope:
    DirectProviderAuthenticationEnvelopeV1;
  requester_authentication_body: DirectRequesterAuthenticationBodyV1;
  requester_signing_request: FreshDirectSigningRequestV1;
  next_gate: {
    reason: "external_requester_signature_required";
    next_action:
      "submit_requester_signature_then_finalize_direct_authentication_preparation";
    atomic_persistence_requires_separate_authorization: true;
  };
  authority: ReturnType<typeof noAuthority>;
  packet_id: string;
}

export interface AuthenticatedPaidWorkFreshDirectFinalizationInputV1 {
  marker: typeof FRESH_DIRECT_FINALIZATION_INPUT_MARKER;
  version: 1;
  preparation_input: AuthenticatedPaidWorkFreshDirectQuotePreparationInputV1;
  provider_signing_request_packet:
    AuthenticatedPaidWorkFreshDirectProviderSigningRequestPacketV1;
  provider_signature_base64: string;
  requester_signing_request_packet:
    AuthenticatedPaidWorkFreshDirectRequesterSigningRequestPacketV1;
  requester_signature_base64: string;
}

export interface AuthenticatedPaidWorkFreshDirectAuthenticationPreparationPacketV1 {
  marker: typeof FRESH_DIRECT_AUTHENTICATION_PREPARATION_PACKET_MARKER;
  version: 1;
  status:
    | "example_only"
    | "direct_authentication_prepared_requires_separate_atomic_persistence_authorization";
  source: AuthenticatedPaidWorkFreshDirectProviderSigningRequestPacketV1["source"];
  preparation_input_fingerprint_sha256: string;
  provider_request_packet_id: string;
  requester_request_packet_id: string;
  materialized: {
    work_order: AgentPaidWorkOrderEnvelope;
    quote: AgentPaidWorkQuoteEnvelope;
    prepared_packet:
      AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityPacketV1;
    provider_key_binding: DirectProviderKeyBindingV1;
    requester_key_binding: DirectRequesterKeyBindingV1;
    provider_authentication_envelope:
      DirectProviderAuthenticationEnvelopeV1;
    requester_authentication_envelope:
      DirectRequesterAuthenticationEnvelopeV1;
    direct_authentication_packet:
      AuthenticatedPaidWorkDirectQuoteActivationAuthenticationPacketV1;
  };
  preparation_gate: {
    fresh_quote_verified: true;
    retired_quote_reuse_rejected: true;
    protected_lineage_reuse_rejected: true;
    provider_signature_verified: true;
    requester_signature_verified: true;
    direct_authentication_packet_verified: true;
    public_service_submission_id_synthesized: false;
    eligible_for_atomic_activation_persistence: boolean;
    atomic_persistence_performed: false;
  };
  next_gate: {
    reason:
      "fresh_direct_authentication_packet_requires_separate_atomic_persistence_review_and_authorization";
    next_action:
      "review_fresh_packet_then_build_operation_bound_atomic_persistence_plan";
    fresh_operation_bound_confirmation_required: true;
    separate_payment_execution_authorization_required: true;
    separate_work_execution_authorization_required: true;
  };
  authority: ReturnType<typeof noAuthority>;
  packet_id: string;
}

interface PreparationContext {
  input: AuthenticatedPaidWorkFreshDirectQuotePreparationInputV1;
  directEvidenceMode: DirectEvidenceMode;
  workOrder: AgentPaidWorkOrderEnvelope;
  quote: AgentPaidWorkQuoteEnvelope;
  quoteAuthorityInput:
    AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityInputV1;
  preparedPacket:
    AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityPacketV1;
  preparedPacketFingerprint: string;
  providerBinding: DirectProviderKeyBindingV1;
  requesterBinding: DirectRequesterKeyBindingV1;
}

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) fail(message);
}

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function requireRecord(value: unknown, label: string): RecordValue {
  assertCondition(isRecord(value), `${label} must be an object`);
  return value;
}

function requireExactKeys(
  value: RecordValue,
  label: string,
  keys: readonly string[],
): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assertCondition(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} must contain exactly: ${expected.join(", ")}`,
  );
}

function requireString(
  value: unknown,
  label: string,
  pattern?: RegExp,
  minimum = 1,
  maximum = 4096,
): string {
  assertCondition(typeof value === "string", `${label} must be a string`);
  assertCondition(value === value.trim(), `${label} must be trimmed`);
  assertCondition(
    value.length >= minimum && value.length <= maximum,
    `${label} length must be ${minimum}..${maximum}`,
  );
  if (pattern) {
    assertCondition(pattern.test(value), `${label} has invalid format`);
  }
  return value;
}

function requireCanonicalPublicKeyPem(
  value: unknown,
  label: string,
): string {
  assertCondition(typeof value === "string", `${label} must be a string`);
  assertCondition(
    value.length >= 80 && value.length <= 4096,
    `${label} length must be 80..4096`,
  );
  directAuthenticationKeyIdV1(value);
  return value;
}

function requireUtc(value: unknown, label: string): string {
  const text = requireString(value, label, ISO_UTC, 20, 20);
  const milliseconds = Date.parse(text);
  assertCondition(Number.isFinite(milliseconds), `${label} is invalid UTC`);
  assertCondition(
    new Date(milliseconds).toISOString() === text.replace("Z", ".000Z"),
    `${label} is not canonical UTC`,
  );
  return text;
}

function requireTrue(
  record: RecordValue,
  key: string,
  label: string,
): void {
  assertCondition(record[key] === true, `${label}.${key} must be true`);
}

function requireStringArray(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): string[] {
  assertCondition(Array.isArray(value), `${label} must be an array`);
  assertCondition(
    value.length >= minimum && value.length <= maximum,
    `${label} must contain ${minimum}..${maximum} items`,
  );
  const result = value.map((item, index) =>
    requireString(item, `${label}[${index}]`, undefined, 1, 512),
  );
  assertCondition(
    new Set(result).size === result.length,
    `${label} must not contain duplicates`,
  );
  return result;
}

function utcMillis(value: string): number {
  return Date.parse(value);
}

function noAuthority() {
  return {
    live_quote_publication: false,
    quote_acceptance: false,
    acceptance_persistence: false,
    requester_authentication_replay_write: false,
    provider_authentication_replay_write: false,
    acceptance_replay_write: false,
    prepared_packet_replay_write: false,
    payment_intent_replay_write: false,
    payment_authorization: false,
    payment_execution: false,
    payment_destination_resolution: false,
    transaction_construction: false,
    transaction_broadcast: false,
    payment_receipt_creation: false,
    work_execution_authorization: false,
    work_dispatch: false,
    private_key_access: false,
    production_signing: false,
    wallet_access: false,
    work_credit_write: false,
    void_settlement: false,
    http_submission: false,
    runtime_mutation: false,
    service_restart: false,
    deployment: false,
    money_movement: false,
  } as const;
}

function contentId(prefix: string, value: unknown): string {
  return `${prefix}${sha256Hex(canonicalJson(value))}`;
}

function requireCanonicalSignature(
  value: unknown,
  label: string,
): string {
  const signature = requireString(
    value,
    label,
    SIGNATURE_BASE64,
    88,
    88,
  );
  const bytes = Buffer.from(signature, "base64");
  assertCondition(bytes.length === 64, `${label} must decode to 64 bytes`);
  assertCondition(
    bytes.toString("base64") === signature,
    `${label} must use canonical base64`,
  );
  return signature;
}

function verifyEd25519Signature(
  publicKeyPem: string,
  signingBytes: Buffer,
  signatureBase64: string,
  label: string,
): void {
  let key: crypto.KeyObject;
  try {
    key = crypto.createPublicKey(publicKeyPem);
  } catch {
    return fail(`${label} public key is invalid`);
  }
  assertCondition(
    key.asymmetricKeyType === "ed25519",
    `${label} public key must be Ed25519`,
  );
  assertCondition(
    crypto.verify(
      null,
      signingBytes,
      key,
      Buffer.from(signatureBase64, "base64"),
    ),
    `${label} signature verification failed`,
  );
}

function exactKeyBindingPlan(
  value: unknown,
  label: string,
): FreshDirectKeyBindingPlanV1 {
  const root = requireRecord(value, label);
  requireExactKeys(root, label, [
    "public_key_pem",
    "valid_from_utc",
    "expires_at_utc",
    "revoked_at_utc",
    "binding_nonce",
  ]);
  const publicKeyPem = requireCanonicalPublicKeyPem(
    root.public_key_pem,
    `${label}.public_key_pem`,
  );
  const validFromUtc = requireUtc(
    root.valid_from_utc,
    `${label}.valid_from_utc`,
  );
  const expiresAtUtc = requireUtc(
    root.expires_at_utc,
    `${label}.expires_at_utc`,
  );
  assertCondition(
    utcMillis(expiresAtUtc) > utcMillis(validFromUtc),
    `${label} window is invalid`,
  );
  assertCondition(
    root.revoked_at_utc === null,
    `${label}.revoked_at_utc must be null for fresh preparation`,
  );
  const bindingNonce = requireString(
    root.binding_nonce,
    `${label}.binding_nonce`,
    /^[A-Za-z0-9._:-]{16,128}$/,
    16,
    128,
  );
  return {
    public_key_pem: publicKeyPem,
    valid_from_utc: validFromUtc,
    expires_at_utc: expiresAtUtc,
    revoked_at_utc: null,
    binding_nonce: bindingNonce,
  };
}

function exactAuthenticationPlan(
  value: unknown,
  label: string,
): FreshDirectAuthenticationPlanV1 {
  const root = requireRecord(value, label);
  requireExactKeys(root, label, [
    "created_at_utc",
    "expires_at_utc",
    "authentication_nonce",
  ]);
  const createdAtUtc = requireUtc(
    root.created_at_utc,
    `${label}.created_at_utc`,
  );
  const expiresAtUtc = requireUtc(
    root.expires_at_utc,
    `${label}.expires_at_utc`,
  );
  assertCondition(
    utcMillis(expiresAtUtc) > utcMillis(createdAtUtc),
    `${label} window is invalid`,
  );
  const authenticationNonce = requireString(
    root.authentication_nonce,
    `${label}.authentication_nonce`,
    /^[A-Za-z0-9._:-]{16,128}$/,
    16,
    128,
  );
  return {
    created_at_utc: createdAtUtc,
    expires_at_utc: expiresAtUtc,
    authentication_nonce: authenticationNonce,
  };
}

function normalizePreparationInput(
  value: unknown,
): AuthenticatedPaidWorkFreshDirectQuotePreparationInputV1 {
  const root = requireRecord(value, "preparation input");
  requireExactKeys(root, "preparation input", [
    "$schema",
    "marker",
    "version",
    "evidence_mode",
    "preparation_recorded_at_utc",
    "work_order_draft",
    "quote_plan",
    "acceptance_plan",
    "payment_authority_plan",
    "provider_key_binding_plan",
    "requester_key_binding_plan",
    "provider_authentication_plan",
    "requester_authentication_plan",
    "lineage_guard",
    "controls",
    "packet_nonce",
  ]);
  assertCondition(
    root.$schema === FRESH_DIRECT_QUOTE_PREPARATION_SCHEMA_ID,
    "preparation input schema ID mismatch",
  );
  assertCondition(
    root.marker === FRESH_DIRECT_QUOTE_PREPARATION_INPUT_MARKER,
    "preparation input marker mismatch",
  );
  assertCondition(root.version === 1, "preparation input version mismatch");
  assertCondition(
    root.evidence_mode === "example_fixture" ||
      root.evidence_mode === "operator_approved_public_key_snapshot",
    "preparation input evidence_mode mismatch",
  );
  const evidenceMode = root.evidence_mode;
  const preparationRecordedAtUtc = requireUtc(
    root.preparation_recorded_at_utc,
    "preparation_recorded_at_utc",
  );

  const workOrder = materializeAgentPaidWorkOrder(root.work_order_draft);
  const workOrderDraft: AgentPaidWorkOrderDraft = {
    marker: workOrder.marker,
    version: workOrder.version,
    created_at_utc: workOrder.created_at_utc,
    expires_at_utc: workOrder.expires_at_utc,
    requester: workOrder.requester,
    service: workOrder.service,
    commercial: workOrder.commercial,
    execution_limits: workOrder.execution_limits,
    nonce: workOrder.nonce,
  };

  const quotePlanRoot = requireRecord(root.quote_plan, "quote_plan");
  requireExactKeys(quotePlanRoot, "quote_plan", [
    "marker",
    "version",
    "created_at_utc",
    "expires_at_utc",
    "provider",
    "commercial",
    "execution_commitment",
    "terms",
    "nonce",
  ]);
  const quoteDraft = {
    ...quotePlanRoot,
    work_order_id: workOrder.work_order_id,
  };
  const quote = materializeAgentPaidWorkQuote(workOrder, quoteDraft);
  const quotePlan: FreshDirectQuotePlanV1 = {
    marker: quote.marker,
    version: quote.version,
    created_at_utc: quote.created_at_utc,
    expires_at_utc: quote.expires_at_utc,
    provider: quote.provider,
    commercial: quote.commercial,
    execution_commitment: quote.execution_commitment,
    terms: quote.terms,
    nonce: quote.nonce,
  };

  const acceptanceRoot = requireRecord(
    root.acceptance_plan,
    "acceptance_plan",
  );
  requireExactKeys(acceptanceRoot, "acceptance_plan", [
    "created_at_utc",
    "expires_at_utc",
    "nonce",
  ]);
  const acceptancePlan = {
    created_at_utc: requireUtc(
      acceptanceRoot.created_at_utc,
      "acceptance_plan.created_at_utc",
    ),
    expires_at_utc: requireUtc(
      acceptanceRoot.expires_at_utc,
      "acceptance_plan.expires_at_utc",
    ),
    nonce: requireString(
      acceptanceRoot.nonce,
      "acceptance_plan.nonce",
      SAFE_TOKEN,
      1,
      128,
    ),
  };

  const paymentRoot = requireRecord(
    root.payment_authority_plan,
    "payment_authority_plan",
  );
  requireExactKeys(paymentRoot, "payment_authority_plan", [
    "created_at_utc",
    "expires_at_utc",
    "max_fee_total",
    "nonce",
  ]);
  const paymentAuthorityPlan = {
    created_at_utc: requireUtc(
      paymentRoot.created_at_utc,
      "payment_authority_plan.created_at_utc",
    ),
    expires_at_utc: requireUtc(
      paymentRoot.expires_at_utc,
      "payment_authority_plan.expires_at_utc",
    ),
    max_fee_total: requireString(
      paymentRoot.max_fee_total,
      "payment_authority_plan.max_fee_total",
      /^(0|[1-9]\d{0,31})(?:\.\d{1,18})?$/,
      1,
      51,
    ),
    nonce: requireString(
      paymentRoot.nonce,
      "payment_authority_plan.nonce",
      SAFE_TOKEN,
      1,
      128,
    ),
  };

  const providerKeyBindingPlan = exactKeyBindingPlan(
    root.provider_key_binding_plan,
    "provider_key_binding_plan",
  );
  const requesterKeyBindingPlan = exactKeyBindingPlan(
    root.requester_key_binding_plan,
    "requester_key_binding_plan",
  );
  const providerAuthenticationPlan = exactAuthenticationPlan(
    root.provider_authentication_plan,
    "provider_authentication_plan",
  );
  const requesterAuthenticationPlan = exactAuthenticationPlan(
    root.requester_authentication_plan,
    "requester_authentication_plan",
  );

  const lineageRoot = requireRecord(root.lineage_guard, "lineage_guard");
  requireExactKeys(lineageRoot, "lineage_guard", [
    "retired_quote_ids",
    "forbidden_identifiers",
    "require_new_quote",
    "forbid_public_service_submission_id_synthesis",
    "forbid_protected_lineage_reuse",
  ]);
  const retiredQuoteIds = requireStringArray(
    lineageRoot.retired_quote_ids,
    "lineage_guard.retired_quote_ids",
    1,
    64,
  );
  for (const quoteId of retiredQuoteIds) {
    assertCondition(
      QUOTE_ID.test(quoteId),
      "lineage_guard.retired_quote_ids contains an invalid quote ID",
    );
  }
  for (const required of TERMINALLY_RETIRED_DIRECT_QUOTE_IDS_V1) {
    assertCondition(
      retiredQuoteIds.includes(required),
      `lineage_guard must include retired quote ${required}`,
    );
  }
  const forbiddenIdentifiers = requireStringArray(
    lineageRoot.forbidden_identifiers,
    "lineage_guard.forbidden_identifiers",
    REQUIRED_PROTECTED_LINEAGE_IDENTIFIERS_V1.length,
    64,
  );
  for (const required of REQUIRED_PROTECTED_LINEAGE_IDENTIFIERS_V1) {
    assertCondition(
      forbiddenIdentifiers.includes(required),
      `lineage_guard must include protected identifier ${required}`,
    );
  }
  requireTrue(lineageRoot, "require_new_quote", "lineage_guard");
  requireTrue(
    lineageRoot,
    "forbid_public_service_submission_id_synthesis",
    "lineage_guard",
  );
  requireTrue(
    lineageRoot,
    "forbid_protected_lineage_reuse",
    "lineage_guard",
  );

  const controlsRoot = requireRecord(root.controls, "controls");
  const controlKeys = [
    "prepare_only",
    "public_keys_only",
    "private_key_input_forbidden",
    "external_provider_signature_required",
    "external_requester_signature_required",
    "atomic_persistence_not_requested",
    "activation_not_requested",
    "payment_execution_not_requested",
    "work_dispatch_not_requested",
  ] as const;
  requireExactKeys(controlsRoot, "controls", controlKeys);
  for (const key of controlKeys) {
    requireTrue(controlsRoot, key, "controls");
  }

  const packetNonce = requireString(
    root.packet_nonce,
    "packet_nonce",
    /^[A-Za-z0-9._:-]{16,128}$/,
    16,
    128,
  );

  return {
    $schema: FRESH_DIRECT_QUOTE_PREPARATION_SCHEMA_ID,
    marker: FRESH_DIRECT_QUOTE_PREPARATION_INPUT_MARKER,
    version: 1,
    evidence_mode: evidenceMode,
    preparation_recorded_at_utc: preparationRecordedAtUtc,
    work_order_draft: workOrderDraft,
    quote_plan: quotePlan,
    acceptance_plan: acceptancePlan,
    payment_authority_plan: paymentAuthorityPlan,
    provider_key_binding_plan: providerKeyBindingPlan,
    requester_key_binding_plan: requesterKeyBindingPlan,
    provider_authentication_plan: providerAuthenticationPlan,
    requester_authentication_plan: requesterAuthenticationPlan,
    lineage_guard: {
      retired_quote_ids: retiredQuoteIds,
      forbidden_identifiers: forbiddenIdentifiers,
      require_new_quote: true,
      forbid_public_service_submission_id_synthesis: true,
      forbid_protected_lineage_reuse: true,
    },
    controls: {
      prepare_only: true,
      public_keys_only: true,
      private_key_input_forbidden: true,
      external_provider_signature_required: true,
      external_requester_signature_required: true,
      atomic_persistence_not_requested: true,
      activation_not_requested: true,
      payment_execution_not_requested: true,
      work_dispatch_not_requested: true,
    },
    packet_nonce: packetNonce,
  };
}

function assertTimeWindow(
  input: AuthenticatedPaidWorkFreshDirectQuotePreparationInputV1,
  workOrder: AgentPaidWorkOrderEnvelope,
  quote: AgentPaidWorkQuoteEnvelope,
  providerBinding: DirectProviderKeyBindingV1,
  requesterBinding: DirectRequesterKeyBindingV1,
): void {
  const recorded = utcMillis(input.preparation_recorded_at_utc);
  const workCreated = utcMillis(workOrder.created_at_utc);
  const workExpires = utcMillis(workOrder.expires_at_utc);
  const quoteCreated = utcMillis(quote.created_at_utc);
  const quoteExpires = utcMillis(quote.expires_at_utc);
  const acceptanceCreated = utcMillis(input.acceptance_plan.created_at_utc);
  const acceptanceExpires = utcMillis(input.acceptance_plan.expires_at_utc);
  const paymentCreated = utcMillis(
    input.payment_authority_plan.created_at_utc,
  );
  const paymentExpires = utcMillis(
    input.payment_authority_plan.expires_at_utc,
  );
  const providerCreated = utcMillis(
    input.provider_authentication_plan.created_at_utc,
  );
  const providerExpires = utcMillis(
    input.provider_authentication_plan.expires_at_utc,
  );
  const requesterCreated = utcMillis(
    input.requester_authentication_plan.created_at_utc,
  );
  const requesterExpires = utcMillis(
    input.requester_authentication_plan.expires_at_utc,
  );

  assertCondition(
    workCreated <= quoteCreated &&
      quoteCreated <= acceptanceCreated &&
      acceptanceCreated <= paymentCreated &&
      paymentCreated <= providerCreated &&
      providerCreated <= requesterCreated &&
      requesterCreated <= recorded,
    "fresh preparation creation times are out of order",
  );
  assertCondition(
    recorded < workExpires &&
      recorded < quoteExpires &&
      recorded < acceptanceExpires &&
      recorded < paymentExpires &&
      recorded < providerExpires &&
      recorded < requesterExpires,
    "fresh preparation is already expired at preparation_recorded_at_utc",
  );
  assertCondition(
    quoteExpires <= workExpires &&
      acceptanceExpires <= quoteExpires &&
      paymentExpires <= acceptanceExpires &&
      providerExpires <= paymentExpires &&
      requesterExpires <= providerExpires,
    "fresh preparation expiry windows are not nested",
  );

  const providerBindingFrom = utcMillis(providerBinding.valid_from_utc);
  const providerBindingExpires = utcMillis(providerBinding.expires_at_utc);
  const requesterBindingFrom = utcMillis(requesterBinding.valid_from_utc);
  const requesterBindingExpires = utcMillis(requesterBinding.expires_at_utc);

  assertCondition(
    providerBindingFrom <= providerCreated &&
      providerExpires <= providerBindingExpires,
    "provider authentication is outside its binding window",
  );
  assertCondition(
    requesterBindingFrom <= requesterCreated &&
      requesterExpires <= requesterBindingExpires,
    "requester authentication is outside its binding window",
  );
}

function scanGeneratedLineage(
  input: AuthenticatedPaidWorkFreshDirectQuotePreparationInputV1,
  generated: unknown,
): void {
  const text = canonicalJson(generated);
  assertCondition(
    !text.includes(PUBLIC_SERVICE_SUBMISSION_PREFIX),
    "generated preparation contains a public-service submission ID",
  );
  for (const retired of input.lineage_guard.retired_quote_ids) {
    assertCondition(
      !text.includes(retired),
      `generated preparation reuses retired quote ${retired}`,
    );
  }
  for (const forbidden of input.lineage_guard.forbidden_identifiers) {
    assertCondition(
      !text.includes(forbidden),
      `generated preparation reuses protected identifier ${forbidden}`,
    );
  }
}

function buildContext(value: unknown): PreparationContext {
  const input = normalizePreparationInput(value);
  const workOrder = materializeAgentPaidWorkOrder(input.work_order_draft);
  const quoteDraft: AgentPaidWorkQuoteDraft = {
    ...input.quote_plan,
    work_order_id: workOrder.work_order_id,
  };
  const quote = materializeAgentPaidWorkQuote(workOrder, quoteDraft);
  assertCondition(
    !input.lineage_guard.retired_quote_ids.includes(quote.quote_id),
    "fresh quote ID is listed as retired",
  );

  const quoteAuthorityInput:
    AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityInputV1 = {
      marker:
        AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_MARKER,
      version: 1,
      work_order: workOrder,
      quote,
      acceptance_plan: input.acceptance_plan,
      payment_authority_plan: input.payment_authority_plan,
      controls: {
        prepare_only: true,
        authenticated_atomic_activation_required: true,
        requester_authentication_required: true,
        provider_authentication_required: true,
        requester_authentication_id_consumption_required: true,
        provider_authentication_id_consumption_required: true,
        acceptance_id_consumption_required: true,
        payment_intent_id_consumption_required: true,
        atomic_persistence_receipt_required: true,
        single_active_acceptance_per_quote_required: true,
        single_active_payment_intent_per_acceptance_required: true,
        separate_payment_execution_authorization_required: true,
        separate_work_execution_authorization_required: true,
      },
      nonce: input.packet_nonce,
    };
  const preparedPacket =
    materializeAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1(
      quoteAuthorityInput,
    );
  verifyAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1(
    quoteAuthorityInput,
    preparedPacket,
  );
  const preparedPacketFingerprint = sha256Hex(canonicalJson(preparedPacket));

  const bindingStatus =
    input.evidence_mode === "example_fixture"
      ? "example_fixture"
      : "operator_approved_snapshot";
  const directEvidenceMode: DirectEvidenceMode =
    input.evidence_mode === "example_fixture"
      ? "example_fixture"
      : "operator_signed_direct_lineage";

  const providerBindingDraft: DirectProviderKeyBindingDraftV1 = {
    marker: DIRECT_PROVIDER_KEY_BINDING_MARKER,
    version: 1,
    binding_status: bindingStatus,
    provider_id: quote.provider.provider_id,
    authority_scope: DIRECT_PROVIDER_AUTHENTICATION_SCOPE,
    key_id: directAuthenticationKeyIdV1(
      input.provider_key_binding_plan.public_key_pem,
    ),
    public_key_pem: input.provider_key_binding_plan.public_key_pem,
    valid_from_utc: input.provider_key_binding_plan.valid_from_utc,
    expires_at_utc: input.provider_key_binding_plan.expires_at_utc,
    revoked_at_utc: null,
    binding_nonce: input.provider_key_binding_plan.binding_nonce,
  };
  const providerBinding: DirectProviderKeyBindingV1 = {
    ...providerBindingDraft,
    binding_id: directProviderKeyBindingIdV1(providerBindingDraft),
  };

  const requesterBindingDraft: DirectRequesterKeyBindingDraftV1 = {
    marker: DIRECT_REQUESTER_KEY_BINDING_MARKER,
    version: 1,
    binding_status: bindingStatus,
    requester_agent_id: workOrder.requester.agent_id,
    authority_scope: DIRECT_REQUESTER_AUTHENTICATION_SCOPE,
    key_id: directAuthenticationKeyIdV1(
      input.requester_key_binding_plan.public_key_pem,
    ),
    public_key_pem: input.requester_key_binding_plan.public_key_pem,
    valid_from_utc: input.requester_key_binding_plan.valid_from_utc,
    expires_at_utc: input.requester_key_binding_plan.expires_at_utc,
    revoked_at_utc: null,
    binding_nonce: input.requester_key_binding_plan.binding_nonce,
  };
  const requesterBinding: DirectRequesterKeyBindingV1 = {
    ...requesterBindingDraft,
    binding_id: directRequesterKeyBindingIdV1(requesterBindingDraft),
  };

  assertTimeWindow(
    input,
    workOrder,
    quote,
    providerBinding,
    requesterBinding,
  );

  scanGeneratedLineage(input, {
    work_order: workOrder,
    quote,
    prepared_packet: preparedPacket,
    provider_key_binding: providerBinding,
    requester_key_binding: requesterBinding,
  });

  return {
    input,
    directEvidenceMode,
    workOrder,
    quote,
    quoteAuthorityInput,
    preparedPacket,
    preparedPacketFingerprint,
    providerBinding,
    requesterBinding,
  };
}

function providerBody(
  context: PreparationContext,
): DirectProviderAuthenticationBodyV1 {
  return {
    marker: DIRECT_PROVIDER_AUTHENTICATION_EVIDENCE_MARKER,
    version: 1,
    signature_scheme: DIRECT_AUTHENTICATION_SIGNATURE_SCHEME,
    signature_domain: DIRECT_PROVIDER_SIGNATURE_DOMAIN,
    canonicalization: DIRECT_AUTHENTICATION_CANONICALIZATION,
    prepared_packet_id: context.preparedPacket.packet_id,
    prepared_packet_fingerprint_sha256:
      context.preparedPacketFingerprint,
    quote_id: context.quote.quote_id,
    work_order_id: context.workOrder.work_order_id,
    acceptance_id:
      context.preparedPacket.prepared_artifacts.acceptance_envelope
        .acceptance_id,
    payment_intent_id:
      context.preparedPacket.prepared_artifacts.payment_intent_envelope
        .payment_intent_id,
    provider_id: context.quote.provider.provider_id,
    provider_key_binding_id: context.providerBinding.binding_id,
    authentication_nonce:
      context.input.provider_authentication_plan.authentication_nonce,
    created_at_utc:
      context.input.provider_authentication_plan.created_at_utc,
    expires_at_utc:
      context.input.provider_authentication_plan.expires_at_utc,
  };
}

function requesterBody(
  context: PreparationContext,
  providerAuthenticationId: string,
): DirectRequesterAuthenticationBodyV1 {
  return {
    marker: DIRECT_REQUESTER_AUTHENTICATION_EVIDENCE_MARKER,
    version: 1,
    signature_scheme: DIRECT_AUTHENTICATION_SIGNATURE_SCHEME,
    signature_domain: DIRECT_REQUESTER_SIGNATURE_DOMAIN,
    canonicalization: DIRECT_AUTHENTICATION_CANONICALIZATION,
    prepared_packet_id: context.preparedPacket.packet_id,
    prepared_packet_fingerprint_sha256:
      context.preparedPacketFingerprint,
    quote_id: context.quote.quote_id,
    work_order_id: context.workOrder.work_order_id,
    acceptance_id:
      context.preparedPacket.prepared_artifacts.acceptance_envelope
        .acceptance_id,
    payment_intent_id:
      context.preparedPacket.prepared_artifacts.payment_intent_envelope
        .payment_intent_id,
    requester_agent_id: context.workOrder.requester.agent_id,
    requester_key_binding_id: context.requesterBinding.binding_id,
    provider_authentication_id: providerAuthenticationId,
    acceptance_nonce:
      context.preparedPacket.prepared_artifacts.acceptance_envelope.nonce,
    authentication_nonce:
      context.input.requester_authentication_plan.authentication_nonce,
    created_at_utc:
      context.input.requester_authentication_plan.created_at_utc,
    expires_at_utc:
      context.input.requester_authentication_plan.expires_at_utc,
  };
}

function signingRequest(
  body: DirectProviderAuthenticationBodyV1 |
    DirectRequesterAuthenticationBodyV1,
  bytes: Buffer,
): FreshDirectSigningRequestV1 {
  return {
    signature_scheme: DIRECT_AUTHENTICATION_SIGNATURE_SCHEME,
    signature_domain: body.signature_domain,
    canonicalization: DIRECT_AUTHENTICATION_CANONICALIZATION,
    signing_bytes_base64: bytes.toString("base64"),
    signing_bytes_sha256: sha256Hex(bytes),
    private_key_required_externally: true,
    private_key_accepted_by_this_contract: false,
  };
}

type ProviderPacketWithoutId = Omit<
  AuthenticatedPaidWorkFreshDirectProviderSigningRequestPacketV1,
  "packet_id"
>;

export function prepareAuthenticatedPaidWorkFreshDirectProviderSigningRequestV1(
  value: unknown,
): AuthenticatedPaidWorkFreshDirectProviderSigningRequestPacketV1 {
  const context = buildContext(value);
  const body = providerBody(context);
  const bytes = directProviderAuthenticationSigningBytesV1(body);

  const packetWithoutId: ProviderPacketWithoutId = {
    marker: FRESH_DIRECT_PROVIDER_SIGNING_REQUEST_PACKET_MARKER,
    version: 1,
    status: "fresh_quote_prepared_provider_signature_required",
    evidence_mode: context.input.evidence_mode,
    preparation_input_fingerprint_sha256: sha256Hex(
      canonicalJson(context.input),
    ),
    preparation_recorded_at_utc:
      context.input.preparation_recorded_at_utc,
    source: {
      work_order_id: context.workOrder.work_order_id,
      quote_id: context.quote.quote_id,
      prepared_packet_id: context.preparedPacket.packet_id,
      prepared_packet_fingerprint_sha256:
        context.preparedPacketFingerprint,
      acceptance_id:
        context.preparedPacket.prepared_artifacts.acceptance_envelope
          .acceptance_id,
      payment_intent_id:
        context.preparedPacket.prepared_artifacts.payment_intent_envelope
          .payment_intent_id,
      requester_agent_id: context.workOrder.requester.agent_id,
      provider_id: context.quote.provider.provider_id,
    },
    materialized: {
      work_order: context.workOrder,
      quote: context.quote,
      quote_acceptance_payment_authority_input:
        context.quoteAuthorityInput,
      prepared_packet: context.preparedPacket,
    },
    key_bindings: {
      provider: context.providerBinding,
      requester: context.requesterBinding,
    },
    provider_authentication_body: body,
    provider_signing_request: signingRequest(body, bytes),
    requester_authentication_plan:
      context.input.requester_authentication_plan,
    lineage_guard: {
      retired_quote_ids_checked:
        context.input.lineage_guard.retired_quote_ids.length,
      forbidden_identifiers_checked:
        context.input.lineage_guard.forbidden_identifiers.length,
      required_retired_quote_ids_present: true,
      required_protected_identifiers_present: true,
      generated_public_service_submission_id_present: false,
      generated_protected_identifier_present: false,
    },
    next_gate: {
      reason: "external_provider_signature_required",
      next_action:
        "submit_provider_signature_then_prepare_requester_signing_request",
      requester_signature_required_after_provider_signature: true,
      atomic_persistence_requires_separate_authorization: true,
    },
    authority: noAuthority(),
    packet_nonce: context.input.packet_nonce,
  };

  scanGeneratedLineage(context.input, packetWithoutId);

  return {
    ...packetWithoutId,
    packet_id: contentId(
      FRESH_DIRECT_PROVIDER_REQUEST_ID_PREFIX,
      packetWithoutId,
    ),
  };
}

export function verifyAuthenticatedPaidWorkFreshDirectProviderSigningRequestV1(
  inputValue: unknown,
  packetValue: unknown,
): AuthenticatedPaidWorkFreshDirectProviderSigningRequestPacketV1 {
  const expected =
    prepareAuthenticatedPaidWorkFreshDirectProviderSigningRequestV1(
      inputValue,
    );
  assertCondition(
    canonicalJson(packetValue) === canonicalJson(expected),
    "provider signing request packet does not match canonical preparation",
  );
  return expected;
}

function normalizeProviderSubmission(
  value: unknown,
): AuthenticatedPaidWorkFreshDirectProviderSignatureSubmissionV1 {
  const root = requireRecord(value, "provider signature submission");
  requireExactKeys(root, "provider signature submission", [
    "marker",
    "version",
    "preparation_input",
    "provider_signing_request_packet",
    "provider_signature_base64",
  ]);
  assertCondition(
    root.marker === FRESH_DIRECT_PROVIDER_SIGNATURE_SUBMISSION_MARKER,
    "provider signature submission marker mismatch",
  );
  assertCondition(
    root.version === 1,
    "provider signature submission version mismatch",
  );
  const preparationInput = normalizePreparationInput(
    root.preparation_input,
  );
  const expectedProviderPacket =
    prepareAuthenticatedPaidWorkFreshDirectProviderSigningRequestV1(
      preparationInput,
    );
  assertCondition(
    canonicalJson(root.provider_signing_request_packet) ===
      canonicalJson(expectedProviderPacket),
    "provider signing request packet is not canonical for the supplied input",
  );
  const signature = requireCanonicalSignature(
    root.provider_signature_base64,
    "provider_signature_base64",
  );
  return {
    marker: FRESH_DIRECT_PROVIDER_SIGNATURE_SUBMISSION_MARKER,
    version: 1,
    preparation_input: preparationInput,
    provider_signing_request_packet: expectedProviderPacket,
    provider_signature_base64: signature,
  };
}

type RequesterPacketWithoutId = Omit<
  AuthenticatedPaidWorkFreshDirectRequesterSigningRequestPacketV1,
  "packet_id"
>;

export function prepareAuthenticatedPaidWorkFreshDirectRequesterSigningRequestV1(
  value: unknown,
): AuthenticatedPaidWorkFreshDirectRequesterSigningRequestPacketV1 {
  const submission = normalizeProviderSubmission(value);
  const context = buildContext(submission.preparation_input);
  const providerPacket = submission.provider_signing_request_packet;
  const providerBodyValue = providerPacket.provider_authentication_body;
  const providerBytes =
    directProviderAuthenticationSigningBytesV1(providerBodyValue);

  verifyEd25519Signature(
    context.providerBinding.public_key_pem,
    providerBytes,
    submission.provider_signature_base64,
    "provider",
  );

  const providerEnvelope: DirectProviderAuthenticationEnvelopeV1 = {
    ...providerBodyValue,
    signature_base64: submission.provider_signature_base64,
    authentication_id: directProviderAuthenticationIdV1({
      ...providerBodyValue,
      signature_base64: submission.provider_signature_base64,
    }),
  };
  const requesterBodyValue = requesterBody(
    context,
    providerEnvelope.authentication_id,
  );
  const requesterBytes =
    directRequesterAuthenticationSigningBytesV1(requesterBodyValue);

  const packetWithoutId: RequesterPacketWithoutId = {
    marker: FRESH_DIRECT_REQUESTER_SIGNING_REQUEST_PACKET_MARKER,
    version: 1,
    status: "provider_authenticated_requester_signature_required",
    provider_request_packet_id: providerPacket.packet_id,
    preparation_input_fingerprint_sha256:
      providerPacket.preparation_input_fingerprint_sha256,
    source: providerPacket.source,
    provider_authentication_envelope: providerEnvelope,
    requester_authentication_body: requesterBodyValue,
    requester_signing_request: signingRequest(
      requesterBodyValue,
      requesterBytes,
    ),
    next_gate: {
      reason: "external_requester_signature_required",
      next_action:
        "submit_requester_signature_then_finalize_direct_authentication_preparation",
      atomic_persistence_requires_separate_authorization: true,
    },
    authority: noAuthority(),
  };

  scanGeneratedLineage(context.input, packetWithoutId);

  return {
    ...packetWithoutId,
    packet_id: contentId(
      FRESH_DIRECT_REQUESTER_REQUEST_ID_PREFIX,
      packetWithoutId,
    ),
  };
}

export function verifyAuthenticatedPaidWorkFreshDirectRequesterSigningRequestV1(
  submissionValue: unknown,
  packetValue: unknown,
): AuthenticatedPaidWorkFreshDirectRequesterSigningRequestPacketV1 {
  const expected =
    prepareAuthenticatedPaidWorkFreshDirectRequesterSigningRequestV1(
      submissionValue,
    );
  assertCondition(
    canonicalJson(packetValue) === canonicalJson(expected),
    "requester signing request packet does not match canonical preparation",
  );
  return expected;
}

function normalizeFinalizationInput(
  value: unknown,
): AuthenticatedPaidWorkFreshDirectFinalizationInputV1 {
  const root = requireRecord(value, "finalization input");
  requireExactKeys(root, "finalization input", [
    "marker",
    "version",
    "preparation_input",
    "provider_signing_request_packet",
    "provider_signature_base64",
    "requester_signing_request_packet",
    "requester_signature_base64",
  ]);
  assertCondition(
    root.marker === FRESH_DIRECT_FINALIZATION_INPUT_MARKER,
    "finalization input marker mismatch",
  );
  assertCondition(root.version === 1, "finalization input version mismatch");

  const providerSubmission =
    normalizeProviderSubmission({
      marker: FRESH_DIRECT_PROVIDER_SIGNATURE_SUBMISSION_MARKER,
      version: 1,
      preparation_input: root.preparation_input,
      provider_signing_request_packet:
        root.provider_signing_request_packet,
      provider_signature_base64: root.provider_signature_base64,
    });
  const expectedRequesterPacket =
    prepareAuthenticatedPaidWorkFreshDirectRequesterSigningRequestV1(
      providerSubmission,
    );
  assertCondition(
    canonicalJson(root.requester_signing_request_packet) ===
      canonicalJson(expectedRequesterPacket),
    "requester signing request packet is not canonical",
  );
  const requesterSignature = requireCanonicalSignature(
    root.requester_signature_base64,
    "requester_signature_base64",
  );

  return {
    marker: FRESH_DIRECT_FINALIZATION_INPUT_MARKER,
    version: 1,
    preparation_input: providerSubmission.preparation_input,
    provider_signing_request_packet:
      providerSubmission.provider_signing_request_packet,
    provider_signature_base64:
      providerSubmission.provider_signature_base64,
    requester_signing_request_packet: expectedRequesterPacket,
    requester_signature_base64: requesterSignature,
  };
}

type FinalPacketWithoutId = Omit<
  AuthenticatedPaidWorkFreshDirectAuthenticationPreparationPacketV1,
  "packet_id"
>;

export function finalizeAuthenticatedPaidWorkFreshDirectAuthenticationPreparationV1(
  value: unknown,
): AuthenticatedPaidWorkFreshDirectAuthenticationPreparationPacketV1 {
  const input = normalizeFinalizationInput(value);
  const context = buildContext(input.preparation_input);
  const providerPacket = input.provider_signing_request_packet;
  const requesterPacket = input.requester_signing_request_packet;

  const requesterBodyValue =
    requesterPacket.requester_authentication_body;
  const requesterBytes =
    directRequesterAuthenticationSigningBytesV1(requesterBodyValue);
  verifyEd25519Signature(
    context.requesterBinding.public_key_pem,
    requesterBytes,
    input.requester_signature_base64,
    "requester",
  );

  const requesterEnvelope: DirectRequesterAuthenticationEnvelopeV1 = {
    ...requesterBodyValue,
    signature_base64: input.requester_signature_base64,
    authentication_id: directRequesterAuthenticationIdV1({
      ...requesterBodyValue,
      signature_base64: input.requester_signature_base64,
    }),
  };

  const directInput:
    AuthenticatedPaidWorkDirectQuoteActivationAuthenticationInputV1 = {
      marker: DIRECT_AUTHENTICATION_INPUT_MARKER,
      version: 1,
      evidence_mode: context.directEvidenceMode,
      prepared_packet: context.preparedPacket,
      provider_key_binding: context.providerBinding,
      provider_authentication_envelope:
        requesterPacket.provider_authentication_envelope,
      requester_key_binding: context.requesterBinding,
      requester_authentication_envelope: requesterEnvelope,
    };
  const directPacket =
    materializeAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1(
      directInput,
    );
  verifyAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1(
    directInput,
    directPacket,
  );
  assertCondition(
    directPacket.activation_gate
      .public_service_submission_id_synthesized === false,
    "direct authentication synthesized a public-service submission ID",
  );
  assertCondition(
    directPacket.activation_gate.effective_quote_acceptance === false &&
      directPacket.activation_gate.effective_payment_authorization ===
        false,
    "direct authentication exceeded preparation authority",
  );

  const packetWithoutId: FinalPacketWithoutId = {
    marker: FRESH_DIRECT_AUTHENTICATION_PREPARATION_PACKET_MARKER,
    version: 1,
    status:
      context.input.evidence_mode === "example_fixture"
        ? "example_only"
        : "direct_authentication_prepared_requires_separate_atomic_persistence_authorization",
    source: providerPacket.source,
    preparation_input_fingerprint_sha256:
      providerPacket.preparation_input_fingerprint_sha256,
    provider_request_packet_id: providerPacket.packet_id,
    requester_request_packet_id: requesterPacket.packet_id,
    materialized: {
      work_order: context.workOrder,
      quote: context.quote,
      prepared_packet: context.preparedPacket,
      provider_key_binding: context.providerBinding,
      requester_key_binding: context.requesterBinding,
      provider_authentication_envelope:
        requesterPacket.provider_authentication_envelope,
      requester_authentication_envelope: requesterEnvelope,
      direct_authentication_packet: directPacket,
    },
    preparation_gate: {
      fresh_quote_verified: true,
      retired_quote_reuse_rejected: true,
      protected_lineage_reuse_rejected: true,
      provider_signature_verified: true,
      requester_signature_verified: true,
      direct_authentication_packet_verified: true,
      public_service_submission_id_synthesized: false,
      eligible_for_atomic_activation_persistence:
        directPacket.activation_gate
          .eligible_for_atomic_activation_persistence,
      atomic_persistence_performed: false,
    },
    next_gate: {
      reason:
        "fresh_direct_authentication_packet_requires_separate_atomic_persistence_review_and_authorization",
      next_action:
        "review_fresh_packet_then_build_operation_bound_atomic_persistence_plan",
      fresh_operation_bound_confirmation_required: true,
      separate_payment_execution_authorization_required: true,
      separate_work_execution_authorization_required: true,
    },
    authority: noAuthority(),
  };

  scanGeneratedLineage(context.input, packetWithoutId);

  return {
    ...packetWithoutId,
    packet_id: contentId(
      FRESH_DIRECT_PREPARATION_PACKET_ID_PREFIX,
      packetWithoutId,
    ),
  };
}

export function verifyAuthenticatedPaidWorkFreshDirectAuthenticationPreparationV1(
  finalizationInputValue: unknown,
  packetValue: unknown,
): AuthenticatedPaidWorkFreshDirectAuthenticationPreparationPacketV1 {
  const expected =
    finalizeAuthenticatedPaidWorkFreshDirectAuthenticationPreparationV1(
      finalizationInputValue,
    );
  assertCondition(
    canonicalJson(packetValue) === canonicalJson(expected),
    "final preparation packet does not match canonical finalization",
  );
  return expected;
}

export function freshDirectQuoteAuthenticationPreparationDependencyIdentityV1() {
  return {
    work_order_materializer: "materializeAgentPaidWorkOrder",
    quote_materializer: "materializeAgentPaidWorkQuote",
    quote_acceptance_payment_authority_materializer:
      "materializeAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1",
    direct_authentication_materializer:
      "materializeAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1",
    provider_signing_bytes:
      "directProviderAuthenticationSigningBytesV1",
    requester_signing_bytes:
      "directRequesterAuthenticationSigningBytesV1",
    persistence_adapter_invoked: false,
    production_signing_invoked: false,
  } as const;
}
