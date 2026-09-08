import {
  createHash,
  createPublicKey,
  verify as verifySignature,
  type KeyObject,
} from "node:crypto";

import { getVoidAlignmentLayerSafeModePolicyV1 } from "./void_alignment_layer_v1.js";

export const VOID_SOVEREIGN_EMERGENCY_CERTIFICATE_MARKER_V1 =
  "VOID_SOVEREIGN_EMERGENCY_CONTROL_CERTIFICATE_V1" as const;
export const VOID_SOVEREIGN_EMERGENCY_STATE_MARKER_V1 =
  "VOID_SOVEREIGN_EMERGENCY_CONTROL_STATE_V1" as const;
export const VOID_SOVEREIGN_EMERGENCY_DOMAIN_V1 =
  "VOID_SOVEREIGN_EMERGENCY_CONTROL_V1" as const;
export const VOID_SOVEREIGN_EMERGENCY_VERSION_V1 = 1 as const;
export const VOID_SOVEREIGN_PRIMARY_GOVERNANCE_DER_SHA256_V1 =
  "23e2d92ebeb1d4b025eeb2a76f65b7f8ff6e6cc091f542e202569c9d5abbbd30" as const;
export const VOID_SOVEREIGN_PRIMARY_GOVERNANCE_ROLE_V1 =
  "SovereignPrimaryGovernanceAttestation" as const;
export const VOID_SOVEREIGN_EMERGENCY_MAX_TTL_SECONDS_V1 = 15 * 60;
export const VOID_MAINNET_CHAIN_ID_EMERGENCY_V1 = 2050 as const;

export type VoidSovereignEmergencyActionV1 = "PAUSE" | "RESUME";
export type VoidSovereignEmergencyReasonV1 =
  | "AL_CRITICAL_FAILURE"
  | "CANONICAL_SAFETY_INCIDENT"
  | "AUTHORITY_COMPROMISE"
  | "SOVEREIGN_DIRECTIVE"
  | "RECOVERY_COMPLETE";
export type VoidSovereignEmergencyModeV1 = "running" | "paused";

export interface VoidSovereignEmergencyCertificateV1 {
  marker: typeof VOID_SOVEREIGN_EMERGENCY_CERTIFICATE_MARKER_V1;
  version: typeof VOID_SOVEREIGN_EMERGENCY_VERSION_V1;
  domain: typeof VOID_SOVEREIGN_EMERGENCY_DOMAIN_V1;
  chain_id: typeof VOID_MAINNET_CHAIN_ID_EMERGENCY_V1;
  action: VoidSovereignEmergencyActionV1;
  sequence: string;
  issued_at_utc: string;
  expires_at_utc: string;
  observed_head_number: string;
  observed_head_hash_sha256: string;
  reason_code: VoidSovereignEmergencyReasonV1;
  evidence_sha256: string;
  previous_certificate_sha256: string;
  resume_of_pause_certificate_sha256: string;
  signer_role: typeof VOID_SOVEREIGN_PRIMARY_GOVERNANCE_ROLE_V1;
  signer_public_key_der_sha256: string;
  signature_base64: string;
}

export interface VoidSovereignEmergencyControlStateV1 {
  marker: typeof VOID_SOVEREIGN_EMERGENCY_STATE_MARKER_V1;
  version: typeof VOID_SOVEREIGN_EMERGENCY_VERSION_V1;
  chain_id: typeof VOID_MAINNET_CHAIN_ID_EMERGENCY_V1;
  mode: VoidSovereignEmergencyModeV1;
  last_sequence: string | null;
  last_certificate_sha256: string;
  active_pause_certificate_sha256: string;
}

export type VoidSovereignEmergencyAdmissionV1 =
  | {
      ok: true;
      code: "EMERGENCY_CONTROL_ACCEPTED";
      certificate_sha256: string;
      state: VoidSovereignEmergencyControlStateV1;
    }
  | {
      ok: false;
      code: string;
      certificate_sha256: string | null;
      state: VoidSovereignEmergencyControlStateV1 | null;
    };

export type VoidEd25519FingerprintVerificationV1 =
  | { ok: true; public_key_der_sha256: string }
  | { ok: false; code: string };

const HEX64_RE = /^[0-9a-f]{64}$/;
const BASE64_RE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const RFC3339_SECOND_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const UINT64_LIMIT = 1n << 64n;
const UINT64_MAX = UINT64_LIMIT - 1n;
const ZERO_SHA256 = "0".repeat(64);

const CERTIFICATE_KEYS = Object.freeze([
  "marker",
  "version",
  "domain",
  "chain_id",
  "action",
  "sequence",
  "issued_at_utc",
  "expires_at_utc",
  "observed_head_number",
  "observed_head_hash_sha256",
  "reason_code",
  "evidence_sha256",
  "previous_certificate_sha256",
  "resume_of_pause_certificate_sha256",
  "signer_role",
  "signer_public_key_der_sha256",
  "signature_base64",
]);

const STATE_KEYS = Object.freeze([
  "marker",
  "version",
  "chain_id",
  "mode",
  "last_sequence",
  "last_certificate_sha256",
  "active_pause_certificate_sha256",
]);

const PAUSE_REASONS = new Set<VoidSovereignEmergencyReasonV1>([
  "AL_CRITICAL_FAILURE",
  "CANONICAL_SAFETY_INCIDENT",
  "AUTHORITY_COMPROMISE",
  "SOVEREIGN_DIRECTIVE",
]);
const RESUME_REASONS = new Set<VoidSovereignEmergencyReasonV1>([
  "RECOVERY_COMPLETE",
  "SOVEREIGN_DIRECTIVE",
]);

function sha256Bytes(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

function isHex64(value: unknown): value is string {
  return typeof value === "string" && HEX64_RE.test(value);
}

function isCanonicalUint64(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^(?:0|[1-9][0-9]*)$/.test(value)
  ) {
    return false;
  }
  try {
    return BigInt(value) < UINT64_LIMIT;
  } catch {
    return false;
  }
}

function isCanonicalUtcSecond(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !RFC3339_SECOND_RE.test(value)
  ) {
    return false;
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) return false;
  return (
    new Date(milliseconds).toISOString().replace(".000Z", "Z") === value
  );
}

function decodeCanonicalBase64(value: unknown): Buffer | null {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    !BASE64_RE.test(value)
  ) {
    return null;
  }
  try {
    const decoded = Buffer.from(value, "base64");
    return decoded.toString("base64") === value ? decoded : null;
  } catch {
    return null;
  }
}

function fingerprintPublicKeyDer(publicKey: KeyObject): string | null {
  try {
    if (publicKey.asymmetricKeyType !== "ed25519") return null;
    const der = publicKey.export({ type: "spki", format: "der" });
    if (!Buffer.isBuffer(der)) return null;
    return sha256Bytes(der);
  } catch {
    return null;
  }
}

function normalizeState(
  raw: unknown,
): VoidSovereignEmergencyControlStateV1 | null {
  if (!isRecord(raw) || !hasExactKeys(raw, STATE_KEYS)) return null;

  const mode = raw.mode;
  const lastSequence = raw.last_sequence;
  const lastCertificateSha = raw.last_certificate_sha256;
  const activePauseSha = raw.active_pause_certificate_sha256;

  if (
    raw.marker !== VOID_SOVEREIGN_EMERGENCY_STATE_MARKER_V1 ||
    raw.version !== VOID_SOVEREIGN_EMERGENCY_VERSION_V1 ||
    raw.chain_id !== VOID_MAINNET_CHAIN_ID_EMERGENCY_V1 ||
    (mode !== "running" && mode !== "paused") ||
    !(lastSequence === null || isCanonicalUint64(lastSequence)) ||
    !isHex64(lastCertificateSha) ||
    !isHex64(activePauseSha)
  ) {
    return null;
  }

  if (lastSequence === null) {
    if (lastCertificateSha !== ZERO_SHA256) return null;
    if (activePauseSha !== ZERO_SHA256) return null;
  } else if (lastCertificateSha === ZERO_SHA256) {
    return null;
  }
  if (mode === "running" && activePauseSha !== ZERO_SHA256) return null;
  if (mode === "paused") {
    if (activePauseSha === ZERO_SHA256) return null;
    if (activePauseSha !== lastCertificateSha) return null;
  }

  const normalizedLastSequence: string | null =
    lastSequence === null ? null : String(lastSequence);

  return {
    marker: VOID_SOVEREIGN_EMERGENCY_STATE_MARKER_V1,
    version: VOID_SOVEREIGN_EMERGENCY_VERSION_V1,
    chain_id: VOID_MAINNET_CHAIN_ID_EMERGENCY_V1,
    mode,
    last_sequence: normalizedLastSequence,
    last_certificate_sha256: lastCertificateSha,
    active_pause_certificate_sha256: activePauseSha,
  };
}

function normalizeCertificate(
  raw: unknown,
): VoidSovereignEmergencyCertificateV1 | null {
  if (!isRecord(raw) || !hasExactKeys(raw, CERTIFICATE_KEYS)) return null;

  const signature = decodeCanonicalBase64(raw.signature_base64);
  if (
    raw.marker !== VOID_SOVEREIGN_EMERGENCY_CERTIFICATE_MARKER_V1 ||
    raw.version !== VOID_SOVEREIGN_EMERGENCY_VERSION_V1 ||
    raw.domain !== VOID_SOVEREIGN_EMERGENCY_DOMAIN_V1 ||
    raw.chain_id !== VOID_MAINNET_CHAIN_ID_EMERGENCY_V1 ||
    (raw.action !== "PAUSE" && raw.action !== "RESUME") ||
    !isCanonicalUint64(raw.sequence) ||
    !isCanonicalUtcSecond(raw.issued_at_utc) ||
    !isCanonicalUtcSecond(raw.expires_at_utc) ||
    !isCanonicalUint64(raw.observed_head_number) ||
    !isHex64(raw.observed_head_hash_sha256) ||
    raw.observed_head_hash_sha256 === ZERO_SHA256 ||
    typeof raw.reason_code !== "string" ||
    !isHex64(raw.evidence_sha256) ||
    raw.evidence_sha256 === ZERO_SHA256 ||
    !isHex64(raw.previous_certificate_sha256) ||
    !isHex64(raw.resume_of_pause_certificate_sha256) ||
    raw.signer_role !== VOID_SOVEREIGN_PRIMARY_GOVERNANCE_ROLE_V1 ||
    !isHex64(raw.signer_public_key_der_sha256) ||
    !signature ||
    signature.length !== 64
  ) {
    return null;
  }

  if (
    !PAUSE_REASONS.has(
      raw.reason_code as VoidSovereignEmergencyReasonV1,
    ) &&
    !RESUME_REASONS.has(
      raw.reason_code as VoidSovereignEmergencyReasonV1,
    )
  ) {
    return null;
  }

  return raw as unknown as VoidSovereignEmergencyCertificateV1;
}

export function initialVoidSovereignEmergencyControlStateV1(): VoidSovereignEmergencyControlStateV1 {
  return {
    marker: VOID_SOVEREIGN_EMERGENCY_STATE_MARKER_V1,
    version: VOID_SOVEREIGN_EMERGENCY_VERSION_V1,
    chain_id: VOID_MAINNET_CHAIN_ID_EMERGENCY_V1,
    mode: "running",
    last_sequence: null,
    last_certificate_sha256: ZERO_SHA256,
    active_pause_certificate_sha256: ZERO_SHA256,
  };
}

export function canonicalVoidSovereignEmergencyPayloadV1(
  certificate: VoidSovereignEmergencyCertificateV1,
): Buffer {
  return Buffer.from(
    JSON.stringify([
      certificate.marker,
      certificate.version,
      certificate.domain,
      certificate.chain_id,
      certificate.action,
      certificate.sequence,
      certificate.issued_at_utc,
      certificate.expires_at_utc,
      certificate.observed_head_number,
      certificate.observed_head_hash_sha256,
      certificate.reason_code,
      certificate.evidence_sha256,
      certificate.previous_certificate_sha256,
      certificate.resume_of_pause_certificate_sha256,
      certificate.signer_role,
      certificate.signer_public_key_der_sha256,
    ]),
    "utf8",
  );
}

export function hashVoidSovereignEmergencyCertificateV1(
  certificate: VoidSovereignEmergencyCertificateV1,
): string {
  return sha256Bytes(
    Buffer.from(
      JSON.stringify([
        sha256Bytes(canonicalVoidSovereignEmergencyPayloadV1(certificate)),
        certificate.signature_base64,
      ]),
      "utf8",
    ),
  );
}

export function verifyVoidEd25519SignatureAgainstFingerprintV1(
  publicKeyPem: string | Buffer,
  expectedDerSha256: string,
  payload: Buffer,
  signatureBase64: string,
): VoidEd25519FingerprintVerificationV1 {
  if (!HEX64_RE.test(expectedDerSha256)) {
    return { ok: false, code: "EXPECTED_SIGNER_FINGERPRINT_INVALID" };
  }

  const signature = decodeCanonicalBase64(signatureBase64);
  if (!signature || signature.length !== 64) {
    return { ok: false, code: "SIGNATURE_ENCODING_INVALID" };
  }

  let publicKey: KeyObject;
  try {
    publicKey = createPublicKey(publicKeyPem);
  } catch {
    return { ok: false, code: "PUBLIC_KEY_INVALID" };
  }

  const actualFingerprint = fingerprintPublicKeyDer(publicKey);
  if (!actualFingerprint) {
    return { ok: false, code: "PUBLIC_KEY_NOT_ED25519" };
  }
  if (actualFingerprint !== expectedDerSha256) {
    return { ok: false, code: "SIGNER_FINGERPRINT_MISMATCH" };
  }

  try {
    if (!verifySignature(null, payload, publicKey, signature)) {
      return { ok: false, code: "SIGNATURE_INVALID" };
    }
  } catch {
    return { ok: false, code: "SIGNATURE_INVALID" };
  }

  return {
    ok: true,
    public_key_der_sha256: actualFingerprint,
  };
}

export function admitVoidSovereignEmergencyCertificateAgainstFingerprintV1(args: {
  state: unknown;
  certificate: unknown;
  public_key_pem: string | Buffer;
  expected_signer_der_sha256: string;
  now_utc: string;
}): VoidSovereignEmergencyAdmissionV1 {
  const state = normalizeState(args.state);
  if (!state) {
    return {
      ok: false,
      code: "EMERGENCY_STATE_INVALID",
      certificate_sha256: null,
      state: null,
    };
  }

  if (!HEX64_RE.test(args.expected_signer_der_sha256)) {
    return {
      ok: false,
      code: "EXPECTED_SIGNER_FINGERPRINT_INVALID",
      certificate_sha256: null,
      state,
    };
  }

  const certificate = normalizeCertificate(args.certificate);
  if (!certificate) {
    return {
      ok: false,
      code: "EMERGENCY_CERTIFICATE_INVALID",
      certificate_sha256: null,
      state,
    };
  }

  const certificateSha = hashVoidSovereignEmergencyCertificateV1(certificate);
  if (!isCanonicalUtcSecond(args.now_utc)) {
    return {
      ok: false,
      code: "EMERGENCY_NOW_INVALID",
      certificate_sha256: certificateSha,
      state,
    };
  }
  if (
    certificate.signer_public_key_der_sha256 !==
    args.expected_signer_der_sha256
  ) {
    return {
      ok: false,
      code: "SIGNER_FINGERPRINT_MISMATCH",
      certificate_sha256: certificateSha,
      state,
    };
  }

  const issuedMs = Date.parse(certificate.issued_at_utc);
  const expiresMs = Date.parse(certificate.expires_at_utc);
  const nowMs = Date.parse(args.now_utc);
  if (!(issuedMs <= nowMs && nowMs < expiresMs)) {
    return {
      ok: false,
      code: "EMERGENCY_CERTIFICATE_NOT_CURRENT",
      certificate_sha256: certificateSha,
      state,
    };
  }
  if (
    expiresMs - issuedMs >
    VOID_SOVEREIGN_EMERGENCY_MAX_TTL_SECONDS_V1 * 1000
  ) {
    return {
      ok: false,
      code: "EMERGENCY_CERTIFICATE_TTL_TOO_LONG",
      certificate_sha256: certificateSha,
      state,
    };
  }

  if (
    state.last_sequence !== null &&
    BigInt(state.last_sequence) === UINT64_MAX
  ) {
    return {
      ok: false,
      code: "EMERGENCY_SEQUENCE_EXHAUSTED",
      certificate_sha256: certificateSha,
      state,
    };
  }

  const expectedSequence =
    state.last_sequence === null
      ? 0n
      : BigInt(state.last_sequence) + 1n;
  if (BigInt(certificate.sequence) !== expectedSequence) {
    return {
      ok: false,
      code: "EMERGENCY_SEQUENCE_MISMATCH",
      certificate_sha256: certificateSha,
      state,
    };
  }
  if (
    certificate.previous_certificate_sha256 !==
    state.last_certificate_sha256
  ) {
    return {
      ok: false,
      code: "EMERGENCY_PREDECESSOR_MISMATCH",
      certificate_sha256: certificateSha,
      state,
    };
  }

  const signatureResult = verifyVoidEd25519SignatureAgainstFingerprintV1(
    args.public_key_pem,
    args.expected_signer_der_sha256,
    canonicalVoidSovereignEmergencyPayloadV1(certificate),
    certificate.signature_base64,
  );
  if ("code" in signatureResult) {
    return {
      ok: false,
      code: signatureResult.code,
      certificate_sha256: certificateSha,
      state,
    };
  }

  if (certificate.action === "PAUSE") {
    if (!PAUSE_REASONS.has(certificate.reason_code)) {
      return {
        ok: false,
        code: "EMERGENCY_PAUSE_REASON_INVALID",
        certificate_sha256: certificateSha,
        state,
      };
    }
    if (state.mode !== "running") {
      return {
        ok: false,
        code: "EMERGENCY_ALREADY_PAUSED",
        certificate_sha256: certificateSha,
        state,
      };
    }
    if (certificate.resume_of_pause_certificate_sha256 !== ZERO_SHA256) {
      return {
        ok: false,
        code: "EMERGENCY_PAUSE_RESUME_REFERENCE_INVALID",
        certificate_sha256: certificateSha,
        state,
      };
    }

    return {
      ok: true,
      code: "EMERGENCY_CONTROL_ACCEPTED",
      certificate_sha256: certificateSha,
      state: {
        marker: VOID_SOVEREIGN_EMERGENCY_STATE_MARKER_V1,
        version: VOID_SOVEREIGN_EMERGENCY_VERSION_V1,
        chain_id: VOID_MAINNET_CHAIN_ID_EMERGENCY_V1,
        mode: "paused",
        last_sequence: certificate.sequence,
        last_certificate_sha256: certificateSha,
        active_pause_certificate_sha256: certificateSha,
      },
    };
  }

  if (!RESUME_REASONS.has(certificate.reason_code)) {
    return {
      ok: false,
      code: "EMERGENCY_RESUME_REASON_INVALID",
      certificate_sha256: certificateSha,
      state,
    };
  }
  if (state.mode !== "paused") {
    return {
      ok: false,
      code: "EMERGENCY_NOT_PAUSED",
      certificate_sha256: certificateSha,
      state,
    };
  }
  if (
    certificate.resume_of_pause_certificate_sha256 !==
    state.active_pause_certificate_sha256
  ) {
    return {
      ok: false,
      code: "EMERGENCY_RESUME_REFERENCE_MISMATCH",
      certificate_sha256: certificateSha,
      state,
    };
  }

  return {
    ok: true,
    code: "EMERGENCY_CONTROL_ACCEPTED",
    certificate_sha256: certificateSha,
    state: {
      marker: VOID_SOVEREIGN_EMERGENCY_STATE_MARKER_V1,
      version: VOID_SOVEREIGN_EMERGENCY_VERSION_V1,
      chain_id: VOID_MAINNET_CHAIN_ID_EMERGENCY_V1,
      mode: "running",
      last_sequence: certificate.sequence,
      last_certificate_sha256: certificateSha,
      active_pause_certificate_sha256: ZERO_SHA256,
    },
  };
}

export function admitVoidSovereignEmergencyCertificateV1(args: {
  state: unknown;
  certificate: unknown;
  public_key_pem: string | Buffer;
  now_utc: string;
}): VoidSovereignEmergencyAdmissionV1 {
  return admitVoidSovereignEmergencyCertificateAgainstFingerprintV1({
    ...args,
    expected_signer_der_sha256:
      VOID_SOVEREIGN_PRIMARY_GOVERNANCE_DER_SHA256_V1,
  });
}

export function getVoidSovereignEmergencyPausedPolicyV1() {
  return {
    trigger: "sovereign_emergency_pause" as const,
    ...getVoidAlignmentLayerSafeModePolicyV1(),
  };
}
