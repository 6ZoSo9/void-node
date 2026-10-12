import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  CONTRACT_NAME,
  CONTRACT_PATH,
  EVM_VERSION,
  SOLC_RELEASE,
  VOID_DATANET_CONTENT_COMMITMENT_COMPILER_PROFILE_V1,
  buildStandardJsonInput,
  compilerProfileSummary,
  sha256,
} from "../tools/datanet-content-commitment-compiler-profile-v1.mjs";
import {
  AUTHORITY,
  DECISION,
  ENVIRONMENT_MARKER,
  VOID_DATANET_CONTENT_COMMITMENT_DUAL_COMPILER_IDENTITY_V1,
  parseCompilerOutput,
  reviewDatanetContentCommitmentDualCompilerV1,
  validateCompilerEnvironment,
} from "../tools/datanet-content-commitment-dual-compiler-identity-v1.mjs";

const ROOT = process.cwd();
const sourceBytes = fs.readFileSync(path.join(ROOT, CONTRACT_PATH));
const sourceText = sourceBytes.toString("utf8");
const input = buildStandardJsonInput(sourceText);
const inputBytes = Buffer.from(JSON.stringify(input, null, 2) + "\n");

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
      compilationTarget: { [CONTRACT_PATH]: CONTRACT_NAME },
      evmVersion: EVM_VERSION,
      libraries: {},
      metadata: {
        appendCBOR: true,
        bytecodeHash: "ipfs",
        useLiteralContent: true,
      },
      optimizer: { enabled: false, runs: 200 },
      remappings: [],
      viaIR: false,
    },
    sources: {
      [CONTRACT_PATH]: {
        keccak256: "0x" + "11".repeat(32),
        license: "MIT",
        urls: [],
      },
    },
    version: 1,
  });
}
function withMetadata(executableHex) {
  const metadataHex = "00";
  return executableHex + metadataHex + (metadataHex.length / 2).toString(16).padStart(4, "0");
}
function ast() {
  return {
    nodeType: "SourceUnit",
    id: 100,
    nodes: [{
      nodeType: "ContractDefinition",
      id: 101,
      name: CONTRACT_NAME,
      nodes: [
        {
          nodeType: "VariableDeclaration",
          id: 1,
          name: "publisher",
          stateVariable: true,
          mutability: "immutable",
        },
        {
          nodeType: "VariableDeclaration",
          id: 2,
          name: "predecessor",
          stateVariable: true,
          mutability: "immutable",
        },
      ],
    }],
  };
}
function output() {
  const creationExecutable = "600060005260006000f3";
  const runtimeExecutable =
    "60006000" + "00".repeat(32) + "00".repeat(32) + "00";
  return {
    contracts: {
      [CONTRACT_PATH]: {
        [CONTRACT_NAME]: {
          abi: [],
          metadata: metadata(),
          storageLayout: { storage: [], types: {} },
          evm: {
            methodIdentifiers: {
              "commit(bytes32,bytes32,uint64)": "aabbccdd",
              "isCommitted(bytes32)": "11223344",
              "publisher()": "22334455",
              "predecessor()": "33445566",
            },
            bytecode: {
              object: withMetadata(creationExecutable),
              opcodes: "PUSH1 0x00 PUSH1 0x00 MSTORE PUSH1 0x00 PUSH1 0x00 RETURN",
              sourceMap: "0:1:0",
              linkReferences: {},
            },
            deployedBytecode: {
              object: withMetadata(runtimeExecutable),
              opcodes: "PUSH1 0x00 PUSH1 0x00 STOP",
              sourceMap: "0:1:0",
              linkReferences: {},
              immutableReferences: {
                "1": [{ start: 4, length: 32 }],
                "2": [{ start: 36, length: 32 }],
              },
            },
          },
        },
      },
    },
    sources: { [CONTRACT_PATH]: { id: 0, ast: ast() } },
    errors: [{ severity: "warning", type: "Warning", message: "fixture" }],
  };
}
function bytes(value, prefix = "") {
  return Buffer.from(prefix + JSON.stringify(value) + "\n");
}

const envA = {
  marker: ENVIRONMENT_MARKER,
  compiler_release: SOLC_RELEASE,
  kind: "native-container",
  implementation: "ethereum-solc-native-linux-amd64",
  version_output: "solc Version: " + SOLC_RELEASE + ".Linux.g++",
  artifact_identity: "docker:ethereum/solc:0.8.24",
};
const envB = {
  marker: ENVIRONMENT_MARKER,
  compiler_release: SOLC_RELEASE,
  kind: "solcjs",
  implementation: "solc-js-emscripten",
  version_output: SOLC_RELEASE + ".Emscripten.clang",
  artifact_identity: "npm:solc@0.8.24",
};

const profile = compilerProfileSummary(sourceText);
assert.equal(profile.marker, VOID_DATANET_CONTENT_COMMITMENT_COMPILER_PROFILE_V1);
assert.equal(profile.release, SOLC_RELEASE);
assert.equal(profile.evm_version, "paris");
assert.equal(profile.optimizer_enabled, false);
assert.equal(profile.optimizer_runs, 200);

const parsed = parseCompilerOutput(bytes(output()), "fixture");
assert.ok(parsed.creation.bytes > 0);
assert.ok(parsed.runtime_template.bytes > 60);
assert.deepEqual(Object.keys(parsed.immutable_layout).sort(), ["predecessor", "publisher"]);
assert.deepEqual(parsed.immutable_layout.publisher.references, [{ start: 4, length: 32 }]);
assert.deepEqual(parsed.immutable_layout.predecessor.references, [{ start: 36, length: 32 }]);

const validatedA = validateCompilerEnvironment(envA, "compiler_a");
const validatedB = validateCompilerEnvironment(envB, "compiler_b");
assert.notEqual(validatedA.fingerprint_sha256, validatedB.fingerprint_sha256);

const reviewed = reviewDatanetContentCommitmentDualCompilerV1({
  sourceBytes,
  inputBytes,
  outputABytes: bytes(output()),
  outputBBytes: bytes(output(), ">>> fixture leading compiler text\n"),
  environmentA: envA,
  environmentB: envB,
  sourceCommit: "c793268b3216075e3d9ab8139862a2e5e9fc4437",
  sourceRef: "main",
  reviewedAt: "2026-09-22T00:20:00.000Z",
});
assert.match(reviewed.identity_id, /^voiddccci1_[0-9a-f]{64}$/);
assert.equal(reviewed.marker, VOID_DATANET_CONTENT_COMMITMENT_DUAL_COMPILER_IDENTITY_V1);
assert.equal(reviewed.decision.status, DECISION);
assert.equal(reviewed.comparison.creation_bytecode_exact_match, true);
assert.equal(reviewed.comparison.runtime_template_exact_match, true);
assert.equal(reviewed.comparison.immutable_layout_exact_match, true);
assert.deepEqual(
  Object.keys(reviewed.artifacts.immutable_layout).sort(),
  ["predecessor", "publisher"],
);
assert.equal(reviewed.deployment_identity_requirements.constructor_signature, "constructor(address,address)");
assert.deepEqual(reviewed.deployment_identity_requirements.constructor_order, ["publisher", "predecessor"]);
assert.equal(reviewed.deployment_identity_requirements.live_registry_version_must_equal, "1");
assert.equal(reviewed.deployment_identity_requirements.live_max_object_bytes_must_equal, "268435456");
assert.equal(reviewed.unresolved.compiled_identity_committed, false);
assert.equal(reviewed.unresolved.registry_contract_address, null);
assert.equal(reviewed.unresolved.transaction_construction_authorized, false);
assert.equal(reviewed.unresolved.chain2050_write_authorized, false);
assert.equal(Object.values(reviewed.authority).every((value) => value === false), true);

function expect(code, mutate) {
  const fixtureA = output();
  const fixtureB = output();
  const state = {
    sourceBytes: Buffer.from(sourceBytes),
    inputBytes: Buffer.from(inputBytes),
    outputABytes: bytes(fixtureA),
    outputBBytes: bytes(fixtureB),
    environmentA: structuredClone(envA),
    environmentB: structuredClone(envB),
  };
  mutate(state, fixtureA, fixtureB);
  assert.throws(
    () => reviewDatanetContentCommitmentDualCompilerV1({
      ...state,
      sourceCommit: "c793268b3216075e3d9ab8139862a2e5e9fc4437",
      sourceRef: "main",
      reviewedAt: "2026-09-22T00:20:00.000Z",
    }),
    (error) => error?.code === code,
    "expected " + code,
  );
}
expect("compiler_environments_not_independent", (state) => {
  state.environmentB = structuredClone(state.environmentA);
});
expect("creation_bytecode_mismatch", (state, _a, b) => {
  b.contracts[CONTRACT_PATH][CONTRACT_NAME].evm.bytecode.object =
    withMetadata("600160005260006000f3");
  state.outputBBytes = bytes(b);
});
expect("runtime_template_mismatch", (state, _a, b) => {
  b.contracts[CONTRACT_PATH][CONTRACT_NAME].evm.deployedBytecode.object =
    withMetadata("60006000" + "00".repeat(64) + "01");
  state.outputBBytes = bytes(b);
});
expect("immutable_layout_mismatch", (state, _a, b) => {
  b.contracts[CONTRACT_PATH][CONTRACT_NAME].evm.deployedBytecode.immutableReferences["2"] =
    [{ start: 37, length: 32 }];
  state.outputBBytes = bytes(b);
});
expect("compiler_metadata_profile_mismatch", (state, a) => {
  const m = JSON.parse(a.contracts[CONTRACT_PATH][CONTRACT_NAME].metadata);
  m.settings.optimizer.enabled = true;
  a.contracts[CONTRACT_PATH][CONTRACT_NAME].metadata = JSON.stringify(m);
  state.outputABytes = bytes(a);
});
expect("compiler_reported_errors", (state, a) => {
  a.errors.push({ severity: "error", type: "TypeError", message: "fixture" });
  state.outputABytes = bytes(a);
});
expect("link_references_present", (state, a) => {
  a.contracts[CONTRACT_PATH][CONTRACT_NAME].evm.bytecode.linkReferences = {
    "L.sol": { L: [{ start: 1, length: 20 }] },
  };
  state.outputABytes = bytes(a);
});
expect("compiler_environment_sensitive_field_forbidden", (state) => {
  state.environmentA.private_key = "forbidden";
});

const cliText = fs.readFileSync(
  path.join(ROOT, "tools/datanet-content-commitment-compile-identity-cli-v1.mjs"),
  "utf8",
);
for (const required of [
  'command === "input"',
  'command === "review"',
  "fs.constants.O_EXCL",
  "0o600",
  "compiler_execution: false",
  "rpc_call: false",
  "deployment: false",
  "chain2050_write: false",
]) {
  assert.ok(cliText.includes(required), "cli missing " + required);
}
for (const forbidden of [
  "JsonRpcProvider",
  "broadcastTransaction",
  "sendTransaction",
  "forge create",
  "cast send",
  "--private-key",
]) {
  assert.equal(cliText.includes(forbidden), false, "cli contains forbidden " + forbidden);
}

assert.equal(AUTHORITY.deployment, false);
assert.equal(AUTHORITY.transaction_construction, false);
assert.equal(AUTHORITY.transaction_broadcast, false);
assert.equal(AUTHORITY.chain2050_write, false);

console.log("VOID_DATANET_CONTENT_COMMITMENT_COMPILE_IDENTITY_V1_PROOF_GREEN");
console.log("solc_release=" + SOLC_RELEASE);
console.log("evm_version=paris");
console.log("optimizer_enabled=false");
console.log("dual_environment_gate=true");
console.log("creation_bytecode_exact_match=true");
console.log("runtime_template_exact_match=true");
console.log("immutable_layout_exact_match=true");
console.log("immutable_publisher_bound=true");
console.log("immutable_predecessor_bound=true");
console.log("compiled_identity_committed=false");
console.log("deployment_attested=false");
console.log("transaction_construction=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
