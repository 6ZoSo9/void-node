// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/chain/receipts.ts
import * as fs from "node:fs";
import * as crypto from "node:crypto";
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
  | "before_directory_sync"
  | "after_publish";

type ReceiptAppendTestHooksV1 = {
  afterSnapshot?: () => void | Promise<void>;
  afterLockClaimPublished?: () => void | Promise<void>;
  beforeLockClaimCleanup?: () => void | Promise<void>;
  beforeObservedLockCleanup?: (path: string) => void | Promise<void>;
};

const MAX_RECEIPT_SHARD_BYTES_V1 = 16 * 1024 * 1024;
const MAX_RECEIPT_HISTORY_SCAN_BYTES_V1 = 128 * 1024 * 1024;
const MAX_RECEIPT_SHARD_FILES_V1 = 4_096;
const MAX_RECEIPT_DIRECTORY_ENTRIES_V1 = 8_192;
const RECEIPT_READ_CHUNK_BYTES_V1 = 64 * 1024;
const RECEIPT_APPEND_LOCK_WAIT_MS_V1 = 10;
const RECEIPT_APPEND_LOCK_MAX_WAIT_MS_V1 = 30_000;
const RECEIPT_APPEND_LOCK_CLAIM_MAX_BYTES_V1 = 16 * 1024;
const RECEIPT_APPEND_LOCK_CLAIM_V1 = "VOID_RECEIPT_APPEND_LOCK_CLAIM_V1";
const RECEIPT_APPEND_LOCK_RELEASE_V1 = "VOID_RECEIPT_APPEND_LOCK_RELEASE_V1";
const RECEIPT_APPEND_LOCK_TOKEN_V1 = /^[0-9a-f]{32}$/;

type ReceiptHit =
  | { n: number; o: number; ts: number; found: true }
  | { found: false };

type ReceiptDirectoryAuthorityV1 = {
  handle: Awaited<ReturnType<typeof fs.promises.open>>;
  stablePath: string;
  dev: bigint;
  ino: bigint;
};

type ReceiptFileStampV1 = {
  dev: string;
  ino: string;
  size: number;
  mtimeNs: string;
  ctimeNs: string;
};

type ReceiptAppendLockClaimV1 = {
  marker: typeof RECEIPT_APPEND_LOCK_CLAIM_V1;
  version: 1;
  pid: number;
  process_instance: string;
  token: string;
  directory_dev: string;
  directory_ino: string;
  path: string;
  stamp: ReceiptFileStampV1;
};

type ReceiptAppendLockReleaseV1 = {
  marker: typeof RECEIPT_APPEND_LOCK_RELEASE_V1;
  version: 1;
  pid: number;
  process_instance: string;
  token: string;
  claim_stamp: ReceiptFileStampV1;
  path: string;
  stamp: ReceiptFileStampV1;
};

let receiptProcessInstanceCacheV1 = "";

function receiptExactKeysV1(value: unknown, expected: string[]): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function receiptFileStampV1(stat: fs.BigIntStats): ReceiptFileStampV1 {
  return {
    dev: String(stat.dev),
    ino: String(stat.ino),
    size: Number(stat.size),
    mtimeNs: String(stat.mtimeNs),
    ctimeNs: String(stat.ctimeNs),
  };
}

function receiptSameStampV1(a: ReceiptFileStampV1, b: ReceiptFileStampV1): boolean {
  return a.dev === b.dev && a.ino === b.ino && a.size === b.size &&
    a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs;
}

function receiptValidStampV1(value: unknown): value is ReceiptFileStampV1 {
  return receiptExactKeysV1(value, ["dev", "ino", "size", "mtimeNs", "ctimeNs"]) &&
    typeof value.dev === "string" && /^\d+$/.test(value.dev) &&
    typeof value.ino === "string" && /^\d+$/.test(value.ino) &&
    Number.isSafeInteger(value.size) && Number(value.size) >= 0 &&
    typeof value.mtimeNs === "string" && /^\d+$/.test(value.mtimeNs) &&
    typeof value.ctimeNs === "string" && /^\d+$/.test(value.ctimeNs);
}

function receiptLinuxProcessInstanceV1(pid: number): string | null {
  if (process.platform !== "linux" || !Number.isSafeInteger(pid) || pid <= 0) return null;
  try {
    const boot = fs.readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim();
    const raw = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    const end = raw.lastIndexOf(")");
    if (!/^[0-9a-f-]{36}$/.test(boot) || end < 0) return null;
    const fields = raw.slice(end + 1).trim().split(/\s+/);
    const startTicks = String(fields[19] || "");
    if (!/^\d+$/.test(startTicks)) return null;
    return `linux:${boot}:${startTicks}`;
  } catch (_error) {
    return null;
  }
}

function receiptCurrentProcessInstanceV1(): string {
  if (receiptProcessInstanceCacheV1) return receiptProcessInstanceCacheV1;
  receiptProcessInstanceCacheV1 = receiptLinuxProcessInstanceV1(process.pid) ||
    `opaque:${process.pid}:${crypto.randomBytes(16).toString("hex")}`;
  return receiptProcessInstanceCacheV1;
}

function receiptPidAliveV1(pid: number): boolean {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error: any) {
    if (error?.code === "ESRCH") return false;
    if (error?.code === "EPERM") return true;
    throw error;
  }
}

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

  private appendLockClaimNameV1(token: string): string {
    return `.receipts-append-claim-${token}.json`;
  }

  private appendLockReleaseNameV1(token: string): string {
    return `.receipts-append-release-${token}.json`;
  }

  private async readAppendLockJsonV1(
    authority: ReceiptDirectoryAuthorityV1,
    name: string,
  ): Promise<{ value: unknown; stamp: ReceiptFileStampV1 }> {
    const stablePath = path.join(authority.stablePath, name);
    const listed = await fs.promises.lstat(stablePath, { bigint: true });
    if (!listed.isFile() || listed.isSymbolicLink()) {
      throw new Error("VOID_RECEIPT_APPEND_LOCK_NON_REGULAR_V1");
    }
    const size = Number(listed.size);
    if (!Number.isSafeInteger(size) || size <= 0 || size > RECEIPT_APPEND_LOCK_CLAIM_MAX_BYTES_V1) {
      throw new Error("VOID_RECEIPT_APPEND_LOCK_RECORD_SIZE_V1");
    }
    const handle = await fs.promises.open(
      stablePath,
      fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW,
    );
    try {
      const opened = await handle.stat({ bigint: true });
      const listedStamp = receiptFileStampV1(listed);
      const openedStamp = receiptFileStampV1(opened);
      if (!receiptSameStampV1(listedStamp, openedStamp)) {
        throw new Error("VOID_RECEIPT_APPEND_LOCK_RECORD_UNSTABLE_V1");
      }
      const bytes = Buffer.alloc(size);
      let offset = 0;
      while (offset < bytes.length) {
        const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset);
        if (bytesRead <= 0) break;
        offset += bytesRead;
      }
      if (offset !== bytes.length) {
        throw new Error("VOID_RECEIPT_APPEND_LOCK_RECORD_SHORT_READ_V1");
      }
      const after = receiptFileStampV1(await handle.stat({ bigint: true }));
      const visible = receiptFileStampV1(await fs.promises.lstat(stablePath, { bigint: true }));
      if (!receiptSameStampV1(openedStamp, after) || !receiptSameStampV1(after, visible)) {
        throw new Error("VOID_RECEIPT_APPEND_LOCK_RECORD_CHANGED_V1");
      }
      return { value: JSON.parse(bytes.toString("utf8")), stamp: openedStamp };
    } finally {
      await handle.close();
    }
  }

  private async readAppendLockClaimV1(
    authority: ReceiptDirectoryAuthorityV1,
    name: string,
  ): Promise<ReceiptAppendLockClaimV1> {
    const { value, stamp } = await this.readAppendLockJsonV1(authority, name);
    if (!receiptExactKeysV1(value, [
      "marker",
      "version",
      "pid",
      "process_instance",
      "token",
      "directory_dev",
      "directory_ino",
    ])) {
      throw new Error("VOID_RECEIPT_APPEND_LOCK_CLAIM_SHAPE_V1");
    }
    const token = String(value.token || "");
    if (
      value.marker !== RECEIPT_APPEND_LOCK_CLAIM_V1 ||
      value.version !== 1 ||
      !Number.isSafeInteger(value.pid) || Number(value.pid) <= 0 ||
      typeof value.process_instance !== "string" || !value.process_instance ||
      !RECEIPT_APPEND_LOCK_TOKEN_V1.test(token) ||
      value.directory_dev !== String(authority.dev) ||
      value.directory_ino !== String(authority.ino) ||
      name !== this.appendLockClaimNameV1(token)
    ) {
      throw new Error("VOID_RECEIPT_APPEND_LOCK_CLAIM_INVALID_V1");
    }
    return {
      marker: RECEIPT_APPEND_LOCK_CLAIM_V1,
      version: 1,
      pid: Number(value.pid),
      process_instance: value.process_instance,
      token,
      directory_dev: value.directory_dev,
      directory_ino: value.directory_ino,
      path: path.join(authority.stablePath, name),
      stamp,
    };
  }

  private async readAppendLockReleaseV1(
    authority: ReceiptDirectoryAuthorityV1,
    claim: ReceiptAppendLockClaimV1,
  ): Promise<ReceiptAppendLockReleaseV1 | null> {
    const name = this.appendLockReleaseNameV1(claim.token);
    let record: { value: unknown; stamp: ReceiptFileStampV1 };
    try {
      record = await this.readAppendLockJsonV1(authority, name);
    } catch (error: any) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }
    const { value, stamp } = record;
    if (!receiptExactKeysV1(value, [
      "marker",
      "version",
      "pid",
      "process_instance",
      "token",
      "claim_stamp",
    ]) ||
      value.marker !== RECEIPT_APPEND_LOCK_RELEASE_V1 ||
      value.version !== 1 ||
      value.pid !== claim.pid ||
      value.process_instance !== claim.process_instance ||
      value.token !== claim.token ||
      !receiptValidStampV1(value.claim_stamp) ||
      !receiptSameStampV1(value.claim_stamp, claim.stamp)
    ) {
      throw new Error("VOID_RECEIPT_APPEND_LOCK_RELEASE_INVALID_V1");
    }
    return {
      marker: RECEIPT_APPEND_LOCK_RELEASE_V1,
      version: 1,
      pid: claim.pid,
      process_instance: claim.process_instance,
      token: claim.token,
      claim_stamp: value.claim_stamp,
      path: path.join(authority.stablePath, name),
      stamp,
    };
  }

  private async writeAppendLockRecordV1(
    authority: ReceiptDirectoryAuthorityV1,
    finalName: string,
    value: unknown,
  ): Promise<void> {
    const token = crypto.randomBytes(8).toString("hex");
    const tempName = `.receipts-append-lock-tmp-${process.pid}-${token}`;
    const tempPath = path.join(authority.stablePath, tempName);
    const finalPath = path.join(authority.stablePath, finalName);
    const body = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
    const handle = await fs.promises.open(
      tempPath,
      fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW,
      0o600,
    );
    let published = false;
    try {
      let offset = 0;
      while (offset < body.length) {
        const { bytesWritten } = await handle.write(body, offset, body.length - offset, null);
        if (bytesWritten <= 0) throw new Error("VOID_RECEIPT_APPEND_LOCK_RECORD_SHORT_WRITE_V1");
        offset += bytesWritten;
      }
      await handle.sync();
      await handle.close();
      await fs.promises.link(tempPath, finalPath);
      published = true;
      await authority.handle.sync();
      await this.assertDirectoryAuthorityV1(authority);
    } finally {
      await handle.close().catch(() => undefined);
      await fs.promises.unlink(tempPath).catch(() => undefined);
      if (!published) await authority.handle.sync().catch(() => undefined);
    }
  }

  private appendLockClaimStateV1(
    claim: ReceiptAppendLockClaimV1,
  ): "live" | "stale" | "ambiguous" {
    if (!receiptPidAliveV1(claim.pid)) return "stale";
    if (process.platform === "linux") {
      const actual = receiptLinuxProcessInstanceV1(claim.pid);
      if (!actual) return "ambiguous";
      return actual === claim.process_instance ? "live" : "stale";
    }
    return claim.pid === process.pid && claim.process_instance === receiptCurrentProcessInstanceV1()
      ? "live"
      : "ambiguous";
  }

  private async removeObservedAppendLockRecordV1(
    authority: ReceiptDirectoryAuthorityV1,
    record: { path: string; stamp: ReceiptFileStampV1 },
  ): Promise<boolean> {
    let visible: fs.BigIntStats;
    try {
      visible = await fs.promises.lstat(record.path, { bigint: true });
    } catch (error: any) {
      return error?.code === "ENOENT";
    }
    if (!visible.isFile() || visible.isSymbolicLink() ||
      !receiptSameStampV1(receiptFileStampV1(visible), record.stamp)) return false;
    try {
      await fs.promises.unlink(record.path);
      await authority.handle.sync();
      await this.assertDirectoryAuthorityV1(authority);
      return true;
    } catch (error: any) {
      return error?.code === "ENOENT";
    }
  }

  private async appendLockBlockedV1(
    authority: ReceiptDirectoryAuthorityV1,
    ownPath = "",
    hooks?: ReceiptAppendTestHooksV1,
  ): Promise<boolean> {
    const names = (await fs.promises.readdir(authority.stablePath))
      .filter((name) => /^\.receipts-append-claim-[0-9a-f]{32}\.json$/.test(name))
      .sort();
    let blocked = false;
    for (const name of names) {
      const claimPath = path.join(authority.stablePath, name);
      if (ownPath && claimPath === ownPath) continue;
      let claim: ReceiptAppendLockClaimV1;
      try {
        claim = await this.readAppendLockClaimV1(authority, name);
      } catch (_error) {
        blocked = true;
        continue;
      }
      let release: ReceiptAppendLockReleaseV1 | null;
      try {
        release = await this.readAppendLockReleaseV1(authority, claim);
      } catch (_error) {
        blocked = true;
        continue;
      }
      if (release) {
        await hooks?.beforeObservedLockCleanup?.(claim.path);
        if (!await this.removeObservedAppendLockRecordV1(authority, claim)) {
          blocked = true;
          continue;
        }
        await this.removeObservedAppendLockRecordV1(authority, release);
        continue;
      }
      const state = this.appendLockClaimStateV1(claim);
      if (state === "stale") {
        await hooks?.beforeObservedLockCleanup?.(claim.path);
        if (!await this.removeObservedAppendLockRecordV1(authority, claim)) blocked = true;
        continue;
      }
      blocked = true;
    }
    return blocked;
  }

  private async publishAppendLockClaimV1(
    authority: ReceiptDirectoryAuthorityV1,
  ): Promise<ReceiptAppendLockClaimV1> {
    const token = crypto.randomBytes(16).toString("hex");
    const name = this.appendLockClaimNameV1(token);
    const processInstance = receiptCurrentProcessInstanceV1();
    await this.writeAppendLockRecordV1(authority, name, {
      marker: RECEIPT_APPEND_LOCK_CLAIM_V1,
      version: 1,
      pid: process.pid,
      process_instance: processInstance,
      token,
      directory_dev: String(authority.dev),
      directory_ino: String(authority.ino),
    });
    return await this.readAppendLockClaimV1(authority, name);
  }

  private async acquireAppendLockV1(
    authority: ReceiptDirectoryAuthorityV1,
    signal?: AbortSignal,
    hooks?: ReceiptAppendTestHooksV1,
  ): Promise<ReceiptAppendLockClaimV1> {
    const deadline = Date.now() + RECEIPT_APPEND_LOCK_MAX_WAIT_MS_V1;
    while (true) {
      signal?.throwIfAborted();
      await this.assertDirectoryAuthorityV1(authority);
      if (!await this.appendLockBlockedV1(authority, "", hooks)) {
        const own = await this.publishAppendLockClaimV1(authority);
        await hooks?.afterLockClaimPublished?.();
        await this.assertDirectoryAuthorityV1(authority);
        if (!await this.appendLockBlockedV1(authority, own.path, hooks)) return own;
        await this.removeObservedAppendLockRecordV1(authority, own);
      }
      if (Date.now() >= deadline) {
        throw new Error("VOID_RECEIPT_APPEND_CROSS_PROCESS_LOCKED_V1");
      }
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          clearTimeout(timer);
          reject(signal?.reason);
        };
        const timer = setTimeout(() => {
          signal?.removeEventListener("abort", onAbort);
          resolve();
        }, RECEIPT_APPEND_LOCK_WAIT_MS_V1);
        signal?.addEventListener("abort", onAbort, { once: true });
      });
    }
  }

  private async releaseAppendLockV1(
    authority: ReceiptDirectoryAuthorityV1,
    claim: ReceiptAppendLockClaimV1,
    hooks?: ReceiptAppendTestHooksV1,
  ): Promise<void> {
    try {
      const current = await this.readAppendLockClaimV1(
        authority,
        this.appendLockClaimNameV1(claim.token),
      );
      if (current.pid !== process.pid ||
        current.process_instance !== receiptCurrentProcessInstanceV1() ||
        !receiptSameStampV1(current.stamp, claim.stamp)) {
        throw new Error("VOID_RECEIPT_APPEND_LOCK_RELEASE_OWNER_MISMATCH_V1");
      }
      const releaseName = this.appendLockReleaseNameV1(claim.token);
      await this.writeAppendLockRecordV1(authority, releaseName, {
        marker: RECEIPT_APPEND_LOCK_RELEASE_V1,
        version: 1,
        pid: claim.pid,
        process_instance: claim.process_instance,
        token: claim.token,
        claim_stamp: claim.stamp,
      });
      const release = await this.readAppendLockReleaseV1(authority, claim);
      if (!release) throw new Error("VOID_RECEIPT_APPEND_LOCK_RELEASE_MISSING_V1");
      await hooks?.beforeLockClaimCleanup?.();
      if (!await this.removeObservedAppendLockRecordV1(authority, claim)) {
        throw new Error("VOID_RECEIPT_APPEND_LOCK_RELEASE_CLEANUP_FAILED_V1");
      }
      await this.removeObservedAppendLockRecordV1(authority, release);
    } catch (error) {
      recordSmallEmptyCatchVisibilityFailure_src_chain_receipts_ts(
        "receipt-append-lock-release-deferred",
        error,
      );
    }
  }

  private async openDirectoryAuthorityV1(
    signal?: AbortSignal,
  ): Promise<ReceiptDirectoryAuthorityV1> {
    signal?.throwIfAborted();
    const handle = await fs.promises.open(
      this.dir,
      fs.constants.O_RDONLY |
        fs.constants.O_DIRECTORY |
        fs.constants.O_NOFOLLOW,
    );
    try {
      const opened = await handle.stat({ bigint: true });
      const publicPath = await fs.promises.lstat(this.dir, { bigint: true });
      if (
        !opened.isDirectory() ||
        !publicPath.isDirectory() ||
        opened.dev !== publicPath.dev ||
        opened.ino !== publicPath.ino
      ) {
        throw new Error("receipt directory authority generation mismatch");
      }
      return {
        handle,
        stablePath: `/proc/self/fd/${handle.fd}`,
        dev: opened.dev,
        ino: opened.ino,
      };
    } catch (error) {
      await handle.close().catch(() => undefined);
      throw error;
    }
  }

  private async assertDirectoryAuthorityV1(
    authority: ReceiptDirectoryAuthorityV1,
  ): Promise<void> {
    const opened = await authority.handle.stat({ bigint: true });
    const publicPath = await fs.promises.lstat(this.dir, { bigint: true });
    if (
      !opened.isDirectory() ||
      !publicPath.isDirectory() ||
      opened.dev !== authority.dev ||
      opened.ino !== authority.ino ||
      publicPath.dev !== authority.dev ||
      publicPath.ino !== authority.ino
    ) {
      throw new Error("receipt directory authority generation changed");
    }
  }

  private async shardFilesV1(
    signal?: AbortSignal,
    directory = this.dir,
  ): Promise<string[]> {
    signal?.throwIfAborted();
    const files: string[] = [];
    let entries = 0;
    const openedDirectory = await fs.promises.opendir(directory);
    try {
      for await (const entry of openedDirectory) {
        signal?.throwIfAborted();
        entries += 1;
        if (entries > MAX_RECEIPT_DIRECTORY_ENTRIES_V1) {
          throw new Error(
            `receipt directory exceeds ${MAX_RECEIPT_DIRECTORY_ENTRIES_V1} bounded entries`,
          );
        }
        if (/^receipts-\d{8}\.jsonl$/.test(entry.name)) files.push(entry.name);
        if (files.length > MAX_RECEIPT_SHARD_FILES_V1) {
          throw new Error(
            `receipt history exceeds ${MAX_RECEIPT_SHARD_FILES_V1} bounded shards`,
          );
        }
      }
    } finally {
      await openedDirectory.close().catch(() => undefined);
    }
    files.sort();
    signal?.throwIfAborted();
    return files;
  }

  private parseReceiptLineV1(line: string, file: string): Receipt {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new Error(`receipt shard contains malformed JSONL: ${file}`);
    }
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      throw new Error(`receipt shard contains an invalid receipt: ${file}`);
    }
    const candidate = parsed as Record<string, unknown>;
    if (
      typeof candidate.h !== "string" ||
      !/^[0-9a-f]{64}$/.test(candidate.h) ||
      typeof candidate.n !== "number" ||
      !Number.isSafeInteger(candidate.n) ||
      candidate.n < 0 ||
      typeof candidate.o !== "number" ||
      !Number.isSafeInteger(candidate.o) ||
      candidate.o < 0 ||
      typeof candidate.ts !== "number" ||
      !Number.isSafeInteger(candidate.ts) ||
      candidate.ts <= 0
    ) {
      throw new Error(`receipt shard contains an invalid receipt: ${file}`);
    }
    return {
      h: candidate.h,
      n: candidate.n,
      o: candidate.o,
      ts: candidate.ts,
    };
  }

  private async scanReceiptHistoryV1(
    wantedHashes: Set<string>,
    opts: { signal?: AbortSignal; files?: string[]; directory?: string } = {},
  ): Promise<{
    hits: Map<string, Receipt>;
    files: string[];
    lineCounts: Map<string, number>;
    activeContent: string;
  }> {
    const directory = opts.directory ?? this.dir;
    const files = opts.files ?? await this.shardFilesV1(opts.signal, directory);
    const hits = new Map<string, Receipt>();
    const lineCounts = new Map<string, number>();
    const seenHashes = new Set<string>();
    const activeFile = files.at(-1);
    let activeContent = "";
    let admittedBytes = 0;

    for (const file of files.slice().reverse()) {
      opts.signal?.throwIfAborted();
      const shardPath = path.join(directory, file);
      let handle: Awaited<ReturnType<typeof fs.promises.open>> | null = null;
      try {
        handle = await fs.promises.open(
          shardPath,
          fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW,
        );
        const opened = await handle.stat({ bigint: true });
        if (
          !opened.isFile() ||
          opened.size > BigInt(MAX_RECEIPT_SHARD_BYTES_V1)
        ) {
          throw new Error(`receipt shard is not a bounded regular file: ${file}`);
        }
        if (
          BigInt(admittedBytes) + opened.size >
            BigInt(MAX_RECEIPT_HISTORY_SCAN_BYTES_V1)
        ) {
          throw new Error(
            `receipt history scan exceeds ${MAX_RECEIPT_HISTORY_SCAN_BYTES_V1} bytes`,
          );
        }

        const chunks: Buffer[] = [];
        let fileBytes = 0;
        while (true) {
          opts.signal?.throwIfAborted();
          const shardBytesRemaining = MAX_RECEIPT_SHARD_BYTES_V1 - fileBytes;
          const historyBytesRemaining =
            MAX_RECEIPT_HISTORY_SCAN_BYTES_V1 - admittedBytes - fileBytes;
          const readLimit = Math.max(
            1,
            Math.min(
              RECEIPT_READ_CHUNK_BYTES_V1,
              shardBytesRemaining + 1,
              historyBytesRemaining + 1,
            ),
          );
          const chunk = Buffer.allocUnsafe(readLimit);
          const { bytesRead } = await handle.read(
            chunk,
            0,
            chunk.byteLength,
            null,
          );
          if (bytesRead === 0) break;
          fileBytes += bytesRead;
          if (fileBytes > MAX_RECEIPT_SHARD_BYTES_V1) {
            throw new Error(`receipt shard is not a bounded regular file: ${file}`);
          }
          if (
            admittedBytes + fileBytes > MAX_RECEIPT_HISTORY_SCAN_BYTES_V1
          ) {
            throw new Error(
              `receipt history scan exceeds ${MAX_RECEIPT_HISTORY_SCAN_BYTES_V1} bytes`,
            );
          }
          chunks.push(chunk.subarray(0, bytesRead));
        }

        const afterRead = await handle.stat({ bigint: true });
        const finalPath = await fs.promises.lstat(shardPath, { bigint: true });
        if (
          !afterRead.isFile() ||
          !finalPath.isFile() ||
          opened.dev !== afterRead.dev ||
          opened.ino !== afterRead.ino ||
          opened.size !== afterRead.size ||
          opened.mtimeNs !== afterRead.mtimeNs ||
          opened.ctimeNs !== afterRead.ctimeNs ||
          afterRead.dev !== finalPath.dev ||
          afterRead.ino !== finalPath.ino ||
          afterRead.size !== finalPath.size ||
          afterRead.mtimeNs !== finalPath.mtimeNs ||
          afterRead.ctimeNs !== finalPath.ctimeNs ||
          afterRead.size !== BigInt(fileBytes)
        ) {
          throw new Error(`receipt shard generation changed during read: ${file}`);
        }

        admittedBytes += fileBytes;
        let text: string;
        try {
          text = new TextDecoder("utf-8", { fatal: true }).decode(
            Buffer.concat(chunks, fileBytes),
          );
        } catch {
          throw new Error(`receipt shard contains invalid UTF-8: ${file}`);
        }
        if (text.length > 0 && !text.endsWith("\n")) {
          throw new Error(`receipt shard has a torn suffix: ${file}`);
        }
        let lines = 0;
        for (const line of text.split("\n")) {
          if (!line) continue;
          if (Buffer.byteLength(line, "utf8") > RECEIPT_READ_CHUNK_BYTES_V1) {
            throw new Error(`receipt shard contains an oversized line: ${file}`);
          }
          lines += 1;
          const receipt = this.parseReceiptLineV1(line, file);
          if (seenHashes.has(receipt.h)) {
            throw new Error(
              `receipt shard contains a duplicate receipt: ${receipt.h}`,
            );
          }
          seenHashes.add(receipt.h);
          if (wantedHashes.has(receipt.h)) {
            hits.set(receipt.h, receipt);
          }
        }
        lineCounts.set(file, lines);
        if (file === activeFile) activeContent = text;
      } finally {
        if (handle) await handle.close().catch(() => undefined);
      }
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    opts.signal?.throwIfAborted();
    return { hits, files, lineCounts, activeContent };
  }

  private async fsyncDirectoryV1(
    authority: ReceiptDirectoryAuthorityV1,
    signal?: AbortSignal,
  ): Promise<void> {
    signal?.throwIfAborted();
    await authority.handle.sync();
    signal?.throwIfAborted();
  }

  async getMany(
    hashes: string[],
    opts: { signal?: AbortSignal } = {},
  ): Promise<Map<string, ReceiptHit>> {
    opts.signal?.throwIfAborted();
    const wanted = new Set(
      hashes
        .map((hash) => String(hash || "").toLowerCase())
        .filter((hash) => /^[0-9a-f]{64}$/.test(hash)),
    );
    const out = new Map<string, ReceiptHit>();
    const cold = new Set<string>();
    for (const hash of wanted) {
      const prior = this.mem.get(hash);
      if (prior) out.set(hash, prior);
      else cold.add(hash);
    }
    if (cold.size > 0) {
      const authority = await this.openDirectoryAuthorityV1(opts.signal);
      try {
        const { hits, files } = await this.scanReceiptHistoryV1(cold, {
          ...opts,
          directory: authority.stablePath,
        });
        if (files.length > 0) {
          // A prior replacement may be visible after its caller observed a
          // parent-directory fsync failure. Re-establish durability on the
          // exact directory generation that supplied the scanned shards.
          await this.fsyncDirectoryV1(authority, opts.signal);
        }
        await this.assertDirectoryAuthorityV1(authority);
        for (const hash of cold) {
          const receipt = hits.get(hash);
          if (receipt) {
            this.mem.set(hash, {
              n: receipt.n,
              o: receipt.o,
              ts: receipt.ts,
              found: true,
            });
          }
          out.set(hash, receipt
            ? { n: receipt.n, o: receipt.o, ts: receipt.ts, found: true }
            : { found: false });
        }
      } finally {
        await authority.handle.close().catch(() => undefined);
      }
    }
    return out;
  }

  async appendMany(
    arr: Receipt[],
    opts: {
      signal?: AbortSignal;
      faultAtV1?: ReceiptAppendFaultV1;
      testHooksV1?: ReceiptAppendTestHooksV1;
    } = {},
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
    opts: {
      signal?: AbortSignal;
      faultAtV1?: ReceiptAppendFaultV1;
      testHooksV1?: ReceiptAppendTestHooksV1;
    },
  ): Promise<void> {
    opts.signal?.throwIfAborted();
    if (!Array.isArray(arr) || arr.length === 0) return;
    await fs.promises.mkdir(this.dir, { recursive: true });
    opts.signal?.throwIfAborted();

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
    if (normalizedByHash.size === 0) return;

    const authority = await this.openDirectoryAuthorityV1(opts.signal);
    try {
    const appendLock = await this.acquireAppendLockV1(
      authority,
      opts.signal,
      opts.testHooksV1,
    );
    try {
    const directory = authority.stablePath;
    const shardFiles = await this.shardFilesV1(opts.signal, directory);
    const {
      hits: durable,
      lineCounts,
      activeContent,
    } = await this.scanReceiptHistoryV1(
      new Set(normalizedByHash.keys()),
      { signal: opts.signal, files: shardFiles, directory },
    );
    await opts.testHooksV1?.afterSnapshot?.();
    opts.signal?.throwIfAborted();
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
    if (pending.length === 0) {
      // A prior publication may have made this exact generation visible and
      // then failed while syncing the containing directory. Re-sync before an
      // exact retry accepts the visible receipt as durability-authoritative.
      await this.fsyncDirectoryV1(authority, opts.signal);
      await this.assertDirectoryAuthorityV1(authority);
      return;
    }

    let file = shardFiles.at(-1) ?? "receipts-00000000.jsonl";
    let p = path.join(directory, file);
    let before = shardFiles.length > 0 ? activeContent : "";
    const suffix = `${pending.map((receipt) => JSON.stringify(receipt)).join("\n")}\n`;
    let payload = Buffer.from(before + suffix, "utf8");
    let activeLines = lineCounts.get(file) ?? 0;
    if (
      shardFiles.length > 0 &&
      (activeLines + pending.length > this.shardSpan ||
        payload.byteLength > MAX_RECEIPT_SHARD_BYTES_V1)
    ) {
      if (shardFiles.length >= MAX_RECEIPT_SHARD_FILES_V1) {
        throw new Error(
          `receipt history exceeds ${MAX_RECEIPT_SHARD_FILES_V1} bounded shards`,
        );
      }
      const priorBase = Number(file.slice("receipts-".length, -".jsonl".length));
      const nextBase = priorBase + this.shardSpan;
      if (!Number.isSafeInteger(nextBase) || nextBase > 99_999_999) {
        throw new Error("receipt shard namespace is exhausted");
      }
      file = `receipts-${String(nextBase).padStart(8, "0")}.jsonl`;
      p = path.join(directory, file);
      before = "";
      activeLines = 0;
      payload = Buffer.from(suffix, "utf8");
    }
    if (payload.byteLength > MAX_RECEIPT_SHARD_BYTES_V1) {
      throw new Error(`receipt shard publication exceeds ${MAX_RECEIPT_SHARD_BYTES_V1} bytes`);
    }

    const tempPath = path.join(
      directory,
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
      if (opts.faultAtV1 === "before_directory_sync") {
        throw new Error(
          "VOID_RECEIPT_APPEND_FAULT_BEFORE_DIRECTORY_SYNC_V1",
        );
      }
      await this.fsyncDirectoryV1(authority);
      if (opts.faultAtV1 === "after_publish") {
        throw new Error("VOID_RECEIPT_APPEND_FAULT_AFTER_PUBLISH_V1");
      }
      await this.assertDirectoryAuthorityV1(authority);
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
    } finally {
      await this.releaseAppendLockV1(
        authority,
        appendLock,
        opts.testHooksV1,
      );
    }
    } finally {
      await authority.handle.close().catch(() => undefined);
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
