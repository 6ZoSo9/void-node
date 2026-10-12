#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const BASELINE_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_DISABLED_RUNTIME_READINESS_V1_BASELINE";
export const DECISION_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_DISABLED_RUNTIME_READINESS_V1_DECISION";

const BLOCKERS = [
  "post_deployment_disabled_runtime_proof_required",
  "explicit_enable_configuration_not_authorized",
  "absolute_source_root_not_configured",
];

function fail(code) {
  throw new Error(code);
}

function get(root, dotted) {
  let value = root;
  for (const key of dotted.split(".")) {
    if (value === null || typeof value !== "object" || !(key in value)) {
      fail(`missing_${dotted}`);
    }
    value = value[key];
  }
  return value;
}

function expect(root, dotted, expected) {
  const actual = get(root, dotted);
  if (!Object.is(actual, expected)) {
    fail(`unexpected_${dotted}`);
  }
}

export function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map(
      (key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256Canonical(value) {
  return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function authority() {
  return {
    receipt_read: true,
    configuration_write: false,
    live_http_route_registration: false,
    server_mount: false,
    network_listener: false,
    source_data_read: false,
    source_data_write: false,
    authenticated_submission_post: false,
    token_byte_read: false,
    provider_selection: false,
    provider_authentication: false,
    quote_acceptance: false,
    payment_execution: false,
    work_dispatch: false,
    work_credit_write: false,
    runtime_mutation: false,
    service_restart: false,
    deployment_execution: false,
    activation: false,
  };
}

export function evaluateDisabledRuntimeReadinessV1(receipt) {
  if (receipt === null || typeof receipt !== "object" || Array.isArray(receipt)) {
    fail("invalid_receipt");
  }

  expect(receipt, "marker", BASELINE_MARKER);
  expect(receipt, "version", 1);
  expect(receipt, "service.name", "void-node-live.service");
  expect(receipt, "service.before.LoadState", "loaded");
  expect(receipt, "service.before.ActiveState", "active");
  expect(receipt, "service.before.SubState", "running");
  expect(receipt, "service.after.LoadState", "loaded");
  expect(receipt, "service.after.ActiveState", "active");
  expect(receipt, "service.after.SubState", "running");
  expect(receipt, "service.main_pid_stable", true);
  expect(receipt, "service.restart_count_stable", true);
  expect(receipt, "service.invocation_stable", true);

  expect(receipt, "configuration.enable_env.present", false);
  expect(receipt, "configuration.enable_env.value", null);
  expect(receipt, "configuration.enable_env.explicitly_enabled", false);
  expect(receipt, "configuration.source_root_env.present", false);
  expect(receipt, "configuration.source_root_env.absolute", false);
  expect(receipt, "configuration.source_root_env.sha256", null);
  expect(receipt, "configuration.max_bytes_env.present", false);
  expect(receipt, "configuration.max_bytes_env.value", null);
  expect(receipt, "configuration.configuration_written", false);

  expect(receipt, "http.discovery.health.status", 200);
  expect(receipt, "http.ready.status", 200);
  expect(receipt, "http.order_status_probe.status", 404);
  expect(receipt, "http.integration_disabled", true);
  expect(receipt, "http.order_status_marker_absent", true);

  expect(receipt, "lane.canonical_main_unchanged", true);
  expect(receipt, "lane.readiness_worktree_unchanged", true);

  expect(receipt, "boundary.service_environment_exact_keys_read", true);
  for (const key of [
    "token_bytes_read",
    "source_data_read",
    "source_data_written",
    "configuration_written",
    "live_http_route_registered",
    "server_mount_modified",
    "network_listener_created",
    "authenticated_submission_post",
    "provider_selection",
    "provider_authentication",
    "quote_acceptance",
    "payment_execution",
    "work_dispatch",
    "work_credit_write",
    "runtime_modified",
    "service_restarted",
    "deployment_performed",
  ]) {
    expect(receipt, `boundary.${key}`, false);
  }

  const evidence = {
    service_active_running: true,
    health_200: true,
    ready_200: true,
    integration_disabled: true,
    enable_env_absent: true,
    source_root_absent: true,
    max_bytes_absent: true,
    order_status_404: true,
    order_status_marker_absent: true,
    pid_stable: true,
    restart_count_stable: true,
    invocation_stable: true,
    canonical_main_unchanged: true,
    readiness_worktree_unchanged: true,
  };

  const basis = {
    marker: DECISION_MARKER,
    version: 1,
    input_receipt_sha256: sha256Canonical(receipt),
    ready_for_disabled_deployment: true,
    ready_for_activation: false,
    activation_blockers: BLOCKERS,
    evidence,
    authority: authority(),
  };

  return {
    marker: DECISION_MARKER,
    version: 1,
    readiness_id: `voidaosrr1_${sha256Canonical(basis)}`,
    input_receipt_sha256: basis.input_receipt_sha256,
    ready_for_disabled_deployment: true,
    ready_for_activation: false,
    activation_blockers: [...BLOCKERS],
    evidence,
    authority: basis.authority,
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 3 || args[0] !== "evaluate" || args[1] !== "--input") {
    fail("usage_evaluate_--input");
  }
  const inputPath = path.resolve(args[2]);
  const receipt = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  process.stdout.write(`${canonicalJson(evaluateDisabledRuntimeReadinessV1(receipt))}\n`);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`HOLD: ${error.message}\n`);
    process.exitCode = 1;
  });
}
