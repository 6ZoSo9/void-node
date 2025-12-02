# VOID Mainnet Bootstrap Runbook (PLAN Phase)

Status of this document:
- Covers PLAN-only mainnet bootstrap (no broadcasts).
- Assumes:
  - config/void-mainnet-bootstrap-mainnet.live.json is filled with real mainnet roles.
  - Roles mapping lives on the LUKS-encrypted voidkey drive at /mnt/voidkey.
  - VoidMainnetBootstrapMainnet on branch feat/mainnet-core-20251120 is in stub-only state (run() always reverts).

This is for rehearsals and final pre-flight checks before we ever enable live broadcast.

---

## 0. Preconditions

- You are on the correct branch:
    git switch feat/mainnet-core-20251120

- Prometheus and node_exporter are running and scraping VOID mainnet pillar + keys metrics.
- LUKS key drive is mounted at /mnt/voidkey and contains:
    meta/mainnet-roles-mapping.txt

- LIVE config file exists:
    config/void-mainnet-bootstrap-mainnet.live.json

- Mainnet core, last-mile, safeboot pillars are already green.

---

## 1. Verify roles mapping vs LIVE JSON (keys pillar)

This ensures the roles mapping on the encrypted USB matches the LIVE plan JSON.

Commands:

    cd "$HOME/dev/void-node"
    ./ops/void-mainnet-roles-verify.sh
    ./ops/void-mainnet-keys-health.sh
    ./ops/void-mainnet-pillars-keys-health.sh

Expected:

- roles-verify: all 11 roles show [ok] and "RESULT: OK".
- keys-health: ends with
    RESULT: OK (roles mapping matches live config)
    void_mainnet_keys_roles_ok 1
- mainnet-pillars-keys-health shows:
    void:mainnet_pillars:health:last_5m = 1
    void:mainnet_pillars:health_with_keys:last_5m = 1

If any of those are 0, stop.

---

## 2. Check mainnet pillars + last-mile + safeboot

This is your global mainnet readiness bar (without contracts deployed).

Example commands (use the ones that exist in your tree):

    cd "$HOME/dev/void-node"
    ./ops/void-mainnet-pillars-health-all.sh

You should see something like:

- devnet_ok       = 1
- mainnet_core_ok = 1
- manifest_ok     = 1
- safeboot_ok     = 1
- mainnet-lastmile health == 1
- pillars-preflight RESULT: OK

If anything is red, fix it before touching bootstrap.

---

## 3. PLAN checklist against LIVE JSON

Checks config structure and confirms we have NOT pretended to deploy yet.

    cd "$HOME/dev/void-node"
    ./ops/void-mainnet-bootstrap-plan-checklist.sh

You should see:

- chainId (config) : 2050
- chainId (RPC)    : 2050
- all tracked roles non-zero
- all contracts.* still zero with a line like:
    -> missing/zero CRITICAL contracts (these gate plan_health): voidToken premineVault treasury opsTreasury rewardEngine

Structural summary should show:

    plan_structural_health (local)   : 0  (1=READY-ish, 0=NOT_READY)

Interpretation right now:
- Roles are real.
- Contracts are not deployed (correct).
- plan_structural_health = 0: still PLAN-only. Good.

---

## 4. PLAN simulation via forge (stub-only)

Runs Mainnet script in PLAN mode against LIVE JSON and confirms:

- config parses
- invariants pass
- narrative logs
- then stub revert fires

    cd "$HOME/dev/void-node"
    ./ops/void-mainnet-bootstrap-mainnet-plan-sim.sh

Expected:

- Logs include:
    === [VOID mainnet bootstrap mainnet PLAN] ===
    runtime chainId : 2050
    config  chainId : 2050
    chainId sanity OK; parsed config view (PLAN).
    === [roles] ===
    === [contracts] ===
    === [validator0] ===

- End shows revert:
    Error: script failed: VoidMainnetBootstrapMainnet: stub only; implement real wiring before broadcast

- Helper summary:
    [plan-sim] detected expected stub revert marker:
      "stub only; implement real wiring before broadcast"
    [plan-sim] RESULT: OK (PLAN sim path wired; still stub-only, no broadcast).

If the revert reason ever changes or disappears, treat that as a red flag.

---

## 5. PLAN snapshot (human-readable plan file)

Prints the narrative into a versioned text file under docs/ so you have a frozen human-readable plan.

    cd "$HOME/dev/void-node"
    ./ops/void-mainnet-bootstrap-mainnet-plan-print.sh
    ls docs/VOID-MAINNET-BOOTSTRAP-PLAN-*.txt
    head -40 docs/VOID-MAINNET-BOOTSTRAP-PLAN-*.txt

Expected:

- A file like:
    docs/VOID-MAINNET-BOOTSTRAP-PLAN-20251201-232135.txt

- Content starts with:
    === [mainnet-plan] VOID mainnet bootstrap PLAN (no broadcast) ===
    [cfg] CONFIG  = config/void-mainnet-bootstrap-mainnet.live.json
    [cfg] RPC_URL = http://127.0.0.1:8545

and includes:

- roles table with your addresses
- contracts table (all zero)
- validator0 block (reward, consensusKey, stakeVOID)
- high-level step narrative (Step 0–6)

Current practice: keep these txt snapshots untracked or commit them later in a docs-only change.

---

## 6. What is NOT implemented yet (by design)

Right now, VoidMainnetBootstrapMainnet exposes:

- plan(configPath)
    PLAN-only, read-only, no broadcasts.

- planWithSecrets(configPath)
    PLAN-only, checks VOID_MAINNET_DEPLOYER_KEY matches roles.deployer, no broadcasts.

- run(configPath)
    Calls plan(configPath), logs narrative, then ALWAYS reverts with:
    "VoidMainnetBootstrapMainnet: stub only; implement real wiring before broadcast"

ops/void-mainnet-bootstrap-mainnet-broadcast.sh remains intentionally disabled and should stay that way until we explicitly design the live wiring.

There is no path that will accidentally deploy mainnet contracts in the current state.

---

## 7. Future LIVE broadcast (outline only)

When we are eventually ready to implement real broadcast:

1. Ensure all pillars (devnet, mainnet-core, last-mile, safeboot, tokenomics, keys, PLAN) are green for a long window (for example 24h).
2. Freeze void-mainnet-bootstrap-mainnet.live.json and roles mapping; tag the repo.
3. Implement real wiring in run(configPath):
   - env-backed keys from LUKS / hardware
   - vm.addr(key) must match roles in config
   - perform deployments and wiring exactly once
4. Keep plan and planWithSecrets as read-only DRY-RUN paths.
5. Update broadcast script to call real run(configPath) only behind an explicit enable flag.
6. Add Prometheus metrics/alerts for "bootstrap broadcast done" and guard them in pre-push / pillars.

None of that wiring exists yet. The repo is in PLAN locked, keys locked, stub-only state.

---

## 8. Minimal checklist before touching LIVE wiring

Before you even think about changing run() or the broadcast script, all of the following should be true:

- void:mainnet_pillars:health:last_5m == 1
- void:mainnet_pillars:health_with_keys:last_5m == 1
- void_mainnet_bootstrap_plan_health == 1
- PLAN sim and PLAN print are green, with contracts.* still zero in JSON
- Roles mapping and LIVE JSON are frozen and backed up
- LUKS key image and hardware wallets are backed up and tested
- Repo is tagged and protected
- Broadcast script still contains loud warnings

Only after that do we start converting the stub into a real run path.
