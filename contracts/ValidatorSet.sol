// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

/// @title VOID ValidatorSet v1
/// @notice Minimal on-chain registry of active validators for VOID.
/// @dev V1 is deliberately simple and MasterKey-controlled. Consensus logic lives in void-node.
contract ValidatorSet {
    /// @notice Chain id this set is bound to (2050 on VOID mainnet).
    uint256 public immutable chainId;

    /// @notice Master key that controls validator membership and stake updates.
    address public masterKey;

    struct Validator {
        address consensusAddr; // address/key used at the consensus layer
        uint256 bondedStake; // nominal bonded stake (for off-chain weighting)
        bool active; // whether this validator is currently in the active set
        uint64 joinedAt; // block number when first added
        uint64 updatedAt; // block number of last update
    }

    /// @notice Monotonically increasing validator id (1-based).
    uint256 public nextValidatorId;

    /// @notice Validator records by id.
    mapping(uint256 => Validator) public validators;

    /// @notice Lookup from consensus address to validator id (0 if not registered).
    mapping(address => uint256) public validatorIdByAddress;

    event MasterKeyChanged(address indexed oldKey, address indexed newKey);

    event ValidatorAdded(uint256 indexed validatorId, address indexed consensusAddr, uint256 bondedStake);

    event ValidatorStakeUpdated(uint256 indexed validatorId, uint256 bondedStake);

    event ValidatorStatusUpdated(uint256 indexed validatorId, bool active);

    modifier onlyMaster() {
        require(msg.sender == masterKey, "ValidatorSet: not master");
        _;
    }

    /// @notice Contract version (not protocol version).
    function VERSION() external pure returns (uint256) {
        return 1;
    }

    /// @param chainId_ Chain id this set is for (2050 on VOID mainnet).
    /// @param masterKey_ Initial MasterKey controller.
    constructor(uint256 chainId_, address masterKey_) {
        require(chainId_ != 0, "ValidatorSet: chainId zero");
        require(masterKey_ != address(0), "ValidatorSet: masterKey zero");
        chainId = chainId_;
        masterKey = masterKey_;
        emit MasterKeyChanged(address(0), masterKey_);
    }

    /// @notice Add a new validator (MasterKey only).
    /// @dev V1: staking / slashing is handled off-chain or in a separate contract.
    function addValidator(address consensusAddr, uint256 bondedStake)
        external
        onlyMaster
        returns (uint256 validatorId)
    {
        require(consensusAddr != address(0), "ValidatorSet: zero addr");
        require(validatorIdByAddress[consensusAddr] == 0, "ValidatorSet: already registered");

        validatorId = ++nextValidatorId;

        Validator storage v = validators[validatorId];
        v.consensusAddr = consensusAddr;
        v.bondedStake = bondedStake;
        v.active = true;
        v.joinedAt = uint64(block.number);
        v.updatedAt = uint64(block.number);

        validatorIdByAddress[consensusAddr] = validatorId;

        emit ValidatorAdded(validatorId, consensusAddr, bondedStake);
        emit ValidatorStatusUpdated(validatorId, true);
    }

    /// @notice Update bonded stake for a validator (MasterKey only).
    function setValidatorStake(uint256 validatorId, uint256 bondedStake) external onlyMaster {
        Validator storage v = validators[validatorId];
        require(v.consensusAddr != address(0), "ValidatorSet: unknown");
        v.bondedStake = bondedStake;
        v.updatedAt = uint64(block.number);

        emit ValidatorStakeUpdated(validatorId, bondedStake);
    }

    /// @notice Toggle validator active flag (MasterKey only).
    function setValidatorActive(uint256 validatorId, bool active) external onlyMaster {
        Validator storage v = validators[validatorId];
        require(v.consensusAddr != address(0), "ValidatorSet: unknown");
        v.active = active;
        v.updatedAt = uint64(block.number);

        emit ValidatorStatusUpdated(validatorId, active);
    }

    /// @notice Change MasterKey (MasterKey only).
    function setMasterKey(address newMasterKey) external onlyMaster {
        require(newMasterKey != address(0), "ValidatorSet: masterKey zero");
        address old = masterKey;
        masterKey = newMasterKey;
        emit MasterKeyChanged(old, newMasterKey);
    }

    /// @notice Cheap helper for node software: is this consensus addr active?
    function isActive(address consensusAddr) external view returns (bool) {
        uint256 id = validatorIdByAddress[consensusAddr];
        if (id == 0) {
            return false;
        }
        return validators[id].active;
    }

    /// @notice View helper returning the full validator struct.
    function getValidator(uint256 validatorId)
        external
        view
        returns (address consensusAddr, uint256 bondedStake, bool active, uint64 joinedAt, uint64 updatedAt)
    {
        Validator storage v = validators[validatorId];
        require(v.consensusAddr != address(0), "ValidatorSet: unknown");
        return (v.consensusAddr, v.bondedStake, v.active, v.joinedAt, v.updatedAt);
    }
}
