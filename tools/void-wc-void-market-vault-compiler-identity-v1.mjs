#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const VOID_WC_VOID_MARKET_VAULT_COMPILER_IDENTITY_V1 =
  "VOID_WC_VOID_MARKET_VAULT_COMPILER_IDENTITY_V1";
export const VOID_SOLC_COMPILER_ENVIRONMENT_V1 =
  "VOID_SOLC_COMPILER_ENVIRONMENT_V1";

export const CONTRACT_PATH =
  "contracts/mainnet/WCVoidMarketVaultV2.sol";
export const CONTRACT_NAME = "WCVoidMarketVaultV2";
export const SOLC_VERSION = "0.8.24";
export const SOLC_RELEASE = "0.8.24+commit.e11b9ed9";
export const EVM_VERSION = "paris";

export const EXPECTED_IMMUTABLES = Object.freeze([
  "closeoutController",
  "coupledLaunchId",
  "launchController",
  "settlementExecutor",
  "token",
]);

export const AUTHORITY = Object.freeze({
  compiler_execution: false,
  rpc_call: false,
  credential_access: false,
  wallet_or_signer_access: false,
  transaction_signing: false,
  transaction_broadcast: false,
  deployment: false,
  chain2050_write: false,
  inventory_funding: false,
  liquidity_movement: false,
  market_activation: false,
  public_presale_activation: false,
  funds_movement: false,
});

const OUTPUT_SELECTION = [
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

function fail(code, detail = undefined) {
  const error = new Error(code);
  error.code = code;
  if (detail !== undefined) error.detail = detail;
  throw error;
}

function plain(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
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
      .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
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
    fail("wc_void_market_vault_compile_source_invalid");
  }
  for (const required of [
    "contract WCVoidMarketVaultV2",
    "uint256 public constant openingInventoryAtoms = 10_000_000 ether;",
    "IWCVoidMarketTokenV2 public immutable token;",
    "address public immutable launchController;",
    "address public immutable settlementExecutor;",
    "address public immutable closeoutController;",
    "bytes32 public immutable coupledLaunchId;",
    "function proposeCloseout(",
    "function approveCloseout(",
    "function executeCloseout(",
    "successor.predecessorVault()",
  ]) {
    if (!sourceText.includes(required)) {
      fail("wc_void_market_vault_compile_source_contract_mismatch", required);
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

function normalizeHex(value, code) {
  const text = String(value ?? "").trim().toLowerCase().replace(/^0x/, "");
  if (!text || text.length % 2 !== 0 || !/^[0-9a-f]+$/.test(text)) fail(code);
  return text;
}

function containsReferences(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.length > 0;
  return Object.keys(value).some((key) => containsReferences(value[key]));
}

function diagnostics(output, label) {
  if (!Array.isArray(output?.errors)) return;
  const errors = output.errors.filter((entry) => entry?.severity === "error");
  if (errors.length > 0) {
    fail("compiler_reported_errors", {
      label,
      errors: errors.slice(0, 8).map((entry) => String(entry?.formattedMessage || entry?.message || "")),
    });
  }
}

function walkAst(value, visit) {
  if (!value || typeof value !== "object") return;
  visit(value);
  if (Array.isArray(value)) {
    for (const item of value) walkAst(item, visit);
    return;
  }
  for (const child of Object.values(value)) walkAst(child, visit);
}

function immutableDeclarations(ast) {
  const declarations = new Map();
  walkAst(ast, (node) => {
    if (
      node?.nodeType === "VariableDeclaration" &&
      node?.stateVariable === true &&
      node?.mutability === "immutable" &&
      Number.isSafeInteger(node?.id) &&
      typeof node?.name === "string"
    ) {
      declarations.set(String(node.id), node.name);
    }
  });
  return declarations;
}

function normalizeImmutableReferences(refs, ast, runtimeBytes) {
  if (!plain(refs)) fail("immutable_references_invalid");
  const declarations = immutableDeclarations(ast);
  const layout = {};
  const occupied = new Set();

  for (const [astId, rawEntries] of Object.entries(refs)) {
    const name = declarations.get(String(astId));
    if (!name) fail("immutable_reference_ast_id_unknown", astId);
    if (!Array.isArray(rawEntries) || rawEntries.length < 1) {
      fail("immutable_reference_entries_invalid", name);
    }
    const normalized = rawEntries.map((entry) => {
      if (
        !plain(entry) ||
        !Number.isSafeInteger(entry.start) ||
        !Number.isSafeInteger(entry.length) ||
        entry.start < 0 ||
        entry.length !== 32 ||
        entry.start + entry.length > runtimeBytes
      ) {
        fail("immutable_reference_range_invalid", name);
      }
      for (let offset = entry.start; offset < entry.start + entry.length; offset += 1) {
        if (occupied.has(offset)) fail("immutable_reference_overlap", offset);
        occupied.add(offset);
      }
      return { start: entry.start, length: entry.length };
    });
    layout[name] = {
      ast_id: Number(astId),
      references: normalized,
    };
  }

  const actual = Object.keys(layout).sort();
  if (canonicalJson(actual) !== canonicalJson([...EXPECTED_IMMUTABLES])) {
    fail("unexpected_immutable_layout", {
      actual,
      expected: EXPECTED_IMMUTABLES,
    });
  }
  return layout;
}

function parseMetadata(raw, label) {
  let value;
  try {
    value = JSON.parse(String(raw ?? ""));
  } catch {
    fail(label + "_metadata_json_invalid");
  }
  if (
    value?.compiler?.version !== SOLC_RELEASE ||
    value?.language !== "Solidity" ||
    value?.settings?.evmVersion !== EVM_VERSION ||
    value?.settings?.optimizer?.enabled !== false ||
    Number(value?.settings?.optimizer?.runs) !== 200 ||
    value?.settings?.metadata?.bytecodeHash !== "ipfs"
  ) {
    fail("compiler_metadata_profile_mismatch", label);
  }
  if (value?.settings?.viaIR !== undefined && value.settings.viaIR !== false) {
    fail("compiler_metadata_via_ir_mismatch", label);
  }
  return {
    text: String(raw),
    parsed: value,
  };
}

export function parseCompilerOutput(raw, label = "compiler") {
  const bytes = Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw), "utf8");
  let text = bytes.toString("utf8").trim();
  if (!text.startsWith("{")) {
    const index = text.indexOf("{");
    if (index < 0) fail(label + "_output_json_invalid");
    text = text.slice(index);
  }

  let output;
  try {
    output = JSON.parse(text);
  } catch {
    fail(label + "_output_json_invalid");
  }
  diagnostics(output, label);

  const source = output?.sources?.[CONTRACT_PATH];
  const ast = source?.ast;
  const contract = output?.contracts?.[CONTRACT_PATH]?.[CONTRACT_NAME];
  if (!plain(source) || !plain(ast) || !plain(contract)) {
    fail(label + "_contract_or_ast_missing");
  }

  const bytecode = contract?.evm?.bytecode;
  const runtime = contract?.evm?.deployedBytecode;
  if (
    !plain(bytecode) ||
    !plain(runtime) ||
    !Array.isArray(contract.abi) ||
    !plain(contract.storageLayout) ||
    !plain(contract?.evm?.methodIdentifiers)
  ) {
    fail(label + "_compiler_contract_shape_invalid");
  }
  if (
    containsReferences(bytecode.linkReferences) ||
    containsReferences(runtime.linkReferences)
  ) {
    fail("link_references_present");
  }

  const creationObject = normalizeHex(
    bytecode.object,
    label + "_creation_bytecode_invalid",
  );
  const runtimeObject = normalizeHex(
    runtime.object,
    label + "_runtime_bytecode_invalid",
  );
  const metadata = parseMetadata(contract.metadata, label);
  const immutableLayout = normalizeImmutableReferences(
    runtime.immutableReferences ?? {},
    ast,
    runtimeObject.length / 2,
  );

  return {
    raw_sha256: sha256(bytes),
    abi: contract.abi,
    metadata: metadata.text,
    storage_layout: contract.storageLayout,
    method_identifiers: contract.evm.methodIdentifiers,
    creation: {
      object: creationObject,
      bytes: creationObject.length / 2,
      sha256: sha256(Buffer.from(creationObject, "hex")),
      source_map: String(bytecode.sourceMap ?? ""),
    },
    runtime_template: {
      object: runtimeObject,
      bytes: runtimeObject.length / 2,
      sha256: sha256(Buffer.from(runtimeObject, "hex")),
      source_map: String(runtime.sourceMap ?? ""),
    },
    immutable_layout: immutableLayout,
  };
}

export function validateCompilerEnvironment(value, label) {
  if (!plain(value)) fail(label + "_environment_invalid");
  for (const key of Object.keys(value)) {
    if (/(secret|private.?key|mnemonic|seed|password|credential|api.?token)/i.test(key)) {
      fail("compiler_environment_sensitive_field_forbidden", { label, key });
    }
  }
  if (
    value.marker !== VOID_SOLC_COMPILER_ENVIRONMENT_V1 ||
    value.compiler_release !== SOLC_RELEASE ||
    typeof value.kind !== "string" ||
    !value.kind ||
    typeof value.implementation !== "string" ||
    !value.implementation ||
    typeof value.version_output !== "string" ||
    !value.version_output.includes(SOLC_RELEASE) ||
    typeof value.artifact_identity !== "string" ||
    !value.artifact_identity
  ) {
    fail(label + "_environment_contract_mismatch");
  }
  return {
    descriptor: structuredClone(value),
    fingerprint_sha256: sha256(canonicalJson(value)),
  };
}

function sameCanonical(left, right, code) {
  if (canonicalJson(left) !== canonicalJson(right)) fail(code);
}

function same(left, right, code) {
  if (left !== right) fail(code);
}

function isoTimestamp(raw) {
  const parsed = Date.parse(String(raw ?? ""));
  if (!Number.isFinite(parsed)) fail("reviewed_at_invalid");
  return new Date(parsed).toISOString();
}

export function reviewDualCompilerIdentityV1({
  sourceBytes,
  inputBytes,
  outputABytes,
  outputBBytes,
  environmentA,
  environmentB,
  sourceCommit,
  sourceRef,
  reviewedAt,
}) {
  if (!Buffer.isBuffer(sourceBytes)) fail("source_bytes_invalid");
  const sourceText = validateSourceText(sourceBytes.toString("utf8"));
  const expectedInput = buildStandardJsonInput(sourceText);

  let actualInput;
  try {
    actualInput = JSON.parse(Buffer.from(inputBytes).toString("utf8"));
  } catch {
    fail("compiler_input_json_invalid");
  }
  if (canonicalJson(actualInput) !== canonicalJson(expectedInput)) {
    fail("compiler_input_profile_mismatch");
  }

  const a = parseCompilerOutput(outputABytes, "compiler_a");
  const b = parseCompilerOutput(outputBBytes, "compiler_b");
  const envA = validateCompilerEnvironment(environmentA, "compiler_a");
  const envB = validateCompilerEnvironment(environmentB, "compiler_b");

  if (
    envA.fingerprint_sha256 === envB.fingerprint_sha256 ||
    envA.descriptor.kind === envB.descriptor.kind ||
    envA.descriptor.implementation === envB.descriptor.implementation
  ) {
    fail("compiler_environments_not_independent");
  }

  same(a.creation.object, b.creation.object, "creation_bytecode_mismatch");
  same(
    a.runtime_template.object,
    b.runtime_template.object,
    "runtime_template_mismatch",
  );
  sameCanonical(a.abi, b.abi, "abi_mismatch");
  same(a.metadata, b.metadata, "metadata_mismatch");
  sameCanonical(a.storage_layout, b.storage_layout, "storage_layout_mismatch");
  sameCanonical(
    a.method_identifiers,
    b.method_identifiers,
    "method_identifiers_mismatch",
  );
  sameCanonical(
    a.immutable_layout,
    b.immutable_layout,
    "immutable_layout_mismatch",
  );
  same(
    a.creation.source_map,
    b.creation.source_map,
    "creation_source_map_mismatch",
  );
  same(
    a.runtime_template.source_map,
    b.runtime_template.source_map,
    "runtime_source_map_mismatch",
  );

  const commit = String(sourceCommit ?? "").trim();
  if (!/^[0-9a-f]{40}$/.test(commit)) fail("source_commit_invalid");
  const ref = String(sourceRef ?? "").trim();
  if (!ref || ref.length > 256) fail("source_ref_invalid");

  const body = {
    marker: VOID_WC_VOID_MARKET_VAULT_COMPILER_IDENTITY_V1,
    version: 1,
    reviewed_at_utc: isoTimestamp(reviewedAt),
    source: {
      repository: "6ZoSo9/void-node",
      source_commit: commit,
      source_ref: ref,
      contract_path: CONTRACT_PATH,
      contract_name: CONTRACT_NAME,
      contract_source_sha256: sha256(sourceBytes),
      contract_source_bytes: sourceBytes.length,
      standard_json_input_canonical_sha256:
        sha256(canonicalJson(expectedInput)),
    },
    compiler_profile: {
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
    },
    environments: {
      compiler_a: {
        ...envA.descriptor,
        fingerprint_sha256: envA.fingerprint_sha256,
        output_raw_sha256: a.raw_sha256,
      },
      compiler_b: {
        ...envB.descriptor,
        fingerprint_sha256: envB.fingerprint_sha256,
        output_raw_sha256: b.raw_sha256,
      },
    },
    comparison: {
      compiler_environments_independent: true,
      exact_standard_json_input: true,
      exact_compiler_release: true,
      zero_compiler_errors: true,
      zero_link_references: true,
      creation_bytecode_exact_match: true,
      runtime_template_exact_match: true,
      abi_exact_match: true,
      metadata_exact_match: true,
      storage_layout_exact_match: true,
      method_identifiers_exact_match: true,
      immutable_layout_exact_match: true,
      source_maps_exact_match: true,
    },
    artifacts: {
      creation_bytecode_hex: "0x" + a.creation.object,
      creation_bytecode_bytes: a.creation.bytes,
      creation_bytecode_sha256: a.creation.sha256,
      creation_source_map: a.creation.source_map,
      runtime_template_hex: "0x" + a.runtime_template.object,
      runtime_template_bytes: a.runtime_template.bytes,
      runtime_template_sha256: a.runtime_template.sha256,
      runtime_source_map: a.runtime_template.source_map,
      abi_sha256: sha256(canonicalJson(a.abi)),
      metadata_sha256: sha256(a.metadata),
      storage_layout_sha256: sha256(canonicalJson(a.storage_layout)),
      method_identifiers_sha256: sha256(canonicalJson(a.method_identifiers)),
      immutable_layout: a.immutable_layout,
      immutable_layout_sha256: sha256(canonicalJson(a.immutable_layout)),
    },
    deployment_identity_requirements: {
      constructor_signature:
        "constructor(address,address,address,address,bytes32)",
      constructor_order: [
        "void_token",
        "launch_controller",
        "settlement_executor",
        "closeout_controller",
        "coupled_launch_id",
      ],
      deployed_runtime_must_patch_exact_immutable_layout: true,
      live_opening_inventory_atoms_must_equal:
        "10000000000000000000000000",
    },
    unresolved: {
      compiled_identity_committed: false,
      market_vault_address: null,
      deployment_transaction_hash: null,
      deployment_block_hash: null,
      final_role_bindings_attested: false,
      deployed_runtime_code_observed: false,
      inventory_funding_verified: false,
      inventory_lock_verified: false,
      market_activation_authorized: false,
      public_presale_activation_authorized: false,
    },
    authority: AUTHORITY,
    decision: {
      compiler_outputs_reproduced: true,
      compiler_outputs_compared: true,
      compiled_identity_committed: false,
      deployment_attested: false,
      inventory_funding_verified: false,
      market_activation_authorized: false,
      public_presale_activation_authorized: false,
      next_gate:
        "commit_exact_compiled_identity_then_prepare_chain2050_deployment_observation",
    },
  };

  return {
    identity_id:
      "voidwcvci1_" + sha256(canonicalJson(body)),
    ...body,
  };
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      out._.push(token);
      continue;
    }
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail("cli_argument_missing:" + key);
    out[key] = value;
    index += 1;
  }
  return out;
}

function writeExclusive(file, bytes) {
  const fd = fs.openSync(file, "wx", 0o600);
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];

  if (command === "input") {
    if (args.source !== CONTRACT_PATH || !args.out) fail("cli_input_arguments_invalid");
    const source = fs.readFileSync(args.source, "utf8");
    const input = buildStandardJsonInput(source);
    writeExclusive(args.out, JSON.stringify(input, null, 2) + "\n");
    console.log("VOID_WC_VOID_MARKET_VAULT_COMPILER_INPUT_V1_GREEN");
    console.log("compiler_execution=false");
    console.log("deployment=false");
    return;
  }

  if (command === "review") {
    for (const key of [
      "source",
      "input",
      "output-a",
      "output-b",
      "environment-a",
      "environment-b",
      "source-commit",
      "source-ref",
      "reviewed-at",
      "out",
    ]) {
      if (!args[key]) fail("cli_review_argument_missing:" + key);
    }
    if (args.source !== CONTRACT_PATH) fail("cli_source_path_mismatch");

    const identity = reviewDualCompilerIdentityV1({
      sourceBytes: fs.readFileSync(args.source),
      inputBytes: fs.readFileSync(args.input),
      outputABytes: fs.readFileSync(args["output-a"]),
      outputBBytes: fs.readFileSync(args["output-b"]),
      environmentA: readJson(args["environment-a"]),
      environmentB: readJson(args["environment-b"]),
      sourceCommit: args["source-commit"],
      sourceRef: args["source-ref"],
      reviewedAt: args["reviewed-at"],
    });
    writeExclusive(args.out, JSON.stringify(identity, null, 2) + "\n");
    console.log("VOID_WC_VOID_MARKET_VAULT_DUAL_COMPILER_REVIEW_V1_GREEN");
    console.log("identity_id=" + identity.identity_id);
    console.log(
      "creation_bytecode_sha256=" +
        identity.artifacts.creation_bytecode_sha256,
    );
    console.log(
      "runtime_template_sha256=" +
        identity.artifacts.runtime_template_sha256,
    );
    console.log("compiled_identity_committed=false");
    console.log("deployment=false");
    console.log("inventory_funding=false");
    return;
  }

  fail("usage: input|review");
}

const invoked =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invoked) {
  main().catch((error) => {
    console.error(error?.code || error?.message || error);
    process.exit(1);
  });
}
