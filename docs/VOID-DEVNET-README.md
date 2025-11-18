# VOID Devnet – Local Agent Pipeline (chainId 2050, v1)

This README documents your **local VOID devnet** and the **agent pipeline** that is currently working.

- Chain: Anvil-style devnet, chainId = 2050
- Dev EOA (deployer / agent): 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
- RPC: http://127.0.0.1:8545
- State file: docs/VOID-DEVNET-PROTOCOL-STATE.json

Devnet is throwaway: for testing contracts + agents, not final mainnet design.

---

## 1. Core contracts (from state file)

All addresses come from:

- docs/VOID-DEVNET-PROTOCOL-STATE.json

Important fields:

- AdminGate
- JobQueue
- ReceiptRegistry
- AgentRegistry
- ModelRegistry
- (optionally) ModelEvalRegistry, ConfigGate, DatasetRegistry, etc.

Shell scripts read these via jq; nothing is hardcoded.

---

## 2. Agent pipeline overview

The pipeline is:

1) User prompt → manifest JSON
2) Manifest → JobQueue job
3) Agent-OS sweep → claim job, run model, write ReceiptRegistry, complete job
4) Coverage script → compute jobs vs receipts coverage
5) Status/health scripts → summarize and emit Prometheus textfile metrics

Key files:

- docs/VOID-DEVNET-JOB-SPOOL.txt
  - One jobId (0x…) per line
  - Sweep scripts use this to find jobs

- docs/VOID-DEVNET-MANIFEST-INDEX.txt
  - Lines: "<manifest-path> <jobId>"
  - Lets you go manifest → job → receipts

- docs/VOID-DEVNET-MANIFESTS/VOID-DEVNET-MANIFEST-*.json
  - One manifest per job (prompt, model id, hashes, etc.)

---

## 3. Devnet commands (what works now)

Run everything from:

  cd ~/dev/void-node
  export RPC_URL="http://127.0.0.1:8545"
  export DEVNET_PRIVKEY='0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

### 3.1 System deploy (contracts)

Deploy or redeploy the devnet system:

  RPC_URL="$RPC_URL" DEVNET_PRIVKEY="$DEVNET_PRIVKEY" ./ops/void-devnet-system-deploy.sh

You also have:

  RPC_URL="$RPC_URL" DEVNET_PRIVKEY="$DEVNET_PRIVKEY" ./ops/void-devnet-system-deploy-v2.sh

for newer layouts.

### 3.2 Print addresses

Quick sanity on contract addresses:

  ./ops/void-net-print-addresses.sh

---

## 4. Haiku demo: end-to-end agent pipeline

This runs the full pipeline in one shot:

  cd ~/dev/void-node
  export RPC_URL="http://127.0.0.1:8545"
  ./ops/void-devnet-haiku-demo.sh "demo: write a haiku about Void devnet vN"

It does:

1) Create a manifest JSON from the prompt.
2) Post a job to JobQueue.
3) Run the agent-OS sweep:
   - Claim job as the dev agent EOA.
   - Submit receipt to ReceiptRegistry.
   - Complete the job in JobQueue.
4) Recompute coverage metrics.
5) Print manifest → job → receipt details.

You have already observed coverage with jobs=14, receipts=14, coverage=1.

---

## 5. Status and health

### 5.1 Status script

Summarize devnet state:

  ./ops/void-devnet-status.sh

It prints:

- Job spool path and job count.
- Coverage metrics (from the cache file).
- Tail of manifest → job mapping.
- Truncated job summary (each job: HAS_RECEIPTS etc.).

### 5.2 Agent health script

Validate that jobs == receipts and coverage is healthy:

  ./ops/void-devnet-agent-health.sh
  echo "[exit code] $?"

It reads void_devnet_coverage.prom from your cache and:

- Exits 0 when coverage_health=1 (jobs == receipts).
- Exits non-zero when coverage is broken.

You also wired a periodic health check:

  systemctl --user enable --now void-devnet-agent-health.timer

The timer runs the health script regularly and keeps the textfile metric fresh.

---

## 6. Agent sweep timer (auto-processing jobs)

You have:

- void-devnet-agent-sweep.service
- void-devnet-agent-sweep.timer

The timer periodically runs the sweep driver, which:

- Scans docs/VOID-DEVNET-JOB-SPOOL.txt
- Queries JobQueue for each job
- For status=Posted jobs: claims, writes ReceiptRegistry receipt, completes job
- Recomputes coverage metrics

To inspect the schedule:

  systemctl --user list-timers 'void-devnet-agent-sweep*'

---

## 7. Snapshots

You added a snapshot helper:

  ./ops/void-devnet-snap.sh

It creates a directory:

  docs/VOID-DEVNET-SNAPSHOTS/VOID-DEVNET-SNAPSHOT-<UTC_TIMESTAMP>/

Containing:

- status.txt (output from void-devnet-status.sh)
- VOID-DEVNET-PROTOCOL-STATE.json
- VOID-DEVNET-MANIFEST-INDEX.txt
- VOID-DEVNET-JOB-SPOOL.txt
- VOID-DEVNET-MANIFESTS/ (all manifest JSON files)
- cache/void_devnet_coverage.prom

Use this before risky changes so you can reconstruct devnet state.

---

## 8. Prometheus textfile metrics (devnet side)

Several scripts emit Prometheus-format textfiles, for example:

- void_devnet_coverage.prom
  - void_devnet_coverage
  - void_devnet_jobs_total
  - void_devnet_receipts_total
  - void_devnet_coverage_health

Other helpers you have written can emit:

- void_devnet_receipts.prom
- void_models_devnet.prom
- void_datasets_devnet.prom

Locations:

- Cache (per-user):
  - ~/.cache/node-exporter-textfile/

- Node exporter textfile collector (for Prometheus):
  - /var/lib/node_exporter/textfile_collector/

Prometheus and Grafana wiring live on the host side; this README just documents the devnet pieces.

---

## 9. Short devnet roadmap

Next logical steps for this devnet (not all done yet):

- Dataset demos:
  - Register demo datasets via DatasetRegistry.
  - Add dataset coverage metrics.

- Model catalog:
  - Scripts to list and inspect models via ModelRegistry.

- Multi-model agent behavior:
  - Route jobs by MODEL_ID to different behaviors in agent-OS.

- One-shot devnet boot:
  - A single "devnet up" script to deploy contracts, start timers, run a test job,
    and show coverage and health status.

For now, this README captures the working, tested devnet agent pipeline you just built.
