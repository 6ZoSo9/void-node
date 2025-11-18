# VOID Devnet – Agent Pipeline (v1)

This file documents the **VOID devnet agent pipeline** on chainId 2050.

It covers:
- On-chain contracts: JobQueue, ReceiptRegistry, AgentRegistry, ModelRegistry, AdminGate
- Off-chain agent-OS: posting jobs, claiming, writing receipts, completing jobs
- CLI helpers and metrics files

This is DEVNET ONLY. Mainnet design will evolve, but this is our working, tested reference.

---

## 1. Core contracts (devnet)

All addresses come from:

- docs/VOID-DEVNET-PROTOCOL-STATE.json

Key fields:

- AdminGate
- JobQueue
- ReceiptRegistry
- AgentRegistry
- ModelRegistry
- chainId = 2050

We do **not** hardcode these in scripts; they are read from the state file.

---

## 2. Files and metrics

**Job spool**

- docs/VOID-DEVNET-JOB-SPOOL.txt  
- One jobId (0x…) per line  
- Used by sweep + dump scripts to find jobs

**Manifest index**

- docs/VOID-DEVNET-MANIFEST-INDEX.txt  
- Format:  
  `<manifestPath> <jobId>`  
- manifestPath can be **relative or absolute** (both work)  
- jobId is 0x… from JobQueue

**Manifest files**

- docs/VOID-DEVNET-MANIFESTS/VOID-DEVNET-MANIFEST-*.json  
- Each contains:
  - prompt (human-readable)
  - chainId
  - state (contract addresses)
  - hashes for the prompt/IO payload

**Coverage metrics (textfile)**

- ~/.cache/node-exporter-textfile/void_devnet_coverage.prom  
- Exported via void-devnet-coverage.sh  

Metrics:

- void_devnet_coverage{chain="devnet"} 0..1
- void_devnet_jobs_total{chain="devnet"}
- void_devnet_receipts_total{chain="devnet"}
- void_devnet_coverage_health{chain="devnet"} (1 if jobs == receipts)

Node exporter scrapes a copy of this via its textfile collector.

---

## 3. Helper scripts (devnet)

All helpers are in ~/.local/bin unless noted.

### 3.1 Manifest lifecycle

**Create a manifest from a prompt**

- void-devnet-make-manifest.sh "prompt text"

Writes JSON under docs/VOID-DEVNET-MANIFESTS/ and prints lines like:

- file=/path/to/manifest.json  
- hash=0x…

**Post a job from a manifest**

- void-devnet-post-manifest-job.sh PATH_TO_MANIFEST

Reads:

- chainId from manifest
- JobQueue from the protocol state JSON
- prompt from manifest (for logging)

Delegates to void-devnet-post-job.sh with:

- APP_ID=void-demo-app-1  
- MODEL_ID=void-demo-llm-1  
- PAYLOAD_HASH from the manifest hash

Side effects:

- Appends jobId to docs/VOID-DEVNET-JOB-SPOOL.txt  
- Appends `<manifest> <jobId>` to docs/VOID-DEVNET-MANIFEST-INDEX.txt

**Inspect a manifest and its job/receipts**

- void-devnet-manifest-inspect.sh PATH_TO_MANIFEST

Resolves jobId via MANIFEST-INDEX and prints:

- prompt
- chainId
- ReceiptRegistry
- jobId
- status + decoded receipts for that job

### 3.2 Jobs and receipts

**Post a raw job (no manifest)**

- void-devnet-post-job.sh

Uses:

- RPC_URL
- DEVNET_PRIVKEY
- APP_ID=void-demo-app-1
- MODEL_ID=void-demo-llm-1
- PAYLOAD_HASH from script

Appends jobId to the spool.

**Sweep jobs with agent-OS**

- void-devnet-agent-sweep.sh

Reads:

- docs/VOID-DEVNET-JOB-SPOOL.txt
- docs/VOID-DEVNET-PROTOCOL-STATE.json

For each job:

- If status_raw = 1 (Posted) and hasResult = false:
  - Calls agent-OS to:
    - claim job (as DEV_AGENT_ADDR)
    - write ReceiptRegistry entry
    - complete job on JobQueue
- Skips jobs already in HAS_RECEIPTS

**Dump jobs**

- void-devnet-dump-jobs.sh

Loops over SPOOL and prints:

- job #N: <jobId>  
- status: … (e.g. HAS_RECEIPTS)  
- receiptIds: [0x…] when present

**Dump receipts**

- void-devnet-dump-receipts.sh

For each job in SPOOL:

- Looks up receipt IDs
- Prints decoded receipt fields:
  - jobId
  - receiptId
  - agent address
  - modelId
  - input/output/model/result hashes
  - chainId
  - timestamp
  - status

---

## 4. One-shot run: manifest → job → receipt → coverage

High-level one-button flow:

1. Create manifest from prompt  
2. Post job from manifest  
3. Sweep jobs with agent-OS  
4. Recompute coverage  
5. Inspect manifest → job → receipts

We wrap that in:

- void-devnet-manifest-run.sh

Example:

- Set env:

  - RPC_URL="http://127.0.0.1:8545"  
  - DEVNET_PRIVKEY='<devnet private key>'

- Then run:

  ~/.local/bin/void-devnet-manifest-run.sh "demo: write a haiku about Void devnet vN"

That script:

1. Calls void-devnet-make-manifest.sh
2. Calls void-devnet-post-manifest-job.sh
3. Calls void-devnet-agent-sweep.sh
4. Calls void-devnet-coverage.sh
5. Calls void-devnet-manifest-inspect.sh on the new manifest

End result:

- jobs_total and receipts_total incremented
- void_devnet_coverage == 1
- manifest mapped to jobId in MANIFEST-INDEX
- job in HAS_RECEIPTS state

---

## 5. Quick status dashboard (ops helper)

We have an ops helper under ops/:

- ops/void-devnet-status.sh

Usage:

- cd ~/dev/void-node  
- ./ops/void-devnet-status.sh

It prints:

1. Repo + RPC_URL
2. Job spool path and jobs_in_spool
3. Coverage snapshot (void_devnet_coverage.prom)
4. Tail of VOID-DEVNET-MANIFEST-INDEX.txt (latest manifest → job pairs)
5. Compact job summary via void-devnet-dump-jobs.sh

This is the top-level sanity check for the devnet agent pipeline.

---

## 6. Typical workflows

### 6.1 Run a new demo job from a prompt

1. One-shot run:

   cd ~/dev/void-node  
   export RPC_URL="http://127.0.0.1:8545"  
   export DEVNET_PRIVKEY='0x…'  

   ~/.local/bin/void-devnet-manifest-run.sh "demo: write a haiku about Void devnet vX"

2. Status:

   ./ops/void-devnet-status.sh

You should see:

- coverage=1
- jobs_total and receipts_total bumped
- New `<manifest> <jobId>` in MANIFEST-INDEX
- New job in job summary with HAS_RECEIPTS

### 6.2 Inspect the latest manifest

   cd ~/dev/void-node  
   MANIFEST=$(ls -1t docs/VOID-DEVNET-MANIFESTS/VOID-DEVNET-MANIFEST-*.json | head -1)  
   ~/.local/bin/void-devnet-manifest-inspect.sh "$MANIFEST"

Shows:

- prompt
- jobId
- status
- decoded receipt(s)

---

## 7. Future upgrades (notes)

Potential upgrades for this pipeline:

- Real model IO:
  - Replace fixed INPUT/OUTPUT/RESULT hashes with actual LLM calls
  - Compute hashes over real prompt + response payload
- Persistence:
  - Local per-job log dir with:
    - manifest JSON
    - full model response
    - receipt metadata
- Monitoring:
  - Prometheus rules/alerts on:
    - void_devnet_coverage_health == 0
    - jobs advancing without receipts
    - last receipt timestamp going stale

For now the devnet pipeline is functionally complete:
on-chain jobs, off-chain agent, receipts, and coverage gauges.
