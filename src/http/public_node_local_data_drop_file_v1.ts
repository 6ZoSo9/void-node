// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import * as fs from "node:fs";
import * as path from "node:path";

export const VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DIRECT_READ_V1 =
  "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DIRECT_READ_V1";
export const VOID_PUBLIC_NODE_LOCAL_DATA_DROP_UNSAFE_STORAGE_V1 =
  "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_UNSAFE_STORAGE_V1";

const PROC_FD_ROOT_V1 = "/proc/self/fd";

function sameStampV1(a: fs.BigIntStats, b: fs.BigIntStats): boolean {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.size === b.size &&
    a.mtimeNs === b.mtimeNs &&
    a.ctimeNs === b.ctimeNs &&
    a.mode === b.mode &&
    a.uid === b.uid &&
    a.gid === b.gid &&
    a.nlink === b.nlink
  );
}

function renameProtectedDirectoryV1(st: fs.BigIntStats, euid: bigint): boolean {
  if (!st.isDirectory() || st.isSymbolicLink()) return false;
  if (st.uid !== euid && st.uid !== 0n) return false;
  return (st.mode & 0o022n) === 0n || (st.mode & 0o1000n) !== 0n;
}

function errorCodeV1(error: unknown): string {
  if (typeof error !== "object" || error === null || !("code" in error)) return "";
  return String((error as { code?: unknown }).code || "");
}

function missingPathV1(error: unknown): boolean {
  return errorCodeV1(error) === "ENOENT";
}

function unsafeStorageV1(detail: string, error?: unknown): never {
  const code = errorCodeV1(error);
  throw new Error(
    VOID_PUBLIC_NODE_LOCAL_DATA_DROP_UNSAFE_STORAGE_V1 +
      ":" +
      detail +
      (code ? ":" + code : ""),
  );
}

function isUnsafeStorageV1(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.startsWith(VOID_PUBLIC_NODE_LOCAL_DATA_DROP_UNSAFE_STORAGE_V1 + ":")
  );
}

function openParentDirectoryV1(filePath: string): { fd: number; name: string } | null {
  const noFollow = (
    fs.constants as typeof fs.constants & { O_NOFOLLOW?: number }
  ).O_NOFOLLOW;
  const directory = (
    fs.constants as typeof fs.constants & { O_DIRECTORY?: number }
  ).O_DIRECTORY;
  if (typeof noFollow !== "number" || typeof directory !== "number") {
    unsafeStorageV1("required_open_flags_unavailable");
  }

  const euid =
    typeof process.geteuid === "function" ? BigInt(process.geteuid()) : null;
  if (euid === null) unsafeStorageV1("effective_uid_unavailable");

  const absolute = path.resolve(filePath);
  const parsed = path.parse(absolute);
  const parts = absolute.slice(parsed.root.length).split(path.sep).filter(Boolean);
  const name = parts.pop();
  if (!name || name === "." || name === "..") unsafeStorageV1("invalid_final_component");

  let fd = -1;
  try {
    fd = fs.openSync(parsed.root, fs.constants.O_RDONLY | directory | noFollow);
    for (const part of parts) {
      if (!renameProtectedDirectoryV1(fs.fstatSync(fd, { bigint: true }), euid)) {
        unsafeStorageV1("unsafe_ancestor_directory");
      }
      if (!part || part === "." || part === "..") unsafeStorageV1("invalid_ancestor_component");
      const nextPath = path.join(PROC_FD_ROOT_V1, String(fd), part);
      const nextFd = fs.openSync(
        nextPath,
        fs.constants.O_RDONLY | directory | noFollow,
      );
      const opened = fs.fstatSync(nextFd, { bigint: true });
      if (!opened.isDirectory() || opened.isSymbolicLink()) {
        fs.closeSync(nextFd);
        unsafeStorageV1("unsafe_opened_ancestor");
      }
      fs.closeSync(fd);
      fd = nextFd;
    }
    const parentStat = fs.fstatSync(fd, { bigint: true });
    if (
      !parentStat.isDirectory() ||
      parentStat.isSymbolicLink() ||
      parentStat.uid !== euid ||
      (parentStat.mode & 0o022n) !== 0n
    ) {
      unsafeStorageV1("unsafe_final_parent");
    }
    const result = { fd, name };
    fd = -1;
    return result;
  } catch (error) {
    if (isUnsafeStorageV1(error)) throw error;
    if (missingPathV1(error)) return null;
    return unsafeStorageV1("parent_walk_failed", error);
  } finally {
    if (fd >= 0) {
      try {
        fs.closeSync(fd);
      } catch (_error) { void _error; }
    }
  }
}

export function listDirectDirectoryNamesV1(dirPath: string): string[] {
  const authority = openParentDirectoryV1(path.join(dirPath, ".void-list-v1"));
  if (!authority) return [];
  try {
    const procPath = path.join(PROC_FD_ROOT_V1, String(authority.fd));
    const before = fs.fstatSync(authority.fd, { bigint: true });
    const names = fs.readdirSync(procPath, { encoding: "utf8" });
    const after = fs.fstatSync(authority.fd, { bigint: true });
    if (
      !before.isDirectory() ||
      !after.isDirectory() ||
      !sameStampV1(before, after)
    ) {
      unsafeStorageV1("directory_changed_during_list");
    }
    return names;
  } catch (error) {
    if (isUnsafeStorageV1(error)) throw error;
    if (missingPathV1(error)) return [];
    return unsafeStorageV1("directory_list_failed", error);
  } finally {
    try {
      fs.closeSync(authority.fd);
    } catch (_error) { void _error; }
  }
}

function readDirectRegularFileCoreV1(
  filePath: string,
  maxBytes: number,
  testOnlyAfterOpenBeforeRead: (() => void) | null,
): Buffer | null {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    unsafeStorageV1("invalid_max_bytes");
  }
  const noFollow = (
    fs.constants as typeof fs.constants & { O_NOFOLLOW?: number }
  ).O_NOFOLLOW;
  if (typeof noFollow !== "number") unsafeStorageV1("nofollow_unavailable");

  const parent = openParentDirectoryV1(filePath);
  if (!parent) return null;

  let fd = -1;
  try {
    const procPath = path.join(PROC_FD_ROOT_V1, String(parent.fd), parent.name);
    let listed: fs.BigIntStats;
    try {
      listed = fs.lstatSync(procPath, { bigint: true });
    } catch (error) {
      if (missingPathV1(error)) return null;
      unsafeStorageV1("final_lstat_failed", error);
    }

    const euid =
      typeof process.geteuid === "function" ? BigInt(process.geteuid()) : null;
    if (
      euid === null ||
      !listed.isFile() ||
      listed.isSymbolicLink() ||
      listed.uid !== euid ||
      listed.nlink !== 1n ||
      (listed.mode & 0o022n) !== 0n
    ) {
      unsafeStorageV1("unsafe_final_file");
    }
    if (listed.size > BigInt(maxBytes)) {
      unsafeStorageV1("final_file_too_large");
    }

    try {
      fd = fs.openSync(procPath, fs.constants.O_RDONLY | noFollow);
    } catch (error) {
      if (missingPathV1(error)) {
        unsafeStorageV1("final_disappeared_before_open", error);
      }
      unsafeStorageV1("final_open_failed", error);
    }

    const opened = fs.fstatSync(fd, { bigint: true });
    if (!opened.isFile() || opened.isSymbolicLink() || !sameStampV1(listed, opened)) {
      unsafeStorageV1("final_identity_changed_before_read");
    }
    if (opened.size > BigInt(maxBytes)) {
      unsafeStorageV1("final_file_too_large");
    }

    const openedSize = Number(opened.size);
    if (!Number.isSafeInteger(openedSize) || openedSize < 0) {
      unsafeStorageV1("final_file_size_invalid");
    }

    if (testOnlyAfterOpenBeforeRead !== null) {
      testOnlyAfterOpenBeforeRead();
    }

    const buf = Buffer.alloc(openedSize);
    let offset = 0;
    while (offset < buf.length) {
      const count = fs.readSync(
        fd,
        buf,
        offset,
        buf.length - offset,
        offset,
      );
      if (count <= 0) {
        unsafeStorageV1("final_short_read");
      }
      offset += count;
    }

    const growthProbe = Buffer.allocUnsafe(1);
    const growthCount = fs.readSync(
      fd,
      growthProbe,
      0,
      1,
      openedSize,
    );
    if (growthCount !== 0) {
      unsafeStorageV1("final_file_grew_during_read");
    }

    const after = fs.fstatSync(fd, { bigint: true });
    let visible: fs.BigIntStats;
    try {
      visible = fs.lstatSync(procPath, { bigint: true });
    } catch (error) {
      if (missingPathV1(error)) {
        unsafeStorageV1("final_disappeared_after_read", error);
      }
      unsafeStorageV1("final_visible_lstat_failed", error);
    }
    if (
      !after.isFile() ||
      !visible.isFile() ||
      visible.isSymbolicLink() ||
      !sameStampV1(opened, after) ||
      !sameStampV1(after, visible) ||
      after.size !== BigInt(buf.length)
    ) {
      unsafeStorageV1("final_changed_during_read");
    }
    return buf;
  } catch (error) {
    if (isUnsafeStorageV1(error)) throw error;
    if (missingPathV1(error)) return null;
    return unsafeStorageV1("file_read_failed", error);
  } finally {
    if (fd >= 0) {
      try {
        fs.closeSync(fd);
      } catch (_error) { void _error; }
    }
    try {
      fs.closeSync(parent.fd);
    } catch (_error) { void _error; }
  }
}

export function readDirectRegularFileV1(
  filePath: string,
  maxBytes: number = Number.MAX_SAFE_INTEGER,
): Buffer | null {
  return readDirectRegularFileCoreV1(
    filePath,
    maxBytes,
    null,
  );
}

export function testOnlyReadDirectRegularFileWithAfterOpenHookV1(
  filePath: string,
  maxBytes: number,
  afterOpenBeforeRead: () => void,
): Buffer | null {
  if (typeof afterOpenBeforeRead !== "function") {
    unsafeStorageV1("test_hook_invalid");
  }
  return readDirectRegularFileCoreV1(
    filePath,
    maxBytes,
    afterOpenBeforeRead,
  );
}
