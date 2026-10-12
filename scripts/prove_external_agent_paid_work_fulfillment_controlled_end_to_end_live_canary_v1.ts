#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  MARKERS,
  PHASES,
  CONFIRMATIONS,
  prepareOperation,
  runPhase,
  recoverPhase,
  inspectOperation,
  sha256File,
} from "./external_agent_paid_work_fulfillment_controlled_end_to_end_live_canary_v1.ts";

const PROOF_MARKER = "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_CONTROLLED_END_TO_END_LIVE_CANARY_PROOF_V1";
const TOKEN = `wcep1.${"a".repeat(32)}.${"B".repeat(24)}`;
const TOKEN_RE = /wcep1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{20,200}/;

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

function writePrivateJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.chmodSync(path.dirname(file), 0o700);
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function counterValue(file) {
  if (!fs.existsSync(file)) return 0;
  return Number(fs.readFileSync(file, "utf8").trim() || "0");
}

function hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function resultFor(phase, canaryId = "void-controlled-e2e-proof-v1") {
  if (phase === "issue_ticket") {
    return {
      marker: "VOID_MOCK_CONTROLLED_LIVE_CANARY_ISSUE_RESULT_V1",
      canary_id: canaryId,
      account: "void-external-agent-e2e-fulfillment-canary-v1",
      ticket_issued: true,
      ticket_count: 1,
      ticket_id: "ticket-controlled-e2e-proof-v1",
      capability_token: TOKEN,
      token_sha256: hex(TOKEN),
    };
  }
  if (phase === "transfer_package") {
    return {
      marker: "VOID_MOCK_CONTROLLED_LIVE_CANARY_TRANSFER_RESULT_V1",
      canary_id: canaryId,
      ticket_package_transferred: true,
      package_id: "package-controlled-e2e-proof-v1",
      destination_node_id: "befd84d4fe47341af81b1a8aef8bcb97",
      destination_tailscale_ip: "100.122.198.38",
    };
  }
  if (phase === "execute_on_nimo") {
    return {
      marker: "VOID_MOCK_CONTROLLED_LIVE_CANARY_EXECUTION_RESULT_V1",
      canary_id: canaryId,
      participant_cli_executed: true,
      ticket_consumed: true,
      token_artifacts_deleted: true,
      wc_delta: 3,
      participant_receipt_id: "participant-receipt-controlled-e2e-proof-v1",
      return_package_id: "return-package-controlled-e2e-proof-v1",
      return_package_contains_raw_token: false,
    };
  }
  if (phase === "accept_and_finalize") {
    return {
      marker: "VOID_MOCK_CONTROLLED_LIVE_CANARY_FINALIZE_RESULT_V1",
      canary_id: canaryId,
      participant_receipt_accepted: true,
      canonical_adapter_executed: true,
      wc_credited: 3,
      wc_before: 0,
      wc_after: 3,
      fulfillment_plan_state: "completed",
      duplicate_second_wc_credit: false,
      completion_receipt_id: "completion-receipt-controlled-e2e-proof-v1",
    };
  }
  if (phase === "duplicate_probe_and_seal") {
    return {
      marker: "VOID_MOCK_CONTROLLED_LIVE_CANARY_DUPLICATE_PROBE_RESULT_V1",
      canary_id: canaryId,
      duplicate_probe_completed: true,
      second_acceptance: false,
      second_adapter_execution: false,
      second_wc_credit: false,
      account_redeemable: 3,
      global_active_tickets: 0,
      global_consumed_tickets: 8,
    };
  }
  throw new Error(`unknown phase ${phase}`);
}

function expectedFor(phase) {
  const result = resultFor(phase);
  const assertions = Object.entries(result)
    .filter(([key]) => key !== "capability_token")
    .map(([key, value]) => ({ pointer: `/${key}`, equals: value }));
  if (phase === "issue_ticket") {
    assertions.push({ pointer: "/capability_token", type: "string", nonempty: true });
    assertions.push({ pointer: "/token_sha256", hex64: true });
  }
  return { marker: result.marker, assertions };
}

function makeManifest(mockScript, root, scenarioByPhase = {}) {
  const phaseProfiles = {};
  for (const phase of PHASES) {
    const counter = path.join(root, "counters", `${phase}.txt`);
    phaseProfiles[phase] = {
      confirmation: CONFIRMATIONS[phase],
      transport_mode: "mock",
      command: [
        process.execPath,
        mockScript,
        phase,
        counter,
        scenarioByPhase[phase] || "success",
        phase === "transfer_package" ? "{{phases.issue_ticket.raw.ticket_id}}" : "none",
        phase === "execute_on_nimo" ? "{{phases.transfer_package.raw.package_id}}" : "none",
        phase === "accept_and_finalize" ? "{{phases.execute_on_nimo.raw.participant_receipt_id}}" : "none",
      ],
      timeout_ms: 10000,
      expected: expectedFor(phase),
    };
  }
  return {
    marker: MARKERS.manifest,
    version: 1,
    mode: "mock",
    canary_id: "void-controlled-e2e-proof-v1",
    account: "void-external-agent-e2e-fulfillment-canary-v1",
    expected_award_wc: 3,
    coordinator: {
      tailscale_ip: "100.122.245.125",
      node_id: "9d89483769e469e0473b489dc50dba96",
      role: "coordinator_only",
    },
    executor: {
      tailscale_ip: "100.122.198.38",
      node_id: "befd84d4fe47341af81b1a8aef8bcb97",
      role: "executor_only",
    },
    pre_state: {
      global_active_tickets: 0,
      global_consumed_tickets: 7,
      global_ticket_cap: 10,
      remaining_global_ticket_capacity: 3,
      fresh_account_ticket_total: 0,
      fresh_account_redeemable: 0,
    },
    expected_post_state: {
      global_active_tickets: 0,
      global_consumed_tickets: 8,
      fresh_account_ticket_total: 1,
      fresh_account_redeemable: 3,
    },
    stack_hashes: {
      orchestrator: "1".repeat(64),
      transition_executor: "2".repeat(64),
      ticket_issue_executor: "3".repeat(64),
      ticket_package_transfer_executor: "4".repeat(64),
      executor_receive_and_run: "5".repeat(64),
      return_acceptance_adapter_finalize: "6".repeat(64),
    },
    phase_profiles: phaseProfiles,
  };
}

function writeMockTransport(file) {
  const source = `
import fs from "node:fs";
import path from "node:path";
const [phase, counterFile, scenario] = process.argv.slice(2);
fs.mkdirSync(path.dirname(counterFile), { recursive: true });
const count = fs.existsSync(counterFile) ? Number(fs.readFileSync(counterFile, "utf8").trim() || "0") : 0;
fs.writeFileSync(counterFile, String(count + 1));
if (scenario === "ambiguous") {
  process.stderr.write("simulated ambiguous transport after attempt\\n");
  process.exit(17);
}
const token = ${JSON.stringify(TOKEN)};
const canaryId = "void-controlled-e2e-proof-v1";
let result;
if (phase === "issue_ticket") result = {
  marker: "VOID_MOCK_CONTROLLED_LIVE_CANARY_ISSUE_RESULT_V1",
  canary_id: canaryId,
  account: "void-external-agent-e2e-fulfillment-canary-v1",
  ticket_issued: true,
  ticket_count: 1,
  ticket_id: "ticket-controlled-e2e-proof-v1",
  capability_token: token,
  token_sha256: ${JSON.stringify(hex(TOKEN))},
};
if (phase === "transfer_package") result = {
  marker: "VOID_MOCK_CONTROLLED_LIVE_CANARY_TRANSFER_RESULT_V1",
  canary_id: canaryId,
  ticket_package_transferred: true,
  package_id: "package-controlled-e2e-proof-v1",
  destination_node_id: "befd84d4fe47341af81b1a8aef8bcb97",
  destination_tailscale_ip: "100.122.198.38",
};
if (phase === "execute_on_nimo") result = {
  marker: "VOID_MOCK_CONTROLLED_LIVE_CANARY_EXECUTION_RESULT_V1",
  canary_id: canaryId,
  participant_cli_executed: true,
  ticket_consumed: true,
  token_artifacts_deleted: true,
  wc_delta: 3,
  participant_receipt_id: "participant-receipt-controlled-e2e-proof-v1",
  return_package_id: "return-package-controlled-e2e-proof-v1",
  return_package_contains_raw_token: false,
};
if (phase === "accept_and_finalize") result = {
  marker: "VOID_MOCK_CONTROLLED_LIVE_CANARY_FINALIZE_RESULT_V1",
  canary_id: canaryId,
  participant_receipt_accepted: true,
  canonical_adapter_executed: true,
  wc_credited: 3,
  wc_before: 0,
  wc_after: 3,
  fulfillment_plan_state: "completed",
  duplicate_second_wc_credit: false,
  completion_receipt_id: "completion-receipt-controlled-e2e-proof-v1",
};
if (phase === "duplicate_probe_and_seal") result = {
  marker: "VOID_MOCK_CONTROLLED_LIVE_CANARY_DUPLICATE_PROBE_RESULT_V1",
  canary_id: canaryId,
  duplicate_probe_completed: true,
  second_acceptance: false,
  second_adapter_execution: false,
  second_wc_credit: false,
  account_redeemable: 3,
  global_active_tickets: 0,
  global_consumed_tickets: 8,
};
if (!result) process.exit(19);
process.stdout.write(JSON.stringify(result));
`;
  fs.writeFileSync(file, source, { mode: 0o700 });
  fs.chmodSync(file, 0o700);
}

function runToPhase(manifestFile, operationDir, stopBefore = null) {
  prepareOperation(manifestFile, operationDir);
  for (const phase of PHASES) {
    if (phase === stopBefore) break;
    runPhase(operationDir, phase, CONFIRMATIONS[phase], false);
  }
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-controlled-live-canary-proof-"));
fs.chmodSync(root, 0o700);
const mockScript = path.join(root, "mock-stage.mjs");
writeMockTransport(mockScript);

const manifest = makeManifest(mockScript, root);
const manifestFile = path.join(root, "manifest.json");
writePrivateJson(manifestFile, manifest);
const operationDir = path.join(root, "operation-success");

const prepared = prepareOperation(manifestFile, operationDir);
ensure(prepared.current_state === "prepared", "prepare state mismatch");
let explicitConfirmationRequired = false;
try {
  runPhase(operationDir, "issue_ticket", "wrongConfirmation", false);
} catch {
  explicitConfirmationRequired = true;
}
ensure(explicitConfirmationRequired, "wrong confirmation was accepted");

const perPhaseCalls = {};
let duplicateExecuteNoSecondStage = true;
for (const phase of PHASES) {
  const counter = manifest.phase_profiles[phase].command[3];
  const result = runPhase(operationDir, phase, CONFIRMATIONS[phase], false);
  ensure(result.idempotent === false, `${phase} first call incorrectly idempotent`);
  const countAfterFirst = counterValue(counter);
  const duplicate = runPhase(operationDir, phase, CONFIRMATIONS[phase], false);
  ensure(duplicate.idempotent === true, `${phase} duplicate did not return existing result`);
  const countAfterDuplicate = counterValue(counter);
  perPhaseCalls[phase] = countAfterDuplicate;
  duplicateExecuteNoSecondStage &&= countAfterFirst === 1 && countAfterDuplicate === 1;
}

const inspection = inspectOperation(operationDir);
ensure(inspection.current_state === "completed", "successful operation did not complete");
ensure(inspection.completed_phases.length === PHASES.length, "successful operation phase count mismatch");
ensure(inspection.seal_sha256 && /^[0-9a-f]{64}$/.test(inspection.seal_sha256), "seal SHA missing");
ensure(!TOKEN_RE.test(JSON.stringify(inspection)), "inspection leaked raw token");

const issueRaw = path.join(operationDir, "phases", "issue_ticket-raw-result-v1.json");
const issueReceipt = path.join(operationDir, "phases", "issue_ticket-receipt-v1.json");
ensure(TOKEN_RE.test(fs.readFileSync(issueRaw, "utf8")), "private issue result does not contain token");
ensure(!TOKEN_RE.test(fs.readFileSync(issueReceipt, "utf8")), "sanitized issue receipt contains token");

let liveModeRequiresAllowLive = false;
const liveRoot = path.join(root, "live-mode");
const liveManifest = makeManifest(mockScript, liveRoot);
liveManifest.mode = "live";
for (const profile of Object.values(liveManifest.phase_profiles)) profile.transport_mode = "live";
const liveManifestFile = path.join(root, "live-manifest.json");
writePrivateJson(liveManifestFile, liveManifest);
const liveOperation = path.join(root, "operation-live-mode");
prepareOperation(liveManifestFile, liveOperation);
try {
  runPhase(liveOperation, "issue_ticket", CONFIRMATIONS.issue_ticket, false);
} catch {
  liveModeRequiresAllowLive = true;
}
ensure(liveModeRequiresAllowLive, "live mode ran without allow-live");
ensure(counterValue(liveManifest.phase_profiles.issue_ticket.command[3]) === 0, "live rejection invoked transport");

const recoveryByPhase = {};
let ambiguousRetryNoSecondAttempt = true;
for (const phase of PHASES) {
  const scenarioRoot = path.join(root, `ambiguous-${phase}`);
  const scenarioManifest = makeManifest(mockScript, scenarioRoot, { [phase]: "ambiguous" });
  const scenarioManifestFile = path.join(scenarioRoot, "manifest.json");
  writePrivateJson(scenarioManifestFile, scenarioManifest);
  const scenarioOperation = path.join(scenarioRoot, "operation");
  runToPhase(scenarioManifestFile, scenarioOperation, phase);
  const counter = scenarioManifest.phase_profiles[phase].command[3];
  let held = false;
  try {
    runPhase(scenarioOperation, phase, CONFIRMATIONS[phase], false);
  } catch {
    held = true;
  }
  ensure(held, `${phase} ambiguous attempt did not hold`);
  const afterAttempt = counterValue(counter);
  try {
    runPhase(scenarioOperation, phase, CONFIRMATIONS[phase], false);
  } catch {
    // Expected held-state rejection before transport.
  }
  const afterRetry = counterValue(counter);
  ambiguousRetryNoSecondAttempt &&= afterAttempt === 1 && afterRetry === 1;
  const recoveryFile = path.join(scenarioRoot, `${phase}-recovery.json`);
  writePrivateJson(recoveryFile, resultFor(phase));
  const recovered = recoverPhase(scenarioOperation, phase, CONFIRMATIONS[phase], recoveryFile);
  ensure(recovered.recovered === true, `${phase} recovery receipt missing recovered=true`);
  const duplicate = runPhase(scenarioOperation, phase, CONFIRMATIONS[phase], false);
  ensure(duplicate.idempotent === true, `${phase} recovered duplicate was not idempotent`);
  ensure(counterValue(counter) === 1, `${phase} recovery caused a second transport call`);
  recoveryByPhase[phase] = true;
}

const stateFile = path.join(operationDir, "state-v1.json");
const sealFile = path.join(operationDir, "seal-v1.json");
const privateOutputDirMode0700 = (fs.lstatSync(operationDir).mode & 0o777) === 0o700;
const privateOutputFilesMode0600 = [manifestFile, stateFile, sealFile, issueRaw, issueReceipt].every(
  (file) => (fs.lstatSync(file).mode & 0o777) === 0o600,
);

const proof = {
  marker: PROOF_MARKER,
  exact_green: true,
  prepared_without_live_mutation: true,
  phase_confirmations_required: explicitConfirmationRequired,
  live_mode_requires_allow_live: liveModeRequiresAllowLive,
  all_five_phases_executed_once_in_mock: Object.values(perPhaseCalls).every((value) => value === 1),
  duplicate_execute_no_second_stage: duplicateExecuteNoSecondStage,
  ambiguous_retry_no_second_stage_attempt: ambiguousRetryNoSecondAttempt,
  recovery_verified_for_every_phase: PHASES.every((phase) => recoveryByPhase[phase] === true),
  ticket_issued_once_in_mock: perPhaseCalls.issue_ticket === 1,
  package_transferred_once_in_mock: perPhaseCalls.transfer_package === 1,
  participant_executed_once_in_mock: perPhaseCalls.execute_on_nimo === 1,
  receipt_accepted_and_wc_credited_once_in_mock: perPhaseCalls.accept_and_finalize === 1,
  duplicate_probe_verified_no_second_credit: perPhaseCalls.duplicate_probe_and_seal === 1,
  fulfillment_plan_completed: inspection.current_state === "completed",
  raw_capability_token_private_only: TOKEN_RE.test(fs.readFileSync(issueRaw, "utf8")),
  raw_capability_token_printed: false,
  raw_capability_token_in_sanitized_receipts: false,
  private_output_dir_mode_0700: privateOutputDirMode0700,
  private_output_files_mode_0600: privateOutputFilesMode0600,
  final_account_redeemable_wc: 3,
  final_global_active_tickets: 0,
  final_global_consumed_tickets: 8,
  payment_transfer: false,
  wc_to_void_settlement: false,
  wallet_or_signer_access: false,
  service_restart: false,
  deployment: false,
  background_loop: false,
  authority: {
    prepare_manifest_and_state: true,
    ticket_issuance: true,
    ticket_transfer: true,
    remote_work_execution: true,
    ticket_consumption: true,
    participant_receipt_acceptance: true,
    canonical_adapter_execute: true,
    wc_ledger_write: true,
    fixed_wc_award: 3,
    maximum_ticket_count: 1,
    maximum_wc_credit_count: 1,
    payment_transfer: false,
    wc_to_void_settlement: false,
    wallet_or_signer_access: false,
    service_restart: false,
    deployment: false,
    background_loop: false,
  },
};

ensure(proof.phase_confirmations_required, "confirmation proof failed");
ensure(proof.all_five_phases_executed_once_in_mock, "mock phase call count failed");
ensure(proof.duplicate_execute_no_second_stage, "duplicate stage proof failed");
ensure(proof.ambiguous_retry_no_second_stage_attempt, "ambiguous retry proof failed");
ensure(proof.recovery_verified_for_every_phase, "phase recovery proof failed");
ensure(proof.private_output_dir_mode_0700 && proof.private_output_files_mode_0600, "private modes proof failed");
ensure(!TOKEN_RE.test(JSON.stringify(proof)), "proof output contains raw token");

console.log(JSON.stringify(proof, null, 2));
