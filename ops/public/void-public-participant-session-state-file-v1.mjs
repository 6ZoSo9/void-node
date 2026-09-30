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
  if (!plain(value)) {
    throw new Error("session_state_role_admission_invalid");
  }
  const encoded = JSON.stringify(value);
  if (
    typeof encoded !== "string" ||
    Buffer.byteLength(encoded, "utf8") >
      VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE_V1.max_role_admission_bytes
  ) {
    throw new Error("session_state_role_admission_too_large");
  }
  return structuredClone(value);
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
  return Object.freeze({
    id: value.id,
    token_sha256: value.token_sha256,
    identity_id: canonicalIdentity(value.identity_id),
    account: canonicalAccount(value.account),
    public_key_fingerprint_sha256:
      value.public_key_fingerprint_sha256,
    capability: value.capability,
    role_admission: canonicalRoleAdmission(value.role_admission),
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

function canonicalStateFile(raw) {
  const value = String(raw || "");
  if (!path.isAbsolute(value) || path.resolve(value) !== value) {
    throw new Error("session_state_file_absolute_required");
  }
  const parent = path.dirname(value);
  const parentStat = fs.lstatSync(parent);
  if (
    !parentStat.isDirectory() ||
    parentStat.isSymbolicLink() ||
    fs.realpathSync(parent) !== parent
  ) {
    throw new Error("session_state_parent_invalid");
  }
  assertOwned(parentStat, "session_state_parent");
  if ((parentStat.mode & 0o777) !== 0o700) {
    throw new Error("session_state_parent_mode_invalid");
  }
  return Object.freeze({ file: value, parent });
}

function validateExistingStateFile(file) {
  const stat = fs.lstatSync(file);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    fs.realpathSync(file) !== file
  ) {
    throw new Error("session_state_file_type_invalid");
  }
  assertOwned(stat, "session_state_file");
  if ((stat.mode & 0o777) !== 0o600) {
    throw new Error("session_state_file_mode_invalid");
  }
  if (
    stat.size < 2 ||
    stat.size >
      VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE_V1.max_state_bytes
  ) {
    throw new Error("session_state_file_size_invalid");
  }
  return stat;
}

function readSnapshotFile(file) {
  validateExistingStateFile(file);
  const bytes = fs.readFileSync(file);
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
}

function fsyncDirectory(parent) {
  const fd = fs.openSync(parent, fs.constants.O_RDONLY);
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function writeSnapshotAtomic(target, snapshot) {
  const canonical = canonicalSnapshot(snapshot);
  const rendered = JSON.stringify(canonical, null, 2) + "\n";
  if (
    Buffer.byteLength(rendered, "utf8") >
      VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE_V1.max_state_bytes
  ) {
    throw new Error("session_state_file_size_invalid");
  }

  const parent = path.dirname(target);
  const temp =
    path.join(
      parent,
      "." + path.basename(target) + ".tmp-" +
        String(process.pid) + "-" +
        crypto.randomBytes(8).toString("hex"),
    );
  let fd = null;
  try {
    fd = fs.openSync(
      temp,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL,
      0o600,
    );
    fs.writeFileSync(fd, rendered, { encoding: "utf8" });
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = null;

    try {
      validateExistingStateFile(target);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }

    fs.renameSync(temp, target);
    fs.chmodSync(target, 0o600);
    validateExistingStateFile(target);
    fsyncDirectory(parent);
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch {
        // The write path already owns the original failure.
      }
    }
    try {
      fs.unlinkSync(temp);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
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
    snapshot = readSnapshotFile(location.file);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    snapshot = canonicalSnapshot(emptySnapshot());
    writeSnapshotAtomic(location.file, snapshot);
  }

  let generation = BigInt(snapshot.generation);
  const challenges = new Map(
    snapshot.challenges.map((row) => [row.id, clone(row)]),
  );
  const sessions = new Map(
    snapshot.sessions.map((row) => [row.id, clone(row)]),
  );

  const persist = () => {
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
    writeSnapshotAtomic(location.file, next);
    generation = nextGeneration;
  };

  const purge = (nowMs) => {
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
      for (const [id, row] of removedChallenges) challenges.set(id, row);
      for (const [id, row] of removedSessions) sessions.set(id, row);
      throw error;
    }
  };

  const putChallenge = (raw) => {
    const row = canonicalChallengeRow(raw);
    if (challenges.has(row.id)) {
      throw new Error("session_state_challenge_id_collision");
    }
    challenges.set(row.id, clone(row));
    try {
      persist();
    } catch (error) {
      challenges.delete(row.id);
      throw error;
    }
  };

  const takeChallenge = (id) => {
    const key = String(id || "");
    const row = challenges.get(key);
    if (!row) return null;
    challenges.delete(key);
    try {
      persist();
    } catch (error) {
      challenges.set(key, row);
      throw error;
    }
    return clone(row);
  };

  const putSession = (raw) => {
    const row = canonicalSessionRow(raw);
    if (sessions.has(row.id)) {
      throw new Error("session_state_session_id_collision");
    }
    sessions.set(row.id, clone(row));
    try {
      persist();
    } catch (error) {
      sessions.delete(row.id);
      throw error;
    }
  };

  const getSession = (id) => {
    const row = sessions.get(String(id || ""));
    return row ? clone(row) : null;
  };

  const deleteSession = (id) => {
    const key = String(id || "");
    const row = sessions.get(key);
    if (!row) return false;
    sessions.delete(key);
    try {
      persist();
      return true;
    } catch (error) {
      sessions.set(key, row);
      throw error;
    }
  };

  return Object.freeze({
    ...VOID_PUBLIC_PARTICIPANT_SESSION_STATE_STORE_V1,
    state_file: location.file,
    purge,
    challengeCount() {
      return challenges.size;
    },
    sessionCount() {
      return sessions.size;
    },
    putChallenge,
    takeChallenge,
    putSession,
    getSession,
    deleteSession,
  });
}
