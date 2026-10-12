import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AGENT_PAID_WORK_WC_LEDGER_WRITE_RECEIPT_MARKER,
  canonicalJson,
  computeAgentPaidWorkWcLedgerWriteReceiptId,
  materializeAgentPaidWorkWcLedgerWriteReceipt,
  validateAgentPaidWorkWcLedgerWriteReceiptDraft,
  validateAgentPaidWorkWcLedgerWriteReceiptEnvelope,
  type AgentPaidWorkWcLedgerWriteReceiptDraft,
} from "./agent_paid_work_wc_ledger_write_receipt_envelope_v1.js";

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function expectReject(label: string, action: () => void): void {
  let rejected = false;
  try {
    action();
  } catch {
    rejected = true;
  }
  assertCondition(rejected, `${label} was unexpectedly accepted`);
}

function readText(path: string): string {
  return readFileSync(resolve(path), "utf8");
}

function readJson(path: string): unknown {
  return JSON.parse(readText(path)) as unknown;
}

function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(reverseObjectKeys);
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .reverse()
      .map(([key, child]) => [key, reverseObjectKeys(child)]),
  );
}

const workOrder = readJson(
  "examples/agent-paid-work-order-envelope-v1.example.json",
);
const quote = readJson(
  "examples/agent-paid-work-quote-envelope-v1.example.json",
);
const acceptance = readJson(
  "examples/agent-paid-work-acceptance-envelope-v1.example.json",
);
const paymentIntent = readJson(
  "examples/agent-paid-work-payment-intent-envelope-v1.example.json",
);
const paymentExecutionAuthorization = readJson(
  "examples/agent-paid-work-payment-execution-authorization-envelope-v1.example.json",
);
const paymentReceipt = readJson(
  "examples/agent-paid-work-payment-receipt-envelope-v1.example.json",
);
const paymentConfirmation = readJson(
  "examples/agent-paid-work-independent-payment-confirmation-envelope-v1.example.json",
);
const workExecutionAuthorization = readJson(
  "examples/agent-paid-work-execution-authorization-envelope-v1.example.json",
);
const completionReceipt = readJson(
  "examples/agent-paid-work-completion-receipt-envelope-v1.example.json",
);
const independentCompletionVerification = readJson(
  "examples/agent-paid-work-independent-completion-verification-envelope-v1.example.json",
);
const wcAwardAuthorization = readJson(
  "examples/agent-paid-work-wc-award-authorization-envelope-v1.example.json",
);
const receiptValue = readJson(
  "examples/agent-paid-work-wc-ledger-write-receipt-envelope-v1.example.json",
);

validateAgentPaidWorkWcLedgerWriteReceiptEnvelope(
  workOrder,
  quote,
  acceptance,
  paymentIntent,
  paymentExecutionAuthorization,
  paymentReceipt,
  paymentConfirmation,
  workExecutionAuthorization,
  completionReceipt,
  independentCompletionVerification,
  wcAwardAuthorization,
  receiptValue,
);

const receiptRecord =
  receiptValue as unknown as Record<string, unknown>;
const {
  wc_ledger_write_receipt_id: committedReceiptId,
  ...draftValue
} = receiptRecord;

validateAgentPaidWorkWcLedgerWriteReceiptDraft(
  workOrder,
  quote,
  acceptance,
  paymentIntent,
  paymentExecutionAuthorization,
  paymentReceipt,
  paymentConfirmation,
  workExecutionAuthorization,
  completionReceipt,
  independentCompletionVerification,
  wcAwardAuthorization,
  draftValue,
);

const draft =
  draftValue as unknown as AgentPaidWorkWcLedgerWriteReceiptDraft;

const materialized = materializeAgentPaidWorkWcLedgerWriteReceipt(
  workOrder,
  quote,
  acceptance,
  paymentIntent,
  paymentExecutionAuthorization,
  paymentReceipt,
  paymentConfirmation,
  workExecutionAuthorization,
  completionReceipt,
  independentCompletionVerification,
  wcAwardAuthorization,
  draft,
);

assertCondition(
  materialized.wc_ledger_write_receipt_id === committedReceiptId,
  "committed WC ledger-write receipt ID is not reproducible",
);
assertCondition(
  materialized.wc_ledger_write_receipt_id ===
    computeAgentPaidWorkWcLedgerWriteReceiptId(draft),
  "computed WC ledger-write receipt ID mismatch",
);

const reordered = reverseObjectKeys(draft);
validateAgentPaidWorkWcLedgerWriteReceiptDraft(
  workOrder,
  quote,
  acceptance,
  paymentIntent,
  paymentExecutionAuthorization,
  paymentReceipt,
  paymentConfirmation,
  workExecutionAuthorization,
  completionReceipt,
  independentCompletionVerification,
  wcAwardAuthorization,
  reordered,
);
assertCondition(
  materializeAgentPaidWorkWcLedgerWriteReceipt(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    workExecutionAuthorization,
    completionReceipt,
    independentCompletionVerification,
    wcAwardAuthorization,
    reordered,
  ).wc_ledger_write_receipt_id ===
    materialized.wc_ledger_write_receipt_id,
  "canonical receipt ID changed when object key order changed",
);
assertCondition(
  canonicalJson(reordered) === canonicalJson(draft),
  "canonical receipt JSON changed when object key order changed",
);

const badId = structuredClone(materialized);
badId.wc_ledger_write_receipt_id =
  `voidawwclwr1_${"0".repeat(64)}`;
expectReject("tampered WC ledger-write receipt ID", () =>
  validateAgentPaidWorkWcLedgerWriteReceiptEnvelope(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    workExecutionAuthorization,
    completionReceipt,
    independentCompletionVerification,
    wcAwardAuthorization,
    badId,
  ),
);

function rejectDraft(label: string, candidate: unknown): void {
  expectReject(label, () =>
    validateAgentPaidWorkWcLedgerWriteReceiptDraft(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      workExecutionAuthorization,
      completionReceipt,
      independentCompletionVerification,
      wcAwardAuthorization,
      candidate,
    ),
  );
}

const lineageMutations: Array<
  [
    string,
    keyof Pick<
      AgentPaidWorkWcLedgerWriteReceiptDraft,
      | "work_order_id"
      | "quote_id"
      | "acceptance_id"
      | "payment_intent_id"
      | "payment_execution_authorization_id"
      | "payment_receipt_id"
      | "payment_confirmation_id"
      | "work_execution_authorization_id"
      | "work_completion_receipt_id"
      | "independent_completion_verification_id"
      | "wc_award_authorization_id"
    >,
    string,
  ]
> = [
  ["work-order binding", "work_order_id", `voidawo1_${"0".repeat(64)}`],
  ["quote binding", "quote_id", `voidawq1_${"0".repeat(64)}`],
  ["acceptance binding", "acceptance_id", `voidawa1_${"0".repeat(64)}`],
  ["payment-intent binding", "payment_intent_id", `voidawpi1_${"0".repeat(64)}`],
  [
    "payment-execution-authorization binding",
    "payment_execution_authorization_id",
    `voidawpea1_${"0".repeat(64)}`,
  ],
  ["payment-receipt binding", "payment_receipt_id", `voidawper1_${"0".repeat(64)}`],
  [
    "payment-confirmation binding",
    "payment_confirmation_id",
    `voidawpc1_${"0".repeat(64)}`,
  ],
  [
    "work-execution-authorization binding",
    "work_execution_authorization_id",
    `voidawwea1_${"0".repeat(64)}`,
  ],
  [
    "completion-receipt binding",
    "work_completion_receipt_id",
    `voidawcr1_${"0".repeat(64)}`,
  ],
  [
    "independent-verification binding",
    "independent_completion_verification_id",
    `voidawicv1_${"0".repeat(64)}`,
  ],
  [
    "WC-award-authorization binding",
    "wc_award_authorization_id",
    `voidawwcaa1_${"0".repeat(64)}`,
  ],
];

for (const [label, key, replacement] of lineageMutations) {
  const candidate = structuredClone(draft);
  candidate[key] = replacement;
  rejectDraft(label, candidate);
}

for (const [label, mutate] of [
  [
    "beneficiary executor binding",
    (candidate: AgentPaidWorkWcLedgerWriteReceiptDraft) => {
      candidate.beneficiary.executor_id = "void.executor.other";
    },
  ],
  [
    "beneficiary provider binding",
    (candidate: AgentPaidWorkWcLedgerWriteReceiptDraft) => {
      candidate.beneficiary.provider_id = "void.provider.other";
    },
  ],
  [
    "beneficiary WC-account binding",
    (candidate: AgentPaidWorkWcLedgerWriteReceiptDraft) => {
      candidate.beneficiary.wc_account_id = "void-other-account";
    },
  ],
  [
    "award amount binding",
    (candidate: AgentPaidWorkWcLedgerWriteReceiptDraft) => {
      candidate.award.amount_wc = 4;
    },
  ],
  [
    "award reason binding",
    (candidate: AgentPaidWorkWcLedgerWriteReceiptDraft) => {
      candidate.award.award_reason_code = "other_reason";
    },
  ],
  [
    "award policy binding",
    (candidate: AgentPaidWorkWcLedgerWriteReceiptDraft) => {
      candidate.award.award_policy_id = "void.policy.other";
    },
  ],
  [
    "award score-basis binding",
    (candidate: AgentPaidWorkWcLedgerWriteReceiptDraft) => {
      candidate.award.score_basis_sha256 =
        `sha256:${"0".repeat(64)}`;
    },
  ],
  [
    "ledger identifier binding",
    (candidate: AgentPaidWorkWcLedgerWriteReceiptDraft) => {
      candidate.ledger_write.ledger_id = "void.wc.other-ledger";
    },
  ],
  [
    "ledger uniqueness binding",
    (candidate: AgentPaidWorkWcLedgerWriteReceiptDraft) => {
      candidate.ledger_write.uniqueness_key =
        `paid-work-verification:voidawicv1_${"0".repeat(64)}`;
    },
  ],
  [
    "authorization expected-prestate binding",
    (candidate: AgentPaidWorkWcLedgerWriteReceiptDraft) => {
      candidate.state_transition.expected_prestate_sha256 =
        `sha256:${"0".repeat(64)}`;
      candidate.state_transition.observed_prestate_sha256 =
        `sha256:${"0".repeat(64)}`;
    },
  ],
] as const) {
  const candidate = structuredClone(draft);
  mutate(candidate);
  rejectDraft(label, candidate);
}

const zeroAward = structuredClone(draft);
zeroAward.award.amount_wc = 0;
rejectDraft("zero WC award receipt", zeroAward);

const wrongDenomination =
  structuredClone(draft) as unknown as Record<string, unknown>;
(wrongDenomination.award as Record<string, unknown>).denomination = "VOID";
rejectDraft("non-WC denomination", wrongDenomination);

for (const [section, key, replacement] of [
  ["ledger_write", "entry_type", "debit"],
  ["ledger_write", "status", "failed"],
  ["ledger_write", "authorization_consumed", false],
  ["ledger_write", "atomic_write_confirmed", false],
  ["ledger_write", "uniqueness_key_enforced", false],
  ["ledger_write", "prestate_matched", false],
  ["ledger_write", "duplicate_detected", true],
] as const) {
  const candidate =
    structuredClone(draft) as unknown as Record<string, unknown>;
  (candidate[section] as Record<string, unknown>)[key] = replacement;
  rejectDraft(`${section}.${key}`, candidate);
}

for (const [label, mutate] of [
  [
    "authorization consumed before authorization creation",
    (candidate: AgentPaidWorkWcLedgerWriteReceiptDraft) => {
      candidate.ledger_write.authorization_consumed_at_utc =
        "2026-07-25T22:59:59Z";
    },
  ],
  [
    "authorization consumed after expiration",
    (candidate: AgentPaidWorkWcLedgerWriteReceiptDraft) => {
      candidate.ledger_write.authorization_consumed_at_utc =
        "2026-07-25T23:15:01Z";
      candidate.ledger_write.applied_at_utc =
        "2026-07-25T23:15:02Z";
      candidate.receipt_created_at_utc =
        "2026-07-25T23:15:03Z";
    },
  ],
  [
    "ledger application before authorization consumption",
    (candidate: AgentPaidWorkWcLedgerWriteReceiptDraft) => {
      candidate.ledger_write.applied_at_utc =
        "2026-07-25T23:00:00Z";
    },
  ],
  [
    "receipt creation before ledger application",
    (candidate: AgentPaidWorkWcLedgerWriteReceiptDraft) => {
      candidate.receipt_created_at_utc =
        "2026-07-25T23:00:01Z";
    },
  ],
] as const) {
  const candidate = structuredClone(draft);
  mutate(candidate);
  rejectDraft(label, candidate);
}

const prestateMismatch = structuredClone(draft);
prestateMismatch.state_transition.observed_prestate_sha256 =
  `sha256:${"0".repeat(64)}`;
rejectDraft("expected and observed prestate mismatch", prestateMismatch);

const sequenceNoIncrement = structuredClone(draft);
sequenceNoIncrement.state_transition.ledger_sequence_after =
  sequenceNoIncrement.state_transition.ledger_sequence_before;
rejectDraft("ledger sequence not incremented", sequenceNoIncrement);

const sequenceJump = structuredClone(draft);
sequenceJump.state_transition.ledger_sequence_after =
  sequenceJump.state_transition.ledger_sequence_before + 2;
rejectDraft("ledger sequence incremented by more than one", sequenceJump);

const earnedWrong = structuredClone(draft);
earnedWrong.state_transition.post_balance.earned_wc = 4;
earnedWrong.state_transition.post_balance.redeemable_wc = 4;
rejectDraft("earned WC arithmetic mismatch", earnedWrong);

const debitedChanged = structuredClone(draft);
debitedChanged.state_transition.post_balance.debited_wc = 1;
debitedChanged.state_transition.post_balance.redeemable_wc = 2;
rejectDraft("debited WC changed on earn entry", debitedChanged);

const redeemableWrong = structuredClone(draft);
redeemableWrong.state_transition.post_balance.redeemable_wc = 2;
rejectDraft("redeemable WC award arithmetic mismatch", redeemableWrong);

const preBalanceInvariantBroken = structuredClone(draft);
preBalanceInvariantBroken.state_transition.pre_balance.redeemable_wc = 1;
rejectDraft("pre-balance invariant mismatch", preBalanceInvariantBroken);

const postBalanceInvariantBroken = structuredClone(draft);
postBalanceInvariantBroken.state_transition.post_balance.redeemable_wc = 2;
rejectDraft("post-balance invariant mismatch", postBalanceInvariantBroken);

const debitedExceedsEarned = structuredClone(draft);
debitedExceedsEarned.state_transition.pre_balance.debited_wc = 1;
rejectDraft("pre debited WC exceeds earned WC", debitedExceedsEarned);

const ledgerExecutorEqualsAccount = structuredClone(draft);
ledgerExecutorEqualsAccount.ledger_executor.executor_id =
  ledgerExecutorEqualsAccount.beneficiary.wc_account_id;
rejectDraft(
  "ledger executor equals beneficiary WC account",
  ledgerExecutorEqualsAccount,
);

const invalidExecutorSignatureScheme =
  structuredClone(draft) as unknown as Record<string, unknown>;
(
  invalidExecutorSignatureScheme.ledger_executor as Record<string, unknown>
).signature_scheme = "secp256k1";
rejectDraft(
  "invalid ledger-executor signature scheme",
  invalidExecutorSignatureScheme,
);

for (const key of Object.keys(draft.attestation)) {
  const candidate =
    structuredClone(draft) as unknown as Record<string, unknown>;
  (candidate.attestation as Record<string, unknown>)[key] = false;
  rejectDraft(`attestation ${key}`, candidate);
}

for (const [label, mutate] of [
  [
    "ledger-entry evidence",
    (candidate: AgentPaidWorkWcLedgerWriteReceiptDraft) => {
      candidate.receipt_evidence.ledger_entry_sha256 =
        `sha256:${"0".repeat(64)}`;
    },
  ],
  [
    "append-log evidence",
    (candidate: AgentPaidWorkWcLedgerWriteReceiptDraft) => {
      candidate.receipt_evidence.append_log_sha256 =
        `sha256:${"0".repeat(64)}`;
    },
  ],
  [
    "authorization-verification evidence",
    (candidate: AgentPaidWorkWcLedgerWriteReceiptDraft) => {
      candidate.receipt_evidence.authorization_verification_sha256 =
        `sha256:${"0".repeat(64)}`;
    },
  ],
  [
    "uniqueness-registry evidence",
    (candidate: AgentPaidWorkWcLedgerWriteReceiptDraft) => {
      candidate.receipt_evidence.uniqueness_registry_sha256 =
        `sha256:${"0".repeat(64)}`;
    },
  ],
  [
    "balance-snapshot evidence",
    (candidate: AgentPaidWorkWcLedgerWriteReceiptDraft) => {
      candidate.receipt_evidence.balance_snapshot_sha256 =
        `sha256:${"0".repeat(64)}`;
    },
  ],
  [
    "poststate commitment",
    (candidate: AgentPaidWorkWcLedgerWriteReceiptDraft) => {
      candidate.state_transition.poststate_sha256 =
        `sha256:${"0".repeat(64)}`;
    },
  ],
] as const) {
  const candidate = structuredClone(draft);
  mutate(candidate);
  const altered = materializeAgentPaidWorkWcLedgerWriteReceipt(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    workExecutionAuthorization,
    completionReceipt,
    independentCompletionVerification,
    wcAwardAuthorization,
    candidate,
  );
  assertCondition(
    altered.wc_ledger_write_receipt_id !==
      materialized.wc_ledger_write_receipt_id,
    `${label} did not alter the receipt identity`,
  );
}

for (const [section, key, value] of [
  ["beneficiary", "wallet_address", "0xdead"],
  ["award", "void_amount", 1],
  ["ledger_write", "settle_to_void_now", true],
  ["receipt_evidence", "raw_ledger_entry", "embedded"],
  ["ledger_executor", "private_key", "secret"],
  ["attestation", "payment_executed", true],
] as const) {
  const candidate =
    structuredClone(draft) as unknown as Record<string, unknown>;
  (candidate[section] as Record<string, unknown>)[key] = value;
  rejectDraft(`${section}.${key} injection`, candidate);
}

const schemaText = readText(
  "schemas/agent-paid-work-wc-ledger-write-receipt-envelope-v1.schema.json",
);
const docs = readText(
  "docs/public/agent-paid-work-wc-ledger-write-receipt-envelope-v1.md",
);
const moduleSource = readText(
  "scripts/agent_paid_work_wc_ledger_write_receipt_envelope_v1.ts",
);
const schema = JSON.parse(schemaText) as Record<string, unknown>;

assertCondition(
  schema.$schema === "https://json-schema.org/draft/2020-12/schema",
  "schema draft mismatch",
);
assertCondition(
  schemaText.includes(AGENT_PAID_WORK_WC_LEDGER_WRITE_RECEIPT_MARKER),
  "schema marker missing",
);
assertCondition(
  schemaText.includes('"status": {'),
  "schema applied-status constraint missing",
);
assertCondition(
  schemaText.includes('"atomic_write_confirmed": {'),
  "schema atomic-write constraint missing",
);
assertCondition(
  docs.includes(AGENT_PAID_WORK_WC_LEDGER_WRITE_RECEIPT_MARKER),
  "documentation marker missing",
);
assertCondition(
  moduleSource.includes(
    "./agent_paid_work_wc_award_authorization_envelope_v1.js",
  ),
  "WC-award authorization validator binding missing",
);

const normalizedDocs = docs.replace(/\s+/g, " ");
for (const boundary of [
  "V1 covers step 12 only.",
  "V1 records successful applied writes only.",
  "Authorization consumption precedes or coincides with the applied write",
  "The destination account must match the account authorized for the beneficiary.",
  "`ledger_sequence_after` must equal `ledger_sequence_before + 1`",
  "redeemable WC must increase by exactly `amount_wc`",
  "No real account acquires WC merely because the example or schema exists.",
  "It proves only that an authorized WC earn entry was applied.",
  "`wc_to_void_settlement_separate=true`",
  "`payment_state_unchanged=true`",
  "`wallet_or_signer_not_accessed=true`",
  "`runtime_not_administered=true`",
  "`buy_void_fulfillment_unchanged=true`",
  "`receipt_is_not_wc_to_void_settlement=true`",
  "`receipt_is_not_payment_instruction=true`",
  "does not add a public HTTP route",
  "or activate Buy VOID fulfillment",
]) {
  assertCondition(
    normalizedDocs.includes(boundary),
    `documentation boundary missing: ${boundary}`,
  );
}

console.log(
  `marker=${AGENT_PAID_WORK_WC_LEDGER_WRITE_RECEIPT_MARKER}`,
);
console.log(
  `example_wc_award_authorization_id=${
    materialized.wc_award_authorization_id
  }`,
);
console.log(
  `example_wc_ledger_write_receipt_id=${
    materialized.wc_ledger_write_receipt_id
  }`,
);
console.log(`example_ledger_entry_id=${materialized.ledger_write.ledger_entry_id}`);
console.log(`example_amount_wc=${materialized.award.amount_wc}`);
console.log(
  `example_post_redeemable_wc=${
    materialized.state_transition.post_balance.redeemable_wc
  }`,
);
console.log(
  `canonical_bytes=${Buffer.byteLength(canonicalJson(draft), "utf8")}`,
);
console.log("tampered_wc_ledger_write_receipt_id_rejected=yes");
console.log("complete_paid_work_lineage_binding_verified=yes");
console.log("exact_wc_award_authorization_binding_verified=yes");
console.log("beneficiary_award_ledger_and_prestate_binding_verified=yes");
console.log("authorization_consumption_and_timestamp_ordering_enforced=yes");
console.log("single_applied_atomic_earn_entry_required=yes");
console.log("duplicate_and_replay_controls_enforced=yes");
console.log("ledger_sequence_increment_verified=yes");
console.log("earned_debited_redeemable_balance_arithmetic_verified=yes");
console.log("immutable_receipt_evidence_commitments_bound=yes");
console.log("ledger_executor_authentication_boundary_verified=yes");
console.log("wc_to_void_payment_wallet_runtime_boundaries_enforced=yes");
console.log("schema_parse_and_documentation_boundaries_verified=yes");
console.log(
  "VOID_AGENT_PAID_WORK_WC_LEDGER_WRITE_RECEIPT_ENVELOPE_V1_PROOF_GREEN",
);
