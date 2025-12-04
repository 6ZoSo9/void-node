import React from "react";

const containerStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  background: "radial-gradient(circle at top, #111827 0, #020617 55%, #000000 100%)",
  color: "#e5e7eb",
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const sidebarStyle: React.CSSProperties = {
  width: "260px",
  padding: "20px 18px",
  borderRight: "1px solid rgba(148, 163, 184, 0.35)",
  background:
    "linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.92) 60%, rgba(15,23,42,0.9) 100%)",
  boxShadow: "0 0 40px rgba(15,23,42,0.9)",
  display: "flex",
  flexDirection: "column",
  gap: "24px",
};

const logoRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const logoMarkStyle: React.CSSProperties = {
  width: "28px",
  height: "28px",
  borderRadius: "999px",
  background:
    "conic-gradient(from 180deg, #22c55e, #22d3ee, #a855f7, #22c55e)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 0 25px rgba(56,189,248,0.8)",
};

const logoInnerStyle: React.CSSProperties = {
  width: "14px",
  height: "14px",
  borderRadius: "999px",
  background: "#020617",
};

const logoTextStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

const logoTitleStyle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 600,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
};

const logoSubStyle: React.CSSProperties = {
  fontSize: "10px",
  textTransform: "uppercase",
  color: "#9ca3af",
  letterSpacing: "0.14em",
};

const pillRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
};

const pillStyle: React.CSSProperties = {
  fontSize: "10px",
  padding: "4px 8px",
  borderRadius: "999px",
  border: "1px solid rgba(148,163,184,0.5)",
  background:
    "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(15,23,42,0.7))",
  color: "#e5e7eb",
};

const navSectionTitleStyle: React.CSSProperties = {
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#6b7280",
  marginBottom: "4px",
};

const navListStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const navItemStyle: React.CSSProperties = {
  fontSize: "13px",
  padding: "6px 9px",
  borderRadius: "999px",
  cursor: "default",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const navItemActiveStyle: React.CSSProperties = {
  ...navItemStyle,
  background:
    "linear-gradient(135deg, rgba(59,130,246,0.35), rgba(34,197,94,0.35))",
  border: "1px solid rgba(191,219,254,0.7)",
  boxShadow: "0 0 18px rgba(37,99,235,0.6)",
};

const navBadgeStyle: React.CSSProperties = {
  fontSize: "10px",
  padding: "2px 7px",
  borderRadius: "999px",
  border: "1px solid rgba(148,163,184,0.7)",
  color: "#9ca3af",
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  padding: "18px 20px 24px 20px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const headerRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "16px",
};

const headerTitleBlockStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const headerTitleStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 600,
};

const headerSubtitleStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
};

const headerBadgeRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const badgeStyle: React.CSSProperties = {
  fontSize: "11px",
  padding: "4px 9px",
  borderRadius: "999px",
  border: "1px solid rgba(148,163,184,0.6)",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
};

const badgeDotOkStyle: React.CSSProperties = {
  width: "8px",
  height: "8px",
  borderRadius: "999px",
  background: "#22c55e",
  boxShadow: "0 0 12px rgba(34,197,94,0.9)",
};

const badgeDotWarnStyle: React.CSSProperties = {
  width: "8px",
  height: "8px",
  borderRadius: "999px",
  background: "#f97316",
  boxShadow: "0 0 10px rgba(249,115,22,0.9)",
};

const badgeLabelStyle: React.CSSProperties = {
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: "10px",
};

const layoutRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1.1fr)",
  gap: "14px",
  alignItems: "stretch",
};

const columnStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const cardStyle: React.CSSProperties = {
  borderRadius: "18px",
  padding: "14px 14px 12px 14px",
  background:
    "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,23,42,0.92))",
  border: "1px solid rgba(55,65,81,0.85)",
  boxShadow:
    "0 18px 50px rgba(15,23,42,0.9), inset 0 0 0 1px rgba(15,23,42,0.9)",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const cardTitleRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: "13px",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "#9ca3af",
};

const cardTagStyle: React.CSSProperties = {
  fontSize: "11px",
  padding: "2px 7px",
  borderRadius: "999px",
  border: "1px solid rgba(55,65,81,0.9)",
  color: "#e5e7eb",
};

const metricRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
};

const metricPrimaryStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 600,
};

const metricLabelStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#9ca3af",
};

const metricMetaStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#6b7280",
};

const miniGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0,1fr))",
  gap: "6px",
  marginTop: "4px",
};

const miniChipStyle: React.CSSProperties = {
  fontSize: "10px",
  padding: "4px 6px",
  borderRadius: "999px",
  border: "1px dashed rgba(55,65,81,0.9)",
  color: "#9ca3af",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "4px",
};

const bottomRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1.1fr)",
  gap: "14px",
  marginTop: "4px",
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const listItemStyle: React.CSSProperties = {
  fontSize: "12px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "4px 0",
};

const listLabelStyle: React.CSSProperties = {
  color: "#9ca3af",
};

const listValueStyle: React.CSSProperties = {
  color: "#e5e7eb",
};

const badgeSoonStyle: React.CSSProperties = {
  fontSize: "10px",
  padding: "2px 7px",
  borderRadius: "999px",
  border: "1px dashed rgba(148,163,184,0.7)",
  color: "#9ca3af",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
};

const footerStyle: React.CSSProperties = {
  marginTop: "8px",
  fontSize: "10px",
  color: "#6b7280",
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
};

const footerRightStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
};

const footerKbdStyle: React.CSSProperties = {
  borderRadius: "6px",
  border: "1px solid rgba(55,65,81,0.9)",
  padding: "2px 6px",
  fontSize: "10px",
  color: "#9ca3af",
};

const MainDashboard: React.FC = () => {
  // All values here are placeholders; they just mirror our existing pillars layout.
  const mainnetHealth = "OK";
  const last5m = "Green";
  const uiPillars = "OK";

  return (
    <div style={containerStyle}>
      {/* Sidebar */}
      <aside style={sidebarStyle}>
        <div>
          <div style={logoRowStyle}>
            <div style={logoMarkStyle}>
              <div style={logoInnerStyle} />
            </div>
            <div style={logoTextStyle}>
              <div style={logoTitleStyle}>VOID</div>
              <div style={logoSubStyle}>Node · Obelisk · NullFeed</div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={pillRowStyle}>
              <span style={pillStyle}>CHAIN · 2050</span>
              <span style={pillStyle}>MAINNET PLAN · PHASE A</span>
              <span style={pillStyle}>AI-FIRST</span>
            </div>
          </div>
        </div>

        <div>
          <div style={navSectionTitleStyle}>Overview</div>
          <ul style={navListStyle}>
            <li style={navItemActiveStyle}>
              <span>Command Center</span>
              <span style={navBadgeStyle}>LIVE</span>
            </li>
          </ul>
        </div>

        <div>
          <div style={navSectionTitleStyle}>Layers</div>
          <ul style={navListStyle}>
            <li style={navItemStyle}>
              <span>Mainnet Core</span>
              <span style={navBadgeStyle}>healthy</span>
            </li>
            <li style={navItemStyle}>
              <span>Last-mile / Jobs</span>
              <span style={navBadgeStyle}>healthy</span>
            </li>
            <li style={navItemStyle}>
              <span>Safeboot</span>
              <span style={navBadgeStyle}>ready</span>
            </li>
            <li style={navItemStyle}>
              <span>Work Credits</span>
              <span style={navBadgeStyle}>v0</span>
            </li>
            <li style={navItemStyle}>
              <span>UI Pillars</span>
              <span style={navBadgeStyle}>stub</span>
            </li>
          </ul>
        </div>

        <div>
          <div style={navSectionTitleStyle}>NullFeed Channels</div>
          <ul style={navListStyle}>
            <li style={navItemStyle}>
              <span>#general</span>
              <span style={navBadgeStyle}>default</span>
            </li>
            <li style={navItemStyle}>
              <span>#void-dev</span>
              <span style={navBadgeStyle}>dev</span>
            </li>
            <li style={navItemStyle}>
              <span>#ai-lab</span>
              <span style={navBadgeStyle}>agents</span>
            </li>
          </ul>
        </div>

        <div>
          <div style={navSectionTitleStyle}>Future</div>
          <ul style={navListStyle}>
            <li style={navItemStyle}>
              <span>NFT Avatars</span>
              <span style={badgeSoonStyle}>planned</span>
            </li>
            <li style={navItemStyle}>
              <span>DEX / TradeView</span>
              <span style={badgeSoonStyle}>planned</span>
            </li>
          </ul>
        </div>
      </aside>

      {/* Main area */}
      <main style={mainStyle}>
        {/* Header */}
        <div style={headerRowStyle}>
          <div style={headerTitleBlockStyle}>
            <div style={headerTitleStyle}>Mainnet Command Center</div>
            <div style={headerSubtitleStyle}>
              Snapshot of VOID Chain · Obelisk Wallet · NullFeed layer,
              wired for AI and humans.
            </div>
          </div>
          <div style={headerBadgeRowStyle}>
            <div style={badgeStyle}>
              <span style={badgeDotOkStyle} />
              <span style={badgeLabelStyle}>Mainnet core</span>
              <span>OK</span>
            </div>
            <div style={badgeStyle}>
              <span style={badgeDotOkStyle} />
              <span style={badgeLabelStyle}>Pillars + UI</span>
              <span>{uiPillars}</span>
            </div>
            <div style={badgeStyle}>
              <span style={badgeDotWarnStyle} />
              <span style={badgeLabelStyle}>Live data</span>
              <span>stub only</span>
            </div>
          </div>
        </div>

        {/* Top row: high-level status */}
        <div style={layoutRowStyle}>
          <section style={columnStyle}>
            <div style={cardStyle}>
              <div style={cardTitleRowStyle}>
                <div style={cardTitleStyle}>Mainnet Health</div>
                <div style={cardTagStyle}>pillars · v2</div>
              </div>
              <div style={metricRowStyle}>
                <div>
                  <div style={metricPrimaryStyle}>{mainnetHealth}</div>
                  <div style={metricLabelStyle}>overall status</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={metricMetaStyle}>last 5 minutes</div>
                  <div style={{ fontSize: "11px", color: "#e5e7eb" }}>
                    {last5m}
                  </div>
                </div>
              </div>
              <div style={miniGridStyle}>
                <div style={miniChipStyle}>
                  <span>core</span>
                  <span>green</span>
                </div>
                <div style={miniChipStyle}>
                  <span>last-mile</span>
                  <span>green</span>
                </div>
                <div style={miniChipStyle}>
                  <span>safeboot</span>
                  <span>ready</span>
                </div>
                <div style={miniChipStyle}>
                  <span>tokenomics</span>
                  <span>locked</span>
                </div>
                <div style={miniChipStyle}>
                  <span>keys</span>
                  <span>verified</span>
                </div>
                <div style={miniChipStyle}>
                  <span>ui pillars</span>
                  <span>stub</span>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={cardTitleRowStyle}>
                <div style={cardTitleStyle}>Work Credits</div>
                <div style={cardTagStyle}>v0 · dev policy</div>
              </div>
              <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
                Simple, test-backed Work Credits flow hooked into RewardEngine.
                This view will later show live WC balances, sinks, and relayer
                swaps.
              </p>
              <ul style={listStyle}>
                <li style={listItemStyle}>
                  <span style={listLabelStyle}>Spec / tests</span>
                  <span style={listValueStyle}>green (all passing)</span>
                </li>
                <li style={listItemStyle}>
                  <span style={listLabelStyle}>Relayer helper</span>
                  <span style={listValueStyle}>stub wired</span>
                </li>
                <li style={listItemStyle}>
                  <span style={listLabelStyle}>Mainnet usage</span>
                  <span style={listValueStyle}>planned</span>
                </li>
              </ul>
            </div>
          </section>

          <section style={columnStyle}>
            <div style={cardStyle}>
              <div style={cardTitleRowStyle}>
                <div style={cardTitleStyle}>Wallet · Obelisk</div>
                <div style={cardTagStyle}>validators · later</div>
              </div>
              <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
                Obelisk will ship as the primary way humans and agents talk to
                VOID: wallet, validator console, and NullFeed dock in one
                nested UI.
              </p>
              <ul style={listStyle}>
                <li style={listItemStyle}>
                  <span style={listLabelStyle}>Validator mode</span>
                  <span style={listValueStyle}>planned (mobile + desktop)</span>
                </li>
                <li style={listItemStyle}>
                  <span style={listLabelStyle}>Work Credits panel</span>
                  <span style={listValueStyle}>v0 design only</span>
                </li>
                <li style={listItemStyle}>
                  <span style={listLabelStyle}>NFT / avatar market</span>
                  <span style={listValueStyle}>roadmap</span>
                </li>
              </ul>
            </div>

            <div style={cardStyle}>
              <div style={cardTitleRowStyle}>
                <div style={cardTitleStyle}>NullFeed</div>
                <div style={cardTagStyle}>off-chain · encrypted</div>
              </div>
              <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
                mIRC-style channels mapped to VOID, hosted across nodes.
                Messages off-chain for now; mapping and channel controls live on
                chain later.
              </p>
              <ul style={listStyle}>
                <li style={listItemStyle}>
                  <span style={listLabelStyle}>Default channels</span>
                  <span style={listValueStyle}>
                    #general · #tech · #void-dev · #ai-lab
                  </span>
                </li>
                <li style={listItemStyle}>
                  <span style={listLabelStyle}>Hidden channels</span>
                  <span style={listValueStyle}>planned (#&lt;name&gt;)</span>
                </li>
                <li style={listItemStyle}>
                  <span style={listLabelStyle}>Per-channel controls</span>
                  <span style={listValueStyle}>future (images · bots)</span>
                </li>
              </ul>
            </div>
          </section>
        </div>

        {/* Bottom row */}
        <div style={bottomRowStyle}>
          <section style={cardStyle}>
            <div style={cardTitleRowStyle}>
              <div style={cardTitleStyle}>Mainnet Runbook Hooks</div>
              <div style={cardTagStyle}>read-only snapshot</div>
            </div>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                <span style={listLabelStyle}>Bootstrap plan</span>
                <span style={listValueStyle}>locked · metrics-gated</span>
              </li>
              <li style={listItemStyle}>
                <span style={listLabelStyle}>Keys & roles</span>
                <span style={listValueStyle}>LUKS + mapping verified</span>
              </li>
              <li style={listItemStyle}>
                <span style={listLabelStyle}>Broadcast script</span>
                <span style={listValueStyle}>stub (intentionally disabled)</span>
              </li>
            </ul>
          </section>

          <section style={cardStyle}>
            <div style={cardTitleRowStyle}>
              <div style={cardTitleStyle}>Coming Online Next</div>
              <div style={cardTagStyle}>roadmap · v0</div>
            </div>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                <span style={listLabelStyle}>Live metrics overlay</span>
                <span style={listValueStyle}>hook Prom / node endpoints</span>
              </li>
              <li style={listItemStyle}>
                <span style={listLabelStyle}>Validator earnings view</span>
                <span style={listValueStyle}>VOID + Work Credits</span>
              </li>
              <li style={listItemStyle}>
                <span style={listLabelStyle}>Trading / NFT widgets</span>
                <span style={listValueStyle}>after mainnet launch</span>
              </li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <span>v0 dashboard · layout + wording only · no live controls yet.</span>
          <div style={footerRightStyle}>
            <span style={footerKbdStyle}>[DEV] localhost:4305</span>
            <span style={footerKbdStyle}>[PLAN] metrics-gated mainnet</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MainDashboard;
