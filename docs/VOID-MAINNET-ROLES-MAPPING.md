# VOID Mainnet Roles Mapping (DEV vs MAINNET)

This doc explains how the dev-sim bootstrap roles map to the real mainnet
bootstrap roles in `config/void-mainnet-bootstrap-mainnet.live.json` and
`script/VoidMainnetBootstrapMainnet.s.sol`.

## 1. Source of truth (MAINNET)

On real mainnet, the canonical roles are:

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

These are defined in:

- `config/void-mainnet-bootstrap-mainnet.live.json` under `.roles.*`
- `/mnt/voidkey/meta/mainnet-roles-mapping.txt` (hardware/LUKS mapping)

The script `VoidMainnetBootstrapMainnet.s.sol` loads these into its `Roles`
struct inside `ConfigView` and uses them in `plan(configPath)`.

## 2. Dev-sim roles (VoidMainnetBootstrapDev.s.sol)

The dev bootstrap script uses a larger `Roles` struct for local simulations:

- Governance:
  - `deployer`
  - `masterKey`
  - `configAdmin`
  - `validatorAdmin`
  - `emissionsAdmin`
  - `rewardsAdmin`

- Treasury / premine plumbing:
  - `voidOwner`
  - `founderBeneficiary`
  - `ecosystemReserve`
  - `communityPool`
  - `voidTreasuryAdmin`
  - `opsTreasuryAdmin`
  - `opsSpender`

- AI / infra admins:
  - `agentAdmin`
  - `datasetAdmin`
  - `modelAdmin`
  - `evalAdmin`
  - `jobQueueAdmin`
  - `receiptsAdmin`

The dev script actually deploys and wires contracts on an ephemeral chain:
VoidToken, OpsTreasury, VoidTreasury, AdminGate, ConfigGate, ValidatorSet,
VoidEmissionsController, RewardEngine, and moves the premine into
VoidTreasury.

## 3. Rough mapping: DEV → MAINNET

Conceptually, the dev roles correspond to mainnet roles as follows:

- `deployer` (dev) → `deployer` (mainnet)

- Admin / upgrade:
  - `masterKey` (dev)      → `adminGateOwner` (mainnet)
  - `configAdmin` (dev)    → `configGateOwner` (mainnet)
  - `validatorAdmin` (dev) → `validatorAdmin` + `validatorSetOwner` (mainnet)
  - `rewardsAdmin` (dev)   → `rewardEngineOwner` (mainnet)

- Treasury:
  - `voidTreasuryAdmin` (dev) → `treasuryOwner` (mainnet)
  - `opsTreasuryAdmin` (dev)  → `opsTreasuryOwner` (mainnet)

- Other dev labels like `founderBeneficiary`, `ecosystemReserve`,
  `communityPool`, `opsSpender`, `agentAdmin`, `datasetAdmin`, `modelAdmin`,
  `evalAdmin`, `jobQueueAdmin`, `receiptsAdmin` are **not part of the
  mainnet-live JSON roles set**. They are handled via separate contracts,
  UpdateGate flows, or future scripts.

## 4. Contracts and plan invariants

`VoidMainnetBootstrapMainnet.plan(configPath)` currently enforces that:

- `block.chainid` matches `cfg.chainId`
- All critical roles in `.roles.*` are **non-zero**
- `validator0.stakeVOID > 0`
- All `.contracts.*` entries are **zero-address** (no premade contracts)

It then logs:

- ChainId sanity
- Full roles mapping
- Full contracts mapping
- Validator0 reward / consensusKey / stakeVOID

The `run(configPath)` entry point is deliberately stubbed:

- It reuses the PLAN path for validation/logging
- It ALWAYS reverts with a "stub only; implement real wiring before
  broadcast" message
- It never deploys or mutates any on-chain state

## 5. Operational notes

- The **keys + roles** mapping is verified by:
  - `ops/void-mainnet-roles-verify.sh`
  - `ops/void-mainnet-keys-health.sh`
  - `void_mainnet_keys_roles_ok` gauge in Prometheus

- The **plan health** is enforced by:
  - `ops/void-mainnet-bootstrap-mainnet-plan-health-all.sh`
  - `void_mainnet_bootstrap_plan_health` and
    `void:mainnet_bootstrap_plan:health:last_5m` gauges

- The **combined "mainnet MAINNET health-all" gate** is:
  - `ops/void-mainnet-mainnet-health-all.sh`
  - Used in pre-push and other CI/ops flows to ensure:
    - contracts.* still 0x0 (pre-deploy)
    - keys + plan + run() dry-run are healthy
    - mainnet core + lastmile + tokenomics pillars are healthy
    - pillars AND keys roles are healthy over the last 5 minutes

This doc is **descriptive**, not authoritative. The authoritative sources are:

- `config/void-mainnet-bootstrap-mainnet.live.json`
- `/mnt/voidkey/meta/mainnet-roles-mapping.txt`
- The contracts and scripts currently checked into the repo.

