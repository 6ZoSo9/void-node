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
  writeJsonExclusive,
} from "./external_agent_paid_work_fulfillment_orchestrator_v1.ts";

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-paid-work-fulfillment-proof-v1-"),
);
fs.chmodSync(root, 0o700);

try {
  const artifacts = {};

  for (const [key, kind] of [
    ["accepted_submission_receipt", "accepted_submission_receipt_v1"],
    ["binding_registry", "credential_wc_account_binding_registry_v1"],
    ["selected_contract_receipt", "selected_adapter_contract_receipt_v1"],
    ["work_order", "agent_paid_work_order_v1"],
  ]) {
    const file = path.join(root, `${key}.json`);
    fs.writeFileSync(
      file,
      JSON.stringify({
        marker: `VOID_TEST_${key.toUpperCase()}`,
        version: 1,
      }) + "\n",
      { mode: 0o600 },
    );
    artifacts[key] = {
      path: file,
      sha256: sha256File(file),
      kind,
    };
  }

  const request = {
    marker: REQUEST_MARKER,
    version: 1,
    created_at_utc: "2026-07-28T21:00:00Z",
    expires_at_utc: "2026-07-29T21:00:00Z",
    nonce: "proof-v1-primary",
    submission: {
      submission_id: "agent-proof-submission-v1",
      submission_receipt_id:
        "voidawsi1_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      work_order_id:
        "voidawo1_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      credential_id:
        "voidapwc1_cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      agent_id: "void.agent.proof.v1",
      capability_id: "datanet.fetch_verify",
      task_class: "datanet_fetch_verify",
    },
    binding: {
      binding_registry_id:
        "voidapwcbr1_dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      binding_id:
        "voidapwcb1_eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      destination_wc_account: "void-agent-proof-v1",
      binding_registry_sha256:
        "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    },
    execution_contract: {
      coordinator_base: "http://100.122.245.125:4100",
      coordinator_node_id: "9d89483769e469e0473b489dc50dba96",
      executor_node_id: "befd84d4fe47341af81b1a8aef8bcb97",
      fixed_award_wc: 3,
      ticket_ttl_ms: 3600000,
      runtime: {
        participant_cli_sha256:
          "1111111111111111111111111111111111111111111111111111111111111111",
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
  let inspection = inspectPlan(plan);

  assert(inspection.valid === true, "initial plan must be valid");
  assert(
    inspection.state === "accepted_submission_bound",
    "initial state mismatch",
  );
  assert(
    inspection.next_transition === "ticket_issue_planned",
    "initial next transition mismatch",
  );

  const transitions = [
    {
      to_state: "ticket_issue_planned",
      evidence: {
        issue_preconditions_verified: true,
        ticket_ttl_ms: 3600000,
      },
    },
    {
      to_state: "ticket_package_planned",
      evidence: {
        ticket_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        ticket_file_sha256:
          "5555555555555555555555555555555555555555555555555555555555555555",
        capability_token_sha256:
          "6666666666666666666666666666666666666666666666666666666666666666",
        ticket_expires_at_utc: "2026-07-28T22:30:00Z",
        raw_capability_token_in_evidence: false,
      },
    },
    {
      to_state: "executor_receipt_expected",
      evidence: {
        ticket_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        ticket_package_sha256:
          "7777777777777777777777777777777777777777777777777777777777777777",
        executor_node_id: "befd84d4fe47341af81b1a8aef8bcb97",
        transport: "manual_verified_package_v1",
      },
    },
    {
      to_state: "adapter_finalization_planned",
      evidence: {
        participant_receipt_sha256:
          "8888888888888888888888888888888888888888888888888888888888888888",
        wc_before: 0,
        wc_after: 3,
        wc_delta: 3,
        ticket_consumed_once: true,
      },
    },
    {
      to_state: "completed",
      evidence: {
        adapter_receipt_id:
          "voidapwear1_9999999999999999999999999999999999999999999999999999999999999999",
        adapter_receipt_sha256:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        duplicate_finalization_verified: true,
        duplicate_second_wc_credit: false,
        token_artifacts_deleted: true,
      },
    },
  ];

  let duplicateVerified = false;

  for (let index = 0; index < transitions.length; index += 1) {
    inspection = inspectPlan(plan);
    const transition = transitions[index];
    const event = buildEvent({
      fulfillment_id: inspection.fulfillment_id,
      expected_revision: inspection.revision,
      from_state: inspection.state,
      to_state: transition.to_state,
      occurred_at_utc: `2026-07-28T21:0${index + 1}:00Z`,
      evidence: transition.evidence,
      nonce: `proof-transition-${index + 1}`,
    });

    const result = advancePlan(
      plan,
      event,
      ADVANCE_CONFIRMATION,
    );
    assert(result.duplicate === false, "new event was marked duplicate");
    plan = result.plan;

    if (index === 0) {
      const duplicate = advancePlan(
        plan,
        event,
        ADVANCE_CONFIRMATION,
      );
      assert(duplicate.duplicate === true, "duplicate event was not idempotent");
      assert(
        duplicate.plan.plan_id === plan.plan_id,
        "duplicate event changed plan_id",
      );
      duplicateVerified = true;
    }
  }

  const completed = inspectPlan(plan);
  assert(completed.completed === true, "plan did not complete");
  assert(completed.revision === 5, "completed revision mismatch");
  assert(completed.next_transition === null, "completed plan has a next transition");

  const planPath = path.join(root, "completed-plan-v1.json");
  writeJsonExclusive(planPath, plan);
  assert(
    (fs.statSync(planPath).mode & 0o777) === 0o600,
    "private plan mode is not 0600",
  );

  let heldPlan = stageRequest(
    {
      ...request,
      nonce: "proof-v1-held",
    },
    true,
  );
  let heldInspection = inspectPlan(heldPlan);
  const holdEvent = buildEvent({
    fulfillment_id: heldInspection.fulfillment_id,
    expected_revision: heldInspection.revision,
    from_state: heldInspection.state,
    to_state: "held",
    occurred_at_utc: "2026-07-28T21:10:00Z",
    evidence: {
      reason: "operator transport unavailable",
      resume_existing_state: true,
    },
    nonce: "proof-hold",
  });
  heldPlan = advancePlan(
    heldPlan,
    holdEvent,
    ADVANCE_CONFIRMATION,
  ).plan;
  heldInspection = inspectPlan(heldPlan);
  assert(heldInspection.state === "held", "held state mismatch");
  assert(
    heldInspection.next_transition === "accepted_submission_bound",
    "held resume target mismatch",
  );

  const resumeEvent = buildEvent({
    fulfillment_id: heldInspection.fulfillment_id,
    expected_revision: heldInspection.revision,
    from_state: "held",
    to_state: "accepted_submission_bound",
    occurred_at_utc: "2026-07-28T21:11:00Z",
    evidence: {
      resume_existing_state: true,
    },
    nonce: "proof-resume",
  });
  heldPlan = advancePlan(
    heldPlan,
    resumeEvent,
    ADVANCE_CONFIRMATION,
  ).plan;
  assert(
    inspectPlan(heldPlan).state === "accepted_submission_bound",
    "held plan did not resume",
  );

  let tokenRejected = false;
  try {
    const token =
      "wcep1." + "a".repeat(32) + "." + "A".repeat(32);
    stageRequest(
      {
        ...request,
        nonce: "proof-token-rejection",
        submission: {
          ...request.submission,
          agent_id: token,
        },
      },
      true,
    );
  } catch {
    tokenRejected = true;
  }
  assert(tokenRejected, "raw capability token was not rejected");

  let confirmationRejected = false;
  try {
    const staged = stageRequest(
      {
        ...request,
        nonce: "proof-confirmation",
      },
      true,
    );
    const stagedInspection = inspectPlan(staged);
    const event = buildEvent({
      fulfillment_id: stagedInspection.fulfillment_id,
      expected_revision: 0,
      from_state: "accepted_submission_bound",
      to_state: "ticket_issue_planned",
      occurred_at_utc: "2026-07-28T21:12:00Z",
      evidence: {
        issue_preconditions_verified: true,
        ticket_ttl_ms: 3600000,
      },
      nonce: "proof-confirmation-rejection",
    });
    advancePlan(staged, event, "wrong-confirmation");
  } catch {
    confirmationRejected = true;
  }
  assert(confirmationRejected, "wrong confirmation was accepted");

  const schema = JSON.parse(
    fs.readFileSync(
      path.join(
        process.cwd(),
        "schemas/external-agent-paid-work-fulfillment-orchestrator-v1.schema.json",
      ),
      "utf8",
    ),
  );
  const example = JSON.parse(
    fs.readFileSync(
      path.join(
        process.cwd(),
        "examples/external-agent-paid-work-fulfillment-orchestrator-v1.example.json",
      ),
      "utf8",
    ),
  );
  assert(
    schema.$id ===
      "https://voidchain.io/schemas/external-agent-paid-work-fulfillment-orchestrator-v1.schema.json",
    "schema id mismatch",
  );
  assert(example.marker === REQUEST_MARKER, "example marker mismatch");

  process.stdout.write(
    JSON.stringify(
      {
        marker:
          "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_ORCHESTRATOR_PROOF_V1",
        exact_green: true,
        completed_revision: completed.revision,
        completed_state: completed.state,
        fixed_award_wc: completed.fixed_award_wc,
        duplicate_event_idempotency_verified: duplicateVerified,
        duplicate_second_wc_credit_possible: false,
        held_resume_verified: true,
        raw_capability_token_rejected: tokenRejected,
        explicit_confirmation_required: confirmationRejected,
        plan_mode_0600: true,
        live_work_execution: false,
        wc_ledger_write: false,
        authority: MUTATING_AUTHORITY,
        completed_plan_sha256: crypto
          .createHash("sha256")
          .update(JSON.stringify(plan))
          .digest("hex"),
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  fs.rmSync(root, {
    recursive: true,
    force: true,
  });
}
