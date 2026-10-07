import crypto from "node:crypto";

import {
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalCustodyQualificationV1,
} from "./buy_void_allocation_custody_witness_live_read_replay_external_custody_qualification_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_SECOND_CONTROL_COMPOSITION_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_SECOND_CONTROL_COMPOSITION_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_SECOND_CONTROL_COMPOSITION_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    reviewed_live_rollback_policy_receipt_required: true,
    reviewed_live_rollback_policy_receipt_sha256_pinned: true,
    reviewed_live_rollback_policy_receipt_file_sha256_pinned: true,
    reviewed_external_custody_qualification_required: true,
    same_replay_high_water_required: true,
    same_precision_storage_identity_required: true,
    high_water_second_control_policy_required: true,
    post_cycle_policy_observation_required: true,
    rollback_independence_policy_qualified: true,
    live_policy_observation_proven: true,
    policy_file_installation_proven: true,
    external_transport_authenticated: true,
    external_witness_storage_proven: true,
    live_remote_read_performed: true,
    live_remote_append_performed: true,
    external_second_control_domain_qualified: true,
    external_second_control_policy_binding_proven: true,
    post_cycle_live_policy_observation_bound: true,
    live_policy_enforcement_proven: false,
    live_rollback_test_performed: false,
    live_durable_storage_proven: false,
    rollback_resistance_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    runtime_integration: false,
    production_gate_ready: false,
    payment_acceptance: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    presale_activation: false,
    market_activation: false,
    funds_movement: false,
  });

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_ROLLBACK_POLICY_RECEIPT_SHA256_V1 =
  "sha256:e59a2a9024025fe0ffea453008e373ea12642801dadef88d1b1156cbe5d1c8af";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_ROLLBACK_POLICY_RECEIPT_FILE_SHA256_V1 =
  "sha256:e78f48a901a2cf197f9c1538884a0c97ab96267c093d31b0f9aa50623ad8e114";

const REVIEWED_POLICY_FILE_SHA256 =
  "sha256:01cd65ffbe549f3e6c03591d649c79edcc83934c31bccef8349621222d2fb05a";
const REVIEWED_INSTALLATION_QUALIFICATION_ID =
  "voidwlrie1_8c96c8cfb5a86e52731d69d1a99a7ffe7297caa8f4214d9df98a534499aa8cfd";
const REVIEWED_POLICY_QUALIFICATION_ID =
  "voidwlrrq1_7b2d377dfc38cf00e329abcffec2801420d84a1f2bf1e15fbcac47df9e103f71";
const REVIEWED_POLICY_FINGERPRINT_SHA256 =
  "sha256:0a0d5392a0e9cdae22257cdf644c0958c3cfe18fdd0466c0f92b8044a6ebcdeb";
const REVIEWED_REPLAY_HIGH_WATER_SHA256 =
  "sha256:2ce3c4fca02a5567a41d0466d47721a4756253979e18521550ab83b8e99279b9";
const REVIEWED_POLICY_OBSERVED_AT_MS = 1791393507504;
const REVIEWED_POLICY_EXPIRES_AT_MS = 1791393627504;
const REVIEWED_POLICY_GENERATION = "1";
const REVIEWED_HOST_ID = "zoso-Precision-Tower-7810";
const QUALIFICATION_DOMAIN =
  "void:mainnet-0:buy-void-witness-live-read-replay-rollback-second-control-composition-v1";

const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const INSTALLATION_ID = /^voidwlrie1_[0-9a-f]{64}$/u;
const POLICY_ID = /^voidwlrrq1_[0-9a-f]{64}$/u;

function fail(code: string): never {
  throw new Error(code);
}

function held(reason: string) {
  return Object.freeze({
    ok: false as const,
    status: "held" as const,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_SECOND_CONTROL_COMPOSITION_V1,
    version: 1 as const,
    reason,
    operation_performed: false as const,
    rollback_independence_policy_qualified: false as const,
    live_policy_observation_proven: false as const,
    policy_file_installation_proven: false as const,
    external_transport_authenticated: false as const,
    external_witness_storage_proven: false as const,
    live_remote_read_performed: false as const,
    live_remote_append_performed: false as const,
    external_second_control_domain_qualified: false as const,
    external_second_control_policy_binding_proven: false as const,
    post_cycle_live_policy_observation_bound: false as const,
    live_policy_enforcement_proven: false as const,
    live_rollback_test_performed: false as const,
    rollback_resistance_proven: false as const,
    protected_high_water_custody_proven: false as const,
    independent_custody_proven: false as const,
    production_gate_ready: false as const,
    funds_movement: false as const,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_SECOND_CONTROL_COMPOSITION_AUTHORITY_V1,
  });
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) + ":" + canonicalJson(record[key]),
        )
        .join(",") +
      "}"
    );
  }
  fail("witness_replay_rollback_second_control_noncanonical_value");
}

function sha256Id(value: string | Buffer): string {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
}

function asBytes(input: string | Buffer, code: string): Buffer {
  if (Buffer.isBuffer(input)) return Buffer.from(input);
  if (typeof input === "string") return Buffer.from(input, "utf8");
  fail(code);
}

function record(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(code);
  }
  return value as Record<string, unknown>;
}

function sha(value: unknown, code: string): string {
  if (typeof value !== "string" || !SHA256_ID.test(value)) {
    fail(code);
  }
  return value;
}

function integer(
  value: unknown,
  min: number,
  max: number,
  code: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  ) {
    fail(code);
  }
  return value;
}

function stringField(value: unknown, code: string): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 512 ||
    value !== value.trim()
  ) {
    fail(code);
  }
  return value;
}

function parseReviewedPolicyReceipt(input: string | Buffer) {
  const bytes = asBytes(
    input,
    "witness_replay_rollback_second_control_policy_receipt_type_invalid",
  );
  if (
    sha256Id(bytes) !==
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_ROLLBACK_POLICY_RECEIPT_FILE_SHA256_V1
  ) {
    fail(
      "witness_replay_rollback_second_control_policy_receipt_file_not_reviewed",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
  } catch {
    fail(
      "witness_replay_rollback_second_control_policy_receipt_json_invalid",
    );
  }
  const receipt = record(
    parsed,
    "witness_replay_rollback_second_control_policy_receipt_invalid",
  );
  const normalized = record(
    receipt.normalized,
    "witness_replay_rollback_second_control_policy_normalized_invalid",
  );
  const parent = record(
    receipt.parent_qualification,
    "witness_replay_rollback_second_control_policy_parent_invalid",
  );
  const policy = record(
    parent.normalized_policy,
    "witness_replay_rollback_second_control_policy_control_invalid",
  );
  const journal = record(
    policy.journal,
    "witness_replay_rollback_second_control_policy_journal_invalid",
  );
  const highWater = record(
    policy.high_water,
    "witness_replay_rollback_second_control_policy_high_water_invalid",
  );

  if (
    receipt.ok !== true ||
    receipt.status !== "LIVE_ROLLBACK_POLICY_OBSERVED" ||
    receipt.marker !==
      "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V1" ||
    receipt.version !== 1 ||
    receipt.operation_performed !== false ||
    receipt.root_owned_policy_file_observed !== true ||
    receipt.rollback_independence_policy_qualified !== true ||
    receipt.installation_storage_rebound !== true ||
    receipt.bounded_policy_freshness_checked !== true ||
    receipt.policy_file_installation_proven !== true ||
    receipt.live_policy_observation_proven !== true ||
    receipt.live_policy_enforcement_proven !== false ||
    receipt.live_rollback_test_performed !== false ||
    receipt.rollback_resistance_proven !== false ||
    receipt.protected_high_water_custody_proven !== false ||
    receipt.independent_custody_proven !== false ||
    receipt.production_gate_ready !== false ||
    receipt.funds_movement !== false
  ) {
    fail(
      "witness_replay_rollback_second_control_policy_receipt_boundary_invalid",
    );
  }

  if (
    sha(
      receipt.receipt_sha256,
      "witness_replay_rollback_second_control_policy_receipt_sha_invalid",
    ) !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_ROLLBACK_POLICY_RECEIPT_SHA256_V1
  ) {
    fail(
      "witness_replay_rollback_second_control_policy_receipt_not_reviewed",
    );
  }

  const installationQualificationId = stringField(
    normalized.installation_qualification_id,
    "witness_replay_rollback_second_control_policy_installation_id_invalid",
  );
  const parentPolicyQualificationId = stringField(
    normalized.parent_policy_qualification_id,
    "witness_replay_rollback_second_control_policy_parent_id_invalid",
  );
  if (
    !INSTALLATION_ID.test(installationQualificationId) ||
    !POLICY_ID.test(parentPolicyQualificationId) ||
    installationQualificationId !== REVIEWED_INSTALLATION_QUALIFICATION_ID ||
    parentPolicyQualificationId !== REVIEWED_POLICY_QUALIFICATION_ID ||
    normalized.installation_high_water_sha256 !==
      REVIEWED_REPLAY_HIGH_WATER_SHA256 ||
    normalized.policy_file_sha256 !== REVIEWED_POLICY_FILE_SHA256 ||
    normalized.policy_fingerprint_sha256 !==
      REVIEWED_POLICY_FINGERPRINT_SHA256 ||
    normalized.policy_generation !== REVIEWED_POLICY_GENERATION ||
    normalized.host_id !== REVIEWED_HOST_ID ||
    normalized.verification_now_ms !== REVIEWED_POLICY_OBSERVED_AT_MS
  ) {
    fail(
      "witness_replay_rollback_second_control_policy_normalized_mismatch",
    );
  }

  if (
    parent.ok !== true ||
    parent.status !== "source_policy_qualified" ||
    parent.qualification_id !== parentPolicyQualificationId ||
    parent.installation_qualification_id !== installationQualificationId ||
    parent.installation_high_water_sha256 !==
      REVIEWED_REPLAY_HIGH_WATER_SHA256 ||
    parent.host_id !== REVIEWED_HOST_ID ||
    parent.verification_now_ms !== REVIEWED_POLICY_OBSERVED_AT_MS ||
    parent.policy_observed_at_ms !== REVIEWED_POLICY_OBSERVED_AT_MS ||
    parent.policy_expires_at_ms !== REVIEWED_POLICY_EXPIRES_AT_MS ||
    parent.policy_generation !== REVIEWED_POLICY_GENERATION ||
    parent.policy_fingerprint_sha256 !==
      REVIEWED_POLICY_FINGERPRINT_SHA256 ||
    parent.rollback_independence_policy_qualified !== true ||
    parent.installation_storage_rebound !== true ||
    parent.bounded_policy_freshness_checked !== true
  ) {
    fail(
      "witness_replay_rollback_second_control_policy_parent_mismatch",
    );
  }

  if (
    policy.host_id !== REVIEWED_HOST_ID ||
    policy.observed_at_ms !== REVIEWED_POLICY_OBSERVED_AT_MS ||
    policy.expires_at_ms !== REVIEWED_POLICY_EXPIRES_AT_MS ||
    policy.policy_generation !== REVIEWED_POLICY_GENERATION ||
    journal.role !== "journal" ||
    highWater.role !== "high_water" ||
    journal.disk_wwn !== "0x500a0751e9c796d8" ||
    highWater.disk_wwn !== "eui.e8238fa6bf530001001b448b42e66c36" ||
    journal.automatic_restore_allowed !== false ||
    highWater.automatic_restore_allowed !== false ||
    journal.restore_requires_manual_approval !== true ||
    highWater.restore_requires_manual_approval !== true ||
    journal.restore_requires_separate_credential !== true ||
    highWater.restore_requires_separate_credential !== true ||
    journal.restore_second_control_required !== false ||
    highWater.restore_second_control_required !== true ||
    policy.hostwide_snapshot_can_revert_both !== false ||
    policy.hostwide_backup_can_revert_both !== false ||
    policy.hostwide_restore_can_revert_both !== false ||
    policy.shared_rollback_controller !== false ||
    policy.coordinated_rollback_without_second_control !== false
  ) {
    fail(
      "witness_replay_rollback_second_control_policy_control_mismatch",
    );
  }

  for (const field of [
    "restore_domain_id",
    "rollback_controller_id",
    "restore_credential_domain_id",
  ] as const) {
    if (
      stringField(
        journal[field],
        "witness_replay_rollback_second_control_policy_domain_invalid",
      ) ===
      stringField(
        highWater[field],
        "witness_replay_rollback_second_control_policy_domain_invalid",
      )
    ) {
      fail(
        "witness_replay_rollback_second_control_policy_domain_not_independent",
      );
    }
  }

  return Object.freeze({
    receipt,
    normalized,
    parent,
    policy,
    journal,
    high_water: highWater,
  });
}

function finalTerminalAtMs(journalJsonl: string | Buffer): number {
  const bytes = asBytes(
    journalJsonl,
    "witness_replay_rollback_second_control_journal_invalid",
  );
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("witness_replay_rollback_second_control_journal_utf8_invalid");
  }
  if (!text.endsWith("\n")) {
    fail(
      "witness_replay_rollback_second_control_journal_serialization_invalid",
    );
  }
  const lines = text.slice(0, -1).split("\n");
  if (lines.length !== 2) {
    fail(
      "witness_replay_rollback_second_control_journal_event_count_invalid",
    );
  }
  let terminal: Record<string, unknown>;
  try {
    terminal = record(
      JSON.parse(lines[1]),
      "witness_replay_rollback_second_control_terminal_event_invalid",
    );
  } catch {
    fail(
      "witness_replay_rollback_second_control_terminal_event_invalid",
    );
  }
  if (terminal.state !== "consumed") {
    fail(
      "witness_replay_rollback_second_control_terminal_event_invalid",
    );
  }
  return integer(
    terminal.terminal_at_ms,
    1,
    Number.MAX_SAFE_INTEGER,
    "witness_replay_rollback_second_control_terminal_time_invalid",
  );
}

function qualifyOrThrow(input: {
  operator_receipt_json: string | Buffer;
  current_journal_jsonl: string | Buffer;
  current_high_water_json: string | Buffer;
  external_witness_jsonl: string | Buffer;
  rollback_policy_receipt_json: string | Buffer;
}) {
  const external =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalCustodyQualificationV1(
      {
        operator_receipt_json: input.operator_receipt_json,
        current_journal_jsonl: input.current_journal_jsonl,
        current_high_water_json: input.current_high_water_json,
        external_witness_jsonl: input.external_witness_jsonl,
      },
    );
  if (
    external.ok !== true ||
    external.status !== "reviewed_live_external_custody_qualified" ||
    external.reviewed_live_evidence_origin_proven !== true ||
    external.external_transport_authenticated !== true ||
    external.external_witness_storage_proven !== true ||
    external.live_remote_read_performed !== true ||
    external.live_remote_append_performed !== true ||
    external.external_second_control_domain_qualified !== true
  ) {
    fail(
      "witness_replay_rollback_second_control_external_custody_invalid",
    );
  }

  const policy = parseReviewedPolicyReceipt(
    input.rollback_policy_receipt_json,
  );

  if (
    policy.normalized.installation_high_water_sha256 !==
      external.normalized.replay_high_water_sha256 ||
    policy.normalized.host_id !== external.normalized.source_hostname ||
    policy.journal.disk_wwn !==
      external.normalized.source_journal_disk_wwn ||
    policy.high_water.disk_wwn !==
      external.normalized.source_high_water_disk_wwn
  ) {
    fail(
      "witness_replay_rollback_second_control_cross_artifact_binding_invalid",
    );
  }

  const terminalAtMs = finalTerminalAtMs(input.current_journal_jsonl);
  if (
    terminalAtMs >= REVIEWED_POLICY_OBSERVED_AT_MS ||
    REVIEWED_POLICY_OBSERVED_AT_MS >= REVIEWED_POLICY_EXPIRES_AT_MS
  ) {
    fail(
      "witness_replay_rollback_second_control_post_cycle_policy_time_invalid",
    );
  }

  const normalized = Object.freeze({
    schema:
      "void_buy_void_allocation_custody_witness_live_read_replay_rollback_second_control_composition_v1",
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_SECOND_CONTROL_COMPOSITION_V1,
    version: 1,
    external_custody_qualification_id: external.qualification_id,
    reviewed_operator_receipt_sha256:
      external.normalized.reviewed_operator_receipt_sha256,
    rollback_policy_receipt_sha256:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_ROLLBACK_POLICY_RECEIPT_SHA256_V1,
    rollback_policy_receipt_file_sha256:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_ROLLBACK_POLICY_RECEIPT_FILE_SHA256_V1,
    rollback_policy_qualification_id:
      policy.normalized.parent_policy_qualification_id,
    rollback_policy_fingerprint_sha256:
      policy.normalized.policy_fingerprint_sha256,
    rollback_policy_generation:
      policy.normalized.policy_generation,
    rollback_policy_observed_at_ms:
      policy.parent.policy_observed_at_ms,
    rollback_policy_expires_at_ms:
      policy.parent.policy_expires_at_ms,
    replay_high_water_sha256:
      external.normalized.replay_high_water_sha256,
    replay_sequence: external.normalized.replay_sequence,
    replay_event_count: external.normalized.replay_event_count,
    external_witness_sha256:
      external.normalized.external_witness_sha256,
    external_witness_event_count:
      external.normalized.external_witness_event_count,
    external_witnessed_replay_sequence:
      external.normalized.external_witnessed_replay_sequence,
    source_hostname: external.normalized.source_hostname,
    source_journal_disk_wwn:
      external.normalized.source_journal_disk_wwn,
    source_high_water_disk_wwn:
      external.normalized.source_high_water_disk_wwn,
    witness_hostname: external.normalized.witness_hostname,
    witness_machine_id_sha256:
      external.normalized.witness_machine_id_sha256,
    witness_root_disk_wwn:
      external.normalized.witness_root_disk_wwn,
    terminal_at_ms: terminalAtMs,
  });

  const qualificationId =
    "voidwlrrsc1_" +
    crypto
      .createHash("sha256")
      .update(
        canonicalJson({
          domain: QUALIFICATION_DOMAIN,
          normalized,
        }),
        "utf8",
      )
      .digest("hex");

  return Object.freeze({
    ok: true as const,
    status: "rollback_second_control_composed" as const,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_SECOND_CONTROL_COMPOSITION_V1,
    version: 1 as const,
    qualification_id: qualificationId,
    normalized,
    operation_performed: false as const,
    reviewed_live_rollback_policy_receipt_bound: true as const,
    reviewed_external_custody_qualification_bound: true as const,
    same_replay_high_water_bound: true as const,
    same_precision_storage_identity_bound: true as const,
    rollback_independence_policy_qualified: true as const,
    live_policy_observation_proven: true as const,
    policy_file_installation_proven: true as const,
    external_transport_authenticated: true as const,
    external_witness_storage_proven: true as const,
    live_remote_read_performed: true as const,
    live_remote_append_performed: true as const,
    external_second_control_domain_qualified: true as const,
    external_second_control_policy_binding_proven: true as const,
    post_cycle_live_policy_observation_bound: true as const,
    live_policy_enforcement_proven: false as const,
    live_rollback_test_performed: false as const,
    live_durable_storage_proven: false as const,
    rollback_resistance_proven: false as const,
    protected_high_water_custody_proven: false as const,
    independent_custody_proven: false as const,
    runtime_integration: false as const,
    production_gate_ready: false as const,
    funds_movement: false as const,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_SECOND_CONTROL_COMPOSITION_AUTHORITY_V1,
  });
}

export function classifyBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackSecondControlCompositionV1(
  input: {
    operator_receipt_json: string | Buffer;
    current_journal_jsonl: string | Buffer;
    current_high_water_json: string | Buffer;
    external_witness_jsonl: string | Buffer;
    rollback_policy_receipt_json: string | Buffer;
  },
) {
  try {
    return qualifyOrThrow(input);
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "witness_replay_rollback_second_control_composition_failed",
    );
  }
}
