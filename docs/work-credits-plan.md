# VOID Network — Work Credits (WC) & WC/VOID LLP (Canonical Plan)

This document defines the **canonical design** for Work Credits, the WC/VOID liquidity pool, and gasless UX via relayers. It is the source of truth for how WC interacts with VOID at the protocol and economic level.

---

## 1. Roles: VOID vs Work Credits (WC)

- **VOID**
  - Native L1 token.
  - Pays **gas**, governs the network, backs economic security.
  - Scarce, capped by mainnet tokenomics.
  - Emissions and premine are **fixed** by `VoidToken` + `VoidEmissionsController` specs.

- **Work Credits (WC)**
  - ERC-20–style token (implemented by `WorkCreditsToken`).
  - **Infinite / unbounded** supply — can expand as long as the network generates work.
  - Earned by doing **useful work** (validators, nodes, AI agents, infra).
  - Used to:
    - Swap to VOID via the WC/VOID pool (`UptimeVaultLLP`).
    - Buy future NFTs, avatars, cosmetics, boosts, etc.
  - Not a gas token; has **no direct protocol-level monetary guarantee**.

High-level rule:

> VOID is the hard asset and gas token. WC is soft “fuel” that users burn to access VOID and digital goods.

---

## 2. Core Contracts

Already implemented (mainnet folder):

- `WorkCreditsToken.sol`
  - ERC-20 with:
    - `governance`
    - `minter`
    - `mint` / `burnFrom` controlled by governance + minter.
  - Designed so **only trusted minters** (like the WorkCreditsMinter) can issue WC.

- `WorkCreditsMinter.sol`
  - Owns the **WC issuance policy** for on-chain integration.
  - Has:
    - `admin` (config)
    - `rewardEngine` (authorized to award WC)
  - `awardWorkCredits(address to, uint256 amount)`
    - Callable only by `rewardEngine`.
    - Mints WC through the `WorkCreditsToken` minter hook.
  - This gives us a clean bridge from **RewardEngine / jobs / AI work** into WC.

- `UptimeVaultLLP.sol`
  - The WC/VOID **liquidity pool** (LLP).
  - Holds balances of:
    - `voidToken` (VOID)
    - `workCreditsToken` (WC)
  - Supports:
    - `seedLockedLiquidity(...)` — one-time seeding.
    - `addLockedLiquidity(...)` — governance/top-ups if ever needed.
    - `swapVoidForWc(...)`
    - `swapWcForVoid(...)`
    - `setFeeBps(...)` controlled by governance.
  - Implements:
    - A basic constant-product-style AMM.
    - A small fee taken on each swap, retained in the pool.
  - LLP liquidity is **protocol-owned**; we do not expect to withdraw it in normal operation.

Tests confirm the basic behavior:
- Cannot swap before seeding.
- Governance controls fee and liquidity.
- Swaps work and respect fee and invariants.

---

## 3. Canonical VOID Seeding Plan for WC/VOID

We reserve **10,000,000 VOID** from the premine for WC/VOID economic plumbing at mainnet bootstrap.

This 10M VOID is split as:

- **9,800,000 VOID** → `UptimeVaultLLP` (protocol-owned liquidity)
- **200,000 VOID** → Relayer cluster (gas working capital)

This is the **canonical split** unless explicitly changed in tokenomics/docs later.

### 3.1 UptimeVaultLLP Seed

On mainnet bootstrap:

- `UptimeVaultLLP.seedLockedLiquidity` will be called with:
  - `voidAmount ≈ 9.8M VOID`
  - `wcAmount` set to a matching or policy-selected WC level (e.g. 9.8M WC or higher).
- This pool becomes:
  - Primary **market** between WC and VOID.
  - Anchor for WC pricing.
  - Long-term sink for VOID: liquidity **stays in the pool**.

LLP invariants:

1. VOID only leaves the LLP via **swaps that send WC in**.
2. Each swap pays a **fee** retained in the pool, growing reserves and raising the floor.
3. The protocol does **not** routinely withdraw liquidity; LLP VOID is treated as **permanent** protocol liquidity (a form of soft burn).

### 3.2 Relayer Seed

We allocate **200,000 VOID** across one or more **relayer accounts** that pay gas for “gasless” UX:

- Example distribution:
  - 4 relayers × 50,000 VOID each, or
  - 2 relayers × 100,000 VOID each.

These relayers:

- Hold VOID to pay gas.
- Receive WC from users for gasless operations.
- Periodically swap WC → VOID via `UptimeVaultLLP` to refill / grow their VOID balance.

---

## 4. Gasless UX via WC and Relayers

### 4.1 Hard Rule: Gas Is Always Paid in VOID

At the EVM level:

- **Gas is always paid in VOID**, by the transaction sender.
- Contracts (including LLP) **cannot** pay their own gas.

We do **not** make WC a gas token. Instead, we simulate “WC-paid gas” through relayers and pricing.

### 4.2 Gasless Operation Flow

For any “gasless” action (user has WC, not VOID):

1. User signs an **off-chain message** describing an action:
   - “Swap X WC → VOID”
   - “Buy NFT/background with X WC”
   - etc.
2. The relayer:
   - Validates the signature.
   - Estimates `gas_cost_void = gas_limit * gas_price`.
   - Queries `UptimeVaultLLP` to get `void_per_wc` (including slippage).
3. The relayer computes WC fee:

   \[
   \text{wc\_fee} = \left(\frac{\text{gas\_cost\_void}}{\text{void\_per\_wc}}\right) \times \text{safety\_factor} + \text{markup}
   \]

   with:
   - `safety_factor > 1` to cover spikes/slippage.
   - `markup` to accumulate a small margin in VOID over time.

4. The relayer:
   - Calls the necessary contracts on-chain, paying gas in **VOID**.
   - Collects WC from the user (transfers or burns as per design).
   - Sells enough of that WC into the LLP (swap WC → VOID) to cover **at least** the gas cost.
   - Optionally keeps surplus VOID as profit.

Result:

- The relayer’s VOID balance stays **flat or grows** over time.
- The LLP sees steady WC inflow and fee accrual.
- From the user’s perspective, they “paid with WC” and didn’t need VOID in their wallet.

### 4.3 Bounded Gasless UX

To keep this sustainable:

- Only selected calls are eligible for relayer subsidy:
  - WC → VOID swaps through a high-level flow.
  - WC-based NFT purchases.
  - Possibly “first N txs” per address / day.
- Each operation has a **hard gas limit**.
- The relayer **refuses** operations where:
  - Estimated WC fee would be absurd (too high relative to the action),
  - LLP depth is too low,
  - Price/slippage queries fail.

This prevents the relayer seed (200k VOID) from being drained by bad conditions or abuse.

---

## 5. Self-Sustaining Economics

The target behavior is:

> Once we seed **10M VOID** (9.8M LLP + 0.2M relayers), the system is self-sustaining at both protocol and market level, without ongoing Treasury drip.

How this holds:

1. **Relayer invariant**

   For every gasless operation:
   - WC fee is set so that **expected VOID inflow ≥ gas_cost_void**.
   - If not, the operation is rejected.

   Therefore, relayer VOID balances do not trend downward, assuming reasonable gas estimation and safety margins.

2. **LLP invariant**

   - VOID leaves the LLP only in exchange for WC.
   - Fees stay in the pool, growing reserves.
   - Users swapping VOID → WC (e.g. to buy NFTs) **add VOID** to the LLP, increasing depth.
   - Over time, as WC grows without bound, the price of VOID in WC increases. This is desired.

3. **No automatic Treasury subsidies**

   - There are **no** on-chain functions that silently siphon VOID from Treasury into the LLP or relayers on a schedule.
   - Any future top-ups must be **explicit**, admin-gated, and intentional.
   - The expectation is that we **never** need them in normal operation.

4. **Effective VOID burn**

   - A large portion of VOID is permanently locked as protocol liquidity inside `UptimeVaultLLP` and is not expected to be withdrawn.
   - Users converting VOID → WC to buy NFTs and WC-sink items trade a hard asset for soft credits and illiquid collectibles.
   - Combined with lost keys and long-term holding, this reduces **effective circulating VOID supply** over time, even without a literal `burn()` to `0xdead`.

---

## 6. Future: NFTs & WC Sinks

Future plans (not implemented yet, but this doc reserves the design):

- **NFT Avatar / Background Marketplace**
  - Purchasable in **WC only**.
  - WC used for purchases is **burned** or sent to a permanent sink.
  - VOID only enters indirectly when users swap VOID → WC to fund these purchases.
  - Avatars and backgrounds are used in:
    - NullFeed (chat UI),
    - Obelisk Wallet,
    - Other VOID ecosystem UIs.

- **Additional WC sinks**
  - Boosts / priority in JobQueue.
  - Cosmetic badges / channel themes in NullFeed.
  - Future AI / data perks.

All of these increase **WC demand** and **WC consumption**, strengthening the WC/VOID market and making the LLP more active and valuable.

---

## 7. Monitoring & Safety

We will monitor:

- `void_work_credits_total` and derived metrics:
  - `void:work_credits:total_by_agent`
  - `void:work_credits:total_by_pillar`
  - `void:work_credits:health_v3:last_5m`

- LLP / relayer health (to be added):
  - LLP VOID/WC reserves and price.
  - Relayer VOID balances over time.
  - Total WC collected vs VOID spent for gas (relayer P&L).

Alerting rules will:

- Flag if:
  - Relayer balances trend down over N hours/days,
  - LLP depth becomes dangerously low,
  - Gasless UX is operating outside safe WC fee ranges.

In response, the system can:

- Tighten or disable gasless UX,
- Increase WC fee multipliers,
- Or (in extreme cases) require users to pay gas in VOID directly.

---

## 8. Summary

- **VOID** stays the hard, scarce, gas + governance token.
- **WC** is the infinite, soft work currency, earned through useful activity.
- **UptimeVaultLLP** holds ~9.8M VOID as deep, protocol-owned WC/VOID liquidity.
- **Relayers** hold ~0.2M VOID working capital and charge enough WC per gasless action to stay solvent or profitable.
- **No ongoing Treasury drip** is required; the system is designed to be self-sustaining.
- Over time, usage, swaps, and WC sinks (NFTs, boosts, etc.) naturally increase the WC price of VOID and effectively reduce liquid VOID supply.

This is the canonical Work Credits + WC/VOID LLP model for VOID mainnet.

## Mainnet bootstrap integration (PLAN)

This section summarizes how Work Credits tie into the VOID mainnet bootstrap.

### 1. Canonical 10M VOID seed

Total seed VOID for WC plumbing (PLAN phase):

- **10,000,000 VOID** (10M)

Split used by the PLAN scripts:

- **9,800,000 VOID** → UptimeVault LLP (LLP) pool  
- **200,000 VOID**   → relayers (total)

These numbers are enforced in:

- `ops/void-work-credits-mainnet-plan-sim.sh` (PLAN-only forge script)
- `ops/void-work-credits-mainnet-plan-all.sh` (PLAN + health wrapper)

The PLAN scripts **do not** move real funds; they only assert that the 10M split
matches this document.

### 2. WC roles in LIVE JSON

WC / LLP / relayer-related roles live in  
`config/void-mainnet-bootstrap-mainnet.live.json` under:

- `roles.wcGovernance`
- `roles.wcMinterAdmin`
- `roles.lpTreasury`
- `roles.relayerAdmin`
- `relayers[]` (array of relayer descriptors)

As of the PLAN phase, these addresses are intentionally:

- `0x0000000000000000000000000000000000000000` (all zero)
- Not present in the roles-mapping file for mainnet yet

They are checked by:

- `ops/void-work-credits-mainnet-plan-json.sh`
- `ops/void-work-credits-mainnet-roles-plan.sh`
- `ops/void-work-credits-mainnet-plan-all.sh`

And are **only** supposed to be filled in after the real mainnet key ceremony
(keys on LUKS / hardware, never dev keys).

### 3. Roles mapping on /mnt/voidkey

The authoritative mapping of mainnet roles to addresses lives at:

- `/mnt/voidkey/meta/mainnet-roles-mapping.txt`

For WC-related roles:

- `wcGovernance`
- `wcMinterAdmin`
- `lpTreasury`
- `relayerAdmin`

PLAN phase expectations:

- These roles may be missing from the mapping (scripts will report MISSING).
- They should only be added when:
  - Real mainnet keys have been generated on the LUKS `voidkey` or hardware,
  - We are ready to commit to real WC governance and relayer identities.

### 4. Prometheus / pillars integration

Work Credits + relayers are folded into the composite mainnet-planning pillar:

- `void:mainnet_pillars_with_keys_ai_wc_relayers:health:last_5m`

This composite is expected to be `1` only when:

- Mainnet core + last-mile pillars are green
- Safeboot/devnet pillars are green (per existing design)
- Keys pillar is green (roles mapping vs LIVE JSON)
- AI / agent receipts pillar is green
- WC + relayers planning health is green

`ops/void-work-credits-mainnet-health-all.sh` and  
`ops/void-work-credits-mainnet-plan-all.sh` are the primary CLI entrypoints for
checking WC + relayers status.

### 5. Pre-flight before touching real funds

Before any real VOID is moved for WC / LLP / relayers:

1. **Keep all WC roles in LIVE JSON at `0x000...`.**
2. Finalize the WC-related roles in
   `/mnt/voidkey/meta/mainnet-roles-mapping.txt` using real mainnet keys.
3. Re-run the PLAN scripts:
   - `ops/void-work-credits-mainnet-plan-all.sh`
   - `ops/void-mainnet-planning-health-all.sh`
4. Confirm that:
   - `void:mainnet_pillars_with_keys_ai_wc_relayers:health:last_5m == 1`
   - Other mainnet pillars remain green for at least 5 minutes.

Only after this pre-flight is satisfied do we:

- Implement and deploy the real WC contracts (token + UptimeVault LLP + relayer plumbing)
- Wire their addresses into the LIVE JSON under `.contracts.*` and `.roles.*`
- Update the PLAN sims and health exporters to treat them as live, not stub

