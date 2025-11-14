// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

/// @title VOID UpdateGate v1
/// @notice M-of-N signer gate for protocol update manifests on VOID (chainId 2050).
/// @dev Nodes MAY follow this contract to decide which protocol version / manifest is "current".
///      It does NOT enforce anything on-chain by itself; it's just a registry.
contract UpdateGate {
    uint256 public constant CHAIN_ID = 2050;

    /// @notice Master key that can manage signer set and threshold.
    address public masterKey;

    /// @notice Current active protocol version (monotonic).
    uint256 public currentVersion;

    /// @notice Signer set and threshold for approvals.
    mapping(address => bool) public isSigner;
    uint256 public signerCount;
    uint256 public threshold;

    enum UpdateStatus {
        None,
        Proposed,
        Active,
        Cancelled
    }

    struct Update {
        uint256 version;
        bytes32 manifestHash;
        uint64 proposedAt;
        uint64 activateAt;
        bool emergency;
        uint256 approvals;
        UpdateStatus status;
    }

    /// @dev updateId = keccak256(abi.encodePacked(version, manifestHash)).
    mapping(bytes32 => Update) public updates;
    mapping(bytes32 => mapping(address => bool)) public hasApproved;

    event MasterKeyChanged(address indexed oldKey, address indexed newKey);
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event ThresholdChanged(uint256 oldThreshold, uint256 newThreshold);

    event UpdateProposed(
        bytes32 indexed updateId,
        uint256 indexed version,
        bytes32 manifestHash,
        uint64 activateAt,
        bool emergency,
        address indexed proposer
    );

    event UpdateApproved(
        bytes32 indexed updateId,
        address indexed signer,
        uint256 approvals
    );

    event UpdateActivated(
        bytes32 indexed updateId,
        uint256 indexed version
    );

    event UpdateCancelled(
        bytes32 indexed updateId,
        address indexed canceller
    );

    modifier onlyMaster() {
        require(msg.sender == masterKey, "UpdateGate: not master");
        return;
        _;
    }

    modifier onlySigner() {
        require(isSigner[msg.sender], "UpdateGate: not signer");
        _;
    }

    /// @notice Version constant for off-chain infra (contract version, not protocol).
    function VERSION() external pure returns (uint256) {
        return 1;
    }

    /// @param masterKey_ Initial master key.
    /// @param initialSigners Initial signer set.
    /// @param threshold_ Initial M-of-N threshold (1 <= M <= N).
    constructor(
        address masterKey_,
        address[] memory initialSigners,
        uint256 threshold_
    ) {
        require(masterKey_ != address(0), "UpdateGate: masterKey zero");
        require(initialSigners.length > 0, "UpdateGate: no signers");
        masterKey = masterKey_;

        for (uint256 i = 0; i < initialSigners.length; i++) {
            address s = initialSigners[i];
            require(s != address(0), "UpdateGate: signer zero");
            require(!isSigner[s], "UpdateGate: dup signer");
            isSigner[s] = true;
            signerCount++;
            emit SignerAdded(s);
        }

        require(
            threshold_ > 0 && threshold_ <= signerCount,
            "UpdateGate: bad threshold"
        );
        threshold = threshold_;
        emit ThresholdChanged(0, threshold_);
    }

    /// @notice Propose a new protocol update.
    /// @param manifestHash Hash of off-chain manifest describing the update.
    /// @param activateAt Block number at or after which it may activate.
    /// @param emergency Emergency flag (metadata only in v1).
    /// @return updateId Derived id for this update.
    /// @return version New protocol version number.
    function proposeUpdate(
        bytes32 manifestHash,
        uint64 activateAt,
        bool emergency
    ) external onlySigner returns (bytes32 updateId, uint256 version) {
        require(manifestHash != bytes32(0), "UpdateGate: empty manifest");
        require(activateAt >= block.number, "UpdateGate: activateAt < now");

        version = currentVersion + 1;
        updateId = keccak256(abi.encodePacked(version, manifestHash));

        Update storage u = updates[updateId];
        require(u.status == UpdateStatus.None, "UpdateGate: exists");

        u.version = version;
        u.manifestHash = manifestHash;
        u.proposedAt = uint64(block.number);
        u.activateAt = activateAt;
        u.emergency = emergency;
        u.status = UpdateStatus.Proposed;

        // Proposer auto-approves.
        u.approvals = 1;
        hasApproved[updateId][msg.sender] = true;

        emit UpdateProposed(
            updateId,
            version,
            manifestHash,
            activateAt,
            emergency,
            msg.sender
        );
        emit UpdateApproved(updateId, msg.sender, 1);
    }

    /// @notice Approve a proposed update.
    /// @param updateId Id returned by proposeUpdate.
    function approveUpdate(bytes32 updateId) external onlySigner {
        Update storage u = updates[updateId];
        require(u.status == UpdateStatus.Proposed, "UpdateGate: not proposed");
        require(!hasApproved[updateId][msg.sender], "UpdateGate: already");
        hasApproved[updateId][msg.sender] = true;

        u.approvals += 1;
        emit UpdateApproved(updateId, msg.sender, u.approvals);
    }

    /// @notice Try to activate an update (anyone can call).
    /// @dev Conditions:
    ///      - status == Proposed
    ///      - approvals >= threshold
    ///      - block.number >= activateAt
    function activateUpdate(bytes32 updateId) external {
        Update storage u = updates[updateId];
        require(u.status == UpdateStatus.Proposed, "UpdateGate: not proposed");
        require(u.approvals >= threshold, "UpdateGate: insufficient approvals");
        require(block.number >= u.activateAt, "UpdateGate: too early");

        u.status = UpdateStatus.Active;
        currentVersion = u.version;

        emit UpdateActivated(updateId, u.version);
    }

    /// @notice Cancel a proposed update (master only).
    /// @param updateId Id of update to cancel.
    function cancelUpdate(bytes32 updateId) external onlyMaster {
        Update storage u = updates[updateId];
        require(
            u.status == UpdateStatus.Proposed,
            "UpdateGate: not cancellable"
        );
        u.status = UpdateStatus.Cancelled;
        emit UpdateCancelled(updateId, msg.sender);
    }

    /// @notice Change master key.
    function setMasterKey(address newMasterKey) external onlyMaster {
        require(newMasterKey != address(0), "UpdateGate: zero");
        address old = masterKey;
        masterKey = newMasterKey;
        emit MasterKeyChanged(old, newMasterKey);
    }

    /// @notice Replace signer set and/or threshold in one shot.
    /// @param addSigners Signers to add (can be empty).
    /// @param removeSigners Signers to remove (can be empty).
    /// @param newThreshold New threshold (0 to keep unchanged).
    function configureSigners(
        address[] calldata addSigners,
        address[] calldata removeSigners,
        uint256 newThreshold
    ) external onlyMaster {
        // Remove signers.
        for (uint256 i = 0; i < removeSigners.length; i++) {
            address s = removeSigners[i];
            if (s != address(0) && isSigner[s]) {
                isSigner[s] = false;
                signerCount -= 1;
                emit SignerRemoved(s);
            }
        }

        // Add signers.
        for (uint256 j = 0; j < addSigners.length; j++) {
            address s2 = addSigners[j];
            if (s2 != address(0) && !isSigner[s2]) {
                isSigner[s2] = true;
                signerCount += 1;
                emit SignerAdded(s2);
            }
        }

        require(signerCount > 0, "UpdateGate: no signers");

        if (newThreshold != 0) {
            require(
                newThreshold <= signerCount,
                "UpdateGate: threshold > signers"
            );
            uint256 old = threshold;
            threshold = newThreshold;
            emit ThresholdChanged(old, newThreshold);
        } else {
            require(
                threshold > 0 && threshold <= signerCount,
                "UpdateGate: bad threshold"
            );
        }
    }
}
