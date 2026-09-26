#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

import { Interface, id } from "ethers";

import {
  buildVoidPrivateChain2050AnvilArgsV1,
  buildVoidPrivateChain2050StartupPlanV1,
  materializeVoidPrivateChain2050CliStateV1,
  revalidateVoidPrivateChain2050AnvilExecutableBeforeSpawnV1,
  verifyVoidPrivateChain2050StartedStateV1,
} from "./void-private-chain2050-startup-integration-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_LEGACY_TOKEN_SEMANTIC_CENSUS_V1 =
  "VOID_ECONOMIC_EPOCH2_LEGACY_TOKEN_SEMANTIC_CENSUS_V1";
export const VOID_ECONOMIC_EPOCH2_LEGACY_TOKEN_SEMANTIC_CENSUS_CONFIRMATION_V1 =
  "inspectFrozenEpoch1TokenSemanticsForEpoch2Runtime";

const EXPECTED_CHAIN_ID = 2050;
const EXPECTED_BLOCK_NUMBER = 37392;
const EXPECTED_BLOCK_HASH =
  "0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52";
const EXPECTED_CHECKPOINT_ID =
  "c251d3d92a0f3729f008fb7911243da0e4e2939af73f98fab2234a050c95a906";
const EXPECTED_STATE_SHA256 =
  "94b25d36990d32616a7328f5419f5075fee757c15a955617c79ef30497a14505";
const EXPECTED_VOID_TOKEN =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const EXPECTED_VOID_TOKEN_RUNTIME_SHA256 =
  "1360507ef5816f53cf32179736190a5c7a3ce605aaee7d0e06bb8a5da7351198";
const EXPECTED_TOTAL_SUPPLY_ATOMS =
  "333333333000000000000000000";
const EXPECTED_MAX_SUPPLY_ATOMS =
  "666666666000000000000000000";
const EXPECTED_LEGACY_OWNER =
  "0x0d66fcdf95d38f7db6b4206bf183f34cd816c2aa";
const EXPECTED_SUCCESSOR_OWNER =
  "0x54ded2daa618a257093556a5f54c43805b9bd516";
const EXPECTED_HOLDERS = Object.freeze([
  Object.freeze({
    address: "0x554ecc7be6f0b7cc3d1c578c2bb848e535c02514",
    balance_atoms: "323207333000000000000000000",
  }),
  Object.freeze({
    address: "0x77dfeedd19a4741f299c902ad5bbe0de917a9e59",
    balance_atoms: "126000000000000000000000",
  }),
  Object.freeze({
    address: "0xa40a43adfd174f88309173cb3daa6e09c10154a7",
    balance_atoms: "10000000000000000000000000",
  }),
]);
const SOURCE_RPC_PORT = 8545;
const ISOLATED_RPC_PORT = 18548;
const MAX_RPC_RESPONSE_BYTES = 16 * 1024 * 1024;
const ARCHIVE_ROOT = path.join(
  os.homedir(),
  ".local/state/void-economic-genesis-archive-v1/block-37392-final-candidate-v1",
);

const TOKEN = new Interface([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function owner() view returns (address)",
  "function PREMINE() view returns (uint256)",
  "function MAX_SUPPLY() view returns (uint256)",
  "function maxSupply() view returns (uint256)",
  "function cap() view returns (uint256)",
  "function transfer(address,uint256) returns (bool)",
  "function approve(address,uint256) returns (bool)",
  "function transferFrom(address,address,uint256) returns (bool)",
  "function mint(address,uint256) returns (bool)",
]);

const APPROVAL_TOPIC = id("Approval(address,address,uint256)").toLowerCase();

export const VOID_ECONOMIC_EPOCH2_LEGACY_TOKEN_SEMANTIC_CENSUS_AUTHORITY_V1 =
  Object.freeze({
    authoritative_epoch1_service_action: false,
    authoritative_epoch1_rpc_call: false,
    authoritative_chain2050_write: false,
    isolated_replay_only: true,
    isolated_state_materialization: true,
    isolated_process_start: true,
    isolated_read_only_rpc: true,
    isolated_transaction_submission: false,
    wallet_access: false,
    private_key_access: false,
    credential_content_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    token_movement: false,
    funds_movement: false,
    successor_state_mutation: false,
    successor_genesis_build: false,
    public_activation: false,
  });

export class VoidEconomicEpoch2LegacyTokenSemanticCensusHoldV1 extends Error {
  constructor(reason, detail = null) {
    super(reason);
    this.name = "VoidEconomicEpoch2LegacyTokenSemanticCensusHoldV1";
    this.reason = reason;
    this.detail = detail;
  }
}

function hold(reason, detail = null) {
  throw new VoidEconomicEpoch2LegacyTokenSemanticCensusHoldV1(reason, detail);
}

function readJson(file) {
  const value = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    hold("canonical_json_object_required", { file });
  }
  return value;
}

function lowerAddress(value, reason = "address_invalid") {
  const text = String(value || "").toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(text)) hold(reason, { value: text });
  return text;
}

function sha256Runtime(code) {
  const text = String(code || "").toLowerCase();
  if (!/^0x(?:[0-9a-f]{2})+$/.test(text)) hold("runtime_code_invalid");
  return crypto.createHash("sha256").update(Buffer.from(text.slice(2), "hex")).digest("hex");
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Canonical(value) {
  return crypto.createHash("sha256").update(Buffer.from(canonical(value), "utf8")).digest("hex");
}

function normalize(value) {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = normalize(item);
    return out;
  }
  return value;
}

function boundedError(error) {
  return String(error?.message || error).replace(/[\r\n\t]+/g, " ").slice(0, 320);
}

function rpcCall(url, method, params, timeoutMs = 15_000) {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "http:" ||
    parsed.hostname !== "127.0.0.1" ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    parsed.port !== String(ISOLATED_RPC_PORT)
  ) {
    hold("isolated_rpc_url_invalid");
  }
  const body = Buffer.from(JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), "utf8");
  return new Promise((resolve, reject) => {
    const request = http.request({
      protocol: "http:",
      hostname: "127.0.0.1",
      port: ISOLATED_RPC_PORT,
      path: "/",
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(body.length),
        connection: "close",
      },
      timeout: timeoutMs,
    }, (response) => {
      const chunks = [];
      let total = 0;
      response.on("data", (chunk) => {
        total += chunk.length;
        if (total > MAX_RPC_RESPONSE_BYTES) {
          request.destroy(new Error("isolated_rpc_response_too_large"));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => {
        try {
          if (response.statusCode !== 200) {
            reject(new Error(`isolated_rpc_http_${response.statusCode || 0}`));
            return;
          }
          const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          if (!payload || payload.jsonrpc !== "2.0" || payload.id !== 1) {
            reject(new Error("isolated_rpc_envelope_invalid"));
            return;
          }
          if (payload.error) {
            const code = String(payload.error?.code ?? "unknown");
            const message = String(payload.error?.message ?? "rpc_error")
              .replace(/[\r\n\t]+/g, " ").slice(0, 240);
            reject(new Error(`isolated_rpc_error:${method}:code=${code}:message=${message}`));
            return;
          }
          if (!Object.prototype.hasOwnProperty.call(payload, "result")) {
            reject(new Error("isolated_rpc_result_missing"));
            return;
          }
          resolve(payload.result);
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on("timeout", () => request.destroy(new Error("isolated_rpc_timeout")));
    request.on("error", reject);
    request.end(body);
  });
}

async function listenerPresent(port) {
  return await new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(500);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 5_000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
  if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
}

function loadCanonicalInputs(root) {
  const snapshot = readJson(
    path.join(root, "ops/mainnet0/economic-genesis-archive-final-snapshot-v1.json"),
  );
  const selector = readJson(
    path.join(root, "ops/mainnet0/void-private-chain2050-production-selector-deployment-v1.json"),
  );
  const authority = readJson(
    path.join(root, "ops/mainnet0/economic-genesis-archive-authority-census-v1.json"),
  );
  const roles = readJson(
    path.join(root, "ops/mainnet0/economic-epoch2-ceremony-role-map-v1.json"),
  );

  if (
    snapshot.final_block_number !== String(EXPECTED_BLOCK_NUMBER) ||
    String(snapshot.final_block_hash).toLowerCase() !== EXPECTED_BLOCK_HASH ||
    String(snapshot.durable_archive_checkpoint?.checkpoint_id_sha256) !== EXPECTED_CHECKPOINT_ID ||
    String(snapshot.durable_archive_checkpoint?.state_sha256) !== EXPECTED_STATE_SHA256
  ) {
    hold("canonical_snapshot_identity_drift");
  }
  if (
    lowerAddress(snapshot.void_token?.address) !== EXPECTED_VOID_TOKEN ||
    String(snapshot.void_token?.runtime_sha256) !== EXPECTED_VOID_TOKEN_RUNTIME_SHA256 ||
    String(snapshot.void_token?.total_supply_atoms) !== EXPECTED_TOTAL_SUPPLY_ATOMS
  ) {
    hold("canonical_voidtoken_identity_drift");
  }
  const owner = lowerAddress(authority.authorities?.void_token_owner?.address);
  if (owner !== EXPECTED_LEGACY_OWNER) hold("canonical_legacy_owner_drift");
  const role = roles.role_map?.find((row) => row.successor_surface === "VoidToken.owner");
  if (!role || lowerAddress(role.address) !== EXPECTED_SUCCESSOR_OWNER) {
    hold("canonical_successor_owner_drift");
  }
  const holders = snapshot.void_token?.nonzero_holders;
  if (!Array.isArray(holders) || holders.length !== 3) hold("canonical_holder_set_drift");
  const canonicalHolderMap = new Map(
    holders.map((row) => [lowerAddress(row.address), String(row.balance_atoms)]),
  );
  for (const expected of EXPECTED_HOLDERS) {
    if (canonicalHolderMap.get(expected.address) !== expected.balance_atoms) {
      hold("canonical_holder_balance_drift", { address: expected.address });
    }
  }

  return Object.freeze({
    selector,
    legacy_owner: owner,
    successor_owner: EXPECTED_SUCCESSOR_OWNER,
    holders: holders.map((row) => Object.freeze({
      label: String(row.label),
      address: lowerAddress(row.address),
      balance_atoms: String(row.balance_atoms),
    })),
  });
}

async function callRaw(rpcUrl, data, blockTag, from = null) {
  const tx = { to: EXPECTED_VOID_TOKEN, data };
  if (from) tx.from = lowerAddress(from);
  return await rpcCall(rpcUrl, "eth_call", [tx, blockTag]);
}

async function viewProbe(rpcUrl, signature, args, blockTag) {
  const fn = TOKEN.getFunction(signature);
  const data = TOKEN.encodeFunctionData(fn, args);
  try {
    const raw = await callRaw(rpcUrl, data, blockTag);
    const decoded = TOKEN.decodeFunctionResult(fn, raw);
    return Object.freeze({
      signature,
      selector: fn.selector,
      call_succeeded: true,
      decoded: normalize([...decoded]),
      error: null,
    });
  } catch (error) {
    return Object.freeze({
      signature,
      selector: fn.selector,
      call_succeeded: false,
      decoded: null,
      error: boundedError(error),
    });
  }
}

async function writeSimulation(rpcUrl, signature, args, from, blockTag) {
  const fn = TOKEN.getFunction(signature);
  const data = TOKEN.encodeFunctionData(fn, args);
  try {
    const raw = await callRaw(rpcUrl, data, blockTag, from);
    let decoded = null;
    try {
      decoded = normalize([...TOKEN.decodeFunctionResult(fn, raw)]);
    } catch {
      decoded = null;
    }
    return Object.freeze({
      signature,
      selector: fn.selector,
      from: lowerAddress(from),
      call_succeeded: true,
      return_data: String(raw),
      decoded,
      error: null,
      transaction_submission_performed: false,
      state_mutation_performed: false,
    });
  } catch (error) {
    return Object.freeze({
      signature,
      selector: fn.selector,
      from: lowerAddress(from),
      call_succeeded: false,
      return_data: null,
      decoded: null,
      error: boundedError(error),
      transaction_submission_performed: false,
      state_mutation_performed: false,
    });
  }
}

function decodeTopicAddress(word) {
  const text = String(word || "").toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(text)) hold("approval_topic_address_invalid");
  return `0x${text.slice(-40)}`;
}

async function enumerateAllowances(rpcUrl, blockNumber) {
  const pairs = new Map();
  for (let start = 0; start <= blockNumber; start += 5_000) {
    const end = Math.min(blockNumber, start + 4_999);
    const logs = await rpcCall(rpcUrl, "eth_getLogs", [{
      address: EXPECTED_VOID_TOKEN,
      fromBlock: `0x${start.toString(16)}`,
      toBlock: `0x${end.toString(16)}`,
      topics: [APPROVAL_TOPIC],
    }]);
    if (!Array.isArray(logs)) hold("approval_log_shape_invalid");
    for (const log of logs) {
      if (!Array.isArray(log?.topics) || log.topics.length < 3) {
        hold("approval_log_topic_invalid");
      }
      const owner = decodeTopicAddress(log.topics[1]);
      const spender = decodeTopicAddress(log.topics[2]);
      pairs.set(`${owner}:${spender}`, { owner, spender });
    }
  }

  const nonzero = [];
  for (const pair of pairs.values()) {
    const probe = await viewProbe(
      rpcUrl,
      "allowance(address,address)",
      [pair.owner, pair.spender],
      `0x${blockNumber.toString(16)}`,
    );
    if (!probe.call_succeeded) hold("allowance_probe_failed", { pair, error: probe.error });
    const amount = BigInt(String(probe.decoded?.[0] ?? "0"));
    if (amount > 0n) {
      nonzero.push(Object.freeze({
        owner: pair.owner,
        spender: pair.spender,
        amount_atoms: amount.toString(),
      }));
    }
  }
  nonzero.sort((a, b) => `${a.owner}:${a.spender}`.localeCompare(`${b.owner}:${b.spender}`));
  return Object.freeze({
    discovered_approval_pair_count: pairs.size,
    nonzero_allowance_count: nonzero.length,
    nonzero_allowances: Object.freeze(nonzero),
  });
}

function countHexOccurrences(code, needle) {
  const haystack = String(code || "").toLowerCase().replace(/^0x/, "");
  const target = String(needle || "").toLowerCase().replace(/^0x/, "");
  if (!target) return 0;
  let count = 0;
  let offset = 0;
  while (true) {
    const index = haystack.indexOf(target, offset);
    if (index < 0) break;
    count += 1;
    offset = index + 1;
  }
  return count;
}

export function classifyVoidEconomicEpoch2LegacyTokenSemanticObservationV1(observation) {
  if (!observation || typeof observation !== "object" || Array.isArray(observation)) {
    hold("observation_invalid");
  }
  if (
    observation.chain_id !== EXPECTED_CHAIN_ID ||
    observation.block_number !== EXPECTED_BLOCK_NUMBER ||
    observation.block_hash !== EXPECTED_BLOCK_HASH ||
    observation.checkpoint_id_sha256 !== EXPECTED_CHECKPOINT_ID ||
    observation.state_sha256 !== EXPECTED_STATE_SHA256 ||
    observation.unlocked_account_count !== 0
  ) {
    hold("frozen_source_identity_mismatch");
  }
  const token = observation.void_token;
  if (
    !token ||
    lowerAddress(token.address) !== EXPECTED_VOID_TOKEN ||
    token.runtime_sha256 !== EXPECTED_VOID_TOKEN_RUNTIME_SHA256 ||
    String(token.total_supply_atoms) !== EXPECTED_TOTAL_SUPPLY_ATOMS ||
    lowerAddress(token.owner) !== EXPECTED_LEGACY_OWNER
  ) {
    hold("voidtoken_observation_mismatch");
  }
  if (!Array.isArray(token.holders) || token.holders.length !== 3) {
    hold("holder_observation_count_mismatch");
  }
  const observedHolderMap = new Map(
    token.holders.map((row) => [lowerAddress(row.address), String(row.balance_atoms)]),
  );
  for (const expected of EXPECTED_HOLDERS) {
    if (observedHolderMap.get(expected.address) !== expected.balance_atoms) {
      hold("holder_balance_mismatch", { address: expected.address });
    }
  }
  const sum = token.holders.reduce(
    (acc, row) => acc + BigInt(String(row.balance_atoms)),
    0n,
  );
  if (sum.toString() !== EXPECTED_TOTAL_SUPPLY_ATOMS) {
    hold("holder_sum_mismatch");
  }
  if (!observation.semantic_profile || typeof observation.semantic_profile !== "object") {
    hold("semantic_profile_missing");
  }
  return Object.freeze({
    ok: true,
    status: "SEMANTIC_CENSUS_GREEN",
    marker: VOID_ECONOMIC_EPOCH2_LEGACY_TOKEN_SEMANTIC_CENSUS_V1,
    source_identity_verified: true,
    source_holder_sum_atoms: sum.toString(),
    source_nonzero_holder_count: token.holders.length,
    successor_runtime_built: false,
    successor_runtime_semantic_equivalence_verified: false,
    migration_authorized: false,
  });
}

export async function runVoidEconomicEpoch2LegacyTokenSemanticCensusV1({
  root = process.cwd(),
  apply = false,
  confirmation = "",
} = {}) {
  const inputs = loadCanonicalInputs(root);
  const selector = inputs.selector;
  const isolatedRpcUrl = `http://127.0.0.1:${ISOLATED_RPC_PORT}/`;

  const plan = Object.freeze({
    marker: VOID_ECONOMIC_EPOCH2_LEGACY_TOKEN_SEMANTIC_CENSUS_V1,
    status: "PLAN_READY",
    source_block_number: EXPECTED_BLOCK_NUMBER,
    source_block_hash: EXPECTED_BLOCK_HASH,
    source_checkpoint_id_sha256: EXPECTED_CHECKPOINT_ID,
    source_state_sha256: EXPECTED_STATE_SHA256,
    source_void_token: EXPECTED_VOID_TOKEN,
    source_void_token_runtime_sha256: EXPECTED_VOID_TOKEN_RUNTIME_SHA256,
    isolated_rpc_url: isolatedRpcUrl,
    archive_checkpoint_root: ARCHIVE_ROOT,
    semantic_surfaces: Object.freeze([
      "name()",
      "symbol()",
      "decimals()",
      "PREMINE()",
      "MAX_SUPPLY()/maxSupply()/cap() if present",
      "totalSupply()",
      "owner()",
      "balanceOf(address)",
      "allowance(address,address)",
      "transfer(address,uint256) positive/zero/zero-address/insufficient/self eth_call simulations",
      "approve(address,uint256) positive/zero-amount/zero-spender eth_call simulations",
      "transferFrom(address,address,uint256) live-allowance/no-allowance/zero-amount eth_call simulations",
      "mint(address,uint256) owner/non-owner/cap/zero-address/zero-amount eth_call simulations",
      "runtime selector/literal census",
    ]),
    required_confirmation:
      VOID_ECONOMIC_EPOCH2_LEGACY_TOKEN_SEMANTIC_CENSUS_CONFIRMATION_V1,
    authority: VOID_ECONOMIC_EPOCH2_LEGACY_TOKEN_SEMANTIC_CENSUS_AUTHORITY_V1,
  });
  if (!apply) return plan;
  if (confirmation !== VOID_ECONOMIC_EPOCH2_LEGACY_TOKEN_SEMANTIC_CENSUS_CONFIRMATION_V1) {
    hold("explicit_confirmation_required", {
      required_confirmation:
        VOID_ECONOMIC_EPOCH2_LEGACY_TOKEN_SEMANTIC_CENSUS_CONFIRMATION_V1,
    });
  }

  if (await listenerPresent(SOURCE_RPC_PORT)) hold("authoritative_epoch1_rpc_listener_present");
  if (await listenerPresent(ISOLATED_RPC_PORT)) hold("isolated_rpc_port_already_in_use");

  const baselineState = path.join(
    selector.deployment_root,
    selector.baseline.normalized_deployment_relative_path,
  );
  const derivedRoot = path.join(
    os.homedir(),
    ".local/state/void-economic-epoch2-legacy-token-semantic-census-v1/derived",
  );
  const startup = buildVoidPrivateChain2050StartupPlanV1({
    anvil_executable: selector.runtime_seal_requirements.pinned_anvil_unit_path,
    anvil_executable_sha256: selector.runtime_seal_requirements.pinned_anvil_sha256,
    baseline_state: baselineState,
    baseline_state_sha256: selector.baseline.normalized_sha256,
    baseline_state_format: selector.baseline.normalized_format,
    baseline_block_number: selector.baseline.block_number,
    baseline_block_hash: selector.baseline.block_hash,
    checkpoint_root: ARCHIVE_ROOT,
    minimum_block_number: EXPECTED_BLOCK_NUMBER,
    derived_root: derivedRoot,
    rpc_url: isolatedRpcUrl,
    gas_limit: 200_000_000,
  });
  const selection = startup.selection;
  if (
    selection.selected_kind !== "checkpoint" ||
    selection.selected_block_number !== EXPECTED_BLOCK_NUMBER ||
    selection.selected_block_hash !== EXPECTED_BLOCK_HASH ||
    selection.selected_state_sha256 !== EXPECTED_STATE_SHA256 ||
    selection.selected_checkpoint_id_sha256 !== EXPECTED_CHECKPOINT_ID
  ) {
    hold("exact_frozen_checkpoint_not_selected");
  }

  const cliState = await materializeVoidPrivateChain2050CliStateV1(selection, {
    derived_root: derivedRoot,
  });
  const rpcUrl = new URL(isolatedRpcUrl);
  const anvilArgs = buildVoidPrivateChain2050AnvilArgsV1(
    rpcUrl,
    cliState,
    null,
    200_000_000,
  );
  const executable = revalidateVoidPrivateChain2050AnvilExecutableBeforeSpawnV1(startup);
  const child = spawn(executable.path, anvilArgs, {
    stdio: ["ignore", "ignore", "ignore"],
    env: {
      HOME: process.env.HOME || os.homedir(),
      PATH: "/usr/bin:/bin",
      LANG: "C",
      LC_ALL: "C",
      TMPDIR: process.env.TMPDIR || "/tmp",
    },
  });

  try {
    const verified = await verifyVoidPrivateChain2050StartedStateV1(
      rpcUrl,
      selection,
      60_000,
      async (_url, method, params) => await rpcCall(isolatedRpcUrl, method, params),
    );
    const blockTag = `0x${EXPECTED_BLOCK_NUMBER.toString(16)}`;
    const code = await rpcCall(isolatedRpcUrl, "eth_getCode", [EXPECTED_VOID_TOKEN, blockTag]);
    const runtimeSha256 = sha256Runtime(code);

    const totalSupplyProbe = await viewProbe(isolatedRpcUrl, "totalSupply()", [], blockTag);
    const ownerProbe = await viewProbe(isolatedRpcUrl, "owner()", [], blockTag);
    if (!totalSupplyProbe.call_succeeded || !ownerProbe.call_succeeded) {
      hold("required_token_getter_failed", {
        total_supply_error: totalSupplyProbe.error,
        owner_error: ownerProbe.error,
      });
    }
    const totalSupply = String(totalSupplyProbe.decoded[0]);
    const owner = lowerAddress(ownerProbe.decoded[0]);

    const holders = [];
    for (const holder of inputs.holders) {
      const probe = await viewProbe(isolatedRpcUrl, "balanceOf(address)", [holder.address], blockTag);
      if (!probe.call_succeeded) hold("holder_balance_probe_failed", { address: holder.address });
      holders.push(Object.freeze({
        label: holder.label,
        address: holder.address,
        balance_atoms: String(probe.decoded[0]),
      }));
    }

    const metadata = Object.freeze({
      name: await viewProbe(isolatedRpcUrl, "name()", [], blockTag),
      symbol: await viewProbe(isolatedRpcUrl, "symbol()", [], blockTag),
      decimals: await viewProbe(isolatedRpcUrl, "decimals()", [], blockTag),
      premine: await viewProbe(isolatedRpcUrl, "PREMINE()", [], blockTag),
      max_supply_uppercase: await viewProbe(isolatedRpcUrl, "MAX_SUPPLY()", [], blockTag),
      max_supply_camel: await viewProbe(isolatedRpcUrl, "maxSupply()", [], blockTag),
      cap: await viewProbe(isolatedRpcUrl, "cap()", [], blockTag),
    });

    const allowances = await enumerateAllowances(isolatedRpcUrl, EXPECTED_BLOCK_NUMBER);
    const deterministicRecipient = "0x000000000000000000000000000000000000dEaD".toLowerCase();
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    const zeroBalanceCaller = "0x0000000000000000000000000000000000001111";
    const noAllowanceSpender = "0x0000000000000000000000000000000000002222";
    const fundedHolder = holders[0].address;

    let transferFromSimulation = Object.freeze({
      tested: false,
      reason: "no_live_nonzero_allowance_with_sufficient_balance",
    });
    for (const allowance of allowances.nonzero_allowances) {
      const holder = holders.find((row) => row.address === allowance.owner);
      if (!holder) continue;
      if (BigInt(holder.balance_atoms) < 1n || BigInt(allowance.amount_atoms) < 1n) continue;
      transferFromSimulation = Object.freeze({
        tested: true,
        result: await writeSimulation(
          isolatedRpcUrl,
          "transferFrom(address,address,uint256)",
          [allowance.owner, deterministicRecipient, 1n],
          allowance.spender,
          blockTag,
        ),
      });
      break;
    }

    const currentSupply = BigInt(totalSupply);
    const expectedMax = BigInt(EXPECTED_MAX_SUPPLY_ATOMS);
    const remainingToExpectedMax = expectedMax - currentSupply;
    if (remainingToExpectedMax < 0n) hold("source_supply_above_expected_max");

    const simulations = Object.freeze({
      transfer_one_atom_from_funded_holder: await writeSimulation(
        isolatedRpcUrl,
        "transfer(address,uint256)",
        [deterministicRecipient, 1n],
        fundedHolder,
        blockTag,
      ),
      approve_one_atom_from_funded_holder: await writeSimulation(
        isolatedRpcUrl,
        "approve(address,uint256)",
        [deterministicRecipient, 1n],
        fundedHolder,
        blockTag,
      ),
      transfer_zero_amount_from_funded_holder: await writeSimulation(
        isolatedRpcUrl,
        "transfer(address,uint256)",
        [deterministicRecipient, 0n],
        fundedHolder,
        blockTag,
      ),
      transfer_one_atom_to_zero_from_funded_holder: await writeSimulation(
        isolatedRpcUrl,
        "transfer(address,uint256)",
        [zeroAddress, 1n],
        fundedHolder,
        blockTag,
      ),
      transfer_one_atom_from_zero_balance_caller: await writeSimulation(
        isolatedRpcUrl,
        "transfer(address,uint256)",
        [deterministicRecipient, 1n],
        zeroBalanceCaller,
        blockTag,
      ),
      transfer_zero_amount_from_zero_balance_caller: await writeSimulation(
        isolatedRpcUrl,
        "transfer(address,uint256)",
        [deterministicRecipient, 0n],
        zeroBalanceCaller,
        blockTag,
      ),
      transfer_one_atom_to_self_from_funded_holder: await writeSimulation(
        isolatedRpcUrl,
        "transfer(address,uint256)",
        [fundedHolder, 1n],
        fundedHolder,
        blockTag,
      ),
      approve_zero_spender_one_atom: await writeSimulation(
        isolatedRpcUrl,
        "approve(address,uint256)",
        [zeroAddress, 1n],
        fundedHolder,
        blockTag,
      ),
      approve_nonzero_spender_zero_amount: await writeSimulation(
        isolatedRpcUrl,
        "approve(address,uint256)",
        [deterministicRecipient, 0n],
        fundedHolder,
        blockTag,
      ),
      transfer_from_without_allowance_one_atom: await writeSimulation(
        isolatedRpcUrl,
        "transferFrom(address,address,uint256)",
        [fundedHolder, deterministicRecipient, 1n],
        noAllowanceSpender,
        blockTag,
      ),
      transfer_from_without_allowance_zero_amount: await writeSimulation(
        isolatedRpcUrl,
        "transferFrom(address,address,uint256)",
        [fundedHolder, deterministicRecipient, 0n],
        noAllowanceSpender,
        blockTag,
      ),
      transfer_from_without_allowance_zero_to_zero: await writeSimulation(
        isolatedRpcUrl,
        "transferFrom(address,address,uint256)",
        [fundedHolder, zeroAddress, 0n],
        noAllowanceSpender,
        blockTag,
      ),
      transfer_from_live_allowance: transferFromSimulation,
      mint_one_atom_from_legacy_owner: await writeSimulation(
        isolatedRpcUrl,
        "mint(address,uint256)",
        [deterministicRecipient, 1n],
        owner,
        blockTag,
      ),
      mint_one_atom_from_non_owner: await writeSimulation(
        isolatedRpcUrl,
        "mint(address,uint256)",
        [deterministicRecipient, 1n],
        fundedHolder,
        blockTag,
      ),
      mint_zero_amount_from_owner_to_nonzero: await writeSimulation(
        isolatedRpcUrl,
        "mint(address,uint256)",
        [deterministicRecipient, 0n],
        owner,
        blockTag,
      ),
      mint_zero_amount_from_non_owner_to_nonzero: await writeSimulation(
        isolatedRpcUrl,
        "mint(address,uint256)",
        [deterministicRecipient, 0n],
        fundedHolder,
        blockTag,
      ),
      mint_zero_amount_from_owner_to_zero: await writeSimulation(
        isolatedRpcUrl,
        "mint(address,uint256)",
        [zeroAddress, 0n],
        owner,
        blockTag,
      ),
      mint_exact_remaining_to_expected_max_from_owner: await writeSimulation(
        isolatedRpcUrl,
        "mint(address,uint256)",
        [deterministicRecipient, remainingToExpectedMax],
        owner,
        blockTag,
      ),
      mint_one_atom_above_expected_max_from_owner: await writeSimulation(
        isolatedRpcUrl,
        "mint(address,uint256)",
        [deterministicRecipient, remainingToExpectedMax + 1n],
        owner,
        blockTag,
      ),
      mint_to_zero_from_owner: await writeSimulation(
        isolatedRpcUrl,
        "mint(address,uint256)",
        ["0x0000000000000000000000000000000000000000", 1n],
        owner,
        blockTag,
      ),
    });

    const selectorSignatures = [
      "name()",
      "symbol()",
      "decimals()",
      "totalSupply()",
      "balanceOf(address)",
      "allowance(address,address)",
      "owner()",
      "PREMINE()",
      "MAX_SUPPLY()",
      "maxSupply()",
      "cap()",
      "transfer(address,uint256)",
      "approve(address,uint256)",
      "transferFrom(address,address,uint256)",
      "mint(address,uint256)",
    ];
    const selectorCensus = Object.freeze(Object.fromEntries(
      selectorSignatures.map((signature) => {
        const selectorHex = TOKEN.getFunction(signature).selector.slice(2).toLowerCase();
        return [signature, Object.freeze({
          selector: `0x${selectorHex}`,
          runtime_hex_occurrence_count: countHexOccurrences(code, selectorHex),
        })];
      }),
    ));

    const semanticProfile = Object.freeze({
      metadata,
      allowances,
      simulations,
      selector_census: selectorCensus,
      runtime_literal_census: Object.freeze({
        legacy_owner_occurrence_count:
          countHexOccurrences(code, EXPECTED_LEGACY_OWNER.slice(2)),
        successor_owner_occurrence_count:
          countHexOccurrences(code, EXPECTED_SUCCESSOR_OWNER.slice(2)),
        expected_premine_atoms_occurrence_count:
          countHexOccurrences(
            code,
            BigInt(EXPECTED_TOTAL_SUPPLY_ATOMS).toString(16).padStart(64, "0"),
          ),
        expected_max_supply_atoms_occurrence_count:
          countHexOccurrences(
            code,
            BigInt(EXPECTED_MAX_SUPPLY_ATOMS).toString(16).padStart(64, "0"),
          ),
      }),
      expected_max_supply_atoms_for_probe: EXPECTED_MAX_SUPPLY_ATOMS,
      expected_remaining_mint_capacity_atoms: remainingToExpectedMax.toString(),
    });

    const observation = Object.freeze({
      chain_id: verified.chain_id,
      block_number: selection.selected_block_number,
      block_hash: selection.selected_block_hash,
      checkpoint_id_sha256: selection.selected_checkpoint_id_sha256,
      state_sha256: selection.selected_state_sha256,
      unlocked_account_count: verified.unlocked_account_count,
      void_token: Object.freeze({
        address: EXPECTED_VOID_TOKEN,
        runtime_sha256: runtimeSha256,
        total_supply_atoms: totalSupply,
        owner,
        holders: Object.freeze(holders),
      }),
      semantic_profile: semanticProfile,
    });
    const classification =
      classifyVoidEconomicEpoch2LegacyTokenSemanticObservationV1(observation);

    const receipt = {
      marker: VOID_ECONOMIC_EPOCH2_LEGACY_TOKEN_SEMANTIC_CENSUS_V1,
      version: 1,
      status: classification.status,
      observation_class: "isolated_replay_read_only_semantic_census",
      source_snapshot: {
        block_number: String(EXPECTED_BLOCK_NUMBER),
        block_hash: EXPECTED_BLOCK_HASH,
        checkpoint_id_sha256: EXPECTED_CHECKPOINT_ID,
        state_sha256: EXPECTED_STATE_SHA256,
      },
      isolated_replay: {
        rpc: isolatedRpcUrl,
        anvil_executable_sha256: executable.sha256,
        selected_state_materialized: true,
        selected_state_source_sha256: cliState.source_state_sha256,
        unlocked_account_count: verified.unlocked_account_count,
      },
      void_token: observation.void_token,
      semantic_profile: semanticProfile,
      successor_owner_target: inputs.successor_owner,
      classification,
      authority: VOID_ECONOMIC_EPOCH2_LEGACY_TOKEN_SEMANTIC_CENSUS_AUTHORITY_V1,
    };
    return Object.freeze({
      ...receipt,
      receipt_sha256: sha256Canonical(receipt),
    });
  } finally {
    await stopChild(child);
  }
}

function parseArgs(argv) {
  const args = { apply: false, confirmation: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--apply") args.apply = true;
    else if (key === "--confirmation") {
      const value = argv[index + 1];
      if (!value) hold("confirmation_value_missing");
      args.confirmation = value;
      index += 1;
    } else if (key === "--help") args.help = true;
    else hold(`unknown_argument:${key}`);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      "Usage: node tools/void-economic-epoch2-legacy-token-semantic-census-v1.mjs [--apply --confirmation inspectFrozenEpoch1TokenSemanticsForEpoch2Runtime]\n",
    );
    return;
  }
  const result = await runVoidEconomicEpoch2LegacyTokenSemanticCensusV1({
    apply: args.apply,
    confirmation: args.confirmation,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const invoked = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;

if (invoked) {
  main().catch((error) => {
    const reason =
      error instanceof VoidEconomicEpoch2LegacyTokenSemanticCensusHoldV1
        ? error.reason
        : String(error?.message || error);
    const detail =
      error instanceof VoidEconomicEpoch2LegacyTokenSemanticCensusHoldV1 &&
      error.detail !== null
        ? ` detail=${JSON.stringify(error.detail)}`
        : "";
    process.stderr.write(
      `VOID_ECONOMIC_EPOCH2_LEGACY_TOKEN_SEMANTIC_CENSUS_V1_HOLD reason=${reason}${detail}\n`,
    );
    process.exitCode = 2;
  });
}
