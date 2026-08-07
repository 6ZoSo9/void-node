// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/chain/auto_repair.ts
/**
 * Crash-safe best-effort repair for the canonical SegStore layout.
 * - Scans length-prefixed blocks.bin frames without trusting metadata/indexes.
 * - Truncates only an unambiguously incomplete trailing frame.
 * - Fails closed on complete-but-malformed or non-canonical frames.
 * - Rebuilds sparse indexes and segment metadata from physical frame truth.
 * - Reconciles heads.json/head.txt to the highest complete canonical frame.
 * - Supports a truthful dry-run that reports the exact repair plan without writes.
 *
 * This function mutates only the supplied data directory when explicitly run
 * with dryRun disabled.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

function recordSmallEmptyCatchVisibilityFailure_src_chain_auto_repair_ts(
  scope: string,
  err: unknown,
): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_SMALL_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE", {
    file: "src/chain/auto_repair.ts",
    scope,
    message,
  });
}

type Meta = {
  from: number;
  to: number;
  bytes: number;
  createdAt: number;
  updatedAt: number;
};

type ScannedFrame = { off: number; end: number; n: number };
type FrameScan = {
  frames: ScannedFrame[];
  completeBytes: number;
  fileBytes: number;
  tornTailBytes: number;
  lastN: number;
};

type PreparedSegment = {
  name: string;
  base: number;
  bin: string;
  idx: string;
  meta: string;
  binMissing: boolean;
  scan: FrameScan;
};

export type AutoRepairOptions = {
  sparseEvery?: number;
  dryRun?: boolean;
};

export type AutoRepairPlan = {
  createDirectories: string[];
  createBlockFiles: string[];
  truncateTornTails: Array<{
    segment: string;
    path: string;
    fromBytes: number;
    toBytes: number;
    bytes: number;
  }>;
  rebuildSparseIndexes: Array<{
    segment: string;
    path: string;
    entries: number;
  }>;
  rebuildSegmentMeta: Array<{
    segment: string;
    path: string;
    from: number;
    to: number;
    bytes: number;
  }>;
  reconcileHeads: {
    headsJson: string;
    headTxt: string;
    head: number;
  };
};

const SEG_SPAN = 10_000;

function ensureDir(p: string): void {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function segNameFor(n: number): string {
  return String(Math.floor(n / SEG_SPAN) * SEG_SPAN).padStart(8, "0");
}

function segmentBaseFromName(name: string): number | null {
  if (!/^\d{8,}$/.test(name)) return null;
  const base = Number(name);
  if (!Number.isSafeInteger(base) || base < 0 || base % SEG_SPAN !== 0) return null;
  return segNameFor(base) === name ? base : null;
}

function segPaths(root: string, seg: string) {
  const dir = path.join(root, "segments", seg);
  return {
    dir,
    bin: path.join(dir, "blocks.bin"),
    idx: path.join(dir, "index.sparse"),
    meta: path.join(dir, "meta.json"),
  };
}

function atomicWriteText(target: string, text: string): void {
  const dir = path.dirname(target);
  ensureDir(dir);
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`;
  try {
    fs.writeFileSync(tmp, text);
    const fd = fs.openSync(tmp, "r");
    try {
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmp, target);
    try {
      const dfd = fs.openSync(dir, "r");
      try {
        fs.fsyncSync(dfd);
      } finally {
        fs.closeSync(dfd);
      }
    } catch (err) {
      recordSmallEmptyCatchVisibilityFailure_src_chain_auto_repair_ts("directory-fsync", err);
    }
  } finally {
    if (fs.existsSync(tmp)) {
      try {
        fs.unlinkSync(tmp);
      } catch (err) {
        recordSmallEmptyCatchVisibilityFailure_src_chain_auto_repair_ts("temporary-cleanup", err);
      }
    }
  }
}

function atomicWriteJson(target: string, value: unknown): void {
  atomicWriteText(target, JSON.stringify(value, null, 2));
}

function readFrames(binPath: string, segmentName: string): FrameScan {
  const frames: ScannedFrame[] = [];
  if (!fs.existsSync(binPath)) {
    return { frames, completeBytes: 0, fileBytes: 0, tornTailBytes: 0, lastN: -1 };
  }

  const fd = fs.openSync(binPath, "r");
  try {
    const st = fs.fstatSync(fd);
    const lenBuf = Buffer.alloc(4);
    let off = 0;
    let previousN: number | null = null;

    while (off < st.size) {
      if (st.size - off < 4) {
        return {
          frames,
          completeBytes: off,
          fileBytes: st.size,
          tornTailBytes: st.size - off,
          lastN: frames.length ? frames[frames.length - 1].n : -1,
        };
      }

      const gotLength = fs.readSync(fd, lenBuf, 0, 4, off);
      if (gotLength !== 4) {
        throw new Error(`short length-prefix read in ${segmentName} at offset ${off}: got ${gotLength}`);
      }

      const len = lenBuf.readUInt32BE(0);
      const start = off + 4;
      const end = start + len;
      if (end > st.size) {
        return {
          frames,
          completeBytes: off,
          fileBytes: st.size,
          tornTailBytes: st.size - off,
          lastN: frames.length ? frames[frames.length - 1].n : -1,
        };
      }

      const body = Buffer.alloc(len);
      const gotBody = fs.readSync(fd, body, 0, len, start);
      if (gotBody !== len) {
        throw new Error(`short complete-frame read in ${segmentName} at offset ${off}: expected ${len}, got ${gotBody}`);
      }

      let parsed: any;
      try {
        parsed = JSON.parse(body.toString("utf8"));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`complete frame JSON invalid in ${segmentName} at offset ${off}: ${message}`);
      }

      const n = parsed?.number;
      if (!Number.isSafeInteger(n) || n < 0) {
        throw new Error(`complete frame block number invalid in ${segmentName} at offset ${off}`);
      }
      if (segNameFor(n) !== segmentName) {
        throw new Error(`complete frame segment mismatch in ${segmentName}: block ${n}`);
      }
      if (previousN !== null && n !== previousN + 1) {
        throw new Error(`complete frame order invalid in ${segmentName}: previous ${previousN}, block ${n}`);
      }

      frames.push({ off, end, n });
      previousN = n;
      off = end;
    }

    return {
      frames,
      completeBytes: off,
      fileBytes: st.size,
      tornTailBytes: 0,
      lastN: frames.length ? frames[frames.length - 1].n : -1,
    };
  } finally {
    try {
      fs.closeSync(fd);
    } catch (err) {
      recordSmallEmptyCatchVisibilityFailure_src_chain_auto_repair_ts("frame-scan-close", err);
    }
  }
}

function truncateTornTail(binPath: string, completeBytes: number): void {
  fs.truncateSync(binPath, completeBytes);
  const fd = fs.openSync(binPath, "r");
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  try {
    const dfd = fs.openSync(path.dirname(binPath), "r");
    try {
      fs.fsyncSync(dfd);
    } finally {
      fs.closeSync(dfd);
    }
  } catch (err) {
    recordSmallEmptyCatchVisibilityFailure_src_chain_auto_repair_ts("torn-tail-directory-fsync", err);
  }
}

function sparseIndexText(
  frames: readonly ScannedFrame[],
  sparseEvery: number,
): string {
  const lines = frames
    .filter((frame) => frame.n % sparseEvery === 0)
    .map((frame) => JSON.stringify({ n: frame.n, off: frame.off }));
  return lines.length ? `${lines.join("\n")}\n` : "";
}

function rebuildSparseIndex(
  idxPath: string,
  frames: readonly ScannedFrame[],
  sparseEvery: number,
): void {
  atomicWriteText(idxPath, sparseIndexText(frames, sparseEvery));
}

function existingCreatedAt(metaPath: string): number | null {
  if (!fs.existsSync(metaPath)) return null;
  try {
    const value = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    return Number.isFinite(value?.createdAt) && value.createdAt > 0
      ? Number(value.createdAt)
      : null;
  } catch (err) {
    recordSmallEmptyCatchVisibilityFailure_src_chain_auto_repair_ts("existing-meta-created-at", err);
    return null;
  }
}

function rebuildMeta(metaPath: string, base: number, scan: FrameScan): void {
  const now = Date.now();
  const meta: Meta = {
    from: base,
    to: scan.lastN,
    bytes: scan.completeBytes,
    createdAt: existingCreatedAt(metaPath) ?? now,
    updatedAt: now,
  };
  atomicWriteJson(metaPath, meta);
}

function rebuildHeads(root: string, headsPath: string, globalHead: number): void {
  let prior: any = {};
  if (fs.existsSync(headsPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(headsPath, "utf8"));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) prior = parsed;
    } catch (err) {
      recordSmallEmptyCatchVisibilityFailure_src_chain_auto_repair_ts("existing-heads-json", err);
    }
  }

  atomicWriteJson(headsPath, {
    ...prior,
    head: globalHead,
    number: globalHead,
    hash: typeof prior.hash === "string" ? prior.hash : "0x0",
  });
  atomicWriteText(path.join(root, "head.txt"), `${globalHead}\n`);
}

export async function autoRepairDataDir(
  root: string,
  opts: AutoRepairOptions = {},
) {
  const sparseEvery = Math.max(1, Number(opts.sparseEvery ?? 256));
  if (!Number.isSafeInteger(sparseEvery)) {
    throw new Error("autoRepairDataDir sparseEvery must be a positive safe integer");
  }
  const dryRun = opts.dryRun === true;

  const segRoot = path.join(root, "segments");
  const headsPath = path.join(root, "heads.json");
  const createDirectories: string[] = [];
  if (!fs.existsSync(root)) createDirectories.push(root);
  if (!fs.existsSync(segRoot)) createDirectories.push(segRoot);

  const segments = fs.existsSync(segRoot)
    ? fs
        .readdirSync(segRoot)
        .map((name) => ({ name, base: segmentBaseFromName(name) }))
        .filter((entry): entry is { name: string; base: number } => entry.base !== null)
        .sort((a, b) => a.base - b.base)
    : [];

  const prepared: PreparedSegment[] = [];
  let globalHead = -1;

  for (const { name: seg, base } of segments) {
    const { dir, bin, idx, meta } = segPaths(root, seg);
    if (!fs.statSync(dir).isDirectory()) {
      throw new Error(`canonical segment path is not a directory: ${dir}`);
    }

    const binMissing = !fs.existsSync(bin);
    const scan = readFrames(bin, seg);
    prepared.push({ name: seg, base, bin, idx, meta, binMissing, scan });
    if (scan.lastN > globalHead) globalHead = scan.lastN;
  }

  const plan: AutoRepairPlan = {
    createDirectories,
    createBlockFiles: prepared.filter((entry) => entry.binMissing).map((entry) => entry.bin),
    truncateTornTails: prepared
      .filter((entry) => entry.scan.tornTailBytes > 0)
      .map((entry) => ({
        segment: entry.name,
        path: entry.bin,
        fromBytes: entry.scan.fileBytes,
        toBytes: entry.scan.completeBytes,
        bytes: entry.scan.tornTailBytes,
      })),
    rebuildSparseIndexes: prepared.map((entry) => ({
      segment: entry.name,
      path: entry.idx,
      entries: entry.scan.frames.filter((frame) => frame.n % sparseEvery === 0).length,
    })),
    rebuildSegmentMeta: prepared.map((entry) => ({
      segment: entry.name,
      path: entry.meta,
      from: entry.base,
      to: entry.scan.lastN,
      bytes: entry.scan.completeBytes,
    })),
    reconcileHeads: {
      headsJson: headsPath,
      headTxt: path.join(root, "head.txt"),
      head: globalHead,
    },
  };

  const wouldRepairTornSegments = plan.truncateTornTails.length;
  const wouldTruncateTornTailBytes = plan.truncateTornTails.reduce(
    (total, entry) => total + entry.bytes,
    0,
  );

  if (!dryRun) {
    ensureDir(root);
    ensureDir(segRoot);

    for (const entry of prepared) {
      if (entry.binMissing) fs.writeFileSync(entry.bin, Buffer.alloc(0));
      if (entry.scan.tornTailBytes > 0) {
        truncateTornTail(entry.bin, entry.scan.completeBytes);
      }
      rebuildSparseIndex(entry.idx, entry.scan.frames, sparseEvery);
      rebuildMeta(entry.meta, entry.base, entry.scan);
    }

    rebuildHeads(root, headsPath, globalHead);
  }

  return {
    ok: true,
    root,
    sparseEvery,
    dryRun,
    mutationsApplied: !dryRun,
    segs: segments.length,
    head: globalHead,
    repairedTornSegments: dryRun ? 0 : wouldRepairTornSegments,
    tornTailBytesTruncated: dryRun ? 0 : wouldTruncateTornTailBytes,
    wouldRepairTornSegments,
    wouldTruncateTornTailBytes,
    plan,
  };
}

// Optional CLI usage: `tsx src/chain/auto_repair.ts <DATA_DIR>`
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = process.argv[2] || process.env.DATA_DIR || "data";
  autoRepairDataDir(dir)
    .then((r) => {
      console.log(JSON.stringify(r, null, 2));
    })
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    });
}
