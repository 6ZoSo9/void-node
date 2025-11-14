# VOID Network – Mainnet Bootstrap / Genesis Transactions (v1)

This document defines the **canonical sequence of on-chain actions** needed to
bootstrap VOID mainnet (chainId 2050) from genesis:

- Which contracts are deployed.
- In what order.
- With which constructor args.
- Which privileged calls are made by the **MasterKey** vs a hot **Deployer**.
- How we wire AdminGate / ConfigGate / ValidatorSet / core AI contracts
  so that the network can run indefinitely without the MasterKey online.

This is **not** consensus code, but all implementations must follow this plan.

---

## 0. Roles & addresses (placeholders)

These are logical roles; concrete addresses will be filled in later:

- `MASTER_KEY_EOA` – cold wallet (KEY2-style) that controls:
  - AdminGate.masterKey
  - ValidatorSet.masterKey
  - UpdateGate.masterKey
  - Agent/Model/Dataset registries masterKey
- `DEPLOYER_EOA` – hot key used *only* for:
  - Deploying contracts.
  - Initial wiring (where allowed by constructor or AdminGate).
- `PREMINE_VAULT` – multisig / cold wallet holding the 230,000,000 VOID premine.
- `FOUNDATION_OPS_1..N` – operational wallets that will run early validators.

During bootstrap, **only** MASTER_KEY_EOA and DEPLOYER_EOA should send txs.

---

## 1. Contracts to deploy (canonical set)

At mainnet boot we deploy at least:

1. `VoidToken` – capped ERC20:
   - `MAX_SUPPLY = 666,666,666 VOID`
   - `PREMINE   = 230,000,000 VOID`
   - Premine minted to `PREMINE_VAULT`.
2. `AdminGate` – master control plane:
   - Stores `masterKey`.
   - Maps system contract keys → addresses.
3. `ConfigGate` – chain configuration key/value store:
   - Ownable by `AdminGate`.
   - Stores params for gas, reward engine versions, feature flags, etc.
4. `ValidatorSet` – tracks validators, stakes, status:
   - Controlled by `masterKey` and later by staking logic.
5. `JobQueue` – on-chain AI job registry.
6. `AgentRegistry` – AI agents & capabilities.
7. `ModelRegistry` – AI models metadata & versions.
8. `DatasetRegistry` – datasets metadata & versions.
9. `UpdateGate` – protocol update manifest & signer set.
10. `ReceiptRegistry` – AI job receipts / proofs.

Each deployed address must be recorded into:

- `docs/VOID-MAINNET-BOOTSTRAP-ADDRESSES.json` (later),
- And injected into AdminGate / ConfigGate as described below.

---

## 2. Deployment order (high level)

Recommended sequence:

1. **VoidToken**
2. **AdminGate**
3. **ConfigGate**
4. **ValidatorSet**
5. **JobQueue**
6. **AgentRegistry**
7. **ModelRegistry**
8. **DatasetRegistry**
9. **UpdateGate**
10. **ReceiptRegistry**

Rationale: AdminGate + ConfigGate + ValidatorSet form the “governance + security”
base. AI stack + update machinery are wired on top.

---

## 3. Step-by-step bootstrap flow

### Step 3.1 – Deploy VoidToken

- Sender: `DEPLOYER_EOA`
- Action: `new VoidToken(...)` with constructor args matching:
  - Name: `"VoidStones"`
  - Symbol: `"VOID"`
  - Decimals: `18`
  - Cap / premine constants per `VoidToken` implementation.
- Postcondition:
  - `totalSupply() == 230,000,000 * 1e18`
  - All premine balance sits in `PREMINE_VAULT`.

This must respect the cap `666,666,666 * 1e18` and MUST NOT allow minting above.

### Step 3.2 – Deploy AdminGate

- Sender: `DEPLOYER_EOA`
- Action: `new AdminGate(chainId=2050, masterKey=MASTER_KEY_EOA, updateGate=address(0))`
- Postcondition:
  - `AdminGate.chainId() == 2050`
  - `AdminGate.masterKey() == MASTER_KEY_EOA`

At this point, only `MASTER_KEY_EOA` can call `onlyMasterKey` functions.

### Step 3.3 – Deploy ConfigGate

- Sender: `DEPLOYER_EOA`
- Action: `new ConfigGate(chainId=2050, adminGate=<AdminGate address>)`
- Postcondition:
  - `ConfigGate.chainId() == 2050`
  - `ConfigGate.adminGate() == AdminGate`

ConfigGate’s write methods are guarded by `onlyAdminGate`.

### Step 3.4 – Deploy ValidatorSet

- Sender: `DEPLOYER_EOA`
- Action: `new ValidatorSet(chainId=2050, masterKey=MASTER_KEY_EOA)`
- Postcondition:
  - `ValidatorSet.chainId() == 2050`
  - `ValidatorSet.masterKey() == MASTER_KEY_EOA`

No validators are active yet.

### Step 3.5 – Deploy AI stack contracts

Deploy with `DEPLOYER_EOA`:

- `JobQueue(chainId=2050, masterKey=MASTER_KEY_EOA)`
- `AgentRegistry(chainId=2050, masterKey=MASTER_KEY_EOA)`
- `ModelRegistry(chainId=2050, masterKey=MASTER_KEY_EOA)`
- `DatasetRegistry(chainId=2050, masterKey=MASTER_KEY_EOA)`
- `UpdateGate(chainId=2050, masterKey=MASTER_KEY_EOA)`
- `ReceiptRegistry(chainId=2050, masterKey=MASTER_KEY_EOA)`

All of them should:

- Expose `VERSION()` returning a constant.
- Store `masterKey` as `MASTER_KEY_EOA`.

### Step 3.6 – Wire system contracts via AdminGate

Now `MASTER_KEY_EOA` uses AdminGate to register canonical system contracts:

- Sender: `MASTER_KEY_EOA`
- Actions (examples, exact keys already defined in AdminGate):
  - `setSystemContract(keccak256("VOID_TOKEN"),      VoidToken)`
  - `setSystemContract(keccak256("ADMIN_GATE"),      AdminGate)`
  - `setSystemContract(keccak256("CONFIG_GATE"),     ConfigGate)`
  - `setSystemContract(keccak256("VALIDATOR_SET"),   ValidatorSet)`
  - `setSystemContract(keccak256("JOB_QUEUE"),       JobQueue)`
  - `setSystemContract(keccak256("AGENT_REGISTRY"),  AgentRegistry)`
  - `setSystemContract(keccak256("MODEL_REGISTRY"),  ModelRegistry)`
  - `setSystemContract(keccak256("DATASET_REGISTRY"),DatasetRegistry)`
  - `setSystemContract(keccak256("UPDATE_GATE"),     UpdateGate)`
  - `setSystemContract(keccak256("RECEIPT_REGISTRY"),ReceiptRegistry)`

Postcondition:

- All critical contracts are discoverable through AdminGate by key.

### Step 3.7 – Initialize ConfigGate (core params)

Using `AdminGate` as the only writer (i.e. calls originate from AdminGate):

Recommended entries:

- Chain meta:
  - `("CHAIN_ID",         2050)`
  - `("PROTOCOL_VERSION", 1)`
- Gas / block params (must match VOID-EVM-SPEC-V1):
  - `("BLOCK_GAS_LIMIT",  30_000_000)`
  - `("BLOCK_TARGET_TIME_SECONDS", 2)`
- Tokenomics hooks:
  - `("REWARD_ENGINE_VERSION",      1)`
  - `("REWARD_ENGINE_PARAMS_HASH",  <hash of VOID-EMISSIONS-PARAMS-V1.json>)`
  - `("EMISSIONS_SCHEDULE_DOC_HASH",<hash of VOID-EMISSIONS-SCHEDULE.md>)`
- Staking / validator params (should match VOID-VALIDATOR-SET-SPEC-V1):
  - `("MIN_SELF_STAKE_VOID",        <e.g. 10_000 * 1e18>)`
  - `("MAX_VALIDATORS",             <e.g. 256>)`

Node software (`void-node`) will read these via ConfigGate and enforce them in
consensus (reward engine, validator limits, etc).

### Step 3.8 – Seed initial validator set

- Sender: `MASTER_KEY_EOA`
- For each `FOUNDATION_OPS_i`:
  - Call `ValidatorSet.addValidator(FOUNDATION_OPS_i, stakeAmount, metadataURI)`.
  - Call `ValidatorSet.setActive(validatorId, true)`.

Constraints:

- Total initial stake should be enough to secure the chain.
- Validators should distribute across independent operators/hardware.

Later staking logic can allow new validators to join and old ones to exit, but
this initial set is **hard-anchored** in genesis history.

### Step 3.9 – Configure UpdateGate signers

- Sender: `MASTER_KEY_EOA`
- Actions:
  - Add M-of-N signers (e.g. 3–5 trusted keys) via UpdateGate admin methods.
  - Set initial `currentProtocolVersion` to `1`.
  - Optionally pre-register the genesis manifest hash.

VOID nodes will later:

- Query UpdateGate for the active manifest.
- Enforce protocol version upgrades via on-chain votes & activation heights.

---

## 4. Post-bootstrap invariants

After all steps:

1. **Ownership / control**
   - `MASTER_KEY_EOA` controls:
     - AdminGate.masterKey
     - ValidatorSet.masterKey
     - UpdateGate.masterKey
     - Agent/Model/Dataset registries masterKey.
   - ConfigGate is only writable via AdminGate.
2. **Discovery**
   - All core contract addresses are resolvable via AdminGate system keys.
3. **Tokenomics**
   - Total supply at height 0 = `230,000,000 VOID`.
   - Cap = `666,666,666 VOID`.
   - Reward engine in node software enforces that cumulative minted rewards
     never exceed `MAX_SUPPLY`.
4. **Validator set**
   - A non-empty set of active validators is registered in ValidatorSet.
   - Emissions + reward engine parameters match:
     - `docs/VOID-EMISSIONS-SCHEDULE.md`
     - `docs/VOID-EMISSIONS-PARAMS-V1.json`
     - `docs/VOID-VALIDATOR-REWARDS-V1.md`
5. **AI stack**
   - JobQueue / AgentRegistry / ModelRegistry / DatasetRegistry /
     ReceiptRegistry / UpdateGate are deployed and accessible via AdminGate.

---

## 5. Next steps

- Define `docs/VOID-MAINNET-BOOTSTRAP-ADDRESSES.json` format to store the actual
  deployed addresses for devnet / testnet / mainnet.
- Add a Foundry script (`script/DeployVoidCore.s.sol`) or a shell-based
  deployment helper in `ops/void-deploy-core.sh` that implements this plan for:
  - local anvil devnet,
  - later for public testnet,
  - finally for mainnet (with cold MASTER_KEY_EOA).

This file is v1 and will be updated as we refine deployment tooling, but the
**order** and **invariants** above should remain stable.
