import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  withBuyVoidFilesystemBakeryLockV1,
} from "./buy_void_filesystem_bakery_lock_v1.js";
import {
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1,
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1,
} from "./buy_void_allocation_custody_witness_live_read_replay_state_v1.js";
import {
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1,
  deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1,
  type BuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1,
} from "./buy_void_allocation_custody_witness_live_read_replay_high_water_v1.js";

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
    canonical_replay_high_water_required: true,
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

const INTENT_SCHEMA =
  "void_buy_void_allocation_custody_witness_live_read_replay_publication_intent_v1";
const INTENT_MARKER =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_PUBLICATION_INTENT_V1";

const MAX_JOURNAL_BYTES = 8 * 1024 * 1024;
const MAX_HIGH_WATER_BYTES = 16 * 1024;
const MAX_INTENT_BYTES = 128 * 1024;
const O_NOFOLLOW = fs.constants.O_NOFOLLOW;
const O_DIRECTORY = fs.constants.O_DIRECTORY;
const INTENT_ID = /^voidwlri1_[0-9a-f]{64}$/u;

type PinnedDirectoryV1 = Readonly<{
  path: string;
  fd: number;
  stat: any;
  proc_path: string;
}>;

type CanonicalHighWaterV1 =
  BuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1;

type IntentV1 = Readonly<{
  schema: typeof INTENT_SCHEMA;
  marker: typeof INTENT_MARKER;
  version: 1;
  operation: "issue" | "consumed" | "abandoned";
  before_high_water_json: string;
  after_high_water_json: string;
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

function assertPinnedRootsVisible(
  journalDirectory: PinnedDirectoryV1,
  highWaterDirectory: PinnedDirectoryV1,
): void {
  assertPinnedDirectoryVisible(
    journalDirectory,
    "witness_live_read_replay_writer_journal_root",
  );
  assertPinnedDirectoryVisible(
    highWaterDirectory,
    "witness_live_read_replay_writer_high_water_root",
  );
  assertDistinctRoots(journalDirectory, highWaterDirectory);
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

function canonicalHighWaterString(
  value: unknown,
  code: string,
): string {
  if (typeof value !== "string") fail(code);
  const bytes = Buffer.from(value, "utf8");
  if (
    bytes.length < 2 ||
    bytes.length > MAX_HIGH_WATER_BYTES ||
    !value.endsWith("\n")
  ) {
    fail(code);
  }
  return value;
}

function deriveCanonicalHighWater(
  journal: Buffer,
): Readonly<{
  high_water: CanonicalHighWaterV1;
  high_water_json: string;
  high_water_bytes: Buffer;
  high_water_sha256: string;
}> {
  const decision =
    deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1(
      journal,
    );
  if (decision.ok !== true) {
    fail(
      "witness_live_read_replay_writer_high_water_" +
        String(decision.reason || "derive_failed"),
    );
  }
  const bytes = Buffer.from(decision.high_water_json, "utf8");
  if (
    bytes.length < 2 ||
    bytes.length > MAX_HIGH_WATER_BYTES
  ) {
    fail("witness_live_read_replay_writer_high_water_bytes_invalid");
  }
  return Object.freeze({
    high_water: decision.high_water,
    high_water_json: decision.high_water_json,
    high_water_bytes: bytes,
    high_water_sha256: decision.high_water_sha256,
  });
}

function bindCanonicalHighWater(
  journal: Buffer,
  highWaterBytes: Buffer,
): Readonly<{
  high_water: CanonicalHighWaterV1;
  high_water_json: string;
  high_water_bytes: Buffer;
  high_water_sha256: string;
}> {
  const decision =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1(
      {
        journal_jsonl: journal,
        high_water_json: highWaterBytes,
      },
    );
  if (decision.ok !== true) {
    fail(
      "witness_live_read_replay_writer_high_water_" +
        String(decision.reason || "binding_failed"),
    );
  }
  const canonical = Buffer.from(decision.high_water_json, "utf8");
  if (!canonical.equals(highWaterBytes)) {
    fail("witness_live_read_replay_writer_high_water_noncanonical");
  }
  return Object.freeze({
    high_water: decision.high_water,
    high_water_json: decision.high_water_json,
    high_water_bytes: canonical,
    high_water_sha256: decision.high_water_sha256,
  });
}

function highWaterBindingMatches(
  journal: Buffer,
  highWaterJson: string,
): boolean {
  const decision =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1(
      {
        journal_jsonl: journal,
        high_water_json: highWaterJson,
      },
    );
  return decision.ok === true;
}

function intentBody(value: Omit<IntentV1, "intent_id">) {
  return Object.freeze({
    schema: value.schema,
    marker: value.marker,
    version: value.version,
    operation: value.operation,
    before_high_water_json: value.before_high_water_json,
    after_high_water_json: value.after_high_water_json,
    event_jsonl_line: value.event_jsonl_line,
  });
}

function buildIntent(
  operation: "issue" | "consumed" | "abandoned",
  beforeHighWaterJson: string,
  afterHighWaterJson: string,
  eventLine: string,
): IntentV1 {
  const before = canonicalHighWaterString(
    beforeHighWaterJson,
    "witness_live_read_replay_writer_intent_before_high_water_invalid",
  );
  const after = canonicalHighWaterString(
    afterHighWaterJson,
    "witness_live_read_replay_writer_intent_after_high_water_invalid",
  );
  if (
    before === after ||
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
    before_high_water_json: before,
    after_high_water_json: after,
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
      "before_high_water_json",
      "after_high_water_json",
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
  const normalized = buildIntent(
    raw.operation,
    canonicalHighWaterString(
      raw.before_high_water_json,
      "witness_live_read_replay_writer_intent_before_high_water_invalid",
    ),
    canonicalHighWaterString(
      raw.after_high_water_json,
      "witness_live_read_replay_writer_intent_after_high_water_invalid",
    ),
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
  testOnlyAfterJournalRead: (() => void) | null = null,
) {
  const journal = readPinnedFile(
    journalDirectory,
    JOURNAL_NAME,
    MAX_JOURNAL_BYTES,
    true,
    "witness_live_read_replay_writer_journal",
  );
  if (testOnlyAfterJournalRead !== null) {
    testOnlyAfterJournalRead();
  }
  const highWaterBytes = readPinnedFile(
    highWaterDirectory,
    HIGH_WATER_NAME,
    MAX_HIGH_WATER_BYTES,
    false,
    "witness_live_read_replay_writer_high_water",
  );
  const highWater = bindCanonicalHighWater(
    journal,
    highWaterBytes,
  );
  assertPinnedRootsVisible(journalDirectory, highWaterDirectory);
  return Object.freeze({
    journal,
    high_water: highWater.high_water,
    high_water_json: highWater.high_water_json,
    high_water_bytes: highWater.high_water_bytes,
    high_water_sha256: highWater.high_water_sha256,
  });
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

function recoveryLocked(
  journalDirectory: PinnedDirectoryV1,
  highWaterDirectory: PinnedDirectoryV1,
  testOnlyFinalSnapshotHook: (() => void) | null = null,
) {
  const journalIntent = readOptionalIntent(journalDirectory);
  const highWaterIntent = readOptionalIntent(highWaterDirectory);
  if (!journalIntent && !highWaterIntent) {
    const coherent = coherentState(
      journalDirectory,
      highWaterDirectory,
      testOnlyFinalSnapshotHook,
    );
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
  const beforeHighWaterBytes = Buffer.from(
    intent.before_high_water_json,
    "utf8",
  );
  const afterHighWaterBytes = Buffer.from(
    intent.after_high_water_json,
    "utf8",
  );
  const journal = readPinnedFile(
    journalDirectory,
    JOURNAL_NAME,
    MAX_JOURNAL_BYTES,
    true,
    "witness_live_read_replay_writer_journal",
  );
  const observedHighWater = readPinnedFile(
    highWaterDirectory,
    HIGH_WATER_NAME,
    MAX_HIGH_WATER_BYTES,
    false,
    "witness_live_read_replay_writer_high_water",
  );

  const journalIsBefore = highWaterBindingMatches(
    journal,
    intent.before_high_water_json,
  );
  const journalIsAfter = highWaterBindingMatches(
    journal,
    intent.after_high_water_json,
  );
  const highWaterIsBefore =
    observedHighWater.equals(beforeHighWaterBytes);
  const highWaterIsAfter =
    observedHighWater.equals(afterHighWaterBytes);

  if (!journalIsBefore && !journalIsAfter) {
    fail("witness_live_read_replay_writer_recovery_journal_unknown");
  }
  if (!highWaterIsBefore && !highWaterIsAfter) {
    fail("witness_live_read_replay_writer_recovery_high_water_unknown");
  }
  const eventBytes = Buffer.from(intent.event_jsonl_line, "utf8");
  let beforeJournal: Buffer;
  let afterJournal: Buffer;
  if (journalIsBefore) {
    beforeJournal = journal;
    afterJournal = Buffer.concat([journal, eventBytes]);
  } else {
    if (
      journal.length < eventBytes.length ||
      !journal
        .subarray(journal.length - eventBytes.length)
        .equals(eventBytes)
    ) {
      fail("witness_live_read_replay_writer_recovery_append_mismatch");
    }
    beforeJournal = journal.subarray(
      0,
      journal.length - eventBytes.length,
    );
    afterJournal = journal;
  }

  if (
    !highWaterBindingMatches(
      beforeJournal,
      intent.before_high_water_json,
    ) ||
    !highWaterBindingMatches(
      afterJournal,
      intent.after_high_water_json,
    )
  ) {
    fail("witness_live_read_replay_writer_recovery_endpoint_mismatch");
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

  if (journalIsBefore) {
    atomicReplace(
      journalDirectory,
      JOURNAL_NAME,
      afterJournal,
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
      afterHighWaterBytes,
      MAX_HIGH_WATER_BYTES,
      false,
      "witness_live_read_replay_writer_high_water",
    );
    mutation = true;
  }

  if (unlinkPinnedIfPresent(journalDirectory, INTENT_NAME)) mutation = true;
  if (unlinkPinnedIfPresent(highWaterDirectory, INTENT_NAME)) mutation = true;

  const coherent = coherentState(
    journalDirectory,
    highWaterDirectory,
    testOnlyFinalSnapshotHook,
  );
  if (!coherent.high_water_bytes.equals(afterHighWaterBytes)) {
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
            assertPinnedRootsVisible(
              journalDirectory,
              highWaterDirectory!,
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
  highWater: CanonicalHighWaterV1,
  highWaterSha256: string,
  operationPerformed: boolean,
  recoveryPerformed: boolean,
  transitionChallengeSha256: string | null = null,
  transitionChallengeId: string | null = null,
  transitionIssuedAtMs: number | null = null,
  transitionExpiresAtMs: number | null = null,
  terminalRequestId: string | null = null,
  terminalResponseSha256: string | null = null,
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
    pending_challenge_id: highWater.pending_challenge_id,
    pending_expires_at_ms: highWater.pending_expires_at_ms,
    tip_event_sha256: highWater.tip_event_sha256,
    last_terminal_state: highWater.last_terminal_state,
    ready_for_issue: highWater.ready_for_issue,
    journal_sha256: highWater.journal_sha256,
    journal_bytes: highWater.journal_bytes,
    high_water_sha256: highWaterSha256,
    transition_challenge_sha256: transitionChallengeSha256,
    transition_challenge_id: transitionChallengeId,
    transition_issued_at_ms: transitionIssuedAtMs,
    transition_expires_at_ms: transitionExpiresAtMs,
    terminal_request_id: terminalRequestId,
    terminal_response_sha256: terminalResponseSha256,
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
  const highWater = deriveCanonicalHighWater(journal);
  return Object.freeze({
    journal_bytes: Buffer.from(journal),
    high_water: highWater.high_water,
    high_water_bytes: highWater.high_water_bytes,
    high_water_sha256: highWater.high_water_sha256,
  });
}

export function testOnlyInspectBuyVoidAllocationCustodyWitnessLiveReadReplayWriterSnapshotV1(
  input: {
    journal_root: string;
    high_water_root: string;
  },
  testOnlyAfterJournalRead: () => void,
) {
  try {
    if (typeof testOnlyAfterJournalRead !== "function") {
      fail("witness_live_read_replay_writer_test_hook_required");
    }
    return withPinnedRoots(
      input.journal_root,
      input.high_water_root,
      (journalDirectory, highWaterDirectory) => {
        const recovered = recoveryLocked(
          journalDirectory,
          highWaterDirectory,
          testOnlyAfterJournalRead,
        );
        return success(
          recovered.recovered ? "recovered" : "inspected",
          recovered.high_water,
          recovered.high_water_sha256,
          recovered.mutation_performed,
          recovered.recovered,
        );
      },
    );
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "witness_live_read_replay_writer_test_inspection_failed",
    );
  }
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
          recovered.high_water_sha256,
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
  testOnlyFinalSnapshotHook: (() => void) | null = null,
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
        const beforeHighWaterJson = recovered.high_water_json;
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
        const after = deriveCanonicalHighWater(nextJournal);
        const operation =
          input.kind === "issue"
            ? "issue"
            : input.outcome === "consumed"
              ? "consumed"
              : "abandoned";
        const intent = buildIntent(
          operation,
          beforeHighWaterJson,
          after.high_water_json,
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
          after.high_water_bytes,
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
          testOnlyFinalSnapshotHook,
        );
        if (post.high_water_sha256 !== after.high_water_sha256) {
          fail("witness_live_read_replay_writer_postcheck_failed");
        }

        return success(
          operation === "issue"
            ? "persisted_issue"
            : operation === "consumed"
              ? "persisted_consumed"
              : "persisted_abandoned",
          post.high_water,
          post.high_water_sha256,
          true,
          recovered.recovered,
          String(planned.event.challenge_sha256),
          String(planned.event.challenge_id),
          Number(planned.event.issued_at_ms),
          Number(planned.event.expires_at_ms),
          operation === "consumed"
            ? String(planned.event.request_id)
            : null,
          operation === "consumed"
            ? String(planned.event.response_sha256)
            : null,
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

export function testOnlyPersistBuyVoidAllocationCustodyWitnessLiveReadReplayIssueFinalSnapshotV1(
  input: {
    journal_root: string;
    high_water_root: string;
    entropy_sha256: unknown;
    issued_at_ms: unknown;
    expires_at_ms: unknown;
  },
  testOnlyAfterJournalRead: () => void,
) {
  if (typeof testOnlyAfterJournalRead !== "function") {
    return held("witness_live_read_replay_writer_test_hook_required");
  }
  return persistTransition(
    { ...input, kind: "issue" },
    null,
    testOnlyAfterJournalRead,
  );
}