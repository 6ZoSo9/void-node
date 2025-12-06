// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal in-house ERC20 for devnet WorkCredits.
/// - 18 decimals
/// - controller-only mint/burn
/// - standard transfer/transferFrom/approve
/// - constructor(address controller_)
contract WorkCreditsToken {
    // ------------------------------------------------------------------------
    // Errors
    // ------------------------------------------------------------------------
    error NotController();
    error ZeroAddress();
    error BurnTooMuch();
    error ZeroAmount();
    error InsufficientAllowance();
    error InsufficientBalance();

    // ------------------------------------------------------------------------
    // ERC20 metadata
    // ------------------------------------------------------------------------
    string public name = "Work Credits";
    string public symbol = "WC";
    uint8 public constant decimals = 18;

    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    /// @notice Controller address allowed to mint/burn and change controller.
    address public controller;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event ControllerSet(address indexed previousController, address indexed newController);

    modifier onlyController() {
        if (msg.sender != controller) revert NotController();
        _;
    }

    constructor(address controller_) {
        if (controller_ == address(0)) revert ZeroAddress();
        controller = controller_;
        emit ControllerSet(address(0), controller_);
    }

    // ------------------------------------------------------------------------
    // Controller management
    // ------------------------------------------------------------------------

    function setController(address newController) external onlyController {
        if (newController == address(0)) revert ZeroAddress();
        emit ControllerSet(controller, newController);
        controller = newController;
    }

    // ------------------------------------------------------------------------
    // ERC20 core
    // ------------------------------------------------------------------------

    function _transfer(address from, address to, uint256 amount) internal {
        if (to == address(0)) revert ZeroAddress();
        uint256 fromBal = balanceOf[from];
        if (fromBal < amount) revert InsufficientBalance();
        unchecked {
            balanceOf[from] = fromBal - amount;
            balanceOf[to] += amount;
        }
        emit Transfer(from, to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (amount == 0) revert ZeroAmount();
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (amount == 0) revert ZeroAmount();
        uint256 allowed = allowance[from][msg.sender];
        if (allowed < amount) revert InsufficientAllowance();
        unchecked {
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    // ------------------------------------------------------------------------
    // Mint / Burn (devnet only, controlled)
    // ------------------------------------------------------------------------

    function _mint(address to, uint256 amount) internal {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _burn(address from, uint256 amount) internal {
        uint256 fromBal = balanceOf[from];
        if (fromBal < amount) revert InsufficientBalance();
        if (amount == 0) revert ZeroAmount();
        unchecked {
            balanceOf[from] = fromBal - amount;
            totalSupply -= amount;
        }
        emit Transfer(from, address(0), amount);
    }

    function mint(address to, uint256 amount) external onlyController {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyController {
        _burn(from, amount);
    }
}
