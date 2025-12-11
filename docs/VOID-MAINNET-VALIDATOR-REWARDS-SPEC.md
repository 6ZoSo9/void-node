# VOID Mainnet – Validator Rewards & RewardEngine Economics (v1 baseline)

## 1. Overview

This document defines the **v1 baseline** for validator rewards on VOID mainnet.

- Validators are paid in **Work Credits (WC)**, not VOID.
- VOID is the **scarce governance / staking token**.
- WC is the **work / utility token**, earned by validators and spendable on:
  - Agent jobs
  - NullFeed / NFTs / app usage
  - Trading vs VOID in the WC/VOID pool

RewardEngine:

- Only moves **WC**, never VOID.
- Splits a fixed **WC pool per epoch** across validators.
- Uses per-epoch weights derived from:
  - Staked VOID
  - Uptime
  - Performance / penalties
- Stores per-validator entitlements (`accrued`) and lets validators **claim** WC.

Treasuries:

- **VoidTreasury**: holds premine / long-term VOID.
- **OpsTreasury**: receives VOID from VoidTreasury and is allowed to:
  - Fund WC emissions and liquidity.
  - Top up the WC/VOID pool.
  - Top up RewardEngine’s WC balance as needed.

## 2. Epoch structure

Time is partitioned into fixed-length epochs.

- **Block time (approx)**: 2 seconds
- **Epoch length (v1)**: `epoch_length_blocks = 3,600` blocks
  - ~2 hours per epoch at 2s blocks
- **Epochs per day**: `epochs_per_day = 12`

For each epoch `k`:

- There is a **WC pool** `R_k` allocated to validators.
- Each validator `v` has a weight `w_{v,k}`.
- Rewards per validator:

\[
\text{reward}_{v,k} = R_k \cdot \frac{w_{v,k}}{\sum_j w_{j,k}}
\]

RewardEngine’s job is to enforce:

- The pool `R_k` is respected.
- The per-validator amounts match the configured weights.
- Claims move WC from RewardEngine to validator wallets and zero out `accrued`.

## 3. Weight formula (v1)

Weights blend stake and work.

We define:

- `stake_factor_v = sqrt(staked_VOID_v)` (sublinear in stake)
- `uptime_factor_{v,k} ∈ [0,1]` (fraction of duties performed in epoch `k`)
- `performance_factor_{v,k} ∈ {0,1}` (1 = healthy, 0 = slashed / penalized in v1)

### v1 weight formula

\[
w_{v,k} = \sqrt{\text{stake}_v} \cdot \text{uptime}_{v,k} \cdot \text{performance}_{v,k}
\]

Interpretation:

- Stake gives you **baseline weight**.
- Uptime scales your share **down** if you miss blocks / duties.
- Performance factor kills your share during penalty windows.

Later versions may replace `performance_factor` with more granular scoring (e.g. misbehavior tiers), but v1 is binary.

## 4. WC emissions

### 4.1 Daily emission target (v1)

We define a simple v1 target:

- **Daily WC to validators**: `W_daily = 100,000 WC`
- With `epochs_per_day = 12`, per-epoch pool:

\[
R_k = \frac{W_{\text{daily}}}{12} \approx 8,333.33\ \text{WC per epoch}
\]

In 18-decimal units:

- `W_daily = 100000 * 10^18 = 100000000000000000000000` (100,000e18)
- `R_k ≈ 8333333333333333333333` (floor of W_daily / 12 in 18-dec units)

This is the **initial** emission rate. Future governance can adjust `W_daily` or move to a declining schedule.

### 4.2 Optional decay (future)

Planned but **not enforced in v1 contracts**:

- After year 1, apply a gentle decay, e.g. `5%` per year:
  - `W_daily(year+1) = W_daily(year) * 0.95`

This can be implemented via off-chain config + RewardEngine epoch driver scripts, rather than baked into contract code.

## 5. Example scenarios

Assume all validators are online and not penalized:

- `uptime_factor = 1`
- `performance_factor = 1`

### 5.1 Three validators, different stakes

- V1 stakes `10,000 VOID`
- V2 stakes `40,000 VOID`
- V3 stakes `90,000 VOID`

Then:

- `stake_factor_1 = sqrt(10,000) = 100`
- `stake_factor_2 = sqrt(40,000) ≈ 200`
- `stake_factor_3 = sqrt(90,000) ≈ 300`

Weights:

- `w_1 = 100`
- `w_2 = 200`
- `w_3 = 300`
- `Σ w = 600`

Per-epoch pool `R = 8,333 WC`.

Per-epoch rewards:

- V1: `R * 100/600 ≈ 1,389 WC`
- V2: `R * 200/600 ≈ 2,778 WC`
- V3: `R * 300/600 ≈ 4,167 WC`

Per day (12 epochs):

- V1: ~16,668 WC/day
- V2: ~33,336 WC/day
- V3: ~50,004 WC/day

Notice:

- V3 stakes 9× V1, but only earns ~3× the WC.
- This is intentional: **sublinear** rewards keep whales from completely dominating.

### 5.2 Uptime penalty

Same stakes, but V3 has poor uptime:

- `uptime_3 = 0.5` (50% of expected duties)

Effective weights:

- V1: `100`
- V2: `200`
- V3: `300 * 0.5 = 150`
- `Σ w = 450`

Per epoch:

- V1: `8,333 * 100/450 ≈ 1,852 WC`
- V2: `8,333 * 200/450 ≈ 3,704 WC`
- V3: `8,333 * 150/450 ≈ 2,777 WC`

So a large-stake validator with bad uptime can earn **less** than a mid-stake validator with good uptime. That is the desired behavior.

## 6. On-chain vs off-chain responsibilities

### 6.1 On-chain (RewardEngine)

RewardEngine (on-chain) is responsible for:

- Storing epoch pools and weights (or an equivalent compressed representation).
- Enforcing that total payouts for epoch `k` do not exceed `R_k`.
- Computing and storing per-validator accruals.
- Moving WC to validators on `claim()` and zeroing out `accrued`.
- Exposing views for accounting and observability (e.g. per-validator, per-epoch stats).

RewardEngine does **not**:

- Decide `W_daily`.
- Decide epoch length.
- Compute uptime / performance from raw metrics.
- Touch VOID.

### 6.2 Off-chain (epoch driver / ops)

Off-chain jobs (epoch driver) must:

1. Determine the current epoch `k` based on head block number.
2. Decide pool `R_k`:
   - For v1, `R_k = W_daily / epochs_per_day` with a fixed `W_daily`.
3. Compute `w_{v,k}` using data from:
   - `ValidatorSet` (staked VOID).
   - Node metrics / receipts (uptime, misbehavior).
4. Call RewardEngine:
   - `configureEpoch(k, R_k)`
   - `pushWeights(k, validators[], weights[])`
   - `finalizeEpoch(k)`
5. Ensure RewardEngine has enough WC:
   - OpsTreasury (or another emissions controller) mints/transfers WC to RewardEngine.

Config (on disk) defines:

- `epoch_length_blocks`
- `wc_daily_emission_start`
- Optional decay rate (bps/year)
- Pointers to metrics sources for uptime/performance

## 7. Claim behavior

Validators claim WC from RewardEngine:

- Each validator has an `accrued` WC balance in RewardEngine.
- `claim()` (or `claimFor(validator)` if supported) should:
  - Transfer WC from RewardEngine to the validator address.
  - Set `accrued[validator] = 0`.

Obelisk / wallet UI should expose:

- Current `pending WC` for each validator.
- “Claim WC” button that calls `claim()`.
- Basic history (recent claimed amounts).

## 8. Invariants and guardrails

Key invariants:

1. **Pool cap per epoch**  
   - Sum of all rewards for epoch `k` must be `<= R_k` (within 1 wei slack).
2. **No VOID handling**  
   - RewardEngine must not transfer or depend on VOID.
   - VOID flows are handled by Treasury / OpsTreasury / pools.
3. **Monotonic accrual**  
   - `accrued[validator]` should be non-decreasing inside an epoch and reset only via `claim()` (or explicit slash logic, if added).
4. **Deterministic splits**  
   - Given the same `R_k` and weights, RewardEngine must produce the same per-validator entitlements.

This document is the **canonical v1 baseline** for VOID mainnet validator rewards and RewardEngine economics.
