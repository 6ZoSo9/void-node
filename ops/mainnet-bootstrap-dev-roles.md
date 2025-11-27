# VOID Mainnet Dev Bootstrap — Dev Simulation (anvil, chainId 2050)

Script: `script/VoidMainnetBootstrapDev.s.sol`  
Mode:   `forge script ... --rpc-url http://127.0.0.1:8547 --chain 2050 --dry-run`  
Tag:    `ckpt-mainnet-bootstrap-dev-sim-20251127-053412`

This document captures the *DEV-SIM* wiring only.  
Mainnet will use fresh, never-used keys and a separate bootstrap plan.

---

## 1. Role addresses (dev-sim)

| Role                | Address                                       | Notes                                      |
|---------------------|-----------------------------------------------|--------------------------------------------|
| deployer            | `0x000000000000000000000000000000000000D00d` | EOA running the script                     |
| masterKey           | `0x00000000000000000000000000000000000A11cE` | AdminGate master key                       |
| configAdmin         | `0x00000000000000000000000000000000000A11cE` | ConfigGate admin (via AdminGate)          |
| validatorAdmin      | `0x000000000000000000000000000000000000bEEF` | ValidatorSet admin                         |
| emissionsAdmin      | `0x000000000000000000000000000000000000bEEF` | Emissions controller admin                 |
| rewardsAdmin        | `0x000000000000000000000000000000000000bEEF` | RewardEngine admin                         |
| voidOwner           | `0x000000000000000000000000000000000000D00d` | Initial VoidToken owner                    |
| founderBeneficiary  | `0x000000000000000000000000000000000000F00D` | Founder allocation target                  |
| ecosystemReserve    | `0x000000000000000000000000000000000000e550` | Long-term ecosystem pool                   |
| communityPool       | `0x000000000000000000000000000000000000C001` | Community pool                              |
| voidTreasuryAdmin   | `0x000000000000000000000000000000000000dEaD` | VoidTreasury admin (burn-style dev addr)  |
| opsTreasuryAdmin    | `0x0000000000000000000000000000000000C0FFEE` | OpsTreasury admin                          |
| opsSpender          | `0x000000000000000000000000000000000000cafE` | Hot spender for ops funds                  |
| agentAdmin          | `0x0000000000000000000000000000000000a91317` | AgentRegistry / agent controls             |
| datasetAdmin        | `0x0000000000000000000000000000000000d47537` | DatasetRegistry admin                      |
| modelAdmin          | `0x00000000000000000000000000000000000AD031` | ModelRegistry admin                        |
| evalAdmin           | `0x00000000000000000000000000000000000e7a11` | EvalRegistry admin                         |
| jobQueueAdmin       | `0x0000000000000000000000000000000000fabB1e` | JobQueue admin                             |
| receiptsAdmin       | `0x0000000000000000000000000000000000f00bA4` | Receipts/coverage admin                    |

These values are **DEV ONLY**.  
Mainnet will replace each role with real keys (LUKS / hardware backed).

---

## 2. Core contracts (dev-sim addresses)

All contracts were deployed on anvil (chainId 2050) by `VoidMainnetBootstrapDev.s.sol`.

| Contract               | Address                                       | Notes                              |
|------------------------|-----------------------------------------------|------------------------------------|
| VoidToken              | `0xA6F12f7b68C6b86A3F951Ba5121145e5d3C6e2E3` | VOID ERC20 token                   |
| OpsTreasury            | `0xA0EfC8f59B1c474d6CD59Dc28211A6033fe12b47` | Ops treasury (opsSpender, admin)  |
| VoidTreasury           | `0xbDb94598124b4A524Dc85Bb5dCe6878459df8c0E` | Main premine treasury              |
| AdminGate              | `0x1a5Ba3763b57a6db1bf7af93dECdbfe2AbD59653` | Master/admin gate                  |
| ConfigGate             | `0x8988eF6c649a7c581Abe77D2071Bc784E3368569` | Config gate (points to AdminGate)  |
| ValidatorSet           | `0x9858d3c6081Ab26f0bf52238398BffC1F2c4c7a6` | Validator set / admin = bEEF      |
| VoidEmissionsController| `0x2dC7D6fFE49D504c5750C978c81849d56B5780e8` | Emissions controller               |
| RewardEngine           | `0xe14F22aFB374FC775850EB75892b47c2541FdB82` | Reward engine                      |

Source: forge script dev-sim logs and run-latest JSON under:
`broadcast/VoidMainnetBootstrapDev.s.sol/2050/dry-run/run-latest.json`

---

## 3. Tokenomics invariants (checked in dev-sim)

From the trace:

- `VoidToken.totalSupply()`  = `333333333000000000000000000`
- `VoidToken.PREMINE()`      = `333333333000000000000000000`
- `VoidEmissionsController.EMISSIONS_BUDGET()` = `333333333000000000000000000`
- `RewardEngine.EMISSIONS_BUDGET()`           = `333333333000000000000000000`

Interpretation (18 decimals):

- PREMINE        = **333,333,333 VOID**
- EMISSIONS_BUDGET = **333,333,333 VOID**

Matches the locked VOID tokenomics:

- `MAX_SUPPLY = 666,666,666 VOID`
- `PREMINE = 333,333,333 VOID` (all into VoidTreasury)
- `EMISSIONS = 333,333,333 VOID` over 100 years (4 eras)

---

## 4. Premine flow (dev-sim)

1. `VoidToken` mints `PREMINE` to `voidOwner = 0x...D00d`.
2. Script transfers **100%** of premine to `VoidTreasury`:

   - `VoidToken.transfer(VoidTreasury, 333333333e18)`
   - `balance[voidOwner]    = 0`
   - `balance[VoidTreasury] = 333333333e18`

In mainnet, this flow will be preserved, but:
- `voidOwner` will be a one-shot genesis key, then effectively retired.
- `VoidTreasury` will be controlled by contract-based governance (AdminGate/UpdateGate + multisig signers).

---

## 5. Governance wiring (dev-sim snapshot)

- `AdminGate.masterKey` = `0x00000000000000000000000000000000000A11cE`
- `ConfigGate.adminGate` = `AdminGate` (above)
- `ValidatorSet.admin`   = `0x000000000000000000000000000000000000bEEF`
- `VoidEmissionsController.admin` = `0x000000000000000000000000000000000000bEEF`
- `RewardEngine.admin`   = `0x000000000000000000000000000000000000bEEF`

These relationships (not the raw addresses) are what we will preserve on mainnet:

- One `masterKey` gate (AdminGate) that can update config/admins.
- Dedicated validator / emissions / rewards admin set.
- Treasury contracts holding premine and emissions budgets.

---

## 6. Notes for MAINNET bootstrap design

When we design `VoidMainnetBootstrapMainnet.s.sol`, we will:

- Replace all dev role addresses above with **fresh, never-used mainnet keys**.
- Ensure:
  - Premine goes into a **VoidTreasury** contract, not a hot EOA.
  - Ops spending flows via **OpsTreasury** and `opsSpender` hot wallets.
  - AdminGate/UpdateGate/ConfigGate enforce our master-key & upgrade policy.
- Store genesis keys (premine key, masterKey, treasury admins, validator admins)
  on **LUKS-encrypted USB / hardware wallets**, not in any online machine.

This file is the canonical record of the dev-sim wiring that the real mainnet plan must mirror structurally (but with different addresses).
