#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const VOID_PUBLIC_PARTICIPANT_SESSION_STATE_STORE_V1 = Object.freeze({
  marker: "VOID_PUBLIC_PARTICIPANT_SESSION_STATE_STORE_V1",
  version: 1,
  durable: true,
  bearer_token_persisted: false,
  wallet_private_key_access: false,
  signing_authority: false,
  transaction_authority: false,
  work_credit_mutation_authority: false,
  validator_mutation_authority: false,
  chain2050_write_authority: false,
  money_movement_authority: false,
});

export const VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE_V1 = Object.freeze({
  marker: "VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE_V1",
  version: 1,
  max_state_bytes: 2 * 1024 * 1024,
  max_role_admission_bytes: 16 * 1024,
  parent_mode: 0o700,
  file_mode: 0o600,
  atomic_same_directory_replace: true,
  file_fsync_before_replace: true,
  directory_fsync_before_ack: true,
  bearer_token_persisted: false,
});

const ACCOUNT_RE = /^[A-Za-z0-9._:-]{1,128}$/;
const IDENTITY_RE = /^[a-z0-9][a-z0-9._:-]{2,191}$/;
const HEX32_RE = /^[0-9a-f]{32}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const BASE64URL32_RE = /^[A-Za-z0-9_-]{43}$/;
const UINT64_RE = /^(0|[1-9][0-9]{0,19})$/;
const MAX_UINT64 = 18446744073709551615n;
const MAX_ACTIVE_CHALLENGES = 256;
const MAX_ACTIVE_SESSIONS = 256;

const SNAPSHOT_KEYS = Object.freeze([
  "challenges",
  "generation",
  "marker",
  "sessions",
  "version",
]);
const CHALLENGE_KEYS = Object.freeze([
  "account",
  "expires_at_ms",
  "id",
  "identity_id",
  "issued_at_ms",
  "nonce",
]);
const SESSION_KEYS = Object.freeze([
  "account",
  "capability",
  "expires_at_ms",
  "id",
  "identity_id",
  "issued_at_ms",
  "public_key_fingerprint_sha256",
  "role_admission",
  "token_sha256",
]);
const ROLE_ADMISSION_KEYS = Object.freeze([
  "account_id",
  "authority_policy_sha256",
  "chain_id",
  "identity_id",
  "role",
  "role_authority_generation",
  "role_record_sha256",
  "role_registry_binding_descriptor_sha256",
  "schema",
  "subject_binding_sha256",
]);

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactObject(value, keys, label) {
  if (!plain(value)) throw new Error(label + "_object_required");
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    !actual.every((key, index) => key === expected[index])
  ) {
    throw new Error(label + "_shape_invalid");
  }
}

function assertOwned(stat, label) {
  if (
    typeof process.getuid === "function" &&
    stat.uid !== process.getuid()
  ) {
    throw new Error(label + "_owner_invalid");
  }
}

function canonicalUint64(value, label) {
  if (typeof value !== "string" || !UINT64_RE.test(value)) {
    throw new Error(label + "_invalid");
  }
  const parsed = BigInt(value);
  if (parsed < 0n || parsed > MAX_UINT64) {
    throw new Error(label + "_invalid");
  }
  return parsed.toString();
}

function canonicalTimestamp(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(label + "_invalid");
  }
  return value;
}

function canonicalIdentity(value) {
  if (value === null) return null;
  if (typeof value !== "string" || !IDENTITY_RE.test(value)) {
    throw new Error("session_state_identity_invalid");
  }
  return value;
}

function canonicalAccount(value) {
  if (typeof value !== "string" || !ACCOUNT_RE.test(value)) {
    throw new Error("session_state_account_invalid");
  }
  return value;
}

function canonicalChallengeRow(value) {
  exactObject(value, CHALLENGE_KEYS, "session_state_challenge");
  if (
    typeof value.id !== "string" ||
    !HEX32_RE.test(value.id) ||
    typeof value.nonce !== "string" ||
    !BASE64URL32_RE.test(value.nonce)
  ) {
    throw new Error("session_state_challenge_identity_invalid");
  }
  const issued = canonicalTimestamp(
    value.issued_at_ms,
    "session_state_challenge_issued_at_ms",
  );
  const expires = canonicalTimestamp(
    value.expires_at_ms,
    "session_state_challenge_expires_at_ms",
  );
  if (expires <= issued) {
    throw new Error("session_state_challenge_expiry_invalid");
  }
  return Object.freeze({
    id: value.id,
    nonce: value.nonce,
    identity_id: canonicalIdentity(value.identity_id),
    account: canonicalAccount(value.account),
    issued_at_ms: issued,
    expires_at_ms: expires,
  });
}

function canonicalRoleAdmission(value) {
  if (value === null) return null;
  exactObject(
    value,
    ROLE_ADMISSION_KEYS,
    "session_state_role_admission",
  );
  if (
    value.schema !== "void.participant-role-authority-admission.v1" ||
    value.chain_id !== 2050 ||
    value.role !== "AGENT" ||
    typeof value.identity_id !== "string" ||
    !IDENTITY_RE.test(value.identity_id) ||
    typeof value.account_id !== "string" ||
    !ACCOUNT_RE.test(value.account_id) ||
    typeof value.subject_binding_sha256 !== "string" ||
    !SHA256_RE.test(value.subject_binding_sha256) ||
    typeof value.authority_policy_sha256 !== "string" ||
    !SHA256_RE.test(value.authority_policy_sha256) ||
    typeof value.role_record_sha256 !== "string" ||
    !SHA256_RE.test(value.role_record_sha256) ||
    typeof value.role_registry_binding_descriptor_sha256 !== "string" ||
    !SHA256_RE.test(
      value.role_registry_binding_descriptor_sha256,
    )
  ) {
    throw new Error("session_state_role_admission_invalid");
  }
  return Object.freeze({
    schema: "void.participant-role-authority-admission.v1",
    chain_id: 2050,
    identity_id: canonicalIdentity(value.identity_id),
    account_id: canonicalAccount(value.account_id),
    role: "AGENT",
    subject_binding_sha256: value.subject_binding_sha256,
    authority_policy_sha256: value.authority_policy_sha256,
    role_authority_generation: canonicalUint64(
      value.role_authority_generation,
      "session_state_role_authority_generation",
    ),
    role_record_sha256: value.role_record_sha256,
    role_registry_binding_descriptor_sha256:
      value.role_registry_binding_descriptor_sha256,
  });
}

function canonicalSessionRow(value) {
  exactObject(value, SESSION_KEYS, "session_state_session");
  if (
    typeof value.id !== "string" ||
    !HEX32_RE.test(value.id) ||
    typeof value.token_sha256 !== "string" ||
    !SHA256_RE.test(value.token_sha256) ||
    typeof value.public_key_fingerprint_sha256 !== "string" ||
    !SHA256_RE.test(value.public_key_fingerprint_sha256) ||
    value.capability !== "participant.account.read.v1"
  ) {
    throw new Error("session_state_session_identity_invalid");
  }
  const issued = canonicalTimestamp(
    value.issued_at_ms,
    "session_state_session_issued_at_ms",
  );
  const expires = canonicalTimestamp(
    value.expires_at_ms,
    "session_state_session_expires_at_ms",
  );
  if (expires <= issued) {
    throw new Error("session_state_session_expiry_invalid");
  }
  const identity = canonicalIdentity(value.identity_id);
  const account = canonicalAccount(value.account);
  const roleAdmission = canonicalRoleAdmission(value.role_admission);
  if (
    (identity === null) !== (roleAdmission === null) ||
    (
      roleAdmission !== null &&
      (
        roleAdmission.identity_id !== identity ||
        roleAdmission.account_id !== account
      )
    )
  ) {
    throw new Error("session_state_role_admission_binding_invalid");
  }
  return Object.freeze({
    id: value.id,
    token_sha256: value.token_sha256,
    identity_id: identity,
    account,
    public_key_fingerprint_sha256:
      value.public_key_fingerprint_sha256,
    capability: value.capability,
    role_admission: roleAdmission,
    issued_at_ms: issued,
    expires_at_ms: expires,
  });
}

function canonicalSnapshot(value) {
  exactObject(value, SNAPSHOT_KEYS, "session_state_snapshot");
  if (
    value.marker !==
      VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE_V1.marker ||
    value.version !== 1 ||
    !Array.isArray(value.challenges) ||
    !Array.isArray(value.sessions)
  ) {
    throw new Error("session_state_snapshot_invalid");
  }
  const generation = canonicalUint64(
    value.generation,
    "session_state_generation",
  );
  if (
    value.challenges.length > MAX_ACTIVE_CHALLENGES ||
    value.sessions.length > MAX_ACTIVE_SESSIONS
  ) {
    throw new Error("session_state_cardinality_limit_exceeded");
  }
  const challenges = value.challenges.map(canonicalChallengeRow);
  const sessions = value.sessions.map(canonicalSessionRow);
  const challengeIds = new Set(challenges.map((row) => row.id));
  const sessionIds = new Set(sessions.map((row) => row.id));
  if (
    challengeIds.size !== challenges.length ||
    sessionIds.size !== sessions.length
  ) {
    throw new Error("session_state_duplicate_id");
  }
  return Object.freeze({
    marker: VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE_V1.marker,
    version: 1,
    generation,
    challenges,
    sessions,
  });
}

function currentUidBigInt() {
  return typeof process.getuid === "function"
    ? BigInt(process.getuid())
    : null;
}

function privateMode(stat) {
  return stat.mode & 0o777n;
}

function captureParentIdentity(parent) {
  const stat = fs.lstatSync(parent, { bigint: true });
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    fs.realpathSync(parent) !== parent
  ) {
    throw new Error("session_state_parent_invalid");
  }
  const uid = currentUidBigInt();
  if (uid !== null && stat.uid !== uid) {
    throw new Error("session_state_parent_owner_invalid");
  }
  if (privateMode(stat) !== 0o700n) {
    throw new Error("session_state_parent_mode_invalid");
  }
  return Object.freeze({
    dev: stat.dev,
    ino: stat.ino,
    uid: stat.uid,
    mode: privateMode(stat),
    realpath: parent,
  });
}

function custodyError(reason) {
  const error = new Error(reason);
  error.session_state_custody_lost = true;
  return error;
}

function assertParentIdentity(location) {
  let stat;
  let real;
  try {
    stat = fs.lstatSync(location.parent, { bigint: true });
    real = fs.realpathSync(location.parent);
  } catch {
    throw custodyError("session_state_parent_identity_changed");
  }
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    real !== location.parent_identity.realpath ||
    stat.dev !== location.parent_identity.dev ||
    stat.ino !== location.parent_identity.ino ||
    stat.uid !== location.parent_identity.uid ||
    privateMode(stat) !== location.parent_identity.mode
  ) {
    throw custodyError("session_state_parent_identity_changed");
  }
  return stat;
}

function canonicalStateFile(raw) {
  const value = String(raw || "");
  if (!path.isAbsolute(value) || path.resolve(value) !== value) {
    throw new Error("session_state_file_absolute_required");
  }
  const parent = path.dirname(value);
  const parentIdentity = captureParentIdentity(parent);
  return Object.freeze({
    file: value,
    parent,
    parent_identity: parentIdentity,
  });
}

function validateOpenedStateFile(fd, location) {
  const stat = fs.fstatSync(fd, { bigint: true });
  const uid = currentUidBigInt();
  if (!stat.isFile()) {
    throw new Error("session_state_file_type_invalid");
  }
  if (uid !== null && stat.uid !== uid) {
    throw new Error("session_state_file_owner_invalid");
  }
  if (privateMode(stat) !== 0o600n) {
    throw new Error("session_state_file_mode_invalid");
  }
  if (stat.nlink !== 1n) {
    throw new Error("session_state_file_link_count_invalid");
  }
  if (
    stat.size < 2n ||
    stat.size >
      BigInt(
        VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE_V1.max_state_bytes,
      )
  ) {
    throw new Error("session_state_file_size_invalid");
  }
  assertParentIdentity(location);
  return stat;
}

function assertPathMatchesOpenedFile(location, openedStat) {
  assertParentIdentity(location);
  let stat;
  let real;
  try {
    stat = fs.lstatSync(location.file, { bigint: true });
    real = fs.realpathSync(location.file);
  } catch {
    throw new Error("session_state_file_path_identity_changed");
  }
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    real !== location.file ||
    stat.dev !== openedStat.dev ||
    stat.ino !== openedStat.ino ||
    stat.uid !== openedStat.uid ||
    privateMode(stat) !== privateMode(openedStat) ||
    stat.nlink !== 1n
  ) {
    throw new Error("session_state_file_path_identity_changed");
  }
  assertParentIdentity(location);
}

function validateExistingStatePath(location) {
  assertParentIdentity(location);
  const stat = fs.lstatSync(location.file, { bigint: true });
  const uid = currentUidBigInt();
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    fs.realpathSync(location.file) !== location.file
  ) {
    throw new Error("session_state_file_type_invalid");
  }
  if (uid !== null && stat.uid !== uid) {
    throw new Error("session_state_file_owner_invalid");
  }
  if (privateMode(stat) !== 0o600n) {
    throw new Error("session_state_file_mode_invalid");
  }
  if (stat.nlink !== 1n) {
    throw new Error("session_state_file_link_count_invalid");
  }
  if (
    stat.size < 2n ||
    stat.size >
      BigInt(
        VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE_V1.max_state_bytes,
      )
  ) {
    throw new Error("session_state_file_size_invalid");
  }
  assertParentIdentity(location);
  return stat;
}

function readSnapshotFile(location) {
  assertParentIdentity(location);
  if (typeof fs.constants.O_NOFOLLOW !== "number") {
    throw new Error("session_state_nofollow_unsupported");
  }

  let fd;
  try {
    fd = fs.openSync(
      location.file,
      fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW,
    );
  } catch (error) {
    if (error?.code === "ELOOP") {
      throw new Error("session_state_file_type_invalid");
    }
    throw error;
  }

  try {
    const before = validateOpenedStateFile(fd, location);
    const size = Number(before.size);
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
      if (count <= 0) {
        throw new Error("session_state_file_changed_during_read");
      }
      offset += count;
    }

    const extra = Buffer.alloc(1);
    if (fs.readSync(fd, extra, 0, 1, size) !== 0) {
      throw new Error("session_state_file_changed_during_read");
    }

    const after = fs.fstatSync(fd, { bigint: true });
    if (
      after.dev !== before.dev ||
      after.ino !== before.ino ||
      after.uid !== before.uid ||
      privateMode(after) !== privateMode(before) ||
      after.nlink !== before.nlink ||
      after.size !== before.size ||
      after.mtimeNs !== before.mtimeNs ||
      after.ctimeNs !== before.ctimeNs
    ) {
      throw new Error("session_state_file_changed_during_read");
    }

    assertPathMatchesOpenedFile(location, after);

    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Error("session_state_file_utf8_invalid");
    }
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("session_state_file_json_invalid");
    }
    return canonicalSnapshot(parsed);
  } finally {
    fs.closeSync(fd);
  }
}

function fsyncDirectory(location) {
  assertParentIdentity(location);
  if (
    typeof fs.constants.O_NOFOLLOW !== "number" ||
    typeof fs.constants.O_DIRECTORY !== "number"
  ) {
    throw custodyError("session_state_parent_descriptor_flags_unsupported");
  }
  const fd = fs.openSync(
    location.parent,
    fs.constants.O_RDONLY |
      fs.constants.O_DIRECTORY |
      fs.constants.O_NOFOLLOW,
  );
  try {
    const stat = fs.fstatSync(fd, { bigint: true });
    if (
      !stat.isDirectory() ||
      stat.dev !== location.parent_identity.dev ||
      stat.ino !== location.parent_identity.ino ||
      stat.uid !== location.parent_identity.uid ||
      privateMode(stat) !== location.parent_identity.mode
    ) {
      throw custodyError("session_state_parent_identity_changed");
    }
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  assertParentIdentity(location);
}

function markReplaceState(error, replaced) {
  const value = error instanceof Error
    ? error
    : new Error("session_state_persistence_failed");
  value.session_state_replace_committed = replaced === true;
  return value;
}

function writeSnapshotAtomic(location, snapshot) {
  const canonical = canonicalSnapshot(snapshot);
  const rendered = JSON.stringify(canonical, null, 2) + "\n";
  if (
    Buffer.byteLength(rendered, "utf8") >
      VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE_V1.max_state_bytes
  ) {
    throw new Error("session_state_file_size_invalid");
  }

  assertParentIdentity(location);
  if (typeof fs.constants.O_NOFOLLOW !== "number") {
    throw custodyError("session_state_nofollow_unsupported");
  }

  const target = location.file;
  const temp =
    path.join(
      location.parent,
      "." + path.basename(target) + ".tmp-" +
        String(process.pid) + "-" +
        crypto.randomBytes(8).toString("hex"),
    );
  let fd = null;
  let replaced = false;
  let primaryError = null;
  try {
    assertParentIdentity(location);
    fd = fs.openSync(
      temp,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        fs.constants.O_NOFOLLOW,
      0o600,
    );
    fs.writeFileSync(fd, rendered, { encoding: "utf8" });
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = null;

    assertParentIdentity(location);
    try {
      validateExistingStatePath(location);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    assertParentIdentity(location);

    fs.renameSync(temp, target);
    replaced = true;

    validateExistingStatePath(location);
    fsyncDirectory(location);
    assertParentIdentity(location);
  } catch (error) {
    primaryError = markReplaceState(error, replaced);
  } finally {
    let cleanupError = null;
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch (error) {
        cleanupError = markReplaceState(error, replaced);
      }
    }
    try {
      fs.unlinkSync(temp);
    } catch (error) {
      if (error?.code !== "ENOENT" && cleanupError === null) {
        cleanupError = markReplaceState(error, replaced);
      }
    }
    if (primaryError !== null) throw primaryError;
    if (cleanupError !== null) throw cleanupError;
  }
}

function emptySnapshot() {
  return {
    marker: VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE_V1.marker,
    version: 1,
    generation: "0",
    challenges: [],
    sessions: [],
  };
}

function clone(value) {
  return structuredClone(value);
}

export function createVoidPublicParticipantSessionStateFileV1({
  stateFile,
} = {}) {
  const location = canonicalStateFile(stateFile);
  let snapshot;
  try {
    snapshot = readSnapshotFile(location);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    snapshot = canonicalSnapshot(emptySnapshot());
    writeSnapshotAtomic(location, snapshot);
  }

  let generation = BigInt(snapshot.generation);
  let poisoned = false;
  const challenges = new Map(
    snapshot.challenges.map((row) => [row.id, clone(row)]),
  );
  const sessions = new Map(
    snapshot.sessions.map((row) => [row.id, clone(row)]),
  );

  const assertHealthy = () => {
    if (poisoned) {
      throw new Error("session_state_store_poisoned");
    }
  };

  const persist = () => {
    assertHealthy();
    if (generation >= MAX_UINT64) {
      throw new Error("session_state_generation_exhausted");
    }
    const nextGeneration = generation + 1n;
    const next = {
      marker: VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE_V1.marker,
      version: 1,
      generation: nextGeneration.toString(),
      challenges: [...challenges.values()]
        .map(clone)
        .sort((a, b) => a.id.localeCompare(b.id)),
      sessions: [...sessions.values()]
        .map(clone)
        .sort((a, b) => a.id.localeCompare(b.id)),
    };
    try {
      writeSnapshotAtomic(location, next);
    } catch (error) {
      if (
        error?.session_state_replace_committed === true ||
        error?.session_state_custody_lost === true
      ) {
        poisoned = true;
      }
      throw error;
    }
    generation = nextGeneration;
  };

  const purge = (nowMs) => {
    assertHealthy();
    const current = canonicalTimestamp(nowMs, "session_state_now_ms");
    const removedChallenges = [];
    const removedSessions = [];
    for (const [id, row] of challenges) {
      if (row.expires_at_ms <= current) {
        removedChallenges.push([id, row]);
        challenges.delete(id);
      }
    }
    for (const [id, row] of sessions) {
      if (row.expires_at_ms <= current) {
        removedSessions.push([id, row]);
        sessions.delete(id);
      }
    }
    if (removedChallenges.length === 0 && removedSessions.length === 0) {
      return false;
    }
    try {
      persist();
      return true;
    } catch (error) {
      if (!poisoned) {
        for (const [id, row] of removedChallenges) challenges.set(id, row);
        for (const [id, row] of removedSessions) sessions.set(id, row);
      }
      throw error;
    }
  };

  const putChallenge = (raw) => {
    assertHealthy();
    const row = canonicalChallengeRow(raw);
    if (challenges.has(row.id)) {
      throw new Error("session_state_challenge_id_collision");
    }
    challenges.set(row.id, clone(row));
    try {
      persist();
    } catch (error) {
      if (!poisoned) challenges.delete(row.id);
      throw error;
    }
  };

  const takeChallenge = (id) => {
    assertHealthy();
    const key = String(id || "");
    const row = challenges.get(key);
    if (!row) return null;
    challenges.delete(key);
    try {
      persist();
    } catch (error) {
      if (!poisoned) challenges.set(key, row);
      throw error;
    }
    return clone(row);
  };

  const putSession = (raw) => {
    assertHealthy();
    const row = canonicalSessionRow(raw);
    if (sessions.has(row.id)) {
      throw new Error("session_state_session_id_collision");
    }
    sessions.set(row.id, clone(row));
    try {
      persist();
    } catch (error) {
      if (!poisoned) sessions.delete(row.id);
      throw error;
    }
  };

  const getSession = (id) => {
    assertHealthy();
    const row = sessions.get(String(id || ""));
    return row ? clone(row) : null;
  };

  const deleteSession = (id) => {
    assertHealthy();
    const key = String(id || "");
    const row = sessions.get(key);
    if (!row) return false;
    sessions.delete(key);
    try {
      persist();
      return true;
    } catch (error) {
      if (!poisoned) sessions.set(key, row);
      throw error;
    }
  };

  return Object.freeze({
    ...VOID_PUBLIC_PARTICIPANT_SESSION_STATE_STORE_V1,
    state_file: location.file,
    purge,
    challengeCount() {
      assertHealthy();
      return challenges.size;
    },
    sessionCount() {
      assertHealthy();
      return sessions.size;
    },
    putChallenge,
    takeChallenge,
    putSession,
    getSession,
    deleteSession,
  });
}
