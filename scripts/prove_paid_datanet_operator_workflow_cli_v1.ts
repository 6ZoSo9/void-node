import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  PAID_DATANET_OPERATOR_WORKFLOW_CLI_V1_MARKER,
  PAID_DATANET_OPERATOR_WORKFLOW_CLI_V1_SCHEMA,
  PAID_DATANET_OPERATOR_WORKFLOW_V1_SCHEMA,
  admitPaidDatanetOperatorWorkflowV1,
  createPaidDatanetOperatorWorkflowV1,
  fulfillPaidDatanetOperatorWorkflowV1,
  parsePaidDatanetOperatorWorkflowCliArgsV1,
  runPaidDatanetOperatorWorkflowCliV1,
  verifyPaidDatanetOperatorWorkflowV1,
  type PaidDatanetOperatorWorkflowCliIoV1,
  type PaidDatanetOperatorWorkflowV1,
} from "./paid_datanet_operator_workflow_cli_v1.js";

let assertions = 0;

function equal<T>(actual: T, expected: T, message?: string): void {
  assert.equal(actual, expected, message);
  assertions += 1;
}

function deepEqual(
  actual: unknown,
  expected: unknown,
  message?: string,
): void {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
}

function matches(
  actual: string,
  pattern: RegExp,
  message?: string,
): void {
  assert.match(actual, pattern, message);
  assertions += 1;
}

function notEqual(
  actual: unknown,
  expected: unknown,
  message?: string,
): void {
  assert.notEqual(actual, expected, message);
  assertions += 1;
}

function throws(
  fn: () => unknown,
  pattern: RegExp,
  message?: string,
): void {
  assert.throws(fn, pattern, message);
  assertions += 1;
}

interface Capture {
  readonly stdout: string[];
  readonly stderr: string[];
  readonly io: PaidDatanetOperatorWorkflowCliIoV1;
}

function capture(): Capture {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    stdout,
    stderr,
    io: {
      stdout: (value: string): void => {
        stdout.push(value);
      },
      stderr: (value: string): void => {
        stderr.push(value);
      },
    },
  };
}

function runCase(argv: readonly string[]): {
  readonly exitCode: number;
  readonly stdout: string[];
  readonly stderr: string[];
} {
  const target = capture();
  const exitCode = runPaidDatanetOperatorWorkflowCliV1(
    argv,
    target.io,
  );
  return {
    exitCode,
    stdout: target.stdout,
    stderr: target.stderr,
  };
}

function parseSingleJson(values: readonly string[]): unknown {
  equal(values.length, 1);
  return JSON.parse(values[0] ?? "") as unknown;
}

function cloneWorkflow(
  workflow: PaidDatanetOperatorWorkflowV1,
): PaidDatanetOperatorWorkflowV1 {
  return JSON.parse(
    JSON.stringify(workflow),
  ) as PaidDatanetOperatorWorkflowV1;
}

function expectCliError(
  argv: readonly string[],
  pattern: RegExp,
): void {
  const result = runCase(argv);
  equal(result.exitCode, 2);
  equal(result.stdout.length, 0);

  const payload = parseSingleJson(result.stderr) as {
    schema: string;
    marker: string;
    status: string;
    error: string;
    network_access_enabled: boolean;
    filesystem_write_enabled: boolean;
    payment_collection_enabled: boolean;
    execution_performed_by_cli: boolean;
    automatic_execution_enabled: boolean;
    wc_mutation_enabled: boolean;
    treasury_access_enabled: boolean;
  };

  equal(
    payload.schema,
    PAID_DATANET_OPERATOR_WORKFLOW_CLI_V1_SCHEMA,
  );
  equal(
    payload.marker,
    PAID_DATANET_OPERATOR_WORKFLOW_CLI_V1_MARKER,
  );
  equal(payload.status, "ERROR");
  matches(payload.error, pattern);
  equal(payload.network_access_enabled, false);
  equal(payload.filesystem_write_enabled, false);
  equal(payload.payment_collection_enabled, false);
  equal(payload.execution_performed_by_cli, false);
  equal(payload.automatic_execution_enabled, false);
  equal(payload.wc_mutation_enabled, false);
  equal(payload.treasury_access_enabled, false);
}

const requestedAt = 1_800_000_000_000;
const quoteRequest = {
  issuer_name: "VOID Operator",
  customer_name: "Example Customer",
  customer_reference: "customer-ref-001",
  quote_request: {
    request_id: "request-workflow-001",
    requester_id: "customer-workflow-001",
    service_code: "datanet.object-integrity-check.v1" as const,
    object_count: 2,
    total_bytes: 1_048_577,
    operator_cost_basis_cents: 200,
    requested_at_ms: requestedAt,
  },
};

const quoteWorkflow = createPaidDatanetOperatorWorkflowV1(
  quoteRequest,
);

equal(quoteWorkflow.schema, PAID_DATANET_OPERATOR_WORKFLOW_V1_SCHEMA);
equal(
  quoteWorkflow.marker,
  PAID_DATANET_OPERATOR_WORKFLOW_CLI_V1_MARKER,
);
matches(quoteWorkflow.workflow_sha256, /^[0-9a-f]{64}$/);
matches(quoteWorkflow.workflow_id, /^[0-9a-f]{64}$/);
equal(quoteWorkflow.workflow_sequence, 1);
equal(quoteWorkflow.previous_workflow_sha256, null);
equal(
  quoteWorkflow.stage,
  "QUOTED_AWAITING_PAYMENT_EVIDENCE",
);
equal(quoteWorkflow.created_at_ms, requestedAt);
equal(quoteWorkflow.updated_at_ms, requestedAt);
equal(quoteWorkflow.quote_packet.quote.request.object_count, 2);
equal(
  quoteWorkflow.quote_packet.quote.pricing.quoted_total_cents,
  304,
);
equal(quoteWorkflow.admission_request, null);
equal(quoteWorkflow.admission_receipts.length, 0);
equal(quoteWorkflow.fulfillment_receipts.length, 0);
equal(quoteWorkflow.controls.append_only_workflow, true);
equal(quoteWorkflow.controls.local_file_input_only, true);
equal(quoteWorkflow.controls.stdout_output_only, true);
equal(quoteWorkflow.controls.network_access_enabled, false);
equal(quoteWorkflow.controls.filesystem_write_enabled, false);
equal(quoteWorkflow.controls.payment_collection_enabled, false);
equal(quoteWorkflow.controls.execution_performed_by_cli, false);
equal(quoteWorkflow.controls.automatic_execution_enabled, false);
equal(quoteWorkflow.controls.wc_mutation_enabled, false);
equal(quoteWorkflow.controls.treasury_access_enabled, false);
equal(verifyPaidDatanetOperatorWorkflowV1(quoteWorkflow), true);
equal(Object.isFrozen(quoteWorkflow), true);
equal(Object.isFrozen(quoteWorkflow.controls), true);
equal(Object.isFrozen(quoteWorkflow.admission_receipts), true);
equal(Object.isFrozen(quoteWorkflow.fulfillment_receipts), true);

const repeatedQuote = createPaidDatanetOperatorWorkflowV1({
  ...quoteRequest,
  quote_request: { ...quoteRequest.quote_request },
});
deepEqual(repeatedQuote, quoteWorkflow);
equal(repeatedQuote.workflow_sha256, quoteWorkflow.workflow_sha256);

const approvalInput = {
  workflow: quoteWorkflow,
  accepted_at_ms: requestedAt + 1_000,
  payment_evidence_ref: "payment-evidence-001",
  payment_evidence_sha256: "1".repeat(64),
  payment_verifier_id: "payment-verifier-001",
  payment_observed_at_ms: requestedAt + 2_000,
  submitted_at_ms: requestedAt + 3_000,
  operator_id: "admission-operator-001",
  decision: "APPROVE" as const,
  reason_code:
    "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE" as const,
  decided_at_ms: requestedAt + 4_000,
};

const admittedWorkflow = admitPaidDatanetOperatorWorkflowV1(
  approvalInput,
);

equal(verifyPaidDatanetOperatorWorkflowV1(admittedWorkflow), true);
equal(admittedWorkflow.workflow_id, quoteWorkflow.workflow_id);
equal(admittedWorkflow.workflow_sequence, 2);
equal(
  admittedWorkflow.previous_workflow_sha256,
  quoteWorkflow.workflow_sha256,
);
equal(
  admittedWorkflow.stage,
  "ADMITTED_AWAITING_SEPARATE_EXECUTION",
);
equal(admittedWorkflow.created_at_ms, requestedAt);
equal(admittedWorkflow.updated_at_ms, requestedAt + 4_000);
notEqual(
  admittedWorkflow.workflow_sha256,
  quoteWorkflow.workflow_sha256,
);
equal(admittedWorkflow.admission_request !== null, true);
equal(admittedWorkflow.admission_receipts.length, 1);
equal(admittedWorkflow.fulfillment_receipts.length, 0);
equal(
  admittedWorkflow.admission_request?.quote.quote_id,
  quoteWorkflow.quote_packet.quote.quote_id,
);
equal(
  admittedWorkflow.admission_request?.payment_evidence.evidence_ref,
  "payment-evidence-001",
);
equal(
  admittedWorkflow.admission_receipts[0]?.decision,
  "APPROVE",
);
equal(
  admittedWorkflow.admission_receipts[0]?.status,
  "ADMITTED_AWAITING_SEPARATE_EXECUTION",
);
equal(
  admittedWorkflow.admission_receipts[0]?.controls.execution_authorized,
  false,
);

const repeatedAdmission = admitPaidDatanetOperatorWorkflowV1({
  ...approvalInput,
});
deepEqual(repeatedAdmission, admittedWorkflow);

throws(
  () =>
    admitPaidDatanetOperatorWorkflowV1({
      ...approvalInput,
      workflow: admittedWorkflow,
    }),
  /awaiting payment evidence/,
);

const evidence = [
  {
    evidence_ref: "evidence-z-001",
    evidence_sha256: "4".repeat(64),
    media_type: "application/json",
    byte_length: 100,
  },
  {
    evidence_ref: "evidence-a-001",
    evidence_sha256: "5".repeat(64),
    media_type: "text/plain",
    byte_length: 50,
  },
] as const;

const completionInput = {
  workflow: admittedWorkflow,
  fulfillment_operator_id: "fulfillment-operator-001",
  execution_started_at_ms: requestedAt + 5_000,
  completed_at_ms: requestedAt + 6_000,
  outcome: "COMPLETED" as const,
  outcome_code: "DELIVERED_AS_QUOTED" as const,
  result_summary_sha256: "2".repeat(64),
  operator_attestation_sha256: "3".repeat(64),
  evidence_artifacts: evidence,
};

const fulfilledWorkflow = fulfillPaidDatanetOperatorWorkflowV1(
  completionInput,
);

equal(verifyPaidDatanetOperatorWorkflowV1(fulfilledWorkflow), true);
equal(fulfilledWorkflow.workflow_id, quoteWorkflow.workflow_id);
equal(fulfilledWorkflow.workflow_sequence, 3);
equal(
  fulfilledWorkflow.previous_workflow_sha256,
  admittedWorkflow.workflow_sha256,
);
equal(fulfilledWorkflow.stage, "FULFILLED_DELIVERED");
equal(fulfilledWorkflow.updated_at_ms, requestedAt + 6_000);
equal(fulfilledWorkflow.fulfillment_receipts.length, 1);
equal(
  fulfilledWorkflow.fulfillment_receipts[0]?.outcome,
  "COMPLETED",
);
equal(
  fulfilledWorkflow.fulfillment_receipts[0]?.status,
  "FULFILLED_DELIVERED",
);
equal(
  fulfilledWorkflow.fulfillment_receipts[0]?.evidence_count,
  2,
);
equal(
  fulfilledWorkflow.fulfillment_receipts[0]?.total_evidence_bytes,
  150,
);
deepEqual(
  fulfilledWorkflow.fulfillment_receipts[0]?.evidence_artifacts.map(
    (entry) => entry.evidence_ref,
  ),
  ["evidence-a-001", "evidence-z-001"],
);
equal(
  fulfilledWorkflow.fulfillment_receipts[0]?.controls
    .execution_performed_by_module,
  false,
);

const repeatedFulfillment = fulfillPaidDatanetOperatorWorkflowV1({
  ...completionInput,
  evidence_artifacts: [...evidence].reverse(),
});
deepEqual(repeatedFulfillment, fulfilledWorkflow);

throws(
  () =>
    fulfillPaidDatanetOperatorWorkflowV1({
      ...completionInput,
      workflow: fulfilledWorkflow,
    }),
  /not awaiting separate execution/,
);

const rejectedWorkflow = admitPaidDatanetOperatorWorkflowV1({
  ...approvalInput,
  decision: "REJECT",
  reason_code: "CAPACITY_UNAVAILABLE",
});
equal(verifyPaidDatanetOperatorWorkflowV1(rejectedWorkflow), true);
equal(rejectedWorkflow.stage, "REJECTED");
equal(rejectedWorkflow.workflow_sequence, 2);
equal(rejectedWorkflow.admission_receipts[0]?.decision, "REJECT");
throws(
  () =>
    fulfillPaidDatanetOperatorWorkflowV1({
      ...completionInput,
      workflow: rejectedWorkflow,
    }),
  /not awaiting separate execution/,
);

const failedWorkflow = fulfillPaidDatanetOperatorWorkflowV1({
  ...completionInput,
  outcome: "FAILED",
  outcome_code: "SOURCE_UNAVAILABLE",
  evidence_artifacts: [],
});
equal(verifyPaidDatanetOperatorWorkflowV1(failedWorkflow), true);
equal(failedWorkflow.stage, "FULFILLMENT_FAILED");
equal(
  failedWorkflow.fulfillment_receipts[0]?.outcome_code,
  "SOURCE_UNAVAILABLE",
);
equal(failedWorkflow.fulfillment_receipts[0]?.evidence_count, 0);

for (const [name, mutate] of [
  [
    "schema",
    (value: PaidDatanetOperatorWorkflowV1): void => {
      (value as unknown as { schema: string }).schema = "bad";
    },
  ],
  [
    "marker",
    (value: PaidDatanetOperatorWorkflowV1): void => {
      (value as unknown as { marker: string }).marker = "bad";
    },
  ],
  [
    "workflow hash",
    (value: PaidDatanetOperatorWorkflowV1): void => {
      (value as unknown as { workflow_sha256: string }).workflow_sha256 =
        "0".repeat(64);
    },
  ],
  [
    "workflow id",
    (value: PaidDatanetOperatorWorkflowV1): void => {
      (value as unknown as { workflow_id: string }).workflow_id =
        "0".repeat(64);
    },
  ],
  [
    "sequence",
    (value: PaidDatanetOperatorWorkflowV1): void => {
      (value as unknown as { workflow_sequence: number }).workflow_sequence =
        4;
    },
  ],
  [
    "stage",
    (value: PaidDatanetOperatorWorkflowV1): void => {
      (value as unknown as { stage: string }).stage = "REJECTED";
    },
  ],
  [
    "control",
    (value: PaidDatanetOperatorWorkflowV1): void => {
      (
        value.controls as unknown as {
          payment_collection_enabled: boolean;
        }
      ).payment_collection_enabled = true;
    },
  ],
  [
    "quote",
    (value: PaidDatanetOperatorWorkflowV1): void => {
      (
        value.quote_packet.quote.pricing as unknown as {
          quoted_total_cents: number;
        }
      ).quoted_total_cents += 1;
    },
  ],
  [
    "admission",
    (value: PaidDatanetOperatorWorkflowV1): void => {
      (
        value.admission_receipts[0] as unknown as {
          requester_id: string;
        }
      ).requester_id = "other-requester-001";
    },
  ],
  [
    "fulfillment",
    (value: PaidDatanetOperatorWorkflowV1): void => {
      (
        value.fulfillment_receipts[0] as unknown as {
          result_summary_sha256: string;
        }
      ).result_summary_sha256 = "9".repeat(64);
    },
  ],
] as const) {
  const tampered = cloneWorkflow(fulfilledWorkflow);
  mutate(tampered);
  equal(
    verifyPaidDatanetOperatorWorkflowV1(tampered),
    false,
    name,
  );
}

const parsedQuote = parsePaidDatanetOperatorWorkflowCliArgsV1([
  "quote",
  "--issuer-name",
  "VOID Operator",
  "--customer-name",
  "Example Customer",
  "--customer-reference",
  "customer-ref-001",
  "--request-id",
  "request-workflow-001",
  "--requester-id",
  "customer-workflow-001",
  "--service-code",
  "datanet.object-integrity-check.v1",
  "--object-count",
  "2",
  "--total-bytes",
  "1048577",
  "--operator-cost-basis-cents",
  "200",
  "--requested-at-ms",
  String(requestedAt),
  "--format",
  "pretty",
]);
equal(parsedQuote.kind, "quote");
if (parsedQuote.kind !== "quote") {
  throw new Error("expected quote command");
}
equal(parsedQuote.format, "pretty");
equal(parsedQuote.request.issuer_name, "VOID Operator");
equal(parsedQuote.request.quote_request.object_count, 2);

const help = runCase([]);
equal(help.exitCode, 0);
equal(help.stderr.length, 0);
equal(help.stdout.length, 1);
matches(help.stdout[0] ?? "", /Offline Paid DataNet operator workflow/);
matches(help.stdout[0] ?? "", /does not collect payment/);

const explicitHelp = runCase(["--help"]);
deepEqual(explicitHelp, help);

const tempRoot = mkdtempSync(
  join(tmpdir(), "void-paid-datanet-workflow-proof-"),
);

try {
  const quoteArgs = [
    "quote",
    "--issuer-name",
    "VOID Operator",
    "--customer-name",
    "Example Customer",
    "--customer-reference",
    "customer-ref-001",
    "--request-id",
    "request-workflow-001",
    "--requester-id",
    "customer-workflow-001",
    "--service-code",
    "datanet.object-integrity-check.v1",
    "--object-count",
    "2",
    "--total-bytes",
    "1048577",
    "--operator-cost-basis-cents",
    "200",
    "--requested-at-ms",
    String(requestedAt),
  ] as const;

  const quoteCli = runCase(quoteArgs);
  equal(quoteCli.exitCode, 0);
  equal(quoteCli.stderr.length, 0);
  const quoteCliWorkflow = parseSingleJson(
    quoteCli.stdout,
  ) as PaidDatanetOperatorWorkflowV1;
  deepEqual(quoteCliWorkflow, quoteWorkflow);

  const quotePath = join(tempRoot, "quote.json");
  writeFileSync(quotePath, JSON.stringify(quoteCliWorkflow), "utf8");

  const admitCli = runCase([
    "admit",
    "--input-json",
    quotePath,
    "--accepted-at-ms",
    String(requestedAt + 1_000),
    "--payment-evidence-ref",
    "payment-evidence-001",
    "--payment-evidence-sha256",
    "1".repeat(64),
    "--payment-verifier-id",
    "payment-verifier-001",
    "--payment-observed-at-ms",
    String(requestedAt + 2_000),
    "--submitted-at-ms",
    String(requestedAt + 3_000),
    "--operator-id",
    "admission-operator-001",
    "--decision",
    "APPROVE",
    "--reason-code",
    "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
    "--decided-at-ms",
    String(requestedAt + 4_000),
  ]);
  equal(admitCli.exitCode, 0);
  equal(admitCli.stderr.length, 0);
  const admitCliWorkflow = parseSingleJson(
    admitCli.stdout,
  ) as PaidDatanetOperatorWorkflowV1;
  deepEqual(admitCliWorkflow, admittedWorkflow);

  const admitPath = join(tempRoot, "admit.json");
  writeFileSync(admitPath, JSON.stringify(admitCliWorkflow), "utf8");

  const evidencePath = join(tempRoot, "evidence.json");
  writeFileSync(evidencePath, JSON.stringify(evidence), "utf8");

  const fulfillCli = runCase([
    "fulfill",
    "--input-json",
    admitPath,
    "--evidence-json",
    evidencePath,
    "--fulfillment-operator-id",
    "fulfillment-operator-001",
    "--execution-started-at-ms",
    String(requestedAt + 5_000),
    "--completed-at-ms",
    String(requestedAt + 6_000),
    "--outcome",
    "COMPLETED",
    "--outcome-code",
    "DELIVERED_AS_QUOTED",
    "--result-summary-sha256",
    "2".repeat(64),
    "--operator-attestation-sha256",
    "3".repeat(64),
    "--format",
    "pretty",
  ]);
  equal(fulfillCli.exitCode, 0);
  equal(fulfillCli.stderr.length, 0);
  equal(fulfillCli.stdout.length, 1);
  matches(fulfillCli.stdout[0] ?? "", /\n  "schema"/);
  const fulfillCliWorkflow = JSON.parse(
    fulfillCli.stdout[0] ?? "",
  ) as PaidDatanetOperatorWorkflowV1;
  deepEqual(fulfillCliWorkflow, fulfilledWorkflow);

  const fulfillPath = join(tempRoot, "fulfill.json");
  writeFileSync(
    fulfillPath,
    JSON.stringify(fulfillCliWorkflow),
    "utf8",
  );

  const verifyCli = runCase([
    "verify",
    "--input-json",
    fulfillPath,
  ]);
  equal(verifyCli.exitCode, 0);
  equal(verifyCli.stderr.length, 0);
  const verifyPayload = parseSingleJson(verifyCli.stdout) as {
    schema: string;
    marker: string;
    valid: boolean;
    workflow_id: string;
    workflow_sequence: number;
    stage: string;
    payment_collection_enabled: boolean;
    execution_performed_by_cli: boolean;
    status: string;
  };
  equal(
    verifyPayload.schema,
    PAID_DATANET_OPERATOR_WORKFLOW_CLI_V1_SCHEMA,
  );
  equal(
    verifyPayload.marker,
    PAID_DATANET_OPERATOR_WORKFLOW_CLI_V1_MARKER,
  );
  equal(verifyPayload.valid, true);
  equal(verifyPayload.workflow_id, fulfilledWorkflow.workflow_id);
  equal(verifyPayload.workflow_sequence, 3);
  equal(verifyPayload.stage, "FULFILLED_DELIVERED");
  equal(verifyPayload.payment_collection_enabled, false);
  equal(verifyPayload.execution_performed_by_cli, false);
  equal(verifyPayload.status, "GREEN");

  const tamperedPath = join(tempRoot, "tampered.json");
  const tampered = cloneWorkflow(fulfilledWorkflow);
  (
    tampered as unknown as { workflow_sha256: string }
  ).workflow_sha256 = "0".repeat(64);
  writeFileSync(tamperedPath, JSON.stringify(tampered), "utf8");

  const invalidVerify = runCase([
    "verify",
    "--input-json",
    tamperedPath,
  ]);
  equal(invalidVerify.exitCode, 2);
  equal(invalidVerify.stderr.length, 0);
  const invalidPayload = parseSingleJson(invalidVerify.stdout) as {
    valid: boolean;
    status: string;
  };
  equal(invalidPayload.valid, false);
  equal(invalidPayload.status, "INVALID");

  const nonArrayEvidencePath = join(tempRoot, "not-array.json");
  writeFileSync(nonArrayEvidencePath, JSON.stringify({}), "utf8");
  expectCliError(
    [
      "fulfill",
      "--input-json",
      admitPath,
      "--evidence-json",
      nonArrayEvidencePath,
      "--fulfillment-operator-id",
      "fulfillment-operator-001",
      "--execution-started-at-ms",
      String(requestedAt + 5_000),
      "--completed-at-ms",
      String(requestedAt + 6_000),
      "--outcome",
      "COMPLETED",
      "--outcome-code",
      "DELIVERED_AS_QUOTED",
      "--result-summary-sha256",
      "2".repeat(64),
      "--operator-attestation-sha256",
      "3".repeat(64),
    ],
    /evidence JSON must contain an array/,
  );

  expectCliError(
    ["verify", "--input-json", join(tempRoot, "missing.json")],
    /ENOENT/,
  );
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

expectCliError(["--help", "extra"], /cannot be combined/);
expectCliError(["unknown"], /unknown command/);
expectCliError(["quote", "--issuer-name"], /missing value/);
expectCliError(
  ["quote", "--unknown", "value"],
  /unknown option/,
);
expectCliError(
  [
    "quote",
    "--issuer-name",
    "VOID",
    "--issuer-name",
    "Again",
  ],
  /duplicate option/,
);
expectCliError(
  [
    "quote",
    "--issuer-name",
    "VOID Operator",
    "--customer-name",
    "Example Customer",
    "--customer-reference",
    "customer-ref-001",
  ],
  /missing required option: --request-id/,
);
expectCliError(
  [
    "quote",
    "--issuer-name",
    "VOID Operator",
    "--customer-name",
    "Example Customer",
    "--customer-reference",
    "customer-ref-001",
    "--request-id",
    "request-workflow-001",
    "--requester-id",
    "customer-workflow-001",
    "--service-code",
    "datanet.object-integrity-check.v1",
    "--object-count",
    "2.5",
    "--total-bytes",
    "1",
    "--operator-cost-basis-cents",
    "0",
    "--requested-at-ms",
    String(requestedAt),
  ],
  /unsigned base-10 integer/,
);
expectCliError(
  [
    "verify",
    "--input-json",
    "missing.json",
    "--format",
    "yaml",
  ],
  /compact or pretty/,
);
expectCliError(
  [
    "admit",
    "--input-json",
    "missing.json",
    "--accepted-at-ms",
    "1",
    "--payment-evidence-ref",
    "payment-evidence-001",
    "--payment-evidence-sha256",
    "1".repeat(64),
    "--payment-verifier-id",
    "payment-verifier-001",
    "--payment-observed-at-ms",
    "2",
    "--submitted-at-ms",
    "3",
    "--operator-id",
    "operator-001",
    "--decision",
    "MAYBE",
    "--reason-code",
    "POLICY_REJECTED",
    "--decided-at-ms",
    "4",
  ],
  /APPROVE or REJECT/,
);
expectCliError(
  [
    "admit",
    "--input-json",
    "missing.json",
    "--accepted-at-ms",
    "1",
    "--payment-evidence-ref",
    "payment-evidence-001",
    "--payment-evidence-sha256",
    "1".repeat(64),
    "--payment-verifier-id",
    "payment-verifier-001",
    "--payment-observed-at-ms",
    "2",
    "--submitted-at-ms",
    "3",
    "--operator-id",
    "operator-001",
    "--decision",
    "REJECT",
    "--reason-code",
    "UNKNOWN",
    "--decided-at-ms",
    "4",
  ],
  /reason-code is not supported/,
);
expectCliError(
  [
    "fulfill",
    "--input-json",
    "missing.json",
    "--evidence-json",
    "missing-evidence.json",
    "--fulfillment-operator-id",
    "operator-001",
    "--execution-started-at-ms",
    "1",
    "--completed-at-ms",
    "2",
    "--outcome",
    "UNKNOWN",
    "--outcome-code",
    "EXECUTION_ERROR",
    "--result-summary-sha256",
    "2".repeat(64),
    "--operator-attestation-sha256",
    "3".repeat(64),
  ],
  /COMPLETED or FAILED/,
);
expectCliError(
  [
    "fulfill",
    "--input-json",
    "missing.json",
    "--evidence-json",
    "missing-evidence.json",
    "--fulfillment-operator-id",
    "operator-001",
    "--execution-started-at-ms",
    "1",
    "--completed-at-ms",
    "2",
    "--outcome",
    "FAILED",
    "--outcome-code",
    "UNKNOWN",
    "--result-summary-sha256",
    "2".repeat(64),
    "--operator-attestation-sha256",
    "3".repeat(64),
  ],
  /outcome-code is not supported/,
);

throws(
  () =>
    admitPaidDatanetOperatorWorkflowV1({
      ...approvalInput,
      payment_evidence_sha256: "bad",
    }),
  /lowercase SHA-256/,
);
throws(
  () =>
    admitPaidDatanetOperatorWorkflowV1({
      ...approvalInput,
      decision: "APPROVE",
      reason_code: "POLICY_REJECTED",
    }),
  /APPROVE requires/,
);
throws(
  () =>
    fulfillPaidDatanetOperatorWorkflowV1({
      ...completionInput,
      completed_at_ms: requestedAt + 4_999,
    }),
  /completed_at_ms must be a safe integer/,
);
throws(
  () =>
    fulfillPaidDatanetOperatorWorkflowV1({
      ...completionInput,
      outcome: "COMPLETED",
      outcome_code: "EXECUTION_ERROR",
    }),
  /completed fulfillment semantics mismatch/,
);
throws(
  () =>
    fulfillPaidDatanetOperatorWorkflowV1({
      ...completionInput,
      evidence_artifacts: [evidence[0], evidence[0]],
    }),
  /evidence_ref values must be unique/,
);

assert.ok(assertions >= 260);
assertions += 1;

console.log(
  JSON.stringify(
    {
      marker: PAID_DATANET_OPERATOR_WORKFLOW_CLI_V1_MARKER,
      workflow_schema: PAID_DATANET_OPERATOR_WORKFLOW_V1_SCHEMA,
      cli_schema: PAID_DATANET_OPERATOR_WORKFLOW_CLI_V1_SCHEMA,
      assertion_count: assertions,
      quote_workflow_sha256: quoteWorkflow.workflow_sha256,
      admitted_workflow_sha256: admittedWorkflow.workflow_sha256,
      fulfilled_workflow_sha256: fulfilledWorkflow.workflow_sha256,
      workflow_sequence: fulfilledWorkflow.workflow_sequence,
      final_stage: fulfilledWorkflow.stage,
      append_only_workflow: true,
      quote_packet_bound: true,
      admission_chain_bound: true,
      fulfillment_chain_bound: true,
      local_file_input_only: true,
      stdout_output_only: true,
      network_access_enabled: false,
      filesystem_write_enabled: false,
      payment_collection_enabled: false,
      execution_performed_by_cli: false,
      automatic_execution_enabled: false,
      wc_mutation_enabled: false,
      treasury_access_enabled: false,
      status: "GREEN",
    },
    null,
    2,
  ),
);
