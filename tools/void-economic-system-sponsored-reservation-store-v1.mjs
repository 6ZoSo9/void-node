import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_V1,
  VOID_ECONOMIC_SYSTEM_SPONSORSHIP_SCHEMA_V1,
  classifyEconomicSystemSponsoredAdmissionV1,
  economicSystemSponsorshipIdV1,
  verifyEconomicSystemSponsoredStateV1,
} from "./void-economic-system-sponsored-anti-grief-policy-v1.mjs";
import {
  VOID_ECONOMIC_INTENT_RESERVATION_SCHEMA_V1,
  economicIntentReservationIdV1,
} from "./void-economic-intent-ttl-caps-policy-v1.mjs";
import {
  verifyVoidEconomicEpoch2SignedSubmissionIntentV1,
} from "./void-economic-epoch2-signed-submission-intent-v1.mjs";

export const VOID_ECONOMIC_SYSTEM_SPONSORED_RESERVATION_STORE_V1 =
  "VOID_ECONOMIC_SYSTEM_SPONSORED_RESERVATION_STORE_V1";

export const VOID_ECONOMIC_SYSTEM_SPONSORED_RESERVATION_STORE_AUTHORITY_V1 =
  Object.freeze({
    source_only_store: true,
    canonical_anti_grief_classifier_reused: true,
    canonical_historical_state_verifier_reused: true,
    canonical_ttl_intent_identity_reused: true,
    canonical_sponsorship_identity_reused: true,
    duplicate_signed_submission_identity_required: true,
    compound_intent_sponsorship_record: true,
    append_only_history: true,
    expired_history_retained: true,
    serialized_admission: true,
    filesystem_read: true,
    filesystem_write: true,
    descriptor_bound_reads: true,
    create_once_publication: true,
    storage_bootstrap: false,
    caller_selected_record_path: false,
    policy_observation_time_explicit: true,
    policy_wall_clock_read: false,
    lock_housekeeping_wall_clock_read: true,
    trusted_observation_time_proven: false,
    monotonic_observation_time_proven: false,
    root_path_stability_proven: false,
    runtime_route_mount: false,
    runtime_enforcement_verified: false,
    gas_sponsorship_performed: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    inventory_funding: false,
    liquidity_movement: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const RECORD_SCHEMA =
  "void.economic-system-sponsored-reservation-store-record.v1";
const RECORDS_DIRECTORY = "records";
const LOCK_NAME = "sponsorship-admission-v1";
const MAX_RECORD_BYTES = 512 * 1024;
const MAX_RECORDS = 1_000_000;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const RECORD_NAME = /^[0-9a-f]{64}\.json$/u;
const O_NOFOLLOW = fs.constants.O_NOFOLLOW;
const O_DIRECTORY = fs.constants.O_DIRECTORY;

function fail(code) {
  throw new Error(code);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalJson(value) {
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
    const keys = Object.keys(value).sort(compareText);
    return (
      "{" +
      keys
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  fail("SPONSORED_RESERVATION_STORE_CANONICAL_VALUE_INVALID");
}

function directObject(value, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(code);
  return value;
}

function exactKeys(value, expected, code) {
  const actual = Object.keys(value).sort(compareText);
  const wanted = [...expected].sort(compareText);
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    fail(code);
  }
}

function requireDescriptorSafety() {
  if (
    typeof O_NOFOLLOW !== "number" ||
    typeof O_DIRECTORY !== "number" ||
    !fs.existsSync("/proc/self/fd")
  ) {
    fail("SPONSORED_RESERVATION_STORE_DESCRIPTOR_SAFETY_UNAVAILABLE");
  }
}

function sameDirectoryIdentity(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode
  );
}

function sameFileIdentity(left, right) {
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

function currentUid() {
  if (typeof process.getuid !== "function") {
    fail("SPONSORED_RESERVATION_STORE_UID_UNAVAILABLE");
  }
  return BigInt(process.getuid());
}

function validateAncestor(stat) {
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fail("SPONSORED_RESERVATION_STORE_ANCESTOR_INVALID");
  }
  const uid = currentUid();
  if (stat.uid !== 0n && stat.uid !== uid) {
    fail("SPONSORED_RESERVATION_STORE_ANCESTOR_OWNER_INVALID");
  }
  const writable = (stat.mode & 0o022n) !== 0n;
  const sticky = (stat.mode & 0o1000n) !== 0n;
  if (writable && !sticky) {
    fail("SPONSORED_RESERVATION_STORE_ANCESTOR_WRITABLE");
  }
}

function validatePrivateDirectory(stat, code) {
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    stat.uid !== currentUid() ||
    (stat.mode & 0o077n) !== 0n
  ) {
    fail(code);
  }
}

function openPinnedDirectory(directoryPath, code) {
  requireDescriptorSafety();
  const raw = String(directoryPath || "").trim();
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    fail(code + "_PATH_INVALID");
  }
  const resolved = path.resolve(raw);
  const parsed = path.parse(resolved);
  const parts = resolved
    .slice(parsed.root.length)
    .split(path.sep)
    .filter(Boolean);

  let walkFd = fs.openSync(
    parsed.root,
    fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
  );
  try {
    validateAncestor(fs.fstatSync(walkFd, { bigint: true }));
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      if (!part || part === "." || part === "..") {
        fail(code + "_ANCESTOR_COMPONENT_INVALID");
      }
      const nextFd = fs.openSync(
        path.join("/proc/self/fd", String(walkFd), part),
        fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
      );
      const opened = fs.fstatSync(nextFd, { bigint: true });
      if (index === parts.length - 1) {
        validatePrivateDirectory(opened, code + "_INVALID");
      } else {
        validateAncestor(opened);
      }
      fs.closeSync(walkFd);
      walkFd = nextFd;
    }
    const visible = fs.lstatSync(resolved, { bigint: true });
    const opened = fs.fstatSync(walkFd, { bigint: true });
    validatePrivateDirectory(visible, code + "_INVALID");
    validatePrivateDirectory(opened, code + "_INVALID");
    if (!sameDirectoryIdentity(visible, opened)) {
      fail(code + "_PATH_NOT_BOUND");
    }
    const result = Object.freeze({
      path: resolved,
      fd: walkFd,
      stat: opened,
      proc_path: "/proc/self/fd/" + String(walkFd),
    });
    walkFd = -1;
    return result;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("SPONSORED_RESERVATION_STORE_")
    ) {
      throw error;
    }
    fail(code + "_ANCESTOR_WALK_FAILED");
  } finally {
    if (walkFd >= 0) fs.closeSync(walkFd);
  }
}

function assertPinnedDirectoryVisible(directory, code) {
  const opened = fs.fstatSync(directory.fd, { bigint: true });
  const visible = fs.lstatSync(directory.path, { bigint: true });
  validatePrivateDirectory(opened, code + "_INVALID");
  validatePrivateDirectory(visible, code + "_INVALID");
  if (
    !sameDirectoryIdentity(directory.stat, opened) ||
    !sameDirectoryIdentity(opened, visible)
  ) {
    fail(code + "_CHANGED");
  }
}

function openRecordsDirectory(root) {
  assertPinnedDirectoryVisible(root, "SPONSORED_RESERVATION_STORE_ROOT");
  const visiblePath = path.join(root.path, RECORDS_DIRECTORY);
  const pinnedPath = path.join(root.proc_path, RECORDS_DIRECTORY);
  const visible = fs.lstatSync(visiblePath, { bigint: true });
  validatePrivateDirectory(
    visible,
    "SPONSORED_RESERVATION_STORE_RECORDS_DIRECTORY_INVALID",
  );
  const fd = fs.openSync(
    pinnedPath,
    fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validatePrivateDirectory(
      opened,
      "SPONSORED_RESERVATION_STORE_RECORDS_DIRECTORY_INVALID",
    );
    if (!sameDirectoryIdentity(visible, opened)) {
      fail("SPONSORED_RESERVATION_STORE_RECORDS_DIRECTORY_PATH_NOT_BOUND");
    }
    return Object.freeze({
      path: visiblePath,
      fd,
      stat: opened,
      proc_path: "/proc/self/fd/" + String(fd),
    });
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function validateRecordStat(stat, allowedLinks = 1n) {
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.uid !== currentUid() ||
    stat.nlink !== allowedLinks ||
    (stat.mode & 0o077n) !== 0n ||
    stat.size < 2n ||
    stat.size > BigInt(MAX_RECORD_BYTES)
  ) {
    fail("SPONSORED_RESERVATION_STORE_RECORD_FILE_INVALID");
  }
}

function validateTemporaryStat(stat, allowedLinks) {
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.uid !== currentUid() ||
    stat.nlink !== allowedLinks ||
    (stat.mode & 0o077n) !== 0n ||
    stat.size > BigInt(MAX_RECORD_BYTES)
  ) {
    fail("SPONSORED_RESERVATION_STORE_TEMP_FILE_INVALID");
  }
}

function readExactRecord(records, name) {
  if (!RECORD_NAME.test(name)) {
    fail("SPONSORED_RESERVATION_STORE_RECORD_NAME_INVALID");
  }
  assertPinnedDirectoryVisible(
    records,
    "SPONSORED_RESERVATION_STORE_RECORDS_DIRECTORY",
  );
  const visiblePath = path.join(records.path, name);
  const pinnedPath = path.join(records.proc_path, name);
  const visibleBefore = fs.lstatSync(visiblePath, { bigint: true });
  validateRecordStat(visibleBefore);
  const fd = fs.openSync(
    pinnedPath,
    fs.constants.O_RDONLY | O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validateRecordStat(opened);
    if (!sameFileIdentity(visibleBefore, opened)) {
      fail("SPONSORED_RESERVATION_STORE_RECORD_PATH_NOT_BOUND");
    }
    const size = Number(opened.size);
    if (!Number.isSafeInteger(size) || size < 2 || size > MAX_RECORD_BYTES) {
      fail("SPONSORED_RESERVATION_STORE_RECORD_SIZE_INVALID");
    }
    const bytes = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const count = fs.readSync(fd, bytes, offset, size - offset, offset);
      if (count <= 0) fail("SPONSORED_RESERVATION_STORE_RECORD_SHORT_READ");
      offset += count;
    }
    const after = fs.fstatSync(fd, { bigint: true });
    const visibleAfter = fs.lstatSync(visiblePath, { bigint: true });
    validateRecordStat(after);
    validateRecordStat(visibleAfter);
    if (
      !sameFileIdentity(opened, after) ||
      !sameFileIdentity(after, visibleAfter)
    ) {
      fail("SPONSORED_RESERVATION_STORE_RECORD_CHANGED_DURING_READ");
    }
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

const RECORD_KEYS = Object.freeze([
  "schema",
  "marker",
  "version",
  "intent",
  "sponsorship",
]);

function parseRecordBytes(bytes, expectedName) {
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("SPONSORED_RESERVATION_STORE_RECORD_JSON_INVALID");
  }
  const record = directObject(
    value,
    "SPONSORED_RESERVATION_STORE_RECORD_OBJECT_REQUIRED",
  );
  exactKeys(
    record,
    RECORD_KEYS,
    "SPONSORED_RESERVATION_STORE_RECORD_KEYS_INVALID",
  );
  if (
    record.schema !== RECORD_SCHEMA ||
    record.marker !== VOID_ECONOMIC_SYSTEM_SPONSORED_RESERVATION_STORE_V1 ||
    record.version !== 1
  ) {
    fail("SPONSORED_RESERVATION_STORE_RECORD_HEADER_INVALID");
  }
  const intent = directObject(
    record.intent,
    "SPONSORED_RESERVATION_STORE_INTENT_OBJECT_REQUIRED",
  );
  const sponsorship = directObject(
    record.sponsorship,
    "SPONSORED_RESERVATION_STORE_SPONSORSHIP_OBJECT_REQUIRED",
  );
  if (
    intent.schema !== VOID_ECONOMIC_INTENT_RESERVATION_SCHEMA_V1 ||
    sponsorship.schema !== VOID_ECONOMIC_SYSTEM_SPONSORSHIP_SCHEMA_V1
  ) {
    fail("SPONSORED_RESERVATION_STORE_RECORD_SCHEMA_BINDING_INVALID");
  }
  let intentId;
  let sponsorshipId;
  try {
    intentId = economicIntentReservationIdV1(intent);
    sponsorshipId = economicSystemSponsorshipIdV1(sponsorship);
  } catch {
    fail("SPONSORED_RESERVATION_STORE_RECORD_IDENTITY_INVALID");
  }
  if (
    intent.intent_id !== intentId ||
    sponsorship.sponsorship_id !== sponsorshipId ||
    sponsorship.intent_id !== intent.intent_id ||
    sponsorship.identity_id !== intent.identity_id ||
    sponsorship.reservation_id !== intent.reservation_id
  ) {
    fail("SPONSORED_RESERVATION_STORE_RECORD_BINDING_INVALID");
  }
  const expected =
    String(sponsorship.sponsorship_id).replace(/^sha256:/u, "") + ".json";
  if (expectedName !== expected) {
    fail("SPONSORED_RESERVATION_STORE_RECORD_FILENAME_MISMATCH");
  }
  const canonicalBytes = Buffer.from(canonicalJson(record) + "\n", "utf8");
  if (!bytes.equals(canonicalBytes)) {
    fail("SPONSORED_RESERVATION_STORE_RECORD_BYTES_NOT_CANONICAL");
  }
  return Object.freeze({
    record: Object.freeze(record),
    intent: Object.freeze(intent),
    sponsorship: Object.freeze(sponsorship),
    bytes,
  });
}

function temporaryName(finalName) {
  return (
    "." +
    finalName +
    ".tmp-" +
    String(process.pid) +
    "-" +
    crypto.randomBytes(8).toString("hex")
  );
}

function cleanupTemps(records, markMutation = () => {}) {
  if (typeof markMutation !== "function") {
    fail("SPONSORED_RESERVATION_STORE_CLEANUP_TRACKER_INVALID");
  }
  const tempPattern =
    /^\.([0-9a-f]{64}\.json)\.tmp-[1-9][0-9]*-[0-9a-f]{16}$/u;
  let changed = false;
  for (const name of fs.readdirSync(records.proc_path)) {
    if (!name.startsWith(".")) continue;
    const match = tempPattern.exec(name);
    if (!match) {
      fail("SPONSORED_RESERVATION_STORE_TEMP_NAME_INVALID");
    }
    const tempPath = path.join(records.proc_path, name);
    const temp = fs.lstatSync(tempPath, { bigint: true });
    if (temp.nlink === 1n) {
      validateTemporaryStat(temp, 1n);
      fs.unlinkSync(tempPath);
      markMutation();
      changed = true;
      continue;
    }
    validateTemporaryStat(temp, 2n);
    const finalPath = path.join(records.proc_path, match[1]);
    const final = fs.lstatSync(finalPath, { bigint: true });
    validateRecordStat(final, 2n);
    if (temp.dev !== final.dev || temp.ino !== final.ino) {
      fail("SPONSORED_RESERVATION_STORE_TEMP_BINDING_INVALID");
    }
    fs.unlinkSync(tempPath);
    markMutation();
    changed = true;
  }
  if (changed) fs.fsyncSync(records.fd);
  return changed;
}

function readHistory(records) {
  const namesBefore = fs
    .readdirSync(records.proc_path)
    .sort(compareText);
  if (namesBefore.some((name) => name.startsWith("."))) {
    fail("SPONSORED_RESERVATION_STORE_RECOVERY_REQUIRED");
  }
  const names = namesBefore.filter((name) => !name.startsWith("."));
  if (names.length > MAX_RECORDS) {
    fail("SPONSORED_RESERVATION_STORE_RECORD_COUNT_EXCEEDED");
  }
  const parsed = names.map((name) =>
    parseRecordBytes(readExactRecord(records, name), name),
  );
  const namesAfter = fs
    .readdirSync(records.proc_path)
    .sort(compareText);
  if (namesAfter.some((name) => name.startsWith("."))) {
    fail("SPONSORED_RESERVATION_STORE_RECOVERY_REQUIRED");
  }
  if (
    namesAfter.length !== namesBefore.length ||
    namesAfter.some((name, index) => name !== namesBefore[index])
  ) {
    fail("SPONSORED_RESERVATION_STORE_DIRECTORY_CHANGED_DURING_READ");
  }
  const sponsorshipIds = new Set();
  const intentIds = new Set();
  const reservationIds = new Set();
  const signedDigests = new Set();
  for (const row of parsed) {
    const sponsorshipId = row.sponsorship.sponsorship_id;
    const intentId = row.intent.intent_id;
    const reservationId = row.intent.reservation_id;
    const signedDigest = row.sponsorship.signed_submission_digest;
    if (sponsorshipIds.has(sponsorshipId)) {
      fail("SPONSORED_RESERVATION_STORE_DUPLICATE_SPONSORSHIP_ID");
    }
    if (intentIds.has(intentId)) {
      fail("SPONSORED_RESERVATION_STORE_DUPLICATE_INTENT_ID");
    }
    if (reservationIds.has(reservationId)) {
      fail("SPONSORED_RESERVATION_STORE_DUPLICATE_RESERVATION_ID");
    }
    if (signedDigests.has(signedDigest)) {
      fail("SPONSORED_RESERVATION_STORE_DUPLICATE_SIGNED_DIGEST");
    }
    sponsorshipIds.add(sponsorshipId);
    intentIds.add(intentId);
    reservationIds.add(reservationId);
    signedDigests.add(signedDigest);
  }
  return Object.freeze(parsed);
}

const REPLAY_SIGNED_SUBMISSION_KEYS = Object.freeze([
  "intent",
  "calldata",
  "signature",
  "allowed_targets",
  "consumed_digests",
]);

function verifyDuplicateSignedSubmissionV1(candidate, rawSigned) {
  const signed = directObject(
    rawSigned,
    "SPONSORED_RESERVATION_STORE_REPLAY_SIGNED_SUBMISSION_REQUIRED",
  );
  exactKeys(
    signed,
    REPLAY_SIGNED_SUBMISSION_KEYS,
    "SPONSORED_RESERVATION_STORE_REPLAY_SIGNED_SUBMISSION_SHAPE_INVALID",
  );
  const signedIntent = directObject(
    signed.intent,
    "SPONSORED_RESERVATION_STORE_REPLAY_SIGNED_INTENT_REQUIRED",
  );
  const issuedAtUnix = String(signedIntent.issued_at_unix ?? "");
  if (!/^(0|[1-9][0-9]*)$/u.test(issuedAtUnix)) {
    fail("SPONSORED_RESERVATION_STORE_REPLAY_SIGNED_INTENT_TIME_INVALID");
  }

  let verified;
  try {
    verified = verifyVoidEconomicEpoch2SignedSubmissionIntentV1({
      intent: signed.intent,
      calldata: signed.calldata,
      signature: signed.signature,
      nowUnix: issuedAtUnix,
      allowedTargets: [signedIntent.target],
      consumedDigests: new Set(),
    });
  } catch {
    fail("SPONSORED_RESERVATION_STORE_REPLAY_SIGNED_SUBMISSION_INVALID");
  }

  if (
    verified.typed_data_digest !==
      candidate.record.sponsorship.signed_submission_digest ||
    verified.gas_limit !==
      String(candidate.record.sponsorship.gas_limit)
  ) {
    fail("SPONSORED_RESERVATION_STORE_REPLAY_SIGNED_SUBMISSION_MISMATCH");
  }

  try {
    if (
      BigInt(signedIntent.issued_at_unix) * 1000n !==
        BigInt(candidate.record.intent.issued_at_ms) ||
      BigInt(signedIntent.expires_at_unix) * 1000n !==
        BigInt(candidate.record.intent.expires_at_ms)
    ) {
      fail("SPONSORED_RESERVATION_STORE_REPLAY_SIGNED_LIFETIME_MISMATCH");
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "SPONSORED_RESERVATION_STORE_REPLAY_SIGNED_LIFETIME_MISMATCH"
    ) {
      throw error;
    }
    fail("SPONSORED_RESERVATION_STORE_REPLAY_SIGNED_INTENT_TIME_INVALID");
  }

  return Object.freeze({
    signature_verified: true,
    signed_submission_digest: verified.typed_data_digest,
    gas_limit: verified.gas_limit,
  });
}

function candidateRecord(intentRaw, sponsorshipRaw) {
  const intent = directObject(
    intentRaw,
    "SPONSORED_RESERVATION_STORE_CANDIDATE_INTENT_REQUIRED",
  );
  const sponsorship = directObject(
    sponsorshipRaw,
    "SPONSORED_RESERVATION_STORE_CANDIDATE_SPONSORSHIP_REQUIRED",
  );
  if (
    !SHA256_ID.test(String(intent.intent_id || "")) ||
    !SHA256_ID.test(String(sponsorship.sponsorship_id || ""))
  ) {
    fail("SPONSORED_RESERVATION_STORE_CANDIDATE_ID_INVALID");
  }
  let intentId;
  let sponsorshipId;
  try {
    intentId = economicIntentReservationIdV1(intent);
    sponsorshipId = economicSystemSponsorshipIdV1(sponsorship);
  } catch {
    fail("SPONSORED_RESERVATION_STORE_CANDIDATE_IDENTITY_INVALID");
  }
  if (
    intent.intent_id !== intentId ||
    sponsorship.sponsorship_id !== sponsorshipId ||
    sponsorship.intent_id !== intent.intent_id ||
    sponsorship.identity_id !== intent.identity_id ||
    sponsorship.reservation_id !== intent.reservation_id
  ) {
    fail("SPONSORED_RESERVATION_STORE_CANDIDATE_BINDING_INVALID");
  }
  const record = Object.freeze({
    schema: RECORD_SCHEMA,
    marker: VOID_ECONOMIC_SYSTEM_SPONSORED_RESERVATION_STORE_V1,
    version: 1,
    intent: Object.freeze({ ...intent }),
    sponsorship: Object.freeze({ ...sponsorship }),
  });
  return Object.freeze({
    record,
    bytes: Buffer.from(canonicalJson(record) + "\n", "utf8"),
    name: sponsorshipId.replace(/^sha256:/u, "") + ".json",
  });
}

function createOnceRecord(records, candidate, markMutation = () => {}) {
  if (typeof markMutation !== "function") {
    fail("SPONSORED_RESERVATION_STORE_PUBLICATION_TRACKER_INVALID");
  }
  if (candidate.bytes.length > MAX_RECORD_BYTES) {
    fail("SPONSORED_RESERVATION_STORE_CANDIDATE_TOO_LARGE");
  }
  const tempName = temporaryName(candidate.name);
  const tempPath = path.join(records.proc_path, tempName);
  const finalPath = path.join(records.proc_path, candidate.name);
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
    markMutation();
    let offset = 0;
    while (offset < candidate.bytes.length) {
      const written = fs.writeSync(
        fd,
        candidate.bytes,
        offset,
        candidate.bytes.length - offset,
        null,
      );
      if (written <= 0) {
        fail("SPONSORED_RESERVATION_STORE_RECORD_SHORT_WRITE");
      }
      offset += written;
    }
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = -1;
    fs.linkSync(tempPath, finalPath);
    fs.fsyncSync(records.fd);
    fs.unlinkSync(tempPath);
    fs.fsyncSync(records.fd);
    const published = readExactRecord(records, candidate.name);
    if (!published.equals(candidate.bytes)) {
      fail("SPONSORED_RESERVATION_STORE_PUBLICATION_POSTCHECK_FAILED");
    }
  } finally {
    if (fd >= 0) {
      try {
        fs.closeSync(fd);
      } catch {
        // Best effort only.
      }
    }
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
        fs.fsyncSync(records.fd);
      }
    } catch {
      // Reviewed temp cleanup happens on the next serialized invocation.
    }
  }
}

async function canonicalLock() {
  const module = await import(
    "../dist/economic/buy_void_filesystem_bakery_lock_v1.js"
  );
  if (
    typeof module.withBuyVoidFilesystemBakeryLockAsyncV1 !== "function"
  ) {
    fail("SPONSORED_RESERVATION_STORE_LOCK_UNAVAILABLE");
  }
  return module.withBuyVoidFilesystemBakeryLockAsyncV1;
}

function held(reason, mutationPerformed = false) {
  return Object.freeze({
    ok: false,
    status: "held",
    marker: VOID_ECONOMIC_SYSTEM_SPONSORED_RESERVATION_STORE_V1,
    version: 1,
    reason: String(reason || "SPONSORED_RESERVATION_STORE_HELD").slice(0, 220),
    mutation_performed: mutationPerformed === true,
    trusted_observation_time_proven: false,
    monotonic_observation_time_proven: false,
    runtime_enforcement_verified: false,
    gas_sponsorship_performed: false,
    transaction_submission: false,
    transaction_broadcast: false,
    funds_movement: false,
    authority:
      VOID_ECONOMIC_SYSTEM_SPONSORED_RESERVATION_STORE_AUTHORITY_V1,
  });
}

function success(status, candidate, mutation, state, admission = null) {
  return Object.freeze({
    ok: true,
    status,
    marker: VOID_ECONOMIC_SYSTEM_SPONSORED_RESERVATION_STORE_V1,
    version: 1,
    sponsorship_id: candidate.record.sponsorship.sponsorship_id,
    intent_id: candidate.record.intent.intent_id,
    reservation_id: candidate.record.intent.reservation_id,
    mutation_performed: mutation,
    trusted_observation_time_proven: false,
    monotonic_observation_time_proven: false,
    tracked_reservation_count: state.tracked_sponsorship_count,
    active_reserved_gas: state.active_reserved_gas,
    expired_reserved_gas_not_counted:
      state.expired_reserved_gas_not_counted,
    prospective_identity_reserved_gas:
      admission?.prospective_identity_reserved_gas ?? null,
    prospective_global_reserved_gas:
      admission?.prospective_global_reserved_gas ?? null,
    runtime_enforcement_verified: false,
    gas_sponsorship_performed: false,
    transaction_submission: false,
    transaction_broadcast: false,
    funds_movement: false,
    authority:
      VOID_ECONOMIC_SYSTEM_SPONSORED_RESERVATION_STORE_AUTHORITY_V1,
  });
}

export async function persistEconomicSystemSponsoredReservationV1(input) {
  let root = null;
  let records = null;
  let mutationPerformed = false;
  const markMutation = () => {
    mutationPerformed = true;
  };
  try {
    const candidate = candidateRecord(
      input?.candidate_intent,
      input?.candidate_sponsorship,
    );
    root = openPinnedDirectory(
      input?.root_dir,
      "SPONSORED_RESERVATION_STORE_ROOT",
    );
    records = openRecordsDirectory(root);
    const withLock = await canonicalLock();
    const lockPath = path.join(root.proc_path, LOCK_NAME);

    return await withLock(lockPath, async () => {
      assertPinnedDirectoryVisible(
        root,
        "SPONSORED_RESERVATION_STORE_ROOT",
      );
      assertPinnedDirectoryVisible(
        records,
        "SPONSORED_RESERVATION_STORE_RECORDS_DIRECTORY",
      );

      cleanupTemps(records, markMutation);
      let history = readHistory(records);
      let state = verifyEconomicSystemSponsoredStateV1({
        sponsorship_policy: input.sponsorship_policy,
        ttl_caps_policy: input.ttl_caps_policy,
        outstanding_intents: history.map((row) => row.intent),
        sponsorships: history.map((row) => row.sponsorship),
        observed_at_ms: input.observed_at_ms,
      });

      const same = history.find(
        (row) =>
          row.sponsorship.sponsorship_id ===
          candidate.record.sponsorship.sponsorship_id,
      );
      if (same) {
        if (!same.bytes.equals(candidate.bytes)) {
          return held(
            "SPONSORED_RESERVATION_STORE_REPLAY_CONFLICT",
            mutationPerformed,
          );
        }
        verifyDuplicateSignedSubmissionV1(
          candidate,
          input.candidate_signed_submission,
        );
        return success(
          "duplicate",
          candidate,
          mutationPerformed,
          state,
        );
      }

      for (const row of history) {
        if (
          row.intent.intent_id === candidate.record.intent.intent_id ||
          row.intent.reservation_id ===
            candidate.record.intent.reservation_id ||
          row.sponsorship.signed_submission_digest ===
            candidate.record.sponsorship.signed_submission_digest
        ) {
          return held(
            "SPONSORED_RESERVATION_STORE_IDENTITY_CONFLICT",
            mutationPerformed,
          );
        }
      }

      const admission = classifyEconomicSystemSponsoredAdmissionV1({
        sponsorship_policy: input.sponsorship_policy,
        ttl_caps_policy: input.ttl_caps_policy,
        outstanding_intents: history.map((row) => row.intent),
        sponsorships: history.map((row) => row.sponsorship),
        candidate_intent: candidate.record.intent,
        candidate_sponsorship: candidate.record.sponsorship,
        candidate_signed_submission: input.candidate_signed_submission,
        observed_at_ms: input.observed_at_ms,
      });
      if (admission.sponsorship_allowed !== true) {
        return held(
          admission.denial_reason ||
            "SPONSORED_RESERVATION_STORE_ADMISSION_DENIED",
          mutationPerformed,
        );
      }

      assertPinnedDirectoryVisible(
        root,
        "SPONSORED_RESERVATION_STORE_ROOT",
      );
      assertPinnedDirectoryVisible(
        records,
        "SPONSORED_RESERVATION_STORE_RECORDS_DIRECTORY",
      );
      createOnceRecord(records, candidate, markMutation);

      history = readHistory(records);
      state = verifyEconomicSystemSponsoredStateV1({
        sponsorship_policy: input.sponsorship_policy,
        ttl_caps_policy: input.ttl_caps_policy,
        outstanding_intents: history.map((row) => row.intent),
        sponsorships: history.map((row) => row.sponsorship),
        observed_at_ms: input.observed_at_ms,
      });
      if (
        state.tracked_sponsorship_count !== history.length ||
        !history.some(
          (row) =>
            row.sponsorship.sponsorship_id ===
            candidate.record.sponsorship.sponsorship_id &&
            row.bytes.equals(candidate.bytes),
        )
      ) {
        fail("SPONSORED_RESERVATION_STORE_POSTCHECK_FAILED");
      }
      if (
        state.active_reserved_gas !==
        admission.prospective_global_reserved_gas
      ) {
        fail("SPONSORED_RESERVATION_STORE_BUDGET_POSTCHECK_FAILED");
      }
      assertPinnedDirectoryVisible(
        root,
        "SPONSORED_RESERVATION_STORE_ROOT",
      );
      assertPinnedDirectoryVisible(
        records,
        "SPONSORED_RESERVATION_STORE_RECORDS_DIRECTORY",
      );
      return success(
        "reserved",
        candidate,
        mutationPerformed,
        state,
        admission,
      );
    });
  } catch (error) {
    return held(
      error instanceof Error ? error.message : String(error),
      mutationPerformed,
    );
  } finally {
    if (records) {
      try {
        fs.closeSync(records.fd);
      } catch {
        // Best effort only.
      }
    }
    if (root) {
      try {
        fs.closeSync(root.fd);
      } catch {
        // Best effort only.
      }
    }
  }
}

export function listEconomicSystemSponsoredReservationsV1(input) {
  let root = null;
  let records = null;
  try {
    root = openPinnedDirectory(
      input?.root_dir,
      "SPONSORED_RESERVATION_STORE_ROOT",
    );
    records = openRecordsDirectory(root);
    const history = readHistory(records);
    const state = verifyEconomicSystemSponsoredStateV1({
      sponsorship_policy: input.sponsorship_policy,
      ttl_caps_policy: input.ttl_caps_policy,
      outstanding_intents: history.map((row) => row.intent),
      sponsorships: history.map((row) => row.sponsorship),
      observed_at_ms: input.observed_at_ms,
    });
    assertPinnedDirectoryVisible(
      root,
      "SPONSORED_RESERVATION_STORE_ROOT",
    );
    assertPinnedDirectoryVisible(
      records,
      "SPONSORED_RESERVATION_STORE_RECORDS_DIRECTORY",
    );
    return Object.freeze({
      ok: true,
      status: "listed",
      marker: VOID_ECONOMIC_SYSTEM_SPONSORED_RESERVATION_STORE_V1,
      version: 1,
      records: Object.freeze(
        history.map((row) => Object.freeze({ ...row.record })),
      ),
      tracked_reservation_count: state.tracked_sponsorship_count,
      active_reserved_gas: state.active_reserved_gas,
      expired_reserved_gas_not_counted:
        state.expired_reserved_gas_not_counted,
      mutation_performed: false,
      trusted_observation_time_proven: false,
      monotonic_observation_time_proven: false,
      runtime_enforcement_verified: false,
      gas_sponsorship_performed: false,
      funds_movement: false,
      authority:
        VOID_ECONOMIC_SYSTEM_SPONSORED_RESERVATION_STORE_AUTHORITY_V1,
    });
  } catch (error) {
    return held(error instanceof Error ? error.message : String(error));
  } finally {
    if (records) {
      try {
        fs.closeSync(records.fd);
      } catch {
        // Best effort only.
      }
    }
    if (root) {
      try {
        fs.closeSync(root.fd);
      } catch {
        // Best effort only.
      }
    }
  }
}
