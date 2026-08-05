import {
  createPublicKey,
  sign as cryptoSign,
  verify as cryptoVerify,
} from "node:crypto";

import {
  canonicalJson,
  computeAllianceIdentityKeyIdV1,
  sha256Hex,
  validateAllianceMembershipManifestV1,
  verifyAllianceMembershipTransitionV1,
  VOID_AGENT_ALLIANCE_ID,
} from "./index.mjs";

export const VOID_AGENT_ALLIANCE_SOVEREIGN_ADMISSION_MARKER =
  "VOID_AGENT_ALLIANCE_SOVEREIGN_ADMISSION_AUTHORIZATION_V1";
export const VOID_AGENT_ALLIANCE_SOVEREIGN_ADMISSION_PROTOCOL =
  "void-agent-alliance-sovereign-admission/1";

const AUTHORIZATION_KEYS = [
  "active_manifest_id",
  "alliance_id",
  "authority",
  "authorization_id",
  "candidate_manifest_id",
  "decision",
  "effective_at",
  "expires_at",
  "issued_at",
  "marker",
  "membership_id",
  "protocol",
  "reason",
  "signature",
];
const AUTHORITY_KEYS = ["key_id", "name", "role"];
const SIGNATURE_KEYS = [
  "algorithm",
  "key_id",
  "signature_b64",
  "signed_payload_sha256",
];

const KEY_ID = /^ed25519:sha256:[a-f0-9]{64}$/;
const MEMBERSHIP_ID = /^voidaam1_[a-f0-9]{64}$/;
const MANIFEST_ID = /^voidaamm1_[a-f0-9]{64}$/;
const AUTHORIZATION_ID = /^voidaasa1_[a-f0-9]{64}$/;
const REASON = /^[a-z0-9][a-z0-9._-]{2,127}$/;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function fail(message) {
  throw new Error(message);
}

function requireRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label}_must_be_object`);
  }
  return value;
}

function assertExactKeys(value, expected, label) {
  const actual = Object.keys(requireRecord(value, label)).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(`${label}_keys_mismatch`);
  }
}

function parseUtc(value, label) {
  if (typeof value !== "string" || !ISO_UTC.test(value)) {
    fail(`${label}_must_be_iso_utc_milliseconds`);
  }
  const time = Date.parse(value);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value) {
    fail(`${label}_invalid`);
  }
  return time;
}

function unsignedAuthorizationBody(authorization) {
  const body = structuredClone(authorization);
  delete body.authorization_id;
  delete body.signature;
  return body;
}

function validateSignatureShape(signature) {
  assertExactKeys(signature, SIGNATURE_KEYS, "signature");
  if (signature.algorithm !== "ed25519") fail("signature_algorithm_mismatch");
  if (typeof signature.key_id !== "string" || !KEY_ID.test(signature.key_id)) {
    fail("signature_key_id_invalid");
  }
  if (!/^[a-f0-9]{64}$/.test(signature.signed_payload_sha256)) {
    fail("signature_payload_digest_invalid");
  }
  if (typeof signature.signature_b64 !== "string") fail("signature_b64_invalid");
  const bytes = Buffer.from(signature.signature_b64, "base64");
  if (bytes.length !== 64 || bytes.toString("base64") !== signature.signature_b64) {
    fail("signature_b64_must_be_canonical_ed25519_length");
  }
}

export function computeAllianceSovereignAdmissionAuthorizationIdV1(value) {
  return `voidaasa1_${sha256Hex(canonicalJson(unsignedAuthorizationBody(value)))}`;
}

export function validateAllianceSovereignAdmissionAuthorizationV1(
  value,
  options = { verifyAuthorizationId: true },
) {
  const authorization = requireRecord(value, "authorization");
  assertExactKeys(authorization, AUTHORIZATION_KEYS, "authorization");

  if (authorization.marker !== VOID_AGENT_ALLIANCE_SOVEREIGN_ADMISSION_MARKER) {
    fail("marker_mismatch");
  }
  if (authorization.protocol !== VOID_AGENT_ALLIANCE_SOVEREIGN_ADMISSION_PROTOCOL) {
    fail("protocol_mismatch");
  }
  if (authorization.alliance_id !== VOID_AGENT_ALLIANCE_ID) {
    fail("alliance_id_mismatch");
  }
  if (!AUTHORIZATION_ID.test(authorization.authorization_id)) {
    fail("authorization_id_invalid");
  }
  if (!MEMBERSHIP_ID.test(authorization.membership_id)) {
    fail("membership_id_invalid");
  }
  if (!MANIFEST_ID.test(authorization.candidate_manifest_id)) {
    fail("candidate_manifest_id_invalid");
  }
  if (!MANIFEST_ID.test(authorization.active_manifest_id)) {
    fail("active_manifest_id_invalid");
  }
  if (authorization.decision !== "admit") fail("decision_must_be_admit");
  if (typeof authorization.reason !== "string" || !REASON.test(authorization.reason)) {
    fail("reason_invalid");
  }

  assertExactKeys(authorization.authority, AUTHORITY_KEYS, "authority");
  if (authorization.authority.name !== "ZoSo") fail("authority_name_mismatch");
  if (authorization.authority.role !== "sovereign_constitutional_authority") {
    fail("authority_role_mismatch");
  }
  if (typeof authorization.authority.key_id !== "string" ||
      !KEY_ID.test(authorization.authority.key_id)) {
    fail("authority_key_id_invalid");
  }

  const issuedAt = parseUtc(authorization.issued_at, "issued_at");
  const effectiveAt = parseUtc(authorization.effective_at, "effective_at");
  const expiresAt = parseUtc(authorization.expires_at, "expires_at");
  if (effectiveAt < issuedAt) fail("effective_at_precedes_issued_at");
  if (expiresAt <= effectiveAt) fail("expires_at_must_follow_effective_at");

  if (authorization.signature === null && options.allowUnsigned === true) {
    // Closed unsigned body immediately before sovereign signing.
  } else {
    validateSignatureShape(requireRecord(authorization.signature, "signature"));
    if (authorization.signature.key_id !== authorization.authority.key_id) {
      fail("signature_key_id_must_match_authority_key_id");
    }
  }

  if (options.verifyAuthorizationId !== false) {
    const expected = computeAllianceSovereignAdmissionAuthorizationIdV1(authorization);
    if (authorization.authorization_id !== expected) {
      fail("authorization_id_derivation_mismatch");
    }
  }
  return authorization;
}

export function buildAllianceSovereignAdmissionAuthorizationV1(input) {
  const authorization = structuredClone(input);
  authorization.marker = VOID_AGENT_ALLIANCE_SOVEREIGN_ADMISSION_MARKER;
  authorization.protocol = VOID_AGENT_ALLIANCE_SOVEREIGN_ADMISSION_PROTOCOL;
  authorization.alliance_id = VOID_AGENT_ALLIANCE_ID;
  authorization.signature ??= null;
  authorization.authorization_id =
    computeAllianceSovereignAdmissionAuthorizationIdV1(authorization);
  validateAllianceSovereignAdmissionAuthorizationV1(authorization, {
    verifyAuthorizationId: true,
    allowUnsigned: true,
  });
  return authorization;
}

export function signAllianceSovereignAdmissionAuthorizationV1(
  authorizationValue,
  sovereignPrivateKey,
) {
  const authorization = structuredClone(authorizationValue);
  const signingKeyId = computeAllianceIdentityKeyIdV1(sovereignPrivateKey);
  if (signingKeyId !== authorization.authority?.key_id) {
    fail("sovereign_signing_key_id_mismatch");
  }
  authorization.signature = null;
  authorization.authorization_id =
    computeAllianceSovereignAdmissionAuthorizationIdV1(authorization);
  validateAllianceSovereignAdmissionAuthorizationV1(authorization, {
    verifyAuthorizationId: true,
    allowUnsigned: true,
  });
  const payload = canonicalJson(authorization);
  const signatureBytes = cryptoSign(
    null,
    Buffer.from(payload, "utf8"),
    sovereignPrivateKey,
  );
  authorization.signature = {
    algorithm: "ed25519",
    key_id: authorization.authority.key_id,
    signature_b64: signatureBytes.toString("base64"),
    signed_payload_sha256: sha256Hex(payload),
  };
  validateAllianceSovereignAdmissionAuthorizationV1(authorization);
  return authorization;
}

export function verifyAllianceSovereignAdmissionAuthorizationSignatureV1(
  authorizationValue,
  sovereignPublicKey,
) {
  const authorization = validateAllianceSovereignAdmissionAuthorizationV1(
    authorizationValue,
  );
  const publicKey = sovereignPublicKey?.type === "private"
    ? createPublicKey(sovereignPublicKey)
    : sovereignPublicKey;
  const verificationKeyId = computeAllianceIdentityKeyIdV1(publicKey);
  if (verificationKeyId !== authorization.authority.key_id) {
    fail("sovereign_verification_key_id_mismatch");
  }
  const unsigned = structuredClone(authorization);
  unsigned.signature = null;
  const payload = canonicalJson(unsigned);
  if (authorization.signature.signed_payload_sha256 !== sha256Hex(payload)) {
    fail("signature_payload_digest_mismatch");
  }
  const valid = cryptoVerify(
    null,
    Buffer.from(payload, "utf8"),
    publicKey,
    Buffer.from(authorization.signature.signature_b64, "base64"),
  );
  if (!valid) fail("signature_verification_failed");
  return true;
}

export function verifyAllianceSovereignAdmissionV1(
  candidateValue,
  activeValue,
  memberPublicKey,
  authorizationValue,
  sovereignPublicKey,
) {
  const candidate = validateAllianceMembershipManifestV1(candidateValue, {
    verifyManifestId: true,
  });
  const active = validateAllianceMembershipManifestV1(activeValue, {
    verifyManifestId: true,
  });
  if (candidate.lifecycle.status !== "candidate") {
    fail("admission_predecessor_must_be_candidate");
  }
  if (active.lifecycle.status !== "active") {
    fail("admission_successor_must_be_active");
  }
  verifyAllianceMembershipTransitionV1(candidate, active, memberPublicKey);

  const candidateAnchor = parseUtc(candidate.lifecycle.issued_at, "candidate_issued_at");
  const activeIssuedAt = parseUtc(active.lifecycle.issued_at, "active_issued_at");
  const activeEffectiveAt = parseUtc(active.lifecycle.effective_at, "active_effective_at");
  const candidateExpiresAt = parseUtc(candidate.lifecycle.expires_at, "candidate_expires_at");
  const activeExpiresAt = parseUtc(active.lifecycle.expires_at, "active_expires_at");
  if (activeIssuedAt < candidateAnchor) {
    fail("active_issued_before_candidate");
  }
  if (activeEffectiveAt <= candidateAnchor) {
    fail("active_effective_time_not_after_candidate");
  }
  if (activeExpiresAt > candidateExpiresAt) {
    fail("active_expiry_extension_rejected");
  }

  const authorization = validateAllianceSovereignAdmissionAuthorizationV1(
    authorizationValue,
  );
  verifyAllianceSovereignAdmissionAuthorizationSignatureV1(
    authorization,
    sovereignPublicKey,
  );
  if (authorization.membership_id !== candidate.membership_id ||
      authorization.membership_id !== active.membership_id) {
    fail("authorization_membership_id_mismatch");
  }
  if (authorization.candidate_manifest_id !== candidate.manifest_id) {
    fail("authorization_candidate_manifest_id_mismatch");
  }
  if (authorization.active_manifest_id !== active.manifest_id) {
    fail("authorization_active_manifest_id_mismatch");
  }
  const authorizationIssuedAt = parseUtc(
    authorization.issued_at,
    "authorization_issued_at",
  );
  const authorizationEffectiveAt = parseUtc(
    authorization.effective_at,
    "authorization_effective_at",
  );
  const authorizationExpiresAt = parseUtc(
    authorization.expires_at,
    "authorization_expires_at",
  );
  if (authorizationIssuedAt > activeIssuedAt) {
    fail("authorization_issued_after_member_acceptance");
  }
  if (authorizationEffectiveAt !== activeEffectiveAt) {
    fail("authorization_effective_at_mismatch");
  }
  if (authorizationExpiresAt > activeExpiresAt) {
    fail("authorization_outlives_active_membership");
  }
  return true;
}
