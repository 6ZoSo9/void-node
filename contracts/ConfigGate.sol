// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

/// @title ConfigGate v1 – on-chain config registry for VOID (chainId 2050)
/// @notice Holds tunable parameters; NOT a kill switch.
contract ConfigGate {
    uint256 public immutable chainId;

    /// @notice AdminGate (or other governance contract) allowed to mutate config.
    address public adminGate;

    // --- Typed config maps ---

    mapping(bytes32 => uint256) public uintConfig;
    mapping(bytes32 => bool)    public boolConfig;
    mapping(bytes32 => address) public addressConfig;

    // --- Events ---

    event AdminGateChanged(address indexed oldAdmin, address indexed newAdmin);

    event UintConfigChanged(bytes32 indexed key, uint256 oldValue, uint256 newValue);
    event BoolConfigChanged(bytes32 indexed key, bool oldValue, bool newValue);
    event AddressConfigChanged(bytes32 indexed key, address indexed oldValue, address indexed newValue);

    // --- Modifiers ---

    modifier onlyAdminGate() {
        require(msg.sender == adminGate, "ConfigGate: not adminGate");
        _;
    }

    // --- Constructor ---

    constructor(uint256 _chainId, address _adminGate) {
        require(_adminGate != address(0), "ConfigGate: adminGate=0");
        chainId = _chainId;
        adminGate = _adminGate;
    }

    // --- Admin wiring ---

    /// @notice Update which contract is allowed to mutate config.
    /// @dev Intended to be called only by the current adminGate (e.g. old AdminGate during migration).
    function setAdminGate(address newAdminGate) external onlyAdminGate {
        require(newAdminGate != address(0), "ConfigGate: newAdminGate=0");
        address old = adminGate;
        adminGate = newAdminGate;
        emit AdminGateChanged(old, newAdminGate);
    }

    // --- Typed setters ---

    function setUint(bytes32 key, uint256 value) external onlyAdminGate {
        uint256 old = uintConfig[key];
        uintConfig[key] = value;
        emit UintConfigChanged(key, old, value);
    }

    function setBool(bytes32 key, bool value) external onlyAdminGate {
        bool old = boolConfig[key];
        boolConfig[key] = value;
        emit BoolConfigChanged(key, old, value);
    }

    function setAddress(bytes32 key, address value) external onlyAdminGate {
        address old = addressConfig[key];
        addressConfig[key] = value;
        emit AddressConfigChanged(key, old, value);
    }

    // --- Optional helpers (readers) ---

    function getUint(bytes32 key) external view returns (uint256) {
        return uintConfig[key];
    }

    function getBool(bytes32 key) external view returns (bool) {
        return boolConfig[key];
    }

    function getAddress(bytes32 key) external view returns (address) {
        return addressConfig[key];
    }
}
