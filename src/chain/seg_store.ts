// src/chain/seg_store.ts
/* Segmented block store with sparse indexing
 * Layout:
 *   data/
 *     heads.json               { head: number, currentSegment: string | null }
 *     segments/
 *       00000000/
 *         blocks.bin           [u32 len][json block]...
 *         index.sparse         repeated { u32 number, u64 offset }
 *         meta.json            { from:number, to:number, bytes:number, createdAt:number, updatedAt:number }
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { Block } from "./block.js";

type Heads = { head: number; currentSegment: string | null };

type Meta = {
  from: number;
  to: number;
  bytes: number;
  createdAt: number;
  updatedAt: number;
};

type SegOpts = {
  segmentMaxBytes: number;
  sparseEvery: number;
};

export class SegStore {
  private root: string;
  private segDir: string;
  private headsFile: string;
  private opts: SegOpts;

  private heads: Heads = { head: -1, currentSegment: null };
  private metaCache = new Map<string, Meta>();   // segment -> meta
  private sparseCache = new Map<string, Buffer>(); // segment -> sparse buf (cache last)

  constructor(rootDir: string, opts: SegOpts) {
    this.root = path.resolve(rootDir);
    this.segDir = path.join(this.root, "segments");
    this.headsFile = path.join(this.root, "heads.json");
    this.opts = opts;
    this.ensureDir(this.root);
    this.ensureDir(this.segDir);
    this.loadHeads();
  }

  /* ---------- public API ---------- */

  loadHeadNumber(): number {
    return Math.max(-1, this.heads.head);
  }

  hasBlock(n: number): boolean {
    return this.loadBlock(n) !== null;
  }

  loadBlock(n: number): Block | null {
    const seg = this.findSegmentForNumber(n);
    if (!seg) return null;

    const blocksFile = path.join(this.segDir, seg, "blocks.bin");
    if (!fs.existsSync(blocksFile)) return null;

    const fd = fs.openSync(blocksFile, "r");
    try {
      const offset = this.seekOffset(seg, n);
      const stat = fs.fstatSync(fd);
      let pos = offset;
      const lenBuf = Buffer.alloc(4);

      while (pos + 4 <= stat.size) {
        fs.readSync(fd, lenBuf, 0, 4, pos);
        const len = lenBuf.readUInt32BE(0);
        if (len <= 0 || pos + 4 + len > stat.size) break;

        const body = Buffer.alloc(len);
        fs.readSync(fd, body, 0, len, pos + 4);

        const b: Block = JSON.parse(body.toString("utf8"));
        if (b.number === n) return b;
        if (b.number > n) return null;
        pos += 4 + len;
      }
      return null;
    } finally {
      fs.closeSync(fd);
    }
  }

  /** Yield the last `count` blocks (newest first) */
  *loadTail(count: number): Generator<Block> {
    const head = this.loadHeadNumber();
    if (head < 0 || count <= 0) return;
    const from = Math.max(0, head - count + 1);
    for (const b of this.syncIter(from, head)) yield b;
  }

  /** Append one block, maintaining meta/sparse/heads, and rolling segments if needed. */
  saveBlock(b: Block): void {
    // choose a segment (create if needed)
    const seg = this.currentSegmentForAppend(b.number);
    const segPath = path.join(this.segDir, seg);
    const blocksFile = path.join(segPath, "blocks.bin");
    const metaFile = path.join(segPath, "meta.json");
    const sparseFile = path.join(segPath, "index.sparse");

    const json = Buffer.from(JSON.stringify(b));
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(json.length, 0);

    const fd = fs.openSync(blocksFile, "a");
    try {
      const before = fs.existsSync(blocksFile) ? fs.statSync(blocksFile).size : 0;

      // append record
      fs.writeSync(fd, lenBuf);
      fs.writeSync(fd, json);

      // flush durability
      if ((fs as any).fdatasyncSync) (fs as any).fdatasyncSync(fd);
      else fs.fsyncSync(fd);

      const after = before + 4 + json.length;

      // meta update
      const meta = this.loadOrInitMeta(seg, b.number);
      if (meta.from === -1) meta.from = b.number;
      meta.to = b.number;
      meta.bytes = after;
      meta.updatedAt = Date.now();
      fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));
      this.metaCache.set(seg, meta);

      // sparse index update (store offset where this record started)
      if (b.number % this.opts.sparseEvery === 0) {
        const rec = Buffer.alloc(12);
        rec.writeUInt32BE(b.number, 0);
        writeU64BE(rec, 4, before);
        fs.appendFileSync(sparseFile, rec);
        this.sparseCache.delete(seg); // invalidate cache
      }

      // heads update
      if (b.number > this.heads.head) {
        this.heads.head = b.number;
        this.saveHeads();
      }

      // segment roll if size exceeded
      if (after >= this.opts.segmentMaxBytes) {
        this.heads.currentSegment = null; // next append creates/uses next segment
        this.saveHeads();
      }
    } finally {
      fs.closeSync(fd);
    }
  }

  /**
   * Async generator: stream blocks [from..to] inclusive.
   * Uses random access under the hood and periodically yields to event loop.
   */
  async *findRange(from: number, to: number): AsyncGenerator<Block> {
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to < from) return;
    for (let n = from; n <= to; n++) {
      const b = this.loadBlock(n);
      if (b) yield b;
      if ((n & 0xff) === 0) await Promise.resolve();
    }
  }

  /* ---------- internals ---------- */

  private ensureDir(p: string) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  }

  private ensureSegmentFiles(seg: string) {
    const segPath = path.join(this.segDir, seg);
    this.ensureDir(segPath);

    const metaFile = path.join(segPath, "meta.json");
    const binFile = path.join(segPath, "blocks.bin");
    const sparseFile = path.join(segPath, "index.sparse");

    if (!fs.existsSync(metaFile)) {
      const meta: Meta = {
        from: -1,
        to: -1,
        bytes: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));
      this.metaCache.set(seg, meta);
    } else {
      try {
        const meta: Meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
        this.metaCache.set(seg, meta);
      } catch {
        const meta: Meta = { from: -1, to: -1, bytes: 0, createdAt: Date.now(), updatedAt: Date.now() };
        fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));
        this.metaCache.set(seg, meta);
      }
    }

    if (!fs.existsSync(binFile)) fs.writeFileSync(binFile, "");
    if (!fs.existsSync(sparseFile)) fs.writeFileSync(sparseFile, "");
  }

  private lastSegmentName(): string | null {
    const all = this.listSegmentsSorted();
    return all.length ? all[all.length - 1] : null;
  }

  private loadHeads() {
    if (fs.existsSync(this.headsFile)) {
      try {
        const h = JSON.parse(fs.readFileSync(this.headsFile, "utf8"));
        this.heads = {
          head: Number.isFinite(h?.head) ? Number(h.head) : -1,
          currentSegment: typeof h?.currentSegment === "string" && /^\d{8}$/.test(h.currentSegment)
            ? h.currentSegment
            : null,
        };
      } catch {
        this.heads = { head: -1, currentSegment: null };
      }
    } else {
      this.heads = { head: -1, currentSegment: null };
      this.saveHeads();
    }

    // Clean up bad pointer
    if (this.heads.currentSegment) {
      const p = path.join(this.segDir, this.heads.currentSegment);
      if (!fs.existsSync(p)) {
        this.heads.currentSegment = null;
        this.saveHeads();
      }
    }
  }

  private saveHeads() {
    this.ensureDir(this.root);
    const tmp = this.headsFile + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(this.heads, null, 2));
    fs.renameSync(tmp, this.headsFile);
  }

  private newSegmentName(): string {
    const all = this.listSegmentsSorted();
    if (all.length === 0) return "00000000";
    const last = all[all.length - 1];
    const n = Number(last);
    return pad8(n + 1);
  }

  private currentSegmentForAppend(_nextBlockNumber: number): string {
    let seg = this.heads.currentSegment;

    // A) Use current if it exists & has room
    if (seg && this.segmentHasRoom(seg)) {
      this.ensureSegmentFiles(seg);
      return seg;
    }

    // B) Otherwise, reuse last existing if it has room
    const last = this.lastSegmentName();
    if (!seg && last && this.segmentHasRoom(last)) {
      this.ensureSegmentFiles(last);
      this.heads.currentSegment = last;
      this.saveHeads();
      return last;
    }

    // C) Otherwise, create a new segment
    seg = this.newSegmentName();
    this.ensureSegmentFiles(seg);
    this.heads.currentSegment = seg;
    this.saveHeads();
    return seg;
  }

  private segmentHasRoom(seg: string): boolean {
    const blocksFile = path.join(this.segDir, seg, "blocks.bin");
    const size = fs.existsSync(blocksFile) ? fs.statSync(blocksFile).size : 0;
    return size < this.opts.segmentMaxBytes;
  }

  private loadOrInitMeta(seg: string, firstBlockNum: number): Meta {
    const p = path.join(this.segDir, seg, "meta.json");
    let m: Meta;
    if (this.metaCache.has(seg)) m = this.metaCache.get(seg)!;
    else if (fs.existsSync(p)) {
      try { m = JSON.parse(fs.readFileSync(p, "utf8")); }
      catch { m = { from: -1, to: -1, bytes: 0, createdAt: Date.now(), updatedAt: Date.now() }; }
    } else {
      m = { from: -1, to: -1, bytes: 0, createdAt: Date.now(), updatedAt: Date.now() };
    }

    if (m.from === -1) m.from = firstBlockNum;
    this.metaCache.set(seg, m);
    return m;
  }

  private loadMeta(seg: string): Meta | null {
    if (this.metaCache.has(seg)) return this.metaCache.get(seg)!;
    const p = path.join(this.segDir, seg, "meta.json");
    if (!fs.existsSync(p)) return null;
    try {
      const m: Meta = JSON.parse(fs.readFileSync(p, "utf8"));
      this.metaCache.set(seg, m);
      return m;
    } catch {
      return null;
    }
  }

  private findSegmentForNumber(n: number): string | null {
    const all = this.listSegmentsSorted();
    for (const seg of all) {
      const m = this.loadMeta(seg);
      if (!m) continue;
      if (m.from <= n && n <= m.to) return seg;
    }
    return null;
  }

  private listSegmentsSorted(): string[] {
    if (!fs.existsSync(this.segDir)) return [];
    return fs
      .readdirSync(this.segDir)
      .filter((d) => /^\d{8}$/.test(d))
      .sort((a, b) => Number(a) - Number(b));
  }

  private seekOffset(seg: string, n: number): number {
    const sparse = this.getSparseBuffer(seg); // multiples of 12 bytes
    let bestOffset = 0;
    for (let i = 0; i + 12 <= sparse.length; i += 12) {
      const num = sparse.readUInt32BE(i);
      const off = readU64BE(sparse, i + 4);
      if (num <= n) bestOffset = Number(off);
      else break;
    }
    return bestOffset;
  }

  private getSparseBuffer(seg: string): Buffer {
    if (this.sparseCache.has(seg)) return this.sparseCache.get(seg)!;
    const p = path.join(this.segDir, seg, "index.sparse");
    let buf = Buffer.alloc(0);
    try {
      if (fs.existsSync(p)) buf = fs.readFileSync(p);
    } catch { buf = Buffer.alloc(0); }
    // Only keep last used in memory
    this.sparseCache.clear();
    this.sparseCache.set(seg, buf);
    return buf;
  }

  // Synchronous iterator used by loadTail / fast scans
  private *syncIter(from: number, to: number): Generator<Block> {
    const all = this.listSegmentsSorted();
    for (const seg of all) {
      const meta = this.loadMeta(seg);
      if (!meta) continue;
      if (meta.to < from) continue;
      if (meta.from > to) break;

      const blocksFile = path.join(this.segDir, seg, "blocks.bin");
      if (!fs.existsSync(blocksFile)) continue;

      const fd = fs.openSync(blocksFile, "r");
      try {
        const start = Math.max(from, meta.from);
        const offset = this.seekOffset(seg, start);
        const stat = fs.fstatSync(fd);
        let pos = offset;
        const lenBuf = Buffer.alloc(4);

        while (pos + 4 <= stat.size) {
          fs.readSync(fd, lenBuf, 0, 4, pos);
          const len = lenBuf.readUInt32BE(0);
          if (len <= 0 || pos + 4 + len > stat.size) break;

          const body = Buffer.alloc(len);
          fs.readSync(fd, body, 0, len, pos + 4);

          const b: Block = JSON.parse(body.toString("utf8"));
          if (b.number > to) break;
          if (b.number >= from) yield b;
          pos += 4 + len;
        }
      } finally {
        fs.closeSync(fd);
      }
    }
  }
}

/* ---------- binary helpers ---------- */

function pad8(n: number): string {
  const s = String(n);
  return s.length >= 8 ? s : "0".repeat(8 - s.length) + s;
}

function writeU64BE(buf: Buffer, offset: number, value: number) {
  const hi = Math.floor(value / 0x100000000);
  const lo = value >>> 0;
  buf.writeUInt32BE(hi, offset);
  buf.writeUInt32BE(lo, offset + 4);
}

function readU64BE(buf: Buffer, offset: number): number {
  const hi = buf.readUInt32BE(offset);
  const lo = buf.readUInt32BE(offset + 4);
  return hi * 0x100000000 + lo;
}

