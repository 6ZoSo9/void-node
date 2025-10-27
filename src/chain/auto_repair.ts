// src/chain/auto_repair.ts
import * as fs from "node:fs";
import * as path from "node:path";

export type RepairOpts = {
  /** write a sparse index entry every Nth block (default 16) */
  sparseEvery?: number;
  /** custom segments dir (default "<dataDir>/segments") */
  segmentsDir?: string;
  /** if true (default), truncate a bad/corrupt tail in blocks.bin to last good entry */
  truncateBadTail?: boolean;
};

type Entry = { number: number; offset: number };

type ScanResult = {
  bytes: number;           // bytes up to the last good entry end (pos)
  fileBytes: number;       // physical file size
  entries: Entry[];
  min: number;
  max: number;
  count: number;
  truncatedTail: boolean;  // true if file had extra unreadable bytes after last good entry
};

/** Big-endian u64 writer used by index.sparse */
function writeU64BE(buf: Buffer, offset: number, value: number) {
  const hi = Math.floor(value / 0x100000000);
  const lo = value >>> 0;
  buf.writeUInt32BE(hi, offset);
  buf.writeUInt32BE(lo, offset + 4);
}

/** Scan one segment blocks.bin (len-prefixed) and return entries + min/max + bytes. */
function scanSegment(binPath: string): ScanResult {
  const fd = fs.openSync(binPath, "r");
  try {
    const stat = fs.fstatSync(fd);
    const lenBuf = Buffer.alloc(4);
    const entries: Entry[] = [];
    let pos = 0;
    let truncatedTail = false;

    while (pos + 4 <= stat.size) {
      // Read length prefix
      fs.readSync(fd, lenBuf, 0, 4, pos);
      const len = lenBuf.readUInt32BE(0);

      // Basic sanity on length
      if (len <= 0 || pos + 4 + len > stat.size) {
        truncatedTail = true;
        break;
      }

      // Read body and parse just enough to capture block.number
      let num = -1;
      try {
        const body = Buffer.alloc(len);
        fs.readSync(fd, body, 0, len, pos + 4);
        const j = JSON.parse(body.toString("utf8"));
        if (typeof j?.number === "number" && Number.isFinite(j.number) && j.number >= 0) {
          num = j.number;
        } else {
          // malformed object (no number) => stop at last good
          truncatedTail = true;
          break;
        }
      } catch {
        truncatedTail = true;
        break;
      }

      if (num >= 0) entries.push({ number: num, offset: pos });
      pos += 4 + len;
    }

    const bytes = pos;
    const count = entries.length;
    const min = count ? Math.min(...entries.map((e) => e.number)) : -1;
    const max = count ? Math.max(...entries.map((e) => e.number)) : -1;

    return { bytes, fileBytes: stat.size, entries, min, max, count, truncatedTail };
  } finally {
    fs.closeSync(fd);
  }
}

/** Rebuild index.sparse by writing {u32 number, u64 offset} every Nth block (+always last). */
function rebuildSparse(segDir: string, entries: Entry[], every: number) {
  const idxPath = path.join(segDir, "index.sparse");
  if (entries.length === 0) {
    fs.writeFileSync(idxPath, Buffer.alloc(0));
    return { written: 0 };
  }

  const picked: Entry[] = [];
  const step = Math.max(1, every);
  for (let i = 0; i < entries.length; i += step) picked.push(entries[i]);

  // Always include the last entry
  const last = entries[entries.length - 1];
  if (!picked.length || picked[picked.length - 1].number !== last.number) picked.push(last);

  const buf = Buffer.alloc(picked.length * 12);
  for (let i = 0; i < picked.length; i++) {
    const base = i * 12;
    buf.writeUInt32BE(picked[i].number, base);      // u32 number
    writeU64BE(buf, base + 4, picked[i].offset);    // u64 offset
  }
  fs.writeFileSync(idxPath, buf);
  return { written: picked.length };
}

/** If meta.json missing or wrong, rewrite it from a scan (preserve createdAt when possible). */
function repairMeta(segDir: string, bytes: number, min: number, max: number) {
  const metaPath = path.join(segDir, "meta.json");
  let createdAt = Date.now();

  try {
    const old = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    if (Number.isFinite(old?.createdAt)) createdAt = Number(old.createdAt);
  } catch {
    // no-op; we’ll set createdAt to now
  }

  const meta = { from: min, to: max, bytes, createdAt, updatedAt: Date.now() };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  return meta;
}

/** Determine if index.sparse needs a rebuild (exists, non-zero, multiple of 12 bytes). */
function sparseLooksBad(idxPath: string): boolean {
  try {
    const st = fs.statSync(idxPath);
    if (st.size === 0) return true;
    if (st.size % 12 !== 0) return true;
    return false;
  } catch {
    return true;
  }
}

/** Main entry: best-effort verification & repair for one data dir. */
export async function autoRepairDataDir(dataDir: string, opts: RepairOpts = {}) {
  const segmentsDir = opts.segmentsDir || path.join(dataDir, "segments");
  const every = Math.max(1, opts.sparseEvery ?? 16);
  const doTruncate = opts.truncateBadTail !== false;

  if (!fs.existsSync(segmentsDir)) return { ok: true, segments: 0, reports: [] as any[] };

  const segs = fs.readdirSync(segmentsDir).filter((d) => /^\d{8}$/.test(d)).sort();
  const reports: Array<{
    seg: string;
    count: number;
    bytes: number;
    fileBytes: number;
    min: number;
    max: number;
    truncatedTail: boolean;
    tailTruncatedBytes?: number;
    metaRepaired: boolean;
    sparseRebuilt: boolean;
  }> = [];

  for (const seg of segs) {
    const dir = path.join(segmentsDir, seg);
    const bin = path.join(dir, "blocks.bin");
    if (!fs.existsSync(bin)) continue;

    const scan = scanSegment(bin);
    let { bytes, fileBytes, entries, min, max, count, truncatedTail } = scan;

    let tailTruncatedBytes = 0;
    if (truncatedTail && doTruncate && bytes < fileBytes) {
      try {
        fs.truncateSync(bin, bytes); // drop corrupt tail
        tailTruncatedBytes = fileBytes - bytes;
        fileBytes = bytes;
        // After truncation, re-scan to refresh state
        const res = scanSegment(bin);
        bytes = res.bytes;
        fileBytes = res.fileBytes;
        entries = res.entries;
        min = res.min;
        max = res.max;
        count = res.count;
        truncatedTail = res.truncatedTail; // should now be false
      } catch {
        // If truncate fails, we’ll continue and still rebuild meta/sparse
      }
    }

    // meta.json sanity (preserve createdAt if present)
    const metaPath = path.join(dir, "meta.json");
    let metaRepaired = false;
    try {
      const m = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      const looksOff =
        !Number.isFinite(m?.bytes) ||
        m.bytes > bytes ||
        !Number.isFinite(m?.from) ||
        !Number.isFinite(m?.to) ||
        (count > 0 && (m.from > min || m.to < max));
      if (looksOff) {
        repairMeta(dir, bytes, min, max);
        metaRepaired = true;
      } else {
        // touch updatedAt for good measure, but only if something changed
        const patched = { ...m, updatedAt: Date.now() };
        fs.writeFileSync(metaPath, JSON.stringify(patched, null, 2));
      }
    } catch {
      repairMeta(dir, bytes, min, max);
      metaRepaired = true;
    }

    // index.sparse presence & shape
    const idxPath = path.join(dir, "index.sparse");
    let sparseRebuilt = false;
    if (sparseLooksBad(idxPath)) {
      rebuildSparse(dir, entries, every);
      sparseRebuilt = true;
    } else {
      // ensure last entry is reflected (e.g., if entries grew but index size is valid)
      try {
        const st = fs.statSync(idxPath);
        if (entries.length > 0 && st.size >= 12) {
          const buf = fs.readFileSync(idxPath);
          const lastNumInIndex = buf.readUInt32BE(buf.length - 12);
          const lastNum = entries[entries.length - 1].number;
          if (lastNumInIndex !== lastNum) {
            rebuildSparse(dir, entries, every);
            sparseRebuilt = true;
          }
        }
      } catch {
        rebuildSparse(dir, entries, every);
        sparseRebuilt = true;
      }
    }

    reports.push({
      seg,
      count,
      bytes,
      fileBytes,
      min,
      max,
      truncatedTail,
      tailTruncatedBytes: tailTruncatedBytes || undefined,
      metaRepaired,
      sparseRebuilt,
    });
  }

  return { ok: true, segments: reports.length, reports };
}

