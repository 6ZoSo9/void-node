// SPDX-License-Identifier: VCL-1.0
import {
  createHash,
  createPublicKey,
  timingSafeEqual,
  verify,
  type JsonWebKey,
} from "node:crypto";

import {
  readChain2050RoleAuthorityStateV1,
  type Chain2050RoleAuthorityPairV1,
  type Chain2050RoleAuthorityReadSourceV1,
} from "./chain2050_role_authority_read_adapter_v1.js";
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
  canonicalChain2050RoleAuthorityJsonV1,
  parseChain2050RoleAuthorityGenerationV1,
} from "./chain2050_role_authority_record_v1.js";

export const VOID_PARTICIPANT_READONLY_SESSION_V1_SCHEMA =
  "void.participant-readonly-session.v1" as const;
export const VOID_PARTICIPANT_SUBJECT_BINDING_V1_SCHEMA =
  "void.participant-subject-binding.v1" as const;
export const VOID_PARTICIPANT_READONLY_CHALLENGE_V1_MARKER =
  "VOID_PARTICIPANT_READONLY_SESSION_CHALLENGE_V1" as const;
export const VOID_PARTICIPANT_READONLY_PROOF_V1_MARKER =
  "VOID_PARTICIPANT_READONLY_SESSION_PROOF_V1" as const;
export const VOID_PARTICIPANT_READONLY_SESSION_V1_MARKER =
  "VOID_PARTICIPANT_READONLY_SESSION_V1" as const;

export const VOID_PARTICIPANT_READONLY_REQUIRED_ROLE = "PARTICIPANT" as const;
export const VOID_PARTICIPANT_READONLY_CHALLENGE_MAX_TTL_MS = 60_000;
export const VOID_PARTICIPANT_READONLY_SESSION_MAX_TTL_MS =
  30 * 24 * 60 * 60 * 1000;
export const VOID_PARTICIPANT_READONLY_SESSION_PRODUCTION_ACTIVE = false;

export const VOID_PARTICIPANT_READONLY_ROUTES = Object.freeze([
  "/__void/ui/wave3/wallet.json",
  "/__void/ui/wave4/earn.json",
] as const);

export interface ParticipantReadonlyPublicJwkV1 {
  crv: "Ed25519";
  kty: "OKP";
  x: string;
}

export interface ParticipantSubjectBindingV1 {
  schema: typeof VOID_PARTICIPANT_SUBJECT_BINDING_V1_SCHEMA;
  chain_id: typeof VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID;
  identity_id: string;
  account_id: string;
  public_key_jwk: ParticipantReadonlyPublicJwkV1;
}

export interface ParticipantReadonlyChallengeV1 {
  marker: typeof VOID_PARTICIPANT_READONLY_CHALLENGE_V1_MARKER;
  version: 1;
  network_chain_id: typeof VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID;
  origin: string;
  identity_id: string;
  account_id: string;
  role: typeof VOID_PARTICIPANT_READONLY_REQUIRED_ROLE;
  public_key_jwk: ParticipantReadonlyPublicJwkV1;
  subject_binding_sha256: string;
  issued_at: string;
  expires_at: string;
  nonce: string;
}

export interface ParticipantReadonlyProofV1 {
  marker: typeof VOID_PARTICIPANT_READONLY_PROOF_V1_MARKER;
  version: 1;
  challenge: ParticipantReadonlyChallengeV1;
  signature: {
    alg: "Ed25519";
    encoding: "base64url-no-padding";
    value: string;
  };
}

export interface ParticipantReadonlyChallengeReplayStoreV1 {
  consumeChallengeNonceV1(
    nonce: string,
    expiresAt: string,
  ): boolean | Promise<boolean>;
}

export interface VerifiedParticipantReadonlyProofV1 {
  identity_id: string;
  account_id: string;
  origin: string;
  subject_binding_sha256: string;
  role_authority_pair: Chain2050RoleAuthorityPairV1;
  challenge_expires_at: string;
  verified_at: string;
}

export interface ParticipantReadonlySessionV1 {
  schema: typeof VOID_PARTICIPANT_READONLY_SESSION_V1_SCHEMA;
  marker: typeof VOID_PARTICIPANT_READONLY_SESSION_V1_MARKER;
  version: 1;
  network_chain_id: typeof VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID;
  session_id: string;
  token_sha256: string;
  origin: string;
  identity_id: string;
  account_id: string;
  role: typeof VOID_PARTICIPANT_READONLY_REQUIRED_ROLE;
  subject_binding_sha256: string;
  role_authority_generation: string;
  role_record_sha256: string;
  issued_at: string;
  expires_at: string;
  capabilities: {
    wallet_read: true;
    earn_read: true;
    account_enumeration: false;
    generic_private_node_read: false;
    wallet_signing: false;
    wallet_send: false;
    work_credit_mutation: false;
    validator_mutation: false;
    transaction_broadcast: false;
    money_movement: false;
  };
}

export type ParticipantReadonlyVerificationResultV1 =
  | { ok: true; verified: Readonly<VerifiedParticipantReadonlyProofV1> }
  | { ok: false; reason: string };

export type ParticipantReadonlySessionIssueResultV1 =
  | {
      ok: true;
      session: Readonly<ParticipantReadonlySessionV1>;
    }
  | { ok: false; reason: string };

export type ParticipantReadonlySessionAuthorizationResultV1 =
  | {
      ok: true;
      context: Readonly<{
        identity_id: string;
        account_id: string;
        route: (typeof VOID_PARTICIPANT_READONLY_ROUTES)[number];
        role_authority_pair: Chain2050RoleAuthorityPairV1;
      }>;
    }
  | { ok: false; reason: string };

const IDENTITY_ID = /^[a-z0-9][a-z0-9._:-]{2,191}$/;
const ACCOUNT_ID = /^[A-Za-z0-9._:-]{1,128}$/;
const HEX64 = /^[a-f0-9]{64}$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const NONCE_MIN_BYTES = 16;
const SESSION_ID_BYTES = 32;
const SESSION_TOKEN_MIN_BYTES = 32;

const CHALLENGE_KEYS = Object.freeze([
  "account_id",
  "expires_at",
  "identity_id",
  "issued_at",
  "marker",
  "network_chain_id",
  "nonce",
  "origin",
  "public_key_jwk",
  "role",
  "subject_binding_sha256",
  "version",
] as const);

const PROOF_KEYS = Object.freeze([
  "challenge",
  "marker",
  "signature",
  "version",
] as const);

const SIGNATURE_KEYS = Object.freeze([
  "alg",
  "encoding",
  "value",
] as const);

const JWK_KEYS = Object.freeze(["crv", "kty", "x"] as const);

const VERIFIED_KEYS = Object.freeze([
  "account_id",
  "challenge_expires_at",
  "identity_id",
  "origin",
  "role_authority_pair",
  "subject_binding_sha256",
  "verified_at",
] as const);

const PAIR_KEYS = Object.freeze([
  "role_authority_generation",
  "role_record_sha256",
] as const);

const SESSION_KEYS = Object.freeze([
  "account_id",
  "capabilities",
  "expires_at",
  "identity_id",
  "issued_at",
  "marker",
  "network_chain_id",
  "origin",
  "role",
  "role_authority_generation",
  "role_record_sha256",
  "schema",
  "session_id",
  "subject_binding_sha256",
  "token_sha256",
  "version",
] as const);

const CAPABILITY_KEYS = Object.freeze([
  "account_enumeration",
  "earn_read",
  "generic_private_node_read",
  "money_movement",
  "transaction_broadcast",
  "validator_mutation",
  "wallet_read",
  "wallet_send",
  "wallet_signing",
  "work_credit_mutation",
] as const);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactObjectKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return JSON.stringify(actual) === JSON.stringify(wanted);
}

function validateAuthorityPairV1(
  value: unknown,
): value is Chain2050RoleAuthorityPairV1 {
  if (!isRecord(value) || !exactObjectKeys(value, PAIR_KEYS)) return false;
  return (
    parseChain2050RoleAuthorityGenerationV1(
      value.role_authority_generation,
    ) !== null &&
    typeof value.role_record_sha256 === "string" &&
    HEX64.test(value.role_record_sha256)
  );
}

function sha256HexUtf8(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sha256HexBytes(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString() === value
  );
}

function canonicalHttpsOrigin(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 512) return false;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return (
    parsed.protocol === "https:" &&
    parsed.username === "" &&
    parsed.password === "" &&
    parsed.search === "" &&
    parsed.hash === "" &&
    parsed.origin === value
  );
}

function decodeCanonicalBase64Url(
  value: unknown,
  minBytes: number,
  exactBytes?: number,
): Buffer | null {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    !BASE64URL.test(value)
  ) {
    return null;
  }
  let decoded: Buffer;
  try {
    decoded = Buffer.from(value, "base64url");
  } catch {
    return null;
  }
  if (decoded.toString("base64url") !== value) return null;
  if (decoded.length < minBytes) return null;
  if (exactBytes !== undefined && decoded.length !== exactBytes) return null;
  return decoded;
}

export function validateParticipantReadonlyPublicJwkV1(
  value: unknown,
): value is ParticipantReadonlyPublicJwkV1 {
  if (!isRecord(value) || !exactObjectKeys(value, JWK_KEYS)) return false;
  if (value.kty !== "OKP" || value.crv !== "Ed25519") return false;
  return decodeCanonicalBase64Url(value.x, 32, 32) !== null;
}

export function canonicalParticipantReadonlyJsonV1(value: unknown): string {
  return canonicalChain2050RoleAuthorityJsonV1(value);
}

export function participantSubjectBindingV1(input: {
  identity_id: string;
  account_id: string;
  public_key_jwk: ParticipantReadonlyPublicJwkV1;
}): ParticipantSubjectBindingV1 {
  if (!IDENTITY_ID.test(input.identity_id)) {
    throw new Error("participant_identity_id_invalid");
  }
  if (!ACCOUNT_ID.test(input.account_id)) {
    throw new Error("participant_account_id_invalid");
  }
  if (!validateParticipantReadonlyPublicJwkV1(input.public_key_jwk)) {
    throw new Error("participant_public_jwk_invalid");
  }
  return {
    schema: VOID_PARTICIPANT_SUBJECT_BINDING_V1_SCHEMA,
    chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
    identity_id: input.identity_id,
    account_id: input.account_id,
    public_key_jwk: structuredClone(input.public_key_jwk),
  };
}

export function computeParticipantSubjectBindingSha256V1(input: {
  identity_id: string;
  account_id: string;
  public_key_jwk: ParticipantReadonlyPublicJwkV1;
}): string {
  return sha256HexUtf8(
    canonicalParticipantReadonlyJsonV1(
      participantSubjectBindingV1(input),
    ),
  );
}

function validateChallengeV1(
  value: unknown,
): value is ParticipantReadonlyChallengeV1 {
  if (!isRecord(value) || !exactObjectKeys(value, CHALLENGE_KEYS)) {
    return false;
  }
  if (value.marker !== VOID_PARTICIPANT_READONLY_CHALLENGE_V1_MARKER) {
    return false;
  }
  if (value.version !== 1) return false;
  if (value.network_chain_id !== VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID) {
    return false;
  }
  if (!canonicalHttpsOrigin(value.origin)) return false;
  if (typeof value.identity_id !== "string" || !IDENTITY_ID.test(value.identity_id)) {
    return false;
  }
  if (typeof value.account_id !== "string" || !ACCOUNT_ID.test(value.account_id)) {
    return false;
  }
  if (value.role !== VOID_PARTICIPANT_READONLY_REQUIRED_ROLE) return false;
  if (!validateParticipantReadonlyPublicJwkV1(value.public_key_jwk)) return false;
  if (
    typeof value.subject_binding_sha256 !== "string" ||
    !HEX64.test(value.subject_binding_sha256)
  ) {
    return false;
  }
  if (!canonicalIso(value.issued_at) || !canonicalIso(value.expires_at)) {
    return false;
  }
  if (decodeCanonicalBase64Url(value.nonce, NONCE_MIN_BYTES) === null) {
    return false;
  }
  return true;
}

export function createParticipantReadonlyChallengeV1(input: {
  origin: string;
  identity_id: string;
  account_id: string;
  public_key_jwk: ParticipantReadonlyPublicJwkV1;
  issued_at: string;
  expires_at: string;
  nonce: string;
}): ParticipantReadonlyChallengeV1 {
  const subjectBindingSha256 = computeParticipantSubjectBindingSha256V1({
    identity_id: input.identity_id,
    account_id: input.account_id,
    public_key_jwk: input.public_key_jwk,
  });

  const challenge: ParticipantReadonlyChallengeV1 = {
    marker: VOID_PARTICIPANT_READONLY_CHALLENGE_V1_MARKER,
    version: 1,
    network_chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
    origin: input.origin,
    identity_id: input.identity_id,
    account_id: input.account_id,
    role: VOID_PARTICIPANT_READONLY_REQUIRED_ROLE,
    public_key_jwk: structuredClone(input.public_key_jwk),
    subject_binding_sha256: subjectBindingSha256,
    issued_at: input.issued_at,
    expires_at: input.expires_at,
    nonce: input.nonce,
  };

  if (!validateChallengeV1(challenge)) {
    throw new Error("participant_challenge_invalid");
  }

  const issuedMs = Date.parse(challenge.issued_at);
  const expiresMs = Date.parse(challenge.expires_at);
  if (
    expiresMs <= issuedMs ||
    expiresMs - issuedMs > VOID_PARTICIPANT_READONLY_CHALLENGE_MAX_TTL_MS
  ) {
    throw new Error("participant_challenge_ttl_invalid");
  }
  return challenge;
}

function validateProofV1(
  value: unknown,
): value is ParticipantReadonlyProofV1 {
  if (!isRecord(value) || !exactObjectKeys(value, PROOF_KEYS)) return false;
  if (value.marker !== VOID_PARTICIPANT_READONLY_PROOF_V1_MARKER) return false;
  if (value.version !== 1) return false;
  if (!validateChallengeV1(value.challenge)) return false;
  if (!isRecord(value.signature) || !exactObjectKeys(value.signature, SIGNATURE_KEYS)) {
    return false;
  }
  if (
    value.signature.alg !== "Ed25519" ||
    value.signature.encoding !== "base64url-no-padding"
  ) {
    return false;
  }
  return decodeCanonicalBase64Url(value.signature.value, 64, 64) !== null;
}

function validateReplayStoreV1(
  value: unknown,
): value is ParticipantReadonlyChallengeReplayStoreV1 {
  return (
    isRecord(value) &&
    typeof value.consumeChallengeNonceV1 === "function"
  );
}

export async function verifyParticipantReadonlyProofV1(
  roleSource: Chain2050RoleAuthorityReadSourceV1,
  replayStoreValue: unknown,
  proofValue: unknown,
  expectedOrigin: string,
  nowIso: string,
): Promise<ParticipantReadonlyVerificationResultV1> {
  if (!validateProofV1(proofValue)) {
    return { ok: false, reason: "participant_proof_invalid" };
  }
  if (!validateReplayStoreV1(replayStoreValue)) {
    return { ok: false, reason: "participant_replay_store_invalid" };
  }
  if (!canonicalHttpsOrigin(expectedOrigin) || !canonicalIso(nowIso)) {
    return { ok: false, reason: "participant_verifier_context_invalid" };
  }

  const proof = proofValue;
  const challenge = proof.challenge;
  if (challenge.origin !== expectedOrigin) {
    return { ok: false, reason: "participant_challenge_origin_mismatch" };
  }

  const nowMs = Date.parse(nowIso);
  const issuedMs = Date.parse(challenge.issued_at);
  const expiresMs = Date.parse(challenge.expires_at);
  if (
    expiresMs <= issuedMs ||
    expiresMs - issuedMs > VOID_PARTICIPANT_READONLY_CHALLENGE_MAX_TTL_MS ||
    nowMs < issuedMs ||
    nowMs > expiresMs
  ) {
    return { ok: false, reason: "participant_challenge_expired_or_not_yet_valid" };
  }

  const recomputedBinding = computeParticipantSubjectBindingSha256V1({
    identity_id: challenge.identity_id,
    account_id: challenge.account_id,
    public_key_jwk: challenge.public_key_jwk,
  });
  if (recomputedBinding !== challenge.subject_binding_sha256) {
    return { ok: false, reason: "participant_subject_binding_mismatch" };
  }

  let key;
  try {
    key = createPublicKey({
      key: challenge.public_key_jwk as JsonWebKey,
      format: "jwk",
    });
  } catch {
    return { ok: false, reason: "participant_public_key_import_failed" };
  }

  const signature = decodeCanonicalBase64Url(proof.signature.value, 64, 64);
  if (signature === null) {
    return { ok: false, reason: "participant_signature_invalid" };
  }

  const signed = Buffer.from(
    canonicalParticipantReadonlyJsonV1(challenge),
    "utf8",
  );
  let signatureValid = false;
  try {
    signatureValid = verify(null, signed, key, signature);
  } catch {
    signatureValid = false;
  }
  if (!signatureValid) {
    return { ok: false, reason: "participant_signature_verification_failed" };
  }

  const roleRead = await readChain2050RoleAuthorityStateV1(
    roleSource,
    {
      identity_id: challenge.identity_id,
      expected_pair: null,
      require_active: true,
    },
  );
  if (roleRead.ok === false) {
    return {
      ok: false,
      reason: `participant_role_authority_rejected:${roleRead.reason}`,
    };
  }
  if (roleRead.view.role !== VOID_PARTICIPANT_READONLY_REQUIRED_ROLE) {
    return { ok: false, reason: "participant_role_not_participant" };
  }
  if (
    roleRead.view.subject_binding_sha256 !==
    challenge.subject_binding_sha256
  ) {
    return { ok: false, reason: "participant_role_subject_binding_mismatch" };
  }

  let consumed = false;
  try {
    consumed = await replayStoreValue.consumeChallengeNonceV1(
      challenge.nonce,
      challenge.expires_at,
    );
  } catch {
    return { ok: false, reason: "participant_challenge_replay_store_failed" };
  }
  if (consumed !== true) {
    return { ok: false, reason: "participant_challenge_replay_detected" };
  }

  return {
    ok: true,
    verified: Object.freeze({
      identity_id: challenge.identity_id,
      account_id: challenge.account_id,
      origin: challenge.origin,
      subject_binding_sha256: challenge.subject_binding_sha256,
      role_authority_pair: Object.freeze({
        role_authority_generation:
          roleRead.view.role_authority_generation,
        role_record_sha256: roleRead.view.role_record_sha256,
      }),
      challenge_expires_at: challenge.expires_at,
      verified_at: nowIso,
    }),
  };
}

function validateCapabilitiesV1(
  value: unknown,
): value is ParticipantReadonlySessionV1["capabilities"] {
  if (!isRecord(value) || !exactObjectKeys(value, CAPABILITY_KEYS)) return false;
  return (
    value.wallet_read === true &&
    value.earn_read === true &&
    value.account_enumeration === false &&
    value.generic_private_node_read === false &&
    value.wallet_signing === false &&
    value.wallet_send === false &&
    value.work_credit_mutation === false &&
    value.validator_mutation === false &&
    value.transaction_broadcast === false &&
    value.money_movement === false
  );
}

function validateSessionV1(
  value: unknown,
): value is ParticipantReadonlySessionV1 {
  if (!isRecord(value) || !exactObjectKeys(value, SESSION_KEYS)) return false;
  if (value.schema !== VOID_PARTICIPANT_READONLY_SESSION_V1_SCHEMA) return false;
  if (value.marker !== VOID_PARTICIPANT_READONLY_SESSION_V1_MARKER) return false;
  if (value.version !== 1) return false;
  if (value.network_chain_id !== VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID) {
    return false;
  }
  if (typeof value.session_id !== "string" || !HEX64.test(value.session_id)) {
    return false;
  }
  if (typeof value.token_sha256 !== "string" || !HEX64.test(value.token_sha256)) {
    return false;
  }
  if (!canonicalHttpsOrigin(value.origin)) return false;
  if (typeof value.identity_id !== "string" || !IDENTITY_ID.test(value.identity_id)) {
    return false;
  }
  if (typeof value.account_id !== "string" || !ACCOUNT_ID.test(value.account_id)) {
    return false;
  }
  if (value.role !== VOID_PARTICIPANT_READONLY_REQUIRED_ROLE) return false;
  if (
    typeof value.subject_binding_sha256 !== "string" ||
    !HEX64.test(value.subject_binding_sha256)
  ) {
    return false;
  }
  if (
    parseChain2050RoleAuthorityGenerationV1(
      value.role_authority_generation,
    ) === null
  ) {
    return false;
  }
  if (
    typeof value.role_record_sha256 !== "string" ||
    !HEX64.test(value.role_record_sha256)
  ) {
    return false;
  }
  if (!canonicalIso(value.issued_at) || !canonicalIso(value.expires_at)) {
    return false;
  }
  return validateCapabilitiesV1(value.capabilities);
}

export function issueParticipantReadonlySessionV1(
  verifiedValue: unknown,
  input: {
    session_id: string;
    bearer_token: string;
    issued_at: string;
    expires_at: string;
  },
): ParticipantReadonlySessionIssueResultV1 {
  if (
    !isRecord(verifiedValue) ||
    !exactObjectKeys(verifiedValue, VERIFIED_KEYS)
  ) {
    return { ok: false, reason: "participant_verified_context_invalid" };
  }
  const verified = verifiedValue as unknown as VerifiedParticipantReadonlyProofV1;
  if (
    typeof verified.identity_id !== "string" ||
    !IDENTITY_ID.test(verified.identity_id) ||
    typeof verified.account_id !== "string" ||
    !ACCOUNT_ID.test(verified.account_id) ||
    !canonicalHttpsOrigin(verified.origin) ||
    typeof verified.subject_binding_sha256 !== "string" ||
    !HEX64.test(verified.subject_binding_sha256) ||
    !canonicalIso(verified.challenge_expires_at) ||
    !canonicalIso(verified.verified_at) ||
    !validateAuthorityPairV1(verified.role_authority_pair)
  ) {
    return { ok: false, reason: "participant_verified_context_invalid" };
  }

  if (!HEX64.test(input.session_id)) {
    return { ok: false, reason: "participant_session_id_invalid" };
  }
  const sessionIdBytes = Buffer.from(input.session_id, "hex");
  if (sessionIdBytes.length !== SESSION_ID_BYTES) {
    return { ok: false, reason: "participant_session_id_invalid" };
  }

  const tokenBytes = decodeCanonicalBase64Url(
    input.bearer_token,
    SESSION_TOKEN_MIN_BYTES,
  );
  if (tokenBytes === null) {
    return { ok: false, reason: "participant_session_token_invalid" };
  }
  if (!canonicalIso(input.issued_at) || !canonicalIso(input.expires_at)) {
    return { ok: false, reason: "participant_session_time_invalid" };
  }

  const issuedMs = Date.parse(input.issued_at);
  const expiresMs = Date.parse(input.expires_at);
  const verifiedMs = Date.parse(verified.verified_at);
  const challengeExpiresMs = Date.parse(verified.challenge_expires_at);
  if (
    issuedMs < verifiedMs ||
    issuedMs > challengeExpiresMs ||
    expiresMs <= issuedMs ||
    expiresMs - issuedMs > VOID_PARTICIPANT_READONLY_SESSION_MAX_TTL_MS
  ) {
    return { ok: false, reason: "participant_session_ttl_invalid" };
  }

  const session: ParticipantReadonlySessionV1 = {
    schema: VOID_PARTICIPANT_READONLY_SESSION_V1_SCHEMA,
    marker: VOID_PARTICIPANT_READONLY_SESSION_V1_MARKER,
    version: 1,
    network_chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
    session_id: input.session_id,
    token_sha256: sha256HexBytes(tokenBytes),
    origin: verified.origin,
    identity_id: verified.identity_id,
    account_id: verified.account_id,
    role: VOID_PARTICIPANT_READONLY_REQUIRED_ROLE,
    subject_binding_sha256: verified.subject_binding_sha256,
    role_authority_generation:
      verified.role_authority_pair.role_authority_generation,
    role_record_sha256:
      verified.role_authority_pair.role_record_sha256,
    issued_at: input.issued_at,
    expires_at: input.expires_at,
    capabilities: {
      wallet_read: true,
      earn_read: true,
      account_enumeration: false,
      generic_private_node_read: false,
      wallet_signing: false,
      wallet_send: false,
      work_credit_mutation: false,
      validator_mutation: false,
      transaction_broadcast: false,
      money_movement: false,
    },
  };

  if (!validateSessionV1(session)) {
    return { ok: false, reason: "participant_session_invalid" };
  }

  return {
    ok: true,
    session: Object.freeze({
      ...session,
      capabilities: Object.freeze({ ...session.capabilities }),
    }),
  };
}

function tokenHashMatchesV1(
  tokenValue: unknown,
  expectedSha256: string,
): boolean {
  const tokenBytes = decodeCanonicalBase64Url(
    tokenValue,
    SESSION_TOKEN_MIN_BYTES,
  );
  if (tokenBytes === null || !HEX64.test(expectedSha256)) return false;
  const actual = Buffer.from(sha256HexBytes(tokenBytes), "hex");
  const expected = Buffer.from(expectedSha256, "hex");
  return (
    actual.length === expected.length &&
    timingSafeEqual(actual, expected)
  );
}

function isAllowedRouteV1(
  value: unknown,
): value is (typeof VOID_PARTICIPANT_READONLY_ROUTES)[number] {
  return (
    value === VOID_PARTICIPANT_READONLY_ROUTES[0] ||
    value === VOID_PARTICIPANT_READONLY_ROUTES[1]
  );
}

export async function authorizeParticipantReadonlySessionV1(
  roleSource: Chain2050RoleAuthorityReadSourceV1,
  sessionValue: unknown,
  input: {
    bearer_token: string;
    origin: string;
    account_id: string;
    route: string;
    now: string;
  },
): Promise<ParticipantReadonlySessionAuthorizationResultV1> {
  if (!validateSessionV1(sessionValue)) {
    return { ok: false, reason: "participant_session_invalid" };
  }
  const session = sessionValue;

  if (
    !canonicalHttpsOrigin(input.origin) ||
    !canonicalIso(input.now) ||
    !ACCOUNT_ID.test(input.account_id) ||
    !isAllowedRouteV1(input.route)
  ) {
    return { ok: false, reason: "participant_session_request_invalid" };
  }
  if (session.origin !== input.origin) {
    return { ok: false, reason: "participant_session_origin_mismatch" };
  }
  if (session.account_id !== input.account_id) {
    return { ok: false, reason: "participant_session_account_mismatch" };
  }
  const nowMs = Date.parse(input.now);
  if (
    nowMs < Date.parse(session.issued_at) ||
    nowMs > Date.parse(session.expires_at)
  ) {
    return { ok: false, reason: "participant_session_expired_or_not_yet_valid" };
  }
  if (!tokenHashMatchesV1(input.bearer_token, session.token_sha256)) {
    return { ok: false, reason: "participant_session_token_mismatch" };
  }

  const roleRead = await readChain2050RoleAuthorityStateV1(
    roleSource,
    {
      identity_id: session.identity_id,
      expected_pair: {
        role_authority_generation: session.role_authority_generation,
        role_record_sha256: session.role_record_sha256,
      },
      require_active: true,
    },
  );
  if (roleRead.ok === false) {
    return {
      ok: false,
      reason: `participant_session_role_revalidation_failed:${roleRead.reason}`,
    };
  }
  if (roleRead.view.role !== VOID_PARTICIPANT_READONLY_REQUIRED_ROLE) {
    return { ok: false, reason: "participant_session_role_changed" };
  }
  if (
    roleRead.view.subject_binding_sha256 !==
    session.subject_binding_sha256
  ) {
    return { ok: false, reason: "participant_session_subject_binding_changed" };
  }

  return {
    ok: true,
    context: Object.freeze({
      identity_id: session.identity_id,
      account_id: session.account_id,
      route: input.route,
      role_authority_pair: Object.freeze({
        role_authority_generation:
          roleRead.view.role_authority_generation,
        role_record_sha256: roleRead.view.role_record_sha256,
      }),
    }),
  };
}
