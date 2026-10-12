#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { SegStore } from "../dist/chain/seg_store.js";
import {
  computeVoidSegStoreContentSealV1,
  installVoidSegStoreContentSealTestHookV1,
} from "../dist/chain/segstore_path_confinement_v1.js";

const MARKER =
  "VOID_PUBLIC_CHECKPOINT_CONTENT_USE_COUPLING_V1_PROOF";

function frameBlock(block) {
  const body = Buffer.from(JSON.stringify(block));
  const prefix = Buffer.alloc(4);
  prefix.writeUInt32BE(body.length, 0);
  return Buffer.concat([prefix, body]);
}

function makeTree(parent, label) {
  const root = path.join(parent, label);
  const segmentDir = path.join(root, "segments", "00000000");
  fs.mkdirSync(segmentDir, { recursive: true, mode: 0o700 });

  const block = { number: 0, timestamp: 1 };
  const frame = frameBlock(block);
  fs.writeFileSync(
    path.join(segmentDir, "blocks.bin"),
    frame,
    { mode: 0o600 },
  );
  fs.writeFileSync(
    path.join(segmentDir, "index.sparse"),
    `${JSON.stringify({ n: 0, off: 0 })}\n`,
    { mode: 0o600 },
  );
  fs.writeFileSync(
    path.join(segmentDir, "meta.json"),
    `${JSON.stringify({
      from: 0,
      to: 0,
      bytes: frame.length,
      createdAt: 1,
      updatedAt: 1,
    })}\n`,
    { mode: 0o600 },
  );
  fs.writeFileSync(
    path.join(root, "checkpoint.json"),
    '{"fixture":true}\n',
    { mode: 0o600 },
  );
  fs.writeFileSync(
    path.join(root, "head.txt"),
    "0\n",
    { mode: 0o600 },
  );
  fs.writeFileSync(
    path.join(root, "heads.json"),
    `${JSON.stringify({ head: 0, number: 0, hash: "0x0" })}\n`,
    { mode: 0o600 },
  );
  return { root, segmentDir, frame };
}

function withInheritedEnv(root, fn) {
  const fd = fs.openSync(
    root,
    fs.constants.O_RDONLY |
      fs.constants.O_DIRECTORY |
      fs.constants.O_NOFOLLOW,
  );
  const st = fs.fstatSync(fd, { bigint: true });
  const seal = computeVoidSegStoreContentSealV1(root);

  const keys = [
    "VOID_SEGSTORE_INHERITED_DATA_AUTHORITY_V1",
    "VOID_SEGSTORE_INHERITED_DATA_FD_V1",
    "VOID_SEGSTORE_INHERITED_DATA_DEV_V1",
    "VOID_SEGSTORE_INHERITED_DATA_INO_V1",
    "VOID_SEGSTORE_INHERITED_DATA_CONTENT_SEAL_V1",
  ];
  const prior = new Map(
    keys.map((key) => [
      key,
      Object.prototype.hasOwnProperty.call(process.env, key)
        ? process.env[key]
        : null,
    ]),
  );

  process.env.VOID_SEGSTORE_INHERITED_DATA_AUTHORITY_V1 = "1";
  process.env.VOID_SEGSTORE_INHERITED_DATA_FD_V1 =
    String(fd);
  process.env.VOID_SEGSTORE_INHERITED_DATA_DEV_V1 =
    String(st.dev);
  process.env.VOID_SEGSTORE_INHERITED_DATA_INO_V1 =
    String(st.ino);
  process.env.VOID_SEGSTORE_INHERITED_DATA_CONTENT_SEAL_V1 =
    seal;

  try {
    return fn({
      fd,
      procRoot: `/proc/self/fd/${fd}`,
      seal,
    });
  } finally {
    for (const [key, value] of prior.entries()) {
      if (value === null) delete process.env[key];
      else process.env[key] = value;
    }
    fs.closeSync(fd);
  }
}

const tmp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-checkpoint-use-coupling-v1-"),
);
fs.chmodSync(tmp, 0o700);

try {
  // Exact Feynman barrier: heads.json passes its local file hash/stamp,
  // then is rewritten while later tree entries remain to be scanned.
  const raced = makeTree(tmp, "raced");
  let barrierReached = false;
  let mutationPerformed = false;

  withInheritedEnv(raced.root, ({ procRoot }) => {
    const uninstall =
      installVoidSegStoreContentSealTestHookV1((event) => {
        if (
          barrierReached ||
          event.phase !== "after-file-hash" ||
          event.relative_path !== "heads.json"
        ) {
          return;
        }
        barrierReached = true;
        fs.writeFileSync(
          path.join(raced.root, "heads.json"),
          `${JSON.stringify({
            head: 9,
            number: 9,
            hash: "0x9",
          })}\n`,
        );
        mutationPerformed = true;
      });

    try {
      assert.throws(
        () => new SegStore(procRoot, { sparseEvery: 16 }),
        /inherited content hash mismatch: heads\.json/,
      );
    } finally {
      uninstall();
    }
  });

  assert.equal(barrierReached, true);
  assert.equal(mutationPerformed, true);
  assert.equal(
    fs.existsSync(path.join(raced.root, "wal")),
    false,
    "WAL directory must not exist before the inherited-content HOLD",
  );

  // Clean inherited startup succeeds, skips WAL replay, and retains the
  // per-file authority for exact later reads.
  const clean = makeTree(tmp, "clean");
  withInheritedEnv(clean.root, ({ procRoot }) => {
    const store = new SegStore(procRoot, { sparseEvery: 16 });
    assert.equal(store.loadHeadNumber(), 0);
    assert.equal(
      store.getWalReplayMetrics().replay_runs_total,
      0,
    );
    assert.deepEqual(store.loadBlock(0), {
      number: 0,
      timestamp: 1,
    });

    // Same root inode and basename, same byte length, different bytes.
    const bin = path.join(
      clean.segmentDir,
      "blocks.bin",
    );
    const changed = fs.readFileSync(bin);
    changed[changed.length - 2] ^= 1;
    fs.writeFileSync(bin, changed);

    assert.throws(
      () => store.loadBlock(0),
      /inherited content hash mismatch: segments\/00000000\/blocks\.bin/,
    );
  });

  // Metadata use is coupled too: mutation after a successful constructor
  // cannot be silently consumed by loadHeadNumber while handoff authority
  // remains live.
  const headRace = makeTree(tmp, "head-race");
  withInheritedEnv(headRace.root, ({ procRoot }) => {
    const store = new SegStore(procRoot, { sparseEvery: 16 });
    fs.writeFileSync(
      path.join(headRace.root, "head.txt"),
      "9\n",
    );
    assert.throws(
      () => store.loadHeadNumber(),
      /inherited content hash mismatch: head\.txt/,
    );
  });

  // Ordinary stores retain the existing non-inherited fast path.
  const ordinary = path.join(tmp, "ordinary");
  fs.mkdirSync(ordinary, { mode: 0o700 });
  const ordinaryStore = new SegStore(
    ordinary,
    { sparseEvery: 16 },
  );
  assert.equal(ordinaryStore.loadHeadNumber(), -1);

  console.log("mid_scan_early_leaf_rewrite_reached=true");
  console.log("mid_scan_early_leaf_rewrite_holds=true");
  console.log("wal_created_before_hold=false");
  console.log("wal_replay_before_hold=false");
  console.log("startup_metadata_read_use_coupled=true");
  console.log("segment_read_use_coupled=true");
  console.log("same_size_segment_rewrite_rejected=true");
  console.log("post_constructor_head_rewrite_rejected=true");
  console.log("ordinary_store_behavior_preserved=true");
  console.log("serial_double_hash_snapshot_claim=false");
  console.log("fs_verity_required=false");
  console.log(`${MARKER}_GREEN`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
