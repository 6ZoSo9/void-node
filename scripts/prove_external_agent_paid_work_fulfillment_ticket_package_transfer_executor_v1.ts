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
  canonicalJson,
  inspectPlan,
  sha256File,
  stageRequest,
} from "./external_agent_paid_work_fulfillment_orchestrator_v1.ts";

import {
  COORDINATOR_SNAPSHOT_MARKER,
  PREPARE_CONFIRMATION,
  RUNTIME_SNAPSHOT_MARKER,
  TICKET_POLICY_SNAPSHOT_MARKER,
  WC_BALANCE_SNAPSHOT_MARKER,
  materializeTransitionPackage,
  prepareTransitionPackage,
} from "./external_agent_paid_work_fulfillment_transition_executor_v1.ts";

import {
  EXECUTE_CONFIRMATION as ISSUE_CONFIRMATION,
  ISSUE_REQUEST_MARKER,
  TRANSPORT_PROFILE_MARKER as ISSUE_TRANSPORT_PROFILE_MARKER,
  executeTicketIssueOperation,
} from "./external_agent_paid_work_fulfillment_ticket_issue_executor_v1.ts";

import {
  DESTINATION_IDENTITY_RECEIPT_MARKER,
  DESTINATION_PROFILE_MARKER,
  EXECUTE_CONFIRMATION,
  RAW_ACK_MARKER,
  RECOVER_CONFIRMATION,
  TRANSFER_AUTHORITY,
  TRANSFER_PROFILE_MARKER,
  executeTicketPackageTransferOperation,
  inspectTicketPackageTransferOperation,
  recoverTicketPackageTransferOperation,
} from "./external_agent_paid_work_fulfillment_ticket_package_transfer_executor_v1.ts";

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function writeJson(file, value) {
  fs.writeFileSync(
    file,
    JSON.stringify(value, null, 2) + "\n",
    { mode: 0o600 },
  );
  fs.chmodSync(file, 0o600);
}

function tokenFor(ticketId) {
  return `wcep1.${ticketId}.${"A".repeat(32)}`;
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function createIssueOperation(root, suffix, issuedAtMs, ttlMs = 3600000) {
  const participantCliPath = path.join(root, `${suffix}-participant-cli.sh`);
  fs.writeFileSync(
    participantCliPath,
    "#!/usr/bin/env bash\necho participant-cli-proof\n",
    { mode: 0o700 },
  );
  fs.chmodSync(participantCliPath, 0o700);
  const participantCliSha = sha256File(participantCliPath);

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

  const runtime = {
    participant_cli_sha256: participantCliSha,
    pilot_source_sha256:
      "2222222222222222222222222222222222222222222222222222222222222222",
    acceptance_source_sha256:
      "3333333333333333333333333333333333333333333333333333333333333333",
    adapter_core_sha256:
      "4444444444444444444444444444444444444444444444444444444444444444",
  };
  const createdAtUtc = new Date(issuedAtMs - 120000).toISOString();
  const expiresAtUtc = new Date(issuedAtMs + 24 * 3600000).toISOString();
  const account = `void-agent-transfer-proof-${suffix}`;
  const datasetId = `ds_transfer_proof_${suffix}`;
  const expectedInputHash =
    "9999999999999999999999999999999999999999999999999999999999999999";

  const request = {
    marker: REQUEST_MARKER,
    version: 1,
    created_at_utc: createdAtUtc,
    expires_at_utc: expiresAtUtc,
    nonce: `transfer-proof-plan-${suffix}`,
    submission: {
      submission_id: `agent-transfer-proof-${suffix}`,
      submission_receipt_id:
        "voidawsi1_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      work_order_id:
        "voidawo1_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      credential_id:
        "voidapwc1_cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      agent_id: `void.agent.transfer.proof.${suffix}`,
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
      runtime,
    },
    source_artifacts: artifacts,
    authority: MUTATING_AUTHORITY,
  };

  const sourcePlan = stageRequest(request, true);
  const sourcePlanPath = path.join(root, `${suffix}-source-plan-v1.json`);
  writeJson(sourcePlanPath, sourcePlan);

  const coordinatorSnapshot = {
    marker: COORDINATOR_SNAPSHOT_MARKER,
    version: 1,
    captured_at_utc: new Date(issuedAtMs - 90000).toISOString(),
    node_id: "9d89483769e469e0473b489dc50dba96",
    coordinator_base: "http://127.0.0.1:4100",
    coordinator_enabled: true,
    executor_enabled: false,
    fixed_award_wc: 3,
    caps: {
      active_issued: 0,
      consumed: 7,
      global: 10,
      per_account: 1,
      account_total: 0,
    },
  };
  const balanceSnapshot = {
    marker: WC_BALANCE_SNAPSHOT_MARKER,
    version: 1,
    captured_at_utc: new Date(issuedAtMs - 89000).toISOString(),
    account,
    earned: 0,
    debited: 0,
    redeemed: 0,
    redeemable: 0,
  };
  const runtimeSnapshot = {
    marker: RUNTIME_SNAPSHOT_MARKER,
    version: 1,
    captured_at_utc: new Date(issuedAtMs - 88000).toISOString(),
    selection_policy: "content_addressed_exact_sha_only",
    runtime,
  };
  const ticketPolicySnapshot = {
    marker: TICKET_POLICY_SNAPSHOT_MARKER,
    version: 1,
    captured_at_utc: new Date(issuedAtMs - 87000).toISOString(),
    requested_ticket_ttl_ms: ttlMs,
    max_uses: 1,
    fixed_award_wc: 3,
    account_active_ticket_count: 0,
    global_active_ticket_count: 0,
    global_consumed_ticket_count: 7,
    global_ticket_cap: 10,
    per_account_ticket_cap: 1,
  };

  const transitionPackage = prepareTransitionPackage(
    {
      plan: sourcePlan,
      coordinator_snapshot: coordinatorSnapshot,
      wc_balance_snapshot: balanceSnapshot,
      runtime_snapshot: runtimeSnapshot,
      ticket_policy_snapshot: ticketPolicySnapshot,
      prepared_at_utc: new Date(issuedAtMs - 60000).toISOString(),
      nonce: `transfer-proof-transition-${suffix}`,
    },
    PREPARE_CONFIRMATION,
  );
  const transitionPackageDir = path.join(root, `${suffix}-transition-package`);
  materializeTransitionPackage(transitionPackageDir, transitionPackage);

  const issueProfile = {
    marker: ISSUE_TRANSPORT_PROFILE_MARKER,
    version: 1,
    issue_url: "http://127.0.0.1:4100/wc/public-earning-pilot-v1/issue",
    confirmation_query_name: "confirm",
    issue_confirmation: "wcPublicEarningPilotIssue",
    success_http_status: 201,
    request_bindings: {
      account: "/account",
      executor_node_id: "/executor_node_id",
      task_class: "/task_class",
      dataset_id: "/dataset_id",
      expected_input_hash: "/expected_input_hash",
      ttl_ms: "/ttl_ms",
      max_uses: "/max_uses",
    },
    response_bindings: {
      ticket_id: "/ticket/ticket_id",
      capability_token: "/ticket/capability_token",
      account: "/ticket/account",
      executor_node_id: "/ticket/executor_node_id",
      task_class: "/ticket/task_class",
      dataset_id: "/ticket/dataset_id",
      expected_input_hash: "/ticket/expected_input_hash",
      issued_at_ms: "/ticket/issued_at_ms",
      expires_at_ms: "/ticket/expires_at_ms",
      ttl_ms: "/ticket/ttl_ms",
      max_uses: "/ticket/max_uses",
      fixed_award_wc: "/ticket/fixed_award_wc",
    },
  };
  const issueProfilePath = path.join(root, `${suffix}-issue-profile-v1.json`);
  writeJson(issueProfilePath, issueProfile);

  const issueBody = {
    account,
    executor_node_id: "befd84d4fe47341af81b1a8aef8bcb97",
    task_class: "datanet_fetch_verify",
    dataset_id: datasetId,
    expected_input_hash: expectedInputHash,
    ttl_ms: ttlMs,
    max_uses: 1,
  };
  const issueRequest = {
    marker: ISSUE_REQUEST_MARKER,
    version: 1,
    created_at_utc: new Date(issuedAtMs - 30000).toISOString(),
    nonce: `transfer-proof-issue-${suffix}`,
    request_body: issueBody,
    expected_request_body_sha256: sha256Text(canonicalJson(issueBody)),
  };
  const issueRequestPath = path.join(root, `${suffix}-issue-request-v1.json`);
  writeJson(issueRequestPath, issueRequest);

  const ticketId = sha256Text(`ticket-${suffix}`).slice(0, 32);
  const response = {
    ok: true,
    ticket: {
      ticket_id: ticketId,
      capability_token: tokenFor(ticketId),
      account,
      executor_node_id: issueBody.executor_node_id,
      task_class: issueBody.task_class,
      dataset_id: datasetId,
      expected_input_hash: expectedInputHash,
      issued_at_ms: issuedAtMs,
      expires_at_ms: issuedAtMs + ttlMs,
      ttl_ms: ttlMs,
      max_uses: 1,
      fixed_award_wc: 3,
    },
  };
  const issueOperationDir = path.join(root, `${suffix}-issue-operation`);
  let issueCalls = 0;
  const issueResult = await executeTicketIssueOperation(
    {
      source_plan_path: sourcePlanPath,
      transition_package_dir: transitionPackageDir,
      transport_profile_path: issueProfilePath,
      issue_request_path: issueRequestPath,
      executed_at_utc: new Date(issuedAtMs).toISOString(),
    },
    issueOperationDir,
    ISSUE_CONFIRMATION,
    async () => {
      issueCalls += 1;
      return { http_status: 201, body: response };
    },
  );
  assert(issueResult.ticket_issued === true, "fixture ticket was not issued");
  assert(issueCalls === 1, "fixture issue transport count mismatch");

  const identityReceipt = {
    marker: DESTINATION_IDENTITY_RECEIPT_MARKER,
    version: 1,
    verified_at_utc: new Date(issuedAtMs + 1000).toISOString(),
    tailscale_ip: "100.122.198.38",
    node_id: "befd84d4fe47341af81b1a8aef8bcb97",
    verification_method: "mock-tailscale-and-node-status-v1",
    identity_verified: true,
  };
  const identityReceiptPath = path.join(root, `${suffix}-identity-receipt-v1.json`);
  writeJson(identityReceiptPath, identityReceipt);

  const destinationProfile = {
    marker: DESTINATION_PROFILE_MARKER,
    version: 1,
    created_at_utc: new Date(issuedAtMs + 2000).toISOString(),
    tailscale_ip: "100.122.198.38",
    node_id: "befd84d4fe47341af81b1a8aef8bcb97",
    transport_destination: "zoso-N153B:",
    identity_receipt_marker: DESTINATION_IDENTITY_RECEIPT_MARKER,
    identity_receipt_path: identityReceiptPath,
    identity_receipt_sha256: sha256File(identityReceiptPath),
  };
  const destinationProfilePath = path.join(root, `${suffix}-destination-profile-v1.json`);
  writeJson(destinationProfilePath, destinationProfile);

  const transferProfile = {
    marker: TRANSFER_PROFILE_MARKER,
    version: 1,
    transport_id: "tailscale_file_cp_v1",
    command_argv: [
      "sudo",
      "tailscale",
      "file",
      "cp",
      "{package_path}",
      "{destination}",
    ],
    success_exit_code: 0,
    timeout_ms: 120000,
  };
  const transferProfilePath = path.join(root, `${suffix}-transfer-profile-v1.json`);
  writeJson(transferProfilePath, transferProfile);

  return {
    participantCliPath,
    sourcePlanPath,
    transitionPackageDir,
    issueOperationDir,
    destinationProfilePath,
    transferProfilePath,
    transferProfile,
    destinationProfile,
    response,
    issuedAtMs,
    ttlMs,
  };
}

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-ticket-package-transfer-proof-v1-"),
);
fs.chmodSync(root, 0o700);

try {
  const baseMs = Date.now();
  const primary = await createIssueOperation(root, "primary", baseMs, 3600000);
  const operationDir = path.join(root, "primary-transfer-operation");
  let transferCalls = 0;

  const mockTransport = async ({ profileInfo, packagePath, destination }) => {
    transferCalls += 1;
    const expanded = profileInfo.commandArgv.map((value) =>
      value.replace("{package_path}", packagePath).replace("{destination}", destination),
    );
    return {
      exit_code: 0,
      signal: null,
      stdout: "mock transfer complete",
      stderr: "",
      expanded_argv_sha256: sha256Text(canonicalJson(expanded)),
    };
  };

  const first = await executeTicketPackageTransferOperation(
    {
      ticket_issue_operation_dir: primary.issueOperationDir,
      participant_cli_path: primary.participantCliPath,
      destination_profile_path: primary.destinationProfilePath,
      transfer_profile_path: primary.transferProfilePath,
      transferred_at_utc: new Date(baseMs + 5000).toISOString(),
    },
    operationDir,
    EXECUTE_CONFIRMATION,
    mockTransport,
  );
  assert(first.ticket_transferred === true, "ticket package was not transferred");
  assert(first.duplicate === false, "first transfer was marked duplicate");
  assert(transferCalls === 1, "first transfer call count mismatch");

  const inspection = inspectTicketPackageTransferOperation(operationDir);
  assert(inspection.phase === "complete", "transfer operation did not complete");
  assert(inspection.output_dir_mode_0700 === true, "transfer directory mode mismatch");
  assert(inspection.all_existing_files_mode_0600 === true, "transfer file mode mismatch");
  assert(inspection.raw_capability_token_in_sanitized_receipt === false, "raw token leaked to transfer receipt");
  assert(inspection.remote_work_execution === false, "remote work execution occurred");
  assert(inspection.wc_ledger_write === false, "WC write occurred");

  const privatePackageText = fs.readFileSync(
    path.join(operationDir, "private-executor-ticket-package-v1.json"),
    "utf8",
  );
  assert(
    privatePackageText.includes(primary.response.ticket.capability_token),
    "private package does not contain the required token",
  );
  const sanitizedReceiptText = fs.readFileSync(
    path.join(operationDir, "sanitized-ticket-package-transfer-receipt-v1.json"),
    "utf8",
  );
  assert(
    !sanitizedReceiptText.includes(primary.response.ticket.capability_token),
    "sanitized transfer receipt contains raw token",
  );

  const duplicate = await executeTicketPackageTransferOperation(
    {
      ticket_issue_operation_dir: primary.issueOperationDir,
      participant_cli_path: primary.participantCliPath,
      destination_profile_path: primary.destinationProfilePath,
      transfer_profile_path: primary.transferProfilePath,
      transferred_at_utc: new Date(baseMs + 6000).toISOString(),
    },
    operationDir,
    EXECUTE_CONFIRMATION,
    mockTransport,
  );
  assert(duplicate.duplicate === true, "duplicate transfer was not idempotent");
  assert(transferCalls === 1, "duplicate transfer called transport again");

  const packagePlan = JSON.parse(
    fs.readFileSync(
      path.join(operationDir, "advanced-plan-ticket-package-planned-v1.json"),
      "utf8",
    ),
  );
  const nextEvent = JSON.parse(
    fs.readFileSync(
      path.join(operationDir, "executor-receipt-expected-event-v1.json"),
      "utf8",
    ),
  );
  const advanced = advancePlan(packagePlan, nextEvent, ADVANCE_CONFIRMATION).plan;
  assert(
    inspectPlan(advanced).state === "executor_receipt_expected",
    "generated transfer event is not orchestrator-compatible",
  );

  const ambiguous = await createIssueOperation(root, "ambiguous", baseMs + 10000, 3600000);
  const ambiguousDir = path.join(root, "ambiguous-transfer-operation");
  let ambiguousCalls = 0;
  let ambiguousHeld = false;
  try {
    await executeTicketPackageTransferOperation(
      {
        ticket_issue_operation_dir: ambiguous.issueOperationDir,
        participant_cli_path: ambiguous.participantCliPath,
        destination_profile_path: ambiguous.destinationProfilePath,
        transfer_profile_path: ambiguous.transferProfilePath,
        transferred_at_utc: new Date(baseMs + 15000).toISOString(),
      },
      ambiguousDir,
      EXECUTE_CONFIRMATION,
      async () => {
        ambiguousCalls += 1;
        throw new Error("simulated interrupted transfer");
      },
    );
  } catch {
    ambiguousHeld = true;
  }
  assert(ambiguousHeld, "ambiguous transfer attempt did not hold");
  assert(ambiguousCalls === 1, "ambiguous transport count mismatch");

  let secondTransferPrevented = false;
  try {
    await executeTicketPackageTransferOperation(
      {
        ticket_issue_operation_dir: ambiguous.issueOperationDir,
        participant_cli_path: ambiguous.participantCliPath,
        destination_profile_path: ambiguous.destinationProfilePath,
        transfer_profile_path: ambiguous.transferProfilePath,
        transferred_at_utc: new Date(baseMs + 16000).toISOString(),
      },
      ambiguousDir,
      EXECUTE_CONFIRMATION,
      async () => {
        ambiguousCalls += 1;
        return {
          exit_code: 0,
          signal: null,
          stdout: "should not run",
          stderr: "",
          expanded_argv_sha256: "a".repeat(64),
        };
      },
    );
  } catch {
    secondTransferPrevented = true;
  }
  assert(secondTransferPrevented, "ambiguous operation allowed retransmission");
  assert(ambiguousCalls === 1, "ambiguous retry called transport");

  const ambiguousState = JSON.parse(
    fs.readFileSync(
      path.join(ambiguousDir, "transfer-operation-state-v1.json"),
      "utf8",
    ),
  );
  const recoveredAck = {
    marker: RAW_ACK_MARKER,
    version: 1,
    created_at_utc: new Date(baseMs + 17000).toISOString(),
    operation_id: ambiguousState.operation_id,
    transport_id: "tailscale_file_cp_v1",
    exit_code: 0,
    signal: null,
    stdout: "recovered transfer acknowledgment",
    stderr: "",
    expanded_argv_sha256: "b".repeat(64),
    package_sha256: ambiguousState.private_package_sha256,
    destination: "zoso-N153B:",
  };
  const recoveredAckPath = path.join(root, "recovered-transfer-ack-v1.json");
  writeJson(recoveredAckPath, recoveredAck);

  const recovered = recoverTicketPackageTransferOperation(
    {
      ticket_issue_operation_dir: ambiguous.issueOperationDir,
      participant_cli_path: ambiguous.participantCliPath,
      destination_profile_path: ambiguous.destinationProfilePath,
      transfer_profile_path: ambiguous.transferProfilePath,
      recovered_ack_path: recoveredAckPath,
      recovered_at_utc: new Date(baseMs + 18000).toISOString(),
    },
    ambiguousDir,
    RECOVER_CONFIRMATION,
  );
  assert(recovered.recovered === true, "transfer recovery did not complete");
  assert(
    inspectTicketPackageTransferOperation(ambiguousDir).phase === "complete",
    "recovered transfer operation is not complete",
  );

  let wrongConfirmationRejected = false;
  try {
    await executeTicketPackageTransferOperation(
      {
        ticket_issue_operation_dir: primary.issueOperationDir,
        participant_cli_path: primary.participantCliPath,
        destination_profile_path: primary.destinationProfilePath,
        transfer_profile_path: primary.transferProfilePath,
        transferred_at_utc: new Date(baseMs + 19000).toISOString(),
      },
      path.join(root, "wrong-confirmation-operation"),
      "wrong-confirmation",
      mockTransport,
    );
  } catch {
    wrongConfirmationRejected = true;
  }
  assert(wrongConfirmationRejected, "wrong transfer confirmation was accepted");

  const expired = await createIssueOperation(root, "expired", baseMs + 20000, 60000);
  let expiredRejected = false;
  try {
    await executeTicketPackageTransferOperation(
      {
        ticket_issue_operation_dir: expired.issueOperationDir,
        participant_cli_path: expired.participantCliPath,
        destination_profile_path: expired.destinationProfilePath,
        transfer_profile_path: expired.transferProfilePath,
        transferred_at_utc: new Date(baseMs + 90000).toISOString(),
      },
      path.join(root, "expired-transfer-operation"),
      EXECUTE_CONFIRMATION,
      mockTransport,
    );
  } catch {
    expiredRejected = true;
  }
  assert(expiredRejected, "expired ticket was accepted for transfer");

  const schema = JSON.parse(
    fs.readFileSync(
      path.join(
        process.cwd(),
        "schemas/external-agent-paid-work-fulfillment-ticket-package-transfer-executor-v1.schema.json",
      ),
      "utf8",
    ),
  );
  const example = JSON.parse(
    fs.readFileSync(
      path.join(
        process.cwd(),
        "examples/external-agent-paid-work-fulfillment-ticket-package-transfer-executor-v1.example.json",
      ),
      "utf8",
    ),
  );
  assert(
    schema.$id ===
      "https://voidchain.io/schemas/external-agent-paid-work-fulfillment-ticket-package-transfer-executor-v1.schema.json",
    "schema ID mismatch",
  );
  assert(
    example.destination_profile.marker === DESTINATION_PROFILE_MARKER,
    "example destination marker mismatch",
  );

  process.stdout.write(
    JSON.stringify(
      {
        marker:
          "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_TICKET_PACKAGE_TRANSFER_EXECUTOR_PROOF_V1",
        exact_green: true,
        ticket_package_transferred_once: true,
        duplicate_execute_no_second_transfer: true,
        ambiguous_after_attempt_holds: ambiguousHeld,
        ambiguous_retry_no_second_transfer: secondTransferPrevented,
        recovery_from_ack_verified: true,
        expired_ticket_rejected: expiredRejected,
        destination_identity_verified: true,
        participant_cli_hash_verified: true,
        private_package_contains_raw_token: true,
        raw_capability_token_printed: false,
        raw_capability_token_in_sanitized_receipt: false,
        private_output_dir_mode_0700: true,
        private_output_files_mode_0600: true,
        generated_next_event_orchestrator_compatible: true,
        explicit_confirmation_required: wrongConfirmationRejected,
        remote_work_execution: false,
        participant_receipt_acceptance: false,
        wc_ledger_write: false,
        authority: TRANSFER_AUTHORITY,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
