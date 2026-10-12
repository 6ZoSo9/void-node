import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  canonicalJson,
} from "./agent_paid_work_order_envelope_v1.js";
import {
  materializePublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1,
  validatePublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1,
  type PublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1,
} from "./public_agent_service_authenticated_quote_acceptance_handoff_v1.js";

export const PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_V1" as const;
export const PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_PACKET_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_PACKET_V1" as const;
export const PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_KEY_BINDING_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_KEY_BINDING_V1" as const;
export const PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_EVIDENCE_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_EVIDENCE_V1" as const;
export const PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_VERSION =
  1 as const;
export const PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SCOPE =
  "agent_paid_work_accept" as const;
export const PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SIGNATURE_SCHEME =
  "ed25519-spki-sha256-v1" as const;
export const PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SIGNATURE_DOMAIN =
  "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_V1" as const;
export const PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_CANONICALIZATION =
  "void-canonical-json-v1" as const;
export const PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_KEY_BINDING_ID_PREFIX =
  "voidarkb1_" as const;
export const PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_ID_PREFIX =
  "voidawra1_" as const;

const MAX_JSON_BYTES = 16 * 1024 * 1024;
const ISO_UTC_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const IDENTIFIER_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const NONCE_PATTERN =
  /^[A-Za-z0-9._:-]{16,128}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const KEY_ID_PATTERN = /^ed25519:[0-9a-f]{64}$/;
const BINDING_ID_PATTERN = /^voidarkb1_[0-9a-f]{64}$/;
const AUTHENTICATION_ID_PATTERN = /^voidawra1_[0-9a-f]{64}$/;

export type RequesterAcceptanceKeyBindingDraftV1 = {
  marker:
    typeof PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_KEY_BINDING_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_VERSION;
  binding_status:
    | "example_fixture"
    | "operator_approved_snapshot";
  requester_agent_id: string;
  authority_scope:
    typeof PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SCOPE;
  key_id: string;
  public_key_pem: string;
  valid_from_utc: string;
  expires_at_utc: string;
  revoked_at_utc: string | null;
  binding_nonce: string;
};

export type RequesterAcceptanceKeyBindingV1 =
  RequesterAcceptanceKeyBindingDraftV1 & {
    binding_id: string;
  };

export type RequesterAcceptanceAuthenticationBodyV1 = {
  marker:
    typeof PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_EVIDENCE_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_VERSION;
  signature_scheme:
    typeof PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SIGNATURE_SCHEME;
  signature_domain:
    typeof PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SIGNATURE_DOMAIN;
  canonicalization:
    typeof PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_CANONICALIZATION;
  handoff_id: string;
  provider_authentication_id: string;
  provider_key_binding_id: string;
  provider_key_id: string;
  response_id: string;
  quote_id: string;
  quote_handoff_id: string;
  work_order_id: string;
  requester_agent_id: string;
  provider_id: string;
  catalog_fingerprint_sha256: string;
  requester_key_binding_id: string;
  acceptance_nonce: string;
  authentication_nonce: string;
  created_at_utc: string;
  expires_at_utc: string;
};

export type RequesterAcceptanceAuthenticationEnvelopeV1 =
  RequesterAcceptanceAuthenticationBodyV1 & {
    signature_base64: string;
    requester_authentication_id: string;
  };

export type PublicAgentServiceRequesterAcceptanceAuthenticationV1 = {
  marker:
    typeof PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_VERSION;
  evidence_mode:
    | "example_fixture"
    | "external_requester_evidence";
  authenticated_quote_acceptance_handoff_input:
    PublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1;
  requester_key_binding:
    RequesterAcceptanceKeyBindingV1;
  requester_authentication_envelope:
    RequesterAcceptanceAuthenticationEnvelopeV1;
};

export type PublicAgentServiceRequesterAcceptanceAuthenticationPacketV1 = {
  marker:
    typeof PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_PACKET_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_VERSION;
  requester_authentication_id: string;
  status:
    | "example_only"
    | "requester_authenticated_for_acceptance";
  source: {
    catalog_fingerprint_sha256: string;
    handoff_id: string;
    provider_authentication_id: string;
    provider_key_binding_id: string;
    provider_key_id: string;
    response_id: string;
    quote_id: string;
    quote_handoff_id: string;
    work_order_id: string;
    requester_agent_id: string;
    provider_id: string;
    requester_key_binding_id: string;
    requester_key_id: string;
    acceptance_nonce: string;
  };
  verification: {
    provider_handoff_verified: true;
    provider_authentication_verified: true;
    requester_binding_verified: true;
    requester_key_id_verified: true;
    requester_signature_verified: true;
    requester_nonce_verified: true;
    requester_authentication_verified: true;
  };
  acceptance_gate: {
    eligible_for_acceptance_materialization: boolean;
    reason:
      | "example_fixture_not_live_trust"
      | "requester_authentication_verified";
    separate_acceptance_materialization_required: true;
    requester_authentication_replay_protection_required: true;
    requester_authentication_id_consumption_required: true;
    provider_authentication_id_consumption_required: true;
    acceptance_replay_protection_required: true;
    acceptance_id_consumption_required: true;
    single_active_acceptance_per_quote_required: true;
    acceptance_replay_consumer_verified: false;
  };
  authority: {
    acceptance_creation: false;
    quote_acceptance: false;
    requester_authentication_replay_write: false;
    provider_authentication_replay_write: false;
    acceptance_replay_write: false;
    credential_issue: false;
    credential_change: false;
    provider_selection: false;
    requester_key_binding_creation: false;
    requester_key_registry_write: false;
    provider_key_binding_creation: false;
    provider_key_registry_write: false;
    payment_authorization: false;
    payment_execution: false;
    execution_authorization: false;
    work_dispatch: false;
    wallet_access: false;
    production_signing: false;
    transaction_broadcast: false;
    work_credit_write: false;
    http_submission: false;
    runtime_mutation: false;
    money_movement: false;
  };
};

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) fail(message);
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(
    value
      && typeof value === "object"
      && !Array.isArray(value),
  );
}

function requireRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  assertCondition(
    isRecord(value),
    `${label} must be an object`,
  );
  return value;
}

function requireExactKeys(
  value: Record<string, unknown>,
  label: string,
  keys: readonly string[],
): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assertCondition(
    JSON.stringify(actual)
      === JSON.stringify(expected),
    `${label} must contain exactly: ${expected.join(", ")}`,
  );
}

function requireString(
  value: unknown,
  label: string,
  pattern: RegExp,
  minimum: number,
  maximum: number,
): string {
  assertCondition(
    typeof value === "string",
    `${label} must be a string`,
  );
  assertCondition(
    value === value.trim(),
    `${label} must be trimmed`,
  );
  assertCondition(
    value.length >= minimum
      && value.length <= maximum,
    `${label} length is outside bounds`,
  );
  assertCondition(
    pattern.test(value),
    `${label} has invalid format`,
  );
  return value;
}

function requireIsoUtc(
  value: unknown,
  label: string,
): string {
  const result = requireString(
    value,
    label,
    ISO_UTC_PATTERN,
    20,
    20,
  );
  assertCondition(
    Number.isFinite(Date.parse(result)),
    `${label} is not a valid UTC timestamp`,
  );
  return result;
}

function sha256Hex(
  value: string | Uint8Array,
): string {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

function requireCanonicalPublicKeyPem(
  value: unknown,
  label: string,
): string {
  assertCondition(
    typeof value === "string",
    `${label} must be a string`,
  );
  assertCondition(
    value.startsWith(
      "-----BEGIN PUBLIC KEY-----\n",
    ),
    `${label} must be SPKI PEM`,
  );
  assertCondition(
    value.endsWith(
      "\n-----END PUBLIC KEY-----\n",
    ),
    `${label} must have canonical terminal newline`,
  );

  let key: crypto.KeyObject;
  try {
    key = crypto.createPublicKey({
      key: value,
      format: "pem",
      type: "spki",
    });
  } catch {
    fail(`${label} is not a valid public key`);
  }

  assertCondition(
    key.asymmetricKeyType === "ed25519",
    `${label} must be Ed25519`,
  );
  const canonical = key
    .export({
      type: "spki",
      format: "pem",
    })
    .toString();
  assertCondition(
    canonical === value,
    `${label} is not canonical SPKI PEM`,
  );
  return value;
}

export function requesterAcceptanceAuthenticationKeyIdV1(
  publicKeyPem: string,
): string {
  const key = crypto.createPublicKey({
    key: publicKeyPem,
    format: "pem",
    type: "spki",
  });
  assertCondition(
    key.asymmetricKeyType === "ed25519",
    "requester key must be Ed25519",
  );
  const der = key.export({
    type: "spki",
    format: "der",
  }) as Buffer;
  return `ed25519:${sha256Hex(der)}`;
}

export function requesterAcceptanceKeyBindingIdV1(
  draft: RequesterAcceptanceKeyBindingDraftV1,
): string {
  return `${PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_KEY_BINDING_ID_PREFIX}${sha256Hex(
    canonicalJson(draft),
  )}`;
}

export function requesterAcceptanceAuthenticationSigningBytesV1(
  body: RequesterAcceptanceAuthenticationBodyV1,
): Buffer {
  return Buffer.from(
    `${PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SIGNATURE_DOMAIN}\n${canonicalJson(body)}`,
    "utf8",
  );
}

export function requesterAcceptanceAuthenticationIdV1(
  envelopeWithoutId:
    RequesterAcceptanceAuthenticationBodyV1 & {
      signature_base64: string;
    },
): string {
  return `${PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_ID_PREFIX}${sha256Hex(
    canonicalJson(envelopeWithoutId),
  )}`;
}

function exactAuthenticationBodyV1(
  value: RequesterAcceptanceAuthenticationBodyV1,
): RequesterAcceptanceAuthenticationBodyV1 {
  return {
    marker: value.marker,
    version: value.version,
    signature_scheme: value.signature_scheme,
    signature_domain: value.signature_domain,
    canonicalization: value.canonicalization,
    handoff_id: value.handoff_id,
    provider_authentication_id:
      value.provider_authentication_id,
    provider_key_binding_id:
      value.provider_key_binding_id,
    provider_key_id: value.provider_key_id,
    response_id: value.response_id,
    quote_id: value.quote_id,
    quote_handoff_id: value.quote_handoff_id,
    work_order_id: value.work_order_id,
    requester_agent_id: value.requester_agent_id,
    provider_id: value.provider_id,
    catalog_fingerprint_sha256:
      value.catalog_fingerprint_sha256,
    requester_key_binding_id:
      value.requester_key_binding_id,
    acceptance_nonce: value.acceptance_nonce,
    authentication_nonce:
      value.authentication_nonce,
    created_at_utc: value.created_at_utc,
    expires_at_utc: value.expires_at_utc,
  };
}

function validateRequesterKeyBindingV1(
  value: unknown,
): RequesterAcceptanceKeyBindingV1 {
  const root = requireRecord(
    value,
    "requester_key_binding",
  );
  requireExactKeys(
    root,
    "requester_key_binding",
    [
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
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_KEY_BINDING_MARKER,
    "requester key binding marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_VERSION,
    "requester key binding version mismatch",
  );
  assertCondition(
    root.binding_status === "example_fixture"
      || root.binding_status === "operator_approved_snapshot",
    "requester key binding status mismatch",
  );
  const requesterAgentId = requireString(
    root.requester_agent_id,
    "requester_key_binding.requester_agent_id",
    IDENTIFIER_PATTERN,
    3,
    128,
  );
  assertCondition(
    root.authority_scope
      === PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SCOPE,
    "requester key binding scope must be agent_paid_work_accept",
  );
  const publicKeyPem =
    requireCanonicalPublicKeyPem(
      root.public_key_pem,
      "requester_key_binding.public_key_pem",
    );
  const keyId = requireString(
    root.key_id,
    "requester_key_binding.key_id",
    KEY_ID_PATTERN,
    72,
    72,
  );
  assertCondition(
    keyId
      === requesterAcceptanceAuthenticationKeyIdV1(
        publicKeyPem,
      ),
    "requester key_id does not match Ed25519 SPKI public key",
  );
  const validFromUtc = requireIsoUtc(
    root.valid_from_utc,
    "requester_key_binding.valid_from_utc",
  );
  const expiresAtUtc = requireIsoUtc(
    root.expires_at_utc,
    "requester_key_binding.expires_at_utc",
  );
  assertCondition(
    Date.parse(expiresAtUtc)
      > Date.parse(validFromUtc),
    "requester key binding expiry must follow validity start",
  );
  let revokedAtUtc: string | null = null;
  if (root.revoked_at_utc !== null) {
    revokedAtUtc = requireIsoUtc(
      root.revoked_at_utc,
      "requester_key_binding.revoked_at_utc",
    );
    assertCondition(
      Date.parse(revokedAtUtc)
        >= Date.parse(validFromUtc),
      "requester key revocation precedes validity start",
    );
  }
  const bindingNonce = requireString(
    root.binding_nonce,
    "requester_key_binding.binding_nonce",
    NONCE_PATTERN,
    16,
    128,
  );
  const bindingId = requireString(
    root.binding_id,
    "requester_key_binding.binding_id",
    BINDING_ID_PATTERN,
    74,
    74,
  );

  const draft: RequesterAcceptanceKeyBindingDraftV1 = {
    marker:
      PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_KEY_BINDING_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_VERSION,
    binding_status:
      root.binding_status,
    requester_agent_id:
      requesterAgentId,
    authority_scope:
      PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SCOPE,
    key_id:
      keyId,
    public_key_pem:
      publicKeyPem,
    valid_from_utc:
      validFromUtc,
    expires_at_utc:
      expiresAtUtc,
    revoked_at_utc:
      revokedAtUtc,
    binding_nonce:
      bindingNonce,
  };
  assertCondition(
    bindingId
      === requesterAcceptanceKeyBindingIdV1(
        draft,
      ),
    "requester key binding_id mismatch",
  );
  return {
    ...draft,
    binding_id:
      bindingId,
  };
}

function validateRequesterAuthenticationEnvelopeV1(
  value: unknown,
): RequesterAcceptanceAuthenticationEnvelopeV1 {
  const root = requireRecord(
    value,
    "requester_authentication_envelope",
  );
  requireExactKeys(
    root,
    "requester_authentication_envelope",
    [
      "marker",
      "version",
      "signature_scheme",
      "signature_domain",
      "canonicalization",
      "handoff_id",
      "provider_authentication_id",
      "provider_key_binding_id",
      "provider_key_id",
      "response_id",
      "quote_id",
      "quote_handoff_id",
      "work_order_id",
      "requester_agent_id",
      "provider_id",
      "catalog_fingerprint_sha256",
      "requester_key_binding_id",
      "acceptance_nonce",
      "authentication_nonce",
      "created_at_utc",
      "expires_at_utc",
      "signature_base64",
      "requester_authentication_id",
    ],
  );

  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_EVIDENCE_MARKER,
    "requester authentication evidence marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_VERSION,
    "requester authentication evidence version mismatch",
  );
  assertCondition(
    root.signature_scheme
      === PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SIGNATURE_SCHEME,
    "requester authentication signature scheme mismatch",
  );
  assertCondition(
    root.signature_domain
      === PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SIGNATURE_DOMAIN,
    "requester authentication signature domain mismatch",
  );
  assertCondition(
    root.canonicalization
      === PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_CANONICALIZATION,
    "requester authentication canonicalization mismatch",
  );

  const body: RequesterAcceptanceAuthenticationBodyV1 = {
    marker:
      PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_EVIDENCE_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_VERSION,
    signature_scheme:
      PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SIGNATURE_SCHEME,
    signature_domain:
      PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SIGNATURE_DOMAIN,
    canonicalization:
      PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_CANONICALIZATION,
    handoff_id:
      requireString(
        root.handoff_id,
        "requester_authentication_envelope.handoff_id",
        /^voidawah1_[0-9a-f]{64}$/,
        74,
        74,
      ),
    provider_authentication_id:
      requireString(
        root.provider_authentication_id,
        "requester_authentication_envelope.provider_authentication_id",
        /^voidawqa1_[0-9a-f]{64}$/,
        74,
        74,
      ),
    provider_key_binding_id:
      requireString(
        root.provider_key_binding_id,
        "requester_authentication_envelope.provider_key_binding_id",
        /^voidapkb1_[0-9a-f]{64}$/,
        74,
        74,
      ),
    provider_key_id:
      requireString(
        root.provider_key_id,
        "requester_authentication_envelope.provider_key_id",
        KEY_ID_PATTERN,
        72,
        72,
      ),
    response_id:
      requireString(
        root.response_id,
        "requester_authentication_envelope.response_id",
        /^voidawqr1_[0-9a-f]{64}$/,
        74,
        74,
      ),
    quote_id:
      requireString(
        root.quote_id,
        "requester_authentication_envelope.quote_id",
        /^voidawq1_[0-9a-f]{64}$/,
        73,
        73,
      ),
    quote_handoff_id:
      requireString(
        root.quote_handoff_id,
        "requester_authentication_envelope.quote_handoff_id",
        /^voidawqh1_[0-9a-f]{64}$/,
        74,
        74,
      ),
    work_order_id:
      requireString(
        root.work_order_id,
        "requester_authentication_envelope.work_order_id",
        /^voidawo1_[0-9a-f]{64}$/,
        73,
        73,
      ),
    requester_agent_id:
      requireString(
        root.requester_agent_id,
        "requester_authentication_envelope.requester_agent_id",
        IDENTIFIER_PATTERN,
        3,
        128,
      ),
    provider_id:
      requireString(
        root.provider_id,
        "requester_authentication_envelope.provider_id",
        IDENTIFIER_PATTERN,
        3,
        128,
      ),
    catalog_fingerprint_sha256:
      requireString(
        root.catalog_fingerprint_sha256,
        "requester_authentication_envelope.catalog_fingerprint_sha256",
        SHA256_PATTERN,
        64,
        64,
      ),
    requester_key_binding_id:
      requireString(
        root.requester_key_binding_id,
        "requester_authentication_envelope.requester_key_binding_id",
        BINDING_ID_PATTERN,
        74,
        74,
      ),
    acceptance_nonce:
      requireString(
        root.acceptance_nonce,
        "requester_authentication_envelope.acceptance_nonce",
        NONCE_PATTERN,
        16,
        128,
      ),
    authentication_nonce:
      requireString(
        root.authentication_nonce,
        "requester_authentication_envelope.authentication_nonce",
        NONCE_PATTERN,
        16,
        128,
      ),
    created_at_utc:
      requireIsoUtc(
        root.created_at_utc,
        "requester_authentication_envelope.created_at_utc",
      ),
    expires_at_utc:
      requireIsoUtc(
        root.expires_at_utc,
        "requester_authentication_envelope.expires_at_utc",
      ),
  };

  assertCondition(
    Date.parse(body.expires_at_utc)
      > Date.parse(body.created_at_utc),
    "requester authentication expiry must follow creation",
  );

  const signatureBase64 = requireString(
    root.signature_base64,
    "requester_authentication_envelope.signature_base64",
    /^[A-Za-z0-9+/]{86}==$/,
    88,
    88,
  );
  const signatureBytes =
    Buffer.from(signatureBase64, "base64");
  assertCondition(
    signatureBytes.length === 64
      && signatureBytes.toString("base64")
        === signatureBase64,
    "requester signature must be canonical 64-byte base64",
  );

  const requesterAuthenticationId =
    requireString(
      root.requester_authentication_id,
      "requester_authentication_envelope.requester_authentication_id",
      AUTHENTICATION_ID_PATTERN,
      74,
      74,
    );
  const envelopeWithoutId = {
    ...exactAuthenticationBodyV1(body),
    signature_base64:
      signatureBase64,
  };
  assertCondition(
    requesterAuthenticationId
      === requesterAcceptanceAuthenticationIdV1(
        envelopeWithoutId,
      ),
    "requester_authentication_id mismatch",
  );

  return {
    ...body,
    signature_base64:
      signatureBase64,
    requester_authentication_id:
      requesterAuthenticationId,
  };
}

export function validatePublicAgentServiceRequesterAcceptanceAuthenticationV1(
  value: unknown,
): PublicAgentServiceRequesterAcceptanceAuthenticationV1 {
  const root = requireRecord(
    value,
    "requester acceptance authentication input",
  );
  requireExactKeys(
    root,
    "requester acceptance authentication input",
    [
      "marker",
      "version",
      "evidence_mode",
      "authenticated_quote_acceptance_handoff_input",
      "requester_key_binding",
      "requester_authentication_envelope",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_MARKER,
    "requester acceptance authentication marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_VERSION,
    "requester acceptance authentication version mismatch",
  );
  assertCondition(
    root.evidence_mode === "example_fixture"
      || root.evidence_mode === "external_requester_evidence",
    "requester acceptance authentication evidence mode mismatch",
  );

  return {
    marker:
      PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_VERSION,
    evidence_mode:
      root.evidence_mode,
    authenticated_quote_acceptance_handoff_input:
      validatePublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1(
        root.authenticated_quote_acceptance_handoff_input,
      ),
    requester_key_binding:
      validateRequesterKeyBindingV1(
        root.requester_key_binding,
      ),
    requester_authentication_envelope:
      validateRequesterAuthenticationEnvelopeV1(
        root.requester_authentication_envelope,
      ),
  };
}

export function materializePublicAgentServiceRequesterAcceptanceAuthenticationV1(
  inputValue: unknown,
  catalogValue: unknown,
): PublicAgentServiceRequesterAcceptanceAuthenticationPacketV1 {
  const input =
    validatePublicAgentServiceRequesterAcceptanceAuthenticationV1(
      inputValue,
    );
  const handoffPacket =
    materializePublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1(
      input.authenticated_quote_acceptance_handoff_input,
      catalogValue,
    );
  const binding = input.requester_key_binding;
  const evidence =
    input.requester_authentication_envelope;

  assertCondition(
    handoffPacket.source.requester_agent_id
      === binding.requester_agent_id,
    "requester key binding does not match handoff requester",
  );
  assertCondition(
    evidence.requester_agent_id
      === binding.requester_agent_id,
    "requester authentication evidence does not match requester binding",
  );
  assertCondition(
    evidence.requester_key_binding_id
      === binding.binding_id,
    "requester authentication evidence binding ID mismatch",
  );

  const sourceChecks: Array<
    [unknown, unknown, string]
  > = [
    [
      evidence.handoff_id,
      handoffPacket.handoff_id,
      "handoff_id",
    ],
    [
      evidence.provider_authentication_id,
      handoffPacket.source.authentication_id,
      "provider_authentication_id",
    ],
    [
      evidence.provider_key_binding_id,
      handoffPacket.source.provider_key_binding_id,
      "provider_key_binding_id",
    ],
    [
      evidence.provider_key_id,
      handoffPacket.source.key_id,
      "provider_key_id",
    ],
    [
      evidence.response_id,
      handoffPacket.source.response_id,
      "response_id",
    ],
    [
      evidence.quote_id,
      handoffPacket.source.quote_id,
      "quote_id",
    ],
    [
      evidence.quote_handoff_id,
      handoffPacket.source.quote_handoff_id,
      "quote_handoff_id",
    ],
    [
      evidence.work_order_id,
      handoffPacket.source.work_order_id,
      "work_order_id",
    ],
    [
      evidence.requester_agent_id,
      handoffPacket.source.requester_agent_id,
      "requester_agent_id",
    ],
    [
      evidence.provider_id,
      handoffPacket.source.provider_id,
      "provider_id",
    ],
    [
      evidence.catalog_fingerprint_sha256,
      handoffPacket.source.catalog_fingerprint_sha256,
      "catalog_fingerprint_sha256",
    ],
    [
      evidence.acceptance_nonce,
      handoffPacket.requester_intent.acceptance_nonce,
      "acceptance_nonce",
    ],
  ];
  for (const [actual, expected, label] of sourceChecks) {
    assertCondition(
      actual === expected,
      `requester authentication ${label} does not match authenticated handoff`,
    );
  }

  const created = Date.parse(
    evidence.created_at_utc,
  );
  const expires = Date.parse(
    evidence.expires_at_utc,
  );
  assertCondition(
    created
      >= Date.parse(
        handoffPacket.requester_intent.created_at_utc,
      ),
    "requester authentication predates handoff requester intent",
  );
  assertCondition(
    expires
      <= Date.parse(
        handoffPacket.requester_intent.expires_at_utc,
      ),
    "requester authentication outlives handoff requester intent",
  );
  assertCondition(
    created
      >= Date.parse(binding.valid_from_utc),
    "requester key not yet valid",
  );
  assertCondition(
    expires
      <= Date.parse(binding.expires_at_utc),
    "requester authentication outlives key binding",
  );
  if (binding.revoked_at_utc !== null) {
    assertCondition(
      created
        < Date.parse(binding.revoked_at_utc),
      "requester key was revoked before authentication",
    );
  }

  const verified = crypto.verify(
    null,
    requesterAcceptanceAuthenticationSigningBytesV1(
      exactAuthenticationBodyV1(evidence),
    ),
    crypto.createPublicKey({
      key: binding.public_key_pem,
      type: "spki",
      format: "pem",
    }),
    Buffer.from(
      evidence.signature_base64,
      "base64",
    ),
  );
  assertCondition(
    verified,
    "requester acceptance authentication signature is invalid",
  );

  const external =
    input.evidence_mode
      === "external_requester_evidence";
  if (external) {
    assertCondition(
      input.authenticated_quote_acceptance_handoff_input
        .provider_authentication_input.evidence_mode
        === "external_provider_evidence",
      "external requester evidence requires external provider evidence",
    );
    assertCondition(
      handoffPacket.status
        === "requester_authentication_required",
      "external requester evidence requires live authenticated handoff",
    );
    assertCondition(
      handoffPacket.acceptance_gate
        .eligible_for_requester_authentication
        === true,
      "authenticated handoff is not eligible for requester authentication",
    );
    assertCondition(
      binding.binding_status
        === "operator_approved_snapshot",
      "external requester evidence requires approved key binding snapshot",
    );
  } else {
    assertCondition(
      handoffPacket.status === "example_only",
      "fixture requester authentication requires example-only handoff",
    );
    assertCondition(
      handoffPacket.acceptance_gate
        .eligible_for_requester_authentication
        === false,
      "fixture handoff unexpectedly became live",
    );
    assertCondition(
      binding.binding_status
        === "example_fixture",
      "fixture requester authentication requires example binding",
    );
  }

  return {
    marker:
      PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_PACKET_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_VERSION,
    requester_authentication_id:
      evidence.requester_authentication_id,
    status: external
      ? "requester_authenticated_for_acceptance"
      : "example_only",
    source: {
      catalog_fingerprint_sha256:
        handoffPacket.source.catalog_fingerprint_sha256,
      handoff_id:
        handoffPacket.handoff_id,
      provider_authentication_id:
        handoffPacket.source.authentication_id,
      provider_key_binding_id:
        handoffPacket.source.provider_key_binding_id,
      provider_key_id:
        handoffPacket.source.key_id,
      response_id:
        handoffPacket.source.response_id,
      quote_id:
        handoffPacket.source.quote_id,
      quote_handoff_id:
        handoffPacket.source.quote_handoff_id,
      work_order_id:
        handoffPacket.source.work_order_id,
      requester_agent_id:
        handoffPacket.source.requester_agent_id,
      provider_id:
        handoffPacket.source.provider_id,
      requester_key_binding_id:
        binding.binding_id,
      requester_key_id:
        binding.key_id,
      acceptance_nonce:
        handoffPacket.requester_intent.acceptance_nonce,
    },
    verification: {
      provider_handoff_verified:
        true,
      provider_authentication_verified:
        true,
      requester_binding_verified:
        true,
      requester_key_id_verified:
        true,
      requester_signature_verified:
        true,
      requester_nonce_verified:
        true,
      requester_authentication_verified:
        true,
    },
    acceptance_gate: {
      eligible_for_acceptance_materialization:
        external,
      reason: external
        ? "requester_authentication_verified"
        : "example_fixture_not_live_trust",
      separate_acceptance_materialization_required:
        true,
      requester_authentication_replay_protection_required:
        true,
      requester_authentication_id_consumption_required:
        true,
      provider_authentication_id_consumption_required:
        true,
      acceptance_replay_protection_required:
        true,
      acceptance_id_consumption_required:
        true,
      single_active_acceptance_per_quote_required:
        true,
      acceptance_replay_consumer_verified:
        false,
    },
    authority: {
      acceptance_creation:
        false,
      quote_acceptance:
        false,
      requester_authentication_replay_write:
        false,
      provider_authentication_replay_write:
        false,
      acceptance_replay_write:
        false,
      credential_issue:
        false,
      credential_change:
        false,
      provider_selection:
        false,
      requester_key_binding_creation:
        false,
      requester_key_registry_write:
        false,
      provider_key_binding_creation:
        false,
      provider_key_registry_write:
        false,
      payment_authorization:
        false,
      payment_execution:
        false,
      execution_authorization:
        false,
      work_dispatch:
        false,
      wallet_access:
        false,
      production_signing:
        false,
      transaction_broadcast:
        false,
      work_credit_write:
        false,
      http_submission:
        false,
      runtime_mutation:
        false,
      money_movement:
        false,
    },
  };
}

export function verifyPublicAgentServiceRequesterAcceptanceAuthenticationV1(
  inputValue: unknown,
  catalogValue: unknown,
  packetValue: unknown,
): PublicAgentServiceRequesterAcceptanceAuthenticationPacketV1 {
  const expected =
    materializePublicAgentServiceRequesterAcceptanceAuthenticationV1(
      inputValue,
      catalogValue,
    );
  assertCondition(
    isRecord(packetValue),
    "requester acceptance authentication packet must be an object",
  );
  assertCondition(
    canonicalJson(packetValue)
      === canonicalJson(expected),
    "requester acceptance authentication packet does not match source input",
  );
  return expected;
}

function readJson(file: string): unknown {
  const resolved = path.resolve(file);
  const fileStat = fs.lstatSync(resolved);
  assertCondition(
    !fileStat.isSymbolicLink(),
    "symlink input forbidden",
  );
  assertCondition(
    fileStat.isFile(),
    "regular file input required",
  );
  assertCondition(
    fileStat.size <= MAX_JSON_BYTES,
    "JSON input too large",
  );
  return JSON.parse(
    fs.readFileSync(resolved, "utf8"),
  ) as unknown;
}

function usage(): never {
  return fail(
    [
      "usage:",
      "  tsx scripts/public_agent_service_requester_acceptance_authentication_v1.ts materialize <input.json> <authentication-packet.json>",
      "  tsx scripts/public_agent_service_requester_acceptance_authentication_v1.ts verify <input.json> <authentication-packet.json>",
    ].join("\n"),
  );
}

function main(): void {
  const [mode, inputPath, packetPath, ...extra] =
    process.argv.slice(2);
  assertCondition(
    extra.length === 0,
    "unexpected arguments",
  );
  assertCondition(
    Boolean(inputPath && packetPath),
    "input and packet paths are required",
  );

  const catalog = readJson(
    "ops/public/agent-services-v1/catalog.json",
  );
  const input = readJson(inputPath!);

  if (mode === "materialize") {
    const packet =
      materializePublicAgentServiceRequesterAcceptanceAuthenticationV1(
        input,
        catalog,
      );
    fs.writeFileSync(
      path.resolve(packetPath!),
      `${JSON.stringify(packet, null, 2)}\n`,
      {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      },
    );
    console.log(`marker=${packet.marker}`);
    console.log(
      `requester_authentication_id=${packet.requester_authentication_id}`,
    );
    console.log(`status=${packet.status}`);
    console.log(
      "requester_authentication_verified=true",
    );
    console.log(
      `eligible_for_acceptance_materialization=${packet.acceptance_gate.eligible_for_acceptance_materialization}`,
    );
    console.log(
      "acceptance_replay_consumer_verified=false",
    );
    console.log("acceptance_created=false");
    console.log("acceptance_id=null");
    console.log("quote_acceptance=false");
    console.log("payment_authorization=false");
    console.log("execution_authorization=false");
    console.log("work_dispatch=false");
    console.log("runtime_mutation=false");
    console.log("money_movement=false");
    console.log(`output=${path.resolve(packetPath!)}`);
    return;
  }

  if (mode === "verify") {
    const packet = readJson(packetPath!);
    const result =
      verifyPublicAgentServiceRequesterAcceptanceAuthenticationV1(
        input,
        catalog,
        packet,
      );
    console.log(`marker=${result.marker}`);
    console.log(
      `requester_authentication_id=${result.requester_authentication_id}`,
    );
    console.log(`status=${result.status}`);
    console.log(
      "requester_authentication_verified=true",
    );
    console.log(
      `eligible_for_acceptance_materialization=${result.acceptance_gate.eligible_for_acceptance_materialization}`,
    );
    console.log(
      "acceptance_replay_consumer_verified=false",
    );
    console.log("acceptance_created=false");
    console.log("acceptance_id=null");
    console.log("quote_acceptance=false");
    console.log("payment_authorization=false");
    console.log("execution_authorization=false");
    console.log("work_dispatch=false");
    console.log("runtime_mutation=false");
    console.log("money_movement=false");
    return;
  }

  usage();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
