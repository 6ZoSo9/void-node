#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const VOID_PRIVATE_CHAIN2050_CHECKPOINT_MARKER_V1 =
  "VOID_PRIVATE_CHAIN2050_CHECKPOINT_V1";
export const VOID_PRIVATE_CHAIN2050_CHECKPOINT_VERSION_V1 = 1;
export const VOID_PRIVATE_CHAIN2050_EXPECTED_CHAIN_ID_V1 = 2050;
export const VOID_PRIVATE_CHAIN2050_CHECKPOINT_RPC_METHODS_V1 = Object.freeze([
  "eth_chainId",
  "eth_blockNumber",
  "eth_getBlockByNumber",
  "eth_accounts",
  "anvil_dumpState",
  "eth_blockNumber",
  "eth_getBlockByNumber",
]);

const SHA256_RE = /^[0-9a-f]{64}$/;
const BLOCK_HASH_RE = /^0x[0-9a-f]{64}$/;
const DEFAULT_MAX_STATE_BYTES = 768 * 1024 * 1024;

export class VoidPrivateChain2050CheckpointHoldV1 extends Error {
  constructor(reason) {
    super(reason);
    this.name = "VoidPrivateChain2050CheckpointHoldV1";
    this.reason = reason;
  }
}

function hold(reason) {
  throw new VoidPrivateChain2050CheckpointHoldV1(reason);
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

function sha256Text(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function parseHexInteger(value, label) {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]+$/.test(value)) {
    hold(`${label}_invalid`);
  }
  const parsed = Number.parseInt(value.slice(2), 16);
  if (!Number.isSafeInteger(parsed) || parsed < 0) hold(`${label}_unsafe`);
  return parsed;
}

function exactBlock(value, expectedNumber) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    hold("block_shape_invalid");
  }
  const number = parseHexInteger(value.number, "block_number");
  if (number !== expectedNumber) hold("block_number_mismatch");
  const hash = String(value.hash || "").toLowerCase();
  if (!BLOCK_HASH_RE.test(hash)) hold("block_hash_invalid");
  return { number, hash };
}

function validateDumpState(value, maxStateBytes) {
  if (
    typeof value !== "string" ||
    value.length < 4 ||
    !value.startsWith("0x") ||
    !/^0x[0-9a-fA-F]+$/.test(value) ||
    value.length % 2 !== 0
  ) {
    hold("anvil_dump_state_invalid");
  }
  const stateBytes = Buffer.byteLength(value, "utf8");
  if (stateBytes > maxStateBytes) hold("anvil_dump_state_too_large");
  return { stateBytes, stateSha256: sha256Text(value) };
}

export function validateVoidPrivateChain2050RpcUrlV1(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    hold("rpc_url_invalid");
  }
  if (parsed.protocol !== "http:") hold("rpc_url_protocol_invalid");
  if (parsed.username || parsed.password) hold("rpc_url_credentials_forbidden");
  if (!new Set(["127.0.0.1", "[::1]", "::1"]).has(parsed.hostname)) {
    hold("rpc_url_not_loopback");
  }
  if (parsed.search || parsed.hash) hold("rpc_url_suffix_invalid");
  if (parsed.pathname !== "/") hold("rpc_url_path_invalid");
  return parsed;
}

export async function voidPrivateChain2050HttpRpcCallV1(
  rpcUrl,
  method,
  params,
  { maxResponseBytes = DEFAULT_MAX_STATE_BYTES + 1024 * 1024 } = {},
) {
  const parsed = validateVoidPrivateChain2050RpcUrlV1(rpcUrl);
  const body = Buffer.from(
    JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    "utf8",
  );

  return await new Promise((resolve, reject) => {
    const request = http.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname === "[::1]" ? "::1" : parsed.hostname,
        port: parsed.port || "80",
        method: "POST",
        path: "/",
        headers: {
          "content-type": "application/json",
          "content-length": String(body.length),
          connection: "close",
        },
        timeout: 15_000,
      },
      (response) => {
        const chunks = [];
        let total = 0;
        response.on("data", (chunk) => {
          total += chunk.length;
          if (total > maxResponseBytes) {
            request.destroy(new Error("rpc_response_too_large"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          try {
            if (response.statusCode !== 200) {
              hold(`rpc_http_status_${response.statusCode || 0}`);
            }
            const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
              hold("rpc_response_shape_invalid");
            }
            if (payload.error) hold(`rpc_error_${method}`);
            if (!("result" in payload)) hold(`rpc_result_missing_${method}`);
            resolve(payload.result);
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    request.on("timeout", () => request.destroy(new Error("rpc_timeout")));
    request.on("error", reject);
    request.end(body);
  });
}

function ensurePrivateDirectory(root) {
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const stat = fs.lstatSync(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) hold("checkpoint_root_unsafe");
  fs.chmodSync(root, 0o700);
}

function writeCreateOnly(pathname, text) {
  try {
    const descriptor = fs.openSync(pathname, "wx", 0o600);
    try {
      fs.writeFileSync(descriptor, text, { encoding: "utf8" });
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }
    fs.chmodSync(pathname, 0o600);
    return "created";
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const stat = fs.lstatSync(pathname);
    if (!stat.isFile() || stat.isSymbolicLink()) hold("checkpoint_existing_path_unsafe");
    const existing = fs.readFileSync(pathname, "utf8");
    if (existing !== text) hold("checkpoint_existing_content_mismatch");
    if ((stat.mode & 0o777) !== 0o600) hold("checkpoint_existing_mode_invalid");
    return "existing_exact";
  }
}

export async function captureVoidPrivateChain2050CheckpointV1({
  rpcCall,
  outputRoot,
  minimumBlockNumber = 0,
  capturedAt = new Date().toISOString(),
  maxStateBytes = DEFAULT_MAX_STATE_BYTES,
}) {
  if (typeof rpcCall !== "function") hold("rpc_call_missing");
  if (!path.isAbsolute(outputRoot)) hold("checkpoint_root_not_absolute");
  if (!Number.isSafeInteger(minimumBlockNumber) || minimumBlockNumber < 0) {
    hold("minimum_block_number_invalid");
  }
  if (!Number.isSafeInteger(maxStateBytes) || maxStateBytes < 1024) {
    hold("max_state_bytes_invalid");
  }

  const methods = [];
  const call = async (method, params) => {
    methods.push(method);
    return await rpcCall(method, params);
  };

  const chainId = parseHexInteger(await call("eth_chainId", []), "chain_id");
  if (chainId !== VOID_PRIVATE_CHAIN2050_EXPECTED_CHAIN_ID_V1) {
    hold("chain_id_mismatch");
  }

  const beforeNumber = parseHexInteger(
    await call("eth_blockNumber", []),
    "head_block_number",
  );
  if (beforeNumber < minimumBlockNumber) hold("durable_head_below_required_minimum");
  const before = exactBlock(
    await call("eth_getBlockByNumber", [`0x${beforeNumber.toString(16)}`, false]),
    beforeNumber,
  );

  const accounts = await call("eth_accounts", []);
  if (!Array.isArray(accounts)) hold("eth_accounts_shape_invalid");
  if (accounts.length !== 0) hold("rpc_unlocked_accounts_present");

  const dumpedState = await call("anvil_dumpState", []);
  const { stateBytes, stateSha256 } = validateDumpState(
    dumpedState,
    maxStateBytes,
  );

  const afterNumber = parseHexInteger(
    await call("eth_blockNumber", []),
    "post_dump_head_block_number",
  );
  const after = exactBlock(
    await call("eth_getBlockByNumber", [`0x${afterNumber.toString(16)}`, false]),
    afterNumber,
  );

  if (after.number !== before.number || after.hash !== before.hash) {
    hold("chain_changed_during_checkpoint_capture");
  }
  if (
    canonical(methods) !== canonical(VOID_PRIVATE_CHAIN2050_CHECKPOINT_RPC_METHODS_V1)
  ) {
    hold("rpc_method_contract_changed");
  }

  const checkpointMaterial = {
    marker: VOID_PRIVATE_CHAIN2050_CHECKPOINT_MARKER_V1,
    version: VOID_PRIVATE_CHAIN2050_CHECKPOINT_VERSION_V1,
    chain_id: chainId,
    block_number: before.number,
    block_hash: before.hash,
    state_sha256: stateSha256,
    state_bytes: stateBytes,
    rpc_methods_used: [...methods],
    rpc_unlocked_account_count: 0,
    chain_mutation_performed: false,
    transaction_broadcast_performed: false,
    wallet_access_performed: false,
    credential_access_performed: false,
    money_movement_performed: false,
  };
  const checkpointIdSha256 = sha256Text(canonical(checkpointMaterial));
  if (!SHA256_RE.test(checkpointIdSha256)) hold("checkpoint_id_invalid");

  ensurePrivateDirectory(outputRoot);
  const stem = `chain2050-block-${before.number}-${checkpointIdSha256}`;
  const statePath = path.join(outputRoot, `${stem}.anvil-dump-state.hex`);
  const manifestPath = path.join(outputRoot, `${stem}.manifest.json`);

  const stateWrite = writeCreateOnly(statePath, `${dumpedState}\n`);
  const manifest = {
    ...checkpointMaterial,
    captured_at: String(capturedAt),
    checkpoint_id_sha256: checkpointIdSha256,
    state_file: path.basename(statePath),
  };
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;

  let manifestWrite;
  if (fs.existsSync(manifestPath)) {
    const existing = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (
      existing?.checkpoint_id_sha256 !== checkpointIdSha256 ||
      existing?.state_sha256 !== stateSha256 ||
      existing?.block_number !== before.number ||
      existing?.block_hash !== before.hash ||
      existing?.state_file !== path.basename(statePath)
    ) {
      hold("checkpoint_existing_manifest_mismatch");
    }
    const stat = fs.lstatSync(manifestPath);
    if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o777) !== 0o600) {
      hold("checkpoint_existing_manifest_unsafe");
    }
    manifestWrite = "existing_exact_identity";
  } else {
    manifestWrite = writeCreateOnly(manifestPath, manifestText);
  }

  return Object.freeze({
    ...manifest,
    state_path: statePath,
    manifest_path: manifestPath,
    state_write: stateWrite,
    manifest_write: manifestWrite,
  });
}

function parseArgs(argv) {
  const args = {
    rpcUrl: "http://127.0.0.1:8545/",
    outputRoot: path.join(
      os.homedir(),
      ".local/state/void-private-chain2050-rpc-v1/checkpoints-v1",
    ),
    minimumBlockNumber: 0,
    maxStateBytes: DEFAULT_MAX_STATE_BYTES,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === "--rpc-url") {
      if (!value) hold("rpc_url_missing");
      args.rpcUrl = value;
      index += 1;
    } else if (key === "--output-root") {
      if (!value) hold("output_root_missing");
      args.outputRoot = path.resolve(value);
      index += 1;
    } else if (key === "--minimum-block-number") {
      if (!value || !/^\d+$/.test(value)) hold("minimum_block_number_invalid");
      args.minimumBlockNumber = Number(value);
      index += 1;
    } else if (key === "--max-state-bytes") {
      if (!value || !/^\d+$/.test(value)) hold("max_state_bytes_invalid");
      args.maxStateBytes = Number(value);
      index += 1;
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
      "Usage: node tools/void-private-chain2050-checkpoint-v1.mjs [--rpc-url http://127.0.0.1:8545/] [--output-root ABSOLUTE_PATH] [--minimum-block-number N] [--max-state-bytes N]\n",
    );
    return;
  }
  validateVoidPrivateChain2050RpcUrlV1(args.rpcUrl);
  const result = await captureVoidPrivateChain2050CheckpointV1({
    rpcCall: (method, params) =>
      voidPrivateChain2050HttpRpcCallV1(args.rpcUrl, method, params, {
        maxResponseBytes: args.maxStateBytes + 1024 * 1024,
      }),
    outputRoot: args.outputRoot,
    minimumBlockNumber: args.minimumBlockNumber,
    maxStateBytes: args.maxStateBytes,
  });
  process.stdout.write(
    `${JSON.stringify(
      {
        marker: result.marker,
        checkpoint_id_sha256: result.checkpoint_id_sha256,
        chain_id: result.chain_id,
        block_number: result.block_number,
        block_hash: result.block_hash,
        state_sha256: result.state_sha256,
        state_bytes: result.state_bytes,
        state_path: result.state_path,
        manifest_path: result.manifest_path,
        chain_mutation_performed: result.chain_mutation_performed,
        transaction_broadcast_performed: result.transaction_broadcast_performed,
        wallet_access_performed: result.wallet_access_performed,
        credential_access_performed: result.credential_access_performed,
        money_movement_performed: result.money_movement_performed,
      },
      null,
      2,
    )}\n`,
  );
}

const invoked = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;
if (invoked) {
  main().catch((error) => {
    const reason =
      error instanceof VoidPrivateChain2050CheckpointHoldV1
        ? error.reason
        : String(error?.message || error);
    process.stderr.write(`VOID_PRIVATE_CHAIN2050_CHECKPOINT_V1_HOLD reason=${reason}\n`);
    process.exitCode = 2;
  });
}
