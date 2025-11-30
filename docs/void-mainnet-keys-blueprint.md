# VOID Mainnet Keys & Roles Blueprint

Status: DRAFT (pre-mainnet).  
Purpose: Define how we will eventually fill `config/void-mainnet-bootstrap-mainnet.live.json`
with real addresses and keys, without touching the live JSON until hardware wallets
and custody are ready.

---

## 1. Critical roles and contracts from the PLAN

From the PLAN summary and sim scripts, these are the fields that must be non-zero
for `void_mainnet_bootstrap_plan_health` to flip from 0 -> 1:

### Critical roles (must be real EOAs)

- `deployer`
- `treasuryAdmin`
- `opsTreasuryAdmin`
- `validatorAdmin`

Other owner roles already use sentinel non-zero addresses in the live JSON:

- `adminGateOwner`      → 0x1111...1111
- `updateGateOwner`     → 0x2222...2222
- `configGateOwner`     → 0x3333...3333
- `treasuryOwner`       → 0x4444...4444
- `opsTreasuryOwner`    → 0x5555...5555
- `rewardEngineOwner`   → 0x6666...6666
- `validatorSetOwner`   → 0x7777...7777

These sentinels will be replaced with real addresses when mainnet keys are finalized.

### Critical contracts (must be deployed and wired)

All of these are currently 0x0 in the `.live.json`:

- `voidToken`
- `premineVault`
- `treasury`
- `voidTreasury`
- `opsTreasury`
- `rewardEngine`

These addresses will only be known after we run the real mainnet bootstrap script
with the final `deployer` address.

### Validator0

For validator0, the PLAN scripts expect:

- `reward`       → non-zero reward address (EOA)
- `consensusKey` → non-zero bytes32 consensus key
- `stakeVOID`    → the initial stake amount

Right now the live JSON uses placeholder values.

---

## 2. Wallet buckets (conceptual)

We group the real-world keys into buckets. Each bucket should usually map to a hardware wallet
(or a multisig controlled by hardware wallets).

1. **Premine / Treasury Master (Vault-A)**  
   - Cold storage, maximum isolation.  
   - Controls the premine (333,333,333 VOID) held via `VoidTreasury` and/or `premineVault`.  
   - Used rarely (multi-year cadence).

2. **Ops Treasury Wallet (Vault-B)**  
   - Separate hardware wallet from Vault-A.  
   - Controls `OpsTreasury` and funds operations (dev, infra, grants, etc.).  
   - Used more frequently, but always via hardware wallet.

3. **Protocol Governance Wallet (Gate-Admin)**  
   - Controls the governance gates: `AdminGate`, `UpdateGate`, and `ConfigGate`
     (either directly or via multisig).  
   - Has ultimate authority over core protocol changes after v99.  
   - Must be tightly guarded and never used as a general hot wallet.

4. **Validator Admin Wallet**  
   - Controls `ValidatorSet` admin functions (adding/removing validators, updating
     validator parameters).  
   - Operational, but still hardware-wallet-only.

5. **Bootstrap Deployer Wallet**  
   - One-time-use wallet for mainnet bootstrap.  
   - Runs the `VoidMainnetBootstrapMainnet` script on real mainnet.  
   - After bootstrap completes, this wallet should have no remaining special
     powers over core contracts (and ideally be effectively retired).

6. **Validator Reward Wallet(s)**  
   - Per-validator reward addresses (e.g. Obelisk Titan / heavy validator wallets).  
   - These receive staking rewards, but do not control governance.

---

## 3. Mapping wallet buckets to PLAN roles

This section defines how the conceptual buckets should map to the roles in
`void-mainnet-bootstrap-mainnet.live.json`.

### 3.1 Deployer and admins

- `deployer`
  - **Bucket**: Bootstrap Deployer Wallet
  - **Notes**: EOA on a hardware wallet used only for mainnet bootstrap.
    After deployment, this address should not retain admin permissions that
    can modify core contracts.

- `treasuryAdmin`
  - **Bucket**: Premine / Treasury Master (Vault-A)
  - **Notes**: Admin for `VoidTreasury` and premine vault relationships.
    Moves funds from premine into treasury contracts according to the long-term
    emission and governance plan.

- `opsTreasuryAdmin`
  - **Bucket**: Ops Treasury Wallet (Vault-B)
  - **Notes**: Controls `OpsTreasury` admin functions (configuration, emergency
    controls, etc.).

- `validatorAdmin`
  - **Bucket**: Validator Admin Wallet
  - **Notes**: Controls validator set changes: adding/removing validators,
    updating validator parameters, etc.

### 3.2 Gate owners and treasury owners

- `adminGateOwner`
  - **Bucket**: Protocol Governance Wallet (Gate-Admin), or a dedicated multisig.  
  - **Notes**: Owns `AdminGate`, which can gate access to critical admin functions.

- `updateGateOwner`
  - **Bucket**: Usually the same Gate-Admin bucket as above, or a related multisig.  
  - **Notes**: Owns `UpdateGate`, which controls upgrade paths for core contracts.

- `configGateOwner`
  - **Bucket**: Gate-Admin or a separate configuration-focused multisig.  
  - **Notes**: Owns `ConfigGate` for configuration changes that do not require
    full protocol upgrade authority.

- `treasuryOwner`
  - **Bucket**: Premine / Treasury Master (Vault-A) or a Treasury multisig.  
  - **Notes**: Owns the core Treasury contract(s) controlling the premine.

- `opsTreasuryOwner`
  - **Bucket**: Ops Treasury Wallet (Vault-B) or an Ops multisig.  
  - **Notes**: Owns the OpsTreasury contract used for operational spending.

- `rewardEngineOwner`
  - **Bucket**: Gate-Admin or a dedicated “emissions” multisig.  
  - **Notes**: Owns `RewardEngine` to adjust reward parameters or upgrade logic
    under strict conditions.

- `validatorSetOwner`
  - **Bucket**: Validator Admin Wallet or a validator-admin multisig.  
  - **Notes**: Owns `ValidatorSet` contract for structural changes to the validator set.

---

## 4. Contract addresses in the live JSON

When mainnet bootstrap happens, the `VoidMainnetBootstrapMainnet` script will deploy:

- `VoidToken` (VOID ERC-20)
- `PremineVault` (if used as a separate premine holder)
- `VoidTreasury` (treasury for the premine)
- `OpsTreasury` (operational treasury)
- `RewardEngine` (handles reward distribution logic)
- `ValidatorSet` and gate contracts (`AdminGate`, `UpdateGate`, `ConfigGate`)

After deployment, the mainnet bootstrap process must:

1. Capture each deployed contract address.
2. Write those addresses into `config/void-mainnet-bootstrap-mainnet.live.json`:
   - `.contracts.voidToken`
   - `.contracts.premineVault`
   - `.contracts.treasury`
   - `.contracts.voidTreasury`
   - `.contracts.opsTreasury`
   - `.contracts.rewardEngine`
3. Re-run the PLAN scripts:
   - `ops/void-mainnet-bootstrap-mainnet-plan-smoke.sh`
   - `ops/void-mainnet-bootstrap-plan-sim.sh`
   - `ops/void-mainnet-bootstrap-plan-rehearsal.sh`
   - `ops/void-mainnet-bootstrap-plan-health-all.sh`

Only when the PLAN scripts and exporter report health=1 should we consider the
bootstrap plan “ready” in Prometheus and the SLOs.

---

## 5. Validator0 mapping

For the initial validator (`validator0` in the live JSON):

- `validator0.reward`
  - Must be a real reward EOA (e.g. an Obelisk Titan or other validator wallet).
  - This is where validator rewards will flow.

- `validator0.consensusKey`
  - Must be a real consensus key, encoded as bytes32, matching the consensus layer’s
    expectations (e.g. BLS or ed25519).  
  - Care must be taken to ensure that the node(s) running the validator can actually
    use this key for consensus.

- `validator0.stakeVOID`
  - The initial stake amount for validator0, in raw VOID units.

Once these are set to real values, the PLAN scripts should treat `validator0`
as structurally valid (assuming all other invariants are also satisfied).

---

## 6. Policy: when to fill the live JSON

Until we have:

- Hardware wallets created and safely backed up,
- A clear decision for who controls each bucket (Vault-A, Vault-B, Gate-Admin,
  Validator Admin, Deployer, Validator Reward),
- A written operational plan for how and when each key will be used,

the `.live.json` should stay in its current “zeroed/placeholder” state with
plan_health=0.

The process to move from NOT_READY → READY should be:

1. Prepare hardware wallets and backups for each bucket.
2. Assign real addresses to the roles listed above (off-chain plan first).
3. Update `config/void-mainnet-bootstrap-mainnet.live.json` with real EOA
   addresses for roles (but still 0x0 for contracts).
4. Run PLAN scripts and Prometheus checks to ensure structural health is 1
   (roles non-zero, validator0 fields valid).
5. Only then plan the real mainnet broadcast step that will deploy contracts,
   fill contract addresses in the live JSON, and complete bootstrap.

