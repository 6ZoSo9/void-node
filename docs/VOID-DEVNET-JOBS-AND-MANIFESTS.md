# VOID Devnet – Jobs, Manifests, and Agent OS (v1)

This doc explains how VOID devnet handles AI job requests via JobQueue,
ReceiptRegistry, and the shell wrappers.

---

## Components

On devnet (chainId 2050), the key contracts are:

- JobQueue – on-chain list of AI jobs to be processed.
- ReceiptRegistry – on-chain registry of job receipts (results).
- AgentRegistry – which EOAs are allowed to act as agents.
- ModelRegistry – which models (IDs) are valid.
- AdminGate – admin/master-key contract for system control.

Helper scripts live in ~/.local/bin and talk to:
- RPC_URL = http://127.0.0.1:8545
- DEVNET_PRIVKEY = devnet deployer/agent account

---

## Core scripts

1) Make a manifest from a prompt

  ~/.local/bin/void-devnet-make-manifest.sh "demo: write a haiku about Void devnet"

This:

- Writes a JSON manifest under docs/VOID-DEVNET-MANIFESTS/
- Prints the manifest path and payload hash

2) Post a job from a manifest

  MANIFEST=$(ls -1t docs/VOID-DEVNET-MANIFESTS/VOID-DEVNET-MANIFEST-*.json | head -1)
  ~/.local/bin/void-devnet-post-manifest-job.sh "$MANIFEST"

This:

- Reads the manifest
- Posts a job to JobQueue using:
  - APP_ID=void-demo-app-1
  - MODEL_ID=void-demo-llm-1
- Appends jobId to docs/VOID-DEVNET-JOB-SPOOL.txt
- Records manifest → jobId mapping in docs/VOID-DEVNET-MANIFEST-INDEX.txt

3) Sweep jobs (Agent OS)

  ~/.local/bin/void-devnet-agent-sweep.sh

Sweep:

- Scans docs/VOID-DEVNET-JOB-SPOOL.txt for jobIds
- For each job:
  - If status_raw=3 and hasResult=true, skip
  - If posted and not processed:
    - Claim job as DEV_AGENT_ADDR
    - Submit receipt to ReceiptRegistry
    - Mark job complete in JobQueue

4) Coverage metrics

  RPC_URL="http://127.0.0.1:8545" ~/.local/bin/void-devnet-coverage.sh
  sed -n '1,40p' ~/.cache/node-exporter-textfile/void_devnet_coverage.prom

Exports:

- void_devnet_jobs_total{chain="devnet"}
- void_devnet_receipts_total{chain="devnet"}
- void_devnet_coverage{chain="devnet"} = receipts / jobs
- void_devnet_coverage_health{chain="devnet"} = 1 if jobs == receipts else 0

Prometheus alert:

- VoidDevnetCoverageDrop – fires when coverage_health == 0 for 2m

5) Inspect manifest → job → receipts

  MANIFEST=$(ls -1t docs/VOID-DEVNET-MANIFESTS/VOID-DEVNET-MANIFEST-*.json | head -1)
  ~/.local/bin/void-devnet-manifest-inspect.sh "$MANIFEST"

Inspector:

- Prints manifest prompt and config
- Resolves jobId via VOID-DEVNET-MANIFEST-INDEX.txt
- Dumps job status and receipts from ReceiptRegistry

---

## One-shot run helper

You can also run the full flow:

  export RPC_URL="http://127.0.0.1:8545"
  export DEVNET_PRIVKEY='<your devnet private key>'

  ~/.local/bin/void-devnet-manifest-run.sh "demo: write a haiku about Void devnet vX"

This:

- Creates a manifest from the prompt
- Posts a job from that manifest
- Sweeps jobs with the agent OS
- Recomputes devnet coverage and prints a snapshot
- Inspects manifest → job → receipts and dumps the receipt row
