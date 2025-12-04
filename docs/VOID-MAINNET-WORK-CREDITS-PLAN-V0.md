# VOID Mainnet — Work Credits Plan (v0)

Status: **PLAN ONLY (no mainnet wiring yet)**  
Scope: Describe how Work Credits (WC) fit into VOID mainnet, without changing any contracts or bootstrap scripts yet.

---

## 1. Goals

- Give users a **second unit** (WC) earned for meaningful work on the network.
- Keep VOID as the **scarce base asset** (gas, staking, governance).
- Make it easy for users to:
  - See WC and VOID balances from Obelisk / web UI.
  - Earn WC via on-chain logic (RewardEngine + jobs/validators).
  - Swap WC ↔ VOID safely via a controlled path.
- Keep all of this **governance-controlled** and upgradeable (AdminGate/UpdateGate).

---

## 2. Components

These already exist (or will exist) on-chain:

- **WorkCreditsToken**  
  - ERC20-style token: `name="VOID Work Credits"`, `symbol="WC"`.
  - `governance` address can set a single `minter`.
  - No public mint; all issuance goes through the minter.

- **WorkCreditsMinter**  
  - Holds the **exclusive mint permission** on `WorkCreditsToken`.
  - Has:
    - `admin` (governance-controlled).
    - `rewardEngine` (authorized to call `award`).
  - Only `rewardEngine` can award WC to users.

- **RewardEngine** (already in mainnet design)  
  - Decides when a node / agent / account has earned rewards.
  - For VOID, it sends token emissions.
  - For WC, it calls into `WorkCreditsMinter.award(...)` instead of minting directly.

- **WorkCreditsRelayerHelper**  
  - Helper that can:
    - Swap WC → VOID via a relayer or AMM (v0: off-chain quote, on-chain swap).
    - Charge a **relayer fee** in WC, controllable by admin.
  - Acts as the **single sanctioned path** for WC → VOID conversion in early phases.

- **AdminGate / ConfigGate / UpdateGate**  
  - Control who can:
    - Change the WC minter admin.
    - Change the RewardEngine that’s allowed to award WC.
    - Update relayer / fee settings.

---

## 3. High-level flows

### 3.1. Earning WC

1. A validator, node, or agent does work the protocol considers valuable.
2. `RewardEngine` computes rewards for that account.
3. For the WC portion:
   - `RewardEngine` calls `WorkCreditsMinter.award(account, amount)`.
   - `WorkCreditsMinter` mints WC to the user via `WorkCreditsToken`.
4. User sees an increased WC balance in their wallet / UI.

No one except the configured `rewardEngine` can mint WC. No backdoor mints.

---

### 3.2. Using WC

**Early phases (v0 / v1):**

- **Pay relayers / agents:**  
  Users can pay WC to third parties for gas, routing, or off-chain services.
- **Swap WC → VOID:**  
  - User calls into `WorkCreditsRelayerHelper.swapWcForVoid(...)`.
  - Helper coordinates the trade (direct or via off-chain relayer).
  - User ends up with more VOID and less WC.
- **Hold WC:**  
  WC can be held as a “points / credits” balance that is separate from VOID.

**Later phases:**

- **AI / Job marketplace payments.**
- **Avatar / NFT marketplace using WC.**
- **Channel boosts / NullFeed perks.**

---

## 4. UI surface (Obelisk / Dashboard / NullFeed)

These are the **features we want long-term**, not what is implemented today:

### 4.1. Wallet view

- Show for connected account:
  - VOID balance.
  - WC balance.
- Simple labels:
  - “VOID stones” (VOID).
  - “Work Credits (WC)” for earned credits.

### 4.2. WC earnings history

- Basic panel:
  - List of recent WC awards (timestamp, amount, reason).
  - Source: off-chain indexer or direct on-chain logs.
- Later: link to specific jobs / blocks / validators.

### 4.3. WC usage panel

- **Send WC:** transfer WC to another address.
- **Swap WC → VOID:** call the relayer helper from UI.
- Show estimated VOID output and fee before confirming.

### 4.4. Validator / node view

- For validator operators:
  - Track cumulative VOID rewards (existing plan).
  - Track cumulative WC rewards.
  - Show “effective earnings” with both assets.

### 4.5. NullFeed integration (later)

- Per-user WC balance visible in chat UI.
- Future ideas (NOT for mainnet v1):
  - Channel boosts paid in WC.
  - Tip other users in WC.
  - Pay bots / tools in WC.

---

## 5. Mainnet bootstrap wiring (planned, not done yet)

**This doc does NOT change any bootstrap scripts.**  
It describes the target wiring we will implement later:

1. **Deploy WorkCreditsToken** with:
   - `governance` set to a controlled admin (likely wired via AdminGate/ConfigGate).
   - No public mint.

2. **Deploy WorkCreditsMinter**:
   - `admin` initially set to a governance-controlled role.
   - `rewardEngine` set to the main `RewardEngine` contract.
   - Give `WorkCreditsMinter` the `minter` role on `WorkCreditsToken`.

3. **Deploy WorkCreditsRelayerHelper**:
   - `admin` controlled via AdminGate/ConfigGate.
   - Configure initial relayer + fee params.

4. **Wire into RewardEngine**:
   - RewardEngine holds a reference to `WorkCreditsMinter`.
   - Emissions / reward logic mints WC through the minter rather than directly.

5. **Expose in config JSON**:
   - Add WC addresses under `.workCredits` or `.contracts.workCredits*` in the mainnet config.
   - Add roles for:
     - `workCreditsAdmin`
     - `workCreditsRelayerAdmin` (if separate).

6. **Update health + PLAN exporters**:
   - PLAN exporter checks that:
     - WC contracts are deployed and nonzero.
     - Roles match the LIVE JSON.
   - Health exporters add:
     - `void_mainnet_work_credits_health` (already used in UI pillars) as the summary gauge.

---

## 6. Phase policy

- **Phase 0 (pre-mainnet):**  
  - Devnet-only deployments.  
  - No real value; WC used for testing flows and UIs.

- **Phase 1 (early mainnet):**  
  - WC enabled but with tight governance:
    - Low reward rates.
    - Limited swap paths.
  - Focus: validators + early contributors.

- **Phase 2+:**  
  - Open up usage (job marketplace, avatars, NullFeed perks).  
  - Potentially more decentralized relayer / AMM ecosystem.

---

## 7. Non-goals for v0

- No complex on-chain WC governance DAO.  
- No trustless cross-chain WC bridge.  
- No mandatory WC usage for core protocol operations.

v0 is about **clean plumbing and safe issuance**, not about maximizing hype.

