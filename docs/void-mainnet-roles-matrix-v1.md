# VOID Mainnet Roles & Keys Matrix — v1

**Status (2025-11-28)**  
- Chain: VOID Mainnet (chainId 2050).  
- Bootstrap path: `VoidMainnetBootstrapMainnet.s.sol` using `config/void-mainnet-bootstrap-mainnet.live.json`.  
- This doc defines **who holds which key**, and how that maps into the JSON fields.  
- This is **policy** and **structure** only — no real addresses are written here.

---

## 1. JSON fields overview

From `config/void-mainnet-bootstrap-mainnet.live.json` we have:

### 1.1 Roles section

Expected fields:

- `.roles.deployer`
- `.roles.treasuryAdmin`
- `.roles.opsTreasuryAdmin`
- `.roles.validatorAdmin`
- `.roles.adminGateOwner`
- `.roles.updateGateOwner`
- `.roles.configGateOwner`
- `.roles.treasuryOwner`
- `.roles.opsTreasuryOwner`
- `.roles.rewardEngineOwner`
- `.roles.validatorSetOwner`

Each of these MUST be a **checksummed EOA address** on chainId 2050.

### 1.2 Contracts section

Expected fields:

- `.contracts.updateGate`
- `.contracts.adminGate`
- `.contracts.configGate`
- `.contracts.validatorSet`
- `.contracts.voidToken`
- `.contracts.voidTreasury`
- `.contracts.opsTreasury`
- `.contracts.rewardEngine`

These are either:

1. `0x0000...0000` while we are planning only, or  
2. Real deployed addresses once we have a final mainnet bootstrap plan.

### 1.3 Validator section (bootstrap validator set)

Expected fields (for validator index 0, more later):

- `.validator0.reward`       — address receiving rewards.
- `.validator0.consensusKey` — consensus pubkey / bytes32 or similar.
- `.validator0.stakeVOID`    — human-readable amount, will later be parsed to uint.

The bootstrap PLAN script currently reads `.validator0.reward` and `.validator0.consensusKey` and logs that
`.validator0.stakeVOID` is still TODO for numeric parsing.

---

## 2. Key classes

We formalize **three** main key classes:

1. **HOT key**
   - Lives on: online box (LUKS encrypted disk, minimal exposure).
   - Usage: sending limited operational txs where compromise is survivable.
   - Expectation: can be rotated by UpdateGate / AdminGate processes.
   - Example use: deployer for *initial* contracts; short-lived ops.

2. **COLD key**
   - Lives on: hardware wallet / offline machine.
   - Usage: long-term control of high-value assets or governance.
   - Expectation: extremely slow to use, multi-person ceremony where possible.

3. **MULTI-SIG key (logical)**
   - Implemented as: on-chain multi-sig or M-of-N UpdateGate/AdminGate-managed logic.
   - Usage: modifying core chain parameters, code upgrades, emergency actions.
   - Expectation: cannot be used by a single human in isolation.

For the first VOID mainnet epoch, we treat some roles as “logically multi-sig” even if the actual arrangement
is “one hardware wallet plus strong procedural rules”. That MUST be upgraded to real multi-sig when feasible.

---

## 3. Roles matrix (high level)

### 3.1 Table

| JSON field                    | Class       | Description                                                                 | Notes                                                                                 |
|------------------------------|------------|-----------------------------------------------------------------------------|---------------------------------------------------------------------------------------|
| `.roles.deployer`            | HOT        | Short-lived deployer used during bootstrap script execution only.          | Can be on the anvil/mainnet-bridge box for plan+bootstrap; rotated/burned afterwards. |
| `.roles.treasuryAdmin`       | COLD/HOT   | Admin that can configure Treasury behavior (policies/flows).               | Prefer COLD; if HOT used, it must be very limited and upgradable via AdminGate.       |
| `.roles.opsTreasuryAdmin`    | HOT        | Day-to-day spending controller for OpsTreasury.                            | HOT key but under strict budget + monitoring; refill controlled by TreasuryOwner.     |
| `.roles.validatorAdmin`      | COLD       | Manages ValidatorSet (add/remove/rotate validators).                       | COLD or MULTI-SIG; validator changes are safety-critical.                             |
| `.roles.adminGateOwner`      | COLD/MULTI | Owner of AdminGate contract.                                               | Controls administrative rights; MUST eventually be multi-sig.                         |
| `.roles.updateGateOwner`     | COLD/MULTI | Owner of UpdateGate contract.                                              | Controls core upgrade rights; **highest security**.                                   |
| `.roles.configGateOwner`     | COLD/MULTI | Owner of ConfigGate.                                                       | Controls configuration knobs; multi-sig strongly preferred.                           |
| `.roles.treasuryOwner`       | COLD/MULTI | Ultimate owner of VoidTreasury.                                            | Controls premine; MUST be strongly gated and well-audited.                            |
| `.roles.opsTreasuryOwner`    | COLD/MULTI | Can replace OpsTreasuryAdmin and reconfigure OpsTreasury.                  | Long-term safeguard over ops spending.                                                |
| `.roles.rewardEngineOwner`   | COLD/MULTI | Controls RewardEngine parameters and emissions switches.                   | Can break incentives if misused; multi-sig recommended.                               |
| `.roles.validatorSetOwner`   | COLD/MULTI | Ultimate owner for ValidatorSet contract.                                  | Can overhaul validator set; strongly gated.                                           |

For validators:

| JSON field                    | Class | Description                                              | Notes                                                             |
|------------------------------|-------|----------------------------------------------------------|-------------------------------------------------------------------|
| `.validator0.reward`         | COLD  | Payout address for validator0 rewards.                   | Prefer hardware wallet; no dApps, no random DeFi, payout only.    |
| `.validator0.consensusKey`   | N/A   | Consensus pubkey; stored as bytes32 or similar.          | Derived from validator node keys; not used like a normal wallet.  |
| `.validator0.stakeVOID`      | N/A   | Stake amount (to be parsed); not a key.                  | Will be bound by RewardEngine/tokenomics constraints.             |

---

## 4. Suggested assignment strategy (no actual addresses)

This section is a **strategy**, not a concrete mapping.

### 4.1 Deployer

- `.roles.deployer`
  - Use a HOT key specific to bootstrap.
  - Stored on the machine that runs the mainnet bootstrap script.
  - Once bootstrap finishes:
    - Revoke any permissions it has.
    - Ensure no long-lived admin functions remain attached to this key.
    - Optionally move any remaining balance out and treat it as burned.

### 4.2 Gates (AdminGate, UpdateGate, ConfigGate)

- `.roles.adminGateOwner`, `.roles.updateGateOwner`, `.roles.configGateOwner`
  - All three should be hardware-wallet controlled from the beginning.
  - **UpdateGateOwner** is the most critical:
    - This key effectively controls the ability to change CORE behavior.
    - For v1: at worst a single hardware wallet with strict physical handling.
    - Target future milestone: M-of-N multi-sig on chain.

- `.contracts.adminGate`, `.contracts.updateGate`, `.contracts.configGate`
  - For PLAN v1: `0x000...0`.
  - For real mainnet: these addresses MUST be:
    - Calculated/recorded from the actual deployment txs.
    - Frozen into the `.live.json` config or derived deterministically from it.

### 4.3 Treasury / OpsTreasury / RewardEngine

- `.roles.treasuryOwner`
  - Controls the premine pot in VoidTreasury.
  - Must be a COLD or MULTI-SIG key with well defined ceremony to use.

- `.roles.treasuryAdmin`
  - Key that can configure Treasury flows (e.g., allocate to OpsTreasury, RewardEngine, etc.).
  - Could be a COLD key that is only brought online for parameter changes, not for frequent spends.

- `.roles.opsTreasuryOwner`
  - Can replace OpsTreasuryAdmin if compromised or misbehaving.
  - Should not be the same as OpsTreasuryAdmin; think of it as a governor.

- `.roles.opsTreasuryAdmin`
  - Key that authorizes day-to-day ops spending (in conjunction with on-chain policies).
  - HOT, but:
    - restricted budgets,
    - strict monitoring via Prometheus (Ops spend rates, etc.),
    - rotation plan via OpsTreasuryOwner + UpdateGate/AdminGate.

- `.roles.rewardEngineOwner`
  - Controls emissions settings and reward schedules.
  - COLD/MULTI-SIG, because any misconfiguration here can destroy network trust.

- `.contracts.voidTreasury`, `.contracts.opsTreasury`, `.contracts.rewardEngine`, `.contracts.voidToken`
  - For PLAN v1: all zero.
  - For real mainnet: addresses must match the bootstrap script’s actual deployment results.

### 4.4 ValidatorSet & validator0

- `.roles.validatorAdmin` / `.roles.validatorSetOwner`
  - Two layers:
    - `validatorAdmin` — day-to-day: adding/removing/adjusting validators.
    - `validatorSetOwner` — ultimate override/“root of trust”.
  - Both should be COLD or MULTI-SIG; never HOT-only long term.

- `.validator0.reward`
  - COLD payout wallet for the first validator (likely yours).
  - Stored on hardware; used to periodically move rewards.

- `.validator0.consensusKey`
  - Derived from validator node keys (on your VOID node).
  - Should not be reused as a normal wallet anywhere else.

- `.validator0.stakeVOID`
  - Must be decided based on:
    - RewardEngine’s era emissions.
    - Desired security assumptions.
    - How many validators we want at bootstrap vs later expansion.

---

## 5. Mapping to physical storage (high level)

### 5.1 LUKS / sentinel USB

- Certain HOT keys may still live on a machine with:
  - Full-disk encryption.
  - A “sentinel USB” key that must be present to unlock.
- This doc assumes:
  - Deployer HOT key can live on such a box.
  - Some lower-risk admin keys might too, with careful monitoring.

### 5.2 Hardware wallets

- All COLD and MULTI-SIG roles should be backed by:
  - Hardware wallets (multiple, if multi-sig).
  - Offline backups of seed phrases stored in secure physical locations.
- Keys for `UpdateGateOwner` and `TreasuryOwner` are **the most critical** and must have:
  - Multi-person access requirements.
  - Clear operational runbooks for “who can sign what and when”.

---

## 6. How this ties back into the PLAN scripts

- `ops/void-mainnet-bootstrap-plan.sh`:
  - Reads `.live.json`, parses all `.roles.*` and `.contracts.*` fields.
  - Logs them and currently reverts as a stub.

- `ops/void-mainnet-bootstrap-plan-health.sh`:
  - Runs the plan script and encodes `PLAN_OK`, `CHAIN_ID`, `VALIDATORS`, `CONFIG_SHA` into Prometheus.

- `ops/void-mainnet-bootstrap-plan-exporter.sh`:
  - Pushes `void_mainnet_bootstrap_plan_ready` and related metrics into node_exporter.

**This doc is the human-readable mirror of that config:**
- When we finally write real addresses into `void-mainnet-bootstrap-mainnet.live.json`, each address MUST
  have a story anchored in this roles matrix (who holds it, where, with what ceremony).

---

## 7. Future revisions

Once we:

1. Lock real roles for mainnet,  
2. Decide on validator0 stake and additional validators, and  
3. Finalize UpdateGate/AdminGate/ConfigGate deployment flows,

we should:

- Create `docs/void-mainnet-roles-matrix-v2.md` with:
  - More precise assignments (still no raw addresses in the repo).
  - Links to separate, offline key materials and ceremonies.
- Tag a new checkpoint, and wire PLAN_OK to 1 as part of the mainnet gating story.

