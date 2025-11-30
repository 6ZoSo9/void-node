# VOID Mainnet – Bootstrap Roles & Keys Matrix

This doc defines the **roles and keys layout** for the real VOID mainnet bootstrap.
It is a **plan only** – no real addresses or secrets belong in this file.

The actual live config lives in:

- `config/void-mainnet-bootstrap-mainnet.live.json` (ignored by git)

and must be filled **later** using this doc as the blueprint.

---

## 1. Roles overview

These are the core roles referenced by the PLAN:

- `roles.deployer`
- `roles.treasuryAdmin`
- `roles.opsTreasury`
- `roles.updateGateAdmin`
- `roles.configGateAdmin`
- `roles.rewardAdmin`
- `validator0` (initial validator: signer + reward address)

Each of these maps to **one or more physical keys** (hardware wallets, validator keys, etc.).

---

## 2. Roles → responsibilities

### 2.1 `roles.deployer`

- **Purpose:** One-shot deployer to run `VoidMainnetBootstrapMainnet.s.sol` on *real* mainnet.
- **Usage pattern:** Single ceremony; should not be used after bootstrap completes.
- **Authority:** Can deploy contracts and perform initial wiring, but long-term control
  sits with the other admin roles (Treasury, UpdateGate, ConfigGate, RewardEngine).
- **Funds:** Just enough ETH for bootstrap gas + small buffer.
- **Post-bootstrap:** Drain remaining ETH to VoidTreasury or a burn address and treat
  the key as **dead**.

### 2.2 `roles.treasuryAdmin`

- **Purpose:** Ultimate owner/admin of `VoidTreasury` (holds the premine).
- **Usage pattern:** Very rare, scheduled governance-level actions only.
- **Authority:** Approves large fund movements, epoch budget changes, long-term
  economic policy moves.
- **Security level:** Highest. Hardware wallet only. Consider multi-sig later.
- **Post-bootstrap:** Lives mostly offline; only comes online for scheduled
  treasury operations with full ceremony and logging.

### 2.3 `roles.opsTreasury`

- **Purpose:** Controls `OpsTreasury` (operational funds).
- **Usage pattern:** Medium-frequency – used to pay infra, grants, bounties,
  short-term incentives.
- **Authority:** Can spend from OpsTreasury; receives refills from VoidTreasury
  under supervision of `treasuryAdmin`.
- **Security level:** Hardware wallet, but “warmer” than `treasuryAdmin`.
- **Post-bootstrap:** Active for many years; needs a clear budget and logging
  discipline.

### 2.4 `roles.updateGateAdmin`

- **Purpose:** Owns/controls `UpdateGate` signer set (M-of-N keys for core upgrades).
- **Usage pattern:** Extremely rare; only used during vetted upgrade ceremonies.
- **Authority:** Can change critical core contracts / config via UpdateGate.
- **Security level:** Nuclear. Keys must be:
  - distributed across devices / locations / people,
  - hardware wallets,
  - guarded with strict process (multi-party approval, Prometheus checks, written plan).
- **Post-bootstrap:** Mostly idle; existence of UpdateGate is the safety valve
  against bugs, not an excuse for casual changes.

### 2.5 `roles.configGateAdmin`

- **Purpose:** Owns/controls `ConfigGate` (parameters like limits, epochs, maybe JobQueue caps).
- **Usage pattern:** Low-frequency but higher than UpdateGate (parameter tuning).
- **Authority:** Can adjust protocol parameters exposed via ConfigGate.
- **Security level:** Hardware wallet. Can be separate from or partially overlapping
  with UpdateGate signers, but should be treated as an admin role, not an ops hot key.
- **Post-bootstrap:** Used for controlled parameter changes; changes should be
  driven by metrics and governance, not ad hoc whims.

### 2.6 `roles.rewardAdmin`

- **Purpose:** Admin for `RewardEngine` (emissions schedule wiring, reward logic tweaks).
- **Usage pattern:** Infrequent; mostly for fixes, parameter adjustments, or new
  reward schemes.
- **Authority:** Controls how emissions are actually paid out (within the locked
  MAX_SUPPLY / era schedule).
- **Security level:** Hardware wallet. Can be distinct from Treasury/Ops to
  avoid conflict between “who spends tokens” and “who defines reward rules”.

### 2.7 `validator0` (initial validator)

- **Purpose:** First real validator on VOID mainnet.
- **Fields:** At minimum:
  - `validatorSigner` – key that actually signs blocks.
  - `rewardAddress` – address receiving staking rewards.
  - `stakeAmount` – initial stake.
  - `commissionBps` – validator commission.
- **Usage pattern:** High-frequency signer; lives on validator hardware or HSM.
- **Security level:** Critical but different from the admin keys:
  - Should NOT be the same key as any admin role.
  - Needs redundancy / monitoring and a clear plan for rotation.

---

## 3. Key grouping plan (no addresses, just structure)

This section defines **how many physical keys** we expect and which roles they control.
Actual addresses go into the `.live.json` later.

> NOTE: This is a *proposed* grouping; it can be tightened or split further before mainnet.

### 3.1 Proposed key groups

#### Group A – Deployer (short-lived)

- **Key name:** `mainnet_deployer_key`
- **Controls:** `roles.deployer`
- **Device:** Hardware wallet dedicated to deployment.
- **Lifecycle:** Created shortly before bootstrap. After deployment succeeds and final
  checks pass, drain ETH and retire the key.

#### Group B – Treasury Governance

- **Key name:** `void_treasury_admin_key`
- **Controls:** `roles.treasuryAdmin`
- **Device:** Hardware wallet stored securely (LUKS-encrypted USB backups).
- **Notes:** Only used for large, scheduled operations. Never used as an ops hotkey.

#### Group C – Ops Treasury

- **Key name:** `void_ops_treasury_key`
- **Controls:** `roles.opsTreasury`
- **Device:** Hardware wallet with stricter-than-normal but more active use.
- **Notes:** Used for day-to-day VOID Network expenses and incentives. Should have
  strong logging and internal policy.

#### Group D – UpdateGate Admin

- **Key name(s):** `void_update_signer_1`, `void_update_signer_2`, `void_update_signer_3`, ...
- **Controls:** `roles.updateGateAdmin` (i.e., controls the signer set).
- **Device:** Multiple hardware wallets in different locations / people.
- **Notes:** This is where we enforce M-of-N security for core updates.

#### Group E – ConfigGate Admin

- **Key name:** `void_config_admin_key`
- **Controls:** `roles.configGateAdmin`
- **Device:** Hardware wallet; may be operated by a “protocol config” operator.
- **Notes:** Used for controlled parameter changes; tied to Prometheus SLOs and
  a written change plan.

#### Group F – Reward Engine Admin

- **Key name:** `void_reward_admin_key`
- **Controls:** `roles.rewardAdmin`
- **Device:** Hardware wallet; extremely limited use.
- **Notes:** Used when emissions scheduling / reward policies need adjustment or fixes.

#### Group G – Validator 0

- **Key name(s):** `validator0_signer_key`, `validator0_payout_key`
- **Controls:**
  - `validator0.validatorSigner`
  - `validator0.rewardAddress` (can be same EOA or different)
- **Device:** Validator server + HSM / hardware wallet, with monitoring.
- **Notes:** Frequent use for signing. Has a separate backup and rotation plan
  from admin keys.

---

## 4. PLAN sim invariants (what the script should enforce)

`ops/void-mainnet-bootstrap-plan-sim.sh` should enforce at least:

1. **Chain ID**
   - `chainId == 2050` (VOID mainnet).

2. **Roles non-zero and non-placeholder**
   - All `roles.*` are:
     - valid `0x` addresses,
     - non-zero,
     - not obvious placeholders (`0x0000...`, `0x1111...`, etc.).

3. **Role distinctness (no pathological reuse)**
   - `roles.deployer` MUST be distinct from:
     - `treasuryAdmin`
     - `opsTreasury`
     - any admin / validator keys.
   - `validator0.validatorSigner` MUST NOT equal any admin or treasury role.

4. **Premine / tokenomics sanity**
   - Premine config matches locked VOID spec:
     - MAX_SUPPLY = 666,666,666 VOID
     - PREMINE   = 333,333,333 VOID (VoidTreasury)
   - Plan does not route premine directly to Ops or random addresses.

5. **Validator 0 sanity**
   - Non-zero stake.
   - Reward address is non-zero.
   - Commission within sane bounds (e.g. 0–5000 bps for now).
   - Signer key not reused as any admin role.

If any of these fail, PLAN exporter should set:

- `void_mainnet_bootstrap_plan_health = 0`
- `void_mainnet_bootstrap_plan_health_info{reason="<some_reason>"}`

and Prometheus should keep `void:mainnet_bootstrap_plan:health:last_5m = 0`.

---

## 5. PLAN readiness definition

The PLAN is considered **ready/green** when:

- All roles in the live JSON are:
  - valid non-zero addresses,
  - follow the grouping and distinctness rules above.
- Premine configuration matches the locked tokenomics spec.
- `validator0` fields are filled and pass invariants.
- `ops/void-mainnet-bootstrap-plan-sim.sh` returns `OK`.
- Exporter writes:

  - `void_mainnet_bootstrap_plan_configured 1`
  - `void_mainnet_bootstrap_plan_health 1`
  - `void_mainnet_bootstrap_plan_health_info{reason="ok"}`

and Prometheus shows:

- `void:mainnet_bootstrap_plan:health:last_5m = 1`

When that happens, `./ops/void-mainnet-bootstrap-plan-health-all.sh` will flip
to `RESULT: OK`, and `./ops/void-mainnet-health-all.sh` gates will pass the
PLAN pillar as well.

