#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ACTIVATION_CHURN_LIMIT,
  AUTHORITY_KEYS,
  CHAIN_ID,
  CONTRACT_NAME,
  CONTRACT_PATH,
  DECISION,
  EVM_VERSION,
  MARKER,
  MAX_ACTIVE_VALIDATORS,
  MIN_VALIDATOR_STAKE_WEI,
  OUTPUT_SELECTION,
  PREPARATION_DECISION,
  PREPARATION_MARKER,
  PREPARATION_PROTOCOL,
  PROTOCOL,
  SOLC_RELEASE,
  SOLC_VERSION,
  buildCompilerProfile,
  buildStandardJsonInput,
  canonicalJson,
  encodeConstructorArguments,
  sha256,
} from "../tools/void-validator-candidate-registry-compiler-profile-v1.mjs";

const ROOT = process.cwd();
const TOOL_PATH =
  "tools/void-validator-candidate-registry-compiler-profile-v1.mjs";
const SCHEMA_PATH =
  "schemas/void-validator-candidate-registry-compiler-profile-v1.schema.json";
const DOC_PATH =
  "docs/operators/void-validator-candidate-registry-compiler-profile-v1.md";
const WORKFLOW_PATH =
  ".github/workflows/void-validator-candidate-registry-compiler-profile-v1.yml";
const SOURCE_COMMIT = "2375a235c66159b85e37a78a24defadac5c0e95b";
const PREPARATION_AT = "2026-08-05T09:20:00.000Z";
const RESOLVER_AT = "2026-08-05T09:19:00.000Z";
const REVIEWED_AT = "2026-08-05T10:00:00.000Z";
const STALE_ADDRESS = "0x9092b4a06c76cf1192a87ff9f6f5f8c758b9327b";

const read = (relative) =>
  fs.readFileSync(path.join(ROOT, relative), "utf8");
const readJson = (relative) => JSON.parse(read(relative));
const contractBytes = fs.readFileSync(path.join(ROOT, CONTRACT_PATH));

function preparationBody() {
  const encoded = encodeConstructorArguments();
  return {
    marker: PREPARATION_MARKER,
    protocol: PREPARATION_PROTOCOL,
    version: 1,
    prepared_at_utc: PREPARATION_AT,
    source: {
      repository: "6ZoSo9/void-node",
      source_commit: SOURCE_COMMIT,
      source_branch: "main",
      contract_path: CONTRACT_PATH,
      contract_source_sha256: sha256(contractBytes),
      contract_source_bytes: contractBytes.length,
      resolver_report_sha256: "a".repeat(64),
      resolver_marker:
        "VOID_VALIDATOR_CANDIDATE_REGISTRY_LIVE_RESOLVER_V1",
      resolver_observed_at_utc: RESOLVER_AT,
      resolver_age_ms: 60_000,
      resolver_decision: "HOLD_NO_LIVE_EXACT_REGISTRY",
      scanned_artifact_files: 16,
      stale_candidate_addresses: [STALE_ADDRESS],
    },
    chain: {
      chain_id: CHAIN_ID,
      rpc_origin: "http://127.0.0.1:8545",
    },
    policy: {
      min_validator_stake_wei: MIN_VALIDATOR_STAKE_WEI,
      min_validator_stake_void: "10000",
      max_active_validators: MAX_ACTIVE_VALIDATORS,
      activation_churn_limit: ACTIVATION_CHURN_LIMIT,
      public_registration_starts_as_candidate: true,
      public_registration_activates_validator: false,
    },
    compiler_profile: {
      solc_version: SOLC_VERSION,
      optimizer_enabled: true,
      optimizer_runs: 200,
      creation_bytecode_compiled: false,
      creation_bytecode_reviewed: false,
    },
    constructor: {
      signature: "constructor(uint256,uint256,uint256)",
      types: ["uint256", "uint256", "uint256"],
      values: [
        MIN_VALIDATOR_STAKE_WEI,
        MAX_ACTIVE_VALIDATORS,
        ACTIVATION_CHURN_LIMIT,
      ],
      abi_encoded_arguments: encoded,
      abi_encoded_arguments_sha256: sha256(
        Buffer.from(encoded.slice(2), "hex"),
      ),
    },
    unresolved: {
      creation_bytecode_sha256: null,
      runtime_bytecode_sha256: null,
      deployer_address: null,
      resulting_owner_address: null,
      deployment_nonce: null,
      gas_limit: null,
      fee_policy: null,
      unsigned_transaction: null,
      owner_binding_reviewed: false,
    },
    ordered_gates: [
      "rerun_read_only_live_registry_resolver_on_exact_chain_2050",
      "verify_all_known_registry_artifacts_remain_stale_no_code",
      "compile_exact_bound_contract_with_locked_compiler_profile",
      "independently_review_creation_and_runtime_bytecode_hashes",
      "bind_reviewed_deployer_address_as_resulting_registry_owner",
      "construct_but_do_not_sign_exact_unsigned_deployment_transaction",
      "obtain_separate_zoso_deployment_and_broadcast_authorization",
      "broadcast_once_and_capture_transaction_receipt",
      "rerun_live_resolver_and_write_selection_only_after_exact_policy_proof",
    ],
    authority: {
      credential_file_access_authorized: false,
      private_key_access_authorized: false,
      wallet_or_signer_access_authorized: false,
      creation_bytecode_acceptance_authorized: false,
      transaction_construction_authorized: false,
      signing_authorized: false,
      transaction_broadcast_authorized: false,
      contract_deployment_authorized: false,
      artifact_pointer_write_authorized: false,
      validator_registration_authorized: false,
      validator_waiting_transition_authorized: false,
      validator_activation_authorized: false,
      service_restart_authorized: false,
      fund_movement_authorized: false,
    },
    decision: {
      status: PREPARATION_DECISION,
      source_review_packet_complete: true,
      known_registry_artifacts_proven_stale: true,
      creation_bytecode_reviewed: false,
      deployer_and_owner_binding_resolved: false,
      unsigned_transaction_constructed: false,
      deployment_authorized: false,
      transaction_broadcast_authorized: false,
      execution_authorized: false,
      next_gate:
        "compile_and_independently_review_exact_creation_bytecode_without_signing_or_broadcast",
    },
  };
}

function preparation() {
  const body = preparationBody();
  return {
    preparation_id: `voidvcrdp1_${sha256(canonicalJson(body))}`,
    ...body,
  };
}

function build(packet = preparation(), source = contractBytes, overrides = {}) {
  const preparationBytes = Buffer.from(
    `${JSON.stringify(packet, null, 2)}\n`,
  );
  return buildCompilerProfile({
    preparation: packet,
    preparationBytes,
    sourceBytes: source,
    sourceCommit: SOURCE_COMMIT,
    sourceBranch: "main",
    reviewedAt: REVIEWED_AT,
    ...overrides,
  });
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => error?.code === code, code);
}

assert.equal(
  MARKER,
  "VOID_VALIDATOR_CANDIDATE_REGISTRY_COMPILER_PROFILE_V1",
);
assert.equal(
  PROTOCOL,
  "void-validator-candidate-registry-compiler-profile/1",
);
assert.equal(CHAIN_ID, 2050);
assert.equal(CONTRACT_NAME, "VoidValidatorCandidateRegistry");
assert.equal(SOLC_VERSION, "0.8.20");
assert.equal(SOLC_RELEASE, "0.8.20+commit.a1b79de6");
assert.equal(EVM_VERSION, "paris");
assert.equal(
  DECISION,
  "HOLD_PENDING_TWO_INDEPENDENT_SOLC_0_8_20_PARIS_OUTPUTS_AND_BYTECODE_REVIEW",
);

const input = buildStandardJsonInput(contractBytes.toString("utf8"));
assert.equal(input.language, "Solidity");
assert.deepEqual(Object.keys(input.sources), [CONTRACT_PATH]);
assert.equal(
  input.sources[CONTRACT_PATH].content,
  contractBytes.toString("utf8"),
);
assert.deepEqual(input.settings.remappings, []);
assert.deepEqual(input.settings.optimizer, {
  enabled: true,
  runs: 200,
});
assert.equal(input.settings.evmVersion, "paris");
assert.equal(input.settings.viaIR, false);
assert.deepEqual(input.settings.debug, {
  revertStrings: "default",
});
assert.deepEqual(input.settings.metadata, {
  appendCBOR: true,
  useLiteralContent: true,
  bytecodeHash: "ipfs",
});
assert.deepEqual(input.settings.libraries, {});
assert.deepEqual(
  input.settings.outputSelection[CONTRACT_PATH][CONTRACT_NAME],
  OUTPUT_SELECTION,
);

const packet = build();
assert.deepEqual(packet, build(), "packet must be deterministic");
assert.match(packet.compiler_profile_id, /^voidvcrcp1_[0-9a-f]{64}$/);
const { compiler_profile_id: profileId, ...idBody } = packet;
assert.equal(
  profileId,
  `voidvcrcp1_${sha256(canonicalJson(idBody))}`,
);
assert.equal(packet.marker, MARKER);
assert.equal(packet.protocol, PROTOCOL);
assert.equal(packet.version, 1);
assert.equal(packet.reviewed_at_utc, REVIEWED_AT);
assert.equal(packet.source.source_commit, SOURCE_COMMIT);
assert.equal(packet.source.source_branch, "main");
assert.equal(packet.source.contract_source_sha256, sha256(contractBytes));
assert.equal(packet.source.contract_source_bytes, contractBytes.length);
assert.match(packet.source.preparation_id, /^voidvcrdp1_[0-9a-f]{64}$/);
assert.equal(packet.chain.chain_id, 2050);
assert.equal(packet.chain.shanghai_support_assumed, false);
assert.equal(packet.chain.push0_dependency_permitted, false);
assert.equal(packet.compiler_profile.compiler, "solc");
assert.equal(packet.compiler_profile.semantic_version, "0.8.20");
assert.equal(
  packet.compiler_profile.release,
  "0.8.20+commit.a1b79de6",
);
assert.equal(packet.compiler_profile.evm_version, "paris");
assert.equal(packet.compiler_profile.optimizer_enabled, true);
assert.equal(packet.compiler_profile.optimizer_runs, 200);
assert.equal(packet.compiler_profile.via_ir, false);
assert.equal(packet.compiler_profile.metadata_append_cbor, true);
assert.equal(packet.compiler_profile.metadata_use_literal_content, true);
assert.equal(packet.compiler_profile.metadata_bytecode_hash, "ipfs");
assert.deepEqual(
  packet.compiler_profile.standard_json_input,
  input,
);
assert.equal(
  packet.compiler_profile.standard_json_input_sha256,
  sha256(canonicalJson(input)),
);
assert.equal(
  packet.constructor.abi_encoded_arguments,
  encodeConstructorArguments(),
);
assert.equal(packet.dual_compilation_requirements.minimum_compiler_outputs, 2);
assert.equal(
  packet.dual_compilation_requirements
    .distinct_environment_fingerprints_required,
  true,
);
assert.equal(
  packet.dual_compilation_requirements.exact_compiler_release_required,
  SOLC_RELEASE,
);
assert.equal(packet.ordered_gates.length, 11);
assert.equal(Object.keys(packet.authority).length, AUTHORITY_KEYS.length);
for (const key of AUTHORITY_KEYS) {
  assert.equal(packet.authority[key], false, key);
}
for (const [key, value] of Object.entries(packet.unresolved)) {
  assert.ok(value === null || value === false, key);
}
assert.equal(packet.decision.status, DECISION);
assert.equal(packet.decision.preparation_packet_validated, true);
assert.equal(packet.decision.explicit_evm_target_bound, true);
assert.equal(packet.decision.shanghai_support_assumed, false);
assert.equal(packet.decision.compiler_input_complete, true);
assert.equal(packet.decision.compiler_executed, false);
assert.equal(packet.decision.compiler_outputs_compared, false);
assert.equal(packet.decision.creation_bytecode_reviewed, false);
assert.equal(packet.decision.runtime_bytecode_reviewed, false);
assert.equal(packet.decision.deployment_authorized, false);
assert.equal(packet.decision.execution_authorized, false);

const badId = preparation();
badId.preparation_id = `voidvcrdp1_${"0".repeat(64)}`;
expectCode(() => build(badId), "preparation_id_invalid");

const wrongMarker = preparation();
wrongMarker.marker = "WRONG";
expectCode(() => build(wrongMarker), "preparation_contract_mismatch");

const wrongProtocol = preparation();
wrongProtocol.protocol = "wrong/1";
expectCode(() => build(wrongProtocol), "preparation_contract_mismatch");

const wrongCommit = preparation();
wrongCommit.source.source_commit = "1".repeat(40);
wrongCommit.preparation_id = `voidvcrdp1_${sha256(canonicalJson(
  Object.fromEntries(
    Object.entries(wrongCommit).filter(([key]) => key !== "preparation_id"),
  ),
))}`;
expectCode(() => build(wrongCommit), "preparation_source_binding_invalid");

const wrongSourceHash = preparation();
wrongSourceHash.source.contract_source_sha256 = "f".repeat(64);
wrongSourceHash.preparation_id = `voidvcrdp1_${sha256(canonicalJson(
  Object.fromEntries(
    Object.entries(wrongSourceHash).filter(([key]) => key !== "preparation_id"),
  ),
))}`;
expectCode(() => build(wrongSourceHash), "preparation_source_binding_invalid");

const wrongPolicy = preparation();
wrongPolicy.policy.max_active_validators = "257";
wrongPolicy.preparation_id = `voidvcrdp1_${sha256(canonicalJson(
  Object.fromEntries(
    Object.entries(wrongPolicy).filter(([key]) => key !== "preparation_id"),
  ),
))}`;
expectCode(() => build(wrongPolicy), "preparation_policy_invalid");

const wrongCompiler = preparation();
wrongCompiler.compiler_profile.solc_version = "0.8.21";
wrongCompiler.preparation_id = `voidvcrdp1_${sha256(canonicalJson(
  Object.fromEntries(
    Object.entries(wrongCompiler).filter(([key]) => key !== "preparation_id"),
  ),
))}`;
expectCode(
  () => build(wrongCompiler),
  "preparation_compiler_profile_invalid",
);

const precompiled = preparation();
precompiled.compiler_profile.creation_bytecode_compiled = true;
precompiled.preparation_id = `voidvcrdp1_${sha256(canonicalJson(
  Object.fromEntries(
    Object.entries(precompiled).filter(([key]) => key !== "preparation_id"),
  ),
))}`;
expectCode(
  () => build(precompiled),
  "preparation_compiler_profile_invalid",
);

const wrongConstructor = preparation();
wrongConstructor.constructor.values[2] = "5";
wrongConstructor.preparation_id = `voidvcrdp1_${sha256(canonicalJson(
  Object.fromEntries(
    Object.entries(wrongConstructor).filter(([key]) => key !== "preparation_id"),
  ),
))}`;
expectCode(() => build(wrongConstructor), "preparation_constructor_invalid");

const unsafeAuthority = preparation();
unsafeAuthority.authority.signing_authorized = true;
unsafeAuthority.preparation_id = `voidvcrdp1_${sha256(canonicalJson(
  Object.fromEntries(
    Object.entries(unsafeAuthority).filter(([key]) => key !== "preparation_id"),
  ),
))}`;
expectCode(() => build(unsafeAuthority), "preparation_authority_invalid");

const wrongDecision = preparation();
wrongDecision.decision.status = "READY";
wrongDecision.preparation_id = `voidvcrdp1_${sha256(canonicalJson(
  Object.fromEntries(
    Object.entries(wrongDecision).filter(([key]) => key !== "preparation_id"),
  ),
))}`;
expectCode(() => build(wrongDecision), "preparation_decision_invalid");

const changedSource = Buffer.from(
  contractBytes.toString("utf8").replace(
    "contract VoidValidatorCandidateRegistry",
    "contract DifferentRegistry",
  ),
);
expectCode(
  () => build(preparation(), changedSource),
  "contract_source_contract_mismatch",
);

expectCode(
  () => build(preparation(), contractBytes, { sourceBranch: "feature" }),
  "source_branch_not_main",
);
expectCode(
  () => build(preparation(), contractBytes, { reviewedAt: "not-a-date" }),
  "reviewed_at_invalid",
);

const rawMismatch = preparation();
const rawMismatchBytes = Buffer.from(
  `${JSON.stringify({ ...rawMismatch, prepared_at_utc: REVIEWED_AT })}\n`,
);
expectCode(
  () => buildCompilerProfile({
    preparation: rawMismatch,
    preparationBytes: rawMismatchBytes,
    sourceBytes: contractBytes,
    sourceCommit: SOURCE_COMMIT,
    sourceBranch: "main",
    reviewedAt: REVIEWED_AT,
  }),
  "preparation_bytes_object_mismatch",
);

const tool = read(TOOL_PATH);
for (const forbidden of [
  "JsonRpcProvider",
  "fetch(",
  "signTransaction(",
  "sendTransaction(",
  "broadcastTransaction(",
  "eth_sendRawTransaction",
  "forge create",
  "cast send",
  "anvil_setBalance",
  "/mnt/key",
  "workflow_dispatch",
  "--prepared-at",
  'spawnSync("solc"',
  ".compile(",
]) {
  assert.equal(tool.includes(forbidden), false, `forbidden operation: ${forbidden}`);
}
for (const required of [
  'spawnSync("git"',
  "atomicWrite",
  "const allowed = new Set",
  'evmVersion: EVM_VERSION',
  'appendCBOR: true',
  'useLiteralContent: true',
  'bytecodeHash: "ipfs"',
  "preparation_bytes_object_mismatch",
  "preparation_authority_invalid",
  "distinct_environment_fingerprints_required",
]) {
  assert.ok(tool.includes(required), `tool missing ${required}`);
}

const schema = readJson(SCHEMA_PATH);
assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
assert.equal(schema.additionalProperties, false);
assert.equal(schema.properties.marker.const, MARKER);
assert.equal(schema.properties.protocol.const, PROTOCOL);
assert.equal(schema.properties.chain.properties.chain_id.const, CHAIN_ID);
assert.equal(
  schema.properties.compiler_profile.properties.evm_version.const,
  EVM_VERSION,
);
assert.equal(
  schema.properties.compiler_profile.properties.release.const,
  SOLC_RELEASE,
);
assert.equal(schema.properties.decision.properties.status.const, DECISION);
assert.equal(schema.properties.ordered_gates.minItems, 11);
assert.equal(schema.properties.ordered_gates.maxItems, 11);
assert.equal(schema.properties.authority.required.length, AUTHORITY_KEYS.length);
for (const key of AUTHORITY_KEYS) {
  assert.equal(schema.properties.authority.properties[key].const, false, key);
}

const doc = read(DOC_PATH);
for (const required of [
  MARKER,
  DECISION,
  "Solidity 0.8.20",
  "Shanghai",
  "PUSH0",
  "`paris`",
  "Standard JSON",
  "two independent",
  "does not run `solc`",
  "does not authorize",
  PREPARATION_MARKER,
]) {
  assert.ok(doc.includes(required), `documentation missing ${required}`);
}

const workflow = read(WORKFLOW_PATH);
for (const required of [
  "actions/checkout@v6",
  "actions/setup-node@v6",
  'node-version: "22"',
  "npm ci --ignore-scripts --no-audit --no-fund",
  `python3 -m json.tool ${SCHEMA_PATH}`,
  `node --check ${TOOL_PATH}`,
  "node --check scripts/prove_void_validator_candidate_registry_compiler_profile_v1.mjs",
  "node scripts/prove_void_validator_candidate_registry_compiler_profile_v1.mjs",
  "npm run typecheck",
  "permissions:\n  contents: read",
]) {
  assert.ok(workflow.includes(required), `workflow missing ${required}`);
}
assert.equal(workflow.includes("workflow_dispatch"), false);
assert.equal(workflow.includes("contents: write"), false);

console.log(JSON.stringify({
  marker: MARKER,
  compiler_profile_id: packet.compiler_profile_id,
  source_commit: SOURCE_COMMIT,
  contract_source_sha256: packet.source.contract_source_sha256,
  preparation_id: packet.source.preparation_id,
  standard_json_input_sha256:
    packet.compiler_profile.standard_json_input_sha256,
  compiler_release: SOLC_RELEASE,
  evm_version: EVM_VERSION,
  shanghai_support_assumed: false,
  push0_dependency_permitted: false,
  compiler_executed: false,
  compiler_outputs_compared: false,
  creation_bytecode_reviewed: false,
  runtime_bytecode_reviewed: false,
  transaction_construction_authorized: false,
  signing_authorized: false,
  transaction_broadcast_authorized: false,
  contract_deployment_authorized: false,
  fund_movement_authorized: false,
  decision: DECISION,
  status: "GREEN",
}, null, 2));
console.log(`${MARKER}_PROOF_GREEN`);
