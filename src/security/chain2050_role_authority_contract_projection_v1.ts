// SPDX-License-Identifier: VCL-1.0
import { createHash } from "node:crypto";

import {
  VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
  canonicalChain2050RoleAuthorityJsonV1,
  type Chain2050RoleAuthorityRecordV1,
} from "./chain2050_role_authority_record_v1.js";
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_EMPTY_ROOT_SHA256,
  VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_ENTRY_V1_SCHEMA,
  VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_V1_SCHEMA,
  validateChain2050RoleAuthorityRegistryV1,
  type Chain2050RoleAuthorityRegistryV1,
} from "./chain2050_role_authority_registry_v1.js";
import {
  validateChain2050RoleAuthorityRegistryBindingDescriptorV1,
  type Chain2050RoleAuthorityRegistryBindingDescriptorV1,
  type Chain2050RoleAuthorityRegistrySnapshotProviderV1,
} from "./chain2050_role_authority_registry_read_source_binding_v1.js";

export const VOID_CHAIN2050_ROLE_AUTHORITY_CONTRACT_SNAPSHOT_V1_SCHEMA =
  "void.chain2050-role-authority-contract-snapshot.v1" as const;
export const VOID_CHAIN2050_ROLE_AUTHORITY_CONTRACT_NAMESPACE_V1_SCHEMA =
  "void.chain2050-role-authority-contract-namespace.v1" as const;

export interface Chain2050RoleAuthorityContractRecordV1 {
  identity_id: string;
  role: string;
  authority_status: "active" | "revoked";
  role_authority_generation: string;
  subject_binding_sha256: string;
  authority_policy_sha256: string;
  predecessor_role_record_sha256: string | null;
  transition:
    | "genesis_grant"
    | "revoke"
    | "restore"
    | "subject_binding_change"
    | "policy_change"
    | "role_change";
  role_record_sha256: string;
}

export interface Chain2050RoleAuthorityContractEntryV1 {
  entry_index: string;
  previous_registry_root_sha256: string;
  role_record_sha256: string;
  registry_root_sha256: string;
  record: Chain2050RoleAuthorityContractRecordV1;
}

export interface Chain2050RoleAuthorityContractSnapshotV1 {
  schema: typeof VOID_CHAIN2050_ROLE_AUTHORITY_CONTRACT_SNAPSHOT_V1_SCHEMA;
  chain_id: typeof VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID;
  contract_address: string;
  runtime_code_sha256: string;
  empty_registry_root_sha256: string;
  entry_count: string;
  registry_root_sha256: string;
  entries: readonly Chain2050RoleAuthorityContractEntryV1[];
}

export interface Chain2050RoleAuthorityContractSnapshotSourceV1 {
  contract_address: string;
  runtime_code_sha256: string;
  readContractSnapshotV1():
    | unknown
    | Promise<unknown>;
}

export type Chain2050RoleAuthorityContractProjectionResultV1 =
  | {
      ok: true;
      state: Readonly<Chain2050RoleAuthorityRegistryV1>;
      contract_namespace_sha256: string;
    }
  | { ok: false; reason: string };

export type Chain2050RoleAuthorityContractProviderResultV1 =
  | {
      ok: true;
      contract_namespace_sha256: string;
      provider: Chain2050RoleAuthorityRegistrySnapshotProviderV1;
    }
  | { ok: false; reason: string };

const SNAPSHOT_KEYS = Object.freeze([
  "chain_id",
  "contract_address",
  "empty_registry_root_sha256",
  "entries",
  "entry_count",
  "registry_root_sha256",
  "runtime_code_sha256",
  "schema",
] as const);

const ENTRY_KEYS = Object.freeze([
  "entry_index",
  "previous_registry_root_sha256",
  "record",
  "registry_root_sha256",
  "role_record_sha256",
] as const);

const RECORD_KEYS = Object.freeze([
  "authority_policy_sha256",
  "authority_status",
  "identity_id",
  "predecessor_role_record_sha256",
  "role",
  "role_authority_generation",
  "role_record_sha256",
  "subject_binding_sha256",
  "transition",
] as const);

const SOURCE_KEYS = Object.freeze([
  "contract_address",
  "readContractSnapshotV1",
  "runtime_code_sha256",
] as const);

const ADDRESS = /^0x[0-9a-f]{40}$/;
const HEX64 = /^[a-f0-9]{64}$/;
const UINT64 = /^(0|[1-9][0-9]{0,19})$/;
const IDENTITY = /^[a-z0-9][a-z0-9._:-]{2,191}$/;
const ROLE = /^[A-Z][A-Z0-9_]{1,63}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return (
    JSON.stringify(Object.keys(value).sort()) ===
    JSON.stringify([...keys].sort())
  );
}

function canonicalUint64(value: unknown): value is string {
  if (typeof value !== "string" || !UINT64.test(value)) return false;
  try {
    const parsed = BigInt(value);
    return parsed >= 0n && parsed <= 18446744073709551615n;
  } catch {
    return false;
  }
}

function sha256HexUtf8(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function validateContractRecordV1(
  value: unknown,
): value is Chain2050RoleAuthorityContractRecordV1 {
  if (!isRecord(value) || !exactKeys(value, RECORD_KEYS)) return false;
  if (
    typeof value.identity_id !== "string" ||
    !IDENTITY.test(value.identity_id)
  ) {
    return false;
  }
  if (typeof value.role !== "string" || !ROLE.test(value.role)) return false;
  if (
    value.authority_status !== "active" &&
    value.authority_status !== "revoked"
  ) {
    return false;
  }
  if (!canonicalUint64(value.role_authority_generation)) return false;

  for (const key of [
    "subject_binding_sha256",
    "authority_policy_sha256",
    "role_record_sha256",
  ] as const) {
    if (typeof value[key] !== "string" || !HEX64.test(value[key])) {
      return false;
    }
  }

  if (
    value.predecessor_role_record_sha256 !== null &&
    (
      typeof value.predecessor_role_record_sha256 !== "string" ||
      !HEX64.test(value.predecessor_role_record_sha256)
    )
  ) {
    return false;
  }

  if (
    value.transition !== "genesis_grant" &&
    value.transition !== "revoke" &&
    value.transition !== "restore" &&
    value.transition !== "subject_binding_change" &&
    value.transition !== "policy_change" &&
    value.transition !== "role_change"
  ) {
    return false;
  }
  return true;
}

function validateContractEntryV1(
  value: unknown,
): value is Chain2050RoleAuthorityContractEntryV1 {
  if (!isRecord(value) || !exactKeys(value, ENTRY_KEYS)) return false;
  if (!canonicalUint64(value.entry_index)) return false;
  for (const key of [
    "previous_registry_root_sha256",
    "role_record_sha256",
    "registry_root_sha256",
  ] as const) {
    if (typeof value[key] !== "string" || !HEX64.test(value[key])) {
      return false;
    }
  }
  if (!validateContractRecordV1(value.record)) return false;
  return value.role_record_sha256 === value.record.role_record_sha256;
}

function validateSnapshotV1(
  value: unknown,
): value is Chain2050RoleAuthorityContractSnapshotV1 {
  if (!isRecord(value) || !exactKeys(value, SNAPSHOT_KEYS)) return false;
  if (
    value.schema !==
    VOID_CHAIN2050_ROLE_AUTHORITY_CONTRACT_SNAPSHOT_V1_SCHEMA
  ) {
    return false;
  }
  if (value.chain_id !== VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID) return false;
  if (
    typeof value.contract_address !== "string" ||
    !ADDRESS.test(value.contract_address)
  ) {
    return false;
  }
  if (
    typeof value.runtime_code_sha256 !== "string" ||
    !HEX64.test(value.runtime_code_sha256)
  ) {
    return false;
  }
  if (
    value.empty_registry_root_sha256 !==
    VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_EMPTY_ROOT_SHA256
  ) {
    return false;
  }
  if (
    typeof value.registry_root_sha256 !== "string" ||
    !HEX64.test(value.registry_root_sha256) ||
    !canonicalUint64(value.entry_count) ||
    !Array.isArray(value.entries)
  ) {
    return false;
  }
  if (BigInt(value.entry_count) !== BigInt(value.entries.length)) return false;
  return value.entries.every(validateContractEntryV1);
}

function contractNamespaceSha256V1(input: {
  contract_address: string;
  runtime_code_sha256: string;
}): string | null {
  if (
    !ADDRESS.test(input.contract_address) ||
    !HEX64.test(input.runtime_code_sha256)
  ) {
    return null;
  }
  return sha256HexUtf8(
    canonicalChain2050RoleAuthorityJsonV1({
      schema:
        VOID_CHAIN2050_ROLE_AUTHORITY_CONTRACT_NAMESPACE_V1_SCHEMA,
      chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
      contract_address: input.contract_address,
      runtime_code_sha256: input.runtime_code_sha256,
    }),
  );
}

export function computeChain2050RoleAuthorityContractNamespaceSha256V1(
  input: {
    contract_address: string;
    runtime_code_sha256: string;
  },
): string | null {
  return contractNamespaceSha256V1(input);
}

export function projectChain2050RoleAuthorityContractSnapshotV1(
  snapshotValue: unknown,
): Chain2050RoleAuthorityContractProjectionResultV1 {
  if (!validateSnapshotV1(snapshotValue)) {
    return { ok: false, reason: "role_authority_contract_snapshot_invalid" };
  }
  const snapshot = structuredClone(snapshotValue);

  for (let index = 0; index < snapshot.entries.length; index += 1) {
    if (snapshot.entries[index]!.entry_index !== String(index)) {
      return {
        ok: false,
        reason: "role_authority_contract_entry_index_mismatch",
      };
    }
  }

  const entries = snapshot.entries.map((entry) => {
    const record: Chain2050RoleAuthorityRecordV1 = {
      schema: "void.chain2050-role-authority-record.v1",
      chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
      identity_id: entry.record.identity_id,
      role: entry.record.role,
      authority_status: entry.record.authority_status,
      role_authority_generation:
        entry.record.role_authority_generation,
      subject_binding_sha256:
        entry.record.subject_binding_sha256,
      authority_policy_sha256:
        entry.record.authority_policy_sha256,
      predecessor_role_record_sha256:
        entry.record.predecessor_role_record_sha256,
      transition: entry.record.transition,
    };

    return {
      schema:
        VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_ENTRY_V1_SCHEMA,
      entry_index: entry.entry_index,
      previous_registry_root_sha256:
        entry.previous_registry_root_sha256,
      role_record_sha256: entry.role_record_sha256,
      registry_root_sha256: entry.registry_root_sha256,
      record,
    };
  });

  const candidate: Chain2050RoleAuthorityRegistryV1 = {
    schema: VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_V1_SCHEMA,
    chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
    entry_count: snapshot.entry_count,
    registry_root_sha256: snapshot.registry_root_sha256,
    entries,
  };

  const validated = validateChain2050RoleAuthorityRegistryV1(candidate);
  if (validated.ok === false) {
    return {
      ok: false,
      reason:
        `role_authority_contract_projection_rejected:${validated.reason}`,
    };
  }

  const namespaceSha = contractNamespaceSha256V1({
    contract_address: snapshot.contract_address,
    runtime_code_sha256: snapshot.runtime_code_sha256,
  });
  if (namespaceSha === null) {
    return {
      ok: false,
      reason: "role_authority_contract_namespace_invalid",
    };
  }

  return {
    ok: true,
    state: validated.state,
    contract_namespace_sha256: namespaceSha,
  };
}

function validateSourceV1(
  value: unknown,
): value is Chain2050RoleAuthorityContractSnapshotSourceV1 {
  if (!isRecord(value) || !exactKeys(value, SOURCE_KEYS)) return false;
  return (
    typeof value.contract_address === "string" &&
    ADDRESS.test(value.contract_address) &&
    typeof value.runtime_code_sha256 === "string" &&
    HEX64.test(value.runtime_code_sha256) &&
    typeof value.readContractSnapshotV1 === "function"
  );
}

export function createChain2050RoleAuthorityContractSnapshotProviderV1(
  sourceValue: unknown,
  descriptorValue: unknown,
): Chain2050RoleAuthorityContractProviderResultV1 {
  if (!validateSourceV1(sourceValue)) {
    return {
      ok: false,
      reason: "role_authority_contract_snapshot_source_invalid",
    };
  }
  if (
    !validateChain2050RoleAuthorityRegistryBindingDescriptorV1(
      descriptorValue,
    )
  ) {
    return {
      ok: false,
      reason: "role_authority_contract_binding_descriptor_invalid",
    };
  }

  const source = sourceValue;
  const descriptor = structuredClone(
    descriptorValue,
  ) as Chain2050RoleAuthorityRegistryBindingDescriptorV1;
  const expectedNamespace = contractNamespaceSha256V1({
    contract_address: source.contract_address,
    runtime_code_sha256: source.runtime_code_sha256,
  });
  if (
    expectedNamespace === null ||
    descriptor.registry_namespace_sha256 !== expectedNamespace
  ) {
    return {
      ok: false,
      reason: "role_authority_contract_namespace_binding_mismatch",
    };
  }

  const provider: Chain2050RoleAuthorityRegistrySnapshotProviderV1 =
    Object.freeze({
      descriptor: Object.freeze(structuredClone(descriptor)),
      async readCanonicalRoleAuthorityRegistryV1(): Promise<unknown> {
        let snapshot: unknown;
        try {
          snapshot = await source.readContractSnapshotV1();
        } catch {
          throw new Error("role_authority_contract_snapshot_read_failed");
        }

        const projection =
          projectChain2050RoleAuthorityContractSnapshotV1(snapshot);
        if (projection.ok === false) {
          throw new Error(projection.reason);
        }

        if (
          !isRecord(snapshot) ||
          snapshot.contract_address !== source.contract_address ||
          snapshot.runtime_code_sha256 !== source.runtime_code_sha256 ||
          projection.contract_namespace_sha256 !== expectedNamespace
        ) {
          throw new Error("role_authority_contract_source_identity_drift");
        }

        return projection.state;
      },
    });

  return {
    ok: true,
    contract_namespace_sha256: expectedNamespace,
    provider,
  };
}
