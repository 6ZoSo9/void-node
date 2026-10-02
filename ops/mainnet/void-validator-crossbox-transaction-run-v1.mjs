#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_CONFIRMATION_V1,
  appendVoidValidatorCrossboxTransactionExecutorEventV1,
  authorizeVoidValidatorCrossboxCheckpointPublicationV1,
  replayVoidValidatorCrossboxTransactionExecutorV1,
  validateVoidValidatorCrossboxTransactionExecutorJournalV1,
} from "../../tools/void-validator-crossbox-transaction-executor-v1.mjs";

export const VOID_VALIDATOR_CROSSBOX_TRANSACTION_RUN_V1 =
  "VOID_VALIDATOR_CROSSBOX_TRANSACTION_RUN_V1";

export const VOID_VALIDATOR_CROSSBOX_TRANSACTION_RUN_CONFIRMATION_V1 =
  "runReviewedValidatorCrossboxTransactionV1";

export const VOID_VALIDATOR_CROSSBOX_PARTICIPANT_CONFIRMATION_V1 =
  "runReviewedValidatorCrossboxParticipantV1";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const MAX_MANIFEST_BYTES = 8 * 1024 * 1024;
const MAX_SHADOW_BYTES = 2 * 1024 * 1024;
const MAX_STEPS = 64;
const TX_ID = /^voidxmtx1_[0-9a-f]{64}$/u;
const HEAD = /^[0-9a-f]{40}$/u;
const SHA = /^[0-9a-f]{64}$/u;
const INVOCATION = /^[0-9a-f]{32}$/u;
const SAFE_SERVICE = /^[A-Za-z0-9_.@-]+\.service$/u;
const SAFE_VAULT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u;
const SAFE_SSH =
  /^([A-Za-z0-9][A-Za-z0-9._-]*@)?[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const MANIFEST = /^epoch-([0-9]{6})\.manifest\.verified\.json$/u;
const CHECKPOINT = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/u;

export const VOID_VALIDATOR_CROSSBOX_TRANSACTION_RUN_AUTHORITY_V1 =
  Object.freeze({
    explicit_operator_confirmation_required: true,
    exact_clean_source_head_required: true,
    explicit_participant_runtime_identity_required: true,
    two_participant_stage_before_publish_required: true,
    coordinator_journal_fsync_before_side_effect_required: true,
    participant_journal_fsync_before_side_effect_required: true,
    observation_driven_recovery_required: true,
    exact_prestate_restore_required: true,
    checkpoint_authorization_after_commit_only: true,
    checkpoint_tag_creation: false,
    git_push: false,
    credential_access: false,
    key_access: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    work_credit_mutation: false,
    funds_movement: false,
  });

function fail(code) {
  throw new Error(code);
}

function clone(value) {
  return structuredClone(value);
}

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
      .join(",") +
    "}"
  );
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function exactObject(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  return value;
}

function fsyncDirectory(dir) {
  const fd = fs.openSync(dir, "r");
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function mkdirPrivate(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.chmodSync(dir, 0o700);
}

function atomicWriteFile(file, bytes, mode = 0o600) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = file + ".next";
  try {
    fs.unlinkSync(tmp);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const fd = fs.openSync(tmp, "wx", mode);
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.chmodSync(tmp, mode);
  fs.renameSync(tmp, file);
  fsyncDirectory(dir);
}

function atomicWriteJson(file, value) {
  atomicWriteFile(file, Buffer.from(JSON.stringify(value, null, 2) + "\n"), 0o600);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function run(argv, options = {}) {
  const result = spawnSync(argv[0], argv.slice(1), {
    cwd: options.cwd ?? ROOT,
    env: options.env ?? process.env,
    input: options.input ?? undefined,
    encoding: "utf8",
    timeout: options.timeout ?? 30000,
    maxBuffer: options.maxBuffer ?? 32 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return result;
}

function requireRun(argv, code, options = {}) {
  const result = run(argv, options);
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || "").trim().slice(0, 800);
    fail(detail ? code + ":" + detail : code);
  }
  return String(result.stdout || "").trim();
}

function validService(value) {
  const text = String(value || "").trim();
  if (!SAFE_SERVICE.test(text)) fail("validator_live_service_invalid");
  return text;
}

function validHttpBase(value) {
  let parsed;
  try {
    parsed = new URL(String(value || ""));
  } catch {
    fail("validator_live_http_base_invalid");
  }
  if (
    parsed.protocol !== "http:" ||
    !["127.0.0.1", "::1", "[::1]"].includes(parsed.hostname) ||
    !parsed.port ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    parsed.username ||
    parsed.password
  ) {
    fail("validator_live_http_base_must_be_loopback");
  }
  const port = Number(parsed.port);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    fail("validator_live_http_port_invalid");
  }
  return parsed.href.replace(/\/$/u, "");
}

function validSshTarget(value) {
  const text = String(value || "").trim();
  if (!SAFE_SSH.test(text)) fail("validator_live_ssh_target_invalid");
  const lower = text.toLowerCase();
  if (
    lower.includes("alienware") ||
    lower.includes("100.122.79.39") ||
    lower.includes("zoso-alienware-aurora-r7")
  ) {
    fail("validator_live_retired_alienware_target_forbidden");
  }
  return text;
}

function cleanHead(root) {
  const status = requireRun(
    ["git", "-C", root, "status", "--porcelain=v1", "--untracked-files=all"],
    "validator_live_git_status_failed",
  );
  if (status !== "") fail("validator_live_repository_must_be_clean");
  const head = requireRun(
    ["git", "-C", root, "rev-parse", "HEAD"],
    "validator_live_git_head_failed",
  ).toLowerCase();
  if (!HEAD.test(head)) fail("validator_live_repository_head_invalid");
  return head;
}

function serviceObservation(service) {
  const load = requireRun(
    ["systemctl", "--user", "show", service, "-p", "LoadState", "--value"],
    "validator_live_service_loadstate_failed",
  );
  if (load !== "loaded") fail("validator_live_service_not_loaded:" + service);
  const activeState = requireRun(
    ["systemctl", "--user", "show", service, "-p", "ActiveState", "--value"],
    "validator_live_service_state_failed",
  );
  if (!["active", "inactive"].includes(activeState)) {
    fail("validator_live_service_state_ambiguous:" + activeState);
  }
  const active = activeState === "active";
  let invocationId = null;
  if (active) {
    invocationId = requireRun(
      ["systemctl", "--user", "show", service, "-p", "InvocationID", "--value"],
      "validator_live_invocation_read_failed",
    ).toLowerCase();
    if (!INVOCATION.test(invocationId) || /^0{32}$/u.test(invocationId)) {
      fail("validator_live_invocation_invalid");
    }
  }
  return Object.freeze({ active, invocation_id: invocationId });
}

function waitRestart(service, before) {
  requireRun(
    ["systemctl", "--user", "restart", service],
    "validator_live_service_restart_failed",
    { timeout: 30000 },
  );
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const current = serviceObservation(service);
      if (
        current.active &&
        current.invocation_id &&
        (!before || current.invocation_id !== before)
      ) {
        return current;
      }
    } catch {}
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }
  fail("validator_live_service_restart_not_stable");
}

function statMode(file) {
  return (fs.statSync(file).mode & 0o777).toString(8).padStart(3, "0");
}

export function voidValidatorManifestSetIdentityV1(dir) {
  const real = fs.realpathSync(dir);
  const names = fs
    .readdirSync(real)
    .filter((name) => MANIFEST.test(name))
    .sort();
  if (names.length === 0) fail("validator_live_manifest_set_empty");
  let total = 0;
  const entries = [];
  for (const name of names) {
    const match = name.match(MANIFEST);
    const bytes = fs.readFileSync(path.join(real, name));
    total += bytes.length;
    if (total > MAX_MANIFEST_BYTES) fail("validator_live_manifest_set_too_large");
    let value;
    try {
      value = JSON.parse(bytes.toString("utf8"));
    } catch {
      fail("validator_live_manifest_json_invalid:" + name);
    }
    const epoch = Number(match[1]);
    if (!Number.isSafeInteger(epoch) || Number(value.epoch) !== epoch) {
      fail("validator_live_manifest_epoch_mismatch:" + name);
    }
    const requestedStart = Number(value.requestedStartSlot);
    const requestedEnd = Number(value.requestedEndSlotExclusive);
    const publishedStart = Number(value.publishedStartSlot);
    const publishedEnd = Number(value.publishedEndSlotExclusive);
    const schedule = Array.isArray(value.scheduleWindow) ? value.scheduleWindow : [];
    if (
      !Number.isSafeInteger(requestedStart) ||
      !Number.isSafeInteger(requestedEnd) ||
      requestedEnd < requestedStart ||
      requestedStart !== publishedStart ||
      requestedEnd !== publishedEnd ||
      schedule.length !== requestedEnd - requestedStart
    ) {
      fail("validator_live_manifest_window_invalid:" + name);
    }
    const slots = schedule.map((entry) => Number(entry?.slot));
    for (let i = 0; i < slots.length; i += 1) {
      if (slots[i] !== requestedStart + i) {
        fail("validator_live_manifest_slot_sequence_invalid:" + name);
      }
    }
    entries.push(
      Object.freeze({
        name,
        bytes: bytes.length,
        sha256: sha256(bytes),
        epoch,
      }),
    );
  }
  const material = Object.freeze({
    marker: "VOID_VALIDATOR_MANIFEST_SET_IDENTITY_V1",
    version: 1,
    entries,
  });
  return Object.freeze({
    dir: real,
    entries,
    total_bytes: total,
    sha256: sha256(Buffer.from(canonical(material), "utf8")),
  });
}

function verifiedCurrentDetail(root) {
  const runtimeRoot = path.join(root, ".runtime", "validator_epoch_manifests");
  const link = path.join(runtimeRoot, "verified-current");
  let st;
  try {
    st = fs.lstatSync(link);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    return Object.freeze({
      exists: false,
      identity_sha256: null,
      link_target: null,
      resolved_target: null,
      manifest_set_sha256: null,
    });
  }
  if (!st.isSymbolicLink()) fail("validator_live_verified_current_not_symlink");
  const linkTarget = fs.readlinkSync(link);
  const resolved = fs.realpathSync(link);
  const rel = path.relative(runtimeRoot, resolved);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
    fail("validator_live_verified_current_escapes_runtime_root");
  }
  const manifest = voidValidatorManifestSetIdentityV1(resolved);
  const material = {
    exists: true,
    link_target: linkTarget,
    resolved_target: resolved,
    manifest_set_sha256: manifest.sha256,
  };
  return Object.freeze({
    ...material,
    identity_sha256: sha256(Buffer.from(canonical(material), "utf8")),
  });
}

function shadowDetail(root) {
  const file = path.join(
    root,
    ".runtime",
    "validator_runtime_truth_shadow",
    "latest.json",
  );
  let st;
  try {
    st = fs.lstatSync(file);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    const material = { exists: false, sha256: null, mode: null, bytes: 0 };
    return Object.freeze({
      ...material,
      bytes_base64: null,
      identity_sha256: sha256(Buffer.from(canonical(material), "utf8")),
    });
  }
  if (!st.isFile() || st.size > MAX_SHADOW_BYTES) {
    fail("validator_live_shadow_file_invalid");
  }
  const bytes = fs.readFileSync(file);
  const material = {
    exists: true,
    sha256: sha256(bytes),
    mode: statMode(file),
    bytes: bytes.length,
  };
  return Object.freeze({
    ...material,
    bytes_base64: bytes.toString("base64"),
    identity_sha256: sha256(Buffer.from(canonical(material), "utf8")),
  });
}

function observeParticipant(root, service) {
  const head = cleanHead(root);
  const host = os.hostname().toLowerCase();
  const verified = verifiedCurrentDetail(root);
  const shadow = shadowDetail(root);
  const svc = serviceObservation(service);
  return Object.freeze({
    host,
    repository_head_sha: head,
    verified_current: verified,
    shadow,
    service: svc,
  });
}

function genericPrestate(detail) {
  return Object.freeze({
    host: detail.host,
    repository_head_sha: detail.repository_head_sha,
    verified_current: Object.freeze({
      exists: detail.verified_current.exists,
      identity_sha256: detail.verified_current.identity_sha256,
    }),
    shadow_runtime_identity_sha256: detail.shadow.identity_sha256,
    service: Object.freeze({
      active: detail.service.active,
      invocation_id: detail.service.invocation_id,
    }),
  });
}

function prestateId(value) {
  return "sha256:" + sha256(Buffer.from(canonical(value), "utf8"));
}

function equalObservationPrestate(observed, expected) {
  return canonical(observed) === canonical(expected);
}

function stagePayloadFromDir(dir) {
  const identity = voidValidatorManifestSetIdentityV1(dir);
  const files = identity.entries.map((entry) => {
    const bytes = fs.readFileSync(path.join(identity.dir, entry.name));
    return Object.freeze({
      name: entry.name,
      sha256: entry.sha256,
      bytes_base64: bytes.toString("base64"),
    });
  });
  return Object.freeze({
    manifest_set_sha256: identity.sha256,
    total_bytes: identity.total_bytes,
    files,
  });
}

function writeStagePayload(dir, payload) {
  exactObject(
    payload,
    ["manifest_set_sha256", "total_bytes", "files"],
    "validator_live_stage_payload_shape",
  );
  if (!SHA.test(String(payload.manifest_set_sha256 || ""))) {
    fail("validator_live_stage_payload_sha_invalid");
  }
  if (!Array.isArray(payload.files) || payload.files.length === 0) {
    fail("validator_live_stage_payload_files_invalid");
  }
  mkdirPrivate(dir);
  let total = 0;
  const seen = new Set();
  for (const item of payload.files) {
    exactObject(
      item,
      ["name", "sha256", "bytes_base64"],
      "validator_live_stage_payload_file_shape",
    );
    if (!MANIFEST.test(String(item.name || "")) || seen.has(item.name)) {
      fail("validator_live_stage_payload_name_invalid");
    }
    seen.add(item.name);
    if (!SHA.test(String(item.sha256 || ""))) {
      fail("validator_live_stage_payload_file_sha_invalid");
    }
    const bytes = Buffer.from(String(item.bytes_base64 || ""), "base64");
    total += bytes.length;
    if (total > MAX_MANIFEST_BYTES) fail("validator_live_stage_payload_too_large");
    if (sha256(bytes) !== item.sha256) fail("validator_live_stage_payload_file_mismatch");
    const dest = path.join(dir, item.name);
    if (fs.existsSync(dest)) {
      const existing = fs.readFileSync(dest);
      if (sha256(existing) !== item.sha256) fail("validator_live_stage_conflict");
    } else {
      atomicWriteFile(dest, bytes, 0o600);
    }
  }
  const identity = voidValidatorManifestSetIdentityV1(dir);
  if (identity.sha256 !== payload.manifest_set_sha256) {
    fail("validator_live_stage_identity_mismatch");
  }
  return identity;
}

function txRuntimeDir(root, transactionId) {
  if (!TX_ID.test(String(transactionId || ""))) fail("validator_live_tx_id_invalid");
  return path.join(root, ".runtime", "validator_crossbox_transactions", transactionId);
}

function participantStatePath(root, transactionId, participant) {
  return path.join(
    txRuntimeDir(root, transactionId),
    "participant-" + participant + ".json",
  );
}

function coordinatorStatePath(root, transactionId) {
  return path.join(txRuntimeDir(root, transactionId), "coordinator.json");
}

function checkpointAuthorizationPath(root, transactionId) {
  return path.join(
    txRuntimeDir(root, transactionId),
    "checkpoint-authorization.json",
  );
}

function loadParticipantState(root, transactionId, participant) {
  const file = participantStatePath(root, transactionId, participant);
  const value = readJson(file);
  if (
    value.marker !== "VOID_VALIDATOR_CROSSBOX_PARTICIPANT_STATE_V1" ||
    value.version !== 1 ||
    value.transaction_id !== transactionId ||
    value.participant !== participant
  ) {
    fail("validator_live_participant_state_invalid");
  }
  return value;
}

function saveParticipantState(root, state) {
  atomicWriteJson(
    participantStatePath(root, state.transaction_id, state.participant),
    state,
  );
}

function expectedParticipantRequest(request) {
  if (
    request.confirmation !== VOID_VALIDATOR_CROSSBOX_PARTICIPANT_CONFIRMATION_V1
  ) {
    fail("validator_live_participant_confirmation_required");
  }
  const participant = String(request.participant || "");
  if (!["local", "remote"].includes(participant)) {
    fail("validator_live_participant_invalid");
  }
  const service = validService(request.service);
  const httpBase = validHttpBase(request.http_base);
  const head = String(request.repository_head_sha || "").toLowerCase();
  if (!HEAD.test(head)) fail("validator_live_participant_head_invalid");
  return { participant, service, httpBase, head };
}

async function httpJson(base, suffix) {
  const url = base + suffix;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "error",
      signal: controller.signal,
      headers: { "user-agent": "void-validator-crossbox-v1" },
    });
    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      return { ok: false, code: response.status, payload: null };
    }
    return { ok: response.status === 200, code: response.status, payload };
  } catch (error) {
    return { ok: false, code: null, payload: null, error: String(error) };
  } finally {
    clearTimeout(timer);
  }
}

function atomicSymlink(linkPath, target) {
  const dir = path.dirname(linkPath);
  fs.mkdirSync(dir, { recursive: true });
  try {
    const st = fs.lstatSync(linkPath);
    if (!st.isSymbolicLink()) fail("validator_live_verified_current_collision");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const tmp = linkPath + ".next";
  try {
    fs.unlinkSync(tmp);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  fs.symlinkSync(target, tmp);
  fs.renameSync(tmp, linkPath);
  fsyncDirectory(dir);
}

function restoreVerifiedCurrent(root, expected) {
  const runtimeRoot = path.join(root, ".runtime", "validator_epoch_manifests");
  const link = path.join(runtimeRoot, "verified-current");
  if (!expected.exists) {
    try {
      const st = fs.lstatSync(link);
      if (!st.isSymbolicLink()) fail("validator_live_restore_verified_collision");
      fs.unlinkSync(link);
      fsyncDirectory(runtimeRoot);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    return;
  }
  if (
    typeof expected.link_target !== "string" ||
    !expected.link_target ||
    typeof expected.resolved_target !== "string" ||
    !SHA.test(String(expected.manifest_set_sha256 || ""))
  ) {
    fail("validator_live_restore_verified_prestate_invalid");
  }
  const currentIdentity = voidValidatorManifestSetIdentityV1(expected.resolved_target);
  if (currentIdentity.sha256 !== expected.manifest_set_sha256) {
    fail("validator_live_restore_verified_source_drift");
  }
  atomicSymlink(link, expected.link_target);
  const restored = verifiedCurrentDetail(root);
  if (canonical(restored) !== canonical(expected)) {
    fail("validator_live_restore_verified_mismatch");
  }
}

function restoreShadow(root, expected) {
  const file = path.join(
    root,
    ".runtime",
    "validator_runtime_truth_shadow",
    "latest.json",
  );
  if (!expected.exists) {
    try {
      const st = fs.lstatSync(file);
      if (!st.isFile()) fail("validator_live_restore_shadow_collision");
      fs.unlinkSync(file);
      fsyncDirectory(path.dirname(file));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  } else {
    const bytes = Buffer.from(String(expected.bytes_base64 || ""), "base64");
    if (bytes.length !== expected.bytes || sha256(bytes) !== expected.sha256) {
      fail("validator_live_restore_shadow_snapshot_invalid");
    }
    const mode = Number.parseInt(String(expected.mode || ""), 8);
    if (!Number.isInteger(mode)) fail("validator_live_restore_shadow_mode_invalid");
    atomicWriteFile(file, bytes, mode);
  }
  const restored = shadowDetail(root);
  if (canonical(restored) !== canonical(expected)) {
    fail("validator_live_restore_shadow_mismatch");
  }
}

function participantPrestateMatches(root, service, expected) {
  const observed = observeParticipant(root, service);
  return {
    matches: equalObservationPrestate(observed, expected),
    observed,
  };
}

function participantIntendedMatches(observed, manifestSetSha, stageDir) {
  return (
    observed.verified_current.exists === true &&
    observed.verified_current.manifest_set_sha256 === manifestSetSha &&
    observed.verified_current.resolved_target === fs.realpathSync(stageDir)
  );
}

function publishedObservationMatches(state, observed) {
  const expectedActive = state.prestate.service.active;
  if (
    !participantIntendedMatches(
      observed,
      state.manifest_set_sha256,
      state.stage_dir,
    ) ||
    observed.service.active !== expectedActive
  ) {
    return false;
  }
  if (!expectedActive) return observed.service.invocation_id === null;
  return (
    INVOCATION.test(String(state.publish_after_invocation_id || "")) &&
    observed.service.invocation_id === state.publish_after_invocation_id
  );
}

function restoredObservationMatches(state, observed) {
  if (!filesRestoredFromObservation(state, observed)) return false;
  const expectedRestart = Boolean(
    state.publish_after_invocation_id && state.prestate.service.active,
  );
  if (!expectedRestart) {
    return (
      observed.service.active === state.prestate.service.active &&
      observed.service.invocation_id === state.prestate.service.invocation_id
    );
  }
  return (
    observed.service.active === true &&
    INVOCATION.test(String(state.restore_after_invocation_id || "")) &&
    state.restore_after_invocation_id !== state.publish_after_invocation_id &&
    observed.service.invocation_id === state.restore_after_invocation_id
  );
}

async function participantPrepare(root, request) {
  const id = expectedParticipantRequest(request);
  if (!TX_ID.test(String(request.transaction_id || ""))) fail("validator_live_tx_id_invalid");
  if (!request.prestate || typeof request.prestate !== "object") {
    fail("validator_live_participant_prestate_required");
  }
  if (cleanHead(root) !== id.head) fail("validator_live_participant_head_drift");
  const current = participantPrestateMatches(root, id.service, request.prestate);
  if (!current.matches) fail("validator_live_participant_prestate_drift_before_prepare");

  const txDir = txRuntimeDir(root, request.transaction_id);
  const stageDir = path.join(txDir, "stage-" + id.participant);
  mkdirPrivate(txDir);
  const stageIdentity = writeStagePayload(stageDir, request.stage_payload);
  if (stageIdentity.sha256 !== request.manifest_set_sha256) {
    fail("validator_live_participant_stage_sha_mismatch");
  }

  const nextState = {
    marker: "VOID_VALIDATOR_CROSSBOX_PARTICIPANT_STATE_V1",
    version: 1,
    transaction_id: request.transaction_id,
    participant: id.participant,
    repository_head_sha: id.head,
    service: id.service,
    http_base: id.httpBase,
    prestate: clone(request.prestate),
    manifest_set_sha256: request.manifest_set_sha256,
    stage_dir: stageDir,
    phase: "PREPARED",
    publish_after_invocation_id: null,
    restore_after_invocation_id: null,
  };
  const stateFile = participantStatePath(root, request.transaction_id, id.participant);
  if (fs.existsSync(stateFile)) {
    const existing = loadParticipantState(root, request.transaction_id, id.participant);
    const comparableExisting = clone(existing);
    const comparableNext = clone(nextState);
    comparableExisting.phase = "PREPARED";
    comparableExisting.publish_after_invocation_id = null;
    comparableExisting.restore_after_invocation_id = null;
    if (
      !["PREPARED", "PUBLISH_STARTED", "PUBLISHED", "RESTORE_STARTED", "RESTORED"].includes(
        existing.phase,
      ) ||
      canonical(comparableExisting) !== canonical(comparableNext)
    ) {
      fail("validator_live_participant_prepare_state_conflict");
    }
  } else {
    saveParticipantState(root, nextState);
  }

  const generic = genericPrestate(request.prestate);
  return {
    transaction_id: request.transaction_id,
    participant: id.participant,
    prestate_id: prestateId(generic),
    staged_state_sha256: request.manifest_set_sha256,
    publication_performed: false,
  };
}

function participantPublishStartedState(root, state) {
  if (state.phase === "PREPARED") {
    const next = { ...state, phase: "PUBLISH_STARTED" };
    saveParticipantState(root, next);
    return next;
  }
  if (["PUBLISH_STARTED", "PUBLISHED"].includes(state.phase)) return state;
  fail("validator_live_participant_publish_phase_invalid");
}

function publishReceiptFromObservation(state, observed) {
  const active = state.prestate.service.active;
  return {
    transaction_id: state.transaction_id,
    participant: state.participant,
    prestate_id_before_publish: prestateId(genericPrestate(state.prestate)),
    published_state_sha256: state.manifest_set_sha256,
    restart_performed: active,
    restart_before_invocation_id: active
      ? state.prestate.service.invocation_id
      : null,
    restart_after_invocation_id: active ? observed.service.invocation_id : null,
  };
}

function publishNoEffectReceipt(state, observed) {
  return {
    transaction_id: state.transaction_id,
    participant: state.participant,
    observed_prestate_id: prestateId(genericPrestate(state.prestate)),
    service_active: observed.service.active,
    service_invocation_id: observed.service.invocation_id,
    publication_performed: false,
    restart_performed: false,
  };
}

function performOrRecoverPublish(root, state, allowMutation) {
  const before = observeParticipant(root, state.service);
  const prestateExact = equalObservationPrestate(before, state.prestate);
  const intended = participantIntendedMatches(
    before,
    state.manifest_set_sha256,
    state.stage_dir,
  );
  const expectedActive = state.prestate.service.active;

  if (prestateExact) {
    if (!allowMutation) {
      return { outcome: "NO_EFFECT", receipt: publishNoEffectReceipt(state, before) };
    }
    const link = path.join(
      root,
      ".runtime",
      "validator_epoch_manifests",
      "verified-current",
    );
    atomicSymlink(link, state.stage_dir);
  } else if (!intended) {
    return {
      outcome: "HOLD",
      reason: "validator_live_publish_recovery_state_ambiguous",
    };
  }

  let current = observeParticipant(root, state.service);
  if (
    !participantIntendedMatches(
      current,
      state.manifest_set_sha256,
      state.stage_dir,
    )
  ) {
    return {
      outcome: "HOLD",
      reason: "validator_live_publish_target_not_observed",
    };
  }

  if (expectedActive) {
    const beforeInvocation = state.prestate.service.invocation_id;
    if (!current.service.active) {
      return {
        outcome: "HOLD",
        reason: "validator_live_publish_service_became_inactive",
      };
    }
    if (current.service.invocation_id === beforeInvocation) {
      current = {
        ...current,
        service: waitRestart(state.service, beforeInvocation),
      };
      current = observeParticipant(root, state.service);
    }
    if (
      !current.service.active ||
      current.service.invocation_id === beforeInvocation
    ) {
      return {
        outcome: "HOLD",
        reason: "validator_live_publish_restart_not_advanced",
      };
    }
  } else if (current.service.active) {
    return {
      outcome: "HOLD",
      reason: "validator_live_publish_inactive_service_started",
    };
  }

  const nextState = {
    ...state,
    phase: "PUBLISHED",
    publish_after_invocation_id: current.service.invocation_id,
  };
  saveParticipantState(root, nextState);
  return { outcome: "PUBLISHED", receipt: publishReceiptFromObservation(nextState, current) };
}

function participantPublish(root, request) {
  const id = expectedParticipantRequest(request);
  const state = loadParticipantState(root, request.transaction_id, id.participant);
  if (
    state.repository_head_sha !== id.head ||
    state.service !== id.service ||
    state.http_base !== id.httpBase
  ) {
    fail("validator_live_participant_publish_binding_mismatch");
  }
  const started = participantPublishStartedState(root, state);
  return performOrRecoverPublish(root, started, true);
}

function participantRecoverPublish(root, request) {
  const id = expectedParticipantRequest(request);
  const state = loadParticipantState(root, request.transaction_id, id.participant);
  if (
    state.repository_head_sha !== id.head ||
    state.service !== id.service ||
    state.http_base !== id.httpBase
  ) {
    fail("validator_live_participant_recover_publish_binding_mismatch");
  }
  if (state.phase === "PUBLISHED") {
    const observed = observeParticipant(root, state.service);
    if (!publishedObservationMatches(state, observed)) {
      return {
        outcome: "HOLD",
        reason: "validator_live_published_state_drift",
      };
    }
    return {
      outcome: "PUBLISHED",
      receipt: publishReceiptFromObservation(state, observed),
    };
  }
  const started = participantPublishStartedState(root, state);
  return performOrRecoverPublish(root, started, false);
}

async function participantVerify(root, request) {
  const id = expectedParticipantRequest(request);
  const state = loadParticipantState(root, request.transaction_id, id.participant);
  if (state.phase !== "PUBLISHED") {
    return { outcome: "MISMATCH", reason: "validator_live_verify_requires_published" };
  }

  if (request.refresh_shadow === true) {
    const result = run(
      [path.join(root, "ops/mainnet/validator-runtime-truth-shadow-run.sh"),
        path.join(root, ".runtime", "validator_epoch_manifests", "verified-current")],
      {
        cwd: root,
        env: {
          ...process.env,
          BASE: state.http_base,
        },
        timeout: 120000,
      },
    );
    if (result.status !== 0) {
      return {
        outcome: "MISMATCH",
        reason: "validator_live_shadow_refresh_failed",
      };
    }
  } else if (request.refresh_shadow !== false) {
    fail("validator_live_refresh_shadow_flag_invalid");
  }

  const observed = observeParticipant(root, state.service);
  if (
    !participantIntendedMatches(
      observed,
      state.manifest_set_sha256,
      state.stage_dir,
    )
  ) {
    return {
      outcome: "MISMATCH",
      reason: "validator_live_verify_manifest_identity_mismatch",
    };
  }
  if (observed.service.active !== state.prestate.service.active) {
    return {
      outcome: "MISMATCH",
      reason: "validator_live_verify_service_posture_mismatch",
    };
  }
  if (
    observed.service.active &&
    observed.service.invocation_id !== state.publish_after_invocation_id
  ) {
    return {
      outcome: "MISMATCH",
      reason: "validator_live_verify_invocation_drift",
    };
  }

  const status = await httpJson(state.http_base, "/__void/runtime/validator-truth/status");
  const epoch = await httpJson(
    state.http_base,
    "/__void/runtime/validator-truth/epoch/" + String(request.epoch),
  );
  if (
    !status.ok ||
    status.payload?.ok !== true ||
    status.payload?.configuredMode !== "verified_epoch_manifests" ||
    status.payload?.mode !== "verified_epoch_manifests" ||
    Number(status.payload?.latestEpoch) !== Number(request.epoch) ||
    !epoch.ok ||
    Number(epoch.payload?.summary?.epoch) !== Number(request.epoch)
  ) {
    return {
      outcome: "MISMATCH",
      reason: "validator_live_runtime_endpoint_mismatch",
    };
  }

  return {
    outcome: "VERIFIED",
    receipt: {
      transaction_id: state.transaction_id,
      participant: state.participant,
      observed_state_sha256: state.manifest_set_sha256,
      service_active: observed.service.active,
      service_invocation_id: observed.service.invocation_id,
      intended_state_verified: true,
    },
  };
}

function restoreReceiptFromObservation(state, observed, restartPerformed, before) {
  return {
    transaction_id: state.transaction_id,
    participant: state.participant,
    restored_prestate_id: prestateId(genericPrestate(state.prestate)),
    service_state_restored: true,
    restart_performed: restartPerformed,
    restart_before_invocation_id: restartPerformed ? before : null,
    restart_after_invocation_id: restartPerformed
      ? observed.service.invocation_id
      : null,
    verified_current_restored: true,
    shadow_runtime_restored: true,
  };
}

function filesRestoredFromObservation(state, observed) {
  return (
    canonical(observed.verified_current) ===
      canonical(state.prestate.verified_current) &&
    canonical(observed.shadow) === canonical(state.prestate.shadow)
  );
}

function filesRestored(root, state) {
  return filesRestoredFromObservation(
    state,
    observeParticipant(root, state.service),
  );
}

function performOrRecoverRestore(root, state, allowMutation) {
  const published = Boolean(state.publish_after_invocation_id);
  const expectedRestart = published && state.prestate.service.active;
  let observed = observeParticipant(root, state.service);
  let restoredFiles = filesRestored(root, state);

  if (!restoredFiles) {
    if (!allowMutation) {
      const intended = participantIntendedMatches(
        observed,
        state.manifest_set_sha256,
        state.stage_dir,
      );
      if (!intended) {
        return {
          outcome: "HOLD",
          reason: "validator_live_restore_recovery_state_ambiguous",
        };
      }
    }
    restoreVerifiedCurrent(root, state.prestate.verified_current);
    restoreShadow(root, state.prestate.shadow);
    restoredFiles = true;
    observed = observeParticipant(root, state.service);
  }

  if (!restoredFiles) {
    return {
      outcome: "HOLD",
      reason: "validator_live_restore_files_not_restored",
    };
  }

  if (expectedRestart) {
    const before = state.publish_after_invocation_id;
    if (!observed.service.active) {
      return {
        outcome: "HOLD",
        reason: "validator_live_restore_service_became_inactive",
      };
    }
    if (observed.service.invocation_id === before) {
      const restarted = waitRestart(state.service, before);
      observed = { ...observeParticipant(root, state.service), service: restarted };
      observed = observeParticipant(root, state.service);
    }
    if (
      !observed.service.active ||
      observed.service.invocation_id === before
    ) {
      return {
        outcome: "HOLD",
        reason: "validator_live_restore_restart_not_advanced",
      };
    }
    const nextState = {
      ...state,
      phase: "RESTORED",
      restore_after_invocation_id: observed.service.invocation_id,
    };
    saveParticipantState(root, nextState);
    return {
      outcome: "RESTORED",
      receipt: restoreReceiptFromObservation(
        nextState,
        observed,
        true,
        before,
      ),
    };
  }

  if (
    observed.service.active !== state.prestate.service.active ||
    observed.service.invocation_id !== state.prestate.service.invocation_id
  ) {
    return {
      outcome: "HOLD",
      reason: "validator_live_restore_service_posture_drift",
    };
  }
  const nextState = { ...state, phase: "RESTORED" };
  saveParticipantState(root, nextState);
  return {
    outcome: "RESTORED",
    receipt: restoreReceiptFromObservation(nextState, observed, false, null),
  };
}

function participantRestore(root, request) {
  const id = expectedParticipantRequest(request);
  const state = loadParticipantState(root, request.transaction_id, id.participant);
  if (
    state.repository_head_sha !== id.head ||
    state.service !== id.service ||
    state.http_base !== id.httpBase
  ) {
    fail("validator_live_participant_restore_binding_mismatch");
  }
  let started = state;
  if (!["RESTORE_STARTED", "RESTORED"].includes(state.phase)) {
    started = { ...state, phase: "RESTORE_STARTED" };
    saveParticipantState(root, started);
  }
  if (started.phase === "RESTORED") {
    const observed = observeParticipant(root, started.service);
    if (!restoredObservationMatches(started, observed)) {
      return {
        outcome: "HOLD",
        reason: "validator_live_restored_state_drift",
      };
    }
    const restarted = Boolean(
      started.publish_after_invocation_id &&
      started.prestate.service.active,
    );
    return {
      outcome: "RESTORED",
      receipt: restoreReceiptFromObservation(
        started,
        observed,
        restarted,
        restarted ? started.publish_after_invocation_id : null,
      ),
    };
  }
  return performOrRecoverRestore(root, started, true);
}

function participantRecoverRestore(root, request) {
  const id = expectedParticipantRequest(request);
  const state = loadParticipantState(root, request.transaction_id, id.participant);
  if (
    state.repository_head_sha !== id.head ||
    state.service !== id.service ||
    state.http_base !== id.httpBase
  ) {
    fail("validator_live_participant_recover_restore_binding_mismatch");
  }
  let started = state;
  if (!["RESTORE_STARTED", "RESTORED"].includes(state.phase)) {
    started = { ...state, phase: "RESTORE_STARTED" };
    saveParticipantState(root, started);
  }
  if (started.phase === "RESTORED") {
    const observed = observeParticipant(root, started.service);
    if (!restoredObservationMatches(started, observed)) {
      return {
        outcome: "HOLD",
        reason: "validator_live_restored_state_drift",
      };
    }
    const restarted = Boolean(
      started.publish_after_invocation_id &&
      started.prestate.service.active,
    );
    return {
      outcome: "RESTORED",
      receipt: restoreReceiptFromObservation(
        started,
        observed,
        restarted,
        restarted ? started.publish_after_invocation_id : null,
      ),
    };
  }
  return performOrRecoverRestore(root, started, false);
}

function participantRequestBase(state, participant) {
  const plan = state.plan.participants[participant];
  return {
    confirmation: VOID_VALIDATOR_CROSSBOX_PARTICIPANT_CONFIRMATION_V1,
    participant,
    transaction_id: state.journal.transaction.transaction_id,
    repository_head_sha: state.plan.repository_head_sha,
    service: plan.service,
    http_base: plan.http_base,
  };
}

function sshJson(target, request) {
  const command =
    'cd "$HOME/dev/void-node" && exec node ops/mainnet/void-validator-crossbox-transaction-run-v1.mjs participant';
  const result = run(
    ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=8", target, command],
    {
      input: JSON.stringify(request) + "\n",
      timeout: 150000,
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    const detail = String(result.stderr || "").trim().slice(0, 1000);
    fail("validator_live_remote_transport_failed" + (detail ? ":" + detail : ""));
  }
  try {
    return JSON.parse(String(result.stdout || ""));
  } catch {
    fail("validator_live_remote_response_invalid");
  }
}

function localParticipantDispatch(request) {
  return participantDispatch(ROOT, request);
}

async function participantDispatch(root, request) {
  switch (request.op) {
    case "observe": {
      if (
        request.confirmation !== VOID_VALIDATOR_CROSSBOX_PARTICIPANT_CONFIRMATION_V1
      ) {
        fail("validator_live_participant_confirmation_required");
      }
      return observeParticipant(root, validService(request.service));
    }
    case "prepare":
      return participantPrepare(root, request);
    case "publish":
      return participantPublish(root, request);
    case "recover_publish":
      return participantRecoverPublish(root, request);
    case "verify":
      return participantVerify(root, request);
    case "restore":
      return participantRestore(root, request);
    case "recover_restore":
      return participantRecoverRestore(root, request);
    default:
      fail("validator_live_participant_op_invalid");
  }
}

function appendJournal(state, event) {
  return {
    ...state,
    journal: appendVoidValidatorCrossboxTransactionExecutorEventV1(
      state.journal,
      event,
    ),
  };
}

function participantGenericPrestate(state, participant) {
  return state.journal.transaction.prestate[participant];
}

function publishStartedEvent(state, participant) {
  const pre = participantGenericPrestate(state, participant);
  return {
    type: "PUBLISH_STARTED",
    receipt: {
      transaction_id: state.journal.transaction.transaction_id,
      participant,
      prestate_id_before_publish: prestateId(pre),
      published_state_sha256: state.journal.transaction.intended.manifest_set_sha256,
      restart_expected: pre.service.active,
      restart_before_invocation_id: pre.service.active
        ? pre.service.invocation_id
        : null,
      publication_performed: false,
    },
  };
}

function restoreStartedEvent(state, participant) {
  const tx = state.journal.transaction;
  const pre = tx.prestate[participant];
  const published = tx.published[participant];
  const restartExpected = Boolean(published && pre.service.active);
  return {
    type: "RESTORE_STARTED",
    receipt: {
      transaction_id: tx.transaction_id,
      participant,
      restored_prestate_id: prestateId(pre),
      restart_expected: restartExpected,
      restart_before_invocation_id: restartExpected
        ? published.restart_after_invocation_id
        : null,
      restoration_performed: false,
    },
  };
}

function prepareReceiptRequest(state, participant) {
  const base = participantRequestBase(state, participant);
  return {
    ...base,
    op: "prepare",
    prestate: clone(state.recovery[participant]),
    manifest_set_sha256: state.journal.transaction.intended.manifest_set_sha256,
    stage_payload: stagePayloadFromDir(state.plan.coordinator_stage_dir),
  };
}

function currentCheckpointTagAbsent(root, tag) {
  if (!CHECKPOINT.test(tag)) fail("validator_live_checkpoint_tag_invalid");
  const local = run(["git", "-C", root, "show-ref", "--verify", "--quiet", "refs/tags/" + tag]);
  if (local.status === 0) return false;
  if (local.status !== 1) fail("validator_live_checkpoint_local_tag_check_failed");
  const remote = run(
    ["git", "-C", root, "ls-remote", "--exit-code", "--tags", "origin", "refs/tags/" + tag],
    { timeout: 30000 },
  );
  if (remote.status === 0) return false;
  if (remote.status !== 2) fail("validator_live_checkpoint_remote_tag_check_failed");
  return true;
}

export function validateVoidValidatorCrossboxCoordinatorStateV1(state) {
  exactObject(
    state,
    [
      "marker",
      "version",
      "plan",
      "recovery",
      "journal",
      "checkpoint_authorization",
      "authority",
    ],
    "validator_live_coordinator_state_shape",
  );
  if (
    state.marker !== VOID_VALIDATOR_CROSSBOX_TRANSACTION_RUN_V1 ||
    state.version !== 1
  ) {
    fail("validator_live_coordinator_state_identity");
  }
  if (
    canonical(state.authority) !==
    canonical(VOID_VALIDATOR_CROSSBOX_TRANSACTION_RUN_AUTHORITY_V1)
  ) {
    fail("validator_live_coordinator_authority_mismatch");
  }
  const journal = validateVoidValidatorCrossboxTransactionExecutorJournalV1(
    state.journal,
  );
  exactObject(state.recovery, ["local", "remote"], "validator_live_recovery_shape");
  exactObject(
    state.plan,
    [
      "repository_head_sha",
      "epoch",
      "vault",
      "checkpoint_tag",
      "ssh_target",
      "coordinator_stage_dir",
      "participants",
    ],
    "validator_live_plan_shape",
  );
  if (state.plan.repository_head_sha !== journal.transaction.source.repository_head_sha) {
    fail("validator_live_plan_head_mismatch");
  }
  if (
    state.plan.epoch !== journal.transaction.intended.epoch ||
    state.plan.vault !== journal.transaction.intended.vault_name ||
    state.plan.checkpoint_tag !== journal.transaction.intended.checkpoint_tag
  ) {
    fail("validator_live_plan_intent_mismatch");
  }
  exactObject(
    state.plan.participants,
    ["local", "remote"],
    "validator_live_plan_participants_shape",
  );
  for (const participant of ["local", "remote"]) {
    const plan = state.plan.participants[participant];
    exactObject(
      plan,
      ["host", "service", "http_base", "refresh_shadow"],
      "validator_live_plan_participant_shape",
    );
    validService(plan.service);
    validHttpBase(plan.http_base);
    if (typeof plan.refresh_shadow !== "boolean") {
      fail("validator_live_plan_refresh_shadow_invalid");
    }
    const recovery = state.recovery[participant];
    const generic = genericPrestate(recovery);
    if (canonical(generic) !== canonical(journal.transaction.prestate[participant])) {
      fail("validator_live_recovery_prestate_binding_mismatch:" + participant);
    }
    if (plan.host !== generic.host) {
      fail("validator_live_plan_host_mismatch:" + participant);
    }
  }
  if (state.plan.participants.local.host === state.plan.participants.remote.host) {
    fail("validator_live_plan_hosts_not_distinct");
  }
  validSshTarget(state.plan.ssh_target);
  if (
    state.checkpoint_authorization !== null &&
    journal.transaction.phase !== "COMMITTED"
  ) {
    fail("validator_live_checkpoint_authorization_before_commit");
  }
  return state;
}

export async function driveVoidValidatorCrossboxCoordinatorV1(
  initialState,
  adapter,
  persist,
) {
  let state = validateVoidValidatorCrossboxCoordinatorStateV1(clone(initialState));
  for (let step = 0; step < MAX_STEPS; step += 1) {
    const action = state.journal.next_action;
    if (action === "DONE_COMMITTED") {
      if (state.checkpoint_authorization === null) {
        const absent = await adapter.checkpointTagAbsent(state);
        if (!absent) return state;
        const authorization =
          authorizeVoidValidatorCrossboxCheckpointPublicationV1(
            state.journal,
            {
              repository_head_sha: state.plan.repository_head_sha,
              checkpoint_tag: state.plan.checkpoint_tag,
              checkpoint_tag_absent_verified: true,
            },
          );
        state = { ...state, checkpoint_authorization: authorization };
        await persist(state);
      }
      return state;
    }
    if (action === "DONE_RESTORED" || action === "HOLD") return state;

    if (action === "PREPARE_LOCAL" || action === "PREPARE_REMOTE") {
      const participant = action.endsWith("LOCAL") ? "local" : "remote";
      const receipt = await adapter.prepare(participant, state);
      state = appendJournal(state, { type: "PREPARED", receipt });
      await persist(state);
      continue;
    }
    if (action === "BEGIN_COMMIT") {
      state = appendJournal(state, { type: "BEGIN_COMMIT" });
      await persist(state);
      continue;
    }
    if (action === "BEGIN_PUBLISH_LOCAL" || action === "BEGIN_PUBLISH_REMOTE") {
      const participant = action.endsWith("LOCAL") ? "local" : "remote";
      state = appendJournal(state, publishStartedEvent(state, participant));
      await persist(state);
      const outcome = await adapter.publish(participant, state);
      if (outcome.outcome === "HOLD") {
        state = appendJournal(state, { type: "HOLD", reason: outcome.reason });
        await persist(state);
        return state;
      }
      if (outcome.outcome !== "PUBLISHED") {
        fail("validator_live_publish_outcome_invalid");
      }
      state = appendJournal(state, { type: "PUBLISHED", receipt: outcome.receipt });
      await persist(state);
      continue;
    }
    if (action === "RECOVER_PUBLISH_LOCAL" || action === "RECOVER_PUBLISH_REMOTE") {
      const participant = action.endsWith("LOCAL") ? "local" : "remote";
      const outcome = await adapter.recoverPublish(participant, state);
      if (outcome.outcome === "HOLD") {
        state = appendJournal(state, { type: "HOLD", reason: outcome.reason });
        await persist(state);
        return state;
      }
      if (outcome.outcome === "NO_EFFECT") {
        state = appendJournal(state, {
          type: "PUBLISH_NO_EFFECT",
          receipt: outcome.receipt,
        });
        await persist(state);
        continue;
      }
      if (outcome.outcome !== "PUBLISHED") {
        fail("validator_live_recover_publish_outcome_invalid");
      }
      state = appendJournal(state, { type: "PUBLISHED", receipt: outcome.receipt });
      await persist(state);
      continue;
    }
    if (action === "VERIFY_LOCAL" || action === "VERIFY_REMOTE") {
      const participant = action.endsWith("LOCAL") ? "local" : "remote";
      const outcome = await adapter.verify(participant, state);
      if (outcome.outcome === "VERIFIED") {
        state = appendJournal(state, { type: "VERIFIED", receipt: outcome.receipt });
        await persist(state);
        continue;
      }
      if (outcome.outcome === "MISMATCH") {
        state = appendJournal(state, {
          type: "BEGIN_ROLLBACK",
          reason: String(outcome.reason || "validator runtime verification mismatch").slice(0, 256),
        });
        await persist(state);
        continue;
      }
      fail("validator_live_verify_outcome_invalid");
    }
    if (action === "FINALIZE_COMMIT") {
      const absent = await adapter.checkpointTagAbsent(state);
      if (!absent) {
        state = appendJournal(state, {
          type: "HOLD",
          reason: "checkpoint tag appeared before commit finalization",
        });
        await persist(state);
        return state;
      }
      state = appendJournal(state, {
        type: "FINALIZE_COMMIT",
        checkpoint_tag_absent_verified: true,
      });
      await persist(state);
      continue;
    }
    if (action === "BEGIN_ROLLBACK") {
      state = appendJournal(state, {
        type: "BEGIN_ROLLBACK",
        reason: "publication outcome required rollback",
      });
      await persist(state);
      continue;
    }
    if (action === "BEGIN_RESTORE_LOCAL" || action === "BEGIN_RESTORE_REMOTE") {
      const participant = action.endsWith("LOCAL") ? "local" : "remote";
      state = appendJournal(state, restoreStartedEvent(state, participant));
      await persist(state);
      const outcome = await adapter.restore(participant, state);
      if (outcome.outcome === "HOLD") {
        state = appendJournal(state, { type: "HOLD", reason: outcome.reason });
        await persist(state);
        return state;
      }
      if (outcome.outcome !== "RESTORED") {
        fail("validator_live_restore_outcome_invalid");
      }
      state = appendJournal(state, { type: "RESTORED", receipt: outcome.receipt });
      await persist(state);
      continue;
    }
    if (action === "RECOVER_RESTORE_LOCAL" || action === "RECOVER_RESTORE_REMOTE") {
      const participant = action.endsWith("LOCAL") ? "local" : "remote";
      const outcome = await adapter.recoverRestore(participant, state);
      if (outcome.outcome === "HOLD") {
        state = appendJournal(state, { type: "HOLD", reason: outcome.reason });
        await persist(state);
        return state;
      }
      if (outcome.outcome !== "RESTORED") {
        fail("validator_live_recover_restore_outcome_invalid");
      }
      state = appendJournal(state, { type: "RESTORED", receipt: outcome.receipt });
      await persist(state);
      continue;
    }
    if (action === "FINALIZE_RESTORE") {
      state = appendJournal(state, { type: "FINALIZE_RESTORE" });
      await persist(state);
      continue;
    }
    fail("validator_live_unknown_next_action:" + action);
  }
  fail("validator_live_step_limit");
}

function liveAdapter() {
  return {
    async prepare(participant, state) {
      const request = prepareReceiptRequest(state, participant);
      request.op = "prepare";
      return participant === "local"
        ? localParticipantDispatch(request)
        : sshJson(state.plan.ssh_target, request);
    },
    async publish(participant, state) {
      const request = {
        ...participantRequestBase(state, participant),
        op: "publish",
      };
      return participant === "local"
        ? localParticipantDispatch(request)
        : sshJson(state.plan.ssh_target, request);
    },
    async recoverPublish(participant, state) {
      const request = {
        ...participantRequestBase(state, participant),
        op: "recover_publish",
      };
      return participant === "local"
        ? localParticipantDispatch(request)
        : sshJson(state.plan.ssh_target, request);
    },
    async verify(participant, state) {
      const request = {
        ...participantRequestBase(state, participant),
        op: "verify",
        epoch: state.plan.epoch,
        refresh_shadow: state.plan.participants[participant].refresh_shadow,
      };
      return participant === "local"
        ? localParticipantDispatch(request)
        : sshJson(state.plan.ssh_target, request);
    },
    async restore(participant, state) {
      const request = {
        ...participantRequestBase(state, participant),
        op: "restore",
      };
      return participant === "local"
        ? localParticipantDispatch(request)
        : sshJson(state.plan.ssh_target, request);
    },
    async recoverRestore(participant, state) {
      const request = {
        ...participantRequestBase(state, participant),
        op: "recover_restore",
      };
      return participant === "local"
        ? localParticipantDispatch(request)
        : sshJson(state.plan.ssh_target, request);
    },
    async checkpointTagAbsent(state) {
      return currentCheckpointTagAbsent(ROOT, state.plan.checkpoint_tag);
    },
  };
}

function tagForEpoch(epoch) {
  const d = new Date();
  const stamp = d
    .toISOString()
    .replace(/[-:]/gu, "")
    .replace(/\.\d{3}Z$/u, "Z");
  const tag = "ckpt-validator" + String(epoch) + "-crossbox-green-" + stamp;
  if (!CHECKPOINT.test(tag)) fail("validator_live_checkpoint_tag_invalid");
  return tag;
}

function copyCoordinatorStage(txDir, sourceDir) {
  const payload = stagePayloadFromDir(sourceDir);
  const stage = path.join(txDir, "coordinator-stage");
  writeStagePayload(stage, payload);
  return { stage, payload };
}

async function remoteObserve(sshTarget, service, httpBase) {
  return sshJson(sshTarget, {
    op: "observe",
    confirmation: VOID_VALIDATOR_CROSSBOX_PARTICIPANT_CONFIRMATION_V1,
    participant: "remote",
    transaction_id: "voidxmtx1_" + "0".repeat(64),
    repository_head_sha: "0".repeat(40),
    service,
    http_base: httpBase,
  });
}

function parseArgs(argv) {
  const values = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) fail("validator_live_cli_argument_invalid");
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) {
      fail("validator_live_cli_argument_value_missing:" + key);
    }
    values[key.slice(2)] = value;
    i += 1;
  }
  return values;
}

async function newCoordinatorState(args) {
  if (args.confirm !== VOID_VALIDATOR_CROSSBOX_TRANSACTION_RUN_CONFIRMATION_V1) {
    fail("validator_live_run_confirmation_required");
  }
  const epoch = Number(args.epoch);
  if (!Number.isSafeInteger(epoch) || epoch < 1 || epoch > 999999) {
    fail("validator_live_epoch_invalid");
  }
  const vault = String(args.vault || "");
  if (!SAFE_VAULT.test(vault)) fail("validator_live_vault_invalid");
  const sshTarget = validSshTarget(args["ssh-target"]);
  const localService = validService(args["local-service"]);
  const remoteService = validService(args["remote-service"]);
  const localBase = validHttpBase(args["local-base"]);
  const remoteBase = validHttpBase(args["remote-base"]);
  const sourceDir = fs.realpathSync(String(args["source-dir"] || ""));
  const manifest = voidValidatorManifestSetIdentityV1(sourceDir);
  const epochs = manifest.entries.map((entry) => entry.epoch);
  if (!epochs.includes(epoch) || Math.max(...epochs) !== epoch) {
    fail("validator_live_source_target_epoch_mismatch");
  }

  const local = observeParticipant(ROOT, localService);
  const remote = await remoteObserve(sshTarget, remoteService, remoteBase);
  if (
    local.repository_head_sha !== remote.repository_head_sha ||
    local.host === remote.host
  ) {
    fail("validator_live_crossbox_source_identity_mismatch");
  }
  if (!local.service.active || !remote.service.active) {
    fail("validator_live_closeout_requires_active_runtime_endpoints");
  }

  const tag = tagForEpoch(epoch);
  if (!currentCheckpointTagAbsent(ROOT, tag)) {
    fail("validator_live_checkpoint_tag_preexisting");
  }

  const initialJournal = replayVoidValidatorCrossboxTransactionExecutorV1({
    prepare: {
      source: {
        repository_head_sha: local.repository_head_sha,
        local_host: local.host,
        remote_host: remote.host,
      },
      prestate: {
        local: genericPrestate(local),
        remote: genericPrestate(remote),
      },
      intended: {
        epoch,
        vault_name: vault,
        manifest_set_sha256: manifest.sha256,
        checkpoint_tag: tag,
        checkpoint_tag_preexisting: false,
      },
      confirmation:
        VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_CONFIRMATION_V1,
    },
    events: [],
  });

  const transactionId = initialJournal.transaction.transaction_id;
  const txDir = txRuntimeDir(ROOT, transactionId);
  mkdirPrivate(txDir);
  const { stage } = copyCoordinatorStage(txDir, sourceDir);

  const state = {
    marker: VOID_VALIDATOR_CROSSBOX_TRANSACTION_RUN_V1,
    version: 1,
    plan: {
      repository_head_sha: local.repository_head_sha,
      epoch,
      vault,
      checkpoint_tag: tag,
      ssh_target: sshTarget,
      coordinator_stage_dir: stage,
      participants: {
        local: {
          host: initialJournal.transaction.source.local_host,
          service: localService,
          http_base: localBase,
          refresh_shadow: true,
        },
        remote: {
          host: initialJournal.transaction.source.remote_host,
          service: remoteService,
          http_base: remoteBase,
          refresh_shadow: false,
        },
      },
    },
    recovery: {
      local: clone(local),
      remote: clone(remote),
    },
    journal: initialJournal,
    checkpoint_authorization: null,
    authority: VOID_VALIDATOR_CROSSBOX_TRANSACTION_RUN_AUTHORITY_V1,
  };
  validateVoidValidatorCrossboxCoordinatorStateV1(state);
  return state;
}

async function persistCoordinator(state) {
  validateVoidValidatorCrossboxCoordinatorStateV1(state);
  const file = coordinatorStatePath(
    ROOT,
    state.journal.transaction.transaction_id,
  );
  atomicWriteJson(file, state);
  if (state.checkpoint_authorization !== null) {
    atomicWriteJson(
      checkpointAuthorizationPath(
        ROOT,
        state.journal.transaction.transaction_id,
      ),
      state.checkpoint_authorization,
    );
  }
}

function loadCoordinator(transactionId) {
  const state = readJson(coordinatorStatePath(ROOT, transactionId));
  return validateVoidValidatorCrossboxCoordinatorStateV1(state);
}

function printCoordinator(state) {
  console.log(VOID_VALIDATOR_CROSSBOX_TRANSACTION_RUN_V1);
  console.log("transaction_id=" + state.journal.transaction.transaction_id);
  console.log("phase=" + state.journal.transaction.phase);
  console.log("next_action=" + state.journal.next_action);
  console.log(
    "checkpoint_authorization=" +
      String(state.checkpoint_authorization?.authorization_id ?? null),
  );
  console.log("checkpoint_tag=" + state.plan.checkpoint_tag);
  console.log("checkpoint_tag_creation=false");
  console.log("git_push=false");
  console.log("transaction_broadcast=false");
  console.log("funds_movement=false");
}

async function cliRun(args) {
  const state = await newCoordinatorState(args);
  await persistCoordinator(state);
  printCoordinator(state);
  const final = await driveVoidValidatorCrossboxCoordinatorV1(
    state,
    liveAdapter(),
    persistCoordinator,
  );
  printCoordinator(final);
}

async function cliResume(args) {
  if (args.confirm !== VOID_VALIDATOR_CROSSBOX_TRANSACTION_RUN_CONFIRMATION_V1) {
    fail("validator_live_run_confirmation_required");
  }
  const transactionId = String(args.resume || "");
  if (!TX_ID.test(transactionId)) fail("validator_live_resume_tx_invalid");
  const state = loadCoordinator(transactionId);
  if (cleanHead(ROOT) !== state.plan.repository_head_sha) {
    fail("validator_live_resume_source_head_drift");
  }
  const final = await driveVoidValidatorCrossboxCoordinatorV1(
    state,
    liveAdapter(),
    persistCoordinator,
  );
  printCoordinator(final);
}

async function cliParticipant() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  const bytes = Buffer.concat(chunks);
  if (bytes.length > 32 * 1024 * 1024) fail("validator_live_participant_request_too_large");
  const request = JSON.parse(bytes.toString("utf8"));
  const result = await participantDispatch(ROOT, request);
  process.stdout.write(JSON.stringify(result));
}

async function main() {
  const [mode, ...rest] = process.argv.slice(2);
  if (mode === "participant") {
    await cliParticipant();
    return;
  }
  const args = parseArgs(rest);
  if (mode === "run") {
    await cliRun(args);
    return;
  }
  if (mode === "resume") {
    args.resume = args.resume || args["transaction-id"];
    await cliResume(args);
    return;
  }
  fail("validator_live_usage");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(VOID_VALIDATOR_CROSSBOX_TRANSACTION_RUN_V1 + "_HOLD");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  });
}
