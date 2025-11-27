// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

/// @notice Dev-only rehearsal script for VOID mainnet bootstrap.
///
/// This script is *non-deploying* but *strict*:
///   - Reads config/void-mainnet-bootstrap-dev.json
///   - Verifies chainId==2050 (config + runtime)
///   - Verifies VOID tokenomics invariants:
///       * premine == 333,333,333
///       * sum(emissions) == 333,333,333
///       * maxSupply == premine + sum(emissions) == 666,666,666
///       * decimals == 18
///   - Logs the config for human inspection.
///
/// If any invariant fails, this script reverts. This is our
/// "hard gate" rehearsal before we write a deploying bootstrap.
contract VoidMainnetBootstrapDev is Script {
    function run() external {
        string memory configPath = "config/void-mainnet-bootstrap-dev.json";
        string memory json = vm.readFile(configPath);

        // --- chainId checks ---
        uint256 chainIdConfig = vm.parseJsonUint(json, ".chainId");
        uint256 chainIdRuntime = block.chainid;

        console2.log("=== VOID mainnet dev bootstrap config ===");
        console2.log("  config path", configPath);
        console2.log("  chainId (config)", chainIdConfig);
        console2.log("  chainId (runtime)", chainIdRuntime);

        require(chainIdConfig == 2050, "config.chainId must be 2050");
        require(chainIdRuntime == 2050, "runtime chainId must be 2050");

        // --- admin addresses ---
        address deployer          = vm.parseJsonAddress(json, ".deployer");
        address treasuryAdmin     = vm.parseJsonAddress(json, ".treasuryAdmin");
        address opsTreasuryAdmin  = vm.parseJsonAddress(json, ".opsTreasuryAdmin");
        address validatorAdmin    = vm.parseJsonAddress(json, ".validatorAdmin");

        console2.log("  deployer", deployer);
        console2.log("  treasuryAdmin", treasuryAdmin);
        console2.log("  opsTreasuryAdmin", opsTreasuryAdmin);
        console2.log("  validatorAdmin", validatorAdmin);

        // --- tokenomics: parse as strings, then to uints ---
        string memory maxSupplyStr   = vm.parseJsonString(json, ".tokenomics.maxSupplyVOID");
        string memory premineStr     = vm.parseJsonString(json, ".tokenomics.premineVOID");
        string memory era0Str        = vm.parseJsonString(json, ".tokenomics.emissionsEras[0]");
        string memory era1Str        = vm.parseJsonString(json, ".tokenomics.emissionsEras[1]");
        string memory era2Str        = vm.parseJsonString(json, ".tokenomics.emissionsEras[2]");
        string memory era3Str        = vm.parseJsonString(json, ".tokenomics.emissionsEras[3]");

        uint256 maxSupplyWhole = vm.parseUint(maxSupplyStr);
        uint256 premineWhole   = vm.parseUint(premineStr);
        uint256 era0           = vm.parseUint(era0Str);
        uint256 era1           = vm.parseUint(era1Str);
        uint256 era2           = vm.parseUint(era2Str);
        uint256 era3           = vm.parseUint(era3Str);

        uint8 decimals = uint8(vm.parseJsonUint(json, ".tokenomics.decimals"));

        console2.log("  maxSupplyVOID (whole)", maxSupplyWhole);
        console2.log("  premineVOID (whole)", premineWhole);
        console2.log("  emissionsEra[0] (whole)", era0);
        console2.log("  emissionsEra[1] (whole)", era1);
        console2.log("  emissionsEra[2] (whole)", era2);
        console2.log("  emissionsEra[3] (whole)", era3);
        console2.log("  decimals", decimals);

        // --- tokenomics invariants ---
        uint256 emissionsSum = era0 + era1 + era3 + era2; // order doesn't matter, just sum

        console2.log("=== VOID mainnet tokenomics invariants ===");
        console2.log("  emissionsSum (whole)", emissionsSum);

        // Hard-coded truths for VOID mainnet
        uint256 EXPECT_PREMINE   = 333_333_333;
        uint256 EXPECT_EMISSIONS = 333_333_333;
        uint256 EXPECT_MAX       = 666_666_666;
        uint8   EXPECT_DECIMALS  = 18;

        require(
            premineWhole == EXPECT_PREMINE,
            "premineVOID mismatch vs spec"
        );
        require(
            emissionsSum == EXPECT_EMISSIONS,
            "emissions sum mismatch vs spec"
        );
        require(
            maxSupplyWhole == EXPECT_MAX,
            "maxSupplyVOID mismatch vs spec"
        );
        require(
            maxSupplyWhole == premineWhole + emissionsSum,
            "maxSupplyVOID != premine + emissions"
        );
        require(
            decimals == EXPECT_DECIMALS,
            "decimals mismatch vs spec"
        );

        console2.log("=== ALL INVARIANTS PASSED ===");
        console2.log("  VOID mainnet dev bootstrap config is CONSISTENT.");
        console2.log("  (Still no deployments performed in this script.)");
    }
}
