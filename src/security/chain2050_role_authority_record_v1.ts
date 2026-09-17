// SPDX-License-Identifier: VCL-1.0
import { createHash } from "node:crypto";

export const VOID_CHAIN2050_ROLE_AUTHORITY_RECORD_V1_SCHEMA =
  "void.chain2050-role-authority-record.v1" as const;

export const VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID = 2050 as const;

export const VOID_CHAIN2050_ROLE_AUTHORITY_MAX_GENERATION =
  18446744073709551615n;

export type Chain2050RoleAuthorityStatusV1 = "active" | "revoked";

export type Chain2050RoleAuthorityTransitionV1 =
  | "genesis_grant"
  | "revoke"
  | "restore"
  | "subject_binding_change"
  | "policy_change"
  | "role_change";

export interface Chain2050RoleAuthorityRecordV1 {
  schema: typeof VOID_CHAIN2050_ROLE_AUTHORITY_RECORD_V1_SCHEMA;
  chain_id: typeof VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID;
  identity_id: string;
  role: string;
  authority_status: Chain2050RoleAuthorityStatusV1;
  role_authority_generation: string;
  subject_binding_sha256: string;
  authority_policy_sha256: string;
  predecessor_role_record_sha256: string | null;
  transition: Chain2050RoleAuthorityTransitionV1;
}

export interface Chain2050RoleAuthorityPairV1 {
  role_authority_generation: string;
  role_record_sha256: string;
}

export type Chain2050RoleAuthorityValidationV1 =
  | { ok: true; record: Chain2050RoleAuthorityRecordV1 }
  | { ok: false; reason: string };

export type Chain2050RoleAuthorityTransitionResultV1 =
  | {
      ok: true;
      kind: "genesis" | "idempotent_replay" | "transition";
      pair: Chain2050RoleAuthorityPairV1;
    }
  | { ok: false; reason: string };

const RECORD_KEYS = Object.freeze([
  "schema",
  "chain_id",
  "identity_id",
  "role",
  "authority_status",
  "role_authority_generation",
  "subject_binding_sha256",
  "authority_policy_sha256",
  "predecessor_role_record_sha256",
  "transition",
] as const);

const IDENTITY_ID = /^[a-z0-9][a-z0-9._:-]{2,191}$/;
const ROLE_ID = /^[A-Z][A-Z0-9_]{1,63}$/;
const HEX64 = /^[a-f0-9]{64}$/;
const UINT64_CANONICAL = /^(0|[1-9][0-9]{0,19})$/;

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, canonicalValue(record[key])]),
    );
  }
  return value;
}

export function canonicalChain2050RoleAuthorityJsonV1(
  value: unknown,
): string {
  return JSON.stringify(canonicalValue(value));
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function exactObjectKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return JSON.stringify(actual) === JSON.stringify(wanted);
}

export function parseChain2050RoleAuthorityGenerationV1(
  value: unknown,
): bigint | null {
  if (typeof value !== "string" || !UINT64_CANONICAL.test(value)) {
    return null;
  }
  let parsed: bigint;
  try {
    parsed = BigInt(value);
  } catch {
    return null;
  }
  if (
    parsed < 0n ||
    parsed > VOID_CHAIN2050_ROLE_AUTHORITY_MAX_GENERATION
  ) {
    return null;
  }
  return parsed;
}

function isTransitionV1(
  value: unknown,
): value is Chain2050RoleAuthorityTransitionV1 {
  return (
    value === "genesis_grant" ||
    value === "revoke" ||
    value === "restore" ||
    value === "subject_binding_change" ||
    value === "policy_change" ||
    value === "role_change"
  );
}

function isStatusV1(
  value: unknown,
): value is Chain2050RoleAuthorityStatusV1 {
  return value === "active" || value === "revoked";
}

export function validateChain2050RoleAuthorityRecordV1(
  value: unknown,
): Chain2050RoleAuthorityValidationV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, reason: "role_authority_record_must_be_object" };
  }

  const record = value as Record<string, unknown>;
  if (!exactObjectKeys(record, RECORD_KEYS)) {
    return { ok: false, reason: "role_authority_record_keys_mismatch" };
  }

  if (record.schema !== VOID_CHAIN2050_ROLE_AUTHORITY_RECORD_V1_SCHEMA) {
    return { ok: false, reason: "role_authority_schema_mismatch" };
  }
  if (record.chain_id !== VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID) {
    return { ok: false, reason: "role_authority_chain_id_mismatch" };
  }
  if (
    typeof record.identity_id !== "string" ||
    !IDENTITY_ID.test(record.identity_id)
  ) {
    return { ok: false, reason: "role_authority_identity_id_invalid" };
  }
  if (typeof record.role !== "string" || !ROLE_ID.test(record.role)) {
    return { ok: false, reason: "role_authority_role_invalid" };
  }
  if (!isStatusV1(record.authority_status)) {
    return { ok: false, reason: "role_authority_status_invalid" };
  }
  if (
    parseChain2050RoleAuthorityGenerationV1(
      record.role_authority_generation,
    ) === null
  ) {
    return { ok: false, reason: "role_authority_generation_invalid" };
  }
  if (
    typeof record.subject_binding_sha256 !== "string" ||
    !HEX64.test(record.subject_binding_sha256)
  ) {
    return { ok: false, reason: "role_authority_subject_binding_invalid" };
  }
  if (
    typeof record.authority_policy_sha256 !== "string" ||
    !HEX64.test(record.authority_policy_sha256)
  ) {
    return { ok: false, reason: "role_authority_policy_hash_invalid" };
  }
  if (
    record.predecessor_role_record_sha256 !== null &&
    (
      typeof record.predecessor_role_record_sha256 !== "string" ||
      !HEX64.test(record.predecessor_role_record_sha256)
    )
  ) {
    return { ok: false, reason: "role_authority_predecessor_hash_invalid" };
  }
  if (!isTransitionV1(record.transition)) {
    return { ok: false, reason: "role_authority_transition_invalid" };
  }

  return {
    ok: true,
    record: record as unknown as Chain2050RoleAuthorityRecordV1,
  };
}

export function computeChain2050RoleRecordSha256V1(
  value: unknown,
): string {
  const validated = validateChain2050RoleAuthorityRecordV1(value);
  if (validated.ok === false) {
    throw new Error(validated.reason);
  }
  return sha256Hex(
    canonicalChain2050RoleAuthorityJsonV1(validated.record),
  );
}

export function deriveChain2050RoleAuthorityPairV1(
  value: unknown,
): Chain2050RoleAuthorityPairV1 {
  const validated = validateChain2050RoleAuthorityRecordV1(value);
  if (validated.ok === false) {
    throw new Error(validated.reason);
  }
  return {
    role_authority_generation:
      validated.record.role_authority_generation,
    role_record_sha256:
      computeChain2050RoleRecordSha256V1(validated.record),
  };
}

function changed(
  previous: Chain2050RoleAuthorityRecordV1,
  next: Chain2050RoleAuthorityRecordV1,
  field:
    | "identity_id"
    | "role"
    | "authority_status"
    | "subject_binding_sha256"
    | "authority_policy_sha256",
): boolean {
  return previous[field] !== next[field];
}

function expectedTransitionV1(
  previous: Chain2050RoleAuthorityRecordV1,
  next: Chain2050RoleAuthorityRecordV1,
): Chain2050RoleAuthorityTransitionV1 | null {
  if (changed(previous, next, "identity_id")) {
    return null;
  }

  const roleChanged = changed(previous, next, "role");
  const statusChanged = changed(previous, next, "authority_status");
  const subjectChanged = changed(previous, next, "subject_binding_sha256");
  const policyChanged = changed(previous, next, "authority_policy_sha256");

  const changeCount = [
    roleChanged,
    statusChanged,
    subjectChanged,
    policyChanged,
  ].filter(Boolean).length;

  if (changeCount !== 1) {
    return null;
  }

  if (statusChanged) {
    if (
      previous.authority_status === "active" &&
      next.authority_status === "revoked"
    ) {
      return "revoke";
    }
    if (
      previous.authority_status === "revoked" &&
      next.authority_status === "active"
    ) {
      return "restore";
    }
    return null;
  }

  if (roleChanged) return "role_change";
  if (subjectChanged) return "subject_binding_change";
  if (policyChanged) return "policy_change";
  return null;
}

export function verifyChain2050RoleAuthorityGenesisV1(
  value: unknown,
): Chain2050RoleAuthorityTransitionResultV1 {
  const validated = validateChain2050RoleAuthorityRecordV1(value);
  if (validated.ok === false) return validated;

  const record = validated.record;
  if (record.role_authority_generation !== "0") {
    return { ok: false, reason: "role_authority_genesis_generation_must_be_zero" };
  }
  if (record.predecessor_role_record_sha256 !== null) {
    return { ok: false, reason: "role_authority_genesis_predecessor_must_be_null" };
  }
  if (record.transition !== "genesis_grant") {
    return { ok: false, reason: "role_authority_genesis_transition_required" };
  }
  if (record.authority_status !== "active") {
    return { ok: false, reason: "role_authority_genesis_must_be_active" };
  }

  return {
    ok: true,
    kind: "genesis",
    pair: deriveChain2050RoleAuthorityPairV1(record),
  };
}

export function verifyChain2050RoleAuthorityTransitionV1(
  previousValue: unknown,
  nextValue: unknown,
): Chain2050RoleAuthorityTransitionResultV1 {
  const previousValidation =
    validateChain2050RoleAuthorityRecordV1(previousValue);
  if (previousValidation.ok === false) {
    return {
      ok: false,
      reason: `previous_${previousValidation.reason}`,
    };
  }

  const nextValidation =
    validateChain2050RoleAuthorityRecordV1(nextValue);
  if (nextValidation.ok === false) {
    return {
      ok: false,
      reason: `next_${nextValidation.reason}`,
    };
  }

  const previous = previousValidation.record;
  const next = nextValidation.record;

  const previousPair = deriveChain2050RoleAuthorityPairV1(previous);
  const nextPair = deriveChain2050RoleAuthorityPairV1(next);

  const previousGeneration =
    parseChain2050RoleAuthorityGenerationV1(
      previous.role_authority_generation,
    );
  const nextGeneration =
    parseChain2050RoleAuthorityGenerationV1(
      next.role_authority_generation,
    );
  if (previousGeneration === null || nextGeneration === null) {
    return { ok: false, reason: "role_authority_generation_invalid" };
  }

  if (
    previousPair.role_authority_generation ===
      nextPair.role_authority_generation
  ) {
    if (
      previousPair.role_record_sha256 ===
      nextPair.role_record_sha256
    ) {
      return {
        ok: true,
        kind: "idempotent_replay",
        pair: previousPair,
      };
    }
    if (
      previousGeneration ===
      VOID_CHAIN2050_ROLE_AUTHORITY_MAX_GENERATION
    ) {
      return {
        ok: false,
        reason: "ROLE_GENERATION_EXHAUSTED",
      };
    }
    return {
      ok: false,
      reason: "role_authority_same_generation_different_hash",
    };
  }

  if (
    previousGeneration ===
    VOID_CHAIN2050_ROLE_AUTHORITY_MAX_GENERATION
  ) {
    return {
      ok: false,
      reason: "ROLE_GENERATION_EXHAUSTED",
    };
  }

  if (nextGeneration !== previousGeneration + 1n) {
    return {
      ok: false,
      reason: "role_authority_generation_must_increment_by_one",
    };
  }

  if (
    next.predecessor_role_record_sha256 !==
    previousPair.role_record_sha256
  ) {
    return {
      ok: false,
      reason: "role_authority_predecessor_hash_mismatch",
    };
  }

  if (next.transition === "genesis_grant") {
    return {
      ok: false,
      reason: "role_authority_genesis_transition_not_allowed_after_genesis",
    };
  }

  const expectedTransition = expectedTransitionV1(previous, next);
  if (expectedTransition === null) {
    return {
      ok: false,
      reason: "role_authority_transition_must_change_exactly_one_authority_field",
    };
  }
  if (next.transition !== expectedTransition) {
    return {
      ok: false,
      reason: "role_authority_transition_reason_mismatch",
    };
  }

  return {
    ok: true,
    kind: "transition",
    pair: nextPair,
  };
}

export function compareChain2050RoleAuthorityPairV1(
  expected: Chain2050RoleAuthorityPairV1,
  current: Chain2050RoleAuthorityPairV1,
): boolean {
  return (
    expected.role_authority_generation ===
      current.role_authority_generation &&
    expected.role_record_sha256 === current.role_record_sha256
  );
}
