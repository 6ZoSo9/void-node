import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path, { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const PROVIDER_REGISTRY_SNAPSHOT_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_PROVIDER_REGISTRY_SNAPSHOT_V1" as const;
export const PROVIDER_SELECTION_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_PROVIDER_SELECTION_V1" as const;
export const PROVIDER_SELECTION_INDEX_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_PROVIDER_SELECTION_INDEX_V1" as const;
export const PROVIDER_SELECTION_RESULT_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_PROVIDER_SELECTION_RESULT_V1" as const;

const REVIEW_DECISION_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_OPERATOR_REVIEW_DECISION_V1";

const SHA256 = /^[0-9a-f]{64}$/;
const REVIEW_DECISION_ID = /^voidapwod1_[0-9a-f]{64}$/;
const PROVIDER_REGISTRY_ID = /^voidapwprs1_[0-9a-f]{64}$/;
const PROVIDER_ID = /^voidapwp1_[0-9a-f]{64}$/;
const PROVIDER_SELECTION_ID = /^voidapwps1_[0-9a-f]{64}$/;
const MACHINE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const USD_DECIMAL = /^(0|[1-9][0-9]*)(\.[0-9]{1,6})?$/;

type JsonScalar = null | boolean | number | string;
type JsonValue = JsonScalar | JsonValue[] | { [key: string]: JsonValue };

export type ProviderCapabilityV1 = {
  capability_id: string;
  quote_assets: string[];
  max_request_total_microusd: number;
  max_runtime_seconds: number;
  max_output_bytes: number;
  available_capacity: number;
  priority: number;
};

export type ProviderRegistryEntryV1 = {
  provider_id: string;
  active: boolean;
  provider_authentication_verified: boolean;
  provider_authentication_packet_sha256: string;
  capabilities: ProviderCapabilityV1[];
};

export type ProviderRegistrySnapshotV1 = {
  marker: typeof PROVIDER_REGISTRY_SNAPSHOT_MARKER;
  version: 1;
  provider_registry_snapshot_id: string;
  created_at_utc: string;
  providers: ProviderRegistryEntryV1[];
};

type ApprovedReviewDecisionV1 = {
  marker: typeof REVIEW_DECISION_MARKER;
  version: 1;
  review_decision_id: string;
  reviewed_at_utc: string;
  reviewer: {
    operator_id: string;
    authority_source: "explicit_local_operator_confirmation";
  };
  queue_item: {
    queue_item_id: string;
    receipt_id: string;
    submission_id: string;
    work_order_id: string;
    request_payload_sha256: string;
    canonical_request_sha256: string;
    capability_id: string;
    quote_asset: string;
    max_total: string;
  };
  outcome: "approved_for_provider_selection";
  reason_codes: string[];
  provider_selection_eligible: true;
  status: "approved_pending_provider_selection";
  next_action:
    "provider_selection_may_be_attempted_but_not_performed";
  authority: Record<string, false>;
};

export type ProviderSelectionV1 = {
  marker: typeof PROVIDER_SELECTION_MARKER;
  version: 1;
  provider_selection_id: string;
  selected_at_utc: string;
  status: "provider_selected_pending_quote";
  review_decision: {
    review_decision_id: string;
    queue_item_id: string;
    receipt_id: string;
    submission_id: string;
    work_order_id: string;
    capability_id: string;
    quote_asset: string;
    max_total: string;
    max_total_microusd: number;
  };
  provider_registry: {
    provider_registry_snapshot_id: string;
    provider_count: number;
    eligible_provider_count: number;
    candidate_set_sha256: string;
    ranking: "priority_ascending_then_provider_id_ascending";
  };
  selected_provider: {
    provider_id: string;
    provider_authentication_packet_sha256: string;
    priority: number;
    available_capacity: number;
    capability_id: string;
    quote_asset: string;
    max_request_total_microusd: number;
    max_runtime_seconds: number;
    max_output_bytes: number;
  };
  next_action:
    "provider_quote_may_be_requested_but_not_created";
  authority: {
    provider_selected: true;
    provider_selection_executed: true;
    quote_creation_granted: false;
    quote_created: false;
    requester_acceptance_granted: false;
    payment_authorization_granted: false;
    payment_execution_granted: false;
    work_execution_authorization_granted: false;
    work_dispatch_granted: false;
    wc_award_granted: false;
    wc_ledger_write_granted: false;
    void_settlement_granted: false;
    wallet_or_signer_access_granted: false;
    signing_granted: false;
    transaction_broadcast_granted: false;
    buy_void_fulfillment_granted: false;
  };
};

export type ProviderSelectionIndexV1 = {
  marker: typeof PROVIDER_SELECTION_INDEX_MARKER;
  version: 1;
  review_decision_id: string;
  provider_selection_id: string;
  provider_selection_path: string;
  provider_registry_snapshot_id: string;
  selected_provider_id: string;
};

export type ProviderSelectionResultV1 = {
  marker: typeof PROVIDER_SELECTION_RESULT_MARKER;
  version: 1;
  ok: true;
  duplicate: boolean;
  recovered_orphan_selection: boolean;
  selection: ProviderSelectionV1;
  selection_path: string;
  index_path: string;
  authority: {
    provider_selected: true;
    quote_created: false;
    payment_executed: false;
    work_executed: false;
    work_dispatched: false;
    wc_ledger_written: false;
    void_settled: false;
  };
};

type EligibleProvider = {
  provider: ProviderRegistryEntryV1;
  capability: ProviderCapabilityV1;
};

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) fail(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function requireString(
  value: unknown,
  label: string,
  pattern?: RegExp,
): string {
  assertCondition(typeof value === "string", `${label} must be a string`);
  assertCondition(value.length > 0, `${label} must not be empty`);
  if (pattern) {
    assertCondition(pattern.test(value), `${label} format mismatch`);
  }
  return value;
}

function requireInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  assertCondition(
    typeof value === "number" && Number.isSafeInteger(value),
    `${label} must be a safe integer`,
  );
  assertCondition(
    value >= minimum && value <= maximum,
    `${label} outside allowed range`,
  );
  return value;
}

function requireUtc(value: unknown, label: string): string {
  const text = requireString(value, label, UTC);
  assertCondition(Number.isFinite(Date.parse(text)), `${label} invalid UTC`);
  return text;
}

function requireSha(value: unknown, label: string): string {
  return requireString(value, label, SHA256);
}

function canonicalize(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, JsonValue>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, canonicalize(record[key])]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value as JsonValue));
}

function digest(value: unknown): string {
  return createHash("sha256")
    .update(canonicalJson(value))
    .digest("hex");
}

function assertAllFalse(value: unknown, label: string): void {
  assertCondition(isRecord(value), `${label} must be an object`);
  for (const [key, candidate] of Object.entries(value)) {
    assertCondition(candidate === false, `${label}.${key} must be false`);
  }
}

export function parseUsdMicrousd(value: unknown): number {
  const text = requireString(value, "max_total", USD_DECIMAL);
  const [whole, fraction = ""] = text.split(".");
  const padded = `${fraction}000000`.slice(0, 6);
  const result = Number(whole) * 1_000_000 + Number(padded);
  assertCondition(
    Number.isSafeInteger(result) && result >= 0,
    "max_total outside safe microusd range",
  );
  return result;
}

export function parseApprovedReviewDecisionV1(
  value: unknown,
): ApprovedReviewDecisionV1 {
  assertCondition(isRecord(value), "review decision must be an object");
  assertCondition(
    value.marker === REVIEW_DECISION_MARKER,
    "review decision marker mismatch",
  );
  assertCondition(value.version === 1, "review decision version mismatch");
  const reviewDecisionId = requireString(
    value.review_decision_id,
    "review_decision_id",
    REVIEW_DECISION_ID,
  );
  const reviewedAt = requireUtc(value.reviewed_at_utc, "reviewed_at_utc");

  assertCondition(isRecord(value.reviewer), "reviewer missing");
  const reviewer = value.reviewer;
  const operatorId = requireString(
    reviewer.operator_id,
    "operator_id",
    MACHINE_ID,
  );
  assertCondition(
    reviewer.authority_source === "explicit_local_operator_confirmation",
    "review authority source mismatch",
  );

  assertCondition(isRecord(value.queue_item), "queue_item binding missing");
  const queue = value.queue_item;

  assertCondition(
    value.outcome === "approved_for_provider_selection",
    "review outcome is not approved_for_provider_selection",
  );
  assertCondition(
    Array.isArray(value.reason_codes) && value.reason_codes.length >= 1,
    "review reason_codes missing",
  );
  const reasonCodes = value.reason_codes.map((item, index) =>
    requireString(item, `reason_codes[${index}]`),
  );
  assertCondition(
    value.provider_selection_eligible === true,
    "provider-selection eligibility missing",
  );
  assertCondition(
    value.status === "approved_pending_provider_selection",
    "review status mismatch",
  );
  assertCondition(
    value.next_action ===
      "provider_selection_may_be_attempted_but_not_performed",
    "review next_action mismatch",
  );
  assertAllFalse(value.authority, "review decision authority");

  return {
    marker: REVIEW_DECISION_MARKER,
    version: 1,
    review_decision_id: reviewDecisionId,
    reviewed_at_utc: reviewedAt,
    reviewer: {
      operator_id: operatorId,
      authority_source: "explicit_local_operator_confirmation",
    },
    queue_item: {
      queue_item_id: requireString(queue.queue_item_id, "queue_item_id"),
      receipt_id: requireString(queue.receipt_id, "receipt_id"),
      submission_id: requireString(
        queue.submission_id,
        "submission_id",
        MACHINE_ID,
      ),
      work_order_id: requireString(queue.work_order_id, "work_order_id"),
      request_payload_sha256: requireSha(
        queue.request_payload_sha256,
        "request_payload_sha256",
      ),
      canonical_request_sha256: requireSha(
        queue.canonical_request_sha256,
        "canonical_request_sha256",
      ),
      capability_id: requireString(
        queue.capability_id,
        "capability_id",
        MACHINE_ID,
      ),
      quote_asset: requireString(
        queue.quote_asset,
        "quote_asset",
        MACHINE_ID,
      ),
      max_total: requireString(queue.max_total, "max_total", USD_DECIMAL),
    },
    outcome: "approved_for_provider_selection",
    reason_codes: [...reasonCodes].sort(),
    provider_selection_eligible: true,
    status: "approved_pending_provider_selection",
    next_action:
      "provider_selection_may_be_attempted_but_not_performed",
    authority: value.authority as Record<string, false>,
  };
}

function parseCapability(value: unknown): ProviderCapabilityV1 {
  assertCondition(isRecord(value), "provider capability must be an object");
  assertCondition(
    Array.isArray(value.quote_assets) && value.quote_assets.length >= 1,
    "provider quote_assets missing",
  );
  const quoteAssets = value.quote_assets.map((item, index) =>
    requireString(item, `quote_assets[${index}]`, MACHINE_ID),
  );
  assertCondition(
    new Set(quoteAssets).size === quoteAssets.length,
    "provider quote_assets must be unique",
  );
  return {
    capability_id: requireString(
      value.capability_id,
      "provider capability_id",
      MACHINE_ID,
    ),
    quote_assets: [...quoteAssets].sort(),
    max_request_total_microusd: requireInteger(
      value.max_request_total_microusd,
      "max_request_total_microusd",
      0,
    ),
    max_runtime_seconds: requireInteger(
      value.max_runtime_seconds,
      "max_runtime_seconds",
      1,
    ),
    max_output_bytes: requireInteger(
      value.max_output_bytes,
      "max_output_bytes",
      1,
    ),
    available_capacity: requireInteger(
      value.available_capacity,
      "available_capacity",
      0,
      1_000_000,
    ),
    priority: requireInteger(
      value.priority,
      "priority",
      0,
      1_000_000,
    ),
  };
}

function normalizeProviders(value: unknown): ProviderRegistryEntryV1[] {
  assertCondition(Array.isArray(value), "providers must be an array");
  assertCondition(
    value.length >= 1 && value.length <= 10_000,
    "providers length outside allowed range",
  );

  const providers = value.map((item, providerIndex) => {
    assertCondition(
      isRecord(item),
      `providers[${providerIndex}] must be an object`,
    );
    assertCondition(
      Array.isArray(item.capabilities) && item.capabilities.length >= 1,
      `providers[${providerIndex}].capabilities missing`,
    );
    const capabilities = item.capabilities.map(parseCapability);
    capabilities.sort((left, right) =>
      left.capability_id.localeCompare(right.capability_id),
    );
    assertCondition(
      new Set(capabilities.map((entry) => entry.capability_id)).size ===
        capabilities.length,
      `providers[${providerIndex}] capability IDs must be unique`,
    );
    return {
      provider_id: requireString(
        item.provider_id,
        `providers[${providerIndex}].provider_id`,
        PROVIDER_ID,
      ),
      active: item.active === true,
      provider_authentication_verified:
        item.provider_authentication_verified === true,
      provider_authentication_packet_sha256: requireSha(
        item.provider_authentication_packet_sha256,
        `providers[${providerIndex}].provider_authentication_packet_sha256`,
      ),
      capabilities,
    };
  });

  providers.sort((left, right) =>
    left.provider_id.localeCompare(right.provider_id),
  );
  assertCondition(
    new Set(providers.map((entry) => entry.provider_id)).size ===
      providers.length,
    "provider IDs must be unique",
  );
  return providers;
}

function registryIdentity(
  createdAt: string,
  providers: ProviderRegistryEntryV1[],
): unknown {
  return {
    marker: PROVIDER_REGISTRY_SNAPSHOT_MARKER,
    version: 1,
    created_at_utc: createdAt,
    providers,
  };
}

export function materializeProviderRegistrySnapshotV1(
  createdAtValue: unknown,
  providersValue: unknown,
): ProviderRegistrySnapshotV1 {
  const createdAt = requireUtc(createdAtValue, "created_at_utc");
  const providers = normalizeProviders(providersValue);
  return {
    marker: PROVIDER_REGISTRY_SNAPSHOT_MARKER,
    version: 1,
    provider_registry_snapshot_id:
      `voidapwprs1_${digest(registryIdentity(createdAt, providers))}`,
    created_at_utc: createdAt,
    providers,
  };
}

export function parseProviderRegistrySnapshotV1(
  value: unknown,
): ProviderRegistrySnapshotV1 {
  assertCondition(isRecord(value), "provider registry must be an object");
  assertCondition(
    value.marker === PROVIDER_REGISTRY_SNAPSHOT_MARKER,
    "provider registry marker mismatch",
  );
  assertCondition(value.version === 1, "provider registry version mismatch");
  const createdAt = requireUtc(value.created_at_utc, "created_at_utc");
  const providers = normalizeProviders(value.providers);
  const expected = materializeProviderRegistrySnapshotV1(
    createdAt,
    providers,
  );
  const registryId = requireString(
    value.provider_registry_snapshot_id,
    "provider_registry_snapshot_id",
    PROVIDER_REGISTRY_ID,
  );
  assertCondition(
    registryId === expected.provider_registry_snapshot_id,
    "provider registry snapshot ID mismatch",
  );
  return expected;
}

function eligibleProviders(
  review: ApprovedReviewDecisionV1,
  registry: ProviderRegistrySnapshotV1,
): EligibleProvider[] {
  const maxTotalMicrousd = parseUsdMicrousd(review.queue_item.max_total);
  const eligible: EligibleProvider[] = [];

  for (const provider of registry.providers) {
    if (!provider.active || !provider.provider_authentication_verified) {
      continue;
    }
    for (const capability of provider.capabilities) {
      if (capability.capability_id !== review.queue_item.capability_id) {
        continue;
      }
      if (!capability.quote_assets.includes(review.queue_item.quote_asset)) {
        continue;
      }
      if (capability.max_request_total_microusd < maxTotalMicrousd) {
        continue;
      }
      if (capability.available_capacity < 1) {
        continue;
      }
      eligible.push({ provider, capability });
    }
  }

  eligible.sort((left, right) => {
    if (left.capability.priority !== right.capability.priority) {
      return left.capability.priority - right.capability.priority;
    }
    return left.provider.provider_id.localeCompare(
      right.provider.provider_id,
    );
  });
  return eligible;
}

function selectionIdentity(
  review: ApprovedReviewDecisionV1,
  registry: ProviderRegistrySnapshotV1,
  selected: EligibleProvider,
): unknown {
  return {
    review_decision_id: review.review_decision_id,
    queue_item_id: review.queue_item.queue_item_id,
    receipt_id: review.queue_item.receipt_id,
    provider_registry_snapshot_id:
      registry.provider_registry_snapshot_id,
    selected_provider_id: selected.provider.provider_id,
    provider_authentication_packet_sha256:
      selected.provider.provider_authentication_packet_sha256,
    capability_id: selected.capability.capability_id,
    quote_asset: review.queue_item.quote_asset,
  };
}

export function materializeProviderSelectionV1(
  reviewValue: unknown,
  registryValue: unknown,
  selectedAtValue: unknown,
): ProviderSelectionV1 {
  const review = parseApprovedReviewDecisionV1(reviewValue);
  const registry = parseProviderRegistrySnapshotV1(registryValue);
  const selectedAt = requireUtc(selectedAtValue, "selected_at_utc");
  const eligible = eligibleProviders(review, registry);
  assertCondition(eligible.length >= 1, "no eligible provider");
  const selected = eligible[0];
  const maxTotalMicrousd = parseUsdMicrousd(review.queue_item.max_total);
  const candidateSetSha = digest(
    eligible.map((entry) => ({
      provider_id: entry.provider.provider_id,
      provider_authentication_packet_sha256:
        entry.provider.provider_authentication_packet_sha256,
      priority: entry.capability.priority,
      available_capacity: entry.capability.available_capacity,
      max_request_total_microusd:
        entry.capability.max_request_total_microusd,
    })),
  );

  return {
    marker: PROVIDER_SELECTION_MARKER,
    version: 1,
    provider_selection_id:
      `voidapwps1_${digest(selectionIdentity(review, registry, selected))}`,
    selected_at_utc: selectedAt,
    status: "provider_selected_pending_quote",
    review_decision: {
      review_decision_id: review.review_decision_id,
      queue_item_id: review.queue_item.queue_item_id,
      receipt_id: review.queue_item.receipt_id,
      submission_id: review.queue_item.submission_id,
      work_order_id: review.queue_item.work_order_id,
      capability_id: review.queue_item.capability_id,
      quote_asset: review.queue_item.quote_asset,
      max_total: review.queue_item.max_total,
      max_total_microusd: maxTotalMicrousd,
    },
    provider_registry: {
      provider_registry_snapshot_id:
        registry.provider_registry_snapshot_id,
      provider_count: registry.providers.length,
      eligible_provider_count: eligible.length,
      candidate_set_sha256: candidateSetSha,
      ranking: "priority_ascending_then_provider_id_ascending",
    },
    selected_provider: {
      provider_id: selected.provider.provider_id,
      provider_authentication_packet_sha256:
        selected.provider.provider_authentication_packet_sha256,
      priority: selected.capability.priority,
      available_capacity: selected.capability.available_capacity,
      capability_id: selected.capability.capability_id,
      quote_asset: review.queue_item.quote_asset,
      max_request_total_microusd:
        selected.capability.max_request_total_microusd,
      max_runtime_seconds: selected.capability.max_runtime_seconds,
      max_output_bytes: selected.capability.max_output_bytes,
    },
    next_action:
      "provider_quote_may_be_requested_but_not_created",
    authority: {
      provider_selected: true,
      provider_selection_executed: true,
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
}

export function validateProviderSelectionV1(
  value: unknown,
  reviewValue: unknown,
  registryValue: unknown,
): asserts value is ProviderSelectionV1 {
  assertCondition(isRecord(value), "provider selection must be an object");
  const expected = materializeProviderSelectionV1(
    reviewValue,
    registryValue,
    value.selected_at_utc,
  );
  assertCondition(
    canonicalJson(value) === canonicalJson(expected),
    "provider selection does not match deterministic materialization",
  );
  requireString(
    value.provider_selection_id,
    "provider_selection_id",
    PROVIDER_SELECTION_ID,
  );
  assertCondition(
    isRecord(value.authority),
    "provider selection authority must be an object",
  );
  const authority = value.authority;
  assertCondition(
    authority.provider_selected === true,
    "provider_selected must be true",
  );
  for (const [key, candidate] of Object.entries(authority)) {
    if (key === "provider_selected" || key === "provider_selection_executed") {
      assertCondition(candidate === true, `${key} must be true`);
      continue;
    }
    assertCondition(candidate === false, `${key} must be false`);
  }
}

function privateDirectory(directory: string): string {
  const absolute = resolve(directory);
  mkdirSync(absolute, { recursive: true, mode: 0o700 });
  const metadata = lstatSync(absolute);
  assertCondition(metadata.isDirectory(), "selection directory not a directory");
  assertCondition(!metadata.isSymbolicLink(), "selection directory is symlink");
  assertCondition(
    (metadata.mode & 0o077) === 0,
    "selection directory is not owner-private",
  );
  return absolute;
}

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
}

function writeExclusiveJson(filePath: string, value: unknown): void {
  const descriptor = openSync(filePath, "wx", 0o600);
  try {
    writeFileSync(
      descriptor,
      `${JSON.stringify(value, null, 2)}\n`,
      { encoding: "utf8" },
    );
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function expectedIndex(
  selection: ProviderSelectionV1,
  selectionPath: string,
): ProviderSelectionIndexV1 {
  return {
    marker: PROVIDER_SELECTION_INDEX_MARKER,
    version: 1,
    review_decision_id:
      selection.review_decision.review_decision_id,
    provider_selection_id: selection.provider_selection_id,
    provider_selection_path: selectionPath,
    provider_registry_snapshot_id:
      selection.provider_registry.provider_registry_snapshot_id,
    selected_provider_id: selection.selected_provider.provider_id,
  };
}

function resultAuthority(): ProviderSelectionResultV1["authority"] {
  return {
    provider_selected: true,
    quote_created: false,
    payment_executed: false,
    work_executed: false,
    work_dispatched: false,
    wc_ledger_written: false,
    void_settled: false,
  };
}

function sameSemanticRequest(
  stored: ProviderSelectionV1,
  expected: ProviderSelectionV1,
): boolean {
  return (
    stored.provider_registry.provider_registry_snapshot_id ===
      expected.provider_registry.provider_registry_snapshot_id &&
    stored.selected_provider.provider_id ===
      expected.selected_provider.provider_id &&
    stored.review_decision.review_decision_id ===
      expected.review_decision.review_decision_id
  );
}

export function selectProviderV1(
  reviewValue: unknown,
  registryValue: unknown,
  selectedAtValue: unknown,
  selectionDirectory: string,
): ProviderSelectionResultV1 {
  const review = parseApprovedReviewDecisionV1(reviewValue);
  const registry = parseProviderRegistrySnapshotV1(registryValue);
  const expected = materializeProviderSelectionV1(
    review,
    registry,
    selectedAtValue,
  );

  const root = privateDirectory(selectionDirectory);
  const selections = privateDirectory(path.join(root, "selections"));
  const indexes = privateDirectory(
    path.join(root, "review-decision-indexes"),
  );
  const locks = privateDirectory(path.join(root, "locks"));

  const selectionPath = path.join(
    selections,
    `${expected.provider_selection_id}.json`,
  );
  const indexPath = path.join(
    indexes,
    `${review.review_decision_id}.json`,
  );
  const lockPath = path.join(
    locks,
    `${review.review_decision_id}.lock`,
  );

  try {
    mkdirSync(lockPath, { mode: 0o700 });
  } catch {
    fail(`provider selection lock already held: ${review.review_decision_id}`);
  }

  try {
    if (existsSync(indexPath)) {
      const index = readJson(indexPath);
      assertCondition(isRecord(index), "stored selection index invalid");
      const storedPath = requireString(
        index.provider_selection_path,
        "stored provider_selection_path",
      );
      const stored = readJson(storedPath);
      validateProviderSelectionV1(stored, review, registry);
      assertCondition(
        canonicalJson(index) === canonicalJson(expectedIndex(stored, storedPath)),
        "stored selection index binding mismatch",
      );
      assertCondition(
        sameSemanticRequest(stored, expected),
        "conflicting provider selection already exists",
      );
      return {
        marker: PROVIDER_SELECTION_RESULT_MARKER,
        version: 1,
        ok: true,
        duplicate: true,
        recovered_orphan_selection: false,
        selection: stored,
        selection_path: storedPath,
        index_path: indexPath,
        authority: resultAuthority(),
      };
    }

    let selection = expected;
    let recovered = false;

    if (existsSync(selectionPath)) {
      const stored = readJson(selectionPath);
      validateProviderSelectionV1(stored, review, registry);
      assertCondition(
        sameSemanticRequest(stored, expected),
        "conflicting orphan provider selection exists",
      );
      selection = stored;
      recovered = true;
    } else {
      writeExclusiveJson(selectionPath, selection);
    }

    writeExclusiveJson(indexPath, expectedIndex(selection, selectionPath));

    return {
      marker: PROVIDER_SELECTION_RESULT_MARKER,
      version: 1,
      ok: true,
      duplicate: false,
      recovered_orphan_selection: recovered,
      selection,
      selection_path: selectionPath,
      index_path: indexPath,
      authority: resultAuthority(),
    };
  } finally {
    rmSync(lockPath, { recursive: true, force: true });
  }
}

function usage(): never {
  return fail(
    [
      "usage:",
      "  tsx scripts/authenticated_paid_work_submission_provider_selection_v1.ts materialize-registry <created-at-utc> <providers-json> <registry.json>",
      "  tsx scripts/authenticated_paid_work_submission_provider_selection_v1.ts materialize <review-decision.json> <registry.json> <selected-at-utc> <selection.json>",
      "  tsx scripts/authenticated_paid_work_submission_provider_selection_v1.ts verify <review-decision.json> <registry.json> <selection.json>",
      "  tsx scripts/authenticated_paid_work_submission_provider_selection_v1.ts select <review-decision.json> <registry.json> <selected-at-utc> <private-selection-root> <response.json>",
    ].join("\n"),
  );
}

function main(): void {
  const [mode, ...args] = process.argv.slice(2);

  if (mode === "materialize-registry") {
    assertCondition(
      args.length === 3,
      "materialize-registry requires three arguments",
    );
    const registry = materializeProviderRegistrySnapshotV1(
      args[0],
      JSON.parse(args[1]),
    );
    writeExclusiveJson(resolve(args[2]), registry);
    console.log(
      `provider_registry_snapshot_id=${registry.provider_registry_snapshot_id}`,
    );
    console.log("provider_registry_mutation=false");
    console.log(
      "VOID_AUTHENTICATED_PAID_WORK_PROVIDER_REGISTRY_SNAPSHOT_V1_MATERIALIZED",
    );
    return;
  }

  if (mode === "materialize") {
    assertCondition(args.length === 4, "materialize requires four arguments");
    const selection = materializeProviderSelectionV1(
      readJson(args[0]),
      readJson(args[1]),
      args[2],
    );
    writeExclusiveJson(resolve(args[3]), selection);
    console.log(
      `provider_selection_id=${selection.provider_selection_id}`,
    );
    console.log(
      `selected_provider_id=${selection.selected_provider.provider_id}`,
    );
    console.log("selection_store_mutation=false");
    console.log(
      "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_PROVIDER_SELECTION_V1_MATERIALIZED",
    );
    return;
  }

  if (mode === "verify") {
    assertCondition(args.length === 3, "verify requires three arguments");
    validateProviderSelectionV1(
      readJson(args[2]),
      readJson(args[0]),
      readJson(args[1]),
    );
    console.log("provider_selection_verified=true");
    console.log(
      "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_PROVIDER_SELECTION_V1_VERIFIED",
    );
    return;
  }

  if (mode === "select") {
    assertCondition(args.length === 5, "select requires five arguments");
    const result = selectProviderV1(
      readJson(args[0]),
      readJson(args[1]),
      args[2],
      args[3],
    );
    writeExclusiveJson(resolve(args[4]), result);
    console.log(
      `provider_selection_id=${result.selection.provider_selection_id}`,
    );
    console.log(
      `selected_provider_id=${result.selection.selected_provider.provider_id}`,
    );
    console.log(`duplicate=${result.duplicate}`);
    console.log(
      `recovered_orphan_selection=${result.recovered_orphan_selection}`,
    );
    console.log("provider_selected=true");
    console.log("provider_selection_executed=true");
    console.log("quote_created=false");
    console.log("payment_executed=false");
    console.log("work_executed=false");
    console.log("work_dispatched=false");
    console.log("wc_ledger_written=false");
    console.log("void_settled=false");
    console.log(
      "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_PROVIDER_SELECTION_V1_SELECTED",
    );
    return;
  }

  usage();
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  main();
}
