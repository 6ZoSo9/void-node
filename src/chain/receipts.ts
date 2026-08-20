// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/chain/receipts.ts
import * as fs from "node:fs";
import * as path from "node:path";

function recordSmallEmptyCatchVisibilityFailure_src_chain_receipts_ts(scope: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_SMALL_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE", {
    file: "src/chain/receipts.ts",
    scope,
    message,
  });
}


type Receipt = { h: string; n: number; o: number; ts: number };
type ReceiptAppendFaultV1 =
  | "before_first_byte"
  | "after_strict_prefix"
  | "after_full_bytes"
  | "after_publish";

const MAX_RECEIPT_SHARD_BYTES_V1 = 16 * 1024 * 1024;

export class ReceiptsStore {
  private dir: string;
  private shardSpan: number;
  private mem = new Map<string, { n: number; o: number; ts: number; found: true }>();
  private appendTail: Promise<void> = Promise.resolve();
  private appendNonce = 0;

  constructor(dir: string, opts: { shardSpan?: number } = {}) {
    this.dir = dir;
    this.shardSpan = Math.max(10_000, Number(opts.shardSpan ?? 100_000));
    if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
  }

  private shardPathFromHead(): string {
    const base = Math.floor(this.mem.size / this.shardSpan) * this.shardSpan;
    return path.join(this.dir, `receipts-${String(base).padStart(8, "0")}.jsonl`);
  }

  async appendMany(
    arr: Receipt[],
    opts: { signal?: AbortSignal; faultAtV1?: ReceiptAppendFaultV1 } = {},
  ) {
    const operation = this.appendTail.then(() =>
      this.appendManyExclusive(arr, opts)
    );
    this.appendTail = operation.then(
      () => undefined,
      () => undefined,
    );
    return await operation;
  }

  private async appendManyExclusive(
    arr: Receipt[],
    opts: { signal?: AbortSignal; faultAtV1?: ReceiptAppendFaultV1 },
  ): Promise<void> {
    opts.signal?.throwIfAborted();
    if (!Array.isArray(arr) || arr.length === 0) return;
    await fs.promises.mkdir(this.dir, { recursive: true });
    opts.signal?.throwIfAborted();

    const durable = new Map<string, Receipt>();
    const shardContents = new Map<string, string>();
    const shardFiles = (await fs.promises.readdir(this.dir))
      .filter((file) => /^receipts-\d{8}\.jsonl$/.test(file))
      .sort();
    for (const file of shardFiles) {
      const shardPath = path.join(this.dir, file);
      const stat = await fs.promises.lstat(shardPath);
      if (!stat.isFile() || stat.size > MAX_RECEIPT_SHARD_BYTES_V1) {
        throw new Error(`receipt shard is not a bounded regular file: ${file}`);
      }
      const text = await fs.promises.readFile(shardPath, "utf8");
      if (text.length > 0 && !text.endsWith("\n")) {
        throw new Error(`receipt shard has a torn suffix: ${file}`);
      }
      shardContents.set(file, text);
      for (const line of text.split("\n")) {
        if (!line) continue;
        let parsed: unknown;
        try {
          parsed = JSON.parse(line);
        } catch {
          throw new Error(`receipt shard contains malformed JSONL: ${file}`);
        }
        if (
          !parsed ||
          typeof parsed !== "object" ||
          Array.isArray(parsed) ||
          !/^[0-9a-f]{64}$/.test(String((parsed as Receipt).h || "")) ||
          !Number.isSafeInteger((parsed as Receipt).n) ||
          (parsed as Receipt).n < 0 ||
          !Number.isSafeInteger((parsed as Receipt).o) ||
          (parsed as Receipt).o < 0 ||
          !Number.isSafeInteger((parsed as Receipt).ts) ||
          (parsed as Receipt).ts <= 0
        ) {
          throw new Error(`receipt shard contains an invalid receipt: ${file}`);
        }
        const receipt = parsed as Receipt;
        if (durable.has(receipt.h)) {
          throw new Error(`receipt shard contains a duplicate receipt: ${receipt.h}`);
        }
        durable.set(receipt.h, receipt);
      }
    }

    this.mem.clear();
    for (const receipt of durable.values()) {
      this.mem.set(receipt.h, {
        n: receipt.n,
        o: receipt.o,
        ts: receipt.ts,
        found: true,
      });
    }

    const normalizedByHash = new Map<string, Receipt>();
    for (const receipt of arr
      .map((r) => ({
        h: String(r.h || "").toLowerCase(),
        n: Number(r.n),
        o: Number(r.o),
        ts: Number(r.ts) || Date.now(),
      }))
      .filter((r) =>
        /^[0-9a-f]{64}$/.test(r.h) &&
        Number.isSafeInteger(r.n) && r.n >= 0 &&
        Number.isSafeInteger(r.o) && r.o >= 0 &&
        Number.isSafeInteger(r.ts) && r.ts > 0
      )) {
      const prior = normalizedByHash.get(receipt.h);
      if (prior && (prior.n !== receipt.n || prior.o !== receipt.o || prior.ts !== receipt.ts)) {
        throw new Error(`receipt batch contains conflicting duplicates: ${receipt.h}`);
      }
      normalizedByHash.set(receipt.h, receipt);
    }

    const pending: Receipt[] = [];
    for (const receipt of normalizedByHash.values()) {
      const prior = durable.get(receipt.h);
      if (prior) {
        if (prior.n !== receipt.n || prior.o !== receipt.o || prior.ts !== receipt.ts) {
          throw new Error(`durable receipt conflicts with retry: ${receipt.h}`);
        }
        continue;
      }
      pending.push(receipt);
    }
    if (pending.length === 0) return;

    const p = this.shardPathFromHead();
    const file = path.basename(p);
    const before = shardContents.get(file) ?? "";
    const suffix = `${pending.map((receipt) => JSON.stringify(receipt)).join("\n")}\n`;
    const payload = Buffer.from(before + suffix, "utf8");
    if (payload.byteLength > MAX_RECEIPT_SHARD_BYTES_V1) {
      throw new Error(`receipt shard publication exceeds ${MAX_RECEIPT_SHARD_BYTES_V1} bytes`);
    }

    const tempPath = path.join(
      this.dir,
      `.${file}.append-${process.pid}-${++this.appendNonce}.tmp`,
    );
    let handle: Awaited<ReturnType<typeof fs.promises.open>> | null = null;
    let published = false;
    try {
      opts.signal?.throwIfAborted();
      if (opts.faultAtV1 === "before_first_byte") {
        throw new Error("VOID_RECEIPT_APPEND_FAULT_BEFORE_FIRST_BYTE_V1");
      }
      handle = await fs.promises.open(tempPath, "wx", 0o600);
      let offset = 0;
      const strictPrefix = Math.max(1, Math.floor(payload.byteLength / 2));
      while (offset < payload.byteLength) {
        opts.signal?.throwIfAborted();
        const remaining = payload.byteLength - offset;
        const faultBound = opts.faultAtV1 === "after_strict_prefix"
          ? strictPrefix - offset
          : remaining;
        const length = Math.min(64 * 1024, remaining, Math.max(1, faultBound));
        const { bytesWritten } = await handle.write(payload, offset, length, null);
        if (bytesWritten <= 0) throw new Error("receipt append made no write progress");
        offset += bytesWritten;
        if (opts.faultAtV1 === "after_strict_prefix" && offset >= strictPrefix) {
          await handle.sync();
          throw new Error("VOID_RECEIPT_APPEND_FAULT_AFTER_STRICT_PREFIX_V1");
        }
      }
      await handle.sync();
      if (opts.faultAtV1 === "after_full_bytes") {
        throw new Error("VOID_RECEIPT_APPEND_FAULT_AFTER_FULL_BYTES_V1");
      }
      opts.signal?.throwIfAborted();
      await handle.close();
      handle = null;
      opts.signal?.throwIfAborted();
      // The authoritative shard is never append-mutated. An interrupted write
      // can therefore affect only this unpublished temporary generation; a
      // retry either sees the old shard or the complete replacement.
      fs.renameSync(tempPath, p);
      published = true;
      const dirFd = fs.openSync(this.dir, "r");
      try {
        fs.fsyncSync(dirFd);
      } finally {
        fs.closeSync(dirFd);
      }
      if (opts.faultAtV1 === "after_publish") {
        throw new Error("VOID_RECEIPT_APPEND_FAULT_AFTER_PUBLISH_V1");
      }
      for (const receipt of pending) {
        this.mem.set(receipt.h, {
          n: receipt.n,
          o: receipt.o,
          ts: receipt.ts,
          found: true,
        });
      }
    } finally {
      if (handle) await handle.close().catch(() => undefined);
      if (!published) await fs.promises.unlink(tempPath).catch(() => undefined);
    }
  }

  get(hashHex: string) {
    const h = String(hashHex || "").toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(h)) return { found: false };
    const val = this.mem.get(h);
    if (val) return val;

    try {
      const files = fs
        .readdirSync(this.dir)
        .filter((f) => /^receipts-\d{8}\.jsonl$/.test(f))
        .sort((a, b) => b.localeCompare(a));
      for (const f of files) {
        const p = path.join(this.dir, f);
        const data = fs.readFileSync(p, "utf8").split("\n");
        for (const line of data) {
          if (!line) continue;
          try {
            const r = JSON.parse(line) as Receipt;
            if (r.h === h) {
              const out = { n: r.n, o: r.o, ts: r.ts, found: true } as const;
              this.mem.set(h, out);
              return out;
            }
          } catch (err) { recordSmallEmptyCatchVisibilityFailure_src_chain_receipts_ts("empty-catch-1", err); }
        }
      }
    } catch (err) { recordSmallEmptyCatchVisibilityFailure_src_chain_receipts_ts("empty-catch-2", err); }
    return { found: false };
  }

  stats() {
    let totalBytes = 0;
    let totalLines = 0;
    const shards: { file: string; bytes: number; lines: number }[] = [];
    try {
      const files = fs
        .readdirSync(this.dir)
        .filter((f) => /^receipts-\d{8}\.jsonl$/.test(f))
        .sort();
      for (const f of files) {
        const p = path.join(this.dir, f);
        const st = fs.statSync(p);
        const lines = Math.max(0, fs.readFileSync(p, "utf8").split("\n").filter(Boolean).length);
        shards.push({ file: f, bytes: st.size, lines });
        totalBytes += st.size;
        totalLines += lines;
      }
    } catch (err) { recordSmallEmptyCatchVisibilityFailure_src_chain_receipts_ts("empty-catch-3", err); }
    return { shards, totalBytes, totalLines };
  }

  gc(keepLast = 1) {
    let removed = 0;
    let kept = 0;
    try {
      const files = fs
        .readdirSync(this.dir)
        .filter((f) => /^receipts-\d{8}\.jsonl$/.test(f))
        .sort((a, b) => b.localeCompare(a));
      const toDelete = files.slice(Math.max(1, Number(keepLast) || 1));
      for (const f of toDelete) {
        fs.rmSync(path.join(this.dir, f), { force: true });
        removed++;
      }
      kept = files.length - removed;
    } catch (err) { recordSmallEmptyCatchVisibilityFailure_src_chain_receipts_ts("empty-catch-4", err); }
    return { ok: true, keepLast: Math.max(1, Number(keepLast) || 1), removed, kept };
  }
}
