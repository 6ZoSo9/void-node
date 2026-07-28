#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
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
  inspectTransitionPackage,
} from "./external_agent_paid_work_fulfillment_transition_executor_v1.ts";

export const TRANSPORT_PROFILE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_TICKET_ISSUE_TRANSPORT_PROFILE_V1";
export const ISSUE_REQUEST_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_TICKET_ISSUE_REQUEST_V1";
export const OPERATION_STATE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_TICKET_ISSUE_OPERATION_STATE_V1";
export const SANITIZED_RECEIPT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_TICKET_ISSUE_RECEIPT_V1";
export const EXECUTE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_TICKET_ISSUE_EXECUTOR_EXECUTE_V1";
export const RECOVER_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_TICKET_ISSUE_EXECUTOR_RECOVER_V1";
export const INSPECTION_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_TICKET_ISSUE_EXECUTOR_INSPECTION_V1";

export const EXECUTE_CONFIRMATION =
  "execute-external-agent-paid-work-fulfillment-ticket-issue-executor-v1";
export const RECOVER_CONFIRMATION =
  "recover-external-agent-paid-work-fulfillment-ticket-issue-executor-v1";

export const ISSUE_AUTHORITY = Object.freeze({
  plan_read: true,
  transition_package_read: true,
  private_operation_state_write: true,
  private_plan_advance: true,
  ticket_issuance: true,
  private_token_write_once: true,
  sanitized_receipt_write: true,
  next_event_write: true,
  ticket_transfer: false,
  work_dispatch: false,
  live_work_execution: false,
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
const HEX32 = /^[0-9a-f]{32}$/;
const NODE_ID = /^[0-9a-f]{32}$/;
const ID = /^[A-Za-z0-9._:-]{4,240}$/;
const POINTER = /^(?:\/(?:[^~/]|~0|~1)*)+$/;

const FILES = Object.freeze({
  state: "operation-state-v1.json",
  advancedPlan: "advanced-plan-ticket-issue-planned-v1.json",
  profile: "transport-profile-v1.json",
  request: "issue-request-v1.json",
  rawResponse: "raw-ticket-issue-response-v1.json",
  operatorTicket: "operator-ticket-v1.json",
  receipt: "sanitized-ticket-issue-receipt-v1.json",
  nextEvent: "ticket-package-planned-event-v1.json",
});

const VALID_PHASES = [
  "prepared",
  "issuing",
  "issued_raw_persisted",
  "complete",
  "ambiguous_after_issue_attempt",
];

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
  if (canonicalJson(value) !== canonicalJson(ISSUE_AUTHORITY)) {
    fail("ticket-issue authority mismatch");
  }
}

function safeJson(file, label) {
  const meta = fs.lstatSync(file);
  if (!meta.isFile() || meta.isSymbolicLink() || meta.size > 16 * 1024 * 1024) {
    fail(`${label} is not a safe JSON file`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeExclusive(file, value) {
  const payload = JSON.stringify(value, null, 2) + "\n";
  const fd = fs.openSync(
    file,
    fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL,
    0o600,
  );
  try {
    fs.writeFileSync(fd, payload, "utf8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
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
  const meta = fs.lstatSync(outputDir);
  if (!meta.isDirectory() || meta.isSymbolicLink() || (meta.mode & 0o777) !== 0o700) {
    fail("operation output directory must be a real mode-0700 directory");
  }
}

function pointerGet(value, pointer, label) {
  string(pointer, `${label}.pointer`, POINTER, 1024);
  let current = value;
  for (const raw of pointer.slice(1).split("/")) {
    const key = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (Array.isArray(current)) {
      if (!/^(?:0|[1-9][0-9]*)$/.test(key)) fail(`${label} pointer mismatch`);
      current = current[Number(key)];
    } else if (isObject(current)) {
      current = current[key];
    } else {
      fail(`${label} pointer cannot traverse value`);
    }
    if (current === undefined) fail(`${label} pointer does not resolve`);
  }
  return current;
}

function bindingMap(value, label, keys) {
  const map = object(value, label);
  if (canonicalJson(Object.keys(map).sort()) !== canonicalJson([...keys].sort())) {
    fail(`${label} key set mismatch`);
  }
  for (const key of keys) string(map[key], `${label}.${key}`, POINTER, 1024);
  return map;
}

function validateProfile(value) {
  const profile = object(value, "transport profile");
  if (profile.marker !== TRANSPORT_PROFILE_MARKER || profile.version !== 1) {
    fail("transport profile marker/version mismatch");
  }
  noToken(profile, "transport profile");
  const parsed = new URL(string(profile.issue_url, "transport profile issue_url"));
  if (!["http:", "https:"].includes(parsed.protocol)) fail("issue URL protocol mismatch");
  string(profile.confirmation_query_name, "confirmation query name", /^[A-Za-z][A-Za-z0-9_-]{0,80}$/);
  string(profile.issue_confirmation, "issue confirmation", /^[A-Za-z][A-Za-z0-9-]{8,180}$/);
  integer(profile.success_http_status, "success HTTP status", 200, 299);
  const requestBindings = bindingMap(
    profile.request_bindings,
    "request bindings",
    ["account", "executor_node_id", "task_class", "dataset_id", "expected_input_hash", "ttl_ms", "max_uses"],
  );
  const responseBindings = bindingMap(
    profile.response_bindings,
    "response bindings",
    ["ticket_id", "capability_token", "account", "executor_node_id", "task_class", "dataset_id", "expected_input_hash", "issued_at_ms", "expires_at_ms", "ttl_ms", "max_uses", "fixed_award_wc"],
  );
  return { profile, requestBindings, responseBindings };
}

function validateTransition(sourcePlan, packageDir) {
  const sourceInspection = inspectPlan(sourcePlan);
  if (
    sourceInspection.state !== "accepted_submission_bound" ||
    sourceInspection.next_transition !== "ticket_issue_planned"
  ) {
    fail("source plan is not ready for ticket issue planning");
  }
  const packageInspection = inspectTransitionPackage(packageDir);
  const event = safeJson(path.join(packageDir, "orchestrator-event-v1.json"), "transition event");
  if (
    !packageInspection.valid ||
    packageInspection.source_plan_id !== sourceInspection.plan_id ||
    packageInspection.source_plan_revision !== sourceInspection.revision ||
    packageInspection.fulfillment_id !== sourceInspection.fulfillment_id ||
    packageInspection.transition.from_state !== "accepted_submission_bound" ||
    packageInspection.transition.to_state !== "ticket_issue_planned" ||
    packageInspection.ticket_issued !== false
  ) {
    fail("transition package does not match source plan");
  }
  const advanced = advancePlan(sourcePlan, event, ADVANCE_CONFIRMATION);
  const advancedInspection = inspectPlan(advanced.plan);
  if (
    advanced.duplicate ||
    advancedInspection.state !== "ticket_issue_planned" ||
    advancedInspection.next_transition !== "ticket_package_planned"
  ) {
    fail("private plan advance mismatch");
  }
  return { sourceInspection, packageInspection, advancedPlan: advanced.plan, advancedInspection };
}

function validateIssueRequest(value, advancedPlan, profileInfo) {
  const request = object(value, "issue request");
  if (request.marker !== ISSUE_REQUEST_MARKER || request.version !== 1) {
    fail("issue request marker/version mismatch");
  }
  noToken(request, "issue request");
  utc(request.created_at_utc, "issue request created_at_utc");
  string(request.nonce, "issue request nonce", ID);
  const body = object(request.request_body, "issue request body");
  const b = profileInfo.requestBindings;
  const semantics = {
    account: string(pointerGet(body, b.account, "request account"), "request account value", ID),
    executor_node_id: string(pointerGet(body, b.executor_node_id, "request executor"), "request executor value", NODE_ID),
    task_class: string(pointerGet(body, b.task_class, "request task class"), "request task class value", ID),
    dataset_id: string(pointerGet(body, b.dataset_id, "request dataset"), "request dataset value", ID),
    expected_input_hash: string(pointerGet(body, b.expected_input_hash, "request input hash"), "request input hash value", HEX64),
    ttl_ms: integer(pointerGet(body, b.ttl_ms, "request TTL"), "request TTL value", 60000, 86400000),
    max_uses: integer(pointerGet(body, b.max_uses, "request max uses"), "request max uses value", 1, 1),
  };
  const source = advancedPlan.request;
  if (
    semantics.account !== source.binding.destination_wc_account ||
    semantics.executor_node_id !== source.execution_contract.executor_node_id ||
    semantics.task_class !== source.submission.task_class ||
    semantics.ttl_ms !== source.execution_contract.ticket_ttl_ms
  ) {
    fail("issue request semantic fields do not match source plan");
  }
  if (request.expected_request_body_sha256 !== sha256Text(canonicalJson(body))) {
    fail("issue request body SHA mismatch");
  }
  return { request, body, semantics };
}

function operationId(sourcePlan, transition, advancedPlan, profile, issueRequest) {
  return `voidapwfissueop1_${sha256Text(canonicalJson({
    version: 1,
    source_plan_id: sourcePlan.plan_id,
    transition_package_id: transition.package_id,
    advanced_plan_id: advancedPlan.plan_id,
    transport_profile_sha256: sha256Text(canonicalJson(profile)),
    issue_request_sha256: sha256Text(canonicalJson(issueRequest)),
  }))}`;
}

function stateFile(outputDir) {
  return path.join(outputDir, FILES.state);
}

function validateState(state, expectedId) {
  if (
    state.marker !== OPERATION_STATE_MARKER ||
    state.version !== 1 ||
    state.operation_id !== expectedId ||
    !VALID_PHASES.includes(state.phase)
  ) {
    fail("operation state identity/phase mismatch");
  }
  noToken(state, "operation state");
  authority(state.authority);
  return state;
}

function setState(outputDir, state, patch, updatedAtUtc) {
  const next = { ...state, ...patch, updated_at_utc: updatedAtUtc };
  validateState(next, state.operation_id);
  writeAtomic(stateFile(outputDir), next);
  return next;
}

function initialize({ outputDir, operationIdValue, input, transition, profile, issueRequest, atUtc }) {
  ensureOutputDir(outputDir);
  if (fs.existsSync(stateFile(outputDir))) {
    return validateState(safeJson(stateFile(outputDir), "operation state"), operationIdValue);
  }
  const advancedPlanPath = path.join(outputDir, FILES.advancedPlan);
  const profilePath = path.join(outputDir, FILES.profile);
  const requestPath = path.join(outputDir, FILES.request);
  writeExclusive(advancedPlanPath, transition.advancedPlan);
  writeExclusive(profilePath, profile);
  writeExclusive(requestPath, issueRequest);
  const state = {
    marker: OPERATION_STATE_MARKER,
    version: 1,
    created_at_utc: atUtc,
    updated_at_utc: atUtc,
    operation_id: operationIdValue,
    phase: "prepared",
    source_plan_path: input.source_plan_path,
    source_plan_sha256: sha256File(input.source_plan_path),
    transition_package_dir: input.transition_package_dir,
    transition_package_id: transition.packageInspection.package_id,
    advanced_plan_path: advancedPlanPath,
    advanced_plan_sha256: sha256File(advancedPlanPath),
    transport_profile_path: profilePath,
    transport_profile_sha256: sha256File(profilePath),
    issue_request_path: requestPath,
    issue_request_sha256: sha256File(requestPath),
    raw_response_path: null,
    operator_ticket_path: null,
    sanitized_receipt_path: null,
    next_event_path: null,
    ticket_id: null,
    ticket_issued: false,
    ticket_transferred: false,
    live_work_execution: false,
    wc_ledger_write: false,
    authority: ISSUE_AUTHORITY,
  };
  writeExclusive(stateFile(outputDir), state);
  return state;
}

function issueUrl(profile) {
  const url = new URL(profile.issue_url);
  url.searchParams.set(profile.confirmation_query_name, profile.issue_confirmation);
  return url.toString();
}

async function httpTransport({ profile, requestBody }) {
  const response = await fetch(issueUrl(profile), {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "user-agent": "void-paid-work-ticket-issue-executor-v1",
    },
    body: JSON.stringify(requestBody),
    redirect: "error",
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    fail("ticket issue response is not JSON");
  }
  return { http_status: response.status, body };
}

function responseSemantics(httpStatus, responseBody, profileInfo, requestInfo, advancedPlan) {
  const profile = profileInfo.profile;
  if (httpStatus !== profile.success_http_status) {
    fail(`ticket issue HTTP status mismatch: ${httpStatus}`);
  }
  const response = object(responseBody, "ticket issue response");
  const b = profileInfo.responseBindings;
  const result = {
    ticket_id: string(pointerGet(response, b.ticket_id, "response ticket ID"), "response ticket ID value", HEX32),
    capability_token: string(pointerGet(response, b.capability_token, "response token"), "response token value", TOKEN_PATTERN, 512),
    account: string(pointerGet(response, b.account, "response account"), "response account value", ID),
    executor_node_id: string(pointerGet(response, b.executor_node_id, "response executor"), "response executor value", NODE_ID),
    task_class: string(pointerGet(response, b.task_class, "response task class"), "response task class value", ID),
    dataset_id: string(pointerGet(response, b.dataset_id, "response dataset"), "response dataset value", ID),
    expected_input_hash: string(pointerGet(response, b.expected_input_hash, "response input hash"), "response input hash value", HEX64),
    issued_at_ms: integer(pointerGet(response, b.issued_at_ms, "response issued at"), "response issued at value", 1, Number.MAX_SAFE_INTEGER),
    expires_at_ms: integer(pointerGet(response, b.expires_at_ms, "response expires at"), "response expires at value", 1, Number.MAX_SAFE_INTEGER),
    ttl_ms: integer(pointerGet(response, b.ttl_ms, "response TTL"), "response TTL value", 60000, 86400000),
    max_uses: integer(pointerGet(response, b.max_uses, "response max uses"), "response max uses value", 1, 1),
    fixed_award_wc: integer(pointerGet(response, b.fixed_award_wc, "response fixed award"), "response fixed award value", 1, 1000000),
  };
  const expected = requestInfo.semantics;
  if (
    result.account !== expected.account ||
    result.executor_node_id !== expected.executor_node_id ||
    result.task_class !== expected.task_class ||
    result.dataset_id !== expected.dataset_id ||
    result.expected_input_hash !== expected.expected_input_hash ||
    result.ttl_ms !== expected.ttl_ms ||
    result.max_uses !== 1 ||
    result.fixed_award_wc !== advancedPlan.request.execution_contract.fixed_award_wc ||
    result.expires_at_ms - result.issued_at_ms !== result.ttl_ms
  ) {
    fail("ticket issue response semantic mismatch");
  }
  return result;
}

function rawResponsePayload(operationIdValue, httpStatus, body) {
  return {
    marker: "VOID_EXTERNAL_AGENT_PAID_WORK_RAW_TICKET_ISSUE_RESPONSE_V1",
    version: 1,
    operation_id: operationIdValue,
    http_status: httpStatus,
    response: body,
  };
}

function operatorTicket(operationIdValue, semantics, profile, requestBody, responseBody) {
  return {
    marker: "VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_TICKET_V1",
    version: 1,
    operation_id: operationIdValue,
    ticket: semantics,
    transport: {
      issue_url: profile.issue_url,
      success_http_status: profile.success_http_status,
    },
    issue_request_body_sha256: sha256Text(canonicalJson(requestBody)),
    raw_issue_response_sha256: sha256Text(canonicalJson(responseBody)),
  };
}

function sanitizedReceipt(operationIdValue, transition, profile, requestBody, responseBody, semantics, atUtc) {
  return {
    marker: SANITIZED_RECEIPT_MARKER,
    version: 1,
    created_at_utc: atUtc,
    operation_id: operationIdValue,
    fulfillment_id: transition.advancedPlan.fulfillment_id,
    source_plan_id: transition.packageInspection.source_plan_id,
    advanced_plan_id: transition.advancedPlan.plan_id,
    transition_package_id: transition.packageInspection.package_id,
    ticket: {
      ticket_id: semantics.ticket_id,
      capability_token_sha256: sha256Text(semantics.capability_token),
      account: semantics.account,
      executor_node_id: semantics.executor_node_id,
      task_class: semantics.task_class,
      dataset_id: semantics.dataset_id,
      expected_input_hash: semantics.expected_input_hash,
      issued_at_ms: semantics.issued_at_ms,
      expires_at_ms: semantics.expires_at_ms,
      ttl_ms: semantics.ttl_ms,
      max_uses: semantics.max_uses,
      fixed_award_wc: semantics.fixed_award_wc,
    },
    transport: {
      issue_url_sha256: sha256Text(profile.issue_url),
      issue_confirmation_sha256: sha256Text(profile.issue_confirmation),
      success_http_status: profile.success_http_status,
      request_body_sha256: sha256Text(canonicalJson(requestBody)),
      response_body_sha256: sha256Text(canonicalJson(responseBody)),
    },
    verification: {
      explicit_confirmation_verified: true,
      source_transition_verified: true,
      private_plan_advanced: true,
      ticket_issued_once: true,
      max_uses_exactly_one: true,
      fixed_award_verified: true,
      ttl_verified: true,
      raw_capability_token_printed: false,
      raw_capability_token_in_sanitized_receipt: false,
      ticket_transferred: false,
      work_dispatched: false,
      live_work_execution: false,
      wc_ledger_write: false,
    },
    authority: ISSUE_AUTHORITY,
  };
}

function nextEvent(advancedPlan, receipt, operatorTicketPath, atUtc) {
  return buildEvent({
    fulfillment_id: advancedPlan.fulfillment_id,
    expected_revision: advancedPlan.revision,
    from_state: "ticket_issue_planned",
    to_state: "ticket_package_planned",
    occurred_at_utc: atUtc,
    evidence: {
      ticket_id: receipt.ticket.ticket_id,
      ticket_file_sha256: sha256File(operatorTicketPath),
      capability_token_sha256: receipt.ticket.capability_token_sha256,
      ticket_expires_at_utc: new Date(receipt.ticket.expires_at_ms).toISOString(),
      raw_capability_token_in_evidence: false,
      ticket_issued_once: true,
      ticket_transferred: false,
      ticket_issue_operation_id: receipt.operation_id,
    },
    nonce: `${receipt.operation_id}-ticket-package-planned`,
  });
}

function finalize({ outputDir, operationIdValue, state, transition, profileInfo, requestInfo, raw, atUtc }) {
  const semantics = responseSemantics(
    raw.http_status,
    raw.response,
    profileInfo,
    requestInfo,
    transition.advancedPlan,
  );
  const rawPath = path.join(outputDir, FILES.rawResponse);
  if (!fs.existsSync(rawPath)) writeExclusive(rawPath, raw);
  state = setState(outputDir, state, {
    phase: "issued_raw_persisted",
    raw_response_path: rawPath,
    raw_response_sha256: sha256File(rawPath),
    ticket_id: semantics.ticket_id,
    ticket_issued: true,
  }, atUtc);

  const operatorPath = path.join(outputDir, FILES.operatorTicket);
  const operatorValue = operatorTicket(
    operationIdValue,
    semantics,
    profileInfo.profile,
    requestInfo.body,
    raw.response,
  );
  if (!fs.existsSync(operatorPath)) writeExclusive(operatorPath, operatorValue);

  const receiptPath = path.join(outputDir, FILES.receipt);
  const receipt = sanitizedReceipt(
    operationIdValue,
    transition,
    profileInfo.profile,
    requestInfo.body,
    raw.response,
    semantics,
    atUtc,
  );
  noToken(receipt, "sanitized receipt");
  if (!fs.existsSync(receiptPath)) writeExclusive(receiptPath, receipt);

  const nextPath = path.join(outputDir, FILES.nextEvent);
  const event = nextEvent(transition.advancedPlan, receipt, operatorPath, atUtc);
  noToken(event, "next event");
  if (!fs.existsSync(nextPath)) writeExclusive(nextPath, event);

  const compatibility = advancePlan(transition.advancedPlan, event, ADVANCE_CONFIRMATION);
  if (compatibility.duplicate || inspectPlan(compatibility.plan).state !== "ticket_package_planned") {
    fail("generated next event is not orchestrator-compatible");
  }

  state = setState(outputDir, state, {
    phase: "complete",
    completed_at_utc: atUtc,
    operator_ticket_path: operatorPath,
    operator_ticket_sha256: sha256File(operatorPath),
    sanitized_receipt_path: receiptPath,
    sanitized_receipt_sha256: sha256File(receiptPath),
    next_event_path: nextPath,
    next_event_sha256: sha256File(nextPath),
    ticket_id: semantics.ticket_id,
    ticket_issued: true,
  }, atUtc);
  return state;
}

export function inspectTicketIssueOperation(outputDir) {
  const state = safeJson(stateFile(outputDir), "operation state");
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
    fail("sanitized receipt contains a raw token");
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
    ticket_issued: state.ticket_issued,
    ambiguous_after_issue_attempt:
      state.phase === "ambiguous_after_issue_attempt" ||
      (state.phase === "issuing" && !files.rawResponse.exists),
    duplicate_safe: state.phase === "complete",
    output_dir_mode_0700: (fs.statSync(outputDir).mode & 0o777) === 0o700,
    all_existing_files_mode_0600: Object.values(files).every((entry) => !entry.exists || entry.mode === "0600"),
    private_plan_advanced: files.advancedPlan.exists,
    raw_capability_token_printed: false,
    raw_capability_token_in_sanitized_receipt: false,
    ticket_transferred: false,
    work_dispatched: false,
    live_work_execution: false,
    wc_ledger_write: false,
    files,
    authority: ISSUE_AUTHORITY,
  };
}

function context(input) {
  const sourcePlan = safeJson(input.source_plan_path, "source plan");
  const transition = validateTransition(sourcePlan, input.transition_package_dir);
  const profileInfo = validateProfile(safeJson(input.transport_profile_path, "transport profile"));
  const requestInfo = validateIssueRequest(
    safeJson(input.issue_request_path, "issue request"),
    transition.advancedPlan,
    profileInfo,
  );
  const operationIdValue = operationId(
    sourcePlan,
    transition.packageInspection,
    transition.advancedPlan,
    profileInfo.profile,
    requestInfo.request,
  );
  return { sourcePlan, transition, profileInfo, requestInfo, operationIdValue };
}

export async function executeTicketIssueOperation(input, outputDir, confirmation, transport = httpTransport) {
  if (confirmation !== EXECUTE_CONFIRMATION) fail("explicit ticket-issue confirmation mismatch");
  const atUtc = utc(input.executed_at_utc, "executed_at_utc");
  const ctx = context(input);
  let state = initialize({
    outputDir,
    operationIdValue: ctx.operationIdValue,
    input,
    transition: ctx.transition,
    profile: ctx.profileInfo.profile,
    issueRequest: ctx.requestInfo.request,
    atUtc,
  });

  if (state.phase === "complete") {
    return {
      marker: EXECUTE_MARKER,
      operation_id: ctx.operationIdValue,
      duplicate: true,
      recovered: false,
      ticket_id: state.ticket_id,
      ticket_issued: true,
      raw_capability_token_printed: false,
      ticket_transferred: false,
      live_work_execution: false,
      wc_ledger_write: false,
      inspection: inspectTicketIssueOperation(outputDir),
    };
  }

  const rawPath = path.join(outputDir, FILES.rawResponse);
  if (state.phase === "issuing" && !fs.existsSync(rawPath)) {
    state = setState(outputDir, state, {
      phase: "ambiguous_after_issue_attempt",
      hold_reason: "issue_attempt_started_but_no_raw_response_persisted",
    }, atUtc);
    fail("ambiguous after issue attempt; automatic reissue is forbidden");
  }
  if (state.phase === "ambiguous_after_issue_attempt") {
    fail("ambiguous after issue attempt; automatic reissue is forbidden");
  }
  if (fs.existsSync(rawPath) || state.phase === "issued_raw_persisted") {
    const raw = safeJson(rawPath, "raw response");
    state = finalize({
      outputDir,
      operationIdValue: ctx.operationIdValue,
      state,
      transition: ctx.transition,
      profileInfo: ctx.profileInfo,
      requestInfo: ctx.requestInfo,
      raw,
      atUtc,
    });
    return {
      marker: EXECUTE_MARKER,
      operation_id: ctx.operationIdValue,
      duplicate: false,
      recovered: true,
      ticket_id: state.ticket_id,
      ticket_issued: true,
      raw_capability_token_printed: false,
      ticket_transferred: false,
      live_work_execution: false,
      wc_ledger_write: false,
      inspection: inspectTicketIssueOperation(outputDir),
    };
  }
  if (state.phase !== "prepared") fail(`cannot issue from phase ${state.phase}`);

  state = setState(outputDir, state, {
    phase: "issuing",
    issue_attempt_started_at_utc: atUtc,
    issue_attempt_count: 1,
  }, atUtc);

  let result;
  try {
    result = await transport({
      profile: ctx.profileInfo.profile,
      requestBody: ctx.requestInfo.body,
      operation_id: ctx.operationIdValue,
    });
  } catch {
    setState(outputDir, state, {
      phase: "ambiguous_after_issue_attempt",
      hold_reason: "transport_failed_after_issue_attempt_started",
    }, atUtc);
    fail("transport failed after issue attempt; automatic reissue is forbidden");
  }

  const raw = rawResponsePayload(ctx.operationIdValue, result.http_status, result.body);
  writeExclusive(rawPath, raw);
  state = finalize({
    outputDir,
    operationIdValue: ctx.operationIdValue,
    state,
    transition: ctx.transition,
    profileInfo: ctx.profileInfo,
    requestInfo: ctx.requestInfo,
    raw,
    atUtc,
  });

  return {
    marker: EXECUTE_MARKER,
    operation_id: ctx.operationIdValue,
    duplicate: false,
    recovered: false,
    ticket_id: state.ticket_id,
    ticket_issued: true,
    raw_capability_token_printed: false,
    ticket_transferred: false,
    live_work_execution: false,
    wc_ledger_write: false,
    inspection: inspectTicketIssueOperation(outputDir),
  };
}

export function recoverTicketIssueOperation(input, outputDir, confirmation) {
  if (confirmation !== RECOVER_CONFIRMATION) fail("explicit recovery confirmation mismatch");
  const atUtc = utc(input.recovered_at_utc, "recovered_at_utc");
  const ctx = context(input);
  ensureOutputDir(outputDir);
  let state = validateState(safeJson(stateFile(outputDir), "operation state"), ctx.operationIdValue);
  if (state.phase === "complete") {
    return {
      marker: RECOVER_MARKER,
      operation_id: ctx.operationIdValue,
      duplicate: true,
      recovered: false,
      ticket_id: state.ticket_id,
      ticket_issued: true,
      raw_capability_token_printed: false,
      ticket_transferred: false,
      live_work_execution: false,
      wc_ledger_write: false,
      inspection: inspectTicketIssueOperation(outputDir),
    };
  }
  if (!["issuing", "ambiguous_after_issue_attempt", "issued_raw_persisted"].includes(state.phase)) {
    fail(`cannot recover from phase ${state.phase}`);
  }
  const recovered = safeJson(input.recovered_raw_response_path, "recovered raw response");
  if (
    recovered.marker !== "VOID_EXTERNAL_AGENT_PAID_WORK_RAW_TICKET_ISSUE_RESPONSE_V1" ||
    recovered.version !== 1 ||
    recovered.operation_id !== ctx.operationIdValue
  ) {
    fail("recovered raw response identity mismatch");
  }
  const rawPath = path.join(outputDir, FILES.rawResponse);
  if (!fs.existsSync(rawPath)) writeExclusive(rawPath, recovered);
  state = finalize({
    outputDir,
    operationIdValue: ctx.operationIdValue,
    state,
    transition: ctx.transition,
    profileInfo: ctx.profileInfo,
    requestInfo: ctx.requestInfo,
    raw: recovered,
    atUtc,
  });
  return {
    marker: RECOVER_MARKER,
    operation_id: ctx.operationIdValue,
    duplicate: false,
    recovered: true,
    ticket_id: state.ticket_id,
    ticket_issued: true,
    raw_capability_token_printed: false,
    ticket_transferred: false,
    live_work_execution: false,
    wc_ledger_write: false,
    inspection: inspectTicketIssueOperation(outputDir),
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

function required(args, key) {
  const value = args[key];
  if (typeof value !== "string" || !value) fail(`missing --${key}`);
  return value;
}

function redactInspection(inspection) {
  return {
    ...inspection,
    files: Object.fromEntries(
      Object.entries(inspection.files).map(([key, value]) => [
        key,
        key === "rawResponse" || key === "operatorTicket"
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
    const result = await executeTicketIssueOperation(
      {
        source_plan_path: required(args, "source-plan"),
        transition_package_dir: required(args, "transition-package-dir"),
        transport_profile_path: required(args, "transport-profile"),
        issue_request_path: required(args, "issue-request"),
        executed_at_utc: required(args, "executed-at-utc"),
      },
      required(args, "output-dir"),
      required(args, "confirm"),
    );
    process.stdout.write(JSON.stringify({ ...result, inspection: redactInspection(result.inspection) }) + "\n");
    return;
  }
  if (command === "recover") {
    const result = recoverTicketIssueOperation(
      {
        source_plan_path: required(args, "source-plan"),
        transition_package_dir: required(args, "transition-package-dir"),
        transport_profile_path: required(args, "transport-profile"),
        issue_request_path: required(args, "issue-request"),
        recovered_raw_response_path: required(args, "recovered-raw-response"),
        recovered_at_utc: required(args, "recovered-at-utc"),
      },
      required(args, "output-dir"),
      required(args, "confirm"),
    );
    process.stdout.write(JSON.stringify({ ...result, inspection: redactInspection(result.inspection) }) + "\n");
    return;
  }
  if (command === "inspect") {
    process.stdout.write(JSON.stringify(redactInspection(inspectTicketIssueOperation(required(args, "output-dir")))) + "\n");
    return;
  }
  fail("usage: external_agent_paid_work_fulfillment_ticket_issue_executor_v1.ts <execute|recover|inspect> [options]");
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === entry) {
  cliMain().catch((error) => {
    process.stderr.write(
      `HOLD: explicit ticket-issue executor V1 failed: ${
        error instanceof Error ? error.message : String(error)
      }\n`,
    );
    process.exitCode = 2;
  });
}
