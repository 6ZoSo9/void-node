# VOID Mainnet – Health Spec (core, tokenomics, overall)

This doc defines how we compute and alert on **VOID mainnet health** in Prometheus.

## 1. Pillars

We track three logical pillars:

- **Core** – chain safety/liveness (safeboot + mainnet-core manifests etc.).
- **Tokenomics** – supply / emissions / invariants not obviously broken.
- **Overall** – simple aggregate: overall = 1 when both pillars are healthy.

This is *monitoring-only*. It does not enforce protocol rules – it just tells us
whether the mainnet looks sane.

## 2. Raw gauges (source-of-truth)

Exporters must eventually emit:

- `void_mainnet_core_health` – 1 = OK, 0 = bad
- `void_mainnet_tokenomics_health` – 1 = OK, 0 = bad

These are environment-specific gauges; right now they come from our local
Prometheus pipeline on the dev box.

## 3. Recording rules (5m smoothed views)

We define 5m “smoothed” views via recording rules:

- `void:mainnet_core:health:last_5m`
- `void:mainnet_tokenomics:health:last_5m`
- `void:mainnet_overall:health:last_5m`

Intended semantics:

- `void:mainnet_core:health:last_5m`  
  = `max_over_time(void_mainnet_core_health[5m])`

- `void:mainnet_tokenomics:health:last_5m`  
  = `max_over_time(void_mainnet_tokenomics_health[5m])`

- `void:mainnet_overall:health:last_5m`  
  = `min(void:mainnet_core:health:last_5m,
         void:mainnet_tokenomics:health:last_5m)`

Any label noise (`instance`, `job`, optional `chain="mainnet"`) is tolerated.
We only care that the scalar **max** over series is 1 when things are healthy.

## 4. Alert: VoidMainnetOverallUnhealthy

Alert rule (conceptual):

- **Name:** `VoidMainnetOverallUnhealthy`
- **Expr:** `max(void:mainnet_overall:health:last_5m) < 1`
- **For:** 10m
- **Labels:** `system="void"`, `pillar="mainnet-overall"`
- **Summary:** "VOID mainnet overall health < 1 for 10m."

This fires if *all* overall-series are < 1 for at least 10 minutes. As long as
at least one series reports `1`, we consider mainnet overall healthy.

## 5. Sanity hammer

Helper script (installed under `~/.local/bin`):

- `void-mainnet-overall-health.sh`

Behavior:

1. Queries:
   - `void:mainnet_core:health:last_5m`
   - `void:mainnet_tokenomics:health:last_5m`
   - `void:mainnet_overall:health:last_5m`
2. Queries scalar:
   - `max(void:mainnet_overall:health:last_5m)`
3. Lists any active `VoidMainnetOverallUnhealthy` alerts.

Success criteria:

- Core     == 1
- Tokenomics == 1
- Overall  == 1
- Scalar max(overall) == 1
- No active `VoidMainnetOverallUnhealthy` alerts.

This doc is the single source of truth for how VOID mainnet health is computed
and why the alert fires.
