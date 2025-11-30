# VOID — Obelisk Wallet Validator Plan (Draft v0)

Status: DRAFT (pre-mainnet)  
Scope: High-level architecture for running validators from Obelisk Wallet tiers (Lite, Mobile, Titan) without touching v99 core.

---

## 1. Goals

- Let **normal users** help secure VOID with **wallet-driven validators**, not just rack servers.
- Keep **core consensus logic** and **on-chain rules** unchanged (v99 freeze respected).
- Make validator UX **wallet-first**:
  - Obelisk Mobile: “phone validator” / light or duty-cycled validator.
  - Obelisk Lite (browser): mostly delegate / observer, not an actual block producer.
  - Obelisk Titan (desktop): full validator / heavy node.

- Enforce:
  - Strong **key separation** (spend keys vs validator keys).
  - **Slashing-aware UX** (never let a user accidentally double-sign / go offline).
  - **Minimal trust** in server infra (encryption-first, chain-verified behavior).

---

## 2. Roles and Key Types (Validator Side)

We will treat validator operation as a **separate key role** from normal spending:

- **Validator Key** (VK):
  - Lives in Obelisk Wallet (hardware-backed/storage-backed where possible).
  - Only signs:
    - Precommit / commit messages.
    - Block proposals (if selected leader).
    - Heartbeats / liveness proofs (optional later).

- **Spending Key**:
  - Controls BALANCE of the validator (stake, rewards).
  - Must NOT be the same as VK.
  - Can exist on a different device or hardware wallet.

- **Ops Key (optional)**:
  - Used for:
    - Updating validator metadata.
    - Rotating VK.
    - Configuring auto-withdraw / reward sweep policies.

The chain (ValidatorSet contract + RewardEngine) will already understand:
- Who is a validator.
- How much stake is bonded.
- What penalties / rewards apply.

Obelisk Wallet will just *drive* that through RPC + local keys.

---

## 3. Tiers

### 3.1 Obelisk Titan (Desktop Heavy Wallet)

**Target:** Power users, validators, operators.  
**Model:** Full validator on local machine.

- Runs:
  - Full `void-node` instance (HTTP/P2P ports).
  - Local Prometheus node_exporter and VOID exporters.
  - Obelisk Titan app talks to localhost HTTP API + Prom exporters.

- Validator behavior:
  - Titan holds/derives the validator key (or uses external hardware).
  - Titan app:
    - Monitors liveness, head, txroot, last-mile metrics.
    - Warns if node is behind or misbehaving.
    - Drives configuration of:
      - Stake.
      - Auto-withdrawal rules.
      - UpdateGate/AdminGate-related preferences (where appropriate).

This is basically what we already have in practice: you are Titan.

### 3.2 Obelisk Mobile (Phone Validator)

**Target:** Normal users who want to contribute to security with their phone.

We **do not** want phones doing full heavy consensus 24x7 like a rack box. We want:

- **Duty-cycled**, low-cost modes:
  1. **“Micro-Validator” Mode (Light Duties):**
     - Phone participates in:
       - Attestations.
       - Randomized committees for certain slots/epochs.
       - Low bandwidth signing (no full mempool/blocks).
     - Heavily optimized for battery + data usage.
  2. **“Delegated Validator” Mode:**
     - Phone *holds the validator key* and:
       - Remotely instructs a heavier node (Titan or hosted) via:
         - Signed policies.
         - EIP-712 instructions for job/validator behavior.
     - Heavy node does the block production / gossip, but
       - Proofs and actions are authorized by phone-held VK with strict policies.

**Core idea:** The validator key lives in Obelisk Mobile, not on the server. The server acts as a “validator engine” which can only do what the phone pre-authorizes, with revocable policy.

**Key components:**

- **PolicyGuard for Validators (v2 concept):**
  - Capability tokens stating:
    - What this engine can sign for you (which consensus role, what rate).
    - Time bounds (epoch ranges).
    - Slashing constraints.
  - Stored off-chain, committed on-chain (or referenced by JobQueue).

- **Phone Behavior:**
  - Generates validator policy (e.g., “Titan at home can propose + attest on my behalf, but only up to N risk conditions, only for epochs X..Y”).
  - Signs policy with validator key (VK).
  - Pushes policy via:
    - WalletOracle / JobQueue path, or
    - Direct REST to a trusted engine running on the user’s own hardware.

- **Engine Behavior (e.g., Titan at home):**
  - Reads policy.
  - Runs:
    - Local `void-node`.
    - Attaches to consensus.
  - Only issues validator signatures within the allowed policy window.
  - Exposes Prometheus metrics that Obelisk Mobile can poll (or receive pushes via notifications).

This lets someone with **only a phone** still be a validator:
- Phone = secure key island.
- Titan node / small NUC / mini-server = actual network participant.

### 3.3 Obelisk Lite (Browser Extension)

**Target:** Web dApp users.

- Mainly:
  - Transaction signing.
  - Data compression/encryption + commitments.
  - Agent job submission (JobQueue).

- Validator usage:
  - Can view validator status.
  - Can initiate:
    - **Stake / Unstake**.
    - Delegate to their own phone/Titan.
  - But **should not** hold validator keys in-extension (too fragile).

---

## 4. Slashing and Safety Model

We must assume:

- Phone can:
  - Lose power.
  - Lose network.
  - Be stolen.
- Desktop can:
  - Crash.
  - Lose disk.
  - Get owned if OS compromised.

Therefore:

1. **Validator key separation**:
   - VK is distinct from staking/spend keys.
2. **Easy emergency “STOP” button in Obelisk:**
   - Phone can broadcast:
     - “Pause my validator.”
     - “Revoke all validator policies.”
   - On-chain and off-chain representation:
     - On-chain: flag / epoch boundary state in ValidatorSet.
     - Off-chain: discard policies, stop engine services.
3. **Slashing-aware alerts:**
   - Obelisk Mobile:
     - Watches liveness/health metrics (via Prometheus or light gossip).
     - If node drifts or forks:
       - Warn user.
       - Optionally auto-pause validator participation.

---

## 5. Data + Metrics Flow (Validator UX)

For each validator (regardless of tier), we want:

- **Core metrics** exposed in a consistent way:
  - `validator_liveness` (1/0).
  - `validator_head_gap` (vs chain tip).
  - `validator_downtime_seconds` over last X epochs.
  - `validator_slash_risk` (derived from abnormal behavior flags).
  - Reward rates, effective stake, etc.

- **Obelisk Wallet** pulls or subscribes to these:
  - Titan: from local Prometheus or embedded metrics endpoint.
  - Mobile: via:
    - Call to user’s Titan over Tor/VPN/DDNS.
    - Or via VOID-hosted, encryption-first relayer that just tunnels metrics (no decryption of keys).

- **UI in Obelisk:**
  - Simple traffic-light view:
    - Green: healthy, earning rewards.
    - Yellow: behind / at risk / pending slash windows.
    - Red: offline / misconfigured / slashed.

This design aligns with your existing pillars model:
- We basically have a **“validator pillar” per user**:
  - `void_validator_<id>_health`.
  - `void_validator_<id>_liveness`.
  - `void_validator_<id>_slashing_risk`.

Obelisk is the personal Grafana.

---

## 6. Next Implementation Steps (Post-Mainnet-Core)

We will NOT implement all this before mainnet launch. Minimal path:

1. **Mainnet v1:**
   - Validators are run like your current Titan setup:
     - Full void-node.
     - Systemd units.
     - Prometheus metrics.
   - Obelisk wallets:
     - Only act as “remote controllers”:
       - Set stake.
       - View basic validator state.

2. **Obelisk Validator v0 (after mainnet stable):**
   - Define on-chain validator metadata fields (already mostly covered in ValidatorSet).
   - Add:
     - A simple `ValidatorPolicy` struct (even if not enforced yet).
   - Implement:
     - Textfile exporter(s) that expose per-validator metrics using your existing pillar approach.
   - Wire Obelisk Titan to:
     - Show validator status.
     - Control proposer toggle / participation lazily.

3. **Obelisk Mobile Delegated Validator (v1):**
   - Implement:
     - Capability-style policies signed by VK.
   - Run:
     - A small validator engine on Titan / NUC that obeys these policies.
   - Obelisk Mobile:
     - Holds VK.
     - Issues new policies.
     - Can revoke policies.

4. **Phone-Only Micro-Validator (v2+):**
   - Only after we have:
     - Proven stable mainnet.
     - Good understanding of consensus workload and bandwidth.
   - Design:
     - Minimal block headers / committee participation protocol.
   - Implement:
     - Light-client-style validator slots where phones only sign specific messages but do not host full mempool/SegStore.

---

## 7. Constraints and Non-Goals

- We are **not** changing v99 core consensus rules to “make phones fit”.
  - Instead: we add adaptor layers + PolicyGuard constructs around existing ValidatorSet.
- We are **not** centralizing:
  - No third-party validator-as-a-service that holds your validator key.
  - Engines can run on your own PC/NUC/cloud, but keys live in Obelisk.

- We must:
  - Keep everything **encryption-first**.
  - Avoid introducing any hidden control plane that can pause/upgrade validators without UpdateGate/AdminGate.

