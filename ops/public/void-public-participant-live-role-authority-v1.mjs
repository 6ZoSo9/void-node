#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  createChain2050RoleAuthorityLiveRpcObserverV1,
} from "../../tools/chain2050-role-authority-live-rpc-observer-v1.mjs";

export const VOID_PUBLIC_PARTICIPANT_LIVE_ROLE_AUTHORITY_V1 =
  "VOID_PUBLIC_PARTICIPANT_LIVE_ROLE_AUTHORITY_V1";

export const VOID_PUBLIC_PARTICIPANT_LIVE_ROLE_AUTHORITY_AUTHORITY_V1 =
  Object.freeze({
    scalar_runtime_configuration_only: true,
    compiled_reviewed_security_modules_required: true,
    loopback_read_only_role_rpc_required: true,
    fixed_chain_id: 2050,
    fixed_role: "AGENT",
    fixed_binding_id: "participant-role-authority-mainnet0-live-v1",
    credential_access: false,
    private_key_access: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    work_credit_mutation: false,
    validator_mutation: false,
    service_action: false,
    funds_movement: false,
  });

const ROOT =
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DIST_SECURITY =
  path.join(ROOT, "dist", "security");

const BINDING_MODULE =
  "chain2050_role_authority_live_rpc_binding_v1.js";
const SESSION_ADAPTER_MODULE =
  "participant_role_authority_session_adapter_v1.js";

const EXPECTED = Object.freeze({
  chain_id: 2050,
  contract_address:
    "0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49",
  accepted_runtime_sha256:
    "b2e1938deb9dd2692a322fd837a5128aeb99d3c33095087c8af8d828a6ed930d",
  reviewed_registry_contract_sha256:
    "a6ecf042569223cc1d56b3e2cc3350206a0abd6352b009212b6540699f7c57f6",
  binding_id:
    "participant-role-authority-mainnet0-live-v1",
  confirmation_depth: 12,
});

function fail(code) {
  throw new Error(code);
}

function compiledModuleFile(name) {
  const file = path.join(DIST_SECURITY, name);
  let stat;
  let real;
  try {
    stat = fs.lstatSync(file);
    real = fs.realpathSync.native(file);
  } catch {
    fail("participant_live_role_compiled_module_unavailable:" + name);
  }
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    real !== file ||
    stat.size < 16 ||
    stat.size > 2 * 1024 * 1024
  ) {
    fail("participant_live_role_compiled_module_invalid:" + name);
  }
  return file;
}

async function loadCompiledFactoriesV1() {
  const bindingFile = compiledModuleFile(BINDING_MODULE);
  const adapterFile = compiledModuleFile(SESSION_ADAPTER_MODULE);
  const [bindingModule, adapterModule] = await Promise.all([
    import(pathToFileURL(bindingFile).href),
    import(pathToFileURL(adapterFile).href),
  ]);
  if (
    typeof bindingModule.createChain2050RoleAuthorityLiveRpcBindingV1
      !== "function" ||
    typeof adapterModule.createParticipantRoleAuthoritySessionAdapterV1
      !== "function"
  ) {
    fail("participant_live_role_compiled_exports_invalid");
  }
  return Object.freeze({
    createBinding:
      bindingModule.createChain2050RoleAuthorityLiveRpcBindingV1,
    createSessionAdapter:
      adapterModule.createParticipantRoleAuthoritySessionAdapterV1,
  });
}

function validateRoleAuthorityV1(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    value.marker !== "VOID_PARTICIPANT_ROLE_AUTHORITY_SESSION_ADAPTER_V1" ||
    value.chain_id !== 2050 ||
    value.required_role !== "AGENT" ||
    typeof value.admit !== "function" ||
    typeof value.revalidate !== "function" ||
    value.wallet_private_key_access !== false ||
    value.signing_authority !== false ||
    value.work_credit_mutation_authority !== false ||
    value.validator_mutation_authority !== false ||
    value.chain2050_write_authority !== false ||
    value.money_movement_authority !== false
  ) {
    fail("participant_live_role_session_adapter_invalid");
  }
  return value;
}

export async function createVoidPublicParticipantLiveRoleAuthorityV1({
  rpcUrl,
} = {}) {
  const rpc = String(rpcUrl || "").trim();
  if (!rpc) fail("participant_live_role_rpc_url_required");

  const observer =
    await createChain2050RoleAuthorityLiveRpcObserverV1({
      rpc_url: rpc,
      contract_address: EXPECTED.contract_address,
      expected_runtime_code_sha256:
        EXPECTED.accepted_runtime_sha256,
      expected_registry_contract_sha256:
        EXPECTED.reviewed_registry_contract_sha256,
      confirmation_depth: EXPECTED.confirmation_depth,
    });

  if (
    observer?.ok !== true ||
    observer.status !== "read_only_live_rpc_observer_ready" ||
    observer.marker !==
      "VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_OBSERVER_V1" ||
    observer.source?.chain_id !== 2050 ||
    observer.source?.contract_address !== EXPECTED.contract_address ||
    observer.source?.runtime_code_sha256 !==
      EXPECTED.accepted_runtime_sha256 ||
    observer.source?.registry_contract_sha256 !==
      EXPECTED.reviewed_registry_contract_sha256 ||
    observer.source?.transport_kind !== "loopback_http_json_rpc" ||
    observer.source?.synthetic_transport !== false ||
    typeof observer.source?.readContractSnapshotV1 !== "function"
  ) {
    fail(
      "participant_live_role_observer_hold:" +
      String(observer?.reason || observer?.status || "invalid"),
    );
  }

  const factories = await loadCompiledFactoriesV1();
  const binding = factories.createBinding({
    observer: observer.source,
    binding_id: EXPECTED.binding_id,
  });
  if (
    binding?.ok !== true ||
    typeof binding.binding_descriptor_sha256 !== "string" ||
    !/^[0-9a-f]{64}$/u.test(binding.binding_descriptor_sha256) ||
    binding.source?.chain_id !== 2050 ||
    binding.source?.binding_descriptor_sha256 !==
      binding.binding_descriptor_sha256 ||
    typeof binding.source?.readCurrentRoleAuthorityRecordV1 !== "function"
  ) {
    fail(
      "participant_live_role_binding_hold:" +
      String(binding?.reason || "invalid"),
    );
  }

  const roleAuthority = validateRoleAuthorityV1(
    factories.createSessionAdapter({
      roleSource: binding.source,
      expectedBindingDescriptorSha256:
        binding.binding_descriptor_sha256,
    }),
  );

  return Object.freeze({
    marker: VOID_PUBLIC_PARTICIPANT_LIVE_ROLE_AUTHORITY_V1,
    chain_id: 2050,
    required_role: "AGENT",
    binding_id: EXPECTED.binding_id,
    binding_descriptor_sha256:
      binding.binding_descriptor_sha256,
    rpc_url_fingerprint_sha256:
      observer.rpc_url_fingerprint_sha256,
    roleAuthority,
    authority:
      VOID_PUBLIC_PARTICIPANT_LIVE_ROLE_AUTHORITY_AUTHORITY_V1,
  });
}

export async function testOnlyLoadVoidPublicParticipantLiveRoleRuntimeV1() {
  const factories = await loadCompiledFactoriesV1();
  return Object.freeze({
    compiled_binding_factory_loaded:
      typeof factories.createBinding === "function",
    compiled_session_adapter_factory_loaded:
      typeof factories.createSessionAdapter === "function",
  });
}
