# VOID Mainnet – Allocation & Account Classes (v0.1)

> Companion to `docs/VOID-MAINNET-GENESIS-SPEC.md`.  
> Genesis spec describes **what** exists at height 0.  
> This file describes **who** is allowed to hold what, and under which rules.

---

## 1. Goals

We want a mainnet allocation that is:

- **Transparent** – no hidden premines, no mystery wallets.
- **Operational** – enough supply in the right hands to actually run the network.
- **Defensible** – easy to explain in a short paragraph to exchanges, auditors, and users.
- **Chain-aligned** – matches chainId **2050** and the governance story in `UpdateGate` / `AdminGate`.

This document is **policy**, not code. Genesis tooling must refuse to produce a file
that violates the invariants here once they’re finalized.

---

## 2. Supply & Denominations (high-level only)

We deliberately **do not** lock exact numbers yet. This section only fixes structure.

- **Native token**: `VoidStones` (`$VOID`)
- **ChainId**: `2050` (already fixed)
- **Smallest unit**: `wei_VOID` (1e-18 VOID, analogous to ETH wei)
- **Initial supply at height 0**: `TBD_INITIAL_SUPPLY`
  - Exact value and breakdown will be set in a later revision.
  - MUST be fully accounted for by the account classes in §3.

Constraints (once numbers are chosen):

- Sum of all allocations at genesis MUST equal `INITIAL_SUPPLY`.
- No account may receive a negative or implicit allocation.
- No “off-ledger” IOUs; every promise must correspond to a concrete address or be out of scope.

---

## 3. Account Classes at Genesis

We group all human/contract recipients into classes. Concrete addresses will be
filled in later (and tracked in a separate `VOID-MAINNET-ALLOCATION-TABLE.json`).

### 3.1 Protocol / Governance Core

Purpose: keep the chain operable and upgradable without being able to steal user funds.

Classes:

1. **AdminGate / MasterKey contracts**
   - Purpose: own **governance**, not treasury. No arbitrary draining of user balances.
   - Allowed to:
     - Change protocol parameters via `UpdateGate` / manifests.
     - Move *governance-scoped* funds (e.g., upgrade bonds, protocol reserves).
   - NOT allowed to:
     - Seize arbitrary user funds.
     - Mint unbounded new supply.

2. **Protocol Reserve / Safety Fund**
   - Address(es) earmarked for:
     - Emergency recovery operations (chain halts, migrations, etc.).
     - Covering bugs that require on-chain remediation.
   - Policy:
     - Movements must be on-chain visible and justified (e.g., via `UpdateGate` event log).

> **Status**: exact addresses & percentages = **TBD** (v0.1).

---

### 3.2 Validators / Operators

Purpose: enable liveness and security from day one.

Classes:

1. **Genesis Validators / Core Operators**
   - Receive enough VOID to:
     - Post required bonds / stakes.
     - Run nodes and pay gas for maintenance.
   - Invariant:
     - No single operator (person or org) should control a majority of internal
       validator allocation at genesis.

2. **Infra / Observability Operators (non-validators)**
   - Optional addresses that run explorers, monitoring, public RPC, etc.
   - May receive small allocations for bootstrapping infra, but not protocol-level privileges by default.

> **Status**: list of operators, their addresses, and allocations = **TBD**.

---

### 3.3 Ecosystem & Grants

Purpose: grow the VOID ecosystem over years, not weeks.

Classes:

1. **Ecosystem Fund**
   - Multi-sig or contract that funds:
     - Grants, bounties, audits.
     - AI agent / model integrations.
     - Obelisk Wallet / NullFeed / tooling.
   - Strong expectations:
     - On-chain transparency for large outflows.
     - Published criteria for grants.

2. **R&D / Labs Allocation**
   - Long-term funding for VOID-Labs-style internal development.
   - Optionally vested via smart contracts (cliff + linear vest).

> **Status**: % of supply and vesting schedule = **TBD** (will be nailed down before mainnet launch).

---

### 3.4 Community, Users, and Liquidity

Purpose: get VOID in the hands of real users and give markets enough liquidity.

Classes:

1. **Community / Airdrop / Rewards Pool**
   - For:
     - Early community members.
     - Builders & testers.
     - Incentives for running nodes, agents, or storing data.
   - Will likely be governed by on-chain programs or grants.

2. **Liquidity / MM Pool(s)**
   - VOID allocated to bootstrap on-chain liquidity (AMMs, etc.).
   - Must be handled with:
     - Clear rules (e.g., LP tokens sent to a timelock, or liquidity “locked” via explicit on-chain constraints).
     - No backdoor “rug” mechanics.

3. **Reserved Users (known addresses)**
   - Optional bucket for:
     - Key ecosystem partners.
     - Strategic integrations.
   - Each such allocation must have:
     - A reason (one line of text).
     - A label in the final allocation table.

> **Status**: none of these numbers are fixed yet in v0.1.

---

### 3.5 Burn / Sink / Blackhole Addresses

We may want one or more canonical “no return” addresses defined **up front**.

- **Burn address**: `VOID_BURN_ADDR` (TBD exact form, e.g., provably unspendable pattern).
- Invariant:
  - Any VOID sent to the burn address is considered permanently removed from
    circulating supply (but still visible in state).

No supply should start in burn at genesis unless explicitly justified (e.g., provable premine burn).

---

## 4. Invariants for Genesis Tooling

When we build the actual genesis generator (JSON / RLP), it must enforce:

1. **Total Supply Equality**
   - \`sum(class_allocations) == INITIAL_SUPPLY\`

2. **Class Coverage**
   - Every funded address belongs to exactly one class in this document.
   - No “misc” or unlabeled allocations.

3. **No Hidden God Mode**
   - No EOA or contract may be able to:
     - Arbitrarily mint VOID.
     - Arbitrarily move other users’ balances.
   - Any mint/burn authority must be:
     - Explicitly documented here.
     - Implemented via audited contracts (e.g., bridge minter roles, if any).

4. **Reproducibility**
   - Given:
     - A canonical CSV/JSON allocation table
     - Chain config constants (chainId 2050, genesis timestamp, etc.)
   - The genesis builder must produce the **same** genesis file byte-for-byte.

---

## 5. Open Questions (v0.1)

These are intentionally left open and will be filled in future revisions:

1. **INITIAL_SUPPLY** – exact number and decimal layout.
2. **Validator set size at genesis** – and per-validator allocation.
3. **Ecosystem vs Community split** – % to each and vesting terms.
4. **Liquidity strategy** – how much, where, and how locked.
5. **Any bridge/minter roles** – and how they’re prevented from abusing supply.

Once these are decided, v0.2+ of this doc will:

- Replace `TBD_*` placeholders with concrete values.
- Add a machine-readable mirror (e.g., `docs/VOID-MAINNET-ALLOCATION-TABLE.json`).
- Be wired into genesis-generation tooling used in CI.

