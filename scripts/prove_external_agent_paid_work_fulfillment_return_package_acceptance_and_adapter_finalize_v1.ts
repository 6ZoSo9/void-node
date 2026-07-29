#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  ADVANCE_CONFIRMATION,
  MUTATING_AUTHORITY,
  REQUEST_MARKER,
  advancePlan,
  buildEvent,
  canonicalJson,
  inspectPlan,
  sha256File,
  sha256Text,
  stageRequest,
} from "./external_agent_paid_work_fulfillment_orchestrator_v1.ts";

import {
  RETURN_PACKAGE_MARKER,
  SANITIZED_RECEIPT_MARKER as EXECUTOR_RUN_RECEIPT_MARKER,
} from "./external_agent_paid_work_fulfillment_executor_receive_and_run_v1.ts";

import {
  ACCEPTANCE_RECEIPT_MARKER,
  ADAPTER_RECEIPT_MARKER,
  EXECUTE_CONFIRMATION,
  FINALIZATION_AUTHORITY,
  FINALIZATION_PROFILE_MARKER,
  RAW_ACCEPTANCE_RESULT_MARKER,
  RAW_ADAPTER_RESULT_MARKER,
  RAW_DUPLICATE_RESULT_MARKER,
  RECOVER_CONFIRMATION,
  executeReturnPackageAcceptanceAndAdapterFinalize,
  inspectReturnPackageAcceptanceAndAdapterFinalize,
  recoverReturnPackageAcceptanceAndAdapterFinalize,
} from "./external_agent_paid_work_fulfillment_return_package_acceptance_and_adapter_finalize_v1.ts";

function h(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function writeJson(file, value, mode = 0o600) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { mode });
  fs.chmodSync(file, mode);
}

function writeText(file, value, mode = 0o600) {
  fs.writeFileSync(file, value, { mode });
  fs.chmodSync(file, mode);
}

function tokenFor(ticketId) {
  return `wcep1.${ticketId}.${"A".repeat(32)}`;
}

function createFixture(root, suffix, startedAtMs, options = {}) {
  const fixtureDir = path.join(root, `fixture-${suffix}`);
  fs.mkdirSync(fixtureDir, { mode: 0o700 });
  const account = `void-agent-finalizer-proof-${suffix}`;
  const agentId = `void.agent.finalizer.${suffix}`;
  const credentialId = `voidapwc1_${h(`credential-${suffix}`)}`;
  const bindingId = `voidapwcb1_${h(`binding-${suffix}`)}`;
  const registryId = `voidapwcbr1_${h(`registry-${suffix}`)}`;
  const submissionReceiptId = `voidawsi1_${h(`submission-receipt-${suffix}`)}`;
  const workOrderId = `voidawo1_${h(`work-order-${suffix}`)}`;
  const participantReceiptId = `voidwcr1_${h(`participant-receipt-${suffix}`)}`;
  const ticketId = h(`ticket-${suffix}`).slice(0, 32);
  const participantCliSha = h(`participant-cli-${suffix}`);
  const acceptanceSourcePath = path.join(fixtureDir, "wc_verified_receipt_acceptance_v1.ts");
  const adapterCliPath = path.join(fixtureDir, "agent_paid_work_wc_earning_adapter_cli_v1.ts");
  const adapterCorePath = path.join(fixtureDir, "agent_paid_work_wc_earning_adapter_v1.ts");
  writeText(acceptanceSourcePath, `acceptance-source-${suffix}\n`);
  writeText(adapterCliPath, `adapter-cli-${suffix}\n`);
  writeText(adapterCorePath, `adapter-core-${suffix}\n`);

  const registry = {
    registry_id: registryId,
    marker: "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_REGISTRY_V1",
    version: 1,
    updated_at: new Date(startedAtMs - 1000).toISOString(),
    bindings: [
      {
        marker: "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_V1",
        binding_id: bindingId,
        credential_id: credentialId,
        agent_id: agentId,
        destination_wc_account: account,
        status: "active",
        valid_from: new Date(startedAtMs - 86400000).toISOString(),
        valid_until: new Date(startedAtMs + 86400000).toISOString(),
        revoked_at: null,
        uniqueness_key: `paid-work-credential-wc-account:${credentialId}`,
        authority: {
          paid_work_submission_identity: true,
          wc_award_destination: true,
          payment: false,
          wc_ledger_write: false,
          wc_to_void_settlement: false,
          wallet_or_signer: false,
        },
        source: {
          credential_registry_sha256: h(`credential-registry-${suffix}`),
          review_decision_id: null,
          issuance_preparation_id: null,
        },
        created_at: new Date(startedAtMs - 86400000).toISOString(),
      },
    ],
  };
  const registryPath = path.join(fixtureDir, "binding-registry-v1.json");
  writeJson(registryPath, registry);
  const artifacts = {};
  for (const [key, kind] of [
    ["accepted_submission_receipt", "accepted_submission_receipt_v1"],
    ["binding_registry", "credential_wc_account_binding_registry_v1"],
    ["selected_contract_receipt", "selected_adapter_contract_receipt_v1"],
    ["work_order", "paid_work_order_v1"],
  ]) {
    let file;
    if (key === "binding_registry") {
      file = registryPath;
    } else {
      file = path.join(fixtureDir, `${key}.json`);
      writeJson(file, { marker: `VOID_TEST_${key.toUpperCase()}`, version: 1, suffix });
    }
    artifacts[key] = { path: file, sha256: sha256File(file), kind };
  }

  const request = {
    marker: REQUEST_MARKER,
    version: 1,
    created_at_utc: new Date(startedAtMs - 180000).toISOString(),
    expires_at_utc: new Date(startedAtMs + 86400000).toISOString(),
    nonce: `finalizer-plan-${suffix}`,
    submission: {
      submission_id: `agent-finalizer-${suffix}`,
      submission_receipt_id: submissionReceiptId,
      work_order_id: workOrderId,
      credential_id: credentialId,
      agent_id: agentId,
      capability_id: "datanet.fetch_verify",
      task_class: "datanet_fetch_verify",
    },
    binding: {
      binding_registry_id: registryId,
      binding_id: bindingId,
      destination_wc_account: account,
      binding_registry_sha256: sha256File(registryPath),
    },
    execution_contract: {
      coordinator_base: "http://127.0.0.1:4100",
      coordinator_node_id: "9d89483769e469e0473b489dc50dba96",
      executor_node_id: "befd84d4fe47341af81b1a8aef8bcb97",
      fixed_award_wc: 3,
      ticket_ttl_ms: 900000,
      runtime: {
        participant_cli_sha256: participantCliSha,
        pilot_source_sha256: h(`pilot-source-${suffix}`),
        acceptance_source_sha256: sha256File(acceptanceSourcePath),
        adapter_core_sha256: sha256File(adapterCorePath),
      },
    },
    source_artifacts: artifacts,
    authority: MUTATING_AUTHORITY,
  };

  let plan = stageRequest(request, true);
  plan = advancePlan(plan, buildEvent({
    fulfillment_id: plan.fulfillment_id,
    expected_revision: plan.revision,
    from_state: "accepted_submission_bound",
    to_state: "ticket_issue_planned",
    occurred_at_utc: new Date(startedAtMs - 150000).toISOString(),
    evidence: { issue_preconditions_verified: true, ticket_ttl_ms: 900000 },
    nonce: `issue-${suffix}`,
  }), ADVANCE_CONFIRMATION).plan;
  plan = advancePlan(plan, buildEvent({
    fulfillment_id: plan.fulfillment_id,
    expected_revision: plan.revision,
    from_state: "ticket_issue_planned",
    to_state: "ticket_package_planned",
    occurred_at_utc: new Date(startedAtMs - 120000).toISOString(),
    evidence: {
      ticket_id: ticketId,
      ticket_file_sha256: h(`ticket-file-${suffix}`),
      capability_token_sha256: h(tokenFor(ticketId)),
      ticket_expires_at_utc: new Date(startedAtMs + 600000).toISOString(),
      raw_capability_token_in_evidence: false,
    },
    nonce: `package-${suffix}`,
  }), ADVANCE_CONFIRMATION).plan;
  plan = advancePlan(plan, buildEvent({
    fulfillment_id: plan.fulfillment_id,
    expected_revision: plan.revision,
    from_state: "ticket_package_planned",
    to_state: "executor_receipt_expected",
    occurred_at_utc: new Date(startedAtMs - 90000).toISOString(),
    evidence: {
      ticket_id: ticketId,
      ticket_package_sha256: h(`ticket-package-${suffix}`),
      executor_node_id: request.execution_contract.executor_node_id,
      transport: "tailscale_file_cp_v1",
    },
    nonce: `executor-${suffix}`,
  }), ADVANCE_CONFIRMATION).plan;
  assert.equal(inspectPlan(plan).state, "executor_receipt_expected");
  const planPath = path.join(fixtureDir, "advanced-plan-executor-receipt-expected-v1.json");
  writeJson(planPath, plan);

  const participantReceipt = {
    marker: "VOID_WC_PUBLIC_EARNING_PARTICIPANT_EXECUTION_RECEIPT_V1",
    version: 1,
    receipt_id: participantReceiptId,
    ticket: {
      ticket_id: ticketId,
      account,
      executor_node_id: request.execution_contract.executor_node_id,
      task_class: request.submission.task_class,
      dataset_id: `ds_finalizer_${suffix}`,
      expected_input_hash: h(`input-${suffix}`),
    },
    runtime: { participant_cli_sha256: participantCliSha },
    verification: { ticket_consumed_once: true, token_artifact_deleted: true },
    wc: { before: 0, after: options.badDelta ? 4 : 3, delta: options.badDelta ? 4 : 3 },
  };
  const participantPath = path.join(fixtureDir, "participant-receipt-v1.json");
  writeJson(participantPath, participantReceipt);
  const runOperationId = `voidapwfrunop1_${h(`run-${suffix}`)}`;
  const executorReceipt = {
    marker: EXECUTOR_RUN_RECEIPT_MARKER,
    version: 1,
    created_at_utc: new Date(startedAtMs - 1000).toISOString(),
    operation_id: runOperationId,
    transfer_operation_id: `voidapwftransferop1_${h(`transfer-${suffix}`)}`,
    ticket_issue_operation_id: `voidapwfissueop1_${h(`issue-op-${suffix}`)}`,
    fulfillment_id: plan.fulfillment_id,
    executor_plan_id: plan.plan_id,
    participant_receipt_id: participantReceiptId,
    ticket: {
      ticket_id: ticketId,
      capability_token_sha256: h(tokenFor(ticketId)),
      account,
      executor_node_id: request.execution_contract.executor_node_id,
      task_class: request.submission.task_class,
      dataset_id: participantReceipt.ticket.dataset_id,
      expected_input_hash: participantReceipt.ticket.expected_input_hash,
      max_uses: 1,
      fixed_award_wc: 3,
    },
    execution: {
      participant_cli_sha256: participantCliSha,
      runner_id: "participant_cli_execute_local_v1",
      expanded_argv_sha256: h(`argv-${suffix}`),
      exit_code: 0,
      participant_receipt_sha256: h(canonicalJson(participantReceipt)),
      wc_before: participantReceipt.wc.before,
      wc_after: participantReceipt.wc.after,
      wc_delta: participantReceipt.wc.delta,
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
    authority: {
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
    },
  };
  const event = buildEvent({
    fulfillment_id: plan.fulfillment_id,
    expected_revision: plan.revision,
    from_state: "executor_receipt_expected",
    to_state: "adapter_finalization_planned",
    occurred_at_utc: new Date(startedAtMs).toISOString(),
    evidence: {
      participant_receipt_sha256: sha256File(participantPath),
      wc_before: participantReceipt.wc.before,
      wc_after: participantReceipt.wc.after,
      wc_delta: participantReceipt.wc.delta,
      ticket_consumed_once: true,
      executor_run_operation_id: runOperationId,
      token_artifact_deleted: true,
      raw_capability_token_in_evidence: false,
    },
    nonce: `adapter-finalization-${suffix}`,
  });
  const returnPackage = {
    marker: RETURN_PACKAGE_MARKER,
    version: 1,
    created_at_utc: new Date(startedAtMs).toISOString(),
    operation_id: runOperationId,
    transfer_operation_id: executorReceipt.transfer_operation_id,
    ticket_issue_operation_id: executorReceipt.ticket_issue_operation_id,
    fulfillment_id: plan.fulfillment_id,
    executor_plan_id: plan.plan_id,
    ticket_id: ticketId,
    participant_receipt: participantReceipt,
    sanitized_executor_run_receipt: executorReceipt,
    adapter_finalization_planned_event: event,
    requirements: {
      precision_receipt_acceptance_required: true,
      adapter_finalization_required: true,
      raw_capability_token_present: false,
      participant_receipt_acceptance_performed_on_executor: false,
      local_wc_ledger_write_performed: false,
    },
  };
  if (options.rawToken) returnPackage.raw_capability_token = tokenFor(ticketId);
  const returnPackagePath = path.join(fixtureDir, "participant-receipt-return-package-v1.json");
  writeJson(returnPackagePath, returnPackage);

  const profile = {
    marker: FINALIZATION_PROFILE_MARKER,
    version: 1,
    coordinator: {
      tailscale_ip: "100.122.245.125",
      node_id: request.execution_contract.coordinator_node_id,
    },
    fixed_award_wc: 3,
    runtime: {
      acceptance_source: { path: acceptanceSourcePath, sha256: sha256File(acceptanceSourcePath) },
      adapter_cli: { path: adapterCliPath, sha256: sha256File(adapterCliPath) },
      adapter_core: { path: adapterCorePath, sha256: sha256File(adapterCorePath) },
    },
    transports: {
      acceptance: {
        runner_id: "verified_receipt_acceptance_mock_v1",
        command: "/usr/bin/true",
        argv: ["{participant_receipt_path}", "{acceptance_receipt_path}"],
        timeout_ms: 10000,
        success_exit_code: 0,
      },
      adapter: {
        runner_id: "canonical_paid_work_adapter_mock_v1",
        command: "/usr/bin/true",
        argv: ["{adapter_plan_path}", "{binding_registry_path}", "{adapter_receipt_path}"],
        timeout_ms: 10000,
        success_exit_code: 0,
      },
    },
  };
  const profilePath = path.join(fixtureDir, "precision-finalization-profile-v1.json");
  writeJson(profilePath, profile);

  return {
    input: {
      return_package_path: returnPackagePath,
      executor_receipt_expected_plan_path: planPath,
      finalization_profile_path: profilePath,
      binding_registry_path: registryPath,
      started_at_utc: new Date(startedAtMs + 1000).toISOString(),
    },
    participantReceipt,
    returnPackage,
    account,
    ticketId,
    plan,
    fixtureDir,
  };
}

function acceptanceReceipt(state, data, createdAtUtc) {
  const basis = {
    marker: ACCEPTANCE_RECEIPT_MARKER,
    version: 1,
    created_at_utc: createdAtUtc,
    operation_id: state.operation_id,
    fulfillment_id: state.fulfillment_id,
    participant_receipt_id: state.participant_receipt_id,
    participant_receipt_sha256: state.participant_receipt_sha256,
    ticket_id: state.ticket_id,
    account: state.destination_wc_account,
    executor_node_id: data.returnData.participant.ticket.executor_node_id,
    accepted: true,
    duplicate: false,
    verification: {
      signature_verified: true,
      remote_health_verified: true,
      remote_job_verified: true,
      remote_receipt_verified: true,
      capability_consumed: true,
    },
    raw_capability_token_present: false,
  };
  return {
    acceptance_receipt_id: `voidapwfvra1_${h(canonicalJson(basis))}`,
    ...basis,
  };
}

function adapterReceipt(state, data, suffix, badDelta = false) {
  const before = data.returnData.participant.before;
  const delta = badDelta ? 4 : state.fixed_award_wc;
  const after = before + delta;
  return {
    marker: ADAPTER_RECEIPT_MARKER,
    version: 1,
    created_at_utc: new Date().toISOString(),
    plan_id: `voidapweap1_${h(`adapter-plan-${suffix}`)}`,
    submission: {
      submission_id: data.sourcePlan.request.submission.submission_id,
      submission_receipt_id: data.sourcePlan.request.submission.submission_receipt_id,
      work_order_id: data.sourcePlan.request.submission.work_order_id,
      credential_id: data.sourcePlan.request.submission.credential_id,
      agent_id: data.sourcePlan.request.submission.agent_id,
      capability_id: data.sourcePlan.request.submission.capability_id,
    },
    binding: {
      binding_registry_id: data.sourcePlan.request.binding.binding_registry_id,
      binding_registry_sha256: data.sourcePlan.request.binding.binding_registry_sha256,
      binding_id: data.sourcePlan.request.binding.binding_id,
      destination_wc_account: state.destination_wc_account,
    },
    participant: {
      marker: "VOID_WC_PUBLIC_EARNING_PARTICIPANT_CLI_V1",
      account: state.destination_wc_account,
      ticket_id: state.ticket_id,
      job_id: `voidjob1_${h(`job-${suffix}`)}`,
      receipt_id: state.participant_receipt_id,
      participant_receipt_path: "/private/participant-receipt-v1.json",
      participant_receipt_sha256: state.participant_receipt_sha256,
      participant_stdout_sha256: h(`stdout-${suffix}`),
      participant_stderr_sha256: h(`stderr-${suffix}`),
      ticket_deleted: true,
      recovered_from_existing_participant_receipt: true,
    },
    wc: {
      before,
      after,
      delta,
      fixed_award_wc: state.fixed_award_wc,
      credited: true,
      duplicate: false,
      canonical_redeemable: true,
    },
    verification: {
      remote_executor: true,
      signature_verified: true,
      remote_health_verified: true,
      remote_job_verified: true,
      remote_receipt_verified: true,
      capability_consumed: true,
      participant_selected_award: false,
      automatic_background_loop: false,
      money_movement: false,
    },
    authority: {
      live_work_execution: true,
      wc_ledger_write: true,
      payment_transfer: false,
      wc_to_void_settlement: false,
      wallet_or_signer_access: false,
      service_restart: false,
      deployment: false,
    },
    raw_capability_token_printed: false,
    adapter_receipt_id: `voidapwear1_${h(`adapter-receipt-${suffix}`)}`,
  };
}

function transportResult(response, label) {
  return {
    exit_code: 0,
    signal: null,
    stdout: JSON.stringify({ ok: true, label }),
    stderr: "",
    response,
    expanded_argv_sha256: h(`argv-${label}`),
  };
}

function rawEnvelope(marker, state, mode, response, label) {
  return {
    marker,
    version: 1,
    created_at_utc: new Date().toISOString(),
    operation_id: state.operation_id,
    mode,
    exit_code: 0,
    signal: null,
    stdout: JSON.stringify({ ok: true, label }),
    stderr: "",
    expanded_argv_sha256: h(`argv-${label}`),
    response,
  };
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-finalizer-proof-v1-"));
fs.chmodSync(root, 0o700);

try {
  const baseMs = Date.parse("2026-07-28T23:55:00Z");
  const hostInspector = async () => ({ tailscale_ip: "100.122.245.125" });

  const primary = createFixture(root, "primary", baseMs);
  const primaryDir = path.join(root, "primary-operation");
  let acceptanceCalls = 0;
  let adapterExecuteCalls = 0;
  let duplicateCalls = 0;
  let storedAdapterReceipt = null;
  const acceptanceTransport = async ({ state, data }) => {
    acceptanceCalls += 1;
    const receipt = acceptanceReceipt(state, data, new Date().toISOString());
    return transportResult({ ok: true, duplicate: false, receipt }, "accept-primary");
  };
  const adapterTransport = async ({ mode, state, data }) => {
    if (mode === "execute") {
      adapterExecuteCalls += 1;
      storedAdapterReceipt = adapterReceipt(state, data, "primary");
      return transportResult({ ok: true, duplicate: false, receipt: storedAdapterReceipt }, "adapter-primary");
    }
    duplicateCalls += 1;
    return transportResult({ ok: true, duplicate: true, receipt: storedAdapterReceipt }, "duplicate-primary");
  };
  const first = await executeReturnPackageAcceptanceAndAdapterFinalize(
    primary.input,
    primaryDir,
    EXECUTE_CONFIRMATION,
    acceptanceTransport,
    adapterTransport,
    hostInspector,
  );
  assert.equal(first.duplicate, false);
  assert.equal(first.fulfillment_completed, true);
  assert.equal(first.wc.delta, 3);
  assert.equal(acceptanceCalls, 1);
  assert.equal(adapterExecuteCalls, 1);
  assert.equal(duplicateCalls, 1);
  const inspection = inspectReturnPackageAcceptanceAndAdapterFinalize(primaryDir);
  assert.equal(inspection.phase, "complete");
  assert.equal(inspection.output_dir_mode_0700, true);
  assert.equal(inspection.all_existing_json_files_mode_0600, true);
  const completedPlan = JSON.parse(fs.readFileSync(path.join(primaryDir, "completed-fulfillment-plan-v1.json"), "utf8"));
  assert.equal(inspectPlan(completedPlan).state, "completed");
  const publicEvidenceText = fs.readFileSync(path.join(primaryDir, "public-evidence-candidate-v1.json"), "utf8");
  assert.equal(/wcep1\./.test(publicEvidenceText), false);
  const duplicate = await executeReturnPackageAcceptanceAndAdapterFinalize(
    primary.input,
    primaryDir,
    EXECUTE_CONFIRMATION,
    acceptanceTransport,
    adapterTransport,
    hostInspector,
  );
  assert.equal(duplicate.duplicate, true);
  assert.equal(acceptanceCalls, 1);
  assert.equal(adapterExecuteCalls, 1);
  assert.equal(duplicateCalls, 1);

  const acceptanceAmbiguous = createFixture(root, "acceptance-ambiguous", baseMs + 10000);
  const acceptanceAmbiguousDir = path.join(root, "acceptance-ambiguous-operation");
  let acceptanceAmbiguousCalls = 0;
  let acceptanceHeld = false;
  try {
    await executeReturnPackageAcceptanceAndAdapterFinalize(
      acceptanceAmbiguous.input,
      acceptanceAmbiguousDir,
      EXECUTE_CONFIRMATION,
      async () => {
        acceptanceAmbiguousCalls += 1;
        throw new Error("simulated acceptance interruption");
      },
      adapterTransport,
      hostInspector,
    );
  } catch {
    acceptanceHeld = true;
  }
  assert.equal(acceptanceHeld, true);
  assert.equal(acceptanceAmbiguousCalls, 1);
  let acceptanceRetryPrevented = false;
  try {
    await executeReturnPackageAcceptanceAndAdapterFinalize(
      acceptanceAmbiguous.input,
      acceptanceAmbiguousDir,
      EXECUTE_CONFIRMATION,
      acceptanceTransport,
      adapterTransport,
      hostInspector,
    );
  } catch {
    acceptanceRetryPrevented = true;
  }
  assert.equal(acceptanceRetryPrevented, true);
  assert.equal(acceptanceAmbiguousCalls, 1);
  const acceptanceState = JSON.parse(fs.readFileSync(path.join(acceptanceAmbiguousDir, "precision-finalization-operation-state-v1.json"), "utf8"));
  const acceptanceData = {
    returnData: { participant: { ticket: { executor_node_id: "befd84d4fe47341af81b1a8aef8bcb97" } } },
  };
  const recoveredAcceptanceReceipt = acceptanceReceipt(acceptanceState, acceptanceData, new Date().toISOString());
  const acceptanceRawPath = path.join(root, "recovered-acceptance-result-v1.json");
  writeJson(acceptanceRawPath, rawEnvelope(
    RAW_ACCEPTANCE_RESULT_MARKER,
    acceptanceState,
    "accept",
    { ok: true, duplicate: false, receipt: recoveredAcceptanceReceipt },
    "acceptance-recovery",
  ));
  let recoveryAdapterReceipt = null;
  const recoveryAdapterTransport = async ({ mode, state, data }) => {
    if (mode === "execute") {
      recoveryAdapterReceipt = adapterReceipt(state, data, "acceptance-recovery");
      return transportResult({ ok: true, duplicate: false, receipt: recoveryAdapterReceipt }, "adapter-acceptance-recovery");
    }
    return transportResult({ ok: true, duplicate: true, receipt: recoveryAdapterReceipt }, "duplicate-acceptance-recovery");
  };
  const recoveredAcceptance = await recoverReturnPackageAcceptanceAndAdapterFinalize(
    acceptanceAmbiguous.input,
    acceptanceAmbiguousDir,
    acceptanceRawPath,
    RECOVER_CONFIRMATION,
    acceptanceTransport,
    recoveryAdapterTransport,
    hostInspector,
  );
  assert.equal(recoveredAcceptance.recovered, true);

  const adapterAmbiguous = createFixture(root, "adapter-ambiguous", baseMs + 20000);
  const adapterAmbiguousDir = path.join(root, "adapter-ambiguous-operation");
  let adapterAmbiguousCalls = 0;
  let adapterHeld = false;
  try {
    await executeReturnPackageAcceptanceAndAdapterFinalize(
      adapterAmbiguous.input,
      adapterAmbiguousDir,
      EXECUTE_CONFIRMATION,
      acceptanceTransport,
      async ({ mode }) => {
        if (mode === "execute") {
          adapterAmbiguousCalls += 1;
          throw new Error("simulated adapter interruption");
        }
        throw new Error("unexpected duplicate call");
      },
      hostInspector,
    );
  } catch {
    adapterHeld = true;
  }
  assert.equal(adapterHeld, true);
  assert.equal(adapterAmbiguousCalls, 1);
  const adapterState = JSON.parse(fs.readFileSync(path.join(adapterAmbiguousDir, "precision-finalization-operation-state-v1.json"), "utf8"));
  const fixturePlan = JSON.parse(fs.readFileSync(adapterAmbiguous.input.executor_receipt_expected_plan_path, "utf8"));
  const fixtureReturn = JSON.parse(fs.readFileSync(adapterAmbiguous.input.return_package_path, "utf8"));
  const adapterData = {
    sourcePlan: fixturePlan,
    returnData: {
      participant: {
        before: fixtureReturn.participant_receipt.wc.before,
        after: fixtureReturn.participant_receipt.wc.after,
      },
    },
  };
  const recoveredAdapterReceipt = adapterReceipt(adapterState, adapterData, "adapter-recovery");
  const adapterRawPath = path.join(root, "recovered-adapter-result-v1.json");
  writeJson(adapterRawPath, rawEnvelope(
    RAW_ADAPTER_RESULT_MARKER,
    adapterState,
    "execute",
    { ok: true, duplicate: false, receipt: recoveredAdapterReceipt },
    "adapter-recovery",
  ));
  const recoveredAdapter = await recoverReturnPackageAcceptanceAndAdapterFinalize(
    adapterAmbiguous.input,
    adapterAmbiguousDir,
    adapterRawPath,
    RECOVER_CONFIRMATION,
    acceptanceTransport,
    async ({ mode }) => transportResult(
      { ok: true, duplicate: mode === "duplicate_probe", receipt: recoveredAdapterReceipt },
      `adapter-recovery-${mode}`,
    ),
    hostInspector,
  );
  assert.equal(recoveredAdapter.recovered, true);
  assert.equal(adapterAmbiguousCalls, 1);

  const duplicateAmbiguous = createFixture(root, "duplicate-ambiguous", baseMs + 30000);
  const duplicateAmbiguousDir = path.join(root, "duplicate-ambiguous-operation");
  let duplicateStoredReceipt = null;
  let duplicateHeld = false;
  try {
    await executeReturnPackageAcceptanceAndAdapterFinalize(
      duplicateAmbiguous.input,
      duplicateAmbiguousDir,
      EXECUTE_CONFIRMATION,
      acceptanceTransport,
      async ({ mode, state, data }) => {
        if (mode === "execute") {
          duplicateStoredReceipt = adapterReceipt(state, data, "duplicate-ambiguous");
          return transportResult({ ok: true, duplicate: false, receipt: duplicateStoredReceipt }, "adapter-duplicate-ambiguous");
        }
        throw new Error("simulated duplicate probe interruption");
      },
      hostInspector,
    );
  } catch {
    duplicateHeld = true;
  }
  assert.equal(duplicateHeld, true);
  const duplicateState = JSON.parse(fs.readFileSync(path.join(duplicateAmbiguousDir, "precision-finalization-operation-state-v1.json"), "utf8"));
  const duplicateRawPath = path.join(root, "recovered-duplicate-result-v1.json");
  writeJson(duplicateRawPath, rawEnvelope(
    RAW_DUPLICATE_RESULT_MARKER,
    duplicateState,
    "duplicate_probe",
    { ok: true, duplicate: true, receipt: duplicateStoredReceipt },
    "duplicate-recovery",
  ));
  const recoveredDuplicate = await recoverReturnPackageAcceptanceAndAdapterFinalize(
    duplicateAmbiguous.input,
    duplicateAmbiguousDir,
    duplicateRawPath,
    RECOVER_CONFIRMATION,
    acceptanceTransport,
    adapterTransport,
    hostInspector,
  );
  assert.equal(recoveredDuplicate.recovered, true);

  let wrongHostRejected = false;
  try {
    const fixture = createFixture(root, "wrong-host", baseMs + 40000);
    await executeReturnPackageAcceptanceAndAdapterFinalize(
      fixture.input,
      path.join(root, "wrong-host-operation"),
      EXECUTE_CONFIRMATION,
      acceptanceTransport,
      adapterTransport,
      async () => ({ tailscale_ip: "100.122.198.38" }),
    );
  } catch {
    wrongHostRejected = true;
  }
  assert.equal(wrongHostRejected, true);

  let rawTokenRejected = false;
  try {
    const fixture = createFixture(root, "raw-token", baseMs + 50000, { rawToken: true });
    await executeReturnPackageAcceptanceAndAdapterFinalize(
      fixture.input,
      path.join(root, "raw-token-operation"),
      EXECUTE_CONFIRMATION,
      acceptanceTransport,
      adapterTransport,
      hostInspector,
    );
  } catch {
    rawTokenRejected = true;
  }
  assert.equal(rawTokenRejected, true);

  let badDeltaRejected = false;
  try {
    const fixture = createFixture(root, "bad-delta", baseMs + 60000, { badDelta: true });
    await executeReturnPackageAcceptanceAndAdapterFinalize(
      fixture.input,
      path.join(root, "bad-delta-operation"),
      EXECUTE_CONFIRMATION,
      acceptanceTransport,
      adapterTransport,
      hostInspector,
    );
  } catch {
    badDeltaRejected = true;
  }
  assert.equal(badDeltaRejected, true);

  let wrongConfirmationRejected = false;
  try {
    const fixture = createFixture(root, "wrong-confirmation", baseMs + 70000);
    await executeReturnPackageAcceptanceAndAdapterFinalize(
      fixture.input,
      path.join(root, "wrong-confirmation-operation"),
      "wrong-confirmation",
      acceptanceTransport,
      adapterTransport,
      hostInspector,
    );
  } catch {
    wrongConfirmationRejected = true;
  }
  assert.equal(wrongConfirmationRejected, true);

  assert.equal(FINALIZATION_AUTHORITY.participant_receipt_acceptance, true);
  assert.equal(FINALIZATION_AUTHORITY.wc_ledger_write, true);
  assert.equal(FINALIZATION_AUTHORITY.ticket_issuance, false);
  assert.equal(FINALIZATION_AUTHORITY.ticket_transfer, false);
  assert.equal(FINALIZATION_AUTHORITY.remote_work_execution, false);

  process.stdout.write(`${JSON.stringify({
    marker: "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_RETURN_PACKAGE_ACCEPTANCE_AND_ADAPTER_FINALIZE_PROOF_V1",
    exact_green: true,
    participant_receipt_accepted_once: true,
    canonical_adapter_executed_once: true,
    wc_credited_once: true,
    duplicate_execute_no_second_acceptance_or_credit: true,
    duplicate_finalization_verified: true,
    duplicate_second_wc_credit: false,
    ambiguous_acceptance_retry_no_second_acceptance: acceptanceRetryPrevented,
    acceptance_recovery_verified: recoveredAcceptance.recovered,
    ambiguous_adapter_retry_no_second_adapter_execution: adapterAmbiguousCalls === 1,
    adapter_recovery_verified: recoveredAdapter.recovered,
    duplicate_probe_recovery_verified: recoveredDuplicate.recovered,
    fulfillment_plan_completed: true,
    public_evidence_candidate_sanitized: true,
    wrong_host_rejected: wrongHostRejected,
    raw_capability_token_rejected: rawTokenRejected,
    wc_delta_mismatch_rejected: badDeltaRejected,
    explicit_confirmation_required: wrongConfirmationRejected,
    private_output_dir_mode_0700: true,
    private_output_files_mode_0600: true,
    ticket_issuance: false,
    ticket_transfer: false,
    remote_work_execution: false,
    payment_transfer: false,
    wc_to_void_settlement: false,
    authority: FINALIZATION_AUTHORITY,
  }, null, 2)}\n`);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
