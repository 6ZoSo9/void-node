import assert from "node:assert/strict";

import {
  AGENT_PAID_WORK_WC_EARNING_ADAPTER_ACCEPTANCE_SOURCE_SHA256,
  AGENT_PAID_WORK_WC_EARNING_ADAPTER_EXECUTE_CONFIRMATION,
  AGENT_PAID_WORK_WC_EARNING_ADAPTER_PARTICIPANT_CLI_SHA256,
  AGENT_PAID_WORK_WC_EARNING_ADAPTER_PILOT_SOURCE_SHA256,
  AGENT_PAID_WORK_WC_EARNING_ADAPTER_SELECTED_CONTRACT_RECEIPT_SHA256,
  canonicalJson,
  deriveAgentPaidWorkWcEarningAdapterPlanV1,
  materializeAgentPaidWorkWcEarningAdapterReceiptV1,
  validateAgentPaidWorkWcEarningAdapterPlanV1,
  validateAgentPaidWorkWcEarningAdapterReceiptV1,
} from "../src/economic/agent_paid_work_wc_earning_adapter_v1.js";

const h = (character: string): string => character.repeat(64);

const credentialId = `voidapwc1_${h("a")}`;
const bindingId = `voidapwcb1_${h("b")}`;
const registryId = `voidapwcbr1_${h("c")}`;
const workOrderId = `voidawo1_${h("d")}`;
const submissionReceiptId = `voidawsi1_${h("e")}`;
const agentId = "void.agent.proof-v1";
const account = "void-agent-proof-v1";

const submissionReceipt = {
  marker: "VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_RECEIPT_V1",
  version: 1,
  receipt_id: submissionReceiptId,
  submission_id: "agent-paid-work-adapter-proof-v1",
  work_order_id: workOrderId,
  admission: {
    decision: "accepted_for_review",
  },
  authorization_verified: true,
  authentication: {
    mode: "credential_registry_v1",
    registry_id: `voidapwcr1_${h("f")}`,
    credential_id: credentialId,
    agent_id: agentId,
    scope: "agent-paid-work:submit-v1",
  },
  duplicate: false,
  authority: {
    provider_selected: false,
    quote_created: false,
    payment_authorized: false,
    work_execution_authorized: false,
    work_dispatched: false,
    wc_award_authorized: false,
    wc_ledger_write_authorized: false,
    mutation_authority_granted: false,
    wallet_or_signer_access_granted: false,
    buy_void_fulfillment_authority_granted: false,
  },
};

const workOrder = {
  marker: "VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1",
  version: 1,
  work_order_id: workOrderId,
  requester: {
    agent_id: agentId,
  },
  service: {
    capability_id: "datanet.fetch_verify",
  },
};

const bindingRegistry = {
  registry_id: registryId,
  marker: "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_REGISTRY_V1",
  version: 1,
  updated_at: "2026-07-28T12:30:00.000Z",
  bindings: [
    {
      marker: "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_V1",
      binding_id: bindingId,
      credential_id: credentialId,
      agent_id: agentId,
      destination_wc_account: account,
      status: "active",
      valid_from: "2026-07-28T12:00:00.000Z",
      valid_until: "2026-08-28T12:00:00.000Z",
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
        credential_registry_sha256: h("1"),
        review_decision_id: null,
        issuance_preparation_id: null,
      },
      created_at: "2026-07-28T12:00:00.000Z",
    },
  ],
};

const plan = deriveAgentPaidWorkWcEarningAdapterPlanV1({
  submission_receipt: submissionReceipt,
  work_order: workOrder,
  binding_registry: bindingRegistry,
  binding_registry_sha256: h("2"),
  selected_contract_capture_receipt_path:
    "/tmp/selected-adapter-contract-capture-receipt-v1.json",
  participant_cli_path: "/repo/ops/mainnet0/wc-public-earning-participant-v1.sh",
  pilot_source_path: "/repo/src/economic/wc_public_earning_pilot_v1.ts",
  acceptance_source_path:
    "/repo/src/economic/wc_verified_receipt_acceptance_v1.ts",
  ticket_path: "/tmp/private-ticket.json",
  private_output_dir: "/tmp/adapter-proof-output",
  coordinator_base_url: "https://coordinator.example",
  coordinator_node_id: "0123456789abcdef0123456789abcdef",
  created_at_utc: "2026-07-28T12:30:00.000Z",
  expires_at_utc: "2026-07-28T12:40:00.000Z",
  nonce: "adapter-proof-v1",
});

validateAgentPaidWorkWcEarningAdapterPlanV1(plan);
assert.match(plan.plan_id, /^voidapweap1_[0-9a-f]{64}$/);
assert.equal(plan.plan_id.length, 76);
assert.equal(plan.binding.binding_registry_id.length, 76);
assert.equal(
  plan.selected_contract_capture.receipt_sha256,
  AGENT_PAID_WORK_WC_EARNING_ADAPTER_SELECTED_CONTRACT_RECEIPT_SHA256,
);
assert.equal(
  plan.runtime.participant_cli_sha256,
  AGENT_PAID_WORK_WC_EARNING_ADAPTER_PARTICIPANT_CLI_SHA256,
);
assert.equal(
  plan.runtime.pilot_source_sha256,
  AGENT_PAID_WORK_WC_EARNING_ADAPTER_PILOT_SOURCE_SHA256,
);
assert.equal(
  plan.runtime.acceptance_source_sha256,
  AGENT_PAID_WORK_WC_EARNING_ADAPTER_ACCEPTANCE_SOURCE_SHA256,
);
assert.equal(
  plan.execution.confirmation,
  AGENT_PAID_WORK_WC_EARNING_ADAPTER_EXECUTE_CONFIRMATION,
);
assert.equal(plan.binding.destination_wc_account, account);
assert.equal(plan.runtime.fixed_award_wc, 3);
assert.equal(plan.authority.payment_transfer, false);
assert.equal(plan.authority.wc_to_void_settlement, false);
assert.equal(plan.authority.wallet_or_signer_access, false);

const deterministic = deriveAgentPaidWorkWcEarningAdapterPlanV1({
  submission_receipt: submissionReceipt,
  work_order: workOrder,
  binding_registry: bindingRegistry,
  binding_registry_sha256: h("2"),
  selected_contract_capture_receipt_path:
    "/tmp/selected-adapter-contract-capture-receipt-v1.json",
  participant_cli_path: "/repo/ops/mainnet0/wc-public-earning-participant-v1.sh",
  pilot_source_path: "/repo/src/economic/wc_public_earning_pilot_v1.ts",
  acceptance_source_path:
    "/repo/src/economic/wc_verified_receipt_acceptance_v1.ts",
  ticket_path: "/tmp/private-ticket.json",
  private_output_dir: "/tmp/adapter-proof-output",
  coordinator_base_url: "https://coordinator.example",
  coordinator_node_id: "0123456789abcdef0123456789abcdef",
  created_at_utc: "2026-07-28T12:30:00.000Z",
  expires_at_utc: "2026-07-28T12:40:00.000Z",
  nonce: "adapter-proof-v1",
});
assert.equal(deterministic.plan_id, plan.plan_id);

const participantReceipt = {
  marker: "VOID_WC_PUBLIC_EARNING_PARTICIPANT_CLI_V1",
  account,
  ticket_id: "ticket-proof-v1",
  job_id: "job-proof-v1",
  receipt_id: "receipt-proof-v1",
  token_sha256: h("3"),
  wc: {
    before: 0,
    after: 3,
    delta: 3,
    fixed_award_wc: 3,
  },
  remote_executor: true,
  signature_verified: true,
  remote_health_verified: true,
  remote_job_verified: true,
  remote_receipt_verified: true,
  capability_consumed: true,
  money_movement: false,
};

const receipt = materializeAgentPaidWorkWcEarningAdapterReceiptV1(
  plan,
  participantReceipt,
  {
    participant_receipt_path: "/tmp/participant-receipt.json",
    participant_receipt_sha256: h("4"),
    participant_stdout_sha256: h("5"),
    participant_stderr_sha256: h("6"),
    ticket_deleted: true,
    recovered_from_existing_participant_receipt: false,
  },
  "2026-07-28T12:35:00.000Z",
);
validateAgentPaidWorkWcEarningAdapterReceiptV1(receipt);
assert.match(receipt.adapter_receipt_id, /^voidapwear1_[0-9a-f]{64}$/);
assert.equal(receipt.adapter_receipt_id.length, 76);
assert.equal(receipt.wc.before, 0);
assert.equal(receipt.wc.after, 3);
assert.equal(receipt.wc.delta, 3);
assert.equal(receipt.wc.credited, true);
assert.equal(receipt.wc.duplicate, false);
assert.equal(receipt.authority.live_work_execution, true);
assert.equal(receipt.authority.wc_ledger_write, true);
assert.equal(receipt.authority.payment_transfer, false);
assert.equal(receipt.authority.wc_to_void_settlement, false);
assert.equal(receipt.raw_capability_token_printed, false);
assert.equal(canonicalJson(receipt).includes('"capability_token":'), false);

assert.throws(
  () =>
    materializeAgentPaidWorkWcEarningAdapterReceiptV1(
      plan,
      {
        ...participantReceipt,
        wc: {
          before: 0,
          after: 4,
          delta: 4,
          fixed_award_wc: 3,
        },
      },
      {
        participant_receipt_path: "/tmp/bad.json",
        participant_receipt_sha256: h("7"),
        participant_stdout_sha256: h("8"),
        participant_stderr_sha256: h("9"),
        ticket_deleted: true,
        recovered_from_existing_participant_receipt: false,
      },
      "2026-07-28T12:35:00.000Z",
    ),
  /delta must equal 3|after must equal before \+ 3/,
);

assert.throws(
  () =>
    deriveAgentPaidWorkWcEarningAdapterPlanV1({
      submission_receipt: {
        ...submissionReceipt,
        authority: {
          ...(submissionReceipt.authority as Record<string, boolean>),
          wc_ledger_write_authorized: true,
        },
      },
      work_order: workOrder,
      binding_registry: bindingRegistry,
      binding_registry_sha256: h("2"),
      selected_contract_capture_receipt_path: "/tmp/capture.json",
      participant_cli_path: "/repo/participant.sh",
      pilot_source_path: "/repo/pilot.ts",
      acceptance_source_path: "/repo/accept.ts",
      ticket_path: "/tmp/ticket.json",
      private_output_dir: "/tmp/output",
      coordinator_base_url: "https://coordinator.example",
      coordinator_node_id: "0123456789abcdef0123456789abcdef",
      created_at_utc: "2026-07-28T12:30:00.000Z",
      expires_at_utc: "2026-07-28T12:40:00.000Z",
      nonce: "bad-authority",
    }),
  /must be false/,
);

assert.throws(
  () =>
    deriveAgentPaidWorkWcEarningAdapterPlanV1({
      submission_receipt: submissionReceipt,
      work_order: {
        ...workOrder,
        service: {
          capability_id: "unapproved.capability",
        },
      },
      binding_registry: bindingRegistry,
      binding_registry_sha256: h("2"),
      selected_contract_capture_receipt_path: "/tmp/capture.json",
      participant_cli_path: "/repo/participant.sh",
      pilot_source_path: "/repo/pilot.ts",
      acceptance_source_path: "/repo/accept.ts",
      ticket_path: "/tmp/ticket.json",
      private_output_dir: "/tmp/output",
      coordinator_base_url: "https://coordinator.example",
      coordinator_node_id: "0123456789abcdef0123456789abcdef",
      created_at_utc: "2026-07-28T12:30:00.000Z",
      expires_at_utc: "2026-07-28T12:40:00.000Z",
      nonce: "bad-capability",
    }),
  /capability must be datanet\.fetch_verify/,
);

console.log(
  "VOID_AGENT_PAID_WORK_WC_EARNING_ADAPTER_V1_PROOF_BEGIN",
);
console.log("submission_receipt_binding_green=true");
console.log("credential_agent_binding_green=true");
console.log("destination_wc_account_green=true");
console.log("selected_contract_capture_sha_green=true");
console.log("selected_runtime_sha_green=true");
console.log("bounded_execution_confirmation_green=true");
console.log("fixed_award_three_wc_green=true");
console.log("deterministic_plan_id_green=true");
console.log("participant_receipt_binding_green=true");
console.log("canonical_wc_delta_green=true");
console.log("adapter_receipt_content_addressed_green=true");
console.log("submission_authority_escalation_rejected_green=true");
console.log("unapproved_capability_rejected_green=true");
console.log("raw_capability_token_printed=false");
console.log("payment_transfer=false");
console.log("wc_to_void_settlement=false");
console.log("wallet_or_signer_access=false");
console.log("service_restart=false");
console.log("deployment=false");
console.log(
  "VOID_AGENT_PAID_WORK_WC_EARNING_ADAPTER_V1_GREEN",
);
