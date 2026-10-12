import crypto from "node:crypto";

import {
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1,
} from "./buy_void_allocation_custody_witness_live_read_replay_external_witness_v1.js";
import {
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1,
} from "./buy_void_allocation_custody_witness_live_read_replay_high_water_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_CUSTODY_QUALIFICATION_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_CUSTODY_QUALIFICATION_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_CUSTODY_QUALIFICATION_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    reviewed_operator_receipt_required: true,
    reviewed_operator_receipt_sha256_pinned: true,
    reviewed_operator_receipt_file_sha256_pinned: true,
    canonical_current_replay_binding_required: true,
    canonical_external_witness_history_required: true,
    fixed_reviewed_source_identity: true,
    fixed_reviewed_witness_identity: true,
    exact_live_cycle_terminal_packet_binding_required: true,
    exact_external_witness_tip_binding_required: true,
    reviewed_live_evidence_origin_proven: true,
    external_transport_authenticated: true,
    external_witness_storage_proven: true,
    live_remote_read_performed: true,
    live_remote_append_performed: true,
    external_second_control_domain_qualified: true,
    live_durable_storage_proven: false,
    rollback_resistance_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    trusted_verification_clock_proven: false,
    challenge_entropy_proven: false,
    challenge_unpredictability_proven: false,
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

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_OPERATOR_RECEIPT_SHA256_V1 =
  "sha256:facaeecb75f66cf9b9fdf71eca977b7163be439fdc0913095d48bdb9eaa24a08";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_OPERATOR_RECEIPT_FILE_SHA256_V1 =
  "sha256:1f9bcb62174716aa732f530df025f468e8ce61d55d532c2f6197d6f9c9db05b9";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_SOURCE_COMMIT_V1 =
  "f4c0905b3888bd1db72af455e980a6df22380fac";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_EXTERNAL_IDENTITY_V1 =
  Object.freeze({
    source_hostname: "zoso-Precision-Tower-7810",
    source_journal_root:
      "/var/lib/void-allocation-ledger-v1/witness-live-read-replay-v1",
    source_high_water_root:
      "/var/lib/void-allocation-custody-v1/witness-live-read-replay-v1",
    source_journal_disk_wwn: "0x500a0751e9c796d8",
    source_high_water_disk_wwn:
      "eui.e8238fa6bf530001001b448b42e66c36",
    witness_hostname: "Nimo",
    witness_machine_id_sha256:
      "sha256:48a3554126d621d6460385ebacf3d41b454157337271cb7405af012158f203d4",
    witness_root_disk_serial: "50026B76873B25AB",
    witness_root_disk_wwn:
      "eui.00000000000000000026b76873b25ab5",
  });

const RECEIPT_SCHEMA = "void_replay_live_cycle_operator_receipt_v1";
const RECEIPT_MARKER = "VOID_REPLAY_LIVE_CYCLE_V1";
const QUALIFICATION_DOMAIN =
  "void:mainnet-0:buy-void-witness-live-read-replay-external-custody-qualification-v1";

const REVIEWED_GENERIC_WITNESS_SHA256 =
  "sha256:a73c8c674bea5ed473938ddbf4275a651272fefd4e75d212d3d2bb8c8e5cbe1a";
const REVIEWED_GENERIC_WITNESS_TIP_EVENT_SHA256 =
  "sha256:2092c92ac3117ae4ec1cd4d55627ff9e46e3bd4e3b20d1bbd848e1189d5d4654";
const REVIEWED_GENERIC_WITNESS_EVENT_COUNT = 1;

const REVIEWED_FINAL_JOURNAL_SHA256 =
  "sha256:d95fd6a5cec55513a4b6271ee5ad87a97d723f77bbd67ffaacd194fc36780989";
const REVIEWED_FINAL_HIGH_WATER_SHA256 =
  "sha256:2ce3c4fca02a5567a41d0466d47721a4756253979e18521550ab83b8e99279b9";
const REVIEWED_FINAL_EXTERNAL_WITNESS_SHA256 =
  "sha256:b1d6cb7d55fb97b48a388b19e230ed272a654f7b924ed786c050d8028c9f761e";
const REVIEWED_FINAL_EXTERNAL_TIP_EVENT_SHA256 =
  "sha256:e72160233cf64b43d9d95ee0e208acf5a49cf8fe0da67ce01aa8cdd05b9680ea";

const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const REQUEST_ID = /^voidwreq1_[0-9a-f]{64}$/u;
const CHALLENGE_ID = /^voidwlrc1_[0-9a-f]{64}$/u;

const RECEIPT_KEYS = Object.freeze([
  "consume",
  "external_replay_witness",
  "funds_moved",
  "independent_custody_proven",
  "issue",
  "live_read",
  "marker",
  "observed_authenticated_generic_ssh_read",
  "observed_replay_external_sequential_custody",
  "production_gate_ready",
  "protected_high_water_custody_proven",
  "receipt_sha256",
  "rollback_resistance_proven",
  "schema",
  "source_commit",
  "transaction",
  "version",
  "wallet_or_signer",
]);

const ISSUE_KEYS = Object.freeze([
  "challenge_id",
  "challenge_sha256",
  "event_count",
  "expires_at_ms",
  "generation",
  "high_water_sha256",
  "issued_at_ms",
  "journal_sha256",
  "sequence",
]);

const LIVE_READ_KEYS = Object.freeze([
  "event_count",
  "observed_at_ms",
  "request_id",
  "response_sha256",
  "started_at_ms",
  "tip_event_sha256",
  "witness_sha256",
]);

const CONSUME_KEYS = Object.freeze([
  "event_count",
  "generation",
  "high_water_sha256",
  "journal_sha256",
  "sequence",
  "terminal_request_id",
  "terminal_response_sha256",
]);

const EXTERNAL_KEYS = Object.freeze([
  "event_count",
  "tip_event_sha256",
  "witness_sha256",
  "witnessed_replay_sequence",
]);

function fail(code: string): never {
  throw new Error(code);
}

function held(reason: string) {
  return Object.freeze({
    ok: false as const,
    status: "held" as const,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_CUSTODY_QUALIFICATION_V1,
    version: 1 as const,
    reason,
    operation_performed: false as const,
    external_transport_authenticated: false as const,
    external_witness_storage_proven: false as const,
    live_remote_read_performed: false as const,
    live_remote_append_performed: false as const,
    external_second_control_domain_qualified: false as const,
    rollback_resistance_proven: false as const,
    protected_high_water_custody_proven: false as const,
    independent_custody_proven: false as const,
    production_gate_ready: false as const,
    funds_movement: false as const,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_CUSTODY_QUALIFICATION_AUTHORITY_V1,
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
  fail("witness_replay_external_custody_noncanonical_value");
}

function sha256Id(value: string | Buffer): string {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
}

function bytes(input: string | Buffer, code: string): Buffer {
  if (Buffer.isBuffer(input)) return Buffer.from(input);
  if (typeof input === "string") return Buffer.from(input, "utf8");
  fail(code);
}

function exactObject(
  value: unknown,
  keys: readonly string[],
  code: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(code);
  }
  const record = value as Record<string, unknown>;
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  return record;
}

function safeInt(
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

function shaField(value: unknown, code: string): string {
  if (typeof value !== "string" || !SHA256_ID.test(value)) {
    fail(code);
  }
  return value;
}

function requestField(value: unknown, code: string): string {
  if (typeof value !== "string" || !REQUEST_ID.test(value)) {
    fail(code);
  }
  return value;
}

function challengeField(value: unknown, code: string): string {
  if (typeof value !== "string" || !CHALLENGE_ID.test(value)) {
    fail(code);
  }
  return value;
}

function parseReviewedReceipt(input: string | Buffer) {
  const rawBytes = bytes(
    input,
    "witness_replay_external_custody_receipt_type_invalid",
  );
  if (rawBytes.length < 2 || rawBytes.length > 64 * 1024) {
    fail("witness_replay_external_custody_receipt_size_invalid");
  }
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(rawBytes);
  } catch {
    fail("witness_replay_external_custody_receipt_utf8_invalid");
  }
  if (!text.endsWith("\n") || text.slice(0, -1).includes("\n")) {
    fail("witness_replay_external_custody_receipt_serialization_invalid");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(0, -1));
  } catch {
    fail("witness_replay_external_custody_receipt_json_invalid");
  }

  const receipt = exactObject(
    parsed,
    RECEIPT_KEYS,
    "witness_replay_external_custody_receipt_shape_invalid",
  );
  if (
    canonicalJson(receipt) + "\n" !== text ||
    receipt.schema !== RECEIPT_SCHEMA ||
    receipt.marker !== RECEIPT_MARKER ||
    receipt.version !== 1
  ) {
    fail("witness_replay_external_custody_receipt_identity_invalid");
  }

  const issue = exactObject(
    receipt.issue,
    ISSUE_KEYS,
    "witness_replay_external_custody_issue_invalid",
  );
  const liveRead = exactObject(
    receipt.live_read,
    LIVE_READ_KEYS,
    "witness_replay_external_custody_live_read_invalid",
  );
  const consume = exactObject(
    receipt.consume,
    CONSUME_KEYS,
    "witness_replay_external_custody_consume_invalid",
  );
  const external = exactObject(
    receipt.external_replay_witness,
    EXTERNAL_KEYS,
    "witness_replay_external_custody_external_invalid",
  );

  const issueGeneration = safeInt(
    issue.generation,
    1,
    Number.MAX_SAFE_INTEGER,
    "witness_replay_external_custody_issue_invalid",
  );
  const issueSequence = safeInt(
    issue.sequence,
    1,
    Number.MAX_SAFE_INTEGER,
    "witness_replay_external_custody_issue_invalid",
  );
  const issueEventCount = safeInt(
    issue.event_count,
    1,
    Number.MAX_SAFE_INTEGER,
    "witness_replay_external_custody_issue_invalid",
  );
  const issuedAt = safeInt(
    issue.issued_at_ms,
    1,
    Number.MAX_SAFE_INTEGER - 1,
    "witness_replay_external_custody_issue_invalid",
  );
  const expiresAt = safeInt(
    issue.expires_at_ms,
    issuedAt + 1,
    Number.MAX_SAFE_INTEGER,
    "witness_replay_external_custody_issue_invalid",
  );
  if (expiresAt - issuedAt > 38_000) {
    fail("witness_replay_external_custody_issue_ttl_invalid");
  }

  const challengeSha = shaField(
    issue.challenge_sha256,
    "witness_replay_external_custody_issue_invalid",
  );
  const challengeId = challengeField(
    issue.challenge_id,
    "witness_replay_external_custody_issue_invalid",
  );
  if (
    challengeId.slice("voidwlrc1_".length) !==
    challengeSha.slice("sha256:".length)
  ) {
    fail("witness_replay_external_custody_issue_challenge_invalid");
  }

  const startedAt = safeInt(
    liveRead.started_at_ms,
    issuedAt,
    expiresAt,
    "witness_replay_external_custody_live_read_time_invalid",
  );
  safeInt(
    liveRead.observed_at_ms,
    startedAt,
    expiresAt,
    "witness_replay_external_custody_live_read_time_invalid",
  );
  const liveRequestId = requestField(
    liveRead.request_id,
    "witness_replay_external_custody_live_read_invalid",
  );
  const liveResponseSha = shaField(
    liveRead.response_sha256,
    "witness_replay_external_custody_live_read_invalid",
  );

  const consumeGeneration = safeInt(
    consume.generation,
    1,
    Number.MAX_SAFE_INTEGER,
    "witness_replay_external_custody_consume_invalid",
  );
  const consumeSequence = safeInt(
    consume.sequence,
    1,
    Number.MAX_SAFE_INTEGER,
    "witness_replay_external_custody_consume_invalid",
  );
  const consumeEventCount = safeInt(
    consume.event_count,
    1,
    Number.MAX_SAFE_INTEGER,
    "witness_replay_external_custody_consume_invalid",
  );
  const terminalRequestId = requestField(
    consume.terminal_request_id,
    "witness_replay_external_custody_consume_invalid",
  );
  const terminalResponseSha = shaField(
    consume.terminal_response_sha256,
    "witness_replay_external_custody_consume_invalid",
  );

  const externalEventCount = safeInt(
    external.event_count,
    1,
    Number.MAX_SAFE_INTEGER,
    "witness_replay_external_custody_external_invalid",
  );
  const witnessedReplaySequence = safeInt(
    external.witnessed_replay_sequence,
    0,
    Number.MAX_SAFE_INTEGER,
    "witness_replay_external_custody_external_invalid",
  );

  if (
    issueGeneration !== 1 ||
    issueSequence !== 1 ||
    issueEventCount !== 1 ||
    consumeGeneration !== issueGeneration ||
    consumeSequence !== issueSequence + 1 ||
    consumeEventCount !== issueEventCount + 1 ||
    liveRequestId !== terminalRequestId ||
    liveResponseSha !== terminalResponseSha ||
    externalEventCount !== consumeEventCount + 1 ||
    witnessedReplaySequence !== consumeSequence
  ) {
    fail("witness_replay_external_custody_cycle_lineage_invalid");
  }

  if (
    liveRead.event_count !== REVIEWED_GENERIC_WITNESS_EVENT_COUNT ||
    liveRead.witness_sha256 !== REVIEWED_GENERIC_WITNESS_SHA256 ||
    liveRead.tip_event_sha256 !==
      REVIEWED_GENERIC_WITNESS_TIP_EVENT_SHA256
  ) {
    fail("witness_replay_external_custody_generic_witness_invalid");
  }

  for (const field of [
    issue.journal_sha256,
    issue.high_water_sha256,
    consume.journal_sha256,
    consume.high_water_sha256,
    external.witness_sha256,
    external.tip_event_sha256,
  ]) {
    shaField(
      field,
      "witness_replay_external_custody_receipt_digest_invalid",
    );
  }

  if (
    receipt.source_commit !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_SOURCE_COMMIT_V1 ||
    receipt.observed_authenticated_generic_ssh_read !== true ||
    receipt.observed_replay_external_sequential_custody !== true ||
    receipt.rollback_resistance_proven !== false ||
    receipt.protected_high_water_custody_proven !== false ||
    receipt.independent_custody_proven !== false ||
    receipt.production_gate_ready !== false ||
    receipt.wallet_or_signer !== false ||
    receipt.transaction !== false ||
    receipt.funds_moved !== false
  ) {
    fail("witness_replay_external_custody_receipt_boundary_invalid");
  }

  const receiptSha = shaField(
    receipt.receipt_sha256,
    "witness_replay_external_custody_receipt_sha_invalid",
  );
  const body = { ...receipt };
  delete body.receipt_sha256;
  if (receiptSha !== sha256Id(Buffer.from(canonicalJson(body), "utf8"))) {
    fail("witness_replay_external_custody_receipt_self_hash_invalid");
  }
  if (
    receiptSha !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_OPERATOR_RECEIPT_SHA256_V1 ||
    sha256Id(rawBytes) !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_OPERATOR_RECEIPT_FILE_SHA256_V1
  ) {
    fail("witness_replay_external_custody_receipt_not_reviewed");
  }

  return Object.freeze({
    receipt,
    issue,
    liveRead,
    consume,
    external,
    receipt_sha256: receiptSha,
    receipt_file_sha256: sha256Id(rawBytes),
  });
}

function parseFinalJournalEvents(input: string | Buffer) {
  const journal = bytes(
    input,
    "witness_replay_external_custody_journal_type_invalid",
  );
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(journal);
  } catch {
    fail("witness_replay_external_custody_journal_utf8_invalid");
  }
  if (!text.endsWith("\n")) {
    fail("witness_replay_external_custody_journal_serialization_invalid");
  }
  const lines = text.slice(0, -1).split("\n");
  if (lines.length !== 2) {
    fail("witness_replay_external_custody_reviewed_event_count_invalid");
  }
  try {
    return Object.freeze({
      issue: JSON.parse(lines[0]) as Record<string, unknown>,
      consume: JSON.parse(lines[1]) as Record<string, unknown>,
    });
  } catch {
    fail("witness_replay_external_custody_journal_json_invalid");
  }
}

function qualifyOrThrow(input: {
  operator_receipt_json: string | Buffer;
  current_journal_jsonl: string | Buffer;
  current_high_water_json: string | Buffer;
  external_witness_jsonl: string | Buffer;
}) {
  const reviewed = parseReviewedReceipt(input.operator_receipt_json);

  const current =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1({
      journal_jsonl: input.current_journal_jsonl,
      high_water_json: input.current_high_water_json,
    });
  if (current.ok !== true) {
    fail(
      "witness_replay_external_custody_current_" +
        String(current.reason || "invalid"),
    );
  }

  if (
    current.high_water.generation !== reviewed.consume.generation ||
    current.high_water.sequence !== reviewed.consume.sequence ||
    current.high_water.event_count !== reviewed.consume.event_count ||
    current.high_water.pending !== false ||
    current.high_water.ready_for_issue !== true ||
    current.high_water.last_terminal_state !== "consumed" ||
    current.high_water.journal_sha256 !==
      reviewed.consume.journal_sha256 ||
    current.high_water_sha256 !== reviewed.consume.high_water_sha256 ||
    current.high_water.journal_sha256 !== REVIEWED_FINAL_JOURNAL_SHA256 ||
    current.high_water_sha256 !== REVIEWED_FINAL_HIGH_WATER_SHA256
  ) {
    fail("witness_replay_external_custody_current_state_mismatch");
  }

  const events = parseFinalJournalEvents(input.current_journal_jsonl);
  if (
    events.issue.state !== "issued" ||
    events.issue.generation !== reviewed.issue.generation ||
    events.issue.sequence !== reviewed.issue.sequence ||
    events.issue.challenge_sha256 !== reviewed.issue.challenge_sha256 ||
    events.issue.challenge_id !== reviewed.issue.challenge_id ||
    events.issue.issued_at_ms !== reviewed.issue.issued_at_ms ||
    events.issue.expires_at_ms !== reviewed.issue.expires_at_ms ||
    events.consume.state !== "consumed" ||
    events.consume.generation !== reviewed.consume.generation ||
    events.consume.sequence !== reviewed.consume.sequence ||
    events.consume.challenge_sha256 !== reviewed.issue.challenge_sha256 ||
    events.consume.challenge_id !== reviewed.issue.challenge_id ||
    events.consume.request_id !== reviewed.liveRead.request_id ||
    events.consume.response_sha256 !== reviewed.liveRead.response_sha256
  ) {
    fail("witness_replay_external_custody_terminal_packet_mismatch");
  }

  const external =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1({
      witness_jsonl: input.external_witness_jsonl,
      current_journal_jsonl: input.current_journal_jsonl,
      current_high_water_json: input.current_high_water_json,
      identity:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_EXTERNAL_IDENTITY_V1,
    });
  if (
    external.ok !== true ||
    external.status !== "matched" ||
    external.exact_live_match !== true ||
    external.witness_event_count !== reviewed.external.event_count ||
    external.witnessed_replay_sequence !==
      reviewed.external.witnessed_replay_sequence ||
    external.local_replay_sequence !==
      reviewed.external.witnessed_replay_sequence ||
    external.witness_sha256 !== reviewed.external.witness_sha256 ||
    external.witness_tip_event_sha256 !==
      reviewed.external.tip_event_sha256 ||
    external.witness_sha256 !== REVIEWED_FINAL_EXTERNAL_WITNESS_SHA256 ||
    external.witness_tip_event_sha256 !==
      REVIEWED_FINAL_EXTERNAL_TIP_EVENT_SHA256
  ) {
    fail("witness_replay_external_custody_external_state_mismatch");
  }

  const normalized = Object.freeze({
    schema:
      "void_buy_void_allocation_custody_witness_live_read_replay_external_custody_qualification_v1",
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_CUSTODY_QUALIFICATION_V1,
    version: 1,
    reviewed_operator_receipt_sha256:
      reviewed.receipt_sha256,
    reviewed_operator_receipt_file_sha256:
      reviewed.receipt_file_sha256,
    reviewed_source_commit:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_SOURCE_COMMIT_V1,
    replay_generation: current.high_water.generation,
    replay_sequence: current.high_water.sequence,
    replay_event_count: current.high_water.event_count,
    replay_journal_sha256: current.high_water.journal_sha256,
    replay_high_water_sha256: current.high_water_sha256,
    live_read_request_id: reviewed.liveRead.request_id,
    live_read_response_sha256: reviewed.liveRead.response_sha256,
    generic_witness_sha256: reviewed.liveRead.witness_sha256,
    generic_witness_event_count: reviewed.liveRead.event_count,
    generic_witness_tip_event_sha256:
      reviewed.liveRead.tip_event_sha256,
    external_witness_sha256: external.witness_sha256,
    external_witness_event_count: external.witness_event_count,
    external_witness_tip_event_sha256:
      external.witness_tip_event_sha256,
    external_witnessed_replay_sequence:
      external.witnessed_replay_sequence,
    source_hostname:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_EXTERNAL_IDENTITY_V1.source_hostname,
    source_journal_disk_wwn:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_EXTERNAL_IDENTITY_V1.source_journal_disk_wwn,
    source_high_water_disk_wwn:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_EXTERNAL_IDENTITY_V1.source_high_water_disk_wwn,
    witness_hostname:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_EXTERNAL_IDENTITY_V1.witness_hostname,
    witness_machine_id_sha256:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_EXTERNAL_IDENTITY_V1.witness_machine_id_sha256,
    witness_root_disk_serial:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_EXTERNAL_IDENTITY_V1.witness_root_disk_serial,
    witness_root_disk_wwn:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_EXTERNAL_IDENTITY_V1.witness_root_disk_wwn,
  });

  const qualificationId =
    "voidwlrlecq1_" +
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
    status: "reviewed_live_external_custody_qualified" as const,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_CUSTODY_QUALIFICATION_V1,
    version: 1 as const,
    qualification_id: qualificationId,
    normalized,
    reviewed_operator_receipt_bound: true as const,
    reviewed_live_evidence_origin_proven: true as const,
    canonical_current_replay_binding_proven: true as const,
    canonical_external_witness_history_proven: true as const,
    terminal_packet_binding_proven: true as const,
    sequential_external_custody_proven: true as const,
    external_transport_authenticated: true as const,
    external_witness_storage_proven: true as const,
    live_remote_read_performed: true as const,
    live_remote_append_performed: true as const,
    external_second_control_domain_qualified: true as const,
    live_durable_storage_proven: false as const,
    rollback_resistance_proven: false as const,
    protected_high_water_custody_proven: false as const,
    independent_custody_proven: false as const,
    trusted_verification_clock_proven: false as const,
    challenge_entropy_proven: false as const,
    challenge_unpredictability_proven: false as const,
    runtime_integration: false as const,
    production_gate_ready: false as const,
    funds_movement: false as const,
    operation_performed: false as const,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_CUSTODY_QUALIFICATION_AUTHORITY_V1,
  });
}

export function classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalCustodyQualificationV1(
  input: {
    operator_receipt_json: string | Buffer;
    current_journal_jsonl: string | Buffer;
    current_high_water_json: string | Buffer;
    external_witness_jsonl: string | Buffer;
  },
) {
  try {
    return qualifyOrThrow(input);
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "witness_replay_external_custody_qualification_failed",
    );
  }
}
