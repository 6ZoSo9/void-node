// SPDX-License-Identifier: VCL-1.0
import { createHash } from "node:crypto";

import {
  VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
  canonicalChain2050RoleAuthorityJsonV1,
} from "./chain2050_role_authority_record_v1.js";
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_READ_SOURCE_KIND_V1,
  type Chain2050RoleAuthorityReadSourceV1,
} from "./chain2050_role_authority_read_adapter_v1.js";
import {
  readCurrentChain2050RoleAuthorityRecordFromRegistryV1,
  validateChain2050RoleAuthorityRegistryV1,
} from "./chain2050_role_authority_registry_v1.js";

export const VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_V1_SCHEMA =
  "void.chain2050-role-authority-registry-binding.v1" as const;
export const VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_KIND_V1 =
  "reviewed_chain2050_role_authority_registry_binding" as const;

export interface Chain2050RoleAuthorityRegistryBindingDescriptorV1 {
  schema: typeof VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_V1_SCHEMA;
  chain_id: typeof VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID;
  binding_kind: typeof VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_KIND_V1;
  binding_id: string;
  registry_namespace_sha256: string;
  registry_contract_sha256: string;
  query_contract_sha256: string;
  finality_policy_sha256: string;
}

export interface Chain2050RoleAuthorityRegistrySnapshotProviderV1 {
  readonly descriptor: unknown;
  readCanonicalRoleAuthorityRegistryV1(): unknown | Promise<unknown>;
}

export type Chain2050RoleAuthorityRegistryReadSourceBindingResultV1 =
  | {
      ok: true;
      binding_descriptor_sha256: string;
      source: Chain2050RoleAuthorityReadSourceV1 & {
        readonly binding_descriptor_sha256: string;
      };
    }
  | { ok: false; reason: string };

const DESCRIPTOR_KEYS = Object.freeze([
  "binding_id",
  "binding_kind",
  "chain_id",
  "finality_policy_sha256",
  "query_contract_sha256",
  "registry_contract_sha256",
  "registry_namespace_sha256",
  "schema",
] as const);
const PROVIDER_KEYS = Object.freeze([
  "descriptor",
  "readCanonicalRoleAuthorityRegistryV1",
] as const);
const BINDING_ID = /^[a-z0-9][a-z0-9._:-]{2,191}$/;
const HEX64 = /^[a-f0-9]{64}$/;

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

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function validateChain2050RoleAuthorityRegistryBindingDescriptorV1(
  value: unknown,
): value is Chain2050RoleAuthorityRegistryBindingDescriptorV1 {
  if (!isRecord(value) || !exactObjectKeys(value, DESCRIPTOR_KEYS)) return false;
  if (value.schema !== VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_V1_SCHEMA) {
    return false;
  }
  if (value.chain_id !== VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID) return false;
  if (
    value.binding_kind !==
    VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_KIND_V1
  ) {
    return false;
  }
  if (typeof value.binding_id !== "string" || !BINDING_ID.test(value.binding_id)) {
    return false;
  }
  for (const key of [
    "registry_namespace_sha256",
    "registry_contract_sha256",
    "query_contract_sha256",
    "finality_policy_sha256",
  ] as const) {
    if (typeof value[key] !== "string" || !HEX64.test(value[key])) return false;
  }
  return true;
}

export function computeChain2050RoleAuthorityRegistryBindingDescriptorSha256V1(
  value: unknown,
): string | null {
  if (!validateChain2050RoleAuthorityRegistryBindingDescriptorV1(value)) {
    return null;
  }
  return sha256Hex(canonicalChain2050RoleAuthorityJsonV1(value));
}

function validateProviderV1(
  value: unknown,
): value is Chain2050RoleAuthorityRegistrySnapshotProviderV1 {
  if (!isRecord(value) || !exactObjectKeys(value, PROVIDER_KEYS)) return false;
  return typeof value.readCanonicalRoleAuthorityRegistryV1 === "function";
}

export function createChain2050RoleAuthorityRegistryReadSourceBindingV1(
  providerValue: unknown,
  expectedDescriptorValue: unknown,
): Chain2050RoleAuthorityRegistryReadSourceBindingResultV1 {
  if (!validateProviderV1(providerValue)) {
    return { ok: false, reason: "role_authority_registry_provider_invalid" };
  }
  if (
    !validateChain2050RoleAuthorityRegistryBindingDescriptorV1(
      expectedDescriptorValue,
    )
  ) {
    return {
      ok: false,
      reason: "role_authority_registry_expected_binding_descriptor_invalid",
    };
  }
  if (
    !validateChain2050RoleAuthorityRegistryBindingDescriptorV1(
      providerValue.descriptor,
    )
  ) {
    return {
      ok: false,
      reason: "role_authority_registry_provider_binding_descriptor_invalid",
    };
  }

  const expectedDescriptor = structuredClone(expectedDescriptorValue);
  const expectedDescriptorSha =
    computeChain2050RoleAuthorityRegistryBindingDescriptorSha256V1(
      expectedDescriptor,
    );
  const providerDescriptorSha =
    computeChain2050RoleAuthorityRegistryBindingDescriptorSha256V1(
      providerValue.descriptor,
    );
  if (
    expectedDescriptorSha === null ||
    providerDescriptorSha === null ||
    providerDescriptorSha !== expectedDescriptorSha
  ) {
    return { ok: false, reason: "role_authority_registry_binding_mismatch" };
  }

  const provider = providerValue;
  const source = Object.freeze({
    chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
    source_kind: VOID_CHAIN2050_ROLE_AUTHORITY_READ_SOURCE_KIND_V1,
    binding_descriptor_sha256: expectedDescriptorSha,
    async readCurrentRoleAuthorityRecordV1(identityId: string): Promise<unknown> {
      const currentDescriptorSha =
        computeChain2050RoleAuthorityRegistryBindingDescriptorSha256V1(
          provider.descriptor,
        );
      if (currentDescriptorSha !== expectedDescriptorSha) {
        throw new Error("role_authority_registry_binding_drift");
      }

      let rawState: unknown;
      try {
        rawState = await provider.readCanonicalRoleAuthorityRegistryV1();
      } catch {
        throw new Error("role_authority_registry_snapshot_read_failed");
      }

      let isolatedState: unknown;
      try {
        isolatedState = structuredClone(rawState);
      } catch {
        throw new Error("role_authority_registry_snapshot_not_cloneable");
      }

      const registryValidation =
        validateChain2050RoleAuthorityRegistryV1(isolatedState);
      if (registryValidation.ok === false) {
        throw new Error(
          `role_authority_registry_snapshot_invalid:${registryValidation.reason}`,
        );
      }

      const read = readCurrentChain2050RoleAuthorityRecordFromRegistryV1(
        registryValidation.state,
        identityId,
      );
      if (read.ok === false) {
        throw new Error(read.reason);
      }
      return read.record;
    },
  });

  return {
    ok: true,
    binding_descriptor_sha256: expectedDescriptorSha,
    source,
  };
}
