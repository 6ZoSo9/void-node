import React, { useMemo, useState } from "react";
import { isValidHexAddress, parsePositiveAmount } from "./validation";
import * as SwapExec from "./devnetSwapExecutor";

type Side = "buy" | "sell";

interface WorkCreditsTradeWidgetProps {
  address?: string;
  loadedAddress?: string;
  effectiveAddress?: string;
}

type SwapParams = {
  side: Side;
  amountVoid: string;
  address: string;
};

async function callSwapExecutor(params: SwapParams): Promise<void> {
  const m: any = SwapExec as any;
  if (typeof m.executeDevnetSwap === "function") {
    return m.executeDevnetSwap(params);
  }
  if (typeof m.execDevnetSwap === "function") {
    return m.execDevnetSwap(params);
  }
  if (typeof m.default === "function") {
    return m.default(params);
  }
  throw new Error("No compatible devnet swap executor export found");
}

const WorkCreditsTradeWidget: React.FC<WorkCreditsTradeWidgetProps> = ({
  address,
  loadedAddress,
  effectiveAddress,
}) => {
  const [side, setSide] = useState<Side>("buy");
  const [amountVoid, setAmountVoid] = useState<string>("100");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addr = useMemo(
    () => (effectiveAddress || loadedAddress || address || "").trim(),
    [effectiveAddress, loadedAddress, address]
  );

  const amount = parsePositiveAmount(amountVoid);
  const hasAmount = amount > 0;
  const hasAddress = isValidHexAddress(addr);

  const canSubmit = hasAddress && hasAmount && !busy;

  const handleSideClick = (s: Side) => {
    if (busy) return;
    setSide(s);
    setError(null);
  };

  const handleExecute = async () => {
    if (!canSubmit) return;

    try {
      setBusy(true);
      setError(null);

      await callSwapExecutor({
        side,
        amountVoid: amountVoid.trim(),
        address: addr,
      });
    } catch (e: any) {
      console.error("[WorkCreditsTradeWidget] swap failed", e);
      setError(e?.message ?? "Swap failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wc-card wc-card-trade">
      <div className="wc-card-header">
        <div className="wc-card-title">
          TRADE (VOID ⇄ WC) — DEVNET HELPER
        </div>
      </div>

      <div className="wc-card-body space-y-3">
        <div className="wc-toggle-row">
          <button
            type="button"
            className={
              "wc-toggle" +
              (side === "buy" ? " wc-toggle-active" : "") +
              (busy ? " wc-toggle-disabled" : "")
            }
            onClick={() => handleSideClick("buy")}
            disabled={busy}
          >
            Buy WC (send VOID)
          </button>
          <button
            type="button"
            className={
              "wc-toggle" +
              (side === "sell" ? " wc-toggle-active" : "") +
              (busy ? " wc-toggle-disabled" : "")
            }
            onClick={() => handleSideClick("sell")}
            disabled={busy}
          >
            Sell WC (receive VOID)
          </button>
        </div>

        <div className="wc-field">
          <div className="wc-label">You send</div>
          <input
            type="number"
            min="0"
            step="0.000000000000000001"
            value={amountVoid}
            onChange={(e) => {
              setAmountVoid(e.target.value);
              setError(null);
            }}
            className="wc-input"
            placeholder="0.0"
          />
          <div className="wc-subtle">
            UNIT: VOID (debited from your wallet)
          </div>
        </div>

        <div className="wc-field">
          <div className="wc-label">Estimated receive</div>
          <div className="wc-readonly-input">
            {hasAmount ? "≈ " + amount * 100 : "—"}
          </div>
          <div className="wc-subtle">
            You receive WC (approximate; devnet only).
          </div>
        </div>

        <button
          type="button"
          className={
            "wc-primary-btn wc-btn-full" +
            (!canSubmit ? " wc-btn-disabled" : "") +
            (busy ? " wc-btn-busy" : "")
          }
          onClick={handleExecute}
          disabled={!canSubmit}
        >
          {busy ? "Executing swap…" : "Execute devnet swap (via wallet)"}
        </button>

        <div className="wc-helper-text">
          Uses the current MetaMask account and the WorkCredits devnet pool.
          This is purely for testing pricing logic and UI; mainnet will use a
          fresh key / contract set and a real earn/spend loop.
        </div>

        <div className="wc-status-row">
          <div className="wc-status-label">Preconditions</div>
          <ul className="wc-status-list">
            <li className={hasAddress ? "ok" : "bad"}>
              Wallet address loaded
            </li>
            <li className={hasAmount ? "ok" : "bad"}>
              Positive VOID amount
            </li>
          </ul>
        </div>

        {error && <div className="wc-error">{error}</div>}
      </div>
    </div>
  );
};

export default WorkCreditsTradeWidget;
