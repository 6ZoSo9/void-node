// // src/http/metrics.ts
import type { Express } from "express";

/** Minimal metric facades so the rest of the app can call .inc() / .set() safely. */
type Ctr = { inc: (v?: number) => void };
type Gge = { set: (v: number) => void };
type RegistryLike = { metrics: () => Promise<string> | string; contentType?: string };

/** No-op shims (used when prom-client is absent). */
const noopCtr: Ctr = { inc: () => {} };
const noopGge: Gge = { set: () => {} };
const noopRegistry: RegistryLike = {
  metrics: async () => "# metrics disabled (prom-client not installed)\n",
  contentType: "text/plain; version=0.0.4; charset=utf-8",
};

/** Real or shim objects we export */
let _registry: RegistryLike = noopRegistry;
let _blocksAppended: Ctr = noopCtr;
let _followerPulls: Ctr = noopCtr;
let _lastSealMs: Gge = noopGge;

/** Try to load prom-client lazily at module eval time. */
try {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — dynamic ESM import of CommonJS/ESM handled at runtime
  const prom = await import("prom-client").catch(() => null);

  if (prom) {
    const { Registry, collectDefaultMetrics, Counter, Gauge } = prom as any;

    const registry = new Registry();
    collectDefaultMetrics?.({ register: registry });

    const blocksAppended = new Counter({
      name: "void_blocks_appended_total",
      help: "Total number of blocks appended to local store",
      registers: [registry],
    });

    const followerPulls = new Counter({
      name: "void_follower_pulls_total",
      help: "Total follower pull iterations",
      registers: [registry],
    });

    const lastSealMs = new Gauge({
      name: "void_last_seal_ms",
      help: "Duration of last sealBlock in ms",
      registers: [registry],
    });

    _registry = registry;
    _blocksAppended = blocksAppended;
    _followerPulls = followerPulls;
    _lastSealMs = lastSealMs;
  }
} catch {
  // Keep shims if prom-client isn't available
}

/** Public exports (real metrics if available, shims otherwise) */
export const registry = _registry;
export const blocksAppended = _blocksAppended;
export const followerPulls = _followerPulls;
export const lastSealMs = _lastSealMs;

/**
 * Mount Prometheus metrics without clobbering your existing /metrics.
 * Default path is /metrics/prom so your custom /metrics in index.ts keeps working.
 */
export function mountMetrics(app: Express, opts?: { path?: string }) {
  const path = opts?.path || "/metrics/prom";
  app.get(path, async (_req, res) => {
    try {
      const text = await registry.metrics();
      const ctype = (registry as any).contentType || "text/plain; version=0.0.4; charset=utf-8";
      res.setHeader("Content-Type", ctype);
      res.send(text);
    } catch (e: any) {
      res.status(500).send(String(e?.message || e));
    }
  });
}

