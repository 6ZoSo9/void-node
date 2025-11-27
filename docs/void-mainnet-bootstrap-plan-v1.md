# VOID Mainnet Bootstrap Plan v1

Status: DRAFT (design locked, addresses TBD)  
Chain ID: 2050  
Scope: Real VOID mainnet (not devnet/safeboot)

---

## 1. Design Goals

- Hard cap: **MAX_SUPPLY = 666,666,666 VOID**
- Premine: **333,333,333 VOID** into a **contract Treasury**, not an EOA.
- Emissions: **333,333,333 VOID** over ~100 years in 4 eras:
  - Era 1: 177,777,777
  - Era 2: 88,888,889
  - Era 3: 44,444,444
  - Era 4: 22,222,223
- Premine key is one-shot at genesis, then effectively retired.
- Users interact permissionlessly; only **core control** is gated (upgrades/params).
- All “real power” sits behind **AdminGate / UpdateGate / ConfigGate** with rotatable signer sets and multi-sig.

---

## 2. Core Contracts (High Level)

Main actors we expect for mainnet:

- **VoidToken** (VOID / VoidStones)
  - Implements MAX_SUPPLY, emission logic, and premine mint.
  - Only trusted contracts (Treasury, RewardEngine, etc.) can mint/burn beyond premine behavior.

- **VoidPremineVault** (optional)
  - Temporary holding for initial premine before sending to Treasury.
  - Used **once** during bootstrap, then frozen/emptied.

- **VoidTreasury**
  - Holds the main 333,333,333 VOID premine.
  - Refuses arbitrary withdrawals; only whitelisted flows:
    - To **OpsTreasury**.
    - To **RewardEngine** or other programmatic distributions.
  - Controlled by AdminGate/UpdateGate, not by a raw EOA.

- **OpsTreasury**
  - Hotter pool for operational spending (salaries, infra, grants, etc.).
  - Funded from Treasury in controlled increments.
  - Managed by a smaller multi-sig / signer set, also wired through AdminGate/UpdateGate.

- **RewardEngine**
  - Handles validator rewards / emissions over time.
  - Reads from tokenomics constants.
  - Gets funded from Treasury and/or inflation as designed.

- **ValidatorSetMainnet**
  - Canonical validator registry for VOID mainnet.
  - Receives validator bond deposits (in VOID).
  - Talks to RewardEngine for payouts.

- **AdminGate**
  - Top-level authority.
  - Can:
    - Rotate signer sets.
    - Change UpdateGate/ConfigGate admins.
    - Trigger emergency routines (with timelocks where possible).

- **UpdateGate**
  - Controls upgrades to core contracts.
  - Only way to upgrade critical things like RewardEngine, Treasury logic, etc.

- **ConfigGate**
  - Controls configuration knobs:
    - Emission rate parameters.
    - Validator minimums.
    - Fee tunables, etc.

- **JobQueue / Agents (future-connected)**
  - Deployed with base version.
  - Used later for AI agents and on-chain jobs.
  - Not critical for genesis correctness but part of the long-term design.

---

## 3. Key & Custody Model

### 3.1 Categories of keys

1. **Genesis Premine Key**
   - Used once to execute mainnet bootstrap and mint premine.
   - After bootstrap:
     - No remaining direct control over funds.
     - Treated as a nuclear launch key: stored offline, ideally never used again.

2. **VoidTreasury Control Keys (AdminGate / UpdateGate)**
   - Multi-sig or threshold scheme.
   - Stored on:
     - Hardware wallets and/or
     - Devices whose seeds live on **LUKS-encrypted USBs**.
   - Rotation supported via AdminGate.

3. **OpsTreasury Keys**
   - More frequently used, but still hardware/secure.
   - Used for:
     - Paying expenses.
     - Operational withdrawals from Treasury (via governed flows).
   - Also rotatable via AdminGate/UpdateGate.

4. **Validator Keys**
   - One per validator node (or more, if operators want separation).
   - Live on validator machines (or HSM), potentially protected with local disk encryption.
   - Can be rotated via ValidatorSet logic.

5. **User Wallet Keys**
   - On users’ own machines/devices.
   - Wallet UX should:
     - Encourage encryption, local backups, and “write it down” seed options.
     - Never centralize custody.

### 3.2 Storage requirements

- **Genesis Premine Key**
  - Stored on **LUKS-encrypted USB** and/or hardware wallet.
  - Physical backups separated geographically if possible.
  - Usage procedure must be scripted (no ad-hoc CLI guesswork on ceremony day).

- **Treasury/Ops/Validator Signers**
  - Recorded in a simple config manifest (YAML/JSON) used by the bootstrap script.
  - For mainnet, we must never hardcode secrets in the repo; only reference addresses.

---

## 4. Bootstrap Phases

This plan separates **dev rehearsal** from the **real mainnet ceremony**.

### Phase 0 — Pre-flight (today)

- All core contracts compile and tests pass (`forge test`).
- Tokenomics tests confirm:
  - MAX_SUPPLY and era totals match spec.
  - Premine and emissions add up correctly.
- Prometheus / Grafana pillars are **green**:
  - mainnet_core_health, mainnet_tokenomics_health, mainnet_lastmile, overall, etc.

*(We are here now.)*

---

### Phase 1 — Key Ceremony (Planning & Offline Work)

Goal: have all addresses we need for mainnet, without actually using the keys yet.

Outputs:

- `mainnet-bootstrap-addresses.json` (not committed with secrets, only addresses), containing:
  - `genesis_premine_signer`
  - `treasury_multisig_address`
  - `ops_treasury_multisig_address`
  - `admin_gate_signers[]`
  - `update_gate_signers[]`
  - `config_gate_signers[]`
  - `validator_initial_set[]` (addresses + stakes)

Rules:

- Keys created with hardware wallets / secure tools.
- Seeds stored on LUKS USB / offline backups.
- Only addresses go into the bootstrap config kept in the repo (no private keys, no mnemonics).

---

### Phase 2 — Dev/Anvil Rehearsal (VoidMainnetBootstrapDev.s.sol)

This is the dry run we will do **before** mainnet.

Steps (high-level):

1. Spin up **anvil** with chainId 2050 and deterministic keys.
2. Run `VoidMainnetBootstrapDev.s.sol` against anvil using:
   - Dummy signers that mirror the structure of the real ones (same number of signers, different keys).
3. Script performs:
   - Deployment of VoidToken, Treasury, OpsTreasury, RewardEngine, ValidatorSetMainnet, AdminGate, UpdateGate, ConfigGate, JobQueue, etc.
   - Premine mint into the Treasury (and possibly Vault → Treasury).
   - Wiring of gates and roles.
   - Initial funding rules for RewardEngine and OpsTreasury.

4. Script writes out a **bootstrap report** to stdout (and ideally JSON):
   - Deployed addresses.
   - Final balances.
   - Emission/timing config.
   - Invariants check (supply sums, no stray supply, etc.).

5. We verify:
   - All invariants pass.
   - No contract has direct EOA control over premine.
   - AdminGate / UpdateGate / ConfigGate all point to the expected signer sets.

We will have a dedicated shell script to do this entire rehearsal, so it becomes a one-command routine.

---

### Phase 3 — Real Mainnet Bootstrap (One-Shot Ceremony)

Once we’re satisfied with the dev rehearsal:

1. Prepare mainnet RPC endpoint (e.g., a dedicated mainnet bootstrap node).
2. Freeze the bootstrap config:
   - JSON/YAML file with:
     - Final addresses for all signers.
     - Emission parameters.
     - Any deployment constants needed by the script.

3. Run the **mainnet** bootstrap script:
   - Essentially the same logic as the dev script, but using real signer addresses.
   - Signed with the **genesis premine key** and any required gate signers.

4. Confirm on-chain:
   - `MAX_SUPPLY` and `totalSupply` match expectations.
   - Treasury holds exactly 333,333,333 VOID.
   - OpsTreasury, RewardEngine, etc., have the correct initial balances.
   - AdminGate/UpdateGate/ConfigGate are wired to the correct addresses.
   - ValidatorSetMainnet has the intended initial validators and bonds.

5. Tag repo & config:
   - Git tag like `void-mainnet-bootstrap-YYYYMMDD-HHMMSS`.
   - Archive the bootstrap config + outputs in an offline vault.

After this, the **premine key is done**. All further control routes through the gates.

---

### Phase 4 — Post-Bootstrap Activation & Monitoring

After contracts are live:

- **Validators**
  - Bring up initial validators using the configured ValidatorSetMainnet.
  - Confirm they can:
    - Bond.
    - Unbond.
    - Receive rewards from RewardEngine.

- **Wallet**
  - Obelisk Wallet connects to mainnet (chainId 2050).
  - Users can:
    - Receive VOID.
    - Send VOID.
    - Stake (if wallet supports validator flows early).

- **Monitoring**
  - Prometheus/Grafana expand from “devnet only” to include:
    - On-chain metrics for mainnet contracts if available.
    - JobQueue / agent receipts once live.
  - A dedicated “Mainnet Pillars” exporter tracks:
    - mainnet_core_health
    - mainnet_lastmile
    - mainnet_tokenomics_health
    - mainnet_overall (aggregated)

---

## 5. Safety & Invariants Checklist

These are non-negotiable conditions that must hold at the end of bootstrap:

1. **Supply Invariants**
   - `totalSupply(VOID) == 333,333,333 (premine) + current_emitted`
   - `MAX_SUPPLY == 666,666,666`
   - Sum of balances (Treasury + OpsTreasury + RewardEngine + other) == totalSupply.

2. **No Hot EOA Custody of Premine**
   - No EOA holds bulk premine at any point after bootstrap completes.
   - All large balances are in contracts with explicit rules.

3. **Gate Control**
   - Every upgrade or config knob for core systems is behind AdminGate/UpdateGate/ConfigGate.
   - Gate signers are rotatable by design.

4. **Key Hygiene**
   - Genesis premine key used once, then effectively retired.
   - Treasury/Ops/Validator keys recorded and backed up.
   - No mnemonics or private keys ever committed to Git.

5. **Monitoring Green**
   - All mainnet pillars show green:
     - core
     - last-mile
     - tokenomics
     - overall
   - Alerts exist and are tested for:
     - Supply mismatches.
     - Stalled emission / rewards.
     - Broken last-mile or agent flows.

---

## 6. What Still Needs Concrete Commands

This doc is the **plan**, not the final CLI.

We still need to codify:

- `ops/void-mainnet-bootstrap-dev.sh`
  - Spins anvil.
  - Runs VoidMainnetBootstrapDev.s.sol.
  - Writes JSON report.
  - Runs invariants and dumps a summary.

- `ops/void-mainnet-bootstrap-mainnet.sh`
  - Uses a config file of addresses.
  - Runs the real bootstrap script against mainnet RPC.
  - Writes logs + JSON summary for archival.

When we get closer to mainnet, we will:
- Lock the exact config schema.
- Define the one-liner commands for both dev rehearsal and mainnet.
- Dry-run the dev script multiple times until it is boring.

