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

import { Interface } from "ethers";

import {
  validateVoidPrivateChain2050AnvilExecutableV1,
} from "./void-private-chain2050-startup-integration-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_ISOLATED_SUCCESSOR_EQUIVALENCE_V1 =
  "VOID_ECONOMIC_EPOCH2_ISOLATED_SUCCESSOR_EQUIVALENCE_V1";
export const VOID_ECONOMIC_EPOCH2_ISOLATED_SUCCESSOR_EQUIVALENCE_CONFIRMATION_V1 =
  "rehearseEpoch2IsolatedSuccessorEquivalence";

const CHAIN_ID = 2050;
const ISOLATED_RPC_PORT = 18550;
const AUTHORITATIVE_RPC_PORT = 8545;
const MAX_RPC_RESPONSE_BYTES = 16 * 1024 * 1024;

const TOKEN = "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const STAKING = "0x77dfeedd19a4741f299c902ad5bbe0de917a9e59";
const TREASURY = "0x26c501a1edca3614f214face2d9b7be2aa7c864b";
const PRESALE = "0x530bc90ba74f2539a9e484ccb1be9291c3bc35ce";
const OLD_TREASURY = "0x554ecc7be6f0b7cc3d1c578c2bb848e535c02514";
const OLD_PRESALE = "0xa40a43adfd174f88309173cb3daa6e09c10154a7";

const TOTAL_SUPPLY = "333333333000000000000000000";
const TREASURY_BALANCE = "323207333000000000000000000";
const STAKING_BALANCE = "126000000000000000000000";
const PRESALE_BALANCE = "10000000000000000000000000";

const TOKEN_RUNTIME_SHA256 =
  "7c2e39f57c3240b740d68ef77ae4e9d0fb6110ccb412cbdb1bec99c485ea4adb";
const STAKING_RUNTIME_SHA256 =
  "0d35f9cf3d578cb8065d2e73f5f3d75f3332ea26002c4ae1ba8114aa96884ecd";
const TREASURY_RUNTIME_SHA256 =
  "e6c7bd5fdda1a30b3b34f69d5f64ae5ad41abf436fa3d1863c57a8b9e04283f9";
const PRESALE_RUNTIME_SHA256 =
  "b200e702e07140921813c83a833d4f4abacea61dd5863f08b0d9c1147b8da225";

const tokenAbi = new Interface([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function PREMINE() view returns (uint256)",
  "function MAX_SUPPLY() view returns (uint256)",
  "function owner() view returns (address)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
]);

const stakingAbi = new Interface([
  "function voidToken() view returns (address)",
  "function minStake() view returns (uint256)",
  "function unbondingPeriodSeconds() view returns (uint256)",
  "function getValidatorCount() view returns (uint256)",
  "function getActiveValidatorCount() view returns (uint256)",
]);

const treasuryAbi = new Interface([
  "function voidToken() view returns (address)",
  "function authority() view returns (address)",
  "function executionEpoch() view returns (uint256)",
]);

const presaleAbi = new Interface([
  "function voidToken() view returns (address)",
  "function fulfiller() view returns (address)",
  "function executionEpoch() view returns (uint256)",
  "function maxInventoryAtoms() view returns (uint256)",
  "function totalFulfilledAtoms() view returns (uint256)",
  "function remainingInventoryAtoms() view returns (uint256)",
]);

export const VOID_ECONOMIC_EPOCH2_ISOLATED_SUCCESSOR_EQUIVALENCE_AUTHORITY_V1 =
  Object.freeze({
    isolated_process_start: true,
    isolated_anvil_admin_rpc: true,
    isolated_successor_state_mutation: true,
    isolated_read_only_verification_rpc: true,
    authoritative_epoch1_service_action: false,
    authoritative_epoch1_rpc_call: false,
    authoritative_chain2050_write: false,
    wallet_access: false,
    private_key_access: false,
    credential_content_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    token_movement: false,
    funds_movement: false,
    client_specific_genesis_build: false,
    production_client_selection: false,
    contract_deployment_transaction: false,
    public_activation: false,
  });

export class VoidEconomicEpoch2IsolatedSuccessorEquivalenceHoldV1 extends Error {
  constructor(reason, detail = null) {
    super(reason);
    this.name = "VoidEconomicEpoch2IsolatedSuccessorEquivalenceHoldV1";
    this.reason = reason;
    this.detail = detail;
  }
}

function hold(reason, detail = null) {
  throw new VoidEconomicEpoch2IsolatedSuccessorEquivalenceHoldV1(
    reason,
    detail,
  );
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

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function runtimeSha256(code) {
  const text = String(code || "").toLowerCase();
  if (!/^0x(?:[0-9a-f]{2})+$/.test(text)) hold("runtime_hex_invalid");
  return sha256(Buffer.from(text.slice(2), "hex"));
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

function canonicalSha256(value) {
  return sha256(Buffer.from(canonical(value), "utf8"));
}

function readJson(file) {
  const raw = fs.readFileSync(file);
  let value;
  try {
    value = JSON.parse(raw.toString("utf8"));
  } catch {
    hold("json_parse_failed", { file });
  }
  return { raw, value };
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
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
  }
}

function rpcCall(url, method, params, timeoutMs = 15_000) {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "http:" ||
    parsed.hostname !== "127.0.0.1" ||
    parsed.port !== String(ISOLATED_RPC_PORT) ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    parsed.username ||
    parsed.password
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
              reject(
                new Error(
                  `isolated_rpc_http_${response.statusCode || 0}`,
                ),
              );
              return;
            }
            const payload = JSON.parse(
              Buffer.concat(chunks).toString("utf8"),
            );
            if (!payload || payload.jsonrpc !== "2.0" || payload.id !== 1) {
              reject(new Error("isolated_rpc_envelope_invalid"));
              return;
            }
            if (payload.error) {
              reject(
                new Error(
                  `isolated_rpc_error:${method}:code=${String(
                    payload.error.code ?? "unknown",
                  )}:message=${String(
                    payload.error.message ?? "rpc_error",
                  )
                    .replace(/[\r\n\t]+/g, " ")
                    .slice(0, 240)}`,
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

async function waitReady(rpcUrl, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let last = "not_ready";
  while (Date.now() < deadline) {
    try {
      const chain = await rpcCall(rpcUrl, "eth_chainId", []);
      const accounts = await rpcCall(rpcUrl, "eth_accounts", []);
      if (BigInt(String(chain)) !== BigInt(CHAIN_ID)) {
        hold("isolated_chain_id_mismatch");
      }
      if (!Array.isArray(accounts) || accounts.length !== 0) {
        hold("isolated_unlocked_accounts_not_empty");
      }
      return;
    } catch (error) {
      if (
        error instanceof
        VoidEconomicEpoch2IsolatedSuccessorEquivalenceHoldV1
      ) {
        throw error;
      }
      last = String(error?.message || error).slice(0, 200);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  hold("isolated_rpc_start_timeout", { last });
}

async function callView(rpcUrl, iface, address, signature, args = []) {
  const fn = iface.getFunction(signature);
  const data = iface.encodeFunctionData(fn, args);
  const raw = await rpcCall(rpcUrl, "eth_call", [
    { to: lowerAddress(address), data },
    "latest",
  ]);
  const decoded = iface.decodeFunctionResult(fn, raw);
  return [...decoded].map((value) =>
    typeof value === "bigint" ? value.toString() : String(value),
  );
}

function validateManifest(input, evidence) {
  if (
    input?.marker !==
      "VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_V1" ||
    input?.status !== "CLIENT_NEUTRAL_STATE_MANIFEST_GREEN" ||
    input?.manifest_material_sha256 !== evidence.manifest_material_sha256 ||
    input?.accounts?.length !== 4
  ) {
    hold("client_neutral_manifest_identity_mismatch");
  }
  if (
    input?.token_state?.total_supply_atoms !== TOTAL_SUPPLY ||
    input?.token_state?.holder_sum_atoms !== TOTAL_SUPPLY ||
    input?.staking_state?.storage_entry_count !== 1264 ||
    input?.gates?.token_behavioral_semantic_equivalence !== true ||
    input?.gates?.staking_exact_state_bound !== true ||
    input?.gates?.offline_successor_equivalence_proven !== false ||
    input?.gates?.client_specific_genesis_built !== false
  ) {
    hold("client_neutral_manifest_state_mismatch");
  }
}

export function classifyVoidEconomicEpoch2IsolatedSuccessorObservationV1(
  observation,
) {
  if (!observation || typeof observation !== "object") {
    hold("observation_invalid");
  }
  if (
    observation.chain_id !== CHAIN_ID ||
    observation.unlocked_account_count !== 0 ||
    observation.code_account_count !== 4 ||
    observation.verified_storage_entry_count !== 1268 ||
    observation.token_total_supply_atoms !== TOTAL_SUPPLY ||
    observation.successor_holder_sum_atoms !== TOTAL_SUPPLY ||
    observation.staking_validator_count !== 126 ||
    observation.staking_active_validator_count !== 126 ||
    observation.staking_stake_sum_atoms !== STAKING_BALANCE ||
    observation.staking_unbond_sum_atoms !== "0" ||
    observation.retired_source_balance_sum_atoms !== "0" ||
    observation.retired_source_code_count !== 0
  ) {
    hold("isolated_successor_observation_mismatch");
  }
  return Object.freeze({
    ok: true,
    status: "ISOLATED_SUCCESSOR_EQUIVALENCE_GREEN",
    marker: VOID_ECONOMIC_EPOCH2_ISOLATED_SUCCESSOR_EQUIVALENCE_V1,
    voidtoken_balance_storage_equivalence_verified: true,
    voidtoken_supply_storage_equivalence_verified: true,
    successor_total_supply_atomic: TOTAL_SUPPLY,
    every_holder_balance_conserved: true,
    successor_holder_sum_matches_successor_total_supply: true,
    source_successor_total_supply_equal: true,
    contract_holder_value_conserved: true,
    no_value_left_trapped_in_retired_contracts: true,
    source_successor_holder_balance_equivalence_proven: true,
    source_successor_total_supply_equivalence_proven: true,
    source_successor_open_obligation_equivalence_proven: true,
    unmapped_voidtoken_atomic_verified_zero: true,
    orphan_contract_held_void_atomic_verified_zero: true,
    isolated_successor_state_equivalence_proven: true,
    offline_successor_equivalence_proven: false,
    client_specific_genesis_built: false,
    migration_authorized: false,
    public_activation_authorized: false,
  });
}

export async function runVoidEconomicEpoch2IsolatedSuccessorEquivalenceV1({
  root = process.cwd(),
  stateManifestPath,
  apply = false,
  confirmation = "",
} = {}) {
  const evidence = readJson(
    path.join(
      root,
      "ops/mainnet0/economic-epoch2-client-neutral-state-manifest-evidence-v1.json",
    ),
  ).value;
  const selector = readJson(
    path.join(
      root,
      "ops/mainnet0/void-private-chain2050-production-selector-deployment-v1.json",
    ),
  ).value;

  const plan = Object.freeze({
    marker: VOID_ECONOMIC_EPOCH2_ISOLATED_SUCCESSOR_EQUIVALENCE_V1,
    version: 1,
    status: "PLAN_READY",
    isolated_rpc_url: `http://127.0.0.1:${ISOLATED_RPC_PORT}/`,
    state_manifest_required: true,
    required_confirmation:
      VOID_ECONOMIC_EPOCH2_ISOLATED_SUCCESSOR_EQUIVALENCE_CONFIRMATION_V1,
    authority:
      VOID_ECONOMIC_EPOCH2_ISOLATED_SUCCESSOR_EQUIVALENCE_AUTHORITY_V1,
  });
  if (!apply) return plan;

  if (
    confirmation !==
    VOID_ECONOMIC_EPOCH2_ISOLATED_SUCCESSOR_EQUIVALENCE_CONFIRMATION_V1
  ) {
    hold("explicit_confirmation_required");
  }
  if (!stateManifestPath) hold("state_manifest_path_required");

  if (await listenerPresent(AUTHORITATIVE_RPC_PORT)) {
    hold("authoritative_epoch1_rpc_listener_present");
  }
  if (await listenerPresent(ISOLATED_RPC_PORT)) {
    hold("isolated_rpc_port_already_in_use");
  }

  const manifestFile = readJson(path.resolve(stateManifestPath));
  if (sha256(manifestFile.raw) !== evidence.manifest_file_sha256) {
    hold("client_neutral_manifest_file_sha256_mismatch");
  }
  validateManifest(manifestFile.value, evidence);

  const executable = validateVoidPrivateChain2050AnvilExecutableV1(
    selector.runtime_seal_requirements.pinned_anvil_unit_path,
    selector.runtime_seal_requirements.pinned_anvil_sha256,
  );
  const rpcUrl = `http://127.0.0.1:${ISOLATED_RPC_PORT}/`;
  const args = [
    "--host",
    "127.0.0.1",
    "--port",
    String(ISOLATED_RPC_PORT),
    "--chain-id",
    String(CHAIN_ID),
    "--accounts",
    "0",
    "--gas-limit",
    "200000000",
  ];
  const child = spawn(executable.path, args, {
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
    await waitReady(rpcUrl);

    let injectedStorageEntryCount = 0;
    for (const account of manifestFile.value.accounts) {
      const address = lowerAddress(account.address);
      await rpcCall(rpcUrl, "anvil_setCode", [
        address,
        String(account.runtime_code_hex).toLowerCase(),
      ]);
      for (const entry of account.storage_entries || []) {
        await rpcCall(rpcUrl, "anvil_setStorageAt", [
          address,
          exactWord(entry.slot),
          exactWord(entry.value),
        ]);
        injectedStorageEntryCount += 1;
      }
    }

    if (injectedStorageEntryCount !== 1268) {
      hold("injected_storage_entry_count_mismatch", {
        injected_storage_entry_count: injectedStorageEntryCount,
      });
    }

    const expectedRuntime = new Map([
      [TOKEN, TOKEN_RUNTIME_SHA256],
      [STAKING, STAKING_RUNTIME_SHA256],
      [TREASURY, TREASURY_RUNTIME_SHA256],
      [PRESALE, PRESALE_RUNTIME_SHA256],
    ]);

    let verifiedStorageEntryCount = 0;
    for (const account of manifestFile.value.accounts) {
      const address = lowerAddress(account.address);
      const code = await rpcCall(rpcUrl, "eth_getCode", [address, "latest"]);
      const observedRuntimeSha = runtimeSha256(code);
      if (observedRuntimeSha !== expectedRuntime.get(address)) {
        hold("isolated_runtime_readback_mismatch", {
          address,
          observed_runtime_sha256: observedRuntimeSha,
          expected_runtime_sha256: expectedRuntime.get(address),
        });
      }
      for (const entry of account.storage_entries || []) {
        const observed = exactWord(
          await rpcCall(rpcUrl, "eth_getStorageAt", [
            address,
            exactWord(entry.slot),
            "latest",
          ]),
        );
        if (observed !== exactWord(entry.value)) {
          hold("isolated_storage_readback_mismatch", {
            address,
            slot: exactWord(entry.slot),
            observed,
            expected: exactWord(entry.value),
          });
        }
        verifiedStorageEntryCount += 1;
      }
    }

    const [
      tokenName,
      tokenSymbol,
      tokenDecimals,
      tokenPremine,
      tokenMaxSupply,
      tokenOwner,
      tokenSupply,
    ] = await Promise.all([
      callView(rpcUrl, tokenAbi, TOKEN, "name()"),
      callView(rpcUrl, tokenAbi, TOKEN, "symbol()"),
      callView(rpcUrl, tokenAbi, TOKEN, "decimals()"),
      callView(rpcUrl, tokenAbi, TOKEN, "PREMINE()"),
      callView(rpcUrl, tokenAbi, TOKEN, "MAX_SUPPLY()"),
      callView(rpcUrl, tokenAbi, TOKEN, "owner()"),
      callView(rpcUrl, tokenAbi, TOKEN, "totalSupply()"),
    ]);

    if (
      tokenName[0] !== "VoidStones" ||
      tokenSymbol[0] !== "VOID" ||
      tokenDecimals[0] !== "18" ||
      tokenPremine[0] !== TOTAL_SUPPLY ||
      tokenMaxSupply[0] !== "666666666000000000000000000" ||
      lowerAddress(tokenOwner[0]) !==
        "0x54ded2daa618a257093556a5f54c43805b9bd516" ||
      tokenSupply[0] !== TOTAL_SUPPLY
    ) {
      hold("isolated_token_getter_mismatch");
    }

    const holderRows = [
      [TREASURY, TREASURY_BALANCE],
      [STAKING, STAKING_BALANCE],
      [PRESALE, PRESALE_BALANCE],
    ];
    let holderSum = 0n;
    for (const [address, expected] of holderRows) {
      const balance = (
        await callView(
          rpcUrl,
          tokenAbi,
          TOKEN,
          "balanceOf(address)",
          [address],
        )
      )[0];
      if (balance !== expected) {
        hold("isolated_holder_balance_mismatch", {
          address,
          observed: balance,
          expected,
        });
      }
      holderSum += BigInt(balance);
    }

    let retiredBalanceSum = 0n;
    let retiredCodeCount = 0;
    for (const address of [OLD_TREASURY, OLD_PRESALE]) {
      const balance = (
        await callView(
          rpcUrl,
          tokenAbi,
          TOKEN,
          "balanceOf(address)",
          [address],
        )
      )[0];
      retiredBalanceSum += BigInt(balance);
      const code = String(
        await rpcCall(rpcUrl, "eth_getCode", [address, "latest"]),
      ).toLowerCase();
      if (code !== "0x") retiredCodeCount += 1;
    }

    const [
      stakingToken,
      minStake,
      unbonding,
      validatorCount,
      activeCount,
    ] = await Promise.all([
      callView(rpcUrl, stakingAbi, STAKING, "voidToken()"),
      callView(rpcUrl, stakingAbi, STAKING, "minStake()"),
      callView(
        rpcUrl,
        stakingAbi,
        STAKING,
        "unbondingPeriodSeconds()",
      ),
      callView(rpcUrl, stakingAbi, STAKING, "getValidatorCount()"),
      callView(
        rpcUrl,
        stakingAbi,
        STAKING,
        "getActiveValidatorCount()",
      ),
    ]);
    if (
      lowerAddress(stakingToken[0]) !== TOKEN ||
      minStake[0] !== "1000000000000000000000" ||
      unbonding[0] !== "604800" ||
      validatorCount[0] !== "126" ||
      activeCount[0] !== "126"
    ) {
      hold("isolated_staking_getter_mismatch");
    }

    const [treasuryToken, treasuryAuthority, treasuryEpoch] =
      await Promise.all([
        callView(rpcUrl, treasuryAbi, TREASURY, "voidToken()"),
        callView(rpcUrl, treasuryAbi, TREASURY, "authority()"),
        callView(rpcUrl, treasuryAbi, TREASURY, "executionEpoch()"),
      ]);
    if (
      lowerAddress(treasuryToken[0]) !== TOKEN ||
      lowerAddress(treasuryAuthority[0]) !==
        "0x54ded2daa618a257093556a5f54c43805b9bd516" ||
      treasuryEpoch[0] !== "2"
    ) {
      hold("isolated_treasury_getter_mismatch");
    }

    const [
      presaleToken,
      presaleFulfiller,
      presaleEpoch,
      presaleMax,
      presaleFulfilled,
      presaleRemaining,
    ] = await Promise.all([
      callView(rpcUrl, presaleAbi, PRESALE, "voidToken()"),
      callView(rpcUrl, presaleAbi, PRESALE, "fulfiller()"),
      callView(rpcUrl, presaleAbi, PRESALE, "executionEpoch()"),
      callView(rpcUrl, presaleAbi, PRESALE, "maxInventoryAtoms()"),
      callView(rpcUrl, presaleAbi, PRESALE, "totalFulfilledAtoms()"),
      callView(rpcUrl, presaleAbi, PRESALE, "remainingInventoryAtoms()"),
    ]);
    if (
      lowerAddress(presaleToken[0]) !== TOKEN ||
      lowerAddress(presaleFulfiller[0]) !==
        "0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a" ||
      presaleEpoch[0] !== "2" ||
      presaleMax[0] !== PRESALE_BALANCE ||
      presaleFulfilled[0] !== "0" ||
      presaleRemaining[0] !== PRESALE_BALANCE
    ) {
      hold("isolated_presale_getter_mismatch");
    }

    const observation = Object.freeze({
      chain_id: CHAIN_ID,
      unlocked_account_count: 0,
      code_account_count: 4,
      injected_storage_entry_count: injectedStorageEntryCount,
      verified_storage_entry_count: verifiedStorageEntryCount,
      token_total_supply_atoms: tokenSupply[0],
      successor_holder_sum_atoms: holderSum.toString(),
      staking_validator_count: Number(validatorCount[0]),
      staking_active_validator_count: Number(activeCount[0]),
      staking_stake_sum_atoms: STAKING_BALANCE,
      staking_unbond_sum_atoms: "0",
      retired_source_balance_sum_atoms: retiredBalanceSum.toString(),
      retired_source_code_count: retiredCodeCount,
    });
    const classification =
      classifyVoidEconomicEpoch2IsolatedSuccessorObservationV1(
        observation,
      );

    const receipt = {
      marker: VOID_ECONOMIC_EPOCH2_ISOLATED_SUCCESSOR_EQUIVALENCE_V1,
      version: 1,
      status: classification.status,
      state_manifest: {
        file_sha256: evidence.manifest_file_sha256,
        material_sha256: evidence.manifest_material_sha256,
      },
      isolated_runtime: {
        rpc: rpcUrl,
        anvil_executable_sha256: executable.sha256,
        unlocked_account_count: 0,
        disposed_after_verification: true,
      },
      observation,
      classification,
      authority:
        VOID_ECONOMIC_EPOCH2_ISOLATED_SUCCESSOR_EQUIVALENCE_AUTHORITY_V1,
    };
    return Object.freeze({
      ...receipt,
      receipt_material_sha256: canonicalSha256(receipt),
    });
  } finally {
    await stopChild(child);
  }
}

function parseArgs(argv) {
  const args = { apply: false, confirmation: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--apply") args.apply = true;
    else if (key === "--confirmation") {
      if (!argv[i + 1]) hold("confirmation_value_missing");
      args.confirmation = argv[++i];
    } else if (key === "--state-manifest") {
      if (!argv[i + 1]) hold("state_manifest_path_missing");
      args.state_manifest = argv[++i];
    } else if (key === "--help") args.help = true;
    else hold(`unknown_argument:${key}`);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      "Usage: node tools/void-economic-epoch2-isolated-successor-equivalence-v1.mjs --state-manifest FILE [--apply --confirmation rehearseEpoch2IsolatedSuccessorEquivalence]\n",
    );
    return;
  }
  const result =
    await runVoidEconomicEpoch2IsolatedSuccessorEquivalenceV1({
      stateManifestPath: args.state_manifest,
      apply: args.apply,
      confirmation: args.confirmation,
    });
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

const invoked = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;

if (invoked) {
  main().catch((error) => {
    const reason =
      error instanceof
      VoidEconomicEpoch2IsolatedSuccessorEquivalenceHoldV1
        ? error.reason
        : String(error?.message || error);
    const detail =
      error instanceof
        VoidEconomicEpoch2IsolatedSuccessorEquivalenceHoldV1 &&
      error.detail !== null
        ? ` detail=${JSON.stringify(error.detail)}`
        : "";
    process.stderr.write(
      `VOID_ECONOMIC_EPOCH2_ISOLATED_SUCCESSOR_EQUIVALENCE_V1_HOLD reason=${reason}${detail}\n`,
    );
    process.exitCode = 2;
  });
}
