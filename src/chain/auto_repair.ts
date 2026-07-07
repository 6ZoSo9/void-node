// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/chain/auto_repair.ts
/**
 * Best-effort store repair for SegStore layout.
 * - Verifies/creates segment dirs, meta.json, index.sparse
 * - Rebuilds sparse index by scanning blocks.bin length-prefixed frames
 * - Fixes heads.json "head" to highest discovered block
 *
 * Idempotent and safe to run at startup.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

function recordSmallEmptyCatchVisibilityFailure_src_chain_auto_repair_ts(scope: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_SMALL_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE", {
    file: "src/chain/auto_repair.ts",
    scope,
    message,
  });
}


type Meta = { from: number; to: number; bytes: number; createdAt: number; updatedAt: number };

const SEG_SPAN = 10_000;

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function segNameFor(n: number) {
  return String(Math.floor(n / SEG_SPAN) * SEG_SPAN).padStart(8, "0");
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

function readFrames(binPath: string): { offs: number[]; lastOff: number; totalBytes: number; lastN: number } {
  const offs: number[] = [];
  let lastOff = 0;
  let totalBytes = 0;
  let lastN = -1;

  if (!fs.existsSync(binPath)) return { offs, lastOff, totalBytes, lastN };
  const fd = fs.openSync(binPath, "r");
  try {
    const st = fs.fstatSync(fd);
    const lenBuf = Buffer.alloc(4);
    let off = 0;
    while (off + 4 <= st.size) {
      fs.readSync(fd, lenBuf, 0, 4, off);
      const len = lenBuf.readUInt32BE(0);
      const start = off + 4;
      if (start + len > st.size) break;
      offs.push(off);
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, start);
      let n = -1;
      try {
        const j = JSON.parse(buf.toString("utf8"));
        if (Number.isFinite(j?.number)) n = Number(j.number);
      } catch (err) { recordSmallEmptyCatchVisibilityFailure_src_chain_auto_repair_ts("empty-catch-1", err); }
      if (n > lastN) lastN = n;
      off = start + len;
      totalBytes = off;
      lastOff = off;
    }
  } finally {
    try { fs.closeSync(fd); } catch (err) { recordSmallEmptyCatchVisibilityFailure_src_chain_auto_repair_ts("empty-catch-2", err); }
  }
  return { offs, lastOff, totalBytes, lastN };
}

function writeMeta(metaPath: string, m: Meta) {
  m.updatedAt = Date.now();
  fs.writeFileSync(metaPath, JSON.stringify(m, null, 2));
}

export async function autoRepairDataDir(root: string, opts: { sparseEvery?: number } = {}) {
  const sparseEvery = Math.max(1, Number(opts.sparseEvery ?? 256));
  ensureDir(root);
  const segRoot = path.join(root, "segments");
  ensureDir(segRoot);

  const headsPath = path.join(root, "heads.json");
  if (!fs.existsSync(headsPath)) {
    fs.writeFileSync(headsPath, JSON.stringify({ head: -1, hash: "0x0" }, null, 2));
  }

  // Discover existing segments or infer from directory names
  let segs = fs
    .readdirSync(segRoot)
    .filter((d) => /^\d{8}$/.test(d))
    .sort((a, b) => Number(a) - Number(b));

  // If none exist but there are stray files, just continue (no-op)
  let globalHead = -1;

  for (const seg of segs) {
    const { dir, bin, idx, meta } = segPaths(root, seg);
    ensureDir(dir);
    if (!fs.existsSync(bin)) fs.writeFileSync(bin, Buffer.alloc(0));
    if (!fs.existsSync(idx)) fs.writeFileSync(idx, "");

    // Read frames and rebuild sparse index + meta
    const scan = readFrames(bin);
    const base = Number(seg);
    const m: Meta = fs.existsSync(meta)
      ? (JSON.parse(fs.readFileSync(meta, "utf8")) as Meta)
      : { from: base, to: base - 1, bytes: 0, createdAt: Date.now(), updatedAt: Date.now() };

    // Rebuild index.sparse if missing/empty
    const needRebuildIdx = !fs.existsSync(idx) || fs.statSync(idx).size === 0;
    if (needRebuildIdx && scan.offs.length) {
      const lines: string[] = [];
      const st = fs.statSync(bin);
      for (const off of scan.offs) {
        // Peek block number for that frame
        const lenBuf = Buffer.alloc(4);
        const fd = fs.openSync(bin, "r");
        try {
          fs.readSync(fd, lenBuf, 0, 4, off);
          const len = lenBuf.readUInt32BE(0);
          const start = off + 4;
          if (start + len > st.size) break;
          const buf = Buffer.alloc(len);
          fs.readSync(fd, buf, 0, len, start);
          const j = JSON.parse(buf.toString("utf8"));
          const n = Number(j?.number);
          if (Number.isFinite(n) && n % sparseEvery === 0) {
            lines.push(JSON.stringify({ n, off }));
          }
        } catch {
          /* ignore */
        } finally {
          try { fs.closeSync(fd); } catch (err) { recordSmallEmptyCatchVisibilityFailure_src_chain_auto_repair_ts("empty-catch-3", err); }
        }
      }
      if (lines.length) fs.writeFileSync(idx, lines.join("\n") + "\n");
    }

    // Update meta
    m.to = Math.max(m.to, scan.lastN);
    m.bytes = Math.max(m.bytes, scan.totalBytes);
    writeMeta(meta, m);

    if (scan.lastN > globalHead) globalHead = scan.lastN;
  }

  // Fix heads.json
  try {
    const j = JSON.parse(fs.readFileSync(headsPath, "utf8"));
    if (!Number.isFinite(j.head) || j.head < globalHead) {
      j.head = globalHead;
      fs.writeFileSync(headsPath, JSON.stringify(j, null, 2));
    }
  } catch {
    fs.writeFileSync(headsPath, JSON.stringify({ head: globalHead, hash: "0x0" }, null, 2));
  }

  return {
    ok: true,
    root,
    sparseEvery,
    segs: segs.length,
    head: globalHead,
  };
}

// Optional CLI usage: `tsx src/chain/auto_repair.ts <DATA_DIR>`
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = process.argv[2] || process.env.DATA_DIR || "data";
  autoRepairDataDir(dir).then((r) => {
    console.log(JSON.stringify(r, null, 2));
  });
}

