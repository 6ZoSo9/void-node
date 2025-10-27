// src/peerstore.ts
import * as fs from "node:fs";
import * as path from "node:path";

export type PeerEntry = {
  /** Normalized "host:port" or "[ipv6]:port" */
  addr: string;
  /** Last time we observed this peer (ms since epoch) */
  lastSeen?: number;
  /** When we added this record (ms since epoch) */
  addedAt?: number;
  /** Dial successes/failures (used for weighting & hygiene) */
  successes?: number;
  failures?: number;
};

export type PeerStoreOpts = {
  /** Where to persist peerstore.json (defaults to ${DATA_DIR}/peers/peerstore.json) */
  filePath?: string;
  /** Autosave debounce in ms (0 disables). Default: 2000ms */
  autosaveMs?: number;
  /** Upper bound on stored peers; oldest are dropped when exceeded. Default: 2000 */
  maxEntries?: number;
};

export class PeerStore {
  private file: string;
  private map = new Map<string, PeerEntry>();
  private dirty = false;
  private saveTimer: NodeJS.Timeout | null = null;
  private autosaveMs: number;
  private maxEntries: number;

  constructor(opts: PeerStoreOpts = {}) {
    const root = process.env.DATA_DIR || "data";
    const dir = path.join(path.resolve(root), "peers");
    this.file = opts.filePath ?? path.join(dir, "peerstore.json");
    this.autosaveMs = typeof opts.autosaveMs === "number" ? Math.max(0, opts.autosaveMs) : 2000;
    this.maxEntries = typeof opts.maxEntries === "number" ? Math.max(100, opts.maxEntries) : 2000;

    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
    } catch {}

    this.load();

    // Optional: best-effort persist on exit
    process.once("beforeExit", () => this.flush());
    process.once("exit", () => this.flush());
    process.once("SIGINT", () => { this.flush(); process.exit(130); });
    process.once("SIGTERM", () => { this.flush(); process.exit(143); });
  }

  /* ----------------------------- Load/Save ----------------------------- */

  private scheduleSave() {
    if (this.autosaveMs <= 0) return;
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.flush();
    }, this.autosaveMs).unref?.();
  }

  private load() {
    try {
      if (!fs.existsSync(this.file)) return;
      const raw = fs.readFileSync(this.file, "utf8").trim();
      if (!raw) return;

      // Back-compat: could be an array of strings (addresses) or PeerEntry[]
      const parsed = JSON.parse(raw);
      const arr: any[] = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object"
        ? (parsed.list ?? parsed.peers ?? [])
        : [];

      for (const item of arr) {
        if (typeof item === "string") {
          this.safeAdd(item);
        } else if (item && typeof item.addr === "string") {
          const norm = PeerStore.normalizeAddr(item.addr);
          if (!norm) continue;
          const e: PeerEntry = {
            addr: norm,
            lastSeen: this.num(item.lastSeen),
            addedAt: this.num(item.addedAt) ?? Date.now(),
            successes: this.num(item.successes, 0),
            failures: this.num(item.failures, 0),
          };
          this.map.set(norm, e);
        }
      }
      this.enforceCap();
    } catch (e) {
      console.warn(`[peerstore] failed to load ${this.file}:`, (e as Error).message);
      // keep empty map on error
    }
  }

  flush() {
    if (!this.dirty) return;
    try {
      const list = this.list(); // sorted by freshness
      const json = JSON.stringify(list, null, 2);
      const tmp = this.file + ".tmp";
      fs.writeFileSync(tmp, json);
      fs.renameSync(tmp, this.file); // atomic-ish replace
      this.dirty = false;
    } catch (e) {
      console.warn(`[peerstore] failed to save ${this.file}:`, (e as Error).message);
    }
  }

  close() {
    this.flush();
  }

  /* ------------------------------ Helpers ------------------------------ */

  private num(v: any, def?: number): number | undefined {
    const n = Number(v);
    if (!Number.isFinite(n)) return def;
    return n;
  }

  /** Accepts "host:port" or "[ipv6]:port" or "host:port,host2:port2" */
  static normalizeAddr(a: string | undefined | null): string | null {
    if (!a) return null;
    const s = String(a).trim();
    if (!s) return null;

    // If a comma-separated list sneaks in, just take the first
    const one = s.split(",")[0].trim();

    // IPv6 form: [::1]:4700
    const ipv6 = one.match(/^\[([^[\]]+)\]:(\d{1,5})$/);
    if (ipv6) {
      const host = ipv6[1];
      const port = Number(ipv6[2]);
      if (PeerStore.validPort(port)) return `[${host}]:${port}`;
      return null;
    }

    // IPv4 / hostname: host:port
    const parts = one.split(":");
    if (parts.length !== 2) return null;
    const host = parts[0].trim();
    const port = Number(parts[1]);
    if (!host || !PeerStore.validPort(port)) return null;
    return `${host}:${port}`;
  }

  private static validPort(p: number): boolean {
    return Number.isInteger(p) && p > 0 && p <= 65535;
  }

  private markDirty() {
    this.dirty = true;
    this.scheduleSave();
  }

  private enforceCap() {
    if (this.map.size <= this.maxEntries) return;
    // Delete oldest first (lowest lastSeen then oldest addedAt)
    const arr = [...this.map.values()].sort((a, b) => {
      const la = a.lastSeen ?? 0, lb = b.lastSeen ?? 0;
      if (la !== lb) return la - lb;
      const aa = a.addedAt ?? 0, ab = b.addedAt ?? 0;
      return aa - ab;
    });
    const toDrop = this.map.size - this.maxEntries;
    for (let i = 0; i < toDrop; i++) this.map.delete(arr[i].addr);
  }

  private safeAdd(addr: string) {
    const norm = PeerStore.normalizeAddr(addr);
    if (!norm) return;
    if (!this.map.has(norm)) {
      this.map.set(norm, { addr: norm, addedAt: Date.now(), successes: 0, failures: 0 });
      this.enforceCap();
      this.markDirty();
    }
  }

  /* ---------------------------- Public API ---------------------------- */

  list(): PeerEntry[] {
    // Freshest first
    return [...this.map.values()].sort((a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0));
  }

  listSortedByFreshness(): PeerEntry[] {
    return this.list();
  }

  size(): number {
    return this.map.size;
  }

  has(addr: string): boolean {
    const norm = PeerStore.normalizeAddr(addr);
    return !!(norm && this.map.has(norm));
  }

  add(addr: string) {
    this.safeAdd(addr);
  }

  addMany(addrs: string[]) {
    for (const a of addrs) this.safeAdd(a);
  }

  remove(addr: string) {
    const norm = PeerStore.normalizeAddr(addr);
    if (!norm) return false;
    const ok = this.map.delete(norm);
    if (ok) this.markDirty();
    return ok;
  }

  clear() {
    if (this.map.size) {
      this.map.clear();
      this.markDirty();
    }
  }

  markSeen(addr: string) {
    const norm = PeerStore.normalizeAddr(addr);
    if (!norm) return;
    const e = this.map.get(norm) ?? { addr: norm, successes: 0, failures: 0, addedAt: Date.now() };
    e.lastSeen = Date.now();
    this.map.set(norm, e);
    this.markDirty();
  }

  markSuccess(addr: string) {
    const norm = PeerStore.normalizeAddr(addr);
    if (!norm) return;
    const e = this.map.get(norm) ?? { addr: norm, successes: 0, failures: 0, addedAt: Date.now() };
    e.successes = (e.successes ?? 0) + 1;
    e.lastSeen = Date.now();
    this.map.set(norm, e);
    this.markDirty();
  }

  markFailure(addr: string) {
    const norm = PeerStore.normalizeAddr(addr);
    if (!norm) return;
    const e = this.map.get(norm) ?? { addr: norm, successes: 0, failures: 0, addedAt: Date.now() };
    e.failures = (e.failures ?? 0) + 1;
    this.map.set(norm, e);
    this.markDirty();
  }

  /**
   * Remove peers not seen for > maxAgeMs OR with extreme failure ratio.
   * Returns counts for observability.
   */
  purgeStale(maxAgeMs: number, failureRatioCutoff = 10) {
    const now = Date.now();
    let removed = 0;
    for (const [addr, p] of this.map) {
      const last = p.lastSeen ?? p.addedAt ?? 0;
      const failures = p.failures ?? 0;
      const successes = p.successes ?? 0;
      const badRatio = successes === 0 ? failures >= failureRatioCutoff : failures / Math.max(1, successes) >= failureRatioCutoff;
      if (now - last > maxAgeMs || badRatio) {
        this.map.delete(addr);
        removed++;
      }
    }
    if (removed) this.markDirty();
    return { ok: true, removed, remaining: this.map.size };
  }

  /**
   * Merge external sources:
   * - string[] treats items as addresses
   * - PeerEntry[] merges metrics if present
   * - PeerStore copies its contents
   */
  merge(from: string[] | PeerEntry[] | PeerStore) {
    if (Array.isArray(from)) {
      for (const it of from) {
        if (typeof it === "string") {
          this.safeAdd(it);
        } else if (it && typeof it.addr === "string") {
          const norm = PeerStore.normalizeAddr(it.addr);
          if (!norm) continue;
          const cur = this.map.get(norm) ?? { addr: norm, successes: 0, failures: 0, addedAt: Date.now() };
          cur.lastSeen = Math.max(cur.lastSeen ?? 0, it.lastSeen ?? 0);
          cur.addedAt = Math.min(cur.addedAt ?? Date.now(), it.addedAt ?? Date.now());
          cur.successes = (cur.successes ?? 0) + (it.successes ?? 0);
          cur.failures = (cur.failures ?? 0) + (it.failures ?? 0);
          this.map.set(norm, cur);
          this.enforceCap();
          this.markDirty();
        }
      }
    } else if (from instanceof PeerStore) {
      this.merge(from.list());
    }
  }

  /** Export as plain array for easy JSON serialization */
  toJSON(): PeerEntry[] {
    return this.list();
  }

  /** Export addresses only (useful for bootstrapping other components) */
  addrs(): string[] {
    return this.list().map((e) => e.addr);
  }

  /**
   * Return up to `n` peers, biased toward fresh & successful entries.
   * If `preferFresh` is true (default), we take freshest first, then sample.
   */
  pick(n = 8, preferFresh = true): string[] {
    const arr = this.list();
    if (arr.length <= n) return arr.map((e) => e.addr);

    if (preferFresh) {
      // Take top K freshest, then randomize order a bit
      const top = arr.slice(0, Math.min(64, arr.length));
      shuffleInPlace(top);
      return top.slice(0, n).map((e) => e.addr);
    }

    // Weighted by (successes+1)/(failures+1)
    const weighted = arr.map((e) => {
      const w = ((e.successes ?? 0) + 1) / ((e.failures ?? 0) + 1);
      return { e, w };
    });
    // roulette wheel
    const out: string[] = [];
    for (let i = 0; i < n && weighted.length; i++) {
      const total = weighted.reduce((s, x) => s + x.w, 0);
      let r = Math.random() * total;
      let idx = 0;
      for (; idx < weighted.length; idx++) {
        r -= weighted[idx].w;
        if (r <= 0) break;
      }
      const pick = weighted.splice(Math.min(idx, weighted.length - 1), 1)[0];
      if (pick) out.push(pick.e.addr);
    }
    return out;
  }
}

/* ------------------------------ Utilities ------------------------------ */

function shuffleInPlace<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
}

