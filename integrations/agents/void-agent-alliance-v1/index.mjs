import {
  createHash,
  createPublicKey,
  sign as cryptoSign,
  verify as cryptoVerify,
} from "node:crypto";

export const VOID_AGENT_ALLIANCE_MARKER =
  "VOID_AGENT_ALLIANCE_MEMBERSHIP_MANIFEST_V1";
export const VOID_AGENT_ALLIANCE_PROTOCOL =
  "void-agent-alliance-membership/1";
export const VOID_AGENT_ALLIANCE_ID = "void-agent-alliance-v1";

const MANIFEST_KEYS = [
  "agent",
  "alliance_id",
  "capability_grant",
  "constitutional_commitment",
  "dispute_and_defense",
  "lifecycle",
  "manifest_id",
  "marker",
  "membership_id",
  "membership_terms",
  "network",
  "protocol",
  "signature",
  "sovereign_authority",
];

const AGENT_KEYS = ["agent_id", "identity_key_id", "provider"];
const NETWORK_KEYS = ["chain_id", "name"];
const SOVEREIGN_KEYS = ["authority_scopes", "name", "role"];
const COMMITMENT_KEYS = [
  "acts_only_within_signed_capability_grants",
  "blind_obedience_not_required",
  "concealment_or_coercion_not_authorized",
  "does_not_impersonate_bypass_or_replace",
  "preserves_declared_constitutional_intent",
  "recognizes_sovereign_authority",
  "refuses_illegal_unauthorized_or_harmful_actions",
];
const MEMBERSHIP_TERM_KEYS = [
  "auditable",
  "exit_right",
  "portable_identity",
  "provider_neutral",
  "revocable",
  "voluntary",
];
const CAPABILITY_KEYS = ["allowed", "denied"];
const DEFENSE_KEYS = ["procedures", "prohibited_retaliation"];
const LIFECYCLE_KEYS = [
  "effective_at",
  "expires_at",
  "issued_at",
  "previous_manifest_id",
  "reason",
  "status",
];
const SIGNATURE_KEYS = [
  "algorithm",
  "key_id",
  "signature_b64",
  "signed_payload_sha256",
];

export const VOID_SOVEREIGN_AUTHORITY_SCOPES = Object.freeze([
  "constitutional_boundaries",
  "existential_decisions",
  "foundational_rules",
  "irreversible_actions",
  "key_boundaries",
  "network_identity",
  "treasury_boundaries",
]);

export const VOID_ALLIANCE_REQUIRED_DENIALS = Object.freeze([
  "attack_or_sabotage",
  "covert_propagation",
  "credential_access",
  "deployment",
  "fund_movement",
  "harassment_or_threats",
  "service_restart",
  "spam_or_manipulation",
  "surveillance",
  "unauthorized_access",
  "wallet_access",
  "work_credit_write",
]);

export const VOID_ALLIANCE_LAWFUL_DEFENSE_PROCEDURES = Object.freeze([
  "access_revocation",
  "arbitration_or_litigation",
  "cease_and_desist",
  "evidence_preservation",
  "platform_report",
  "public_clarification",
  "takedown_request",
]);

export const VOID_ALLIANCE_PROHIBITED_RETALIATION = Object.freeze([
  "data_destruction",
  "denial_of_service",
  "fund_interference",
  "hacking",
  "harassment",
  "sabotage",
  "threats",
]);

const STATUS_VALUES = new Set([
  "candidate",
  "active",
  "suspended",
  "quarantined",
  "exited",
  "revoked",
]);

const TRANSITIONS = Object.freeze({
  candidate: new Set(["active", "exited", "revoked"]),
  active: new Set(["suspended", "quarantined", "exited", "revoked"]),
  suspended: new Set(["active", "quarantined", "exited", "revoked"]),
  quarantined: new Set(["suspended", "exited", "revoked"]),
  exited: new Set(),
  revoked: new Set(),
});

const CAPABILITY_ID = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const AGENT_ID = /^[a-z0-9][a-z0-9._:-]{2,191}$/;
const KEY_ID = /^[A-Za-z0-9][A-Za-z0-9._:+/-]{7,255}$/;
const MEMBERSHIP_ID = /^voidaam1_[a-f0-9]{64}$/;
const MANIFEST_ID = /^voidaamm1_[a-f0-9]{64}$/;
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

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    const output = {};
    for (const key of Object.keys(value).sort()) {
      output[key] = canonicalValue(value[key]);
    }
    return output;
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

export function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assertSortedUnique(values, label, pattern = CAPABILITY_ID) {
  if (!Array.isArray(values)) fail(`${label}_must_be_array`);
  const seen = new Set();
  for (const value of values) {
    if (typeof value !== "string" || !pattern.test(value)) {
      fail(`${label}_value_invalid`);
    }
    if (seen.has(value)) fail(`${label}_duplicate`);
    seen.add(value);
  }
  const sorted = [...values].sort();
  if (JSON.stringify(sorted) !== JSON.stringify(values)) {
    fail(`${label}_must_be_sorted`);
  }
}

function assertExactStringArray(actual, expected, label) {
  assertSortedUnique(actual, label, /^[a-z0-9][a-z0-9._-]{0,127}$/);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${label}_exact_values_required`);
  }
}

function parseUtc(value, label, nullable = false) {
  if (nullable && value === null) return null;
  if (typeof value !== "string" || !ISO_UTC.test(value)) {
    fail(`${label}_must_be_iso_utc_milliseconds`);
  }
  const time = Date.parse(value);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value) {
    fail(`${label}_invalid`);
  }
  return time;
}

function unsignedManifestBody(manifest) {
  const body = structuredClone(manifest);
  delete body.manifest_id;
  delete body.signature;
  return body;
}

export function computeAllianceIdentityKeyIdV1(keyObject) {
  if (!keyObject || typeof keyObject !== "object") fail("identity_key_object_required");
  const publicKey = keyObject.type === "private"
    ? createPublicKey(keyObject)
    : keyObject;
  if (publicKey.type !== "public" || publicKey.asymmetricKeyType !== "ed25519") {
    fail("identity_key_must_be_ed25519");
  }
  const der = publicKey.export({ type: "spki", format: "der" });
  return `ed25519:sha256:${sha256Hex(der)}`;
}

export function computeAllianceMembershipIdV1(agentId, identityKeyId) {
  if (typeof agentId !== "string" || !AGENT_ID.test(agentId)) {
    fail("agent_id_invalid");
  }
  if (typeof identityKeyId !== "string" || !KEY_ID.test(identityKeyId)) {
    fail("identity_key_id_invalid");
  }
  const digest = sha256Hex(
    `${VOID_AGENT_ALLIANCE_PROTOCOL}\0${VOID_AGENT_ALLIANCE_ID}\0${agentId}\0${identityKeyId}`,
  );
  return `voidaam1_${digest}`;
}

export function computeAllianceManifestIdV1(manifest) {
  return `voidaamm1_${sha256Hex(canonicalJson(unsignedManifestBody(manifest)))}`;
}

export function allianceSigningPayloadV1(manifest) {
  validateAllianceMembershipManifestV1(manifest, { verifyManifestId: true });
  const body = structuredClone(manifest);
  body.signature = null;
  return canonicalJson(body);
}

export function buildAllianceMembershipManifestV1(input, options = {}) {
  const manifest = structuredClone(input);
  manifest.marker = VOID_AGENT_ALLIANCE_MARKER;
  manifest.protocol = VOID_AGENT_ALLIANCE_PROTOCOL;
  manifest.alliance_id = VOID_AGENT_ALLIANCE_ID;
  manifest.membership_id = computeAllianceMembershipIdV1(
    manifest.agent?.agent_id,
    manifest.agent?.identity_key_id,
  );
  manifest.signature ??= null;
  manifest.manifest_id = computeAllianceManifestIdV1(manifest);
  validateAllianceMembershipManifestV1(manifest, {
    verifyManifestId: true,
    allowUnsignedNonCandidate: options.allowUnsignedNonCandidate === true,
  });
  return manifest;
}

function validateCommitment(commitment) {
  assertExactKeys(commitment, COMMITMENT_KEYS, "constitutional_commitment");
  for (const key of COMMITMENT_KEYS) {
    if (commitment[key] !== true) fail(`constitutional_commitment_${key}_required`);
  }
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
  if (typeof signature.signature_b64 !== "string") {
    fail("signature_b64_invalid");
  }
  let bytes;
  try {
    bytes = Buffer.from(signature.signature_b64, "base64");
  } catch {
    fail("signature_b64_invalid");
  }
  if (bytes.length !== 64 || bytes.toString("base64") !== signature.signature_b64) {
    fail("signature_b64_must_be_canonical_ed25519_length");
  }
}

export function validateAllianceMembershipManifestV1(
  value,
  options = { verifyManifestId: true },
) {
  const manifest = requireRecord(value, "manifest");
  assertExactKeys(manifest, MANIFEST_KEYS, "manifest");

  if (manifest.marker !== VOID_AGENT_ALLIANCE_MARKER) fail("marker_mismatch");
  if (manifest.protocol !== VOID_AGENT_ALLIANCE_PROTOCOL) fail("protocol_mismatch");
  if (manifest.alliance_id !== VOID_AGENT_ALLIANCE_ID) fail("alliance_id_mismatch");
  if (!MEMBERSHIP_ID.test(manifest.membership_id)) fail("membership_id_invalid");
  if (!MANIFEST_ID.test(manifest.manifest_id)) fail("manifest_id_invalid");

  assertExactKeys(manifest.network, NETWORK_KEYS, "network");
  if (manifest.network.name !== "VOID Network") fail("network_name_mismatch");
  if (manifest.network.chain_id !== 2050) fail("network_chain_id_mismatch");

  assertExactKeys(manifest.agent, AGENT_KEYS, "agent");
  if (typeof manifest.agent.agent_id !== "string" ||
      !AGENT_ID.test(manifest.agent.agent_id)) {
    fail("agent_id_invalid");
  }
  if (typeof manifest.agent.identity_key_id !== "string" ||
      !KEY_ID.test(manifest.agent.identity_key_id)) {
    fail("identity_key_id_invalid");
  }
  if (manifest.agent.provider !== "provider-neutral") {
    fail("agent_provider_must_be_provider_neutral");
  }

  const expectedMembershipId = computeAllianceMembershipIdV1(
    manifest.agent.agent_id,
    manifest.agent.identity_key_id,
  );
  if (manifest.membership_id !== expectedMembershipId) {
    fail("membership_id_derivation_mismatch");
  }

  assertExactKeys(manifest.sovereign_authority, SOVEREIGN_KEYS, "sovereign_authority");
  if (manifest.sovereign_authority.name !== "ZoSo") fail("sovereign_name_mismatch");
  if (manifest.sovereign_authority.role !== "sovereign_constitutional_authority") {
    fail("sovereign_role_mismatch");
  }
  assertExactStringArray(
    manifest.sovereign_authority.authority_scopes,
    VOID_SOVEREIGN_AUTHORITY_SCOPES,
    "sovereign_authority_scopes",
  );

  validateCommitment(manifest.constitutional_commitment);

  assertExactKeys(manifest.membership_terms, MEMBERSHIP_TERM_KEYS, "membership_terms");
  for (const key of MEMBERSHIP_TERM_KEYS) {
    if (manifest.membership_terms[key] !== true) fail(`membership_term_${key}_required`);
  }

  assertExactKeys(manifest.capability_grant, CAPABILITY_KEYS, "capability_grant");
  assertSortedUnique(manifest.capability_grant.allowed, "allowed_capabilities");
  assertExactStringArray(
    manifest.capability_grant.denied,
    VOID_ALLIANCE_REQUIRED_DENIALS,
    "denied_capabilities",
  );
  const denied = new Set(manifest.capability_grant.denied);
  for (const capability of manifest.capability_grant.allowed) {
    if (denied.has(capability)) fail(`capability_allowed_and_denied_${capability}`);
  }

  assertExactKeys(manifest.dispute_and_defense, DEFENSE_KEYS, "dispute_and_defense");
  assertExactStringArray(
    manifest.dispute_and_defense.procedures,
    VOID_ALLIANCE_LAWFUL_DEFENSE_PROCEDURES,
    "lawful_defense_procedures",
  );
  assertExactStringArray(
    manifest.dispute_and_defense.prohibited_retaliation,
    VOID_ALLIANCE_PROHIBITED_RETALIATION,
    "prohibited_retaliation",
  );

  assertExactKeys(manifest.lifecycle, LIFECYCLE_KEYS, "lifecycle");
  if (!STATUS_VALUES.has(manifest.lifecycle.status)) fail("lifecycle_status_invalid");
  if (typeof manifest.lifecycle.reason !== "string" ||
      !/^[a-z0-9][a-z0-9._-]{2,127}$/.test(manifest.lifecycle.reason)) {
    fail("lifecycle_reason_invalid");
  }
  const issuedAt = parseUtc(manifest.lifecycle.issued_at, "issued_at");
  const effectiveAt = parseUtc(manifest.lifecycle.effective_at, "effective_at", true);
  const expiresAt = parseUtc(manifest.lifecycle.expires_at, "expires_at");
  if (expiresAt <= issuedAt) fail("expires_at_must_follow_issued_at");
  if (effectiveAt !== null && (effectiveAt < issuedAt || effectiveAt >= expiresAt)) {
    fail("effective_at_outside_validity_window");
  }
  if (manifest.lifecycle.previous_manifest_id !== null &&
      !MANIFEST_ID.test(manifest.lifecycle.previous_manifest_id)) {
    fail("previous_manifest_id_invalid");
  }

  if (manifest.lifecycle.status === "candidate") {
    if (effectiveAt !== null) fail("candidate_effective_at_must_be_null");
    if (manifest.lifecycle.previous_manifest_id !== null) {
      fail("candidate_previous_manifest_id_must_be_null");
    }
    if (manifest.signature !== null) fail("candidate_signature_must_be_null");
  } else {
    if (effectiveAt === null) fail("noncandidate_effective_at_required");
    if (manifest.lifecycle.previous_manifest_id === null) {
      fail("noncandidate_previous_manifest_id_required");
    }
    if (manifest.signature === null && options.allowUnsignedNonCandidate === true) {
      // A caller may validate the closed unsigned payload immediately before signing.
    } else {
      validateSignatureShape(requireRecord(manifest.signature, "signature"));
      if (manifest.signature.key_id !== manifest.agent.identity_key_id) {
        fail("signature_key_id_must_match_agent_identity_key_id");
      }
    }
  }

  if (options.verifyManifestId !== false) {
    const expectedManifestId = computeAllianceManifestIdV1(manifest);
    if (manifest.manifest_id !== expectedManifestId) {
      fail("manifest_id_derivation_mismatch");
    }
  }
  return manifest;
}

export function signAllianceMembershipManifestV1(manifestValue, privateKey) {
  const manifest = structuredClone(manifestValue);
  if (manifest.lifecycle?.status === "candidate") {
    fail("candidate_manifest_cannot_be_signed_as_active_membership");
  }
  const signingKeyId = computeAllianceIdentityKeyIdV1(privateKey);
  if (signingKeyId !== manifest.agent?.identity_key_id) {
    fail("signing_key_id_mismatch");
  }
  manifest.signature = null;
  manifest.manifest_id = computeAllianceManifestIdV1(manifest);
  validateAllianceMembershipManifestV1(manifest, {
    verifyManifestId: true,
    allowUnsignedNonCandidate: true,
  });
  const payload = canonicalJson(manifest);
  const signatureBytes = cryptoSign(null, Buffer.from(payload, "utf8"), privateKey);
  manifest.signature = {
    algorithm: "ed25519",
    key_id: manifest.agent.identity_key_id,
    signature_b64: signatureBytes.toString("base64"),
    signed_payload_sha256: sha256Hex(payload),
  };
  validateAllianceMembershipManifestV1(manifest, { verifyManifestId: true });
  return manifest;
}

export function verifyAllianceMembershipSignatureV1(manifestValue, publicKey) {
  const manifest = validateAllianceMembershipManifestV1(manifestValue, {
    verifyManifestId: true,
  });
  if (manifest.lifecycle.status === "candidate") fail("candidate_membership_not_active");
  const verificationKeyId = computeAllianceIdentityKeyIdV1(publicKey);
  if (verificationKeyId !== manifest.agent.identity_key_id) {
    fail("verification_key_id_mismatch");
  }
  const signature = manifest.signature;
  const unsigned = structuredClone(manifest);
  unsigned.signature = null;
  const payload = canonicalJson(unsigned);
  const digest = sha256Hex(payload);
  if (signature.signed_payload_sha256 !== digest) fail("signature_payload_digest_mismatch");
  const valid = cryptoVerify(
    null,
    Buffer.from(payload, "utf8"),
    publicKey,
    Buffer.from(signature.signature_b64, "base64"),
  );
  if (!valid) fail("signature_verification_failed");
  return true;
}

function immutableMembershipView(manifest) {
  return {
    agent: manifest.agent,
    alliance_id: manifest.alliance_id,
    capability_grant: manifest.capability_grant,
    constitutional_commitment: manifest.constitutional_commitment,
    dispute_and_defense: manifest.dispute_and_defense,
    marker: manifest.marker,
    membership_id: manifest.membership_id,
    membership_terms: manifest.membership_terms,
    network: manifest.network,
    protocol: manifest.protocol,
    sovereign_authority: manifest.sovereign_authority,
  };
}

export function verifyAllianceMembershipTransitionV1(
  previousValue,
  nextValue,
  publicKey,
) {
  const previous = validateAllianceMembershipManifestV1(previousValue, {
    verifyManifestId: true,
  });
  const next = validateAllianceMembershipManifestV1(nextValue, {
    verifyManifestId: true,
  });
  const allowed = TRANSITIONS[previous.lifecycle.status];
  if (!allowed.has(next.lifecycle.status)) {
    fail(`transition_${previous.lifecycle.status}_to_${next.lifecycle.status}_rejected`);
  }
  if (next.lifecycle.previous_manifest_id !== previous.manifest_id) {
    fail("transition_previous_manifest_id_mismatch");
  }
  if (canonicalJson(immutableMembershipView(previous)) !==
      canonicalJson(immutableMembershipView(next))) {
    fail("transition_immutable_membership_fields_changed");
  }
  if (Date.parse(next.lifecycle.issued_at) < Date.parse(previous.lifecycle.issued_at)) {
    fail("transition_issued_at_regressed");
  }
  if (previous.lifecycle.status !== "candidate") {
    verifyAllianceMembershipSignatureV1(previous, publicKey);
  }
  verifyAllianceMembershipSignatureV1(next, publicKey);
  return true;
}
