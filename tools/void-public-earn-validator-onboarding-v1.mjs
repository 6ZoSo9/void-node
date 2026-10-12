#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE

import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import {
  Contract,
  Interface,
  JsonRpcProvider,
  Transaction,
  getAddress,
  isAddress,
  keccak256,
  parseEther,
  toUtf8Bytes,
} from "ethers";

export const MARKER = "VOID_PUBLIC_EARN_VALIDATOR_ONBOARDING_V1";
export const REPORT_MARKER = "VOID_PUBLIC_PARTICIPANT_ONBOARDING_REPORT_V1";
export const CANDIDATE_PACKET_MARKER = "VOID_VALIDATOR_CANDIDATE_UNSIGNED_PACKET_V1";
export const CANDIDATE_RECEIPT_MARKER = "VOID_VALIDATOR_CANDIDATE_SUBMISSION_RECEIPT_V1";
export const VALIDATOR_METADATA_MARKER = "VOID_VALIDATOR_CANDIDATE_PUBLIC_METADATA_V1";
export const CHAIN_ID = 2050n;
export const MIN_VALIDATOR_STAKE_VOID = 10_000n;
export const MIN_VALIDATOR_STAKE_WEI = parseEther("10000");
export const REGISTER_FUNCTION = "registerCandidate";
export const REGISTRY_ABI = Object.freeze([
  "error NotRegistered()",
  "function minValidatorStake() view returns (uint256)",
  "function maxActiveValidators() view returns (uint256)",
  "function activationChurnLimit() view returns (uint256)",
  "function owner() view returns (address)",
  "function candidateCount() view returns (uint256)",
  "function waitingCount() view returns (uint256)",
  "function activeCount() view returns (uint256)",
  "function registerCandidate(address reward, bytes32 consensusKeyHash, bytes32 metadataHash) payable",
  "function getCandidate(address candidateOwner) view returns (tuple(address owner,address reward,bytes32 consensusKeyHash,bytes32 metadataHash,uint256 stakeAmount,uint256 registeredAt,uint256 updatedAt,uint8 state))",
]);
export const VALIDATOR_STATES = Object.freeze([
  "none",
  "candidate",
  "waiting",
  "active",
  "exiting",
  "jailed",
  "unbonded",
]);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(ROOT, ".env"), override: false });

const DEFAULT_NODE_BASE = "http://127.0.0.1:4100";
const DEFAULT_EXPECTED_PEERS = 1;
const DEFAULT_STATE_DIR = path.join(
  os.homedir(),
  ".local",
  "state",
  "void",
  "public-earn-validator-onboarding-v1",
);
const NO_NODE_EARN_CLIENT = path.join(ROOT, "tools", "void_public_earn_no_node_client_v1.mjs");
const LOCAL_EXECUTOR_EARN_CLIENT = path.join(ROOT, "ops", "mainnet0", "wc-public-earning-participant-v1.sh");
const REGISTRY_INTERFACE = new Interface(REGISTRY_ABI);

class OnboardingError extends Error {
  constructor(code, message = code, details = {}) {
    super(message);
    this.name = "OnboardingError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message = code, details = {}) {
  throw new OnboardingError(code, message, details);
}

export function canonicalJson(value) {
  const ancestors = new WeakSet();
  function order(current) {
    if (typeof current === "bigint") return current.toString();
    if (current === null || typeof current !== "object") return current;
    if (ancestors.has(current)) fail("canonical_json_cycle", "cannot canonicalize cyclic data");
    ancestors.add(current);
    let result;
    if (Array.isArray(current)) {
      result = current.map(order);
    } else {
      result = {};
      for (const key of Object.keys(current).sort()) result[key] = order(current[key]);
    }
    ancestors.delete(current);
    return result;
  }
  return JSON.stringify(order(value));
}

export function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function contentAddress(prefix, value) {
  return `${prefix}_${sha256Hex(canonicalJson(value))}`;
}

function normalizeBytes32(raw, label) {
  const value = String(raw || "").trim().toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(value)) {
    fail("invalid_bytes32", `${label} must be 0x plus 64 lowercase hex characters`);
  }
  return value;
}

function normalizeNodeId(raw) {
  const value = String(raw || "").trim().toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{32,64}$/.test(value)) {
    fail("invalid_node_id", "node ID must be 32 or 64 lowercase hex characters");
  }
  return value;
}

function normalizeAccount(raw) {
  const value = String(raw || "").trim();
  if (!/^[A-Za-z0-9._:-]{1,128}$/.test(value)) {
    fail("invalid_participant_account", "participant account contains unsupported characters");
  }
  return value;
}

function normalizeAddress(raw, label) {
  const value = String(raw || "").trim();
  if (!isAddress(value)) fail("invalid_address", `${label} is not a valid EVM address`);
  return getAddress(value);
}

function normalizeUtc(raw = "") {
  const source = String(raw || new Date().toISOString()).trim();
  const date = new Date(source);
  if (!Number.isFinite(date.getTime())) fail("invalid_timestamp", "timestamp must be parseable UTC time");
  return date.toISOString();
}

function privateHttpHost(rawHostname) {
  const hostname = String(rawHostname || "").replace(/^\[|\]$/g, "").toLowerCase();
  if (hostname === "localhost" || hostname === "::1" || hostname.endsWith(".ts.net")) return true;
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

function normalizeOrigin(raw, { allowPrivateHttp = true, label = "origin" } = {}) {
  const value = String(raw || "").trim();
  if (!value || value.length > 512) fail("invalid_origin", `${label} is missing or too long`);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail("invalid_origin", `${label} is not a valid URL`);
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    fail("credentialed_origin_forbidden", `${label} must not contain credentials, query parameters, or fragments`);
  }
  if (parsed.pathname && parsed.pathname !== "/") {
    fail("origin_path_forbidden", `${label} must be an origin without a path`);
  }
  const privateHttp = allowPrivateHttp && parsed.protocol === "http:" && privateHttpHost(parsed.hostname);
  if (parsed.protocol !== "https:" && !privateHttp) {
    fail("insecure_public_origin_forbidden", `${label} must use HTTPS unless it is loopback, private, or Tailnet HTTP`);
  }
  return parsed.origin;
}

function normalizeOptionalText(raw, label, max = 512) {
  const value = String(raw || "").trim();
  if (value.length > max) fail("text_too_long", `${label} exceeds ${max} characters`);
  if (/[\u0000-\u001f\u007f]/.test(value)) {
    fail("control_character_forbidden", `${label} contains control characters`);
  }
  return value;
}

function parseBoolean(raw, fallback = false) {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const value = String(raw).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  fail("invalid_boolean", `invalid boolean: ${raw}`);
}

function parseInteger(raw, label, minimum, maximum) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    fail("invalid_integer", `${label} must be an integer from ${minimum} to ${maximum}`);
  }
  return value;
}

function expandHome(raw) {
  const value = String(raw || "").trim();
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return value;
}

function ensurePrivateDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
}

function atomicWriteJson(file, value) {
  ensurePrivateDirectory(path.dirname(file));
  const temporary = `${file}.tmp-${process.pid}-${crypto.randomBytes(6).toString("hex")}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(temporary, 0o600);
  fs.renameSync(temporary, file);
  fs.chmodSync(file, 0o600);
}

function parseArgs(argv) {
  const args = [...argv];
  let command = "onboard";
  if (args[0] && !args[0].startsWith("--")) command = args.shift();
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const raw = args[index];
    if (!raw.startsWith("--")) fail("unexpected_argument", `unexpected argument: ${raw}`);
    const separator = raw.indexOf("=");
    const key = separator >= 0 ? raw.slice(2, separator) : raw.slice(2);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(key)) fail("invalid_option", `invalid option: ${raw}`);
    let value = separator >= 0 ? raw.slice(separator + 1) : "";
    if (separator < 0) {
      if (index + 1 < args.length && !args[index + 1].startsWith("--")) {
        value = args[index + 1];
        index += 1;
      } else {
        value = "true";
      }
    }
    options[key] = value;
  }
  return { command, options };
}

function option(options, key, envName = "", fallback = "") {
  if (options[key] !== undefined) return String(options[key]);
  if (envName && process.env[envName] !== undefined) return String(process.env[envName]);
  return String(fallback);
}

function usage() {
  return `VOID public earning + validator-candidate onboarding v1

Usage:
  ./void-participant.sh onboard [options]
  ./void-participant.sh node-check [--node-base ORIGIN] [--expected-peer-count N]
  ./void-participant.sh earn-identity [--state-dir PATH]
  ./void-participant.sh earn-status --account ID --coordinator-base ORIGIN --coordinator-node-id HEX
  ./void-participant.sh earn --account ID --coordinator-base ORIGIN --coordinator-node-id HEX
  ./void-participant.sh candidate-packet --rpc ORIGIN --registry ADDRESS --owner ADDRESS [options]
  ./void-participant.sh candidate-verify --rpc ORIGIN --registry ADDRESS --owner ADDRESS
  ./void-participant.sh candidate-submit-signed --packet FILE --signed-transaction-file FILE --confirm PHRASE

Common options:
  --node-base ORIGIN             Local node origin; default http://127.0.0.1:4100
  --expected-peer-count N        Minimum visible peers; default 1
  --state-dir PATH               Private local output directory
  --earn-mode no-node|local-executor
  --account ID
  --coordinator-base ORIGIN
  --coordinator-node-id 32_HEX
  --ticket-file PATH             Required only for local-executor earning mode

Candidate options:
  --rpc ORIGIN
  --registry ADDRESS
  --owner ADDRESS                Candidate wallet address; wallet stays local
  --reward ADDRESS               Defaults to owner
  --node-id HEX                  Must match the reviewed node identity when supplied
  --consensus-key-hash BYTES32   Optional explicit public fingerprint
  --public-endpoint TEXT
  --p2p-multiaddr TEXT
  --observed-at UTC

The tool never accepts a private key, seed phrase, mnemonic, or wallet file.
Candidate registration starts in Candidate state. Waiting and Active transitions
remain separate owner/authority-gated actions and are never automatic.
`;
}

async function fetchJson(origin, route, timeoutMs = 8_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${origin}${route}`, {
      method: "GET",
      redirect: "manual",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 2 * 1024 * 1024) {
      return { ok: false, status: response.status, error: "response_too_large", body: null };
    }
    let body;
    try {
      body = JSON.parse(bytes.toString("utf8"));
    } catch {
      return { ok: false, status: response.status, error: "invalid_json", body: null };
    }
    return {
      ok: response.status === 200,
      status: response.status,
      error: response.status === 200 ? null : `http_${response.status}`,
      body,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error?.name === "AbortError" ? "timeout" : "request_failed",
      body: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

function countPeers(body) {
  if (Array.isArray(body)) return body.length;
  if (!body || typeof body !== "object") return null;
  for (const key of ["peers", "connected", "items", "nodes"]) {
    if (Array.isArray(body[key])) return body[key].length;
  }
  for (const key of ["peer_count", "peerCount", "count", "connected_count"]) {
    const value = Number(body[key]);
    if (Number.isInteger(value) && value >= 0) return value;
  }
  return null;
}

function pickNodeId(...bodies) {
  for (const body of bodies) {
    for (const key of ["nodeId", "node_id", "node", "id"]) {
      const candidate = String(body?.[key] || "").trim().toLowerCase().replace(/^0x/, "");
      if (/^[0-9a-f]{32,64}$/.test(candidate)) return candidate;
    }
  }
  return "";
}

export async function inspectNode(nodeBaseRaw = DEFAULT_NODE_BASE, options = {}) {
  const nodeBase = normalizeOrigin(nodeBaseRaw, { label: "node base" });
  const expectedPeerCount = parseInteger(
    options.expectedPeerCount ?? DEFAULT_EXPECTED_PEERS,
    "expected peer count",
    0,
    10_000,
  );
  const [health, readiness, latest] = await Promise.all([
    fetchJson(nodeBase, "/health"),
    fetchJson(nodeBase, "/__void/ready.json"),
    fetchJson(nodeBase, "/blocks/latest/number2.json"),
  ]);
  let peerRoute = "/p2p/peers";
  let peers = await fetchJson(nodeBase, peerRoute);
  if (!peers.ok) {
    peerRoute = "/peers";
    peers = await fetchJson(nodeBase, peerRoute);
  }

  const nodeId = pickNodeId(health.body, readiness.body, peers.body);
  const healthOk = health.ok && health.body?.ok === true && Boolean(nodeId);
  const readinessOk =
    readiness.ok &&
    readiness.body?.ready === true &&
    Number(readiness.body?.gap) === 0 &&
    Number(readiness.body?.txroot_live) === 1 &&
    Array.isArray(readiness.body?.reasons) &&
    readiness.body.reasons.length === 0;
  const headNumber = Number(latest.body?.number);
  const latestOk = latest.ok && Number.isInteger(headNumber) && headNumber >= 0;
  const headAligned =
    latestOk &&
    (!Number.isInteger(readiness.body?.head) || headNumber === readiness.body.head) &&
    (!Number.isInteger(readiness.body?.lastmile_seen) || headNumber === readiness.body.lastmile_seen);
  const peerCount = peers.ok ? countPeers(peers.body) : null;
  const peersOk = Number.isInteger(peerCount) && peerCount >= expectedPeerCount;
  return {
    marker: "VOID_PARTICIPANT_NODE_OBSERVER_CHECK_V1",
    node_base: nodeBase,
    health_reachable: health.ok,
    health_contract_valid: healthOk,
    readiness_reachable: readiness.ok,
    readiness_contract_valid: readinessOk,
    ready: readinessOk,
    latest_block_reachable: latestOk,
    latest_block_aligned: headAligned,
    latest_block_number: latestOk ? headNumber : null,
    peer_route: peerRoute,
    peer_count: Number.isInteger(peerCount) ? peerCount : null,
    expected_peer_count: expectedPeerCount,
    peer_visibility_valid: peersOk,
    node_id: nodeId || null,
    observer_validation_ready: Boolean(healthOk && readinessOk && headAligned && peersOk),
    consensus_validator_active: false,
    consensus_validator_activation_attempted: false,
    wallet_or_signer_accessed: false,
    details: { health, readiness, peers, latest },
  };
}

function earnClientConfiguration(options) {
  const mode = option(options, "earn-mode", "VOID_PARTICIPANT_EARN_MODE", "no-node").trim();
  if (!["no-node", "local-executor"].includes(mode)) {
    fail("invalid_earn_mode", "earn mode must be no-node or local-executor");
  }
  const accountRaw = option(options, "account", "VOID_PARTICIPANT_ACCOUNT");
  const coordinatorBaseRaw = option(options, "coordinator-base", "VOID_PUBLIC_EARN_COORDINATOR_BASE");
  const coordinatorNodeIdRaw = option(options, "coordinator-node-id", "VOID_PUBLIC_EARN_COORDINATOR_NODE_ID");
  const ticketFileRaw = option(options, "ticket-file", "VOID_PUBLIC_EARN_TICKET_FILE");
  return {
    mode,
    account: accountRaw ? normalizeAccount(accountRaw) : "",
    coordinatorBase: coordinatorBaseRaw
      ? normalizeOrigin(coordinatorBaseRaw, { label: "coordinator base" })
      : "",
    coordinatorNodeId: coordinatorNodeIdRaw ? normalizeNodeId(coordinatorNodeIdRaw) : "",
    ticketFile: ticketFileRaw ? path.resolve(expandHome(ticketFileRaw)) : "",
  };
}

function runEarnClient(subcommand, options, { capture = false } = {}) {
  const config = earnClientConfiguration(options);
  const stateDir = path.resolve(
    expandHome(option(options, "earn-state-dir", "VOID_PUBLIC_EARN_STATE_DIR", "")) ||
      path.join(DEFAULT_STATE_DIR, "earn"),
  );
  ensurePrivateDirectory(stateDir);

  if (config.mode === "no-node" && subcommand !== "identity" && !config.account) {
    fail("earn_account_required", "no-node earning requires --account or VOID_PARTICIPANT_ACCOUNT");
  }
  if (subcommand !== "identity") {
    if (!config.coordinatorBase) fail("earn_coordinator_base_required", "earning requires --coordinator-base");
    if (!config.coordinatorNodeId) {
      fail("earn_coordinator_node_id_required", "earning requires --coordinator-node-id");
    }
  }

  let command;
  let args;
  if (config.mode === "no-node") {
    command = process.execPath;
    args = [NO_NODE_EARN_CLIENT, subcommand];
    if (subcommand !== "identity") {
      args.push(
        "--account",
        config.account,
        "--coordinator-base",
        config.coordinatorBase,
        "--coordinator-node-id",
        config.coordinatorNodeId,
      );
    }
    args.push("--state-dir", stateDir);
  } else {
    if (subcommand !== "run") {
      fail("local_executor_run_only", "local-executor mode accepts only the earn command");
    }
    if (!config.ticketFile || !fs.existsSync(config.ticketFile) || !fs.statSync(config.ticketFile).isFile()) {
      fail("local_executor_ticket_required", "local-executor earning requires --ticket-file");
    }
    command = "bash";
    args = [LOCAL_EXECUTOR_EARN_CLIENT, config.ticketFile, config.coordinatorBase, config.coordinatorNodeId];
  }

  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: { ...process.env },
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) fail("earn_client_spawn_failed", result.error.message);
  if (result.status !== 0) {
    fail("earn_client_failed", `earning client exited with status ${result.status}`, {
      stdout: capture ? String(result.stdout || "").slice(-4096) : "",
      stderr: capture ? String(result.stderr || "").slice(-4096) : "",
    });
  }
  return {
    mode: config.mode,
    command: subcommand,
    status: result.status,
    stdout: capture ? String(result.stdout || "") : "",
    stderr: capture ? String(result.stderr || "") : "",
  };
}

function deriveConsensusKeyHash(nodeId) {
  return keccak256(toUtf8Bytes(`void:mainnet0:validator-candidate-consensus-key-v1:${normalizeNodeId(nodeId)}`));
}

function registryCodeSha256(code) {
  const normalized = String(code || "").replace(/^0x/, "");
  if (!normalized || normalized === "0") return "";
  return sha256Hex(Buffer.from(normalized, "hex"));
}

async function readRegistryPolicy(provider, registryAddress) {
  const code = await provider.getCode(registryAddress);
  if (!code || code === "0x") {
    fail("candidate_registry_not_deployed", `no contract bytecode at ${registryAddress}`);
  }
  const registry = new Contract(registryAddress, REGISTRY_ABI, provider);
  const [minStake, maxActive, churn, authority, candidateCount, waitingCount, activeCount] =
    await Promise.all([
      registry.minValidatorStake(),
      registry.maxActiveValidators(),
      registry.activationChurnLimit(),
      registry.owner(),
      registry.candidateCount(),
      registry.waitingCount(),
      registry.activeCount(),
    ]);
  if (BigInt(minStake) !== MIN_VALIDATOR_STAKE_WEI) {
    fail(
      "candidate_registry_minimum_mismatch",
      `registry minimum is ${minStake}; policy requires exactly ${MIN_VALIDATOR_STAKE_WEI}`,
    );
  }
  if (BigInt(maxActive) <= 0n) fail("candidate_registry_active_cap_invalid");
  if (BigInt(churn) <= 0n) fail("candidate_registry_churn_invalid");
  return {
    code_sha256: registryCodeSha256(code),
    min_validator_stake_wei: BigInt(minStake).toString(),
    min_validator_stake_void: MIN_VALIDATOR_STAKE_VOID.toString(),
    max_active_validators: BigInt(maxActive).toString(),
    activation_churn_limit: BigInt(churn).toString(),
    authority: getAddress(authority),
    candidate_count: BigInt(candidateCount).toString(),
    waiting_count: BigInt(waitingCount).toString(),
    active_count: BigInt(activeCount).toString(),
  };
}

function extractErrorData(error) {
  const candidates = [
    error?.data,
    error?.error?.data,
    error?.info?.error?.data,
    error?.info?.data,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && /^0x[0-9a-fA-F]+$/.test(candidate)) return candidate;
    if (typeof candidate?.data === "string") return candidate.data;
  }
  return "";
}

async function candidateExists(registry, owner) {
  try {
    return { exists: true, candidate: await registry.getCandidate(owner) };
  } catch (error) {
    const data = extractErrorData(error);
    if (data) {
      try {
        const parsed = REGISTRY_INTERFACE.parseError(data);
        if (parsed?.name === "NotRegistered") return { exists: false, candidate: null };
      } catch {
        // Preserve the original error below.
      }
    }
    throw error;
  }
}

export function buildCandidatePacketBody(input) {
  const chainId = BigInt(input.chainId);
  if (chainId !== CHAIN_ID) {
    fail("wrong_chain_id", `expected chain ID ${CHAIN_ID}, got ${chainId}`);
  }
  const minStakeWei = BigInt(input.registryPolicy.min_validator_stake_wei);
  if (minStakeWei !== MIN_VALIDATOR_STAKE_WEI) fail("candidate_registry_minimum_mismatch");

  const owner = normalizeAddress(input.owner, "candidate owner");
  const reward = normalizeAddress(input.reward || owner, "reward address");
  const registry = normalizeAddress(input.registry, "candidate registry");
  const nodeId = normalizeNodeId(input.nodeId);
  const observedAt = normalizeUtc(input.observedAt);
  const consensusKeyHash = input.consensusKeyHash
    ? normalizeBytes32(input.consensusKeyHash, "consensus key hash")
    : deriveConsensusKeyHash(nodeId);
  const metadata = {
    marker: VALIDATOR_METADATA_MARKER,
    version: 1,
    chain_id: Number(CHAIN_ID),
    candidate_owner: owner,
    reward_address: reward,
    node_id: nodeId,
    node_http_base: input.nodeBase || null,
    public_endpoint: normalizeOptionalText(input.publicEndpoint, "public endpoint"),
    p2p_multiaddr: normalizeOptionalText(input.p2pMultiaddr, "P2P multiaddr"),
    observed_at_utc: observedAt,
    candidate_only: true,
    automatic_waiting_transition: false,
    automatic_active_transition: false,
  };
  const metadataHash = keccak256(toUtf8Bytes(canonicalJson(metadata)));
  const data = REGISTRY_INTERFACE.encodeFunctionData(REGISTER_FUNCTION, [
    reward,
    consensusKeyHash,
    metadataHash,
  ]);
  const fundingBalanceWei = BigInt(input.ownerBalanceWei || 0n);
  const fundingReady = fundingBalanceWei >= minStakeWei;
  const body = {
    marker: CANDIDATE_PACKET_MARKER,
    version: 1,
    packet_id: null,
    created_at_utc: observedAt,
    chain_id: Number(CHAIN_ID),
    rpc_origin: input.rpc,
    candidate_registry: registry,
    candidate_owner: owner,
    reward_address: reward,
    node_id: nodeId,
    consensus_key_hash: consensusKeyHash,
    metadata_hash: metadataHash,
    metadata,
    registry_policy: input.registryPolicy,
    owner_balance_wei: fundingBalanceWei.toString(),
    minimum_stake_wei: minStakeWei.toString(),
    minimum_stake_void: MIN_VALIDATOR_STAKE_VOID.toString(),
    stake_funding_ready: fundingReady,
    already_registered: Boolean(input.alreadyRegistered),
    unsigned_transaction: {
      type: 2,
      chain_id: Number(CHAIN_ID),
      from: owner,
      to: registry,
      value_wei: minStakeWei.toString(),
      data,
    },
    decision: input.alreadyRegistered
      ? "HOLD_ALREADY_REGISTERED"
      : fundingReady
        ? "READY_FOR_PARTICIPANT_WALLET_SIGNATURE"
        : "HOLD_INSUFFICIENT_STAKE_BALANCE",
    authority_boundary: {
      private_key_requested: false,
      wallet_file_requested: false,
      transaction_signed: false,
      transaction_broadcast: false,
      moved_to_waiting: false,
      validator_marked_active: false,
      runtime_consensus_activated: false,
      automatic_promotion: false,
    },
  };
  return { ...body, packet_id: contentAddress("voidvcp1", body) };
}

async function buildCandidatePacket(options, nodeSnapshot) {
  if (!nodeSnapshot?.observer_validation_ready) {
    fail("observer_node_not_ready", "candidate packet requires a strict-green local node observer check");
  }
  const rpc = normalizeOrigin(option(options, "rpc", "VOID_CHAIN_RPC"), { label: "chain RPC" });
  const registryAddress = normalizeAddress(
    option(options, "registry", "VOID_VALIDATOR_CANDIDATE_REGISTRY"),
    "candidate registry",
  );
  const owner = normalizeAddress(option(options, "owner", "VOID_VALIDATOR_OWNER"), "candidate owner");
  const reward = normalizeAddress(
    option(options, "reward", "VOID_VALIDATOR_REWARD", owner),
    "reward address",
  );
  const provider = new JsonRpcProvider(rpc);
  const network = await provider.getNetwork();
  if (BigInt(network.chainId) !== CHAIN_ID) {
    fail("wrong_chain_id", `RPC is chain ${network.chainId}; expected ${CHAIN_ID}`);
  }
  const registryPolicy = await readRegistryPolicy(provider, registryAddress);
  const registry = new Contract(registryAddress, REGISTRY_ABI, provider);
  const [balance, registration] = await Promise.all([
    provider.getBalance(owner),
    candidateExists(registry, owner),
  ]);
  const explicitNodeId = option(options, "node-id", "VOID_VALIDATOR_NODE_ID");
  const nodeId = explicitNodeId ? normalizeNodeId(explicitNodeId) : normalizeNodeId(nodeSnapshot.node_id);
  if (explicitNodeId && nodeId !== normalizeNodeId(nodeSnapshot.node_id)) {
    fail("validator_node_id_mismatch", "explicit validator node ID does not match the local observer node identity");
  }
  const packet = buildCandidatePacketBody({
    chainId: network.chainId,
    rpc,
    registry: registryAddress,
    registryPolicy,
    owner,
    reward,
    nodeId,
    nodeBase: nodeSnapshot.node_base,
    publicEndpoint: option(options, "public-endpoint", "VOID_VALIDATOR_PUBLIC_ENDPOINT"),
    p2pMultiaddr: option(options, "p2p-multiaddr", "VOID_VALIDATOR_P2P_MULTIADDR"),
    consensusKeyHash: option(options, "consensus-key-hash", "VOID_VALIDATOR_CONSENSUS_KEY_HASH"),
    observedAt: option(options, "observed-at", "VOID_ONBOARDING_OBSERVED_AT", new Date().toISOString()),
    ownerBalanceWei: balance,
    alreadyRegistered: registration.exists,
  });
  const stateDir = path.resolve(
    expandHome(option(options, "state-dir", "VOID_PARTICIPANT_ONBOARDING_STATE_DIR", DEFAULT_STATE_DIR)),
  );
  const packetFile = path.join(stateDir, "candidate-packets", `${packet.packet_id}.json`);
  atomicWriteJson(packetFile, packet);
  atomicWriteJson(path.join(stateDir, "candidate-packet-latest.json"), packet);
  return { packet, packet_file: packetFile };
}

function readPacket(fileRaw) {
  const file = path.resolve(expandHome(fileRaw));
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    fail("candidate_packet_missing", `candidate packet not found: ${file}`);
  }
  const packet = JSON.parse(fs.readFileSync(file, "utf8"));
  if (packet?.marker !== CANDIDATE_PACKET_MARKER || packet?.version !== 1) {
    fail("candidate_packet_marker_invalid");
  }
  const copy = { ...packet, packet_id: null };
  if (contentAddress("voidvcp1", copy) !== packet.packet_id) {
    fail("candidate_packet_content_address_invalid");
  }
  return { packet, file };
}

export function verifySignedCandidateTransaction(rawTransaction, packet) {
  const raw = String(rawTransaction || "").trim();
  if (!/^0x[0-9a-fA-F]+$/.test(raw)) {
    fail("signed_transaction_invalid", "signed transaction must be 0x-prefixed hex");
  }
  let transaction;
  try {
    transaction = Transaction.from(raw);
  } catch {
    fail("signed_transaction_parse_failed");
  }
  if (!transaction.isSigned()) fail("transaction_not_signed");
  const expected = packet.unsigned_transaction;
  if (BigInt(transaction.chainId) !== CHAIN_ID) fail("signed_transaction_chain_mismatch");
  if (!transaction.to || getAddress(transaction.to) !== getAddress(expected.to)) {
    fail("signed_transaction_registry_mismatch");
  }
  if (!transaction.from || getAddress(transaction.from) !== getAddress(expected.from)) {
    fail("signed_transaction_sender_mismatch");
  }
  if (BigInt(transaction.value) !== BigInt(expected.value_wei)) {
    fail("signed_transaction_value_mismatch");
  }
  if (String(transaction.data).toLowerCase() !== String(expected.data).toLowerCase()) {
    fail("signed_transaction_data_mismatch");
  }
  const decoded = REGISTRY_INTERFACE.decodeFunctionData(REGISTER_FUNCTION, transaction.data);
  if (getAddress(decoded[0]) !== getAddress(packet.reward_address)) {
    fail("signed_transaction_reward_mismatch");
  }
  if (String(decoded[1]).toLowerCase() !== String(packet.consensus_key_hash).toLowerCase()) {
    fail("signed_transaction_consensus_hash_mismatch");
  }
  if (String(decoded[2]).toLowerCase() !== String(packet.metadata_hash).toLowerCase()) {
    fail("signed_transaction_metadata_hash_mismatch");
  }
  return {
    transaction_hash: transaction.hash,
    sender: getAddress(transaction.from),
    registry: getAddress(transaction.to),
    chain_id: Number(transaction.chainId),
    value_wei: BigInt(transaction.value).toString(),
    register_candidate_call_verified: true,
    waiting_transition_included: false,
    active_transition_included: false,
  };
}

async function readCandidateState(options, packetOverride = null) {
  const rpc = normalizeOrigin(
    packetOverride?.rpc_origin || option(options, "rpc", "VOID_CHAIN_RPC"),
    { label: "chain RPC" },
  );
  const registryAddress = normalizeAddress(
    packetOverride?.candidate_registry || option(options, "registry", "VOID_VALIDATOR_CANDIDATE_REGISTRY"),
    "candidate registry",
  );
  const owner = normalizeAddress(
    packetOverride?.candidate_owner || option(options, "owner", "VOID_VALIDATOR_OWNER"),
    "candidate owner",
  );
  const provider = new JsonRpcProvider(rpc);
  const network = await provider.getNetwork();
  if (BigInt(network.chainId) !== CHAIN_ID) fail("wrong_chain_id");
  const policy = await readRegistryPolicy(provider, registryAddress);
  const registry = new Contract(registryAddress, REGISTRY_ABI, provider);
  const result = await candidateExists(registry, owner);
  if (!result.exists) {
    return {
      marker: "VOID_VALIDATOR_CANDIDATE_STATE_V1",
      chain_id: Number(CHAIN_ID),
      registry: registryAddress,
      candidate_owner: owner,
      registered: false,
      state: "none",
      state_code: 0,
      waiting: false,
      registry_marks_active: false,
      runtime_consensus_proof_required: true,
      registry_policy: policy,
    };
  }
  const candidate = result.candidate;
  const stateCode = Number(candidate.state);
  return {
    marker: "VOID_VALIDATOR_CANDIDATE_STATE_V1",
    chain_id: Number(CHAIN_ID),
    registry: registryAddress,
    candidate_owner: getAddress(candidate.owner),
    reward_address: getAddress(candidate.reward),
    consensus_key_hash: candidate.consensusKeyHash,
    metadata_hash: candidate.metadataHash,
    stake_amount_wei: BigInt(candidate.stakeAmount).toString(),
    registered_at_unix: Number(candidate.registeredAt),
    updated_at_unix: Number(candidate.updatedAt),
    registered: true,
    state: VALIDATOR_STATES[stateCode] || `unknown-${stateCode}`,
    state_code: stateCode,
    waiting: stateCode === 2,
    registry_marks_active: stateCode === 3,
    automatic_promotion: false,
    runtime_consensus_proof_required: true,
    registry_policy: policy,
  };
}

async function submitSignedCandidate(options) {
  const { packet, file: packetFile } = readPacket(
    option(options, "packet", "VOID_VALIDATOR_CANDIDATE_PACKET"),
  );
  const signedFile = path.resolve(
    expandHome(option(options, "signed-transaction-file", "VOID_VALIDATOR_SIGNED_TRANSACTION_FILE")),
  );
  if (!signedFile || !fs.existsSync(signedFile) || !fs.statSync(signedFile).isFile()) {
    fail("signed_transaction_file_missing");
  }
  const raw = fs.readFileSync(signedFile, "utf8").trim();
  const verified = verifySignedCandidateTransaction(raw, packet);
  const expectedConfirmation =
    `SUBMIT VOID VALIDATOR CANDIDATE ${packet.candidate_owner} ON CHAIN ${CHAIN_ID}`;
  const confirmation = option(options, "confirm", "VOID_VALIDATOR_SUBMISSION_CONFIRMATION");
  if (confirmation !== expectedConfirmation) {
    fail("candidate_submission_confirmation_mismatch", `exact confirmation required: ${expectedConfirmation}`);
  }

  const provider = new JsonRpcProvider(normalizeOrigin(packet.rpc_origin, { label: "chain RPC" }));
  const before = await readCandidateState({}, packet);
  if (before.registered) fail("candidate_already_registered");
  const response = await provider.broadcastTransaction(raw);
  const receipt = await response.wait(1, 180_000);
  if (!receipt || Number(receipt.status) !== 1) {
    fail("candidate_registration_transaction_failed");
  }
  const after = await readCandidateState({}, packet);
  if (!after.registered || after.state_code !== 1) {
    fail("candidate_registration_state_not_candidate");
  }

  const body = {
    marker: CANDIDATE_RECEIPT_MARKER,
    version: 1,
    receipt_id: null,
    packet_id: packet.packet_id,
    packet_file: packetFile,
    chain_id: Number(CHAIN_ID),
    transaction_hash: response.hash,
    block_number: Number(receipt.blockNumber),
    candidate_owner: packet.candidate_owner,
    state_after: after.state,
    waiting_transition_executed: false,
    active_transition_executed: false,
    runtime_consensus_activated: false,
    wallet_key_read_by_tool: false,
  };
  const final = { ...body, receipt_id: contentAddress("voidvcr1", body) };
  const stateDir = path.resolve(
    expandHome(option(options, "state-dir", "VOID_PARTICIPANT_ONBOARDING_STATE_DIR", DEFAULT_STATE_DIR)),
  );
  const receiptFile = path.join(stateDir, "candidate-receipts", `${final.receipt_id}.json`);
  atomicWriteJson(receiptFile, final);
  return {
    receipt: final,
    receipt_file: receiptFile,
    candidate_state: after,
    signed_transaction: verified,
  };
}

function candidateConfiguration(options) {
  const values = {
    rpc: option(options, "rpc", "VOID_CHAIN_RPC"),
    registry: option(options, "registry", "VOID_VALIDATOR_CANDIDATE_REGISTRY"),
    owner: option(options, "owner", "VOID_VALIDATOR_OWNER"),
  };
  const missing = Object.entries(values)
    .filter(([, value]) => !String(value || "").trim())
    .map(([key]) => key);
  return { values, missing, complete: missing.length === 0 };
}

async function onboard(options) {
  const stateDir = path.resolve(
    expandHome(option(options, "state-dir", "VOID_PARTICIPANT_ONBOARDING_STATE_DIR", DEFAULT_STATE_DIR)),
  );
  ensurePrivateDirectory(stateDir);
  const expectedPeerCount = parseInteger(
    option(options, "expected-peer-count", "VOID_PARTICIPANT_EXPECTED_PEER_COUNT", DEFAULT_EXPECTED_PEERS),
    "expected peer count",
    0,
    10_000,
  );
  const node = await inspectNode(
    option(options, "node-base", "VOID_NODE_BASE", DEFAULT_NODE_BASE),
    { expectedPeerCount },
  );
  const earnConfig = earnClientConfiguration(options);

  let earnIdentity;
  let earnStatus;
  if (earnConfig.mode === "no-node") {
    try {
      earnIdentity = runEarnClient("identity", options, { capture: true });
    } catch (error) {
      earnIdentity = { ready: false, error: error.code || error.message };
    }
    if (earnConfig.account && earnConfig.coordinatorBase && earnConfig.coordinatorNodeId) {
      try {
        earnStatus = runEarnClient("status", options, { capture: true });
      } catch (error) {
        earnStatus = { ready: false, error: error.code || error.message, details: error.details || {} };
      }
    } else {
      earnStatus = {
        ready: false,
        error: "earning_configuration_incomplete",
        missing: [
          !earnConfig.account ? "account" : null,
          !earnConfig.coordinatorBase ? "coordinator_base" : null,
          !earnConfig.coordinatorNodeId ? "coordinator_node_id" : null,
        ].filter(Boolean),
      };
    }
  } else {
    earnIdentity = { ready: false, error: "local_executor_identity_is_managed_by_the_running_node" };
    earnStatus = {
      ready: Boolean(earnConfig.ticketFile && earnConfig.coordinatorBase && earnConfig.coordinatorNodeId),
      error: earnConfig.ticketFile ? null : "local_executor_ticket_required",
      ticket_file: earnConfig.ticketFile || null,
    };
  }

  let earnRun = null;
  if (parseBoolean(option(options, "earn-now", "VOID_PARTICIPANT_EARN_NOW", "false"))) {
    try {
      earnRun = runEarnClient("run", options, { capture: true });
    } catch (error) {
      earnRun = { ready: false, error: error.code || error.message, details: error.details || {} };
    }
  }

  const candidateConfig = candidateConfiguration(options);
  let candidate;
  if (!candidateConfig.complete) {
    candidate = {
      ready: false,
      error: "candidate_registry_configuration_missing",
      missing: candidateConfig.missing,
    };
  } else {
    try {
      candidate = await buildCandidatePacket(options, node);
    } catch (error) {
      candidate = { ready: false, error: error.code || error.message, details: error.details || {} };
    }
  }

  const body = {
    marker: REPORT_MARKER,
    version: 1,
    report_id: null,
    generated_at_utc: normalizeUtc(
      option(options, "observed-at", "VOID_ONBOARDING_OBSERVED_AT", new Date().toISOString()),
    ),
    node,
    earning: {
      mode: earnConfig.mode,
      account: earnConfig.account || null,
      coordinator_base: earnConfig.coordinatorBase || null,
      coordinator_node_id: earnConfig.coordinatorNodeId || null,
      identity_command_succeeded: earnIdentity?.status === 0,
      status_command_succeeded: earnStatus?.status === 0,
      earn_run_requested: Boolean(earnRun),
      earn_run_succeeded: earnRun?.status === 0,
      identity: earnIdentity,
      status: earnStatus,
      run: earnRun,
    },
    validator_candidate: candidate,
    capability: {
      useful_work_earning_available_when_ticket_issued: true,
      observer_validation_ready: node.observer_validation_ready,
      candidate_registration_requires_10000_void: true,
      candidate_wallet_self_custody_required: true,
      waiting_transition_automatic: false,
      active_validator_activation_automatic: false,
      active_consensus_claimed: false,
    },
    authority_boundary: {
      private_key_requested: false,
      wallet_file_requested: false,
      transaction_signed: false,
      transaction_broadcast: false,
      work_credit_written_directly: false,
      validator_activated: false,
      service_restarted: false,
      funds_moved_by_onboard_command: false,
    },
  };
  const report = { ...body, report_id: contentAddress("voidpor1", body) };
  const reportFile = path.join(stateDir, "onboarding-reports", `${report.report_id}.json`);
  atomicWriteJson(reportFile, report);
  atomicWriteJson(path.join(stateDir, "onboarding-report-latest.json"), report);
  return { report, report_file: reportFile };
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function main(argv = process.argv.slice(2)) {
  const { command, options } = parseArgs(argv);
  if (["help", "--help", "-h"].includes(command)) {
    process.stdout.write(usage());
    return;
  }
  if (command === "node-check") {
    const expectedPeerCount = parseInteger(
      option(options, "expected-peer-count", "VOID_PARTICIPANT_EXPECTED_PEER_COUNT", DEFAULT_EXPECTED_PEERS),
      "expected peer count",
      0,
      10_000,
    );
    printJson(
      await inspectNode(option(options, "node-base", "VOID_NODE_BASE", DEFAULT_NODE_BASE), {
        expectedPeerCount,
      }),
    );
    return;
  }
  if (command === "earn-identity") {
    printJson(runEarnClient("identity", options));
    return;
  }
  if (command === "earn-status") {
    printJson(runEarnClient("status", options));
    return;
  }
  if (command === "earn") {
    printJson(runEarnClient("run", options));
    return;
  }
  if (command === "candidate-packet") {
    const expectedPeerCount = parseInteger(
      option(options, "expected-peer-count", "VOID_PARTICIPANT_EXPECTED_PEER_COUNT", DEFAULT_EXPECTED_PEERS),
      "expected peer count",
      0,
      10_000,
    );
    const node = await inspectNode(
      option(options, "node-base", "VOID_NODE_BASE", DEFAULT_NODE_BASE),
      { expectedPeerCount },
    );
    printJson(await buildCandidatePacket(options, node));
    return;
  }
  if (command === "candidate-verify") {
    printJson(await readCandidateState(options));
    return;
  }
  if (command === "candidate-submit-signed") {
    printJson(await submitSignedCandidate(options));
    return;
  }
  if (command === "onboard") {
    printJson(await onboard(options));
    return;
  }
  fail("unknown_command", `unknown command: ${command}`);
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((error) => {
    const code = error?.code || error?.name || "onboarding_failed";
    const message = error?.message || String(error);
    console.error(`${MARKER} HOLD code=${code} message=${message}`);
    if (error?.details && Object.keys(error.details).length > 0) {
      console.error(JSON.stringify(error.details, null, 2));
    }
    process.exitCode = 1;
  });
}
