#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import crypto from "node:crypto";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  AbiCoder,
  Interface,
  getAddress,
  keccak256,
  toBeHex,
} from "ethers";

import {
  buildVoidPrivateChain2050AnvilArgsV1,
  buildVoidPrivateChain2050StartupPlanV1,
  materializeVoidPrivateChain2050CliStateV1,
  revalidateVoidPrivateChain2050AnvilExecutableBeforeSpawnV1,
  verifyVoidPrivateChain2050StartedStateV1,
} from "./void-private-chain2050-startup-integration-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_STAKING_STATE_EXPORT_V1 =
  "VOID_ECONOMIC_EPOCH2_STAKING_STATE_EXPORT_V1";
export const VOID_ECONOMIC_EPOCH2_STAKING_STATE_EXPORT_CONFIRMATION_V1 =
  "exportFrozenEpoch1StakingStateForEpoch2OfflineBuild";

const EXPECTED_CHAIN_ID = 2050;
const EXPECTED_BLOCK_NUMBER = 37392;
const EXPECTED_BLOCK_HASH =
  "0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52";
const EXPECTED_CHECKPOINT_ID =
  "c251d3d92a0f3729f008fb7911243da0e4e2939af73f98fab2234a050c95a906";
const EXPECTED_STATE_SHA256 =
  "94b25d36990d32616a7328f5419f5075fee757c15a955617c79ef30497a14505";
const EXPECTED_STAKING =
  "0x77dfeedd19a4741f299c902ad5bbe0de917a9e59";
const EXPECTED_STAKING_RUNTIME_SHA256 =
  "0d35f9cf3d578cb8065d2e73f5f3d75f3332ea26002c4ae1ba8114aa96884ecd";
const EXPECTED_VOID_TOKEN =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const EXPECTED_MIN_STAKE_ATOMS =
  "1000000000000000000000";
const EXPECTED_UNBONDING_SECONDS = "604800";
const EXPECTED_VALIDATOR_COUNT = 126;
const EXPECTED_ACTIVE_VALIDATOR_COUNT = 126;
const EXPECTED_STAKE_SUM_ATOMS =
  "126000000000000000000000";
const SOURCE_RPC_PORT = 8545;
const ISOLATED_RPC_PORT = 18549;
const MAX_RPC_RESPONSE_BYTES = 8 * 1024 * 1024;
const ARCHIVE_ROOT = path.join(
  os.homedir(),
  ".local/state/void-economic-genesis-archive-v1/block-37392-final-candidate-v1",
);

const abi = new Interface([
  "function voidToken() view returns (address)",
  "function minStake() view returns (uint256)",
  "function unbondingPeriodSeconds() view returns (uint256)",
  "function getValidatorCount() view returns (uint256)",
  "function getActiveValidatorCount() view returns (uint256)",
  "function getActiveValidatorAt(uint256) view returns (address)",
  "function getValidator(address) view returns ((address reward,address controller,bytes32 consensusKey,uint256 stakeVOID,bool active,bool pendingActivation,bool pendingExit,bool jailed,uint256 unbondAmount,uint256 unbondReadyAt))",
  "function controllerToReward(address) view returns (address)",
]);

const coder = AbiCoder.defaultAbiCoder();

export const VOID_ECONOMIC_EPOCH2_STAKING_STATE_EXPORT_AUTHORITY_V1 =
  Object.freeze({
    authoritative_epoch1_service_action: false,
    authoritative_epoch1_rpc_call: false,
    authoritative_chain2050_write: false,
    isolated_replay_only: true,
    isolated_state_materialization: true,
    isolated_process_start: true,
    isolated_read_only_rpc: true,
    isolated_staking_state_export: true,
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

export class VoidEconomicEpoch2StakingStateExportHoldV1 extends Error {
  constructor(reason, detail = null) {
    super(reason);
    this.name = "VoidEconomicEpoch2StakingStateExportHoldV1";
    this.reason = reason;
    this.detail = detail;
  }
}

function hold(reason, detail = null) {
  throw new VoidEconomicEpoch2StakingStateExportHoldV1(reason, detail);
}

function lowerAddress(value, reason = "address_invalid") {
  const text = String(value || "").toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(text)) hold(reason, { value: text });
  return text;
}

function exactWord(value, reason = "word_invalid") {
  const text = String(value || "").toLowerCase();
  const hex = text.startsWith("0x") ? text.slice(2) : text;
  if (!/^[0-9a-f]{1,64}$/.test(hex)) hold(reason, { value: text });
  return `0x${hex.padStart(64, "0")}`;
}

function word256(value) {
  const n = BigInt(value);
  if (n < 0n || n >= (1n << 256n)) hold("word256_out_of_range");
  return toBeHex(n, 32).toLowerCase();
}

function addWord(baseWord, offset) {
  return word256(BigInt(exactWord(baseWord)) + BigInt(offset));
}

function wordAddress(address) {
  return word256(BigInt(lowerAddress(address)));
}

function addressFromWord(value, reason = "storage_address_word_invalid") {
  const word = exactWord(value, reason);
  const body = word.slice(2);
  if (!/^0{24}[0-9a-f]{40}$/.test(body)) hold(reason, { value: word });
  return `0x${body.slice(-40)}`;
}

export function voidEconomicEpoch2StakingMappingBaseV1(address, slot) {
  return keccak256(
    coder.encode(["address", "uint256"], [lowerAddress(address), BigInt(slot)]),
  ).toLowerCase();
}

export function voidEconomicEpoch2DynamicArrayElementSlotV1(slot, index) {
  const root = BigInt(keccak256(word256(slot)));
  return word256(root + BigInt(index));
}

export function decodeVoidEconomicEpoch2ValidatorFlagsV1(value) {
  const n = BigInt(exactWord(value, "validator_flags_word_invalid"));
  if ((n >> 32n) !== 0n) hold("validator_flags_upper_bits_nonzero");
  const bytes = [0n, 8n, 16n, 24n].map((shift) => Number((n >> shift) & 0xffn));
  if (bytes.some((v) => v !== 0 && v !== 1)) {
    hold("validator_flags_bool_encoding_invalid", { bytes });
  }
  return Object.freeze({
    active: bytes[0] === 1,
    pending_activation: bytes[1] === 1,
    pending_exit: bytes[2] === 1,
    jailed: bytes[3] === 1,
  });
}

function sha256Runtime(code) {
  const text = String(code || "").toLowerCase();
  if (!/^0x(?:[0-9a-f]{2})+$/.test(text)) hold("runtime_code_invalid");
  return crypto
    .createHash("sha256")
    .update(Buffer.from(text.slice(2), "hex"))
    .digest("hex");
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

function sha256Canonical(value) {
  return crypto
    .createHash("sha256")
    .update(Buffer.from(canonical(value), "utf8"))
    .digest("hex");
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
  return String(error?.message || error)
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 320);
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
            if (!payload || payload.jsonrpc !== "2.0" || payload.id !== 1) {
              reject(new Error("isolated_rpc_envelope_invalid"));
              return;
            }
            if (payload.error) {
              const code = String(payload.error?.code ?? "unknown");
              const message = String(payload.error?.message ?? "rpc_error")
                .replace(/[\r\n\t]+/g, " ")
                .slice(0, 240);
              reject(
                new Error(
                  `isolated_rpc_error:${method}:code=${code}:message=${message}`,
                ),
              );
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
      },
    );
    request.on("timeout", () =>
      request.destroy(new Error("isolated_rpc_timeout")),
    );
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

async function callView(rpcUrl, signature, args, blockTag) {
  const fn = abi.getFunction(signature);
  const data = abi.encodeFunctionData(fn, args);
  const raw = await rpcCall(rpcUrl, "eth_call", [
    { to: EXPECTED_STAKING, data },
    blockTag,
  ]);
  const decoded = abi.decodeFunctionResult(fn, raw);
  return normalize([...decoded]);
}

async function readStorage(rpcUrl, slot, blockTag) {
  const raw = await rpcCall(rpcUrl, "eth_getStorageAt", [
    EXPECTED_STAKING,
    exactWord(slot),
    blockTag,
  ]);
  return exactWord(raw, "staking_storage_word_invalid");
}

async function mapWithConcurrency(items, concurrency, fn) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      output[index] = await fn(items[index], index);
    }
  }
  const count = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: count }, () => worker()));
  return output;
}

function addStorageEntry(map, slot, value, reason = "staking_storage_conflict") {
  const key = exactWord(slot);
  const word = exactWord(value);
  const existing = map.get(key);
  if (existing && existing !== word) hold(reason, { slot: key, existing, word });
  map.set(key, word);
}

function compareValidatorRawToGetter(raw, getter, reward) {
  const expectedReward = lowerAddress(getter.reward);
  const expectedController = lowerAddress(getter.controller);
  const expectedConsensusKey = exactWord(getter.consensus_key);
  const expectedStake = String(getter.stake_atoms);
  const expectedUnbond = String(getter.unbond_amount_atoms);
  const expectedReadyAt = String(getter.unbond_ready_at);

  if (lowerAddress(reward) !== expectedReward) hold("validator_reward_identity_mismatch");
  if (addressFromWord(raw.reward) !== expectedReward) hold("validator_reward_storage_mismatch");
  if (addressFromWord(raw.controller) !== expectedController) hold("validator_controller_storage_mismatch");
  if (raw.consensus_key !== expectedConsensusKey) hold("validator_consensus_key_storage_mismatch");
  if (BigInt(raw.stake).toString() !== expectedStake) hold("validator_stake_storage_mismatch");
  if (BigInt(raw.unbond_amount).toString() !== expectedUnbond) hold("validator_unbond_storage_mismatch");
  if (BigInt(raw.unbond_ready_at).toString() !== expectedReadyAt) hold("validator_unbond_ready_storage_mismatch");

  const flags = decodeVoidEconomicEpoch2ValidatorFlagsV1(raw.flags);
  if (
    flags.active !== getter.active ||
    flags.pending_activation !== getter.pending_activation ||
    flags.pending_exit !== getter.pending_exit ||
    flags.jailed !== getter.jailed
  ) {
    hold("validator_flags_storage_mismatch", {
      reward: expectedReward,
      flags,
      getter,
    });
  }
  return flags;
}

export function classifyVoidEconomicEpoch2StakingStateObservationV1(observation) {
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
  const staking = observation.staking;
  if (
    !staking ||
    lowerAddress(staking.address) !== EXPECTED_STAKING ||
    staking.runtime_sha256 !== EXPECTED_STAKING_RUNTIME_SHA256 ||
    lowerAddress(staking.void_token) !== EXPECTED_VOID_TOKEN ||
    String(staking.min_stake_atoms) !== EXPECTED_MIN_STAKE_ATOMS ||
    String(staking.unbonding_period_seconds) !== EXPECTED_UNBONDING_SECONDS ||
    staking.validator_count !== EXPECTED_VALIDATOR_COUNT ||
    staking.active_validator_count !== EXPECTED_ACTIVE_VALIDATOR_COUNT ||
    String(staking.stake_sum_atoms) !== EXPECTED_STAKE_SUM_ATOMS ||
    String(staking.unbond_sum_atoms) !== "0"
  ) {
    hold("staking_observation_mismatch");
  }
  if (
    !Array.isArray(staking.validators) ||
    staking.validators.length !== EXPECTED_VALIDATOR_COUNT ||
    !Array.isArray(staking.all_validator_addresses) ||
    staking.all_validator_addresses.length !== EXPECTED_VALIDATOR_COUNT ||
    !Array.isArray(staking.active_validator_addresses) ||
    staking.active_validator_addresses.length !== EXPECTED_ACTIVE_VALIDATOR_COUNT
  ) {
    hold("staking_record_cardinality_mismatch");
  }
  if (
    !Array.isArray(staking.storage_entries) ||
    staking.storage_entries.length < 1 ||
    !Array.isArray(staking.nonzero_storage_entries) ||
    staking.nonzero_storage_entries.length < 1
  ) {
    hold("staking_storage_manifest_missing");
  }
  return Object.freeze({
    ok: true,
    status: "STAKING_STATE_EXPORT_GREEN",
    marker: VOID_ECONOMIC_EPOCH2_STAKING_STATE_EXPORT_V1,
    source_identity_verified: true,
    exact_runtime_exported: true,
    exact_known_storage_layout_exported: true,
    validator_count: staking.validator_count,
    active_validator_count: staking.active_validator_count,
    stake_sum_atoms: String(staking.stake_sum_atoms),
    unbond_sum_atoms: String(staking.unbond_sum_atoms),
    successor_state_built: false,
    migration_authorized: false,
  });
}

export async function runVoidEconomicEpoch2StakingStateExportV1({
  root = process.cwd(),
  apply = false,
  confirmation = "",
} = {}) {
  const snapshot = JSON.parse(
    await import("node:fs/promises").then(({ readFile }) =>
      readFile(
        path.join(root, "ops/mainnet0/economic-genesis-archive-final-snapshot-v1.json"),
        "utf8",
      ),
    ),
  );
  const selector = JSON.parse(
    await import("node:fs/promises").then(({ readFile }) =>
      readFile(
        path.join(root, "ops/mainnet0/void-private-chain2050-production-selector-deployment-v1.json"),
        "utf8",
      ),
    ),
  );

  if (
    snapshot.final_block_number !== String(EXPECTED_BLOCK_NUMBER) ||
    String(snapshot.final_block_hash).toLowerCase() !== EXPECTED_BLOCK_HASH ||
    String(snapshot.durable_archive_checkpoint?.checkpoint_id_sha256) !==
      EXPECTED_CHECKPOINT_ID ||
    String(snapshot.durable_archive_checkpoint?.state_sha256) !==
      EXPECTED_STATE_SHA256
  ) {
    hold("canonical_snapshot_identity_drift");
  }

  const plan = Object.freeze({
    marker: VOID_ECONOMIC_EPOCH2_STAKING_STATE_EXPORT_V1,
    version: 1,
    status: "PLAN_READY",
    source_block_number: EXPECTED_BLOCK_NUMBER,
    source_block_hash: EXPECTED_BLOCK_HASH,
    staking_address: EXPECTED_STAKING,
    isolated_rpc_url: `http://127.0.0.1:${ISOLATED_RPC_PORT}/`,
    archive_checkpoint_root: ARCHIVE_ROOT,
    storage_layout: Object.freeze({
      validators_by_reward_mapping_slot: 0,
      controller_to_reward_mapping_slot: 1,
      all_validators_array_slot: 2,
      active_validators_array_slot: 3,
      validator_struct_slots: 7,
      validator_flags_packed_slot_offset: 4,
    }),
    required_confirmation:
      VOID_ECONOMIC_EPOCH2_STAKING_STATE_EXPORT_CONFIRMATION_V1,
    authority: VOID_ECONOMIC_EPOCH2_STAKING_STATE_EXPORT_AUTHORITY_V1,
  });
  if (!apply) return plan;

  if (
    confirmation !==
    VOID_ECONOMIC_EPOCH2_STAKING_STATE_EXPORT_CONFIRMATION_V1
  ) {
    hold("explicit_confirmation_required", {
      required_confirmation:
        VOID_ECONOMIC_EPOCH2_STAKING_STATE_EXPORT_CONFIRMATION_V1,
    });
  }
  if (await listenerPresent(SOURCE_RPC_PORT)) {
    hold("authoritative_epoch1_rpc_listener_present");
  }
  if (await listenerPresent(ISOLATED_RPC_PORT)) {
    hold("isolated_rpc_port_already_in_use");
  }

  const baselineState = path.join(
    selector.deployment_root,
    selector.baseline.normalized_deployment_relative_path,
  );
  const isolatedRpcUrl = `http://127.0.0.1:${ISOLATED_RPC_PORT}/`;
  const derivedRoot = path.join(
    os.homedir(),
    ".local/state/void-economic-epoch2-staking-state-export-v1/derived",
  );
  const startup = buildVoidPrivateChain2050StartupPlanV1({
    anvil_executable: selector.runtime_seal_requirements.pinned_anvil_unit_path,
    anvil_executable_sha256:
      selector.runtime_seal_requirements.pinned_anvil_sha256,
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
  const executable =
    revalidateVoidPrivateChain2050AnvilExecutableBeforeSpawnV1(startup);
  const anvilArgs = buildVoidPrivateChain2050AnvilArgsV1(
    new URL(isolatedRpcUrl),
    cliState,
    null,
    200_000_000,
  );
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
      new URL(isolatedRpcUrl),
      selection,
      60_000,
      async (_url, method, params) =>
        await rpcCall(isolatedRpcUrl, method, params),
    );
    const blockTag = `0x${EXPECTED_BLOCK_NUMBER.toString(16)}`;

    const runtimeCode = String(
      await rpcCall(isolatedRpcUrl, "eth_getCode", [
        EXPECTED_STAKING,
        blockTag,
      ]),
    ).toLowerCase();
    const runtimeSha256 = sha256Runtime(runtimeCode);
    if (runtimeSha256 !== EXPECTED_STAKING_RUNTIME_SHA256) {
      hold("staking_runtime_hash_mismatch");
    }

    const [
      voidTokenDecoded,
      minStakeDecoded,
      unbondingDecoded,
      validatorCountDecoded,
      activeCountDecoded,
    ] = await Promise.all([
      callView(isolatedRpcUrl, "voidToken()", [], blockTag),
      callView(isolatedRpcUrl, "minStake()", [], blockTag),
      callView(isolatedRpcUrl, "unbondingPeriodSeconds()", [], blockTag),
      callView(isolatedRpcUrl, "getValidatorCount()", [], blockTag),
      callView(isolatedRpcUrl, "getActiveValidatorCount()", [], blockTag),
    ]);

    const voidToken = lowerAddress(voidTokenDecoded[0]);
    const minStake = String(minStakeDecoded[0]);
    const unbonding = String(unbondingDecoded[0]);
    const validatorCount = Number(validatorCountDecoded[0]);
    const activeCount = Number(activeCountDecoded[0]);

    if (
      voidToken !== EXPECTED_VOID_TOKEN ||
      minStake !== EXPECTED_MIN_STAKE_ATOMS ||
      unbonding !== EXPECTED_UNBONDING_SECONDS ||
      validatorCount !== EXPECTED_VALIDATOR_COUNT ||
      activeCount !== EXPECTED_ACTIVE_VALIDATOR_COUNT
    ) {
      hold("staking_getter_identity_mismatch");
    }

    const storage = new Map();
    const allLengthWord = await readStorage(
      isolatedRpcUrl,
      word256(2),
      blockTag,
    );
    const activeLengthWord = await readStorage(
      isolatedRpcUrl,
      word256(3),
      blockTag,
    );
    if (
      BigInt(allLengthWord) !== BigInt(validatorCount) ||
      BigInt(activeLengthWord) !== BigInt(activeCount)
    ) {
      hold("staking_array_length_storage_mismatch");
    }
    addStorageEntry(storage, word256(2), allLengthWord);
    addStorageEntry(storage, word256(3), activeLengthWord);

    const allIndexes = Array.from({ length: validatorCount }, (_, i) => i);
    const allValidatorWords = await mapWithConcurrency(
      allIndexes,
      24,
      async (index) => {
        const slot = voidEconomicEpoch2DynamicArrayElementSlotV1(2, index);
        const value = await readStorage(isolatedRpcUrl, slot, blockTag);
        addStorageEntry(storage, slot, value);
        return value;
      },
    );
    const allValidatorAddresses = allValidatorWords.map((word) =>
      addressFromWord(word, "all_validator_array_word_invalid"),
    );

    if (new Set(allValidatorAddresses).size !== validatorCount) {
      hold("all_validator_array_duplicate_address");
    }

    const activeIndexes = Array.from({ length: activeCount }, (_, i) => i);
    const activeValidatorWords = await mapWithConcurrency(
      activeIndexes,
      24,
      async (index) => {
        const slot = voidEconomicEpoch2DynamicArrayElementSlotV1(3, index);
        const value = await readStorage(isolatedRpcUrl, slot, blockTag);
        addStorageEntry(storage, slot, value);
        return value;
      },
    );
    const activeValidatorAddresses = activeValidatorWords.map((word) =>
      addressFromWord(word, "active_validator_array_word_invalid"),
    );

    const getterActiveAddresses = await mapWithConcurrency(
      activeIndexes,
      24,
      async (index) =>
        lowerAddress(
          (
            await callView(
              isolatedRpcUrl,
              "getActiveValidatorAt(uint256)",
              [BigInt(index)],
              blockTag,
            )
          )[0],
        ),
    );
    if (
      JSON.stringify(activeValidatorAddresses) !==
      JSON.stringify(getterActiveAddresses)
    ) {
      hold("active_validator_array_getter_mismatch");
    }

    let stakeSum = 0n;
    let unbondSum = 0n;
    let pendingActivationCount = 0;
    let pendingExitCount = 0;
    let jailedCount = 0;

    const validators = await mapWithConcurrency(
      allValidatorAddresses,
      16,
      async (reward) => {
        const getterRaw = await callView(
          isolatedRpcUrl,
          "getValidator(address)",
          [reward],
          blockTag,
        );
        const tuple = getterRaw[0];
        if (!tuple || typeof tuple !== "object") {
          hold("validator_getter_tuple_invalid", { reward });
        }
        const getter = Object.freeze({
          reward: lowerAddress(tuple.reward ?? tuple[0]),
          controller: lowerAddress(tuple.controller ?? tuple[1]),
          consensus_key: exactWord(tuple.consensusKey ?? tuple[2]),
          stake_atoms: String(tuple.stakeVOID ?? tuple[3]),
          active: Boolean(tuple.active ?? tuple[4]),
          pending_activation: Boolean(tuple.pendingActivation ?? tuple[5]),
          pending_exit: Boolean(tuple.pendingExit ?? tuple[6]),
          jailed: Boolean(tuple.jailed ?? tuple[7]),
          unbond_amount_atoms: String(tuple.unbondAmount ?? tuple[8]),
          unbond_ready_at: String(tuple.unbondReadyAt ?? tuple[9]),
        });

        const base = voidEconomicEpoch2StakingMappingBaseV1(reward, 0);
        const rawSlots = await Promise.all(
          Array.from({ length: 7 }, async (_, offset) => {
            const slot = addWord(base, offset);
            const value = await readStorage(isolatedRpcUrl, slot, blockTag);
            addStorageEntry(storage, slot, value);
            return { slot, value };
          }),
        );
        const raw = Object.freeze({
          reward: rawSlots[0].value,
          controller: rawSlots[1].value,
          consensus_key: rawSlots[2].value,
          stake: rawSlots[3].value,
          flags: rawSlots[4].value,
          unbond_amount: rawSlots[5].value,
          unbond_ready_at: rawSlots[6].value,
        });

        const flags = compareValidatorRawToGetter(raw, getter, reward);

        const controllerSlot = voidEconomicEpoch2StakingMappingBaseV1(
          getter.controller,
          1,
        );
        const controllerWord = await readStorage(
          isolatedRpcUrl,
          controllerSlot,
          blockTag,
        );
        addStorageEntry(storage, controllerSlot, controllerWord);
        if (
          addressFromWord(
            controllerWord,
            "controller_reverse_mapping_word_invalid",
          ) !== reward
        ) {
          hold("controller_reverse_mapping_storage_mismatch", { reward });
        }
        const controllerGetter = lowerAddress(
          (
            await callView(
              isolatedRpcUrl,
              "controllerToReward(address)",
              [getter.controller],
              blockTag,
            )
          )[0],
        );
        if (controllerGetter !== reward) {
          hold("controller_reverse_mapping_getter_mismatch", { reward });
        }

        stakeSum += BigInt(getter.stake_atoms);
        unbondSum += BigInt(getter.unbond_amount_atoms);
        if (getter.pending_activation) pendingActivationCount += 1;
        if (getter.pending_exit) pendingExitCount += 1;
        if (getter.jailed) jailedCount += 1;

        return Object.freeze({
          ...getter,
          flags_storage_decoded: flags,
          validators_mapping_base_slot: base,
          raw_struct_storage: Object.freeze(
            rawSlots.map(({ slot, value }) => ({ slot, value })),
          ),
          controller_reverse_mapping_slot: controllerSlot,
          controller_reverse_mapping_value: controllerWord,
        });
      },
    );

    if (
      stakeSum.toString() !== EXPECTED_STAKE_SUM_ATOMS ||
      unbondSum !== 0n ||
      pendingActivationCount !== 0 ||
      pendingExitCount !== 0 ||
      jailedCount !== 0 ||
      validators.some((row) => row.active !== true)
    ) {
      hold("staking_obligation_aggregate_mismatch", {
        stake_sum_atoms: stakeSum.toString(),
        unbond_sum_atoms: unbondSum.toString(),
        pending_activation_count: pendingActivationCount,
        pending_exit_count: pendingExitCount,
        jailed_count: jailedCount,
      });
    }

    if (
      JSON.stringify(activeValidatorAddresses) !==
      JSON.stringify(allValidatorAddresses)
    ) {
      hold("staking_active_and_all_validator_order_mismatch");
    }

    const storageEntries = [...storage.entries()]
      .map(([slot, value]) => Object.freeze({ slot, value }))
      .sort((a, b) => a.slot.localeCompare(b.slot));
    const nonzeroStorageEntries = storageEntries.filter(
      ({ value }) => BigInt(value) !== 0n,
    );

    const observation = Object.freeze({
      chain_id: verified.chain_id,
      block_number: selection.selected_block_number,
      block_hash: selection.selected_block_hash,
      checkpoint_id_sha256: selection.selected_checkpoint_id_sha256,
      state_sha256: selection.selected_state_sha256,
      unlocked_account_count: verified.unlocked_account_count,
      staking: Object.freeze({
        address: EXPECTED_STAKING,
        runtime_sha256: runtimeSha256,
        runtime_code_hex: runtimeCode,
        void_token: voidToken,
        min_stake_atoms: minStake,
        unbonding_period_seconds: unbonding,
        validator_count: validatorCount,
        active_validator_count: activeCount,
        pending_activation_count: pendingActivationCount,
        pending_exit_count: pendingExitCount,
        jailed_count: jailedCount,
        stake_sum_atoms: stakeSum.toString(),
        unbond_sum_atoms: unbondSum.toString(),
        all_validator_addresses: Object.freeze(allValidatorAddresses),
        active_validator_addresses: Object.freeze(activeValidatorAddresses),
        validators: Object.freeze(validators),
        storage_entries: Object.freeze(storageEntries),
        nonzero_storage_entries: Object.freeze(nonzeroStorageEntries),
      }),
    });
    const classification =
      classifyVoidEconomicEpoch2StakingStateObservationV1(observation);
    const receipt = {
      marker: VOID_ECONOMIC_EPOCH2_STAKING_STATE_EXPORT_V1,
      version: 1,
      status: classification.status,
      observation_class: "isolated_replay_exact_staking_state_export",
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
      staking: observation.staking,
      classification,
      authority: VOID_ECONOMIC_EPOCH2_STAKING_STATE_EXPORT_AUTHORITY_V1,
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
      "Usage: node tools/void-economic-epoch2-staking-state-export-v1.mjs [--apply --confirmation exportFrozenEpoch1StakingStateForEpoch2OfflineBuild]\n",
    );
    return;
  }
  const result = await runVoidEconomicEpoch2StakingStateExportV1({
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
      error instanceof VoidEconomicEpoch2StakingStateExportHoldV1
        ? error.reason
        : String(error?.message || error);
    const detail =
      error instanceof VoidEconomicEpoch2StakingStateExportHoldV1 &&
      error.detail !== null
        ? ` detail=${JSON.stringify(error.detail)}`
        : "";
    process.stderr.write(
      `VOID_ECONOMIC_EPOCH2_STAKING_STATE_EXPORT_V1_HOLD reason=${reason}${detail}\n`,
    );
    process.exitCode = 2;
  });
}
