import React, { useEffect, useMemo, useRef, useState } from "react";

export const WALLET_DASHBOARD_BUILD = "walletdash.clean.v1";

type AnyObj = Record<string, any>;

type Dash = {
  fetchedAtMs: number;
  ok: boolean;
  addr: string;
  chainId?: number;
  chain?: string;

  // account balances
  void: number;
  wc: number;
  lp: number;
  pendingWc: number;

  voidRaw?: string;
  wcRaw?: string;
  lpRaw?: string;
  pendingWcRaw?: string;

  // pool
  poolUp?: number;
  poolHealth5m?: number;
  wcPerVoid?: number;
  voidPerWc?: number;
  reserveVoid?: number;
  reserveWc?: number;
  poolAddress?: string;
  rpcUrl?: string;

  rawJson: any;
};

function isAddr(x: string) {
  return /^0x[0-9a-fA-F]{40}$/.test((x || "").trim());
}

function shortAddr(x: string) {
  const a = (x || "").trim();
  if (!isAddr(a)) return a || "—";
  return a.slice(0, 6) + "…" + a.slice(-4);
}

function pickFirstDeep(obj: any, paths: string[]): any {
  for (const p of paths) {
    const parts = p.split(".");
    let cur = obj;
    let ok = true;
    for (const k of parts) {
      if (cur && typeof cur === "object" && k in cur) cur = cur[k];
      else { ok = false; break; }
    }
    if (ok && cur !== undefined && cur !== null) return cur;
  }
  return undefined;
}

function toNum(x: any): number | undefined {
  if (x === undefined || x === null) return undefined;
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const n = Number(x);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function fromRaw(raw: any, decimals: number, fracDigits = 6): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  const s = String(raw).trim();
  if (!/^\d+$/.test(s)) return toNum(raw);
  const d = Math.max(0, Math.min(36, Number(decimals || 0)));
  if (d === 0) return toNum(s);
  if (s.length <= d) {
    const pad = "0".repeat(d - s.length);
    const frac = (pad + s).slice(0, fracDigits);
    return Number("0." + frac);
  }
  const intPart = s.slice(0, s.length - d);
  const fracPart = s.slice(s.length - d).slice(0, fracDigits);
  return Number(intPart + "." + fracPart);
}

function fmt(x: number | undefined, digits = 6) {
  if (x === undefined || x === null || !Number.isFinite(x)) return "—";
  if (Math.abs(x) >= 1e9) return x.toExponential(2);
  return x.toLocaleString(undefined, { maximumFractionDigits: digits });
}
function fmtFixed(x: number | undefined, digits = 6) {
  if (x === undefined || x === null || !Number.isFinite(x)) return "—";
  return x.toFixed(digits);
}

function loadCache(addr: string): Dash | null {
  try {
    const k = "obelisk_wc_dash_cache_" + addr.trim().toLowerCase();
    const s = localStorage.getItem(k);
    if (!s) return null;
    const j = JSON.parse(s);
    if (!j || typeof j !== "object") return null;
    return j as Dash;
  } catch {
    return null;
  }
}
function saveCache(addr: string, d: Dash) {
  try {
    const k = "obelisk_wc_dash_cache_" + addr.trim().toLowerCase();
    localStorage.setItem(k, JSON.stringify(d));
  } catch {}
}

function helperUrl(addr: string) {
  const a = (addr || "").trim();
  return `/workcredits/devnet/dashboard/${a}.json`;
}

function normalizeDashboard(j: AnyObj, addr: string): Dash {
  // Support BOTH:
  // - v2: { balances, poolState }
  // - legacy: { account: { balances, earnings }, pool: { reserves, price, up, health_5m } }
  const pool: AnyObj = (j.poolState && typeof j.poolState === "object") ? j.poolState : (j.pool && typeof j.pool === "object" ? j.pool : {});
  const reserves: AnyObj = (pool.reserves && typeof pool.reserves === "object") ? pool.reserves : {};
  const price: AnyObj = (pool.price && typeof pool.price === "object") ? pool.price : {};

  const acct: AnyObj = (j.account && typeof j.account === "object") ? j.account : {};
  const balTop: AnyObj = (j.balances && typeof j.balances === "object") ? j.balances : {};
  const balAcct: AnyObj = (acct.balances && typeof acct.balances === "object") ? acct.balances : {};
  const balances: AnyObj = Object.keys(balTop).length ? balTop : balAcct;

  const earn: AnyObj = (acct.earnings && typeof acct.earnings === "object") ? acct.earnings : {};

  const voidDec = pickFirstDeep(j, ["balances.void_decimals","balances.decimals.void","account.balances.void_decimals","account.balances.decimals.void","pool.tokens.void.decimals","poolState.tokens.void.decimals"]) ?? 18;
  const wcDec   = pickFirstDeep(j, ["balances.wc_decimals","balances.decimals.wc","account.balances.wc_decimals","account.balances.decimals.wc","pool.tokens.wc.decimals","poolState.tokens.wc.decimals"]) ?? 18;

  const voidHuman = toNum(balances.void);
  const wcHuman   = toNum(balances.wc);
  const lpHuman   = toNum(balances.lp);
  const pendHuman = toNum(earn.pending_wc);

  const voidRaw = pickFirstDeep(balances, ["void_raw","voidRaw"]);
  const wcRaw   = pickFirstDeep(balances, ["wc_raw","wcRaw"]);
  const lpRaw   = pickFirstDeep(balances, ["lp_raw","lpRaw"]);
  const pendRaw = pickFirstDeep(earn, ["pending_wc_raw","pendingWcRaw","pending_wcRaw"]);

  const out: Dash = {
    fetchedAtMs: Date.now(),
    ok: Boolean(j.ok ?? true),
    addr: (j.addr || j.address || acct.address || addr || "").trim(),
    chainId: toNum(j.chainId),
    chain: j.chain || pool.chain || acct.chain || "devnet",

    void: voidHuman ?? (fromRaw(voidRaw, Number(voidDec), 6) ?? 0),
    wc: wcHuman ?? (fromRaw(wcRaw, Number(wcDec), 6) ?? 0),
    lp: lpHuman ?? (fromRaw(lpRaw, 18, 6) ?? 0),
    pendingWc: pendHuman ?? (fromRaw(pendRaw, 18, 6) ?? 0),

    voidRaw: voidRaw != null ? String(voidRaw) : undefined,
    wcRaw: wcRaw != null ? String(wcRaw) : undefined,
    lpRaw: lpRaw != null ? String(lpRaw) : undefined,
    pendingWcRaw: pendRaw != null ? String(pendRaw) : undefined,

    poolUp: toNum(pool.up),
    poolHealth5m: toNum(pool.health_5m ?? pool.health5m),

    wcPerVoid: toNum(price.wc_per_void ?? price.wcPerVoid),
    voidPerWc: toNum(price.void_per_wc ?? price.voidPerWc),

    reserveVoid: toNum(reserves.void) ?? fromRaw(reserves.void_raw ?? reserves.voidRaw, 18, 6),
    reserveWc: toNum(reserves.wc) ?? fromRaw(reserves.wc_raw ?? reserves.wcRaw, 18, 6),

    poolAddress: pickFirstDeep(pool, ["pool.address","address"]),
    rpcUrl: pickFirstDeep(pool, ["meta.rpc_url","pool.rpcUrl","rpcUrl"]),

    rawJson: j,
  };

  return out;
}

function badgeStyle(bg: string, br: string): React.CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${br}`,
    background: bg,
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  };
}
const mono: React.CSSProperties = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" };

function panelStyle(): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
    padding: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  };
}
function tile(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    padding: 12,
    minHeight: 74,
  };
}
function healthDot(s: string) {
  if (s === "healthy") return "rgba(34,197,94,0.95)";
  if (s === "check") return "rgba(250,204,21,0.95)";
  return "rgba(148,163,184,0.85)";
}

export function WalletDashboard() {
  const [addr, setAddr] = useState<string>(() => {
    try {
      const a = localStorage.getItem("obelisk_wallet_addr");
      return a && isAddr(a) ? a : "0x1111111111111111111111111111111111111111";
    } catch {
      return "0x1111111111111111111111111111111111111111";
    }
  });

  const [dash, setDash] = useState<Dash | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const abortRef = useRef<AbortController | null>(null);

  const canFetch = useMemo(() => isAddr(addr), [addr]);

  async function useWallet() {
    const eth = (window as any).ethereum;
    if (!eth || !eth.request) {
      setErr("No window.ethereum detected (MetaMask?).");
      return;
    }
    try {
      const accts: string[] = await eth.request({ method: "eth_requestAccounts" });
      const a = (accts && accts[0]) ? String(accts[0]).trim() : "";
      if (isAddr(a)) setAddr(a);
      else setErr("Wallet returned an invalid address.");
    } catch (e: any) {
      setErr(e?.message ? String(e.message) : "Wallet request failed.");
    }
  }

  function useDemo() {
    setAddr("0x1111111111111111111111111111111111111111");
  }

  async function refresh() {
    if (!canFetch || loading) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setErr(null);

    const url = helperUrl(addr);

    try {
      const resp = await fetch(url, { cache: "no-store", signal: ac.signal });
      if (!resp.ok) {
        const t = await resp.text().catch(() => "");
        throw new Error(`HTTP ${resp.status}: ${t.slice(0, 160)}`);
      }
      const j = await resp.json();
      (globalThis as any).__wc_dash_last = j;
      const d = normalizeDashboard(j, addr);
      setDash(d);
      saveCache(addr, d);
      try { localStorage.setItem("obelisk_wallet_addr", addr.trim()); } catch {}
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

  // initial load
  useEffect(() => {
    const cached = loadCache(addr);
    if (cached) setDash(cached);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => {
      refresh();
    }, 3000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, addr]);

  const updatedAgo = dash ? Math.max(0, Math.floor((Date.now() - dash.fetchedAtMs) / 1000)) : null;
  const health =
    dash && (dash.poolUp === 1 || dash.poolUp === true as any)
      ? "check"
      : "—";

  return (
    <div style={{ padding: 18, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ fontWeight: 900, letterSpacing: 0.2, fontSize: 18 }}>VOID / Obelisk</div>
        <div style={badgeStyle("rgba(168,85,247,0.14)", "rgba(168,85,247,0.28)")}>WORKCREDITS · DEVNET</div>
        <div style={{ marginLeft: "auto", ...badgeStyle("rgba(255,255,255,0.06)", "rgba(255,255,255,0.12)") }}>
          last update: {updatedAgo !== null ? `${updatedAgo}s` : "—"} · build: {WALLET_DASHBOARD_BUILD}
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginLeft: 10, fontSize: 12, opacity: 0.9, userSelect: "none" }}>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            auto refresh
          </label>
        </div>
      </div>

      {/* account bar */}
      <div style={{ ...panelStyle(), marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "stretch", flexWrap: "wrap" }}>
          <div style={{ opacity: 0.75, letterSpacing: 1.2, fontSize: 12, display: "inline-flex", alignItems: "center", height: 44, padding: "0 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", whiteSpace: "nowrap" }}>
            ADDRESS
          </div>

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
            onClick={useWallet}
            style={{
              height: 44,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              color: "inherit",
              fontWeight: 900,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            USE WALLET
          </button>

          <button
            onClick={useDemo}
            style={{
              height: 44,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              color: "inherit",
              fontWeight: 900,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            USE DEMO
          </button>

          <button
            onClick={refresh}
            disabled={!canFetch || loading}
            style={{
              height: 44,
              padding: "0 16px",
              borderRadius: 12,
              border: "1px solid rgba(168,85,247,0.35)",
              background: loading ? "rgba(255,255,255,0.06)" : "rgba(168,85,247,0.16)",
              color: "inherit",
              fontWeight: 900,
              cursor: !canFetch || loading ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "Loading…" : "LOAD"}
          </button>
        </div>

        {err ? (
          <div
            style={{
              marginTop: 10,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,90,90,0.35)",
              background: "rgba(255,90,90,0.10)",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 4 }}>Helper status</div>
            <div style={{ opacity: 0.9 }}>{err}</div>
          </div>
        ) : null}
      </div>

      {/* main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(420px, 1fr) minmax(520px, 1fr)", gap: 12, alignItems: "start" }}>
        {/* left */}
        <div style={{ ...panelStyle(), minWidth: 420 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.6 }}>POOL (VOID ⇄ WC)</div>
            <div style={{ marginLeft: "auto", ...badgeStyle("rgba(255,255,255,0.06)", "rgba(255,255,255,0.12)") }}>WC / VOID AMM</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <Tile label="WC per 1 VOID" value={dash?.wcPerVoid !== undefined ? fmtFixed(dash.wcPerVoid, 6) : "—"} sub="wc / void" />
            <Tile label="VOID per 1 WC" value={dash?.voidPerWc !== undefined ? fmtFixed(dash.voidPerWc, 6) : "—"} sub="void / wc" />

            <Tile label="Reserves · VOID" value={dash?.reserveVoid !== undefined ? fmt(dash.reserveVoid, 6) : "—"} sub="decimals: 18" />
            <Tile label="Reserves · WC" value={dash?.reserveWc !== undefined ? fmt(dash.reserveWc, 6) : "—"} sub="decimals: 18" />

            <div style={tile()}>
              <div style={{ opacity: 0.75, letterSpacing: 1.2, fontSize: 11 }}>HEALTH</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 99, background: healthDot(health) }} />
                <div style={{ fontSize: 18, fontWeight: 900 }}>{health}</div>
              </div>
              <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
                up={dash?.poolUp ?? "—"} · health_5m={dash?.poolHealth5m ?? "—"}
              </div>
            </div>

            <div style={tile()}>
              <div style={{ opacity: 0.75, letterSpacing: 1.2, fontSize: 11 }}>POOL META</div>
              <div style={{ marginTop: 8, display: "grid", gap: 6, fontSize: 12 }}>
                <KV k="pool" v={dash?.poolAddress ?? "—"} />
                <KV k="rpc" v={dash?.rpcUrl ?? "—"} />
              </div>
            </div>
          </div>
        </div>

        {/* right */}
        <div style={{ ...panelStyle(), minWidth: 520 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.6 }}>ACCOUNT BALANCES</div>
            <div style={{ marginLeft: "auto", ...badgeStyle("rgba(255,255,255,0.06)", "rgba(255,255,255,0.12)") }}>
              addr: {shortAddr(addr)}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <Stat label="VOID" value={dash?.void !== undefined ? fmt(dash.void, 6) : "—"} />
            <Stat label="WorkCredits" value={dash?.wc !== undefined ? fmt(dash.wc, 6) : "—"} />
            <Stat label="LP" value={dash?.lp !== undefined ? fmt(dash.lp, 6) : "—"} />
            <Stat label="Pending WC" value={dash?.pendingWc !== undefined ? fmt(dash.pendingWc, 6) : "—"} />
          </div>

          <details style={{ marginTop: 12, opacity: 0.92 }}>
            <summary style={{ cursor: "pointer" }}>Dev details</summary>
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
                  <KV k="dashboard path" v={"/workcredits/devnet/dashboard/<address>.json"} />
                  <KV k="fetch URL" v={helperUrl(addr)} />
                  <KV k="chainId" v={dash?.chainId} />
                  <KV k="chain" v={dash?.chain} />
                </div>
              </div>
            </div>
          </details>

          <details style={{ marginTop: 12, opacity: 0.92 }}>
            <summary style={{ cursor: "pointer" }}>Raw JSON</summary>
            <pre style={{ marginTop: 10, padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.18)", overflow: "auto", maxHeight: 360 }}>
              {dash ? JSON.stringify(dash.rawJson, null, 2) : "—"}
            </pre>
          </details>
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
function KV(props: { k: string; v: any }) {
  const s = props.v === undefined || props.v === null ? "—" : String(props.v);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, alignItems: "center" }}>
      <div style={{ opacity: 0.75 }}>{props.k}</div>
      <div style={{ ...mono, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.92 }} title={s}>
        {s}
      </div>
    </div>
  );
}

export default WalletDashboard;
