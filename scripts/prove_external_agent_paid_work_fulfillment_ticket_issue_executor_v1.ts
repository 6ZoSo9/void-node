#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  MUTATING_AUTHORITY,
  REQUEST_MARKER,
  advancePlan,
  canonicalJson,
  inspectPlan,
  sha256File,
  stageRequest,
  ADVANCE_CONFIRMATION,
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
  EXECUTE_CONFIRMATION,
  ISSUE_AUTHORITY,
  ISSUE_REQUEST_MARKER,
  RECOVER_CONFIRMATION,
  TRANSPORT_PROFILE_MARKER,
  executeTicketIssueOperation,
  inspectTicketIssueOperation,
  recoverTicketIssueOperation,
} from "./external_agent_paid_work_fulfillment_ticket_issue_executor_v1.ts";

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

function tokenFor(ticketId) {
  return "wcep1." + ticketId + "." + "A".repeat(32);
}

function createFixture(root, suffix) {
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
    participant_cli_sha256:
      "1111111111111111111111111111111111111111111111111111111111111111",
    pilot_source_sha256:
      "2222222222222222222222222222222222222222222222222222222222222222",
    acceptance_source_sha256:
      "3333333333333333333333333333333333333333333333333333333333333333",
    adapter_core_sha256:
      "4444444444444444444444444444444444444444444444444444444444444444",
  };

  const account = `void-agent-ticket-issue-proof-${suffix}`;
  const request = {
    marker: REQUEST_MARKER,
    version: 1,
    created_at_utc: "2026-07-28T22:30:00Z",
    expires_at_utc: "2026-07-29T22:30:00Z",
    nonce: `ticket-issue-proof-plan-${suffix}`,
    submission: {
      submission_id: `agent-ticket-issue-proof-${suffix}`,
      submission_receipt_id:
        "voidawsi1_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      work_order_id:
        "voidawo1_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      credential_id:
        "voidapwc1_cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      agent_id: `void.agent.ticket.issue.proof.${suffix}`,
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
      ticket_ttl_ms: 3600000,
      runtime,
    },
    source_artifacts: artifacts,
    authority: MUTATING_AUTHORITY,
  };

  const sourcePlan = stageRequest(request, true);
  const sourcePlanPath = path.join(root, `${suffix}-source-plan-v1.json`);
  writeJson(sourcePlanPath, sourcePlan);

  const transitionPackage = prepareTransitionPackage(
    {
      plan: sourcePlan,
      coordinator_snapshot: {
        marker: COORDINATOR_SNAPSHOT_MARKER,
        version: 1,
        captured_at_utc: "2026-07-28T22:31:00Z",
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
      },
      wc_balance_snapshot: {
        marker: WC_BALANCE_SNAPSHOT_MARKER,
        version: 1,
        captured_at_utc: "2026-07-28T22:31:01Z",
        account,
        earned: 0,
        debited: 0,
        redeemed: 0,
        redeemable: 0,
      },
      runtime_snapshot: {
        marker: RUNTIME_SNAPSHOT_MARKER,
        version: 1,
        captured_at_utc: "2026-07-28T22:31:02Z",
        selection_policy: "content_addressed_exact_sha_only",
        runtime,
      },
      ticket_policy_snapshot: {
        marker: TICKET_POLICY_SNAPSHOT_MARKER,
        version: 1,
        captured_at_utc: "2026-07-28T22:31:03Z",
        requested_ticket_ttl_ms: 3600000,
        max_uses: 1,
        fixed_award_wc: 3,
        account_active_ticket_count: 0,
        global_active_ticket_count: 0,
        global_consumed_ticket_count: 7,
        global_ticket_cap: 10,
        per_account_ticket_cap: 1,
      },
      prepared_at_utc: "2026-07-28T22:32:00Z",
      nonce: `ticket-issue-proof-transition-${suffix}`,
    },
    PREPARE_CONFIRMATION,
  );

  const transitionPackageDir = path.join(root, `${suffix}-transition-package`);
  materializeTransitionPackage(transitionPackageDir, transitionPackage);

  const profile = {
    marker: TRANSPORT_PROFILE_MARKER,
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
  const profilePath = path.join(root, `${suffix}-transport-profile-v1.json`);
  writeJson(profilePath, profile);

  const requestBody = {
    account,
    executor_node_id: "befd84d4fe47341af81b1a8aef8bcb97",
    task_class: "datanet_fetch_verify",
    dataset_id: `ds_ticket_issue_proof_${suffix}`,
    expected_input_hash:
      "9999999999999999999999999999999999999999999999999999999999999999",
    ttl_ms: 3600000,
    max_uses: 1,
  };
  const issueRequest = {
    marker: ISSUE_REQUEST_MARKER,
    version: 1,
    created_at_utc: "2026-07-28T22:33:00Z",
    nonce: `ticket-issue-request-${suffix}`,
    request_body: requestBody,
    expected_request_body_sha256:
      crypto.createHash("sha256").update(canonicalJson(requestBody)).digest("hex"),
  };
  const issueRequestPath = path.join(root, `${suffix}-issue-request-v1.json`);
  writeJson(issueRequestPath, issueRequest);

  return {
    sourcePlan,
    sourcePlanPath,
    transitionPackageDir,
    profilePath,
    issueRequestPath,
    requestBody,
  };
}


const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-ticket-issue-executor-proof-v1-"),
);
fs.chmodSync(root, 0o700);

try {
  const fixture = createFixture(root, "primary");
  const operationDir = path.join(root, "primary-operation");
  const ticketId = "1234567890abcdef1234567890abcdef";
  const issuedAtMs = Date.parse("2026-07-28T22:34:00Z");
  const rawResponse = {
    ok: true,
    ticket: {
      ticket_id: ticketId,
      capability_token: tokenFor(ticketId),
      account: fixture.requestBody.account,
      executor_node_id: fixture.requestBody.executor_node_id,
      task_class: fixture.requestBody.task_class,
      dataset_id: fixture.requestBody.dataset_id,
      expected_input_hash: fixture.requestBody.expected_input_hash,
      issued_at_ms: issuedAtMs,
      expires_at_ms: issuedAtMs + 3600000,
      ttl_ms: 3600000,
      max_uses: 1,
      fixed_award_wc: 3,
    },
  };

  let transportCalls = 0;
  const mockTransport = async () => {
    transportCalls += 1;
    return { http_status: 201, body: rawResponse };
  };

  const result = await executeTicketIssueOperation(
    {
      source_plan_path: fixture.sourcePlanPath,
      transition_package_dir: fixture.transitionPackageDir,
      transport_profile_path: fixture.profilePath,
      issue_request_path: fixture.issueRequestPath,
      executed_at_utc: "2026-07-28T22:34:00Z",
    },
    operationDir,
    EXECUTE_CONFIRMATION,
    mockTransport,
  );
  assert(result.ticket_issued === true, "ticket was not issued");
  assert(result.duplicate === false, "first execute was duplicate");
  assert(transportCalls === 1, "transport call count mismatch");

  const inspection = inspectTicketIssueOperation(operationDir);
  assert(inspection.phase === "complete", "operation did not complete");
  assert(inspection.private_plan_advanced === true, "private plan was not advanced");
  assert(inspection.output_dir_mode_0700 === true, "operation directory mode mismatch");
  assert(inspection.all_existing_files_mode_0600 === true, "operation file mode mismatch");
  assert(inspection.raw_capability_token_in_sanitized_receipt === false, "raw token leaked");
  assert(inspection.ticket_transferred === false, "ticket transferred unexpectedly");
  assert(inspection.live_work_execution === false, "work executed unexpectedly");
  assert(inspection.wc_ledger_write === false, "WC write occurred unexpectedly");

  const duplicate = await executeTicketIssueOperation(
    {
      source_plan_path: fixture.sourcePlanPath,
      transition_package_dir: fixture.transitionPackageDir,
      transport_profile_path: fixture.profilePath,
      issue_request_path: fixture.issueRequestPath,
      executed_at_utc: "2026-07-28T22:35:00Z",
    },
    operationDir,
    EXECUTE_CONFIRMATION,
    mockTransport,
  );
  assert(duplicate.duplicate === true, "duplicate execute was not idempotent");
  assert(transportCalls === 1, "duplicate execute called transport again");

  const receiptText = fs.readFileSync(
    path.join(operationDir, "sanitized-ticket-issue-receipt-v1.json"),
    "utf8",
  );
  assert(!receiptText.includes(tokenFor(ticketId)), "sanitized receipt contains token");

  const advancedPlan = JSON.parse(
    fs.readFileSync(
      path.join(operationDir, "advanced-plan-ticket-issue-planned-v1.json"),
      "utf8",
    ),
  );
  const nextEvent = JSON.parse(
    fs.readFileSync(
      path.join(operationDir, "ticket-package-planned-event-v1.json"),
      "utf8",
    ),
  );
  const nextPlan = advancePlan(
    advancedPlan,
    nextEvent,
    ADVANCE_CONFIRMATION,
  ).plan;
  assert(inspectPlan(nextPlan).state === "ticket_package_planned", "next event incompatible");

  const ambiguousFixture = createFixture(root, "ambiguous");
  const ambiguousDir = path.join(root, "ambiguous-operation");
  let ambiguousCalls = 0;
  let ambiguousHeld = false;
  try {
    await executeTicketIssueOperation(
      {
        source_plan_path: ambiguousFixture.sourcePlanPath,
        transition_package_dir: ambiguousFixture.transitionPackageDir,
        transport_profile_path: ambiguousFixture.profilePath,
        issue_request_path: ambiguousFixture.issueRequestPath,
        executed_at_utc: "2026-07-28T22:40:00Z",
      },
      ambiguousDir,
      EXECUTE_CONFIRMATION,
      async () => {
        ambiguousCalls += 1;
        throw new Error("simulated interruption");
      },
    );
  } catch {
    ambiguousHeld = true;
  }
  assert(ambiguousHeld, "ambiguous attempt did not hold");
  assert(ambiguousCalls === 1, "ambiguous transport count mismatch");

  let retryPrevented = false;
  try {
    await executeTicketIssueOperation(
      {
        source_plan_path: ambiguousFixture.sourcePlanPath,
        transition_package_dir: ambiguousFixture.transitionPackageDir,
        transport_profile_path: ambiguousFixture.profilePath,
        issue_request_path: ambiguousFixture.issueRequestPath,
        executed_at_utc: "2026-07-28T22:41:00Z",
      },
      ambiguousDir,
      EXECUTE_CONFIRMATION,
      async () => {
        ambiguousCalls += 1;
        return { http_status: 201, body: rawResponse };
      },
    );
  } catch {
    retryPrevented = true;
  }
  assert(retryPrevented, "ambiguous retry was not prevented");
  assert(ambiguousCalls === 1, "ambiguous retry called transport");

  const ambiguousState = JSON.parse(
    fs.readFileSync(path.join(ambiguousDir, "operation-state-v1.json"), "utf8"),
  );
  const recoveryTicketId = "abcdefabcdefabcdefabcdefabcdefab";
  const recoveredRaw = {
    marker: "VOID_EXTERNAL_AGENT_PAID_WORK_RAW_TICKET_ISSUE_RESPONSE_V1",
    version: 1,
    operation_id: ambiguousState.operation_id,
    http_status: 201,
    response: {
      ok: true,
      ticket: {
        ticket_id: recoveryTicketId,
        capability_token: tokenFor(recoveryTicketId),
        account: ambiguousFixture.requestBody.account,
        executor_node_id: ambiguousFixture.requestBody.executor_node_id,
        task_class: ambiguousFixture.requestBody.task_class,
        dataset_id: ambiguousFixture.requestBody.dataset_id,
        expected_input_hash: ambiguousFixture.requestBody.expected_input_hash,
        issued_at_ms: Date.parse("2026-07-28T22:40:00Z"),
        expires_at_ms: Date.parse("2026-07-28T23:40:00Z"),
        ttl_ms: 3600000,
        max_uses: 1,
        fixed_award_wc: 3,
      },
    },
  };
  const recoveredRawPath = path.join(root, "recovered-raw-response-v1.json");
  writeJson(recoveredRawPath, recoveredRaw);

  const recovered = recoverTicketIssueOperation(
    {
      source_plan_path: ambiguousFixture.sourcePlanPath,
      transition_package_dir: ambiguousFixture.transitionPackageDir,
      transport_profile_path: ambiguousFixture.profilePath,
      issue_request_path: ambiguousFixture.issueRequestPath,
      recovered_raw_response_path: recoveredRawPath,
      recovered_at_utc: "2026-07-28T22:42:00Z",
    },
    ambiguousDir,
    RECOVER_CONFIRMATION,
  );
  assert(recovered.recovered === true, "recovery did not complete");
  assert(inspectTicketIssueOperation(ambiguousDir).phase === "complete", "recovered operation incomplete");

  let confirmationRejected = false;
  try {
    await executeTicketIssueOperation(
      {
        source_plan_path: fixture.sourcePlanPath,
        transition_package_dir: fixture.transitionPackageDir,
        transport_profile_path: fixture.profilePath,
        issue_request_path: fixture.issueRequestPath,
        executed_at_utc: "2026-07-28T22:43:00Z",
      },
      path.join(root, "wrong-confirmation-operation"),
      "wrong-confirmation",
      mockTransport,
    );
  } catch {
    confirmationRejected = true;
  }
  assert(confirmationRejected, "wrong confirmation was accepted");

  const schema = JSON.parse(
    fs.readFileSync(
      path.join(
        process.cwd(),
        "schemas/external-agent-paid-work-fulfillment-ticket-issue-executor-v1.schema.json",
      ),
      "utf8",
    ),
  );
  const example = JSON.parse(
    fs.readFileSync(
      path.join(
        process.cwd(),
        "examples/external-agent-paid-work-fulfillment-ticket-issue-executor-v1.example.json",
      ),
      "utf8",
    ),
  );
  assert(
    schema.$id ===
      "https://voidchain.io/schemas/external-agent-paid-work-fulfillment-ticket-issue-executor-v1.schema.json",
    "schema ID mismatch",
  );
  assert(example.transport_profile.marker === TRANSPORT_PROFILE_MARKER, "example marker mismatch");

  process.stdout.write(
    JSON.stringify(
      {
        marker:
          "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_TICKET_ISSUE_EXECUTOR_PROOF_V1",
        exact_green: true,
        ticket_issued_once: true,
        duplicate_execute_no_second_issue: true,
        ambiguous_after_attempt_holds: ambiguousHeld,
        ambiguous_retry_no_second_issue: retryPrevented,
        recovery_from_raw_response_verified: true,
        private_plan_advanced: true,
        generated_next_event_orchestrator_compatible: true,
        raw_capability_token_printed: false,
        raw_capability_token_in_sanitized_receipt: false,
        private_output_dir_mode_0700: true,
        private_output_files_mode_0600: true,
        explicit_confirmation_required: confirmationRejected,
        ticket_transferred: false,
        work_dispatched: false,
        live_work_execution: false,
        wc_ledger_write: false,
        authority: ISSUE_AUTHORITY,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
