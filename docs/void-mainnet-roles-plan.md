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

---

## VOID Mainnet Roles & Key Tiers — High-Level Plan (checkpoint 2025-11-28)

This section captures the *intended* key / role layout for real VOID mainnet (chainId 2050).
It does **not** contain real addresses or secrets. The actual values live only in the
`config/void-mainnet-bootstrap-mainnet.live.json` file on an encrypted medium.

### 1. Role groups (from live.json)

These correspond to `.roles.*` in `void-mainnet-bootstrap-mainnet.live.json`:

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

And these correspond to `.contracts.*` / `validator0.*`:

- `contracts.updateGate`
- `contracts.adminGate`
- `contracts.configGate`
- `contracts.validatorSet`
- `contracts.voidToken`
- `contracts.voidTreasury`        (main Treasury contract)
- `contracts.opsTreasury`         (Ops Treasury hot/warm path)
- `contracts.rewardEngine`
- `validator0.reward`
- `validator0.consensusKey`
- `validator0.stakeVOID`          (numeric, wired later in ValidatorSet)

The PLAN exporter and checklist scripts make sure all of these are structurally sane
before `void:mainnet_bootstrap_plan:health:last_5m` can be 1.

### 2. Key tiers (cold → hot)

We split keys into tiers so we never mix “touch once in 20 years” with “used daily”.

**Tier 0 — Genesis / Premine one-shot**

- Purpose:
  - Single-use key to *start* the chain and move the premine into `VoidTreasury`.
  - After that, it is effectively retired and should never sign normal transactions.
- Backing:
  - Lives only on a **LUKS-encrypted USB** (and maybe a second, sealed backup).
  - No hot wallet, no browser extension, no mobile app.
- Usage rule:
  - Used exactly once during bootstrap to fund the Treasury contract, then locked away.
  - Any future “emergency” use would require a human ceremony and is treated as a last resort.

**Tier 1 — Governance & Core Gates (AdminGate / UpdateGate / ConfigGate)**

- Roles:
  - `adminGateOwner`
  - `updateGateOwner`
  - `configGateOwner`
- Purpose:
  - Control over AdminGate master key, UpdateGate signer set, and config/param changes.
  - These are the keys that can approve protocol-level changes to VOID core.
- Backing:
  - **Hardware wallets** for daily use.
  - **LUKS USB** (offline) with seed/backup for recovery.
- Usage rule:
  - Multi-sig / M-of-N configuration via UpdateGate/AdminGate.
  - No single party should be able to unilaterally push a dangerous upgrade.

**Tier 2 — Treasury & Ops Treasury**

- Roles:
  - `treasuryAdmin`
  - `opsTreasuryAdmin`
  - `treasuryOwner`
  - `opsTreasuryOwner`
- Contracts:
  - `contracts.voidTreasury`
  - `contracts.opsTreasury`
- Purpose:
  - Long-term premine sits in `VoidTreasury` (cold).
  - Funds for expenses/operations flow `VoidTreasury → OpsTreasury → hot wallets`.
- Backing:
  - Treasury side: hardware wallet + LUKS USB backup (cold/slow).
  - Ops Treasury side: hardware wallet, possibly used more frequently, but still backed by offline seed.
- Usage rule:
  - Premine key is **not** used for day-to-day spends.
  - Ops Treasury handles payouts, grants, and ongoing costs.
  - Movement from Treasury to Ops Treasury is deliberate, infrequent, and requires policy review.

**Tier 3 — Validators (Reward + Consensus)**

- Roles / fields:
  - `validatorAdmin`
  - `validatorSetOwner`
  - `validator0.reward`
  - `validator0.consensusKey`
- Purpose:
  - `validatorAdmin` + `validatorSetOwner` manage validator set configuration and parameters.
  - `validator0.reward` is the address that receives ongoing validator rewards.
  - `validator0.consensusKey` is the key actually used by the validator node to sign blocks/attestations.
- Backing:
  - Reward address:
    - Can be a hardware wallet or a well-secured software wallet with good backup.
  - Consensus key:
    - Often a key managed on the validator machine itself (or HSM), with backups stored offline.
- Usage rule:
  - Consensus keys are replaceable via admin / validator set flows.
  - Reward address should not be a key that also controls governance or treasury.

**Tier 4 — Normal user wallets (Obelisk / external)**

- Not explicitly part of `void-mainnet-bootstrap-mainnet.live.json`.
- Purpose:
  - Regular holders, dApps, and validators’ “spending” wallets.
- Backing:
  - Obelisk Wallet (Lite/Mobile/Titan) and other compatible wallets.
  - User education: encourage encrypted backups and write-down seed as a last resort.

### 3. Contract-level flows we must respect

**3.1 Premine & Treasury**

- MAX_SUPPLY: 666,666,666 VOID
- PREMINE:     333,333,333 VOID (goes into `VoidTreasury` at genesis)
- EMISSIONS:   333,333,333 VOID over 100 years in 4 eras

Rules:

- Premine is minted to a **premine vault / genesis holder** and immediately moved into `VoidTreasury`.
- The premine key is then effectively retired.
- All long-term spending flows must go:
  - `VoidTreasury → OpsTreasury → downstream hot wallets / reward flows`
- There is no direct “Treasury → random hot wallet” path in normal operation.

**3.2 Governance & upgrades**

- UpdateGate / AdminGate / ConfigGate control:
  - Core contract upgrades (where allowed).
  - Param changes for reward engine, validator set, and other core knobs.
- Design intent:
  - VOID is permissionless for users and agents.
  - Core is protected by a thin but strong UpdateGate + AdminGate layer.
  - Any change to core goes through:
    - On-chain proposal → off-chain human review → gated approval via UpdateGate/AdminGate signers.

### 4. Bootstrap PLAN vs. live mainnet

The **PLAN lane** and `void-mainnet-bootstrap-mainnet.live.json` are used to:

- Describe which addresses map to:
  - Governance roles (Tier 1)
  - Treasury/Ops roles (Tier 2)
  - Validator roles (Tier 3)
- Provide the forge bootstrap script (`VoidMainnetBootstrapMainnet.s.sol`) with:
  - ChainId (2050)
  - Concrete addresses for UpdateGate/AdminGate/ConfigGate/ValidatorSet/VoidToken/VoidTreasury/OpsTreasury/RewardEngine
  - Validator0 reward + consensus key + stake

Prometheus now exports and gates:

- `void:mainnet_bootstrap_plan:health:last_5m`
- `void:mainnet_pillars:health:last_5m`
- `void:mainnet_lastmile:health:last_5m`
- `void:mainnet_overall:health:last_5m_v2` (informational)
- `void_safeboot_overall_health`

`ops/void-mainnet-health-all.sh` refuses to pass unless:

- mainnet pillars are green,
- lastmile is healthy,
- **and** the bootstrap PLAN health is 1 (structurally READY-ish).

### 5. What still needs to happen before real mainnet

1. Generate fresh, never-used keys for:
   - Premine one-shot (Tier 0).
   - Treasury/OpsTreasury roles (Tier 2).
   - Governance roles (Tier 1).
   - Validator0 reward + consensus (Tier 3).
2. Store all seeds and any JSON keystores on:
   - LUKS-encrypted USB(s), plus hardware wallets where applicable.
3. Fill those addresses into:
   - `config/void-mainnet-bootstrap-mainnet.live.json` on the **encrypted medium only**.
4. Run:
   - PLAN checklist, PLAN view, PLAN health, PLAN sim (forge stub) and pillars/health hammers.
5. Only after that:
   - Implement real bootstrap wiring in `VoidMainnetBootstrapMainnet.s.sol` (replace stub revert),
   - and design a PLAN-only “dry-run” mainnet script that prints the full human-readable sequence
     before any broadcast actually happens.

This section is intentionally high-level and non-sensitive. The actual addresses and keys will
exist only in `*.live.json` and on physical encrypted media, not in this repo.


## Bootstrap PLAN tooling (2025-11-28 checkpoint)

This section describes the current PLAN-only tooling for VOID mainnet bootstrap.
All of these operate on a *.live.json config file and do not broadcast transactions.

### Config file

Default mainnet PLAN config path:

- config/void-mainnet-bootstrap-mainnet.live.json

This file is never committed (guarded by .gitignore) and must live on an encrypted medium when it contains real mainnet keys or addresses.

### PLAN scripts overview

All scripts assume:

- REPO_ROOT=$HOME/dev/void-node (by default)

1) Checklist (local structural scan)

    ./ops/void-mainnet-bootstrap-plan-checklist.sh

Reads *.live.json and prints:

- chainId (config) vs chainId (RPC)
- roles view: deployer, treasuryAdmin, opsTreasuryAdmin, validatorAdmin, adminGateOwner, updateGateOwner, configGateOwner, treasuryOwner, opsTreasuryOwner, rewardEngineOwner, validatorSetOwner
- contracts view: updateGate, adminGate, configGate, validatorSet, voidToken, premineVault, treasury, voidTreasury, opsTreasury, rewardEngine
- validator0 view: reward, consensusKey, stakeVOID

Computes a local plan_structural_health (1 or 0) based on missing or zero CRITICAL fields.
This local verdict is advisory; Prometheus gating is handled via exporter metrics.

2) PLAN structural view (pretty printer)

    ./ops/void-mainnet-bootstrap-plan-view.sh

Pretty-prints the same roles, contracts, and validator0 sections and summarizes:

- PLAN_STATUS : READY or NOT_READY
- DETAILS listing missing contracts and validator fields

Use this to eyeball what still needs to be filled in the live.json file.

3) PLAN PromQL health hammer

    ./ops/void-mainnet-bootstrap-plan-all.sh

Runs, in order:

- void-mainnet-bootstrap-plan-checklist.sh
- void-mainnet-bootstrap-plan-view.sh
- void-mainnet-bootstrap-plan-health-all.sh
- void-mainnet-bootstrap-mainnet-plan-sim.sh (forge script stub sim)

PromQL part checks:

- void:mainnet_bootstrap_plan:health:last_5m

Current behavior:

- Exporter plan_health is 1 when the PLAN lane is wired and the config is structurally coherent enough for planning.
- The local structural verdict may still be NOT_READY while addresses are placeholders; that is acceptable for the current PLAN-ready stage.

4) PLAN dry-run runner (jq-safe, no broadcast)

    ./ops/void-mainnet-bootstrap-plan-run.sh

Reads *.live.json and prints:

- Basic config view: chainId
- roles block with <missing> for unset fields
- contracts block with <missing> for unset fields
- validator0 block with <missing> for unset fields

Also prints a human-readable conceptual bootstrap sequence:

- Pre-flight checks
- Governance and gates wiring (UpdateGate, AdminGate, ConfigGate)
- Treasury and token wiring (VoidToken, VoidTreasury, OpsTreasury, RewardEngine)
- Validator set initial wiring (validator0)
- Post-bootstrap invariants and health checks

This script is PLAN-only and never touches chain state.

5) Forge PLAN simulation (stub)

    ./ops/void-mainnet-bootstrap-mainnet-plan-sim.sh

Calls the VoidMainnetBootstrapMainnet script against the PLAN config.

Expected to revert with:

- "VoidMainnetBootstrapMainnet: stub only; implement real wiring before broadcast"

This confirms:

- The script can parse the config.
- Roles, contracts, and validator0 are visible to the Solidity side.
- No real deployments are performed.

### Prometheus gating

The following metrics are now part of the mainnet gating story:

- void:mainnet_pillars:health:last_5m
- void:mainnet_lastmile:health:last_5m
- void_safeboot_overall_health
- void:mainnet_bootstrap_plan:health:last_5m
- void:mainnet_overall:health:last_5m_v2 (informational only)

The helper script:

    ./ops/void-mainnet-health-all.sh

now gates on:

- void:mainnet_pillars:health:last_5m == 1
- void:mainnet_lastmile:health:last_5m == 1
- void:mainnet_bootstrap_plan:health:last_5m == 1

This ensures we never advance towards real mainnet bootstrap unless:

1) Devnet and mainnet-core pillars are green.
2) Mainnet last-mile is healthy (non-empty blocks, txroot/header3/seals sane).
3) Bootstrap PLAN lane is structurally ready from the exporter view.

A future stage will introduce a separate, heavily audited broadcast script that:

- Reads the same *.live.json file.
- Prints a human-readable transaction plan.
- Requires explicit confirmation and hardware-wallet signing.
- Is never committed with real live configs or keys.

This section captures the 2025-11-28 PLAN tooling checkpoint, where:

- All mainnet pillars are green.
- Safeboot is healthy.
- PLAN exporter health is green.
- Bootstrap remains PLAN-only (stubbed, no mainnet deployments).


## Mainnet PLAN: role and contract mapping (concept only)

This section is **conceptual**: it describes what each PLAN slot is supposed to represent on real mainnet.  
Actual addresses and stakes will be filled into \`config/void-mainnet-bootstrap-mainnet.live.json\` later, using hardware/LUKS-backed keys.

### .roles.*

| Slot                    | Type at mainnet                          | Storage / safety                           | Notes |
|-------------------------|-------------------------------------------|--------------------------------------------|-------|
| roles.deployer          | Throwaway deployer EOA                    | Hardware or LUKS; tiny funded; one-shot    | Used only to broadcast bootstrap; not premine or treasury. |
| roles.treasuryAdmin     | Treasury admin EOA / multisig             | Hardware / LUKS                            | Configures Treasury / premine flows; no arbitrary mint. |
| roles.opsTreasuryAdmin  | OpsTreasury admin EOA / multisig          | Hardware / LUKS                            | Approves OpsTreasury → hot ops flows under policy. |
| roles.validatorAdmin    | ValidatorSet admin EOA / multisig         | Hardware / LUKS                            | Seeds/updates validators under ValidatorSet rules. |
| roles.adminGateOwner    | AdminGate master key (or multisig)        | LUKS / hardware only                       | Top of hierarchy; can alter UpdateGate/ConfigGate; extreme care. |
| roles.updateGateOwner   | Governance owner of UpdateGate (multisig) | On-chain multisig; signers on hardware     | Controls protocol/core upgrades via UpdateGate. |
| roles.configGateOwner   | Governance owner of ConfigGate (multisig) | On-chain multisig; signers on hardware     | Controls non-code config (params, limits, some validator config). |
| roles.treasuryOwner     | Owner/governance of VoidTreasury          | On-chain gate/governance module            | Treasury must not be owned by a raw EOA. |
| roles.opsTreasuryOwner  | Owner/governance of OpsTreasury           | On-chain gate/governance module            | Controls OpsTreasury policy and allowed drains. |
| roles.rewardEngineOwner | Owner/governance of RewardEngine          | On-chain gate/governance module            | Adjusts emission/reward parameters under strict rules. |
| roles.validatorSetOwner | Owner/governance of ValidatorSet          | On-chain gate/governance module            | Final authority on validator set rules and changes. |

### .contracts.*

| Slot                   | Contract at mainnet                    | Notes |
|------------------------|----------------------------------------|-------|
| contracts.updateGate   | UpdateGate contract                    | Protocol/core upgrade gate. |
| contracts.adminGate    | AdminGate contract                     | Master-key gate; root of trust. |
| contracts.configGate   | ConfigGate contract                    | Config/parameter gate (non-code). |
| contracts.validatorSet | ValidatorSet contract                  | Canonical active validator set. |
| contracts.voidToken    | VOID ERC20/main token                  | MAX_SUPPLY + eras as per locked tokenomics. |
| contracts.premineVault | Premine vault contract                 | Receives premine; drains only to VoidTreasury under rules. |
| contracts.treasury     | Treasury “router” contract             | Governance-controlled flows (e.g. Treasury → OpsTreasury). |
| contracts.voidTreasury | Main VoidTreasury contract             | Holds premine and long-term funds. |
| contracts.opsTreasury  | OpsTreasury contract                   | Holds operations budget funded from VoidTreasury. |
| contracts.rewardEngine | RewardEngine contract                  | Drives emissions and validator rewards over 100 years. |

### .validator0.*

| Field                    | Meaning at mainnet                                       | Notes |
|--------------------------|----------------------------------------------------------|-------|
| validator0.reward        | Reward EOA/multisig for first validator                  | Hardware wallet or multisig; not premine/treasury keys. |
| validator0.consensusKey  | Consensus key for first validator node                   | Lives on validator infra; dedicated to consensus only. |
| validator0.stakeVOID     | VOID amount staked by validator0                         | To be set once final mainnet stake value is chosen; must respect tokenomics. |


## Mainnet PLAN: role and contract mapping (concept only)

This section is **conceptual**: it describes what each PLAN slot is supposed to represent on real mainnet.  
Actual addresses and stakes will be filled into `config/void-mainnet-bootstrap-mainnet.live.json` later, using hardware/LUKS-backed keys.

### .roles.*

| Slot                    | Type at mainnet                          | Storage / safety                           | Notes |
|-------------------------|-------------------------------------------|--------------------------------------------|-------|
| roles.deployer          | Throwaway deployer EOA                    | Hardware or LUKS; tiny funded; one-shot    | Used only to broadcast bootstrap; not premine or treasury. |
| roles.treasuryAdmin     | Treasury admin EOA / multisig             | Hardware / LUKS                            | Configures Treasury / premine flows; no arbitrary mint. |
| roles.opsTreasuryAdmin  | OpsTreasury admin EOA / multisig          | Hardware / LUKS                            | Approves OpsTreasury → hot ops flows under policy. |
| roles.validatorAdmin    | ValidatorSet admin EOA / multisig         | Hardware / LUKS                            | Seeds/updates validators under ValidatorSet rules. |
| roles.adminGateOwner    | AdminGate master key (or multisig)        | LUKS / hardware only                       | Top of hierarchy; can alter UpdateGate/ConfigGate; extreme care. |
| roles.updateGateOwner   | Governance owner of UpdateGate (multisig) | On-chain multisig; signers on hardware     | Controls protocol/core upgrades via UpdateGate. |
| roles.configGateOwner   | Governance owner of ConfigGate (multisig) | On-chain multisig; signers on hardware     | Controls non-code config (params, limits, some validator config). |
| roles.treasuryOwner     | Owner/governance of VoidTreasury          | On-chain gate/governance module            | Treasury must not be owned by a raw EOA. |
| roles.opsTreasuryOwner  | Owner/governance of OpsTreasury           | On-chain gate/governance module            | Controls OpsTreasury policy and allowed drains. |
| roles.rewardEngineOwner | Owner/governance of RewardEngine          | On-chain gate/governance module            | Adjusts emission/reward parameters under strict rules. |
| roles.validatorSetOwner | Owner/governance of ValidatorSet          | On-chain gate/governance module            | Final authority on validator set rules and changes. |

### .contracts.*

| Slot                   | Contract at mainnet                    | Notes |
|------------------------|----------------------------------------|-------|
| contracts.updateGate   | UpdateGate contract                    | Protocol/core upgrade gate. |
| contracts.adminGate    | AdminGate contract                     | Master-key gate; root of trust. |
| contracts.configGate   | ConfigGate contract                    | Config/parameter gate (non-code). |
| contracts.validatorSet | ValidatorSet contract                  | Canonical active validator set. |
| contracts.voidToken    | VOID ERC20/main token                  | MAX_SUPPLY + eras as per locked tokenomics. |
| contracts.premineVault | Premine vault contract                 | Receives premine; drains only to VoidTreasury under rules. |
| contracts.treasury     | Treasury “router” contract             | Governance-controlled flows (e.g. Treasury → OpsTreasury). |
| contracts.voidTreasury | Main VoidTreasury contract             | Holds premine and long-term funds. |
| contracts.opsTreasury  | OpsTreasury contract                   | Holds operations budget funded from VoidTreasury. |
| contracts.rewardEngine | RewardEngine contract                  | Drives emissions and validator rewards over 100 years. |

### .validator0.*

| Field                    | Meaning at mainnet                                       | Notes |
|--------------------------|----------------------------------------------------------|-------|
| validator0.reward        | Reward EOA/multisig for first validator                  | Hardware wallet or multisig; not premine/treasury keys. |
| validator0.consensusKey  | Consensus key for first validator node                   | Lives on validator infra; dedicated to consensus only. |
| validator0.stakeVOID     | VOID amount staked by validator0                         | To be set once final mainnet stake value is chosen; must respect tokenomics. |

