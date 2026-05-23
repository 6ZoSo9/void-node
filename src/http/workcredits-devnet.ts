import * as fs from "node:fs";
import * as path from "node:path";
import type { Application } from "express";

type WorkCreditsDevnetState = {
  chain: string;
  rpc_url: string;
  pool_address?: string;
  void_reserve_raw: string;
  wc_reserve_raw: string;
};

function readWorkcreditsDevnetState(): WorkCreditsDevnetState | null {
  try {
    const p = process.env.VOID_WORKCREDITS_STATE_FILE || process.env.WC_STATE_FILE || process.env.STATE_FILE || path.join(process.cwd(), "docs", "VOID-WORKCREDITS-DEVNET-STATE.json");
    const raw = fs.readFileSync(p, "utf8");
    const parsed = JSON.parse(raw);

    // Normalize to simple strings; if something sneaks in like "123 [1e24]" we still store it,
    // but computePrices() will sanitize before using it.
    return {
      chain: String(parsed.chain ?? "devnet"),
      rpc_url: String(parsed.rpc_url ?? ""),
      pool_address: parsed.pool_address || undefined,
      void_reserve_raw: String(parsed.void_reserve_raw ?? "0"),
      wc_reserve_raw: String(parsed.wc_reserve_raw ?? "0"),
    };
  } catch (err) {
    console.error("[workcredits-devnet] failed to read state JSON:", err);
    return null;
  }
}

// Parse a BigInt-ish value from a string or number, tolerating human hints like "1000 [1e3]"
function parseBigIntLike(raw: string | number | null | undefined): bigint {
  try {
    if (raw === null || raw === undefined) return 0n;
    const s = String(raw);
    // Grab the first run of digits, ignore everything else (spaces, brackets, etc.)
    const m = s.match(/^\s*([0-9]+)/);
    if (!m) return 0n;
    return BigInt(m[1]);
  } catch {
    return 0n;
  }
}

function computePrices(state: WorkCreditsDevnetState): {
  wcPerVoid: number;
  voidPerWc: number;
} {
  try {
    const voidRaw = parseBigIntLike(state.void_reserve_raw);
    const wcRaw = parseBigIntLike(state.wc_reserve_raw);

    if (voidRaw === 0n || wcRaw === 0n) {
      return { wcPerVoid: 0, voidPerWc: 0 };
    }

    const SCALE = 1_000_000_000n; // 1e9 scale for ratios
    const wcPerVoidScaled = (wcRaw * SCALE) / voidRaw;
    const voidPerWcScaled = (voidRaw * SCALE) / wcRaw;

    return {
      wcPerVoid: Number(wcPerVoidScaled) / 1e9,
      voidPerWc: Number(voidPerWcScaled) / 1e9,
    };
  } catch (err) {
    console.error("[workcredits-devnet] price computation failed:", err);
    return { wcPerVoid: 0, voidPerWc: 0 };
  }
}

function escapeLabel(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function register(app: Application) {
  console.log("[workcredits-devnet] wiring /workcredits/devnet/* routes");

  app.get("/workcredits/devnet/health", (_req, res) => {
    const state = readWorkcreditsDevnetState();
    if (!state) {
      res.status(500).json({
        ok: false,
        error: "STATE_UNAVAILABLE",
        message: "Failed to read VOID-WORKCREDITS-DEVNET-STATE.json",
      });
      return;
    }

    res.json({
      ok: true,
      chain: state.chain,
      rpc_url: state.rpc_url,
      pool: {
        pool_address: state.pool_address ?? null,
        void_reserve_raw: state.void_reserve_raw,
        wc_reserve_raw: state.wc_reserve_raw,
      },
      notes: [],
    });
  });

  app.get("/workcredits/devnet/pool", (_req, res) => {
    const state = readWorkcreditsDevnetState();
    if (!state) {
      res.status(500).json({
        ok: false,
        error: "STATE_UNAVAILABLE",
        message: "Failed to read VOID-WORKCREDITS-DEVNET-STATE.json",
      });
      return;
    }

    const prices = computePrices(state);

    res.json({
      chain: state.chain,
      rpc_url: state.rpc_url,
      pool_address: state.pool_address ?? null,
      void_reserve_raw: state.void_reserve_raw,
      wc_reserve_raw: state.wc_reserve_raw,
      wc_per_void: prices.wcPerVoid,
      void_per_wc: prices.voidPerWc,
      last_updated_ts: Date.now(),
    });
  });

  app.get("/metrics/void/workcredits-devnet.prom", (_req, res) => {
    const state = readWorkcreditsDevnetState();
    if (!state) {
      const lines = [
        "# HELP void_workcredits_devnet_up Is WorkCredits devnet state readable (1 ok, 0 bad)",
        "# TYPE void_workcredits_devnet_up gauge",
        'void_workcredits_devnet_up{chain="devnet"} 0',
      ].join("\n") + "\n";

      res
        .type("text/plain; version=0.0.4; charset=utf-8")
        .send(lines);
      return;
    }

    const prices = computePrices(state);
    const chainLabel = state.chain || "devnet";
    const labels = `{chain="${escapeLabel(chainLabel)}"}`;
    const metaLabels = `{chain="${escapeLabel(chainLabel)}",rpc_url="${escapeLabel(
      state.rpc_url || ""
    )}",pool_address="${escapeLabel(state.pool_address ?? "")}"}`;

    const voidRawStr = String(parseBigIntLike(state.void_reserve_raw));
    const wcRawStr = String(parseBigIntLike(state.wc_reserve_raw));

    const wcPerVoid = Number.isFinite(prices.wcPerVoid) ? prices.wcPerVoid : 0;
    const voidPerWc = Number.isFinite(prices.voidPerWc) ? prices.voidPerWc : 0;

    const chunks: string[] = [];

    chunks.push("# HELP void_workcredits_devnet_up Is WorkCredits devnet state readable (1 ok, 0 bad)");
    chunks.push("# TYPE void_workcredits_devnet_up gauge");
    chunks.push(`void_workcredits_devnet_up${labels} 1`);

    chunks.push("# HELP void_workcredits_devnet_void_reserve_raw VOID reserve in pool (raw 18-dec units)");
    chunks.push("# TYPE void_workcredits_devnet_void_reserve_raw gauge");
    chunks.push(`void_workcredits_devnet_void_reserve_raw${labels} ${voidRawStr}`);

    chunks.push("# HELP void_workcredits_devnet_wc_reserve_raw WorkCredits reserve in pool (raw 18-dec units)");
    chunks.push("# TYPE void_workcredits_devnet_wc_reserve_raw gauge");
    chunks.push(`void_workcredits_devnet_wc_reserve_raw${labels} ${wcRawStr}`);

    chunks.push("# HELP void_workcredits_devnet_wc_per_void WC per 1 VOID (price)");
    chunks.push("# TYPE void_workcredits_devnet_wc_per_void gauge");
    chunks.push(`void_workcredits_devnet_wc_per_void${labels} ${wcPerVoid}`);

    chunks.push("# HELP void_workcredits_devnet_void_per_wc VOID per 1 WC (price)");
    chunks.push("# TYPE void_workcredits_devnet_void_per_wc gauge");
    chunks.push(`void_workcredits_devnet_void_per_wc${labels} ${voidPerWc}`);

    chunks.push("# HELP void_workcredits_devnet_pool_meta Static metadata for WC/VOID pool");
    chunks.push("# TYPE void_workcredits_devnet_pool_meta gauge");
    chunks.push(`void_workcredits_devnet_pool_meta${metaLabels} 1`);

    res
      .type("text/plain; version=0.0.4; charset=utf-8")
      .send(chunks.join("\n") + "\n");
  });
}

// Self-mount using the global app handle from index.ts
(function mount() {
  const TICK = 500;

  function getApp(): Application | null {
    const g: any = globalThis as any;
    const app = g.__void_http_app || g.app;
    if (!app || typeof app.get !== "function") return null;
    return app as Application;
  }

  function tryMount() {
    try {
      const app = getApp();
      if (!app) {
        setTimeout(tryMount, TICK);
        return;
      }
      const anyApp: any = app as any;
      if (anyApp.__workcredits_devnet_mounted) return;
      anyApp.__workcredits_devnet_mounted = true;
      register(app);
    } catch (err) {
      console.error("[workcredits-devnet] mount error:", (err as any)?.message ?? err);
      setTimeout(tryMount, TICK);
    }
  }

  tryMount();
})();
