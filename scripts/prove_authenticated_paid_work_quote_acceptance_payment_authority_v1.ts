import fs from "node:fs";
import path from "node:path";
import {
  canonicalJson,
} from "./agent_paid_work_order_envelope_v1.js";
import {
  materializeAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1,
  verifyAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1,
} from "./authenticated_paid_work_quote_acceptance_payment_authority_v1.js";
import {
  validateAgentPaidWorkAcceptanceEnvelope,
} from "./agent_paid_work_acceptance_envelope_v1.js";
import {
  validateAgentPaidWorkPaymentIntentEnvelope,
} from "./agent_paid_work_payment_intent_envelope_v1.js";

const MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_V1_EXACT_GREEN";
const EXPECTED_PACKET_ID = "voidawqapa1_38e3b5cf60f4ac216868611a5f30ea01944af59fdaff9517430576373367a751";
const EXPECTED_ACCEPTANCE_ID =
  "voidawa1_7bb7b211291dafe6eb6b26bc9518ecf9b33ce53ab8105cb24e627462ec641ec5";
const EXPECTED_PAYMENT_INTENT_ID =
  "voidawpi1_8f49079dffbc17bf18fa9bfae498b43f6acb5e63f637235687406085f77739f2";

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) fail(message);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readJson(relative: string): unknown {
  const resolved = path.resolve(relative);
  const metadata = fs.lstatSync(resolved);
  assertCondition(!metadata.isSymbolicLink(), `symlink forbidden: ${relative}`);
  assertCondition(metadata.isFile(), `regular file required: ${relative}`);
  return JSON.parse(fs.readFileSync(resolved, "utf8")) as unknown;
}

function readText(relative: string): string {
  const resolved = path.resolve(relative);
  const metadata = fs.lstatSync(resolved);
  assertCondition(!metadata.isSymbolicLink(), `symlink forbidden: ${relative}`);
  assertCondition(metadata.isFile(), `regular file required: ${relative}`);
  return fs.readFileSync(resolved, "utf8");
}

function expectReject(label: string, action: () => unknown): void {
  let rejected = false;
  try {
    action();
  } catch {
    rejected = true;
  }
  assertCondition(rejected, `${label} was not rejected`);
}

const inputPath =
  "examples/authenticated-paid-work-quote-acceptance-payment-authority-v1.example.json";
const schemaPath =
  "schemas/authenticated-paid-work-quote-acceptance-payment-authority-v1.schema.json";
const docsPath =
  "docs/operations/authenticated-paid-work-quote-acceptance-payment-authority-v1.md";
const adapterPath =
  "scripts/authenticated_paid_work_quote_acceptance_payment_authority_v1.ts";
const proofPath =
  "scripts/prove_authenticated_paid_work_quote_acceptance_payment_authority_v1.ts";
const workflowPath =
  ".github/workflows/authenticated-paid-work-quote-acceptance-payment-authority-v1.yml";

const input = readJson(inputPath) as Record<string, unknown>;
const packet =
  materializeAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1(input);
verifyAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1(input, packet);

assertCondition(
  packet.marker ===
    "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_PACKET_V1",
  "packet marker mismatch",
);
assertCondition(
  /^voidawqapa1_[0-9a-f]{64}$/.test(packet.packet_id),
  "packet ID format mismatch",
);
assertCondition(
  packet.packet_id === EXPECTED_PACKET_ID,
  `fixture packet ID changed: ${packet.packet_id}`,
);
assertCondition(
  packet.status === "prepared_requires_authenticated_atomic_activation",
  "packet status changed",
);
assertCondition(
  packet.prepared_artifacts.acceptance_envelope.acceptance_id ===
    EXPECTED_ACCEPTANCE_ID,
  "canonical acceptance ID changed",
);
assertCondition(
  packet.prepared_artifacts.payment_intent_envelope.payment_intent_id ===
    EXPECTED_PAYMENT_INTENT_ID,
  "canonical payment-intent ID changed",
);

validateAgentPaidWorkAcceptanceEnvelope(
  input.work_order,
  input.quote,
  packet.prepared_artifacts.acceptance_envelope,
);
validateAgentPaidWorkPaymentIntentEnvelope(
  input.work_order,
  input.quote,
  packet.prepared_artifacts.acceptance_envelope,
  packet.prepared_artifacts.payment_intent_envelope,
);

assertCondition(
  packet.acceptance_gate.acceptance_candidate_materialized === true,
  "acceptance candidate not materialized",
);
assertCondition(
  packet.acceptance_gate.quote_terms_recorded_as_accepted === true,
  "quote terms were not recorded as accepted",
);
assertCondition(
  packet.acceptance_gate.effective_quote_acceptance === false,
  "prepare-only packet became effective quote acceptance",
);
assertCondition(
  packet.payment_authority_gate.payment_intent_candidate_materialized === true,
  "payment-intent candidate not materialized",
);
assertCondition(
  packet.payment_authority_gate.payment_authorization_requested === true,
  "payment authorization request changed",
);
assertCondition(
  packet.payment_authority_gate.effective_payment_authorization === false,
  "prepare-only packet became effective payment authority",
);
assertCondition(
  packet.payment_authority_gate.payment_execution_authorization_id === null,
  "prepare-only packet created payment-execution authorization ID",
);
assertCondition(
  packet.payment_authority_gate.payment_execution_authorized === false,
  "prepare-only packet authorized payment execution",
);
assertCondition(
  Object.values(packet.authority).every((value) => value === false),
  "prepare-only packet granted authority",
);
assertCondition(
  packet.next_gate.payment_execution_authorization_required_after_activation === true,
  "separate payment-execution authorization requirement changed",
);
assertCondition(
  packet.next_gate.payment_confirmation_required_before_work_execution === true,
  "payment confirmation boundary changed",
);
assertCondition(
  packet.next_gate.separate_work_execution_authorization_required === true,
  "separate work authorization boundary changed",
);

const reorderedInput = {
  nonce: input.nonce,
  controls: input.controls,
  payment_authority_plan: input.payment_authority_plan,
  acceptance_plan: input.acceptance_plan,
  quote: input.quote,
  work_order: input.work_order,
  version: input.version,
  marker: input.marker,
};
const reordered =
  materializeAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1(
    reorderedInput,
  );
assertCondition(
  reordered.packet_id === packet.packet_id,
  "input key order changed packet ID",
);
assertCondition(
  canonicalJson(reordered) === canonicalJson(packet),
  "input key order changed packet",
);

const changedNonce = clone(input);
changedNonce.nonce = "quote-acceptance-payment-authority-example-20260725-0002";
const changedNoncePacket =
  materializeAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1(
    changedNonce,
  );
assertCondition(
  changedNoncePacket.packet_id !== packet.packet_id,
  "outer nonce did not change packet ID",
);

for (const [label, mutate] of [
  ["acceptance before quote", (value: Record<string, unknown>) => {
    (value.acceptance_plan as Record<string, unknown>).created_at_utc =
      "2026-07-25T22:34:59Z";
  }],
  ["payment before acceptance", (value: Record<string, unknown>) => {
    (value.payment_authority_plan as Record<string, unknown>).created_at_utc =
      "2026-07-25T22:39:59Z";
  }],
  ["fee ceiling exceeds work order", (value: Record<string, unknown>) => {
    (value.payment_authority_plan as Record<string, unknown>).max_fee_total =
      "2.00";
  }],
  ["prepare-only disabled", (value: Record<string, unknown>) => {
    (value.controls as Record<string, unknown>).prepare_only = false;
  }],
  ["payment execution boundary disabled", (value: Record<string, unknown>) => {
    (value.controls as Record<string, unknown>)
      .separate_payment_execution_authorization_required = false;
  }],
  ["quote total tampering", (value: Record<string, unknown>) => {
    ((value.quote as Record<string, unknown>).commercial as Record<string, unknown>)
      .total = "3.49";
  }],
] as const) {
  const candidate = clone(input);
  mutate(candidate);
  expectReject(label, () =>
    materializeAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1(
      candidate,
    ),
  );
}

const extraKey = clone(input);
extraKey.unexpected = true;
expectReject("unexpected root key", () =>
  materializeAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1(extraKey),
);

const tamperedPacket = clone(packet) as unknown as Record<string, unknown>;
(tamperedPacket.authority as Record<string, unknown>).payment_execution = true;
expectReject("packet authority tampering", () =>
  verifyAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1(
    input,
    tamperedPacket,
  ),
);

const schema = readJson(schemaPath) as Record<string, unknown>;
assertCondition(
  schema.x_void_marker ===
    "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_SCHEMA_V1",
  "schema marker mismatch",
);
const docs = readText(docsPath);
const adapter = readText(adapterPath);
const proof = readText(proofPath);
const workflow = readText(workflowPath);

for (const required of [
  "prepared_requires_authenticated_atomic_activation",
  "effective_quote_acceptance=false",
  "effective_payment_authorization=false",
  "payment_execution_authorized=false",
  "work_dispatch=false",
  "money_movement=false",
  "requester-authentication ID consumption",
  "provider-authentication ID consumption",
  "acceptance ID consumption",
  "payment-intent ID consumption",
]) {
  assertCondition(
    docs.includes(required),
    `docs omitted boundary: ${required}`,
  );
}
assertCondition(
  adapter.includes("materializeAgentPaidWorkAcceptance"),
  "adapter does not reuse canonical acceptance materializer",
);
assertCondition(
  adapter.includes("materializeAgentPaidWorkPaymentIntent"),
  "adapter does not reuse canonical payment-intent materializer",
);
assertCondition(
  !adapter.includes("materializeAgentPaidWorkPaymentExecutionAuthorization"),
  "adapter imported payment-execution authorization materialization",
);
assertCondition(
  !adapter.includes("src/index.ts"),
  "adapter references runtime index",
);
assertCondition(
  proof.includes(EXPECTED_ACCEPTANCE_ID),
  "proof does not pin canonical acceptance ID",
);
assertCondition(
  proof.includes(EXPECTED_PAYMENT_INTENT_ID),
  "proof does not pin canonical payment-intent ID",
);
for (const required of [
  "prove_agent_paid_work_quote_envelope_v1.ts",
  "prove_agent_paid_work_acceptance_envelope_v1.ts",
  "prove_agent_paid_work_payment_intent_envelope_v1.ts",
  "prove_authenticated_paid_work_quote_acceptance_payment_authority_v1.ts",
]) {
  assertCondition(
    workflow.includes(required),
    `workflow omitted proof: ${required}`,
  );
}

console.log(`packet_id=${packet.packet_id}`);
console.log(
  `acceptance_id=${packet.prepared_artifacts.acceptance_envelope.acceptance_id}`,
);
console.log(
  `payment_intent_id=${packet.prepared_artifacts.payment_intent_envelope.payment_intent_id}`,
);
console.log("canonical_acceptance_materialization=true");
console.log("canonical_payment_intent_materialization=true");
console.log("deterministic_packet_identity=true");
console.log("input_key_order_stable=true");
console.log("exact_quote_total_and_fee_cap_enforced=true");
console.log("authenticated_atomic_activation_required=true");
console.log("replay_consumption_required=true");
console.log("atomic_persistence_receipt_required=true");
console.log("effective_quote_acceptance=false");
console.log("effective_payment_authorization=false");
console.log("payment_execution_authorized=false");
console.log("work_execution_authorization=false");
console.log("work_dispatch=false");
console.log("wallet_access=false");
console.log("work_credit_write=false");
console.log("void_settlement=false");
console.log("runtime_mutation=false");
console.log("money_movement=false");
console.log("canonical_contract_integration=true");
console.log(MARKER);
