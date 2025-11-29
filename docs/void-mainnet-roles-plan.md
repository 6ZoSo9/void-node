# VOID Mainnet Roles & Keys Plan (PLAN stage)

This doc describes **what** each mainnet role is for and **what kind of key** should hold it.
It does **not** contain real keys or real addresses.

## Chain

- `chainId`: **2050**
- Network: VOID mainnet

---

## Core roles (EOAs / key types)

### 1. deployer

- Purpose: performs the one-shot mainnet bootstrap script broadcast.
- Key type: hardware wallet or LUKS-encrypted USB-managed key.
- Usage:
  - Only used for the mainnet bootstrap script (deploy core contracts, wire gates/treasuries/validator set).
  - After bootstrap, this key should be effectively retired.
- Storage:
  - Backed up on LUKS-encrypted USB (`voidkey-mainnet-bootstrap.luks`) plus written recovery procedure.

### 2. treasuryAdmin

- Purpose: controls **VoidTreasury** governance-level actions.
- Key type: hardware wallet, likely a multi-sig in practice (N-of-M).
- Usage:
  - Configure Ops Treasury budgets / drip rates.
  - Approve large treasury outflows according to governance rules.
- Storage:
  - All signer seeds offline (LUKS + hardware wallets).

### 3. opsTreasuryAdmin

- Purpose: controls **OpsTreasury** configuration and emergency switches.
- Key type: smaller multi-sig or tightly controlled EOA(s).
- Usage:
  - Top-up hot wallets.
  - Refill validator-rewards funding streams.
- Storage:
  - Same LUKS/hardware pattern as treasuryAdmin but with a smaller set of signers.

### 4. validatorAdmin

- Purpose: manages **ValidatorSet** admin functions (adding/removing validators, changing parameters).
- Key type: hardware wallet / small multi-sig.
- Usage:
  - Only for validator set changes; not for everyday node operation.
- Storage:
  - Treated as critical governance infra; offline with LUKS + hardware backups.

---

## Gate owners

These are the owners/controllers of our on-chain control planes.

### 5. adminGateOwner

- Purpose: master “root-ish” control, but *constrained by UpdateGate & governance*.
- Key type: multi-sig (strongly recommended).
- Usage:
  - Owns AdminGate which can in turn gate other admin actions.
- Storage:
  - Most tightly controlled signer set.

### 6. updateGateOwner

- Purpose: controls the **UpdateGate** contract that allows core updates after v99 rules.
- Key type: multi-sig.
- Usage:
  - Approve/execute upgrades to core contracts, following our update policy.
- Storage:
  - Hardware wallets + LUKS, plus documented update ceremony.

### 7. configGateOwner

- Purpose: governs configuration changes (params, rate limits, SLOs).
- Key type: multi-sig or well-guarded EOA set.
- Usage:
  - Adjust non-critical config (limits, knobs) without redeploying everything.
- Storage:
  - Similar security posture to validatorAdmin / opsTreasuryAdmin.

---

## Treasury / rewards owners

These own on-chain contracts that hold / route VOID.

### 8. treasuryOwner

- Purpose: owns **VoidTreasury** contract.
- Likely the same signer set as `treasuryAdmin` or a related multi-sig.
- Usage:
  - One-shot initial wiring.
  - Rare governance-level actions later.

### 9. opsTreasuryOwner

- Purpose: owns **OpsTreasury**.
- Usage:
  - Configure operational spending, validator reward feeds.
- Notes:
  - Sometimes same as `opsTreasuryAdmin`, sometimes separate, but same security class.

### 10. rewardEngineOwner

- Purpose: owns **RewardEngine**.
- Usage:
  - Configure reward formulas, eras, and emission schedule details (within the locked tokenomics spec).
- Notes:
  - Signer set must not be able to violate hard MAX_SUPPLY or emission totals.

### 11. validatorSetOwner

- Purpose: owns **ValidatorSet** contract.
- Usage:
  - High-level changes in validator rules (not per-validator ops).
- Notes:
  - Very close in criticality to validatorAdmin; likely overlapping signer sets.

---

## Contracts (core addresses to be filled in live JSON)

These are the **deployed contract addresses** that will be written into:

- `config/void-mainnet-bootstrap-mainnet.live.json` (local only, gitignored)
- The mainnet PLAN scripts / exporters.

We will eventually fill these with real mainnet addresses:

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

At PLAN stage:
- These may remain `0x0000…0000` until we run a dry-run bootstrap on a fork/anvil with the live JSON.
- When we are ready, we:
  1. Deploy using dev script to anvil/fork.
  2. Capture deployed addresses.
  3. Copy them into `.live.json` **manually**, while keeping that file out of git.

---

## Validator0 (first mainnet validator)

`validator0` in the live JSON represents the first canonical validator.

Fields:

- `reward`: EOA where rewards are paid (likely Obelisk validator wallet).
- `consensusKey`: BLS/Ed25519/etc. key (encoded as bytes32) used by the node.
- `stakeVOID`: raw amount of VOID to stake, respecting the emission + premine tokenomics.

Key classes:

- `reward`:
  - Lives in Obelisk Wallet on the validator machine (or a dedicated hardware wallet).
  - Can be rotated via ValidatorSet logic.

- `consensusKey`:
  - Stored by the validator software (Void node / Obelisk Titan).
  - Never reused across devnet/mainnet.

At PLAN stage:
- All of these remain zero/unset in `.live.json`.
- We only fill them once we:
  - Generate real validator keys.
  - Decide initial stake sizes.
  - Wire the node and Prometheus checks for validator health.

---

## PLAN vs MAINNET distinction

- `config/void-mainnet-bootstrap-mainnet.template.json`
  - Checked into git.
  - Uses dummy zeros for everything.
  - Used by stub script + tests.

- `config/void-mainnet-bootstrap-mainnet.live.json`
  - **NEVER committed.** Protected by `.gitignore`.
  - Holds real VOID mainnet addresses and stakes.
  - Used by:
    - PLAN script (dry-run, no broadcast).
    - Real **mainnet** bootstrap run (with hardware wallets).

PLAN stage status:
- `plan_structural_health` from `ops/void-mainnet-bootstrap-plan-checklist.sh` remains `0`
  until:
  - All CRITICAL contracts and `validator0` fields are populated.
  - We have verified the plan against fork/anvil rehearsals.
- Prometheus exporters/gates will later flip `plan_health` to `1` only when:
  - Checklist + simulations + doc review are all satisfied.

