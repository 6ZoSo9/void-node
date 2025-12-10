# VOID Mainnet - Validator0 Bootstrap Spec (Draft v1)

This document describes the genesis validator for VOID mainnet ("validator0") and how it fits into the early economics and bootstrap flow.

This is deliberately non-secret: it is public wiring and economics, not key material.

---

## 1. Chain and Context

- Chain name: VOID Mainnet
- Chain ID: 2050
- Premine and emissions: see docs/VOID-MAINNET-TOKENOMICS.md
  - MAX_SUPPLY = 666,666,666 VOID
  - PREMINE = 333,333,333 VOID
  - EMISSIONS = 333,333,333 VOID over 4 eras

Bootstrap script:

- Script: script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet
- Config: config/void-mainnet-bootstrap-mainnet.live.json
- Mode: we run "plan" now (no broadcast) and "run" only after full keys/plan/pillars OK and human sign-off.

---

## 2. Validator0 Identity (from live JSON)

From config/void-mainnet-bootstrap-mainnet.live.json:

- validator0.reward address (EOA or multisig that receives rewards):

  0xCD49f9AB33573d2067aE56c54D1D1eDF36c65855

- validator0.consensusKey (32-byte key used by the node for consensus/signing):

  0x67a0e5bb8887982681cd0fef8d35ec9a02fc74ac2224dd5fef0e97e101800540

- validator0.stakeVOID (raw units):

  1,000,000 VOID (1e6, 18-decimal token)

Interpretation:

- Validator0 is the genesis validator. It is expected to run the first production node(s) and keep the chain live while additional validators join.
- The reward address should be controlled via a safe setup (hardware wallet or multisig), not a random hot key.

---

## 3. Roles and Owners (for reference)

Roles in the live config (already validated via the keys pillar):

- deployer               = 0x7D493C395fC3636bEcac605f9CBc855b7fffE6f1
- treasuryAdmin          = 0x775289E8Ec2f4c4b5EFD71f9C218e464155c49a7
- opsTreasuryAdmin       = 0x6bd80926BF344d97f439883bA02DfCd50b1fEFdE
- validatorAdmin         = 0x0053Ad9B7D0FA0Ff8249B3CbA5b98011d96Fa4E2
- adminGateOwner         = 0x5F274dC9F8192e2D62395FA20733605C2A7cB630
- updateGateOwner        = 0x5F274dC9F8192e2D62395FA20733605C2A7cB630
- configGateOwner        = 0x811aBC026a731A556F14E14da6Cc57f20b740930
- treasuryOwner          = 0x775289E8Ec2f4c4b5EFD71f9C218e464155c49a7
- opsTreasuryOwner       = 0x6bd80926BF344d97f439883bA02DfCd50b1fEFdE
- rewardEngineOwner      = 0x775289E8Ec2f4c4b5EFD71f9C218e464155c49a7
- validatorSetOwner      = 0x0053Ad9B7D0FA0Ff8249B3CbA5b98011d96Fa4E2

Validator0 is not a special god key; it is just the first entry in ValidatorSet with:

- reward       = the address above
- stake        = 1,000,000 VOID
- consensusKey = the 32-byte key above

---

## 4. Genesis Flow (Validator0 part)

During the real run() mainnet bootstrap (not the stub we are using now), the relevant high-level steps for validator0 are:

1. Premine into VoidTreasury

   - Deploy VoidToken and emissions machinery.
   - Deploy VoidTreasury and OpsTreasury.
   - Move the entire premine into VoidTreasury.
   - Premine key is retired (zero balance, cold storage only for historical proof).

2. Deploy governance and validator stack

   - Deploy AdminGate (master key on LUKS or hardware).
   - Deploy ConfigGate, wired to AdminGate.
   - Deploy ValidatorSet (owner = validatorSetOwner).
   - Deploy RewardEngine wired to:
     - VoidToken (emissions and payouts).
     - ValidatorSet (who gets paid).
     - Emissions controller.

3. Register validator0

   - Fund VoidTreasury and/or RewardEngine with enough VOID to cover early emissions.
   - Call into ValidatorSet to register validator0:
     - reward       = validator0.reward
     - consensusKey = validator0.consensusKey
     - stake        = validator0.stakeVOID (1,000,000 VOID)
   - Confirm on-chain that:
     - Validator0 is ACTIVE.
     - Stake is locked.
     - Emissions and rewards routing is correct.

4. Start mainnet nodes

   - Bring up validator0 node(s) using the consensus key above.
   - Node connects to VOID mainnet and begins proposing and validating blocks.
   - Monitoring (Prometheus) tracks:
     - Head growth.
     - Validator participation.
     - Emission and rewards health.

---

## 5. Early Economics for Validator0 (v1 sketch)

This is the bootstrap view; it can be refined later via AdminGate and UpdateGate.

- Stake: 1,000,000 VOID locked in ValidatorSet for validator0.
- Premine is in VoidTreasury, not on the validator key.
- Validator0 earns:
  - A share of emissions via RewardEngine, based on stake and validator set weights.
  - Any direct rewards configured for early validators (if we add them later).

Targets (tunable later):

- Initial validator APR target range: 5 to 15 percent on staked VOID, depending on total staked supply and emission rate.
- We expect additional validators to join and dilute validator0 share over time; validator0's job is to keep the chain alive and healthy at launch, not to permanently dominate.

---

## 6. Path for Additional Validators (post-launch)

After mainnet launch, new validators should be able to:

1. Acquire VOID (from the market or treasury programs).
2. Lock stake into ValidatorSet via a join or registerValidator flow.
3. Run a VOID node with their own consensus key.
4. Earn emissions via RewardEngine proportional to stake and uptime.

The exact join and exit scripts and UI (Obelisk Wallet and VOID dashboards) will be specified separately, but this document is the ground truth reference for validator0 at genesis.

---

## 7. Status and Coupling

This document is tied to:

- config/void-mainnet-bootstrap-mainnet.live.json
- script/VoidMainnetBootstrapMainnet.s.sol
- Validators pillar health scripts in ops/

If we ever change any of the following in the live JSON:

- validator0.reward
- validator0.consensusKey
- validator0.stakeVOID

then we must update this document and re-run:

- sudo ops/void-mainnet-validators-health.sh
- ./ops/void-mainnet-planning-health-all-v2.sh

