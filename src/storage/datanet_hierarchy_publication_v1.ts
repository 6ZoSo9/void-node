// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  buildDatanetHierarchyStructureV1,
  canonicalJsonFileV1,
  VOID_DATANET_HIERARCHY_MAX_LEAVES_V1,
  VOID_DATANET_HIERARCHY_MAX_MANIFEST_BYTES_V1,
} from "./datanet_immutable_hierarchy_v1.js";
import type { DatanetHierarchyStructureV1 } from "./datanet_immutable_hierarchy_v1.js";

export const VOID_DATANET_HIERARCHY_PUBLICATION_V1 = "VOID_DATANET_HIERARCHY_PUBLICATION_V1";
const PUBLICATION_PREFIX = "hierarchy-";
const TOP_NAME = "top.v1.json";
const LEAF_NAME_WIDTH = 6;
const READ_CHUNK_BYTES = 1024 * 1024;

export type DatanetHierarchyRetainedFileReceiptV1 = {
  role: "leaf" | "top";
  ordinal: number | null;
  file: string;
  byte_length: number;
  sha256: string;
  identity: string;
};

export type DatanetHierarchyPublicationReceiptV1 = {
  schema: typeof VOID_DATANET_HIERARCHY_PUBLICATION_V1;
  object_id: string;
  generation: string;
  publication_name: string;
  manifest_sha256: string;
  composition_root: string;
  leaf_count: number;
  retained_file_count: number;
  retained_bytes: number;
  retained_files: DatanetHierarchyRetainedFileReceiptV1[];
  payload_availability_proved: false;
};

type DirectoryAuthorityV1 = {
  fd: number;
  public_path: string;
  stable_path: string;
  dev: bigint;
  ino: bigint;
};

type ExpectedFileV1 = {
  role: "leaf" | "top";
  ordinal: number | null;
  name: string;
  bytes: Buffer;
  sha256: string;
};

function fail(code: string, detail: string): never {
  throw new Error(`${VOID_DATANET_HIERARCHY_PUBLICATION_V1}:${code}:${detail}`);
}

function sha256Hex(data: Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function assertHex64(value: unknown, code: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) fail(code, String(value));
  return value;
}

function directoryFlagsV1(): number {
  return fs.constants.O_RDONLY |
    ((fs.constants as typeof fs.constants & { O_DIRECTORY?: number }).O_DIRECTORY ?? 0) |
    ((fs.constants as typeof fs.constants & { O_NOFOLLOW?: number }).O_NOFOLLOW ?? 0);
}

function regularReadFlagsV1(): number {
  return fs.constants.O_RDONLY |
    ((fs.constants as typeof fs.constants & { O_NOFOLLOW?: number }).O_NOFOLLOW ?? 0);
}

function regularCreateFlagsV1(): number {
  return fs.constants.O_WRONLY |
    fs.constants.O_CREAT |
    fs.constants.O_EXCL |
    ((fs.constants as typeof fs.constants & { O_NOFOLLOW?: number }).O_NOFOLLOW ?? 0);
}

function currentUidV1(): bigint {
  if (typeof process.getuid !== "function") fail("UID_UNAVAILABLE", "process.getuid");
  return BigInt(process.getuid());
}

function identityV1(st: fs.BigIntStats): string {
  return `${st.dev}:${st.ino}`;
}

function modeV1(st: fs.BigIntStats): number {
  return Number(st.mode) & 0o777;
}

function assertPrivateDirectoryStatV1(st: fs.BigIntStats, label: string): void {
  if (!st.isDirectory() || st.isSymbolicLink()) fail("DIRECTORY_TYPE", label);
  const mode = modeV1(st);
  if (st.uid !== currentUidV1() || (mode & 0o077) !== 0 || (mode & 0o700) !== 0o700) {
    fail("DIRECTORY_AUTHORITY", `${label}:uid=${st.uid}:mode=${mode.toString(8)}`);
  }
}

function assertDirectoryAuthorityV1(authority: DirectoryAuthorityV1): void {
  const opened = fs.fstatSync(authority.fd, { bigint: true });
  let visible: fs.BigIntStats;
  try {
    visible = fs.lstatSync(authority.public_path, { bigint: true });
  } catch (error: any) {
    fail("DIRECTORY_VISIBLE_MISSING", `${authority.public_path}:${String(error?.code || error)}`);
  }
  assertPrivateDirectoryStatV1(opened, authority.public_path);
  assertPrivateDirectoryStatV1(visible, authority.public_path);
  if (
    opened.dev !== authority.dev ||
    opened.ino !== authority.ino ||
    visible.dev !== authority.dev ||
    visible.ino !== authority.ino
  ) {
    fail("DIRECTORY_AUTHORITY_CHANGED", authority.public_path);
  }
}

function openDirectoryAuthorityV1(publicPathInput: string): DirectoryAuthorityV1 {
  const publicPath = path.resolve(String(publicPathInput || ""));
  if (!publicPath || publicPath === path.parse(publicPath).root) fail("INVALID_ROOT", publicPath || "empty");
  let realPath: string;
  try { realPath = fs.realpathSync.native(publicPath); }
  catch (error: any) { fail("DIRECTORY_REALPATH", `${publicPath}:${String(error?.code || error)}`); }
  if (realPath !== publicPath) fail("DIRECTORY_SYMLINK_ANCESTRY", `${publicPath}:${realPath}`);
  let fd = -1;
  try {
    fd = fs.openSync(publicPath, directoryFlagsV1());
  } catch (error: any) {
    fail("DIRECTORY_OPEN", `${publicPath}:${String(error?.code || error)}`);
  }
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    const visible = fs.lstatSync(publicPath, { bigint: true });
    assertPrivateDirectoryStatV1(opened, publicPath);
    assertPrivateDirectoryStatV1(visible, publicPath);
    if (opened.dev !== visible.dev || opened.ino !== visible.ino) fail("DIRECTORY_IDENTITY", publicPath);
    const authority: DirectoryAuthorityV1 = {
      fd,
      public_path: publicPath,
      stable_path: `/proc/self/fd/${fd}`,
      dev: opened.dev,
      ino: opened.ino,
    };
    let proc: fs.BigIntStats;
    try {
      proc = fs.statSync(authority.stable_path, { bigint: true });
    } catch (error: any) {
      fail("PROC_FD_UNAVAILABLE", String(error?.code || error));
    }
    if (!proc.isDirectory() || proc.dev !== opened.dev || proc.ino !== opened.ino) fail("PROC_FD_IDENTITY", publicPath);
    return authority;
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function openChildDirectoryAuthorityV1(parent: DirectoryAuthorityV1, name: string): DirectoryAuthorityV1 {
  if (!name || path.basename(name) !== name || name === "." || name === "..") fail("CHILD_NAME", name);
  assertDirectoryAuthorityV1(parent);
  const publicPath = path.join(parent.public_path, name);
  const stablePath = path.join(parent.stable_path, name);
  let fd = -1;
  try {
    fd = fs.openSync(stablePath, directoryFlagsV1());
  } catch (error: any) {
    fail("PUBLICATION_DIRECTORY_OPEN", `${name}:${String(error?.code || error)}`);
  }
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    const stable = fs.lstatSync(stablePath, { bigint: true });
    const visible = fs.lstatSync(publicPath, { bigint: true });
    for (const [label, st] of [["opened", opened], ["stable", stable], ["visible", visible]] as const) {
      assertPrivateDirectoryStatV1(st, `${publicPath}:${label}`);
    }
    if (
      opened.dev !== stable.dev || opened.ino !== stable.ino ||
      opened.dev !== visible.dev || opened.ino !== visible.ino
    ) {
      fail("PUBLICATION_DIRECTORY_IDENTITY", publicPath);
    }
    const authority: DirectoryAuthorityV1 = {
      fd,
      public_path: publicPath,
      stable_path: `/proc/self/fd/${fd}`,
      dev: opened.dev,
      ino: opened.ino,
    };
    assertDirectoryAuthorityV1(parent);
    return authority;
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function leafNameV1(ordinal: number): string {
  if (!Number.isSafeInteger(ordinal) || ordinal < 0 || ordinal >= VOID_DATANET_HIERARCHY_MAX_LEAVES_V1) {
    fail("LEAF_ORDINAL", String(ordinal));
  }
  return `leaf-${String(ordinal).padStart(LEAF_NAME_WIDTH, "0")}.v1.json`;
}

function publicationNameV1(structure: DatanetHierarchyStructureV1): string {
  return `${PUBLICATION_PREFIX}${assertHex64(structure.manifest_sha256, "MANIFEST_SHA256")}`;
}

function rebuildCanonicalStructureV1(structure: DatanetHierarchyStructureV1): DatanetHierarchyStructureV1 {
  try {
    if (!structure || typeof structure !== "object" || Array.isArray(structure)) fail("STRUCTURE", "invalid");
    if (!structure.top || typeof structure.top !== "object" || Array.isArray(structure.top)) fail("STRUCTURE_TOP", "invalid");
    if (!Array.isArray(structure.leaves)) fail("STRUCTURE_LEAVES", "invalid");

    const segments = structure.leaves.flatMap((leaf) => {
      if (!leaf?.manifest || !Array.isArray(leaf.manifest.segments)) fail("STRUCTURE_LEAF", "invalid");
      return leaf.manifest.segments.map((row) => ({ ...row }));
    });
    const leafMaxSegments = structure.leaves.length > 1
      ? structure.leaves[0].manifest.segment_count
      : Math.max(1, structure.top.segment_count);
    const maxObjectSegments = Math.max(1, structure.top.segment_count);

    return buildDatanetHierarchyStructureV1({
      object_id: structure.top.object_id,
      generation: structure.top.generation,
      media_type: structure.top.media_type,
      payload_length: structure.top.payload_length,
      payload_sha256: structure.top.payload_sha256,
      segments,
      segment_size: structure.top.segment_size,
      leaf_max_segments: leafMaxSegments,
      max_object_segments: maxObjectSegments,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(`${VOID_DATANET_HIERARCHY_PUBLICATION_V1}:`)) throw error;
    const detail = error instanceof Error ? error.message : String(error);
    fail("STRUCTURE_REBUILD", detail);
  }
}

function assertCanonicalStructureV1(structure: DatanetHierarchyStructureV1): void {
  const rebuilt = rebuildCanonicalStructureV1(structure);
  if (!Buffer.isBuffer(structure.top_bytes) || !rebuilt.top_bytes.equals(structure.top_bytes)) {
    fail("STRUCTURE_TOP_BYTES", "canonical rebuild mismatch");
  }
  if (rebuilt.manifest_sha256 !== structure.manifest_sha256) {
    fail("STRUCTURE_MANIFEST_SHA256", `${structure.manifest_sha256}:${rebuilt.manifest_sha256}`);
  }
  if (rebuilt.composition_root !== structure.composition_root) {
    fail("STRUCTURE_COMPOSITION_ROOT", `${structure.composition_root}:${rebuilt.composition_root}`);
  }
  if (rebuilt.leaves.length !== structure.leaves.length) {
    fail("STRUCTURE_LEAF_COUNT", `${structure.leaves.length}:${rebuilt.leaves.length}`);
  }
  for (let ordinal = 0; ordinal < rebuilt.leaves.length; ordinal++) {
    const actual = structure.leaves[ordinal];
    const expected = rebuilt.leaves[ordinal];
    if (!Buffer.isBuffer(actual.bytes) || !expected.bytes.equals(actual.bytes)) {
      fail("STRUCTURE_LEAF_BYTES", String(ordinal));
    }
    if (actual.manifest_sha256 !== expected.manifest_sha256) {
      fail("STRUCTURE_LEAF_SHA256", String(ordinal));
    }
    if (actual.manifest_digest !== expected.manifest_digest) {
      fail("STRUCTURE_LEAF_DIGEST", String(ordinal));
    }
  }
}

function expectedFilesV1(structure: DatanetHierarchyStructureV1): ExpectedFileV1[] {
  assertCanonicalStructureV1(structure);
  if (!Array.isArray(structure.leaves) || structure.leaves.length > VOID_DATANET_HIERARCHY_MAX_LEAVES_V1) {
    fail("LEAF_COUNT", String(structure.leaves?.length));
  }
  if (structure.top.leaf_count !== structure.leaves.length || structure.top.leaves.length !== structure.leaves.length) {
    fail("TOP_LEAF_COUNT", `${structure.top.leaf_count}:${structure.leaves.length}:${structure.top.leaves.length}`);
  }
  assertHex64(structure.composition_root, "COMPOSITION_ROOT");
  if (!Buffer.isBuffer(structure.top_bytes)) fail("TOP_BYTES", typeof structure.top_bytes);
  if (structure.top_bytes.length > VOID_DATANET_HIERARCHY_MAX_MANIFEST_BYTES_V1) {
    fail("TOP_BYTES_CEILING", String(structure.top_bytes.length));
  }
  const canonicalTop = canonicalJsonFileV1(structure.top);
  if (!canonicalTop.equals(structure.top_bytes)) fail("TOP_CANONICAL_BYTES", "mismatch");
  if (sha256Hex(structure.top_bytes) !== structure.manifest_sha256) fail("TOP_SHA256", structure.manifest_sha256);

  const files: ExpectedFileV1[] = [];
  for (let ordinal = 0; ordinal < structure.leaves.length; ordinal++) {
    const leaf = structure.leaves[ordinal];
    const topLeaf = structure.top.leaves[ordinal];
    if (leaf.manifest.ordinal !== ordinal || topLeaf.ordinal !== ordinal) fail("LEAF_ORDER", String(ordinal));
    if (leaf.manifest.object_id !== structure.top.object_id || leaf.manifest.generation !== structure.top.generation) {
      fail("LEAF_BINDING", String(ordinal));
    }
    if (!Buffer.isBuffer(leaf.bytes) || leaf.bytes.length > VOID_DATANET_HIERARCHY_MAX_MANIFEST_BYTES_V1) {
      fail("LEAF_BYTES", `${ordinal}:${leaf.bytes?.length}`);
    }
    const canonicalLeaf = canonicalJsonFileV1(leaf.manifest);
    if (!canonicalLeaf.equals(leaf.bytes)) fail("LEAF_CANONICAL_BYTES", String(ordinal));
    const leafSha256 = sha256Hex(leaf.bytes);
    if (leafSha256 !== leaf.manifest_sha256 || topLeaf.manifest_sha256 !== leaf.manifest_sha256) {
      fail("LEAF_SHA256", String(ordinal));
    }
    files.push({
      role: "leaf",
      ordinal,
      name: leafNameV1(ordinal),
      bytes: leaf.bytes,
      sha256: leaf.manifest_sha256,
    });
  }
  files.push({ role: "top", ordinal: null, name: TOP_NAME, bytes: structure.top_bytes, sha256: structure.manifest_sha256 });
  return files;
}

function writeAllV1(fd: number, data: Buffer, label: string): void {
  let offset = 0;
  while (offset < data.length) {
    const wrote = fs.writeSync(fd, data, offset, data.length - offset, null);
    if (wrote <= 0) fail("SHORT_WRITE", `${label}:${offset}:${wrote}`);
    offset += wrote;
  }
}

function createRetainedFileV1(authority: DirectoryAuthorityV1, expected: ExpectedFileV1): void {
  assertDirectoryAuthorityV1(authority);
  const stableFile = path.join(authority.stable_path, expected.name);
  let fd = -1;
  try {
    fd = fs.openSync(stableFile, regularCreateFlagsV1(), 0o600);
  } catch (error: any) {
    if (error?.code === "EEXIST") fail("FILE_ALREADY_EXISTS", expected.name);
    fail("FILE_CREATE", `${expected.name}:${String(error?.code || error)}`);
  }
  try {
    writeAllV1(fd, expected.bytes, expected.name);
    fs.fchmodSync(fd, 0o600);
    fs.fsyncSync(fd);
    const st = fs.fstatSync(fd, { bigint: true });
    if (!st.isFile() || st.isSymbolicLink()) fail("WRITE_FILE_TYPE", expected.name);
    if (st.uid !== currentUidV1() || st.nlink !== 1n || modeV1(st) !== 0o600) {
      fail("WRITE_FILE_METADATA", `${expected.name}:uid=${st.uid}:nlink=${st.nlink}:mode=${modeV1(st).toString(8)}`);
    }
    if (st.size !== BigInt(expected.bytes.length)) fail("WRITE_FILE_SIZE", `${expected.name}:${st.size}`);
  } finally {
    fs.closeSync(fd);
  }
}

function readRetainedFileV1(authority: DirectoryAuthorityV1, expected: ExpectedFileV1): DatanetHierarchyRetainedFileReceiptV1 {
  assertDirectoryAuthorityV1(authority);
  const stableFile = path.join(authority.stable_path, expected.name);
  const publicFile = path.join(authority.public_path, expected.name);
  let fd = -1;
  try {
    fd = fs.openSync(stableFile, regularReadFlagsV1());
  } catch (error: any) {
    fail("RETAINED_OPEN", `${expected.name}:${String(error?.code || error)}`);
  }
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    let stableVisible: fs.BigIntStats;
    let publicVisible: fs.BigIntStats;
    try {
      stableVisible = fs.lstatSync(stableFile, { bigint: true });
      publicVisible = fs.lstatSync(publicFile, { bigint: true });
    } catch (error: any) {
      fail("RETAINED_VISIBLE", `${expected.name}:${String(error?.code || error)}`);
    }
    for (const st of [before, stableVisible, publicVisible]) {
      if (!st.isFile() || st.isSymbolicLink()) fail("RETAINED_FILE_TYPE", expected.name);
      if (st.uid !== currentUidV1() || st.nlink !== 1n || modeV1(st) !== 0o600) {
        fail("RETAINED_FILE_METADATA", `${expected.name}:uid=${st.uid}:nlink=${st.nlink}:mode=${modeV1(st).toString(8)}`);
      }
    }
    if (
      before.dev !== stableVisible.dev || before.ino !== stableVisible.ino ||
      before.dev !== publicVisible.dev || before.ino !== publicVisible.ino
    ) {
      fail("RETAINED_PATH_IDENTITY", expected.name);
    }
    if (before.size !== BigInt(expected.bytes.length)) {
      fail("RETAINED_SIZE", `${expected.name}:${before.size}:${expected.bytes.length}`);
    }

    const chunks: Buffer[] = [];
    const hash = crypto.createHash("sha256");
    let returned = 0;
    const buffer = Buffer.allocUnsafe(Math.min(READ_CHUNK_BYTES, Math.max(1, expected.bytes.length)));
    while (returned < expected.bytes.length) {
      const limit = Math.min(buffer.length, expected.bytes.length - returned);
      const n = fs.readSync(fd, buffer, 0, limit, null);
      if (n <= 0) fail("RETAINED_SHORT_READ", `${expected.name}:${returned}:${expected.bytes.length}`);
      const chunk = Buffer.from(buffer.subarray(0, n));
      chunks.push(chunk);
      hash.update(chunk);
      returned += n;
    }
    const sentinel = Buffer.allocUnsafe(1);
    if (fs.readSync(fd, sentinel, 0, 1, null) !== 0) fail("RETAINED_GROWTH", expected.name);

    const after = fs.fstatSync(fd, { bigint: true });
    const stableAfter = fs.lstatSync(stableFile, { bigint: true });
    const publicAfter = fs.lstatSync(publicFile, { bigint: true });
    const beforeKey = `${before.dev}:${before.ino}:${before.size}:${before.mtimeNs}:${before.ctimeNs}:${modeV1(before)}:${before.nlink}`;
    for (const st of [after, stableAfter, publicAfter]) {
      const key = `${st.dev}:${st.ino}:${st.size}:${st.mtimeNs}:${st.ctimeNs}:${modeV1(st)}:${st.nlink}`;
      if (key !== beforeKey) fail("RETAINED_CHANGED_DURING_READ", expected.name);
    }
    const observed = Buffer.concat(chunks, returned);
    const observedSha256 = hash.digest("hex");
    if (observedSha256 !== expected.sha256) fail("RETAINED_SHA256", `${expected.name}:${observedSha256}`);
    if (!observed.equals(expected.bytes)) fail("RETAINED_BYTES", expected.name);
    return {
      role: expected.role,
      ordinal: expected.ordinal,
      file: expected.name,
      byte_length: returned,
      sha256: observedSha256,
      identity: identityV1(before),
    };
  } finally {
    fs.closeSync(fd);
  }
}

function verifyPublicationInventoryV1(authority: DirectoryAuthorityV1, expected: readonly ExpectedFileV1[]): void {
  assertDirectoryAuthorityV1(authority);
  const actual = fs.readdirSync(authority.stable_path).sort();
  const wanted = expected.map((entry) => entry.name).sort();
  if (actual.length !== wanted.length || actual.some((entry, index) => entry !== wanted[index])) {
    fail("PUBLICATION_INVENTORY", `actual=${actual.join(",")}:wanted=${wanted.join(",")}`);
  }
  assertDirectoryAuthorityV1(authority);
}

function publicationReceiptV1(
  structure: DatanetHierarchyStructureV1,
  publicationName: string,
  retainedFiles: DatanetHierarchyRetainedFileReceiptV1[],
): DatanetHierarchyPublicationReceiptV1 {
  return {
    schema: VOID_DATANET_HIERARCHY_PUBLICATION_V1,
    object_id: structure.top.object_id,
    generation: structure.top.generation,
    publication_name: publicationName,
    manifest_sha256: structure.manifest_sha256,
    composition_root: structure.composition_root,
    leaf_count: structure.leaves.length,
    retained_file_count: retainedFiles.length,
    retained_bytes: retainedFiles.reduce((sum, file) => sum + file.byte_length, 0),
    retained_files: retainedFiles,
    payload_availability_proved: false,
  };
}

export function verifyDatanetHierarchyRetainedV1(
  rootInput: string,
  structure: DatanetHierarchyStructureV1,
): DatanetHierarchyPublicationReceiptV1 {
  const expected = expectedFilesV1(structure);
  const root = openDirectoryAuthorityV1(rootInput);
  try {
    const publicationName = publicationNameV1(structure);
    const publication = openChildDirectoryAuthorityV1(root, publicationName);
    try {
      verifyPublicationInventoryV1(publication, expected);
      const retained = expected.map((file) => readRetainedFileV1(publication, file));
      verifyPublicationInventoryV1(publication, expected);
      assertDirectoryAuthorityV1(root);
      return publicationReceiptV1(structure, publicationName, retained);
    } finally {
      fs.closeSync(publication.fd);
    }
  } finally {
    fs.closeSync(root.fd);
  }
}

export function publishDatanetHierarchyCreateOnlyV1(
  rootInput: string,
  structure: DatanetHierarchyStructureV1,
): DatanetHierarchyPublicationReceiptV1 {
  const expected = expectedFilesV1(structure);
  const root = openDirectoryAuthorityV1(rootInput);
  try {
    const publicationName = publicationNameV1(structure);
    const stablePublication = path.join(root.stable_path, publicationName);
    try {
      fs.mkdirSync(stablePublication, { mode: 0o700 });
    } catch (error: any) {
      if (error?.code === "EEXIST") fail("PUBLICATION_ALREADY_EXISTS", publicationName);
      fail("PUBLICATION_DIRECTORY_CREATE", `${publicationName}:${String(error?.code || error)}`);
    }
    fs.fsyncSync(root.fd);
    assertDirectoryAuthorityV1(root);
    const publication = openChildDirectoryAuthorityV1(root, publicationName);
    try {
      for (const file of expected) createRetainedFileV1(publication, file);
      fs.fsyncSync(publication.fd);
      assertDirectoryAuthorityV1(publication);
    } finally {
      fs.closeSync(publication.fd);
    }
    fs.fsyncSync(root.fd);
    assertDirectoryAuthorityV1(root);
  } finally {
    fs.closeSync(root.fd);
  }
  return verifyDatanetHierarchyRetainedV1(rootInput, structure);
}
