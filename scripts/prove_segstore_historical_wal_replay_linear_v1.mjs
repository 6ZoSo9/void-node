#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SegStore } from "../dist/chain/seg_store.js";

const MARKER = "VOID_SEGSTORE_HISTORICAL_WAL_REPLAY_LINEAR_V1_PROOF_GREEN";
const BLOCKS = 10_000;

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function frame(block) {
  const body = Buffer.from(JSON.stringify(block));
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length, 0);
  return Buffer.concat([len, body]);
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-historical-wal-linear-"));
try {
  const seg = "00000000";
  const segDir = path.join(root, "segments", seg);
  const walDir = path.join(root, "wal");
  fs.mkdirSync(segDir, { recursive: true });
  fs.mkdirSync(walDir, { recursive: true });

  const bin = path.join(segDir, "blocks.bin");
  const wal = path.join(walDir, `${seg}.wal`);
  const head = BLOCKS - 1;

  const blockFd = fs.openSync(bin, "w");
  const walFd = fs.openSync(wal, "w");
  try {
    for (let n = 0; n < BLOCKS; n++) {
      const block = {
        number: n,
        timestamp: n + 1,
        parentHash: n === 0 ? "0x0" : `0x${n - 1}`,
        hash: `0x${n}`,
        txs: [],
      };
      fs.writeSync(blockFd, frame(block));
      fs.writeSync(
        walFd,
        JSON.stringify({
          v: 4,
          mode: "legacy-v2fs-historical-v1",
          n,
          b64: Buffer.from(JSON.stringify(block)).toString("base64"),
          ts: n + 1,
        }) + "\n",
      );
    }
  } finally {
    fs.closeSync(blockFd);
    fs.closeSync(walFd);
  }

  fs.writeFileSync(
    path.join(root, "heads.json"),
    JSON.stringify({ head, number: head, hash: "0x0" }, null, 2),
  );
  fs.writeFileSync(path.join(root, "head.txt"), `${head}\n`);

  const binShaBefore = sha256(bin);
  const headJsonBefore = fs.readFileSync(path.join(root, "heads.json"), "utf8");
  const headTxtBefore = fs.readFileSync(path.join(root, "head.txt"), "utf8");

  const originalLoadBlock = SegStore.prototype.loadBlock;
  let loadBlockCalls = 0;
  SegStore.prototype.loadBlock = function forbiddenHistoricalWalPointLookup() {
    loadBlockCalls++;
    throw new Error("historical WAL replay must not call loadBlock per record");
  };

  let store;
  try {
    store = new SegStore(root, { sparseEvery: 256 });
  } finally {
    SegStore.prototype.loadBlock = originalLoadBlock;
  }

  assert.equal(
    loadBlockCalls,
    0,
    "historical WAL replay performed per-record canonical loadBlock lookups",
  );
  assert.equal(
    fs.existsSync(wal),
    false,
    "exact already-durable historical WAL should be pruned",
  );
  assert.equal(
    sha256(bin),
    binShaBefore,
    "historical WAL reconciliation mutated canonical blocks.bin",
  );
  assert.equal(
    fs.readFileSync(path.join(root, "heads.json"), "utf8"),
    headJsonBefore,
    "historical WAL reconciliation mutated durable heads.json",
  );
  assert.equal(
    fs.readFileSync(path.join(root, "head.txt"), "utf8"),
    headTxtBefore,
    "historical WAL reconciliation mutated durable head.txt",
  );

  const metrics = store.getWalReplayMetrics();
  assert.equal(metrics.replay_runs_total, 1);
  assert.equal(metrics.replay_last_ok, 1);
  assert.equal(metrics.replay_entries_applied_total, 0);

  console.log(MARKER);
  console.log(`fixture_blocks=${BLOCKS}`);
  console.log("historical_wal_point_loadblock_calls=0");
  console.log("canonical_block_bytes_unchanged=true");
  console.log("head_markers_unchanged=true");
  console.log("already_durable_historical_wal_pruned=true");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
