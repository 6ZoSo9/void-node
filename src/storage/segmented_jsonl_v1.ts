// VOID Community License (VCL) v1.0 — see LICENSE
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
type DirectoryAuthorityV1 = { fd: number; publicPath: string; stablePath: string; dev: string; ino: string };

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

function openDirectoryAuthorityV1(dir: string): DirectoryAuthorityV1 {
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
    return { fd, publicPath, stablePath: `/proc/self/fd/${fd}`, dev: String(opened.dev), ino: String(opened.ino) };
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function openDirectoryChildAuthorityV1(parent: DirectoryAuthorityV1, name: string, publicPath: string): DirectoryAuthorityV1 {
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
    assertDirectoryAuthorityV1(parent);
    return { fd, publicPath: path.resolve(publicPath), stablePath: `/proc/self/fd/${fd}`, dev: String(opened.dev), ino: String(opened.ino) };
  } catch (error) {
    if (fd >= 0) fs.closeSync(fd);
    throw error;
  }
}

function assertDirectoryAuthorityV1(authority: DirectoryAuthorityV1): void {
  const opened = fs.fstatSync(authority.fd, { bigint: true } as any);
  const current = fs.lstatSync(authority.publicPath, { bigint: true } as any);
  if (!opened.isDirectory() || !current.isDirectory() || current.isSymbolicLink() || String(opened.dev) !== authority.dev || String(opened.ino) !== authority.ino || opened.dev !== current.dev || opened.ino !== current.ino) {
    fail("DIRECTORY_AUTHORITY_CHANGED", authority.publicPath);
  }
}

function fsyncDir(dir: string): void {
  const authority = openDirectoryAuthorityV1(dir);
  try { fs.fsyncSync(authority.fd); assertDirectoryAuthorityV1(authority); }
  finally { fs.closeSync(authority.fd); }
}

function createDirectoryNewV1(dir: string): void {
  const parent = path.dirname(dir), name = path.basename(dir), authority = openDirectoryAuthorityV1(parent);
  try {
    fs.mkdirSync(path.join(authority.stablePath, name), { mode: 0o700 });
    fs.fsyncSync(authority.fd);
    assertDirectoryAuthorityV1(authority);
    const created = fs.lstatSync(path.join(authority.stablePath, name), { bigint: true } as any);
    const visible = fs.lstatSync(dir, { bigint: true } as any);
    if (!created.isDirectory() || created.isSymbolicLink() || !visible.isDirectory() || visible.isSymbolicLink() || created.dev !== visible.dev || created.ino !== visible.ino) {
      fail("CREATED_DIRECTORY_AUTHORITY_MISMATCH", dir);
    }
  } finally { fs.closeSync(authority.fd); }
}

function createDirectoryChildV1(parent: DirectoryAuthorityV1, name: string, publicPath: string): DirectoryAuthorityV1 {
  fs.mkdirSync(path.join(parent.stablePath, name), { mode: 0o700 });
  fs.fsyncSync(parent.fd);
  assertDirectoryAuthorityV1(parent);
  const child = openDirectoryChildAuthorityV1(parent, name, publicPath);
  const stableChild = fs.lstatSync(path.join(parent.stablePath, name), { bigint: true } as any);
  const openedChild = fs.fstatSync(child.fd, { bigint: true } as any);
  if (stableChild.dev !== openedChild.dev || stableChild.ino !== openedChild.ino) {
    fs.closeSync(child.fd);
    fail("CREATED_DIRECTORY_AUTHORITY_MISMATCH", publicPath);
  }
  return child;
}

function regularStat(file: string): fs.Stats {
  let st: fs.Stats;
  try { st = fs.lstatSync(file); } catch (err: any) { fail("MISSING_FILE", `${file}:${String(err?.code || err)}`); }
  if (!st!.isFile() || st!.isSymbolicLink()) fail("NON_REGULAR_FILE", file);
  return st!;
}

function generationFromStat(st: any): GenerationV1 {
  const ns = (name: "mtime" | "ctime") => {
    const direct = st[`${name}Ns`];
    if (typeof direct === "bigint") return String(direct);
    return String(BigInt(Math.round(Number(st[`${name}Ms`] || 0) * 1_000_000)));
  };
  return {
    dev: String(st.dev), ino: String(st.ino), size: String(st.size),
    mtimeNs: ns("mtime"), ctimeNs: ns("ctime"),
  };
}

function sameGeneration(a: GenerationV1, b: GenerationV1): boolean {
  return a.dev === b.dev && a.ino === b.ino && a.size === b.size && a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs;
}

function fdObservation(fd: number): FdObservationV1 {
  const st = fs.fstatSync(fd, { bigint: true } as any);
  if (!st.isFile()) fail("NON_REGULAR_FD", String(fd));
  return { generation: generationFromStat(st), mode: Number(st.mode) & 0o777, nlink: Number(st.nlink) };
}

function fdGeneration(fd: number): GenerationV1 { return fdObservation(fd).generation; }

function pathGeneration(file: string): GenerationV1 | null {
  try {
    const st = fs.lstatSync(file, { bigint: true } as any);
    if (!st.isFile() || st.isSymbolicLink()) return null;
    return generationFromStat(st);
  } catch (error) { void error; return null; }
}

function openRegularReadV1(file: string): number {
  const flags = fs.constants.O_RDONLY | ((fs.constants as any).O_NOFOLLOW || 0);
  try { return fs.openSync(file, flags); }
  catch (err: any) {
    if (err?.code === "ENOENT") fail("MISSING_FILE", file);
    fail("OPEN_FILE_FAILED", `${file}:${String(err?.code || err)}`);
  }
}

function exactGenerationSizeV1(generation: GenerationV1, code: string, file: string): number {
  const size = BigInt(generation.size);
  if (size < 0n || size > BigInt(Number.MAX_SAFE_INTEGER)) fail(code, `${file}:${generation.size}`);
  return Number(size);
}

function readAdmittedGenerationV1(
  fd: number,
  expectedBytes: number,
  shortCode: string,
  growthCode: string,
  file: string,
  onChunk: (chunk: Buffer) => void,
): number {
  if (!Number.isSafeInteger(expectedBytes) || expectedBytes < 0) fail(shortCode, `${file}:${expectedBytes}`);
  const buf = Buffer.allocUnsafe(READ_CHUNK);
  let bytes = 0;
  while (bytes < expectedBytes) {
    const limit = Math.min(buf.length, expectedBytes - bytes);
    const n = fs.readSync(fd, buf, 0, limit, null);
    if (n <= 0) fail(shortCode, `${file}:${bytes}:${expectedBytes}`);
    const chunk = Buffer.from(buf.subarray(0, n));
    bytes += n;
    onChunk(chunk);
  }
  const sentinel = Buffer.allocUnsafe(1);
  if (fs.readSync(fd, sentinel, 0, 1, null) > 0) fail(growthCode, `${file}:${expectedBytes}`);
  return bytes;
}

function readExactGenerationBufferV1(
  file: string,
  maximumBytes: number,
  tooLargeCode: string,
  shortCode: string,
  growthCode: string,
  expectedNlink?: number,
): Buffer {
  const fd = openRegularReadV1(file);
  try {
    const beforeObservation = fdObservation(fd), before = beforeObservation.generation, p0 = pathGeneration(file);
    if (!p0 || !sameGeneration(before, p0)) fail("UNSTABLE_FILE_BEFORE_READ", file);
    if (expectedNlink !== undefined && beforeObservation.nlink !== expectedNlink) {
      fail("READ_LINK_COUNT_MISMATCH", `${file}:${beforeObservation.nlink}:${expectedNlink}`);
    }
    const expectedBytes = exactGenerationSizeV1(before, tooLargeCode, file);
    if (expectedBytes > maximumBytes) fail(tooLargeCode, `${file}:${expectedBytes}:${maximumBytes}`);
    const chunks: Buffer[] = [];
    readAdmittedGenerationV1(fd, expectedBytes, shortCode, growthCode, file, chunk => chunks.push(chunk));
    const afterObservation = fdObservation(fd), after = afterObservation.generation, p1 = pathGeneration(file);
    if (!sameGeneration(before, after) || !p1 || !sameGeneration(after, p1)) fail("UNSTABLE_FILE_DURING_READ", file);
    if (expectedNlink !== undefined && afterObservation.nlink !== expectedNlink) {
      fail("READ_LINK_COUNT_MISMATCH", `${file}:${afterObservation.nlink}:${expectedNlink}`);
    }
    return Buffer.concat(chunks, expectedBytes);
  } finally { fs.closeSync(fd); }
}

function writeDurableNew(
  file: string,
  body: Buffer,
  mode: number,
  retainedAuthority?: DirectoryAuthorityV1,
): GenerationV1 {
  ensureDir(path.dirname(file));
  const authority = retainedAuthority ?? openDirectoryAuthorityV1(path.dirname(file));
  if (path.resolve(path.dirname(file)) !== authority.publicPath) fail("WRITE_PARENT_AUTHORITY_MISMATCH", file);
  const stableFile = path.join(authority.stablePath, path.basename(file));
  const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | ((fs.constants as any).O_NOFOLLOW || 0);
  let fd = -1;
  let ok = false;
  let created: GenerationV1 | null = null;
  try {
    fd = fs.openSync(stableFile, flags, mode);
    created = fdGeneration(fd);
    let off = 0;
    while (off < body.length) {
      const n = fs.writeSync(fd, body, off, body.length - off, null);
      if (n <= 0) fail("SHORT_WRITE", file);
      off += n;
    }
    fs.fchmodSync(fd, mode);
    fs.fsyncSync(fd);
    const observed = fdObservation(fd), fdGen = observed.generation;
    if (observed.mode !== mode) fail("WRITE_MODE_MISMATCH", `${file}:${observed.mode.toString(8)}:${mode.toString(8)}`);
    const pathGen = pathGeneration(stableFile);
    if (!pathGen || !sameGeneration(fdGen, pathGen)) fail("WRITE_PATH_GENERATION_MISMATCH", file);
    fs.fsyncSync(authority.fd);
    assertDirectoryAuthorityV1(authority);
    created = fdGen;
    ok = true;
  } finally {
    if (fd >= 0) fs.closeSync(fd);
    // Failure cleanup intentionally leaves the exclusively created generation
    // in place. Node has no conditional unlink primitive; deleting by pathname
    // after losing fd authority could remove a substituted foreign generation.
    if (!ok) { try { fs.fsyncSync(authority.fd); } catch (error) { void error; } }
    if (!retainedAuthority) fs.closeSync(authority.fd);
  }
  if (!created) fail("WRITE_GENERATION_UNAVAILABLE", file);
  return created;
}

function segmentName(id: number): string {
  if (!Number.isSafeInteger(id) || id < 0) fail("INVALID_SEGMENT_ID", String(id));
  return `${String(id).padStart(NAME_WIDTH, "0")}.jsonl`;
}

function segmentRel(id: number): string { return `${SEGMENTS}/${segmentName(id)}`; }
function segmentPath(root: string, id: number): string { return inside(root, path.join(root, SEGMENTS, segmentName(id))); }

function validateRecord(record: Buffer, max: number, validateJson: boolean, index: number): void {
  if (!record.length || record[record.length - 1] !== 0x0a) fail("UNTERMINATED_RECORD", `record=${index}`);
  const payload = record.length - 1;
  if (payload <= 0) fail("EMPTY_RECORD", `record=${index}`);
  if (payload > max) fail("RECORD_TOO_LARGE", `record=${index}:bytes=${payload}:max=${max}`);
  if (record.subarray(0, payload).includes(0x0a)) fail("INTERNAL_NEWLINE", `record=${index}`);
  if (validateJson) {
    let decoded: string;
    try { decoded = FATAL_UTF8_DECODER.decode(record.subarray(0, payload)); }
    catch { fail("INVALID_UTF8", `record=${index}`); }
    try { JSON.parse(decoded.replace(/\r$/, "")); }
    catch { fail("INVALID_JSON", `record=${index}`); }
  }
}

function sealedRoot(segments: SegmentedJsonlSegmentV1[]): string {
  return sha256(JSON.stringify(segments.map(s => ({
    id: s.id, bytes: s.bytes, records: s.records,
    first_record_index: s.first_record_index, last_record_index: s.last_record_index, sha256: s.sha256,
  }))));
}

function parseManifest(value: unknown): SegmentedJsonlManifestV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("INVALID_MANIFEST", "not-object");
  const m = value as any;
  requireExactKeys(m, ["v","format","generation","segment_target_bytes","max_record_bytes","total_bytes","total_records","sealed_bytes","sealed_records","sealed_root_sha256","sealed_segments","active"], "INVALID_MANIFEST_KEYS", "manifest");
  if (m.v !== 1 || m.format !== VOID_SEGMENTED_JSONL_V1) fail("INVALID_MANIFEST_VERSION", `${String(m.v)}:${String(m.format)}`);
  const ints = ["generation","segment_target_bytes","max_record_bytes","total_bytes","total_records","sealed_bytes","sealed_records"];
  for (const k of ints) if (!Number.isSafeInteger(m[k]) || m[k] < 0) fail("INVALID_MANIFEST_INTEGER", k);
  if (
    m.generation <= 0 ||
    m.segment_target_bytes < 1024 ||
    m.segment_target_bytes > VOID_SEGMENTED_JSONL_MAX_TARGET_BYTES_V1 ||
    m.max_record_bytes <= 0 ||
    m.max_record_bytes > VOID_SEGMENTED_JSONL_MAX_RECORD_BYTES_V1 ||
    m.max_record_bytes + 1 > m.segment_target_bytes
  ) fail("INVALID_MANIFEST_RANGE", "limits");
  if (!isHex64(m.sealed_root_sha256) || !Array.isArray(m.sealed_segments)) fail("INVALID_MANIFEST_SEALED", "shape");
  if (m.sealed_segments.length > VOID_SEGMENTED_JSONL_MAX_SEALED_SEGMENTS_V1) {
    fail("MANIFEST_SEGMENT_COUNT_EXCEEDS_BOUND", `${m.sealed_segments.length}:${VOID_SEGMENTED_JSONL_MAX_SEALED_SEGMENTS_V1}`);
  }
  const segments: SegmentedJsonlSegmentV1[] = m.sealed_segments.map((s: any, i: number) => {
    if (!s || typeof s !== "object" || Array.isArray(s) || s.id !== i || s.file !== segmentRel(i)) fail("INVALID_SEGMENT", `index=${i}`);
    requireExactKeys(s, ["id","file","bytes","records","first_record_index","last_record_index","sha256"], "INVALID_SEGMENT_KEYS", `index=${i}`);
    for (const k of ["id","bytes","records","first_record_index","last_record_index"]) if (!Number.isSafeInteger(s[k]) || s[k] < 0) fail("INVALID_SEGMENT_INTEGER", `${i}:${k}`);
    if (s.bytes <= 0 || s.bytes > m.segment_target_bytes || s.records <= 0 || s.last_record_index - s.first_record_index + 1 !== s.records || !isHex64(s.sha256)) fail("INVALID_SEGMENT_RANGE", String(i));
    return { id:s.id, file:s.file, bytes:s.bytes, records:s.records, first_record_index:s.first_record_index, last_record_index:s.last_record_index, sha256:s.sha256 };
  });
  const a = m.active;
  if (!a || typeof a !== "object" || Array.isArray(a) || a.file !== ACTIVE) fail("INVALID_ACTIVE", "shape");
  requireExactKeys(a, ["file","bytes","records","first_record_index","last_record_index","sha256"], "INVALID_ACTIVE_KEYS", "active");
  for (const k of ["bytes","records","first_record_index"]) if (!Number.isSafeInteger(a[k]) || a[k] < 0) fail("INVALID_ACTIVE_INTEGER", k);
  if (a.last_record_index !== null && (!Number.isSafeInteger(a.last_record_index) || a.last_record_index < 0)) fail("INVALID_ACTIVE_LAST_INDEX", String(a.last_record_index));
  if (!isHex64(a.sha256) || a.bytes > m.segment_target_bytes || (a.records === 0) !== (a.last_record_index === null)) fail("INVALID_ACTIVE_RANGE", "empty-last-or-bytes");
  if (a.records > 0 && a.last_record_index - a.first_record_index + 1 !== a.records) fail("INVALID_ACTIVE_RANGE", "count");
  const active: SegmentedJsonlActiveV1 = { file:ACTIVE, bytes:a.bytes, records:a.records, first_record_index:a.first_record_index, last_record_index:a.last_record_index, sha256:a.sha256 };
  const manifest: SegmentedJsonlManifestV1 = {
    v: 1, format: VOID_SEGMENTED_JSONL_V1, generation: m.generation,
    segment_target_bytes: m.segment_target_bytes, max_record_bytes: m.max_record_bytes,
    total_bytes: m.total_bytes, total_records: m.total_records,
    sealed_bytes: m.sealed_bytes, sealed_records: m.sealed_records,
    sealed_root_sha256: m.sealed_root_sha256, sealed_segments: segments, active,
  };
  if (sealedRoot(segments) !== manifest.sealed_root_sha256) fail("SEALED_ROOT_MISMATCH", manifest.sealed_root_sha256);
  const sb = segments.reduce((n,s)=>n+s.bytes,0), sr = segments.reduce((n,s)=>n+s.records,0);
  if (sb !== manifest.sealed_bytes || sr !== manifest.sealed_records || manifest.total_bytes !== sb + active.bytes || manifest.total_records !== sr + active.records) fail("TOTAL_MISMATCH", "bytes-or-records");
  let next = 0;
  for (const s of segments) { if (s.first_record_index !== next) fail("SEGMENT_RECORD_GAP", String(s.id)); next = s.last_record_index + 1; }
  if (active.first_record_index !== next || next + active.records !== manifest.total_records) fail("ACTIVE_RECORD_GAP", String(active.first_record_index));
  return manifest;
}

function serializeParsedSegmentedJsonlManifestV1(manifest: SegmentedJsonlManifestV1): Buffer {
  const body = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  if (body.length > VOID_SEGMENTED_JSONL_MAX_MANIFEST_BYTES_V1) {
    fail("MANIFEST_TOO_LARGE", `serialized=${body.length}:max=${VOID_SEGMENTED_JSONL_MAX_MANIFEST_BYTES_V1}`);
  }
  return body;
}

function admitDirectManifestV1(manifestInput: unknown): SegmentedJsonlManifestV1 {
  const manifest = parseManifest(manifestInput);
  serializeParsedSegmentedJsonlManifestV1(manifest);
  return manifest;
}

export function serializeSegmentedJsonlManifestV1(manifestInput: unknown): Buffer {
  return serializeParsedSegmentedJsonlManifestV1(parseManifest(manifestInput));
}

function atomicManifest(
  root: string,
  manifest: SegmentedJsonlManifestV1,
  retainedAuthority?: DirectoryAuthorityV1,
): void {
  const target = path.join(root, MANIFEST);
  const authority = retainedAuthority ?? openDirectoryAuthorityV1(root);
  try {
    let created: GenerationV1;
    try {
      created = writeDurableNew(target, serializeSegmentedJsonlManifestV1(manifest), 0o600, authority);
    } catch (error: any) {
      if (error?.code === "EEXIST") fail("MANIFEST_EXISTS_AT_COMMIT", target);
      throw error;
    }
    const stableTarget = path.join(authority.stablePath, MANIFEST);
    const fd = openRegularReadV1(stableTarget);
    try {
      const observed = fdObservation(fd), visible = pathGeneration(stableTarget);
      if (!visible || !sameGeneration(created, observed.generation) || !sameGeneration(observed.generation, visible)) {
        fail("MANIFEST_PUBLICATION_GENERATION_MISMATCH", target);
      }
      if (observed.nlink !== 1) fail("MANIFEST_PUBLICATION_LINK_COUNT_MISMATCH", `${target}:${observed.nlink}`);
    } finally { fs.closeSync(fd); }
    assertDirectoryAuthorityV1(authority);
  } finally { if (!retainedAuthority) fs.closeSync(authority.fd); }
}

function scanFile(file: string, expectedBytes: number, expectedRecords: number, maxRecord: number, validateJson: boolean, expectedMode: number): { bytes:number; records:number; sha256:string } {
  const fd = openRegularReadV1(file);
  try {
    const beforeObservation = fdObservation(fd), before = beforeObservation.generation, p0 = pathGeneration(file);
    if (!p0 || !sameGeneration(before,p0)) fail("UNSTABLE_FILE_BEFORE_SCAN", file);
    if (BigInt(before.size) !== BigInt(expectedBytes)) fail("FILE_SIZE_MISMATCH", `${file}:${before.size}:${expectedBytes}`);
    if (beforeObservation.mode !== expectedMode) fail("FILE_MODE_MISMATCH", `${file}:${beforeObservation.mode.toString(8)}:${expectedMode.toString(8)}`);
    const hash = crypto.createHash("sha256");
    let carry = Buffer.alloc(0), bytes = 0, records = 0;
    bytes = readAdmittedGenerationV1(fd, expectedBytes, "FILE_SHORT_READ", "FILE_GREW_DURING_SCAN", file, (chunk) => {
      hash.update(chunk);
      const data = carry.length ? Buffer.concat([carry,chunk]) : chunk; let from = 0;
      for (let i=0;i<data.length;i++) if (data[i] === 0x0a) { const rec = data.subarray(from,i+1); validateRecord(rec,maxRecord,validateJson,records); records++; from=i+1; }
      carry = Buffer.from(data.subarray(from)); if (carry.length > maxRecord) fail("RECORD_TOO_LARGE", `${file}:partial=${carry.length}`);
    });
    if (carry.length) fail("UNTERMINATED_FILE", file);
    if (bytes !== expectedBytes || records !== expectedRecords) fail("FILE_RECORD_MISMATCH", `${file}:bytes=${bytes}/${expectedBytes}:records=${records}/${expectedRecords}`);
    const afterObservation = fdObservation(fd), after = afterObservation.generation, p1 = pathGeneration(file);
    if (!sameGeneration(before,after) || !p1 || !sameGeneration(after,p1)) fail("UNSTABLE_FILE_DURING_SCAN", file);
    if (afterObservation.mode !== expectedMode) fail("FILE_MODE_MISMATCH", `${file}:${afterObservation.mode.toString(8)}:${expectedMode.toString(8)}`);
    return { bytes, records, sha256:hash.digest("hex") };
  } finally { fs.closeSync(fd); }
}

function readSegmentedJsonlManifestFromAuthorityV1(root: DirectoryAuthorityV1): SegmentedJsonlManifestV1 {
  assertDirectoryAuthorityV1(root);
  const file = path.join(root.stablePath, MANIFEST);
  const body = readExactGenerationBufferV1(file, VOID_SEGMENTED_JSONL_MAX_MANIFEST_BYTES_V1, "MANIFEST_TOO_LARGE", "MANIFEST_SHORT_READ", "MANIFEST_GREW_DURING_READ", 1);
  assertDirectoryAuthorityV1(root);
  let decoded: string;
  try { decoded = FATAL_UTF8_DECODER.decode(body); }
  catch { fail("INVALID_MANIFEST_UTF8", root.publicPath); }
  try { return parseManifest(JSON.parse(decoded)); }
  catch (err) { if (err instanceof Error && err.message.startsWith(VOID_SEGMENTED_JSONL_V1)) throw err; fail("INVALID_MANIFEST_JSON", root.publicPath); }
}

export function readSegmentedJsonlManifestV1(rootInput: string): SegmentedJsonlManifestV1 {
  const rootPathValue = rootPath(rootInput), root = openDirectoryAuthorityV1(rootPathValue);
  try { return readSegmentedJsonlManifestFromAuthorityV1(root); }
  finally { fs.closeSync(root.fd); }
}

function verifySegmentedJsonlWithAuthoritiesV1(
  root: DirectoryAuthorityV1,
  segments: DirectoryAuthorityV1,
  options: {validateJson?:boolean} = {},
) {
  assertDirectoryAuthorityV1(root);
  assertDirectoryAuthorityV1(segments);
  const m = readSegmentedJsonlManifestFromAuthorityV1(root), validateJson = options.validateJson !== false;
  let bytes=0, records=0;
  for (const s of m.sealed_segments) {
    const file = path.join(segments.stablePath, segmentName(s.id));
    const got = scanFile(file,s.bytes,s.records,m.max_record_bytes,validateJson,0o400);
    if (got.sha256 !== s.sha256) fail("SEGMENT_HASH_MISMATCH", `id=${s.id}:expected=${s.sha256}:actual=${got.sha256}`);
    bytes += got.bytes; records += got.records;
  }
  const a = scanFile(path.join(root.stablePath,ACTIVE),m.active.bytes,m.active.records,m.max_record_bytes,validateJson,0o600);
  if (a.sha256 !== m.active.sha256) fail("ACTIVE_HASH_MISMATCH", `expected=${m.active.sha256}:actual=${a.sha256}`);
  bytes += a.bytes; records += a.records;
  if (bytes !== m.total_bytes || records !== m.total_records) fail("VERIFY_TOTAL_MISMATCH", `${bytes}:${records}`);
  assertDirectoryAuthorityV1(segments);
  assertDirectoryAuthorityV1(root);
  return { manifest:m, sealed_segments_verified:m.sealed_segments.length, total_bytes_verified:bytes, total_records_verified:records };
}

export function verifySegmentedJsonlV1(rootInput: string, options: {validateJson?:boolean} = {}) {
  const rootPathValue = rootPath(rootInput), root = openDirectoryAuthorityV1(rootPathValue);
  let segments: DirectoryAuthorityV1 | null = null;
  try {
    segments = openDirectoryChildAuthorityV1(root, SEGMENTS, path.join(rootPathValue, SEGMENTS));
    return verifySegmentedJsonlWithAuthoritiesV1(root, segments, options);
  } finally {
    if (segments) fs.closeSync(segments.fd);
    fs.closeSync(root.fd);
  }
}

function writeSealed(root:string,id:number,parts:Buffer[],first:number,records:number,authority?:DirectoryAuthorityV1): SegmentedJsonlSegmentV1 {
  if (records <= 0) fail("EMPTY_SEAL", `id=${id}`);
  const body=Buffer.concat(parts), file=segmentPath(root,id);
  writeDurableNew(file,body,0o400,authority);
  return { id, file:segmentRel(id), bytes:body.length, records, first_record_index:first, last_record_index:first+records-1, sha256:sha256(body) };
}

export function buildSegmentedJsonlV1FromFile(sourceInput:string,destinationInput:string,options:BuildOptionsV1={}): SegmentedJsonlManifestV1 {
  const source=path.resolve(String(sourceInput||"")); regularStat(source);
  const root=rootPath(destinationInput);
  const target=exactSafeInteger(options.segmentTargetBytes,VOID_SEGMENTED_JSONL_DEFAULT_TARGET_BYTES_V1,1024,VOID_SEGMENTED_JSONL_MAX_TARGET_BYTES_V1,"INVALID_SEGMENT_TARGET");
  const max=exactSafeInteger(options.maxRecordBytes,VOID_SEGMENTED_JSONL_DEFAULT_MAX_RECORD_BYTES_V1,1,VOID_SEGMENTED_JSONL_MAX_RECORD_BYTES_V1,"INVALID_MAX_RECORD");
  const sealedLimit=exactSafeInteger(options.maxSealedSegments,VOID_SEGMENTED_JSONL_MAX_SEALED_SEGMENTS_V1,0,VOID_SEGMENTED_JSONL_MAX_SEALED_SEGMENTS_V1,"INVALID_MAX_SEALED_SEGMENTS");
  const generation=exactSafeInteger(options.generation,1,1,Number.MAX_SAFE_INTEGER,"INVALID_GENERATION"), validateJson=options.validateJson !== false;
  if(max + 1 > target) fail("INVALID_MAX_RECORD",String(max));
  if (fs.existsSync(root)) {
    const st=fs.lstatSync(root);
    if(!st.isDirectory()||st.isSymbolicLink()) fail("DESTINATION_NOT_DIRECTORY",root);
  } else { createDirectoryNewV1(root); }
  const rootAuthority = openDirectoryAuthorityV1(root);
  let segmentAuthority: DirectoryAuthorityV1 | null = null;
  try {
  if(fs.readdirSync(rootAuthority.stablePath).length) fail("DESTINATION_NOT_EMPTY",root);
  assertDirectoryAuthorityV1(rootAuthority);
  segmentAuthority = createDirectoryChildV1(rootAuthority, SEGMENTS, path.join(root,SEGMENTS));
  const flags=fs.constants.O_RDONLY|((fs.constants as any).O_NOFOLLOW||0), fd=fs.openSync(source,flags);
  const before=fdGeneration(fd), p0=pathGeneration(source); if(!p0||!sameGeneration(before,p0)){fs.closeSync(fd);fail("SOURCE_GENERATION_UNSTABLE_BEFORE_BUILD",source);}
  const admittedSourceBytes=exactGenerationSizeV1(before,"SOURCE_SIZE_UNREPRESENTABLE",source);
  const sealed:SegmentedJsonlSegmentV1[]=[]; let parts:Buffer[]=[]; let partBytes=0, partRecords=0, first=0, global=0, carry=Buffer.alloc(0);
  const flush=()=>{
    if(!partRecords)return;
    if(sealed.length>=sealedLimit) fail("BUILDER_SEGMENT_COUNT_EXCEEDS_BOUND",`attempted=${sealed.length+1}:limit=${sealedLimit}:repository_max=${VOID_SEGMENTED_JSONL_MAX_SEALED_SEGMENTS_V1}`);
    sealed.push(writeSealed(root,sealed.length,parts,first,partRecords,segmentAuthority!));
    first=global; parts=[]; partBytes=0; partRecords=0;
  };
  try {
    readAdmittedGenerationV1(fd,admittedSourceBytes,"SOURCE_SHORT_READ","SOURCE_GREW_DURING_BUILD",source,(chunk)=>{ const data=carry.length?Buffer.concat([carry,chunk]):chunk; let from=0;
      for(let i=0;i<data.length;i++) if(data[i]===0x0a){ const rec=Buffer.from(data.subarray(from,i+1)); validateRecord(rec,max,validateJson,global); if(rec.length>target) fail("RECORD_EXCEEDS_SEGMENT_TARGET",`record=${global}:bytes=${rec.length}:target=${target}`); if(partBytes>0&&partBytes+rec.length>target) flush(); parts.push(rec); partBytes+=rec.length; partRecords++; global++; from=i+1; }
      carry=Buffer.from(data.subarray(from)); if(carry.length>max) fail("RECORD_TOO_LARGE",`record=${global}:partial=${carry.length}:max=${max}`);
    });
    const after=fdGeneration(fd),p1=pathGeneration(source); if(!sameGeneration(before,after)||!p1||!sameGeneration(after,p1)) fail("SOURCE_GENERATION_CHANGED_DURING_BUILD",source);
  } finally { fs.closeSync(fd); }
  if(carry.length) fail("SOURCE_UNTERMINATED",source);
  const activeBody=Buffer.concat(parts), activePath=inside(root,path.join(root,ACTIVE)); writeDurableNew(activePath,activeBody,0o600,rootAuthority);
  const sealedBytes=sealed.reduce((n,s)=>n+s.bytes,0), sealedRecords=sealed.reduce((n,s)=>n+s.records,0);
  const active:SegmentedJsonlActiveV1={file:ACTIVE,bytes:activeBody.length,records:partRecords,first_record_index:first,last_record_index:partRecords?first+partRecords-1:null,sha256:sha256(activeBody)};
  const manifest:SegmentedJsonlManifestV1={v:1,format:VOID_SEGMENTED_JSONL_V1,generation,segment_target_bytes:target,max_record_bytes:max,total_bytes:sealedBytes+active.bytes,total_records:sealedRecords+active.records,sealed_bytes:sealedBytes,sealed_records:sealedRecords,sealed_root_sha256:sealedRoot(sealed),sealed_segments:sealed,active};
  parseManifest(manifest); atomicManifest(root,manifest,rootAuthority);
  assertDirectoryAuthorityV1(rootAuthority);
  assertDirectoryAuthorityV1(segmentAuthority);
  return manifest;
  } finally {
    if (segmentAuthority) fs.closeSync(segmentAuthority.fd);
    fs.closeSync(rootAuthority.fd);
  }
}

function appendVerifiedGenerationToOutputV1(
  file: string,
  expectedBytes: number,
  expectedSha256: string,
  outputFd: number,
  outputHash: ReturnType<typeof crypto.createHash>,
  outputPath: string,
  expectedMode: number,
): number {
  const inFd=openRegularReadV1(file);
  try {
    const beforeObservation=fdObservation(inFd), before=beforeObservation.generation, p0=pathGeneration(file);
    if(!p0||!sameGeneration(before,p0)) fail("RECONSTRUCT_SOURCE_UNSTABLE_BEFORE_COPY",file);
    if(BigInt(before.size)!==BigInt(expectedBytes)) fail("RECONSTRUCT_SOURCE_SIZE_MISMATCH",`${file}:${before.size}:${expectedBytes}`);
    if(beforeObservation.mode!==expectedMode) fail("RECONSTRUCT_SOURCE_MODE_MISMATCH",`${file}:${beforeObservation.mode.toString(8)}:${expectedMode.toString(8)}`);
    const sourceHash=crypto.createHash("sha256");
    const copied=readAdmittedGenerationV1(inFd,expectedBytes,"RECONSTRUCT_SOURCE_SHORT_READ","RECONSTRUCT_SOURCE_GREW_DURING_COPY",file,(chunk)=>{
      sourceHash.update(chunk); outputHash.update(chunk);
      let off=0; while(off<chunk.length){const w=fs.writeSync(outputFd,chunk,off,chunk.length-off,null);if(w<=0)fail("SHORT_RECONSTRUCT_WRITE",outputPath);off+=w;}
    });
    const afterObservation=fdObservation(inFd), after=afterObservation.generation, p1=pathGeneration(file);
    if(!sameGeneration(before,after)||!p1||!sameGeneration(after,p1)) fail("RECONSTRUCT_SOURCE_UNSTABLE_DURING_COPY",file);
    if(afterObservation.mode!==expectedMode) fail("RECONSTRUCT_SOURCE_MODE_MISMATCH",`${file}:${afterObservation.mode.toString(8)}:${expectedMode.toString(8)}`);
    if(copied!==expectedBytes) fail("RECONSTRUCT_SOURCE_SIZE_MISMATCH",`${file}:${copied}:${expectedBytes}`);
    const actual=sourceHash.digest("hex");
    if(actual!==expectedSha256) fail("RECONSTRUCT_SOURCE_HASH_MISMATCH",`${file}:expected=${expectedSha256}:actual=${actual}`);
    return copied;
  } finally { fs.closeSync(inFd); }
}

export function reconstructSegmentedJsonlV1ToFile(rootInput:string,outputInput:string) {
  const rootPathValue=rootPath(rootInput), out=path.resolve(String(outputInput||""));
  if (!out || out === path.parse(out).root) fail("INVALID_OUTPUT", out || "empty");
  const root=openDirectoryAuthorityV1(rootPathValue);
  let segments:DirectoryAuthorityV1|null=null, outputParent:DirectoryAuthorityV1|null=null, fd=-1;
  try {
    segments=openDirectoryChildAuthorityV1(root,SEGMENTS,path.join(rootPathValue,SEGMENTS));
    const verified=verifySegmentedJsonlWithAuthoritiesV1(root,segments);
    outputParent=openDirectoryAuthorityV1(path.dirname(out));
    const stableOut=path.join(outputParent.stablePath,path.basename(out));
    try {
      fd=fs.openSync(stableOut,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|((fs.constants as any).O_NOFOLLOW||0),0o600);
    } catch (error:any) {
      if(error?.code==="EEXIST") fail("OUTPUT_EXISTS",out);
      throw error;
    }
    const hash=crypto.createHash("sha256"); let bytes=0;
    try{
      for(const s of verified.manifest.sealed_segments) bytes+=appendVerifiedGenerationToOutputV1(path.join(segments.stablePath,segmentName(s.id)),s.bytes,s.sha256,fd,hash,out,0o400);
      bytes+=appendVerifiedGenerationToOutputV1(path.join(root.stablePath,ACTIVE),verified.manifest.active.bytes,verified.manifest.active.sha256,fd,hash,out,0o600);
      fs.fsyncSync(fd);
      fs.fsyncSync(outputParent.fd);
      assertDirectoryAuthorityV1(outputParent);
      assertDirectoryAuthorityV1(segments);
      assertDirectoryAuthorityV1(root);
    }finally{fs.closeSync(fd);fd=-1;}
    if(bytes!==verified.manifest.total_bytes) fail("RECONSTRUCT_SIZE_MISMATCH",`${bytes}:${verified.manifest.total_bytes}`);
    return {bytes,records:verified.manifest.total_records,sha256:hash.digest("hex")};
  } finally {
    if(fd>=0)fs.closeSync(fd);
    if(outputParent)fs.closeSync(outputParent.fd);
    if(segments)fs.closeSync(segments.fd);
    fs.closeSync(root.fd);
  }
}

export function planSegmentReplicationV1(remoteInput:unknown,localInventory:readonly SegmentInventoryV1[]):SegmentReplicationPlanV1 {
  if (!Array.isArray(localInventory)) fail("INVALID_LOCAL_INVENTORY", "not-array");
  if (localInventory.length > VOID_SEGMENTED_JSONL_MAX_SEALED_SEGMENTS_V1) {
    fail("LOCAL_INVENTORY_TOO_LARGE", `${localInventory.length}:${VOID_SEGMENTED_JSONL_MAX_SEALED_SEGMENTS_V1}`);
  }
  const remote=admitDirectManifestV1(remoteInput), local=new Map<number,SegmentInventoryV1>();
  for(const x of localInventory){if(!Number.isSafeInteger(x.id)||x.id<0||!Number.isSafeInteger(x.bytes)||x.bytes<0||!Number.isSafeInteger(x.records)||x.records<0||!isHex64(x.sha256))fail("INVALID_LOCAL_INVENTORY",JSON.stringify(x));if(local.has(x.id))fail("DUPLICATE_LOCAL_SEGMENT",String(x.id));local.set(x.id,x);}
  const missing:SegmentedJsonlSegmentV1[]=[],matching:SegmentedJsonlSegmentV1[]=[],conflicting:SegmentReplicationPlanV1["conflicting"]=[];
  for(const s of remote.sealed_segments){const l=local.get(s.id);if(!l)missing.push(s);else if(l.bytes===s.bytes&&l.records===s.records&&l.sha256===s.sha256)matching.push(s);else conflicting.push({remote:s,local:l});}
  return {missing,matching,conflicting};
}

export function sealedSegmentInventoryV1(manifestInput:unknown):SegmentInventoryV1[]{
  return admitDirectManifestV1(manifestInput).sealed_segments.map(s=>({id:s.id,bytes:s.bytes,records:s.records,sha256:s.sha256}));
}
