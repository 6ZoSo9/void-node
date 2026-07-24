import { createHash } from "node:crypto";
import {
  readFileSync,
  statSync,
} from "node:fs";
import { pathToFileURL } from "node:url";

import {
  createPaidDatanetQuotePacketV1,
  verifyPaidDatanetQuotePacketV1,
  type PaidDatanetQuotePacketRequestV1,
  type PaidDatanetQuotePacketV1,
} from "./paid_datanet_quote_packet_v1.js";

import {
  appendPaidDatanetAdmissionDecisionV1,
  createPaidDatanetAdmissionRequestV1,
  verifyPaidDatanetAdmissionReceiptChainV1,
  verifyPaidDatanetAdmissionRequestV1,
  type PaidDatanetAdmissionDecisionV1,
  type PaidDatanetAdmissionReasonCodeV1,
  type PaidDatanetAdmissionReceiptV1,
  type PaidDatanetAdmissionRequestV1,
} from "../src/paid_services/datanet_request_admission_v1.js";

import {
  appendPaidDatanetFulfillmentReceiptV1,
  verifyPaidDatanetFulfillmentReceiptsAgainstAdmissionsV1,
  type PaidDatanetFulfillmentEvidenceArtifactV1,
  type PaidDatanetFulfillmentOutcomeCodeV1,
  type PaidDatanetFulfillmentOutcomeV1,
  type PaidDatanetFulfillmentReceiptV1,
} from "../src/paid_services/datanet_fulfillment_receipt_v1.js";

export const PAID_DATANET_OPERATOR_WORKFLOW_CLI_V1_MARKER =
  "VOID_PAID_DATANET_OPERATOR_WORKFLOW_CLI_V1" as const;

export const PAID_DATANET_OPERATOR_WORKFLOW_V1_SCHEMA =
  "void-paid-datanet-operator-workflow-v1" as const;

export const PAID_DATANET_OPERATOR_WORKFLOW_CLI_V1_SCHEMA =
  "void-paid-datanet-operator-workflow-cli-v1" as const;

const MAX_INPUT_BYTES = 16 * 1024 * 1024;
const SHA256_HEX = /^[0-9a-f]{64}$/;

type OutputFormat = "compact" | "pretty";

export type PaidDatanetOperatorWorkflowStageV1 =
  | "QUOTED_AWAITING_PAYMENT_EVIDENCE"
  | "ADMITTED_AWAITING_SEPARATE_EXECUTION"
  | "REJECTED"
  | "FULFILLED_DELIVERED"
  | "FULFILLMENT_FAILED";

export interface PaidDatanetOperatorWorkflowV1 {
  readonly schema: typeof PAID_DATANET_OPERATOR_WORKFLOW_V1_SCHEMA;
  readonly marker: typeof PAID_DATANET_OPERATOR_WORKFLOW_CLI_V1_MARKER;
  readonly workflow_sha256: string;
  readonly workflow_id: string;
  readonly workflow_sequence: number;
  readonly previous_workflow_sha256: string | null;
  readonly stage: PaidDatanetOperatorWorkflowStageV1;
  readonly created_at_ms: number;
  readonly updated_at_ms: number;
  readonly quote_packet: PaidDatanetQuotePacketV1;
  readonly admission_request: PaidDatanetAdmissionRequestV1 | null;
  readonly admission_receipts: readonly PaidDatanetAdmissionReceiptV1[];
  readonly fulfillment_receipts: readonly PaidDatanetFulfillmentReceiptV1[];
  readonly controls: {
    readonly append_only_workflow: true;
    readonly local_file_input_only: true;
    readonly stdout_output_only: true;
    readonly network_access_enabled: false;
    readonly filesystem_write_enabled: false;
    readonly payment_collection_enabled: false;
    readonly execution_performed_by_cli: false;
    readonly automatic_execution_enabled: false;
    readonly wc_mutation_enabled: false;
    readonly treasury_access_enabled: false;
  };
}

export interface AdmitPaidDatanetOperatorWorkflowV1Input {
  readonly workflow: PaidDatanetOperatorWorkflowV1;
  readonly accepted_at_ms: number;
  readonly payment_evidence_ref: string;
  readonly payment_evidence_sha256: string;
  readonly payment_verifier_id: string;
  readonly payment_observed_at_ms: number;
  readonly submitted_at_ms: number;
  readonly operator_id: string;
  readonly decision: PaidDatanetAdmissionDecisionV1;
  readonly reason_code: PaidDatanetAdmissionReasonCodeV1;
  readonly decided_at_ms: number;
}

export interface FulfillPaidDatanetOperatorWorkflowV1Input {
  readonly workflow: PaidDatanetOperatorWorkflowV1;
  readonly fulfillment_operator_id: string;
  readonly execution_started_at_ms: number;
  readonly completed_at_ms: number;
  readonly outcome: PaidDatanetFulfillmentOutcomeV1;
  readonly outcome_code: PaidDatanetFulfillmentOutcomeCodeV1;
  readonly result_summary_sha256: string;
  readonly operator_attestation_sha256: string;
  readonly evidence_artifacts:
    readonly PaidDatanetFulfillmentEvidenceArtifactV1[];
}

export interface PaidDatanetOperatorWorkflowCliIoV1 {
  readonly stdout: (value: string) => void;
  readonly stderr: (value: string) => void;
}

type PaidDatanetOperatorWorkflowCliCommandV1 =
  | { readonly kind: "help" }
  | {
      readonly kind: "quote";
      readonly format: OutputFormat;
      readonly request: PaidDatanetQuotePacketRequestV1;
    }
  | {
      readonly kind: "admit";
      readonly format: OutputFormat;
      readonly input_json: string;
      readonly values: Omit<
        AdmitPaidDatanetOperatorWorkflowV1Input,
        "workflow"
      >;
    }
  | {
      readonly kind: "fulfill";
      readonly format: OutputFormat;
      readonly input_json: string;
      readonly evidence_json: string;
      readonly values: Omit<
        FulfillPaidDatanetOperatorWorkflowV1Input,
        "workflow" | "evidence_artifacts"
      >;
    }
  | {
      readonly kind: "verify";
      readonly format: OutputFormat;
      readonly input_json: string;
    };

const HELP_TEXT = `\
${PAID_DATANET_OPERATOR_WORKFLOW_CLI_V1_MARKER}

Offline Paid DataNet operator workflow.

Commands:
  quote    Create a deterministic quote workflow.
  admit    Bind verified payment evidence and an operator decision.
  fulfill  Append a completion or failure receipt with evidence bindings.
  verify   Verify one workflow JSON file.

The CLI reads local JSON files and writes JSON to stdout. Redirect stdout to a
new file to preserve append-only workflow history.

The CLI does not collect payment, contact a network, execute DataNet work,
write files, mutate Work Credits, or access wallets or treasury.
`;

const QUOTE_VALUE_FLAGS = new Set<string>([
  "--issuer-name",
  "--customer-name",
  "--customer-reference",
  "--request-id",
  "--requester-id",
  "--service-code",
  "--object-count",
  "--total-bytes",
  "--operator-cost-basis-cents",
  "--requested-at-ms",
  "--format",
]);

const ADMIT_VALUE_FLAGS = new Set<string>([
  "--input-json",
  "--accepted-at-ms",
  "--payment-evidence-ref",
  "--payment-evidence-sha256",
  "--payment-verifier-id",
  "--payment-observed-at-ms",
  "--submitted-at-ms",
  "--operator-id",
  "--decision",
  "--reason-code",
  "--decided-at-ms",
  "--format",
]);

const FULFILL_VALUE_FLAGS = new Set<string>([
  "--input-json",
  "--evidence-json",
  "--fulfillment-operator-id",
  "--execution-started-at-ms",
  "--completed-at-ms",
  "--outcome",
  "--outcome-code",
  "--result-summary-sha256",
  "--operator-attestation-sha256",
  "--format",
]);

const VERIFY_VALUE_FLAGS = new Set<string>([
  "--input-json",
  "--format",
]);

function defaultIo(): PaidDatanetOperatorWorkflowCliIoV1 {
  return {
    stdout: (value: string): void => {
      process.stdout.write(value.endsWith("\n") ? value : `${value}\n`);
    },
    stderr: (value: string): void => {
      process.stderr.write(value.endsWith("\n") ? value : `${value}\n`);
    },
  };
}

function canonicalJson(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error("canonical JSON does not support non-finite numbers");
    }
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalJson(record[key])}`,
      )
      .join(",")}}`;
  }

  throw new Error(`canonical JSON does not support ${typeof value}`);
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function serialize(value: unknown, format: OutputFormat): string {
  return format === "pretty"
    ? JSON.stringify(value, null, 2)
    : JSON.stringify(value);
}

function parseFormat(value: string | undefined): OutputFormat {
  if (value === undefined || value === "compact") {
    return "compact";
  }
  if (value === "pretty") {
    return "pretty";
  }
  throw new Error("--format must be compact or pretty");
}

function parseUnsignedInteger(name: string, value: string): number {
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error(`${name} must be an unsigned base-10 integer`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${name} must be a JavaScript safe integer`);
  }

  return parsed;
}

function parseValueFlags(
  argv: readonly string[],
  allowed: ReadonlySet<string>,
): ReadonlyMap<string, string> {
  if (argv.length % 2 !== 0) {
    throw new Error(`missing value for ${argv.at(-1) ?? "option"}`);
  }

  const values = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];

    if (flag === undefined || !flag.startsWith("--")) {
      throw new Error(`unexpected positional argument: ${flag ?? ""}`);
    }
    if (!allowed.has(flag)) {
      throw new Error(`unknown option: ${flag}`);
    }
    if (values.has(flag)) {
      throw new Error(`duplicate option: ${flag}`);
    }
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`missing value for ${flag}`);
    }

    values.set(flag, value);
  }

  return values;
}

function requireFlag(
  values: ReadonlyMap<string, string>,
  flag: string,
): string {
  const value = values.get(flag);
  if (value === undefined) {
    throw new Error(`missing required option: ${flag}`);
  }
  return value;
}

function parseDecision(value: string): PaidDatanetAdmissionDecisionV1 {
  if (value === "APPROVE" || value === "REJECT") {
    return value;
  }
  throw new Error("--decision must be APPROVE or REJECT");
}

function parseReasonCode(
  value: string,
): PaidDatanetAdmissionReasonCodeV1 {
  const allowed: readonly PaidDatanetAdmissionReasonCodeV1[] = [
    "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
    "CAPACITY_UNAVAILABLE",
    "PAYMENT_EVIDENCE_REJECTED",
    "POLICY_REJECTED",
    "REQUESTER_CANCELLED",
  ];

  if (
    allowed.includes(value as PaidDatanetAdmissionReasonCodeV1)
  ) {
    return value as PaidDatanetAdmissionReasonCodeV1;
  }

  throw new Error("--reason-code is not supported");
}

function parseOutcome(value: string): PaidDatanetFulfillmentOutcomeV1 {
  if (value === "COMPLETED" || value === "FAILED") {
    return value;
  }
  throw new Error("--outcome must be COMPLETED or FAILED");
}

function parseOutcomeCode(
  value: string,
): PaidDatanetFulfillmentOutcomeCodeV1 {
  const allowed: readonly PaidDatanetFulfillmentOutcomeCodeV1[] = [
    "DELIVERED_AS_QUOTED",
    "SOURCE_UNAVAILABLE",
    "INTEGRITY_MISMATCH",
    "EXECUTION_ERROR",
    "EVIDENCE_INCOMPLETE",
    "CUSTOMER_CANCELLED_AFTER_ADMISSION",
  ];

  if (
    allowed.includes(value as PaidDatanetFulfillmentOutcomeCodeV1)
  ) {
    return value as PaidDatanetFulfillmentOutcomeCodeV1;
  }

  throw new Error("--outcome-code is not supported");
}

function readJsonFile(path: string): unknown {
  const stat = statSync(path);
  if (!stat.isFile()) {
    throw new Error(`input is not a regular file: ${path}`);
  }
  if (stat.size > MAX_INPUT_BYTES) {
    throw new Error(`input file exceeds ${MAX_INPUT_BYTES} bytes: ${path}`);
  }

  const text = readFileSync(path, "utf8");
  return JSON.parse(text) as unknown;
}

function workflowBody(
  workflow: PaidDatanetOperatorWorkflowV1,
): Omit<PaidDatanetOperatorWorkflowV1, "workflow_sha256"> {
  const { workflow_sha256: _ignored, ...body } = workflow;
  return body;
}

function workflowIdentity(packet: PaidDatanetQuotePacketV1): string {
  return sha256Hex(
    canonicalJson({
      schema: PAID_DATANET_OPERATOR_WORKFLOW_V1_SCHEMA,
      marker: PAID_DATANET_OPERATOR_WORKFLOW_CLI_V1_MARKER,
      packet_sha256: packet.packet_sha256,
      quote_id: packet.quote.quote_id,
      requester_id: packet.quote.request.requester_id,
      customer_reference: packet.customer.customer_reference,
    }),
  );
}

function freezeWorkflow(
  body: Omit<PaidDatanetOperatorWorkflowV1, "workflow_sha256">,
): PaidDatanetOperatorWorkflowV1 {
  return Object.freeze({
    ...body,
    admission_receipts: Object.freeze([...body.admission_receipts]),
    fulfillment_receipts: Object.freeze([...body.fulfillment_receipts]),
    controls: Object.freeze({ ...body.controls }),
    workflow_sha256: sha256Hex(canonicalJson(body)),
  });
}

export function createPaidDatanetOperatorWorkflowV1(
  request: PaidDatanetQuotePacketRequestV1,
): PaidDatanetOperatorWorkflowV1 {
  const quotePacket = createPaidDatanetQuotePacketV1(request);

  const body: Omit<
    PaidDatanetOperatorWorkflowV1,
    "workflow_sha256"
  > = {
    schema: PAID_DATANET_OPERATOR_WORKFLOW_V1_SCHEMA,
    marker: PAID_DATANET_OPERATOR_WORKFLOW_CLI_V1_MARKER,
    workflow_id: workflowIdentity(quotePacket),
    workflow_sequence: 1,
    previous_workflow_sha256: null,
    stage: "QUOTED_AWAITING_PAYMENT_EVIDENCE",
    created_at_ms: quotePacket.packet_created_at_ms,
    updated_at_ms: quotePacket.packet_created_at_ms,
    quote_packet: quotePacket,
    admission_request: null,
    admission_receipts: Object.freeze([]),
    fulfillment_receipts: Object.freeze([]),
    controls: Object.freeze({
      append_only_workflow: true,
      local_file_input_only: true,
      stdout_output_only: true,
      network_access_enabled: false,
      filesystem_write_enabled: false,
      payment_collection_enabled: false,
      execution_performed_by_cli: false,
      automatic_execution_enabled: false,
      wc_mutation_enabled: false,
      treasury_access_enabled: false,
    }),
  };

  return freezeWorkflow(body);
}

export function admitPaidDatanetOperatorWorkflowV1(
  input: AdmitPaidDatanetOperatorWorkflowV1Input,
): PaidDatanetOperatorWorkflowV1 {
  if (!verifyPaidDatanetOperatorWorkflowV1(input.workflow)) {
    throw new Error("workflow integrity check failed");
  }
  if (input.workflow.stage !== "QUOTED_AWAITING_PAYMENT_EVIDENCE") {
    throw new Error("workflow is not awaiting payment evidence");
  }

  const quote = input.workflow.quote_packet.quote;
  const admissionRequest = createPaidDatanetAdmissionRequestV1({
    quote,
    customer_acceptance: {
      requester_id: quote.request.requester_id,
      accepted_quote_id: quote.quote_id,
      accepted_total_cents: quote.pricing.quoted_total_cents,
      accepted_currency: quote.currency,
      accepted_at_ms: input.accepted_at_ms,
    },
    payment_evidence: {
      evidence_ref: input.payment_evidence_ref,
      evidence_sha256: input.payment_evidence_sha256,
      verifier_id: input.payment_verifier_id,
      verification_status: "VERIFIED",
      amount_cents: quote.pricing.quoted_total_cents,
      currency: quote.currency,
      observed_at_ms: input.payment_observed_at_ms,
    },
    submitted_at_ms: input.submitted_at_ms,
  });

  const admissionReceipts = appendPaidDatanetAdmissionDecisionV1(
    [],
    {
      admission_request: admissionRequest,
      operator_id: input.operator_id,
      decision: input.decision,
      reason_code: input.reason_code,
      decided_at_ms: input.decided_at_ms,
    },
  );

  const decisionReceipt = admissionReceipts[0];
  if (!decisionReceipt) {
    throw new Error("admission decision receipt was not created");
  }

  const body: Omit<
    PaidDatanetOperatorWorkflowV1,
    "workflow_sha256"
  > = {
    ...workflowBody(input.workflow),
    workflow_sequence: input.workflow.workflow_sequence + 1,
    previous_workflow_sha256: input.workflow.workflow_sha256,
    stage:
      decisionReceipt.decision === "APPROVE"
        ? "ADMITTED_AWAITING_SEPARATE_EXECUTION"
        : "REJECTED",
    updated_at_ms: decisionReceipt.decided_at_ms,
    admission_request: admissionRequest,
    admission_receipts: admissionReceipts,
  };

  return freezeWorkflow(body);
}

export function fulfillPaidDatanetOperatorWorkflowV1(
  input: FulfillPaidDatanetOperatorWorkflowV1Input,
): PaidDatanetOperatorWorkflowV1 {
  if (!verifyPaidDatanetOperatorWorkflowV1(input.workflow)) {
    throw new Error("workflow integrity check failed");
  }
  if (
    input.workflow.stage !==
    "ADMITTED_AWAITING_SEPARATE_EXECUTION"
  ) {
    throw new Error("workflow is not awaiting separate execution");
  }

  const admission = input.workflow.admission_receipts[0];
  if (!admission) {
    throw new Error("approved admission receipt is missing");
  }

  const fulfillmentReceipts = appendPaidDatanetFulfillmentReceiptV1(
    input.workflow.fulfillment_receipts,
    {
      admission_receipts: input.workflow.admission_receipts,
      admission_receipt_sha256: admission.receipt_sha256,
      fulfillment_operator_id: input.fulfillment_operator_id,
      execution_started_at_ms: input.execution_started_at_ms,
      completed_at_ms: input.completed_at_ms,
      outcome: input.outcome,
      outcome_code: input.outcome_code,
      result_summary_sha256: input.result_summary_sha256,
      operator_attestation_sha256:
        input.operator_attestation_sha256,
      evidence_artifacts: input.evidence_artifacts,
    },
  );

  const fulfillment = fulfillmentReceipts.at(-1);
  if (!fulfillment) {
    throw new Error("fulfillment receipt was not created");
  }

  const body: Omit<
    PaidDatanetOperatorWorkflowV1,
    "workflow_sha256"
  > = {
    ...workflowBody(input.workflow),
    workflow_sequence: input.workflow.workflow_sequence + 1,
    previous_workflow_sha256: input.workflow.workflow_sha256,
    stage:
      fulfillment.outcome === "COMPLETED"
        ? "FULFILLED_DELIVERED"
        : "FULFILLMENT_FAILED",
    updated_at_ms: fulfillment.completed_at_ms,
    fulfillment_receipts: fulfillmentReceipts,
  };

  return freezeWorkflow(body);
}

function controlsAreExact(
  workflow: PaidDatanetOperatorWorkflowV1,
): boolean {
  return (
    workflow.controls.append_only_workflow === true &&
    workflow.controls.local_file_input_only === true &&
    workflow.controls.stdout_output_only === true &&
    workflow.controls.network_access_enabled === false &&
    workflow.controls.filesystem_write_enabled === false &&
    workflow.controls.payment_collection_enabled === false &&
    workflow.controls.execution_performed_by_cli === false &&
    workflow.controls.automatic_execution_enabled === false &&
    workflow.controls.wc_mutation_enabled === false &&
    workflow.controls.treasury_access_enabled === false
  );
}

export function verifyPaidDatanetOperatorWorkflowV1(
  workflow: PaidDatanetOperatorWorkflowV1,
): boolean {
  try {
    if (
      workflow.schema !== PAID_DATANET_OPERATOR_WORKFLOW_V1_SCHEMA ||
      workflow.marker !==
        PAID_DATANET_OPERATOR_WORKFLOW_CLI_V1_MARKER ||
      !SHA256_HEX.test(workflow.workflow_sha256) ||
      !SHA256_HEX.test(workflow.workflow_id) ||
      !Number.isSafeInteger(workflow.workflow_sequence) ||
      workflow.workflow_sequence < 1 ||
      !Number.isSafeInteger(workflow.created_at_ms) ||
      !Number.isSafeInteger(workflow.updated_at_ms) ||
      workflow.updated_at_ms < workflow.created_at_ms ||
      !controlsAreExact(workflow) ||
      !verifyPaidDatanetQuotePacketV1(workflow.quote_packet) ||
      workflow.workflow_id !== workflowIdentity(workflow.quote_packet)
    ) {
      return false;
    }

    if (
      sha256Hex(canonicalJson(workflowBody(workflow))) !==
      workflow.workflow_sha256
    ) {
      return false;
    }

    if (
      !verifyPaidDatanetAdmissionReceiptChainV1(
        workflow.admission_receipts,
      ) ||
      !verifyPaidDatanetFulfillmentReceiptsAgainstAdmissionsV1(
        workflow.fulfillment_receipts,
        workflow.admission_receipts,
      ) ||
      workflow.admission_receipts.length > 1 ||
      workflow.fulfillment_receipts.length > 1
    ) {
      return false;
    }

    if (workflow.admission_request === null) {
      return (
        workflow.workflow_sequence === 1 &&
        workflow.previous_workflow_sha256 === null &&
        workflow.stage === "QUOTED_AWAITING_PAYMENT_EVIDENCE" &&
        workflow.updated_at_ms === workflow.created_at_ms &&
        workflow.admission_receipts.length === 0 &&
        workflow.fulfillment_receipts.length === 0
      );
    }

    if (!verifyPaidDatanetAdmissionRequestV1(workflow.admission_request)) {
      return false;
    }

    const quote = workflow.quote_packet.quote;
    const request = workflow.admission_request;

    if (
      request.quote.quote_id !== quote.quote_id ||
      request.quote.service_code !== quote.service_code ||
      request.quote.requester_id !== quote.request.requester_id ||
      request.quote.quoted_total_cents !==
        quote.pricing.quoted_total_cents ||
      request.quote.currency !== quote.currency ||
      request.quote.expires_at_ms !== quote.expires_at_ms ||
      workflow.admission_receipts.length !== 1
    ) {
      return false;
    }

    const decision = workflow.admission_receipts[0];
    if (
      !decision ||
      decision.admission_request_id !== request.admission_request_id ||
      decision.quote_id !== quote.quote_id ||
      decision.requester_id !== quote.request.requester_id
    ) {
      return false;
    }

    if (workflow.fulfillment_receipts.length === 0) {
      return (
        workflow.workflow_sequence === 2 &&
        workflow.previous_workflow_sha256 !== null &&
        workflow.updated_at_ms === decision.decided_at_ms &&
        ((decision.decision === "APPROVE" &&
          workflow.stage ===
            "ADMITTED_AWAITING_SEPARATE_EXECUTION") ||
          (decision.decision === "REJECT" &&
            workflow.stage === "REJECTED"))
      );
    }

    const fulfillment = workflow.fulfillment_receipts[0];
    if (
      !fulfillment ||
      decision.decision !== "APPROVE" ||
      workflow.workflow_sequence !== 3 ||
      workflow.previous_workflow_sha256 === null ||
      workflow.updated_at_ms !== fulfillment.completed_at_ms ||
      fulfillment.admission_receipt_sha256 !==
        decision.receipt_sha256
    ) {
      return false;
    }

    return (
      (fulfillment.outcome === "COMPLETED" &&
        workflow.stage === "FULFILLED_DELIVERED") ||
      (fulfillment.outcome === "FAILED" &&
        workflow.stage === "FULFILLMENT_FAILED")
    );
  } catch {
    return false;
  }
}

export function parsePaidDatanetOperatorWorkflowCliArgsV1(
  argv: readonly string[],
): PaidDatanetOperatorWorkflowCliCommandV1 {
  if (argv.length === 0 || argv[0] === "--help") {
    if (argv.length > 1) {
      throw new Error("--help cannot be combined with other options");
    }
    return { kind: "help" };
  }

  const command = argv[0];
  const rest = argv.slice(1);

  if (command === "quote") {
    const values = parseValueFlags(rest, QUOTE_VALUE_FLAGS);
    return {
      kind: "quote",
      format: parseFormat(values.get("--format")),
      request: {
        issuer_name: requireFlag(values, "--issuer-name"),
        customer_name: requireFlag(values, "--customer-name"),
        customer_reference: requireFlag(
          values,
          "--customer-reference",
        ),
        quote_request: {
          request_id: requireFlag(values, "--request-id"),
          requester_id: requireFlag(values, "--requester-id"),
          service_code: requireFlag(
            values,
            "--service-code",
          ) as PaidDatanetQuotePacketRequestV1["quote_request"]["service_code"],
          object_count: parseUnsignedInteger(
            "--object-count",
            requireFlag(values, "--object-count"),
          ),
          total_bytes: parseUnsignedInteger(
            "--total-bytes",
            requireFlag(values, "--total-bytes"),
          ),
          operator_cost_basis_cents: parseUnsignedInteger(
            "--operator-cost-basis-cents",
            requireFlag(values, "--operator-cost-basis-cents"),
          ),
          requested_at_ms: parseUnsignedInteger(
            "--requested-at-ms",
            requireFlag(values, "--requested-at-ms"),
          ),
        },
      },
    };
  }

  if (command === "admit") {
    const values = parseValueFlags(rest, ADMIT_VALUE_FLAGS);
    return {
      kind: "admit",
      format: parseFormat(values.get("--format")),
      input_json: requireFlag(values, "--input-json"),
      values: {
        accepted_at_ms: parseUnsignedInteger(
          "--accepted-at-ms",
          requireFlag(values, "--accepted-at-ms"),
        ),
        payment_evidence_ref: requireFlag(
          values,
          "--payment-evidence-ref",
        ),
        payment_evidence_sha256: requireFlag(
          values,
          "--payment-evidence-sha256",
        ),
        payment_verifier_id: requireFlag(
          values,
          "--payment-verifier-id",
        ),
        payment_observed_at_ms: parseUnsignedInteger(
          "--payment-observed-at-ms",
          requireFlag(values, "--payment-observed-at-ms"),
        ),
        submitted_at_ms: parseUnsignedInteger(
          "--submitted-at-ms",
          requireFlag(values, "--submitted-at-ms"),
        ),
        operator_id: requireFlag(values, "--operator-id"),
        decision: parseDecision(
          requireFlag(values, "--decision"),
        ),
        reason_code: parseReasonCode(
          requireFlag(values, "--reason-code"),
        ),
        decided_at_ms: parseUnsignedInteger(
          "--decided-at-ms",
          requireFlag(values, "--decided-at-ms"),
        ),
      },
    };
  }

  if (command === "fulfill") {
    const values = parseValueFlags(rest, FULFILL_VALUE_FLAGS);
    return {
      kind: "fulfill",
      format: parseFormat(values.get("--format")),
      input_json: requireFlag(values, "--input-json"),
      evidence_json: requireFlag(values, "--evidence-json"),
      values: {
        fulfillment_operator_id: requireFlag(
          values,
          "--fulfillment-operator-id",
        ),
        execution_started_at_ms: parseUnsignedInteger(
          "--execution-started-at-ms",
          requireFlag(values, "--execution-started-at-ms"),
        ),
        completed_at_ms: parseUnsignedInteger(
          "--completed-at-ms",
          requireFlag(values, "--completed-at-ms"),
        ),
        outcome: parseOutcome(requireFlag(values, "--outcome")),
        outcome_code: parseOutcomeCode(
          requireFlag(values, "--outcome-code"),
        ),
        result_summary_sha256: requireFlag(
          values,
          "--result-summary-sha256",
        ),
        operator_attestation_sha256: requireFlag(
          values,
          "--operator-attestation-sha256",
        ),
      },
    };
  }

  if (command === "verify") {
    const values = parseValueFlags(rest, VERIFY_VALUE_FLAGS);
    return {
      kind: "verify",
      format: parseFormat(values.get("--format")),
      input_json: requireFlag(values, "--input-json"),
    };
  }

  throw new Error(`unknown command: ${command}`);
}

export function runPaidDatanetOperatorWorkflowCliV1(
  argv: readonly string[],
  io: PaidDatanetOperatorWorkflowCliIoV1 = defaultIo(),
): number {
  try {
    const command = parsePaidDatanetOperatorWorkflowCliArgsV1(argv);

    if (command.kind === "help") {
      io.stdout(HELP_TEXT);
      return 0;
    }

    if (command.kind === "quote") {
      const workflow = createPaidDatanetOperatorWorkflowV1(
        command.request,
      );
      io.stdout(serialize(workflow, command.format));
      return 0;
    }

    const workflow = readJsonFile(
      command.input_json,
    ) as PaidDatanetOperatorWorkflowV1;

    if (command.kind === "verify") {
      const valid = verifyPaidDatanetOperatorWorkflowV1(workflow);
      io.stdout(
        serialize(
          {
            schema: PAID_DATANET_OPERATOR_WORKFLOW_CLI_V1_SCHEMA,
            marker: PAID_DATANET_OPERATOR_WORKFLOW_CLI_V1_MARKER,
            valid,
            workflow_id:
              typeof workflow?.workflow_id === "string"
                ? workflow.workflow_id
                : null,
            workflow_sequence:
              typeof workflow?.workflow_sequence === "number"
                ? workflow.workflow_sequence
                : null,
            stage:
              typeof workflow?.stage === "string"
                ? workflow.stage
                : null,
            payment_collection_enabled: false,
            execution_performed_by_cli: false,
            automatic_execution_enabled: false,
            wc_mutation_enabled: false,
            treasury_access_enabled: false,
            status: valid ? "GREEN" : "INVALID",
          },
          command.format,
        ),
      );
      return valid ? 0 : 2;
    }

    if (command.kind === "admit") {
      const updated = admitPaidDatanetOperatorWorkflowV1({
        workflow,
        ...command.values,
      });
      io.stdout(serialize(updated, command.format));
      return 0;
    }

    const evidence = readJsonFile(command.evidence_json);
    if (!Array.isArray(evidence)) {
      throw new Error("evidence JSON must contain an array");
    }

    const updated = fulfillPaidDatanetOperatorWorkflowV1({
      workflow,
      ...command.values,
      evidence_artifacts:
        evidence as PaidDatanetFulfillmentEvidenceArtifactV1[],
    });
    io.stdout(serialize(updated, command.format));
    return 0;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "unknown CLI failure";

    io.stderr(
      JSON.stringify({
        schema: PAID_DATANET_OPERATOR_WORKFLOW_CLI_V1_SCHEMA,
        marker: PAID_DATANET_OPERATOR_WORKFLOW_CLI_V1_MARKER,
        status: "ERROR",
        error: message,
        network_access_enabled: false,
        filesystem_write_enabled: false,
        payment_collection_enabled: false,
        execution_performed_by_cli: false,
        automatic_execution_enabled: false,
        wc_mutation_enabled: false,
        treasury_access_enabled: false,
      }),
    );
    return 2;
  }
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  return Boolean(entry) && import.meta.url === pathToFileURL(entry).href;
}

if (isMainModule()) {
  process.exitCode = runPaidDatanetOperatorWorkflowCliV1(
    process.argv.slice(2),
  );
}
