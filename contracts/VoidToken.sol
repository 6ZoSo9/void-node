// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

/// @title VoidToken (VOID) – main VOID Network asset
/// @notice Max supply 666,666,666 VOID with 230,000,000 VOID premine.
/// @dev Minimal ERC20, no external deps. Minting is owner-gated and capped.
contract VoidToken {
    string public constant name = "VoidStones";
    string public constant symbol = "VOID";
    uint8 public constant decimals = 18;

    // Locked monetary parameters (match docs/VOID-EMISSIONS-SCHEDULE.md)
    uint256 public constant MAX_SUPPLY = 666_666_666 * 1e18;
    uint256 public constant PREMINE = 230_000_000 * 1e18;

    address public immutable owner;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /// @param premineRecipient address that receives the 230M premine at deploy.
    constructor(address premineRecipient) {
        require(premineRecipient != address(0), "VoidToken: zero premine recipient");
        owner = msg.sender;
        _mint(premineRecipient, PREMINE);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "VoidToken: not owner");
        _;
    }

    function _mint(address to, uint256 value) internal {
        require(to != address(0), "VoidToken: mint to zero");
        uint256 newSupply = totalSupply + value;
        require(newSupply <= MAX_SUPPLY, "VoidToken: cap exceeded");
        totalSupply = newSupply;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }

    /// @notice Owner-only mint, capped at MAX_SUPPLY.
    function mint(address to, uint256 value) external onlyOwner returns (bool) {
        _mint(to, value);
        return true;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        _approve(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 current = allowance[from][msg.sender];
        require(current >= value, "VoidToken: allowance exceeded");
        unchecked {
            allowance[from][msg.sender] = current - value;
        }
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "VoidToken: transfer to zero");
        uint256 fromBal = balanceOf[from];
        require(fromBal >= value, "VoidToken: balance too low");
        unchecked {
            balanceOf[from] = fromBal - value;
        }
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }

    function _approve(address _owner, address spender, uint256 value) internal {
        require(spender != address(0), "VoidToken: approve to zero");
        allowance[_owner][spender] = value;
        emit Approval(_owner, spender, value);
    }
}
