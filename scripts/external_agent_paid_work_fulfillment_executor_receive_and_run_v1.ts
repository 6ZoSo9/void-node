#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  ADVANCE_CONFIRMATION,
  advancePlan,
  buildEvent,
  canonicalJson,
  inspectPlan,
  sha256File,
} from "./external_agent_paid_work_fulfillment_orchestrator_v1.ts";

import {
  PRIVATE_PACKAGE_MARKER,
  SANITIZED_RECEIPT_MARKER as TRANSFER_RECEIPT_MARKER,
  TRANSFER_AUTHORITY,
} from "./external_agent_paid_work_fulfillment_ticket_package_transfer_executor_v1.ts";

export const EXECUTOR_PROFILE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_EXECUTOR_RECEIVE_RUN_PROFILE_V1";
export const PARTICIPANT_RUN_PROFILE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_PARTICIPANT_RUN_PROFILE_V1";
export const OPERATION_STATE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_EXECUTOR_RECEIVE_RUN_OPERATION_STATE_V1";
export const RAW_RESULT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_RAW_PARTICIPANT_RUN_RESULT_V1";
export const SANITIZED_RECEIPT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_EXECUTOR_RUN_RECEIPT_V1";
export const RETURN_PACKAGE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_PARTICIPANT_RECEIPT_RETURN_PACKAGE_V1";
export const EXECUTE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_EXECUTOR_RECEIVE_AND_RUN_EXECUTE_V1";
export const RECOVER_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_EXECUTOR_RECEIVE_AND_RUN_RECOVER_V1";
export const INSPECTION_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_EXECUTOR_RECEIVE_AND_RUN_INSPECTION_V1";

export const EXECUTE_CONFIRMATION =
  "execute-external-agent-paid-work-fulfillment-executor-receive-and-run-v1";
export const RECOVER_CONFIRMATION =
  "recover-external-agent-paid-work-fulfillment-executor-receive-and-run-v1";

export const RECEIVE_RUN_AUTHORITY = Object.freeze({
  received_package_read: true,
  private_execution_state_write: true,
  private_plan_advance: true,
  participant_cli_materialize: true,
  participant_cli_execute: true,
  ticket_consumption: true,
  participant_receipt_write: true,
  return_package_write: true,
  next_event_write: true,
  participant_receipt_acceptance: false,
  local_wc_ledger_write: false,
  payment_transfer: false,
  wc_to_void_settlement: false,
  wallet_or_signer_access: false,
  service_restart: false,
  deployment: false,
});

const TOKEN = /^wcep1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{20,200}$/;
const TOKEN_SCAN = /wcep1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{20,200}/;
const HEX64 = /^[0-9a-f]{64}$/;
const HEX32 = /^[0-9a-f]{32}$/;
const NODE_ID = /^[0-9a-f]{32}$/;
const IPV4 = /^(?:25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})(?:\.(?:25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})){3}$/;
const ID = /^[A-Za-z0-9._:-]{4,240}$/;
const JSON_POINTER = /^(?:\/(?:[^~/]|~0|~1)*)+$/;
const PLACEHOLDERS = new Set([
  "{participant_cli_path}",
  "{operator_ticket_path}",
  "{participant_receipt_path}",
  "{execution_dir}",
]);

const FILES = Object.freeze({
  state: "executor-run-operation-state-v1.json",
  executorPlan: "advanced-plan-executor-receipt-expected-v1.json",
  executorProfile: "executor-receive-run-profile-v1.json",
  runProfile: "participant-run-profile-v1.json",
  participantCli: "participant-cli-v1",
  operatorTicket: "operator-ticket-v1.json",
  rawResult: "raw-participant-run-result-v1.json",
  participantReceipt: "participant-receipt-v1.json",
  receipt: "sanitized-executor-run-receipt-v1.json",
  nextEvent: "adapter-finalization-planned-event-v1.json",
  returnPackage: "participant-receipt-return-package-v1.json",
});

const PHASES = Object.freeze([
  "prepared",
  "running",
  "participant_receipt_persisted",
  "complete",
  "ambiguous_after_run_attempt",
]);

function fail(message) {
  throw new Error(message);
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function object(value, label) {
  if (!isObject(value)) fail(`${label} must be an object`);
  return value;
}

function string(value, label, pattern = null, max = 8192) {
  if (typeof value !== "string" || value.length < 1 || value.length > max) {
    fail(`${label} must be a non-empty string`);
  }
  if (pattern && !pattern.test(value)) fail(`${label} format mismatch`);
  return value;
}

function integer(value, label, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    fail(`${label} must be an integer in [${min}, ${max}]`);
  }
  return value;
}

function bool(value, label) {
  if (typeof value !== "boolean") fail(`${label} must be boolean`);
  return value;
}

function utc(value, label) {
  const text = string(value, label, null, 64);
  if (!text.endsWith("Z") || !Number.isFinite(Date.parse(text))) {
    fail(`${label} must be an ISO-8601 UTC timestamp`);
  }
  return text;
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function noToken(value, label) {
  if (TOKEN_SCAN.test(JSON.stringify(value))) {
    fail(`${label} contains a raw capability token`);
  }
}

function authority(value) {
  if (canonicalJson(value) !== canonicalJson(RECEIVE_RUN_AUTHORITY)) {
    fail("receive-and-run authority mismatch");
  }
}

function safeFile(file, label, maxBytes = 32 * 1024 * 1024) {
  const metadata = fs.lstatSync(file);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    fail(`${label} is not a regular non-symlink file`);
  }
  if (metadata.size > maxBytes) fail(`${label} is too large`);
}

function safeJson(file, label) {
  safeFile(file, label);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeExclusive(file, value, mode = 0o600) {
  const payload =
    typeof value === "string"
      ? value
      : JSON.stringify(value, null, 2) + "\n";
  const descriptor = fs.openSync(
    file,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL,
    mode,
  );
  try {
    fs.writeFileSync(descriptor, payload, "utf8");
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  fs.chmodSync(file, mode);
}

function writeAtomic(file, value) {
  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;
  writeExclusive(temp, value, 0o600);
  fs.renameSync(temp, file);
  fs.chmodSync(file, 0o600);
}

function ensureOutputDir(outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: false, mode: 0o700 });
    fs.chmodSync(outputDir, 0o700);
    return;
  }
  const metadata = fs.lstatSync(outputDir);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    fail("executor-run output path is not a safe directory");
  }
  if ((metadata.mode & 0o777) !== 0o700) {
    fail("executor-run output directory mode must be 0700");
  }
}

function decodePointerToken(value) {
  return value.replace(/~1/g, "/").replace(/~0/g, "~");
}

function pointerGet(value, pointer, label) {
  string(pointer, `${label} pointer`, JSON_POINTER, 1024);
  let current = value;
  for (const raw of pointer.slice(1).split("/")) {
    const token = decodePointerToken(raw);
    if (Array.isArray(current)) {
      if (!/^(?:0|[1-9][0-9]*)$/.test(token)) {
        fail(`${label} array pointer token mismatch`);
      }
      current = current[Number(token)];
    } else if (isObject(current)) {
      current = current[token];
    } else {
      fail(`${label} pointer cannot traverse non-container`);
    }
    if (current === undefined) fail(`${label} pointer does not resolve`);
  }
  return current;
}

function validateBindingMap(value) {
  const bindings = object(value, "participant run receipt_bindings");
  const keys = [
    "receipt_id",
    "ticket_id",
    "account",
    "executor_node_id",
    "task_class",
    "dataset_id",
    "expected_input_hash",
    "participant_cli_sha256",
    "ticket_consumed_once",
    "token_artifact_deleted",
    "wc_before",
    "wc_after",
    "wc_delta",
  ];
  if (canonicalJson(Object.keys(bindings).sort()) !== canonicalJson([...keys].sort())) {
    fail("participant run receipt_bindings key set mismatch");
  }
  for (const key of keys) {
    string(bindings[key], `participant run receipt_bindings.${key}`, JSON_POINTER);
  }
  return bindings;
}

function validateExecutorProfile(value, privatePackage) {
  const profile = object(value, "executor profile");
  if (profile.marker !== EXECUTOR_PROFILE_MARKER || profile.version !== 1) {
    fail("executor profile marker/version mismatch");
  }
  noToken(profile, "executor profile");
  utc(profile.created_at_utc, "executor profile created_at_utc");
  const tailscaleIp = string(profile.tailscale_ip, "executor profile tailscale_ip", IPV4);
  const nodeId = string(profile.node_id, "executor profile node_id", NODE_ID);
  const httpBase = string(profile.http_base, "executor profile http_base", /^https?:\/\//, 2048);
  if (
    bool(profile.identity_verified, "executor profile identity_verified") !== true ||
    bool(profile.coordinator_enabled, "executor profile coordinator_enabled") !== false ||
    bool(profile.executor_enabled, "executor profile executor_enabled") !== true
  ) {
    fail("executor profile role/identity mismatch");
  }
  string(profile.verification_method, "executor profile verification_method", ID, 240);
  if (
    tailscaleIp !== privatePackage.destination.tailscale_ip ||
    nodeId !== privatePackage.destination.node_id
  ) {
    fail("executor profile/private package destination mismatch");
  }
  return { profile, tailscaleIp, nodeId, httpBase };
}

function validateRunProfile(value) {
  const profile = object(value, "participant run profile");
  if (profile.marker !== PARTICIPANT_RUN_PROFILE_MARKER || profile.version !== 1) {
    fail("participant run profile marker/version mismatch");
  }
  noToken(profile, "participant run profile");
  const runnerId = string(profile.runner_id, "participant run profile runner_id", ID, 160);
  const successExitCode = integer(
    profile.success_exit_code,
    "participant run profile success_exit_code",
    0,
    255,
  );
  const timeoutMs = integer(
    profile.timeout_ms,
    "participant run profile timeout_ms",
    1000,
    3600000,
  );
  const expectedReceiptMarker = string(
    profile.expected_receipt_marker,
    "participant run profile expected_receipt_marker",
    /^[A-Z][A-Z0-9_]{12,220}$/,
    240,
  );
  if (!Array.isArray(profile.command_argv) || profile.command_argv.length < 2 || profile.command_argv.length > 40) {
    fail("participant run profile command_argv size mismatch");
  }
  const commandArgv = profile.command_argv.map((item, index) =>
    string(item, `participant run profile command_argv[${index}]`, null, 4096),
  );
  const joined = commandArgv.join("\n");
  for (const placeholder of PLACEHOLDERS) {
    const count = joined.split(placeholder).length - 1;
    if (count !== 1) {
      fail(`participant run profile must contain ${placeholder} exactly once`);
    }
  }
  const stripped = [...PLACEHOLDERS].reduce(
    (value, placeholder) => value.replaceAll(placeholder, ""),
    joined,
  );
  if (/\{[^}]+\}/.test(stripped)) {
    fail("participant run profile contains unknown placeholder");
  }
  const receiptBindings = validateBindingMap(profile.receipt_bindings);
  return {
    profile,
    runnerId,
    successExitCode,
    timeoutMs,
    expectedReceiptMarker,
    commandArgv,
    receiptBindings,
  };
}

function validatePrivatePackage(packagePath) {
  safeFile(packagePath, "received private executor package", 32 * 1024 * 1024);
  const packageSha = sha256File(packagePath);
  const value = safeJson(packagePath, "received private executor package");
  if (value.marker !== PRIVATE_PACKAGE_MARKER || value.version !== 1) {
    fail("private executor package marker/version mismatch");
  }
  utc(value.created_at_utc, "private executor package created_at_utc");
  string(value.transfer_operation_id, "private executor package transfer_operation_id", /^voidapwftransferop1_[0-9a-f]{64}$/);
  string(value.ticket_issue_operation_id, "private executor package ticket_issue_operation_id", /^voidapwfissueop1_[0-9a-f]{64}$/);
  string(value.fulfillment_id, "private executor package fulfillment_id", /^voidapwfv1_[0-9a-f]{64}$/);
  string(value.package_plan_id, "private executor package package_plan_id", /^voidapwfplan1_[0-9a-f]{64}$/);
  const destination = object(value.destination, "private executor package destination");
  string(destination.tailscale_ip, "private executor package destination tailscale_ip", IPV4);
  string(destination.node_id, "private executor package destination node_id", NODE_ID);
  string(destination.transport_destination, "private executor package destination transport_destination", null, 512);
  string(destination.identity_receipt_sha256, "private executor package destination identity_receipt_sha256", HEX64);
  const participantCli = object(value.participant_cli, "private executor package participant_cli");
  string(participantCli.file_name, "private executor package participant_cli file_name", /^[A-Za-z0-9._-]{1,240}$/);
  string(participantCli.sha256, "private executor package participant_cli sha256", HEX64);
  string(participantCli.bytes_base64, "private executor package participant_cli bytes_base64", /^[A-Za-z0-9+/=]+$/, 16 * 1024 * 1024);
  let participantBytes;
  try {
    participantBytes = Buffer.from(participantCli.bytes_base64, "base64");
  } catch {
    fail("private executor package participant_cli base64 decode failed");
  }
  if (sha256Text(participantBytes) !== participantCli.sha256) {
    fail("private executor package participant CLI SHA mismatch");
  }
  const operatorTicket = object(value.operator_ticket, "private executor package operator_ticket");
  const ticket = object(operatorTicket.ticket, "private executor package operator_ticket.ticket");
  string(ticket.ticket_id, "operator ticket ticket_id", HEX32);
  string(ticket.capability_token, "operator ticket capability_token", TOKEN, 512);
  string(ticket.account, "operator ticket account", ID);
  string(ticket.executor_node_id, "operator ticket executor_node_id", NODE_ID);
  string(ticket.task_class, "operator ticket task_class", ID);
  string(ticket.dataset_id, "operator ticket dataset_id", ID);
  string(ticket.expected_input_hash, "operator ticket expected_input_hash", HEX64);
  integer(ticket.issued_at_ms, "operator ticket issued_at_ms", 1, Number.MAX_SAFE_INTEGER);
  integer(ticket.expires_at_ms, "operator ticket expires_at_ms", 1, Number.MAX_SAFE_INTEGER);
  integer(ticket.ttl_ms, "operator ticket ttl_ms", 60000, 86400000);
  integer(ticket.max_uses, "operator ticket max_uses", 1, 1);
  integer(ticket.fixed_award_wc, "operator ticket fixed_award_wc", 1, 1000000);
  if (ticket.expires_at_ms - ticket.issued_at_ms !== ticket.ttl_ms) {
    fail("operator ticket expiry arithmetic mismatch");
  }
  if (
    ticket.executor_node_id !== destination.node_id ||
    value.requirements?.ticket_max_uses !== 1 ||
    value.requirements?.executor_receipt_required !== true ||
    value.requirements?.raw_capability_token_private !== true ||
    value.requirements?.work_execution_not_authorized_by_transfer !== true
  ) {
    fail("private executor package requirements/destination mismatch");
  }
  return {
    value,
    packageSha,
    participantBytes,
    participantCli,
    operatorTicket,
    ticket,
    destination,
  };
}

function validateTransferReceipt(value, privatePackage, packageSha) {
  const receipt = object(value, "ticket transfer receipt");
  if (receipt.marker !== TRANSFER_RECEIPT_MARKER || receipt.version !== 1) {
    fail("ticket transfer receipt marker/version mismatch");
  }
  noToken(receipt, "ticket transfer receipt");
  utc(receipt.created_at_utc, "ticket transfer receipt created_at_utc");
  if (
    receipt.operation_id !== privatePackage.value.transfer_operation_id ||
    receipt.ticket_issue_operation_id !== privatePackage.value.ticket_issue_operation_id ||
    receipt.fulfillment_id !== privatePackage.value.fulfillment_id ||
    receipt.package_plan_id !== privatePackage.value.package_plan_id
  ) {
    fail("ticket transfer receipt/private package identity mismatch");
  }
  const ticket = object(receipt.ticket, "ticket transfer receipt ticket");
  const sourceTicket = privatePackage.ticket;
  for (const key of [
    "ticket_id",
    "account",
    "executor_node_id",
    "expires_at_ms",
    "max_uses",
    "fixed_award_wc",
  ]) {
    if (ticket[key] !== sourceTicket[key]) {
      fail(`ticket transfer receipt ${key} mismatch`);
    }
  }
  if (ticket.capability_token_sha256 !== sha256Text(sourceTicket.capability_token)) {
    fail("ticket transfer receipt token hash mismatch");
  }
  if (
    receipt.package?.private_package_sha256 !== packageSha ||
    receipt.package?.participant_cli_sha256 !== privatePackage.participantCli.sha256 ||
    receipt.package?.raw_capability_token_present_in_private_package !== true ||
    receipt.package?.raw_capability_token_present_in_receipt !== false
  ) {
    fail("ticket transfer receipt package binding mismatch");
  }
  if (
    receipt.destination?.tailscale_ip !== privatePackage.destination.tailscale_ip ||
    receipt.destination?.node_id !== privatePackage.destination.node_id
  ) {
    fail("ticket transfer receipt destination mismatch");
  }
  if (
    receipt.verification?.ticket_transferred_once !== true ||
    receipt.verification?.destination_identity_verified !== true ||
    receipt.verification?.participant_cli_hash_verified !== true ||
    receipt.verification?.raw_capability_token_printed !== false ||
    receipt.verification?.raw_capability_token_in_sanitized_receipt !== false ||
    receipt.verification?.remote_work_execution !== false ||
    receipt.verification?.participant_receipt_acceptance !== false ||
    receipt.verification?.wc_ledger_write !== false
  ) {
    fail("ticket transfer receipt verification mismatch");
  }
  if (canonicalJson(receipt.authority) !== canonicalJson(TRANSFER_AUTHORITY)) {
    fail("ticket transfer receipt authority mismatch");
  }
  return receipt;
}

function validatePlanAndEvent(planValue, eventValue, privatePackage, transferReceipt) {
  const plan = object(planValue, "ticket-package-planned plan");
  const inspection = inspectPlan(plan);
  if (
    inspection.state !== "ticket_package_planned" ||
    inspection.next_transition !== "executor_receipt_expected" ||
    inspection.plan_id !== privatePackage.value.package_plan_id ||
    inspection.fulfillment_id !== privatePackage.value.fulfillment_id
  ) {
    fail("ticket-package-planned plan/private package mismatch");
  }
  const source = plan.request;
  const ticket = privatePackage.ticket;
  if (
    source.binding.destination_wc_account !== ticket.account ||
    source.execution_contract.executor_node_id !== ticket.executor_node_id ||
    source.submission.task_class !== ticket.task_class ||
    source.execution_contract.fixed_award_wc !== ticket.fixed_award_wc ||
    source.execution_contract.runtime.participant_cli_sha256 !==
      privatePackage.participantCli.sha256
  ) {
    fail("ticket-package-planned plan/operator ticket mismatch");
  }
  const event = object(eventValue, "executor-receipt-expected event");
  if (
    event.fulfillment_id !== inspection.fulfillment_id ||
    event.expected_revision !== inspection.revision ||
    event.from_state !== "ticket_package_planned" ||
    event.to_state !== "executor_receipt_expected" ||
    event.evidence?.ticket_id !== ticket.ticket_id ||
    event.evidence?.ticket_package_sha256 !== privatePackage.packageSha ||
    event.evidence?.executor_node_id !== ticket.executor_node_id ||
    event.evidence?.transfer_operation_id !== transferReceipt.operation_id ||
    event.evidence?.raw_capability_token_in_evidence !== false ||
    event.evidence?.remote_work_execution_started !== false
  ) {
    fail("executor-receipt-expected event mismatch");
  }
  const advanced = advancePlan(plan, event, ADVANCE_CONFIRMATION);
  if (advanced.duplicate !== false) {
    fail("executor-receipt-expected event unexpectedly duplicate");
  }
  const executorPlan = advanced.plan;
  const executorInspection = inspectPlan(executorPlan);
  if (
    executorInspection.state !== "executor_receipt_expected" ||
    executorInspection.next_transition !== "adapter_finalization_planned"
  ) {
    fail("private executor plan state mismatch");
  }
  return { plan, inspection, event, executorPlan, executorInspection };
}

function validateInputs(input, startedAtUtc) {
  const privatePackage = validatePrivatePackage(input.received_private_package_path);
  const transferReceipt = validateTransferReceipt(
    safeJson(input.transfer_receipt_path, "ticket transfer receipt"),
    privatePackage,
    privatePackage.packageSha,
  );
  const planData = validatePlanAndEvent(
    safeJson(input.package_plan_path, "ticket-package-planned plan"),
    safeJson(input.executor_receipt_event_path, "executor-receipt-expected event"),
    privatePackage,
    transferReceipt,
  );
  const executorProfile = validateExecutorProfile(
    safeJson(input.executor_profile_path, "executor profile"),
    privatePackage.value,
  );
  const runProfile = validateRunProfile(
    safeJson(input.participant_run_profile_path, "participant run profile"),
  );
  const startMs = Date.parse(utc(startedAtUtc, "started_at_utc"));
  if (privatePackage.ticket.expires_at_ms <= startMs) {
    fail("ticket is expired at participant execution start");
  }
  return {
    privatePackage,
    transferReceipt,
    planData,
    executorProfile,
    runProfile,
  };
}

function defaultHostInspector() {
  const stdout = execFileSync("tailscale", ["ip", "-4"], {
    encoding: "utf8",
    timeout: 10000,
    maxBuffer: 1024 * 1024,
  });
  const tailscaleIp = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  return { tailscale_ip: tailscaleIp };
}

function verifyLocalHost(executorProfile, hostInspection) {
  const observed = object(hostInspection, "host inspection");
  const observedIp = string(observed.tailscale_ip, "host inspection tailscale_ip", IPV4);
  if (observedIp !== executorProfile.tailscaleIp) {
    fail("local host Tailscale identity mismatch");
  }
  return observedIp;
}

function operationId(data) {
  return `voidapwfrunop1_${sha256Text(canonicalJson({
    version: 1,
    transfer_operation_id: data.transferReceipt.operation_id,
    ticket_id: data.privatePackage.ticket.ticket_id,
    executor_plan_id: data.planData.executorPlan.plan_id,
    private_package_sha256: data.privatePackage.packageSha,
    participant_cli_sha256: data.privatePackage.participantCli.sha256,
    executor_profile_sha256: sha256Text(canonicalJson(data.executorProfile.profile)),
    participant_run_profile_sha256: sha256Text(canonicalJson(data.runProfile.profile)),
  }))}`;
}

function statePath(outputDir) {
  return path.join(outputDir, FILES.state);
}

function validateState(state, expectedOperationId) {
  if (
    state.marker !== OPERATION_STATE_MARKER ||
    state.version !== 1 ||
    state.operation_id !== expectedOperationId ||
    !PHASES.includes(state.phase)
  ) {
    fail("executor-run operation state identity/phase mismatch");
  }
  noToken(state, "executor-run operation state");
  authority(state.authority);
  return state;
}

function setState(outputDir, state, patch, atUtc) {
  const next = { ...state, ...patch, updated_at_utc: atUtc };
  validateState(next, state.operation_id);
  writeAtomic(statePath(outputDir), next);
  return next;
}

function initialize(outputDir, input, data, operationIdValue, createdAtUtc) {
  ensureOutputDir(outputDir);
  if (fs.existsSync(statePath(outputDir))) {
    return validateState(
      safeJson(statePath(outputDir), "executor-run operation state"),
      operationIdValue,
    );
  }

  const executorPlanPath = path.join(outputDir, FILES.executorPlan);
  const executorProfilePath = path.join(outputDir, FILES.executorProfile);
  const runProfilePath = path.join(outputDir, FILES.runProfile);
  const participantCliPath = path.join(outputDir, FILES.participantCli);
  const operatorTicketPath = path.join(outputDir, FILES.operatorTicket);

  writeExclusive(executorPlanPath, data.planData.executorPlan);
  writeExclusive(executorProfilePath, data.executorProfile.profile);
  writeExclusive(runProfilePath, data.runProfile.profile);
  writeExclusive(participantCliPath, data.privatePackage.participantBytes.toString("utf8"), 0o700);
  if (sha256File(participantCliPath) !== data.privatePackage.participantCli.sha256) {
    fail("materialized participant CLI SHA mismatch");
  }
  writeExclusive(operatorTicketPath, data.privatePackage.operatorTicket);

  const state = {
    marker: OPERATION_STATE_MARKER,
    version: 1,
    created_at_utc: createdAtUtc,
    updated_at_utc: createdAtUtc,
    operation_id: operationIdValue,
    phase: "prepared",
    transfer_operation_id: data.transferReceipt.operation_id,
    ticket_issue_operation_id: data.privatePackage.value.ticket_issue_operation_id,
    fulfillment_id: data.privatePackage.value.fulfillment_id,
    ticket_id: data.privatePackage.ticket.ticket_id,
    source_private_package_path: input.received_private_package_path,
    source_private_package_sha256: data.privatePackage.packageSha,
    transfer_receipt_path: input.transfer_receipt_path,
    transfer_receipt_sha256: sha256File(input.transfer_receipt_path),
    executor_plan_path: executorPlanPath,
    executor_plan_sha256: sha256File(executorPlanPath),
    executor_profile_path: executorProfilePath,
    executor_profile_sha256: sha256File(executorProfilePath),
    participant_run_profile_path: runProfilePath,
    participant_run_profile_sha256: sha256File(runProfilePath),
    participant_cli_path: participantCliPath,
    participant_cli_sha256: sha256File(participantCliPath),
    operator_ticket_path: operatorTicketPath,
    operator_ticket_sha256: sha256File(operatorTicketPath),
    raw_result_path: null,
    participant_receipt_path: null,
    sanitized_receipt_path: null,
    next_event_path: null,
    return_package_path: null,
    participant_cli_invoked: false,
    ticket_consumed: false,
    token_artifacts_deleted: false,
    participant_receipt_acceptance: false,
    local_wc_ledger_write: false,
    authority: RECEIVE_RUN_AUTHORITY,
  };
  writeExclusive(statePath(outputDir), state);
  return state;
}

function expandArgv(commandArgv, paths) {
  return commandArgv.map((value) =>
    value
      .replace("{participant_cli_path}", paths.participantCliPath)
      .replace("{operator_ticket_path}", paths.operatorTicketPath)
      .replace("{participant_receipt_path}", paths.participantReceiptPath)
      .replace("{execution_dir}", paths.executionDir),
  );
}

async function commandParticipantTransport({ runProfile, paths }) {
  const argv = expandArgv(runProfile.commandArgv, paths);
  const command = argv[0];
  const args = argv.slice(1);
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("participant command timed out"));
    }, runProfile.timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
      if (stdout.length > 1024 * 1024) {
        child.kill("SIGKILL");
        reject(new Error("participant stdout exceeded limit"));
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
      if (stderr.length > 1024 * 1024) {
        child.kill("SIGKILL");
        reject(new Error("participant stderr exceeded limit"));
      }
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (exitCode, signal) => {
      clearTimeout(timer);
      let receipt = null;
      if (fs.existsSync(paths.participantReceiptPath)) {
        try {
          receipt = safeJson(paths.participantReceiptPath, "participant receipt output");
        } catch (error) {
          reject(error);
          return;
        }
      }
      resolve({
        exit_code: exitCode,
        signal,
        stdout,
        stderr,
        receipt,
        expanded_argv_sha256: sha256Text(canonicalJson(argv)),
      });
    });
  });
}

function rawResult(operationIdValue, transportResult, atUtc) {
  return {
    marker: RAW_RESULT_MARKER,
    version: 1,
    created_at_utc: atUtc,
    operation_id: operationIdValue,
    exit_code: transportResult.exit_code,
    signal: transportResult.signal ?? null,
    stdout: transportResult.stdout ?? "",
    stderr: transportResult.stderr ?? "",
    expanded_argv_sha256: transportResult.expanded_argv_sha256,
    receipt: transportResult.receipt,
  };
}

function validateParticipantReceipt(receiptValue, data, runProfile) {
  const receipt = object(receiptValue, "participant receipt");
  if (receipt.marker !== runProfile.expectedReceiptMarker || receipt.version !== 1) {
    fail("participant receipt marker/version mismatch");
  }
  noToken(receipt, "participant receipt");
  const bindings = runProfile.receiptBindings;
  const values = {
    receipt_id: string(pointerGet(receipt, bindings.receipt_id, "participant receipt receipt_id"), "participant receipt receipt_id value", ID),
    ticket_id: string(pointerGet(receipt, bindings.ticket_id, "participant receipt ticket_id"), "participant receipt ticket_id value", HEX32),
    account: string(pointerGet(receipt, bindings.account, "participant receipt account"), "participant receipt account value", ID),
    executor_node_id: string(pointerGet(receipt, bindings.executor_node_id, "participant receipt executor_node_id"), "participant receipt executor_node_id value", NODE_ID),
    task_class: string(pointerGet(receipt, bindings.task_class, "participant receipt task_class"), "participant receipt task_class value", ID),
    dataset_id: string(pointerGet(receipt, bindings.dataset_id, "participant receipt dataset_id"), "participant receipt dataset_id value", ID),
    expected_input_hash: string(pointerGet(receipt, bindings.expected_input_hash, "participant receipt expected_input_hash"), "participant receipt expected_input_hash value", HEX64),
    participant_cli_sha256: string(pointerGet(receipt, bindings.participant_cli_sha256, "participant receipt participant_cli_sha256"), "participant receipt participant_cli_sha256 value", HEX64),
    ticket_consumed_once: bool(pointerGet(receipt, bindings.ticket_consumed_once, "participant receipt ticket_consumed_once"), "participant receipt ticket_consumed_once value"),
    token_artifact_deleted: bool(pointerGet(receipt, bindings.token_artifact_deleted, "participant receipt token_artifact_deleted"), "participant receipt token_artifact_deleted value"),
    wc_before: integer(pointerGet(receipt, bindings.wc_before, "participant receipt wc_before"), "participant receipt wc_before value", 0, 1000000000000),
    wc_after: integer(pointerGet(receipt, bindings.wc_after, "participant receipt wc_after"), "participant receipt wc_after value", 0, 1000000000000),
    wc_delta: integer(pointerGet(receipt, bindings.wc_delta, "participant receipt wc_delta"), "participant receipt wc_delta value", 1, 1000000),
  };
  const ticket = data.privatePackage.ticket;
  if (
    values.ticket_id !== ticket.ticket_id ||
    values.account !== ticket.account ||
    values.executor_node_id !== ticket.executor_node_id ||
    values.task_class !== ticket.task_class ||
    values.dataset_id !== ticket.dataset_id ||
    values.expected_input_hash !== ticket.expected_input_hash ||
    values.participant_cli_sha256 !== data.privatePackage.participantCli.sha256 ||
    values.ticket_consumed_once !== true ||
    values.token_artifact_deleted !== true ||
    values.wc_delta !== ticket.fixed_award_wc ||
    values.wc_after - values.wc_before !== values.wc_delta
  ) {
    fail("participant receipt semantic mismatch");
  }
  return { receipt, values };
}

function sanitizedReceipt(operationIdValue, data, receiptData, rawResultValue, atUtc) {
  return {
    marker: SANITIZED_RECEIPT_MARKER,
    version: 1,
    created_at_utc: atUtc,
    operation_id: operationIdValue,
    transfer_operation_id: data.transferReceipt.operation_id,
    ticket_issue_operation_id: data.privatePackage.value.ticket_issue_operation_id,
    fulfillment_id: data.privatePackage.value.fulfillment_id,
    executor_plan_id: data.planData.executorPlan.plan_id,
    participant_receipt_id: receiptData.values.receipt_id,
    ticket: {
      ticket_id: data.privatePackage.ticket.ticket_id,
      capability_token_sha256: sha256Text(data.privatePackage.ticket.capability_token),
      account: data.privatePackage.ticket.account,
      executor_node_id: data.privatePackage.ticket.executor_node_id,
      task_class: data.privatePackage.ticket.task_class,
      dataset_id: data.privatePackage.ticket.dataset_id,
      expected_input_hash: data.privatePackage.ticket.expected_input_hash,
      max_uses: data.privatePackage.ticket.max_uses,
      fixed_award_wc: data.privatePackage.ticket.fixed_award_wc,
    },
    execution: {
      participant_cli_sha256: data.privatePackage.participantCli.sha256,
      runner_id: data.runProfile.runnerId,
      expanded_argv_sha256: rawResultValue.expanded_argv_sha256,
      exit_code: rawResultValue.exit_code,
      participant_receipt_sha256: sha256Text(canonicalJson(receiptData.receipt)),
      wc_before: receiptData.values.wc_before,
      wc_after: receiptData.values.wc_after,
      wc_delta: receiptData.values.wc_delta,
    },
    verification: {
      explicit_confirmation_verified: true,
      local_executor_identity_verified: true,
      transfer_receipt_verified: true,
      participant_cli_hash_verified: true,
      participant_cli_invoked_once: true,
      ticket_consumed_once: true,
      token_artifact_deleted: true,
      raw_capability_token_printed: false,
      raw_capability_token_in_sanitized_receipt: false,
      participant_receipt_acceptance: false,
      local_wc_ledger_write: false,
    },
    authority: RECEIVE_RUN_AUTHORITY,
  };
}

function nextEvent(data, receiptPath, receiptData, operationIdValue, atUtc) {
  return buildEvent({
    fulfillment_id: data.planData.executorPlan.fulfillment_id,
    expected_revision: data.planData.executorPlan.revision,
    from_state: "executor_receipt_expected",
    to_state: "adapter_finalization_planned",
    occurred_at_utc: atUtc,
    evidence: {
      participant_receipt_sha256: sha256File(receiptPath),
      wc_before: receiptData.values.wc_before,
      wc_after: receiptData.values.wc_after,
      wc_delta: receiptData.values.wc_delta,
      ticket_consumed_once: true,
      executor_run_operation_id: operationIdValue,
      token_artifact_deleted: true,
      raw_capability_token_in_evidence: false,
    },
    nonce: `${operationIdValue}-adapter-finalization-planned`,
  });
}

function returnPackage(operationIdValue, data, participantReceipt, receiptValue, eventValue, atUtc) {
  return {
    marker: RETURN_PACKAGE_MARKER,
    version: 1,
    created_at_utc: atUtc,
    operation_id: operationIdValue,
    transfer_operation_id: data.transferReceipt.operation_id,
    ticket_issue_operation_id: data.privatePackage.value.ticket_issue_operation_id,
    fulfillment_id: data.privatePackage.value.fulfillment_id,
    executor_plan_id: data.planData.executorPlan.plan_id,
    ticket_id: data.privatePackage.ticket.ticket_id,
    participant_receipt: participantReceipt,
    sanitized_executor_run_receipt: receiptValue,
    adapter_finalization_planned_event: eventValue,
    requirements: {
      precision_receipt_acceptance_required: true,
      adapter_finalization_required: true,
      raw_capability_token_present: false,
      participant_receipt_acceptance_performed_on_executor: false,
      local_wc_ledger_write_performed: false,
    },
  };
}

function deleteTokenArtifacts(input, state) {
  for (const file of [input.received_private_package_path, state.operator_ticket_path]) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  return (
    !fs.existsSync(input.received_private_package_path) &&
    !fs.existsSync(state.operator_ticket_path)
  );
}

function finalize({ outputDir, input, data, state, rawResultValue, completedAtUtc }) {
  if (
    rawResultValue.marker !== RAW_RESULT_MARKER ||
    rawResultValue.version !== 1 ||
    rawResultValue.operation_id !== state.operation_id
  ) {
    fail("raw participant result identity mismatch");
  }
  if (
    rawResultValue.exit_code !== data.runProfile.successExitCode ||
    typeof rawResultValue.stdout !== "string" ||
    typeof rawResultValue.stderr !== "string" ||
    TOKEN_SCAN.test(rawResultValue.stdout) ||
    TOKEN_SCAN.test(rawResultValue.stderr)
  ) {
    fail("participant run result status/output mismatch");
  }
  string(rawResultValue.expanded_argv_sha256, "participant run expanded argv SHA", HEX64);
  const receiptData = validateParticipantReceipt(
    rawResultValue.receipt,
    data,
    data.runProfile,
  );

  const participantReceiptPath = path.join(outputDir, FILES.participantReceipt);
  if (!fs.existsSync(participantReceiptPath)) {
    writeExclusive(participantReceiptPath, receiptData.receipt);
  } else if (
    canonicalJson(safeJson(participantReceiptPath, "participant receipt")) !==
    canonicalJson(receiptData.receipt)
  ) {
    fail("existing participant receipt mismatch");
  }

  state = setState(
    outputDir,
    state,
    {
      phase: "participant_receipt_persisted",
      participant_receipt_path: participantReceiptPath,
      participant_receipt_sha256: sha256File(participantReceiptPath),
      participant_cli_invoked: true,
      ticket_consumed: true,
    },
    completedAtUtc,
  );

  const sanitizedPath = path.join(outputDir, FILES.receipt);
  const sanitized = sanitizedReceipt(
    state.operation_id,
    data,
    receiptData,
    rawResultValue,
    completedAtUtc,
  );
  noToken(sanitized, "sanitized executor run receipt");
  if (!fs.existsSync(sanitizedPath)) {
    writeExclusive(sanitizedPath, sanitized);
  } else if (
    canonicalJson(safeJson(sanitizedPath, "sanitized executor run receipt")) !==
    canonicalJson(sanitized)
  ) {
    fail("existing sanitized executor run receipt mismatch");
  }

  const nextEventPath = path.join(outputDir, FILES.nextEvent);
  const event = nextEvent(
    data,
    participantReceiptPath,
    receiptData,
    state.operation_id,
    completedAtUtc,
  );
  noToken(event, "adapter-finalization-planned event");
  if (!fs.existsSync(nextEventPath)) {
    writeExclusive(nextEventPath, event);
  } else if (
    canonicalJson(safeJson(nextEventPath, "adapter-finalization-planned event")) !==
    canonicalJson(event)
  ) {
    fail("existing adapter-finalization-planned event mismatch");
  }
  const compatibility = advancePlan(
    data.planData.executorPlan,
    event,
    ADVANCE_CONFIRMATION,
  );
  if (
    compatibility.duplicate !== false ||
    inspectPlan(compatibility.plan).state !== "adapter_finalization_planned"
  ) {
    fail("generated adapter-finalization-planned event is not orchestrator-compatible");
  }

  const returnPath = path.join(outputDir, FILES.returnPackage);
  const returnValue = returnPackage(
    state.operation_id,
    data,
    receiptData.receipt,
    sanitized,
    event,
    completedAtUtc,
  );
  noToken(returnValue, "participant receipt return package");
  if (!fs.existsSync(returnPath)) {
    writeExclusive(returnPath, returnValue);
  } else if (
    canonicalJson(safeJson(returnPath, "participant receipt return package")) !==
    canonicalJson(returnValue)
  ) {
    fail("existing participant receipt return package mismatch");
  }

  const tokenArtifactsDeleted = deleteTokenArtifacts(input, state);
  if (!tokenArtifactsDeleted) {
    fail("private token artifacts were not deleted");
  }

  state = setState(
    outputDir,
    state,
    {
      phase: "complete",
      completed_at_utc: completedAtUtc,
      sanitized_receipt_path: sanitizedPath,
      sanitized_receipt_sha256: sha256File(sanitizedPath),
      next_event_path: nextEventPath,
      next_event_sha256: sha256File(nextEventPath),
      return_package_path: returnPath,
      return_package_sha256: sha256File(returnPath),
      token_artifacts_deleted: true,
    },
    completedAtUtc,
  );

  return { state, sanitized, event, returnValue };
}

function inspection(outputDir) {
  const state = safeJson(statePath(outputDir), "executor-run operation state");
  validateState(state, state.operation_id);
  const files = {};
  for (const [key, name] of Object.entries(FILES)) {
    const file = path.join(outputDir, name);
    files[key] = {
      path: file,
      exists: fs.existsSync(file),
      sha256: fs.existsSync(file) ? sha256File(file) : null,
      mode: fs.existsSync(file)
        ? (fs.statSync(file).mode & 0o777).toString(8).padStart(4, "0")
        : null,
    };
  }
  for (const key of ["receipt", "nextEvent", "returnPackage", "state"]) {
    if (files[key].exists && TOKEN_SCAN.test(fs.readFileSync(files[key].path, "utf8"))) {
      fail(`${key} contains a raw capability token`);
    }
  }
  return {
    marker: INSPECTION_MARKER,
    valid: true,
    operation_id: state.operation_id,
    phase: state.phase,
    ticket_id: state.ticket_id,
    participant_cli_invoked: state.participant_cli_invoked,
    ticket_consumed: state.ticket_consumed,
    token_artifacts_deleted: state.token_artifacts_deleted,
    ambiguous_after_run_attempt:
      state.phase === "ambiguous_after_run_attempt" ||
      (state.phase === "running" && !files.rawResult.exists),
    duplicate_safe: state.phase === "complete",
    output_dir_mode_0700: (fs.statSync(outputDir).mode & 0o777) === 0o700,
    all_existing_json_files_mode_0600: Object.entries(files).every(
      ([key, entry]) => !entry.exists || key === "participantCli" || entry.mode === "0600",
    ),
    participant_cli_mode_0700:
      !files.participantCli.exists || files.participantCli.mode === "0700",
    raw_capability_token_printed: false,
    raw_capability_token_in_sanitized_receipt: false,
    participant_receipt_acceptance: false,
    local_wc_ledger_write: false,
    files,
    authority: RECEIVE_RUN_AUTHORITY,
  };
}

export async function executeExecutorReceiveAndRun(
  input,
  outputDir,
  confirmation,
  participantTransport = commandParticipantTransport,
  hostInspector = defaultHostInspector,
) {
  if (confirmation !== EXECUTE_CONFIRMATION) {
    fail("explicit executor receive-and-run confirmation mismatch");
  }

  if (fs.existsSync(statePath(outputDir))) {
    const existing = safeJson(statePath(outputDir), "executor-run operation state");
    if (existing.phase === "complete") {
      return {
        marker: EXECUTE_MARKER,
        operation_id: existing.operation_id,
        duplicate: true,
        recovered: false,
        phase: "complete",
        participant_cli_invoked: true,
        ticket_consumed: true,
        token_artifacts_deleted: true,
        raw_capability_token_printed: false,
        participant_receipt_acceptance: false,
        local_wc_ledger_write: false,
        inspection: inspection(outputDir),
      };
    }
  }

  const startedAtUtc = utc(input.started_at_utc, "started_at_utc");
  const data = validateInputs(input, startedAtUtc);
  verifyLocalHost(data.executorProfile, await hostInspector());
  const operationIdValue = operationId(data);
  let state = initialize(
    outputDir,
    input,
    data,
    operationIdValue,
    startedAtUtc,
  );

  if (state.phase === "complete") {
    return {
      marker: EXECUTE_MARKER,
      operation_id: operationIdValue,
      duplicate: true,
      recovered: false,
      phase: "complete",
      participant_cli_invoked: true,
      ticket_consumed: true,
      token_artifacts_deleted: true,
      raw_capability_token_printed: false,
      participant_receipt_acceptance: false,
      local_wc_ledger_write: false,
      inspection: inspection(outputDir),
    };
  }

  const rawResultPath = path.join(outputDir, FILES.rawResult);
  if (state.phase === "running" && !fs.existsSync(rawResultPath)) {
    state = setState(
      outputDir,
      state,
      {
        phase: "ambiguous_after_run_attempt",
        hold_reason: "participant_run_started_but_no_result_persisted",
      },
      startedAtUtc,
    );
    fail("ambiguous after participant execution attempt; automatic rerun is forbidden");
  }
  if (state.phase === "ambiguous_after_run_attempt") {
    fail("operation is ambiguous after participant execution attempt; recovery is required");
  }
  if (state.phase === "participant_receipt_persisted" || fs.existsSync(rawResultPath)) {
    const recoveredRaw = safeJson(rawResultPath, "raw participant run result");
    const finalized = finalize({
      outputDir,
      input,
      data,
      state,
      rawResultValue: recoveredRaw,
      completedAtUtc: startedAtUtc,
    });
    return {
      marker: EXECUTE_MARKER,
      operation_id: operationIdValue,
      duplicate: false,
      recovered: true,
      phase: finalized.state.phase,
      participant_cli_invoked: true,
      ticket_consumed: true,
      token_artifacts_deleted: true,
      raw_capability_token_printed: false,
      participant_receipt_acceptance: false,
      local_wc_ledger_write: false,
      inspection: inspection(outputDir),
    };
  }
  if (state.phase !== "prepared") {
    fail(`operation cannot execute from phase ${state.phase}`);
  }

  state = setState(
    outputDir,
    state,
    {
      phase: "running",
      run_attempt_started_at_utc: startedAtUtc,
      run_attempt_count: 1,
      participant_cli_invoked: true,
    },
    startedAtUtc,
  );

  const paths = {
    participantCliPath: state.participant_cli_path,
    operatorTicketPath: state.operator_ticket_path,
    participantReceiptPath: path.join(outputDir, FILES.participantReceipt),
    executionDir: outputDir,
  };

  let transportResult;
  try {
    transportResult = await participantTransport({
      runProfile: data.runProfile,
      paths,
      operation_id: operationIdValue,
    });
  } catch {
    setState(
      outputDir,
      state,
      {
        phase: "ambiguous_after_run_attempt",
        hold_reason: "participant_transport_threw_after_run_started",
      },
      startedAtUtc,
    );
    fail("participant transport failed after execution started; automatic rerun is forbidden");
  }

  const raw = rawResult(operationIdValue, transportResult, startedAtUtc);
  writeExclusive(rawResultPath, raw);

  if (raw.exit_code !== data.runProfile.successExitCode || !raw.receipt) {
    setState(
      outputDir,
      state,
      {
        phase: "ambiguous_after_run_attempt",
        raw_result_path: rawResultPath,
        raw_result_sha256: sha256File(rawResultPath),
        hold_reason: "participant_result_not_successful_or_receipt_missing",
      },
      startedAtUtc,
    );
    fail("participant run result is ambiguous or unsuccessful; recovery is required");
  }

  state = setState(
    outputDir,
    state,
    {
      raw_result_path: rawResultPath,
      raw_result_sha256: sha256File(rawResultPath),
    },
    startedAtUtc,
  );

  const finalized = finalize({
    outputDir,
    input,
    data,
    state,
    rawResultValue: raw,
    completedAtUtc: startedAtUtc,
  });

  return {
    marker: EXECUTE_MARKER,
    operation_id: operationIdValue,
    duplicate: false,
    recovered: false,
    phase: finalized.state.phase,
    participant_cli_invoked: true,
    ticket_consumed: true,
    token_artifacts_deleted: true,
    raw_capability_token_printed: false,
    participant_receipt_acceptance: false,
    local_wc_ledger_write: false,
    inspection: inspection(outputDir),
  };
}

export function recoverExecutorReceiveAndRun(input, outputDir, confirmation) {
  if (confirmation !== RECOVER_CONFIRMATION) {
    fail("explicit executor receive-and-run recovery confirmation mismatch");
  }
  const recoveredAtUtc = utc(input.recovered_at_utc, "recovered_at_utc");
  const data = validateInputs(input, recoveredAtUtc);
  const operationIdValue = operationId(data);
  ensureOutputDir(outputDir);
  let state = validateState(
    safeJson(statePath(outputDir), "executor-run operation state"),
    operationIdValue,
  );
  if (state.phase === "complete") {
    return {
      marker: RECOVER_MARKER,
      operation_id: operationIdValue,
      duplicate: true,
      recovered: false,
      phase: "complete",
      participant_cli_invoked: true,
      ticket_consumed: true,
      token_artifacts_deleted: true,
      raw_capability_token_printed: false,
      participant_receipt_acceptance: false,
      local_wc_ledger_write: false,
      inspection: inspection(outputDir),
    };
  }
  if (!["running", "ambiguous_after_run_attempt", "participant_receipt_persisted"].includes(state.phase)) {
    fail(`operation cannot recover from phase ${state.phase}`);
  }
  const recoveredRaw = safeJson(
    input.recovered_raw_result_path,
    "recovered raw participant result",
  );
  if (
    recoveredRaw.marker !== RAW_RESULT_MARKER ||
    recoveredRaw.version !== 1 ||
    recoveredRaw.operation_id !== operationIdValue
  ) {
    fail("recovered raw participant result identity mismatch");
  }
  const rawResultPath = path.join(outputDir, FILES.rawResult);
  if (!fs.existsSync(rawResultPath)) {
    writeExclusive(rawResultPath, recoveredRaw);
  } else if (
    canonicalJson(safeJson(rawResultPath, "raw participant result")) !==
    canonicalJson(recoveredRaw)
  ) {
    fail("existing raw participant result mismatch");
  }
  state = setState(
    outputDir,
    state,
    {
      raw_result_path: rawResultPath,
      raw_result_sha256: sha256File(rawResultPath),
    },
    recoveredAtUtc,
  );
  const finalized = finalize({
    outputDir,
    input,
    data,
    state,
    rawResultValue: recoveredRaw,
    completedAtUtc: recoveredAtUtc,
  });
  return {
    marker: RECOVER_MARKER,
    operation_id: operationIdValue,
    duplicate: false,
    recovered: true,
    phase: finalized.state.phase,
    participant_cli_invoked: true,
    ticket_consumed: true,
    token_artifacts_deleted: true,
    raw_capability_token_printed: false,
    participant_receipt_acceptance: false,
    local_wc_ledger_write: false,
    inspection: inspection(outputDir),
  };
}

export function inspectExecutorReceiveAndRun(outputDir) {
  return inspection(outputDir);
}

function parseArgs(items) {
  const result = {};
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item.startsWith("--")) fail(`unexpected argument: ${item}`);
    const key = item.slice(2);
    const next = items[index + 1];
    if (!next || next.startsWith("--")) {
      result[key] = true;
    } else {
      result[key] = next;
      index += 1;
    }
  }
  return result;
}

function requiredArg(args, key) {
  const value = args[key];
  if (typeof value !== "string" || !value) fail(`missing --${key}`);
  return value;
}

function inputFromArgs(args, timeKey) {
  return {
    received_private_package_path: requiredArg(args, "received-package"),
    transfer_receipt_path: requiredArg(args, "transfer-receipt"),
    package_plan_path: requiredArg(args, "package-plan"),
    executor_receipt_event_path: requiredArg(args, "executor-receipt-event"),
    executor_profile_path: requiredArg(args, "executor-profile"),
    participant_run_profile_path: requiredArg(args, "participant-run-profile"),
    [timeKey]: requiredArg(args, timeKey.replaceAll("_", "-")),
  };
}

function redactInspection(value) {
  return {
    ...value,
    files: Object.fromEntries(
      Object.entries(value.files).map(([key, entry]) => [
        key,
        key === "operatorTicket" || key === "rawResult"
          ? { ...entry, path: entry.exists ? "<private>" : entry.path }
          : entry,
      ]),
    ),
  };
}

async function cliMain() {
  const [command, ...rawArgs] = process.argv.slice(2);
  const args = parseArgs(rawArgs);
  if (command === "execute") {
    const result = await executeExecutorReceiveAndRun(
      inputFromArgs(args, "started_at_utc"),
      requiredArg(args, "output-dir"),
      requiredArg(args, "confirm"),
    );
    process.stdout.write(JSON.stringify({
      ...result,
      inspection: redactInspection(result.inspection),
    }) + "\n");
    return;
  }
  if (command === "recover") {
    const input = inputFromArgs(args, "recovered_at_utc");
    input.recovered_raw_result_path = requiredArg(args, "recovered-raw-result");
    const result = recoverExecutorReceiveAndRun(
      input,
      requiredArg(args, "output-dir"),
      requiredArg(args, "confirm"),
    );
    process.stdout.write(JSON.stringify({
      ...result,
      inspection: redactInspection(result.inspection),
    }) + "\n");
    return;
  }
  if (command === "inspect") {
    process.stdout.write(JSON.stringify(
      redactInspection(
        inspectExecutorReceiveAndRun(requiredArg(args, "output-dir")),
      ),
    ) + "\n");
    return;
  }
  fail(
    "usage: external_agent_paid_work_fulfillment_executor_receive_and_run_v1.ts " +
      "<execute|recover|inspect> [options]",
  );
}

const entry = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";

if (import.meta.url === entry) {
  cliMain().catch((error) => {
    process.stderr.write(
      `HOLD: executor receive-and-run V1 failed: ${
        error instanceof Error ? error.message : String(error)
      }\n`,
    );
    process.exitCode = 2;
  });
}
