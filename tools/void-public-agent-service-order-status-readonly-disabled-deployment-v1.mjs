#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MECHANISM_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_DISABLED_DEPLOYMENT_V1_MECHANISM_V7";
export const PACKET_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_DISABLED_DEPLOYMENT_V1_PACKET";
export const VERSION = 1;
export const SERVICE = "void-node-live.service";
export const RUNTIME_ENTRY = "src/index.ts";
export const RESTART_COMMAND =
  "systemctl --user restart void-node-live.service";

const ACTIVATION_BLOCKERS = [
  "explicit_enable_configuration_not_authorized",
  "absolute_source_root_not_configured",
  "post_restart_disabled_runtime_proof_required",
];

const POST_RESTART_REQUIREMENTS = [
  "service_loaded_active_running",
  "new_service_invocation",
  "order_status_enable_env_absent",
  "order_status_source_root_env_absent",
  "order_status_max_bytes_env_absent",
  "health_http_200",
  "ready_http_200",
  "order_status_probe_http_404",
  "order_status_marker_absent",
  "runtime_entry_src_index_ts_exact_target_bytes",
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

function expectSha(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    fail(`invalid_sha256_${label}`);
  }
}

function expectCommit(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/.test(value)) {
    fail(`invalid_commit_${label}`);
  }
}

export function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
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
    canonical_build: false,
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

function validateMechanism(receipt) {
  if (receipt === null || typeof receipt !== "object" || Array.isArray(receipt)) {
    fail("invalid_receipt");
  }

  expect(receipt, "marker", MECHANISM_MARKER);
  expect(receipt, "version", VERSION);
  expect(
    receipt,
    "lane.branch",
    "feat/public-agent-service-order-status-readonly-disabled-deployment-v1",
  );
  expect(receipt, "lane.lane_unique_commit_count", 0);
  expect(receipt, "lane.readiness_closeout_cleanup_verified", true);
  expect(receipt, "lane.v4_runner_artifact_superseded", true);
  expect(receipt, "lane.v4_receipt_marker_verified", true);
  expect(receipt, "lane.clean_after_realign", true);
  expect(receipt, "lane.unchanged_during_inspection", true);

  const targetCommit = get(receipt, "lane.current_main");
  expectCommit(targetCommit, "current_main");
  expect(receipt, "lane.origin_main", targetCommit);
  expect(receipt, "lane.origin_main_final", targetCommit);
  expect(receipt, "lane.head_after_realign", targetCommit);
  expect(receipt, "lane.local_branch_after_realign", targetCommit);

  expect(receipt, "service.name", SERVICE);
  expect(receipt, "service.before.LoadState", "loaded");
  expect(receipt, "service.before.ActiveState", "active");
  expect(receipt, "service.before.SubState", "running");
  expect(receipt, "service.after.LoadState", "loaded");
  expect(receipt, "service.after.ActiveState", "active");
  expect(receipt, "service.after.SubState", "running");
  expect(receipt, "service.process_started_before_current_main", true);

  const fragmentSha = get(receipt, "service.fragment.sha256");
  const execStartSha = get(receipt, "service.exec_start_sha256");
  expectSha(fragmentSha, "service_fragment");
  expectSha(execStartSha, "service_exec_start");

  expect(receipt, "configuration.enable_env_present", false);
  expect(receipt, "configuration.source_root_env_present", false);
  expect(receipt, "configuration.max_bytes_env_present", false);
  expect(receipt, "configuration.configuration_written", false);

  expect(receipt, "http.health.status", 200);
  expect(receipt, "http.ready.status", 200);
  expect(receipt, "http.order_status_probe.status", 404);
  expect(receipt, "http.integration_disabled", true);
  expect(receipt, "http.order_status_marker_absent", true);

  expect(
    receipt,
    "deployment_mechanism.runtime_entry_relative_path",
    RUNTIME_ENTRY,
  );
  expect(
    receipt,
    "deployment_mechanism.runtime_entry_outside_node_modules",
    true,
  );
  expect(
    receipt,
    "deployment_mechanism.runner_dependency_artifact_excluded",
    true,
  );
  expect(
    receipt,
    "deployment_mechanism.superseded_v4_artifact_relative_path",
    "node_modules/tsx/dist/preflight.cjs",
  );
  expect(
    receipt,
    "deployment_mechanism.on_disk_runtime_entry_matches_exact_main",
    true,
  );
  expect(receipt, "deployment_mechanism.disposable_build_green", true);
  expect(receipt, "deployment_mechanism.readiness_proof_green", true);
  expect(receipt, "deployment_mechanism.http_integration_proof_green", true);
  expect(
    receipt,
    "deployment_mechanism.service_restart_required_to_load_current_main",
    true,
  );
  expect(
    receipt,
    "deployment_mechanism.restart_command",
    RESTART_COMMAND,
  );

  const liveEntrySha = get(
    receipt,
    "deployment_mechanism.live_runtime_entry_sha256",
  );
  const rehearsalEntrySha = get(
    receipt,
    "deployment_mechanism.rehearsal_runtime_entry_sha256",
  );
  expectSha(liveEntrySha, "live_runtime_entry");
  expectSha(rehearsalEntrySha, "rehearsal_runtime_entry");
  if (liveEntrySha !== rehearsalEntrySha) {
    fail("runtime_entry_sha_mismatch");
  }

  const liveEntryBytes = get(
    receipt,
    "deployment_mechanism.live_runtime_entry_bytes",
  );
  const rehearsalEntryBytes = get(
    receipt,
    "deployment_mechanism.rehearsal_runtime_entry_bytes",
  );
  if (
    !Number.isSafeInteger(liveEntryBytes)
    || liveEntryBytes <= 0
    || liveEntryBytes !== rehearsalEntryBytes
  ) {
    fail("runtime_entry_byte_mismatch");
  }

  const selectionReason = get(
    receipt,
    "deployment_mechanism.runtime_entry_selection_reason",
  );
  if (
    typeof selectionReason !== "string"
    || !selectionReason.startsWith("preferred_application_entry:")
  ) {
    fail("invalid_runtime_entry_selection_reason");
  }

  expect(
    receipt,
    "decision.ready_to_build_disabled_deployment_packet",
    true,
  );
  expect(receipt, "decision.ready_for_disabled_deployment", true);
  expect(receipt, "decision.ready_for_activation", false);

  for (const key of [
    "commit_created",
    "push_performed",
    "pull_request_created",
    "canonical_build_performed",
    "configuration_written",
    "live_http_route_registered",
    "server_mount_modified",
    "network_listener_created",
    "source_data_read",
    "source_data_written",
    "authenticated_submission_post",
    "token_bytes_read",
    "provider_selection",
    "provider_authentication",
    "quote_acceptance",
    "payment_execution",
    "work_dispatch",
    "work_credit_write",
    "runtime_modified",
    "service_restarted",
    "deployment_performed",
    "activation_performed",
  ]) {
    expect(receipt, `boundary.${key}`, false);
  }

  return {
    receipt,
    targetCommit,
    fragmentSha,
    execStartSha,
    runtimeEntrySha: liveEntrySha,
    runtimeEntryBytes: liveEntryBytes,
    httpPort: get(receipt, "http.port"),
  };
}

export function evaluateDisabledDeploymentV1(input) {
  const validated = validateMechanism(input);

  if (
    !Number.isSafeInteger(validated.httpPort)
    || validated.httpPort < 1
    || validated.httpPort > 65535
  ) {
    fail("invalid_http_port");
  }

  const preconditions = {
    canonical_main_and_origin_main_frozen: true,
    deployment_lane_has_no_unique_commits: true,
    readiness_closeout_verified: true,
    v4_runner_artifact_superseded: true,
    service_loaded_active_running: true,
    existing_process_predates_target_commit: true,
    order_status_configuration_absent: true,
    health_200: true,
    ready_200: true,
    order_status_404: true,
    order_status_marker_absent: true,
    runtime_entry_is_repo_local_src_index_ts: true,
    runner_dependency_artifact_excluded: true,
    live_entry_matches_exact_main_rehearsal: true,
    disposable_build_green: true,
    readiness_proof_green: true,
    http_integration_proof_green: true,
  };

  const target = {
    commit: validated.targetCommit,
    service_name: SERVICE,
    service_fragment_sha256: validated.fragmentSha,
    service_exec_start_sha256: validated.execStartSha,
    runtime_entry_relative_path: RUNTIME_ENTRY,
    runtime_entry_sha256: validated.runtimeEntrySha,
    runtime_entry_bytes: validated.runtimeEntryBytes,
    http_port: validated.httpPort,
  };

  const deploymentScope = {
    canonical_build_required: false,
    service_restart_required: true,
    restart_command: RESTART_COMMAND,
    configuration_write: false,
    activation: false,
  };

  const basis = {
    marker: PACKET_MARKER,
    version: VERSION,
    input_mechanism_receipt_sha256: sha256Canonical(validated.receipt),
    target,
    preconditions,
    deployment_scope: deploymentScope,
    post_restart_requirements: POST_RESTART_REQUIREMENTS,
    ready_for_disabled_deployment: true,
    ready_for_activation: false,
    activation_blockers: ACTIVATION_BLOCKERS,
    authority: authority(),
  };

  return {
    marker: PACKET_MARKER,
    version: VERSION,
    deployment_id: `voidaosdp1_${sha256Canonical(basis)}`,
    input_mechanism_receipt_sha256:
      basis.input_mechanism_receipt_sha256,
    target,
    preconditions,
    deployment_scope: deploymentScope,
    post_restart_requirements: [...POST_RESTART_REQUIREMENTS],
    ready_for_disabled_deployment: true,
    ready_for_activation: false,
    activation_blockers: [...ACTIVATION_BLOCKERS],
    authority: basis.authority,
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 3 || args[0] !== "evaluate" || args[1] !== "--input") {
    fail("usage_evaluate_--input");
  }

  const inputPath = path.resolve(args[2]);
  const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  process.stdout.write(
    `${canonicalJson(evaluateDisabledDeploymentV1(input))}\n`,
  );
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`HOLD: ${error.message}\n`);
    process.exitCode = 1;
  });
}
