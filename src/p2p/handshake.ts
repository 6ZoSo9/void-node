// src/p2p/handshake.ts
export type StartP2POpts = {
  host?: string;
  port: number;
  bootstrap?: string[];
  nodeId: string;
  getHead: () => number;
  onPeer?: (p: { id: string; host: string; port: number; seenAt: number }) => void;
  log?: (...a: any[]) => void;
};

export type P2PHandle = {
  stop(): void;
  /** Manually trigger an announce tick (useful in tests). */
  tickNow(): void;
  /** Replace the bootstrap set at runtime. */
  updateBootstrap(addrs: string[]): void;
  /** Is the worker running? */
  isRunning(): boolean;
};

function dlog(opts: StartP2POpts, ...a: any[]) {
  try { opts.log?.('[p2p-stub]', ...a); } catch {}
}

function dedupe(arr: string[] | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of arr || []) {
    const t = String(s).trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** Parse common address formats into {host, port}. Supports:
 *  - "host:port"
 *  - "[ipv6]:port"
 *  - "http(s)://host[:port]" (port defaults 80/443)
 */
function parseAddr(s: string): { host: string; port: number } | null {
  const txt = String(s || '').trim();
  if (!txt) return null;

  // URL form
  if (/^https?:\/\//i.test(txt)) {
    try {
      const u = new URL(txt);
      const def = u.protocol === 'https:' ? 443 : 80;
      const port = Number(u.port || def);
      const host = u.hostname;
      if (!host || !Number.isFinite(port) || port <= 0) return null;
      return { host, port };
    } catch {
      return null;
    }
  }

  // [ipv6]:port
  const m6 = /^\[([^[\]]+)\]:(\d+)$/.exec(txt);
  if (m6) {
    const host = m6[1];
    const port = Number(m6[2]);
    if (!Number.isFinite(port) || port <= 0) return null;
    return { host, port };
  }

  // host:port (ipv4 or hostname)
  const i = txt.lastIndexOf(':');
  if (i > 0) {
    const host = txt.slice(0, i);
    const port = Number(txt.slice(i + 1));
    if (!host || !Number.isFinite(port) || port <= 0) return null;
    return { host, port };
  }

  return null;
}

/**
 * Minimal stub P2P:
 * - No sockets; no external deps.
 * - Immediately (and periodically) announces any bootstrap peers via onPeer().
 * - Jittered interval to avoid thundering herd.
 */
export function startP2P(opts: StartP2POpts): P2PHandle {
  const host = opts.host ?? '0.0.0.0';
  const port = Number(opts.port);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`startP2P: invalid port: ${opts.port}`);
  }

  let running = true;
  let timer: NodeJS.Timeout | null = null;

  // normalized bootstrap list (deduped, trimmed)
  let bootstrap = dedupe(opts.bootstrap);

  // last announce time per peer id — informational; we still re-emit every tick
  const lastAnnounced = new Map<string, number>();

  const announceOnce = () => {
    const seenAt = Date.now();
    for (const raw of bootstrap) {
      const ap = parseAddr(raw);
      if (!ap) continue;
      const id = `boot-${ap.host}:${ap.port}`;
      lastAnnounced.set(id, seenAt);
      try {
        opts.onPeer?.({ id, host: ap.host, port: ap.port, seenAt });
      } catch {
        /* ignore listener errors */
      }
    }
  };

  const nextIntervalMs = (base = 30_000) => {
    // jitter ±10% to stagger multiple nodes
    const jitter = base * 0.1;
    return Math.max(1000, Math.floor(base + (Math.random() * 2 - 1) * jitter));
  };

  const schedule = () => {
    if (!running) return;
    const ms = nextIntervalMs();
    timer = setTimeout(tick, ms);
    (timer as any).unref?.();
  };

  const tick = () => {
    if (!running) return;
    // Log a tiny heartbeat with current head for debugging
    const head = Number(opts.getHead?.() ?? -1);
    dlog(opts, `tick head=${head}, announcing ${bootstrap.length} bootstrap(s)`);
    announceOnce();
    schedule();
  };

  dlog(opts, `stub online at ${host}:${port} (nodeId=${opts.nodeId})`);
  // fire immediately
  tick();

  return {
    stop() {
      running = false;
      if (timer) clearTimeout(timer);
      timer = null;
      dlog(opts, 'stub stopped');
    },
    tickNow() {
      if (!running) return;
      announceOnce();
    },
    updateBootstrap(addrs: string[]) {
      bootstrap = dedupe(addrs);
      dlog(opts, `bootstrap updated (${bootstrap.length})`);
    },
    isRunning() { return running; },
  };
}

