#!/usr/bin/env node

import { createHash, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  VOID_PUBLIC_ORIGIN_BINDING_SEED_CLEAN_ENVIRONMENT_DROPIN_V1,
  VOID_PUBLIC_ORIGIN_BINDING_SEED_DROPIN_V1,
  VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_PLAN_V1,
  VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_UNIT_V1,
  buildVoidPublicOriginBindingSeedServicePlanV1,
} from "../../tools/void-public-origin-binding-seed-service-plan-v1.mjs";

export const VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_APPLY_V1 =
  "VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_APPLY_V1";
export const VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_APPLY_JOURNAL_V1 =
  "VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_APPLY_JOURNAL_V1";

const MAX_PLAN_BYTES = 1024 * 1024;
const MAX_JOURNAL_BYTES = 512 * 1024;
const MAX_PRIOR_DROPIN_BYTES = 256 * 1024;
const APPLY_JOURNAL_NAME =
  ".void-public-origin-binding-seed-service-apply-v1.journal.json";
const MAX_BINDING_BYTES = 128 * 1024;
const SYSTEMCTL = "/usr/bin/systemctl";
const BINDING_PATHS = Object.freeze([
  "/.well-known/void-node-public-origin-binding-v1.json",
  "/public-node/identity/public-origin-binding-v1.json",
]);
const ENV_KEYS = Object.freeze([
  "VOID_PUBLIC_ORIGIN_BINDING_FILE",
  "VOID_PUBLIC_ORIGIN_BINDING_EXPECTED_ORIGIN",
  "VOID_PUBLIC_ORIGIN_BINDING_EXPECTED_NODE_ID",
]);

function fail(message) {
  throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalize(value) {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      fail("canonical JSON cannot contain non-finite numbers");
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  fail(`canonical JSON cannot contain ${typeof value}`);
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function readDirectFile(
  file,
  label,
  maximumBytes,
  { requireMode600 = false } = {},
) {
  if (
    typeof file !== "string"
    || !path.isAbsolute(file)
  ) {
    fail(`${label} must be an absolute path`);
  }
  let canonical;
  try {
    canonical = fs.realpathSync.native(file);
  } catch (error) {
    fail(
      `${label} could not be canonicalized: ${error.message}`,
    );
  }
  if (canonical !== file) {
    fail(
      `${label} must not traverse symlinks or path aliases`,
    );
  }
  const stat = fs.lstatSync(canonical, { bigint: true });
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail(`${label} must be a regular non-symlink file`);
  }
  if (
    requireMode600
    && (Number(stat.mode) & 0o777) !== 0o600
  ) {
    fail(`${label} must have mode 0600`);
  }
  if (
    stat.size < 1n
    || stat.size > BigInt(maximumBytes)
  ) {
    fail(`${label} size is invalid`);
  }

  const fd = fs.openSync(
    canonical,
    fs.constants.O_RDONLY
      | Number(fs.constants.O_NOFOLLOW || 0),
  );
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    const bytes = fs.readFileSync(fd);
    const after = fs.fstatSync(fd, { bigint: true });
    if (
      before.dev !== after.dev
      || before.ino !== after.ino
      || before.size !== after.size
      || before.mtimeNs !== after.mtimeNs
      || before.ctimeNs !== after.ctimeNs
      || BigInt(bytes.length) !== before.size
    ) {
      fail(`${label} changed during read`);
    }
    return Object.freeze({
      file: canonical,
      bytes,
      sha256: sha256(bytes),
      mode: Number(before.mode) & 0o777,
    });
  } finally {
    fs.closeSync(fd);
  }
}

function readJson(file, label, maximumBytes) {
  const loaded = readDirectFile(
    file,
    label,
    maximumBytes,
    { requireMode600: true },
  );
  let text;
  try {
    text = new TextDecoder(
      "utf-8",
      { fatal: true },
    ).decode(loaded.bytes);
  } catch {
    fail(`${label} is not valid UTF-8`);
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    fail(`${label} is not valid JSON`);
  }
  return Object.freeze({
    ...loaded,
    value,
  });
}

function productionRebuildPlan({
  activationPacketFile,
  nowMs,
}) {
  return buildVoidPublicOriginBindingSeedServicePlanV1({
    activationPacketFile,
    cleanEnvironmentDropin:
      VOID_PUBLIC_ORIGIN_BINDING_SEED_CLEAN_ENVIRONMENT_DROPIN_V1,
    nowMs,
  });
}

function exactPlanTarget(plan) {
  if (
    plan?.marker
      !== VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_PLAN_V1
    || plan?.version !== 1
    || plan?.status
      !== "source_only_seed_gateway_environment_plan"
    || plan?.target?.unit
      !== VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_UNIT_V1
    || plan?.target?.bind !== "127.0.0.1"
    || plan?.target?.port !== 4111
    || plan?.target?.dropin_name
      !== VOID_PUBLIC_ORIGIN_BINDING_SEED_DROPIN_V1
    || plan?.target?.daemon_reload_required_after_install
      !== true
    || plan?.target?.gateway_restart_required_after_install
      !== true
    || plan?.target?.named_tunnel_restart_required
      !== false
    || typeof plan?.plan_id !== "string"
    || !/^voidpobssp1_[0-9a-f]{64}$/u.test(
      plan.plan_id,
    )
    || typeof plan?.dropin?.text !== "string"
    || typeof plan?.dropin?.sha256 !== "string"
    || !/^[0-9a-f]{64}$/u.test(
      plan.dropin.sha256,
    )
    || plan?.dropin?.mode !== "0600"
    || typeof plan?.activation_packet?.file !== "string"
    || typeof plan?.activation_packet
      ?.binding_artifact_sha256 !== "string"
    || !/^[0-9a-f]{64}$/u.test(
      plan.activation_packet.binding_artifact_sha256,
    )
  ) {
    fail("seed-service plan identity or target mismatch");
  }

  const actualKeys = Object.keys(
    plan.environment || {},
  ).sort();
  const expectedKeys = [...ENV_KEYS].sort();
  if (
    JSON.stringify(actualKeys)
      !== JSON.stringify(expectedKeys)
  ) {
    fail(
      "seed-service plan environment key set mismatch",
    );
  }
  if (
    sha256(Buffer.from(plan.dropin.text, "utf8"))
      !== plan.dropin.sha256
  ) {
    fail("seed-service plan drop-in SHA mismatch");
  }
}

export function inspectVoidPublicOriginBindingSeedServicePlanV1({
  planFile,
  nowMs = Date.now(),
  rebuildPlan = productionRebuildPlan,
} = {}) {
  if (typeof rebuildPlan !== "function") {
    fail("seed-service plan verifier is unavailable");
  }
  if (!Number.isFinite(nowMs)) {
    fail("plan verification time is invalid");
  }

  const loaded = readJson(
    planFile,
    "seed-service plan",
    MAX_PLAN_BYTES,
  );
  const plan = loaded.value;
  exactPlanTarget(plan);

  const rebuilt = rebuildPlan({
    activationPacketFile:
      plan.activation_packet.file,
    nowMs,
  });
  if (
    canonicalJson(plan)
      !== canonicalJson(rebuilt)
  ) {
    fail(
      "seed-service plan differs from fresh signed-binding verification",
    );
  }

  return Object.freeze({
    plan,
    plan_file: loaded.file,
    plan_artifact_sha256: loaded.sha256,
    required_confirmation:
      requiredVoidPublicOriginBindingSeedServiceApplyConfirmationV1(
        plan,
      ),
  });
}

export function requiredVoidPublicOriginBindingSeedServiceApplyConfirmationV1(
  plan,
) {
  exactPlanTarget(plan);
  return (
    "apply-void-public-origin-binding-seed-service-plan-v1:"
    + plan.plan_id
    + ":"
    + plan.dropin.sha256
  );
}

function canonicalHomeTarget(homeDir, plan) {
  if (
    typeof homeDir !== "string"
    || !path.isAbsolute(homeDir)
    || fs.realpathSync.native(homeDir) !== homeDir
  ) {
    fail("home directory must be an absolute canonical path");
  }
  const userDir = path.join(
    homeDir,
    ".config",
    "systemd",
    "user",
  );
  if (fs.realpathSync.native(userDir) !== userDir) {
    fail(
      "systemd user directory must be a canonical existing directory",
    );
  }
  const unitPath = path.join(
    userDir,
    VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_UNIT_V1,
  );
  const unit = fs.lstatSync(unitPath, {
    bigint: true,
  });
  if (!unit.isFile() || unit.isSymbolicLink()) {
    fail(
      "canonical seed gateway unit must be a direct regular file",
    );
  }

  const dropinDir = path.join(
    userDir,
    VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_UNIT_V1
      + ".d",
  );
  const dropinPath = path.join(
    dropinDir,
    plan.target.dropin_name,
  );
  const journalPath = path.join(
    userDir,
    APPLY_JOURNAL_NAME,
  );
  return Object.freeze({
    userDir,
    unitPath,
    dropinDir,
    dropinPath,
    journalPath,
  });
}

function pathEntryExists(file) {
  try {
    fs.lstatSync(file);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function preflightCreateOnly(file, label) {
  if (
    typeof file !== "string"
    || !path.isAbsolute(file)
    || path.resolve(file) !== file
  ) {
    fail(`${label} must be an absolute canonical path`);
  }
  const parent = path.dirname(file);
  if (fs.realpathSync.native(parent) !== parent) {
    fail(
      `${label} parent must not traverse symlinks or aliases`,
    );
  }
  try {
    fs.lstatSync(file);
    fail(`refusing to overwrite existing ${label}`);
  } catch (error) {
    if (
      error?.message
        === `refusing to overwrite existing ${label}`
    ) {
      throw error;
    }
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
  return file;
}

function fsyncDirectory(dir) {
  const fd = fs.openSync(
    dir,
    fs.constants.O_RDONLY
      | Number(fs.constants.O_DIRECTORY || 0),
  );
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function writeCreateOnlyPrivateJson(file, value) {
  preflightCreateOnly(file, "private JSON output");
  const parent = path.dirname(file);
  const bytes = Buffer.from(
    JSON.stringify(value, null, 2) + "\n",
    "utf8",
  );
  const tempPath = path.join(
    parent,
    "." + path.basename(file)
      + ".tmp-" + process.pid + "-" + Date.now(),
  );
  let fd = -1;
  try {
    fd = fs.openSync(
      tempPath,
      fs.constants.O_WRONLY
        | fs.constants.O_CREAT
        | fs.constants.O_EXCL
        | Number(fs.constants.O_NOFOLLOW || 0),
      0o600,
    );
    fs.writeFileSync(fd, bytes);
    fs.fchmodSync(fd, 0o600);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = -1;
    fs.linkSync(tempPath, file);
    fsyncDirectory(parent);
  } finally {
    if (fd >= 0) {
      try {
        fs.closeSync(fd);
      } catch (closeError) {
        void closeError;
      }
    }
    try {
      fs.unlinkSync(tempPath);
      fsyncDirectory(parent);
    } catch (unlinkError) {
      if (unlinkError?.code !== "ENOENT") {
        void unlinkError;
      }
    }
  }
  const observed = readDirectFile(
    file,
    "private JSON output",
    Math.max(bytes.length, 1),
    { requireMode600: true },
  );
  if (
    observed.bytes.length !== bytes.length
    || !timingSafeEqual(observed.bytes, bytes)
  ) {
    fail("private JSON output readback mismatch");
  }
  return Object.freeze({
    bytes,
    sha256: sha256(bytes),
  });
}

function productionSystemctl(args) {
  const result = spawnSync(
    SYSTEMCTL,
    ["--user", ...args],
    {
      encoding: "utf8",
      env: process.env,
    },
  );
  return Object.freeze({
    status:
      Number.isInteger(result.status)
        ? result.status
        : 1,
    stdout: String(result.stdout || ""),
    stderr: String(result.stderr || ""),
  });
}

function requireSystemctl(
  systemctlRunner,
  args,
  label,
) {
  const result = systemctlRunner(args);
  if (
    !result
    || result.status !== 0
  ) {
    fail(
      `${label} failed: ${String(
        result?.stderr || result?.stdout || "",
      ).trim()}`,
    );
  }
  return String(result.stdout || "").trim();
}

function inspectExistingDropin(dropinPath) {
  let fd = -1;
  try {
    fd = fs.openSync(
      dropinPath,
      fs.constants.O_RDONLY
        | Number(fs.constants.O_NOFOLLOW || 0),
    );
    const before = fs.fstatSync(
      fd,
      { bigint: true },
    );
    if (
      !before.isFile()
      || before.nlink !== 1n
    ) {
      fail(
        "existing public-origin binding drop-in must be a single-link regular file",
      );
    }
    if (
      before.size < 0n
      || before.size > BigInt(MAX_PRIOR_DROPIN_BYTES)
    ) {
      fail(
        "existing public-origin binding drop-in exceeds rollback byte limit",
      );
    }
    const bytes = fs.readFileSync(fd);
    const after = fs.fstatSync(
      fd,
      { bigint: true },
    );
    if (
      before.dev !== after.dev
      || before.ino !== after.ino
      || before.size !== after.size
      || before.mtimeNs !== after.mtimeNs
      || before.ctimeNs !== after.ctimeNs
      || BigInt(bytes.length) !== before.size
    ) {
      fail(
        "existing public-origin binding drop-in changed during read",
      );
    }
    return Object.freeze({
      existed: true,
      bytes,
      mode: Number(before.mode) & 0o777,
      dev: String(before.dev),
      ino: String(before.ino),
    });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return Object.freeze({
        existed: false,
        bytes: null,
        mode: null,
        dev: null,
        ino: null,
      });
    }
    throw error;
  } finally {
    if (fd >= 0) {
      fs.closeSync(fd);
    }
  }
}

function inspectDropinDirectory(dropinDir) {
  try {
    const stat = fs.lstatSync(dropinDir);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      fail(
        "seed gateway drop-in directory must be a direct directory",
      );
    }
    if (fs.realpathSync.native(dropinDir) !== dropinDir) {
      fail(
        "seed gateway drop-in directory must be canonical",
      );
    }
    return Object.freeze({
      existed: true,
      mode: Number(stat.mode) & 0o777,
    });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return Object.freeze({
        existed: false,
        mode: null,
      });
    }
    throw error;
  }
}

function strictBase64(value, label) {
  if (
    typeof value !== "string"
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(
      value,
    )
  ) {
    fail(`${label} is not canonical base64`);
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) {
    fail(`${label} is not canonical base64`);
  }
  return bytes;
}

function buildApplyJournal({
  plan,
  inspected,
  target,
  previous,
  dropinDirectory,
  receiptFile,
}) {
  const priorBytes =
    previous.existed
      ? Buffer.from(previous.bytes)
      : null;
  const body = {
    marker:
      VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_APPLY_JOURNAL_V1,
    version: 1,
    status: "prepared_before_seed_service_mutation",
    created_at: new Date().toISOString(),
    plan_id: plan.plan_id,
    plan_artifact_sha256:
      inspected.plan_artifact_sha256,
    binding_artifact_sha256:
      plan.activation_packet.binding_artifact_sha256,
    desired_dropin_sha256:
      plan.dropin.sha256,
    receipt_file: receiptFile,
    target: {
      unit: plan.target.unit,
      unit_path: target.unitPath,
      dropin_dir: target.dropinDir,
      dropin_path: target.dropinPath,
    },
    prior: {
      dropin_dir_existed:
        dropinDirectory.existed,
      dropin_dir_mode:
        dropinDirectory.existed
          ? dropinDirectory.mode
          : null,
      dropin_existed: previous.existed,
      dropin_mode:
        previous.existed
          ? previous.mode
          : null,
      dropin_sha256:
        previous.existed
          ? sha256(priorBytes)
          : null,
      dropin_bytes_base64:
        previous.existed
          ? priorBytes.toString("base64")
          : null,
    },
  };
  return Object.freeze({
    ...body,
    journal_id:
      "voidpobsaj1_"
      + sha256(
        Buffer.from(
          canonicalJson(body),
          "utf8",
        ),
      ),
  });
}

function validateApplyJournal(journal, target) {
  if (
    !journal
    || typeof journal !== "object"
    || Array.isArray(journal)
  ) {
    fail("seed-service apply journal is invalid");
  }
  const keys = Object.keys(journal).sort();
  const expectedKeys = [
    "marker",
    "version",
    "status",
    "created_at",
    "plan_id",
    "plan_artifact_sha256",
    "binding_artifact_sha256",
    "desired_dropin_sha256",
    "receipt_file",
    "target",
    "prior",
    "journal_id",
  ].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) {
    fail("seed-service apply journal keys are invalid");
  }
  if (
    journal.marker
      !== VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_APPLY_JOURNAL_V1
    || journal.version !== 1
    || journal.status
      !== "prepared_before_seed_service_mutation"
    || typeof journal.created_at !== "string"
    || new Date(journal.created_at).toISOString()
      !== journal.created_at
    || !/^voidpobssp1_[0-9a-f]{64}$/u.test(
      String(journal.plan_id || ""),
    )
    || !/^[0-9a-f]{64}$/u.test(
      String(journal.plan_artifact_sha256 || ""),
    )
    || !/^[0-9a-f]{64}$/u.test(
      String(journal.binding_artifact_sha256 || ""),
    )
    || !/^[0-9a-f]{64}$/u.test(
      String(journal.desired_dropin_sha256 || ""),
    )
    || typeof journal.receipt_file !== "string"
    || !path.isAbsolute(journal.receipt_file)
    || path.resolve(journal.receipt_file)
      !== journal.receipt_file
    || !/^voidpobsaj1_[0-9a-f]{64}$/u.test(
      String(journal.journal_id || ""),
    )
  ) {
    fail("seed-service apply journal contract is invalid");
  }
  if (
    canonicalJson(journal.target)
      !== canonicalJson({
        unit:
          VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_UNIT_V1,
        unit_path: target.unitPath,
        dropin_dir: target.dropinDir,
        dropin_path: target.dropinPath,
      })
  ) {
    fail("seed-service apply journal target mismatch");
  }
  const prior = journal.prior;
  if (
    !prior
    || typeof prior !== "object"
    || Array.isArray(prior)
    || JSON.stringify(Object.keys(prior).sort())
      !== JSON.stringify([
        "dropin_bytes_base64",
        "dropin_dir_existed",
        "dropin_dir_mode",
        "dropin_existed",
        "dropin_mode",
        "dropin_sha256",
      ].sort())
    || typeof prior.dropin_dir_existed !== "boolean"
    || typeof prior.dropin_existed !== "boolean"
    || (
      prior.dropin_dir_existed
      && (
        !Number.isInteger(prior.dropin_dir_mode)
        || prior.dropin_dir_mode < 0
        || prior.dropin_dir_mode > 0o777
      )
    )
    || (
      !prior.dropin_dir_existed
      && prior.dropin_dir_mode !== null
    )
  ) {
    fail("seed-service apply journal prior state is invalid");
  }
  if (prior.dropin_existed && prior.dropin_dir_mode === null) {
    fail("seed-service apply journal prior directory mode is invalid");
  }
  if (prior.dropin_existed) {
    if (
      prior.dropin_mode === null
      || !Number.isInteger(prior.dropin_mode)
      || prior.dropin_mode < 0
      || prior.dropin_mode > 0o777
      || typeof prior.dropin_sha256 !== "string"
      || !/^[0-9a-f]{64}$/u.test(prior.dropin_sha256)
      || typeof prior.dropin_bytes_base64 !== "string"
    ) {
      fail("seed-service apply journal prior drop-in is invalid");
    }
    const bytes = strictBase64(
      prior.dropin_bytes_base64,
      "seed-service apply journal prior bytes",
    );
    if (sha256(bytes) !== prior.dropin_sha256) {
      fail("seed-service apply journal prior SHA mismatch");
    }
  } else if (
    prior.dropin_mode !== null
    || prior.dropin_sha256 !== null
    || prior.dropin_bytes_base64 !== null
  ) {
    fail("seed-service apply journal empty prior state is invalid");
  }
  const material = structuredClone(journal);
  const observedId = material.journal_id;
  delete material.journal_id;
  const expectedId =
    "voidpobsaj1_"
    + sha256(
      Buffer.from(
        canonicalJson(material),
        "utf8",
      ),
    );
  if (observedId !== expectedId) {
    fail("seed-service apply journal ID mismatch");
  }
  return Object.freeze({
    ...journal,
    prior_bytes:
      prior.dropin_existed
        ? strictBase64(
          prior.dropin_bytes_base64,
          "seed-service apply journal prior bytes",
        )
        : null,
  });
}

export function requiredVoidPublicOriginBindingSeedServiceRecoveryConfirmationV1(
  journal,
) {
  if (
    !journal
    || !/^voidpobsaj1_[0-9a-f]{64}$/u.test(
      String(journal.journal_id || ""),
    )
  ) {
    fail("seed-service apply journal ID is invalid");
  }
  return (
    "recover-void-public-origin-binding-seed-service-apply-v1:"
    + journal.journal_id
  );
}

function readApplyJournal(target) {
  const loaded = readJson(
    target.journalPath,
    "seed-service apply journal",
    MAX_JOURNAL_BYTES,
  );
  return Object.freeze({
    loaded,
    journal:
      validateApplyJournal(
        loaded.value,
        target,
      ),
  });
}

function removeApplyJournal(target) {
  fs.unlinkSync(target.journalPath);
  fsyncDirectory(target.userDir);
}

function ensureDropinDirectory(dropinDir) {
  try {
    const stat = fs.lstatSync(dropinDir);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      fail(
        "seed gateway drop-in directory must be a direct directory",
      );
    }
    if (
      fs.realpathSync.native(dropinDir)
        !== dropinDir
    ) {
      fail(
        "seed gateway drop-in directory must be canonical",
      );
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
    fs.mkdirSync(
      dropinDir,
      {
        recursive: false,
        mode: 0o700,
      },
    );
  }
}

function atomicWriteDropinBytes(
  dropinDir,
  dropinPath,
  bytes,
  mode,
) {
  ensureDropinDirectory(dropinDir);
  const tempPath = path.join(
    dropinDir,
    `.${path.basename(dropinPath)}.tmp-${process.pid}`,
  );
  const fd = fs.openSync(
    tempPath,
    fs.constants.O_WRONLY
      | fs.constants.O_CREAT
      | fs.constants.O_EXCL
      | Number(fs.constants.O_NOFOLLOW || 0),
    mode,
  );
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    fs.fchmodSync(fd, mode);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tempPath, dropinPath);
  fsyncDirectory(dropinDir);
}

function atomicInstallDropin(
  dropinDir,
  dropinPath,
  text,
) {
  atomicWriteDropinBytes(
    dropinDir,
    dropinPath,
    Buffer.from(text, "utf8"),
    0o600,
  );
}

function restoreDropin(
  dropinDir,
  dropinPath,
  previous,
  dropinDirectory = { existed: true },
) {
  if (!previous.existed) {
    try {
      fs.unlinkSync(dropinPath);
      fsyncDirectory(dropinDir);
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
    if (dropinDirectory.existed === false) {
      try {
        fs.rmdirSync(dropinDir);
        fsyncDirectory(path.dirname(dropinDir));
      } catch (error) {
        if (error?.code !== "ENOENT") {
          throw error;
        }
      }
    }
    return;
  }
  atomicWriteDropinBytes(
    dropinDir,
    dropinPath,
    previous.bytes,
    previous.mode,
  );
}

function environmentTokens(value) {
  return new Set(
    String(value || "")
      .trim()
      .split(/\s+/u)
      .filter(Boolean),
  );
}

async function readResponseBounded(
  response,
  maximum,
) {
  if (
    !response
    || response.status !== 200
    || response.redirected === true
  ) {
    fail(
      `binding qualification HTTP ${String(
        response?.status ?? 0,
      )}`,
    );
  }
  const declared = String(
    response.headers?.get?.("content-length") || "",
  ).trim();
  if (declared) {
    if (!/^\d+$/u.test(declared)) {
      fail(
        "binding qualification content-length is invalid",
      );
    }
    if (
      BigInt(declared)
        > BigInt(maximum)
    ) {
      fail(
        "binding qualification response exceeds byte limit",
      );
    }
  }
  const reader =
    response.body?.getReader?.();
  if (!reader) {
    fail(
      "binding qualification response is not stream-readable",
    );
  }
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } =
        await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) {
        fail(
          "binding qualification chunk is invalid",
        );
      }
      total += value.byteLength;
      if (total > maximum) {
        try {
          await reader.cancel();
        } catch (error) {
          void error;
        }
        fail(
          "binding qualification response exceeds byte limit",
        );
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    try {
      reader.releaseLock();
    } catch (error) {
      void error;
    }
  }
  return Buffer.concat(chunks, total);
}

async function verifyLocalBindingAliases(
  expectedSha256,
  fetchImpl,
) {
  if (typeof fetchImpl !== "function") {
    fail("fetch implementation is unavailable");
  }
  let first = null;
  const observations = [];
  for (const pathname of BINDING_PATHS) {
    const url =
      "http://127.0.0.1:4111" + pathname;
    const response = await fetchImpl(
      url,
      {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (
      response.url
      && response.url !== url
    ) {
      fail(
        "binding qualification final URL mismatch",
      );
    }
    const bytes = await readResponseBounded(
      response,
      MAX_BINDING_BYTES,
    );
    const actualSha = sha256(bytes);
    if (actualSha !== expectedSha256) {
      fail(
        "binding qualification artifact SHA mismatch",
      );
    }
    if (
      first
      && (
        first.length !== bytes.length
        || !timingSafeEqual(first, bytes)
      )
    ) {
      fail(
        "binding qualification aliases are not byte-identical",
      );
    }
    if (!first) {
      first = bytes;
    }
    observations.push(
      Object.freeze({
        path: pathname,
        http_status: 200,
        bytes: bytes.length,
        sha256: actualSha,
      }),
    );
  }
  return Object.freeze(observations);
}

function rollbackAfterFailure({
  target,
  previous,
  dropinDirectory,
  systemctlRunner,
}) {
  const failures = [];
  try {
    restoreDropin(
      target.dropinDir,
      target.dropinPath,
      previous,
      dropinDirectory,
    );
  } catch (error) {
    failures.push(
      `restore:${String(
        error?.message || error,
      )}`,
    );
    return failures;
  }

  try {
    const restoredDirectory =
      inspectDropinDirectory(
        target.dropinDir,
      );
    const restored =
      inspectExistingDropin(
        target.dropinPath,
      );
    if (!dropinMatchesPrevious(restored, previous)) {
      failures.push(
        "restore_readback:dropin_mismatch",
      );
      return failures;
    }
    if (
      dropinDirectory.existed
      && (
        !restoredDirectory.existed
        || (
          dropinDirectory.mode !== null
          && restoredDirectory.mode
            !== dropinDirectory.mode
        )
      )
    ) {
      failures.push(
        "restore_readback:directory_mismatch",
      );
      return failures;
    }
    if (
      dropinDirectory.existed === false
      && restoredDirectory.existed
    ) {
      failures.push(
        "restore_readback:directory_should_be_absent",
      );
      return failures;
    }
  } catch (error) {
    failures.push(
      `restore_readback:${String(
        error?.message || error,
      )}`,
    );
    return failures;
  }

  let reloadResult;
  try {
    reloadResult =
      systemctlRunner([
        "daemon-reload",
      ]);
  } catch (error) {
    failures.push(
      `daemon-reload:${String(
        error?.message || error,
      )}`,
    );
    return failures;
  }
  if (
    !reloadResult
    || reloadResult.status !== 0
  ) {
    failures.push(
      `daemon-reload:${String(
        reloadResult?.stderr
          || reloadResult?.stdout
          || "nonzero status",
      ).trim()}`,
    );
    return failures;
  }

  try {
    const restartResult =
      systemctlRunner([
        "restart",
        VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_UNIT_V1,
      ]);
    if (
      !restartResult
      || restartResult.status !== 0
    ) {
      failures.push(
        `restart:${String(
          restartResult?.stderr
            || restartResult?.stdout
            || "nonzero status",
        ).trim()}`,
      );
    }
  } catch (error) {
    failures.push(
      `restart:${String(
        error?.message || error,
      )}`,
    );
  }
  return failures;
}

function fixedRecoveryTarget(homeDir) {
  return canonicalHomeTarget(
    homeDir,
    {
      target: {
        dropin_name:
          VOID_PUBLIC_ORIGIN_BINDING_SEED_DROPIN_V1,
      },
    },
  );
}

function journalPreviousState(journal) {
  return Object.freeze({
    existed: journal.prior.dropin_existed,
    bytes: journal.prior.dropin_existed
      ? Buffer.from(journal.prior_bytes)
      : null,
    mode: journal.prior.dropin_existed
      ? journal.prior.dropin_mode
      : null,
  });
}

function dropinMatchesPrevious(current, previous) {
  if (current.existed !== previous.existed) {
    return false;
  }
  if (!current.existed) {
    return true;
  }
  return (
    current.mode === previous.mode
    && current.bytes.length === previous.bytes.length
    && timingSafeEqual(
      current.bytes,
      previous.bytes,
    )
  );
}

function assertRecoveryTargetState(target, journal) {
  const currentDirectory =
    inspectDropinDirectory(target.dropinDir);
  const current =
    inspectExistingDropin(target.dropinPath);
  const previous =
    journalPreviousState(journal);
  const matchesPrevious =
    dropinMatchesPrevious(current, previous);
  const matchesDesired =
    current.existed
    && current.mode === 0o600
    && sha256(current.bytes)
      === journal.desired_dropin_sha256;

  if (
    !matchesPrevious
    && !matchesDesired
  ) {
    fail(
      "seed-service recovery target changed outside journal",
    );
  }
  if (journal.prior.dropin_dir_existed) {
    if (
      !currentDirectory.existed
      || currentDirectory.mode
        !== journal.prior.dropin_dir_mode
    ) {
      fail(
        "seed-service recovery drop-in directory generation mismatch",
      );
    }
  } else if (matchesDesired) {
    if (
      !currentDirectory.existed
      || currentDirectory.mode !== 0o700
    ) {
      fail(
        "seed-service recovery created drop-in directory mismatch",
      );
    }
  } else if (
    matchesPrevious
    && currentDirectory.existed
  ) {
    if (
      currentDirectory.mode !== 0o700
      || fs.readdirSync(target.dropinDir).length !== 0
    ) {
      fail(
        "seed-service recovery drop-in directory contains foreign state",
      );
    }
  }
  return Object.freeze({
    previous,
    dropinDirectory: Object.freeze({
      existed:
        journal.prior.dropin_dir_existed,
      mode:
        journal.prior.dropin_dir_mode,
    }),
    current_matches_previous:
      matchesPrevious,
    current_matches_desired:
      matchesDesired,
  });
}

export function inspectVoidPublicOriginBindingSeedServiceRecoveryV1({
  homeDir = os.homedir(),
} = {}) {
  const target =
    fixedRecoveryTarget(homeDir);
  if (!pathEntryExists(target.journalPath)) {
    fail("seed-service apply recovery journal is absent");
  }
  const { journal, loaded } =
    readApplyJournal(target);
  const state =
    assertRecoveryTargetState(
      target,
      journal,
    );
  return Object.freeze({
    journal,
    journal_file: loaded.file,
    journal_artifact_sha256:
      loaded.sha256,
    target,
    state,
    required_confirmation:
      requiredVoidPublicOriginBindingSeedServiceRecoveryConfirmationV1(
        journal,
      ),
  });
}

export function recoverVoidPublicOriginBindingSeedServiceApplyV1({
  confirmation,
  homeDir = os.homedir(),
  systemctlRunner = productionSystemctl,
} = {}) {
  const inspected =
    inspectVoidPublicOriginBindingSeedServiceRecoveryV1({
      homeDir,
    });
  if (
    confirmation
      !== inspected.required_confirmation
  ) {
    fail(
      "exact seed-service recovery confirmation mismatch",
    );
  }
  const fragment = requireSystemctl(
    systemctlRunner,
    [
      "show",
      VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_UNIT_V1,
      "-p",
      "FragmentPath",
      "--value",
    ],
    "seed gateway FragmentPath recovery preflight",
  );
  if (fragment !== inspected.target.unitPath) {
    fail(
      "seed gateway FragmentPath is not canonical user unit",
    );
  }

  const freshState =
    assertRecoveryTargetState(
      inspected.target,
      inspected.journal,
    );
  if (
    freshState.current_matches_previous
      !== inspected.state.current_matches_previous
    || freshState.current_matches_desired
      !== inspected.state.current_matches_desired
  ) {
    fail(
      "seed-service recovery target changed during recovery preflight",
    );
  }

  const failures =
    rollbackAfterFailure({
      target: inspected.target,
      previous: freshState.previous,
      dropinDirectory:
        freshState.dropinDirectory,
      systemctlRunner,
    });
  if (failures.length > 0) {
    fail(
      "seed-service recovery failed:"
        + failures.join("|"),
    );
  }
  removeApplyJournal(inspected.target);
  return Object.freeze({
    marker:
      VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_APPLY_V1,
    version: 1,
    status: "recovery_green_prior_state_restored",
    journal_id:
      inspected.journal.journal_id,
    plan_id:
      inspected.journal.plan_id,
    prior_dropin_restored: true,
    daemon_reload_performed: true,
    seed_gateway_restart_performed: true,
    named_tunnel_restart_performed: false,
    private_key_access: false,
    signature_creation: false,
    funds_movement: false,
  });
}

export async function applyVoidPublicOriginBindingSeedServicePlanV1({
  planFile,
  receiptFile,
  confirmation,
  homeDir = os.homedir(),
  rebuildPlan = productionRebuildPlan,
  systemctlRunner = productionSystemctl,
  fetchImpl = fetch,
} = {}) {
  const inspected =
    inspectVoidPublicOriginBindingSeedServicePlanV1({
      planFile,
      nowMs: Date.now(),
      rebuildPlan,
    });
  const { plan } = inspected;
  const required =
    inspected.required_confirmation;
  if (confirmation !== required) {
    fail(
      "exact seed-service apply confirmation mismatch",
    );
  }

  const target =
    canonicalHomeTarget(
      homeDir,
      plan,
    );
  if (pathEntryExists(target.journalPath)) {
    const pendingRecovery =
      inspectVoidPublicOriginBindingSeedServiceRecoveryV1({
        homeDir,
      });
    fail(
      "seed-service apply recovery required:"
        + pendingRecovery.required_confirmation,
    );
  }
  const receiptOutput =
    preflightCreateOnly(
      receiptFile,
      "activation receipt",
    );

  const fragment = requireSystemctl(
    systemctlRunner,
    [
      "show",
      plan.target.unit,
      "-p",
      "FragmentPath",
      "--value",
    ],
    "seed gateway FragmentPath preflight",
  );
  if (fragment !== target.unitPath) {
    fail(
      "seed gateway FragmentPath is not canonical user unit",
    );
  }
  requireSystemctl(
    systemctlRunner,
    [
      "is-active",
      plan.target.unit,
    ],
    "seed gateway active preflight",
  );

  const freshInspected =
    inspectVoidPublicOriginBindingSeedServicePlanV1({
      planFile,
      nowMs: Date.now(),
      rebuildPlan,
    });
  if (
    freshInspected.plan.plan_id !== plan.plan_id
    || freshInspected.plan_artifact_sha256
      !== inspected.plan_artifact_sha256
    || freshInspected.required_confirmation !== required
    || canonicalJson(freshInspected.plan)
      !== canonicalJson(plan)
  ) {
    fail(
      "seed-service plan changed during apply preflight",
    );
  }

  const dropinDirectory =
    inspectDropinDirectory(
      target.dropinDir,
    );
  const previous =
    inspectExistingDropin(
      target.dropinPath,
    );
  const desired = Buffer.from(
    plan.dropin.text,
    "utf8",
  );
  const needsChange =
    !previous.existed
    || previous.bytes.length
      !== desired.length
    || !timingSafeEqual(
      previous.bytes,
      desired,
    )
    || previous.mode !== 0o600;

  let journal = null;
  let journalPrepared = false;
  let committed = false;
  let changed = false;

  if (needsChange) {
    journal = buildApplyJournal({
      plan,
      inspected,
      target,
      previous,
      dropinDirectory,
      receiptFile: receiptOutput,
    });
    const journalBytes = Buffer.from(
      JSON.stringify(journal, null, 2) + "\n",
      "utf8",
    );
    if (journalBytes.length > MAX_JOURNAL_BYTES) {
      fail(
        "seed-service apply journal exceeds recovery byte limit",
      );
    }
    writeCreateOnlyPrivateJson(
      target.journalPath,
      journal,
    );
    journalPrepared = true;
  }

  try {
    if (needsChange) {
      atomicInstallDropin(
        target.dropinDir,
        target.dropinPath,
        plan.dropin.text,
      );
      changed = true;
    }

    requireSystemctl(
      systemctlRunner,
      ["daemon-reload"],
      "seed gateway daemon-reload",
    );
    requireSystemctl(
      systemctlRunner,
      [
        "restart",
        plan.target.unit,
      ],
      "seed gateway restart",
    );
    requireSystemctl(
      systemctlRunner,
      [
        "is-active",
        plan.target.unit,
      ],
      "seed gateway post-restart active check",
    );

    const effectiveEnvironment =
      environmentTokens(
        requireSystemctl(
          systemctlRunner,
          [
            "show",
            plan.target.unit,
            "-p",
            "Environment",
            "--value",
          ],
          "seed gateway effective environment check",
        ),
      );
    for (const key of ENV_KEYS) {
      const token =
        `${key}=${plan.environment[key]}`;
      if (
        !effectiveEnvironment.has(token)
      ) {
        fail(
          `seed gateway effective environment missing ${key}`,
        );
      }
    }

    const bindingObservations =
      await verifyLocalBindingAliases(
        plan.activation_packet
          .binding_artifact_sha256,
        fetchImpl,
      );

    const receipt = Object.freeze({
      marker:
        VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_APPLY_V1,
      version: 1,
      status: "activation_green",
      plan_id: plan.plan_id,
      plan_artifact_sha256:
        inspected.plan_artifact_sha256,
      target: Object.freeze({
        unit: plan.target.unit,
        unit_path: target.unitPath,
        dropin_path: target.dropinPath,
        dropin_sha256: plan.dropin.sha256,
        dropin_changed: changed,
        apply_journal_id:
          journal?.journal_id || null,
      }),
      binding: Object.freeze({
        artifact_sha256:
          plan.activation_packet
            .binding_artifact_sha256,
        binding_sha256:
          plan.activation_packet
            .binding_sha256,
        expires_at:
          plan.activation_packet
            .expires_at,
        aliases: bindingObservations,
      }),
      authority: Object.freeze({
        dropin_write_performed: changed,
        daemon_reload_performed: true,
        seed_gateway_restart_performed: true,
        named_tunnel_restart_performed: false,
        dns_or_tls_mutation: false,
        private_key_access: false,
        wallet_or_signer_access: false,
        signature_creation: false,
        node_runtime_mutation: false,
        work_credit_mutation: false,
        transaction_submission: false,
        validator_mutation: false,
        funds_movement: false,
      }),
    });
    if (journalPrepared) {
      removeApplyJournal(target);
      committed = true;
    }

    const written =
      writeCreateOnlyPrivateJson(
        receiptOutput,
        receipt,
      );
    return Object.freeze({
      receipt,
      receipt_artifact_sha256:
        written.sha256,
      output_mode: "0600",
    });
  } catch (error) {
    if (
      journalPrepared
      && !committed
    ) {
      const rollbackFailures =
        rollbackAfterFailure({
          target,
          previous,
          dropinDirectory,
          systemctlRunner,
        });
      if (rollbackFailures.length === 0) {
        try {
          removeApplyJournal(target);
        } catch (journalCleanupError) {
          rollbackFailures.push(
            "journal_cleanup:"
              + String(
                journalCleanupError?.message
                  || journalCleanupError,
              ),
          );
        }
      }
      if (rollbackFailures.length > 0) {
        throw new Error(
          `${String(
            error?.message || error,
          )}; rollback_failed:${rollbackFailures.join("|")}`,
          { cause: error },
        );
      }
    }
    throw error;
  }
}

function parseArgs(argv) {
  const options = {
    command: argv[0] || "",
    planFile: "",
    receiptFile: "",
    confirmation: "",
  };
  for (
    let index = 1;
    index < argv.length;
    index += 1
  ) {
    const argument = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) {
        fail(
          `missing value for ${argument}`,
        );
      }
      return argv[index];
    };
    if (argument === "--plan") {
      options.planFile = next();
    } else if (argument === "--receipt") {
      options.receiptFile = next();
    } else if (
      argument === "--confirmation"
    ) {
      options.confirmation = next();
    } else {
      fail(
        `unknown argument: ${argument}`,
      );
    }
  }
  return options;
}

function usage() {
  console.log(
    "usage: node ops/public/void-public-origin-binding-seed-service-apply-v1.mjs "
      + "inspect --plan /absolute/seed-service-plan.json",
  );
  console.log(
    "   or: node ops/public/void-public-origin-binding-seed-service-apply-v1.mjs "
      + "apply --plan /absolute/seed-service-plan.json "
      + "--receipt /absolute/activation-receipt.json "
      + "--confirmation <exact-plan-bound-confirmation>",
  );
  console.log(
    "   or: node ops/public/void-public-origin-binding-seed-service-apply-v1.mjs "
      + "inspect-recovery",
  );
  console.log(
    "   or: node ops/public/void-public-origin-binding-seed-service-apply-v1.mjs "
      + "recover --confirmation <exact-journal-bound-confirmation>",
  );
}

export const testOnly = Object.freeze({
  buildApplyJournal,
  validateApplyJournal,
  fixedRecoveryTarget,
  inspectDropinDirectory,
  inspectExistingDropin,
});

const direct =
  process.argv[1]
  && import.meta.url
    === pathToFileURL(
      process.argv[1],
    ).href;

if (direct) {
  try {
    const options = parseArgs(
      process.argv.slice(2),
    );
    if (
      options.command === "help"
      || options.command === "--help"
      || options.command === "-h"
    ) {
      usage();
    } else if (
      options.command === "inspect"
    ) {
      if (!options.planFile) {
        fail(
          "inspect requires --plan",
        );
      }
      const result =
        inspectVoidPublicOriginBindingSeedServicePlanV1({
          planFile: options.planFile,
        });
      console.log(
        VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_APPLY_V1,
      );
      console.log("mode=inspect");
      console.log(
        `plan_id=${result.plan.plan_id}`,
      );
      console.log(
        `target_unit=${result.plan.target.unit}`,
      );
      console.log(
        `dropin_sha256=${result.plan.dropin.sha256}`,
      );
      console.log(
        `required_confirmation=${result.required_confirmation}`,
      );
      console.log(
        "mutation_performed=false",
      );
    } else if (
      options.command === "inspect-recovery"
    ) {
      if (
        options.planFile
        || options.receiptFile
        || options.confirmation
      ) {
        fail(
          "inspect-recovery accepts no additional arguments",
        );
      }
      const result =
        inspectVoidPublicOriginBindingSeedServiceRecoveryV1();
      console.log(
        VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_APPLY_V1,
      );
      console.log("mode=inspect-recovery");
      console.log(
        `journal_id=${result.journal.journal_id}`,
      );
      console.log(
        `plan_id=${result.journal.plan_id}`,
      );
      console.log(
        `required_confirmation=${result.required_confirmation}`,
      );
      console.log(
        `current_matches_previous=${result.state.current_matches_previous}`,
      );
      console.log(
        `current_matches_desired=${result.state.current_matches_desired}`,
      );
      console.log(
        "mutation_performed=false",
      );
    } else if (
      options.command === "recover"
    ) {
      if (
        options.planFile
        || options.receiptFile
        || !options.confirmation
      ) {
        fail(
          "recover requires only --confirmation",
        );
      }
      const result =
        recoverVoidPublicOriginBindingSeedServiceApplyV1({
          confirmation:
            options.confirmation,
        });
      console.log(
        VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_APPLY_V1,
      );
      console.log("mode=recover");
      console.log(
        `journal_id=${result.journal_id}`,
      );
      console.log(
        `plan_id=${result.plan_id}`,
      );
      console.log(
        "prior_dropin_restored=true",
      );
      console.log(
        "seed_gateway_restart_performed=true",
      );
      console.log(
        "named_tunnel_restart_performed=false",
      );
      console.log(
        "private_key_access=false",
      );
      console.log(
        "signature_creation=false",
      );
      console.log(
        "funds_movement=false",
      );
    } else if (
      options.command === "apply"
    ) {
      if (
        !options.planFile
        || !options.receiptFile
        || !options.confirmation
      ) {
        fail(
          "apply requires --plan, --receipt, and --confirmation",
        );
      }
      const result =
        await applyVoidPublicOriginBindingSeedServicePlanV1({
          planFile: options.planFile,
          receiptFile: options.receiptFile,
          confirmation:
            options.confirmation,
        });
      console.log(
        VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_APPLY_V1,
      );
      console.log("mode=apply");
      console.log(
        `plan_id=${result.receipt.plan_id}`,
      );
      console.log(
        `receipt_artifact_sha256=${result.receipt_artifact_sha256}`,
      );
      console.log(
        "seed_gateway_restart_performed=true",
      );
      console.log(
        "named_tunnel_restart_performed=false",
      );
      console.log(
        "private_key_access=false",
      );
      console.log(
        "signature_creation=false",
      );
      console.log(
        "funds_movement=false",
      );
    } else {
      usage();
      fail("unknown command");
    }
  } catch (error) {
    console.error(
      "VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_APPLY_V1_HOLD",
    );
    console.error(
      error instanceof Error
        ? error.message
        : String(error),
    );
    process.exitCode = 1;
  }
}
