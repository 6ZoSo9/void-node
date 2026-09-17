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
  type Stats,
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

/**
 * The authority file (VOID_AL_DURABLE_SAFE_MODE_LOCK_FILE_V1) is a single
 * cross-process mutual-exclusion primitive. It serializes both durable
 * safe-mode latch transitions AND complete top-level SegStore mutation
 * operations under one O_EXCL create-only file. It carries no PID/liveness
 * semantics: a crash while it is held is indistinguishable, by design, from
 * a slow live holder, and is never auto-reclaimed on that basis.
 */
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
  root_generation_pinned_for_runtime_lifetime: true,
  // Scope: compliant same-UID processes only. This does not claim
  // resilience against a HOSTILE same-UID adversary racing the release
  // path's own lstat-then-unlink — see releaseAuthorityV1's doc comment and
  // HOLD_AL_DURABLE_SAFE_MODE_SAME_UID_NAMESPACE_TRUST_REQUIRED. The scope
  // is expressed below as DATA (cross_process_mutation_and_latch_serialized
  // _scope), not only as this comment.
  cross_process_mutation_and_latch_serialized: true,
  cross_process_mutation_and_latch_serialized_scope:
    "compliant_same_uid_processes_only_hostile_eviction_out_of_scope" as const,
  procfs_fd_indirection_required: true,
  pid_or_liveness_based_reclaim: false,
  authority_release_failure_reported: true,
  // A foreign generation already present AT THE PRE-UNLINK VALIDATION POINT
  // (release's own lstat) is rejected outright and never unlinked. This is
  // NOT a claim that the check+unlink pair is atomic against a hostile
  // same-UID racer — it is not; see releaseAuthorityV1's doc comment for
  // the precise window this does and does not cover.
  authority_release_rejects_foreign_generation_present_at_validation: true,
  authority_release_atomic_against_hostile_same_uid_racer: false,
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
const ZERO_SHA256 = "0".repeat(64);
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

const PROCFS_SELF_FD_DIR_V1 = "/proc/self/fd";
const AUTHORITY_ACQUIRE_MAX_ATTEMPTS_V1 = 6;
const AUTHORITY_ACQUIRE_BASE_DELAY_MS_V1 = 8;

/**
 * Capability token proving the caller is the one holding the unified
 * authority for `pinned` RIGHT NOW. Minted only inside `acquireAuthorityV1`
 * and handed to production callers exclusively through the callback
 * parameter of `withHeldAuthorityV1`. It is an opaque, unexported-value
 * `symbol`: no external code can construct one that matches a live entry in
 * `heldAuthorityV1` without possessing the exact reference this module
 * handed out, so `latchWithinHeldAuthorityV1` / `readVoidAlDurableSafeMode
 * StateWhileHeldV1` cannot be invoked while NOT actually holding the
 * authority, and `releaseAuthorityV1` cannot be driven at all from outside
 * this module. `acquireAuthorityV1`/`releaseAuthorityV1` themselves are
 * deliberately NOT exported for this reason.
 */
export type AuthorityTokenV1 = symbol;

type HeldAuthorityRecordV1 = {
  readonly token: AuthorityTokenV1;
  /** The exact authority-file generation this token was minted against —
   * see `releaseAuthorityV1`'s foreign-generation-replacement check. */
  readonly dev: number;
  readonly ino: number;
};

/**
 * Live authority holders, keyed by pinned root. Presence of an entry here
 * — not the mere existence of the on-disk authority file — is what
 * "holding the authority" means to this module's own API surface.
 */
const heldAuthorityV1 = new WeakMap<PinnedDurableRootV1, HeldAuthorityRecordV1>();

/**
 * Pinned-root objects actually minted by `pinDurableRootGenerationV1` and
 * not yet closed. Every exported function that accepts a
 * `PinnedDurableRootV1` checks membership here FIRST, before touching any
 * of its fields — this is what makes a hand-constructed object with a
 * "valid-looking" `dirFd` fail closed instead of being trusted, and what
 * makes use-after-close fail closed instead of silently operating on a
 * stale/reused fd number. Kept module-private: the only way in is actually
 * calling `pinDurableRootGenerationV1`, and the only way out is actually
 * calling `closePinnedDurableRootV1`.
 */
const genuinePinnedRootsV1 = new WeakSet<object>();

/**
 * Pinned roots for which a mutation/latch write ended in
 * AL_DURABLE_SAFE_MODE_PERSISTENCE_AMBIGUOUS. `withHeldAuthorityV1` adds a
 * pinned root here INSTEAD OF releasing its authority when that happens
 * (see its doc comment), and every later `acquireAuthorityV1` call against
 * the SAME in-process object refuses immediately — before touching the
 * filesystem at all — rather than retrying into ordinary BUSY or silently
 * reacquiring. This is local, in-process poisoning of one runtime's own
 * pinned-root handle; it is separate from (though consistent with) the
 * on-disk RECOVERY_REQUIRED signal a fresh admit-then-pin observes from the
 * still-present authority file.
 */
const poisonedPinnedRootsV1 = new WeakSet<PinnedDurableRootV1>();

function fail(code: string, message = code): never {
  throw new VoidAlDurableSafeModeLatchErrorV1(code, message);
}

function assertGenuinePinnedRootV1(pinned: PinnedDurableRootV1): void {
  if (!genuinePinnedRootsV1.has(pinned as unknown as object)) {
    fail("AL_DURABLE_SAFE_MODE_PINNED_ROOT_INVALID");
  }
}

/**
 * Whether `error` is, or was caused by (walking `.cause`, bounded), this
 * module's own AL_DURABLE_SAFE_MODE_PERSISTENCE_AMBIGUOUS. The bounded
 * `.cause` walk exists because a higher layer (the durable runtime) wraps
 * this module's raw errors into its own error type on some call paths
 * BEFORE they reach `withHeldAuthorityV1`'s retain-vs-release decision —
 * that wrap preserves the original error as `.cause` specifically so this
 * check still sees it. See void_alignment_layer_block_commit_durable_
 * runtime_v1.ts's wrapLatchFailureV1.
 */
function isAmbiguousPersistenceErrorV1(error: unknown, depthRemaining = 8): boolean {
  if (error instanceof VoidAlDurableSafeModeLatchErrorV1) {
    return error.code === "AL_DURABLE_SAFE_MODE_PERSISTENCE_AMBIGUOUS";
  }
  if (depthRemaining <= 0 || error === null || typeof error !== "object" || !("cause" in error)) {
    return false;
  }
  return isAmbiguousPersistenceErrorV1((error as { cause?: unknown }).cause, depthRemaining - 1);
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

// --- Root admission (pathname-based, bounded) --------------------------

export type DurableRootAdmissionV1 = {
  rootPath: string;
  admittedDev: number;
  admittedIno: number;
};

/**
 * Validates the configured root PATHNAME. This never opens or pins
 * anything by itself; it is the "check" half of check-then-pin, and is
 * also reused, standalone, as the live canary re-check performed before
 * every top-level mutation authority acquisition (see
 * void_alignment_layer_block_commit_durable_runtime_v1.ts).
 */
export function admitDurableRootPathnameV1(rootDirectory: string): DurableRootAdmissionV1 {
  const supplied = String(rootDirectory || "").trim();
  if (!supplied || !path.isAbsolute(supplied)) {
    fail("AL_DURABLE_SAFE_MODE_ROOT_NOT_ABSOLUTE");
  }
  const root = path.resolve(supplied);
  if (root === path.parse(root).root) fail("AL_DURABLE_SAFE_MODE_ROOT_IS_FILESYSTEM_ROOT");

  let stat: Stats;
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
  return { rootPath: root, admittedDev: stat.dev, admittedIno: stat.ino };
}

// --- Root generation pinning (fd-based, lifetime-retainable) -----------

export type PinnedDurableRootV1 = {
  readonly dirFd: number;
  readonly dev: number;
  readonly ino: number;
  readonly rootPath: string;
};

function verifyProcfsIndirectionV1(dirFd: number, dev: number, ino: number): void {
  const procfsPath = `${PROCFS_SELF_FD_DIR_V1}/${dirFd}`;
  let verifyFd: number;
  try {
    verifyFd = openSync(procfsPath, fsConstants.O_RDONLY | fsConstants.O_DIRECTORY);
  } catch (error) {
    fail("AL_DURABLE_SAFE_MODE_PROCFS_UNAVAILABLE", error instanceof Error ? error.message : String(error));
  }
  try {
    const verifyStat = fstatSync(verifyFd);
    if (verifyStat.dev !== dev || verifyStat.ino !== ino || !verifyStat.isDirectory()) {
      fail("AL_DURABLE_SAFE_MODE_PROCFS_UNAVAILABLE", "procfs fd indirection identity mismatch");
    }
  } finally {
    closeSync(verifyFd);
  }
}

/**
 * Opens and pins the directory generation admitted by
 * admitDurableRootPathnameV1, verifying (via a second fstat, immediately
 * after open) that what got opened is still the exact inode that was
 * admitted, and that procfs-fd path indirection actually resolves back to
 * that same inode. Every unsafe-path fallback is refused: if procfs
 * indirection cannot be verified, this fails closed rather than silently
 * resolving further operations by pathname.
 */
export function pinDurableRootGenerationV1(admission: DurableRootAdmissionV1): PinnedDurableRootV1 {
  let dirFd: number;
  try {
    dirFd = openSync(
      admission.rootPath,
      fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW,
    );
  } catch (error) {
    fail("AL_DURABLE_SAFE_MODE_ROOT_UNAVAILABLE", error instanceof Error ? error.message : String(error));
  }
  let stat: Stats;
  try {
    stat = fstatSync(dirFd);
  } catch (error) {
    closeSync(dirFd);
    fail("AL_DURABLE_SAFE_MODE_ROOT_UNAVAILABLE", error instanceof Error ? error.message : String(error));
  }
  if (
    !stat.isDirectory() ||
    stat.dev !== admission.admittedDev ||
    stat.ino !== admission.admittedIno
  ) {
    closeSync(dirFd);
    fail("AL_DURABLE_SAFE_MODE_ROOT_GENERATION_MISMATCH");
  }
  const mode = stat.mode & 0o777;
  if (
    (typeof process.getuid === "function" && stat.uid !== process.getuid()) ||
    (mode & 0o700) !== 0o700 ||
    (mode & 0o077) !== 0
  ) {
    closeSync(dirFd);
    fail("AL_DURABLE_SAFE_MODE_ROOT_GENERATION_MISMATCH");
  }
  try {
    verifyProcfsIndirectionV1(dirFd, stat.dev, stat.ino);
  } catch (error) {
    closeSync(dirFd);
    throw error;
  }
  // Frozen (immutable for the pin's lifetime — a caller cannot redirect an
  // already-authorized pin to a different root by mutating dirFd/rootPath
  // in place) AND branded into genuinePinnedRootsV1 (a hand-constructed
  // object with a merely structurally-matching shape is never trusted by
  // any exported function below, regardless of what values it carries).
  const pinned: PinnedDurableRootV1 = Object.freeze({
    dirFd,
    dev: stat.dev,
    ino: stat.ino,
    rootPath: admission.rootPath,
  });
  genuinePinnedRootsV1.add(pinned);
  return pinned;
}

export function closePinnedDurableRootV1(pinned: PinnedDurableRootV1): void {
  assertGenuinePinnedRootV1(pinned);
  genuinePinnedRootsV1.delete(pinned);
  try {
    closeSync(pinned.dirFd);
  } catch {
    // best-effort: nothing safety-relevant depends on close() succeeding.
  }
}

function pinnedPath(pinned: PinnedDurableRootV1, filename: string): string {
  return `${PROCFS_SELF_FD_DIR_V1}/${pinned.dirFd}/${filename}`;
}

function statePath(pinned: PinnedDurableRootV1): string {
  return pinnedPath(pinned, VOID_AL_DURABLE_SAFE_MODE_STATE_FILE_V1);
}

function lockPath(pinned: PinnedDurableRootV1): string {
  return pinnedPath(pinned, VOID_AL_DURABLE_SAFE_MODE_LOCK_FILE_V1);
}

function fsyncPinnedRootV1(pinned: PinnedDurableRootV1): void {
  fsyncSync(pinned.dirFd);
}

function assertPrivateRegularFile(stat: Stats, label: string): void {
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
      raw.first_evidence_sha256 === ZERO_SHA256 ||
      typeof raw.latest_evidence_sha256 !== "string" ||
      !HEX64_RE.test(raw.latest_evidence_sha256) ||
      raw.latest_evidence_sha256 === ZERO_SHA256
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

function readStateUnlocked(pinned: PinnedDurableRootV1): VoidAlDurableSafeModeStateV1 {
  const file = statePath(pinned);
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

// --- Unified authority (mutation + latch mutual exclusion) -------------

function busyWaitMsV1(ms: number): void {
  // Node's main thread cannot call Atomics.wait (Worker-only), and this
  // module must stay fully synchronous to match SegStore's existing
  // synchronous mutation API. This spin is bounded to a handful of short
  // retries (AUTHORITY_ACQUIRE_MAX_ATTEMPTS_V1) and only runs under actual
  // contention, not on every acquisition.
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    /* deliberate synchronous busy-wait */
  }
}

function tryCreateAuthorityFileV1(
  pinned: PinnedDurableRootV1,
  intent: "mutation" | "latch",
): { dev: number; ino: number } | null {
  let fd: number;
  try {
    fd = openSync(
      lockPath(pinned),
      fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW,
      0o600,
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "EEXIST") return null;
    fail("AL_DURABLE_SAFE_MODE_AUTHORITY_ACQUIRE_FAILED", error instanceof Error ? error.message : String(error));
  }
  let generation: { dev: number; ino: number };
  try {
    // Captured immediately after the create-only open succeeds, while `fd`
    // still refers to exactly the file we just created (not whatever may
    // later occupy the same name) — this is the generation identity that
    // releaseAuthorityV1 later re-verifies before it will unlink anything.
    const created = fstatSync(fd);
    generation = { dev: created.dev, ino: created.ino };
    const record = `${JSON.stringify({
      marker: VOID_AL_DURABLE_SAFE_MODE_LATCH_V1,
      version: 1,
      intent,
      pid: process.pid,
      nonce: randomBytes(16).toString("hex"),
    })}\n`;
    // Content is informational only (debugging aid); only the directory
    // entry's existence is safety-relevant, so only the directory is
    // fsync'd, not this file's own content.
    writeFileSync(fd, record, "utf8");
  } finally {
    closeSync(fd);
  }
  fsyncPinnedRootV1(pinned);
  return generation;
}

/**
 * Acquires the single cross-process authority. `boundedRetry: false` is
 * strict admission/bootstrap semantics: any pre-existing authority file is
 * immediately AL_DURABLE_SAFE_MODE_RECOVERY_REQUIRED, no retry — matching
 * "a surviving authority generation encountered during restart/recovery
 * remains fail-closed." `boundedRetry: true` is ordinary-operation
 * semantics for an already-installed runtime or a repeat watchdog call:
 * brief contention retries a small bounded number of times, and only on
 * exhaustion returns the distinct, non-claiming AL_DURABLE_SAFE_MODE_
 * AUTHORITY_BUSY terminal — it never asserts recovery/crash truth, because
 * this code cannot actually tell contention apart from a dead holder.
 */
function acquireAuthorityV1(
  pinned: PinnedDurableRootV1,
  opts: { boundedRetry: boolean; intent: "mutation" | "latch" },
): AuthorityTokenV1 {
  // A pinned root poisoned by a prior PERSISTENCE_AMBIGUOUS on THIS same
  // in-process object refuses immediately, before any filesystem access —
  // never ordinary BUSY, and never a fresh reacquisition attempt, however
  // the on-disk authority pathname happens to look right now.
  if (poisonedPinnedRootsV1.has(pinned)) {
    fail("AL_DURABLE_SAFE_MODE_RECOVERY_REQUIRED");
  }
  let attempt = 0;
  for (;;) {
    const generation = tryCreateAuthorityFileV1(pinned, opts.intent);
    if (generation) {
      const token: AuthorityTokenV1 = Symbol(VOID_AL_DURABLE_SAFE_MODE_LATCH_V1);
      heldAuthorityV1.set(pinned, { token, dev: generation.dev, ino: generation.ino });
      return token;
    }
    if (!opts.boundedRetry) {
      fail("AL_DURABLE_SAFE_MODE_RECOVERY_REQUIRED");
    }
    attempt += 1;
    if (attempt >= AUTHORITY_ACQUIRE_MAX_ATTEMPTS_V1) {
      fail("AL_DURABLE_SAFE_MODE_AUTHORITY_BUSY");
    }
    busyWaitMsV1(AUTHORITY_ACQUIRE_BASE_DELAY_MS_V1 + Math.floor(Math.random() * AUTHORITY_ACQUIRE_BASE_DELAY_MS_V1));
  }
}

/**
 * Releases the authority. Unlink/fsync failures are never swallowed and
 * never reported as a successful release — they always throw
 * AL_DURABLE_SAFE_MODE_AUTHORITY_RELEASE_FAILED (or a more specific
 * pre-unlink validation code), even when that means masking whatever
 * error the held critical section itself produced: an authority left in
 * an unknown state is treated as strictly more dangerous than losing a
 * friendlier error message.
 *
 * Not exported: reachable only from within this module (via
 * `withHeldAuthorityV1`), which always releases the exact token it minted,
 * so a caller can never drive a release against an authority generation it
 * did not itself acquire.
 *
 * Generation binding / trust boundary: before unlinking, this re-`lstat`s
 * the authority path and requires its dev/ino to still equal the exact
 * generation `token` was minted against (captured at create-time in
 * `tryCreateAuthorityFileV1`). A foreign generation already present AT THIS
 * PRE-UNLINK VALIDATION POINT — i.e. visible to this `lstat` — is rejected
 * outright: release fails closed with AL_DURABLE_SAFE_MODE_AUTHORITY_
 * GENERATION_REPLACED instead of unlinking whatever occupies the name, and
 * that already-present foreign file is never touched.
 *
 * This lstat-then-unlink pair is NOT atomic against a hostile SAME-UID
 * racer, and is not claimed to be: `unlinkSync` operates on the pathname,
 * not on the inode this function just verified, and Node's `fs` module
 * offers no `openat`-style directory-relative unlink that could bind the
 * unlink itself to the checked generation. A hostile same-UID process that
 * unlinks our authority file and installs a replacement strictly AFTER this
 * `lstat` succeeds but strictly BEFORE the subsequent `unlinkSync` executes
 * is NOT caught by this check — the unlink would then remove whatever
 * occupies the pathname at that later instant, which could be the
 * intruder's own replacement rather than our own generation. Plain POSIX
 * permissions grant any process running as the same UID unlink rights on
 * the file regardless of its own mode, so this specific race cannot be
 * closed by a plain-file mutual-exclusion primitive alone. What this module
 * guarantees is exactly, and only: a foreign generation observed AT
 * validation time is never accepted as a clean release of our own
 * generation and is never unlinked as a result of that check passing. A
 * foreign generation that lands strictly AFTER validation is outside this
 * guarantee entirely — see HOLD_AL_DURABLE_SAFE_MODE_SAME_UID_NAMESPACE_
 * TRUST_REQUIRED and VOID_AL_DURABLE_SAFE_MODE_AUTHORITY_V1's
 * `authority_release_atomic_against_hostile_same_uid_racer: false`.
 */
function releaseAuthorityV1(pinned: PinnedDurableRootV1, token: AuthorityTokenV1): void {
  const held = heldAuthorityV1.get(pinned);
  if (!held || held.token !== token) {
    fail("AL_DURABLE_SAFE_MODE_AUTHORITY_TOKEN_INVALID");
  }
  // The token is spent by this call regardless of outcome below: a release
  // attempt — successful or not — is never retried against the same token.
  heldAuthorityV1.delete(pinned);

  const file = lockPath(pinned);
  let stat: Stats;
  try {
    stat = lstatSync(file);
  } catch (error) {
    fail("AL_DURABLE_SAFE_MODE_AUTHORITY_RELEASE_FAILED", error instanceof Error ? error.message : String(error));
  }
  if (stat.isSymbolicLink() || !stat.isFile()) fail("AL_DURABLE_SAFE_MODE_LOCK_GENERATION_INVALID");
  if (typeof process.getuid === "function" && stat.uid !== process.getuid()) {
    fail("AL_DURABLE_SAFE_MODE_LOCK_WRONG_OWNER");
  }
  if ((stat.mode & 0o777) !== 0o600) fail("AL_DURABLE_SAFE_MODE_LOCK_MODE_INVALID");
  if (stat.dev !== held.dev || stat.ino !== held.ino) {
    fail("AL_DURABLE_SAFE_MODE_AUTHORITY_GENERATION_REPLACED");
  }
  try {
    unlinkSync(file);
  } catch (error) {
    fail("AL_DURABLE_SAFE_MODE_AUTHORITY_RELEASE_FAILED", error instanceof Error ? error.message : String(error));
  }
  try {
    fsyncPinnedRootV1(pinned);
  } catch (error) {
    fail("AL_DURABLE_SAFE_MODE_AUTHORITY_RELEASE_FAILED", error instanceof Error ? error.message : String(error));
  }
}

/**
 * Acquires the authority and runs `body` while it is held.
 *
 * On an ORDINARY return or throw, releases unconditionally afterward. A
 * release failure is never swallowed: it propagates and takes priority over
 * whatever `body` produced, since an authority left in an unknown state is
 * the more dangerous condition — and it also POISONS this pinned root (see
 * `poisonedPinnedRootsV1`), since a release that did not cleanly complete
 * (unlink succeeded but directory fsync failed, a token/generation check
 * failed, ...) means this in-process handle's view of "is the authority
 * actually free" is no longer trustworthy, however the pathname looks.
 *
 * On AL_DURABLE_SAFE_MODE_PERSISTENCE_AMBIGUOUS specifically (`body`
 * threw it, directly or as the root cause under `.cause` — see
 * `isAmbiguousPersistenceErrorV1`), this deliberately does NOT release:
 * the whole reason that code exists is that a durable-state write may or
 * may not have actually landed, and unlinking the authority file in that
 * situation would erase the exact crash/recovery witness a later strict
 * read needs to see. Instead: the in-process token is spent (never reused)
 * without touching the on-disk authority file, and this pinned root is
 * poisoned so no later operation on the SAME object can proceed as if
 * nothing happened — every later `acquireAuthorityV1` against it refuses
 * immediately, before executing any further body at all.
 *
 * This is the single serialization primitive shared by every top-level
 * mutation and every latch transition.
 */
export function withHeldAuthorityV1<T>(
  pinned: PinnedDurableRootV1,
  acquireOpts: { boundedRetry: boolean; intent: "mutation" | "latch" },
  body: (token: AuthorityTokenV1) => T,
): T {
  assertGenuinePinnedRootV1(pinned);
  const token = acquireAuthorityV1(pinned, acquireOpts);
  let bodyThrew = false;
  let bodyError: unknown;
  let result: T | undefined;
  try {
    result = body(token);
  } catch (error) {
    bodyThrew = true;
    bodyError = error;
  }

  if (bodyThrew && isAmbiguousPersistenceErrorV1(bodyError)) {
    heldAuthorityV1.delete(pinned);
    poisonedPinnedRootsV1.add(pinned);
    throw bodyError;
  }

  try {
    releaseAuthorityV1(pinned, token);
  } catch (releaseError) {
    poisonedPinnedRootsV1.add(pinned);
    throw releaseError;
  }
  if (bodyThrew) throw bodyError;
  return result as T;
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

function writeStateReplace(pinned: PinnedDurableRootV1, state: VoidAlDurableSafeModeStateV1): void {
  const file = statePath(pinned);
  const temporary = pinnedPath(
    pinned,
    `${VOID_AL_DURABLE_SAFE_MODE_STATE_FILE_V1}.tmp-${process.pid}-${randomBytes(8).toString("hex")}`,
  );
  const content = `${JSON.stringify(state, null, 2)}\n`;
  if (Buffer.byteLength(content, "utf8") > VOID_AL_DURABLE_SAFE_MODE_STATE_MAX_BYTES_V1) {
    fail("AL_DURABLE_SAFE_MODE_STATE_SIZE_INVALID");
  }
  writeDurableCreate(temporary, content);
  try {
    renameSync(temporary, file);
    fsyncPinnedRootV1(pinned);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

// --- Public entry points -------------------------------------------------

/**
 * Standalone, one-shot helper (admin/proof-script bootstrap). Uses a
 * bounded per-call admit+pin, not a lifetime-retained fd — appropriate for
 * a single invocation, not for an installed runtime.
 */
export function initializeVoidAlDurableSafeModeLatchV1(args: {
  root_directory: string;
  confirmation: string;
}): VoidAlDurableSafeModeStateV1 {
  if (args.confirmation !== VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1) {
    fail("AL_DURABLE_SAFE_MODE_INITIALIZATION_CONFIRMATION_REQUIRED");
  }
  const admission = admitDurableRootPathnameV1(args.root_directory);
  const pinned = pinDurableRootGenerationV1(admission);
  try {
    return withHeldAuthorityV1(pinned, { boundedRetry: false, intent: "latch" }, () => {
      if (existsSync(statePath(pinned))) {
        return readStateUnlocked(pinned);
      }
      let mutationAttempted = false;
      try {
        const state = initialState();
        mutationAttempted = true;
        writeDurableCreate(statePath(pinned), `${JSON.stringify(state, null, 2)}\n`);
        fsyncPinnedRootV1(pinned);
        return state;
      } catch (error) {
        if (error instanceof VoidAlDurableSafeModeLatchErrorV1) throw error;
        fail(
          mutationAttempted
            ? "AL_DURABLE_SAFE_MODE_PERSISTENCE_AMBIGUOUS"
            : "AL_DURABLE_SAFE_MODE_INITIALIZATION_FAILED",
          error instanceof Error ? error.message : String(error),
        );
      }
    });
  } finally {
    closePinnedDurableRootV1(pinned);
  }
}

/**
 * Standalone, one-shot read. Strict admission semantics (no retry): any
 * surviving authority file is immediately AL_DURABLE_SAFE_MODE_RECOVERY_
 * REQUIRED.
 */
export function readVoidAlDurableSafeModeLatchV1(
  rootDirectory: string,
): VoidAlDurableSafeModeStateV1 {
  const admission = admitDurableRootPathnameV1(rootDirectory);
  const pinned = pinDurableRootGenerationV1(admission);
  try {
    return readVoidAlDurableSafeModeLatchGivenPinnedRootV1(pinned);
  } finally {
    closePinnedDurableRootV1(pinned);
  }
}

/**
 * Same strict read, given an already-pinned root — used by the installed
 * durable runtime's initial (not-yet-holding-authority) read at install
 * time, which must never re-admit its root by pathname.
 */
export function readVoidAlDurableSafeModeLatchGivenPinnedRootV1(
  pinned: PinnedDurableRootV1,
): VoidAlDurableSafeModeStateV1 {
  assertGenuinePinnedRootV1(pinned);
  if (existsSync(lockPath(pinned))) fail("AL_DURABLE_SAFE_MODE_RECOVERY_REQUIRED");
  return readStateUnlocked(pinned);
}

/**
 * Reads state while the caller ALREADY holds the authority (the lock file
 * legitimately exists in this case, created by the caller's own acquire —
 * unlike readVoidAlDurableSafeModeLatchGivenPinnedRootV1, this must not
 * treat that as a surviving/foreign lock). `token` must be the exact token
 * `withHeldAuthorityV1` handed the caller for THIS `pinned` root; a caller
 * that does not actually hold the authority cannot produce a matching
 * token and this fails closed with AL_DURABLE_SAFE_MODE_AUTHORITY_TOKEN_
 * INVALID rather than silently reading as if it were safe to.
 */
export function readVoidAlDurableSafeModeStateWhileHeldV1(
  pinned: PinnedDurableRootV1,
  token: AuthorityTokenV1,
): VoidAlDurableSafeModeStateV1 {
  assertGenuinePinnedRootV1(pinned);
  const held = heldAuthorityV1.get(pinned);
  if (!held || held.token !== token) {
    fail("AL_DURABLE_SAFE_MODE_AUTHORITY_TOKEN_INVALID");
  }
  return readStateUnlocked(pinned);
}

/**
 * Lock-free, no-authority-required current-state snapshot read. Unlike
 * `readVoidAlDurableSafeModeStateWhileHeldV1`, this makes NO claim about
 * holding the authority and never checks for one — it is purely a
 * read-only truth-surface query (status/monitoring), safe to call at any
 * time, including while some other holder currently has the authority:
 * the state file is only ever replaced via create-temp + fsync + atomic
 * rename, so any read observes either the prior or the next complete,
 * self-fingerprinted state, never a torn write. This must NEVER be used to
 * gate a mutation admission decision — that always goes through the fresh
 * read taken while actually holding the authority
 * (readVoidAlDurableSafeModeStateWhileHeldV1), inside the same critical
 * section as the mutation itself.
 *
 * This DOES still fail closed in one specific case: a pinned root that
 * THIS process poisoned via a prior AL_DURABLE_SAFE_MODE_PERSISTENCE_
 * AMBIGUOUS on the same object (see `poisonedPinnedRootsV1`). Without that
 * check, a caller relying on this for a truth-surface status query could
 * read back a stale pre-incident state (the write that may or may not have
 * landed) and report it as current — exactly the kind of stale answer this
 * function otherwise exists to avoid. This is unrelated to, and does not
 * newly restrict, reading while some OTHER process legitimately holds the
 * authority — this check is scoped to this process's own poisoned handle,
 * not to the lock file's mere existence.
 */
export function readVoidAlDurableSafeModeStateSnapshotV1(
  pinned: PinnedDurableRootV1,
): VoidAlDurableSafeModeStateV1 {
  assertGenuinePinnedRootV1(pinned);
  if (poisonedPinnedRootsV1.has(pinned)) {
    fail("AL_DURABLE_SAFE_MODE_RECOVERY_REQUIRED");
  }
  return readStateUnlocked(pinned);
}

/**
 * The actual read-check-write latch logic, run WHILE the caller already
 * holds the authority (via withHeldAuthorityV1). Never acquires or
 * releases anything itself — callers compose it with withHeldAuthorityV1,
 * and must pass the exact token that call handed them; `token` is verified
 * against the live holder record for `pinned` before any read or write
 * happens, so this cannot be invoked by a caller that is not actually
 * holding the authority.
 */
export function latchWithinHeldAuthorityV1(
  pinned: PinnedDurableRootV1,
  token: AuthorityTokenV1,
  args: { reason_code: string; evidence_sha256: string },
): VoidAlDurableSafeModeStateV1 {
  assertGenuinePinnedRootV1(pinned);
  const held = heldAuthorityV1.get(pinned);
  if (!held || held.token !== token) {
    fail("AL_DURABLE_SAFE_MODE_AUTHORITY_TOKEN_INVALID");
  }
  if (!REASON_RE.test(String(args.reason_code || ""))) {
    fail("AL_DURABLE_SAFE_MODE_REASON_INVALID");
  }
  const evidenceSha = String(args.evidence_sha256 || "").toLowerCase();
  if (!HEX64_RE.test(evidenceSha) || evidenceSha === ZERO_SHA256) {
    fail("AL_DURABLE_SAFE_MODE_EVIDENCE_INVALID");
  }

  const current = readStateUnlocked(pinned);
  if (
    current.mode === "safe_mode" &&
    current.latest_reason_code === args.reason_code &&
    current.latest_evidence_sha256 === evidenceSha
  ) {
    return current;
  }

  const currentGeneration = BigInt(current.generation);
  if (currentGeneration + 1n >= UINT64_LIMIT) {
    fail("AL_DURABLE_SAFE_MODE_GENERATION_EXHAUSTED");
  }

  const firstReason = current.mode === "safe_mode" ? current.first_reason_code : args.reason_code;
  const firstEvidence = current.mode === "safe_mode" ? current.first_evidence_sha256 : evidenceSha;
  if (!firstReason || !firstEvidence) fail("AL_DURABLE_SAFE_MODE_INTERNAL_FIRST_INCIDENT_MISSING");

  let mutationAttempted = false;
  try {
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
    writeStateReplace(pinned, next);
    return next;
  } catch (error) {
    if (error instanceof VoidAlDurableSafeModeLatchErrorV1) throw error;
    fail(
      mutationAttempted
        ? "AL_DURABLE_SAFE_MODE_PERSISTENCE_AMBIGUOUS"
        : "AL_DURABLE_SAFE_MODE_LATCH_FAILED",
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * Standalone/watchdog latch entry point. Uses a bounded per-call admit+pin
 * and bounded-retry acquisition (ordinary-operation semantics), so a
 * watchdog can reliably latch even under brief contention with a live
 * writer, without itself needing to hold any writer-specific privilege —
 * any process with filesystem access to the root may call this.
 */
export function latchVoidAlDurableSafeModeV1(args: {
  root_directory: string;
  reason_code: string;
  evidence_sha256: string;
}): VoidAlDurableSafeModeStateV1 {
  const admission = admitDurableRootPathnameV1(args.root_directory);
  const pinned = pinDurableRootGenerationV1(admission);
  try {
    return withHeldAuthorityV1(pinned, { boundedRetry: true, intent: "latch" }, (token) =>
      latchWithinHeldAuthorityV1(pinned, token, args),
    );
  } finally {
    closePinnedDurableRootV1(pinned);
  }
}
