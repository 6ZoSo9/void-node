// src/util/env.ts
// Lightweight env bridge with sane defaults (additive; never throws).

// Try to load .env if dotenv is available; ignore if not.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("dotenv").config();
} catch { /* optional */ }

export type EnvConfig = {
  DATA_DIR: string;
  HTTP_HOST: string;
  HTTP_PORT: number;
  P2P_HOST: string;
  P2P_PORT: number;
  BOOTSTRAP_ADDRS: string[];
  NODE_KEY_PATH?: string;

  // Optional helpers used by index/node:
  PUBLIC_HTTP_BASE?: string;
  MAX_BLOB_MB?: number;
  ALLOW_EMPTY_BLOCKS?: boolean;
};

function firstEnv(...names: (keyof NodeJS.ProcessEnv | string)[]): string | undefined {
  for (const n of names) {
    const v = process.env[String(n)];
    if (v !== undefined && v !== "") return v;
  }
  return undefined;
}

function parseIntPos(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function parseBool1(v: string | undefined, fallback = false): boolean {
  if (v === undefined) return fallback;
  const s = v.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function parseCsvAddrs(...parts: (string | undefined)[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of parts) {
    if (!s) continue;
    for (const t of s.split(",").map((x) => x.trim()).filter(Boolean)) {
      if (!seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
  }
  return out;
}

export function loadEnv(): EnvConfig {
  // Data dir (support both names)
  const DATA_DIR =
    firstEnv("DATA_DIR", "VOID_DATA_DIR") ?? "data";

  // HTTP host/port (bridge legacy names)
  const HTTP_HOST = firstEnv("HTTP_HOST") ?? "127.0.0.1";
  const HTTP_PORT = parseIntPos(firstEnv("HTTP_PORT", "VOID_HTTP_PORT"), 4100);

  // P2P host/port
  const P2P_HOST = firstEnv("P2P_HOST") ?? "127.0.0.1";
  const P2P_PORT = parseIntPos(firstEnv("P2P_PORT", "VOID_P2P_PORT"), 4700);

  // Bootstrap peers: accept BOOTSTRAP and BOOTSTRAP_ADDRS
  const BOOTSTRAP_ADDRS = parseCsvAddrs(
    firstEnv("BOOTSTRAP_ADDRS"),
    firstEnv("BOOTSTRAP")
  );

  // Node key path: several aliases supported
  const NODE_KEY_PATH =
    firstEnv("VOID_NODE_KEY_A", "NODE_PRIVKEY_PATH", "KEY_FILE") || undefined;

  // Optional extras used by http announcements / uploads
  const PUBLIC_HTTP_BASE = firstEnv("PUBLIC_HTTP_BASE") || undefined;
  const MAX_BLOB_MB = (() => {
    const raw = firstEnv("MAX_BLOB_MB");
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  })();
  const ALLOW_EMPTY_BLOCKS = parseBool1(firstEnv("ALLOW_EMPTY_BLOCKS"));

  return {
    DATA_DIR,
    HTTP_HOST,
    HTTP_PORT,
    P2P_HOST,
    P2P_PORT,
    BOOTSTRAP_ADDRS,
    NODE_KEY_PATH,
    PUBLIC_HTTP_BASE,
    MAX_BLOB_MB,
    ALLOW_EMPTY_BLOCKS,
  };
}

