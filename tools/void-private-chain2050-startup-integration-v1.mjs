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
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { TextDecoder } from "node:util";
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
export const VOID_PRIVATE_CHAIN2050_MAX_DERIVED_STATE_BYTES_V1 =
  4 * 1024 * 1024 * 1024;

const BLOCK_HASH = /^0x[0-9a-f]{64}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1"]);
const MAX_SELECTED_STATE_BYTES = 1024 * 1024 * 1024;
const MAX_ANVIL_EXECUTABLE_BYTES = 512 * 1024 * 1024;
const MAX_RPC_RESPONSE_BYTES = 1024 * 1024;
const DEFAULT_START_TIMEOUT_MS = 30_000;
const STREAM_READ_CHUNK_BYTES = 1024 * 1024;

export const VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_AUTHORITY_V1 = Object.freeze({
  dry_run_default: true,
  dry_run_filesystem_write: false,
  exact_confirmation_required_before_materialization: true,
  exact_confirmation_required_before_process_start: true,
  startup_selector_required: true,
  selected_state_only: true,
  selected_state_sha256_reverified_before_materialization: true,
  selected_state_sha256_reverified_during_materialization: true,
  selected_state_sha256_reverified_before_publication: true,
  selected_state_private_content_addressed_copy: true,
  streaming_dump_state_materialization: true,
  whole_dump_state_memory_materialization: false,
  whole_dump_state_json_parse_required: false,
  max_derived_state_bytes: VOID_PRIVATE_CHAIN2050_MAX_DERIVED_STATE_BYTES_V1,
  stale_baseline_fallback: false,
  selected_block_hash_reverified_after_load: true,
  chain_id_reverified_after_load: true,
  anvil_generated_accounts_disabled: true,
  zero_unlocked_accounts_reverified_after_load: true,
  transaction_automining_default: true,
  interval_mining_opt_in_only: true,
  no_mining_default: false,
  anvil_executable_binding_supported: true,
  anvil_executable_binding_required_before_process_start: true,
  anvil_executable_sha256_reverified_before_process_start: true,
  ambient_path_anvil_resolution: false,
  transaction_replay: false,
  wallet_access: false,
  credential_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
});

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

function sha256File(file) {
  const hash = crypto.createHash("sha256");
  const fd = fs.openSync(file, "r");
  try {
    const buffer = Buffer.allocUnsafe(STREAM_READ_CHUNK_BYTES);
    while (true) {
      const read = fs.readSync(fd, buffer, 0, buffer.length, null);
      if (read === 0) break;
      hash.update(buffer.subarray(0, read));
    }
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest("hex");
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

function assertNoSymlinkComponents(
  target,
  reason = "startup_private_path_symlink_forbidden",
) {
  const absolute = path.resolve(target);
  const parsed = path.parse(absolute);
  let current = parsed.root;
  for (const part of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) continue;
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) hold(reason);
  }
}

export function validateVoidPrivateChain2050AnvilExecutableV1(
  executable,
  expectedSha256,
) {
  const raw = String(executable ?? "").trim();
  if (!raw || !path.isAbsolute(raw)) {
    hold("startup_anvil_executable_not_absolute");
  }
  const absolute = path.resolve(raw);
  if (absolute !== raw) {
    hold("startup_anvil_executable_not_canonical");
  }
  const expected = String(expectedSha256 ?? "").trim().toLowerCase();
  if (!SHA256.test(expected)) {
    hold("startup_anvil_executable_sha256_invalid");
  }
  assertNoSymlinkComponents(
    absolute,
    "startup_anvil_executable_symlink_forbidden",
  );
  let stat;
  try {
    stat = fs.lstatSync(absolute);
  } catch (error) {
    if (error?.code === "ENOENT") hold("startup_anvil_executable_missing");
    throw error;
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    hold("startup_anvil_executable_unsafe");
  }
  if (typeof process.getuid === "function" && stat.uid !== process.getuid()) {
    hold("startup_anvil_executable_owner_invalid");
  }
  const mode = stat.mode & 0o7777;
  if ((mode & 0o100) === 0) {
    hold("startup_anvil_executable_not_executable");
  }
  if ((mode & 0o022) !== 0 || (mode & 0o6000) !== 0) {
    hold("startup_anvil_executable_mode_unsafe");
  }
  if (stat.size <= 0 || stat.size > MAX_ANVIL_EXECUTABLE_BYTES) {
    hold("startup_anvil_executable_size_invalid");
  }
  try {
    fs.accessSync(absolute, fs.constants.X_OK);
  } catch {
    hold("startup_anvil_executable_not_executable");
  }
  const observedSha256 = sha256File(absolute);
  if (observedSha256 !== expected) {
    hold("startup_anvil_executable_sha256_mismatch");
  }
  return Object.freeze({
    path: absolute,
    sha256: observedSha256,
    mode_octal: (mode & 0o777).toString(8).padStart(4, "0"),
    owner_uid: typeof process.getuid === "function" ? stat.uid : null,
  });
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
  { mode = null, maxBytes = MAX_SELECTED_STATE_BYTES } = {},
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
    exactRegularFile(file, {
      mode: 0o600,
      maxBytes: VOID_PRIVATE_CHAIN2050_MAX_DERIVED_STATE_BYTES_V1,
    });
    const existing = fs.readFileSync(file);
    if (!existing.equals(bytes)) hold("startup_derived_state_existing_mismatch");
    return "existing_exact";
  }
}

class SourceDigestTransformV1 extends Transform {
  constructor() {
    super();
    this.hash = crypto.createHash("sha256");
  }

  _transform(chunk, _encoding, callback) {
    try {
      this.hash.update(chunk);
      callback(null, chunk);
    } catch (error) {
      callback(error);
    }
  }

  digestHex() {
    return this.hash.digest("hex");
  }
}

class HexAsciiDecodeTransformV1 extends Transform {
  constructor() {
    super();
    this.started = false;
    this.pending = "";
  }

  _transform(chunk, _encoding, callback) {
    try {
      let text = this.pending + chunk.toString("ascii");
      if (!this.started) {
        if (text.length < 2) {
          this.pending = text;
          callback();
          return;
        }
        if (!text.startsWith("0x")) {
          hold("startup_selected_dump_state_invalid");
        }
        text = text.slice(2);
        this.started = true;
      }
      if (!/^[0-9a-fA-F]*$/.test(text)) {
        hold("startup_selected_dump_state_invalid");
      }
      if (text.length % 2 === 1) {
        this.pending = text.slice(-1);
        text = text.slice(0, -1);
      } else {
        this.pending = "";
      }
      callback(null, text.length ? Buffer.from(text, "hex") : undefined);
    } catch (error) {
      callback(error);
    }
  }

  _flush(callback) {
    try {
      if (!this.started || this.pending.length !== 0) {
        hold("startup_selected_dump_state_invalid");
      }
      callback();
    } catch (error) {
      callback(error);
    }
  }
}

class JsonObjectIntegrityTransformV1 extends Transform {
  constructor(maxBytes) {
    super();
    this.maxBytes = maxBytes;
    this.totalBytes = 0;
    this.hash = crypto.createHash("sha256");
    this.decoder = new TextDecoder("utf-8", { fatal: true });
    this.firstNonWhitespace = null;
    this.lastNonWhitespace = null;
  }

  _transform(chunk, _encoding, callback) {
    try {
      this.totalBytes += chunk.length;
      if (this.totalBytes > this.maxBytes) {
        hold("startup_derived_state_too_large");
      }
      try {
        this.decoder.decode(chunk, { stream: true });
      } catch {
        hold("startup_selected_dump_state_utf8_invalid");
      }
      this.hash.update(chunk);
      for (const byte of chunk) {
        if (
          this.firstNonWhitespace === null &&
          byte !== 0x20 &&
          byte !== 0x09 &&
          byte !== 0x0a &&
          byte !== 0x0d
        ) {
          this.firstNonWhitespace = byte;
        }
        if (
          byte !== 0x20 &&
          byte !== 0x09 &&
          byte !== 0x0a &&
          byte !== 0x0d
        ) {
          this.lastNonWhitespace = byte;
        }
      }
      callback(null, chunk);
    } catch (error) {
      callback(error);
    }
  }

  _flush(callback) {
    try {
      try {
        this.decoder.decode();
      } catch {
        hold("startup_selected_dump_state_utf8_invalid");
      }
      if (this.firstNonWhitespace !== 0x7b || this.lastNonWhitespace !== 0x7d) {
        hold("startup_selected_dump_state_json_object_required");
      }
      callback();
    } catch (error) {
      callback(error);
    }
  }

  digestHex() {
    return this.hash.digest("hex");
  }
}

function isZlibFailure(error) {
  const code = String(error?.code || "");
  return code.startsWith("Z_") || code.startsWith("ERR_ZLIB_");
}

function removePrivateTempIfPresent(file, parent) {
  if (!file || !fs.existsSync(file)) return;
  try {
    fs.unlinkSync(file);
    if (parent && fs.existsSync(parent)) fsyncDirectory(parent);
  } catch {
    hold("startup_derived_state_temp_cleanup_failed");
  }
}

async function streamDumpStateToPrivateCliStateV1({
  stateFile,
  selectedStateSha256,
  derivedRoot,
  maxDerivedStateBytes,
}) {
  const privateRoot = ensurePrivateDirectory(derivedRoot);
  const tempFile = path.join(
    privateRoot,
    `.stream-${process.pid}-${crypto.randomBytes(16).toString("hex")}.tmp`,
  );
  const sourceDigest = new SourceDigestTransformV1();
  const hexDecoder = new HexAsciiDecodeTransformV1();
  const jsonIntegrity = new JsonObjectIntegrityTransformV1(maxDerivedStateBytes);
  let tempCreated = false;

  try {
    tempCreated = true;
    await pipeline(
      fs.createReadStream(stateFile, { highWaterMark: STREAM_READ_CHUNK_BYTES }),
      sourceDigest,
      hexDecoder,
      zlib.createGunzip(),
      jsonIntegrity,
      fs.createWriteStream(tempFile, { flags: "wx", mode: 0o600 }),
    );

    if (sourceDigest.digestHex() !== selectedStateSha256) {
      hold("startup_selected_state_sha256_changed_during_materialization");
    }
    if (jsonIntegrity.totalBytes <= 0) {
      hold("startup_selected_dump_state_json_invalid");
    }

    fs.chmodSync(tempFile, 0o600);
    const tempStat = exactRegularFile(tempFile, {
      mode: 0o600,
      maxBytes: maxDerivedStateBytes,
    });
    if (tempStat.size !== jsonIntegrity.totalBytes) {
      hold("startup_derived_state_size_mismatch");
    }
    const tempFd = fs.openSync(tempFile, "r");
    try {
      fs.fsyncSync(tempFd);
    } finally {
      fs.closeSync(tempFd);
    }

    const derivedSha256 = jsonIntegrity.digestHex();
    if (!SHA256.test(derivedSha256)) {
      hold("startup_derived_state_digest_invalid");
    }
    const derivedFile = path.join(
      privateRoot,
      `${derivedSha256}.cli-state.json`,
    );

    if (sha256File(stateFile) !== selectedStateSha256) {
      hold("startup_selected_state_sha256_changed_before_publication");
    }

    let derivedWrite;
    try {
      fs.linkSync(tempFile, derivedFile);
      fs.chmodSync(derivedFile, 0o600);
      fsyncDirectory(privateRoot);
      derivedWrite = "created";
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      const existingStat = exactRegularFile(derivedFile, {
        mode: 0o600,
        maxBytes: maxDerivedStateBytes,
      });
      if (
        existingStat.size !== tempStat.size ||
        sha256File(derivedFile) !== derivedSha256
      ) {
        hold("startup_derived_state_existing_mismatch");
      }
      derivedWrite = "existing_exact";
    }

    fs.unlinkSync(tempFile);
    tempCreated = false;
    fsyncDirectory(privateRoot);

    return Object.freeze({
      state_file: derivedFile,
      state_format: "anvil_cli_state_json",
      state_sha256: derivedSha256,
      state_bytes: tempStat.size,
      source_state_sha256: selectedStateSha256,
      source_state_sha256_reverified_during_materialization: true,
      source_state_sha256_reverified_before_publication: true,
      streaming_materialization: true,
      json_object_framing_verified: true,
      derived: true,
      derived_write: derivedWrite,
    });
  } catch (error) {
    if (tempCreated && fs.existsSync(tempFile)) {
      removePrivateTempIfPresent(tempFile, privateRoot);
    }
    if (error instanceof VoidPrivateChain2050StartupIntegrationHoldV1) {
      throw error;
    }
    if (isZlibFailure(error)) {
      hold("startup_selected_dump_state_decode_failed", {
        code: String(error?.code || "zlib_error"),
      });
    }
    if (
      new Set(["ENOSPC", "EDQUOT", "EFBIG", "EACCES", "EPERM", "EROFS"])
        .has(String(error?.code || ""))
    ) {
      hold("startup_derived_state_write_failed", {
        code: String(error?.code || "write_error"),
      });
    }
    hold("startup_selected_dump_state_decode_failed", {
      message: String(error?.message || error).slice(0, 160),
    });
  }
}

export async function materializeVoidPrivateChain2050CliStateV1(
  selection,
  options = {},
) {
  const stateFile = path.resolve(selection.selected_state_file);
  exactRegularFile(stateFile, { maxBytes: MAX_SELECTED_STATE_BYTES });
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

  // This pass is deliberately complete and occurs before derivedRoot creation.
  // A second digest is taken over the bytes actually decoded; checkpoint state
  // is then hashed once more synchronously immediately before final publication.
  if (sha256File(stateFile) !== selectedStateSha256) {
    hold("startup_selected_state_sha256_mismatch");
  }

  if (selectedStateFormat === "anvil_cli_state_json") {
    const selectedBytes = fs.readFileSync(stateFile);
    if (sha256Buffer(selectedBytes) !== selectedStateSha256) {
      hold("startup_selected_state_sha256_changed_during_materialization");
    }
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
      state_sha256: selectedStateSha256,
      state_bytes: selectedBytes.length,
      source_state_sha256: selectedStateSha256,
      source_state_sha256_reverified_during_materialization: true,
      streaming_materialization: false,
      derived: true,
      derived_write: derivedWrite,
    });
  }

  const maxDerivedStateBytes =
    options.max_derived_state_bytes === undefined
      ? VOID_PRIVATE_CHAIN2050_MAX_DERIVED_STATE_BYTES_V1
      : safeInteger(
          options.max_derived_state_bytes,
          "startup_max_derived_state_bytes_invalid",
          {
            minimum: 1024,
            maximum: VOID_PRIVATE_CHAIN2050_MAX_DERIVED_STATE_BYTES_V1,
          },
        );
  const derivedRoot =
    options.derived_root || path.join(
      os.homedir(),
      ".local/state/void-private-chain2050-rpc-v1/startup-derived-v1",
    );

  return await streamDumpStateToPrivateCliStateV1({
    stateFile,
    selectedStateSha256,
    derivedRoot,
    maxDerivedStateBytes,
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
  while (Date.now() < timeoutMs + Date.now()) {
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
    if (Date.now() >= deadline) break;
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
  const anvilPathSupplied = input.anvil_bin !== undefined && input.anvil_bin !== null;
  const anvilShaSupplied = input.anvil_sha256 !== undefined && input.anvil_sha256 !== null;
  if (anvilPathSupplied !== anvilShaSupplied) {
    hold("startup_anvil_executable_binding_incomplete");
  }
  const anvilBinding = anvilPathSupplied
    ? validateVoidPrivateChain2050AnvilExecutableV1(
        input.anvil_bin,
        input.anvil_sha256,
      )
    : null;
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
    selected_dump_state_streaming_required: true,
    max_derived_state_bytes: VOID_PRIVATE_CHAIN2050_MAX_DERIVED_STATE_BYTES_V1,
    derived_root: input.derived_root ? path.resolve(input.derived_root) : null,
    anvil_command: anvilBinding?.path ?? null,
    anvil_executable: anvilBinding?.path ?? null,
    anvil_executable_sha256: anvilBinding?.sha256 ?? null,
    anvil_executable_mode_octal: anvilBinding?.mode_octal ?? null,
    anvil_executable_binding_required_for_apply: true,
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
  if (!plan.anvil_executable || !plan.anvil_executable_sha256) {
    hold("startup_anvil_executable_binding_required");
  }
  const timeoutMs = safeInteger(
    input.start_timeout_ms ?? DEFAULT_START_TIMEOUT_MS,
    "startup_timeout_invalid",
    { minimum: 1_000, maximum: 120_000 },
  );
  const cliState = await materializeVoidPrivateChain2050CliStateV1(
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
  const anvilBinding = validateVoidPrivateChain2050AnvilExecutableV1(
    plan.anvil_executable,
    plan.anvil_executable_sha256,
  );
  const child = spawn(anvilBinding.path, anvilArgs, {
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
      anvil_executable_reverified_before_start: true,
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
      else if (key === "--anvil-bin") args.anvil_bin = value;
      else if (key === "--anvil-sha256") args.anvil_sha256 = value;
      else hold(`startup_unknown_argument:${key}`);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      "Usage: node tools/void-private-chain2050-startup-integration-v1.mjs --baseline-state ABS --baseline-state-sha256 SHA256 --baseline-state-format anvil_cli_state_json|anvil_dump_state_hex --baseline-block-number N --baseline-block-hash 0xHASH --checkpoint-root ABS --minimum-block-number N --anvil-bin ABS --anvil-sha256 SHA256 [--rpc-url http://127.0.0.1:8545/] [--derived-root ABS] [--block-time N] [--gas-limit N] [--apply --confirmation startPrivateChain2050FromSelectedDurableState]\n",
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
    "anvil_bin",
    "anvil_sha256",
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
