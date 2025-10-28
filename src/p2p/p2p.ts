// src/p2p/p2p.ts (temporary shim so type-checks pass cleanly)
export type PeerAddr = string;
export function normalizePeerAddr(a: string): PeerAddr {
  return String(a || "").trim();
}
