#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  computeVoidSegStoreContentSealV1,
  registerVoidSegStoreProcFdRootV1,
} from "../../dist/chain/segstore_path_confinement_v1.js";

export const VOID_PUBLIC_CHECKPOINT_RESTORE_ACTIVATION_V1 =
  "void_public_checkpoint_restore_activation_v1";
export const VOID_PUBLIC_CHECKPOINT_RESTORE_SELECTOR_V1 =
  "void_public_checkpoint_restore_selector_v1";

const GENERATION_TAG = ".void-public-checkpoint-restore-v1-gen-";
const TOKEN_RE = /^[0-9a-f]{32}$/;
const DECIMAL_RE = /^(0|[1-9][0-9]*)$/;
const CHECKPOINT_ID_RE = /^voidpbc1_[0-9a-f]{64}$/;
const CONTENT_SEAL_RE = /^[0-9a-f]{64}$/;
const CHILD_DATA_FD = 4;

function fail(message) {
  const error = new Error(message);
  error.voidCheckpointRestoreActivationFailureV1 = true;
  throw error;
}

function lstatOrNull(target) {
  try {
    return fs.lstatSync(target);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function fsyncDirectory(dir) {
  const fd = fs.openSync(dir, "r");
  let fsyncError = null;
  let committed = false;
  let closeError = null;

  try {
    fs.fsyncSync(fd);
    committed = true;
  } catch (error) {
    fsyncError = error;
  }

  try {
    fs.closeSync(fd);
  } catch (error) {
    closeError = error;
  }

  if (!committed) {
    if (closeError) {
      throw new AggregateError(
        [fsyncError, closeError].filter(Boolean),
        "checkpoint selector parent fsync failed and descriptor retirement also failed",
        { cause: fsyncError ?? closeError },
      );
    }
    throw fsyncError;
  }

  return Object.freeze({
    committed: true,
    postCommitCleanupError:
      closeError instanceof Error
        ? closeError.message
        : closeError
          ? String(closeError)
          : null,
  });
}

function requireAbsoluteSiblingPaths(staging, dataDir, parent) {
  if (
    typeof staging !== "string" ||
    typeof dataDir !== "string" ||
    typeof parent !== "string" ||
    !path.isAbsolute(staging) ||
    !path.isAbsolute(dataDir) ||
    !path.isAbsolute(parent) ||
    staging === dataDir ||
    path.dirname(staging) !== parent ||
    path.dirname(dataDir) !== parent
  ) {
    fail("checkpoint selection requires absolute sibling paths");
  }
  const parentStat = fs.lstatSync(parent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) {
    fail("checkpoint selection parent must be a real directory");
  }
  if (
    typeof process.getuid === "function" &&
    parentStat.uid !== process.getuid()
  ) {
    fail("checkpoint selection parent owner mismatch");
  }
  if ((parentStat.mode & 0o002) !== 0) {
    fail("checkpoint selection parent is world-writable");
  }
}

function selectorTargetV1({ token, device, inode, checkpointId }) {
  return [
    VOID_PUBLIC_CHECKPOINT_RESTORE_SELECTOR_V1,
    token,
    device,
    inode,
    checkpointId,
  ].join(":");
}

function parseSelectorTargetV1(target) {
  const parts = String(target || "").split(":");
  if (
    parts.length !== 5 ||
    parts[0] !== VOID_PUBLIC_CHECKPOINT_RESTORE_SELECTOR_V1 ||
    !TOKEN_RE.test(parts[1]) ||
    !DECIMAL_RE.test(parts[2]) ||
    !DECIMAL_RE.test(parts[3]) ||
    !CHECKPOINT_ID_RE.test(parts[4])
  ) {
    fail("DATA_DIR symlink is not a valid checkpoint restore selector");
  }
  return Object.freeze({
    token: parts[1],
    device: parts[2],
    inode: parts[3],
    checkpointId: parts[4],
    target,
  });
}

export function prepareCheckpointStagingSelectionV1({
  staging,
  dataDir,
  parent,
  token,
  expectedDevice,
  expectedInode,
  checkpointId,
  contentSeal,
}) {
  requireAbsoluteSiblingPaths(staging, dataDir, parent);
  if (
    !TOKEN_RE.test(String(token || "")) ||
    !DECIMAL_RE.test(String(expectedDevice || "")) ||
    !DECIMAL_RE.test(String(expectedInode || "")) ||
    !CHECKPOINT_ID_RE.test(String(checkpointId || "")) ||
    !CONTENT_SEAL_RE.test(String(contentSeal || ""))
  ) {
    fail("checkpoint selection generation identity is invalid");
  }
  const expectedStaging =
    `${dataDir}${GENERATION_TAG}${token}`;
  if (staging !== expectedStaging) {
    fail("checkpoint selection staging path/token mismatch");
  }

  const stagingStat = fs.lstatSync(staging, { bigint: true });
  if (!stagingStat.isDirectory() || stagingStat.isSymbolicLink()) {
    fail("checkpoint selection staging must be a real directory");
  }
  if (
    String(stagingStat.dev) !== expectedDevice ||
    String(stagingStat.ino) !== expectedInode
  ) {
    fail("checkpoint selection staging generation identity mismatch");
  }

  return Object.freeze({
    schema: VOID_PUBLIC_CHECKPOINT_RESTORE_ACTIVATION_V1,
    staging,
    dataDir,
    parent,
    token,
    device: expectedDevice,
    inode: expectedInode,
    checkpointId,
    contentSeal,
    selectorTarget: selectorTargetV1({
      token,
      device: expectedDevice,
      inode: expectedInode,
      checkpointId,
    }),
  });
}

export function publishPreparedCheckpointSelectionV1(prepared) {
  if (
    !prepared ||
    prepared.schema !== VOID_PUBLIC_CHECKPOINT_RESTORE_ACTIVATION_V1
  ) {
    fail("prepared checkpoint selection is invalid");
  }
  if (lstatOrNull(prepared.dataDir)) {
    fail("checkpoint selector publication declined because DATA_DIR exists");
  }

  try {
    fs.symlinkSync(prepared.selectorTarget, prepared.dataDir);
  } catch (error) {
    if (error?.code === "EEXIST") {
      fail("checkpoint selector publication declined because DATA_DIR exists");
    }
    throw error;
  }
  // The parent-directory fsync is the irreversible selector commit point.
  // Do not re-resolve DATA_DIR after it. The parent consumes the exact IPC
  // selection and rejects any missing/replaced selector before node spawn.
  const commit =
    fsyncDirectory(prepared.parent);

  return Object.freeze({
    schema: VOID_PUBLIC_CHECKPOINT_RESTORE_SELECTOR_V1,
    selectorPath: prepared.dataDir,
    selectorTarget: prepared.selectorTarget,
    generationPath: prepared.staging,
    token: prepared.token,
    device: prepared.device,
    inode: prepared.inode,
    checkpointId: prepared.checkpointId,
    contentSeal: prepared.contentSeal,
    directoryRenamePerformed: false,
    selectorPublished: true,
    parentFsync: true,
    postCommitCleanupError:
      commit.postCommitCleanupError,
  });
}

export function openSelectedCheckpointGenerationV1({
  dataDir,
  expectedSelection = null,
} = {}) {
  if (typeof dataDir !== "string" || !path.isAbsolute(dataDir)) {
    fail("selected checkpoint DATA_DIR must be absolute");
  }
  if (process.platform !== "linux") {
    fail("selected checkpoint generation requires Linux proc-fd inheritance");
  }

  const selectorStat = lstatOrNull(dataDir);
  if (!selectorStat) {
    if (expectedSelection) {
      fail("completed restore selector is missing");
    }
    return null;
  }
  if (!selectorStat.isSymbolicLink()) {
    if (expectedSelection) {
      fail("completed restore selector was replaced by a non-selector");
    }
    return null;
  }

  const selectorTarget = fs.readlinkSync(dataDir, "utf8");
  const selector = parseSelectorTargetV1(selectorTarget);
  const generationPath =
    `${dataDir}${GENERATION_TAG}${selector.token}`;

  if (expectedSelection) {
    const expectedKeys = [
      "data_dir",
      "generation_path",
      "selector_target",
      "token",
      "device",
      "inode",
      "checkpoint_id",
      "content_seal",
    ].sort();
    if (
      !expectedSelection ||
      typeof expectedSelection !== "object" ||
      Array.isArray(expectedSelection) ||
      JSON.stringify(Object.keys(expectedSelection).sort()) !==
        JSON.stringify(expectedKeys) ||
      expectedSelection.data_dir !== dataDir ||
      expectedSelection.generation_path !== generationPath ||
      expectedSelection.selector_target !== selectorTarget ||
      expectedSelection.token !== selector.token ||
      expectedSelection.device !== selector.device ||
      expectedSelection.inode !== selector.inode ||
      expectedSelection.checkpoint_id !== selector.checkpointId ||
      !CONTENT_SEAL_RE.test(expectedSelection.content_seal)
    ) {
      fail("selected checkpoint does not match completed restore IPC selection");
    }
  }

  let fd = null;
  try {
    fd = fs.openSync(
      generationPath,
      fs.constants.O_RDONLY |
        fs.constants.O_DIRECTORY |
        fs.constants.O_NOFOLLOW,
    );
    const st = fs.fstatSync(fd, { bigint: true });
    if (!st.isDirectory()) {
      fail("selected checkpoint generation fd is not a directory");
    }
    if (
      typeof process.getuid === "function" &&
      Number(st.uid) !== process.getuid()
    ) {
      fail("selected checkpoint generation owner mismatch");
    }
    if ((Number(st.mode) & 0o002) !== 0) {
      fail("selected checkpoint generation is world-writable");
    }
    if (
      String(st.dev) !== selector.device ||
      String(st.ino) !== selector.inode
    ) {
      fail("selected checkpoint generation identity mismatch");
    }

    const fdRoot = `/proc/self/fd/${fd}`;
    const unregister =
      registerVoidSegStoreProcFdRootV1(fdRoot);
    let contentSeal;
    try {
      contentSeal = computeVoidSegStoreContentSealV1(fdRoot);
    } finally {
      unregister();
    }
    if (
      expectedSelection &&
      contentSeal !== expectedSelection.content_seal
    ) {
      fail(
        `selected checkpoint content seal mismatch expected=${expectedSelection.content_seal} actual=${contentSeal}`,
      );
    }

    const result = {
      schema: VOID_PUBLIC_CHECKPOINT_RESTORE_SELECTOR_V1,
      selectorPath: dataDir,
      selectorTarget: selector.target,
      generationPath,
      token: selector.token,
      device: selector.device,
      inode: selector.inode,
      checkpointId: selector.checkpointId,
      contentSeal,
      fd,
      fdRoot,
      childFd: CHILD_DATA_FD,
      childRoot: `/proc/self/fd/${CHILD_DATA_FD}`,
    };
    fd = null;
    return Object.freeze(result);
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
}

export function closeSelectedCheckpointGenerationV1(selected) {
  if (!selected || !Number.isSafeInteger(selected.fd)) return;
  fs.closeSync(selected.fd);
}
