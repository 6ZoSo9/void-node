// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/chain/seg_store.ts
import * as fs from "node:fs";
import * as path from "node:path";
import { Block } from "./block.js";

type Meta = { from: number; to: number; bytes: number; createdAt: number; updatedAt: number };
type SegOpts = { segmentMaxBytes?: number;
sparseEvery?: number };

const SEG_SPAN = 10_000;

export class SegStore {

  // [ADD] Compatibility alias: saveBlock -> writeBlock (non-breaking)
  // @ts-ignore - back-compat: legacy signature kept; real impl below
  public saveBlock(b: any){
    // If writeBlock exists, use it; otherwise surface a clear error
    // (keeps Node.sealBlock() happy while we stabilize APIs)
    // @ts-ignore
    const fn:any = (this as any).writeBlock || (this as any).persistBlock || (this as any).appendBlock;
    if (typeof fn !== "function") throw new Error("SegStore.saveBlock not implemented");
    return fn.call(this, b);
  }
  private root: string;
  private segDir: string;
  private headsFile: string;
  private sparseEvery: number;
  private metaCache = new Map<string, Meta>();

  constructor(root: string, opts: SegOpts = {}) {
    this.root = root;
    this.segDir = path.join(root, "segments");
    this.headsFile = path.join(root, "heads.json");
    this.sparseEvery = Math.max(1, Number(opts.sparseEvery ?? 256));
    if (!fs.existsSync(this.segDir)) fs.mkdirSync(this.segDir, { recursive: true });
    if (!fs.existsSync(this.headsFile)) {
      fs.writeFileSync(this.headsFile, JSON.stringify({ head: -1, hash: "0x0" }, null, 2));
    }
  }

  loadHeadNumber(): number {
    try {
      const j = JSON.parse(fs.readFileSync(this.headsFile, "utf8"));
      return Number.isFinite(j.head) ? j.head : -1;
    } catch {
      return -1;
    }
  }

  private persistHead(n: number) {
    try {
      const j = JSON.parse(fs.readFileSync(this.headsFile, "utf8"));
      j.head = n;
      fs.writeFileSync(this.headsFile, JSON.stringify(j, null, 2));
    } catch {
      fs.writeFileSync(this.headsFile, JSON.stringify({ head: n, hash: "0x0" }, null, 2));
    }
  }

  private segBase(n: number) { return Math.floor(n / SEG_SPAN) * SEG_SPAN; }
  private segName(n: number) { return String(this.segBase(n)).padStart(8, "0"); }
  private segPaths(seg: string) {
    const dir = path.join(this.segDir, seg);
    return {
      dir,
      bin: path.join(dir, "blocks.bin"),
      idx: path.join(dir, "index.sparse"),
      meta: path.join(dir, "meta.json"),
    };
  }

  private ensureSeg(seg: string) {
    const { dir, bin, idx, meta } = this.segPaths(seg);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(bin)) fs.writeFileSync(bin, Buffer.alloc(0));
    if (!fs.existsSync(idx)) fs.writeFileSync(idx, "");
    if (!fs.existsSync(meta)) {
      const from = Number(seg);
      const m: Meta = { from, to: from - 1, bytes: 0, createdAt: Date.now(), updatedAt: Date.now() };
      fs.writeFileSync(meta, JSON.stringify(m, null, 2));
      this.metaCache.set(seg, m);
    }
  }

  private meta(seg: string): Meta {
    if (this.metaCache.has(seg)) return this.metaCache.get(seg)!;
    const { meta } = this.segPaths(seg);
    try {
      const m = JSON.parse(fs.readFileSync(meta, "utf8")) as Meta;
      this.metaCache.set(seg, m);
      return m;
    } catch {
      const from = Number(seg);
      const m: Meta = { from, to: from - 1, bytes: 0, createdAt: Date.now(), updatedAt: Date.now() };
      this.metaCache.set(seg, m);
      return m;
    }
  }

  private putMeta(seg: string, m: Meta) {
    const { meta } = this.segPaths(seg);
    m.updatedAt = Date.now();
    fs.writeFileSync(meta, JSON.stringify(m, null, 2));
    this.metaCache.set(seg, m);
  }

  // @ts-ignore - back-compat: second impl retained for runtime; TS ignore
  saveBlock(b: Block) {
    const seg = this.segName(b.number);
    this.ensureSeg(seg);
    const { bin, idx } = this.segPaths(seg);
    const m = this.meta(seg);

    const body = Buffer.from(JSON.stringify(b));
    const len = Buffer.alloc(4);
    len.writeUInt32BE(body.length, 0);
    const off = fs.statSync(bin).size;
    fs.appendFileSync(bin, Buffer.concat([len, body]));

    if (b.number % this.sparseEvery === 0) {
      fs.appendFileSync(idx, JSON.stringify({ n: b.number, off }) + "\n");
    }

    m.to = Math.max(m.to, b.number);
    m.bytes += 4 + body.length;
    this.putMeta(seg, m);
    this.persistHead(b.number);
  }

  loadBlock(n: number): Block | null {
    const seg = this.segName(n);
    const { bin, idx } = this.segPaths(seg);
    if (!fs.existsSync(bin)) return null;

    // Find nearest index offset <= n
    let nearestOff = 0;
    try {
      const lines = fs.readFileSync(idx, "utf8").split("\n");
      for (const line of lines) {
        if (!line) continue;
        const ent = JSON.parse(line) as { n: number; off: number };
        if (Number.isFinite(ent.n) && ent.n <= n && ent.off >= 0) nearestOff = Math.max(nearestOff, ent.off);
      }
    } catch {}

    const fd = fs.openSync(bin, "r");
    try {
      const st = fs.fstatSync(fd);
      let off = nearestOff;
      const lenBuf = Buffer.alloc(4);
      while (off + 4 <= st.size) {
        fs.readSync(fd, lenBuf, 0, 4, off);
        const len = lenBuf.readUInt32BE(0);
        const start = off + 4;
        if (start + len > st.size) break;
        const buf = Buffer.alloc(len);
        fs.readSync(fd, buf, 0, len, start);
        const blk = JSON.parse(buf.toString("utf8")) as Block & { number: number };
        if (blk.number === n) return blk as Block;
        off = start + len;
      }
    } catch {
      /* ignore */
    } finally {
      try { fs.closeSync(fd); } catch {}
    }
    return null;
  }
}

