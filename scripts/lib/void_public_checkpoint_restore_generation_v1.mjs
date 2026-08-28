#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  registerVoidSegStoreProcFdRootV1,
} from "../../dist/chain/segstore_path_confinement_v1.js";

export const VOID_PUBLIC_CHECKPOINT_RESTORE_GENERATION_V1 =
  "void_public_checkpoint_restore_generation_v1";

const GENERATION_TAG = ".void-public-checkpoint-restore-v1-gen-";
const MAX_CREATE_ATTEMPTS = 8;

function fail(message) {
  const error = new Error(message);
  error.voidCheckpointRestoreGenerationFailureV1 = true;
  throw error;
}

function fsyncDirectory(dir) {
  const fd = fs.openSync(dir, "r");
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function lstatBigIntOrNull(target) {
  try {
    return fs.lstatSync(target, { bigint: true });
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function validateParent(dataDir, parent) {
  if (
    typeof dataDir !== "string" ||
    typeof parent !== "string" ||
    !path.isAbsolute(dataDir) ||
    !path.isAbsolute(parent) ||
    path.dirname(dataDir) !== parent
  ) {
    fail("checkpoint restore generation requires absolute sibling paths");
  }
  const st = fs.lstatSync(parent);
  if (!st.isDirectory() || st.isSymbolicLink()) {
    fail("checkpoint restore generation parent must be a real directory");
  }
  if (
    typeof process.getuid === "function" &&
    st.uid !== process.getuid()
  ) {
    fail("checkpoint restore generation parent owner mismatch");
  }
  if ((st.mode & 0o002) !== 0) {
    fail("checkpoint restore generation parent is world-writable");
  }
}

export function createOwnedCheckpointRestoreGenerationV1({
  dataDir,
  parent = path.dirname(dataDir),
} = {}) {
  validateParent(dataDir, parent);
  if (process.platform !== "linux") {
    fail("checkpoint restore generation fd authority requires Linux");
  }

  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
    const token = crypto.randomBytes(16).toString("hex");
    const namespacePath = `${dataDir}${GENERATION_TAG}${token}`;
    try {
      fs.mkdirSync(namespacePath, { mode: 0o700 });
    } catch (error) {
      if (error?.code === "EEXIST") continue;
      throw error;
    }
    fsyncDirectory(parent);

    let fd = null;
    let unregister = null;
    try {
      fd = fs.openSync(
        namespacePath,
        fs.constants.O_RDONLY |
          fs.constants.O_DIRECTORY |
          fs.constants.O_NOFOLLOW,
      );
      const st = fs.fstatSync(fd, { bigint: true });
      if (!st.isDirectory()) {
        fail("created checkpoint restore generation is not a directory");
      }
      if (
        typeof process.getuid === "function" &&
        Number(st.uid) !== process.getuid()
      ) {
        fail("created checkpoint restore generation owner mismatch");
      }
      if ((Number(st.mode) & 0o002) !== 0) {
        fail("created checkpoint restore generation is world-writable");
      }

      const fdRoot = `/proc/self/fd/${fd}`;
      unregister = registerVoidSegStoreProcFdRootV1(fdRoot);

      return {
        schema: VOID_PUBLIC_CHECKPOINT_RESTORE_GENERATION_V1,
        token,
        namespacePath,
        parent,
        dataDir,
        fd,
        fdRoot,
        device: String(st.dev),
        inode: String(st.ino),
        unregister,
        closed: false,
      };
    } catch (error) {
      const cleanupErrors = [];
      if (unregister) {
        try {
          unregister();
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError);
        }
      }
      if (fd !== null) {
        try {
          fs.closeSync(fd);
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError);
        }
      }
      // Do not recursively delete the just-created namespace on an ownership
      // setup failure. It is unique and non-blocking for the next attempt.
      if (cleanupErrors.length > 0) {
        const aggregate = new AggregateError(
          [error, ...cleanupErrors],
          "checkpoint restore generation setup failed and cleanup also failed",
          { cause: error },
        );
        aggregate.voidCheckpointRestoreGenerationFailureV1 =
          Boolean(error?.voidCheckpointRestoreGenerationFailureV1);
        aggregate.voidCheckpointRestoreCleanupFailureV1 = true;
        throw aggregate;
      }
      throw error;
    }
  }

  fail("checkpoint restore generation namespace collision budget exhausted");
}

export function ownedCheckpointRestoreGenerationPathStateV1(
  generation,
) {
  if (!generation || generation.closed) {
    return Object.freeze({ status: "closed" });
  }
  const current = lstatBigIntOrNull(generation.namespacePath);
  if (!current) {
    return Object.freeze({ status: "namespace_missing" });
  }
  if (
    current.isDirectory() &&
    !current.isSymbolicLink() &&
    String(current.dev) === generation.device &&
    String(current.ino) === generation.inode
  ) {
    return Object.freeze({ status: "owned_path_live" });
  }
  return Object.freeze({ status: "foreign_replacement" });
}

export function closeOwnedCheckpointRestoreGenerationV1(
  generation,
) {
  if (!generation || generation.closed) return;
  generation.closed = true;
  try {
    generation.unregister?.();
  } finally {
    fs.closeSync(generation.fd);
  }
}

export function finalizeFailedOwnedCheckpointRestoreGenerationV1(
  generation,
) {
  const state = ownedCheckpointRestoreGenerationPathStateV1(
    generation,
  );
  closeOwnedCheckpointRestoreGenerationV1(generation);

  // Failure retirement is intentionally non-destructive in v1. A unique
  // generation never blocks the next attempt, and no mutable pathname is
  // recursively deleted after failure.
  if (state.status === "owned_path_live") {
    return Object.freeze({
      status: "owned_stale_generation_retained",
      path: generation.namespacePath,
      recursive_delete: false,
      retry_blocked: false,
    });
  }
  if (state.status === "foreign_replacement") {
    return Object.freeze({
      status: "foreign_replacement_preserved",
      path: generation.namespacePath,
      recursive_delete: false,
      retry_blocked: false,
    });
  }
  return Object.freeze({
    status: state.status,
    path: generation.namespacePath,
    recursive_delete: false,
    retry_blocked: false,
  });
}
