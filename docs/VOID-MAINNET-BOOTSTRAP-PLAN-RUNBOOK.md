# VOID Mainnet Bootstrap PLAN — Stub Phase

## 0. Purpose

This document explains the current VOID **mainnet bootstrap PLAN** setup in the *stub* phase:

- What `script/VoidMainnetBootstrapMainnet.s.sol` does right now.
- How `ops/void-mainnet-bootstrap-mainnet-plan.sh` uses it.
- How the Prometheus gauge `void_mainnet_bootstrap_plan_ready` is produced.
- How to run the health checks and interpret `plan_ready == 0` vs `1`.

This is **not** the real mainnet broadcast flow. It is a **PLAN-only / safety** layer that must be green before any real mainnet bootstrap.

---

## 1. Components

### 1.1 Solidity script (stub mode)

File:

- `script/VoidMainnetBootstrapMainnet.s.sol`
  - Contract: `VoidMainnetBootstrapMainnet`

Current behavior:

- Reads a JSON config path passed from the CLI.
- Decodes chain + wiring config into structs.
- Checks basic invariants, for example:
  - `block.chainid == cfg.chain.chainId`
  - Required addresses and values are non-zero / sane.
- Logs a summary of what a real bootstrap would do (deploy/wire contracts, move premine, etc.).
- **Always reverts at the end**, on purpose, so:
  - No state changes are ever made, even on a fork.
  - It is safe to run in “PLAN/sim” mode.

We keep this hard-revert behavior until the PLAN path is proven. Later we will split “PLAN simulation” vs “LIVE broadcast”.

### 1.2 PLAN driver script

File:

- `ops/void-mainnet-bootstrap-mainnet-plan.sh`

Behavior:

1. Detects repo root:
   
       REPO_ROOT=/home/zoso/dev/void-node  (derived at runtime)

2. Sets the script entrypoint:
   
       SCRIPT_FQN=script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet

3. Uses a config path intended for **real mainnet**:
   
       CONFIG_PATH=config/void-mainnet-bootstrap-mainnet.live.json

4. Checks environment:

   - If `MAINNET_FORK_URL` is **not set**:
     - Prints a warning.
     - Writes a Prometheus textfile with `plan_ready = 0`.
     - Exits non-zero.

   - If `MAINNET_FORK_URL` is set (future behavior):
     - Runs the Solidity script against a mainnet fork in “PLAN” mode.
     - Expects all invariants to pass (no revert except the final stub one, once we refactor).
     - Then sets `plan_ready = 1`.

Right now we are in the first case: no fork URL configured, PLAN is intentionally **not ready**.

### 1.3 Textfile + exporter

Repo textfile:

- `ops/textfile/void_mainnet_bootstrap_plan.prom`

Node exporter textfile:

- `/var/lib/node_exporter/textfile_collector/void_mainnet_bootstrap_plan.prom`

Exporter script:

- `ops/void-mainnet-bootstrap-mainnet-plan-exporter.sh`

Exporter behavior:

- Reads the repo-local textfile.
- Copies it into the node_exporter textfile collector directory.
- Attempts `chown node-exporter:node-exporter` if that user exists.
- If the user does not exist, logs a warning and leaves ownership as-is.

Current textfile content (stub phase) is:

    # HELP void_mainnet_bootstrap_plan_ready Is the VOID mainnet bootstrap plan simulation passing (1=yes,0=no)
    # TYPE void_mainnet_bootstrap_plan_ready gauge
    void_mainnet_bootstrap_plan_ready 0

### 1.4 Prometheus metrics

Node exporter publishes:

- `void_mainnet_bootstrap_plan_ready`

Prometheus has a recording rule:

- `void:mainnet_bootstrap_plan:ready:last_5m`

This is a 5-minute smoothed version of the base gauge for alerts/gates later.

Right now both the raw and the smoothed metrics are `0` (PLAN not ready).

---

## 2. How to run the PLAN harness

### 2.1 Rebuild the PLAN textfile

From the repo:

    cd ~/dev/void-node
    make mainnet-bootstrap-plan || true

Expected:

- Warnings about `MAINNET_FORK_URL` not being set.
- Message like:
  
      PLAN is NOT ready (no fork URL).

- Exit non-zero (expected in stub phase).
- `ops/textfile/void_mainnet_bootstrap_plan.prom` updated with `plan_ready 0`.

### 2.2 Export to node_exporter

    cd ~/dev/void-node
    sudo ./ops/void-mainnet-bootstrap-mainnet-plan-exporter.sh

Expected:

- Logs source and destination.
- May log a warning about missing `node-exporter` user (non-fatal).
- Writes:

    /var/lib/node_exporter/textfile_collector/void_mainnet_bootstrap_plan.prom

### 2.3 Check health script

    cd ~/dev/void-node
    make mainnet-bootstrap-plan-health

Expected:

- Shows the Prometheus query result for `void_mainnet_bootstrap_plan_ready`.
- Prints:

    PLAN is NOT ready.
    This is EXPECTED right now since MAINNET_FORK_URL and *.live.json
    are not configured yet. No action required until we get closer to mainnet.

Exit code: 0 (informational only).

---

## 3. Interpreting plan_ready

### 3.1 Current stub-phase meaning

- `void_mainnet_bootstrap_plan_ready = 0`
- `void:mainnet_bootstrap_plan:ready:last_5m = 0`
- Health script says “PLAN is NOT ready (EXPECTED)”.
- No pre-push or pillars gate is wired to this yet.

This is correct while:

- No real `config/void-mainnet-bootstrap-mainnet.live.json` exists.
- No `MAINNET_FORK_URL` is configured.
- The Solidity script is still a hard-revert stub.

### 3.2 Future target (PLAN-ready = 1)

In the future (closer to mainnet), to reach `plan_ready = 1`:

1. `MAINNET_FORK_URL` points at a mainnet-capable fork/archival RPC.
2. `config/void-mainnet-bootstrap-mainnet.live.json` exists and passes schema/invariant checks.
3. The Solidity script, in PLAN mode:
   - Parses the config.
   - Simulates all deployments/wiring.
   - Verifies tokenomics (premine split, emissions, Treasury/Ops wiring).
   - Does **not** fail any invariant checks.

Once that is true:

- The plan driver will set `void_mainnet_bootstrap_plan_ready = 1`.
- The 5m-smoothed rule will also return `1`.
- At that point we will add:
  - A Prometheus alert (e.g. `VoidMainnetBootstrapPlanNotReady`).
  - Optional pre-push / pillars gates.

---

## 4. Relationship to other flows

### 4.1 Dev bootstrap (already working)

Separate dev bootstrap scripts:

- Boot a local chain (anvil-like).
- Deploy the VOID mainnet contracts in **dev** mode.
- Wire UpdateGate/AdminGate/ConfigGate/ValidatorSet/VoidToken/VoidTreasury/OpsTreasury/RewardEngine.
- Run tokenomics and wiring checks.

That proves the **design**. The PLAN harness is about **real mainnet config**.

### 4.2 Real mainnet broadcast (later)

The real bootstrap flow will eventually:

- Use the same JSON config as PLAN.
- Use the same Solidity script, with:
  - A mode that actually executes changes (no forced revert).
  - Strong controls (hardware wallets, LUKS USB, UpdateGate/AdminGate).

Requirement: PLAN metrics must be green and stable before any live broadcast is even considered.

---

## 5. Quick command cheatsheet

From repo root:

    # Recompute PLAN textfile (stub, expect ready=0)
    make mainnet-bootstrap-plan || true

    # Export to node_exporter
    sudo ./ops/void-mainnet-bootstrap-mainnet-plan-exporter.sh

    # Prometheus queries
    curl -fsS 'http://127.0.0.1:9090/api/v1/query?query=void_mainnet_bootstrap_plan_ready' | jq '.'
    curl -fsS 'http://127.0.0.1:9090/api/v1/query?query=void:mainnet_bootstrap_plan:ready:last_5m' | jq '.'

    # Health summary (informational)
    make mainnet-bootstrap-plan-health

---

## 6. Current snapshot

As of the latest checkpoints:

- `void_mainnet_bootstrap_plan_ready = 0`
- `void:mainnet_bootstrap_plan:ready:last_5m = 0`
- `make mainnet-bootstrap-plan-health` reports "PLAN is NOT ready (EXPECTED)".
- Pre-push pillars are all OK:
  - safeboot
  - devnet
  - mainnet-core
  - mainnet-lastmile
  - pillars summary

PLAN readiness is visible as a metric but not used as a gate yet.
