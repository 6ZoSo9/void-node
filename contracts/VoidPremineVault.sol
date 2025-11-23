// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IVoidToken.sol";

/// @notice One-shot splitter for the 333,333,333 VOID premine.
/// It receives the full premine, then an authorized gate calls initialize()
/// to send:
/// - 230,000,000 VOID -> FounderTrustVesting
/// - 70,000,000 VOID  -> Ecosystem & Infra Reserve
/// - 33,333,333 VOID  -> Community / Liquidity / Partners
contract VoidPremineVault {
    IVoidToken public immutable token;
    address public immutable founderTrust;
    address public immutable ecosystemReserve;
    address public immutable communityPool;
    address public immutable gate;

    bool public initialized;

    uint256 public constant PREMINE_SUPPLY  = 333_333_333e18;
    uint256 public constant FOUNDER_TRUST   = 230_000_000e18;
    uint256 public constant ECOSYSTEM_RES   =  70_000_000e18;
    uint256 public constant COMMUNITY_POOL  =  33_333_333e18;

    event Initialized(
        address indexed caller,
        address indexed founderTrust,
        address indexed ecosystemReserve,
        address communityPool
    );

    modifier onlyGate() {
        require(msg.sender == gate, "Vault: NOT_GATE");
        _;
    }

    constructor(
        IVoidToken _token,
        address _founderTrust,
        address _ecosystemReserve,
        address _communityPool,
        address _gate
    ) {
        require(address(_token) != address(0), "Vault: token zero");
        require(_founderTrust != address(0), "Vault: founderTrust zero");
        require(_ecosystemReserve != address(0), "Vault: ecoReserve zero");
        require(_communityPool != address(0), "Vault: community zero");
        require(_gate != address(0), "Vault: gate zero");

        // Sanity: premine breakdown must match spec.
        require(
            FOUNDER_TRUST + ECOSYSTEM_RES + COMMUNITY_POOL == PREMINE_SUPPLY,
            "Vault: bad premine math"
        );

        token = _token;
        founderTrust = _founderTrust;
        ecosystemReserve = _ecosystemReserve;
        communityPool = _communityPool;
        gate = _gate;
    }

    /// @notice One-time initializer. Must be called after the full premine
    /// has been transferred into this contract.
    function initialize() external onlyGate {
        require(!initialized, "Vault: already initialized");

        uint256 bal = token.balanceOf(address(this));
        require(bal == PREMINE_SUPPLY, "Vault: premine balance mismatch");

        // Split per spec
        (bool ok, bytes memory data) = address(token).call(
    abi.encodeWithSelector(
        bytes4(keccak256("transfer(address,uint256)")),
        founderTrust,
        FOUNDER_TRUST
    )
);

// Accept:
// - tokens that return no data (old style)
// - tokens that return a single bool which must be true
bool success = ok && (data.length == 0 || abi.decode(data, (bool)));
require(success, "Vault: founder transfer failed");
(bool okEco, bytes memory dataEco) = address(token).call(
    abi.encodeWithSelector(
        bytes4(keccak256("transfer(address,uint256)")),
        ecosystemReserve,
        ECOSYSTEM_RES
    )
);

bool successEco = okEco && (dataEco.length == 0 || abi.decode(dataEco, (bool)));
require(successEco, "Vault: eco transfer failed");
(bool okComm, bytes memory dataComm) = address(token).call(
    abi.encodeWithSelector(
        bytes4(keccak256("transfer(address,uint256)")),
        communityPool,
        COMMUNITY_POOL
    )
);

bool successComm = okComm && (dataComm.length == 0 || abi.decode(dataComm, (bool)));
require(successComm, "Vault: community transfer failed");
// Must be fully drained
        require(token.balanceOf(address(this)) == 0, "Vault: leftover premine");

        initialized = true;
        emit Initialized(msg.sender, founderTrust, ecosystemReserve, communityPool);
    }
}
