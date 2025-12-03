# VOID Mainnet Governance Model (Phase 1)

## 0. Goals

- **Ship without deadlock**: No external board or human committee required to start or to ship fixes.
- **Safety > convenience**: Upgrades and parameter changes must respect on-chain + Prometheus health gates.
- **Single-operator start, multi-operator future**: Phase 1 is centralized around the founding operator, with a clear path to multi-sig + community validators later.
- **Keys are replaceable, rules are not**: Individual keys can rotate; the AdminGate/UpdateGate/ConfigGate rules and on-chain contracts define governance.

---

## 1. Core Governance Contracts

- **AdminGate**
  - Holds the **masterKey** (cold storage / hardware / LUKS).
  - Controls which contracts and functions are "system-level" and who can call them.
  - Long-term: can be wired so updates must be authorized by multiple signers.

- **UpdateGate**
  - The “protocol upgrade router”.
  - Only callable by AdminGate-approved keys.
  - Used to schedule or execute:
    - Protocol upgrades (new implementations, feature flags).
    - Critical parameter changes that affect core security or economics.

- **ConfigGate**
  - Handles “normal” configuration knobs:
    - Fee params, emission toggles, limits, feature flags that are not existential.
  - It is itself controlled by AdminGate.

- **ValidatorSet**
  - Manages validator membership and stakes.
  - Its admin/owner is a dedicated role: **validatorSetOwner**.

- **VoidTreasury / OpsTreasury / RewardEngine**
  - **VoidTreasury**: holds premine and long-term emissions budgets.
  - **OpsTreasury**: pays ops, infra, and bootstrap incentives.
  - **RewardEngine**: distributes emissions to validators based on ValidatorSet.
  - Each has its own **owner/admin** role.

At genesis, all of these roles are wired from `config/void-mainnet-bootstrap-mainnet.live.json`
and checked by the **keys pillar** (`void_mainnet_keys_roles_ok == 1`).

---

## 2. Phase 1 Governance: “Founding Operator Mode”

In Phase 1 (early mainnet), VOID is effectively run by a **single operator (the founder)**, but:

- Critical keys live on **LUKS-encrypted storage and/or hardware wallets**.
- Governance actions are constrained by:
  - **Bootstrap plan health** (`void_mainnet_bootstrap_plan_health`).
  - **Mainnet pillars** (`void:mainnet_pillars:health:last_5m`).
  - **Keys pillar** (`void:mainnet_keys_roles:ok:last_5m`).
  - **Overall with-mainnet pillar** (`void:mainnet_pillars:health_with_mainnet:last_5m`).

### 2.1 Roles in Phase 1

From the LIVE JSON + keys mapping:

- **deployer**  
  - Address that actually broadcasts the bootstrap transactions.
  - Holds the deployer EOA (on hardware/LUKS).
  - Used once for bootstrap, then mostly parked.

- **treasuryAdmin / treasuryOwner**
  - Control VoidTreasury and its configuration.
  - Decide long-term emissions schedules (through approved mechanisms).

- **opsTreasuryAdmin / opsTreasuryOwner**
  - Control OpsTreasury spenders and limits.
  - Fund dev, infra, bug bounties, and bootstrap validator incentives.

- **validatorAdmin / validatorSetOwner**
  - Can add/remove validators and configure validator rules (within the protocol constraints).

- **adminGateOwner / updateGateOwner / configGateOwner**
  - Control AdminGate/UpdateGate/ConfigGate internals.
  - In Phase 1, these are effectively under the founding operator’s control, but:
    - Critical masterKey lives on the LUKS “voidkey” / hardware wallet.
    - Operational owners live on separate hot/warm keys where needed.

- **rewardEngineOwner**
  - Controls RewardEngine configuration (emission tap, validator reward logic params).

In practice, in Phase 1, **one operator holds all of these roles**, split across multiple keys
so a single compromised hot wallet does not own the entire chain.

---

## 3. Upgrade & Change Process (No External Committee)

There is **no external human committee**. The safeguards are:

1. **Local metrics + scripts** (already implemented):
   - `./ops/void-mainnet-health-all.sh`
   - `./ops/void-mainnet-health-with-mainnet-all.sh`
   - `./ops/void-mainnet-planning-health-all.sh`
   - `./ops/void-mainnet-keys-health-all.sh`
2. **Prometheus rules & alerts**:
   - `void:mainnet_overall:health:last_5m_v2`
   - `void:mainnet_pillars:health:last_5m`
   - `void:mainnet_pillars:health_with_mainnet:last_5m`
   - `void_mainnet_bootstrap_plan_health`
   - `void_mainnet_keys_roles_ok`

### 3.1 Standard protocol change flow (Phase 1)

1. **Design & code the change** off-chain (contracts, node, agents).
2. **Devnet rehearsal**:
   - Run the dev bootstrap and protocol tests on devnet/anvil.
   - Ensure all devnet CI & coverage gauges are green.
3. **Update plan/config JSON if needed**:
   - For changes requiring new contract addresses or wiring, update:
     - `config/void-mainnet-bootstrap-mainnet.live.json`
     - LUKS roles mapping file under `/mnt/voidkey/meta/mainnet-roles-mapping.txt`
   - Re-run:
     - `./ops/void-mainnet-planning-health-all.sh`
     - `./ops/void-mainnet-keys-health-all.sh`
4. **Preflight health for mainnet**:
   - Run:
     - `./ops/void-mainnet-health-all.sh`
     - `./ops/void-mainnet-health-with-mainnet-all.sh`
   - Confirm:
     - `void:mainnet_overall:health:last_5m_v2 == 1`
     - `void:mainnet_pillars:health_with_mainnet:last_5m == 1`
5. **Execute the upgrade**:
   - Use AdminGate/UpdateGate/ConfigGate entrypoints through a dedicated ops script.
   - Sign from the appropriate hardware/LUKS-protected keys.
   - Broadcast transactions against the real RPC URL (VOID mainnet).
6. **Post-change verification**:
   - Re-run all health scripts.
   - Check alerts in Grafana dashboards.
   - Confirm no new red gauges or alerts.

This gives full autonomy, with a strict health discipline before and after each change.

---

## 4. Phased Decentralization

Phase 1 is intentionally centralized. Later phases expand control.

### Phase 1 — Founding operator, single signer

- All governance roles are effectively one operator’s keys.
- Premine is held by VoidTreasury, not by a hot EOA.
- Upgrades flow through AdminGate/UpdateGate/ConfigGate.
- Safeguards:
  - LUKS / hardware key storage.
  - Pillars and SLO alerts.
  - Mainnet bootstrap & keys pillars.

### Phase 2 — Multi-sig & split authority

- Convert **adminGateOwner**, **updateGateOwner**, **configGateOwner**
  to multi-sig contracts (e.g. N-of-M signers).
- Split responsibilities:
  - One signer set focused on protocol upgrades (AdminGate/UpdateGate).
  - Another focused on financial flows (Treasury/OpsTreasury).

### Phase 3 — Community participation

- Wider validator set:
  - Permissionless validator registration under the ValidatorSet rules.
- Optional extensions:
  - Governance proposals routed via AdminGate/UpdateGate.
  - Community representation in signer sets.

---

## 5. Mainnet Bootstrap Ceremony & Governance

The **bootstrap ceremony** (see `docs/VOID-MAINNET-BOOTSTRAP-CEREMONY.md`) is where we:

- Confirm LIVE JSON roles.
- Confirm keys mapping on the LUKS volume.
- Walk through the PLAN narrative (`VoidMainnetBootstrapMainnet.plan`).
- Run the MAINNET dry-run harness (stubbed `run()`).

After the real bootstrap `run()` is wired and executed:

- Premine moves into VoidTreasury.
- OpsTreasury and RewardEngine are configured.
- Validator0 is registered and begins staking & earning.
- AdminGate/UpdateGate/ConfigGate and all owners are live.

From that point on, all changes should follow the governance process above.

---

## 6. Design Principles (Summary)

1. **You can ship**  
   One determined operator can deploy and evolve VOID mainnet without waiting on anyone.

2. **Metrics and contracts are the “board”**  
   The only “approval process” is on-chain invariants + Prometheus health/pillars.

3. **Keys are dangerous but replaceable**  
   We rely on:
   - LUKS + hardware.
   - Rotatable AdminGate/UpdateGate/ConfigGate owners.
   - Contracts that enforce rules.

4. **Clear path to decentralization**  
   Nothing in Phase 1 blocks:
   - Introducing multi-sig.
   - Expanding validator sets.
   - Adding more signers or even community-controlled upgrade flows later.

