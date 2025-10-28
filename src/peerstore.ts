// src/peerstore.ts
// Simple diskless peerstore you can swap later for on-disk.
// Not wired yet; safe to import where needed.
export type PeerInfo = {
  id: string;
  http?: string;
  p2p?: string;
  proto?: number;
  agent?: string;
  lastSeen: number;
};
export class PeerStore {
  private m = new Map<string, PeerInfo>();
  upsert(p: Omit<PeerInfo, "lastSeen">) {
    const now = Date.now();
    const prev = this.m.get(p.id);
    const next: PeerInfo = { lastSeen: now, ...prev, ...p };
    this.m.set(p.id, next);
    return next;
  }
  get(id: string) { return this.m.get(id) || null; }
  all() { return [...this.m.values()].sort((a, b) => b.lastSeen - a.lastSeen); }
  remove(id: string) { return this.m.delete(id); }
  clear() { this.m.clear(); }
}

