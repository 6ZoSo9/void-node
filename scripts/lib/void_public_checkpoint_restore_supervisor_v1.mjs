#!/usr/bin/env node
import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  openSelectedCheckpointGenerationV1,
} from "./void_public_checkpoint_restore_activation_v1.mjs";

const MARKER = "VOID_PUBLIC_CHECKPOINT_RESTORE_SUPERVISOR_V1";
const AUTHORITY_MESSAGE_SCHEMA =
  "void_public_bootstrap_adapter_authority_message_v1";
const AUTHORITY_CHILD_SCHEMA =
  "void_public_bootstrap_adapter_authority_child_v1";
const RESTORE_RESULT_SCHEMA =
  "void_public_checkpoint_restore_result_v1";
const CAPABILITY_TIMING_MESSAGE_SCHEMA_V1 =
  "void_public_checkpoint_restore_timing_message_v1";
const CAPABILITY_TIMING_SCHEMA_V1 =
  "void_public_checkpoint_restore_phase_timing_v1";
const TOKEN_RE = /^[0-9a-f]{32}$/;
const DECIMAL_RE = /^(0|[1-9][0-9]*)$/;
const CHECKPOINT_ID_RE = /^voidpbc1_[0-9a-f]{64}$/;
const defaultRestoreScript = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "run_void_public_checkpoint_restore_v1.mjs",
);

const RESTORE_TOTAL_TIMEOUT_DEFAULT_MS_V1 = 45 * 60 * 1000;
const RESTORE_TOTAL_TIMEOUT_MAX_MS_V1 = 60 * 60 * 1000;
const RESTORE_KILL_GRACE_DEFAULT_MS_V1 = 2_000;
const RESTORE_KILL_GRACE_MAX_MS_V1 = 10_000;

function boundedRestoreMsV1(env, name, fallback, maximum) {
  const raw = String(env?.[name] ?? "").trim();
  if (!raw) return fallback;
  if (!/^[1-9][0-9]*$/.test(raw)) {
    throw new Error(`${name} must be a positive integer`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 100 || value > maximum) {
    throw new Error(`${name} must be between 100 and ${maximum}`);
  }
  return value;
}

export function checkpointRestoreEnabledV1(env = process.env) {
  const raw = String(env.VOID_PUBLIC_CHECKPOINT_RESTORE || "0").trim();
  if (raw === "0") return false;
  if (raw === "1") return true;
  throw new Error(
    "VOID_PUBLIC_CHECKPOINT_RESTORE must be exactly 0 or 1",
  );
}

function exactKeysV1(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

function normalizeSelectionV1(selection) {
  const keys = [
    "data_dir",
    "generation_path",
    "selector_target",
    "token",
    "device",
    "inode",
    "checkpoint_id",
    "content_seal",
  ];
  if (
    !exactKeysV1(selection, keys) ||
    typeof selection.data_dir !== "string" ||
    !path.isAbsolute(selection.data_dir) ||
    typeof selection.generation_path !== "string" ||
    !path.isAbsolute(selection.generation_path) ||
    typeof selection.selector_target !== "string" ||
    !TOKEN_RE.test(selection.token) ||
    !DECIMAL_RE.test(selection.device) ||
    !DECIMAL_RE.test(selection.inode) ||
    !CHECKPOINT_ID_RE.test(selection.checkpoint_id) ||
    !/^[0-9a-f]{64}$/.test(selection.content_seal)
  ) {
    throw new Error("checkpoint restore IPC selection is malformed");
  }
  return Object.freeze({ ...selection });
}

function normalizeRestoreResultMessageV1(message) {
  if (
    !message ||
    typeof message !== "object" ||
    Array.isArray(message) ||
    message.schema !== RESTORE_RESULT_SCHEMA
  ) {
    return null;
  }

  if (
    message.type === "selection_prepared" ||
    message.type === "existing_selector"
  ) {
    if (
      !exactKeysV1(message, ["schema", "type", "selection"])
    ) {
      throw new Error("checkpoint restore IPC selection result key mismatch");
    }
    return Object.freeze({
      type: message.type,
      selection: normalizeSelectionV1(message.selection),
    });
  }

  if (message.type === "unavailable") {
    if (
      !exactKeysV1(message, ["schema", "type", "data_dir"]) ||
      typeof message.data_dir !== "string" ||
      !path.isAbsolute(message.data_dir)
    ) {
      throw new Error("checkpoint restore IPC terminal result malformed");
    }
    return Object.freeze({
      type: message.type,
      data_dir: message.data_dir,
      selection: null,
    });
  }

  throw new Error("checkpoint restore IPC result type invalid");
}

function normalizeCapabilityTimingV1(message) {
  if (
    !message ||
    typeof message !== "object" ||
    Array.isArray(message) ||
    message.schema !== CAPABILITY_TIMING_MESSAGE_SCHEMA_V1 ||
    !message.timing ||
    typeof message.timing !== "object" ||
    Array.isArray(message.timing) ||
    message.timing.schema !== CAPABILITY_TIMING_SCHEMA_V1
  ) {
    throw new Error("checkpoint capability timing IPC is malformed");
  }
  const timing = message.timing;
  for (const key of [
    "started_at_unix_ms",
    "checkpoint_head",
    "checkpoint_payload_bytes",
    "total_ms",
  ]) {
    if (
      typeof timing[key] !== "number" ||
      !Number.isSafeInteger(timing[key]) ||
      timing[key] < 0
    ) {
      throw new Error(`checkpoint capability timing ${key} is malformed`);
    }
  }
  if (!CHECKPOINT_ID_RE.test(String(timing.checkpoint_id || ""))) {
    throw new Error("checkpoint capability timing checkpoint_id is malformed");
  }
  if (
    !timing.phases_ms ||
    typeof timing.phases_ms !== "object" ||
    Array.isArray(timing.phases_ms)
  ) {
    throw new Error("checkpoint capability timing phase map is malformed");
  }
  for (const key of [
    "discovery_ms",
    "manifest_ms",
    "segments_ms",
    "semantic_verify_ms",
    "repair_ms",
    "content_seal_ms",
    "activation_ms",
  ]) {
    const value = timing.phases_ms[key];
    if (
      typeof value !== "number" ||
      !Number.isSafeInteger(value) ||
      value < 0
    ) {
      throw new Error(`checkpoint capability timing phase ${key} is malformed`);
    }
  }
  return Object.freeze({
    ...timing,
    phases_ms: Object.freeze({ ...timing.phases_ms }),
  });
}

function lstatOrNullV1(target) {
  try {
    return fs.lstatSync(target);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export function openCheckpointGenerationForRestoreResultV1({
  dataDir,
  restoreResult,
} = {}) {
  if (
    typeof dataDir !== "string" ||
    !path.isAbsolute(dataDir) ||
    !restoreResult ||
    typeof restoreResult !== "object"
  ) {
    throw new Error("checkpoint restore parent selection input invalid");
  }

  if (restoreResult.selection) {
    return openSelectedCheckpointGenerationV1({
      dataDir,
      expectedSelection: restoreResult.selection,
    });
  }

  if (restoreResult.outcome === "unavailable") {
    if (lstatOrNullV1(dataDir)) {
      throw new Error(
        "DATA_DIR appeared after checkpoint-unavailable restore result",
      );
    }
    return null;
  }

  if (restoreResult.outcome === "disabled") {
    const current = lstatOrNullV1(dataDir);
    if (current?.isSymbolicLink()) {
      throw new Error(
        "checkpoint selector startup requires checkpoint restore enabled",
      );
    }
    return null;
  }

  throw new Error("checkpoint restore parent outcome invalid");
}

export async function runPublicCheckpointRestorePreNodeV1({
  adapterBase,
  authorityGeneration,
  authoritySequence,
  authoritySecret,
  env = process.env,
  restoreScript = defaultRestoreScript,
} = {}) {
  if (!checkpointRestoreEnabledV1(env)) {
    console.log(`${MARKER}_DISABLED`);
    return Object.freeze({
      attempted: false,
      enabled: false,
      outcome: "disabled",
      selection: null,
    });
  }

  if (
    typeof adapterBase !== "string" ||
    !adapterBase ||
    typeof authorityGeneration !== "string" ||
    !/^[0-9a-f]{32}$/.test(authorityGeneration) ||
    typeof authoritySequence !== "number" ||
    !Number.isSafeInteger(authoritySequence) ||
    authoritySequence <= 0 ||
    !Buffer.isBuffer(authoritySecret) ||
    authoritySecret.length !== 32
  ) {
    throw new Error("checkpoint restore supervisor authority input invalid");
  }

  const totalTimeoutMs = boundedRestoreMsV1(
    env,
    "VOID_PUBLIC_CHECKPOINT_RESTORE_TOTAL_TIMEOUT_MS",
    RESTORE_TOTAL_TIMEOUT_DEFAULT_MS_V1,
    RESTORE_TOTAL_TIMEOUT_MAX_MS_V1,
  );
  const killGraceMs = boundedRestoreMsV1(
    env,
    "VOID_PUBLIC_CHECKPOINT_RESTORE_KILL_GRACE_MS",
    RESTORE_KILL_GRACE_DEFAULT_MS_V1,
    RESTORE_KILL_GRACE_MAX_MS_V1,
  );

  const child = childProcess.spawn(
    process.execPath,
    [restoreScript],
    {
      env: {
        ...env,
        VOID_PUBLIC_CHECKPOINT_ADAPTER_ORIGIN: adapterBase,
      },
      stdio: ["ignore", "inherit", "inherit", "ipc"],
    },
  );

  const capabilityTimingRequested =
    String(
      env.VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_RECEIPT_FILE || "",
    ).trim().length > 0;
  let authoritySent = false;
  let settled = false;
  let ipcResult = null;
  let capabilityTiming = null;
  let primaryFailure = null;
  let attemptTimer = null;
  let hardKillTimer = null;

  const childStillLive = () =>
    child.exitCode === null && child.signalCode === null;

  const clearLifecycleTimers = () => {
    if (attemptTimer) clearTimeout(attemptTimer);
    if (hardKillTimer) clearTimeout(hardKillTimer);
  };

  const beginFailure = (error) => {
    if (!primaryFailure) {
      primaryFailure =
        error instanceof Error ? error : new Error(String(error));
    }
    if (!childStillLive()) return;
    child.kill("SIGTERM");
    if (!hardKillTimer) {
      hardKillTimer = setTimeout(() => {
        if (childStillLive()) child.kill("SIGKILL");
      }, killGraceMs);
    }
  };

  const startAttemptTimer = () => {
    if (attemptTimer) return;
    attemptTimer = setTimeout(() => {
      beginFailure(
        new Error(
          `HOLD_PUBLIC_CHECKPOINT_RESTORE_TOTAL_TIMEOUT: exceeded ${totalTimeoutMs}ms after authority handshake`,
        ),
      );
    }, totalTimeoutMs);
  };

  const readyTimer = setTimeout(() => {
    if (!authoritySent && childStillLive()) {
      beginFailure(
        new Error(
          "HOLD_PUBLIC_CHECKPOINT_RESTORE_READY_TIMEOUT: child did not request authority within 10000ms",
        ),
      );
    }
  }, 10_000);

  const result = await new Promise((resolve, reject) => {
    child.on("message", (message) => {
      if (
        message &&
        typeof message === "object" &&
        !Array.isArray(message) &&
        message.schema === AUTHORITY_CHILD_SCHEMA &&
        message.type === "ready"
      ) {
        if (authoritySent || !child.connected || primaryFailure) return;
        authoritySent = true;
        startAttemptTimer();
        child.send(
          {
            schema: AUTHORITY_MESSAGE_SCHEMA,
            type: "authority",
            sequence: authoritySequence,
            generation: authorityGeneration,
            adapter_origin: adapterBase,
            secret_hex: authoritySecret.toString("hex"),
          },
          (error) => {
            if (error && !settled) {
              beginFailure(error);
            }
          },
        );
        return;
      }

      if (
        message &&
        typeof message === "object" &&
        !Array.isArray(message) &&
        message.schema === CAPABILITY_TIMING_MESSAGE_SCHEMA_V1
      ) {
        if (!capabilityTimingRequested) return;
        try {
          const normalizedTiming = normalizeCapabilityTimingV1(message);
          if (!capabilityTiming) capabilityTiming = normalizedTiming;
        } catch (error) {
          console.error(
            `${MARKER}_CAPABILITY_TIMING_WARNING=${error?.message || error}`,
          );
        }
        return;
      }

      let normalized;
      try {
        normalized = normalizeRestoreResultMessageV1(message);
      } catch (error) {
        if (!settled) {
          beginFailure(error);
        }
        return;
      }
      if (!normalized) return;
      if (!authoritySent) {
        if (!settled) {
          beginFailure(
            new Error(
              "checkpoint restore IPC result arrived before authority handshake",
            ),
          );
        }
        return;
      }
      if (ipcResult) {
        if (!settled) {
          beginFailure(
            new Error("checkpoint restore child emitted duplicate IPC result"),
          );
        }
        return;
      }
      ipcResult = normalized;
    });

    child.once("error", (error) => {
      if (settled) return;
      primaryFailure =
        primaryFailure ||
        (error instanceof Error ? error : new Error(String(error)));
      settled = true;
      clearTimeout(readyTimer);
      clearLifecycleTimers();
      reject(primaryFailure);
    });

    child.once("exit", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(readyTimer);
      clearLifecycleTimers();
      if (primaryFailure) {
        reject(primaryFailure);
        return;
      }
      if (signal) {
        reject(
          new Error(`checkpoint restore child exited by ${signal}`),
        );
        return;
      }
      if (code !== 0) {
        reject(
          new Error(
            `checkpoint restore child exited with code ${String(code)}`,
          ),
        );
        return;
      }
      if (!authoritySent) {
        reject(
          new Error(
            "checkpoint restore child exited without authority handshake",
          ),
        );
        return;
      }
      if (!ipcResult) {
        reject(
          new Error(
            "checkpoint restore child exited without exact IPC result",
          ),
        );
        return;
      }

      if (
        ipcResult.type === "selection_prepared" ||
        ipcResult.type === "existing_selector"
      ) {
        const selectedResult = {
          attempted: true,
          enabled: true,
          outcome:
            ipcResult.type === "selection_prepared"
              ? "selected"
              : "existing_selector",
          selection: ipcResult.selection,
        };
        resolve(
          Object.freeze(
            capabilityTimingRequested
              ? { ...selectedResult, timing: capabilityTiming }
              : selectedResult,
          ),
        );
        return;
      }

      const terminalResult = {
        attempted: true,
        enabled: true,
        outcome: ipcResult.type,
        selection: null,
      };
      resolve(
        Object.freeze(
          capabilityTimingRequested
            ? { ...terminalResult, timing: capabilityTiming }
            : terminalResult,
        ),
      );
    });
  }).finally(() => {
    clearTimeout(readyTimer);
    clearLifecycleTimers();
  });

  console.log(`${MARKER}_GREEN`);
  console.log("restore_before_node_spawn=true");
  console.log("authority_secret_via_ipc_only=true");
  console.log(`restore_outcome=${result.outcome}`);
  console.log(`selection_ipc_bound=${result.selection ? "true" : "false"}`);
  return result;
}
