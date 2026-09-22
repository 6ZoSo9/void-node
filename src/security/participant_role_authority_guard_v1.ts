// SPDX-License-Identifier: VCL-1.0
import { createHash } from "node:crypto";

import {
  VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
  canonicalChain2050RoleAuthorityJsonV1,
} from "./chain2050_role_authority_record_v1.js";
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_READ_SOURCE_KIND_V1,
  readChain2050RoleAuthorityStateV1,
  type Chain2050RoleAuthorityReadSourceV1,
} from "./chain2050_role_authority_read_adapter_v1.js";

export const VOID_PARTICIPANT_ROLE_SUBJECT_BINDING_V1_SCHEMA =
  "void.participant-subject-binding.v1" as const;
export const VOID_PARTICIPANT_ROLE_AUTHORITY_ADMISSION_V1_SCHEMA =
  "void.participant-role-authority-admission.v1" as const;
export const VOID_PARTICIPANT_ROLE_AUTHORITY_REQUIRED_ROLE =
  "AGENT" as const;

export interface ParticipantRolePublicJwkV1 {
  kty: "OKP";
  crv: "Ed25519";
  x: string;
}

export interface ParticipantRoleSubjectV1 {
  identity_id: string;
  account_id: string;
  public_key_jwk: ParticipantRolePublicJwkV1;
}

export interface ParticipantRoleAuthorityAdmissionV1 {
  schema: typeof VOID_PARTICIPANT_ROLE_AUTHORITY_ADMISSION_V1_SCHEMA;
  chain_id: typeof VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID;
  identity_id: string;
  account_id: string;
  role: typeof VOID_PARTICIPANT_ROLE_AUTHORITY_REQUIRED_ROLE;
  subject_binding_sha256: string;
  authority_policy_sha256: string;
  role_authority_generation: string;
  role_record_sha256: string;
  role_registry_binding_descriptor_sha256: string;
}

export type ParticipantRoleAuthorityAdmissionResultV1 =
  | {
      ok: true;
      admission: Readonly<ParticipantRoleAuthorityAdmissionV1>;
    }
  | { ok: false; reason: string };

export type ParticipantRoleAuthorityRevalidationResultV1 =
  | {
      ok: true;
      context: Readonly<{
        identity_id: string;
        account_id: string;
        role: typeof VOID_PARTICIPANT_ROLE_AUTHORITY_REQUIRED_ROLE;
        subject_binding_sha256: string;
        role_authority_generation: string;
        role_record_sha256: string;
      }>;
    }
  | { ok: false; reason: string };

type BoundRoleSourceV1 = Chain2050RoleAuthorityReadSourceV1 & {
  readonly binding_descriptor_sha256: string;
};

const IDENTITY_ID = /^[a-z0-9][a-z0-9._:-]{2,191}$/;
const ACCOUNT_ID = /^[A-Za-z0-9._:-]{1,128}$/;
const HEX64 = /^[a-f0-9]{64}$/;
const BASE64URL_32 = /^[A-Za-z0-9_-]{43}$/;
const SUBJECT_KEYS = Object.freeze([
  "account_id",
  "identity_id",
  "public_key_jwk",
] as const);
const JWK_KEYS = Object.freeze(["crv", "kty", "x"] as const);
const ADMISSION_KEYS = Object.freeze([
  "account_id",
  "authority_policy_sha256",
  "chain_id",
  "identity_id",
  "role",
  "role_authority_generation",
  "role_record_sha256",
  "role_registry_binding_descriptor_sha256",
  "schema",
  "subject_binding_sha256",
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

function canonicalEd25519JwkV1(
  value: unknown,
): ParticipantRolePublicJwkV1 | null {
  if (!isRecord(value) || !exactObjectKeys(value, JWK_KEYS)) return null;
  if (value.kty !== "OKP" || value.crv !== "Ed25519") return null;
  if (typeof value.x !== "string" || !BASE64URL_32.test(value.x)) {
    return null;
  }
  let decoded: Buffer;
  try {
    decoded = Buffer.from(value.x, "base64url");
  } catch {
    return null;
  }
  if (
    decoded.length !== 32 ||
    decoded.toString("base64url") !== value.x
  ) {
    return null;
  }
  return Object.freeze({
    kty: "OKP",
    crv: "Ed25519",
    x: value.x,
  });
}

function canonicalSubjectV1(
  value: unknown,
): Readonly<ParticipantRoleSubjectV1> | null {
  if (!isRecord(value) || !exactObjectKeys(value, SUBJECT_KEYS)) return null;
  if (
    typeof value.identity_id !== "string" ||
    !IDENTITY_ID.test(value.identity_id) ||
    typeof value.account_id !== "string" ||
    !ACCOUNT_ID.test(value.account_id)
  ) {
    return null;
  }
  const jwk = canonicalEd25519JwkV1(value.public_key_jwk);
  if (jwk === null) return null;
  return Object.freeze({
    identity_id: value.identity_id,
    account_id: value.account_id,
    public_key_jwk: jwk,
  });
}

function sha256HexUtf8(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function computeParticipantRoleSubjectBindingSha256V1(
  subjectValue: unknown,
): string | null {
  const subject = canonicalSubjectV1(subjectValue);
  if (subject === null) return null;
  return sha256HexUtf8(
    canonicalChain2050RoleAuthorityJsonV1({
      schema: VOID_PARTICIPANT_ROLE_SUBJECT_BINDING_V1_SCHEMA,
      chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
      identity_id: subject.identity_id,
      account_id: subject.account_id,
      public_key_jwk: subject.public_key_jwk,
    }),
  );
}

function validateExpectedDescriptorShaV1(value: unknown): value is string {
  return typeof value === "string" && HEX64.test(value);
}

function validateBoundRoleSourceV1(
  value: unknown,
  expectedDescriptorSha256: string,
): value is BoundRoleSourceV1 {
  if (!isRecord(value)) return false;
  return (
    value.chain_id === VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID &&
    value.source_kind ===
      VOID_CHAIN2050_ROLE_AUTHORITY_READ_SOURCE_KIND_V1 &&
    value.binding_descriptor_sha256 === expectedDescriptorSha256 &&
    typeof value.readCurrentRoleAuthorityRecordV1 === "function"
  );
}

function validateAdmissionV1(
  value: unknown,
): value is ParticipantRoleAuthorityAdmissionV1 {
  if (!isRecord(value) || !exactObjectKeys(value, ADMISSION_KEYS)) {
    return false;
  }
  return (
    value.schema ===
      VOID_PARTICIPANT_ROLE_AUTHORITY_ADMISSION_V1_SCHEMA &&
    value.chain_id === VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID &&
    typeof value.identity_id === "string" &&
    IDENTITY_ID.test(value.identity_id) &&
    typeof value.account_id === "string" &&
    ACCOUNT_ID.test(value.account_id) &&
    value.role === VOID_PARTICIPANT_ROLE_AUTHORITY_REQUIRED_ROLE &&
    typeof value.subject_binding_sha256 === "string" &&
    HEX64.test(value.subject_binding_sha256) &&
    typeof value.authority_policy_sha256 === "string" &&
    HEX64.test(value.authority_policy_sha256) &&
    typeof value.role_authority_generation === "string" &&
    /^(0|[1-9][0-9]{0,19})$/.test(value.role_authority_generation) &&
    typeof value.role_record_sha256 === "string" &&
    HEX64.test(value.role_record_sha256) &&
    typeof value.role_registry_binding_descriptor_sha256 === "string" &&
    HEX64.test(value.role_registry_binding_descriptor_sha256)
  );
}

export async function admitParticipantRoleAuthorityV1(
  roleSourceValue: unknown,
  expectedBindingDescriptorSha256Value: unknown,
  subjectValue: unknown,
): Promise<ParticipantRoleAuthorityAdmissionResultV1> {
  if (!validateExpectedDescriptorShaV1(expectedBindingDescriptorSha256Value)) {
    return {
      ok: false,
      reason: "participant_role_binding_descriptor_invalid",
    };
  }
  const expectedDescriptorSha256 = expectedBindingDescriptorSha256Value;
  if (!validateBoundRoleSourceV1(roleSourceValue, expectedDescriptorSha256)) {
    return {
      ok: false,
      reason: "participant_role_source_binding_invalid",
    };
  }
  const subject = canonicalSubjectV1(subjectValue);
  const subjectBindingSha256 =
    computeParticipantRoleSubjectBindingSha256V1(subjectValue);
  if (subject === null || subjectBindingSha256 === null) {
    return { ok: false, reason: "participant_role_subject_invalid" };
  }

  const roleRead = await readChain2050RoleAuthorityStateV1(
    roleSourceValue,
    {
      identity_id: subject.identity_id,
      expected_pair: null,
      require_active: true,
    },
  );
  if (roleRead.ok === false) {
    return {
      ok: false,
      reason:
        "participant_role_authority_rejected:" + roleRead.reason,
    };
  }
  if (roleRead.view.role !== VOID_PARTICIPANT_ROLE_AUTHORITY_REQUIRED_ROLE) {
    return { ok: false, reason: "participant_role_not_agent" };
  }
  if (roleRead.view.subject_binding_sha256 !== subjectBindingSha256) {
    return {
      ok: false,
      reason: "participant_role_subject_binding_mismatch",
    };
  }

  return {
    ok: true,
    admission: Object.freeze({
      schema: VOID_PARTICIPANT_ROLE_AUTHORITY_ADMISSION_V1_SCHEMA,
      chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
      identity_id: subject.identity_id,
      account_id: subject.account_id,
      role: VOID_PARTICIPANT_ROLE_AUTHORITY_REQUIRED_ROLE,
      subject_binding_sha256: subjectBindingSha256,
      authority_policy_sha256: roleRead.view.authority_policy_sha256,
      role_authority_generation: roleRead.view.role_authority_generation,
      role_record_sha256: roleRead.view.role_record_sha256,
      role_registry_binding_descriptor_sha256:
        expectedDescriptorSha256,
    }),
  };
}

export async function revalidateParticipantRoleAuthorityV1(
  roleSourceValue: unknown,
  expectedBindingDescriptorSha256Value: unknown,
  admissionValue: unknown,
  subjectValue: unknown,
): Promise<ParticipantRoleAuthorityRevalidationResultV1> {
  if (!validateAdmissionV1(admissionValue)) {
    return { ok: false, reason: "participant_role_admission_invalid" };
  }
  if (!validateExpectedDescriptorShaV1(expectedBindingDescriptorSha256Value)) {
    return {
      ok: false,
      reason: "participant_role_binding_descriptor_invalid",
    };
  }
  const expectedDescriptorSha256 = expectedBindingDescriptorSha256Value;
  const admission = admissionValue;
  if (
    admission.role_registry_binding_descriptor_sha256 !==
    expectedDescriptorSha256
  ) {
    return {
      ok: false,
      reason: "participant_role_binding_descriptor_changed",
    };
  }
  if (!validateBoundRoleSourceV1(roleSourceValue, expectedDescriptorSha256)) {
    return {
      ok: false,
      reason: "participant_role_source_binding_invalid",
    };
  }

  const subject = canonicalSubjectV1(subjectValue);
  const subjectBindingSha256 =
    computeParticipantRoleSubjectBindingSha256V1(subjectValue);
  if (subject === null || subjectBindingSha256 === null) {
    return { ok: false, reason: "participant_role_subject_invalid" };
  }
  if (
    subject.identity_id !== admission.identity_id ||
    subject.account_id !== admission.account_id ||
    subjectBindingSha256 !== admission.subject_binding_sha256
  ) {
    return { ok: false, reason: "participant_role_subject_changed" };
  }

  const roleRead = await readChain2050RoleAuthorityStateV1(
    roleSourceValue,
    {
      identity_id: admission.identity_id,
      expected_pair: null,
      require_active: true,
    },
  );
  if (roleRead.ok === false) {
    return {
      ok: false,
      reason:
        "participant_role_revalidation_failed:" + roleRead.reason,
    };
  }
  if (roleRead.view.role !== VOID_PARTICIPANT_ROLE_AUTHORITY_REQUIRED_ROLE) {
    return { ok: false, reason: "participant_role_changed" };
  }
  if (
    roleRead.view.subject_binding_sha256 !==
    admission.subject_binding_sha256
  ) {
    return {
      ok: false,
      reason: "participant_role_subject_binding_changed",
    };
  }
  if (
    roleRead.view.authority_policy_sha256 !==
    admission.authority_policy_sha256
  ) {
    return { ok: false, reason: "participant_role_policy_changed" };
  }
  if (
    roleRead.view.role_authority_generation !==
    admission.role_authority_generation
  ) {
    return { ok: false, reason: "participant_role_generation_changed" };
  }
  if (roleRead.view.role_record_sha256 !== admission.role_record_sha256) {
    return { ok: false, reason: "participant_role_record_hash_changed" };
  }

  return {
    ok: true,
    context: Object.freeze({
      identity_id: admission.identity_id,
      account_id: admission.account_id,
      role: VOID_PARTICIPANT_ROLE_AUTHORITY_REQUIRED_ROLE,
      subject_binding_sha256: admission.subject_binding_sha256,
      role_authority_generation: roleRead.view.role_authority_generation,
      role_record_sha256: roleRead.view.role_record_sha256,
    }),
  };
}
