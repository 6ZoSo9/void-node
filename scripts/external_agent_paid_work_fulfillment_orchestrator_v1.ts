#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const REQUEST_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_REQUEST_V1";
export const PLAN_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_PLAN_V1";
export const EVENT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_EVENT_V1";
export const STAGE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_ORCHESTRATOR_STAGE_V1";
export const INSPECTION_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_ORCHESTRATOR_INSPECTION_V1";
export const ADVANCE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_ORCHESTRATOR_ADVANCE_V1";
export const ADVANCE_CONFIRMATION =
  "advance-external-agent-paid-work-fulfillment-orchestrator-v1";

export const STATES = Object.freeze([
  "accepted_submission_bound",
  "ticket_issue_planned",
  "ticket_package_planned",
  "executor_receipt_expected",
  "adapter_finalization_planned",
  "completed",
  "held",
]);

export const MUTATING_AUTHORITY = Object.freeze({
  acceptance_persistence: false,
  ticket_issuance: false,
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
  /wcep1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{20,200}/;
const HEX64_PATTERN = /^[0-9a-f]{64}$/;
const ID_PATTERN = /^[A-Za-z0-9._:-]{4,240}$/;

const NORMAL_TRANSITIONS = Object.freeze({
  accepted_submission_bound: "ticket_issue_planned",
  ticket_issue_planned: "ticket_package_planned",
  ticket_package_planned: "executor_receipt_expected",
  executor_receipt_expected: "adapter_finalization_planned",
  adapter_finalization_planned: "completed",
});

function fail(message) {
  throw new Error(message);
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function expectObject(value, label) {
  if (!isObject(value)) fail(`${label} must be an object`);
  return value;
}

function expectString(value, label, options = {}) {
  if (typeof value !== "string") fail(`${label} must be a string`);
  if (value.length < (options.min ?? 1)) fail(`${label} is too short`);
  if (value.length > (options.max ?? 4096)) fail(`${label} is too long`);
  if (options.pattern && !options.pattern.test(value)) {
    fail(`${label} format mismatch`);
  }
  return value;
}

function expectInteger(value, label, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    fail(`${label} must be an integer in [${min}, ${max}]`);
  }
  return value;
}

function expectBoolean(value, label) {
  if (typeof value !== "boolean") fail(`${label} must be boolean`);
  return value;
}

function expectUtc(value, label) {
  const text = expectString(value, label, { max: 64 });
  if (!text.endsWith("Z") || !Number.isFinite(Date.parse(text))) {
    fail(`${label} must be an ISO-8601 UTC timestamp`);
  }
  return text;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isObject(value)) {
    const result = {};
    for (const key of Object.keys(value).sort()) {
      result[key] = canonicalize(value[key]);
    }
    return result;
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256Text(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function requireNoCapabilityToken(value, label) {
  if (TOKEN_PATTERN.test(JSON.stringify(value))) {
    fail(`${label} contains a raw capability token`);
  }
}

function requireAuthorityDisabled(value, label) {
  const authority = expectObject(value, label);
  const expectedKeys = Object.keys(MUTATING_AUTHORITY).sort();
  const observedKeys = Object.keys(authority).sort();

  if (JSON.stringify(expectedKeys) !== JSON.stringify(observedKeys)) {
    fail(`${label} key set mismatch`);
  }

  for (const [key, expected] of Object.entries(MUTATING_AUTHORITY)) {
    if (authority[key] !== expected) {
      fail(`${label}.${key} must be false`);
    }
  }
}

function requireArtifactReference(value, label, verifyFiles) {
  const artifact = expectObject(value, label);
  const file = expectString(artifact.path, `${label}.path`, { max: 4096 });
  const digest = expectString(artifact.sha256, `${label}.sha256`, {
    pattern: HEX64_PATTERN,
  });
  expectString(artifact.kind, `${label}.kind`, {
    pattern: ID_PATTERN,
    max: 160,
  });

  if (verifyFiles) {
    const metadata = fs.lstatSync(file);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      fail(`${label}.path is not a regular non-symlink file`);
    }
    if (sha256File(file) !== digest) {
      fail(`${label}.sha256 does not match file bytes`);
    }
  }

  return artifact;
}

function validateSubmission(value) {
  const submission = expectObject(value, "request.submission");
  for (const key of [
    "submission_id",
    "submission_receipt_id",
    "work_order_id",
    "credential_id",
    "agent_id",
    "capability_id",
    "task_class",
  ]) {
    expectString(submission[key], `submission.${key}`, {
      pattern: ID_PATTERN,
    });
  }
  return submission;
}

function validateBinding(value) {
  const binding = expectObject(value, "request.binding");
  for (const key of [
    "binding_registry_id",
    "binding_id",
    "destination_wc_account",
  ]) {
    expectString(binding[key], `binding.${key}`, {
      pattern: ID_PATTERN,
    });
  }
  expectString(
    binding.binding_registry_sha256,
    "binding.binding_registry_sha256",
    { pattern: HEX64_PATTERN },
  );
  return binding;
}

function validateExecutionContract(value) {
  const execution = expectObject(value, "request.execution_contract");
  expectString(
    execution.coordinator_base,
    "execution_contract.coordinator_base",
    { max: 2048 },
  );
  expectString(
    execution.coordinator_node_id,
    "execution_contract.coordinator_node_id",
    { pattern: /^[0-9a-f]{32}$/ },
  );
  expectString(
    execution.executor_node_id,
    "execution_contract.executor_node_id",
    { pattern: /^[0-9a-f]{32}$/ },
  );
  expectInteger(
    execution.fixed_award_wc,
    "execution_contract.fixed_award_wc",
    1,
    1000000,
  );
  expectInteger(
    execution.ticket_ttl_ms,
    "execution_contract.ticket_ttl_ms",
    60000,
    86400000,
  );

  const runtime = expectObject(
    execution.runtime,
    "execution_contract.runtime",
  );
  for (const key of [
    "participant_cli_sha256",
    "pilot_source_sha256",
    "acceptance_source_sha256",
    "adapter_core_sha256",
  ]) {
    expectString(runtime[key], `execution_contract.runtime.${key}`, {
      pattern: HEX64_PATTERN,
    });
  }

  return execution;
}

function validateRequest(value, verifyFiles) {
  const request = expectObject(value, "request");

  if (request.marker !== REQUEST_MARKER || request.version !== 1) {
    fail("request marker/version mismatch");
  }

  requireNoCapabilityToken(request, "request");

  const createdAt = expectUtc(
    request.created_at_utc,
    "request.created_at_utc",
  );
  const expiresAt = expectUtc(
    request.expires_at_utc,
    "request.expires_at_utc",
  );

  if (Date.parse(expiresAt) <= Date.parse(createdAt)) {
    fail("request expires_at_utc must be after created_at_utc");
  }

  expectString(request.nonce, "request.nonce", {
    pattern: ID_PATTERN,
  });
  validateSubmission(request.submission);
  validateBinding(request.binding);
  validateExecutionContract(request.execution_contract);
  requireAuthorityDisabled(request.authority, "request.authority");

  const artifacts = expectObject(
    request.source_artifacts,
    "request.source_artifacts",
  );
  const expectedKeys = [
    "accepted_submission_receipt",
    "binding_registry",
    "selected_contract_receipt",
    "work_order",
  ];

  if (
    JSON.stringify(Object.keys(artifacts).sort()) !==
    JSON.stringify(expectedKeys)
  ) {
    fail("request.source_artifacts key set mismatch");
  }

  for (const key of expectedKeys) {
    requireArtifactReference(
      artifacts[key],
      `request.source_artifacts.${key}`,
      verifyFiles,
    );
  }

  return request;
}

function fulfillmentBasis(request) {
  return {
    version: 1,
    submission: request.submission,
    binding: request.binding,
    execution_contract: request.execution_contract,
    source_artifacts: request.source_artifacts,
    created_at_utc: request.created_at_utc,
    expires_at_utc: request.expires_at_utc,
    nonce: request.nonce,
  };
}

function deriveFulfillmentId(request) {
  return `voidapwfv1_${sha256Text(
    canonicalJson(fulfillmentBasis(request)),
  )}`;
}

function nextNormalState(state) {
  return NORMAL_TRANSITIONS[state] ?? null;
}

function derivePlanId(fulfillmentId, revision, state, history) {
  return `voidapwfplan1_${sha256Text(
    canonicalJson({
      fulfillment_id: fulfillmentId,
      revision,
      state,
      history,
    }),
  )}`;
}

function validateHistoryEntry(value, index) {
  const entry = expectObject(value, `plan.history[${index}]`);
  expectString(entry.event_id, `plan.history[${index}].event_id`, {
    pattern: /^voidapwfsev1_[0-9a-f]{64}$/,
  });
  expectString(entry.from_state, `plan.history[${index}].from_state`);
  expectString(entry.to_state, `plan.history[${index}].to_state`);
  expectUtc(
    entry.occurred_at_utc,
    `plan.history[${index}].occurred_at_utc`,
  );
  expectObject(entry.evidence, `plan.history[${index}].evidence`);
  requireNoCapabilityToken(entry, `plan.history[${index}]`);
  return entry;
}

export function inspectPlan(value) {
  const plan = expectObject(value, "plan");

  if (plan.marker !== PLAN_MARKER || plan.version !== 1) {
    fail("plan marker/version mismatch");
  }

  requireNoCapabilityToken(plan, "plan");
  const request = validateRequest(plan.request, false);
  const fulfillmentId = expectString(
    plan.fulfillment_id,
    "plan.fulfillment_id",
    { pattern: /^voidapwfv1_[0-9a-f]{64}$/ },
  );

  if (fulfillmentId !== deriveFulfillmentId(request)) {
    fail("plan fulfillment_id mismatch");
  }

  const revision = expectInteger(
    plan.revision,
    "plan.revision",
    0,
    1000000,
  );
  const state = expectString(plan.state, "plan.state");

  if (!STATES.includes(state)) {
    fail("plan state is unknown");
  }

  requireAuthorityDisabled(plan.authority, "plan.authority");

  if (!Array.isArray(plan.history)) {
    fail("plan.history must be an array");
  }

  if (plan.history.length !== revision) {
    fail("plan history length must equal revision");
  }

  const history = plan.history.map(validateHistoryEntry);
  const eventIds = new Set();
  let derivedState = "accepted_submission_bound";
  let heldFromState = null;

  for (const entry of history) {
    if (eventIds.has(entry.event_id)) {
      fail("plan history contains duplicate event_id");
    }
    eventIds.add(entry.event_id);

    if (entry.from_state !== derivedState) {
      fail("plan history from_state continuity mismatch");
    }

    if (entry.to_state === "held") {
      if (entry.from_state === "completed") {
        fail("completed plan cannot transition to held");
      }
      heldFromState = entry.from_state;
      derivedState = "held";
      continue;
    }

    if (entry.from_state === "held") {
      if (!heldFromState || entry.to_state !== heldFromState) {
        fail("held plan can resume only to held_from_state");
      }
      derivedState = entry.to_state;
      heldFromState = null;
      continue;
    }

    if (nextNormalState(entry.from_state) !== entry.to_state) {
      fail(
        `invalid state transition ${entry.from_state} -> ${entry.to_state}`,
      );
    }

    derivedState = entry.to_state;
  }

  if (derivedState !== state) {
    fail("plan state does not match history");
  }

  const declaredHeldFrom =
    typeof plan.held_from_state === "string"
      ? plan.held_from_state
      : null;

  if (declaredHeldFrom !== heldFromState) {
    fail("plan held_from_state mismatch");
  }

  const expectedPlanId = derivePlanId(
    fulfillmentId,
    revision,
    state,
    history,
  );

  if (plan.plan_id !== expectedPlanId) {
    fail("plan plan_id mismatch");
  }

  const completed = state === "completed";
  const nextTransition =
    completed
      ? null
      : state === "held"
        ? heldFromState
        : nextNormalState(state);

  return {
    marker: INSPECTION_MARKER,
    valid: true,
    fulfillment_id: fulfillmentId,
    plan_id: expectedPlanId,
    revision,
    state,
    completed,
    held_from_state: heldFromState,
    next_transition: nextTransition,
    destination_wc_account: request.binding.destination_wc_account,
    fixed_award_wc: request.execution_contract.fixed_award_wc,
    raw_capability_token_read: false,
    live_work_execution: false,
    wc_ledger_write: false,
    authority: MUTATING_AUTHORITY,
  };
}

export function stageRequest(value, verifyFiles = true) {
  const request = validateRequest(value, verifyFiles);
  const fulfillmentId = deriveFulfillmentId(request);
  const history = [];
  const state = "accepted_submission_bound";
  const revision = 0;

  const plan = {
    marker: PLAN_MARKER,
    version: 1,
    created_at_utc: request.created_at_utc,
    updated_at_utc: request.created_at_utc,
    fulfillment_id: fulfillmentId,
    plan_id: derivePlanId(
      fulfillmentId,
      revision,
      state,
      history,
    ),
    revision,
    state,
    held_from_state: null,
    request,
    history,
    authority: MUTATING_AUTHORITY,
    scope: {
      plan_materialization: true,
      state_recording: true,
      acceptance_persistence: false,
      ticket_issuance: false,
      ticket_transfer: false,
      work_dispatch: false,
      live_work_execution: false,
      wc_ledger_write: false,
      payment_transfer: false,
      wc_to_void_settlement: false,
      service_restart: false,
      deployment: false,
    },
  };

  inspectPlan(plan);
  return plan;
}

function eventBasis(event) {
  return {
    version: 1,
    fulfillment_id: event.fulfillment_id,
    expected_revision: event.expected_revision,
    from_state: event.from_state,
    to_state: event.to_state,
    occurred_at_utc: event.occurred_at_utc,
    evidence: event.evidence,
    nonce: event.nonce,
  };
}

function deriveEventId(event) {
  return `voidapwfsev1_${sha256Text(
    canonicalJson(eventBasis(event)),
  )}`;
}

function validateStateEvidence(toState, evidenceValue, fixedAward) {
  const evidence = expectObject(evidenceValue, "event.evidence");
  requireNoCapabilityToken(evidence, "event.evidence");

  if (toState === "ticket_issue_planned") {
    if (
      expectBoolean(
        evidence.issue_preconditions_verified,
        "event.evidence.issue_preconditions_verified",
      ) !== true
    ) {
      fail("ticket issue preconditions must be verified");
    }
    expectInteger(
      evidence.ticket_ttl_ms,
      "event.evidence.ticket_ttl_ms",
      60000,
      86400000,
    );
  } else if (toState === "ticket_package_planned") {
    expectString(evidence.ticket_id, "event.evidence.ticket_id", {
      pattern: /^[0-9a-f]{32}$/,
    });
    expectString(
      evidence.ticket_file_sha256,
      "event.evidence.ticket_file_sha256",
      { pattern: HEX64_PATTERN },
    );
    expectString(
      evidence.capability_token_sha256,
      "event.evidence.capability_token_sha256",
      { pattern: HEX64_PATTERN },
    );
    expectUtc(
      evidence.ticket_expires_at_utc,
      "event.evidence.ticket_expires_at_utc",
    );
    if (
      expectBoolean(
        evidence.raw_capability_token_in_evidence,
        "event.evidence.raw_capability_token_in_evidence",
      ) !== false
    ) {
      fail("raw capability token must not be in evidence");
    }
  } else if (toState === "executor_receipt_expected") {
    expectString(evidence.ticket_id, "event.evidence.ticket_id", {
      pattern: /^[0-9a-f]{32}$/,
    });
    expectString(
      evidence.ticket_package_sha256,
      "event.evidence.ticket_package_sha256",
      { pattern: HEX64_PATTERN },
    );
    expectString(
      evidence.executor_node_id,
      "event.evidence.executor_node_id",
      { pattern: /^[0-9a-f]{32}$/ },
    );
    expectString(evidence.transport, "event.evidence.transport", {
      pattern: ID_PATTERN,
    });
  } else if (toState === "adapter_finalization_planned") {
    expectString(
      evidence.participant_receipt_sha256,
      "event.evidence.participant_receipt_sha256",
      { pattern: HEX64_PATTERN },
    );
    const before = expectInteger(
      evidence.wc_before,
      "event.evidence.wc_before",
      0,
      1000000000,
    );
    const after = expectInteger(
      evidence.wc_after,
      "event.evidence.wc_after",
      0,
      1000000000,
    );
    const delta = expectInteger(
      evidence.wc_delta,
      "event.evidence.wc_delta",
      1,
      1000000,
    );
    if (delta !== fixedAward || after - before !== delta) {
      fail("event.evidence WC delta mismatch");
    }
    if (
      expectBoolean(
        evidence.ticket_consumed_once,
        "event.evidence.ticket_consumed_once",
      ) !== true
    ) {
      fail("ticket must be consumed once");
    }
  } else if (toState === "completed") {
    expectString(
      evidence.adapter_receipt_id,
      "event.evidence.adapter_receipt_id",
      { pattern: /^voidapwear1_[0-9a-f]{64}$/ },
    );
    expectString(
      evidence.adapter_receipt_sha256,
      "event.evidence.adapter_receipt_sha256",
      { pattern: HEX64_PATTERN },
    );
    if (
      expectBoolean(
        evidence.duplicate_finalization_verified,
        "event.evidence.duplicate_finalization_verified",
      ) !== true
    ) {
      fail("duplicate finalization must be verified");
    }
    if (
      expectBoolean(
        evidence.duplicate_second_wc_credit,
        "event.evidence.duplicate_second_wc_credit",
      ) !== false
    ) {
      fail("duplicate finalization must not create a second credit");
    }
    if (
      expectBoolean(
        evidence.token_artifacts_deleted,
        "event.evidence.token_artifacts_deleted",
      ) !== true
    ) {
      fail("token artifacts must be deleted");
    }
  } else if (toState === "held") {
    expectString(evidence.reason, "event.evidence.reason", {
      min: 4,
      max: 2000,
    });
    if (
      expectBoolean(
        evidence.resume_existing_state,
        "event.evidence.resume_existing_state",
      ) !== true
    ) {
      fail("held evidence must preserve resumability");
    }
  }

  return evidence;
}

export function buildEvent(input) {
  const event = {
    marker: EVENT_MARKER,
    version: 1,
    ...input,
  };
  event.event_id = deriveEventId(event);
  return event;
}

export function advancePlan(planValue, eventValue, confirmation) {
  if (confirmation !== ADVANCE_CONFIRMATION) {
    fail("explicit advance confirmation mismatch");
  }

  const inspection = inspectPlan(planValue);
  const plan = expectObject(planValue, "plan");
  const event = expectObject(eventValue, "event");

  if (event.marker !== EVENT_MARKER || event.version !== 1) {
    fail("event marker/version mismatch");
  }

  requireNoCapabilityToken(event, "event");

  const fulfillmentId = expectString(
    event.fulfillment_id,
    "event.fulfillment_id",
    { pattern: /^voidapwfv1_[0-9a-f]{64}$/ },
  );

  if (fulfillmentId !== inspection.fulfillment_id) {
    fail("event fulfillment_id mismatch");
  }

  const eventId = deriveEventId(event);

  if (event.event_id !== eventId) {
    fail("event event_id mismatch");
  }

  const history = Array.isArray(plan.history)
    ? [...plan.history]
    : fail("plan.history must be an array");

  if (
    history.some(
      (entry) => isObject(entry) && entry.event_id === eventId,
    )
  ) {
    return {
      plan,
      duplicate: true,
      event_id: eventId,
    };
  }

  const expectedRevision = expectInteger(
    event.expected_revision,
    "event.expected_revision",
    0,
    1000000,
  );

  if (expectedRevision !== inspection.revision) {
    fail("event expected_revision mismatch");
  }

  const fromState = expectString(event.from_state, "event.from_state");
  const toState = expectString(event.to_state, "event.to_state");

  if (fromState !== inspection.state) {
    fail("event from_state mismatch");
  }

  if (!STATES.includes(toState)) {
    fail("event to_state is unknown");
  }

  expectUtc(event.occurred_at_utc, "event.occurred_at_utc");
  expectString(event.nonce, "event.nonce", {
    pattern: ID_PATTERN,
  });

  const fixedAward = plan.request.execution_contract.fixed_award_wc;
  validateStateEvidence(toState, event.evidence, fixedAward);

  const normalNext = nextNormalState(fromState);
  const heldFromState =
    typeof plan.held_from_state === "string"
      ? plan.held_from_state
      : null;

  if (toState === "held") {
    if (fromState === "completed") {
      fail("completed fulfillment cannot transition to held");
    }
  } else if (fromState === "held") {
    if (!heldFromState || toState !== heldFromState) {
      fail("held fulfillment can resume only to held_from_state");
    }
    if (
      expectBoolean(
        event.evidence.resume_existing_state,
        "event.evidence.resume_existing_state",
      ) !== true
    ) {
      fail("resume event must preserve existing state");
    }
  } else if (normalNext !== toState) {
    fail(`invalid transition ${fromState} -> ${toState}`);
  }

  history.push({
    event_id: eventId,
    from_state: fromState,
    to_state: toState,
    occurred_at_utc: event.occurred_at_utc,
    evidence: event.evidence,
  });

  const revision = inspection.revision + 1;
  const nextHeldFromState =
    toState === "held"
      ? fromState
      : fromState === "held"
        ? null
        : plan.held_from_state ?? null;

  const nextPlan = {
    ...plan,
    updated_at_utc: event.occurred_at_utc,
    revision,
    state: toState,
    held_from_state: nextHeldFromState,
    history,
    plan_id: derivePlanId(
      inspection.fulfillment_id,
      revision,
      toState,
      history,
    ),
  };

  inspectPlan(nextPlan);

  return {
    plan: nextPlan,
    duplicate: false,
    event_id: eventId,
  };
}

export function writeJsonExclusive(file, value) {
  fs.mkdirSync(path.dirname(file), {
    recursive: true,
    mode: 0o700,
  });

  const descriptor = fs.openSync(
    file,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL,
    0o600,
  );

  try {
    fs.writeFileSync(
      descriptor,
      JSON.stringify(value, null, 2) + "\n",
      "utf8",
    );
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }

  fs.chmodSync(file, 0o600);
}

function readJson(file) {
  const metadata = fs.lstatSync(file);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    fail(`unsafe JSON input file: ${file}`);
  }
  if (metadata.size > 8 * 1024 * 1024) {
    fail(`JSON input file too large: ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
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

function cliMain() {
  const [command, ...rawArgs] = process.argv.slice(2);
  const args = parseArgs(rawArgs);

  if (command === "stage") {
    const outputPath = requiredArg(args, "output");
    const plan = stageRequest(
      readJson(requiredArg(args, "request")),
      args["skip-file-verification"] !== true,
    );
    writeJsonExclusive(outputPath, plan);
    process.stdout.write(
      JSON.stringify({
        marker: STAGE_MARKER,
        fulfillment_id: plan.fulfillment_id,
        plan_id: plan.plan_id,
        state: plan.state,
        revision: plan.revision,
        output_path: outputPath,
        output_sha256: sha256File(outputPath),
        raw_capability_token_read: false,
        live_work_execution: false,
        wc_ledger_write: false,
        authority: MUTATING_AUTHORITY,
      }) + "\n",
    );
    return;
  }

  if (command === "inspect") {
    process.stdout.write(
      JSON.stringify(
        inspectPlan(readJson(requiredArg(args, "plan"))),
      ) + "\n",
    );
    return;
  }

  if (command === "advance") {
    const outputPath = requiredArg(args, "output");
    const result = advancePlan(
      readJson(requiredArg(args, "plan")),
      readJson(requiredArg(args, "event")),
      requiredArg(args, "confirm"),
    );
    writeJsonExclusive(outputPath, result.plan);
    process.stdout.write(
      JSON.stringify({
        marker: ADVANCE_MARKER,
        fulfillment_id: result.plan.fulfillment_id,
        plan_id: result.plan.plan_id,
        state: result.plan.state,
        revision: result.plan.revision,
        duplicate: result.duplicate,
        event_id: result.event_id,
        output_path: outputPath,
        output_sha256: sha256File(outputPath),
        raw_capability_token_read: false,
        live_work_execution: false,
        wc_ledger_write: false,
        authority: MUTATING_AUTHORITY,
      }) + "\n",
    );
    return;
  }

  fail(
    "usage: external_agent_paid_work_fulfillment_orchestrator_v1.ts " +
      "<stage|inspect|advance> [options]",
  );
}

const entry = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";

if (import.meta.url === entry) {
  try {
    cliMain();
  } catch (error) {
    process.stderr.write(
      `HOLD: external agent paid-work fulfillment orchestrator V1 failed: ${
        error instanceof Error ? error.message : String(error)
      }\n`,
    );
    process.exitCode = 2;
  }
}
