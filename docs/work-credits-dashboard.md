# VOID Work Credits Dashboard (Stub v0)

This is a PLAN-only dashboard spec for VOID Work Credits (WC) + LLP + relayers.
It documents what we want to see in Grafana and, later, in Obelisk/NullFeed UI.

For now this is **read-only**: no deployments, no key material, no fund moves.

---

## 1. Scope

This dashboard is about **whether the WC plumbing is ready and sane**, not about
user balances.

It answers:

- Are WC/LLP/relayer roles wired in the LIVE JSON?
- Is the 10M VOID seed split correct (LLP vs relayers)?
- Are the WC + relayer health metrics green alongside the mainnet pillars?
- Is anything obviously misconfigured before we even touch mainnet funds?

Later we can extend it with on-chain LLP / WC / relayer state.

---

## 2. Inputs and scripts

Primary scripts:

- `./ops/void-work-credits-mainnet-plan-all.sh`
  - Runs JSON shaping, roles vs roles-mapping, PLAN sim, and WC health.

You should be able to sanity check WC with:

- CLI: `./ops/void-work-credits-mainnet-plan-all.sh`
- Grafana: this dashboard (panels described below).

Key metric (already live):

- `void:mainnet_pillars_with_keys_ai_wc_relayers:health:last_5m`
  - Gauge (0/1).
  - 1 = safeboot + devnet + mainnet-core + last-mile + keys + AI + WC + relayers are all healthy for the last 5m.
  - 0 = something in that chain is broken or missing.

Other WC-specific metrics will come from the WC exporters and recording rules
(we keep names generic here and line them up with whatever is in Prometheus):

- `void_work_credits_plan_roles_ok` (0/1) – do WC roles exist and match LIVE JSON?
- `void_work_credits_split_ok` (0/1) – does the 10M VOID split match the docs?
- `void_work_credits_relayers_ok` (0/1) – are relayer entries consistent?

Exact names should match the Prometheus rules we actually ship.

---

## 3. Panels (Grafana stub)

### Panel A — “WC Plan Health (5m)”

**Query (instant / 5m):**

- `void_work_credits_plan_roles_ok`
- `void_work_credits_split_ok`
- `void_work_credits_relayers_ok`

We want a simple single-stat or traffic light:

- Green only when all three are `1`.
- If any go `0`, the label should make it obvious what failed:
  - roles, split, or relayers.

### Panel B — “10M VOID Split (PLAN)”

Single-stat table or stat+text based on PLAN sim output:

- Total seed = 10,000,000 VOID
- LLP = 9,800,000 VOID
- Relayers total = 200,000 VOID

Prometheus doesn’t need to know the literal VOID amounts; we only need a
boolean `void_work_credits_split_ok`. The panel’s description should spell out
the target numbers so humans can see the intent.

### Panel C — “WC Roles vs Roles Mapping”

Panel shows whether WC roles exist in both:

- LIVE JSON (`config/void-mainnet-bootstrap-mainnet.live.json`)
- `/mnt/voidkey/meta/mainnet-roles-mapping.txt`

This can be a table backed by a metric like:

- `void_work_credits_plan_roles_ok` (0/1)

If we later expose per-role metrics (e.g. `void_work_credits_role_present{role="wcGovernance"}`),
we can use a table to list each role with status for more granularity.

### Panel D — “Relayer Entries (PLAN)”

Future extension:

- List relayer entries from LIVE JSON (name + address).
- Status metric per relayer, e.g. `void_work_credits_relayer_ok{name="relayer-1"}`.

For now, a simple “Relayers OK” boolean (`void_work_credits_relayers_ok`) is enough.

### Panel E — “Pillars + Keys + AI + WC + Relayers (5m)”

This panel shows the **big composite gate**:

- Query: `void:mainnet_pillars_with_keys_ai_wc_relayers:health:last_5m`

Single stat:

- 1 = we are allowed to even think about real mainnet bootstrap.
- 0 = some pillar is red (devnet, mainnet core, last-mile, safeboot, keys, AI,
  WC, or relayers).

This should sit next to the existing mainnet pillars panels so it’s obvious that
WC is part of the go/no-go decision.

---

## 4. Runtime WC / LLP view (future)

Once mainnet is live and we’ve actually deployed WC + LLP + relayers, we’ll add
a second section to this dashboard for **on-chain health**:

Examples (future, not implemented yet):

- LLP vault total VOID vs expected range.
- WC minted vs emissions schedule.
- Relayer balances vs minimum required stake.
- Per-validator WC earning rates (if we surface that to Prometheus).

None of that should be wired until:

1. Mainnet bootstrap is complete.
2. WC contracts are deployed and their addresses are written into the LIVE JSON.
3. Prometheus exporters for WC on-chain state exist and are stable.

---

## 5. Obelisk / NullFeed integration (future)

Obelisk Wallet and NullFeed dashboard should eventually expose a simplified view
of the same data:

- One “Work Credits pillar” indicator (green/red).
- Short text:
  - Green: “Work Credits plumbing ready”
  - Red: “Work Credits not ready (see node dashboard)”

Wallet / web UI should **never** own the truth – it should read from:
- Node exporters / Prometheus-derived APIs
- Or a thin agent that queries the same metrics

This file is just the stub. Actual wiring and UI work happens after mainnet is live.

