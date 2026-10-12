// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/p2p/p2p.ts (temporary shim so type-checks pass cleanly)
export type PeerAddr = string;
export function normalizePeerAddr(a: string): PeerAddr {
  return String(a || "").trim();
}
