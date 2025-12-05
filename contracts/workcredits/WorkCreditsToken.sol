// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title WorkCreditsToken
/// @notice Minimal ERC20-style token used for VOID Work Credits.
///         Mint/burn are restricted to the controller address.
///         Controller itself is rotatable by the current controller.
contract WorkCreditsToken {
    // ------------------------------------------------------------------------
    // Metadata
    // ------------------------------------------------------------------------

    string public constant name = "VOID Work Credits";
    string public constant symbol = "WC";
    uint8 public constant decimals = 18;

    // ------------------------------------------------------------------------
    // Storage
    // ------------------------------------------------------------------------

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    address public controller;

    // ------------------------------------------------------------------------
    // Errors
    // ------------------------------------------------------------------------

    error NotController();
    error ZeroAddress();
    error InsufficientBalance();
    error InsufficientAllowance();

    // ------------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------------

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event ControllerChanged(address indexed oldController, address indexed newController);

    // ------------------------------------------------------------------------
    // Constructor
    // ------------------------------------------------------------------------

    constructor(address controller_) {
        if (controller_ == address(0)) revert ZeroAddress();
        controller = controller_;
    }

    // ------------------------------------------------------------------------
    // Modifiers
    // ------------------------------------------------------------------------

    modifier onlyController() {
        if (msg.sender != controller) revert NotController();
        _;
    }

    // ------------------------------------------------------------------------
    // Controller management
    // ------------------------------------------------------------------------

    function setController(address newController) external onlyController {
        if (newController == address(0)) revert ZeroAddress();
        address old = controller;
        controller = newController;
        emit ControllerChanged(old, newController);
    }

    // ------------------------------------------------------------------------
    // Mint / Burn (controller-only)
    // ------------------------------------------------------------------------

    function mint(address to, uint256 amount) external onlyController {
        if (to == address(0)) revert ZeroAddress();

        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function burn(address from, uint256 amount) external onlyController {
        uint256 bal = balanceOf[from];
        if (bal < amount) revert InsufficientBalance();

        balanceOf[from] = bal - amount;
        totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }

    // ------------------------------------------------------------------------
    // ERC20-style functions
    // ------------------------------------------------------------------------

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        if (currentAllowance < amount) revert InsufficientAllowance();

        // unchecked is fine because we just ensured currentAllowance >= amount
        unchecked {
            allowance[from][msg.sender] = currentAllowance - amount;
        }

        _transfer(from, to, amount);
        return true;
    }

    // ------------------------------------------------------------------------
    // Internal helpers
    // ------------------------------------------------------------------------

    function _transfer(address from, address to, uint256 amount) internal {
        if (from == address(0) || to == address(0)) revert ZeroAddress();

        uint256 fromBal = balanceOf[from];
        if (fromBal < amount) revert InsufficientBalance();

        unchecked {
            balanceOf[from] = fromBal - amount;
            balanceOf[to] += amount;
        }

        emit Transfer(from, to, amount);
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        if (owner == address(0) || spender == address(0)) revert ZeroAddress();

        allowance[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
}
