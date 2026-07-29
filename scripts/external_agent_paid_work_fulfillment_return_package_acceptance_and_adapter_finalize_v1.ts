#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  ADVANCE_CONFIRMATION,
  EVENT_MARKER,
  advancePlan,
  buildEvent,
  canonicalJson,
  inspectPlan,
  sha256File,
} from "./external_agent_paid_work_fulfillment_orchestrator_v1.ts";

import {
  RETURN_PACKAGE_MARKER,
  SANITIZED_RECEIPT_MARKER as EXECUTOR_RUN_RECEIPT_MARKER,
} from "./external_agent_paid_work_fulfillment_executor_receive_and_run_v1.ts";

export const FINALIZATION_PROFILE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_PRECISION_FINALIZATION_PROFILE_V1";
export const OPERATION_STATE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_PRECISION_FINALIZATION_OPERATION_STATE_V1";
export const RAW_ACCEPTANCE_RESULT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_RAW_VERIFIED_RECEIPT_ACCEPTANCE_RESULT_V1";
export const RAW_ADAPTER_RESULT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_RAW_ADAPTER_FINALIZATION_RESULT_V1";
export const RAW_DUPLICATE_RESULT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_RAW_ADAPTER_DUPLICATE_PROBE_RESULT_V1";
export const ACCEPTANCE_RECEIPT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_VERIFIED_RECEIPT_ACCEPTANCE_RECEIPT_V1";
export const ADAPTER_RECEIPT_MARKER =
  "VOID_AGENT_PAID_WORK_WC_EARNING_ADAPTER_RECEIPT_V1";
export const COMPLETION_RECEIPT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_COMPLETION_RECEIPT_V1";
export const PUBLIC_EVIDENCE_CANDIDATE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_PUBLIC_EVIDENCE_CANDIDATE_V1";
export const EXECUTE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_RETURN_ACCEPTANCE_ADAPTER_FINALIZE_EXECUTE_V1";
export const RECOVER_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_RETURN_ACCEPTANCE_ADAPTER_FINALIZE_RECOVER_V1";
export const INSPECTION_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_RETURN_ACCEPTANCE_ADAPTER_FINALIZE_INSPECTION_V1";

export const EXECUTE_CONFIRMATION =
  "execute-external-agent-paid-work-return-acceptance-adapter-finalize-v1";
export const RECOVER_CONFIRMATION =
  "recover-external-agent-paid-work-return-acceptance-adapter-finalize-v1";

export const FINALIZATION_AUTHORITY = Object.freeze({
  return_package_read: true,
  private_finalization_state_write: true,
  private_plan_advance: true,
  participant_receipt_acceptance: true,
  canonical_adapter_execute: true,
  adapter_duplicate_probe: true,
  wc_ledger_write: true,
  sanitized_completion_receipt_write: true,
  public_evidence_candidate_write: true,
  ticket_issuance: false,
  ticket_transfer: false,
  remote_work_execution: false,
  payment_transfer: false,
  wc_to_void_settlement: false,
  wallet_or_signer_access: false,
  service_restart: false,
  deployment: false,
});

const TOKEN_SCAN = /wcep1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{20,200}/;
const HEX64 = /^[0-9a-f]{64}$/;
const HEX32 = /^[0-9a-f]{32}$/;
const NODE_ID = /^[0-9a-f]{32}$/;
const IPV4 = /^(?:25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})(?:\.(?:25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})){3}$/;
const ID = /^[A-Za-z0-9._:-]{4,240}$/;
const RECEIPT_ID = /^voidwcr1_[0-9a-f]{64}$/;
const ACCEPTANCE_ID = /^voidapwfvra1_[0-9a-f]{64}$/;
const ADAPTER_ID = /^voidapwear1_[0-9a-f]{64}$/;
const ADAPTER_PLAN_ID = /^voidapweap1_[0-9a-f]{64}$/;
const BINDING_ID = /^voidapwcb1_[0-9a-f]{64}$/;
const BINDING_REGISTRY_ID = /^voidapwcbr1_[0-9a-f]{64}$/;
const CREDENTIAL_ID = /^voidapwc1_[0-9a-f]{64}$/;
const PLACEHOLDERS = new Set([
  "{participant_receipt_path}",
  "{return_package_path}",
  "{acceptance_receipt_path}",
  "{adapter_receipt_path}",
  "{binding_registry_path}",
  "{adapter_plan_path}",
  "{execution_dir}",
]);

const FILES = Object.freeze({
  state: "precision-finalization-operation-state-v1.json",
  returnPackage: "participant-receipt-return-package-v1.json",
  participantReceipt: "participant-receipt-v1.json",
  executorReceipt: "sanitized-executor-run-receipt-v1.json",
  adapterEvent: "adapter-finalization-planned-event-v1.json",
  adapterPlan: "advanced-plan-adapter-finalization-planned-v1.json",
  rawAcceptance: "raw-verified-receipt-acceptance-result-v1.json",
  acceptanceReceipt: "verified-receipt-acceptance-receipt-v1.json",
  rawAdapter: "raw-adapter-finalization-result-v1.json",
  adapterReceipt: "adapter-execution-receipt-v1.json",
  rawDuplicate: "raw-adapter-duplicate-probe-result-v1.json",
  completionEvent: "completed-event-v1.json",
  completedPlan: "completed-fulfillment-plan-v1.json",
  completionReceipt: "sanitized-paid-work-completion-receipt-v1.json",
  publicEvidence: "public-evidence-candidate-v1.json",
});

const PHASES = Object.freeze([
  "prepared",
  "acceptance_running",
  "acceptance_receipt_persisted",
  "adapter_running",
  "adapter_receipt_persisted",
  "duplicate_probe_running",
  "duplicate_verified",
  "complete",
  "ambiguous_after_acceptance_attempt",
  "ambiguous_after_adapter_attempt",
  "ambiguous_after_duplicate_probe_attempt",
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
  if (canonicalJson(value) !== canonicalJson(FINALIZATION_AUTHORITY)) {
    fail("finalization authority mismatch");
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
  const payload = typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n";
  const descriptor = fs.openSync(
    file,
    fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL,
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
    fail("finalization output path is not a safe directory");
  }
  if ((metadata.mode & 0o777) !== 0o700) {
    fail("finalization output directory mode must be 0700");
  }
}

function validateCommandProfile(value, label) {
  const profile = object(value, label);
  string(profile.runner_id, `${label}.runner_id`, ID);
  string(profile.command, `${label}.command`, null, 4096);
  if (!Array.isArray(profile.argv) || profile.argv.length > 128) {
    fail(`${label}.argv must be an array with at most 128 entries`);
  }
  for (const [index, entry] of profile.argv.entries()) {
    const text = string(entry, `${label}.argv[${index}]`, null, 4096);
    if (text.startsWith("{") && text.endsWith("}") && !PLACEHOLDERS.has(text)) {
      fail(`${label}.argv[${index}] has an unsupported placeholder`);
    }
  }
  integer(profile.timeout_ms, `${label}.timeout_ms`, 1000, 600000);
  integer(profile.success_exit_code, `${label}.success_exit_code`, 0, 255);
  return profile;
}

function validateProfile(value) {
  const profile = object(value, "finalization profile");
  if (profile.marker !== FINALIZATION_PROFILE_MARKER || profile.version !== 1) {
    fail("finalization profile marker/version mismatch");
  }
  const coordinator = object(profile.coordinator, "finalization profile coordinator");
  string(coordinator.tailscale_ip, "finalization profile coordinator tailscale_ip", IPV4);
  string(coordinator.node_id, "finalization profile coordinator node_id", NODE_ID);
  if (integer(profile.fixed_award_wc, "finalization profile fixed_award_wc", 1, 1000000) !== 3) {
    fail("finalization profile fixed award must be 3 WC");
  }
  const runtime = object(profile.runtime, "finalization profile runtime");
  for (const key of ["acceptance_source", "adapter_cli", "adapter_core"]) {
    const item = object(runtime[key], `finalization profile runtime.${key}`);
    const file = string(item.path, `finalization profile runtime.${key}.path`, null, 4096);
    const digest = string(item.sha256, `finalization profile runtime.${key}.sha256`, HEX64);
    safeFile(file, `finalization profile runtime.${key}`);
    if (sha256File(file) !== digest) fail(`finalization profile runtime.${key} SHA mismatch`);
  }
  const transports = object(profile.transports, "finalization profile transports");
  validateCommandProfile(transports.acceptance, "finalization profile acceptance transport");
  validateCommandProfile(transports.adapter, "finalization profile adapter transport");
  return profile;
}

function validateBindingRegistry(value, plan, fileSha, atUtc) {
  const registry = object(value, "binding registry");
  if (
    registry.marker !== "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_REGISTRY_V1" ||
    registry.version !== 1
  ) {
    fail("binding registry marker/version mismatch");
  }
  string(registry.registry_id, "binding registry id", BINDING_REGISTRY_ID);
  if (registry.registry_id !== plan.request.binding.binding_registry_id) {
    fail("binding registry ID does not match fulfillment plan");
  }
  if (fileSha !== plan.request.binding.binding_registry_sha256) {
    fail("binding registry SHA does not match fulfillment plan");
  }
  if (!Array.isArray(registry.bindings)) fail("binding registry bindings must be an array");
  const matches = registry.bindings.filter((entry) => {
    if (!isObject(entry)) return false;
    return (
      entry.marker === "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_V1" &&
      entry.binding_id === plan.request.binding.binding_id &&
      entry.credential_id === plan.request.submission.credential_id &&
      entry.agent_id === plan.request.submission.agent_id &&
      entry.destination_wc_account === plan.request.binding.destination_wc_account &&
      entry.status === "active"
    );
  });
  if (matches.length !== 1) fail("binding registry must contain exactly one active matching binding");
  const binding = matches[0];
  string(binding.binding_id, "binding id", BINDING_ID);
  string(binding.credential_id, "binding credential id", CREDENTIAL_ID);
  const now = Date.parse(atUtc);
  if (Number.isFinite(Date.parse(binding.valid_from)) && now < Date.parse(binding.valid_from)) {
    fail("binding is not active yet");
  }
  if (binding.valid_until !== null && now > Date.parse(utc(binding.valid_until, "binding valid_until"))) {
    fail("binding has expired");
  }
  if (binding.revoked_at !== null) fail("binding is revoked");
  const bindingAuthority = object(binding.authority, "binding authority");
  if (
    bindingAuthority.paid_work_submission_identity !== true ||
    bindingAuthority.wc_award_destination !== true ||
    bindingAuthority.payment !== false ||
    bindingAuthority.wc_ledger_write !== false ||
    bindingAuthority.wc_to_void_settlement !== false ||
    bindingAuthority.wallet_or_signer !== false
  ) {
    fail("binding authority mismatch");
  }
  return binding;
}

function validateParticipantReceipt(value, plan) {
  const receipt = object(value, "participant receipt");
  if (
    receipt.marker !== "VOID_WC_PUBLIC_EARNING_PARTICIPANT_EXECUTION_RECEIPT_V1" ||
    receipt.version !== 1
  ) {
    fail("participant receipt marker/version mismatch");
  }
  noToken(receipt, "participant receipt");
  string(receipt.receipt_id, "participant receipt id", RECEIPT_ID);
  const ticket = object(receipt.ticket, "participant receipt ticket");
  string(ticket.ticket_id, "participant receipt ticket id", HEX32);
  string(ticket.account, "participant receipt account", ID);
  string(ticket.executor_node_id, "participant receipt executor node id", NODE_ID);
  string(ticket.task_class, "participant receipt task class", ID);
  string(ticket.dataset_id, "participant receipt dataset id", ID);
  string(ticket.expected_input_hash, "participant receipt expected input hash", HEX64);
  const runtime = object(receipt.runtime, "participant receipt runtime");
  string(runtime.participant_cli_sha256, "participant receipt participant CLI SHA", HEX64);
  const verification = object(receipt.verification, "participant receipt verification");
  if (verification.ticket_consumed_once !== true || verification.token_artifact_deleted !== true) {
    fail("participant receipt ticket/token verification mismatch");
  }
  const wc = object(receipt.wc, "participant receipt WC");
  const before = integer(wc.before, "participant receipt WC before", 0, 1000000000000);
  const after = integer(wc.after, "participant receipt WC after", 0, 1000000000000);
  const delta = integer(wc.delta, "participant receipt WC delta", 1, 1000000);
  if (
    ticket.account !== plan.request.binding.destination_wc_account ||
    ticket.executor_node_id !== plan.request.execution_contract.executor_node_id ||
    ticket.task_class !== plan.request.submission.task_class ||
    runtime.participant_cli_sha256 !== plan.request.execution_contract.runtime.participant_cli_sha256 ||
    delta !== plan.request.execution_contract.fixed_award_wc ||
    after - before !== delta
  ) {
    fail("participant receipt does not match fulfillment plan");
  }
  return { receipt, ticket, before, after, delta };
}

function validateReturnPackage(value, sourcePlan) {
  const packageValue = object(value, "participant receipt return package");
  if (packageValue.marker !== RETURN_PACKAGE_MARKER || packageValue.version !== 1) {
    fail("participant receipt return package marker/version mismatch");
  }
  noToken(packageValue, "participant receipt return package");
  string(packageValue.operation_id, "return package operation id", ID);
  string(packageValue.fulfillment_id, "return package fulfillment id", ID);
  string(packageValue.executor_plan_id, "return package executor plan id", ID);
  string(packageValue.ticket_id, "return package ticket id", HEX32);
  if (
    packageValue.fulfillment_id !== sourcePlan.fulfillment_id ||
    packageValue.executor_plan_id !== sourcePlan.plan_id
  ) {
    fail("return package plan identity mismatch");
  }
  const participant = validateParticipantReceipt(packageValue.participant_receipt, sourcePlan);
  if (participant.ticket.ticket_id !== packageValue.ticket_id) fail("return package ticket mismatch");
  const executorReceipt = object(packageValue.sanitized_executor_run_receipt, "executor run receipt");
  if (executorReceipt.marker !== EXECUTOR_RUN_RECEIPT_MARKER || executorReceipt.version !== 1) {
    fail("executor run receipt marker/version mismatch");
  }
  noToken(executorReceipt, "executor run receipt");
  if (
    executorReceipt.operation_id !== packageValue.operation_id ||
    executorReceipt.fulfillment_id !== packageValue.fulfillment_id ||
    executorReceipt.executor_plan_id !== packageValue.executor_plan_id ||
    executorReceipt.participant_receipt_id !== participant.receipt.receipt_id ||
    executorReceipt.ticket?.ticket_id !== packageValue.ticket_id ||
    executorReceipt.ticket?.account !== participant.ticket.account ||
    executorReceipt.execution?.wc_before !== participant.before ||
    executorReceipt.execution?.wc_after !== participant.after ||
    executorReceipt.execution?.wc_delta !== participant.delta ||
    executorReceipt.verification?.ticket_consumed_once !== true ||
    executorReceipt.verification?.token_artifact_deleted !== true ||
    executorReceipt.verification?.participant_receipt_acceptance !== false ||
    executorReceipt.verification?.local_wc_ledger_write !== false
  ) {
    fail("executor run receipt semantic mismatch");
  }
  const event = object(packageValue.adapter_finalization_planned_event, "adapter finalization event");
  if (
    event.marker !== EVENT_MARKER ||
    event.version !== 1 ||
    event.fulfillment_id !== sourcePlan.fulfillment_id ||
    event.expected_revision !== sourcePlan.revision ||
    event.from_state !== "executor_receipt_expected" ||
    event.to_state !== "adapter_finalization_planned"
  ) {
    fail("adapter finalization event identity mismatch");
  }
  const requirements = object(packageValue.requirements, "return package requirements");
  if (
    requirements.precision_receipt_acceptance_required !== true ||
    requirements.adapter_finalization_required !== true ||
    requirements.raw_capability_token_present !== false ||
    requirements.participant_receipt_acceptance_performed_on_executor !== false ||
    requirements.local_wc_ledger_write_performed !== false
  ) {
    fail("return package requirements mismatch");
  }
  const advanced = advancePlan(sourcePlan, event, ADVANCE_CONFIRMATION);
  if (advanced.duplicate !== false || inspectPlan(advanced.plan).state !== "adapter_finalization_planned") {
    fail("return package event is not orchestrator-compatible");
  }
  return {
    value: packageValue,
    participant,
    executorReceipt,
    event,
    adapterPlan: advanced.plan,
  };
}

function validateInput(inputValue) {
  const input = object(inputValue, "finalization input");
  const startedAtUtc = utc(input.started_at_utc, "finalization input started_at_utc");
  const sourcePlanPath = string(
    input.executor_receipt_expected_plan_path,
    "finalization input executor_receipt_expected_plan_path",
    null,
    4096,
  );
  const returnPackagePath = string(input.return_package_path, "finalization input return_package_path", null, 4096);
  const profilePath = string(input.finalization_profile_path, "finalization input finalization_profile_path", null, 4096);
  const bindingRegistryPath = string(input.binding_registry_path, "finalization input binding_registry_path", null, 4096);
  const sourcePlan = safeJson(sourcePlanPath, "executor-receipt-expected fulfillment plan");
  const inspected = inspectPlan(sourcePlan);
  if (inspected.state !== "executor_receipt_expected") {
    fail("source fulfillment plan must be executor_receipt_expected");
  }
  const profile = validateProfile(safeJson(profilePath, "finalization profile"));
  if (
    profile.coordinator.node_id !== sourcePlan.request.execution_contract.coordinator_node_id ||
    profile.fixed_award_wc !== sourcePlan.request.execution_contract.fixed_award_wc ||
    profile.runtime.acceptance_source.sha256 !== sourcePlan.request.execution_contract.runtime.acceptance_source_sha256 ||
    profile.runtime.adapter_core.sha256 !== sourcePlan.request.execution_contract.runtime.adapter_core_sha256
  ) {
    fail("finalization profile does not match fulfillment execution contract");
  }
  const registrySha = sha256File(bindingRegistryPath);
  const bindingRegistry = safeJson(bindingRegistryPath, "binding registry");
  const binding = validateBindingRegistry(bindingRegistry, sourcePlan, registrySha, startedAtUtc);
  const returnData = validateReturnPackage(safeJson(returnPackagePath, "participant receipt return package"), sourcePlan);
  if (
    returnData.participant.ticket.account !== binding.destination_wc_account ||
    returnData.participant.ticket.ticket_id !== returnData.value.ticket_id
  ) {
    fail("return package does not match active binding");
  }
  return {
    input,
    startedAtUtc,
    sourcePlanPath,
    returnPackagePath,
    profilePath,
    bindingRegistryPath,
    sourcePlan,
    profile,
    bindingRegistry,
    binding,
    returnData,
  };
}

function operationId(data) {
  return `voidapwffinalop1_${sha256Text(canonicalJson({
    fulfillment_id: data.sourcePlan.fulfillment_id,
    source_plan_id: data.sourcePlan.plan_id,
    return_package_sha256: sha256File(data.returnPackagePath),
    binding_registry_sha256: sha256File(data.bindingRegistryPath),
    profile_sha256: sha256File(data.profilePath),
  }))}`;
}

function statePath(outputDir) {
  return path.join(outputDir, FILES.state);
}

function validateState(value, expectedOperationId) {
  const state = object(value, "finalization operation state");
  if (state.marker !== OPERATION_STATE_MARKER || state.version !== 1) {
    fail("finalization state marker/version mismatch");
  }
  if (state.operation_id !== expectedOperationId) fail("finalization state operation ID mismatch");
  if (!PHASES.includes(state.phase)) fail("finalization state phase mismatch");
  authority(state.authority);
  for (const key of ["acceptance_attempted", "adapter_attempted", "duplicate_probe_attempted"]) {
    bool(state[key], `finalization state ${key}`);
  }
  return state;
}

function setState(outputDir, state, updates, atUtc) {
  const next = { ...state, ...updates, updated_at_utc: atUtc };
  validateState(next, state.operation_id);
  writeAtomic(statePath(outputDir), next);
  return next;
}

function prepare(inputValue, outputDir) {
  const data = validateInput(inputValue);
  ensureOutputDir(outputDir);
  const opId = operationId(data);
  const existingPath = statePath(outputDir);
  if (fs.existsSync(existingPath)) {
    const existing = validateState(safeJson(existingPath, "finalization operation state"), opId);
    return { data, state: existing };
  }
  const copied = {
    returnPackage: path.join(outputDir, FILES.returnPackage),
    participantReceipt: path.join(outputDir, FILES.participantReceipt),
    executorReceipt: path.join(outputDir, FILES.executorReceipt),
    adapterEvent: path.join(outputDir, FILES.adapterEvent),
    adapterPlan: path.join(outputDir, FILES.adapterPlan),
  };
  writeExclusive(copied.returnPackage, data.returnData.value);
  writeExclusive(copied.participantReceipt, data.returnData.participant.receipt);
  writeExclusive(copied.executorReceipt, data.returnData.executorReceipt);
  writeExclusive(copied.adapterEvent, data.returnData.event);
  writeExclusive(copied.adapterPlan, data.returnData.adapterPlan);
  const state = {
    marker: OPERATION_STATE_MARKER,
    version: 1,
    created_at_utc: data.startedAtUtc,
    updated_at_utc: data.startedAtUtc,
    operation_id: opId,
    fulfillment_id: data.sourcePlan.fulfillment_id,
    source_plan_id: data.sourcePlan.plan_id,
    adapter_plan_id: data.returnData.adapterPlan.plan_id,
    return_package_sha256: sha256File(copied.returnPackage),
    participant_receipt_id: data.returnData.participant.receipt.receipt_id,
    participant_receipt_sha256: sha256File(copied.participantReceipt),
    ticket_id: data.returnData.value.ticket_id,
    destination_wc_account: data.returnData.participant.ticket.account,
    fixed_award_wc: data.returnData.participant.delta,
    phase: "prepared",
    acceptance_attempted: false,
    adapter_attempted: false,
    duplicate_probe_attempted: false,
    raw_acceptance_result_path: null,
    raw_acceptance_result_sha256: null,
    acceptance_receipt_path: null,
    acceptance_receipt_sha256: null,
    raw_adapter_result_path: null,
    raw_adapter_result_sha256: null,
    adapter_receipt_path: null,
    adapter_receipt_sha256: null,
    raw_duplicate_result_path: null,
    raw_duplicate_result_sha256: null,
    completed_plan_path: null,
    completed_plan_sha256: null,
    completion_receipt_path: null,
    completion_receipt_sha256: null,
    public_evidence_path: null,
    public_evidence_sha256: null,
    authority: FINALIZATION_AUTHORITY,
  };
  validateState(state, opId);
  writeExclusive(existingPath, state);
  return { data, state };
}

function expandArgv(profile, paths) {
  const replacements = {
    "{participant_receipt_path}": paths.participantReceiptPath,
    "{return_package_path}": paths.returnPackagePath,
    "{acceptance_receipt_path}": paths.acceptanceReceiptPath,
    "{adapter_receipt_path}": paths.adapterReceiptPath,
    "{binding_registry_path}": paths.bindingRegistryPath,
    "{adapter_plan_path}": paths.adapterPlanPath,
    "{execution_dir}": paths.outputDir,
  };
  return profile.argv.map((entry) => replacements[entry] ?? entry);
}

function defaultHostInspector() {
  const stdout = execFileSync("tailscale", ["ip", "-4"], { encoding: "utf8", timeout: 10000 });
  return { tailscale_ip: stdout.trim().split(/\s+/)[0] };
}

function defaultCommandTransport({ profile, paths, mode }) {
  const argv = expandArgv(profile, paths);
  return new Promise((resolve, reject) => {
    const child = spawn(profile.command, argv, {
      cwd: paths.outputDir,
      env: { ...process.env, VOID_FINALIZATION_MODE: mode },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${mode} transport timed out`));
    }, profile.timeout_ms);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
      if (stdout.length > 2 * 1024 * 1024) child.kill("SIGKILL");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
      if (stderr.length > 2 * 1024 * 1024) child.kill("SIGKILL");
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (exitCode, signal) => {
      clearTimeout(timer);
      let response = null;
      try {
        response = JSON.parse(stdout.trim());
      } catch {
        response = null;
      }
      resolve({
        exit_code: exitCode,
        signal,
        stdout,
        stderr,
        response,
        expanded_argv_sha256: sha256Text(canonicalJson(argv)),
      });
    });
  });
}

function rawResult(marker, operationIdValue, mode, transportResult, atUtc) {
  return {
    marker,
    version: 1,
    created_at_utc: atUtc,
    operation_id: operationIdValue,
    mode,
    exit_code: transportResult.exit_code,
    signal: transportResult.signal ?? null,
    stdout: transportResult.stdout ?? "",
    stderr: transportResult.stderr ?? "",
    expanded_argv_sha256: transportResult.expanded_argv_sha256,
    response: transportResult.response,
  };
}

function validateTransportEnvelope(rawValue, marker, state, profile, label) {
  const raw = object(rawValue, label);
  if (
    raw.marker !== marker ||
    raw.version !== 1 ||
    raw.operation_id !== state.operation_id ||
    raw.exit_code !== profile.success_exit_code
  ) {
    fail(`${label} status/identity mismatch`);
  }
  string(raw.expanded_argv_sha256, `${label} expanded argv SHA`, HEX64);
  if (TOKEN_SCAN.test(String(raw.stdout ?? "")) || TOKEN_SCAN.test(String(raw.stderr ?? ""))) {
    fail(`${label} printed a raw capability token`);
  }
  return object(raw.response, `${label} response`);
}

function acceptanceReceiptBasis(receipt) {
  const { acceptance_receipt_id: _ignored, ...basis } = receipt;
  return basis;
}

function validateAcceptanceResponse(rawValue, state, data) {
  const response = validateTransportEnvelope(
    rawValue,
    RAW_ACCEPTANCE_RESULT_MARKER,
    state,
    data.profile.transports.acceptance,
    "verified receipt acceptance result",
  );
  if (response.ok !== true || response.duplicate !== false) {
    fail("verified receipt acceptance response must be first-success non-duplicate");
  }
  const receipt = object(response.receipt, "verified receipt acceptance receipt");
  if (receipt.marker !== ACCEPTANCE_RECEIPT_MARKER || receipt.version !== 1) {
    fail("verified receipt acceptance receipt marker/version mismatch");
  }
  noToken(receipt, "verified receipt acceptance receipt");
  const receiptId = string(receipt.acceptance_receipt_id, "acceptance receipt ID", ACCEPTANCE_ID);
  if (receiptId !== `voidapwfvra1_${sha256Text(canonicalJson(acceptanceReceiptBasis(receipt)))}`) {
    fail("acceptance receipt ID does not match canonical payload");
  }
  if (
    receipt.operation_id !== state.operation_id ||
    receipt.fulfillment_id !== state.fulfillment_id ||
    receipt.participant_receipt_id !== state.participant_receipt_id ||
    receipt.participant_receipt_sha256 !== state.participant_receipt_sha256 ||
    receipt.ticket_id !== state.ticket_id ||
    receipt.account !== state.destination_wc_account ||
    receipt.executor_node_id !== data.returnData.participant.ticket.executor_node_id ||
    receipt.accepted !== true ||
    receipt.duplicate !== false ||
    receipt.raw_capability_token_present !== false
  ) {
    fail("verified receipt acceptance receipt semantic mismatch");
  }
  const verification = object(receipt.verification, "verified receipt acceptance verification");
  for (const key of [
    "signature_verified",
    "remote_health_verified",
    "remote_job_verified",
    "remote_receipt_verified",
    "capability_consumed",
  ]) {
    if (verification[key] !== true) fail(`verified receipt acceptance ${key} must be true`);
  }
  return receipt;
}

function validateAdapterReceipt(receiptValue, state, data) {
  const receipt = object(receiptValue, "adapter execution receipt");
  if (receipt.marker !== ADAPTER_RECEIPT_MARKER || receipt.version !== 1) {
    fail("adapter execution receipt marker/version mismatch");
  }
  noToken(receipt, "adapter execution receipt");
  string(receipt.adapter_receipt_id, "adapter receipt ID", ADAPTER_ID);
  string(receipt.plan_id, "adapter receipt plan ID", ADAPTER_PLAN_ID);
  const submission = object(receipt.submission, "adapter receipt submission");
  if (
    submission.submission_receipt_id !== data.sourcePlan.request.submission.submission_receipt_id ||
    submission.work_order_id !== data.sourcePlan.request.submission.work_order_id ||
    submission.credential_id !== data.sourcePlan.request.submission.credential_id
  ) {
    fail("adapter receipt submission mismatch");
  }
  const binding = object(receipt.binding, "adapter receipt binding");
  if (
    binding.binding_id !== data.sourcePlan.request.binding.binding_id ||
    binding.binding_registry_sha256 !== data.sourcePlan.request.binding.binding_registry_sha256 ||
    binding.destination_wc_account !== state.destination_wc_account
  ) {
    fail("adapter receipt binding mismatch");
  }
  const participant = object(receipt.participant, "adapter receipt participant");
  if (
    participant.marker !== "VOID_WC_PUBLIC_EARNING_PARTICIPANT_CLI_V1" ||
    participant.account !== state.destination_wc_account ||
    participant.ticket_id !== state.ticket_id ||
    participant.receipt_id !== state.participant_receipt_id ||
    participant.ticket_deleted !== true ||
    typeof participant.recovered_from_existing_participant_receipt !== "boolean"
  ) {
    fail("adapter receipt participant mismatch");
  }
  const wc = object(receipt.wc, "adapter receipt WC");
  const before = integer(wc.before, "adapter receipt WC before", 0, 1000000000000);
  const after = integer(wc.after, "adapter receipt WC after", 0, 1000000000000);
  if (
    wc.delta !== state.fixed_award_wc ||
    wc.fixed_award_wc !== state.fixed_award_wc ||
    wc.credited !== true ||
    wc.duplicate !== false ||
    wc.canonical_redeemable !== true ||
    after - before !== state.fixed_award_wc ||
    before !== data.returnData.participant.before ||
    after !== data.returnData.participant.after
  ) {
    fail("adapter receipt WC mismatch");
  }
  const verification = object(receipt.verification, "adapter receipt verification");
  for (const key of [
    "remote_executor",
    "signature_verified",
    "remote_health_verified",
    "remote_job_verified",
    "remote_receipt_verified",
    "capability_consumed",
  ]) {
    if (verification[key] !== true) fail(`adapter receipt verification ${key} must be true`);
  }
  for (const key of ["participant_selected_award", "automatic_background_loop", "money_movement"]) {
    if (verification[key] !== false) fail(`adapter receipt verification ${key} must be false`);
  }
  const adapterAuthority = object(receipt.authority, "adapter receipt authority");
  if (
    adapterAuthority.live_work_execution !== true ||
    adapterAuthority.wc_ledger_write !== true ||
    adapterAuthority.payment_transfer !== false ||
    adapterAuthority.wc_to_void_settlement !== false ||
    adapterAuthority.wallet_or_signer_access !== false ||
    adapterAuthority.service_restart !== false ||
    adapterAuthority.deployment !== false ||
    receipt.raw_capability_token_printed !== false
  ) {
    fail("adapter receipt authority mismatch");
  }
  return receipt;
}

function validateAdapterResponse(rawValue, state, data) {
  const response = validateTransportEnvelope(
    rawValue,
    RAW_ADAPTER_RESULT_MARKER,
    state,
    data.profile.transports.adapter,
    "adapter finalization result",
  );
  if (response.ok !== true || response.duplicate !== false) {
    fail("adapter finalization response must be first-success non-duplicate");
  }
  return validateAdapterReceipt(response.receipt, state, data);
}

function validateDuplicateResponse(rawValue, state, data, adapterReceipt) {
  const response = validateTransportEnvelope(
    rawValue,
    RAW_DUPLICATE_RESULT_MARKER,
    state,
    data.profile.transports.adapter,
    "adapter duplicate probe result",
  );
  if (response.ok !== true || response.duplicate !== true) {
    fail("adapter duplicate probe must return duplicate=true");
  }
  const duplicateReceipt = validateAdapterReceipt(response.receipt, state, data);
  if (canonicalJson(duplicateReceipt) !== canonicalJson(adapterReceipt)) {
    fail("adapter duplicate probe returned a different receipt");
  }
  return duplicateReceipt;
}

function pathsFor(outputDir, data) {
  return {
    outputDir,
    returnPackagePath: path.join(outputDir, FILES.returnPackage),
    participantReceiptPath: path.join(outputDir, FILES.participantReceipt),
    acceptanceReceiptPath: path.join(outputDir, FILES.acceptanceReceipt),
    adapterReceiptPath: path.join(outputDir, FILES.adapterReceipt),
    bindingRegistryPath: data.bindingRegistryPath,
    adapterPlanPath: path.join(outputDir, FILES.adapterPlan),
  };
}

function persistAcceptance(outputDir, state, data, rawValue, atUtc) {
  const receipt = validateAcceptanceResponse(rawValue, state, data);
  const rawPath = path.join(outputDir, FILES.rawAcceptance);
  const receiptPath = path.join(outputDir, FILES.acceptanceReceipt);
  if (!fs.existsSync(rawPath)) writeExclusive(rawPath, rawValue);
  if (!fs.existsSync(receiptPath)) writeExclusive(receiptPath, receipt);
  state = setState(outputDir, state, {
    phase: "acceptance_receipt_persisted",
    raw_acceptance_result_path: rawPath,
    raw_acceptance_result_sha256: sha256File(rawPath),
    acceptance_receipt_path: receiptPath,
    acceptance_receipt_sha256: sha256File(receiptPath),
  }, atUtc);
  return { state, receipt };
}

function persistAdapter(outputDir, state, data, rawValue, atUtc) {
  const receipt = validateAdapterResponse(rawValue, state, data);
  const rawPath = path.join(outputDir, FILES.rawAdapter);
  const receiptPath = path.join(outputDir, FILES.adapterReceipt);
  if (!fs.existsSync(rawPath)) writeExclusive(rawPath, rawValue);
  if (!fs.existsSync(receiptPath)) writeExclusive(receiptPath, receipt);
  state = setState(outputDir, state, {
    phase: "adapter_receipt_persisted",
    raw_adapter_result_path: rawPath,
    raw_adapter_result_sha256: sha256File(rawPath),
    adapter_receipt_path: receiptPath,
    adapter_receipt_sha256: sha256File(receiptPath),
  }, atUtc);
  return { state, receipt };
}

function persistDuplicate(outputDir, state, data, rawValue, adapterReceipt, atUtc) {
  validateDuplicateResponse(rawValue, state, data, adapterReceipt);
  const rawPath = path.join(outputDir, FILES.rawDuplicate);
  if (!fs.existsSync(rawPath)) writeExclusive(rawPath, rawValue);
  state = setState(outputDir, state, {
    phase: "duplicate_verified",
    raw_duplicate_result_path: rawPath,
    raw_duplicate_result_sha256: sha256File(rawPath),
  }, atUtc);
  return state;
}

function completionReceipt(state, data, adapterReceipt, acceptanceReceipt, completedPlan, atUtc) {
  return {
    marker: COMPLETION_RECEIPT_MARKER,
    version: 1,
    created_at_utc: atUtc,
    operation_id: state.operation_id,
    fulfillment_id: state.fulfillment_id,
    source_plan_id: state.source_plan_id,
    adapter_plan_id: state.adapter_plan_id,
    completed_plan_id: completedPlan.plan_id,
    participant_receipt_id: state.participant_receipt_id,
    ticket_id: state.ticket_id,
    destination_wc_account: state.destination_wc_account,
    acceptance: {
      acceptance_receipt_id: acceptanceReceipt.acceptance_receipt_id,
      acceptance_receipt_sha256: state.acceptance_receipt_sha256,
      accepted_once: true,
    },
    adapter: {
      adapter_receipt_id: adapterReceipt.adapter_receipt_id,
      adapter_receipt_sha256: state.adapter_receipt_sha256,
      duplicate_finalization_verified: true,
      duplicate_second_wc_credit: false,
    },
    wc: {
      before: adapterReceipt.wc.before,
      after: adapterReceipt.wc.after,
      delta: adapterReceipt.wc.delta,
      fixed_award_wc: state.fixed_award_wc,
      credited_once: true,
    },
    verification: {
      return_package_verified: true,
      participant_receipt_verified: true,
      executor_identity_verified: true,
      binding_verified: true,
      verified_receipt_acceptance_invoked_once: true,
      canonical_adapter_invoked_once: true,
      adapter_duplicate_probe_verified: true,
      token_artifacts_deleted: true,
      raw_capability_token_present: false,
      fulfillment_completed: true,
    },
    authority: FINALIZATION_AUTHORITY,
  };
}

function publicEvidence(state, adapterReceipt, acceptanceReceipt, completionReceiptValue, atUtc) {
  return {
    marker: PUBLIC_EVIDENCE_CANDIDATE_MARKER,
    version: 1,
    created_at_utc: atUtc,
    fulfillment_id: state.fulfillment_id,
    operation_id: state.operation_id,
    participant_receipt_id: state.participant_receipt_id,
    ticket_id: state.ticket_id,
    destination_wc_account: state.destination_wc_account,
    acceptance_receipt_id: acceptanceReceipt.acceptance_receipt_id,
    adapter_receipt_id: adapterReceipt.adapter_receipt_id,
    completion_receipt_sha256: sha256Text(canonicalJson(completionReceiptValue)),
    wc: {
      before: adapterReceipt.wc.before,
      after: adapterReceipt.wc.after,
      delta: adapterReceipt.wc.delta,
    },
    verification: {
      remote_execution_verified: true,
      ticket_consumed_once: true,
      receipt_accepted_once: true,
      wc_credited_once: true,
      duplicate_second_wc_credit: false,
      token_artifacts_deleted: true,
      raw_capability_token_present: false,
    },
  };
}

function finalizeComplete(outputDir, state, data, atUtc) {
  const adapterReceipt = safeJson(state.adapter_receipt_path, "adapter execution receipt");
  validateAdapterReceipt(adapterReceipt, state, data);
  const acceptanceReceipt = safeJson(state.acceptance_receipt_path, "verified receipt acceptance receipt");
  const adapterPlan = safeJson(path.join(outputDir, FILES.adapterPlan), "adapter-finalization-planned plan");
  if (inspectPlan(adapterPlan).state !== "adapter_finalization_planned") {
    fail("adapter plan is not adapter_finalization_planned");
  }
  const event = buildEvent({
    fulfillment_id: adapterPlan.fulfillment_id,
    expected_revision: adapterPlan.revision,
    from_state: "adapter_finalization_planned",
    to_state: "completed",
    occurred_at_utc: atUtc,
    evidence: {
      adapter_receipt_id: adapterReceipt.adapter_receipt_id,
      adapter_receipt_sha256: state.adapter_receipt_sha256,
      duplicate_finalization_verified: true,
      duplicate_second_wc_credit: false,
      token_artifacts_deleted: true,
    },
    nonce: `${state.operation_id}-completed`,
  });
  const advanced = advancePlan(adapterPlan, event, ADVANCE_CONFIRMATION);
  if (advanced.duplicate !== false || inspectPlan(advanced.plan).state !== "completed") {
    fail("completion event is not orchestrator-compatible");
  }
  const eventPath = path.join(outputDir, FILES.completionEvent);
  const completedPlanPath = path.join(outputDir, FILES.completedPlan);
  const completionReceiptPath = path.join(outputDir, FILES.completionReceipt);
  const publicEvidencePath = path.join(outputDir, FILES.publicEvidence);
  const completion = completionReceipt(state, data, adapterReceipt, acceptanceReceipt, advanced.plan, atUtc);
  const evidence = publicEvidence(state, adapterReceipt, acceptanceReceipt, completion, atUtc);
  noToken(event, "completion event");
  noToken(completion, "completion receipt");
  noToken(evidence, "public evidence candidate");
  if (!fs.existsSync(eventPath)) writeExclusive(eventPath, event);
  if (!fs.existsSync(completedPlanPath)) writeExclusive(completedPlanPath, advanced.plan);
  if (!fs.existsSync(completionReceiptPath)) writeExclusive(completionReceiptPath, completion);
  if (!fs.existsSync(publicEvidencePath)) writeExclusive(publicEvidencePath, evidence);
  state = setState(outputDir, state, {
    phase: "complete",
    completed_plan_path: completedPlanPath,
    completed_plan_sha256: sha256File(completedPlanPath),
    completion_receipt_path: completionReceiptPath,
    completion_receipt_sha256: sha256File(completionReceiptPath),
    public_evidence_path: publicEvidencePath,
    public_evidence_sha256: sha256File(publicEvidencePath),
  }, atUtc);
  return { state, completion, evidence, completedPlan: advanced.plan };
}

async function continueOperation(data, outputDir, state, acceptanceTransport, adapterTransport, hostInspector) {
  const host = await hostInspector();
  if (host.tailscale_ip !== data.profile.coordinator.tailscale_ip) {
    fail("local Precision host identity mismatch");
  }
  const paths = pathsFor(outputDir, data);
  if (state.phase === "prepared") {
    state = setState(outputDir, state, {
      phase: "acceptance_running",
      acceptance_attempted: true,
    }, new Date().toISOString());
    try {
      const result = await acceptanceTransport({
        mode: "accept",
        profile: data.profile.transports.acceptance,
        paths,
        state,
        data,
      });
      const raw = rawResult(
        RAW_ACCEPTANCE_RESULT_MARKER,
        state.operation_id,
        "accept",
        result,
        new Date().toISOString(),
      );
      ({ state } = persistAcceptance(outputDir, state, data, raw, raw.created_at_utc));
    } catch (error) {
      state = setState(outputDir, state, { phase: "ambiguous_after_acceptance_attempt" }, new Date().toISOString());
      throw error;
    }
  }
  if (state.phase === "acceptance_receipt_persisted") {
    state = setState(outputDir, state, {
      phase: "adapter_running",
      adapter_attempted: true,
    }, new Date().toISOString());
    try {
      const result = await adapterTransport({
        mode: "execute",
        profile: data.profile.transports.adapter,
        paths,
        state,
        data,
      });
      const raw = rawResult(
        RAW_ADAPTER_RESULT_MARKER,
        state.operation_id,
        "execute",
        result,
        new Date().toISOString(),
      );
      ({ state } = persistAdapter(outputDir, state, data, raw, raw.created_at_utc));
    } catch (error) {
      state = setState(outputDir, state, { phase: "ambiguous_after_adapter_attempt" }, new Date().toISOString());
      throw error;
    }
  }
  if (state.phase === "adapter_receipt_persisted") {
    const adapterReceipt = safeJson(state.adapter_receipt_path, "adapter execution receipt");
    state = setState(outputDir, state, {
      phase: "duplicate_probe_running",
      duplicate_probe_attempted: true,
    }, new Date().toISOString());
    try {
      const result = await adapterTransport({
        mode: "duplicate_probe",
        profile: data.profile.transports.adapter,
        paths,
        state,
        data,
      });
      const raw = rawResult(
        RAW_DUPLICATE_RESULT_MARKER,
        state.operation_id,
        "duplicate_probe",
        result,
        new Date().toISOString(),
      );
      state = persistDuplicate(outputDir, state, data, raw, adapterReceipt, raw.created_at_utc);
    } catch (error) {
      state = setState(outputDir, state, { phase: "ambiguous_after_duplicate_probe_attempt" }, new Date().toISOString());
      throw error;
    }
  }
  if (state.phase === "duplicate_verified") {
    return finalizeComplete(outputDir, state, data, new Date().toISOString());
  }
  if (state.phase === "complete") {
    return {
      state,
      completion: safeJson(state.completion_receipt_path, "completion receipt"),
      evidence: safeJson(state.public_evidence_path, "public evidence candidate"),
      completedPlan: safeJson(state.completed_plan_path, "completed plan"),
    };
  }
  fail(`cannot continue finalization from phase ${state.phase}`);
}

export async function executeReturnPackageAcceptanceAndAdapterFinalize(
  input,
  outputDir,
  confirmation,
  acceptanceTransport = defaultCommandTransport,
  adapterTransport = defaultCommandTransport,
  hostInspector = defaultHostInspector,
) {
  if (confirmation !== EXECUTE_CONFIRMATION) fail("explicit finalization confirmation mismatch");
  const { data, state: initialState } = prepare(input, outputDir);
  if (initialState.phase === "complete") {
    return {
      marker: EXECUTE_MARKER,
      duplicate: true,
      operation_id: initialState.operation_id,
      phase: "complete",
      participant_receipt_acceptance: true,
      wc_ledger_write: true,
      ticket_issuance: false,
      ticket_transfer: false,
      remote_work_execution: false,
    };
  }
  if (initialState.phase.startsWith("ambiguous_after_")) {
    fail("finalization operation is ambiguous; explicit recovery is required");
  }
  const result = await continueOperation(
    data,
    outputDir,
    initialState,
    acceptanceTransport,
    adapterTransport,
    hostInspector,
  );
  return {
    marker: EXECUTE_MARKER,
    duplicate: false,
    operation_id: result.state.operation_id,
    phase: result.state.phase,
    acceptance_receipt_id: result.completion.acceptance.acceptance_receipt_id,
    adapter_receipt_id: result.completion.adapter.adapter_receipt_id,
    wc: result.completion.wc,
    duplicate_finalization_verified: true,
    duplicate_second_wc_credit: false,
    fulfillment_completed: true,
    participant_receipt_acceptance: true,
    wc_ledger_write: true,
    ticket_issuance: false,
    ticket_transfer: false,
    remote_work_execution: false,
  };
}

export async function recoverReturnPackageAcceptanceAndAdapterFinalize(
  input,
  outputDir,
  rawResultPath,
  confirmation,
  acceptanceTransport = defaultCommandTransport,
  adapterTransport = defaultCommandTransport,
  hostInspector = defaultHostInspector,
) {
  if (confirmation !== RECOVER_CONFIRMATION) fail("explicit finalization recovery confirmation mismatch");
  const { data, state: initialState } = prepare(input, outputDir);
  let state = initialState;
  const raw = safeJson(rawResultPath, "recovery raw result");
  if (raw.operation_id !== state.operation_id) fail("recovery raw result operation mismatch");
  if (state.phase === "ambiguous_after_acceptance_attempt") {
    ({ state } = persistAcceptance(outputDir, state, data, raw, utc(raw.created_at_utc, "raw acceptance created_at_utc")));
  } else if (state.phase === "ambiguous_after_adapter_attempt") {
    ({ state } = persistAdapter(outputDir, state, data, raw, utc(raw.created_at_utc, "raw adapter created_at_utc")));
  } else if (state.phase === "ambiguous_after_duplicate_probe_attempt") {
    const adapterReceipt = safeJson(state.adapter_receipt_path, "adapter execution receipt");
    state = persistDuplicate(
      outputDir,
      state,
      data,
      raw,
      adapterReceipt,
      utc(raw.created_at_utc, "raw duplicate created_at_utc"),
    );
  } else {
    fail("recovery is only allowed from an ambiguous phase");
  }
  const result = await continueOperation(
    data,
    outputDir,
    state,
    acceptanceTransport,
    adapterTransport,
    hostInspector,
  );
  return {
    marker: RECOVER_MARKER,
    recovered: true,
    operation_id: result.state.operation_id,
    phase: result.state.phase,
    acceptance_receipt_id: result.completion.acceptance.acceptance_receipt_id,
    adapter_receipt_id: result.completion.adapter.adapter_receipt_id,
    wc: result.completion.wc,
    duplicate_finalization_verified: true,
    duplicate_second_wc_credit: false,
    fulfillment_completed: true,
  };
}

export function inspectReturnPackageAcceptanceAndAdapterFinalize(outputDir) {
  const state = safeJson(statePath(outputDir), "finalization operation state");
  validateState(state, state.operation_id);
  const metadata = fs.lstatSync(outputDir);
  const files = {};
  let allJson0600 = true;
  for (const [key, name] of Object.entries(FILES)) {
    const file = path.join(outputDir, name);
    if (!fs.existsSync(file)) continue;
    const fileMeta = fs.lstatSync(file);
    files[key] = {
      path: file,
      sha256: sha256File(file),
      mode: (fileMeta.mode & 0o777).toString(8).padStart(4, "0"),
    };
    if (name.endsWith(".json") && (fileMeta.mode & 0o777) !== 0o600) allJson0600 = false;
  }
  const result = {
    marker: INSPECTION_MARKER,
    version: 1,
    operation_id: state.operation_id,
    phase: state.phase,
    fulfillment_id: state.fulfillment_id,
    ticket_id: state.ticket_id,
    destination_wc_account: state.destination_wc_account,
    acceptance_attempted: state.acceptance_attempted,
    adapter_attempted: state.adapter_attempted,
    duplicate_probe_attempted: state.duplicate_probe_attempted,
    output_dir_mode_0700: (metadata.mode & 0o777) === 0o700,
    all_existing_json_files_mode_0600: allJson0600,
    files,
    raw_capability_token_present: false,
    authority: FINALIZATION_AUTHORITY,
  };
  noToken(result, "finalization inspection");
  return result;
}

function readCliJson(file) {
  return JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
}

function flag(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || index + 1 >= process.argv.length) fail(`missing ${name}`);
  return process.argv[index + 1];
}

async function main() {
  const command = process.argv[2];
  if (command === "execute") {
    const result = await executeReturnPackageAcceptanceAndAdapterFinalize(
      readCliJson(flag("--input")),
      path.resolve(flag("--output-dir")),
      flag("--confirm"),
    );
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  if (command === "recover") {
    const result = await recoverReturnPackageAcceptanceAndAdapterFinalize(
      readCliJson(flag("--input")),
      path.resolve(flag("--output-dir")),
      path.resolve(flag("--raw-result")),
      flag("--confirm"),
    );
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  if (command === "inspect") {
    process.stdout.write(`${JSON.stringify(inspectReturnPackageAcceptanceAndAdapterFinalize(path.resolve(flag("--output-dir"))))}\n`);
    return;
  }
  fail("usage: execute|recover|inspect");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
