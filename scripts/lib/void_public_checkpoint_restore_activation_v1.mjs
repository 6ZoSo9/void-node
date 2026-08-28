#!/usr/bin/env node
import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const VOID_PUBLIC_CHECKPOINT_RESTORE_ACTIVATION_V1 =
  "void_public_checkpoint_restore_activation_v1";

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
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function requireReviewedGnuMvV1() {
  const version = childProcess.spawnSync("mv", ["--version"], {
    encoding: "utf8",
    timeout: 5_000,
    maxBuffer: 1024 * 1024,
  });
  if (version.status !== 0) {
    fail("GNU mv is required for no-clobber checkpoint activation");
  }
  const first = String(version.stdout || "")
    .split(/\r?\n/, 1)[0]
    .trim();
  const match = /^mv \(GNU coreutils\) ([0-9]+)\.([0-9]+)(?:\.([0-9]+))?$/.exec(
    first,
  );
  if (!match) {
    fail("checkpoint activation requires GNU coreutils mv");
  }
  const major = Number(match[1]);
  const minor = Number(match[2]);
  if (
    !Number.isSafeInteger(major) ||
    !Number.isSafeInteger(minor) ||
    major < 9 ||
    (major === 9 && minor < 4)
  ) {
    fail(
      `checkpoint activation requires reviewed GNU coreutils mv >= 9.4; got ${first}`,
    );
  }
  return Object.freeze({ first, major, minor });
}

export function activateCheckpointStagingNoReplaceV1({
  staging,
  dataDir,
  parent,
  expectedDevice,
  expectedInode,
}) {
  if (
    typeof staging !== "string" ||
    typeof dataDir !== "string" ||
    typeof parent !== "string" ||
    !path.isAbsolute(staging) ||
    !path.isAbsolute(dataDir) ||
    !path.isAbsolute(parent)
  ) {
    fail("checkpoint activation paths must be absolute");
  }
  if (
    staging === dataDir ||
    path.dirname(staging) !== parent ||
    path.dirname(dataDir) !== parent
  ) {
    fail("checkpoint activation requires sibling staging and DATA_DIR");
  }

  if (
    typeof expectedDevice !== "string" ||
    !/^[0-9]+$/.test(expectedDevice) ||
    typeof expectedInode !== "string" ||
    !/^[0-9]+$/.test(expectedInode)
  ) {
    fail("checkpoint activation expected generation identity is invalid");
  }

  const parentStat = fs.lstatSync(parent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) {
    fail("checkpoint activation parent must be a real directory");
  }

  const stagingStat = fs.lstatSync(staging, { bigint: true });
  if (!stagingStat.isDirectory() || stagingStat.isSymbolicLink()) {
    fail("checkpoint activation staging must be a real directory");
  }
  if (
    String(stagingStat.dev) !== expectedDevice ||
    String(stagingStat.ino) !== expectedInode
  ) {
    fail("checkpoint activation staging generation identity mismatch");
  }

  const mv = requireReviewedGnuMvV1();
  const moved = childProcess.spawnSync(
    "mv",
    [
      "-T",
      "--no-copy",
      "--no-clobber",
      "--",
      staging,
      dataDir,
    ],
    {
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    },
  );

  const sourceAfter = lstatOrNull(staging);
  const targetAfter = lstatOrNull(dataDir);

  // A no-clobber refusal is the expected fail-closed result when the
  // destination exists or appears during activation. GNU mv may return a
  // nonzero status for that refusal, so classify the observed filesystem
  // postcondition before surfacing a generic command failure.
  if (sourceAfter && targetAfter) {
    fail("checkpoint activation declined because DATA_DIR exists");
  }

  if (moved.status !== 0) {
    fail(
      `checkpoint no-clobber activation command failed: ${String(
        moved.stderr || moved.stdout || "",
      ).trim()}`,
    );
  }

  if (sourceAfter) {
    fail("checkpoint activation source remained without a destination");
  }

  if (
    !targetAfter ||
    !targetAfter.isDirectory() ||
    targetAfter.isSymbolicLink()
  ) {
    fail("checkpoint activation destination is not the staged directory");
  }

  const targetIdentity = fs.lstatSync(dataDir, { bigint: true });
  if (
    String(targetIdentity.dev) !== expectedDevice ||
    String(targetIdentity.ino) !== expectedInode
  ) {
    fail("checkpoint activation did not preserve staged directory identity");
  }

  fsyncDirectory(parent);

  return Object.freeze({
    schema: VOID_PUBLIC_CHECKPOINT_RESTORE_ACTIVATION_V1,
    activated: true,
    no_clobber: true,
    no_copy: true,
    same_directory_identity: true,
    parent_fsync: true,
    mv_version: mv.first,
  });
}
