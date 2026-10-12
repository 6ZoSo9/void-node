#!/usr/bin/env node
import crypto from "node:crypto";

export const VOID_BUY_VOID_PRESALE_FULFILLMENT_COMPILER_PROFILE_V1 =
  "VOID_BUY_VOID_PRESALE_FULFILLMENT_COMPILER_PROFILE_V1";

export const CONTRACT_PATH =
  "contracts/mainnet/BuyVoidPresaleFulfillmentV1.sol";
export const CONTRACT_NAME =
  "BuyVoidPresaleFulfillmentV1";
export const SOLC_VERSION = "0.8.24";
export const SOLC_RELEASE =
  "0.8.24+commit.e11b9ed9";
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
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

export function canonicalJson(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map(
        (key) =>
          JSON.stringify(key) +
          ":" +
          canonicalJson(value[key]),
      )
      .join(",") +
    "}"
  );
}

export function validateSourceText(sourceText) {
  if (
    typeof sourceText !== "string" ||
    sourceText.length < 1 ||
    sourceText.length > 1024 * 1024
  ) {
    throw new Error(
      "buy_void_fulfillment_compile_source_invalid",
    );
  }
  for (const required of [
    "contract BuyVoidPresaleFulfillmentV1",
    "uint256 public constant override maxInventoryAtoms = 10_000_000 ether;",
    "IBuyVoidTokenV1 public immutable token;",
    "address public immutable fulfiller;",
    "IBuyVoidPresaleFulfillmentHistoryV1 public immutable predecessor;",
    "function fulfill(bytes32 paymentDeliveryId, address recipient, uint256 amountAtoms) external",
    "if (msg.sender != fulfiller) revert NotFulfiller();",
    "if (isFulfilled(paymentDeliveryId)) revert AlreadyFulfilled(paymentDeliveryId);",
    "bool transferred = token.transfer(recipient, amountAtoms);",
    "emit Fulfilled(paymentDeliveryId, recipient, amountAtoms, block.number);",
  ]) {
    if (!sourceText.includes(required)) {
      throw new Error(
        "buy_void_fulfillment_compile_source_contract_mismatch:" +
          required,
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
      [CONTRACT_PATH]: {
        content: sourceText,
      },
    },
    settings: {
      remappings: [],
      optimizer: {
        enabled: false,
        runs: 200,
      },
      evmVersion: EVM_VERSION,
      viaIR: false,
      debug: {
        revertStrings: "default",
      },
      metadata: {
        appendCBOR: true,
        useLiteralContent: true,
        bytecodeHash: "ipfs",
      },
      libraries: {},
      outputSelection: {
        "*": {
          "": ["ast"],
        },
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
    marker:
      VOID_BUY_VOID_PRESALE_FULFILLMENT_COMPILER_PROFILE_V1,
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
    standard_json_input_canonical_sha256:
      sha256(canonicalJson(input)),
    authority: {
      compiler_execution: false,
      rpc_call: false,
      credential_access: false,
      wallet_access: false,
      signing: false,
      transaction_broadcast: false,
      deployment: false,
      inventory_funding: false,
      money_movement: false,
    },
  };
}
