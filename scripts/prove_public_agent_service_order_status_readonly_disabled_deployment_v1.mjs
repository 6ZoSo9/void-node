#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  PACKET_MARKER,
  evaluateDisabledDeploymentV1,
} from "../tools/void-public-agent-service-order-status-readonly-disabled-deployment-v1.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const examplePath = path.join(
  repoRoot,
  "examples",
  "public-agent-service-order-status-readonly-disabled-deployment-v1.example.json",
);
const schemaPath = path.join(
  repoRoot,
  "schemas",
  "public-agent-service-order-status-readonly-disabled-deployment-v1.schema.json",
);
const toolPath = path.join(
  repoRoot,
  "tools",
  "void-public-agent-service-order-status-readonly-disabled-deployment-v1.mjs",
);

function fixture() {
  return {
    marker:
      "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_DISABLED_DEPLOYMENT_V1_MECHANISM_V7",
    version: 1,
    timestamp_utc: "2026-07-31T12:05:39Z",
    lane: {
      branch:
        "feat/public-agent-service-order-status-readonly-disabled-deployment-v1",
      reservation_base_commit:
        "853cbadf3573be6e5bed2021d8e3bb11c0bffa8a",
      head_before_realign:
        "3c5ae398366a959c198096f2051ae37cd64e4e7e",
      current_main:
        "3c5ae398366a959c198096f2051ae37cd64e4e7e",
      origin_main:
        "3c5ae398366a959c198096f2051ae37cd64e4e7e",
      origin_main_final:
        "3c5ae398366a959c198096f2051ae37cd64e4e7e",
      head_after_realign:
        "3c5ae398366a959c198096f2051ae37cd64e4e7e",
      local_branch_after_realign:
        "3c5ae398366a959c198096f2051ae37cd64e4e7e",
      lane_unique_commit_count: 0,
      readiness_closeout_cleanup_verified: true,
      v4_runner_artifact_superseded: true,
      v4_receipt_marker_verified: true,
      clean_after_realign: true,
      unchanged_during_inspection: true,
    },
    service: {
      name: "void-node-live.service",
      before: {
        LoadState: "loaded",
        ActiveState: "active",
        SubState: "running",
      },
      after: {
        LoadState: "loaded",
        ActiveState: "active",
        SubState: "running",
      },
      process_started_before_current_main: true,
      fragment: {
        sha256:
          "c3d3d869164774a9b350840a72934cbd1964a8d62e2a8f3f281d78b760f4e967",
      },
      exec_start_sha256:
        "718cad67a66813fbcc1ba5560905ce7b3677d255e9c736e478a9972e17ad0f5a",
    },
    configuration: {
      enable_env_present: false,
      source_root_env_present: false,
      max_bytes_env_present: false,
      configuration_written: false,
    },
    http: {
      port: 4100,
      health: { status: 200 },
      ready: { status: 200 },
      order_status_probe: { status: 404 },
      integration_disabled: true,
      order_status_marker_absent: true,
    },
    deployment_mechanism: {
      runtime_entry_relative_path: "src/index.ts",
      live_runtime_entry_sha256:
        "21cad5bc4863c78d4a17e8f4289f4dba833fcbe6d98e708edd7bae5c1bbed7c4",
      live_runtime_entry_bytes: 3849108,
      rehearsal_runtime_entry_sha256:
        "21cad5bc4863c78d4a17e8f4289f4dba833fcbe6d98e708edd7bae5c1bbed7c4",
      rehearsal_runtime_entry_bytes: 3849108,
      on_disk_runtime_entry_matches_exact_main: true,
      runtime_entry_selection_reason:
        "preferred_application_entry:src/index.ts",
      runtime_entry_outside_node_modules: true,
      runner_dependency_artifact_excluded: true,
      superseded_v4_artifact_relative_path:
        "node_modules/tsx/dist/preflight.cjs",
      disposable_build_green: true,
      readiness_proof_green: true,
      http_integration_proof_green: true,
      service_restart_required_to_load_current_main: true,
      restart_command:
        "systemctl --user restart void-node-live.service",
    },
    decision: {
      ready_to_build_disabled_deployment_packet: true,
      ready_for_disabled_deployment: true,
      ready_for_activation: false,
    },
    boundary: {
      commit_created: false,
      push_performed: false,
      pull_request_created: false,
      canonical_build_performed: false,
      configuration_written: false,
      live_http_route_registered: false,
      server_mount_modified: false,
      network_listener_created: false,
      source_data_read: false,
      source_data_written: false,
      authenticated_submission_post: false,
      token_bytes_read: false,
      provider_selection: false,
      provider_authentication: false,
      quote_acceptance: false,
      payment_execution: false,
      work_dispatch: false,
      work_credit_write: false,
      runtime_modified: false,
      service_restarted: false,
      deployment_performed: false,
      activation_performed: false,
    },
  };
}

const packet = evaluateDisabledDeploymentV1(fixture());
const example = JSON.parse(await readFile(examplePath, "utf8"));

assert.deepEqual(example, packet);
assert.equal(packet.marker, PACKET_MARKER);
assert.equal(packet.ready_for_disabled_deployment, true);
assert.equal(packet.ready_for_activation, false);
assert.equal(packet.target.runtime_entry_relative_path, "src/index.ts");
assert.equal(packet.deployment_scope.canonical_build_required, false);
assert.equal(packet.deployment_scope.service_restart_required, true);
assert.equal(packet.deployment_scope.configuration_write, false);
assert.equal(packet.deployment_scope.activation, false);
console.log("example_and_scope_exact_green=true");

for (const value of Object.values(packet.preconditions)) {
  assert.equal(value, true);
}
assert.equal(packet.authority.receipt_read, true);
for (const [key, value] of Object.entries(packet.authority)) {
  if (key !== "receipt_read") {
    assert.equal(value, false, key);
  }
}
console.log("preconditions_and_authority_green=true");

for (const [label, mutate] of [
  ["activation", (value) => {
    value.decision.ready_for_activation = true;
  }],
  ["enable", (value) => {
    value.configuration.enable_env_present = true;
  }],
  ["route", (value) => {
    value.http.order_status_probe.status = 200;
  }],
  ["runner", (value) => {
    value.deployment_mechanism.runtime_entry_relative_path =
      "node_modules/tsx/dist/preflight.cjs";
  }],
  ["entry_sha", (value) => {
    value.deployment_mechanism.rehearsal_runtime_entry_sha256 =
      "0".repeat(64);
  }],
  ["restart", (value) => {
    value.boundary.service_restarted = true;
  }],
]) {
  const value = structuredClone(fixture());
  mutate(value);
  assert.throws(
    () => evaluateDisabledDeploymentV1(value),
    /unexpected_|runtime_entry_sha_mismatch/,
    label,
  );
}
console.log("unsafe_mechanism_refusal_green=true");

const schema = JSON.parse(await readFile(schemaPath, "utf8"));
assert.equal(schema.properties.marker.const, PACKET_MARKER);
assert.equal(schema.properties.ready_for_disabled_deployment.const, true);
assert.equal(schema.properties.ready_for_activation.const, false);
assert.equal(
  schema.properties.deployment_scope.properties.activation.const,
  false,
);
assert.equal(
  schema.properties.authority.properties.service_restart.const,
  false,
);
console.log("schema_contract_green=true");

const temporary = await mkdtemp(
  path.join(os.tmpdir(), "void-disabled-deployment-v1-"),
);
try {
  const inputPath = path.join(temporary, "mechanism.json");
  const bytes = Buffer.from(`${JSON.stringify(fixture(), null, 2)}\n`);
  await writeFile(inputPath, bytes);
  const before = await readFile(inputPath);
  const result = spawnSync(
    process.execPath,
    [toolPath, "evaluate", "--input", inputPath],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), packet);
  assert.deepEqual(await readFile(inputPath), before);
  console.log("cli_and_source_bytes_unchanged_green=true");
} finally {
  await rm(temporary, { recursive: true, force: true });
}

const toolText = await readFile(toolPath, "utf8");
for (const prohibited of [
  "node:child_process",
  "spawnSync",
  "execFile",
  "writeFile",
  "appendFile",
  "createWriteStream",
  "node:http",
  "node:https",
  ".listen(",
  "createServer",
]) {
  assert.equal(toolText.includes(prohibited), false, prohibited);
}
console.log("non_executable_packet_tool_green=true");
console.log("configuration_written=false");
console.log("service_restarted=false");
console.log("deployment_performed=false");
console.log("activation_performed=false");
console.log(
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_DISABLED_DEPLOYMENT_V1_PROOF_GREEN=true",
);
