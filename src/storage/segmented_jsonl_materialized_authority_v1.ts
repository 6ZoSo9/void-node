// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  readSegmentedJsonlManifestV1,
  type SegmentedJsonlManifestV1,
} from "./segmented_jsonl_v1.js";
import {
  deriveSegmentedJsonlSnapshotAuthorityV1,
  verifySegmentedJsonlSnapshotAuthorityObjectV1,
} from "./segmented_jsonl_snapshot_authority_v1.js";

export const VOID_SEGMENTED_JSONL_MATERIALIZED_AUTHORITY_V1 =
  "VOID_SEGMENTED_JSONL_MATERIALIZED_AUTHORITY_V1";

const READ_CHUNK = 1024 * 1024;

type FileGenerationV1 = {
  dev: string;
  ino: string;
  size: string;
  mtime_ns: string;
  ctime_ns: string;
  mode: number;
  nlink: number;
};

type ParentAuthorityV1 = {
  fd: number;
  public_path: string;
  stable_path: string;
  dev: string;
  ino: string;
};

export type SegmentedJsonlMaterializedAuthorityV1 = {
  v: 1;
  format: typeof VOID_SEGMENTED_JSONL_MATERIALIZED_AUTHORITY_V1;
  snapshot_sha256: string;
  manifest_sha256: string;
  store_generation: number;
  total_bytes: number;
  total_records: number;
  materialized_sha256: string;
  materialized_generation_sha256: string;
  materialized_mode: number;
  live_tree_terminal_authority: false;
  materialized_exact_generation_authority: true;
  authority_sha256: string;
};

function fail(code: string, detail: string): never {
  throw new Error(`${VOID_SEGMENTED_JSONL_MATERIALIZED_AUTHORITY_V1}:${code}:${detail}`);
}

function sha256(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function isHex64(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value);
}

function statNs(st: any, name: "mtime" | "ctime"): string {
  const direct = st[`${name}Ns`];
  if (typeof direct === "bigint") return String(direct);
  return String(BigInt(Math.round(Number(st[`${name}Ms`] || 0) * 1_000_000)));
}

function fileGeneration(st: any): FileGenerationV1 {
  if (!st.isFile()) fail("MATERIALIZED_NOT_REGULAR", "fstat");
  return {
    dev: String(st.dev),
    ino: String(st.ino),
    size: String(st.size),
    mtime_ns: statNs(st, "mtime"),
    ctime_ns: statNs(st, "ctime"),
    mode: Number(st.mode) & 0o777,
    nlink: Number(st.nlink),
  };
}

function sameFileGeneration(a: FileGenerationV1, b: FileGenerationV1): boolean {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.size === b.size &&
    a.mtime_ns === b.mtime_ns &&
    a.ctime_ns === b.ctime_ns &&
    a.mode === b.mode &&
    a.nlink === b.nlink
  );
}

function directoryFlags(): number {
  return (
    fs.constants.O_RDONLY |
    ((fs.constants as any).O_DIRECTORY || 0) |
    ((fs.constants as any).O_NOFOLLOW || 0)
  );
}

function currentUid(): bigint {
  if (typeof process.getuid !== "function") fail("UID_UNAVAILABLE", "process.getuid");
  return BigInt(process.getuid());
}

function assertPrivateDirectory(st: any, label: string): void {
  const mode = Number(st.mode) & 0o777;
  if (
    !st.isDirectory() ||
    st.uid !== currentUid() ||
    (mode & 0o022) !== 0 ||
    (mode & 0o300) !== 0o300
  ) {
    fail("MATERIALIZED_PARENT_AUTHORITY_MISMATCH", `${label}:uid=${String(st.uid)}:mode=${mode.toString(8)}`);
  }
}

function openParentAuthority(fileInput: string): ParentAuthorityV1 {
  const file = path.resolve(String(fileInput || ""));
  if (!file || file === path.parse(file).root) fail("INVALID_MATERIALIZED_PATH", file || "empty");
  const parent = path.dirname(file);
  const parsed = path.parse(parent);
  let fd = fs.openSync(parsed.root, directoryFlags());
  let visible = parsed.root;
  try {
    for (const component of parent.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
      const stableChild = path.join(`/proc/self/fd/${fd}`, component);
      const nextFd = fs.openSync(stableChild, directoryFlags());
      try {
        const opened = fs.fstatSync(nextFd, { bigint: true } as any);
        visible = path.join(visible, component);
        const publicStat = fs.lstatSync(visible, { bigint: true } as any);
        if (
          !opened.isDirectory() ||
          !publicStat.isDirectory() ||
          publicStat.isSymbolicLink() ||
          opened.dev !== publicStat.dev ||
          opened.ino !== publicStat.ino
        ) {
          fail("MATERIALIZED_PARENT_NAMESPACE_MISMATCH", visible);
        }
      } catch (error) {
        fs.closeSync(nextFd);
        throw error;
      }
      fs.closeSync(fd);
      fd = nextFd;
    }
    const opened = fs.fstatSync(fd, { bigint: true } as any);
    const publicStat = fs.lstatSync(parent, { bigint: true } as any);
    if (
      !opened.isDirectory() ||
      !publicStat.isDirectory() ||
      publicStat.isSymbolicLink() ||
      opened.dev !== publicStat.dev ||
      opened.ino !== publicStat.ino
    ) {
      fail("MATERIALIZED_PARENT_NAMESPACE_MISMATCH", parent);
    }
    assertPrivateDirectory(opened, parent);
    assertPrivateDirectory(publicStat, parent);
    return {
      fd,
      public_path: parent,
      stable_path: `/proc/self/fd/${fd}`,
      dev: String(opened.dev),
      ino: String(opened.ino),
    };
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function assertParentAuthority(parent: ParentAuthorityV1): void {
  const opened = fs.fstatSync(parent.fd, { bigint: true } as any);
  const publicStat = fs.lstatSync(parent.public_path, { bigint: true } as any);
  if (
    !opened.isDirectory() ||
    !publicStat.isDirectory() ||
    publicStat.isSymbolicLink() ||
    String(opened.dev) !== parent.dev ||
    String(opened.ino) !== parent.ino ||
    opened.dev !== publicStat.dev ||
    opened.ino !== publicStat.ino
  ) {
    fail("MATERIALIZED_PARENT_CHANGED", parent.public_path);
  }
  assertPrivateDirectory(opened, parent.public_path);
  assertPrivateDirectory(publicStat, parent.public_path);
}

function visibleFileGeneration(file: string): FileGenerationV1 | null {
  try {
    const st = fs.lstatSync(file, { bigint: true } as any);
    if (!st.isFile() || st.isSymbolicLink()) return null;
    return fileGeneration(st);
  } catch {
    return null;
  }
}

function requireExactKeys(value: object, expected: readonly string[], code: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(code, actual.join(","));
  }
}

function materializedAuthorityCore(
  manifest: SegmentedJsonlManifestV1,
  materializedSha256: string,
  generationSha256: string,
  mode: number,
) {
  const snapshot = deriveSegmentedJsonlSnapshotAuthorityV1(manifest);
  return {
    v: 1 as const,
    format: VOID_SEGMENTED_JSONL_MATERIALIZED_AUTHORITY_V1 as typeof VOID_SEGMENTED_JSONL_MATERIALIZED_AUTHORITY_V1,
    snapshot_sha256: snapshot.snapshot_sha256,
    manifest_sha256: snapshot.manifest_sha256,
    store_generation: snapshot.generation,
    total_bytes: snapshot.total_bytes,
    total_records: snapshot.total_records,
    materialized_sha256: materializedSha256,
    materialized_generation_sha256: generationSha256,
    materialized_mode: mode,
    live_tree_terminal_authority: false as const,
    materialized_exact_generation_authority: true as const,
  };
}

function readAndBindMaterializedFile(
  manifest: SegmentedJsonlManifestV1,
  materializedInput: string,
): {
  materialized_sha256: string;
  materialized_generation_sha256: string;
  materialized_mode: number;
} {
  const file = path.resolve(String(materializedInput || ""));
  const parent = openParentAuthority(file);
  let fd = -1;
  try {
    assertParentAuthority(parent);
    const stableFile = path.join(parent.stable_path, path.basename(file));
    fd = fs.openSync(
      stableFile,
      fs.constants.O_RDONLY | ((fs.constants as any).O_NOFOLLOW || 0),
    );
    const before = fileGeneration(fs.fstatSync(fd, { bigint: true } as any));
    const visibleBefore = visibleFileGeneration(file);
    if (!visibleBefore || !sameFileGeneration(before, visibleBefore)) {
      fail("MATERIALIZED_GENERATION_UNSTABLE_BEFORE_READ", file);
    }
    if (before.mode !== 0o600 && before.mode !== 0o400) {
      fail("MATERIALIZED_MODE_NOT_PRIVATE", `${file}:${before.mode.toString(8)}`);
    }
    if (BigInt(before.size) !== BigInt(manifest.total_bytes)) {
      fail("MATERIALIZED_SIZE_MISMATCH", `${file}:${before.size}:${manifest.total_bytes}`);
    }

    const totalHash = crypto.createHash("sha256");
    const buf = Buffer.allocUnsafe(READ_CHUNK);
    const readPart = (bytes: number, expectedHash: string, label: string) => {
      const partHash = crypto.createHash("sha256");
      let remaining = bytes;
      while (remaining > 0) {
        const n = fs.readSync(fd, buf, 0, Math.min(buf.length, remaining), null);
        if (n <= 0) fail("MATERIALIZED_SHORT_READ", `${label}:${remaining}`);
        const chunk = buf.subarray(0, n);
        partHash.update(chunk);
        totalHash.update(chunk);
        remaining -= n;
      }
      const actual = partHash.digest("hex");
      if (actual !== expectedHash) {
        fail("MATERIALIZED_PART_HASH_MISMATCH", `${label}:${expectedHash}:${actual}`);
      }
    };

    for (const segment of manifest.sealed_segments) {
      readPart(segment.bytes, segment.sha256, `segment=${segment.id}`);
    }
    readPart(manifest.active.bytes, manifest.active.sha256, "active");
    const sentinel = Buffer.allocUnsafe(1);
    if (fs.readSync(fd, sentinel, 0, 1, null) > 0) {
      fail("MATERIALIZED_GREW_DURING_READ", file);
    }

    const after = fileGeneration(fs.fstatSync(fd, { bigint: true } as any));
    const visibleAfter = visibleFileGeneration(file);
    if (
      !sameFileGeneration(before, after) ||
      !visibleAfter ||
      !sameFileGeneration(after, visibleAfter)
    ) {
      fail("MATERIALIZED_GENERATION_UNSTABLE_DURING_READ", file);
    }
    assertParentAuthority(parent);
    return {
      materialized_sha256: totalHash.digest("hex"),
      materialized_generation_sha256: sha256(canonicalJson(after)),
      materialized_mode: after.mode,
    };
  } finally {
    if (fd >= 0) fs.closeSync(fd);
    fs.closeSync(parent.fd);
  }
}

export function verifySegmentedJsonlMaterializedAuthorityObjectV1(
  authorityInput: SegmentedJsonlMaterializedAuthorityV1,
): SegmentedJsonlMaterializedAuthorityV1 {
  const authority = authorityInput as SegmentedJsonlMaterializedAuthorityV1;
  if (!authority || typeof authority !== "object") fail("INVALID_MATERIALIZED_AUTHORITY", "not-object");
  requireExactKeys(authority, [
    "v", "format", "snapshot_sha256", "manifest_sha256", "store_generation",
    "total_bytes", "total_records", "materialized_sha256",
    "materialized_generation_sha256", "materialized_mode",
    "live_tree_terminal_authority", "materialized_exact_generation_authority",
    "authority_sha256",
  ], "INVALID_MATERIALIZED_AUTHORITY_KEYS");
  if (
    authority.v !== 1 ||
    authority.format !== VOID_SEGMENTED_JSONL_MATERIALIZED_AUTHORITY_V1 ||
    !isHex64(authority.snapshot_sha256) ||
    !isHex64(authority.manifest_sha256) ||
    !Number.isSafeInteger(authority.store_generation) || authority.store_generation <= 0 ||
    !Number.isSafeInteger(authority.total_bytes) || authority.total_bytes < 0 ||
    !Number.isSafeInteger(authority.total_records) || authority.total_records < 0 ||
    !isHex64(authority.materialized_sha256) ||
    !isHex64(authority.materialized_generation_sha256) ||
    (authority.materialized_mode !== 0o600 && authority.materialized_mode !== 0o400) ||
    authority.live_tree_terminal_authority !== false ||
    authority.materialized_exact_generation_authority !== true ||
    !isHex64(authority.authority_sha256)
  ) {
    fail("INVALID_MATERIALIZED_AUTHORITY", "shape");
  }
  const { authority_sha256: _digest, ...core } = authority;
  if (sha256(canonicalJson(core)) !== authority.authority_sha256) {
    fail("MATERIALIZED_AUTHORITY_DIGEST_MISMATCH", authority.authority_sha256);
  }
  return authority;
}

export function deriveSegmentedJsonlMaterializedAuthorityV1(
  root: string,
  materializedFile: string,
): SegmentedJsonlMaterializedAuthorityV1 {
  const manifest = readSegmentedJsonlManifestV1(root);
  const snapshot = verifySegmentedJsonlSnapshotAuthorityObjectV1(
    deriveSegmentedJsonlSnapshotAuthorityV1(manifest),
  );
  const observed = readAndBindMaterializedFile(manifest, materializedFile);
  const core = materializedAuthorityCore(
    manifest,
    observed.materialized_sha256,
    observed.materialized_generation_sha256,
    observed.materialized_mode,
  );
  if (
    core.snapshot_sha256 !== snapshot.snapshot_sha256 ||
    core.manifest_sha256 !== snapshot.manifest_sha256
  ) {
    fail("MATERIALIZED_SNAPSHOT_BINDING_MISMATCH", materializedFile);
  }
  return verifySegmentedJsonlMaterializedAuthorityObjectV1({
    ...core,
    authority_sha256: sha256(canonicalJson(core)),
  });
}

export function verifySegmentedJsonlMaterializedAuthorityAtUseV1(
  root: string,
  materializedFile: string,
  authorityInput: SegmentedJsonlMaterializedAuthorityV1,
): SegmentedJsonlMaterializedAuthorityV1 {
  const expected = verifySegmentedJsonlMaterializedAuthorityObjectV1(authorityInput);
  const actual = deriveSegmentedJsonlMaterializedAuthorityV1(root, materializedFile);
  if (canonicalJson(actual) !== canonicalJson(expected)) {
    fail("MATERIALIZED_AUTHORITY_USE_MISMATCH", materializedFile);
  }
  return actual;
}
