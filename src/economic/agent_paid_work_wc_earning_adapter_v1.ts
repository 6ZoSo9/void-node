import { createHash } from "node:crypto";

export type JsonObject = Record<string, unknown>;

export const AGENT_PAID_WORK_WC_EARNING_ADAPTER_PLAN_MARKER =
  "VOID_AGENT_PAID_WORK_WC_EARNING_ADAPTER_PLAN_V1" as const;
export const AGENT_PAID_WORK_WC_EARNING_ADAPTER_RECEIPT_MARKER =
  "VOID_AGENT_PAID_WORK_WC_EARNING_ADAPTER_RECEIPT_V1" as const;
export const AGENT_PAID_WORK_WC_EARNING_ADAPTER_PLAN_ID_PREFIX =
  "voidapweap1_" as const;
export const AGENT_PAID_WORK_WC_EARNING_ADAPTER_RECEIPT_ID_PREFIX =
  "voidapwear1_" as const;
export const AGENT_PAID_WORK_WC_EARNING_ADAPTER_EXECUTE_CONFIRMATION =
  "execute-agent-paid-work-wc-earning-adapter-v1" as const;

export const AGENT_PAID_WORK_WC_EARNING_ADAPTER_CAPABILITY_ID =
  "datanet.fetch_verify" as const;
export const AGENT_PAID_WORK_WC_EARNING_ADAPTER_TASK_CLASS =
  "datanet_fetch_verify" as const;
export const AGENT_PAID_WORK_WC_EARNING_ADAPTER_FIXED_AWARD_WC = 3 as const;
export const AGENT_PAID_WORK_WC_EARNING_ADAPTER_EXECUTE_ROUTE =
  "/wc/public-earning-pilot-v1/execute-local?dry=0&confirm=wcPublicEarningPilotExecuteLocal" as const;

export const AGENT_PAID_WORK_WC_EARNING_ADAPTER_SELECTED_CONTRACT_RECEIPT_SHA256 =
  "93bef108c526499e5cd4124e751f921766ba75c623a8f737bd59b5d26203fe1f" as const;
export const AGENT_PAID_WORK_WC_EARNING_ADAPTER_PARTICIPANT_CLI_SHA256 =
  "382bdf28f7ad39e7cc86b3e3e0852fa00c6c8071e93719128d6a4ee47833cd63" as const;
export const AGENT_PAID_WORK_WC_EARNING_ADAPTER_PILOT_SOURCE_SHA256 =
  "78f4c73614d6d06699bbcc921f457176c204081c5dc3b125e682559431345887" as const;
export const AGENT_PAID_WORK_WC_EARNING_ADAPTER_ACCEPTANCE_SOURCE_SHA256 =
  "b6e6b1cb1677f27622238cdb82a90d4ee133c2d089fd719b55758cdacbe972b3" as const;

const HEX64 = /^[0-9a-f]{64}$/;
const WORK_ORDER_ID = /^voidawo1_[0-9a-f]{64}$/;
const SUBMISSION_RECEIPT_ID = /^voidawsi1_[0-9a-f]{64}$/;
const CREDENTIAL_ID = /^voidapwc1_[0-9a-f]{64}$/;
const BINDING_ID = /^voidapwcb1_[0-9a-f]{64}$/;
const BINDING_REGISTRY_ID = /^voidapwcbr1_[0-9a-f]{64}$/;
const PLAN_ID = /^voidapweap1_[0-9a-f]{64}$/;
const RECEIPT_ID = /^voidapwear1_[0-9a-f]{64}$/;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,191}$/;
const NODE_ID = /^[0-9a-f]{32}$/;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

export interface AgentPaidWorkWcEarningAdapterPlanDraftV1 {
  marker: typeof AGENT_PAID_WORK_WC_EARNING_ADAPTER_PLAN_MARKER;
  version: 1;
  created_at_utc: string;
  expires_at_utc: string;
  selected_contract_capture: {
    receipt_path: string;
    receipt_sha256:
      typeof AGENT_PAID_WORK_WC_EARNING_ADAPTER_SELECTED_CONTRACT_RECEIPT_SHA256;
  };
  submission: {
    submission_id: string;
    submission_receipt_id: string;
    work_order_id: string;
    credential_id: string;
    agent_id: string;
    capability_id:
      typeof AGENT_PAID_WORK_WC_EARNING_ADAPTER_CAPABILITY_ID;
  };
  binding: {
    binding_registry_id: string;
    binding_registry_sha256: string;
    binding_id: string;
    destination_wc_account: string;
  };
  runtime: {
    participant_cli_path: string;
    participant_cli_sha256:
      typeof AGENT_PAID_WORK_WC_EARNING_ADAPTER_PARTICIPANT_CLI_SHA256;
    pilot_source_path: string;
    pilot_source_sha256:
      typeof AGENT_PAID_WORK_WC_EARNING_ADAPTER_PILOT_SOURCE_SHA256;
    acceptance_source_path: string;
    acceptance_source_sha256:
      typeof AGENT_PAID_WORK_WC_EARNING_ADAPTER_ACCEPTANCE_SOURCE_SHA256;
    execute_route:
      typeof AGENT_PAID_WORK_WC_EARNING_ADAPTER_EXECUTE_ROUTE;
    task_class:
      typeof AGENT_PAID_WORK_WC_EARNING_ADAPTER_TASK_CLASS;
    fixed_award_wc:
      typeof AGENT_PAID_WORK_WC_EARNING_ADAPTER_FIXED_AWARD_WC;
  };
  coordinator: {
    base_url: string;
    node_id: string;
  };
  execution: {
    ticket_path: string;
    private_output_dir: string;
    confirmation:
      typeof AGENT_PAID_WORK_WC_EARNING_ADAPTER_EXECUTE_CONFIRMATION;
    participant_cli_is_only_capability_token_consumer: true;
    one_time_ticket_required: true;
    exact_first_credit_required: true;
    identical_duplicate_second_credit_forbidden: true;
  };
  authority: {
    bounded_work_execution_via_participant_cli: true;
    wc_ledger_write_via_verified_receipt_only: true;
    payment_transfer: false;
    wc_to_void_settlement: false;
    wallet_or_signer_access: false;
    service_restart: false;
    deployment: false;
    automatic_background_loop: false;
  };
  nonce: string;
}

export interface AgentPaidWorkWcEarningAdapterPlanV1
  extends AgentPaidWorkWcEarningAdapterPlanDraftV1 {
  plan_id: string;
}

export interface AdapterParticipantEvidenceV1 {
  participant_receipt_path: string;
  participant_receipt_sha256: string;
  participant_stdout_sha256: string;
  participant_stderr_sha256: string;
  ticket_deleted: true;
  recovered_from_existing_participant_receipt: boolean;
}

export interface AgentPaidWorkWcEarningAdapterReceiptDraftV1 {
  marker: typeof AGENT_PAID_WORK_WC_EARNING_ADAPTER_RECEIPT_MARKER;
  version: 1;
  created_at_utc: string;
  plan_id: string;
  submission: AgentPaidWorkWcEarningAdapterPlanV1["submission"];
  binding: AgentPaidWorkWcEarningAdapterPlanV1["binding"];
  participant: {
    marker: "VOID_WC_PUBLIC_EARNING_PARTICIPANT_CLI_V1";
    account: string;
    ticket_id: string;
    job_id: string;
    receipt_id: string;
    participant_receipt_path: string;
    participant_receipt_sha256: string;
    participant_stdout_sha256: string;
    participant_stderr_sha256: string;
    ticket_deleted: true;
    recovered_from_existing_participant_receipt: boolean;
  };
  wc: {
    before: number;
    after: number;
    delta: 3;
    fixed_award_wc: 3;
    credited: true;
    duplicate: false;
    canonical_redeemable: true;
  };
  verification: {
    remote_executor: true;
    signature_verified: true;
    remote_health_verified: true;
    remote_job_verified: true;
    remote_receipt_verified: true;
    capability_consumed: true;
    participant_selected_award: false;
    automatic_background_loop: false;
    money_movement: false;
  };
  authority: {
    live_work_execution: true;
    wc_ledger_write: true;
    payment_transfer: false;
    wc_to_void_settlement: false;
    wallet_or_signer_access: false;
    service_restart: false;
    deployment: false;
  };
  raw_capability_token_printed: false;
}

export interface AgentPaidWorkWcEarningAdapterReceiptV1
  extends AgentPaidWorkWcEarningAdapterReceiptDraftV1 {
  adapter_receipt_id: string;
}

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function record(value: unknown, label: string): JsonObject {
  assertCondition(
    typeof value === "object" && value !== null && !Array.isArray(value),
    `${label} must be an object`,
  );
  return value as JsonObject;
}

function exactKeys(
  value: JsonObject,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assertCondition(
    JSON.stringify(actual) === JSON.stringify(wanted),
    `${label} keys differ expected=${JSON.stringify(wanted)} actual=${JSON.stringify(actual)}`,
  );
}

function stringValue(
  value: unknown,
  label: string,
  pattern: RegExp = IDENTIFIER,
  min = 1,
  max = 4096,
): string {
  assertCondition(typeof value === "string", `${label} must be a string`);
  assertCondition(
    value.length >= min && value.length <= max,
    `${label} length is invalid`,
  );
  assertCondition(pattern.test(value), `${label} format is invalid`);
  return value;
}

function numberValue(value: unknown, label: string): number {
  assertCondition(
    typeof value === "number" && Number.isFinite(value),
    `${label} must be a finite number`,
  );
  return value;
}

function booleanLiteral(
  value: unknown,
  expected: boolean,
  label: string,
): boolean {
  assertCondition(value === expected, `${label} must be ${expected}`);
  return expected;
}

function canonicalize(value: unknown): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  const source = record(value, "canonical value");
  const output: JsonObject = {};

  for (const key of Object.keys(source).sort()) {
    assertCondition(source[key] !== undefined, "canonical JSON rejects undefined");
    output[key] = canonicalize(source[key]);
  }

  return output;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function sha256Text(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function parseUtc(value: unknown, label: string): string {
  const text = stringValue(value, label, UTC, 20, 24);
  const epoch = Date.parse(text);
  assertCondition(Number.isFinite(epoch), `${label} is not a real timestamp`);
  return text;
}

function parseCoordinatorBase(value: unknown): string {
  const text = stringValue(
    value,
    "coordinator.base_url",
    /^https?:\/\/[^\s]{3,2040}$/,
    8,
    2048,
  );
  const parsed = new URL(text);
  assertCondition(
    parsed.username === "" && parsed.password === "",
    "coordinator.base_url must not contain credentials",
  );
  assertCondition(
    parsed.pathname === "/" && parsed.search === "" && parsed.hash === "",
    "coordinator.base_url must be an origin",
  );
  const host = parsed.hostname.toLowerCase();
  const loopback =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    /^100\.(?:\d{1,3}\.){2}\d{1,3}$/.test(host);
  assertCondition(
    parsed.protocol === "https:" || (parsed.protocol === "http:" && loopback),
    "coordinator.base_url requires HTTPS except loopback/Tailscale HTTP",
  );
  return text.replace(/\/$/, "");
}

function authorityAllFalse(value: unknown, label: string): void {
  const object = record(value, label);
  for (const key of Object.keys(object)) {
    assertCondition(object[key] === false, `${label}.${key} must be false`);
  }
}

function parseSubmissionReceipt(value: unknown): {
  submission_id: string;
  submission_receipt_id: string;
  work_order_id: string;
  credential_id: string;
  agent_id: string;
} {
  const root = record(value, "submission receipt");
  assertCondition(
    root.marker === "VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_RECEIPT_V1",
    "submission receipt marker mismatch",
  );
  assertCondition(root.version === 1, "submission receipt version must be 1");
  booleanLiteral(
    root.authorization_verified,
    true,
    "submission receipt authorization_verified",
  );
  booleanLiteral(root.duplicate, false, "submission receipt duplicate");

  const admission = record(root.admission, "submission receipt admission");
  assertCondition(
    admission.decision === "accepted_for_review",
    "submission receipt must be accepted_for_review",
  );

  const authentication = record(
    root.authentication,
    "submission receipt authentication",
  );
  const credentialId = stringValue(
    authentication.credential_id,
    "submission receipt authentication.credential_id",
    CREDENTIAL_ID,
    74,
    74,
  );
  const agentId = stringValue(
    authentication.agent_id,
    "submission receipt authentication.agent_id",
    IDENTIFIER,
    3,
    160,
  );

  authorityAllFalse(root.authority, "submission receipt authority");

  return {
    submission_id: stringValue(
      root.submission_id,
      "submission_id",
      IDENTIFIER,
      3,
      128,
    ),
    submission_receipt_id: stringValue(
      root.receipt_id,
      "submission receipt receipt_id",
      SUBMISSION_RECEIPT_ID,
      74,
      74,
    ),
    work_order_id: stringValue(
      root.work_order_id,
      "submission receipt work_order_id",
      WORK_ORDER_ID,
      73,
      73,
    ),
    credential_id: credentialId,
    agent_id: agentId,
  };
}

function parseWorkOrder(
  value: unknown,
  expectedWorkOrderId: string,
  expectedAgentId: string,
): void {
  const root = record(value, "work order");
  assertCondition(
    root.marker === "VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1",
    "work order marker mismatch",
  );
  assertCondition(root.version === 1, "work order version must be 1");
  assertCondition(
    root.work_order_id === expectedWorkOrderId,
    "work order ID differs from submission receipt",
  );

  const requester = record(root.requester, "work order requester");
  assertCondition(
    requester.agent_id === expectedAgentId,
    "work order requester differs from authenticated agent",
  );

  const service = record(root.service, "work order service");
  assertCondition(
    service.capability_id === AGENT_PAID_WORK_WC_EARNING_ADAPTER_CAPABILITY_ID,
    `work order capability must be ${AGENT_PAID_WORK_WC_EARNING_ADAPTER_CAPABILITY_ID}`,
  );
}

function parseBinding(
  registryValue: unknown,
  credentialId: string,
  agentId: string,
  evaluatedAtUtc: string,
): {
  binding_registry_id: string;
  binding_id: string;
  destination_wc_account: string;
} {
  const registry = record(registryValue, "binding registry");
  assertCondition(
    registry.marker ===
      "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_REGISTRY_V1",
    "binding registry marker mismatch",
  );
  assertCondition(registry.version === 1, "binding registry version must be 1");
  const registryId = stringValue(
    registry.registry_id,
    "binding registry ID",
    BINDING_REGISTRY_ID,
    76,
    76,
  );
  assertCondition(
    Array.isArray(registry.bindings),
    "binding registry bindings must be an array",
  );

  const matches = registry.bindings.filter((item) => {
    const candidate = item as JsonObject;
    return (
      typeof candidate === "object" &&
      candidate !== null &&
      candidate.credential_id === credentialId &&
      candidate.agent_id === agentId &&
      candidate.status === "active" &&
      candidate.revoked_at === null
    );
  });

  assertCondition(matches.length === 1, "active credential binding cardinality mismatch");
  const binding = record(matches[0], "active credential binding");
  const authority = record(binding.authority, "active credential binding authority");

  booleanLiteral(
    authority.paid_work_submission_identity,
    true,
    "binding authority paid_work_submission_identity",
  );
  booleanLiteral(
    authority.wc_award_destination,
    true,
    "binding authority wc_award_destination",
  );
  for (const key of [
    "payment",
    "wc_ledger_write",
    "wc_to_void_settlement",
    "wallet_or_signer",
  ]) {
    booleanLiteral(authority[key], false, `binding authority ${key}`);
  }

  const validFrom = parseUtc(binding.valid_from, "binding valid_from");
  const validUntil = parseUtc(binding.valid_until, "binding valid_until");
  const evaluated = Date.parse(evaluatedAtUtc);
  assertCondition(
    evaluated >= Date.parse(validFrom) && evaluated <= Date.parse(validUntil),
    "binding is not active at adapter plan creation",
  );

  return {
    binding_registry_id: registryId,
    binding_id: stringValue(
      binding.binding_id,
      "binding_id",
      BINDING_ID,
      75,
      75,
    ),
    destination_wc_account: stringValue(
      binding.destination_wc_account,
      "destination_wc_account",
      IDENTIFIER,
      3,
      128,
    ),
  };
}

export interface DeriveAgentPaidWorkWcEarningAdapterPlanV1Input {
  submission_receipt: unknown;
  work_order: unknown;
  binding_registry: unknown;
  binding_registry_sha256: string;
  selected_contract_capture_receipt_path: string;
  participant_cli_path: string;
  pilot_source_path: string;
  acceptance_source_path: string;
  ticket_path: string;
  private_output_dir: string;
  coordinator_base_url: string;
  coordinator_node_id: string;
  created_at_utc: string;
  expires_at_utc: string;
  nonce: string;
}

export function deriveAgentPaidWorkWcEarningAdapterPlanV1(
  input: DeriveAgentPaidWorkWcEarningAdapterPlanV1Input,
): AgentPaidWorkWcEarningAdapterPlanV1 {
  const createdAt = parseUtc(input.created_at_utc, "created_at_utc");
  const expiresAt = parseUtc(input.expires_at_utc, "expires_at_utc");
  const createdEpoch = Date.parse(createdAt);
  const expiresEpoch = Date.parse(expiresAt);

  assertCondition(expiresEpoch > createdEpoch, "plan expiry must follow creation");
  assertCondition(
    expiresEpoch - createdEpoch <= 15 * 60 * 1000,
    "adapter plan lifetime must not exceed 900 seconds",
  );

  const submission = parseSubmissionReceipt(input.submission_receipt);
  parseWorkOrder(
    input.work_order,
    submission.work_order_id,
    submission.agent_id,
  );
  const binding = parseBinding(
    input.binding_registry,
    submission.credential_id,
    submission.agent_id,
    createdAt,
  );

  const draft: AgentPaidWorkWcEarningAdapterPlanDraftV1 = {
    marker: AGENT_PAID_WORK_WC_EARNING_ADAPTER_PLAN_MARKER,
    version: 1,
    created_at_utc: createdAt,
    expires_at_utc: expiresAt,
    selected_contract_capture: {
      receipt_path: stringValue(
        input.selected_contract_capture_receipt_path,
        "selected contract receipt path",
        /^\/.+/,
        2,
        4096,
      ),
      receipt_sha256:
        AGENT_PAID_WORK_WC_EARNING_ADAPTER_SELECTED_CONTRACT_RECEIPT_SHA256,
    },
    submission: {
      ...submission,
      capability_id: AGENT_PAID_WORK_WC_EARNING_ADAPTER_CAPABILITY_ID,
    },
    binding: {
      ...binding,
      binding_registry_sha256: stringValue(
        input.binding_registry_sha256,
        "binding registry SHA",
        HEX64,
        64,
        64,
      ),
    },
    runtime: {
      participant_cli_path: stringValue(
        input.participant_cli_path,
        "participant CLI path",
        /^\/.+/,
        2,
        4096,
      ),
      participant_cli_sha256:
        AGENT_PAID_WORK_WC_EARNING_ADAPTER_PARTICIPANT_CLI_SHA256,
      pilot_source_path: stringValue(
        input.pilot_source_path,
        "pilot source path",
        /^\/.+/,
        2,
        4096,
      ),
      pilot_source_sha256:
        AGENT_PAID_WORK_WC_EARNING_ADAPTER_PILOT_SOURCE_SHA256,
      acceptance_source_path: stringValue(
        input.acceptance_source_path,
        "acceptance source path",
        /^\/.+/,
        2,
        4096,
      ),
      acceptance_source_sha256:
        AGENT_PAID_WORK_WC_EARNING_ADAPTER_ACCEPTANCE_SOURCE_SHA256,
      execute_route: AGENT_PAID_WORK_WC_EARNING_ADAPTER_EXECUTE_ROUTE,
      task_class: AGENT_PAID_WORK_WC_EARNING_ADAPTER_TASK_CLASS,
      fixed_award_wc: AGENT_PAID_WORK_WC_EARNING_ADAPTER_FIXED_AWARD_WC,
    },
    coordinator: {
      base_url: parseCoordinatorBase(input.coordinator_base_url),
      node_id: stringValue(
        input.coordinator_node_id,
        "coordinator node ID",
        NODE_ID,
        32,
        32,
      ),
    },
    execution: {
      ticket_path: stringValue(
        input.ticket_path,
        "ticket path",
        /^\/.+/,
        2,
        4096,
      ),
      private_output_dir: stringValue(
        input.private_output_dir,
        "private output directory",
        /^\/.+/,
        2,
        4096,
      ),
      confirmation:
        AGENT_PAID_WORK_WC_EARNING_ADAPTER_EXECUTE_CONFIRMATION,
      participant_cli_is_only_capability_token_consumer: true,
      one_time_ticket_required: true,
      exact_first_credit_required: true,
      identical_duplicate_second_credit_forbidden: true,
    },
    authority: {
      bounded_work_execution_via_participant_cli: true,
      wc_ledger_write_via_verified_receipt_only: true,
      payment_transfer: false,
      wc_to_void_settlement: false,
      wallet_or_signer_access: false,
      service_restart: false,
      deployment: false,
      automatic_background_loop: false,
    },
    nonce: stringValue(input.nonce, "nonce", IDENTIFIER, 3, 128),
  };

  return {
    ...draft,
    plan_id:
      AGENT_PAID_WORK_WC_EARNING_ADAPTER_PLAN_ID_PREFIX +
      sha256Text(canonicalJson(draft)),
  };
}

function validatePlanDraftShape(
  value: unknown,
  allowId: boolean,
): AgentPaidWorkWcEarningAdapterPlanDraftV1 {
  const root = record(value, "adapter plan");
  exactKeys(
    root,
    [
      "marker",
      "version",
      "created_at_utc",
      "expires_at_utc",
      "selected_contract_capture",
      "submission",
      "binding",
      "runtime",
      "coordinator",
      "execution",
      "authority",
      "nonce",
      ...(allowId ? ["plan_id"] : []),
    ],
    "adapter plan",
  );

  assertCondition(
    root.marker === AGENT_PAID_WORK_WC_EARNING_ADAPTER_PLAN_MARKER,
    "adapter plan marker mismatch",
  );
  assertCondition(root.version === 1, "adapter plan version must be 1");
  const createdAt = parseUtc(root.created_at_utc, "plan created_at_utc");
  const expiresAt = parseUtc(root.expires_at_utc, "plan expires_at_utc");
  assertCondition(
    Date.parse(expiresAt) > Date.parse(createdAt) &&
      Date.parse(expiresAt) - Date.parse(createdAt) <= 15 * 60 * 1000,
    "adapter plan lifetime is invalid",
  );

  const selected = record(
    root.selected_contract_capture,
    "selected contract capture",
  );
  exactKeys(
    selected,
    ["receipt_path", "receipt_sha256"],
    "selected contract capture",
  );
  stringValue(
    selected.receipt_path,
    "selected contract capture receipt path",
    /^\/.+/,
    2,
    4096,
  );
  assertCondition(
    selected.receipt_sha256 ===
      AGENT_PAID_WORK_WC_EARNING_ADAPTER_SELECTED_CONTRACT_RECEIPT_SHA256,
    "selected contract capture SHA mismatch",
  );

  const submission = record(root.submission, "plan submission");
  exactKeys(
    submission,
    [
      "submission_id",
      "submission_receipt_id",
      "work_order_id",
      "credential_id",
      "agent_id",
      "capability_id",
    ],
    "plan submission",
  );
  stringValue(submission.submission_id, "plan submission_id", IDENTIFIER, 3, 128);
  stringValue(
    submission.submission_receipt_id,
    "plan submission_receipt_id",
    SUBMISSION_RECEIPT_ID,
    74,
    74,
  );
  stringValue(
    submission.work_order_id,
    "plan work_order_id",
    WORK_ORDER_ID,
    73,
    73,
  );
  stringValue(
    submission.credential_id,
    "plan credential_id",
    CREDENTIAL_ID,
    74,
    74,
  );
  stringValue(submission.agent_id, "plan agent_id", IDENTIFIER, 3, 160);
  assertCondition(
    submission.capability_id === AGENT_PAID_WORK_WC_EARNING_ADAPTER_CAPABILITY_ID,
    "plan capability ID mismatch",
  );

  const binding = record(root.binding, "plan binding");
  exactKeys(
    binding,
    [
      "binding_registry_id",
      "binding_registry_sha256",
      "binding_id",
      "destination_wc_account",
    ],
    "plan binding",
  );
  stringValue(
    binding.binding_registry_id,
    "plan binding_registry_id",
    BINDING_REGISTRY_ID,
    76,
    76,
  );
  stringValue(
    binding.binding_registry_sha256,
    "plan binding_registry_sha256",
    HEX64,
    64,
    64,
  );
  stringValue(binding.binding_id, "plan binding_id", BINDING_ID, 75, 75);
  stringValue(
    binding.destination_wc_account,
    "plan destination_wc_account",
    IDENTIFIER,
    3,
    128,
  );

  const runtime = record(root.runtime, "plan runtime");
  exactKeys(
    runtime,
    [
      "participant_cli_path",
      "participant_cli_sha256",
      "pilot_source_path",
      "pilot_source_sha256",
      "acceptance_source_path",
      "acceptance_source_sha256",
      "execute_route",
      "task_class",
      "fixed_award_wc",
    ],
    "plan runtime",
  );
  stringValue(runtime.participant_cli_path, "participant_cli_path", /^\/.+/, 2, 4096);
  assertCondition(
    runtime.participant_cli_sha256 ===
      AGENT_PAID_WORK_WC_EARNING_ADAPTER_PARTICIPANT_CLI_SHA256,
    "participant CLI SHA mismatch",
  );
  stringValue(runtime.pilot_source_path, "pilot_source_path", /^\/.+/, 2, 4096);
  assertCondition(
    runtime.pilot_source_sha256 ===
      AGENT_PAID_WORK_WC_EARNING_ADAPTER_PILOT_SOURCE_SHA256,
    "pilot source SHA mismatch",
  );
  stringValue(
    runtime.acceptance_source_path,
    "acceptance_source_path",
    /^\/.+/,
    2,
    4096,
  );
  assertCondition(
    runtime.acceptance_source_sha256 ===
      AGENT_PAID_WORK_WC_EARNING_ADAPTER_ACCEPTANCE_SOURCE_SHA256,
    "acceptance source SHA mismatch",
  );
  assertCondition(
    runtime.execute_route === AGENT_PAID_WORK_WC_EARNING_ADAPTER_EXECUTE_ROUTE,
    "execute route mismatch",
  );
  assertCondition(
    runtime.task_class === AGENT_PAID_WORK_WC_EARNING_ADAPTER_TASK_CLASS,
    "task class mismatch",
  );
  assertCondition(
    runtime.fixed_award_wc ===
      AGENT_PAID_WORK_WC_EARNING_ADAPTER_FIXED_AWARD_WC,
    "fixed award mismatch",
  );

  const coordinator = record(root.coordinator, "plan coordinator");
  exactKeys(coordinator, ["base_url", "node_id"], "plan coordinator");
  parseCoordinatorBase(coordinator.base_url);
  stringValue(coordinator.node_id, "plan coordinator node_id", NODE_ID, 32, 32);

  const execution = record(root.execution, "plan execution");
  exactKeys(
    execution,
    [
      "ticket_path",
      "private_output_dir",
      "confirmation",
      "participant_cli_is_only_capability_token_consumer",
      "one_time_ticket_required",
      "exact_first_credit_required",
      "identical_duplicate_second_credit_forbidden",
    ],
    "plan execution",
  );
  stringValue(execution.ticket_path, "plan ticket_path", /^\/.+/, 2, 4096);
  stringValue(
    execution.private_output_dir,
    "plan private_output_dir",
    /^\/.+/,
    2,
    4096,
  );
  assertCondition(
    execution.confirmation ===
      AGENT_PAID_WORK_WC_EARNING_ADAPTER_EXECUTE_CONFIRMATION,
    "plan confirmation mismatch",
  );
  for (const key of [
    "participant_cli_is_only_capability_token_consumer",
    "one_time_ticket_required",
    "exact_first_credit_required",
    "identical_duplicate_second_credit_forbidden",
  ]) {
    booleanLiteral(execution[key], true, `plan execution ${key}`);
  }

  const authority = record(root.authority, "plan authority");
  exactKeys(
    authority,
    [
      "bounded_work_execution_via_participant_cli",
      "wc_ledger_write_via_verified_receipt_only",
      "payment_transfer",
      "wc_to_void_settlement",
      "wallet_or_signer_access",
      "service_restart",
      "deployment",
      "automatic_background_loop",
    ],
    "plan authority",
  );
  booleanLiteral(
    authority.bounded_work_execution_via_participant_cli,
    true,
    "plan bounded work execution",
  );
  booleanLiteral(
    authority.wc_ledger_write_via_verified_receipt_only,
    true,
    "plan verified-receipt WC write",
  );
  for (const key of [
    "payment_transfer",
    "wc_to_void_settlement",
    "wallet_or_signer_access",
    "service_restart",
    "deployment",
    "automatic_background_loop",
  ]) {
    booleanLiteral(authority[key], false, `plan authority ${key}`);
  }

  stringValue(root.nonce, "plan nonce", IDENTIFIER, 3, 128);

  if (allowId) {
    const { plan_id: _planId, ...draft } = root;
    return draft as unknown as AgentPaidWorkWcEarningAdapterPlanDraftV1;
  }

  return root as unknown as AgentPaidWorkWcEarningAdapterPlanDraftV1;
}

export function validateAgentPaidWorkWcEarningAdapterPlanV1(
  value: unknown,
): asserts value is AgentPaidWorkWcEarningAdapterPlanV1 {
  const root = record(value, "adapter plan envelope");
  const draft = validatePlanDraftShape(value, true);
  const planId = stringValue(
    root.plan_id,
    "adapter plan_id",
    PLAN_ID,
    76,
    76,
  );
  assertCondition(
    planId ===
      AGENT_PAID_WORK_WC_EARNING_ADAPTER_PLAN_ID_PREFIX +
        sha256Text(canonicalJson(draft)),
    "adapter plan_id does not match canonical payload",
  );
}

function parseParticipantReceipt(
  value: unknown,
  plan: AgentPaidWorkWcEarningAdapterPlanV1,
): {
  marker: "VOID_WC_PUBLIC_EARNING_PARTICIPANT_CLI_V1";
  account: string;
  ticket_id: string;
  job_id: string;
  receipt_id: string;
  wc: {
    before: number;
    after: number;
    delta: 3;
    fixed_award_wc: 3;
  };
  remote_executor: true;
  signature_verified: true;
  remote_health_verified: true;
  remote_job_verified: true;
  remote_receipt_verified: true;
  capability_consumed: true;
  money_movement: false;
} {
  const root = record(value, "participant receipt");
  assertCondition(
    root.marker === "VOID_WC_PUBLIC_EARNING_PARTICIPANT_CLI_V1",
    "participant receipt marker mismatch",
  );
  const account = stringValue(
    root.account,
    "participant receipt account",
    IDENTIFIER,
    3,
    128,
  );
  assertCondition(
    account === plan.binding.destination_wc_account,
    "participant receipt account differs from bound WC account",
  );

  const wc = record(root.wc, "participant receipt WC transition");
  const before = numberValue(wc.before, "participant WC before");
  const after = numberValue(wc.after, "participant WC after");
  assertCondition(wc.delta === 3, "participant WC delta must equal 3");
  assertCondition(wc.fixed_award_wc === 3, "participant fixed award must equal 3");
  assertCondition(after === before + 3, "participant WC after must equal before + 3");

  for (const key of [
    "remote_executor",
    "signature_verified",
    "remote_health_verified",
    "remote_job_verified",
    "remote_receipt_verified",
    "capability_consumed",
  ]) {
    booleanLiteral(root[key], true, `participant receipt ${key}`);
  }
  booleanLiteral(root.money_movement, false, "participant receipt money_movement");

  return {
    marker: "VOID_WC_PUBLIC_EARNING_PARTICIPANT_CLI_V1",
    account,
    ticket_id: stringValue(root.ticket_id, "participant ticket_id", IDENTIFIER, 3, 160),
    job_id: stringValue(root.job_id, "participant job_id", IDENTIFIER, 3, 192),
    receipt_id: stringValue(
      root.receipt_id,
      "participant receipt_id",
      IDENTIFIER,
      3,
      192,
    ),
    wc: {
      before,
      after,
      delta: 3,
      fixed_award_wc: 3,
    },
    remote_executor: true,
    signature_verified: true,
    remote_health_verified: true,
    remote_job_verified: true,
    remote_receipt_verified: true,
    capability_consumed: true,
    money_movement: false,
  };
}

export function materializeAgentPaidWorkWcEarningAdapterReceiptV1(
  planValue: unknown,
  participantReceiptValue: unknown,
  evidenceValue: AdapterParticipantEvidenceV1,
  createdAtUtcValue: string,
): AgentPaidWorkWcEarningAdapterReceiptV1 {
  validateAgentPaidWorkWcEarningAdapterPlanV1(planValue);
  const plan = planValue as AgentPaidWorkWcEarningAdapterPlanV1;
  const participant = parseParticipantReceipt(participantReceiptValue, plan);
  const createdAt = parseUtc(createdAtUtcValue, "adapter receipt created_at_utc");
  assertCondition(
    Date.parse(createdAt) >= Date.parse(plan.created_at_utc),
    "adapter receipt predates plan",
  );

  const evidence = record(evidenceValue, "participant evidence");
  exactKeys(
    evidence,
    [
      "participant_receipt_path",
      "participant_receipt_sha256",
      "participant_stdout_sha256",
      "participant_stderr_sha256",
      "ticket_deleted",
      "recovered_from_existing_participant_receipt",
    ],
    "participant evidence",
  );
  stringValue(
    evidence.participant_receipt_path,
    "participant receipt path",
    /^\/.+/,
    2,
    4096,
  );
  for (const key of [
    "participant_receipt_sha256",
    "participant_stdout_sha256",
    "participant_stderr_sha256",
  ]) {
    stringValue(evidence[key], `participant evidence ${key}`, HEX64, 64, 64);
  }
  booleanLiteral(evidence.ticket_deleted, true, "participant ticket_deleted");
  assertCondition(
    typeof evidence.recovered_from_existing_participant_receipt === "boolean",
    "participant recovery flag must be boolean",
  );

  const draft: AgentPaidWorkWcEarningAdapterReceiptDraftV1 = {
    marker: AGENT_PAID_WORK_WC_EARNING_ADAPTER_RECEIPT_MARKER,
    version: 1,
    created_at_utc: createdAt,
    plan_id: plan.plan_id,
    submission: plan.submission,
    binding: plan.binding,
    participant: {
      marker: participant.marker,
      account: participant.account,
      ticket_id: participant.ticket_id,
      job_id: participant.job_id,
      receipt_id: participant.receipt_id,
      participant_receipt_path: evidence.participant_receipt_path as string,
      participant_receipt_sha256:
        evidence.participant_receipt_sha256 as string,
      participant_stdout_sha256: evidence.participant_stdout_sha256 as string,
      participant_stderr_sha256: evidence.participant_stderr_sha256 as string,
      ticket_deleted: true,
      recovered_from_existing_participant_receipt:
        evidence.recovered_from_existing_participant_receipt as boolean,
    },
    wc: {
      before: participant.wc.before,
      after: participant.wc.after,
      delta: 3,
      fixed_award_wc: 3,
      credited: true,
      duplicate: false,
      canonical_redeemable: true,
    },
    verification: {
      remote_executor: true,
      signature_verified: true,
      remote_health_verified: true,
      remote_job_verified: true,
      remote_receipt_verified: true,
      capability_consumed: true,
      participant_selected_award: false,
      automatic_background_loop: false,
      money_movement: false,
    },
    authority: {
      live_work_execution: true,
      wc_ledger_write: true,
      payment_transfer: false,
      wc_to_void_settlement: false,
      wallet_or_signer_access: false,
      service_restart: false,
      deployment: false,
    },
    raw_capability_token_printed: false,
  };

  return {
    ...draft,
    adapter_receipt_id:
      AGENT_PAID_WORK_WC_EARNING_ADAPTER_RECEIPT_ID_PREFIX +
      sha256Text(canonicalJson(draft)),
  };
}

function validateReceiptDraftShape(
  value: unknown,
  allowId: boolean,
): AgentPaidWorkWcEarningAdapterReceiptDraftV1 {
  const root = record(value, "adapter receipt");
  exactKeys(
    root,
    [
      "marker",
      "version",
      "created_at_utc",
      "plan_id",
      "submission",
      "binding",
      "participant",
      "wc",
      "verification",
      "authority",
      "raw_capability_token_printed",
      ...(allowId ? ["adapter_receipt_id"] : []),
    ],
    "adapter receipt",
  );

  assertCondition(
    root.marker === AGENT_PAID_WORK_WC_EARNING_ADAPTER_RECEIPT_MARKER,
    "adapter receipt marker mismatch",
  );
  assertCondition(root.version === 1, "adapter receipt version must be 1");
  parseUtc(root.created_at_utc, "adapter receipt created_at_utc");
  stringValue(root.plan_id, "adapter receipt plan_id", PLAN_ID, 76, 76);

  const submission = record(root.submission, "adapter receipt submission");
  stringValue(
    submission.submission_receipt_id,
    "adapter receipt submission_receipt_id",
    SUBMISSION_RECEIPT_ID,
    74,
    74,
  );
  stringValue(
    submission.work_order_id,
    "adapter receipt work_order_id",
    WORK_ORDER_ID,
    73,
    73,
  );
  stringValue(
    submission.credential_id,
    "adapter receipt credential_id",
    CREDENTIAL_ID,
    74,
    74,
  );

  const binding = record(root.binding, "adapter receipt binding");
  stringValue(binding.binding_id, "adapter receipt binding_id", BINDING_ID, 75, 75);
  stringValue(
    binding.binding_registry_sha256,
    "adapter receipt binding registry SHA",
    HEX64,
    64,
    64,
  );

  const participant = record(root.participant, "adapter receipt participant");
  assertCondition(
    participant.marker === "VOID_WC_PUBLIC_EARNING_PARTICIPANT_CLI_V1",
    "adapter receipt participant marker mismatch",
  );
  booleanLiteral(participant.ticket_deleted, true, "adapter receipt ticket_deleted");
  assertCondition(
    typeof participant.recovered_from_existing_participant_receipt === "boolean",
    "adapter receipt recovery flag must be boolean",
  );

  const wc = record(root.wc, "adapter receipt WC");
  assertCondition(wc.delta === 3, "adapter receipt WC delta must be 3");
  assertCondition(wc.fixed_award_wc === 3, "adapter receipt fixed award must be 3");
  booleanLiteral(wc.credited, true, "adapter receipt credited");
  booleanLiteral(wc.duplicate, false, "adapter receipt duplicate");
  booleanLiteral(
    wc.canonical_redeemable,
    true,
    "adapter receipt canonical_redeemable",
  );
  assertCondition(
    numberValue(wc.after, "adapter receipt WC after") ===
      numberValue(wc.before, "adapter receipt WC before") + 3,
    "adapter receipt WC transition must be +3",
  );

  const verification = record(root.verification, "adapter receipt verification");
  for (const key of [
    "remote_executor",
    "signature_verified",
    "remote_health_verified",
    "remote_job_verified",
    "remote_receipt_verified",
    "capability_consumed",
  ]) {
    booleanLiteral(verification[key], true, `adapter receipt verification ${key}`);
  }
  for (const key of [
    "participant_selected_award",
    "automatic_background_loop",
    "money_movement",
  ]) {
    booleanLiteral(verification[key], false, `adapter receipt verification ${key}`);
  }

  const authority = record(root.authority, "adapter receipt authority");
  booleanLiteral(authority.live_work_execution, true, "adapter receipt live work");
  booleanLiteral(authority.wc_ledger_write, true, "adapter receipt WC ledger write");
  for (const key of [
    "payment_transfer",
    "wc_to_void_settlement",
    "wallet_or_signer_access",
    "service_restart",
    "deployment",
  ]) {
    booleanLiteral(authority[key], false, `adapter receipt authority ${key}`);
  }
  booleanLiteral(
    root.raw_capability_token_printed,
    false,
    "adapter receipt raw_capability_token_printed",
  );

  if (allowId) {
    const { adapter_receipt_id: _receiptId, ...draft } = root;
    return draft as unknown as AgentPaidWorkWcEarningAdapterReceiptDraftV1;
  }

  return root as unknown as AgentPaidWorkWcEarningAdapterReceiptDraftV1;
}

export function validateAgentPaidWorkWcEarningAdapterReceiptV1(
  value: unknown,
): asserts value is AgentPaidWorkWcEarningAdapterReceiptV1 {
  const root = record(value, "adapter receipt envelope");
  const draft = validateReceiptDraftShape(value, true);
  const receiptId = stringValue(
    root.adapter_receipt_id,
    "adapter receipt ID",
    RECEIPT_ID,
    76,
    76,
  );
  assertCondition(
    receiptId ===
      AGENT_PAID_WORK_WC_EARNING_ADAPTER_RECEIPT_ID_PREFIX +
        sha256Text(canonicalJson(draft)),
    "adapter receipt ID does not match canonical payload",
  );
}
