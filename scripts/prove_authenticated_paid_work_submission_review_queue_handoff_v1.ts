import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  canonicalJson,
  enqueueReviewQueueItemV1,
  materializeReviewQueueItemV1,
  parseAcceptedIntakeReceiptV1,
  validateReviewQueueItemV1,
} from "./authenticated_paid_work_submission_review_queue_handoff_v1.js";

function ok(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function rejects(label: string, action: () => void): void {
  let rejected = false;
  try { action(); } catch { rejected = true; }
  ok(rejected, `${label} was not rejected`);
}

const h = (value: string) => value.repeat(64);
const receipt = {
  marker: "VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_RECEIPT_V1",
  version: 1,
  submission_id: "agent-paid-work-submission-example-v1",
  work_order_id: `voidawo1_${h("0")}`,
  request_payload_sha256: h("1"),
  canonical_request_sha256: h("2"),
  admission_id: `voidawsa1_${h("3")}`,
  admission: {
    marker: "VOID_AGENT_PAID_WORK_SUBMISSION_ADMISSION_V1",
    version: 1,
    admission_id: `voidawsa1_${h("3")}`,
    work_order_id: `voidawo1_${h("0")}`,
    policy_id: "void.policy.agent-paid-work-submission-admission.v1",
    evaluated_at_utc: "2026-07-30T15:30:12Z",
    decision: "accepted_for_review",
    reason_codes: [],
    normalized: {
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
  },
  received_at_utc: "2026-07-30T15:30:13Z",
  authorization_verified: true,
  authentication: {
    mode: "credential_registry",
    registry_id: `voidapwcr1_${h("4")}`,
    credential_id: `voidapwc1_${h("5")}`,
    agent_id: "agent.example.researcher",
    scope: "agent_paid_work_submit",
  },
  loopback_source: true,
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
  receipt_id: `voidawsi1_${h("1")}`,
};

parseAcceptedIntakeReceiptV1(receipt);
const queuedAt = "2026-07-30T15:49:00Z";
const firstMaterialized = materializeReviewQueueItemV1(receipt, queuedAt);
const secondMaterialized = materializeReviewQueueItemV1(receipt, queuedAt);
ok(canonicalJson(firstMaterialized) === canonicalJson(secondMaterialized), "materialization is not deterministic");
validateReviewQueueItemV1(firstMaterialized, receipt);
ok(firstMaterialized.status === "received_pending_operator_review", "queue status mismatch");

for (const [key, value] of Object.entries(firstMaterialized.review_boundary)) {
  if (key === "operator_review_required") ok(value === true, `${key} must be true`);
  else ok(value === false, `${key} must be false`);
}

const root = mkdtempSync(path.join(tmpdir(), "void-review-queue-proof-"));
try {
  const first = enqueueReviewQueueItemV1(receipt, queuedAt, root);
  ok(first.duplicate === false, "first enqueue marked duplicate");
  ok(first.recovered_orphan_item === false, "first enqueue marked recovery");
  rmSync(first.receipt_index_path);
  const recovered = enqueueReviewQueueItemV1(receipt, "2026-07-30T15:50:00Z", root);
  ok(recovered.duplicate === false, "orphan recovery marked duplicate");
  ok(recovered.recovered_orphan_item === true, "orphan item was not recovered");
  ok(recovered.queue_item.queue_item_id === first.queue_item.queue_item_id, "orphan recovery changed queue item ID");
  ok(recovered.queue_item.queued_at_utc === first.queue_item.queued_at_utc, "orphan recovery did not return stored item");

  const second = enqueueReviewQueueItemV1(receipt, "2026-07-30T15:51:00Z", root);
  ok(second.duplicate === true, "repeat enqueue not classified duplicate");
  ok(second.queue_item.queue_item_id === first.queue_item.queue_item_id, "duplicate changed queue item");
  ok(readdirSync(path.join(root, "items")).length === 1, "more than one queue item written");
  ok(readdirSync(path.join(root, "receipt-indexes")).length === 1, "more than one receipt index written");
  validateReviewQueueItemV1(JSON.parse(readFileSync(first.queue_item_path, "utf8")), receipt);
} finally {
  rmSync(root, { recursive: true, force: true });
}

for (const [label, mutate] of [
  ["authorization", (v: any) => { v.authorization_verified = false; }],
  ["authentication", (v: any) => { v.authentication.mode = "single_token_fallback"; }],
  ["rejected admission", (v: any) => { v.admission.decision = "rejected"; v.admission.reason_codes = ["quote_asset_not_allowed"]; }],
  ["duplicate receipt", (v: any) => { v.duplicate = true; }],
  ["receipt authority", (v: any) => { v.authority.quote_created = true; }],
  ["admission authority", (v: any) => { v.admission.authority.payment_authorized = true; }],
  ["work-order binding", (v: any) => { v.admission.work_order_id = `voidawo1_${h("9")}`; }],
] as const) {
  const candidate = structuredClone(receipt);
  mutate(candidate);
  rejects(label, () => parseAcceptedIntakeReceiptV1(candidate));
}

const tampered: any = structuredClone(firstMaterialized);
tampered.review_boundary.quote_creation_granted = true;
rejects("queue item authority", () => validateReviewQueueItemV1(tampered, receipt));

const schema = JSON.parse(readFileSync("schemas/authenticated-paid-work-submission-review-queue-handoff-v1.schema.json", "utf8"));
ok(schema.x_void_marker === "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_REVIEW_QUEUE_ITEM_V1", "schema marker mismatch");
const example = JSON.parse(readFileSync("examples/authenticated-paid-work-submission-review-queue-handoff-v1.example.json", "utf8"));
ok(example.marker === "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_REVIEW_QUEUE_ITEM_V1", "example marker mismatch");
const docs = readFileSync("docs/public-agent/authenticated-paid-work-submission-review-queue-handoff-v1.md", "utf8");
for (const phrase of ["accepted_for_review", "received_pending_operator_review", "provider selection", "quote creation", "no payment", "no work execution", "no Work Credit"]) ok(docs.includes(phrase), `docs missing ${phrase}`);

console.log(`queue_item_id=${firstMaterialized.queue_item_id}`);
console.log("deterministic_materialization=true");
console.log("append_once_first_enqueue=true");
console.log("receipt_stable_queue_item_identity=true");
console.log("orphan_item_recovery_exact=true");
console.log("exact_duplicate_classified=true");
console.log("single_queue_item_per_receipt=true");
console.log("credential_registry_authentication_required=true");
console.log("accepted_for_review_required=true");
console.log("provider_selection=false");
console.log("quote_creation=false");
console.log("payment_execution=false");
console.log("paid_work_execution=false");
console.log("wc_ledger_write=false");
console.log("void_settlement=false");
console.log("VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_REVIEW_QUEUE_HANDOFF_V1_EXACT_GREEN");
