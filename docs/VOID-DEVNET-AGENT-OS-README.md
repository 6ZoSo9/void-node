# VOID Devnet – Agent OS Loop (v0)

This describes the current **devnet-only** VOID Agent OS loop.
It is a working prototype, not the final mainnet design.

---

## 1. On-chain pieces (devnet)

All addresses live in:

- docs/VOID-DEVNET-PROTOCOL-STATE.json

Contracts:

- AdminGate          – dev admin / master-key stand-in.
- ModelRegistry      – tracks models (e.g. "void-demo-llm-1").
- DatasetRegistry    – tracks datasets (not used heavily yet).
- JobQueue           – on-chain job registry for AI work.
- AgentRegistry      – which agents are authorized for which models.
- ReceiptRegistry    – on-chain receipts for job results.

Devnet constants:

- chainId = 2050
- Dev admin / dev agent EOA:
  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

---

## 2. Core scripts

### 2.1 System deploy (one-time per fresh devnet)

Script:

- ops/void-devnet-system-deploy.sh

Behavior:

- Deploys AdminGate, ModelRegistry, DatasetRegistry, JobQueue, AgentRegistry, ReceiptRegistry.
- Writes canonical state to:
  docs/VOID-DEVNET-PROTOCOL-STATE.json

You have already run this and are in a green state.

---

### 2.2 Posting jobs (simple payload)

Script:

- ~/.local/bin/void-devnet-post-job.sh

What it does:

- Reads JobQueue address from:
  docs/VOID-DEVNET-PROTOCOL-STATE.json
- Posts a job with:
  APP_ID   = "void-demo-app-1"
  MODEL_ID = "void-demo-llm-1"
  PAYLOAD_HASH = random-ish keccak for now (dev only)
- Appends the new jobId to:
  docs/VOID-DEVNET-JOB-SPOOL.txt

This is the **stable, supported** posting path right now.

Typical usage:

  export RPC_URL="http://127.0.0.1:8545"
  export DEVNET_PRIVKEY='<dev-key>'
  ~/.local/bin/void-devnet-post-job.sh

---

### 2.3 Agent OS – process jobs

Single-job mode:

- ~/.local/bin/void-agent-os-devnet.sh
  (expects JOB_ID exported in the environment)

Sweep mode (what you actually use):

- ~/.local/bin/void-devnet-agent-sweep.sh

Sweep behavior:

1. Reads protocol state from:
   docs/VOID-DEVNET-PROTOCOL-STATE.json
2. Iterates jobIds in:
   docs/VOID-DEVNET-JOB-SPOOL.txt
3. For each jobId:
   - Reads status and result from JobQueue.
   - If status == Posted:
       claim job as DEV_AGENT_ADDR.
   - If status == Claimed and no result:
       submit a new ReceiptRegistry entry.
   - If status == Completed and hasResult == true:
       skip (already done).

Dev constants used by the agent:

- MODEL_ID   = "void-demo-llm-1"
- INPUT_HASH  = fixed keccak("void-demo-job-1:input")
- OUTPUT_HASH = fixed keccak("void-demo-job-1:output")
- MODEL_HASH  = fixed keccak("void-demo-llm-1:v0.1")
- RESULT_HASH = fixed keccak("void-demo-result:v0")

These are placeholders; real mainnet will use actual manifests / payloads.

End result:

- Every posted devnet job eventually has:
  - A ReceiptRegistry entry.
  - A completed JobQueue status with RESULT_HASH filled.

---

## 3. Coverage script and metrics

Script:

- ~/.local/bin/void-devnet-coverage.sh

Behavior:

1. Reads JobQueue and ReceiptRegistry addresses from protocol state.
2. Counts:
   - total jobs on devnet.
   - total receipts recorded.
3. Computes:
   coverage = receipts / max(jobs, 1).
4. Writes a node-exporter textfile to:
   ~/.cache/node-exporter-textfile/void_devnet_coverage.prom
   (and your pipeline mirrors this into /var/lib/node_exporter/textfile_collector)

Metrics exposed:

- void_devnet_jobs_total{chain="devnet"}
- void_devnet_receipts_total{chain="devnet"}
- void_devnet_coverage{chain="devnet"}        (float 0..1)
- void_devnet_coverage_health{chain="devnet"} (1 if jobs == receipts, else 0)

You already installed a Prometheus alert:

- Fires when void_devnet_coverage_health == 0 for some window:
  "there are jobs without matching receipts".

---

## 4. Normal devnet operator flow

Environment:

  cd ~/dev/void-node
  export RPC_URL="http://127.0.0.1:8545"
  export DEVNET_PRIVKEY='<dev-key>'

1. Post jobs:

  ~/.local/bin/void-devnet-post-job.sh
  ~/.local/bin/void-devnet-post-job.sh
  (run as many times as you want)

2. Sweep with the agent OS:

  ~/.local/bin/void-devnet-agent-sweep.sh

3. Check coverage:

  RPC_URL="http://127.0.0.1:8545" ~/.local/bin/void-devnet-coverage.sh
  sed -n '1,40p' ~/.cache/node-exporter-textfile/void_devnet_coverage.prom

Healthy output looks like:

- void_devnet_jobs_total{chain="devnet"} N
- void_devnet_receipts_total{chain="devnet"} N
- void_devnet_coverage{chain="devnet"} 1
- void_devnet_coverage_health{chain="devnet"} 1

If coverage < 1:

- There are more jobs than receipts.
- Run the sweep again or debug JobQueue / ReceiptRegistry.

---

## 5. Manifest jobs (experimental)

You also have:

- ~/.local/bin/void-devnet-make-manifest.sh
- ~/.local/bin/void-devnet-post-manifest-job.sh

Current status:

- make-manifest works and writes JSON under:
  docs/VOID-DEVNET-MANIFESTS/
- post-manifest-job currently reverts with a bare 0x
  (some require() in the JobQueue path is failing).

Conclusion:

- Manifest-based jobs are **not** part of the stable devnet path yet.
- The canonical, working path is:
  simple payload job -> Agent OS sweep -> ReceiptRegistry coverage == 1.

This README captures the working v0 loop so we do not lose it in shell history.
