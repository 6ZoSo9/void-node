# VOID Network — Work Credits (WC) v0 (Simple, Pending + Relayer)

Status: PLAN ONLY (no contracts wired yet)  
Goal: Simple, user-friendly “work points” that:
- Are **earned automatically** when you flip a switch.
- Represent **real work for the network**.
- Accumulate as **pending** off-chain WC, and are only minted when the user chooses.
- Use the **relayer + LLP** for gas-efficient claims and swaps.
- Never drain relayers: relayers are explicitly reimbursed when they front gas.

---

## 1. What are Work Credits (WC)?

- WC are **work points** earned by helping the VOID Network.
- VOID stays the main asset:
  - Gas, staking, premine, validator rewards, tokenomics = VOID.
- WC is a softer “XP / loyalty” layer:
  - Reward validators and workers for uptime/useful work.
  - Unlock small perks later (NullFeed, Obelisk cosmetics, etc.).

For a normal user/validator:

> Run node → flip on “Earn Work Credits” →  
> pending WC creeps up → decide how to claim:  
> - pay gas yourself in VOID, or  
> - use a relayer who fronts gas and takes a small fee.

---

## 2. Roles and incentives

### Validators

- Main incentive: **VOID rewards** from RewardEngine.
- WC is **secondary**: extra points on top of VOID.
- If “Earn WC” is ON, validators also accrue WC pending balance.

### Other workers (full nodes, safeboot, agents later)

- Main incentive: **WC**.
- They still do real work:
  - Serving blocks and headers.
  - Acting as safeboot/backup.
  - Running AI jobs/agents later.

Emission math for v0 stays simple; policymakers tune a few constants later.

---

## 3. “Earn WC” switch (automatic accrual)

In Obelisk / node UI:

- Checkbox / toggle: **[ ] Earn Work Credits**

When **OFF**:

- Node does not participate in WC earning.
- Relayer ignores the node for WC purposes.

When **ON**:

1. Node registers with the **relayer** as an active WC worker:
   - Node ID / endpoint.
   - Wallet address (beneficiary).
   - Role (`validator`, `full_node`, `safeboot`, `agent`, ...).

2. Relayer + metrics pipeline:
   - Watch uptime/health via Prometheus.
   - Only credit WC if node is healthy and actually serving.

3. For v0, each healthy worker just earns at a **fixed simple rate**, e.g.:

> For each hour your worker is healthy with “Earn WC” on,  
> you earn X WC into your **pending** bucket.

Validators still get VOID on-chain; WC pending is just extra.

---

## 4. Pending WC vs on-chain WC

We always distinguish between:

- **Pending WC** — tracked off-chain by relayer:
  - `pending_wc[address]` in relayer DB.
  - Increased as the relayer sees you doing work.
  - No gas, no on-chain txs.

- **On-chain WC** — actual `WorkCredits` ERC20 on VOID mainnet:
  - `balanceOf(address)` on-chain.
  - Only changes when there’s a real claim/transfer tx.

### Relayer API (conceptual)

- `GET /wc/pending/:address`
  - Returns JSON:
    - `pending_wc` amount.
    - `last_update` timestamp.
- `POST /wc/claim-self`
- `POST /wc/claim-relayer`
- `POST /wc/claim-and-swap-relayer`

Obelisk and NullFeed use this to show live pending WC without hitting L1 for every refresh.

---

## 5. Two claim modes (user chooses)

Users must be able to:

- Use their **own VOID** to pay gas (self-claim).
- Or use the **relayer** (meta-tx), where the relayer pays gas and gets reimbursed.

We keep both paths simple.

### 5.1 Mode A — Self-claim (user pays gas in VOID)

Flow:

1. User clicks **“Claim WC (self)”** in Obelisk.

2. Obelisk queries relayer for `claimable = pending_wc[address]`.

3. Obelisk has the user sign and send a normal L1 tx from their wallet to `WorkCreditsController`:
   - e.g. `claimSelf(uint256 amount, bytes relayerProofOrSig)`.

4. Tx is paid with the user’s own VOID (normal gas model).

5. On success:
   - Controller mints `amount` WC directly to the user.
   - Relayer DB sets `pending_wc[address] -= amount`.

Characteristics:

- **No relayer fee** on-chain in this mode.
- User pays the gas directly; advanced/power users can choose this path.

### 5.2 Mode B — Relayer-claim (relayer fronts gas, gets reimbursed)

Flow:

1. User clicks **“Claim WC (via relayer)”**.

2. Obelisk queries relayer: `claimable = pending_wc[address]`.

3. User signs a **meta-tx style message**, authorizing a claim:
   - “I allow relayer R to claim N WC on my behalf.”

4. Relayer sends an L1 tx to `WorkCreditsController.claimWithRelayer(...)`:
   - Contract verifies:
     - User signature.
     - Amount within policy bounds.

5. `WorkCreditsController` computes a **relayer fee**:

   - `fee = amount * RELAYER_FEE_BPS / 10_000`.

6. Mint split:

   - User receives: `amount_user = amount - fee` WC.
   - Relayer receives: `amount_relayer = fee` WC.

7. Relayer DB sets `pending_wc[address] -= amount`.

Characteristics:

- Relayer always gets reimbursed **on-chain** in WC for gas + risk.
- Fee parameters:
  - `RELAYER_FEE_BPS` governed (e.g. 0–200 = 0–2%).
  - Can be 0 if we want “free” relayers for a period, but design supports non-zero.

This guarantees:

> Relayers are not drained: they either don’t participate, or they get paid  
> every time they front gas for a WC claim.

---

## 6. Claim & Swap (relayer + LLP)

**Claim & Swap** is just Mode B + an LLP trade.

Flow:

1. User clicks **“Claim & Swap to VOID (via relayer)”**.

2. Steps 1–4 same as Mode B.

3. Instead of minting directly to the user, `WorkCreditsController` can:

   - Mint WC to a relayer/LLP helper contract, or
   - Mint split between user and contract, then have the contract pull user’s portion for swap if allowed.

4. LLP executes a WC→VOID swap in the canonical WC/VOID pool.

5. VOID is sent to the user’s address; any LP/trading fees follow LLP’s rules.

6. Relayer is reimbursed for gas **via the WC fee** (`RELAYER_FEE_BPS`) and optionally by:
   - Also being a liquidity provider in the WC/VOID LLP pool (collecting DEX fees).

Users see:

- Pending WC decreasing.
- VOID balance increasing.
- Clear “You got X VOID for Y WC (rate, fee, slippage).”

Relayer sees:

- WC fee minted directly to them.
- Optional LP fee income from LLP.

---

## 7. Minimal on-chain contracts (v0)

We still keep contracts simple:

1. **WorkCredits** (WC token)
   - ERC20-like:
     - `name     = "VOID Work Credits"`
     - `symbol   = "WC"`
     - `decimals = 18`
   - Transferable and standard.

2. **WorkCreditsController**
   - Only contract allowed to mint WC.
   - Controlled via AdminGate/UpdateGate.
   - Minimal v0 interface (conceptual):
     - `claimSelf(uint256 amount, bytes proofOrSig)`  
       - User calls directly; pays gas; no relayer fee.
     - `claimWithRelayer(address user, uint256 amount, address relayer, bytes userSig, bytes relayerProof)`  
       - Relayer calls; pays gas; fee sent to `relayer`.

   - Has a configurable `RELAYER_FEE_BPS` (basis points) in policy:
     - 0 in the early days if we want promos.
     - Non-zero in steady state to cover gas + profit.

Relayer DB + LLP plumbing stays off-chain / separate contracts.

---

## 8. User-facing UI (Obelisk / NullFeed dashboard)

For the user we keep it dead simple:

- Toggle:
  - `[ ] Earn Work Credits` (per node/validator).

- Balances:
  - `Pending WC: 123.45` (from relayer).
  - `On-chain WC: 0.00` (from RPC).

- Buttons:
  - `Claim WC (self, pay gas in VOID)`
  - `Claim WC (via relayer, relayer takes small WC fee)`
  - `Claim & Swap to VOID (via relayer + LLP)`

And a small graph of “WC earned over last 7 days.”

Everything else (policy JSON, exact fee BPS, LLP depths) is hidden behind the scenes.

---

## 9. Future extensions (explicitly NOT v0 blockers)

Later, we can **add** (without changing v0 behavior):

- Per-role rates and detailed policies in JSON.
- Agent/JobQueue earning paths.
- NullFeed channel/avatars as WC sinks.
- More sophisticated relayer economics (e.g. VOID-denominated fees, caps).
- Rich analytics/alerts around WC emissions and burns.

But v0 is locked to one story:

> Flip the switch, keep your node healthy,  
> watch your pending WC rise,  
> and claim either:
> - with your own VOID for gas, or  
> - via a relayer that gets properly reimbursed,  
> and optionally swap straight into VOID using LLP.


---

## 10. Relayer coverage for ALL WC-powered transactions

Design rule:

> For **any** WC-powered action, users can either:
> - Use their own VOID and send a direct on-chain tx, or
> - Use a **relayer** that fronts gas and gets reimbursed.

This applies not just to claims, but to **all sinks and perks**, including:

- NFT/avatar purchases.
- Awards / badges / special roles.
- NullFeed channel upgrades or cosmetic boosts.
- Obelisk / UI themes and perks.
- Any future WC sinks (bots, premium features, etc.).

### 10.1 Two modes for every WC sink

For any WC-using contract (e.g. `WCNFTMarket`, `NullFeedPerks`, etc.) we support:

**Mode A — Self-tx (user pays gas in VOID)**

- User sends a normal tx:
  - E.g. `buyNftWithWC(tokenId, wcAmount)` or `upgradeChannelWithWC(...)`.
- WC is transferred/burned directly from the user.
- Gas is paid with the user’s own VOID.
- No relayer fee.

**Mode B — Relayer-tx (relayer fronts gas)**

- User signs a meta-message authorizing:
  - “Spend N WC on sink S for me; relayer R may execute this.”
- Relayer submits a tx to the sink contract:
  - Contract:
    - Verifies signature.
    - Charges a **relayer fee** (in WC or VOID, depending on policy).
    - Executes the action (NFT mint, award, upgrade, etc.).
- Relayer gets reimbursed on-chain:
  - Either:
    - A small WC fee (`RELAYER_FEE_BPS`-style), and/or
    - A small VOID fee, depending on the sink’s economics.

The **default UX** in Obelisk/NullFeed:

- Show both options when spending WC:
  - “Use my VOID for gas (no relayer fee).”
  - “Use relayer (relayer takes a small fee).”

This guarantees:

- Users **always** have a path that doesn’t depend on a relayer (self-tx).
- Relayers can participate in **all WC flows** and get paid fairly, not drained.

