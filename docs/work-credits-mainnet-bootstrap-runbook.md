# VOID Network — Work Credits Mainnet Bootstrap Runbook (PLAN)

This runbook describes how we will bootstrap the Work Credits (WC) stack on
VOID mainnet once:

- Core mainnet pillars are green.
- Keys + PLAN pillars are locked.
- Work Credits PLAN + wiring are stable.

It is PLAN-only for now – no actual broadcasts. Scripts referenced here may be
stubs until we implement the real contracts:

- WorkCreditsToken
- WorkCreditsMinter
- UptimeVaultLLP
- WorkCreditsRelayerHelper

Use this runbook as the operator narrative that ops/ scripts and
VoidMainnetBootstrapMainnet.s.sol must obey.

-------------------------------------------------------------------------------
0. Pre-requisites (must be true before touching WC on mainnet)
-------------------------------------------------------------------------------

Before we even think about wiring WC on real mainnet:

1) Mainnet pillars + keys + PLAN all green

   Run:

       ./ops/void-mainnet-planning-health-all.sh
       ./ops/void-mainnet-keys-health.sh

   Expect:

   - void_mainnet_bootstrap_plan_health == 1
   - void:mainnet_bootstrap_plan:health:last_5m == 1
   - void:mainnet_pillars_with_keys:last_5m == 1

2) WC docs are in sync

   The following must all tell the same story:

   - docs/work-credits-plan.md
   - docs/work-credits-mainnet-wiring.md
   - docs/work-credits-mainnet-scenarios.md
   - docs/work-credits-dashboard.md
   - docs/work-credits-mainnet-bootstrap-runbook.md (this file)

   Shared invariants:

   - 10,000,000 VOID WC budget (9.8M LLP + 200k relayers).
   - RewardEngine -> WorkCreditsMinter is the only mint path.
   - LLP + relayers are protocol-owned infra, not personal bags.

3) Keys + roles mapping ready

   - LUKS-encrypted voidkey mounted at /mnt/voidkey.
   - config/void-mainnet-bootstrap-mainnet.live.json exists and passes PLAN checks.
   - /mnt/voidkey/meta/mainnet-roles-mapping.txt contains core roles:
     deployer, treasuryAdmin, opsTreasuryAdmin, validatorAdmin, adminGateOwner,
     updateGateOwner, configGateOwner, treasuryOwner, opsTreasuryOwner,
     rewardEngineOwner, validatorSetOwner.
   - Later, that same mapping will also contain:
     wcGovernance, wcMinterAdmin, lpTreasury, relayerAdmin.

4) Ops/metrics plumbing stable

   - WC JSON shaper + roles planner:

         ./ops/void-work-credits-mainnet-plan-json.sh
         ./ops/void-work-credits-mainnet-roles-plan.sh

   - WC composite health:

         ./ops/void-work-credits-health-all.sh

   - Composite metric (future, once wired):

     - void:mainnet_pillars_with_keys_ai_wc_relayers:health:last_5m == 1

If any of the above is red, WC bootstrap is blocked.

-------------------------------------------------------------------------------
1. Phase 1 — Fill LIVE JSON with WC / LLP / relayer roles
-------------------------------------------------------------------------------

Goal: get config/void-mainnet-bootstrap-mainnet.live.json to contain real
addresses for all WC-related roles, while keeping everything PLAN-only.

1.1 Inspect current WC-related keys

From repo root:

    cd "$HOME/dev/void-node"
    ./ops/void-work-credits-mainnet-plan-json.sh
    ./ops/void-work-credits-mainnet-roles-plan.sh

Expect (until keys are assigned):

- wcGovernance, wcMinterAdmin, lpTreasury, relayerAdmin are 0x0.
- Roles mapping file reports WC roles as MISSING (PLAN: add when keys are ready).

1.2 When ready: assign real WC roles

This happens only after the real mainnet key ceremony.

Operator steps (high-level):

1) Choose hardened mainnet addresses for:

   - wcGovernance
   - wcMinterAdmin
   - lpTreasury
   - relayerAdmin
   - one or more relayer addresses (EOA or relayer manager contract)

2) Update LIVE JSON using scripts (avoid raw manual edits):

   - Edit via a small transformer or jq-based script if needed.
   - Re-run:

         ./ops/void-work-credits-mainnet-plan-json.sh
         ./ops/void-work-credits-mainnet-roles-plan.sh

3) Update roles mapping:

   - Append WC roles and their addresses to:
     /mnt/voidkey/meta/mainnet-roles-mapping.txt
   - Re-run:

         ./ops/void-mainnet-roles-verify.sh
         ./ops/void-mainnet-keys-health.sh

Exit criteria for Phase 1:

- WC roles in LIVE JSON are non-zero.
- Roles mapping passes all checks.
- void_mainnet_keys_roles_ok == 1 remains true.

-------------------------------------------------------------------------------
2. Phase 2 — PLAN-only rehearsal for WC bootstrap
-------------------------------------------------------------------------------

Goal: rehearse the WC wiring with no real deployments and no fund movements.

2.1 Run core PLAN rehearsal

    cd "$HOME/dev/void-node"
    ./ops/void-mainnet-planning-health-all.sh

Expect:

- VoidMainnetBootstrapMainnet.plan(...) runs successfully.
- PLAN checklist shows:
  - roles: non-zero
  - contracts: may still be 0x0 before real deployment
- Narrative is coherent and matches the docs.

2.2 Run WC-specific PLAN rehearsal

    cd "$HOME/dev/void-node"
    ./ops/void-work-credits-mainnet-plan-json.sh
    ./ops/void-work-credits-mainnet-roles-plan.sh
    ./ops/void-work-credits-mainnet-plan-sim.sh

Where void-work-credits-mainnet-plan-sim.sh wraps:
script/VoidWorkCreditsMainnetPlan.s.sol with a PLAN-style log.

Expect logs like:

- wcGovernance, wcMinterAdmin, lpTreasury, relayerAdmin statuses.
- 10M VOID split:
  - 9.8M VOID to LLP (UptimeVaultLLP)
  - 200k VOID to relayers
- Explicit statement that this is PLAN-only (no deployments, no fund movements).

2.3 Composite WC + relayers health

    cd "$HOME/dev/void-node"
    ./ops/void-work-credits-health-all.sh

Expect:

- Component metrics OK (once exporters exist).
- Composite metric:

  - void:mainnet_pillars_with_keys_ai_wc_relayers:health:last_5m == 1

If work-credits-health-all fails, WC bootstrap is blocked.

-------------------------------------------------------------------------------
3. Phase 3 — Implement WC contracts on devnet (rehearsal only)
-------------------------------------------------------------------------------

Before touching real mainnet, we implement and test WC contracts on devnet.

Steps (high-level):

1) Implement contracts in contracts/:

   - WorkCreditsToken
     - ERC-20 WC token with governance and minter roles.
   - WorkCreditsMinter
     - Holds issuance policy.
     - Admin role under AdminGate/ConfigGate.
     - rewardEngine pointer for mint authority.
   - UptimeVaultLLP
     - Holds VOID + WC.
     - Governance set to lpTreasury (protocol-owned).
   - WorkCreditsRelayerHelper
     - Holds voidToken, wcToken, vault, admin, relayer, relayerFeeBps.
     - Implements swapWcForVoidDirect(...) and swapWcForVoidViaRelayer(...).

2) Add dev/test scripts:

   - script/VoidWorkCreditsDevBootstrap.s.sol (name TBD).
   - Dev configs under config/void-work-credits-dev*.json.

3) Run dev rehearsals on anvil:

   Example (exact name TBD):

       forge script script/VoidWorkCreditsDevBootstrap.s.sol:VoidWorkCreditsDevBootstrap \
         --rpc-url http://127.0.0.1:8545 \
         --broadcast \
         --slow

4) Wire Prometheus exporters and dashboards for dev:

   - LLP liquidity (VOID + WC balances).
   - WC minted/burned per source.
   - Relayer balances and health.

Only after dev WC pipelines are green do we return to mainnet WC wiring.

-------------------------------------------------------------------------------
4. Phase 4 — Extend mainnet PLAN narrative for WC (no broadcast)
-------------------------------------------------------------------------------

Here we extend the PLAN narrative, still without broadcasting anything.

1) Extend VoidMainnetBootstrapMainnet.plan() to include a WC section, e.g.:

   - Step 7: Wire Work Credits / LLP / relayers
     - Describe deployment of WorkCreditsToken, WorkCreditsMinter,
       UptimeVaultLLP, WorkCreditsRelayerHelper.
     - Describe the 10M VOID movement from VoidTreasury to:
       - LLP (9.8M)
       - relayers (200k)
     - Describe RewardEngine -> WorkCreditsMinter wiring.

2) Extend bootstrap-plan-checklist to include WC fields:

   - Report if WC roles are configured.
   - Later, report if WC contract addresses in LIVE JSON are non-zero.

3) Keep this phase PLAN-only:

   - No broadcasts.
   - PLAN scripts must not write WC production health metrics yet.

-------------------------------------------------------------------------------
5. Phase 5 — Real mainnet WC wiring (future)
-------------------------------------------------------------------------------

This phase only happens once:

- Mainnet is live and stable.
- Core contracts deployed and verified:
  VoidToken, VoidTreasury, OpsTreasury, RewardEngine, ValidatorSet,
  AdminGate, ConfigGate, emissions controller, etc.
- Premine moved into VoidTreasury.
- Emissions and RewardEngine budgets configured.

High-level broadcast steps (to be implemented later):

1) Deploy WC contracts with mainnet addresses:

   - WorkCreditsToken
     - governance = wcGovernance (from LIVE JSON).
   - WorkCreditsMinter
     - token = WorkCreditsToken
     - admin = wcMinterAdmin
     - rewardEngine = RewardEngine
   - UptimeVaultLLP
     - voidToken = VoidToken
     - workCreditsToken = WorkCreditsToken
     - governance = lpTreasury
   - WorkCreditsRelayerHelper
     - admin    = relayerAdmin
     - relayer  = relayerEOA or relayer manager contract
     - voidToken = address(VoidToken)
     - wcToken   = address(WorkCreditsToken)
     - vault     = address(UptimeVaultLLP)

2) Wire RewardEngine -> WorkCreditsMinter:

   - WorkCreditsToken.setMinter(WorkCreditsMinter).
   - RewardEngine gains authority to mint WC via WorkCreditsMinter.award(...).

3) Move 10M VOID into WC plumbing:

   From VoidTreasury:

   - 9.8M VOID to LLP path (via lpTreasury as needed).
   - 200k VOID to relayer accounts or a RelayerFund contract.

   LLP seeding:

   - lpTreasury approves VOID and WC to UptimeVaultLLP.
   - UptimeVaultLLP.seedLockedLiquidity(9.8M VOID, wcSeedAmount).

4) Configure relayers:

   - WorkCreditsRelayerHelper.setRelayer(relayerEOAOrManager).
   - WorkCreditsRelayerHelper.setRelayerFeeBps(initialFeeBps).

5) Update LIVE JSON contracts section:

   - contracts.workCreditsToken
   - contracts.workCreditsMinter
   - contracts.uptimeVaultLLP
   - contracts.workCreditsRelayerHelper

   Then re-run:

       ./ops/void-mainnet-bootstrap-plan-checklist.sh
       ./ops/void-work-credits-health-all.sh

6) Confirm metrics:

   - LLP liquidity metrics match expected totals.
   - Relayer balances sane and tracked.
   - Composite health:
     - void:mainnet_pillars_with_keys_ai_wc_relayers:health:last_5m == 1

At that point, WC plumbing is considered mainnet active.

-------------------------------------------------------------------------------
6. Rollback / safety notes
-------------------------------------------------------------------------------

If anything goes wrong at any stage:

1) Stop new WC operations:

   - Pause any WC-specific automation.
   - Pause relayer infra if it depends on LLP.

2) Metrics:

   - Allow exporters to set:

       void:work_credits:health_v3:last_5m == 0

   - This should pull down:

       void:mainnet_pillars_with_keys_ai_wc_relayers:health:last_5m == 0

3) Apps:

   - Obelisk:
     - Disable WC swaps and WC-based gasless flows.
     - Keep WC balances visible but mark status as degraded.

   - NullFeed:
     - Disable new WC spends for cosmetics/boosts.
     - Core chat remains functional.

4) Root cause and patch cycle:

   - Reproduce and fix in dev.
   - Rehearse on anvil with PLAN + tests.
   - Only then re-attempt any mainnet WC actions.

-------------------------------------------------------------------------------
7. Canonical status
-------------------------------------------------------------------------------

This runbook is canonical for the operator view of WC bootstrap.

The following must follow this doc:

- script/VoidMainnetBootstrapMainnet.s.sol
- script/VoidWorkCreditsMainnetPlan.s.sol
- ops/void-work-credits-*.sh
- Any exporters and dashboards referenced by docs/work-credits-dashboard.md

If changes are needed:

1) Update this runbook first.
2) Update wiring / scenarios / dashboard docs.
3) Only then change scripts/contracts.

