# Obelisk + VOID Mainnet — Quickstart (Draft)

This is a **user-facing** quickstart for the early VOID mainnet era.

It explains, at a high level, how people will:

- Install Obelisk,
- Connect to VOID mainnet,
- Hold VOID,
- And eventually stake / run validators.

This doc is **non-binding** and will evolve as code lands.

---

## 0. Obelisk tiers (reminder)

We have three wallet tiers:

- **Obelisk Lite (Browser Plugin)**
  - Lightweight browser extension.
  - Basic signing, viewing balances, submitting transactions.
- **Obelisk Mobile (Core App)**
  - Android / iOS.
  - Main user identity hub.
  - Will be the long-term control plane for validators and dApps like NullFeed.
- **Obelisk Titan (Desktop Heavy Wallet)**
  - Desktop app for power users and validators.
  - Integrates with local VOID nodes.
  - Uses hardware (CPU/GPU) for compression, encryption, proofs, and AI helpers.

This quickstart is written for the **mainnet launch window**, where:

- Titan is the **primary** path to run validators.
- Lite / Mobile focus mainly on **holding and basic sending**.
- Delegation and remote-control validator flows land later.

---

## 1. Getting VOID on mainnet (user view)

### 1.1 Install Obelisk Lite or Mobile

At mainnet, the user paths will look roughly like:

- Desktop users:
  - Install Obelisk Lite in the browser.
  - Optionally later install Obelisk Titan for heavy stuff.
- Phone users:
  - Install Obelisk Mobile from the app store.

All of them:

- Create a fresh Obelisk wallet (seed / keypair).
- Back up the recovery phrase OFFLINE (paper, metal, etc).
- Never share it with anyone.

### 1.2 Add VOID mainnet to wallet

Obelisk will have VOID mainnet pre-configured:

- Chain ID: **2050**
- Network: **VOID Mainnet**

User:

- Opens "Networks" in Obelisk.
- Selects **VOID Mainnet (2050)**.
- Sees:
  - Their VOID address.
  - Balance (0 to start).

### 1.3 Receive VOID

User can receive VOID by:

- Copying their address from Obelisk.
- Sharing it with:
  - Exchanges (when listed).
  - Friends.
  - Faucet / early distribution programs (if any exist).

Once received:

- Balance updates in Obelisk.
- They can:
  - Send VOID to others.
  - Interact with dApps on VOID.

At this stage, **no validators are required** — a basic user just needs a wallet and a working RPC endpoint.

---

## 2. Running a validator — high-level

> This section is for people who want to help secure VOID and earn rewards.

For the mainnet launch window, validator path is:

- **Titan + local node** for serious operators.
- Phone / browser mainly for monitoring and signing (later).

### 2.1 Requirements (rough)

A validator should have:

- A machine that can run:
  - `void-node` (full node)
  - And Obelisk Titan on top of it (or next to it).
- Stable internet.
- SSD storage.
- Some minimum amount of VOID to stake (defined by mainnet params).

We will publish a concrete hardware checklist closer to launch.

---

## 3. Flow: from holder → validator (Titan-first)

This is the user story we are designing for.

### 3.1 Install Obelisk Titan

- Download Obelisk Titan for your OS (Linux/Windows/macOS).
- Install and open it.

Titan will either:

- Import an existing Obelisk wallet (Lite/Mobile), or
- Create a new wallet.

In all cases:

- Private keys are stored locally only.
- Titan never uploads keys to a server.

### 3.2 Connect Titan to a VOID node

There are two modes:

1. **Local node**
   - User runs `void-node` on the same machine.
   - Titan connects to `http://127.0.0.1:<port>`.

2. **Remote node (advanced)**
   - Titan connects to a self-hosted remote node.
   - Requires secure RPC configuration and auth.

Mainnet launch will focus on **local node + Titan** as the safest, most observable path.

### 3.3 Check node health

Before staking, Titan will:

- Check that the node is:
  - Synced (head lag small).
  - Healthy (txroot / header3 / seals exporters OK).
- Display a simple status:
  - ✅ Healthy and synced
  - ⚠️ Catching up
  - ❌ Unhealthy

Titan will **not** allow staking if:

- Node is badly out of sync, or
- Health exporters are reporting critical issues.

### 3.4 Stake VOID and become a validator

Once:

- User has enough VOID,
- Node is healthy,
- Titan is connected,

Titan will guide them through:

1. Choosing a stake amount.
2. Acknowledging slashing and uptime risks.
3. Approving VOID for the validator contract.
4. Sending a join transaction to the `ValidatorSet`.

After confirmation, the user becomes:

- `PENDING` or `ACTIVE` validator (depending on protocol details).

Titan will show:

- Staked amount.
- Status.
- Basic performance stats (later hooked to Prometheus-based exporters).

---

## 4. Monitoring + rewards

Titan will provide a **Validator dashboard**:

- Shows for each validator tied to this wallet:
  - Status (ACTIVE / PENDING / EXITING / SLASHED).
  - Staked amount.
  - Pending rewards.
  - Health summary (uptime / missed duties / head lag).

When ready, Titan will let users:

- **Claim rewards** via a clear, single button (with gas preview).
- Optionally open a **Grafana dashboard** for deep metrics.

Mobile / Lite will:

- Start as **read-only** views for validator info.
- Later gain “approve TX from phone” flows to sign stake/claim/exit TXs that Titan prepares.

---

## 5. Safety rules and expectations

For mainnet launch we enforce a few ground rules:

1. **No hidden staking.**
   - There should never be a “one click” stake that hides risk.
   - UI must explain slashing / uptime obligations.

2. **No accidental testnets.**
   - Obelisk must clearly label VOID Devnet / Safeboot vs VOID Mainnet.
   - Validator actions on safeboot are always opt-in “testing mode”.

3. **Clear separation:**
   - User balance.
   - Validator stake.
   - Rewards.

4. **No secret cloud validators.**
   - Official docs will steer users toward:
     - Hardware they control, or
     - Well-understood hosting with explicit trade-offs.

---

## 6. Later additions (after mainnet launch)

Once mainnet is running and stable, we layer on:

- **Delegation / pooling:**
  - Users will delegate to validators without running one.
- **Mobile control-plane:**
  - Obelisk Mobile becomes the primary control/alert surface.
- **AI helpers:**
  - Titan can use local/remote AI agents to:
    - Analyze validator performance.
    - Recommend configuration changes.
    - Generate human-readable health summaries.

This quickstart is an anchor so we build Obelisk in a way that is:

- Honest about risk,
- Clear for non-experts,
- And aligned with VOID’s AI-first, validator-friendly design.
