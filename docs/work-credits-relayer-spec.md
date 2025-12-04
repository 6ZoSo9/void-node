# VOID Network — Work Credits Relayer & Gasless UX Spec

This document defines how **relayers** implement “gasless” UX for WC flows **without** turning VOID into a permanent subsidy. It is the canonical reference for:

- How relayers price gas in WC
- How relayers interact with the WC/VOID LLP (`UptimeVaultLLP`)
- When relayers must refuse a request
- How the 10M VOID seed is expected to remain self-sustaining

---

## 1. Context: 10M VOID Split

From `docs/work-credits-plan.md`:

- **Total reserved for WC/VOID plumbing:** 10,000,000 VOID
- Split:
  - **9,800,000 VOID → UptimeVaultLLP** (protocol-owned liquidity)
  - **200,000 VOID → Relayer cluster** (gas working capital)

LLP rules (summarized):

- VOID only leaves LLP via **swaps that send WC in**.
- Each swap charges a fee that is retained in the pool.
- Liquidity is treated as **permanent**; we don’t drain it in normal operation.

Relayer rules (summarized):

- Relayers start funded with some slice of the 200k VOID.
- They pay gas in VOID.
- They charge users **WC fees** and use `UptimeVaultLLP` to turn WC → VOID.
- Over time, a well-behaved relayer’s VOID balance should stay flat or **increase**, not drain.

---

## 2. Core Invariant

> **Relayers must never be net VOID-subsidizing users.**  
> For each gasless operation, the expected VOID inflow (via WC → VOID swaps) must be **≥** the VOID spent on gas, plus a safety margin.

If that cannot be guaranteed for a given request, the relayer **must reject** the operation.

This invariant is what makes the one-time 10M seed realistically “one and done”.

---

## 3. Gasless Flow (High-Level)

### 3.1 Actors

- **User**
  - Holds WC (zero or low VOID).
  - Wants to perform an action:
    - Swap WC → VOID
    - Buy NFT / cosmetics with WC
    - Some other WC-based high-level action

- **Relayer**
  - Holds VOID (seeded from the 200k pool).
  - Has access to user WC via:
    - A signature-based flow, or
    - A pre-approved allowance to a helper contract.
  - Calls on-chain contracts, paying gas in VOID.

- **Contracts**
  - `WorkCreditsToken`: ERC-20 WC.
  - `UptimeVaultLLP`: WC/VOID AMM.
  - Future NFT / background / extras contracts.

### 3.2 Flow Steps (Generic Gasless Operation)

1. **User signs an intent**
   - Off-chain message describes:
     - The action (swap, NFT purchase, etc.).
     - The maximum WC they are willing to spend for fees.
     - A deadline / nonce.
   - Includes replay protection and a cap on WC spend.

2. **Relayer quotes cost**
   - Estimates `gas_cost_void = gas_limit * gas_price`.
     - May apply a per-operation cap; if gas estimate is too high, reject early.
   - Queries `UptimeVaultLLP` for a WC → VOID quote:
     - Spot price and worst-case slippage for the necessary size.
     - If LLP depth is too low or slippage is extreme, reject.

3. **Relayer computes WC fee**

   Core formula:

   \[
   \text{wc\_fee} = \left(\frac{\text{gas\_cost\_void}}{\text{void\_per\_wc}}\right) \times \text{safety\_factor} + \text{markup}
   \]

   Where:

   - `void_per_wc` is taken from LLP with slippage constraints.
   - `safety_factor > 1` (e.g. 1.10–1.25):
     - Covers gas price spikes between quote and inclusion.
     - Covers small pricing errors, rounding, and slippage.
   - `markup`:
     - Additional WC that, converted to VOID, becomes relayer profit over time.
     - Can be zero for “bare cost” mode but default should be > 0.

   If `wc_fee > user_max_wc_fee_from_signature`, **reject** the operation.

4. **Relayer executes on-chain**
   - Relayer:
     - Collects `wc_fee` from user (via transfer or helper contract).
     - Performs any WC business logic:
       - For swaps, may route WC → VOID inside the LLP directly.
       - For NFT purchases, sends required WC to NFT contract and/or burn sink.
     - Pays gas for all txs in **VOID** from its own EOA.

5. **Relayer rebalances via LLP**
   - Relayer swaps enough WC → VOID in `UptimeVaultLLP` to:
     - Cover **at least** `gas_cost_void`.
     - Optionally accumulate a little extra VOID.

   **Key requirement**: Over many operations, sum(VOID in) ≥ sum(VOID gas out) + target margin.

---

## 4. When to Reject Requests

The relayer **must** refuse to relay when any of these conditions are met:

1. **LP too thin**
   - LLP reserves or price impact indicate that swapping WC → VOID for the needed size would incur:
     - Unacceptable slippage, or
     - A broken price (e.g., void_per_wc extremely low).
   - Policy: define hard thresholds for minimum reserve depth and max price impact.

2. **Gas cost out of range**
   - Estimated `gas_cost_void` exceeds:
     - A per-operation gas limit,
     - Or the relayer’s own risk thresholds.
   - Gasless support is **not a right**; it is a convenience that has limits.

3. **User max WC fee too low**
   - Required `wc_fee` (based on safety factor and markup) exceeds the user’s max WC fee in the signed message.
   - Prevents the relayer from unilaterally charging more.

4. **Relayer balance too low**
   - Relayer’s VOID balance is under a safety threshold.
   - Even if an operation would be profitable on paper, the relayer may pause service until it rebalances or an operator intervenes.

In all these cases, the relayer simply declines to relay the transaction, and the user must either:

- Get VOID and pay gas directly, or
- Retry later when conditions improve.

---

## 5. Expected Long-Term Behavior

If the invariant is respected:

1. **Relayer VOID balances**
   - Do **not** trend down over time.
   - Variance exists block-to-block, but over many operations:
     - Expected VOID_in_from_WC_swaps ≥ VOID_out_for_gas.

2. **LLP health**
   - As users:
     - Swap VOID → WC (for NFTs, etc.),
     - Swap WC → VOID (for staking, trading, etc.),
   - LLP fees accumulate, and reserves deepen.
   - The WC price of VOID tends to rise as WC supply grows unbounded.

3. **Effective burn**
   - Large VOID amount is locked as **protocol-owned liquidity** in LLP.
     - We do not withdraw this under normal conditions.
   - Additional VOID gets sunk into user NFTs and long-term holdings.
   - From a circulation standpoint, liquid VOID becomes effectively scarcer.

---

## 6. Monitoring Requirements

Relayer and LLP monitoring should include at minimum:

- **Relayer metrics** (per relayer address):
  - `void_relayers_void_balance{relayer="..."}` — current VOID balance.
  - `void_relayers_void_spent_gas_total{relayer="..."}` — cumulative VOID spent on gas.
  - `void_relayers_void_recovered_total{relayer="..."}` — cumulative VOID re-bought via LLP.
  - `void_relayers_wc_collected_total{relayer="..."}` — cumulative WC fees collected.

  From these, derive:
  - `void_relayers_void_pnl = void_recovered_total - void_spent_gas_total`.
  - Alerts if PnL trends negative over relevant windows.

- **LLP metrics**:
  - `void_llp_void_reserve`
  - `void_llp_wc_reserve`
  - `void_llp_price_void_per_wc` and `void_llp_price_wc_per_void`
  - Swap volume and fee accumulation.

- **Work credits metrics** (already present):
  - `void_work_credits_total` and breakdown by agent/pillar.
  - `void:work_credits:health_v3:last_5m` for overall health.

Alerting should:

- Flag when:
  - Relayer VOID balance drops below a safety threshold.
  - Relayer PnL is significantly negative over N hours/days.
  - LLP VOID reserve or WC reserve drops below agreed minimum.
  - `void:work_credits:health_v3:last_5m` is unhealthy.

Response actions:

- Auto-disable gasless service.
- Increase WC fee multiplier or markup.
- Require explicit governance intervention for any protocol-level changes.

---

## 7. Implementation Notes (Future Work)

This spec does **not** yet define:

- A specific on-chain helper contract for gasless meta-tx handling.
- Exact signature formats and replay protection.
- Exact Prometheus metric names for relayer and LLP health.

Those should be added later as:

- `docs/work-credits-relayer-helper-spec.md`
- `contracts/mainnet/WorkCreditsRelayerHelper.sol`
- `ops/void-work-credits-relayer-exporter.sh` + Prometheus rules.

For now, this document serves as the **economic and protocol-level spec** that all implementations must follow.

