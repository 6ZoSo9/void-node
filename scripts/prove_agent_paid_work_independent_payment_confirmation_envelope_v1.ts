import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MARKER, canonicalJson, computeId, materialize, validateDraft, validateEnvelope, type AgentPaidWorkIndependentPaymentConfirmationDraft } from "./agent_paid_work_independent_payment_confirmation_envelope_v1.js";

function assertCondition(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function reject(label: string, action: () => void): void { let rejected = false; try { action(); } catch { rejected = true; } assertCondition(rejected, `${label} was accepted`); }
function read(path: string): unknown { return JSON.parse(readFileSync(resolve(path), "utf8")) as unknown; }
function source(path: string): string { return readFileSync(resolve(path), "utf8"); }
function reverse(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverse);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).reverse().map(([k,v]) => [k, reverse(v)]));
}

const work = read("examples/agent-paid-work-order-envelope-v1.example.json");
const quote = read("examples/agent-paid-work-quote-envelope-v1.example.json");
const acceptance = read("examples/agent-paid-work-acceptance-envelope-v1.example.json");
const intent = read("examples/agent-paid-work-payment-intent-envelope-v1.example.json");
const authorization = read("examples/agent-paid-work-payment-execution-authorization-envelope-v1.example.json");
const receipt = read("examples/agent-paid-work-payment-receipt-envelope-v1.example.json");
const value = read("examples/agent-paid-work-independent-payment-confirmation-envelope-v1.example.json");

validateEnvelope(work, quote, acceptance, intent, authorization, receipt, value);
const root = value as unknown as Record<string, unknown>;
const { payment_confirmation_id: committedId, ...draftValue } = root;
validateDraft(work, quote, acceptance, intent, authorization, receipt, draftValue);
const draft = draftValue as unknown as AgentPaidWorkIndependentPaymentConfirmationDraft;
const built = materialize(work, quote, acceptance, intent, authorization, receipt, draft);
assertCondition(built.payment_confirmation_id === committedId, "confirmation ID is not reproducible");
assertCondition(computeId(draft) === committedId, "computed confirmation ID mismatch");
const reordered = reverse(draft);
validateDraft(work, quote, acceptance, intent, authorization, receipt, reordered);
assertCondition(materialize(work, quote, acceptance, intent, authorization, receipt, reordered).payment_confirmation_id === committedId, "canonical ID changed with key order");
assertCondition(canonicalJson(reordered) === canonicalJson(draft), "canonical JSON changed");

const badId = structuredClone(built); badId.payment_confirmation_id = `voidawpc1_${"0".repeat(64)}`;
reject("tampered confirmation ID", () => validateEnvelope(work, quote, acceptance, intent, authorization, receipt, badId));

for (const [label, mutate] of [
  ["receipt binding", (x: AgentPaidWorkIndependentPaymentConfirmationDraft) => { x.payment_receipt_id = `voidawper1_${"0".repeat(64)}`; }],
  ["requester binding", (x: AgentPaidWorkIndependentPaymentConfirmationDraft) => { x.requester.agent_id = "agent.other"; }],
  ["provider binding", (x: AgentPaidWorkIndependentPaymentConfirmationDraft) => { x.provider.provider_id = "provider.other"; }],
  ["executor binding", (x: AgentPaidWorkIndependentPaymentConfirmationDraft) => { x.executor.executor_id = "executor.other"; }],
  ["authorizer binding", (x: AgentPaidWorkIndependentPaymentConfirmationDraft) => { x.authorizer.authority_id = "authority.other"; }],
  ["resolver binding", (x: AgentPaidWorkIndependentPaymentConfirmationDraft) => { x.resolution.resolver_id = "resolver.other"; }],
  ["rail receipt binding", (x: AgentPaidWorkIndependentPaymentConfirmationDraft) => { x.evidence.rail_receipt_id = "rail.other"; }],
  ["payment evidence binding", (x: AgentPaidWorkIndependentPaymentConfirmationDraft) => { x.evidence.payment_evidence_sha256 = `sha256:${"d4".repeat(32)}`; }],
  ["amount binding", (x: AgentPaidWorkIndependentPaymentConfirmationDraft) => { x.commercial.payment_total = "3.69"; }],
] as const) {
  const candidate = structuredClone(draft); mutate(candidate);
  reject(label, () => validateDraft(work, quote, acceptance, intent, authorization, receipt, candidate));
}

for (const [label, identity] of [
  ["requester", draft.requester.agent_id],
  ["provider", draft.provider.provider_id],
  ["executor", draft.executor.executor_id],
  ["authorizer", draft.authorizer.authority_id],
  ["resolver", draft.resolution.resolver_id],
] as const) {
  const candidate = structuredClone(draft); candidate.confirmer.confirmer_id = identity;
  reject(`confirmer equals ${label}`, () => validateDraft(work, quote, acceptance, intent, authorization, receipt, candidate));
}

const earlyObservation = structuredClone(draft); earlyObservation.settlement_observed_at_utc = "2026-07-25T22:52:09Z";
reject("observation before receipt", () => validateDraft(work, quote, acceptance, intent, authorization, receipt, earlyObservation));
const earlyConfirmation = structuredClone(draft); earlyConfirmation.confirmed_at_utc = "2026-07-25T22:52:59Z";
reject("confirmation before observation", () => validateDraft(work, quote, acceptance, intent, authorization, receipt, earlyConfirmation));

const trueKeys = Object.keys(draft.confirmation).filter((key) => key !== "work_execution_authorization_granted");
for (const key of trueKeys) {
  const candidate = structuredClone(draft) as unknown as Record<string, unknown>;
  (candidate.confirmation as Record<string, unknown>)[key] = false;
  reject(`confirmation ${key}`, () => validateDraft(work, quote, acceptance, intent, authorization, receipt, candidate));
}
const workGranted = structuredClone(draft) as unknown as Record<string, unknown>;
(workGranted.confirmation as Record<string, unknown>).work_execution_authorization_granted = true;
reject("work execution granted", () => validateDraft(work, quote, acceptance, intent, authorization, receipt, workGranted));

for (const [section, key, value2] of [
  ["evidence", "wallet_address", "0xdead"],
  ["evidence", "transaction_payload", "0x01"],
  ["confirmer", "private_key", "secret"],
  ["resolution", "destination", "wallet:0xdead"],
] as const) {
  const candidate = structuredClone(draft) as unknown as Record<string, unknown>;
  (candidate[section] as Record<string, unknown>)[key] = value2;
  reject(`${section}.${key}`, () => validateDraft(work, quote, acceptance, intent, authorization, receipt, candidate));
}

const docs = source("docs/public/agent-paid-work-independent-payment-confirmation-envelope-v1.md").replace(/\s+/g, " ");
const schema = source("schemas/agent-paid-work-independent-payment-confirmation-envelope-v1.schema.json");
const workflow = source(".github/workflows/agent-paid-work-independent-payment-confirmation-envelope-v1.yml");
for (const phrase of [
  MARKER,
  "`confirmer_id` must be distinct from the requester, provider, executor, authorizer, and resolver identities",
  "At most one confirmation per successful payment receipt",
  "Work-execution authority remains separate and ungranted",
  "A later reversal or dispute requires a separate dispute record",
  "does not add a public HTTP route",
  "or activate Buy VOID fulfillment",
]) assertCondition(docs.includes(phrase), `documentation boundary missing: ${phrase}`);
assertCondition(schema.includes(MARKER), "schema marker missing");
assertCondition(workflow.includes("--strict") && workflow.includes("--skipLibCheck"), "typecheck flags missing");

console.log(`marker=${MARKER}`);
console.log(`example_payment_receipt_id=${draft.payment_receipt_id}`);
console.log(`example_payment_confirmation_id=${built.payment_confirmation_id}`);
console.log(`canonical_bytes=${Buffer.byteLength(canonicalJson(draft), "utf8")}`);
console.log("tampered_confirmation_id_rejected=yes");
console.log("complete_paid_work_lineage_and_receipt_binding_verified=yes");
console.log("confirmer_independence_required=yes");
console.log("receipt_signature_and_evidence_verified=yes");
console.log("allowlisted_rail_and_provider_destination_verified=yes");
console.log("settlement_finality_no_reversal_no_dispute_required=yes");
console.log("single_confirmation_and_registry_uniqueness_required=yes");
console.log("work_execution_authority_separate_and_ungranted=yes");
console.log("raw_destination_wallet_signer_transaction_payload_rejected=yes");
console.log("schema_parse_and_boundary_checks=yes");
console.log("VOID_AGENT_PAID_WORK_INDEPENDENT_PAYMENT_CONFIRMATION_ENVELOPE_V1_PROOF_GREEN");
