// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// NOTE: This script is for REAL VOID MAINNET bootstrap.
// It currently does not deploy anything; it only loads and validates
// addresses from a JSON config and logs them. The broadcast block
// will be wired later for real mainnet bootstrap.

import "forge-std/Script.sol";
import "forge-std/StdJson.sol";
import "forge-std/console.sol";

contract VoidMainnetBootstrapMainnet is Script {
    using stdJson for string;

    struct BootstrapConfig {
        uint256 chainId;

        address deployer;

        address masterKey;
        address configAdmin;

        address validatorAdmin;
        address emissionsAdmin;
        address rewardsAdmin;

        address voidOwner;
        address founderBeneficiary;
        address ecosystemReserve;
        address communityPool;

        address voidTreasuryAdmin;
        address opsTreasuryAdmin;
        address opsSpender;

        address agentAdmin;
        address datasetAdmin;
        address modelAdmin;
        address evalAdmin;
        address jobQueueAdmin;
        address receiptsAdmin;
    }

    function _loadConfig(string memory path) internal view returns (BootstrapConfig memory cfg) {
        string memory json = vm.readFile(path);

        cfg.chainId            = json.readUint(".chainId");

        cfg.deployer           = json.readAddress(".deployer");

        cfg.masterKey          = json.readAddress(".masterKey");
        cfg.configAdmin        = json.readAddress(".configAdmin");

        cfg.validatorAdmin     = json.readAddress(".validatorAdmin");
        cfg.emissionsAdmin     = json.readAddress(".emissionsAdmin");
        cfg.rewardsAdmin       = json.readAddress(".rewardsAdmin");

        cfg.voidOwner          = json.readAddress(".voidOwner");
        cfg.founderBeneficiary = json.readAddress(".founderBeneficiary");
        cfg.ecosystemReserve   = json.readAddress(".ecosystemReserve");
        cfg.communityPool      = json.readAddress(".communityPool");

        cfg.voidTreasuryAdmin  = json.readAddress(".voidTreasuryAdmin");
        cfg.opsTreasuryAdmin   = json.readAddress(".opsTreasuryAdmin");
        cfg.opsSpender         = json.readAddress(".opsSpender");

        cfg.agentAdmin         = json.readAddress(".agentAdmin");
        cfg.datasetAdmin       = json.readAddress(".datasetAdmin");
        cfg.modelAdmin         = json.readAddress(".modelAdmin");
        cfg.evalAdmin          = json.readAddress(".evalAdmin");
        cfg.jobQueueAdmin      = json.readAddress(".jobQueueAdmin");
        cfg.receiptsAdmin      = json.readAddress(".receiptsAdmin");
    }

    function _requireNonZero(address a, string memory label) internal pure {
        require(a != address(0), string.concat(label, "=0"));
    }

    /// @notice Main entrypoint for VOID mainnet bootstrap validation.
    /// Uses VOID_MAINNET_BOOTSTRAP_CONFIG if set, otherwise falls back
    /// to ops/mainnet-bootstrap-addresses.mainnet.json.
    function run() external {
        string memory defaultPath = "ops/mainnet-bootstrap-addresses.mainnet.json";
        string memory path;

        // Allow override via env var VOID_MAINNET_BOOTSTRAP_CONFIG.
        // If unset, fall back to defaultPath.
        try vm.envString("VOID_MAINNET_BOOTSTRAP_CONFIG") returns (string memory p) {
            path = p;
        } catch {
            path = defaultPath;
        }

        BootstrapConfig memory cfg = _loadConfig(path);

        // Basic invariants
        require(cfg.chainId == block.chainid, "chainId mismatch");

        _requireNonZero(cfg.deployer,          "deployer");
        _requireNonZero(cfg.masterKey,         "masterKey");
        _requireNonZero(cfg.configAdmin,       "configAdmin");
        _requireNonZero(cfg.validatorAdmin,    "validatorAdmin");
        _requireNonZero(cfg.emissionsAdmin,    "emissionsAdmin");
        _requireNonZero(cfg.rewardsAdmin,      "rewardsAdmin");
        _requireNonZero(cfg.voidTreasuryAdmin, "voidTreasuryAdmin");
        _requireNonZero(cfg.opsTreasuryAdmin,  "opsTreasuryAdmin");
        _requireNonZero(cfg.opsSpender,        "opsSpender");
        _requireNonZero(cfg.jobQueueAdmin,     "jobQueueAdmin");
        _requireNonZero(cfg.receiptsAdmin,     "receiptsAdmin");

        console.log("=== VOID mainnet bootstrap (MAINNET skeleton) ===");
        console.log("config path       :", path);
        console.log("chainId (cfg)     :", cfg.chainId);
        console.log("chainId (block)   :", block.chainid);
        console.log("deployer          :", cfg.deployer);

        console.log("masterKey         :", cfg.masterKey);
        console.log("configAdmin       :", cfg.configAdmin);

        console.log("validatorAdmin    :", cfg.validatorAdmin);
        console.log("emissionsAdmin    :", cfg.emissionsAdmin);
        console.log("rewardsAdmin      :", cfg.rewardsAdmin);

        console.log("voidOwner         :", cfg.voidOwner);
        console.log("founderBeneficiary:", cfg.founderBeneficiary);
        console.log("ecosystemReserve  :", cfg.ecosystemReserve);
        console.log("communityPool     :", cfg.communityPool);

        console.log("voidTreasuryAdmin :", cfg.voidTreasuryAdmin);
        console.log("opsTreasuryAdmin  :", cfg.opsTreasuryAdmin);
        console.log("opsSpender        :", cfg.opsSpender);

        console.log("agentAdmin        :", cfg.agentAdmin);
        console.log("datasetAdmin      :", cfg.datasetAdmin);
        console.log("modelAdmin        :", cfg.modelAdmin);
        console.log("evalAdmin         :", cfg.evalAdmin);
        console.log("jobQueueAdmin     :", cfg.jobQueueAdmin);
        console.log("receiptsAdmin     :", cfg.receiptsAdmin);

        // REAL DEPLOYMENT WILL GO HERE LATER:
        //
        // vm.startBroadcast(cfg.deployer);
        //
        //   // 1) Deploy VoidToken, OpsTreasury, VoidTreasury, AdminGate,
        //   //    ConfigGate, ValidatorSet, EmissionsController, RewardEngine.
        //   // 2) Wire roles exactly as per our locked tokenomics & gates plan.
        //   // 3) Move premine into VoidTreasury, set OpsTreasury spenders, etc.
        //
        // vm.stopBroadcast();
    }
}
