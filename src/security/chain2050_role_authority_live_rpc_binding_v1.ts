// SPDX-License-Identifier: VCL-1.0
import {
  computeChain2050RoleAuthorityContractNamespaceSha256V1,
  createChain2050RoleAuthorityContractSnapshotProviderV1,
} from "./chain2050_role_authority_contract_projection_v1.js";
import type {
  Chain2050RoleAuthorityReadSourceV1,
} from "./chain2050_role_authority_read_adapter_v1.js";
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_KIND_V1,
  VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_V1_SCHEMA,
  computeChain2050RoleAuthorityRegistryBindingDescriptorSha256V1,
  createChain2050RoleAuthorityRegistryReadSourceBindingV1,
  type Chain2050RoleAuthorityRegistryBindingDescriptorV1,
} from "./chain2050_role_authority_registry_read_source_binding_v1.js";

export const VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_BINDING_V1_SCHEMA =
  "void.chain2050-role-authority-live-rpc-binding.v1" as const;

export type Chain2050RoleAuthorityLiveRpcBindingResultV1 =
  | {
      ok: true;
      descriptor:
        Readonly<Chain2050RoleAuthorityRegistryBindingDescriptorV1>;
      binding_descriptor_sha256: string;
      source: Chain2050RoleAuthorityReadSourceV1 & {
        readonly binding_descriptor_sha256: string;
      };
    }
  | { ok: false; reason: string };

const ADDRESS = /^0x[0-9a-f]{40}$/;
const HEX64 = /^[a-f0-9]{64}$/;
const BINDING_ID = /^[a-z0-9][a-z0-9._:-]{2,191}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function createChain2050RoleAuthorityLiveRpcBindingV1(input: {
  observer: unknown;
  binding_id: string;
}): Chain2050RoleAuthorityLiveRpcBindingResultV1 {
  const observer = input.observer;
  if (!isRecord(observer)) {
    return { ok: false, reason: "role_authority_live_rpc_observer_invalid" };
  }

  if (
    observer.marker !==
      "VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_OBSERVER_V1" ||
    observer.chain_id !== 2050 ||
    observer.transport_kind !== "loopback_http_json_rpc" ||
    observer.synthetic_transport !== false ||
    typeof observer.contract_address !== "string" ||
    !ADDRESS.test(observer.contract_address) ||
    typeof observer.runtime_code_sha256 !== "string" ||
    !HEX64.test(observer.runtime_code_sha256) ||
    typeof observer.registry_contract_sha256 !== "string" ||
    !HEX64.test(observer.registry_contract_sha256) ||
    typeof observer.query_contract_sha256 !== "string" ||
    !HEX64.test(observer.query_contract_sha256) ||
    typeof observer.finality_policy_sha256 !== "string" ||
    !HEX64.test(observer.finality_policy_sha256) ||
    typeof observer.readContractSnapshotV1 !== "function"
  ) {
    return { ok: false, reason: "role_authority_live_rpc_observer_invalid" };
  }

  if (
    typeof input.binding_id !== "string" ||
    !BINDING_ID.test(input.binding_id)
  ) {
    return {
      ok: false,
      reason: "role_authority_live_rpc_binding_id_invalid",
    };
  }

  const namespace =
    computeChain2050RoleAuthorityContractNamespaceSha256V1({
      contract_address: observer.contract_address,
      runtime_code_sha256: observer.runtime_code_sha256,
    });
  if (namespace === null) {
    return {
      ok: false,
      reason: "role_authority_live_rpc_namespace_invalid",
    };
  }

  const descriptor: Chain2050RoleAuthorityRegistryBindingDescriptorV1 = {
    schema: VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_V1_SCHEMA,
    chain_id: 2050,
    binding_kind:
      VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_KIND_V1,
    binding_id: input.binding_id,
    registry_namespace_sha256: namespace,
    registry_contract_sha256: observer.registry_contract_sha256,
    query_contract_sha256: observer.query_contract_sha256,
    finality_policy_sha256: observer.finality_policy_sha256,
  };

  const provider =
    createChain2050RoleAuthorityContractSnapshotProviderV1(
      {
        contract_address: observer.contract_address,
        runtime_code_sha256: observer.runtime_code_sha256,
        readContractSnapshotV1:
          observer.readContractSnapshotV1.bind(observer),
      },
      descriptor,
    );
  if (provider.ok === false) {
    return {
      ok: false,
      reason:
        "role_authority_live_rpc_provider_rejected:" +
        provider.reason,
    };
  }

  const bound = createChain2050RoleAuthorityRegistryReadSourceBindingV1(
    provider.provider,
    descriptor,
  );
  if (bound.ok === false) {
    return {
      ok: false,
      reason:
        "role_authority_live_rpc_binding_rejected:" + bound.reason,
    };
  }

  const descriptorSha =
    computeChain2050RoleAuthorityRegistryBindingDescriptorSha256V1(
      descriptor,
    );
  if (descriptorSha === null) {
    return {
      ok: false,
      reason:
        "role_authority_live_rpc_binding_descriptor_hash_invalid",
    };
  }

  return {
    ok: true,
    descriptor: Object.freeze(structuredClone(descriptor)),
    binding_descriptor_sha256: descriptorSha,
    source: bound.source,
  };
}
