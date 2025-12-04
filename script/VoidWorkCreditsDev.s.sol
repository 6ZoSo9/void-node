// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {WorkCreditsToken} from "../contracts/mainnet/WorkCreditsToken.sol";
import {WorkCreditsMinter} from "../contracts/mainnet/WorkCreditsMinter.sol";
import {UptimeVaultLLP} from "../contracts/mainnet/UptimeVaultLLP.sol";
import {WorkCreditsRelayerHelper} from "../contracts/mainnet/WorkCreditsRelayerHelper.sol";

/// @dev Dev-only VOID-like token used for wiring simulation.
///      This is NOT the real VoidToken and will never be used on mainnet.
contract DevVoidToken {
    string public constant name = "DevVoidToken";
    string public constant symbol = "DEVVOID";
    uint8 public constant decimals = 18;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;

    function _mint(address to, uint256 amount) external {
        totalSupply += amount;
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        uint256 bal = balanceOf[msg.sender];
        require(bal >= value, "DEVVOID: balance");
        unchecked {
            balanceOf[msg.sender] = bal - value;
            balanceOf[to] += value;
        }
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= value, "DEVVOID: allowance");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - value;
        }
        uint256 bal = balanceOf[from];
        require(bal >= value, "DEVVOID: balance");
        unchecked {
            balanceOf[from] = bal - value;
            balanceOf[to] += value;
        }
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        return true;
    }
}

/// @dev Dev harness that wires up:
///      - DevVoidToken (stand-in for VOID)
///      - WorkCreditsToken (WC)
///      - WorkCreditsMinter
///      - UptimeVaultLLP (LLP seeded with 10M/10M)
///      - WorkCreditsRelayerHelper (fronts the LLP for direct + relayer paths)
///
/// This does NOT touch real mainnet bootstrap JSON or real VoidToken.
/// It is purely for simulation / sanity.
///
/// We pick fake EOAs:
///   admin   = vm.addr(1)
///   relayer = vm.addr(2)
/// and prank admin-only calls from `admin`. No usage of address(this),
/// to satisfy Foundry's guard.
contract VoidWorkCreditsDev is Script {
    function run() external {
        // Fake EOAs for dev wiring.
        address admin   = vm.addr(1);
        address relayer = vm.addr(2);

        console2.log("=== VOID Work Credits dev wiring simulation ===");
        console2.log("admin (dev)     :", admin);
        console2.log("relayer (dev)   :", relayer);

        // 1) Deploy dev VOID-like token (no special sender needed).
        DevVoidToken devVoid = new DevVoidToken();
        console2.log("DevVoidToken    :", address(devVoid));

        // 2) Deploy WC token with admin as governance, and WorkCreditsMinter / LLP under admin.
        WorkCreditsToken wc;
        WorkCreditsMinter minter;
        UptimeVaultLLP vault;

        // All admin-only deploy & wiring calls under admin prank.
        vm.startPrank(admin);

        wc = new WorkCreditsToken(admin);
        console2.log("WorkCreditsToken:", address(wc));

        minter = new WorkCreditsMinter(address(wc), admin);
        console2.log("WorkCreditsMinter:", address(minter));

        // Wire minter as WC minter
        wc.setMinter(address(minter));

        // Deploy LLP with dev VOID + WC and admin governance
        vault = new UptimeVaultLLP(address(devVoid), address(wc), admin);
        console2.log("UptimeVaultLLP  :", address(vault));

        // 3) Seed liquidity: 10M DEVVOID, 10M WC
        uint256 seedVoid = 10_000_000e18;
        uint256 seedWc   = 10_000_000e18;

        // Mint DEVVOID to admin
        devVoid._mint(admin, seedVoid);

        // Use admin as rewardEngine in this dev harness so we can mint WC via minter
        minter.setRewardEngine(admin);
        minter.award(
            admin,
            seedWc,
            bytes32("mainnet-core"),
            bytes32("dev"),
            bytes32("bootstrap")
        );

        // Approve vault to pull both tokens and seed LLP
        devVoid.approve(address(vault), seedVoid);
        wc.approve(address(vault), seedWc);

        vault.seedLockedLiquidity(seedVoid, seedWc);

        // 4) Deploy relayer helper in front of the LLP.
        WorkCreditsRelayerHelper helper = new WorkCreditsRelayerHelper(
            admin,
            relayer,
            address(devVoid),
            address(wc),
            address(vault)
        );
        console2.log("RelayerHelper   :", address(helper));

        // For dev sanity, set a small relayer fee (e.g. 1%) so the path is exercised.
        helper.setRelayerFeeBps(100);

        vm.stopPrank();

        // 5) Read reserves back out
        (uint112 rVoid, uint112 rWc) = vault.getReserves();
        console2.log("Reserves DEVVOID:", uint256(rVoid));
        console2.log("Reserves WC     :", uint256(rWc));

        console2.log("=== done (dev wiring OK) ===");
    }
}
