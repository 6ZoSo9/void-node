import React from "react";

export function MainDashboard() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>VOID Mainnet — Command Center (UI v0)</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
        <style>
          {`
          body {
            margin: 0;
            padding: 0;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #050510;
            color: #f5f5f5;
          }
          .shell {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }
          header {
            padding: 16px 24px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            display: flex;
            align-items: baseline;
            justify-content: space-between;
          }
          header h1 {
            margin: 0;
            font-size: 20px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          header span {
            font-size: 12px;
            opacity: 0.7;
          }
          main {
            padding: 16px 24px 32px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 16px;
          }
          .card {
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.08);
            padding: 16px;
            background: radial-gradient(circle at top left, #141428, #050510);
          }
          .card h2 {
            margin: 0 0 8px 0;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            opacity: 0.85;
          }
          .pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            background: rgba(0, 255, 180, 0.08);
            border: 1px solid rgba(0, 255, 180, 0.4);
            color: #cafff4;
          }
          .pill-dot {
            width: 7px;
            height: 7px;
            border-radius: 999px;
            background: #00ff99;
            box-shadow: 0 0 8px rgba(0,255,153,0.7);
          }
          ul {
            margin: 8px 0 0 18px;
            padding: 0;
            font-size: 13px;
            opacity: 0.9;
          }
          code {
            font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            font-size: 12px;
            padding: 2px 4px;
            border-radius: 4px;
            background: rgba(0,0,0,0.4);
          }
          footer {
            padding: 8px 24px 16px;
            font-size: 11px;
            opacity: 0.55;
            border-top: 1px solid rgba(255,255,255,0.08);
          }
        `}
        </style>
      </head>
      <body>
        <div className="shell">
          <header>
            <div>
              <h1>VOID Mainnet — Command Center</h1>
              <span>UI v0 · Work Credits + Pillars snapshot</span>
            </div>
            <div className="pill">
              <span className="pill-dot" />
              <span>devnet / anvil-2050</span>
            </div>
          </header>

          <main>
            <div className="grid">
              <section className="card">
                <h2>Work Credits</h2>
                <p style={{ fontSize: 13, margin: 0, opacity: 0.92 }}>
                  Off-chain earn units that can be swapped for <code>VOID</code>
                  . Validators, agents, and services earn WC for useful work.
                </p>
                <ul>
                  <li>Dev tests: <code>WorkCredits*</code> suites: ✅</li>
                  <li>PLAN JSON (dev / live): zeros, ready to fill post-bootstrap</li>
                  <li>Relayer helper wired for WC ↔ VOID pool later</li>
                </ul>
              </section>

              <section className="card">
                <h2>Mainnet Pillars</h2>
                <p style={{ fontSize: 13, margin: 0 }}>
                  Core, last-mile, safeboot and PLAN health signals feed this UI.
                </p>
                <ul>
                  <li>Core / last-mile exporters: ✅ (txroot, seals, header3)</li>
                  <li>Safeboot pillar: ✅ (lifeboat mirrors mainnet path)</li>
                  <li>Bootstrap PLAN: ✅ (textfile + dev rehearsal)</li>
                </ul>
              </section>

              <section className="card">
                <h2>Next Up</h2>
                <ul>
                  <li>Wire real <code>WorkCredits*</code> addresses into PLAN</li>
                  <li>Add UI for claiming WC & swapping WC ↔ VOID</li>
                  <li>NullFeed + Obelisk Wallet surface hooks here</li>
                </ul>
              </section>
            </div>
          </main>

          <footer>
            VOID mainnet is still in pre-bootstrap. This UI is a dev command
            center wired to Prometheus, not a public wallet yet.
          </footer>
        </div>
      </body>
    </html>
  );
}

export default MainDashboard;
