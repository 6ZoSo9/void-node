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

    /// @notice Legacy-compatible per-call activation batch ceiling.
    /// @dev Despite the historical name, this does not enforce a time- or
    ///      epoch-based churn rate. Epoch admission policy remains external.
    uint256 public immutable activationChurnLimit;

    address public owner;
    address public pendingOwner;
    uint256 public candidateCount;
    uint256 public waitingCount;
    uint256 public activeCount;
    uint256 public pendingActiveExitCount;
    uint256 public totalStaked;

    mapping(address => Candidate) private candidates;
    mapping(address => uint256) public registrationCycle;
    mapping(bytes32 => address) public consensusKeyOwner;
    mapping(address => uint256) public exitRequestedAt;
    mapping(address => bool) public activeSetRemovalRequired;
    mapping(address => bool) public activeSetRemovalConfirmed;
    mapping(address => bytes32) public activeSetRemovalEvidenceHash;
    address[] private candidateOwners;

    uint256 private withdrawalStatus = 1;

    event CandidateRegistered(
        address indexed owner,
        address indexed reward,
        bytes32 indexed consensusKeyHash,
        bytes32 metadataHash,
        uint256 stakeAmount
    );
    event CandidateReRegistered(
        address indexed owner,
        address indexed reward,
        bytes32 indexed consensusKeyHash,
        bytes32 metadataHash,
        uint256 stakeAmount,
        uint256 registrationCycle
    );
    event CandidateProfileUpdated(
        address indexed owner,
        address indexed oldReward,
        address indexed newReward,
        bytes32 oldConsensusKeyHash,
        bytes32 newConsensusKeyHash,
        bytes32 oldMetadataHash,
        bytes32 newMetadataHash
    );
    event CandidateReturnedToCandidate(address indexed owner);
    event CandidateMovedToWaiting(address indexed owner);
    event CandidateMarkedActive(address indexed owner);
    event CandidateJailed(address indexed owner);
    event CandidateExitRequested(
        address indexed owner,
        ValidatorState indexed previousState,
        uint256 withdrawalAvailableAt
    );
    event ActiveSetRemovalConfirmed(
        address indexed owner,
        bytes32 indexed evidenceHash
    );
    event CandidateUnbonded(address indexed owner);
    event StakeWithdrawn(
        address indexed owner,
        address indexed recipient,
        uint256 amount
    );
    event ConsensusKeyReleased(
        address indexed owner,
        bytes32 indexed consensusKeyHash
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
    error ConsensusKeyAlreadyRegistered(
        bytes32 consensusKeyHash,
        address registeredOwner
    );
    error StakeTooLow();
    error StakeNotWithdrawn();
    error NoProfileChange();
    error InvalidState();
    error ActiveCapReached();
    error InvalidMinimumStake();
    error InvalidActiveCap();
    error InvalidChurnLimit();
    error InvalidRecipient();
    error NoStakeAvailable();
    error UnbondingNotReady();
    error ActiveSetRemovalNotRequired();
    error ActiveSetRemovalNotConfirmed();
    error ActiveSetRemovalAlreadyConfirmed();
    error InvalidActiveSetRemovalEvidence();
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

    /// @notice Honest semantic alias for the legacy compatibility getter.
    function maxActivationBatchSize() external view returns (uint256) {
        return activationChurnLimit;
    }

    function registerCandidate(
        address reward,
        bytes32 consensusKeyHash,
        bytes32 metadataHash
    ) external payable nonReentrant {
        if (candidates[msg.sender].owner != address(0)) revert AlreadyRegistered();
        _validateProfile(reward, consensusKeyHash, msg.sender);
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

        consensusKeyOwner[consensusKeyHash] = msg.sender;
        registrationCycle[msg.sender] = 1;
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

    /// @notice Re-enter candidacy after a complete prior exit and withdrawal.
    /// @dev The address remains one unique candidate owner; candidateCount and
    ///      candidateOwners are not duplicated across registration cycles.
    function reregisterCandidate(
        address reward,
        bytes32 consensusKeyHash,
        bytes32 metadataHash
    ) external payable nonReentrant {
        Candidate storage c = candidates[msg.sender];
        if (c.owner == address(0)) revert NotRegistered();
        if (c.state != ValidatorState.Unbonded) revert InvalidState();
        if (c.stakeAmount != 0) revert StakeNotWithdrawn();

        _validateProfile(reward, consensusKeyHash, msg.sender);
        if (msg.value < minValidatorStake) revert StakeTooLow();

        uint256 cycle = registrationCycle[msg.sender] + 1;
        c.reward = reward;
        c.consensusKeyHash = consensusKeyHash;
        c.metadataHash = metadataHash;
        c.stakeAmount = msg.value;
        c.registeredAt = block.timestamp;
        c.updatedAt = block.timestamp;
        c.state = ValidatorState.Candidate;

        registrationCycle[msg.sender] = cycle;
        consensusKeyOwner[consensusKeyHash] = msg.sender;
        exitRequestedAt[msg.sender] = 0;
        activeSetRemovalRequired[msg.sender] = false;
        activeSetRemovalConfirmed[msg.sender] = false;
        activeSetRemovalEvidenceHash[msg.sender] = bytes32(0);
        totalStaked += msg.value;

        emit CandidateReRegistered(
            msg.sender,
            reward,
            consensusKeyHash,
            metadataHash,
            msg.value,
            cycle
        );
    }

    /// @notice Update public validator profile before Waiting admission.
    /// @dev A Waiting participant may first call returnToCandidate(). Active,
    ///      Exiting, Jailed, and Unbonded records cannot mutate their profile.
    function updateCandidateProfile(
        address reward,
        bytes32 consensusKeyHash,
        bytes32 metadataHash
    ) external nonReentrant {
        Candidate storage c = candidates[msg.sender];
        if (c.owner == address(0)) revert NotRegistered();
        if (c.state != ValidatorState.Candidate) revert InvalidState();

        _validateProfile(reward, consensusKeyHash, msg.sender);
        if (
            c.reward == reward &&
            c.consensusKeyHash == consensusKeyHash &&
            c.metadataHash == metadataHash
        ) revert NoProfileChange();

        address oldReward = c.reward;
        bytes32 oldConsensusKeyHash = c.consensusKeyHash;
        bytes32 oldMetadataHash = c.metadataHash;

        if (oldConsensusKeyHash != consensusKeyHash) {
            if (consensusKeyOwner[oldConsensusKeyHash] == msg.sender) {
                delete consensusKeyOwner[oldConsensusKeyHash];
            }
            consensusKeyOwner[consensusKeyHash] = msg.sender;
        }

        c.reward = reward;
        c.consensusKeyHash = consensusKeyHash;
        c.metadataHash = metadataHash;
        c.updatedAt = block.timestamp;

        emit CandidateProfileUpdated(
            msg.sender,
            oldReward,
            reward,
            oldConsensusKeyHash,
            consensusKeyHash,
            oldMetadataHash,
            metadataHash
        );
    }

    /// @notice Voluntarily leave Waiting without beginning stake unbonding.
    function returnToCandidate() external nonReentrant {
        Candidate storage c = candidates[msg.sender];
        if (c.owner == address(0)) revert NotRegistered();
        if (c.state != ValidatorState.Waiting) revert InvalidState();

        waitingCount -= 1;
        c.state = ValidatorState.Candidate;
        c.updatedAt = block.timestamp;

        emit CandidateReturnedToCandidate(msg.sender);
    }

    function moveToWaiting(address candidateOwner) external onlyOwner nonReentrant {
        Candidate storage c = candidates[candidateOwner];
        if (c.owner == address(0)) revert NotRegistered();
        if (c.state != ValidatorState.Candidate) revert InvalidState();

        c.state = ValidatorState.Waiting;
        c.updatedAt = block.timestamp;
        waitingCount += 1;

        emit CandidateMovedToWaiting(candidateOwner);
    }

    /// @notice Capped admission hook for future epoch activation proofs.
    /// @dev activationChurnLimit limits one call only. This registry does not
    ///      claim to enforce a temporal or epoch churn rate.
    function markActiveBatch(address[] calldata owners) external onlyOwner nonReentrant {
        if (
            owners.length == 0 ||
            owners.length > activationChurnLimit
        ) {
            revert InvalidState();
        }
        if (
            activeCount + pendingActiveExitCount + owners.length >
            maxActiveValidators
        ) {
            revert ActiveCapReached();
        }

        for (uint256 i = 0; i < owners.length; i++) {
            Candidate storage c = candidates[owners[i]];
            if (c.owner == address(0)) revert NotRegistered();
            if (c.state != ValidatorState.Waiting) revert InvalidState();

            c.state = ValidatorState.Active;
            c.updatedAt = block.timestamp;
            activeSetRemovalRequired[owners[i]] = false;
            activeSetRemovalConfirmed[owners[i]] = false;
            activeSetRemovalEvidenceHash[owners[i]] = bytes32(0);

            waitingCount -= 1;
            activeCount += 1;

            emit CandidateMarkedActive(owners[i]);
        }
    }

    /// @notice Remove a candidate from Candidate, Waiting, or Active status.
    /// @dev Jailing never transfers or destroys the participant's stake. For an
    ///      Active validator, the owner action is the explicit registry-side
    ///      acknowledgment that the separate active set has removed it.
    function jail(address candidateOwner) external onlyOwner nonReentrant {
        Candidate storage c = candidates[candidateOwner];
        if (c.owner == address(0)) revert NotRegistered();

        if (c.state == ValidatorState.Waiting) {
            waitingCount -= 1;
        } else if (c.state == ValidatorState.Active) {
            activeCount -= 1;
            activeSetRemovalRequired[candidateOwner] = true;
            activeSetRemovalConfirmed[candidateOwner] = true;
            activeSetRemovalEvidenceHash[candidateOwner] = keccak256(
                abi.encodePacked(
                    "VOID_VALIDATOR_ACTIVE_SET_REMOVAL_OWNER_JAIL_V1",
                    block.chainid,
                    address(this),
                    candidateOwner,
                    block.number
                )
            );
            emit ActiveSetRemovalConfirmed(
                candidateOwner,
                activeSetRemovalEvidenceHash[candidateOwner]
            );
        } else if (c.state != ValidatorState.Candidate) {
            revert InvalidState();
        }

        c.state = ValidatorState.Jailed;
        c.updatedAt = block.timestamp;

        emit CandidateJailed(candidateOwner);
    }

    /// @notice Begin a participant-controlled delayed exit.
    /// @dev An Active participant may request exit without owner cooperation, but
    ///      cannot finalize until registry authority confirms external active-set
    ///      removal with a nonzero evidence commitment.
    function requestExit() external nonReentrant {
        Candidate storage c = candidates[msg.sender];
        if (c.owner == address(0)) revert NotRegistered();

        ValidatorState previousState = c.state;
        if (previousState == ValidatorState.Waiting) {
            waitingCount -= 1;
        } else if (previousState == ValidatorState.Active) {
            activeCount -= 1;
            pendingActiveExitCount += 1;
            activeSetRemovalRequired[msg.sender] = true;
            activeSetRemovalConfirmed[msg.sender] = false;
            activeSetRemovalEvidenceHash[msg.sender] = bytes32(0);
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

    /// @notice Bind an external active-set removal proof before active stake exits.
    /// @dev The evidence hash is public and non-secret. This function does not
    ///      inspect runtime state; it records the separate operator proof decision.
    function confirmActiveSetRemoval(
        address candidateOwner,
        bytes32 evidenceHash
    ) external onlyOwner nonReentrant {
        Candidate storage c = candidates[candidateOwner];
        if (c.owner == address(0)) revert NotRegistered();
        if (!activeSetRemovalRequired[candidateOwner]) {
            revert ActiveSetRemovalNotRequired();
        }
        if (activeSetRemovalConfirmed[candidateOwner]) {
            revert ActiveSetRemovalAlreadyConfirmed();
        }
        if (c.state != ValidatorState.Exiting) revert InvalidState();
        if (evidenceHash == bytes32(0)) {
            revert InvalidActiveSetRemovalEvidence();
        }

        activeSetRemovalConfirmed[candidateOwner] = true;
        activeSetRemovalEvidenceHash[candidateOwner] = evidenceHash;
        pendingActiveExitCount -= 1;

        emit ActiveSetRemovalConfirmed(candidateOwner, evidenceHash);
    }

    /// @notice Complete a participant-controlled exit after the fixed delay.
    function finalizeExit() external nonReentrant {
        Candidate storage c = candidates[msg.sender];
        if (c.owner == address(0)) revert NotRegistered();
        if (c.state != ValidatorState.Exiting) revert InvalidState();

        uint256 requestedAt = exitRequestedAt[msg.sender];
        if (
            requestedAt == 0 ||
            block.timestamp < requestedAt + UNBONDING_DELAY
        ) revert UnbondingNotReady();
        if (
            activeSetRemovalRequired[msg.sender] &&
            !activeSetRemovalConfirmed[msg.sender]
        ) revert ActiveSetRemovalNotConfirmed();

        c.state = ValidatorState.Unbonded;
        c.updatedAt = block.timestamp;

        emit CandidateUnbonded(msg.sender);
    }

    /// @notice Administrative removal that makes stake immediately withdrawable.
    /// @dev Active validators cannot use this direct path. They must first exit
    ///      or be jailed so external active-set removal is explicitly accounted.
    ///      An already-started participant exit cannot be bypassed.
    function markUnbonded(address candidateOwner) external onlyOwner nonReentrant {
        Candidate storage c = candidates[candidateOwner];
        if (c.owner == address(0)) revert NotRegistered();

        if (c.state == ValidatorState.Waiting) {
            waitingCount -= 1;
        } else if (c.state == ValidatorState.Active) {
            revert ActiveSetRemovalNotConfirmed();
        } else if (
            c.state != ValidatorState.Candidate &&
            c.state != ValidatorState.Jailed
        ) {
            revert InvalidState();
        }

        if (
            activeSetRemovalRequired[candidateOwner] &&
            !activeSetRemovalConfirmed[candidateOwner]
        ) revert ActiveSetRemovalNotConfirmed();

        c.state = ValidatorState.Unbonded;
        c.updatedAt = block.timestamp;
        exitRequestedAt[candidateOwner] = 0;

        emit CandidateUnbonded(candidateOwner);
    }

    /// @notice Withdraw the candidate's complete recorded stake after unbonding.
    /// @dev All registry mutations are nonReentrant, so a recipient callback
    ///      cannot change registry lifecycle state during the transfer.
    function withdrawStake(address payable recipient) external nonReentrant {
        Candidate storage c = candidates[msg.sender];
        if (c.owner == address(0)) revert NotRegistered();
        if (c.state != ValidatorState.Unbonded) revert InvalidState();
        if (recipient == address(0)) revert InvalidRecipient();

        uint256 amount = c.stakeAmount;
        if (amount == 0) revert NoStakeAvailable();

        bytes32 releasedConsensusKeyHash = c.consensusKeyHash;
        c.stakeAmount = 0;
        c.updatedAt = block.timestamp;
        totalStaked -= amount;
        if (consensusKeyOwner[releasedConsensusKeyHash] == msg.sender) {
            delete consensusKeyOwner[releasedConsensusKeyHash];
        }

        (bool transferred, ) = recipient.call{value: amount}("");
        if (!transferred) revert StakeTransferFailed();

        emit ConsensusKeyReleased(msg.sender, releasedConsensusKeyHash);
        emit StakeWithdrawn(msg.sender, recipient, amount);
    }

    function getCandidate(
        address candidateOwner
    ) external view returns (Candidate memory) {
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

    /// @notice Explicit alias for candidateCount's unique-owner semantics.
    function uniqueCandidateOwnerCount() external view returns (uint256) {
        return candidateCount;
    }

    /// @notice Start a two-step ownership transfer.
    function transferOwnership(address newOwner) external onlyOwner nonReentrant {
        if (newOwner == address(0) || newOwner == owner) revert InvalidOwner();
        if (pendingOwner != address(0)) revert OwnershipTransferPending();

        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function cancelOwnershipTransfer() external onlyOwner nonReentrant {
        address canceled = pendingOwner;
        if (canceled == address(0)) revert NoOwnershipTransferPending();

        pendingOwner = address(0);
        emit OwnershipTransferCanceled(owner, canceled);
    }

    function acceptOwnership() external nonReentrant {
        if (msg.sender != pendingOwner) revert NotPendingOwner();

        address oldOwner = owner;
        owner = msg.sender;
        pendingOwner = address(0);

        emit OwnershipTransferred(oldOwner, msg.sender);
    }

    function _validateProfile(
        address reward,
        bytes32 consensusKeyHash,
        address candidateOwner
    ) private view {
        if (reward == address(0)) revert InvalidReward();
        if (consensusKeyHash == bytes32(0)) revert InvalidConsensusKey();

        address registeredOwner = consensusKeyOwner[consensusKeyHash];
        if (
            registeredOwner != address(0) &&
            registeredOwner != candidateOwner
        ) {
            revert ConsensusKeyAlreadyRegistered(
                consensusKeyHash,
                registeredOwner
            );
        }
    }
}
