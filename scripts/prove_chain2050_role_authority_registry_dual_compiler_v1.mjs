#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  CONTRACT_NAME,
  CONTRACT_PATH,
  DECISION,
  EMPTY_REGISTRY_ROOT_SHA256,
  EVM_VERSION,
  MARKER,
  PROTOCOL,
  SOLC_RELEASE,
  buildStandardJsonInput,
  canonicalJson,
  parseCompilerOutput,
  reviewDualCompilerOutputs,
  sha256,
  validateCompilerEnvironment,
} from "../tools/chain2050-role-authority-registry-dual-compiler-v1.mjs";

const ROOT = process.cwd();
const sourceBytes = fs.readFileSync(
  path.join(ROOT, CONTRACT_PATH),
);
const sourceText = sourceBytes.toString("utf8");
const input = buildStandardJsonInput(sourceText);
const inputBytes = Buffer.from(
  JSON.stringify(input, null, 2) + "\n",
);

function metadata() {
  return JSON.stringify({
    compiler: { version: SOLC_RELEASE },
    language: "Solidity",
    output: {
      abi: [],
      devdoc: { kind: "dev", methods: {}, version: 1 },
      userdoc: { kind: "user", methods: {}, version: 1 },
    },
    settings: {
      compilationTarget: {
        [CONTRACT_PATH]: CONTRACT_NAME,
      },
      evmVersion: EVM_VERSION,
      libraries: {},
      metadata: {
        appendCBOR: true,
        bytecodeHash: "ipfs",
        useLiteralContent: true,
      },
      optimizer: { enabled: true, runs: 200 },
      remappings: [],
      viaIR: true,
    },
    sources: {
      [CONTRACT_PATH]: {
        keccak256: "0x" + "ab".repeat(32),
        license: "MIT",
        urls: ["fixture"],
      },
    },
    version: 1,
  });
}

function syntheticOutput() {
  const runtime =
    "6000" + "00".repeat(32) + "6001";
  return {
    contracts: {
      [CONTRACT_PATH]: {
        [CONTRACT_NAME]: {
          abi: [
            {
              inputs: [
                {
                  internalType: "address",
                  name: "initialOwner",
                  type: "address",
                },
              ],
              stateMutability: "nonpayable",
              type: "constructor",
            },
          ],
          metadata: metadata(),
          storageLayout: {
            storage: [],
            types: {},
          },
          evm: {
            methodIdentifiers: {
              "entryCount()": "b0cb6b85",
            },
            bytecode: {
              object: "6001600055",
              opcodes: "PUSH1 0x01 PUSH1 0x00 SSTORE",
              sourceMap: "0:1:0",
              linkReferences: {},
            },
            deployedBytecode: {
              object: runtime,
              opcodes:
                "PUSH1 0x00 PUSH1 0x00 PUSH1 0x01",
              sourceMap: "0:1:0",
              linkReferences: {},
              immutableReferences: {
                "123": [{ start: 2, length: 32 }],
              },
            },
          },
        },
      },
    },
    sources: {
      [CONTRACT_PATH]: { id: 0 },
    },
    errors: [],
  };
}

function bytes(value, prefix = "") {
  return Buffer.from(
    prefix + JSON.stringify(value) + "\n",
  );
}

const environmentA = {
  marker: "VOID_SOLC_COMPILER_ENVIRONMENT_V1",
  compiler_release: SOLC_RELEASE,
  kind: "native-container",
  implementation: "ethereum-solc-native-linux-amd64",
  version_output:
    "Version: " + SOLC_RELEASE + ".Linux.g++",
  artifact_identity: "sha256:native-fixture",
  image_digest: "sha256:" + "11".repeat(32),
};

const environmentB = {
  marker: "VOID_SOLC_COMPILER_ENVIRONMENT_V1",
  compiler_release: SOLC_RELEASE,
  kind: "npm-solcjs",
  implementation: "solc-js-emscripten",
  version_output: SOLC_RELEASE + ".Emscripten.clang",
  artifact_identity: "sha256:soljson-fixture",
  node_version: "v24.0.0",
  soljson_sha256: "22".repeat(32),
};

assert.equal(
  MARKER,
  "VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_DUAL_COMPILER_V1",
);
assert.equal(
  PROTOCOL,
  "void-chain2050-role-authority-registry-dual-compiler/1",
);
assert.equal(
  DECISION,
  "HOLD_PENDING_SOVEREIGN_BYTECODE_REVIEW_OWNER_DEPLOYER_BINDING_AND_UNSIGNED_DEPLOYMENT_TRANSACTION",
);
assert.equal(EVM_VERSION, "paris");
assert.equal(
  buildStandardJsonInput(sourceText).settings.viaIR,
  true,
);
assert.equal(SOLC_RELEASE, "0.8.20+commit.a1b79de6");
assert.match(EMPTY_REGISTRY_ROOT_SHA256, /^[a-f0-9]{64}$/);

const parsed = parseCompilerOutput(
  bytes(syntheticOutput()),
  "fixture",
);
assert.equal(parsed.runtime_template.immutable_references.length, 1);
assert.equal(
  parsed.runtime_template.immutable_references[0].start,
  2,
);
const expectedRuntime = Buffer.from(
  syntheticOutput()
    .contracts[CONTRACT_PATH][CONTRACT_NAME]
    .evm.deployedBytecode.object,
  "hex",
);
Buffer.from(EMPTY_REGISTRY_ROOT_SHA256, "hex").copy(
  expectedRuntime,
  2,
);
assert.equal(
  parsed.expected_deployed_runtime.sha256,
  sha256(expectedRuntime),
);

const envA = validateCompilerEnvironment(
  environmentA,
  "fixture_a",
);
const envB = validateCompilerEnvironment(
  environmentB,
  "fixture_b",
);
assert.notEqual(
  envA.fingerprint_sha256,
  envB.fingerprint_sha256,
);

const review = reviewDualCompilerOutputs({
  sourceBytes,
  inputBytes,
  outputABytes: bytes(syntheticOutput()),
  outputBBytes: bytes(
    syntheticOutput(),
    ">>> Cannot retry compilation with SMT because there are no SMT solvers available.\n",
  ),
  environmentA,
  environmentB,
  sourceCommit: "11".repeat(20),
  sourceRef: "proof",
  reviewedAt: "2026-09-22T07:30:00.000Z",
});

assert.equal(review.decision.status, DECISION);
assert.equal(
  review.comparison.creation_bytecode_exact_match,
  true,
);
assert.equal(
  review.comparison.runtime_template_exact_match,
  true,
);
assert.equal(
  review.comparison.expected_deployed_runtime_exact_match,
  true,
);
assert.equal(
  review.artifacts.constructor_owner_address,
  null,
);
assert.equal(review.artifacts.deployment_data_sha256, null);
assert.equal(
  review.unresolved.sovereign_bytecode_acceptance,
  false,
);
assert.equal(
  review.unresolved.owner_address,
  null,
);
assert.equal(
  review.unresolved.deployer_address,
  null,
);
assert.equal(
  Object.values(review.authority).every(
    (value) => value === false,
  ),
  true,
);

function expectHold(code, mutate) {
  const fixture = {
    outputA: syntheticOutput(),
    outputB: syntheticOutput(),
    envA: structuredClone(environmentA),
    envB: structuredClone(environmentB),
    input: structuredClone(input),
    source: Buffer.from(sourceBytes),
  };
  mutate(fixture);
  assert.throws(
    () =>
      reviewDualCompilerOutputs({
        sourceBytes: fixture.source,
        inputBytes: bytes(fixture.input),
        outputABytes: bytes(fixture.outputA),
        outputBBytes: bytes(fixture.outputB),
        environmentA: fixture.envA,
        environmentB: fixture.envB,
        sourceCommit: "22".repeat(20),
        sourceRef: "proof",
        reviewedAt: "2026-09-22T07:30:00.000Z",
      }),
    (error) => error?.code === code,
    "expected " + code,
  );
}

expectHold("runtime_template_mismatch", (f) => {
  f.outputB.contracts[CONTRACT_PATH][CONTRACT_NAME]
    .evm.deployedBytecode.object += "00";
});
expectHold("compiler_environments_not_independent", (f) => {
  f.envB = structuredClone(f.envA);
});
expectHold("compiler_input_profile_mismatch", (f) => {
  f.input.settings.evmVersion = "shanghai";
});
expectHold("compiler_a_immutable_reference_invalid", (f) => {
  f.outputA.contracts[CONTRACT_PATH][CONTRACT_NAME]
    .evm.deployedBytecode.immutableReferences["123"][0]
    .length = 31;
});
expectHold("runtime_immutable_placeholder_not_zero", (f) => {
  const contract =
    f.outputA.contracts[CONTRACT_PATH][CONTRACT_NAME];
  contract.evm.deployedBytecode.object =
    "6000" + "01" + "00".repeat(31) + "6001";
});

const workflow = fs.readFileSync(
  path.join(
    ROOT,
    ".github/workflows/chain2050-role-authority-registry-dual-compiler-v1.yml",
  ),
  "utf8",
);
for (const required of [
  "ethereum/solc:0.8.20",
  "solc@0.8.20",
  "--standard-json",
  "creation_bytecode_sha256",
  "expected_deployed_runtime_sha256",
]) {
  assert.equal(
    workflow.includes(required),
    true,
    "workflow missing " + required,
  );
}

console.log(MARKER + "_PROOF_GREEN");
console.log(
  "standard_json_input_canonical_sha256=" +
    sha256(canonicalJson(input)),
);
console.log("dual_environment_gate=true");
console.log("owner_binding=false");
console.log("deployer_binding=false");
console.log("transaction_construction=false");
console.log("deployment_authorized=false");
