import { readFileSync } from "node:fs";

import {
  AGENT_PAID_WORK_SUBMISSION_ADMISSION_MARKER,
  AGENT_PAID_WORK_SUBMISSION_ADMISSION_POLICY_MARKER,
  materializeAgentPaidWorkSubmissionAdmissionV1,
  validateAgentPaidWorkSubmissionAdmissionPolicyV1,
  validateAgentPaidWorkSubmissionAdmissionV1,
  type AgentPaidWorkSubmissionAdmissionPolicyV1,
} from "./agent_paid_work_submission_admission_v1.js";
import {
  materializeAgentPaidWorkOrder,
  type AgentPaidWorkOrderDraft,
} from "./agent_paid_work_order_envelope_v1.js";

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}

function expectReason(
  label: string,
  draft: AgentPaidWorkOrderDraft,
  policy: AgentPaidWorkSubmissionAdmissionPolicyV1,
  evaluatedAt: string,
  reason: string,
): void {
  const workOrder = materializeAgentPaidWorkOrder(draft);
  const result =
    materializeAgentPaidWorkSubmissionAdmissionV1(
      workOrder,
      policy,
      evaluatedAt,
    );
  assertCondition(
    result.decision === "rejected",
    `${label} was not rejected`,
  );
  assertCondition(
    result.reason_codes.includes(reason as never),
    `${label} missing reason ${reason}`,
  );
}

function expectWorkOrderReject(
  label: string,
  draft: AgentPaidWorkOrderDraft,
): void {
  let rejected = false;
  try {
    materializeAgentPaidWorkOrder(draft);
  } catch {
    rejected = true;
  }
  assertCondition(
    rejected,
    `${label} bypassed the work-order input contract`,
  );
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function reverseKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(reverseKeys);
  }
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(
      value as Record<string, unknown>,
    )
      .reverse()
      .map(([key, child]) => [
        key,
        reverseKeys(child),
      ]),
  );
}

const example = JSON.parse(
  readFileSync(
    "examples/agent-paid-work-order-envelope-v1.example.json",
    "utf8",
  ),
) as Record<string, unknown>;
const { work_order_id: _id, ...draftRaw } = example;
const draft = draftRaw as AgentPaidWorkOrderDraft;

const policy: AgentPaidWorkSubmissionAdmissionPolicyV1 = {
  marker:
    AGENT_PAID_WORK_SUBMISSION_ADMISSION_POLICY_MARKER,
  version: 1,
  policy_id:
    "void.policy.agent-paid-work-submission-admission.v1",
  allowed_capability_ids: [
    "datanet.fetch_verify",
  ],
  max_total_by_asset: {
    USD: "10.00",
  },
  max_runtime_seconds: 600,
  max_output_bytes: 2_097_152,
  max_input_refs: 8,
  max_expected_outputs: 8,
  max_ttl_seconds: 172800,
  require_https_callback: true,
  callback_policy: {
    forbid_credentials: true,
    forbid_fragment: true,
    forbid_loopback: true,
    forbid_private_ip_literals: true,
  },
  authority: {
    provider_selection_authorized: false,
    quote_creation_authorized: false,
    payment_authorized: false,
    work_execution_authorized: false,
    work_dispatch_authorized: false,
    wc_award_authorized: false,
    wc_ledger_write_authorized: false,
    wallet_or_signer_access_authorized: false,
    buy_void_fulfillment_authorized: false,
  },
};
validateAgentPaidWorkSubmissionAdmissionPolicyV1(
  policy,
);

const workOrder =
  materializeAgentPaidWorkOrder(draft);
const accepted =
  materializeAgentPaidWorkSubmissionAdmissionV1(
    workOrder,
    policy,
    "2026-07-25T23:00:00Z",
  );

assertCondition(
  accepted.marker ===
    AGENT_PAID_WORK_SUBMISSION_ADMISSION_MARKER,
  "accepted marker mismatch",
);
assertCondition(
  accepted.decision === "accepted_for_review",
  "valid order was not accepted for review",
);
assertCondition(
  accepted.reason_codes.length === 0,
  "valid order has rejection reasons",
);
assertCondition(
  accepted.admission_id.startsWith(
    "voidawsa1_",
  ),
  "admission ID prefix mismatch",
);
assertCondition(
  Object.values(accepted.authority).every(
    (value) => value === false,
  ),
  "accepted result granted authority",
);

const reordered =
  materializeAgentPaidWorkSubmissionAdmissionV1(
    reverseKeys(workOrder),
    reverseKeys(policy),
    "2026-07-25T23:00:00Z",
  );
assertCondition(
  reordered.admission_id ===
    accepted.admission_id,
  "key order changed admission ID",
);
validateAgentPaidWorkSubmissionAdmissionV1(
  accepted,
  workOrder,
  policy,
  "2026-07-25T23:00:00Z",
);

{
  const value = clone(draft);
  value.service.capability_id =
    "unsupported.capability";
  expectReason(
    "capability",
    value,
    policy,
    "2026-07-25T23:00:00Z",
    "capability_not_allowed",
  );
}
{
  const value = clone(draft);
  value.commercial.quote_asset = "EUR";
  expectReason(
    "quote asset",
    value,
    policy,
    "2026-07-25T23:00:00Z",
    "quote_asset_not_allowed",
  );
}
{
  const value = clone(draft);
  value.commercial.max_total = "10.01";
  expectReason(
    "maximum total",
    value,
    policy,
    "2026-07-25T23:00:00Z",
    "max_total_exceeds_policy",
  );
}
{
  expectReason(
    "expired",
    draft,
    policy,
    "2026-07-26T22:30:00Z",
    "expired",
  );
}
{
  expectReason(
    "future",
    draft,
    policy,
    "2026-07-25T22:29:59Z",
    "created_in_future",
  );
}
{
  const limited = clone(policy);
  limited.max_ttl_seconds = 3600;
  expectReason(
    "ttl",
    draft,
    limited,
    "2026-07-25T23:00:00Z",
    "ttl_exceeds_policy",
  );
}
{
  const value = clone(draft);
  value.execution_limits.max_runtime_seconds =
    601;
  expectReason(
    "runtime",
    value,
    policy,
    "2026-07-25T23:00:00Z",
    "runtime_exceeds_policy",
  );
}
{
  const value = clone(draft);
  value.execution_limits.max_output_bytes =
    2_097_153;
  expectReason(
    "output",
    value,
    policy,
    "2026-07-25T23:00:00Z",
    "output_bytes_exceeds_policy",
  );
}
{
  const value = clone(draft);
  value.service.input_refs = Array.from(
    { length: 9 },
    (_, index) => `datanet:object:${index}`,
  );
  expectReason(
    "input count",
    value,
    policy,
    "2026-07-25T23:00:00Z",
    "input_ref_count_exceeds_policy",
  );
}
{
  const value = clone(draft);
  value.service.expected_outputs =
    Array.from(
      { length: 9 },
      (_, index) => `result-${index}.json`,
    );
  expectReason(
    "output count",
    value,
    policy,
    "2026-07-25T23:00:00Z",
    "expected_output_count_exceeds_policy",
  );
}
{
  const value = clone(draft);
  value.requester.callback_uri =
    "http://agent.example.invalid/callback";
  expectWorkOrderReject(
    "non-HTTPS callback",
    value,
  );
}
{
  const value = clone(draft);
  value.requester.callback_uri =
    "https://user:pass@agent.example.invalid/callback";
  expectWorkOrderReject(
    "callback credentials",
    value,
  );
}
{
  const value = clone(draft);
  value.requester.callback_uri =
    "https://agent.example.invalid/callback#secret";
  expectWorkOrderReject(
    "callback fragment",
    value,
  );
}
{
  const value = clone(draft);
  value.requester.callback_uri =
    "https://localhost/callback";
  expectReason(
    "callback loopback",
    value,
    policy,
    "2026-07-25T23:00:00Z",
    "callback_loopback_forbidden",
  );
}
{
  const value = clone(draft);
  value.requester.callback_uri =
    "https://192.168.1.2/callback";
  expectReason(
    "callback private IP",
    value,
    policy,
    "2026-07-25T23:00:00Z",
    "callback_private_ip_literal_forbidden",
  );
}

const resultExample = JSON.parse(
  readFileSync(
    "examples/agent-paid-work-submission-admission-v1.example.json",
    "utf8",
  ),
);
assertCondition(
  resultExample.marker ===
    AGENT_PAID_WORK_SUBMISSION_ADMISSION_MARKER,
  "result example marker mismatch",
);
validateAgentPaidWorkSubmissionAdmissionV1(
  resultExample,
  workOrder,
  policy,
  "2026-07-25T23:00:00Z",
);

const schema = JSON.parse(
  readFileSync(
    "schemas/agent-paid-work-submission-admission-v1.schema.json",
    "utf8",
  ),
);
assertCondition(
  schema.$id ===
    "https://voidchain.io/schemas/agent-paid-work-submission-admission-v1.schema.json",
  "schema ID mismatch",
);
assertCondition(
  schema.properties.decision.enum.includes(
    "accepted_for_review",
  ),
  "schema missing accepted decision",
);
assertCondition(
  schema.properties.decision.enum.includes(
    "rejected",
  ),
  "schema missing rejected decision",
);

const docs = readFileSync(
  "docs/public/agent-paid-work-submission-admission-v1.md",
  "utf8",
);
for (const phrase of [
  "accepted_for_review",
  "does not select a provider",
  "does not create a quote",
  "does not authorize payment",
  "does not dispatch work",
  "does not write Work Credits",
]) {
  assertCondition(
    docs.includes(phrase),
    `documentation missing: ${phrase}`,
  );
}

const workflow = readFileSync(
  ".github/workflows/agent-paid-work-submission-admission-v1.yml",
  "utf8",
);
assertCondition(
  workflow.includes(
    "prove_agent_paid_work_submission_admission_v1.ts",
  ),
  "workflow missing proof",
);
assertCondition(
  workflow.includes("npm run build"),
  "workflow missing build",
);

console.log(
  "VOID_AGENT_PAID_WORK_SUBMISSION_ADMISSION_V1_PROOF_GREEN",
);
console.log("accepted_for_review=1");
console.log("admission_rejection_cases=12");
console.log("inherited_work_order_rejections=3");
console.log("deterministic_id=1");
console.log("provider_selected=0");
console.log("quote_created=0");
console.log("payment_authorized=0");
console.log("work_execution_authorized=0");
console.log("work_dispatched=0");
console.log("wc_award_authorized=0");
console.log("wc_ledger_write_authorized=0");
console.log("wallet_or_signer_access=0");
console.log("buy_void_fulfillment_authority=0");
