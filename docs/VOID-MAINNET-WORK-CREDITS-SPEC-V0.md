# VOID Mainnet — Work Credits (WC) v0 Spec

Status: **v0 planning draft** (contracts + flows are implemented and tested in dev; this document describes how they fit into VOID mainnet, not the exact deploy script yet).

This spec is for the **core on-chain Work Credits system** that backs:
- Validator incentives and future “node work” rewards
- WC → VOID conversion (via relayer/helper and, later, AMM pools)
- Future UI: wallet balances, WC claims, swaps, dashboards

It is *not* a UI wireframe; it’s the canonical description of contracts, roles, and flows that the UI and bootstrap scripts must follow.

---

## 1. Contracts (on-chain components)

### 1.1 WorkCreditsToken

**Type:** ERC20-like token for “Work Credits”.

Core properties:

- Minting:
  - Only the configured **minter** can mint WC.
  - Governance address (WC governance) can update the `minter` address.
- Burning:
  - Minter can `burnFrom` accounts when consuming WC as part of a swap or fee.
- Transfers:
  - Standard `transfer` / `transferFrom` for normal movement between accounts.

**Design intent:**
- WC is *non-premine*, fully governed by emissions/rewards policies.
- No arbitrary admin minting; all mints originate from RewardEngine via a controlled minter.

---

### 1.2 WorkCreditsMinter

**Role:** Controlled minter for WorkCreditsToken.

Key behavior:

- Holds a reference to:
  - `WorkCreditsToken` (target token to mint/burn).
  - `RewardEngine` (only this address is allowed to award WC).
- Admin role:
  - An `admin` address can:
    - Set the current `rewardEngine` address.
    - Set a new `admin` (cannot be zero).
- Award flow:
  - `award(to, amountWC)`:
    - Callable **only** by `rewardEngine`.
    - Mints `amountWC` WC to `to`.
    - Reverts if `to == address(0)` or `amountWC == 0`.

**Guarantee:**
- Every WC token in circulation can be traced back to an explicit reward event from RewardEngine.

---

### 1.3 WorkCreditsRelayerHelper

**Role:** Helper contract for swapping WC → VOID, with optional relayer fee.

This is ***not*** the final AMM; it’s the first on-chain primitive to:
- Transform WC into VOID under strict rules.
- Allow a relayer to charge a fee for performing swaps on behalf of users.

Key parameters:

- `admin`:
  - Can set:
    - `relayer` address (allowed to do fee-charging swaps).
    - `feeBps` (basis points of fee when relayer path is used).
- `wcToken` and `voidToken`:
  - References to WorkCreditsToken and VoidToken.
- Flow:
  - Direct swap path (user → helper → VOID) — no fee or fixed rule-based fee.
  - Relayer path (relayer acts on user’s behalf, paying gas and collecting fee in VOID or WC as/contracts define).
- Tests currently assert:
  - Only admin can update config.
  - Non-admin cannot.
  - Relayer path charges a fee as expected.
  - Direct path behaves as a clean WC → VOID conversion.

**Design note:**
- In mainnet v0, this may be used as a controlled conversion path from WC to VOID.
- Later, it can coexist with or be superseded by:
  - A WC↔VOID AMM pool.
  - Router contracts that prefer best pricing while still allowing fee’d relayers.

---

### 1.4 RewardEngine (existing mainnet core)

RewardEngine is already part of mainnet core and is responsible for:
- Distributing emissions over time.
- Paying validators / workers in VOID.
- In the Work Credits world, it also becomes the **source of truth for WC awards** by calling into WorkCreditsMinter.

Interfaces:

- Uses `IVoidTokenLike` and `IValidatorSetLike` for on-chain token/validator interactions.
- In WC context:
  - RewardEngine will be wired to `WorkCreditsMinter` as its `rewardEngine`.

**Important principle:**
- Emissions budget is still enforced in VOID terms.
- WC awards must fit inside a coherent economics model:
  - Either:
    - Validators get VOID from RewardEngine and UI treats a portion as “Work Credits” off-chain, or
    - RewardEngine explicitly mints WC via WorkCreditsMinter under a secondary budget.

This spec assumes the second pattern: RewardEngine → WorkCreditsMinter → WC.

---

## 2. Roles & keys (high level)

These map onto your existing mainnet keys plan (Treasury, Ops, AdminGate, etc.).

### 2.1 WC token governance

- Address: **WC governance** (to be chosen in mainnet keys plan, likely AdminGate-controlled).
- Permissions:
  - Set `minter` on WorkCreditsToken.
- Security assumption:
  - This should be a controlled, multi-sig / AdminGate-managed role — *not* a hot EOA.

### 2.2 WorkCreditsMinter admin

- Address: **WC minter admin**.
- Permissions:
  - Set `rewardEngine` address.
  - Set a new `admin` (non-zero).
- Expected wiring:
  - Initially owned by a deployment key which hands ownership over to a governance-controlled role (AdminGate / ConfigGate pattern).
  - Post-bootstrap, updates to RewardEngine address (if any) should go through the same governance flow as other mainnet upgrades.

### 2.3 Relayer helper admin + relayer

- **Relayer admin:**
  - Sets `relayer` and `feeBps`.
  - Should be a governance/ops-controlled key, **never** a random hot wallet.
- **Relayer:**
  - Operational address that performs WC→VOID conversions for users and collects fees.
  - Expected to be a hot wallet, but limited in ability:
    - Has no governance powers.
    - Only participates in swaps according to contract rules.
  - Can be rotated without touching core governance.

---

## 3. Flows (how this behaves on mainnet)

### 3.1 Validator / worker earning Work Credits

1. **On-chain status:**
   - ValidatorSet tracks active validators and their stake.
   - RewardEngine controls emissions.

2. **Reward event (conceptual):**
   - A validator or worker meets some criteria (blocks produced, jobs completed, etc.).
   - RewardEngine calculates an award in WC units.
   - RewardEngine calls `WorkCreditsMinter.award(beneficiary, amountWC)`.

3. **Result:**
   - WorkCreditsToken mints `amountWC` to `beneficiary`.
   - Beneficiary sees their WC balance increase.

**Later extensions:**
- A portion of rewards could be VOID and another portion WC.
- Separate pillars can be defined for “validator work” vs “AI/NullFeed contributions” while still using the same WC token.

---

### 3.2 User converting WC → VOID

In v0, there are two conceptual paths:

#### A) Direct path (user-driven)

- User holds WC in their wallet.
- User calls into `WorkCreditsRelayerHelper` directly to swap WC for VOID.
- Helper:
  - Burns WC from the user.
  - Transfers VOID from a configured pool/treasury/liquidity source.
- Fees:
  - Could be zero or protocol-defined.
- UI:
  - Obelisk Wallet presents a “Convert WC to VOID” flow.
  - Shows:
    - WC input amount.
    - Expected VOID output.
    - Any fee or spread.

#### B) Relayer path (relayer-driven)

- User signs an approval for the relayer to operate.
- Relayer:
  - Bundles user’s WC into a swap via `WorkCreditsRelayerHelper`.
  - Pays gas.
  - Collects fee according to helper’s `feeBps`.
- Benefits:
  - Users can participate without manually signing every on-chain action (future “lazy users” or phone clients).
  - Relayer can be an AI/automation agent that batches many small WC→VOID conversions.

**Mainnet guardrails:**
- Maximum feeBps caps in code or via governance policy.
- Clear view in UI showing who the relayer is and what fee is taken.

---

### 3.3 Future: WC ↔ VOID AMM

The **long-term** plan is to have:

- A WC↔VOID pool (AMM) that sets “market price” for WC.
- `WorkCreditsRelayerHelper` either:
  - Uses the pool as the execution venue, or
  - Coexists as a separate, more policy-driven conversion path.

Not v0; this spec just acknowledges the direction.

---

## 4. How this ties into bootstrap & pillars

### 4.1 Bootstrap narrative (high-level integration)

Your existing mainnet bootstrap PLAN already covers:

- Deploying VoidToken, VoidTreasury, OpsTreasury.
- Deploying AdminGate / ConfigGate / UpdateGate.
- Deploying ValidatorSet, RewardEngine, Emissions controller.
- Registering validator0 and wiring ownership.

Work Credits v0 slots in as follows (conceptually):

1. **Deploy WorkCreditsToken**
   - Set initial governance address (WC governance).
   - No premine.

2. **Deploy WorkCreditsMinter**
   - Point it at WorkCreditsToken.
   - Set `rewardEngine` once RewardEngine is deployed.
   - Hand minter admin to governance (AdminGate/ConfigGate path).

3. **Deploy WorkCreditsRelayerHelper**
   - Point it at WorkCreditsToken and VoidToken.
   - Set `admin` = a governance-controlled key.
   - Optionally set an initial `relayer` and `feeBps` or leave them unset until policies are decided.

4. **Wire RewardEngine**
   - RewardEngine’s config includes:
     - The address of WorkCreditsMinter as its WC output.
   - Bootstrap script ensures:
     - Only RewardEngine can call `award` on WorkCreditsMinter.

5. **Record addresses in mainnet config**
   - Extend your `void-mainnet-bootstrap-mainnet.live.json` to include:
     - `contracts.workCreditsToken`
     - `contracts.workCreditsMinter`
     - `contracts.workCreditsRelayerHelper`
   - PLAN and RUN scripts log these alongside the core contracts.

### 4.2 Pillars & metrics

Already wired:

- Tests:
  - `test/WorkCreditsToken.t.sol`
  - `test/mainnet/WorkCreditsMinter.t.sol`
  - `test/mainnet/WorkCreditsRelayerHelper.t.sol`
- Health scripts:
  - `ops/void-mainnet-work-credits-health.sh`
  - `ops/void-mainnet-work-credits-ci-smoke.sh`
- UI metrics:
  - `void_mainnet_ui_work_credits_health`
  - Included in:
    - `void_mainnet_ui_pillars_health`
    - `void:mainnet_ui_pillars:health:last_5m`
    - `void:mainnet_pillars_with_ui:health:last_5m`

This spec is the **semantic counterpart** to those metrics: it explains what “Work Credits pillar healthy” actually means.

---

## 5. What the future UI will surface (summary)

When you eventually build the full Obelisk / VOID UI on top of this:

- Wallet:
  - Show VOID & WC balances.
  - Show recent WC awards (who/why, if exposed).
- WC actions:
  - “Convert WC to VOID” (direct or via relayer).
  - Display the fee and effective rate.
- Validator dashboard:
  - Show WC earned vs VOID rewards.
  - Potentially route some validator work rewards into WC first.
- NullFeed / AI / node work:
  - Track that certain contributions fed into RewardEngine → WorkCreditsMinter → WC awards.
  - Expose that lineage in UI over time.

This document is the contract-level truth the UI must respect.

