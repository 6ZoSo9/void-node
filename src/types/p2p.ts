// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/p2p/p2p.ts
/**
 * Small helpers shared by our P2P surfaces (heuristics, http inference, etc.)
 */

/** Infer http base from a p2p address like 127.0.0.1:4701 -> http://127.0.0.1:4101 */
export function httpBaseFromP2P(addr?: string): string | undefined {
  if (!addr) return;
  const m = addr.match(/^([^:]+):(\d+)$/);
  if (!m) return;
  const host = m[1], port = Number(m[2]);
  if (port >= 4700 && port <= 4799) return `http://${host}:${4100 + (port - 4700)}`;
  return;
}

/** Normalize bootstrap list from env string "a,b,c" */
export function parseBootstrap(s?: string | null): string[] {
  if (!s) return [];
  return String(s)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Quick backoff curve (ms) with caps */
export function nextBackoff(prev: number, min = 500, max = 15000): number {
  const p = Math.max(min, prev || min);
  return Math.min(p * 2, max);
}

