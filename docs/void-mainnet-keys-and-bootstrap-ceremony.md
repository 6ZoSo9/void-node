# VOID Mainnet Keys & Bootstrap Ceremony (PLAN Phase)

This doc describes HOW we will prepare real VOID mainnet keys, derive addresses,
and fill config/void-mainnet-bootstrap-mainnet.live.json so that the
PLAN harness can go green.

This is **not** the broadcast RUNBOOK. This is Phase 0–1: keys + PLAN-only.

---

## 0. Roles and responsibilities

We assume the following logical roles (could be the same person, but keys are separate):

- Premine/Genesis Deployer
  - One-shot deploys core contracts / genesis wiring.
  - After bootstrap, this key is effectively retired.
- VoidTreasury Controller
  - Controls the on-chain VoidTreasury contract (premine vault).
- OpsTreasury Controller
  - Controls OpsTreasury (operational budgets).
- AdminGate MasterKey
  - Single master key that can change AdminGate/UpdateGate config under strict policy.
- UpdateGate Signers
  - M-of-N signer set used for core upgrades (v99 design).
- Validator Keys
  - Initial validator set keys for VOID mainnet validators.
- RewardEngine Ops
  - Key(s) that can configure RewardEngine parameters if needed.

For security, these SHOULD be split across multiple physical devices and people.

---

## 1. Environment assumptions

- An **offline machine** (no network) for key generation:
  - Full disk encryption.
  - Ideally a live Linux + RAM-only, but at minimum LUKS-encrypted disk.
- A **LUKS-encrypted USB** (“voidkey”) dedicated to storing:
  - Seed phrases (if not on hardware wallets).
  - Encrypted backups of keystore files.
  - The final *.live.json configs, if you choose.
- One or more **hardware wallets** (recommended):
  - For AdminGate master, UpdateGate signers, Treasury, OpsTreasury.
- Online dev box (this machine: zoso-Precision-Tower-7810) will:
  - Never store raw seeds.
  - Only store public addresses and the *.live.json (which is already gitignored).

---

## 2. Key generation (high-level)

For each key role:

1) Decide the storage form:

   - Hardware wallet (preferred for long-lived roles: Treasury, AdminGate, UpdateGate).
   - Software wallet on offline machine (shorter-lived roles, e.g. one-shot Premine Deployer),
     with seeds written on paper + stored on LUKS USB as encrypted backup.

2) On the **offline machine** or hardware wallet:

   - Generate the wallet/seed.
   - Record:
     - Role name ("VoidTreasury Controller", etc.).
     - Public address (0x...).
     - Derivation path / hardware label if applicable.
   - Store seed/phrase:
     - On paper (in a safe).
     - Optionally in an encrypted file on the LUKS USB.

3) Never bring the raw seed onto the online dev box.

At the end of this step, you have a table (on paper + optionally in an encrypted file)
mapping roles to addresses.

---

## 3. Constructing the live JSON (PLAN config)

On your online dev box (this repo), you will **only copy addresses**, not seeds.

1) Create the live config file (if not already):

   - Path: config/void-mainnet-bootstrap-mainnet.live.json
   - This file is already gitignored.

2) Fill it according to this schema:

   - chainId: must be 2050.
   - addresses.*: must be the public addresses derived from your key ceremony.

Example shape (addresses shown here are placeholders, not real):

    {
      "chainId": 2050,
      "addresses": {
        "voidToken":    "0xVoidTokenContractAddress00000000000000000001",
        "voidTreasury": "0xVoidTreasuryContractAddress0000000000000002",
        "opsTreasury":  "0xOpsTreasuryControllerAddress000000000000003",
        "adminGate":    "0xAdminGateContractAddress000000000000000004",
        "updateGate":   "0xUpdateGateContractAddress00000000000000005",
        "validatorSet": "0xValidatorSetContractAddress000000000000006",
        "rewardEngine": "0xRewardEngineContractAddress000000000000007"
      }
    }

Notes:

- voidToken, voidTreasury, adminGate, updateGate, validatorSet, rewardEngine
  will match the contracts that the Forge bootstrap script deploys.
- opsTreasury is usually an EOA or a contract controlled by ops (depending on final design).
- Some of these addresses will come from precomputed CREATE2 or predetermined deployer patterns.
  The exact derivation is handled by the bootstrap script; this JSON is the "expected wiring".

If we later decide to include more metadata (e.g. initial signer sets, chain name), we can,
but the PLAN harness depends only on these fields today.

---

## 4. Turning PLAN green

Once config/void-mainnet-bootstrap-mainnet.live.json is filled with real addresses,
you must turn the PLAN health green **before** any broadcast is even considered.

On the dev box:

1) Run the PLAN harness directly:

    cd ~/dev/void-node
    ./ops/void-mainnet-bootstrap-mainnet-plan.sh \
      config/void-mainnet-bootstrap-mainnet.live.json

   Expectations when READY:

   - No error messages about missing/zero addresses.
   - chainId sanity "[ok] chainId matches VOID mainnet (2050)".
   - "[result] OK – void_mainnet_bootstrap_plan_ready = 1".
   - Metric file ops/textfile/void_mainnet_bootstrap_plan.prom contains:
     - void_mainnet_bootstrap_plan_ready 1
     - void_mainnet_bootstrap_plan_chainid 2050

2) Run the PLAN health hammer:

    ./ops/void-mainnet-bootstrap-mainnet-plan-health.sh

   Expectations when READY:

   - Summary section shows "[OK] bootstrap PLAN is GREEN".
   - Exit code is 0.

3) Optionally, run the mainnet health hammer:

    ./ops/void-mainnet-health-all.sh

   - mainnet_core + lastmile + safeboot + pillars should already be 1.
   - The soft PLAN section should show GREEN.

Only when all three are true is the PLAN considered "green".

---

## 5. Promotion to hard gate (later step)

After PLAN is green, we will:

- Update ops/void-mainnet-health-all.sh to treat PLAN as a hard gate:
  - Fail if PLAN health returns non-zero.
- Extend pillars / pillars-preflight to require PLAN_READY.
- Extend pre-push hooks on mainnet-critical branches to require:
  - mainnet_overall/pillars == 1
  - mainnet_lastmile == 1
  - safeboot_overall == 1
  - tokenomics == 1
  - bootstrap PLAN READY == 1

We may also:

- Wire void_mainnet_bootstrap_plan_ready into Prometheus via node_exporter
  textfile collector.
- Add recording rules (e.g. void:mainnet_bootstrap_plan:ready:last_5m).
- Add alert VoidMainnetBootstrapPlanUnready.

These can be implemented after the PLAN is green.

---

## 6. Relation to broadcast

Important:

- The PLAN harness and PLAN health do **not** perform any on-chain deployment.
- They are pure config validation + metrics.

The broadcast phase will be a separate RUNBOOK that:

- Reads the same *.live.json.
- Uses Forge scripts to simulate and then broadcast.
- Requires:
  - PLAN_READY == 1.
  - SLO-style health on mainnet core/lastmile/safeboot/tokenomics.
  - Hardware wallet confirmations / LUKS USB present (sentinel).

Until that RUNBOOK is written and tested, no real mainnet broadcast occurs.
