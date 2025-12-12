import React, { useMemo, useState } from "react";
import { isValidHexAddress, parsePositiveAmount } from "./validation";
import * as TransferExec from "./devnetTransferExecutor";

type AssetKind = "void" | "wc";

interface WorkCreditsTransferWidgetProps {
  fromAddress?: string;
}

type TransferParams = {
  asset: AssetKind;
  to: string;
  amountRaw: string;
  fromOverride?: string;
};

async function callTransferExecutor(params: TransferParams): Promise<void> {
  const m: any = TransferExec as any;
  if (typeof m.executeDevnetTransfer === "function") {
    return m.executeDevnetTransfer(params);
  }
  if (typeof m.execDevnetTransfer === "function") {
    return m.execDevnetTransfer(params);
  }
  if (typeof m.default === "function") {
    return m.default(params);
  }
  throw new Error("No compatible devnet transfer executor export found");
}

const WorkCreditsTransferWidget: React.FC<WorkCreditsTransferWidgetProps> = ({
  fromAddress,
}) => {
  const [asset, setAsset] = useState<AssetKind>("void");
  const [to, setTo] = useState<string>("");
  const [amount, setAmount] = useState<string>("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = useMemo(
    () => (fromAddress || "").trim(),
    [fromAddress]
  );

  const hasFrom = !from || isValidHexAddress(from);
  const hasTo = isValidHexAddress(to);
  const amountNum = parsePositiveAmount(amount);
  const hasAmount = amountNum > 0;

  const canSend = hasFrom && hasTo && hasAmount && !busy;

  const handleSend = async () => {
    if (!canSend) return;

    try {
      setBusy(true);
      setError(null);

      await callTransferExecutor({
        asset,
        to: to.trim(),
        amountRaw: amount.trim(),
        fromOverride: from || undefined,
      });
    } catch (e: any) {
      console.error("[WorkCreditsTransferWidget] transfer failed", e);
      setError(e?.message ?? "Transfer failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wc-card wc-card-transfer">
      <div className="wc-card-header">
        <div className="wc-card-title">
          SEND (VOID / WC) — DEVNET HELPER
        </div>
      </div>

      <div className="wc-card-body space-y-3">
        <div className="wc-field">
          <div className="wc-label">From</div>
          <div className="wc-readonly-input">
            {from && isValidHexAddress(from)
              ? from
              : "(current connected wallet)"}
          </div>
          <div className="wc-subtle">
            This helper sends from your currently connected wallet, unless an
            explicit fromAddress is provided.
          </div>
        </div>

        <div className="wc-toggle-row">
          <button
            type="button"
            className={
              "wc-toggle" +
              (asset === "void" ? " wc-toggle-active" : "") +
              (busy ? " wc-toggle-disabled" : "")
            }
            onClick={() => !busy && setAsset("void")}
            disabled={busy}
          >
            VOID
          </button>
          <button
            type="button"
            className={
              "wc-toggle" +
              (asset === "wc" ? " wc-toggle-active" : "") +
              (busy ? " wc-toggle-disabled" : "")
            }
            onClick={() => !busy && setAsset("wc")}
            disabled={busy}
          >
            WC
          </button>
        </div>

        <div className="wc-field">
          <div className="wc-label">To address</div>
          <input
            type="text"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setError(null);
            }}
            className="wc-input"
            placeholder="0x recipient…"
          />
        </div>

        <div className="wc-field">
          <div className="wc-label">Amount</div>
          <input
            type="number"
            min="0"
            step="0.000000000000000001"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError(null);
            }}
            className="wc-input"
            placeholder="0.0"
          />
          <div className="wc-subtle">
            UNIT: {asset === "void" ? "VOID" : "WC"} (18-decimal; devnet only).
          </div>
        </div>

        <button
          type="button"
          className={
            "wc-primary-btn wc-btn-full" +
            (!canSend ? " wc-btn-disabled" : "") +
            (busy ? " wc-btn-busy" : "")
          }
          onClick={handleSend}
          disabled={!canSend}
        >
          {busy ? "Sending…" : "Send (devnet helper)"}
        </button>

        <div className="wc-status-row">
          <div className="wc-status-label">Preconditions</div>
          <ul className="wc-status-list">
            <li className={hasFrom ? "ok" : "bad"}>From address / wallet OK</li>
            <li className={hasTo ? "ok" : "bad"}>Valid recipient address</li>
            <li className={hasAmount ? "ok" : "bad"}>Positive amount</li>
          </ul>
        </div>

        {error && <div className="wc-error">{error}</div>}
      </div>
    </div>
  );
};

export default WorkCreditsTransferWidget;
