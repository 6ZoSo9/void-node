# VOID Mainnet — Roles & Keys Plan (Draft)

> Draft v1 — 2025-11-29. No secrets in this file. This is the mapping blueprint that
> `config/void-mainnet-bootstrap-mainnet.live.json` must follow.

## 0. Design goals

- Devnet keys are **never** reused on mainnet.
- Premine / Treasury / Admin / Update / Config keys are long-lived and stored on
  LUKS-encrypted USB or hardware wallets.
- The chain stays permissionless for user contracts; these keys only control:
  - **AdminGate** (admin roles)
  - **UpdateGate** (core upgrade gating)
  - **ConfigGate** (config parameters)
  - Treasury / OpsTreasury / RewardEngine / ValidatorSet admin knobs.

## 1. Core actors (human / device abstractions)

These are *labels*, not addresses. Real 0x addresses belong in the `.live.json`.

- **HARDWARE_OPS_1**
  - Hardware wallet or LUKS-USB-backed EOA.
  - Used for: deployer, treasury admin, ops treasury admin.

- **HARDWARE_CORE_1**
  - Hardware wallet or LUKS-USB-backed EOA.
  - Used for: AdminGate owner, UpdateGate owner, ConfigGate owner.

- **HARDWARE_VALIDATOR_1**
  - Secure EOA for validator admin + validator0 reward address.
  - NOT the same as the consensus key; consensus key is separate.

- **VALIDATOR0_CONSENSUS_KEY**
  - The actual validator0 consensus key (BLS/ECDSA; 32/48 bytes etc.).
  - Stored on the validator machine (plus backup), not in this doc.

Later, these can be split into M-of-N multisigs. For v1 they will likely be single EOAs
with a future migration path.

## 2. Roles that appear in the live config

These correspond directly to fields in
`config/void-mainnet-bootstrap-mainnet.live.json`.

### 2.1 Deployer & admins

- **deployer**
  - Description: EOA that sends the main bootstrap script.
  - Backed by: `HARDWARE_OPS_1`.
  - Usage: only for initial deployment on mainnet and any emergency replay
    (if chain is reset before public launch).

- **treasuryAdmin**
  - Description: address allowed to manage Treasury (within AdminGate rules).
  - Backed by: `HARDWARE_OPS_1`.
  - Notes: should NOT be hot; long-lived governance key.

- **opsTreasuryAdmin**
  - Description: address allowed to manage OpsTreasury parameters.
  - Backed by: `HARDWARE_OPS_1` (or a second ops device if you later split).

- **validatorAdmin**
  - Description: owner/admin for ValidatorSet contract.
  - Backed by: `HARDWARE_VALIDATOR_1`.

### 2.2 Gate owners (AdminGate / UpdateGate / ConfigGate)

These map to your locked-in gate design (AdminGate, UpdateGate, ConfigGate).

- **adminGateOwner**
  - Backed by: `HARDWARE_CORE_1`.
  - Powers: can change admin mappings/roles via AdminGate.

- **updateGateOwner**
  - Backed by: `HARDWARE_CORE_1`.
  - Powers: can update core protocol upgrade signers / policies.

- **configGateOwner**
  - Backed by: `HARDWARE_CORE_1`.
  - Powers: can adjust on-chain config parameters (limits, feature flags, etc.).

### 2.3 Contract owners

These owners are what your bootstrap script wires into Treasury, OpsTreasury,
RewardEngine, ValidatorSet.

- **treasuryOwner**
  - Backed by: `HARDWARE_OPS_1`.
  - Should typically be routed through AdminGate roles so not every function is
    callable directly.

- **opsTreasuryOwner**
  - Backed by: `HARDWARE_OPS_1`.
  - Controls Ops budgets and related flows through AdminGate/ConfigGate.

- **rewardEngineOwner**
  - Backed by: `HARDWARE_OPS_1` or `HARDWARE_CORE_1` depending on how strict you want it.
  - Powers: adjust reward parameters ONLY, no arbitrary withdrawals.

- **validatorSetOwner**
  - Backed by: `HARDWARE_VALIDATOR_1`.
  - Powers: add/remove validators, adjust validator set params within rules.

## 3. Contracts expected in the live config

The live `.json` must contain the post-deploy addresses for:

- `updateGate`
- `adminGate`
- `configGate`
- `validatorSet`
- `voidToken`
- `premineVault`
- `treasury`
- `voidTreasury` (Treasury, if you end up with split naming)
- `opsTreasury`
- `rewardEngine`

For mainnet, **none** of these may be `0x0000000000000000000000000000000000000000`.

The pipeline is:

1. Bootstrap script deploys these contracts.
2. The script emits or writes their addresses.
3. `void-mainnet-bootstrap-mainnet.live.json` is updated with the real values
   (never committed to git).
4. PLAN sim + exporter confirm structural health before real broadcast.

## 4. Validator0 mapping

Validator0 is the first validator; everything else can be added later.

- `validators[0].reward`
  - Backed by: `HARDWARE_VALIDATOR_1`.
  - Description: EOA that receives validator0 rewards.

- `validators[0].consensusKey`
  - Backed by: `VALIDATOR0_CONSENSUS_KEY`.
  - Description: consensus key material (BLS/ECDSA public key).

- `validators[0].stakeVOID`
  - Description: amount of VOID staked by validator0.
  - Requirement: must be >= a minimum stake defined by tokenomics.
  - TODO: choose exact number (e.g. 1,000,000 VOID) consistent with the premine
    and rewards spec.

For mainnet, the checklist requires:

- `reward != 0x0`
- `consensusKey` != 0 bytes
- `stakeVOID` set to a non-zero amount.

## 5. Mapping this doc to live JSON

When we’re ready for real mainnet:

1. Generate real addresses/keys offline for:
   - `HARDWARE_OPS_1`
   - `HARDWARE_CORE_1`
   - `HARDWARE_VALIDATOR_1`
   - `VALIDATOR0_CONSENSUS_KEY`

2. Fill `config/void-mainnet-bootstrap-mainnet.live.json` with:

   - `deployer`             = address of `HARDWARE_OPS_1`
   - `treasuryAdmin`        = address of `HARDWARE_OPS_1`
   - `opsTreasuryAdmin`     = address of `HARDWARE_OPS_1`
   - `validatorAdmin`       = address of `HARDWARE_VALIDATOR_1`

   - `adminGateOwner`       = address of `HARDWARE_CORE_1`
   - `updateGateOwner`      = address of `HARDWARE_CORE_1`
   - `configGateOwner`      = address of `HARDWARE_CORE_1`

   - `treasuryOwner`        = address of `HARDWARE_OPS_1`
   - `opsTreasuryOwner`     = address of `HARDWARE_OPS_1`
   - `rewardEngineOwner`    = address of chosen owner (ops/core)
   - `validatorSetOwner`    = address of `HARDWARE_VALIDATOR_1`

   - Contract addresses filled in after a dry-run / deployment rehearsal.

   - `validators[0].reward`      = address of `HARDWARE_VALIDATOR_1`
   - `validators[0].consensusKey`= VALIDATOR0_CONSENSUS_KEY
   - `validators[0].stakeVOID`   = chosen stake amount.

3. Run:
   - `./ops/void-mainnet-bootstrap-plan-checklist.sh`
   - `./ops/void-mainnet-bootstrap-plan-sim.sh`
   - Ensure exporter reports:
     - `void_mainnet_bootstrap_plan_structural_health = 1`
     - `void_mainnet_bootstrap_plan_health = 1`
     - `void:mainnet_bootstrap_plan:health:last_5m = 1`.

Until those are 1, mainnet is **not** ready.


> **Validator0 stake decision (locked)**  
> For mainnet v1, \`validators[0].stakeVOID\` is fixed at **1,000,000 VOID**.  
> This is ~0.3% of the premine (333,333,333 VOID) and serves as the baseline
> minimum stake for validator0 until on-chain governance explicitly changes it.
