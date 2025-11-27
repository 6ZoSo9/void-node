// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

/// @notice Void mainnet bootstrap script.
/// @dev Current version is a planning stub: it only encodes the intended
///      deployment sequence and tokenomics notes. It does not deploy anything.
contract VoidMainnetBootstrap is Script {
    /// @notice Premine layout for VOID mainnet.
    /// @dev All values are in raw wei (18 decimals).
    struct PremineSplits {
        uint256 treasury;         // Genesis VoidTreasury allocation.
        uint256 founderTrust;     // Long-term founder vesting.
        uint256 ecosystemReserve; // Ecosystem / growth.
        uint256 communityPool;    // Community / incentives.
    }

    /// @notice Key actors and contracts that participate in mainnet bootstrap.
    struct MainnetActors {
        address deployer;         // EOA that runs this script with --broadcast.
        address premineVault;     // VoidPremineVault.
        address voidToken;        // VoidToken.
        address founderTrust;     // VoidFounderTrustVesting.
        address ecosystemReserve; // EOA / contract that receives ecosystem funds.
        address communityPool;    // Community pool multisig or contract.
        address admin;            // Ops/admin multisig.
        address masterKey;        // One-shot master key for AdminGate / gates.
        address opsTreasury;      // OpsTreasury contract.
        address voidTreasury;     // VoidTreasury contract.
        address validatorSet;     // ValidatorSet contract.
        address rewardEngine;     // RewardEngine contract.
        address adminGate;        // AdminGate contract.
        address updateGate;       // UpdateGate contract.
        address configGate;       // ConfigGate contract.
    }

    /// @notice High-level mainnet configuration captured by this script.
    struct MainnetConfig {
        uint256 chainId;          // Expected to be 2050 for VOID mainnet.
        PremineSplits splits;
        MainnetActors actors;
    }

    /// @notice Default spec configuration.
    /// @dev This is a pure description of what we expect on mainnet. It does
    ///      not interact with the network or write on-chain state.
    function getDefaultConfig() public pure returns (MainnetConfig memory config) {
        // Chain id for VOID mainnet (locked in design).
        config.chainId = 2050;

        // Tokenomics (from design, for documentation only):
        //
        // - MAX_SUPPLY = 666,666,666 VOID
        // - PREMINE    = 333,333,333 VOID (genesis Treasury)
        // - EMISSIONS  = 333,333,333 VOID over 100 years in 4 eras:
        //       Era 1: 177,777,777
        //       Era 2:  88,888,889
        //       Era 3:  44,444,444
        //       Era 4:  22,222,223
        //
        // The exact premine allocation between Vault / Trust / Treasury /
        // ecosystem is enforced by the Solidity contracts; here we only
        // document the intended high-level picture.

        // For now we simply record that the full premine is controlled by the
        // genesis Treasury path. The more detailed split will be encoded in
        // the actual deployment parameters when we wire VoidPremineVault and
        // VoidFounderTrustVesting.
        uint256 premine = 333_333_333 ether;
        config.splits.treasury = premine;
        config.splits.founderTrust = 0;
        config.splits.ecosystemReserve = 0;
        config.splits.communityPool = 0;

        // All actor addresses remain zero in this stub. They will be filled in
        // later when we have concrete mainnet keys and multisig addresses.
    }

    /// @notice Stub execution entrypoint.
    /// @dev This version is intentionally read-only: it logs the intended
    ///      deployment sequence and configuration but does not deploy.
    function run() external {
        MainnetConfig memory config = getDefaultConfig();

        console2.log("VoidMainnetBootstrap: dry-run stub, no deployments executed");
        console2.log("  chainId:", config.chainId);
        console2.log("  premine.treasury (wei):", config.splits.treasury);

        console2.log("Planned deployment sequence (conceptual):");
        console2.log("  [1] Deploy VoidToken");
        console2.log("  [2] Deploy VoidPremineVault wired to VoidToken");
        console2.log("  [3] Deploy VoidFounderTrustVesting funded from PremineVault");
        console2.log("  [4] Deploy AdminGate with masterKey and admin multisig");
        console2.log("  [5] Deploy UpdateGate and ConfigGate via AdminGate");
        console2.log("  [6] Deploy ValidatorSet (chainId 2050) under ConfigGate");
        console2.log("  [7] Deploy OpsTreasury and VoidTreasury");
        console2.log("  [8] Deploy RewardEngine hooked to VoidToken and ValidatorSet");
        console2.log("  [9] Wire ownerships: transfer token / gates / treasuries to the");
        console2.log("      correct multisigs and on-chain governance routes");
        console2.log(" [10] Park premine keys and master keys according to the keys plan");
    }
}
