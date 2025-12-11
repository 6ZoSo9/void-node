# VOID Mainnet Validator Reward Policy — V1 Skeleton (DRAFT)

This doc defines HOW validators are supposed to get paid on VOID mainnet,
without locking in final percentages yet. It sits on top of:

- The locked tokenomics (MAX_SUPPLY / PREMINE / EMISSIONS).
- RewardEngine + econ JSON.
- WorkCredits (WC) + WC/VOID pool.

Final numbers (percent splits, absolute budgets) will be decided at bootstrap
time and encoded into:
- RewardEngine params JSON
- Bootstrap scripts (Dev/Mainnet)
- Monitoring / SLOs

This file is about structure and invariants.

---

## 1. Reward categories

Over 100 years, EMISSIONS (333,333,333 VOID) are conceptually allocated into:

1. **Validator rewards**
   - Paying nodes that actually run validators and keep the chain alive.
   - Paid in WC (Work Credits), convertible to VOID via the WC/VOID pool.

2. **Agent / AI job rewards**
   - Paying agents / models / datasets that execute jobs on the network.
   - Also paid in WC, subject to separate policies (job receipts, coverage).

3. **Ecosystem / growth**
   - Future incentives for:
     - NullFeed usage / content
     - NFTs / avatar marketplace
     - App builders / integrations
   - Paid in WC or VOID, but always coming from RewardEngine-controlled budgets.

4. **Reserve / governance / safety**
   - Buffer for protocol changes, emergencies, or future governance decisions.
   - Should not be spent casually.

The *exact* split across these is TBD. What is fixed is:
- Total emissions over 100 years are capped at 333,333,333 VOID.
- RewardEngine enforces that cap.

---

## 2. Structural rules for validator rewards

We don’t lock percentages yet, but we DO lock rules:

1. **Validators get a dedicated slice**
   - There MUST be an explicitly configured portion of emissions assigned to validators.
   - This can vary by era, but there must always be a non-zero budget while the network is alive.

2. **Paid in WC, not raw VOID**
   - Validators earn **Work Credits (WC)** as their primary reward token.
   - WC is minted by WorkCreditsMinter under a RewardEngine-authorized budget.
   - Validators can swap WC → VOID through the WC/VOID pool.

3. **Performance-linked**
   - Reward allocation per validator must depend on:
     - Being in the active validator set.
     - Being staked correctly.
     - Uptime / participation over an epoch window (e.g., seals signed, head progress).
   - Exact scoring formula is still TBD, but:
     - Offline or misbehaving validators should earn less or zero.
     - Honest, consistently-online validators should earn proportionally more.

4. **No hidden mint paths**
   - All validator rewards must flow through:
     - RewardEngine (emission budget)
     - WorkCreditsMinter (WC mint)
     - Validator-oriented distribution logic
   - No “backdoor” minting of WC or VOID.

---

## 3. Accounting + flow

Conceptual flow for validator rewards:

1. For a given period (epoch / day / week):

   - RewardEngine determines a **validator reward budget** for that period,
     expressed in VOID-equivalent (within its emissions cap).

2. RewardEngine calls into WorkCreditsMinter with:
   - `amountBudgetedForValidators` (VOID-equivalent)
   - metadata (era, epoch, period index)

3. WorkCreditsMinter:
   - Converts budget into WC using a configured policy (initially 1:1 VOID-equivalent → WC for simplicity).
   - Mints WC to one of:
     - A ValidatorRewardsDistributor contract, OR
     - Directly to validator addresses (if design stays simple).

4. Distribution:
   - ValidatorRewardsDistributor (or equivalent) splits the minted WC based on
     per-validator performance and stake.
   - Validators receive WC into their wallet addresses.

5. Conversion:
   - Validators who want VOID can:
     - Swap WC → VOID via WorkCreditsPoolV1.
     - Or keep WC for ecosystem usage (NullFeed, NFTs, services).

---

## 4. Policy levers (things we can tune later)

We intentionally leave these tunable:

1. **Validator share vs other categories**
   - Example (NOT FINAL): validators get 50% of emissions, agents 30%, ecosystem 15%, reserve 5%.
   - Actual numbers will be chosen closer to mainnet launch and encoded in RewardEngine JSON + tests.

2. **Per-era weighting**
   - Early eras might give validators a higher share to bootstrap the network.
   - Later eras can shift more emissions toward agents / ecosystem once validator set is stable.

3. **Performance formula**
   - Weight by:
     - stake amount
     - uptime
     - correct participation (seals, votes, etc.)
   - Could include penalties for misbehavior (slashing is separate but related).

4. **Distribution cadence**
   - How often rewards are computed and minted:
     - Every block, every N blocks, daily, etc.
   - We should balance:
     - UX (frequent enough to feel responsive)
     - Gas/complexity (not too frequent).

5. **Validator minimums**
   - Minimum stake to be eligible.
   - Minimum uptime to avoid being treated as “inactive”.

---

## 5. Invariants and monitoring

We will enforce these via both tests and Prometheus:

1. **Emissions cap**
   - Tests + RewardEngine metrics must guarantee:
     - Sum(emissions authorized across all categories) ≤ EMISSIONS total.
   - Per-era caps MUST hold as well.

2. **Validator budget visibility**
   - There must be explicit metrics for:
     - `void_mainnet_validator_rewards_budget_total`
     - `void_mainnet_validator_rewards_budget_used`
     - (or equivalent names)
   - Ops dashboards should show:
     - Current era’s validator budget allocation.
     - Used vs available.

3. **WC supply sanity**
   - WC supply attributable to validators should be measurable:
     - e.g., a metric for total WC minted “for validator rewards”.
   - WC minted for validators should not exceed the approved VOID-equivalent validator budget.

4. **No-reward edge cases**
   - If no validators meet minimum performance criteria:
     - Either rewards are not minted for that period, OR
     - They are held in a buffer for the next period.
   - This must be deterministic and visible in metrics/logs.

5. **Validator reward health metric**
   - We will eventually add a composite metric like:
     - `void_mainnet_validators_rewards_health`
   - That metric should go to 0 if:
     - Emissions budget math breaks,
     - Distribution fails,
     - Or validator reward flows are clearly stuck.

---

## 6. Bootstrap implications

For the **real mainnet bootstrap**:

- This doc + the RewardEngine econ JSON + the WorkCredits plan must agree.
- The bootstrap scripts MUST:
  - Set the initial validator reward share (by era).
  - Wire RewardEngine → WorkCreditsMinter → validator distribution.
  - Seed the WC/VOID pool.
- The keys/roles pillar must guarantee:
  - Only the expected admins can change:
    - RewardEngine parameters.
    - WorkCreditsMinter relationships.
    - Validator reward distribution logic.

Until we lock actual percentages, this doc is the structural contract with Future-Us:
- Validators get a dedicated, performance-linked WC reward path.
- Everything flows through RewardEngine + WorkCreditsMinter.
- Emissions caps are respected.
- Monitoring tells us when we’ve screwed up.

