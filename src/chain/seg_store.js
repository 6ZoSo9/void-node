// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
// src/chain/seg_store.ts
import * as fs from "node:fs";
import * as path from "node:path";
function _walReplayMetricsInit() {
    return {
        replay_runs_total: 0,
        replay_entries_applied_total: 0,
        replay_ms_last: 0,
        replay_ms_max: 0,
        replay_last_ok: 1,
        replay_last_error: "",
    };
}
const SEG_SPAN = 10_000;
function mkdirp(p) {
    if (!fs.existsSync(p))
        fs.mkdirSync(p, { recursive: true });
}
function safeReadJson(p) {
    try {
        return JSON.parse(fs.readFileSync(p, "utf8"));
    }
    catch {
        return null;
    }
}
function atomicWriteJson(p, obj) {
    const dir = path.dirname(p);
    mkdirp(dir);
    const tmp = p + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
    // Best-effort durability: fsync(tmp) then rename
    try {
        const fd = fs.openSync(tmp, "r");
        try {
            fs.fsyncSync(fd);
        }
        finally {
            try {
                fs.closeSync(fd);
            }
            catch { }
        }
    }
    catch { }
    fs.renameSync(tmp, p);
    // Best-effort dir fsync so rename is durable
    try {
        const dfd = fs.openSync(dir, "r");
        try {
            fs.fsyncSync(dfd);
        }
        finally {
            try {
                fs.closeSync(dfd);
            }
            catch { }
        }
    }
    catch { }
}
export class SegStore {
    // --- WAL replay metrics (v1) ---
    _walReplayMetrics = _walReplayMetricsInit();
    getWalReplayMetrics() { return this._walReplayMetrics; }
    root;
    segDir;
    walDir;
    headsFile;
    sparseEvery;
    metaCache = new Map();
    constructor(root, opts = {}) {
        this.root = root;
        this.segDir = path.join(root, "segments");
        this.walDir = path.join(root, "wal");
        this.headsFile = path.join(root, "heads.json");
        this.sparseEvery = Math.max(1, Number(opts.sparseEvery ?? 256));
        mkdirp(this.segDir);
        mkdirp(this.walDir);
        if (!fs.existsSync(this.headsFile)) {
            atomicWriteJson(this.headsFile, { head: -1, hash: "0x0" });
        }
        // Replay WAL best-effort on boot (keeps prior behavior if WAL absent).
        try {
            this.replayWalAllBestEffort();
        }
        catch { }
    }
    loadHeadNumber() {
        const j = safeReadJson(this.headsFile);
        const n = Number(j?.head);
        return Number.isFinite(n) ? n : -1;
    }
    persistHeadAtomic(n) {
        const j = safeReadJson(this.headsFile) || { head: -1, hash: "0x0" };
        j.head = n;
        atomicWriteJson(this.headsFile, j);
    }
    segBase(n) { return Math.floor(n / SEG_SPAN) * SEG_SPAN; }
    segName(n) { return String(this.segBase(n)).padStart(8, "0"); }
    segPaths(seg) {
        const dir = path.join(this.segDir, seg);
        return {
            dir,
            bin: path.join(dir, "blocks.bin"),
            idx: path.join(dir, "index.sparse"),
            meta: path.join(dir, "meta.json"),
        };
    }
    walPath(seg) {
        return path.join(this.walDir, `${seg}.wal`);
    }
    ensureSeg(seg) {
        const { dir, bin, idx, meta } = this.segPaths(seg);
        mkdirp(dir);
        if (!fs.existsSync(bin))
            fs.writeFileSync(bin, Buffer.alloc(0));
        if (!fs.existsSync(idx))
            fs.writeFileSync(idx, "");
        if (!fs.existsSync(meta)) {
            const from = Number(seg);
            const m = { from, to: from - 1, bytes: 0, createdAt: Date.now(), updatedAt: Date.now() };
            fs.writeFileSync(meta, JSON.stringify(m, null, 2));
            this.metaCache.set(seg, m);
        }
    }
    meta(seg) {
        if (this.metaCache.has(seg))
            return this.metaCache.get(seg);
        const { meta } = this.segPaths(seg);
        try {
            const m = JSON.parse(fs.readFileSync(meta, "utf8"));
            this.metaCache.set(seg, m);
            return m;
        }
        catch {
            const from = Number(seg);
            const m = { from, to: from - 1, bytes: 0, createdAt: Date.now(), updatedAt: Date.now() };
            this.metaCache.set(seg, m);
            return m;
        }
    }
    putMeta(seg, m) {
        const { meta } = this.segPaths(seg);
        m.updatedAt = Date.now();
        fs.writeFileSync(meta, JSON.stringify(m, null, 2));
        this.metaCache.set(seg, m);
    }
    saveBlock(b) {
        // Idempotence guard: if we already have it, don't double-append.
        // (This keeps WAL replay safe if head.json lags behind blocks.bin.)
        const n = Number(b?.number);
        if (!Number.isFinite(n) || n < 0)
            throw new Error("SegStore.saveBlock: invalid block.number");
        const head = this.loadHeadNumber();
        if (head >= n) {
            const existing = this.loadBlock(n);
            if (existing)
                return; // already persisted
        }
        const seg = this.segName(n);
        this.ensureSeg(seg);
        // WAL intent (best-effort): append record BEFORE writing blocks.bin
        this.walAppendBestEffort(seg, b);
        // Commit to segment store
        this.saveBlockCommit(b);
        // Head bump (atomic rename)
        this.persistHeadAtomic(n);
    }
    walAppendBestEffort(seg, b) {
        try {
            const body = Buffer.from(JSON.stringify(b));
            const rec = { v: 1, n: Number(b.number), b64: body.toString("base64"), ts: Date.now() };
            fs.appendFileSync(this.walPath(seg), JSON.stringify(rec) + "\n");
            // Best-effort fsync for WAL (don’t die if it fails)
            try {
                const fd = fs.openSync(this.walPath(seg), "r");
                try {
                    fs.fsyncSync(fd);
                }
                finally {
                    try {
                        fs.closeSync(fd);
                    }
                    catch { }
                }
            }
            catch { }
        }
        catch { }
    }
    saveBlockCommit(b) {
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
        // Best-effort durability: fsync blocks.bin and index/meta
        try {
            const fd = fs.openSync(bin, "r");
            try {
                fs.fsyncSync(fd);
            }
            finally {
                try {
                    fs.closeSync(fd);
                }
                catch { }
            }
        }
        catch { }
    }
    loadBlock(n) {
        const seg = this.segName(n);
        const { bin, idx } = this.segPaths(seg);
        if (!fs.existsSync(bin))
            return null;
        // Find nearest index offset <= n
        let nearestOff = 0;
        try {
            const lines = fs.readFileSync(idx, "utf8").split("\n");
            for (const line of lines) {
                if (!line)
                    continue;
                const ent = JSON.parse(line);
                if (Number.isFinite(ent.n) && ent.n <= n && ent.off >= 0)
                    nearestOff = Math.max(nearestOff, ent.off);
            }
        }
        catch { }
        const fd = fs.openSync(bin, "r");
        try {
            const st = fs.fstatSync(fd);
            let off = nearestOff;
            const lenBuf = Buffer.alloc(4);
            while (off + 4 <= st.size) {
                fs.readSync(fd, lenBuf, 0, 4, off);
                const len = lenBuf.readUInt32BE(0);
                const start = off + 4;
                if (start + len > st.size)
                    break;
                const buf = Buffer.alloc(len);
                fs.readSync(fd, buf, 0, len, start);
                const blk = JSON.parse(buf.toString("utf8"));
                if (blk.number === n)
                    return blk;
                off = start + len;
            }
        }
        catch {
            /* ignore */
        }
        finally {
            try {
                fs.closeSync(fd);
            }
            catch { }
        }
        return null;
    }
    // ---- WAL replay ----
    replayWalAllBestEffort() {
        const __wal_t0 = Date.now();
        this._walReplayMetrics.replay_runs_total++;
        this._walReplayMetrics.replay_last_ok = 1;
        this._walReplayMetrics.replay_last_error = "";
        // Replay each existing wal/<seg>.wal
        if (!fs.existsSync(this.walDir))
            return;
        const files = fs.readdirSync(this.walDir).filter((f) => f.endsWith(".wal"));
        if (!files.length)
            return;
        for (const f of files) {
            const seg = f.replace(/\.wal$/, "");
            try {
                this.replayWalSegBestEffort(seg);
            }
            catch { }
        }
        this._walReplayMetrics.replay_ms_last = Math.max(0, Date.now() - __wal_t0);
        this._walReplayMetrics.replay_ms_max = Math.max(this._walReplayMetrics.replay_ms_max, this._walReplayMetrics.replay_ms_last);
    }
    replayWalSegBestEffort(seg) {
        let __wal_applied = 0;
        const wp = this.walPath(seg);
        if (!fs.existsSync(wp))
            return;
        const head0 = this.loadHeadNumber();
        const lines = fs.readFileSync(wp, "utf8").split("\n").filter(Boolean);
        let maxApplied = head0;
        const keep = [];
        for (const line of lines) {
            __wal_applied++;
            let rec = null;
            try {
                rec = JSON.parse(line);
            }
            catch {
                rec = null;
            }
            if (!rec || rec.v !== 1)
                continue;
            const n = Number(rec.n);
            if (!Number.isFinite(n))
                continue;
            // Keep anything > current head AFTER replay attempt (we’ll decide later)
            if (n <= this.loadHeadNumber())
                continue;
            // Decode block
            let blk = null;
            try {
                const buf = Buffer.from(String(rec.b64 || ""), "base64");
                blk = JSON.parse(buf.toString("utf8"));
            }
            catch {
                blk = null;
            }
            if (!blk || Number(blk.number) !== n) {
                // malformed; keep it so we don't accidentally destroy evidence
                keep.push(line);
                continue;
            }
            // If block already exists on disk, just bump head to n
            const existing = this.loadBlock(n);
            if (existing) {
                this.persistHeadAtomic(n);
                maxApplied = Math.max(maxApplied, n);
                continue;
            }
            // Commit missing block, bump head
            try {
                this.saveBlockCommit(blk);
                this.persistHeadAtomic(n);
                maxApplied = Math.max(maxApplied, n);
            }
            catch {
                // couldn't apply; keep for next boot
                keep.push(line);
            }
        }
        // Prune WAL best-effort:
        // - If everything <= head got applied, WAL can be deleted.
        // - Otherwise rewrite only the kept lines.
        try {
            if (keep.length === 0) {
                fs.unlinkSync(wp);
            }
            else {
                fs.writeFileSync(wp, keep.join("\n") + "\n");
                try {
                    const fd = fs.openSync(wp, "r");
                    try {
                        fs.fsyncSync(fd);
                    }
                    finally {
                        try {
                            fs.closeSync(fd);
                        }
                        catch { }
                    }
                }
                catch { }
            }
        }
        catch { }
        // Noisy logging avoided; callers can inspect head themselves.
        void maxApplied;
        if (__wal_applied > 0)
            this._walReplayMetrics.replay_entries_applied_total += __wal_applied;
    }
}
