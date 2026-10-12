#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1,
  createVoidEconomicEpoch2ProductionGatewayReplayBindingV1,
} from "../tools/void-economic-epoch2-production-gateway-replay-binding-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1,
} from "../tools/void-economic-epoch2-durable-replay-store-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_INACTIVE_PUBLIC_SUBMISSION_GATEWAY_RUNTIME_V1 =
  "VOID_ECONOMIC_EPOCH2_INACTIVE_PUBLIC_SUBMISSION_GATEWAY_RUNTIME_V1";

const SERVICE_IDENTITY =
  "void-economic-epoch2-public-submission-gateway-v1.service";

function fail(reason) {
  process.stderr.write(reason + "\n");
  process.exit(78);
}

function requiredAbsolute(name) {
  const value = String(process.env[name] || "");
  if (
    value.length === 0 ||
    value.includes("\0") ||
    !path.isAbsolute(value) ||
    path.resolve(value) !== value
  ) {
    fail("invalid_environment_path:" + name);
  }
  return value;
}

const replayRoot = requiredAbsolute("VOID_EPOCH2_REPLAY_ROOT");
const statusPath = requiredAbsolute("VOID_EPOCH2_STATUS_PATH");

if (path.dirname(statusPath) !== path.dirname(replayRoot)) {
  fail("status_and_replay_root_parent_mismatch");
}

const binding = createVoidEconomicEpoch2ProductionGatewayReplayBindingV1({
  replayRoot,
});

if (
  binding.marker !==
    VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1 ||
  binding.replay_store_marker !== VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1 ||
  binding.production_gateway_replay_store_binding_source_verified !== true ||
  binding.production_gateway_replay_store_binding_verified !== false ||
  binding.runtime_route_active !== false ||
  binding.public_submission_open !== false
) {
  fail("inactive_gateway_binding_contract_mismatch");
}

const rootStat = fs.lstatSync(replayRoot);
if (
  !rootStat.isDirectory() ||
  rootStat.isSymbolicLink() ||
  (rootStat.mode & 0o077) !== 0
) {
  fail("inactive_gateway_replay_root_custody_invalid");
}
const uid = typeof process.getuid === "function" ? process.getuid() : null;
const gid = typeof process.getgid === "function" ? process.getgid() : null;
if (uid === null || rootStat.uid !== uid) {
  fail("inactive_gateway_replay_root_uid_mismatch");
}

const status = Object.freeze({
  marker: VOID_ECONOMIC_EPOCH2_INACTIVE_PUBLIC_SUBMISSION_GATEWAY_RUNTIME_V1,
  version: 1,
  status: "INACTIVE_PRODUCTION_GATEWAY_REPLAY_BINDING_READY",
  service_identity: SERVICE_IDENTITY,
  hostname: os.hostname(),
  pid: process.pid,
  uid,
  gid,
  node_exec_path: process.execPath,
  working_directory: process.cwd(),
  chain_id: 2050,
  execution_epoch: 2,
  replay_root: replayRoot,
  replay_root_realpath: fs.realpathSync.native(replayRoot),
  replay_root_dev: String(rootStat.dev),
  replay_root_ino: String(rootStat.ino),
  replay_root_uid: rootStat.uid,
  replay_root_gid: rootStat.gid,
  replay_root_mode: (rootStat.mode & 0o777).toString(8).padStart(3, "0"),
  gateway_binding_marker:
    VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1,
  durable_replay_store_marker: VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1,
  production_gateway_replay_store_binding_source_verified: true,
  production_gateway_replay_store_binding_verified: false,
  runtime_route_active: false,
  public_submission_open: false,
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

const pending =
  statusPath + ".pending." + String(process.pid);
fs.writeFileSync(pending, JSON.stringify(status, null, 2) + "\n", {
  encoding: "utf8",
  mode: 0o600,
  flag: "wx",
});
fs.renameSync(pending, statusPath);

const cleanup = () => {
  try {
    const current = JSON.parse(fs.readFileSync(statusPath, "utf8"));
    if (current?.pid === process.pid) fs.unlinkSync(statusPath);
  } catch (voidInactiveGatewayCleanupError) {
    void voidInactiveGatewayCleanupError;
  }
};

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    cleanup();
    process.exit(0);
  });
}
process.on("exit", cleanup);

console.log(VOID_ECONOMIC_EPOCH2_INACTIVE_PUBLIC_SUBMISSION_GATEWAY_RUNTIME_V1);
console.log("status=INACTIVE_PRODUCTION_GATEWAY_REPLAY_BINDING_READY");
console.log("service_identity=" + SERVICE_IDENTITY);
console.log("runtime_route_active=false");
console.log("public_submission_open=false");
console.log("authoritative_chain2050_write=false");
console.log("funds_movement=false");

setInterval(() => {}, 60_000);
