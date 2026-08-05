#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  CONTRACT_NAME,
  CONTRACT_PATH,
  EVM_VERSION,
  SOLC_RELEASE,
  buildStandardJsonInput,
  canonicalJson,
  sha256,
} from "../tools/void-validator-candidate-registry-compiler-profile-v1.mjs";
import {
  AUTHORITY_KEYS,
  DECISION,
  ENVIRONMENT_MARKER,
  MARKER,
  PROTOCOL,
  parseCompilerOutput,
  reviewDualCompilerOutputs,
  validateCompilerEnvironment,
} from "../tools/void-validator-candidate-registry-dual-compiler-reproducibility-v1.mjs";

const ROOT = process.cwd();
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");
const sourceBytes = fs.readFileSync(path.join(ROOT, CONTRACT_PATH));
const sourceText = sourceBytes.toString("utf8");
const compilerInput = buildStandardJsonInput(sourceText);
const inputBytes = Buffer.from(`${JSON.stringify(compilerInput, null, 2)}\n`);
const FIXED_TIME = "2026-08-05T11:00:00.000Z";
const SOURCE_COMMIT = "66bb6113f0164872a9a40dd4837bdfe9dc9c7e6b";

function clone(value) {
  return structuredClone(value);
}

function metadataObject() {
  return {
    compiler: { version: SOLC_RELEASE },
    language: "Solidity",
    output: {
      abi: [],
      devdoc: { kind: "dev", methods: {}, version: 1 },
      userdoc: { kind: "user", methods: {}, version: 1 },
    },
    settings: {
      compilationTarget: { [CONTRACT_PATH]: CONTRACT_NAME },
      evmVersion: EVM_VERSION,
      libraries: {},
      metadata: {
        appendCBOR: true,
        bytecodeHash: "ipfs",
        useLiteralContent: true,
      },
      optimizer: { enabled: true, runs: 200 },
      remappings: [],
      viaIR: false,
    },
    sources: {
      [CONTRACT_PATH]: {
        keccak256: `0x${"ab".repeat(32)}`,
        license: "MIT",
        urls: ["bzz-raw://fixture", "dweb:/ipfs/fixture"],
      },
    },
    version: 1,
  };
}

function syntheticOutput() {
  const abi = [
    {
      inputs: [
        { internalType: "uint256", name: "_minValidatorStake", type: "uint256" },
        { internalType: "uint256", name: "_maxActiveValidators", type: "uint256" },
        { internalType: "uint256", name: "_activationChurnLimit", type: "uint256" },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    },
    {
      inputs: [],
      name: "minValidatorStake",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  ];
  const storageLayout = {
    storage: [
      {
        astId: 1,
        contract: `${CONTRACT_PATH}:${CONTRACT_NAME}`,
        label: "owner",
        offset: 0,
        slot: "0",
        type: "t_address",
      },
    ],
    types: {
      t_address: {
        encoding: "inplace",
        label: "address",
        numberOfBytes: "20",
      },
    },
  };
  const methodIdentifiers = {
    "minValidatorStake()": "fe3de339",
    "registerCandidate(address,bytes32,bytes32)": "792bc49b",
  };
  return {
    contracts: {
      [CONTRACT_PATH]: {
        [CONTRACT_NAME]: {
          abi,
          metadata: JSON.stringify(metadataObject()),
          storageLayout,
          evm: {
            methodIdentifiers,
            bytecode: {
              object: "6080604052348015600f57600080fd5b506001600055",
              opcodes:
                "PUSH1 0x80 PUSH1 0x40 MSTORE CALLVALUE DUP1 ISZERO PUSH1 0x0F JUMPI PUSH1 0x00 DUP1 REVERT JUMPDEST POP PUSH1 0x01 PUSH1 0x00 SSTORE",
              sourceMap: "0:1:0;1:2:0",
              linkReferences: {},
            },
            deployedBytecode: {
              object: "60806040526001600055",
              opcodes: "PUSH1 0x80 PUSH1 0x40 MSTORE PUSH1 0x01 PUSH1 0x00 SSTORE",
              sourceMap: "0:1:0;1:2:0",
              linkReferences: {},
              immutableReferences: {
                "42": [{ start: 4, length: 32 }],
              },
            },
          },
        },
      },
    },
    sources: {
      [CONTRACT_PATH]: { id: 0 },
    },
    errors: [
      {
        component: "general",
        errorCode: "1878",
        formattedMessage: "Warning: SPDX license identifier not provided.",
        message: "SPDX license identifier not provided.",
        severity: "warning",
        sourceLocation: { end: -1, file: CONTRACT_PATH, start: -1 },
        type: "Warning",
      },
    ],
  };
}

function bytes(value, prefix = "") {
  return Buffer.from(`${prefix}${JSON.stringify(value)}\n`);
}

const environmentA = {
  marker: ENVIRONMENT_MARKER,
  compiler_release: SOLC_RELEASE,
  kind: "native-container",
  implementation: "ethereum-solc-native-linux-amd64",
  version_output: `solc, the solidity compiler commandline interface\nVersion: ${SOLC_RELEASE}.Linux.g++`,
  artifact_identity: "sha256:native-container-fixture",
  image_digest: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
};
const environmentB = {
  marker: ENVIRONMENT_MARKER,
  compiler_release: SOLC_RELEASE,
  kind: "npm-solcjs",
  implementation: "solc-js-emscripten",
  version_output: `${SOLC_RELEASE}.Emscripten.clang`,
  artifact_identity: "sha256:soljson-fixture",
  node_version: "v22.23.2",
  soljson_sha256: "22".repeat(32),
};

assert.equal(MARKER, "VOID_VALIDATOR_CANDIDATE_REGISTRY_DUAL_COMPILER_REPRODUCIBILITY_V1");
assert.equal(PROTOCOL, "void-validator-candidate-registry-dual-compiler-reproducibility/1");
assert.equal(
  DECISION,
  "HOLD_PENDING_ZOSO_BYTECODE_REVIEW_DEPLOYER_OWNER_BINDING_AND_UNSIGNED_TRANSACTION",
);
assert.equal(AUTHORITY_KEYS.length, 18);
assert.equal(new Set(AUTHORITY_KEYS).size, 18);
assert.equal(canonicalJson({ b: 2, a: 1 }), '{"a":1,"b":2}');

const outputA = syntheticOutput();
const outputB = clone(outputA);
const outputABytes = bytes(outputA);
const outputBBytes = bytes(outputB, ">>> Cannot retry compilation with SMT because there are no SMT solvers available.\n");

const parsedA = parseCompilerOutput(outputABytes, "fixture_a");
const parsedB = parseCompilerOutput(outputBBytes, "fixture_b");
assert.equal(parsedA.creation.object, parsedB.creation.object);
assert.equal(parsedA.runtime.object, parsedB.runtime.object);
assert.equal(parsedA.warning_count, 1);
assert.equal(parsedB.warning_count, 1);
assert.equal(parsedA.creation.bytes > 0, true);
assert.equal(parsedA.runtime.bytes > 0, true);
assert.equal(parsedA.creation.opcodes.includes("PUSH0"), false);
assert.equal(parsedA.runtime.opcodes.includes("PUSH0"), false);

const envA = validateCompilerEnvironment(environmentA, "fixture_a");
const envB = validateCompilerEnvironment(environmentB, "fixture_b");
assert.notEqual(envA.fingerprint_sha256, envB.fingerprint_sha256);

const review = reviewDualCompilerOutputs({
  sourceBytes,
  inputBytes,
  outputABytes,
  outputBBytes,
  environmentA,
  environmentB,
  sourceCommit: SOURCE_COMMIT,
  sourceRef: "feat/validator-registry-dual-compiler-reproducibility-v1-66bb6113",
  reviewedAt: FIXED_TIME,
});

assert.match(review.reproducibility_id, /^voidvcrdcr1_[0-9a-f]{64}$/);
assert.equal(review.marker, MARKER);
assert.equal(review.protocol, PROTOCOL);
assert.equal(review.decision.status, DECISION);
assert.equal(review.decision.compiler_outputs_reproduced, true);
assert.equal(review.decision.compiler_outputs_compared, true);
assert.equal(review.decision.bytecode_reviewed_by_zoso, false);
assert.equal(review.decision.unsigned_transaction_constructed, false);
assert.equal(review.decision.deployment_authorized, false);
assert.equal(review.decision.transaction_broadcast_authorized, false);
assert.equal(review.decision.execution_authorized, false);
assert.equal(review.comparison.distinct_environment_fingerprints, true);
assert.equal(review.comparison.creation_bytecode_exact_match, true);
assert.equal(review.comparison.runtime_bytecode_exact_match, true);
assert.equal(review.comparison.zero_link_references, true);
assert.equal(review.comparison.push0_absent_from_creation_opcodes, true);
assert.equal(review.comparison.push0_absent_from_runtime_opcodes, true);
assert.equal(review.artifacts.creation_bytecode_bytes, parsedA.creation.bytes);
assert.equal(review.artifacts.runtime_bytecode_bytes, parsedA.runtime.bytes);
assert.match(review.artifacts.creation_bytecode_sha256, /^[0-9a-f]{64}$/);
assert.match(review.artifacts.runtime_bytecode_sha256, /^[0-9a-f]{64}$/);
assert.equal(review.artifacts.constructor_abi_encoded_arguments.length, 194);
assert.equal(review.artifacts.deployment_data_bytes > parsedA.creation.bytes, true);
assert.equal(Object.keys(review.authority).length, 18);
assert.equal(Object.values(review.authority).every((value) => value === false), true);
assert.equal(review.unresolved.creation_bytecode_reviewed_by_zoso, false);
assert.equal(review.unresolved.runtime_bytecode_reviewed_by_zoso, false);
assert.equal(review.unresolved.compiler_distribution_trust_accepted, false);
assert.equal(review.unresolved.deployer_address, null);
assert.equal(review.unresolved.unsigned_transaction, null);

function expectHold(code, mutate) {
  const fixture = {
    inputBytes: Buffer.from(inputBytes),
    outputABytes: bytes(syntheticOutput()),
    outputBBytes: bytes(syntheticOutput()),
    environmentA: clone(environmentA),
    environmentB: clone(environmentB),
    sourceBytes: Buffer.from(sourceBytes),
  };
  mutate(fixture);
  assert.throws(
    () =>
      reviewDualCompilerOutputs({
        sourceBytes: fixture.sourceBytes,
        inputBytes: fixture.inputBytes,
        outputABytes: fixture.outputABytes,
        outputBBytes: fixture.outputBBytes,
        environmentA: fixture.environmentA,
        environmentB: fixture.environmentB,
        sourceCommit: SOURCE_COMMIT,
        sourceRef: "proof",
        reviewedAt: FIXED_TIME,
      }),
    (error) => error?.code === code,
    `expected ${code}`,
  );
}

expectHold("runtime_bytecode_mismatch", (fixture) => {
  const output = syntheticOutput();
  output.contracts[CONTRACT_PATH][CONTRACT_NAME].evm.deployedBytecode.object += "00";
  fixture.outputBBytes = bytes(output);
});
expectHold("compiler_reported_errors", (fixture) => {
  const output = syntheticOutput();
  output.errors.push({ severity: "error", type: "TypeError", message: "fixture" });
  fixture.outputABytes = bytes(output);
});
expectHold("link_references_present", (fixture) => {
  const output = syntheticOutput();
  output.contracts[CONTRACT_PATH][CONTRACT_NAME].evm.bytecode.linkReferences = {
    "Library.sol": { Library: [{ start: 1, length: 20 }] },
  };
  fixture.outputABytes = bytes(output);
});
expectHold("push0_opcode_forbidden_for_paris_profile", (fixture) => {
  const output = syntheticOutput();
  output.contracts[CONTRACT_PATH][CONTRACT_NAME].evm.bytecode.opcodes += " PUSH0";
  fixture.outputABytes = bytes(output);
});
expectHold("compiler_environments_not_independent", (fixture) => {
  fixture.environmentB = clone(fixture.environmentA);
});
expectHold("compiler_input_profile_mismatch", (fixture) => {
  const input = clone(compilerInput);
  input.settings.evmVersion = "shanghai";
  fixture.inputBytes = bytes(input);
});
expectHold("compiler_metadata_profile_mismatch", (fixture) => {
  const output = syntheticOutput();
  const metadata = metadataObject();
  metadata.settings.evmVersion = "shanghai";
  output.contracts[CONTRACT_PATH][CONTRACT_NAME].metadata = JSON.stringify(metadata);
  fixture.outputABytes = bytes(output);
});
expectHold("contract_source_contract_mismatch", (fixture) => {
  fixture.sourceBytes = Buffer.from("contract NotTheRegistry {}\n");
});
expectHold("compiler_a_environment_contract_mismatch", (fixture) => {
  fixture.environmentA.compiler_release = "0.8.19+commit.7dd6d404";
});
expectHold("compiler_environment_sensitive_field_forbidden", (fixture) => {
  fixture.environmentA.api_token = "forbidden";
});

const tool = read(
  "tools/void-validator-candidate-registry-dual-compiler-reproducibility-v1.mjs",
);
for (const required of [
  "creation_bytecode_mismatch",
  "runtime_bytecode_mismatch",
  "compiler_environments_not_independent",
  "push0_opcode_forbidden_for_paris_profile",
  "link_references_present",
  "compiler_distribution_trust_accepted: false",
  "creation_bytecode_reviewed_by_zoso: false",
  "transaction_construction_authorized",
]) {
  assert.ok(tool.includes(required), `tool missing ${required}`);
}
for (const forbidden of [
  'spawnSync("solc"',
  'spawnSync("docker"',
  "JsonRpcProvider",
  "broadcastTransaction",
  "cast send",
  "forge create",
  "--private-key",
]) {
  assert.equal(tool.includes(forbidden), false, `tool contains forbidden operation ${forbidden}`);
}

const schema = JSON.parse(
  read("schemas/void-validator-candidate-registry-dual-compiler-reproducibility-v1.schema.json"),
);
assert.equal(schema.properties.marker.const, MARKER);
assert.equal(schema.properties.protocol.const, PROTOCOL);
assert.equal(schema.properties.decision.properties.status.const, DECISION);
assert.equal(
  schema.properties.authority.required.length,
  18,
);

const documentation = read(
  "docs/operators/void-validator-candidate-registry-dual-compiler-reproducibility-v1.md",
);
for (const required of [
  "two independent compiler environments",
  "EVM target `paris`",
  "does not accept the bytecode for deployment",
  "separate ZoSo bytecode review",
  DECISION,
]) {
  assert.ok(documentation.includes(required), `documentation missing ${required}`);
}

const workflow = read(
  ".github/workflows/void-validator-candidate-registry-dual-compiler-reproducibility-v1.yml",
);
for (const required of [
  "actions/checkout@v6",
  "actions/setup-node@v6",
  'node-version: "22"',
  "ethereum/solc:0.8.20",
  "solc@0.8.20",
  "--standard-json",
  "void-validator-candidate-registry-dual-compiler-reproducibility-v1.mjs",
]) {
  assert.ok(workflow.includes(required), `workflow missing ${required}`);
}
assert.equal(workflow.includes("workflow_dispatch"), false);
assert.equal(workflow.includes("permissions:\n  contents: write"), false);
assert.equal(workflow.includes("actions/upload-artifact"), false);

console.log(
  JSON.stringify(
    {
      marker: MARKER,
      protocol: PROTOCOL,
      decision: DECISION,
      standard_json_input_canonical_sha256: sha256(canonicalJson(compilerInput)),
      creation_bytecode_sha256: review.artifacts.creation_bytecode_sha256,
      runtime_bytecode_sha256: review.artifacts.runtime_bytecode_sha256,
      dual_environment_gate: true,
      compiler_execution_in_tool: false,
      bytecode_accepted: false,
      transaction_constructed: false,
      deployment_authorized: false,
      status: "GREEN",
    },
    null,
    2,
  ),
);
console.log(`${MARKER}_PROOF_GREEN`);
