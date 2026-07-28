#!/usr/bin/env node
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
  inspectPlan,
  sha256File,
  stageRequest,
} from "./external_agent_paid_work_fulfillment_orchestrator_v1.ts";

import {
  PRIVATE_PACKAGE_MARKER,
  SANITIZED_RECEIPT_MARKER as TRANSFER_RECEIPT_MARKER,
  TRANSFER_AUTHORITY,
} from "./external_agent_paid_work_fulfillment_ticket_package_transfer_executor_v1.ts";

import {
  EXECUTE_CONFIRMATION,
  EXECUTOR_PROFILE_MARKER,
  PARTICIPANT_RUN_PROFILE_MARKER,
  RAW_RESULT_MARKER,
  RECEIVE_RUN_AUTHORITY,
  RECOVER_CONFIRMATION,
  executeExecutorReceiveAndRun,
  inspectExecutorReceiveAndRun,
  recoverExecutorReceiveAndRun,
} from "./external_agent_paid_work_fulfillment_executor_receive_and_run_v1.ts";

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", {
    mode: 0o600,
  });
  fs.chmodSync(file, 0o600);
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function tokenFor(ticketId) {
  return `wcep1.${ticketId}.${"A".repeat(32)}`;
}

function createFixture(root, suffix, startedAtMs, ttlMs = 3600000, options = {}) {
  const participantCliText =
    "#!/usr/bin/env bash\n" +
    "set -euo pipefail\n" +
    "echo participant-cli-fixture\n";
  const participantCliBytes = Buffer.from(participantCliText, "utf8");
  const participantCliSha = sha256Text(participantCliBytes);

  const artifacts = {};
  for (const [key, kind] of [
    ["accepted_submission_receipt", "accepted_submission_receipt_v1"],
    ["binding_registry", "credential_wc_account_binding_registry_v1"],
    ["selected_contract_receipt", "selected_adapter_contract_receipt_v1"],
    ["work_order", "agent_paid_work_order_v1"],
  ]) {
    const file = path.join(root, `${suffix}-${key}.json`);
    writeJson(file, {
      marker: `VOID_TEST_${key.toUpperCase()}`,
      version: 1,
    });
    artifacts[key] = {
      path: file,
      sha256: sha256File(file),
      kind,
    };
  }

  const account = `void-agent-receive-run-proof-${suffix}`;
  const datasetId = `ds_receive_run_${suffix}`;
  const expectedInputHash =
    "9999999999999999999999999999999999999999999999999999999999999999";
  const ticketId = sha256Text(`receive-run-ticket-${suffix}`).slice(0, 32);
  const token = tokenFor(ticketId);
  const issuedAtMs = startedAtMs - 60000;
  const expiresAtMs = issuedAtMs + ttlMs;

  const request = {
    marker: REQUEST_MARKER,
    version: 1,
    created_at_utc: new Date(startedAtMs - 180000).toISOString(),
    expires_at_utc: new Date(startedAtMs + 86400000).toISOString(),
    nonce: `receive-run-plan-${suffix}`,
    submission: {
      submission_id: `agent-receive-run-${suffix}`,
      submission_receipt_id:
        "voidawsi1_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      work_order_id:
        "voidawo1_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      credential_id:
        "voidapwc1_cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      agent_id: `void.agent.receive.run.${suffix}`,
      capability_id: "datanet.fetch_verify",
      task_class: "datanet_fetch_verify",
    },
    binding: {
      binding_registry_id:
        "voidapwcbr1_dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      binding_id:
        "voidapwcb1_eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      destination_wc_account: account,
      binding_registry_sha256:
        "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    },
    execution_contract: {
      coordinator_base: "http://127.0.0.1:4100",
      coordinator_node_id: "9d89483769e469e0473b489dc50dba96",
      executor_node_id: "befd84d4fe47341af81b1a8aef8bcb97",
      fixed_award_wc: 3,
      ticket_ttl_ms: ttlMs,
      runtime: {
        participant_cli_sha256: participantCliSha,
        pilot_source_sha256:
          "2222222222222222222222222222222222222222222222222222222222222222",
        acceptance_source_sha256:
          "3333333333333333333333333333333333333333333333333333333333333333",
        adapter_core_sha256:
          "4444444444444444444444444444444444444444444444444444444444444444",
      },
    },
    source_artifacts: artifacts,
    authority: MUTATING_AUTHORITY,
  };

  let plan = stageRequest(request, true);
  const issueEvent = buildEvent({
    fulfillment_id: plan.fulfillment_id,
    expected_revision: plan.revision,
    from_state: "accepted_submission_bound",
    to_state: "ticket_issue_planned",
    occurred_at_utc: new Date(startedAtMs - 150000).toISOString(),
    evidence: {
      issue_preconditions_verified: true,
      ticket_ttl_ms: ttlMs,
    },
    nonce: `receive-run-issue-event-${suffix}`,
  });
  plan = advancePlan(plan, issueEvent, ADVANCE_CONFIRMATION).plan;

  const ticketFileSha = "5".repeat(64);
  const packageEvent = buildEvent({
    fulfillment_id: plan.fulfillment_id,
    expected_revision: plan.revision,
    from_state: "ticket_issue_planned",
    to_state: "ticket_package_planned",
    occurred_at_utc: new Date(startedAtMs - 120000).toISOString(),
    evidence: {
      ticket_id: ticketId,
      ticket_file_sha256: ticketFileSha,
      capability_token_sha256: sha256Text(token),
      ticket_expires_at_utc: new Date(expiresAtMs).toISOString(),
      raw_capability_token_in_evidence: false,
    },
    nonce: `receive-run-package-event-${suffix}`,
  });
  const packagePlan = advancePlan(plan, packageEvent, ADVANCE_CONFIRMATION).plan;
  assert(
    inspectPlan(packagePlan).state === "ticket_package_planned",
    "fixture package plan state mismatch",
  );

  const transferOperationId = `voidapwftransferop1_${sha256Text(`transfer-${suffix}`)}`;
  const ticketIssueOperationId = `voidapwfissueop1_${sha256Text(`issue-${suffix}`)}`;
  const operatorTicket = {
    marker: "VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_TICKET_V1",
    version: 1,
    operation_id: ticketIssueOperationId,
    ticket: {
      ticket_id: ticketId,
      capability_token: token,
      account,
      executor_node_id: request.execution_contract.executor_node_id,
      task_class: request.submission.task_class,
      dataset_id: datasetId,
      expected_input_hash: expectedInputHash,
      issued_at_ms: issuedAtMs,
      expires_at_ms: expiresAtMs,
      ttl_ms: ttlMs,
      max_uses: 1,
      fixed_award_wc: 3,
    },
    transport: {
      issue_url: "http://127.0.0.1:4100/wc/public-earning-pilot-v1/issue",
      success_http_status: 201,
    },
    issue_request_body_sha256: "6".repeat(64),
    raw_issue_response_sha256: "7".repeat(64),
  };

  const privatePackage = {
    marker: PRIVATE_PACKAGE_MARKER,
    version: 1,
    created_at_utc: new Date(startedAtMs - 90000).toISOString(),
    transfer_operation_id: transferOperationId,
    ticket_issue_operation_id: ticketIssueOperationId,
    fulfillment_id: packagePlan.fulfillment_id,
    package_plan_id: packagePlan.plan_id,
    destination: {
      tailscale_ip: "100.122.198.38",
      node_id: request.execution_contract.executor_node_id,
      transport_destination: "zoso-N153B:",
      identity_receipt_sha256: "8".repeat(64),
    },
    participant_cli: {
      file_name: "participant-cli-v1.sh",
      sha256:
        options.badParticipantHash === true
          ? "0".repeat(64)
          : participantCliSha,
      bytes_base64: participantCliBytes.toString("base64"),
    },
    operator_ticket: operatorTicket,
    requirements: {
      ticket_max_uses: 1,
      executor_receipt_required: true,
      raw_capability_token_private: true,
      work_execution_not_authorized_by_transfer: true,
    },
  };

  const privatePackagePath = path.join(
    root,
    `${suffix}-private-executor-ticket-package-v1.json`,
  );
  writeJson(privatePackagePath, privatePackage);
  const privatePackageSha = sha256File(privatePackagePath);

  const transferReceipt = {
    marker: TRANSFER_RECEIPT_MARKER,
    version: 1,
    created_at_utc: new Date(startedAtMs - 60000).toISOString(),
    operation_id: transferOperationId,
    ticket_issue_operation_id: ticketIssueOperationId,
    fulfillment_id: packagePlan.fulfillment_id,
    package_plan_id: packagePlan.plan_id,
    ticket: {
      ticket_id: ticketId,
      capability_token_sha256: sha256Text(token),
      account,
      executor_node_id: request.execution_contract.executor_node_id,
      expires_at_ms: expiresAtMs,
      max_uses: 1,
      fixed_award_wc: 3,
    },
    package: {
      private_package_sha256: privatePackageSha,
      participant_cli_sha256:
        options.badParticipantHash === true
          ? "0".repeat(64)
          : participantCliSha,
      raw_capability_token_present_in_private_package: true,
      raw_capability_token_present_in_receipt: false,
    },
    destination: {
      tailscale_ip: "100.122.198.38",
      node_id: request.execution_contract.executor_node_id,
      transport_destination_sha256: "9".repeat(64),
      identity_receipt_sha256: "8".repeat(64),
    },
    transport: {
      transport_id: "tailscale_file_cp_v1",
      command_argv_sha256: "a".repeat(64),
      expanded_argv_sha256: "b".repeat(64),
      exit_code: 0,
      raw_ack_sha256: "c".repeat(64),
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
  const transferReceiptPath = path.join(root, `${suffix}-transfer-receipt-v1.json`);
  writeJson(transferReceiptPath, transferReceipt);

  const executorReceiptEvent = buildEvent({
    fulfillment_id: packagePlan.fulfillment_id,
    expected_revision: packagePlan.revision,
    from_state: "ticket_package_planned",
    to_state: "executor_receipt_expected",
    occurred_at_utc: new Date(startedAtMs - 30000).toISOString(),
    evidence: {
      ticket_id: ticketId,
      ticket_package_sha256: privatePackageSha,
      executor_node_id: request.execution_contract.executor_node_id,
      transport: "tailscale_file_cp_v1",
      transfer_operation_id: transferOperationId,
      raw_capability_token_in_evidence: false,
      remote_work_execution_started: false,
    },
    nonce: `receive-run-executor-event-${suffix}`,
  });
  const packagePlanPath = path.join(root, `${suffix}-package-plan-v1.json`);
  const executorReceiptEventPath = path.join(root, `${suffix}-executor-event-v1.json`);
  writeJson(packagePlanPath, packagePlan);
  writeJson(executorReceiptEventPath, executorReceiptEvent);

  const executorProfile = {
    marker: EXECUTOR_PROFILE_MARKER,
    version: 1,
    created_at_utc: new Date(startedAtMs - 20000).toISOString(),
    tailscale_ip:
      options.badHostProfile === true
        ? "100.122.198.39"
        : "100.122.198.38",
    node_id: request.execution_contract.executor_node_id,
    http_base: "http://100.122.198.38:4101",
    identity_verified: true,
    coordinator_enabled: false,
    executor_enabled: true,
    verification_method: "proof_fixture_v1",
  };
  const executorProfilePath = path.join(root, `${suffix}-executor-profile-v1.json`);
  writeJson(executorProfilePath, executorProfile);

  const runProfile = {
    marker: PARTICIPANT_RUN_PROFILE_MARKER,
    version: 1,
    runner_id: "participant_cli_execute_local_v1",
    success_exit_code: 0,
    timeout_ms: 60000,
    command_argv: [
      "bash",
      "{participant_cli_path}",
      "--operator-ticket",
      "{operator_ticket_path}",
      "--participant-receipt",
      "{participant_receipt_path}",
      "--execution-dir",
      "{execution_dir}",
    ],
    expected_receipt_marker:
      "VOID_WC_PUBLIC_EARNING_PARTICIPANT_EXECUTION_RECEIPT_V1",
    receipt_bindings: {
      receipt_id: "/receipt_id",
      ticket_id: "/ticket/ticket_id",
      account: "/ticket/account",
      executor_node_id: "/ticket/executor_node_id",
      task_class: "/ticket/task_class",
      dataset_id: "/ticket/dataset_id",
      expected_input_hash: "/ticket/expected_input_hash",
      participant_cli_sha256: "/runtime/participant_cli_sha256",
      ticket_consumed_once: "/verification/ticket_consumed_once",
      token_artifact_deleted: "/verification/token_artifact_deleted",
      wc_before: "/wc/before",
      wc_after: "/wc/after",
      wc_delta: "/wc/delta",
    },
  };
  const runProfilePath = path.join(root, `${suffix}-participant-run-profile-v1.json`);
  writeJson(runProfilePath, runProfile);

  const participantReceipt = {
    marker: runProfile.expected_receipt_marker,
    version: 1,
    receipt_id: `voidwcr1_${sha256Text(`receipt-${suffix}`)}`,
    ticket: {
      ticket_id: ticketId,
      account,
      executor_node_id: request.execution_contract.executor_node_id,
      task_class: request.submission.task_class,
      dataset_id: datasetId,
      expected_input_hash: expectedInputHash,
    },
    runtime: {
      participant_cli_sha256: participantCliSha,
    },
    verification: {
      ticket_consumed_once: true,
      token_artifact_deleted: true,
    },
    wc: {
      before: 0,
      after: 3,
      delta: 3,
    },
  };

  return {
    input: {
      received_private_package_path: privatePackagePath,
      transfer_receipt_path: transferReceiptPath,
      package_plan_path: packagePlanPath,
      executor_receipt_event_path: executorReceiptEventPath,
      executor_profile_path: executorProfilePath,
      participant_run_profile_path: runProfilePath,
      started_at_utc: new Date(startedAtMs).toISOString(),
    },
    privatePackagePath,
    transferReceiptPath,
    packagePlan,
    participantReceipt,
    participantCliSha,
    token,
    ticketId,
    account,
    datasetId,
    expectedInputHash,
  };
}

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-executor-receive-run-proof-v1-"),
);
fs.chmodSync(root, 0o700);

try {
  const baseMs = Date.parse("2026-07-28T23:30:00Z");
  const primary = createFixture(root, "primary", baseMs);
  const primaryDir = path.join(root, "primary-operation");
  let runCalls = 0;

  const mockTransport = async ({ paths }) => {
    runCalls += 1;
    assert(fs.existsSync(paths.participantCliPath), "participant CLI was not materialized");
    assert(fs.existsSync(paths.operatorTicketPath), "operator ticket was not materialized");
    return {
      exit_code: 0,
      signal: null,
      stdout: "mock participant execution complete",
      stderr: "",
      receipt: primary.participantReceipt,
      expanded_argv_sha256: "d".repeat(64),
    };
  };
  const hostInspector = async () => ({ tailscale_ip: "100.122.198.38" });

  const first = await executeExecutorReceiveAndRun(
    primary.input,
    primaryDir,
    EXECUTE_CONFIRMATION,
    mockTransport,
    hostInspector,
  );
  assert(first.duplicate === false, "first executor run was duplicate");
  assert(first.participant_cli_invoked === true, "participant CLI was not invoked");
  assert(first.ticket_consumed === true, "ticket was not consumed");
  assert(first.token_artifacts_deleted === true, "token artifacts were not deleted");
  assert(runCalls === 1, "participant transport call count mismatch");

  const inspection = inspectExecutorReceiveAndRun(primaryDir);
  assert(inspection.phase === "complete", "executor run did not complete");
  assert(inspection.output_dir_mode_0700 === true, "executor run dir mode mismatch");
  assert(inspection.all_existing_json_files_mode_0600 === true, "executor run JSON mode mismatch");
  assert(inspection.participant_cli_mode_0700 === true, "participant CLI mode mismatch");
  assert(inspection.token_artifacts_deleted === true, "inspection token deletion mismatch");
  assert(!fs.existsSync(primary.privatePackagePath), "received private package was not deleted");
  assert(!fs.existsSync(path.join(primaryDir, "operator-ticket-v1.json")), "extracted operator ticket was not deleted");

  const receiptText = fs.readFileSync(
    path.join(primaryDir, "sanitized-executor-run-receipt-v1.json"),
    "utf8",
  );
  const returnText = fs.readFileSync(
    path.join(primaryDir, "participant-receipt-return-package-v1.json"),
    "utf8",
  );
  assert(!receiptText.includes(primary.token), "sanitized receipt contains raw token");
  assert(!returnText.includes(primary.token), "return package contains raw token");

  const executorPlan = JSON.parse(
    fs.readFileSync(
      path.join(primaryDir, "advanced-plan-executor-receipt-expected-v1.json"),
      "utf8",
    ),
  );
  const nextEvent = JSON.parse(
    fs.readFileSync(
      path.join(primaryDir, "adapter-finalization-planned-event-v1.json"),
      "utf8",
    ),
  );
  const nextPlan = advancePlan(executorPlan, nextEvent, ADVANCE_CONFIRMATION).plan;
  assert(
    inspectPlan(nextPlan).state === "adapter_finalization_planned",
    "generated next event is not orchestrator-compatible",
  );

  const duplicate = await executeExecutorReceiveAndRun(
    primary.input,
    primaryDir,
    EXECUTE_CONFIRMATION,
    mockTransport,
    hostInspector,
  );
  assert(duplicate.duplicate === true, "duplicate executor run was not idempotent");
  assert(runCalls === 1, "duplicate executor run called transport again");

  const ambiguous = createFixture(root, "ambiguous", baseMs + 10000);
  const ambiguousDir = path.join(root, "ambiguous-operation");
  let ambiguousCalls = 0;
  let ambiguousHeld = false;
  try {
    await executeExecutorReceiveAndRun(
      ambiguous.input,
      ambiguousDir,
      EXECUTE_CONFIRMATION,
      async () => {
        ambiguousCalls += 1;
        throw new Error("simulated participant interruption");
      },
      hostInspector,
    );
  } catch {
    ambiguousHeld = true;
  }
  assert(ambiguousHeld, "ambiguous participant attempt did not hold");
  assert(ambiguousCalls === 1, "ambiguous participant call count mismatch");

  let secondRunPrevented = false;
  try {
    await executeExecutorReceiveAndRun(
      ambiguous.input,
      ambiguousDir,
      EXECUTE_CONFIRMATION,
      async () => {
        ambiguousCalls += 1;
        return {
          exit_code: 0,
          signal: null,
          stdout: "should not execute",
          stderr: "",
          receipt: ambiguous.participantReceipt,
          expanded_argv_sha256: "e".repeat(64),
        };
      },
      hostInspector,
    );
  } catch {
    secondRunPrevented = true;
  }
  assert(secondRunPrevented, "ambiguous executor run allowed automatic rerun");
  assert(ambiguousCalls === 1, "ambiguous retry called participant transport");

  const ambiguousState = JSON.parse(
    fs.readFileSync(
      path.join(ambiguousDir, "executor-run-operation-state-v1.json"),
      "utf8",
    ),
  );
  const recoveredRaw = {
    marker: RAW_RESULT_MARKER,
    version: 1,
    created_at_utc: new Date(baseMs + 12000).toISOString(),
    operation_id: ambiguousState.operation_id,
    exit_code: 0,
    signal: null,
    stdout: "recovered participant execution",
    stderr: "",
    expanded_argv_sha256: "f".repeat(64),
    receipt: ambiguous.participantReceipt,
  };
  const recoveredRawPath = path.join(root, "recovered-raw-participant-result-v1.json");
  writeJson(recoveredRawPath, recoveredRaw);
  const recovered = recoverExecutorReceiveAndRun(
    {
      ...ambiguous.input,
      recovered_at_utc: new Date(baseMs + 13000).toISOString(),
      recovered_raw_result_path: recoveredRawPath,
    },
    ambiguousDir,
    RECOVER_CONFIRMATION,
  );
  assert(recovered.recovered === true, "participant recovery did not complete");
  assert(
    inspectExecutorReceiveAndRun(ambiguousDir).phase === "complete",
    "recovered executor run is not complete",
  );

  const expired = createFixture(root, "expired", baseMs + 20000, 60000);
  let expiredRejected = false;
  try {
    await executeExecutorReceiveAndRun(
      {
        ...expired.input,
        started_at_utc: new Date(baseMs + 90000).toISOString(),
      },
      path.join(root, "expired-operation"),
      EXECUTE_CONFIRMATION,
      mockTransport,
      hostInspector,
    );
  } catch {
    expiredRejected = true;
  }
  assert(expiredRejected, "expired ticket was accepted for execution");

  const hostMismatch = createFixture(root, "host-mismatch", baseMs + 30000);
  let hostMismatchRejected = false;
  try {
    await executeExecutorReceiveAndRun(
      hostMismatch.input,
      path.join(root, "host-mismatch-operation"),
      EXECUTE_CONFIRMATION,
      mockTransport,
      async () => ({ tailscale_ip: "100.122.198.99" }),
    );
  } catch {
    hostMismatchRejected = true;
  }
  assert(hostMismatchRejected, "executor host mismatch was accepted");

  const badHash = createFixture(
    root,
    "bad-hash",
    baseMs + 40000,
    3600000,
    { badParticipantHash: true },
  );
  let participantHashRejected = false;
  try {
    await executeExecutorReceiveAndRun(
      badHash.input,
      path.join(root, "bad-hash-operation"),
      EXECUTE_CONFIRMATION,
      mockTransport,
      hostInspector,
    );
  } catch {
    participantHashRejected = true;
  }
  assert(participantHashRejected, "participant CLI hash mismatch was accepted");

  const wrongConfirmationFixture = createFixture(
    root,
    "wrong-confirmation",
    baseMs + 50000,
  );
  let confirmationRejected = false;
  try {
    await executeExecutorReceiveAndRun(
      wrongConfirmationFixture.input,
      path.join(root, "wrong-confirmation-operation"),
      "wrong-confirmation",
      mockTransport,
      hostInspector,
    );
  } catch {
    confirmationRejected = true;
  }
  assert(confirmationRejected, "wrong execution confirmation was accepted");

  const schema = JSON.parse(
    fs.readFileSync(
      path.join(
        process.cwd(),
        "schemas/external-agent-paid-work-fulfillment-executor-receive-and-run-v1.schema.json",
      ),
      "utf8",
    ),
  );
  const example = JSON.parse(
    fs.readFileSync(
      path.join(
        process.cwd(),
        "examples/external-agent-paid-work-fulfillment-executor-receive-and-run-v1.example.json",
      ),
      "utf8",
    ),
  );
  assert(
    schema.$id ===
      "https://voidchain.io/schemas/external-agent-paid-work-fulfillment-executor-receive-and-run-v1.schema.json",
    "schema ID mismatch",
  );
  assert(
    example.executor_profile.marker === EXECUTOR_PROFILE_MARKER,
    "example executor profile marker mismatch",
  );

  process.stdout.write(
    JSON.stringify(
      {
        marker:
          "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_EXECUTOR_RECEIVE_AND_RUN_PROOF_V1",
        exact_green: true,
        participant_cli_executed_once: true,
        duplicate_execute_no_second_run: true,
        ambiguous_after_attempt_holds: ambiguousHeld,
        ambiguous_retry_no_second_run: secondRunPrevented,
        recovery_from_raw_result_verified: true,
        ticket_consumed_once: true,
        token_artifacts_deleted: true,
        expired_ticket_rejected: expiredRejected,
        executor_host_identity_verified: hostMismatchRejected,
        participant_cli_hash_mismatch_rejected: participantHashRejected,
        generated_next_event_orchestrator_compatible: true,
        raw_capability_token_printed: false,
        raw_capability_token_in_sanitized_receipt: false,
        return_package_contains_raw_token: false,
        private_output_dir_mode_0700: true,
        private_output_files_mode_verified: true,
        explicit_confirmation_required: confirmationRejected,
        participant_receipt_acceptance: false,
        local_wc_ledger_write: false,
        authority: RECEIVE_RUN_AUTHORITY,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
