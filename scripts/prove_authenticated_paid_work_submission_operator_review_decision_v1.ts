import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  canonicalJson,
  decideOperatorReviewV1,
  materializeOperatorReviewDecisionV1,
  parseQueueItemV1,
  parseReceiptIndexV1,
  validateOperatorReviewDecisionV1,
} from "./authenticated_paid_work_submission_operator_review_decision_v1.js";

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}

function expectReject(label: string, action: () => void): void {
  let rejected = false;
  try {
    action();
  } catch {
    rejected = true;
  }
  assertCondition(rejected, `${label} was not rejected`);
}

const zero = "0".repeat(64);
const one = "1".repeat(64);
const two = "2".repeat(64);
const three = "3".repeat(64);
const four = "4".repeat(64);

const queue = {
  marker: "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_REVIEW_QUEUE_ITEM_V1",
  version: 1,
  queue_item_id: `voidapwsrq1_${zero}`,
  status: "received_pending_operator_review",
  queued_at_utc: "2026-07-30T19:42:25Z",
  receipt: {
    receipt_id: `voidawsi1_${one}`,
    submission_id: "agent-paid-work-submission-example-v1",
    work_order_id: `voidawo1_${two}`,
    request_payload_sha256: three,
    canonical_request_sha256: four,
    admission_id: `voidawsa1_${zero}`,
    received_at_utc: "2026-07-30T19:42:20Z",
  },
  authentication: {
    mode: "credential_registry",
    registry_id: `voidapwcr1_${one}`,
    credential_id: `voidapwc1_${two}`,
    agent_id: "void-zoso-operator-live-canary-v1",
    scope: "agent_paid_work_submit",
    authorization_verified: true,
  },
  admission: {
    policy_id: "void.policy.agent-paid-work-submission-admission.v1",
    decision: "accepted_for_review",
    reason_codes: [],
    capability_id: "datanet.fetch_verify",
    quote_asset: "USD",
    max_total: "3",
    max_runtime_seconds: 60,
    max_output_bytes: 65536,
    input_ref_count: 1,
    expected_output_count: 1,
    callback_scheme: "https",
    callback_host: "voidchain.io",
    ttl_seconds: 3600,
  },
  review_boundary: {
    operator_review_required: true,
    provider_selection_granted: false,
    quote_creation_granted: false,
    payment_authorization_granted: false,
    payment_execution_granted: false,
    work_execution_authorization_granted: false,
    work_dispatch_granted: false,
    wc_award_granted: false,
    wc_ledger_write_granted: false,
    void_settlement_granted: false,
    wallet_or_signer_access_granted: false,
    signing_granted: false,
    transaction_broadcast_granted: false,
    buy_void_fulfillment_granted: false,
  },
  next_action:
    "operator_review_before_provider_selection_or_quote_creation",
};

const receiptIndex = {
  marker:
    "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_REVIEW_QUEUE_RECEIPT_INDEX_V1",
  version: 1,
  receipt_id: queue.receipt.receipt_id,
  queue_item_id: queue.queue_item_id,
  queue_item_path: "/private/queue/items/example.json",
  submission_id: queue.receipt.submission_id,
  work_order_id: queue.receipt.work_order_id,
  request_payload_sha256: queue.receipt.request_payload_sha256,
  canonical_request_sha256: queue.receipt.canonical_request_sha256,
};

parseQueueItemV1(queue);
parseReceiptIndexV1(receiptIndex, parseQueueItemV1(queue));

const reviewedAt = "2026-07-30T19:50:00Z";
const operatorId = "zoso.local.operator";
const outcome = "approved_for_provider_selection";
const reasons = [
  "authenticated_intake_within_policy",
  "bounded_provider_selection_only",
];

const materialized = materializeOperatorReviewDecisionV1(
  queue,
  receiptIndex,
  reviewedAt,
  operatorId,
  outcome,
  reasons,
);
const materializedAgain = materializeOperatorReviewDecisionV1(
  queue,
  receiptIndex,
  reviewedAt,
  operatorId,
  outcome,
  [...reasons].reverse(),
);

assertCondition(
  canonicalJson(materialized) === canonicalJson(materializedAgain),
  "reason-code ordering changed materialization",
);
validateOperatorReviewDecisionV1(
  materialized,
  queue,
  receiptIndex,
);
assertCondition(
  materialized.provider_selection_eligible === true,
  "approved decision did not grant provider-selection eligibility",
);
assertCondition(
  materialized.authority.provider_selected === false,
  "approved decision selected a provider",
);
assertCondition(
  materialized.authority.quote_created === false,
  "approved decision created a quote",
);

const root = mkdtempSync(
  path.join(tmpdir(), "void-operator-review-proof-"),
);

try {
  const first = decideOperatorReviewV1(
    queue,
    receiptIndex,
    reviewedAt,
    operatorId,
    outcome,
    reasons,
    root,
  );
  assertCondition(first.duplicate === false, "first decision marked duplicate");
  assertCondition(
    first.recovered_orphan_decision === false,
    "first decision marked orphan recovery",
  );

  const second = decideOperatorReviewV1(
    queue,
    receiptIndex,
    "2026-07-30T19:51:00Z",
    operatorId,
    outcome,
    [...reasons].reverse(),
    root,
  );
  assertCondition(second.duplicate === true, "repeat decision not duplicate");
  assertCondition(
    second.decision.review_decision_id ===
      first.decision.review_decision_id,
    "repeat decision changed decision ID",
  );

  rmSync(first.index_path);

  const recovered = decideOperatorReviewV1(
    queue,
    receiptIndex,
    "2026-07-30T19:52:00Z",
    operatorId,
    outcome,
    reasons,
    root,
  );
  assertCondition(
    recovered.recovered_orphan_decision === true,
    "missing-index recovery was not classified",
  );
  assertCondition(
    recovered.decision.reviewed_at_utc === reviewedAt,
    "orphan recovery replaced stored reviewed_at_utc",
  );

  expectReject("conflicting outcome", () =>
    decideOperatorReviewV1(
      queue,
      receiptIndex,
      "2026-07-30T19:53:00Z",
      operatorId,
      "rejected_by_operator",
      ["operator_rejected_request"],
      root,
    ),
  );

  assertCondition(
    readdirSync(path.join(root, "decisions")).length === 1,
    "more than one decision file exists",
  );
  assertCondition(
    readdirSync(path.join(root, "queue-item-indexes")).length === 1,
    "more than one decision index exists",
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}

for (const [label, mutate] of [
  [
    "queue not pending review",
    (candidate: any) => {
      candidate.status = "approved_pending_provider_selection";
    },
  ],
  [
    "queue provider already selected",
    (candidate: any) => {
      candidate.review_boundary.provider_selection_granted = true;
    },
  ],
  [
    "queue unauthenticated",
    (candidate: any) => {
      candidate.authentication.authorization_verified = false;
    },
  ],
  [
    "queue rejected admission",
    (candidate: any) => {
      candidate.admission.decision = "rejected";
    },
  ],
] as const) {
  const candidate = structuredClone(queue);
  mutate(candidate);
  expectReject(label, () => parseQueueItemV1(candidate));
}

const badIndex = structuredClone(receiptIndex);
badIndex.queue_item_id = `voidapwsrq1_${four}`;
expectReject("receipt-index queue mismatch", () =>
  parseReceiptIndexV1(badIndex, parseQueueItemV1(queue)),
);

const tampered: any = structuredClone(materialized);
tampered.authority.quote_created = true;
expectReject("tampered decision authority", () =>
  validateOperatorReviewDecisionV1(
    tampered,
    queue,
    receiptIndex,
  ),
);

const rejected = materializeOperatorReviewDecisionV1(
  queue,
  receiptIndex,
  "2026-07-30T20:00:00Z",
  operatorId,
  "rejected_by_operator",
  ["operator_rejected_request"],
);
assertCondition(
  rejected.provider_selection_eligible === false,
  "rejected decision granted provider-selection eligibility",
);
assertCondition(
  rejected.status === "rejected_terminal",
  "rejected decision status mismatch",
);

const schema = JSON.parse(
  readFileSync(
    "schemas/authenticated-paid-work-submission-operator-review-decision-v1.schema.json",
    "utf8",
  ),
) as Record<string, unknown>;
assertCondition(
  schema["x_void_marker"] ===
    "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_OPERATOR_REVIEW_DECISION_V1",
  "schema marker mismatch",
);

const example = JSON.parse(
  readFileSync(
    "examples/authenticated-paid-work-submission-operator-review-decision-v1.example.json",
    "utf8",
  ),
) as Record<string, unknown>;
assertCondition(
  example.outcome === "approved_for_provider_selection",
  "example outcome mismatch",
);

const docs = readFileSync(
  "docs/public-agent/authenticated-paid-work-submission-operator-review-decision-v1.md",
  "utf8",
);
for (const phrase of [
  "provider selection eligibility",
  "does not select a provider",
  "does not create a quote",
  "one decision per queue item",
  "conflicting decision",
  "no payment",
  "no work execution",
  "no Work Credit",
]) {
  assertCondition(docs.includes(phrase), `docs missing phrase: ${phrase}`);
}

console.log(
  `review_decision_id=${materialized.review_decision_id}`,
);
console.log("stable_decision_identity=true");
console.log("one_decision_per_queue_item=true");
console.log("semantic_duplicate_classified=true");
console.log("orphan_decision_recovery_exact=true");
console.log("conflicting_decision_rejected=true");
console.log("provider_selection_eligibility_only=true");
console.log("provider_selected=false");
console.log("quote_created=false");
console.log("payment_executed=false");
console.log("work_executed=false");
console.log("wc_ledger_written=false");
console.log("void_settled=false");
console.log(
  "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_OPERATOR_REVIEW_DECISION_V1_EXACT_GREEN",
);
