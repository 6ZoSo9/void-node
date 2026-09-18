#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  CONTRACT_NAME,
  CONTRACT_PATH,
  EVM_VERSION,
  SOLC_RELEASE,
  VOID_BUY_VOID_PRESALE_FULFILLMENT_COMPILER_PROFILE_V1,
  buildStandardJsonInput,
  canonicalJson,
  compilerProfileSummary,
  sha256,
} from "../tools/buy-void-presale-fulfillment-compiler-profile-v1.mjs";
import {
  AUTHORITY,
  DECISION,
  ENVIRONMENT_MARKER,
  VOID_BUY_VOID_PRESALE_FULFILLMENT_DUAL_COMPILER_IDENTITY_V1,
  parseCompilerOutput,
  reviewBuyVoidPresaleFulfillmentDualCompilerV1,
  validateCompilerEnvironment,
} from "../tools/buy-void-presale-fulfillment-dual-compiler-identity-v1.mjs";

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
    compiler: {
      version: SOLC_RELEASE,
    },
    language: "Solidity",
    output: {
      abi: [],
      devdoc: {
        kind: "dev",
        methods: {},
        version: 1,
      },
      userdoc: {
        kind: "user",
        methods: {},
        version: 1,
      },
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
      optimizer: {
        enabled: false,
        runs: 200,
      },
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
  return (
    executableHex +
    metadataHex +
    (metadataHex.length / 2)
      .toString(16)
      .padStart(4, "0")
  );
}

function ast() {
  return {
    nodeType: "SourceUnit",
    id: 100,
    nodes: [
      {
        nodeType: "ContractDefinition",
        id: 101,
        name: CONTRACT_NAME,
        nodes: [
          {
            nodeType: "VariableDeclaration",
            id: 1,
            name: "token",
            stateVariable: true,
            mutability: "immutable",
          },
          {
            nodeType: "VariableDeclaration",
            id: 2,
            name: "fulfiller",
            stateVariable: true,
            mutability: "immutable",
          },
          {
            nodeType: "VariableDeclaration",
            id: 3,
            name: "predecessor",
            stateVariable: true,
            mutability: "immutable",
          },
        ],
      },
    ],
  };
}

function output() {
  const creationExecutable =
    "600060005260006000f3";
  const runtimeExecutable =
    "60006000" +
    "00".repeat(32) +
    "00".repeat(32) +
    "00".repeat(32) +
    "00";
  return {
    contracts: {
      [CONTRACT_PATH]: {
        [CONTRACT_NAME]: {
          abi: [
            {
              type: "constructor",
              inputs: [
                {
                  name: "voidToken_",
                  type: "address",
                },
                {
                  name: "fulfiller_",
                  type: "address",
                },
                {
                  name: "predecessor_",
                  type: "address",
                },
              ],
              stateMutability: "nonpayable",
            },
          ],
          metadata: metadata(),
          storageLayout: {
            storage: [],
            types: {},
          },
          evm: {
            methodIdentifiers: {
              "fulfill(bytes32,address,uint256)":
                "aabbccdd",
              "voidToken()": "11223344",
            },
            bytecode: {
              object:
                withMetadata(creationExecutable),
              opcodes:
                "PUSH1 0x00 PUSH1 0x00 MSTORE PUSH1 0x00 PUSH1 0x00 RETURN",
              sourceMap: "0:1:0",
              linkReferences: {},
            },
            deployedBytecode: {
              object:
                withMetadata(runtimeExecutable),
              opcodes:
                "PUSH1 0x00 PUSH1 0x00 STOP",
              sourceMap: "0:1:0",
              linkReferences: {},
              immutableReferences: {
                "1": [{ start: 4, length: 32 }],
                "2": [{ start: 36, length: 32 }],
                "3": [{ start: 68, length: 32 }],
              },
            },
          },
        },
      },
    },
    sources: {
      [CONTRACT_PATH]: {
        id: 0,
        ast: ast(),
      },
    },
    errors: [
      {
        severity: "warning",
        type: "Warning",
        message: "fixture",
      },
    ],
  };
}

function bytes(value, prefix = "") {
  return Buffer.from(
    prefix + JSON.stringify(value) + "\n",
  );
}

const envA = {
  marker: ENVIRONMENT_MARKER,
  compiler_release: SOLC_RELEASE,
  kind: "native-container",
  implementation: "ethereum-solc-native-linux-amd64",
  version_output:
    "solc, the solidity compiler commandline interface\nVersion: " +
    SOLC_RELEASE +
    ".Linux.g++",
  artifact_identity:
    "docker:ethereum/solc:0.8.24",
};

const envB = {
  marker: ENVIRONMENT_MARKER,
  compiler_release: SOLC_RELEASE,
  kind: "solcjs",
  implementation: "solc-js-emscripten",
  version_output:
    SOLC_RELEASE + ".Emscripten.clang",
  artifact_identity:
    "npm:solc@0.8.24",
};

const profile = compilerProfileSummary(
  sourceText,
);
assert.equal(
  profile.marker,
  VOID_BUY_VOID_PRESALE_FULFILLMENT_COMPILER_PROFILE_V1,
);
assert.equal(profile.release, SOLC_RELEASE);
assert.equal(profile.evm_version, "paris");
assert.equal(profile.optimizer_enabled, false);
assert.equal(profile.optimizer_runs, 200);
assert.match(
  profile.standard_json_input_canonical_sha256,
  /^[0-9a-f]{64}$/,
);

const parsed = parseCompilerOutput(
  bytes(output()),
  "fixture",
);
assert.ok(parsed.creation.bytes > 0);
assert.ok(parsed.runtime_template.bytes > 100);
assert.match(
  parsed.creation.keccak256,
  /^0x[0-9a-f]{64}$/,
);
assert.match(
  parsed.runtime_template.keccak256,
  /^0x[0-9a-f]{64}$/,
);
assert.deepEqual(
  Object.keys(parsed.immutable_layout).sort(),
  ["fulfiller", "predecessor", "token"],
);
assert.deepEqual(
  parsed.immutable_layout.token.references,
  [{ start: 4, length: 32 }],
);
assert.deepEqual(
  parsed.immutable_layout.fulfiller.references,
  [{ start: 36, length: 32 }],
);
assert.deepEqual(
  parsed.immutable_layout.predecessor.references,
  [{ start: 68, length: 32 }],
);

const validatedA =
  validateCompilerEnvironment(
    envA,
    "compiler_a",
  );
const validatedB =
  validateCompilerEnvironment(
    envB,
    "compiler_b",
  );
assert.notEqual(
  validatedA.fingerprint_sha256,
  validatedB.fingerprint_sha256,
);

const reviewed =
  reviewBuyVoidPresaleFulfillmentDualCompilerV1({
    sourceBytes,
    inputBytes,
    outputABytes: bytes(output()),
    outputBBytes: bytes(
      output(),
      ">>> fixture leading compiler text\n",
    ),
    environmentA: envA,
    environmentB: envB,
    sourceCommit:
      "0eccd98d9fcc55b4555cb0fcc3df802f624f4dab",
    sourceRef: "main",
    reviewedAt:
      "2026-09-18T21:15:00.000Z",
  });

assert.match(
  reviewed.identity_id,
  /^voidbvpfci1_[0-9a-f]{64}$/,
);
assert.equal(
  reviewed.marker,
  VOID_BUY_VOID_PRESALE_FULFILLMENT_DUAL_COMPILER_IDENTITY_V1,
);
assert.equal(reviewed.decision.status, DECISION);
assert.equal(
  reviewed.comparison.compiler_environments_independent,
  true,
);
assert.equal(
  reviewed.comparison.creation_bytecode_exact_match,
  true,
);
assert.equal(
  reviewed.comparison.runtime_template_exact_match,
  true,
);
assert.equal(
  reviewed.comparison.immutable_layout_exact_match,
  true,
);
assert.equal(
  reviewed.artifacts.creation_bytecode_hex.startsWith("0x"),
  true,
);
assert.equal(
  reviewed.artifacts.runtime_template_hex.startsWith("0x"),
  true,
);
assert.deepEqual(
  Object.keys(
    reviewed.artifacts.immutable_layout,
  ).sort(),
  ["fulfiller", "predecessor", "token"],
);
assert.equal(
  reviewed.deployment_identity_requirements
    .constructor_signature,
  "constructor(address,address,address)",
);
assert.deepEqual(
  reviewed.deployment_identity_requirements
    .constructor_order,
  ["void_token", "fulfiller", "predecessor"],
);
assert.equal(
  reviewed.unresolved.compiled_identity_committed,
  false,
);
assert.equal(
  reviewed.unresolved.fulfillment_contract_address,
  null,
);
assert.equal(
  reviewed.unresolved.inventory_funding_verified,
  false,
);
assert.equal(
  Object.values(reviewed.authority)
    .every((value) => value === false),
  true,
);

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
    () =>
      reviewBuyVoidPresaleFulfillmentDualCompilerV1({
        ...state,
        sourceCommit:
          "0eccd98d9fcc55b4555cb0fcc3df802f624f4dab",
        sourceRef: "main",
        reviewedAt:
          "2026-09-18T21:15:00.000Z",
      }),
    (error) => error?.code === code,
    "expected " + code,
  );
}

expect(
  "compiler_environments_not_independent",
  (state) => {
    state.environmentB =
      structuredClone(state.environmentA);
  },
);

expect(
  "creation_bytecode_mismatch",
  (state, _a, b) => {
    b.contracts[CONTRACT_PATH][CONTRACT_NAME]
      .evm.bytecode.object =
      withMetadata(
        "600160005260006000f3",
      );
    state.outputBBytes = bytes(b);
  },
);

expect(
  "runtime_template_mismatch",
  (state, _a, b) => {
    b.contracts[CONTRACT_PATH][CONTRACT_NAME]
      .evm.deployedBytecode.object =
      withMetadata(
        "60006000" +
          "00".repeat(96) +
          "01",
      );
    state.outputBBytes = bytes(b);
  },
);

expect(
  "immutable_layout_mismatch",
  (state, _a, b) => {
    b.contracts[CONTRACT_PATH][CONTRACT_NAME]
      .evm.deployedBytecode.immutableReferences[
        "3"
      ] = [{ start: 69, length: 32 }];
    state.outputBBytes = bytes(b);
  },
);

expect(
  "compiler_metadata_profile_mismatch",
  (state, a) => {
    const parsedMetadata = JSON.parse(
      a.contracts[CONTRACT_PATH][CONTRACT_NAME]
        .metadata,
    );
    parsedMetadata.settings.optimizer.enabled = true;
    a.contracts[CONTRACT_PATH][CONTRACT_NAME]
      .metadata =
      JSON.stringify(parsedMetadata);
    state.outputABytes = bytes(a);
  },
);

expect(
  "compiler_reported_errors",
  (state, a) => {
    a.errors.push({
      severity: "error",
      type: "TypeError",
      message: "fixture",
    });
    state.outputABytes = bytes(a);
  },
);

expect(
  "link_references_present",
  (state, a) => {
    a.contracts[CONTRACT_PATH][CONTRACT_NAME]
      .evm.bytecode.linkReferences = {
      "L.sol": {
        L: [{ start: 1, length: 20 }],
      },
    };
    state.outputABytes = bytes(a);
  },
);

expect(
  "push0_opcode_forbidden_for_paris_profile",
  (state, a) => {
    a.contracts[CONTRACT_PATH][CONTRACT_NAME]
      .evm.bytecode.object =
      withMetadata("5f00");
    state.outputABytes = bytes(a);
  },
);

expect(
  "compiler_input_profile_mismatch",
  (state) => {
    const changed =
      structuredClone(input);
    changed.settings.evmVersion = "shanghai";
    state.inputBytes = Buffer.from(
      JSON.stringify(changed) + "\n",
    );
  },
);

expect(
  "compiler_environment_sensitive_field_forbidden",
  (state) => {
    state.environmentA.private_key =
      "forbidden";
  },
);

const tool = fs.readFileSync(
  path.join(
    ROOT,
    "tools/buy-void-presale-fulfillment-dual-compiler-identity-v1.mjs",
  ),
  "utf8",
);
for (const forbidden of [
  "JsonRpcProvider",
  "broadcastTransaction",
  "sendTransaction",
  "forge create",
  "cast send",
  "--private-key",
]) {
  assert.equal(
    tool.includes(forbidden),
    false,
    "forbidden operation " + forbidden,
  );
}

assert.equal(
  sha256(canonicalJson(input)).length,
  64,
);
assert.equal(
  AUTHORITY.deployment,
  false,
);
assert.equal(
  AUTHORITY.inventory_funding,
  false,
);
assert.equal(
  AUTHORITY.runtime_enablement_change,
  false,
);
assert.equal(
  AUTHORITY.public_activation,
  false,
);

const cli = fs.readFileSync(
  path.join(
    ROOT,
    "tools/buy-void-presale-fulfillment-compile-identity-cli-v1.mjs",
  ),
  "utf8",
);
for (const required of [
  'command === "input"',
  'command === "review"',
  "buildStandardJsonInput",
  "reviewBuyVoidPresaleFulfillmentDualCompilerV1",
  "fs.constants.O_EXCL",
  "0o600",
  "compiler_execution: false",
  "rpc_call: false",
  "deployment: false",
]) {
  assert.ok(
    cli.includes(required),
    "cli missing " + required,
  );
}
for (const forbidden of [
  "JsonRpcProvider",
  "broadcastTransaction",
  "sendTransaction",
  "forge create",
  "cast send",
  "--private-key",
]) {
  assert.equal(
    cli.includes(forbidden),
    false,
    "cli contains forbidden " + forbidden,
  );
}

const workflow = fs.readFileSync(
  path.join(
    ROOT,
    ".github/workflows/buy-void-presale-fulfillment-compile-identity-v1.yml",
  ),
  "utf8",
);
for (const required of [
  "ethereum/solc:0.8.24",
  "0.8.24+commit.e11b9ed9",
  "npx --yes solc@0.8.24 --version",
  "npx --yes solc@0.8.24 --standard-json",
  "buy-void-presale-fulfillment-compile-identity-cli-v1.mjs",
  "compiled_identity_committed=false",
  "deployment_attested=false",
  "inventory_funding=false",
  "runtime_activation=false",
]) {
  assert.ok(
    workflow.includes(required),
    "workflow missing " + required,
  );
}
assert.ok(
  workflow.includes(
    "group: buy-void-presale-fulfillment-compile-identity-v1-${{ github.ref }}",
  ),
);
assert.equal(
  workflow.includes("actions/upload-artifact"),
  false,
);
assert.equal(
  workflow.includes("contents: write"),
  false,
);

const documentation = fs.readFileSync(
  path.join(
    ROOT,
    "docs/architecture/buy-void-presale-fulfillment-compile-identity-v1.md",
  ),
  "utf8",
);
for (const required of [
  "unpatched deployed-runtime template",
  "token",
  "fulfiller",
  "predecessor",
  "two independent compiler",
  "compiled_identity_committed=false",
  "deployment_attested=false",
  "Inventory funding",
]) {
  assert.ok(
    documentation.includes(required),
    "documentation missing " + required,
  );
}

console.log(
  "VOID_BUY_VOID_PRESALE_FULFILLMENT_COMPILE_IDENTITY_V1_PROOF_GREEN",
);
console.log("solc_release=" + SOLC_RELEASE);
console.log("evm_version=paris");
console.log("optimizer_enabled=false");
console.log("dual_environment_gate=true");
console.log("creation_bytecode_exact_match=true");
console.log("runtime_template_exact_match=true");
console.log("immutable_layout_exact_match=true");
console.log("immutable_token_bound=true");
console.log("immutable_fulfiller_bound=true");
console.log("immutable_predecessor_bound=true");
console.log("compiled_identity_committed=false");
console.log("deployment_attested=false");
console.log("inventory_funding=false");
console.log("runtime_activation=false");
console.log("public_activation=false");
