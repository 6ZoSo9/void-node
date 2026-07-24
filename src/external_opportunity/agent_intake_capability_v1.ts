import { createHash } from "node:crypto";

export const VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_V1 =
  "VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_V1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_SCHEMA_V1 =
  "void-external-opportunity-agent-intake-capability-v1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_ID_V1 =
  "void.external_opportunity.paper_intake.v1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_NEGOTIATION_REQUEST_SCHEMA_V1 =
  "void-external-opportunity-agent-intake-negotiation-request-v1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_NEGOTIATION_RESULT_SCHEMA_V1 =
  "void-external-opportunity-agent-intake-negotiation-result-v1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_FINGERPRINT_V1 =
  "c4e9ea03631b39962753cd7f91c198bbba1e4081c716da24e27f14a64f7bfd7a" as const;

export const VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_RECORD_CONFIRMATION_V1 =
  "recordPaperOpportunityV1" as const;

export type ExternalOpportunityAgentIntakeModeV1 = "dry_run" | "record";

export type ExternalOpportunityAgentIntakeStatusV1 =
  | "dry_run_ready"
  | "dry_run_duplicate"
  | "dry_run_held"
  | "record_applied"
  | "record_duplicate"
  | "record_held"
  | "record_lock_busy"
  | "input_held"
  | "usage_held"
  | "internal_held";

export interface ExternalOpportunityAgentIntakeCapabilityModeV1 {
  mode: ExternalOpportunityAgentIntakeModeV1;
  default: boolean;
  journal_write: boolean;
  confirmation_required: boolean;
  confirmation: string;
  statuses: ExternalOpportunityAgentIntakeStatusV1[];
  exit_codes: number[];
}

export interface ExternalOpportunityAgentIntakePipelineBindingV1 {
  stage:
    | "provider_risk_registry"
    | "paper_risk_classification"
    | "paper_classification_journal"
    | "paper_classification_journal_file_store"
    | "paper_intake_cli";
  path: string;
  sha256: string;
}

export interface ExternalOpportunityAgentIntakeCapabilityV1 {
  schema:
    typeof VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_SCHEMA_V1;
  marker: typeof VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_V1;
  version: 1;
  capability_id:
    typeof VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_ID_V1;
  availability: "offline_static_contract";
  transport: {
    invocation: string;
    request_delivery: "absolute_local_json_file";
    response_delivery: "machine_readable_json";
    success_channel: "stdout";
    usage_and_input_error_channel: "stderr_when_exit_code_gte_64";
    network_endpoint: false;
    network_listener: false;
    authentication: "none";
  };
  request_contract: {
    schema: "void-external-opportunity-paper-intake-cli-request-v1";
    marker: "VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_V1";
    version: 1;
    schema_path: string;
    schema_sha256: string;
    example_path: string;
    example_sha256: string;
    max_request_bytes: number;
    allowed_keys: string[];
    path_requirements: {
      request_path: string[];
      registry_path: string[];
      observation_path: string[];
      allowed_root: string[];
      request_registry_observation_distinct: true;
    };
    input_limits: {
      registry_max_bytes: number;
      observation_max_bytes: number;
      default_journal_max_file_bytes: number;
      default_journal_max_entries: number;
      default_journal_max_line_bytes: number;
    };
  };
  modes: ExternalOpportunityAgentIntakeCapabilityModeV1[];
  pipeline_bindings: ExternalOpportunityAgentIntakePipelineBindingV1[];
  negotiation: {
    request_schema:
      typeof VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_NEGOTIATION_REQUEST_SCHEMA_V1;
    result_schema:
      typeof VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_NEGOTIATION_RESULT_SCHEMA_V1;
    supported_versions: number[];
    supported_modes: ExternalOpportunityAgentIntakeModeV1[];
    manifest_fingerprint_algorithm:
      "sha256-canonical-json-without-fingerprint";
  };
  unsupported: {
    network_endpoint: true;
    network_listener: true;
    authentication_secret: true;
    provider_polling: true;
    paid_work_submission: true;
    wc_earning: true;
    wallet_or_key_access: true;
    transaction_construction: true;
    transaction_submission: true;
    runtime_mutation: true;
    service_mutation: true;
    scheduler_mutation: true;
    live_execution: true;
  };
  authority: {
    repository_fixture_read: true;
    repository_schema_read: true;
    local_request_read_when_explicitly_invoked: true;
    local_registry_read_when_explicitly_invoked: true;
    local_observation_read_when_explicitly_invoked: true;
    local_journal_read_when_explicitly_invoked: true;
    local_journal_write_with_exact_confirmation: true;
    implicit_or_scheduled_access: false;
    network_request: false;
    credential_access: false;
    wallet_or_key_access: false;
    transaction_construction: false;
    transaction_submission: false;
    runtime_mutation: false;
    service_mutation: false;
    scheduler_mutation: false;
    paid_work_submission: false;
    wc_earning: false;
    live_execution: false;
  };
  manifest_fingerprint_sha256: string;
}

export interface ExternalOpportunityAgentIntakeNegotiationRequestV1 {
  schema:
    typeof VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_NEGOTIATION_REQUEST_SCHEMA_V1;
  capability_id:
    typeof VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_ID_V1;
  accepted_versions: number[];
  requested_mode: ExternalOpportunityAgentIntakeModeV1;
  planned_request_bytes: number;
  accepts_explicit_confirmation: boolean;
  required_request_schema_sha256?: string;
  required_manifest_fingerprint_sha256?: string;
  required_statuses?: ExternalOpportunityAgentIntakeStatusV1[];
  accepted_exit_codes?: number[];
  requires_network_endpoint?: boolean;
  requires_network_listener?: boolean;
  requires_authentication_secret?: boolean;
  requires_provider_polling?: boolean;
  requires_paid_work_submission?: boolean;
  requires_wc_earning?: boolean;
  requires_wallet_or_key_access?: boolean;
  requires_transaction_construction?: boolean;
  requires_transaction_submission?: boolean;
  requires_runtime_mutation?: boolean;
  requires_service_mutation?: boolean;
  requires_scheduler_mutation?: boolean;
  requires_live_execution?: boolean;
}

export interface ExternalOpportunityAgentIntakeNegotiationResultV1 {
  schema:
    typeof VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_NEGOTIATION_RESULT_SCHEMA_V1;
  marker: typeof VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_V1;
  version: 1;
  status: "accepted" | "held";
  reasons: string[];
  capability_id:
    typeof VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_ID_V1;
  selected_version: 1 | null;
  selected_mode: ExternalOpportunityAgentIntakeModeV1 | null;
  confirmation_required: boolean;
  confirmation: string;
  request_schema_sha256: string;
  manifest_fingerprint_sha256: string;
  supported_statuses: ExternalOpportunityAgentIntakeStatusV1[];
  supported_exit_codes: number[];
  network_endpoint_available: false;
  network_listener_available: false;
  authentication_secret_available: false;
  provider_polling_available: false;
  paid_work_submission_available: false;
  wc_earning_available: false;
  wallet_or_key_access_available: false;
  transaction_construction_available: false;
  transaction_submission_available: false;
  runtime_mutation_available: false;
  service_mutation_available: false;
  scheduler_mutation_available: false;
  live_execution_available: false;
}

export interface ExternalOpportunityAgentIntakeCapabilityValidationV1 {
  ok: boolean;
  errors: string[];
  fingerprint_sha256: string;
}

export interface ExternalOpportunityAgentIntakeNegotiationRequestValidationV1 {
  ok: boolean;
  errors: string[];
}

const SHA256_V1 = /^[0-9a-f]{64}$/;
const NEGOTIATION_KEYS_V1 = new Set([
  "schema",
  "capability_id",
  "accepted_versions",
  "requested_mode",
  "planned_request_bytes",
  "accepts_explicit_confirmation",
  "required_request_schema_sha256",
  "required_manifest_fingerprint_sha256",
  "required_statuses",
  "accepted_exit_codes",
  "requires_network_endpoint",
  "requires_network_listener",
  "requires_authentication_secret",
  "requires_provider_polling",
  "requires_paid_work_submission",
  "requires_wc_earning",
  "requires_wallet_or_key_access",
  "requires_transaction_construction",
  "requires_transaction_submission",
  "requires_runtime_mutation",
  "requires_service_mutation",
  "requires_scheduler_mutation",
  "requires_live_execution",
]);

const ALL_STATUSES_V1 = new Set<ExternalOpportunityAgentIntakeStatusV1>([
  "dry_run_ready",
  "dry_run_duplicate",
  "dry_run_held",
  "record_applied",
  "record_duplicate",
  "record_held",
  "record_lock_busy",
  "input_held",
  "usage_held",
  "internal_held",
]);

function isRecordV1(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sortedObjectV1(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortedObjectV1(entry));
  }
  if (!isRecordV1(value)) {
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    result[key] = sortedObjectV1(value[key]);
  }
  return result;
}

export function canonicalJsonV1(value: unknown): string {
  return JSON.stringify(sortedObjectV1(value));
}

function sha256TextV1(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function withoutFingerprintV1(
  manifest: ExternalOpportunityAgentIntakeCapabilityV1,
): Omit<
  ExternalOpportunityAgentIntakeCapabilityV1,
  "manifest_fingerprint_sha256"
> {
  const { manifest_fingerprint_sha256: _ignored, ...remaining } = manifest;
  return remaining;
}

export function computeExternalOpportunityAgentIntakeCapabilityFingerprintV1(
  manifest: ExternalOpportunityAgentIntakeCapabilityV1,
): string {
  return sha256TextV1(canonicalJsonV1(withoutFingerprintV1(manifest)));
}

function manifestBaseV1(): Omit<
  ExternalOpportunityAgentIntakeCapabilityV1,
  "manifest_fingerprint_sha256"
> {
  return {
    schema: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_SCHEMA_V1,
    marker: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_V1,
    version: 1,
    capability_id: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_ID_V1,
    availability: "offline_static_contract",
    transport: {
      invocation:
        "tsx src/external_opportunity/paper_intake_cli_v1.ts --request /absolute/request.json [--pretty]",
      request_delivery: "absolute_local_json_file",
      response_delivery: "machine_readable_json",
      success_channel: "stdout",
      usage_and_input_error_channel: "stderr_when_exit_code_gte_64",
      network_endpoint: false,
      network_listener: false,
      authentication: "none",
    },
    request_contract: {
      schema: "void-external-opportunity-paper-intake-cli-request-v1",
      marker: "VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_V1",
      version: 1,
      schema_path:
        "schemas/external-opportunity-paper-intake-cli-v1.schema.json",
      schema_sha256:
        "1b1646547a406cf89116f007de2977607970131ab5f3b26517d98ec706156eba",
      example_path:
        "fixtures/external-opportunity/paper-intake-cli-v1.example.json",
      example_sha256:
        "5eef684c2afd12ad8e0b54c776bca42f0ca7aebf8bc5be4ed38c8193d7d4f58e",
      max_request_bytes: 131_072,
      allowed_keys: [
        "allow_held_entries",
        "allowed_root",
        "confirmation",
        "marker",
        "max_entries",
        "max_file_bytes",
        "max_line_bytes",
        "mode",
        "observation_path",
        "recorded_at",
        "registry_path",
        "schema",
        "version",
      ],
      path_requirements: {
        request_path: ["absolute", "regular_file", "non_symlink"],
        registry_path: ["absolute", "regular_file", "non_symlink"],
        observation_path: ["absolute", "regular_file", "non_symlink"],
        allowed_root: ["absolute", "existing_directory", "non_symlink"],
        request_registry_observation_distinct: true,
      },
      input_limits: {
        registry_max_bytes: 1_048_576,
        observation_max_bytes: 262_144,
        default_journal_max_file_bytes: 8_388_608,
        default_journal_max_entries: 10_000,
        default_journal_max_line_bytes: 1_048_576,
      },
    },
    modes: [
      {
        mode: "dry_run",
        default: true,
        journal_write: false,
        confirmation_required: false,
        confirmation: "",
        statuses: [
          "dry_run_ready",
          "dry_run_duplicate",
          "dry_run_held",
          "input_held",
          "usage_held",
          "internal_held",
        ],
        exit_codes: [0, 10, 20, 64, 65, 70],
      },
      {
        mode: "record",
        default: false,
        journal_write: true,
        confirmation_required: true,
        confirmation:
          VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_RECORD_CONFIRMATION_V1,
        statuses: [
          "record_applied",
          "record_duplicate",
          "record_held",
          "record_lock_busy",
          "input_held",
          "usage_held",
          "internal_held",
        ],
        exit_codes: [0, 10, 20, 21, 64, 65, 70],
      },
    ],
    pipeline_bindings: [
      {
        stage: "provider_risk_registry",
        path: "src/external_opportunity/provider_risk_registry_v1.ts",
        sha256:
          "66979ada6968a1773d1c816597800768521801ec5ee9b5560802c14ae36f542f",
      },
      {
        stage: "paper_risk_classification",
        path:
          "src/external_opportunity/paper_risk_classification_adapter_v1.ts",
        sha256:
          "8527ddb196d3a4e3c5b68e7f46350e8318801eb46ab8aad881ca9f77531f8f6b",
      },
      {
        stage: "paper_classification_journal",
        path:
          "src/external_opportunity/paper_classification_journal_v1.ts",
        sha256:
          "c0da147200da2a5a35bc1383792d192d501eaf4c2d436f06a668db9280230dfc",
      },
      {
        stage: "paper_classification_journal_file_store",
        path:
          "src/external_opportunity/paper_classification_journal_file_store_v1.ts",
        sha256:
          "aaa7437a95f2e6073f0c624455e54720777386fc954903f72e3143636caa86a9",
      },
      {
        stage: "paper_intake_cli",
        path: "src/external_opportunity/paper_intake_cli_v1.ts",
        sha256:
          "c4cf82c7f4a4d0017ce6ca9456b582c6ef1df9c47f164c0576659168fd873f8d",
      },
    ],
    negotiation: {
      request_schema:
        VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_NEGOTIATION_REQUEST_SCHEMA_V1,
      result_schema:
        VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_NEGOTIATION_RESULT_SCHEMA_V1,
      supported_versions: [1],
      supported_modes: ["dry_run", "record"],
      manifest_fingerprint_algorithm:
        "sha256-canonical-json-without-fingerprint",
    },
    unsupported: {
      network_endpoint: true,
      network_listener: true,
      authentication_secret: true,
      provider_polling: true,
      paid_work_submission: true,
      wc_earning: true,
      wallet_or_key_access: true,
      transaction_construction: true,
      transaction_submission: true,
      runtime_mutation: true,
      service_mutation: true,
      scheduler_mutation: true,
      live_execution: true,
    },
    authority: {
      repository_fixture_read: true,
      repository_schema_read: true,
      local_request_read_when_explicitly_invoked: true,
      local_registry_read_when_explicitly_invoked: true,
      local_observation_read_when_explicitly_invoked: true,
      local_journal_read_when_explicitly_invoked: true,
      local_journal_write_with_exact_confirmation: true,
      implicit_or_scheduled_access: false,
      network_request: false,
      credential_access: false,
      wallet_or_key_access: false,
      transaction_construction: false,
      transaction_submission: false,
      runtime_mutation: false,
      service_mutation: false,
      scheduler_mutation: false,
      paid_work_submission: false,
      wc_earning: false,
      live_execution: false,
    },
  };
}

export function createExternalOpportunityAgentIntakeCapabilityV1():
  ExternalOpportunityAgentIntakeCapabilityV1 {
  const base = manifestBaseV1();
  const candidate = {
    ...base,
    manifest_fingerprint_sha256: "",
  } satisfies ExternalOpportunityAgentIntakeCapabilityV1;

  const manifest = {
    ...base,
    manifest_fingerprint_sha256:
      computeExternalOpportunityAgentIntakeCapabilityFingerprintV1(candidate),
  } satisfies ExternalOpportunityAgentIntakeCapabilityV1;

  return JSON.parse(JSON.stringify(manifest)) as
    ExternalOpportunityAgentIntakeCapabilityV1;
}

export function validateExternalOpportunityAgentIntakeCapabilityV1(
  value: unknown,
): ExternalOpportunityAgentIntakeCapabilityValidationV1 {
  const expected = createExternalOpportunityAgentIntakeCapabilityV1();
  const errors: string[] = [];

  if (!isRecordV1(value)) {
    return {
      ok: false,
      errors: ["manifest_root_not_object"],
      fingerprint_sha256: "",
    };
  }

  const observed = value as unknown as
    ExternalOpportunityAgentIntakeCapabilityV1;
  const observedFingerprint =
    typeof observed.manifest_fingerprint_sha256 === "string"
      ? observed.manifest_fingerprint_sha256
      : "";

  if (!SHA256_V1.test(observedFingerprint)) {
    errors.push("manifest_fingerprint_invalid");
  }

  let computedFingerprint = "";
  try {
    computedFingerprint =
      computeExternalOpportunityAgentIntakeCapabilityFingerprintV1(
        observed,
      );
  } catch {
    errors.push("manifest_fingerprint_compute_failed");
  }

  if (
    computedFingerprint &&
    observedFingerprint !== computedFingerprint
  ) {
    errors.push("manifest_fingerprint_mismatch");
  }

  if (canonicalJsonV1(value) !== canonicalJsonV1(expected)) {
    errors.push("manifest_contract_not_exact");
  }

  return {
    ok: errors.length === 0,
    errors,
    fingerprint_sha256: computedFingerprint,
  };
}

function optionalBooleanV1(
  value: Record<string, unknown>,
  key: string,
  errors: string[],
): void {
  if (key in value && typeof value[key] !== "boolean") {
    errors.push(`${key}_must_be_boolean`);
  }
}

function uniqueIntegerArrayV1(
  value: unknown,
  label: string,
  errors: string[],
): number[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${label}_must_be_nonempty_array`);
    return [];
  }

  const result: number[] = [];
  const seen = new Set<number>();
  for (const entry of value) {
    if (!Number.isSafeInteger(entry) || entry < 0) {
      errors.push(`${label}_entry_invalid`);
      continue;
    }
    if (seen.has(entry)) {
      errors.push(`${label}_duplicate`);
      continue;
    }
    seen.add(entry);
    result.push(entry);
  }
  return result;
}

export function validateExternalOpportunityAgentIntakeNegotiationRequestV1(
  value: unknown,
): ExternalOpportunityAgentIntakeNegotiationRequestValidationV1 {
  const errors: string[] = [];
  if (!isRecordV1(value)) {
    return { ok: false, errors: ["negotiation_root_not_object"] };
  }

  for (const key of Object.keys(value)) {
    if (!NEGOTIATION_KEYS_V1.has(key)) {
      errors.push(`unknown_key:${key}`);
    }
  }

  if (
    value.schema !==
    VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_NEGOTIATION_REQUEST_SCHEMA_V1
  ) {
    errors.push("schema_invalid");
  }
  if (
    value.capability_id !==
    VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_ID_V1
  ) {
    errors.push("capability_id_invalid");
  }

  uniqueIntegerArrayV1(
    value.accepted_versions,
    "accepted_versions",
    errors,
  );

  if (value.requested_mode !== "dry_run" && value.requested_mode !== "record") {
    errors.push("requested_mode_invalid");
  }

  if (
    !Number.isSafeInteger(value.planned_request_bytes) ||
    (value.planned_request_bytes as number) < 1
  ) {
    errors.push("planned_request_bytes_invalid");
  }

  if (typeof value.accepts_explicit_confirmation !== "boolean") {
    errors.push("accepts_explicit_confirmation_must_be_boolean");
  }

  for (const key of [
    "requires_network_endpoint",
    "requires_network_listener",
    "requires_authentication_secret",
    "requires_provider_polling",
    "requires_paid_work_submission",
    "requires_wc_earning",
    "requires_wallet_or_key_access",
    "requires_transaction_construction",
    "requires_transaction_submission",
    "requires_runtime_mutation",
    "requires_service_mutation",
    "requires_scheduler_mutation",
    "requires_live_execution",
  ]) {
    optionalBooleanV1(value, key, errors);
  }

  for (const key of [
    "required_request_schema_sha256",
    "required_manifest_fingerprint_sha256",
  ]) {
    if (
      key in value &&
      (typeof value[key] !== "string" ||
        !SHA256_V1.test(value[key] as string))
    ) {
      errors.push(`${key}_invalid`);
    }
  }

  if ("required_statuses" in value) {
    if (!Array.isArray(value.required_statuses)) {
      errors.push("required_statuses_must_be_array");
    } else {
      const seen = new Set<string>();
      for (const status of value.required_statuses) {
        if (
          typeof status !== "string" ||
          !ALL_STATUSES_V1.has(
            status as ExternalOpportunityAgentIntakeStatusV1,
          )
        ) {
          errors.push("required_status_invalid");
          continue;
        }
        if (seen.has(status)) {
          errors.push("required_status_duplicate");
          continue;
        }
        seen.add(status);
      }
    }
  }

  if ("accepted_exit_codes" in value) {
    uniqueIntegerArrayV1(
      value.accepted_exit_codes,
      "accepted_exit_codes",
      errors,
    );
  }

  return { ok: errors.length === 0, errors };
}

function modeV1(
  manifest: ExternalOpportunityAgentIntakeCapabilityV1,
  requestedMode: ExternalOpportunityAgentIntakeModeV1,
): ExternalOpportunityAgentIntakeCapabilityModeV1 {
  const selected = manifest.modes.find(
    (entry) => entry.mode === requestedMode,
  );
  if (!selected) {
    throw new Error(`mode_missing:${requestedMode}`);
  }
  return selected;
}

function heldResultV1(
  manifest: ExternalOpportunityAgentIntakeCapabilityV1,
  reasons: string[],
  selectedMode: ExternalOpportunityAgentIntakeModeV1 | null,
): ExternalOpportunityAgentIntakeNegotiationResultV1 {
  const mode = selectedMode ? modeV1(manifest, selectedMode) : null;
  return {
    schema:
      VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_NEGOTIATION_RESULT_SCHEMA_V1,
    marker: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_V1,
    version: 1,
    status: "held",
    reasons: [...new Set(reasons)].sort(),
    capability_id: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_ID_V1,
    selected_version: null,
    selected_mode: selectedMode,
    confirmation_required: mode?.confirmation_required ?? false,
    confirmation: mode?.confirmation ?? "",
    request_schema_sha256: manifest.request_contract.schema_sha256,
    manifest_fingerprint_sha256:
      manifest.manifest_fingerprint_sha256,
    supported_statuses: mode ? [...mode.statuses] : [],
    supported_exit_codes: mode ? [...mode.exit_codes] : [],
    network_endpoint_available: false,
    network_listener_available: false,
    authentication_secret_available: false,
    provider_polling_available: false,
    paid_work_submission_available: false,
    wc_earning_available: false,
    wallet_or_key_access_available: false,
    transaction_construction_available: false,
    transaction_submission_available: false,
    runtime_mutation_available: false,
    service_mutation_available: false,
    scheduler_mutation_available: false,
    live_execution_available: false,
  };
}

export function negotiateExternalOpportunityAgentIntakeCapabilityV1(
  manifestValue: unknown,
  requestValue: unknown,
): ExternalOpportunityAgentIntakeNegotiationResultV1 {
  const manifestValidation =
    validateExternalOpportunityAgentIntakeCapabilityV1(manifestValue);
  if (!manifestValidation.ok) {
    const fallback = createExternalOpportunityAgentIntakeCapabilityV1();
    return heldResultV1(
      fallback,
      manifestValidation.errors.map(
        (reason) => `manifest_invalid:${reason}`,
      ),
      null,
    );
  }
  const manifest =
    manifestValue as ExternalOpportunityAgentIntakeCapabilityV1;

  const requestValidation =
    validateExternalOpportunityAgentIntakeNegotiationRequestV1(
      requestValue,
    );
  if (!requestValidation.ok) {
    return heldResultV1(
      manifest,
      requestValidation.errors.map(
        (reason) => `request_invalid:${reason}`,
      ),
      null,
    );
  }

  const request =
    requestValue as ExternalOpportunityAgentIntakeNegotiationRequestV1;
  const selectedMode = request.requested_mode;
  const selected = modeV1(manifest, selectedMode);
  const reasons: string[] = [];

  if (!request.accepted_versions.includes(1)) {
    reasons.push("version_not_accepted");
  }
  if (
    request.planned_request_bytes >
    manifest.request_contract.max_request_bytes
  ) {
    reasons.push("planned_request_exceeds_capability_limit");
  }
  if (
    request.required_request_schema_sha256 &&
    request.required_request_schema_sha256 !==
      manifest.request_contract.schema_sha256
  ) {
    reasons.push("request_schema_hash_mismatch");
  }
  if (
    request.required_manifest_fingerprint_sha256 &&
    request.required_manifest_fingerprint_sha256 !==
      manifest.manifest_fingerprint_sha256
  ) {
    reasons.push("manifest_fingerprint_mismatch");
  }
  if (
    selected.confirmation_required &&
    !request.accepts_explicit_confirmation
  ) {
    reasons.push("explicit_confirmation_not_accepted");
  }

  for (const [key, reason] of [
    ["requires_network_endpoint", "network_endpoint_unavailable"],
    ["requires_network_listener", "network_listener_unavailable"],
    [
      "requires_authentication_secret",
      "authentication_secret_unavailable",
    ],
    ["requires_provider_polling", "provider_polling_unavailable"],
    ["requires_paid_work_submission", "paid_work_submission_unavailable"],
    ["requires_wc_earning", "wc_earning_unavailable"],
    ["requires_wallet_or_key_access", "wallet_or_key_access_unavailable"],
    [
      "requires_transaction_construction",
      "transaction_construction_unavailable",
    ],
    [
      "requires_transaction_submission",
      "transaction_submission_unavailable",
    ],
    ["requires_runtime_mutation", "runtime_mutation_unavailable"],
    ["requires_service_mutation", "service_mutation_unavailable"],
    ["requires_scheduler_mutation", "scheduler_mutation_unavailable"],
    ["requires_live_execution", "live_execution_unavailable"],
  ] as const) {
    if (request[key] === true) {
      reasons.push(reason);
    }
  }

  if (request.required_statuses) {
    for (const status of request.required_statuses) {
      if (!selected.statuses.includes(status)) {
        reasons.push(`status_unavailable:${status}`);
      }
    }
  }

  if (request.accepted_exit_codes) {
    for (const exitCode of selected.exit_codes) {
      if (!request.accepted_exit_codes.includes(exitCode)) {
        reasons.push(`exit_code_not_accepted:${exitCode}`);
      }
    }
  }

  if (reasons.length > 0) {
    return heldResultV1(manifest, reasons, selectedMode);
  }

  return {
    schema:
      VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_NEGOTIATION_RESULT_SCHEMA_V1,
    marker: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_V1,
    version: 1,
    status: "accepted",
    reasons: [],
    capability_id: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_ID_V1,
    selected_version: 1,
    selected_mode: selectedMode,
    confirmation_required: selected.confirmation_required,
    confirmation: selected.confirmation,
    request_schema_sha256: manifest.request_contract.schema_sha256,
    manifest_fingerprint_sha256:
      manifest.manifest_fingerprint_sha256,
    supported_statuses: [...selected.statuses],
    supported_exit_codes: [...selected.exit_codes],
    network_endpoint_available: false,
    network_listener_available: false,
    authentication_secret_available: false,
    provider_polling_available: false,
    paid_work_submission_available: false,
    wc_earning_available: false,
    wallet_or_key_access_available: false,
    transaction_construction_available: false,
    transaction_submission_available: false,
    runtime_mutation_available: false,
    service_mutation_available: false,
    scheduler_mutation_available: false,
    live_execution_available: false,
  };
}
