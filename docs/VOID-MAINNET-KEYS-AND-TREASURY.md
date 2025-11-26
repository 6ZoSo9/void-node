# VOID Mainnet Keys & Treasury Plan (v1)

> This document captures the long-term key and treasury strategy for VOID mainnet (chainId 2050).  
> It is **binding design**, not a loose idea. Future changes must be explicit and versioned.

---

## 1. Design Goals

- **Premine never sits in a hot wallet.** It lives in a contract-based treasury, not an EOA.
- **One-shot genesis keys.** Keys that can move premine or set initial authorities are used once at genesis then effectively retired.
- **Rotatable authority.** All ongoing control flows through rotatable signer sets and gates (AdminGate, UpdateGate, multi-sigs), not a single immortal key.
- **Cold storage by default.** Highest-privilege keys live offline (LUKS-encrypted USB and/or hardware wallets).
- **Devnet != mainnet.** No devnet or test keys are ever reused for mainnet funds or authority.
- **Operational separation.** Clear distinction between:
  - governance / upgrade keys
  - treasury / spending keys
  - day-to-day hot wallets
  - normal user wallets

---

## 2. Key Classes

We distinguish several key classes for VOID mainnet:

1. **Genesis Premine Key (GENESIS_PREMINE)**
   - Purpose: fund the VoidTreasury contract at genesis with the full premine.
   - Usage:
     - Used **once** at or immediately after genesis to transfer the premine into `VoidTreasury`.
     - After that, it SHOULD NOT be used again (practically treated as burned).
   - Storage:
     - Generated offline, never typed into an internet-connected box.
     - Backed up on a **LUKS-encrypted USB** and/or hardware wallet seed.
   - Policy:
     - After premine deposit, this key is *never* used to send funds directly to any operational address.
     - The only on-chain record of it after genesis should be the premine deposit tx.

2. **VoidTreasury Contract (TREASURY_CONTRACT)**

   This is not a key but the central contract that actually holds the premine.

   - Holds: the full premine supply after genesis.
   - Exposes:
     - controlled release flows to:
       - **Ops Treasury** (operational funds)
       - possibly other long-horizon budgets (grants, ecosystem, validators, etc.)
   - Guardian / control:
     - Controlled by a multi-sig and/or AdminGate-like authority set, **not** a single EOA.
     - All outflows are governed by explicit functions with guardrails (caps, rate limits, timelocks).

3. **Ops Treasury Key(s) (OPS_TREASURY)**

   - Purpose:
     - Receive controlled releases from `VoidTreasury`.
     - Serve as the funding source for:
       - validator incentives (if paid from treasury)
       - team ops
       - grants and ecosystem programs
     - Bridge funds downward to **hot wallets**.
   - Form:
     - Preferably a multi-sig or a gated contract account, not a single EOA.
   - Characteristics:
     - Medium-frequency usage: it gets used for structured, larger movements, not per-transaction micro spends.
     - Still treated as a **cold-ish** key set (hardware wallets, approvals required).

4. **Admin / Upgrade Keys (ADMIN / UPDATE)**

   - These back:
     - **AdminGate masterKey** (global admin authority)
     - **UpdateGate signers** (protocol upgrade / config updates)
     - Any other governance / parameter-setter roles for VOID.
   - Requirements:
     - Always be **rotatable** via on-chain procedures.
     - Should be backed by multi-sigs or threshold schemes, not single EOAs.
   - Storage:
     - Seeds / hardware wallets stored on LUKS-encrypted media.
     - Clear separation between:
       - everyday operator keys
       - rare-use, high-privilege admin keys.

5. **Hot Wallets (HOT_OPS)**

   - Purpose:
     - Day-to-day operations: paying for infra, running faucet(s), small promo distributions, etc.
   - Funding:
     - Only funded from **Ops Treasury**, never directly from `VoidTreasury`.
   - Characteristics:
     - Live on machines that go online.
     - Strict policy: keep balances modest; replenish from Ops Treasury as needed.
     - Can be rotated frequently.

6. **Normal User Keys**

   - Generated and managed by **Obelisk Wallet** or any other VOID-compatible wallet.
   - Stored:
     - On the user’s own devices (phone, desktop, hardware wallet).
   - Expectations:
     - Users are prompted to:
       - encrypt keys locally (e.g., passphrase / OS keychain)
       - write down a seed phrase and store offline if they want device migration.
   - NEVER reused as any kind of admin or treasury key.

---

## 3. Devnet vs Mainnet Keys

- **Devnet keys are disposable.**
  - Devnet and test keys are for tests, coverage, fuzzing, and agent experiments only.
  - They may be committed in examples or docs.
- **Mainnet keys are sacred.**
  - Mainnet keys are:
    - generated on air-gapped or hardened machines
    - never checked into git
    - never reused from any devnet/private environment
- Non-negotiable rules:
  - No copy/paste, import, or reuse of devnet private keys for mainnet validators, treasury, or governance.
  - No “just for now” reuse of test seeds in any mainnet context.

---

## 4. Long-Term Treasury Flow

High-level flow:

1. **Genesis**
   - GENESIS_PREMINE sends the entire premine to `VoidTreasury` contract.
   - From this point, GENESIS_PREMINE is effectively retired.

2. **Treasury → Ops Treasury**
   - Controlled, rate-limited functions in `VoidTreasury` move funds to the Ops Treasury address.
   - Example patterns:
     - Monthly / quarterly budgets
     - Explicit proposals + timelock unlocks

3. **Ops Treasury → Hot Wallets / Programs**
   - Ops Treasury distributes to:
     - hot ops wallets
     - specific program contracts (e.g. grants, validator incentives)
   - These hops are logged and reviewable on-chain.

4. **Hot Wallets → End Uses**
   - Actual spending (infra costs, rewards payouts, etc.) happens from hot wallets or program contracts.

This structure ensures:

- Single-shot genesis key usage.
- Clear layers of defense and observability.
- Ability to rotate funding keys while the underlying treasury logic remains stable.

---

## 5. Key Rotation & Compromise Handling

### Rotation

- Admin / update multi-sig signers are rotatable via on-chain procedures.
- Ops Treasury multi-sig signers can be rotated as operators change.
- Hot wallets are rotated often with low friction.

### Compromise Scenarios

1. **Hot Wallet Compromise**
   - Immediate response:
     - Revoke any allowance/role assignments, if applicable.
     - Stop using the compromised wallet.
     - Rotate to a new hot wallet and update funding paths.
   - Impact is bounded by the small balance held in that hot wallet at any time.

2. **Ops Treasury Key Compromise**
   - Emergency procedure via governance / AdminGate:
     - Freeze or re-route flows from `VoidTreasury` to a new Ops Treasury contract.
     - Use any built-in timelocks / circuit breakers to pause suspicious outflows.
   - Might involve:
     - halting certain spending functions
     - deploying a patched Ops Treasury with new signers.

3. **Admin / Update Key Compromise**
   - Use the governance mechanism to:
     - rotate AdminGate / UpdateGate signers to new keys.
     - freeze high-risk operations if needed.
   - Design requirement: no single key should be able to irreversibly brick the network.

4. **Genesis Premine Key Exposure (after premine is already in Treasury)**
   - If the premine key is compromised after it has already sent full supply to `VoidTreasury` and has no remaining balance or allowances:
     - There is nothing left for an attacker to steal.
     - This is why it is **one-shot** and effectively retired after use.

---

## 6. Storage & Backup Practices

- **LUKS-encrypted USB**
  - At least one LUKS-encrypted USB stick holds:
    - premine genesis seed
    - admin / update seeds
    - Ops Treasury multi-sig seeds (if applicable)
  - Kept offline and physically secure.

- **Hardware Wallets**
  - For ongoing governance and ops, prefer hardware wallet signers (e.g., multi-sig where each signer is a hardware wallet).
  - Seeds to those devices can also be backed up on LUKS-encrypted media.

- **Offsite Redundancy**
  - At least two physical copies (e.g. two USBs in separate locations) for disaster recovery.
  - Clear, documented recovery procedure stored in a sealed doc (not in the repo).

---

## 7. User-Facing Wallet Expectations (Obelisk Wallet)

- Obelisk Wallet should:
  - Clearly separate:
    - normal user wallets
    - optional validator keys
  - Encourage:
    - local encryption of keys / keystore
    - seed phrase backup flow
  - Never auto-promote a normal user key into any governance / treasury context.

- Long term:
  - Expose a clear UX distinction between “personal funds”, “validator/staking keys”, and anything related to DAO / governance roles.

---

## 8. Implementation Notes

- **Contracts**
  - Implement `VoidTreasury` and `OpsTreasury` as audited contracts with:
    - timelocks
    - role-based access control
    - event-heavy logging for every movement
    - configurable but rate-limited release functions.
  - Wire AdminGate / UpdateGate keys into these roles instead of raw EOAs.

- **Launch Checklist**
  - Before mainnet:
    - [ ] Generate and safely store new, never-used mainnet seeds for:
      - GENESIS_PREMINE
      - AdminGate signers
      - UpdateGate signers
      - Ops Treasury multi-sig signers
    - [ ] Set up LUKS-encrypted USB(s) and record exact unlock procedures.
    - [ ] Verify that `VoidTreasury` and `OpsTreasury` contracts are deployed, verified, and match this design.
    - [ ] Execute a dry-run of the genesis funding flow on a testnet clone.
    - [ ] Document who has physical custody of each hardware wallet / USB.

---

## 9. Future Revisions

- This is **v1** of the mainnet key + treasury plan.
- Any changes should:
  - update this doc with a new version header
  - include a clear “What changed and why” section
  - be traceable to a commit / tag for auditing.

