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
  materializeProviderRegistrySnapshotV1,
  materializeProviderSelectionV1,
  parseApprovedReviewDecisionV1,
  parseProviderRegistrySnapshotV1,
  parseUsdMicrousd,
  selectProviderV1,
  validateProviderSelectionV1,
} from "./authenticated_paid_work_submission_provider_selection_v1.js";

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
const five = "5".repeat(64);
const six = "6".repeat(64);
const seven = "7".repeat(64);

const review = {
  marker:
    "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_OPERATOR_REVIEW_DECISION_V1",
  version: 1,
  review_decision_id: `voidapwod1_${zero}`,
  reviewed_at_utc: "2026-07-30T20:29:35Z",
  reviewer: {
    operator_id: "zoso.local.operator",
    authority_source: "explicit_local_operator_confirmation",
  },
  queue_item: {
    queue_item_id: `voidapwsrq1_${one}`,
    receipt_id: `voidawsi1_${two}`,
    submission_id: "agent-paid-work-submission-example-v1",
    work_order_id: `voidawo1_${three}`,
    request_payload_sha256: four,
    canonical_request_sha256: five,
    capability_id: "datanet.fetch_verify",
    quote_asset: "USD",
    max_total: "3",
  },
  outcome: "approved_for_provider_selection",
  reason_codes: [
    "authenticated_intake_within_policy",
    "bounded_provider_selection_only",
  ],
  provider_selection_eligible: true,
  status: "approved_pending_provider_selection",
  next_action:
    "provider_selection_may_be_attempted_but_not_performed",
  authority: {
    provider_selected: false,
    provider_selection_executed: false,
    quote_creation_granted: false,
    quote_created: false,
    requester_acceptance_granted: false,
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
};

const providerA = {
  provider_id: `voidapwp1_${one}`,
  active: true,
  provider_authentication_verified: true,
  provider_authentication_packet_sha256: six,
  capabilities: [
    {
      capability_id: "datanet.fetch_verify",
      quote_assets: ["USD"],
      max_request_total_microusd: 10_000_000,
      max_runtime_seconds: 300,
      max_output_bytes: 1_048_576,
      available_capacity: 2,
      priority: 10,
    },
  ],
};

const providerB = {
  provider_id: `voidapwp1_${two}`,
  active: true,
  provider_authentication_verified: true,
  provider_authentication_packet_sha256: seven,
  capabilities: [
    {
      capability_id: "datanet.fetch_verify",
      quote_assets: ["USD"],
      max_request_total_microusd: 5_000_000,
      max_runtime_seconds: 120,
      max_output_bytes: 131_072,
      available_capacity: 1,
      priority: 10,
    },
  ],
};

const providerInactive = {
  provider_id: `voidapwp1_${three}`,
  active: false,
  provider_authentication_verified: true,
  provider_authentication_packet_sha256: three,
  capabilities: [
    {
      capability_id: "datanet.fetch_verify",
      quote_assets: ["USD"],
      max_request_total_microusd: 50_000_000,
      max_runtime_seconds: 300,
      max_output_bytes: 1_048_576,
      available_capacity: 10,
      priority: 0,
    },
  ],
};

const providerNoCapacity = {
  provider_id: `voidapwp1_${four}`,
  active: true,
  provider_authentication_verified: true,
  provider_authentication_packet_sha256: four,
  capabilities: [
    {
      capability_id: "datanet.fetch_verify",
      quote_assets: ["USD"],
      max_request_total_microusd: 50_000_000,
      max_runtime_seconds: 300,
      max_output_bytes: 1_048_576,
      available_capacity: 0,
      priority: 1,
    },
  ],
};

const registryCreatedAt = "2026-07-30T20:30:00Z";
const registry = materializeProviderRegistrySnapshotV1(
  registryCreatedAt,
  [
    providerB,
    providerInactive,
    providerA,
    providerNoCapacity,
  ],
);
const registryReordered = materializeProviderRegistrySnapshotV1(
  registryCreatedAt,
  [
    providerNoCapacity,
    providerA,
    providerB,
    providerInactive,
  ],
);

assertCondition(
  canonicalJson(registry) === canonicalJson(registryReordered),
  "registry materialization changed with provider order",
);
parseProviderRegistrySnapshotV1(registry);
parseApprovedReviewDecisionV1(review);

assertCondition(parseUsdMicrousd("3") === 3_000_000, "USD whole parsing failed");
assertCondition(
  parseUsdMicrousd("3.5") === 3_500_000,
  "USD decimal parsing failed",
);
assertCondition(
  parseUsdMicrousd("0.000001") === 1,
  "USD microunit parsing failed",
);

const selectedAt = "2026-07-30T20:31:00Z";
const selection = materializeProviderSelectionV1(
  review,
  registry,
  selectedAt,
);
const selectionAgain = materializeProviderSelectionV1(
  review,
  registryReordered,
  selectedAt,
);

assertCondition(
  canonicalJson(selection) === canonicalJson(selectionAgain),
  "selection changed with registry provider order",
);
validateProviderSelectionV1(selection, review, registry);

assertCondition(
  selection.selected_provider.provider_id === providerA.provider_id,
  "lexicographic tie-breaker did not select provider A",
);
assertCondition(
  selection.provider_registry.eligible_provider_count === 2,
  "eligible provider count mismatch",
);
assertCondition(
  selection.authority.provider_selected === true,
  "provider selection did not bind selected authority",
);
assertCondition(
  selection.authority.quote_created === false,
  "provider selection created a quote",
);

const root = mkdtempSync(
  path.join(tmpdir(), "void-provider-selection-proof-"),
);

try {
  const first = selectProviderV1(
    review,
    registry,
    selectedAt,
    root,
  );
  assertCondition(first.duplicate === false, "first selection marked duplicate");
  assertCondition(
    first.recovered_orphan_selection === false,
    "first selection marked orphan recovery",
  );

  const second = selectProviderV1(
    review,
    registryReordered,
    "2026-07-30T20:32:00Z",
    root,
  );
  assertCondition(second.duplicate === true, "repeat selection not duplicate");
  assertCondition(
    second.selection.provider_selection_id ===
      first.selection.provider_selection_id,
    "repeat selection changed selection ID",
  );
  assertCondition(
    second.selection.selected_at_utc === selectedAt,
    "repeat selection replaced stored selected_at_utc",
  );

  rmSync(first.index_path);

  const recovered = selectProviderV1(
    review,
    registry,
    "2026-07-30T20:33:00Z",
    root,
  );
  assertCondition(
    recovered.recovered_orphan_selection === true,
    "orphan selection recovery not classified",
  );
  assertCondition(
    recovered.selection.selected_at_utc === selectedAt,
    "orphan recovery replaced stored selected_at_utc",
  );

  const conflictingRegistry = materializeProviderRegistrySnapshotV1(
    "2026-07-30T20:34:00Z",
    [
      {
        ...providerB,
        capabilities: [
          {
            ...providerB.capabilities[0],
            priority: 0,
          },
        ],
      },
      providerA,
    ],
  );

  expectReject("conflicting registry selection", () =>
    selectProviderV1(
      review,
      conflictingRegistry,
      "2026-07-30T20:35:00Z",
      root,
    ),
  );

  assertCondition(
    readdirSync(path.join(root, "selections")).length === 1,
    "more than one provider selection exists",
  );
  assertCondition(
    readdirSync(path.join(root, "review-decision-indexes")).length === 1,
    "more than one provider selection index exists",
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}

const noEligibleRegistry = materializeProviderRegistrySnapshotV1(
  "2026-07-30T20:40:00Z",
  [providerInactive, providerNoCapacity],
);
expectReject("no eligible provider", () =>
  materializeProviderSelectionV1(
    review,
    noEligibleRegistry,
    "2026-07-30T20:41:00Z",
  ),
);

for (const [label, mutate] of [
  [
    "review not approved",
    (candidate: any) => {
      candidate.outcome = "rejected_by_operator";
      candidate.provider_selection_eligible = false;
    },
  ],
  [
    "review provider already selected",
    (candidate: any) => {
      candidate.authority.provider_selected = true;
    },
  ],
  [
    "review quote already created",
    (candidate: any) => {
      candidate.authority.quote_created = true;
    },
  ],
] as const) {
  const candidate = structuredClone(review);
  mutate(candidate);
  expectReject(label, () => parseApprovedReviewDecisionV1(candidate));
}

const badRegistry = structuredClone(registry);
badRegistry.provider_registry_snapshot_id = `voidapwprs1_${zero}`;
expectReject("registry ID mismatch", () =>
  parseProviderRegistrySnapshotV1(badRegistry),
);

const tampered: any = structuredClone(selection);
tampered.authority.quote_created = true;
expectReject("tampered selection authority", () =>
  validateProviderSelectionV1(
    tampered,
    review,
    registry,
  ),
);

const schema = JSON.parse(
  readFileSync(
    "schemas/authenticated-paid-work-submission-provider-selection-v1.schema.json",
    "utf8",
  ),
) as Record<string, unknown>;
assertCondition(
  schema["x_void_marker"] ===
    "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_PROVIDER_SELECTION_V1",
  "schema marker mismatch",
);

const example = JSON.parse(
  readFileSync(
    "examples/authenticated-paid-work-submission-provider-selection-v1.example.json",
    "utf8",
  ),
) as Record<string, unknown>;
assertCondition(
  example.status === "provider_selected_pending_quote",
  "example status mismatch",
);

const docs = readFileSync(
  "docs/public-agent/authenticated-paid-work-submission-provider-selection-v1.md",
  "utf8",
);
for (const phrase of [
  "deterministic provider selection",
  "priority ascending",
  "provider ID ascending",
  "does not create a quote",
  "one selection per review decision",
  "conflicting registry snapshot",
  "no payment",
  "no work execution",
  "no Work Credit",
]) {
  assertCondition(docs.includes(phrase), `docs missing phrase: ${phrase}`);
}

console.log(
  `provider_registry_snapshot_id=${registry.provider_registry_snapshot_id}`,
);
console.log(
  `provider_selection_id=${selection.provider_selection_id}`,
);
console.log(
  `selected_provider_id=${selection.selected_provider.provider_id}`,
);
console.log("registry_order_independent=true");
console.log("deterministic_ranking=true");
console.log("priority_then_provider_id_tie_break=true");
console.log("one_selection_per_review_decision=true");
console.log("semantic_duplicate_classified=true");
console.log("orphan_selection_recovery_exact=true");
console.log("conflicting_registry_rejected=true");
console.log("no_eligible_provider_rejected=true");
console.log("provider_selected=true");
console.log("quote_created=false");
console.log("payment_executed=false");
console.log("work_executed=false");
console.log("work_dispatched=false");
console.log("wc_ledger_written=false");
console.log("void_settled=false");
console.log(
  "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_PROVIDER_SELECTION_V1_EXACT_GREEN",
);
