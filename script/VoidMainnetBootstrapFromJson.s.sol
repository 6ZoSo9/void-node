// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "forge-std/StdJson.sol";

contract VoidMainnetBootstrapFromJson is Script {
    using stdJson for string;

    struct Roles {
        address adminGateOwner;
        address updateGateOwner;
        address configGateOwner;
        address treasuryOwner;
        address opsTreasuryOwner;
        address rewardEngineOwner;
        address validatorSetOwner;
    }

    struct ValidatorEntry {
        string id;
        address rewardAddress;
        uint256 stakeVOID;
        bytes consensusKey;
    }

    /// @notice For now: parse JSON and log it for a single validator [0].
    /// Env:
    ///   - VOID_MAINNET_CONFIG (optional): path to JSON.
    ///       defaults to "config/void-mainnet-bootstrap-dev.json"
    function run() public {
        string memory cfgPath = vm.envOr(
            "VOID_MAINNET_CONFIG",
            string("config/void-mainnet-bootstrap-dev.json")
        );

        string memory json = vm.readFile(cfgPath);

        uint256 chainId = json.readUint(".chainId");
        require(chainId == 2050, "VOID mainnet expects chainId 2050");

        Roles memory roles = Roles({
            adminGateOwner:    json.readAddress(".roles.adminGateOwner"),
            updateGateOwner:   json.readAddress(".roles.updateGateOwner"),
            configGateOwner:   json.readAddress(".roles.configGateOwner"),
            treasuryOwner:     json.readAddress(".roles.treasuryOwner"),
            opsTreasuryOwner:  json.readAddress(".roles.opsTreasuryOwner"),
            rewardEngineOwner: json.readAddress(".roles.rewardEngineOwner"),
            validatorSetOwner: json.readAddress(".roles.validatorSetOwner")
        });

        // Single validator entry [0] for now.
        string memory base0 = ".validators[0]";

        ValidatorEntry memory v0;

        v0.id = json.readString(
            string(abi.encodePacked(base0, ".id"))
        );

        v0.rewardAddress = json.readAddress(
            string(abi.encodePacked(base0, ".rewardAddress"))
        );

        v0.stakeVOID = json.readUint(
            string(abi.encodePacked(base0, ".stakeVOID"))
        );

        v0.consensusKey = json.readBytes(
            string(abi.encodePacked(base0, ".consensusKey"))
        );

        _logConfig(cfgPath, chainId, roles, v0);
    }

    function _logConfig(
        string memory path,
        uint256 chainId,
        Roles memory roles,
        ValidatorEntry memory v0
    ) internal view {
        console2.log("=== VOID mainnet bootstrap (FromJson) ===");
        console2.log("config path :", path);
        console2.log("chainId     :", chainId);
        console2.log("");

        console2.log("[roles]");
        console2.log("  adminGateOwner    =", roles.adminGateOwner);
        console2.log("  updateGateOwner   =", roles.updateGateOwner);
        console2.log("  configGateOwner   =", roles.configGateOwner);
        console2.log("  treasuryOwner     =", roles.treasuryOwner);
        console2.log("  opsTreasuryOwner  =", roles.opsTreasuryOwner);
        console2.log("  rewardEngineOwner =", roles.rewardEngineOwner);
        console2.log("  validatorSetOwner =", roles.validatorSetOwner);
        console2.log("");

        console2.log("[validator 0]");
        console2.log("  id           =", bytes(v0.id).length == 0 ? "<empty>" : v0.id);
        console2.log("  rewardAddr   =", v0.rewardAddress);
        console2.log("  stakeVOID    =", v0.stakeVOID);
        console2.log("  consensusKey =", v0.consensusKey.length == 0 ? "<empty>" : "<bytes>");

        console2.log("");
        console2.log("NOTE: this version is READ-ONLY (no deployments).");
        console2.log("      Currently supports a single validator [0] from JSON.");
        console2.log("=== END FromJson bootstrap preview ===");
    }
}
