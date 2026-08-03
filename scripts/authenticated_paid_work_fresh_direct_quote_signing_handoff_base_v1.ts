import crypto from "node:crypto";

import { canonicalJson } from "./authenticated_paid_work_direct_quote_activation_authentication_v1.js";
import type {
  AuthenticatedPaidWorkFreshDirectQuoteSigningHandoffInputV1,
  FreshDirectQuoteAuthenticationPlanV1,
} from "./authenticated_paid_work_fresh_direct_quote_signing_handoff_types_v1.js";

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const NONCE = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/;

type RecordValue = Record<string, unknown>;

export function freshDirectQuoteFailV1(message: string): never {
  throw new Error(message);
}

export function freshDirectQuoteAssertV1(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) freshDirectQuoteFailV1(message);
}

export function isFreshDirectQuoteRecordV1(
  value: unknown,
): value is RecordValue {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function requireFreshDirectQuoteRecordV1(
  value: unknown,
  label: string,
): RecordValue {
  freshDirectQuoteAssertV1(
    isFreshDirectQuoteRecordV1(value),
    `${label} must be an object`,
  );
  return value;
}

export function requireFreshDirectQuoteExactKeysV1(
  value: RecordValue,
  label: string,
  keys: readonly string[],
): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  freshDirectQuoteAssertV1(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} must contain exactly: ${expected.join(", ")}`,
  );
}

export function requireFreshDirectQuoteStringV1(
  value: unknown,
  label: string,
  pattern?: RegExp,
  minimum = 1,
  maximum = 4096,
): string {
  freshDirectQuoteAssertV1(
    typeof value === "string",
    `${label} must be a string`,
  );
  freshDirectQuoteAssertV1(
    value === value.trim(),
    `${label} must be trimmed`,
  );
  freshDirectQuoteAssertV1(
    value.length >= minimum && value.length <= maximum,
    `${label} length must be ${minimum}..${maximum}`,
  );
  if (pattern) {
    freshDirectQuoteAssertV1(pattern.test(value), `${label} has invalid format`);
  }
  return value;
}

export function requireFreshDirectQuoteUtcV1(value: unknown, label: string): string {
  const text = requireFreshDirectQuoteStringV1(value, label, ISO_UTC, 20, 20);
  const milliseconds = Date.parse(text);
  freshDirectQuoteAssertV1(
    Number.isFinite(milliseconds),
    `${label} is invalid UTC`,
  );
  freshDirectQuoteAssertV1(
    new Date(milliseconds).toISOString() === text.replace("Z", ".000Z"),
    `${label} is not canonical UTC`,
  );
  return text;
}

export function parseFreshDirectQuoteUtcV1(value: string): number {
  return Date.parse(value);
}

export function compareFreshDirectQuoteCanonicalV1(
  actual: unknown,
  expected: unknown,
  label: string,
): void {
  freshDirectQuoteAssertV1(
    canonicalJson(actual) === canonicalJson(expected),
    `${label} does not match canonical source`,
  );
}

export function rejectFreshDirectQuoteSecretMaterialV1(
  value: unknown,
  label = "input",
): void {
  if (typeof value === "string") {
    const upper = value.toUpperCase();
    freshDirectQuoteAssertV1(
      !upper.includes("-----BEGIN PRIVATE KEY-----") &&
        !upper.includes("-----BEGIN OPENSSH PRIVATE KEY-----") &&
        !upper.includes("-----BEGIN EC PRIVATE KEY-----"),
      `${label} contains private-key material`,
    );
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) =>
      rejectFreshDirectQuoteSecretMaterialV1(child, `${label}[${index}]`),
    );
    return;
  }
  if (!isFreshDirectQuoteRecordV1(value)) return;
  const forbiddenKeys = new Set([
    "private_key",
    "private_key_pem",
    "seed_phrase",
    "mnemonic",
    "password",
    "token",
    "authorization_header",
  ]);
  for (const [key, child] of Object.entries(value)) {
    freshDirectQuoteAssertV1(
      !forbiddenKeys.has(key.toLowerCase()),
      `${label}.${key} is forbidden`,
    );
    rejectFreshDirectQuoteSecretMaterialV1(child, `${label}.${key}`);
  }
}

export function freshDirectQuotePublicKeyFromPemV1(
  publicKeyPem: string,
): crypto.KeyObject {
  let key: crypto.KeyObject;
  try {
    key = crypto.createPublicKey(publicKeyPem);
  } catch {
    return freshDirectQuoteFailV1("public key PEM is invalid");
  }
  freshDirectQuoteAssertV1(
    key.asymmetricKeyType === "ed25519",
    "public key must be Ed25519",
  );
  const canonical = key.export({ type: "spki", format: "pem" }).toString();
  freshDirectQuoteAssertV1(
    canonical === publicKeyPem,
    "public key PEM is not canonical SPKI",
  );
  return key;
}

export function requireFreshDirectQuotePublicKeyPemV1(value: unknown, label: string): string {
  freshDirectQuoteAssertV1(
    typeof value === "string",
    `${label} must be a string`,
  );
  freshDirectQuoteAssertV1(
    value.length >= 80 && value.length <= 4096,
    `${label} length must be 80..4096`,
  );
  freshDirectQuotePublicKeyFromPemV1(value);
  return value;
}

export function validateFreshDirectQuotePlanV1(
  value: unknown,
  label: string,
): FreshDirectQuoteAuthenticationPlanV1 {
  const root = requireFreshDirectQuoteRecordV1(value, label);
  requireFreshDirectQuoteExactKeysV1(root, label, [
    "authentication_nonce",
    "created_at_utc",
    "expires_at_utc",
  ]);
  const authenticationNonce = requireFreshDirectQuoteStringV1(
    root.authentication_nonce,
    `${label}.authentication_nonce`,
    NONCE,
    16,
    128,
  );
  const createdAtUtc = requireFreshDirectQuoteUtcV1(
    root.created_at_utc,
    `${label}.created_at_utc`,
  );
  const expiresAtUtc = requireFreshDirectQuoteUtcV1(
    root.expires_at_utc,
    `${label}.expires_at_utc`,
  );
  freshDirectQuoteAssertV1(
    parseFreshDirectQuoteUtcV1(expiresAtUtc) > parseFreshDirectQuoteUtcV1(createdAtUtc),
    `${label} window is invalid`,
  );
  return {
    authentication_nonce: authenticationNonce,
    created_at_utc: createdAtUtc,
    expires_at_utc: expiresAtUtc,
  };
}

export function validateFreshDirectQuoteControlsV1(
  value: unknown,
): AuthenticatedPaidWorkFreshDirectQuoteSigningHandoffInputV1["controls"] {
  const root = requireFreshDirectQuoteRecordV1(value, "controls");
  const keys = [
    "prepare_only",
    "external_signing_required",
    "private_key_access_forbidden",
    "provider_signature_before_requester_required",
    "canonical_signature_bytes_required",
    "atomic_persistence_after_authentication_required",
    "separate_payment_execution_authorization_required",
    "separate_work_execution_authorization_required",
  ] as const;
  requireFreshDirectQuoteExactKeysV1(root, "controls", keys);
  for (const key of keys) {
    freshDirectQuoteAssertV1(
      root[key] === true,
      `controls.${key} must be true`,
    );
  }
  return {
    prepare_only: true,
    external_signing_required: true,
    private_key_access_forbidden: true,
    provider_signature_before_requester_required: true,
    canonical_signature_bytes_required: true,
    atomic_persistence_after_authentication_required: true,
    separate_payment_execution_authorization_required: true,
    separate_work_execution_authorization_required: true,
  };
}
