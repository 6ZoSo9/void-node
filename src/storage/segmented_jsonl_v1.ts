// VOID Community License (VCL) v1.0 â€” see LICENSE
// Copyright (c) 2025 6ZoSo9

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { TextDecoder } from "node:util";

export const VOID_SEGMENTED_JSONL_V1 = "VOID_SEGMENTED_JSONL_V1";
export const VOID_SEGMENTED_JSONL_DEFAULT_TARGET_BYTES_V1 = 8 * 1024 * 1024;
export const VOID_SEGMENTED_JSONL_DEFAULT_MAX_RECORD_BYTES_V1 = 1024 * 1024;
export const VOID_SEGMENTED_JSONL_MAX_TARGET_BYTES_V1 = 8 * 1024 * 1024;
export const VOID_SEGMENTED_JSONL_MAX_RECORD_BYTES_V1 = 1024 * 1024;
export const VOID_SEGMENTED_JSONL_MAX_MANIFEST_BYTES_V1 = 8 * 1024 * 1024;
export const VOID_SEGMENTED_JSONL_MAX_SEALED_SEGMENTS_V1 = 31_190;

const MANIFEST = "manifest.v1.json";
const ACTIVE = "active.jsonl";
const SEGMENTS = "segments";
const NAME_WIDTH = 12;
const READ_CHUNK = 1024 * 1024;
const FATAL_UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

export type SegmentedJsonlSegmentV1 = {
  id: number;
  file: string;
  bytes: number;
  records: number;
  first_record_index: number;
  last_record_index: number;
  sha256: string;
};

export type SegmentedJsonlActiveV1 = {
  file: typeof ACTIVE;
  bytes: number;
  records: number;
  first_record_index: number;
  last_record_index: number | null;
  sha256: string;
};

export type SegmentedJsonlManifestV1 = {
  v: 1;
  format: typeof VOID_SEGMENTED_JSONL_V1;
  generation: number;
  segment_target_bytes: number;
  max_record_bytes: number;
  total_bytes: number;
  total_records: number;
  sealed_bytes: number;
  sealed_records: number;
  sealed_root_sha256: string;
  sealed_segments: SegmentedJsonlSegmentV1[];
  active: SegmentedJsonlActiveV1;
};

export type SegmentInventoryV1 = Pick<SegmentedJsonlSegmentV1, "id" | "bytes" | "records" | "sha256">;

export type SegmentReplicationPlanV1 = {
  missing: SegmentedJsonlSegmentV1[];
  matching: SegmentedJsonlSegmentV1[];
  conflicting: Array<{ remote: SegmentedJsonlSegmentV1; local: SegmentInventoryV1 }>;
};

type BuildOptionsV1 = {
  segmentTargetBytes?: number;
  maxRecordBytes?: number;
  maxSealedSegments?: number;
  generation?: number;
  validateJson?: boolean;
};

type GenerationV1 = { dev: string; ino: string; size: string; mtimeNs: string; ctimeNs: string };
type FdObservationV1 = { generation: GenerationV1; mode: number; nlink: number };
type DirectoryAuthorityV1 = {
  fd: number;
  publicPath: string;
  stablePath: string;
  dev: string;
  ino: string;
  uid: string;
  mode: number;
  privateWrite: boolean;
};

function fail(code: string, detail: string): never {
  throw new Error(`${VOID_SEGMENTED_JSONL_V1}:${code}:${detail}`);
}

function sha256(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function isHex64(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

function requireExactKeys(value: Record<string, unknown>, expected: readonly string[], code: string, detail: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(code, `${detail}:keys=${actual.join(",")}`);
  }
}

function exactSafeInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
  code: string,
): number {
  const candidate = value === undefined ? fallback : value;
  if (
    typeof candidate !== "number" ||
    !Number.isFinite(candidate) ||
    !Number.isSafeInteger(candidate) ||
    candidate < minimum ||
    candidate > maximum
  ) {
    fail(code, String(candidate));
  }
  return candidate;
}

function rootPath(input: string): string {
  const p = path.resolve(String(input || ""));
  if (!p || p === path.parse(p).root) fail("INVALID_ROOT", p || "empty");
  return p;
}

function inside(root: string, candidate: string): string {
  const base = rootPath(root);
  const p = path.resolve(candidate);
  const rel = path.relative(base, p);
  if (rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))) return p;
  fail("PATH_ESCAPE", candidate);
}

function ensureDir(dir: string): void {
  const st = fs.lstatSync(dir);
  if (!st.isDirectory() || st.isSymbolicLink()) fail("NON_DIRECTORY", dir);
}

function directoryOpenFlagsV1(): number {
  return fs.constants.O_RDONLY | ((fs.constants as any).O_DIRECTORY || 0) | ((fs.constants as any).O_NOFOLLOW || 0);
}

function directoryModeV1(st: any): number {
  return Number(st.mode) & 0o777;
}

function currentUidV1(): bigint {
  if (typeof process.getuid !== "function") fail("DIRECTORY_WRITE_AUTHORITY_UNAVAILABLE", "process.getuid");
  return BigInt(process.getuid());
}

function privateDirectoryIdentityV1(
  st: any,
  publicPath: string,
  code: string,
): { uid: string; mode: number } {
  const expectedUid = currentUidV1();
  const mode = directoryModeV1(st);
  if (st.uid !== expectedUid || (mode & 0o022) !== 0) {
    fail(code, `${publicPath}:uid=${String(st.uid)}:expected_uid=${String(expectedUid)}:mode=${mode.toString(8)}`);
  }
  return { uid: String(st.uid), mode };
}

function openDirectoryAuthorityV1(dir: string, requirePrivateWrite = false): DirectoryAuthorityV1 {
  const publicPath = path.resolve(dir);
  const parsed = path.parse(publicPath);
  let fd = fs.openSync(parsed.root, directoryOpenFlagsV1());
  let visiblePath = parsed.root;
  try {
    const components = publicPath.slice(parsed.root.length).split(path.sep).filter(Boolean);
    for (const component of components) {
      const stableChild = path.join(`/proc/self/fd/${fd}`, component);
      let nextFd = -1;
      try {
        nextFd = fs.openSync(stableChild, directoryOpenFlagsV1());
      } catch (error: any) {
        fail("DIRECTORY_COMPONENT_OPEN_FAILED", `${path.join(visiblePath, component)}:${String(error?.code || error)}`);
      }
      try {
        const opened = fs.fstatSync(nextFd, { bigint: true } as any);
        const stable = fs.lstatSync(stableChild, { bigint: true } as any);
        visiblePath = path.join(visiblePath, component);
        const visible = fs.lstatSync(visiblePath, { bigint: true } as any);
        if (
          !opened.isDirectory() ||
          !stable.isDirectory() ||
          stable.isSymbolicLink() ||
          !visible.isDirectory() ||
          visible.isSymbolicLink() ||
          opened.dev !== stable.dev ||
          opened.ino !== stable.ino ||
          opened.dev !== visible.dev ||
          opened.ino !== visible.ino
        ) {
          fail("DIRECTORY_ANCESTRY_AUTHORITY_MISMATCH", visiblePath);
        }
      } catch (error) {
        fs.closeSync(nextFd);
        throw error;
      }
      fs.closeSync(fd);
      fd = nextFd;
    }
    const opened = fs.fstatSync(fd, { bigint: true } as any);
    const current = fs.lstatSync(publicPath, { bigint: true } as any);
    if (!opened.isDirectory() || !current.isDirectory() || current.isSymbolicLink() || opened.dev !== current.dev || opened.ino !== current.ino) {
      fail("DIRECTORY_AUTHORITY_MISMATCH", publicPath);
    }
    const identity = requirePrivateWrite
      ? privateDirectoryIdentityV1(opened, publicPath, "DIRECTORY_WRITE_AUTHORITY_MISMATCH")
      : { uid: String(opened.uid), mode: directoryModeV1(opened) };
    if (requirePrivateWrite) {
      const currentIdentity = privateDirectoryIdentityV1(current, publicPath, "DIRECTORY_WRITE_AUTHORITY_MISMATCH");
      if (currentIdentity.uid !== identity.uid || currentIdentity.mode !== identity.mode) {
        fail("DIRECTORY_WRITE_AUTHORITY_CHANGED", `${publicPath}:uid=${currentIdentity.uid}:mode=${currentIdentity.mode.toString(8)}`);
      }
    }
    return { fd, publicPath, stablePath: `/proc/self/fd/${fd}`, dev: String(opened.dev), ino: String(opened.ino), uid: identity.uid, mode: identity.mode, privateWrite: requirePrivateWrite };
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function openDirectoryChildAuthorityV1(parent: DirectoryAuthorityV1, name: string, publicPath: string, requirePrivateWrite = parent.privateWrite): DirectoryAuthorityV1 {
  if (!name || name === "." || name === ".." || path.basename(name) !== name) fail("INVALID_DIRECTORY_CHILD", name);
  assertDirectoryAuthorityV1(parent);
  const stablePath = path.join(parent.stablePath, name);
  let fd = -1;
  try {
    try { fd = fs.openSync(stablePath, directoryOpenFlagsV1()); }
    catch (error: any) { fail("DIRECTORY_CHILD_OPEN_FAILED", `${publicPath}:${String(error?.code || error)}`); }
    const opened = fs.fstatSync(fd, { bigint: true } as any);
  const stable = fs.lstatSync(stablePath, { bigint: true } as any);
  const visible = fs.lstatSync(publicPath, { bigint: true } as any);
  if (
     !opened.isDirectory() ||
     !stable.isDirectory() ||
     stable.isSymbolicLink() ||
     !visible.isDirectory() ||
     visible.isSymbolicLink() ||
     opened.dev !== stable.dev ||
     opened.ino !== stable.ino ||
    opened.dev !== visible.dev ||
     opened.ino !== visible.ino
  ) {
    fail("DIRECTORY_CHILD_AUTHORITY_MISMATCH", publicPath);
  }
  const identity = requirePrivateWrite
    ? privateDirectoryIdentityV1(opened, publicPath, "DIRECTORY_WRITE_AUTHORITY_MISMATCH")
    : { uid: String(opened.uid), mode: directoryModeV1(opened) };
  assertDirectoryAuthorityV1(parent);
  return { fd, publicPath: path.resolve(publicPath), stablePath: `/proc/self/fd/${fd}`, dev: String(opened.dev), ino: String(opened.ino), uid: identity.uid, mode: identity.mode, privateWrite: requirePrivateWrite };
  } catch (error) {
    if (fd >= 0) fs.closeSync(fd);
    throw error;
  }
}
kºwµç