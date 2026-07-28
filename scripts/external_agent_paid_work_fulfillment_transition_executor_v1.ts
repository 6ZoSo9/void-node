#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  MUTATING_AUTHORITY as ORCHESTRATOR_AUTHORITY,
  buildEvent,
  canonicalJson,
  inspectPlan,
  sha256File,
} from "./external_agent_paid_work_fulfillment_orchestrator_v1.ts";

export const COORDINATOR_SNAPSHOT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_COORDINATOR_STATUS_SNAPSHOT_V1";
export const WC_BALANCE_SNAPSHOT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_WC_BALANCE_SNAPSHOT_V1";
export const RUNTIME_SNAPSHOT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_RUNTIME_SNAPSHOT_V1";
export const TICKET_POLICY_SNAPSHOT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_TICKET_ISSUE_POLICY_SNAPSHOT_V1";
export const INTENT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_TRANSITION_INTENT_V1";
export const PRECONDITION_RECEIPT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_TRANSITION_PRECONDITION_RECEIPT_V1";
export const PACKAGE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_TRANSITION_PACKAGE_V1";
export const PREPARE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_TRANSITION_EXECUTOR_PREPARE_V1";
export const INSPECTION_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_TRANSITION_EXECUTOR_INSPECTION_V1";

export const PREPARE_CONFIRMATION =
  "prepare-external-agent-paid-work-fulfillment-transition-executor-v1";

export const EXECUTOR_AUTHORITY = Object.freeze({
  plan_read: true,
  private_intent_write: true,
  private_event_write: true,
  private_precondition_receipt_write: true,
  orchestrator_advance: false,
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
const NODE_ID_PATTERN = /^[0-9a-f]{32}$/;
const ID_PATTERN = /^[A-Za-z0-9._:-]{4,240}$/;

const FILE_NAMES = Object.freeze({
  intent: "transition-intent-v1.json",
  event: "orchestrator-event-v1.json",
  receipt: "precondition-receipt-v1.json",
  package: "transition-package-v1.json",
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

function sha256Text(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function containsCapabilityToken(value) {
  return TOKEN_PATTERN.test(JSON.stringify(value));
}

function requireNoCapabilityToken(value, label) {
  if (containsCapabilityToken(value)) {
    fail(`${label} contains a raw capability token`);
  }
}

function requireOrchestratorAuthorityDisabled(value) {
  if (
    canonicalJson(value) !== canonicalJson(ORCHESTRATOR_AUTHORITY)
  ) {
    fail("plan orchestrator authority mismatch");
  }
}

function requireExecutorAuthority(value) {
  if (
    canonicalJson(value) !== canonicalJson(EXECUTOR_AUTHORITY)
  ) {
    fail("executor authority mismatch");
  }
}

function safeJsonFile(file, label) {
  const metadata = fs.lstatSync(file);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    fail(`${label} is not a regular non-symlink file`);
  }
  if (metadata.size > 8 * 1024 * 1024) {
    fail(`${label} is too large`);
  }
}

function readJson(file, label) {
  safeJsonFile(file, label);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function validateCoordinatorSnapshot(value, plan) {
  const snapshot = expectObject(value, "coordinator_snapshot");

  if (
    snapshot.marker !== COORDINATOR_SNAPSHOT_MARKER ||
    snapshot.version !== 1
  ) {
    fail("coordinator snapshot marker/version mismatch");
  }

  requireNoCapabilityToken(snapshot, "coordinator_snapshot");
  expectUtc(snapshot.captured_at_utc, "coordinator_snapshot.captured_at_utc");
  const nodeId = expectString(
    snapshot.node_id,
    "coordinator_snapshot.node_id",
    { pattern: NODE_ID_PATTERN },
  );
  const base = expectString(
    snapshot.coordinator_base,
    "coordinator_snapshot.coordinator_base",
    { max: 2048 },
  );

  if (
    nodeId !== plan.request.execution_contract.coordinator_node_id ||
    base !== plan.request.execution_contract.coordinator_base
  ) {
    fail("coordinator snapshot identity mismatch");
  }

  if (
    expectBoolean(
      snapshot.coordinator_enabled,
      "coordinator_snapshot.coordinator_enabled",
    ) !== true ||
    expectBoolean(
      snapshot.executor_enabled,
      "coordinator_snapshot.executor_enabled",
    ) !== false
  ) {
    fail("coordinator snapshot role mismatch");
  }

  if (
    expectInteger(
      snapshot.fixed_award_wc,
      "coordinator_snapshot.fixed_award_wc",
      1,
      1000000,
    ) !== plan.request.execution_contract.fixed_award_wc
  ) {
    fail("coordinator snapshot fixed award mismatch");
  }

  const caps = expectObject(snapshot.caps, "coordinator_snapshot.caps");

  for (const [key, min, max] of [
    ["active_issued", 0, 1000000],
    ["consumed", 0, 1000000000],
    ["global", 1, 1000000],
    ["per_account", 1, 1000000],
    ["account_total", 0, 1000000],
  ]) {
    expectInteger(caps[key], `coordinator_snapshot.caps.${key}`, min, max);
  }

  if (caps.active_issued !== 0) {
    fail("coordinator snapshot must have zero active issued tickets");
  }

  if (caps.account_total >= caps.per_account) {
    fail("destination account has no ticket capacity");
  }

  if (caps.active_issued + caps.consumed >= caps.global) {
    fail("global ticket capacity is exhausted");
  }

  return snapshot;
}

function validateBalanceSnapshot(value, plan) {
  const snapshot = expectObject(value, "wc_balance_snapshot");

  if (
    snapshot.marker !== WC_BALANCE_SNAPSHOT_MARKER ||
    snapshot.version !== 1
  ) {
    fail("WC balance snapshot marker/version mismatch");
  }

  requireNoCapabilityToken(snapshot, "wc_balance_snapshot");
  expectUtc(snapshot.captured_at_utc, "wc_balance_snapshot.captured_at_utc");

  if (
    expectString(snapshot.account, "wc_balance_snapshot.account", {
      pattern: ID_PATTERN,
    }) !== plan.request.binding.destination_wc_account
  ) {
    fail("WC balance snapshot account mismatch");
  }

  const earned = expectInteger(
    snapshot.earned,
    "wc_balance_snapshot.earned",
    0,
    1000000000000,
  );
  const debited = expectInteger(
    snapshot.debited,
    "wc_balance_snapshot.debited",
    0,
    1000000000000,
  );
  const redeemed = expectInteger(
    snapshot.redeemed,
    "wc_balance_snapshot.redeemed",
    0,
    1000000000000,
  );
  const redeemable = expectInteger(
    snapshot.redeemable,
    "wc_balance_snapshot.redeemable",
    0,
    1000000000000,
  );

  if (earned - debited - redeemed !== redeemable) {
    fail("WC balance snapshot arithmetic mismatch");
  }

  return snapshot;
}

function validateRuntimeSnapshot(value, plan) {
  const snapshot = expectObject(value, "runtime_snapshot");

  if (
    snapshot.marker !== RUNTIME_SNAPSHOT_MARKER ||
    snapshot.version !== 1
  ) {
    fail("runtime snapshot marker/version mismatch");
  }

  requireNoCapabilityToken(snapshot, "runtime_snapshot");
  expectUtc(snapshot.captured_at_utc, "runtime_snapshot.captured_at_utc");

  const expected = plan.request.execution_contract.runtime;
  const observed = expectObject(snapshot.runtime, "runtime_snapshot.runtime");

  for (const key of [
    "participant_cli_sha256",
    "pilot_source_sha256",
    "acceptance_source_sha256",
    "adapter_core_sha256",
  ]) {
    const digest = expectString(
      observed[key],
      `runtime_snapshot.runtime.${key}`,
      { pattern: HEX64_PATTERN },
    );

    if (digest !== expected[key]) {
      fail(`runtime snapshot ${key} mismatch`);
    }
  }

  if (
    expectString(
      snapshot.selection_policy,
      "runtime_snapshot.selection_policy",
      { min: 8, max: 160 },
    ) !== "content_addressed_exact_sha_only"
  ) {
    fail("runtime snapshot selection policy mismatch");
  }

  return snapshot;
}

function validateTicketPolicySnapshot(value, plan, coordinatorSnapshot) {
  const snapshot = expectObject(value, "ticket_policy_snapshot");

  if (
    snapshot.marker !== TICKET_POLICY_SNAPSHOT_MARKER ||
    snapshot.version !== 1
  ) {
    fail("ticket policy snapshot marker/version mismatch");
  }

  requireNoCapabilityToken(snapshot, "ticket_policy_snapshot");
  expectUtc(snapshot.captured_at_utc, "ticket_policy_snapshot.captured_at_utc");

  const requestedTtlMs = expectInteger(
    snapshot.requested_ticket_ttl_ms,
    "ticket_policy_snapshot.requested_ticket_ttl_ms",
    60000,
    86400000,
  );
  const maxUses = expectInteger(
    snapshot.max_uses,
    "ticket_policy_snapshot.max_uses",
    1,
    1,
  );

  if (
    requestedTtlMs !== plan.request.execution_contract.ticket_ttl_ms ||
    maxUses !== 1
  ) {
    fail("ticket policy requested TTL/max-uses mismatch");
  }

  if (
    expectInteger(
      snapshot.fixed_award_wc,
      "ticket_policy_snapshot.fixed_award_wc",
      1,
      1000000,
    ) !== plan.request.execution_contract.fixed_award_wc
  ) {
    fail("ticket policy fixed award mismatch");
  }

  if (
    expectInteger(
      snapshot.account_active_ticket_count,
      "ticket_policy_snapshot.account_active_ticket_count",
      0,
      1000000,
    ) !== 0
  ) {
    fail("ticket policy account active ticket count must be zero");
  }

  if (
    expectInteger(
      snapshot.global_active_ticket_count,
      "ticket_policy_snapshot.global_active_ticket_count",
      0,
      1000000,
    ) !== coordinatorSnapshot.caps.active_issued
  ) {
    fail("ticket policy global active ticket count mismatch");
  }

  if (
    expectInteger(
      snapshot.global_consumed_ticket_count,
      "ticket_policy_snapshot.global_consumed_ticket_count",
      0,
      1000000000,
    ) !== coordinatorSnapshot.caps.consumed
  ) {
    fail("ticket policy global consumed ticket count mismatch");
  }

  if (
    expectInteger(
      snapshot.global_ticket_cap,
      "ticket_policy_snapshot.global_ticket_cap",
      1,
      1000000,
    ) !== coordinatorSnapshot.caps.global
  ) {
    fail("ticket policy global cap mismatch");
  }

  if (
    expectInteger(
      snapshot.per_account_ticket_cap,
      "ticket_policy_snapshot.per_account_ticket_cap",
      1,
      1000000,
    ) !== coordinatorSnapshot.caps.per_account
  ) {
    fail("ticket policy per-account cap mismatch");
  }

  return snapshot;
}

function transitionBasis({
  plan,
  coordinatorSnapshot,
  balanceSnapshot,
  runtimeSnapshot,
  ticketPolicySnapshot,
  preparedAtUtc,
  nonce,
}) {
  return {
    version: 1,
    fulfillment_id: plan.fulfillment_id,
    plan_id: plan.plan_id,
    plan_revision: plan.revision,
    transition: {
      from_state: "accepted_submission_bound",
      to_state: "ticket_issue_planned",
    },
    coordinator_snapshot_sha256:
      sha256Text(canonicalJson(coordinatorSnapshot)),
    wc_balance_snapshot_sha256:
      sha256Text(canonicalJson(balanceSnapshot)),
    runtime_snapshot_sha256:
      sha256Text(canonicalJson(runtimeSnapshot)),
    ticket_policy_snapshot_sha256:
      sha256Text(canonicalJson(ticketPolicySnapshot)),
    prepared_at_utc: preparedAtUtc,
    nonce,
  };
}

function deriveIntentId(basis) {
  return `voidapwfint1_${sha256Text(canonicalJson(basis))}`;
}

function deriveReceiptId(intentId, eventId) {
  return `voidapwfpre1_${sha256Text(
    canonicalJson({
      version: 1,
      intent_id: intentId,
      event_id: eventId,
    }),
  )}`;
}

function packageBasis(intent, event, receipt) {
  return {
    version: 1,
    intent_sha256: sha256Text(canonicalJson(intent)),
    event_sha256: sha256Text(canonicalJson(event)),
    receipt_sha256: sha256Text(canonicalJson(receipt)),
  };
}

function validateInputPlan(planValue) {
  const plan = expectObject(planValue, "plan");
  const inspection = inspectPlan(plan);
  requireOrchestratorAuthorityDisabled(plan.authority);

  if (
    inspection.valid !== true ||
    inspection.state !== "accepted_submission_bound" ||
    inspection.next_transition !== "ticket_issue_planned" ||
    inspection.completed !== false
  ) {
    fail("input plan is not ready for ticket_issue_planned");
  }

  if (
    plan.request.execution_contract.fixed_award_wc !==
    inspection.fixed_award_wc
  ) {
    fail("input plan fixed award mismatch");
  }

  requireNoCapabilityToken(plan, "plan");
  return { plan, inspection };
}

export function prepareTransitionPackage(input, confirmation) {
  if (confirmation !== PREPARE_CONFIRMATION) {
    fail("explicit prepare confirmation mismatch");
  }

  const { plan, inspection } = validateInputPlan(input.plan);
  const preparedAtUtc = expectUtc(
    input.prepared_at_utc,
    "prepared_at_utc",
  );
  const nonce = expectString(input.nonce, "nonce", {
    pattern: ID_PATTERN,
  });
  const coordinatorSnapshot = validateCoordinatorSnapshot(
    input.coordinator_snapshot,
    plan,
  );
  const balanceSnapshot = validateBalanceSnapshot(
    input.wc_balance_snapshot,
    plan,
  );
  const runtimeSnapshot = validateRuntimeSnapshot(
    input.runtime_snapshot,
    plan,
  );
  const ticketPolicySnapshot = validateTicketPolicySnapshot(
    input.ticket_policy_snapshot,
    plan,
    coordinatorSnapshot,
  );

  const basis = transitionBasis({
    plan,
    coordinatorSnapshot,
    balanceSnapshot,
    runtimeSnapshot,
    ticketPolicySnapshot,
    preparedAtUtc,
    nonce,
  });
  const intentId = deriveIntentId(basis);

  const intent = {
    marker: INTENT_MARKER,
    version: 1,
    created_at_utc: preparedAtUtc,
    intent_id: intentId,
    fulfillment_id: inspection.fulfillment_id,
    source_plan_id: inspection.plan_id,
    source_plan_revision: inspection.revision,
    transition: {
      from_state: "accepted_submission_bound",
      to_state: "ticket_issue_planned",
    },
    destination_wc_account: inspection.destination_wc_account,
    fixed_award_wc: inspection.fixed_award_wc,
    ticket_issue_parameters: {
      requested_ticket_ttl_ms:
        ticketPolicySnapshot.requested_ticket_ttl_ms,
      max_uses: 1,
    },
    snapshot_digests: {
      coordinator_status:
        basis.coordinator_snapshot_sha256,
      wc_balance:
        basis.wc_balance_snapshot_sha256,
      runtime:
        basis.runtime_snapshot_sha256,
      ticket_issue_policy:
        basis.ticket_policy_snapshot_sha256,
    },
    preconditions: {
      coordinator_identity_verified: true,
      coordinator_role_verified: true,
      destination_account_verified: true,
      destination_account_ticket_capacity_verified: true,
      global_ticket_capacity_verified: true,
      fixed_award_verified: true,
      ticket_ttl_verified: true,
      content_addressed_runtime_verified: true,
      active_ticket_count_zero: true,
      raw_capability_token_absent: true,
    },
    authority: EXECUTOR_AUTHORITY,
    nonce,
  };

  const event = buildEvent({
    fulfillment_id: inspection.fulfillment_id,
    expected_revision: inspection.revision,
    from_state: "accepted_submission_bound",
    to_state: "ticket_issue_planned",
    occurred_at_utc: preparedAtUtc,
    evidence: {
      issue_preconditions_verified: true,
      ticket_ttl_ms:
        ticketPolicySnapshot.requested_ticket_ttl_ms,
      transition_intent_id: intentId,
      coordinator_snapshot_sha256:
        basis.coordinator_snapshot_sha256,
      wc_balance_snapshot_sha256:
        basis.wc_balance_snapshot_sha256,
      runtime_snapshot_sha256:
        basis.runtime_snapshot_sha256,
      ticket_policy_snapshot_sha256:
        basis.ticket_policy_snapshot_sha256,
      raw_capability_token_in_evidence: false,
      live_ticket_issued: false,
      orchestrator_advanced: false,
    },
    nonce: `${nonce}-orchestrator-event`,
  });

  const receiptId = deriveReceiptId(
    intentId,
    event.event_id,
  );

  const receipt = {
    marker: PRECONDITION_RECEIPT_MARKER,
    version: 1,
    created_at_utc: preparedAtUtc,
    receipt_id: receiptId,
    intent_id: intentId,
    event_id: event.event_id,
    fulfillment_id: inspection.fulfillment_id,
    source_plan_id: inspection.plan_id,
    source_plan_revision: inspection.revision,
    exact_green: true,
    verified: {
      source_plan_ready: true,
      coordinator_status: true,
      destination_wc_balance: true,
      content_addressed_runtime: true,
      ticket_issue_policy: true,
      zero_active_destination_tickets: true,
      global_ticket_capacity: true,
      fixed_award: true,
      requested_ttl: true,
      raw_capability_token_absent: true,
    },
    authority: EXECUTOR_AUTHORITY,
  };

  const packageId = `voidapwfpkg1_${sha256Text(
    canonicalJson(packageBasis(intent, event, receipt)),
  )}`;

  const packageValue = {
    marker: PACKAGE_MARKER,
    version: 1,
    created_at_utc: preparedAtUtc,
    package_id: packageId,
    intent_id: intentId,
    event_id: event.event_id,
    receipt_id: receiptId,
    fulfillment_id: inspection.fulfillment_id,
    source_plan_id: inspection.plan_id,
    source_plan_revision: inspection.revision,
    transition: {
      from_state: "accepted_submission_bound",
      to_state: "ticket_issue_planned",
    },
    file_names: FILE_NAMES,
    authority: EXECUTOR_AUTHORITY,
  };

  for (const [label, value] of [
    ["intent", intent],
    ["event", event],
    ["receipt", receipt],
    ["package", packageValue],
  ]) {
    requireNoCapabilityToken(value, label);
    requireExecutorAuthority(
      label === "event"
        ? EXECUTOR_AUTHORITY
        : value.authority,
    );
  }

  return {
    intent,
    event,
    receipt,
    package: packageValue,
  };
}

function filePayload(value) {
  return JSON.stringify(value, null, 2) + "\n";
}

function expectedFiles(packageResult) {
  return {
    [FILE_NAMES.intent]: filePayload(packageResult.intent),
    [FILE_NAMES.event]: filePayload(packageResult.event),
    [FILE_NAMES.receipt]: filePayload(packageResult.receipt),
    [FILE_NAMES.package]: filePayload(packageResult.package),
  };
}

function writeExclusive(file, text) {
  const descriptor = fs.openSync(
    file,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL,
    0o600,
  );

  try {
    fs.writeFileSync(descriptor, text, "utf8");
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }

  fs.chmodSync(file, 0o600);
}

export function materializeTransitionPackage(
  outputDir,
  packageResult,
) {
  const files = expectedFiles(packageResult);

  if (fs.existsSync(outputDir)) {
    const metadata = fs.lstatSync(outputDir);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      fail("output directory is not a safe directory");
    }

    const observedNames = fs
      .readdirSync(outputDir)
      .sort();
    const expectedNames = Object.keys(files).sort();

    if (
      canonicalJson(observedNames) !==
      canonicalJson(expectedNames)
    ) {
      fail("existing output directory file set mismatch");
    }

    for (const [name, text] of Object.entries(files)) {
      const file = path.join(outputDir, name);
      safeJsonFile(file, `existing output ${name}`);
      if ((fs.statSync(file).mode & 0o777) !== 0o600) {
        fail(`existing output ${name} mode mismatch`);
      }
      if (fs.readFileSync(file, "utf8") !== text) {
        fail(`existing output ${name} content mismatch`);
      }
    }

    return {
      duplicate: true,
      output_dir: outputDir,
      file_sha256: Object.fromEntries(
        Object.keys(files).map((name) => [
          name,
          sha256File(path.join(outputDir, name)),
        ]),
      ),
    };
  }

  fs.mkdirSync(outputDir, {
    recursive: false,
    mode: 0o700,
  });
  fs.chmodSync(outputDir, 0o700);

  for (const [name, text] of Object.entries(files)) {
    writeExclusive(
      path.join(outputDir, name),
      text,
    );
  }

  return {
    duplicate: false,
    output_dir: outputDir,
    file_sha256: Object.fromEntries(
      Object.keys(files).map((name) => [
        name,
        sha256File(path.join(outputDir, name)),
      ]),
    ),
  };
}

export function inspectTransitionPackage(outputDir) {
  const packageValue = readJson(
    path.join(outputDir, FILE_NAMES.package),
    "transition package",
  );
  const intent = readJson(
    path.join(outputDir, FILE_NAMES.intent),
    "transition intent",
  );
  const event = readJson(
    path.join(outputDir, FILE_NAMES.event),
    "orchestrator event",
  );
  const receipt = readJson(
    path.join(outputDir, FILE_NAMES.receipt),
    "precondition receipt",
  );

  if (
    packageValue.marker !== PACKAGE_MARKER ||
    packageValue.version !== 1 ||
    intent.marker !== INTENT_MARKER ||
    intent.version !== 1 ||
    receipt.marker !== PRECONDITION_RECEIPT_MARKER ||
    receipt.version !== 1
  ) {
    fail("transition package marker/version mismatch");
  }

  for (const [label, value] of [
    ["package", packageValue],
    ["intent", intent],
    ["event", event],
    ["receipt", receipt],
  ]) {
    requireNoCapabilityToken(value, label);
  }

  requireExecutorAuthority(packageValue.authority);
  requireExecutorAuthority(intent.authority);
  requireExecutorAuthority(receipt.authority);

  if (
    packageValue.intent_id !== intent.intent_id ||
    packageValue.event_id !== event.event_id ||
    packageValue.receipt_id !== receipt.receipt_id ||
    packageValue.fulfillment_id !== intent.fulfillment_id ||
    packageValue.fulfillment_id !== event.fulfillment_id ||
    packageValue.fulfillment_id !== receipt.fulfillment_id ||
    receipt.intent_id !== intent.intent_id ||
    receipt.event_id !== event.event_id
  ) {
    fail("transition package identity mismatch");
  }

  if (
    event.from_state !== "accepted_submission_bound" ||
    event.to_state !== "ticket_issue_planned" ||
    event.evidence?.issue_preconditions_verified !== true ||
    event.evidence?.live_ticket_issued !== false ||
    event.evidence?.orchestrator_advanced !== false
  ) {
    fail("orchestrator event transition/evidence mismatch");
  }

  const expectedPackageId = `voidapwfpkg1_${sha256Text(
    canonicalJson(packageBasis(intent, event, receipt)),
  )}`;

  if (packageValue.package_id !== expectedPackageId) {
    fail("transition package package_id mismatch");
  }

  const fileSha256 = Object.fromEntries(
    Object.values(FILE_NAMES).map((name) => [
      name,
      sha256File(path.join(outputDir, name)),
    ]),
  );

  return {
    marker: INSPECTION_MARKER,
    valid: true,
    package_id: packageValue.package_id,
    intent_id: intent.intent_id,
    event_id: event.event_id,
    receipt_id: receipt.receipt_id,
    fulfillment_id: packageValue.fulfillment_id,
    source_plan_id: packageValue.source_plan_id,
    source_plan_revision: packageValue.source_plan_revision,
    transition: packageValue.transition,
    duplicate_safe: true,
    output_dir_mode_0700:
      (fs.statSync(outputDir).mode & 0o777) === 0o700,
    output_files_mode_0600: Object.values(FILE_NAMES).every(
      (name) =>
        (fs.statSync(path.join(outputDir, name)).mode & 0o777) ===
        0o600,
    ),
    raw_capability_token_present: false,
    orchestrator_advanced: false,
    ticket_issued: false,
    live_work_execution: false,
    wc_ledger_write: false,
    file_sha256: fileSha256,
    authority: EXECUTOR_AUTHORITY,
  };
}

function parseArgs(items) {
  const result = {};

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];

    if (!item.startsWith("--")) {
      fail(`unexpected argument: ${item}`);
    }

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

  if (typeof value !== "string" || !value) {
    fail(`missing --${key}`);
  }

  return value;
}

function cliMain() {
  const [command, ...rawArgs] = process.argv.slice(2);
  const args = parseArgs(rawArgs);

  if (command === "prepare") {
    const packageResult = prepareTransitionPackage(
      {
        plan: readJson(requiredArg(args, "plan"), "plan"),
        coordinator_snapshot: readJson(
          requiredArg(args, "coordinator-snapshot"),
          "coordinator snapshot",
        ),
        wc_balance_snapshot: readJson(
          requiredArg(args, "wc-balance-snapshot"),
          "WC balance snapshot",
        ),
        runtime_snapshot: readJson(
          requiredArg(args, "runtime-snapshot"),
          "runtime snapshot",
        ),
        ticket_policy_snapshot: readJson(
          requiredArg(args, "ticket-policy-snapshot"),
          "ticket policy snapshot",
        ),
        prepared_at_utc: requiredArg(args, "prepared-at-utc"),
        nonce: requiredArg(args, "nonce"),
      },
      requiredArg(args, "confirm"),
    );
    const materialized = materializeTransitionPackage(
      requiredArg(args, "output-dir"),
      packageResult,
    );
    const inspection = inspectTransitionPackage(
      materialized.output_dir,
    );

    process.stdout.write(
      JSON.stringify({
        marker: PREPARE_MARKER,
        package_id: inspection.package_id,
        intent_id: inspection.intent_id,
        event_id: inspection.event_id,
        receipt_id: inspection.receipt_id,
        fulfillment_id: inspection.fulfillment_id,
        source_plan_id: inspection.source_plan_id,
        source_plan_revision: inspection.source_plan_revision,
        transition: inspection.transition,
        duplicate: materialized.duplicate,
        output_dir: materialized.output_dir,
        file_sha256: materialized.file_sha256,
        raw_capability_token_read: false,
        orchestrator_advanced: false,
        ticket_issued: false,
        live_work_execution: false,
        wc_ledger_write: false,
        authority: EXECUTOR_AUTHORITY,
      }) + "\n",
    );
    return;
  }

  if (command === "inspect") {
    process.stdout.write(
      JSON.stringify(
        inspectTransitionPackage(
          requiredArg(args, "output-dir"),
        ),
      ) + "\n",
    );
    return;
  }

  fail(
    "usage: external_agent_paid_work_fulfillment_transition_executor_v1.ts " +
      "<prepare|inspect> [options]",
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
      `HOLD: bounded fulfillment transition executor V1 failed: ${
        error instanceof Error ? error.message : String(error)
      }\n`,
    );
    process.exitCode = 2;
  }
}
