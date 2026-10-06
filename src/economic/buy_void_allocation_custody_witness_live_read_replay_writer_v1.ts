import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  withBuyVoidFilesystemBakeryLockV1,
} from "./buy_void_filesystem_bakery_lock_v1.js";
import {
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayStateV1,
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1,
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1,
} from "./buy_void_allocation_custody_witness_live_read_replay_state_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    filesystem_read: true,
    filesystem_write: true,
    descriptor_bound_reads: true,
    nofollow_ancestor_walk: true,
    same_uid_private_storage: true,
    distinct_storage_roots_required: true,
    dual_root_serialization_lock: true,
    redundant_transaction_intent: true,
    canonical_replay_planner_required: true,
    journal_first_publication_order: true,
    atomic_journal_publication: true,
    atomic_high_water_publication: true,
    file_fsync: true,
    directory_fsync: true,
    crash_recovery: true,
    exact_postcheck: true,
    cross_root_rollback_detection_semantics: true,
    storage_bootstrap: false,
    validated_packet_binding_proven: false,
    live_durable_storage_proven: false,
    rollback_resistance_proven: false,
    protected_high_water_custody_proven: false,
    trusted_verification_clock_proven: false,
    challenge_entropy_proven: false,
    challenge_unpredictability_proven: false,
    live_evidence_origin_proven: false,
    live_sshd_connection_context_proven: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_remote_read_performed: false,
    runtime_integration: false,
    independent_custody_proven: false,
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

const JOURNAL_NAME = "live-read-replay-v1.jsonl";
const HIGH_WATER_NAME = "live-read-replay-high-water-v1.json";
const INTENT_NAME = "live-read-replay-publication-intent-v1.json";
const LOCK_NAME = ".live-read-replay-writer-v1";

const HIGH_WATER_SCHEMA =
  "void_buy_void_allocation_custody_witness_live_read_replay_high_water_v1";
const HIGH_WATER_MARKER =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1";
const INTENT_SCHEMA =
  "void_buy_void_allocation_custody_witness_live_read_replay_publication_intent_v1";
const INTENT_MARKER =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_PUBLICATION_INTENT_V1";

const MAX_JOURNAL_BYTES = 8 * 1024 * 1024;
const MAX_HIGH_WATER_BYTES = 16 * 1024;
const MAX_INTENT_BYTES = 128 * 1024;
const O_NOFOLLOW = fs.constants.O_NOFOLLOW;
const O_DIRECTORY = fs.constants.O_DIRECTORY;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const HIGH_WATER_ID = /^voidwlrhw1_[0-9a-f]{64}$/u;
const INTENT_ID = /^voidwlri1_[0-9a-f]{64}$/u;

type PinnedDirectoryV1 = Readonly<{
  path: string;
  fd: number;
  stat: any;
  proc_path: string;
}>;

type HighWaterV1 = Readonly<{
  schema: typeof HIGH_WATER_SCHEMA;
  marker: typeof HIGH_WATER_MARKER;
  version: 1;
  generation: number;
  sequence: number;
  event_count: number;
  pending: boolean;
  pending_challenge_sha256: string | null;
  tip_event_sha256: string | null;
  journal_sha256: string;
  journal_bytes: number;
  high_water_id: string;
}>;

type IntentV1 = Readonly<{
  schema: typeof INTENT_SCHEMA;
  marker: typeof INTENT_MARKER;
  version: 1;
  operation: "issue" | "consumed" | "abandoned";
  before_high_water: HighWaterV1;
  after_high_water: HighWaterV1;
  event_jsonl_line: string;
  intent_id: string;
}>;

type CrashPhaseV1 =
  | "after_journal_intent"
  | "after_intents"
  | "after_journal"
  | "after_high_water";

function fail(code: string): never {
  throw new Error(code);
}

function held(reason: string) {
  return Object.freeze({
    ok: false as const,
    status: "held" as const,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1,
    version: 1 as const,
    reason,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_AUTHORITY_V1,
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
  fail("witness_live_read_replay_writer_noncanonical_value");
}

function sha256Id(value: string | Buffer): string {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
}

function contentId(prefix: string, value: unknown): string {
  return (
    prefix +
    crypto
      .createHash("sha256")
      .update(canonicalJson(value), "utf8")
      .digest("hex")
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

function nullableSha(
  value: unknown,
  code: string,
): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !SHA256_ID.test(value)) {
    fail(code);
  }
  return value;
}

function currentUid(): bigint {
  if (typeof process.getuid !== "function") {
    fail("witness_live_read_replay_writer_uid_unavailable");
  }
  return BigInt(process.getuid());
}

function sameDirectoryIdentity(left: any, right: any): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode
  );
}

function sameFileIdentity(left: any, right: any): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

function validateAncestor(stat: any, code: string): void {
  const uid = currentUid();
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    (stat.uid !== uid && stat.uid !== 0n) ||
    (
      (Number(stat.mode) & 0o022) !== 0 &&
      (Number(stat.mode) & 0o1000) === 0
    )
  ) {
    fail(code);
  }
}

function validatePrivateDirectory(stat: any, code: string): void {
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    stat.uid !== currentUid() ||
    (Number(stat.mode) & 0o077) !== 0
  ) {
    fail(code);
  }
}

function validatePrivateFile(
  stat: any,
  maxBytes: number,
  allowEmpty: boolean,
  code: string,
): void {
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.uid !== currentUid() ||
    stat.nlink !== 1n ||
    (Number(stat.mode) & 0o077) !== 0 ||
    stat.size < (allowEmpty ? 0n : 1n) ||
    stat.size > BigInt(maxBytes)
  ) {
    fail(code);
  }
}

function requireDescriptorSafety(): void {
  if (
    typeof O_NOFOLLOW !== "number" ||
    typeof O_DIRECTORY !== "number" ||
    !fs.existsSync("/proc/self/fd")
  ) {
    fail("witness_live_read_replay_writer_descriptor_safety_unavailable");
  }
}

function openPinnedDirectory(
  rawPath: string,
  code: string,
): PinnedDirectoryV1 {
  requireDescriptorSafety();
  const raw = String(rawPath || "").trim();
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    fail(code + "_path_invalid");
  }
  const resolved = path.resolve(raw);
  const visible = fs.lstatSync(resolved, { bigint: true });
  validatePrivateDirectory(visible, code + "_invalid");

  const parsed = path.parse(resolved);
  const parts = resolved
    .slice(parsed.root.length)
    .split(path.sep)
    .filter(Boolean);

  let fd = fs.openSync(
    parsed.root,
    fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
  );
  try {
    for (const part of parts) {
      validateAncestor(
        fs.fstatSync(fd, { bigint: true }),
        code + "_ancestor_invalid",
      );
      if (!part || part === "." || part === "..") {
        fail(code + "_ancestor_component_invalid");
      }
      const next = fs.openSync(
        path.join("/proc/self/fd", String(fd), part),
        fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
      );
      fs.closeSync(fd);
      fd = next;
    }
    const opened = fs.fstatSync(fd, { bigint: true });
    validatePrivateDirectory(opened, code + "_invalid");
    if (!sameDirectoryIdentity(visible, opened)) {
      fail(code + "_changed");
    }
    const result = Object.freeze({
      path: resolved,
      fd,
      stat: opened,
      proc_path: "/proc/self/fd/" + String(fd),
    });
    fd = -1;
    return result;
  } finally {
    if (fd >= 0) fs.closeSync(fd);
  }
}

function closePinned(directory: PinnedDirectoryV1): void {
  try {
    fs.closeSync(directory.fd);
  } catch (error) {
    void error;
  }
}

function assertPinnedDirectoryVisible(
  directory: PinnedDirectoryV1,
  code: string,
): void {
  const opened = fs.fstatSync(directory.fd, { bigint: true });
  const visible = fs.lstatSync(directory.path, { bigint: true });
  validatePrivateDirectory(opened, code + "_invalid");
  validatePrivateDirectory(visible, code + "_invalid");
  if (
    !sameDirectoryIdentity(directory.stat, opened) ||
    !sameDirectoryIdentity(opened, visible)
  ) {
    fail(code + "_changed");
  }
}

function assertDistinctRoots(
  left: PinnedDirectoryV1,
  right: PinnedDirectoryV1,
): void {
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
    left.path === right.path ||
    nestedUnder(left.path, right.path) ||
    nestedUnder(right.path, left.path) ||
    (
      left.stat.dev === right.stat.dev &&
      left.stat.ino === right.stat.ino
    )
  ) {
    fail("witness_live_read_replay_writer_storage_roots_not_distinct");
  }
}

function readPinnedFile(
  directory: PinnedDirectoryV1,
  name: string,
  maxBytes: number,
  allowEmpty: boolean,
  code: string,
): Buffer {
  assertPinnedDirectoryVisible(
    directory,
    "witness_live_read_replay_writer_root",
  );
  const visiblePath = path.join(directory.path, name);
  const pinnedPath = path.join(directory.proc_path, name);
  const before = fs.lstatSync(visiblePath, { bigint: true });
  validatePrivateFile(before, maxBytes, allowEmpty, code + "_invalid");
  const fd = fs.openSync(
    pinnedPath,
    fs.constants.O_RDONLY | O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validatePrivateFile(opened, maxBytes, allowEmpty, code + "_invalid");
    if (!sameFileIdentity(before, opened)) {
      fail(code + "_path_not_bound");
    }
    const size = Number(opened.size);
    if (!Number.isSafeInteger(size) || size < 0 || size > maxBytes) {
      fail(code + "_size_invalid");
    }
    const bytes = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const count = fs.readSync(
        fd,
        bytes,
        offset,
        size - offset,
        offset,
      );
      if (count <= 0) fail(code + "_short_read");
      offset += count;
    }
    const growth = Buffer.alloc(1);
    if (fs.readSync(fd, growth, 0, 1, size) !== 0) {
      fail(code + "_grew_after_open");
    }
    const after = fs.fstatSync(fd, { bigint: true });
    const visibleAfter = fs.lstatSync(visiblePath, { bigint: true });
    validatePrivateFile(after, maxBytes, allowEmpty, code + "_invalid");
    validatePrivateFile(
      visibleAfter,
      maxBytes,
      allowEmpty,
      code + "_invalid",
    );
    if (
      !sameFileIdentity(opened, after) ||
      !sameFileIdentity(after, visibleAfter)
    ) {
      fail(code + "_changed");
    }
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

function optionalPinnedFile(
  directory: PinnedDirectoryV1,
  name: string,
  maxBytes: number,
  code: string,
): Buffer | null {
  try {
    return readPinnedFile(directory, name, maxBytes, false, code);
  } catch (error) {
    if (
      error instanceof Error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
}

function fsyncDirectory(directory: PinnedDirectoryV1): void {
  fs.fsyncSync(directory.fd);
}

function atomicReplace(
  directory: PinnedDirectoryV1,
  name: string,
  bytes: Buffer,
  maxBytes: number,
  allowEmpty: boolean,
  code: string,
): void {
  if (
    bytes.length > maxBytes ||
    (!allowEmpty && bytes.length < 1)
  ) {
    fail(code + "_bytes_invalid");
  }
  assertPinnedDirectoryVisible(
    directory,
    "witness_live_read_replay_writer_root",
  );
  const temporary =
    "." +
    name +
    ".tmp-" +
    String(process.pid) +
    "-" +
    crypto.randomBytes(8).toString("hex");
  const tempPath = path.join(directory.proc_path, temporary);
  const finalPath = path.join(directory.proc_path, name);
  let fd = -1;
  try {
    fd = fs.openSync(
      tempPath,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        O_NOFOLLOW,
      0o600,
    );
    let offset = 0;
    while (offset < bytes.length) {
      const written = fs.writeSync(
        fd,
        bytes,
        offset,
        bytes.length - offset,
        null,
      );
      if (written <= 0) fail(code + "_short_write");
      offset += written;
    }
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = -1;
    fs.renameSync(tempPath, finalPath);
    fsyncDirectory(directory);
    const post = readPinnedFile(
      directory,
      name,
      maxBytes,
      allowEmpty,
      code + "_postcheck",
    );
    if (!post.equals(bytes)) fail(code + "_postcheck_failed");
  } finally {
    if (fd >= 0) {
      try {
        fs.closeSync(fd);
      } catch (error) {
        void error;
      }
    }
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
        fsyncDirectory(directory);
      }
    } catch (error) {
      void error;
    }
  }
}

function unlinkPinnedIfPresent(
  directory: PinnedDirectoryV1,
  name: string,
): boolean {
  assertPinnedDirectoryVisible(
    directory,
    "witness_live_read_replay_writer_root",
  );
  const target = path.join(directory.proc_path, name);
  try {
    fs.unlinkSync(target);
    fsyncDirectory(directory);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return false;
    throw error;
  }
}

function highWaterBody(
  value: Omit<HighWaterV1, "high_water_id">,
) {
  return Object.freeze({
    schema: value.schema,
    marker: value.marker,
    version: value.version,
    generation: value.generation,
    sequence: value.sequence,
    event_count: value.event_count,
    pending: value.pending,
    pending_challenge_sha256: value.pending_challenge_sha256,
    tip_event_sha256: value.tip_event_sha256,
    journal_sha256: value.journal_sha256,
    journal_bytes: value.journal_bytes,
  });
}

function buildHighWater(journal: Buffer): HighWaterV1 {
  const state =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayStateV1(journal);
  if (state.ok !== true) {
    fail(
      "witness_live_read_replay_writer_state_" +
        String(state.reason || "invalid"),
    );
  }
  const body = Object.freeze({
    schema: HIGH_WATER_SCHEMA,
    marker: HIGH_WATER_MARKER,
    version: 1 as const,
    generation: state.generation,
    sequence: state.sequence,
    event_count: state.event_count,
    pending: state.pending,
    pending_challenge_sha256: state.pending_challenge_sha256,
    tip_event_sha256: state.tip_event_sha256,
    journal_sha256: state.journal_sha256,
    journal_bytes: journal.length,
  });
  return Object.freeze({
    ...body,
    high_water_id: contentId("voidwlrhw1_", body),
  });
}

function parseHighWaterObject(value: unknown): HighWaterV1 {
  const raw = exactObject(
    value,
    [
      "schema",
      "marker",
      "version",
      "generation",
      "sequence",
      "event_count",
      "pending",
      "pending_challenge_sha256",
      "tip_event_sha256",
      "journal_sha256",
      "journal_bytes",
      "high_water_id",
    ],
    "witness_live_read_replay_writer_high_water_shape_invalid",
  );
  if (
    raw.schema !== HIGH_WATER_SCHEMA ||
    raw.marker !== HIGH_WATER_MARKER ||
    raw.version !== 1
  ) {
    fail("witness_live_read_replay_writer_high_water_identity_invalid");
  }
  const generation = safeInt(
    raw.generation,
    0,
    Number.MAX_SAFE_INTEGER,
    "witness_live_read_replay_writer_high_water_generation_invalid",
  );
  const sequence = safeInt(
    raw.sequence,
    0,
    8192,
    "witness_live_read_replay_writer_high_water_sequence_invalid",
  );
  const eventCount = safeInt(
    raw.event_count,
    0,
    8192,
    "witness_live_read_replay_writer_high_water_event_count_invalid",
  );
  const journalBytes = safeInt(
    raw.journal_bytes,
    0,
    MAX_JOURNAL_BYTES,
    "witness_live_read_replay_writer_high_water_journal_bytes_invalid",
  );
  if (sequence !== eventCount || typeof raw.pending !== "boolean") {
    fail("witness_live_read_replay_writer_high_water_state_invalid");
  }
  const pendingChallenge = nullableSha(
    raw.pending_challenge_sha256,
    "witness_live_read_replay_writer_high_water_pending_invalid",
  );
  const tip = nullableSha(
    raw.tip_event_sha256,
    "witness_live_read_replay_writer_high_water_tip_invalid",
  );
  if (
    typeof raw.journal_sha256 !== "string" ||
    !SHA256_ID.test(raw.journal_sha256) ||
    typeof raw.high_water_id !== "string" ||
    !HIGH_WATER_ID.test(raw.high_water_id)
  ) {
    fail("witness_live_read_replay_writer_high_water_digest_invalid");
  }
  if (
    (raw.pending === true && pendingChallenge === null) ||
    (raw.pending === false && pendingChallenge !== null) ||
    (sequence === 0 && (generation !== 0 || tip !== null)) ||
    (sequence > 0 && (generation < 1 || tip === null))
  ) {
    fail("witness_live_read_replay_writer_high_water_state_invalid");
  }
  const normalized: HighWaterV1 = Object.freeze({
    schema: HIGH_WATER_SCHEMA,
    marker: HIGH_WATER_MARKER,
    version: 1,
    generation,
    sequence,
    event_count: eventCount,
    pending: raw.pending,
    pending_challenge_sha256: pendingChallenge,
    tip_event_sha256: tip,
    journal_sha256: raw.journal_sha256,
    journal_bytes: journalBytes,
    high_water_id: raw.high_water_id,
  });
  if (
    normalized.high_water_id !==
      contentId("voidwlrhw1_", highWaterBody(normalized))
  ) {
    fail("witness_live_read_replay_writer_high_water_id_invalid");
  }
  return normalized;
}

function highWaterBytes(value: HighWaterV1): Buffer {
  return Buffer.from(canonicalJson(value) + "\n", "utf8");
}

function parseHighWaterBytes(bytes: Buffer): HighWaterV1 {
  if (
    bytes.length < 2 ||
    bytes.length > MAX_HIGH_WATER_BYTES ||
    bytes.at(-1) !== 0x0a
  ) {
    fail("witness_live_read_replay_writer_high_water_bytes_invalid");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8").slice(0, -1));
  } catch {
    fail("witness_live_read_replay_writer_high_water_json_invalid");
  }
  const value = parseHighWaterObject(parsed);
  if (!bytes.equals(highWaterBytes(value))) {
    fail("witness_live_read_replay_writer_high_water_noncanonical");
  }
  return value;
}

function intentBody(value: Omit<IntentV1, "intent_id">) {
  return Object.freeze({
    schema: value.schema,
    marker: value.marker,
    version: value.version,
    operation: value.operation,
    before_high_water: value.before_high_water,
    after_high_water: value.after_high_water,
    event_jsonl_line: value.event_jsonl_line,
  });
}

function buildIntent(
  operation: "issue" | "consumed" | "abandoned",
  before: HighWaterV1,
  after: HighWaterV1,
  eventLine: string,
): IntentV1 {
  if (
    !eventLine.endsWith("\n") ||
    eventLine.slice(0, -1).includes("\n") ||
    Buffer.byteLength(eventLine, "utf8") > 32 * 1024
  ) {
    fail("witness_live_read_replay_writer_event_line_invalid");
  }
  const body = Object.freeze({
    schema: INTENT_SCHEMA,
    marker: INTENT_MARKER,
    version: 1 as const,
    operation,
    before_high_water: before,
    after_high_water: after,
    event_jsonl_line: eventLine,
  });
  return Object.freeze({
    ...body,
    intent_id: contentId("voidwlri1_", body),
  });
}

function intentBytes(value: IntentV1): Buffer {
  return Buffer.from(canonicalJson(value) + "\n", "utf8");
}

function parseIntentBytes(bytes: Buffer): IntentV1 {
  if (
    bytes.length < 2 ||
    bytes.length > MAX_INTENT_BYTES ||
    bytes.at(-1) !== 0x0a
  ) {
    fail("witness_live_read_replay_writer_intent_bytes_invalid");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8").slice(0, -1));
  } catch {
    fail("witness_live_read_replay_writer_intent_json_invalid");
  }
  const raw = exactObject(
    parsed,
    [
      "schema",
      "marker",
      "version",
      "operation",
      "before_high_water",
      "after_high_water",
      "event_jsonl_line",
      "intent_id",
    ],
    "witness_live_read_replay_writer_intent_shape_invalid",
  );
  if (
    raw.schema !== INTENT_SCHEMA ||
    raw.marker !== INTENT_MARKER ||
    raw.version !== 1 ||
    (
      raw.operation !== "issue" &&
      raw.operation !== "consumed" &&
      raw.operation !== "abandoned"
    ) ||
    typeof raw.event_jsonl_line !== "string" ||
    typeof raw.intent_id !== "string" ||
    !INTENT_ID.test(raw.intent_id)
  ) {
    fail("witness_live_read_replay_writer_intent_identity_invalid");
  }
  const before = parseHighWaterObject(raw.before_high_water);
  const after = parseHighWaterObject(raw.after_high_water);
  const normalized = buildIntent(
    raw.operation,
    before,
    after,
    raw.event_jsonl_line,
  );
  if (normalized.intent_id !== raw.intent_id) {
    fail("witness_live_read_replay_writer_intent_id_invalid");
  }
  if (!bytes.equals(intentBytes(normalized))) {
    fail("witness_live_read_replay_writer_intent_noncanonical");
  }
  return normalized;
}

function coherentState(
  journalDirectory: PinnedDirectoryV1,
  highWaterDirectory: PinnedDirectoryV1,
) {
  const journal = readPinnedFile(
    journalDirectory,
    JOURNAL_NAME,
    MAX_JOURNAL_BYTES,
    true,
    "witness_live_read_replay_writer_journal",
  );
  const highWater = parseHighWaterBytes(
    readPinnedFile(
      highWaterDirectory,
      HIGH_WATER_NAME,
      MAX_HIGH_WATER_BYTES,
      false,
      "witness_live_read_replay_writer_high_water",
    ),
  );
  const expected = buildHighWater(journal);
  if (
    highWater.high_water_id !== expected.high_water_id ||
    !highWaterBytes(highWater).equals(highWaterBytes(expected))
  ) {
    fail("witness_live_read_replay_writer_high_water_journal_mismatch");
  }
  return Object.freeze({ journal, high_water: highWater });
}

function writeIntent(
  directory: PinnedDirectoryV1,
  intent: IntentV1,
): void {
  atomicReplace(
    directory,
    INTENT_NAME,
    intentBytes(intent),
    MAX_INTENT_BYTES,
    false,
    "witness_live_read_replay_writer_intent",
  );
}

function readOptionalIntent(
  directory: PinnedDirectoryV1,
): { intent: IntentV1; bytes: Buffer } | null {
  const bytes = optionalPinnedFile(
    directory,
    INTENT_NAME,
    MAX_INTENT_BYTES,
    "witness_live_read_replay_writer_intent",
  );
  if (bytes === null) return null;
  return Object.freeze({
    intent: parseIntentBytes(bytes),
    bytes,
  });
}

function currentHighWater(
  directory: PinnedDirectoryV1,
): HighWaterV1 {
  return parseHighWaterBytes(
    readPinnedFile(
      directory,
      HIGH_WATER_NAME,
      MAX_HIGH_WATER_BYTES,
      false,
      "witness_live_read_replay_writer_high_water",
    ),
  );
}

function recoveryLocked(
  journalDirectory: PinnedDirectoryV1,
  highWaterDirectory: PinnedDirectoryV1,
) {
  const journalIntent = readOptionalIntent(journalDirectory);
  const highWaterIntent = readOptionalIntent(highWaterDirectory);
  if (!journalIntent && !highWaterIntent) {
    const coherent = coherentState(journalDirectory, highWaterDirectory);
    return Object.freeze({
      recovered: false,
      mutation_performed: false,
      ...coherent,
    });
  }

  const selected = journalIntent || highWaterIntent;
  if (!selected) {
    fail("witness_live_read_replay_writer_intent_missing");
  }
  if (
    journalIntent &&
    highWaterIntent &&
    !journalIntent.bytes.equals(highWaterIntent.bytes)
  ) {
    fail("witness_live_read_replay_writer_redundant_intent_mismatch");
  }
  const intent = selected.intent;
  const journal = readPinnedFile(
    journalDirectory,
    JOURNAL_NAME,
    MAX_JOURNAL_BYTES,
    true,
    "witness_live_read_replay_writer_journal",
  );
  const highWater = currentHighWater(highWaterDirectory);
  const journalSha = sha256Id(journal);
  const journalIsBefore =
    journalSha === intent.before_high_water.journal_sha256 &&
    journal.length === intent.before_high_water.journal_bytes;
  const journalIsAfter =
    journalSha === intent.after_high_water.journal_sha256 &&
    journal.length === intent.after_high_water.journal_bytes;
  const highWaterIsBefore =
    highWater.high_water_id === intent.before_high_water.high_water_id;
  const highWaterIsAfter =
    highWater.high_water_id === intent.after_high_water.high_water_id;

  if (!journalIsBefore && !journalIsAfter) {
    fail("witness_live_read_replay_writer_recovery_journal_unknown");
  }
  if (!highWaterIsBefore && !highWaterIsAfter) {
    fail("witness_live_read_replay_writer_recovery_high_water_unknown");
  }
  if (journalIsBefore && highWaterIsAfter) {
    fail("witness_live_read_replay_writer_recovery_order_violation");
  }

  let mutation = false;
  if (!journalIntent) {
    writeIntent(journalDirectory, intent);
    mutation = true;
  }
  if (!highWaterIntent) {
    writeIntent(highWaterDirectory, intent);
    mutation = true;
  }

  let nextJournal = journal;
  if (journalIsBefore) {
    nextJournal = Buffer.concat([
      journal,
      Buffer.from(intent.event_jsonl_line, "utf8"),
    ]);
    const derived = buildHighWater(nextJournal);
    if (
      derived.high_water_id !== intent.after_high_water.high_water_id
    ) {
      fail("witness_live_read_replay_writer_recovery_after_mismatch");
    }
    atomicReplace(
      journalDirectory,
      JOURNAL_NAME,
      nextJournal,
      MAX_JOURNAL_BYTES,
      true,
      "witness_live_read_replay_writer_journal",
    );
    mutation = true;
  }
  if (highWaterIsBefore) {
    atomicReplace(
      highWaterDirectory,
      HIGH_WATER_NAME,
      highWaterBytes(intent.after_high_water),
      MAX_HIGH_WATER_BYTES,
      false,
      "witness_live_read_replay_writer_high_water",
    );
    mutation = true;
  }

  if (unlinkPinnedIfPresent(journalDirectory, INTENT_NAME)) mutation = true;
  if (unlinkPinnedIfPresent(highWaterDirectory, INTENT_NAME)) mutation = true;

  const coherent = coherentState(journalDirectory, highWaterDirectory);
  if (
    coherent.high_water.high_water_id !==
      intent.after_high_water.high_water_id
  ) {
    fail("witness_live_read_replay_writer_recovery_postcheck_failed");
  }
  return Object.freeze({
    recovered: true,
    mutation_performed: mutation,
    ...coherent,
  });
}

function withPinnedRoots<T>(
  journalRoot: string,
  highWaterRoot: string,
  operation: (
    journalDirectory: PinnedDirectoryV1,
    highWaterDirectory: PinnedDirectoryV1,
  ) => T,
): T {
  const journalDirectory = openPinnedDirectory(
    journalRoot,
    "witness_live_read_replay_writer_journal_root",
  );
  let highWaterDirectory: PinnedDirectoryV1 | null = null;
  try {
    highWaterDirectory = openPinnedDirectory(
      highWaterRoot,
      "witness_live_read_replay_writer_high_water_root",
    );
    assertDistinctRoots(journalDirectory, highWaterDirectory);
    const ordered = [journalDirectory, highWaterDirectory].sort((a, b) =>
      a.path.localeCompare(b.path),
    );
    return withBuyVoidFilesystemBakeryLockV1(
      path.join(ordered[0].proc_path, LOCK_NAME),
      () =>
        withBuyVoidFilesystemBakeryLockV1(
          path.join(ordered[1].proc_path, LOCK_NAME),
          () => {
            assertPinnedDirectoryVisible(
              journalDirectory,
              "witness_live_read_replay_writer_journal_root",
            );
            assertPinnedDirectoryVisible(
              highWaterDirectory!,
              "witness_live_read_replay_writer_high_water_root",
            );
            return operation(journalDirectory, highWaterDirectory!);
          },
        ),
    );
  } finally {
    if (highWaterDirectory) closePinned(highWaterDirectory);
    closePinned(journalDirectory);
  }
}

function success(
  status:
    | "inspected"
    | "recovered"
    | "persisted_issue"
    | "persisted_consumed"
    | "persisted_abandoned",
  highWater: HighWaterV1,
  operationPerformed: boolean,
  recoveryPerformed: boolean,
) {
  return Object.freeze({
    ok: true as const,
    status,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1,
    version: 1 as const,
    operation_performed: operationPerformed,
    recovery_performed: recoveryPerformed,
    generation: highWater.generation,
    sequence: highWater.sequence,
    event_count: highWater.event_count,
    pending: highWater.pending,
    pending_challenge_sha256: highWater.pending_challenge_sha256,
    tip_event_sha256: highWater.tip_event_sha256,
    journal_sha256: highWater.journal_sha256,
    journal_bytes: highWater.journal_bytes,
    high_water_id: highWater.high_water_id,
    durable_journal_publication_semantics: true as const,
    durable_high_water_publication_semantics: true as const,
    cross_root_rollback_detection_semantics: true as const,
    validated_packet_binding_proven: false as const,
    live_durable_storage_proven: false as const,
    rollback_resistance_proven: false as const,
    protected_high_water_custody_proven: false as const,
    external_transport_authenticated: false as const,
    external_witness_storage_proven: false as const,
    live_remote_read_performed: false as const,
    runtime_integration: false as const,
    independent_custody_proven: false as const,
    production_gate_ready: false as const,
    funds_movement: false as const,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_AUTHORITY_V1,
  });
}

export function buildBuyVoidAllocationCustodyWitnessLiveReadReplayGenesisHighWaterV1() {
  const journal = Buffer.alloc(0);
  const highWater = buildHighWater(journal);
  return Object.freeze({
    journal_bytes: Buffer.from(journal),
    high_water: highWater,
    high_water_bytes: highWaterBytes(highWater),
  });
}

export function inspectBuyVoidAllocationCustodyWitnessLiveReadReplayWriterV1(
  input: {
    journal_root: string;
    high_water_root: string;
  },
) {
  try {
    return withPinnedRoots(
      input.journal_root,
      input.high_water_root,
      (journalDirectory, highWaterDirectory) => {
        const recovered = recoveryLocked(
          journalDirectory,
          highWaterDirectory,
        );
        return success(
          recovered.recovered ? "recovered" : "inspected",
          recovered.high_water,
          recovered.mutation_performed,
          recovered.recovered,
        );
      },
    );
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "witness_live_read_replay_writer_inspection_failed",
    );
  }
}

function persistTransition(
  input:
    | {
        journal_root: string;
        high_water_root: string;
        kind: "issue";
        entropy_sha256: unknown;
        issued_at_ms: unknown;
        expires_at_ms: unknown;
      }
    | {
        journal_root: string;
        high_water_root: string;
        kind: "terminal";
        outcome: unknown;
        request_id?: unknown;
        response_sha256?: unknown;
        terminal_at_ms: unknown;
      },
  crashPhase: CrashPhaseV1 | null,
) {
  try {
    return withPinnedRoots(
      input.journal_root,
      input.high_water_root,
      (journalDirectory, highWaterDirectory) => {
        const recovered = recoveryLocked(
          journalDirectory,
          highWaterDirectory,
        );
        const before = recovered.high_water;
        const journalText = recovered.journal.toString("utf8");

        const planned =
          input.kind === "issue"
            ? planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1({
                journal_jsonl: journalText,
                entropy_sha256: input.entropy_sha256,
                issued_at_ms: input.issued_at_ms,
                expires_at_ms: input.expires_at_ms,
              })
            : planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1({
                journal_jsonl: journalText,
                outcome: input.outcome,
                request_id: input.request_id,
                response_sha256: input.response_sha256,
                terminal_at_ms: input.terminal_at_ms,
              });
        if (planned.ok !== true) {
          fail(
            "witness_live_read_replay_writer_plan_" +
              String(planned.reason || "invalid"),
          );
        }

        const nextJournal = Buffer.from(
          planned.next_journal_jsonl,
          "utf8",
        );
        const after = buildHighWater(nextJournal);
        const operation =
          input.kind === "issue"
            ? "issue"
            : input.outcome === "consumed"
              ? "consumed"
              : "abandoned";
        const intent = buildIntent(
          operation,
          before,
          after,
          planned.event_jsonl_line,
        );

        writeIntent(journalDirectory, intent);
        if (crashPhase === "after_journal_intent") {
          fail("witness_live_read_replay_writer_test_crash_after_journal_intent");
        }
        writeIntent(highWaterDirectory, intent);
        if (crashPhase === "after_intents") {
          fail("witness_live_read_replay_writer_test_crash_after_intents");
        }

        atomicReplace(
          journalDirectory,
          JOURNAL_NAME,
          nextJournal,
          MAX_JOURNAL_BYTES,
          true,
          "witness_live_read_replay_writer_journal",
        );
        if (crashPhase === "after_journal") {
          fail("witness_live_read_replay_writer_test_crash_after_journal");
        }

        atomicReplace(
          highWaterDirectory,
          HIGH_WATER_NAME,
          highWaterBytes(after),
          MAX_HIGH_WATER_BYTES,
          false,
          "witness_live_read_replay_writer_high_water",
        );
        if (crashPhase === "after_high_water") {
          fail("witness_live_read_replay_writer_test_crash_after_high_water");
        }

        unlinkPinnedIfPresent(journalDirectory, INTENT_NAME);
        unlinkPinnedIfPresent(highWaterDirectory, INTENT_NAME);

        const post = coherentState(
          journalDirectory,
          highWaterDirectory,
        );
        if (post.high_water.high_water_id !== after.high_water_id) {
          fail("witness_live_read_replay_writer_postcheck_failed");
        }

        return success(
          operation === "issue"
            ? "persisted_issue"
            : operation === "consumed"
              ? "persisted_consumed"
              : "persisted_abandoned",
          post.high_water,
          true,
          recovered.recovered,
        );
      },
    );
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "witness_live_read_replay_writer_transition_failed",
    );
  }
}

export function persistBuyVoidAllocationCustodyWitnessLiveReadReplayIssueV1(
  input: {
    journal_root: string;
    high_water_root: string;
    entropy_sha256: unknown;
    issued_at_ms: unknown;
    expires_at_ms: unknown;
  },
) {
  return persistTransition({ ...input, kind: "issue" }, null);
}

export function persistBuyVoidAllocationCustodyWitnessLiveReadReplayTerminalV1(
  input: {
    journal_root: string;
    high_water_root: string;
    outcome: unknown;
    request_id?: unknown;
    response_sha256?: unknown;
    terminal_at_ms: unknown;
  },
) {
  return persistTransition({ ...input, kind: "terminal" }, null);
}

export function testOnlyPersistBuyVoidAllocationCustodyWitnessLiveReadReplayIssueCrashV1(
  input: {
    journal_root: string;
    high_water_root: string;
    entropy_sha256: unknown;
    issued_at_ms: unknown;
    expires_at_ms: unknown;
  },
  crashPhase: CrashPhaseV1,
) {
  return persistTransition({ ...input, kind: "issue" }, crashPhase);
}