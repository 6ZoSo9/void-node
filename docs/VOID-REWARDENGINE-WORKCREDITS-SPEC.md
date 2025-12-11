# VOID RewardEngine ↔ Work Credits Integration (v1 draft)

This doc ties together the pieces we’ve already built:

- **VoidToken** (VOID, mainnet governance/staking token)
- **ValidatorSet** (who can validate, with voting power)
- **RewardEngine** (emissions + per-validator balances, pays in VOID)
- **WorkCreditsToken (WC)** (earnable work token, 18-dec)
- **WorkCreditsMinter** (trusted minter for WC, called by RewardEngine)
- **WorkCreditsPoolV1 / relayer** (WC↔VOID AMM + relayer path)
- **Ops/Prom stacks** (econ JSON, gauges, pillars, plan health)

Goal: make it crystal-clear how VOID emissions and Work Credits relate, so on mainnet we can explain to validators and users exactly how they get paid and what the knobs are.

---

## 1. Emissions model (VOID side)

**RewardEngine.sol** (contracts/mainnet/RewardEngine.sol):

- Hard-cap: `EMISSIONS_BUDGET = 333_333_333e18` VOID.
- Tracks:
  - `totalEmitted` (VOID pulled into accounting)
  - per-validator `_claimable[validator]` balances
- Key roles:
  - `token()` → IVoidTokenLike (VOID contract)
  - `validatorSet()` → IValidatorSetLike
  - `admin()` → emission admin (likely UpdateGate/AdminGate-controlled later)

Core functions:

- `pullEmission(uint256 amount)`
  - `onlyAdmin`
  - `totalEmitted + amount <= EMISSIONS_BUDGET` or revert `"emissions cap"`.
  - Pure accounting; funding of the RewardEngine address is done via Treasury/Ops wiring.
- `credit(address validator, uint256 amount)`
  - `onlyAdmin`
  - Adds to `_claimable[validator]`.
  - v1: called by off-chain policy / admin; v2: driven by epoch rewards logic.
- `claim()`
  - Called by validator (msg.sender).
  - Reads `_claimable[msg.sender]`, zeroes it, transfers that much VOID via `token.transfer`.

Net effect: RewardEngine is a scoped faucet for a fixed 333,333,333 VOID budget, with admin deciding how much VOID to pull and how to split it per validator.

---

## 2. Work Credits model (WC side)

**WorkCreditsToken.sol** (contracts/mainnet/WorkCreditsToken.sol):

- ERC20-like token with:
  - fixed admin (governance)
  - a single `minter` address (WorkCreditsMinter)
- Admin sets the minter once for mainnet via `setMinter(address)`.

**WorkCreditsMinter.sol** (contracts/mainnet/WorkCreditsMinter.sol):

- Holds:
  - `wc()` → WorkCreditsToken
  - `admin()` → governance for this minter
  - `rewardEngine()` → the only address allowed to award WC
- Key functions:
  - `setRewardEngine(address)` (admin-only, non-zero)
  - `setAdmin(address)` (admin-only, non-zero)
  - `award(address to, uint256 amount, bytes32 pillar, bytes32 agent, bytes32 category)`
    - `onlyRewardEngine`
    - non-zero `to`, non-zero `amount`
    - mints `amount` WC to `to`
    - pillar/agent/category are labels for future metrics/attribution

Tests already assert:

- Only admin can change rewardEngine/admin.
- Only `rewardEngine` can call `award`.
- Multiple awards accumulate supply and balances correctly.

---

## 3. Econ JSON (RewardEngine params)

`config/void-mainnet-rewardengine-params.json` (now pinned and guarded by tests + ops) describes:

- `epochLengthBlocks`: `3600`
- `epochsPerDay`: `12`
- `wcDailyEmissionStart`: `"100000000000000000000000"` (100,000e18 WC)
- `wcPerEpochStart`: `"8333333333333333333333"` (~100,000e18 / 12)
- `wcEmissionDecayBpsPerYear`: `500` (5% per-year decay, if we enable it)
- `weightFormula`: `"sqrt(stake) * uptime * performance"`
- `weightComponents` describes:
  - stake = sqrt(staked VOID)
  - uptime = fraction of duties performed in epoch (0–1)
  - performance = 0 or 1 (slashed vs healthy) in v1
- `notes` explain the units and the decay.

This JSON is:

1. **Unit-tested** by `RewardEngineEpochSpec` to exist and be valid JSON.
2. **Ops-tested** by `ops/void-mainnet-rewardengine-econ-exporter.sh`, which sets:
   - `void_mainnet_rewardengine_econ_json_ok`
   - `void_mainnet_rewardengine_econ_self_consistent`
   - `void_mainnet_rewardengine_econ_health`
   - `void:mainnet_rewardengine_econ:health:last_5m`

Pillars now embed this via:

- `void:mainnet_pillars_with_validators_rewardengine_econ:health:last_5m`
- `void:mainnet_pillars_with_validators_rewardengine_econ_workcredits_plan:health:last_5m`

So if econ JSON breaks, the **plan pillar goes red** even if contracts compile.

---

## 4. Conceptual flow: VOID emissions → WC awards

High-level v1 story:

1. **Validators stake VOID & run nodes.**
   - Staking/contracts side: ValidatorSet + RewardEngine handle who is eligible.
   - Node side: lastmile, txroot, header3, uptime metrics, etc.

2. **RewardEngine admin pulls VOID emissions over time.**
   - Admin (gated by UpdateGate/AdminGate) calls `pullEmission(amount)` periodically.
   - Treasury/Ops ensures the RewardEngine contract is actually funded with VOID.

3. **Off-chain reward calculator computes per-validator shares per epoch.**
   - Uses:
     - stake (from ValidatorSet)
     - uptime (from node metrics / Prom)
     - performance flags (slash/health status)
     - econ JSON parameters (epoch length, daily WC, decay).
   - For v1, this logic can live off-chain in an ops script.

4. **RewardEngine credits validators (VOID) and triggers WC awards.**
   - For VOID:
     - Admin uses `credit(validator, amountVoid)` and validators `claim()` on-chain.
   - For WC:
     - RewardEngine (or an associated operator acting as RewardEngine) calls:
       - `WorkCreditsMinter.award(validator, wcAmount, pillar, agent, category)`
   - Guardrails:
     - Only the configured `rewardEngine` address can call `award`.
     - Pillar/agent/category are chosen to reflect the *type* of work (e.g. `"validators"`, `"ai"`, `"infra"`).

5. **Workers/validators accumulate WC and VOID.**
   - VOID is scarce governance/staking token.
   - WC is “work fuel”:
     - tradeable via WC/VOID pool (WorkCreditsPoolV1)
     - spendable for agent jobs, NFTs, etc.

---

## 5. Phase plan for implementation

### Phase 1 — Wiring + health (what we have now + near-term)

- RewardEngine contract and tests ✅
- Econ JSON + RewardEngineEpochSpec ✅
- Ops exporter + gauges + pillars ✅
- WorkCreditsToken + WorkCreditsMinter contracts + tests ✅
- WorkCredits PLAN gauges + composite pillar ✅

Next incremental wiring steps:

1. **Bootstrap scripts**:
   - Ensure dev/bootstrap scripts:
     - Deploy RewardEngine with correct VoidToken + ValidatorSet + admin.
     - Deploy WorkCreditsToken + WorkCreditsMinter.
     - Set `wc.setMinter(address(minter))`.
     - Set `minter.setRewardEngine(address(rewardEngine))`.
   - Ensure the resulting addresses are written into:
     - Devnet state JSON
     - Mainnet bootstrap template.

2. **Prom/ops smoke for contracts:**
   - Script that:
     - Reads RewardEngine/WorkCreditsMinter addresses from config.
     - Uses `cast code` to assert non-empty bytecode.
   - Expose textfile gauges:
     - `void_mainnet_rewardengine_contract_ok`
     - `void_mainnet_workcredits_minter_contract_ok`
   - Optionally fold these into an econ/plan health sub-pillar.

### Phase 2 — Off-chain epoch calculator

- Implement an ops script that:
  - Pulls validator set / stake.
  - Pulls uptime/performance metrics from Prometheus.
  - Applies the `weightFormula` from JSON.
  - Computes proposed VOID + WC awards for a target epoch.
  - Emits:
    - a dry-run JSON report (per-validator diff),
    - a textfile metric like `void_mainnet_rewardengine_epoch_plan_ok`.
- Later can be wired into CI/pre-push gates.

### Phase 3 — On-chain refinement

- Replace manual `credit` calls with a more structured flow:
  - On-chain epoch snapshots of voting power.
  - On-chain “epoch finalize” function that takes a commitment or Merkle proof of work data.
- Long-term: tie this into ReceiptRegistry / JobQueue for AI work.

---

## 6. UI implications (Obelisk / dashboard)

The RewardEngine ↔ WC wiring needs to show up in the human UI:

- **Wallet tab (Obelisk Wallet)**:
  - Show:
    - VOID balance
    - WC balance
    - “Pending VOID rewards” (RewardEngine.claimable)
  - Buttons:
    - “Claim VOID rewards” (calls RewardEngine.claim)
    - “Collect pending WC” (off-chain or on-chain claim path depending on design)

- **Trading View tab**:
  - Show WC/VOID pool depth, price, and slippage estimates.
  - Simple buy/sell for VOID ↔ WC.

- **Dashboard tab**:
  - Per-validator reward summary:
    - Latest epoch rewards (VOID + WC)
    - 24h / 7d totals
    - Uptime / performance stats.

This doc is v1 draft; we’ll evolve it alongside the bootstrap scripts and ops exporters.
