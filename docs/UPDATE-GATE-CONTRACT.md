# VOID Network – UpdateGate Contract Spec (v1, minimal)

This file defines the **on-chain** contract that coordinates protocol updates
for VOID (chainId 2050). It cannot stop the chain; it only defines what
protocol version is considered “current/valid” by nodes that choose to follow it.

---

## 1. Responsibilities

UpdateGate must:

- Store the current protocol version and historical updates.
- Track a set of **Update Signers** (M-of-N).
- Accept **manifest hashes** + signatures for updates.
- Enforce **activation rules** (height-based, with optional emergency flag).
- Be meta-controlled by a MasterKey (or AdminGate) that can:
  - Rotate signers.
  - Adjust thresholds.
  - Freeze/unfreeze new updates.
- Never provide a global shutdown switch.

---

## 2. Core State (Solidity-style sketch)

    enum UpdateStatus {
        None,
        Pending,    // proposed, signatures verified
        Staged,     // activation height chosen
        Active,     // current protocol version
        Cancelled   // explicitly cancelled
    }

    struct Update {
        bytes32 manifestHash;      // keccak256(manifestBytes)
        string  app;               // e.g. "void-node"
        uint32  protocolVersion;   // protocol this update moves to
        uint32  minProtocolCompat; // lowest compatible protocol
        uint64  activationHeight;  // height when it should go live
        bool    emergency;         // true => emergency fast path
        UpdateStatus status;
        uint64  createdAt;
        uint64  stagedAt;
        uint64  activatedAt;
    }

    uint256 public immutable chainId;            // 2050 on VOID mainnet
    address public masterKey;                   // controls signer set / thresholds
    uint32  public currentProtocolVersion;      // latest ACTIVE protocol

    mapping(address => bool) public isSigner;
    uint8 public signerCount;
    uint8 public signerThreshold;               // M in M-of-N

    bool public frozen;                         // if true, no NEW updates

    mapping(bytes32 => Update) public updates;  // manifestHash => Update

---

## 3. Events (high level)

    event MasterKeyChanged(address indexed oldKey, address indexed newKey);
    event SignerSetChanged(address[] newSigners, uint8 newThreshold);
    event FrozenChanged(bool frozen);

    event UpdateProposed(bytes32 indexed manifestHash, string app, uint32 protocolVersion);
    event UpdateStaged(bytes32 indexed manifestHash, uint64 activationHeight);
    event UpdateActivated(bytes32 indexed manifestHash, uint32 protocolVersion);
    event UpdateCancelled(bytes32 indexed manifestHash);

---

## 4. Behaviour Summary

- **Propose update**
  - Off-chain: signers agree on a manifest JSON and compute `manifestHash`.
  - On-chain: `proposeUpdate` stores an `Update` with status `Pending` once
    M-of-N signatures are verified.

- **Stage update**
  - Signers call `stageUpdate(manifestHash, newActivationHeight)` to mark an
    update as `Staged` and set a height in the future.

- **Activate update**
  - Anyone can call `activateUpdate(manifestHash)` once `block.number >= activationHeight`.
  - Contract marks it `Active` and bumps `currentProtocolVersion` if higher.

- **MasterKey**
  - May rotate signers and thresholds.
  - May toggle `frozen` to pause *new* updates.
  - Cannot stop nodes or roll protocol backwards.

Nodes are free to:

- Follow `currentProtocolVersion` and auto-update using the manifest.
- Pin themselves to an older protocol if they distrust new updates.

In all cases, block production continues; UpdateGate is **policy only**, never
a kill switch.
