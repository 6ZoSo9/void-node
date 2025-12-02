// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MainnetRunSentinel
/// @notice On-chain bootstrap RUN sentinel for VOID mainnet (chainId 2050).
///         Stores a minimal, verifiable view of the bootstrap run status and
///         the hash of the live bootstrap config used for the run.
/// @dev This is planning-first; wiring from the bootstrap script comes later.
contract MainnetRunSentinel {
    enum RunStatus {
        NOT_STARTED,
        IN_PROGRESS,
        COMPLETED,
        FAILED
    }

    struct RunState {
        RunStatus status;
        bytes32 configHash;
        uint64 startedAt;
        uint64 completedAt;
        uint64 updatedAt;
        uint32 runTxs;
    }

    /// @notice Hard-coded chain id for VOID mainnet.
    uint256 public constant CHAIN_ID = 2050;

    /// @notice Admin account (typically AdminGate or a cold owner).
    address public immutable admin;

    /// @notice Controller account (bootstrap script hot key).
    address public controller;

    RunState private _state;

    event ControllerUpdated(address indexed oldController, address indexed newController);
    event RunStatusUpdated(
        RunStatus indexed oldStatus,
        RunStatus indexed newStatus,
        bytes32 configHash,
        uint64 startedAt,
        uint64 completedAt,
        uint64 updatedAt,
        uint32 runTxs
    );

    error NotAuthorized();
    error InvalidChainId(uint256 expected, uint256 actual);
    error InvalidTransition(RunStatus fromStatus, RunStatus toStatus);

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAuthorized();
        _;
    }

    modifier onlyAdminOrController() {
        if (msg.sender != admin && msg.sender != controller) revert NotAuthorized();
        _;
    }

    constructor(address _admin, address _controller, bytes32 initialConfigHash, uint256 runtimeChainId) {
        if (runtimeChainId != CHAIN_ID) {
            revert InvalidChainId(CHAIN_ID, runtimeChainId);
        }
        require(_admin != address(0), "admin zero");
        require(_controller != address(0), "controller zero");

        admin = _admin;
        controller = _controller;

        _state = RunState({
            status: RunStatus.NOT_STARTED,
            configHash: initialConfigHash,
            startedAt: 0,
            completedAt: 0,
            updatedAt: uint64(block.timestamp),
            runTxs: 0
        });

        emit RunStatusUpdated(
            RunStatus.NOT_STARTED, RunStatus.NOT_STARTED, initialConfigHash, 0, 0, _state.updatedAt, 0
        );
    }

    /// @notice Returns the full current run state.
    function getState() external view returns (RunState memory) {
        return _state;
    }

    /// @notice Convenience view helpers.
    function status() external view returns (RunStatus) {
        return _state.status;
    }

    function configHash() external view returns (bytes32) {
        return _state.configHash;
    }

    function startedAt() external view returns (uint64) {
        return _state.startedAt;
    }

    function completedAt() external view returns (uint64) {
        return _state.completedAt;
    }

    function updatedAt() external view returns (uint64) {
        return _state.updatedAt;
    }

    function runTxs() external view returns (uint32) {
        return _state.runTxs;
    }

    /// @notice Admin can change the controller (e.g. rotate bootstrap key).
    function setController(address newController) external onlyAdmin {
        require(newController != address(0), "controller zero");
        address old = controller;
        controller = newController;
        emit ControllerUpdated(old, newController);
    }

    /// @notice Update status + config hash + optional tx counter.
    /// @dev Intended transitions:
    ///      NOT_STARTED -> IN_PROGRESS -> COMPLETED
    ///      NOT_STARTED -> FAILED
    ///      IN_PROGRESS -> FAILED
    function updateStatus(RunStatus newStatus, bytes32 newConfigHash, uint32 newRunTxs) external onlyAdminOrController {
        RunStatus oldStatus = _state.status;

        // Guard basic transition sanity.
        if (oldStatus == RunStatus.COMPLETED) {
            revert InvalidTransition(oldStatus, newStatus);
        }
        if (oldStatus == RunStatus.NOT_STARTED && newStatus == RunStatus.COMPLETED) {
            // Must pass through IN_PROGRESS first.
            revert InvalidTransition(oldStatus, newStatus);
        }

        uint64 ts = uint64(block.timestamp);

        _state.status = newStatus;

        if (newConfigHash != bytes32(0)) {
            _state.configHash = newConfigHash;
        }

        if (oldStatus == RunStatus.NOT_STARTED && newStatus == RunStatus.IN_PROGRESS) {
            if (_state.startedAt == 0) {
                _state.startedAt = ts;
            }
        }

        if (newStatus == RunStatus.COMPLETED || newStatus == RunStatus.FAILED) {
            _state.completedAt = ts;
        }

        if (newRunTxs != 0) {
            _state.runTxs = newRunTxs;
        }

        _state.updatedAt = ts;

        emit RunStatusUpdated(
            oldStatus,
            newStatus,
            _state.configHash,
            _state.startedAt,
            _state.completedAt,
            _state.updatedAt,
            _state.runTxs
        );
    }
}
