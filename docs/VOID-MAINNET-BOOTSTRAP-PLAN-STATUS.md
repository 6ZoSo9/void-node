# VOID mainnet bootstrap PLAN pillar status

This document records the current status of the VOID mainnet bootstrap PLAN pillar.

## What the PLAN pillar covers

The PLAN pillar is about the readiness of the mainnet bootstrap configuration and simulated flow,
before any real mainnet broadcast happens. It is driven by:

- The live config file:
  - config/void-mainnet-bootstrap-mainnet.live.json
- The plan scripts:
  - ops/void-mainnet-bootstrap-plan-sim.sh
  - ops/void-mainnet-bootstrap-plan-health-all.sh
  - ops/void-mainnet-bootstrap-plan-status.sh
  - ops/void-mainnet-bootstrap-plan-all.sh
- The PLAN metrics and recordings:
  - void_mainnet_bootstrap_plan_configured
  - void_mainnet_bootstrap_plan_health
  - void_mainnet_bootstrap_plan_health_info
  - void:mainnet_bootstrap_plan:health:last_5m

The mainnet health hammer ops/void-mainnet-health-all.sh uses
void:mainnet_bootstrap_plan:health:last_5m as a gate.

## Current state (as of this checkpoint)

At the moment the PLAN scripts and metrics are wired, but the PLAN pillar is intentionally not green.

The current metrics show:

- void_mainnet_bootstrap_plan_configured = 1
- void_mainnet_bootstrap_plan_health = 0
- void_mainnet_bootstrap_plan_health_info{reason="bad_roles"} = 1
- void:mainnet_bootstrap_plan:health:last_5m = 0

The PLAN status script prints the reason as bad_roles and explains that the live config
contains placeholder addresses.

This is expected. The live config uses zero or placeholder 0x addresses for core mainnet roles:

- roles.deployer
- roles.treasuryAdmin
- roles.opsTreasury
- roles.updateGateAdmin
- roles.configGateAdmin
- roles.rewardAdmin

Because of that, ops/void-mainnet-bootstrap-plan-sim.sh reports RESULT: NOT READY (bad_roles)
and the PLAN pillar health remains zero.

ops/void-mainnet-health-all.sh currently gates on void:mainnet_bootstrap_plan:health:last_5m,
so it returns NOT_OK while the PLAN pillar is not ready.

All other pillars are green:

- void:mainnet_overall:health:last_5m_v2 = 1
- void:mainnet_pillars:health:last_5m = 1
- void:mainnet_lastmile:health:last_5m = 1
- void_safeboot_overall_health = 1

The only red piece is the bootstrap PLAN pillar, by design.

## What still needs to happen later

The PLAN pillar will only go green after a real mainnet key ceremony and config fill:

1. Generate real mainnet keys for the core roles on hardware wallets or a LUKS protected medium,
   following the design in docs/void-mainnet-bootstrap-roles-and-keys.md.

2. Fill config/void-mainnet-bootstrap-mainnet.live.json with the real 0x addresses for:

   - roles.deployer
   - roles.treasuryAdmin
   - roles.opsTreasury
   - roles.updateGateAdmin
   - roles.configGateAdmin
   - roles.rewardAdmin

3. Re-run the plan hammers:

   - ./ops/void-mainnet-bootstrap-plan-sim.sh
   - ./ops/void-mainnet-bootstrap-plan-health-all.sh
   - ./ops/void-mainnet-bootstrap-plan-status.sh
   - ./ops/void-mainnet-bootstrap-plan-all.sh

4. Once the PLAN metrics report health = 1 and
   void:mainnet_bootstrap_plan:health:last_5m = 1, rerun:

   - ./ops/void-mainnet-health-all.sh

At that point the PLAN pillar will be green and mainnet-health-all will pass the PLAN gate.

## Intent

Until the real mainnet key ceremony happens, the PLAN pillar is expected to stay in the
bad_roles state. This is a guard, not a bug.

The rest of the system (devnet, safeboot, mainnet core, mainnet last-mile) can move forward
while the PLAN pillar waits on real keys and addresses.
