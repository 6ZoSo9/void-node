// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import * as fs from "node:fs";
import * as path from "node:path";

export const VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DIRECT_READ_V1 =
  "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DIRECT_READ_V1";

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

function openParentDirectoryV1(filePath: string): { fd: number; name: string } | null {
  const noFollow = (
    fs.constants as typeof fs.constants & { O_NOFOLLOW?: number }
  ).O_NOFOLLOW;
  const directory = (
    fs.constants as typeof fs.constants & { O_DIRECTORY?: number }
  ).O_DIRECTORY;
  if (typeof noFollow !== "number" || typeof directory !== "number") return null;

  const euid =
    typeof process.geteuid === "function" ? BigInt(process.geteuid()) : null;
  if (euid === null) return null;

  const absolute = path.resolve(filePath);
  const parsed = path.parse(absolute);
  const parts = absolute.slice(parsed.root.length).split(path.sep).filter(Boolean);
  const name = parts.pop();
  if (!name || name === "." || name === "..") return null;

  let fd = -1;
  try {
    fd = fs.openSync(parsed.root, fs.constants.O_RDONLY | directory | noFollow);
    for (const part of parts) {
      if (!renameProtectedDirectoryV1(fs.fstatSync(fd, { bigint: true }), euid)) return null;
      if (!part || part === "." || part === "..") return null;
      const nextPath = path.join(PROC_FD_ROOT_V1, String(fd), part);
      const nextFd = fs.openSync(
        nextPath,
        fs.constants.O_RDONLY | directory | noFollow,
      );
      const opened = fs.fstatSync(nextFd, { bigint: true });
      if (!opened.isDirectory() || opened.isSymbolicLink()) {
        fs.closeSync(nextFd);
        return null;
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
      return null;
    }
    const result = { fd, name };
    fd = -1;
    return result;
  } catch {
    return null;
  } finally {
    if (fd >= 0) {
      try {
        fs.closeSync(fd);
      } catch {}
    }
  }
}

export function readDirectRegularFileV1(filePath: string): Buffer | null {
  const noFollow = (
    fs.constants as typeof fs.constants & { O_NOFOLLOW?: number }
  ).O_NOFOLLOW;
  if (typeof noFollow !== "number") return null;

  const parent = openParentDirectoryV1(filePath);
  if (!parent) return null;

  let fd = -1;
  try {
    const procPath = path.join(PROC_FD_ROOT_V1, String(parent.fd), parent.name);
    const listed = fs.lstatSync(procPath, { bigint: true });
    const euid =
      typeof process.geteuid === "function" ? BigInt(process.geteuid()) : null;
    if (
      euid === null ||
      !listed.isFile() ||
      listed.isSymbolicLink() ||
      listed.uid !== euid ||
      listed.nlink !== 1n ||
      (listed.mode & 0o022n) !== 0n
    ) return null;

    fd = fs.openSync(procPath, fs.constants.O_RDONLY | noFollow);
    const opened = fs.fstatSync(fd, { bigint: true });
    if (!opened.isFile() || opened.isSymbolicLink() || !sameStampV1(listed, opened)) {
      return null;
    }

    const buf = fs.readFileSync(fd);
    const after = fs.fstatSync(fd, { bigint: true });
    const visible = fs.lstatSync(procPath, { bigint: true });
    if (
      !after.isFile() ||
      !visible.isFile() ||
      visible.isSymbolicLink() ||
      !sameStampV1(opened, after) ||
      !sameStampV1(after, visible) ||
      after.size !== BigInt(buf.length)
    ) {
      return null;
    }
    return buf;
  } catch {
    return null;
  } finally {
    if (fd >= 0) {
      try {
        fs.closeSync(fd);
      } catch {}
    }
    try {
      fs.closeSync(parent.fd);
    } catch {}
  }
}
