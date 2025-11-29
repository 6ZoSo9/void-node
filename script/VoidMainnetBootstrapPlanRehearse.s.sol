// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";

contract VoidMainnetBootstrapPlanRehearse is Script {
    function run(string memory configPath) external {
        string memory json = vm.readFile(configPath);

        uint256 configChainId = vm.parseJsonUint(json, ".chainId");
        uint256 runtimeChainId = block.chainid;
        bytes32 configHash = keccak256(bytes(json));

        console.log("=== [VOID mainnet PLAN rehearsal] ===");
        console.log("  configPath        :", configPath);
        console.log("  chainId (config)  :", configChainId);
        console.log("  chainId (runtime) :", runtimeChainId);
        console.log("  chainId sanity    :", configChainId == runtimeChainId ? "OK" : "MISMATCH");
        console.log("  configHash        :");
        console.logBytes32(configHash);

        // --- roles ---
        address deployer          = vm.parseJsonAddress(json, ".roles.deployer");
        address treasuryAdmin     = vm.parseJsonAddress(json, ".roles.treasuryAdmin");
        address opsTreasuryAdmin  = vm.parseJsonAddress(json, ".roles.opsTreasuryAdmin");
        address validatorAdmin    = vm.parseJsonAddress(json, ".roles.validatorAdmin");
        address adminGateOwner    = vm.parseJsonAddress(json, ".roles.adminGateOwner");
        address updateGateOwner   = vm.parseJsonAddress(json, ".roles.updateGateOwner");
        address configGateOwner   = vm.parseJsonAddress(json, ".roles.configGateOwner");
        address treasuryOwner     = vm.parseJsonAddress(json, ".roles.treasuryOwner");
        address opsTreasuryOwner  = vm.parseJsonAddress(json, ".roles.opsTreasuryOwner");
        address rewardEngineOwner = vm.parseJsonAddress(json, ".roles.rewardEngineOwner");
        address validatorSetOwner = vm.parseJsonAddress(json, ".roles.validatorSetOwner");

        console.log("");
        console.log("=== roles ===");
        console.log("  deployer          :", deployer);
        console.log("  treasuryAdmin     :", treasuryAdmin);
        console.log("  opsTreasuryAdmin  :", opsTreasuryAdmin);
        console.log("  validatorAdmin    :", validatorAdmin);
        console.log("  adminGateOwner    :", adminGateOwner);
        console.log("  updateGateOwner   :", updateGateOwner);
        console.log("  configGateOwner   :", configGateOwner);
        console.log("  treasuryOwner     :", treasuryOwner);
        console.log("  opsTreasuryOwner  :", opsTreasuryOwner);
        console.log("  rewardEngineOwner :", rewardEngineOwner);
        console.log("  validatorSetOwner :", validatorSetOwner);

        // --- contracts ---
        address updateGate   = vm.parseJsonAddress(json, ".contracts.updateGate");
        address adminGate    = vm.parseJsonAddress(json, ".contracts.adminGate");
        address configGate   = vm.parseJsonAddress(json, ".contracts.configGate");
        address validatorSet = vm.parseJsonAddress(json, ".contracts.validatorSet");
        address voidToken    = vm.parseJsonAddress(json, ".contracts.voidToken");
        address premineVault = vm.parseJsonAddress(json, ".contracts.premineVault");
        address treasury     = vm.parseJsonAddress(json, ".contracts.treasury");
        address voidTreasury = vm.parseJsonAddress(json, ".contracts.voidTreasury");
        address opsTreasury  = vm.parseJsonAddress(json, ".contracts.opsTreasury");
        address rewardEngine = vm.parseJsonAddress(json, ".contracts.rewardEngine");

        console.log("");
        console.log("=== contracts ===");
        console.log("  updateGate        :", updateGate);
        console.log("  adminGate         :", adminGate);
        console.log("  configGate        :", configGate);
        console.log("  validatorSet      :", validatorSet);
        console.log("  voidToken         :", voidToken);
        console.log("  premineVault      :", premineVault);
        console.log("  treasury          :", treasury);
        console.log("  voidTreasury      :", voidTreasury);
        console.log("  opsTreasury       :", opsTreasury);
        console.log("  rewardEngine      :", rewardEngine);

        // --- validator0 ---
        address validatorReward = vm.parseJsonAddress(json, ".validator0.reward");
        bytes32 validatorConsensusKey = vm.parseJsonBytes32(json, ".validator0.consensusKey");
        string memory stakeVOIDRaw = vm.parseJsonString(json, ".validator0.stakeVOID");

        console.log("");
        console.log("=== validator0 ===");
        console.log("  reward            :", validatorReward);
        console.log("  consensusKey      :");
        console.logBytes32(validatorConsensusKey);
        console.log("  stakeVOID (raw)   :", stakeVOIDRaw);

        // --- structural flags (rehearsal-only) ---
        bool chainOk = (configChainId == runtimeChainId);

        bool rolesConfigured =
            deployer         != address(0) &&
            treasuryAdmin    != address(0) &&
            opsTreasuryAdmin != address(0) &&
            validatorAdmin   != address(0);

        bool contractsConfigured =
            voidToken    != address(0) &&
            premineVault != address(0) &&
            treasury     != address(0) &&
            opsTreasury  != address(0) &&
            rewardEngine != address(0);

        bool validatorStakeSet = keccak256(bytes(stakeVOIDRaw)) != keccak256(bytes("TODO_SET_STAKE_VOID"));
        bool validatorConfigured =
            validatorReward       != address(0) &&
            validatorConsensusKey != bytes32(0) &&
            validatorStakeSet;

        bool configOk = chainOk;
        bool healthOk = rolesConfigured && contractsConfigured && validatorConfigured;

        console.log("");
        console.log("=== structural flags (rehearsal) ===");
        console.log("  CONFIG_OK         :", configOk);
        console.log("  HEALTH_OK         :", healthOk);
        console.log("  rolesConfigured   :", rolesConfigured);
        console.log("  contractsConfigured:", contractsConfigured);
        console.log("  validatorConfigured:", validatorConfigured);
        console.log("  planReady         :", configOk && healthOk);

        console.log("");
        console.log("=== rehearsal summary (no broadcast) ===");
        if (!configOk) {
            console.log("  - chainId mismatch or config invalid; PLAN is NOT READY.");
        } else if (!healthOk) {
            console.log("  - config JSON is sane, but critical roles/contracts/validator0 are still missing.");
            console.log("  - PLAN remains NOT READY (this matches plan_health = 0).");
        } else {
            console.log("  - config JSON is sane and all critical fields are set.");
            console.log("  - PLAN appears READY from this rehearsal view (still no txs sent).");
        }

        console.log("");
        console.log("NOTE: this is a READ-ONLY rehearsal. No deployments or broadcasts are performed.");
    }
}
