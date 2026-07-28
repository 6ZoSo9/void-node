import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  canonicalJson,
} from "./agent_paid_work_order_envelope_v1.js";
import {
  PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_KEY_BINDING_MARKER,
  PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SCOPE,
  requesterAcceptanceAuthenticationKeyIdV1,
  requesterAcceptanceKeyBindingIdV1,
  type RequesterAcceptanceKeyBindingDraftV1,
  type RequesterAcceptanceKeyBindingV1,
} from "./public_agent_service_requester_acceptance_authentication_v1.js";

export const PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_V1" as const;
export const PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_PACKET_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_PACKET_V1" as const;
export const PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_BODY_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_BODY_V1" as const;
export const PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_AUTHENTICATION_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_AUTHENTICATION_V1" as const;
export const PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_ROOT_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_ROOT_V1" as const;
export const PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_VERSION =
  1 as const;
export const REQUESTER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_SCHEME =
  "ed25519-spki-sha256-v1" as const;
export const REQUESTER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_DOMAIN =
  "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_V1" as const;
export const REQUESTER_TRUST_REGISTRY_SNAPSHOT_CANONICALIZATION =
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
  /^voidartr1_[0-9a-f]{64}$/;
const SNAPSHOT_ID_PATTERN =
  /^voidarts1_[0-9a-f]{64}$/;
const AUTHENTICATION_ID_PATTERN =
  /^voidartsa1_[0-9a-f]{64}$/;
const BINDING_ID_PATTERN =
  /^voidarkb1_[0-9a-f]{64}$/;
const BASE64_PATTERN =
  /^[A-Za-z0-9+/]{86}==$/;

export type RequesterTrustRootDraftV1 = {
  marker:
    typeof PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_ROOT_MARKER;
  version: 1;
  trust_status:
    | "example_fixture"
    | "operator_pinned_trust_root";
  authority_scope:
    "requester_trust_registry_snapshot_verify";
  key_id: string;
  public_key_pem: string;
  valid_from_utc: string;
  expires_at_utc: string;
  revoked_at_utc: string | null;
  root_nonce: string;
};

export type RequesterTrustRootV1 =
  RequesterTrustRootDraftV1 & {
    root_id: string;
  };

export type RequesterTrustRegistrySnapshotBodyV1 = {
  marker:
    typeof PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_BODY_MARKER;
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
  requester_key_bindings:
    RequesterAcceptanceKeyBindingV1[];
};

export type RequesterTrustRegistrySnapshotAuthenticationBodyV1 = {
  marker:
    typeof PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_AUTHENTICATION_MARKER;
  version: 1;
  signature_scheme:
    typeof REQUESTER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_SCHEME;
  signature_domain:
    typeof REQUESTER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_DOMAIN;
  canonicalization:
    typeof REQUESTER_TRUST_REGISTRY_SNAPSHOT_CANONICALIZATION;
  snapshot_id: string;
  trust_root_id: string;
  key_id: string;
  signed_at_utc: string;
};

export type RequesterTrustRegistrySnapshotAuthenticationEnvelopeV1 =
  RequesterTrustRegistrySnapshotAuthenticationBodyV1 & {
    signature_base64: string;
    authentication_id: string;
  };

export type PublicAgentServiceRequesterTrustRegistrySnapshotV1 = {
  marker:
    typeof PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_VERSION;
  evidence_mode:
    | "example_fixture"
    | "operator_signed_snapshot";
  trust_root: RequesterTrustRootV1;
  snapshot_body:
    RequesterTrustRegistrySnapshotBodyV1;
  authentication_envelope:
    RequesterTrustRegistrySnapshotAuthenticationEnvelopeV1;
};

export type PublicAgentServiceRequesterTrustRegistrySnapshotPacketV1 = {
  marker:
    typeof PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_PACKET_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_VERSION;
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
    requester_count: number;
  };
  trust_root: RequesterTrustRootV1;
  snapshot_body:
    RequesterTrustRegistrySnapshotBodyV1;
  authentication_envelope:
    RequesterTrustRegistrySnapshotAuthenticationEnvelopeV1;
  verification: {
    expected_trust_root_id_verified: true;
    trust_root_key_id_verified: true;
    trust_root_id_verified: true;
    snapshot_id_verified: true;
    authentication_id_verified: true;
    signature_verified: true;
    canonical_requester_order_verified: true;
    unique_requester_ids_verified: true;
    unique_binding_ids_verified: true;
    unique_requester_key_ids_verified: true;
    binding_ids_verified: true;
    requester_key_ids_verified: true;
    authority_scopes_verified: true;
    time_windows_verified: true;
    revocation_windows_verified: true;
    snapshot_provenance_verified: true;
  };
  requester_authentication_gate: {
    eligible_for_requester_authentication: boolean;
    reason:
      | "example_fixture_not_live_trust"
      | "operator_signed_snapshot_verified";
    expected_trust_root_id_required: true;
    separate_requester_authentication_required: true;
    snapshot_replay_protection_required: true;
    monotonic_sequence_enforcement_required: true;
    prior_snapshot_continuity_required: true;
  };
  authority: {
    trust_root_creation: false;
    trust_root_rotation: false;
    trust_root_revocation: false;
    requester_key_binding_creation: false;
    requester_key_registry_write: false;
    requester_approval: false;
    requester_key_rotation: false;
    requester_key_revocation: false;
    requester_authentication: false;
    requester_authentication_replay_write: false;
    provider_authentication_replay_write: false;
    acceptance_replay_write: false;
    authentication_id_consumption: false;
    acceptance_id_consumption: false;
    acceptance_creation: false;
    quote_acceptance: false;
    provider_selection: false;
    quote_publication: false;
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
    credential_issue: false;
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
  if (!condition) {
    fail(message);
  }
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object"
    && value !== null
    && !Array.isArray(value)
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
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} keys mismatch`,
  );
}

function requireString(
  value: unknown,
  label: string,
  pattern: RegExp,
  minLength = 1,
  maxLength = 4096,
): string {
  assertCondition(
    typeof value === "string",
    `${label} must be a string`,
  );
  assertCondition(
    value.length >= minLength
      && value.length <= maxLength,
    `${label} length is invalid`,
  );
  assertCondition(
    pattern.test(value),
    `${label} format is invalid`,
  );
  return value;
}

function requireIsoUtc(
  value: unknown,
  label: string,
): string {
  const exact = requireString(
    value,
    label,
    ISO_UTC_PATTERN,
    20,
    20,
  );
  assertCondition(
    Number.isFinite(Date.parse(exact)),
    `${label} is not a valid UTC timestamp`,
  );
  return exact;
}

function requirePositiveInteger(
  value: unknown,
  label: string,
): number {
  assertCondition(
    Number.isSafeInteger(value)
      && Number(value) >= 1,
    `${label} must be a positive safe integer`,
  );
  return Number(value);
}

function sha256Hex(
  value: string | Uint8Array,
): string {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

function canonicalPublicKeyPem(
  value: unknown,
  label: string,
): string {
  assertCondition(
    typeof value === "string",
    `${label} must be a string`,
  );
  let key: crypto.KeyObject;
  try {
    key = crypto.createPublicKey({
      key: value,
      type: "spki",
      format: "pem",
    });
  } catch {
    return fail(`${label} could not be parsed`);
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

export function requesterTrustRootIdV1(
  draft: RequesterTrustRootDraftV1,
): string {
  return `voidartr1_${sha256Hex(canonicalJson(draft))}`;
}

export function requesterTrustRegistrySnapshotIdV1(
  body: RequesterTrustRegistrySnapshotBodyV1,
): string {
  return `voidarts1_${sha256Hex(canonicalJson(body))}`;
}

function exactAuthenticationBody(
  value:
    RequesterTrustRegistrySnapshotAuthenticationBodyV1,
): RequesterTrustRegistrySnapshotAuthenticationBodyV1 {
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

export function requesterTrustRegistrySnapshotSigningBytesV1(
  snapshotBody: RequesterTrustRegistrySnapshotBodyV1,
  authenticationBody:
    RequesterTrustRegistrySnapshotAuthenticationBodyV1,
): Buffer {
  return Buffer.from(
    `${REQUESTER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_DOMAIN}\n`
      + canonicalJson({
        snapshot_body: snapshotBody,
        authentication_body:
          exactAuthenticationBody(authenticationBody),
      }),
    "utf8",
  );
}

export function requesterTrustRegistrySnapshotAuthenticationIdV1(
  envelopeWithoutId:
    RequesterTrustRegistrySnapshotAuthenticationBodyV1 & {
      signature_base64: string;
    },
): string {
  return `voidartsa1_${sha256Hex(
    canonicalJson(envelopeWithoutId),
  )}`;
}

function validateTrustRoot(
  value: unknown,
): RequesterTrustRootV1 {
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
    root.marker
      === PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_ROOT_MARKER,
    "requester trust-root marker mismatch",
  );
  assertCondition(
    root.version === 1,
    "requester trust-root version mismatch",
  );
  assertCondition(
    root.trust_status === "example_fixture"
      || root.trust_status === "operator_pinned_trust_root",
    "requester trust-root status is invalid",
  );
  assertCondition(
    root.authority_scope
      === "requester_trust_registry_snapshot_verify",
    "requester trust-root authority scope mismatch",
  );
  const publicKeyPem = canonicalPublicKeyPem(
    root.public_key_pem,
    "trust_root.public_key_pem",
  );
  const keyId = requireString(
    root.key_id,
    "trust_root.key_id",
    KEY_ID_PATTERN,
    72,
    72,
  );
  assertCondition(
    keyId
      === requesterAcceptanceAuthenticationKeyIdV1(
        publicKeyPem,
      ),
    "requester trust-root key_id does not match public key",
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
    Date.parse(validFrom) < Date.parse(expiresAt),
    "requester trust-root window is empty",
  );
  let revokedAt: string | null = null;
  if (root.revoked_at_utc !== null) {
    revokedAt = requireIsoUtc(
      root.revoked_at_utc,
      "trust_root.revoked_at_utc",
    );
    assertCondition(
      Date.parse(revokedAt) > Date.parse(validFrom)
        && Date.parse(revokedAt) <= Date.parse(expiresAt),
      "requester trust-root revocation time is outside root window",
    );
  }
  const draft: RequesterTrustRootDraftV1 = {
    marker:
      PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_ROOT_MARKER,
    version: 1,
    trust_status: root.trust_status,
    authority_scope:
      "requester_trust_registry_snapshot_verify",
    key_id: keyId,
    public_key_pem: publicKeyPem,
    valid_from_utc: validFrom,
    expires_at_utc: expiresAt,
    revoked_at_utc: revokedAt,
    root_nonce: requireString(
      root.root_nonce,
      "trust_root.root_nonce",
      NONCE_PATTERN,
      8,
      128,
    ),
  };
  const rootId = requireString(
    root.root_id,
    "trust_root.root_id",
    ROOT_ID_PATTERN,
    74,
    74,
  );
  assertCondition(
    rootId === requesterTrustRootIdV1(draft),
    "requester trust-root ID mismatch",
  );
  return {
    ...draft,
    root_id: rootId,
  };
}

function validateRequesterBinding(
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
    "requester key-binding marker mismatch",
  );
  assertCondition(
    root.version === 1,
    "requester key-binding version mismatch",
  );
  assertCondition(
    root.binding_status === "example_fixture"
      || root.binding_status === "operator_approved_snapshot",
    "requester key-binding status is invalid",
  );
  assertCondition(
    root.authority_scope
      === PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SCOPE,
    "requester key-binding authority scope mismatch",
  );
  const requesterAgentId = requireString(
    root.requester_agent_id,
    "requester_key_binding.requester_agent_id",
    SAFE_ID_PATTERN,
    3,
    128,
  );
  const publicKeyPem = canonicalPublicKeyPem(
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
    "requester key-binding key_id does not match public key",
  );
  const validFrom = requireIsoUtc(
    root.valid_from_utc,
    "requester_key_binding.valid_from_utc",
  );
  const expiresAt = requireIsoUtc(
    root.expires_at_utc,
    "requester_key_binding.expires_at_utc",
  );
  assertCondition(
    Date.parse(validFrom) < Date.parse(expiresAt),
    "requester key-binding window is empty",
  );
  let revokedAt: string | null = null;
  if (root.revoked_at_utc !== null) {
    revokedAt = requireIsoUtc(
      root.revoked_at_utc,
      "requester_key_binding.revoked_at_utc",
    );
    assertCondition(
      Date.parse(revokedAt) > Date.parse(validFrom)
        && Date.parse(revokedAt) <= Date.parse(expiresAt),
      "requester key-binding revocation time is outside binding window",
    );
  }
  const draft: RequesterAcceptanceKeyBindingDraftV1 = {
    marker:
      PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_KEY_BINDING_MARKER,
    version: 1,
    binding_status: root.binding_status,
    requester_agent_id: requesterAgentId,
    authority_scope:
      PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SCOPE,
    key_id: keyId,
    public_key_pem: publicKeyPem,
    valid_from_utc: validFrom,
    expires_at_utc: expiresAt,
    revoked_at_utc: revokedAt,
    binding_nonce: requireString(
      root.binding_nonce,
      "requester_key_binding.binding_nonce",
      NONCE_PATTERN,
      8,
      128,
    ),
  };
  const bindingId = requireString(
    root.binding_id,
    "requester_key_binding.binding_id",
    BINDING_ID_PATTERN,
    74,
    74,
  );
  assertCondition(
    bindingId
      === requesterAcceptanceKeyBindingIdV1(draft),
    "requester key-binding ID mismatch",
  );
  return {
    ...draft,
    binding_id: bindingId,
  };
}

function validateSnapshotBody(
  value: unknown,
): RequesterTrustRegistrySnapshotBodyV1 {
  const root = requireRecord(
    value,
    "snapshot_body",
  );
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
      "requester_key_bindings",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_BODY_MARKER,
    "requester trust snapshot body marker mismatch",
  );
  assertCondition(
    root.version === 1,
    "requester trust snapshot body version mismatch",
  );
  assertCondition(
    root.snapshot_status === "example_fixture"
      || root.snapshot_status === "operator_approved_snapshot",
    "requester trust snapshot status is invalid",
  );
  const registryId = requireString(
    root.registry_id,
    "snapshot_body.registry_id",
    LOWER_SAFE_ID_PATTERN,
    3,
    128,
  );
  const sequence = requirePositiveInteger(
    root.sequence,
    "snapshot_body.sequence",
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
  if (sequence === 1) {
    assertCondition(
      previousSnapshotId === null,
      "sequence 1 requester snapshot must not name a previous snapshot",
    );
  } else {
    assertCondition(
      previousSnapshotId !== null,
      "requester snapshot sequence above 1 requires previous_snapshot_id",
    );
  }
  const generatedAt = requireIsoUtc(
    root.generated_at_utc,
    "snapshot_body.generated_at_utc",
  );
  const expiresAt = requireIsoUtc(
    root.expires_at_utc,
    "snapshot_body.expires_at_utc",
  );
  assertCondition(
    Date.parse(generatedAt) < Date.parse(expiresAt),
    "requester trust snapshot window is empty",
  );
  assertCondition(
    Array.isArray(root.requester_key_bindings),
    "snapshot_body.requester_key_bindings must be an array",
  );
  assertCondition(
    root.requester_key_bindings.length >= 1
      && root.requester_key_bindings.length <= 4096,
    "requester trust snapshot binding count is invalid",
  );
  const bindings =
    root.requester_key_bindings.map(
      (binding) => validateRequesterBinding(binding),
    );
  const canonicalOrder = bindings.map(
    (binding) =>
      `${binding.requester_agent_id}\u0000${binding.binding_id}`,
  );
  assertCondition(
    JSON.stringify(canonicalOrder)
      === JSON.stringify([...canonicalOrder].sort()),
    "requester key bindings are not in canonical order",
  );
  assertCondition(
    new Set(
      bindings.map((binding) => binding.requester_agent_id),
    ).size === bindings.length,
    "requester trust snapshot contains duplicate requester IDs",
  );
  assertCondition(
    new Set(
      bindings.map((binding) => binding.binding_id),
    ).size === bindings.length,
    "requester trust snapshot contains duplicate binding IDs",
  );
  assertCondition(
    new Set(
      bindings.map((binding) => binding.key_id),
    ).size === bindings.length,
    "requester trust snapshot contains duplicate requester key IDs",
  );
  for (const binding of bindings) {
    assertCondition(
      Date.parse(binding.valid_from_utc)
        <= Date.parse(generatedAt),
      "requester binding starts after snapshot generation",
    );
    assertCondition(
      Date.parse(binding.expires_at_utc)
        >= Date.parse(expiresAt),
      "requester binding expires before snapshot",
    );
    if (binding.revoked_at_utc !== null) {
      assertCondition(
        Date.parse(binding.revoked_at_utc)
          >= Date.parse(expiresAt),
        "requester binding revokes before snapshot expiry",
      );
    }
  }
  return {
    marker:
      PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_BODY_MARKER,
    version: 1,
    snapshot_status: root.snapshot_status,
    registry_id: registryId,
    sequence,
    previous_snapshot_id: previousSnapshotId,
    generated_at_utc: generatedAt,
    expires_at_utc: expiresAt,
    snapshot_nonce: requireString(
      root.snapshot_nonce,
      "snapshot_body.snapshot_nonce",
      NONCE_PATTERN,
      8,
      128,
    ),
    requester_key_bindings: bindings,
  };
}

function validateAuthenticationEnvelope(
  value: unknown,
): RequesterTrustRegistrySnapshotAuthenticationEnvelopeV1 {
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
      === PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_AUTHENTICATION_MARKER,
    "requester trust snapshot authentication marker mismatch",
  );
  assertCondition(
    root.version === 1,
    "requester trust snapshot authentication version mismatch",
  );
  assertCondition(
    root.signature_scheme
      === REQUESTER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_SCHEME,
    "requester trust snapshot signature scheme mismatch",
  );
  assertCondition(
    root.signature_domain
      === REQUESTER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_DOMAIN,
    "requester trust snapshot signature domain mismatch",
  );
  assertCondition(
    root.canonicalization
      === REQUESTER_TRUST_REGISTRY_SNAPSHOT_CANONICALIZATION,
    "requester trust snapshot canonicalization mismatch",
  );
  const body:
    RequesterTrustRegistrySnapshotAuthenticationBodyV1 = {
      marker:
        PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_AUTHENTICATION_MARKER,
      version: 1,
      signature_scheme:
        REQUESTER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_SCHEME,
      signature_domain:
        REQUESTER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_DOMAIN,
      canonicalization:
        REQUESTER_TRUST_REGISTRY_SNAPSHOT_CANONICALIZATION,
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
  const authenticationId = requireString(
    root.authentication_id,
    "authentication_envelope.authentication_id",
    AUTHENTICATION_ID_PATTERN,
    75,
    75,
  );
  assertCondition(
    authenticationId
      === requesterTrustRegistrySnapshotAuthenticationIdV1({
        ...body,
        signature_base64: signatureBase64,
      }),
    "requester snapshot authentication ID mismatch",
  );
  return {
    ...body,
    signature_base64: signatureBase64,
    authentication_id: authenticationId,
  };
}

export function validatePublicAgentServiceRequesterTrustRegistrySnapshotV1(
  value: unknown,
): PublicAgentServiceRequesterTrustRegistrySnapshotV1 {
  const root = requireRecord(
    value,
    "requester trust snapshot input",
  );
  requireExactKeys(
    root,
    "requester trust snapshot input",
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
      === PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_MARKER,
    "requester trust snapshot marker mismatch",
  );
  assertCondition(
    root.version === 1,
    "requester trust snapshot version mismatch",
  );
  assertCondition(
    root.evidence_mode === "example_fixture"
      || root.evidence_mode === "operator_signed_snapshot",
    "requester trust snapshot evidence mode is invalid",
  );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_VERSION,
    evidence_mode: root.evidence_mode,
    trust_root: validateTrustRoot(root.trust_root),
    snapshot_body:
      validateSnapshotBody(root.snapshot_body),
    authentication_envelope:
      validateAuthenticationEnvelope(
        root.authentication_envelope,
      ),
  };
}

function verifySnapshotBindings(
  input: PublicAgentServiceRequesterTrustRegistrySnapshotV1,
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
    "requester snapshot trust root does not match pinned expected trust-root ID",
  );
  const snapshotId =
    requesterTrustRegistrySnapshotIdV1(snapshot);
  assertCondition(
    authentication.snapshot_id === snapshotId,
    "requester snapshot authentication snapshot_id mismatch",
  );
  assertCondition(
    authentication.trust_root_id === trustRoot.root_id,
    "requester snapshot authentication trust_root_id mismatch",
  );
  assertCondition(
    authentication.key_id === trustRoot.key_id,
    "requester snapshot authentication key_id mismatch",
  );
  const rootStart = Date.parse(
    trustRoot.valid_from_utc,
  );
  const rootEnd = Date.parse(
    trustRoot.expires_at_utc,
  );
  const generated = Date.parse(
    snapshot.generated_at_utc,
  );
  const snapshotEnd = Date.parse(
    snapshot.expires_at_utc,
  );
  const signedAt = Date.parse(
    authentication.signed_at_utc,
  );
  assertCondition(
    generated >= rootStart && generated < rootEnd,
    "requester snapshot generation is outside trust-root window",
  );
  assertCondition(
    snapshotEnd <= rootEnd,
    "requester snapshot outlives trust root",
  );
  assertCondition(
    signedAt >= generated && signedAt < snapshotEnd,
    "requester snapshot signature time is outside snapshot window",
  );
  assertCondition(
    signedAt >= rootStart && signedAt < rootEnd,
    "requester snapshot signature time is outside trust-root window",
  );
  if (trustRoot.revoked_at_utc !== null) {
    assertCondition(
      signedAt < Date.parse(trustRoot.revoked_at_utc),
      "requester trust root was revoked before snapshot signing",
    );
  }
  if (input.evidence_mode === "example_fixture") {
    assertCondition(
      trustRoot.trust_status === "example_fixture",
      "example requester snapshot requires example trust root",
    );
    assertCondition(
      snapshot.snapshot_status === "example_fixture",
      "example requester snapshot requires example snapshot status",
    );
    assertCondition(
      snapshot.requester_key_bindings.every(
        (binding) =>
          binding.binding_status === "example_fixture",
      ),
      "example requester snapshot requires example bindings",
    );
  } else {
    assertCondition(
      trustRoot.trust_status
        === "operator_pinned_trust_root",
      "operator requester snapshot requires pinned operator trust root",
    );
    assertCondition(
      snapshot.snapshot_status
        === "operator_approved_snapshot",
      "operator requester snapshot requires approved snapshot status",
    );
    assertCondition(
      snapshot.requester_key_bindings.every(
        (binding) =>
          binding.binding_status
            === "operator_approved_snapshot",
      ),
      "operator requester snapshot requires approved requester bindings",
    );
  }
  const publicKey = crypto.createPublicKey({
    key: trustRoot.public_key_pem,
    type: "spki",
    format: "pem",
  });
  const signatureVerified = crypto.verify(
    null,
    requesterTrustRegistrySnapshotSigningBytesV1(
      snapshot,
      authentication,
    ),
    publicKey,
    Buffer.from(
      authentication.signature_base64,
      "base64",
    ),
  );
  assertCondition(
    signatureVerified,
    "requester trust registry snapshot signature is invalid",
  );
}

export function materializePublicAgentServiceRequesterTrustRegistrySnapshotV1(
  inputValue: unknown,
  expectedTrustRootId: string,
): PublicAgentServiceRequesterTrustRegistrySnapshotPacketV1 {
  const input =
    validatePublicAgentServiceRequesterTrustRegistrySnapshotV1(
      inputValue,
    );
  verifySnapshotBindings(input, expectedTrustRootId);
  const example =
    input.evidence_mode === "example_fixture";
  const snapshotId =
    requesterTrustRegistrySnapshotIdV1(
      input.snapshot_body,
    );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_PACKET_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_VERSION,
    status: example
      ? "example_only"
      : "operator_signed_snapshot_verified",
    snapshot_id: snapshotId,
    authentication_id:
      input.authentication_envelope.authentication_id,
    source: {
      registry_id:
        input.snapshot_body.registry_id,
      sequence:
        input.snapshot_body.sequence,
      previous_snapshot_id:
        input.snapshot_body.previous_snapshot_id,
      trust_root_id:
        input.trust_root.root_id,
      trust_root_key_id:
        input.trust_root.key_id,
      generated_at_utc:
        input.snapshot_body.generated_at_utc,
      expires_at_utc:
        input.snapshot_body.expires_at_utc,
      requester_count:
        input.snapshot_body.requester_key_bindings.length,
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
      canonical_requester_order_verified: true,
      unique_requester_ids_verified: true,
      unique_binding_ids_verified: true,
      unique_requester_key_ids_verified: true,
      binding_ids_verified: true,
      requester_key_ids_verified: true,
      authority_scopes_verified: true,
      time_windows_verified: true,
      revocation_windows_verified: true,
      snapshot_provenance_verified: true,
    },
    requester_authentication_gate: {
      eligible_for_requester_authentication:
        !example,
      reason: example
        ? "example_fixture_not_live_trust"
        : "operator_signed_snapshot_verified",
      expected_trust_root_id_required: true,
      separate_requester_authentication_required:
        true,
      snapshot_replay_protection_required: true,
      monotonic_sequence_enforcement_required:
        true,
      prior_snapshot_continuity_required: true,
    },
    authority: {
      trust_root_creation: false,
      trust_root_rotation: false,
      trust_root_revocation: false,
      requester_key_binding_creation: false,
      requester_key_registry_write: false,
      requester_approval: false,
      requester_key_rotation: false,
      requester_key_revocation: false,
      requester_authentication: false,
      requester_authentication_replay_write:
        false,
      provider_authentication_replay_write:
        false,
      acceptance_replay_write: false,
      authentication_id_consumption: false,
      acceptance_id_consumption: false,
      acceptance_creation: false,
      quote_acceptance: false,
      provider_selection: false,
      quote_publication: false,
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
      credential_issue: false,
      credential_change: false,
      runtime_mutation: false,
      service_restart: false,
      deployment: false,
      money_movement: false,
    },
  };
}

export function verifyPublicAgentServiceRequesterTrustRegistrySnapshotV1(
  inputValue: unknown,
  expectedTrustRootId: string,
  packetValue: unknown,
): PublicAgentServiceRequesterTrustRegistrySnapshotPacketV1 {
  const expected =
    materializePublicAgentServiceRequesterTrustRegistrySnapshotV1(
      inputValue,
      expectedTrustRootId,
    );
  assertCondition(
    isRecord(packetValue),
    "requester trust snapshot packet must be an object",
  );
  assertCondition(
    canonicalJson(packetValue)
      === canonicalJson(expected),
    "requester trust snapshot packet does not match source evidence",
  );
  return expected;
}

export function resolveRequesterKeyBindingFromTrustRegistrySnapshotV1(
  inputValue: unknown,
  expectedTrustRootId: string,
  requesterAgentId: string,
  atUtc: string,
): RequesterAcceptanceKeyBindingV1 {
  const packet =
    materializePublicAgentServiceRequesterTrustRegistrySnapshotV1(
      inputValue,
      expectedTrustRootId,
    );
  assertCondition(
    packet.requester_authentication_gate
      .eligible_for_requester_authentication,
    "requester trust snapshot is not eligible for live authentication",
  );
  const exactRequesterAgentId = requireString(
    requesterAgentId,
    "requester_agent_id",
    SAFE_ID_PATTERN,
    3,
    128,
  );
  const exactAt = requireIsoUtc(
    atUtc,
    "at_utc",
  );
  const at = Date.parse(exactAt);
  assertCondition(
    at >= Date.parse(
      packet.snapshot_body.generated_at_utc,
    )
      && at < Date.parse(
        packet.snapshot_body.expires_at_utc,
      ),
    "requester resolution time is outside snapshot window",
  );
  const matches =
    packet.snapshot_body.requester_key_bindings.filter(
      (binding) =>
        binding.requester_agent_id
          === exactRequesterAgentId,
    );
  assertCondition(
    matches.length === 1,
    "requester must resolve to exactly one binding",
  );
  const binding = matches[0]!;
  assertCondition(
    at >= Date.parse(binding.valid_from_utc)
      && at < Date.parse(binding.expires_at_utc),
    "requester binding is inactive at resolution time",
  );
  if (binding.revoked_at_utc !== null) {
    assertCondition(
      at < Date.parse(binding.revoked_at_utc),
      "requester binding is revoked at resolution time",
    );
  }
  return binding;
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
      "  tsx scripts/public_agent_service_requester_trust_registry_snapshot_v1.ts materialize <input.json> <expected-trust-root-id> <packet.json>",
      "  tsx scripts/public_agent_service_requester_trust_registry_snapshot_v1.ts verify <input.json> <expected-trust-root-id> <packet.json>",
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
  assertCondition(
    extra.length === 0,
    "unexpected arguments",
  );
  assertCondition(
    Boolean(
      inputPath
        && expectedTrustRootId
        && packetPath,
    ),
    "input, expected trust-root ID, and packet paths are required",
  );
  const input = readJson(inputPath!);
  if (mode === "materialize") {
    const packet =
      materializePublicAgentServiceRequesterTrustRegistrySnapshotV1(
        input,
        expectedTrustRootId!,
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
      `snapshot_id=${packet.snapshot_id}`,
    );
    console.log(
      `authentication_id=${packet.authentication_id}`,
    );
    console.log(`status=${packet.status}`);
    console.log(
      `registry_id=${packet.source.registry_id}`,
    );
    console.log(
      `sequence=${packet.source.sequence}`,
    );
    console.log(
      `requester_count=${packet.source.requester_count}`,
    );
    console.log(
      `eligible_for_requester_authentication=${packet.requester_authentication_gate.eligible_for_requester_authentication}`,
    );
    console.log("requester_authentication=false");
    console.log("authentication_id_consumption=false");
    console.log("acceptance_id_consumption=false");
    console.log("quote_acceptance=false");
    console.log("payment_authorization=false");
    console.log("payment_execution=false");
    console.log("work_dispatch=false");
    console.log("work_credit_write=false");
    console.log("runtime_mutation=false");
    console.log("money_movement=false");
    console.log(
      `output=${path.resolve(packetPath!)}`,
    );
    return;
  }
  if (mode === "verify") {
    const packet = readJson(packetPath!);
    const result =
      verifyPublicAgentServiceRequesterTrustRegistrySnapshotV1(
        input,
        expectedTrustRootId!,
        packet,
      );
    console.log(`marker=${result.marker}`);
    console.log(
      `snapshot_id=${result.snapshot_id}`,
    );
    console.log(`status=${result.status}`);
    console.log(
      "snapshot_provenance_verified=true",
    );
    console.log(
      `eligible_for_requester_authentication=${result.requester_authentication_gate.eligible_for_requester_authentication}`,
    );
    console.log("requester_authentication=false");
    console.log("authentication_id_consumption=false");
    console.log("acceptance_id_consumption=false");
    console.log("quote_acceptance=false");
    console.log("payment_authorization=false");
    console.log("payment_execution=false");
    console.log("work_dispatch=false");
    console.log("work_credit_write=false");
    console.log("runtime_mutation=false");
    console.log("money_movement=false");
    console.log(
      "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_V1_VALID",
    );
    return;
  }
  usage();
}

const invokedUrl = process.argv[1]
  ? pathToFileURL(
      path.resolve(process.argv[1]),
    ).href
  : "";

if (invokedUrl === import.meta.url) {
  try {
    main();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);
    console.error(`HOLD: ${message}`);
    process.exitCode = 1;
  }
}
