# VOID Mainnet Bootstrap PLAN — JSON Semantics

File: config/void-mainnet-bootstrap-mainnet.live.json  
Scope: ONE SPECIFIC live VOID mainnet chain (chainId 2050).

This file answers three questions for real VOID mainnet:

- Who owns what? (roles)
- Where does the premine and emissions actually live? (contracts)
- Who is the first validator, with which key and stake? (validator0)

It is:

- Human-readable
- Machine-validated (Solidity PLAN validator + Prometheus metrics)
- Intended to stay meaningful for 10–20+ years

This is NOT for devnet/anvil. It is the truth for the real VOID mainnet chain.


## 1. Top-level JSON shape

The JSON has this structure (commented here, but real file is pure JSON):

{
  "chainId": 2050,
  "roles": {
    "deployer": "0x...",
    "premineOwner": "0x...",
    "treasuryAdmin": "0x...",
    "opsTreasuryAdmin": "0x...",
    "validatorAdmin": "0x...",
    "adminGateOwner": "0x...",
    "updateGateOwner": "0x...",
    "configGateOwner": "0x...",
    "treasuryOwner": "0x...",
    "opsTreasuryOwner": "0x...",
    "rewardEngineOwner": "0x...",
    "validatorSetOwner": "0x..."
  },
  "contracts": {
    "updateGate": "0x...",
    "adminGate": "0x...",
    "configGate": "0x...",
    "validatorSet": "0x...",
    "voidToken": "0x...",
    "premineVault": "0x...",
    "treasury": "0x...",
    "voidTreasury": "0x...",
    "opsTreasury": "0x...",
    "rewardEngine": "0x..."
  },
  "validator0": {
    "reward": "0x...",
    "consensusKey": "0x...",
    "stakeVOID": "123456789"   // stringified integer
  }
}

The exporter and checklist treat some fields as CRITICAL:

- chainId
- roles.* (subset: deployer, treasuryAdmin, opsTreasuryAdmin, validatorAdmin, gate owners)
- contracts.voidToken, contracts.premineVault, contracts.treasury, contracts.opsTreasury, contracts.rewardEngine
- validator0.reward, validator0.consensusKey

These drive void_mainnet_bootstrap_plan_health.


## 2. chainId

Field:

- chainId: number

For real VOID mainnet:

- MUST be 2050

The PLAN script compares:

- chainId from config
- chainId from RPC

Rules:

- If config != 2050 → PLAN invalid for VOID mainnet.
- If RPC chainId != config → you pointed the PLAN at the wrong chain or wrong RPC.

This prevents you from running a VOID mainnet bootstrap against some random fork.


## 3. roles — human authority layout

These are human-facing/ownership roles, not contracts. They are addresses that own or admin the core pieces.

### 3.1 High-level grouping

- Deployer:
  - roles.deployer

- Human admins around Treasury/Validators:
  - roles.premineOwner
  - roles.treasuryAdmin
  - roles.opsTreasuryAdmin
  - roles.validatorAdmin

- Gate owners (master-key layer):
  - roles.adminGateOwner
  - roles.updateGateOwner
  - roles.configGateOwner

- Contract owners:
  - roles.treasuryOwner
  - roles.opsTreasuryOwner
  - roles.rewardEngineOwner
  - roles.validatorSetOwner

You can re-use the same human or HSM across multiple roles, but the PLAN keeps them logically separate so future eras can rewire without rewriting history.

### 3.2 Field meanings

roles.deployer
- Address that submits the actual bootstrap transactions.
- Does not need long-term power after bootstrap.
- Should be hardware-protected / LUKS-gated when broadcasting.

roles.premineOwner
- Address that “owns” the premine vault contract while it does its one-time job.
- In the intended design:
  - premineVault receives the premine once
  - then pushes it into VoidTreasury
  - then becomes effectively inert

roles.treasuryAdmin
- Human/ops guardian around the main Treasury.
- Not the hot wallet for day-to-day spending.
- Very locked down.

roles.opsTreasuryAdmin
- Admin for Ops Treasury.
- Approves flow from VoidTreasury into OpsTreasury under rules.

roles.validatorAdmin
- Admin for ValidatorSet.
- Controls adding/removing validators and key parameters.
- Abuse here = consensus capture. Must be strongly protected.

roles.adminGateOwner
- Owner of AdminGate contract.
- AdminGate controls admin rights for core contracts via indirection.
- This is part of the “god tier” – cold, rarely used.

roles.updateGateOwner
- Owner of UpdateGate.
- Controls upgradeability / code updates of core components.
- For v99 freeze, this key is either never used or only under extreme, governed conditions.

roles.configGateOwner
- Owner of ConfigGate.
- Controls configuration-only changes (params, tuning knobs) but not code.
- Also hardware/multi-party controlled.

roles.treasuryOwner
- Contract-level owner for VoidTreasury.
- In practice probably a gate or multi-sig, but PLAN just records the address.

roles.opsTreasuryOwner
- Owner for OpsTreasury contract.
- Controls its configuration, not arbitrary spend (spend should go via contract logic).

roles.rewardEngineOwner
- Owner for RewardEngine.
- Controls reward/emission configuration within the constraints of the tokenomics spec.

roles.validatorSetOwner
- Owner for ValidatorSet.
- Controls meta-parameters (min stake, max validators, etc.).
- Usually wired via AdminGate/ConfigGate in the actual contracts.


## 4. contracts — the chain’s “bones”

Once mainnet is live, these addresses are essentially fixed for that chain.

### 4.1 Gate layer contracts

contracts.updateGate
- Address of UpdateGate contract.
- Global choke point for code upgrades of core components.

contracts.adminGate
- Address of AdminGate contract.
- Indirection for admin/owner rights for critical contracts.

contracts.configGate
- Address of ConfigGate contract.
- Indirection for configuration changes.

### 4.2 Consensus / validator layer

contracts.validatorSet
- Canonical ValidatorSet contract.
- Validator membership and stake are read from here by nodes.
- This address is sacred for that mainnet instance.

### 4.3 Tokenomics / Treasury layer

contracts.voidToken
- VOID ERC-20 contract for chainId 2050.
- Enforces:
  - Max supply: 666,666,666 VOID
  - Premine: 333,333,333 VOID
  - Emissions: 333,333,333 VOID over 4 eras (25 years each)
    - Era 1: 177,777,777
    - Era 2: 88,888,889
    - Era 3: 44,444,444
    - Era 4: 22,222,223

contracts.premineVault
- Contract that receives premine once and then sends it to VoidTreasury.
- After that, should be inert.
- If this is empty or zero, the PLAN is incomplete.

contracts.treasury and contracts.voidTreasury
- Logical meaning:
  - voidTreasury = canonical main Treasury contract holding premine and emissions.
  - treasury = alias for the same thing in PLAN for explicitness.
- In final, ready PLAN:
  - contracts.treasury and contracts.voidTreasury should be the same non-zero address.

contracts.opsTreasury
- Ops Treasury contract.
- Holds operational budget separate from main Treasury.
- Typical flow:
  - VoidToken → premineVault → VoidTreasury
  - VoidTreasury → OpsTreasury
  - OpsTreasury → on-chain spending (infra, salaries, etc.).

contracts.rewardEngine
- RewardEngine contract.
- Handles validator rewards and emission scheduling.
- Must be non-zero and wired correctly into ValidatorSet and Tokenomics.


## 5. validator0 — first validator

Bootstrap needs at least one real validator.

Fields:

validator0.reward
- Payout address for validator0’s rewards.
- EOA or wallet; can be different from consensus key.

validator0.consensusKey
- 32-byte consensus key for validator0 (hex string).
- Node consensus uses this to verify the validator’s signatures.
- Typically stored in hardware or locked infra, not reused as a hot wallet key.

validator0.stakeVOID
- Stringified integer amount of VOID staked by validator0 (in smallest units).
- Must match constraints enforced by ValidatorSet and RewardEngine.

For PLAN readiness later:

- validator0.reward must be non-zero.
- validator0.consensusKey must be a non-zero 32-byte value.
- validator0.stakeVOID must be a real number, not a placeholder.


## 6. PLAN health — how metrics interpret the JSON

Exporter and checklist define:

void_mainnet_bootstrap_plan_configured
- 1 when the JSON exists and parses.
- 0 otherwise.

void_mainnet_bootstrap_plan_chainid
- 2050 when config is for VOID mainnet.
- 0 or wrong value means config is mis-targeted.

void_mainnet_bootstrap_plan_health
- 0 if any CRITICAL fields are zero/missing:
  - contracts.voidToken
  - contracts.premineVault
  - contracts.treasury
  - contracts.opsTreasury
  - contracts.rewardEngine
  - validator0.reward
  - validator0.consensusKey
- 1 once all of the above are non-zero and basic structural checks pass.

Recording rules:

- void:mainnet_bootstrap_plan:configured:last_5m
- void:mainnet_bootstrap_plan:health:last_5m

Alert:

VoidMainnetBootstrapPlanNotReady
- Fires when:
  - configured:last_5m == 1 AND
  - health:last_5m == 0 for at least 10 minutes.
- Meaning:
  - PLAN exists but still has placeholders or zeros in critical fields.


## 7. Lifecycle of the PLAN

1) Template (.template.json)
- Obvious placeholders:
  - 0x1111..., 0x2222..., etc. for owners.
  - Zero or empty addresses for contracts.
  - TODO_SET_STAKE_VOID for validator stake.
- plan_health = 0 and that is expected.

2) Dev/Anvil PLAN (for rehearsals)
- Non-zero fake addresses and test validator keys.
- Can reach plan_health = 1 on anvil, but this is not real mainnet.

3) Mainnet live PLAN (.live.json)
- Real addresses and keys for actual VOID mainnet.
- plan_health must reach 1 before we allow any live broadcast script.
- This file is never committed to git; guarded by .gitignore.

4) Post-bootstrap
- PLAN remains the single human-readable record for:
  - Who the initial gate owners are.
  - How premine, Treasury, OpsTreasury, RewardEngine were wired.
  - Who the first validator was and how much they staked.
- Governance and protocol docs can reference this PLAN as the original ground truth.


## 8. Next steps tied to this doc (for future work)

Not executed yet; this section is a to-do list for future changes:

1) Turn VoidMainnetBootstrapMainnet.s.sol stub into a PLAN validator:
   - Read the .live.json.
   - Hard fail with explicit reasons if any critical field is missing/wrong.
   - Succeed (rc=0) when PLAN is structurally valid (but still no real deployments).

2) Tighten ops/void-mainnet-bootstrap-plan-dry-run.sh:
   - Treat rc=0 from the PLAN validator as required for success.
   - Fail the script if the stub/validator reverts.

3) Later, design the live broadcast script:
   - Gated by:
     - void:mainnet_pillars:health:last_5m == 1
     - void:obelisk_profile_health:last_5m == 1
     - void:mainnet_bootstrap_plan:health:last_5m == 1
     - Keys pillar health == 1
     - Extra LUKS / hardware confirmations on the machine.

Until then, PLAN stays visible, non-broadcasting, and safe to iterate.
