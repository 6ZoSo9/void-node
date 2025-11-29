# VOID Mainnet Roles & Keys Plan (Conceptual)

This document defines the conceptual layout for VOID mainnet roles, keys, and owners.
No real addresses or secrets belong in this file. It is a design spec only.

## Entities

- K_DEPLOYER_MAINNET
  - One-shot deployer key for mainnet bootstrap script.
  - Hardware wallet or cold EOA.
  - Used only to run the bootstrap; can be effectively retired afterwards.

- MS_CORE_COUNCIL
  - 3-of-5 or 4-of-7 multisig.
  - Holds ultimate power over core contracts and gates:
    - AdminGate master key
    - UpdateGate
    - ConfigGate
    - VoidTreasury
    - RewardEngine
    - ValidatorSet

- MS_OPS_COUNCIL
  - 2-of-3 or 3-of-5 multisig.
  - Owns OpsTreasury, manages operational spending.

- K_TREASURY_ADMIN
  - EOA for day-to-day Treasury operations (parameter changes, distributions).
  - Does NOT control core upgrades.

- K_OPS_TREASURY_ADMIN
  - EOA for day-to-day OpsTreasury operations.

- K_VALIDATOR_ADMIN
  - EOA controlling validator administration flows via ValidatorSet / ConfigGate.
  - Used for adding/removing validators under policy.

- K_VALIDATOR0_REWARD
  - Address that receives validator0 rewards (EOA or small multisig).
  - Independent from premine / treasury / council keys.

- K_VALIDATOR0_CONSENSUS
  - Consensus identity key for validator0 (BLS/Ed encoded as bytes32).
  - Lives on validator hardware, backed up via LUKS/hardware.

## Roles Mapping (conceptual)

roles.deployer           -> K_DEPLOYER_MAINNET
roles.treasuryAdmin      -> K_TREASURY_ADMIN
roles.opsTreasuryAdmin   -> K_OPS_TREASURY_ADMIN
roles.validatorAdmin     -> K_VALIDATOR_ADMIN

roles.adminGateOwner     -> MS_CORE_COUNCIL
roles.updateGateOwner    -> MS_CORE_COUNCIL
roles.configGateOwner    -> MS_CORE_COUNCIL

roles.treasuryOwner      -> MS_CORE_COUNCIL
roles.opsTreasuryOwner   -> MS_OPS_COUNCIL
roles.rewardEngineOwner  -> MS_CORE_COUNCIL
roles.validatorSetOwner  -> MS_CORE_COUNCIL

Interpretation:
- MS_CORE_COUNCIL is the "root council" for core logic, upgrades, and treasury authority.
- MS_OPS_COUNCIL controls OpsTreasury and operational spending.
- Admin EOAs manage day-to-day flows but are replaceable by the councils if compromised.

## Contracts Path (conceptual)

At real mainnet bootstrap:

- Genesis mints MAX_SUPPLY into PremineVault.
- Bootstrap script:
  - Deploys UpdateGate, AdminGate, ConfigGate.
  - Deploys VoidToken (VOID).
  - Deploys VoidPremineVault (if not genesis-only).
  - Deploys VoidTreasury, OpsTreasury, RewardEngine, ValidatorSet.
  - Moves PREMINE from PremineVault into VoidTreasury.
  - Sets owners according to roles.* mapping above.
  - Funds OpsTreasury from VoidTreasury.
  - Wires RewardEngine + ValidatorSet parameters.
  - Registers validator0 using validator0.* fields.

The PLAN JSON will later contain the final deployed addresses under:

- contracts.updateGate
- contracts.adminGate
- contracts.configGate
- contracts.validatorSet
- contracts.voidToken
- contracts.premineVault
- contracts.treasury
- contracts.voidTreasury
- contracts.opsTreasury
- contracts.rewardEngine

## Validator0 (conceptual)

validator0.reward        -> K_VALIDATOR0_REWARD
validator0.consensusKey  -> K_VALIDATOR0_CONSENSUS
validator0.stakeVOID     -> numeric stake value (TBD, must respect tokenomics)

Constraints:
- validator0.reward MUST NOT be the same as any premine/treasury/council key.
- validator0.consensusKey MUST be a fresh key, not reused from devnet.
- stakeVOID will be chosen when ValidatorSet economics are finalized.

## PLAN Integration (later)

When ready for mainnet:

1. Generate the above keys and multisig addresses (hardware / LUKS).
2. Store seeds/keystores offline (never commit them).
3. Fill config/void-mainnet-bootstrap-mainnet.live.json with:
   - roles.* as per this mapping.
   - validator0.* with real reward and consensusKey.
4. Run ./ops/void-mainnet-bootstrap-plan-all.sh
   - Expect PLAN structural view to show all critical fields non-zero.
   - Expect void:mainnet_bootstrap_plan:health:last_5m == 1.
5. Only then make PLAN a hard gating condition for mainnet readiness.

This doc is design-only and must not contain actual mainnet addresses or secrets.
