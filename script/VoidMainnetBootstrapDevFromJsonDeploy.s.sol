// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/StdJson.sol";
import {console2} from "forge-std/console2.sol";
import {VoidMainnetBootstrapDev} from "./VoidMainnetBootstrapDev.s.sol";

/// @dev Dev-only bootstrap that reads roles from a JSON config:
///      config/void-mainnet-bootstrap-dev.json (by default).
///      This mirrors VoidMainnetBootstrapDev._bootstrapCore but uses
///      JSON-provided addresses instead of the hard-coded devRoles().
contract VoidMainnetBootstrapDevFromJsonDeploy is VoidMainnetBootstrapDev {
    using stdJson for string;

    /// @notice Env:
    ///   - VOID_MAINNET_CONFIG (optional): path to JSON config.
    ///       defaults to "config/void-mainnet-bootstrap-dev.json"
    ///   - We assume the deployer PRIVATE KEY is supplied via
    ///       forge script ... --private-key <key>
    function run() external override {
        // 1) Load config path + JSON
        string memory cfgPath = vm.envOr(
            "VOID_MAINNET_CONFIG",
            string("config/void-mainnet-bootstrap-dev.json")
        );

        string memory json = vm.readFile(cfgPath);

        // 2) Enforce chainId == VOID_CHAIN_ID (2050)
        uint256 cfgChainId = json.readUint(".chainId");
        require(cfgChainId == VOID_CHAIN_ID, "VOID mainnet expects chainId 2050");

        // 3) Map JSON roles into our Roles struct
        Roles memory R;

        // Deployer: we use adminGateOwner for dev (first anvil address).
        R.deployer = json.readAddress(".roles.adminGateOwner");

        // Governance / admin
        R.masterKey      = json.readAddress(".roles.adminGateOwner");
        R.configAdmin    = json.readAddress(".roles.configGateOwner");
        R.validatorAdmin = json.readAddress(".roles.validatorSetOwner");
        // In dev we just reuse rewardEngineOwner for emissions + rewards admin.
        R.emissionsAdmin = json.readAddress(".roles.rewardEngineOwner");
        R.rewardsAdmin   = json.readAddress(".roles.rewardEngineOwner");

        // Premine / treasury plumbing
        // In dev JSON, treasuryOwner is the same as adminGateOwner;
        // we treat that as the initial VoidToken owner.
        R.voidOwner          = json.readAddress(".roles.treasuryOwner");
        R.founderBeneficiary = R.voidOwner;
        R.ecosystemReserve   = R.voidOwner;
        R.communityPool      = R.voidOwner;

        R.voidTreasuryAdmin  = json.readAddress(".roles.treasuryOwner");
        R.opsTreasuryAdmin   = json.readAddress(".roles.opsTreasuryOwner");
        R.opsSpender         = json.readAddress(".roles.opsTreasuryOwner");

        // AI / infra admins — not wired yet, but we set them to sane defaults.
        address adminLike = json.readAddress(".roles.adminGateOwner");
        R.agentAdmin       = adminLike;
        R.datasetAdmin     = adminLike;
        R.modelAdmin       = adminLike;
        R.evalAdmin        = adminLike;
        R.jobQueueAdmin    = adminLike;
        R.receiptsAdmin    = adminLike;

        // 4) Broadcast & deploy core stack using _bootstrapCore
        vm.startBroadcast(R.deployer);

        Deployed memory d = _bootstrapCore(R);

        vm.stopBroadcast();

        // 5) Log summary so we can sanity-check addresses
        console2.log("=== [dev-from-json] core deployed via JSON config ===");
        console2.log("config path       :", cfgPath);
        console2.log("token             :", address(d.token));
        console2.log("emissions         :", address(d.emissions));
        console2.log("adminGate         :", address(d.adminGate));
        console2.log("configGate        :", address(d.configGate));
        console2.log("validatorSet      :", address(d.validatorSet));
        console2.log("opsTreasury       :", address(d.opsTreasury));
        console2.log("voidTreasury      :", address(d.voidTreasury));
        console2.log("rewardEngine      :", address(d.rewardEngine));
        console2.log("=== END dev-from-json deploy ===");
    }
}
