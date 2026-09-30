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

const MAX_PLAN_BYTES = 1024 * 1024;
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
  return Object.freeze({
    userDir,
    unitPath,
    dropinDir,
    dropinPath,
  });
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

function writeCreateOnlyPrivateJson(file, value) {
  const fd = fs.openSync(
    file,
    fs.constants.O_WRONLY
      | fs.constants.O_CREAT
      | fs.constants.O_EXCL
      | Number(fs.constants.O_NOFOLLOW || 0),
    0o600,
  );
  try {
    const bytes = Buffer.from(
      JSON.stringify(value, null, 2) + "\n",
      "utf8",
    );
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    fs.fchmodSync(fd, 0o600);
    return Object.freeze({
      bytes,
      sha256: sha256(bytes),
    });
  } finally {
    fs.closeSync(fd);
  }
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
  try {
    const stat = fs.lstatSync(
      dropinPath,
      { bigint: true },
    );
    if (!stat.isFile() || stat.isSymbolicLink()) {
      fail(
        "existing public-origin binding drop-in must be a direct regular file",
      );
    }
    const bytes = fs.readFileSync(dropinPath);
    return Object.freeze({
      existed: true,
      bytes,
      mode: Number(stat.mode) & 0o777,
    });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return Object.freeze({
        existed: false,
        bytes: null,
        mode: null,
      });
    }
    throw error;
  }
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
  fs.chmodSync(dropinPath, mode);
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
) {
  if (!previous.existed) {
    try {
      fs.unlinkSync(dropinPath);
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
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
  systemctlRunner,
}) {
  const failures = [];
  try {
    restoreDropin(
      target.dropinDir,
      target.dropinPath,
      previous,
    );
  } catch (error) {
    failures.push(
      `restore:${String(
        error?.message || error,
      )}`,
    );
  }

  for (const [label, args] of [
    [
      "daemon-reload",
      ["daemon-reload"],
    ],
    [
      "restart",
      [
        "restart",
        VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_UNIT_V1,
      ],
    ],
  ]) {
    try {
      const result =
        systemctlRunner(args);
      if (
        !result
        || result.status !== 0
      ) {
        failures.push(
          `${label}:${String(
            result?.stderr
              || result?.stdout
              || "nonzero status",
          ).trim()}`,
        );
      }
    } catch (error) {
      failures.push(
        `${label}:${String(
          error?.message || error,
        )}`,
      );
    }
  }
  return failures;
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

  const receiptOutput =
    preflightCreateOnly(
      receiptFile,
      "activation receipt",
    );
  const target =
    canonicalHomeTarget(
      homeDir,
      plan,
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

  const previous =
    inspectExistingDropin(
      target.dropinPath,
    );
  let changed = false;

  try {
    const desired = Buffer.from(
      plan.dropin.text,
      "utf8",
    );
    if (
      !previous.existed
      || previous.bytes.length
        !== desired.length
      || !timingSafeEqual(
        previous.bytes,
        desired,
      )
      || previous.mode !== 0o600
    ) {
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
    if (changed) {
      const rollbackFailures =
        rollbackAfterFailure({
          target,
          previous,
          systemctlRunner,
        });
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
}

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
