// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Sentinel for VOID mainnet bootstrap run() wiring.
///         Tracks an explicit RUN state and enforces:
///           - chainId guard (must be 2050 on real VOID mainnet)
///           - valid state transitions (no NOT_STARTED -> COMPLETED, etc.)
///         Planning-only for now; will be wired into the real bootstrap
///         flow when we move from PLAN phase to RUN phase.
contract MainnetRunSentinel {
    enum RunStatus {
        NotStarted, // 0
        InProgress, // 1
        Completed, // 2
        Failed // 3
    }

    error Unauthorized(address caller);
    error InvalidChainId(uint256 runtimeChainId, uint256 expectedChainId);
    error InvalidTransition(uint8 fromStatus, uint8 toStatus);

    /// @notice Chain id we expect to be running on (VOID mainnet: 2050).
    uint256 public immutable expectedChainId;

    /// @notice Address allowed to configure the sentinel and set controller.
    address public immutable admin;

    /// @notice Optional controller (e.g. bootstrap script, ops-runner).
    address public controller;

    /// @notice Current RUN status.
    RunStatus public status;

    /// @notice Last config hash (e.g. keccak of LIVE JSON) the sentinel saw.
    bytes32 public lastConfigHash;

    /// @notice Block number at which the last update occurred (as reported).
    uint64 public lastUpdatedBlock;

    /// @notice Timestamp at which the last update occurred (block.timestamp).
    uint64 public lastUpdatedAt;

    event StatusUpdated(
        RunStatus indexed previous,
        RunStatus indexed current,
        bytes32 configHash,
        uint64 blockNumber,
        address indexed caller
    );

    event ControllerUpdated(address indexed previous, address indexed current);

    constructor(uint256 _expectedChainId, address _admin, address _controller) {
        expectedChainId = _expectedChainId;
        admin = _admin;
        controller = _controller;
        status = RunStatus.NotStarted;
        lastConfigHash = bytes32(0);
        lastUpdatedBlock = 0;
        lastUpdatedAt = 0;
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) {
            revert Unauthorized(msg.sender);
        }
        _;
    }

    modifier onlyAdminOrController() {
        if (msg.sender != admin && msg.sender != controller) {
            revert Unauthorized(msg.sender);
        }
        _;
    }

    /// @notice Admin-only: update the controller address.
    function setController(address newController) external onlyAdmin {
        emit ControllerUpdated(controller, newController);
        controller = newController;
    }

    /// @notice Admin or controller can advance RUN state, with guards:
    ///         - chainId must match expectedChainId
    ///         - transition must be valid
    function updateStatus(RunStatus newStatus, bytes32 configHash, uint64 blockNumber) external onlyAdminOrController {
        // Chain guard: if this ever trips on real mainnet, something is very wrong.
        if (block.chainid != expectedChainId) {
            revert InvalidChainId(block.chainid, expectedChainId);
        }

        RunStatus previous = status;

        if (!_isValidTransition(previous, newStatus)) {
            revert InvalidTransition(uint8(previous), uint8(newStatus));
        }

        status = newStatus;
        lastConfigHash = configHash;
        lastUpdatedBlock = blockNumber;
        lastUpdatedAt = uint64(block.timestamp);

        emit StatusUpdated(previous, newStatus, configHash, blockNumber, msg.sender);
    }

    /// @notice Pure transition table to keep logic easy to audit.
    function _isValidTransition(RunStatus from, RunStatus to) internal pure returns (bool) {
        if (from == to) {
            return true;
        }

        // NOT_STARTED -> IN_PROGRESS only
        if (from == RunStatus.NotStarted) {
            return to == RunStatus.InProgress;
        }

        // IN_PROGRESS -> COMPLETED or FAILED
        if (from == RunStatus.InProgress) {
            return to == RunStatus.Completed || to == RunStatus.Failed;
        }

        // COMPLETED / FAILED: terminal states, no further transitions.
        return false;
    }
}
