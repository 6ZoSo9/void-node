#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MARKER =
  "VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_BYTECODE_REVIEW_PACKET_V1";
export const CONTRACT_PATH =
  "contracts/mainnet0/VoidChain2050RoleAuthorityRegistryV1.sol";

export const EXPECTED_COMPILED_IDENTITY_V1 = Object.freeze({
  source_generation_commit:
    "4a1ea998c817576cce714a3786d544a198b721d4",
  reproducibility_id:
    "voidcraregdc1_98ae94aacbf76c6d8de48aa3f57b181dab7e15ee95aaf179fbbb16a40c0c3d73",
  contract_source_sha256:
    "a6ecf042569223cc1d56b3e2cc3350206a0abd6352b009212b6540699f7c57f6",
  standard_json_input_canonical_sha256:
    "06246343aa5c3b4610c87530dd6317cade3d6da61d313bee6c6eeb9c93d44f12",
  creation_bytecode_sha256:
    "c0844cd0718ed2dc345bbc01107b57dbb2c2129e325066bff399502031a14733",
  runtime_template_sha256:
    "b42f8c9397ab02c299563f84233aecdd8f237bbeb553231b702b9b7db03c535d",
  expected_deployed_runtime_sha256:
    "b2e1938deb9dd2692a322fd837a5128aeb99d3c33095087c8af8d828a6ed930d",
  immutable_empty_registry_root_sha256:
    "d50b8a122e11454b6cca6a03b312ecac6af6ea1a5d5c5d5f9dd3fdd03b1faea7",
  runtime_immutable_references: Object.freeze([
    Object.freeze({
      ast_id: "83",
      start: 1390,
      length: 32,
    }),
  ]),
  abi_sha256:
    "e56ff6fb3c9c1d3847b7bfab49793d623788dcf5d1dc3d1eac4384fc70c356c2",
  metadata_sha256:
    "09309636ce80a9baa748e9a65a59ff9a7ef29374ee76ec90417e1b86171c0d89",
  storage_layout_sha256:
    "14e186caa001ba17491c04456d6b32cd64be5cd93cb71c22a565e419af817fbe",
  method_identifiers_sha256:
    "7e2ddaad9d4345b3a4a38363142152ba385733cadaf28f16310405df1c662fbf",
  compiler_release: "0.8.20+commit.a1b79de6",
  evm_version: "paris",
  optimizer_runs: 200,
  via_ir: true,
});

export const SOVEREIGN_REVIEW_AUTHORITY_V1 = Object.freeze({
  sovereign_decision_required: true,
  sovereign_bytecode_acceptance: false,
  compiler_distribution_trust_accepted: false,
  owner_binding_authorized: false,
  deployer_binding_authorized: false,
  transaction_construction_authorized: false,
  signing_authorized: false,
  transaction_broadcast_authorized: false,
  contract_deployment_authorized: false,
  registry_append_authorized: false,
  production_activation_authorized: false,
  funds_action_authorized: false,
});

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function canonical(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
      .join(",") +
    "}"
  );
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function assertSourceShape(source) {
  const required = [
    "contract VoidChain2050RoleAuthorityRegistryV1",
    "uint256 public constant CHAIN_ID = 2050",
    "constructor(address initialOwner)",
    "if (block.chainid != CHAIN_ID)",
    "if (initialOwner == address(0)) revert InvalidOwner()",
    "modifier onlyOwner()",
    "function appendRoleAuthorityRecord(",
    "external\n        onlyOwner",
    "function transferOwnership(address newOwner) external onlyOwner",
    "function cancelOwnershipTransfer() external onlyOwner",
    "function acceptOwnership() external",
    "bytes32 public immutable emptyRegistryRootSha256",
    "bytes32 public registryRootSha256",
  ];
  for (const marker of required) {
    if (!source.includes(marker)) {
      throw new Error("source_authority_shape_mismatch:" + marker);
    }
  }

  for (const forbidden of [
    "delegatecall",
    "selfdestruct",
    "tx.origin",
    ".call{",
    ".delegatecall",
    "payable(",
    "receive()",
    "fallback()",
  ]) {
    if (source.includes(forbidden)) {
      throw new Error("source_forbidden_authority_surface:" + forbidden);
    }
  }

  const immutableCount = (source.match(/\bimmutable\b/g) || []).length;
  if (immutableCount !== 1) {
    throw new Error("source_immutable_count_invalid");
  }
}

export function buildRoleAuthoritySovereignBytecodeReviewPacketV1({
  sourceBytes,
  currentMainCommit,
} = {}) {
  if (!Buffer.isBuffer(sourceBytes)) {
    throw new Error("source_bytes_required");
  }
  const source = sourceBytes.toString("utf8");
  assertSourceShape(source);

  const sourceSha = sha256(sourceBytes);
  if (
    sourceSha !==
    EXPECTED_COMPILED_IDENTITY_V1.contract_source_sha256
  ) {
    throw new Error("compiled_identity_source_hash_mismatch");
  }

  if (
    typeof currentMainCommit !== "string" ||
    !/^[0-9a-f]{40}$/.test(currentMainCommit)
  ) {
    throw new Error("current_main_commit_invalid");
  }

  const body = {
    marker: MARKER,
    version: 1,
    current_main_commit: currentMainCommit,
    compiled_identity:
      EXPECTED_COMPILED_IDENTITY_V1,
    authority_review: {
      chain_id_constructor_guard: true,
      constructor_owner_nonzero_required: true,
      owner_only_registry_append: true,
      exact_idempotent_replay_supported: true,
      two_step_owner_transfer: true,
      direct_external_call_surface_detected: false,
      delegatecall_surface_detected: false,
      selfdestruct_surface_detected: false,
      payable_receive_fallback_surface_detected: false,
      immutable_count: 1,
      immutable_name: "emptyRegistryRootSha256",
    },
    unresolved: {
      sovereign_bytecode_acceptance: false,
      compiler_distribution_trust_accepted: false,
      owner_address: null,
      deployer_address: null,
      owner_deployer_separation_reviewed: false,
      constructor_deployment_data_sha256: null,
      deployment_nonce: null,
      gas_limit: null,
      fee_policy: null,
      unsigned_transaction: null,
      deployment_address: null,
    },
    authority: SOVEREIGN_REVIEW_AUTHORITY_V1,
    decision: {
      status:
        "HOLD_PENDING_EXPLICIT_SOVEREIGN_BYTECODE_ACCEPTANCE",
      exact_compiled_identity_locked: true,
      current_source_matches_compiled_identity: true,
      owner_binding_resolved: false,
      deployer_binding_resolved: false,
      unsigned_transaction_constructed: false,
      signing_authorized: false,
      transaction_broadcast_authorized: false,
      deployment_authorized: false,
      production_activation_authorized: false,
      next_gate_after_acceptance:
        "bind_owner_and_deployer_then_construct_unsigned_deployment_data_without_signing_or_broadcast",
    },
  };

  const packetSha = sha256(canonical(body));
  return Object.freeze({
    packet_sha256: packetSha,
    ...body,
  });
}

export function buildCurrentRoleAuthoritySovereignReviewPacketV1(
  currentMainCommit,
) {
  const sourceBytes = fs.readFileSync(
    path.join(ROOT, CONTRACT_PATH),
  );
  return buildRoleAuthoritySovereignBytecodeReviewPacketV1({
    sourceBytes,
    currentMainCommit,
  });
}
