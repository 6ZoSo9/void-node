# VOID Reward Engine – Spec V1

This document describes the first on-chain version of the VOID reward engine and how it connects to the locked mainnet tokenomics.

It is a spec for the Solidity contracts under `contracts/mainnet/` and the invariants enforced by tests under `test/mainnet/`.

---

## 1. Tokenomics recap (locked)

Global constants (VOID units, 18 decimals in code):

- **MAX_SUPPLY** = `666,666,666 VOID`
- **PREMINE**    = `333,333,333 VOID`
- **EMISSIONS**  = `333,333,333 VOID` (over 100 years, 4 eras)
- **FOUNDER_TRUST** = `230,000,000 VOID` (subset of premine)
- **OTHER_PREMINE** = `103,333,333 VOID` = `333,333,333 - 230,000,000`

The split is:

- Premine (`333,333,333 VOID`) at genesis:
  - `230,000,000 VOID` → Founder Trust (VoidFounderTrustVesting)
  - `103,333,333 VOID` → Other premine buckets (ecosystem, infra, LP, etc.) via cold treasury.
- Emissions (`333,333,333 VOID`) are **never** part of the premine. They are minted over time via the reward engine only.

The spec-health pipeline enforces these with metrics:

- `void_mainnet_tokenomics_max_supply`
- `void_mainnet_tokenomics_premine_total`
- `void_mainnet_tokenomics_emissions_total`
- `void_mainnet_tokenomics_premine_founder_trust`
- `void_tokenomics_*_void` textfile metrics

and the invariants are checked by:

- `void_mainnet_tokenomics_spec_health`
- `void:mainnet_tokenomics:spec_health:last_5m`

If these diverge, the `VoidMainnetTokenomicsSpecMismatch` alert fires.

---

## 2. Contracts involved

### 2.1 VoidToken (summary)

`VoidToken` (not fully restated here) is the ERC20-like mainnet token with:

- `MAX_SUPPLY = 666,666,666e18`.
- A **premine** of `333,333,333e18`, minted at genesis and sent into the premine vault.
- An emission budget of `333,333,333e18`, which may only be minted under strict rules (RewardEngine path).

Tests:

- `test/VoidToken.t.sol`
- `test/TokenomicsSpec.t.sol`

assert:

- `premine + emissions == maxSupply`
- Premine bucket percentages and founder trust amount match the spec docs.

---

### 2.2 VoidPremineVault

`contracts/VoidPremineVault.sol`

Responsibilities:

- Receive the full premine (`333,333,333e18`) at genesis.
- One-way funding of downstream contracts according to the allocation spec:
  - `230,000,000e18` → `VoidFounderTrustVesting`
  - Remaining `103,333,333e18` → `VoidTreasury` and any other premine buckets.
- No arbitrary withdrawals; only pre-defined, admin-gated funding flows.

The vault is a one-time router for the premine. It is not responsible for emissions.

---

### 2.3 VoidFounderTrustVesting

`contracts/VoidFounderTrustVesting.sol`

Responsibilities:

- Hold `FOUNDER_TRUST = 230,000,000e18` inside the premine.
- Enforce long-horizon vesting/lockup rules for the founder trust allocation (VOID Labs LLC use: infra, property, long-term R&D).
- Prevent this allocation from behaving like a short-term degen bag.

Tests and docs confirm:

- `TOTAL_TRUST = 230,000,000e18`
- Vault funds it with exactly this amount.

---

### 2.4 VoidTreasury (cold)

`contracts/mainnet/VoidTreasury.sol`

Responsibilities:

- Act as the **cold treasury** for the protocol.
- Hold premine funds (non-founder buckets) and potentially future protocol-owned assets.
- Expose a controlled path to the hot treasury (`OpsTreasury`) via `sendToOps`:

  - Only callable by an admin.
  - Moves funds from `VoidTreasury` → `OpsTreasury`.
  - Emits event(s) with a reason tag (`bytes32`).

It does **not** perform external payments directly. All spending goes through `OpsTreasury`.

Tests (`test/mainnet/Treasury.t.sol`) assert:

- Only admin can call `sendToOps`.
- Funds move from cold → hot treasury correctly.

---

### 2.5 OpsTreasury (hot)

`contracts/mainnet/OpsTreasury.sol`

Responsibilities:

- Hold **operational hot funds** that have already left the cold treasury.
- Provide a controlled `spend` function:

  - Only callable by the same admin authority.
  - Transfers tokens to vendors, infra providers, etc.
  - Records a `bytes32` reason tag for bookkeeping / off-chain accounting.

Tests assert:

- Non-admin cannot spend.
- Admin spends correctly move funds to the vendor and preserve overall supply.

---

### 2.6 ValidatorSet (interface)

`contracts/mainnet/IValidatorSetLike.sol`

Interface (summary):

- Tracks a set of validators and their voting power.
- Exposes at minimum:

  - The total active voting power.
  - The power of a specific validator address.
  - Basic membership view (explicit enumerable interface may be added later).

Implementation (`ValidatorSet.sol`) will be finalized separately. For now:

- Reward engine tests use a `MockValidatorSet` in `test/mainnet/RewardEngine.t.sol`.
- The real mainnet `ValidatorSet` will likely sit behind `UpdateGate`/`AdminGate`, with epoch-based updates and slashing hooks.

---

### 2.7 RewardEngine

`contracts/mainnet/RewardEngine.sol`

Core responsibilities:

1. **Emissions budget enforcement**

   - Holds a constant emissions budget:

     - `EMISSIONS_BUDGET = 333,333,333e18`

   - Tracks how much emission has been “pulled” so far.
   - Provides an admin-only `pullEmission(amount)` function which:

     - Reverts if `pulled + amount > EMISSIONS_BUDGET`.
     - Updates internal accounting so the **total emission over mainnet lifetime cannot exceed the 333,333,333 VOID budget**.
     - For tests, uses a mock token; for mainnet, it will integrate with the real `VoidToken` mint path.

   Tests:

   - `testEmissionsBudgetMatchesSpec()` asserts the budget constant equals the locked emissions amount.
   - `testPullEmissionCapsAtBudget()` ensures pulling cannot exceed the budget.

2. **Validator-based reward claims**

   - Holds a reference to a `IValidatorSetLike` instance.
   - Uses validator voting power to apportion claimable rewards.
   - Provides a `claim()` path where:

     - A validator can claim its share of rewards based on its power fraction.
     - Reverts when there is nothing to claim.

   Tests:

   - `testClaimFlow()` checks that a validator can claim and balances move as expected.
   - `testClaimRevertsWhenNothingToClaim()` covers the empty-claim path.

3. **Admin and safety**

   - `testOnlyAdminCanPullEmission()` ensures only the configured admin can pull emissions.
   - The engine is **not** responsible for slashing or validator churn – it just consumes voting power from `ValidatorSet` and enforces the global emission budget.

The long-term plan is:

- Wire RewardEngine into real on-chain components:
  - Minting from `VoidToken` under a “RewardEngine-only” mint gate.
  - Periodic emission pulls from `VoidTreasury`/`OpsTreasury` as needed.
  - Validator churn controlled by governance through `ValidatorSet`.

---

## 3. Invariants and monitoring

### 3.1 Solidity-level invariants (tests)

From `test/TokenomicsSpec.t.sol`, `test/VoidToken.t.sol`, `test/mainnet/Treasury.t.sol`, and `test/mainnet/RewardEngine.t.sol` we enforce:

- `premine + emissions == maxSupply`.
- `FOUNDER_TRUST = 230,000,000` inside the premine.
- Emissions budget constant is `333,333,333`.
- Treasury flow:
  - Only admin can move funds from `VoidTreasury` → `OpsTreasury`.
  - Only admin can spend from `OpsTreasury`.
- Reward engine:
  - Total pulled emission can never exceed the global budget.
  - Claims are validator-power-based.
  - Non-admins cannot pull emission.

### 3.2 Metrics-level invariants

On the monitoring side:

- `void_mainnet_tokenomics_max_supply` must match `void_tokenomics_max_supply_void`.
- `void_mainnet_tokenomics_premine_total` must match `void_tokenomics_premine_void`.
- `void_mainnet_tokenomics_emissions_total` must match `void_tokenomics_emissions_void`.
- `void_mainnet_tokenomics_premine_founder_trust` must match `void_tokenomics_founder_trust_void`.
- `void_tokenomics_other_premine_void` must match `premine_total - founder_trust`.

These are combined into:

- `void_mainnet_tokenomics_spec_health` (1 = OK, 0 = mismatch)
- `void:mainnet_tokenomics:spec_health:last_5m` (smoothed SLO)

and are used by:

- `VoidMainnetTokenomicsSpecMismatch` alert.
- The mainnet tokenomics pillar + overall health scoreboard.

Reward engine runtime metrics (emissions pulled, validator claims) will be exported and wired into Prometheus in a future phase, after the contract interface is fully nailed down.

---

## 4. Future work (Reward Engine V2+)

Planned hardening steps:

1. Implement the real `ValidatorSet` contract with:
   - Epoch-based validator changes.
   - Ties to `UpdateGate`/governance.
   - Optional slashing hooks.

2. Connect `RewardEngine` to:
   - Real `VoidToken` mint path with an explicit “reward engine mint gate”.
   - On-chain `VoidTreasury`/`OpsTreasury` flows where appropriate.

3. Export Prometheus metrics for:
   - Emissions pulled vs budget.
   - Per-epoch reward allocations.
   - Validator claim activity.

4. Extend tests:
   - Cross-check emissions counters against on-chain balances.
   - Simulate multi-epoch validator churn and reward distribution.

This document is **source of truth** for RewardEngine V1 and its relationship to premine, emissions, treasury, and validator rewards. Any future changes must update both the contracts and this spec.
