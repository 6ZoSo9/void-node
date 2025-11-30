# VOID Mainnet Bootstrap PLAN

This document describes what it means for the VOID mainnet bootstrap PLAN to be ready
and how it is wired into monitoring.

The PLAN is represented by:

- config/void-mainnet-bootstrap-mainnet.live.json
- script/VoidMainnetBootstrapMainnet.s.sol
- ops/void-mainnet-bootstrap-plan-sim.sh
- /usr/local/bin/void-mainnet-bootstrap-plan-exporter.sh
- Prometheus metrics:
  - void_mainnet_bootstrap_plan_configured
  - void_mainnet_bootstrap_plan_health
  - void_mainnet_bootstrap_plan_health_info{reason="..."}
  - void:mainnet_bootstrap_plan:health:last_5m
- Alert:
  - VoidMainnetBootstrapPlanNotReady

## 1. Live config JSON

The live config file is never committed and is ignored by git:

- config/void-mainnet-bootstrap-mainnet.live.json

It contains, at minimum:

- chainId (must be 2050)
- roles object with:
  - deployer
  - treasuryAdmin
  - opsTreasury
  - updateGateAdmin
  - configGateAdmin
  - rewardAdmin
- validators array:
  - validator0 (first mainnet validator) and its wiring

While the PLAN is not ready, roles may be zero or placeholder addresses.
When we approach real mainnet, all of these must be concrete, final addresses
(ideally hardware wallets or keys backed by LUKS-encrypted storage).

## 2. PLAN sim invariants

ops/void-mainnet-bootstrap-plan-sim.sh runs a local, offline check of the live JSON.

Today it enforces:

- chainId == 2050
- all roles.* entries are non-zero 0x addresses (no 0x0000..., no obvious placeholders)

If any core role is bad, the sim prints:

- RESULT: NOT READY (bad_roles)

and exits non-zero. The exporter then publishes:

- void_mainnet_bootstrap_plan_health 0
- void_mainnet_bootstrap_plan_health_info{reason="bad_roles"} 1

Later we can extend the sim to cover validator0 stake, commission, reward address
and use new reason values such as bad_validator0.

## 3. Exporter and textfile collector

The exporter:

- /usr/local/bin/void-mainnet-bootstrap-plan-exporter.sh

is run by systemd timer:

- void-mainnet-bootstrap-plan-exporter.timer

It writes a textfile for node_exporter to read:

- /var/lib/node_exporter/textfile_collector/void_mainnet_bootstrap_plan.prom

Example contents when PLAN is not ready because roles are placeholders:

    void_mainnet_bootstrap_plan_configured 1
    void_mainnet_bootstrap_plan_health 0
    void_mainnet_bootstrap_plan_health_info{reason="bad_roles"} 1

When the PLAN is structurally ready, we expect something like:

    void_mainnet_bootstrap_plan_configured 1
    void_mainnet_bootstrap_plan_health 1
    void_mainnet_bootstrap_plan_health_info{reason="ok"} 1

The exact reason string is defined by the sim script.

## 4. Prometheus rules and alert

Recording rule:

- void:mainnet_bootstrap_plan:health:last_5m

This smooths void_mainnet_bootstrap_plan_health over a 5 minute window using
last_over_time and fallbacks.

Alert:

- VoidMainnetBootstrapPlanNotReady
- Condition: void:mainnet_bootstrap_plan:health:last_5m == 0 for 10 minutes
- Labels: pillar="mainnet-bootstrap-plan", severity="warning", system="void"

For now this alert is advisory. It tells us the PLAN is not structurally ready,
but it does not block the other mainnet pillars.

## 5. What “PLAN ready” actually means

We will only move the PLAN to health = 1 when all of these are true:

1. config/void-mainnet-bootstrap-mainnet.live.json is populated with final
   addresses for all core roles (deployer, treasuryAdmin, opsTreasury,
   updateGateAdmin, configGateAdmin, rewardAdmin) and validator0 is fully wired.
2. ops/void-mainnet-bootstrap-plan-sim.sh prints a READY verdict and exits 0.
3. Exporter and Prometheus show:
   - void_mainnet_bootstrap_plan_health 1
   - void_mainnet_bootstrap_plan_health_info{reason="ok"} 1 (or equivalent)
4. Alert VoidMainnetBootstrapPlanNotReady is quiet.

At that point we can optionally wire this PLAN health into the mainnet pillars
exporter so that real mainnet bootstrap cannot proceed unless the PLAN is
structurally locked.
