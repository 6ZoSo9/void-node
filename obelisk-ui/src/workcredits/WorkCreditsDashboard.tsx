import React, { useEffect } from "react";
import { useWorkCreditsDashboard } from "./useWorkCreditsDashboard";
import type { WorkCreditsPool, WorkCreditsAccount } from "./devnetApi";

const DEMO_ADDRESS = "0x1111111111111111111111111111111111111111";

function fmt(val: any): string {
  if (val === undefined || val === null) return "—";
  if (typeof val === "number") {
    if (!Number.isFinite(val)) return String(val);
    if (Math.abs(val) >= 1_000_000_000_000) return val.toExponential(2);
    return val.toLocaleString();
  }
  return String(val);
}

function SectionCard(props: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        borderRadius: "0.75rem",
        border: "1px solid #333",
        padding: "1rem",
        background: "#111",
        boxShadow: "0 0 10px rgba(0,0,0,0.6)",
      }}
    >
      <h2
        style={{
          margin: "0 0 0.75rem",
          fontSize: "1rem",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "#9ee6ff",
        }}
      >
        {props.title}
      </h2>
      {props.children}
    </section>
  );
}

interface Props {
  initialAddress?: string;
}

export const WorkCreditsDashboard: React.FC<Props> = ({ initialAddress }) => {
  const {
    address,
    setAddress,
    data,
    loading,
    error,
    lastUpdated,
    load,
  } = useWorkCreditsDashboard(initialAddress ?? "");

  const pool: WorkCreditsPool | null = data?.pool ?? null;
  const account: WorkCreditsAccount | null = data?.account ?? null;

  // The helper JSON is nested like:
  // pool.reserves.{void,wc,void_raw,wc_raw}
  // pool.price.{wc_per_void,void_per_wc}
  // account.balances.{void,wc,lp,...}
  // account.pending.{wc,wc_raw,...}
  const reserves = (pool as any)?.reserves ?? {};
  const price = (pool as any)?.price ?? {};
  const balances = (account as any)?.balances ?? {};
  const pending = (account as any)?.pending ?? {};

  const wcPerVoid = fmt(
    price.wc_per_void ?? price.wcPerVoid ?? price["wc/void"]
  );
  const voidPerWc = fmt(
    price.void_per_wc ?? price.voidPerWc ?? price["void/wc"]
  );

  const voidReserve = fmt(
    reserves.void ?? reserves.void_human ?? reserves.void_raw
  );
  const wcReserve = fmt(reserves.wc ?? reserves.wc_human ?? reserves.wc_raw);

  const voidBalance = fmt(
    balances.void ?? balances.void_human ?? balances.void_raw
  );
  const wcBalance = fmt(balances.wc ?? balances.wc_human ?? balances.wc_raw);
  const lpBalance = fmt(balances.lp ?? balances.lp_human ?? balances.lp_raw);

  const pendingWc = fmt(
    pending.wc ?? pending.wc_human ?? pending.wc_raw ?? pending.pending_wc
  );

  // For debugging: log whenever data changes
  useEffect(() => {
    if (data) {
      // eslint-disable-next-line no-console
      console.log("[WorkCreditsDashboard] loaded dashboard", data);
    }
  }, [data]);

  const handleSubmit: React.FormEventHandler = (e) => {
    e.preventDefault();
    void load();
  };

  const handleUseDemo = () => {
    setAddress(DEMO_ADDRESS);
    void load(DEMO_ADDRESS);
  };

  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        color: "#eee",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          marginBottom: "1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#9ee6ff",
            }}
          >
            VOID / Obelisk
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#7cf5c9",
            }}
          >
            Devnet · WorkCredits
          </div>
          <div
            style={{
              marginTop: "0.25rem",
              fontSize: "0.75rem",
              color: "#888",
            }}
          >
            Live WC/VOID pool + devnet account balances via helper on :4312
          </div>
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            color: "#6dffb1",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}
        >
          Helper Connected
        </div>
      </header>

      {/* Account bar */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginBottom: "1rem",
          alignItems: "center",
        }}
      >
        <label
          style={{
            fontSize: "0.8rem",
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: "#aaa",
          }}
        >
          Account
        </label>
        <div style={{ flex: "1 1 auto", minWidth: "260px" }}>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={DEMO_ADDRESS}
            spellCheck={false}
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              borderRadius: "999px",
              border: "1px solid #444",
              background: "#050505",
              color: "#eee",
              fontFamily: "monospace",
              fontSize: "0.85rem",
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !address.trim()}
          style={{
            padding: "0.5rem 1.2rem",
            borderRadius: "999px",
            border: "1px solid #8b5cff",
            background: loading ? "#24124b" : "#5a2bd9",
            color: "#f6f0ff",
            fontSize: "0.85rem",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            cursor: loading || !address.trim() ? "default" : "pointer",
            opacity: loading || !address.trim() ? 0.6 : 1,
          }}
        >
          {loading ? "Loading..." : "Load"}
        </button>
        <button
          type="button"
          onClick={handleUseDemo}
          disabled={loading}
          style={{
            padding: "0.5rem 1.2rem",
            borderRadius: "999px",
            border: "1px solid #666",
            background: "#151515",
            color: "#ddd",
            fontSize: "0.8rem",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          Use demo
        </button>
      </form>

      {/* Status line */}
      <div
        style={{
          fontSize: "0.75rem",
          color: "#999",
          marginBottom: "1rem",
          display: "flex",
          justifyContent: "space-between",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <span>
          Endpoint:{" "}
          <code>
            http://127.0.0.1:4312/workcredits/devnet/dashboard/&lt;address&gt;.json
          </code>
        </span>
        {lastUpdated && (
          <span>
            Last updated:{" "}
            {lastUpdated.toLocaleTimeString(undefined, { hour12: false })}
          </span>
        )}
      </div>

      {error && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
            border: "1px solid #a33",
            background: "#220909",
            color: "#ffb3b3",
            fontSize: "0.8rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Main grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        {/* Pool & price */}
        <SectionCard title="Pool & Price">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "0.75rem",
              fontSize: "0.85rem",
            }}
          >
            <div>
              <div style={{ color: "#aaa", marginBottom: "0.15rem" }}>
                Price · WC per 1 VOID
              </div>
              <div style={{ fontFamily: "monospace" }}>{wcPerVoid}</div>
            </div>
            <div>
              <div style={{ color: "#aaa", marginBottom: "0.15rem" }}>
                Price · VOID per 1 WC
              </div>
              <div style={{ fontFamily: "monospace" }}>{voidPerWc}</div>
            </div>
            <div>
              <div style={{ color: "#aaa", marginBottom: "0.15rem" }}>
                VOID Reserve
              </div>
              <div style={{ fontFamily: "monospace" }}>{voidReserve}</div>
            </div>
            <div>
              <div style={{ color: "#aaa", marginBottom: "0.15rem" }}>
                WC Reserve
              </div>
              <div style={{ fontFamily: "monospace" }}>{wcReserve}</div>
            </div>
          </div>
        </SectionCard>

        {/* Account balances */}
        <SectionCard title="Account Balances">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr)",
              gap: "0.5rem",
              fontSize: "0.85rem",
            }}
          >
            <div>
              <div style={{ color: "#aaa", marginBottom: "0.15rem" }}>
                VOID
              </div>
              <div style={{ fontFamily: "monospace" }}>{voidBalance}</div>
            </div>
            <div>
              <div style={{ color: "#aaa", marginBottom: "0.15rem" }}>
                WorkCredits (WC)
              </div>
              <div style={{ fontFamily: "monospace" }}>{wcBalance}</div>
            </div>
            <div>
              <div style={{ color: "#aaa", marginBottom: "0.15rem" }}>
                LP Tokens
              </div>
              <div style={{ fontFamily: "monospace" }}>{lpBalance}</div>
            </div>
            <div>
              <div style={{ color: "#aaa", marginBottom: "0.15rem" }}>
                Pending WC (claimable)
              </div>
              <div style={{ fontFamily: "monospace" }}>{pendingWc}</div>
            </div>

            {/* Stub – wire to RewardEngine claim endpoint later */}
            <button
              type="button"
              disabled={true}
              style={{
                marginTop: "0.5rem",
                padding: "0.5rem 0.75rem",
                borderRadius: "0.5rem",
                border: "1px dashed #555",
                background: "#151515",
                color: "#777",
                fontSize: "0.8rem",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
              title="Wire this to RewardEngine / WorkCredits claim endpoint later"
            >
              Collect Pending WC (stub)
            </button>
          </div>
        </SectionCard>
      </div>

      {/* Raw JSON */}
      <SectionCard title="Raw Devnet Dashboard JSON">
        <pre
          style={{
            margin: 0,
            maxHeight: "260px",
            overflow: "auto",
            fontSize: "0.75rem",
            background: "#050505",
            borderRadius: "0.5rem",
            padding: "0.75rem",
            border: "1px solid #222",
          }}
        >
          {JSON.stringify(
            data ?? { note: "Load a dashboard to see raw JSON here." },
            null,
            2
          )}
        </pre>
      </SectionCard>
    </div>
  );
};
