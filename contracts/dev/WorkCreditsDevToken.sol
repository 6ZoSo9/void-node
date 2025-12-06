// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @dev Minimal ERC20-like token for devnet WorkCredits.
/// DO NOT reuse this contract on mainnet.
contract WorkCreditsDevToken {
    string public constant name = "WorkCredits Devnet";
    string public constant symbol = "WCDEV";
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    address public immutable owner;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor() {
        owner = msg.sender;
    }

    /// @notice Mint devnet WorkCredits. Owner-only, for tests and seeding.
    function mint(address to, uint256 amount) external {
        require(msg.sender == owner, "WorkCreditsDevToken: not owner");
        require(to != address(0), "WorkCreditsDevToken: mint to zero");

        totalSupply += amount;
        balanceOf[to] += amount;

        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        require(currentAllowance >= amount, "WorkCreditsDevToken: allowance");
        allowance[from][msg.sender] = currentAllowance - amount;
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "WorkCreditsDevToken: to zero");
        uint256 bal = balanceOf[from];
        require(bal >= amount, "WorkCreditsDevToken: balance");
        balanceOf[from] = bal - amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}
