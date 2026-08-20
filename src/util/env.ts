// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/util/env.ts
import * as path from "node:path";
import * as fs from "node:fs";
import * as dotenv from "dotenv";

let loaded = false;

/** Load `.env` if present, return merged snapshot of process.env. */
export function loadEnv(): NodeJS.ProcessEnv & Record<string, string> {
  if (!loaded) {
    const dot = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(dot)) dotenv.config({ path: dot });
    loaded = true;
  }
  // return a shallow copy so callers don't mutate process.env
  return { ...process.env } as any;
}

/** Helpers consistent with index.ts style */
export function firstEnv(...names: string[]): string | undefined {
  for (const n of names) {
    const v = (process.env as any)[n];
    if (v !== undefined && v !== "") return String(v);
  }
}
export function reqInt(names: string[] | string, label: string): number {
  const arr = Array.isArray(names) ? names : [names];
  const raw = firstEnv(...arr);
  if (raw === undefined) throw new Error(`Missing required env: ${label} (${arr.join(" or ")})`);
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`Invalid integer for ${label}: ${raw}`);
  return n;
}
export function reqStr(names: string[] | string, label: string): string {
  const arr = Array.isArray(names) ? names : [names];
  const v = firstEnv(...arr);
  if (!v) throw new Error(`Missing required env: ${label} (${arr.join(" or ")})`);
  return v;
}

