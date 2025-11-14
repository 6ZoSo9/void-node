// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

/// @title VOID Network – UpdateGate (minimal v1)
/// @notice Policy-only contract for protocol updates. Cannot stop block production.
contract UpdateGate {
    enum UpdateStatus {
        None,
        Pending,
        Staged,
        Active,
        Cancelled
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

    // signer set
    mapping(address => bool) public isSigner;
    address[] public signerList;
    uint8 public signerCount;
    uint8 public signerThreshold;               // M in M-of-N

    bool public frozen;                         // if true, no NEW updates

    mapping(bytes32 => Update) public updates;  // manifestHash => Update

    event MasterKeyChanged(address indexed oldKey, address indexed newKey);
    event SignerSetChanged(address[] newSigners, uint8 newThreshold);
    event FrozenChanged(bool frozen);

    event UpdateProposed(bytes32 indexed manifestHash, string app, uint32 protocolVersion);
    event UpdateStaged(bytes32 indexed manifestHash, uint64 activationHeight);
    event UpdateActivated(bytes32 indexed manifestHash, uint32 protocolVersion);
    event UpdateCancelled(bytes32 indexed manifestHash);

    modifier onlyMasterKey() {
        require(msg.sender == masterKey, "UpdateGate: not masterKey");
        _;
    }

    modifier onlySignerOrMaster() {
        require(
            msg.sender == masterKey || isSigner[msg.sender],
            "UpdateGate: not signer"
        );
        _;
    }

    constructor(
        uint256 _chainId,
        address _masterKey,
        address[] memory _signers,
        uint8 _threshold
    ) {
        require(_masterKey != address(0), "UpdateGate: masterKey zero");
        chainId = _chainId;
        masterKey = _masterKey;
        _setSigners(_signers, _threshold);
    }

    // --- signer set management (masterKey only) ---

    function setMasterKey(address newKey) external onlyMasterKey {
        require(newKey != address(0), "UpdateGate: masterKey zero");
        emit MasterKeyChanged(masterKey, newKey);
        masterKey = newKey;
    }

    function setSigners(address[] calldata newSigners, uint8 newThreshold)
        external
        onlyMasterKey
    {
        _setSigners(newSigners, newThreshold);
    }

    function setFrozen(bool _frozen) external onlyMasterKey {
        frozen = _frozen;
        emit FrozenChanged(_frozen);
    }

    function _setSigners(address[] memory newSigners, uint8 newThreshold) internal {
        // clear old
        for (uint256 i = 0; i < signerList.length; i++) {
            isSigner[signerList[i]] = false;
        }
        delete signerList;
        signerCount = 0;

        require(newSigners.length > 0, "UpdateGate: no signers");
        require(newThreshold > 0, "UpdateGate: threshold zero");
        require(newThreshold <= newSigners.length, "UpdateGate: bad threshold");

        for (uint256 i = 0; i < newSigners.length; i++) {
            address s = newSigners[i];
            require(s != address(0), "UpdateGate: zero signer");
            if (!isSigner[s]) {
                isSigner[s] = true;
                signerList.push(s);
                signerCount++;
            }
        }

        signerThreshold = newThreshold;
        emit SignerSetChanged(newSigners, newThreshold);
    }

    // --- update lifecycle (minimal: trust signers, full M-of-N ticket verify TODO) ---

    /// @notice Propose a new update. Minimal v1: requires msg.sender to be signer or masterKey.
    /// @dev Full EIP-712 ticket + signatures verification is TODO for v2.
    function proposeUpdate(
        bytes32 manifestHash,
        string calldata app,
        uint32 protocolVersion,
        uint32 minProtocolCompat,
        bool emergency
    ) external onlySignerOrMaster {
        require(!frozen, "UpdateGate: frozen");
        require(manifestHash != bytes32(0), "UpdateGate: manifestHash zero");
        require(protocolVersion != 0, "UpdateGate: protocolVersion zero");

        Update storage u = updates[manifestHash];
        require(
            u.status == UpdateStatus.None || u.status == UpdateStatus.Cancelled,
            "UpdateGate: exists"
        );

        u.manifestHash = manifestHash;
        u.app = app;
        u.protocolVersion = protocolVersion;
        u.minProtocolCompat = minProtocolCompat;
        u.emergency = emergency;
        u.status = UpdateStatus.Pending;
        u.createdAt = uint64(block.timestamp);

        emit UpdateProposed(manifestHash, app, protocolVersion);
    }

    /// @notice Stage an update at a given future height.
    function stageUpdate(bytes32 manifestHash, uint64 activationHeight)
        external
        onlySignerOrMaster
    {
        require(activationHeight > block.number, "UpdateGate: height too low");
        Update storage u = updates[manifestHash];
        require(
            u.status == UpdateStatus.Pending || u.status == UpdateStatus.Staged,
            "UpdateGate: bad status"
        );

        u.activationHeight = activationHeight;
        u.status = UpdateStatus.Staged;
        u.stagedAt = uint64(block.timestamp);

        emit UpdateStaged(manifestHash, activationHeight);
    }

    /// @notice Activate a staged update once activationHeight is reached.
    function activateUpdate(bytes32 manifestHash) external {
        Update storage u = updates[manifestHash];
        require(u.status == UpdateStatus.Staged, "UpdateGate: not staged");
        require(block.number >= u.activationHeight, "UpdateGate: too early");

        u.status = UpdateStatus.Active;
        u.activatedAt = uint64(block.timestamp);

        if (u.protocolVersion > currentProtocolVersion) {
            currentProtocolVersion = u.protocolVersion;
        }

        emit UpdateActivated(manifestHash, u.protocolVersion);
    }

    /// @notice Cancel a Pending or Staged update (masterKey only).
    function cancelUpdate(bytes32 manifestHash) external onlyMasterKey {
        Update storage u = updates[manifestHash];
        require(
            u.status == UpdateStatus.Pending || u.status == UpdateStatus.Staged,
            "UpdateGate: cannot cancel"
        );
        u.status = UpdateStatus.Cancelled;
        emit UpdateCancelled(manifestHash);
    }

    // --- view helpers ---

    function getSignerList() external view returns (address[] memory) {
        return signerList;
    }
}
