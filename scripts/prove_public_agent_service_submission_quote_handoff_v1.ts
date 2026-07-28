import fs from "node:fs";
import path from "node:path";
import {
  materializePublicAgentServiceSubmissionQuoteHandoffV1,
  validatePublicAgentServiceSubmissionQuoteHandoffV1,
  verifyPublicAgentServiceSubmissionQuoteHandoffV1,
} from "./public_agent_service_submission_quote_handoff_v1.js";
import {
  canonicalJson,
} from "./agent_paid_work_order_envelope_v1.js";

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) fail(message);
}

function readJson(relative: string): unknown {
  const resolved = path.resolve(relative);
  const fileStat = fs.lstatSync(resolved);
  assertCondition(!fileStat.isSymbolicLink(), `symlink forbidden: ${relative}`);
  assertCondition(fileStat.isFile(), `regular file required: ${relative}`);
  return JSON.parse(fs.readFileSync(resolved, "utf8")) as unknown;
}

function readText(relative: string): string {
  const resolved = path.resolve(relative);
  const fileStat = fs.lstatSync(resolved);
  assertCondition(!fileStat.isSymbolicLink(), `symlink forbidden: ${relative}`);
  assertCondition(fileStat.isFile(), `regular file required: ${relative}`);
  return fs.readFileSync(resolved, "utf8");
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function expectReject(
  label: string,
  action: () => unknown,
): void {
  let rejected = false;
  try {
    action();
  } catch {
    rejected = true;
  }
  assertCondition(rejected, `${label} was not rejected`);
}

const inputPath =
  "examples/public-agent-service-submission-quote-handoff-v1.example.json";
const schemaPath =
  "schemas/public-agent-service-submission-quote-handoff-v1.schema.json";
const docsPath =
  "docs/public-agent/public-agent-service-submission-quote-handoff-v1.md";
const adapterPath =
  "scripts/public_agent_service_submission_quote_handoff_v1.ts";
const proofPath =
  "scripts/prove_public_agent_service_submission_quote_handoff_v1.ts";
const workflowPath =
  ".github/workflows/public-agent-service-submission-quote-handoff-v1.yml";
const catalogPath =
  "ops/public/agent-services-v1/catalog.json";
const quoteSchemaPath =
  "schemas/agent-paid-work-quote-envelope-v1.schema.json";
const quoteScriptPath =
  "scripts/agent_paid_work_quote_envelope_v1.ts";
const acceptanceSchemaPath =
  "schemas/agent-paid-work-acceptance-envelope-v1.schema.json";
const paymentIntentSchemaPath =
  "schemas/agent-paid-work-payment-intent-envelope-v1.schema.json";

const input = readJson(inputPath);
const catalog = readJson(catalogPath);
validatePublicAgentServiceSubmissionQuoteHandoffV1(input);

const packet =
  materializePublicAgentServiceSubmissionQuoteHandoffV1(
    input,
    catalog,
  );
verifyPublicAgentServiceSubmissionQuoteHandoffV1(
  input,
  catalog,
  packet,
);

assertCondition(
  packet.marker
    === "VOID_PUBLIC_AGENT_SERVICE_SUBMISSION_QUOTE_HANDOFF_PACKET_V1",
  "packet marker mismatch",
);
assertCondition(
  /^voidawqh1_[0-9a-f]{64}$/.test(packet.handoff_id),
  "handoff_id format mismatch",
);
assertCondition(
  packet.status === "example_only",
  "example fixture must not claim provider-quote readiness",
);
assertCondition(
  packet.source.work_order_id
    === "voidawo1_a328fbbee6ea0822c8fe5212e19cba23b889c489a39235a2529243d8f19fc106",
  "work_order_id changed",
);
assertCondition(
  packet.source.submission_id
    === "voidawsr1_797d2e02a13f783fdfe3844d9231fd9bfa1c21b62dd850188903e2b934068e16",
  "submission_id changed",
);
assertCondition(
  packet.source.request_sha256
    === "31b9590cb9802cd35449290a2663e996b90ad114180f6c207349f04ed321c8cc",
  "request_sha256 changed",
);
assertCondition(
  packet.source.authorization_verified === true,
  "authorization binding changed",
);
assertCondition(
  packet.source.authentication_mode === "credential_registry",
  "credential-registry binding changed",
);
assertCondition(
  packet.source.authentication_scope === "agent_paid_work_submit",
  "authentication scope changed",
);
assertCondition(
  packet.source.admission_decision === "accepted_for_review",
  "admission decision changed",
);
assertCondition(
  packet.quote_contract.marker
    === "VOID_AGENT_PAID_WORK_QUOTE_ENVELOPE_V1",
  "quote marker changed",
);
assertCondition(
  packet.quote_contract.materializer_export
    === "materializeAgentPaidWorkQuote",
  "quote materializer export changed",
);
assertCondition(
  packet.quote_constraints.capability_id
    === "datanet.fetch_verify",
  "quote capability changed",
);
assertCondition(
  packet.quote_constraints.quote_asset === "USD",
  "quote asset changed",
);
assertCondition(
  packet.quote_constraints.max_total === "5.00",
  "quote ceiling changed",
);
assertCondition(
  packet.quote_constraints.max_runtime_seconds === 300,
  "runtime ceiling changed",
);
assertCondition(
  packet.quote_constraints.max_output_bytes === 1048576,
  "output ceiling changed",
);
assertCondition(
  packet.quote_constraints.output_labels.join(",")
    === "verification_result.json,verification_receipt.json",
  "output labels changed",
);
assertCondition(
  Object.values(packet.authority).every((value) => value === false),
  "handoff packet granted authority",
);

const reorderedInput = {
  intake_receipt: (input as Record<string, unknown>).intake_receipt,
  submission_input: (input as Record<string, unknown>).submission_input,
  handoff_nonce: (input as Record<string, unknown>).handoff_nonce,
  expires_at_utc: (input as Record<string, unknown>).expires_at_utc,
  created_at_utc: (input as Record<string, unknown>).created_at_utc,
  evidence_mode: (input as Record<string, unknown>).evidence_mode,
  version: (input as Record<string, unknown>).version,
  marker: (input as Record<string, unknown>).marker,
};
const reordered =
  materializePublicAgentServiceSubmissionQuoteHandoffV1(
    reorderedInput,
    catalog,
  );
assertCondition(
  reordered.handoff_id === packet.handoff_id,
  "input key order changed handoff_id",
);
assertCondition(
  canonicalJson(reordered) === canonicalJson(packet),
  "input key order changed packet content",
);

const changedNonce = clone(input) as Record<string, unknown>;
changedNonce.handoff_nonce =
  "quote-handoff-example-20300101-0002";
const changedNoncePacket =
  materializePublicAgentServiceSubmissionQuoteHandoffV1(
    changedNonce,
    catalog,
  );
assertCondition(
  changedNoncePacket.handoff_id !== packet.handoff_id,
  "changed handoff nonce did not change handoff_id",
);
assertCondition(
  changedNoncePacket.source.submission_id
    === packet.source.submission_id,
  "changed handoff nonce changed submission_id",
);

const realEvidence = clone(input) as Record<string, unknown>;
realEvidence.evidence_mode = "external_receiver_receipt";
const realPacket =
  materializePublicAgentServiceSubmissionQuoteHandoffV1(
    realEvidence,
    catalog,
  );
assertCondition(
  realPacket.status === "ready_for_provider_quote",
  "external receiver receipt did not produce ready status",
);

const badSubmission = clone(input) as Record<string, unknown>;
(
  badSubmission.intake_receipt as Record<string, unknown>
).submission_id =
  "voidawsr1_" + "0".repeat(64);
expectReject("mismatched submission_id", () =>
  materializePublicAgentServiceSubmissionQuoteHandoffV1(
    badSubmission,
    catalog,
  ),
);

const badWorkOrder = clone(input) as Record<string, unknown>;
(
  badWorkOrder.intake_receipt as Record<string, unknown>
).work_order_id =
  "voidawo1_" + "0".repeat(64);
expectReject("mismatched work_order_id", () =>
  materializePublicAgentServiceSubmissionQuoteHandoffV1(
    badWorkOrder,
    catalog,
  ),
);

const badCanonicalHash = clone(input) as Record<string, unknown>;
(
  badCanonicalHash.intake_receipt as Record<string, unknown>
).canonical_request_sha256 = "0".repeat(64);
expectReject("mismatched canonical request hash", () =>
  materializePublicAgentServiceSubmissionQuoteHandoffV1(
    badCanonicalHash,
    catalog,
  ),
);

const rejectedAdmission = clone(input) as Record<string, unknown>;
(
  (
    rejectedAdmission.intake_receipt as Record<string, unknown>
  ).admission as Record<string, unknown>
).decision = "rejected";
expectReject("rejected admission", () =>
  materializePublicAgentServiceSubmissionQuoteHandoffV1(
    rejectedAdmission,
    catalog,
  ),
);

const unauthorizedReceipt = clone(input) as Record<string, unknown>;
(
  unauthorizedReceipt.intake_receipt as Record<string, unknown>
).authorization_verified = false;
expectReject("unverified authorization", () =>
  materializePublicAgentServiceSubmissionQuoteHandoffV1(
    unauthorizedReceipt,
    catalog,
  ),
);

const authorityEscalation = clone(input) as Record<string, unknown>;
(
  (
    authorityEscalation.intake_receipt as Record<string, unknown>
  ).authority as Record<string, unknown>
).quote_created = true;
expectReject("receipt authority escalation", () =>
  materializePublicAgentServiceSubmissionQuoteHandoffV1(
    authorityEscalation,
    catalog,
  ),
);

const fallbackAuth = clone(input) as Record<string, unknown>;
(
  (
    fallbackAuth.intake_receipt as Record<string, unknown>
  ).authentication as Record<string, unknown>
).mode = "single_token_fallback";
expectReject("single-token fallback authentication", () =>
  materializePublicAgentServiceSubmissionQuoteHandoffV1(
    fallbackAuth,
    catalog,
  ),
);

const tamperedPacket = clone(packet);
tamperedPacket.quote_constraints.max_total = "6.00";
expectReject("tampered handoff packet", () =>
  verifyPublicAgentServiceSubmissionQuoteHandoffV1(
    input,
    catalog,
    tamperedPacket,
  ),
);

const schema = readJson(schemaPath) as Record<string, unknown>;
assertCondition(
  schema.x_void_marker
    === "VOID_PUBLIC_AGENT_SERVICE_SUBMISSION_QUOTE_HANDOFF_SCHEMA_V1",
  "handoff schema marker mismatch",
);

const docs = readText(docsPath);
const docsNormalized = docs.replace(/\s+/g, " ");
const adapter = readText(adapterPath);
const proof = readText(proofPath);
const workflow = readText(workflowPath);
const quoteSchema = readText(quoteSchemaPath);
const quoteScript = readText(quoteScriptPath);
const acceptanceSchema = readText(acceptanceSchemaPath);
const paymentIntentSchema = readText(paymentIntentSchemaPath);

assertCondition(
  docs.includes(
    "VOID_PUBLIC_AGENT_SERVICE_SUBMISSION_QUOTE_HANDOFF_V1",
  ),
  "docs input marker missing",
);
assertCondition(
  docs.includes("VOID_AGENT_PAID_WORK_QUOTE_ENVELOPE_V1"),
  "docs quote marker missing",
);
assertCondition(
  docsNormalized.includes("does not select a provider"),
  "docs provider-selection boundary missing",
);
assertCondition(
  docsNormalized.includes("does not generate a quote"),
  "docs quote-generation boundary missing",
);
assertCondition(
  workflow.includes(
    "prove_public_agent_service_submission_quote_handoff_v1.ts",
  ),
  "workflow proof command missing",
);
assertCondition(
  /uses:\s*actions\/checkout@v4\s+with:\s+fetch-depth:\s*0/.test(
    workflow,
  ),
  "workflow must use full-history checkout",
);
assertCondition(
  quoteSchema.includes(
    '"const": "VOID_AGENT_PAID_WORK_QUOTE_ENVELOPE_V1"',
  ),
  "quote schema marker changed",
);
assertCondition(
  quoteSchema.includes(
    '"quote_grants_no_execution_authority"',
  ),
  "quote no-execution term changed",
);
assertCondition(
  quoteSchema.includes(
    '"quote_is_not_payment_instruction"',
  ),
  "quote non-payment term changed",
);
assertCondition(
  quoteScript.includes(
    "export function materializeAgentPaidWorkQuote(",
  ),
  "quote materializer export changed",
);
assertCondition(
  quoteScript.includes(
    "quote.commercial.total",
  ) || quoteScript.includes("commercial.total"),
  "quote total binding disappeared",
);
assertCondition(
  acceptanceSchema.includes(
    '"payment_authorization_granted":',
  ) && acceptanceSchema.includes('"const": false'),
  "acceptance payment boundary changed",
);
assertCondition(
  paymentIntentSchema.includes(
    '"payment_execution_granted":',
  ) && paymentIntentSchema.includes('"const": false'),
  "payment-intent execution boundary changed",
);
assertCondition(
  !/from\s+["']node:(?:http|https|net|tls|child_process)["']/.test(
    adapter,
  ),
  "handoff adapter imports network or subprocess authority",
);
assertCondition(
  !/\bfetch\s*\(/.test(adapter),
  "handoff adapter performs an HTTP request",
);
assertCondition(
  proof.includes("tampered handoff packet"),
  "proof does not test packet tampering",
);

console.log(
  JSON.stringify(
    {
      marker:
        "VOID_PUBLIC_AGENT_SERVICE_SUBMISSION_QUOTE_HANDOFF_ADAPTER_V1",
      input_marker:
        "VOID_PUBLIC_AGENT_SERVICE_SUBMISSION_QUOTE_HANDOFF_V1",
      output_marker:
        "VOID_PUBLIC_AGENT_SERVICE_SUBMISSION_QUOTE_HANDOFF_PACKET_V1",
      quote_marker:
        "VOID_AGENT_PAID_WORK_QUOTE_ENVELOPE_V1",
      handoff_id: packet.handoff_id,
      status: packet.status,
      catalog_fingerprint_sha256:
        packet.source.catalog_fingerprint_sha256,
      work_order_id: packet.source.work_order_id,
      submission_id: packet.source.submission_id,
      request_sha256: packet.source.request_sha256,
      receipt_id: packet.source.receipt_id,
      capability_id: packet.quote_constraints.capability_id,
      quote_asset: packet.quote_constraints.quote_asset,
      max_total: packet.quote_constraints.max_total,
      provider_selection: false,
      quote_generation: false,
      quote_acceptance: false,
      payment_authorization: false,
      payment_execution: false,
      work_dispatch: false,
      http_submission: false,
      credential_change: false,
      runtime_mutation: false,
      money_movement: false,
      proof: "green",
    },
    null,
    2,
  ),
);
