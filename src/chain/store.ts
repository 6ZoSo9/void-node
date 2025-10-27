// src/chain/store.ts
import * as fs from 'node:fs';
import * as path from 'node:path';
import { writeJSON, readJSON } from '../util/files.js';
import type { Block } from './block.js';

type HeadFile = { number: number };

export class ChainStore {
  constructor(private base = process.env.DATA_DIR || 'data') {}

  /* ---------- paths / fs ---------- */
  private blocksDir(): string { return path.join(this.base, 'blocks'); }
  private ensureBlocksDir(): string {
    const dir = this.blocksDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  private headPath(): string { return path.join(this.blocksDir(), 'HEAD.json'); }
  private blockPath(n: number): string { return path.join(this.blocksDir(), `${n}.json`); }

  /* ---------- write APIs ---------- */

  /**
   * Save a block and update HEAD if this block number is >= current head.
   * Uses best-effort atomic JSON writes (delegated to util/files writeJSON).
   */
  saveBlock(b: Block): void {
    this.ensureBlocksDir();

    // write block first
    writeJSON(this.blockPath(b.number), b);

    // cautious head update: only move forward
    const cur = this._readHead();
    if (b.number >= cur) {
      this._writeHead({ number: b.number });
    }
  }

  /**
   * Recompute HEAD by scanning existing block files.
   * Returns the discovered head number (or -1 if none).
   */
  rebuildHead(): number {
    this.ensureBlocksDir();
    const dir = this.blocksDir();
    let max = -1;
    for (const f of safeReaddir(dir)) {
      const m = /^(\d+)\.json$/.exec(f);
      if (!m) continue;
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > max) max = n;
    }
    this._writeHead({ number: max });
    return max;
  }

  /**
   * Delete older block files, keeping only the last `keepLast` blocks by number.
   * Head is recomputed afterwards.
   */
  gcKeepLast(keepLast: number): { ok: true; removed: number; kept: number } {
    const dir = this.blocksDir();
    const files = safeReaddir(dir)
      .map((f) => {
        const m = /^(\d+)\.json$/.exec(f);
        return m ? { n: Number(m[1]), f } : null;
      })
      .filter(Boolean) as { n: number; f: string }[];

    files.sort((a, b) => a.n - b.n); // oldest first
    const keep = Math.max(0, Math.floor(keepLast || 0));
    const toRemove = keep > 0 ? Math.max(0, files.length - keep) : files.length;

    let removed = 0;
    for (let i = 0; i < toRemove; i++) {
      try { fs.unlinkSync(path.join(dir, files[i]!.f)); removed++; } catch {}
    }
    this.rebuildHead();

    return { ok: true, removed, kept: files.length - removed };
  }

  /* ---------- read APIs ---------- */

  loadHeadNumber(): number {
    return this._readHead();
  }

  loadBlock(n: number): Block | null {
    return readJSON<Block>(this.blockPath(n)) ?? null;
  }

  hasBlock(n: number): boolean {
    try { return fs.existsSync(this.blockPath(n)); } catch { return false; }
  }

  /**
   * Stream blocks [from..to] inclusive. Skips missing files without throwing.
   */
  async *findRange(from: number, to: number): AsyncGenerator<Block> {
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to < from) return;
    for (let n = from; n <= to; n++) {
      const b = this.loadBlock(n);
      if (b) yield b;
      // micro-yield every ~256 items
      if ((n & 0xff) === 0) await Promise.resolve();
    }
  }

  /**
   * Yield the last `count` blocks, if present.
   */
  *loadTail(count: number): Generator<Block> {
    const head = this.loadHeadNumber();
    if (head < 0 || count <= 0) return;
    const from = Math.max(0, head - count + 1);
    for (let n = from; n <= head; n++) {
      const b = this.loadBlock(n);
      if (b) yield b;
    }
  }

  /**
   * Lightweight stats for UI/debug.
   */
  stats(): {
    ok: true;
    head: number;
    files: number;
    bytes: number;
    smallest?: number;
    largest?: number;
  } {
    const dir = this.blocksDir();
    const files = safeReaddir(dir).filter((f) => /^\d+\.json$/.test(f));
    let bytes = 0;
    let min: number | undefined;
    let max: number | undefined;

    for (const f of files) {
      const m = /^(\d+)\.json$/.exec(f);
      if (!m) continue;
      const n = Number(m[1]);
      const st = safeStat(path.join(dir, f));
      if (st) bytes += st.size;
      if (min === undefined || n < min) min = n;
      if (max === undefined || n > max) max = n;
    }

    return {
      ok: true,
      head: this.loadHeadNumber(),
      files: files.length,
      bytes,
      smallest: min,
      largest: max,
    };
  }

  /* ---------- internals ---------- */

  private _readHead(): number {
    const h = readJSON<HeadFile>(this.headPath());
    return h && Number.isFinite(h.number) ? h.number : -1;
    }

  private _writeHead(h: HeadFile): void {
    // tmp+rename done by writeJSON; keep HEAD moving only forward if possible
    const cur = this._readHead();
    if (Number.isFinite(cur) && cur > h.number) return;
    writeJSON(this.headPath(), h);
  }
}

/* ---------- small fs helpers (resilient) ---------- */

function safeReaddir(dir: string): string[] {
  try { return fs.existsSync(dir) ? fs.readdirSync(dir) : []; } catch { return []; }
}
function safeStat(p: string): fs.Stats | null {
  try { return fs.existsSync(p) ? fs.statSync(p) : null; } catch { return null; }
}

