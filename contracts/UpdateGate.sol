// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

/// @title VOID Network - UpdateGate (v1, minimal)
/// @notice Coordinates protocol update manifests using an M-of-N signer set.
///         Nodes MAY choose to follow this contract when deciding which
///         manifest is "current".
contract UpdateGate {
    struct UpdateRecord {
        bytes32 manifestHash;      // hash of the off-chain manifest JSON
        uint64 activationHeight;   // block height when this should go live
        bool   emergency;          // if true, can be activated before height
        bool   executed;           // true once activated
        uint256 approvals;         // number of signer approvals
        uint64 createdAt;          // block timestamp when proposed
    }

    // --- core state ---

    address public admin;

    // signer set + threshold (M-of-N)
    mapping(address => bool) public isSigner;
    uint256 public signerCount;
    uint256 public signerThreshold;

    // updateId => UpdateRecord
    mapping(bytes32 => UpdateRecord) private _updates;
    // updateId => signer => approved?
    mapping(bytes32 => mapping(address => bool)) public hasApproved;

    // current active manifest (if any)
    bytes32 public currentUpdateId;
    bytes32 public currentManifestHash;

    // --- events ---

    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);

    event SignerSet(address indexed signer, bool isSigner);
    event ThresholdSet(uint256 threshold);

    event UpdateProposed(
        bytes32 indexed updateId,
        bytes32 manifestHash,
        uint64 activationHeight,
        bool emergency
    );

    event UpdateApproved(
        bytes32 indexed updateId,
        address indexed signer,
        uint256 approvals
    );

    event UpdateActivated(
        bytes32 indexed updateId,
        bytes32 manifestHash,
        uint64 activationHeight,
        bool emergency
    );

    // --- modifiers ---

    modifier onlyAdmin() {
        require(msg.sender == admin, "UpdateGate: not admin");
        _;
    }

    modifier onlySigner() {
        require(isSigner[msg.sender], "UpdateGate: not signer");
        _;
    }

    // --- ctor ---

    constructor() {
        admin = msg.sender;
        emit AdminChanged(address(0), msg.sender);
    }

    // --- admin controls ---

    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "UpdateGate: zero admin");
        address old = admin;
        admin = newAdmin;
        emit AdminChanged(old, newAdmin);
    }

    function setSigner(address signer, bool enabled) external onlyAdmin {
        require(signer != address(0), "UpdateGate: zero signer");

        bool was = isSigner[signer];
        if (was == enabled) {
            return;
        }

        isSigner[signer] = enabled;

        if (enabled) {
            signerCount += 1;
        } else {
            require(signerCount > 0, "UpdateGate: signerCount underflow");
            signerCount -= 1;
        }

        emit SignerSet(signer, enabled);

        // keep invariant: threshold <= signerCount if non-zero
        if (signerThreshold > signerCount && signerCount > 0) {
            signerThreshold = signerCount;
            emit ThresholdSet(signerThreshold);
        }
    }

    function setThreshold(uint256 newThreshold) external onlyAdmin {
        require(newThreshold > 0, "UpdateGate: threshold=0");
        require(
            newThreshold <= signerCount,
            "UpdateGate: threshold > signerCount"
        );
        signerThreshold = newThreshold;
        emit ThresholdSet(newThreshold);
    }

    // --- update lifecycle ---

    /// @notice Propose a new manifest update.
    /// @param manifestHash keccak256 hash of the off-chain manifest JSON.
    /// @param activationHeight block number when this should become valid
    ///                         (ignored if `emergency` is true).
    /// @param emergency if true, can be activated immediately once approvals >= threshold.
    /// @return updateId opaque id for this update (derived from parameters).
    function proposeUpdate(
        bytes32 manifestHash,
        uint64 activationHeight,
        bool emergency
    ) external onlyAdmin returns (bytes32 updateId) {
        require(manifestHash != bytes32(0), "UpdateGate: empty hash");
        // allow activationHeight=0 for emergency-only updates

        updateId = keccak256(
            abi.encodePacked(
                manifestHash,
                activationHeight,
                emergency,
                block.chainid
            )
        );

        UpdateRecord storage rec = _updates[updateId];
        require(rec.manifestHash == bytes32(0), "UpdateGate: exists");

        rec.manifestHash = manifestHash;
        rec.activationHeight = activationHeight;
        rec.emergency = emergency;
        rec.executed = false;
        rec.approvals = 0;
        rec.createdAt = uint64(block.timestamp);

        emit UpdateProposed(updateId, manifestHash, activationHeight, emergency);
    }

    /// @notice Approve an existing update (signer-only).
    function approveUpdate(bytes32 updateId) external onlySigner {
        UpdateRecord storage rec = _updates[updateId];
        require(rec.manifestHash != bytes32(0), "UpdateGate: unknown");
        require(!rec.executed, "UpdateGate: already executed");

        require(!hasApproved[updateId][msg.sender], "UpdateGate: already approved");
        hasApproved[updateId][msg.sender] = true;

        rec.approvals += 1;
        emit UpdateApproved(updateId, msg.sender, rec.approvals);
    }

    /// @notice Activate an update once approvals >= threshold and height rule satisfied.
    function executeUpdate(bytes32 updateId) external onlyAdmin {
        UpdateRecord storage rec = _updates[updateId];
        require(rec.manifestHash != bytes32(0), "UpdateGate: unknown");
        require(!rec.executed, "UpdateGate: already executed");
        require(signerThreshold > 0, "UpdateGate: threshold not set");
        require(
            rec.approvals >= signerThreshold,
            "UpdateGate: approvals < threshold"
        );

        if (!rec.emergency) {
            require(
                block.number >= rec.activationHeight,
                "UpdateGate: not at activation height"
            );
        }

        rec.executed = true;
        currentUpdateId = updateId;
        currentManifestHash = rec.manifestHash;

        emit UpdateActivated(
            updateId,
            rec.manifestHash,
            rec.activationHeight,
            rec.emergency
        );
    }

    // --- views ---

    function getUpdate(bytes32 updateId)
        external
        view
        returns (
            bytes32 manifestHash,
            uint64 activationHeight,
            bool emergency,
            bool executed,
            uint256 approvals,
            uint64 createdAt
        )
    {
        UpdateRecord storage rec = _updates[updateId];
        manifestHash = rec.manifestHash;
        activationHeight = rec.activationHeight;
        emergency = rec.emergency;
        executed = rec.executed;
        approvals = rec.approvals;
        createdAt = rec.createdAt;
    }
}
