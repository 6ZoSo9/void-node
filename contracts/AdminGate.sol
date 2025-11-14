// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

/// @title AdminGate – VOID master key router (v1)
/// @notice Holds the real MasterKey and forwards privileged calls to system contracts.
contract AdminGate {
    uint256 public immutable chainId;      // 2050 on VOID mainnet

    // EOA / multisig / HW wallet that actually controls AdminGate.
    address public masterKey;

    // Convenience pointer to UpdateGate (also stored in systemContracts).
    address public updateGate;

    // Generic registry for system contracts, e.g.:
    // keccak256("UPDATE_GATE") => UpdateGate address
    // keccak256("CONFIG_GATE") => ConfigGate address
    mapping(bytes32 => address) public systemContracts;

    // --- Events ---

    event MasterKeyChanged(address indexed oldKey, address indexed newKey);
    event UpdateGateChanged(address indexed oldGate, address indexed newGate);
    event SystemContractChanged(bytes32 indexed key, address indexed oldTarget, address indexed newTarget);

    // `selector` = first 4 bytes of calldata
    event Forwarded(address indexed target, bytes4 indexed selector, bool success);

    // --- Modifiers ---

    modifier onlyMasterKey() {
        require(msg.sender == masterKey, "AdminGate: not master");
        _;
    }

    // --- Constructor ---

    constructor(
        uint256 _chainId,
        address _masterKey,
        address _updateGate
    ) {
        require(_masterKey != address(0), "AdminGate: masterKey=0");
        chainId = _chainId;
        masterKey = _masterKey;
        updateGate = _updateGate;

        if (_updateGate != address(0)) {
            bytes32 key = keccak256("UPDATE_GATE");
            systemContracts[key] = _updateGate;
            emit SystemContractChanged(key, address(0), _updateGate);
        }
    }

    // --- Master key management ---

    function setMasterKey(address newKey) external onlyMasterKey {
        require(newKey != address(0), "AdminGate: newKey=0");
        address old = masterKey;
        masterKey = newKey;
        emit MasterKeyChanged(old, newKey);
    }

    // --- System contract wiring ---

    function setUpdateGate(address newGate) external onlyMasterKey {
        address old = updateGate;
        updateGate = newGate;

        bytes32 key = keccak256("UPDATE_GATE");
        address oldSys = systemContracts[key];
        systemContracts[key] = newGate;

        emit UpdateGateChanged(old, newGate);
        emit SystemContractChanged(key, oldSys, newGate);
    }

    function setSystemContract(bytes32 key, address target) external onlyMasterKey {
        address old = systemContracts[key];
        systemContracts[key] = target;
        emit SystemContractChanged(key, old, target);
    }

    // --- Generic forwarding ---

    /// @notice Forward an opaque admin call to a registered system contract.
    /// @dev Reverts if target is unset or the call fails.
    function forward(bytes32 key, bytes calldata data)
        external
        onlyMasterKey
        returns (bytes memory)
    {
        address target = systemContracts[key];
        require(target != address(0), "AdminGate: unknown system");

        (bool ok, bytes memory ret) = target.call(data);
        bytes4 selector = data.length >= 4 ? bytes4(data[0:4]) : bytes4(0);
        emit Forwarded(target, selector, ok);
        require(ok, "AdminGate: call failed");
        return ret;
    }

    /// @notice Convenience helper to forward directly to UpdateGate.
    function forwardUpdateGate(bytes calldata data)
        external
        onlyMasterKey
        returns (bytes memory)
    {
        address target = updateGate;
        require(target != address(0), "AdminGate: updateGate unset");

        (bool ok, bytes memory ret) = target.call(data);
        bytes4 selector = data.length >= 4 ? bytes4(data[0:4]) : bytes4(0);
        emit Forwarded(target, selector, ok);
        require(ok, "AdminGate: call failed");
        return ret;
    }
}
