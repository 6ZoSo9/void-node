// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/chain/seg_store.ts
import * as fs from "node:fs";
import * as path from "node:path";
import { blockHash, validateBlockForAppend } from "./block.js";
import type { Block } from "./block.js";
import { validateLegacyCommitDirectV2fsForAppendV1 } from "./legacy_commit_direct_v2fs_v1.js";
import {
  validateMainnet0GenesisMinimalForAppendV1,
  validateMainnet0HistoricalTransitionV1,
  type Mainnet0HistoricalAppendModeV1,
} from "./mainnet0_historical_compat_v1.js";
import {
  assertVoidSegStorePathConfinedV1,
  assertVoidSegStoreRegularFileV1,
  assertVoidSegStoreRootV1,
  ensureVoidSegStoreDirectoryV1,
} from "./segstore_path_confinement_v1.js";

function recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts(scope: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_SEGSTORE_DATANET_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE", {
    file: "src/chain/seg_store.ts",
    scope,
    message,
  });
}

// --- WAL replay metrics (v1) ---
export type WalReplayMetrics = {
  replay_runs_total: number;
  replay_entries_applied_total: number;
  replay_ms_last: number;
  replay_ms_max: number;
  replay_last_ok: 0 | 1;
  replay_last_error: string;
};

function _walReplayMetricsInit(): WalReplayMetrics {
  return {
    replay_runs_total: 0,
    replay_entries_applied_total: 0,
    replay_ms_last: 0,
    replay_ms_max: 0,
    replay_last_ok: 1,
    replay_last_error: "",
  };
}

type Meta = { from: number; to: number; bytes: number; createdAt: number; updatedAt: number };
type SegOpts = { segmentMaxBytes?: number; sparseEvery?: number };

const SEG_SPAN = 10_000;
const SEGSTORE_CANONICAL_READ_CORRUPTION_V1 = "VOID_SEGSTORE_CANONICAL_READ_CORRUPTION_V1";
const SEGSTORE_CANONICAL_COMMIT_DURABILITY_V1 = "VOID_SEGSTORE_CANONICAL_COMMIT_DURABILITY_V1";
export const VOID_AL_SEGSTORE_STARTUP_HEAD_RECONCILIATION_HOLD_V1 =
  "VOID_AL_SEGSTORE_STARTUP_HEAD_RECONCILIATION_HOLD_V1" as const;

function canonicalReadCorruptionV1(message: string): Error {
  return new Error(`${SEGSTORE_CANONICAL_READ_CORRUPTION_V1}: ${message}`);
}

function alBlockCommitRuntimeRequestedV1(): boolean {
  return String(process.env.VOID_AL_BLOCK_COMMIT_RUNTIME_V1 ?? "").trim() === "1";
}

function startupHeadReconciliationHoldV1(reason: string): Error {
  return new Error(`${VOID_AL_SEGSTORE_STARTUP_HEAD_RECONCILIATION_HOLD_V1}: ${reason}`);
}

// Simple, dependency-free WAL v1:
// - One WAL file per segment: <root>/wal/<seg>.wal (JSONL, base64 payloads)
// - On startup, replay WAL entries > current head, idempotently.
// - We do NOT try to guarantee perfect pruning; replay prunes best-effort.
type CanonicalAppendModeV1 = "modern" | Mainnet0HistoricalAppendModeV1;
type WalRecV1 = { v: 1; n: number; b64: string; ts: number };
type WalRecV2 = { v: 2; mode: "legacy-v2fs"; n: number; b64: string; ts: number };
type WalRecV3 = { v: 3; mode: "genesis-minimal-v1"; n: number; b64: string; ts: number };
type WalRecV4 = { v: 4; mode: "legacy-v2fs-historical-v1"; n: number; b64: string; ts: number };

function mkdirp(root: string, p: string) {
  ensureVoidSegStoreDirectoryV1(root, p);
}

function safeReadJson(root: string, p: string): any | null {
  assertVoidSegStoreRegularFileV1(root, p, true);
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

function atomicWriteJson(root: string, p: string, obj: any) {
  atomicWriteText(root, p, JSON.stringify(obj, null, 2));
}

function atomicWriteText(root: string, p: string, text: string) {
  const dir = path.dirname(p);
  mkdirp(root, dir);
  assertVoidSegStoreRegularFileV1(root, p, true);
  const tmp = `${p}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  assertVoidSegStoreRegularFileV1(root, tmp, true);
  try {
    fs.writeFileSync(tmp, text, { flag: "wx" });
    assertVoidSegStoreRegularFileV1(root, tmp, false);
    try {
      const fd = fs.openSync(tmp, "r");
      try { fs.fsyncSync(fd); } finally { try { fs.closeSync(fd); } catch (err) { recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts("empty-handler-1", err); } }
    } catch (err) { recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts("empty-handler-2", err); }
    assertVoidSegStoreRegularFileV1(root, p, true);
    fs.renameSync(tmp, p);
    assertVoidSegStoreRegularFileV1(root, p, false);
    try {
      assertVoidSegStorePathConfinedV1(root, dir, { kind: "directory", allowMissing: false });
      const dfd = fs.openSync(dir, "r");
      try { fs.fsyncSync(dfd); } finally { try { fs.closeSync(dfd); } catch (err) { recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts("empty-handler-3", err); } }
    } catch (err) { recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts("empty-handler-4", err); }
  } finally {
    if (fs.existsSync(tmp)) {
      try {
        assertVoidSegStoreRegularFileV1(root, tmp, false);
        fs.unlinkSync(tmp);
      } catch (err) {
        recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts("atomic-temp-cleanup", err);
      }
    }
  }
}

export class SegStore {
  private _walReplayMetrics: WalReplayMetrics = _walReplayMetricsInit();
  public getWalReplayMetrics(): WalReplayMetrics { return this._walReplayMetrics; }

  private root: string;
  private segDir: string;
  private walDir: string;
  private headsFile: string;
  private sparseEvery: number;
  private metaCache = new Map<string, Meta>();
  private canonicalCommitWriteHold: string | null = null;

  constructor(root: string, opts: SegOpts = {}) {
    this.root = root;
    this.segDir = path.join(root, "segments");
    this.walDir = path.join(root, "wal");
    this.headsFile = path.join(root, "heads.json");
    this.sparseEvery = Math.max(1, Number(opts.sparseEvery ?? 256));

    assertVoidSegStoreRootV1(this.root);
    mkdirp(this.root, this.root);
    mkdirp(this.root, this.segDir);
    mkdirp(this.root, this.walDir);
    assertVoidSegStoreRegularFileV1(this.root, this.headsFile, true);
    const headTxtPath = path.join(this.root, "head.txt");
    assertVoidSegStoreRegularFileV1(this.root, headTxtPath, true);
    const alRequested = alBlockCommitRuntimeRequestedV1();

    if (!fs.existsSync(this.headsFile)) {
      if (alRequested) {
        throw startupHeadReconciliationHoldV1("heads.json missing while AL runtime requested");
      }
      atomicWriteJson(this.root, this.headsFile, { head: -1, hash: "0x0" });
    }

    try {
      const j = safeReadJson(this.root, this.headsFile) || {};
      const jHead = Number(j?.head);
      const jNum = Number(j?.number);

      let txtHead = -1;
      try {
        const t = fs.readFileSync(headTxtPath, "utf8").trim();
        const n = Number(String(t).split(/\s+/)[0]);
        if (Number.isFinite(n)) txtHead = n;
      } catch (err) { recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts("empty-handler-5", err); }

      const cur = [jHead, jNum].filter((x) => Number.isFinite(x));
      const curHead = cur.length ? Math.max(...cur) : -1;

      if (Number.isFinite(txtHead) && txtHead >= 0 && txtHead != curHead) {
        if (alRequested) {
          throw startupHeadReconciliationHoldV1(
            `head.txt=${txtHead} disagrees with heads.json=${curHead}`,
          );
        }
        j.head = txtHead;
        j.number = txtHead;
        atomicWriteJson(this.root, this.headsFile, j);
      } else if (Number.isFinite(curHead) && curHead >= 0 && (!Number.isFinite(txtHead) || txtHead != curHead)) {
        if (alRequested) {
          throw startupHeadReconciliationHoldV1(
            `heads.json=${curHead} disagrees with head.txt=${txtHead}`,
          );
        }
        try { atomicWriteText(this.root, headTxtPath, String(curHead) + "\n"); } catch (err) { recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts("empty-handler-6", err); }
      }
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.startsWith(VOID_AL_SEGSTORE_STARTUP_HEAD_RECONCILIATION_HOLD_V1)
      ) {
        throw err;
      }
      recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts("empty-handler-7", err);
    }

    try { this.replayWalAllBestEffort(); } catch (err) { recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts("empty-handler-8", err); }
  }

  loadHeadNumber(): number {
    assertVoidSegStoreRegularFileV1(this.root, this.headsFile, true);
    const j = safeReadJson(this.root, this.headsFile) || {};
    const jHead = Number(j?.head);
    const jNum = Number(j?.number);

    const headTxtPath = path.join(this.root, "head.txt");
    assertVoidSegStoreRegularFileV1(this.root, headTxtPath, true);
    let txtHead = -1;
    try {
      const t = fs.readFileSync(headTxtPath, "utf8").trim();
      const n = Number(String(t).split(/\s+/)[0]);
      if (Number.isFinite(n)) txtHead = n;
    } catch (err) { recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts("empty-handler-9", err); }

    const cand = [jHead, jNum, txtHead].filter((x) => Number.isFinite(x));
    return cand.length ? Math.max(...cand) : -1;
  }

  private persistHeadAtomic(n: number) {
    assertVoidSegStoreRegularFileV1(this.root, this.headsFile, true);
    const j = safeReadJson(this.root, this.headsFile) || { head: -1, hash: "0x0" };
    j.head = n;
    j.number = n;
    atomicWriteJson(this.root, this.headsFile, j);
    atomicWriteText(this.root, path.join(this.root, "head.txt"), String(n) + "\n");
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

  private walPath(seg: string) {
    return path.join(this.walDir, `${seg}.wal`);
  }

  private ensureSeg(seg: string) {
    const { dir, bin, idx, meta } = this.segPaths(seg);
    assertVoidSegStorePathConfinedV1(this.root, dir, { kind: "directory", allowMissing: true });
    mkdirp(this.root, dir);
    assertVoidSegStoreRegularFileV1(this.root, bin, true);
    assertVoidSegStoreRegularFileV1(this.root, idx, true);
    assertVoidSegStoreRegularFileV1(this.root, meta, true);
    if (!fs.existsSync(bin)) fs.writeFileSync(bin, Buffer.alloc(0), { flag: "wx" });
    if (!fs.existsSync(idx)) fs.writeFileSync(idx, "", { flag: "wx" });
    assertVoidSegStoreRegularFileV1(this.root, bin, false);
    assertVoidSegStoreRegularFileV1(this.root, idx, false);
    if (!fs.existsSync(meta)) {
      const from = Number(seg);
      const m: Meta = { from, to: from - 1, bytes: 0, createdAt: Date.now(), updatedAt: Date.now() };
      atomicWriteJson(this.root, meta, m);
      this.metaCache.set(seg, m);
    }
    assertVoidSegStoreRegularFileV1(this.root, meta, false);
  }

  private meta(seg: string): Meta {
    if (this.metaCache.has(seg)) return this.metaCache.get(seg)!;
    const { meta } = this.segPaths(seg);
    assertVoidSegStoreRegularFileV1(this.root, meta, true);
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
    assertVoidSegStoreRegularFileV1(this.root, meta, true);
    m.updatedAt = Date.now();
    atomicWriteJson(this.root, meta, m);
    this.metaCache.set(seg, m);
  }

  private assertCanonicalCommitWritable(): void {
    if (!this.canonicalCommitWriteHold) return;
    throw new Error(
      `${SEGSTORE_CANONICAL_COMMIT_DURABILITY_V1}: write hold active; restart/recovery required after ${this.canonicalCommitWriteHold}`,
    );
  }

  private canonicalCommitDurabilityFailure(
    b: any,
    seg: string,
    phase: string,
    err: unknown,
  ): Error {
    const message = err instanceof Error ? err.message : String(err);
    this.canonicalCommitWriteHold = `block=${Number(b?.number)} segment=${seg} phase=${phase}: ${message}`;
    return new Error(
      `${SEGSTORE_CANONICAL_COMMIT_DURABILITY_V1}: failed to durably commit canonical block ${Number(b?.number)} in ${seg} during ${phase}: ${message}`,
    );
  }

  private reassertExistingCanonicalBlockDurabilityV1(b: any, seg: string): void {
    const { dir, bin } = this.segPaths(seg);
    assertVoidSegStoreRegularFileV1(this.root, bin, false);
    let phase = "existing_blocks_file_fsync";
    try {
      const fd = fs.openSync(bin, "r");
      try {
        fs.fsyncSync(fd);
      } finally {
        try { fs.closeSync(fd); } catch (err) { recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts("existing-canonical-file-close", err); }
      }

      phase = "existing_segment_directory_fsync";
      assertVoidSegStorePathConfinedV1(this.root, dir, { kind: "directory", allowMissing: false });
      const dfd = fs.openSync(dir, "r");
      try {
        fs.fsyncSync(dfd);
      } finally {
        try { fs.closeSync(dfd); } catch (err) { recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts("existing-canonical-directory-close", err); }
      }
    } catch (err) {
      throw this.canonicalCommitDurabilityFailure(b, seg, phase, err);
    }
  }

  public saveBlock(b: any): any;
  public saveBlock(b: Block): void;
  public saveBlock(b: any) {
    this.saveCanonicalBlockByModeV1(b, "modern");
  }

  /**
   * Canonical modern follower-import path.
   *
   * Deliberately separate from saveBlock(): legacy runtime sealing/metrics
   * wrappers attach to saveBlock and are allowed to shape locally produced
   * blocks. Imported blocks must instead reach the unchanged modern validator
   * and canonical persistence with their authoritative bytes untouched.
   */
  public saveFollowerImportedModernV1(b: any): void {
    this.saveCanonicalBlockByModeV1(b, "modern");
  }

  public saveAuthorizedLegacyCommitDirectV2fs(b: any): void {
    this.saveCanonicalBlockByModeV1(b, "legacy-v2fs");
  }

  public saveAuthorizedMainnet0GenesisMinimalV1(b: any): void {
    this.saveCanonicalBlockByModeV1(b, "genesis-minimal-v1", true);
  }

  public saveAuthorizedMainnet0HistoricalLegacyV2fs(b: any): void {
    this.saveCanonicalBlockByModeV1(b, "legacy-v2fs", true);
  }

  private validateCanonicalBlockByModeV1(
    b: any,
    parent: Block | null,
    mode: CanonicalAppendModeV1,
  ) {
    if (mode === "genesis-minimal-v1") {
      return validateMainnet0GenesisMinimalForAppendV1(b, parent as any);
    }
    return mode === "legacy-v2fs"
      ? validateLegacyCommitDirectV2fsForAppendV1(b, parent as any)
      : validateBlockForAppend(b, parent as any);
  }

  private canonicalBlockMatchesExistingV1(
    existing: any,
    candidate: any,
    mode: CanonicalAppendModeV1,
  ): boolean {
    try {
      if (mode !== "modern") {
        return JSON.stringify(existing) === JSON.stringify(candidate);
      }
      return blockHash(existing as any) === blockHash(candidate as any);
    } catch {
      return false;
    }
  }

  private replayBlockMatchesStoredBlock(
    existing: any,
    replayed: any,
    mode: CanonicalAppendModeV1,
  ): boolean {
    if (!this.canonicalBlockMatchesExistingV1(existing, replayed, mode)) {
      return false;
    }
    return JSON.stringify(existing) === JSON.stringify(replayed);
  }

  private saveCanonicalBlockByModeV1(
    b: any,
    mode: CanonicalAppendModeV1,
    mainnet0HistoricalRatchet = false,
  ): void {
    const n = Number(b?.number);
    if (!Number.isSafeInteger(n) || n < 0) {
      throw new Error("SegStore.saveBlock: invalid block.number");
    }

    this.assertCanonicalCommitWritable();

    const head = this.loadHeadNumber();
    const existing = this.loadBlock(n);
    if (head >= n) {
      if (existing) {
        if (this.replayBlockMatchesStoredBlock(existing, b, mode)) return;
        throw new Error("SegStore.saveBlock: conflicting existing block");
      }
    }

    const parent = n === 0 ? null : this.loadBlock(n - 1);
    const op =
      mode === "genesis-minimal-v1"
        ? "saveAuthorizedMainnet0GenesisMinimalV1"
        : mode === "legacy-v2fs" && mainnet0HistoricalRatchet
          ? "saveAuthorizedMainnet0HistoricalLegacyV2fs"
          : mode === "legacy-v2fs"
            ? "saveAuthorizedLegacyCommitDirectV2fs"
            : "saveBlock";

    if (mainnet0HistoricalRatchet) {
      if (mode === "modern") {
        throw new Error("SegStore.saveBlock: modern mode cannot request historical ratchet");
      }
      const transition = validateMainnet0HistoricalTransitionV1(parent, mode, b);
      if (!transition.ok) {
        throw new Error(
          `SegStore.${op}: invalid historical transition: ${(transition as any).reason || "unknown"}`,
        );
      }
    }

    const valid = this.validateCanonicalBlockByModeV1(b, parent as any, mode);
    if (!valid.ok) {
      throw new Error(
        `SegStore.${op}: invalid block: ${(valid as any).reason || "unknown"}`,
      );
    }

    if (n === head + 1 && existing) {
      if (!this.replayBlockMatchesStoredBlock(existing, b, mode)) {
        throw new Error("SegStore.saveBlock: conflicting durable block ahead of head");
      }
      const seg = this.segName(n);
      this.reassertExistingCanonicalBlockDurabilityV1(existing, seg);
      this.persistHeadAtomic(n);
      return;
    }

    if (n !== head + 1) {
      throw new Error(
        `SegStore.saveBlock: non-contiguous canonical append head=${head} block=${n}`,
      );
    }

    const seg = this.segName(n);
    this.ensureSeg(seg);
    this.walAppendDurable(seg, b, mode, mainnet0HistoricalRatchet);
    this.saveBlockCommit(b);
    this.persistHeadAtomic(n);
  }

  private walAppendDurable(
    seg: string,
    b: any,
    mode: CanonicalAppendModeV1,
    mainnet0HistoricalRatchet = false,
  ) {
    const walPath = this.walPath(seg);
    try {
      assertVoidSegStorePathConfinedV1(this.root, this.walDir, { kind: "directory", allowMissing: false });
      assertVoidSegStoreRegularFileV1(this.root, walPath, true);
      const existedBefore = fs.existsSync(walPath);
      const body = Buffer.from(JSON.stringify(b));
      const rec: WalRecV1 | WalRecV2 | WalRecV3 | WalRecV4 =
        mode === "genesis-minimal-v1"
          ? { v: 3, mode: "genesis-minimal-v1", n: Number(b.number), b64: body.toString("base64"), ts: Date.now() }
          : mode === "legacy-v2fs" && mainnet0HistoricalRatchet
            ? { v: 4, mode: "legacy-v2fs-historical-v1", n: Number(b.number), b64: body.toString("base64"), ts: Date.now() }
            : mode === "legacy-v2fs"
              ? { v: 2, mode: "legacy-v2fs", n: Number(b.number), b64: body.toString("base64"), ts: Date.now() }
              : { v: 1, n: Number(b.number), b64: body.toString("base64"), ts: Date.now() };

      fs.appendFileSync(walPath, JSON.stringify(rec) + "\n");
      assertVoidSegStoreRegularFileV1(this.root, walPath, false);

      const fd = fs.openSync(walPath, "r");
      try {
        fs.fsyncSync(fd);
      } finally {
        try { fs.closeSync(fd); } catch (err) { recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts("wal-intent-file-close", err); }
      }

      if (!existedBefore) {
        assertVoidSegStorePathConfinedV1(this.root, this.walDir, { kind: "directory", allowMissing: false });
        const dfd = fs.openSync(this.walDir, "r");
        try {
          fs.fsyncSync(dfd);
        } finally {
          try { fs.closeSync(dfd); } catch (err) { recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts("wal-intent-directory-close", err); }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `VOID_SEGSTORE_WAL_INTENT_DURABILITY_V1: failed to durably persist WAL intent for block ${Number(b?.number)} in ${seg}: ${message}`,
      );
    }
  }

  private saveBlockCommit(b: any) {
    const seg = this.segName(b.number);
    this.ensureSeg(seg);
    const { dir, bin, idx } = this.segPaths(seg);
    assertVoidSegStoreRegularFileV1(this.root, bin, false);
    assertVoidSegStoreRegularFileV1(this.root, idx, false);
    const m = this.meta(seg);

    const body = Buffer.from(JSON.stringify(b));
    const len = Buffer.alloc(4);
    len.writeUInt32BE(body.length, 0);
    const frame = Buffer.concat([len, body]);
    const off = fs.statSync(bin).size;

    let phase = "append";
    try {
      fs.appendFileSync(bin, frame);
      assertVoidSegStoreRegularFileV1(this.root, bin, false);

      phase = "blocks_file_fsync";
      const fd = fs.openSync(bin, "r");
      try {
        fs.fsyncSync(fd);
      } finally {
        try { fs.closeSync(fd); } catch (err) { recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts("canonical-commit-file-close", err); }
      }

      phase = "segment_directory_fsync";
      assertVoidSegStorePathConfinedV1(this.root, dir, { kind: "directory", allowMissing: false });
      const dfd = fs.openSync(dir, "r");
      try {
        fs.fsyncSync(dfd);
      } finally {
        try { fs.closeSync(dfd); } catch (err) { recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts("canonical-commit-directory-close", err); }
      }
    } catch (err) {
      throw this.canonicalCommitDurabilityFailure(b, seg, phase, err);
    }

    if (b.number % this.sparseEvery === 0) {
      try {
        fs.appendFileSync(idx, JSON.stringify({ n: b.number, off }) + "\n");
        assertVoidSegStoreRegularFileV1(this.root, idx, false);
      } catch (err) {
        recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts("canonical-commit-derived-index", err);
      }
    }

    const nextMeta: Meta = {
      ...m,
      to: Math.max(m.to, b.number),
      bytes: m.bytes + frame.length,
    };
    try {
      this.putMeta(seg, nextMeta);
    } catch (err) {
      recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts("canonical-commit-derived-meta", err);
    }
  }

  loadBlock(n: number): Block | null {
    if (!Number.isSafeInteger(n) || n < 0) {
      throw new Error("SegStore.loadBlock: invalid block number");
    }

    const seg = this.segName(n);
    const segmentBase = this.segBase(n);
    const { dir, bin, idx } = this.segPaths(seg);
    assertVoidSegStorePathConfinedV1(this.root, dir, { kind: "directory", allowMissing: true });
    assertVoidSegStoreRegularFileV1(this.root, bin, true);
    assertVoidSegStoreRegularFileV1(this.root, idx, true);
    if (!fs.existsSync(bin)) return null;
    assertVoidSegStoreRegularFileV1(this.root, bin, false);

    const fd = fs.openSync(bin, "r");
    try {
      const st = fs.fstatSync(fd);
      if (!st.isFile()) throw canonicalReadCorruptionV1(`non-regular block file: ${bin}`);
      if (st.size === 0) return null;

      let scanOff = 0;

      if (fs.existsSync(idx)) {
        try {
          assertVoidSegStoreRegularFileV1(this.root, idx, false);
          let best: { n: number; off: number } | null = null;
          for (const line of fs.readFileSync(idx, "utf8").split("\n")) {
            if (!line) continue;
            const ent = JSON.parse(line) as { n?: unknown; off?: unknown };
            if (
              !Number.isSafeInteger(ent?.n) ||
              !Number.isSafeInteger(ent?.off) ||
              Number(ent.n) < segmentBase ||
              Number(ent.off) < 0 ||
              Number(ent.off) + 4 > st.size ||
              this.segName(Number(ent.n)) !== seg
            ) {
              best = null;
              throw new Error("invalid sparse index entry");
            }
            if (Number(ent.n) <= n && (!best || Number(ent.n) > best.n)) {
              best = { n: Number(ent.n), off: Number(ent.off) };
            }
          }

          if (best) {
            const lenBuf = Buffer.alloc(4);
            const gotLength = fs.readSync(fd, lenBuf, 0, 4, best.off);
            if (gotLength !== 4) throw new Error("short sparse-anchor length read");
            const len = lenBuf.readUInt32BE(0);
            const start = best.off + 4;
            const end = start + len;
            if (end > st.size) throw new Error("sparse anchor points at torn frame");
            const body = Buffer.alloc(len);
            const gotBody = fs.readSync(fd, body, 0, len, start);
            if (gotBody !== len) throw new Error("short sparse-anchor body read");
            const parsed = JSON.parse(body.toString("utf8"));
            if (parsed?.number !== best.n) throw new Error("sparse anchor block mismatch");
            scanOff = best.off;
          }
        } catch (err) {
          recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts("canonical-read-sparse-index-fallback", err);
          scanOff = 0;
        }
      }

      const lenBuf = Buffer.alloc(4);
      let off = scanOff;
      let previousN: number | null = null;

      while (off < st.size) {
        if (st.size - off < 4) {
          throw canonicalReadCorruptionV1(`torn length prefix in ${seg} at offset ${off}`);
        }

        const gotLength = fs.readSync(fd, lenBuf, 0, 4, off);
        if (gotLength !== 4) {
          throw canonicalReadCorruptionV1(`short length-prefix read in ${seg} at offset ${off}: got ${gotLength}`);
        }

        const len = lenBuf.readUInt32BE(0);
        const start = off + 4;
        const end = start + len;
        if (end > st.size) {
          throw canonicalReadCorruptionV1(`torn frame in ${seg} at offset ${off}: end ${end}, file ${st.size}`);
        }

        const body = Buffer.alloc(len);
        const gotBody = fs.readSync(fd, body, 0, len, start);
        if (gotBody !== len) {
          throw canonicalReadCorruptionV1(`short complete-frame read in ${seg} at offset ${off}: expected ${len}, got ${gotBody}`);
        }

        let blk: Block & { number: number };
        try {
          blk = JSON.parse(body.toString("utf8")) as Block & { number: number };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          throw canonicalReadCorruptionV1(`complete frame JSON invalid in ${seg} at offset ${off}: ${message}`);
        }

        if (!Number.isSafeInteger(blk?.number) || blk.number < 0) {
          throw canonicalReadCorruptionV1(`complete frame block number invalid in ${seg} at offset ${off}`);
        }
        if (this.segName(blk.number) !== seg) {
          throw canonicalReadCorruptionV1(`complete frame segment mismatch in ${seg}: block ${blk.number}`);
        }
        if (previousN !== null && blk.number !== previousN + 1) {
          throw canonicalReadCorruptionV1(`complete frame order invalid in ${seg}: previous ${previousN}, block ${blk.number}`);
        }

        if (blk.number === n) return blk as Block;
        if (previousN === null && blk.number > n) return null;
        if (blk.number > n) {
          throw canonicalReadCorruptionV1(`canonical frame sequence skipped requested block ${n} in ${seg}`);
        }

        previousN = blk.number;
        off = end;
      }

      return null;
    } finally {
      try { fs.closeSync(fd); } catch (err) { recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts("empty-handler-18", err); }
    }
  }

  private recordWalReplayFailure(reason: string): void {
    const normalized = String(reason || "unknown")
      .replace(/\s+/g, " ")
      .slice(0, 256);
    this._walReplayMetrics.replay_last_ok = 0;
    const prior = this._walReplayMetrics.replay_last_error;
    if (!prior) {
      this._walReplayMetrics.replay_last_error = normalized;
      return;
    }
    if (prior.split(";").includes(normalized)) return;
    this._walReplayMetrics.replay_last_error = `${prior};${normalized}`.slice(0, 2048);
  }

  private replayWalAllBestEffort() {
    const __wal_t0 = Date.now();
    this._walReplayMetrics.replay_runs_total++;
    this._walReplayMetrics.replay_last_ok = 1;
    this._walReplayMetrics.replay_last_error = "";

    try {
      assertVoidSegStorePathConfinedV1(this.root, this.walDir, { kind: "directory", allowMissing: false });
      if (!fs.existsSync(this.walDir)) return;
      const files = fs.readdirSync(this.walDir).filter((f) => f.endsWith(".wal")).sort((a, b) => {
        const aSeg = Number(a.replace(/\.wal$/, ""));
        const bSeg = Number(b.replace(/\.wal$/, ""));
        const aValid = Number.isSafeInteger(aSeg) && aSeg >= 0;
        const bValid = Number.isSafeInteger(bSeg) && bSeg >= 0;
        if (aValid && bValid && aSeg !== bSeg) return aSeg - bSeg;
        if (aValid !== bValid) return aValid ? -1 : 1;
        return a.localeCompare(b);
      });
      if (!files.length) return;

      for (const f of files) {
        const seg = f.replace(/\.wal$/, "");
        try {
          this.replayWalSegBestEffort(seg);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.recordWalReplayFailure(`segment_replay_failed:${seg}:${message}`);
          recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts("empty-handler-19", err);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.recordWalReplayFailure(`wal_directory_replay_failed:${message}`);
      recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts("wal-replay-directory", err);
    } finally {
      this._walReplayMetrics.replay_ms_last = Math.max(0, Date.now() - __wal_t0);
      this._walReplayMetrics.replay_ms_max = Math.max(
        this._walReplayMetrics.replay_ms_max,
        this._walReplayMetrics.replay_ms_last,
      );
    }
  }

  private replayWalSegBestEffort(seg: string) {
    const wp = this.walPath(seg);
    assertVoidSegStoreRegularFileV1(this.root, wp, true);
    if (!fs.existsSync(wp)) return;
    assertVoidSegStoreRegularFileV1(this.root, wp, false);

    const lines = fs.readFileSync(wp, "utf8").split("\n").filter(Boolean);
    const candidates = lines.map((line, index) => {
      let rec: any = null;
      try {
        rec = JSON.parse(line);
      } catch {
        rec = null;
      }
      const n = rec && typeof rec === "object" ? Number(rec.n) : Number.NaN;
      return { line, index, rec, n };
    });

    const ordered = [...candidates].sort((a, b) => {
      const aValid = Number.isInteger(a.n) && a.n >= 0;
      const bValid = Number.isInteger(b.n) && b.n >= 0;
      if (aValid && bValid && a.n !== b.n) return a.n - b.n;
      if (aValid !== bValid) return aValid ? -1 : 1;
      return a.index - b.index;
    });

    const keepIndexes = new Set<number>();
    let applied = 0;

    const keep = (index: number, reason: string): void => {
      keepIndexes.add(index);
      this.recordWalReplayFailure(reason);
    };

    for (const candidate of ordered) {
      const { index, rec } = candidate;

      if (
        !rec ||
        typeof rec !== "object" ||
        (rec.v !== 1 && rec.v !== 2 && rec.v !== 3 && rec.v !== 4)
      ) {
        keep(index, `malformed_record:${seg}:${index}`);
        continue;
      }

      let replayMode: CanonicalAppendModeV1 = "modern";
      let replayHistoricalRatchet = false;
      if (rec.v === 2) {
        if (rec.mode !== "legacy-v2fs") {
          keep(index, `invalid_record_mode:${seg}:${index}`);
          continue;
        }
        replayMode = "legacy-v2fs";
      } else if (rec.v === 3) {
        if (rec.mode !== "genesis-minimal-v1") {
          keep(index, `invalid_record_mode:${seg}:${index}`);
          continue;
        }
        replayMode = "genesis-minimal-v1";
        replayHistoricalRatchet = true;
      } else if (rec.v === 4) {
        if (rec.mode !== "legacy-v2fs-historical-v1") {
          keep(index, `invalid_record_mode:${seg}:${index}`);
          continue;
        }
        replayMode = "legacy-v2fs";
        replayHistoricalRatchet = true;
      }

      if (typeof rec.n !== "number" || !Number.isInteger(rec.n) || rec.n < 0) {
        keep(index, `invalid_record_number:${seg}:${index}`);
        continue;
      }
      const n = rec.n;

      if (this.segName(n) !== seg) {
        keep(index, `segment_mismatch:${seg}:${n}`);
        continue;
      }

      if (typeof rec.b64 !== "string" || !rec.b64) {
        keep(index, `invalid_record_payload:${seg}:${n}`);
        continue;
      }

      let blk: any = null;
      try {
        const buf = Buffer.from(rec.b64, "base64");
        blk = JSON.parse(buf.toString("utf8"));
      } catch {
        blk = null;
      }

      if (!blk || Number(blk.number) !== n) {
        keep(index, `record_block_number_mismatch:${seg}:${n}`);
        continue;
      }

      const head = this.loadHeadNumber();
      if (n > head + 1) {
        keep(index, `canonical_gap:head=${head}:record=${n}`);
        continue;
      }

      const parent = n === 0 ? null : this.loadBlock(n - 1);
      if (replayHistoricalRatchet) {
        if (replayMode === "modern") {
          keep(index, `invalid_historical_replay_mode:${seg}:${index}`);
          continue;
        }
        const transition = validateMainnet0HistoricalTransitionV1(parent, replayMode);
        if (!transition.ok) {
          keep(
            index,
            `invalid_historical_transition:${n}:${(transition as any).reason || "unknown"}`,
          );
          continue;
        }
      }

      const valid = this.validateCanonicalBlockByModeV1(blk, parent as any, replayMode);
      if (!valid.ok) {
        keep(index, `invalid_block:${n}:${(valid as any).reason || "unknown"}`);
        continue;
      }

      const existing = this.loadBlock(n);

      if (n <= head) {
        if (!existing) {
          keep(index, `head_ahead_of_missing_block:head=${head}:record=${n}`);
          continue;
        }
        if (!this.replayBlockMatchesStoredBlock(existing, blk as Block, replayMode)) {
          keep(index, `existing_block_conflict:${n}`);
          continue;
        }
        continue;
      }

      if (existing) {
        if (!this.replayBlockMatchesStoredBlock(existing, blk as Block, replayMode)) {
          keep(index, `existing_block_conflict:${n}`);
          continue;
        }

        try {
          this.reassertExistingCanonicalBlockDurabilityV1(existing, seg);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          keep(index, `head_heal_durability_failed:${n}:${message}`);
          continue;
        }

        try {
          this.persistHeadAtomic(n);
          applied++;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          keep(index, `head_heal_failed:${n}:${message}`);
        }
        continue;
      }

      try {
        this.saveBlockCommit(blk as Block);
        this.persistHeadAtomic(n);
        applied++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        keep(index, `commit_failed:${n}:${message}`);
      }
    }

    if (applied > 0) {
      this._walReplayMetrics.replay_entries_applied_total += applied;
    }

    const keptLines = lines.filter((_line, index) => keepIndexes.has(index));

    try {
      if (keptLines.length === 0) {
        assertVoidSegStoreRegularFileV1(this.root, wp, false);
        fs.unlinkSync(wp);
      } else {
        atomicWriteText(this.root, wp, keptLines.join("\n") + "\n");
        try {
          assertVoidSegStoreRegularFileV1(this.root, wp, false);
          const fd = fs.openSync(wp, "r");
          try { fs.fsyncSync(fd); } finally { try { fs.closeSync(fd); } catch (err) { recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts("empty-handler-20", err); } }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.recordWalReplayFailure(`wal_fsync_failed:${seg}:${message}`);
          recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts("empty-handler-21", err);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.recordWalReplayFailure(`wal_prune_failed:${seg}:${message}`);
      recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts("empty-handler-22", err);
    }
  }
}
