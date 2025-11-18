# VOID Devnet – Jobs and Manifests (v1)

This doc explains how **jobs** and **manifests** work on VOID devnet (chainId 2050):

- How users/apps post jobs (direct vs manifest-based)
- How we track them on disk (spool + manifest index)
- How the agent-OS and metrics scripts see the world

This is **DEVNET ONLY**. Mainnet design will change, but this is the canonical reference for what’s running on your box right now.

---

## 1. Core pieces

On-chain (from `docs/VOID-DEVNET-PROTOCOL-STATE.json`):

- `chainId = 2050`
- `JobQueue` – registry of jobs for agents
- `ReceiptRegistry` – registry of job receipts
- `AgentRegistry` – which EOAs can act as agents
- `ModelRegistry` – model directory (stubbed for devnet)
- `AdminGate` – admin for the system contracts (devnet-only wiring)

Off-chain (filesystem):

- `docs/VOID-DEVNET-JOB-SPOOL.txt` – local list of jobIds we care about
- `docs/VOID-DEVNET-MANIFESTS/` – JSON manifests created from prompts
- `docs/VOID-DEVNET-MANIFEST-INDEX.txt` – mapping: manifest path → jobId
- `~/.cache/node-exporter-textfile/void_devnet_coverage.prom` – coverage metrics

Helper scripts (installed under `~/.local/bin`):

- `void-devnet-make-manifest.sh`
- `void-devnet-post-job.sh`
- `void-devnet-post-manifest-job.sh`
- `void-devnet-agent-sweep.sh`
- `void-devnet-coverage.sh`
- `void-devnet-dump-jobs.sh`
- `void-devnet-dump-receipts.sh`
- `void-devnet-manifest-inspect.sh`
- `void-devnet-manifest-run.sh`

---

## 2. Job spool

**File:** `docs/VOID-DEVNET-JOB-SPOOL.txt`

- One `jobId` (0x…) per line.
- Only includes jobs posted *via our helper scripts* (older hand-posted jobs may exist on-chain but not in the spool).
- Used by:
  - `void-devnet-agent-sweep.sh` – to know which jobs to consider.
  - `void-devnet-dump-jobs.sh` / `void-devnet-dump-receipts.sh` – for inspection.
  - `void-devnet-status.sh` – for summary output.

If a job is not in the spool but exists on-chain, it still counts in coverage; it just won’t be touched by the local sweep script.

---

## 3. Manifests

**Directory:** `docs/VOID-DEVNET-MANIFESTS/`

Each manifest is a JSON file that describes one *logical request* for an agent:

- Prompt (human text)
- Metadata (app/model IDs, etc.)
- Hash of the payload

Created by:

    cd ~/dev/void-node
    export RPC_URL="http://127.0.0.1:8545"
    export DEVNET_PRIVKEY='0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

    ~/.local/bin/void-devnet-make-manifest.sh "demo: write a haiku about Void devnet vN"

This writes a file like:

- `docs/VOID-DEVNET-MANIFESTS/VOID-DEVNET-MANIFEST-YYYYMMDDThhmmssZ.json`

and prints:

- `file=...`
- `hash=0x…` (manifest payload hash used as `PAYLOAD_HASH` when posting the job).

---

## 4. Manifest index

**File:** `docs/VOID-DEVNET-MANIFEST-INDEX.txt`

Purpose: tie each manifest to the jobId it created.

Format (one mapping per line):

- Either relative path:

      docs/VOID-DEVNET-MANIFESTS/VOID-DEVNET-MANIFEST-20251118T011602Z.json 0xed47...

- Or absolute path (older script behavior):

      /home/zoso/dev/void-node/docs/VOID-DEVNET-MANIFESTS/VOID-DEVNET-MANIFEST-20251118T012852Z.json 0x7c34...

Produced by:

- `void-devnet-post-manifest-job.sh`
- `void-devnet-manifest-run.sh` (which delegates to the above)

Consumers:

- `void-devnet-manifest-inspect.sh` – given a manifest, finds the jobId and dumps receipts.
- `void-devnet-manifest-run.sh` – final “step 5” inspection.

Rule: **every manifest we care about must have exactly one jobId mapping** in this file.

---

## 5. Posting jobs

### 5.1 Direct job post (no manifest)

Low-level script:

- `void-devnet-post-job.sh`

Inputs:

- `APP_ID`
- `MODEL_ID`
- `PAYLOAD_HASH`

Behavior:

- Calls `JobQueue.postJob(...)` on-chain.
- Prints `txHash` and `jobId`.
- Appends `jobId` to `docs/VOID-DEVNET-JOB-SPOOL.txt`.

This path is useful for synthetic tests where you don’t care about prompts/manifests.

### 5.2 Manifest-based post

Wrapper:

    MANIFEST=$(ls -1t docs/VOID-DEVNET-MANIFESTS/VOID-DEVNET-MANIFEST-*.json | head -1)
    ~/.local/bin/void-devnet-post-manifest-job.sh "$MANIFEST"

Behavior:

1. Reads addresses from `docs/VOID-DEVNET-PROTOCOL-STATE.json`.
2. Reads the manifest file and computes its payload hash.
3. Calls `void-devnet-post-job.sh` with:
   - `APP_ID=void-demo-app-1`
   - `MODEL_ID=void-demo-llm-1`
   - `PAYLOAD_HASH=manifest_hash`
4. Appends the returned `jobId` to `docs/VOID-DEVNET-JOB-SPOOL.txt`.
5. Writes manifest → jobId into `docs/VOID-DEVNET-MANIFEST-INDEX.txt`.

This is the preferred path for human-readable prompts on devnet.

---

## 6. Single-shot manifest run

Wrapper:

- `void-devnet-manifest-run.sh`

Usage:

    cd ~/dev/void-node
    export RPC_URL="http://127.0.0.1:8545"
    export DEVNET_PRIVKEY='0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

    ~/.local/bin/void-devnet-manifest-run.sh "demo: write a haiku about Void devnet v6 (rerun)"

Steps:

1. Create manifest from prompt (stores JSON file, prints `file` + `hash`).
2. Post job from that manifest (append to spool + manifest index).
3. Sweep jobs with agent-OS (claim, write receipt, complete job).
4. Recompute devnet coverage (writes `void_devnet_coverage.prom`).
5. Inspect manifest → job → receipts and print them.

When everything is healthy:

- Coverage remains `1`.
- Manifests have matching job entries in `VOID-DEVNET-MANIFEST-INDEX.txt`.
- Jobs in the spool show `status: HAS_RECEIPTS`.

---

## 7. Coverage metrics

Textfile:

- `~/.cache/node-exporter-textfile/void_devnet_coverage.prom`

Recompute and view:

    cd ~/dev/void-node
    export RPC_URL="http://127.0.0.1:8545"

    RPC_URL="$RPC_URL" ~/.local/bin/void-devnet-coverage.sh
    sed -n '1,40p' ~/.cache/node-exporter-textfile/void_devnet_coverage.prom

Key metrics:

- `void_devnet_coverage{chain="devnet"}` – jobs/receipts ratio in `[0,1]`.
- `void_devnet_jobs_total{chain="devnet"}` – total JobQueue entries.
- `void_devnet_receipts_total{chain="devnet"}` – total ReceiptRegistry entries.
- `void_devnet_coverage_health{chain="devnet"}`:
  - `1` if `jobs_total == receipts_total`
  - `0` otherwise.

Our invariant: keep `coverage_health == 1`.

---

## 8. Systemd + periodic sweep

User-level systemd:

- Service: `~/.config/systemd/user/void-devnet-agent-sweep.service`
  - Runs `void-devnet-agent-sweep.sh`
  - Then recomputes coverage
- Timer: `~/.config/systemd/user/void-devnet-agent-sweep.timer`
  - `OnBootSec=30s`
  - `OnUnitActiveSec=30s`

Enable and inspect:

    systemctl --user enable --now void-devnet-agent-sweep.timer
    systemctl --user list-timers 'void-devnet-agent-sweep*'
    journalctl --user -u void-devnet-agent-sweep.service -n 30 -o cat

When healthy:

- Newly posted devnet jobs are automatically claimed + receipted + completed.
- Coverage stays at 1 without manual sweeps.

---

## 9. Devnet vs mainnet notes

Devnet behavior:

- Uses a public Foundry dev key (hard-coded in examples).
- Uses local RPC (`http://127.0.0.1:8545`).
- Scripts are shell wrappers and *not* security hardened.

Mainnet VOID will:

- Use real VOID chain (still chainId 2050).
- Use UpdateGate / ConfigGate / AdminGate with master-key governance.
- Require attested agents and real model calls.
- Keep the same shape:
  - Prompt → Manifest → Job → Receipt → Metrics.

For now, this document is the **ground truth** for jobs + manifests on VOID devnet.
