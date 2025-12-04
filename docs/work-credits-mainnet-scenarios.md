# VOID Network — Work Credits Mainnet Scenarios (PLAN-Only)

This doc describes **how Work Credits (WC) behave in real-world flows** on
VOID mainnet. It ties together:

- Validator uptime rewards
- LLP (UptimeVaultLLP) liquidity
- Relayers and gasless UX
- Obelisk / NullFeed frontends
- Treasury + RewardEngine constraints

It is **PLAN-only** and must stay consistent with:

- docs/work-credits-plan.md
- docs/work-credits-mainnet-wiring.md
- docs/work-credits-mainnet-bootstrap-runbook.md
- docs/work-credits-dashboard.md

No code or metrics should contradict this doc.

-------------------------------------------------------------------------------
0. Actors and Components (Quick Reference)
-------------------------------------------------------------------------------

Actors:

- Validator:
  - Runs a validator node.
  - Earns VOID via RewardEngine.
  - Indirectly drives WC issuance via RewardEngine -> WorkCreditsMinter.

- Full node / relayer operator:
  - Runs full nodes, relayer infra, and/or job agents.
  - May earn WC (via RewardEngine) and/or VOID (via Treasury/RewardEngine).

- End user:
  - Holds VOID and WC in Obelisk.
  - Uses WC for gasless flows and in-app features (NullFeed, future apps).

- Relayer:
  - Off-chain infra that submits transactions on behalf of users.
  - Gets:
    - VOID working capital (from the 200k VOID relayer fund).
    - WC fees via WorkCreditsRelayerHelper.

- lpTreasury:
  - Protocol-owned address that governs UptimeVaultLLP.
  - Receives VOID from VoidTreasury and WC from WorkCreditsMinter.
  - Seeds and maintains protocol-owned liquidity.

- AI / agent:
  - Future: on-chain AI jobs rewarded in WC/VOID.
  - Uses JobQueue + RewardEngine + WorkCreditsMinter paths.

Core contracts (mainnet):

- VoidToken
- VoidEmissionsController
- VoidTreasury
- OpsTreasury
- RewardEngine
- WorkCreditsToken
- WorkCreditsMinter
- UptimeVaultLLP
- WorkCreditsRelayerHelper

-------------------------------------------------------------------------------
1. Scenario A — Validator Uptime → VOID → WC
-------------------------------------------------------------------------------

Goal: show how **validator work** turns into both VOID and WC, without breaking
tokenomics or giving WC arbitrary print powers.

High-level:

1) Validator stakes VOID and participates in consensus.
2) RewardEngine pays validator in VOID for blocks / epochs.
3) AdminGate/ConfigGate can direct a portion of emission budgets into WC by
   configuring RewardEngine → WorkCreditsMinter flows.
4) WorkCreditsMinter mints WC **only** when RewardEngine tells it to.

Detailed flow (PLAN):

1. Validator stakes:

   - Validator stakes N VOID into ValidatorSet via mainnet contracts.
   - Validator0 is wired at bootstrap, future validators join via standard
     staking flows.

2. Reward accrual in RewardEngine:

   - Per epoch/block, RewardEngine accrues rewards:
     - Some portion → validator reward accounts (VOID).
     - Optionally, some portion assigned as "WC-eligible reward budget".

3. RewardEngine triggers WC mint:

   - RewardEngine calls WorkCreditsMinter with a "reward plan":

     - Address of beneficiary (validator, node operator, agent, etc.).
     - Amount of WC to mint.
     - Reason/category (for bookkeeping / metrics).

   - WorkCreditsMinter checks:
     - Caller == RewardEngine.
     - Budget constraints (per-epoch, per-role, per-category) as defined in
       docs/work-credits-plan.md.
   - If OK, WorkCreditsMinter mints WC to beneficiary.

4. Net result for validator:

   - Validator periodically receives:
     - VOID (direct from RewardEngine).
     - WC (indirect via RewardEngine → WorkCreditsMinter).

5. Invariants:

   - No validator or operator can call WorkCreditsMinter directly.
   - No “emergency backdoor” mint in Minter or Token.
   - WC emission curves remain within the bounds defined in
     docs/work-credits-plan.md.

-------------------------------------------------------------------------------
2. Scenario B — User Pays Gas with WC via Relayer (Gasless UX)
-------------------------------------------------------------------------------

Goal: end user submits a transaction but spends WC instead of fronting VOID
for gas. A relayer pays gas in VOID and gets compensated in WC.

High-level:

1) User signs a request in Obelisk:
   - Contains desired transaction.
   - Contains WC payment terms (max WC to spend, acceptable fee, etc.).

2) Relayer receives the request:
   - Verifies signatures and terms.
   - Submits tx on-chain using its own VOID for gas.

3) After tx is mined, relayer settles WC payment via WorkCreditsRelayerHelper.

Detailed flow:

1. Setup:

   - Relayer has:
     - VOID balance (from the 200k VOID relayer fund).
     - WC balance (initially zero, grows as it collects fees).
   - WorkCreditsRelayerHelper knows:
     - voidToken
     - wcToken
     - vault (UptimeVaultLLP)
     - admin (relayerAdmin)
     - relayer
     - relayerFeeBps

2. User creates request:

   - In Obelisk, user selects:
     - "Pay gas with WC" option.
   - Wallet constructs:
     - Transaction payload (to VOID Network).
     - WC-limit and fee bounds.
     - Nonce & expiry to prevent replay.
   - User signs the message with their VOID key.

3. Relayer executes:

   - Relayer verifies:
     - Signature.
     - Nonce / expiry.
     - WC fee terms within policy.
   - Relayer submits the real on-chain tx using its own VOID.

4. WC → VOID settlement via helper:

   - After tx is confirmed:
     - User approves WC in favor of WorkCreditsRelayerHelper and/or
       uses a pre-approved allowance pattern.
     - Relayer calls swapWcForVoidViaRelayer(...) on helper, specifying:
       - WC amount to charge user.
       - Minimum VOID or equivalent the relayer expects to recoup.

   - WorkCreditsRelayerHelper:
     - Pulls WC from user.
     - Uses UptimeVaultLLP to swap WC→VOID internally.
     - Sends resulting VOID to relayer.

   - Relayer net:
     - Spent VOID as gas.
     - Received VOID back + optional margin.
     - Gains or maintains WC and/or VOID according to fee model.

5. Invariants:

   - Helper never mints WC or touches Treasury/RewardEngine.
   - All VOID spent on gas originally came from:
     - Relayer's working capital, funded from the 200k VOID relayer allocation.
   - Fee logic is transparent and controlled by relayerAdmin (AdminGate governed).

-------------------------------------------------------------------------------
3. Scenario C — User Uses WC Directly (No Relayer)
-------------------------------------------------------------------------------

Goal: user has both VOID and WC and chooses to manage their own gas but also
use WC as a “soft fuel” for certain actions.

Examples:

- Paying protocol-level WC fees for advanced features.
- Buying cosmetic / boost items in NullFeed.
- Funding AI workloads via JobQueue.

High-level:

1) User holds VOID and WC in Obelisk.
2) User submits transactions directly (pays gas in VOID).
3) Contracts charge WC from user for specific actions.

NullFeed example (future, PLAN):

1. Channel boosts:

   - User wants to boost a channel or post.
   - Contract charges WC:
     - WC is transferred from user to a NullFeed revenue address
       and/or burned depending on design.
   - User still pays network gas in VOID for the boost transaction.

2. Cosmetics / avatars:

   - User buys a cosmetic or avatar using WC.
   - WC flows:
     - Part to a creator pool.
     - Part to a sink (burn, LLP, or Treasury as defined in plan).

AI Job example (future):

- User or agent submits a JobQueue task.
- WC is reserved/locked for the job.
- Once completed, a portion of WC is paid out to workers; the rest may be
  burned or routed back into Treasury/LLP as designed.

Invariants:

- All WC usage must have a clear sink / routing:
  - Burn, Treasury, LLP, or creator pools.
- Gas for tx is always VOID when user sends directly.

-------------------------------------------------------------------------------
4. Scenario D — LLP Seeding and Ongoing Rebalancing
-------------------------------------------------------------------------------

Goal: LLP (UptimeVaultLLP) is **protocol-owned** and seeded with the 9.8M VOID
slice from Treasury, plus matching WC liquidity.

Initial seeding (bootstrap-phase):

1) VoidTreasury moves 10M VOID to WC plumbing path:
   - 9.8M VOID destined for LLP.
   - 200k VOID reserved for relayers.

2) lpTreasury receives the 9.8M VOID portion.

3) WorkCreditsMinter mints WC to lpTreasury:
   - RewardEngine calls Minter with a special "LLP seed" category.
   - Minter mints a matching WC amount (e.g. 9.8M WC) to lpTreasury.

4) lpTreasury seeds LLP:

   - Approves VOID and WC to UptimeVaultLLP.
   - Calls seedLockedLiquidity(9.8M VOID, 9.8M WC) (or similar signature).

5) LLP is now live.

Ongoing rebalancing (post-bootstrap):

- Policies (PLAN-level, not hard-coded here) may allow:
  - Periodic top-ups using governance decisions (AdminGate/ConfigGate).
  - Skims of excess fees or imbalanced liquidity into Treasury/LLP.

Invariants:

- No automatic drains from Treasury.
- LLP governance remains protocol-owned via lpTreasury.
- All movements are:
  - Explicit.
  - Auditable.
  - Governed via AdminGate/ConfigGate.

-------------------------------------------------------------------------------
5. Scenario E — Relayer Working Capital and Risk
-------------------------------------------------------------------------------

Goal: describe how relayers get their 200k VOID working capital and how they
are incentivized without making them systemic risk.

Funding:

1) VoidTreasury allocates 200k VOID to relayer infrastructure:
   - Either directly to relayer EOAs.
   - Or to a dedicated RelayerFund contract controlled by relayerAdmin.

2) RelayerAdmin (governed via AdminGate) can:
   - Onboard new relayers.
   - Update allowances.
   - Revoke misbehaving relayers.

Operational behavior:

- Relayers:
  - Use their VOID working capital to submit user transactions.
  - Charge users WC via WorkCreditsRelayerHelper.
  - May realize profit in WC or VOID depending on fee schedules.

Risk controls:

- No auto-top-up:
  - When a relayer burns through its working capital, it is forced to:
    - Stop serving requests, or
    - Ask governance for more funding (explicit decision).

- Abuse:
  - If a relayer misbehaves, relayerAdmin rotates them out.
  - Remaining working capital can be clawed back where contractually supported.

-------------------------------------------------------------------------------
6. Scenario F — Obelisk + NullFeed UI Integration (v1)
-------------------------------------------------------------------------------

Goal: show how the **user-facing dashboard** tells a coherent story for WC.

Obelisk v1 (PLAN):

- Wallet shows:
  - VOID balance.
  - WC balance.
  - LLP exposure (if user holds LLP receipts in later versions).
  - Recent WC inflows (rewards) and outflows (fees).

- Gas toggle:
  - "Pay gas with VOID" (default).
  - "Pay gas with WC via relayer" (optional, where available).

- Work Credits page:
  - WC sources:
    - Validator rewards.
    - Node/agent job rewards.
    - Promotions / campaigns (if configured via RewardEngine).
  - WC sinks:
    - Gasless fees.
    - NullFeed boosts / cosmetics.
    - AI job costs.

NullFeed v1 (PLAN):

- Channel actions that can cost WC:
  - Boost channel visibility.
  - Promote posts.
  - Buy cosmetics (future).
- Each WC-spend action:
  - Clearly shows:
    - WC cost.
    - Where value flows (creator/Treasury/burn/LLP).

Invariants:

- UI must never suggest that WC can be printed arbitrarily.
- All UI stories map back to:
  - RewardEngine → WorkCreditsMinter for mint.
  - Explicit contract-level sinks for burn/flows.

-------------------------------------------------------------------------------
7. Scenario G — AI / Agents and WC (Future)
-------------------------------------------------------------------------------

Goal: hook AI jobs into WC without compromising mainnet safety.

High-level:

1) AI jobs flow through JobQueue-style contracts.
2) RewardEngine may allocate a portion of emissions to AI workers:
   - In VOID.
   - Or as WC via WorkCreditsMinter.

3) Users or DAOs pay WC to have jobs executed.

Scenarios:

- AI worker node:
  - Runs agents that process queued jobs.
  - RewardEngine → WorkCreditsMinter awards WC for completed jobs.
  - Worker can:
    - Keep WC for future spends.
    - Swap WC to VOID via LLP.

- AI-heavy dApp:
  - Frontend charges WC for inference or training tasks.
  - WC is distributed to:
    - Workers.
    - Protocol sinks (Treasury / LLP / burn) based on policy.

Invariants:

- All WC minted to AI workers follows the same constraints and budgets as
  validators and relayers.
- AI does not get a magic faucet; it shares the same reward budgets.

-------------------------------------------------------------------------------
8. Metrics and Health Expectations (Summary)
-------------------------------------------------------------------------------

Each scenario has metrics backing it. At a minimum we expect:

- A composite WC + relayers health signal:
  - void:work_credits:health_v3:last_5m
  - void:relayers:health:last_5m
  - void:mainnet_pillars_with_keys_ai_wc_relayers:health:last_5m

- LLP metrics:
  - VOID and WC balances.
  - Fee income and utilization ratios.

- Relayer metrics:
  - VOID balances over time.
  - WC fee income.
  - Success/failure rates for gasless flows.

- Scenario coverage:
  - Dev/test pipelines that simulate:
    - Validator reward → WC.
    - User WC spend via relayer.
    - LLP seeding and rebalancing.
    - NullFeed/Obelisk WC-flows.

-------------------------------------------------------------------------------
9. Canonical Status and Change Process
-------------------------------------------------------------------------------

This doc is canonical for **scenario-level behavior** of Work Credits on
VOID mainnet. The following must align with it:

- Contracts:
  - WorkCreditsToken
  - WorkCreditsMinter
  - UptimeVaultLLP
  - WorkCreditsRelayerHelper
- Scripts:
  - VoidMainnetBootstrapMainnet.s.sol (PLAN + run)
  - VoidWorkCreditsMainnetPlan.s.sol
  - Any dev bootstrap scripts for WC.
- Ops:
  - ops/void-work-credits-mainnet-*.sh
  - Prometheus exporters and rules referenced in WC docs.
- UI:
  - Obelisk and NullFeed flows that expose WC.

If behavior changes:

1) Update docs/work-credits-mainnet-scenarios.md first.
2) Update plan/wiring/bootstrap/dashboard docs.
3) Only then change contracts, scripts, exporters, or UI.

