// SPDX-License-Identifier: VCL-1.0
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
  deriveChain2050RoleAuthorityPairV1,
  parseChain2050RoleAuthorityGenerationV1,
  validateChain2050RoleAuthorityRecordV1,
  type Chain2050RoleAuthorityPairV1,
  type Chain2050RoleAuthorityRecordV1,
} from "./chain2050_role_authority_record_v1.js";

export const VOID_CHAIN2050_ROLE_AUTHORITY_READ_ADAPTER_V1_SCHEMA =
  "void.chain2050-role-authority-read-adapter.v1" as const;

export const VOID_CHAIN2050_ROLE_AUTHORITY_READ_SOURCE_KIND_V1 =
  "canonical_chain2050_role_authority" as const;

export interface Chain2050RoleAuthorityReadSourceV1 {
  readonly chain_id: typeof VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID;
  readonly source_kind: typeof VOID_CHAIN2050_ROLE_AUTHORITY_READ_SOURCE_KIND_V1;
  readCurrentRoleAuthorityRecordV1(
    identityId: string,
  ): unknown | Promise<unknown>;
}

export interface Chain2050RoleAuthorityReadRequestV1 {
  identity_id: string;
  expected_pair: Chain2050RoleAuthorityPairV1 | null;
  require_active: boolean;
}

export interface Chain2050RoleAuthorityReadViewV1 {
  schema: typeof VOID_CHAIN2050_ROLE_AUTHORITY_READ_ADAPTER_V1_SCHEMA;
  chain_id: typeof VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID;
  identity_id: string;
  role: string;
  authority_status: "active" | "revoked";
  role_authority_generation: string;
  role_record_sha256: string;
  subject_binding_sha256: string;
  authority_policy_sha256: string;
  predecessor_role_record_sha256: string | null;
  transition: Chain2050RoleAuthorityRecordV1["transition"];
}

export type Chain2050RoleAuthorityReadResultV1 =
  | { ok: true; view: Readonly<Chain2050RoleAuthorityReadViewV1> }
  | { ok: false; reason: string };

const IDENTITY_ID = /^[a-z0-9][a-z0-9._:-]{2,191}$/;
const HEX64 = /^[a-f0-9]{64}$/;
const REQUEST_KEYS = Object.freeze([
  "expected_pair",
  "identity_id",
  "require_active",
] as const);
const PAIR_KEYS = Object.freeze([
  "role_authority_generation",
  "role_record_sha256",
] as const);

function exactObjectKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return JSON.stringify(actual) === JSON.stringify(wanted);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateExpectedPairV1(
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

function validateRequestV1(
  value: unknown,
): value is Chain2050RoleAuthorityReadRequestV1 {
  if (!isRecord(value) || !exactObjectKeys(value, REQUEST_KEYS)) return false;
  if (typeof value.identity_id !== "string" || !IDENTITY_ID.test(value.identity_id)) {
    return false;
  }
  if (typeof value.require_active !== "boolean") return false;
  return value.expected_pair === null || validateExpectedPairV1(value.expected_pair);
}

function validateSourceV1(
  value: unknown,
): value is Chain2050RoleAuthorityReadSourceV1 {
  if (!isRecord(value)) return false;
  return (
    value.chain_id === VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID &&
    value.source_kind === VOID_CHAIN2050_ROLE_AUTHORITY_READ_SOURCE_KIND_V1 &&
    typeof value.readCurrentRoleAuthorityRecordV1 === "function"
  );
}

function freezeViewV1(
  record: Chain2050RoleAuthorityRecordV1,
  pair: Chain2050RoleAuthorityPairV1,
): Readonly<Chain2050RoleAuthorityReadViewV1> {
  return Object.freeze({
    schema: VOID_CHAIN2050_ROLE_AUTHORITY_READ_ADAPTER_V1_SCHEMA,
    chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
    identity_id: record.identity_id,
    role: record.role,
    authority_status: record.authority_status,
    role_authority_generation: pair.role_authority_generation,
    role_record_sha256: pair.role_record_sha256,
    subject_binding_sha256: record.subject_binding_sha256,
    authority_policy_sha256: record.authority_policy_sha256,
    predecessor_role_record_sha256: record.predecessor_role_record_sha256,
    transition: record.transition,
  });
}

export async function readChain2050RoleAuthorityStateV1(
  sourceValue: unknown,
  requestValue: unknown,
): Promise<Chain2050RoleAuthorityReadResultV1> {
  if (!validateSourceV1(sourceValue)) {
    return { ok: false, reason: "role_authority_read_source_invalid" };
  }
  if (!validateRequestV1(requestValue)) {
    return { ok: false, reason: "role_authority_read_request_invalid" };
  }

  const source = sourceValue;
  const request = requestValue;

  let raw: unknown;
  try {
    raw = await source.readCurrentRoleAuthorityRecordV1(request.identity_id);
  } catch {
    return { ok: false, reason: "role_authority_source_read_failed" };
  }

  if (raw === null) {
    return { ok: false, reason: "role_authority_record_not_found" };
  }

  let isolated: unknown;
  try {
    isolated = structuredClone(raw);
  } catch {
    return { ok: false, reason: "role_authority_record_not_cloneable" };
  }

  const validated = validateChain2050RoleAuthorityRecordV1(isolated);
  if (validated.ok === false) {
    return {
      ok: false,
      reason: `role_authority_record_invalid:${validated.reason}`,
    };
  }

  const record = validated.record;
  if (record.identity_id !== request.identity_id) {
    return { ok: false, reason: "role_authority_identity_mismatch" };
  }

  const pair = deriveChain2050RoleAuthorityPairV1(record);
  if (request.expected_pair !== null) {
    if (
      pair.role_authority_generation !==
      request.expected_pair.role_authority_generation
    ) {
      return { ok: false, reason: "role_authority_generation_mismatch" };
    }
    if (pair.role_record_sha256 !== request.expected_pair.role_record_sha256) {
      return { ok: false, reason: "role_authority_record_hash_mismatch" };
    }
  }

  if (request.require_active && record.authority_status !== "active") {
    return { ok: false, reason: "role_authority_revoked" };
  }

  return {
    ok: true,
    view: freezeViewV1(record, pair),
  };
}
