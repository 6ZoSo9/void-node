#!/usr/bin/env node
import crypto from "node:crypto";

export const VOID_DATANET_CONTENT_COMMITMENT_COMPILER_PROFILE_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_COMPILER_PROFILE_V1";

export const CONTRACT_PATH =
  "contracts/mainnet/DatanetContentCommitmentRegistryV1.sol";
export const CONTRACT_NAME =
  "DatanetContentCommitmentRegistryV1";
export const SOLC_VERSION = "0.8.24";
export const SOLC_RELEASE = "0.8.24+commit.e11b9ed9";
export const EVM_VERSION = "paris";

export const OUTPUT_SELECTION = [
  "abi",
  "metadata",
  "storageLayout",
  "evm.methodIdentifiers",
  "evm.bytecode.object",
  "evm.bytecode.opcodes",
  "evm.bytecode.sourceMap",
  "evm.bytecode.linkReferences",
  "evm.deployedBytecode.object",
  "evm.deployedBytecode.opcodes",
  "evm.deployedBytecode.sourceMap",
  "evm.deployedBytecode.linkReferences",
  "evm.deployedBytecode.immutableReferences",
];

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  return "{" + Object.keys(value).sort().map(
    (key) => JSON.stringify(key) + ":" + canonicalJson(value[key]),
  ).join(",") + "}";
}

export function validateSourceText(sourceText) {
  if (
    typeof sourceText !== "string" ||
    sourceText.length < 1 ||
    sourceText.length > 1024 * 1024
  ) {
    throw new Error("datanet_content_commitment_compile_source_invalid");
  }
  for (const required of [
    "contract DatanetContentCommitmentRegistryV1",
    "uint64 internal constant _MAX_OBJECT_BYTES = 268_435_456;",
    "address public immutable publisher;",
    "IDatanetContentCommitmentRegistryV1 public immutable predecessor;",
    "constructor(address publisher_, address predecessor_)",
    "if (publisher_ == address(0)) revert ZeroAddress();",
    "function isCommitted(bytes32 objectIdSha256) public view override returns (bool)",
    "function commit(",
    "if (msg.sender != publisher) revert NotPublisher();",
    "if (isCommitted(objectIdSha256))",
    "emit ContentCommitted(",
  ]) {
    if (!sourceText.includes(required)) {
      throw new Error(
        "datanet_content_commitment_compile_source_contract_mismatch:" + required,
      );
    }
  }
  return sourceText;
}

export function buildStandardJsonInput(sourceText) {
  validateSourceText(sourceText);
  return {
    language: "Solidity",
    sources: {
      [CONTRACT_PATH]: { content: sourceText },
    },
    settings: {
      remappings: [],
      optimizer: { enabled: false, runs: 200 },
      evmVersion: EVM_VERSION,
      viaIR: false,
      debug: { revertStrings: "default" },
      metadata: {
        appendCBOR: true,
        useLiteralContent: true,
        bytecodeHash: "ipfs",
      },
      libraries: {},
      outputSelection: {
        "*": { "": ["ast"] },
        [CONTRACT_PATH]: {
          [CONTRACT_NAME]: [...OUTPUT_SELECTION],
        },
      },
    },
  };
}

export function compilerProfileSummary(sourceText) {
  const input = buildStandardJsonInput(sourceText);
  return {
    marker: VOID_DATANET_CONTENT_COMMITMENT_COMPILER_PROFILE_V1,
    version: 1,
    contract_path: CONTRACT_PATH,
    contract_name: CONTRACT_NAME,
    compiler: "solc",
    semantic_version: SOLC_VERSION,
    release: SOLC_RELEASE,
    evm_version: EVM_VERSION,
    optimizer_enabled: false,
    optimizer_runs: 200,
    via_ir: false,
    metadata_append_cbor: true,
    metadata_use_literal_content: true,
    metadata_bytecode_hash: "ipfs",
    standard_json_input_canonical_sha256: sha256(canonicalJson(input)),
    authority: {
      compiler_execution: false,
      rpc_call: false,
      credential_access: false,
      wallet_access: false,
      signing: false,
      transaction_construction: false,
      transaction_broadcast: false,
      deployment: false,
      chain2050_write: false,
    },
  };
}
