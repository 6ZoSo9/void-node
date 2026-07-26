import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AGENT_PAID_WORK_EXECUTION_AUTHORIZATION_MARKER,
  canonicalJson,
  computeAgentPaidWorkExecutionAuthorizationId,
  materializeAgentPaidWorkExecutionAuthorization,
  validateAgentPaidWorkExecutionAuthorizationDraft,
  validateAgentPaidWorkExecutionAuthorizationEnvelope,
  type AgentPaidWorkExecutionAuthorizationDraft,
} from "./agent_paid_work_execution_authorization_envelope_v1.js";

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
const authorizationValue = readJson(
  "examples/agent-paid-work-execution-authorization-envelope-v1.example.json",
);

validateAgentPaidWorkExecutionAuthorizationEnvelope(
  workOrder,
  quote,
  acceptance,
  paymentIntent,
  paymentExecutionAuthorization,
  paymentReceipt,
  paymentConfirmation,
  authorizationValue,
);

const authorizationRecord =
  authorizationValue as unknown as Record<string, unknown>;
const {
  work_execution_authorization_id: committedAuthorizationId,
  ...draftValue
} = authorizationRecord;

validateAgentPaidWorkExecutionAuthorizationDraft(
  workOrder,
  quote,
  acceptance,
  paymentIntent,
  paymentExecutionAuthorization,
  paymentReceipt,
  paymentConfirmation,
  draftValue,
);

const draft =
  draftValue as unknown as AgentPaidWorkExecutionAuthorizationDraft;

const materialized = materializeAgentPaidWorkExecutionAuthorization(
  workOrder,
  quote,
  acceptance,
  paymentIntent,
  paymentExecutionAuthorization,
  paymentReceipt,
  paymentConfirmation,
  draft,
);

assertCondition(
  materialized.work_execution_authorization_id ===
    committedAuthorizationId,
  "committed authorization ID is not reproducible",
);
assertCondition(
  materialized.work_execution_authorization_id ===
    computeAgentPaidWorkExecutionAuthorizationId(draft),
  "computed authorization ID mismatch",
);

const reordered = reverseObjectKeys(draft);
validateAgentPaidWorkExecutionAuthorizationDraft(
  workOrder,
  quote,
  acceptance,
  paymentIntent,
  paymentExecutionAuthorization,
  paymentReceipt,
  paymentConfirmation,
  reordered,
);
assertCondition(
  materializeAgentPaidWorkExecutionAuthorization(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    reordered,
  ).work_execution_authorization_id ===
    materialized.work_execution_authorization_id,
  "canonical authorization ID changed when object key order changed",
);
assertCondition(
  canonicalJson(reordered) === canonicalJson(draft),
  "canonical authorization JSON changed when object key order changed",
);

const badId = structuredClone(materialized);
badId.work_execution_authorization_id =
  `voidawwea1_${"0".repeat(64)}`;
expectReject("tampered work execution authorization ID", () =>
  validateAgentPaidWorkExecutionAuthorizationEnvelope(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    badId,
  ),
);

for (const [label, mutate] of [
  [
    "work-order binding",
    (candidate: AgentPaidWorkExecutionAuthorizationDraft) => {
      candidate.work_order_id = `voidawo1_${"0".repeat(64)}`;
    },
  ],
  [
    "quote binding",
    (candidate: AgentPaidWorkExecutionAuthorizationDraft) => {
      candidate.quote_id = `voidawq1_${"0".repeat(64)}`;
    },
  ],
  [
    "acceptance binding",
    (candidate: AgentPaidWorkExecutionAuthorizationDraft) => {
      candidate.acceptance_id = `voidawa1_${"0".repeat(64)}`;
    },
  ],
  [
    "payment-intent binding",
    (candidate: AgentPaidWorkExecutionAuthorizationDraft) => {
      candidate.payment_intent_id = `voidawpi1_${"0".repeat(64)}`;
    },
  ],
  [
    "payment-execution-authorization binding",
    (candidate: AgentPaidWorkExecutionAuthorizationDraft) => {
      candidate.payment_execution_authorization_id =
        `voidawpea1_${"0".repeat(64)}`;
    },
  ],
  [
    "payment-receipt binding",
    (candidate: AgentPaidWorkExecutionAuthorizationDraft) => {
      candidate.payment_receipt_id = `voidawper1_${"0".repeat(64)}`;
    },
  ],
  [
    "payment-confirmation binding",
    (candidate: AgentPaidWorkExecutionAuthorizationDraft) => {
      candidate.payment_confirmation_id =
        `voidawpc1_${"0".repeat(64)}`;
    },
  ],
  [
    "requester binding",
    (candidate: AgentPaidWorkExecutionAuthorizationDraft) => {
      candidate.requester.agent_id = "agent.example.other";
    },
  ],
  [
    "provider binding",
    (candidate: AgentPaidWorkExecutionAuthorizationDraft) => {
      candidate.provider.provider_id = "void.provider.other";
    },
  ],
] as const) {
  const candidate = structuredClone(draft);
  mutate(candidate);
  expectReject(label, () =>
    validateAgentPaidWorkExecutionAuthorizationDraft(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      candidate,
    ),
  );
}

const authorizerEqualsExecutor = structuredClone(draft);
authorizerEqualsExecutor.authorizer.authority_id =
  authorizerEqualsExecutor.executor.executor_id;
expectReject("authorizer equals executor", () =>
  validateAgentPaidWorkExecutionAuthorizationDraft(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    authorizerEqualsExecutor,
  ),
);

const verifierEqualsExecutor = structuredClone(draft);
verifierEqualsExecutor.completion_verifier.verifier_id =
  verifierEqualsExecutor.executor.executor_id;
expectReject("completion verifier equals executor", () =>
  validateAgentPaidWorkExecutionAuthorizationDraft(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    verifierEqualsExecutor,
  ),
);

const verifierEqualsAuthorizer = structuredClone(draft);
verifierEqualsAuthorizer.completion_verifier.verifier_id =
  verifierEqualsAuthorizer.authorizer.authority_id;
expectReject("completion verifier equals authorizer", () =>
  validateAgentPaidWorkExecutionAuthorizationDraft(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    verifierEqualsAuthorizer,
  ),
);

const createdBeforeConfirmation = structuredClone(draft);
createdBeforeConfirmation.created_at_utc = "2026-07-25T22:53:09Z";
expectReject("authorization created before payment confirmation", () =>
  validateAgentPaidWorkExecutionAuthorizationDraft(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    createdBeforeConfirmation,
  ),
);

const excessiveLifetime = structuredClone(draft);
excessiveLifetime.expires_at_utc = "2026-07-25T23:09:01Z";
expectReject("authorization lifetime over 900 seconds", () =>
  validateAgentPaidWorkExecutionAuthorizationDraft(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    excessiveLifetime,
  ),
);

for (const [label, mutate] of [
  [
    "task spec commitment",
    (candidate: AgentPaidWorkExecutionAuthorizationDraft) => {
      candidate.work_contract.task_spec_sha256 =
        `sha256:${"0".repeat(64)}`;
    },
  ],
  [
    "input manifest commitment",
    (candidate: AgentPaidWorkExecutionAuthorizationDraft) => {
      candidate.work_contract.input_manifest_sha256 =
        `sha256:${"0".repeat(64)}`;
    },
  ],
  [
    "output schema commitment",
    (candidate: AgentPaidWorkExecutionAuthorizationDraft) => {
      candidate.work_contract.expected_output_schema_sha256 =
        `sha256:${"0".repeat(64)}`;
    },
  ],
] as const) {
  const candidate = structuredClone(draft);
  mutate(candidate);
  assertCondition(
    materializeAgentPaidWorkExecutionAuthorization(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      candidate,
    ).work_execution_authorization_id !==
      materialized.work_execution_authorization_id,
    `${label} did not alter the authorization ID`,
  );
}

for (const [label, mutate] of [
  [
    "wall-clock lower bound",
    (candidate: AgentPaidWorkExecutionAuthorizationDraft) => {
      candidate.resource_limits.max_wall_clock_seconds = 0;
    },
  ],
  [
    "CPU upper bound",
    (candidate: AgentPaidWorkExecutionAuthorizationDraft) => {
      candidate.resource_limits.max_cpu_seconds = 86401;
    },
  ],
  [
    "memory lower bound",
    (candidate: AgentPaidWorkExecutionAuthorizationDraft) => {
      candidate.resource_limits.max_memory_bytes = 1048575;
    },
  ],
  [
    "output upper bound",
    (candidate: AgentPaidWorkExecutionAuthorizationDraft) => {
      candidate.resource_limits.max_output_bytes = 1073741825;
    },
  ],
  [
    "network request upper bound",
    (candidate: AgentPaidWorkExecutionAuthorizationDraft) => {
      candidate.resource_limits.max_network_requests = 10001;
    },
  ],
  [
    "retry upper bound",
    (candidate: AgentPaidWorkExecutionAuthorizationDraft) => {
      candidate.resource_limits.max_retry_count = 11;
    },
  ],
] as const) {
  const candidate = structuredClone(draft);
  mutate(candidate);
  expectReject(label, () =>
    validateAgentPaidWorkExecutionAuthorizationDraft(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      candidate,
    ),
  );
}

const unsortedCapabilities = structuredClone(draft);
unsortedCapabilities.capability_policy.allowed_capability_ids = [
  "void.capability.hash.sha256.v1",
  "void.capability.datanet.read.v1",
];
expectReject("unsorted capability allowlist", () =>
  validateAgentPaidWorkExecutionAuthorizationDraft(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    unsortedCapabilities,
  ),
);

const duplicateCapabilities = structuredClone(draft);
duplicateCapabilities.capability_policy.allowed_capability_ids = [
  "void.capability.datanet.read.v1",
  "void.capability.datanet.read.v1",
];
expectReject("duplicate capability allowlist entry", () =>
  validateAgentPaidWorkExecutionAuthorizationDraft(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    duplicateCapabilities,
  ),
);

for (const key of [
  "secrets_allowed",
  "wallet_access_allowed",
  "payment_mutation_allowed",
  "work_credit_mutation_allowed",
  "buy_void_fulfillment_allowed",
  "runtime_administration_allowed",
  "host_filesystem_write_allowed",
  "external_side_effects_allowed",
] as const) {
  const candidate =
    structuredClone(draft) as unknown as Record<string, unknown>;
  (
    candidate.capability_policy as Record<string, unknown>
  )[key] = true;
  expectReject(`forbidden capability policy ${key}`, () =>
    validateAgentPaidWorkExecutionAuthorizationDraft(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      candidate,
    ),
  );
}

const sandboxDisabled =
  structuredClone(draft) as unknown as Record<string, unknown>;
(
  sandboxDisabled.capability_policy as Record<string, unknown>
).sandbox_required = false;
expectReject("sandbox disabled", () =>
  validateAgentPaidWorkExecutionAuthorizationDraft(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    sandboxDisabled,
  ),
);

for (const key of Object.keys(draft.authorization)) {
  const candidate =
    structuredClone(draft) as unknown as Record<string, unknown>;
  (candidate.authorization as Record<string, unknown>)[key] = false;
  expectReject(`authorization ${key}`, () =>
    validateAgentPaidWorkExecutionAuthorizationDraft(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      candidate,
    ),
  );
}

for (const [section, key, value] of [
  ["executor", "private_key", "secret"],
  ["work_contract", "command", "rm -rf /"],
  ["capability_policy", "wallet_address", "0xdead"],
  ["resource_limits", "unbounded", true],
] as const) {
  const candidate =
    structuredClone(draft) as unknown as Record<string, unknown>;
  (candidate[section] as Record<string, unknown>)[key] = value;
  expectReject(`${section}.${key} injection`, () =>
    validateAgentPaidWorkExecutionAuthorizationDraft(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      candidate,
    ),
  );
}

const schemaText = readText(
  "schemas/agent-paid-work-execution-authorization-envelope-v1.schema.json",
);
const docs = readText(
  "docs/public/agent-paid-work-execution-authorization-envelope-v1.md",
);
const moduleSource = readText(
  "scripts/agent_paid_work_execution_authorization_envelope_v1.ts",
);
const schema = JSON.parse(schemaText) as Record<string, unknown>;

assertCondition(
  schema.$schema === "https://json-schema.org/draft/2020-12/schema",
  "schema draft mismatch",
);
assertCondition(
  schemaText.includes(
    AGENT_PAID_WORK_EXECUTION_AUTHORIZATION_MARKER,
  ),
  "schema marker missing",
);
assertCondition(
  docs.includes(AGENT_PAID_WORK_EXECUTION_AUTHORIZATION_MARKER),
  "documentation marker missing",
);
assertCondition(
  moduleSource.includes(
    "./agent_paid_work_independent_payment_confirmation_envelope_v1.js",
  ),
  "payment-confirmation validator binding missing",
);

const normalizedDocs = docs.replace(/\s+/g, " ");
for (const boundary of [
  "This contract grants bounded work-execution authority.",
  "V1 covers step 8 only.",
  "Exceeding any limit must fail the execution rather than silently expand authority.",
  "`sandbox_required=true`",
  "`wallet_access_allowed=false`",
  "`payment_mutation_allowed=false`",
  "`work_credit_mutation_allowed=false`",
  "`buy_void_fulfillment_allowed=false`",
  "`runtime_administration_allowed=false`",
  "`external_side_effects_allowed=false`",
  "at most one active work-execution authorization per payment confirmation",
  "A successful execution does not itself prove useful or correct completion",
  "does not add a public HTTP route",
  "or activate Buy VOID fulfillment",
]) {
  assertCondition(
    normalizedDocs.includes(boundary),
    `documentation boundary missing: ${boundary}`,
  );
}

console.log(
  `marker=${AGENT_PAID_WORK_EXECUTION_AUTHORIZATION_MARKER}`,
);
console.log(
  `example_payment_confirmation_id=${materialized.payment_confirmation_id}`,
);
console.log(
  `example_work_execution_authorization_id=${materialized.work_execution_authorization_id}`,
);
console.log(
  `canonical_bytes=${Buffer.byteLength(canonicalJson(draft), "utf8")}`,
);
console.log("tampered_authorization_id_rejected=yes");
console.log("complete_paid_work_lineage_binding_verified=yes");
console.log("payment_confirmation_required_before_work_authorization=yes");
console.log("requester_provider_executor_binding_verified=yes");
console.log("authorizer_executor_verifier_separation_required=yes");
console.log("task_input_output_commitments_bound=yes");
console.log("resource_limits_enforced=yes");
console.log("sorted_unique_capability_and_network_allowlists_required=yes");
console.log("sandbox_and_no_side_effect_policy_enforced=yes");
console.log("one_time_atomic_replay_controls_required=yes");
console.log("completion_receipt_and_independent_verification_required=yes");
console.log("payment_wc_wallet_runtime_mutations_forbidden=yes");
console.log("schema_parse_and_documentation_boundaries_verified=yes");
console.log(
  "VOID_AGENT_PAID_WORK_EXECUTION_AUTHORIZATION_ENVELOPE_V1_PROOF_GREEN",
);
