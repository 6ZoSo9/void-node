#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  CONTRACT_NAME,
  CONTRACT_PATH,
  EVM_VERSION,
  MARKER as COMPILER_PROFILE_MARKER,
  PROTOCOL as COMPILER_PROFILE_PROTOCOL,
  SOLC_RELEASE,
  SOLC_VERSION,
  buildStandardJsonInput,
  canonicalJson,
  encodeConstructorArguments,
  sha256,
} from "./void-validator-candidate-registry-compiler-profile-v1.mjs";

export const MARKER =
  "VOID_VALIDATOR_CANDIDATE_REGISTRY_DUAL_COMPILER_REPRODUCIBILITY_V1";
export const PROTOCOL =
  "void-validator-candidate-registry-dual-compiler-reproducibility/1";
export const ENVIRONMENT_MARKER = "VOID_SOLC_COMPILER_ENVIRONMENT_V1";
export const DECISION =
  "HOLD_PENDING_ZOSO_BYTECODE_REVIEW_DEPLOYER_OWNER_BINDING_AND_UNSIGNED_TRANSACTION";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_INPUT_BYTES = 4 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 32 * 1024 * 1024;
const MAX_ENVIRONMENT_BYTES = 256 * 1024;
const MAX_SOURCE_BYTES = 1024 * 1024;

export const AUTHORITY_KEYS = [
  "credential_file_access_authorized",
  "private_key_access_authorized",
  "wallet_or_signer_access_authorized",
  "rpc_access_authorized",
  "compiler_output_acceptance_authorized",
  "creation_bytecode_acceptance_authorized",
  "runtime_bytecode_acceptance_authorized",
  "deployer_or_owner_binding_authorized",
  "transaction_construction_authorized",
  "signing_authorized",
  "transaction_broadcast_authorized",
  "contract_deployment_authorized",
  "artifact_pointer_write_authorized",
  "validator_registration_authorized",
  "validator_waiting_transition_authorized",
  "validator_activation_authorized",
  "service_restart_authorized",
  "fund_movement_authorized",
];

class ReproducibilityError extends Error {
  constructor(code, message = code, details = {}) {
    super(message);
    this.name = "ReproducibilityError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message = code, details = {}) {
  throw new ReproducibilityError(code, message, details);
}

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, expected, code) {
  if (!plainObject(value)) fail(code);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(code, code, { actual, expected: wanted });
  }
}

function timestamp(raw, code) {
  const value = String(raw || "").trim();
  const milliseconds = Date.parse(value);
  if (!value || !Number.isFinite(milliseconds)) fail(code);
  return new Date(milliseconds).toISOString();
}

function boundedString(raw, minimum, maximum, code) {
  const value = String(raw ?? "").trim();
  if (value.length < minimum || value.length > maximum) fail(code);
  if (/\u0000|[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
    fail(code);
  }
  return value;
}

function normalizeHex(raw, code, { allowEmpty = false } = {}) {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!/^[0-9a-f]*$/.test(value) || value.length % 2 !== 0) fail(code);
  if (!allowEmpty && value.length === 0) fail(code);
  return value;
}

function readCborLength(buffer, offset, expectedMajorType, code) {
  if (!Buffer.isBuffer(buffer) || offset < 0 || offset >= buffer.length) fail(code);
  const initial = buffer[offset];
  if (initial >> 5 !== expectedMajorType) fail(code);
  const additional = initial & 0x1f;
  if (additional < 24) return { length: additional, offset: offset + 1 };
  if (additional === 24) {
    if (offset + 1 >= buffer.length) fail(code);
    return { length: buffer[offset + 1], offset: offset + 2 };
  }
  if (additional === 25) {
    if (offset + 2 >= buffer.length) fail(code);
    return { length: buffer.readUInt16BE(offset + 1), offset: offset + 3 };
  }
  fail(code);
}

function parseExpectedSolidityMetadataCbor(buffer, code) {
  let offset = 0;
  const map = readCborLength(buffer, offset, 5, code);
  offset = map.offset;
  const entries = {};
  for (let index = 0; index < map.length; index += 1) {
    const keyLength = readCborLength(buffer, offset, 3, code);
    offset = keyLength.offset;
    if (offset + keyLength.length > buffer.length) fail(code);
    const key = buffer.subarray(offset, offset + keyLength.length).toString("utf8");
    offset += keyLength.length;
    if (Object.hasOwn(entries, key) || !["ipfs", "solc"].includes(key)) fail(code);
    const valueLength = readCborLength(buffer, offset, 2, code);
    offset = valueLength.offset;
    if (offset + valueLength.length > buffer.length) fail(code);
    entries[key] = Buffer.from(buffer.subarray(offset, offset + valueLength.length));
    offset += valueLength.length;
  }
  if (
    offset !== buffer.length ||
    !Buffer.isBuffer(entries.ipfs) ||
    entries.ipfs.length !== 34 ||
    entries.ipfs[0] !== 0x12 ||
    entries.ipfs[1] !== 0x20 ||
    !Buffer.isBuffer(entries.solc) ||
    !entries.solc.equals(Buffer.from([0, 8, 20]))
  ) {
    fail(code);
  }
}

function executableBytecodeWithoutSolidityMetadata(
  bytecodeHex,
  label,
  { metadataRequired = false } = {},
) {
  const buffer = Buffer.from(bytecodeHex, "hex");
  const code = `${label}_cbor_metadata_trailer_invalid`;
  if (buffer.length < 3) {
    if (metadataRequired) fail(code);
    return bytecodeHex;
  }
  const metadataBytes = buffer.readUInt16BE(buffer.length - 2);
  const metadataStart = buffer.length - 2 - metadataBytes;
  if (metadataBytes <= 0 || metadataStart < 0) {
    if (metadataRequired) fail(code);
    return bytecodeHex;
  }
  const metadata = buffer.subarray(metadataStart, buffer.length - 2);
  try {
    parseExpectedSolidityMetadataCbor(metadata, code);
  } catch (error) {
    if (metadataRequired) throw error;
    return bytecodeHex;
  }
  return buffer.subarray(0, metadataStart).toString("hex");
}

function assertParisExecutableHasNoPush0(
  bytecodeHex,
  label,
  { metadataRequired = false } = {},
) {
  const executable = executableBytecodeWithoutSolidityMetadata(bytecodeHex, label, {
    metadataRequired,
  });
  const byteLength = executable.length / 2;
  for (let byteOffset = 0; byteOffset < byteLength; byteOffset += 1) {
    const opcode = Number.parseInt(
      executable.slice(byteOffset * 2, byteOffset * 2 + 2),
      16,
    );
    if (opcode === 0x5f) {
      fail("push0_opcode_forbidden_for_paris_profile", undefined, {
        label,
        byte_offset: byteOffset,
      });
    }
    if (opcode >= 0x60 && opcode <= 0x7f) {
      const immediateBytes = opcode - 0x5f;
      if (byteOffset + immediateBytes >= byteLength) {
        fail(`${label}_truncated_push_immediate`);
      }
      byteOffset += immediateBytes;
    }
  }
}

function regularFile(file, maximumBytes, code) {
  let stats;
  try {
    stats = fs.lstatSync(file);
  } catch {
    fail(code, `${code}: ${file}`);
  }
  if (
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    stats.size <= 0 ||
    stats.size > maximumBytes
  ) {
    fail(code, `${code}: ${file}`);
  }
  return stats;
}

function readBounded(file, maximumBytes, code) {
  regularFile(file, maximumBytes, code);
  return fs.readFileSync(file);
}

function parseJsonBytes(bytes, code, { permitLeadingText = false } = {}) {
  if (!Buffer.isBuffer(bytes) || bytes.length <= 0) fail(code);
  let text = bytes.toString("utf8").trim();
  if (permitLeadingText && !text.startsWith("{")) {
    const firstObject = text.indexOf("{");
    if (firstObject < 0) fail(code);
    text = text.slice(firstObject);
  }
  try {
    return JSON.parse(text);
  } catch {
    fail(code);
  }
}

function validateSource(sourceBytes) {
  if (!Buffer.isBuffer(sourceBytes)) fail("contract_source_invalid");
  if (sourceBytes.length <= 0 || sourceBytes.length > MAX_SOURCE_BYTES) {
    fail("contract_source_invalid");
  }
  const sourceText = sourceBytes.toString("utf8");
  for (const required of [
    "contract VoidValidatorCandidateRegistry",
    "owner = msg.sender",
    "state: ValidatorState.Candidate",
    "function moveToWaiting",
    "function markActiveBatch",
  ]) {
    if (!sourceText.includes(required)) {
      fail("contract_source_contract_mismatch", `source missing: ${required}`);
    }
  }
  return sourceText;
}

function containsReferenceEntries(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (plainObject(value)) {
    return Object.values(value).some((entry) => containsReferenceEntries(entry));
  }
  return value !== null && value !== undefined && value !== false && value !== "";
}

function parseMetadata(raw, code) {
  const metadata = boundedString(raw, 2, 4 * 1024 * 1024, code);
  let parsed;
  try {
    parsed = JSON.parse(metadata);
  } catch {
    fail(code);
  }
  if (
    !plainObject(parsed) ||
    parsed?.compiler?.version !== SOLC_RELEASE ||
    parsed?.language !== "Solidity" ||
    parsed?.settings?.evmVersion !== EVM_VERSION ||
    parsed?.settings?.optimizer?.enabled !== true ||
    Number(parsed?.settings?.optimizer?.runs) !== 200
  ) {
    fail("compiler_metadata_profile_mismatch");
  }
  return { metadata, parsed };
}

function compilerErrors(output, code) {
  if (output.errors === undefined) return { warnings: [], informational: [] };
  if (!Array.isArray(output.errors)) fail(code);
  const failures = output.errors.filter((entry) => entry?.severity === "error");
  if (failures.length > 0) {
    fail("compiler_reported_errors", "compiler output contains errors", {
      errors: failures.map((entry) => ({
        type: entry?.type,
        component: entry?.component,
        message: entry?.message,
        formattedMessage: entry?.formattedMessage,
      })),
    });
  }
  return {
    warnings: output.errors.filter((entry) => entry?.severity === "warning"),
    informational: output.errors.filter(
      (entry) => !["error", "warning"].includes(entry?.severity),
    ),
  };
}

export function parseCompilerOutput(bytes, label = "compiler_output") {
  const output = parseJsonBytes(bytes, `${label}_json_invalid`, {
    permitLeadingText: true,
  });
  if (!plainObject(output)) fail(`${label}_invalid`);
  const diagnostics = compilerErrors(output, `${label}_diagnostics_invalid`);
  const source = output?.sources?.[CONTRACT_PATH];
  if (!plainObject(source) || !Number.isSafeInteger(Number(source.id))) {
    fail(`${label}_source_result_invalid`);
  }
  const contract = output?.contracts?.[CONTRACT_PATH]?.[CONTRACT_NAME];
  if (!plainObject(contract)) fail(`${label}_contract_missing`);
  if (!Array.isArray(contract.abi)) fail(`${label}_abi_invalid`);
  if (!plainObject(contract.storageLayout)) fail(`${label}_storage_layout_invalid`);
  const evm = contract.evm;
  if (!plainObject(evm) || !plainObject(evm.methodIdentifiers)) {
    fail(`${label}_evm_invalid`);
  }
  const bytecode = evm.bytecode;
  const deployedBytecode = evm.deployedBytecode;
  if (!plainObject(bytecode) || !plainObject(deployedBytecode)) {
    fail(`${label}_bytecode_invalid`);
  }

  const creationObject = normalizeHex(
    bytecode.object,
    `${label}_creation_bytecode_invalid`,
  );
  const runtimeObject = normalizeHex(
    deployedBytecode.object,
    `${label}_runtime_bytecode_invalid`,
  );
  const creationOpcodes = boundedString(
    bytecode.opcodes,
    1,
    8 * 1024 * 1024,
    `${label}_creation_opcodes_invalid`,
  );
  const runtimeOpcodes = boundedString(
    deployedBytecode.opcodes,
    1,
    8 * 1024 * 1024,
    `${label}_runtime_opcodes_invalid`,
  );
  const { metadata, parsed: metadataObject } = parseMetadata(
    contract.metadata,
    `${label}_metadata_invalid`,
  );
  assertParisExecutableHasNoPush0(creationObject, `${label}_creation`);
  assertParisExecutableHasNoPush0(runtimeObject, `${label}_runtime`, {
    metadataRequired: metadataObject?.settings?.metadata?.appendCBOR === true,
  });
  if (
    containsReferenceEntries(bytecode.linkReferences) ||
    containsReferenceEntries(deployedBytecode.linkReferences)
  ) {
    fail("link_references_present");
  }

  return {
    raw_sha256: sha256(bytes),
    canonical_output_sha256: sha256(canonicalJson(output)),
    warning_count: diagnostics.warnings.length,
    informational_count: diagnostics.informational.length,
    source_id: Number(source.id),
    abi: contract.abi,
    metadata,
    metadata_object: metadataObject,
    storage_layout: contract.storageLayout,
    method_identifiers: evm.methodIdentifiers,
    creation: {
      object: creationObject,
      bytes: creationObject.length / 2,
      sha256: sha256(Buffer.from(creationObject, "hex")),
      opcodes: creationOpcodes,
      source_map: boundedString(
        bytecode.sourceMap,
        0,
        8 * 1024 * 1024,
        `${label}_creation_source_map_invalid`,
      ),
      link_references: bytecode.linkReferences ?? {},
    },
    runtime: {
      object: runtimeObject,
      bytes: runtimeObject.length / 2,
      sha256: sha256(Buffer.from(runtimeObject, "hex")),
      opcodes: runtimeOpcodes,
      source_map: boundedString(
        deployedBytecode.sourceMap,
        0,
        8 * 1024 * 1024,
        `${label}_runtime_source_map_invalid`,
      ),
      link_references: deployedBytecode.linkReferences ?? {},
      immutable_references: deployedBytecode.immutableReferences ?? {},
    },
  };
}

function environmentSecretKey(key) {
  return /(secret|private.?key|mnemonic|seed|password|credential|token)/i.test(key);
}

function walkEnvironment(value, pathParts = []) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      walkEnvironment(value[index], [...pathParts, String(index)]);
    }
    return;
  }
  if (!plainObject(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    if (environmentSecretKey(key)) {
      fail("compiler_environment_sensitive_field_forbidden", undefined, {
        path: [...pathParts, key].join("."),
      });
    }
    walkEnvironment(entry, [...pathParts, key]);
  }
}

export function validateCompilerEnvironment(environment, label) {
  if (!plainObject(environment)) fail(`${label}_environment_invalid`);
  walkEnvironment(environment);
  if (
    environment.marker !== ENVIRONMENT_MARKER ||
    environment.compiler_release !== SOLC_RELEASE
  ) {
    fail(`${label}_environment_contract_mismatch`);
  }
  const kind = boundedString(
    environment.kind,
    3,
    128,
    `${label}_environment_kind_invalid`,
  );
  const implementation = boundedString(
    environment.implementation,
    3,
    256,
    `${label}_environment_implementation_invalid`,
  );
  const versionOutput = boundedString(
    environment.version_output,
    3,
    4096,
    `${label}_environment_version_invalid`,
  );
  if (!versionOutput.includes(SOLC_RELEASE)) {
    fail(`${label}_compiler_release_mismatch`);
  }
  const artifactIdentity = boundedString(
    environment.artifact_identity,
    3,
    2048,
    `${label}_artifact_identity_invalid`,
  );
  const body = {
    ...environment,
    kind,
    implementation,
    version_output: versionOutput,
    artifact_identity: artifactIdentity,
  };
  return {
    descriptor: body,
    fingerprint_sha256: sha256(canonicalJson(body)),
  };
}

function exactMatch(left, right, code) {
  if (left !== right) fail(code);
  return true;
}

function canonicalMatch(left, right, code) {
  return exactMatch(canonicalJson(left), canonicalJson(right), code);
}

function validateInput(inputBytes, sourceText) {
  const input = parseJsonBytes(inputBytes, "compiler_input_json_invalid");
  const expected = buildStandardJsonInput(sourceText);
  if (canonicalJson(input) !== canonicalJson(expected)) {
    fail("compiler_input_profile_mismatch");
  }
  return {
    input,
    raw_sha256: sha256(inputBytes),
    canonical_sha256: sha256(canonicalJson(input)),
  };
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
  const input = validateInput(inputBytes, sourceText);
  const outputA = parseCompilerOutput(outputABytes, "compiler_a");
  const outputB = parseCompilerOutput(outputBBytes, "compiler_b");
  const envA = validateCompilerEnvironment(environmentA, "compiler_a");
  const envB = validateCompilerEnvironment(environmentB, "compiler_b");
  if (
    envA.fingerprint_sha256 === envB.fingerprint_sha256 ||
    envA.descriptor.kind === envB.descriptor.kind ||
    envA.descriptor.implementation === envB.descriptor.implementation
  ) {
    fail("compiler_environments_not_independent");
  }

  exactMatch(
    outputA.creation.object,
    outputB.creation.object,
    "creation_bytecode_mismatch",
  );
  exactMatch(
    outputA.runtime.object,
    outputB.runtime.object,
    "runtime_bytecode_mismatch",
  );
  exactMatch(
    outputA.creation.opcodes,
    outputB.creation.opcodes,
    "creation_opcodes_mismatch",
  );
  exactMatch(
    outputA.runtime.opcodes,
    outputB.runtime.opcodes,
    "runtime_opcodes_mismatch",
  );
  exactMatch(
    outputA.creation.source_map,
    outputB.creation.source_map,
    "creation_source_map_mismatch",
  );
  exactMatch(
    outputA.runtime.source_map,
    outputB.runtime.source_map,
    "runtime_source_map_mismatch",
  );
  canonicalMatch(outputA.abi, outputB.abi, "abi_mismatch");
  exactMatch(outputA.metadata, outputB.metadata, "metadata_mismatch");
  canonicalMatch(
    outputA.storage_layout,
    outputB.storage_layout,
    "storage_layout_mismatch",
  );
  canonicalMatch(
    outputA.method_identifiers,
    outputB.method_identifiers,
    "method_identifiers_mismatch",
  );
  canonicalMatch(
    outputA.runtime.immutable_references,
    outputB.runtime.immutable_references,
    "immutable_references_mismatch",
  );

  const commit = boundedString(sourceCommit, 40, 40, "source_commit_invalid");
  if (!/^[0-9a-f]{40}$/.test(commit)) fail("source_commit_invalid");
  const ref = boundedString(sourceRef, 1, 256, "source_ref_invalid");
  const reviewed = timestamp(reviewedAt, "reviewed_at_invalid");
  const constructorArguments = encodeConstructorArguments();
  const deploymentData =
    outputA.creation.object + constructorArguments.replace(/^0x/, "");

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
      compiler_profile_marker: COMPILER_PROFILE_MARKER,
      compiler_profile_protocol: COMPILER_PROFILE_PROTOCOL,
      standard_json_input_raw_sha256: input.raw_sha256,
      standard_json_input_canonical_sha256: input.canonical_sha256,
    },
    compiler_profile: {
      compiler: "solc",
      semantic_version: SOLC_VERSION,
      release: SOLC_RELEASE,
      evm_version: EVM_VERSION,
      optimizer_enabled: true,
      optimizer_runs: 200,
      via_ir: false,
      push0_permitted: false,
    },
    environments: {
      compiler_a: {
        ...envA.descriptor,
        fingerprint_sha256: envA.fingerprint_sha256,
        output_raw_sha256: outputA.raw_sha256,
        output_canonical_sha256: outputA.canonical_output_sha256,
        warning_count: outputA.warning_count,
        informational_count: outputA.informational_count,
      },
      compiler_b: {
        ...envB.descriptor,
        fingerprint_sha256: envB.fingerprint_sha256,
        output_raw_sha256: outputB.raw_sha256,
        output_canonical_sha256: outputB.canonical_output_sha256,
        warning_count: outputB.warning_count,
        informational_count: outputB.informational_count,
      },
    },
    comparison: {
      distinct_environment_fingerprints: true,
      distinct_environment_kinds: true,
      distinct_implementations: true,
      exact_compiler_release: true,
      zero_compiler_errors: true,
      zero_link_references: true,
      push0_absent_from_creation_opcodes: true,
      push0_absent_from_runtime_opcodes: true,
      creation_bytecode_exact_match: true,
      runtime_bytecode_exact_match: true,
      creation_opcodes_exact_match: true,
      runtime_opcodes_exact_match: true,
      source_maps_exact_match: true,
      abi_exact_match: true,
      metadata_exact_match: true,
      storage_layout_exact_match: true,
      method_identifiers_exact_match: true,
      immutable_references_exact_match: true,
    },
    artifacts: {
      creation_bytecode_bytes: outputA.creation.bytes,
      creation_bytecode_sha256: outputA.creation.sha256,
      runtime_bytecode_bytes: outputA.runtime.bytes,
      runtime_bytecode_sha256: outputA.runtime.sha256,
      abi_sha256: sha256(canonicalJson(outputA.abi)),
      metadata_sha256: sha256(outputA.metadata),
      storage_layout_sha256: sha256(canonicalJson(outputA.storage_layout)),
      method_identifiers_sha256: sha256(
        canonicalJson(outputA.method_identifiers),
      ),
      immutable_references_sha256: sha256(
        canonicalJson(outputA.runtime.immutable_references),
      ),
      constructor_abi_encoded_arguments: constructorArguments,
      deployment_data_bytes: deploymentData.length / 2,
      deployment_data_sha256: sha256(Buffer.from(deploymentData, "hex")),
    },
    unresolved: {
      creation_bytecode_reviewed_by_zoso: false,
      runtime_bytecode_reviewed_by_zoso: false,
      compiler_distribution_trust_accepted: false,
      deployer_address: null,
      resulting_owner_address: null,
      deployment_nonce: null,
      gas_limit: null,
      fee_policy: null,
      unsigned_transaction: null,
    },
    ordered_gates: [
      "review_exact_creation_runtime_and_deployment_data_hashes",
      "obtain_separate_zoso_bytecode_acceptance",
      "bind_reviewed_deployer_address_as_resulting_registry_owner",
      "construct_but_do_not_sign_exact_unsigned_deployment_transaction",
      "obtain_separate_deployment_and_broadcast_authorization",
      "broadcast_once_and_capture_receipt",
      "verify_live_runtime_bytecode_policy_owner_and_chain2050",
      "write_live_registry_pointer_only_after_exact_postdeployment_proof",
    ],
    authority: Object.fromEntries(AUTHORITY_KEYS.map((key) => [key, false])),
    decision: {
      status: DECISION,
      compiler_outputs_reproduced: true,
      compiler_outputs_compared: true,
      creation_bytecode_exact_match: true,
      runtime_bytecode_exact_match: true,
      bytecode_reviewed_by_zoso: false,
      compiler_distribution_trust_accepted: false,
      deployer_and_owner_binding_resolved: false,
      unsigned_transaction_constructed: false,
      deployment_authorized: false,
      transaction_broadcast_authorized: false,
      execution_authorized: false,
      next_gate:
        "review_and_separately_accept_exact_bytecode_hashes_before_deployer_binding_or_transaction_construction",
    },
  };

  return {
    reproducibility_id: `voidvcrdcr1_${sha256(canonicalJson(body))}`,
    ...body,
  };
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
  const commit = gitValue(["rev-parse", "HEAD"], "git_head_unavailable");
  const dirty = gitValue(
    ["status", "--porcelain=v1", "--untracked-files=normal"],
    "git_status_unavailable",
  );
  if (dirty) fail("repository_not_clean");
  const branch = gitValue(
    ["branch", "--show-current"],
    "git_branch_unavailable",
  );
  const sourceRef =
    String(process.env.GITHUB_HEAD_REF || "").trim() ||
    branch ||
    "detached";
  return { commit, sourceRef };
}

function ensurePrivateDirectory(directory) {
  if (fs.existsSync(directory)) {
    const stats = fs.lstatSync(directory);
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      fail("output_directory_invalid");
    }
  } else {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  }
  fs.chmodSync(directory, 0o700);
}

function atomicWriteJson(file, value) {
  const resolved = path.resolve(file);
  ensurePrivateDirectory(path.dirname(resolved));
  if (fs.existsSync(resolved) && fs.lstatSync(resolved).isSymbolicLink()) {
    fail("output_symlink_forbidden");
  }
  const temporary = `${resolved}.tmp-${process.pid}-${crypto
    .randomBytes(6)
    .toString("hex")}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
  });
  fs.chmodSync(temporary, 0o600);
  fs.renameSync(temporary, resolved);
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
    if (["-h", "--help"].includes(raw)) {
      if (options.help === true) fail("duplicate_option", "help");
      options.help = true;
      continue;
    }
    if (!raw.startsWith("--")) fail("unexpected_argument", raw);
    const separator = raw.indexOf("=");
    const key = separator >= 0 ? raw.slice(2, separator) : raw.slice(2);
    if (!allowed.has(key)) fail("unknown_option", key);
    if (Object.hasOwn(options, key)) fail("duplicate_option", key);
    let value = separator >= 0 ? raw.slice(separator + 1) : "";
    if (separator < 0) {
      if (index + 1 >= argv.length || argv[index + 1].startsWith("--")) {
        fail("missing_option_value", key);
      }
      value = argv[index + 1];
      index += 1;
    }
    if (!value) fail("missing_option_value", key);
    options[key] = value;
  }
  return options;
}

function usage() {
  return `${MARKER}\n\nUsage:\n  node tools/void-validator-candidate-registry-dual-compiler-reproducibility-v1.mjs \\\n    --input PATH --output-a PATH --environment-a PATH \\\n    --output-b PATH --environment-b PATH [--review-output PATH]\n\nCompares two exact solc 0.8.20 Paris Standard JSON outputs. It reads only\npublic source/compiler files and writes an optional mode-600 review packet.\nIt performs no RPC, credential, wallet, transaction, deployment, validator,\nservice, Work Credit, settlement, or fund operation.\n`;
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help === true) {
    process.stdout.write(usage());
    return;
  }
  for (const required of [
    "input",
    "output-a",
    "environment-a",
    "output-b",
    "environment-b",
  ]) {
    if (!options[required]) fail(`${required.replaceAll("-", "_")}_required`);
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
  const environmentABytes = readBounded(
    path.resolve(options["environment-a"]),
    MAX_ENVIRONMENT_BYTES,
    "compiler_a_environment_file_invalid",
  );
  const environmentBBytes = readBounded(
    path.resolve(options["environment-b"]),
    MAX_ENVIRONMENT_BYTES,
    "compiler_b_environment_file_invalid",
  );
  const environmentA = parseJsonBytes(
    environmentABytes,
    "compiler_a_environment_json_invalid",
  );
  const environmentB = parseJsonBytes(
    environmentBBytes,
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
    atomicWriteJson(path.resolve(options["review-output"]), review);
  }
  process.stdout.write(`${JSON.stringify(review, null, 2)}\n`);
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((error) => {
    const code = error?.code || error?.name || "dual_compiler_review_failed";
    console.error(`${MARKER} HOLD code=${code} message=${error?.message}`);
    if (error?.details && Object.keys(error.details).length > 0) {
      console.error(JSON.stringify(error.details, null, 2));
    }
    process.exitCode = 1;
  });
}
