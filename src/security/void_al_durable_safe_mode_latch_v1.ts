import { createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  existsSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

export const VOID_AL_DURABLE_SAFE_MODE_LATCH_V1 =
  "VOID_AL_DURABLE_SAFE_MODE_LATCH_V1" as const;
export const VOID_AL_DURABLE_SAFE_MODE_STATE_SCHEMA_V1 =
  "void_al_durable_safe_mode_state_v1" as const;
export const VOID_AL_DURABLE_SAFE_MODE_STATE_FILE_V1 =
  "void-al-durable-safe-mode-v1.json" as const;
export const VOID_AL_DURABLE_SAFE_MODE_LOCK_FILE_V1 =
  ".void-al-durable-safe-mode-v1.lock" as const;
export const VOID_AL_DURABLE_SAFE_MODE_ROOT_ENV_V1 =
  "VOID_AL_DURABLE_SAFE_MODE_ROOT_V1" as const;
export const VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1 =
  "initializeVoidAlDurableSafeModeLatchV1" as const;
export const VOID_AL_DURABLE_SAFE_MODE_STATE_MAX_BYTES_V1 = 64 * 1024;
export const VOID_AL_DURABLE_SAFE_MODE_CHAIN_ID_V1 = 2050 as const;
export const VOID_AL_DURABLE_SAFE_MODE_VERSION_V1 = 1 as const;

export const VOID_AL_DURABLE_SAFE_MODE_AUTHORITY_V1 = Object.freeze({
  filesystem_read: true,
  filesystem_write_when_called: true,
  explicit_private_root_required: true,
  create_only_initialization: true,
  atomic_replace_after_lock: true,
  file_fsync: true,
  directory_fsync: true,
  crash_lock_fail_closed: true,
  automatic_resume_allowed: false,
  resume_api_implemented: false,
  sovereign_key_access: false,
  environment_read: false,
  network_call: false,
  wallet_access: false,
  transaction_signing: false,
  chain2050_live_mutation: false,
  money_movement: false,
});

export type VoidAlDurableSafeModeModeV1 = "running" | "safe_mode";

export type VoidAlDurableSafeModeStateV1 = {
  schema: typeof VOID_AL_DURABLE_SAFE_MODE_STATE_SCHEMA_V1;
  marker: typeof VOID_AL_DURABLE_SAFE_MODE_LATCH_V1;
  version: typeof VOID_AL_DURABLE_SAFE_MODE_VERSION_V1;
  chain_id: typeof VOID_AL_DURABLE_SAFE_MODE_CHAIN_ID_V1;
  generation: string;
  mode: VoidAlDurableSafeModeModeV1;
  first_reason_code: string | null;
  first_evidence_sha256: string | null;
  latest_reason_code: string | null;
  latest_evidence_sha256: string | null;
  state_fingerprint_sha256: string;
};

export class VoidAlDurableSafeModeLatchErrorV1 extends Error {
  readonly marker = VOID_AL_DURABLE_SAFE_MODE_LATCH_V1;
  readonly version = VOID_AL_DURABLE_SAFE_MODE_VERSION_V1;

  constructor(readonly code: string, message = code) {
    super(`${code}: ${message}`);
    this.name = "VoidAlDurableSafeModeLatchErrorV1";
  }
}

const HEX64_RE = /^[0-9a-f]{64}$/;
const REASON_RE = /^[A-Za-z0-9._:-]{1,200}$/;
const UINT64_LIMIT = 1n << 64n;
const STATE_KEYS = Object.freeze([
  "schema",
  "marker",
  "version",
  "chain_id",
  "generation",
  "mode",
  "first_reason_code",
  "first_evidence_sha256",
  "latest_reason_code",
  "latest_evidence_sha256",
  "state_fingerprint_sha256",
]);

function fail(code: string, message = code): never {
  throw new VoidAlDurableSafeModeLatchErrorV1(code, message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function isCanonicalUint64(value: unknown): value is string {
  if (typeof value !== "string" || !/^(?:0|[1-9][0-9]*)$/.test(value)) return false;
  try {
    return BigInt(value) < UINT64_LIMIT;
  } catch {
    return false;
  }
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function fingerprintMaterial(
  state: Omit<VoidAlDurableSafeModeStateV1, "state_fingerprint_sha256">,
): string {
  return JSON.stringify([
    state.schema,
    state.marker,
    state.version,
    state.chain_id,
    state.generation,
    state.mode,
    state.first_reason_code,
    state.first_evidence_sha256,
    state.latest_reason_code,
    state.latest_evidence_sha256,
  ]);
}

function withFingerprint(
  state: Omit<VoidAlDurableSafeModeStateV1, "state_fingerprint_sha256">,
): VoidAlDurableSafeModeStateV1 {
  return {
    ...state,
    state_fingerprint_sha256: sha256(fingerprintMaterial(state)),
  };
}

function initialState(): VoidAlDurableSafeModeStateV1 {
  return withFingerprint({
    schema: VOID_AL_DURABLE_SAFE_MODE_STATE_SCHEMA_V1,
    marker: VOID_AL_DURABLE_SAFE_MODE_LATCH_V1,
    version: VOID_AL_DURABLE_SAFE_MODE_VERSION_V1,
    chain_id: VOID_AL_DURABLE_SAFE_MODE_CHAIN_ID_V1,
    generation: "0",
    mode: "running",
    first_reason_code: null,
    first_evidence_sha256: null,
    latest_reason_code: null,
    latest_evidence_sha256: null,
  });
}

function normalizeRoot(rootDirectory: string): string {
  const supplied = String(rootDirectory || "").trim();
  if (!supplied || !path.isAbsolute(supplied)) {
    fail("AL_DURABLE_SAFE_MODE_ROOT_NOT_ABSOLUTE");
  }
  const root = path.resolve(supplied);
  if (root === path.parse(root).root) fail("AL_DURABLE_SAFE_MODE_ROOT_IS_FILESYSTEM_ROOT");

  let stat;
  try {
    stat = lstatSync(root);
  } catch (error) {
    fail("AL_DURABLE_SAFE_MODE_ROOT_UNAVAILABLE", error instanceof Error ? error.message : String(error));
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    fail("AL_DURABLE_SAFE_MODE_ROOT_NOT_REAL_DIRECTORY");
  }
  if (typeof process.getuid === "function" && stat.uid !== process.getuid()) {
    fail("AL_DURABLE_SAFE_MODE_ROOT_WRONG_OWNER");
  }
  const mode = stat.mode & 0o777;
  if ((mode & 0o700) !== 0o700 || (mode & 0o077) !== 0) {
    fail("AL_DURABLE_SAFE_MODE_ROOT_NOT_PRIVATE");
  }
  return root;
}

function statePath(root: string): string {
  return path.join(root, VOID_AL_DURABLE_SAFE_MODE_STATE_FILE_V1);
}

function lockPath(root: string): string {
  return path.join(root, VOID_AL_DURABLE_SAFE_MODE_LOCK_FILE_V1);
}

function fsyncDirectory(root: string): void {
  const fd = openSync(root, fsConstants.O_RDONLY | fsConstants.O_DIRECTORY);
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

function assertPrivateRegularFile(stat: ReturnType<typeof fstatSync>, label: string): void {
  if (!stat.isFile()) fail(`${label}_NOT_REGULAR`);
  if (stat.nlink !== 1) fail(`${label}_LINK_COUNT_INVALID`);
  if (typeof process.getuid === "function" && stat.uid !== process.getuid()) {
    fail(`${label}_WRONG_OWNER`);
  }
  if ((stat.mode & 0o777) !== 0o600) fail(`${label}_MODE_INVALID`);
}

function validateState(raw: unknown): VoidAlDurableSafeModeStateV1 {
  if (!isRecord(raw) || !hasExactKeys(raw, STATE_KEYS)) {
    fail("AL_DURABLE_SAFE_MODE_STATE_SCHEMA_INVALID");
  }
  if (
    raw.schema !== VOID_AL_DURABLE_SAFE_MODE_STATE_SCHEMA_V1 ||
    raw.marker !== VOID_AL_DURABLE_SAFE_MODE_LATCH_V1 ||
    raw.version !== VOID_AL_DURABLE_SAFE_MODE_VERSION_V1 ||
    raw.chain_id !== VOID_AL_DURABLE_SAFE_MODE_CHAIN_ID_V1 ||
    !isCanonicalUint64(raw.generation) ||
    (raw.mode !== "running" && raw.mode !== "safe_mode") ||
    !HEX64_RE.test(String(raw.state_fingerprint_sha256 || ""))
  ) {
    fail("AL_DURABLE_SAFE_MODE_STATE_IDENTITY_INVALID");
  }

  if (raw.mode === "running") {
    if (
      raw.generation !== "0" ||
      raw.first_reason_code !== null ||
      raw.first_evidence_sha256 !== null ||
      raw.latest_reason_code !== null ||
      raw.latest_evidence_sha256 !== null
    ) {
      fail("AL_DURABLE_SAFE_MODE_RUNNING_STATE_INVALID");
    }
  } else {
    if (
      BigInt(raw.generation as string) < 1n ||
      typeof raw.first_reason_code !== "string" ||
      !REASON_RE.test(raw.first_reason_code) ||
      typeof raw.latest_reason_code !== "string" ||
      !REASON_RE.test(raw.latest_reason_code) ||
      typeof raw.first_evidence_sha256 !== "string" ||
      !HEX64_RE.test(raw.first_evidence_sha256) ||
      typeof raw.latest_evidence_sha256 !== "string" ||
      !HEX64_RE.test(raw.latest_evidence_sha256)
    ) {
      fail("AL_DURABLE_SAFE_MODE_LATCHED_STATE_INVALID");
    }
  }

  const normalized = raw as unknown as VoidAlDurableSafeModeStateV1;
  const expected = withFingerprint({
    schema: normalized.schema,
    marker: normalized.marker,
    version: normalized.version,
    chain_id: normalized.chain_id,
    generation: normalized.generation,
    mode: normalized.mode,
    first_reason_code: normalized.first_reason_code,
    first_evidence_sha256: normalized.first_evidence_sha256,
    latest_reason_code: normalized.latest_reason_code,
    latest_evidence_sha256: normalized.latest_evidence_sha256,
  });
  if (expected.state_fingerprint_sha256 !== normalized.state_fingerprint_sha256) {
    fail("AL_DURABLE_SAFE_MODE_STATE_FINGERPRINT_MISMATCH");
  }
  return normalized;
}

function readStateUnlocked(root: string): VoidAlDurableSafeModeStateV1 {
  const file = statePath(root);
  if (!existsSync(file)) fail("AL_DURABLE_SAFE_MODE_STATE_NOT_INITIALIZED");

  let fd: number;
  try {
    fd = openSync(file, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  } catch (error) {
    fail("AL_DURABLE_SAFE_MODE_STATE_OPEN_FAILED", error instanceof Error ? error.message : String(error));
  }
  try {
    const before = fstatSync(fd);
    assertPrivateRegularFile(before, "AL_DURABLE_SAFE_MODE_STATE_FILE");
    if (before.size <= 0 || before.size > VOID_AL_DURABLE_SAFE_MODE_STATE_MAX_BYTES_V1) {
      fail("AL_DURABLE_SAFE_MODE_STATE_SIZE_INVALID");
    }
    const text = readFileSync(fd, "utf8");
    if (Buffer.byteLength(text, "utf8") !== before.size) {
      fail("AL_DURABLE_SAFE_MODE_STATE_SHORT_READ");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      fail("AL_DURABLE_SAFE_MODE_STATE_JSON_INVALID");
    }
    const normalized = validateState(parsed);

    const pathStat = lstatSync(file);
    if (
      pathStat.isSymbolicLink() ||
      !pathStat.isFile() ||
      pathStat.dev !== before.dev ||
      pathStat.ino !== before.ino
    ) {
      fail("AL_DURABLE_SAFE_MODE_STATE_GENERATION_CHANGED");
    }
    return normalized;
  } finally {
    closeSync(fd);
  }
}

function acquireLock(root: string): void {
  const file = lockPath(root);
  let fd: number;
  try {
    fd = openSync(
      file,
      fsConstants.O_CREAT |
        fsConstants.O_EXCL |
        fsConstants.O_WRONLY |
        fsConstants.O_NOFOLLOW,
      0o600,
    );
  } catch (error) {
    fail("AL_DURABLE_SAFE_MODE_RECOVERY_REQUIRED", error instanceof Error ? error.message : String(error));
  }
  try {
    const record = `${JSON.stringify({
      marker: VOID_AL_DURABLE_SAFE_MODE_LATCH_V1,
      version: 1,
      pid: process.pid,
      nonce: randomBytes(16).toString("hex"),
    })}\n`;
    writeFileSync(fd, record, "utf8");
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  fsyncDirectory(root);
}

function releaseLock(root: string): void {
  const file = lockPath(root);
  const stat = lstatSync(file);
  if (stat.isSymbolicLink() || !stat.isFile()) fail("AL_DURABLE_SAFE_MODE_LOCK_GENERATION_INVALID");
  if (typeof process.getuid === "function" && stat.uid !== process.getuid()) {
    fail("AL_DURABLE_SAFE_MODE_LOCK_WRONG_OWNER");
  }
  if ((stat.mode & 0o777) !== 0o600) fail("AL_DURABLE_SAFE_MODE_LOCK_MODE_INVALID");
  unlinkSync(file);
  fsyncDirectory(root);
}

function writeDurableCreate(file: string, content: string): void {
  const fd = openSync(
    file,
    fsConstants.O_CREAT |
      fsConstants.O_EXCL |
      fsConstants.O_WRONLY |
      fsConstants.O_NOFOLLOW,
    0o600,
  );
  try {
    writeFileSync(fd, content, "utf8");
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

function writeStateReplace(root: string, state: VoidAlDurableSafeModeStateV1): void {
  const file = statePath(root);
  const temporary = path.join(
    root,
    `${VOID_AL_DURABLE_SAFE_MODE_STATE_FILE_V1}.tmp-${process.pid}-${randomBytes(8).toString("hex")}`,
  );
  const content = `${JSON.stringify(state, null, 2)}\n`;
  if (Buffer.byteLength(content, "utf8") > VOID_AL_DURABLE_SAFE_MODE_STATE_MAX_BYTES_V1) {
    fail("AL_DURABLE_SAFE_MODE_STATE_SIZE_INVALID");
  }
  writeDurableCreate(temporary, content);
  try {
    renameSync(temporary, file);
    fsyncDirectory(root);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

export function initializeVoidAlDurableSafeModeLatchV1(args: {
  root_directory: string;
  confirmation: string;
}): VoidAlDurableSafeModeStateV1 {
  if (args.confirmation !== VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1) {
    fail("AL_DURABLE_SAFE_MODE_INITIALIZATION_CONFIRMATION_REQUIRED");
  }
  const root = normalizeRoot(args.root_directory);
  acquireLock(root);
  let mutationAttempted = false;
  try {
    if (existsSync(statePath(root))) {
      const existing = readStateUnlocked(root);
      releaseLock(root);
      return existing;
    }
    const state = initialState();
    const content = `${JSON.stringify(state, null, 2)}\n`;
    mutationAttempted = true;
    writeDurableCreate(statePath(root), content);
    fsyncDirectory(root);
    releaseLock(root);
    return state;
  } catch (error) {
    if (!mutationAttempted && existsSync(lockPath(root))) {
      try {
        releaseLock(root);
      } catch {
        // Keep the lock if its own release is not provably durable.
      }
    }
    if (error instanceof VoidAlDurableSafeModeLatchErrorV1) throw error;
    fail(
      mutationAttempted
        ? "AL_DURABLE_SAFE_MODE_PERSISTENCE_AMBIGUOUS"
        : "AL_DURABLE_SAFE_MODE_INITIALIZATION_FAILED",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export function readVoidAlDurableSafeModeLatchV1(
  rootDirectory: string,
): VoidAlDurableSafeModeStateV1 {
  const root = normalizeRoot(rootDirectory);
  if (existsSync(lockPath(root))) fail("AL_DURABLE_SAFE_MODE_RECOVERY_REQUIRED");
  return readStateUnlocked(root);
}

export function latchVoidAlDurableSafeModeV1(args: {
  root_directory: string;
  reason_code: string;
  evidence_sha256: string;
}): VoidAlDurableSafeModeStateV1 {
  if (!REASON_RE.test(String(args.reason_code || ""))) {
    fail("AL_DURABLE_SAFE_MODE_REASON_INVALID");
  }
  const evidenceSha = String(args.evidence_sha256 || "").toLowerCase();
  if (!HEX64_RE.test(evidenceSha)) fail("AL_DURABLE_SAFE_MODE_EVIDENCE_INVALID");

  const root = normalizeRoot(args.root_directory);
  acquireLock(root);
  let mutationAttempted = false;
  try {
    const current = readStateUnlocked(root);
    if (
      current.mode === "safe_mode" &&
      current.latest_reason_code === args.reason_code &&
      current.latest_evidence_sha256 === evidenceSha
    ) {
      releaseLock(root);
      return current;
    }

    const currentGeneration = BigInt(current.generation);
    if (currentGeneration + 1n >= UINT64_LIMIT) {
      releaseLock(root);
      fail("AL_DURABLE_SAFE_MODE_GENERATION_EXHAUSTED");
    }

    const firstReason =
      current.mode === "safe_mode" ? current.first_reason_code : args.reason_code;
    const firstEvidence =
      current.mode === "safe_mode" ? current.first_evidence_sha256 : evidenceSha;
    if (!firstReason || !firstEvidence) fail("AL_DURABLE_SAFE_MODE_INTERNAL_FIRST_INCIDENT_MISSING");

    const next = withFingerprint({
      schema: VOID_AL_DURABLE_SAFE_MODE_STATE_SCHEMA_V1,
      marker: VOID_AL_DURABLE_SAFE_MODE_LATCH_V1,
      version: VOID_AL_DURABLE_SAFE_MODE_VERSION_V1,
      chain_id: VOID_AL_DURABLE_SAFE_MODE_CHAIN_ID_V1,
      generation: (currentGeneration + 1n).toString(),
      mode: "safe_mode",
      first_reason_code: firstReason,
      first_evidence_sha256: firstEvidence,
      latest_reason_code: args.reason_code,
      latest_evidence_sha256: evidenceSha,
    });

    mutationAttempted = true;
    writeStateReplace(root, next);
    releaseLock(root);
    return next;
  } catch (error) {
    if (!mutationAttempted && existsSync(lockPath(root))) {
      try {
        releaseLock(root);
      } catch {
        // Keep the lock if its own release is not provably durable.
      }
    }
    if (error instanceof VoidAlDurableSafeModeLatchErrorV1) throw error;
    fail(
      mutationAttempted
        ? "AL_DURABLE_SAFE_MODE_PERSISTENCE_AMBIGUOUS"
        : "AL_DURABLE_SAFE_MODE_LATCH_FAILED",
      error instanceof Error ? error.message : String(error),
    );
  }
}
