import React, { useEffect, useMemo, useState } from "react";
import { useWorkCreditsDashboard } from "./useWorkCreditsDashboard";
import {
  buildSwapExecutionPlan,
  executeDevnetSwap,
  SwapSide,
} from "./devnetSwapExecutor";

const DEMO_ADDRESS = "0x1111111111111111111111111111111111111111";

function SectionCard(props: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        borderRadius: "0.75rem",
        border: "1px solid #333",
        padding: "1rem",
        background: "#050509",
        boxShadow: "0 0 12px rgba(0,0,0,0.7)",
      }}
    >
      <h2
        style={{
          margin: "0 0 0.75rem",
          fontSize: "0.9rem",
          textTransform: "uppercase",
          letterSpacing: "0.16em",
          color: "#9ee6ff",
        }}
      >
        {props.title}
      </h2>
      {props.children}
    </section>
  );
}

function formatNumber(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function recomputeEstimate(
  rawSend: string,
  side: SwapSide,
  prices: { wcPerVoid: number; voidPerWc: number },
  setRecvEstimate: (value: string) => void
) {
  const send = Number(rawSend);
  if (!Number.isFinite(send) || send <= 0) {
    setRecvEstimate("");
    return;
  }

  if (side === "buy_wc") {
    const recv = send * (Number.isFinite(prices.wcPerVoid) ? prices.wcPerVoid : 0);
    setRecvEstimate(recv.toString());
  } else {
    const recv = send * (Number.isFinite(prices.voidPerWc) ? prices.voidPerWc : 0);
    setRecvEstimate(recv.toString());
  }
}

export const WorkCreditsDashboard: React.FC = () => {
  const {
    address,
    setAddress,
    data,
    loading,
    error,
    lastUpdated,
    load,
  } = useWorkCreditsDashboard(DEMO_ADDRESS);

  const [side, setSide] = useState<SwapSide>("buy_wc");
  const [sendValue, setSendValue] = useState<string>("100");
  const [recvEstimate, setRecvEstimate] = useState<string>("9999");

  // Derive simple prices from pool JSON (fallbacks for safety).
  const prices = useMemo(() => {
    const p: any = (data as any)?.pool?.prices ?? {};
    const wcPerVoid = Number(p.wc_per_void ?? 100);
    const voidPerWc = Number(p.void_per_wc ?? 0.01);
    return { wcPerVoid, voidPerWc };
  }, [data]);

  // On load / side change, recompute preview.
  useEffect(() => {
    recomputeEstimate(sendValue, side, prices, setRecvEstimate);
  }, [side, prices.wcPerVoid, prices.voidPerWc]);

  const handleAddressInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setAddress(e.target.value);
  };

  const handleLoadClick = () => {
    load();
  };

  const handleUseDemoClick = () => {
    setAddress(DEMO_ADDRESS);
    load(DEMO_ADDRESS);
  };

  const handleUseWalletClick = async () => {
    try {
      const w = window as any;
      const ethereum = w.ethereum;
      if (!ethereum) {
        window.alert("No injected wallet found (MetaMask).");
        return;
      }
      const accounts: string[] = await ethereum.request({
        method: "eth_requestAccounts",
      });
      const acct = (accounts?.[0] ?? "").toString();
      if (!acct) {
        window.alert("No wallet account available.");
        return;
      }
      setAddress(acct);
      load(acct);
    } catch (err: any) {
      console.error("Use wallet failed", err);
      window.alert(err?.message ?? "Failed to use wallet");
    }
  };

  const handleSendChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSendValue(v);
    recomputeEstimate(v, side, prices, setRecvEstimate);
  };

  const handleSideChange = (next: SwapSide) => {
    setSide(next);
    recomputeEstimate(sendValue, next, prices, setRecvEstimate);
  };

  const handleSubmitTrade = async () => {
    const send = Number(sendValue);
    const recv = Number(recvEstimate);

    if (!data) {
      window.alert("Load a devnet dashboard first.");
      return;
    }
    if (!Number.isFinite(send) || send <= 0) {
      window.alert("Enter a valid send amount.");
      return;
    }
    if (!Number.isFinite(recv) || recv <= 0) {
      window.alert("Receive estimate is invalid.");
      return;
    }

    let plan;
    try {
      plan = buildSwapExecutionPlan({
        side,
        from: "", // let executor use wallet address
        sendAmount: send,
        recvAmount: recv,
        slippagePct: 0.5,
      });
    } catch (err: any) {
      console.error("buildSwapExecutionPlan failed", err);
      window.alert(err?.message ?? "Failed to build swap plan");
      return;
    }

    (window as any).__void_workcredits_lastSwapPlan = plan;

    const sideLabel =
      side === "buy_wc" ? "BUY WC (send VOID)" : "SELL WC (receive VOID)";

    const confirmText = [
      `Side: ${sideLabel}`,
      `From wallet: (current MetaMask account)`,
      "",
      `Send: ${plan.sendAmount} ${side === "buy_wc" ? "VOID" : "WC"}`,
      `Recv est: ${plan.recvAmount} ${side === "buy_wc" ? "WC" : "VOID"}`,
      `Min recv (with slippage): ${plan.minRecvAmount}`,
      "",
      "This is a DEVNET-only trade via the helper.",
      "On mainnet we'll rewire this with real keys and contracts.",
      "",
      "Continue with this devnet swap?",
    ].join("\n");

    const ok = window.confirm(confirmText);
    if (!ok) return;

    try {
      await executeDevnetSwap(plan);
      window.alert(
        "Swap submitted. After the tx confirms, click LOAD to refresh balances."
      );
    } catch (err: any) {
      console.error("executeDevnetSwap failed", err);
      window.alert(err?.message ?? "Swap failed");
    }
  };

  // Pool + account mapping
  const poolReserves =
    (data as any)?.reserves ?? (data as any)?.pool?.reserves ?? {};

  const voidReserve = Number(
    poolReserves.void ??
      poolReserves.void_decoded ??
      poolReserves.VOID ??
      poolReserves["void_reserve"] ??
      0
  );
  const wcReserve = Number(
    poolReserves.wc ??
      poolReserves.wc_decoded ??
      poolReserves.WC ??
      poolReserves["wc_reserve"] ??
      0
  );

  const accountInfo: any = (data as any)?.account ?? {};

  const voidBalance = Number(
    accountInfo.void ??
      accountInfo.void_human ??
      accountInfo.VOID ??
      accountInfo["void_balance"] ??
      0
  );
  const wcBalance = Number(
    accountInfo.wc ??
      accountInfo.wc_human ??
      accountInfo.WC ??
      accountInfo["wc_balance"] ??
      0
  );

  const wcPerVoid = prices.wcPerVoid;
  const voidPerWc = prices.voidPerWc;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        color: "#e0f7ff",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        background: "radial-gradient(circle at top, #101020 0, #020308 55%)",
        minHeight: "100vh",
        padding: "1.5rem",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem",
        }}
      >
        <div
          style={{
            fontSize: "0.85rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#d5f3ff",
          }}
        >
          VOID / OBELISK ·{" "}
          <span style={{ color: "#7de9ff" }}>DEVNET · WORKCREDITS</span>
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            color: "#ffc857",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}
        >
          Devnet · View-Only
        </div>
      </div>

      {/* Account row */}
      <SectionCard title="WorkCredits Devnet Dashboard">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "center",
            marginBottom: "0.75rem",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#aaa" }}>Account</div>
          <input
            style={{
              flex: "1 1 260px",
              minWidth: "260px",
              padding: "0.45rem 0.6rem",
              borderRadius: "999px",
              border: "1px solid #444",
              background: "#020308",
              color: "#f0fbff",
              fontSize: "0.8rem",
            }}
            value={address}
            onChange={handleAddressInputChange}
            placeholder="0x… address (devnet)"
          />
          <button
            type="button"
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "999px",
              border: "1px solid #444",
              background: "#0b1723",
              color: "#dff9ff",
              fontSize: "0.75rem",
            }}
            onClick={handleUseDemoClick}
          >
            Use Demo
          </button>
          <button
            type="button"
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "999px",
              border: "1px solid #444",
              background: "#071824",
              color: "#9fffe0",
              fontSize: "0.75rem",
            }}
            onClick={handleUseWalletClick}
          >
            Use Wallet
          </button>
          <button
            type="button"
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "999px",
              border: "1px solid #3aa3ff",
              background: "#0b2235",
              color: "#e7f6ff",
              fontSize: "0.75rem",
            }}
            onClick={handleLoadClick}
          >
            Load
          </button>
        </div>

        <div
          style={{
            fontSize: "0.75rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            color: "#9cbdd0",
          }}
        >
          {loading && <span>Loading devnet helper…</span>}
          {error && (
            <span style={{ color: "#ff9090" }}>
              Error: {error}
            </span>
          )}
          {lastUpdated && !loading && !error && (
            <span>
              Last updated:{" "}
              {lastUpdated.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          )}
        </div>
      </SectionCard>

      {/* Pool + prices */}
      <SectionCard title="Pool Reserves & Price">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1.5rem",
            fontSize: "0.8rem",
          }}
        >
          <div>
            <div style={{ opacity: 0.7, marginBottom: "0.15rem" }}>VOID reserve</div>
            <div style={{ fontSize: "1rem" }}>
              {formatNumber(voidReserve, 0)} <span style={{ opacity: 0.7 }}>VOID</span>
            </div>
          </div>
          <div>
            <div style={{ opacity: 0.7, marginBottom: "0.15rem" }}>WC reserve</div>
            <div style={{ fontSize: "1rem" }}>
              {formatNumber(wcReserve, 0)} <span style={{ opacity: 0.7 }}>WC</span>
            </div>
          </div>
          <div>
            <div style={{ opacity: 0.7, marginBottom: "0.15rem" }}>WC per 1 VOID</div>
            <div style={{ fontSize: "1rem" }}>
              {formatNumber(wcPerVoid, 4)}
            </div>
          </div>
          <div>
            <div style={{ opacity: 0.7, marginBottom: "0.15rem" }}>VOID per 1 WC</div>
            <div style={{ fontSize: "1rem" }}>
              {formatNumber(voidPerWc, 6)}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Wallet balances */}
      <SectionCard title="Wallet Balances (View-Only, Devnet)">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1.5rem",
            fontSize: "0.8rem",
          }}
        >
          <div>
            <div style={{ opacity: 0.7, marginBottom: "0.15rem" }}>VOID balance</div>
            <div style={{ fontSize: "1rem" }}>
              {formatNumber(voidBalance, 4)}{" "}
              <span style={{ opacity: 0.7 }}>VOID</span>
            </div>
          </div>
          <div>
            <div style={{ opacity: 0.7, marginBottom: "0.15rem" }}>WC balance</div>
            <div style={{ fontSize: "1rem" }}>
              {formatNumber(wcBalance, 4)}{" "}
              <span style={{ opacity: 0.7 }}>WC</span>
            </div>
          </div>
        </div>
        <p
          style={{
            marginTop: "0.75rem",
            fontSize: "0.7rem",
            color: "#9cbdd0",
            maxWidth: "480px",
          }}
        >
          This is a devnet-only view. The on-chain owner for the WorkCredits
          pool is a separate dev key; this UI will not mint/faucet to your
          wallet. For mainnet we will rotate to fresh keys and wire a real
          funding/earn path.
        </p>
      </SectionCard>

      {/* Trade widget (devnet) */}
      <SectionCard title="Swap Preview (Devnet Helper)">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            fontSize: "0.8rem",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              borderRadius: "999px",
              border: "1px solid #444",
              overflow: "hidden",
              marginBottom: "0.5rem",
            }}
          >
            <button
              type="button"
              onClick={() => handleSideChange("buy_wc")}
              style={{
                padding: "0.35rem 0.9rem",
                fontSize: "0.75rem",
                border: "none",
                background:
                  side === "buy_wc" ? "#0c304a" : "transparent",
                color: side === "buy_wc" ? "#dff9ff" : "#9db1c0",
              }}
            >
              Buy WC (send VOID)
            </button>
            <button
              type="button"
              onClick={() => handleSideChange("sell_wc")}
              style={{
                padding: "0.35rem 0.9rem",
                fontSize: "0.75rem",
                border: "none",
                background:
                  side === "sell_wc" ? "#0c304a" : "transparent",
                color: side === "sell_wc" ? "#dff9ff" : "#9db1c0",
              }}
            >
              Sell WC (receive VOID)
            </button>
          </div>

          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
            }}
          >
            <span style={{ opacity: 0.75 }}>
              You send ({side === "buy_wc" ? "VOID" : "WC"})
            </span>
            <input
              value={sendValue}
              onChange={handleSendChange}
              style={{
                maxWidth: "220px",
                padding: "0.4rem 0.6rem",
                borderRadius: "0.5rem",
                border: "1px solid #444",
                background: "#020308",
                color: "#f0fbff",
                fontSize: "0.8rem",
              }}
            />
          </label>

          <div>
            <div style={{ opacity: 0.75, marginBottom: "0.15rem" }}>
              You receive (estimate)
            </div>
            <div style={{ fontSize: "1rem" }}>
              {recvEstimate ? recvEstimate : "—"}{" "}
              <span style={{ opacity: 0.7 }}>
                {side === "buy_wc" ? "WC" : "VOID"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmitTrade}
            style={{
              marginTop: "0.5rem",
              alignSelf: "flex-start",
              padding: "0.45rem 1.1rem",
              borderRadius: "999px",
              border: "1px solid #3aa3ff",
              background: "#0b2235",
              color: "#e7f6ff",
              fontSize: "0.8rem",
            }}
          >
            Execute Devnet Swap (via Wallet)
          </button>

          <p
            style={{
              fontSize: "0.7rem",
              color: "#9cbdd0",
              maxWidth: "520px",
              marginTop: "0.5rem",
            }}
          >
            This uses the current MetaMask account and the WorkCredits devnet
            pool. It is purely for testing pricing logic and UI; mainnet will
            use a fresh key / contract set and a real earn/spend loop.
          </p>
        </div>
      </SectionCard>
    </div>
  );
};
