// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Mainnet-0 public validator candidate and waiting registry.
/// @dev Public registration never activates a validator. Active admission remains
///      a separate capped epoch/governance/operator process with runtime proof.
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

    /// @notice Mainnet-0 participant-controlled exit delay.
    uint256 public constant UNBONDING_DELAY = 7 days;

    uint256 public immutable minValidatorStake;
    uint256 public immutable maxActiveValidators;
    uint256 public immutable activationChurnLimit;

    address public owner;
    address public pendingOwner;
    uint256 public candidateCount;
    uint256 public waitingCount;
    uint256 public activeCount;
    uint256 public totalStaked;

    mapping(address => Candidate) private candidates;
    mapping(address => uint256) public exitRequestedAt;
    address[] private candidateOwners;

    uint256 private withdrawalStatus = 1;

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
    event CandidateExitRequested(
        address indexed owner,
        ValidatorState indexed previousState,
        uint256 withdrawalAvailableAt
    );
    event CandidateUnbonded(address indexed owner);
    event StakeWithdrawn(
        address indexed owner,
        address indexed recipient,
        uint256 amount
    );
    event OwnershipTransferStarted(
        address indexed currentOwner,
        address indexed pendingOwner
    );
    event OwnershipTransferCanceled(
        address indexed currentOwner,
        address indexed canceledPendingOwner
    );
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    error NotOwner();
    error NotPendingOwner();
    error AlreadyRegistered();
    error NotRegistered();
    error InvalidReward();
    error InvalidConsensusKey();
    error StakeTooLow();
    error InvalidState();
    error ActiveCapReached();
    error InvalidMinimumStake();
    error InvalidActiveCap();
    error InvalidChurnLimit();
    error InvalidRecipient();
    error NoStakeAvailable();
    error UnbondingNotReady();
    error Reentrancy();
    error StakeTransferFailed();
    error InvalidOwner();
    error OwnershipTransferPending();
    error NoOwnershipTransferPending();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (withdrawalStatus != 1) revert Reentrancy();
        withdrawalStatus = 2;
        _;
        withdrawalStatus = 1;
    }

    constructor(
        uint256 _minValidatorStake,
        uint256 _maxActiveValidators,
        uint256 _activationChurnLimit
    ) {
        if (_minValidatorStake == 0) revert InvalidMinimumStake();
        if (_maxActiveValidators == 0) revert InvalidActiveCap();
        if (
            _activationChurnLimit == 0 ||
            _activationChurnLimit > _maxActiveValidators
        ) revert InvalidChurnLimit();

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
        totalStaked += msg.value;

        emit CandidateRegistered(
            msg.sender,
            reward,
            consensusKeyHash,
            metadataHash,
            msg.value
        );
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
    /// @dev Public registration never calls this function.
    function markActiveBatch(address[] calldata owners) external onlyOwner {
        if (owners.length == 0 || owners.length > activationChurnLimit) {
            revert InvalidState();
        }
        if (activeCount + owners.length > maxActiveValidators) {
            revert ActiveCapReached();
        }

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

    /// @notice Remove a candidate from Candidate, Waiting, or Active status.
    /// @dev Jailing never transfers or destroys the participant's stake. A jailed
    ///      participant may still request a delayed exit.
    function jail(address candidateOwner) external onlyOwner {
        Candidate storage c = candidates[candidateOwner];
        if (c.owner == address(0)) revert NotRegistered();

        if (c.state == ValidatorState.Waiting) {
            waitingCount -= 1;
        } else if (c.state == ValidatorState.Active) {
            activeCount -= 1;
        } else if (c.state != ValidatorState.Candidate) {
            revert InvalidState();
        }

        c.state = ValidatorState.Jailed;
        c.updatedAt = block.timestamp;

        emit CandidateJailed(candidateOwner);
    }

    /// @notice Begin a participant-controlled delayed exit.
    /// @dev Candidate, Waiting, Active, and Jailed participants can always start
    ///      an exit without registry-owner cooperation.
    function requestExit() external {
        Candidate storage c = candidates[msg.sender];
        if (c.owner == address(0)) revert NotRegistered();

        ValidatorState previousState = c.state;
        if (previousState == ValidatorState.Waiting) {
            waitingCount -= 1;
        } else if (previousState == ValidatorState.Active) {
            activeCount -= 1;
        } else if (
            previousState != ValidatorState.Candidate &&
            previousState != ValidatorState.Jailed
        ) {
            revert InvalidState();
        }

        uint256 requestedAt = block.timestamp;
        exitRequestedAt[msg.sender] = requestedAt;
        c.state = ValidatorState.Exiting;
        c.updatedAt = requestedAt;

        emit CandidateExitRequested(
            msg.sender,
            previousState,
            requestedAt + UNBONDING_DELAY
        );
    }

    /// @notice Complete a participant-controlled exit after the fixed delay.
    function finalizeExit() external {
        Candidate storage c = candidates[msg.sender];
        if (c.owner == address(0)) revert NotRegistered();
        if (c.state != ValidatorState.Exiting) revert InvalidState();

        uint256 requestedAt = exitRequestedAt[msg.sender];
        if (
            requestedAt == 0 ||
            block.timestamp < requestedAt + UNBONDING_DELAY
        ) revert UnbondingNotReady();

        c.state = ValidatorState.Unbonded;
        c.updatedAt = block.timestamp;

        emit CandidateUnbonded(msg.sender);
    }

    /// @notice Administrative removal that makes stake immediately withdrawable.
    /// @dev This is deliberately limited to Candidate, Waiting, Active, or Jailed.
    ///      It cannot bypass an already-started participant exit delay.
    function markUnbonded(address candidateOwner) external onlyOwner {
        Candidate storage c = candidates[candidateOwner];
        if (c.owner == address(0)) revert NotRegistered();

        if (c.state == ValidatorState.Waiting) {
            waitingCount -= 1;
        } else if (c.state == ValidatorState.Active) {
            activeCount -= 1;
        } else if (
            c.state != ValidatorState.Candidate &&
            c.state != ValidatorState.Jailed
        ) {
            revert InvalidState();
        }

        c.state = ValidatorState.Unbonded;
        c.updatedAt = block.timestamp;
        exitRequestedAt[candidateOwner] = 0;

        emit CandidateUnbonded(candidateOwner);
    }

    /// @notice Withdraw the candidate's complete recorded stake after unbonding.
    /// @dev Checks-effects-interactions and a reentrancy guard protect the transfer.
    function withdrawStake(address payable recipient) external nonReentrant {
        Candidate storage c = candidates[msg.sender];
        if (c.owner == address(0)) revert NotRegistered();
        if (c.state != ValidatorState.Unbonded) revert InvalidState();
        if (recipient == address(0)) revert InvalidRecipient();

        uint256 amount = c.stakeAmount;
        if (amount == 0) revert NoStakeAvailable();

        c.stakeAmount = 0;
        c.updatedAt = block.timestamp;
        totalStaked -= amount;

        (bool transferred, ) = recipient.call{value: amount}("");
        if (!transferred) revert StakeTransferFailed();

        emit StakeWithdrawn(msg.sender, recipient, amount);
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

    /// @notice Start a two-step ownership transfer.
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0) || newOwner == owner) revert InvalidOwner();
        if (pendingOwner != address(0)) revert OwnershipTransferPending();

        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function cancelOwnershipTransfer() external onlyOwner {
        address canceled = pendingOwner;
        if (canceled == address(0)) revert NoOwnershipTransferPending();

        pendingOwner = address(0);
        emit OwnershipTransferCanceled(owner, canceled);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();

        address oldOwner = owner;
        owner = msg.sender;
        pendingOwner = address(0);

        emit OwnershipTransferred(oldOwner, msg.sender);
    }
}
