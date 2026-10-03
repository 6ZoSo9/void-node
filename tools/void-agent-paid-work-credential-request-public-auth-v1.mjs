#!/usr/bin/env node
import {
  createHash,
  createPublicKey,
  verify,
} from "node:crypto";

export const VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_AUTH_V1 =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_AUTH_V1";
export const VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_AUTH_HEADER_V1 =
  "x-void-applicant-auth-v1";
export const VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH_V1 =
  "/__void/agents/paid-work/credential-requests/v1";

const SHA256 = /^[0-9a-f]{64}$/u;
const REQUEST_ID = /^voidapwcrq1_[0-9a-f]{64}$/u;
const AGENT_ID = /^void-agent:ed25519:[A-Za-z0-9_-]{43}$/u;
const BASE64URL = /^[A-Za-z0-9_-]+$/u;
const MAX_HEADER_CHARS = 4096;
const MAX_TTL_MS = 60_000;
const MAX_FUTURE_SKEW_MS = 5_000;

function fail(code) {
  throw new Error(code);
}

function plain(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function exactKeys(value, expected, code) {
  if (!plain(value)) fail(code);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    fail(code);
  }
}

export function canonicalVoidJsonV1(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("public_auth_non_finite_number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalVoidJsonV1).join(",") + "]";
  }
  if (plain(value)) {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) + ":" + canonicalVoidJsonV1(value[key]),
        )
        .join(",") +
      "}"
    );
  }
  fail("public_auth_unsupported_canonical_value");
}

function canonicalBase64url(value, minimumBytes, maximumBytes, code) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    !BASE64URL.test(value)
  ) {
    fail(code);
  }
  let bytes;
  try {
    bytes = Buffer.from(value, "base64url");
  } catch {
    fail(code);
  }
  if (
    bytes.length < minimumBytes ||
    bytes.length > maximumBytes ||
    bytes.toString("base64url") !== value
  ) {
    fail(code);
  }
  return bytes;
}

function normalizePublicJwk(value) {
  exactKeys(
    value,
    ["crv", "kty", "x"],
    "public_auth_public_jwk_shape_invalid",
  );
  if (value.kty !== "OKP" || value.crv !== "Ed25519") {
    fail("public_auth_public_jwk_type_invalid");
  }
  canonicalBase64url(
    value.x,
    32,
    32,
    "public_auth_public_jwk_x_invalid",
  );
  return Object.freeze({
    crv: "Ed25519",
    kty: "OKP",
    x: value.x,
  });
}

export function deriveVoidEd25519AgentIdV1(publicJwk) {
  const normalized = normalizePublicJwk(publicJwk);
  const digest = createHash("sha256")
    .update(canonicalVoidJsonV1(normalized), "utf8")
    .digest();
  return "void-agent:ed25519:" + digest.toString("base64url");
}

function parseCanonicalIso(value, code) {
  if (typeof value !== "string" || value.length > 40) fail(code);
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== value) fail(code);
  return ms;
}

function parseHeader(encoded) {
  if (
    typeof encoded !== "string" ||
    encoded.length === 0 ||
    encoded.length > MAX_HEADER_CHARS ||
    !BASE64URL.test(encoded)
  ) {
    fail("public_auth_header_invalid");
  }
  const bytes = canonicalBase64url(
    encoded,
    2,
    3072,
    "public_auth_header_invalid",
  );
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("public_auth_header_json_invalid");
  }
  return value;
}

export function verifyAgentPaidWorkCredentialRequestPublicAuthV1({
  encoded_header,
  method,
  path,
  body_sha256,
  request_id,
  inner_agent_id,
  now_ms = Date.now(),
}) {
  if (!Number.isSafeInteger(now_ms) || now_ms < 0) {
    fail("public_auth_now_invalid");
  }
  if (method !== "POST" || path !== VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH_V1) {
    fail("public_auth_route_invalid");
  }
  if (!SHA256.test(String(body_sha256 || ""))) {
    fail("public_auth_body_sha256_invalid");
  }
  if (!REQUEST_ID.test(String(request_id || ""))) {
    fail("public_auth_request_id_invalid");
  }
  if (!AGENT_ID.test(String(inner_agent_id || ""))) {
    fail("public_auth_inner_agent_id_invalid");
  }

  const envelope = parseHeader(encoded_header);
  exactKeys(
    envelope,
    [
      "agent_id",
      "body_sha256",
      "expires_at",
      "issued_at",
      "marker",
      "method",
      "network_chain_id",
      "nonce",
      "path",
      "public_key_jwk",
      "purpose",
      "request_id",
      "signature",
      "version",
    ],
    "public_auth_envelope_shape_invalid",
  );

  if (
    envelope.marker !==
      VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_AUTH_V1 ||
    envelope.version !== 1 ||
    envelope.network_chain_id !== 2050 ||
    envelope.purpose !== "agent_paid_work_credential_request" ||
    envelope.method !== method ||
    envelope.path !== path ||
    envelope.body_sha256 !== body_sha256 ||
    envelope.request_id !== request_id
  ) {
    fail("public_auth_envelope_binding_invalid");
  }

  const publicJwk = normalizePublicJwk(envelope.public_key_jwk);
  const agentId = deriveVoidEd25519AgentIdV1(publicJwk);
  if (
    !AGENT_ID.test(String(envelope.agent_id || "")) ||
    envelope.agent_id !== agentId ||
    inner_agent_id !== agentId
  ) {
    fail("public_auth_agent_id_mismatch");
  }

  const issuedAtMs = parseCanonicalIso(
    envelope.issued_at,
    "public_auth_issued_at_invalid",
  );
  const expiresAtMs = parseCanonicalIso(
    envelope.expires_at,
    "public_auth_expires_at_invalid",
  );
  const ttlMs = expiresAtMs - issuedAtMs;
  if (ttlMs < 1000 || ttlMs > MAX_TTL_MS) {
    fail("public_auth_ttl_invalid");
  }
  if (issuedAtMs > now_ms + MAX_FUTURE_SKEW_MS) {
    fail("public_auth_not_yet_valid");
  }
  if (now_ms > expiresAtMs) {
    fail("public_auth_expired");
  }

  const nonceBytes = canonicalBase64url(
    envelope.nonce,
    16,
    64,
    "public_auth_nonce_invalid",
  );
  void nonceBytes;
  const signature = canonicalBase64url(
    envelope.signature,
    64,
    64,
    "public_auth_signature_invalid",
  );

  const unsigned = {
    agent_id: envelope.agent_id,
    body_sha256: envelope.body_sha256,
    expires_at: envelope.expires_at,
    issued_at: envelope.issued_at,
    marker: envelope.marker,
    method: envelope.method,
    network_chain_id: envelope.network_chain_id,
    nonce: envelope.nonce,
    path: envelope.path,
    public_key_jwk: publicJwk,
    purpose: envelope.purpose,
    request_id: envelope.request_id,
    version: envelope.version,
  };

  let publicKey;
  try {
    publicKey = createPublicKey({
      key: publicJwk,
      format: "jwk",
    });
  } catch {
    fail("public_auth_public_key_invalid");
  }

  const verified = verify(
    null,
    Buffer.from(canonicalVoidJsonV1(unsigned), "utf8"),
    publicKey,
    signature,
  );
  if (!verified) {
    fail("public_auth_signature_verification_failed");
  }

  return Object.freeze({
    applicant_id: agentId,
    nonce: envelope.nonce,
    nonce_key: agentId + ":" + envelope.nonce,
    issued_at_ms: issuedAtMs,
    expires_at_ms: expiresAtMs,
    request_id,
    body_sha256,
  });
}
