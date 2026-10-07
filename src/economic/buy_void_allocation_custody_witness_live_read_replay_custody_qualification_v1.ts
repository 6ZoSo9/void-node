import crypto from "node:crypto";
import path from "node:path";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1,
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1,
  planBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterAdvanceV1,
} from "./buy_void_allocation_custody_witness_live_read_replay_high_water_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1,
} from "./buy_void_allocation_custody_witness_live_read_replay_writer_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_CUSTODY_QUALIFICATION_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_CUSTODY_QUALIFICATION_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_CUSTODY_RECEIPT_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_CUSTODY_RECEIPT_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_CUSTODY_AUTHORITY_V1 =
  Object.freeze({
    source_only_contract: true,
    io_performed: false,
    canonical_replay_writer_required: true,
    canonical_replay_high_water_required: true,
    live_placement_evidence_input_required: true,
    placement_qualification_id_recomputed: true,
    placement_current_state_binding_required: true,
    storage_policy_fingerprint_bound: true,
    exact_prior_journal_prefix_required: true,
    canonical_single_event_advance_required: true,
    content_addressed_custody_receipt: true,
    canonical_genesis_without_prior_receipt_only: true,
    prior_receipt_required_after_genesis: true,
    verification_clock_authority_proven: false,
    evidence_generation_monotonicity_proven: false,
    placement_external_trust_proven: false,
    prior_receipt_external_trust_proven: false,
    live_durable_storage_proven: false,
    rollback_resistance_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    trusted_verification_clock_proven: false,
    challenge_entropy_proven: false,
    challenge_unpredictability_proven: false,
    live_evidence_origin_proven: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_remote_read_performed: false,
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

const RECEIPT_SCHEMA =
  "void_buy_void_allocation_custody_witness_live_read_replay_custody_receipt_v1";
const QUALIFICATION_DOMAIN =
  "void-buy-void-allocation-custody-witness-live-read-replay-custody-qualification-v1";
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const QUALIFICATION_ID = /^voidwlrie1_[0-9a-f]{64}$/u;
const LOCAL_FS_TYPES = new Set(["ext4", "xfs", "btrfs"]);
const SAFE_DEVICE_PATH = /^\\/dev\\/[A-Za-z0-9._:+/-]{1,300}$/u;
const SAFE_TOKEN = /^[A-Za-z0-9._:+-]{1,300}$/u;
const RECEIPT_KEYS = Object.freeze([
  "schema",
  "marker",
  "version",
  "custody_epoch",
  "previous_receipt_sha256",
  "storage_policy_fingerprint_sha256",
  "hostname",
  "journal_root_path",
  "journal_parent_device",
  "journal_disk_serial",
  "journal_disk_wwn",
  "high_water_root_path",
  "high_water_parent_device",
  "high_water_disk_serial",
  "high_water_disk_wwn",
  "journal_bytes",
  "journal_sha256",
  "high_water_json",
  "high_water_sha256",
  "generation",
  "sequence",
  "event_count",
  "tip_event_sha256",
  "pending",
  "pending_challenge_sha256",
  "pending_challenge_id",
  "pending_expires_at_ms",
  "last_terminal_state",
  "ready_for_issue",
  "receipt_sha256",
]);
const PLACEMENT_KEYS = Object.freeze([
  "qualification_id",
  "normalized",
  "storage_domain_classification_green",
  "live_storage_observation_proven",
  "distinct_local_storage_domains_proven",
  "distinct_parent_block_devices_proven",
  "canonical_journal_high_water_binding_proven",
  "no_pending_publication_intent_observed",
  "double_census_stability_proven",
]);
const NORMALIZED_KEYS = Object.freeze([
  "schema",
  "marker",
  "version",
  "parent_writer_marker",
  "high_water_marker",
  "hostname",
  "journal_root",
  "high_water_root",
  "journal_file",
  "high_water_file",
  "high_water_sha256",
  "generation",
  "sequence",
  "event_count",
  "pending",
  "pending_challenge_sha256",
  "pending_challenge_id",
  "pending_expires_at_ms",
  "last_terminal_state",
  "ready_for_issue",
]);
const ROOT_KEYS = Object.freeze([
  "path",
  "dev",
  "ino",
  "uid",
  "gid",
  "mode",
  "mount_id",
  "major_minor",
  "fs_type",
  "mount_source",
  "mount_source_resolved",
  "mount_point",
  "parent_device",
  "disk_serial",
  "disk_wwn",
]);
const FILE_KEYS = Object.freeze([
  "path",
  "dev",
  "ino",
  "mtime_ns",
  "ctime_ns",
  "sha256",
  "bytes",
  "uid",
  "gid",
  "mode",
  "nlink",
  "regular_file",
  "symlink",
]);

export type BuyVoidAllocationCustodyWitnessLiveReadReplayCustodyReceiptV1 =
  Readonly<{
    schema: typeof RECEIPT_SCHEMA;
    marker:
      typeof VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_CUSTODY_RECEIPT_V1;
    version: 1;
    custody_epoch: string;
    previous_receipt_sha256: string | null;
    storage_policy_fingerprint_sha256: string;
    hostname: string;
    journal_root_path: string;
    journal_parent_device: string;
    journal_disk_serial: string;
    journal_disk_wwn: string;
    high_water_root_path: string;
    high_water_parent_device: string;
    high_water_disk_serial: string;
    high_water_disk_wwn: string;
    journal_bytes: number;
    journal_sha256: string;
    high_water_json: string;
    high_water_sha256: string;
    generation: number;
    sequence: number;
    event_count: number;
    tip_event_sha256: string | null;
    pending: boolean;
    pending_challenge_sha256: string | null;
    pending_challenge_id: string | null;
    pending_expires_at_ms: number | null;
    last_terminal_state: "consumed" | "abandoned" | null;
    ready_for_issue: boolean;
    receipt_sha256: string;
  }>;

function fail(code: string): never {
  throw new Error(code);
}

function held(reason: string) {
  return Object.freeze({
    ok: false as const,
    status: "held" as const,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_CUSTODY_QUALIFICATION_V1,
    version: 1 as const,
    reason,
    operation_performed: false as const,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_CUSTODY_AUTHORITY_V1,
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
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(record[key]))
        .join(",") +
      "}"
    );
  }
  fail("witness_replay_custody_noncanonical_value");
}

function sha256Id(value: string | Buffer): string {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
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

function safeString(value: unknown, code: string): string {
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

function shaField(value: unknown, code: string): string {
  if (typeof value !== "string" || !SHA256_ID.test(value)) {
    fail(code);
  }
  return value;
}

function highWaterJsonField(value: unknown, code: string): string {
  if (
    typeof value !== "string" ||
    value.length < 2 ||
    Buffer.byteLength(value, "utf8") > 16 * 1024 ||
    !value.endsWith("\n") ||
    value.slice(0, -1).includes("\n")
  ) {
    fail(code);
  }
  return value;
}

function nullableSha(value: unknown, code: string): string | null {
  return value === null ? null : shaField(value, code);
}

function receiptBody(
  receipt: BuyVoidAllocationCustodyWitnessLiveReadReplayCustodyReceiptV1,
) {
  const body = { ...receipt } as Record<string, unknown>;
  delete body.receipt_sha256;
  return body;
}

function parseReceipt(
  value: unknown,
): BuyVoidAllocationCustodyWitnessLiveReadReplayCustodyReceiptV1 {
  const raw = exactObject(
    value,
    RECEIPT_KEYS,
    "witness_replay_custody_receipt_shape_invalid",
  );
  if (
    raw.schema !== RECEIPT_SCHEMA ||
    raw.marker !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_CUSTODY_RECEIPT_V1 ||
    raw.version !== 1
  ) {
    fail("witness_replay_custody_receipt_identity_invalid");
  }
  const epoch = safeString(
    raw.custody_epoch,
    "witness_replay_custody_receipt_epoch_invalid",
  );
  if (!/^(0|[1-9][0-9]*)$/u.test(epoch)) {
    fail("witness_replay_custody_receipt_epoch_invalid");
  }
  const previous =
    raw.previous_receipt_sha256 === null
      ? null
      : shaField(
          raw.previous_receipt_sha256,
          "witness_replay_custody_receipt_previous_invalid",
        );
  const pending =
    typeof raw.pending === "boolean"
      ? raw.pending
      : fail("witness_replay_custody_receipt_state_invalid");
  const ready =
    typeof raw.ready_for_issue === "boolean"
      ? raw.ready_for_issue
      : fail("witness_replay_custody_receipt_state_invalid");
  if (pending === ready) {
    fail("witness_replay_custody_receipt_state_invalid");
  }
  const terminal =
    raw.last_terminal_state === null ||
    raw.last_terminal_state === "consumed" ||
    raw.last_terminal_state === "abandoned"
      ? raw.last_terminal_state
      : fail("witness_replay_custody_receipt_state_invalid");
  const pendingChallenge =
    raw.pending_challenge_sha256 === null
      ? null
      : shaField(
          raw.pending_challenge_sha256,
          "witness_replay_custody_receipt_pending_invalid",
        );
  const pendingId =
    raw.pending_challenge_id === null
      ? null
      : safeString(
          raw.pending_challenge_id,
          "witness_replay_custody_receipt_pending_invalid",
        );
  const pendingExpiry =
    raw.pending_expires_at_ms === null
      ? null
      : safeInt(
          raw.pending_expires_at_ms,
          1,
          Number.MAX_SAFE_INTEGER,
          "witness_replay_custody_receipt_pending_invalid",
        );
  if (
    (pending &&
      (pendingChallenge === null ||
        pendingId === null ||
        !/^voidwlrc1_[0-9a-f]{64}$/u.test(pendingId) ||
        pendingExpiry === null)) ||
    (!pending &&
      (pendingChallenge !== null ||
        pendingId !== null ||
        pendingExpiry !== null))
  ) {
    fail("witness_replay_custody_receipt_pending_invalid");
  }
  const receipt: BuyVoidAllocationCustodyWitnessLiveReadReplayCustodyReceiptV1 =
    Object.freeze({
      schema: RECEIPT_SCHEMA,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_CUSTODY_RECEIPT_V1,
      version: 1,
      custody_epoch: epoch,
      previous_receipt_sha256: previous,
      storage_policy_fingerprint_sha256: shaField(
        raw.storage_policy_fingerprint_sha256,
        "witness_replay_custody_receipt_policy_invalid",
      ),
      hostname: safeString(
        raw.hostname,
        "witness_replay_custody_receipt_host_invalid",
      ),
      journal_root_path: safeString(
        raw.journal_root_path,
        "witness_replay_custody_receipt_storage_invalid",
      ),
      journal_parent_device: safeString(
        raw.journal_parent_device,
        "witness_replay_custody_receipt_storage_invalid",
      ),
      journal_disk_serial: safeString(
        raw.journal_disk_serial,
        "witness_replay_custody_receipt_storage_invalid",
      ),
      journal_disk_wwn: safeString(
        raw.journal_disk_wwn,
        "witness_replay_custody_receipt_storage_invalid",
      ),
      high_water_root_path: safeString(
        raw.high_water_root_path,
        "witness_replay_custody_receipt_storage_invalid",
      ),
      high_water_parent_device: safeString(
        raw.high_water_parent_device,
        "witness_replay_custody_receipt_storage_invalid",
      ),
      high_water_disk_serial: safeString(
        raw.high_water_disk_serial,
        "witness_replay_custody_receipt_storage_invalid",
      ),
      high_water_disk_wwn: safeString(
        raw.high_water_disk_wwn,
        "witness_replay_custody_receipt_storage_invalid",
      ),
      journal_bytes: safeInt(
        raw.journal_bytes,
        0,
        8 * 1024 * 1024,
        "witness_replay_custody_receipt_journal_invalid",
      ),
      journal_sha256: shaField(
        raw.journal_sha256,
        "witness_replay_custody_receipt_journal_invalid",
      ),
      high_water_json: highWaterJsonField(
        raw.high_water_json,
        "witness_replay_custody_receipt_high_water_invalid",
      ),
      high_water_sha256: shaField(
        raw.high_water_sha256,
        "witness_replay_custody_receipt_high_water_invalid",
      ),
      generation: safeInt(
        raw.generation,
        0,
        Number.MAX_SAFE_INTEGER,
        "witness_replay_custody_receipt_state_invalid",
      ),
      sequence: safeInt(
        raw.sequence,
        0,
        8192,
        "witness_replay_custody_receipt_state_invalid",
      ),
      event_count: safeInt(
        raw.event_count,
        0,
        8192,
        "witness_replay_custody_receipt_state_invalid",
      ),
      tip_event_sha256: nullableSha(
        raw.tip_event_sha256,
        "witness_replay_custody_receipt_tip_invalid",
      ),
      pending,
      pending_challenge_sha256: pendingChallenge,
      pending_challenge_id: pendingId,
      pending_expires_at_ms: pendingExpiry,
      last_terminal_state: terminal,
      ready_for_issue: ready,
      receipt_sha256: shaField(
        raw.receipt_sha256,
        "witness_replay_custody_receipt_digest_invalid",
      ),
    });
  if (
    receipt.sequence !== receipt.event_count ||
    BigInt(receipt.custody_epoch) !== BigInt(receipt.event_count) ||
    sha256Id(Buffer.from(receipt.high_water_json, "utf8")) !==
      receipt.high_water_sha256 ||
    sha256Id(
      Buffer.from(canonicalJson(receiptBody(receipt)), "utf8"),
    ) !== receipt.receipt_sha256
  ) {
    fail("witness_replay_custody_receipt_digest_invalid");
  }
  return receipt;
}

function parsePlacement(value: unknown) {
  const raw = exactObject(
    value,
    PLACEMENT_KEYS,
    "witness_replay_custody_placement_shape_invalid",
  );
  if (
    typeof raw.qualification_id !== "string" ||
    !QUALIFICATION_ID.test(raw.qualification_id) ||
    raw.storage_domain_classification_green !== true ||
    raw.live_storage_observation_proven !== true ||
    raw.distinct_local_storage_domains_proven !== true ||
    raw.distinct_parent_block_devices_proven !== true ||
    raw.canonical_journal_high_water_binding_proven !== true ||
    raw.no_pending_publication_intent_observed !== true ||
    raw.double_census_stability_proven !== true
  ) {
    fail("witness_replay_custody_placement_authority_invalid");
  }
  const normalized = exactObject(
    raw.normalized,
    NORMALIZED_KEYS,
    "witness_replay_custody_placement_normalized_invalid",
  );
  if (
    normalized.schema !==
      "void_buy_void_allocation_custody_witness_live_read_replay_installation_evidence_v1" ||
    normalized.marker !==
      "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V1" ||
    normalized.version !== 1 ||
    normalized.parent_writer_marker !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1 ||
    normalized.high_water_marker !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1
  ) {
    fail("witness_replay_custody_placement_normalized_invalid");
  }
  const journalRoot = exactObject(
    normalized.journal_root,
    ROOT_KEYS,
    "witness_replay_custody_placement_root_invalid",
  );
  const highWaterRoot = exactObject(
    normalized.high_water_root,
    ROOT_KEYS,
    "witness_replay_custody_placement_root_invalid",
  );
  const journalFile = exactObject(
    normalized.journal_file,
    FILE_KEYS,
    "witness_replay_custody_placement_file_invalid",
  );
  const highWaterFile = exactObject(
    normalized.high_water_file,
    FILE_KEYS,
    "witness_replay_custody_placement_file_invalid",
  );

  const validateRoot = (
    root: Record<string, unknown>,
    label: string,
  ) => {
    if (
      typeof root.path !== "string" ||
      !path.isAbsolute(root.path) ||
      typeof root.dev !== "string" ||
      !/^[0-9]+$/u.test(root.dev) ||
      typeof root.ino !== "string" ||
      !/^[1-9][0-9]*$/u.test(root.ino) ||
      !Number.isSafeInteger(root.uid) ||
      (root.uid as number) < 0 ||
      !Number.isSafeInteger(root.gid) ||
      (root.gid as number) < 0 ||
      root.mode !== 0o700 ||
      !Number.isSafeInteger(root.mount_id) ||
      (root.mount_id as number) < 1 ||
      typeof root.major_minor !== "string" ||
      !/^[0-9]+:[0-9]+$/u.test(root.major_minor) ||
      typeof root.fs_type !== "string" ||
      !LOCAL_FS_TYPES.has(root.fs_type) ||
      typeof root.mount_source !== "string" ||
      !SAFE_DEVICE_PATH.test(root.mount_source) ||
      typeof root.mount_source_resolved !== "string" ||
      !SAFE_DEVICE_PATH.test(root.mount_source_resolved) ||
      typeof root.mount_point !== "string" ||
      !path.isAbsolute(root.mount_point) ||
      typeof root.parent_device !== "string" ||
      !SAFE_DEVICE_PATH.test(root.parent_device) ||
      typeof root.disk_serial !== "string" ||
      !SAFE_TOKEN.test(root.disk_serial) ||
      typeof root.disk_wwn !== "string" ||
      !SAFE_TOKEN.test(root.disk_wwn)
    ) {
      fail("witness_replay_custody_placement_" + label + "_root_invalid");
    }
  };
  validateRoot(journalRoot, "journal");
  validateRoot(highWaterRoot, "high_water");

  const nestedUnder = (parent: string, child: string): boolean => {
    const relative = path.relative(parent, child);
    return (
      relative !== "" &&
      relative !== ".." &&
      !relative.startsWith(".." + path.sep) &&
      !path.isAbsolute(relative)
    );
  };
  if (
    journalRoot.uid !== highWaterRoot.uid ||
    journalRoot.gid !== highWaterRoot.gid ||
    journalRoot.path === highWaterRoot.path ||
    nestedUnder(journalRoot.path as string, highWaterRoot.path as string) ||
    nestedUnder(highWaterRoot.path as string, journalRoot.path as string)
  ) {
    fail("witness_replay_custody_placement_roots_invalid");
  }
  if (
    journalRoot.dev === highWaterRoot.dev ||
    journalRoot.mount_id === highWaterRoot.mount_id ||
    journalRoot.major_minor === highWaterRoot.major_minor ||
    journalRoot.mount_source === highWaterRoot.mount_source ||
    journalRoot.mount_source_resolved === highWaterRoot.mount_source_resolved ||
    journalRoot.parent_device === highWaterRoot.parent_device ||
    journalRoot.disk_serial === highWaterRoot.disk_serial ||
    journalRoot.disk_wwn === highWaterRoot.disk_wwn
  ) {
    fail("witness_replay_custody_placement_storage_not_distinct");
  }

  const validateFile = (
    file: Record<string, unknown>,
    root: Record<string, unknown>,
    expectedName: string,
    allowEmpty: boolean,
    label: string,
  ) => {
    if (
      file.path !== path.join(root.path as string, expectedName) ||
      file.dev !== root.dev ||
      typeof file.ino !== "string" ||
      !/^[1-9][0-9]*$/u.test(file.ino) ||
      typeof file.mtime_ns !== "string" ||
      !/^[0-9]+$/u.test(file.mtime_ns) ||
      typeof file.ctime_ns !== "string" ||
      !/^[0-9]+$/u.test(file.ctime_ns) ||
      typeof file.sha256 !== "string" ||
      !SHA256_ID.test(file.sha256) ||
      !Number.isSafeInteger(file.bytes) ||
      (file.bytes as number) < (allowEmpty ? 0 : 1) ||
      (file.bytes as number) > (allowEmpty ? 8 * 1024 * 1024 : 16 * 1024) ||
      file.uid !== root.uid ||
      file.gid !== root.gid ||
      file.mode !== 0o600 ||
      file.nlink !== 1 ||
      file.regular_file !== true ||
      file.symlink !== false
    ) {
      fail("witness_replay_custody_placement_" + label + "_file_invalid");
    }
  };
  validateFile(
    journalFile,
    journalRoot,
    "live-read-replay-v1.jsonl",
    true,
    "journal",
  );
  validateFile(
    highWaterFile,
    highWaterRoot,
    "live-read-replay-high-water-v1.json",
    false,
    "high_water",
  );

  if (
    typeof normalized.high_water_sha256 !== "string" ||
    !SHA256_ID.test(normalized.high_water_sha256)
  ) {
    fail("witness_replay_custody_placement_high_water_invalid");
  }

  const expectedId =
    "voidwlrie1_" +
    crypto
      .createHash("sha256")
      .update(canonicalJson(normalized), "utf8")
      .digest("hex");
  if (expectedId !== raw.qualification_id) {
    fail("witness_replay_custody_placement_qualification_id_invalid");
  }
  const rootPolicy = (root: Record<string, unknown>) =>
    Object.freeze({
      path: safeString(
        root.path,
        "witness_replay_custody_placement_root_invalid",
      ),
      uid: safeInt(
        root.uid,
        0,
        0x7fffffff,
        "witness_replay_custody_placement_root_invalid",
      ),
      gid: safeInt(
        root.gid,
        0,
        0x7fffffff,
        "witness_replay_custody_placement_root_invalid",
      ),
      mode: safeInt(
        root.mode,
        0,
        0o7777,
        "witness_replay_custody_placement_root_invalid",
      ),
      major_minor: safeString(
        root.major_minor,
        "witness_replay_custody_placement_root_invalid",
      ),
      fs_type: safeString(
        root.fs_type,
        "witness_replay_custody_placement_root_invalid",
      ),
      mount_source: safeString(
        root.mount_source,
        "witness_replay_custody_placement_root_invalid",
      ),
      mount_source_resolved: safeString(
        root.mount_source_resolved,
        "witness_replay_custody_placement_root_invalid",
      ),
      parent_device: safeString(
        root.parent_device,
        "witness_replay_custody_placement_root_invalid",
      ),
      disk_serial: safeString(
        root.disk_serial,
        "witness_replay_custody_placement_root_invalid",
      ),
      disk_wwn: safeString(
        root.disk_wwn,
        "witness_replay_custody_placement_root_invalid",
      ),
    });
  const policy = Object.freeze({
    domain:
      "void:mainnet-0:buy-void-replay-custody-storage-policy-v1",
    hostname: safeString(
      normalized.hostname,
      "witness_replay_custody_placement_host_invalid",
    ),
    journal_root: rootPolicy(journalRoot),
    high_water_root: rootPolicy(highWaterRoot),
  });
  return Object.freeze({
    qualification_id: raw.qualification_id as string,
    normalized,
    journal_root: journalRoot,
    high_water_root: highWaterRoot,
    journal_file: journalFile,
    high_water_file: highWaterFile,
    policy,
    storage_policy_fingerprint_sha256: sha256Id(
      Buffer.from(canonicalJson(policy), "utf8"),
    ),
  });
}

function assertReceiptMatchesHighWater(
  receipt: BuyVoidAllocationCustodyWitnessLiveReadReplayCustodyReceiptV1,
  highWater: any,
  highWaterSha256: string,
): void {
  if (
    receipt.high_water_sha256 !== highWaterSha256 ||
    receipt.generation !== highWater.generation ||
    receipt.sequence !== highWater.sequence ||
    receipt.event_count !== highWater.event_count ||
    receipt.tip_event_sha256 !== highWater.tip_event_sha256 ||
    receipt.pending !== highWater.pending ||
    receipt.pending_challenge_sha256 !==
      highWater.pending_challenge_sha256 ||
    receipt.pending_challenge_id !==
      highWater.pending_challenge_id ||
    receipt.pending_expires_at_ms !==
      highWater.pending_expires_at_ms ||
    receipt.last_terminal_state !==
      highWater.last_terminal_state ||
    receipt.ready_for_issue !== highWater.ready_for_issue
  ) {
    fail("witness_replay_custody_prior_receipt_state_mismatch");
  }
}

function buildReceipt(
  placement: ReturnType<typeof parsePlacement>,
  journal: Buffer,
  highWaterJson: string,
  highWaterSha: string,
  highWater: any,
  previous: BuyVoidAllocationCustodyWitnessLiveReadReplayCustodyReceiptV1 | null,
): BuyVoidAllocationCustodyWitnessLiveReadReplayCustodyReceiptV1 {
  const journalPolicy = placement.policy.journal_root;
  const highPolicy = placement.policy.high_water_root;
  const body = Object.freeze({
    schema: RECEIPT_SCHEMA,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_CUSTODY_RECEIPT_V1,
    version: 1 as const,
    custody_epoch: String(highWater.event_count),
    previous_receipt_sha256:
      previous?.receipt_sha256 ?? null,
    storage_policy_fingerprint_sha256:
      placement.storage_policy_fingerprint_sha256,
    hostname: placement.policy.hostname,
    journal_root_path: journalPolicy.path,
    journal_parent_device: journalPolicy.parent_device,
    journal_disk_serial: journalPolicy.disk_serial,
    journal_disk_wwn: journalPolicy.disk_wwn,
    high_water_root_path: highPolicy.path,
    high_water_parent_device: highPolicy.parent_device,
    high_water_disk_serial: highPolicy.disk_serial,
    high_water_disk_wwn: highPolicy.disk_wwn,
    journal_bytes: journal.length,
    journal_sha256: sha256Id(journal),
    high_water_json: highWaterJson,
    high_water_sha256: highWaterSha,
    generation: highWater.generation,
    sequence: highWater.sequence,
    event_count: highWater.event_count,
    tip_event_sha256: highWater.tip_event_sha256,
    pending: highWater.pending,
    pending_challenge_sha256:
      highWater.pending_challenge_sha256,
    pending_challenge_id:
      highWater.pending_challenge_id,
    pending_expires_at_ms:
      highWater.pending_expires_at_ms,
    last_terminal_state:
      highWater.last_terminal_state,
    ready_for_issue:
      highWater.ready_for_issue,
  });
  return Object.freeze({
    ...body,
    receipt_sha256: sha256Id(
      Buffer.from(canonicalJson(body), "utf8"),
    ),
  });
}

function qualifyOrThrow(input: {
  placement_evidence: unknown;
  current_journal_jsonl: string | Buffer;
  current_high_water_json: string | Buffer;
  prior_receipt: unknown | null;
}) {
  const placement = parsePlacement(input.placement_evidence);
  const journal = Buffer.isBuffer(input.current_journal_jsonl)
    ? Buffer.from(input.current_journal_jsonl)
    : typeof input.current_journal_jsonl === "string"
      ? Buffer.from(input.current_journal_jsonl, "utf8")
      : fail("witness_replay_custody_journal_invalid");
  const highWaterBytes = Buffer.isBuffer(input.current_high_water_json)
    ? Buffer.from(input.current_high_water_json)
    : typeof input.current_high_water_json === "string"
      ? Buffer.from(input.current_high_water_json, "utf8")
      : fail("witness_replay_custody_high_water_invalid");
  const current =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1({
      journal_jsonl: journal,
      high_water_json: highWaterBytes,
    });
  if (current.ok !== true) {
    fail(
      "witness_replay_custody_current_" +
        String(current.reason || "invalid"),
    );
  }
  const journalSha = sha256Id(journal);
  const highWaterSha = sha256Id(highWaterBytes);
  if (
    placement.journal_file.sha256 !== journalSha ||
    placement.journal_file.bytes !== journal.length ||
    placement.high_water_file.sha256 !== highWaterSha ||
    placement.high_water_file.bytes !== highWaterBytes.length ||
    placement.normalized.high_water_sha256 !== current.high_water_sha256 ||
    placement.normalized.generation !== current.high_water.generation ||
    placement.normalized.sequence !== current.high_water.sequence ||
    placement.normalized.event_count !== current.high_water.event_count ||
    placement.normalized.pending !== current.high_water.pending ||
    placement.normalized.pending_challenge_sha256 !==
      current.high_water.pending_challenge_sha256 ||
    placement.normalized.pending_challenge_id !==
      current.high_water.pending_challenge_id ||
    placement.normalized.pending_expires_at_ms !==
      current.high_water.pending_expires_at_ms ||
    placement.normalized.last_terminal_state !==
      current.high_water.last_terminal_state ||
    placement.normalized.ready_for_issue !==
      current.high_water.ready_for_issue
  ) {
    fail("witness_replay_custody_placement_current_state_mismatch");
  }

  let prior:
    | BuyVoidAllocationCustodyWitnessLiveReadReplayCustodyReceiptV1
    | null = null;
  let status: "source_qualified" | "idempotent" = "source_qualified";

  if (input.prior_receipt === null) {
    if (
      journal.length !== 0 ||
      current.high_water.event_count !== 0 ||
      current.high_water.sequence !== 0 ||
      current.high_water.generation !== 0 ||
      current.high_water.tip_event_sha256 !== null ||
      current.high_water.pending !== false ||
      current.high_water.ready_for_issue !== true
    ) {
      fail("witness_replay_custody_prior_receipt_required");
    }
  } else {
    prior = parseReceipt(input.prior_receipt);
    if (
      prior.storage_policy_fingerprint_sha256 !==
        placement.storage_policy_fingerprint_sha256
    ) {
      fail("witness_replay_custody_prior_receipt_policy_mismatch");
    }
    if (
      journal.length === prior.journal_bytes &&
      journalSha === prior.journal_sha256 &&
      highWaterSha === prior.high_water_sha256
    ) {
      if (
        highWaterBytes.toString("utf8") !== prior.high_water_json
      ) {
        fail("witness_replay_custody_same_epoch_state_conflict");
      }
      assertReceiptMatchesHighWater(
        prior,
        current.high_water,
        current.high_water_sha256,
      );
      status = "idempotent";
    } else {
      if (
        current.high_water.event_count !== prior.event_count + 1 ||
        current.high_water.sequence !== prior.sequence + 1 ||
        journal.length <= prior.journal_bytes
      ) {
        fail("witness_replay_custody_multi_event_jump_forbidden");
      }
      const priorJournal = journal.subarray(0, prior.journal_bytes);
      if (sha256Id(priorJournal) !== prior.journal_sha256) {
        fail("witness_replay_custody_prior_journal_prefix_invalid");
      }
      const priorBinding =
        classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1({
          journal_jsonl: priorJournal,
          high_water_json: prior.high_water_json,
        });
      if (
        priorBinding.ok !== true ||
        priorBinding.high_water_sha256 !== prior.high_water_sha256
      ) {
        fail("witness_replay_custody_prior_high_water_invalid");
      }
      assertReceiptMatchesHighWater(
        prior,
        priorBinding.high_water,
        priorBinding.high_water_sha256,
      );
      const advance =
        planBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterAdvanceV1({
          current_journal_jsonl: priorJournal,
          current_high_water_json: prior.high_water_json,
          next_journal_jsonl: journal,
        });
      if (
        advance.ok !== true ||
        advance.idempotent !== false ||
        advance.next_high_water_sha256 !== current.high_water_sha256 ||
        advance.next_high_water_json !== highWaterBytes.toString("utf8")
      ) {
        fail("witness_replay_custody_advance_invalid");
      }
    }
  }

  const receipt =
    status === "idempotent" && prior
      ? prior
      : buildReceipt(
          placement,
          journal,
          highWaterBytes.toString("utf8"),
          current.high_water_sha256,
          current.high_water,
          prior,
        );

  const qualificationBody = Object.freeze({
    domain: QUALIFICATION_DOMAIN,
    placement_qualification_id: placement.qualification_id,
    storage_policy_fingerprint_sha256:
      placement.storage_policy_fingerprint_sha256,
    receipt_sha256: receipt.receipt_sha256,
  });
  const qualificationId =
    "voidwlrcq1_" +
    crypto
      .createHash("sha256")
      .update(canonicalJson(qualificationBody), "utf8")
      .digest("hex");

  return Object.freeze({
    ok: true as const,
    status,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_CUSTODY_QUALIFICATION_V1,
    version: 1 as const,
    qualification_id: qualificationId,
    placement_qualification_id: placement.qualification_id,
    storage_policy_fingerprint_sha256:
      placement.storage_policy_fingerprint_sha256,
    custody_epoch: receipt.custody_epoch,
    current_event_count: current.high_water.event_count,
    monotonic_continuity_against_supplied_prior: true as const,
    canonical_current_high_water_binding_reused: true as const,
    canonical_single_event_advance_reused: true as const,
    placement_current_state_binding_proven: true as const,
    placement_external_trust_proven: false as const,
    prior_receipt_external_trust_proven: false as const,
    live_durable_storage_proven: false as const,
    rollback_resistance_proven: false as const,
    protected_high_water_custody_proven: false as const,
    independent_custody_proven: false as const,
    production_gate_ready: false as const,
    funds_movement: false as const,
    receipt,
    operation_performed: false as const,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_CUSTODY_AUTHORITY_V1,
  });
}

export function classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCustodyQualificationV1(
  input: {
    placement_evidence: unknown;
    current_journal_jsonl: string | Buffer;
    current_high_water_json: string | Buffer;
    prior_receipt: unknown | null;
  },
) {
  try {
    return qualifyOrThrow(input);
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "witness_replay_custody_qualification_failed",
    );
  }
}