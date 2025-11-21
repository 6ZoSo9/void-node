# VOID Network – Mainnet Allocation & Emissions Spec (v0.2 – LOCKED DRAFT)

Chain: VOID mainnet (chainId 2050)  
Token: VOID (a.k.a. VoidStones)  
Max supply (hard cap): **666,666,666 VOID**

We split supply into:

- **Premine at genesis (50%)**: 333,333,333 VOID  
- **Long-term emissions over 100 years (50%)**: 333,333,333 VOID  

All numbers below are **protocol-level targets**. Final contracts will encode exact integers and enforce `totalSupply <= 666,666,666` forever.

---

## 1. Genesis Premine (333,333,333 VOID)

At genesis, 333,333,333 VOID are minted into an allocator contract / vault and then streamed or vested into the buckets below.

### 1.1 Premine buckets

| Bucket                                           | Amount (VOID)   | % of Premine | Notes |
|--------------------------------------------------|-----------------|--------------|-------|
| **Founder Trust – VOID Labs LLC**               | **230,000,000** | 69.0%        | Held in a trust in ZoSo’s name for VOID Labs LLC. Used to acquire property, build backbone infra, buy servers in multiple countries, pay core staff, and fund long-horizon R&D. Not a degen cash-out bag. |
| **Ecosystem & Infra Reserve**                   | 70,000,000      | 21.0%        | Treasury-style pool for protocol operations, validator subsidies, core client work, monitoring, emergency repair work, and long-term infra upgrades (data centers, regional hubs, backbone networking). |
| **Community, Liquidity & Strategic Partners**   | 33,333,333      | 10.0%        | Airdrops, hackathons, grants, early integrations, cautious CEX listings, MM, and strategic partnerships that actually move the needle. |

Total premine = **333,333,333 VOID** (50% of cap)

### 1.2 Founder Trust constraints (high level)

Intent:

- The **230,000,000 VOID** founder allocation is **explicitly tied to building the network**, not extracting rent.
- It funds:
  - Property in multiple regions to host servers and offices.
  - Salaries/comp for family + trusted staff who physically watch hardware and workers.
  - Travel and logistics required to maintain infra in different states/countries.
  - Strategic deals that strengthen VOID’s backbone (not random hype partnerships).

Ethical/lockup sketch (to be hardened in contracts later):

- **50% of founder trust (115,000,000 VOID)**:
  - Hard-locked for **10 years** via time-lock / vesting contract.
  - Accessible only for strictly defined infra / R&D / protocol-level spend.
- **Remaining 50% (115,000,000 VOID)**:
  - Vested linearly over **4–6 years** with clear policy:
    - Reasonable personal runway (you’re a human, not a robot).
    - Majority reinvested into infra, hiring, security, and ecosystem.

Exact lockup mechanics will live in a separate **Founder Trust Spec**.

---

## 2. Emissions – 100-Year Schedule (333,333,333 VOID)

The other half of supply (**333,333,333 VOID**) is emitted over **~100 years** in **4 eras of 25 years** each, Bitcoin-style, with emissions roughly halving each era.

Eras target the following **cool totals**:

- **Era 1**: 177,777,777 VOID  
- **Era 2**: 88,888,888 VOID  
- **Era 3**: 44,444,444 VOID  
- **Era 4**: 22,222,222 VOID  

> Note: these numbers are intentionally “aesthetic”. The on-chain emission contract will enforce the exact 333,333,333 emission budget and will make tiny integer adjustments if needed so that `Σ era_minted == 333,333,333`.

### 2.1 Era breakdown (25 years each)

Assume Year 0 = mainnet launch / first emission block.

| Era | Years (relative) | Era Total (VOID) | Approx / year | % of full cap | Description |
|-----|------------------|------------------|---------------|---------------|-------------|
| **1** | 0–25             | **177,777,777**  | ~7.11M / year | ~26.67%       | High-emission bootstrapping phase. Strong validator rewards + aggressive funding of on-chain automation and JobQueue workloads to harden the network. |
| **2** | 25–50            | **88,888,888**   | ~3.56M / year | ~13.33%       | First halving. Network should be fee-bearing; emissions still meaningful but not dominant. |
| **3** | 50–75            | **44,444,444**   | ~1.78M / year | ~6.67%        | Second halving. Emissions mostly top-up security and keep long-horizon jobs funded. Fees should be the main driver by now. |
| **4** | 75–100           | **22,222,222**   | ~0.89M / year | ~3.33%        | Final trickle. Primarily incentive smoothing and tail security. System expected to live off fees + matured ecosystem. |

Total emissions target = **333,333,333 VOID** (50% of cap)

---

## 3. Where emissions actually go

Emissions are not just “spray tokens at validators”. We wire them into **protocol-level automation** so the network **uses** its own token to keep itself alive:

1. **Validator & Staker rewards**
   - Base share of each era goes to validator/staker sets for block production and finality.
   - Distribution is stake-weighted with slashing for misbehavior.

2. **Protocol Ops & Automation (JobQueue)**
   - A fixed portion of each era’s emissions flows into **on-chain JobQueue budgets**:
     - Header/txroot sanity jobs.
     - Update manifest checks.
     - Coverage/receipts health, dataset/model checks.
     - Observability and metrics integrity jobs.
   - Off-chain VOID agents claim these jobs and must write back receipts; we already have this pipeline on devnet.

3. **Ecosystem tasks**
   - Some emissions can be redirected (via governance) to:
     - Indexers, relayers, sequencer-like roles.
     - Storage/verifier nodes for off-chain data.
     - Reference client implementers and security auditors.

Exact splits per era (e.g., % to validators vs % to JobQueue vs % to ecosystem tasks) will be encoded in a **VOID Emissions Policy** doc + contract once we freeze more of mainnet’s final architecture.

---

## 4. Long-term sustainability once the cap is reached

When `totalSupply` asymptotically approaches **666,666,666 VOID** and emissions effectively stop:

1. **Validators live on fees**
   - Block proposers/validators earn:
     - Base gas fees.
     - Priority tips.
     - MEV capture where allowed by policy (TBD).
   - Emissions become negligible, but fiscal gravity of on-chain activity replaces them.

2. **JobQueue & automation funded by fees / treasuries**
   - A portion of transaction fees can be:
     - Routed to protocol-owned JobQueue budgets.
     - Topped up via ecosystem treasuries seeded from premine and earlier eras.
   - The network “hires itself” via on-chain jobs that pay in VOID, not in infinite new inflation.

3. **Treasury & founder trust as backstops, not crutches**
   - Founder trust and ecosystem reserves **frontload** infra, property, staff, and core engineering in the early decades.
   - Over time, those bags should shift from “fund operations” to “strategic capital” while the **day-to-day security budget** comes from fees and mature on-chain economics.

---

## 5. Summary (what is locked now)

- **Max supply:** 666,666,666 VOID (hard cap).  
- **Premine (genesis):** 333,333,333 VOID.
  - 230,000,000 VOID → Founder Trust (VOID Labs LLC, infra-focused, with heavy lockups).
  - 70,000,000 VOID → Ecosystem & Infra Reserve.
  - 33,333,333 VOID → Community, liquidity, and strategic partners.
- **Emissions over 100 years:** 333,333,333 VOID in 4 × 25-year eras:
  - Era 1: 177,777,777  
  - Era 2: 88,888,888  
  - Era 3: 44,444,444  
  - Era 4: 22,222,222  
- Bitcoin-style halving over human-scale decades, **not** a degen rush.
- Emissions are explicitly tied to:
  - Validator security.
  - Automated JobQueue workloads.
  - Long-term protocol operations.
- After emissions fade out, **fees + mature treasuries** keep the chain alive indefinitely.

This document is the **canonical token allocation & emissions spec for VOID mainnet** unless superseded by a later versioned spec.
