#!/usr/bin/env node
import childProcess from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_PUBLIC_CHECKPOINT_RESTORE_SUPERVISOR_V1";
const AUTHORITY_MESSAGE_SCHEMA =
  "void_public_bootstrap_adapter_authority_message_v1";
const AUTHORITY_CHILD_SCHEMA =
  "void_public_bootstrap_adapter_authority_child_v1";
const defaultRestoreScript = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "run_void_public_checkpoint_restore_v1.mjs",
);

export function checkpointRestoreEnabledV1(env = process.env) {
  const raw = String(env.VOID_PUBLIC_CHECKPOINT_RESTORE || "0").trim();
  if (raw === "0") return false;
  if (raw === "1") return true;
  throw new Error(
    "VOID_PUBLIC_CHECKPOINT_RESTORE must be exactly 0 or 1",
  );
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

  let authoritySent = false;
  let settled = false;
  const readyTimer = setTimeout(() => {
    if (!authoritySent && child.exitCode === null) {
      child.kill("SIGTERM");
    }
  }, 10_000);

  const result = await new Promise((resolve, reject) => {
    child.on("message", (message) => {
      if (
        authoritySent ||
        !message ||
        typeof message !== "object" ||
        Array.isArray(message) ||
        message.schema !== AUTHORITY_CHILD_SCHEMA ||
        message.type !== "ready" ||
        !child.connected
      ) {
        return;
      }
      authoritySent = true;
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
            child.kill("SIGTERM");
            reject(error);
          }
        },
      );
    });

    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });

    child.once("exit", (code, signal) => {
      if (settled) return;
      settled = true;
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
      resolve(
        Object.freeze({
          attempted: true,
          enabled: true,
        }),
      );
    });
  }).finally(() => {
    clearTimeout(readyTimer);
  });

  console.log(`${MARKER}_GREEN`);
  console.log("restore_before_node_spawn=true");
  console.log("authority_secret_via_ipc_only=true");
  return result;
}
