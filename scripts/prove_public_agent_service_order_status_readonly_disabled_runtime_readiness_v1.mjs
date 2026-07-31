#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  DECISION_MARKER,
  evaluateDisabledRuntimeReadinessV1,
} from "../tools/void-public-agent-service-order-status-readonly-disabled-runtime-readiness-v1.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const examplePath = path.join(
  repoRoot,
  "examples",
  "public-agent-service-order-status-readonly-disabled-runtime-readiness-v1.example.json",
);
const schemaPath = path.join(
  repoRoot,
  "schemas",
  "public-agent-service-order-status-readonly-disabled-runtime-readiness-v1.schema.json",
);
const toolPath = path.join(
  repoRoot,
  "tools",
  "void-public-agent-service-order-status-readonly-disabled-runtime-readiness-v1.mjs",
);

function fixture() {
  return {
    marker:
      "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_DISABLED_RUNTIME_READINESS_V1_BASELINE",
    version: 1,
    timestamp_utc: "2026-07-31T08:45:33Z",
    lane: {
      branch:
        "feat/public-agent-service-order-status-readonly-disabled-runtime-readiness-v1",
      base_commit: "c382b9ced970bab3b6f5399144aaa38647ef06c2",
      worktree: "/home/example/readiness",
      canonical_main: "c382b9ced970bab3b6f5399144aaa38647ef06c2",
      canonical_main_unchanged: true,
      readiness_worktree_unchanged: true,
    },
    service: {
      name: "void-node-live.service",
      before: { LoadState: "loaded", ActiveState: "active", SubState: "running" },
      after: { LoadState: "loaded", ActiveState: "active", SubState: "running" },
      main_pid_stable: true,
      restart_count_stable: true,
      invocation_stable: true,
    },
    configuration: {
      enable_env: { present: false, value: null, explicitly_enabled: false },
      source_root_env: { present: false, absolute: false, sha256: null },
      max_bytes_env: { present: false, value: null },
      configuration_written: false,
    },
    http: {
      discovery: { health: { status: 200 } },
      ready: { status: 200 },
      order_status_probe: { status: 404 },
      integration_disabled: true,
      order_status_marker_absent: true,
    },
    boundary: {
      service_environment_exact_keys_read: true,
      token_bytes_read: false,
      source_data_read: false,
      source_data_written: false,
      configuration_written: false,
      live_http_route_registered: false,
      server_mount_modified: false,
      network_listener_created: false,
      authenticated_submission_post: false,
      provider_selection: false,
      provider_authentication: false,
      quote_acceptance: false,
      payment_execution: false,
      work_dispatch: false,
      work_credit_write: false,
      runtime_modified: false,
      service_restarted: false,
      deployment_performed: false,
    },
  };
}

const decision = evaluateDisabledRuntimeReadinessV1(fixture());
const example = JSON.parse(await readFile(examplePath, "utf8"));
assert.deepEqual(example, decision);
assert.equal(decision.marker, DECISION_MARKER);
assert.equal(decision.ready_for_disabled_deployment, true);
assert.equal(decision.ready_for_activation, false);
console.log("example_exact_green=true");

for (const value of Object.values(decision.evidence)) {
  assert.equal(value, true);
}
assert.equal(decision.authority.receipt_read, true);
for (const [key, value] of Object.entries(decision.authority)) {
  if (key !== "receipt_read") {
    assert.equal(value, false, key);
  }
}
console.log("evidence_and_authority_green=true");

for (const [label, mutate] of [
  ["enable", (value) => {
    value.configuration.enable_env.present = true;
    value.configuration.enable_env.value = "1";
    value.configuration.enable_env.explicitly_enabled = true;
  }],
  ["route", (value) => { value.http.order_status_probe.status = 200; }],
  ["marker", (value) => { value.http.order_status_marker_absent = false; }],
  ["restart", (value) => { value.service.restart_count_stable = false; }],
  ["runtime", (value) => { value.boundary.runtime_modified = true; }],
]) {
  const value = structuredClone(fixture());
  mutate(value);
  assert.throws(
    () => evaluateDisabledRuntimeReadinessV1(value),
    /unexpected_/,
    label,
  );
}
console.log("unsafe_baseline_refusal_green=true");

const schema = JSON.parse(await readFile(schemaPath, "utf8"));
assert.equal(schema.properties.marker.const, DECISION_MARKER);
assert.equal(schema.properties.ready_for_disabled_deployment.const, true);
assert.equal(schema.properties.ready_for_activation.const, false);
assert.equal(schema.properties.authority.properties.activation.const, false);
console.log("schema_contract_green=true");

const temporary = await mkdtemp(
  path.join(os.tmpdir(), "void-disabled-runtime-readiness-v1-"),
);
try {
  const inputPath = path.join(temporary, "baseline.json");
  const bytes = Buffer.from(`${JSON.stringify(fixture(), null, 2)}\n`);
  await writeFile(inputPath, bytes);
  const before = await readFile(inputPath);
  const result = spawnSync(
    process.execPath,
    [toolPath, "evaluate", "--input", inputPath],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), decision);
  assert.deepEqual(await readFile(inputPath), before);
  console.log("cli_and_source_bytes_unchanged_green=true");
} finally {
  await rm(temporary, { recursive: true, force: true });
}

const toolText = await readFile(toolPath, "utf8");
for (const prohibited of [
  "writeFile",
  "appendFile",
  "createWriteStream",
  "node:http",
  "node:https",
  ".listen(",
  "createServer",
  "systemctl",
  "child_process",
]) {
  assert.equal(toolText.includes(prohibited), false, prohibited);
}
console.log("no_runtime_or_deployment_capability_green=true");
console.log("configuration_written=false");
console.log("live_http_route_registered=false");
console.log("service_restarted=false");
console.log("deployment_performed=false");
console.log(
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_DISABLED_RUNTIME_READINESS_V1_PROOF_GREEN=true",
);
