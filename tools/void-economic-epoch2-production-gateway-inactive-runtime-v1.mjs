#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1,
  createVoidEconomicEpoch2ProductionGatewayReplayBindingV1,
} from "./void-economic-epoch2-production-gateway-replay-binding-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1,
} from "./void-economic-epoch2-durable-replay-store-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_CORE_V1,
} from "./void-economic-epoch2-public-submission-gateway-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_INACTIVE_RUNTIME_V1 =
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_INACTIVE_RUNTIME_V1";

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_INACTIVE_RUNTIME_CONFIRMATION_V1 =
  "startVoidEconomicEpoch2ProductionGatewayInactiveRuntime";

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_INACTIVE_RUNTIME_AUTHORITY_V1 =
  Object.freeze({
    source_runtime_only: true,
    replay_root_metadata_read: true,
    private_status_receipt_write: true,
    process_signal_wait: true,
    runtime_route_active: false,
    public_submission_open: false,
    network_listener: false,
    rpc_call: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    wallet_access: false,
    private_key_access: false,
    credential_content_access: false,
    validator_mutation: false,
    token_movement: false,
    funds_movement: false,
    migration_authorized: false,
    public_activation_authorized: false,
  });

const RUNTIME_SOURCE_PATH =
  "tools/void-economic-epoch2-production-gateway-inactive-runtime-v1.mjs";
const RECEIPT_PREFIX = "voide2grt1_";
const RECEIPT_ID = /^voide2grt1_[0-9a-f]{64}$/u;
const UTC_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;

function fail(reason) {
  throw new Error(reason);
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      fail("canonical_object_invalid");
    }
    const keys = Object.keys(value).sort();
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  fail("canonical_value_invalid");
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Text(text) {
  return sha256Bytes(Buffer.from(text, "utf8"));
}

function canonicalUtc(value) {
  if (typeof value !== "string" || !UTC_SECONDS.test(value)) {
    fail("observed_at_utc_invalid");
  }
  const ms = Date.parse(value);
  if (
    !Number.isFinite(ms) ||
    new Date(ms).toISOString() !== value.replace("Z", ".000Z")
  ) {
    fail("observed_at_utc_invalid");
  }
  return value;
}

function directOwnedDirectory(candidate, exactMode, reason) {
  const absolute = path.resolve(String(candidate || ""));
  if (!path.isAbsolute(String(candidate || "")) || absolute === path.parse(absolute).root) {
    fail(reason);
  }

  let stat;
  let realpath;
  try {
    stat = fs.lstatSync(absolute, { bigint: true });
    realpath = fs.realpathSync.native(absolute);
  } catch {
    fail(reason);
  }
  if (!stat.isDirectory() || stat.isSymbolicLink() || realpath !== absolute) {
    fail(reason);
  }
  if (
    typeof process.getuid === "function" &&
    stat.uid !== BigInt(process.getuid())
  ) {
    fail(reason);
  }
  const mode = Number(stat.mode) & 0o777;
  if (mode !== exactMode) fail(reason);

  return Object.freeze({
    path: absolute,
    dev: stat.dev.toString(),
    ino: stat.ino.toString(),
    uid: stat.uid.toString(),
    gid: stat.gid.toString(),
    mode: mode.toString(8).padStart(4, "0"),
    realpath,
  });
}

function sameDirectoryIdentity(left, right) {
  return (
    left.path === right.path &&
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode &&
    left.realpath === right.realpath
  );
}

function directSourceFile(candidate) {
  const absolute = path.resolve(String(candidate || ""));
  let stat;
  let realpath;
  try {
    stat = fs.lstatSync(absolute, { bigint: true });
    realpath = fs.realpathSync.native(absolute);
  } catch {
    fail("runtime_source_file_invalid");
  }
  if (!stat.isFile() || stat.isSymbolicLink() || realpath !== absolute) {
    fail("runtime_source_file_invalid");
  }
  const bytes = fs.readFileSync(absolute);
  return Object.freeze({
    absolute,
    sha256: sha256Bytes(bytes),
    bytes: bytes.length,
  });
}

function fsyncDirectory(directory) {
  const fd = fs.openSync(
    directory,
    fs.constants.O_RDONLY |
      (typeof fs.constants.O_DIRECTORY === "number"
        ? fs.constants.O_DIRECTORY
        : 0) |
      (typeof fs.constants.O_NOFOLLOW === "number"
        ? fs.constants.O_NOFOLLOW
        : 0),
  );
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function writePrivateReceipt(filename, receipt) {
  const absolute = path.resolve(String(filename || ""));
  if (!path.isAbsolute(String(filename || "")) || absolute === path.parse(absolute).root) {
    fail("status_file_invalid");
  }
  const parent = path.dirname(absolute);
  directOwnedDirectory(parent, 0o700, "status_parent_custody_invalid");

  const bytes = Buffer.from(JSON.stringify(receipt, null, 2) + "\n", "utf8");
  let fd;
  try {
    fd = fs.openSync(
      absolute,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        (typeof fs.constants.O_NOFOLLOW === "number"
          ? fs.constants.O_NOFOLLOW
          : 0),
      0o600,
    );
  } catch {
    fail("status_file_create_failed");
  }
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fsyncDirectory(parent);

  const stat = fs.lstatSync(absolute, { bigint: true });
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    (Number(stat.mode) & 0o777) !== 0o600 ||
    (typeof process.getuid === "function" &&
      stat.uid !== BigInt(process.getuid()))
  ) {
    fail("status_file_custody_invalid");
  }
  return Object.freeze({
    path: absolute,
    sha256: sha256Bytes(bytes),
    bytes: bytes.length,
  });
}

function receiptId(body) {
  return RECEIPT_PREFIX + sha256Text(canonicalJson(body));
}

export function prepareVoidEconomicEpoch2ProductionGatewayInactiveRuntimeV1({
  confirmation,
  replayRoot,
  statusFile,
  observedAtUtc,
  runtimeSourceFile = path.resolve(RUNTIME_SOURCE_PATH),
  hostname = os.hostname(),
  pid = process.pid,
  uid = typeof process.getuid === "function" ? process.getuid() : null,
}) {
  if (
    confirmation !==
    VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_INACTIVE_RUNTIME_CONFIRMATION_V1
  ) {
    fail("inactive_runtime_confirmation_required");
  }
  if (
    typeof hostname !== "string" ||
    hostname.length < 1 ||
    hostname.length > 255
  ) {
    fail("hostname_invalid");
  }
  if (!Number.isSafeInteger(pid) || pid < 1) fail("pid_invalid");
  if (!Number.isSafeInteger(uid) || uid < 0) fail("uid_invalid");

  const observed = canonicalUtc(observedAtUtc);
  const source = directSourceFile(runtimeSourceFile);
  const rootBefore = directOwnedDirectory(
    replayRoot,
    0o700,
    "replay_root_custody_invalid",
  );

  const binding = createVoidEconomicEpoch2ProductionGatewayReplayBindingV1({
    replayRoot: rootBefore.path,
  });
  if (
    binding?.marker !==
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1 ||
    binding?.gateway_marker !==
      VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_CORE_V1 ||
    binding?.replay_store_marker !==
      VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1 ||
    binding?.production_gateway_replay_store_binding_source_verified !== true ||
    binding?.production_gateway_replay_store_binding_verified !== false ||
    binding?.runtime_route_active !== false ||
    binding?.public_submission_open !== false
  ) {
    fail("inactive_runtime_binding_contract_mismatch");
  }

  const rootAfterBinding = directOwnedDirectory(
    replayRoot,
    0o700,
    "replay_root_custody_invalid",
  );
  if (!sameDirectoryIdentity(rootBefore, rootAfterBinding)) {
    fail("replay_root_changed_during_binding");
  }

  const body = Object.freeze({
    marker:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_INACTIVE_RUNTIME_V1,
    version: 1,
    status: "INACTIVE_RUNTIME_REPLAY_ROOT_BOUND_ROUTE_CLOSED",
    chain_id: 2050,
    execution_epoch: 2,
    hostname,
    pid,
    uid,
    observed_at_utc: observed,
    runtime_source_path: RUNTIME_SOURCE_PATH,
    runtime_source_sha256: source.sha256,
    runtime_source_bytes: source.bytes,
    binding_marker:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1,
    gateway_marker:
      VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_CORE_V1,
    replay_store_marker:
      VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1,
    replay_root: Object.freeze({
      path: rootBefore.path,
      path_sha256: sha256Text(rootBefore.path),
      dev: rootBefore.dev,
      ino: rootBefore.ino,
      uid: rootBefore.uid,
      gid: rootBefore.gid,
      mode: rootBefore.mode,
      realpath_sha256: sha256Text(rootBefore.realpath),
    }),
    runtime_process_binding_constructed: true,
    binding_constructed_from_exact_replay_root: true,
    replay_root_identity_stable_during_binding: true,
    production_gateway_replay_store_binding_source_verified: true,
    runtime_service_identity_verified: false,
    same_uid_process_model_verified: false,
    production_gateway_replay_store_binding_verified: false,
    runtime_route_active: false,
    public_submission_open: false,
    network_listener_created: false,
    rpc_call: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    migration_authorized: false,
    public_activation_authorized: false,
    funds_movement: false,
  });

  const id = receiptId(body);
  if (!RECEIPT_ID.test(id)) fail("runtime_receipt_id_invalid");
  const receipt = Object.freeze({
    ...body,
    receipt_id: id,
    authority:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_INACTIVE_RUNTIME_AUTHORITY_V1,
  });

  const status = writePrivateReceipt(statusFile, receipt);

  const rootAfterReceipt = directOwnedDirectory(
    replayRoot,
    0o700,
    "replay_root_custody_invalid",
  );
  if (!sameDirectoryIdentity(rootBefore, rootAfterReceipt)) {
    fail("replay_root_changed_before_runtime_ready");
  }

  return Object.freeze({
    receipt,
    status_file: status.path,
    status_file_sha256: status.sha256,
    status_file_bytes: status.bytes,
  });
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function utcNowSeconds() {
  const ms = Math.floor(Date.now() / 1000) * 1000;
  return new Date(ms).toISOString().replace(".000Z", "Z");
}

async function main() {
  const result =
    prepareVoidEconomicEpoch2ProductionGatewayInactiveRuntimeV1({
      confirmation: arg("--confirmation"),
      replayRoot: arg("--replay-root"),
      statusFile: arg("--status-file"),
      observedAtUtc: utcNowSeconds(),
      runtimeSourceFile: path.resolve(process.argv[1]),
    });

  console.log(
    VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_INACTIVE_RUNTIME_V1,
  );
  console.log("receipt_id=" + result.receipt.receipt_id);
  console.log("status_file_sha256=" + result.status_file_sha256);
  console.log("runtime_process_binding_constructed=true");
  console.log("production_gateway_replay_store_binding_source_verified=true");
  console.log("runtime_service_identity_verified=false");
  console.log("same_uid_process_model_verified=false");
  console.log("production_gateway_replay_store_binding_verified=false");
  console.log("runtime_route_active=false");
  console.log("public_submission_open=false");
  console.log("network_listener_created=false");
  console.log("transaction_submission=false");
  console.log("transaction_broadcast=false");
  console.log("authoritative_chain2050_write=false");
  console.log("migration_authorized=false");
  console.log("public_activation_authorized=false");
  console.log("funds_movement=false");

  await new Promise((resolve) => {
    const stop = () => resolve();
    process.once("SIGTERM", stop);
    process.once("SIGINT", stop);
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    process.stderr.write("HOLD: " + error.message + "\n");
    process.exitCode = 1;
  });
}
