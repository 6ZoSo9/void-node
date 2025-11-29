# VOID Mainnet Bootstrap PLAN — Roles & Keys Blueprint

This doc is **for the PLAN phase** of VOID mainnet bootstrap.

- It describes what each `.roles.*`, `.contracts.*` and `validator0.*` field in  
  `config/void-mainnet-bootstrap-mainnet.live.json` is *supposed* to represent.
- It also states what kind of key should control each role (cold / warm / hot).
- It is **not** allowed to contain real mnemonics, private keys, or secret material.
- The live JSON itself (`*.live.json`) **must never be committed**.

Current PLAN metrics (by design):

- `void_mainnet_bootstrap_plan_configured = 1`
- `void_mainnet_bootstrap_plan_health     = 0`

That means: JSON is structurally sane, but critical fields are still placeholders.

---

## 1. JSON layout reminder

Live PLAN config: `config/void-mainnet-bootstrap-mainnet.live.json`

### 1.1 Roles

These are under `.roles`:

- `deployer`
- `treasuryAdmin`
- `opsTreasuryAdmin`
- `validatorAdmin`
- `adminGateOwner`
- `updateGateOwner`
- `configGateOwner`
- `treasuryOwner`
- `opsTreasuryOwner`
- `rewardEngineOwner`
- `validatorSetOwner`

Right now in the PLAN:

- `deployer` / `treasuryAdmin` / `opsTreasuryAdmin` / `validatorAdmin` are `0x0000...0000` (ZERO).
- The various `*Owner` fields are fake sentinel addresses (`0x1111...`, `0x2222...`, etc).

That is intentional:  
PLAN is **configured but not ready** (`plan_health = 0`).

### 1.2 Contracts

Under `.contracts`:

- `updateGate`
- `adminGate`
- `configGate`
- `validatorSet`
- `voidToken`
- `premineVault`
- `treasury`
- `voidTreasury`
- `opsTreasury`
- `rewardEngine`

Right now: they are all `0x0000...0000` (ZERO) as placeholders.

### 1.3 Validator0

Under `.validator0` (or equivalent section):

- `reward` — address that receives validator rewards (VOID / fees).
- `consensusKey` — the validator’s consensus pubkey bytes.
- `stakeVOID` — how much VOID is staked by validator0 (string in PLAN: `TODO_SET_STAKE_VOID`).

Right now everything is set to ZERO / TODO.

---

## 2. Key tiers (how dangerous each role is)

**Tier 0 — Genesis / irreversible authority**

- Keys that, if lost or abused, permanently screw the system.
- Must live on **hardware wallets and/or LUKS-encrypted USB**, never on a hot box.
- Examples (conceptual, not 1:1 to JSON fields):
  - The “premine” authority used once at genesis (in practice: premine goes directly to `VoidTreasury`, so the premine EOA should be used once then retired).
  - Master authority that can fundamentally change UpdateGate/AdminGate if we ever allow that.

For PLAN, we **do not** point directly to a Tier-0 EOA.  
Instead, we aim for **contract-based control** (multi-sig, gates) and treat the EOAs as setup-only.

**Tier 1 — High-privilege admins (cold / warm)**

- Keys that can move big money (Treasury/OpsTreasury) or change validator set / config.
- Should be hardware wallet or LUKS-backed, offline most of the time.
- These are the roles that map closest to real people / real governance.

**Tier 2 — Operational hot keys**

- Short-lived, more easily rotated keys that handle:
  - Routine validator ops.
  - Routine OpsTreasury payouts after funds are *pulled* down from cold control.
- Can live on servers, but must be rate-limited, monitored, and cheap to rotate.

---

## 3. How each `.roles.*` should look long-term

This is the **blueprint** for when you actually fill `*.live.json` with real addresses.

**3.1 `roles.deployer`**

- The EOA that calls `VoidMainnetBootstrapMainnet` on real mainnet.
- **Tier:** between 0 and 1, but used once. Treat as Tier 0 during bootstrap.
- **Storage:** hardware wallet or LUKS USB.  
- **Plan:** use it to:
  - Deploy UpdateGate, AdminGate, ConfigGate, ValidatorSet, VoidToken, PremineVault/Treasury/OpsTreasury/RewardEngine.
  - Hand off control to the gates / multi-sigs.
  - Then never use it again.

**3.2 `roles.adminGateOwner`**

- Address that owns AdminGate’s internal admin config (can set who the Admins are).
- **Tier:** 0/1 (very dangerous).
- **Storage:** hardware or LUKS USB only.
- **Long-term plan:** this should probably be a multi-sig or a gated contract address, not a raw EOA.

**3.3 `roles.updateGateOwner`**

- Owner of UpdateGate: can approve core upgrades.
- **Tier:** 0/1.
- **Storage:** hardware / LUKS, very rarely used.
- **Long-term plan:** treat this as **the ultimate code-change guard**.  
  Ideally points to a multi-sig contract with multiple humans/devices in the loop.

**3.4 `roles.configGateOwner`**

- Controls chain-level config knobs (params, limits, allowed modules).
- **Tier:** 1 (still critical, but not as nuclear as updateGate).
- **Storage:** hardware or LUKS; could be more actively used (rare but not “never”).

**3.5 Treasury-related roles**

- `roles.treasuryAdmin`
- `roles.treasuryOwner`
- `roles.opsTreasuryAdmin`
- `roles.opsTreasuryOwner`
- `roles.rewardEngineOwner`

Conceptually:

- `treasuryAdmin` / `treasuryOwner`:
  - Control the **VoidTreasury** contract that holds the premine (333,333,333 VOID).
  - **Tier:** 0/1 — must be cold, contract-based if possible.
- `opsTreasuryAdmin` / `opsTreasuryOwner`:
  - Control **OpsTreasury** which receives controlled drips from VoidTreasury.
  - **Tier:** 1 — still high-privilege; can be slightly “warmer” but not hot.
- `rewardEngineOwner`:
  - Can adjust validator reward parameters, emission flows (within locked tokenomics).
  - **Tier:** 1 — cold/warm, with governance around changes.

**3.6 Validator roles**

- `roles.validatorAdmin`:
  - Admin for ValidatorSet contract (adding/removing validators, etc).
  - **Tier:** 1 — very sensitive; should be multi-sig / hardware-backed.
- `roles.validatorSetOwner`:
  - Owner of the ValidatorSet contract itself.
  - **Tier:** 1 — governance-level, should be cold.

---

## 4. How each `.contracts.*` should look when wired

Right now, all `.contracts.*` are `0x0000...` placeholders.

When PLAN is truly ready (and `plan_health` can be 1):

- `contracts.updateGate`    → real deployed UpdateGate contract address.
- `contracts.adminGate`     → real AdminGate.
- `contracts.configGate`    → real ConfigGate.
- `contracts.validatorSet`  → actual ValidatorSet contract.
- `contracts.voidToken`     → mainnet VOID token contract.
- `contracts.premineVault`  → premine vault contract (if used as a separate staging contract).
- `contracts.treasury`      → any intermediate Treasury contract (if separate from VoidTreasury).
- `contracts.voidTreasury`  → main VoidTreasury contract holding premine.
- `contracts.opsTreasury`   → OpsTreasury contract.
- `contracts.rewardEngine`  → RewardEngine contract.

**Important:**

- These addresses **must not** be guessed or hand-typed into `*.live.json` by memory.
- They must come from:
  - A reproducible deployment pipeline (dry-run on anvil with the same config).
  - Or explicitly logged addresses from the real broadcast script, double-checked.

---

## 5. Validator0 fields (bootstrap validator)

When we’re actually ready to plan real validator0:

- `validator0.reward`
  - The address that receives validator0’s rewards.
  - **Tier:** likely a hot/warm key controlled by you or a small multi-sig.
- `validator0.consensusKey`
  - The consensus/public key bytes for validator0 (ed25519/BLS/whatever the chain uses).
  - Must match the node binary’s key material.
  - This is public, but misconfiguring it bricks validator0.
- `validator0.stakeVOID`
  - Amount of VOID staked by validator0 (string).
  - Must match both:
    - Locked stake in RewardEngine/ValidatorSet.
    - Your expected economic exposure.

---

## 6. When do we flip PLAN from 0 → 1?

Later, when you’re actually preparing to hit real mainnet:

1. Generate real keys on **hardware/LUKS**, following the long-term keys plan:
   - Premine/Treasury/AdminGate/UpdateGate keys.
   - OpsTreasury / validator keys.
2. Fill `config/void-mainnet-bootstrap-mainnet.live.json` with **real addresses**:
   - `.roles.*` mapped according to this doc.
   - `.contracts.*` is still ZERO at this stage (pre-deployment).
3. Run:
   - `./ops/void-mainnet-bootstrap-plan-status.sh`
   - `./ops/void-mainnet-bootstrap-plan-rehearse.sh`
   - `./ops/void-mainnet-bootstrap-plan-all.sh`
   - `./ops/void-mainnet-bootstrap-plan-prom-health.sh`
4. Only when the code & scripts are updated so that:
   - All required roles are non-zero and sane.
   - Plan rehearsal considers `rolesConfigured / contractsConfigured / validatorConfigured` true.
   - `void_mainnet_bootstrap_plan_health` can safely be 1.
5. Then, and only then, we let PLAN gating turn green for “ready to broadcast”.

This doc is the **blueprint**, not the execution.  
Real key generation and address filling happen **offline**, with you in control.

