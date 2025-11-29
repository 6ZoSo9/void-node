# VOID Mainnet — Keys & Devices Layout

This doc captures the long-term plan for how we handle **mainnet keys** and **storage devices** for VOID Network.

It is meant to be a human-readable contract with our future selves.

---

## 0. High-level rules

1. **Premine / VoidTreasury key is sacred.**
   - Mnemonic lives on **paper only**, in offline storage.
   - No plaintext seed file in the `void-node` repo.
   - No plaintext seed file on the LUKS “ops” device.
   - Any digital backup (if ever made) must be:
     - Encrypted with a strong passphrase, and
     - Stored on a **different** device than the day-to-day ops LUKS stick.

2. **One LUKS device is allowed to hold everything else:**
   - Admin/Update/Config gate keys.
   - OpsTreasury + its hot wallets.
   - Validator keys.
   - Other VOID mainnet ops identities (agents, relayers, etc.), as needed.

3. If the **ops LUKS** is lost but mnemonics are safe on paper:
   - We **restore** keys onto a new device (or generate new ones and migrate).

4. If the **ops LUKS** is compromised:
   - We assume all keys on it are compromised.
   - We use the **VoidTreasury (paper)** + governance contracts (AdminGate/UpdateGate/etc.) to:
     - Move funds to new OpsTreasury.
     - Rotate UpdateGate signers.
     - Rotate validator keys.
     - Replace any hot wallets.
   - In other words: Treasury is the root of trust; everything on the ops LUKS is **rotatable**.

---

## 1. Roles and key categories

Mainnet has a few critical “roles” that need keys:

- **VoidTreasury / Premine**
  - Holds the premine (333,333,333 VOID) at genesis.
  - Key lives **only on paper**.
  - Used rarely:
    - Move premine into Treasury/Ops structure.
    - Perform emergency recoveries and rotations.
  - Should NOT be loaded into day-to-day wallet software.

- **AdminGate / Master Admin**
  - Logical “master key” for the governance/upgrade layer.
  - Can add/remove UpdateGate signers, change critical system config via UpdateGate/ConfigGate, etc.
  - Key is stored on the **ops LUKS** (and backed up on paper).

- **UpdateGate Signers (M-of-N)**
  - Multi-sig style signer set that actually approves updates/changes.
  - Each signer has its own key.
  - All signer mnemonics live on the **ops LUKS**, plus paper backups.

- **ConfigGate Owner**
  - Optional separate key that controls configuration-only parameters.
  - Also stored on the **ops LUKS** + paper backup.

- **Treasury / OpsTreasury**
  - Contract-based VoidTreasury holds premine.
  - OpsTreasury is a separate contract that funds hot wallets, ops, and validators.
  - OpsTreasury admins/owners live on **ops LUKS**.
  - Treasury premine key stays on **paper only**.

- **Validators (Validator0, etc.)**
  - Each validator has:
    - Reward address key (where rewards go).
    - Consensus key(s) (used by consensus client).
  - These are day-to-day operational keys, so they live on **ops LUKS** and are also backed up on paper.

- **Other ops keys (later)**
  - Agents, relayers, NullFeed operators, etc.
  - These also live on **ops LUKS**, with rotation possible via Treasury + gates.

---

## 2. Devices

We distinguish **two “classes” of storage**:

### 2.1 Ops LUKS device (“VOID ops key drive”)

This is the device you already use that holds chain keys. For mainnet, we treat it as:

- The **single place** where we keep:
  - AdminGate / UpdateGate / ConfigGate keys.
  - OpsTreasury + hot-wallet mnemonics.
  - Validator0 (and future validator) mnemonics.
  - Other mainnet ops identities.

- Properties:
  - Full-disk LUKS encryption.
  - Mount only when needed for ops or key management.
  - Never auto-mount at boot.
  - Protected by strong passphrase only you know.

When we get closer to mainnet, we will fill in this section with **real identifiers**:

- LUKS device label: `TODO_FILL_OPS_LUKS_LABEL`
- Underlying block device: `TODO_FILL_OPS_LUKS_DEVICE` (e.g. `/dev/sdX` or `/dev/disk/by-uuid/...`)
- Mountpoint when in use: `TODO_FILL_OPS_LUKS_MOUNTPOINT` (e.g. `/mnt/void-ops-luks`)

We will do that editing by hand **on this machine only**, never committing actual device identifiers if they feel too revealing.

### 2.2 Paper-only / offline Treasury

The **VoidTreasury / premine mnemonic** is stored like this:

- Written on paper.
- Kept offline (safe, lockbox, etc.).
- No plaintext file in the repo.
- No plaintext file on the ops LUKS drive.
- No long-term open hardware wallet exposure unless we explicitly design for it.

If we ever decide to use a **hardware wallet** for the Treasury key, it will be documented here as a separate section and we still treat its seed phrase like a paper-only secret.

---

## 3. How rotation works in practice

Realistic scenarios:

### 3.1 Ops LUKS lost (but not stolen)

- You still have paper mnemonics for:
  - AdminGate, UpdateGate signers, ConfigGate.
  - OpsTreasury admin.
  - Validators, etc.
- You create a **new LUKS device**.
- Restore mnemonics from paper onto the new device.
- Optionally rotate to new addresses for some roles if desired, but not strictly required.

### 3.2 Ops LUKS suspected compromised

We assume everything on it is compromised:

1. Use **Treasury key (paper)** to:
   - Deploy / configure **new OpsTreasury**.
   - Move funds from old OpsTreasury to new one.

2. Use **AdminGate + UpdateGate** to:
   - Rotate signer sets.
   - Update any contract wiring that depends on compromised addresses.

3. Use validator admin keys (or UpdateGate, depending on design) to:
   - Register new validator consensus keys.
   - Repoint rewards to new addresses.

After rotation, the old addresses are treated as burned.

### 3.3 Treasury key compromised

This is worst-case. In that scenario, we treat it like a total emergency:

- Use governance (if still under our control) to:
  - Quarantine or migrate funds where possible.
- Potentially treat the current mainnet as “tainted” and move to a new chain with new genesis and keys.

Our design goal is to **never** get here. That’s why Treasury is paper-only and rarely touched.

---

## 4. Workflow guardrails

Whenever we approach true mainnet:

- **Never**:
  - Paste mnemonics or private keys into the `void-node` repo.
  - Store unencrypted seeds in home directory.
  - Store Treasury premine mnemonic on the ops LUKS device.

- **Always**:
  - Use the ops LUKS device for day-to-day mainnet ops keys.
  - Keep paper backups for every mnemonic used.
  - Treat the Treasury key as a separate “tier” with stricter handling.

---

## 5. PLAN / bootstrap tie-in

Our mainnet bootstrap PLAN config (`config/void-mainnet-bootstrap-mainnet.live.json`) is wired around this model:

- The **roles** section will be filled (later) using keys stored on the **ops LUKS** device:
  - AdminGate owner
  - UpdateGate signers
  - ConfigGate owner
  - TreasuryOwner (contract owner roles)
  - OpsTreasuryOwner
  - RewardEngineOwner
  - ValidatorSetOwner
  - Validator0 reward/consensus key

- The **contracts** section will be filled by the real bootstrap script as it deploys:
  - UpdateGate
  - AdminGate
  - ConfigGate
  - ValidatorSet
  - VoidToken
  - PremineVault (if used in the final design)
  - VoidTreasury
  - OpsTreasury
  - RewardEngine

- The **Treasury premine mnemonic** is never stored in this JSON or on the ops LUKS.
  - It is only used to sign the initial transfer of premine into the on-chain Treasury/Ops structure.

---

## 6. Future work (to be done later)

- Add a small `ops/void-mainnet-keys-checklist.sh` helper that:
  - Prints a checklist of required key categories.
  - Confirms that the ops LUKS mountpoint looks sane.
  - Remains read-only (no cryptsetup commands without explicit opt-in).

- Add a more detailed paper backup template (what to write down, where to keep it, how to verify restores).

For now, this README is the **source of truth** for how we intend to use:

- One **ops LUKS device** for everything rotatable, and
- One **paper-only Treasury key** as the ultimate root of financial authority.

