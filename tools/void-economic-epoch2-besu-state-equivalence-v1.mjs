#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Interface } from "ethers";

export const VOID_ECONOMIC_EPOCH2_BESU_STATE_EQUIVALENCE_V1 =
  "VOID_ECONOMIC_EPOCH2_BESU_STATE_EQUIVALENCE_V1";
export const VOID_ECONOMIC_EPOCH2_BESU_STATE_EQUIVALENCE_CONFIRMATION_V1 =
  "verifyEpoch2BesuGenesisStateEquivalence";

const RPC_PORT = 18552;
const CHAIN_ID = 2050;
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

const EXPECTED_MANIFEST_FILE_SHA256 =
  "affe08799c73320c6fc4efe4a91772cc1c64f6a3ff6e75c2698ea87d27e306d9";
const EXPECTED_MANIFEST_MATERIAL_SHA256 =
  "286034e3adb1654c13899b959075fcfa2504a6942c83ec52febb156bd0ea2a4f";

const EXPECTED_RUNTIMES = Object.freeze({
  [TOKEN]:
    "7c2e39f57c3240b740d68ef77ae4e9d0fb6110ccb412cbdb1bec99c485ea4adb",
  [STAKING]:
    "0d35f9cf3d578cb8065d2e73f5f3d75f3332ea26002c4ae1ba8114aa96884ecd",
  [TREASURY]:
    "e6c7bd5fdda1a30b3b34f69d5f64ae5ad41abf436fa3d1863c57a8b9e04283f9",
  [PRESALE]:
    "b200e702e07140921813c83a833d4f4abacea61dd5863f08b0d9c1147b8da225",
});

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

export const VOID_ECONOMIC_EPOCH2_BESU_STATE_EQUIVALENCE_AUTHORITY_V1 =
  Object.freeze({
    local_manifest_read: true,
    local_besu_rpc_read: true,
    authoritative_epoch1_rpc_call: false,
    authoritative_chain2050_write: false,
    rpc_admin_mutation: false,
    wallet_access: false,
    private_key_access: false,
    credential_content_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    token_movement: false,
    funds_movement: false,
    contract_deployment_transaction: false,
    production_validator_set_binding: false,
    public_activation: false,
  });

export class VoidEconomicEpoch2BesuStateEquivalenceHoldV1 extends Error {
  constructor(reason, detail = null) {
    super(reason);
    this.name = "VoidEconomicEpoch2BesuStateEquivalenceHoldV1";
    this.reason = reason;
    this.detail = detail;
  }
}

function hold(reason, detail = null) {
  throw new VoidEconomicEpoch2BesuStateEquivalenceHoldV1(reason, detail);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
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

function runtimeSha256(code) {
  const text = String(code || "").toLowerCase();
  if (!/^0x(?:[0-9a-f]{2})+$/.test(text)) hold("runtime_hex_invalid");
  return sha256(Buffer.from(text.slice(2), "hex"));
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

function rpcCall(url, method, params, timeoutMs = 15_000) {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "http:" ||
    parsed.hostname !== "127.0.0.1" ||
    parsed.port !== String(RPC_PORT) ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    parsed.username ||
    parsed.password
  ) {
    hold("besu_rpc_url_invalid");
  }
  const body = Buffer.from(
    JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    "utf8",
  );
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: "127.0.0.1",
        port: RPC_PORT,
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
          if (total > 16 * 1024 * 1024) {
            request.destroy(new Error("besu_rpc_response_too_large"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          try {
            if (response.statusCode !== 200) {
              reject(new Error(`besu_rpc_http_${response.statusCode || 0}`));
              return;
            }
            const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            if (!payload || payload.jsonrpc !== "2.0" || payload.id !== 1) {
              reject(new Error("besu_rpc_envelope_invalid"));
              return;
            }
            if (payload.error) {
              reject(
                new Error(
                  `besu_rpc_error:${method}:code=${String(
                    payload.error.code ?? "unknown",
                  )}:message=${String(payload.error.message ?? "rpc_error")
                    .replace(/[\r\n\t]+/g, " ")
                    .slice(0, 240)}`,
                ),
              );
              return;
            }
            if (!Object.prototype.hasOwnProperty.call(payload, "result")) {
              reject(new Error("besu_rpc_result_missing"));
              return;
            }
            resolve(payload.result);
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    request.on("timeout", () => request.destroy(new Error("besu_rpc_timeout")));
    request.on("error", reject);
    request.end(body);
  });
}

async function callView(rpcUrl, iface, address, signature, args = []) {
  const fn = iface.getFunction(signature);
  const data = iface.encodeFunctionData(fn, args);
  const raw = await rpcCall(rpcUrl, "eth_call", [
    { to: lowerAddress(address), data },
    "0x0",
  ]);
  const decoded = iface.decodeFunctionResult(fn, raw);
  return [...decoded].map((value) =>
    typeof value === "bigint" ? value.toString() : String(value),
  );
}

function validateManifest(file, manifest) {
  if (sha256(file) !== EXPECTED_MANIFEST_FILE_SHA256) {
    hold("state_manifest_file_sha256_mismatch");
  }
  if (
    manifest?.marker !==
      "VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_V1" ||
    manifest?.status !== "CLIENT_NEUTRAL_STATE_MANIFEST_GREEN" ||
    manifest?.manifest_material_sha256 !==
      EXPECTED_MANIFEST_MATERIAL_SHA256 ||
    manifest?.chain_id !== CHAIN_ID ||
    manifest?.execution_epoch !== 2 ||
    !Array.isArray(manifest?.accounts) ||
    manifest.accounts.length !== 4
  ) {
    hold("state_manifest_identity_mismatch");
  }
}

export function classifyVoidEconomicEpoch2BesuStateObservationV1(observation) {
  if (!observation || typeof observation !== "object") {
    hold("observation_invalid");
  }
  if (
    observation.chain_id !== CHAIN_ID ||
    observation.network_id !== "2050" ||
    observation.block_number !== "0x0" ||
    observation.base_fee_per_gas !== "0x0" ||
    observation.gas_price !== "0x0" ||
    observation.code_account_count !== 4 ||
    observation.verified_storage_entry_count !== 1268 ||
    observation.native_balance_sum_wei !== "0" ||
    observation.token_total_supply_atoms !== TOTAL_SUPPLY ||
    observation.successor_holder_sum_atoms !== TOTAL_SUPPLY ||
    observation.staking_validator_count !== 126 ||
    observation.staking_active_validator_count !== 126 ||
    observation.staking_stake_sum_atoms !== STAKING_BALANCE ||
    observation.retired_source_balance_sum_atoms !== "0" ||
    observation.retired_source_code_count !== 0
  ) {
    hold("besu_state_observation_mismatch");
  }

  return Object.freeze({
    ok: true,
    status: "BESU_CLIENT_SPECIFIC_STATE_EQUIVALENCE_GREEN",
    marker: VOID_ECONOMIC_EPOCH2_BESU_STATE_EQUIVALENCE_V1,
    client_specific_genesis_built: true,
    besu_genesis_parse_verified: true,
    client_specific_state_equivalence_proven: true,
    zero_base_fee_verified: true,
    zero_gas_price_verified: true,
    participant_native_gas_balance_required: false,
    native_prefunded_account_count: 0,
    voidtoken_balance_storage_equivalence_verified: true,
    voidtoken_supply_storage_equivalence_verified: true,
    source_successor_holder_balance_equivalence_proven: true,
    source_successor_total_supply_equivalence_proven: true,
    source_successor_open_obligation_equivalence_proven: true,
    unmapped_voidtoken_atomic_verified_zero: true,
    orphan_contract_held_void_atomic_verified_zero: true,
    production_validator_set_bound: false,
    offline_successor_equivalence_proven: false,
    migration_authorized: false,
    public_activation_authorized: false,
  });
}

export async function runVoidEconomicEpoch2BesuStateEquivalenceV1({
  stateManifestPath,
  apply = false,
  confirmation = "",
} = {}) {
  const plan = Object.freeze({
    marker: VOID_ECONOMIC_EPOCH2_BESU_STATE_EQUIVALENCE_V1,
    version: 1,
    status: "PLAN_READY",
    rpc_url: `http://127.0.0.1:${RPC_PORT}/`,
    state_manifest_required: true,
    block_tag: "0x0",
    required_confirmation:
      VOID_ECONOMIC_EPOCH2_BESU_STATE_EQUIVALENCE_CONFIRMATION_V1,
    authority: VOID_ECONOMIC_EPOCH2_BESU_STATE_EQUIVALENCE_AUTHORITY_V1,
  });
  if (!apply) return plan;
  if (
    confirmation !==
    VOID_ECONOMIC_EPOCH2_BESU_STATE_EQUIVALENCE_CONFIRMATION_V1
  ) {
    hold("explicit_confirmation_required");
  }
  if (!stateManifestPath) hold("state_manifest_path_required");

  const mf = readJson(path.resolve(stateManifestPath));
  validateManifest(mf.raw, mf.value);

  const rpcUrl = `http://127.0.0.1:${RPC_PORT}/`;
  const [chainRaw, networkId, block0, gasPrice] = await Promise.all([
    rpcCall(rpcUrl, "eth_chainId", []),
    rpcCall(rpcUrl, "net_version", []),
    rpcCall(rpcUrl, "eth_getBlockByNumber", ["0x0", false]),
    rpcCall(rpcUrl, "eth_gasPrice", []),
  ]);

  const chainId = Number(BigInt(String(chainRaw)));
  if (!block0 || typeof block0 !== "object") hold("besu_genesis_block_missing");
  const baseFee =
    String(block0.baseFeePerGas ?? "0x0").toLowerCase() === "0x"
      ? "0x0"
      : String(block0.baseFeePerGas ?? "0x0").toLowerCase();

  let codeAccountCount = 0;
  let verifiedStorageEntryCount = 0;
  let nativeBalanceSum = 0n;
  for (const account of mf.value.accounts) {
    const address = lowerAddress(account.address);
    const [code, nativeBalance] = await Promise.all([
      rpcCall(rpcUrl, "eth_getCode", [address, "0x0"]),
      rpcCall(rpcUrl, "eth_getBalance", [address, "0x0"]),
    ]);
    if (runtimeSha256(code) !== EXPECTED_RUNTIMES[address]) {
      hold("besu_runtime_readback_mismatch", { address });
    }
    codeAccountCount += 1;
    nativeBalanceSum += BigInt(nativeBalance);
    for (const entry of account.storage_entries || []) {
      const observed = exactWord(
        await rpcCall(rpcUrl, "eth_getStorageAt", [
          address,
          exactWord(entry.slot),
          "0x0",
        ]),
      );
      if (observed !== exactWord(entry.value)) {
        hold("besu_storage_readback_mismatch", {
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
    name,
    symbol,
    decimals,
    premine,
    maxSupply,
    owner,
    totalSupply,
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
    name[0] !== "VoidStones" ||
    symbol[0] !== "VOID" ||
    decimals[0] !== "18" ||
    premine[0] !== TOTAL_SUPPLY ||
    maxSupply[0] !== "666666666000000000000000000" ||
    lowerAddress(owner[0]) !==
      "0x54ded2daa618a257093556a5f54c43805b9bd516" ||
    totalSupply[0] !== TOTAL_SUPPLY
  ) {
    hold("besu_token_getter_mismatch");
  }

  let holderSum = 0n;
  for (const [address, expected] of [
    [TREASURY, TREASURY_BALANCE],
    [STAKING, STAKING_BALANCE],
    [PRESALE, PRESALE_BALANCE],
  ]) {
    const balance = (
      await callView(rpcUrl, tokenAbi, TOKEN, "balanceOf(address)", [address])
    )[0];
    if (balance !== expected) {
      hold("besu_holder_balance_mismatch", { address, balance, expected });
    }
    holderSum += BigInt(balance);
  }

  let retiredBalanceSum = 0n;
  let retiredCodeCount = 0;
  for (const address of [OLD_TREASURY, OLD_PRESALE]) {
    const [balance, code] = await Promise.all([
      callView(rpcUrl, tokenAbi, TOKEN, "balanceOf(address)", [address]),
      rpcCall(rpcUrl, "eth_getCode", [address, "0x0"]),
    ]);
    retiredBalanceSum += BigInt(balance[0]);
    if (String(code).toLowerCase() !== "0x") retiredCodeCount += 1;
  }

  const [stakingToken, minStake, unbonding, validatorCount, activeCount] =
    await Promise.all([
      callView(rpcUrl, stakingAbi, STAKING, "voidToken()"),
      callView(rpcUrl, stakingAbi, STAKING, "minStake()"),
      callView(rpcUrl, stakingAbi, STAKING, "unbondingPeriodSeconds()"),
      callView(rpcUrl, stakingAbi, STAKING, "getValidatorCount()"),
      callView(rpcUrl, stakingAbi, STAKING, "getActiveValidatorCount()"),
    ]);
  if (
    lowerAddress(stakingToken[0]) !== TOKEN ||
    minStake[0] !== "1000000000000000000000" ||
    unbonding[0] !== "604800" ||
    validatorCount[0] !== "126" ||
    activeCount[0] !== "126"
  ) {
    hold("besu_staking_getter_mismatch");
  }

  const [treasuryToken, treasuryAuthority, treasuryEpoch] = await Promise.all([
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
    hold("besu_treasury_getter_mismatch");
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
    hold("besu_presale_getter_mismatch");
  }

  const observation = Object.freeze({
    chain_id: chainId,
    network_id: String(networkId),
    block_number: String(block0.number).toLowerCase(),
    block_hash: String(block0.hash).toLowerCase(),
    state_root: String(block0.stateRoot).toLowerCase(),
    base_fee_per_gas: baseFee,
    gas_price: String(gasPrice).toLowerCase(),
    code_account_count: codeAccountCount,
    verified_storage_entry_count: verifiedStorageEntryCount,
    native_balance_sum_wei: nativeBalanceSum.toString(),
    token_total_supply_atoms: totalSupply[0],
    successor_holder_sum_atoms: holderSum.toString(),
    staking_validator_count: Number(validatorCount[0]),
    staking_active_validator_count: Number(activeCount[0]),
    staking_stake_sum_atoms: STAKING_BALANCE,
    retired_source_balance_sum_atoms: retiredBalanceSum.toString(),
    retired_source_code_count: retiredCodeCount,
  });

  const classification =
    classifyVoidEconomicEpoch2BesuStateObservationV1(observation);
  const receipt = {
    marker: VOID_ECONOMIC_EPOCH2_BESU_STATE_EQUIVALENCE_V1,
    version: 1,
    status: classification.status,
    state_manifest: {
      file_sha256: EXPECTED_MANIFEST_FILE_SHA256,
      material_sha256: EXPECTED_MANIFEST_MATERIAL_SHA256,
    },
    observation,
    classification,
    authority: VOID_ECONOMIC_EPOCH2_BESU_STATE_EQUIVALENCE_AUTHORITY_V1,
  };
  return Object.freeze({
    ...receipt,
    receipt_material_sha256: canonicalSha256(receipt),
  });
}

function parseArgs(argv) {
  const args = { apply: false, confirmation: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--state-manifest") {
      if (!argv[i + 1]) hold("state_manifest_path_missing");
      args.state_manifest = argv[++i];
    } else if (key === "--apply") {
      args.apply = true;
    } else if (key === "--confirmation") {
      if (!argv[i + 1]) hold("confirmation_value_missing");
      args.confirmation = argv[++i];
    } else if (key === "--help") {
      args.help = true;
    } else {
      hold(`unknown_argument:${key}`);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      "Usage: node tools/void-economic-epoch2-besu-state-equivalence-v1.mjs --state-manifest FILE --apply --confirmation verifyEpoch2BesuGenesisStateEquivalence\n",
    );
    return;
  }
  const result = await runVoidEconomicEpoch2BesuStateEquivalenceV1({
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
      error instanceof VoidEconomicEpoch2BesuStateEquivalenceHoldV1
        ? error.reason
        : String(error?.message || error);
    const detail =
      error instanceof VoidEconomicEpoch2BesuStateEquivalenceHoldV1 &&
      error.detail !== null
        ? ` detail=${JSON.stringify(error.detail)}`
        : "";
    process.stderr.write(
      `VOID_ECONOMIC_EPOCH2_BESU_STATE_EQUIVALENCE_V1_HOLD reason=${reason}${detail}\n`,
    );
    process.exitCode = 2;
  });
}
