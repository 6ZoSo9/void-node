# VOID Mainnet — Bootstrap Plan (REAL mainnet)

This document describes how we will bootstrap REAL VOID mainnet
(chainId = 2050) using **fresh, never-used keys** and contract-based treasuries.

It is the canonical plan for:
- Key roles and storage (LUKS / hardware, hot vs cold).
- Contract wiring (VoidToken, VoidTreasury, OpsTreasury, AdminGate, ConfigGate, UpdateGate, ValidatorSet, RewardEngine, Emissions).
- The ordered sequence of bootstrap transactions.
- Safety rules: premine usage, authority, and future rotations.

NO REAL ADDRESSES ARE LISTED HERE.  
All address placeholders (ADDR_*) will be filled in **offline** once keys are generated.

We must mirror the structure of the dev simulation in:
- `ops/mainnet-bootstrap-dev-roles.md`  
but with different addresses and stronger key hygiene.

---

## 1. Tokenomics (locked)

VOID mainnet tokenomics are **locked** to:

- `MAX_SUPPLY` = **666,666,666 VOID**
- `PREMINE`    = **333,333,333 VOID**
- `EMISSIONS`  = **333,333,333 VOID** over 100 years
  - Era 1: 177,777,777 VOID (years 0–25)
  - Era 2:  88,888,889 VOID (years 25–50)
  - Era 3:  44,444,444 VOID (years 50–75)
  - Era 4:  22,222,223 VOID (years 75–100)

On-chain invariants:

- `VoidToken.totalSupply()    == MAX_SUPPLY`
- `VoidToken.PREMINE()        == PREMINE`
- `VoidEmissionsController.EMISSIONS_BUDGET() == EMISSIONS`
- `RewardEngine.EMISSIONS_BUDGET()           == EMISSIONS`
- At the end of bootstrap:
  - `balance[VoidTreasury] == PREMINE`
  - `balance[premineKey]   == 0`

---

## 2. Mainnet key roles (categories, NOT addresses)

We define key categories first; concrete addresses are filled in offline.

### 2.1 Cold / long-term keys (LUKS / hardware)

These MUST live on LUKS-encrypted USB and/or hardware wallets:

- `ADDR_PREMINE_KEY`  
  - One-shot key that receives premine at genesis (if needed).
  - After bootstrap, balance MUST be 0 and key is retired.

- `ADDR_MASTER_KEY`  
  - Master key for `AdminGate`.
  - Can update AdminGate configs and indirectly control many roles.
  - Stored on hardware wallet and LUKS USB; NEVER on a hot server.

- `ADDR_TREASURY_MULTISIG`  
  - Multisig controlling **VoidTreasury**.
  - Signers are cold/hardware wallets.

- `ADDR_OPS_MULTISIG`  
  - Multisig controlling **OpsTreasury**.
  - Mixed model: at least 1 cold signer; others may be warm but not fully hot.

- `ADDR_VALIDATORSET_ADMIN`  
  - Admin of `ValidatorSet` (can add/remove validators).
  - Could be same multisig as Treasury or separate.

- `ADDR_TOKENOMICS_ADMIN`  
  - Admin of RewardEngine / EmissionsController.
  - Could be a multisig or controlled via AdminGate.

### 2.2 Warm keys (can be online but guarded)

- `ADDR_CONFIG_ADMIN`  
  - Used via `ConfigGate` / `UpdateGate` for parameter changes.
  - Lives on a secure workstation, not on servers.

- `ADDR_AGENT_ADMIN`, `ADDR_MODEL_ADMIN`, `ADDR_DATASET_ADMIN`, `ADDR_JOBQUEUE_ADMIN`  
  - Admins for the AI registries and JobQueue.
  - Typically a multisig tied to project governance.

### 2.3 Hot keys (server-side, limited blast radius)

- `ADDR_OPS_SPENDER`  
  - Hot wallet used by OpsTreasury to spend controlled budgets.
  - Only limited allowance from OpsTreasury.
  - Can be rotated easily.

- `ADDR_VALIDATOR_HOT_KEYS[...]`  
  - Hot keys used by validators for signing blocks.
  - Funded by OpsTreasury with limited gas allowances.

---

## 3. Core contracts (intended structure)

These contracts will exist on mainnet with the following relationships:

- `VoidToken`
  - Owns the VOID ERC20 supply.
  - Mints `PREMINE` at genesis.
  - Controlled initially by `ADDR_PREMINE_KEY` or by a bootstrap script.

- `VoidTreasury`
  - Holds the **entire premine** after bootstrap.
  - Controlled by `ADDR_TREASURY_MULTISIG`.
  - Receives future protocol revenues.

- `OpsTreasury`
  - Holds funds destined for operations (infra, grants, etc.).
  - Controlled by `ADDR_OPS_MULTISIG`.
  - Grants allowances to `ADDR_OPS_SPENDER`.

- `AdminGate`
  - Enforces a global master/guardian key: `ADDR_MASTER_KEY`.
  - Can update admin sets for other system contracts (indirect control).

- `ConfigGate`
  - Exposes structured config changes.
  - Uses `AdminGate` to validate authorized config updates.

- `UpdateGate`
  - Governs protocol upgrades (new contract implementations, feature flags).
  - Authority flows from AdminGate → UpdateGate.

- `ValidatorSet`
  - Tracks validators and stakes.
  - Admin is `ADDR_VALIDATORSET_ADMIN` (via AdminGate / multisig).

- `VoidEmissionsController`
  - Manages emissions per era.
  - Admin is `ADDR_TOKENOMICS_ADMIN`.

- `RewardEngine`
  - Distributes emissions to validators / jobs based on rules.
  - Connected to ValidatorSet and JobQueue.

Optional/Phase 2 (may be deployed at bootstrap or shortly after):

- `JobQueue`
- `ModelRegistry`
- `DatasetRegistry`
- `AgentRegistry`
- `ReceiptRegistry` / `CoverageRegistry`

---

## 4. Bootstrap phases (REAL mainnet)

This describes the high-level sequence. Exact tx list will be encoded in
`script/VoidMainnetBootstrapMainnet.s.sol`.

### Phase 0 — Offline key generation and recording

1. On an **airgapped machine**, generate:
   - `ADDR_PREMINE_KEY`
   - `ADDR_MASTER_KEY`
   - `ADDR_TREASURY_MULTISIG` (multisig with N hardware signers)
   - `ADDR_OPS_MULTISIG`
   - `ADDR_VALIDATORSET_ADMIN`
   - `ADDR_TOKENOMICS_ADMIN`
   - Any other governance multisigs (agent/model/dataset/jobqueue).

2. Store seeds:
   - On LUKS-encrypted USB (primary).
   - On a second LUKS USB and/or multiple hardware wallets (backup).
   - Document derivation paths, but do NOT store raw mnemonics on online boxes.

3. Export **addresses only** into a JSON file:
   - `ops/mainnet-bootstrap-addresses.mainnet.json` (kept offline).
   - Later, copy addresses-only version to the build host.

### Phase 1 — Genesis specification

1. Construct the genesis manifest with:
   - ChainId = 2050 (VOID mainnet).
   - Genesis VOID allocations:
     - `PREMINE` → either:
       - directly to `VoidTreasury` (preferred), or
       - to `ADDR_PREMINE_KEY` with a mandatory immediate transfer.
   - Any initial validator(s) / stakes if required.

2. Bake invariants into Genesis and/or first blocks:
   - We must be able to prove after bootstrap:
     - `balance[VoidTreasury] == PREMINE`
     - `balance[ADDR_PREMINE_KEY] == 0`

### Phase 2 — Bootstrap transactions (block 1..N)

These are executed by the **bootstrap script** using the designated keys.

High-level sequence:

1. Deploy `VoidToken` (if not already part of genesis).
2. Deploy `VoidTreasury` and `OpsTreasury`.
3. Deploy `AdminGate`, `ConfigGate`, `UpdateGate`.
4. Deploy `ValidatorSet`, `VoidEmissionsController`, `RewardEngine`.
5. Deploy optional AI infra (JobQueue, ModelRegistry, DatasetRegistry, AgentRegistry, Receipts)  
   - This can be Phase 2b if we want to de-risk genesis.

6. Premine flows:
   - If `ADDR_PREMINE_KEY` received premine:
     - `VoidToken.transfer(VoidTreasury, PREMINE)`
     - Verify `balance[ADDR_PREMINE_KEY] == 0`.
   - Optionally send a **small, bounded amount** from VoidTreasury to OpsTreasury:
     - e.g. `OPS_BOOTSTRAP_ALLOCATION = X VOID`
     - Expect `balance[VoidTreasury] = PREMINE - X`.

7. Wire admins:
   - Set AdminGate masterKey = `ADDR_MASTER_KEY`.
   - Wire ConfigGate and UpdateGate to AdminGate.
   - Set ValidatorSet admin = `ADDR_VALIDATORSET_ADMIN` (via AdminGate).
   - Set Emissions/RewardEngine admin = `ADDR_TOKENOMICS_ADMIN` (via AdminGate).
   - Set Treasury/Ops admins = `ADDR_TREASURY_MULTISIG`, `ADDR_OPS_MULTISIG`.

8. Fund hot wallets:
   - From OpsTreasury, create allowances or transfers to `ADDR_OPS_SPENDER`.
   - Fund validator hot keys with minimal gas accounts.

### Phase 3 — Lockdown & verification

1. Remove any temporary powers from `ADDR_PREMINE_KEY`:
   - It MUST NOT be an admin of anything.
   - It MUST have 0 balance.

2. Confirm AdminGate and UpdateGate wiring:
   - `AdminGate.masterKey == ADDR_MASTER_KEY`.
   - `UpdateGate` governance points at the expected admin set (multisig).

3. Run bootstrap verification script:
   - Confirms:
     - All tokenomics invariants.
     - All admin roles match the addresses in the offline JSON.
     - All temporary test addresses from dev-sim are nowhere on-chain.

4. Store a final signed manifest:
   - `ops/mainnet-bootstrap-final.manifest.json`
   - Signed by at least:
     - 1 signer of Treasury multisig
     - 1 signer of UpdateGate/admin multisig

---

## 5. Implementation notes (`VoidMainnetBootstrapMainnet.s.sol`)

Later, we will implement:

- `script/VoidMainnetBootstrapMainnet.s.sol`
  - Reads addresses from a JSON or env config (addresses only, no keys).
  - Executes the sequence described above.
  - Emits detailed logs for each contract deployment and role wiring.

- Hard checks in the script:
  - Abort if any key address equals a known dev-sim address.
  - Abort if tokenomics constants do not match locked values.
  - Abort if post-bootstrap balances/role assignments do not match spec.

---

## 6. Operational rules (never break these)

1. **Dev keys are NEVER reused on mainnet.**
2. Premine key is used exactly once then retired.
3. Treasury is contract-based; no premine sitting in a hot EOA.
4. All upgrade/admin power flows through AdminGate/UpdateGate + multisigs.
5. Keys that can rug the chain MUST be cold (LUKS or hardware).
6. Any change to this plan must be:
   - Documented in a new versioned file, and
   - Tagged with a checkpoint.

This plan, plus `ops/mainnet-bootstrap-dev-roles.md`, is the reference
for designing and implementing the real mainnet bootstrap.
