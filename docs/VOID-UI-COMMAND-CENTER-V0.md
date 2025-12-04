# VOID Network — UI Command Center v0

Status: implemented (dev-only)  
Version: v0 (Work Credits + Mainnet UI pillars)  
Scope: dashboard layout, health pipeline, and dev workflows.

This document describes the first version of the VOID UI Command Center:
a retro-styled, metrics-driven dashboard that surfaces mainnet readiness
and UI pillars health (Work Credits + Dashboard).

---

## 1. Goals

- Give operators and devs a **single screen** showing:
  - Core mainnet pillars health (safeboot, devnet, mainnet-core, lastmile).
  - UI pillars health (Work Credits + Dashboard).
  - A composite “mainnet + UI” ship-ability gauge.
- Keep the stack **metrics-first**:
  - Truth = Prometheus + node_exporter textfiles.
  - UI is a **view** over those metrics, not a source of truth.
- Be safe to run in dev and later in mainnet ops environments.

This is a **v0** dashboard; visuals and interactivity will improve later
(NullFeed shell, WC balances, validator views, etc.).

---

## 2. Components & Data Flow

The UI Command Center is powered by:

1. **Prometheus**
   - URL (dev): `http://127.0.0.1:9090`
   - Scrapes `node_exporter` and VOID-specific metrics jobs.

2. **node_exporter + textfile collector**
   - Textfile dir (dev): `/var/lib/node_exporter/textfile_collector`
   - UI pillars exporter writes:
     - `void_mainnet_ui_work_credits_health`
     - `void_mainnet_ui_dashboard_health`
     - `void_mainnet_ui_pillars_health`
   - File: `void_mainnet_ui_pillars.prom`

3. **UI pillars exporter script**

   - Script: `ops/void-mainnet-ui-pillars-health.sh`
   - Helper: `ops/void-mainnet-ui-pillars-health-all.sh`
   - Responsibilities:
     - Run Work Credits CI smoke (user run only).
     - Verify required WC docs + config.
     - Verify dashboard assets/spec exist.
     - Emit textfile gauges with `health=1` or `0`.

4. **UI health proxy**

   - Script: `ops/dev-ui-health-serve.sh`
   - Dev endpoint: `http://127.0.0.1:4315/api/ui/health`
   - Fetches from Prometheus and returns JSON summary:

     - `void_mainnet_ui_work_credits_health`
     - `void_mainnet_ui_dashboard_health`
     - `void_mainnet_ui_pillars_health`
     - Recorded 5m views:
       - `void:mainnet_pillars:health:last_5m`
       - `void:mainnet_ui_pillars:health:last_5m`
       - `void:mainnet_pillars_with_ui:health:last_5m`

   - This is the bridge between metrics and UI.

5. **Command Center dashboard**

   - Component: `src/ui/MainDashboard.tsx`
   - Dev server: `scripts/dev_dashboard_server.ts`
   - Dev runner: `ops/dev-dashboard-serve.sh`
   - Dev URL: `http://127.0.0.1:4305/`

The dashboard is **read-only** and renders a snapshot of the health
gauges pulled via the UI health proxy.

---

## 3. Key Metrics & Gates

### 3.1 UI pillar gauges (instant)

From `void_mainnet_ui_pillars.prom`:

- `void_mainnet_ui_work_credits_health`
  - 1 = Work Credits contracts + docs + policy files present and CI smoke passed
    (for the user-run variant).
  - 0 = something broken in WC layer.

- `void_mainnet_ui_dashboard_health`
  - 1 = `src/ui/MainDashboard.tsx` + `docs/VOID-DASHBOARD-V0-SPEC.md` present
    and basic content sanity checks passed.
  - 0 = dashboard code/spec missing or malformed.

- `void_mainnet_ui_pillars_health`
  - 1 = both of the above are 1.
  - 0 = UI stack not ready.

### 3.2 Recorded views (5m windows)

Computed in Prometheus via recording rules:

- `void:mainnet_pillars:health:last_5m`
  - Core pillars (safeboot + devnet + mainnet-core + lastmile).

- `void:mainnet_ui_pillars:health:last_5m`
  - UI pillars (Work Credits + dashboard).

- `void:mainnet_pillars_with_ui:health:last_5m`
  - Composite shipability gate:
    - 1 = core pillars AND UI pillars are healthy over last 5 minutes.
    - 0 = something is red; we should not broadcast or ship.

These are what the dashboard summarizes as the three top-row cards.

---

## 4. Dashboard Layout (UI v0)

Rendered title:

- `VOID Mainnet — Command Center (UI v0)`

Top section:

- Left:
  - Title + tagline: “ChainId 2050 · AI-first, human-tolerant”.
- Right:
  - Overall pill: “ALL GREEN” when `void:mainnet_pillars_with_ui:health:last_5m == 1`.

First row of cards:

1. **Core pillars (5m)**
   - Label: `void:mainnet_pillars:health:last_5m`
   - Description: safeboot + devnet + mainnet-core + lastmile.

2. **UI pillars (WC + Dashboard)**
   - Label: `void:mainnet_ui_pillars:health:last_5m`
   - Description: Work Credits layer + dashboard assets/spec.

3. **Mainnet + UI composite**
   - Label: `void:mainnet_pillars_with_ui:health:last_5m`
   - Description: hard “shipability” gate.

Second row:

- **UI gauges (instant)**:
  - Three rows with label, dot, and numeric value (0/1):
    - Work Credits UI health.
    - Main Dashboard UI health.
    - Combined UI pillars health.

- **Metrics source** card:
  - Shows:
    - Prometheus URL.
    - Textfile path for UI pillars metrics.
  - Includes a short narrative about the truth flow:
    textfile → node_exporter → Prometheus → UI health proxy.

Footer:

- Mentions:
  - VOID Network · Work Credits v0 · Dashboard v0
  - Note: “This UI will get prettier after mainnet.”

---

## 5. Dev Workflows

### 5.1 Ensure Prometheus + node_exporter are running

Dev assumption (already in place):

- Prometheus at `http://127.0.0.1:9090`
- node_exporter scraping textfiles from:
  - `/var/lib/node_exporter/textfile_collector`

### 5.2 Export UI pillars metrics

User-level smoke (runs WC tests):

- `./ops/void-mainnet-ui-pillars-health.sh`

Root/textfile run (no forge in PATH required):

- `sudo TEXTFILE_PATH=/var/lib/node_exporter/textfile_collector/void_mainnet_ui_pillars.prom \
    REPO_ROOT="$HOME/dev/void-node" \
    ./ops/void-mainnet-ui-pillars-health.sh`

Summary helper:

- `./ops/void-mainnet-ui-pillars-health-all.sh`

This prints:

- Raw gauges (instant 0/1)
- Recorded 5m views
- Overall status (OK/BAD)

### 5.3 Run UI health proxy

Dev helper:

- `./ops/dev-ui-health-serve.sh`

Default:

- `http://127.0.0.1:4315/api/ui/health`

Quick smoke:

- `curl -fsS "http://127.0.0.1:4315/api/ui/health" | jq`

Should show:

- `ok: true`
- Gauges and recording values all `1` in the happy path.

### 5.4 Run the dashboard server

Dev runner:

- `./ops/dev-dashboard-serve.sh`

Default:

- `http://127.0.0.1:4305/`

Quick smoke:

- `curl -fsS "http://127.0.0.1:4305/" | grep -m1 '<title'`
- Expect: `VOID Mainnet — Command Center (UI v0)`

### 5.5 Combined smoke harness

Helper script:

- `ops/dev-ui-command-center-smoke.sh`

Runs:

1. UI pillars health-all (WC + dashboard).
2. Dev dashboard title check.
3. UI health proxy JSON dump.

This script should exit 0 and print **RESULT: OK** for the expected
metrics.

---

## 6. Integration with Mainnet Pillars

The UI Command Center is now part of the mainnet health gating story:

- Core mainnet gates:
  - `void:mainnet_overall:health:last_5m_v2`
  - `void:mainnet_pillars:health:last_5m`
  - `void:mainnet_lastmile:health:last_5m`
  - Safeboot, devnet, txroot, seals, head, keys, plan, etc.

- UI gates:
  - `void:mainnet_ui_pillars:health:last_5m`
  - `void:mainnet_pillars_with_ui:health:last_5m`

We do **not** treat UI failure as a reason to halt the chain, but we do
treat it as a blocker for “mainnet is ready for users” messaging and
public dashboards.

---

## 7. Roadmap (v1+)

Future improvements to this Command Center:

- Integrate **Work Credits** live data:
  - WC balances for validator / node operator addresses.
  - WC sinks / sources over time.

- Add **NullFeed v0** section:
  - Channel health.
  - Nodes participating in NullFeed.
  - Abuse / moderation signals.

- Add per-validator panels:
  - Head gap vs main.
  - Txroot mismatch counts.
  - RewardEngine emission stats.

- Move from static CSS to a componentized UI library once the core
  metrics story is fully stable.

For now, v0 is intentionally simple, metrics-driven, and biased toward
operators and internal dashboards.

