// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

export type VoidSegStorePathKindV1 = "directory" | "regular-file";

export type VoidSegStorePathCheckOptionsV1 = {
  kind?: VoidSegStorePathKindV1;
  allowMissing?: boolean;
};

type RegisteredProcFdRootV1 = {
  root: string;
  fd: number;
  dev: string;
  ino: string;
};

const registeredProcFdRootsV1 = new Map<
  string,
  RegisteredProcFdRootV1
>();

const VOID_SEGSTORE_CONTENT_SEAL_SCHEMA_V1 =
  "void_segstore_content_seal_v1";
const CONTENT_SEAL_RE_V1 = /^[0-9a-f]{64}$/;
const CONTENT_SEAL_BUFFER_BYTES_V1 = 1024 * 1024;
const CONTENT_AUTHORITY_MAX_FILES_V1 = 4096;
const CONTENT_AUTHORITY_MAX_FILE_BYTES_V1 = 128 * 1024 * 1024;
const VOID_SEGSTORE_INHERITED_CONTENT_AUTHORITY_SCHEMA_V1 =
  "void_segstore_inherited_content_authority_v1" as const;

export type VoidSegStoreInheritedContentFileV1 = Readonly<{
  bytes: number;
  sha256: string;
}>;

export type VoidSegStoreInheritedContentAuthorityV1 = Readonly<{
  schema: typeof VOID_SEGSTORE_INHERITED_CONTENT_AUTHORITY_SCHEMA_V1;
  seal: string;
  files: Readonly<
    Record<string, VoidSegStoreInheritedContentFileV1>
  >;
}>;

type VoidSegStoreContentSealTestHookV1 =
  | ((event: Readonly<{
      phase: "after-file-hash";
      relative_path: string;
    }>) => void)
  | null;

let contentSealTestHookV1: VoidSegStoreContentSealTestHookV1 = null;

export function installVoidSegStoreContentSealTestHookV1(
  hook: Exclude<VoidSegStoreContentSealTestHookV1, null>,
): () => void {
  if (typeof hook !== "function" || contentSealTestHookV1) {
    throw confinementError(
      "content-seal test hook install rejected",
    );
  }
  contentSealTestHookV1 = hook;
  return () => {
    if (contentSealTestHookV1 === hook) {
      contentSealTestHookV1 = null;
    }
  };
}

function sameContentFileStampV1(
  a: fs.BigIntStats,
  b: fs.BigIntStats,
): boolean {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.size === b.size &&
    a.mtimeNs === b.mtimeNs &&
    a.ctimeNs === b.ctimeNs
  );
}

function hashContentFileStableV1(
  rootAbs: string,
  file: string,
): { bytes: string; sha256: string } {
  assertVoidSegStoreRegularFileV1(rootAbs, file, false);
  const fd = fs.openSync(
    file,
    fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW,
  );
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    if (!before.isFile()) {
      throw confinementError(
        `content-seal entry is not a regular file: ${file}`,
      );
    }
    const digest = crypto.createHash("sha256");
    const buffer = Buffer.alloc(CONTENT_SEAL_BUFFER_BYTES_V1);
    let offset = 0n;
    while (offset < before.size) {
      const remaining = before.size - offset;
      const wanted = Number(
        remaining < BigInt(buffer.length)
          ? remaining
          : BigInt(buffer.length),
      );
      const read = fs.readSync(
        fd,
        buffer,
        0,
        wanted,
        Number(offset),
      );
      if (read <= 0) {
        throw confinementError(
          `content-seal short read: ${file}`,
        );
      }
      digest.update(buffer.subarray(0, read));
      offset += BigInt(read);
    }
    const after = fs.fstatSync(fd, { bigint: true });
    if (!sameContentFileStampV1(before, after)) {
      throw confinementError(
        `content-seal file changed during hashing: ${file}`,
      );
    }
    return {
      bytes: String(before.size),
      sha256: digest.digest("hex"),
    };
  } finally {
    fs.closeSync(fd);
  }
}

export function computeVoidSegStoreContentAuthorityV1(
  root: string,
): VoidSegStoreInheritedContentAuthorityV1 {
  const rootAbs = path.resolve(root);
  assertVoidSegStorePathConfinedV1(rootAbs, rootAbs, {
    kind: "directory",
    allowMissing: false,
  });

  const seal = crypto.createHash("sha256");
  seal.update(`${VOID_SEGSTORE_CONTENT_SEAL_SCHEMA_V1}\0`);
  const files: Record<
    string,
    VoidSegStoreInheritedContentFileV1
  > = Object.create(null);
  let fileCount = 0;

  const walk = (dir: string, relativeDir: string): void => {
    assertVoidSegStorePathConfinedV1(rootAbs, dir, {
      kind: "directory",
      allowMissing: false,
    });
    const beforeNames = fs.readdirSync(dir).sort();
    for (const name of beforeNames) {
      const full = path.join(dir, name);
      const relative = relativeDir
        ? `${relativeDir}/${name}`
        : name;
      assertVoidSegStorePathConfinedV1(rootAbs, full, {
        allowMissing: false,
      });
      const st = fs.lstatSync(full, { bigint: true });
      if (st.isSymbolicLink()) {
        throw confinementError(
          `content-seal symlink rejected: ${relative}`,
        );
      }
      if (st.isDirectory()) {
        seal.update(`D\0${relative}\0`);
        walk(full, relative);
        continue;
      }
      if (st.isFile()) {
        if (fileCount >= CONTENT_AUTHORITY_MAX_FILES_V1) {
          throw confinementError(
            "inherited content authority file count exceeds bound",
          );
        }
        const file = hashContentFileStableV1(rootAbs, full);
        const bytes = Number(file.bytes);
        if (
          !Number.isSafeInteger(bytes) ||
          bytes < 0 ||
          bytes > CONTENT_AUTHORITY_MAX_FILE_BYTES_V1
        ) {
          throw confinementError(
            `inherited content authority file exceeds byte bound: ${relative}`,
          );
        }
        files[relative] = Object.freeze({
          bytes,
          sha256: file.sha256,
        });
        fileCount += 1;
        seal.update(
          `F\0${relative}\0${file.bytes}\0${file.sha256}\0`,
        );
        contentSealTestHookV1?.(
          Object.freeze({
            phase: "after-file-hash" as const,
            relative_path: relative,
          }),
        );
        continue;
      }
      throw confinementError(
        `content-seal unsupported entry type: ${relative}`,
      );
    }
    const afterNames = fs.readdirSync(dir).sort();
    if (JSON.stringify(beforeNames) !== JSON.stringify(afterNames)) {
      throw confinementError(
        `content-seal directory changed during hashing: ${dir}`,
      );
    }
  };

  walk(rootAbs, "");
  return Object.freeze({
    schema:
      VOID_SEGSTORE_INHERITED_CONTENT_AUTHORITY_SCHEMA_V1,
    seal: seal.digest("hex"),
    files: Object.freeze(files),
  });
}

export function computeVoidSegStoreContentSealV1(
  root: string,
): string {
  return computeVoidSegStoreContentAuthorityV1(root).seal;
}

function inheritedContentRelativePathV1(
  rootAbs: string,
  fileAbs: string,
): string {
  const relative = path.relative(rootAbs, fileAbs);
  if (
    !relative ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw confinementError(
      `inherited content path escapes root: ${fileAbs}`,
    );
  }
  return relative.split(path.sep).join("/");
}

export function readVoidSegStoreInheritedContentBytesV1(
  root: string,
  file: string,
  authority: VoidSegStoreInheritedContentAuthorityV1 | null,
): Buffer | null {
  if (!authority) return null;
  if (
    authority.schema !==
      VOID_SEGSTORE_INHERITED_CONTENT_AUTHORITY_SCHEMA_V1 ||
    !CONTENT_SEAL_RE_V1.test(authority.seal)
  ) {
    throw confinementError(
      "inherited content authority object is malformed",
    );
  }

  const rootAbs = path.resolve(root);
  const fileAbs = path.resolve(file);
  const relative = inheritedContentRelativePathV1(
    rootAbs,
    fileAbs,
  );
  const expected = authority.files[relative];
  if (!expected) {
    throw confinementError(
      `inherited content authority has no file binding: ${relative}`,
    );
  }

  assertVoidSegStoreRegularFileV1(rootAbs, fileAbs, false);
  const fd = fs.openSync(
    fileAbs,
    fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW,
  );
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    if (!before.isFile()) {
      throw confinementError(
        `inherited content read is not regular: ${relative}`,
      );
    }
    if (before.size !== BigInt(expected.bytes)) {
      throw confinementError(
        `inherited content size mismatch: ${relative}`,
      );
    }

    const bytes = Buffer.alloc(expected.bytes);
    let offset = 0;
    while (offset < bytes.length) {
      const read = fs.readSync(
        fd,
        bytes,
        offset,
        bytes.length - offset,
        offset,
      );
      if (read <= 0) {
        throw confinementError(
          `inherited content short read: ${relative}`,
        );
      }
      offset += read;
    }
    const eof = Buffer.alloc(1);
    if (
      fs.readSync(
        fd,
        eof,
        0,
        1,
        expected.bytes,
      ) !== 0
    ) {
      throw confinementError(
        `inherited content grew during read: ${relative}`,
      );
    }

    const after = fs.fstatSync(fd, { bigint: true });
    if (!sameContentFileStampV1(before, after)) {
      throw confinementError(
        `inherited content generation changed during read: ${relative}`,
      );
    }
    const actualSha = crypto
      .createHash("sha256")
      .update(bytes)
      .digest("hex");
    if (actualSha !== expected.sha256) {
      throw confinementError(
        `inherited content hash mismatch: ${relative}`,
      );
    }
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

export function assertVoidSegStoreInheritedContentSealV1(
  root: string,
): VoidSegStoreInheritedContentAuthorityV1 | null {
  if (
    String(
      process.env.VOID_SEGSTORE_INHERITED_DATA_AUTHORITY_V1 ?? "",
    ).trim() !== "1"
  ) {
    return null;
  }

  const expected = String(
    process.env.VOID_SEGSTORE_INHERITED_DATA_CONTENT_SEAL_V1 ?? "",
  ).trim();
  if (!CONTENT_SEAL_RE_V1.test(expected)) {
    throw confinementError(
      "inherited proc-fd content seal is missing or malformed",
    );
  }

  const rootAbs = path.resolve(root);
  const inherited = inheritedProcFdRootV1(rootAbs);
  if (!inherited) {
    throw confinementError(
      "inherited content seal requires the exact inherited proc-fd root",
    );
  }

  const authority =
    computeVoidSegStoreContentAuthorityV1(rootAbs);
  if (authority.seal !== expected) {
    throw confinementError(
      `inherited proc-fd content seal mismatch expected=${expected} actual=${authority.seal}`,
    );
  }
  return authority;
}

function confinementError(message: string): Error {
  return new Error(`VOID_SEGSTORE_PATH_CONFINEMENT_V1: ${message}`);
}

function lstatMaybe(target: string): fs.Stats | null {
  try {
    return fs.lstatSync(target);
  } catch (error: any) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function procFdRootV1(root: string): { root: string; fd: number } | null {
  const absolute = path.resolve(root);
  const match = /^\/proc\/self\/fd\/([0-9]+)$/.exec(absolute);
  if (!match) return null;
  const fd = Number(match[1]);
  if (!Number.isSafeInteger(fd) || fd < 3) return null;
  return { root: absolute, fd };
}

function inheritedProcFdRootV1(
  rootAbs: string,
): RegisteredProcFdRootV1 | null {
  if (
    String(
      process.env.VOID_SEGSTORE_INHERITED_DATA_AUTHORITY_V1 ?? "",
    ).trim() !== "1"
  ) {
    return null;
  }
  if (process.platform !== "linux") {
    throw confinementError(
      "inherited proc-fd data authority is supported only on Linux",
    );
  }

  const rawFd = String(
    process.env.VOID_SEGSTORE_INHERITED_DATA_FD_V1 ?? "",
  ).trim();
  const expectedDev = String(
    process.env.VOID_SEGSTORE_INHERITED_DATA_DEV_V1 ?? "",
  ).trim();
  const expectedIno = String(
    process.env.VOID_SEGSTORE_INHERITED_DATA_INO_V1 ?? "",
  ).trim();

  if (
    !/^[0-9]+$/.test(rawFd) ||
    !/^(0|[1-9][0-9]*)$/.test(expectedDev) ||
    !/^(0|[1-9][0-9]*)$/.test(expectedIno)
  ) {
    throw confinementError(
      "inherited proc-fd data authority fields are malformed",
    );
  }

  const fd = Number(rawFd);
  if (!Number.isSafeInteger(fd) || fd < 4) {
    throw confinementError(
      "inherited proc-fd data descriptor is invalid",
    );
  }
  const root = `/proc/self/fd/${fd}`;
  if (rootAbs !== root) return null;

  let current: fs.BigIntStats;
  try {
    current = fs.fstatSync(fd, { bigint: true });
  } catch {
    throw confinementError(
      `inherited proc-fd data descriptor is not open: ${root}`,
    );
  }
  if (
    !current.isDirectory() ||
    String(current.dev) !== expectedDev ||
    String(current.ino) !== expectedIno
  ) {
    throw confinementError(
      `inherited proc-fd data identity mismatch: ${root}`,
    );
  }
  if (
    typeof process.getuid === "function" &&
    Number(current.uid) !== process.getuid()
  ) {
    throw confinementError(
      `inherited proc-fd data owner mismatch: ${root}`,
    );
  }
  if ((Number(current.mode) & 0o002) !== 0) {
    throw confinementError(
      `inherited proc-fd data root is world-writable: ${root}`,
    );
  }

  return Object.freeze({
    root,
    fd,
    dev: expectedDev,
    ino: expectedIno,
  });
}

function liveRegisteredProcFdRootV1(
  rootAbs: string,
): RegisteredProcFdRootV1 | null {
  const registered =
    registeredProcFdRootsV1.get(rootAbs) ??
    inheritedProcFdRootV1(rootAbs);
  if (!registered) return null;

  let current: fs.BigIntStats;
  try {
    current = fs.fstatSync(registered.fd, { bigint: true });
  } catch {
    throw confinementError(
      `registered proc-fd root is no longer live: ${rootAbs}`,
    );
  }
  if (
    !current.isDirectory() ||
    String(current.dev) !== registered.dev ||
    String(current.ino) !== registered.ino
  ) {
    throw confinementError(
      `registered proc-fd root identity changed: ${rootAbs}`,
    );
  }
  return registered;
}

export function registerVoidSegStoreProcFdRootV1(
  root: string,
): () => void {
  if (process.platform !== "linux") {
    throw confinementError(
      "proc-fd data roots are supported only on Linux",
    );
  }
  const parsed = procFdRootV1(root);
  if (!parsed) {
    throw confinementError(
      `proc-fd root must be exactly /proc/self/fd/<fd>: ${root}`,
    );
  }

  let st: fs.BigIntStats;
  try {
    st = fs.fstatSync(parsed.fd, { bigint: true });
  } catch {
    throw confinementError(
      `proc-fd root descriptor is not open: ${parsed.root}`,
    );
  }
  if (!st.isDirectory()) {
    throw confinementError(
      `proc-fd root descriptor is not a directory: ${parsed.root}`,
    );
  }
  if (
    typeof process.getuid === "function" &&
    Number(st.uid) !== process.getuid()
  ) {
    throw confinementError(
      `proc-fd root owner mismatch: ${parsed.root}`,
    );
  }
  if ((Number(st.mode) & 0o002) !== 0) {
    throw confinementError(
      `proc-fd root is world-writable: ${parsed.root}`,
    );
  }

  const registration: RegisteredProcFdRootV1 = Object.freeze({
    root: parsed.root,
    fd: parsed.fd,
    dev: String(st.dev),
    ino: String(st.ino),
  });
  if (registeredProcFdRootsV1.has(parsed.root)) {
    throw confinementError(
      `proc-fd root already registered: ${parsed.root}`,
    );
  }
  registeredProcFdRootsV1.set(parsed.root, registration);

  return () => {
    if (registeredProcFdRootsV1.get(parsed.root) === registration) {
      registeredProcFdRootsV1.delete(parsed.root);
    }
  };
}

function assertNoSymlinkComponents(
  absTarget: string,
  registered: RegisteredProcFdRootV1 | null = null,
): void {
  if (registered) {
    const relative = path.relative(registered.root, absTarget);
    if (
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    ) {
      throw confinementError(
        `path escapes registered proc-fd root: ${absTarget}`,
      );
    }

    let current = registered.root;
    for (const part of relative.split(path.sep).filter(Boolean)) {
      current = path.join(current, part);
      const stat = lstatMaybe(current);
      if (!stat) return;
      if (stat.isSymbolicLink()) {
        throw confinementError(
          `symlink path component rejected: ${current}`,
        );
      }
    }
    return;
  }

  const parsed = path.parse(absTarget);
  const parts = absTarget
    .slice(parsed.root.length)
    .split(path.sep)
    .filter(Boolean);

  let current = parsed.root;
  for (const part of parts) {
    current = path.join(current, part);
    const stat = lstatMaybe(current);
    if (!stat) return;
    if (stat.isSymbolicLink()) {
      throw confinementError(
        `symlink path component rejected: ${current}`,
      );
    }
  }
}

export function assertVoidSegStorePathConfinedV1(
  root: string,
  target: string,
  options: VoidSegStorePathCheckOptionsV1 = {},
): string {
  const rootAbs = path.resolve(root);
  const targetAbs = path.resolve(target);
  const relative = path.relative(rootAbs, targetAbs);

  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw confinementError(`path escapes data root: ${targetAbs}`);
  }

  const registered = liveRegisteredProcFdRootV1(rootAbs);
  assertNoSymlinkComponents(rootAbs, registered);
  assertNoSymlinkComponents(targetAbs, registered);

  const stat =
    registered && targetAbs === rootAbs
      ? fs.fstatSync(registered.fd)
      : lstatMaybe(targetAbs);

  if (!stat) {
    if (options.allowMissing === false) {
      throw confinementError(`required path is missing: ${targetAbs}`);
    }
    return targetAbs;
  }

  if (options.kind === "directory" && !stat.isDirectory()) {
    throw confinementError(`expected directory: ${targetAbs}`);
  }
  if (options.kind === "regular-file" && !stat.isFile()) {
    throw confinementError(`expected regular file: ${targetAbs}`);
  }

  return targetAbs;
}

export function assertVoidSegStoreRootV1(root: string): string {
  return assertVoidSegStorePathConfinedV1(root, root, {
    kind: "directory",
    allowMissing: true,
  });
}

export function ensureVoidSegStoreDirectoryV1(
  root: string,
  dir: string,
): void {
  assertVoidSegStorePathConfinedV1(root, dir, {
    kind: "directory",
    allowMissing: true,
  });
  fs.mkdirSync(dir, { recursive: true });
  assertVoidSegStorePathConfinedV1(root, dir, {
    kind: "directory",
    allowMissing: false,
  });
}

export function assertVoidSegStoreRegularFileV1(
  root: string,
  file: string,
  allowMissing = true,
): string {
  return assertVoidSegStorePathConfinedV1(root, file, {
    kind: "regular-file",
    allowMissing,
  });
}
