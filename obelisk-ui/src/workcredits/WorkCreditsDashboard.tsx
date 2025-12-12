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

function formatNumber(n: number | null | undefined, decimals = 4): string {
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

// Simple decimal string -> 18-decimals bigint (DEVNET ONLY, not production-grade)
function toWei(amountStr: string): bigint | null {
  const trimmed = amountStr.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("-")) return null;

  const parts = trimmed.split(".");
  if (parts.length > 2) return null;

  const whole = parts[0] || "0";
  const frac = parts[1] || "";

  if (!/^[0-9]+$/.test(whole) || (frac && !/^[0-9]+$/.test(frac))) {
    return null;
  }

  const fracPadded = (frac + "000000000000000000").slice(0, 18);
  try {
    const wholeBig = BigInt(whole);
    const fracBig = BigInt(fracPadded || "0");
    return wholeBig * 10n ** 18n + fracBig;
  } catch {
    return null;
  }
}

function buildErc20TransferData(to: string, amount: bigint): string {
  const clean = to.trim().toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{40}$/.test(clean)) {
    throw new Error("Recipient must be a 20-byte hex address");
  }
  const toPadded = clean.padStart(64, "0");
  const amtHex = amount.toString(16);
  const amtPadded = amtHex.padStart(64, "0");
  // transfer(address,uint256)
  return "0xa9059cbb" + toPadded + amtPadded;
}

async function sendErc20ViaMetamask(params: {
  tokenAddress: string;
  to: string;
  amountWei: bigint;
}) {
  const { tokenAddress, to, amountWei } = params;
  const w = window as any;
  const ethereum = w.ethereum;
  if (!ethereum) {
    throw new Error("No injected wallet found (MetaMask).");
  }

  const accounts: string[] = await ethereum.request({
    method: "eth_requestAccounts",
  });
  const from = (accounts?.[0] ?? "").toString();
  if (!from) {
    throw new Error("No wallet account available.");
  }

  const data = buildErc20TransferData(to, amountWei);

  const txParams = {
    from,
    to: tokenAddress,
    data,
    value: "0x0",
  };

  const txHash: string = await ethereum.request({
    method: "eth_sendTransaction",
    params: [txParams],
  });

  return { from, txHash };
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

  // Swap side + preview
  const [side, setSide] = useState<SwapSide>("buy_wc");
  const [sendValue, setSendValue] = useState<string>("100");
  const [recvEstimate, setRecvEstimate] = useState<string>("");

  // Send (VOID / WC) panel state
  const [sendToken, setSendToken] = useState<"VOID" | "WC">("VOID");
  const [sendTo, setSendTo] = useState<string>("");
  const [sendAmount, setSendAmount] = useState<string>("");
  const [sendBusy, setSendBusy] = useState(false);

  // Derive simple prices from pool JSON (fallbacks for safety).
  const prices = useMemo(() => {
    const p: any =
      (data as any)?.pool?.prices ??
      (data as any)?.pool?.price ??
      (data as any)?.pool?.priceInfo ??
      {};
    const wcPerVoid = Number(
      p.wc_per_void ?? p.wcPerVoid ?? p["WC_PER_VOID"] ?? 100
    );
    const voidPerWc = Number(
      p.void_per_wc ?? p.voidPerWc ?? p["VOID_PER_WC"] ?? 0.01
    );
    return { wcPerVoid, voidPerWc };
  }, [data]);

  // On load / side change, recompute preview.
  useEffect(() => {
    recomputeEstimate(sendValue, side, prices, setRecvEstimate);
  }, [side, prices.wcPerVoid, prices.voidPerWc]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleSwapSendChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  const pool: any = (data as any)?.pool ?? {};
  const poolReserves: any =
    pool.reserves ??
    pool.pool ??
    pool.reserveInfo ??
    pool["reserves"] ??
    {};

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
  const balancesInfo: any =
    accountInfo.balances ?? accountInfo.Balances ?? {};
  const accountMeta: any = accountInfo.meta ?? {};

  const voidBalance = Number(
    balancesInfo.void ??
      balancesInfo.void_human ??
      balancesInfo.VOID ??
      balancesInfo["void_balance"] ??
      accountInfo.void ??
      0
  );
  const wcBalance = Number(
    balancesInfo.wc ??
      balancesInfo.wc_human ??
      balancesInfo.WC ??
      balancesInfo["wc_balance"] ??
      accountInfo.wc ??
      0
  );

  const voidTokenAddress: string =
    (accountMeta.void_token ??
      accountMeta.voidToken ??
      accountMeta.VOID_TOKEN ??
      "")?.toString() ?? "";
  const wcTokenAddress: string =
    (accountMeta.workcredits_token ??
      accountMeta.workcreditsToken ??
      accountMeta.WORKCREDITS_TOKEN ??
      "")?.toString() ?? "";

  const wcPerVoid = prices.wcPerVoid;
  const voidPerWc = prices.voidPerWc;

  const handleSendSubmit = async () => {
    if (!data) {
      window.alert("Load a devnet dashboard first.");
      return;
    }

    const to = sendTo.trim();
    if (!to) {
      window.alert("Recipient address is required.");
      return;
    }

    const amtWei = toWei(sendAmount);
    if (amtWei === null || amtWei <= 0n) {
      window.alert("Enter a valid positive amount.");
      return;
    }

    const tokenAddr =
      sendToken === "VOID" ? voidTokenAddress : wcTokenAddress;

    if (!tokenAddr || tokenAddr === "0x0000000000000000000000000000000000000000") {
      window.alert("Token address not available from dashboard meta.");
      return;
    }

    const tokenLabel = sendToken === "VOID" ? "VOID" : "WC";

    const confirmText = [
      `Send token: ${tokenLabel}`,
      `From: current MetaMask account`,
      `To  : ${to}`,
      "",
      `Amount (approx): ${sendAmount} ${tokenLabel}`,
      "",
      "This is a DEVNET-only helper using ERC-20 transfer().",
      "",
      "Continue with this devnet send?",
    ].join("\n");

    const ok = window.confirm(confirmText);
    if (!ok) return;

    try {
      setSendBusy(true);
      const { from, txHash } = await sendErc20ViaMetamask({
        tokenAddress: tokenAddr,
        to,
        amountWei: amtWei,
      });
      console.log("devnet send tx", { from, txHash });
      window.alert(
        [
          "Send submitted via MetaMask.",
          "",
          `From : ${from}`,
          `Token: ${tokenLabel}`,
          `To   : ${to}`,
          `Tx   : ${txHash}`,
          "",
          "After the tx confirms, click LOAD to refresh balances.",
        ].join("\n")
      );
    } catch (err: any) {
      console.error("sendErc20ViaMetamask failed", err);
      window.alert(err?.message ?? "Send failed");
    } finally {
      setSendBusy(false);
    }
  };

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
      <header style={{ marginBottom: "0.5rem" }}>
        <div
          style={{
            fontSize: "0.8rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#7dd3fc",
          }}
        >
          VOID / OBELISK
        </div>
        <h1
          style={{
            margin: "0.25rem 0 0.5rem",
            fontSize: "1.25rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          WorkCredits Devnet
        </h1>
        <div
          style={{
            fontSize: "0.75rem",
            color: "#9ca3af",
          }}
        >
          VOID ⇄ WC pool, balances, and devnet-only trading/sending.
        </div>
      </header>

      {/* Address + status */}
      <SectionCard title="Address & Status">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <label
            style={{
              fontSize: "0.8rem",
              color: "#9ca3af",
            }}
          >
            Address
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              value={address}
              onChange={handleAddressInputChange}
              style={{
                flex: 1,
                padding: "0.4rem 0.6rem",
                borderRadius: "0.5rem",
                border: "1px solid #374151",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: "0.8rem",
              }}
              spellCheck={false}
            />
            <button
              onClick={handleUseWalletClick}
              style={{
                padding: "0.4rem 0.7rem",
                borderRadius: "999px",
                border: "1px solid #4b5563",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              Use wallet
            </button>
            <button
              onClick={handleUseDemoClick}
              style={{
                padding: "0.4rem 0.7rem",
                borderRadius: "999px",
                border: "1px solid #4b5563",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              Use demo
            </button>
            <button
              onClick={handleLoadClick}
              disabled={loading}
              style={{
                padding: "0.4rem 0.9rem",
                borderRadius: "999px",
                border: "1px solid #0ea5e9",
                background: loading ? "#0f172a" : "#020617",
                color: loading ? "#6b7280" : "#e0f7ff",
                fontSize: "0.75rem",
                cursor: loading ? "default" : "pointer",
              }}
            >
              {loading ? "Loading…" : "Load"}
            </button>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.7rem",
              color: "#6b7280",
              marginTop: "0.25rem",
            }}
          >
            <span>
              Last updated:{" "}
              {lastUpdated
                ? lastUpdated.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "—"}
            </span>
            <span>
              Status:{" "}
              {error
                ? "Error loading dashboard"
                : data
                ? "OK"
                : loading
                ? "Loading…"
                : "Idle"}
            </span>
          </div>
          {error && (
            <div
              style={{
                marginTop: "0.4rem",
                fontSize: "0.75rem",
                color: "#fecaca",
              }}
            >
              Error: {error}
            </div>
          )}
        </div>
      </SectionCard>

      {/* Pool + balances row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)",
          gap: "1rem",
        }}
      >
        <SectionCard title="Pool (VOID ⇄ WC)">
          <div style={{ fontSize: "0.8rem" }}>
            <div style={{ marginBottom: "0.4rem" }}>
              <div>Price</div>
              <div style={{ color: "#9ca3af", marginTop: "0.1rem" }}>
                1 VOID ≈ {formatNumber(wcPerVoid, 4)} WC
              </div>
              <div style={{ color: "#9ca3af" }}>
                1 WC ≈ {formatNumber(voidPerWc, 6)} VOID
              </div>
            </div>
            <div style={{ marginTop: "0.5rem" }}>
              <div>Reserves</div>
              <div style={{ color: "#9ca3af", marginTop: "0.1rem" }}>
                VOID: {formatNumber(voidReserve, 3)} VOID
              </div>
              <div style={{ color: "#9ca3af" }}>
                WC: {formatNumber(wcReserve, 3)} WC
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Your balances (devnet)">
          <div style={{ fontSize: "0.8rem" }}>
            <div style={{ marginBottom: "0.4rem" }}>
              <div>Address</div>
              <div
                style={{
                  color: "#9ca3af",
                  marginTop: "0.1rem",
                  fontFamily: "monospace",
                  fontSize: "0.7rem",
                }}
              >
                {address || "—"}
              </div>
            </div>
            <div style={{ marginTop: "0.5rem" }}>
              <div>Balances</div>
              <div style={{ color: "#9ca3af", marginTop: "0.1rem" }}>
                VOID: {formatNumber(voidBalance, 6)} VOID
              </div>
              <div style={{ color: "#9ca3af" }}>
                WC: {formatNumber(wcBalance, 6)} WC
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Trade + Send row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1fr)",
          gap: "1rem",
        }}
      >
        {/* Trade card */}
        <SectionCard title="Trade (VOID ⇄ WC) – devnet helper">
          <div style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <div
              style={{
                display: "inline-flex",
                padding: "0.2rem",
                borderRadius: "999px",
                border: "1px solid #374151",
                background: "#020617",
              }}
            >
              <button
                onClick={() => handleSideChange("buy_wc")}
                style={{
                  flex: 1,
                  padding: "0.3rem 0.6rem",
                  borderRadius: "999px",
                  border: "none",
                  background:
                    side === "buy_wc" ? "#0ea5e9" : "transparent",
                  color:
                    side === "buy_wc" ? "#020617" : "#9ca3af",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                Buy WC (send VOID)
              </button>
              <button
                onClick={() => handleSideChange("sell_wc")}
                style={{
                  flex: 1,
                  padding: "0.3rem 0.6rem",
                  borderRadius: "999px",
                  border: "none",
                  background:
                    side === "sell_wc" ? "#0ea5e9" : "transparent",
                  color:
                    side === "sell_wc" ? "#020617" : "#9ca3af",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                Sell WC (receive VOID)
              </button>
            </div>

            <div>
              <div style={{ marginBottom: "0.2rem" }}>You send</div>
              <input
                type="number"
                min="0"
                step="any"
                value={sendValue}
                onChange={handleSwapSendChange}
                style={{
                  width: "100%",
                  padding: "0.4rem 0.6rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                  fontSize: "0.8rem",
                }}
              />
              <div
                style={{
                  marginTop: "0.2rem",
                  fontSize: "0.7rem",
                  color: "#6b7280",
                }}
              >
                {side === "buy_wc"
                  ? "UNIT: VOID (debited from your wallet)"
                  : "UNIT: WC (debited from your wallet)"}
              </div>
            </div>

            <div>
              <div style={{ marginBottom: "0.2rem" }}>Estimated receive</div>
              <input
                type="text"
                readOnly
                value={recvEstimate}
                style={{
                  width: "100%",
                  padding: "0.4rem 0.6rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #111827",
                  background: "#020617",
                  color: "#9ca3af",
                  fontSize: "0.8rem",
                }}
              />
              <div
                style={{
                  marginTop: "0.2rem",
                  fontSize: "0.7rem",
                  color: "#6b7280",
                }}
              >
                {side === "buy_wc"
                  ? "You receive WC (approximate; devnet only)."
                  : "You receive VOID (approximate; devnet only)."}
              </div>
            </div>

            <div style={{ marginTop: "0.4rem" }}>
              <button
                onClick={handleSubmitTrade}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.8rem",
                  borderRadius: "999px",
                  border: "1px solid #0ea5e9",
                  background: "#020617",
                  color: "#e0f7ff",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Execute devnet swap (via wallet)
              </button>
              <div
                style={{
                  marginTop: "0.3rem",
                  fontSize: "0.7rem",
                  color: "#6b7280",
                }}
              >
                Uses the current MetaMask account and the WorkCredits devnet
                pool. This is purely for testing pricing logic and UI; mainnet
                will use a fresh key / contract set and a real earn/spend loop.
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Send card */}
        <SectionCard title="Send (VOID / WC) – devnet helper">
          <div style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <div>
              <div style={{ marginBottom: "0.2rem" }}>From</div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "0.7rem",
                  color: "#9ca3af",
                  wordBreak: "break-all",
                }}
              >
                {address || "(current MetaMask account)"}
              </div>
              <div
                style={{
                  marginTop: "0.2rem",
                  fontSize: "0.7rem",
                  color: "#6b7280",
                }}
              >
                This helper always sends from your currently connected wallet.
              </div>
            </div>

            <div>
              <div style={{ marginBottom: "0.25rem" }}>Asset</div>
              <div
                style={{
                  display: "inline-flex",
                  padding: "0.2rem",
                  borderRadius: "999px",
                  border: "1px solid #374151",
                  background: "#020617",
                }}
              >
                <button
                  onClick={() => setSendToken("VOID")}
                  style={{
                    flex: 1,
                    padding: "0.3rem 0.6rem",
                    borderRadius: "999px",
                    border: "none",
                    background:
                      sendToken === "VOID" ? "#0ea5e9" : "transparent",
                    color:
                      sendToken === "VOID" ? "#020617" : "#9ca3af",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                  }}
                >
                  VOID ({formatNumber(voidBalance, 6)})
                </button>
                <button
                  onClick={() => setSendToken("WC")}
                  style={{
                    flex: 1,
                    padding: "0.3rem 0.6rem",
                    borderRadius: "999px",
                    border: "none",
                    background:
                      sendToken === "WC" ? "#0ea5e9" : "transparent",
                    color:
                      sendToken === "WC" ? "#020617" : "#9ca3af",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                  }}
                >
                  WC ({formatNumber(wcBalance, 6)})
                </button>
              </div>
            </div>

            <div>
              <div style={{ marginBottom: "0.2rem" }}>To address</div>
              <input
                type="text"
                value={sendTo}
                onChange={(e) => setSendTo(e.target.value)}
                placeholder="0x recipient..."
                style={{
                  width: "100%",
                  padding: "0.4rem 0.6rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                  fontSize: "0.8rem",
                }}
                spellCheck={false}
              />
            </div>

            <div>
              <div style={{ marginBottom: "0.2rem" }}>Amount</div>
              <input
                type="number"
                min="0"
                step="any"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.4rem 0.6rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                  fontSize: "0.8rem",
                }}
              />
              <div
                style={{
                  marginTop: "0.2rem",
                  fontSize: "0.7rem",
                  color: "#6b7280",
                }}
              >
                UNIT: {sendToken} (18-decimal; devnet helper only).
              </div>
            </div>

            <div style={{ marginTop: "0.4rem" }}>
              <button
                onClick={handleSendSubmit}
                disabled={sendBusy}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.8rem",
                  borderRadius: "999px",
                  border: "1px solid #22c55e",
                  background: sendBusy ? "#022c22" : "#020617",
                  color: sendBusy ? "#6b7280" : "#bbf7d0",
                  fontSize: "0.85rem",
                  cursor: sendBusy ? "default" : "pointer",
                }}
              >
                {sendBusy ? "Sending…" : "Send (devnet ERC-20 transfer)"}
              </button>
              <div
                style={{
                  marginTop: "0.3rem",
                  fontSize: "0.7rem",
                  color: "#6b7280",
                }}
              >
                Uses ERC-20 <code style={{ fontFamily: "monospace" }}>transfer()</code>{" "}
                on the devnet VOID / WorkCredits tokens, via MetaMask. After the
                transaction confirms, click{" "}
                <span style={{ fontWeight: 600 }}>LOAD</span> above to refresh
                balances.
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
