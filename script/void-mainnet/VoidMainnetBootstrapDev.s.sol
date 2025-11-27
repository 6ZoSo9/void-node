// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "forge-std/StdJson.sol";
import "forge-std/console2.sol";

/// @notice Dev-only rehearsal script for VOID mainnet bootstrap.
///         This version only:
///           - Reads config/void-mainnet-bootstrap-dev.json
///           - Parses core roles + tokenomics
///           - Verifies config.chainId == block.chainid
///           - Logs everything, but DOES NOT broadcast or deploy.
///         Real logic will later:
///           - Deploy VoidToken, VoidTreasury, OpsTreasury
///           - Wire AdminGate / UpdateGate / ConfigGate / ValidatorSet / RewardEngine
///           - Mint premine into Treasury and set up emissions.
contract VoidMainnetBootstrapDev is Script {
    using stdJson for string;

    struct TokenomicsConfig {
        uint256 maxSupplyVOID;
        uint256 premineVOID;
        uint256[4] emissionsEras;
        uint8 decimals;
    }

    struct BootstrapConfig {
        uint256 chainId;
        address deployer;
        address treasuryAdmin;
        address opsTreasuryAdmin;
        address validatorAdmin;
        TokenomicsConfig tokenomics;
    }

    function run() external {
        string memory path = "config/void-mainnet-bootstrap-dev.json";
        string memory json = vm.readFile(path);

        BootstrapConfig memory cfg;

        // Top-level fields
        cfg.chainId = json.readUint(".chainId");
        cfg.deployer = json.readAddress(".deployer");
        cfg.treasuryAdmin = json.readAddress(".treasuryAdmin");
        cfg.opsTreasuryAdmin = json.readAddress(".opsTreasuryAdmin");
        cfg.validatorAdmin = json.readAddress(".validatorAdmin");

        // Tokenomics – stored in JSON as decimal strings, parse via vm.parseUint
        string memory maxSupplyStr = json.readString(".tokenomics.maxSupplyVOID");
        string memory premineStr = json.readString(".tokenomics.premineVOID");
        string memory era0Str = json.readString(".tokenomics.emissionsEras[0]");
        string memory era1Str = json.readString(".tokenomics.emissionsEras[1]");
        string memory era2Str = json.readString(".tokenomics.emissionsEras[2]");
        string memory era3Str = json.readString(".tokenomics.emissionsEras[3]");

        cfg.tokenomics.maxSupplyVOID = vm.parseUint(maxSupplyStr);
        cfg.tokenomics.premineVOID = vm.parseUint(premineStr);
        cfg.tokenomics.emissionsEras[0] = vm.parseUint(era0Str);
        cfg.tokenomics.emissionsEras[1] = vm.parseUint(era1Str);
        cfg.tokenomics.emissionsEras[2] = vm.parseUint(era2Str);
        cfg.tokenomics.emissionsEras[3] = vm.parseUint(era3Str);
        cfg.tokenomics.decimals = uint8(json.readUint(".tokenomics.decimals"));

        // Sanity: config vs runtime chainId
        uint256 runtimeChainId = block.chainid;
        require(
            runtimeChainId == cfg.chainId,
            "VoidMainnetBootstrapDev: chainId mismatch between config and chain"
        );

        // Log out the parsed config – this is our rehearsal, no deployments yet.
        console2.log("=== VOID mainnet dev bootstrap config ===");
        console2.log("config path", path);
        console2.log("chainId (config)", cfg.chainId);
        console2.log("chainId (runtime)", runtimeChainId);

        console2.log("deployer", cfg.deployer);
        console2.log("treasuryAdmin", cfg.treasuryAdmin);
        console2.log("opsTreasuryAdmin", cfg.opsTreasuryAdmin);
        console2.log("validatorAdmin", cfg.validatorAdmin);

        console2.log("maxSupplyVOID (whole)", cfg.tokenomics.maxSupplyVOID);
        console2.log("premineVOID (whole)", cfg.tokenomics.premineVOID);
        console2.log("emissionsEra[0] (whole)", cfg.tokenomics.emissionsEras[0]);
        console2.log("emissionsEra[1] (whole)", cfg.tokenomics.emissionsEras[1]);
        console2.log("emissionsEra[2] (whole)", cfg.tokenomics.emissionsEras[2]);
        console2.log("emissionsEra[3] (whole)", cfg.tokenomics.emissionsEras[3]);
        console2.log("decimals", uint256(cfg.tokenomics.decimals));

        // NOTE: no vm.startBroadcast() here yet.
        // This is intentionally a "read + print" rehearsal only.
    }
}
