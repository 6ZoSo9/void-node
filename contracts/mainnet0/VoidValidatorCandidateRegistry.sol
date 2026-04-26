// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal Mainnet-0 public validator candidate/waiting registry.
/// @dev This contract intentionally does NOT alter the active validator set.
///      Active validator admission remains a separate capped epoch/governance/operator process.
contract VoidValidatorCandidateRegistry {
    enum ValidatorState {
        None,
        Candidate,
        Waiting,
        Active,
        Exiting,
        Jailed,
        Unbonded
    }

    struct Candidate {
        address owner;
        address reward;
        bytes32 consensusKeyHash;
        bytes32 metadataHash;
        uint256 stakeAmount;
        uint256 registeredAt;
        uint256 updatedAt;
        ValidatorState state;
    }

    uint256 public immutable minValidatorStake;
    uint256 public immutable maxActiveValidators;
    uint256 public immutable activationChurnLimit;

    address public owner;
    uint256 public candidateCount;
    uint256 public waitingCount;
    uint256 public activeCount;

    mapping(address => Candidate) private candidates;
    address[] private candidateOwners;

    event CandidateRegistered(
        address indexed owner,
        address indexed reward,
        bytes32 indexed consensusKeyHash,
        bytes32 metadataHash,
        uint256 stakeAmount
    );

    event CandidateMovedToWaiting(address indexed owner);
    event CandidateMarkedActive(address indexed owner);
    event CandidateJailed(address indexed owner);
    event CandidateUnbonded(address indexed owner);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    error NotOwner();
    error AlreadyRegistered();
    error NotRegistered();
    error InvalidReward();
    error InvalidConsensusKey();
    error StakeTooLow();
    error InvalidState();
    error ActiveCapReached();
    error ChurnLimitZero();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(
        uint256 _minValidatorStake,
        uint256 _maxActiveValidators,
        uint256 _activationChurnLimit
    ) {
        if (_activationChurnLimit == 0) revert ChurnLimitZero();
        owner = msg.sender;
        minValidatorStake = _minValidatorStake;
        maxActiveValidators = _maxActiveValidators;
        activationChurnLimit = _activationChurnLimit;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function registerCandidate(
        address reward,
        bytes32 consensusKeyHash,
        bytes32 metadataHash
    ) external payable {
        if (candidates[msg.sender].owner != address(0)) revert AlreadyRegistered();
        if (reward == address(0)) revert InvalidReward();
        if (consensusKeyHash == bytes32(0)) revert InvalidConsensusKey();
        if (msg.value < minValidatorStake) revert StakeTooLow();

        candidates[msg.sender] = Candidate({
            owner: msg.sender,
            reward: reward,
            consensusKeyHash: consensusKeyHash,
            metadataHash: metadataHash,
            stakeAmount: msg.value,
            registeredAt: block.timestamp,
            updatedAt: block.timestamp,
            state: ValidatorState.Candidate
        });

        candidateOwners.push(msg.sender);
        candidateCount += 1;

        emit CandidateRegistered(msg.sender, reward, consensusKeyHash, metadataHash, msg.value);
    }

    function moveToWaiting(address candidateOwner) external onlyOwner {
        Candidate storage c = candidates[candidateOwner];
        if (c.owner == address(0)) revert NotRegistered();
        if (c.state != ValidatorState.Candidate) revert InvalidState();

        c.state = ValidatorState.Waiting;
        c.updatedAt = block.timestamp;
        waitingCount += 1;

        emit CandidateMovedToWaiting(candidateOwner);
    }

    /// @notice Minimal capped admission hook for future epoch activation proofs.
    /// @dev This is intentionally owner-gated for Mainnet-0. Public registration never calls this.
    function markActiveBatch(address[] calldata owners) external onlyOwner {
        if (owners.length == 0 || owners.length > activationChurnLimit) revert InvalidState();
        if (activeCount + owners.length > maxActiveValidators) revert ActiveCapReached();

        for (uint256 i = 0; i < owners.length; i++) {
            Candidate storage c = candidates[owners[i]];
            if (c.owner == address(0)) revert NotRegistered();
            if (c.state != ValidatorState.Waiting) revert InvalidState();

            c.state = ValidatorState.Active;
            c.updatedAt = block.timestamp;

            waitingCount -= 1;
            activeCount += 1;

            emit CandidateMarkedActive(owners[i]);
        }
    }

    function jail(address candidateOwner) external onlyOwner {
        Candidate storage c = candidates[candidateOwner];
        if (c.owner == address(0)) revert NotRegistered();

        if (c.state == ValidatorState.Waiting) {
            waitingCount -= 1;
        } else if (c.state == ValidatorState.Active) {
            activeCount -= 1;
        }

        c.state = ValidatorState.Jailed;
        c.updatedAt = block.timestamp;

        emit CandidateJailed(candidateOwner);
    }

    function markUnbonded(address candidateOwner) external onlyOwner {
        Candidate storage c = candidates[candidateOwner];
        if (c.owner == address(0)) revert NotRegistered();

        if (c.state == ValidatorState.Waiting) {
            waitingCount -= 1;
        } else if (c.state == ValidatorState.Active) {
            activeCount -= 1;
        }

        c.state = ValidatorState.Unbonded;
        c.updatedAt = block.timestamp;

        emit CandidateUnbonded(candidateOwner);
    }

    function getCandidate(address candidateOwner) external view returns (Candidate memory) {
        Candidate memory c = candidates[candidateOwner];
        if (c.owner == address(0)) revert NotRegistered();
        return c;
    }

    function getCandidateOwner(uint256 index) external view returns (address) {
        return candidateOwners[index];
    }

    function allCandidateOwnersLength() external view returns (uint256) {
        return candidateOwners.length;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidReward();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
