// SPDX-License-Identifier: VCL-1.0
import { createHash } from "node:crypto";

import {
  VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
  VOID_CHAIN2050_ROLE_AUTHORITY_MAX_GENERATION,
  canonicalChain2050RoleAuthorityJsonV1,
  deriveChain2050RoleAuthorityPairV1,
  validateChain2050RoleAuthorityRecordV1,
  verifyChain2050RoleAuthorityGenesisV1,
  verifyChain2050RoleAuthorityTransitionV1,
  type Chain2050RoleAuthorityPairV1,
  type Chain2050RoleAuthorityRecordV1,
} from "./chain2050_role_authority_record_v1.js";

export const VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_V1_SCHEMA =
  "void.chain2050-role-authority-registry.v1" as const;
export const VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_ENTRY_V1_SCHEMA =
  "void.chain2050-role-authority-registry-entry.v1" as const;
export const VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_ROOT_DOMAIN_V1 =
  "void.chain2050-role-authority-registry-root.v1" as const;

export interface Chain2050RoleAuthorityRegistryEntryV1 {
  schema: typeof VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_ENTRY_V1_SCHEMA;
  entry_index: string;
  previous_registry_root_sha256: string;
  role_record_sha256: string;
  registry_root_sha256: string;
  record: Chain2050RoleAuthorityRecordV1;
}

export interface Chain2050RoleAuthorityRegistryV1 {
  schema: typeof VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_V1_SCHEMA;
  chain_id: typeof VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID;
  entry_count: string;
  registry_root_sha256: string;
  entries: readonly Readonly<Chain2050RoleAuthorityRegistryEntryV1>[];
}

export type Chain2050RoleAuthorityRegistryValidationV1 =
  | { ok: true; state: Readonly<Chain2050RoleAuthorityRegistryV1> }
  | { ok: false; reason: string };

export type Chain2050RoleAuthorityRegistryAppendResultV1 =
  | {
      ok: true;
      kind: "genesis" | "transition" | "idempotent_replay";
      pair: Chain2050RoleAuthorityPairV1;
      state: Readonly<Chain2050RoleAuthorityRegistryV1>;
    }
  | { ok: false; reason: string };

export type Chain2050RoleAuthorityRegistryReadResultV1 =
  | { ok: true; record: Readonly<Chain2050RoleAuthorityRecordV1> | null }
  | { ok: false; reason: string };

const REGISTRY_KEYS = Object.freeze([
  "chain_id",
  "entries",
  "entry_count",
  "registry_root_sha256",
  "schema",
] as const);
const ENTRY_KEYS = Object.freeze([
  "entry_index",
  "previous_registry_root_sha256",
  "record",
  "registry_root_sha256",
  "role_record_sha256",
  "schema",
] as const);
const IDENTITY_ID = /^[a-z0-9][a-z0-9._:-]{2,191}$/;
const HEX64 = /^[a-f0-9]{64}$/;
const UINT64_CANONICAL = /^(0|[1-9][0-9]{0,19})$/;

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

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

function parseUint64CanonicalV1(value: unknown): bigint | null {
  if (typeof value !== "string" || !UINT64_CANONICAL.test(value)) return null;
  let parsed: bigint;
  try {
    parsed = BigInt(value);
  } catch {
    return null;
  }
  if (parsed < 0n || parsed > VOID_CHAIN2050_ROLE_AUTHORITY_MAX_GENERATION) {
    return null;
  }
  return parsed;
}

function cloneFrozenRecordV1(
  record: Chain2050RoleAuthorityRecordV1,
): Readonly<Chain2050RoleAuthorityRecordV1> {
  return Object.freeze(structuredClone(record));
}

function freezeRegistryStateV1(
  state: Chain2050RoleAuthorityRegistryV1,
): Readonly<Chain2050RoleAuthorityRegistryV1> {
  const entries = state.entries.map((entry) =>
    Object.freeze({
      ...entry,
      record: cloneFrozenRecordV1(entry.record),
    }),
  );
  return Object.freeze({
    ...state,
    entries: Object.freeze(entries),
  });
}

export const VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_EMPTY_ROOT_SHA256 =
  sha256Hex(
    canonicalChain2050RoleAuthorityJsonV1({
      domain: VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_ROOT_DOMAIN_V1,
      chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
      empty: true,
    }),
  );

function computeEntryRootV1(
  previousRegistryRootSha256: string,
  entryIndex: string,
  record: Chain2050RoleAuthorityRecordV1,
  pair: Chain2050RoleAuthorityPairV1,
): string {
  return sha256Hex(
    canonicalChain2050RoleAuthorityJsonV1({
      domain: VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_ROOT_DOMAIN_V1,
      chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
      entry_index: entryIndex,
      previous_registry_root_sha256: previousRegistryRootSha256,
      identity_id: record.identity_id,
      role_authority_generation: pair.role_authority_generation,
      role_record_sha256: pair.role_record_sha256,
    }),
  );
}

export function createEmptyChain2050RoleAuthorityRegistryV1():
  Readonly<Chain2050RoleAuthorityRegistryV1> {
  return freezeRegistryStateV1({
    schema: VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_V1_SCHEMA,
    chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
    entry_count: "0",
    registry_root_sha256:
      VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_EMPTY_ROOT_SHA256,
    entries: [],
  });
}

function currentRecordForIdentityV1(
  state: Readonly<Chain2050RoleAuthorityRegistryV1>,
  identityId: string,
): Chain2050RoleAuthorityRecordV1 | null {
  for (let index = state.entries.length - 1; index >= 0; index -= 1) {
    const record = state.entries[index]?.record;
    if (record?.identity_id === identityId) {
      return structuredClone(record);
    }
  }
  return null;
}

export function validateChain2050RoleAuthorityRegistryV1(
  value: unknown,
): Chain2050RoleAuthorityRegistryValidationV1 {
  if (!isRecord(value) || !exactObjectKeys(value, REGISTRY_KEYS)) {
    return { ok: false, reason: "role_authority_registry_keys_mismatch" };
  }
  if (value.schema !== VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_V1_SCHEMA) {
    return { ok: false, reason: "role_authority_registry_schema_mismatch" };
  }
  if (value.chain_id !== VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID) {
    return { ok: false, reason: "role_authority_registry_chain_id_mismatch" };
  }
  const entryCount = parseUint64CanonicalV1(value.entry_count);
  if (entryCount === null) {
    return { ok: false, reason: "role_authority_registry_entry_count_invalid" };
  }
  if (!Array.isArray(value.entries)) {
    return { ok: false, reason: "role_authority_registry_entries_must_be_array" };
  }
  if (entryCount !== BigInt(value.entries.length)) {
    return { ok: false, reason: "role_authority_registry_entry_count_mismatch" };
  }
  if (
    typeof value.registry_root_sha256 !== "string" ||
    !HEX64.test(value.registry_root_sha256)
  ) {
    return { ok: false, reason: "role_authority_registry_root_invalid" };
  }

  let rollingRoot = VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_EMPTY_ROOT_SHA256;
  const currentByIdentity = new Map<string, Chain2050RoleAuthorityRecordV1>();
  const normalizedEntries: Chain2050RoleAuthorityRegistryEntryV1[] = [];

  for (let index = 0; index < value.entries.length; index += 1) {
    const entryValue = value.entries[index];
    if (!isRecord(entryValue) || !exactObjectKeys(entryValue, ENTRY_KEYS)) {
      return { ok: false, reason: "role_authority_registry_entry_keys_mismatch" };
    }
    if (entryValue.schema !== VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_ENTRY_V1_SCHEMA) {
      return { ok: false, reason: "role_authority_registry_entry_schema_mismatch" };
    }
    if (
      parseUint64CanonicalV1(entryValue.entry_index) !== BigInt(index)
    ) {
      return { ok: false, reason: "role_authority_registry_entry_index_mismatch" };
    }
    if (entryValue.previous_registry_root_sha256 !== rollingRoot) {
      return {
        ok: false,
        reason: "role_authority_registry_previous_root_mismatch",
      };
    }
    if (
      typeof entryValue.role_record_sha256 !== "string" ||
      !HEX64.test(entryValue.role_record_sha256) ||
      typeof entryValue.registry_root_sha256 !== "string" ||
      !HEX64.test(entryValue.registry_root_sha256)
    ) {
      return { ok: false, reason: "role_authority_registry_entry_hash_invalid" };
    }

    const recordValidation =
      validateChain2050RoleAuthorityRecordV1(entryValue.record);
    if (recordValidation.ok === false) {
      return {
        ok: false,
        reason: `role_authority_registry_record_invalid:${recordValidation.reason}`,
      };
    }
    const record = recordValidation.record;
    const pair = deriveChain2050RoleAuthorityPairV1(record);
    if (entryValue.role_record_sha256 !== pair.role_record_sha256) {
      return {
        ok: false,
        reason: "role_authority_registry_record_hash_mismatch",
      };
    }

    const previousRecord = currentByIdentity.get(record.identity_id);
    if (previousRecord === undefined) {
      const genesis = verifyChain2050RoleAuthorityGenesisV1(record);
      if (genesis.ok === false) {
        return {
          ok: false,
          reason: `role_authority_registry_genesis_invalid:${genesis.reason}`,
        };
      }
    } else {
      const transition = verifyChain2050RoleAuthorityTransitionV1(
        previousRecord,
        record,
      );
      if (transition.ok === false) {
        return {
          ok: false,
          reason: `role_authority_registry_transition_invalid:${transition.reason}`,
        };
      }
      if (transition.kind === "idempotent_replay") {
        return {
          ok: false,
          reason: "role_authority_registry_duplicate_replay_entry",
        };
      }
    }

    const expectedRoot = computeEntryRootV1(
      rollingRoot,
      String(index),
      record,
      pair,
    );
    if (entryValue.registry_root_sha256 !== expectedRoot) {
      return {
        ok: false,
        reason: "role_authority_registry_entry_root_mismatch",
      };
    }

    normalizedEntries.push({
      schema: VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_ENTRY_V1_SCHEMA,
      entry_index: String(index),
      previous_registry_root_sha256: rollingRoot,
      role_record_sha256: pair.role_record_sha256,
      registry_root_sha256: expectedRoot,
      record: structuredClone(record),
    });
    rollingRoot = expectedRoot;
    currentByIdentity.set(record.identity_id, structuredClone(record));
  }

  if (value.registry_root_sha256 !== rollingRoot) {
    return { ok: false, reason: "role_authority_registry_terminal_root_mismatch" };
  }

  return {
    ok: true,
    state: freezeRegistryStateV1({
      schema: VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_V1_SCHEMA,
      chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
      entry_count: String(value.entries.length),
      registry_root_sha256: rollingRoot,
      entries: normalizedEntries,
    }),
  };
}

export function appendChain2050RoleAuthorityRecordV1(
  stateValue: unknown,
  recordValue: unknown,
): Chain2050RoleAuthorityRegistryAppendResultV1 {
  const stateValidation = validateChain2050RoleAuthorityRegistryV1(stateValue);
  if (stateValidation.ok === false) {
    return {
      ok: false,
      reason: `role_authority_registry_state_invalid:${stateValidation.reason}`,
    };
  }
  const recordValidation = validateChain2050RoleAuthorityRecordV1(recordValue);
  if (recordValidation.ok === false) {
    return {
      ok: false,
      reason: `role_authority_registry_record_invalid:${recordValidation.reason}`,
    };
  }

  const state = stateValidation.state;
  const record = recordValidation.record;
  const current = currentRecordForIdentityV1(state, record.identity_id);

  const transition = current === null
    ? verifyChain2050RoleAuthorityGenesisV1(record)
    : verifyChain2050RoleAuthorityTransitionV1(current, record);
  if (transition.ok === false) {
    return {
      ok: false,
      reason: `role_authority_registry_append_rejected:${transition.reason}`,
    };
  }
  if (transition.kind === "idempotent_replay") {
    return {
      ok: true,
      kind: "idempotent_replay",
      pair: transition.pair,
      state,
    };
  }

  const entryIndex = String(state.entries.length);
  const nextRoot = computeEntryRootV1(
    state.registry_root_sha256,
    entryIndex,
    record,
    transition.pair,
  );
  const nextEntry: Chain2050RoleAuthorityRegistryEntryV1 = {
    schema: VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_ENTRY_V1_SCHEMA,
    entry_index: entryIndex,
    previous_registry_root_sha256: state.registry_root_sha256,
    role_record_sha256: transition.pair.role_record_sha256,
    registry_root_sha256: nextRoot,
    record: structuredClone(record),
  };
  const nextState = freezeRegistryStateV1({
    schema: VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_V1_SCHEMA,
    chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
    entry_count: String(state.entries.length + 1),
    registry_root_sha256: nextRoot,
    entries: [...state.entries, nextEntry] as Chain2050RoleAuthorityRegistryEntryV1[],
  });

  return {
    ok: true,
    kind: transition.kind,
    pair: transition.pair,
    state: nextState,
  };
}

export function readCurrentChain2050RoleAuthorityRecordFromRegistryV1(
  stateValue: unknown,
  identityId: unknown,
): Chain2050RoleAuthorityRegistryReadResultV1 {
  if (typeof identityId !== "string" || !IDENTITY_ID.test(identityId)) {
    return { ok: false, reason: "role_authority_registry_identity_id_invalid" };
  }
  const stateValidation = validateChain2050RoleAuthorityRegistryV1(stateValue);
  if (stateValidation.ok === false) {
    return {
      ok: false,
      reason: `role_authority_registry_state_invalid:${stateValidation.reason}`,
    };
  }
  const current = currentRecordForIdentityV1(stateValidation.state, identityId);
  return {
    ok: true,
    record: current === null ? null : cloneFrozenRecordV1(current),
  };
}
