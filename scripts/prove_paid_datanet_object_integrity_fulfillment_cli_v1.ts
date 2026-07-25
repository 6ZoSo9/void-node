import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

import {
  OBJECT_INTEGRITY_FULFILLMENT_DISPOSITION_V1,
  OBJECT_INTEGRITY_FULFILLMENT_HOLD_DISPOSITION_V1,
  OBJECT_INTEGRITY_FULFILLMENT_SCHEMA_V1,
  OBJECT_INTEGRITY_FULFILLMENT_TOKEN_V1,
  OBJECT_INTEGRITY_MANIFEST_SCHEMA_V1,
  VOID_PAID_DATANET_OBJECT_INTEGRITY_FULFILLMENT_CLI_V1,
  fulfillPaidDatanetObjectIntegrityV1,
  runObjectIntegrityFulfillmentCliV1,
  type JsonObject,
  type JsonValue,
  type ObjectIntegrityFulfillmentReadyV1,
} from "./paid_datanet_object_integrity_fulfillment_cli_v1.js";
import {
  createPaidDatanetQuotePacketV1,
} from "./paid_datanet_quote_packet_v1.js";
import {
  admitPaidDatanetOperatorWorkflowV1,
  createPaidDatanetOperatorWorkflowV1,
  fulfillPaidDatanetOperatorWorkflowV1,
  verifyPaidDatanetOperatorWorkflowV1,
} from "./paid_datanet_operator_workflow_cli_v1.js";
import {
  appendPaidDatanetAdmissionDecisionV1,
  createPaidDatanetAdmissionRequestV1,
} from "../src/paid_services/datanet_request_admission_v1.js";
import {
  verifyPaidDatanetFulfillmentReceiptsAgainstAdmissionsV1,
} from "../src/paid_services/datanet_fulfillment_receipt_v1.js";

let assertions = 0;
function equal<T>(actual: T, expected: T, message?: string): void {
  assert.equal(actual, expected, message);
  assertions += 1;
}
function deepEqual(actual: unknown, expected: unknown, message?: string): void {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
}
function matches(actual: string, expected: RegExp, message?: string): void {
  assert.match(actual, expected, message);
  assertions += 1;
}
function notEqual(actual: unknown, expected: unknown, message?: string): void {
  assert.notEqual(actual, expected, message);
  assertions += 1;
}

function canonicalJson(value: JsonValue): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key] as JsonValue)}`)
    .join(",")}}`;
}
function shaText(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}
function shaJson(value: JsonValue): string {
  return shaText(canonicalJson(value));
}
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const root = mkdtempSync(join(tmpdir(), "void-object-integrity-proof-"));
try {
  const firstPath = join(root, "alpha.bin");
  const secondPath = join(root, "beta.bin");
  const firstBytes = Buffer.from("alpha-payload\n", "utf8");
  const secondBytes = Buffer.from([0, 1, 2, 3, 4, 5, 250, 251]);
  writeFileSync(firstPath, firstBytes);
  writeFileSync(secondPath, secondBytes);

  const requestedAt = 1_800_000_000_000;
  const acceptedAt = requestedAt + 1_000;
  const paymentObservedAt = requestedAt + 2_000;
  const submittedAt = requestedAt + 3_000;
  const decidedAtMs = requestedAt + 4_000;
  const startedAtMs = requestedAt + 5_000;
  const completedAtMs = requestedAt + 6_000;
  const approvedAt = new Date(requestedAt + 500).toISOString();
  const decidedAt = new Date(decidedAtMs).toISOString();
  const startedAt = new Date(startedAtMs).toISOString();
  const completedAt = new Date(completedAtMs).toISOString();
  const totalBytes = firstBytes.length + secondBytes.length;

  const quoteRequest = {
    issuer_name: "VOID Operator",
    customer_name: "Object Integrity Customer",
    customer_reference: "customer-object-integrity-001",
    quote_request: {
      request_id: "request-object-integrity-001",
      requester_id: "customer-object-integrity-001",
      service_code: "datanet.object-integrity-check.v1" as const,
      object_count: 2,
      total_bytes: totalBytes,
      operator_cost_basis_cents: 100,
      requested_at_ms: requestedAt,
    },
  };
  const quotePacket = createPaidDatanetQuotePacketV1(quoteRequest);

  const bridgePacketSha = "1".repeat(64);
  const bridgeId = "2".repeat(64);
  const triagePacketSha = "3".repeat(64);
  const triageId = "4".repeat(64);
  const draftSha = "5".repeat(64);
  const approvedQuotePacket: JsonObject = {
    schema: "void-paid-datanet-public-pilot-approved-customer-quote-v1",
    quote_status: "APPROVED_AWAITING_CUSTOMER_PAYMENT",
    bridge_packet_sha256: bridgePacketSha,
    bridge_id: bridgeId,
    triage_packet_sha256: triagePacketSha,
    triage_id: triageId,
    draft_quote_input_sha256: draftSha,
    draft_quote_input: {
      quote_request: quoteRequest.quote_request as unknown as JsonObject,
    },
    quote_packet_sha256: quotePacket.packet_sha256,
    quote_packet: quotePacket as unknown as JsonObject,
    approver_display_name: "ZoSo",
    approved_at: approvedAt,
    confirmation_token_verified: true,
    quote_packet_verified: true,
    customer_payment_required: true,
    payment_collection_enabled: false,
    admission_authorized: false,
    execution_authorized: false,
    automatic_execution_enabled: false,
    wc_mutation_enabled: false,
    treasury_access_enabled: false,
  };
  const approvalId = shaJson({
    schema: "void-paid-datanet-public-pilot-quote-approval-v1",
    bridge_packet_sha256: bridgePacketSha,
    bridge_id: bridgeId,
    triage_packet_sha256: triagePacketSha,
    triage_id: triageId,
    draft_quote_input_sha256: draftSha,
    quote_packet_sha256: quotePacket.packet_sha256,
    approver_display_name: "ZoSo",
    approved_at: approvedAt,
    confirmation: "approvePaidDataNetPublicPilotQuoteV1",
  });
  const approvalPacket: JsonObject = {
    schema: "void-paid-datanet-public-pilot-quote-approval-v1",
    marker: "VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_APPROVAL_CLI_V1",
    approval_id: approvalId,
    disposition: "APPROVED_QUOTE_PACKET",
    bridge_packet_sha256: bridgePacketSha,
    bridge_id: bridgeId,
    triage_packet_sha256: triagePacketSha,
    triage_id: triageId,
    draft_quote_input_sha256: draftSha,
    quote_packet_sha256: quotePacket.packet_sha256,
    approver_display_name: "ZoSo",
    approved_at: approvedAt,
    confirmation_token_verified: true,
    quote_packet_verified: true,
    approved_quote_packet: approvedQuotePacket,
    customer_payment_required: true,
    admission_authorized: false,
    execution_authorized: false,
    automatic_execution_enabled: false,
    payment_collection_enabled: false,
    github_api_access_enabled: false,
    network_access_enabled: false,
    filesystem_write_enabled: false,
    wc_mutation_enabled: false,
    treasury_access_enabled: false,
  };

  const admissionRequest = createPaidDatanetAdmissionRequestV1({
    quote: quotePacket.quote,
    customer_acceptance: {
      requester_id: quotePacket.quote.request.requester_id,
      accepted_quote_id: quotePacket.quote.quote_id,
      accepted_total_cents: quotePacket.quote.pricing.quoted_total_cents,
      accepted_currency: quotePacket.quote.currency,
      accepted_at_ms: acceptedAt,
    },
    payment_evidence: {
      evidence_ref: "payment-object-integrity-001",
      evidence_sha256: "6".repeat(64),
      verifier_id: "payment-verifier-001",
      verification_status: "VERIFIED",
      amount_cents: quotePacket.quote.pricing.quoted_total_cents,
      currency: quotePacket.quote.currency,
      observed_at_ms: paymentObservedAt,
    },
    submitted_at_ms: submittedAt,
  });
  const admissionReceipts = appendPaidDatanetAdmissionDecisionV1([], {
    admission_request: admissionRequest,
    operator_id: "admission-operator-001",
    decision: "APPROVE",
    reason_code: "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
    decided_at_ms: decidedAtMs,
  });
  const admissionReceipt = admissionReceipts[0]!;
  const paymentPacketSha = "7".repeat(64);
  const paymentConfirmationId = "8".repeat(64);
  const admissionDecisionId = shaJson({
    schema: "void-paid-datanet-public-pilot-admission-decision-v1",
    payment_confirmation_packet_sha256: paymentPacketSha,
    payment_confirmation_id: paymentConfirmationId,
    admission_request_id: admissionRequest.admission_request_id,
    receipt_sha256: admissionReceipt.receipt_sha256,
    operator_id: "admission-operator-001",
    decision: "APPROVE",
    reason_code: "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
    decided_at: decidedAt,
    confirmation: "decidePaidDataNetPublicPilotAdmissionV1",
  });
  const admissionPacket: JsonObject = {
    schema: "void-paid-datanet-public-pilot-admission-decision-v1",
    marker: "VOID_PAID_DATANET_PUBLIC_PILOT_ADMISSION_DECISION_CLI_V1",
    admission_decision_id: admissionDecisionId,
    disposition: "ADMISSION_DECISION_RECEIPT",
    payment_confirmation_packet_sha256: paymentPacketSha,
    payment_confirmation_id: paymentConfirmationId,
    approval_id: approvalId,
    bridge_id: bridgeId,
    triage_id: triageId,
    quote_packet_sha256: quotePacket.packet_sha256,
    quote_id: quotePacket.quote.quote_id,
    service_code: quotePacket.quote.service_code,
    requester_id: quotePacket.quote.request.requester_id,
    quoted_total_cents: quotePacket.quote.pricing.quoted_total_cents,
    currency: quotePacket.quote.currency,
    admission_request_id: admissionRequest.admission_request_id,
    admission_request: admissionRequest as unknown as JsonObject,
    existing_receipt_chain_sha256: shaJson([]),
    prior_receipt_count: 0,
    operator_id: "admission-operator-001",
    decision: "APPROVE",
    reason_code: "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
    decided_at: decidedAt,
    decided_at_ms: decidedAtMs,
    admission_receipt: admissionReceipt as unknown as JsonObject,
    admission_receipt_chain: admissionReceipts as unknown as JsonValue[],
    receipt_sha256: admissionReceipt.receipt_sha256,
    receipt_sequence: admissionReceipt.sequence,
    previous_receipt_sha256: admissionReceipt.previous_receipt_sha256,
    status: "ADMITTED_AWAITING_SEPARATE_EXECUTION",
    actual_payment_confirmation_contract_consumed: true,
    payment_confirmation_integrity_verified: true,
    canonical_admission_request_created: true,
    canonical_admission_request_verified: true,
    existing_receipt_chain_verified: true,
    append_only_admission_receipt: true,
    duplicate_decision_rejected: true,
    explicit_operator_confirmation_required: true,
    operator_admission_decision_recorded: true,
    automatic_admission_enabled: false,
    admission_authorized: true,
    execution_authorized: false,
    automatic_execution_enabled: false,
    payment_collection_enabled: false,
    payment_movement_enabled: false,
    github_api_access_enabled: false,
    network_access_enabled: false,
    filesystem_write_enabled: false,
    wc_mutation_enabled: false,
    treasury_access_enabled: false,
  };

  const manifest: JsonObject = {
    schema: OBJECT_INTEGRITY_MANIFEST_SCHEMA_V1,
    admission_request_id: admissionRequest.admission_request_id,
    requester_id: quotePacket.quote.request.requester_id,
    service_code: "datanet.object-integrity-check.v1",
    objects: [
      {
        object_ref: "object-alpha-001",
        local_path: firstPath,
        expected_sha256: shaText(firstBytes),
        expected_byte_length: firstBytes.length,
      },
      {
        object_ref: "object-beta-001",
        local_path: secondPath,
        expected_sha256: shaText(secondBytes),
        expected_byte_length: secondBytes.length,
      },
    ],
  };

  const baseInput = {
    admission_decision_packet: admissionPacket,
    approval_packet: approvalPacket,
    existing_fulfillment_receipts: [] as JsonValue,
    object_manifest: manifest,
    fulfillment_operator_id: "fulfillment-operator-001",
    execution_started_at: startedAt,
    completed_at: completedAt,
    operator_attestation_sha256: "9".repeat(64),
    confirmation: OBJECT_INTEGRITY_FULFILLMENT_TOKEN_V1,
  };

  const ready = fulfillPaidDatanetObjectIntegrityV1(baseInput);
  equal(ready.schema, OBJECT_INTEGRITY_FULFILLMENT_SCHEMA_V1);
  equal(ready.marker, VOID_PAID_DATANET_OBJECT_INTEGRITY_FULFILLMENT_CLI_V1);
  equal(ready.disposition, OBJECT_INTEGRITY_FULFILLMENT_DISPOSITION_V1);
  const completed = ready as ObjectIntegrityFulfillmentReadyV1;
  equal(completed.status, "FULFILLED_DELIVERED");
  equal(completed.outcome, "COMPLETED");
  equal(completed.outcome_code, "DELIVERED_AS_QUOTED");
  equal(completed.object_count, 2);
  equal(completed.quoted_object_count, 2);
  equal(completed.quoted_total_bytes, totalBytes);
  equal(completed.total_observed_bytes, totalBytes);
  equal(completed.match_count, 2);
  equal(completed.mismatch_count, 0);
  equal(completed.source_unavailable_count, 0);
  equal(completed.fulfillment_receipt_appended, true);
  equal(completed.fulfillment_receipt_chain_verified, true);
  equal(completed.operator_workflow_fulfillment_input_compatible, true);
  equal(completed.operator_triggered_execution, true);
  equal(completed.admission_authorized, true);
  equal(completed.execution_authorized, true);
  equal(completed.execution_performed_by_cli, true);
  equal(completed.automatic_execution_enabled, false);
  equal(completed.network_access_enabled, false);
  equal(completed.filesystem_write_enabled, false);
  equal(completed.payment_collection_enabled, false);
  equal(completed.payment_movement_enabled, false);
  equal(completed.wc_mutation_enabled, false);
  equal(completed.treasury_access_enabled, false);
  equal(completed.fulfillment_receipt_chain.length, 1);
  equal(completed.evidence_artifacts.length, 2);
  matches(completed.fulfillment_id, /^[a-f0-9]{64}$/u);
  matches(completed.result_summary_sha256, /^[a-f0-9]{64}$/u);
  equal(
    verifyPaidDatanetFulfillmentReceiptsAgainstAdmissionsV1(
      completed.fulfillment_receipt_chain as unknown as never[],
      admissionReceipts,
    ),
    true,
  );

  const resultObjects = completed.result_summary["results"] as JsonValue[];
  equal(resultObjects.length, 2);
  for (const result of resultObjects as JsonObject[]) {
    equal(result["verdict"], "MATCH");
    equal(result["digest_match"], true);
    equal(result["byte_length_match"], true);
    equal(typeof result["path_sha256"], "string");
    equal(Object.hasOwn(result, "local_path"), false);
  }

  const quoteWorkflow = createPaidDatanetOperatorWorkflowV1(quoteRequest);
  const admittedWorkflow = admitPaidDatanetOperatorWorkflowV1({
    workflow: quoteWorkflow,
    accepted_at_ms: acceptedAt,
    payment_evidence_ref: "payment-object-integrity-001",
    payment_evidence_sha256: "6".repeat(64),
    payment_verifier_id: "payment-verifier-001",
    payment_observed_at_ms: paymentObservedAt,
    submitted_at_ms: submittedAt,
    operator_id: "admission-operator-001",
    decision: "APPROVE",
    reason_code: "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
    decided_at_ms: decidedAtMs,
  });
  equal(admittedWorkflow.admission_receipts[0]?.receipt_sha256, admissionReceipt.receipt_sha256);
  const fulfilledWorkflow = fulfillPaidDatanetOperatorWorkflowV1({
    workflow: admittedWorkflow,
    ...(completed.operator_workflow_fulfillment_input as unknown as {
      fulfillment_operator_id: string;
      execution_started_at_ms: number;
      completed_at_ms: number;
      outcome: "COMPLETED" | "FAILED";
      outcome_code: "DELIVERED_AS_QUOTED" | "SOURCE_UNAVAILABLE" | "INTEGRITY_MISMATCH" | "EXECUTION_ERROR" | "EVIDENCE_INCOMPLETE" | "CUSTOMER_CANCELLED_AFTER_ADMISSION";
      result_summary_sha256: string;
      operator_attestation_sha256: string;
      evidence_artifacts: never[];
    }),
  });
  equal(verifyPaidDatanetOperatorWorkflowV1(fulfilledWorkflow), true);
  equal(fulfilledWorkflow.stage, "FULFILLED_DELIVERED");
  equal(fulfilledWorkflow.fulfillment_receipts[0]?.receipt_sha256, completed.receipt_sha256);

  const mismatchManifest = clone(manifest);
  const mismatchObjects = mismatchManifest["objects"] as JsonObject[];
  mismatchObjects[1]!["expected_sha256"] = "a".repeat(64);
  const mismatch = fulfillPaidDatanetObjectIntegrityV1({
    ...baseInput,
    object_manifest: mismatchManifest,
  }) as ObjectIntegrityFulfillmentReadyV1;
  equal(mismatch.disposition, OBJECT_INTEGRITY_FULFILLMENT_DISPOSITION_V1);
  equal(mismatch.status, "FULFILLMENT_FAILED");
  equal(mismatch.outcome, "FAILED");
  equal(mismatch.outcome_code, "INTEGRITY_MISMATCH");
  equal(mismatch.match_count, 1);
  equal(mismatch.mismatch_count, 1);
  equal(mismatch.source_unavailable_count, 0);

  function expectHold(input: typeof baseInput, pattern: RegExp): void {
    const result = fulfillPaidDatanetObjectIntegrityV1(input);
    equal(result.disposition, OBJECT_INTEGRITY_FULFILLMENT_HOLD_DISPOSITION_V1);
    const errors = result["errors"] as string[];
    equal(Array.isArray(errors), true);
    matches(errors.join("\n"), pattern);
    equal(result["execution_authorized"], false);
    equal(result["execution_performed_by_cli"], false);
  }

  const mutations: Array<[string, (value: typeof baseInput) => void, RegExp]> = [
    ["bad token", (value) => { value.confirmation = "wrong"; }, /confirmation must equal/u],
    ["bad operator", (value) => { value.fulfillment_operator_id = "?"; }, /fulfillment_operator_id/u],
    ["bad attestation", (value) => { value.operator_attestation_sha256 = "bad"; }, /operator_attestation/u],
    ["bad start", (value) => { value.execution_started_at = "not-iso"; }, /execution_started_at/u],
    ["start before admission", (value) => { value.execution_started_at = new Date(decidedAtMs - 1).toISOString(); }, /precedes admission/u],
    ["complete before start", (value) => { value.completed_at = new Date(startedAtMs - 1).toISOString(); }, /precedes execution/u],
    ["bad admission schema", (value) => { value.admission_decision_packet["schema"] = "bad"; }, /schema mismatch/u],
    ["bad admission marker", (value) => { value.admission_decision_packet["marker"] = "bad"; }, /marker mismatch/u],
    ["bad admission disposition", (value) => { value.admission_decision_packet["disposition"] = "bad"; }, /disposition mismatch/u],
    ["rejected admission", (value) => { value.admission_decision_packet["decision"] = "REJECT"; }, /requires an APPROVE/u],
    ["bad admission status", (value) => { value.admission_decision_packet["status"] = "REJECTED"; }, /not awaiting separate execution/u],
    ["bad admission id", (value) => { value.admission_decision_packet["admission_decision_id"] = "0".repeat(64); }, /integrity check failed/u],
    ["execution already authorized", (value) => { value.admission_decision_packet["execution_authorized"] = true; }, /must be false/u],
    ["bad approval schema", (value) => { value.approval_packet["schema"] = "bad"; }, /approval schema/u],
    ["bad approval marker", (value) => { value.approval_packet["marker"] = "bad"; }, /approval marker/u],
    ["bad approval disposition", (value) => { value.approval_packet["disposition"] = "bad"; }, /approval disposition/u],
    ["bad approval id", (value) => { value.approval_packet["approval_id"] = "0".repeat(64); }, /approval_id integrity/u],
    ["bad approval quote hash", (value) => { value.approval_packet["quote_packet_sha256"] = "0".repeat(64); }, /SHA binding|outer binding|integrity/u],
    ["bad manifest schema", (value) => { value.object_manifest["schema"] = "bad"; }, /manifest schema/u],
    ["bad manifest service", (value) => { value.object_manifest["service_code"] = "datanet.public-retrieval-evidence.v1"; }, /service_code/u],
    ["bad manifest admission", (value) => { value.object_manifest["admission_request_id"] = "0".repeat(64); }, /admission binding/u],
    ["bad manifest requester", (value) => { value.object_manifest["requester_id"] = "someone-else"; }, /admission binding/u],
    ["bad expected sha", (value) => { (value.object_manifest["objects"] as JsonObject[])[0]!["expected_sha256"] = "bad"; }, /expected_sha256/u],
    ["bad expected bytes", (value) => { (value.object_manifest["objects"] as JsonObject[])[0]!["expected_byte_length"] = -1; }, /expected_byte_length/u],
    ["wrong quote count", (value) => { (value.object_manifest["objects"] as JsonObject[]).pop(); }, /object count/u],
    ["duplicate refs", (value) => { const objects = value.object_manifest["objects"] as JsonObject[]; objects[1]!["object_ref"] = objects[0]!["object_ref"]!; }, /unique/u],
    ["tampered receipts", (value) => { value.existing_fulfillment_receipts = [{ receipt_sha256: "0".repeat(64) }]; }, /receipt chain verification/u],
  ];

  for (const [, mutate, pattern] of mutations) {
    const value = clone(baseInput);
    mutate(value);
    expectHold(value, pattern);
  }

  const directoryPath = join(root, "directory-input");
  mkdirSync(directoryPath);
  const directoryManifest = clone(manifest);
  (directoryManifest["objects"] as JsonObject[])[0]!["local_path"] = directoryPath;
  expectHold({ ...baseInput, object_manifest: directoryManifest }, /non-regular/u);

  const symlinkPath = join(root, "symlink-input");
  symlinkSync(firstPath, symlinkPath);
  const symlinkManifest = clone(manifest);
  (symlinkManifest["objects"] as JsonObject[])[0]!["local_path"] = symlinkPath;
  expectHold({ ...baseInput, object_manifest: symlinkManifest }, /symlink/u);

  const secretManifest = clone(manifest);
  secretManifest["note"] = ["-----BEGIN", "PRIVATE KEY-----"].join(" ");
  expectHold({ ...baseInput, object_manifest: secretManifest }, /secret-shaped/u);

  const cliMap = new Map<string, JsonValue>([
    ["admission.json", admissionPacket],
    ["approval.json", approvalPacket],
    ["receipts.json", []],
    ["manifest.json", manifest],
  ]);
  const cli = runObjectIntegrityFulfillmentCliV1(
    [
      "--admission-decision", "admission.json",
      "--approval", "approval.json",
      "--fulfillment-receipts", "receipts.json",
      "--manifest", "manifest.json",
      "--operator", "fulfillment-operator-001",
      "--started-at", startedAt,
      "--completed-at", completedAt,
      "--attestation-sha256", "9".repeat(64),
      "--confirm", OBJECT_INTEGRITY_FULFILLMENT_TOKEN_V1,
    ],
    (path) => cliMap.get(path)!,
  );
  equal(cli.exit_code, 0);
  const cliPayload = JSON.parse(cli.stdout) as JsonObject;
  equal(cliPayload["disposition"], OBJECT_INTEGRITY_FULFILLMENT_DISPOSITION_V1);
  equal(cliPayload["status"], "FULFILLED_DELIVERED");

  const cliHold = runObjectIntegrityFulfillmentCliV1([], () => ({}));
  equal(cliHold.exit_code, 2);
  equal(
    (JSON.parse(cliHold.stdout) as JsonObject)["disposition"],
    OBJECT_INTEGRITY_FULFILLMENT_HOLD_DISPOSITION_V1,
  );

  // Determinism over repeated immutable inputs.
  for (let index = 0; index < 32; index += 1) {
    const repeated = fulfillPaidDatanetObjectIntegrityV1(baseInput) as ObjectIntegrityFulfillmentReadyV1;
    equal(repeated.fulfillment_id, completed.fulfillment_id);
    equal(repeated.receipt_sha256, completed.receipt_sha256);
    equal(repeated.result_summary_sha256, completed.result_summary_sha256);
    deepEqual(repeated.result_summary, completed.result_summary);
  }

  equal(assertions >= 250, true);

  console.log(JSON.stringify({
    marker: VOID_PAID_DATANET_OBJECT_INTEGRITY_FULFILLMENT_CLI_V1,
    schema: OBJECT_INTEGRITY_FULFILLMENT_SCHEMA_V1,
    manifest_schema: OBJECT_INTEGRITY_MANIFEST_SCHEMA_V1,
    assertion_count: assertions,
    service_code: "datanet.object-integrity-check.v1",
    ready_disposition: OBJECT_INTEGRITY_FULFILLMENT_DISPOSITION_V1,
    hold_disposition: OBJECT_INTEGRITY_FULFILLMENT_HOLD_DISPOSITION_V1,
    confirmation_token: OBJECT_INTEGRITY_FULFILLMENT_TOKEN_V1,
    fulfillment_id: completed.fulfillment_id,
    receipt_sha256: completed.receipt_sha256,
    result_summary_sha256: completed.result_summary_sha256,
    object_count: completed.object_count,
    total_observed_bytes: completed.total_observed_bytes,
    actual_admission_decision_contract_consumed: true,
    approved_quote_packet_verified: true,
    admission_and_quote_binding_verified: true,
    quoted_scope_verified: true,
    local_regular_files_read: true,
    symlink_input_rejected: true,
    object_integrity_evidence_created: true,
    fulfillment_receipt_appended: true,
    fulfillment_receipt_chain_verified: true,
    operator_workflow_fulfillment_input_compatible: true,
    explicit_operator_confirmation_required: true,
    operator_triggered_execution: true,
    admission_authorized: true,
    execution_authorized: true,
    execution_performed_by_cli: true,
    automatic_execution_enabled: false,
    network_access_enabled: false,
    filesystem_write_enabled: false,
    payment_collection_enabled: false,
    payment_movement_enabled: false,
    wc_mutation_enabled: false,
    treasury_access_enabled: false,
    status: "GREEN",
  }, null, 2));
} finally {
  rmSync(root, { recursive: true, force: true });
}
