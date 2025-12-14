import React, { useEffect, useMemo, useRef, useState } from "react";
import { getStoredAddress, setStoredAddress } from "../shared/addrStore";

type AnyObj = Record<string, any>;

const DEFAULT_ADDR = ""; // NOTE: no demo default; user must choose an address
const WALLET_DASHBOARD_BUILD = "walletdash-v4-2025-12-12";

function isObj(x: any): x is AnyObj {
  return x && typeof x === "object" && !Array.isArray(x);
}

function looksLikeAddress(a: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(a.trim());
}

function getPath(obj: any, path: string): any {
  const parts = path.split(".").filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (!isObj(cur)) return undefined;
    cur = cur[p];
  }
  return cur;
}

function pickFirst(obj: any, paths: string[]): any {
  for (const p of paths) {
    const v = getPath(obj, p);
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

function toNumber(x: any): number | undefined {
  if (x === undefined || x === null) return undefined;
  if (typeof x === "number") return Number.isFinite(x) ? x : undefined;
  if (typeof x === "bigint") return Number(x);
  if (typeof x === "string") {
    const m = x.trim().match(/^-?\d+(\.\d+)?([eE][+-]?\d+)?/);
    if (!m) return undefined;
    const n = Number(m[0]);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function formatNum(n: number | undefined, digits = 6): string {
  if (n === undefined) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function formatNumFixed(n: number | undefined, digits = 4): string {
  if (n === undefined) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function shortAddr(a: string): string {
  const s = a.trim();
  if (s.length < 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function helperUrl(addr: string): string {
  // Vite proxy avoids CORS:
    const a = addr.trim();
  // Vite dev: proxy avoids CORS; non-dev: served by the node/helper directly.
  if (import.meta && import.meta.env && import.meta.env.DEV) return `/__void_helper/workcredits/devnet/dashboard/${a}.json`;
  return `/workcredits/devnet/dashboard/${a}.json`;

}

function healthLabel(h: any): string {
  // helper may return "healthy" or 1/0 — normalize
  if (typeof h === "string" && h.trim().length) return h.trim();
  const n = toNumber(h);
  if (n === undefined) return "—";
  return n >= 1 ? "healthy" : "down";
}

function healthDot(h: string): string {
  if (h === "healthy") return "rgba(34,197,94,0.95)";
  if (h === "down") return "rgba(239,68,68,0.95)";
  return "rgba(255,255,255,0.55)";
}

type Dashboard = {
  chain?: string;
  address?: string;

  void?: number;
  wc?: number;
  lp?: number;

  voidRaw?: any;
  wcRaw?: any;
  lpRaw?: any;

  pendingWc?: number;
  pendingWcRaw?: any;

  poolUp?: number;
  poolHealth?: string;
  poolHealth5m?: number;

  wcPerVoid?: number;
  voidPerWc?: number;

  reserveVoid?: number;
  reserveWc?: number;

  rawJson: any;
  fetchedAtMs: number;
};

function extractDashboard(j: any): Dashboard {
  const chain = String(pickFirst(j, ["chain", "account.chain", "pool.chain"]) ?? "");
  const address = String(pickFirst(j, ["address", "account.address"]) ?? "");

  const void_ = toNumber(pickFirst(j, ["account.balances.void"])) ?? 0;
  const wc_   = toNumber(pickFirst(j, ["account.balances.wc"])) ?? 0;
  const lp_   = toNumber(pickFirst(j, ["account.balances.lp"])) ?? 0;

  const voidRaw = pickFirst(j, ["account.balances.void_raw"]);
  const wcRaw   = pickFirst(j, ["account.balances.wc_raw"]);
  const lpRaw   = pickFirst(j, ["account.balances.lp_raw"]);

  const pendingWc = toNumber(pickFirst(j, ["account.earnings.pending_wc", "account.earnings.pending"])) ?? 0;
  const pendingWcRaw = pickFirst(j, ["account.earnings.pending_wc_raw", "account.earnings.pending_raw"]);

  const poolUp = toNumber(pickFirst(j, ["pool.up", "pool.pool.up"])) ?? 0;
  const poolHealth = pickFirst(j, ["pool.health", "pool.pool.health"]);
  const poolHealth5m = toNumber(pickFirst(j, ["pool.health_5m"])) ?? 0;

  const wcPerVoid = toNumber(pickFirst(j, ["pool.price.wc_per_void"])) ?? undefined;
  const voidPerWc = toNumber(pickFirst(j, ["pool.price.void_per_wc"])) ?? undefined;

  const reserveVoid = toNumber(pickFirst(j, ["pool.reserves.void"])) ?? undefined;
  const reserveWc   = toNumber(pickFirst(j, ["pool.reserves.wc"])) ?? undefined;

  return {
    chain: chain || undefined,
    address: address || undefined,
    void: void_,
    wc: wc_,
    lp: lp_,
    voidRaw,
    wcRaw,
    lpRaw,
    pendingWc,
    pendingWcRaw,
    poolUp,
    poolHealth: healthLabel(poolHealth),
    poolHealth5m,
    wcPerVoid,
    voidPerWc,
    reserveVoid,
    reserveWc,
    rawJson: j,
    fetchedAtMs: Date.now(),
  };
}

function badgeStyle(bg: string, bd: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    padding: "3px 10px",
    borderRadius: 999,
    background: bg,
    border: `1px solid ${bd}`,
    opacity: 0.95,
    whiteSpace: "nowrap",
  };
}

function panelStyle(): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
    boxShadow: "0 12px 40px rgba(0,0,0,0.22)",
    padding: 16,
    minWidth: 0,
  };
}

function tile(): React.CSSProperties {
  return {
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    padding: 12,
    minHeight: 86,
  };
}

const mono: React.CSSProperties = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" };

export function WalletDashboard() {
  const [addr, setAddr] = useState<string>(() => {
    const stored = getStoredAddress();
    if (stored && looksLikeAddress(stored)) return stored;
    return "";
  });
const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  /* AUTO_REFRESH_ENGINE_V1 */
  const loadingRef = useRef(false);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  useEffect(() => {
    if (!autoRefresh) return;
    if (!looksLikeAddress(addr)) return;

    const ms = 2000;
    const id = window.setInterval(() => {
      if (loadingRef.current) return;
      refresh();
    }, ms);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, addr]);
  const canFetch = useMemo(() => looksLikeAddress(addr), [addr]);

  /* RESPONSIVE_VW_V1 */
  const [vw, setVw] = useState<number>(() => (typeof window !== "undefined" ? window.innerWidth : 1200));
  useEffect(() => {
    const on = () => setVw(window.innerWidth);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const isNarrow = vw < 980;
  const poolCols = isNarrow ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))";

  function cacheKey(a: string) {
    return `obelisk_wallet_dash_${a.toLowerCase()}`;
  }

  function loadCache(a: string): Dashboard | null {
    try {
      const raw = localStorage.getItem(cacheKey(a));
      if (!raw) return null;
      const j = JSON.parse(raw);
      if (!j || !j.rawJson) return null;
      return { ...j, fetchedAtMs: j.fetchedAtMs || Date.now() };
    } catch {
      return null;
    }
  }

  function saveCache(a: string, d: Dashboard) {
    try { localStorage.setItem(cacheKey(a), JSON.stringify(d)); } catch {}
  }

  async function refresh() {
    if (!canFetch) {
      setErr("Invalid address (expected 0x + 40 hex chars).");
      setDash(null);
      return;
    }

    setLoading(true);
    setErr("");

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const r = await fetch(helperUrl(addr), { signal: ac.signal, headers: { accept: "application/json" } });
      if (!r.ok) throw new Error(`Helper error: HTTP ${r.status}`);
      const j = await r.json();
      const d = extractDashboard(j);
      setDash(d);
      saveCache(addr, d);
      /* ADDR_PERSIST_WALLET_V1 */
      // addr persistence handled by ADDR_PERSIST_WALLET_INPUT_V1 effect
    } catch (e: any) {
      if (String(e?.name) === "AbortError") return;
      const cached = loadCache(addr);
      if (cached) {
        setDash(cached);
        setErr("Devnet helper offline (showing last known values).");
      } else {
        setDash(null);
        setErr(e?.message ? String(e.message) : "Helper error: Failed to fetch");
      }
    } finally {
      setLoading(false);
    }
  }

    // ADDR_PERSIST_WALLET_INPUT_V1
  useEffect(() => {
    try {
      const a = addr.trim();
      try { setStoredAddress(String(a).trim()); } catch {}
      if (/^0x[0-9a-fA-F]{40}$/.test(a)) localStorage.setItem("obelisk_wallet_addr", a);
    } catch {}
  }, [addr]);

useEffect(() => {
    const cached = loadCache(addr);
    if (cached) setDash(cached);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // AUTO_REFRESH_TIMER_V1
  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => {
      refresh();
    }, 3000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, addr]);

  const updatedAgo = dash ? Math.max(0, Math.floor((Date.now() - dash.fetchedAtMs) / 1000)) : null;
  const health = dash?.poolHealth ?? "—";

  return (
    <div style={{ padding: 18, maxWidth: 1100, margin: "0 auto" }}>
      {/* header (clean: product-first, debug moved into details) */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ fontWeight: 900, letterSpacing: 0.2, fontSize: 18 }}>VOID / Obelisk</div>
        <div style={badgeStyle("rgba(168,85,247,0.14)", "rgba(168,85,247,0.28)")}>DEVNET · WALLET</div>
        <div style={{ marginLeft: "auto", ...badgeStyle("rgba(255,255,255,0.06)", "rgba(255,255,255,0.12)") }}>
          last update: {updatedAgo !== null ? `${updatedAgo}s` : "—"}
        {/* AUTO_REFRESH_UI_V1 */}
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginLeft: 10, fontSize: 12, opacity: 0.9, userSelect: "none" }}>
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
          auto refresh
        </label>
        </div>
      </div>

      {/* account bar */}
      <div style={{ ...panelStyle(), marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "stretch", flexWrap: "wrap" /* ACCOUNT_BAR_V2 */ }}>
          <div style={{ opacity: 0.75, letterSpacing: 1.2, fontSize: 12, display: "inline-flex", alignItems: "center", height: 44, padding: "0 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", whiteSpace: "nowrap" }}>ACCOUNT</div>
          <div style={{ flex: 1, minWidth: 320 }}>
            <input
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              placeholder="0x… address"
              style={{
                width: "100%",
                height: 44,
                padding: "0 12px",
                boxSizing: "border-box",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.16)",
                color: "inherit",
                outline: "none",
                ...mono,
              }}
            />
          </div>
          <button
            onClick={refresh}
            disabled={!canFetch || loading}
            style={{
              height: 44,
              padding: "0 16px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxSizing: "border-box",
              borderRadius: 12,
              border: "1px solid rgba(168,85,247,0.35)",
              background: loading ? "rgba(255,255,255,0.06)" : "rgba(168,85,247,0.16)",
              color: "inherit",
              cursor: !canFetch || loading ? "not-allowed" : "pointer",
              fontWeight: 900,
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "Loading…" : "LOAD"}
          </button>
        </div>

        {err ? (
          <div style={{ marginTop: 10, height: 44,
                padding: "0 12px",
                boxSizing: "border-box", borderRadius: 12, border: "1px solid rgba(255,90,90,0.35)", background: "rgba(255,90,90,0.10)" }}>
            <div style={{ fontWeight: 900, marginBottom: 4 }}>Helper status</div>
            <div style={{ opacity: 0.9 }}>{err}</div>
          </div>
        ) : null}
      </div>

      {/* main grid */}
      <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "minmax(420px, 1fr) minmax(520px, 1fr)", gap: 12, alignItems: "start" }}>
        {/* left: pool */}
        <div style={{ ...panelStyle(), /* PANEL_MINWIDTH_GUARD_V1 */ minWidth: 420 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.6 }}>POOL & PRICE</div>
            <div style={{ marginLeft: "auto", ...badgeStyle("rgba(255,255,255,0.06)", "rgba(255,255,255,0.12)") }}>WC / VOID AMM</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: poolCols, gap: 10 }}>
            <Tile label="PRICE · WC PER 1 VOID" value={dash?.wcPerVoid !== undefined ? formatNumFixed(dash.wcPerVoid, 4) : "—"} sub="wc / void" />
            <Tile label="PRICE · VOID PER 1 WC" value={dash?.voidPerWc !== undefined ? formatNumFixed(dash.voidPerWc, 8) : "—"} sub="void / wc" />

            <div style={tile()}>
              <div style={{ opacity: 0.75, letterSpacing: 1.2, fontSize: 11 }}>HEALTH</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 99, background: healthDot(health) }} />
                <div style={{ fontSize: 18, fontWeight: 900 }}>{health}</div>
              </div>
              <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
                up={dash?.poolUp ?? 0} · health_5m={dash?.poolHealth5m ?? 0}
              </div>
            </div>

            <Tile label="POOL RESERVES · VOID" value={dash?.reserveVoid !== undefined ? formatNum(dash.reserveVoid, 2) : "—"} sub="decimals: 18" />
            <Tile label="POOL RESERVES · WC" value={dash?.reserveWc !== undefined ? formatNum(dash.reserveWc, 2) : "—"} sub="decimals: 18" />
            <Tile label="SOURCE" value={dash?.chain ?? "devnet"} sub="devnet helper" />
          </div>
        </div>

        {/* right: balances */}
        <div style={{ ...panelStyle(), minWidth: 520 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.6 }}>ACCOUNT BALANCES</div>
            <div style={{ marginLeft: "auto", ...badgeStyle("rgba(255,255,255,0.06)", "rgba(255,255,255,0.12)") }}>WALLET PREVIEW</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <Stat label="VOID" value={dash?.void !== undefined ? formatNumFixed(dash.void, 4) : "—"} />
            <Stat label="WORKCREDITS" value={dash?.wc !== undefined ? formatNum(dash.wc, 0) : "—"} />
            <Stat label="LP TOKENS" value={dash?.lp !== undefined ? formatNumFixed(dash.lp, 4) : "—"} />
            <Stat label="PENDING WC" value={dash?.pendingWc !== undefined ? formatNumFixed(dash.pendingWc, 4) : "—"} />
            <Info label="CHAIN" value={dash?.chain ?? "devnet"} sub="devnet helper" />
            <Info label="ADDRESS" value={shortAddr(addr)} sub="target wallet" />
          </div>

          

          {/* DEV_SECTION_WRAP_V1 */}
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.10)", opacity: 0.9 }}>
            <div style={{ fontSize: 12, letterSpacing: 1.0, opacity: 0.7, marginBottom: 6 }}>DEV</div>
<details style={{ marginTop: 12, opacity: 0.92 }}>
            <summary style={{ cursor: "pointer" }}>Dev details (raw + endpoints)</summary>
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div style={{ ...tile(), minHeight: 0 }}>
                <div style={{ opacity: 0.75, letterSpacing: 1.2, fontSize: 11 }}>RAW BALANCES</div>
                <div style={{ marginTop: 8, display: "grid", gap: 6, fontSize: 12 }}>
                  <KV k="void_raw" v={dash?.voidRaw} />
                  <KV k="wc_raw" v={dash?.wcRaw} />
                  <KV k="lp_raw" v={dash?.lpRaw} />
                  <KV k="pending_wc_raw" v={dash?.pendingWcRaw} />
                </div>
              </div>

              <div style={{ ...tile(), minHeight: 0 }}>
                <div style={{ opacity: 0.75, letterSpacing: 1.2, fontSize: 11 }}>ENDPOINTS</div>
                <div style={{ marginTop: 8, display: "grid", gap: 6, fontSize: 12 }}>
                  <KV k="helper (proxied)" v={"http://127.0.0.1:4312"} />
                  <KV k="dashboard path" v={"/workcredits/devnet/dashboard/<address>.json"} />
                  <KV k="fetch URL" v={helperUrl(addr)} />
                  <KV k="build" v={WALLET_DASHBOARD_BUILD} />
                </div>
              </div>
            </div>
          </details>

          <details style={{ marginTop: 12, opacity: 0.92 }}>
            <summary style={{ cursor: "pointer" }}>RAW DASHBOARD JSON (dev)</summary>
            <pre style={{ marginTop: 10, padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.18)", overflow: "auto", maxHeight: 360 }}>
              {dash ? JSON.stringify(dash.rawJson, null, 2) : "—"}
            </pre>
          </details>
          </div>

        </div>
      </div>
    </div>
  );
}

function Tile(props: { label: string; value: string; sub?: string }) {
  return (
    <div style={tile()}>
      <div style={{ opacity: 0.75, letterSpacing: 1.2, fontSize: 11 }}>{props.label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, marginTop: 6 }}>{props.value}</div>
      {props.sub ? <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>{props.sub}</div> : null}
    </div>
  );
}

function Stat(props: { label: string; value: string }) {
  return (
    <div style={tile()}>
      <div style={{ opacity: 0.75, letterSpacing: 1.2, fontSize: 11 }}>{props.label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>{props.value}</div>
    </div>
  );
}

function Info(props: { label: string; value: string; sub?: string }) {
  return (
    <div style={tile()}>
      <div style={{ opacity: 0.75, letterSpacing: 1.2, fontSize: 11 }}>{props.label}</div>
      <div style={{ fontSize: 14, fontWeight: 900, marginTop: 6, ...mono }}>{props.value}</div>
      {props.sub ? <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>{props.sub}</div> : null}
    </div>
  );
}

function KV(props: { k: string; v: any }) {
  // prevent ugly wrapping: one-line, ellipsis
  const s = props.v === undefined || props.v === null ? "—" : String(props.v);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, alignItems: "center" }}>
      <div style={{ opacity: 0.75 }}>{props.k}</div>
      <div
        style={{
          ...mono,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          opacity: 0.92,
        }}
        title={s}
      >
        {s}
      </div>
    </div>
  );
}

export default WalletDashboard;
