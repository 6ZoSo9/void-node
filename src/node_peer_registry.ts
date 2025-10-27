// src/node_peer_registry.ts
import * as fs from "node:fs";
import * as path from "node:path";

export type PeerInfo = {
  id: string;
  http?: string;            // canonicalized: no trailing slash
  p2p?: string;             // "host:port"
  capabilities?: string[];  // de-duped, lowercased
  lastSeen: number;         // ms epoch
};

function uniq<T>(arr: T[] | undefined): T[] | undefined {
  if (!arr) return undefined;
  const s = new Set(arr);
  return [...s];
}
function isPeerLike(x: any): x is Partial<PeerInfo> & { id: string } {
  return x && typeof x.id === "string" && x.id.trim().length > 0;
}
function normHttp(s: any): string | undefined {
  if (typeof s !== "string" || !s.trim()) return undefined;
  // Keep http(s) only; strip trailing slashes for stable equality
  const t = s.trim();
  if (!/^https?:\/\//i.test(t)) return undefined;
  return t.replace(/\/+$/, "");
}
function normP2P(s: any): string | undefined {
  if (typeof s !== "string" || !s.trim()) return undefined;
  // very loose "host:port" check; allow 127.0.0.1:4700, myhost:4700
  const t = s.trim();
  if (!/^[^:\/\s]+:\d{1,5}$/.test(t)) return undefined;
  return t;
}
function normCaps(arr: any): string[] | undefined {
  if (!Array.isArray(arr)) return undefined;
  const out = arr
    .filter((x) => typeof x === "string" && x.trim())
    .map((x) => x.trim().toLowerCase());
  return uniq(out);
}

export class PeerRegistry {
  private file: string;
  private map = new Map<string, PeerInfo>();

  // Debounced persistence to avoid write-amplification under heavy churn
  private saveTimer: NodeJS.Timeout | null = null;
  private readonly SAVE_DEBOUNCE_MS = 200;

  constructor(file = path.join("data", "peers.json")) {
    this.file = file;
    this.load();
  }

  /** Upsert peer info; lastSeen is refreshed to now unless explicitly provided. */
  upsert(p: Partial<PeerInfo> & { id: string }): PeerInfo {
    const id = String(p.id).trim();
    if (!id) throw new Error("PeerRegistry.upsert: missing id");

    const prev: PeerInfo | undefined = this.map.get(id);

    // Normalize inputs
    const http = p.http !== undefined ? normHttp(p.http) : prev?.http;
    const p2p  = p.p2p  !== undefined ? normP2P(p.p2p)   : prev?.p2p;
    const mergedCaps = uniq([...(prev?.capabilities ?? []), ...(normCaps(p.capabilities) ?? [])]);

    const merged: PeerInfo = {
      id,
      http,
      p2p,
      capabilities: mergedCaps,
      lastSeen: typeof p.lastSeen === "number" && Number.isFinite(p.lastSeen)
        ? p.lastSeen
        : Date.now(),
    };

    this.map.set(id, merged);
    this.scheduleSave();
    return merged;
  }

  /** Bulk upsert (best-effort). */
  upsertMany(list: Array<Partial<PeerInfo> & { id: string }>): { ok: true; upserted: number } {
    let n = 0;
    for (const p of list || []) {
      try { this.upsert(p); n++; } catch { /* skip */ }
    }
    this.scheduleSave();
    return { ok: true, upserted: n };
  }

  /** Update only the lastSeen timestamp for an existing peer. */
  touch(id: string): void {
    const p = this.map.get(id);
    if (!p) return;
    p.lastSeen = Date.now();
    this.scheduleSave();
  }

  /** Specific field “mark” helpers (idempotent). */
  markHttp(id: string, httpBase: string) {
    const p = this.map.get(id) ?? { id, lastSeen: Date.now() } as PeerInfo;
    const http = normHttp(httpBase);
    if (http) p.http = http;
    p.lastSeen = Date.now();
    this.map.set(id, p);
    this.scheduleSave();
  }
  markP2p(id: string, addr: string) {
    const p = this.map.get(id) ?? { id, lastSeen: Date.now() } as PeerInfo;
    const p2p = normP2P(addr);
    if (p2p) p.p2p = p2p;
    p.lastSeen = Date.now();
    this.map.set(id, p);
    this.scheduleSave();
  }
  addCapabilities(id: string, caps: string[]) {
    const p = this.map.get(id) ?? { id, lastSeen: Date.now() } as PeerInfo;
    const add = normCaps(caps) ?? [];
    p.capabilities = uniq([...(p.capabilities ?? []), ...add]);
    p.lastSeen = Date.now();
    this.map.set(id, p);
    this.scheduleSave();
  }

  get(id: string): PeerInfo | undefined { return this.map.get(id); }
  has(id: string): boolean { return this.map.has(id); }

  all(): PeerInfo[] {
    return [...this.map.values()].sort((a, b) => b.lastSeen - a.lastSeen);
  }

  count(): number { return this.map.size; }

  /** Filter by capability (case-insensitive). */
  withCapability(cap: string): PeerInfo[] {
    const c = String(cap).toLowerCase();
    return this.all().filter((p) => (p.capabilities ?? []).includes(c));
  }

  /** Lists for convenience. */
  listHttpBases(): string[] {
    const out: string[] = [];
    for (const p of this.map.values()) if (p.http) out.push(p.http);
    return uniq(out) ?? [];
  }
  listP2P(): string[] {
    const out: string[] = [];
    for (const p of this.map.values()) if (p.p2p) out.push(p.p2p);
    return uniq(out) ?? [];
  }

  remove(id: string) {
    const had = this.map.delete(id);
    if (had) this.scheduleSave();
    return { removed: had ? 1 : 0, remaining: this.map.size };
  }

  purgeStale(maxAgeMs: number) {
    const now = Date.now();
    let removed = 0;
    for (const [id, p] of this.map) {
      const age = now - (p.lastSeen || 0);
      if (!Number.isFinite(age) || age > maxAgeMs) {
        this.map.delete(id);
        removed++;
      }
    }
    if (removed) this.scheduleSave();
    return { ok: true, removed, remaining: this.map.size };
  }

  /** ---- persistence ---- */

  private load() {
    try {
      if (!fs.existsSync(this.file)) return;
      const txt = fs.readFileSync(this.file, "utf8").trim();
      if (!txt) return;

      const parsed = JSON.parse(txt);

      // Support both array-of-peers and (legacy) object maps
      const arr: any[] = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object"
          ? Object.values(parsed as Record<string, unknown>)
          : [];

      for (const p of arr) {
        if (!isPeerLike(p)) continue;
        const id = String(p.id).trim();
        const entry: PeerInfo = {
          id,
          http: normHttp((p as any).http),
          p2p:  normP2P((p as any).p2p),
          capabilities: normCaps((p as any).capabilities),
          lastSeen:
            typeof (p as any).lastSeen === "number" && Number.isFinite((p as any).lastSeen)
              ? (p as any).lastSeen
              : Date.now(),
        };
        this.map.set(id, entry);
      }
    } catch {
      // ignore corrupt file; start fresh (no throw to keep node booting)
      this.map.clear();
    }
  }

  private scheduleSave() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.save();
    }, this.SAVE_DEBOUNCE_MS);
    this.saveTimer.unref?.();
  }

  private save() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const out = JSON.stringify(this.all(), null, 2);
      const tmp = this.file + ".tmp";
      fs.writeFileSync(tmp, out);
      fs.renameSync(tmp, this.file); // atomic-ish replace on most platforms
    } catch {
      /* best effort */
    }
  }
}

