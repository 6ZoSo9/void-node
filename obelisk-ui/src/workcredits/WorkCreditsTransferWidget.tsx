import React, { useState } from "react";
import { executeDevnetTransfer, TransferToken } from "./devnetTransferExecutor";

interface Props {
  fromAddress?: string | null;
  voidBalance?: number;
  wcBalance?: number;
  onAfterTransfer?: () => void;
}

export const WorkCreditsTransferWidget: React.FC<Props> = ({
  fromAddress,
  voidBalance,
  wcBalance,
  onAfterTransfer,
}) => {
  const [token, setToken] = useState<TransferToken>("void");
  const [to, setTo] = useState<string>("");
  const [amount, setAmount] = useState<string>("0");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedFrom = (fromAddress ?? "").trim();

  const handleSubmit = async () => {
    setError(null);
    const amt = Number(amount);

    if (!to.trim()) {
      setError("Recipient address is required.");
      return;
    }
    if (!to.startsWith("0x") || to.length !== 42) {
      setError("Recipient must be a 0x... address.");
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a positive amount.");
      return;
    }

    if (token === "void" && voidBalance !== undefined) {
      if (amt > voidBalance) {
        setError("Amount exceeds your VOID balance.");
        return;
      }
    }
    if (token === "wc" && wcBalance !== undefined) {
      if (amt > wcBalance) {
        setError("Amount exceeds your WC balance.");
        return;
      }
    }

    const symbol = token === "void" ? "VOID" : "WC";

    const confirmLines = [
      `Send ${amt} ${symbol}`,
      `From: ${normalizedFrom || "(current MetaMask account)"}`,
      `To:   ${to}`,
      "",
      "This is a DEVNET-only transfer.",
      "Continue?",
    ];
    const ok = window.confirm(confirmLines.join("\n"));
    if (!ok) return;

    try {
      setPending(true);
      await executeDevnetTransfer({ token, to, amount: amt });
      if (onAfterTransfer) {
        onAfterTransfer();
      }
      window.alert(
        "Transfer submitted. Reload the dashboard to see updated balances."
      );
      setAmount("0");
    } catch (err: any) {
      console.error("executeDevnetTransfer failed", err);
      setError(err?.message ?? "Transfer failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ fontSize: "0.8rem", color: "#9bb" }}>
        From:{" "}
        <span style={{ fontFamily: "monospace" }}>
          {normalizedFrom || "(MetaMask active account)"}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => setToken("void")}
          style={{
            padding: "0.25rem 0.6rem",
            borderRadius: "999px",
            border: "1px solid #555",
            background: token === "void" ? "#1b2838" : "#050509",
            color: "#e0f7ff",
            fontSize: "0.8rem",
            cursor: "pointer",
          }}
        >
          VOID
          {voidBalance !== undefined && (
            <span style={{ opacity: 0.8, marginLeft: 6 }}>
              ({voidBalance.toFixed(3)})
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setToken("wc")}
          style={{
            padding: "0.25rem 0.6rem",
            borderRadius: "999px",
            border: "1px solid #555",
            background: token === "wc" ? "#1b2838" : "#050509",
            color: "#e0f7ff",
            fontSize: "0.8rem",
            cursor: "pointer",
          }}
        >
          WC
          {wcBalance !== undefined && (
            <span style={{ opacity: 0.8, marginLeft: 6 }}>
              ({wcBalance.toFixed(1)})
            </span>
          )}
        </button>
      </div>

      <label style={{ fontSize: "0.8rem" }}>
        To address
        <input
          type="text"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="0x recipient..."
          style={{
            width: "100%",
            marginTop: "0.2rem",
            padding: "0.35rem 0.5rem",
            borderRadius: "0.5rem",
            border: "1px solid #444",
            background: "#050509",
            color: "#e0f7ff",
            fontFamily: "monospace",
            fontSize: "0.8rem",
          }}
        />
      </label>

      <label style={{ fontSize: "0.8rem" }}>
        Amount
        <input
          type="number"
          min="0"
          step="0.0001"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{
            width: "100%",
            marginTop: "0.2rem",
            padding: "0.35rem 0.5rem",
            borderRadius: "0.5rem",
            border: "1px solid #444",
            background: "#050509",
            color: "#e0f7ff",
            fontSize: "0.8rem",
          }}
        />
      </label>

      {error && (
        <div style={{ color: "#ff8080", fontSize: "0.75rem" }}>{error}</div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={pending}
        style={{
          marginTop: "0.25rem",
          padding: "0.4rem 0.8rem",
          borderRadius: "0.6rem",
          border: "1px solid #66e",
          background: pending ? "#111728" : "#191f3a",
          color: "#e0f7ff",
          fontSize: "0.85rem",
          fontWeight: 600,
          cursor: pending ? "default" : "pointer",
        }}
      >
        {pending ? "Sending..." : "Send"}
      </button>
    </div>
  );
};
