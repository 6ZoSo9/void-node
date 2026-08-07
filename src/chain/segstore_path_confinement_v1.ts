// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as fs from "node:fs";
import * as path from "node:path";

export type VoidSegStorePathKindV1 = "directory" | "regular-file";

export type VoidSegStorePathCheckOptionsV1 = {
  kind?: VoidSegStorePathKindV1;
  allowMissing?: boolean;
};

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

function assertNoSymlinkComponents(absTarget: string): void {
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
      throw confinementError(`symlink path component rejected: ${current}`);
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

  // Reject symlinks in the data-root ancestry as well as beneath it. This keeps
  // a relative or absolute DATA_DIR from silently resolving outside its lexical
  // root through an existing ancestor symlink.
  assertNoSymlinkComponents(rootAbs);
  assertNoSymlinkComponents(targetAbs);

  const stat = lstatMaybe(targetAbs);
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

export function ensureVoidSegStoreDirectoryV1(root: string, dir: string): void {
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
