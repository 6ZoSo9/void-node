#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE

import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  Contract,
  JsonRpcProvider,
  formatEther,
  getAddress,
  isAddress,
  parseEther,
} from "ethers";

export const MARKER = "VOID_VALIDATOR_CANDIDATE_REGISTRY_LIVE_RESOLVER_V1";
export const SELECTION_MARKER =
  "VOID_VALIDATOR_CANDIDATE_REGISTRY_LIVE_SELECTION_V1";
export const CHAIN_ID = 2050n;
export const MIN_VALIDATOR_STAKE_WEI = parseEther("10000");
export const REGISTRY_ABI = Object.freeze([
  "function minValidatorStake() view returns (uint256)",
  "function maxActiveValidators() view returns (uint256)",
  "function activationChurnLimit() view returns (uint256)",
  "function owner() view returns (address)",
  "function candidateCount() view returns (uint256)",
  "function waitingCount() view returns (uint256)",
  "function activeCount() view returns (uint256)",
]);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_ARTIFACT_DIR = path.join(ROOT, ".runtime", "mainnet0");
const DEFAULT_OUTPUT_DIR = path.join(
  os.homedir(),
  ".local",
  "state",
  "void",
  "validator-candidate-registry-live-resolver-v1",
);
const ADDRESS_KEYS = new Set([
  "registry",
  "candidate_registry",
  "candidateRegistry",
  "deployedTo",
  "contractAddress",
  "contract_address",
]);

class ResolverError extends Error {
  constructor(code, message = code, details = {}) {
    super(message);
    this.name = "ResolverError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message = code, details = {}) {
  throw new ResolverError(code, message, details);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeError(error) {
  return String(error?.code || error?.name || "rpc_error")
    .replace(/[^A-Za-z0-9._:-]/g, "_")
    .slice(0, 96);
}

function expandHome(raw) {
  const value = String(raw || "").trim();
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return value;
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
  const family = net.isIP(hostname);
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
  const value = String(raw || "").trim();
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail("invalid_rpc_origin");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    fail(
      "credentialed_rpc_origin_forbidden",
      "RPC origin must not contain credentials, query, or fragment",
    );
  }
  if (parsed.pathname && parsed.pathname !== "/") {
    fail("rpc_origin_path_forbidden");
  }
  const privateHttp =
    parsed.protocol === "http:" && privateHttpHost(parsed.hostname);
  if (parsed.protocol !== "https:" && !privateHttp) {
    fail("insecure_public_rpc_origin_forbidden");
  }
  return parsed.origin;
}

function normalizeAddress(raw) {
  const value = String(raw || "").trim();
  if (!isAddress(value)) return "";
  return getAddress(value);
}

function normalizeOutputFile(raw, fallbackName) {
  const value = expandHome(raw);
  if (!value) return "";
  const resolved = path.resolve(value);
  if (resolved.endsWith(path.sep)) return path.join(resolved, fallbackName);
  return resolved;
}

function ensurePrivateDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
}

function atomicWriteJson(file, value) {
  ensurePrivateDirectory(path.dirname(file));
  const temporary = `${file}.tmp-${process.pid}-${crypto
    .randomBytes(6)
    .toString("hex")}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
  });
  fs.chmodSync(temporary, 0o600);
  fs.renameSync(temporary, file);
  fs.chmodSync(file, 0o600);
}

function parseArgs(argv) {
  const args = [...argv];
  let command = "scan";
  if (args[0] && !args[0].startsWith("--")) command = args.shift();
  const options = { address: [] };
  for (let index = 0; index < args.length; index += 1) {
    const raw = args[index];
    if (!raw.startsWith("--")) {
      fail("unexpected_argument", `unexpected argument: ${raw}`);
    }
    const separator = raw.indexOf("=");
    const key = separator >= 0 ? raw.slice(2, separator) : raw.slice(2);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(key)) {
      fail("invalid_option", `invalid option: ${raw}`);
    }
    let value = separator >= 0 ? raw.slice(separator + 1) : "";
    if (separator < 0) {
      if (index + 1 < args.length && !args[index + 1].startsWith("--")) {
        value = args[index + 1];
        index += 1;
      } else {
        value = "true";
      }
    }
    if (key === "address") options.address.push(value);
    else options[key] = value;
  }
  return { command, options };
}

function option(options, key, envName = "", fallback = "") {
  if (options[key] !== undefined) return String(options[key]);
  if (envName && process.env[envName] !== undefined) {
    return String(process.env[envName]);
  }
  return String(fallback);
}

function parseBoolean(raw, fallback = false) {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const value = String(raw).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  fail("invalid_boolean", `invalid boolean: ${raw}`);
}

export function extractRegistryAddresses(value, depth = 0) {
  if (depth > 12 || value === null || typeof value !== "object") return [];
  const output = [];
  if (Array.isArray(value)) {
    for (const entry of value) {
      output.push(...extractRegistryAddresses(entry, depth + 1));
    }
    return [...new Set(output)];
  }
  for (const [key, entry] of Object.entries(value)) {
    if (ADDRESS_KEYS.has(key) && typeof entry === "string") {
      const address = normalizeAddress(entry);
      if (address) output.push(address);
    }
    if (entry && typeof entry === "object") {
      output.push(...extractRegistryAddresses(entry, depth + 1));
    }
  }
  return [...new Set(output)];
}

export function classifyRegistrySnapshot(snapshot) {
  if (!snapshot.code_present) return "stale_no_code";
  if (!snapshot.calls_succeeded) return "live_unreadable";
  if (
    BigInt(snapshot.min_validator_stake_wei) !==
    MIN_VALIDATOR_STAKE_WEI
  ) {
    return "live_policy_mismatch";
  }
  if (
    BigInt(snapshot.max_active_validators) <= 0n ||
    BigInt(snapshot.activation_churn_limit) <= 0n ||
    !normalizeAddress(snapshot.owner)
  ) {
    return "live_policy_mismatch";
  }
  return "live_exact_policy";
}

export function buildRegistryDecision(results) {
  const exact = results.filter(
    (entry) => entry.classification === "live_exact_policy",
  );
  if (exact.length === 1) {
    return {
      decision: "READY_EXISTING_LIVE_EXACT_REGISTRY",
      ready: true,
      selected_address: exact[0].address,
      blockers: [],
    };
  }
  if (exact.length > 1) {
    return {
      decision: "HOLD_MULTIPLE_LIVE_EXACT_REGISTRIES",
      ready: false,
      selected_address: null,
      blockers: exact.map((entry) => entry.address),
    };
  }
  if (results.length === 0) {
    return {
      decision: "HOLD_NO_REGISTRY_ARTIFACT_ADDRESSES",
      ready: false,
      selected_address: null,
      blockers: ["no_candidate_addresses"],
    };
  }
  return {
    decision: "HOLD_NO_LIVE_EXACT_REGISTRY",
    ready: false,
    selected_address: null,
    blockers: results.map(
      (entry) => `${entry.address}:${entry.classification}`,
    ),
  };
}

function readArtifactDirectory(directory) {
  const result = {
    directory,
    exists: false,
    scanned_files: 0,
    rejected_files: [],
    artifacts: [],
  };
  let stats;
  try {
    stats = fs.lstatSync(directory);
  } catch {
    return result;
  }
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    fail("artifact_directory_invalid");
  }
  result.exists = true;
  const names = fs
    .readdirSync(directory)
    .filter((name) => /^validator-candidate-registry.*\.json$/.test(name))
    .sort()
    .slice(0, 512);
  for (const name of names) {
    const file = path.join(directory, name);
    let fileStats;
    try {
      fileStats = fs.lstatSync(file);
    } catch {
      result.rejected_files.push({ name, reason: "lstat_failed" });
      continue;
    }
    if (
      !fileStats.isFile() ||
      fileStats.isSymbolicLink() ||
      fileStats.size <= 0 ||
      fileStats.size > 2 * 1024 * 1024
    ) {
      result.rejected_files.push({
        name,
        reason: "not_regular_bounded_file",
      });
      continue;
    }
    const bytes = fs.readFileSync(file);
    let parsed;
    try {
      parsed = JSON.parse(bytes.toString("utf8"));
    } catch {
      result.rejected_files.push({ name, reason: "invalid_json" });
      continue;
    }
    const addresses = extractRegistryAddresses(parsed);
    result.scanned_files += 1;
    result.artifacts.push({
      name,
      sha256: sha256(bytes),
      bytes: bytes.length,
      addresses,
    });
  }
  return result;
}

function codeSha256(code) {
  const normalized = String(code || "").replace(/^0x/, "");
  return normalized && normalized !== "0"
    ? sha256(Buffer.from(normalized, "hex"))
    : null;
}

export async function inspectRegistry(provider, address, sources = []) {
  let code;
  try {
    code = await provider.getCode(address);
  } catch (error) {
    return {
      address,
      sources,
      code_present: false,
      code_sha256: null,
      calls_succeeded: false,
      classification: "rpc_error",
      error: safeError(error),
    };
  }
  if (!code || code === "0x") {
    return {
      address,
      sources,
      code_present: false,
      code_sha256: null,
      calls_succeeded: false,
      classification: "stale_no_code",
      error: null,
    };
  }

  const contract = new Contract(address, REGISTRY_ABI, provider);
  try {
    const [
      minimum,
      maximum,
      churn,
      owner,
      candidateCount,
      waitingCount,
      activeCount,
    ] = await Promise.all([
      contract.minValidatorStake(),
      contract.maxActiveValidators(),
      contract.activationChurnLimit(),
      contract.owner(),
      contract.candidateCount(),
      contract.waitingCount(),
      contract.activeCount(),
    ]);
    const snapshot = {
      address,
      sources,
      code_present: true,
      code_sha256: codeSha256(code),
      calls_succeeded: true,
      min_validator_stake_wei: BigInt(minimum).toString(),
      min_validator_stake_void: formatEther(minimum),
      max_active_validators: BigInt(maximum).toString(),
      activation_churn_limit: BigInt(churn).toString(),
      owner: getAddress(owner),
      candidate_count: BigInt(candidateCount).toString(),
      waiting_count: BigInt(waitingCount).toString(),
      active_count: BigInt(activeCount).toString(),
      error: null,
    };
    return {
      ...snapshot,
      classification: classifyRegistrySnapshot(snapshot),
    };
  } catch (error) {
    return {
      address,
      sources,
      code_present: true,
      code_sha256: codeSha256(code),
      calls_succeeded: false,
      classification: "live_unreadable",
      error: safeError(error),
    };
  }
}

export async function scanRegistryCandidates({
  provider,
  artifactDirectory,
  explicitAddresses = [],
  observedAt = new Date().toISOString(),
}) {
  const network = await provider.getNetwork();
  if (BigInt(network.chainId) !== CHAIN_ID) {
    fail(
      "wrong_chain_id",
      `expected chain ${CHAIN_ID}; RPC returned ${network.chainId}`,
    );
  }

  const artifacts = readArtifactDirectory(artifactDirectory);
  const sourceMap = new Map();
  for (const artifact of artifacts.artifacts) {
    for (const address of artifact.addresses) {
      const current = sourceMap.get(address) || [];
      current.push({
        artifact: artifact.name,
        artifact_sha256: artifact.sha256,
      });
      sourceMap.set(address, current);
    }
  }
  for (const raw of explicitAddresses) {
    const address = normalizeAddress(raw);
    if (!address) fail("invalid_explicit_registry_address");
    const current = sourceMap.get(address) || [];
    current.push({ artifact: null, explicit: true });
    sourceMap.set(address, current);
  }

  const addresses = [...sourceMap.keys()].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase()),
  );
  const results = [];
  for (const address of addresses) {
    results.push(
      await inspectRegistry(provider, address, sourceMap.get(address) || []),
    );
  }
  const decision = buildRegistryDecision(results);
  return {
    marker: MARKER,
    version: 1,
    observed_at_utc: new Date(observedAt).toISOString(),
    chain_id: Number(CHAIN_ID),
    rpc_origin: null,
    artifact_scan: artifacts,
    results,
    ...decision,
    authority_boundary: {
      read_only_rpc: true,
      artifact_pointer_overwritten: false,
      contract_deployed: false,
      transaction_signed: false,
      transaction_broadcast: false,
      wallet_or_signer_access: false,
      validator_state_mutated: false,
      fund_movement: false,
    },
  };
}

function selectionFromReport(report) {
  if (!report.ready || !report.selected_address) {
    fail("registry_selection_not_ready");
  }
  const selected = report.results.find(
    (entry) => entry.address === report.selected_address,
  );
  if (!selected) fail("selected_registry_missing");
  const body = {
    marker: SELECTION_MARKER,
    version: 1,
    selection_id: null,
    selected_at_utc: report.observed_at_utc,
    chain_id: report.chain_id,
    registry: selected.address,
    code_sha256: selected.code_sha256,
    min_validator_stake_wei: selected.min_validator_stake_wei,
    min_validator_stake_void: selected.min_validator_stake_void,
    max_active_validators: selected.max_active_validators,
    activation_churn_limit: selected.activation_churn_limit,
    owner: selected.owner,
    candidate_count: selected.candidate_count,
    waiting_count: selected.waiting_count,
    active_count: selected.active_count,
    sources: selected.sources,
    runtime_authority_granted: false,
    transaction_broadcast: false,
    fund_movement: false,
  };
  return {
    ...body,
    selection_id: `voidvrls1_${sha256(JSON.stringify(body))}`,
  };
}

function usage() {
  return `VOID validator candidate registry live resolver v1

Usage:
  node tools/void-validator-candidate-registry-live-resolver-v1.mjs scan [options]

Options:
  --rpc ORIGIN
  --artifact-dir PATH
  --address ADDRESS              Repeatable explicit candidate address
  --output PATH                  Write mode-600 scan report
  --write-selection PATH         Write mode-600 live selection
  --confirm TOKEN                Exact selection confirmation
  --require-ready true|false

The resolver performs read-only JSON-RPC and local artifact inspection. It
does not deploy a contract, sign or broadcast a transaction, access a wallet,
move a candidate to Waiting or Active, or move funds.
`;
}

async function main(argv = process.argv.slice(2)) {
  const { command, options } = parseArgs(argv);
  if (["help", "--help", "-h"].includes(command)) {
    process.stdout.write(usage());
    return;
  }
  if (command !== "scan") fail("unknown_command");

  const rpc = normalizeRpcOrigin(
    option(options, "rpc", "VOID_CHAIN_RPC", "http://127.0.0.1:8545"),
  );
  const artifactDirectory = path.resolve(
    expandHome(
      option(
        options,
        "artifact-dir",
        "VOID_VALIDATOR_REGISTRY_ARTIFACT_DIR",
        DEFAULT_ARTIFACT_DIR,
      ),
    ),
  );
  const provider = new JsonRpcProvider(rpc, undefined, {
    batchMaxCount: 1,
  });
  const report = await scanRegistryCandidates({
    provider,
    artifactDirectory,
    explicitAddresses: options.address || [],
    observedAt: option(
      options,
      "observed-at",
      "VOID_REGISTRY_RESOLVER_OBSERVED_AT",
      new Date().toISOString(),
    ),
  });
  report.rpc_origin = rpc;

  const output = normalizeOutputFile(
    option(options, "output", "VOID_REGISTRY_RESOLVER_OUTPUT"),
    "validator-candidate-registry-live-resolver-v1.json",
  );
  if (output) {
    atomicWriteJson(output, report);
    report.output_file = output;
  }

  const selectionFile = normalizeOutputFile(
    option(
      options,
      "write-selection",
      "VOID_VALIDATOR_REGISTRY_LIVE_SELECTION_FILE",
    ),
    "validator-candidate-registry.live.current.json",
  );
  if (selectionFile) {
    const expected = `write-live-validator-registry-v1:${report.selected_address}:2050`;
    const confirmation = option(
      options,
      "confirm",
      "VOID_VALIDATOR_REGISTRY_LIVE_SELECTION_CONFIRMATION",
    );
    if (confirmation !== expected) {
      fail(
        "selection_confirmation_mismatch",
        `exact confirmation required: ${expected}`,
      );
    }
    const selection = selectionFromReport(report);
    atomicWriteJson(selectionFile, selection);
    report.selection_file = selectionFile;
    report.authority_boundary.artifact_pointer_overwritten = false;
    report.authority_boundary.live_selection_written = true;
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (
    parseBoolean(
      option(options, "require-ready", "VOID_REGISTRY_RESOLVER_REQUIRE_READY"),
      false,
    ) &&
    !report.ready
  ) {
    process.exitCode = 2;
  }
}

const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().catch((error) => {
    const code = error?.code || error?.name || "resolver_failed";
    console.error(`${MARKER} HOLD code=${code} message=${error?.message}`);
    if (error?.details && Object.keys(error.details).length > 0) {
      console.error(JSON.stringify(error.details, null, 2));
    }
    process.exitCode = 1;
  });
}
