import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const DIRECT_AUTHENTICATION_INPUT_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_DIRECT_QUOTE_ACTIVATION_AUTHENTICATION_V1" as const;
export const DIRECT_AUTHENTICATION_PACKET_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_DIRECT_QUOTE_ACTIVATION_AUTHENTICATION_PACKET_V1" as const;
export const DIRECT_PROVIDER_KEY_BINDING_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_DIRECT_PROVIDER_KEY_BINDING_V1" as const;
export const DIRECT_REQUESTER_KEY_BINDING_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_DIRECT_REQUESTER_KEY_BINDING_V1" as const;
export const DIRECT_PROVIDER_AUTHENTICATION_EVIDENCE_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_DIRECT_PROVIDER_AUTHENTICATION_EVIDENCE_V1" as const;
export const DIRECT_REQUESTER_AUTHENTICATION_EVIDENCE_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_DIRECT_REQUESTER_AUTHENTICATION_EVIDENCE_V1" as const;

export const DIRECT_PROVIDER_AUTHENTICATION_SCOPE =
  "authenticated_paid_work_direct_quote_activate" as const;
export const DIRECT_REQUESTER_AUTHENTICATION_SCOPE =
  "agent_paid_work_accept" as const;
export const DIRECT_AUTHENTICATION_SIGNATURE_SCHEME =
  "ed25519-spki-sha256-v1" as const;
export const DIRECT_AUTHENTICATION_CANONICALIZATION =
  "void-canonical-json-v1" as const;
export const DIRECT_PROVIDER_SIGNATURE_DOMAIN =
  "VOID_AUTHENTICATED_PAID_WORK_DIRECT_PROVIDER_AUTHENTICATION_V1" as const;
export const DIRECT_REQUESTER_SIGNATURE_DOMAIN =
  "VOID_AUTHENTICATED_PAID_WORK_DIRECT_REQUESTER_AUTHENTICATION_V1" as const;

export const DIRECT_PROVIDER_KEY_BINDING_ID_PREFIX = "voidadpkb1_" as const;
export const DIRECT_REQUESTER_KEY_BINDING_ID_PREFIX = "voidadrkb1_" as const;
export const DIRECT_PROVIDER_AUTHENTICATION_ID_PREFIX = "voidadpa1_" as const;
export const DIRECT_REQUESTER_AUTHENTICATION_ID_PREFIX = "voidadra1_" as const;
export const DIRECT_AUTHENTICATION_PACKET_ID_PREFIX = "voidadauth1_" as const;

const MAX_JSON_BYTES = 32 * 1024 * 1024;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const KEY_ID = /^ed25519:[0-9a-f]{64}$/;
const PACKET_ID = /^voidawqapa1_[0-9a-f]{64}$/;
const ACCEPTANCE_ID = /^voidawa1_[0-9a-f]{64}$/;
const PAYMENT_INTENT_ID = /^voidawpi1_[0-9a-f]{64}$/;
const QUOTE_ID = /^voidawq1_[0-9a-f]{64}$/;
const WORK_ORDER_ID = /^voidawo1_[0-9a-f]{64}$/;
const PROVIDER_BINDING_ID = /^voidadpkb1_[0-9a-f]{64}$/;
const REQUESTER_BINDING_ID = /^voidadrkb1_[0-9a-f]{64}$/;
const PROVIDER_AUTH_ID = /^voidadpa1_[0-9a-f]{64}$/;
const REQUESTER_AUTH_ID = /^voidadra1_[0-9a-f]{64}$/;
const OUTPUT_PACKET_ID = /^voidadauth1_[0-9a-f]{64}$/;
const BASE64_SIGNATURE = /^(?:[A-Za-z0-9+/]{4}){21}[A-Za-z0-9+/]{2}==$/;

type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };
type RecordValue = Record<string, unknown>;

export type DirectEvidenceMode =
  | "example_fixture"
  | "operator_signed_direct_lineage";

export interface DirectProviderKeyBindingDraftV1 {
  marker: typeof DIRECT_PROVIDER_KEY_BINDING_MARKER;
  version: 1;
  binding_status: "example_fixture" | "operator_approved_snapshot";
  provider_id: string;
  authority_scope: typeof DIRECT_PROVIDER_AUTHENTICATION_SCOPE;
  key_id: string;
  public_key_pem: string;
  valid_from_utc: string;
  expires_at_utc: string;
  revoked_at_utc: string | null;
  binding_nonce: string;
}
export interface DirectProviderKeyBindingV1
  extends DirectProviderKeyBindingDraftV1 {
  binding_id: string;
}

export interface DirectRequesterKeyBindingDraftV1 {
  marker: typeof DIRECT_REQUESTER_KEY_BINDING_MARKER;
  version: 1;
  binding_status: "example_fixture" | "operator_approved_snapshot";
  requester_agent_id: string;
  authority_scope: typeof DIRECT_REQUESTER_AUTHENTICATION_SCOPE;
  key_id: string;
  public_key_pem: string;
  valid_from_utc: string;
  expires_at_utc: string;
  revoked_at_utc: string | null;
  binding_nonce: string;
}
export interface DirectRequesterKeyBindingV1
  extends DirectRequesterKeyBindingDraftV1 {
  binding_id: string;
}

export interface DirectProviderAuthenticationBodyV1 {
  marker: typeof DIRECT_PROVIDER_AUTHENTICATION_EVIDENCE_MARKER;
  version: 1;
  signature_scheme: typeof DIRECT_AUTHENTICATION_SIGNATURE_SCHEME;
  signature_domain: typeof DIRECT_PROVIDER_SIGNATURE_DOMAIN;
  canonicalization: typeof DIRECT_AUTHENTICATION_CANONICALIZATION;
  prepared_packet_id: string;
  prepared_packet_fingerprint_sha256: string;
  quote_id: string;
  work_order_id: string;
  acceptance_id: string;
  payment_intent_id: string;
  provider_id: string;
  provider_key_binding_id: string;
  authentication_nonce: string;
  created_at_utc: string;
  expires_at_utc: string;
}
export interface DirectProviderAuthenticationEnvelopeV1
  extends DirectProviderAuthenticationBodyV1 {
  signature_base64: string;
  authentication_id: string;
}

export interface DirectRequesterAuthenticationBodyV1 {
  marker: typeof DIRECT_REQUESTER_AUTHENTICATION_EVIDENCE_MARKER;
  version: 1;
  signature_scheme: typeof DIRECT_AUTHENTICATION_SIGNATURE_SCHEME;
  signature_domain: typeof DIRECT_REQUESTER_SIGNATURE_DOMAIN;
  canonicalization: typeof DIRECT_AUTHENTICATION_CANONICALIZATION;
  prepared_packet_id: string;
  prepared_packet_fingerprint_sha256: string;
  quote_id: string;
  work_order_id: string;
  acceptance_id: string;
  payment_intent_id: string;
  requester_agent_id: string;
  requester_key_binding_id: string;
  provider_authentication_id: string;
  acceptance_nonce: string;
  authentication_nonce: string;
  created_at_utc: string;
  expires_at_utc: string;
}
export interface DirectRequesterAuthenticationEnvelopeV1
  extends DirectRequesterAuthenticationBodyV1 {
  signature_base64: string;
  authentication_id: string;
}

export interface AuthenticatedPaidWorkDirectQuoteActivationAuthenticationInputV1 {
  marker: typeof DIRECT_AUTHENTICATION_INPUT_MARKER;
  version: 1;
  evidence_mode: DirectEvidenceMode;
  prepared_packet: unknown;
  provider_key_binding: DirectProviderKeyBindingV1;
  provider_authentication_envelope: DirectProviderAuthenticationEnvelopeV1;
  requester_key_binding: DirectRequesterKeyBindingV1;
  requester_authentication_envelope: DirectRequesterAuthenticationEnvelopeV1;
}

export interface AuthenticatedPaidWorkDirectQuoteActivationAuthenticationPacketV1 {
  marker: typeof DIRECT_AUTHENTICATION_PACKET_MARKER;
  version: 1;
  status:
    | "example_only"
    | "direct_lineage_authenticated_for_atomic_activation";
  source: {
    prepared_packet_id: string;
    prepared_packet_fingerprint_sha256: string;
    quote_id: string;
    work_order_id: string;
    acceptance_id: string;
    payment_intent_id: string;
    requester_agent_id: string;
    provider_id: string;
  };
  provider_authentication: {
    authentication_id: string;
    key_binding_id: string;
    key_id: string;
    scope: typeof DIRECT_PROVIDER_AUTHENTICATION_SCOPE;
    signature_verified: true;
    direct_lineage_verified: true;
  };
  requester_authentication: {
    authentication_id: string;
    key_binding_id: string;
    key_id: string;
    scope: typeof DIRECT_REQUESTER_AUTHENTICATION_SCOPE;
    signature_verified: true;
    direct_lineage_verified: true;
    provider_authentication_id_bound: true;
  };
  activation_gate: {
    eligible_for_atomic_activation_persistence: boolean;
    public_service_submission_id_required: false;
    public_service_submission_id_synthesized: false;
    prepared_packet_verification_required_at_persistence: true;
    provider_authentication_id_consumption_required: true;
    requester_authentication_id_consumption_required: true;
    acceptance_id_consumption_required: true;
    payment_intent_id_consumption_required: true;
    prepared_packet_id_consumption_required: true;
    single_active_acceptance_per_quote_required: true;
    single_active_payment_intent_per_acceptance_required: true;
    atomic_persistence_required: true;
    provider_authentication_id_consumed: false;
    requester_authentication_id_consumed: false;
    acceptance_id_consumed: false;
    payment_intent_id_consumed: false;
    prepared_packet_id_consumed: false;
    effective_quote_acceptance: false;
    effective_payment_authorization: false;
  };
  next_gate: {
    reason: "direct_authentication_packet_requires_atomic_persistence_adapter_integration";
    next_action: "integrate_direct_authentication_packet_with_activation_persistence";
    new_quote_required_for_expired_lineage: true;
    separate_payment_execution_authorization_required: true;
  };
  authority: ReturnType<typeof noAuthority>;
  packet_id: string;
}

type OutputWithoutId = Omit<
  AuthenticatedPaidWorkDirectQuoteActivationAuthenticationPacketV1,
  "packet_id"
>;

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
  maximum = 512,
): string {
  assertCondition(typeof value === "string", `${label} must be a string`);
  assertCondition(value === value.trim(), `${label} must be trimmed`);
  assertCondition(
    value.length >= minimum && value.length <= maximum,
    `${label} length must be ${minimum}..${maximum}`,
  );
  if (pattern) assertCondition(pattern.test(value), `${label} has invalid format`);
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
function parseUtc(value: string): number {
  return Date.parse(value);
}

function canonicalize(value: unknown): JsonValue {
  if (value === null) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    assertCondition(
      Number.isFinite(value) && Number.isSafeInteger(value),
      "canonical JSON numbers must be finite safe integers",
    );
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  const record = requireRecord(value, "canonical JSON value");
  const result: { [key: string]: JsonValue } = {};
  for (const key of Object.keys(record).sort()) {
    const child = record[key];
    assertCondition(child !== undefined, "canonical JSON rejects undefined");
    result[key] = canonicalize(child);
  }
  return result;
}
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}
export function sha256Hex(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonicalFingerprint(value: unknown): string {
  return sha256Hex(canonicalJson(value));
}
function requireCanonicalPublicKeyPem(value: unknown, label: string): string {
  assertCondition(typeof value === "string", `${label} must be a string`);
  assertCondition(
    value.length >= 80 && value.length <= 4096,
    `${label} length must be 80..4096`,
  );
  publicKeyFromPem(value);
  return value;
}

function publicKeyFromPem(value: string): crypto.KeyObject {
  let key: crypto.KeyObject;
  try {
    key = crypto.createPublicKey(value);
  } catch {
    return fail("public key PEM is invalid");
  }
  assertCondition(key.asymmetricKeyType === "ed25519", "public key must be Ed25519");
  const canonical = key.export({ type: "spki", format: "pem" }).toString();
  assertCondition(canonical === value, "public key PEM is not canonical SPKI");
  return key;
}
export function directAuthenticationKeyIdV1(publicKeyPem: string): string {
  const key = publicKeyFromPem(publicKeyPem);
  const der = key.export({ type: "spki", format: "der" });
  return `ed25519:${sha256Hex(der)}`;
}

function exactProviderBindingDraft(
  value: DirectProviderKeyBindingDraftV1,
): DirectProviderKeyBindingDraftV1 {
  return {
    marker: value.marker,
    version: value.version,
    binding_status: value.binding_status,
    provider_id: value.provider_id,
    authority_scope: value.authority_scope,
    key_id: value.key_id,
    public_key_pem: value.public_key_pem,
    valid_from_utc: value.valid_from_utc,
    expires_at_utc: value.expires_at_utc,
    revoked_at_utc: value.revoked_at_utc,
    binding_nonce: value.binding_nonce,
  };
}
export function directProviderKeyBindingIdV1(
  value: DirectProviderKeyBindingDraftV1,
): string {
  return `${DIRECT_PROVIDER_KEY_BINDING_ID_PREFIX}${sha256Hex(
    canonicalJson(exactProviderBindingDraft(value)),
  )}`;
}
function exactRequesterBindingDraft(
  value: DirectRequesterKeyBindingDraftV1,
): DirectRequesterKeyBindingDraftV1 {
  return {
    marker: value.marker,
    version: value.version,
    binding_status: value.binding_status,
    requester_agent_id: value.requester_agent_id,
    authority_scope: value.authority_scope,
    key_id: value.key_id,
    public_key_pem: value.public_key_pem,
    valid_from_utc: value.valid_from_utc,
    expires_at_utc: value.expires_at_utc,
    revoked_at_utc: value.revoked_at_utc,
    binding_nonce: value.binding_nonce,
  };
}
export function directRequesterKeyBindingIdV1(
  value: DirectRequesterKeyBindingDraftV1,
): string {
  return `${DIRECT_REQUESTER_KEY_BINDING_ID_PREFIX}${sha256Hex(
    canonicalJson(exactRequesterBindingDraft(value)),
  )}`;
}

function exactProviderAuthenticationBody(
  value: DirectProviderAuthenticationBodyV1,
): DirectProviderAuthenticationBodyV1 {
  return {
    marker: value.marker,
    version: value.version,
    signature_scheme: value.signature_scheme,
    signature_domain: value.signature_domain,
    canonicalization: value.canonicalization,
    prepared_packet_id: value.prepared_packet_id,
    prepared_packet_fingerprint_sha256:
      value.prepared_packet_fingerprint_sha256,
    quote_id: value.quote_id,
    work_order_id: value.work_order_id,
    acceptance_id: value.acceptance_id,
    payment_intent_id: value.payment_intent_id,
    provider_id: value.provider_id,
    provider_key_binding_id: value.provider_key_binding_id,
    authentication_nonce: value.authentication_nonce,
    created_at_utc: value.created_at_utc,
    expires_at_utc: value.expires_at_utc,
  };
}
export function directProviderAuthenticationSigningBytesV1(
  value: DirectProviderAuthenticationBodyV1,
): Buffer {
  return Buffer.from(canonicalJson(exactProviderAuthenticationBody(value)), "utf8");
}
export function directProviderAuthenticationIdV1(
  value: DirectProviderAuthenticationBodyV1 & { signature_base64: string },
): string {
  return `${DIRECT_PROVIDER_AUTHENTICATION_ID_PREFIX}${sha256Hex(
    canonicalJson({
      ...exactProviderAuthenticationBody(value),
      signature_base64: value.signature_base64,
    }),
  )}`;
}

function exactRequesterAuthenticationBody(
  value: DirectRequesterAuthenticationBodyV1,
): DirectRequesterAuthenticationBodyV1 {
  return {
    marker: value.marker,
    version: value.version,
    signature_scheme: value.signature_scheme,
    signature_domain: value.signature_domain,
    canonicalization: value.canonicalization,
    prepared_packet_id: value.prepared_packet_id,
    prepared_packet_fingerprint_sha256:
      value.prepared_packet_fingerprint_sha256,
    quote_id: value.quote_id,
    work_order_id: value.work_order_id,
    acceptance_id: value.acceptance_id,
    payment_intent_id: value.payment_intent_id,
    requester_agent_id: value.requester_agent_id,
    requester_key_binding_id: value.requester_key_binding_id,
    provider_authentication_id: value.provider_authentication_id,
    acceptance_nonce: value.acceptance_nonce,
    authentication_nonce: value.authentication_nonce,
    created_at_utc: value.created_at_utc,
    expires_at_utc: value.expires_at_utc,
  };
}
export function directRequesterAuthenticationSigningBytesV1(
  value: DirectRequesterAuthenticationBodyV1,
): Buffer {
  return Buffer.from(canonicalJson(exactRequesterAuthenticationBody(value)), "utf8");
}
export function directRequesterAuthenticationIdV1(
  value: DirectRequesterAuthenticationBodyV1 & { signature_base64: string },
): string {
  return `${DIRECT_REQUESTER_AUTHENTICATION_ID_PREFIX}${sha256Hex(
    canonicalJson({
      ...exactRequesterAuthenticationBody(value),
      signature_base64: value.signature_base64,
    }),
  )}`;
}

function noAuthority() {
  return {
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
    wallet_access: false,
    production_signing: false,
    work_credit_write: false,
    void_settlement: false,
    http_submission: false,
    runtime_mutation: false,
    service_restart: false,
    deployment: false,
    money_movement: false,
  } as const;
}

interface PreparedSummary {
  packetId: string;
  packetFingerprint: string;
  quoteId: string;
  workOrderId: string;
  acceptanceId: string;
  paymentIntentId: string;
  requesterAgentId: string;
  providerId: string;
  acceptanceNonce: string;
  expiryUtc: string;
}

function validateAllFalse(value: unknown, label: string): void {
  const record = requireRecord(value, label);
  for (const [key, child] of Object.entries(record)) {
    assertCondition(child === false || child === null, `${label}.${key} must be false or null`);
  }
}

function validatePreparedPacket(value: unknown): PreparedSummary {
  const root = requireRecord(value, "prepared_packet");
  assertCondition(
    root.marker ===
      "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_PACKET_V1",
    "prepared packet marker mismatch",
  );
  assertCondition(root.version === 1, "prepared packet version mismatch");
  assertCondition(
    root.status === "prepared_requires_authenticated_atomic_activation",
    "prepared packet status mismatch",
  );
  const packetId = requireString(root.packet_id, "prepared_packet.packet_id", PACKET_ID, 76, 76);
  const source = requireRecord(root.source, "prepared_packet.source");
  const quoteId = requireString(source.quote_id, "source.quote_id", QUOTE_ID, 73, 73);
  const workOrderId = requireString(
    source.work_order_id,
    "source.work_order_id",
    WORK_ORDER_ID,
    73,
    73,
  );
  const requesterAgentId = requireString(
    source.requester_agent_id,
    "source.requester_agent_id",
    SAFE_ID,
    3,
    128,
  );
  const providerId = requireString(
    source.provider_id,
    "source.provider_id",
    SAFE_ID,
    3,
    128,
  );
  const prepared = requireRecord(root.prepared_artifacts, "prepared_packet.prepared_artifacts");
  const acceptance = requireRecord(
    prepared.acceptance_envelope,
    "prepared acceptance",
  );
  const paymentIntent = requireRecord(
    prepared.payment_intent_envelope,
    "prepared payment intent",
  );
  assertCondition(
    acceptance.marker === "VOID_AGENT_PAID_WORK_ACCEPTANCE_ENVELOPE_V1",
    "acceptance marker mismatch",
  );
  assertCondition(
    paymentIntent.marker === "VOID_AGENT_PAID_WORK_PAYMENT_INTENT_ENVELOPE_V1",
    "payment-intent marker mismatch",
  );
  const acceptanceId = requireString(
    acceptance.acceptance_id,
    "acceptance.acceptance_id",
    ACCEPTANCE_ID,
    73,
    73,
  );
  const paymentIntentId = requireString(
    paymentIntent.payment_intent_id,
    "payment_intent.payment_intent_id",
    PAYMENT_INTENT_ID,
    74,
    74,
  );
  assertCondition(acceptance.quote_id === quoteId, "acceptance quote binding mismatch");
  assertCondition(
    acceptance.work_order_id === workOrderId,
    "acceptance work-order binding mismatch",
  );
  const acceptanceRequester = requireRecord(
    acceptance.requester,
    "acceptance.requester",
  );
  const acceptanceProvider = requireRecord(
    acceptance.provider,
    "acceptance.provider",
  );
  assertCondition(
    acceptanceRequester.agent_id === requesterAgentId,
    "acceptance requester binding mismatch",
  );
  assertCondition(
    acceptanceProvider.provider_id === providerId,
    "acceptance provider binding mismatch",
  );
  assertCondition(paymentIntent.quote_id === quoteId, "payment-intent quote binding mismatch");
  assertCondition(
    paymentIntent.work_order_id === workOrderId,
    "payment-intent work-order binding mismatch",
  );
  assertCondition(
    paymentIntent.acceptance_id === acceptanceId,
    "payment-intent acceptance binding mismatch",
  );
  const paymentRequester = requireRecord(
    paymentIntent.requester,
    "payment_intent.requester",
  );
  const paymentProvider = requireRecord(
    paymentIntent.provider,
    "payment_intent.provider",
  );
  assertCondition(
    paymentRequester.agent_id === requesterAgentId,
    "payment-intent requester binding mismatch",
  );
  assertCondition(
    paymentProvider.provider_id === providerId,
    "payment-intent provider binding mismatch",
  );
  const acceptanceNonce = requireString(
    acceptance.nonce,
    "acceptance.nonce",
    /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/,
    1,
    128,
  );
  const acceptanceExpiry = requireUtc(
    acceptance.expires_at_utc,
    "acceptance.expires_at_utc",
  );
  const paymentExpiry = requireUtc(
    paymentIntent.expires_at_utc,
    "payment_intent.expires_at_utc",
  );
  const expiryUtc =
    parseUtc(paymentExpiry) <= parseUtc(acceptanceExpiry)
      ? paymentExpiry
      : acceptanceExpiry;
  const acceptanceGate = requireRecord(
    root.acceptance_gate,
    "prepared_packet.acceptance_gate",
  );
  assertCondition(
    acceptanceGate.acceptance_candidate_materialized === true,
    "prepared acceptance candidate missing",
  );
  assertCondition(
    acceptanceGate.effective_quote_acceptance === false,
    "prepared packet already has effective quote acceptance",
  );
  const paymentGate = requireRecord(
    root.payment_authority_gate,
    "prepared_packet.payment_authority_gate",
  );
  assertCondition(
    paymentGate.payment_intent_candidate_materialized === true,
    "prepared payment-intent candidate missing",
  );
  assertCondition(
    paymentGate.effective_payment_authorization === false,
    "prepared packet already has effective payment authority",
  );
  assertCondition(
    paymentGate.payment_execution_authorized === false,
    "prepared packet already authorizes payment execution",
  );
  validateAllFalse(root.authority, "prepared_packet.authority");
  return {
    packetId,
    packetFingerprint: canonicalFingerprint(root),
    quoteId,
    workOrderId,
    acceptanceId,
    paymentIntentId,
    requesterAgentId,
    providerId,
    acceptanceNonce,
    expiryUtc,
  };
}

function validateProviderBinding(
  value: unknown,
  mode: DirectEvidenceMode,
  summary: PreparedSummary,
): DirectProviderKeyBindingV1 {
  const root = requireRecord(value, "provider_key_binding");
  requireExactKeys(root, "provider_key_binding", [
    "marker",
    "version",
    "binding_status",
    "provider_id",
    "authority_scope",
    "key_id",
    "public_key_pem",
    "valid_from_utc",
    "expires_at_utc",
    "revoked_at_utc",
    "binding_nonce",
    "binding_id",
  ]);
  assertCondition(root.marker === DIRECT_PROVIDER_KEY_BINDING_MARKER, "provider binding marker mismatch");
  assertCondition(root.version === 1, "provider binding version mismatch");
  const expectedStatus = mode === "example_fixture" ? "example_fixture" : "operator_approved_snapshot";
  assertCondition(root.binding_status === expectedStatus, "provider binding status mismatch");
  assertCondition(root.provider_id === summary.providerId, "provider binding identity mismatch");
  assertCondition(root.authority_scope === DIRECT_PROVIDER_AUTHENTICATION_SCOPE, "provider binding scope mismatch");
  const publicKeyPem = requireCanonicalPublicKeyPem(
    root.public_key_pem,
    "provider public key",
  );
  const keyId = requireString(root.key_id, "provider key_id", KEY_ID, 72, 72);
  assertCondition(keyId === directAuthenticationKeyIdV1(publicKeyPem), "provider key_id mismatch");
  const validFromUtc = requireUtc(root.valid_from_utc, "provider valid_from_utc");
  const expiresAtUtc = requireUtc(root.expires_at_utc, "provider expires_at_utc");
  assertCondition(parseUtc(expiresAtUtc) > parseUtc(validFromUtc), "provider binding window invalid");
  const revokedAtUtc = root.revoked_at_utc === null ? null : requireUtc(root.revoked_at_utc, "provider revoked_at_utc");
  const bindingNonce = requireString(root.binding_nonce, "provider binding_nonce", /^[A-Za-z0-9._:-]{16,128}$/, 16, 128);
  const draft: DirectProviderKeyBindingDraftV1 = {
    marker: DIRECT_PROVIDER_KEY_BINDING_MARKER,
    version: 1,
    binding_status: expectedStatus,
    provider_id: summary.providerId,
    authority_scope: DIRECT_PROVIDER_AUTHENTICATION_SCOPE,
    key_id: keyId,
    public_key_pem: publicKeyPem,
    valid_from_utc: validFromUtc,
    expires_at_utc: expiresAtUtc,
    revoked_at_utc: revokedAtUtc,
    binding_nonce: bindingNonce,
  };
  const bindingId = requireString(root.binding_id, "provider binding_id", PROVIDER_BINDING_ID, 75, 75);
  assertCondition(bindingId === directProviderKeyBindingIdV1(draft), "provider binding_id mismatch");
  return { ...draft, binding_id: bindingId };
}

function validateRequesterBinding(
  value: unknown,
  mode: DirectEvidenceMode,
  summary: PreparedSummary,
): DirectRequesterKeyBindingV1 {
  const root = requireRecord(value, "requester_key_binding");
  requireExactKeys(root, "requester_key_binding", [
    "marker",
    "version",
    "binding_status",
    "requester_agent_id",
    "authority_scope",
    "key_id",
    "public_key_pem",
    "valid_from_utc",
    "expires_at_utc",
    "revoked_at_utc",
    "binding_nonce",
    "binding_id",
  ]);
  assertCondition(root.marker === DIRECT_REQUESTER_KEY_BINDING_MARKER, "requester binding marker mismatch");
  assertCondition(root.version === 1, "requester binding version mismatch");
  const expectedStatus = mode === "example_fixture" ? "example_fixture" : "operator_approved_snapshot";
  assertCondition(root.binding_status === expectedStatus, "requester binding status mismatch");
  assertCondition(root.requester_agent_id === summary.requesterAgentId, "requester binding identity mismatch");
  assertCondition(root.authority_scope === DIRECT_REQUESTER_AUTHENTICATION_SCOPE, "requester binding scope mismatch");
  const publicKeyPem = requireCanonicalPublicKeyPem(
    root.public_key_pem,
    "requester public key",
  );
  const keyId = requireString(root.key_id, "requester key_id", KEY_ID, 72, 72);
  assertCondition(keyId === directAuthenticationKeyIdV1(publicKeyPem), "requester key_id mismatch");
  const validFromUtc = requireUtc(root.valid_from_utc, "requester valid_from_utc");
  const expiresAtUtc = requireUtc(root.expires_at_utc, "requester expires_at_utc");
  assertCondition(parseUtc(expiresAtUtc) > parseUtc(validFromUtc), "requester binding window invalid");
  const revokedAtUtc = root.revoked_at_utc === null ? null : requireUtc(root.revoked_at_utc, "requester revoked_at_utc");
  const bindingNonce = requireString(root.binding_nonce, "requester binding_nonce", /^[A-Za-z0-9._:-]{16,128}$/, 16, 128);
  const draft: DirectRequesterKeyBindingDraftV1 = {
    marker: DIRECT_REQUESTER_KEY_BINDING_MARKER,
    version: 1,
    binding_status: expectedStatus,
    requester_agent_id: summary.requesterAgentId,
    authority_scope: DIRECT_REQUESTER_AUTHENTICATION_SCOPE,
    key_id: keyId,
    public_key_pem: publicKeyPem,
    valid_from_utc: validFromUtc,
    expires_at_utc: expiresAtUtc,
    revoked_at_utc: revokedAtUtc,
    binding_nonce: bindingNonce,
  };
  const bindingId = requireString(root.binding_id, "requester binding_id", REQUESTER_BINDING_ID, 75, 75);
  assertCondition(bindingId === directRequesterKeyBindingIdV1(draft), "requester binding_id mismatch");
  return { ...draft, binding_id: bindingId };
}

function validateProviderEnvelope(
  value: unknown,
  binding: DirectProviderKeyBindingV1,
  summary: PreparedSummary,
): DirectProviderAuthenticationEnvelopeV1 {
  const root = requireRecord(value, "provider_authentication_envelope");
  requireExactKeys(root, "provider_authentication_envelope", [
    "marker",
    "version",
    "signature_scheme",
    "signature_domain",
    "canonicalization",
    "prepared_packet_id",
    "prepared_packet_fingerprint_sha256",
    "quote_id",
    "work_order_id",
    "acceptance_id",
    "payment_intent_id",
    "provider_id",
    "provider_key_binding_id",
    "authentication_nonce",
    "created_at_utc",
    "expires_at_utc",
    "signature_base64",
    "authentication_id",
  ]);
  assertCondition(root.marker === DIRECT_PROVIDER_AUTHENTICATION_EVIDENCE_MARKER, "provider authentication marker mismatch");
  assertCondition(root.version === 1, "provider authentication version mismatch");
  assertCondition(root.signature_scheme === DIRECT_AUTHENTICATION_SIGNATURE_SCHEME, "provider signature scheme mismatch");
  assertCondition(root.signature_domain === DIRECT_PROVIDER_SIGNATURE_DOMAIN, "provider signature domain mismatch");
  assertCondition(root.canonicalization === DIRECT_AUTHENTICATION_CANONICALIZATION, "provider canonicalization mismatch");
  const fields: Array<[string, unknown]> = [
    ["prepared_packet_id", summary.packetId],
    ["prepared_packet_fingerprint_sha256", summary.packetFingerprint],
    ["quote_id", summary.quoteId],
    ["work_order_id", summary.workOrderId],
    ["acceptance_id", summary.acceptanceId],
    ["payment_intent_id", summary.paymentIntentId],
    ["provider_id", summary.providerId],
    ["provider_key_binding_id", binding.binding_id],
  ];
  for (const [key, expected] of fields) {
    assertCondition(root[key] === expected, `provider authentication ${key} mismatch`);
  }
  const authenticationNonce = requireString(root.authentication_nonce, "provider authentication_nonce", /^[A-Za-z0-9._:-]{16,128}$/, 16, 128);
  const createdAtUtc = requireUtc(root.created_at_utc, "provider created_at_utc");
  const expiresAtUtc = requireUtc(root.expires_at_utc, "provider expires_at_utc");
  assertCondition(parseUtc(expiresAtUtc) > parseUtc(createdAtUtc), "provider authentication window invalid");
  assertCondition(parseUtc(createdAtUtc) >= parseUtc(binding.valid_from_utc), "provider authentication predates binding");
  assertCondition(parseUtc(expiresAtUtc) <= parseUtc(binding.expires_at_utc), "provider authentication outlives binding");
  assertCondition(parseUtc(expiresAtUtc) <= parseUtc(summary.expiryUtc), "provider authentication outlives prepared lineage");
  if (binding.revoked_at_utc !== null) {
    assertCondition(parseUtc(createdAtUtc) < parseUtc(binding.revoked_at_utc), "provider binding revoked before authentication");
  }
  const signatureBase64 = requireString(root.signature_base64, "provider signature", BASE64_SIGNATURE, 88, 88);
  const body: DirectProviderAuthenticationBodyV1 = {
    marker: DIRECT_PROVIDER_AUTHENTICATION_EVIDENCE_MARKER,
    version: 1,
    signature_scheme: DIRECT_AUTHENTICATION_SIGNATURE_SCHEME,
    signature_domain: DIRECT_PROVIDER_SIGNATURE_DOMAIN,
    canonicalization: DIRECT_AUTHENTICATION_CANONICALIZATION,
    prepared_packet_id: summary.packetId,
    prepared_packet_fingerprint_sha256: summary.packetFingerprint,
    quote_id: summary.quoteId,
    work_order_id: summary.workOrderId,
    acceptance_id: summary.acceptanceId,
    payment_intent_id: summary.paymentIntentId,
    provider_id: summary.providerId,
    provider_key_binding_id: binding.binding_id,
    authentication_nonce: authenticationNonce,
    created_at_utc: createdAtUtc,
    expires_at_utc: expiresAtUtc,
  };
  assertCondition(
    crypto.verify(
      null,
      directProviderAuthenticationSigningBytesV1(body),
      publicKeyFromPem(binding.public_key_pem),
      Buffer.from(signatureBase64, "base64"),
    ),
    "provider authentication signature invalid",
  );
  const authenticationId = requireString(root.authentication_id, "provider authentication_id", PROVIDER_AUTH_ID, 74, 74);
  assertCondition(
    authenticationId === directProviderAuthenticationIdV1({ ...body, signature_base64: signatureBase64 }),
    "provider authentication_id mismatch",
  );
  return { ...body, signature_base64: signatureBase64, authentication_id: authenticationId };
}

function validateRequesterEnvelope(
  value: unknown,
  binding: DirectRequesterKeyBindingV1,
  providerEnvelope: DirectProviderAuthenticationEnvelopeV1,
  summary: PreparedSummary,
): DirectRequesterAuthenticationEnvelopeV1 {
  const root = requireRecord(value, "requester_authentication_envelope");
  requireExactKeys(root, "requester_authentication_envelope", [
    "marker",
    "version",
    "signature_scheme",
    "signature_domain",
    "canonicalization",
    "prepared_packet_id",
    "prepared_packet_fingerprint_sha256",
    "quote_id",
    "work_order_id",
    "acceptance_id",
    "payment_intent_id",
    "requester_agent_id",
    "requester_key_binding_id",
    "provider_authentication_id",
    "acceptance_nonce",
    "authentication_nonce",
    "created_at_utc",
    "expires_at_utc",
    "signature_base64",
    "authentication_id",
  ]);
  assertCondition(root.marker === DIRECT_REQUESTER_AUTHENTICATION_EVIDENCE_MARKER, "requester authentication marker mismatch");
  assertCondition(root.version === 1, "requester authentication version mismatch");
  assertCondition(root.signature_scheme === DIRECT_AUTHENTICATION_SIGNATURE_SCHEME, "requester signature scheme mismatch");
  assertCondition(root.signature_domain === DIRECT_REQUESTER_SIGNATURE_DOMAIN, "requester signature domain mismatch");
  assertCondition(root.canonicalization === DIRECT_AUTHENTICATION_CANONICALIZATION, "requester canonicalization mismatch");
  const fields: Array<[string, unknown]> = [
    ["prepared_packet_id", summary.packetId],
    ["prepared_packet_fingerprint_sha256", summary.packetFingerprint],
    ["quote_id", summary.quoteId],
    ["work_order_id", summary.workOrderId],
    ["acceptance_id", summary.acceptanceId],
    ["payment_intent_id", summary.paymentIntentId],
    ["requester_agent_id", summary.requesterAgentId],
    ["requester_key_binding_id", binding.binding_id],
    ["provider_authentication_id", providerEnvelope.authentication_id],
    ["acceptance_nonce", summary.acceptanceNonce],
  ];
  for (const [key, expected] of fields) {
    assertCondition(root[key] === expected, `requester authentication ${key} mismatch`);
  }
  const authenticationNonce = requireString(root.authentication_nonce, "requester authentication_nonce", /^[A-Za-z0-9._:-]{16,128}$/, 16, 128);
  const createdAtUtc = requireUtc(root.created_at_utc, "requester created_at_utc");
  const expiresAtUtc = requireUtc(root.expires_at_utc, "requester expires_at_utc");
  assertCondition(parseUtc(expiresAtUtc) > parseUtc(createdAtUtc), "requester authentication window invalid");
  assertCondition(parseUtc(createdAtUtc) >= parseUtc(providerEnvelope.created_at_utc), "requester authentication predates provider authentication");
  assertCondition(parseUtc(createdAtUtc) >= parseUtc(binding.valid_from_utc), "requester authentication predates binding");
  assertCondition(parseUtc(expiresAtUtc) <= parseUtc(binding.expires_at_utc), "requester authentication outlives binding");
  assertCondition(parseUtc(expiresAtUtc) <= parseUtc(providerEnvelope.expires_at_utc), "requester authentication outlives provider authentication");
  assertCondition(parseUtc(expiresAtUtc) <= parseUtc(summary.expiryUtc), "requester authentication outlives prepared lineage");
  if (binding.revoked_at_utc !== null) {
    assertCondition(parseUtc(createdAtUtc) < parseUtc(binding.revoked_at_utc), "requester binding revoked before authentication");
  }
  const signatureBase64 = requireString(root.signature_base64, "requester signature", BASE64_SIGNATURE, 88, 88);
  const body: DirectRequesterAuthenticationBodyV1 = {
    marker: DIRECT_REQUESTER_AUTHENTICATION_EVIDENCE_MARKER,
    version: 1,
    signature_scheme: DIRECT_AUTHENTICATION_SIGNATURE_SCHEME,
    signature_domain: DIRECT_REQUESTER_SIGNATURE_DOMAIN,
    canonicalization: DIRECT_AUTHENTICATION_CANONICALIZATION,
    prepared_packet_id: summary.packetId,
    prepared_packet_fingerprint_sha256: summary.packetFingerprint,
    quote_id: summary.quoteId,
    work_order_id: summary.workOrderId,
    acceptance_id: summary.acceptanceId,
    payment_intent_id: summary.paymentIntentId,
    requester_agent_id: summary.requesterAgentId,
    requester_key_binding_id: binding.binding_id,
    provider_authentication_id: providerEnvelope.authentication_id,
    acceptance_nonce: summary.acceptanceNonce,
    authentication_nonce: authenticationNonce,
    created_at_utc: createdAtUtc,
    expires_at_utc: expiresAtUtc,
  };
  assertCondition(
    crypto.verify(
      null,
      directRequesterAuthenticationSigningBytesV1(body),
      publicKeyFromPem(binding.public_key_pem),
      Buffer.from(signatureBase64, "base64"),
    ),
    "requester authentication signature invalid",
  );
  const authenticationId = requireString(root.authentication_id, "requester authentication_id", REQUESTER_AUTH_ID, 74, 74);
  assertCondition(
    authenticationId === directRequesterAuthenticationIdV1({ ...body, signature_base64: signatureBase64 }),
    "requester authentication_id mismatch",
  );
  return { ...body, signature_base64: signatureBase64, authentication_id: authenticationId };
}

function validateInput(value: unknown): {
  mode: DirectEvidenceMode;
  summary: PreparedSummary;
  providerBinding: DirectProviderKeyBindingV1;
  providerEnvelope: DirectProviderAuthenticationEnvelopeV1;
  requesterBinding: DirectRequesterKeyBindingV1;
  requesterEnvelope: DirectRequesterAuthenticationEnvelopeV1;
} {
  const root = requireRecord(value, "input");
  requireExactKeys(root, "input", [
    "marker",
    "version",
    "evidence_mode",
    "prepared_packet",
    "provider_key_binding",
    "provider_authentication_envelope",
    "requester_key_binding",
    "requester_authentication_envelope",
  ]);
  assertCondition(root.marker === DIRECT_AUTHENTICATION_INPUT_MARKER, "input marker mismatch");
  assertCondition(root.version === 1, "input version mismatch");
  assertCondition(
    root.evidence_mode === "example_fixture" ||
      root.evidence_mode === "operator_signed_direct_lineage",
    "evidence_mode mismatch",
  );
  const mode = root.evidence_mode;
  const summary = validatePreparedPacket(root.prepared_packet);
  const providerBinding = validateProviderBinding(root.provider_key_binding, mode, summary);
  const providerEnvelope = validateProviderEnvelope(
    root.provider_authentication_envelope,
    providerBinding,
    summary,
  );
  const requesterBinding = validateRequesterBinding(root.requester_key_binding, mode, summary);
  const requesterEnvelope = validateRequesterEnvelope(
    root.requester_authentication_envelope,
    requesterBinding,
    providerEnvelope,
    summary,
  );
  return {
    mode,
    summary,
    providerBinding,
    providerEnvelope,
    requesterBinding,
    requesterEnvelope,
  };
}

export function directAuthenticationPacketIdV1(
  value: OutputWithoutId,
): string {
  return `${DIRECT_AUTHENTICATION_PACKET_ID_PREFIX}${sha256Hex(
    canonicalJson(value),
  )}`;
}

export function materializeAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1(
  inputValue: unknown,
): AuthenticatedPaidWorkDirectQuoteActivationAuthenticationPacketV1 {
  const validated = validateInput(inputValue);
  const external = validated.mode === "operator_signed_direct_lineage";
  const withoutId: OutputWithoutId = {
    marker: DIRECT_AUTHENTICATION_PACKET_MARKER,
    version: 1,
    status: external
      ? "direct_lineage_authenticated_for_atomic_activation"
      : "example_only",
    source: {
      prepared_packet_id: validated.summary.packetId,
      prepared_packet_fingerprint_sha256:
        validated.summary.packetFingerprint,
      quote_id: validated.summary.quoteId,
      work_order_id: validated.summary.workOrderId,
      acceptance_id: validated.summary.acceptanceId,
      payment_intent_id: validated.summary.paymentIntentId,
      requester_agent_id: validated.summary.requesterAgentId,
      provider_id: validated.summary.providerId,
    },
    provider_authentication: {
      authentication_id: validated.providerEnvelope.authentication_id,
      key_binding_id: validated.providerBinding.binding_id,
      key_id: validated.providerBinding.key_id,
      scope: DIRECT_PROVIDER_AUTHENTICATION_SCOPE,
      signature_verified: true,
      direct_lineage_verified: true,
    },
    requester_authentication: {
      authentication_id: validated.requesterEnvelope.authentication_id,
      key_binding_id: validated.requesterBinding.binding_id,
      key_id: validated.requesterBinding.key_id,
      scope: DIRECT_REQUESTER_AUTHENTICATION_SCOPE,
      signature_verified: true,
      direct_lineage_verified: true,
      provider_authentication_id_bound: true,
    },
    activation_gate: {
      eligible_for_atomic_activation_persistence: external,
      public_service_submission_id_required: false,
      public_service_submission_id_synthesized: false,
      prepared_packet_verification_required_at_persistence: true,
      provider_authentication_id_consumption_required: true,
      requester_authentication_id_consumption_required: true,
      acceptance_id_consumption_required: true,
      payment_intent_id_consumption_required: true,
      prepared_packet_id_consumption_required: true,
      single_active_acceptance_per_quote_required: true,
      single_active_payment_intent_per_acceptance_required: true,
      atomic_persistence_required: true,
      provider_authentication_id_consumed: false,
      requester_authentication_id_consumed: false,
      acceptance_id_consumed: false,
      payment_intent_id_consumed: false,
      prepared_packet_id_consumed: false,
      effective_quote_acceptance: false,
      effective_payment_authorization: false,
    },
    next_gate: {
      reason:
        "direct_authentication_packet_requires_atomic_persistence_adapter_integration",
      next_action:
        "integrate_direct_authentication_packet_with_activation_persistence",
      new_quote_required_for_expired_lineage: true,
      separate_payment_execution_authorization_required: true,
    },
    authority: noAuthority(),
  };
  return { ...withoutId, packet_id: directAuthenticationPacketIdV1(withoutId) };
}

export function verifyAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1(
  inputValue: unknown,
  packetValue: unknown,
): AuthenticatedPaidWorkDirectQuoteActivationAuthenticationPacketV1 {
  const expected =
    materializeAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1(
      inputValue,
    );
  const packet = requireRecord(packetValue, "packet");
  requireString(packet.packet_id, "packet.packet_id", OUTPUT_PACKET_ID, 76, 76);
  assertCondition(
    canonicalJson(packetValue) === canonicalJson(expected),
    "packet does not match authenticated input",
  );
  return expected;
}

function readJson(file: string): unknown {
  const resolved = path.resolve(file);
  const metadata = fs.lstatSync(resolved);
  assertCondition(!metadata.isSymbolicLink(), "symlink input forbidden");
  assertCondition(metadata.isFile(), "regular file input required");
  assertCondition(metadata.size <= MAX_JSON_BYTES, "JSON input too large");
  return JSON.parse(fs.readFileSync(resolved, "utf8")) as unknown;
}
function usage(): never {
  return fail(
    [
      "usage:",
      "  tsx scripts/authenticated_paid_work_direct_quote_activation_authentication_v1.ts materialize <input.json> <packet.json>",
      "  tsx scripts/authenticated_paid_work_direct_quote_activation_authentication_v1.ts verify <input.json> <packet.json>",
    ].join("\n"),
  );
}
function main(): void {
  const [mode, inputPath, packetPath, ...extra] = process.argv.slice(2);
  assertCondition(extra.length === 0, "unexpected arguments");
  assertCondition(Boolean(inputPath && packetPath), "input and packet paths are required");
  const input = readJson(inputPath!);
  if (mode === "materialize") {
    const packet =
      materializeAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1(
        input,
      );
    fs.writeFileSync(
      path.resolve(packetPath!),
      `${JSON.stringify(packet, null, 2)}\n`,
      { encoding: "utf8", flag: "wx", mode: 0o600 },
    );
    console.log(`marker=${packet.marker}`);
    console.log(`packet_id=${packet.packet_id}`);
    console.log(`status=${packet.status}`);
    console.log(
      `provider_authentication_id=${packet.provider_authentication.authentication_id}`,
    );
    console.log(
      `requester_authentication_id=${packet.requester_authentication.authentication_id}`,
    );
    console.log(
      `eligible_for_atomic_activation_persistence=${packet.activation_gate.eligible_for_atomic_activation_persistence}`,
    );
    console.log("public_service_submission_id_required=false");
    console.log("public_service_submission_id_synthesized=false");
    console.log("effective_quote_acceptance=false");
    console.log("effective_payment_authorization=false");
    console.log("payment_execution=false");
    console.log("work_dispatch=false");
    console.log("wallet_access=false");
    console.log("money_movement=false");
    console.log(`output=${path.resolve(packetPath!)}`);
    return;
  }
  if (mode === "verify") {
    const packet = readJson(packetPath!);
    const result =
      verifyAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1(
        input,
        packet,
      );
    console.log(`marker=${result.marker}`);
    console.log(`packet_id=${result.packet_id}`);
    console.log(`status=${result.status}`);
    console.log("direct_lineage_verified=true");
    console.log("public_service_submission_id_required=false");
    console.log("effective_quote_acceptance=false");
    console.log("effective_payment_authorization=false");
    console.log("payment_execution=false");
    console.log("work_dispatch=false");
    console.log("wallet_access=false");
    console.log("money_movement=false");
    return;
  }
  usage();
}

const invokedUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedUrl) {
  try {
    main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`HOLD: ${message}`);
    process.exitCode = 1;
  }
}
