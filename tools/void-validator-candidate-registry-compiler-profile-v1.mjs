#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const MARKER =
  "VOID_VALIDATOR_CANDIDATE_REGISTRY_COMPILER_PROFILE_V1";
export const PROTOCOL =
  "void-validator-candidate-registry-compiler-profile/1";
export const PREPARATION_MARKER =
  "VOID_VALIDATOR_CANDIDATE_REGISTRY_DEPLOYMENT_PREPARATION_V1";
export const PREPARATION_PROTOCOL =
  "void-validator-candidate-registry-deployment-preparation/1";
export const PREPARATION_DECISION =
  "HOLD_PENDING_REVIEWED_CREATION_BYTECODE_DEPLOYER_OWNER_BINDING_AND_SEPARATE_BROADCAST_AUTHORIZATION";
export const CHAIN_ID = 2050;
export const MIN_VALIDATOR_STAKE_WEI = "10000000000000000000000";
export const MAX_ACTIVE_VALIDATORS = "256";
export const ACTIVATION_CHURN_LIMIT = "4";
export const CONTRACT_PATH =
  "contracts/mainnet0/VoidValidatorCandidateRegistry.sol";
export const CONTRACT_NAME = "VoidValidatorCandidateRegistry";
export const SOLC_VERSION = "0.8.20";
export const SOLC_RELEASE = "0.8.20+commit.a1b79de6";
export const EVM_VERSION = "paris";
export const DECISION =
  "HOLD_PENDING_TWO_INDEPENDENT_SOLC_0_8_20_PARIS_OUTPUTS_AND_BYTECODE_REVIEW";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_PACKET_BYTES = 4 * 1024 * 1024;
const MAX_SOURCE_BYTES = 1024 * 1024;

const PREPARATION_AUTHORITY_KEYS = [
  "credential_file_access_authorized",
  "private_key_access_authorized",
  "wallet_or_signer_access_authorized",
  "creation_bytecode_acceptance_authorized",
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

export const AUTHORITY_KEYS = [
  "credential_file_access_authorized",
  "private_key_access_authorized",
  "wallet_or_signer_access_authorized",
  "compiler_execution_authorized",
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

class CompilerProfileError extends Error {
  constructor(code, message = code, details = {}) {
    super(message);
    this.name = "CompilerProfileError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message = code, details = {}) {
  throw new CompilerProfileError(code, message, details);
}

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

function timestamp(raw, code) {
  const value = String(raw || "").trim();
  const milliseconds = Date.parse(value);
  if (!value || !Number.isFinite(milliseconds)) fail(code);
  return new Date(milliseconds).toISOString();
}

function plainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function exactKeys(value, expected, code) {
  if (!plainObject(value)) fail(code);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) fail(code);
}

function falseAuthority(value, keys, code) {
  exactKeys(value, keys, code);
  for (const key of keys) {
    if (value[key] !== false) fail(code, code, { key, value: value[key] });
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

function encodeUint256(raw) {
  const value = BigInt(raw);
  if (value < 0n || value >= 2n ** 256n) fail("constructor_value_invalid");
  return value.toString(16).padStart(64, "0");
}

export function encodeConstructorArguments() {
  return `0x${[
    MIN_VALIDATOR_STAKE_WEI,
    MAX_ACTIVE_VALIDATORS,
    ACTIVATION_CHURN_LIMIT,
  ].map(encodeUint256).join("")}`;
}

function validateSource(sourceBytes) {
  if (!Buffer.isBuffer(sourceBytes)) fail("contract_source_invalid");
  if (sourceBytes.length <= 0 || sourceBytes.length > MAX_SOURCE_BYTES) {
    fail("contract_source_invalid");
  }
  const source = sourceBytes.toString("utf8");
  for (const required of [
    "contract VoidValidatorCandidateRegistry",
    "uint256 _minValidatorStake",
    "uint256 _maxActiveValidators",
    "uint256 _activationChurnLimit",
    "owner = msg.sender",
    "state: ValidatorState.Candidate",
    "function markActiveBatch",
  ]) {
    if (!source.includes(required)) {
      fail("contract_source_contract_mismatch", `source missing: ${required}`);
    }
  }
  return source;
}

function validatePreparation({
  preparation,
  preparationBytes,
  sourceBytes,
  sourceCommit,
  sourceBranch,
}) {
  if (!plainObject(preparation)) fail("preparation_invalid");
  if (
    preparation.marker !== PREPARATION_MARKER ||
    preparation.protocol !== PREPARATION_PROTOCOL ||
    preparation.version !== 1
  ) {
    fail("preparation_contract_mismatch");
  }

  if (!Buffer.isBuffer(preparationBytes) || preparationBytes.length <= 0) {
    fail("preparation_bytes_invalid");
  }
  let parsedBytes;
  try {
    parsedBytes = JSON.parse(preparationBytes.toString("utf8"));
  } catch {
    fail("preparation_bytes_json_invalid");
  }
  if (canonicalJson(parsedBytes) !== canonicalJson(preparation)) {
    fail("preparation_bytes_object_mismatch");
  }

  const { preparation_id: preparationId, ...preparationBody } = preparation;
  if (
    preparationId !==
    `voidvcrdp1_${sha256(canonicalJson(preparationBody))}`
  ) {
    fail("preparation_id_invalid");
  }

  if (!/^[0-9a-f]{40}$/.test(String(sourceCommit || ""))) {
    fail("source_commit_invalid");
  }
  if (sourceBranch !== "main") fail("source_branch_not_main");

  const source = preparation.source;
  if (
    !plainObject(source) ||
    source.repository !== "6ZoSo9/void-node" ||
    source.source_commit !== sourceCommit ||
    source.source_branch !== sourceBranch ||
    source.contract_path !== CONTRACT_PATH ||
    source.contract_source_sha256 !== sha256(sourceBytes) ||
    source.contract_source_bytes !== sourceBytes.length ||
    source.resolver_marker !==
      "VOID_VALIDATOR_CANDIDATE_REGISTRY_LIVE_RESOLVER_V1" ||
    source.resolver_decision !== "HOLD_NO_LIVE_EXACT_REGISTRY" ||
    !Number.isInteger(source.scanned_artifact_files) ||
    source.scanned_artifact_files < 1 ||
    !Array.isArray(source.stale_candidate_addresses) ||
    source.stale_candidate_addresses.length < 1
  ) {
    fail("preparation_source_binding_invalid");
  }
  for (const address of source.stale_candidate_addresses) {
    if (!/^0x[0-9a-f]{40}$/.test(String(address || ""))) {
      fail("preparation_source_binding_invalid");
    }
  }

  if (
    !plainObject(preparation.chain) ||
    preparation.chain.chain_id !== CHAIN_ID ||
    typeof preparation.chain.rpc_origin !== "string" ||
    preparation.chain.rpc_origin.length < 8
  ) {
    fail("preparation_chain_invalid");
  }

  const policy = preparation.policy;
  if (
    !plainObject(policy) ||
    policy.min_validator_stake_wei !== MIN_VALIDATOR_STAKE_WEI ||
    policy.min_validator_stake_void !== "10000" ||
    policy.max_active_validators !== MAX_ACTIVE_VALIDATORS ||
    policy.activation_churn_limit !== ACTIVATION_CHURN_LIMIT ||
    policy.public_registration_starts_as_candidate !== true ||
    policy.public_registration_activates_validator !== false
  ) {
    fail("preparation_policy_invalid");
  }

  const compilerProfile = preparation.compiler_profile;
  if (
    !plainObject(compilerProfile) ||
    compilerProfile.solc_version !== SOLC_VERSION ||
    compilerProfile.optimizer_enabled !== true ||
    compilerProfile.optimizer_runs !== 200 ||
    compilerProfile.creation_bytecode_compiled !== false ||
    compilerProfile.creation_bytecode_reviewed !== false
  ) {
    fail("preparation_compiler_profile_invalid");
  }

  const encodedArguments = encodeConstructorArguments();
  const constructor = preparation.constructor;
  if (
    !plainObject(constructor) ||
    constructor.signature !== "constructor(uint256,uint256,uint256)" ||
    JSON.stringify(constructor.types) !==
      JSON.stringify(["uint256", "uint256", "uint256"]) ||
    JSON.stringify(constructor.values) !==
      JSON.stringify([
        MIN_VALIDATOR_STAKE_WEI,
        MAX_ACTIVE_VALIDATORS,
        ACTIVATION_CHURN_LIMIT,
      ]) ||
    constructor.abi_encoded_arguments !== encodedArguments ||
    constructor.abi_encoded_arguments_sha256 !==
      sha256(Buffer.from(encodedArguments.slice(2), "hex"))
  ) {
    fail("preparation_constructor_invalid");
  }

  const unresolved = preparation.unresolved;
  if (
    !plainObject(unresolved) ||
    unresolved.creation_bytecode_sha256 !== null ||
    unresolved.runtime_bytecode_sha256 !== null ||
    unresolved.deployer_address !== null ||
    unresolved.resulting_owner_address !== null ||
    unresolved.deployment_nonce !== null ||
    unresolved.gas_limit !== null ||
    unresolved.fee_policy !== null ||
    unresolved.unsigned_transaction !== null ||
    unresolved.owner_binding_reviewed !== false
  ) {
    fail("preparation_unresolved_boundary_invalid");
  }

  falseAuthority(
    preparation.authority,
    PREPARATION_AUTHORITY_KEYS,
    "preparation_authority_invalid",
  );

  const decision = preparation.decision;
  if (
    !plainObject(decision) ||
    decision.status !== PREPARATION_DECISION ||
    decision.source_review_packet_complete !== true ||
    decision.known_registry_artifacts_proven_stale !== true ||
    decision.creation_bytecode_reviewed !== false ||
    decision.deployer_and_owner_binding_resolved !== false ||
    decision.unsigned_transaction_constructed !== false ||
    decision.deployment_authorized !== false ||
    decision.transaction_broadcast_authorized !== false ||
    decision.execution_authorized !== false
  ) {
    fail("preparation_decision_invalid");
  }

  timestamp(preparation.prepared_at_utc, "preparation_timestamp_invalid");
  timestamp(source.resolver_observed_at_utc, "resolver_timestamp_invalid");

  return {
    preparation_id: preparationId,
    preparation_sha256: sha256(preparationBytes),
    preparation_bytes: preparationBytes.length,
    preparation_prepared_at_utc: preparation.prepared_at_utc,
    resolver_observed_at_utc: source.resolver_observed_at_utc,
    rpc_origin: preparation.chain.rpc_origin,
    stale_candidate_addresses: [...source.stale_candidate_addresses].sort(),
  };
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

export function buildCompilerProfile({
  preparation,
  preparationBytes,
  sourceBytes,
  sourceCommit,
  sourceBranch,
  reviewedAt,
}) {
  const sourceText = validateSource(sourceBytes);
  const preparationBinding = validatePreparation({
    preparation,
    preparationBytes,
    sourceBytes,
    sourceCommit,
    sourceBranch,
  });
  const reviewed = timestamp(reviewedAt, "reviewed_at_invalid");
  const standardJsonInput = buildStandardJsonInput(sourceText);
  const standardJsonInputSha256 = sha256(canonicalJson(standardJsonInput));

  const body = {
    marker: MARKER,
    protocol: PROTOCOL,
    version: 1,
    reviewed_at_utc: reviewed,
    source: {
      repository: "6ZoSo9/void-node",
      source_commit: sourceCommit,
      source_branch: sourceBranch,
      contract_path: CONTRACT_PATH,
      contract_name: CONTRACT_NAME,
      contract_source_sha256: sha256(sourceBytes),
      contract_source_bytes: sourceBytes.length,
      preparation_id: preparationBinding.preparation_id,
      preparation_sha256: preparationBinding.preparation_sha256,
      preparation_bytes: preparationBinding.preparation_bytes,
      preparation_prepared_at_utc:
        preparationBinding.preparation_prepared_at_utc,
      resolver_observed_at_utc:
        preparationBinding.resolver_observed_at_utc,
      stale_candidate_addresses:
        preparationBinding.stale_candidate_addresses,
    },
    chain: {
      chain_id: CHAIN_ID,
      rpc_origin_from_preparation: preparationBinding.rpc_origin,
      shanghai_support_assumed: false,
      push0_dependency_permitted: false,
    },
    compiler_profile: {
      compiler: "solc",
      semantic_version: SOLC_VERSION,
      release: SOLC_RELEASE,
      language: "Solidity",
      evm_version: EVM_VERSION,
      optimizer_enabled: true,
      optimizer_runs: 200,
      via_ir: false,
      debug_revert_strings: "default",
      metadata_append_cbor: true,
      metadata_use_literal_content: true,
      metadata_bytecode_hash: "ipfs",
      libraries: {},
      standard_json_input_sha256: standardJsonInputSha256,
      standard_json_input: standardJsonInput,
    },
    constructor: {
      signature: "constructor(uint256,uint256,uint256)",
      types: ["uint256", "uint256", "uint256"],
      values: [
        MIN_VALIDATOR_STAKE_WEI,
        MAX_ACTIVE_VALIDATORS,
        ACTIVATION_CHURN_LIMIT,
      ],
      abi_encoded_arguments: encodeConstructorArguments(),
    },
    dual_compilation_requirements: {
      minimum_compiler_outputs: 2,
      distinct_environment_fingerprints_required: true,
      exact_compiler_release_required: SOLC_RELEASE,
      exact_standard_json_input_sha256_required: standardJsonInputSha256,
      no_compiler_errors_required: true,
      no_link_references_required: true,
      creation_bytecode_exact_match_required: true,
      runtime_bytecode_exact_match_required: true,
      abi_exact_match_required: true,
      metadata_exact_match_required: true,
      storage_layout_exact_match_required: true,
      method_identifiers_exact_match_required: true,
    },
    unresolved: {
      compiler_environment_a: null,
      compiler_environment_b: null,
      compiler_output_a_sha256: null,
      compiler_output_b_sha256: null,
      creation_bytecode_sha256: null,
      runtime_bytecode_sha256: null,
      abi_sha256: null,
      metadata_sha256: null,
      storage_layout_sha256: null,
      method_identifiers_sha256: null,
      compiler_outputs_compared: false,
      creation_bytecode_reviewed: false,
      runtime_bytecode_reviewed: false,
      deployer_address: null,
      resulting_owner_address: null,
      deployment_nonce: null,
      gas_limit: null,
      fee_policy: null,
      unsigned_transaction: null,
    },
    ordered_gates: [
      "run_exact_standard_json_input_with_solc_0_8_20_in_environment_a",
      "run_exact_standard_json_input_with_solc_0_8_20_in_independent_environment_b",
      "verify_both_compilers_report_exact_release_0_8_20_commit_a1b79de6",
      "verify_both_outputs_have_zero_compiler_errors_and_zero_link_references",
      "compare_creation_runtime_abi_metadata_storage_and_method_identifier_outputs",
      "obtain_separate_zoso_acceptance_of_exact_creation_and_runtime_bytecode_hashes",
      "bind_reviewed_deployer_address_as_resulting_registry_owner",
      "construct_but_do_not_sign_exact_unsigned_deployment_transaction",
      "obtain_separate_zoso_deployment_and_broadcast_authorization",
      "broadcast_once_and_capture_transaction_receipt",
      "verify_live_code_policy_owner_and_runtime_bytecode_before_pointer_selection",
    ],
    authority: Object.fromEntries(
      AUTHORITY_KEYS.map((key) => [key, false]),
    ),
    decision: {
      status: DECISION,
      preparation_packet_validated: true,
      explicit_evm_target_bound: true,
      shanghai_support_assumed: false,
      compiler_input_complete: true,
      compiler_executed: false,
      compiler_outputs_compared: false,
      creation_bytecode_reviewed: false,
      runtime_bytecode_reviewed: false,
      deployer_and_owner_binding_resolved: false,
      unsigned_transaction_constructed: false,
      deployment_authorized: false,
      transaction_broadcast_authorized: false,
      execution_authorized: false,
      next_gate:
        "run_the_exact_standard_json_input_in_two_independent_environments_and_compare_outputs_without_signing_or_broadcast",
    },
  };

  return {
    compiler_profile_id: `voidvcrcp1_${sha256(canonicalJson(body))}`,
    ...body,
  };
}

function parseArgs(argv) {
  const options = {};
  const allowed = new Set([
    "preparation",
    "output",
    "compiler-input-output",
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    if (["-h", "--help"].includes(raw)) {
      if (options.help === "true") fail("duplicate_option", "help");
      options.help = "true";
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

function gitValue(args, code) {
  const result = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) fail(code);
  return result.stdout.trim();
}

function exactRepositoryState() {
  let rootStats;
  try {
    rootStats = fs.lstatSync(ROOT);
  } catch {
    fail("repository_root_invalid");
  }
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
    fail("repository_root_invalid");
  }
  const sourceCommit = gitValue(
    ["rev-parse", "HEAD"],
    "git_head_unavailable",
  );
  const sourceBranch = gitValue(
    ["branch", "--show-current"],
    "git_branch_unavailable",
  );
  const dirty = gitValue(
    ["status", "--porcelain=v1", "--untracked-files=normal"],
    "git_status_unavailable",
  );
  if (sourceBranch !== "main") fail("repository_not_on_main");
  if (dirty) fail("repository_not_clean");
  return { sourceCommit, sourceBranch };
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

function atomicWrite(file, bytes) {
  const resolved = path.resolve(file);
  const directory = path.dirname(resolved);
  ensurePrivateDirectory(directory);
  if (fs.existsSync(resolved) && fs.lstatSync(resolved).isSymbolicLink()) {
    fail("output_symlink_forbidden");
  }
  const temporary = `${resolved}.tmp-${process.pid}-${crypto
    .randomBytes(6)
    .toString("hex")}`;
  fs.writeFileSync(temporary, bytes, { mode: 0o600 });
  fs.chmodSync(temporary, 0o600);
  fs.renameSync(temporary, resolved);
  fs.chmodSync(resolved, 0o600);
  return resolved;
}

function usage() {
  return `${MARKER}

Usage:
  node tools/void-validator-candidate-registry-compiler-profile-v1.mjs \\
    --preparation PATH [--output PATH] [--compiler-input-output PATH]

This command reads the reviewed deployment-preparation packet and the fixed
registry source from a clean exact-main checkout. It emits only a mode-600
compiler-profile packet and optional Standard JSON compiler input.

It does not run solc, query RPC, access credentials or wallets, compile or
accept bytecode, construct/sign/broadcast a transaction, deploy a contract,
write a registry pointer, register or activate a validator, restart a service,
or move funds.
`;
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help === "true") {
    process.stdout.write(usage());
    return;
  }
  if (!options.preparation) fail("preparation_required");

  const { sourceCommit, sourceBranch } = exactRepositoryState();
  const preparationPath = path.resolve(options.preparation);
  const preparationBytes = readBounded(
    preparationPath,
    MAX_PACKET_BYTES,
    "preparation_file_invalid",
  );
  let preparation;
  try {
    preparation = JSON.parse(preparationBytes.toString("utf8"));
  } catch {
    fail("preparation_json_invalid");
  }
  const sourceBytes = readBounded(
    path.join(ROOT, CONTRACT_PATH),
    MAX_SOURCE_BYTES,
    "contract_source_file_invalid",
  );
  const packet = buildCompilerProfile({
    preparation,
    preparationBytes,
    sourceBytes,
    sourceCommit,
    sourceBranch,
    reviewedAt: new Date().toISOString(),
  });

  const outputPath = options.output
    ? path.resolve(options.output)
    : "";
  const compilerInputPath = options["compiler-input-output"]
    ? path.resolve(options["compiler-input-output"])
    : "";
  if (
    outputPath &&
    compilerInputPath &&
    outputPath === compilerInputPath
  ) {
    fail("output_paths_must_differ");
  }

  if (outputPath) {
    atomicWrite(
      outputPath,
      Buffer.from(`${JSON.stringify(packet, null, 2)}\n`),
    );
  }
  if (compilerInputPath) {
    atomicWrite(
      compilerInputPath,
      Buffer.from(
        `${JSON.stringify(
          packet.compiler_profile.standard_json_input,
          null,
          2,
        )}\n`,
      ),
    );
  }
  process.stdout.write(`${JSON.stringify(packet, null, 2)}\n`);
}

const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().catch((error) => {
    const code = error?.code || error?.name || "compiler_profile_failed";
    console.error(`${MARKER} HOLD code=${code} message=${error?.message}`);
    if (error?.details && Object.keys(error.details).length > 0) {
      console.error(JSON.stringify(error.details, null, 2));
    }
    process.exitCode = 1;
  });
}
