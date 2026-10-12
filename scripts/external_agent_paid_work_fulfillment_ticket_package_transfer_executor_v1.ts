#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
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
  inspectTicketIssueOperation,
} from "./external_agent_paid_work_fulfillment_ticket_issue_executor_v1.ts";

export const DESTINATION_IDENTITY_RECEIPT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_EXECUTOR_IDENTITY_RECEIPT_V1";
export const DESTINATION_PROFILE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_EXECUTOR_DESTINATION_PROFILE_V1";
export const TRANSFER_PROFILE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_TICKET_PACKAGE_TRANSFER_PROFILE_V1";
export const PRIVATE_PACKAGE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_PRIVATE_EXECUTOR_TICKET_PACKAGE_V1";
export const OPERATION_STATE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_TICKET_PACKAGE_TRANSFER_OPERATION_STATE_V1";
export const RAW_ACK_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_RAW_TICKET_PACKAGE_TRANSFER_ACK_V1";
export const SANITIZED_RECEIPT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_TICKET_PACKAGE_TRANSFER_RECEIPT_V1";
export const EXECUTE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_TICKET_PACKAGE_TRANSFER_EXECUTOR_EXECUTE_V1";
export const RECOVER_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_TICKET_PACKAGE_TRANSFER_EXECUTOR_RECOVER_V1";
export const INSPECTION_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_TICKET_PACKAGE_TRANSFER_EXECUTOR_INSPECTION_V1";

export const EXECUTE_CONFIRMATION =
  "execute-external-agent-paid-work-fulfillment-ticket-package-transfer-executor-v1";
export const RECOVER_CONFIRMATION =
  "recover-external-agent-paid-work-fulfillment-ticket-package-transfer-executor-v1";

export const TRANSFER_AUTHORITY = Object.freeze({
  ticket_issue_operation_read: true,
  private_package_write: true,
  private_transfer_state_write: true,
  ticket_transfer: true,
  sanitized_transfer_receipt_write: true,
  next_event_write: true,
  remote_work_execution: false,
  participant_receipt_acceptance: false,
  wc_ledger_write: false,
  payment_transfer: false,
  wc_to_void_settlement: false,
  wallet_or_signer_access: false,
  service_restart: false,
  deployment: false,
});

const TOKEN_PATTERN =
  /^wcep1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{20,200}$/;
const TOKEN_SCAN =
  /wcep1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{20,200}/;
const HEX64 = /^[0-9a-f]{64}$/;
const NODE_ID = /^[0-9a-f]{32}$/;
const IPV4 = /^(?:25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})(?:\.(?:25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})){3}$/;
const ID = /^[A-Za-z0-9._:-]{4,240}$/;
const TRANSPORT_ID = /^[A-Za-z0-9._:-]{4,160}$/;
const PLACEHOLDERS = new Set(["{package_path}", "{destination}"]);

const FILES = Object.freeze({
  state: "transfer-operation-state-v1.json",
  packagePlan: "advanced-plan-ticket-package-planned-v1.json",
  destinationProfile: "destination-profile-v1.json",
  transferProfile: "transfer-profile-v1.json",
  privatePackage: "private-executor-ticket-package-v1.json",
  rawAck: "raw-ticket-package-transfer-ack-v1.json",
  receipt: "sanitized-ticket-package-transfer-receipt-v1.json",
  nextEvent: "executor-receipt-expected-event-v1.json",
});

const VALID_PHASES = Object.freeze([
  "prepared",
  "transferring",
  "transferred_ack_persisted",
  "complete",
  "ambiguous_after_transfer_attempt",
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
  if (canonicalJson(value) !== canonicalJson(TRANSFER_AUTHORITY)) {
    fail("transfer authority mismatch");
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

function writeExclusive(file, value) {
  const payload =
    typeof value === "string"
      ? value
      : JSON.stringify(value, null, 2) + "\n";
  const descriptor = fs.openSync(
    file,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL,
    0o600,
  );
  try {
    fs.writeFileSync(descriptor, payload, "utf8");
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  fs.chmodSync(file, 0o600);
}

function writeAtomic(file, value) {
  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;
  writeExclusive(temp, value);
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
    fail("transfer output path is not a safe directory");
  }
  if ((metadata.mode & 0o777) !== 0o700) {
    fail("transfer output directory mode must be 0700");
  }
}

function validateIdentityReceipt(value, expectedMarker) {
  const receipt = object(value, "executor identity receipt");
  if (
    receipt.marker !== expectedMarker ||
    receipt.version !== 1
  ) {
    fail("executor identity receipt marker/version mismatch");
  }
  noToken(receipt, "executor identity receipt");
  utc(receipt.verified_at_utc, "executor identity receipt verified_at_utc");
  string(receipt.tailscale_ip, "executor identity receipt tailscale_ip", IPV4);
  string(receipt.node_id, "executor identity receipt node_id", NODE_ID);
  string(receipt.verification_method, "executor identity receipt verification_method", ID, 240);
  if (bool(receipt.identity_verified, "executor identity receipt identity_verified") !== true) {
    fail("executor identity receipt is not verified");
  }
  return receipt;
}

function validateDestinationProfile(value, advancedPlan) {
  const profile = object(value, "destination profile");
  if (
    profile.marker !== DESTINATION_PROFILE_MARKER ||
    profile.version !== 1
  ) {
    fail("destination profile marker/version mismatch");
  }
  noToken(profile, "destination profile");
  utc(profile.created_at_utc, "destination profile created_at_utc");
  const tailscaleIp = string(profile.tailscale_ip, "destination profile tailscale_ip", IPV4);
  const nodeId = string(profile.node_id, "destination profile node_id", NODE_ID);
  const destination = string(profile.transport_destination, "destination profile transport_destination", null, 512);
  const expectedMarker = string(
    profile.identity_receipt_marker,
    "destination profile identity_receipt_marker",
    /^[A-Z][A-Z0-9_]{12,220}$/,
    240,
  );
  const identityPath = string(
    profile.identity_receipt_path,
    "destination profile identity_receipt_path",
    null,
    4096,
  );
  const identitySha = string(
    profile.identity_receipt_sha256,
    "destination profile identity_receipt_sha256",
    HEX64,
  );
  safeFile(identityPath, "executor identity receipt");
  if (sha256File(identityPath) !== identitySha) {
    fail("executor identity receipt SHA mismatch");
  }
  const identity = validateIdentityReceipt(
    safeJson(identityPath, "executor identity receipt"),
    expectedMarker,
  );
  if (
    identity.tailscale_ip !== tailscaleIp ||
    identity.node_id !== nodeId ||
    nodeId !== advancedPlan.request.execution_contract.executor_node_id
  ) {
    fail("destination profile/identity/source-plan mismatch");
  }
  return { profile, identity, tailscaleIp, nodeId, destination };
}

function validateTransferProfile(value) {
  const profile = object(value, "transfer profile");
  if (
    profile.marker !== TRANSFER_PROFILE_MARKER ||
    profile.version !== 1
  ) {
    fail("transfer profile marker/version mismatch");
  }
  noToken(profile, "transfer profile");
  const transportId = string(profile.transport_id, "transfer profile transport_id", TRANSPORT_ID);
  const successExitCode = integer(
    profile.success_exit_code,
    "transfer profile success_exit_code",
    0,
    255,
  );
  const timeoutMs = integer(
    profile.timeout_ms,
    "transfer profile timeout_ms",
    1000,
    3600000,
  );
  if (!Array.isArray(profile.command_argv) || profile.command_argv.length < 2 || profile.command_argv.length > 32) {
    fail("transfer profile command_argv size mismatch");
  }
  const commandArgv = profile.command_argv.map((item, index) =>
    string(item, `transfer profile command_argv[${index}]`, null, 4096),
  );
  const joined = commandArgv.join("\n");
  for (const placeholder of PLACEHOLDERS) {
    const count = joined.split(placeholder).length - 1;
    if (count !== 1) fail(`transfer profile must contain ${placeholder} exactly once`);
  }
  if (/\{[^}]+\}/.test(joined.replaceAll("{package_path}", "").replaceAll("{destination}", ""))) {
    fail("transfer profile contains an unknown placeholder");
  }
  return { profile, transportId, successExitCode, timeoutMs, commandArgv };
}

function validateIssueOperation(issueOperationDir, transferredAtUtc, participantCliPath) {
  const inspection = inspectTicketIssueOperation(issueOperationDir);
  if (
    inspection.valid !== true ||
    inspection.phase !== "complete" ||
    inspection.ticket_issued !== true ||
    inspection.ticket_transferred !== false ||
    inspection.raw_capability_token_in_sanitized_receipt !== false ||
    inspection.all_existing_files_mode_0600 !== true
  ) {
    fail("ticket issue operation is not complete and transfer-ready");
  }

  const state = safeJson(
    path.join(issueOperationDir, "operation-state-v1.json"),
    "ticket issue operation state",
  );
  const advancedIssuePlan = safeJson(
    path.join(issueOperationDir, "advanced-plan-ticket-issue-planned-v1.json"),
    "advanced ticket-issue plan",
  );
  const operatorTicketPath = path.join(issueOperationDir, "operator-ticket-v1.json");
  const operatorTicket = safeJson(operatorTicketPath, "operator ticket");
  const receipt = safeJson(
    path.join(issueOperationDir, "sanitized-ticket-issue-receipt-v1.json"),
    "sanitized ticket issue receipt",
  );
  const packageEvent = safeJson(
    path.join(issueOperationDir, "ticket-package-planned-event-v1.json"),
    "ticket-package-planned event",
  );

  if (
    state.operation_id !== operatorTicket.operation_id ||
    state.operation_id !== receipt.operation_id ||
    state.ticket_id !== operatorTicket.ticket.ticket_id ||
    state.ticket_id !== receipt.ticket.ticket_id
  ) {
    fail("ticket issue operation identity mismatch");
  }
  if (!TOKEN_PATTERN.test(operatorTicket.ticket.capability_token)) {
    fail("operator ticket capability token format mismatch");
  }
  if (
    sha256Text(operatorTicket.ticket.capability_token) !==
      receipt.ticket.capability_token_sha256
  ) {
    fail("operator ticket token hash mismatch");
  }
  for (const key of [
    "ticket_id",
    "account",
    "executor_node_id",
    "task_class",
    "dataset_id",
    "expected_input_hash",
    "issued_at_ms",
    "expires_at_ms",
    "ttl_ms",
    "max_uses",
    "fixed_award_wc",
  ]) {
    if (operatorTicket.ticket[key] !== receipt.ticket[key]) {
      fail(`operator ticket/receipt ${key} mismatch`);
    }
  }
  if (
    packageEvent.evidence.ticket_id !== operatorTicket.ticket.ticket_id ||
    packageEvent.evidence.ticket_file_sha256 !== sha256File(operatorTicketPath) ||
    packageEvent.evidence.capability_token_sha256 !==
      receipt.ticket.capability_token_sha256
  ) {
    fail("ticket-package-planned event does not bind operator ticket");
  }

  const advanced = advancePlan(
    advancedIssuePlan,
    packageEvent,
    ADVANCE_CONFIRMATION,
  );
  if (advanced.duplicate !== false) {
    fail("ticket-package-planned event unexpectedly duplicate");
  }
  const packagePlan = advanced.plan;
  const packagePlanInspection = inspectPlan(packagePlan);
  if (
    packagePlanInspection.state !== "ticket_package_planned" ||
    packagePlanInspection.next_transition !== "executor_receipt_expected"
  ) {
    fail("private package plan state mismatch");
  }

  const source = packagePlan.request;
  const ticket = operatorTicket.ticket;
  if (
    ticket.account !== source.binding.destination_wc_account ||
    ticket.executor_node_id !== source.execution_contract.executor_node_id ||
    ticket.task_class !== source.submission.task_class ||
    ticket.fixed_award_wc !== source.execution_contract.fixed_award_wc ||
    ticket.max_uses !== 1
  ) {
    fail("operator ticket/source-plan semantic mismatch");
  }
  const transferAtMs = Date.parse(utc(transferredAtUtc, "transferred_at_utc"));
  if (ticket.expires_at_ms <= transferAtMs) {
    fail("ticket is expired at transfer start");
  }

  safeFile(participantCliPath, "participant CLI", 8 * 1024 * 1024);
  const participantCliSha = sha256File(participantCliPath);
  if (
    participantCliSha !==
      source.execution_contract.runtime.participant_cli_sha256
  ) {
    fail("participant CLI SHA does not match pinned runtime");
  }

  return {
    inspection,
    state,
    advancedIssuePlan,
    operatorTicketPath,
    operatorTicket,
    receipt,
    packageEvent,
    packagePlan,
    packagePlanInspection,
    participantCliSha,
    ticket,
  };
}

function operationId(issue, destination, transferProfile) {
  return `voidapwftransferop1_${sha256Text(canonicalJson({
    version: 1,
    ticket_issue_operation_id: issue.state.operation_id,
    ticket_id: issue.ticket.ticket_id,
    package_plan_id: issue.packagePlan.plan_id,
    participant_cli_sha256: issue.participantCliSha,
    destination_profile_sha256: sha256Text(canonicalJson(destination.profile)),
    transfer_profile_sha256: sha256Text(canonicalJson(transferProfile.profile)),
  }))}`;
}

function privatePackage(operationIdValue, issue, destination, participantCliPath, createdAtUtc) {
  return {
    marker: PRIVATE_PACKAGE_MARKER,
    version: 1,
    created_at_utc: createdAtUtc,
    transfer_operation_id: operationIdValue,
    ticket_issue_operation_id: issue.state.operation_id,
    fulfillment_id: issue.packagePlan.fulfillment_id,
    package_plan_id: issue.packagePlan.plan_id,
    destination: {
      tailscale_ip: destination.tailscaleIp,
      node_id: destination.nodeId,
      transport_destination: destination.destination,
      identity_receipt_sha256: destination.profile.identity_receipt_sha256,
    },
    participant_cli: {
      file_name: path.basename(participantCliPath),
      sha256: issue.participantCliSha,
      bytes_base64: fs.readFileSync(participantCliPath).toString("base64"),
    },
    operator_ticket: issue.operatorTicket,
    requirements: {
      ticket_max_uses: 1,
      executor_receipt_required: true,
      raw_capability_token_private: true,
      work_execution_not_authorized_by_transfer: true,
    },
  };
}

function statePath(outputDir) {
  return path.join(outputDir, FILES.state);
}

function validateState(state, expectedOperationId) {
  if (
    state.marker !== OPERATION_STATE_MARKER ||
    state.version !== 1 ||
    state.operation_id !== expectedOperationId ||
    !VALID_PHASES.includes(state.phase)
  ) {
    fail("transfer operation state identity/phase mismatch");
  }
  noToken(state, "transfer operation state");
  authority(state.authority);
  return state;
}

function setState(outputDir, state, patch, atUtc) {
  const next = { ...state, ...patch, updated_at_utc: atUtc };
  validateState(next, state.operation_id);
  writeAtomic(statePath(outputDir), next);
  return next;
}

function initialize({
  outputDir,
  operationIdValue,
  issueOperationDir,
  issue,
  destination,
  transferProfile,
  participantCliPath,
  createdAtUtc,
}) {
  ensureOutputDir(outputDir);
  if (fs.existsSync(statePath(outputDir))) {
    return validateState(
      safeJson(statePath(outputDir), "transfer operation state"),
      operationIdValue,
    );
  }

  const packagePlanPath = path.join(outputDir, FILES.packagePlan);
  const destinationPath = path.join(outputDir, FILES.destinationProfile);
  const transferProfilePath = path.join(outputDir, FILES.transferProfile);
  const privatePackagePath = path.join(outputDir, FILES.privatePackage);

  writeExclusive(packagePlanPath, issue.packagePlan);
  writeExclusive(destinationPath, destination.profile);
  writeExclusive(transferProfilePath, transferProfile.profile);
  writeExclusive(
    privatePackagePath,
    privatePackage(
      operationIdValue,
      issue,
      destination,
      participantCliPath,
      createdAtUtc,
    ),
  );

  const state = {
    marker: OPERATION_STATE_MARKER,
    version: 1,
    created_at_utc: createdAtUtc,
    updated_at_utc: createdAtUtc,
    operation_id: operationIdValue,
    phase: "prepared",
    ticket_issue_operation_dir: issueOperationDir,
    ticket_issue_operation_id: issue.state.operation_id,
    ticket_id: issue.ticket.ticket_id,
    package_plan_path: packagePlanPath,
    package_plan_sha256: sha256File(packagePlanPath),
    destination_profile_path: destinationPath,
    destination_profile_sha256: sha256File(destinationPath),
    transfer_profile_path: transferProfilePath,
    transfer_profile_sha256: sha256File(transferProfilePath),
    private_package_path: privatePackagePath,
    private_package_sha256: sha256File(privatePackagePath),
    raw_ack_path: null,
    sanitized_receipt_path: null,
    next_event_path: null,
    ticket_transferred: false,
    remote_work_execution: false,
    participant_receipt_acceptance: false,
    wc_ledger_write: false,
    authority: TRANSFER_AUTHORITY,
  };
  writeExclusive(statePath(outputDir), state);
  return state;
}

function expandArgv(commandArgv, packagePath, destination) {
  return commandArgv.map((value) =>
    value
      .replace("{package_path}", packagePath)
      .replace("{destination}", destination),
  );
}

async function commandTransport({ profileInfo, packagePath, destination }) {
  const argv = expandArgv(
    profileInfo.commandArgv,
    packagePath,
    destination,
  );
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
      reject(new Error("transfer command timed out"));
    }, profileInfo.timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
      if (stdout.length > 1024 * 1024) {
        child.kill("SIGKILL");
        reject(new Error("transfer stdout exceeded limit"));
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
      if (stderr.length > 1024 * 1024) {
        child.kill("SIGKILL");
        reject(new Error("transfer stderr exceeded limit"));
      }
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (exitCode, signal) => {
      clearTimeout(timer);
      resolve({
        exit_code: exitCode,
        signal,
        stdout,
        stderr,
        expanded_argv_sha256: sha256Text(canonicalJson(argv)),
      });
    });
  });
}

function rawAck(operationIdValue, transportResult, packageSha, destination, profileInfo, atUtc) {
  return {
    marker: RAW_ACK_MARKER,
    version: 1,
    created_at_utc: atUtc,
    operation_id: operationIdValue,
    transport_id: profileInfo.transportId,
    exit_code: transportResult.exit_code,
    signal: transportResult.signal ?? null,
    stdout: transportResult.stdout ?? "",
    stderr: transportResult.stderr ?? "",
    expanded_argv_sha256: transportResult.expanded_argv_sha256,
    package_sha256: packageSha,
    destination,
  };
}

function validateAck(ack, operationIdValue, state, destination, profileInfo) {
  if (
    ack.marker !== RAW_ACK_MARKER ||
    ack.version !== 1 ||
    ack.operation_id !== operationIdValue ||
    ack.transport_id !== profileInfo.transportId ||
    ack.exit_code !== profileInfo.successExitCode ||
    ack.package_sha256 !== state.private_package_sha256 ||
    ack.destination !== destination
  ) {
    fail("transfer acknowledgment identity/status mismatch");
  }
  noToken(ack, "transfer acknowledgment");
  string(ack.expanded_argv_sha256, "transfer acknowledgment argv SHA", HEX64);
  return ack;
}

function receipt(operationIdValue, issue, destination, profileInfo, state, ack, atUtc) {
  return {
    marker: SANITIZED_RECEIPT_MARKER,
    version: 1,
    created_at_utc: atUtc,
    operation_id: operationIdValue,
    ticket_issue_operation_id: issue.state.operation_id,
    fulfillment_id: issue.packagePlan.fulfillment_id,
    package_plan_id: issue.packagePlan.plan_id,
    ticket: {
      ticket_id: issue.ticket.ticket_id,
      capability_token_sha256:
        issue.receipt.ticket.capability_token_sha256,
      account: issue.ticket.account,
      executor_node_id: issue.ticket.executor_node_id,
      expires_at_ms: issue.ticket.expires_at_ms,
      max_uses: issue.ticket.max_uses,
      fixed_award_wc: issue.ticket.fixed_award_wc,
    },
    package: {
      private_package_sha256: state.private_package_sha256,
      participant_cli_sha256: issue.participantCliSha,
      raw_capability_token_present_in_private_package: true,
      raw_capability_token_present_in_receipt: false,
    },
    destination: {
      tailscale_ip: destination.tailscaleIp,
      node_id: destination.nodeId,
      transport_destination_sha256:
        sha256Text(destination.destination),
      identity_receipt_sha256:
        destination.profile.identity_receipt_sha256,
    },
    transport: {
      transport_id: profileInfo.transportId,
      command_argv_sha256:
        sha256Text(canonicalJson(profileInfo.commandArgv)),
      expanded_argv_sha256: ack.expanded_argv_sha256,
      exit_code: ack.exit_code,
      raw_ack_sha256:
        sha256Text(canonicalJson(ack)),
    },
    verification: {
      explicit_confirmation_verified: true,
      ticket_issue_operation_complete: true,
      operator_ticket_hash_binding_verified: true,
      destination_identity_verified: true,
      participant_cli_hash_verified: true,
      ticket_not_expired_at_transfer_start: true,
      ticket_transferred_once: true,
      raw_capability_token_printed: false,
      raw_capability_token_in_sanitized_receipt: false,
      remote_work_execution: false,
      participant_receipt_acceptance: false,
      wc_ledger_write: false,
    },
    authority: TRANSFER_AUTHORITY,
  };
}

function nextEvent(issue, receiptValue, atUtc) {
  return buildEvent({
    fulfillment_id: issue.packagePlan.fulfillment_id,
    expected_revision: issue.packagePlan.revision,
    from_state: "ticket_package_planned",
    to_state: "executor_receipt_expected",
    occurred_at_utc: atUtc,
    evidence: {
      ticket_id: issue.ticket.ticket_id,
      ticket_package_sha256:
        receiptValue.package.private_package_sha256,
      executor_node_id: issue.ticket.executor_node_id,
      transport: receiptValue.transport.transport_id,
      transfer_operation_id: receiptValue.operation_id,
      raw_capability_token_in_evidence: false,
      remote_work_execution_started: false,
    },
    nonce: `${receiptValue.operation_id}-executor-receipt-expected`,
  });
}

function finalize({
  outputDir,
  operationIdValue,
  state,
  issue,
  destination,
  profileInfo,
  ack,
  atUtc,
}) {
  validateAck(
    ack,
    operationIdValue,
    state,
    destination.destination,
    profileInfo,
  );
  const rawAckPath = path.join(outputDir, FILES.rawAck);
  if (!fs.existsSync(rawAckPath)) writeExclusive(rawAckPath, ack);

  state = setState(
    outputDir,
    state,
    {
      phase: "transferred_ack_persisted",
      raw_ack_path: rawAckPath,
      raw_ack_sha256: sha256File(rawAckPath),
      ticket_transferred: true,
    },
    atUtc,
  );

  const receiptValue = receipt(
    operationIdValue,
    issue,
    destination,
    profileInfo,
    state,
    ack,
    atUtc,
  );
  noToken(receiptValue, "sanitized transfer receipt");
  const receiptPath = path.join(outputDir, FILES.receipt);
  if (!fs.existsSync(receiptPath)) writeExclusive(receiptPath, receiptValue);

  const event = nextEvent(issue, receiptValue, atUtc);
  noToken(event, "executor-receipt-expected event");
  const nextEventPath = path.join(outputDir, FILES.nextEvent);
  if (!fs.existsSync(nextEventPath)) writeExclusive(nextEventPath, event);

  const compatibility = advancePlan(
    issue.packagePlan,
    event,
    ADVANCE_CONFIRMATION,
  );
  if (
    compatibility.duplicate !== false ||
    inspectPlan(compatibility.plan).state !== "executor_receipt_expected"
  ) {
    fail("generated executor-receipt-expected event is not orchestrator-compatible");
  }

  state = setState(
    outputDir,
    state,
    {
      phase: "complete",
      completed_at_utc: atUtc,
      sanitized_receipt_path: receiptPath,
      sanitized_receipt_sha256: sha256File(receiptPath),
      next_event_path: nextEventPath,
      next_event_sha256: sha256File(nextEventPath),
      ticket_transferred: true,
    },
    atUtc,
  );

  return { state, receiptValue, event };
}

export function inspectTicketPackageTransferOperation(outputDir) {
  const state = safeJson(statePath(outputDir), "transfer operation state");
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
  if (files.receipt.exists && TOKEN_SCAN.test(fs.readFileSync(files.receipt.path, "utf8"))) {
    fail("sanitized transfer receipt contains a raw token");
  }
  if (files.nextEvent.exists && TOKEN_SCAN.test(fs.readFileSync(files.nextEvent.path, "utf8"))) {
    fail("next event contains a raw token");
  }
  return {
    marker: INSPECTION_MARKER,
    valid: true,
    operation_id: state.operation_id,
    phase: state.phase,
    ticket_id: state.ticket_id,
    ticket_transferred: state.ticket_transferred,
    ambiguous_after_transfer_attempt:
      state.phase === "ambiguous_after_transfer_attempt" ||
      (state.phase === "transferring" && !files.rawAck.exists),
    duplicate_safe: state.phase === "complete",
    output_dir_mode_0700:
      (fs.statSync(outputDir).mode & 0o777) === 0o700,
    all_existing_files_mode_0600:
      Object.values(files).every((entry) => !entry.exists || entry.mode === "0600"),
    raw_capability_token_printed: false,
    raw_capability_token_in_sanitized_receipt: false,
    remote_work_execution: false,
    participant_receipt_acceptance: false,
    wc_ledger_write: false,
    files,
    authority: TRANSFER_AUTHORITY,
  };
}

export async function executeTicketPackageTransferOperation(
  input,
  outputDir,
  confirmation,
  transport = commandTransport,
) {
  if (confirmation !== EXECUTE_CONFIRMATION) {
    fail("explicit ticket-package transfer confirmation mismatch");
  }
  const atUtc = utc(input.transferred_at_utc, "transferred_at_utc");
  const issue = validateIssueOperation(
    input.ticket_issue_operation_dir,
    atUtc,
    input.participant_cli_path,
  );
  const destination = validateDestinationProfile(
    safeJson(input.destination_profile_path, "destination profile"),
    issue.packagePlan,
  );
  const profileInfo = validateTransferProfile(
    safeJson(input.transfer_profile_path, "transfer profile"),
  );
  const operationIdValue = operationId(issue, destination, profileInfo);
  let state = initialize({
    outputDir,
    operationIdValue,
    issueOperationDir: input.ticket_issue_operation_dir,
    issue,
    destination,
    transferProfile: profileInfo,
    participantCliPath: input.participant_cli_path,
    createdAtUtc: atUtc,
  });

  if (state.phase === "complete") {
    return {
      marker: EXECUTE_MARKER,
      operation_id: operationIdValue,
      duplicate: true,
      recovered: false,
      phase: "complete",
      ticket_id: state.ticket_id,
      ticket_transferred: true,
      raw_capability_token_printed: false,
      remote_work_execution: false,
      wc_ledger_write: false,
      inspection: inspectTicketPackageTransferOperation(outputDir),
    };
  }

  const rawAckPath = path.join(outputDir, FILES.rawAck);
  if (state.phase === "transferring" && !fs.existsSync(rawAckPath)) {
    state = setState(
      outputDir,
      state,
      {
        phase: "ambiguous_after_transfer_attempt",
        hold_reason: "transfer_attempt_started_but_no_ack_persisted",
      },
      atUtc,
    );
    fail("ambiguous after transfer attempt; automatic retransmission is forbidden");
  }
  if (state.phase === "ambiguous_after_transfer_attempt") {
    fail("operation is ambiguous after transfer attempt; automatic retransmission is forbidden");
  }
  if (state.phase === "transferred_ack_persisted" || fs.existsSync(rawAckPath)) {
    const ack = safeJson(rawAckPath, "raw transfer acknowledgment");
    const finalized = finalize({
      outputDir,
      operationIdValue,
      state,
      issue,
      destination,
      profileInfo,
      ack,
      atUtc,
    });
    return {
      marker: EXECUTE_MARKER,
      operation_id: operationIdValue,
      duplicate: false,
      recovered: true,
      phase: finalized.state.phase,
      ticket_id: finalized.state.ticket_id,
      ticket_transferred: true,
      raw_capability_token_printed: false,
      remote_work_execution: false,
      wc_ledger_write: false,
      inspection: inspectTicketPackageTransferOperation(outputDir),
    };
  }
  if (state.phase !== "prepared") {
    fail(`operation cannot transfer from phase ${state.phase}`);
  }

  state = setState(
    outputDir,
    state,
    {
      phase: "transferring",
      transfer_attempt_started_at_utc: atUtc,
      transfer_attempt_count: 1,
    },
    atUtc,
  );

  let result;
  try {
    result = await transport({
      profileInfo,
      packagePath: state.private_package_path,
      destination: destination.destination,
      operation_id: operationIdValue,
    });
  } catch {
    setState(
      outputDir,
      state,
      {
        phase: "ambiguous_after_transfer_attempt",
        hold_reason: "transport_threw_after_transfer_attempt_started",
      },
      atUtc,
    );
    fail("ticket-package transport failed after attempt started; automatic retransmission is forbidden");
  }

  const ack = rawAck(
    operationIdValue,
    result,
    state.private_package_sha256,
    destination.destination,
    profileInfo,
    atUtc,
  );
  writeExclusive(rawAckPath, ack);

  const finalized = finalize({
    outputDir,
    operationIdValue,
    state,
    issue,
    destination,
    profileInfo,
    ack,
    atUtc,
  });

  return {
    marker: EXECUTE_MARKER,
    operation_id: operationIdValue,
    duplicate: false,
    recovered: false,
    phase: finalized.state.phase,
    ticket_id: finalized.state.ticket_id,
    ticket_transferred: true,
    raw_capability_token_printed: false,
    remote_work_execution: false,
    wc_ledger_write: false,
    inspection: inspectTicketPackageTransferOperation(outputDir),
  };
}

export function recoverTicketPackageTransferOperation(input, outputDir, confirmation) {
  if (confirmation !== RECOVER_CONFIRMATION) {
    fail("explicit ticket-package transfer recovery confirmation mismatch");
  }
  const atUtc = utc(input.recovered_at_utc, "recovered_at_utc");
  const issue = validateIssueOperation(
    input.ticket_issue_operation_dir,
    atUtc,
    input.participant_cli_path,
  );
  const destination = validateDestinationProfile(
    safeJson(input.destination_profile_path, "destination profile"),
    issue.packagePlan,
  );
  const profileInfo = validateTransferProfile(
    safeJson(input.transfer_profile_path, "transfer profile"),
  );
  const operationIdValue = operationId(issue, destination, profileInfo);
  ensureOutputDir(outputDir);
  let state = validateState(
    safeJson(statePath(outputDir), "transfer operation state"),
    operationIdValue,
  );

  if (state.phase === "complete") {
    return {
      marker: RECOVER_MARKER,
      operation_id: operationIdValue,
      duplicate: true,
      recovered: false,
      phase: "complete",
      ticket_id: state.ticket_id,
      ticket_transferred: true,
      raw_capability_token_printed: false,
      remote_work_execution: false,
      wc_ledger_write: false,
      inspection: inspectTicketPackageTransferOperation(outputDir),
    };
  }
  if (!["transferring", "ambiguous_after_transfer_attempt", "transferred_ack_persisted"].includes(state.phase)) {
    fail(`operation cannot recover from phase ${state.phase}`);
  }
  const recoveredAck = safeJson(
    input.recovered_ack_path,
    "recovered transfer acknowledgment",
  );
  validateAck(
    recoveredAck,
    operationIdValue,
    state,
    destination.destination,
    profileInfo,
  );
  const rawAckPath = path.join(outputDir, FILES.rawAck);
  if (!fs.existsSync(rawAckPath)) writeExclusive(rawAckPath, recoveredAck);

  const finalized = finalize({
    outputDir,
    operationIdValue,
    state,
    issue,
    destination,
    profileInfo,
    ack: recoveredAck,
    atUtc,
  });

  return {
    marker: RECOVER_MARKER,
    operation_id: operationIdValue,
    duplicate: false,
    recovered: true,
    phase: finalized.state.phase,
    ticket_id: finalized.state.ticket_id,
    ticket_transferred: true,
    raw_capability_token_printed: false,
    remote_work_execution: false,
    wc_ledger_write: false,
    inspection: inspectTicketPackageTransferOperation(outputDir),
  };
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

function safeInspectionForOutput(inspection) {
  return {
    ...inspection,
    files: Object.fromEntries(
      Object.entries(inspection.files).map(([key, value]) => [
        key,
        key === "privatePackage"
          ? { ...value, path: value.exists ? "<private>" : value.path }
          : value,
      ]),
    ),
  };
}

async function cliMain() {
  const [command, ...rawArgs] = process.argv.slice(2);
  const args = parseArgs(rawArgs);

  if (command === "execute") {
    const result = await executeTicketPackageTransferOperation(
      {
        ticket_issue_operation_dir: requiredArg(args, "ticket-issue-operation-dir"),
        participant_cli_path: requiredArg(args, "participant-cli"),
        destination_profile_path: requiredArg(args, "destination-profile"),
        transfer_profile_path: requiredArg(args, "transfer-profile"),
        transferred_at_utc: requiredArg(args, "transferred-at-utc"),
      },
      requiredArg(args, "output-dir"),
      requiredArg(args, "confirm"),
    );
    const { inspection, ...safe } = result;
    process.stdout.write(JSON.stringify({
      ...safe,
      inspection: safeInspectionForOutput(inspection),
    }) + "\n");
    return;
  }

  if (command === "recover") {
    const result = recoverTicketPackageTransferOperation(
      {
        ticket_issue_operation_dir: requiredArg(args, "ticket-issue-operation-dir"),
        participant_cli_path: requiredArg(args, "participant-cli"),
        destination_profile_path: requiredArg(args, "destination-profile"),
        transfer_profile_path: requiredArg(args, "transfer-profile"),
        recovered_ack_path: requiredArg(args, "recovered-ack"),
        recovered_at_utc: requiredArg(args, "recovered-at-utc"),
      },
      requiredArg(args, "output-dir"),
      requiredArg(args, "confirm"),
    );
    const { inspection, ...safe } = result;
    process.stdout.write(JSON.stringify({
      ...safe,
      inspection: safeInspectionForOutput(inspection),
    }) + "\n");
    return;
  }

  if (command === "inspect") {
    process.stdout.write(
      JSON.stringify(
        safeInspectionForOutput(
          inspectTicketPackageTransferOperation(requiredArg(args, "output-dir")),
        ),
      ) + "\n",
    );
    return;
  }

  fail(
    "usage: external_agent_paid_work_fulfillment_ticket_package_transfer_executor_v1.ts " +
      "<execute|recover|inspect> [options]",
  );
}

const entry = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";

if (import.meta.url === entry) {
  cliMain().catch((error) => {
    process.stderr.write(
      `HOLD: ticket-package transfer executor V1 failed: ${
        error instanceof Error ? error.message : String(error)
      }\n`,
    );
    process.exitCode = 2;
  });
}
