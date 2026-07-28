import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  canonicalJson,
} from "./agent_paid_work_order_envelope_v1.js";
import {
  PUBLIC_AGENT_SERVICE_PROVIDER_KEY_BINDING_MARKER,
  providerKeyBindingIdV1,
  providerQuoteResponseAuthenticationKeyIdV1,
  type ProviderKeyBindingDraftV1,
  type ProviderKeyBindingV1,
} from "./public_agent_service_provider_quote_response_authentication_v1.js";

export const PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_V1" as const;
export const PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_PACKET_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_PACKET_V1" as const;
export const PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_BODY_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_BODY_V1" as const;
export const PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_AUTHENTICATION_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_AUTHENTICATION_V1" as const;
export const PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_ROOT_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_ROOT_V1" as const;
export const PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_VERSION =
  1 as const;
export const PROVIDER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_SCHEME =
  "ed25519-spki-sha256-v1" as const;
export const PROVIDER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_DOMAIN =
  "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_V1" as const;
export const PROVIDER_TRUST_REGISTRY_SNAPSHOT_CANONICALIZATION =
  "void-canonical-json-v1" as const;

const MAX_JSON_BYTES = 8 * 1024 * 1024;
const ISO_UTC_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const SAFE_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const LOWER_SAFE_ID_PATTERN =
  /^[a-z0-9][a-z0-9._:-]{2,127}$/;
const NONCE_PATTERN =
  /^[A-Za-z0-9._:-]{8,128}$/;
const KEY_ID_PATTERN =
  /^ed25519:[0-9a-f]{64}$/;
const ROOT_ID_PATTERN =
  /^voidaptr1_[0-9a-f]{64}$/;
const SNAPSHOT_ID_PATTERN =
  /^voidapts1_[0-9a-f]{64}$/;
const AUTHENTICATION_ID_PATTERN =
  /^voidaptsa1_[0-9a-f]{64}$/;
const BINDING_ID_PATTERN =
  /^voidapkb1_[0-9a-f]{64}$/;
const BASE64_PATTERN =
  /^(?:[A-Za-z0-9+/]{4}){21}[A-Za-z0-9+/]{2}==$/;

export type ProviderTrustRootDraftV1 = {
  marker: typeof PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_ROOT_MARKER;
  version: 1;
  trust_status:
    | "example_fixture"
    | "operator_pinned_trust_root";
  authority_scope: "provider_trust_registry_snapshot_verify";
  key_id: string;
  public_key_pem: string;
  valid_from_utc: string;
  expires_at_utc: string;
  revoked_at_utc: string | null;
  root_nonce: string;
};

export type ProviderTrustRootV1 =
  ProviderTrustRootDraftV1 & {
    root_id: string;
  };

export type ProviderTrustRegistrySnapshotBodyV1 = {
  marker:
    typeof PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_BODY_MARKER;
  version: 1;
  snapshot_status:
    | "example_fixture"
    | "operator_approved_snapshot";
  registry_id: string;
  sequence: number;
  previous_snapshot_id: string | null;
  generated_at_utc: string;
  expires_at_utc: string;
  snapshot_nonce: string;
  provider_key_bindings: ProviderKeyBindingV1[];
};

export type ProviderTrustRegistrySnapshotAuthenticationBodyV1 = {
  marker:
    typeof PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_AUTHENTICATION_MARKER;
  version: 1;
  signature_scheme:
    typeof PROVIDER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_SCHEME;
  signature_domain:
    typeof PROVIDER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_DOMAIN;
  canonicalization:
    typeof PROVIDER_TRUST_REGISTRY_SNAPSHOT_CANONICALIZATION;
  snapshot_id: string;
  trust_root_id: string;
  key_id: string;
  signed_at_utc: string;
};

export type ProviderTrustRegistrySnapshotAuthenticationEnvelopeV1 =
  ProviderTrustRegistrySnapshotAuthenticationBodyV1 & {
    signature_base64: string;
    authentication_id: string;
  };

export type PublicAgentServiceProviderTrustRegistrySnapshotV1 = {
  marker:
    typeof PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_VERSION;
  evidence_mode:
    | "example_fixture"
    | "operator_signed_snapshot";
  trust_root: ProviderTrustRootV1;
  snapshot_body: ProviderTrustRegistrySnapshotBodyV1;
  authentication_envelope:
    ProviderTrustRegistrySnapshotAuthenticationEnvelopeV1;
};

export type PublicAgentServiceProviderTrustRegistrySnapshotPacketV1 = {
  marker:
    typeof PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_PACKET_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_VERSION;
  status:
    | "example_only"
    | "operator_signed_snapshot_verified";
  snapshot_id: string;
  authentication_id: string;
  source: {
    registry_id: string;
    sequence: number;
    previous_snapshot_id: string | null;
    trust_root_id: string;
    trust_root_key_id: string;
    generated_at_utc: string;
    expires_at_utc: string;
    provider_count: number;
  };
  trust_root: ProviderTrustRootV1;
  snapshot_body: ProviderTrustRegistrySnapshotBodyV1;
  authentication_envelope:
    ProviderTrustRegistrySnapshotAuthenticationEnvelopeV1;
  verification: {
    expected_trust_root_id_verified: true;
    trust_root_key_id_verified: true;
    trust_root_id_verified: true;
    snapshot_id_verified: true;
    authentication_id_verified: true;
    signature_verified: true;
    canonical_provider_order_verified: true;
    unique_provider_ids_verified: true;
    unique_binding_ids_verified: true;
    unique_provider_key_ids_verified: true;
    binding_ids_verified: true;
    provider_key_ids_verified: true;
    authority_scopes_verified: true;
    time_windows_verified: true;
    revocation_windows_verified: true;
    snapshot_provenance_verified: true;
  };
  provider_authentication_gate: {
    eligible_for_provider_authentication: boolean;
    reason:
      | "example_fixture_not_live_trust"
      | "operator_signed_snapshot_verified";
    expected_trust_root_id_required: true;
    separate_provider_selection_required: true;
    snapshot_replay_protection_required: true;
    monotonic_sequence_enforcement_required: true;
    prior_snapshot_continuity_required: true;
  };
  authority: {
    trust_root_creation: false;
    trust_root_rotation: false;
    trust_root_revocation: false;
    provider_key_binding_creation: false;
    provider_key_registry_write: false;
    provider_approval: false;
    provider_key_rotation: false;
    provider_key_revocation: false;
    provider_selection: false;
    quote_generation: false;
    quote_submission: false;
    quote_publication: false;
    quote_acceptance: false;
    payment_rail_resolution: false;
    payment_destination_resolution: false;
    payment_authorization: false;
    payment_execution: false;
    work_execution_authorization: false;
    work_dispatch: false;
    work_credit_write: false;
    work_credit_settlement: false;
    wallet_access: false;
    production_signing: false;
    transaction_broadcast: false;
    http_submission: false;
    credential_change: false;
    runtime_mutation: false;
    service_restart: false;
    deployment: false;
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
  assertCondition(isRecord(value), `${label} must be an object`);
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
    actual.length === expected.length
      && actual.every((key, index) => key === expected[index]),
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
    `${label} length is outside bounds`,
  );
  if (pattern) {
    assertCondition(pattern.test(value), `${label} has invalid format`);
  }
  return value;
}

function requireSafeInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  assertCondition(
    typeof value === "number" && Number.isSafeInteger(value),
    `${label} must be a safe integer`,
  );
  assertCondition(
    value >= minimum && value <= maximum,
    `${label} is outside bounds`,
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
  const parsed = Date.parse(result);
  assertCondition(Number.isFinite(parsed), `${label} is not valid UTC`);
  assertCondition(
    new Date(parsed).toISOString().replace(".000Z", "Z") === result,
    `${label} is not a canonical UTC timestamp`,
  );
  return result;
}

function requireCanonicalPublicKeyPem(
  value: unknown,
  label: string,
): string {
  assertCondition(typeof value === "string", `${label} must be a string`);
  assertCondition(
    value.length >= 80 && value.length <= 2048,
    `${label} length is outside bounds`,
  );
  assertCondition(!value.includes("\r"), `${label} must use LF line endings`);
  assertCondition(
    value === value.trimStart(),
    `${label} must not contain leading whitespace`,
  );
  assertCondition(
    value === `${value.trimEnd()}\n`,
    `${label} must end with exactly one newline`,
  );
  assertCondition(
    value.startsWith("-----BEGIN PUBLIC KEY-----\n"),
    `${label} must begin with a public-key PEM header`,
  );
  assertCondition(
    value.endsWith("\n-----END PUBLIC KEY-----\n"),
    `${label} must end with a public-key PEM footer`,
  );
  return value;
}

function sha256Hex(
  value: string | Uint8Array,
): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function publicKeyFromPem(
  pem: string,
): crypto.KeyObject {
  let key: crypto.KeyObject;
  try {
    key = crypto.createPublicKey(pem);
  } catch {
    return fail("trust-root public key PEM could not be parsed");
  }
  assertCondition(
    key.asymmetricKeyType === "ed25519",
    "trust-root public key must be Ed25519",
  );
  return key;
}

export function providerTrustRootIdV1(
  draft: ProviderTrustRootDraftV1,
): string {
  return `voidaptr1_${sha256Hex(canonicalJson(draft))}`;
}

export function providerTrustRegistrySnapshotIdV1(
  body: ProviderTrustRegistrySnapshotBodyV1,
): string {
  return `voidapts1_${sha256Hex(canonicalJson(body))}`;
}

function exactAuthenticationBody(
  value: ProviderTrustRegistrySnapshotAuthenticationBodyV1,
): ProviderTrustRegistrySnapshotAuthenticationBodyV1 {
  return {
    marker: value.marker,
    version: value.version,
    signature_scheme: value.signature_scheme,
    signature_domain: value.signature_domain,
    canonicalization: value.canonicalization,
    snapshot_id: value.snapshot_id,
    trust_root_id: value.trust_root_id,
    key_id: value.key_id,
    signed_at_utc: value.signed_at_utc,
  };
}

export function providerTrustRegistrySnapshotSigningBytesV1(
  snapshotBody: ProviderTrustRegistrySnapshotBodyV1,
  authenticationBody:
    ProviderTrustRegistrySnapshotAuthenticationBodyV1,
): Buffer {
  return Buffer.from(
    `${PROVIDER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_DOMAIN}\n`
      + canonicalJson({
        snapshot_body: snapshotBody,
        authentication_body:
          exactAuthenticationBody(authenticationBody),
      }),
    "utf8",
  );
}

export function providerTrustRegistrySnapshotAuthenticationIdV1(
  envelopeWithoutId:
    ProviderTrustRegistrySnapshotAuthenticationBodyV1 & {
      signature_base64: string;
    },
): string {
  return `voidaptsa1_${sha256Hex(
    canonicalJson(envelopeWithoutId),
  )}`;
}

function validateTrustRoot(
  value: unknown,
): ProviderTrustRootV1 {
  const root = requireRecord(value, "trust_root");
  requireExactKeys(
    root,
    "trust_root",
    [
      "marker",
      "version",
      "trust_status",
      "authority_scope",
      "key_id",
      "public_key_pem",
      "valid_from_utc",
      "expires_at_utc",
      "revoked_at_utc",
      "root_nonce",
      "root_id",
    ],
  );
  assertCondition(
    root.marker === PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_ROOT_MARKER,
    "trust-root marker mismatch",
  );
  assertCondition(root.version === 1, "trust-root version mismatch");
  assertCondition(
    root.trust_status === "example_fixture"
      || root.trust_status === "operator_pinned_trust_root",
    "trust-root status is invalid",
  );
  assertCondition(
    root.authority_scope
      === "provider_trust_registry_snapshot_verify",
    "trust-root authority scope mismatch",
  );
  const keyId = requireString(
    root.key_id,
    "trust_root.key_id",
    KEY_ID_PATTERN,
    72,
    72,
  );
  const publicKeyPem = requireCanonicalPublicKeyPem(
    root.public_key_pem,
    "trust_root.public_key_pem",
  );
  const validFrom = requireIsoUtc(
    root.valid_from_utc,
    "trust_root.valid_from_utc",
  );
  const expiresAt = requireIsoUtc(
    root.expires_at_utc,
    "trust_root.expires_at_utc",
  );
  assertCondition(
    Date.parse(expiresAt) > Date.parse(validFrom),
    "trust-root expiry must follow activation",
  );
  let revokedAt: string | null = null;
  if (root.revoked_at_utc !== null) {
    revokedAt = requireIsoUtc(
      root.revoked_at_utc,
      "trust_root.revoked_at_utc",
    );
    assertCondition(
      Date.parse(revokedAt) >= Date.parse(validFrom),
      "trust-root revocation cannot predate activation",
    );
  }
  const rootNonce = requireString(
    root.root_nonce,
    "trust_root.root_nonce",
    NONCE_PATTERN,
    8,
    128,
  );
  const rootId = requireString(
    root.root_id,
    "trust_root.root_id",
    ROOT_ID_PATTERN,
    74,
    74,
  );
  const derivedKeyId =
    providerQuoteResponseAuthenticationKeyIdV1(publicKeyPem);
  assertCondition(
    keyId === derivedKeyId,
    "trust-root key_id does not match Ed25519 SPKI public key",
  );
  const draft: ProviderTrustRootDraftV1 = {
    marker: PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_ROOT_MARKER,
    version: 1,
    trust_status: root.trust_status,
    authority_scope: "provider_trust_registry_snapshot_verify",
    key_id: keyId,
    public_key_pem: publicKeyPem,
    valid_from_utc: validFrom,
    expires_at_utc: expiresAt,
    revoked_at_utc: revokedAt,
    root_nonce: rootNonce,
  };
  assertCondition(
    rootId === providerTrustRootIdV1(draft),
    "trust-root root_id does not match canonical content",
  );
  return {
    ...draft,
    root_id: rootId,
  };
}

function validateProviderKeyBinding(
  value: unknown,
  index: number,
): ProviderKeyBindingV1 {
  const label = `snapshot_body.provider_key_bindings[${index}]`;
  const root = requireRecord(value, label);
  requireExactKeys(
    root,
    label,
    [
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
    ],
  );
  assertCondition(
    root.marker === PUBLIC_AGENT_SERVICE_PROVIDER_KEY_BINDING_MARKER,
    `${label}.marker mismatch`,
  );
  assertCondition(root.version === 1, `${label}.version mismatch`);
  assertCondition(
    root.binding_status === "example_fixture"
      || root.binding_status === "operator_approved_snapshot",
    `${label}.binding_status is invalid`,
  );
  const providerId = requireString(
    root.provider_id,
    `${label}.provider_id`,
    SAFE_ID_PATTERN,
    3,
    128,
  );
  assertCondition(
    root.authority_scope === "provider_quote_response_authenticate",
    `${label}.authority_scope mismatch`,
  );
  const keyId = requireString(
    root.key_id,
    `${label}.key_id`,
    KEY_ID_PATTERN,
    72,
    72,
  );
  const publicKeyPem = requireCanonicalPublicKeyPem(
    root.public_key_pem,
    `${label}.public_key_pem`,
  );
  const validFrom = requireIsoUtc(
    root.valid_from_utc,
    `${label}.valid_from_utc`,
  );
  const expiresAt = requireIsoUtc(
    root.expires_at_utc,
    `${label}.expires_at_utc`,
  );
  assertCondition(
    Date.parse(expiresAt) > Date.parse(validFrom),
    `${label} expiry must follow activation`,
  );
  let revokedAt: string | null = null;
  if (root.revoked_at_utc !== null) {
    revokedAt = requireIsoUtc(
      root.revoked_at_utc,
      `${label}.revoked_at_utc`,
    );
    assertCondition(
      Date.parse(revokedAt) >= Date.parse(validFrom),
      `${label} revocation cannot predate activation`,
    );
  }
  const bindingNonce = requireString(
    root.binding_nonce,
    `${label}.binding_nonce`,
    NONCE_PATTERN,
    8,
    128,
  );
  const bindingId = requireString(
    root.binding_id,
    `${label}.binding_id`,
    BINDING_ID_PATTERN,
    74,
    74,
  );
  const derivedKeyId =
    providerQuoteResponseAuthenticationKeyIdV1(publicKeyPem);
  assertCondition(
    keyId === derivedKeyId,
    `${label}.key_id does not match Ed25519 SPKI public key`,
  );
  const draft: ProviderKeyBindingDraftV1 = {
    marker: PUBLIC_AGENT_SERVICE_PROVIDER_KEY_BINDING_MARKER,
    version: 1,
    binding_status: root.binding_status,
    provider_id: providerId,
    authority_scope: "provider_quote_response_authenticate",
    key_id: keyId,
    public_key_pem: publicKeyPem,
    valid_from_utc: validFrom,
    expires_at_utc: expiresAt,
    revoked_at_utc: revokedAt,
    binding_nonce: bindingNonce,
  };
  assertCondition(
    bindingId === providerKeyBindingIdV1(draft),
    `${label}.binding_id does not match canonical content`,
  );
  return {
    ...draft,
    binding_id: bindingId,
  };
}

function validateSnapshotBody(
  value: unknown,
): ProviderTrustRegistrySnapshotBodyV1 {
  const root = requireRecord(value, "snapshot_body");
  requireExactKeys(
    root,
    "snapshot_body",
    [
      "marker",
      "version",
      "snapshot_status",
      "registry_id",
      "sequence",
      "previous_snapshot_id",
      "generated_at_utc",
      "expires_at_utc",
      "snapshot_nonce",
      "provider_key_bindings",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_BODY_MARKER,
    "snapshot-body marker mismatch",
  );
  assertCondition(root.version === 1, "snapshot-body version mismatch");
  assertCondition(
    root.snapshot_status === "example_fixture"
      || root.snapshot_status === "operator_approved_snapshot",
    "snapshot status is invalid",
  );
  const registryId = requireString(
    root.registry_id,
    "snapshot_body.registry_id",
    LOWER_SAFE_ID_PATTERN,
    3,
    128,
  );
  const sequence = requireSafeInteger(
    root.sequence,
    "snapshot_body.sequence",
    1,
    Number.MAX_SAFE_INTEGER,
  );
  let previousSnapshotId: string | null = null;
  if (root.previous_snapshot_id !== null) {
    previousSnapshotId = requireString(
      root.previous_snapshot_id,
      "snapshot_body.previous_snapshot_id",
      SNAPSHOT_ID_PATTERN,
      74,
      74,
    );
  }
  assertCondition(
    sequence === 1
      ? previousSnapshotId === null
      : previousSnapshotId !== null,
    "snapshot sequence and previous_snapshot_id are inconsistent",
  );
  const generatedAt = requireIsoUtc(
    root.generated_at_utc,
    "snapshot_body.generated_at_utc",
  );
  const expiresAt = requireIsoUtc(
    root.expires_at_utc,
    "snapshot_body.expires_at_utc",
  );
  assertCondition(
    Date.parse(expiresAt) > Date.parse(generatedAt),
    "snapshot expiry must follow generation",
  );
  const snapshotNonce = requireString(
    root.snapshot_nonce,
    "snapshot_body.snapshot_nonce",
    NONCE_PATTERN,
    8,
    128,
  );
  assertCondition(
    Array.isArray(root.provider_key_bindings),
    "snapshot_body.provider_key_bindings must be an array",
  );
  assertCondition(
    root.provider_key_bindings.length >= 1
      && root.provider_key_bindings.length <= 1024,
    "snapshot provider binding count is outside bounds",
  );
  const bindings = root.provider_key_bindings.map(
    (binding, index) => validateProviderKeyBinding(binding, index),
  );
  const providerIds = bindings.map((binding) => binding.provider_id);
  const bindingIds = bindings.map((binding) => binding.binding_id);
  const keyIds = bindings.map((binding) => binding.key_id);
  assertCondition(
    new Set(providerIds).size === providerIds.length,
    "snapshot provider IDs must be unique",
  );
  assertCondition(
    new Set(bindingIds).size === bindingIds.length,
    "snapshot binding IDs must be unique",
  );
  assertCondition(
    new Set(keyIds).size === keyIds.length,
    "snapshot provider key IDs must be unique",
  );
  const sortedProviderIds = [...providerIds].sort();
  assertCondition(
    providerIds.every(
      (providerId, index) => providerId === sortedProviderIds[index],
    ),
    "snapshot provider bindings must be sorted by provider_id",
  );
  const generated = Date.parse(generatedAt);
  const snapshotExpiry = Date.parse(expiresAt);
  for (const binding of bindings) {
    assertCondition(
      Date.parse(binding.valid_from_utc) <= generated,
      `provider ${binding.provider_id} is not active at snapshot generation`,
    );
    assertCondition(
      Date.parse(binding.expires_at_utc) >= snapshotExpiry,
      `provider ${binding.provider_id} binding expires before snapshot`,
    );
    if (binding.revoked_at_utc !== null) {
      assertCondition(
        Date.parse(binding.revoked_at_utc) >= snapshotExpiry,
        `provider ${binding.provider_id} is revoked before snapshot expiry`,
      );
    }
  }
  return {
    marker:
      PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_BODY_MARKER,
    version: 1,
    snapshot_status: root.snapshot_status,
    registry_id: registryId,
    sequence,
    previous_snapshot_id: previousSnapshotId,
    generated_at_utc: generatedAt,
    expires_at_utc: expiresAt,
    snapshot_nonce: snapshotNonce,
    provider_key_bindings: bindings,
  };
}

function validateAuthenticationEnvelope(
  value: unknown,
): ProviderTrustRegistrySnapshotAuthenticationEnvelopeV1 {
  const root = requireRecord(
    value,
    "authentication_envelope",
  );
  requireExactKeys(
    root,
    "authentication_envelope",
    [
      "marker",
      "version",
      "signature_scheme",
      "signature_domain",
      "canonicalization",
      "snapshot_id",
      "trust_root_id",
      "key_id",
      "signed_at_utc",
      "signature_base64",
      "authentication_id",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_AUTHENTICATION_MARKER,
    "snapshot authentication marker mismatch",
  );
  assertCondition(
    root.version === 1,
    "snapshot authentication version mismatch",
  );
  assertCondition(
    root.signature_scheme
      === PROVIDER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_SCHEME,
    "snapshot signature scheme mismatch",
  );
  assertCondition(
    root.signature_domain
      === PROVIDER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_DOMAIN,
    "snapshot signature domain mismatch",
  );
  assertCondition(
    root.canonicalization
      === PROVIDER_TRUST_REGISTRY_SNAPSHOT_CANONICALIZATION,
    "snapshot canonicalization mismatch",
  );
  const body: ProviderTrustRegistrySnapshotAuthenticationBodyV1 = {
    marker:
      PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_AUTHENTICATION_MARKER,
    version: 1,
    signature_scheme:
      PROVIDER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_SCHEME,
    signature_domain:
      PROVIDER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_DOMAIN,
    canonicalization:
      PROVIDER_TRUST_REGISTRY_SNAPSHOT_CANONICALIZATION,
    snapshot_id: requireString(
      root.snapshot_id,
      "authentication_envelope.snapshot_id",
      SNAPSHOT_ID_PATTERN,
      74,
      74,
    ),
    trust_root_id: requireString(
      root.trust_root_id,
      "authentication_envelope.trust_root_id",
      ROOT_ID_PATTERN,
      74,
      74,
    ),
    key_id: requireString(
      root.key_id,
      "authentication_envelope.key_id",
      KEY_ID_PATTERN,
      72,
      72,
    ),
    signed_at_utc: requireIsoUtc(
      root.signed_at_utc,
      "authentication_envelope.signed_at_utc",
    ),
  };
  const signatureBase64 = requireString(
    root.signature_base64,
    "authentication_envelope.signature_base64",
    BASE64_PATTERN,
    88,
    88,
  );
  const signatureBytes = Buffer.from(signatureBase64, "base64");
  assertCondition(
    signatureBytes.length === 64
      && signatureBytes.toString("base64") === signatureBase64,
    "snapshot signature must be canonical 64-byte base64",
  );
  const authenticationId = requireString(
    root.authentication_id,
    "authentication_envelope.authentication_id",
    AUTHENTICATION_ID_PATTERN,
    75,
    75,
  );
  assertCondition(
    authenticationId
      === providerTrustRegistrySnapshotAuthenticationIdV1({
        ...body,
        signature_base64: signatureBase64,
      }),
    "snapshot authentication_id does not match canonical envelope",
  );
  return {
    ...body,
    signature_base64: signatureBase64,
    authentication_id: authenticationId,
  };
}

export function validatePublicAgentServiceProviderTrustRegistrySnapshotV1(
  value: unknown,
): PublicAgentServiceProviderTrustRegistrySnapshotV1 {
  const root = requireRecord(value, "provider trust snapshot input");
  requireExactKeys(
    root,
    "provider trust snapshot input",
    [
      "marker",
      "version",
      "evidence_mode",
      "trust_root",
      "snapshot_body",
      "authentication_envelope",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_MARKER,
    "provider trust snapshot marker mismatch",
  );
  assertCondition(root.version === 1, "provider trust snapshot version mismatch");
  assertCondition(
    root.evidence_mode === "example_fixture"
      || root.evidence_mode === "operator_signed_snapshot",
    "provider trust snapshot evidence mode is invalid",
  );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_VERSION,
    evidence_mode: root.evidence_mode,
    trust_root: validateTrustRoot(root.trust_root),
    snapshot_body: validateSnapshotBody(root.snapshot_body),
    authentication_envelope:
      validateAuthenticationEnvelope(root.authentication_envelope),
  };
}

function verifySnapshotBindings(
  input: PublicAgentServiceProviderTrustRegistrySnapshotV1,
  expectedTrustRootId: string,
): void {
  requireString(
    expectedTrustRootId,
    "expected trust-root ID",
    ROOT_ID_PATTERN,
    74,
    74,
  );
  const trustRoot = input.trust_root;
  const snapshot = input.snapshot_body;
  const authentication = input.authentication_envelope;
  assertCondition(
    trustRoot.root_id === expectedTrustRootId,
    "snapshot trust root does not match pinned expected trust-root ID",
  );
  const snapshotId = providerTrustRegistrySnapshotIdV1(snapshot);
  assertCondition(
    authentication.snapshot_id === snapshotId,
    "snapshot authentication snapshot_id mismatch",
  );
  assertCondition(
    authentication.trust_root_id === trustRoot.root_id,
    "snapshot authentication trust_root_id mismatch",
  );
  assertCondition(
    authentication.key_id === trustRoot.key_id,
    "snapshot authentication key_id mismatch",
  );
  const rootStart = Date.parse(trustRoot.valid_from_utc);
  const rootEnd = Date.parse(trustRoot.expires_at_utc);
  const generated = Date.parse(snapshot.generated_at_utc);
  const snapshotEnd = Date.parse(snapshot.expires_at_utc);
  const signedAt = Date.parse(authentication.signed_at_utc);
  assertCondition(
    generated >= rootStart && generated < rootEnd,
    "snapshot generation is outside trust-root window",
  );
  assertCondition(
    snapshotEnd <= rootEnd,
    "snapshot outlives trust root",
  );
  assertCondition(
    signedAt >= generated && signedAt < snapshotEnd,
    "snapshot signature time is outside snapshot window",
  );
  assertCondition(
    signedAt >= rootStart && signedAt < rootEnd,
    "snapshot signature time is outside trust-root window",
  );
  if (trustRoot.revoked_at_utc !== null) {
    assertCondition(
      signedAt < Date.parse(trustRoot.revoked_at_utc),
      "trust root was revoked before snapshot signing",
    );
  }
  if (input.evidence_mode === "example_fixture") {
    assertCondition(
      trustRoot.trust_status === "example_fixture",
      "example snapshot requires example trust root",
    );
    assertCondition(
      snapshot.snapshot_status === "example_fixture",
      "example snapshot requires example snapshot status",
    );
    assertCondition(
      snapshot.provider_key_bindings.every(
        (binding) => binding.binding_status === "example_fixture",
      ),
      "example snapshot requires example provider bindings",
    );
  } else {
    assertCondition(
      trustRoot.trust_status === "operator_pinned_trust_root",
      "operator snapshot requires pinned operator trust root",
    );
    assertCondition(
      snapshot.snapshot_status === "operator_approved_snapshot",
      "operator snapshot requires operator-approved snapshot status",
    );
    assertCondition(
      snapshot.provider_key_bindings.every(
        (binding) =>
          binding.binding_status === "operator_approved_snapshot",
      ),
      "operator snapshot requires operator-approved provider bindings",
    );
  }
  const publicKey = publicKeyFromPem(trustRoot.public_key_pem);
  const signatureVerified = crypto.verify(
    null,
    providerTrustRegistrySnapshotSigningBytesV1(
      snapshot,
      authentication,
    ),
    publicKey,
    Buffer.from(authentication.signature_base64, "base64"),
  );
  assertCondition(
    signatureVerified,
    "provider trust registry snapshot signature is invalid",
  );
}

export function materializePublicAgentServiceProviderTrustRegistrySnapshotV1(
  inputValue: unknown,
  expectedTrustRootId: string,
): PublicAgentServiceProviderTrustRegistrySnapshotPacketV1 {
  const input =
    validatePublicAgentServiceProviderTrustRegistrySnapshotV1(
      inputValue,
    );
  verifySnapshotBindings(input, expectedTrustRootId);
  const example = input.evidence_mode === "example_fixture";
  const snapshotId =
    providerTrustRegistrySnapshotIdV1(input.snapshot_body);
  return {
    marker:
      PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_PACKET_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_VERSION,
    status: example
      ? "example_only"
      : "operator_signed_snapshot_verified",
    snapshot_id: snapshotId,
    authentication_id:
      input.authentication_envelope.authentication_id,
    source: {
      registry_id: input.snapshot_body.registry_id,
      sequence: input.snapshot_body.sequence,
      previous_snapshot_id:
        input.snapshot_body.previous_snapshot_id,
      trust_root_id: input.trust_root.root_id,
      trust_root_key_id: input.trust_root.key_id,
      generated_at_utc: input.snapshot_body.generated_at_utc,
      expires_at_utc: input.snapshot_body.expires_at_utc,
      provider_count:
        input.snapshot_body.provider_key_bindings.length,
    },
    trust_root: input.trust_root,
    snapshot_body: input.snapshot_body,
    authentication_envelope:
      input.authentication_envelope,
    verification: {
      expected_trust_root_id_verified: true,
      trust_root_key_id_verified: true,
      trust_root_id_verified: true,
      snapshot_id_verified: true,
      authentication_id_verified: true,
      signature_verified: true,
      canonical_provider_order_verified: true,
      unique_provider_ids_verified: true,
      unique_binding_ids_verified: true,
      unique_provider_key_ids_verified: true,
      binding_ids_verified: true,
      provider_key_ids_verified: true,
      authority_scopes_verified: true,
      time_windows_verified: true,
      revocation_windows_verified: true,
      snapshot_provenance_verified: true,
    },
    provider_authentication_gate: {
      eligible_for_provider_authentication: !example,
      reason: example
        ? "example_fixture_not_live_trust"
        : "operator_signed_snapshot_verified",
      expected_trust_root_id_required: true,
      separate_provider_selection_required: true,
      snapshot_replay_protection_required: true,
      monotonic_sequence_enforcement_required: true,
      prior_snapshot_continuity_required: true,
    },
    authority: {
      trust_root_creation: false,
      trust_root_rotation: false,
      trust_root_revocation: false,
      provider_key_binding_creation: false,
      provider_key_registry_write: false,
      provider_approval: false,
      provider_key_rotation: false,
      provider_key_revocation: false,
      provider_selection: false,
      quote_generation: false,
      quote_submission: false,
      quote_publication: false,
      quote_acceptance: false,
      payment_rail_resolution: false,
      payment_destination_resolution: false,
      payment_authorization: false,
      payment_execution: false,
      work_execution_authorization: false,
      work_dispatch: false,
      work_credit_write: false,
      work_credit_settlement: false,
      wallet_access: false,
      production_signing: false,
      transaction_broadcast: false,
      http_submission: false,
      credential_change: false,
      runtime_mutation: false,
      service_restart: false,
      deployment: false,
      money_movement: false,
    },
  };
}

export function verifyPublicAgentServiceProviderTrustRegistrySnapshotV1(
  inputValue: unknown,
  expectedTrustRootId: string,
  packetValue: unknown,
): PublicAgentServiceProviderTrustRegistrySnapshotPacketV1 {
  const expected =
    materializePublicAgentServiceProviderTrustRegistrySnapshotV1(
      inputValue,
      expectedTrustRootId,
    );
  assertCondition(
    isRecord(packetValue),
    "provider trust snapshot packet must be an object",
  );
  assertCondition(
    canonicalJson(packetValue) === canonicalJson(expected),
    "provider trust snapshot packet does not match source evidence",
  );
  return expected;
}

export function resolveProviderKeyBindingFromTrustRegistrySnapshotV1(
  inputValue: unknown,
  expectedTrustRootId: string,
  providerId: string,
  atUtc: string,
): ProviderKeyBindingV1 {
  const packet =
    materializePublicAgentServiceProviderTrustRegistrySnapshotV1(
      inputValue,
      expectedTrustRootId,
    );
  assertCondition(
    packet.provider_authentication_gate
      .eligible_for_provider_authentication,
    "provider trust snapshot is not eligible for live authentication",
  );
  const exactProviderId = requireString(
    providerId,
    "provider_id",
    SAFE_ID_PATTERN,
    3,
    128,
  );
  const exactAt = requireIsoUtc(atUtc, "at_utc");
  const at = Date.parse(exactAt);
  assertCondition(
    at >= Date.parse(packet.snapshot_body.generated_at_utc)
      && at < Date.parse(packet.snapshot_body.expires_at_utc),
    "provider resolution time is outside snapshot window",
  );
  const matches =
    packet.snapshot_body.provider_key_bindings.filter(
      (binding) => binding.provider_id === exactProviderId,
    );
  assertCondition(
    matches.length === 1,
    "provider must resolve to exactly one binding",
  );
  const binding = matches[0]!;
  assertCondition(
    at >= Date.parse(binding.valid_from_utc)
      && at < Date.parse(binding.expires_at_utc),
    "provider binding is inactive at resolution time",
  );
  if (binding.revoked_at_utc !== null) {
    assertCondition(
      at < Date.parse(binding.revoked_at_utc),
      "provider binding is revoked at resolution time",
    );
  }
  return binding;
}

function readJson(file: string): unknown {
  const resolved = path.resolve(file);
  const fileStat = fs.lstatSync(resolved);
  assertCondition(!fileStat.isSymbolicLink(), "symlink input forbidden");
  assertCondition(fileStat.isFile(), "regular file input required");
  assertCondition(fileStat.size <= MAX_JSON_BYTES, "JSON input too large");
  return JSON.parse(fs.readFileSync(resolved, "utf8")) as unknown;
}

function usage(): never {
  return fail(
    [
      "usage:",
      "  tsx scripts/public_agent_service_provider_trust_registry_snapshot_v1.ts materialize <input.json> <expected-trust-root-id> <packet.json>",
      "  tsx scripts/public_agent_service_provider_trust_registry_snapshot_v1.ts verify <input.json> <expected-trust-root-id> <packet.json>",
    ].join("\n"),
  );
}

function main(): void {
  const [
    mode,
    inputPath,
    expectedTrustRootId,
    packetPath,
    ...extra
  ] = process.argv.slice(2);
  assertCondition(extra.length === 0, "unexpected arguments");
  assertCondition(
    Boolean(inputPath && expectedTrustRootId && packetPath),
    "input, expected trust-root ID, and packet paths are required",
  );
  const input = readJson(inputPath!);
  if (mode === "materialize") {
    const packet =
      materializePublicAgentServiceProviderTrustRegistrySnapshotV1(
        input,
        expectedTrustRootId!,
      );
    fs.writeFileSync(
      path.resolve(packetPath!),
      `${JSON.stringify(packet, null, 2)}\n`,
      { encoding: "utf8", flag: "wx", mode: 0o600 },
    );
    console.log(`marker=${packet.marker}`);
    console.log(`snapshot_id=${packet.snapshot_id}`);
    console.log(`authentication_id=${packet.authentication_id}`);
    console.log(`status=${packet.status}`);
    console.log(`registry_id=${packet.source.registry_id}`);
    console.log(`sequence=${packet.source.sequence}`);
    console.log(`provider_count=${packet.source.provider_count}`);
    console.log(
      `eligible_for_provider_authentication=${packet.provider_authentication_gate.eligible_for_provider_authentication}`,
    );
    console.log("provider_selection=false");
    console.log("quote_publication=false");
    console.log("quote_acceptance=false");
    console.log("payment_authorization=false");
    console.log("payment_execution=false");
    console.log("work_execution_authorization=false");
    console.log("work_dispatch=false");
    console.log("work_credit_write=false");
    console.log("wallet_access=false");
    console.log("runtime_mutation=false");
    console.log("money_movement=false");
    console.log(`output=${path.resolve(packetPath!)}`);
    return;
  }
  if (mode === "verify") {
    const packet = readJson(packetPath!);
    const result =
      verifyPublicAgentServiceProviderTrustRegistrySnapshotV1(
        input,
        expectedTrustRootId!,
        packet,
      );
    console.log(`marker=${result.marker}`);
    console.log(`snapshot_id=${result.snapshot_id}`);
    console.log(`status=${result.status}`);
    console.log("snapshot_provenance_verified=true");
    console.log(
      `eligible_for_provider_authentication=${result.provider_authentication_gate.eligible_for_provider_authentication}`,
    );
    console.log("provider_selection=false");
    console.log("quote_publication=false");
    console.log("quote_acceptance=false");
    console.log("payment_authorization=false");
    console.log("payment_execution=false");
    console.log("work_dispatch=false");
    console.log("work_credit_write=false");
    console.log("wallet_access=false");
    console.log("runtime_mutation=false");
    console.log("money_movement=false");
    console.log(
      "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_V1_VALID",
    );
    return;
  }
  usage();
}

const invokedUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";

if (invokedUrl === import.meta.url) {
  try {
    main();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    console.error(`HOLD: ${message}`);
    process.exitCode = 1;
  }
}
