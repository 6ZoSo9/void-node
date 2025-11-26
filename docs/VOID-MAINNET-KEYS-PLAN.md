# VOID Mainnet Keys & Treasury Plan (v1)

Status: **Draft – internal only, pre-mainnet**

This document locks the high-level keys + treasury plan for VOID mainnet.

---

## 1. Canonical tokenomics constants (locked)

**Global supply**

- `MAX_SUPPLY = 666,666,666 VOID`
- `PREMINE = 333,333,333 VOID` (50% of total)
- `EMISSIONS = 333,333,333 VOID` over ~100 years (50% of total), split into 4 eras:
  - Era 1: `177,777,777 VOID`
  - Era 2: `88,888,889 VOID`
  - Era 3: `44,444,444 VOID`
  - Era 4: `22,222,223 VOID`

**Founder Trust**

- `FOUNDER_TRUST = 230,000,000 VOID` (subset of the 333,333,333 premine)
- This is **inside** the 333,333,333 premine, not extra.
- Percentages:
  - 69.0% of the premine (230M / 333.333M).
  - 34.5% of total supply (230M / 666.666M).

**Non-founder premine buckets**

- Remaining premine after Founder Trust:
  - `333,333,333 - 230,000,000 = 103,333,333 VOID`
- This 103,333,333 VOID is reserved for:
  - Validator bootstrap / incentives
  - Ecosystem funds, grants, liquidity, ops, etc.
- Exact split is defined in `docs/VOID-MAINNET-ALLOCATION-SPEC.md`.
- Rule: **Total premine buckets must sum to 333,333,333 VOID, no more.**

---

## 2. Key roles for mainnet

We separate **dev keys**, **mainnet authority keys**, and **treasury keys**.

### 2.1 Dev / test keys (do NOT reuse)

- Used on:
  - Devnet, safeboot, internal testnets.
- Purpose:
  - Cheap deploys, rapid iteration, fuzzing, agents, etc.
- Policy:
  - **Dev/test keys are never reused on mainnet.**
  - No “shadow mainnet” with the same private keys.
  - If a dev key ever touches mainnet funds, consider it compromised.

### 2.2 Mainnet authority keys (governance + config)

Critical contracts:

- `AdminGate` – global master key for “who counts as admin”.
- `UpdateGate` – protocol upgrade flow (propose / approve / execute).
- `ValidatorSet` – validator set admin.
- `ConfigGate` – global config knobs (addresses, uint/bool flags, etc).

Planned structure:

- `AdminGate.masterKey`
  - Backed by a **multi-sig** (e.g. 3-of-5 or 4-of-7).
  - Keyholders are long-term aligned humans/entities behind VOID.
  - Used sparingly: emergency controls, adding/removing system contracts, etc.

- `UpdateGate.signers[]`
  - Separate multi-sig (also 3-of-5, 4-of-7, etc).
  - Owns protocol upgrades (core contract code paths; no silent hot-patching).
  - Every upgrade path must go through a time-locked, observable process.

- `ValidatorSet.admin`
  - Either:
    - Pointed at `AdminGate` / `ConfigGate` combo, or
    - Its own dedicated multi-sig with tightly scoped powers.
  - Controls:
    - Adding/removing validators.
    - Emergency controls for validator misbehavior scenarios.

Policy:

- **No single EOA** should ever hold these roles directly.
- Everything must point at **multi-sig contracts**, with:
  - 2-of-3 minimum, preferably 3-of-5+ with geo-distributed signers.
  - Signers on separate hardware, across separate physical locations.

---

## 3. Treasury & premine keys

On mainnet there are three main “premine” holders:

1. **VoidToken** (the ERC20 itself; holds the rules).
2. **VoidPremineVault** – contract that initially receives the premine.
3. **VoidFounderTrustVesting** – contract that manages the 230M founder trust.

High-level flows:

- At genesis:
  - `VoidToken` is deployed.
  - `VoidPremineVault` receives the **333,333,333 VOID** premine.
  - `VoidFounderTrustVesting` is funded with exactly **230,000,000 VOID** from the vault.
  - Remaining `103,333,333 VOID` stays under contract control for:
    - Ops/infra/validators/ecosystem as per allocation spec.

- Ownership keys:
  - `VoidPremineVault.owner`
    - A **multi-sig**: “Treasury Governor”.
    - Only this multi-sig can move premine out to:
      - Founder trust vesting contract
      - Ops/infra wallets
      - Ecosystem contracts (grants, liquidity, etc.)
  - `VoidFounderTrustVesting.admin` / `beneficiary`
    - Tied to a **trust structure** for VOID Labs LLC.
    - Enforces long-term vesting; no instant cash-out.
  - `OpsTreasury` / `Treasury` contracts
    - Handle day-to-day “spend to ops” and smaller flows.
    - Controlled by a separate ops-level multi-sig with tighter budgets and explicit limits.

Rules:

- The **Founder Trust 230M** is never directly held by a bare EOA.
- All premine flows are:
  - Contract-based.
  - Visible on-chain.
  - Governed by multi-sig(s) with hard-coded constraints in Solidity.

---

## 4. Storage & backup of mainnet keys

### 4.1 Devices and media

We use:

- 1+ **LUKS-encrypted USB** (“voidkey”): 
  - Holds encrypted backups of:
    - BIP-39 seed phrases for mainnet multi-sigs.
    - Any necessary GPG keys for release signing.
  - Only mountable with a strong passphrase that is not stored digitally elsewhere.

- **Hardware wallets** (e.g. Ledger, Trezor, etc.):
  - Each mainnet signer uses a hardware wallet.
  - No hot wallets for mainnet admin/treasury.

- Optional **paper backup**:
  - Hand-written mnemonics, kept in separate physical locations.
  - Enough to reconstruct the multi-sig threshold, but not a single point of compromise.

### 4.2 Redundancy & thresholds

- Target pattern:
  - 2-of-3 or 3-of-5 schemes for:
    - AdminGate masterKey multi-sig.
    - UpdateGate signer multi-sig.
    - Treasury Governor multi-sig(s).
- Each participant:
  - Holds their own hardware wallet.
  - Has an encrypted backup (LUKS USB) stored in a separate, safe location.

### 4.3 Operational rules

- No one carries both:
  - A hardware wallet *and*
  - An unencrypted copy of its seed phrase.
- Any suspected compromise:
  - Immediate key rotation (see below).
  - Update of AdminGate/UpdateGate/Treasury owners to new multi-sigs.
  - Strong preference for **migrate-then-revoke** patterns (move funds, THEN obsolete keys).

---

## 5. Rotation plan (timeline)

This is the **pre-mainnet / mainnet** rotation strategy.

### 5.1 Dev phase (now — pre-mainnet)

- Use **dev/test keys** on devnet and safeboot.
- Treat these keys as disposable.
- All contracts and pipelines MUST be written such that:
  - Chain ID checks (2050) are respected.
  - It is impossible to “accidentally” point mainnet to dev keys.

### 5.2 T-90 to T-30 days before mainnet

- Generate **fresh, never-used mainnet keys**:
  - At least:
    - AdminGate masterKey multi-sig seeds.
    - UpdateGate signer multi-sig seeds.
    - Treasury Governor multi-sig seeds.
    - Any separate ops/infra multi-sig seeds.

- Do this **offline**, on an air-gapped machine.
- Immediately:
  - Store mnemonics in:
    - Hardware wallets (initialized cold).
    - LUKS-encrypted USB backup.
  - Document which address plays which role in a private, encrypted mapping.

### 5.3 Genesis deployment window

- Use a tightly controlled deployment script to:
  - Deploy `VoidToken`, `VoidPremineVault`, `VoidFounderTrustVesting`, `AdminGate`, `UpdateGate`, `ValidatorSet`, `ConfigGate`, etc.
  - Wire ownerships:
    - AdminGate.masterKey     → mainnet Admin multi-sig.
    - UpdateGate.signers[]    → mainnet Update multi-sig.
    - ValidatorSet.admin      → controlled via AdminGate/ConfigGate or dedicated multi-sig.
    - VoidPremineVault.owner  → Treasury Governor multi-sig.
    - FounderTrustVesting     → Founder Trust governance.
  - Ensure **no single EOA** is left as permanent owner.

- After deployment:
  - Remove any temporary deployer EOAs from privileged roles.
  - Confirm all critical paths are behind multi-sigs.

### 5.4 Post-genesis rotations

- Plan periodic rotations (e.g. every 3–5 years or on incident):
  - Introduce a new multi-sig.
  - Migrate roles/funds.
  - Decommission old multi-sig.
- Write and keep a **runbook** for:
  - Replacing a compromised signer.
  - Scaling from 3-of-5 to 4-of-7, etc.

---

## 6. “Never reuse dev keys” policy (explicit)

- Devnet, safeboot, testnets, local test rigs:
  - Use keys that will **never** appear on mainnet.
- When we get closer to mainnet:
  - Generate completely new seeds and addresses.
  - Map them to on-chain roles and enshrine that mapping in:
    - Internal docs (encrypted).
    - ConfigGate/AdminGate settings.
- Any drift from this policy is treated as a **critical incident**.

---

## 7. Checklist for “3 months before mainnet”

When we are ~3 months from mainnet go-live, we MUST:

1. Re-read this document and confirm:
   - Tokenomics constants match on-chain and in `src/tokenomics/*`.
   - Founder Trust amount is still 230,000,000 VOID.
2. Generate mainnet keys offline and store:
   - Hardware wallets per signer.
   - Encrypted backups on LUKS USB(s).
3. Finalize:
   - AdminGate / UpdateGate / ValidatorSet / Treasury ownership mappings.
4. Dry-run:
   - Deployment scripts on a fresh testnet fork.
   - Key rotation scripts (at least once).
5. Only then proceed to mainnet genesis.

This doc is the **source of truth** for mainnet keys and treasury structure. Any changes must go through a formal RFC and be reflected here.
