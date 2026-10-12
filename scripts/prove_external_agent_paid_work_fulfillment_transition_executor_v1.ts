#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  ADVANCE_CONFIRMATION,
  MUTATING_AUTHORITY,
  REQUEST_MARKER,
  advancePlan,
  inspectPlan,
  sha256File,
  stageRequest,
} from "./external_agent_paid_work_fulfillment_orchestrator_v1.ts";

import {
  COORDINATOR_SNAPSHOT_MARKER,
  EXECUTOR_AUTHORITY,
  PREPARE_CONFIRMATION,
  RUNTIME_SNAPSHOT_MARKER,
  TICKET_POLICY_SNAPSHOT_MARKER,
  WC_BALANCE_SNAPSHOT_MARKER,
  inspectTransitionPackage,
  materializeTransitionPackage,
  prepareTransitionPackage,
} from "./external_agent_paid_work_fulfillment_transition_executor_v1.ts";

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-transition-executor-proof-v1-"),
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

  const request = {
    marker: REQUEST_MARKER,
    version: 1,
    created_at_utc: "2026-07-28T22:00:00Z",
    expires_at_utc: "2026-07-29T22:00:00Z",
    nonce: "transition-executor-proof-plan",
    submission: {
      submission_id: "agent-transition-proof-v1",
      submission_receipt_id:
        "voidawsi1_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      work_order_id:
        "voidawo1_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      credential_id:
        "voidapwc1_cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      agent_id: "void.agent.transition.proof.v1",
      capability_id: "datanet.fetch_verify",
      task_class: "datanet_fetch_verify",
    },
    binding: {
      binding_registry_id:
        "voidapwcbr1_dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      binding_id:
        "voidapwcb1_eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      destination_wc_account: "void-agent-transition-proof-v1",
      binding_registry_sha256:
        "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    },
    execution_contract: {
      coordinator_base: "http://100.122.245.125:4100",
      coordinator_node_id: "9d89483769e469e0473b489dc50dba96",
      executor_node_id: "befd84d4fe47341af81b1a8aef8bcb97",
      fixed_award_wc: 3,
      ticket_ttl_ms: 3600000,
      runtime,
    },
    source_artifacts: artifacts,
    authority: MUTATING_AUTHORITY,
  };

  const plan = stageRequest(request, true);
  const planInspection = inspectPlan(plan);

  assert(
    planInspection.state === "accepted_submission_bound",
    "proof plan state mismatch",
  );
  assert(
    planInspection.next_transition === "ticket_issue_planned",
    "proof next transition mismatch",
  );

  const coordinatorSnapshot = {
    marker: COORDINATOR_SNAPSHOT_MARKER,
    version: 1,
    captured_at_utc: "2026-07-28T22:01:00Z",
    node_id: "9d89483769e469e0473b489dc50dba96",
    coordinator_base: "http://100.122.245.125:4100",
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
    captured_at_utc: "2026-07-28T22:01:01Z",
    account: "void-agent-transition-proof-v1",
    earned: 0,
    debited: 0,
    redeemed: 0,
    redeemable: 0,
  };

  const runtimeSnapshot = {
    marker: RUNTIME_SNAPSHOT_MARKER,
    version: 1,
    captured_at_utc: "2026-07-28T22:01:02Z",
    selection_policy: "content_addressed_exact_sha_only",
    runtime,
  };

  const ticketPolicySnapshot = {
    marker: TICKET_POLICY_SNAPSHOT_MARKER,
    version: 1,
    captured_at_utc: "2026-07-28T22:01:03Z",
    requested_ticket_ttl_ms: 3600000,
    max_uses: 1,
    fixed_award_wc: 3,
    account_active_ticket_count: 0,
    global_active_ticket_count: 0,
    global_consumed_ticket_count: 7,
    global_ticket_cap: 10,
    per_account_ticket_cap: 1,
  };

  const prepareInput = {
    plan,
    coordinator_snapshot: coordinatorSnapshot,
    wc_balance_snapshot: balanceSnapshot,
    runtime_snapshot: runtimeSnapshot,
    ticket_policy_snapshot: ticketPolicySnapshot,
    prepared_at_utc: "2026-07-28T22:02:00Z",
    nonce: "transition-executor-proof-primary",
  };

  const prepared = prepareTransitionPackage(
    prepareInput,
    PREPARE_CONFIRMATION,
  );
  const outputDir = path.join(root, "transition-package-v1");
  const firstWrite = materializeTransitionPackage(
    outputDir,
    prepared,
  );

  assert(firstWrite.duplicate === false, "first materialization was duplicate");

  const inspection = inspectTransitionPackage(outputDir);

  assert(inspection.valid === true, "package inspection failed");
  assert(
    inspection.transition.from_state === "accepted_submission_bound" &&
      inspection.transition.to_state === "ticket_issue_planned",
    "transition mismatch",
  );
  assert(
    inspection.output_dir_mode_0700 === true,
    "output directory mode mismatch",
  );
  assert(
    inspection.output_files_mode_0600 === true,
    "output file mode mismatch",
  );
  assert(
    inspection.raw_capability_token_present === false,
    "capability token present",
  );
  assert(
    inspection.orchestrator_advanced === false,
    "orchestrator was advanced",
  );
  assert(inspection.ticket_issued === false, "ticket was issued");

  const beforeHashes = clone(inspection.file_sha256);
  const duplicateWrite = materializeTransitionPackage(
    outputDir,
    prepared,
  );
  assert(
    duplicateWrite.duplicate === true,
    "duplicate materialization was not idempotent",
  );
  assert(
    JSON.stringify(beforeHashes) ===
      JSON.stringify(
        inspectTransitionPackage(outputDir).file_sha256,
      ),
    "duplicate materialization changed file hashes",
  );

  const advanced = advancePlan(
    plan,
    prepared.event,
    ADVANCE_CONFIRMATION,
  );
  assert(
    inspectPlan(advanced.plan).state === "ticket_issue_planned",
    "generated event is not orchestrator-compatible",
  );

  let confirmationRejected = false;
  try {
    prepareTransitionPackage(
      prepareInput,
      "wrong-confirmation",
    );
  } catch {
    confirmationRejected = true;
  }
  assert(
    confirmationRejected,
    "wrong prepare confirmation was accepted",
  );

  let activeTicketRejected = false;
  try {
    prepareTransitionPackage(
      {
        ...prepareInput,
        coordinator_snapshot: {
          ...coordinatorSnapshot,
          caps: {
            ...coordinatorSnapshot.caps,
            active_issued: 1,
          },
        },
      },
      PREPARE_CONFIRMATION,
    );
  } catch {
    activeTicketRejected = true;
  }
  assert(
    activeTicketRejected,
    "active ticket precondition was not rejected",
  );

  let runtimeMismatchRejected = false;
  try {
    prepareTransitionPackage(
      {
        ...prepareInput,
        runtime_snapshot: {
          ...runtimeSnapshot,
          runtime: {
            ...runtime,
            participant_cli_sha256:
              "9999999999999999999999999999999999999999999999999999999999999999",
          },
        },
      },
      PREPARE_CONFIRMATION,
    );
  } catch {
    runtimeMismatchRejected = true;
  }
  assert(
    runtimeMismatchRejected,
    "runtime hash mismatch was not rejected",
  );

  let tokenRejected = false;
  try {
    const token =
      "wcep1." + "a".repeat(32) + "." + "A".repeat(32);

    prepareTransitionPackage(
      {
        ...prepareInput,
        ticket_policy_snapshot: {
          ...ticketPolicySnapshot,
          note: token,
        },
      },
      PREPARE_CONFIRMATION,
    );
  } catch {
    tokenRejected = true;
  }
  assert(tokenRejected, "raw capability token was not rejected");

  const schema = JSON.parse(
    fs.readFileSync(
      path.join(
        process.cwd(),
        "schemas/external-agent-paid-work-fulfillment-transition-executor-v1.schema.json",
      ),
      "utf8",
    ),
  );
  const example = JSON.parse(
    fs.readFileSync(
      path.join(
        process.cwd(),
        "examples/external-agent-paid-work-fulfillment-transition-executor-v1.example.json",
      ),
      "utf8",
    ),
  );

  assert(
    schema.$id ===
      "https://voidchain.io/schemas/external-agent-paid-work-fulfillment-transition-executor-v1.schema.json",
    "schema ID mismatch",
  );
  assert(
    example.coordinator_snapshot.marker ===
      COORDINATOR_SNAPSHOT_MARKER,
    "example coordinator marker mismatch",
  );

  process.stdout.write(
    JSON.stringify(
      {
        marker:
          "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_TRANSITION_EXECUTOR_PROOF_V1",
        exact_green: true,
        source_plan_state: planInspection.state,
        prepared_transition: inspection.transition,
        package_id: inspection.package_id,
        duplicate_intent_idempotency_verified: true,
        generated_event_orchestrator_compatible: true,
        active_ticket_precondition_rejected: activeTicketRejected,
        runtime_hash_mismatch_rejected: runtimeMismatchRejected,
        raw_capability_token_rejected: tokenRejected,
        explicit_confirmation_required: confirmationRejected,
        output_dir_mode_0700: true,
        output_files_mode_0600: true,
        orchestrator_advanced: false,
        ticket_issued: false,
        ticket_transferred: false,
        work_dispatched: false,
        live_work_execution: false,
        wc_ledger_write: false,
        authority: EXECUTOR_AUTHORITY,
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
