#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_INACTIVE_RUNTIME_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_INACTIVE_RUNTIME_CONFIRMATION_V1,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_INACTIVE_RUNTIME_V1,
  prepareVoidEconomicEpoch2ProductionGatewayInactiveRuntimeV1,
} from "../tools/void-economic-epoch2-production-gateway-inactive-runtime-v1.mjs";

const sourceFile = path.resolve(
  "tools/void-economic-epoch2-production-gateway-inactive-runtime-v1.mjs",
);

function fixture() {
  const parent = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-e2-gateway-inactive-"),
  );
  fs.chmodSync(parent, 0o700);
  const replayRoot = path.join(parent, "replay");
  const statusDir = path.join(parent, "status");
  fs.mkdirSync(replayRoot, { mode: 0o700 });
  fs.mkdirSync(statusDir, { mode: 0o700 });
  return { parent, replayRoot, statusDir };
}

function prepare(f, filename = "runtime.json", overrides = {}) {
  return prepareVoidEconomicEpoch2ProductionGatewayInactiveRuntimeV1({
    confirmation:
      overrides.confirmation ??
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_INACTIVE_RUNTIME_CONFIRMATION_V1,
    replayRoot: overrides.replayRoot ?? f.replayRoot,
    statusFile:
      overrides.statusFile ?? path.join(f.statusDir, filename),
    observedAtUtc:
      overrides.observedAtUtc ?? "2030-01-01T00:00:00Z",
    runtimeSourceFile: overrides.runtimeSourceFile ?? sourceFile,
    hostname: overrides.hostname ?? "proof-host",
    pid: overrides.pid ?? 4242,
    uid:
      overrides.uid ??
      (typeof process.getuid === "function" ? process.getuid() : 1000),
  });
}

function rejects(fn, code) {
  assert.throws(
    fn,
    (error) => error instanceof Error && error.message === code,
    code,
  );
}

assert.equal(
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_INACTIVE_RUNTIME_V1,
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_INACTIVE_RUNTIME_V1",
);
assert.equal(
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_INACTIVE_RUNTIME_CONFIRMATION_V1,
  "startVoidEconomicEpoch2ProductionGatewayInactiveRuntime",
);

{
  const nonexistent = path.join(
    os.tmpdir(),
    "void-e2-gateway-inactive-missing-" + String(process.pid),
  );
  rejects(
    () =>
      prepareVoidEconomicEpoch2ProductionGatewayInactiveRuntimeV1({
        confirmation: "wrong",
        replayRoot: nonexistent,
        statusFile: nonexistent + ".json",
        observedAtUtc: "2030-01-01T00:00:00Z",
        runtimeSourceFile: sourceFile,
        hostname: "proof-host",
        pid: 4242,
        uid:
          typeof process.getuid === "function"
            ? process.getuid()
            : 1000,
      }),
    "inactive_runtime_confirmation_required",
  );
}

{
  const f = fixture();
  try {
    const first = prepare(f, "runtime-a.json");
    assert.equal(first.receipt.version, 1);
    assert.equal(
      first.receipt.status,
      "INACTIVE_RUNTIME_REPLAY_ROOT_BOUND_ROUTE_CLOSED",
    );
    assert.equal(first.receipt.chain_id, 2050);
    assert.equal(first.receipt.execution_epoch, 2);
    assert.equal(first.receipt.hostname, "proof-host");
    assert.equal(first.receipt.pid, 4242);
    assert.equal(
      first.receipt.runtime_process_binding_constructed,
      true,
    );
    assert.equal(
      first.receipt.binding_constructed_from_exact_replay_root,
      true,
    );
    assert.equal(
      first.receipt.replay_root_identity_stable_during_binding,
      true,
    );
    assert.equal(
      first.receipt.production_gateway_replay_store_binding_source_verified,
      true,
    );
    assert.equal(first.receipt.runtime_service_identity_verified, false);
    assert.equal(first.receipt.same_uid_process_model_verified, false);
    assert.equal(
      first.receipt.production_gateway_replay_store_binding_verified,
      false,
    );
    assert.equal(first.receipt.runtime_route_active, false);
    assert.equal(first.receipt.public_submission_open, false);
    assert.equal(first.receipt.network_listener_created, false);
    assert.equal(first.receipt.rpc_call, false);
    assert.equal(first.receipt.transaction_submission, false);
    assert.equal(first.receipt.transaction_broadcast, false);
    assert.equal(first.receipt.authoritative_chain2050_write, false);
    assert.equal(first.receipt.migration_authorized, false);
    assert.equal(first.receipt.public_activation_authorized, false);
    assert.equal(first.receipt.funds_movement, false);
    assert.match(first.receipt.receipt_id, /^voide2grt1_[0-9a-f]{64}$/u);
    assert.match(first.receipt.runtime_source_sha256, /^[0-9a-f]{64}$/u);
    assert.equal(first.receipt.replay_root.path, f.replayRoot);
    assert.equal(first.receipt.replay_root.mode, "0700");

    const statusStat = fs.lstatSync(first.status_file);
    assert.equal(statusStat.isFile(), true);
    assert.equal(statusStat.isSymbolicLink(), false);
    assert.equal(statusStat.mode & 0o777, 0o600);
    assert.match(first.status_file_sha256, /^[0-9a-f]{64}$/u);

    const parsed = JSON.parse(fs.readFileSync(first.status_file, "utf8"));
    assert.equal(parsed.receipt_id, first.receipt.receipt_id);
    assert.equal(
      parsed.production_gateway_replay_store_binding_verified,
      false,
    );

    const second = prepare(f, "runtime-b.json");
    assert.equal(second.receipt.receipt_id, first.receipt.receipt_id);
    assert.equal(
      second.receipt.runtime_source_sha256,
      first.receipt.runtime_source_sha256,
    );

    rejects(
      () => prepare(f, "runtime-a.json"),
      "status_file_create_failed",
    );
  } finally {
    fs.rmSync(f.parent, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    fs.chmodSync(f.replayRoot, 0o755);
    rejects(
      () => prepare(f),
      "replay_root_custody_invalid",
    );
  } finally {
    fs.rmSync(f.parent, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    const realRoot = f.replayRoot + "-real";
    fs.renameSync(f.replayRoot, realRoot);
    fs.symlinkSync(realRoot, f.replayRoot);
    rejects(
      () => prepare(f),
      "replay_root_custody_invalid",
    );
  } finally {
    fs.rmSync(f.parent, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    fs.chmodSync(f.statusDir, 0o755);
    rejects(
      () => prepare(f),
      "status_parent_custody_invalid",
    );
  } finally {
    fs.rmSync(f.parent, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    rejects(
      () => prepare(f, "runtime.json", {
        observedAtUtc: "2030-01-01T00:00:00.000Z",
      }),
      "observed_at_utc_invalid",
    );
  } finally {
    fs.rmSync(f.parent, { recursive: true, force: true });
  }
}

for (const [key, value] of Object.entries(
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_INACTIVE_RUNTIME_AUTHORITY_V1,
)) {
  if (
    [
      "source_runtime_only",
      "replay_root_metadata_read",
      "private_status_receipt_write",
      "process_signal_wait",
    ].includes(key)
  ) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(sourceFile, "utf8");
assert.match(
  source,
  /createVoidEconomicEpoch2ProductionGatewayReplayBindingV1/,
);
assert.match(
  source,
  /binding_constructed_from_exact_replay_root: true/,
);
assert.match(source, /runtime_route_active: false/);
assert.match(source, /public_submission_open: false/);
assert.match(source, /network_listener_created: false/);
assert.doesNotMatch(source, /\.admit\s*\(/);
for (const forbidden of [
  "createServer(",
  ".listen(",
  "fetch(",
  "JsonRpcProvider(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_INACTIVE_RUNTIME_V1_PROOF_GREEN",
);
console.log("exact_replay_root_bound=true");
console.log("private_status_receipt_mode=0600");
console.log("runtime_process_binding_constructed=true");
console.log("network_listener_created=false");
console.log("runtime_route_active=false");
console.log("public_submission_open=false");
console.log("runtime_service_identity_verified=false");
console.log("same_uid_process_model_verified=false");
console.log("production_gateway_replay_store_binding_verified=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("authoritative_chain2050_write=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
console.log("funds_movement=false");
