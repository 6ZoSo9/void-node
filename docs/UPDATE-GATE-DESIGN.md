# VOID Network – Update Gate & Master Key Design (v1 – short)

## 0. Goals

1. **No global kill switch**
   - No key, script, or service is allowed to stop the network.
   - Loss/removal of any key must NOT stop block production.

2. **Key = policy, not liveness**
   - The “master key” controls **update policy / signer sets**, not whether nodes run.
   - Nodes keep sealing/following forever on the last good version.

3. **Signed, coordinated updates**
   - Critical protocol updates are:
     - **Signed** by multiple update signers.
     - **Visible** on-chain.
     - **Coordinated** so everyone moves together.
     - **Rollbackable** if something is bad.

4. **Survive disaster**
   - If all keys and infra vanish:
     - Chain keeps running on the last good binary.
     - Anyone can rebuild from genesis + data.

---

## 1. Roles & Keys

### 1.1 Validator / Node Keys

- Each node/validator has its own keypair.
- Used for:
  - Proposing / signing blocks.
  - Validating blocks and staying in consensus.
- **Not** used for:
  - Changing protocol version.
  - Forcing software updates on others.

### 1.2 Update Signer Keys (M-of-N)

- Small set of independent keys (N total).
- Any update needs **M-of-N** signatures.
- They co-sign an **Update Manifest** describing a specific release.

### 1.3 Master Update Key (“MasterKey”)

- Single, high-ceremony key (e.g. on your encrypted USB).
- Powers:
  - Configure / rotate update signers.
  - Configure thresholds (M in M-of-N).
  - Freeze/unfreeze the update mechanism.
- It does **not**:
  - Stop nodes.
  - Directly pick protocol versions.
  - Gate normal block production.

If MasterKey disappears:
- Existing signers + policy keep working.
- Nodes stay live on the last good version.

---

## 2. Update Manifest (Conceptual)

A signed description of a node release, roughly:

- `app` – which component (void-node, wallet, agent, etc.).
- `version` – semantic version (e.g. 1.2.3).
- `protocolVersion` – protocol number this binary speaks.
- `minProtocolCompatible` – lowest version it can talk to safely.
- `activationHeight` – block where it should become active.
- `rolloutStartTime`/`deadline` – time window to stage & inspect.
- `binaryUrl` + `binarySha256` – where to get it and checksum.
- `notesHash` – hash of human-readable release notes.
- `emergency` – true only for break-glass hotfixes.

Manifests are only valid if they have **M-of-N Update Signer** signatures.

---

## 3. UpdateGate (High Level)

- Simple on-chain contract that stores:
  - `currentProtocolVersion`
  - `signers[]` + `signerThreshold`
  - `masterKey`
  - a map of `pending / staged / active` updates.

- MasterKey can:
  - Change signers/threshold.
  - Freeze/unfreeze the update mechanism.

- Update Signers can:
  - Propose an update by submitting a manifest + signatures.
  - Stage and activate updates respecting heights/timelocks.

UpdateGate **never** orders nodes to shut down. It only defines what protocol version is considered “current/valid”.

---

## 4. Node Behaviour (Sketch)

Each node runs a small **UpdateGate client** which:

1. Watches UpdateGate for:
   - current protocol version.
   - new pending/staged/active updates.

2. When an update becomes **Active**:
   - Download the binary.
   - Verify checksums + signatures.
   - Stage it locally.

3. Around `activationHeight`:
   - Restart into the new binary.
   - If the new binary fails to run, rollback locally and keep going.

No key is ever allowed to command “stop”; the worst case is:
- “don’t accept blocks with protocol > X” if you never update.

---

## 5. Invariants (Must Never Break)

1. **Network keeps running without keys**
   - No USB, no MasterKey, no signer online → chain still runs.

2. **Updates affect protocol version, not liveness**
   - Misconfig or key loss cannot silently kill honest nodes.

3. **Everything is auditable**
   - Manifest hashes + signer changes live on-chain.

4. **Rollback over halt**
   - In a bad update, we roll back and patch, not kill the network.

