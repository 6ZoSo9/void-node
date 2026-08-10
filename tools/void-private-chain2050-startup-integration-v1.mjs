#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  VOID_PRIVATE_CHAIN2050_EXPECTED_CHAIN_ID_V1,
} from "./void-private-chain2050-checkpoint-v1.mjs";
import {
  selectVoidPrivateChain2050StartupStateV1,
} from "./void-private-chain2050-startup-selection-v1.mjs";

export const VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_MARKER_V1 =
  "VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_V1";
export const VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_CONFIRMATION_V1 =
  "startPrivateChain2050FromSelectedDurableState";

export const VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_AUTHORITY_V1 = Object.freeze({
  dry_run_default: true,
  dry_run_filesystem_write: false,
  exact_confirmation_required_before_materialization: true,
  exact_confirmation_required_before_process_start: true,
  startup_selector_required: true,
  selected_state_only: true,
  selected_state_sha256_reverified_before_materialization: true,
  selected_state_private_content_addressed_copy: true,
  stale_baseline_fallback: false,
  selected_block_hash_reverified_after_load: true,
  chain_id_reverified_after_load: true,
  anvil_generated_accounts_disabled: true,
  zero_unlocked_accounts_reverified_after_load: true,
  transaction_automining_default: true,
  interval_mining_opt_in_only: true,
  no_mining_default: false,
  transaction_replay: false,
  wallet_access: false,
  credential_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
});

const BLOCK_HASH = /^0x[0-9a-f]{64}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1"]);
const MAX_DERIVED_STATE_BYTES = 1024 * 1024 * 1024;
const MAX_RPC_RESPONSE_BYTES = 1024 * 1024;
const DEFAULT_START_TIMEOUT_MS = 30_000;

export class VoidPrivateChain2050StartupIntegrationHoldV1 extends Error {
  constructor(reason, detail) {
    super(reason);
    this.name = "VoidPrivateChain2050StartupIntegrationHoldV1";
    this.reason = reason;
    this.detail = detail;
  }
}

function hold(reason, detail) {
  throw new VoidPrivateChain2050StartupIntegrationHoldV1(reason, detail);
}

function sha256Buffer(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeInteger(
  value,
  reason,
  { minimum = 0, maximum = Number.MAX_SAFE_INTEGER } = {},
) {
  const raw = String(value ?? "").trim();
  if (!/^[0-9]+$/.test(raw)) hold(reason);
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    hold(reason);
  }
  return parsed;
}

function loopbackRpc(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    hold("startup_rpc_url_invalid");
  }
  if (
    url.protocol !== "http:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    !LOOPBACK_HOSTS.has(url.hostname)
  ) {
    hold("startup_rpc_url_not_numeric_loopback");
  }
  if (!url.port) hold("startup_rpc_port_required");
  return url;
}

function assertNoSymlinkComponents(target) {
  const absolute = path.resolve(target);
  const parsed = path.parse(absolute);
  let current = parsed.root;
  for (const part of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) continue;
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) hold("startup_private_path_symlink_forbidden");
  }
}

function ensurePrivateDirectory(dir) {
  const absolute = path.resolve(dir);
  assertNoSymlinkComponents(absolute);
  fs.mkdirSync(absolute, { recursive: true, mode: 0o700 });
  const stat = fs.lstatSync(absolute);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    hold("startup_private_directory_unsafe");
  }
  if (typeof process.getuid === "function" && stat.uid !== process.getuid()) {
    hold("startup_private_directory_owner_invalid");
  }
  fs.chmodSync(absolute, 0o700);
  return absolute;
}

function fsyncDirectory(dir) {
  const fd = fs.openSync(dir, "r");
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function exactRegularFile(
  file,
  { mode = null, maxBytes = MAX_DERIVED_STATE_BYTES } = {},
) {
  assertNoSymlinkComponents(file);
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) hold("startup_state_file_unsafe");
  if (typeof process.getuid === "function" && stat.uid !== process.getuid()) {
    hold("startup_state_file_owner_invalid");
  }
  if (mode !== null && (stat.mode & 0o777) !== mode) {
    hold("startup_state_file_mode_invalid");
  }
  if (stat.size <= 0 || stat.size > maxBytes) hold("startup_state_file_size_invalid");
  return stat;
}

function writeCreateOnly(file, bytes) {
  const parent = ensurePrivateDirectory(path.dirname(file));
  try {
    const fd = fs.openSync(file, "wx", 0o600);
    try {
      fs.writeFileSync(fd, bytes);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.chmodSync(file, 0o600);
    fsyncDirectory(parent);
    return "created";
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    exactRegularFile(file, { mode: 0o600 });
    const existing = fs.readFileSync(file);
    if (!existing.equals(bytes)) hold("startup_derived_state_existing_mismatch");
    return "existing_exact";
  }
}

export function materializeVoidPrivateChain2050CliStateV1(selection, options = {}) {
  const stateFile = path.resolve(selection.selected_state_file);
  exactRegularFile(stateFile);
  const selectedStateFormat = String(selection.selected_state_format || "");
  if (
    selectedStateFormat !== "anvil_cli_state_json" &&
    selectedStateFormat !== "anvil_dump_state_hex"
  ) {
    hold("startup_selected_state_format_invalid");
  }
  const selectedStateSha256 = String(
    selection.selected_state_sha256 || "",
  ).trim();
  if (!SHA256.test(selectedStateSha256)) {
    hold("startup_selected_state_sha256_invalid");
  }
  const selectedBytes = fs.readFileSync(stateFile);
  if (sha256Buffer(selectedBytes) !== selectedStateSha256) {
    hold("startup_selected_state_sha256_mismatch");
  }

  if (selectedStateFormat === "anvil_cli_state_json") {
    try {
      JSON.parse(selectedBytes.toString("utf8"));
    } catch {
      hold("startup_selected_cli_state_json_invalid");
    }
    const derivedRoot = ensurePrivateDirectory(
      options.derived_root || path.join(
        os.homedir(),
        ".local/state/void-private-chain2050-rpc-v1/startup-derived-v1",
      ),
    );
    const derivedFile = path.join(
      derivedRoot,
      `${selectedStateSha256}.cli-state.json`,
    );
    const derivedWrite = writeCreateOnly(derivedFile, selectedBytes);
    return Object.freeze({
      state_file: derivedFile,
      state_format: "anvil_cli_state_json",
      derived: true,
      derived_write: derivedWrite,
    });
  }

  const encoded = selectedBytes.toString("utf8");
  if (!/^0x[0-9a-fA-F]+$/.test(encoded) || encoded.length % 2 !== 0) {
    hold("startup_selected_dump_state_invalid");
  }
  let decoded;
  try {
    decoded = zlib.gunzipSync(Buffer.from(encoded.slice(2), "hex"), {
      maxOutputLength: MAX_DERIVED_STATE_BYTES,
    });
  } catch {
    hold("startup_selected_dump_state_decode_failed");
  }
  let parsed;
  try {
    parsed = JSON.parse(decoded.toString("utf8"));
  } catch {
    hold("startup_selected_dump_state_json_invalid");
  }
  const canonical = Buffer.from(`${JSON.stringify(parsed)}\n`, "utf8");
  if (canonical.length > MAX_DERIVED_STATE_BYTES) hold("startup_derived_state_too_large");
  const derivedRoot = ensurePrivateDirectory(
    options.derived_root || path.join(
      os.homedir(),
      ".local/state/void-private-chain2050-rpc-v1/startup-derived-v1",
    ),
  );
  const digest = sha256Buffer(canonical);
  if (!SHA256.test(digest)) hold("startup_derived_state_digest_invalid");
  const derivedFile = path.join(derivedRoot, `${digest}.cli-state.json`);
  const derivedWrite = writeCreateOnly(derivedFile, canonical);
  return Object.freeze({
    state_file: derivedFile,
    state_format: "anvil_cli_state_json",
    derived: true,
    derived_write: derivedWrite,
  });
}

function rpcCall(url, method, params, timeoutMs = 5_000) {
  const body = Buffer.from(
    JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    "utf8",
  );
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        protocol: "http:",
        hostname: url.hostname,
        port: url.port,
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
            request.destroy(new Error("startup_rpc_response_too_large"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          try {
            if (response.statusCode !== 200) hold("startup_rpc_http_status_invalid");
            const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            if (
              !payload ||
              payload.jsonrpc !== "2.0" ||
              payload.id !== 1 ||
              payload.error ||
              !("result" in payload)
            ) {
              hold("startup_rpc_envelope_invalid");
            }
            resolve(payload.result);
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    request.on("timeout", () => request.destroy(new Error("startup_rpc_timeout")));
    request.on("error", reject);
    request.end(body);
  });
}

export async function verifyVoidPrivateChain2050StartedStateV1(
  url,
  selection,
  timeoutMs,
  rpcClient = rpcCall,
) {
  const deadline = Date.now() + timeoutMs;
  let lastReason = "startup_rpc_not_ready";
  while (Date.now() < deadline) {
    try {
      const chainRaw = await rpcClient(url, "eth_chainId", []);
      if (
        BigInt(String(chainRaw)) !==
        BigInt(VOID_PRIVATE_CHAIN2050_EXPECTED_CHAIN_ID_V1)
      ) {
        hold("startup_loaded_chain_id_mismatch");
      }
      const selectedNumberHex =
        `0x${Number(selection.selected_block_number).toString(16)}`;
      const block = await rpcClient(
        url,
        "eth_getBlockByNumber",
        [selectedNumberHex, false],
      );
      if (!block || typeof block !== "object") {
        hold("startup_selected_block_missing_after_load");
      }
      if (String(block.hash || "").toLowerCase() !== selection.selected_block_hash) {
        hold("startup_selected_block_hash_mismatch_after_load");
      }
      const currentRaw = await rpcClient(url, "eth_blockNumber", []);
      if (BigInt(String(currentRaw)) < BigInt(selection.selected_block_number)) {
        hold("startup_loaded_head_below_selected_state");
      }
      const accounts = await rpcClient(url, "eth_accounts", []);
      if (!Array.isArray(accounts)) {
        hold("startup_loaded_accounts_shape_invalid");
      }
      if (accounts.length !== 0) {
        hold("startup_loaded_accounts_not_empty");
      }
      return {
        chain_id: VOID_PRIVATE_CHAIN2050_EXPECTED_CHAIN_ID_V1,
        selected_block_number: selection.selected_block_number,
        selected_block_hash: selection.selected_block_hash,
        loaded_head_at_or_above_selection: true,
        unlocked_account_count: 0,
        zero_unlocked_accounts_verified: true,
      };
    } catch (error) {
      if (error instanceof VoidPrivateChain2050StartupIntegrationHoldV1) throw error;
      lastReason = String(error?.message || error).slice(0, 160);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  hold("startup_postload_verification_timeout", { last_reason: lastReason });
}

export function buildVoidPrivateChain2050AnvilArgsV1(
  rpc,
  cliState,
  blockTime,
  gasLimit,
) {
  const args = [
    "--host",
    rpc.hostname,
    "--port",
    rpc.port,
    "--chain-id",
    String(VOID_PRIVATE_CHAIN2050_EXPECTED_CHAIN_ID_V1),
    "--accounts",
    "0",
  ];
  if (blockTime !== null && blockTime !== undefined) {
    args.push("--block-time", String(blockTime));
  }
  args.push(
    "--gas-limit",
    String(gasLimit),
    "--load-state",
    cliState.state_file,
  );
  return args;
}

export function assertVoidPrivateChain2050ZeroAccountAnvilArgsV1(args) {
  if (!Array.isArray(args)) hold("startup_anvil_args_invalid");
  const accountFlagIndexes = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--accounts") accountFlagIndexes.push(index);
  }
  if (
    accountFlagIndexes.length !== 1 ||
    args[accountFlagIndexes[0] + 1] !== "0"
  ) {
    hold("startup_anvil_zero_accounts_required");
  }
  for (const forbidden of [
    "--mnemonic",
    "--mnemonic-random",
    "--mnemonic-seed-unsafe",
  ]) {
    if (args.includes(forbidden)) {
      hold("startup_anvil_account_generator_option_forbidden");
    }
  }
  return true;
}

export function assertVoidPrivateChain2050MiningModeAnvilArgsV1(
  args,
  miningMode,
  blockTime,
) {
  if (!Array.isArray(args)) hold("startup_anvil_args_invalid");
  for (const forbidden of ["--no-mining", "--no-mine"]) {
    if (args.includes(forbidden)) {
      hold("startup_anvil_no_mining_forbidden");
    }
  }
  const blockTimeIndexes = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--block-time") blockTimeIndexes.push(index);
  }

  if (miningMode === "auto") {
    if (blockTime !== null || blockTimeIndexes.length !== 0) {
      hold("startup_anvil_transaction_automining_required");
    }
    return true;
  }

  if (miningMode === "interval") {
    if (
      !Number.isSafeInteger(blockTime) ||
      blockTime < 1 ||
      blockTime > 3_600 ||
      blockTimeIndexes.length !== 1 ||
      args[blockTimeIndexes[0] + 1] !== String(blockTime)
    ) {
      hold("startup_anvil_interval_mining_binding_invalid");
    }
    return true;
  }

  hold("startup_mining_mode_invalid");
}

export function buildVoidPrivateChain2050StartupPlanV1(input) {
  const rpc = loopbackRpc(input.rpc_url || "http://127.0.0.1:8545/");
  const baselineBlock = safeInteger(
    input.baseline_block_number,
    "startup_baseline_block_number_invalid",
  );
  const minimumBlock = safeInteger(
    input.minimum_block_number,
    "startup_minimum_block_number_invalid",
    { minimum: 1 },
  );
  const blockTime =
    input.block_time === undefined || input.block_time === null
      ? null
      : safeInteger(
          input.block_time,
          "startup_block_time_invalid",
          { minimum: 1, maximum: 3_600 },
        );
  const miningMode = blockTime === null ? "auto" : "interval";
  const gasLimit = safeInteger(
    input.gas_limit ?? 200_000_000,
    "startup_gas_limit_invalid",
    { minimum: 21_000 },
  );
  const selection = selectVoidPrivateChain2050StartupStateV1({
    baseline: {
      chain_id: VOID_PRIVATE_CHAIN2050_EXPECTED_CHAIN_ID_V1,
      block_number: baselineBlock,
      block_hash: input.baseline_block_hash,
      state_sha256: input.baseline_state_sha256,
      state_file: path.resolve(input.baseline_state),
      state_format: input.baseline_state_format,
    },
    checkpointRoot: path.resolve(input.checkpoint_root),
    minimumBlockNumber: minimumBlock,
  });
  return Object.freeze({
    marker: VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_MARKER_V1,
    version: 1,
    status: "planned",
    apply: false,
    rpc_url: rpc.toString(),
    minimum_block_number: minimumBlock,
    mining_mode: miningMode,
    block_time: blockTime,
    no_mining: false,
    gas_limit: gasLimit,
    selection,
    selected_state_materialization_required: true,
    derived_root: input.derived_root ? path.resolve(input.derived_root) : null,
    anvil_command: "anvil",
    anvil_generated_accounts: 0,
    post_load_zero_unlocked_accounts_required: true,
    required_confirmation:
      VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_CONFIRMATION_V1,
    state_materialization_performed: false,
    state_load_performed: false,
    service_mutation_performed: false,
    transaction_replay_performed: false,
    transaction_broadcast_performed: false,
    wallet_access_performed: false,
    credential_access_performed: false,
    money_movement_performed: false,
    authority: VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_AUTHORITY_V1,
  });
}

export async function runVoidPrivateChain2050StartupIntegrationV1(input) {
  const plan = buildVoidPrivateChain2050StartupPlanV1(input);
  if (input.apply !== true) return plan;
  if (
    String(input.confirmation || "") !==
    VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_CONFIRMATION_V1
  ) {
    hold("startup_explicit_confirmation_required", {
      required_confirmation:
        VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_CONFIRMATION_V1,
    });
  }
  const timeoutMs = safeInteger(
    input.start_timeout_ms ?? DEFAULT_START_TIMEOUT_MS,
    "startup_timeout_invalid",
    { minimum: 1_000, maximum: 120_000 },
  );
  const cliState = materializeVoidPrivateChain2050CliStateV1(
    plan.selection,
    {
      ...(plan.derived_root ? { derived_root: plan.derived_root } : {}),
    },
  );
  const rpc = loopbackRpc(plan.rpc_url);
  const anvilArgs = buildVoidPrivateChain2050AnvilArgsV1(
    rpc,
    cliState,
    plan.block_time,
    plan.gas_limit,
  );
  assertVoidPrivateChain2050ZeroAccountAnvilArgsV1(anvilArgs);
  assertVoidPrivateChain2050MiningModeAnvilArgsV1(
    anvilArgs,
    plan.mining_mode,
    plan.block_time,
  );
  const child = spawn("anvil", anvilArgs, {
    stdio: ["ignore", "inherit", "inherit"],
    env: process.env,
  });
  let exited = false;
  let exitCode = null;
  child.once("exit", (code) => {
    exited = true;
    exitCode = code;
  });
  const stopChild = async () => {
    if (exited) return;
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 5_000);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
    if (!exited) child.kill("SIGKILL");
  };
  try {
    const verification = await verifyVoidPrivateChain2050StartedStateV1(
      rpc,
      plan.selection,
      timeoutMs,
    );
    if (exited) {
      hold("startup_anvil_exited_before_verification", { exit_code: exitCode });
    }
    const receipt = Object.freeze({
      ...plan,
      status: "started_verified",
      apply: true,
      cli_state: cliState,
      anvil_args: anvilArgs,
      verification,
      state_materialization_performed:
        cliState.derived === true,
      state_load_performed: true,
      service_mutation_performed: true,
    });
    process.stdout.write(`${JSON.stringify(receipt)}\n`);
    const forward = (signal) => {
      if (!exited) child.kill(signal);
    };
    process.once("SIGINT", () => forward("SIGINT"));
    process.once("SIGTERM", () => forward("SIGTERM"));
    await new Promise((resolve) => child.once("exit", resolve));
    process.exitCode = exitCode === 0 ? 0 : 1;
    return receipt;
  } catch (error) {
    await stopChild();
    throw error;
  }
}

function parseArgs(argv) {
  const args = {};
  const valueFor = (index, key) => {
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) hold(`startup_argument_missing:${key}`);
    return value;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--apply") args.apply = true;
    else if (key === "--help") args.help = true;
    else {
      const value = valueFor(i, key);
      i += 1;
      if (key === "--confirmation") args.confirmation = value;
      else if (key === "--baseline-state") args.baseline_state = value;
      else if (key === "--baseline-state-sha256") args.baseline_state_sha256 = value;
      else if (key === "--baseline-state-format") args.baseline_state_format = value;
      else if (key === "--baseline-block-number") args.baseline_block_number = value;
      else if (key === "--baseline-block-hash") args.baseline_block_hash = value;
      else if (key === "--checkpoint-root") args.checkpoint_root = value;
      else if (key === "--minimum-block-number") args.minimum_block_number = value;
      else if (key === "--derived-root") args.derived_root = value;
      else if (key === "--rpc-url") args.rpc_url = value;
      else if (key === "--block-time") args.block_time = value;
      else if (key === "--gas-limit") args.gas_limit = value;
      else if (key === "--start-timeout-ms") args.start_timeout_ms = value;
      else hold(`startup_unknown_argument:${key}`);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      "Usage: node tools/void-private-chain2050-startup-integration-v1.mjs --baseline-state ABS --baseline-state-sha256 SHA256 --baseline-state-format anvil_cli_state_json|anvil_dump_state_hex --baseline-block-number N --baseline-block-hash 0xHASH --checkpoint-root ABS --minimum-block-number N [--rpc-url http://127.0.0.1:8545/] [--derived-root ABS] [--block-time N] [--gas-limit N] [--apply --confirmation startPrivateChain2050FromSelectedDurableState]\n",
    );
    return;
  }
  for (const key of [
    "baseline_state",
    "baseline_state_sha256",
    "baseline_state_format",
    "baseline_block_number",
    "baseline_block_hash",
    "checkpoint_root",
    "minimum_block_number",
  ]) {
    if (args[key] === undefined) hold(`startup_required_argument_missing:${key}`);
  }
  const result = await runVoidPrivateChain2050StartupIntegrationV1(args);
  if (args.apply !== true) process.stdout.write(`${JSON.stringify(result)}\n`);
}

const invoked = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;
if (invoked) {
  main().catch((error) => {
    const reason =
      error instanceof VoidPrivateChain2050StartupIntegrationHoldV1
        ? error.reason
        : String(error?.message || error);
    process.stderr.write(
      `VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_V1_HOLD reason=${reason}\n`,
    );
    process.exitCode = 2;
  });
}
