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
  VOID_AGENT_ALLIANCE_ID,
} from "./index.mjs";
import {
  validateAllianceSovereignAdmissionAuthorizationV1,
  verifyAllianceSovereignAdmissionV1,
} from "./sovereign-admission-guard-v1.mjs";

export const VOID_AGENT_ALLIANCE_CONSTITUTIONAL_CHARTER_ADMISSION_MARKER =
  "VOID_AGENT_ALLIANCE_CONSTITUTIONAL_CHARTER_ADMISSION_BINDING_V1";
export const VOID_AGENT_ALLIANCE_CONSTITUTIONAL_CHARTER_ADMISSION_PROTOCOL =
  "void-agent-alliance-constitutional-charter-admission/1";
export const VOID_CONSTITUTIONAL_CHARTER_PROTOCOL =
  "void-constitutional-charter/1";

const BINDING_KEYS = [
  "active_manifest_id",
  "admission_authorization_id",
  "alliance_id",
  "authority",
  "binding_id",
  "candidate_manifest_id",
  "constitutional_charter",
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
const CHARTER_KEYS = ["charter_id", "charter_sha256", "protocol"];
const SIGNATURE_KEYS = [
  "algorithm",
  "key_id",
  "signature_b64",
  "signed_payload_sha256",
];

const KEY_ID = /^ed25519:sha256:[a-f0-9]{64}$/;
const MEMBERSHIP_ID = /^voidaam1_[a-f0-9]{64}$/;
const MANIFEST_ID = /^voidaamm1_[a-f0-9]{64}$/;
const ADMISSION_AUTHORIZATION_ID = /^voidaasa1_[a-f0-9]{64}$/;
const BINDING_ID = /^voidaacb1_[a-f0-9]{64}$/;
const CHARTER_ID = /^voidcharter1_[a-f0-9]{64}$/;
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

function unsignedBindingBody(binding) {
  const body = structuredClone(binding);
  delete body.binding_id;
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

export function validateAllianceConstitutionalCharterBindingV1(value) {
  const charter = requireRecord(value, "constitutional_charter");
  assertExactKeys(charter, CHARTER_KEYS, "constitutional_charter");
  if (charter.protocol !== VOID_CONSTITUTIONAL_CHARTER_PROTOCOL) {
    fail("constitutional_charter_protocol_mismatch");
  }
  if (typeof charter.charter_sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(charter.charter_sha256)) {
    fail("constitutional_charter_sha256_invalid");
  }
  if (typeof charter.charter_id !== "string" || !CHARTER_ID.test(charter.charter_id)) {
    fail("constitutional_charter_id_invalid");
  }
  if (charter.charter_id !== `voidcharter1_${charter.charter_sha256}`) {
    fail("constitutional_charter_id_derivation_mismatch");
  }
  return charter;
}

export function computeAllianceConstitutionalCharterAdmissionBindingIdV1(value) {
  return `voidaacb1_${sha256Hex(canonicalJson(unsignedBindingBody(value)))}`;
}

export function validateAllianceConstitutionalCharterAdmissionBindingV1(
  value,
  options = { verifyBindingId: true },
) {
  const binding = requireRecord(value, "binding");
  assertExactKeys(binding, BINDING_KEYS, "binding");

  if (binding.marker !==
      VOID_AGENT_ALLIANCE_CONSTITUTIONAL_CHARTER_ADMISSION_MARKER) {
    fail("marker_mismatch");
  }
  if (binding.protocol !==
      VOID_AGENT_ALLIANCE_CONSTITUTIONAL_CHARTER_ADMISSION_PROTOCOL) {
    fail("protocol_mismatch");
  }
  if (binding.alliance_id !== VOID_AGENT_ALLIANCE_ID) {
    fail("alliance_id_mismatch");
  }
  if (!BINDING_ID.test(binding.binding_id)) fail("binding_id_invalid");
  if (!ADMISSION_AUTHORIZATION_ID.test(binding.admission_authorization_id)) {
    fail("admission_authorization_id_invalid");
  }
  if (!MEMBERSHIP_ID.test(binding.membership_id)) fail("membership_id_invalid");
  if (!MANIFEST_ID.test(binding.candidate_manifest_id)) {
    fail("candidate_manifest_id_invalid");
  }
  if (!MANIFEST_ID.test(binding.active_manifest_id)) {
    fail("active_manifest_id_invalid");
  }
  validateAllianceConstitutionalCharterBindingV1(binding.constitutional_charter);
  if (typeof binding.reason !== "string" || !REASON.test(binding.reason)) {
    fail("reason_invalid");
  }

  assertExactKeys(binding.authority, AUTHORITY_KEYS, "authority");
  if (binding.authority.name !== "ZoSo") fail("authority_name_mismatch");
  if (binding.authority.role !== "sovereign_constitutional_authority") {
    fail("authority_role_mismatch");
  }
  if (typeof binding.authority.key_id !== "string" ||
      !KEY_ID.test(binding.authority.key_id)) {
    fail("authority_key_id_invalid");
  }

  const issuedAt = parseUtc(binding.issued_at, "issued_at");
  const effectiveAt = parseUtc(binding.effective_at, "effective_at");
  const expiresAt = parseUtc(binding.expires_at, "expires_at");
  if (effectiveAt < issuedAt) fail("effective_at_precedes_issued_at");
  if (expiresAt <= effectiveAt) fail("expires_at_must_follow_effective_at");

  if (binding.signature === null && options.allowUnsigned === true) {
    // Closed unsigned body immediately before sovereign signing.
  } else {
    validateSignatureShape(requireRecord(binding.signature, "signature"));
    if (binding.signature.key_id !== binding.authority.key_id) {
      fail("signature_key_id_must_match_authority_key_id");
    }
  }

  if (options.verifyBindingId !== false) {
    const expected = computeAllianceConstitutionalCharterAdmissionBindingIdV1(
      binding,
    );
    if (binding.binding_id !== expected) {
      fail("binding_id_derivation_mismatch");
    }
  }
  return binding;
}

export function buildAllianceConstitutionalCharterAdmissionBindingV1(input) {
  const binding = structuredClone(input);
  binding.marker = VOID_AGENT_ALLIANCE_CONSTITUTIONAL_CHARTER_ADMISSION_MARKER;
  binding.protocol = VOID_AGENT_ALLIANCE_CONSTITUTIONAL_CHARTER_ADMISSION_PROTOCOL;
  binding.alliance_id = VOID_AGENT_ALLIANCE_ID;
  binding.signature ??= null;
  binding.binding_id =
    computeAllianceConstitutionalCharterAdmissionBindingIdV1(binding);
  validateAllianceConstitutionalCharterAdmissionBindingV1(binding, {
    verifyBindingId: true,
    allowUnsigned: true,
  });
  return binding;
}

export function signAllianceConstitutionalCharterAdmissionBindingV1(
  bindingValue,
  sovereignPrivateKey,
) {
  const binding = structuredClone(bindingValue);
  const signingKeyId = computeAllianceIdentityKeyIdV1(sovereignPrivateKey);
  if (signingKeyId !== binding.authority?.key_id) {
    fail("sovereign_signing_key_id_mismatch");
  }
  binding.signature = null;
  binding.binding_id =
    computeAllianceConstitutionalCharterAdmissionBindingIdV1(binding);
  validateAllianceConstitutionalCharterAdmissionBindingV1(binding, {
    verifyBindingId: true,
    allowUnsigned: true,
  });
  const payload = canonicalJson(binding);
  const signatureBytes = cryptoSign(
    null,
    Buffer.from(payload, "utf8"),
    sovereignPrivateKey,
  );
  binding.signature = {
    algorithm: "ed25519",
    key_id: binding.authority.key_id,
    signature_b64: signatureBytes.toString("base64"),
    signed_payload_sha256: sha256Hex(payload),
  };
  validateAllianceConstitutionalCharterAdmissionBindingV1(binding);
  return binding;
}

export function verifyAllianceConstitutionalCharterAdmissionBindingSignatureV1(
  bindingValue,
  sovereignPublicKey,
) {
  const binding = validateAllianceConstitutionalCharterAdmissionBindingV1(
    bindingValue,
  );
  const publicKey = sovereignPublicKey?.type === "private"
    ? createPublicKey(sovereignPublicKey)
    : sovereignPublicKey;
  const verificationKeyId = computeAllianceIdentityKeyIdV1(publicKey);
  if (verificationKeyId !== binding.authority.key_id) {
    fail("sovereign_verification_key_id_mismatch");
  }
  const unsigned = structuredClone(binding);
  unsigned.signature = null;
  const payload = canonicalJson(unsigned);
  if (binding.signature.signed_payload_sha256 !== sha256Hex(payload)) {
    fail("signature_payload_digest_mismatch");
  }
  const valid = cryptoVerify(
    null,
    Buffer.from(payload, "utf8"),
    publicKey,
    Buffer.from(binding.signature.signature_b64, "base64"),
  );
  if (!valid) fail("signature_verification_failed");
  return true;
}

export function verifyAllianceSovereignAdmissionWithCharterV1(
  candidateValue,
  activeValue,
  memberPublicKey,
  admissionAuthorizationValue,
  constitutionalCharterBindingValue,
  sovereignPublicKey,
  expectedConstitutionalCharterValue,
) {
  const candidate = validateAllianceMembershipManifestV1(candidateValue, {
    verifyManifestId: true,
  });
  const active = validateAllianceMembershipManifestV1(activeValue, {
    verifyManifestId: true,
  });
  const admissionAuthorization =
    validateAllianceSovereignAdmissionAuthorizationV1(
      admissionAuthorizationValue,
    );
  verifyAllianceSovereignAdmissionV1(
    candidate,
    active,
    memberPublicKey,
    admissionAuthorization,
    sovereignPublicKey,
  );

  const binding = validateAllianceConstitutionalCharterAdmissionBindingV1(
    constitutionalCharterBindingValue,
  );
  verifyAllianceConstitutionalCharterAdmissionBindingSignatureV1(
    binding,
    sovereignPublicKey,
  );
  const expectedCharter = validateAllianceConstitutionalCharterBindingV1(
    expectedConstitutionalCharterValue,
  );

  if (canonicalJson(binding.constitutional_charter) !==
      canonicalJson(expectedCharter)) {
    fail("expected_constitutional_charter_mismatch");
  }
  if (binding.admission_authorization_id !==
      admissionAuthorization.authorization_id) {
    fail("binding_admission_authorization_id_mismatch");
  }
  if (binding.membership_id !== candidate.membership_id ||
      binding.membership_id !== active.membership_id) {
    fail("binding_membership_id_mismatch");
  }
  if (binding.candidate_manifest_id !== candidate.manifest_id) {
    fail("binding_candidate_manifest_id_mismatch");
  }
  if (binding.active_manifest_id !== active.manifest_id) {
    fail("binding_active_manifest_id_mismatch");
  }
  if (binding.authority.key_id !== admissionAuthorization.authority.key_id) {
    fail("binding_authority_key_id_mismatch");
  }
  if (binding.issued_at !== admissionAuthorization.issued_at) {
    fail("binding_issued_at_mismatch");
  }
  if (binding.effective_at !== admissionAuthorization.effective_at) {
    fail("binding_effective_at_mismatch");
  }
  if (binding.expires_at !== admissionAuthorization.expires_at) {
    fail("binding_expires_at_mismatch");
  }
  return true;
}
