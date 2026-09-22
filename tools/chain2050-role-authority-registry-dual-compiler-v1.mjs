#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const MARKER =
  "VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_DUAL_COMPILER_V1";
export const PROTOCOL =
  "void-chain2050-role-authority-registry-dual-compiler/1";
export const CONTRACT_PATH =
  "contracts/mainnet0/VoidChain2050RoleAuthorityRegistryV1.sol";
export const CONTRACT_NAME =
  "VoidChain2050RoleAuthorityRegistryV1";
export const SOLC_VERSION = "0.8.20";
export const SOLC_RELEASE = "0.8.20+commit.a1b79de6";
export const EVM_VERSION = "paris";
export const EMPTY_REGISTRY_ROOT_SHA256 =
  "d50b8a122e11454b6cca6a03b312ecac6af6ea1a5d5c5d5f9dd3fdd03b1faea7";
export const DECISION =
  "HOLD_PENDING_SOVEREIGN_BYTECODE_REVIEW_OWNER_DEPLOYER_BINDING_AND_UNSIGNED_DEPLOYMENT_TRANSACTION";

export const AUTHORITY_KEYS = Object.freeze([
  "credential_file_access_authorized",
  "private_key_access_authorized",
  "wallet_or_signer_access_authorized",
  "compiler_execution_authorized",
  "compiler_output_acceptance_authorized",
  "creation_bytecode_acceptance_authorized",
  "runtime_bytecode_acceptance_authorized",
  "owner_binding_authorized",
  "deployer_binding_authorized",
  "transaction_construction_authorized",
  "signing_authorized",
  "transaction_broadcast_authorized",
  "contract_deployment_authorized",
  "registry_append_authorized",
  "service_restart_authorized",
  "production_activation_authorized",
  "fund_movement_authorized",
]);

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const MAX_SOURCE_BYTES = 1024 * 1024;
const MAX_INPUT_BYTES = 4 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 32 * 1024 * 1024;
const MAX_ENVIRONMENT_BYTES = 1024 * 1024;

const OUTPUT_SELECTION = Object.freeze([
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
]);

class ReviewError extends Error {
  constructor(code, message = code, details = {}) {
    super(message);
    this.name = "RoleAuthorityCompilerReviewError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message = code, details = {}) {
  throw new ReviewError(code, message, details);
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
      .map(
        (key) =>
          JSON.stringify(key) + ":" + canonicalJson(value[key]),
      )
      .join(",") +
    "}"
  );
}

function plainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function boundedString(value, min, max, code) {
  const text = String(value ?? "");
  if (
    text.length < min ||
    text.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)
  ) {
    fail(code);
  }
  return text;
}

function parseJsonBytes(bytes, code, { leadingText = false } = {}) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 2) fail(code);
  let text = bytes.toString("utf8");
  if (leadingText) {
    const start = text.indexOf("{");
    if (start < 0) fail(code);
    text = text.slice(start);
  }
  try {
    return JSON.parse(text);
  } catch {
    fail(code);
  }
}

function validateSource(sourceBytes) {
  if (
    !Buffer.isBuffer(sourceBytes) ||
    sourceBytes.length < 100 ||
    sourceBytes.length > MAX_SOURCE_BYTES
  ) {
    fail("contract_source_invalid");
  }
  const source = sourceBytes.toString("utf8");
  for (const required of [
    "contract VoidChain2050RoleAuthorityRegistryV1",
    "constructor(address initialOwner)",
    "block.chainid != CHAIN_ID",
    "bytes32 public immutable emptyRegistryRootSha256",
    "function appendRoleAuthorityRecord",
    "function getEntry(",
    "function getCurrentRoleAuthorityRecord(",
  ]) {
    if (!source.includes(required)) {
      fail(
        "contract_source_contract_mismatch",
        "source missing: " + required,
      );
    }
  }
  const immutableMatches =
    source.match(/\bimmutable\b/g) || [];
  if (immutableMatches.length !== 1) {
    fail("contract_source_immutable_count_invalid");
  }
  return source;
}

export function buildStandardJsonInput(sourceText) {
  if (typeof sourceText !== "string" || sourceText.length < 1) {
    fail("contract_source_invalid");
  }
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
        enabled: true,
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
        [CONTRACT_PATH]: {
          [CONTRACT_NAME]: [...OUTPUT_SELECTION],
        },
      },
    },
  };
}

function normalizeHex(value, code) {
  const text = String(value ?? "").trim().toLowerCase();
  if (
    text.length < 2 ||
    text.length % 2 !== 0 ||
    !/^[0-9a-f]+$/.test(text)
  ) {
    fail(code);
  }
  return text;
}

function containsReferences(value) {
  if (!plainObject(value)) return false;
  return Object.values(value).some(
    (contracts) =>
      plainObject(contracts) &&
      Object.values(contracts).some(
        (locations) =>
          Array.isArray(locations) && locations.length > 0,
      ),
  );
}

function compilerDiagnostics(output, label) {
  const diagnostics = Array.isArray(output.errors)
    ? output.errors
    : [];
  const errors = diagnostics.filter(
    (entry) => entry?.severity === "error",
  );
  if (errors.length > 0) {
    fail(label + "_compiler_reported_errors", undefined, {
      errors: errors.slice(0, 20).map((entry) => ({
        type: entry?.type,
        message: entry?.message,
      })),
    });
  }
  return {
    warning_count: diagnostics.filter(
      (entry) => entry?.severity === "warning",
    ).length,
    informational_count: diagnostics.filter(
      (entry) =>
        entry?.severity !== "warning" &&
        entry?.severity !== "error",
    ).length,
  };
}

function validateMetadata(metadataRaw, label) {
  const metadata = boundedString(
    metadataRaw,
    2,
    8 * 1024 * 1024,
    label + "_metadata_invalid",
  );
  let parsed;
  try {
    parsed = JSON.parse(metadata);
  } catch {
    fail(label + "_metadata_json_invalid");
  }
  const settings = parsed?.settings;
  if (
    !plainObject(settings) ||
    settings.evmVersion !== EVM_VERSION ||
    settings.viaIR !== false ||
    settings?.optimizer?.enabled !== true ||
    settings?.optimizer?.runs !== 200 ||
    settings?.metadata?.appendCBOR !== true ||
    settings?.metadata?.bytecodeHash !== "ipfs" ||
    settings?.metadata?.useLiteralContent !== true ||
    parsed?.compiler?.version !== SOLC_RELEASE ||
    settings?.compilationTarget?.[CONTRACT_PATH] !== CONTRACT_NAME
  ) {
    fail(label + "_metadata_profile_mismatch");
  }
  return { raw: metadata, parsed };
}

function constructorShape(abi, label) {
  if (!Array.isArray(abi)) fail(label + "_abi_invalid");
  const constructors = abi.filter(
    (entry) => entry?.type === "constructor",
  );
  if (
    constructors.length !== 1 ||
    constructors[0]?.stateMutability !== "nonpayable" ||
    !Array.isArray(constructors[0]?.inputs) ||
    constructors[0].inputs.length !== 1 ||
    constructors[0].inputs[0]?.type !== "address" ||
    constructors[0].inputs[0]?.name !== "initialOwner"
  ) {
    fail(label + "_constructor_abi_invalid");
  }
}

function normalizeImmutableReferences(value, runtimeBytes, label) {
  if (!plainObject(value)) {
    fail(label + "_immutable_references_invalid");
  }
  const rows = [];
  for (const [astId, locations] of Object.entries(value)) {
    if (!/^\d+$/.test(astId) || !Array.isArray(locations)) {
      fail(label + "_immutable_references_invalid");
    }
    for (const location of locations) {
      const start = Number(location?.start);
      const length = Number(location?.length);
      if (
        !Number.isSafeInteger(start) ||
        start < 0 ||
        !Number.isSafeInteger(length) ||
        length !== 32 ||
        start + length > runtimeBytes
      ) {
        fail(label + "_immutable_reference_invalid");
      }
      rows.push({ ast_id: astId, start, length });
    }
  }
  rows.sort(
    (a, b) =>
      a.start - b.start ||
      a.ast_id.localeCompare(b.ast_id),
  );
  if (rows.length < 1) {
    fail(label + "_immutable_reference_missing");
  }
  for (let i = 1; i < rows.length; i += 1) {
    const prior = rows[i - 1];
    const current = rows[i];
    if (current.start < prior.start + prior.length) {
      fail(label + "_immutable_reference_overlap");
    }
  }
  return rows;
}

function patchExpectedRuntime(runtimeHex, references) {
  const bytes = Buffer.from(runtimeHex, "hex");
  const immutable = Buffer.from(
    EMPTY_REGISTRY_ROOT_SHA256,
    "hex",
  );
  for (const row of references) {
    const current = bytes.subarray(
      row.start,
      row.start + row.length,
    );
    if (!current.equals(Buffer.alloc(row.length, 0))) {
      fail("runtime_immutable_placeholder_not_zero", undefined, {
        start: row.start,
        length: row.length,
      });
    }
    immutable.copy(bytes, row.start);
  }
  return {
    bytes,
    sha256: sha256(bytes),
  };
}

export function parseCompilerOutput(bytes, label) {
  const output = parseJsonBytes(
    bytes,
    label + "_json_invalid",
    { leadingText: true },
  );
  if (!plainObject(output)) fail(label + "_invalid");
  const diagnostics = compilerDiagnostics(output, label);
  const source = output?.sources?.[CONTRACT_PATH];
  if (!plainObject(source)) fail(label + "_source_invalid");
  const contract =
    output?.contracts?.[CONTRACT_PATH]?.[CONTRACT_NAME];
  if (!plainObject(contract)) fail(label + "_contract_missing");
  constructorShape(contract.abi, label);

  const evm = contract.evm;
  if (
    !plainObject(evm) ||
    !plainObject(evm.methodIdentifiers) ||
    !plainObject(evm.bytecode) ||
    !plainObject(evm.deployedBytecode) ||
    !plainObject(contract.storageLayout)
  ) {
    fail(label + "_evm_invalid");
  }
  if (
    containsReferences(evm.bytecode.linkReferences) ||
    containsReferences(evm.deployedBytecode.linkReferences)
  ) {
    fail("link_references_present");
  }

  const creation = normalizeHex(
    evm.bytecode.object,
    label + "_creation_bytecode_invalid",
  );
  const runtime = normalizeHex(
    evm.deployedBytecode.object,
    label + "_runtime_bytecode_invalid",
  );
  const runtimeBytes = runtime.length / 2;
  const immutableReferences = normalizeImmutableReferences(
    evm.deployedBytecode.immutableReferences,
    runtimeBytes,
    label,
  );
  const expectedRuntime = patchExpectedRuntime(
    runtime,
    immutableReferences,
  );
  const metadata = validateMetadata(contract.metadata, label);

  return {
    raw_sha256: sha256(bytes),
    canonical_output_sha256: sha256(canonicalJson(output)),
    warning_count: diagnostics.warning_count,
    informational_count: diagnostics.informational_count,
    abi: contract.abi,
    metadata: metadata.raw,
    storage_layout: contract.storageLayout,
    method_identifiers: evm.methodIdentifiers,
    creation: {
      object: creation,
      bytes: creation.length / 2,
      sha256: sha256(Buffer.from(creation, "hex")),
      opcodes: boundedString(
        evm.bytecode.opcodes,
        1,
        8 * 1024 * 1024,
        label + "_creation_opcodes_invalid",
      ),
      source_map: boundedString(
        evm.bytecode.sourceMap,
        0,
        8 * 1024 * 1024,
        label + "_creation_source_map_invalid",
      ),
    },
    runtime_template: {
      object: runtime,
      bytes: runtimeBytes,
      sha256: sha256(Buffer.from(runtime, "hex")),
      opcodes: boundedString(
        evm.deployedBytecode.opcodes,
        1,
        8 * 1024 * 1024,
        label + "_runtime_opcodes_invalid",
      ),
      source_map: boundedString(
        evm.deployedBytecode.sourceMap,
        0,
        8 * 1024 * 1024,
        label + "_runtime_source_map_invalid",
      ),
      immutable_references: immutableReferences,
    },
    expected_deployed_runtime: {
      bytes: expectedRuntime.bytes.length,
      sha256: expectedRuntime.sha256,
      immutable_empty_registry_root_sha256:
        EMPTY_REGISTRY_ROOT_SHA256,
    },
  };
}

function environmentSensitiveKey(key) {
  return /(secret|private.?key|mnemonic|seed|password|credential|token)/i.test(
    key,
  );
}

function rejectSensitiveEnvironment(value, pathParts = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      rejectSensitiveEnvironment(entry, [
        ...pathParts,
        String(index),
      ]),
    );
    return;
  }
  if (!plainObject(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    if (environmentSensitiveKey(key)) {
      fail(
        "compiler_environment_sensitive_field_forbidden",
        undefined,
        { path: [...pathParts, key].join(".") },
      );
    }
    rejectSensitiveEnvironment(entry, [...pathParts, key]);
  }
}

export function validateCompilerEnvironment(value, label) {
  if (!plainObject(value)) {
    fail(label + "_environment_invalid");
  }
  rejectSensitiveEnvironment(value);
  if (
    value.marker !== "VOID_SOLC_COMPILER_ENVIRONMENT_V1" ||
    value.compiler_release !== SOLC_RELEASE
  ) {
    fail(label + "_environment_contract_mismatch");
  }
  const kind = boundedString(
    value.kind,
    3,
    128,
    label + "_environment_kind_invalid",
  );
  const implementation = boundedString(
    value.implementation,
    3,
    256,
    label + "_environment_implementation_invalid",
  );
  const versionOutput = boundedString(
    value.version_output,
    3,
    4096,
    label + "_environment_version_invalid",
  );
  if (!versionOutput.includes(SOLC_RELEASE)) {
    fail(label + "_compiler_release_mismatch");
  }
  const artifactIdentity = boundedString(
    value.artifact_identity,
    3,
    2048,
    label + "_artifact_identity_invalid",
  );
  const descriptor = {
    ...value,
    kind,
    implementation,
    version_output: versionOutput,
    artifact_identity: artifactIdentity,
  };
  return {
    descriptor,
    fingerprint_sha256: sha256(canonicalJson(descriptor)),
  };
}

function exact(left, right, code) {
  if (left !== right) fail(code);
}

function canonicalExact(left, right, code) {
  exact(canonicalJson(left), canonicalJson(right), code);
}

export function reviewDualCompilerOutputs({
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
  const sourceText = validateSource(sourceBytes);
  const input = parseJsonBytes(
    inputBytes,
    "compiler_input_json_invalid",
  );
  const expectedInput = buildStandardJsonInput(sourceText);
  if (canonicalJson(input) !== canonicalJson(expectedInput)) {
    fail("compiler_input_profile_mismatch");
  }

  const outputA = parseCompilerOutput(outputABytes, "compiler_a");
  const outputB = parseCompilerOutput(outputBBytes, "compiler_b");
  const envA = validateCompilerEnvironment(
    environmentA,
    "compiler_a",
  );
  const envB = validateCompilerEnvironment(
    environmentB,
    "compiler_b",
  );
  if (
    envA.fingerprint_sha256 === envB.fingerprint_sha256 ||
    envA.descriptor.kind === envB.descriptor.kind ||
    envA.descriptor.implementation === envB.descriptor.implementation
  ) {
    fail("compiler_environments_not_independent");
  }

  exact(
    outputA.creation.object,
    outputB.creation.object,
    "creation_bytecode_mismatch",
  );
  exact(
    outputA.runtime_template.object,
    outputB.runtime_template.object,
    "runtime_template_mismatch",
  );
  exact(
    outputA.expected_deployed_runtime.sha256,
    outputB.expected_deployed_runtime.sha256,
    "expected_deployed_runtime_mismatch",
  );
  exact(
    outputA.creation.opcodes,
    outputB.creation.opcodes,
    "creation_opcodes_mismatch",
  );
  exact(
    outputA.runtime_template.opcodes,
    outputB.runtime_template.opcodes,
    "runtime_opcodes_mismatch",
  );
  exact(
    outputA.creation.source_map,
    outputB.creation.source_map,
    "creation_source_map_mismatch",
  );
  exact(
    outputA.runtime_template.source_map,
    outputB.runtime_template.source_map,
    "runtime_source_map_mismatch",
  );
  canonicalExact(outputA.abi, outputB.abi, "abi_mismatch");
  exact(outputA.metadata, outputB.metadata, "metadata_mismatch");
  canonicalExact(
    outputA.storage_layout,
    outputB.storage_layout,
    "storage_layout_mismatch",
  );
  canonicalExact(
    outputA.method_identifiers,
    outputB.method_identifiers,
    "method_identifiers_mismatch",
  );
  canonicalExact(
    outputA.runtime_template.immutable_references,
    outputB.runtime_template.immutable_references,
    "immutable_references_mismatch",
  );

  const commit = boundedString(
    sourceCommit,
    40,
    40,
    "source_commit_invalid",
  );
  if (!/^[0-9a-f]{40}$/.test(commit)) {
    fail("source_commit_invalid");
  }
  const ref = boundedString(
    sourceRef,
    1,
    256,
    "source_ref_invalid",
  );
  const reviewed = new Date(reviewedAt).toISOString();

  const body = {
    marker: MARKER,
    protocol: PROTOCOL,
    version: 1,
    reviewed_at_utc: reviewed,
    source: {
      repository: "6ZoSo9/void-node",
      source_commit: commit,
      source_ref: ref,
      contract_path: CONTRACT_PATH,
      contract_name: CONTRACT_NAME,
      contract_source_sha256: sha256(sourceBytes),
      contract_source_bytes: sourceBytes.length,
      standard_json_input_canonical_sha256:
        sha256(canonicalJson(input)),
    },
    compiler_profile: {
      compiler: "solc",
      semantic_version: SOLC_VERSION,
      release: SOLC_RELEASE,
      evm_version: EVM_VERSION,
      optimizer_enabled: true,
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
        output_raw_sha256: outputA.raw_sha256,
        output_canonical_sha256:
          outputA.canonical_output_sha256,
        warning_count: outputA.warning_count,
        informational_count: outputA.informational_count,
      },
      compiler_b: {
        ...envB.descriptor,
        fingerprint_sha256: envB.fingerprint_sha256,
        output_raw_sha256: outputB.raw_sha256,
        output_canonical_sha256:
          outputB.canonical_output_sha256,
        warning_count: outputB.warning_count,
        informational_count: outputB.informational_count,
      },
    },
    comparison: {
      distinct_environment_fingerprints: true,
      exact_compiler_release: true,
      zero_compiler_errors: true,
      zero_link_references: true,
      creation_bytecode_exact_match: true,
      runtime_template_exact_match: true,
      expected_deployed_runtime_exact_match: true,
      abi_exact_match: true,
      metadata_exact_match: true,
      storage_layout_exact_match: true,
      method_identifiers_exact_match: true,
      immutable_references_exact_match: true,
    },
    artifacts: {
      creation_bytecode_bytes: outputA.creation.bytes,
      creation_bytecode_sha256: outputA.creation.sha256,
      runtime_template_bytes: outputA.runtime_template.bytes,
      runtime_template_sha256:
        outputA.runtime_template.sha256,
      runtime_immutable_references:
        outputA.runtime_template.immutable_references,
      immutable_empty_registry_root_sha256:
        EMPTY_REGISTRY_ROOT_SHA256,
      expected_deployed_runtime_bytes:
        outputA.expected_deployed_runtime.bytes,
      expected_deployed_runtime_sha256:
        outputA.expected_deployed_runtime.sha256,
      abi_sha256: sha256(canonicalJson(outputA.abi)),
      metadata_sha256: sha256(outputA.metadata),
      storage_layout_sha256:
        sha256(canonicalJson(outputA.storage_layout)),
      method_identifiers_sha256:
        sha256(canonicalJson(outputA.method_identifiers)),
      constructor_signature: "constructor(address)",
      constructor_owner_address: null,
      deployment_data_sha256: null,
    },
    unresolved: {
      sovereign_bytecode_acceptance: false,
      compiler_distribution_trust_accepted: false,
      owner_address: null,
      deployer_address: null,
      owner_deployer_separation_reviewed: false,
      deployment_nonce: null,
      gas_limit: null,
      fee_policy: null,
      unsigned_transaction: null,
    },
    authority: Object.fromEntries(
      AUTHORITY_KEYS.map((key) => [key, false]),
    ),
    decision: {
      status: DECISION,
      compiler_outputs_reproduced: true,
      compiler_outputs_compared: true,
      creation_bytecode_exact_match: true,
      runtime_template_exact_match: true,
      expected_deployed_runtime_exact_match: true,
      sovereign_bytecode_acceptance: false,
      owner_binding_resolved: false,
      deployer_binding_resolved: false,
      unsigned_transaction_constructed: false,
      deployment_authorized: false,
      transaction_broadcast_authorized: false,
      production_activation_authorized: false,
      next_gate:
        "capture_and_review_exact_compiled_identity_then_bind_owner_and_deployer_without_signing_or_broadcast",
    },
  };

  return {
    reproducibility_id:
      "voidcraregdc1_" + sha256(canonicalJson(body)),
    ...body,
  };
}

function readBounded(file, maximum, code) {
  const stat = fs.lstatSync(file);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.size < 1 ||
    stat.size > maximum
  ) {
    fail(code);
  }
  return fs.readFileSync(file);
}

function gitValue(args, code) {
  const result = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) fail(code);
  return result.stdout.trim();
}


function repositoryState() {
  const commit = gitValue(
    ["rev-parse", "HEAD"],
    "git_head_unavailable",
  );
  const dirty = gitValue(
    ["status", "--porcelain=v1", "--untracked-files=normal"],
    "git_status_unavailable",
  );
  if (dirty) fail("repository_not_clean");
  const branch = gitValue(
    ["branch", "--show-current"],
    "git_branch_unavailable",
  );
  return {
    commit,
    sourceRef:
      String(process.env.GITHUB_HEAD_REF || "").trim() ||
      branch ||
      "detached",
  };
}

function atomicWriteJson(file, value) {
  const resolved = path.resolve(file);
  fs.mkdirSync(path.dirname(resolved), {
    recursive: true,
    mode: 0o700,
  });
  const tmp =
    resolved +
    ".tmp-" +
    process.pid +
    "-" +
    crypto.randomBytes(6).toString("hex");
  fs.writeFileSync(
    tmp,
    JSON.stringify(value, null, 2) + "\n",
    { mode: 0o600 },
  );
  fs.renameSync(tmp, resolved);
  fs.chmodSync(resolved, 0o600);
}

function parseArgs(argv) {
  const options = {};
  const allowed = new Set([
    "input",
    "output-a",
    "environment-a",
    "output-b",
    "environment-b",
    "review-output",
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    if (!raw.startsWith("--")) fail("unexpected_argument");
    const key = raw.slice(2);
    if (!allowed.has(key) || Object.hasOwn(options, key)) {
      fail("unknown_or_duplicate_option");
    }
    const value = argv[++index];
    if (!value || value.startsWith("--")) {
      fail("missing_option_value");
    }
    options[key] = value;
  }
  return options;
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  for (const required of [
    "input",
    "output-a",
    "environment-a",
    "output-b",
    "environment-b",
  ]) {
    if (!options[required]) fail(required + "_required");
  }

  const sourceBytes = readBounded(
    path.join(ROOT, CONTRACT_PATH),
    MAX_SOURCE_BYTES,
    "contract_source_file_invalid",
  );
  const inputBytes = readBounded(
    path.resolve(options.input),
    MAX_INPUT_BYTES,
    "compiler_input_file_invalid",
  );
  const outputABytes = readBounded(
    path.resolve(options["output-a"]),
    MAX_OUTPUT_BYTES,
    "compiler_a_output_file_invalid",
  );
  const outputBBytes = readBounded(
    path.resolve(options["output-b"]),
    MAX_OUTPUT_BYTES,
    "compiler_b_output_file_invalid",
  );
  const environmentA = parseJsonBytes(
    readBounded(
      path.resolve(options["environment-a"]),
      MAX_ENVIRONMENT_BYTES,
      "compiler_a_environment_file_invalid",
    ),
    "compiler_a_environment_json_invalid",
  );
  const environmentB = parseJsonBytes(
    readBounded(
      path.resolve(options["environment-b"]),
      MAX_ENVIRONMENT_BYTES,
      "compiler_b_environment_file_invalid",
    ),
    "compiler_b_environment_json_invalid",
  );
  const { commit, sourceRef } = repositoryState();
  const review = reviewDualCompilerOutputs({
    sourceBytes,
    inputBytes,
    outputABytes,
    outputBBytes,
    environmentA,
    environmentB,
    sourceCommit: commit,
    sourceRef,
    reviewedAt: new Date().toISOString(),
  });

  if (options["review-output"]) {
    atomicWriteJson(
      path.resolve(options["review-output"]),
      review,
    );
  }
  process.stdout.write(JSON.stringify(review, null, 2) + "\n");
}

const direct =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  main().catch((error) => {
    console.error(
      MARKER +
        " HOLD code=" +
        String(error?.code || error?.name || "review_failed") +
        " message=" +
        String(error?.message || error),
    );
    process.exitCode = 1;
  });
}
