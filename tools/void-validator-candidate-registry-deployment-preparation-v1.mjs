#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE

import crypto from "node:crypto";
import fs from "node:fs";
import { isIP } from "node:net";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const MARKER =
  "VOID_VALIDATOR_CANDIDATE_REGISTRY_DEPLOYMENT_PREPARATION_V1";
export const PROTOCOL =
  "void-validator-candidate-registry-deployment-preparation/1";
export const RESOLVER_MARKER =
  "VOID_VALIDATOR_CANDIDATE_REGISTRY_LIVE_RESOLVER_V1";
export const CHAIN_ID = 2050;
export const MIN_VALIDATOR_STAKE_WEI = "10000000000000000000000";
export const MAX_ACTIVE_VALIDATORS = "256";
export const ACTIVATION_CHURN_LIMIT = "4";
export const CONTRACT_PATH =
  "contracts/mainnet0/VoidValidatorCandidateRegistry.sol";
export const DECISION =
  "HOLD_PENDING_REVIEWED_CREATION_BYTECODE_DEPLOYER_OWNER_BINDING_AND_SEPARATE_BROADCAST_AUTHORIZATION";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_REPORT_BYTES = 4 * 1024 * 1024;
const MAX_SOURCE_BYTES = 1024 * 1024;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

class PreparationError extends Error {
  constructor(code, message = code, details = {}) {
    super(message);
    this.name = "PreparationError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message = code, details = {}) {
  throw new PreparationError(code, message, details);
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
  return { value: new Date(milliseconds).toISOString(), milliseconds };
}

function boundedInteger(raw, minimum, maximum, code) {
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    fail(code);
  }
  return value;
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

function privateHttpHost(rawHostname) {
  const hostname = String(rawHostname || "")
    .replace(/^\[|\]$/g, "")
    .toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".ts.net")
  ) {
    return true;
  }
  const family = isIP(hostname);
  if (family === 4) {
    const octets = hostname.split(".").map(Number);
    return (
      octets[0] === 10 ||
      octets[0] === 127 ||
      (octets[0] === 192 && octets[1] === 168) ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127)
    );
  }
  if (family === 6) return /^(fc|fd|fe8|fe9|fea|feb)/i.test(hostname);
  return false;
}

function normalizeRpcOrigin(raw) {
  let parsed;
  try {
    parsed = new URL(String(raw || ""));
  } catch {
    fail("resolver_rpc_origin_invalid");
  }
  const privateHttp =
    parsed.protocol === "http:" && privateHttpHost(parsed.hostname);
  if (
    (parsed.protocol !== "https:" && !privateHttp) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    (parsed.pathname && parsed.pathname !== "/")
  ) {
    fail("resolver_rpc_origin_invalid");
  }
  return parsed.origin;
}

function normalizeAddress(raw) {
  const value = String(raw || "");
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) fail("resolver_address_invalid");
  return value.toLowerCase();
}

function safeAuthorityBoundary(boundary) {
  return (
    boundary &&
    boundary.read_only_rpc === true &&
    boundary.artifact_pointer_overwritten === false &&
    boundary.contract_deployed === false &&
    boundary.transaction_signed === false &&
    boundary.transaction_broadcast === false &&
    boundary.wallet_or_signer_access === false &&
    boundary.validator_state_mutated === false &&
    boundary.fund_movement === false
  );
}

function parseArtifacts(scan) {
  if (
    !scan ||
    scan.exists !== true ||
    !Number.isInteger(scan.scanned_files) ||
    scan.scanned_files < 1 ||
    !Array.isArray(scan.rejected_files) ||
    scan.rejected_files.length !== 0 ||
    !Array.isArray(scan.artifacts) ||
    scan.artifacts.length !== scan.scanned_files
  ) {
    fail("resolver_artifact_evidence_incomplete");
  }

  const artifactByName = new Map();
  const allAddresses = new Set();
  for (const artifact of scan.artifacts) {
    const name = String(artifact?.name || "");
    const digest = String(artifact?.sha256 || "").toLowerCase();
    if (
      !/^validator-candidate-registry\.[A-Za-z0-9._-]+\.json$/.test(name) ||
      artifactByName.has(name) ||
      !/^[0-9a-f]{64}$/.test(digest) ||
      !Number.isInteger(artifact?.bytes) ||
      artifact.bytes <= 0 ||
      !Array.isArray(artifact?.addresses)
    ) {
      fail("resolver_artifact_evidence_incomplete");
    }

    const addresses = new Set();
    for (const rawAddress of artifact.addresses) {
      const normalized = normalizeAddress(rawAddress);
      if (addresses.has(normalized)) fail("resolver_artifact_duplicate_address");
      addresses.add(normalized);
      allAddresses.add(normalized);
    }
    artifactByName.set(name, { digest, addresses });
  }
  if (allAddresses.size < 1) fail("resolver_artifact_addresses_empty");
  return { artifactByName, allAddresses };
}

function validateResultSources(resultAddress, sources, artifactByName) {
  const expected = [...artifactByName.entries()]
    .filter(([, artifact]) => artifact.addresses.has(resultAddress))
    .map(([name]) => name)
    .sort();
  const actual = [];
  const seen = new Set();

  for (const source of sources) {
    const name = String(source?.artifact || "");
    const digest = String(source?.artifact_sha256 || "").toLowerCase();
    const artifact = artifactByName.get(name);
    if (
      !artifact ||
      seen.has(name) ||
      digest !== artifact.digest ||
      !artifact.addresses.has(resultAddress)
    ) {
      fail("resolver_result_source_mismatch", undefined, {
        address: resultAddress,
        artifact: name || null,
      });
    }
    seen.add(name);
    actual.push(name);
  }
  actual.sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("resolver_result_source_mismatch", undefined, {
      address: resultAddress,
    });
  }
}

export function validateResolverReport({
  report,
  preparedAt,
  maxReportAgeMs = 15 * 60 * 1000,
}) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    fail("resolver_report_invalid");
  }
  if (report.marker !== RESOLVER_MARKER || report.version !== 1) {
    fail("resolver_contract_mismatch");
  }
  if (Number(report.chain_id) !== CHAIN_ID) fail("resolver_wrong_chain");
  if (
    report.decision !== "HOLD_NO_LIVE_EXACT_REGISTRY" ||
    report.ready !== false ||
    report.selected_address !== null
  ) {
    fail("resolver_not_deployment_candidate");
  }
  if (!safeAuthorityBoundary(report.authority_boundary)) {
    fail("resolver_authority_boundary_invalid");
  }

  const prepared = timestamp(preparedAt, "prepared_at_invalid");
  const observed = timestamp(
    report.observed_at_utc,
    "resolver_observed_at_invalid",
  );
  const maximumAge = boundedInteger(
    maxReportAgeMs,
    1,
    24 * 60 * 60 * 1000,
    "max_report_age_invalid",
  );
  const age = prepared.milliseconds - observed.milliseconds;
  if (age < -MAX_FUTURE_SKEW_MS) fail("resolver_report_from_future");
  if (age > maximumAge) fail("resolver_report_stale");

  const { artifactByName, allAddresses } = parseArtifacts(report.artifact_scan);
  if (!Array.isArray(report.results) || report.results.length < 1) {
    fail("resolver_results_empty");
  }

  const resultAddresses = new Set();
  for (const result of report.results) {
    if (
      result?.classification !== "stale_no_code" ||
      result?.code_present !== false ||
      result?.calls_succeeded !== false ||
      result?.error !== null ||
      !Array.isArray(result?.sources) ||
      result.sources.length < 1
    ) {
      fail("resolver_contains_uncertain_or_live_registry", undefined, {
        address: result?.address ?? null,
        classification: result?.classification ?? null,
      });
    }
    const resultAddress = normalizeAddress(result.address);
    if (resultAddresses.has(resultAddress)) fail("resolver_duplicate_address");
    validateResultSources(resultAddress, result.sources, artifactByName);
    resultAddresses.add(resultAddress);
  }

  const artifacts = [...allAddresses].sort();
  const results = [...resultAddresses].sort();
  if (JSON.stringify(results) !== JSON.stringify(artifacts)) {
    fail("resolver_artifact_result_mismatch");
  }

  return {
    prepared_at_utc: prepared.value,
    resolver_observed_at_utc: observed.value,
    resolver_age_ms: age,
    rpc_origin: normalizeRpcOrigin(report.rpc_origin),
    stale_addresses: results,
    scanned_artifact_files: report.artifact_scan.scanned_files,
  };
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
  ]) {
    if (!source.includes(required)) {
      fail("contract_source_contract_mismatch", `source missing: ${required}`);
    }
  }
}

export function buildPreparation({
  resolverReport,
  resolverBytes,
  contractBytes,
  sourceCommit,
  sourceBranch,
  preparedAt,
  maxReportAgeMs = 15 * 60 * 1000,
}) {
  if (!Buffer.isBuffer(resolverBytes) || resolverBytes.length <= 0) {
    fail("resolver_bytes_invalid");
  }
  let parsedResolverBytes;
  try {
    parsedResolverBytes = JSON.parse(resolverBytes.toString("utf8"));
  } catch {
    fail("resolver_bytes_json_invalid");
  }
  if (canonicalJson(parsedResolverBytes) !== canonicalJson(resolverReport)) {
    fail("resolver_report_bytes_mismatch");
  }
  validateSource(contractBytes);
  if (!/^[0-9a-f]{40}$/.test(String(sourceCommit || ""))) {
    fail("source_commit_invalid");
  }
  if (sourceBranch !== "main") fail("source_branch_not_main");

  const resolver = validateResolverReport({
    report: resolverReport,
    preparedAt,
    maxReportAgeMs,
  });
  const encodedArguments = encodeConstructorArguments();
  const body = {
    marker: MARKER,
    protocol: PROTOCOL,
    version: 1,
    prepared_at_utc: resolver.prepared_at_utc,
    source: {
      repository: "6ZoSo9/void-node",
      source_commit: sourceCommit,
      source_branch: sourceBranch,
      contract_path: CONTRACT_PATH,
      contract_source_sha256: sha256(contractBytes),
      contract_source_bytes: contractBytes.length,
      resolver_report_sha256: sha256(resolverBytes),
      resolver_marker: RESOLVER_MARKER,
      resolver_observed_at_utc: resolver.resolver_observed_at_utc,
      resolver_age_ms: resolver.resolver_age_ms,
      resolver_decision: resolverReport.decision,
      scanned_artifact_files: resolver.scanned_artifact_files,
      stale_candidate_addresses: resolver.stale_addresses,
    },
    chain: {
      chain_id: CHAIN_ID,
      rpc_origin: resolver.rpc_origin,
    },
    policy: {
      min_validator_stake_wei: MIN_VALIDATOR_STAKE_WEI,
      min_validator_stake_void: "10000",
      max_active_validators: MAX_ACTIVE_VALIDATORS,
      activation_churn_limit: ACTIVATION_CHURN_LIMIT,
      public_registration_starts_as_candidate: true,
      public_registration_activates_validator: false,
    },
    compiler_profile: {
      solc_version: "0.8.20",
      optimizer_enabled: true,
      optimizer_runs: 200,
      creation_bytecode_compiled: false,
      creation_bytecode_reviewed: false,
    },
    constructor: {
      signature: "constructor(uint256,uint256,uint256)",
      types: ["uint256", "uint256", "uint256"],
      values: [
        MIN_VALIDATOR_STAKE_WEI,
        MAX_ACTIVE_VALIDATORS,
        ACTIVATION_CHURN_LIMIT,
      ],
      abi_encoded_arguments: encodedArguments,
      abi_encoded_arguments_sha256: sha256(
        Buffer.from(encodedArguments.slice(2), "hex"),
      ),
    },
    unresolved: {
      creation_bytecode_sha256: null,
      runtime_bytecode_sha256: null,
      deployer_address: null,
      resulting_owner_address: null,
      deployment_nonce: null,
      gas_limit: null,
      fee_policy: null,
      unsigned_transaction: null,
      owner_binding_reviewed: false,
    },
    ordered_gates: [
      "rerun_read_only_live_registry_resolver_on_exact_chain_2050",
      "verify_all_known_registry_artifacts_remain_stale_no_code",
      "compile_exact_bound_contract_with_locked_compiler_profile",
      "independently_review_creation_and_runtime_bytecode_hashes",
      "bind_reviewed_deployer_address_as_resulting_registry_owner",
      "construct_but_do_not_sign_exact_unsigned_deployment_transaction",
      "obtain_separate_zoso_deployment_and_broadcast_authorization",
      "broadcast_once_and_capture_transaction_receipt",
      "rerun_live_resolver_and_write_selection_only_after_exact_policy_proof",
    ],
    authority: {
      credential_file_access_authorized: false,
      private_key_access_authorized: false,
      wallet_or_signer_access_authorized: false,
      creation_bytecode_acceptance_authorized: false,
      transaction_construction_authorized: false,
      signing_authorized: false,
      transaction_broadcast_authorized: false,
      contract_deployment_authorized: false,
      artifact_pointer_write_authorized: false,
      validator_registration_authorized: false,
      validator_waiting_transition_authorized: false,
      validator_activation_authorized: false,
      service_restart_authorized: false,
      fund_movement_authorized: false,
    },
    decision: {
      status: DECISION,
      source_review_packet_complete: true,
      known_registry_artifacts_proven_stale: true,
      creation_bytecode_reviewed: false,
      deployer_and_owner_binding_resolved: false,
      unsigned_transaction_constructed: false,
      deployment_authorized: false,
      transaction_broadcast_authorized: false,
      execution_authorized: false,
      next_gate:
        "compile_and_independently_review_exact_creation_bytecode_without_signing_or_broadcast",
    },
  };

  return {
    preparation_id: `voidvcrdp1_${sha256(canonicalJson(body))}`,
    ...body,
  };
}

function parseArgs(argv) {
  const options = {};
  const allowed = new Set([
    "resolver-report",
    "output",
    "max-report-age-ms",
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
  const rootStats = fs.lstatSync(ROOT);
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
    fail("repository_root_invalid");
  }
  const sourceCommit = gitValue(["rev-parse", "HEAD"], "git_head_unavailable");
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

function atomicWriteJson(file, value) {
  const resolved = path.resolve(file);
  const directory = path.dirname(resolved);
  ensurePrivateDirectory(directory);
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
  return resolved;
}

function usage() {
  return `${MARKER}\n\nUsage:\n  node tools/void-validator-candidate-registry-deployment-preparation-v1.mjs \\\n    --resolver-report PATH [--output PATH] [--max-report-age-ms 900000]\n\nThis command uses the current system clock to enforce resolver freshness. It\nreads a read-only resolver report and the fixed registry contract source, then\ncreates only a mode-600 review packet. It does not compile bytecode, access\ncredentials, construct or sign a transaction, broadcast, deploy, register or\nactivate a validator, restart a service, or move funds.\n`;
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help === "true") {
    process.stdout.write(usage());
    return;
  }
  if (!options["resolver-report"]) fail("resolver_report_required");

  const { sourceCommit, sourceBranch } = exactRepositoryState();
  const reportPath = path.resolve(options["resolver-report"]);
  const resolverBytes = readBounded(
    reportPath,
    MAX_REPORT_BYTES,
    "resolver_report_file_invalid",
  );
  let resolverReport;
  try {
    resolverReport = JSON.parse(resolverBytes.toString("utf8"));
  } catch {
    fail("resolver_report_json_invalid");
  }

  const contractBytes = readBounded(
    path.join(ROOT, CONTRACT_PATH),
    MAX_SOURCE_BYTES,
    "contract_source_file_invalid",
  );
  const packet = buildPreparation({
    resolverReport,
    resolverBytes,
    contractBytes,
    sourceCommit,
    sourceBranch,
    preparedAt: new Date().toISOString(),
    maxReportAgeMs: boundedInteger(
      options["max-report-age-ms"] || 15 * 60 * 1000,
      1,
      24 * 60 * 60 * 1000,
      "max_report_age_invalid",
    ),
  });

  if (options.output) atomicWriteJson(options.output, packet);
  process.stdout.write(`${JSON.stringify(packet, null, 2)}\n`);
}

const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().catch((error) => {
    const code = error?.code || error?.name || "preparation_failed";
    console.error(`${MARKER} HOLD code=${code} message=${error?.message}`);
    if (error?.details && Object.keys(error.details).length > 0) {
      console.error(JSON.stringify(error.details, null, 2));
    }
    process.exitCode = 1;
  });
}
