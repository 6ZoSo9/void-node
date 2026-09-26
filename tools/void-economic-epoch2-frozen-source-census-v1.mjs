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

import {
  concat,
  id,
  keccak256,
  toBeHex,
  zeroPadValue,
} from "ethers";

import {
  buildVoidPrivateChain2050AnvilArgsV1,
  buildVoidPrivateChain2050StartupPlanV1,
  materializeVoidPrivateChain2050CliStateV1,
  revalidateVoidPrivateChain2050AnvilExecutableBeforeSpawnV1,
  verifyVoidPrivateChain2050StartedStateV1,
} from "./void-private-chain2050-startup-integration-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_FROZEN_SOURCE_CENSUS_V1 =
  "VOID_ECONOMIC_EPOCH2_FROZEN_SOURCE_CENSUS_V1";
export const VOID_ECONOMIC_EPOCH2_FROZEN_SOURCE_CENSUS_CONFIRMATION_V1 =
  "inspectFrozenEpoch1ForEpoch2OfflineBuild";

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
const EXPECTED_LEGACY_OWNER =
  "0x0d66fcdf95d38f7db6b4206bf183f34cd816c2aa";
const EXPECTED_SUCCESSOR_OWNER =
  "0x54ded2daa618a257093556a5f54c43805b9bd516";
const SOURCE_RPC_PORT = 8545;
const ISOLATED_RPC_PORT = 18547;
const ECONOMIC_GENESIS_ARCHIVE_ROOT = path.join(
  os.homedir(),
  ".local/state/void-economic-genesis-archive-v1/block-37392-final-candidate-v1",
);
const STORAGE_SCAN_SLOTS = 64;
const MAX_RPC_RESPONSE_BYTES = 16 * 1024 * 1024;
const APPROVAL_TOPIC = id("Approval(address,address,uint256)").toLowerCase();
const BALANCE_SELECTOR = "0x70a08231";
const ALLOWANCE_SELECTOR = "0xdd62ed3e";
const TOTAL_SUPPLY_SELECTOR = "0x18160ddd";
const OWNER_SELECTOR = "0x8da5cb5b";
const TRANSFER_OWNERSHIP_SELECTOR = "0xf2fde38b";

export const VOID_ECONOMIC_EPOCH2_FROZEN_SOURCE_CENSUS_AUTHORITY_V1 =
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

export class VoidEconomicEpoch2FrozenSourceCensusHoldV1 extends Error {
  constructor(reason, detail = null) {
    super(reason);
    this.name = "VoidEconomicEpoch2FrozenSourceCensusHoldV1";
    this.reason = reason;
    this.detail = detail;
  }
}

function hold(reason, detail = null) {
  throw new VoidEconomicEpoch2FrozenSourceCensusHoldV1(reason, detail);
}

function readJson(file) {
  const value = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    hold("canonical_json_object_required", { file });
  }
  return value;
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Buffer(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256Canonical(value) {
  return sha256Buffer(Buffer.from(canonical(value), "utf8"));
}

function lowerAddress(value, reason = "address_invalid") {
  const text = String(value || "").toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(text)) hold(reason);
  return text;
}

function exactHexWord(value, reason = "rpc_word_invalid") {
  const text = String(value || "").toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(text)) hold(reason, { value: text.slice(0, 80) });
  return text;
}

function wordToBigInt(value) {
  return BigInt(exactHexWord(value));
}

function encodeAddressArg(address) {
  return lowerAddress(address).slice(2).padStart(64, "0");
}

function decodeAddressWord(value) {
  return `0x${exactHexWord(value).slice(-40)}`;
}

function sha256Runtime(code) {
  const text = String(code || "").toLowerCase();
  if (!/^0x(?:[0-9a-f]{2})+$/.test(text)) hold("runtime_code_invalid");
  return sha256Buffer(Buffer.from(text.slice(2), "hex"));
}

function slotWord(slot) {
  if (!Number.isSafeInteger(slot) || slot < 0) hold("storage_slot_invalid");
  return zeroPadValue(toBeHex(slot), 32).toLowerCase();
}

export function deriveVoidEconomicEpoch2BalanceStorageKeyV1(address, slot) {
  return keccak256(
    concat([
      zeroPadValue(lowerAddress(address), 32),
      zeroPadValue(toBeHex(slot), 32),
    ]),
  ).toLowerCase();
}

export function deriveVoidEconomicEpoch2AllowanceStorageKeyV1(
  owner,
  spender,
  slot,
) {
  const ownerRoot = keccak256(
    concat([
      zeroPadValue(lowerAddress(owner), 32),
      zeroPadValue(toBeHex(slot), 32),
    ]),
  );
  return keccak256(
    concat([
      zeroPadValue(lowerAddress(spender), 32),
      ownerRoot,
    ]),
  ).toLowerCase();
}

export async function discoverVoidEconomicEpoch2TokenStorageLayoutV1({
  readStorage,
  holders,
  totalSupplyAtoms,
  owner,
  ownerAccessStorageKeys = [],
  nonzeroAllowances = [],
  scanSlots = STORAGE_SCAN_SLOTS,
}) {
  if (typeof readStorage !== "function") hold("read_storage_callback_required");
  if (!Array.isArray(holders) || holders.length < 1) hold("holders_required");
  if (!Number.isSafeInteger(scanSlots) || scanSlots < 1 || scanSlots > 256) {
    hold("storage_scan_slot_bound_invalid");
  }

  const expectedSupply = BigInt(String(totalSupplyAtoms));
  const expectedOwner = lowerAddress(owner);
  const direct = [];
  for (let slot = 0; slot < scanSlots; slot += 1) {
    const value = exactHexWord(await readStorage(slotWord(slot)));
    direct.push({ slot, value });
  }

  const supplyCandidates = direct
    .filter((row) => wordToBigInt(row.value) === expectedSupply)
    .map((row) => row.slot);
  if (supplyCandidates.length !== 1) {
    hold("voidtoken_total_supply_storage_slot_not_unique", {
      candidates: supplyCandidates,
    });
  }

  const ownerCandidates = direct
    .filter((row) => {
      const raw = row.value.slice(2);
      return (
        /^0{24}[0-9a-f]{40}$/.test(raw) &&
        `0x${raw.slice(-40)}` === expectedOwner
      );
    })
    .map((row) => row.slot);
  if (ownerCandidates.length < 1) {
    hold("voidtoken_owner_storage_slot_not_found");
  }

  if (!Array.isArray(ownerAccessStorageKeys) || ownerAccessStorageKeys.length < 1) {
    hold("voidtoken_owner_access_storage_keys_required");
  }
  const ownerAccessKeySet = new Set(
    ownerAccessStorageKeys.map((value) =>
      exactHexWord(value, "voidtoken_owner_access_storage_key_invalid"),
    ),
  );
  const ownerAccessCandidates = ownerCandidates.filter((slot) =>
    ownerAccessKeySet.has(slotWord(slot)),
  );
  if (ownerAccessCandidates.length !== 1) {
    hold("voidtoken_owner_storage_slot_not_unique", {
      candidates: ownerCandidates,
      access_list_matches: ownerAccessCandidates,
    });
  }
  const ownerSlot = ownerAccessCandidates[0];

  const balanceCandidates = [];
  for (let slot = 0; slot < scanSlots; slot += 1) {
    let matches = true;
    for (const holder of holders) {
      const key = deriveVoidEconomicEpoch2BalanceStorageKeyV1(
        holder.address,
        slot,
      );
      const value = exactHexWord(await readStorage(key));
      if (wordToBigInt(value) !== BigInt(String(holder.balance_atoms))) {
        matches = false;
        break;
      }
    }
    if (matches) balanceCandidates.push(slot);
  }
  if (balanceCandidates.length !== 1) {
    hold("voidtoken_balance_mapping_storage_slot_not_unique", {
      candidates: balanceCandidates,
    });
  }

  let allowanceMappingSlot = null;
  if (nonzeroAllowances.length > 0) {
    const candidates = [];
    for (let slot = 0; slot < scanSlots; slot += 1) {
      let matches = true;
      for (const allowance of nonzeroAllowances) {
        const key = deriveVoidEconomicEpoch2AllowanceStorageKeyV1(
          allowance.owner,
          allowance.spender,
          slot,
        );
        const value = exactHexWord(await readStorage(key));
        if (wordToBigInt(value) !== BigInt(String(allowance.amount_atoms))) {
          matches = false;
          break;
        }
      }
      if (matches) candidates.push(slot);
    }
    if (candidates.length !== 1) {
      hold("voidtoken_allowance_mapping_storage_slot_not_unique", {
        candidates,
      });
    }
    allowanceMappingSlot = candidates[0];
  }

  const balanceMappingSlot = balanceCandidates[0];
  return Object.freeze({
    scan_slot_count: scanSlots,
    total_supply_slot: supplyCandidates[0],
    owner_slot: ownerSlot,
    owner_value_candidate_slots: Object.freeze([...ownerCandidates]),
    owner_access_storage_keys: Object.freeze([...ownerAccessKeySet].sort()),
    balance_mapping_slot: balanceMappingSlot,
    allowance_mapping_slot:
      allowanceMappingSlot === null ? null : allowanceMappingSlot,
    holder_storage: holders.map((holder) => ({
      label: String(holder.label || ""),
      address: lowerAddress(holder.address),
      balance_atoms: String(holder.balance_atoms),
      storage_key: deriveVoidEconomicEpoch2BalanceStorageKeyV1(
        holder.address,
        balanceMappingSlot,
      ),
    })),
  });
}

function loadCanonicalInputs(root) {
  const snapshot = readJson(
    path.join(root, "ops/mainnet0/economic-genesis-archive-final-snapshot-v1.json"),
  );
  const selector = readJson(
    path.join(root, "ops/mainnet0/void-private-chain2050-production-selector-deployment-v1.json"),
  );
  const destinations = readJson(
    path.join(root, "ops/mainnet0/economic-epoch2-contract-holder-destination-manifest-v1.json"),
  );
  const roles = readJson(
    path.join(root, "ops/mainnet0/economic-epoch2-ceremony-role-map-v1.json"),
  );
  const authority = readJson(
    path.join(root, "ops/mainnet0/economic-genesis-archive-authority-census-v1.json"),
  );

  if (
    snapshot.final_block_number !== String(EXPECTED_BLOCK_NUMBER) ||
    String(snapshot.final_block_hash).toLowerCase() !== EXPECTED_BLOCK_HASH ||
    String(snapshot.durable_archive_checkpoint?.checkpoint_id_sha256) !==
      EXPECTED_CHECKPOINT_ID ||
    String(snapshot.durable_archive_checkpoint?.state_sha256) !==
      EXPECTED_STATE_SHA256
  ) {
    hold("canonical_final_snapshot_identity_drift");
  }
  if (
    lowerAddress(snapshot.void_token?.address) !== EXPECTED_VOID_TOKEN ||
    String(snapshot.void_token?.runtime_sha256) !==
      EXPECTED_VOID_TOKEN_RUNTIME_SHA256 ||
    String(snapshot.void_token?.total_supply_atoms) !==
      EXPECTED_TOTAL_SUPPLY_ATOMS
  ) {
    hold("canonical_voidtoken_identity_drift");
  }
  const holders = snapshot.void_token?.nonzero_holders;
  if (!Array.isArray(holders) || holders.length !== 3) {
    hold("canonical_holder_set_drift");
  }
  const owner = lowerAddress(
    authority.authorities?.void_token_owner?.address,
    "canonical_legacy_owner_invalid",
  );
  if (owner !== EXPECTED_LEGACY_OWNER) hold("canonical_legacy_owner_drift");

  const role = roles.role_map?.find(
    (row) => row.successor_surface === "VoidToken.owner",
  );
  if (!role || lowerAddress(role.address) !== EXPECTED_SUCCESSOR_OWNER) {
    hold("canonical_successor_owner_drift");
  }
  if (
    destinations.void_token?.preserve_same_address !== true ||
    lowerAddress(destinations.void_token?.address) !== EXPECTED_VOID_TOKEN
  ) {
    hold("canonical_destination_token_identity_drift");
  }

  return Object.freeze({
    snapshot,
    selector,
    destinations,
    roles,
    authority,
    holders: holders.map((row) => Object.freeze({
      label: String(row.label),
      address: lowerAddress(row.address),
      account_kind: String(row.account_kind),
      balance_atoms: String(row.balance_atoms),
      runtime_sha256: String(row.runtime_sha256),
    })),
    legacy_owner: owner,
    successor_owner: lowerAddress(role.address),
  });
}

function rpcCall(url, method, params, timeoutMs = 12_000) {
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
  const body = Buffer.from(
    JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    "utf8",
  );
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
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
      },
      (response) => {
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
            if (
              !payload ||
              payload.jsonrpc !== "2.0" ||
              payload.id !== 1 ||
              !Object.prototype.hasOwnProperty.call(payload, "result")
            ) {
              reject(new Error("isolated_rpc_envelope_invalid"));
              return;
            }
            if (payload.error) {
              reject(new Error(`isolated_rpc_error:${method}`));
              return;
            }
            resolve(payload.result);
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    request.on("timeout", () => request.destroy(new Error("isolated_rpc_timeout")));
    request.on("error", reject);
    request.end(body);
  });
}

async function listenerPresent(port) {
  return await new Promise((resolve) => {
    const socket = net.createConnection({
      host: "127.0.0.1",
      port,
    });
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
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
  }
}

async function callWord(rpcUrl, to, data, blockTag) {
  return exactHexWord(
    await rpcCall(rpcUrl, "eth_call", [{ to, data }, blockTag]),
    "eth_call_word_invalid",
  );
}

async function enumerateAllowances(rpcUrl, token, blockNumber) {
  const pairs = new Map();
  const chunk = 5_000;
  for (let start = 0; start <= blockNumber; start += chunk) {
    const end = Math.min(blockNumber, start + chunk - 1);
    const logs = await rpcCall(rpcUrl, "eth_getLogs", [{
      address: token,
      fromBlock: `0x${start.toString(16)}`,
      toBlock: `0x${end.toString(16)}`,
      topics: [APPROVAL_TOPIC],
    }]);
    if (!Array.isArray(logs)) hold("approval_log_shape_invalid");
    for (const log of logs) {
      if (
        !Array.isArray(log?.topics) ||
        log.topics.length < 3 ||
        String(log.topics[0]).toLowerCase() !== APPROVAL_TOPIC
      ) {
        hold("approval_log_topic_invalid");
      }
      const owner = decodeAddressWord(log.topics[1]);
      const spender = decodeAddressWord(log.topics[2]);
      pairs.set(`${owner}:${spender}`, { owner, spender });
    }
  }

  const nonzero = [];
  for (const pair of pairs.values()) {
    const data =
      ALLOWANCE_SELECTOR +
      encodeAddressArg(pair.owner) +
      encodeAddressArg(pair.spender);
    const amount = wordToBigInt(
      await callWord(
        rpcUrl,
        token,
        data,
        `0x${blockNumber.toString(16)}`,
      ),
    );
    if (amount !== 0n) {
      nonzero.push({
        owner: pair.owner,
        spender: pair.spender,
        amount_atoms: amount.toString(),
      });
    }
  }
  nonzero.sort((a, b) =>
    `${a.owner}:${a.spender}`.localeCompare(`${b.owner}:${b.spender}`),
  );
  return Object.freeze({
    discovered_approval_pair_count: pairs.size,
    nonzero_allowance_count: nonzero.length,
    nonzero_allowances: Object.freeze(nonzero),
  });
}

async function transferOwnershipAccessListV1(
  rpcUrl,
  token,
  owner,
  successorOwner,
  blockTag,
) {
  const result = await rpcCall(
    rpcUrl,
    "eth_createAccessList",
    [{
      from: lowerAddress(owner),
      to: lowerAddress(token),
      gas: "0x7a120",
      gasPrice: "0x0",
      value: "0x0",
      data:
        TRANSFER_OWNERSHIP_SELECTOR +
        encodeAddressArg(successorOwner),
    }, blockTag],
  );
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    hold("transfer_ownership_access_list_invalid");
  }
  if (!Array.isArray(result.accessList)) {
    hold("transfer_ownership_access_list_invalid");
  }
  const storageKeys = [];
  for (const entry of result.accessList) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      hold("transfer_ownership_access_list_entry_invalid");
    }
    if (lowerAddress(entry.address) !== lowerAddress(token)) continue;
    if (!Array.isArray(entry.storageKeys)) {
      hold("transfer_ownership_access_list_storage_keys_invalid");
    }
    for (const key of entry.storageKeys) {
      storageKeys.push(
        exactHexWord(key, "transfer_ownership_access_list_storage_key_invalid"),
      );
    }
  }
  const unique = [...new Set(storageKeys)].sort();
  if (unique.length < 1) {
    hold("transfer_ownership_access_list_token_storage_empty");
  }
  return Object.freeze({
    method: "eth_createAccessList",
    storage_keys: Object.freeze(unique),
    storage_key_count: unique.length,
    gas_used: String(result.gasUsed || ""),
    transaction_submission_performed: false,
    state_mutation_performed: false,
  });
}

export function classifyVoidEconomicEpoch2FrozenSourceObservationV1(
  observation,
  canonicalInputs,
) {
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
    lowerAddress(token.owner) !== canonicalInputs.legacy_owner
  ) {
    hold("voidtoken_observation_mismatch");
  }

  const observedHolders = new Map(
    token.holders.map((row) => [lowerAddress(row.address), String(row.balance_atoms)]),
  );
  if (observedHolders.size !== canonicalInputs.holders.length) {
    hold("voidtoken_holder_observation_count_mismatch");
  }
  for (const holder of canonicalInputs.holders) {
    if (observedHolders.get(holder.address) !== holder.balance_atoms) {
      hold("voidtoken_holder_balance_mismatch", { address: holder.address });
    }
  }
  const sum = [...observedHolders.values()]
    .reduce((acc, value) => acc + BigInt(value), 0n);
  if (sum.toString() !== EXPECTED_TOTAL_SUPPLY_ATOMS) {
    hold("voidtoken_holder_sum_mismatch");
  }

  const layout = token.storage_layout;
  for (const key of ["owner_slot", "total_supply_slot", "balance_mapping_slot"]) {
    if (!Number.isSafeInteger(layout?.[key]) || layout[key] < 0) {
      hold("voidtoken_storage_layout_incomplete", { key });
    }
  }
  if (
    new Set([
      layout.owner_slot,
      layout.total_supply_slot,
      layout.balance_mapping_slot,
    ]).size !== 3
  ) {
    hold("voidtoken_storage_layout_slot_collision");
  }
  if (
    !Array.isArray(layout.holder_storage) ||
    layout.holder_storage.length !== canonicalInputs.holders.length
  ) {
    hold("voidtoken_holder_storage_incomplete");
  }
  if (
    !Array.isArray(layout.owner_access_storage_keys) ||
    layout.owner_access_storage_keys.length < 1 ||
    !layout.owner_access_storage_keys.includes(slotWord(layout.owner_slot))
  ) {
    hold("voidtoken_owner_access_list_binding_missing");
  }

  if (
    observation.transfer_ownership_eth_call_supported !== true ||
    lowerAddress(observation.successor_owner_probe_address) !==
      canonicalInputs.successor_owner
  ) {
    hold("voidtoken_successor_owner_simulation_not_proven");
  }

  return Object.freeze({
    ok: true,
    status: "FROZEN_SOURCE_CENSUS_GREEN",
    marker: VOID_ECONOMIC_EPOCH2_FROZEN_SOURCE_CENSUS_V1,
    chain_id: EXPECTED_CHAIN_ID,
    block_number: EXPECTED_BLOCK_NUMBER,
    block_hash: EXPECTED_BLOCK_HASH,
    checkpoint_id_sha256: EXPECTED_CHECKPOINT_ID,
    state_sha256: EXPECTED_STATE_SHA256,
    void_token: EXPECTED_VOID_TOKEN,
    voidtoken_runtime_identity_verified: true,
    voidtoken_supply_semantics_verified: true,
    voidtoken_balance_semantics_verified: true,
    voidtoken_storage_layout_discovered: true,
    voidtoken_owner_rotation_simulation_verified: true,
    source_holder_sum_atoms: sum.toString(),
    source_nonzero_holder_count: observedHolders.size,
    source_nonzero_allowance_count:
      Number(observation.allowances?.nonzero_allowance_count || 0),
    authoritative_chain_mutation: false,
    token_movement: false,
    funds_movement: false,
    successor_built: false,
    migration_authorized: false,
  });
}

export async function runVoidEconomicEpoch2FrozenSourceCensusV1({
  root = process.cwd(),
  apply = false,
  confirmation = "",
} = {}) {
  const inputs = loadCanonicalInputs(root);
  const selector = inputs.selector;
  const baselineState = path.join(
    selector.deployment_root,
    selector.baseline.normalized_deployment_relative_path,
  );
  const isolatedRpcUrl = `http://127.0.0.1:${ISOLATED_RPC_PORT}/`;
  const derivedRoot = path.join(
    os.homedir(),
    ".local/state/void-economic-epoch2-frozen-source-census-v1/derived",
  );

  const dry = Object.freeze({
    marker: VOID_ECONOMIC_EPOCH2_FROZEN_SOURCE_CENSUS_V1,
    status: "PLAN_READY",
    source_block_number: EXPECTED_BLOCK_NUMBER,
    source_block_hash: EXPECTED_BLOCK_HASH,
    source_checkpoint_id_sha256: EXPECTED_CHECKPOINT_ID,
    source_state_sha256: EXPECTED_STATE_SHA256,
    source_void_token: EXPECTED_VOID_TOKEN,
    source_void_token_runtime_sha256: EXPECTED_VOID_TOKEN_RUNTIME_SHA256,
    isolated_rpc_url: isolatedRpcUrl,
    archive_checkpoint_root: ECONOMIC_GENESIS_ARCHIVE_ROOT,
    production_startup_checkpoint_root_used: false,
    production_rpc_listener_must_be_absent: true,
    exact_checkpoint_selection_required: true,
    storage_scan_slots: STORAGE_SCAN_SLOTS,
    approval_history_census: true,
    transfer_ownership_eth_call_simulation: true,
    authority: VOID_ECONOMIC_EPOCH2_FROZEN_SOURCE_CENSUS_AUTHORITY_V1,
    required_confirmation:
      VOID_ECONOMIC_EPOCH2_FROZEN_SOURCE_CENSUS_CONFIRMATION_V1,
  });
  if (!apply) return dry;
  if (
    confirmation !==
    VOID_ECONOMIC_EPOCH2_FROZEN_SOURCE_CENSUS_CONFIRMATION_V1
  ) {
    hold("explicit_confirmation_required", {
      required_confirmation:
        VOID_ECONOMIC_EPOCH2_FROZEN_SOURCE_CENSUS_CONFIRMATION_V1,
    });
  }

  if (await listenerPresent(SOURCE_RPC_PORT)) {
    hold("authoritative_epoch1_rpc_listener_present");
  }
  if (await listenerPresent(ISOLATED_RPC_PORT)) {
    hold("isolated_rpc_port_already_in_use");
  }

  const plan = buildVoidPrivateChain2050StartupPlanV1({
    anvil_executable:
      selector.runtime_seal_requirements.pinned_anvil_unit_path,
    anvil_executable_sha256:
      selector.runtime_seal_requirements.pinned_anvil_sha256,
    baseline_state: baselineState,
    baseline_state_sha256: selector.baseline.normalized_sha256,
    baseline_state_format: selector.baseline.normalized_format,
    baseline_block_number: selector.baseline.block_number,
    baseline_block_hash: selector.baseline.block_hash,
    checkpoint_root: ECONOMIC_GENESIS_ARCHIVE_ROOT,
    minimum_block_number: EXPECTED_BLOCK_NUMBER,
    derived_root: derivedRoot,
    rpc_url: isolatedRpcUrl,
    gas_limit: 200_000_000,
  });

  const selection = plan.selection;
  if (
    selection.selected_kind !== "checkpoint" ||
    selection.selected_block_number !== EXPECTED_BLOCK_NUMBER ||
    selection.selected_block_hash !== EXPECTED_BLOCK_HASH ||
    selection.selected_state_sha256 !== EXPECTED_STATE_SHA256 ||
    selection.selected_checkpoint_id_sha256 !== EXPECTED_CHECKPOINT_ID
  ) {
    hold("exact_frozen_checkpoint_not_selected", {
      selected_kind: selection.selected_kind,
      selected_block_number: selection.selected_block_number,
      selected_block_hash: selection.selected_block_hash,
      selected_state_sha256: selection.selected_state_sha256,
      selected_checkpoint_id_sha256: selection.selected_checkpoint_id_sha256,
    });
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
  const executable =
    revalidateVoidPrivateChain2050AnvilExecutableBeforeSpawnV1(plan);

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
  let childExited = false;
  let childExitCode = null;
  child.once("exit", (code) => {
    childExited = true;
    childExitCode = code;
  });

  try {
    const verified = await verifyVoidPrivateChain2050StartedStateV1(
      rpcUrl,
      selection,
      60_000,
      async (_url, method, params) =>
        await rpcCall(isolatedRpcUrl, method, params),
    );
    if (childExited) {
      hold("isolated_anvil_exited_before_census", { exit_code: childExitCode });
    }
    const blockTag = `0x${EXPECTED_BLOCK_NUMBER.toString(16)}`;

    const code = await rpcCall(
      isolatedRpcUrl,
      "eth_getCode",
      [EXPECTED_VOID_TOKEN, blockTag],
    );
    const runtimeSha256 = sha256Runtime(code);
    const totalSupply = wordToBigInt(
      await callWord(
        isolatedRpcUrl,
        EXPECTED_VOID_TOKEN,
        TOTAL_SUPPLY_SELECTOR,
        blockTag,
      ),
    );
    const owner = decodeAddressWord(
      await callWord(
        isolatedRpcUrl,
        EXPECTED_VOID_TOKEN,
        OWNER_SELECTOR,
        blockTag,
      ),
    );

    const holders = [];
    for (const holder of inputs.holders) {
      const balance = wordToBigInt(
        await callWord(
          isolatedRpcUrl,
          EXPECTED_VOID_TOKEN,
          BALANCE_SELECTOR + encodeAddressArg(holder.address),
          blockTag,
        ),
      );
      holders.push({
        label: holder.label,
        address: holder.address,
        balance_atoms: balance.toString(),
      });
    }

    const ownerAccessList = await transferOwnershipAccessListV1(
      isolatedRpcUrl,
      EXPECTED_VOID_TOKEN,
      owner,
      inputs.successor_owner,
      blockTag,
    );

    const allowances = await enumerateAllowances(
      isolatedRpcUrl,
      EXPECTED_VOID_TOKEN,
      EXPECTED_BLOCK_NUMBER,
    );
    const storageLayout =
      await discoverVoidEconomicEpoch2TokenStorageLayoutV1({
        readStorage: async (storageSlot) =>
          await rpcCall(
            isolatedRpcUrl,
            "eth_getStorageAt",
            [EXPECTED_VOID_TOKEN, storageSlot, blockTag],
          ),
        holders,
        totalSupplyAtoms: totalSupply.toString(),
        owner,
        ownerAccessStorageKeys: ownerAccessList.storage_keys,
        nonzeroAllowances: allowances.nonzero_allowances,
      });

    let transferOwnershipSupported = false;
    try {
      const result = await rpcCall(
        isolatedRpcUrl,
        "eth_call",
        [{
          from: owner,
          to: EXPECTED_VOID_TOKEN,
          data:
            TRANSFER_OWNERSHIP_SELECTOR +
            encodeAddressArg(inputs.successor_owner),
        }, blockTag],
      );
      transferOwnershipSupported =
        typeof result === "string" && /^0x[0-9a-fA-F]*$/.test(result);
    } catch {
      transferOwnershipSupported = false;
    }

    const observation = {
      chain_id: verified.chain_id,
      block_number: selection.selected_block_number,
      block_hash: selection.selected_block_hash,
      checkpoint_id_sha256: selection.selected_checkpoint_id_sha256,
      state_sha256: selection.selected_state_sha256,
      unlocked_account_count: verified.unlocked_account_count,
      void_token: {
        address: EXPECTED_VOID_TOKEN,
        runtime_sha256: runtimeSha256,
        total_supply_atoms: totalSupply.toString(),
        owner,
        holders,
        storage_layout: storageLayout,
      },
      allowances,
      owner_access_list: ownerAccessList,
      transfer_ownership_eth_call_supported: transferOwnershipSupported,
      successor_owner_probe_address: inputs.successor_owner,
    };
    const classification =
      classifyVoidEconomicEpoch2FrozenSourceObservationV1(
        observation,
        inputs,
      );
    const receiptMaterial = {
      marker: VOID_ECONOMIC_EPOCH2_FROZEN_SOURCE_CENSUS_V1,
      version: 1,
      status: classification.status,
      observation_class: "isolated_replay_read_only",
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
      allowances,
      owner_access_list: ownerAccessList,
      successor_owner_probe: {
        address: inputs.successor_owner,
        transfer_ownership_eth_call_supported: transferOwnershipSupported,
        mutation_performed: false,
      },
      classification,
      authority: VOID_ECONOMIC_EPOCH2_FROZEN_SOURCE_CENSUS_AUTHORITY_V1,
    };
    return Object.freeze({
      ...receiptMaterial,
      receipt_sha256: sha256Canonical(receiptMaterial),
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
      "Usage: node tools/void-economic-epoch2-frozen-source-census-v1.mjs [--apply --confirmation inspectFrozenEpoch1ForEpoch2OfflineBuild]\n",
    );
    return;
  }
  const result = await runVoidEconomicEpoch2FrozenSourceCensusV1({
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
      error instanceof VoidEconomicEpoch2FrozenSourceCensusHoldV1
        ? error.reason
        : String(error?.message || error);
    process.stderr.write(
      `VOID_ECONOMIC_EPOCH2_FROZEN_SOURCE_CENSUS_V1_HOLD reason=${reason}\n`,
    );
    process.exitCode = 2;
  });
}
