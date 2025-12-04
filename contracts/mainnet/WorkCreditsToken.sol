// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title WorkCreditsToken
/// @notice Unlimited-supply ERC20-style token used as "Work Credits" (WC) in the VOID Network.
///         This is NOT governance, NOT gas, NOT capped. Minting is controlled by governance.
contract WorkCreditsToken {
    // --- ERC20 basics ---

    string public constant name = "Void Work Credits";
    string public constant symbol = "WC";
    uint8 public constant decimals = 18;

    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // --- roles ---

    /// @notice Governance address (can set minter).
    address public governance;

    /// @notice Minter address (e.g. RewardEngine / WorkScore contract).
    address public minter;

    // --- events ---

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    event GovernanceChanged(address indexed oldGov, address indexed newGov);
    event MinterChanged(address indexed oldMinter, address indexed newMinter);

    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);

    // --- modifiers ---

    modifier onlyGovernance() {
        require(msg.sender == governance, "WC: not governance");
        _;
    }

    modifier onlyMinter() {
        require(msg.sender == minter, "WC: not minter");
        _;
    }

    // --- ctor ---

    constructor(address _governance) {
        require(_governance != address(0), "WC: governance zero");
        governance = _governance;
        emit GovernanceChanged(address(0), _governance);
    }

    // --- governance controls ---

    function setGovernance(address _governance) external onlyGovernance {
        require(_governance != address(0), "WC: governance zero");
        emit GovernanceChanged(governance, _governance);
        governance = _governance;
    }

    function setMinter(address _minter) external onlyGovernance {
        emit MinterChanged(minter, _minter);
        minter = _minter;
    }

    // --- ERC20 core ---

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "WC: transfer to zero");
        uint256 bal = balanceOf[from];
        require(bal >= value, "WC: balance");
        unchecked {
            balanceOf[from] = bal - value;
            balanceOf[to] += value;
        }
        emit Transfer(from, to, value);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= value, "WC: allowance");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - value;
        }
        _transfer(from, to, value);
        return true;
    }

    // --- mint / burn ---

    /// @notice Mint new WC to `to`. Unlimited; policy is enforced by the minter contract & governance.
    function mint(address to, uint256 amount) external onlyMinter {
        require(to != address(0), "WC: mint to zero");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
    }

    /// @notice Burn WC from `from`. Caller must be the minter or governance.
    function burnFrom(address from, uint256 amount) external {
        require(msg.sender == minter || msg.sender == governance, "WC: not burn auth");
        uint256 bal = balanceOf[from];
        require(bal >= amount, "WC: burn exceeds bal");
        unchecked {
            balanceOf[from] = bal - amount;
            totalSupply -= amount;
        }
        emit Burn(from, amount);
        emit Transfer(from, address(0), amount);
    }
}
