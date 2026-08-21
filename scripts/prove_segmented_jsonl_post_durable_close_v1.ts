// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createRequire, syncBuiltinESMExports } from "node:module";

import {
  buildSegmentedJsonlV1FromFile,
  readSegmentedJsonlManifestV1,
  verifySegmentedJsonlV1,
} from "../src/storage/segmented_jsonl_v1.js";

const require = createRequire(import.meta.url);
const mutableFs = require("node:fs") as typeof fs;

function makeFixture(records: number): Buffer {
  const rows: Buffer[] = [];
  for (let i = 0; i < records; i++) {
    rows.push(Buffer.from(`${JSON.stringify({ v: 1, id: i, payload: "x".repeat(96) })}\n`, "utf8"));
  }
  return Buffer.concat(rows);
}

function injectCommittedCloseFailure(
  source: string,
  destination: string,
  label: string,
  matchesTarget: (candidate: string) => boolean,
  segmentTargetBytes: number,
): void {
  const originalOpenSync = (mutableFs as any).openSync;
  const originalCloseSync = (mutableFs as any).closeSync;
  const targetFds = new Set<number>();
  let injected = false;

  try {
    (mutableFs as any).openSync = (...args: any[]) => {
      const fd = originalOpenSync(...args);
      if (typeof args[0] === "string" && matchesTarget(String(args[0]))) {
        targetFds.add(fd);
      }
      return fd;
    };
    (mutableFs as any).closeSync = (fd: number) => {
      if (!injected && targetFds.has(fd)) {
        targetFds.delete(fd);
        originalCloseSync(fd);
        injected = true;
        const error = new Error(`injected ${label} close failure`) as NodeJS.ErrnoException;
        error.code = "EIO";
        throw error;
      }
      targetFds.delete(fd);
      return originalCloseSync(fd);
    };
    syncBuiltinESMExports();

    const manifest = buildSegmentedJsonlV1FromFile(source, destination, {
      segmentTargetBytes,
      maxRecordBytes: 1024,
    });

    assert.equal(injected, true, `${label} close fault must execute`);
    const verified = verifySegmentedJsonlV1(destination);
    assert.equal(verified.total_bytes_verified, manifest.total_bytes);
    assert.equal(verified.total_records_verified, manifest.total_records);
    assert.deepEqual(readSegmentedJsonlManifestV1(destination), manifest);
  } finally {
    (mutableFs as any).openSync = originalOpenSync;
    (mutableFs as any).closeSync = originalCloseSync;
    syncBuiltinESMExports();
  }
}

function injectParentFsyncChildLinkSwap(source: string, destination: string): void {
  const originalFsyncSync = (mutableFs as any).fsyncSync;
  const segmentsDir = path.join(destination, "segments");
  const sealedLeaf = path.join(segmentsDir, "000000000000.jsonl");
  const ownedAside = path.join(segmentsDir, ".owned-before-parent-fsync.jsonl");
  const foreignAside = path.join(segmentsDir, ".foreign-at-parent-fsync.jsonl");
  const foreignBody = Buffer.from("foreign-generation-at-parent-fsync\n", "utf8");
  let injected = false;
  let failure: unknown = null;

  try {
    (mutableFs as any).fsyncSync = (fd: number) => {
      let fdPath = "";
      try { fdPath = fs.readlinkSync(`/proc/self/fd/${fd}`); }
      catch { return originalFsyncSync(fd); }

      if (!injected && path.resolve(fdPath) === path.resolve(segmentsDir) && fs.existsSync(sealedLeaf)) {
        fs.renameSync(sealedLeaf, ownedAside);
        fs.writeFileSync(sealedLeaf, foreignBody, { flag: "wx", mode: 0o400 });

        // The real parent-directory durability boundary runs while a foreign
        // generation occupies the canonical child basename.
        originalFsyncSync(fd);

        fs.renameSync(sealedLeaf, foreignAside);
        // Restore the exact owned file without chmod/write/link-count mutation.
        // The repaired writer must detect the directory-entry mutation epoch,
        // not rely on a changed child-inode generation as its witness.
        fs.renameSync(ownedAside, sealedLeaf);
        injected = true;
        return;
      }
      return originalFsyncSync(fd);
    };
    syncBuiltinESMExports();

    try {
      buildSegmentedJsonlV1FromFile(source, destination, {
        segmentTargetBytes: 4096,
        maxRecordBytes: 1024,
      });
    } catch (error) {
      failure = error;
    }
  } finally {
    (mutableFs as any).fsyncSync = originalFsyncSync;
    syncBuiltinESMExports();
  }

  assert.equal(injected, true, "parent-fsync child-link swap must execute");
  assert.ok(failure instanceof Error, "parent-fsync child-link swap must fail closed");
  assert.match(
    failure.message,
    /VOID_SEGMENTED_JSONL_V1:WRITE_PARENT_DIRECTORY_EPOCH_CHANGED:/,
    "parent directory mutation epoch must be the terminal",
  );
  assert.equal(
    fs.readFileSync(foreignAside, "utf8"),
    foreignBody.toString("utf8"),
    "foreign generation must survive unchanged",
  );
  assert.equal(fs.existsSync(path.join(destination, "manifest.v1.json")), false, "manifest must not publish after child-link epoch mismatch");
  assert.equal(fs.existsSync(sealedLeaf), true, "owned sealed generation may remain for later exact recovery");
}

function injectParentFsyncPreSampleAba(source: string, destination: string): void {
  const originalFstatSync = (mutableFs as any).fstatSync;
  const originalFsyncSync = (mutableFs as any).fsyncSync;
  const originalLstatSync = (mutableFs as any).lstatSync;
  const originalRenameSync = (mutableFs as any).renameSync;
  const originalWriteFileSync = (mutableFs as any).writeFileSync;
  const segmentsDir = path.join(destination, "segments");
  const sealedLeaf = path.join(segmentsDir, "000000000000.jsonl");
  const ownedAside = path.join(segmentsDir, ".owned-before-pre-fsync-sample.jsonl");
  const foreignAside = path.join(segmentsDir, ".foreign-before-pre-fsync-sample.jsonl");
  const foreignBody = Buffer.from("foreign-generation-before-pre-fsync-sample\n", "utf8");
  let swapped = false;
  let parentFsyncDone = false;
  let restored = false;
  let failure: unknown = null;

  const fdPath = (fd: number): string => {
    try { return fs.readlinkSync(`/proc/self/fd/${fd}`); }
    catch { return ""; }
  };

  try {
    (mutableFs as any).fstatSync = (fd: number, ...args: any[]) => {
      if (
        !swapped &&
        path.resolve(fdPath(fd)) === path.resolve(segmentsDir) &&
        fs.existsSync(sealedLeaf)
      ) {
        originalRenameSync(sealedLeaf, ownedAside);
        originalWriteFileSync(sealedLeaf, foreignBody, { flag: "wx", mode: 0o400 });
        swapped = true;
      }
      return originalFstatSync(fd, ...args);
    };
    (mutableFs as any).fsyncSync = (fd: number) => {
      const result = originalFsyncSync(fd);
      if (swapped && path.resolve(fdPath(fd)) === path.resolve(segmentsDir)) {
        parentFsyncDone = true;
      }
      return result;
    };
    (mutableFs as any).lstatSync = (candidate: fs.PathLike, ...args: any[]) => {
      if (
        swapped &&
        parentFsyncDone &&
        !restored &&
        typeof candidate === "string" &&
        path.resolve(candidate) === path.resolve(segmentsDir)
      ) {
        originalRenameSync(sealedLeaf, foreignAside);
        originalRenameSync(ownedAside, sealedLeaf);
        restored = true;
      }
      return originalLstatSync(candidate as any, ...args);
    };
    syncBuiltinESMExports();

    try {
      buildSegmentedJsonlV1FromFile(source, destination, {
        segmentTargetBytes: 4096,
        maxRecordBytes: 1024,
      });
    } catch (error) {
      failure = error;
    }
  } finally {
    (mutableFs as any).fstatSync = originalFstatSync;
    (mutableFs as any).fsyncSync = originalFsyncSync;
    (mutableFs as any).lstatSync = originalLstatSync;
    syncBuiltinESMExports();
  }

  assert.equal(swapped, true, "pre-sample child-link swap must execute");
  assert.equal(parentFsyncDone, true, "real parent fsync must execute while foreign child is canonical");
  assert.equal(restored, true, "owned child must be restored after the old post-fsync sample window");
  assert.ok(failure instanceof Error, "pre-sample ABA child-link swap must fail closed");
  assert.match(
    failure.message,
    /VOID_SEGMENTED_JSONL_V1:WRITE_PARENT_DIRECTORY_EPOCH_CHANGED:/,
    "one parent mutation epoch must span child decision, fsync, and final child recheck",
  );
  assert.equal(
    fs.readFileSync(foreignAside, "utf8"),
    foreignBody.toString("utf8"),
    "foreign ABA generation must survive unchanged",
  );
  assert.equal(fs.existsSync(path.join(destination, "manifest.v1.json")), false, "manifest must not publish after pre-sample ABA mismatch");
  assert.equal(fs.existsSync(sealedLeaf), true, "owned sealed generation may remain for exact recovery after ABA hold");
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-segmented-jsonl-close-v1-"));
fs.chmodSync(tmp, 0o700);
try {
  const source = path.join(tmp, "source.jsonl");
  fs.writeFileSync(source, makeFixture(500), { mode: 0o600 });

  injectCommittedCloseFailure(
    source,
    path.join(tmp, "sealed-close-store"),
    "sealed leaf",
    candidate => candidate.endsWith("/000000000000.jsonl"),
    4096,
  );

  injectCommittedCloseFailure(
    source,
    path.join(tmp, "active-close-store"),
    "active leaf",
    candidate => candidate.endsWith("/active.jsonl"),
    8 * 1024 * 1024,
  );

  injectCommittedCloseFailure(
    source,
    path.join(tmp, "manifest-close-store"),
    "manifest",
    candidate => candidate.endsWith("/manifest.v1.json"),
    4096,
  );

  injectParentFsyncChildLinkSwap(
    source,
    path.join(tmp, "parent-fsync-child-link-store"),
  );

  injectParentFsyncPreSampleAba(
    source,
    path.join(tmp, "parent-fsync-pre-sample-aba-store"),
  );

  console.log("post_durable_sealed_close_truth_preserved=true");
  console.log("post_durable_active_close_truth_preserved=true");
  console.log("post_durable_manifest_close_truth_preserved=true");
  console.log("parent_fsync_directory_entry_epoch_bound=true");
  console.log("foreign_parent_fsync_replacement_preserved=true");
  console.log("parent_fsync_pre_sample_aba_rejected=true");
  console.log("VOID_SEGMENTED_JSONL_POST_DURABLE_CLOSE_V1_PROOF_GREEN");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
