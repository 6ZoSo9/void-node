import React from "react";

export const WalletDashboard: React.FC = () => {
  // For now this is a PRESENTATION-ONLY stub.
  // Later we can wire real balances + relayer state via WalletContext and devnet helpers.
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 2.2fr) minmax(0, 1.5fr)",
        gap: "1rem",
        alignItems: "flex-start",
      }}
    >
      {/* Left: balances + actions */}
      <section
        style={{
          borderRadius: "0.85rem",
          border: "1px solid #333",
          padding: "1rem 1.1rem",
          background:
            "radial-gradient(circle at top left, rgba(139,92,255,0.18), #050509 55%)",
          boxShadow: "0 0 18px rgba(0,0,0,0.65)",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: "0.75rem",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "0.95rem",
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: "#b3f0ff",
              }}
            >
              Wallet Overview
            </h2>
            <p
              style={{
                margin: "0.25rem 0 0",
                fontSize: "0.8rem",
                color: "#9bb0ff",
              }}
            >
              Devnet-only view for VOID, WorkCredits, and LP positions.
            </p>
          </div>
          <span
            style={{
              fontSize: "0.7rem",
              padding: "0.18rem 0.55rem",
              borderRadius: "999px",
              border: "1px solid rgba(179,240,255,0.6)",
              color: "#b3f0ff",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              opacity: 0.9,
            }}
          >
            Devnet Stub
          </span>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "0.6rem",
            marginBottom: "0.9rem",
          }}
        >
          {/* VOID balance */}
          <div
            style={{
              borderRadius: "0.7rem",
              border: "1px solid #333",
              padding: "0.55rem 0.65rem",
              background: "rgba(5,5,9,0.95)",
            }}
          >
            <div
              style={{
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: "#8b5cff",
                marginBottom: "0.2rem",
              }}
            >
              VOID
            </div>
            <div
              style={{
                fontSize: "1.0rem",
                fontWeight: 500,
                color: "#f6f0ff",
              }}
            >
              0.00
            </div>
            <div
              style={{
                fontSize: "0.7rem",
                color: "#888fb0",
                marginTop: "0.1rem",
              }}
            >
              Governance / staking token (mainnet later)
            </div>
          </div>

          {/* WorkCredits balance */}
          <div
            style={{
              borderRadius: "0.7rem",
              border: "1px solid #333",
              padding: "0.55rem 0.65rem",
              background: "rgba(5,5,9,0.95)",
            }}
          >
            <div
              style={{
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: "#7bffb7",
                marginBottom: "0.2rem",
              }}
            >
              WorkCredits (WC)
            </div>
            <div
              style={{
                fontSize: "1.0rem",
                fontWeight: 500,
                color: "#f6fff3",
              }}
            >
              0.000
            </div>
            <div
              style={{
                fontSize: "0.7rem",
                color: "#88b890",
                marginTop: "0.1rem",
              }}
            >
              Earned by doing work on VOID (future mainnet).
            </div>
          </div>

          {/* LP position */}
          <div
            style={{
              borderRadius: "0.7rem",
              border: "1px solid #333",
              padding: "0.55rem 0.65rem",
              background: "rgba(5,5,9,0.95)",
            }}
          >
            <div
              style={{
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: "#ffd78b",
                marginBottom: "0.2rem",
              }}
            >
              LP Tokens
            </div>
            <div
              style={{
                fontSize: "1.0rem",
                fontWeight: 500,
                color: "#fff7e6",
              }}
            >
              0.000
            </div>
            <div
              style={{
                fontSize: "0.7rem",
                color: "#c7b28c",
                marginTop: "0.1rem",
              }}
            >
              Share of the VOID/WC pool (devnet only for now).
            </div>
          </div>
        </div>

        {/* Actions row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "0.6rem",
            marginBottom: "0.3rem",
          }}
        >
          {/* Send/Receive */}
          <div
            style={{
              borderRadius: "0.7rem",
              border: "1px solid #333",
              padding: "0.6rem 0.7rem",
              background: "#050509",
            }}
          >
            <div
              style={{
                fontSize: "0.8rem",
                fontWeight: 500,
                color: "#e0e4ff",
                marginBottom: "0.2rem",
              }}
            >
              Send / Receive
            </div>
            <p
              style={{
                margin: "0 0 0.35rem",
                fontSize: "0.75rem",
                color: "#9aa0c2",
              }}
            >
              This will become the primary place to move VOID and WC around.
            </p>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled
                style={{
                  padding: "0.25rem 0.6rem",
                  borderRadius: "999px",
                  border: "1px solid #333",
                  background: "rgba(10,10,18,0.8)",
                  color: "#777fa8",
                  fontSize: "0.75rem",
                  cursor: "not-allowed",
                }}
              >
                Send (soon)
              </button>
              <button
                type="button"
                disabled
                style={{
                  padding: "0.25rem 0.6rem",
                  borderRadius: "999px",
                  border: "1px solid #333",
                  background: "rgba(10,10,18,0.8)",
                  color: "#777fa8",
                  fontSize: "0.75rem",
                  cursor: "not-allowed",
                }}
              >
                Receive (soon)
              </button>
            </div>
          </div>

          {/* Relayer toggle */}
          <div
            style={{
              borderRadius: "0.7rem",
              border: "1px solid #333",
              padding: "0.6rem 0.7rem",
              background: "#050509",
            }}
          >
            <div
              style={{
                fontSize: "0.8rem",
                fontWeight: 500,
                color: "#e0ffe9",
                marginBottom: "0.25rem",
              }}
            >
              Relayer Control
            </div>
            <p
              style={{
                margin: "0 0 0.35rem",
                fontSize: "0.75rem",
                color: "#88b890",
              }}
            >
              Flip whether Obelisk is allowed to relay txs on your behalf.
            </p>
            <button
              type="button"
              disabled
              style={{
                padding: "0.3rem 0.75rem",
                borderRadius: "999px",
                border: "1px solid #335c3a",
                background: "rgba(8,22,14,0.85)",
                color: "#7bffb7",
                fontSize: "0.75rem",
                cursor: "not-allowed",
              }}
            >
              Relayer: OFF (stub)
            </button>
          </div>

          {/* Pending WC claim */}
          <div
            style={{
              borderRadius: "0.7rem",
              border: "1px solid #333",
              padding: "0.6rem 0.7rem",
              background: "#050509",
            }}
          >
            <div
              style={{
                fontSize: "0.8rem",
                fontWeight: 500,
                color: "#f5ffe0",
                marginBottom: "0.25rem",
              }}
            >
              Pending WorkCredits
            </div>
            <p
              style={{
                margin: "0 0 0.35rem",
                fontSize: "0.75rem",
                color: "#c2c79a",
              }}
            >
              Later this will query the RewardEngine / WC accounting and let you
              claim pending WC.
            </p>
            <button
              type="button"
              disabled
              style={{
                padding: "0.3rem 0.75rem",
                borderRadius: "999px",
                border: "1px solid #4b4b33",
                background: "rgba(25,25,12,0.9)",
                color: "#d4d49b",
                fontSize: "0.75rem",
                cursor: "not-allowed",
              }}
            >
              Claim WC (stub)
            </button>
          </div>
        </div>

        <p
          style={{
            margin: "0.4rem 0 0",
            fontSize: "0.7rem",
            color: "#6f7695",
          }}
        >
          As we wire more of the VOID core + WorkCredits mainnet plan, this
          dashboard will evolve into the normie-friendly home screen for
          Obelisk Wallet.
        </p>
      </section>

      {/* Right: address / network info stub */}
      <aside
        style={{
          borderRadius: "0.85rem",
          border: "1px solid #333",
          padding: "0.9rem 1rem",
          background: "#050509",
          boxShadow: "0 0 14px rgba(0,0,0,0.6)",
        }}
      >
        <h3
          style={{
            margin: "0 0 0.5rem",
            fontSize: "0.85rem",
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: "#b3f0ff",
          }}
        >
          Connection (Devnet Stub)
        </h3>
        <p
          style={{
            margin: "0 0 0.45rem",
            fontSize: "0.78rem",
            color: "#9aa0c2",
          }}
        >
          Later this panel will show:
        </p>
        <ul
          style={{
            margin: "0 0 0.5rem 1.1rem",
            padding: 0,
            fontSize: "0.75rem",
            color: "#7e85a8",
          }}
        >
          <li>Your connected address (Obelisk account).</li>
          <li>Active network (VOID devnet / mainnet / safeboot).</li>
          <li>Basic health snapshot from the node you are talking to.</li>
        </ul>
        <p
          style={{
            margin: 0,
            fontSize: "0.75rem",
            color: "#6f7695",
          }}
        >
          For now it is a static stub to keep the layout in place while we
          finish mainnet bootstrap, validators, and WorkCredits plumbing.
        </p>
      </aside>
    </div>
  );
};
