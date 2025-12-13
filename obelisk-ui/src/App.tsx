import React, { useState } from "react";
import { WalletProvider } from "./wallet/WalletContext";
import { WorkCreditsDashboard } from "./workcredits/WorkCreditsDashboard";
import { WalletDashboard } from "./wallet/WalletDashboard";

type TabId = "wallet" | "workcredits" | "nullfeed";

function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>("workcredits");

  const tabButtonBase: React.CSSProperties = {
    padding: "0.35rem 0.9rem",
    borderRadius: "999px",
    border: "1px solid #333",
    background: "#050509",
    color: "#aaa",
    fontSize: "0.75rem",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    cursor: "pointer",
    outline: "none",
  };
  
  /* LAST_ADDR_SEED_V1 */
  const getLastAddr = (): string | undefined => {
    try {
      const v = localStorage.getItem("obelisk_wallet_addr") || "";
      return /^0x[0-9a-fA-F]{40}$/.test(v.trim()) ? v.trim() : undefined;
    } catch {
      return undefined;
    }
  };


  const renderTabButton = (id: TabId, label: string, subtitle?: string) => {
    const isActive = activeTab === id;

    const style: React.CSSProperties = {
      ...tabButtonBase,
      border: isActive ? "1px solid #8b5cff" : tabButtonBase.border,
      background: isActive
        ? "linear-gradient(90deg,#5a2bd9,#a23bff)"
        : tabButtonBase.background,
      color: isActive ? "#f6f0ff" : tabButtonBase.color,
      opacity: 1,
    };

    return (
      <button
        key={id}
        type="button"
        style={style}
        onClick={() => setActiveTab(id)}
      >
        {label}
        {subtitle ? (
          <span style={{ opacity: 0.6, marginLeft: 6, fontSize: "0.7em" }}>
            {subtitle}
          </span>
        ) : null}
      </button>
    );
  };

  let activeContent: React.ReactNode = null;

  if (activeTab === "wallet") {
    activeContent = <WalletDashboard />;
  } else if (activeTab === "workcredits") {
    activeContent = <WorkCreditsDashboard initialAddress={getLastAddr()} />;
  } else if (activeTab === "nullfeed") {
    activeContent = (
      <section
        style={{
          borderRadius: "0.75rem",
          border: "1px solid #333",
          padding: "1.25rem",
          background: "#050509",
          boxShadow: "0 0 14px rgba(0,0,0,0.7)",
        }}
      >
        <h2
          style={{
            margin: "0 0 0.75rem",
            fontSize: "0.95rem",
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: "#b3f0ff",
          }}
        >
          NullFeed (Devnet Stub)
        </h2>
        <p
          style={{
            margin: "0 0 0.5rem",
            fontSize: "0.85rem",
            color: "#d0e6ff",
          }}
        >
          NullFeed will be the off-chain encrypted chat layer for VOID:
        </p>
        <ul
          style={{
            margin: "0.25rem 0 0.75rem 1.1rem",
            padding: 0,
            fontSize: "0.8rem",
            color: "#99b7ff",
          }}
        >
          <li>Channel list (#general, #tech, #crypto, #void-dev, …).</li>
          <li>
            Hidden channels via <code>#&lt;name&gt;</code> and per-channel admins.
          </li>
          <li>Later: images, bots, and per-channel settings.</li>
        </ul>
        <p
          style={{
            margin: 0,
            fontSize: "0.8rem",
            color: "#7bffb7",
          }}
        >
          For this devnet snapshot it is view-only; wiring the actual chat
          backend is a post-mainnet task.
        </p>
      </section>
    );
  }

  return (
    <div
      style={{
        /* APP_FRAME_FULLBLEED_BG_V1 */ width: "100%", minHeight: "100vh", margin: 0, maxWidth: "none",
        padding: "1.75rem 1.5rem",
        background:
          "radial-gradient(circle at top, #15151f 0, #050509 45%, #000 100%)",
        color: "#eee",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Top bar */}
      <header
        style={{
          maxWidth: "1100px",
          margin: "0 auto 1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.8rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#b3f0ff",
            }}
          >
            VOID / Obelisk Wallet
          </div>
          <div
            style={{
              marginTop: "0.1rem",
              fontSize: "0.8rem",
              color: "#9aa0c2",
            }}
          >
            Devnet snapshot: WorkCredits, wallet shell, and NullFeed stubs.
          </div>
        </div>
        <nav
          style={{
            display: "flex",
            gap: "0.4rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {renderTabButton("wallet", "Wallet", "balances / relayer / WC")}
          {renderTabButton(
            "workcredits",
            "WorkCredits",
            "pool / swaps / helper"
          )}
          {renderTabButton("nullfeed", "NullFeed", "chat layer (stub)")}
        </nav>
      </header>

      {/* Main content */}
      <main
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        {activeContent}
      </main>
    </div>
  );
}

function App() {
  return (
    <WalletProvider>
      <AppShell />
    </WalletProvider>
  );
}

export default App;
