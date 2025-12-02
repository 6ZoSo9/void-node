# VOID Mainnet Bootstrap – Dev PLAN Rehearsal (Anvil, chainId 2050)

## Environment

- Repo: ~/dev/void-node
- Branch: feat/mainnet-core-20251120
- RPC URL: http://127.0.0.1:8545
- Chain ID: 2050 (anvil)
- Script: script/VoidMainnetBootstrapDevPlan.s.sol:VoidMainnetBootstrapDevPlan
- Config (PLAN JSON): config/void-mainnet-bootstrap-dev.plan.json
- Deployer (dev only):
  - VOID_DEV_DEPLOYER_KEY = anvil[0] private key
  - env deployer address  = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

## PLAN roles (metadata from JSON)

From config/void-mainnet-bootstrap-dev.plan.json:

- chainId (config): 2050

Core roles:

- deployer          : 0x1000000000000000000000000000000000000001
- treasuryAdmin     : 0x2000000000000000000000000000000000000002
- opsTreasuryAdmin  : 0x3000000000000000000000000000000000000003
- validatorAdmin    : 0x4000000000000000000000000000000000000004
- adminGateOwner    : 0x5000000000000000000000000000000000000005
- updateGateOwner   : 0x5000000000000000000000000000000000000005
- configGateOwner   : 0x6000000000000000000000000000000000000006
- treasuryOwner     : 0x7000000000000000000000000000000000000007
- opsTreasuryOwner  : 0x8000000000000000000000000000000000000008
- rewardEngineOwner : 0x9000000000000000000000000000000000000009
- validatorSetOwner : 0xA00000000000000000000000000000000000000A

Validator0 (dev placeholder, metadata only):

- reward address    : 0xB00000000000000000000000000000000000000B
- consensusKey      : 0x1111111111111111111111111111111111111111111111111111111111111111
- stakeVOID         : 1_000_000

Note: in the dev PLAN rehearsal, these are metadata only. Signing is done with the env deployer key.

## Command used (dev PLAN bootstrap)

Environment:

- export VOID_DEV_DEPLOYER_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Command:

- forge script script/VoidMainnetBootstrapDevPlan.s.sol:VoidMainnetBootstrapDevPlan \
    --rpc-url http://127.0.0.1:8545 \
    --broadcast \
    --sig "run(string)" config/void-mainnet-bootstrap-dev.plan.json \
    -vvvv

## Deployed contracts (chainId 2050)

VoidMainnetBootstrapDevPlan deployed the following on the dev chain:

- VoidToken             : 0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6
- OpsTreasury           : 0x8A791620dd6260079BF849Dc5567aDC3F2FdC318
- VoidTreasury          : 0x610178dA211FEF7D417bC0e6FeD39F05609AD788
- AdminGate             : 0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0
- ConfigGate            : 0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82
- ValidatorSet          : 0x9A676e781A523b5d0C0e43731313A708CB607508
- VoidEmissionsController: 0x0B306BF915C4d645ff596e518fAf3F9669b97016
- RewardEngine          : 0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1

High-level flow:

1. Deploy VoidToken with:
   - MAX_SUPPLY  = 666,666,666 * 1e18
   - PREMINE     = 333,333,333 * 1e18
   - Owner       = env deployer
   - Initial premine balance on env deployer.

2. Deploy OpsTreasury and VoidTreasury:
   - VoidTreasury.token       = VoidToken
   - VoidTreasury.admin       = treasuryAdmin (from PLAN)
   - VoidTreasury.opsTreasury = OpsTreasury
   - OpsTreasury.admin        = opsTreasuryAdmin (from PLAN)
   - OpsTreasury.token        = VoidToken

3. Move full premine into VoidTreasury:
   - balance[premineRecipient] = 0
   - balance[VoidTreasury]     = 333,333,333 * 1e18

4. Deploy AdminGate and ConfigGate:
   - AdminGate.chainId    = 2050
   - AdminGate.masterKey  = adminGateOwner (from PLAN)
   - AdminGate.updateGate = 0 (unset in dev rehearsal)
   - ConfigGate.chainId   = 2050
   - ConfigGate.adminGate = AdminGate

5. Deploy ValidatorSet:
   - ValidatorSet.admin   = validatorAdmin (from PLAN)
   - totalPower()         = 0 (no validators seeded yet in this rehearsal)

6. Deploy emissions and rewards:
   - VoidEmissionsController.admin        = rewardEngineOwner (from PLAN)
   - VoidEmissionsController.EMISSIONS_BUDGET = 333,333,333 * 1e18
   - RewardEngine.admin                   = rewardEngineOwner (from PLAN)
   - RewardEngine.EMISSIONS_BUDGET        = 333,333,333 * 1e18

## Sanity checks (cast)

After the script, we ran a sanity script (RPC = http://127.0.0.1:8545):

- chainId = 2050

VoidToken:

- MAX_SUPPLY      = 666,666,666e18
- PREMINE         = 333,333,333e18
- totalSupply     = 333,333,333e18
- balanceOf(VoidTreasury) = 333,333,333e18

VoidTreasury:

- admin           = 0x2000000000000000000000000000000000000002
- opsTreasury     = 0x8A791620dd6260079BF849Dc5567aDC3F2FdC318
- token           = 0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6

OpsTreasury:

- admin           = 0x3000000000000000000000000000000000000003
- token           = 0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6

AdminGate / ConfigGate:

- AdminGate.chainId     = 2050
- AdminGate.masterKey   = 0x5000000000000000000000000000000000000005
- AdminGate.updateGate  = 0x0000000000000000000000000000000000000000
- ConfigGate.chainId    = 2050
- ConfigGate.adminGate  = 0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0

ValidatorSet:

- admin                 = 0x4000000000000000000000000000000000000004
- totalPower            = 0

Emissions / RewardEngine:

- EmissionsController.admin        = 0x9000000000000000000000000000000000000009
- EmissionsController.EMISSIONS_BUDGET = 333,333,333e18
- RewardEngine.admin               = 0x9000000000000000000000000000000000000009
- RewardEngine.EMISSIONS_BUDGET    = 333,333,333e18

## Conclusions

- Premine and MAX_SUPPLY match the tokenomics spec.
- 100% of the premine is held by VoidTreasury (cold), not by the deployer.
- VoidTreasury and OpsTreasury are wired correctly with the right admins and token address.
- AdminGate and ConfigGate are deployed on chainId 2050 with the correct MasterKey and linkage.
- ValidatorSet exists and is controlled by validatorAdmin but has no voting power yet (no validators seeded).
- Emissions and RewardEngine share the same emissions budget and admin and are wired correctly.

This dev PLAN rehearsal proves:

1. The PLAN JSON shape is correct and parses cleanly.
2. The bootstrap script can deploy the full core VOID mainnet stack on a dev chain.
3. The premine → VoidTreasury path is enforced on-chain as designed.

This doc is the canonical log for the first successful VOID mainnet dev PLAN bootstrap on anvil (chainId 2050).

## Sanity checks: dev bootstrap plan

After you’ve run the dev bootstrap plan script against Anvil-2050 (chainId 2050) and have your contracts deployed, run this sanity hammer:

    cd "$HOME/dev/void-node"
    ./ops/void-dev-plan-sanity.sh

This script currently verifies that:

- The RPC chainId is `2050`.
- There is non-empty bytecode at:
  - `VoidToken` (TOKEN)
  - `VoidTreasury`
  - `OpsTreasury`
  - `AdminGate`
- The token shape matches the expected VOID configuration:
  - `name()       == "VoidStones"`
  - `symbol()     == "VOID"`
  - `decimals()   == 18`
- `VoidTreasury` has a non-zero VOID balance (premine funded).
- `OpsTreasury` is **allowed to be zero in DEV**; if it’s zero, the script logs a warning.
  - If you want to enforce a non-zero ops balance in a particular dev run, you can set:

        REQUIRE_OPS_NONZERO=1 ./ops/void-dev-plan-sanity.sh

If the script exits with:

    === [dev-plan sanity] ALL CHECKS PASSED ===

your dev bootstrap rehearsal is wired correctly at this level. If it fails, fix the reported issue (wrong RPC, wrong address, missing code, bad balances) and rerun until it passes.
