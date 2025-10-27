// src/types/p2p.ts

/** Minimal peer record used by the HTTP P2P routes. */
export type PeerInfo = {
  /** Canonical base URL for the peer (e.g., "http://127.0.0.1:4100") */
  url: string;
  /** Last successful /p2p/hello-now timestamp (ms). */
  lastHelloAt?: number;
  /** Whether we currently consider this peer connected/reachable. */
  connected?: boolean;
};

/** Status shape for follower controls/endpoints. */
export type FollowerStatus = {
  running: boolean;
  peer?: string;
  intervalMs?: number;
};

/* -------------------------- tiny type guards -------------------------- */

/** Runtime guard for PeerInfo. */
export function isPeerInfo(x: unknown): x is PeerInfo {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.url !== "string" || o.url.length === 0) return false;
  if (o.lastHelloAt !== undefined && (typeof o.lastHelloAt !== "number" || !Number.isFinite(o.lastHelloAt))) {
    return false;
  }
  if (o.connected !== undefined && typeof o.connected !== "boolean") return false;
  return true;
}

/* ------------------------ normalization helpers ----------------------- */

/**
 * Normalize a peer URL:
 * - Adds "http://" if missing scheme
 * - Strips trailing "/"
 * - Rejects obviously bad inputs
 * Returns null if it can't be normalized.
 */
export function normalizePeerUrl(s: string | URL): string | null {
  try {
    const raw = String(s).trim();
    if (!raw) return null;
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
    const u = new URL(withScheme);
    if (!u.hostname) return null;
    if (!u.port) return null; // we expect explicit port for node APIs
    // canonical: lower-case protocol/host, keep port, strip trailing slash and path/query
    const proto = u.protocol.toLowerCase();
    const host = u.hostname.toLowerCase();
    const origin = `${proto}//${host}:${u.port}`;
    return origin;
  } catch {
    return null;
  }
}

/**
 * Merge partial fields into an existing PeerInfo (immutable).
 * Useful for registries that upsert flags like `connected` and `lastHelloAt`.
 */
export function mergePeerInfo(base: PeerInfo, patch: Partial<PeerInfo>): PeerInfo {
  const out: PeerInfo = {
    url: base.url,
    connected: patch.connected ?? base.connected,
    lastHelloAt: patch.lastHelloAt ?? base.lastHelloAt,
  };
  return out;
}

