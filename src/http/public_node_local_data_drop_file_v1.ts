// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import * as fs from "node:fs";

export const VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DIRECT_READ_V1 =
  "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DIRECT_READ_V1";

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

export function readDirectRegularFileV1(filePath: string): Buffer | null {
  const noFollow = (
    fs.constants as typeof fs.constants & { O_NOFOLLOW?: number }
  ).O_NOFOLLOW;
  if (typeof noFollow !== "number") return null;

  let listed: fs.BigIntStats;
  try {
    listed = fs.lstatSync(filePath, { bigint: true });
  } catch {
    return null;
  }
  if (!listed.isFile() || listed.isSymbolicLink()) return null;

  let fd = -1;
  try {
    fd = fs.openSync(filePath, fs.constants.O_RDONLY | noFollow);
    const opened = fs.fstatSync(fd, { bigint: true });
    if (!opened.isFile() || opened.isSymbolicLink() || !sameStampV1(listed, opened)) {
      return null;
    }

    const buf = fs.readFileSync(fd);
    const after = fs.fstatSync(fd, { bigint: true });
    const visible = fs.lstatSync(filePath, { bigint: true });
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
  }
}
