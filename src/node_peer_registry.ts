// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/node_peer_registry.ts
type Peer = {
  id: string;
  http?: string;
  p2p?: string;
  capabilities?: string[];
  lastSeen: number;
};

export class PeerRegistry {
  private map = new Map<string, Peer>();

  upsert(p: { id: string; http?: string; p2p?: string; capabilities?: string[] }) {
    const now = Date.now();
    const prev = this.map.get(p.id);
    const merged: Peer = {
      id: p.id,
      http: p.http ?? prev?.http,
      p2p: p.p2p ?? prev?.p2p,
      capabilities: Array.isArray(p.capabilities) ? p.capabilities : (prev?.capabilities ?? []),
      lastSeen: now,
    };
    this.map.set(p.id, merged);
    return merged;
  }

  all(): Peer[] {
    return [...this.map.values()].sort((a, b) => (b.lastSeen - a.lastSeen));
  }

  purgeStale(maxAgeMs = 10 * 60_000) {
    const now = Date.now();
    let removed = 0;
    for (const [id, p] of this.map) {
      if (now - p.lastSeen > maxAgeMs) { this.map.delete(id); removed++; }
    }
    return { ok: true, removed, remaining: this.map.size };
  }

  remove(id: string) { const had = this.map.delete(id); return { removed: had ? 1 : 0, remaining: this.map.size }; }
  count() { return this.map.size; }
  size() { return this.map.size; }
}

