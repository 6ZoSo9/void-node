import React, { useEffect, useMemo, useState } from "react";
import type { WorkCreditsPool } from "./devnetApi";
import { buildSwapExecutionPlan, executeDevnetSwap, SwapSide } from "./devnetSwapExecutor";

type TradeSide = SwapSide;

interface Props {
  pool: WorkCreditsPool | null;
  // Optional: current wallet address (if you have it wired)
  walletAddress?: string | null;
}

interface QuoteResult {
  ok: boolean;
  side: TradeSide;
  sendAmount: number;
  recvAmount: number;
  spotPriceWcPerVoid: number;
  effectivePriceWcPerVoid: number;
  priceImpactPct: number;
  note?: string;
  error?: string;
}

/**
 * Basic constant-product AMM quote in human units.
 */
function computeQuote(
  side: TradeSide,
  sendAmount: number,
  pool: WorkCreditsPool | null,
): QuoteResult {
  const reserves = (pool as any)?.reserves ?? {};
  const V = Number(
    reserves.void ??
      reserves.void_human ??
      reserves.VOID ??
      reserves["void_reserve"] ??
      0,
  );
  const W = Number(
    reserves.wc ?? reserves.wc_human ?? reserves.WC ?? reserves["wc_reserve"] ?? 0,
  );

  if (!pool || !Number.isFinite(V) || !Number.isFinite(W) || V <= 0 || W <= 0) {
    return {
      ok: false,
      side,
      sendAmount,
      recvAmount: 0,
      spotPriceWcPerVoid: NaN,
      effectivePriceWcPerVoid: NaN,
      priceImpactPct: 0,
      error: "Pool reserves unavailable",
    };
  }

  if (!Number.isFinite(sendAmount) || sendAmount <= 0) {
    return {
      ok: false,
      side,
      sendAmount,
      recvAmount: 0,
      spotPriceWcPerVoid: W / V,
      effectivePriceWcPerVoid: W / V,
      priceImpactPct: 0,
      error: "Enter an amount greater than zero",
    };
  }

  const k = V * W;
  const spotPrice = W / V;

  let recvAmount = 0;
  let note: string | undefined;

  if (side === "buy_wc") {
    const Vprime = V + sendAmount;
    const Wprime = k / Vprime;
    recvAmount = W - Wprime;
  } else {
    const Wprime = W + sendAmount;
    const Vprime = k / Wprime;
    recvAmount = V - Vprime;
  }

  if (!Number.isFinite(recvAmount) || recvAmount <= 0) {
    return {
      ok: false,
      side,
      sendAmount,
      recvAmount: 0,
      spotPriceWcPerVoid: spotPrice,
      effectivePriceWcPerVoid: spotPrice,
      priceImpactPct: 0,
      error: "Trade too small or invalid for current pool state",
    };
  }

  let effectivePriceWcPerVoid: number;
  if (side === "buy_wc") {
    effectivePriceWcPerVoid = recvAmount / sendAmount;
  } else {
    const voidPerWc = recvAmount / sendAmount;
    effectivePriceWcPerVoid = voidPerWc > 0 ? 1 / voidPerWc : NaN;
  }

  const impact =
    Number.isFinite(effectivePriceWcPerVoid) && spotPrice > 0
      ? ((spotPrice - effectivePriceWcPerVoid) / spotPrice) * 100
      : 0;

  const tradeFraction =
    side === "buy_wc" ? sendAmount / V : sendAmount / W;

  if (tradeFraction > 0.1) {
    note =
      "Large trade vs pool size; price impact will be significant on a real chain.";
  }

  return {
    ok: true,
    side,
    sendAmount,
    recvAmount,
    spotPriceWcPerVoid: spotPrice,
    effectivePriceWcPerVoid,
    priceImpactPct: impact,
    note,
  };
}

function fmt(num: number | string | null | undefined, digits = 4): string {
  if (num === null || num === undefined) return "—";
  if (typeof num === "string") return num;
  if (!Number.isFinite(num)) return "—";
  if (Math.abs(num) >= 1_000_000_000_000) return num.toExponential(3);
  if (Math.abs(num) >= 1_000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (Math.abs(num) === 0) return "0";
  return num.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export const WorkCreditsTradeWidget: React.FC<Props> = ({ pool, walletAddress }) => {
  const [side, setSide] = useState<TradeSide>("buy_wc");
  const [sendAmountInput, setSendAmountInput] = useState<string>("100");
  const [quote, setQuote] = useState<QuoteResult | null>(null);

  const sendLabel = side === "buy_wc" ? "You send (VOID)" : "You send (WC)";
  const recvLabel = side === "buy_wc" ? "You receive (WC)" : "You receive (VOID)";

  const sendAmount = useMemo(() => {
    const n = Number(sendAmountInput);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [sendAmountInput]);

  useEffect(() => {
    if (!pool) {
      setQuote(null);
      return;
    }
    const q = computeQuote(side, sendAmount, pool);
    setQuote(q);
  }, [pool, side, sendAmount]);

  const handleSideChange = (next: TradeSide) => {
    setSide(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote || !quote.ok) return;

    const from = walletAddress ?? ""; // later: require wallet when doing real txs

    try {
      const plan = buildSwapExecutionPlan({
        side,
        from,
        sendAmount: quote.sendAmount,
        recvAmount: quote.recvAmount,
        slippagePct: 0.5,
      });

      // Store globally for debugging
      (window as any).__void_workcredits_lastSwapPlan = plan;

      await executeDevnetSwap(plan);

      alert(
        "Trade execution is not wired to the chain yet.\n\n" +
          `Planned devnet trade:\n` +
          `  side: ${plan.side}\n` +
          `  from: ${plan.from || "(no wallet set)"}\n` +
          `  send: ${fmt(quote.sendAmount, 6)} ${plan.side === "buy_wc" ? "VOID" : "WC"}\n` +
          `  recv: ${fmt(quote.recvAmount, 6)} ${plan.side === "buy_wc" ? "WC" : "VOID"}\n` +
          `  min recv (with slippage): ${plan.minRecvAmount}\n\n` +
          "Next step: wire executeDevnetSwap(...) to call the real WorkCredits pool via MetaMask.",
      );
    } catch (err: any) {
      console.error("[WorkCreditsTradeWidget] swap plan failed", err);
      alert(`Failed to build swap plan: ${err?.message ?? String(err)}`);
    }
  };

  const reserves = (pool as any)?.reserves ?? {};
  const V = Number(
    reserves.void ??
      reserves.void_human ??
      reserves.VOID ??
      reserves["void_reserve"] ??
      0,
  );
  const W = Number(
    reserves.wc ?? reserves.wc_human ?? reserves.WC ?? reserves["wc_reserve"] ?? 0,
  );
  const price = (pool as any)?.price ?? {};
  const wcPerVoidFromPool =
    price.wc_per_void ?? price["wc/void"] ?? (V > 0 ? W / V : null);
  const voidPerWcFromPool =
    price.void_per_wc ?? price["void/wc"] ?? (W > 0 ? V / W : null);

  const spot = quote?.spotPriceWcPerVoid ?? Number(wcPerVoidFromPool ?? NaN);
  const eff = quote?.effectivePriceWcPerVoid ?? spot;

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginTop: "1rem",
        marginBottom: "1rem",
        padding: "1rem",
        borderRadius: "0.75rem",
        border: "1px solid #333",
        background: "#050509",
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
        WC / VOID Trade (Preview → Plan)
      </h2>

      {/* Side toggle */}
      <div
        style={{
          display: "inline-flex",
          borderRadius: "999px",
          border: "1px solid #444",
          overflow: "hidden",
          marginBottom: "0.75rem",
        }}
      >
        <button
          type="button"
          onClick={() => handleSideChange("buy_wc")}
          style={{
            padding: "0.35rem 0.9rem",
            fontSize: "0.8rem",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            border: "none",
            cursor: "pointer",
            background: side === "buy_wc" ? "#5a2bd9" : "transparent",
            color: side === "buy_wc" ? "#f6f0ff" : "#ccc",
          }}
        >
          Buy WC
        </button>
        <button
          type="button"
          onClick={() => handleSideChange("sell_wc")}
          style={{
            padding: "0.35rem 0.9rem",
            fontSize: "0.8rem",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            border: "none",
            cursor: "pointer",
            background: side === "sell_wc" ? "#5a2bd9" : "transparent",
            color: side === "sell_wc" ? "#f6f0ff" : "#ccc",
          }}
        >
          Sell WC
        </button>
      </div>

      {/* Amounts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: "0.75rem",
          marginBottom: "0.75rem",
        }}
      >
        <div>
          <div
            style={{
              marginBottom: "0.25rem",
              fontSize: "0.8rem",
              color: "#aaa",
            }}
          >
            {sendLabel}
          </div>
          <input
            type="number"
            min="0"
            step="0.000000000000000001"
            value={sendAmountInput}
            onChange={(e) => setSendAmountInput(e.target.value)}
            style={{
              width: "100%",
              padding: "0.4rem 0.7rem",
              borderRadius: "0.5rem",
              border: "1px solid #444",
              background: "#0b0b12",
              color: "#eee",
              fontFamily: "monospace",
              fontSize: "0.85rem",
            }}
          />
        </div>
        <div>
          <div
            style={{
              marginBottom: "0.25rem",
              fontSize: "0.8rem",
              color: "#aaa",
            }}
          >
            {recvLabel} (estimated)
          </div>
          <div
            style={{
              width: "100%",
              padding: "0.4rem 0.7rem",
              borderRadius: "0.5rem",
              border: "1px solid #222",
              background: "#050509",
              color: "#eee",
              fontFamily: "monospace",
              fontSize: "0.85rem",
            }}
          >
            {quote && quote.ok ? fmt(quote.recvAmount, 6) : "—"}
          </div>
        </div>
      </div>

      {/* Price + impact */}
      <div
        style={{
          fontSize: "0.8rem",
          color: "#bbb",
          marginBottom: "0.75rem",
        }}
      >
        <div>
          <span style={{ color: "#888" }}>Price (from pool): </span>
          <span style={{ fontFamily: "monospace" }}>
            1 VOID ≈ {fmt(wcPerVoidFromPool ?? spot, 4)} WC
          </span>
          {"  "}
          <span style={{ color: "#555" }}>
            (1 WC ≈ {fmt(voidPerWcFromPool ?? (1 / spot), 6)} VOID)
          </span>
        </div>
        {quote && quote.ok && (
          <div style={{ marginTop: "0.25rem" }}>
            <span style={{ color: "#888" }}>Effective trade price: </span>
            <span style={{ fontFamily: "monospace" }}>
              1 VOID ≈ {fmt(eff, 4)} WC
            </span>
            {"  "}
            <span
              style={{
                marginLeft: "0.35rem",
                color:
                  Math.abs(quote.priceImpactPct) < 0.5
                    ? "#7cf5c9"
                    : Math.abs(quote.priceImpactPct) < 5
                    ? "#f5e37c"
                    : "#ff9f9f",
              }}
            >
              ({fmt(quote.priceImpactPct, 2)}% impact vs spot)
            </span>
          </div>
        )}
        <div style={{ marginTop: "0.25rem", color: "#666" }}>
          Preview only — slippage applied client-side; no on-chain tx yet.
        </div>
        {quote && quote.note && (
          <div style={{ marginTop: "0.25rem", color: "#f0c27b" }}>
            {quote.note}
          </div>
        )}
        {quote && !quote.ok && quote.error && (
          <div style={{ marginTop: "0.25rem", color: "#ff9f9f" }}>
            {quote.error}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!quote || !quote.ok}
        style={{
          marginTop: "0.25rem",
          padding: "0.55rem 1.4rem",
          borderRadius: "999px",
          border: "1px solid #8b5cff",
          background: !quote || !quote.ok ? "#1a1530" : "#5a2bd9",
          color: "#f6f0ff",
          fontSize: "0.85rem",
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          cursor: !quote || !quote.ok ? "default" : "pointer",
          opacity: !quote || !quote.ok ? 0.55 : 1,
        }}
      >
        Submit Trade (build plan)
      </button>
    </form>
  );
};
