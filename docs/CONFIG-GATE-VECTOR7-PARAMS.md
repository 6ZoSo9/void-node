# VOID Network – ConfigGate Parameters for WAL & Vector7 (v1 draft)

This document defines the **canonical ConfigGate keys** for WAL and Vector7
(memory/pressure) guardrails on VOID (chainId 2050).

These keys live in **ConfigGate** and are read by:
- `void-node` (WAL + Vector7 guardrails),
- off-chain agents (autoscaling, SRE, alert tuning),
- future on-chain agents that need global limits.

All keys are referenced on-chain as `bytes32`:
- Off-chain, we use plain text names (below).
- When setting on ConfigGate, we pass `bytes32 key = keccak256(bytes(name))`.

---

## 1. WAL pressure parameters

These govern the WAL / disk pressure guardrails and Vector7’s interaction with them.

### 1.1 WAL_MAX_PRESSURE_SOFT

- **Name (string)**: `WAL_MAX_PRESSURE_SOFT`
- **Type**: `uint256`
- **Meaning**: Soft cap for WAL "pressure" score. Above this, node/agents start
  taking *gentle* actions (slowing proposer, nudging GC).
- **Unit**: implementation-defined "pressure units" (e.g. normalized 0–1000).
- **Suggested initial**: `700`
- **Usage**:
  - Node exporters / Vector7 monitor compare current WAL pressure against this.
  - Alerts fire if sustained above soft cap for too long.

### 1.2 WAL_MAX_PRESSURE_HARD

- **Name (string)**: `WAL_MAX_PRESSURE_HARD`
- **Type**: `uint256`
- **Meaning**: Hard cap for WAL pressure. Above this, node should aggressively
  shed load / enable stronger guardrails (reject new jobs, slow proposer, etc.).
- **Unit**: same units as `WAL_MAX_PRESSURE_SOFT`.
- **Suggested initial**: `900`
- **Usage**:
  - Vector7 guard can flip into "defensive mode".
  - Alerts classify this as higher severity.

### 1.3 WAL_GC_INTERVAL_SECS

- **Name (string)**: `WAL_GC_INTERVAL_SECS`
- **Type**: `uint256`
- **Meaning**: Target interval between WAL GC passes (or compaction sweeps).
- **Unit**: seconds.
- **Suggested initial**: `60` (1 minute).
- **Usage**:
  - Node/agents can use this as a hint for when to run cleanup tasks under load.

---

## 2. Vector7 memory / DoS guard parameters

These control the **Vector7 (V7)** guardrails: memory, queue size, and per-source limits.

### 2.1 V7_MEM_PRESSURE_WARN

- **Name (string)**: `V7_MEM_PRESSURE_WARN`
- **Type**: `uint256`
- **Meaning**: Soft memory pressure watermark for Vector7. Above this, V7 starts
  declining non-critical work or delaying heavy tasks.
- **Unit**: percentage *100 (e.g. 7500 = 75.00%), or normalized units – must match implementation.
- **Suggested initial**: `7500` (75.00%).
- **Usage**:
  - Exporters surface current V7 pressure vs this threshold.
  - Alert severity "warning".

### 2.2 V7_MEM_PRESSURE_CRIT

- **Name (string)**: `V7_MEM_PRESSURE_CRIT`
- **Type**: `uint256`
- **Meaning**: Critical memory pressure watermark. Above this, V7 should aggressively
  drop / refuse new work to keep the node alive.
- **Unit**: same as `V7_MEM_PRESSURE_WARN`.
- **Suggested initial**: `9000` (90.00%).
- **Usage**:
  - Alerts at "critical".
  - Node behavior: reject new heavy jobs, prioritize block sealing over agents.

### 2.3 V7_MAX_QUEUE_GLOBAL

- **Name (string)**: `V7_MAX_QUEUE_GLOBAL`
- **Type**: `uint256`
- **Meaning**: Upper bound on the **global Vector7 job queue size**.
- **Unit**: number of jobs.
- **Suggested initial**: `1000`.
- **Usage**:
  - Schedulers refuse to enqueue beyond this; agents see "queue full" status.

### 2.4 V7_MAX_QUEUE_PER_SOURCE

- **Name (string)**: `V7_MAX_QUEUE_PER_SOURCE`
- **Type**: `uint256`
- **Meaning**: Per-source cap (per wallet / per agent ID) on queued jobs.
- **Unit**: number of jobs.
- **Suggested initial**: `50`.
- **Usage**:
  - Prevents a single source from consuming all Vector7 capacity.

---

## 3. AI / agent-related guard parameters

These govern global agent concurrency and safety for AI-heavy workloads.

### 3.1 AI_AGENT_MAX_JOBS

- **Name (string)**: `AI_AGENT_MAX_JOBS`
- **Type**: `uint256`
- **Meaning**: Global max concurrent agent jobs across this node.
- **Unit**: number of jobs.
- **Suggested initial**: `256`.
- **Usage**:
  - Agent scheduler refuses new jobs when total active >= this threshold.

### 3.2 AI_AGENT_MAX_PENDING_PER_NODE

- **Name (string)**: `AI_AGENT_MAX_PENDING_PER_NODE`
- **Type**: `uint256`
- **Meaning**: Hard cap on "pending but not yet started" jobs on this node.
- **Unit**: number of jobs.
- **Suggested initial**: `1024`.
- **Usage**:
  - Protects memory and WAL from unbounded backlog of future tasks.

### 3.3 AI_MODEL_REGISTRY

- **Name (string)**: `AI_MODEL_REGISTRY`
- **Type**: `address`
- **Meaning**: Address of the on-chain ModelRegistry contract (Phase 3+).
- **Unit**: `address`.
- **Suggested initial**: `0x0000000000000000000000000000000000000000` until deployed.
- **Usage**:
  - Agents / nodes can lookup model configs, licensing, and PoP policies.

---

## 4. How nodes & agents will consume ConfigGate (v1 plan)

In v1, `void-node` does **not** read ConfigGate directly yet. Instead:

1. We define keys and semantics here (this file).
2. Governance (via AdminGate) sets these values on ConfigGate on-chain.
3. A future step will add:
   - A small off-chain **config poller/adapter** that:
     - Reads ConfigGate via RPC.
     - Publishes a local JSON/config file or textfile metrics.
   - Node + agents read from that local source to configure:
     - WAL thresholds,
     - Vector7 watermarks,
     - Agent queue limits.

This separation keeps the chain **live and permissionless** while allowing
the MasterKey + gates to standardize safety parameters across the network.

