# VOID Mainnet Custody & Roles Plan (v0)

Network: **VOID mainnet (chainId 2050)**  
Scope: On-chain roles and contract owners referenced by:

- `docs/void-mainnet-keys-blueprint.md`
- `config/void-mainnet-bootstrap-mainnet.live.json`
- `script/VoidMainnetBootstrapMainnet.s.sol`

This document decides **what kind of key / wallet** should sit behind each role.  
It does **not** define actual addresses – those go only into the `.live.json` on your machine.

---

## 0. Design goals

1. **Never-trust-a-single-key** for anything that can brick or radically change the chain.
2. **Blast-radius containment**: mistakes in ops spending must not touch premine / core.
3. **20+ year survivability**: keys can be rotated and successors can take over without hard-forking.
4. **Genesis bootstrap safety**: the “deployer” identity is one-shot and then irrelevant.
5. **User-first**: validator rewards and normal user funds are single-owner or light multisig, not council-level governance keys.

We treat **addresses in the PLAN** as either:

- **EOA hardware wallets** (Ledger/Trezor/etc.)  
- **Multisig contracts** (e.g. 3-of-5, 2-of-3) on VOID itself

EOA vs multisig is invisible to the contracts – they just see an `address`.

---

## 1. Key families (conceptual)

These are *classes* of keys, not specific addresses:

- **CORE COUNCIL keys**  
  - 5 hardware wallets: `CORE_1` … `CORE_5`  
  - Held by you + future trusted humans/entities.
  - Used only for **AdminGate/UpdateGate/ConfigGate/ValidatorSet** ownership and other “change the rules of the game” powers.

- **TREASURY COUNCIL keys**  
  - 5 hardware wallets: `TREASURY_1` … `TREASURY_5`  
  - Used for **VoidTreasury** (premine) ownership and long-horizon allocations.

- **OPS keys**  
  - 3 hardware wallets: `OPS_1` … `OPS_3`  
  - Lower blast radius, used for **OpsTreasury** and RewardEngine operations.

- **VALIDATOR operator keys**  
  - `VAL0_REWARD`  – validator0 payout wallet (Obelisk/desktop HW wallet).  
  - `VAL0_CONSENSUS` – validator0 consensus key (node key; not used for spending).

- **DEPLOYER key**  
  - `DEPLOYER_MAINNET` – one hardware wallet used only to run the bootstrap script once, then retired.

Later, we can tighten this further with USB sentinels / safeboot policies, but this is the L1 custody layout.

---

## 2. Multisig contracts (logical)

We will **deploy multisigs first**, then feed their addresses into the `.live.json`:

- **CORE_COUNCIL_MSIG (3-of-5)**  
  - Signers: `CORE_1` … `CORE_5`  
  - Threshold 3-of-5.  
  - Powers: UpdateGate owner, AdminGate owner, ConfigGate owner, ValidatorSet owner.

- **TREASURY_COUNCIL_MSIG (3-of-5)**  
  - Signers: `TREASURY_1` … `TREASURY_5`  
  - Threshold 3-of-5.  
  - Powers: VoidTreasury owner, PremineVault owner (if separate), long-term policy moves.

- **OPS_MSIG (2-of-3)**  
  - Signers: `OPS_1` … `OPS_3`  
  - Threshold 2-of-3.  
  - Powers: OpsTreasury owner, RewardEngine owner (operational knobs, rewards pipeline).

These three multisigs are what we will actually plug into the `.live.json` for the corresponding roles.

---

## 3. Mapping: roles.* → custody

These are the **`roles.*` fields** in `void-mainnet-keys-blueprint` / `.live.json` and who should hold them.

### 3.1 Governance / gate roles

- `roles.adminGateOwner`  
  → **CORE_COUNCIL_MSIG (3-of-5)**  
  Reason: controls AdminGate, which can bless dangerous actions. Must be very high security.

- `roles.updateGateOwner`  
  → **CORE_COUNCIL_MSIG (3-of-5)**  
  Reason: can approve core upgrades. Absolutely requires council-level multisig.

- `roles.configGateOwner`  
  → **CORE_COUNCIL_MSIG (3-of-5)**  
  Reason: can change critical chain configuration. Same council.

- `roles.validatorSetOwner`  
  → **CORE_COUNCIL_MSIG (3-of-5)**  
  Reason: controls ValidatorSet, so it controls who the validators are. Core-governance level.

- `roles.validatorAdmin`  
  → **CORE_COUNCIL_MSIG (3-of-5)** (alias)  
  Reason: anything that can add/remove validators directly should not be a weaker key than ValidatorSetOwner.

### 3.2 Treasury / economic roles

- `roles.treasuryOwner`  
  → **TREASURY_COUNCIL_MSIG (3-of-5)**  
  Reason: this is effectively the long-term premine/treasury governor.

- `roles.treasuryAdmin`  
  → **TREASURY_COUNCIL_MSIG (3-of-5)** (alias)  
  Reason: we don’t want a weaker “admin” able to bypass council policy.

- `roles.opsTreasuryOwner`  
  → **OPS_MSIG (2-of-3)**  
  Reason: covers ongoing operations spend (infra, dev, bounties). Needs to move faster than the main treasury.

- `roles.opsTreasuryAdmin`  
  → **OPS_MSIG (2-of-3)** (alias)  
  Reason: same reasoning – keep all OpsTreasury powers behind the same ops multisig.

- `roles.rewardEngineOwner`  
  → **OPS_MSIG (2-of-3)**  
  Reason: adjusting reward engine params is operational, but still gated by small council.

### 3.3 Deployer / script roles

- `roles.deployer`  
  → **EOA `DEPLOYER_MAINNET` (hardware wallet)**  
  Usage:
  - Only used to call the bootstrap script once on live mainnet.
  - After bootstrap completes and contracts are wired correctly, this key should be:
    - Removed from any special roles in future upgrades, and
    - Treated as a normal user key (or fully retired).

The deployer should **not** have ongoing governance or treasury powers after bootstrap. All critical ownership must be transferred to the multisigs above during bootstrap.

---

## 4. Mapping: contracts.* → custody

These are the addresses that `.live.json` expects under `contracts.*`.  
They are **deployed contract addresses** that will themselves be owned by the multisigs above.

- `contracts.updateGate`  
  → Address of **UpdateGate** contract.  
  - `owner` of UpdateGate = `roles.updateGateOwner` = CORE_COUNCIL_MSIG.

- `contracts.adminGate`  
  → Address of **AdminGate** contract.  
  - `owner` of AdminGate = `roles.adminGateOwner` = CORE_COUNCIL_MSIG.

- `contracts.configGate`  
  → Address of **ConfigGate** contract.  
  - `owner` of ConfigGate = `roles.configGateOwner` = CORE_COUNCIL_MSIG.

- `contracts.validatorSet`  
  → Address of **ValidatorSet** contract.  
  - `owner` of ValidatorSet = `roles.validatorSetOwner` = CORE_COUNCIL_MSIG.

- `contracts.voidToken`  
  → Address of **VoidToken** (VOID ERC20) contract.  
  - Initial `owner` / minter roles wired to **TREASURY_COUNCIL_MSIG**, not to an EOA.

- `contracts.premineVault`  
  → Address of premine vault contract (if separate from VoidTreasury).  
  - Owned by **TREASURY_COUNCIL_MSIG**.

- `contracts.treasury`  
  → If there is a legacy treasury contract, also owned by **TREASURY_COUNCIL_MSIG**.

- `contracts.voidTreasury`  
  → Main treasury contract which actually holds the 333,333,333 VOID premine.  
  - Owned by **TREASURY_COUNCIL_MSIG**.

- `contracts.opsTreasury`  
  → Ops treasury contract used for operational spending.  
  - Owned by **OPS_MSIG**.

- `contracts.rewardEngine`  
  → Reward engine contract that handles validator rewards flows.  
  - Owned by **OPS_MSIG**.

These are the contract addresses we will **discover on anvil and on mainnet** and plug into `.live.json` once the multisigs and core contracts are deployed in order.

---

## 5. Mapping: validator0.* → custody

Validator0 is the **first real validator** in the network. We keep the usual split:

- `validator0.reward`  
  → EOA **`VAL0_REWARD`** (hardware wallet, likely Obelisk/Titan user’s main payout wallet).  
  - Receives block rewards from RewardEngine.
  - This is a normal user wallet, independent from governance/tresury keys.

- `validator0.consensusKey`  
  → **`VAL0_CONSENSUS`** – consensus key controlled by the node.  
  - Stored as bytes32 (depending on how you encode the key).  
  - This is *not* a spend key; it is only for consensus / signing blocks.

- `validator0.stakeVOID`  
  → Amount of VOID staked, e.g. `1000000` (1,000,000 VOID) as currently in the PLAN.  
  - The matching funds must be locked up from VoidStones balances in the RewardEngine/ValidatorSet flow.

In practice:

- `VAL0_REWARD` = hardware wallet in your control.  
- `VAL0_CONSENSUS` = node key stored in your validator box(es), with backups and rotation plan.

---

## 6. How this flows into the PLAN

When we are ready for real mainnet bootstrap:

1. **Deploy multisigs** on chainId 2050:
   - CORE_COUNCIL_MSIG (3-of-5)
   - TREASURY_COUNCIL_MSIG (3-of-5)
   - OPS_MSIG (2-of-3)

2. **Deploy core contracts** (UpdateGate, AdminGate, ConfigGate, ValidatorSet, VoidToken, Vaults, Treasuries, RewardEngine) using `DEPLOYER_MAINNET`, wiring:
   - Ownership to the multisigs above
   - Premine → VoidTreasury

3. Write those real addresses + validator0 wallets into:
   - `config/void-mainnet-bootstrap-mainnet.live.json` on your machine only.

4. Run:
   - `./ops/void-mainnet-bootstrap-mainnet-plan-smoke.sh`
   - `./ops/void-mainnet-bootstrap-plan-sim.sh`
   - `./ops/void-mainnet-bootstrap-plan-rehearsal.sh`
   - `./ops/void-mainnet-bootstrap-plan-health-all.sh`

5. Only when **plan_health goes to 1** and the rehearsals are clean do we move to the actual **live broadcast** step.

Until that day, this doc is the **authoritative design** for who should hold what.

---

## 7. Status

- This is **v0** of the custody plan.  
- Safe to commit to git (no secrets, no addresses).  
- `.live.json` stays git-ignored and private.
