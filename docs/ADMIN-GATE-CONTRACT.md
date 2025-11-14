# VOID Network – AdminGate Contract Spec (v1, minimal)

AdminGate is the **master key router** for VOID (chainId 2050).

- UpdateGate is **policy-only** for protocol versions.
- AdminGate is where the **MasterKey actually lives**.
- UpdateGate’s `masterKey` should be set to the **AdminGate contract**, not a raw EOA.

AdminGate **cannot**:
- Stop block production.
- Force protocol rollback on-chain.
- Directly control user contracts or balances.

AdminGate **can**:
- Hold and rotate the **MasterKey** (EOA / multisig / HW wallet).
- Point to the current **UpdateGate** (and later ConfigGate, etc.).
- Forward **opaque admin calls** to registered system contracts (UpdateGate, ConfigGate, …),
  but only when triggered by the MasterKey.

---

## 1. Responsibilities

AdminGate must:

- Store the current `masterKey` (EOA / multisig / HW wallet).
- Store references to core system contracts (initially `UpdateGate`).
- Enforce `onlyMasterKey` on all privileged actions.
- Provide a **generic forwarder** to:
  - Rotate UpdateGate’s signer set / thresholds.
  - Freeze/unfreeze new updates.
  - Later: adjust config params via ConfigGate or other gates.

AdminGate must *not* include any direct "halt chain" or "pause consensus" control.

---

## 2. Core State (high-level sketch)

- `address public masterKey;`
- `address public updateGate;`
- Optional future map:
  - `mapping(bytes32 => address) public systemContracts;`
    - e.g. `keccak256("CONFIG_GATE")`, `keccak256("WAL_GUARD")`, etc.

---

## 3. Core Functions (high-level sketch)

- `setMasterKey(address newKey)` – only current `masterKey`.
- `setUpdateGate(address newGate)` – only `masterKey`.
- `setSystemContract(bytes32 key, address target)` – only `masterKey`.

- `forwardToUpdateGate(bytes data)` – only `masterKey`.
  - Used to call privileged functions on UpdateGate
    (signer rotation, thresholds, freezing new updates, etc).

- `forward(bytes32 systemKey, bytes data)` – only `masterKey`.
  - Generic forward to any registered system contract.

All forwards should:

- Emit an event (e.g. `Forwarded(address target, bytes data)`).
- Bubble up revert reasons on failure.

---

## 4. Security Notes

- AdminGate is **not** upgrade logic itself; it just routes the MasterKey.
- If AdminGate is upgraded, the new AdminGate must:
  - Import the previous `masterKey`.
  - Re-point `UpdateGate.masterKey` to the new AdminGate.
- Nodes should treat AdminGate address as part of the **chain governance config**
  (e.g. baked into genesis + on-chain registry).
