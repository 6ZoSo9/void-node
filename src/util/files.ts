// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/util/files.ts
import * as fs from "node:fs";
import * as path from "node:path";

export function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function readJsonIfExists<T = any>(file: string): T | null {
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

export function writeJsonAtomic(file: string, obj: any) {
  const dir = path.dirname(file);
  ensureDir(dir);
  const tmp = file + ".tmp-" + Date.now();
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, file);
}

/** Generic atomic write for Buffer/strings. */
export function writeFileAtomic(file: string, data: Buffer | string) {
  const dir = path.dirname(file);
  ensureDir(dir);
  const tmp = file + ".tmp-" + Date.now();
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}

